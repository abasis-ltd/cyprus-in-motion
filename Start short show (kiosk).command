#!/bin/bash
# Opens the 2-minute cut (every project, ~1:47 loop) full-screen in Chrome, straight from this folder.
# Quit with Cmd+Q. Keys: Space pause · ← → scenes.
DIR="$(cd "$(dirname "$0")" && pwd)"
open -na "Google Chrome" --args --user-data-dir="$HOME/.cyprus-expo-show" --kiosk --no-first-run \
  --autoplay-policy=no-user-gesture-required "file://$DIR/show/index.html?cut=short"
