#!/bin/bash
# Opens Beat the Bus full-screen in booth mode (daily leaderboard, resets after 60 s idle).
# Quit with Cmd+Q. The leaderboard lives in this Chrome profile and survives restarts.
DIR="$(cd "$(dirname "$0")" && pwd)"
open -na "Google Chrome" --args --user-data-dir="$HOME/.cyprus-expo-game" --kiosk --no-first-run \
  "file://$DIR/play/index.html?booth=1"
