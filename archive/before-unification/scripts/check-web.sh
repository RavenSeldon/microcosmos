#!/bin/sh
# Browser check of the built playable: loads five fixed games in headless Chrome and asserts on the
# rendered page text. Needs google-chrome. Run after: node scripts/build-web.ts --shots
set -e
cd "$(dirname "$0")/../web/dist"
dom() { google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=5000 --dump-dom "file://$PWD/shot-$1.html" 2>/dev/null; }
want() { if dom "$1" | grep -q "$2"; then echo "ok   $1: $2"; else echo "FAIL $1: $2"; exit 1; fi; }
want start "World 1005"
want start "No threat is standing"
want threat "B threatens C"
want threat "Signal C"
want dawn "Shared Dawn"
want dawn "One surviving game"
want fragile "Fragile Peace"
want night "The Long Night"
want night "What was hidden"
want dawn "A Shared Dawn was reachable"
echo "browser check passed"
