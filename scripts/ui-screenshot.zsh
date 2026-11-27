#!/usr/bin/env zsh
# Take a headless screenshot of a page using the Windows Edge/Chrome from WSL (no install, no debug port).
# Usage: scripts/ui-screenshot.zsh <url> <WIDTHxHEIGHT> <output.png>
# Example (mobile): scripts/ui-screenshot.zsh http://localhost:5173/expenses 390x844 /tmp/mobile.png
# Needs the UI reachable from Windows: run scripts/dev-api.zsh and `npm start` in src/UI first
# (WSL servers are reachable from Windows at localhost in the default NAT mode). Override the
# browser with BROWSER_EXE=/mnt/c/.../msedge.exe. Read the PNG afterwards to look at it.
set -euo pipefail

url=${1:?usage: $0 <url> <WIDTHxHEIGHT> <output.png>}
size=${2:?usage: $0 <url> <WIDTHxHEIGHT> <output.png>}
out=${3:?usage: $0 <url> <WIDTHxHEIGHT> <output.png>}

browser=${BROWSER_EXE:-}
if [[ -z $browser ]]; then
  for candidate in \
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
    "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
    "/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
    [[ -x $candidate ]] && { browser=$candidate; break; }
  done
fi
[[ -n $browser ]] || { print -u2 "No Windows Chrome/Edge found; set BROWSER_EXE."; exit 1 }

# Windows writes the file and uses a throwaway profile, both under the Windows temp dir.
win_temp=$(wslpath -u "$(cmd.exe /c 'echo %TEMP%' 2>/dev/null | tr -d '\r')")
work=$win_temp/budget-shot-$$
mkdir -p $work
trap 'rm -rf $work' EXIT

timeout 120 "$browser" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --user-data-dir="$(wslpath -w $work/profile)" --window-size=${size/x/,} --virtual-time-budget=15000 \
  --screenshot="$(wslpath -w $work/shot.png)" "$url" >/dev/null 2>&1 || true

[[ -s $work/shot.png ]] || { print -u2 "Screenshot failed (is $url reachable from Windows?)"; exit 1 }
mkdir -p ${out:h}
cp $work/shot.png $out
print "Wrote $out"
