#!/usr/bin/env bash
# Usage: ./bump-version.sh <new-version>
# Example: ./bump-version.sh 0.4.0
#
# Updates Cargo.toml, refreshes Cargo.lock, then prints the next manual steps.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: ./bump-version.sh <version>"
  echo "  e.g. ./bump-version.sh 0.4.0"
  exit 1
fi

VERSION="$1"
TAG="v${VERSION}"

# 1. Bump Cargo.toml (only the [package] version line, not dep versions)
sed -i "0,/^version = \".*\"/{s/^version = \".*\"/version = \"${VERSION}\"/}" Cargo.toml

# 2. Refresh Cargo.lock
cargo check -q 2>&1 | grep -v "^$" || true

echo ""
echo "  bumped Cargo.toml → ${TAG}"
echo ""
echo "  manual steps:"
echo "  1. add ${TAG} entry to web/app/changelog/page.tsx (set latest: true, remove from prev)"
echo "  2. git add Cargo.toml Cargo.lock"
echo "  3. git commit -m \"chore: bump version to ${TAG}\""
echo "  4. git push"
echo "  5. git tag ${TAG} && git push origin ${TAG}"
