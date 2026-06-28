#!/usr/bin/env bash
set -euo pipefail

# colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

PASS=0
FAIL=0
FAILED_STEPS=()

step() {
    echo ""
    echo -e "${CYAN}${BOLD}▶ $1${RESET}"
}

ok() {
    echo -e "${GREEN}✓ $1${RESET}"
    PASS=$((PASS + 1))
}

fail() {
    echo -e "${RED}✗ $1${RESET}"
    FAIL=$((FAIL + 1))
    FAILED_STEPS+=("$1")
}

run_step() {
    local name="$1"
    shift
    step "$name"
    if "$@"; then
        ok "$name"
    else
        fail "$name"
        # stop immediately — mirrors CI set -e behaviour
        echo ""
        echo -e "${RED}${BOLD}ci failed at: $name${RESET}"
        exit 1
    fi
}

echo ""
echo -e "${BOLD}blast local CI${RESET}"
echo -e "mirrors ${CYAN}.github/workflows/ci.yml${RESET}"
echo ""

run_step "build"        cargo build
run_step "test"         cargo test
run_step "clippy"       cargo clippy -- -D warnings
run_step "fmt check"    cargo fmt -- --check

echo ""
echo -e "${GREEN}${BOLD}all checks passed${RESET}"
echo ""
