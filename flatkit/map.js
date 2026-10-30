// ── map.js: real maps for the flat engine (load it after engine.js: <script src="map.js"></script>) ─────────────────────────
// A satellite world (NASA Blue Marble, Web Mercator tiles in maps/tiles/<z>/<x>_<y>.jpg, zoom 0-5, and the sharp 500 m set in maps/hi, zoom 6-7) and every country, state,
// city, lake and river (Natural Earth, maps/world.json), all public domain. The camera flies like a map app (zoom out, pan,
// zoom in) and never stops; regions light up, routes draw themselves, pins and labels sit ON their place and move with it.
// Before the renderer starts, the page is played once at 15 fps to find which tiles its camera passes over, and only those
// load (window.beforeReady, awaited by start()).
//
//   const cam = MAP.cam(s.T, [ { t: 0, at: 'Africa', pad: 0.12 }, { t: 3.2, at: 'Egypt', d: 1.4 }, { t: 7, lon: 0, lat: 20, z: 1.6 } ]);
//   MAP.view(g, cam);                                   satellite under this camera (o.grade: saturation / contrast / darken)
//   MAP.dark(g, cam, { land, ocean, border })           the dark vector map mode (no tiles)
//   MAP.region(g, 'Africa' | 'Egypt' | 'Texas' | ['FRA', 'DEU'], { fill, alpha, edge, glow, lift, p, dim })
//   MAP.borders(g, { col, w, a, of: 'USA' (states) })   MAP.coast(g, { col, w, a })    MAP.rivers(g, o)   MAP.lakes(g, o)
//   MAP.route(g, [[lon, lat], 'Paris', ...], p, { col, w, glow, dash, great, dot, head })
//   MAP.pin(g, 'Perth' | [lon, lat], { s, ring, shape: 'round' | 'hex', draw: (g, x, y, r) => ..., k })
//   MAP.label(g, 'Africa', 'Africa' | [lon, lat], { size, col, font, k })      MAP.xy(lon, lat) / MAP.at('Perth') -> [x, y]
//   MAP.find(name) -> { kind, name, c: [lon, lat], box, rings }                 MAP.fit(name | box, pad) -> { lon, lat, z }
//   MAP.flagFill(g, 'China', { p, t })   a country filled with its waving flag     MAP.flag(g, 'FRA', x, y, w, h)
//   MAP.shield(g, x, y, 90, { kind: 'interstate' | 'us' | 'state', s, k })    MAP.marker(g, 'Paris', { k })   MAP.ring(g, place, r, p)
//   MAP.sticker(g, x, y, { icon: 'plane', col, s, k, glow })   MAP.icon(g, 'skull', x, y, s, col)   (car plane ship train skull person
//     money oil factory house warning clock fist soldier wheat bolt water tree mountain)
//   MAP.scatter(g, 'Panama', 8, (g, x, y, i, k) => ..., { t, t0, stagger, seed })   spots spread inside a region, popping in turn
//   MAP.meridian(g, 0, p) (o.lat: a parallel)   MAP.mesh(g, places, p, { near, col })   MAP.react(g, x, y, s, 'shocked', k)
//   MAP.headline(g, ['This country *pays* you', 'to get +married+'], s.t, { times })   typed headline on black bars
//   MAP.plate(g, '28 years', x, y, { k, col, tilt, count: [0, 28, p] })   MAP.news(g, { source, lines, mark, k })   MAP.badge(g, place, { draw, k })
//   MAP.tip(path, p) -> [lon, lat] where a route drawn to p ends (ride the line: view at the tip, route to p)
//   MAP.cutout(g, 'dam', x, y, { s, col, rot, k, bob })   a flat icon with the white sticker outline (also bulb camera dam wave fire bag coin
//     lock key gavel doc radiation thermo rocket barrel crown people container)   MAP.hand(g, 'key' | drawFn, { side, at, s, k, col })
//   MAP.political(g, cam, { pick: { FRA: '#D93A32' }, rest })   the flat colour map    MAP.globe(g, { lon, lat, r, pick })   a turning globe
//   MAP.tag(g, 'Doha', 'Doha', { dx, dy, k })   name with an underline leader      MAP.pulse(g, place, u)   arrival ring (u 0..1)
//   MAP.vehicle(g, path, p, { icon: 'plane' | 'ship' | 'car' })   rides the route's tip   MAP.band(g, path, p, { w, cols })   flow arrow
//   MAP.callout(g, 'text', place, { dx, dy, k })   MAP.chart(g, [{ label, v }], { p, k })   MAP.timeline(g, [{ when, text }], p)
//   MAP.life(g, T, a, b, k => MAP.plate(g, '12%', x, y, { k }))   EVERY overlay lives through this: eased in, held, eased out
//   MAP.grade(g, { t: s.T })   the one finish, drawn last (edge darkening + moving grain)   region o.pattern: 'hatch' | 'dots'
//   MAP.along(g, '2 years', a, b, { size, off })   MAP.sheet(g, g2 => { MAP.view(g2, cam); ... }, { k, s, tilt, pitch })   MAP.tint(g)
const MAP = (() => {
  const TS = 512, ZMAX = 7, ZBASE = 5, R2D = 180 / Math.PI, D2R_ = Math.PI / 180;
  let WORLD = null, IDX = new Map(), CUR = null, collect = null;
  const TILES = new Map();                                       // "z/x/y" -> Image (loaded)
  // Web Mercator in world pixels at zoom 0 (the world is 512 px wide at z = 0, 512 * 2^z at z)
  const mx = lon => (lon + 180) / 360 * TS;
  const my = lat => { const s = Math.sin(clamp(lat, -85.05, 85.05) * D2R_); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TS; };
  const lonOf = x => x / TS * 360 - 180, latOf = y => R2D * Math.atan(Math.sinh(Math.PI * (1 - 2 * y / TS)));
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function index() {
    const add = (k, v) => { const n = norm(k); if (n && !IDX.has(n)) IDX.set(n, v); };
    const mainBox = rs => { let best = null, area = -1; for (const r of rs) { if (!Array.isArray(r)) continue; let a = 0; for (let i = 0; i < r.length; i++) { const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % r.length]; a += x0 * y1 - x1 * y0; }
        if (Math.abs(a) > area) { area = Math.abs(a); best = r; } } if (!best) return null; const xs = best.map(q => q[0]), ys = best.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
    for (const c of WORLD.countries) { const v = { kind: 'country', ...c, all: c.box, box: mainBox(c.rings) || c.box }; add(c.iso, v); add(c.name, v); add(c.long, v); }
    for (const s of WORLD.states) { const v = { kind: 'state', ...s }; add(s.name, v); if (s.of === 'USA' && s.code) add('US-' + s.code, v); }
    for (const c of WORLD.cities.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0))) add(c.name, { kind: 'city', ...c, box: [c.c[0], c.c[1], c.c[0], c.c[1]] });
    // continents and big regions: the union of their countries
    const groups = {}; for (const c of WORLD.countries) { if (c.cont) (groups[c.cont] = groups[c.cont] || []).push(c); if (c.region) (groups[c.region] = groups[c.region] || []).push(c); }
    for (const [k, cs] of Object.entries(groups)) { const main = cs.filter(c => (c.pop || 0) > 0);
      const bx = main.reduce((b, c) => [Math.min(b[0], c.box[0]), Math.min(b[1], c.box[1]), Math.max(b[2], c.box[2]), Math.max(b[3], c.box[3])], [180, 90, -180, -90]);
      if (k === 'Europe') { bx[0] = -25; bx[2] = 45; bx[1] = 34; bx[3] = 71; }          // without the overseas bits and Russia's far east
      if (k === 'Oceania') { bx[0] = 110; bx[2] = 180; }
      add(k, { kind: 'group', name: k, c: [(bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2], box: bx, members: cs }); }
  }
  function find(q) {
    if (Array.isArray(q)) return { kind: 'point', c: q, box: [q[0], q[1], q[0], q[1]] };
    const v = IDX.get(norm(q)); if (!v) throw new Error('map: no place called ' + q);
    return v;
  }
  // ── the camera ──────────────────────────────────────────────────────────────────────────────────────────────────────
  // a view is { lon, lat, z, rot (degrees), cy (0..1, where the centre sits on screen, default 0.42 = above the caption band) }
  function fit(q, pad = 0.14, o = {}) {
    const b = Array.isArray(q) && q.length === 4 ? q : find(q).box;
    const x0 = mx(b[0]), x1 = mx(b[2]), y0 = my(b[3]), y1 = my(b[1]);
    const aw = W * (1 - 2 * pad), ah = H * (o.h ?? 0.56) * (1 - pad);       // the free area: the caption band and the top stay clear
    const span = Math.max((x1 - x0) / aw, (y1 - y0) / ah, 1e-6);
    return { lon: lonOf((x0 + x1) / 2), lat: latOf((y0 + y1) / 2), z: clamp(Math.log2(1 / span), 0, 9.5), cy: o.cy ?? 0.42 };
  }
  // the map-app flight between two views (van Wijk & Nuij: zoom out while panning, then in; rho 1.4), eased like the reference
  function flyP(A, B, u, rho = 1.4) {
    const ux0 = mx(A.lon), uy0 = my(A.lat), w0 = W / Math.pow(2, A.z), ux1 = mx(B.lon), uy1 = my(B.lat), w1 = W / Math.pow(2, B.z);
    const dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, r2 = rho * rho;
    let x, y, w;
    if (d2 < 1e-9) { const S = Math.log(w1 / w0) / rho; w = w0 * Math.exp(rho * u * S); x = ux0; y = uy0; }
    else { const d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + r2 * r2 * d2) / (2 * w0 * r2 * d1), b1 = (w1 * w1 - w0 * w0 - r2 * r2 * d2) / (2 * w1 * r2 * d1),
        r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), S = (r1 - r0) / rho, s = u * S,
        coshr0 = Math.cosh(r0), uu = w0 / (r2 * d1) * (coshr0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
      x = ux0 + uu * dx; y = uy0 + uu * dy; w = w0 * coshr0 / Math.cosh(rho * s + r0); }
    return { lon: lonOf(x), lat: latOf(y), z: Math.log2(W / w), rot: lerp(A.rot || 0, B.rot || 0, u), cy: lerp(A.cy ?? 0.42, B.cy ?? 0.42, u) };
  }
  const viewOf = k => k.at != null ? { ...fit(k.at, k.pad ?? 0.14, k), ...(k.z != null ? { z: k.z } : {}), rot: k.rot || 0 } : { lon: k.lon, lat: k.lat, z: k.z, rot: k.rot || 0, cy: k.cy ?? 0.42 };
  // cam(t, keys): the camera of this moment. Each key { t, at | lon/lat/z, d (flight length, default 1.1 s), push (zoom per s while
  // held, default 0.035: nothing ever freezes), rot } is REACHED at its t; the flight to it starts d earlier.
  function cam(t, keys) {
    const K = keys.map(k => ({ ...k, v: viewOf(k) }));
    let i = K.findIndex(k => k.t > t); if (i < 0) i = K.length;
    const prev = K[Math.max(0, i - 1)], next = K[i];
    const held = (k, dt) => ({ ...k.v, z: k.v.z + (k.push ?? 0.035) * Math.max(0, dt) });
    if (!next || i === 0) return held(next && i === 0 ? next : prev, i === 0 ? 0 : t - prev.t);
    const d = next.d ?? 1.1, a = next.t - d;
    if (t < a) return held(prev, t - prev.t);
    const from = held(prev, a - prev.t), u = glide(clamp((t - a) / d));
    return flyP(from, next.v, u, next.rho ?? 1.4);
  }
  // ── drawing helpers: world -> screen under the current view ───────────────────────────────────────────────────────────
  function setView(v) {
    const sc = Math.pow(2, v.z), cx = mx(v.lon), cy = my(v.lat), ox = W / 2, oy = H * (v.cy ?? 0.42), r = (v.rot || 0) * D2R_, c = Math.cos(r), s = Math.sin(r);
    CUR = { v, sc, cx, cy, ox, oy, c, s };
  }
  function xy(lon, lat) {
    const V = CUR; let dx = (mx(lon) - V.cx); if (dx > TS / 2) dx -= TS; if (dx < -TS / 2) dx += TS;
    dx *= V.sc; const dy = (my(lat) - V.cy) * V.sc;
    return [V.ox + dx * V.c - dy * V.s, V.oy + dx * V.s + dy * V.c];
  }
  const at = q => { const f = find(q); return xy(f.lx != null && f.kind === 'country' ? f.lx : f.c[0], f.ly != null && f.kind === 'country' ? f.ly : f.c[1]); };
  function tile(z, x, y) {
    const n = 1 << z; x = ((x % n) + n) % n; if (y < 0 || y >= n) return null;
    const key = z + '/' + x + '/' + y; if (collect) collect.add(key);
    return TILES.get(key) || null;
  }
  // view(g, v): the satellite map. Tiles one zoom above the view's (downsampled, crisp); a tile that is not loaded falls back to
  // its loaded parent, so a frame is never blank.
  function view(g, v, o = {}) {
    v = { ...v, z: clamp(v.z, Math.log2(H / TS) + 0.02, o.zmax ?? ZMAX + 1.2) };   // covers the frame's height; never past the sharpest tiles
    { const sc = Math.pow(2, v.z), oy = H * (v.cy ?? 0.42), y = clamp(my(v.lat), oy / sc, TS - (H - oy) / sc); v.lat = latOf(y); }   // never past the poles
    setView(v);
    const V = CUR, tz = clamp(Math.ceil(v.z + 0.25), 0, ZMAX), n = 1 << tz, tw = TS / n;     // a tile's size in z0 world px
    g.save(); g.fillStyle = o.ocean || '#0B2447'; g.fillRect(0, 0, W, H);
    g.translate(V.ox, V.oy); g.rotate((v.rot || 0) * D2R_); g.scale(V.sc, V.sc); g.translate(-V.cx, -V.cy);
    if (o.grade !== false) g.filter = `saturate(${o.sat ?? 1.08}) contrast(${o.contrast ?? 1.06}) brightness(${o.bright ?? 1})`;
    const half = Math.hypot(W, H) / 2 / V.sc;                                                    // what the screen covers, in z0 px
    const x0 = Math.floor((V.cx - half) / tw), x1 = Math.floor((V.cx + half) / tw), y0 = Math.max(0, Math.floor((V.cy - half) / tw)), y1 = Math.min(n - 1, Math.floor((V.cy + half) / tw));
    const ov = 0.6 / V.sc;                                                                         // a hair of overlap hides tile seams
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      let im = tile(tz, tx, ty);
      if (im) { g.drawImage(im, tx * tw - ov, ty * tw - ov, tw + 2 * ov, tw + 2 * ov); continue; }
      for (let pz = tz - 1; pz >= 0; pz--) { const f = 1 << (tz - pz), px = Math.floor(tx / f), py = Math.floor(ty / f), pim = tile(pz, px, py);
        if (pim) { const sx = ((tx % f) + f) % f * TS / f, sy = (ty % f) * TS / f; g.drawImage(pim, sx, sy, TS / f, TS / f, tx * tw - ov, ty * tw - ov, tw + 2 * ov, tw + 2 * ov); break; } }
    }
    g.filter = 'none'; g.restore();
    if (o.darken) { g.fillStyle = `rgba(0,0,0,${o.darken})`; g.fillRect(0, 0, W, H); }
    if (o.vignette !== false) { const gr = g.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,10,30,${o.vignette ?? 0.28})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    return V;
  }
  // a path of rings (lon/lat) in screen space; holes cut out (even-odd)
  function ringPath(g, rings, close = true) {
    const V = CUR;
    for (const r of rings) { const pts = Array.isArray(r) ? r : r.hole; if (!pts.length) continue;
      let [x0, y0] = xy(pts[0][0], pts[0][1]), lon0 = pts[0][0], ux = 0;           // later points follow the first without jumping
      g.moveTo(x0, y0);
      for (let i = 1; i < pts.length; i++) { let dl = pts[i][0] - pts[i - 1][0]; if (dl > 180) dl -= 360; if (dl < -180) dl += 360; ux += dl;
        const dx = (mx(lon0 + ux) - mx(lon0)) * V.sc, dy = (my(pts[i][1]) - my(pts[0][1])) * V.sc;
        g.lineTo(x0 + dx * V.c - dy * V.s, y0 + dx * V.s + dy * V.c); }
      if (close) g.closePath(); }
  }
  const ringsOf = q => { const list = Array.isArray(q) && typeof q[0] !== 'number' ? q : [q]; const out = [];
    for (const k of list) { const f = find(k); if (f.members) f.members.forEach(m => out.push(...m.rings)); else if (f.rings) out.push(...f.rings); } return out; };
  // dark(g, v, o): the dark vector map (data moments): flat land on a near-black sea, thin borders, no tiles
  function dark(g, v, o = {}) {
    setView(v); g.save(); g.fillStyle = o.ocean || '#17181D'; g.fillRect(0, 0, W, H);
    g.beginPath(); for (const c of WORLD.countries) ringPath(g, c.rings); g.fillStyle = o.land || '#2B2D33'; g.fill('evenodd');
    if (o.border !== false) { g.strokeStyle = o.border || 'rgba(255,255,255,0.10)'; g.lineWidth = o.borderW || 2; g.stroke(); }
    g.restore(); return CUR;
  }
  // region(g, q, o): light up a country, state, continent or a list of them. o.fill, o.alpha, o.edge (outline colour), o.glow (edge glow
  // colour), o.lift (px: a raised slab with a darker side, like a piece lifted off the map), o.p (0..1 grow-in: the fill sweeps up
  // and the edge draws), o.dim (darken everything else, 0..1), o.pattern ('stripes'), o.inner (inner shadow)
  let FILL = null;
  let LAYER = null; const layer = () => { if (!LAYER) { LAYER = document.createElement('canvas'); LAYER.width = W; LAYER.height = H; } const lg = LAYER.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, W, H); return LAYER; };
  function region(g, q, o = {}) {
    const rings = ringsOf(q), p = o.p ?? 1; if (p <= 0) return;
    const path = () => { g.beginPath(); ringPath(g, rings); };
    g.save();
    if (o.dim) { g.beginPath(); g.rect(0, 0, W, H); ringPath(g, rings); g.fillStyle = `rgba(0,0,0,${o.dim * p})`; g.fill('evenodd'); }
    const lift = (o.lift || 0) * glide(p);
    if (lift) { g.save(); g.translate(0, lift); path(); g.fillStyle = o.side || shadeOf(o.fill || '#FF7A1A', 1.6); g.fill('evenodd'); g.restore();
      g.save(); g.translate(lift * 0.4, lift * 2.2); path(); g.filter = 'blur(14px)'; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill('evenodd'); g.restore(); }
    // the outline: stroked on a layer, then everything inside the shape is cut away, so only the OUTER edge of a group is left
    if (o.edge !== false) { const L = layer(), lg = L.getContext('2d'); lg.beginPath(); ringPath(lg, rings); lg.strokeStyle = o.edge || 'rgba(255,255,255,0.9)'; lg.lineWidth = (o.edgeW ?? 3.5) * 2; lg.lineJoin = 'round'; lg.stroke();
      lg.globalCompositeOperation = 'destination-out'; lg.fill('evenodd'); lg.lineWidth = 1.6; lg.stroke(); lg.globalCompositeOperation = 'source-over';
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(p * 1.4); g.drawImage(L, 0, 0); g.restore(); }
    if (o.glow) { g.save(); path(); g.shadowColor = o.glow; g.shadowBlur = o.glowR ?? 28; g.strokeStyle = o.glow; g.lineWidth = o.glowW ?? 6; g.globalAlpha = p; g.stroke(); g.restore(); }
    // the fill goes on a layer at full strength first (a hairline stroke closes the seams between neighbours), then onto the map
    if (o.fill !== false) { if (!FILL) { FILL = document.createElement('canvas'); FILL.width = W; FILL.height = H; }
      const fg = FILL.getContext('2d'); fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, W, H); fg.beginPath(); ringPath(fg, rings);
      fg.fillStyle = fg.strokeStyle = o.fill || '#FF7A1A'; fg.fill('evenodd'); fg.lineWidth = 1.6; fg.lineJoin = 'round'; fg.stroke();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = (o.alpha ?? 0.82) * clamp(p * 1.6); g.drawImage(FILL, 0, 0); g.restore(); }
    g.globalAlpha = (o.alpha ?? 0.82) * clamp(p * 1.6);
    // inner shadow cast from OUTSIDE the shape, so borders shared inside a group (Africa's countries) stay invisible
    if (o.inner !== false && o.fill !== false) { g.save(); path(); g.clip('evenodd'); g.globalAlpha = 0.5 * clamp(p * 1.6); g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 30;
      g.beginPath(); g.rect(-W, -H, W * 3, H * 3); ringPath(g, rings); g.fillStyle = '#000'; g.fill('evenodd'); g.restore(); }
    if (o.pattern === 'dots') { g.save(); path(); g.clip('evenodd'); g.globalAlpha = 0.35; g.fillStyle = '#FFFFFF'; for (let y = 0; y < H; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < W; x += 22) { ell(g, x, y, 3.2, 3.2); g.fill(); } g.restore(); }
    if (o.pattern === 'stripes' || o.pattern === 'hatch') { g.save(); path(); g.clip('evenodd'); g.globalAlpha = 0.25; g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; for (let x = -H; x < W + H; x += 26) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); } g.restore(); }
    if (o.inside) { g.globalAlpha = (o.insideA ?? 0.35) * clamp(p * 1.4); path(); g.strokeStyle = o.inside; g.lineWidth = o.insideW ?? 1.5; g.lineJoin = 'round'; g.stroke(); }   /* the borders inside a group, faint */
    g.restore();
    const b = rings.length ? find(Array.isArray(q) && typeof q[0] !== 'number' ? q[0] : q) : null;
    if (b && b.box) { const [ax, ay] = xy(b.box[0], b.box[3]), [bx, by] = xy(b.box[2], b.box[1]); mark(g, o.mark || 'hero', Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), 'region ' + (b.name || '')); }
  }
  function borders(g, o = {}) {
    g.save(); g.beginPath(); for (const c of (o.of ? WORLD.states.filter(s => s.of === o.of) : WORLD.countries)) ringPath(g, c.rings);
    g.strokeStyle = o.col || '#FFFFFF'; g.globalAlpha = o.a ?? 0.35; g.lineWidth = o.w ?? 2; g.lineJoin = 'round'; g.stroke(); g.restore();
  }
  const coast = (g, o = {}) => borders(g, { col: o.col || '#E8F6FF', a: o.a ?? 0.5, w: o.w ?? 2.2 });
  function rivers(g, o = {}) { g.save(); g.strokeStyle = o.col || '#6FC3FF'; g.globalAlpha = o.a ?? 0.7; g.lineWidth = o.w ?? 2.4; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); for (const r of WORLD.rivers) for (const l of r.lines) ringPath(g, [l], false); g.stroke(); g.restore(); }
  function lakes(g, o = {}) { g.save(); g.beginPath(); for (const l of WORLD.lakes) ringPath(g, l.rings); g.fillStyle = o.col || '#2E6FA8'; g.globalAlpha = o.a ?? 0.9; g.fill('evenodd'); g.restore(); }
  // route(g, pts, p, o): a line that draws itself along the places (p 0..1). o.great: long hops follow the globe's great circle;
  // o.col, o.w, o.glow (a soft wide halo under it), o.dash, o.dot (a moving dot at the tip), o.head ('arrow'), o.done (a faded trail)
  function routePts(pts, great) {
    const P = pts.map(q => typeof q === 'string' ? find(q).c : q), out = [];
    for (let i = 0; i < P.length - 1; i++) { const [a, b] = [P[i], P[i + 1]];
      const n = great ? 48 : 12; for (let k = 0; k < n; k++) { const u = k / n;
        if (great) { const la1 = a[1] * D2R_, lo1 = a[0] * D2R_, la2 = b[1] * D2R_, lo2 = b[0] * D2R_;
          const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2)) || 1e-9;
          const A = Math.sin((1 - u) * d) / Math.sin(d), B = Math.sin(u * d) / Math.sin(d);
          const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2), y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2), z = A * Math.sin(la1) + B * Math.sin(la2);
          out.push([Math.atan2(y, x) * R2D, Math.atan2(z, Math.hypot(x, y)) * R2D]); }
        else out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); } }
    out.push(P[P.length - 1]); return out;
  }
  function route(g, pts, p, o = {}) {
    if (p <= 0) return null;
    // straight hops bend smoothly through their waypoints; great-circle hops are already dense
    const S = (o.great ? routePts(pts, true) : pts.map(q => typeof q === 'string' ? find(q).c : q)).map(q => xy(q[0], q[1])), NS = o.great ? 6 : 40;
    // a smooth curve through the points (Catmull-Rom), then cut at p of its length
    const C = []; for (let i = 0; i < S.length - 1; i++) { const p0 = S[i - 1] || S[i], p1 = S[i], p2 = S[i + 1], p3 = S[i + 2] || p2;
      for (let k = 0; k < NS; k++) { const u = k / NS, u2 = u * u, u3 = u2 * u;
        C.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); } }
    C.push(S[S.length - 1]);
    const L = [0]; for (let i = 1; i < C.length; i++) L.push(L[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
    const end = L[L.length - 1] * clamp(p); let tip = C[0], ang = 0;
    const trace = () => { g.beginPath(); g.moveTo(C[0][0], C[0][1]); for (let i = 1; i < C.length; i++) { if (L[i] >= end) { const f = (end - L[i - 1]) / (L[i] - L[i - 1] || 1);
        tip = [lerp(C[i - 1][0], C[i][0], f), lerp(C[i - 1][1], C[i][1], f)]; ang = Math.atan2(C[i][1] - C[i - 1][1], C[i][0] - C[i - 1][0]); g.lineTo(tip[0], tip[1]); return; } g.lineTo(C[i][0], C[i][1]); }
      tip = C[C.length - 1]; };
    const w = o.w ?? 11, col = o.col || '#FFD60A';
    g.save(); g.lineCap = g.lineJoin = 'round';
    if (o.glow !== false) { trace(); g.strokeStyle = o.glow || col; g.globalAlpha = 0.35; g.lineWidth = w * 2.6; g.filter = 'blur(6px)'; g.stroke(); g.filter = 'none'; g.globalAlpha = 1; }
    if (o.edge !== false) { trace(); g.strokeStyle = o.edge || 'rgba(0,0,0,0.35)'; g.lineWidth = w + 5; g.stroke(); }
    trace(); g.strokeStyle = col; g.lineWidth = w; if (o.dash) g.setLineDash(o.dash === true ? [w * 2.2, w * 1.8] : o.dash); g.stroke(); g.setLineDash([]);
    if (o.head === 'arrow' && p > 0.02) { g.translate(tip[0], tip[1]); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(w * 2.4, 0); g.lineTo(-w * 1.2, -w * 1.7); g.lineTo(-w * 0.5, 0); g.lineTo(-w * 1.2, w * 1.7); g.closePath(); g.fill(); g.setTransform(1, 0, 0, 1, 0, 0); }
    else if (o.dot !== false && p < 1) { g.fillStyle = '#FFFFFF'; ell(g, tip[0], tip[1], w * 1.05, w * 1.05); g.fill(); g.fillStyle = col; ell(g, tip[0], tip[1], w * 0.6, w * 0.6); g.fill(); }
    g.restore(); return tip;
  }
  // pin(g, place, o): a round (or hex) badge standing on its place with a short stem and a soft shadow; o.draw paints its face
  // (a bust, an icon); o.k (0..1 or an ENTER state) pops it in; o.label writes a small name tag under it
  function pin(g, q, o = {}) {
    const [x, y] = Array.isArray(q) ? xy(q[0], q[1]) : at(q), r = (o.s || 78), k = o.k == null ? 1 : typeof o.k === 'number' ? o.k : o.k.sc;
    if (k <= 0.01) return [x, y];
    const lift = o.stem ?? r * 0.55, cy = y - lift - r;
    g.save(); g.translate(x, y); g.scale(k, k); g.translate(-x, -y);
    g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, x, y + 4, r * 0.38, r * 0.13); g.fill();
    g.fillStyle = o.ring || '#FFFFFF'; g.beginPath(); g.moveTo(x - r * 0.3, cy + r * 0.8); g.lineTo(x, y); g.lineTo(x + r * 0.3, cy + r * 0.8); g.closePath(); g.fill();
    const shape = gg => { if (o.shape === 'hex') { gg.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; gg.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r); } gg.closePath(); } else ell(gg, x, cy, r, r); };
    g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.fillStyle = o.ring || '#FFFFFF'; shape(g); g.fill(); g.restore();
    g.save(); const ir = r * 0.86; if (o.shape === 'hex') { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * ir, cy + Math.sin(a) * ir); } g.closePath(); } else ell(g, x, cy, ir, ir);
    g.clip(); g.fillStyle = o.bg || '#2B2F4A'; g.fillRect(x - r, cy - r, 2 * r, 2 * r); if (o.draw) o.draw(g, x, cy, ir); g.restore();
    if (o.label) { g.font = `${Math.round(r * 0.42)}px FlatBold, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top'; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(o.label, x, y + 12); g.fillStyle = '#FFFFFF'; g.fillText(o.label, x, y + 12); }
    g.restore(); mark(g, o.mark || 'device', x - r, cy - r, x + r, y, 'pin');
    return [x, cy];
  }
  // label(g, text, place, o): a place name written ON the map (white heavy type with a soft dark halo), centred on the place
  function label(g, text, q, o = {}) {
    const [x, y] = q == null ? at(text) : Array.isArray(q) && q.length === 2 && typeof q[0] === 'number' && o.screen ? q : Array.isArray(q) ? xy(q[0], q[1]) : at(q);
    const k = o.k == null ? 1 : typeof o.k === 'number' ? o.k : o.k.sc; if (k <= 0.01) return;
    const size = o.size || 72; g.save(); g.translate(x + (o.dx || 0), y + (o.dy || 0)); g.scale(k, k);
    g.font = `${size}px ${o.font || 'FlatHeavy'}, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = size * 0.35; g.shadowOffsetY = size * 0.06; g.fillStyle = o.col || '#FFFFFF'; g.fillText(text, 0, 0);
    g.restore(); mark(g, 'text', x - size * text.length * 0.3, y - size * 0.6, x + size * text.length * 0.3, y + size * 0.6, 'label');
  }
  // ── the map style's devices: flags, shields, stickers, scattered icons, rings, meridians, meshes, the map card ─────────────
  const K = k => k == null ? 1 : typeof k === 'number' ? k : k.sc;
  const rnd = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // flag(g, iso, x, y, w, h): a country's flag drawn in code (simple, recognisable; unknown ones get a plain colour)
  const STRIPES = {   // [direction, colours] equal stripes; the special marks are drawn in flag()
    FRA: ['v', '#0055A4', '#FFFFFF', '#EF4135'], ITA: ['v', '#009246', '#FFFFFF', '#CE2B37'], IRL: ['v', '#169B62', '#FFFFFF', '#FF883E'], BEL: ['v', '#000000', '#FDDA24', '#EF3340'],
    ROU: ['v', '#002B7F', '#FCD116', '#CE1126'], NGA: ['v', '#008751', '#FFFFFF', '#008751'], MEX: ['v', '#006847', '#FFFFFF', '#CE1126'], PER: ['v', '#D91023', '#FFFFFF', '#D91023'],
    TCD: ['v', '#002664', '#FECB00', '#C60C30'], MLI: ['v', '#14B53A', '#FCD116', '#CE1126'], GIN: ['v', '#CE1126', '#FCD116', '#009460'], CIV: ['v', '#F77F00', '#FFFFFF', '#009E60'],
    DEU: ['h', '#000000', '#DD0000', '#FFCE00'], RUS: ['h', '#FFFFFF', '#0039A6', '#D52B1E'], NLD: ['h', '#AE1C28', '#FFFFFF', '#21468B'], AUT: ['h', '#ED2939', '#FFFFFF', '#ED2939'],
    HUN: ['h', '#CE2939', '#FFFFFF', '#477050'], BGR: ['h', '#FFFFFF', '#00966E', '#D62612'], EST: ['h', '#0072CE', '#000000', '#FFFFFF'], LTU: ['h', '#FDB913', '#006A44', '#C1272D'],
    UKR: ['h', '#0057B7', '#FFD700'], POL: ['h', '#FFFFFF', '#DC143C'], IDN: ['h', '#FF0000', '#FFFFFF'], MCO: ['h', '#CE1126', '#FFFFFF'], YEM: ['h', '#CE1126', '#FFFFFF', '#000000'],
    EGY: ['h', '#CE1126', '#FFFFFF', '#000000'], IRN: ['h', '#239F40', '#FFFFFF', '#DA0000'], IND: ['h', '#FF9933', '#FFFFFF', '#138808'], ARM: ['h', '#D90012', '#0033A0', '#F2A800'],
    SLE: ['h', '#1EB53A', '#FFFFFF', '#0072C6'], GAB: ['h', '#009E60', '#FCD116', '#3A75C4'], LVA: ['h', '#9E3039', '#9E3039', '#FFFFFF', '#9E3039', '#9E3039'], IRQ: ['h', '#CE1126', '#FFFFFF', '#000000'],
    SYR: ['h', '#CE1126', '#FFFFFF', '#000000'], ARG: ['h', '#74ACDF', '#FFFFFF', '#74ACDF'], ESP: ['h', '#AA151B', '#F1BF00', '#F1BF00', '#AA151B'], COL: ['h', '#FCD116', '#FCD116', '#003893', '#CE1126'],
    THA: ['h', '#A51931', '#F4F5F8', '#2D2A4A', '#2D2A4A', '#F4F5F8', '#A51931'], GHA: ['h', '#CE1126', '#FCD116', '#006B3F'], BOL: ['h', '#D52B1E', '#F9E300', '#007934'], SAU: ['h', '#006C35'], PAK: ['h', '#01411C'],
    VNM: ['h', '#DA251D'], CHN: ['h', '#EE1C25'], TUR: ['h', '#E30A17'], CHE: ['h', '#D52B1E'], JPN: ['h', '#FFFFFF'], CAN: ['v', '#D80621', '#FFFFFF', '#FFFFFF', '#D80621'], QAT: ['h', '#8A1538'],
    BRA: ['h', '#009C3B'], ISR: ['h', '#FFFFFF'], KOR: ['h', '#FFFFFF'], AUS: ['h', '#012169'], NZL: ['h', '#012169'], GBR: ['h', '#012169'], USA: ['h', '#FFFFFF'], CUB: ['h', '#002A8F', '#FFFFFF', '#002A8F', '#FFFFFF', '#002A8F'],
    GRC: ['h', '#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF'], SWE: ['h', '#006AA7'], NOR: ['h', '#BA0C2F'], DNK: ['h', '#C8102E'], FIN: ['h', '#FFFFFF'], ISL: ['h', '#02529C'],
    PRK: ['h', '#024FA2', '#FFFFFF', '#ED1C27', '#ED1C27', '#ED1C27', '#FFFFFF', '#024FA2'], KEN: ['h', '#000000', '#FFFFFF', '#BB0000', '#FFFFFF', '#006600'], ETH: ['h', '#078930', '#FCDD09', '#DA121A'], ZAF: ['h', '#007749'],
    PRT: ['v', '#006600', '#006600', '#FF0000', '#FF0000', '#FF0000'], AFG: ['v', '#000000', '#D32011', '#007A36'], MNG: ['v', '#C4272F', '#015197', '#C4272F'], PHL: ['h', '#0038A8', '#CE1126'], CHL: ['h', '#FFFFFF', '#D52B1E'],
  };
  function star(g, x, y, r, n = 5, rot = -Math.PI / 2, inner = 0.4) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
  function cross(g, x, y, w, h, col, t, cx = 0.36) { g.fillStyle = col; g.fillRect(x + w * cx - h * t / 2, y, h * t, h); g.fillRect(x, y + h / 2 - h * t / 2, w, h * t); }
  function flag(g, iso, x, y, w, h) {
    iso = (find(iso) || {}).iso || iso; const S = STRIPES[iso] || ['h', '#9AA3B5'];
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const cols = S.slice(1); cols.forEach((c, i) => { g.fillStyle = c; if (S[0] === 'v') g.fillRect(x + w * i / cols.length, y, w / cols.length + 1, h); else g.fillRect(x, y + h * i / cols.length, w, h / cols.length + 1); });
    const m = Math.min(w, h);
    if (iso === 'USA') { for (let i = 0; i < 13; i += 2) { g.fillStyle = '#B22234'; g.fillRect(x, y + h * i / 13, w, h / 13 + 0.5); }
      g.fillStyle = '#3C3B6E'; g.fillRect(x, y, w * 0.4, h * 7 / 13); g.fillStyle = '#FFFFFF'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { star(g, x + w * 0.4 * (c + 0.5 + (r % 2) * 0.25) / 6.3, y + h * 7 / 13 * (r + 0.6) / 5.2, h * 0.022); g.fill(); } }
    else if (iso === 'CHN') { g.fillStyle = '#FFDE00'; star(g, x + w * 0.17, y + h * 0.25, h * 0.15); g.fill(); [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]].forEach(([a, b]) => { star(g, x + w * a, y + h * b, h * 0.05); g.fill(); }); }
    else if (iso === 'VNM') { g.fillStyle = '#FFFF00'; star(g, x + w / 2, y + h / 2, h * 0.3); g.fill(); }
    else if (iso === 'JPN' || iso === 'KOR') { g.fillStyle = iso === 'KOR' ? '#CD2E3A' : '#BC002D'; ell(g, x + w / 2, y + h / 2, h * 0.3, h * 0.3); g.fill(); if (iso === 'KOR') { g.fillStyle = '#0047A0'; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI); g.fill(); } }
    else if (iso === 'TUR' || iso === 'PAK') { g.fillStyle = '#FFFFFF'; if (iso === 'PAK') g.fillRect(x, y, w * 0.25, h); const cx = x + w * (iso === 'PAK' ? 0.6 : 0.4), cy = y + h / 2; ell(g, cx, cy, h * 0.25, h * 0.25); g.fill(); g.fillStyle = S[1]; ell(g, cx + h * 0.06, cy, h * 0.2, h * 0.2); g.fill(); g.fillStyle = '#FFFFFF'; star(g, cx + h * 0.24, cy, h * 0.08); g.fill(); }
    else if (iso === 'CHE') cross(g, x + w / 2 - m * 0.3, y + h / 2 - m * 0.3, m * 0.6, m * 0.6, '#FFFFFF', 0.33, 0.5);
    else if (['SWE', 'NOR', 'DNK', 'FIN', 'ISL'].includes(iso)) { const c1 = { SWE: '#FECC00', NOR: '#FFFFFF', DNK: '#FFFFFF', FIN: '#002F6C', ISL: '#FFFFFF' }[iso]; cross(g, x, y, w, h, c1, iso === 'NOR' || iso === 'ISL' ? 0.27 : 0.22);
      if (iso === 'NOR' || iso === 'ISL') cross(g, x, y, w, h, iso === 'NOR' ? '#00205B' : '#DC1E35', 0.12); }
    else if (iso === 'GBR' || iso === 'AUS' || iso === 'NZL') { const ux = iso === 'GBR' ? w : w / 2, uy = iso === 'GBR' ? h : h / 2; g.save(); g.beginPath(); g.rect(x, y, ux, uy); g.clip();
      g.lineWidth = uy * 0.2; g.strokeStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux, y + uy); g.moveTo(x + ux, y); g.lineTo(x, y + uy); g.stroke(); g.lineWidth = uy * 0.07; g.strokeStyle = '#C8102E'; g.stroke();
      cross(g, x, y, ux, uy, '#FFFFFF', 0.33, 0.5); cross(g, x, y, ux, uy, '#C8102E', 0.2, 0.5); g.restore();
      if (iso !== 'GBR') { g.fillStyle = iso === 'NZL' ? '#C8102E' : '#FFFFFF'; [[0.75, 0.25], [0.65, 0.5], [0.85, 0.45], [0.75, 0.8]].forEach(([a, b]) => { star(g, x + w * a, y + h * b, h * 0.06); g.fill(); }); g.fillStyle = '#FFFFFF'; star(g, x + w * 0.25, y + h * 0.75, h * 0.11, 7); g.fill(); } }
    else if (iso === 'BRA') { g.fillStyle = '#FEDF00'; g.beginPath(); g.moveTo(x + w * 0.08, y + h / 2); g.lineTo(x + w / 2, y + h * 0.1); g.lineTo(x + w * 0.92, y + h / 2); g.lineTo(x + w / 2, y + h * 0.9); g.closePath(); g.fill(); g.fillStyle = '#002776'; ell(g, x + w / 2, y + h / 2, h * 0.24, h * 0.24); g.fill(); }
    else if (iso === 'ISR') { g.fillStyle = '#0038B8'; g.fillRect(x, y + h * 0.1, w, h * 0.13); g.fillRect(x, y + h * 0.77, w, h * 0.13); g.strokeStyle = '#0038B8'; g.lineWidth = h * 0.04; [0, Math.PI].forEach(r0 => { star(g, x + w / 2, y + h / 2, h * 0.2, 3, -Math.PI / 2 + r0, 1); g.stroke(); }); }
    else if (iso === 'CAN') { g.fillStyle = '#D80621'; const cx = x + w / 2, cy = y + h * 0.5, s = h * 0.32; star(g, cx, cy - s * 0.1, s, 11, -Math.PI / 2, 0.55); g.fill(); g.fillRect(cx - s * 0.06, cy, s * 0.12, s * 0.9); }
    else if (iso === 'QAT') { g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.3, y); for (let i = 0; i < 9; i++) { g.lineTo(x + w * 0.4, y + h * (i + 0.5) / 9); g.lineTo(x + w * 0.3, y + h * (i + 1) / 9); } g.lineTo(x, y + h); g.closePath(); g.fill(); }
    else if (iso === 'GRC') { g.fillStyle = '#0D5EAF'; g.fillRect(x, y, h * 5 / 9, h * 5 / 9); cross(g, x, y, h * 5 / 9, h * 5 / 9, '#FFFFFF', 0.2, 0.5); }
    else if (iso === 'CHL') { g.fillStyle = '#0039A6'; g.fillRect(x, y, w / 3, h / 2); g.fillStyle = '#FFFFFF'; star(g, x + w / 6, y + h / 4, h * 0.12); g.fill(); }
    else if (iso === 'CUB' || iso === 'PHL') { g.fillStyle = iso === 'PHL' ? '#FFFFFF' : '#CF142B'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + h * 0.87, y + h / 2); g.lineTo(x, y + h); g.closePath(); g.fill(); g.fillStyle = iso === 'PHL' ? '#FCD116' : '#FFFFFF'; star(g, x + h * 0.3, y + h / 2, h * 0.13); g.fill(); }
    else if (iso === 'ZAF') { g.fillStyle = '#FFFFFF'; g.fillRect(x, y, w, h * 0.33); g.fillRect(x, y + h * 0.67, w, h * 0.33); g.fillStyle = '#DE3831'; g.fillRect(x, y, w, h * 0.28); g.fillStyle = '#002395'; g.fillRect(x, y + h * 0.72, w, h * 0.28);
      g.fillStyle = '#007749'; g.beginPath(); g.moveTo(x, y + h * 0.12); g.lineTo(x + w * 0.44, y + h * 0.38); g.lineTo(x + w, y + h * 0.38); g.lineTo(x + w, y + h * 0.62); g.lineTo(x + w * 0.44, y + h * 0.62); g.lineTo(x, y + h * 0.88); g.closePath(); g.fill(); }
    else if (iso === 'IND') { g.strokeStyle = '#000080'; g.lineWidth = h * 0.02; ell(g, x + w / 2, y + h / 2, h * 0.12, h * 0.12); g.stroke(); }
    else if (iso === 'ARG') { g.fillStyle = '#F6B40E'; ell(g, x + w / 2, y + h / 2, h * 0.08, h * 0.08); g.fill(); }
    else if (iso === 'SAU') { g.fillStyle = '#FFFFFF'; g.fillRect(x + w * 0.25, y + h * 0.65, w * 0.5, h * 0.05); }
    g.restore();
  }
  // cloth(g, x, y, w, h, t): the soft travelling folds that make a flag fill look like fabric (light and dark bands)
  function cloth(g, x, y, w, h, t = 0, a = 0.22) {
    const gr = g.createLinearGradient(x, y, x + w, y + h * 0.3); for (let i = 0; i <= 12; i++) { const v = Math.sin(i * 1.3 + t * 2.4); gr.addColorStop(i / 12, v > 0 ? `rgba(255,255,255,${v * a})` : `rgba(0,0,0,${-v * a * 1.3})`); }
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  // flagFill(g, place, o): the country filled with its flag, cloth folds moving (o.t), white edge; o.p grows it in, o.iso picks the flag
  function flagFill(g, q, o = {}) {
    const rings = ringsOf(q), p = o.p ?? 1; if (p <= 0 || !rings.length) return; const f = find(Array.isArray(q) ? q[0] : q);
    const [ax, ay] = xy(f.box[0], f.box[3]), [bx, by] = xy(f.box[2], f.box[1]), x0 = Math.min(ax, bx), y0 = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay);
    const fw = Math.max(w, h * 1.5), fh = fw / 1.5, fx = x0 + w / 2 - fw / 2, fy = y0 + h / 2 - fh / 2;
    g.save(); g.globalAlpha = clamp(p * 1.6);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.beginPath(); ringPath(g, rings); g.fillStyle = '#FFFFFF'; g.fill('evenodd'); g.restore();
    g.beginPath(); ringPath(g, rings); g.clip('evenodd'); flag(g, o.iso || f.iso || q, fx, fy, fw, fh); if (o.cloth !== false) cloth(g, fx, fy, fw, fh, o.t || 0);
    g.restore();
    if (o.edge !== false) { g.save(); g.beginPath(); ringPath(g, rings); g.strokeStyle = o.edge || '#FFFFFF'; g.lineWidth = o.edgeW ?? 4; g.lineJoin = 'round'; g.globalAlpha = clamp(p * 1.6); g.stroke(); g.restore(); }
    mark(g, o.mark || 'hero', x0, y0, x0 + w, y0 + h, 'flag ' + (f.name || ''));
  }
  // icon(g, name, x, y, s, col): small flat glyphs for stickers and scattered markers (drawn in a -1..1 box)
  const ICONS = {
    car: g => { rr(g, -0.8, -0.1, 1.6, 0.55, 0.15); g.fill(); g.beginPath(); g.moveTo(-0.5, -0.1); g.lineTo(-0.3, -0.5); g.lineTo(0.35, -0.5); g.lineTo(0.55, -0.1); g.closePath(); g.fill(); ell(g, -0.45, 0.48, 0.2, 0.2); g.fill(); ell(g, 0.45, 0.48, 0.2, 0.2); g.fill(); },
    plane: g => { g.beginPath(); [[0, -1], [0.12, -0.85], [0.12, -0.25], [0.95, 0.2], [0.95, 0.38], [0.12, 0.12], [0.1, 0.62], [0.38, 0.85], [0.38, 0.98], [0, 0.88], [-0.38, 0.98], [-0.38, 0.85], [-0.1, 0.62], [-0.12, 0.12], [-0.95, 0.38], [-0.95, 0.2], [-0.12, -0.25], [-0.12, -0.85]].forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fill(); },
    ship: g => { g.beginPath(); g.moveTo(-0.95, 0.15); g.lineTo(0.95, 0.15); g.lineTo(0.65, 0.7); g.lineTo(-0.7, 0.7); g.closePath(); g.fill(); g.fillRect(-0.55, -0.25, 1.0, 0.35); g.fillRect(-0.25, -0.65, 0.35, 0.4); },
    train: g => { rr(g, -0.6, -0.85, 1.2, 1.4, 0.25); g.fill(); g.fillRect(-0.45, 0.65, 0.2, 0.3); g.fillRect(0.25, 0.65, 0.2, 0.3); },
    skull: g => { ell(g, 0, -0.15, 0.7, 0.62); g.fill(); g.fillRect(-0.38, 0.3, 0.76, 0.35); const c = g.fillStyle; g.fillStyle = 'rgba(0,0,0,0.6)'; ell(g, -0.28, -0.12, 0.18, 0.2); g.fill(); ell(g, 0.28, -0.12, 0.18, 0.2); g.fill(); g.fillRect(-0.05, 0.38, 0.1, 0.27); g.fillStyle = c;
      g.lineWidth = 0.18; g.lineCap = 'round'; g.strokeStyle = c; g.beginPath(); g.moveTo(-0.95, 0.55); g.lineTo(0.95, 1.0); g.moveTo(0.95, 0.55); g.lineTo(-0.95, 1.0); g.stroke(); },
    person: g => { ell(g, 0, -0.5, 0.32, 0.32); g.fill(); g.beginPath(); g.moveTo(-0.65, 0.9); g.quadraticCurveTo(-0.6, -0.05, 0, -0.05); g.quadraticCurveTo(0.6, -0.05, 0.65, 0.9); g.closePath(); g.fill(); },
    money: g => { g.font = '1.6px FlatHeavy, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 0.08); },
    oil: g => { g.beginPath(); g.moveTo(0, -0.95); g.bezierCurveTo(0.2, -0.5, 0.65, -0.05, 0.65, 0.35); g.arc(0, 0.35, 0.65, 0, Math.PI); g.bezierCurveTo(-0.65, -0.05, -0.2, -0.5, 0, -0.95); g.fill(); },
    factory: g => { g.beginPath(); [[-0.9, 0.8], [-0.9, -0.1], [-0.4, 0.2], [-0.4, -0.1], [0.1, 0.2], [0.1, -0.1], [0.5, 0.2], [0.5, -0.9], [0.85, -0.9], [0.85, 0.8]].forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fill(); },
    house: g => { g.beginPath(); [[0, -0.9], [0.9, -0.05], [0.65, -0.05], [0.65, 0.85], [-0.65, 0.85], [-0.65, -0.05], [-0.9, -0.05]].forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fill(); },
    warning: g => { g.beginPath(); g.moveTo(0, -0.95); g.lineTo(0.95, 0.75); g.lineTo(-0.95, 0.75); g.closePath(); g.fill(); const c = g.fillStyle; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(-0.08, -0.4, 0.16, 0.65); ell(g, 0, 0.5, 0.1, 0.1); g.fill(); g.fillStyle = c; },
    clock: g => { g.lineWidth = 0.2; g.strokeStyle = g.fillStyle; ell(g, 0, 0, 0.8, 0.8); g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -0.5); g.lineTo(0, 0); g.lineTo(0.35, 0.2); g.stroke(); },
    fist: g => { for (let i = 0; i < 4; i++) { rr(g, -0.62 + i * 0.31, -0.62 + Math.abs(i - 1.5) * 0.05, 0.3, 0.42, 0.14); g.fill(); } rr(g, -0.62, -0.32, 1.22, 0.62, 0.18); g.fill(); g.fillRect(-0.4, 0.25, 0.75, 0.7);
      const c = g.fillStyle; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(-0.62, -0.05); g.quadraticCurveTo(-0.1, 0.12, 0.25, -0.05); g.stroke(); g.fillStyle = c; },
    soldier: g => { ell(g, 0, -0.42, 0.3, 0.3); g.fill(); g.beginPath(); g.ellipse(0, -0.6, 0.42, 0.22, 0, Math.PI, 0); g.fill(); g.beginPath(); g.moveTo(-0.6, 0.9); g.quadraticCurveTo(-0.55, -0.05, 0, -0.05); g.quadraticCurveTo(0.55, -0.05, 0.6, 0.9); g.closePath(); g.fill(); },
    wheat: g => { g.lineWidth = 0.12; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(0, 0.95); g.lineTo(0, -0.9); g.stroke(); for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { ell(g, sd * 0.22, -0.6 + i * 0.35, 0.14, 0.24, sd * 0.5); g.fill(); } },
    bolt: g => { g.beginPath(); [[0.15, -1], [-0.55, 0.15], [-0.05, 0.15], [-0.2, 1], [0.55, -0.2], [0.05, -0.2]].forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fill(); },
    water: g => { g.beginPath(); g.moveTo(0, -0.95); g.bezierCurveTo(0.3, -0.4, 0.7, 0, 0.7, 0.3); g.arc(0, 0.3, 0.7, 0, Math.PI); g.bezierCurveTo(-0.7, 0, -0.3, -0.4, 0, -0.95); g.fill(); },
    tree: g => { g.beginPath(); g.moveTo(0, -0.95); g.lineTo(0.7, 0.45); g.lineTo(-0.7, 0.45); g.closePath(); g.fill(); g.fillRect(-0.12, 0.4, 0.24, 0.5); },
    mountain: g => { g.beginPath(); [[-0.95, 0.7], [-0.25, -0.6], [0.1, 0.0], [0.4, -0.35], [0.95, 0.7]].forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fill(); },
  };
  function icon(g, name, x, y, s, col = '#FFFFFF') { const f = ICONS[name]; if (!f) return; g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; f(g); g.restore(); }
  // sticker(g, x, y, o): a floating hex (or round) badge with an icon or a draw fn: o.icon, o.col (badge colour), o.s, o.k pop, o.glow
  function sticker(g, x, y, o = {}) {
    const k = K(o.k); if (k <= 0.01) return; const r = o.s || 70;
    g.save(); g.translate(x, y); g.scale(k, k); g.rotate((o.tilt || 0) * D2R_);
    const shape = R => { g.beginPath(); if (o.shape === 'round') ell(g, 0, 0, R, R); else { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + (o.flat ? 0 : Math.PI / 6); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); } g.closePath(); } };
    if (o.glow) { g.save(); g.shadowColor = o.glow === true ? (o.col || '#19C6E6') : o.glow; g.shadowBlur = r * 0.8; shape(r); g.fillStyle = o.col || '#19C6E6'; g.globalAlpha = 0.6; g.fill(); g.restore(); }
    g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 16; g.shadowOffsetY = 6; shape(r); g.fillStyle = o.ring || '#FFFFFF'; g.fill(); g.restore();
    shape(r * 0.86); g.fillStyle = o.col || '#19C6E6'; g.fill();
    g.save(); shape(r * 0.86); g.clip(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-r, -r, 2 * r, r * 0.9); g.restore();
    if (o.draw) { g.save(); shape(r * 0.86); g.clip(); o.draw(g, 0, 0, r * 0.86); g.restore(); } else if (o.icon) icon(g, o.icon, 0, 0, r * 0.5, o.iconCol || '#FFFFFF');
    g.restore(); mark(g, o.mark || 'device', x - r, y - r, x + r, y + r, 'sticker');
  }
  // scatter(g, place, n, draw, o): n spots spread evenly INSIDE a region (seeded, the same every frame); draw(g, x, y, i, k) with k the
  // pop of spot i (o.t, o.t0, o.stagger, o.seed, o.gap). Returns the spots in screen px.
  const SCAT = new Map();
  function scatter(g, q, n, draw, o = {}) {
    const f = find(Array.isArray(q) ? q[0] : q), rings = ringsOf(q); if (!rings.length) return [];
    const key = (o.seed || 7) + '|' + n + '|' + JSON.stringify(q); let pts = SCAT.get(key);
    if (!pts) { const R = rnd(o.seed || 7), c = document.createElement('canvas').getContext('2d'), saved = CUR;
      setView({ lon: f.c[0], lat: f.c[1], z: 0, cy: 0.5 }); c.beginPath(); ringPath(c, rings); pts = [];
      const [ax, ay] = xy(f.box[0], f.box[3]), [bx, by] = xy(f.box[2], f.box[1]), m = o.margin ?? 0.08, gap = (o.gap ?? 0.55) * Math.hypot(bx - ax, by - ay) / Math.sqrt(n * 2);
      for (let tries = 0; pts.length < n && tries < n * 600; tries++) { const px = lerp(ax, bx, m + R() * (1 - 2 * m)), py = lerp(ay, by, m + R() * (1 - 2 * m));
        if (c.isPointInPath(px, py, 'evenodd') && pts.every(p => Math.hypot(p[2] - px, p[3] - py) > gap)) pts.push([lonOf(CUR.cx + (px - CUR.ox) / CUR.sc), latOf(CUR.cy + (py - CUR.oy) / CUR.sc), px, py]); }
      CUR = saved; SCAT.set(key, pts); }
    const out = pts.map(([lon, lat], i) => { const [x, y] = xy(lon, lat); const u = o.t == null ? 1 : clamp((o.t - (o.t0 || 0) - i * (o.stagger ?? 0.08)) / 0.3);
      return [x, y, i, u > 0 ? glide(u) * (1 + 0.25 * Math.sin(Math.PI * u)) : 0]; });
    for (const [x, y, i, k] of out) if (k > 0.01) draw(g, x, y, i, k);
    return out;
  }
  // ring(g, place, r, p, o): a circle drawn round a place (o.col, o.w, o.dash); p sweeps it on
  function ring(g, q, r, p = 1, o = {}) { if (p <= 0) return; const [x, y] = Array.isArray(q) ? xy(q[0], q[1]) : at(q);
    g.save(); g.strokeStyle = o.col || '#FFE600'; g.lineWidth = o.w || 7; g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 8; if (o.dash) g.setLineDash(o.dash);
    g.beginPath(); g.arc(x, y, r * (0.9 + 0.1 * glide(clamp(p * 1.5))), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * glide(p)); g.stroke(); g.restore(); mark(g, 'device', x - r, y - r, x + r, y + r, 'ring'); }
  // meridian(g, lon, p, o): a dashed red-and-white line along a meridian (o.lat: along a parallel instead); p draws it on
  function meridian(g, v, p = 1, o = {}) { if (p <= 0) return; const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push(o.lat ? [lerp(-180, 180, u), v] : [v, lerp(84, -84, u)]); }
    const S = pts.map(q => xy(q[0], q[1])), n = Math.max(2, Math.round(S.length * glide(p))), w = o.w || 12;
    g.save(); g.lineCap = 'butt'; g.beginPath(); S.slice(0, n).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.strokeStyle = o.col || '#E3262E'; g.lineWidth = w + 6; g.stroke(); g.strokeStyle = o.dashCol || '#FFFFFF'; g.lineWidth = w * 0.45; g.setLineDash([w * 1.6, w * 1.4]); g.stroke(); g.restore(); }
  // mesh(g, places, p, o): glowing connection lines between places (each to its o.near nearest, great-circle arcs), drawn on by p
  function mesh(g, list, p = 1, o = {}) { if (p <= 0) return; const P = list.map(q => typeof q === 'string' ? find(q).c : q), done = new Set();
    P.forEach((a, i) => P.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).filter(d => d[1] !== i).sort((u, v) => u[0] - v[0]).slice(0, o.near || 3).forEach(([, j]) => {
      const key = Math.min(i, j) + '-' + Math.max(i, j); if (done.has(key)) return; done.add(key);
      route(g, [a, P[j]], clamp(p * 1.6 - (done.size % 7) * 0.08), { great: true, col: o.col || '#3FF2FF', w: o.w || 3, glow: o.glow || o.col || '#3FF2FF', edge: false, dot: false }); })); }
  // shield(g, x, y, num, o): a highway shield (o.kind 'interstate' red and blue, 'us' white, 'state' white oval), o.s height, o.k pop
  function shield(g, x, y, num, o = {}) {
    const k = K(o.k); if (k <= 0.01) return; const h = o.s || 90, w = h * (String(num).length > 2 ? 1.12 : 0.96), kind = o.kind || 'interstate';
    g.save(); g.translate(x, y); g.scale(k, k); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = h * 0.18; g.shadowOffsetY = h * 0.05;
    const path = s_ => { const W2 = w / 2 * s_, H2 = h / 2 * s_; g.beginPath();
      if (kind === 'state') { ell(g, 0, 0, W2, H2 * 0.95); return; }
      if (kind === 'us') { g.moveTo(-W2, -H2 * 0.75); g.quadraticCurveTo(-W2 * 0.5, -H2 * 0.95, -W2 * 0.3, -H2); g.lineTo(W2 * 0.3, -H2); g.quadraticCurveTo(W2 * 0.5, -H2 * 0.95, W2, -H2 * 0.75);
        g.bezierCurveTo(W2 * 0.95, H2 * 0.2, W2 * 0.6, H2 * 0.7, 0, H2); g.bezierCurveTo(-W2 * 0.6, H2 * 0.7, -W2 * 0.95, H2 * 0.2, -W2, -H2 * 0.75); g.closePath(); return; }
      g.moveTo(-W2, -H2 * 0.8); g.quadraticCurveTo(-W2 * 0.5, -H2 * 0.88, 0, -H2); g.quadraticCurveTo(W2 * 0.5, -H2 * 0.88, W2, -H2 * 0.8);
      g.bezierCurveTo(W2 * 1.02, H2 * 0.15, W2 * 0.7, H2 * 0.7, 0, H2); g.bezierCurveTo(-W2 * 0.7, H2 * 0.7, -W2 * 1.02, H2 * 0.15, -W2, -H2 * 0.8); g.closePath(); };
    path(1); g.fillStyle = kind === 'interstate' ? '#FFFFFF' : '#000000'; g.fill(); g.shadowColor = 'transparent';
    path(0.88); g.fillStyle = kind === 'interstate' ? '#003F87' : '#FFFFFF'; g.fill();
    if (kind === 'interstate') { g.save(); path(0.88); g.clip(); g.fillStyle = '#AF1E2D'; g.fillRect(-w, -h, w * 2, h * 0.8); g.fillStyle = '#FFFFFF'; g.fillRect(-w, -h * 0.2, w * 2, h * 0.04); g.restore();
      g.fillStyle = '#FFFFFF'; g.font = `${Math.round(h * 0.13)}px FlatHeavy, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('INTERSTATE', 0, -h * 0.31); }
    g.fillStyle = kind === 'interstate' ? '#FFFFFF' : '#000000'; g.font = `${Math.round(h * (String(num).length > 2 ? 0.42 : 0.52))}px FlatHeavy, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num), 0, kind === 'interstate' ? h * 0.15 : h * 0.02);
    g.restore(); mark(g, o.mark || 'device', x - w / 2, y - h / 2, x + w / 2, y + h / 2, 'shield');
  }
  // marker(g, place, o): the red teardrop map marker with a white dot, dropping in (o.k), o.col, o.s
  function marker(g, q, o = {}) { const k = K(o.k); if (k <= 0.01) return; const [x, y] = Array.isArray(q) ? xy(q[0], q[1]) : at(q), s = o.s || 60;
    g.save(); g.translate(x, y - (1 - Math.min(1, k)) * s * 1.2); g.scale(k, k); g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, 0, 2, s * 0.3, s * 0.1); g.fill();
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 12; g.fillStyle = o.col || '#E8242C'; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-s * 0.15, -s * 0.35, -s * 0.55, -s * 0.6, -s * 0.55, -s * 1.05);
    g.arc(0, -s * 1.05, s * 0.55, Math.PI, 0); g.bezierCurveTo(s * 0.55, -s * 0.6, s * 0.15, -s * 0.35, 0, 0); g.fill(); g.shadowColor = 'transparent'; g.fillStyle = '#FFFFFF'; ell(g, 0, -s * 1.05, s * 0.22, s * 0.22); g.fill();
    g.restore(); mark(g, 'device', x - s * 0.55, y - s * 1.6, x + s * 0.55, y, 'marker'); }
  // react(g, x, y, s, mood, k, t): a round yellow reaction face (shocked, scream, happy, sad, smug) that pops on the map
  function react(g, x, y, s, mood = 'shocked', k = 1, t = 0) { k = K(k); if (k <= 0.01) return; g.save(); g.translate(x, y); g.scale(k, k);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = s * 0.3; g.shadowOffsetY = s * 0.08; const gr = g.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s); gr.addColorStop(0, '#FFE873'); gr.addColorStop(1, '#F6A912');
    g.fillStyle = gr; ell(g, 0, 0, s, s); g.fill(); g.shadowColor = 'transparent';
    const ink = '#4A2A0A', wide = mood === 'shocked' || mood === 'scream', lid = lidOf(t, x) * (wide ? 0 : 1);
    for (const sd of [-1, 1]) { g.fillStyle = '#FFFFFF'; ell(g, sd * s * 0.32, -s * 0.18, s * 0.2, s * (wide ? 0.26 : 0.2) * (1 - lid)); g.fill(); g.fillStyle = ink; ell(g, sd * s * 0.3, -s * 0.13, s * 0.1, s * 0.12 * (1 - lid)); g.fill();
      g.strokeStyle = ink; g.lineWidth = s * 0.08; g.lineCap = 'round'; g.beginPath(); const by = -s * (wide ? 0.58 : 0.5), tw = mood === 'sad' ? -1 : mood === 'smug' ? 0.4 : 1; g.moveTo(sd * s * 0.16, by + (wide ? 0 : s * 0.04 * tw)); g.lineTo(sd * s * 0.46, by + (wide ? s * 0.06 : -s * 0.04 * tw)); g.stroke(); }
    g.fillStyle = ink; if (mood === 'scream') { ell(g, 0, s * 0.42, s * 0.2, s * 0.32); g.fill(); } else if (mood === 'shocked') { ell(g, 0, s * 0.42, s * 0.16, s * 0.2); g.fill(); }
    else { g.strokeStyle = ink; g.lineWidth = s * 0.09; g.beginPath(); if (mood === 'sad') g.arc(0, s * 0.62, s * 0.3, -Math.PI * 0.8, -Math.PI * 0.2); else g.arc(0, s * 0.18, s * 0.34, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
    if (mood === 'scream') { g.fillStyle = 'rgba(80,140,255,0.55)'; g.fillRect(-s * 0.6, -s * 0.95, s * 1.2, s * 0.35); }
    g.restore(); mark(g, 'device', x - s, y - s, x + s, y + s, 'react'); }
  // along(g, text, a, b, o): text laid along the direction from place a to place b (the tilted "2 years" beside a route), o.size, o.off (px off the line)
  function alongText(g, text, a, b, o = {}) { const k = K(o.k); if (k <= 0.01) return; const A = Array.isArray(a) ? xy(a[0], a[1]) : at(a), B = Array.isArray(b) ? xy(b[0], b[1]) : at(b);
    let ang = Math.atan2(B[1] - A[1], B[0] - A[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI; const x = (A[0] + B[0]) / 2, y = (A[1] + B[1]) / 2, size = o.size || 70;
    g.save(); g.translate(x - Math.sin(ang) * (o.off || 0), y + Math.cos(ang) * (o.off || 0)); g.rotate(ang); g.scale(k, k); g.font = `${size}px ${o.font || 'FlatHeavy'}, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = size * 0.3; g.shadowOffsetY = size * 0.05; g.fillStyle = o.col || '#FFFFFF'; g.fillText(text, 0, 0); g.restore(); mark(g, 'text', x - size * text.length * 0.3, y - size, x + size * text.length * 0.3, y + size, 'along'); }
  // sheet(g, drawMap, o): the map as a card lying on a blue grid desk; o.k (0 = full screen .. 1 = pulled back), o.s (card scale pulled
  // back), o.tilt (deg), o.pitch (0..0.3 perspective), o.desk / o.grid colours. drawMap(g2) paints the map as usual.
  let SHEET = null;
  function sheet(g, drawMap, o = {}) {
    const k = clamp(o.k ?? 1); if (k <= 0.001) return drawMap(g);
    if (!SHEET) { SHEET = document.createElement('canvas'); SHEET.width = W; SHEET.height = H; }
    const sg = SHEET.getContext('2d'); sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, W, H); drawMap(sg);
    const sc = lerp(1, o.s ?? 0.8, k), tilt = lerp(0, o.tilt ?? -5, k) * D2R_, pitch = lerp(0, o.pitch ?? 0.1, k);
    g.save(); g.fillStyle = o.desk || '#3D63E6'; g.fillRect(0, 0, W, H); g.translate(W / 2, H / 2); g.rotate(tilt); g.strokeStyle = o.grid || 'rgba(255,255,255,0.28)'; g.lineWidth = 2;
    const cell = 110 * sc; for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(i * cell * (1 - pitch), -H); g.lineTo(i * cell * (1 + pitch), H); g.stroke(); g.beginPath(); g.moveTo(-W * 1.5, i * cell); g.lineTo(W * 1.5, i * cell); g.stroke(); }
    const cw = W * sc, ch = H * sc, n = 96;
    g.shadowColor = 'rgba(0,0,30,0.5)'; g.shadowBlur = 50; g.shadowOffsetY = 24; g.fillStyle = '#000'; g.beginPath(); g.moveTo(-cw / 2 * (1 - pitch), -ch / 2); g.lineTo(cw / 2 * (1 - pitch), -ch / 2); g.lineTo(cw / 2 * (1 + pitch), ch / 2); g.lineTo(-cw / 2 * (1 + pitch), ch / 2); g.closePath(); g.fill(); g.shadowColor = 'transparent';
    for (let i = 0; i < n; i++) { const u = i / n, f = 1 - pitch + 2 * pitch * (u + 0.5 / n), wq = cw * f; g.drawImage(SHEET, 0, H * u, W, H / n + 0.5, -wq / 2, -ch / 2 + ch * u, wq, ch / n + 0.6); }
    g.restore();
  }
  // tint(g, o): the style's own sea colour: a teal wash over the satellite (oceans read teal, land keeps most of its colour); o.col, o.a
  function tint(g, o = {}) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = o.col || '#0C4652'; g.globalAlpha = o.a ?? 0.8; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'soft-light'; g.fillStyle = '#3FB8C0'; g.globalAlpha = (o.a ?? 0.8) * 0.3; g.fillRect(0, 0, W, H); g.restore(); }
  // tip(pts, p, o): where a route drawn to p ends, as [lon, lat] (the same curve route() draws), for a camera that rides the line:
  //   const at = MAP.tip(path, p); MAP.view(g, { lon: at[0], lat: at[1], z: 4.2 }); MAP.route(g, path, p);
  function tip(pts, p, o = {}) {
    const S = (o.great ? routePts(pts, true) : pts.map(q => typeof q === 'string' ? find(q).c : q)).map(q => [mx(q[0]), my(q[1])]), NS = o.great ? 6 : 40;
    const C = []; for (let i = 0; i < S.length - 1; i++) { const p0 = S[i - 1] || S[i], p1 = S[i], p2 = S[i + 1], p3 = S[i + 2] || p2;
      for (let k = 0; k < NS; k++) { const u = k / NS, u2 = u * u, u3 = u2 * u;
        C.push([0, 1].map(d => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3))); } }
    C.push(S[S.length - 1]);
    const L = [0]; for (let i = 1; i < C.length; i++) L.push(L[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
    const end = L[L.length - 1] * clamp(p); let i = 1; while (i < C.length - 1 && L[i] < end) i++;
    const f = clamp((end - L[i - 1]) / (L[i] - L[i - 1] || 1)), x = lerp(C[i - 1][0], C[i][0], f), y = lerp(C[i - 1][1], C[i][1], f);
    return [lonOf(x), latOf(y)];
  }
  // headline(g, lines, t, o): the typed headline: bold white words on black bars, a word appears as the voice says it (o.times: the
  // seconds each word lands, else every o.per s from 0). Mark key words *red* or +green+. o.y (centre, default 0.31 H), o.size.
  function headline(g, lines, t, o = {}) {
    const size = o.size || 50, lh = size * 1.32, y0 = (o.y ?? 0.31) * H - (lines.length - 1) * lh / 2; let n = 0;
    g.save(); g.font = `${size}px ${o.font || 'FlatHeavy'}, sans-serif`; g.textBaseline = 'middle';
    lines.forEach((line, li) => {
      const words = line.split(' ').map(w => ({ w: w.replace(/^[*+]|[*+]$/g, ''), col: /^\*.*\*$/.test(w) ? (o.hot || '#E0372D') : /^\+.*\+$/.test(w) ? (o.ok || '#3BBE5A') : '#FFFFFF' }));
      const sp = g.measureText(' ').width, full = words.reduce((a, w) => a + g.measureText(w.w).width, 0) + sp * (words.length - 1);
      let x = W / 2 - full / 2; const shown = [];
      for (const w of words) { const at = o.times ? o.times[n] : n * (o.per ?? 0.25); n++; if (t < at) break; shown.push({ ...w, x, k: clamp((t - at) / 0.12) }); x += g.measureText(w.w).width + sp; }
      if (!shown.length) return; const last = shown[shown.length - 1], right = last.x + g.measureText(last.w).width, y = y0 + li * lh, pad = size * 0.22;
      g.fillStyle = o.bar || '#000000'; g.fillRect(W / 2 - full / 2 - pad, y - lh / 2 + 2, right - (W / 2 - full / 2) + pad * 2, lh - 4);
      for (const w of shown) { g.globalAlpha = w.k; g.fillStyle = w.col; g.fillText(w.w, w.x, y + size * 0.04); g.globalAlpha = 1; }
      mark(g, 'text', W / 2 - full / 2 - pad, y - lh / 2, right + pad, y + lh / 2, 'headline');
    });
    g.restore();
  }
  // plate(g, text, x, y, o): a number tag on a tilted coloured plate ("28 years"), popping in (o.k); o.col, o.size, o.tilt (deg),
  // o.count: [from, to, p] counts the number up (o.fmt formats it)
  function plate(g, text, x, y, o = {}) {
    const k = K(o.k); if (k <= 0.01) return; const size = o.size || 64;
    if (o.count) { const [a, b, p] = o.count, v = lerp(a, b, glide(clamp(p))); text = o.fmt ? o.fmt(v) : String(Math.round(v)) + (text || ''); }
    g.save(); g.translate(x, y); g.rotate((o.tilt ?? -6) * D2R_); g.scale(k, k);
    g.font = `${size}px ${o.font || 'FlatHeavy'}, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + size * 0.6, h = size * 1.25;
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3; g.fillStyle = o.col || '#E0372D'; g.fillRect(-w / 2, -h / 2, w, h); g.shadowColor = 'transparent';
    g.fillStyle = o.txt || '#FFFFFF'; g.fillText(text, 0, size * 0.04);
    g.restore(); mark(g, 'text', x - size * text.length * 0.35, y - size, x + size * text.length * 0.35, y + size, 'plate');
  }
  // news(g, o): proof card: a torn strip of newspaper laid over the map (o.y centre, o.w width share), a made-up source line (o.source:
  // never a real outlet's name or logo), a serif headline (o.lines) with o.mark: the words highlighted in yellow marker. o.k slides it in.
  function news(g, o = {}) {
    const k = K(o.k); if (k <= 0.01) return; const w = W * (o.w ?? 1.06), lines = o.lines || [], size = o.size || 44, h = size * (lines.length * 1.25 + 2.2), x = W / 2, y = (o.y ?? 0.2) * H - (1 - k) * (H * 0.3);
    const R = rnd(o.seed || 11), edge = (y0, dir) => { const pts = []; for (let i = 0; i <= 40; i++) pts.push([x - w / 2 + w * i / 40, y0 + dir * (R() * 12 + (i % 2) * 6)]); return pts; };
    const top = edge(y - h / 2, -1), bot = edge(y + h / 2, 1).reverse();
    g.save(); g.translate(x, y); g.rotate((o.tilt ?? -1.5) * D2R_); g.translate(-x, -y);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 22; g.shadowOffsetY = 10; g.fillStyle = '#F4F1EA';
    g.beginPath(); [...top, ...bot].forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = 'rgba(120,100,70,0.08)'; for (let i = 0; i < 30; i++) { ell(g, x - w / 2 + R() * w, y - h / 2 + R() * h, 30 + R() * 60, 8 + R() * 20); g.fill(); }
    let cy = y - h / 2 + size * 1.0;
    if (o.source) { g.font = `${size * 0.62}px FlatHeavy, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.sourceCol || '#C8102E'; g.fillText(o.source, x, cy); cy += size * 1.1; }
    g.font = `${size}px Georgia, 'Times New Roman', serif`; g.textAlign = 'left';
    for (const line of lines) { const lw = g.measureText(line).width, lx = x - lw / 2;
      if (o.mark && line.includes(o.mark)) { const a = g.measureText(line.slice(0, line.indexOf(o.mark))).width, b = g.measureText(o.mark).width, p = clamp(o.markP ?? 1);
        g.fillStyle = 'rgba(255,196,0,0.85)'; g.fillRect(lx + a - 4, cy - size * 0.55, (b + 8) * glide(p), size * 1.05); }
      g.fillStyle = '#1A1A1A'; g.fillText(line, lx, cy); cy += size * 1.25; }
    g.restore(); mark(g, 'device', x - w / 2, y - h / 2, x + w / 2, y + h / 2, 'news');
  }
  // badge(g, place, o): the floating hexagon portrait badge that sits ON a place (no stem) and moves with the camera; o.draw paints the
  // portrait (a drawn bust, never a real face that did not agree), o.s radius, o.k pop
  function badge(g, q, o = {}) { const [x, y] = Array.isArray(q) ? xy(q[0], q[1]) : at(q); sticker(g, x, y - (o.up || 0), { s: o.s || 92, col: o.bg || '#2B2F4A', draw: o.draw, k: o.k, ring: o.ring || '#FFFFFF', mark: 'hero' }); return [x, y]; }
  // ── the whole channel's devices (SPEC 17-23): more stickers, the flat political map, leader tags, arrival pulses, vehicles on
  // routes, flow bands, callouts, the hand that holds a thing, charts, timelines, a globe, and the one finish (grade) ───────────
  const DK = 'rgba(0,0,0,0.38)';                                   // the dark shade inside an icon (same hue, darker)
  const inDark = (g, f) => { const c = g.fillStyle, s = g.strokeStyle; g.fillStyle = g.strokeStyle = DK; f(); g.fillStyle = c; g.strokeStyle = s; };
  Object.assign(ICONS, {
    bulb: g => { ell(g, 0, -0.28, 0.6, 0.6); g.fill(); g.fillRect(-0.3, 0.2, 0.6, 0.42); inDark(g, () => { g.fillRect(-0.3, 0.36, 0.6, 0.07); g.fillRect(-0.3, 0.5, 0.6, 0.07); }); rr(g, -0.17, 0.62, 0.34, 0.24, 0.08); g.fill(); },
    camera: g => { rr(g, -0.92, -0.42, 1.84, 1.2, 0.18); g.fill(); rr(g, -0.36, -0.66, 0.72, 0.32, 0.08); g.fill(); inDark(g, () => { ell(g, 0, 0.17, 0.4, 0.4); g.fill(); }); ell(g, 0, 0.17, 0.22, 0.22); g.fill(); },
    dam: g => { g.beginPath(); g.moveTo(-0.95, -0.62); g.lineTo(0.95, -0.62); g.lineTo(0.62, 0.86); g.lineTo(-0.62, 0.86); g.closePath(); g.fill(); inDark(g, () => { for (let i = 0; i < 3; i++) g.fillRect(-0.45 + i * 0.33, -0.25, 0.16, 0.95); }); },
    wave: g => { g.beginPath(); g.moveTo(-0.95, 0.86); g.lineTo(-0.95, 0.1); g.bezierCurveTo(-0.6, -0.9, 0.5, -1.0, 0.78, -0.25); g.bezierCurveTo(0.45, -0.5, 0.1, -0.35, 0.15, 0.0); g.bezierCurveTo(0.4, 0.15, 0.7, 0.2, 0.95, 0.12); g.lineTo(0.95, 0.86); g.closePath(); g.fill(); },
    fire: g => { g.beginPath(); g.moveTo(0, -0.95); g.bezierCurveTo(0.35, -0.5, 0.8, -0.2, 0.7, 0.35); g.bezierCurveTo(0.62, 0.8, 0.3, 0.95, 0, 0.95); g.bezierCurveTo(-0.3, 0.95, -0.7, 0.8, -0.7, 0.35);
      g.bezierCurveTo(-0.7, 0.0, -0.45, -0.2, -0.35, -0.45); g.bezierCurveTo(-0.2, -0.2, -0.1, -0.1, 0.0, -0.1); g.bezierCurveTo(0.0, -0.4, -0.1, -0.7, 0, -0.95); g.fill();
      const c = g.fillStyle; g.fillStyle = 'rgba(255,236,140,0.8)'; ell(g, 0, 0.52, 0.3, 0.36); g.fill(); g.fillStyle = c; },
    bag: g => { g.beginPath(); g.moveTo(-0.3, -0.55); g.lineTo(0.3, -0.55); g.bezierCurveTo(0.95, 0.0, 0.85, 0.95, 0, 0.95); g.bezierCurveTo(-0.85, 0.95, -0.95, 0.0, -0.3, -0.55); g.fill();
      g.beginPath(); g.moveTo(-0.28, -0.6); g.lineTo(-0.45, -0.95); g.lineTo(0.45, -0.95); g.lineTo(0.28, -0.6); g.closePath(); g.fill();
      inDark(g, () => { g.font = '0.95px FlatHeavy, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 0.32); }); },
    coin: g => { ell(g, 0, 0, 0.88, 0.88); g.fill(); inDark(g, () => { g.lineWidth = 0.1; ell(g, 0, 0, 0.66, 0.66); g.stroke(); g.font = '1.0px FlatHeavy, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 0.06); }); },
    lock: g => { rr(g, -0.7, -0.1, 1.4, 1.0, 0.16); g.fill(); g.lineWidth = 0.22; g.strokeStyle = g.fillStyle; g.beginPath(); g.arc(0, -0.15, 0.42, Math.PI, 0); g.lineTo(0.42, 0); g.moveTo(-0.42, 0); g.lineTo(-0.42, -0.15); g.stroke();
      inDark(g, () => { ell(g, 0, 0.3, 0.13, 0.13); g.fill(); g.fillRect(-0.05, 0.3, 0.1, 0.3); }); },
    key: g => { g.lineWidth = 0.24; g.strokeStyle = g.fillStyle; ell(g, -0.5, 0, 0.36, 0.36); g.stroke(); g.fillRect(-0.16, -0.1, 1.08, 0.2); g.fillRect(0.5, 0.05, 0.14, 0.32); g.fillRect(0.76, 0.05, 0.14, 0.24); },
    gavel: g => { g.save(); g.rotate(-0.6); rr(g, -0.55, -0.62, 1.1, 0.46, 0.1); g.fill(); g.fillRect(-0.09, -0.2, 0.18, 1.05); g.restore(); rr(g, -0.85, 0.66, 1.0, 0.24, 0.08); g.fill(); },
    doc: g => { g.beginPath(); g.moveTo(-0.62, -0.92); g.lineTo(0.3, -0.92); g.lineTo(0.66, -0.56); g.lineTo(0.66, 0.92); g.lineTo(-0.62, 0.92); g.closePath(); g.fill();
      inDark(g, () => { for (let i = 0; i < 5; i++) g.fillRect(-0.42, -0.45 + i * 0.27, i === 4 ? 0.55 : 0.88, 0.09); }); },
    radiation: g => { ell(g, 0, 0, 0.92, 0.92); g.fill(); inDark(g, () => { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a - 0.5) * 0.2, Math.sin(a - 0.5) * 0.2); g.arc(0, 0, 0.78, a - 0.5, a + 0.5); g.arc(0, 0, 0.2, a + 0.5, a - 0.5, true); g.fill(); } ell(g, 0, 0, 0.13, 0.13); g.fill(); }); },
    thermo: g => { rr(g, -0.2, -0.95, 0.4, 1.3, 0.2); g.fill(); ell(g, 0, 0.55, 0.38, 0.38); g.fill(); inDark(g, () => { g.fillRect(-0.07, -0.4, 0.14, 0.9); ell(g, 0, 0.55, 0.22, 0.22); g.fill(); }); },
    rocket: g => { g.beginPath(); g.moveTo(0, -1); g.bezierCurveTo(0.45, -0.6, 0.38, 0.1, 0.3, 0.55); g.lineTo(-0.3, 0.55); g.bezierCurveTo(-0.38, 0.1, -0.45, -0.6, 0, -1); g.fill();
      g.beginPath(); g.moveTo(-0.3, 0.1); g.lineTo(-0.62, 0.72); g.lineTo(-0.3, 0.55); g.moveTo(0.3, 0.1); g.lineTo(0.62, 0.72); g.lineTo(0.3, 0.55); g.fill();
      inDark(g, () => { ell(g, 0, -0.28, 0.14, 0.14); g.fill(); }); const c = g.fillStyle; g.fillStyle = '#FFB020'; g.beginPath(); g.moveTo(-0.2, 0.6); g.lineTo(0, 0.98); g.lineTo(0.2, 0.6); g.fill(); g.fillStyle = c; },
    barrel: g => { rr(g, -0.6, -0.9, 1.2, 1.8, 0.2); g.fill(); inDark(g, () => { g.fillRect(-0.6, -0.42, 1.2, 0.1); g.fillRect(-0.6, 0.32, 1.2, 0.1); }); },
    crown: g => { g.beginPath(); [[-0.9, 0.55], [-0.9, -0.55], [-0.45, -0.05], [0, -0.75], [0.45, -0.05], [0.9, -0.55], [0.9, 0.55]].forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fill(); g.fillRect(-0.9, 0.6, 1.8, 0.22); },
    people: g => { for (const [x, s] of [[-0.55, 0.75], [0.55, 0.75], [0, 1]]) { g.save(); g.translate(x, 0.12 * (1 - s)); g.scale(s, s); ell(g, 0, -0.45, 0.26, 0.26); g.fill(); g.beginPath(); g.moveTo(-0.5, 0.88); g.quadraticCurveTo(-0.46, -0.08, 0, -0.08); g.quadraticCurveTo(0.46, -0.08, 0.5, 0.88); g.closePath(); g.fill(); g.restore(); } },
    container: g => { g.beginPath(); g.moveTo(-0.98, 0.25); g.lineTo(0.98, 0.25); g.lineTo(0.7, 0.75); g.lineTo(-0.75, 0.75); g.closePath(); g.fill();
      const c = g.fillStyle; ['#E84A3C', '#F2B233', '#3C9CEB', '#3BBE5A', '#E84A3C', '#F2B233'].forEach((k, i) => { g.fillStyle = k; g.fillRect(-0.72 + (i % 3) * 0.44, i < 3 ? -0.05 : -0.33, 0.4, 0.26); }); g.fillStyle = c; },
  });
  // cutout(g, icon, x, y, o): a flat icon with the thick white sticker outline (no badge), the channel's commonest overlay: o.s (px half
  // size), o.col, o.rot (deg), o.k pop (0 -> 1.12 -> 1), o.bob (t: bobs 2 px)
  function cutout(g, name, x, y, o = {}) {
    const k = K(o.k); if (k <= 0.01) return; const s = (o.s || W * 0.06) * k, ow = o.ow ?? Math.max(4, s * 0.09), rot = (o.rot || 0) * D2R_, by = o.bob != null ? Math.sin(o.bob * 3.1) * 2 : 0;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12; g.shadowOffsetY = 5;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.save(); g.translate(x + Math.cos(a) * ow, y + by + Math.sin(a) * ow); g.rotate(rot); icon(g, name, 0, 0, s, '#FFFFFF'); g.restore(); if (!i) g.shadowColor = 'transparent'; }
    g.translate(x, y + by); g.rotate(rot); icon(g, name, 0, 0, s, o.col || '#E84A3C'); g.restore();
    mark(g, o.mark || 'device', x - s - ow, y - s - ow, x + s + ow, y + s + ow, 'cutout ' + name);
  }
  // political(g, v, o): the flat colour map, for a sentence about MANY countries at once: every country one flat palette colour, thin
  // white borders, no terrain. o.pick { ISO or name: colour } colours the ones the sentence names; o.rest greys the others.
  const PAL = ['#F59A23', '#D93A32', '#F2D22E', '#3BBE5A', '#3C9CEB', '#8E3FB7'];
  function political(g, v, o = {}) {
    setView(v); g.save(); g.fillStyle = o.ocean || '#17566B'; g.fillRect(0, 0, W, H); const cols = o.cols || PAL;
    for (const c of WORLD.countries) { let h = 7; for (const ch of String(c.iso || c.name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      g.beginPath(); ringPath(g, c.rings); g.fillStyle = (o.pick && (o.pick[c.iso] || o.pick[c.name])) || o.rest || cols[h % cols.length]; g.fill('evenodd'); }
    g.beginPath(); for (const c of WORLD.countries) ringPath(g, c.rings); g.strokeStyle = o.border || 'rgba(255,255,255,0.9)'; g.lineWidth = o.borderW ?? 1.6; g.lineJoin = 'round'; g.stroke();
    g.restore(); return CUR;
  }
  // tag(g, text, place, o): a place name with the underline leader: a 3 px white line from a dot on the place out to the name, then on
  // under it. o.dx/o.dy (where the name sits, px), o.size (default 4.2 % of W), o.k draws the line first, then the name
  function tag(g, text, q, o = {}) {
    const k = clamp(K(o.k)); if (k <= 0.01) return; const [x, y] = Array.isArray(q) ? xy(q[0], q[1]) : at(q), size = o.size || W * 0.042, col = o.col || '#FFFFFF';
    const tx = x + (o.dx ?? 130), ty = y + (o.dy ?? -100), right = (o.dx ?? 130) >= 0;
    g.save(); g.font = `${size}px ${o.font || 'FlatHeavy'}, sans-serif`; const tw = g.measureText(text).width, ux0 = right ? tx : tx - tw, ux1 = right ? tx + tw : tx, uy = ty + size * 0.2, near = right ? ux0 : ux1, far = right ? ux1 : ux0;
    const a = clamp(k * 2), b = clamp(k * 2 - 1);
    g.lineCap = g.lineJoin = 'round'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 6; g.strokeStyle = g.fillStyle = col; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(lerp(x, near, a), lerp(y, uy, a)); if (b > 0) g.lineTo(lerp(near, far, b), uy); g.stroke(); ell(g, x, y, 7, 7); g.fill();
    if (b > 0) { g.globalAlpha = b; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(text, ux0, ty); g.fillStyle = col; g.fillText(text, ux0, ty); }
    g.restore(); mark(g, 'text', Math.min(x, ux0), Math.min(y, ty - size), Math.max(x, ux1), Math.max(y, uy), 'tag');
  }
  // pulse(g, place, u): the arrival ring on a place: a white ring growing 14 -> 60 px and fading, u 0..1 (about 0.6 s)
  function pulse(g, q, u, o = {}) { if (u <= 0 || u >= 1) return; const [x, y] = Array.isArray(q) ? xy(q[0], q[1]) : at(q);
    g.save(); g.strokeStyle = o.col || '#FFFFFF'; g.globalAlpha = 1 - u; g.lineWidth = 2 + 4 * (1 - u); g.beginPath(); g.arc(x, y, lerp(o.r0 || 14, o.r1 || 60, glide(u)), 0, Math.PI * 2); g.stroke(); g.restore(); }
  // vehicle(g, path, p, o): a plane / ship / car / train riding the route's tip (draw the route with o.dot false first). A plane turns to
  // its heading; the others face the way they go. o.icon, o.s, o.col, o.great (same as the route)
  function vehicle(g, pts, p, o = {}) {
    if (p <= 0) return; const a = tip(pts, p, o), b = tip(pts, Math.max(0, p - 0.01), o), [x, y] = xy(a[0], a[1]), [x0, y0] = xy(b[0], b[1]), name = o.icon || 'plane';
    const ang = Math.atan2(y - y0, x - x0), s = o.s || W * 0.05;
    if (name === 'plane') return cutout(g, name, x, y, { s, col: o.col || '#FFFFFF', rot: ang * R2D + 90, k: o.k, mark: 'hero' });
    g.save(); if (x < x0) { g.translate(2 * x, 0); g.scale(-1, 1); } cutout(g, name, x, y, { s, col: o.col || '#E84A3C', k: o.k, mark: 'hero' }); g.restore();
  }
  // band(g, path, p, o): the wide flat flow arrow (water, people, trade moving): o.w px wide (default 140), a two-stop gradient o.cols
  // (default yellow to green), an arrow head on the tip; draws on with p
  function band(g, pts, p, o = {}) {
    if (p <= 0) return; const w = o.w || 140, cols = o.cols || ['#FFE600', '#3BBE5A'], P = pts.map(q => typeof q === 'string' ? find(q).c : q);
    const A = xy(P[0][0], P[0][1]), Z = xy(P[P.length - 1][0], P[P.length - 1][1]), gr = g.createLinearGradient(A[0], A[1], Z[0], Z[1]); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
    g.save(); g.globalAlpha = o.a ?? 0.92; route(g, pts, p, { ...o, w, col: gr, glow: false, edge: 'rgba(0,0,0,0.22)', dot: false, head: false });
    const t1 = tip(pts, p, o), t0 = tip(pts, Math.max(0, p - 0.01), o), [x, y] = xy(t1[0], t1[1]), [x0, y0] = xy(t0[0], t0[1]), an = Math.atan2(y - y0, x - x0);
    g.fillStyle = gr; g.beginPath();
    const c = Math.cos(an), s = Math.sin(an), pt = (u, v) => [x + u * c - v * s, y + u * s + v * c];
    [[0, -w * 0.9], [w * 0.95, 0], [0, w * 0.9]].map(([u, v]) => pt(u, v)).forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill();
    g.restore(); mark(g, 'device', Math.min(A[0], x) - w, Math.min(A[1], y) - w, Math.max(A[0], x) + w, Math.max(A[1], y) + w, 'band');
  }
  // callout(g, text, place, o): a white rounded box with black text and a small tail to its place (a quote, an aside), 18-30 % of W;
  // o.dx/o.dy (box centre from the place, px), o.w (max width share), o.size, o.k pops it from the place
  function callout(g, text, q, o = {}) {
    const k = K(o.k); if (k <= 0.01) return; const [x, y] = o.screen ? q : Array.isArray(q) ? xy(q[0], q[1]) : at(q), size = o.size || 40, maxw = (o.w ?? 0.3) * W;
    g.save(); g.font = `${size}px ${o.font || 'FlatBold'}, sans-serif`;
    const lines = []; let cur = ''; for (const wd of String(text).split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxw && cur) { lines.push(cur); cur = wd; } else cur = t; } lines.push(cur);
    const pad = size * 0.5, bw = Math.max(...lines.map(l => g.measureText(l).width)) + pad * 2, bh = lines.length * size * 1.2 + pad * 1.2;
    const cx = x + (o.dx ?? 60), cy = y + (o.dy ?? -220), by0 = cy - bh / 2, tb = y > cy ? cy + bh / 2 - 2 : by0 + 2, tx = clamp(x, cx - bw / 2 + size, cx + bw / 2 - size);
    g.translate(x, y); g.scale(k, k); g.translate(-x, -y);
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 14; g.shadowOffsetY = 5; g.fillStyle = o.bg || '#FFFFFF';
    g.beginPath(); g.moveTo(tx - size * 0.4, tb); g.lineTo(lerp(tx, x, 0.88), lerp(tb, y, 0.88)); g.lineTo(tx + size * 0.4, tb); g.closePath(); g.fill();
    rr(g, cx - bw / 2, by0, bw, bh, size * 0.4); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = o.txt || '#111111'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, cx, by0 + pad * 0.6 + size * 0.6 + i * size * 1.2));
    g.restore(); mark(g, 'text', cx - bw / 2, by0, cx + bw / 2, by0 + bh, 'callout');
  }
  // hand(g, what, o): the flat peach hand coming in from the frame edge, holding a thing: what = an icon name or a draw fn (g, x, y, s).
  // o.side ('right' | 'left' | 'bottom'), o.at (0..1 along that edge), o.s (object size px, default 13 % of W), o.reach (share of W,
  // default 0.3), o.k slides it in, o.col (the object's colour), o.sleeve
  function hand(g, what, o = {}) {
    const k = clamp(K(o.k)); if (k <= 0.01) return; const side = o.side || 'right', s = o.s || W * 0.13, at_ = o.at ?? 0.5;
    const ang = side === 'right' ? Math.PI : side === 'left' ? 0 : -Math.PI / 2, ex = side === 'right' ? W : side === 'left' ? 0 : W * at_, ey = side === 'bottom' ? H : H * at_;
    const reach = (o.reach ?? 0.3) * W * glide(k), hx = ex + Math.cos(ang) * reach, hy = ey + Math.sin(ang) * reach, skin = o.skin || '#F2C29B', shade = o.shade || '#D9A07A';
    const L = (u, v) => [hx + u * Math.cos(ang) - v * Math.sin(ang), hy + u * Math.sin(ang) + v * Math.cos(ang)];   // hand space: +u = toward the fingers
    const up = side === 'right' ? -1 : 1;                                                                          // which side of the arm is "up" on screen
    g.save(); g.translate(hx, hy); g.rotate(ang); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
    g.fillStyle = o.sleeve || '#2E5E9E'; rr(g, -reach - s, -s * 0.24, reach + s * 0.55, s * 0.48, s * 0.12); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = skin; rr(g, -s * 0.5, -s * 0.21, s * 0.42, s * 0.42, s * 0.1); g.fill(); ell(g, s * 0.05, 0, s * 0.34, s * 0.3); g.fill();
    g.restore();
    const [ox, oy] = side === 'bottom' ? L(s * 0.5, 0) : L(s * 0.12, -up * s * 0.5);                              // the thing sits on the grip, upright
    if (typeof what === 'function') what(g, ox, oy, s * 0.5); else cutout(g, what, ox, oy, { s: s * 0.5, col: o.col || '#F2B233', mark: 'hero' });
    g.save(); g.translate(hx, hy); g.rotate(ang); g.fillStyle = skin;                                                // fingers wrap over the thing
    for (let i = 0; i < 4; i++) { rr(g, s * (0.12 + i * 0.075), -s * 0.26 * up - s * 0.02, s * 0.085, s * 0.3, s * 0.04); g.fill(); }
    g.strokeStyle = shade; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(s * (0.12 + i * 0.075), -s * 0.2 * up); g.lineTo(s * (0.12 + i * 0.075), s * 0.04 * up); g.stroke(); }
    g.fillStyle = skin; ell(g, s * 0.1, s * 0.2 * up, s * 0.17, s * 0.09, 0.3 * up); g.fill();                    // thumb
    g.restore(); mark(g, 'hero', Math.min(hx, ox) - s * 0.6, Math.min(hy, oy) - s * 0.6, Math.max(hx, ox) + s * 0.6, Math.max(hy, oy) + s * 0.6, 'hand');
  }
  // chart(g, bars, o): a flat bar chart on a dark card, under 3 s: bars [{ label, v, col }], o.p grows them (over 0.6 s), o.x/o.y (centre,
  // shares), o.w/o.h (shares), o.fmt formats the numbers, o.k pops the card
  function chart(g, bars, o = {}) {
    const k = K(o.k); if (k <= 0.01) return; const cw = (o.w ?? 0.82) * W, ch = (o.h ?? 0.3) * H, cx = (o.x ?? 0.5) * W, cy = (o.y ?? 0.4) * H, p = glide(clamp(o.p ?? 1));
    g.save(); g.translate(cx, cy); g.scale(k, k); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = o.bg || 'rgba(12,20,28,0.92)'; rr(g, -cw / 2, -ch / 2, cw, ch, 28); g.fill(); g.shadowColor = 'transparent';
    const n = bars.length, max = Math.max(...bars.map(b => b.v)) || 1, pad = cw * 0.07, slot = (cw - pad * 2) / n, bw = slot * 0.62, base = ch / 2 - ch * 0.17, top = -ch / 2 + ch * 0.17;
    bars.forEach((b, i) => { const bx = -cw / 2 + pad + (i + 0.5) * slot, hgt = (base - top) * b.v / max * p;
      g.fillStyle = b.col || PAL[i % PAL.length]; if (hgt > 1) { rr(g, bx - bw / 2, base - hgt, bw, hgt, Math.min(10, hgt / 2)); g.fill(); }
      g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.font = `${Math.round(ch * 0.08)}px FlatHeavy, sans-serif`; g.textBaseline = 'bottom'; if (p > 0.05) g.fillText(o.fmt ? o.fmt(b.v * p) : String(Math.round(b.v * p)), bx, base - hgt - 8);
      g.font = `${Math.round(ch * 0.065)}px FlatBold, sans-serif`; g.textBaseline = 'top'; g.fillStyle = 'rgba(255,255,255,0.82)'; g.fillText(b.label || '', bx, base + 14); });
    g.restore(); mark(g, 'device', cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2, 'chart');
  }
  // timeline(g, items, p, o): a thin line across the upper third with 3-5 dated dots that light up in turn: [{ when: '1914', text }],
  // p 0..1 (the line fills, each dot pops as it is reached), o.y (share, default 0.24), o.col
  function timeline(g, items, p, o = {}) {
    const y = (o.y ?? 0.24) * H, x0 = W * 0.12, x1 = W * 0.88, n = items.length, pp = glide(clamp(p)), col = o.col || '#FFE600';
    g.save(); g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 8;
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    g.strokeStyle = col; g.lineWidth = 7; g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, pp), y); g.stroke();
    items.forEach((it, i) => { const u = n > 1 ? i / (n - 1) : 0.5, x = lerp(x0, x1, u), kk = clamp((pp - u) * 8 + 1);
      g.fillStyle = kk > 0 ? col : 'rgba(255,255,255,0.6)'; ell(g, x, y, 10 + 6 * kk, 10 + 6 * kk); g.fill(); if (kk <= 0) return;
      g.globalAlpha = kk; g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.font = `${Math.round(W * 0.042)}px FlatHeavy, sans-serif`; g.textBaseline = 'bottom'; g.fillText(it.when || '', x, y - 26);
      if (it.text) { g.font = `${Math.round(W * 0.028)}px FlatBold, sans-serif`; g.textBaseline = 'top'; g.fillText(it.text, x, y + 26); } g.globalAlpha = 1; });
    g.restore(); mark(g, 'device', x0, y - W * 0.06, x1, y + W * 0.05, 'timeline');
  }
  // globe(g, o): a turning globe for a world-scale beat (1-2 s, never the main stage): orthographic, land from the country shapes. o.lon /
  // o.lat (the centre; turn it by moving o.lon with time), o.r (px), o.x/o.y (shares), o.land, o.sea, o.pick { ISO or name: colour }
  function globe(g, o = {}) {
    const r = o.r || W * 0.38, cx = (o.x ?? 0.5) * W, cy = (o.y ?? 0.42) * H, l0 = (o.lon ?? 0) * D2R_, p0 = (o.lat ?? 20) * D2R_, sp = Math.sin(p0), cp = Math.cos(p0);
    const P = (lon, lat) => { const l = lon * D2R_ - l0, f = lat * D2R_, cf = Math.cos(f), c = sp * Math.sin(f) + cp * cf * Math.cos(l);
      let x = r * cf * Math.sin(l), y = -r * (cp * Math.sin(f) - sp * cf * Math.cos(l)); if (c < 0) { const d = Math.hypot(x, y) || 1; x = x / d * r; y = y / d * r; } return [cx + x, cy + y, c]; };
    g.save(); g.shadowColor = o.halo || 'rgba(120,200,255,0.55)'; g.shadowBlur = r * 0.12;
    const sea = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r); sea.addColorStop(0, o.sea || '#1F7F96'); sea.addColorStop(1, '#0A3442');
    g.fillStyle = sea; ell(g, cx, cy, r, r); g.fill(); g.shadowColor = 'transparent'; ell(g, cx, cy, r, r); g.clip();
    for (const c of WORLD.countries) { const col = (o.pick && (o.pick[c.iso] || o.pick[c.name])) || o.land || '#5E8F4E'; let any = false; g.beginPath();
      for (const rg of c.rings) { const pts = Array.isArray(rg) ? rg : rg.hole; if (!pts || !pts.length) continue; pts.forEach((q, i) => { const [x, y, v] = P(q[0], q[1]); if (v > 0) any = true; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); }
      if (any) { g.fillStyle = col; g.fill('evenodd'); } }
    const sh = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.05); sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = sh; g.fillRect(cx - r, cy - r, 2 * r, 2 * r); g.restore(); mark(g, 'hero', cx - r, cy - r, cx + r, cy + r, 'globe');
    return P;
  }
  // grade(g, o): the one finish for every map Short, drawn LAST: edges darkened toward 0.8 and a soft grain (about 7 of 255) that moves
  // every frame (o.t), so every Short has the same look. o.vignette (0..1), o.grain (0..255)
  let GRAIN = null;
  function grade(g, o = {}) {
    if (!GRAIN) { GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 256; const gc = GRAIN.getContext('2d'), im = gc.createImageData(256, 256), R = rnd(97);
      for (let i = 0; i < im.data.length; i += 4) { const v = R() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gc.putImageData(im, 0, 0); }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const vg = g.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${o.vignette ?? 0.22})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const t = o.t || 0, pat = g.createPattern(GRAIN, 'repeat'); g.translate(-((t * 997) % 256), -((t * 613) % 256));
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = (o.grain ?? 7) / 255 * 3; g.fillStyle = pat; g.fillRect(0, 0, W + 256, H + 256);
    g.restore();
  }
  // life(g, T, a, b, draw, o): the one clean way an overlay lives on the map (creator's rule): from a it glides in over o.in s (0.35)
  // growing from o.from (0.85) with its opacity, holds, and from b fades out over o.out s (0.25). draw(k, e) gets the scale to pass
  // as o.k / o.s factor and the 0..1 presence:  MAP.life(g, T, 4.2, 7.0, k => MAP.plate(g, '12%', x, y, { k }));
  function life(g, T, a, b, draw, o = {}) {
    const i = o.in ?? 0.35, out = o.out ?? 0.25; if (T < a || T > b + out) return;
    const e = T < a + i ? glide(clamp((T - a) / i)) : T > b ? 1 - glide(clamp((T - b) / out)) : 1;
    g.save(); g.globalAlpha *= e; draw(lerp(o.from ?? 0.85, 1, e), e); g.restore();
  }
  // ── loading: world.json, the low zooms always, then exactly the tiles this page's camera passes over ──────────────────
  let HI = null;                                                 // the sharp tiles that exist (maps/hi.json: [] until a Short is linked to them)
  const load = key => new Promise(res => { if (TILES.has(key)) return res(); const [z, x, y] = key.split('/'); if (+z > ZBASE && !(HI && HI.has(key))) return res(); const im = new Image();
    im.onload = () => { TILES.set(key, im); res(); }; im.onerror = () => res(); im.src = `maps/${+z > ZBASE ? 'hi' : 'tiles'}/${z}/${x}_${y}.jpg`; });   /* z6-7: the sharp set (maps/hi, linked in; open sea is left out and falls back to z5) */
  async function prepare() {
    WORLD = await fetch('maps/world.json').then(r => r.json()); index();
    HI = await fetch('maps/hi.json').then(r => r.ok ? r.json() : []).then(k => new Set(k)).catch(() => null);
    const base = []; for (let z = 0; z <= 2; z++) for (let x = 0; x < (1 << z); x++) for (let y = 0; y < (1 << z); y++) base.push(`${z}/${x}/${y}`);
    await Promise.all(base.map(load));
    collect = new Set(); const end = Math.max(1, ...SHOTS.map(s => s.t1 || 0));
    for (let t = 0; t <= end; t += 1 / 15) { try { window.render(t); } catch (e) { /* the real render will report it */ } }
    const need = [...collect]; collect = null;
    for (let i = 0; i < need.length; i += 24) await Promise.all(need.slice(i, i + 24).map(load));
    window.MAP_TILES = need.length;
  }
  const prev = window.beforeReady; window.beforeReady = async () => { if (prev) await prev(); await prepare(); };
  return { view, dark, cam, fit, fly: flyP, region, borders, coast, rivers, lakes, route, pin, label, flag, flagFill, icon, sticker, scatter, ring, meridian, mesh, shield, marker, react, along: alongText, sheet, tint, tip, headline, plate, news, badge, cutout, political, tag, pulse, vehicle, band, callout, hand, chart, timeline, globe, grade, life, xy: (lon, lat) => xy(lon, lat), at, find, world: () => WORLD };
})();
