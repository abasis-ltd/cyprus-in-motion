#!/bin/bash
# Opens the looping expo show full-screen in Chrome, straight from this folder (no internet needed).
# Quit with Cmd+Q. Keys: Space pause · ← → scenes · 1–6 chapters.
DIR="$(cd "$(dirname "$0")" && pwd)"
open -na "Google Chrome" --args --user-data-dir="$HOME/.cyprus-expo-show" --kiosk --no-first-run \
  --autoplay-policy=no-user-gesture-required "file://$DIR/show/index.html"
