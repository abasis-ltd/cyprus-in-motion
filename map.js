// Cyprus bus network renderer, drawn from the merged public GTFS shapes.
// Everything is a pure function of the state passed to draw(), so the same frame can be
// re-rendered exactly (live on a kiosk, or frame by frame when exporting the show to MP4).
// World units: x 0..10000 across 32.25°E–34.12°E, y grows southwards.
(() => {
  'use strict';
  const COLORS = {
    Nicosia: '#3b82f6', Limassol: '#93c5fd', Larnaca: '#60a5fa', Paphos: '#dbeafe',
    Famagusta: '#2563eb', Intercity: '#0a5cff', 'Airport express': '#ffffff', Other: '#94a3b8'
  };
  const FONT = '"Geist", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  const MONO = '"Fira Code", "SF Mono", Menlo, monospace';
  const SPAN = (34.12 - 32.25) * Math.cos(34.9 * Math.PI / 180);
  const proj = (lat, lon) => ({ x: (lon - 32.25) * Math.cos(34.9 * Math.PI / 180) / SPAN * 10000, y: (35.25 - lat) / SPAN * 10000 });
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function mulberry32(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function prepLine(flat) {
    const xs = [], ys = [], cum = [0];
    for (let i = 0; i < flat.length; i += 2) { xs.push(flat[i]); ys.push(flat[i + 1]); }
    for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    return { xs, ys, cum, len: cum[cum.length - 1] };
  }
  function posAt(s, d) {
    const c = s.cum; let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] < d) lo = m; else hi = m; }
    const f = (d - c[lo]) / ((c[hi] - c[lo]) || 1);
    return [s.xs[lo] + (s.xs[hi] - s.xs[lo]) * f, s.ys[lo] + (s.ys[hi] - s.ys[lo]) * f];
  }
  // stroke a line from its start up to distance `upto`
  function partialPath(ctx, s, upto) {
    ctx.moveTo(s.xs[0], s.ys[0]);
    for (let i = 1; i < s.xs.length; i++) {
      if (s.cum[i] >= upto) { const [x, y] = posAt(s, upto); ctx.lineTo(x, y); return; }
      ctx.lineTo(s.xs[i], s.ys[i]);
    }
  }
  function bboxOf(lines) {
    const b = [1e9, 1e9, -1e9, -1e9];
    for (const s of lines) for (let i = 0; i < s.xs.length; i++) {
      b[0] = Math.min(b[0], s.xs[i]); b[1] = Math.min(b[1], s.ys[i]);
      b[2] = Math.max(b[2], s.xs[i]); b[3] = Math.max(b[3], s.ys[i]);
    }
    return b;
  }

  function createMap(canvas, net, opts = {}) {
    const ctx = canvas.getContext('2d');
    const shapes = net.shapes.map(s => Object.assign(prepLine(s.p), { agency: s.a, name: s.n, trips: s.t })).filter(s => s.len > 0);
    const byAgency = {}, bounds = {};
    for (const s of shapes) {
      const p = byAgency[s.agency] || (byAgency[s.agency] = new Path2D());
      p.moveTo(s.xs[0], s.ys[0]);
      for (let i = 1; i < s.xs.length; i++) p.lineTo(s.xs[i], s.ys[i]);
    }
    for (const a in byAgency) bounds[a] = bboxOf(shapes.filter(s => s.agency === a));
    bounds.island = bboxOf(shapes);
    const stops = net.stops;

    // Buses: deterministic (seeded) and weighted by how many trips run on each shape.
    const rand = mulberry32(opts.seed || 7);
    const weighted = [];
    shapes.forEach((s, i) => { for (let k = 0; k < Math.min(12, Math.ceil(s.trips / 40)); k++) weighted.push(i); });
    const buses = Array.from({ length: opts.buses ?? 520 }, () => {
      const si = weighted[(rand() * weighted.length) | 0];
      return { si, d0: rand() * shapes[si].len, v: 18 + rand() * 26 };
    });

    // Small feeds drawn on top (Kapnos, Limassol Airport Express), prepared once.
    const feeds = {};
    for (const [key, f] of Object.entries(opts.overlays || {})) {
      if (!f || !f.lines) continue;
      const lines = f.lines.map(l => Object.assign(prepLine(l.p), { name: l.name }));
      feeds[key] = { lines, stops: f.stops, bounds: bboxOf(lines) };
    }

    // School-bus simulation: five Limassol routes of a sensible length.
    const schoolShapes = shapes.map((s, i) => [s, i]).filter(([s]) => s.agency === 'Limassol' && s.len > 350 && s.len < 1400)
      .sort((a, b) => a[0].len - b[0].len);
    const school = [0.15, 0.35, 0.55, 0.75, 0.92].map(f => schoolShapes[Math.floor(f * (schoolShapes.length - 1))]).filter(Boolean).map(([, i]) => i);

    let W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    resize();

    // camera that fits world bounds into a fraction of the screen, e.g. the right half
    function fit(b, area = {}) {
      const { left = .06, right = .94, top = .14, bottom = .88 } = area;
      const aw = (right - left) * W, ah = (bottom - top) * H;
      const bw = Math.max(b[2] - b[0], 1), bh = Math.max(b[3] - b[1], 1);
      const s = Math.min(aw / bw, ah / bh);
      const cx = (left + right) / 2 * W, cy = (top + bottom) / 2 * H;
      return { x: (b[0] + b[2]) / 2 - (cx - W / 2) / s, y: (b[1] + b[3]) / 2 - (cy - H / 2) / s, w: W / s };
    }
    function point(x, y, w, area = {}) {
      const { fx = .7, fy = .52 } = area, s = W / w;
      return { x: x - (fx - .5) * W / s, y: y - (fy - .5) * H / s, w };
    }
    let cam = { x: 5000, y: 2280, w: 10400 };
    const toScreen = (x, y, c = cam) => { const s = W / c.w; return [W / 2 + (x - c.x) * s, H / 2 + (y - c.y) * s]; };

    function label(text, sx, sy, o = {}) {
      const size = o.size || 15, pad = o.pad ?? 8;
      ctx.font = `${o.weight || 600} ${size}px ${o.mono ? MONO : FONT}`;
      const tw = ctx.measureText(text).width, boxW = tw + (o.pill === false ? 0 : pad * 2);
      let x = sx + (o.dx ?? 14), y = sy + (o.dy ?? 0);
      if (o.align === 'center') x -= tw / 2 + pad;
      // keep labels on screen: flip to the other side of the point near an edge
      if (x + boxW > W - 6) x = sx - Math.abs(o.dx ?? 14) - boxW;
      if (x < 6) x = sx + Math.abs(o.dx ?? 14);
      if (o.pill !== false) {
        ctx.fillStyle = o.bg || 'rgba(15,23,42,.82)';
        const h = size + pad * 1.2, r = h / 2;
        ctx.beginPath(); ctx.roundRect(x, y - h / 2, tw + pad * 2, h, r); ctx.fill();
        if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = 1; ctx.stroke(); }
      }
      ctx.fillStyle = o.color || '#f8fafc'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x + (o.pill === false ? 0 : pad), y + 1);
    }

    function draw(st) {
      cam = st.cam || cam;
      const scale = W / cam.w, px = 1 / scale, t = st.time || 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (W / 2 - cam.x * scale), dpr * (H / 2 - cam.y * scale));
      const dim = 1 - clamp(st.dim || 0);

      // stops
      ctx.globalAlpha = dim;
      ctx.fillStyle = 'rgba(248,250,252,.2)';
      const sr = Math.max(px * 1.1, 2.2);
      for (let i = 0; i < stops.length; i += 2) ctx.fillRect(stops[i] - sr / 2, stops[i + 1] - sr / 2, sr, sr);

      // network
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      const reveal = st.reveal ?? 1;
      if (reveal < 1) {
        for (const s of shapes) {
          ctx.beginPath(); partialPath(ctx, s, s.len * ease(clamp(reveal * 1.15 - (s.xs[0] / 10000) * .15)));
          ctx.strokeStyle = COLORS[s.agency] + '99'; ctx.lineWidth = px * 1.4; ctx.stroke();
        }
      } else {
        const fa = st.focusAmt ?? 1;
        for (const a in byAgency) {
          const on = !st.focus || st.focus === a;
          ctx.globalAlpha = dim * (on ? 1 : 1 - .88 * fa);
          ctx.strokeStyle = COLORS[a] + '33'; ctx.lineWidth = px * 5; ctx.stroke(byAgency[a]);
          ctx.strokeStyle = COLORS[a] + 'aa'; ctx.lineWidth = px * 1.3; ctx.stroke(byAgency[a]);
        }
      }

      // buses
      const busAlpha = (st.busAlpha ?? 1) * dim;
      if (busAlpha > 0.01) {
        const r = px * 2.6, tau = st.tau || 0;
        for (const b of buses) {
          const s = shapes[b.si];
          const d = ((b.d0 + b.v * tau) % s.len + s.len) % s.len;
          const edge = Math.min(d, s.len - d) / Math.min(60, s.len / 2); // fade in/out at route ends
          const on = !st.focus || st.focus === s.agency;
          const a = busAlpha * (on ? 1 : 1 - .85 * (st.focusAmt ?? 1)) * clamp(edge);
          if (a < .02) continue;
          const [x, y] = posAt(s, d);
          ctx.fillStyle = COLORS[s.agency];
          ctx.globalAlpha = a * .25; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 6.283); ctx.fill();
          ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      for (const o of st.feeds || []) drawFeed(o, px);
      if (st.school) drawSchool(st.school, st.tau || 0, px);
      if (st.ghost) drawGhost(st.ghost, px);
      if (st.pulse) drawPulse(st.pulse, px, t);
      if (st.labels) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const l of st.labels) {
          if ((l.alpha ?? 1) <= 0.01) continue;
          ctx.globalAlpha = l.alpha ?? 1;
          const [sx, sy] = toScreen(l.x, l.y);
          label(l.text, sx, sy, l);
        }
        ctx.globalAlpha = 1;
      }
    }

    function drawFeed(o, px) {
      const f = feeds[o.key]; if (!f) return;
      const a = o.alpha ?? 1; if (a <= .01) return;
      const prog = o.progress ?? 1;
      ctx.globalAlpha = a;
      f.lines.forEach((s, i) => {
        const p = clamp(prog * f.lines.length - i * .6);
        if (p <= 0) return;
        ctx.beginPath(); partialPath(ctx, s, s.len * ease(p));
        ctx.strokeStyle = 'rgba(147,197,253,.35)'; ctx.lineWidth = px * 16; ctx.stroke();
        ctx.strokeStyle = o.color || '#ffffff'; ctx.lineWidth = px * 4.5; ctx.stroke();
      });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const la = a * clamp((prog - .55) / .3);
      for (const s of f.stops) {
        const [sx, sy] = toScreen(s.x, s.y);
        ctx.globalAlpha = a * clamp(prog * 2);
        ctx.fillStyle = '#0a5cff'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, 6.283); ctx.fill();
        if (o.labels !== false && la > .01) {
          ctx.globalAlpha = la;
          const right = !(o.leftLabels || []).includes(s.name);
          ctx.font = `600 16px ${FONT}`;
          const tw = ctx.measureText(s.name).width;
          label(s.name, sx, sy, { size: 16, dx: right ? 16 : -tw - 32 });
        }
      }
      ctx.globalAlpha = 1;
      const scale = W / cam.w;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (W / 2 - cam.x * scale), dpr * (H / 2 - cam.y * scale));
    }

    function drawSchool(o, tau, px) {
      const a = o.alpha ?? 1; if (a <= .01) return;
      school.forEach((si, k) => {
        const s = shapes[si];
        ctx.globalAlpha = a * .9;
        ctx.beginPath(); ctx.moveTo(s.xs[0], s.ys[0]);
        for (let i = 1; i < s.xs.length; i++) ctx.lineTo(s.xs[i], s.ys[i]);
        ctx.strokeStyle = 'rgba(219,234,254,.55)'; ctx.lineWidth = px * 3; ctx.stroke();
        // ping-pong along the route so buses never jump
        const span = s.len, raw = (k * 0.21 * span + tau * 22) % (2 * span);
        const d = raw > span ? 2 * span - raw : raw;
        const [x, y] = posAt(s, d);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const [sx, sy] = toScreen(x, y);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(10,92,255,.35)'; ctx.beginPath(); ctx.arc(sx, sy, 18, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(sx - 13, sy - 8, 26, 16, 5); ctx.fill();
        ctx.fillStyle = '#0a5cff'; ctx.fillRect(sx - 9, sy - 4, 5, 5); ctx.fillRect(sx - 2, sy - 4, 5, 5); ctx.fillRect(sx + 5, sy - 4, 4, 5);
        label(`BUS ${k + 1}`, sx, sy, { size: 12, mono: true, dx: 20 });
        const scale = W / cam.w;
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (W / 2 - cam.x * scale), dpr * (H / 2 - cam.y * scale));
      });
      ctx.globalAlpha = 1;
    }

    function drawGhost(g, px) {
      const s = shapes[g.si]; if (!s) return;
      const a = g.alpha ?? 1; if (a <= .01) return;
      const p = clamp(g.phase), d = s.len * (0.1 + 0.8 * p);
      const lostFrom = 0.32, lostTo = 0.78, lostAt = s.len * (0.1 + 0.8 * lostFrom);
      const lost = p > lostFrom && p < lostTo;
      ctx.globalAlpha = a;
      ctx.lineWidth = px * 6; ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.moveTo(s.xs[0], s.ys[0]);
      for (let i = 1; i < s.xs.length; i++) ctx.lineTo(s.xs[i], s.ys[i]);
      ctx.stroke();
      const [x, y] = posAt(s, d);
      const segment = (from, to, color, dash) => {
        ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = px * 7;
        ctx.beginPath(); let started = false;
        for (let i = 0; i < s.xs.length; i++) {
          if (s.cum[i] < from) continue; if (s.cum[i] > to) break;
          started ? ctx.lineTo(s.xs[i], s.ys[i]) : ctx.moveTo(s.xs[i], s.ys[i]); started = true;
        }
        if (started) { const [ex, ey] = posAt(s, to); ctx.lineTo(ex, ey); ctx.stroke(); }
        ctx.setLineDash([]);
      };
      segment(s.len * .1, Math.min(d, lostAt), '#ffffff', []);
      if (d > lostAt) segment(lostAt, Math.min(d, s.len * (0.1 + 0.8 * lostTo)), '#60a5fa', [px * 10, px * 8]);
      if (p >= lostTo) segment(s.len * (0.1 + 0.8 * lostTo), d, '#ffffff', []);
      if (lost) {
        const u = (p - lostFrom) / (lostTo - lostFrom);
        ctx.fillStyle = 'rgba(96,165,250,.2)';
        ctx.beginPath(); ctx.arc(x, y, px * (18 + Math.sin(u * Math.PI) * 60), 0, 6.283); ctx.fill();
        ctx.setLineDash([px * 6, px * 6]); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = px * 2.5;
        ctx.beginPath(); ctx.arc(x, y, px * 14, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(x, y, px * 7, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = a * .3; ctx.beginPath(); ctx.arc(x, y, px * 22, 0, 6.283); ctx.fill();
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, px * 11, 0, 6.283); ctx.fill();
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [sx, sy] = toScreen(x, y);
      if (lost) label('GPS lost · model estimate', sx, sy, { size: 16, mono: true, bg: '#0a5cff', dx: 30 });
      else label(p >= lostTo ? 'GPS back · on track' : 'Measured GPS fix', sx, sy, { size: 16, mono: true, bg: '#f8fafc', color: '#0f172a', dx: 30 });
      ctx.globalAlpha = 1;
      const scale = W / cam.w;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (W / 2 - cam.x * scale), dpr * (H / 2 - cam.y * scale));
    }

    function drawPulse(pl, px, t) {
      const a = pl.alpha ?? 1; if (a <= .01) return;
      const k = (t / 1400) % 1;
      ctx.globalAlpha = a;
      ctx.strokeStyle = `rgba(147,197,253,${1 - k})`; ctx.lineWidth = px * 2;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, px * (8 + k * 46), 0, 6.283); ctx.stroke();
      ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(pl.x, pl.y, px * 7, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // a mid-length Nicosia line through the Ministry of Finance stop, for the GPS-gap demo
    function nicosiaShape(near) {
      let best = 0, bestLen = 0;
      shapes.forEach((s, i) => {
        if (s.agency !== 'Nicosia' || s.len < 300 || s.len > 1400) return;
        const hit = s.xs.some((x, k) => Math.hypot(x - near.x, s.ys[k] - near.y) < 60);
        if (hit && s.len > bestLen) { best = i; bestLen = s.len; }
      });
      return best;
    }

    return {
      draw, resize, fit, point, toScreen, proj, nicosiaShape, shapes, bounds, feeds,
      lineBounds: i => bboxOf([shapes[i]]), schoolBounds: () => bboxOf(school.map(i => shapes[i])),
      size: () => ({ W, H }), COLORS
    };
  }

  window.createMap = createMap;
  window.MAP_COLORS = COLORS;
})();
