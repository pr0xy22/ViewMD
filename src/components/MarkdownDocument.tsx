import { Children, isValidElement, memo, useMemo, type ReactElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { convertFileSrc } from "@tauri-apps/api/core";
import { CodeBlock } from "./CodeBlock";
import { MermaidDiagram } from "./MermaidDiagram";

type ElementProps = {
  className?: string;
  children?: ReactNode;
  start?: number;
};

type StructuredItem = {
  label: string;
  content: ReactNode[];
};

const calloutNames: Record<string, string> = {
  abstract: "PI",
  answer: "ANSWER",
  example: "EXAMPLE",
  failure: "INCORRECT",
  note: "NOTE",
  question: "QUESTION",
  quiz: "QUESTION",
  quote: "YOU",
  success: "CORRECT",
  warning: "NOTICE",
};

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement(node)) {
    return textContent((node as ReactElement<ElementProps>).props.children);
  }
  return "";
}

function meaningfulChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim().length > 0,
  );
}

function isListElement(node: ReactNode): node is ReactElement<ElementProps> {
  return isValidElement(node) && (node.type === "ul" || node.type === "ol");
}

function unwrapItemChildren(item: ReactElement<ElementProps>): ReactNode[] {
  const direct = meaningfulChildren(item.props.children);
  if (direct.length === 1 && isValidElement(direct[0]) && direct[0].type === "p") {
    return meaningfulChildren((direct[0] as ReactElement<ElementProps>).props.children);
  }
  return direct;
}

function trimLeadingWhitespace(nodes: ReactNode[]): ReactNode[] {
  if (typeof nodes[0] !== "string") return nodes;
  const trimmed = nodes[0].replace(/^\s+/, "");
  return trimmed ? [trimmed, ...nodes.slice(1)] : nodes.slice(1);
}

function structuredItems(list: ReactElement<ElementProps>): StructuredItem[] {
  const listItems = meaningfulChildren(list.props.children).filter(
    (node): node is ReactElement<ElementProps> => isValidElement(node) && node.type === "li",
  );
  const orderedStart = list.type === "ol" ? list.props.start ?? 1 : 1;

  return listItems.map((item, index) => {
    const children = unwrapItemChildren(item);
    const first = children[0];
    if (isValidElement(first) && first.type === "strong") {
      const explicitLabel = textContent(first).trim().replace(/\.$/, "");
      if (explicitLabel) {
        return {
          label: explicitLabel,
          content: trimLeadingWhitespace(children.slice(1)),
        };
      }
    }
    return {
      label: String(orderedStart + index),
      content: children,
    };
  });
}

type QuizHighlight = { selected: number[]; correct: number[] };

function StructuredRows({ items, kind, highlight }: { items: StructuredItem[]; kind: "choices" | "answers"; highlight?: QuizHighlight }) {
  return (
    <div className={kind === "choices" ? "choice-grid" : "answer-grid"} role="list">
      {items.map((item, index) => {
        const n = Number.parseInt(item.label, 10);
        const hasCorrect = (highlight?.correct.length ?? 0) > 0;
        const isCorrect = kind === "choices" && highlight?.correct.includes(n);
        const isWrong = kind === "choices" && hasCorrect && !isCorrect && highlight?.selected.includes(n);
        // ask_user_question: no right/wrong, just "this is what you picked".
        const isSelected = kind === "choices" && !hasCorrect && highlight?.selected.includes(n);
        const rowClass = kind === "choices" ? "choice-row" : "answer-row";
        return (
          <div
            className={`${rowClass}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}${isSelected ? " is-selected" : ""}`}
            role="listitem"
            key={`${item.label}-${index}`}
          >
            <strong className="structured-label">{/^\d+$/.test(item.label) ? `${item.label}.)` : item.label}</strong>
            <span className="structured-content">{item.content}</span>
          </div>
        );
      })}
    </div>
  );
}

function CalloutBlock({ children }: { children?: ReactNode }) {
  const blocks = meaningfulChildren(children);
  const first = blocks[0];
  if (!isValidElement(first)) return <blockquote>{children}</blockquote>;

  const marker = /^\[!([a-z-]+)\](?:[+-])?\s*(.*)$/i.exec(textContent(first).trim());
  if (!marker) return <blockquote>{children}</blockquote>;

  const type = marker[1].toLowerCase();
  const explicitTitle = marker[2].trim();
  // Claude Code sessions log assistant blocks as [!abstract] CLAUDE — show
  // that as the label instead of "PI CLAUDE".
  const label =
    type === "abstract" && explicitTitle.toUpperCase() === "CLAUDE"
      ? "CLAUDE"
      : (calloutNames[type] ?? type.toUpperCase());
  const title = explicitTitle && explicitTitle.toUpperCase() !== label ? explicitTitle : "";

  // A "::quiz-result selected=.. correct=.." metadata line injected by
  // annotateQuizResults. Parsed here, never rendered.
  let highlight: QuizHighlight | undefined;
  const bodyBlocks = blocks.slice(1).filter((block) => {
    const meta = /^::quiz-result\s+selected=([\d,]*)\s+correct=([\d,]*)$/.exec(textContent(block).trim());
    if (!meta) return true;
    const parse = (s: string) => (s ? s.split(",").map(Number) : []);
    highlight = { selected: parse(meta[1]), correct: parse(meta[2]) };
    return false;
  });
  const listIndex = bodyBlocks.findIndex(isListElement);
  const list = listIndex >= 0 && isListElement(bodyBlocks[listIndex]) ? bodyBlocks[listIndex] : null;
  const items = list ? structuredItems(list) : [];
  // Quiz/ask-question options always have numeric labels; result rows have
  // word labels ("Your answer"). Use that to tell questions from results.
  const numericItems = items.length > 0 && items.every((it) => /^\d+$/.test(it.label));
  const isQuiz = (type === "quiz" || type === "question") && numericItems && items.length >= 2;
  const isAnswer =
    (type === "answer" || type === "success" || type === "failure" || type === "question") &&
    items.length >= 1 &&
    !isQuiz;
  const isStructured = isQuiz || isAnswer;

  return (
    <aside className={`callout${isStructured ? " is-structured" : ""}`} data-callout={type}>
      <header className="callout-header">
        <span className="callout-label">{label}</span>
        {title && <span className="callout-title">{title}</span>}
      </header>
      {bodyBlocks.length > 0 && (
        <div className="callout-body">
          {isStructured && list ? (
            <>
              {bodyBlocks.slice(0, listIndex)}
              <StructuredRows items={items} kind={isQuiz ? "choices" : "answers"} highlight={highlight} />
              {bodyBlocks.slice(listIndex + 1)}
            </>
          ) : (
            bodyBlocks
          )}
        </div>
      )}
    </aside>
  );
}

// The logger writes quiz questions and their results as separate callouts.
// This pass finds each quiz question block whose following block(s) contain a
// result ("Your answer: N" / "Correct answer: M", or the newer "Your
// selection" callout + "Correct answer: **M**") and injects a metadata line
// into the question block so CalloutBlock can highlight the rows. Cancelled or
// unavailable quizzes get nothing. Runs on raw content, before rendering.
function annotateQuizResults(content: string): string {
  const lines = content.split("\n");
  const blocks: { start: number; end: number; type: string; text: string }[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = /^>\s*\[!([a-z-]+)\]/i.exec(lines[i]);
    if (m) {
      let j = i;
      while (j + 1 < lines.length && /^>/.test(lines[j + 1])) j++;
      blocks.push({ start: i, end: j + 1, type: m[1].toLowerCase(), text: lines.slice(i, j + 1).join("\n") });
      i = j + 1;
    } else {
      i++;
    }
  }

  // Inject from last to first so earlier splice positions stay valid.
  for (let b = blocks.length - 1; b >= 0; b--) {
    const blk = blocks[b];
    if (blk.type !== "question" && blk.type !== "quiz") continue;

    let selected: number[] = [];
    let correct: number[] = [];
    let found = false;
    let sawAnswer = false;
    let answerBlock: (typeof blocks)[number] | null = null;

    // The logger embeds a machine-readable payload ("<!-- qa-result {...} -->")
    // alongside the human-readable lines. Prefer it; the prose regexes are the
    // fallback for entries written before the payload existed.
    const parsePayload = (text: string): { selected?: number[]; correct?: number[] } | null => {
      const m = /<!--\s*qa-result\s+(\{[\s\S]*?\})\s*-->/.exec(text);
      if (!m) return null;
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    };

    for (const nb of blocks.slice(b + 1, b + 3)) {
      if (nb.type === "answer" || nb.type === "example") {
        // Selection/answer callout. For ask_user_question this IS the result;
        // for quiz it's the newer-format selection before the result block.
        sawAnswer = true;
        answerBlock = nb;
        const payload = parsePayload(nb.text);
        if (payload?.selected) {
          selected = payload.selected;
        } else {
          const idx = [...nb.text.matchAll(/^>\s*(?:- \*\*)?(\d+)\.\*?\*?\s/gm)].map((m) => Number(m[1]));
          if (idx.length > 0) selected = idx;
        }
        continue;
      }
      if (nb.type === "warning") break; // cancelled / unavailable — no result
      const cm = /Correct answer:\s*\*{0,2}([\d,\s]+?)\*{0,2}[ \t]*$/m.exec(nb.text);
      const payload = parsePayload(nb.text);
      if ((nb.type === "success" || nb.type === "failure" || nb.type === "question") && (cm || payload?.correct)) {
        found = true;
        if (payload?.correct) {
          correct = payload.correct;
          selected = payload.selected ?? [];
        } else {
          correct = [...cm![1].matchAll(/\d+/g)].map((m) => Number(m[0]));
          const ym = /Your answer:\s*(.+)/.exec(nb.text);
          if (ym && !/I don't know/i.test(ym[1])) {
            // Entries look like "3. $2^7$" or "1. x, 3. y" — take only the
            // leading index of each comma-separated part so decimals like
            // "$1.5$" inside a label can't false-match.
            selected = ym[1]
              .split(/,\s*(?=\d+\.)/)
              .map((part) => /(\d+)\./.exec(part)?.[1])
              .filter((s): s is string => s !== undefined)
              .map(Number);
          }
        }

        // Rewrite the result body into labeled rows. Raw lines like
        // "Your answer: 3. $-1/5$" read as if "3." were part of the math —
        // instead show the answer text with the option number as a muted
        // suffix, and resolve the correct option's text from the question.
        const optionText = new Map<number, string>();
        for (const m of blk.text.matchAll(/^>\s*(?:- \*\*)?(\d+)\.\*?\*?\s+(.+?)\s*$/gm)) {
          optionText.set(Number(m[1]), m[2]);
        }
        const fmtSelections = (raw: string) =>
          raw
            .split(/,\s*(?=\d+\.)/)
            .map((part) => {
              const m = /(\d+)\.\s*(.+)/.exec(part.trim());
              return m ? m[2] : part.trim();
            })
            .join(", ");
        const isCorrect = nb.type === "success";
        const deleteLines = new Set<number>();
        for (let li = nb.start; li < nb.end; li++) {
          const ya = /^>\s*Your answer:\s*(.+)$/.exec(lines[li]);
          const ca = /^>\s*Correct answer:\s*\*{0,2}([\d,\s]+?)\*{0,2}\s*$/.exec(lines[li]);
          if (isCorrect && (ya || ca)) {
            // Correct on the first try: the green row already says everything.
            // Delete both lines — the explanation is the only new information.
            deleteLines.add(li);
            continue;
          }
          if (ya) {
            // Plain labeled line; trailing two spaces = hard line break so
            // Answer / Correct Answer stack on separate lines in one paragraph.
            lines[li] = /i don't know/i.test(ya[1])
              ? "> **Answer:** I don't know  "
              : `> **Answer:** ${fmtSelections(ya[1])}  `;
            continue;
          }
          if (ca) {
            // No "(option N)" suffix: the green row in the question already
            // identifies which option — the value is the information.
            const labels = [...ca[1].matchAll(/\d+/g)].map((m) => {
              const text = optionText.get(Number(m[0]));
              return text ?? `option ${m[0]}`;
            });
            lines[li] = `> **Correct Answer:** ${labels.join(", ")}`;
          }
        }
        if (deleteLines.size > 0) {
          // Also drop a blank quoted line left dangling by the deletion.
          for (let li = nb.start + 1; li < nb.end; li++) {
            if (deleteLines.has(li - 1) && /^>\s*$/.test(lines[li])) deleteLines.add(li);
          }
          lines.splice(nb.start, nb.end - nb.start, ...lines.slice(nb.start, nb.end).filter((_, k) => !deleteLines.has(nb.start + k)));
        }
        break;
      }
    }
    // The selection callout is redundant once the pick shows as a highlighted
    // row — drop it. Free-text answers (no numeric selection) carry
    // information the options can't show, so those stay. Delete BEFORE
    // injecting below: the injection point (blk.end) sits before the answer
    // block, so deleting first keeps it valid.
    if (answerBlock && selected.length > 0 && (found || sawAnswer)) {
      lines.splice(answerBlock.start, answerBlock.end - answerBlock.start);
    }

    // Quiz: needs a correct answer. ask_user_question: selection only.
    if (found && correct.length > 0) {
      lines.splice(blk.end, 0, ">", `> ::quiz-result selected=${selected.join(",")} correct=${correct.join(",")}`);
    } else if (!found && sawAnswer && selected.length > 0) {
      lines.splice(blk.end, 0, ">", `> ::quiz-result selected=${selected.join(",")} correct=`);
    }
  }
  return lines.join("\n");
}

// Inline fractions (\frac) render numerator/denominator at ~70% size, which
// is hard to read in quiz options. Rewrite them to display-style (\dfrac) on
// option lines inside question/quiz callouts. Safe to run on any content:
// "\dfrac" does not contain the substring "\frac", so it never double-applies.
function displayFractionsInOptions(content: string): string {
  const lines = content.split("\n");
  let inQuiz = false;
  for (let i = 0; i < lines.length; i++) {
    const marker = /^>\s*\[!([a-z-]+)\]/i.exec(lines[i]);
    if (marker) {
      inQuiz = marker[1].toLowerCase() === "question" || marker[1].toLowerCase() === "quiz";
      continue;
    }
    if (inQuiz && /^>\s*(?:\d+\.|- \*\*\d+\.\*\*)/.test(lines[i])) {
      lines[i] = lines[i].replace(/\\frac/g, "\\dfrac");
    }
    // Result lines rewritten by annotateQuizResults ("**Answer:** ...")
    // get the same display-fraction treatment.
    if (/^>\s*\*\*(Answer|Correct Answer):\*\*/.test(lines[i])) {
      lines[i] = lines[i].replace(/\\frac/g, "\\dfrac");
    }
  }
  return lines.join("\n");
}

// The logger writes one callout per text block, so a single turn with tool
// calls in it becomes several consecutive YOU/PI callouts. Merge strictly
// adjacent same-speaker callouts (only blank lines between them) into one
// block under a single header. Quizzes or results sitting between texts are
// different callout types, so they still break the turn correctly.
function mergeSpeakerTurns(content: string): string {
  const lines = content.split("\n");
  const markers: { index: number; type: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^>\s*\[!([a-z-]+)\]/i.exec(lines[i]);
    if (m) markers.push({ index: i, type: m[1].toLowerCase() });
  }

  const drop = new Set<number>();
  const insertBlankAt = new Set<number>();
  for (let k = 0; k < markers.length - 1; k++) {
    const cur = markers[k];
    const nxt = markers[k + 1];
    if ((cur.type !== "quote" && cur.type !== "abstract") || cur.type !== nxt.type) continue;

    // End (exclusive) of the current callout block.
    let end = cur.index;
    while (end + 1 < lines.length && /^>/.test(lines[end + 1])) end++;
    end++;

    // Only merge if nothing but blank lines separates the two blocks.
    const between: number[] = [];
    for (let x = end; x < nxt.index; x++) between.push(x);
    if (between.some((x) => lines[x].trim() !== "")) continue;

    for (const x of between) drop.add(x);
    drop.add(nxt.index);
    insertBlankAt.add(nxt.index);
    // Avoid a doubled quoted blank line at the seam.
    if (/^>\s*$/.test(lines[nxt.index + 1] ?? "")) drop.add(nxt.index + 1);
  }

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (insertBlankAt.has(i)) out.push(">");
    if (!drop.has(i)) out.push(lines[i]);
  }
  return out.join("\n");
}

// Claude sometimes writes currency as $\$250$ (escaped dollar inside math
// delimiters), which remark-math misparses. Fixed at the source in md-log.py;
// this repairs entries already written before that fix.
function sanitizeCurrencyMath(content: string): string {
  return content.replace(/\$\\\$(\d[\d,]*(?:\.\d+)?)\$/g, "\\$$1");
}

function prepareCallouts(content: string): string {
  const normalizedLegacyAnswers = displayFractionsInOptions(annotateQuizResults(mergeSpeakerTurns(sanitizeCurrencyMath(content)))).replace(
    /^>\s*\[!example\]\s+Answer([^\r\n]*)(?:\r?\n>[^\r\n]*)*/gim,
    (block) => block
      .replace(/^>\s*\[!example\]\s+Answer/im, "> [!answer] Answer")
      .replace(/^>\s+(\d+)\.\s+(.+)$/gm, "> - **$1.** $2"),
  );

  const normalizedLegacyQuizzes = normalizedLegacyAnswers.replace(
    /^>\s*\[!question\]\s+Quiz\b/gim,
    "> [!quiz] Quiz",
  );

  // Obsidian accepts the body directly below the marker. Insert a quoted blank
  // line so standard Markdown parsers preserve the title and body separately.
  // The trailing \n matters: without it the body line becomes ">> body" — a
  // nested blockquote, which breaks structured rendering and shows a stray
  // left border.
  return normalizedLegacyQuizzes.replace(
    /^(>\s*\[![^\]\r\n]+\][^\r\n]*)\r?\n(?=>[ \t]*\S)/gm,
    "$1\n>\n",
  );
}

function CodePre({ children, theme }: { children?: ReactNode; theme: "dark" | "light" }) {
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  if (!isValidElement(child)) return <pre>{children}</pre>;

  const codeChild = child as ReactElement<ElementProps>;
  const className = codeChild.props.className ?? "";
  const match = /language-([^\s]+)/.exec(className);
  const language = match?.[1];
  const code = String(codeChild.props.children ?? "").replace(/\n$/, "");

  return language === "mermaid" ? (
    <MermaidDiagram code={code} theme={theme} />
  ) : (
    <CodeBlock code={code} language={language} />
  );
}

// Resolve image sources: absolute/remote/data URLs pass through; relative
// paths resolve against the open document's directory and go through Tauri's
// asset protocol so local images render in the desktop app.
function resolveImageSrc(src: string | undefined, basePath: string | undefined): string | undefined {
  if (!src) return src;
  if (/^(?:https?|data|blob|asset):/i.test(src)) return src;
  if (!basePath || !("__TAURI_INTERNALS__" in window)) return src;
  const absolute = src.startsWith("/") ? src : `${basePath}/${src}`;
  return convertFileSrc(absolute);
}

// Split the prepared document into top-level blocks: blank lines separate
// blocks, fenced code blocks are never split, and callouts stay intact
// because their blank lines are quoted (">"). The log is append-mostly, so
// block sources are stable across updates — which is what makes the memoized
// Block below skip re-parsing and re-rendering everything but the tail.
function splitBlocks(content: string): string[] {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let fenceChar = "";

  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  const isListItem = (line: string) => /^\s*(?:\d+[.)]|[-*+])\s/.test(line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      const ch = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
      }
      current.push(line);
      continue;
    }
    if (!inFence && line.trim() === "") {
      // Loose lists (blank line between items) must stay one block, or each
      // item would parse as its own list and lose its <p> wrapping.
      const prev = current[current.length - 1] ?? "";
      const next = lines.slice(i + 1).find((l) => l.trim() !== "") ?? "";
      if (isListItem(prev) && isListItem(next)) {
        current.push(line);
        continue;
      }
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeRaw, rehypeKatex];

// One memoized renderer per block. String props compare by value, so an
// unchanged block skips ReactMarkdown + KaTeX + Shiki entirely on update.
const Block = memo(function Block({ source, theme, basePath }: { source: string; theme: "dark" | "light"; basePath?: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={{
        pre: (props) => <CodePre {...props} theme={theme} />,
        blockquote: CalloutBlock,
        a: ({ node, children, href, ...props }) => {
          // Internal anchors (footnote refs/backrefs) must not open in a new
          // tab; `node` is a react-markdown internal, not a DOM attribute.
          const isAnchor = typeof href === "string" && href.startsWith("#");
          return isAnchor ? (
            <a href={href} {...props}>{children}</a>
          ) : (
            <a href={href} {...props} target="_blank" rel="noreferrer">{children}</a>
          );
        },
        input: (props) => <input {...props} disabled />,
        img: ({ src, alt }) => <img src={resolveImageSrc(src, basePath)} alt={alt} />,
      }}
    >
      {source}
    </ReactMarkdown>
  );
});

// Footnote definitions ([^1]: ...) and link reference definitions
// ([id]: url) are document-level: a reference in one block can be defined in
// another, and per-block parsing can't resolve them. Documents containing
// them render as a single block — correct beats incremental for those (rare
// in practice; learning logs don't use them).
const DOC_LEVEL_DEF = /^\[[^\]\n]+\]:\s*\S/m;

export function MarkdownDocument({ content, theme, basePath }: { content: string; theme: "dark" | "light"; basePath?: string }) {
  const blocks = useMemo(() => {
    const prepared = prepareCallouts(content);
    return DOC_LEVEL_DEF.test(prepared) ? [prepared] : splitBlocks(prepared);
  }, [content]);
  return (
    <article className="markdown-body">
      {blocks.map((source, index) => (
        <div className="md-block" key={index}>
          <Block source={source} theme={theme} />
        </div>
      ))}
    </article>
  );
}
