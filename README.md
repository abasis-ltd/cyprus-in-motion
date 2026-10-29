# Cyprus in Motion — Abasis.AI expo kit

Website, looping expo show, phone game and print materials for Abasis.AI's Cyprus transport projects.

- **Website** — `index.html`: all 12 projects (create, validate, track, predict, understand, move) with real numbers, honest status, screenshots and clips.
- **Show** — `show/`: a 9-minute looping presentation drawn on a live map of every bus line in Cyprus. Keys: Space pause · ← → scenes · 1–6 chapters · F full screen. `?cut=short` plays a 1:47 cut with every project. `?render=1` exposes a deterministic frame renderer used to export the MP4s (`SHOW_CUT=short node render_show.cjs short.mp4` for the short cut).
- **Game** — `play/`: *Beat the Bus*, guess when real Nicosia buses arrived. `?booth=1` for the stand tablet.
- **Print** — `brochure.pdf` (A4 tri-fold) and `card.pdf` (A5 “Scan to play” card); sources `brochure.html`, `card.html`.
- **Stand** — `kit.html`, plus `Start show (kiosk).command`, `Start short show (kiosk).command` and `Start game (kiosk).command` for a Mac (everything runs offline from this folder).

Online: https://abasis-ltd.github.io/cyprus-in-motion/ · game: https://abasis-ltd.github.io/cyprus-in-motion/play/

## Data

`data/projects.js` is the single source of truth for project copy. Map and charts come from public GTFS feeds of Cyprus's seven bus operators (Motion Bus Card open data), the Kapnos and Limassol Airport Express feeds, observed-timetable reports and BikeStat estimates; rebuild with `python3 build_data.py` (expects the sibling repositories next to `CyprusRoutes`). QR codes: `python3 build_qr.py`. MP4: `node render_show.cjs out.mp4` (Playwright + ffmpeg; loads the show via file://).

Figures are as of 27 October 2026. Prototypes, plans and proposals are labelled as such; no deployment, contract or partnership is implied. Observed times are GPS-inferred passages, not boarding records; predicted positions are estimates.

Fonts: Geist and Fira Code (SIL Open Font License 1.1), self-hosted in `assets/fonts/`.
