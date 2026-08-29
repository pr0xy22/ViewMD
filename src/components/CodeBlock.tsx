import { useEffect, useState } from "react";
import { createHighlighter, type BundledLanguage, type Highlighter } from "shiki";

const supportedLanguages: BundledLanguage[] = [
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
  "yaml",
];

let highlighterPromise: Promise<Highlighter> | undefined;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ["github-dark-default", "github-light-default"],
    langs: supportedLanguages,
  });
  return highlighterPromise;
}

const languageAliases: Record<string, BundledLanguage> = {
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
  yml: "yaml",
};

function normalizeLanguage(language?: string): BundledLanguage | null {
  if (!language) return null;
  const normalized = language.toLowerCase();
  if (normalized in languageAliases) return languageAliases[normalized];
  return supportedLanguages.includes(normalized as BundledLanguage)
    ? (normalized as BundledLanguage)
    : null;
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState<string | null>();

  useEffect(() => {
    let active = true;
    setHtml(undefined);
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
            light: "github-light-default",
          },
        }),
      );
    });
    return () => {
      active = false;
    };
  }, [code, language]);

  return (
    <div className="code-frame">
      {language && <span className="code-language">{language}</span>}
      {typeof html === "string" ? (
        <div className="shiki-wrap" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="code-fallback">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
