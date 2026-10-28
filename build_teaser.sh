#!/bin/bash
# Cut a ~45 s social teaser from the rendered show, with short cross-fades between moments.
# usage: ./build_teaser.sh [show.mp4] [teaser.mp4]
set -euo pipefail
IN="${1:-media/cyprus-in-motion-show-1080p.mp4}"
OUT="${2:-media/cyprus-in-motion-teaser-1080p.mp4}"
FADE=0.5
# start:duration of each moment (seconds into the show)
CUTS=(4.0:5.5 17.0:4.5 31.5:5 108.0:5 172.0:5.5 253.5:5.5 322.5:5 350.0:4.5 498.0:5 514.5:6)

inputs=(); filters=""; n=0
for c in "${CUTS[@]}"; do
  inputs+=(-ss "${c%%:*}" -t "${c##*:}" -i "$IN")
  filters+="[$n:v]settb=AVTB,setpts=PTS-STARTPTS,fps=30[v$n];"
  n=$((n + 1))
done
# chain cross-fades: each fade starts FADE seconds before the running end
prev="v0"; offset=0
for ((i = 1; i < n; i++)); do
  d=$(echo "${CUTS[$((i - 1))]}" | cut -d: -f2)
  offset=$(echo "$offset + $d - $FADE" | bc)
  filters+="[$prev][v$i]xfade=transition=fade:duration=$FADE:offset=$offset[x$i];"
  prev="x$i"
done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${filters%;}" -map "[$prev]" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart -an "$OUT"
echo "teaser: $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s)"
