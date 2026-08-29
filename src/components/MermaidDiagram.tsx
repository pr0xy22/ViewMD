import { useEffect, useId, useState } from "react";

// Mermaid is ~500 KB of JS and most documents have no diagrams — load it on
// demand so it stays out of the initial bundle.
const loadMermaid = () => import("mermaid").then((module) => module.default);

export function MermaidDiagram({ code, theme }: { code: string; theme: "dark" | "light" }) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    setSvg(undefined);
    setError(undefined);

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
        noteBorderColor: "#a68a45",
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
        noteBorderColor: "#c8a94f",
      },
    });

      mermaid
        .render(`learn-diagram-${reactId}`, code)
        .then(({ svg: rendered }) => {
          if (active) setSvg(rendered);
        })
        .catch((reason: unknown) => {
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
    return (
      <div className="diagram-error">
        <span>Diagram error</span>
        <code>{error}</code>
      </div>
    );
  }

  return (
    <div
      className={`mermaid-frame${svg ? " is-ready" : ""}`}
      aria-label="Diagram"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
