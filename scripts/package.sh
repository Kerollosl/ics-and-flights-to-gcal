#!/usr/bin/env bash
# Builds dist/ics-to-google-calendar-<version>.zip containing only shipping files.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
out="dist/ics-to-google-calendar-$version.zip"
mkdir -p dist && rm -f "$out"
zip -X -q "$out" manifest.json icon16.png icon48.png icon128.png \
  popup/popup.html popup/popup.css popup/popup.js popup/calendar.js popup/ical.min.js \
  THIRD-PARTY-NOTICES.md
echo "Created $out"
unzip -l "$out"
