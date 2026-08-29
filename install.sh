#!/usr/bin/env bash
#
# ViewMD installer — a quiet, live Markdown viewer
#
#   Local:   ./install.sh
#   Remote:  curl -fsSL <RAW_GITHUB_URL>/install.sh | bash
#
set -euo pipefail

# ── set this after creating the GitHub repo, e.g.
# ── REPO="https://github.com/YOURUSER/ViewMD"
REPO="${VIEWMD_REPO:-}"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

SRC="$(cd "$(dirname "${BASH_SOURCE[0]:-/dev/null}")" 2>/dev/null && pwd || true)"
if [[ -z "${SRC}" || ! -f "${SRC}/package.json" ]]; then
  [[ -n "${REPO}" ]] || die "remote install needs REPO set — edit install.sh or use git clone"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  info "Downloading ${REPO}"
  curl -fsSL "${REPO}/archive/refs/heads/main.tar.gz" | tar -xz -C "$TMP" --strip-components=1
  SRC="$TMP"
fi

command -v node >/dev/null 2>&1 || die "missing node — install Node.js 18+ from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || die "missing npm — install Node.js 18+ from https://nodejs.org"
if ! command -v cargo >/dev/null 2>&1; then
  warn "Rust/cargo not found — needed for the desktop app (npm run tauri …)"
  warn "  install via https://rustup.rs — the browser preview (npm run dev) works without it"
fi

cd "$SRC"
info "Installing dependencies"
npm install

info "Building frontend"
npm run build

cat <<'EOF'

ViewMD is ready:
  npm run tauri dev      # desktop app (needs Rust)
  npm run tauri build    # installable app bundle (needs Rust)
  npm run dev            # browser preview on http://localhost:1420
EOF
