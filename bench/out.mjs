var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// bench/mermaid-stub.js
var mermaid_stub_exports = {};
__export(mermaid_stub_exports, {
  default: () => mermaid_stub_default
});
var mermaid_stub_default;
var init_mermaid_stub = __esm({
  "bench/mermaid-stub.js"() {
    "use strict";
    mermaid_stub_default = { render: async () => ({ svg: "" }), parse: () => ({}), initialize: () => {
    } };
  }
});

// bench/bench.tsx
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { readFileSync } from "fs";

// src/components/MarkdownDocument.tsx
import { Children, isValidElement, memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// src/components/CodeBlock.tsx
import { useEffect, useState } from "react";
import { createHighlighter } from "shiki";
import { jsx, jsxs } from "react/jsx-runtime";
var supportedLanguages = [
  "bash",
  "css",
  "html",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "python",
  "rust",
  "sql",
  "toml",
  "tsx",
  "typescript",
  "yaml"
];
var highlighterPromise;
function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ["github-dark-default", "github-light-default"],
    langs: supportedLanguages
  });
  return highlighterPromise;
}
var languageAliases = {
  cjs: "javascript",
  html5: "html",
  js: "javascript",
  md: "markdown",
  mjs: "javascript",
  py: "python",
  rs: "rust",
  shell: "bash",
  sh: "bash",
  ts: "typescript",
  yml: "yaml"
};
function normalizeLanguage(language) {
  if (!language) return null;
  const normalized = language.toLowerCase();
  if (normalized in languageAliases) return languageAliases[normalized];
  return supportedLanguages.includes(normalized) ? normalized : null;
}
function CodeBlock({ code, language }) {
  const [html, setHtml] = useState();
  useEffect(() => {
    let active = true;
    setHtml(void 0);
    const normalizedLanguage = normalizeLanguage(language);
    if (!normalizedLanguage) {
      setHtml(null);
      return;
    }
    getHighlighter().then((highlighter) => {
      if (!active) return;
      setHtml(
        highlighter.codeToHtml(code, {
          lang: normalizedLanguage,
          themes: {
            dark: "github-dark-default",
            light: "github-light-default"
          }
        })
      );
    });
    return () => {
      active = false;
    };
  }, [code, language]);
  return /* @__PURE__ */ jsxs("div", { className: "code-frame", children: [
    language && /* @__PURE__ */ jsx("span", { className: "code-language", children: language }),
    typeof html === "string" ? /* @__PURE__ */ jsx("div", { className: "shiki-wrap", dangerouslySetInnerHTML: { __html: html } }) : /* @__PURE__ */ jsx("pre", { className: "code-fallback", children: /* @__PURE__ */ jsx("code", { children: code }) })
  ] });
}

// src/components/MermaidDiagram.tsx
import { useEffect as useEffect2, useId, useState as useState2 } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var loadMermaid = () => Promise.resolve().then(() => (init_mermaid_stub(), mermaid_stub_exports)).then((module) => module.default);
function MermaidDiagram({ code, theme }) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState2();
  const [error, setError] = useState2();
  useEffect2(() => {
    let active = true;
    setSvg(void 0);
    setError(void 0);
    const dark = theme === "dark";
    loadMermaid().then((mermaid) => {
      if (!active) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "Geist Mono, ui-monospace, monospace",
        themeVariables: dark ? {
          background: "#171614",
          primaryColor: "#243a35",
          primaryTextColor: "#ffffff",
          primaryBorderColor: "#6d9b8e",
          lineColor: "#91aaa4",
          secondaryColor: "#2f2740",
          tertiaryColor: "#3a321d",
          edgeLabelBackground: "#171614",
          clusterBkg: "#1d1b19",
          clusterBorder: "#4f4943",
          noteBkgColor: "#3a321d",
          noteTextColor: "#ffffff",
          noteBorderColor: "#a68a45"
        } : {
          background: "#fffdf9",
          primaryColor: "#dff3e9",
          primaryTextColor: "#201e1b",
          primaryBorderColor: "#75a994",
          lineColor: "#54806f",
          secondaryColor: "#efe1ff",
          tertiaryColor: "#fff1be",
          edgeLabelBackground: "#fffdf9",
          clusterBkg: "#f3eee6",
          clusterBorder: "#cfc6bc",
          noteBkgColor: "#fff1be",
          noteTextColor: "#201e1b",
          noteBorderColor: "#c8a94f"
        }
      });
      mermaid.render(`learn-diagram-${reactId}`, code).then(({ svg: rendered }) => {
        if (active) setSvg(rendered);
      }).catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not render this diagram.");
        }
      });
    });
    return () => {
      active = false;
    };
  }, [code, reactId, theme]);
  if (error) {
    return /* @__PURE__ */ jsxs2("div", { className: "diagram-error", children: [
      /* @__PURE__ */ jsx2("span", { children: "Diagram error" }),
      /* @__PURE__ */ jsx2("code", { children: error })
    ] });
  }
  return /* @__PURE__ */ jsx2(
    "div",
    {
      className: `mermaid-frame${svg ? " is-ready" : ""}`,
      "aria-label": "Diagram",
      dangerouslySetInnerHTML: svg ? { __html: svg } : void 0
    }
  );
}

// src/components/MarkdownDocument.tsx
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var calloutNames = {
  abstract: "PI",
  answer: "ANSWER",
  example: "EXAMPLE",
  failure: "INCORRECT",
  note: "NOTE",
  question: "QUESTION",
  quiz: "QUESTION",
  quote: "YOU",
  success: "CORRECT",
  warning: "NOTICE"
};
function textContent(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement(node)) {
    return textContent(node.props.children);
  }
  return "";
}
function meaningfulChildren(children) {
  return Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim().length > 0
  );
}
function isListElement(node) {
  return isValidElement(node) && (node.type === "ul" || node.type === "ol");
}
function unwrapItemChildren(item) {
  const direct = meaningfulChildren(item.props.children);
  if (direct.length === 1 && isValidElement(direct[0]) && direct[0].type === "p") {
    return meaningfulChildren(direct[0].props.children);
  }
  return direct;
}
function trimLeadingWhitespace(nodes) {
  if (typeof nodes[0] !== "string") return nodes;
  const trimmed = nodes[0].replace(/^\s+/, "");
  return trimmed ? [trimmed, ...nodes.slice(1)] : nodes.slice(1);
}
function structuredItems(list) {
  const listItems = meaningfulChildren(list.props.children).filter(
    (node) => isValidElement(node) && node.type === "li"
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
          content: trimLeadingWhitespace(children.slice(1))
        };
      }
    }
    return {
      label: String(orderedStart + index),
      content: children
    };
  });
}
function StructuredRows({ items, kind, highlight }) {
  return /* @__PURE__ */ jsx3("div", { className: kind === "choices" ? "choice-grid" : "answer-grid", role: "list", children: items.map((item, index) => {
    const n = Number.parseInt(item.label, 10);
    const hasCorrect = (highlight?.correct.length ?? 0) > 0;
    const isCorrect = kind === "choices" && highlight?.correct.includes(n);
    const isWrong = kind === "choices" && hasCorrect && !isCorrect && highlight?.selected.includes(n);
    const isSelected = kind === "choices" && !hasCorrect && highlight?.selected.includes(n);
    const rowClass = kind === "choices" ? "choice-row" : "answer-row";
    return /* @__PURE__ */ jsxs3(
      "div",
      {
        className: `${rowClass}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}${isSelected ? " is-selected" : ""}`,
        role: "listitem",
        children: [
          /* @__PURE__ */ jsx3("strong", { className: "structured-label", children: /^\d+$/.test(item.label) ? `${item.label}.)` : item.label }),
          /* @__PURE__ */ jsx3("span", { className: "structured-content", children: item.content })
        ]
      },
      `${item.label}-${index}`
    );
  }) });
}
function CalloutBlock({ children }) {
  const blocks = meaningfulChildren(children);
  const first = blocks[0];
  if (!isValidElement(first)) return /* @__PURE__ */ jsx3("blockquote", { children });
  const marker = /^\[!([a-z-]+)\](?:[+-])?\s*(.*)$/i.exec(textContent(first).trim());
  if (!marker) return /* @__PURE__ */ jsx3("blockquote", { children });
  const type = marker[1].toLowerCase();
  const explicitTitle = marker[2].trim();
  const label = calloutNames[type] ?? type.toUpperCase();
  const title = explicitTitle && explicitTitle.toUpperCase() !== label ? explicitTitle : "";
  let highlight;
  const bodyBlocks = blocks.slice(1).filter((block) => {
    const meta = /^::quiz-result\s+selected=([\d,]*)\s+correct=([\d,]*)$/.exec(textContent(block).trim());
    if (!meta) return true;
    const parse = (s) => s ? s.split(",").map(Number) : [];
    highlight = { selected: parse(meta[1]), correct: parse(meta[2]) };
    return false;
  });
  const listIndex = bodyBlocks.findIndex(isListElement);
  const list = listIndex >= 0 && isListElement(bodyBlocks[listIndex]) ? bodyBlocks[listIndex] : null;
  const items = list ? structuredItems(list) : [];
  const numericItems = items.length > 0 && items.every((it) => /^\d+$/.test(it.label));
  const isQuiz = (type === "quiz" || type === "question") && numericItems && items.length >= 2;
  const isAnswer = (type === "answer" || type === "success" || type === "failure" || type === "question") && items.length >= 1 && !isQuiz;
  const isStructured = isQuiz || isAnswer;
  return /* @__PURE__ */ jsxs3("aside", { className: `callout${isStructured ? " is-structured" : ""}`, "data-callout": type, children: [
    /* @__PURE__ */ jsxs3("header", { className: "callout-header", children: [
      /* @__PURE__ */ jsx3("span", { className: "callout-label", children: label }),
      title && /* @__PURE__ */ jsx3("span", { className: "callout-title", children: title })
    ] }),
    bodyBlocks.length > 0 && /* @__PURE__ */ jsx3("div", { className: "callout-body", children: isStructured && list ? /* @__PURE__ */ jsxs3(Fragment, { children: [
      bodyBlocks.slice(0, listIndex),
      /* @__PURE__ */ jsx3(StructuredRows, { items, kind: isQuiz ? "choices" : "answers", highlight }),
      bodyBlocks.slice(listIndex + 1)
    ] }) : bodyBlocks })
  ] });
}
function annotateQuizResults(content2) {
  const lines = content2.split("\n");
  const blocks = [];
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
  for (let b = blocks.length - 1; b >= 0; b--) {
    const blk = blocks[b];
    if (blk.type !== "question" && blk.type !== "quiz") continue;
    let selected = [];
    let correct = [];
    let found = false;
    let sawAnswer = false;
    const parsePayload = (text) => {
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
        sawAnswer = true;
        const payload2 = parsePayload(nb.text);
        if (payload2?.selected) {
          selected = payload2.selected;
        } else {
          const idx = [...nb.text.matchAll(/^>\s*(?:- \*\*)?(\d+)\.\*?\*?\s/gm)].map((m) => Number(m[1]));
          if (idx.length > 0) selected = idx;
        }
        continue;
      }
      if (nb.type === "warning") break;
      const cm = /Correct answer:\s*\*{0,2}([\d,\s]+?)\*{0,2}[ \t]*$/m.exec(nb.text);
      const payload = parsePayload(nb.text);
      if ((nb.type === "success" || nb.type === "failure" || nb.type === "question") && (cm || payload?.correct)) {
        found = true;
        if (payload?.correct) {
          correct = payload.correct;
          selected = payload.selected ?? [];
        } else {
          correct = [...cm[1].matchAll(/\d+/g)].map((m) => Number(m[0]));
          const ym = /Your answer:\s*(.+)/.exec(nb.text);
          if (ym && !/I don't know/i.test(ym[1])) {
            selected = ym[1].split(/,\s*(?=\d+\.)/).map((part) => /(\d+)\./.exec(part)?.[1]).filter((s) => s !== void 0).map(Number);
          }
        }
        const optionText = /* @__PURE__ */ new Map();
        for (const m of blk.text.matchAll(/^>\s*(?:- \*\*)?(\d+)\.\*?\*?\s+(.+?)\s*$/gm)) {
          optionText.set(Number(m[1]), m[2]);
        }
        const fmtSelections = (raw) => raw.split(/,\s*(?=\d+\.)/).map((part) => {
          const m = /(\d+)\.\s*(.+)/.exec(part.trim());
          return m ? m[2] : part.trim();
        }).join(", ");
        const isCorrect = nb.type === "success";
        const deleteLines = /* @__PURE__ */ new Set();
        for (let li = nb.start; li < nb.end; li++) {
          const ya = /^>\s*Your answer:\s*(.+)$/.exec(lines[li]);
          const ca = /^>\s*Correct answer:\s*\*{0,2}([\d,\s]+?)\*{0,2}\s*$/.exec(lines[li]);
          if (isCorrect && (ya || ca)) {
            deleteLines.add(li);
            continue;
          }
          if (ya) {
            lines[li] = /i don't know/i.test(ya[1]) ? "> **Answer:** I don't know  " : `> **Answer:** ${fmtSelections(ya[1])}  `;
            continue;
          }
          if (ca) {
            const labels = [...ca[1].matchAll(/\d+/g)].map((m) => {
              const text = optionText.get(Number(m[0]));
              return text ?? `option ${m[0]}`;
            });
            lines[li] = `> **Correct Answer:** ${labels.join(", ")}`;
          }
        }
        if (deleteLines.size > 0) {
          for (let li = nb.start + 1; li < nb.end; li++) {
            if (deleteLines.has(li - 1) && /^>\s*$/.test(lines[li])) deleteLines.add(li);
          }
          lines.splice(nb.start, nb.end - nb.start, ...lines.slice(nb.start, nb.end).filter((_, k) => !deleteLines.has(nb.start + k)));
        }
        break;
      }
    }
    if (found && correct.length > 0) {
      lines.splice(blk.end, 0, ">", `> ::quiz-result selected=${selected.join(",")} correct=${correct.join(",")}`);
    } else if (!found && sawAnswer && selected.length > 0) {
      lines.splice(blk.end, 0, ">", `> ::quiz-result selected=${selected.join(",")} correct=`);
    }
  }
  return lines.join("\n");
}
function displayFractionsInOptions(content2) {
  const lines = content2.split("\n");
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
    if (/^>\s*\*\*(Answer|Correct Answer):\*\*/.test(lines[i])) {
      lines[i] = lines[i].replace(/\\frac/g, "\\dfrac");
    }
  }
  return lines.join("\n");
}
function mergeSpeakerTurns(content2) {
  const lines = content2.split("\n");
  const markers = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^>\s*\[!([a-z-]+)\]/i.exec(lines[i]);
    if (m) markers.push({ index: i, type: m[1].toLowerCase() });
  }
  const drop = /* @__PURE__ */ new Set();
  const insertBlankAt = /* @__PURE__ */ new Set();
  for (let k = 0; k < markers.length - 1; k++) {
    const cur = markers[k];
    const nxt = markers[k + 1];
    if (cur.type !== "quote" && cur.type !== "abstract" || cur.type !== nxt.type) continue;
    let end = cur.index;
    while (end + 1 < lines.length && /^>/.test(lines[end + 1])) end++;
    end++;
    const between = [];
    for (let x = end; x < nxt.index; x++) between.push(x);
    if (between.some((x) => lines[x].trim() !== "")) continue;
    for (const x of between) drop.add(x);
    drop.add(nxt.index);
    insertBlankAt.add(nxt.index);
    if (/^>\s*$/.test(lines[nxt.index + 1] ?? "")) drop.add(nxt.index + 1);
  }
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (insertBlankAt.has(i)) out.push(">");
    if (!drop.has(i)) out.push(lines[i]);
  }
  return out.join("\n");
}
function prepareCallouts(content2) {
  const normalizedLegacyAnswers = displayFractionsInOptions(annotateQuizResults(mergeSpeakerTurns(content2))).replace(
    /^>\s*\[!example\]\s+Answer([^\r\n]*)(?:\r?\n>[^\r\n]*)*/gim,
    (block) => block.replace(/^>\s*\[!example\]\s+Answer/im, "> [!answer] Answer").replace(/^>\s+(\d+)\.\s+(.+)$/gm, "> - **$1.** $2")
  );
  const normalizedLegacyQuizzes = normalizedLegacyAnswers.replace(
    /^>\s*\[!question\]\s+Quiz\b/gim,
    "> [!quiz] Quiz"
  );
  return normalizedLegacyQuizzes.replace(
    /^(>\s*\[![^\]\r\n]+\][^\r\n]*)\r?\n(?=>[ \t]*\S)/gm,
    "$1\n>\n"
  );
}
function CodePre({ children, theme }) {
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  if (!isValidElement(child)) return /* @__PURE__ */ jsx3("pre", { children });
  const codeChild = child;
  const className = codeChild.props.className ?? "";
  const match = /language-([^\s]+)/.exec(className);
  const language = match?.[1];
  const code = String(codeChild.props.children ?? "").replace(/\n$/, "");
  return language === "mermaid" ? /* @__PURE__ */ jsx3(MermaidDiagram, { code, theme }) : /* @__PURE__ */ jsx3(CodeBlock, { code, language });
}
function splitBlocks(content2) {
  const lines = content2.split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;
  let fenceChar = "";
  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };
  const isListItem = (line) => /^\s*(?:\d+[.)]|[-*+])\s/.test(line);
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
var remarkPlugins = [remarkGfm, remarkMath];
var rehypePlugins = [rehypeRaw, rehypeKatex];
var Block = memo(function Block2({ source, theme }) {
  return /* @__PURE__ */ jsx3(
    ReactMarkdown,
    {
      remarkPlugins,
      rehypePlugins,
      components: {
        pre: (props) => /* @__PURE__ */ jsx3(CodePre, { ...props, theme }),
        blockquote: CalloutBlock,
        a: ({ children, ...props }) => /* @__PURE__ */ jsx3("a", { ...props, target: "_blank", rel: "noreferrer", children }),
        input: (props) => /* @__PURE__ */ jsx3("input", { ...props, disabled: true })
      },
      children: source
    }
  );
});
function MarkdownDocument({ content: content2, theme }) {
  const blocks = useMemo(() => splitBlocks(prepareCallouts(content2)), [content2]);
  return /* @__PURE__ */ jsx3("article", { className: "markdown-body", children: blocks.map((source, index) => /* @__PURE__ */ jsx3("div", { className: "md-block", children: /* @__PURE__ */ jsx3(Block, { source, theme }) }, index)) });
}

// bench/bench.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
var dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle", "DocumentFragment", "SVGElement"]) {
  globalThis[key] = dom.window[key];
}
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
var content = readFileSync("/Users/clements/AILearn/notes/note1.md", "utf8");
var appended = content + "\n\n> [!abstract] PI\n> One more message appended for the benchmark.\n";
var root = createRoot(document.getElementById("root"));
var render = (c) => flushSync(() => root.render(/* @__PURE__ */ jsx4(MarkdownDocument, { content: c, theme: "dark" })));
render(content);
var N = 5;
var t0 = performance.now();
for (let i = 0; i < N; i++) render(content);
var fullMs = (performance.now() - t0) / N;
render(content);
t0 = performance.now();
for (let i = 0; i < N; i++) render(i % 2 ? content : appended);
var appendMs = (performance.now() - t0) / N;
console.log(JSON.stringify({
  docKB: Math.round(content.length / 1024),
  fullRenderMs: Math.round(fullMs * 10) / 10,
  appendUpdateMs: Math.round(appendMs * 10) / 10
}));
