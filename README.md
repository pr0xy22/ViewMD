# ViewMD

ViewMD is a minimal, read-only desktop viewer for Markdown files that are
being written by an AI or any other process. Open one file and ViewMD watches
it continuously, updating the rendered document after each save.

Built for reading long AI tutoring sessions: GitHub-flavored Markdown,
Obsidian-style callouts, KaTeX math, Mermaid diagrams, Shiki syntax
highlighting, footnotes, and local images. A transcript layout de-emphasizes
your own messages so the AI's answers stand out, and quiz answers are
highlighted inline — your pick in red, the correct answer in green.

No accounts, no databases, no AI APIs, no editing tools.

## Install

```bash
# remote (once this repo is on GitHub):
curl -fsSL https://raw.githubusercontent.com/pr0xy22/ViewMD/main/install.sh | bash

# or locally:
git clone https://github.com/pr0xy22/ViewMD && cd ViewMD && ./install.sh
```

The installer checks prerequisites, installs dependencies, and builds the
frontend. Requirements: Node.js 18+, and Rust (via
[rustup](https://rustup.rs)) for the desktop app.

## Run

```bash
npm run tauri dev                    # the desktop app
npm run tauri dev -- -- -- ./note.md # open a file directly
npm run tauri build                  # produce an installable app bundle
npm run dev                          # browser preview on :1420 (sample.md)
```

Or open the app and use **open file** (⌘O) / **new file** (⌘N).

## Shortcuts

| Keys | Action |
|---|---|
| ⌘O | Open file |
| ⌘N | New file |
| ⌘+ / ⌘− | Zoom in / out |
| ⌃⇧F | Toggle follow / free scroll |
| scroll up | Break out of follow mode (re-enter with ⌃⇧F) |

**following** mode keeps the latest appended content in view — it sticks to
the bottom while math, diagrams, and images settle. **free scroll** preserves
your reading position during updates.

## Features

- Live-reload: watches the file's directory, so editors that save by
  atomically replacing the file still update
- Quiz highlighting: option rows show your pick (red ✗) and the correct
  answer (green ✓), driven by `qa-result` JSON payloads or `Your answer:` /
  `Correct answer:` lines in the log
- Transcript design: speaker turns merge under one header; your messages are
  dimmed and smaller so the AI's responses pop
- Display-style fractions in quiz options; inline fractions in prose
- Footnotes (GFM), local images (resolved relative to the open file)
- Dark and light themes, zoom, remembered between launches
- Incremental rendering: unchanged blocks are memoized, Mermaid lazy-loads,
  off-screen blocks skip layout (`content-visibility`)

## Markdown extensions

````markdown
Inline math: $E = mc^2$

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

```mermaid
flowchart LR
  Prompt --> Markdown --> ViewMD
```

> [!note] A calm callout
>
> ViewMD renders Obsidian-style callouts.

> [!quiz] Quick check
>
> Which operation divides 12 into 3 equal shares?
>
> - **1.** 12 − 3
> - **2.** 12 ÷ 3
> - **3.** 3 ÷ 12

> [!answer] Your selection
>
> - **2.** 12 ÷ 3
````

## Companion configs

ViewMD reads any Markdown. It pairs especially well with AI session loggers
that write its quiz format — see my `pi-config` and `claude-config` repos —
but neither is required.
