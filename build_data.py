"""Build compact data for the expo site, show and game (offline, no deps).

Outputs (all plain JS files so pages also work from file://):
  data/network.js   every public bus route shape + stop in Cyprus (merged GTFS)
  data/overlays.js  Kapnos + Limassol Airport Express feeds, key stops, route punctuality,
                    BikeStat estimated rentals (full days, hour of day)
  data/timetable.js observed vs published times at Ministry of Finance, Nicosia
"""
import csv, json, math, pathlib, collections

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
GITHUB = ROOT.parent
G = ROOT / "extracted_gtfs"
OUT = HERE / "data"
AGENCIES = {"9": "Nicosia", "6": "Limassol", "10": "Larnaca", "2": "Paphos",
            "4": "Famagusta", "5": "Intercity", "11": "Airport express"}
LAT1, LON0, LON1 = 35.25, 32.25, 34.12
K = math.cos(math.radians(34.9))
SPAN = (LON1 - LON0) * K


def proj(lat, lon):
    return round((lon - LON0) * K / SPAN * 10000), round((LAT1 - lat) / SPAN * 10000)


def dp(pts, eps):
    """Douglas-Peucker simplification in world units."""
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1
    i, dmax = 0, -1
    for j in range(1, len(pts) - 1):
        d = abs(dy * pts[j][0] - dx * pts[j][1] + x2 * y1 - y2 * x1) / n
        if d > dmax:
            i, dmax = j, d
    if dmax <= eps:
        return [pts[0], pts[-1]]
    return dp(pts[:i + 1], eps)[:-1] + dp(pts[i:], eps)


def flat(line):
    return [c for xy in line for c in xy]


def write_js(name, var, obj):
    (OUT / name).write_text(f"window.{var}=" + json.dumps(obj, separators=(",", ":"), ensure_ascii=False) + ";\n")


def network():
    routes = {r["route_id"]: r for r in csv.DictReader(open(G / "gtfs_routes_merged.csv"))}
    shape_route, trips_per_shape = {}, collections.Counter()
    for t in csv.DictReader(open(G / "gtfs_trips_merged.csv")):
        shape_route.setdefault(t["shape_id"], t["route_id"])
        trips_per_shape[t["shape_id"]] += 1
    pts = collections.defaultdict(list)
    for s in csv.DictReader(open(G / "gtfs_shapes_merged.csv")):
        pts[s["shape_id"]].append((int(s["shape_pt_sequence"]), float(s["shape_pt_lat"]), float(s["shape_pt_lon"])))
    shapes = []
    for sid, p in sorted(pts.items()):
        p.sort()
        r = routes.get(shape_route.get(sid, ""), {})
        shapes.append({"a": AGENCIES.get(r.get("agency_id"), "Other"), "n": r.get("route_short_name", ""),
                       "t": trips_per_shape[sid], "p": flat(dp([proj(a, b) for _, a, b in p], 4))})
    stops = []
    for s in csv.DictReader(open(G / "gtfs_stops_merged.csv")):
        stops += proj(float(s["stop_lat"]), float(s["stop_lon"]))
    net = {"shapes": shapes, "stops": stops, "counts": {
        "routes": len(routes), "shapes": len(shapes), "stops": len(stops) // 2,
        "trips": sum(trips_per_shape.values())}}
    write_js("network.js", "NETWORK", net)
    return net["counts"]


def feed_overlay(folder, name_of_route, label_of_stop):
    """Route lines and stops of a small GTFS feed, simplified for drawing."""
    stops = {s["stop_id"]: s for s in csv.DictReader(open(folder / "stops.txt"))}
    shape_route = {}
    for t in csv.DictReader(open(folder / "trips.txt")):
        shape_route.setdefault(t["shape_id"], t["route_id"])
    pts = collections.defaultdict(list)
    for s in csv.DictReader(open(folder / "shapes.txt")):
        pts[s["shape_id"]].append((int(s["shape_pt_sequence"]), float(s["shape_pt_lat"]), float(s["shape_pt_lon"])))
    # the longest shape of each route is enough to draw it (variants and the return leg overlap it)
    longest = {}
    for sid, p in pts.items():
        route = shape_route.get(sid)
        if route is not None and len(p) > len(longest.get(route, ("", []))[1]):
            longest[route] = (sid, p)
    lines = []
    for route, (sid, p) in sorted(longest.items()):
        p.sort()
        lines.append({"route": route, "name": name_of_route(route), "p": flat(dp([proj(a, b) for _, a, b in p], 3))})
    # pick-up / drop-off pairs and nearby stops share one label on the map
    named = {}
    for s in stops.values():
        x, y = proj(float(s["stop_lat"]), float(s["stop_lon"]))
        named.setdefault(label_of_stop(s), (x, y))
    counts = {k: sum(1 for _ in csv.DictReader(open(folder / f))) for k, f in
              (("routes", "routes.txt"), ("stops", "stops.txt"), ("trips", "trips.txt"), ("stop_times", "stop_times.txt"))}
    return {"lines": lines, "stops": [{"name": k, "x": v[0], "y": v[1]} for k, v in named.items()], "counts": counts}


def kapnos_sample(folder, service="S20260706", route="R1", origin="NIC"):
    """Real departures of one route on one day (Monday 6 July 2026), for the 'spreadsheet' view."""
    trips = {t["trip_id"]: t for t in csv.DictReader(open(folder / "trips.txt"))
             if t["service_id"] == service and t["route_id"] == route}
    rows = collections.defaultdict(list)
    for r in csv.DictReader(open(folder / "stop_times.txt")):
        if r["trip_id"] in trips:
            rows[r["trip_id"]].append(r)
    out = []
    for tid, rs in rows.items():
        rs.sort(key=lambda r: int(r["stop_sequence"]))
        if rs[0]["stop_id"] == origin:
            out.append({"trip": tid, "dep": rs[0]["departure_time"][:5], "arr": rs[-1]["arrival_time"][:5], "to": rs[-1]["stop_id"]})
    return {"service": service, "date": "2026-07-06", "route": route, "departures": sorted(out, key=lambda r: r["dep"])}


def overlays():
    kapnos_names = {"R1": "Nicosia – Larnaca Airport", "R2": "Larnaca Airport – Paphos Airport",
                    "R3": "Nicosia – Paphos Airport", "R4": "Ayia Napa & Protaras – Larnaca Airport"}
    kapnos_dir = GITHUB / "GTFS/data/gtfs/kapnos_v1.1"
    kapnos_places = {"C": "Nicosia", "A": "Larnaca Airport", "B": "Paphos Airport", "D01": "Protaras", "D02": "Ayia Napa"}
    kapnos = feed_overlay(kapnos_dir, lambda r: kapnos_names.get(r, r),
                          lambda st: kapnos_places.get(st["zone_id"][:3], kapnos_places.get(st["zone_id"][:1], st["stop_name"])))
    kapnos["sample"] = kapnos_sample(kapnos_dir)
    limassol_places = {"LCA": "Larnaca Airport", "PFO": "Paphos Airport", "HAVOUZAS": "Limassol", "TOURIST": "Limassol tourist area"}
    limassol = feed_overlay(GITHUB / "GTFS-limassol-shuttle",
                            lambda r: {"LIM-LCA": "L1 Limassol – Larnaca Airport", "LIM-PFO": "L2 Limassol – Paphos Airport"}.get(r, r),
                            lambda st: limassol_places.get(st["stop_id"], st["stop_name"]))
    stats = json.load(open(ROOT / "output/transport-exhibition/research/stop_statistics.json"))
    punctuality = [{"route": k, "records": v["records"], "within": round(v["within_percent"], 2),
                    "late": round(v["late_percent"], 2), "early": round(v["early_percent"], 2),
                    "median": round(v["median_delay_minutes"], 2)} for k, v in stats["routes"].items()]
    bike = GITHUB / "BikeStat"
    daily = [{"day": r["weekday"] + " " + r["local_day"][5:], "rentals": int(r["rentals_departures"])}
             for r in csv.DictReader(open(bike / "rentals_by_day.csv")) if r["coverage"] == "full"]
    hourly = [int(r["total_departures"]) for r in csv.DictReader(open(bike / "rentals_by_hour.csv"))]
    o = stats["overall"]
    mx, my = proj(35.1686262, 33.3549472)
    write_js("overlays.js", "OVERLAYS", {
        "kapnos": kapnos, "limassol": limassol,
        "places": {"mof": {"name": "Ministry of Finance", "x": mx, "y": my}},
        "bikestat": {"daily": daily, "hourly": hourly},
        "punctuality": {"routes": punctuality, "overall": {
            "records": o["records"], "within": round(o["within_percent"], 2), "late": round(o["late_percent"], 2),
            "early": round(o["early_percent"], 2), "median": round(o["median_delay_minutes"], 2)}}})
    return kapnos["counts"], limassol["counts"]


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    print("network", network())
    print("kapnos, limassol", overlays())
    src = ROOT / "output/transport-exhibition/dist/assets/timetable.js"
    (OUT / "timetable.js").write_text(src.read_text())
