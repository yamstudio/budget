#!/usr/bin/env zsh
# Take a screenshot of a page with Playwright's Chromium (runs inside WSL; any viewport size, including 390x844).
# Usage: scripts/ui-screenshot.zsh <url> <WIDTHxHEIGHT> <output.png> [--full-page]
# Example (phone): scripts/ui-screenshot.zsh http://localhost:5173/insights 390x844 /tmp/phone.png
# Needs the UI reachable: run scripts/dev-api.zsh and `npm start` in src/UI first. Read the PNG afterwards to look at it.
# One-time setup: `npm ci` in src/UI, then `npx playwright install chromium` there (about 700 MB in ~/.cache/ms-playwright),
# plus the system libraries Chromium needs (on Arch: at-spi2-core libxcomposite libxdamage libxfixes libxrandr mesa libxkbcommon alsa-lib).
# Prints a warning when the page is wider than the viewport.
set -euo pipefail
cd ${0:A:h}/../src/UI
[[ -d node_modules/playwright ]] || { print -u2 "Run 'npm ci' in src/UI first."; exit 1 }
# Resolve the output path against the caller's directory, since we changed directory above.
out=${3:?usage: $0 <url> <WIDTHxHEIGHT> <output.png> [--full-page]}
[[ $out == /* ]] || out=$OLDPWD/$out
exec node scripts/screenshot.mjs ${1:?usage: $0 <url> <WIDTHxHEIGHT> <output.png> [--full-page]} ${2:?usage: $0 <url> <WIDTHxHEIGHT> <output.png> [--full-page]} $out ${@:4}
