#!/usr/bin/env bash
set -euo pipefail

REPO="Walon-Foundation/blast"
BIN="blast"
INSTALL_DIR="${BLAST_INSTALL_DIR:-$HOME/.local/bin}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()  { printf "${CYAN}${BOLD}info${RESET}  %s\n" "$*"; }
ok()    { printf "${GREEN}${BOLD}ok${RESET}    %s\n" "$*"; }
err()   { printf "${RED}${BOLD}error${RESET} %s\n" "$*" >&2; exit 1; }

OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64)        TARGET="x86_64-unknown-linux-gnu" ;;
      aarch64|arm64) TARGET="aarch64-unknown-linux-gnu" ;;
      *)             err "unsupported arch: $ARCH" ;;
    esac ;;
  Darwin)
    case "$ARCH" in
      arm64)  TARGET="aarch64-apple-darwin" ;;
      x86_64) err "x86_64 macOS is not supported — run under Rosetta 2 or use the Linux binary" ;;
      *)      err "unsupported arch: $ARCH" ;;
    esac ;;
  *) err "unsupported OS: $OS" ;;
esac

info "fetching latest release..."
VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep '"tag_name"' | head -1 | cut -d'"' -f4)
[ -z "$VERSION" ] && err "could not fetch latest version — check your internet connection"

ARCHIVE="${BIN}-${TARGET}.tar.gz"
URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARCHIVE}"

info "downloading $BIN $VERSION ($TARGET)..."

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

curl -fsSL --progress-bar "$URL" -o "$TMP/$ARCHIVE" || err "download failed: $URL"

info "extracting..."
tar -xzf "$TMP/$ARCHIVE" -C "$TMP"

mkdir -p "$INSTALL_DIR"
EXTRACTED=$(find "$TMP" -maxdepth 2 -name "$BIN" -type f | head -1)
[ -z "$EXTRACTED" ] && err "binary not found in archive"
mv "$EXTRACTED" "$INSTALL_DIR/$BIN"
chmod +x "$INSTALL_DIR/$BIN"

ok "$BIN $VERSION installed to $INSTALL_DIR/$BIN"

if ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
  printf "\n  \033[33mNote:\033[0m Add this to your shell profile:\n"
  printf "    export PATH=\"\$PATH:%s\"\n" "$INSTALL_DIR"
fi
printf "\n  Run: blast --help\n\n"
