import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MarkdownDocument } from "./components/MarkdownDocument";
import type { DocumentSnapshot } from "./types";

type ViewState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "document"; document: DocumentSnapshot }
  | { kind: "fatal"; message: string };

type Theme = "dark" | "light";
type ScrollMode = "follow" | "free";

const MIN_ZOOM = 80;
const MAX_ZOOM = 140;
const ZOOM_STEP = 10;

function sameDocument(a: DocumentSnapshot, b: DocumentSnapshot) {
  return a.path === b.path && a.content === b.content && a.error === b.error;
}

function storedTheme(): Theme {
  try {
    return localStorage.getItem("learn-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function storedZoom(): number {
  try {
    const value = Number(localStorage.getItem("learn-zoom"));
    return value >= MIN_ZOOM && value <= MAX_ZOOM ? value : 100;
  } catch {
    return 100;
  }
}

function storedScrollMode(): ScrollMode {
  try {
    return localStorage.getItem("learn-scroll-mode") === "free" ? "free" : "follow";
  } catch {
    return "follow";
  }
}

export default function App() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [openError, setOpenError] = useState<string>();
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [zoom, setZoom] = useState(storedZoom);
  const [scrollMode, setScrollMode] = useState<ScrollMode>(storedScrollMode);
  const scrollModeRef = useRef(scrollMode);
  const pendingScroll = useRef<{ mode: ScrollMode; top: number } | undefined>(undefined);

  const pendingDoc = useRef<DocumentSnapshot | undefined>(undefined);
  const flushScheduled = useRef(false);

  // The file watcher can fire several times per turn (the logger appends in
  // bursts). Coalesce: keep only the latest snapshot and apply it once per
  // animation frame, so a burst costs one render instead of many.
  const receiveDocument = useCallback((document: DocumentSnapshot) => {
    pendingDoc.current = document;
    if (flushScheduled.current) return;
    flushScheduled.current = true;
    requestAnimationFrame(() => {
      flushScheduled.current = false;
      const latest = pendingDoc.current;
      pendingDoc.current = undefined;
      if (!latest) return;
      pendingScroll.current = { mode: scrollModeRef.current, top: window.scrollY };
      setView((current) => {
        if (current.kind === "document" && sameDocument(current.document, latest)) {
          return current;
        }
        return { kind: "document", document: latest };
      });
    });
  }, []);

  const chooseFile = useCallback(async () => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    setOpenError(undefined);
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: "Open Markdown file",
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (!selected) return;
      const document = await invoke<DocumentSnapshot>("open_document", { path: selected });
      receiveDocument(document);
    } catch (reason) {
      setOpenError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [receiveDocument]);

  const createFile = useCallback(async () => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    setOpenError(undefined);
    try {
      const target = await save({
        title: "New Markdown file",
        defaultPath: "untitled.md",
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (!target) return;
      const document = await invoke<DocumentSnapshot>("create_document", { path: target });
      receiveDocument(document);
    } catch (reason) {
      setOpenError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [receiveDocument]);

  useEffect(() => {
    scrollModeRef.current = scrollMode;
    try {
      localStorage.setItem("learn-scroll-mode", scrollMode);
    } catch {
      // Preferences are optional.
    }
  }, [scrollMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("learn-theme", theme);
    } catch {
      // Preferences are optional.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("learn-zoom", String(zoom));
    } catch {
      // Preferences are optional.
    }
  }, [zoom]);

  useEffect(() => {
    let active = true;
    let stopListening: (() => void) | undefined;

    async function connect() {
      if (import.meta.env.DEV && !("__TAURI_INTERNALS__" in window)) {
        const content = await fetch("/sample.md").then((response) => response.text());
        if (active) {
          receiveDocument({
            path: "/sample.md",
            name: "sample.md",
            content,
            error: null,
            modifiedAtMs: Date.now(),
          });
        }
        return;
      }

      stopListening = await listen<DocumentSnapshot>("document-changed", ({ payload }) => {
        if (active) receiveDocument(payload);
      });

      const initial = await invoke<DocumentSnapshot | null>("current_document");
      if (!active) return;
      if (initial) receiveDocument(initial);
      else setView({ kind: "empty" });
    }

    connect().catch((reason: unknown) => {
      if (!active) return;
      setView({
        kind: "fatal",
        message: reason instanceof Error ? reason.message : String(reason),
      });
    });

    return () => {
      active = false;
      stopListening?.();
    };
  }, [receiveDocument]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        void chooseFile();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        void createFile();
        return;
      }
      if (key === "f" && event.shiftKey) {
        event.preventDefault();
        toggleScrollMode();
        return;
      }
      if (key === "-" || key === "_") {
        event.preventDefault();
        setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP));
        return;
      }
      if (key === "+" || key === "=") {
        event.preventDefault();
        setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP));
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [chooseFile, createFile]);

  const currentDocument = view.kind === "document" ? view.document : null;
  const documentVersion = currentDocument
    ? `${currentDocument.path}:\n${currentDocument.content}:\n${currentDocument.error ?? ""}`
    : "";

  useLayoutEffect(() => {
    if (!currentDocument) return;
    const preserved = pendingScroll.current ?? {
      mode: scrollModeRef.current,
      top: window.scrollY,
    };
    pendingScroll.current = undefined;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (preserved.mode === "follow") {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
        } else {
          window.scrollTo({ top: preserved.top, behavior: "instant" });
        }
      });
    });
  }, [documentVersion, currentDocument]);

  // Scrolling up while following exits to free scroll — reading back
  // mid-session shouldn't require finding the toggle. Re-enter with the
  // button or Ctrl+Shift+F. Only wheel-up exits: wheel-down at the bottom
  // and our own programmatic scrolls must not trip it.
  useEffect(() => {
    if (scrollMode !== "follow") return;
    function handleWheel(event: WheelEvent) {
      if (event.deltaY < 0) setScrollMode("free");
    }
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [scrollMode]);

  // Follow mode: stick to the bottom not just on update, but while the
  // content settles. Late-rendering pieces (KaTeX display math, lazy Mermaid
  // diagrams, images) and content-visibility size estimates all grow the
  // document AFTER the initial scroll fires — a one-shot scroll lands short.
  // A ResizeObserver re-pins to the bottom on every size change until the
  // document stops growing. Scrolling never changes content size, so this
  // can't loop, and in free mode it's disconnected entirely.
  useEffect(() => {
    if (scrollMode !== "follow") return;
    const surface = document.querySelector(".reading-surface");
    if (!surface) return;
    let frame: number | undefined;
    const observer = new ResizeObserver(() => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      });
    });
    observer.observe(surface);
    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [scrollMode, currentDocument?.path]);

  function toggleScrollMode() {
    setScrollMode((current) => {
      const next = current === "follow" ? "free" : "follow";
      if (next === "follow") {
        requestAnimationFrame(() => {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
        });
      }
      return next;
    });
  }

  const surfaceStyle = { "--content-zoom": zoom / 100 } as CSSProperties;

  return (
    <div className="app-shell">
      <header className="window-bar" data-tauri-drag-region>
        <div className="document-identity" data-tauri-drag-region>
          <span className="learn-mark" aria-hidden="true">viewmd_</span>
          <span className="document-name" data-tauri-drag-region>
            {currentDocument?.name ?? "ViewMD"}
          </span>
          {currentDocument && !currentDocument.error && (
            <span className="live-status" title="Watching for changes">
              <span className="live-dot" />
              Live
            </span>
          )}
        </div>

        <div className="window-actions">
          {currentDocument && <span className="document-path">{currentDocument.path}</span>}
          <div className="view-controls" aria-label="Reading controls">
            <button
              className="icon-button"
              type="button"
              onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
              disabled={zoom === MIN_ZOOM}
              title={`Zoom out (⌘−) — ${zoom}%`}
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
              disabled={zoom === MAX_ZOOM}
              title={`Zoom in (⌘+) — ${zoom}%`}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              className="icon-button theme-button"
              type="button"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-label="Toggle light and dark mode"
            >
              {theme === "dark" ? "☼" : "☾"}
            </button>
            <button
              className="scroll-mode-button"
              type="button"
              onClick={toggleScrollMode}
              aria-pressed={scrollMode === "follow"}
              title={scrollMode === "follow"
                ? "Following new content. Scroll up to break free, or click (⌃⇧F)."
                : "Free scroll. Click to follow new content (⌃⇧F)."}
            >
              <span className="scroll-mode-dot" />
              {scrollMode === "follow" ? "following" : "free scroll"}
            </button>
          </div>
          <button
            className="open-file-button"
            type="button"
            onClick={() => void createFile()}
            title="New Markdown file (⌘N)"
          >
            new file
          </button>
          <button
            className="open-file-button"
            type="button"
            onClick={() => void chooseFile()}
            title="Open Markdown file (⌘O)"
          >
            open file
          </button>
        </div>
      </header>

      {openError && <div className="open-error">{openError}</div>}

      <main className="reading-surface" style={surfaceStyle}>
        {view.kind === "loading" && <div className="loading-line" />}

        {view.kind === "empty" && (
          <section className="empty-state">
            <span className="empty-kicker">markdown preview</span>
            <h1>ready to view_</h1>
            <p>Open a Markdown file. ViewMD will refresh it whenever it changes.</p>
            <button className="empty-open-button" type="button" onClick={() => void chooseFile()}>
              open a file →
            </button>
            <small>or press ⌘O</small>
          </section>
        )}

        {view.kind === "fatal" && (
          <section className="message-state error-state">
            <span className="message-kicker">ViewMD couldn’t start</span>
            <h1>Something went wrong.</h1>
            <p>{view.message}</p>
          </section>
        )}

        {currentDocument?.error ? (
          <section className="message-state error-state">
            <span className="message-kicker">Preview unavailable</span>
            <h1>{currentDocument.name}</h1>
            <p>{currentDocument.error}</p>
            <small>Learn is still watching and will recover when the file is available.</small>
          </section>
        ) : currentDocument ? (
          <MarkdownDocument
            content={currentDocument.content}
            theme={theme}
            basePath={currentDocument.path.replace(/\/[^/]*$/, "")}
          />
        ) : null}
      </main>
    </div>
  );
}
