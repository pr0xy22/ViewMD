import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { readFileSync } from "fs";

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle", "DocumentFragment", "SVGElement"]) {
  (globalThis as any)[key] = (dom.window as any)[key];
}
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

import { MarkdownDocument } from "../src/components/MarkdownDocument";

const content = readFileSync("/Users/clements/AILearn/notes/note1.md", "utf8");
const appended = content + "\n\n> [!abstract] PI\n> One more message appended for the benchmark.\n";

const root = createRoot(document.getElementById("root")!);
const render = (c: string) => flushSync(() => root.render(<MarkdownDocument content={c} theme="dark" />));

// warmup (JIT, plugin init)
render(content);

const N = 5;
let t0 = performance.now();
for (let i = 0; i < N; i++) render(content);
const fullMs = (performance.now() - t0) / N;

render(content); // reset to base
t0 = performance.now();
for (let i = 0; i < N; i++) render(i % 2 ? content : appended);
const appendMs = (performance.now() - t0) / N;

console.log(JSON.stringify({
  docKB: Math.round(content.length / 1024),
  fullRenderMs: Math.round(fullMs * 10) / 10,
  appendUpdateMs: Math.round(appendMs * 10) / 10,
}));
