// Single source of truth for project copy used by the site (index.html) and the show (show/).
// Facts come from each project's repository (README, code, feed files) and the 27 Oct 2026
// fact inventory. Statuses are deliberately exact: nothing here claims a deployment,
// contract or partnership that the sources do not show.
window.CHAPTERS = [
  { id: 'create', n: '01', title: 'Create', line: 'From operator spreadsheet to a timetable every journey planner can read.' },
  { id: 'validate', n: '02', title: 'Validate', line: 'Catch the error before the journey.' },
  { id: 'track', n: '03', title: 'Track', line: 'Live buses from the driver’s phone — no hardware to install.' },
  { id: 'predict', n: '04', title: 'Predict', line: 'When the GPS goes quiet, the bus stays on the map.' },
  { id: 'understand', n: '05', title: 'Understand', line: 'What time does the bus really come?' },
  { id: 'move', n: '06', title: 'Move', line: 'More ways we make mobility work.' }
];

window.PROJECTS = [
  {
    id: 'kapnos', chapter: 'create', name: 'GTFS Web Editor', sub: 'with the Kapnos Airport Shuttle feed',
    who: 'Coach and shuttle operators',
    one: 'Turns an operator’s spreadsheet timetable into a standard GTFS feed that journey planners can read.',
    problem: 'Small operators keep schedules in spreadsheets or a Power BI page. Journey planners can’t read those, so their buses stay invisible to travellers.',
    steps: [
      'Import from CSV, Excel or a Power BI schedule',
      'Edit stops, routes and shapes on a map',
      'Build weekly timetables in a grid',
      'Validate, then export a GTFS ZIP with links to online booking'
    ],
    numbers: [['4', 'airport routes'], ['12', 'stops'], ['5,955', 'trips'], ['16,076', 'stop times']],
    status: 'Built · archived summer-2026 feed',
    note: 'Kapnos Airport Shuttle feed, valid 5 Jul – 31 Aug 2026 (archived release).',
    stack: 'Next.js · TypeScript · Python'
  },
  {
    id: 'limassol', chapter: 'create', name: 'Limassol Airport Express', sub: 'GTFS feed',
    who: 'Airport shuttle operator and air travellers',
    one: 'A standard timetable feed that puts the Limassol airport shuttles into map apps — routes, shapes and fares included.',
    problem: 'Without GTFS, airport shuttle times simply don’t appear in journey planners.',
    steps: [
      'Python generators build the feed from the operator’s schedule',
      'Road-following route shapes for both airports',
      'Adult and child fares encoded in the feed'
    ],
    numbers: [['2', 'routes · L1 LCA, L2 PFO'], ['274', 'trips'], ['€10 / €5', 'adult / child fare']],
    status: 'Feed + generator scripts',
    stack: 'Python · GTFS'
  },
  {
    id: 'guru', chapter: 'validate', name: 'GTFS Guru', sub: 'gtfs.guru',
    who: 'Operators, agencies and data publishers',
    one: 'Finds the errors in timetable data before riders do — and says exactly what to fix.',
    problem: 'One broken file and buses vanish from journey planners or show the wrong times. The reference validator is heavy and runs on a server.',
    steps: [
      'Drop a GTFS.zip in the browser — a file you pick never leaves your device',
      '110 checks name the file, row and field of every issue',
      'Errors with coordinates are drawn on a map',
      'One engine everywhere: browser, desktop, CLI, Python, web API, CI and MCP for AI assistants'
    ],
    numbers: [['110', 'checks'], ['6.7×', 'faster on a 16M-row feed*'], ['0 kB', 'uploaded for a file you pick'], ['Apache-2.0', 'open source']],
    status: 'Public product · live at gtfs.guru',
    note: '*Published whole-pipeline benchmark vs the canonical Java validator 8.0.1 on an Apple M3 Pro: 9.75 s vs 65.18 s (Netherlands, 16.0M stop-time rows), 2.32 s vs 10.60 s (MBTA). Rule sets differ.',
    link: 'https://gtfs.guru', stack: 'Rust · WebAssembly · Python'
  },
  {
    id: 'schoolbus', chapter: 'track', name: 'School Bus Tracker', sub: 'phone-based vehicle tracking',
    who: 'Schools and dispatchers — and next, parents',
    one: 'Live bus tracking from the driver’s Android phone. No tracking boxes to buy or install.',
    problem: 'Many fleets have no vehicle-tracking hardware, yet schools and parents want to know where the bus is right now.',
    steps: [
      'The driver logs in, picks the vehicle and route, and starts the trip',
      'The phone reports its position to a lightweight Go + PostgreSQL server',
      'Dispatchers see every bus on a live admin map',
      'A standard GTFS-Realtime feed comes out for any app'
    ],
    next: ['Parents see only their child’s bus', 'Protected school coordinates', '30-day history retention', 'Pilot with 5–20 buses'],
    numbers: [['0', 'hardware boxes'], ['GTFS-RT', 'standard output'], ['5–20', 'buses in the pilot plan']],
    status: 'Tracking foundation built · school pilot planned',
    note: 'Built on the open-source OneBusAway vehicle-positions project.',
    stack: 'Go · PostgreSQL · Kotlin'
  },
  {
    id: 'shadow', chapter: 'predict', name: 'Shadow GTFS-RT API', sub: 'predicted vehicle positions',
    who: 'App developers, operators and riders',
    one: 'When live GPS drops out, our model keeps the bus moving on the map — always marked as an estimate.',
    problem: 'Official live data has gaps. Buses vanish from apps exactly when riders are waiting for them.',
    steps: [
      'A collector archives every Cyprus operator’s feed every 30 seconds',
      'A CatBoost model learns how each route really moves — by hour, day, stop and slope',
      'A route-constrained Kalman filter keeps the estimate on the road',
      'The result is served as a standard GTFS-Realtime feed'
    ],
    numbers: [['7', 'operators archived'], ['30 s', 'polling interval'], ['51.7M', 'GPS positions']],
    status: 'Prediction engine built · deployment not audited',
    stack: 'Python · FastAPI · CatBoost'
  },
  {
    id: 'timetable', chapter: 'understand', name: 'Observed & predicted timetables', sub: 'evidence-based schedules',
    who: 'Ministry, operators and riders',
    one: 'Shows what time the bus usually passes — not only what the timetable promises.',
    problem: 'A published timetable can’t tell you how buses actually run. Planning without evidence repeats the same delays.',
    steps: [
      'GPS points become 11.9M stop passages',
      'Published vs observed for 288 operator and route groups',
      'Printable stop timetables with the typical time and its range',
      'Arrival models with a calibrated p10–p90 range'
    ],
    numbers: [['−25.7%', 'arrival error vs the timetable'], ['260k', 'held-out test arrivals'], ['82%', 'inside the p10–p90 band']],
    status: 'Offline reports and model evaluation',
    note: 'Mean absolute error 4.94 → 3.67 min on 12–26 Oct 2026. Most of the gain comes from historical medians; a fresh independent evaluation is still to come. GPS passages are not boarding records.',
    stack: 'Python · CatBoost · ReportLab'
  },
  {
    id: 'motorist', chapter: 'move', name: 'Cyprus Motorist Hub', sub: 'for every driver on the island',
    who: 'Car owners in Cyprus',
    one: 'One screen for everything a Cyprus driver has to remember, check and do.',
    problem: 'Road tax, MOT and insurance deadlines, fines and fuel prices live on separate portals.',
    steps: [
      'Deadlines across all your vehicles, flagged 30 days ahead',
      'Road and services map built on open data',
      'Fuel, import and running-cost calculators',
      'Hand-offs to official services — no scraping, no stored government credentials'
    ],
    numbers: [['3', 'languages · EN EL RU'], ['9', 'data sources'], ['AA', 'WCAG 2.1 target']],
    status: 'Deployable MVP · demo data is synthetic',
    stack: 'React · Fastify · PostGIS'
  },
  {
    id: 'bikestat', chapter: 'move', name: 'BikeStat', sub: 'shared-bike analytics',
    who: 'Cities and mobility planners',
    one: 'Turns the public Nextbike Cyprus feed into a minute-by-minute history of shared bikes.',
    problem: 'Cities rarely see how shared bikes are actually used.',
    steps: [
      'A Go collector polls 8 public GBFS endpoints every minute',
      'Every snapshot is stored append-only',
      'Per-bike tracking estimates rentals',
      'A dashboard with charts and a station map'
    ],
    numbers: [['12,590', 'snapshots'], ['4,774', 'bikes seen'], ['~455', 'estimated rentals a day']],
    status: 'Collector + offline analysis',
    note: 'Rentals are analytical estimates from open data, not paid transactions.',
    stack: 'Go · PostgreSQL · Python'
  },
  {
    id: 'busrider', chapter: 'move', name: 'BusRider', sub: 'exam-day transport',
    who: 'Students, parents and transport operators',
    one: 'Book a seat on the bus to your exam — the routes plan themselves.',
    problem: 'Getting many students from many addresses to an exam centre on time, with payment and routing in one place.',
    steps: [
      'Pick the exam: school, date and start time',
      'Enter a pickup address — it maps to a zone and a price',
      'Pay with Stripe and get an email confirmation',
      'A dispatcher board drafts routes for 1–5 partner buses with the VROOM solver'
    ],
    numbers: [['1–5', 'partner buses per exam'], ['VROOM', 'route solver']],
    status: 'Working scaffold',
    stack: 'Next.js · Prisma · Stripe'
  },
  {
    id: 'examride', chapter: 'move', name: 'ExamRide', sub: 'ride requests',
    who: 'Students and exam-day coordinators',
    one: 'A light request form for rides to exams, with a coordinator panel.',
    steps: ['Request a ride and drop a pickup pin on a map', 'A status page for every request', 'Coordinator list and stats'],
    status: 'Local prototype',
    stack: 'Node · Express · SQLite'
  },
  {
    id: 'zelo', chapter: 'move', name: 'Zelo e-bikes', sub: 'monthly e-bike rental',
    who: 'Riders and couriers',
    one: 'Rent an e-bike from your phone — verified, booked and paid in minutes.',
    steps: ['Sign up with an SMS code', 'Verify your identity in the app', 'Book a 30-minute pickup slot', 'Top up the wallet; the shop hands over the bike'],
    status: 'App, backend and admin implemented',
    stack: 'Flutter · Go · Next.js'
  },
  {
    id: 'cytransit', chapter: 'move', name: 'CyTransit AI', sub: 'research roadmap',
    who: 'Ministry of Transport and operators',
    one: 'Our research plan for AI-driven public transport in Cyprus.',
    steps: ['Demand fusion', 'ETA & reliability', 'Network optimiser', 'Real-time control', 'Digital twin', 'Decision dashboard'],
    status: 'Research & proposal',
    note: 'A proposal: no award, contract or deployment is implied.',
    stack: 'Proposed: Python · OR-Tools · SUMO'
  }
];
