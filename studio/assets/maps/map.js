/* map.js — the page behind every MAPS DLC scene.

   One scene is one camera move over real geography (Natural Earth borders), drawn
   on canvas through an orthographic projection. That one projection covers the
   whole range: at a small scale it IS the globe, at a large one a state fills the
   frame, so a single continuous move can go from the planet to a county line.

   Same contract as every Legion scene: window.renderFrame(t) draws frame t from
   t alone — no timers, no CSS animation, no Math.random (rnd() is seeded).

   Globals set by maps.py before this file: SCENE, PAL, W, H.

   Shots: region (a country, state, sea or desert lights up and lifts off the map),
   pin (a city: the pin drops, rings ripple out), route (a line draws from place to
   place with a plane or a ship on its head), multi (several places, one by one).
*/
"use strict";

/* ── deterministic helpers ─────────────────────────────────────────────── */
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const seg = (t, s, d) => cl((t - s) / Math.max(1e-4, d), 0, 1);
const lerp = (a, b, p) => a + (b - a) * p;
const eOut = p => 1 - Math.pow(1 - p, 3);
const eIn = p => p * p * p;
const eInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const eSine = p => -(Math.cos(Math.PI * p) - 1) / 2;
const eBack = p => { const c = 1.45; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const eBounce = p => {                                   /* a pin landing */
  const n = 7.5625, d = 2.75;
  if (p < 1 / d) return n * p * p;
  if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
  if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
  return n * (p -= 2.625 / d) * p + 0.984375;
};
let _s = (SCENE.seed || 7) >>> 0;
const rnd = () => { _s = (_s * 1664525 + 1013904223) % 4294967296; return _s / 4294967296; };
const R_KM = 6371.0088;
const D = SCENE.duration || 7;
const HIT = cl(SCENE.hit == null ? 1.4 : SCENE.hit, 0.5, Math.max(0.5, D - 3.0));
/* PAL.look (autostyle v2 map looks, maps.py palette()): per-element style tokens over the skin's kind. Absent on the
   nine shipped skins, so every `tok(...)` below falls back to exactly what that kind always drew. */
const LK = (PAL.look && typeof PAL.look === "object") ? PAL.look : {};
const tok = (k, d) => (LK[k] != null ? LK[k] : d);
const upper = s => ((LK.upper != null ? !LK.upper : PAL.kind === "film") ? String(s || "") : String(s || "").toLocaleUpperCase(SCENE.lang || undefined));

/* ── data: three levels of detail, decoded once ───────────────────────── */
function feats(topo, name) {
  return topo && topo.objects && topo.objects[name] ? topojson.feature(topo, topo.objects[name]).features : [];
}
const LAND = new Set(SCENE.land || []);          // countries drawn at full strength
const A1OF = new Set(SCENE.admin1_of || []);     // countries whose state lines are drawn
const LV = {};
for (const name of ["lo", "mid", "hi"]) {
  const topo = SCENE.geo[name];
  const countries = feats(topo, "countries"), admin1 = feats(topo, "admin1");
  const byId = new Map();
  for (const f of countries.concat(admin1)) byId.set(f.id, f);
  const obj = topo && topo.objects;
  const prefixOf = id => String(id).split("-")[0];
  /* A group (Scotland, the Soviet Union) is its members merged into one outline, so
     the borders between them disappear — they read as the one place the voice named. */
  for (const [cid, spec] of Object.entries(SCENE.composites || {})) {
    const o = obj && obj[spec.obj];
    if (!o) continue;
    const want = new Set(spec.ids), geoms = o.geometries.filter(g => want.has(g.id));
    if (geoms.length) byId.set(cid, { type: "Feature", id: cid, geometry: topojson.merge(topo, geoms) });
  }
  LV[name] = {
    topo, byId, countries,
    /* state lines only inside the countries that asked for them, each drawn once */
    a1mesh: obj && obj.admin1 ? topojson.mesh(topo, obj.admin1,
      (a, b) => a !== b && A1OF.has(prefixOf(a.id)) && A1OF.has(prefixOf(b.id))) : null,
  };
}
/* A close view only carries detail for what is near the place; anything further out
   comes from the next level down, so the edges of a close-up are never empty. */
for (const [fine, coarse] of [["mid", "lo"], ["hi", "mid"]]) {
  const have = new Set(LV[fine].countries.map(f => f.id));
  LV[fine].all = LV[fine].countries.concat((LV[coarse].all || LV[coarse].countries).filter(f => !have.has(f.id)));
}
LV.lo.all = LV.lo.countries;
for (const name of ["lo", "mid", "hi"]) {
  LV[name].land = LV[name].all.filter(f => LAND.has(f.id));
  LV[name].others = LV[name].all.filter(f => !LAND.has(f.id));
}
/* seas, deserts, mountain ranges: one level of detail each */
const EXTRA = new Map();
for (const [key, obj] of [["water", "water"], ["regions", "regions"]]) {
  const topo = SCENE.geo[key];
  for (const f of feats(topo, obj)) EXTRA.set(f.id, f);
  for (const [cid, spec] of Object.entries(SCENE.composites || {})) {
    if (spec.obj !== obj || !topo) continue;
    const want = new Set(spec.ids), geoms = topo.objects[obj].geometries.filter(g => want.has(g.id));
    if (geoms.length) EXTRA.set(cid, { type: "Feature", id: cid, geometry: topojson.merge(topo, geoms) });
  }
}
function lodFor(k) {
  const pxkm = k / R_KM;
  if (pxkm > 0.24 && LV.hi.topo) return LV.hi;
  if ((pxkm > 0.055 || !LV.lo.topo) && LV.mid.topo) return LV.mid;
  return LV.lo.topo ? LV.lo : LV.hi;
}
function feature(id, k) {
  /* the most detailed copy the current zoom deserves, falling back to any copy */
  return lodFor(k).byId.get(id) || LV.hi.byId.get(id) || LV.mid.byId.get(id) || LV.lo.byId.get(id) || EXTRA.get(id) || null;
}

/* ── projection: orthographic globe + a gentle table-top tilt ─────────── */
const ortho = d3.geoOrthographic().clipAngle(90).precision(0.55);
let TILT = 0;
const TCX = W * 0.5, TCY = H * 0.54, PERSP = 2400;
function tiltXY(x, y) {
  if (!TILT) return [x, y];
  const a = TILT * Math.PI / 180, dy = y - TCY;
  const s = PERSP / (PERSP - dy * Math.sin(a));
  return [TCX + (x - TCX) * s, TCY + dy * Math.cos(a) * s];
}
/* d3.geoPath takes anything with a stream(): project, clip, then tilt the plane.
   A tilt is a projective map, so the straight segments between points stay straight. */
const tproj = {
  stream: s => ortho.stream({
    point(x, y) { const p = tiltXY(x, y); s.point(p[0], p[1]); },
    sphere() { s.sphere(); }, lineStart() { s.lineStart(); }, lineEnd() { s.lineEnd(); },
    polygonStart() { s.polygonStart(); }, polygonEnd() { s.polygonEnd(); },
  }),
};
function screen(lonlat) {
  const r = ortho.rotate(), c = [-r[0], -r[1]];
  if (d3.geoDistance(c, lonlat) > Math.PI / 2 - 0.01) return null;     // far side of the globe
  const p = ortho(lonlat);
  return p ? tiltXY(p[0], p[1]) : null;
}
const TILT_MUL = 1;            /* set below once PAL.kind is known */
function applyCam(c) {
  ortho.rotate([-c.lon, -c.lat, 0]).scale(c.k).translate([c.x, c.y]);
  TILT = Math.min(36, (c.tilt || 0) * (window.__TILT_MUL || 1));
}

/* ── framing ───────────────────────────────────────────────────────────── */
function boxCenter(b) {
  let [w, s, e, n] = b;
  if (e < w) e += 360;
  let lon = (w + e) / 2;
  if (lon > 180) lon -= 360;
  return [lon, (s + n) / 2];
}
function boxGeom(b) {
  let [w, s, e, n] = b;
  if (e < w) e += 360;
  const pts = [];
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) pts.push([w + (e - w) * i / 8, s + (n - s) * j / 8]);
  return { type: "MultiPoint", coordinates: pts };
}
const GLOBE_K = H * 0.40;
/* the camera that puts `box` (lon/lat) inside the screen rectangle `r` [x0,y0,x1,y1] */
function fit(box, r, centre) {
  const c = centre || boxCenter(box);
  const p = d3.geoOrthographic().clipAngle(90).rotate([-c[0], -c[1]]).scale(1).translate([0, 0]).precision(0);
  const b = d3.geoPath(p).bounds(boxGeom(box));
  const bw = Math.max(1e-5, b[1][0] - b[0][0]), bh = Math.max(1e-5, b[1][1] - b[0][1]);
  const k = Math.max(GLOBE_K, Math.min((r[2] - r[0]) / bw, (r[3] - r[1]) / bh));
  const mx = (b[0][0] + b[1][0]) / 2, my = (b[0][1] + b[1][1]) / 2;
  return { lon: c[0], lat: c[1], k, x: (r[0] + r[2]) / 2 - mx * k, y: (r[1] + r[3]) / 2 - my * k, bw: bw * k, bh: bh * k };
}
/* the same camera, moved so that lon/lat `p` lands on screen point [sx, sy] */
function aimAt(cam, p, sx, sy) {
  applyCam({ ...cam, tilt: 0 });
  const q = ortho(p);
  return { ...cam, x: cam.x + (sx - q[0]), y: cam.y + (sy - q[1]) };
}

/* Van Wijk & Nielsen's smooth zoom-and-pan, on the sphere: the path pulls out while
   it travels and pushes in as it arrives, the way a camera operator flies it. */
function fly(a, b) {
  const c0 = [a.lon, a.lat], c1 = [b.lon, b.lat];
  const d = d3.geoDistance(c0, c1), gi = d3.geoInterpolate(c0, c1);
  const w0 = W / a.k, w1 = W / b.k, rho = 1.25, rho2 = rho * rho, rho4 = rho2 * rho2;
  let at;
  if (d < 1e-6) {
    const S = Math.log(w1 / w0) / rho;
    at = t => ({ u: t, w: w0 * Math.exp(rho * t * S) });
  } else {
    const b0 = (w1 * w1 - w0 * w0 + rho4 * d * d) / (2 * w0 * rho2 * d);
    const b1 = (w1 * w1 - w0 * w0 - rho4 * d * d) / (2 * w1 * rho2 * d);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    const S = (r1 - r0) / rho;
    at = t => {
      const s = t * S, u = w0 / (rho2 * d) * (Math.cosh(r0) * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return { u, w: w0 * Math.cosh(r0) / Math.cosh(rho * s + r0) };
    };
  }
  return t => {
    const v = at(t), u = cl(v.u, 0, 1), c = gi(u);
    return { lon: c[0], lat: c[1], k: Math.max(GLOBE_K, W / v.w), x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u),
             tilt: lerp(a.tilt || 0, b.tilt || 0, t) };
  };
}
const zoomAbout = (c, f) => ({ ...c, k: c.k * f });
/* the film look: once the camera has arrived, it keeps moving round the place — the tilt deepens and the map slides
   under it, like a crane circling a model — for the rest of the scene */
function orbit(cam, t, from, until) {
  if (CAMERA === "glide") return glideDrift(cam, t, from, until);
  if (CAMERA !== "film") return cam;
  /* not a circle: a slow, even push into the place while the plane bends away under the camera — the tilt
     deepens, the map slides up a little, everything on one smooth sine so it never jolts */
  const p = eSine(seg(t, from, Math.max(0.8, until - from)));
  return { ...cam, k: cam.k * (1 + 0.24 * p), tilt: (cam.tilt || 0) + 16 * p,
           x: cam.x + W * 0.015 * p, y: cam.y + H * 0.07 * p };
}
/* the film look: the whole country first — held for most of a second, drifting a little so the frame lives — then
   one smooth ease-in-out flight down to the place; the pin may land while the camera is still settling */
const approach = (t, a, b) => (CAMERA === "film" ? eInOut(seg(t, 0.8, Math.max(1.4, b + 0.9 - 0.8)))
  : CAMERA === "glide" || CAMERA === "globe" ? smooth(seg(t, a, b - a)) : eInOut(seg(t, a, b - a)));
const settle = (cam, t) => (CAMERA === "film" ? zoomAbout(cam, 1 + 0.05 * eSine(seg(t, 0, 1.2))) : cam);
/* v2 cameras. glide: after arriving the map keeps sliding sideways under a locked camera, on one smoothstep (an
   ops table, a drafting board); no push-in. globe: the move starts on the whole planet and dives (dark globe). */
function smooth(p) { return p * p * (3 - 2 * p); }
function glideDrift(cam, t, from, until) {
  const p = smooth(seg(t, from - 1.0, Math.max(1.0, until - from + 1.0)));
  return { ...cam, x: cam.x - W * 0.028 * p, y: cam.y - H * 0.012 * p };
}
/* the camera a move starts from, for the v2 globe camera: the whole Earth turned towards where the move ends */
function globeStart(end) {
  return { lon: end.lon - 28, lat: cl(end.lat * 0.55, -50, 50), k: GLOBE_K * 1.08, x: W * 0.5, y: H * 0.52, tilt: 0 };
}

/* ── canvases and textures ─────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const base = $("base"), lift = $("lift"), fx = $("fx");
for (const c of [base, lift, fx, $("ground")]) { c.width = W; c.height = H; }
const bctx = base.getContext("2d"), lctx = lift.getContext("2d"), fctx = fx.getContext("2d");
const bpath = d3.geoPath(tproj, bctx), lpath = d3.geoPath(tproj, lctx);

/* ── the ground itself: a photograph of the Earth under the vectors (terrain skin) ──
   maps.py cuts the piece of the world this scene flies over and sends it in SCENE.relief
   with its own lon/lat box. It is laid down through the same projection as everything
   else: the box is cut into cells, each drawn under the transform that carries its own
   three corners, so the picture bends with the globe and leans with the table tilt. */
let RELIEF = null, RELIEF_FAR = null;
async function loadRelief() {
  const load = async (r) => {
    if (!r || !r.src) return null;
    const img = new Image();
    await new Promise(done => { img.onload = done; img.onerror = done; img.src = r.src; });
    return img.width ? { img, box: r.box } : null;
  };
  [RELIEF, RELIEF_FAR] = await Promise.all([load(SCENE.relief), load(SCENE.relief_far)]);
}
/* screen point -> the point on the flat map before the table was tilted (tiltXY undone) */
function untilt(x, y) {
  if (!TILT) return [x, y];
  const a = TILT * Math.PI / 180, dy = y - TCY;
  const u = dy * PERSP / (Math.cos(a) * PERSP + dy * Math.sin(a));
  const sc = PERSP / (PERSP - u * Math.sin(a));
  return [TCX + (x - TCX) / sc, TCY + u];
}
/* The lon/lat box the camera can actually see, so the wide floor is only meshed there.
   When a corner falls off the globe the limb is in shot and the whole hemisphere is used. */
function visibleBox() {
  const r = ortho.rotate(), c = [-r[0], -r[1]];
  const corners = [[0, 0], [W, 0], [0, H], [W, H], [W / 2, 0], [W / 2, H], [0, H / 2], [W, H / 2]];
  let w = 1e9, s = 1e9, e = -1e9, n = -1e9, got = 0;
  for (const q of corners) {
    const ll = ortho.invert ? ortho.invert(untilt(q[0], q[1])) : null;
    if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) continue;
    got++;
    let lon = ll[0], d = lon - c[0];
    while (d > 180) { lon -= 360; d -= 360; }
    while (d < -180) { lon += 360; d += 360; }
    w = Math.min(w, lon); e = Math.max(e, lon); s = Math.min(s, ll[1]); n = Math.max(n, ll[1]);
  }
  if (got < corners.length) {                      /* space in the frame: take the whole visible face */
    w = c[0] - 95; e = c[0] + 95; s = c[1] - 95; n = c[1] + 95;
  } else {
    const mx = (e - w) * 0.06 + 0.4, my = (n - s) * 0.06 + 0.4;
    w -= mx; e += mx; s -= my; n += my;
  }
  /* A pole in shot sees every longitude around it: the floor then goes all the way round, or the
     longitudes behind the pole stay bare and leave a black cap over the Arctic on a globe-wide shot. */
  const inView = q => q && q[0] > -200 && q[0] < W + 200 && q[1] > -200 && q[1] < H + 200;
  const north = inView(screen([c[0], 89.4])), south = inView(screen([c[0], -89.4]));
  if (north || south) { w = c[0] - 180; e = c[0] + 180; }
  if (north) n = 90;
  if (south) s = -90;
  /* never quite to the pole: there every longitude is the same point, the cell has no width */
  return [w, Math.max(-89.6, s), e, Math.min(89.6, n)];
}
function drawReliefLayer(ctx, layer, box, N, M) {
  const [lw, ls, le, ln] = layer.box, img = layer.img;
  const [bw, bs, be, bn] = box;
  if (be <= bw || bn <= bs) return;
  const px = img.width / (le - lw), py = img.height / (ln - ls);
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const la = bw + (be - bw) * i / N, lb = bw + (be - bw) * (i + 1) / N;
      const pt = bn - (bn - bs) * j / M, pb = bn - (bn - bs) * (j + 1) / M;
      const p00 = screen([la, pt]), p10 = screen([lb, pt]), p01 = screen([la, pb]), p11 = screen([lb, pb]);
      if (!p00 || !p10 || !p01) continue;
      /* nothing of this cell on screen: skip before any drawing work */
      const minx = Math.min(p00[0], p10[0], p01[0]), maxx = Math.max(p00[0], p10[0], p01[0]);
      const miny = Math.min(p00[1], p10[1], p01[1]), maxy = Math.max(p00[1], p10[1], p01[1]);
      if (maxx < -240 || minx > W + 240 || maxy < -240 || miny > H + 240) continue;
      /* the world sheet repeats every 360 degrees; it carries 30 extra degrees past the date line, so a
         cell that starts just west of it still reads one unbroken strip (no black seam over the Pacific) */
      const period = 360 * px;
      let sx = (la - lw) * px;
      if (sx < 0 || sx >= img.width) sx = ((sx % period) + period) % period;
      /* a cell that would run off the sheet's east edge reads the same strip one turn of the world
         west instead — with the whole 360 degrees in view the 30 spare degrees alone did not reach */
      if (sx + (lb - la) * px * 1.5 > img.width && sx - period >= 0) sx -= period;
      const sy = (ln - pt) * py, sw = (lb - la) * px, sh = (pt - pb) * py;
      /* Near the north pole a cell's top edge shrinks to a point and a transform built on it collapses
         (black wedges round the pole): there the bottom edge, which is the long one, carries it. */
      const top = Math.hypot(p10[0] - p00[0], p10[1] - p00[1]);
      const bot = p11 ? Math.hypot(p11[0] - p01[0], p11[1] - p01[1]) : 0;
      let a, b, c, d, e, f;
      if (p11 && bot > top * 1.6) {
        a = (p11[0] - p01[0]) / sw; b = (p11[1] - p01[1]) / sw;
        c = (p01[0] - p00[0]) / sh; d = (p01[1] - p00[1]) / sh;
        e = p01[0] - a * sx - c * (sy + sh); f = p01[1] - b * sx - d * (sy + sh);
      } else {
        a = (p10[0] - p00[0]) / sw; b = (p10[1] - p00[1]) / sw;
        c = (p01[0] - p00[0]) / sh; d = (p01[1] - p00[1]) / sh;
        e = p00[0] - a * sx - c * sy; f = p00[1] - b * sx - d * sy;
      }
      if (!(isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d)) || Math.abs(a * d - b * c) < 1e-9) continue;
      const ow = Math.min(sw * 1.45, img.width - sx), oh = Math.min(sh * 1.45, Math.max(1, img.height - sy));
      if (ow <= 0 || oh <= 0) continue;
      ctx.setTransform(a, b, c, d, e, f);
      ctx.drawImage(img, sx, Math.max(0, sy - sh * 0.15), ow, oh, sx, Math.max(0, sy - sh * 0.15), ow, oh);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.restore();
}
/* The whole Earth first, so the ground never stops inside the frame, then the sharp crop of the
   piece this scene is about on top of it. */
let CAPS = null;
function capColours() {
  /* the average colour of the sheet's top and bottom strips: Arctic ice and Antarctica */
  if (CAPS || !RELIEF_FAR) return CAPS;
  try {
    const img = RELIEF_FAR.img, c = document.createElement("canvas"); c.width = 64; c.height = 32;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, 64, 32);
    const avg = (y) => { const d = g.getImageData(0, y, 64, 1).data; let r = 0, gg = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4; return `rgb(${(r / n) | 0},${(gg / n) | 0},${(b / n) | 0})`; };
    CAPS = { north: avg(0), south: avg(31) };
  } catch (e) { CAPS = { north: "#dfe8ee", south: "#e8eef2" }; }
  return CAPS;
}
function drawRelief(ctx) {
  if (RELIEF_FAR) {
    const caps = capColours();
    for (const [lat, col] of [[90, caps && caps.north], [-90, caps && caps.south]]) {
      const q = screen([0, lat * 0.995]);
      if (!q || !col) continue;
      ctx.save(); ctx.beginPath(); bpath(d3.geoCircle().center([0, lat]).radius(26)());
      ctx.fillStyle = col; ctx.fill(); ctx.restore();
    }
  }
  if (RELIEF_FAR) drawReliefLayer(ctx, RELIEF_FAR, visibleBox(), 34, 24);
  if (RELIEF) drawReliefLayer(ctx, RELIEF, RELIEF.box, 34, 24);
}

/* the war-room floor: the photograph, then a hairline on every border, then the country
   the story is about washed in the channel's colour */
function drawTerrain(ctx, path, k, L) {
  drawRelief(ctx);
  ctx.save();
  ctx.beginPath(); for (const f of L.others) path(f);
  ctx.strokeStyle = PAL.borderNear; ctx.lineWidth = cl(k / 2800, 0.7, 1.7); ctx.stroke();
  ctx.restore();
  if (!L.land.length) return;
  ctx.save();
  ctx.beginPath(); for (const f of L.land) path(f);
  ctx.globalAlpha = 0.30; ctx.fillStyle = PAL.land; ctx.fill();
  ctx.globalAlpha = 1; ctx.shadowColor = PAL.glow; ctx.shadowBlur = 16;
  ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1600, 1.3, 2.8); ctx.stroke();
  ctx.restore();
  if (L.a1mesh) {
    ctx.save(); ctx.beginPath(); path(L.a1mesh); ctx.setLineDash([6, 7]);
    ctx.strokeStyle = PAL.borderDim; ctx.lineWidth = cl(k / 3000, 0.7, 1.4); ctx.stroke(); ctx.restore();
  }
}

function noiseCanvas(size, alpha, grain) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), im = g.createImageData(size, size);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.floor(alpha * 255 * (grain ? rnd() : 1));
  }
  g.putImageData(im, 0, 0);
  return c;
}
/* The texture on the highlighted shape. A crisp 6 px checker looked like dither and
   would swim under h264 while the shape floats, so this is soft grain with a faint
   diagonal weave: it reads as material without a pattern to alias. */
function weaveCanvas() {
  const S = 96, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d"), im = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const weave = ((x + y) % 8 < 4 ? 1 : -1) * 0.5 + ((x - y + 64) % 8 < 4 ? 1 : -1) * 0.5;
    const v = 128 + weave * 18 + (rnd() - 0.5) * 70;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = cl(v, 0, 255);
    im.data[i + 3] = 34;
  }
  g.putImageData(im, 0, 0);
  return c;
}
const KIND = PAL.kind || "glow";
/* Each element draws in its own style; a shipped skin draws every element in the style of its kind. The v2 looks
   (PAL.look) mix them: a blueprint's land, a radar's pins, a newspaper's labels. */
const GROUND = tok("ground", KIND), LANDS = tok("land", KIND), HISTYLE = tok("hi", KIND), PINS = tok("pin", KIND);
const LABEL = tok("label", KIND), ROUTE = tok("route", KIND), CAMERA = tok("camera", KIND === "film" ? "film" : "fly");
const LIFT = tok("lift", KIND !== "film" && KIND !== "terrain"), FADE = tok("fade", "dip");
const GLOW = LK.glow && typeof LK.glow === "object" ? LK.glow : null;     /* {family, strength}: route + pins only */
const KEEPIN = LK.keepIn === true;                                         /* labels never leave the frame */
window.__TILT_MUL = tok("tiltMul", KIND === "terrain" ? 2.2 : 1);   /* the war-room table leans properly */                 /* glow: dark and lit · paper: an old atlas · flat: a clean infographic */
const WEAVE = bctx.createPattern(weaveCanvas(), "repeat");
const GRAIN = bctx.createPattern(noiseCanvas(256, LANDS === "paper" ? 0.16 : 0.10, true), "repeat");

/* smooth value noise, for paper stains: a few random cells, scaled up soft */
function blotches(cells, alpha, tint) {
  const c = document.createElement("canvas"); c.width = cells; c.height = Math.ceil(cells * H / W);
  const g = c.getContext("2d"), im = g.createImageData(c.width, c.height);
  for (let i = 0; i < im.data.length; i += 4) {
    im.data[i] = tint[0]; im.data[i + 1] = tint[1]; im.data[i + 2] = tint[2];
    im.data[i + 3] = Math.floor(Math.pow(rnd(), 2.2) * alpha * 255);
  }
  g.putImageData(im, 0, 0);
  return c;
}
function paintGround() {
  const g = $("ground").getContext("2d");
  const rg = g.createRadialGradient(W * 0.46, H * 0.42, 0, W * 0.5, H * 0.5, W * 0.75);
  rg.addColorStop(0, PAL.bg2); rg.addColorStop(1, PAL.bg);
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  if (GROUNDS_V2[GROUND]) { GROUNDS_V2[GROUND](g); return; }
  if (GROUND === "paper") {
    /* an old sheet: soft stains at three scales, fibres, a burnt edge */
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    for (const [cells, a] of [[9, 0.20], [26, 0.14], [80, 0.08]]) g.drawImage(blotches(cells, a, [120, 84, 40]), 0, 0, W, H);
    g.globalAlpha = 0.55; g.fillStyle = g.createPattern(noiseCanvas(256, 0.10, true), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
    v.addColorStop(0, "rgba(90,55,20,0)"); v.addColorStop(1, "rgba(90,55,20,0.42)");
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return;
  }
  if (GROUND === "film") {
    /* a black frame of film: coarse grain, a soft hot spot off centre, a few specks of dust */
    g.globalAlpha = 1; g.fillStyle = "#070707"; g.fillRect(0, 0, W, H);
    const hot = g.createRadialGradient(W * 0.42, H * 0.38, 0, W * 0.5, H * 0.5, W * 0.7);
    hot.addColorStop(0, "rgba(255,255,255,0.075)"); hot.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hot; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.9; g.fillStyle = g.createPattern(noiseCanvas(256, 0.13, true), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = rnd() * H, r = 0.6 + rnd() * 1.6;
      g.fillStyle = `rgba(255,255,255,${(0.08 + rnd() * 0.25).toFixed(3)})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    return;
  }
  g.globalAlpha = GROUND === "flat" ? 0.18 : 0.5;
  g.fillStyle = g.createPattern(noiseCanvas(256, 0.06, false), "repeat"); g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
}

/* ── layers ────────────────────────────────────────────────────────────── */
/* a feature's size in radians (square root of its area on the sphere), measured once */
const _SIZE = new WeakMap();
function sizeSr(f) {
  let v = _SIZE.get(f);
  if (v === undefined) { v = Math.sqrt(Math.max(0, d3.geoArea(f))); _SIZE.set(f, v); }
  return v;
}
function landGradient(ctx) {
  const g = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, H);
  g.addColorStop(0, PAL.landLight); g.addColorStop(0.55, PAL.land); g.addColorStop(1, PAL.landDark);
  return g;
}
function drawGlobeBackdrop(ctx, path, k) {
  if (V2.globe[LANDS]) return V2.globe[LANDS](ctx, path, k);
  const show = cl((H * 1.25 - k) / (H * 0.7), 0, 1);       // only while the whole planet is in view
  if (show <= 0) return;
  ctx.save();
  ctx.globalAlpha = show;
  ctx.beginPath(); path({ type: "Sphere" });
  ctx.fillStyle = PAL.ocean; ctx.fill();
  if (LANDS === "glow") { ctx.shadowColor = PAL.glow; ctx.shadowBlur = 60; }
  ctx.strokeStyle = PAL.coast; ctx.lineWidth = LANDS === "paper" ? 2.4 : 2; ctx.globalAlpha = show * (LANDS === "glow" ? 0.5 : 0.8); ctx.stroke();
  ctx.restore();
}
function drawGraticule(ctx, path, k) {
  if (V2.grid[LANDS]) return V2.grid[LANDS](ctx, path, k);
  ctx.save();
  ctx.beginPath(); path(d3.geoGraticule().step(k > 2500 ? [5, 5] : [10, 10])());
  ctx.strokeStyle = PAL.grid; ctx.lineWidth = LANDS === "paper" ? 1.2 : 1; ctx.stroke();
  ctx.restore();
}
function drawLand(ctx, path, k) {
  const L = lodFor(k);
  if (V2.land[LANDS]) return V2.land[LANDS](ctx, path, k, L);
  if (LANDS === "terrain") return drawTerrain(ctx, path, k, L);
  const drawn = SCENE.near || LANDS !== "glow" ? L.others.concat(L.land) : L.land;
  if (LANDS === "paper") {
    /* The engraver's water lines: thin rings following the coast out to sea. Each is
       a wide stroke with a slightly narrower one cut out of it; the land fill drawn
       next covers the inner half, so only the rings at sea remain. */
    ctx.save();
    /* only once the camera is close enough to read them, and never round specks —
       rings round every islet on a globe looked like dust on the lens */
    ctx.beginPath();
    if (k / R_KM > 0.09) for (const f of drawn) { if (sizeSr(f) * k > 40) path(f); }
    ctx.lineJoin = "round";
    const sc = cl(k / 2500, 0.55, 1.2);
    for (const [w, a] of [[44, 0.35], [30, 0.55], [17, 0.8]]) {
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a;
      ctx.strokeStyle = PAL.waterLine; ctx.lineWidth = w * sc; ctx.stroke();
      ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = 1;
      ctx.lineWidth = w * sc - 3; ctx.stroke();
    }
    ctx.restore();
  }
  /* Everything that is context. Near (a country among its neighbours): readable land.
     Far (a state inside its country): barely there, so the country floats. */
  ctx.save();
  ctx.beginPath(); for (const f of L.others) path(f);
  /* no shadow on the context: a blurred shadow under hundreds of outlines tripled the render time */
  ctx.fillStyle = SCENE.near ? PAL.landNear : PAL.landDim; ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = SCENE.near ? 1.3 : 1; ctx.stroke();
  ctx.restore();
  if (!L.land.length) return;
  /* the countries the story is about */
  ctx.save();
  ctx.beginPath(); for (const f of L.land) path(f);
  if (LANDS === "glow") { ctx.shadowColor = PAL.glow; ctx.shadowBlur = 28; }
  else if (LANDS === "flat") { ctx.shadowColor = "rgba(30,40,60,0.18)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; }
  ctx.fillStyle = LANDS === "film" ? PAL.land : landGradient(ctx); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.clip();
  if (LANDS === "film") {
    ctx.globalAlpha = 0.6; ctx.fillStyle = GRAIN; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (L.a1mesh) {
      ctx.save(); ctx.beginPath(); path(L.a1mesh); ctx.setLineDash([4, 6]);
      ctx.strokeStyle = PAL.border; ctx.lineWidth = cl(k / 2600, 0.9, 1.8); ctx.stroke(); ctx.restore();
    }
    return;
  }
  if (LANDS !== "flat") { ctx.globalAlpha = LANDS === "paper" ? 0.45 : 0.55; ctx.fillStyle = GRAIN; ctx.fillRect(0, 0, W, H); }
  /* a broad soft light across the land, so it reads as a surface and not a flat fill */
  const lg = ctx.createRadialGradient(W * 0.32, H * 0.2, 0, W * 0.32, H * 0.2, W * 0.8);
  lg.addColorStop(0, "rgba(255,255,255,0.10)"); lg.addColorStop(1, LANDS === "glow" ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.05)");
  ctx.globalAlpha = 1; ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (L.a1mesh) {
    ctx.save();
    ctx.beginPath(); path(L.a1mesh);
    if (LANDS === "paper") ctx.setLineDash([7, 5]);
    ctx.strokeStyle = PAL.border; ctx.lineWidth = cl(k / 2600, 0.9, 2.2); ctx.stroke();
    ctx.restore();
  }
  /* the coast: a bright rim with a glow, an inked line, or a crisp edge */
  ctx.save();
  ctx.beginPath(); for (const f of L.land) path(f);
  if (LANDS === "glow") { ctx.shadowColor = PAL.glow; ctx.shadowBlur = 14; }
  ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1500, LANDS === "glow" ? 1.4 : 1.2, LANDS === "glow" ? 3.2 : 2.4) * (PAL.deco === "cartoon" ? 3.2 : 1); ctx.stroke();
  ctx.restore();
}

/* the picked-out shape: lit, textured, glowing — optionally floated off the map */
function shapeBounds(path, f) {
  const b = path.bounds(f);
  const ok = [b[0][0], b[0][1], b[1][0], b[1][1]].every(Number.isFinite);   /* nothing visible: far side of the globe */
  return { ok, x0: b[0][0], y0: b[0][1], x1: b[1][0], y1: b[1][1], cx: (b[0][0] + b[1][0]) / 2, cy: (b[0][1] + b[1][1]) / 2 };
}
function filmRing(ctx, cx, cy, rx, ry, amt, seedRot) {
  /* a red dotted ring, drawn round by hand: slightly uneven, the dashes appearing along the way */
  if (amt <= 0) return;
  ctx.save();
  ctx.strokeStyle = PAL.hi; ctx.lineWidth = 4.5; ctx.lineCap = "round";
  ctx.setLineDash([2, 16]);
  ctx.shadowColor = "rgba(224,58,46,0.5)"; ctx.shadowBlur = 6;
  ctx.globalAlpha = cl(amt * 3, 0, 1);
  const a0 = -Math.PI * 0.6 + (seedRot || 0), a1 = a0 + Math.PI * 2 * cl(amt, 0, 1);
  ctx.beginPath();
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, wob = 1 + 0.035 * Math.sin(a * 3 + (seedRot || 0) * 5) + 0.02 * Math.cos(a * 7);
    const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}
function drawHighlight(ctx, path, f, amt, glow, flat) {
  if (!f || amt <= 0 || !shapeBounds(path, f).ok) return;
  if (V2.hi[HISTYLE]) return V2.hi[HISTYLE](ctx, path, f, amt, glow, flat);
  if (HISTYLE === "film") {
    const bb = shapeBounds(path, f);
    if (!flat) {
      ctx.save(); ctx.globalAlpha = amt; ctx.beginPath(); path(f); ctx.fillStyle = PAL.hiWash; ctx.fill(); ctx.restore();
    }
    /* the ring marks the spot: never wider than a third of the frame, whatever the camera did */
    const rx = Math.min(W * 0.26, Math.max(60, (bb.x1 - bb.x0) * 0.62 + 30)), ry = Math.min(H * 0.32, Math.max(46, (bb.y1 - bb.y0) * 0.66 + 26));
    filmRing(ctx, bb.cx, bb.cy, rx, ry, amt, 0.4);
    return;
  }
  ctx.save();
  ctx.globalAlpha = amt;
  ctx.beginPath(); path(f);
  const bb = shapeBounds(path, f);
  if (HISTYLE === "terrain") {
    ctx.fillStyle = PAL.hiWash; ctx.fill();
    ctx.shadowColor = PAL.hiGlow; ctx.shadowBlur = 26 * glow;
    ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = amt * 0.85; ctx.strokeStyle = PAL.hiLight; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.restore();
    return;
  }
  if (flat) {
    /* a sea or a desert: tinted and outlined, not a solid piece of card */
    ctx.fillStyle = PAL.hiWash; ctx.fill();
    if (HISTYLE === "paper") ctx.fillStyle = GRAIN, ctx.globalAlpha = amt * 0.5, ctx.fill(), ctx.globalAlpha = amt;
    ctx.shadowColor = PAL.hiGlow; ctx.shadowBlur = (HISTYLE === "glow" ? 24 : 8) * glow;
    ctx.strokeStyle = HISTYLE === "glow" ? PAL.hiLight : PAL.hi; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.shadowColor = PAL.hiGlow; ctx.shadowBlur = (HISTYLE === "glow" ? 40 : 18) * glow;
  const g = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1);
  g.addColorStop(0, PAL.hiLight); g.addColorStop(0.5, PAL.hi); g.addColorStop(1, PAL.hiDark);
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = "transparent";
  if (HISTYLE !== "flat") {
    ctx.save(); ctx.clip();
    ctx.fillStyle = HISTYLE === "paper" ? GRAIN : WEAVE;
    ctx.fillRect(bb.x0 - 4, bb.y0 - 4, bb.x1 - bb.x0 + 8, bb.y1 - bb.y0 + 8);
    ctx.restore();
  }
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = HISTYLE === "paper" ? 2.6 : 2.2; ctx.globalAlpha = amt * 0.9; ctx.stroke();
  /* the look-kit decorations (maps.py SKINS[...].deco): drawn over the lit shape, clipped to it */
  if (PAL.deco === "hatch") {
    ctx.save(); ctx.clip(); ctx.strokeStyle = "rgba(20,14,10,0.5)"; ctx.lineWidth = 7;
    const span = (bb.y1 - bb.y0) + 60;
    for (let x = bb.x0 - span; x < bb.x1 + 40; x += 28) { ctx.beginPath(); ctx.moveTo(x, bb.y1 + 30); ctx.lineTo(x + span, bb.y0 - 30); ctx.stroke(); }
    ctx.restore();
  } else if (PAL.deco === "heat") {
    ctx.save(); ctx.clip();
    let s = 977 + Math.floor(bb.x0 + bb.y0);
    const rr = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    const wx = bb.x1 - bb.x0, wy = bb.y1 - bb.y0;
    for (let i = 0; i < 7; i++) {
      const x = bb.x0 + wx * (0.5 + rr() * 0.45), y = bb.y0 + wy * (0.2 + rr() * 0.6), r = Math.max(40, Math.min(wx, wy) * (0.14 + rr() * 0.12));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(224,50,43,0.85)"); g.addColorStop(0.55, "rgba(224,50,43,0.4)"); g.addColorStop(1, "rgba(224,50,43,0)");
      ctx.fillStyle = g; ctx.globalAlpha = amt; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(245,196,0,0.95)";
      for (let k = 0; k < 14; k++) { const a = rr() * Math.PI * 2, d = rr() * r * 0.8; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 3 + rr() * 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  } else if (PAL.deco === "cartoon") {
    ctx.strokeStyle = "#2A1D12"; ctx.lineWidth = 7; ctx.lineJoin = "round"; ctx.globalAlpha = amt; ctx.stroke();
  } else if (PAL.deco === "crosshair") {
    crosshair(ctx, bb.cx, bb.cy, Math.max(110, Math.min(W * 0.22, Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.55)), amt);
  }
  ctx.restore();
}
/* a red crosshair closing on the place (the DOSSIER chart skin): rings, hairlines, ticks */
function crosshair(ctx, cx, cy, r, amt) {
  if (amt <= 0) return;
  const p = eOut(cl(amt, 0, 1)), R = r * (1.8 - 0.8 * p);
  ctx.save();
  ctx.globalAlpha = cl(amt * 2, 0, 1);
  ctx.strokeStyle = "#E3231B"; ctx.lineWidth = 4; ctx.shadowColor = "rgba(227,35,27,0.7)"; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2); ctx.stroke();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3); ctx.lineTo(cx + Math.cos(a) * R * 1.4, cy + Math.sin(a) * R * 1.4); ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14)); ctx.stroke(); }
  ctx.restore();
}
function drawSocket(ctx, path, f, amt) {
  if (!f || amt <= 0 || !shapeBounds(path, f).ok) return;
  ctx.save();
  ctx.beginPath(); path(f);
  ctx.globalAlpha = amt;
  const bb = shapeBounds(path, f);
  const g = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1);
  g.addColorStop(0, PAL.socketLight || PAL.socket); g.addColorStop(1, PAL.socket);
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  /* An inner shadow along the top-left edge sells the hole the shape came out of.
     Only the SHADOW may land: the outline itself is drawn far off-canvas and its
     shadow offset back into place, or a hard black rim draws round the hole. */
  /* A path keeps the transform it was BUILT under, so it is rebuilt after the
     translate — stroking the old one drew a black rim in place and threw the
     shadow ten thousand pixels away, the exact opposite. */
  const far = 10000;
  ctx.translate(-far, 0);
  ctx.beginPath(); path(f);
  ctx.shadowColor = PAL.socketShadow || (LANDS === "glow" ? "rgba(0,0,0,0.6)" : LANDS === "paper" ? "rgba(60,38,16,0.45)" : "rgba(30,50,90,0.30)");
  ctx.shadowBlur = 22; ctx.shadowOffsetX = far + 7; ctx.shadowOffsetY = 10;
  ctx.lineWidth = 12; ctx.strokeStyle = "#000"; ctx.stroke();
  ctx.restore();
}

/* ── pins, plates, rings ───────────────────────────────────────────────── */
function ripple(ctx, x, y, t0, t, color, count) {
  if (V2.ripple[PINS]) return V2.ripple[PINS](ctx, x, y, t0, t, color, count);
  for (let i = 0; i < (count || 3); i++) {
    const p = ((t - t0) / 1.6 - i * 0.33);
    if (p <= 0) continue;
    const q = p % 1;
    ctx.save();
    ctx.globalAlpha = (PINS === "glow" ? 0.55 : 0.45) * (1 - q) * cl((t - t0) / 0.3, 0, 1);
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 14 + q * 90, (14 + q * 90) * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
/* a marker that falls in and bounces, with its shadow on the map: a teardrop, or on
   an old paper map a push pin stuck through it */
function drawPin(ctx, x, y, p, color, scale) {
  if (p <= 0) return;
  if (V2.pin[PINS]) return V2.pin[PINS](ctx, x, y, p, color, scale);
  if (PINS === "film") {
    const s = scale || 1;
    ctx.save();
    ctx.globalAlpha = cl(p * 3, 0, 1);
    ctx.fillStyle = color; ctx.shadowColor = "rgba(224,58,46,0.6)"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x, y, 9 * s * eOut(cl(p * 1.5, 0, 1)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    filmRing(ctx, x, y, 54 * s, 40 * s, cl(p, 0, 1), 1.1);
    return;
  }
  const s = scale || 1, fall = (1 - eBounce(cl(p, 0, 1))) * -150 * s;
  ctx.save();
  ctx.globalAlpha = cl(p * 4, 0, 1);
  if (PINS === "paper") {
    const R = 17 * s, lean = 16 * s, hx = x + lean * 0.55, hy = y - 34 * s + fall;
    ctx.fillStyle = "rgba(40,25,10,0.35)";
    ctx.beginPath(); ctx.ellipse(x + 20 * s, y + 4 * s, R * (0.6 + 0.5 * eOut(p)), R * 0.4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6f6a62"; ctx.lineWidth = 3 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y + fall * 0.2); ctx.lineTo(hx, hy); ctx.stroke();
    const g = ctx.createRadialGradient(hx - R * 0.35, hy - R * 0.4, R * 0.1, hx, hy, R);
    g.addColorStop(0, PAL.pinLight || color); g.addColorStop(1, color);
    ctx.shadowColor = "rgba(40,25,10,0.45)"; ctx.shadowBlur = 8 * s; ctx.shadowOffsetY = 4 * s;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(hx - R * 0.35, hy - R * 0.38, R * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const R = 23 * s, stem = 40 * s, hy = y - stem - R + fall;
  /* ground shadow grows as the pin lands */
  ctx.fillStyle = PINS === "glow" ? "rgba(0,0,0,0.45)" : "rgba(20,30,50,0.22)";
  ctx.beginPath(); ctx.ellipse(x, y, R * (0.5 + 0.5 * eOut(p)), R * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = PINS === "glow" ? "rgba(0,0,0,0.5)" : "rgba(20,30,50,0.25)"; ctx.shadowBlur = 16 * s; ctx.shadowOffsetY = 8 * s;
  ctx.beginPath();
  ctx.moveTo(x, y + fall);
  ctx.bezierCurveTo(x - R * 0.35, y - stem * 0.45 + fall, x - R, hy + R * 0.75, x - R, hy);
  ctx.arc(x, hy, R, Math.PI, 0, false);
  ctx.bezierCurveTo(x + R, hy + R * 0.75, x + R * 0.35, y - stem * 0.45 + fall, x, y + fall);
  const g = ctx.createLinearGradient(x - R, hy - R, x + R, y + fall);
  g.addColorStop(0, PAL.pinLight || color); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(x, hy, R * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function dot(ctx, x, y, r, color, alpha) {
  if (V2.dot[PINS]) return V2.dot[PINS](ctx, x, y, r, color, alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (PINS === "glow") { ctx.shadowColor = color; ctx.shadowBlur = r * 3; }
  else { ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.fillStyle = PINS === "paper" ? "#f3e6c8" : "#fff";
  ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* a name plate beside a point; flips to the other side near the frame edge */
function plate(ctx, x, y, text, alpha, side, ll) {
  if (alpha <= 0 || !text) return;
  if (V2.label[LABEL]) return V2.label[LABEL](ctx, x, y, text, alpha, side, ll);
  if (LABEL === "film") {
    /* handwritten beside the place, no box: the name writes on from the left */
    ctx.save();
    ctx.font = `700 60px ${PAL.hand || PAL.font}`;
    const label = String(text), w = ctx.measureText(label).width, gap = 26;
    const centre = side === "center";
    let right = side !== "left";
    if (!centre && right && x + gap + w > W - 40) right = false;
    if (!centre && !right && x - gap - w < 40) right = true;
    let bx = centre ? cl(x - w / 2, 30, W - 30 - w) : right ? x + gap : x - gap - w;
    if (KEEPIN) bx = cl(bx, 28, W - 28 - w);           /* v2: a name never runs off the frame */
    const by = centre ? y + 58 : y + 4;
    const reveal = eOut(cl(alpha, 0, 1));
    ctx.globalAlpha = cl(alpha * 1.5, 0, 1);
    ctx.beginPath(); ctx.rect(bx - 6, by - 60, (w + 12) * reveal, 90); ctx.clip();
    ctx.translate(bx, by); ctx.rotate(-0.045);
    ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = PAL.plateInk || PAL.ink; ctx.textBaseline = "alphabetic";
    ctx.fillText(label, 0, 0);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.font = `${PAL.weight} 30px ${PAL.font}`;
  try { ctx.letterSpacing = "1.5px"; } catch (e) { /* older canvas */ }
  const label = upper(text), w = ctx.measureText(label).width + (KEEPIN ? 1.5 * Array.from(label).length : 0);
  const padX = 16, h = 50, gap = 22, pw = w + padX * 2 + 6;
  /* "center" sits ON an area's label point — beside it, a country's name lands on its neighbour */
  const centre = side === "center";
  let right = side !== "left";
  if (!centre && right && x + gap + pw > W - 40) right = false;
  if (!centre && !right && x - gap - pw < 40) right = true;
  let bx = centre ? cl(x - pw / 2, 30, W - 30 - pw) : right ? x + gap : x - gap - pw, by = y - h / 2;
  if (KEEPIN) { bx = cl(bx, 28, W - 28 - pw); by = cl(by, 28, H - 28 - h); }
  const reveal = eOut(cl(alpha, 0, 1));
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1);
  const cw = pw * reveal, cx0 = centre ? bx + (pw - cw) / 2 : right ? bx : bx + pw - cw;
  ctx.beginPath(); ctx.rect(cx0, by - 4, cw, h + 8); ctx.clip();
  ctx.shadowColor = LABEL === "glow" ? "rgba(0,0,0,0.45)" : "rgba(30,20,10,0.22)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  ctx.fillStyle = PAL.plate; ctx.beginPath(); ctx.roundRect(bx, by, pw, h, LABEL === "paper" ? 2 : 6); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = PAL.hi; ctx.fillRect(right || centre ? bx : bx + pw - 6, by, 6, h);
  ctx.fillStyle = PAL.plateInk || PAL.ink; ctx.textBaseline = "middle";
  ctx.fillText(label, bx + padX + (right || centre ? 6 : 0), KEEPIN ? by + h / 2 + 2 : y + 2);
  ctx.restore();
}
function routeLine(ctx, path, line, t, frac) {
  if (V2.route[ROUTE]) return V2.route[ROUTE](ctx, path, line, t, frac);
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); path(line);
  if (ROUTE === "paper") {
    /* red string pulled between the pins */
    ctx.shadowColor = "rgba(40,20,10,0.35)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 5;
    ctx.strokeStyle = PAL.route; ctx.lineWidth = 5; ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (ROUTE === "film") {
    ctx.strokeStyle = PAL.route; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.setLineDash([3, 15]); ctx.lineDashOffset = -t * 30; ctx.stroke();
  } else if (ROUTE === "terrain") {
    const pts = flightPoints(line, frac == null ? 1 : frac);
    if (pts.length > 1) {
      /* the ground track under a flight: a dark dashed trace on the table, so the arc reads as height */
      if (pts.lifted) {
        ctx.setLineDash([10, 9]); ctx.strokeStyle = "rgba(0,0,0,0.42)"; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      }
      /* the war map's arrow: a thick red stroke on a dark edge, a slow white dash inside, a head on the end */
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 15; ctx.stroke();
      ctx.shadowColor = "transparent"; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = PAL.route; ctx.lineWidth = 10; ctx.stroke();
      ctx.setLineDash([2, 15]); ctx.lineDashOffset = -t * 46;
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3.2; ctx.stroke();
      ctx.setLineDash([]);
      arrowHeadAt(ctx, pts[Math.max(0, pts.length - 4)], pts[pts.length - 1]);
    }
  } else {
    if (ROUTE === "glow") { ctx.shadowColor = PAL.hiGlow; ctx.shadowBlur = 18; }
    ctx.strokeStyle = PAL.route; ctx.lineWidth = 6; ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.setLineDash([2, 16]); ctx.lineDashOffset = -t * 40;
    ctx.strokeStyle = ROUTE === "glow" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.95)"; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
}
/* A flight (no vehicle, or a plane) climbs off the table: every point of the line is lifted by
   the sine of how far along the whole route it is, so the arc starts and lands on the ground and
   peaks in the middle — a missile's path seen from the side. Ships, trucks, columns stay down. */
const GROUND_ICONS = new Set(["ship", "boat", "sail", "car", "train", "walk", "army", "horse", "truck"]);
function flightPoints(line, frac) {
  const co = (line && line.coordinates) || [];
  const out = [];
  for (const c of co) { const q = screen(c); if (q) out.push(q); }
  const stops = SCENE.stops || [];
  const lift = !GROUND_ICONS.has(String(SCENE.icon || "").toLowerCase()) && stops.length >= 2;
  if (!lift || out.length < 2) return out;
  const a = screen([stops[0].lon, stops[0].lat]), b = screen([stops[stops.length - 1].lon, stops[stops.length - 1].lat]);
  if (!a || !b) return out;
  const h = Math.min(260, 0.26 * Math.hypot(b[0] - a[0], b[1] - a[1]));
  const n = out.length;
  const up = out.map((q, i) => [q[0], q[1] - h * Math.sin(Math.PI * frac * (n > 1 ? i / (n - 1) : 1))]);
  up.lifted = true;
  return up;
}
function arrowHeadAt(ctx, a, b) {
  if (!a || !b || Math.hypot(b[0] - a[0], b[1] - a[1]) < 1) return;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 40, Wd = 28;
  ctx.save();
  ctx.translate(b[0], b[1]); ctx.rotate(ang);
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.beginPath(); ctx.moveTo(L * 0.62, 0); ctx.lineTo(-L * 0.38, Wd / 2); ctx.lineTo(-L * 0.18, 0); ctx.lineTo(-L * 0.38, -Wd / 2);
  ctx.closePath();
  ctx.fillStyle = PAL.route; ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

/* ── text ──────────────────────────────────────────────────────────────── */
const titleEl = $("title"), subEl = $("sub"), scrim = $("scrim");
/* measured, never guessed: the title shrinks until it fits its column */
function fitTitle(maxW, big, small) {
  let s = big;
  titleEl.style.whiteSpace = "nowrap";
  titleEl.style.fontSize = s + "px";
  while (s > small && titleEl.scrollWidth > maxW) { s -= 4; titleEl.style.fontSize = s + "px"; }
  if (titleEl.scrollWidth > maxW) { titleEl.style.whiteSpace = "normal"; titleEl.style.width = maxW + "px"; }
  return s;
}
/* Title and subtitle as one block. mode: "left" (beside a lifted shape, centred
   vertically), "bottom" (under a wide map, on a scrim) or "top". */
function placeText(mode, colW) {
  titleEl.textContent = upper(SCENE.title);
  subEl.textContent = SCENE.subtitle || "";
  titleEl.style.fontFamily = PAL.font; titleEl.style.fontWeight = PAL.weight;
  titleEl.style.color = PAL.ink; subEl.style.color = PAL.inkSoft;
  titleEl.style.textShadow = PAL.titleShadow || "none"; subEl.style.textShadow = PAL.subShadow || "none";
  subEl.style.fontFamily = PAL.subFont || PAL.font;
  if (V2.textStyle) V2.textStyle();
  /* the radar look: a flush-right bottom title stops short of the round radar in the corner (a long name ran into it) */
  if (V2.textStyle && tok("radar", false) && mode === "bottom") colW = Math.min(colW, W * 0.935 - 400);
  const left = W * 0.065;
  titleEl.style.left = left + "px";
  const ts = fitTitle(colW, (mode === "left" ? 150 : 118) * tok("titleScale", 1), 60);
  subEl.style.left = (left + 6) + "px";
  subEl.style.width = Math.max(colW, W * 0.5) + "px";
  subEl.style.fontSize = Math.round(mode === "left" ? cl(ts * 0.26, 30, 38) : cl(ts * 0.34, 34, 42)) + "px";
  const th = titleEl.getBoundingClientRect().height;
  const sh = SCENE.subtitle ? subEl.getBoundingClientRect().height + 6 : 0;
  // a vertical Short: YouTube covers the top ~12 % and the bottom ~22 %, so the title sits just above that band
  const tall = H > W;
  const top = mode === "left" ? H * 0.47 - (th + sh) / 2 : mode === "top" ? H * (tall ? 0.13 : 0.075)
            : H * (tall ? 0.76 : 0.905) - (th + sh);
  titleEl.style.top = top + "px";
  subEl.style.top = (top + th + 6) + "px";
  if (V2.textStyle) v2TextBox(mode, colW, left, top, th, sh);
  const sc = PAL.scrim || "0,0,0";
  scrim.style.background = mode === "bottom"
    ? `linear-gradient(to top, rgba(${sc},.72) 0%, rgba(${sc},.35) 26%, transparent 42%)`
    : mode === "top" ? `linear-gradient(to bottom, rgba(${sc},.66) 0%, rgba(${sc},.3) 24%, transparent 40%)`
    : LANDS === "glow" ? "none" : `linear-gradient(to right, rgba(${sc},.55) 0%, rgba(${sc},.25) 34%, transparent 50%)`;
  if (V2.textStyle && tok("scrim", true) === false) scrim.style.background = "none";   /* type with its own edge */
  return { top, bottom: top + th + sh, right: left + Math.min(colW, titleEl.scrollWidth), mid: top + th / 2 };
}
function wipe(el, p) {
  el.style.opacity = p > 0 ? 1 : 0;
  /* a script face overshoots its box on the right: the wipe ends past the edge, never on it */
  el.style.clipPath = `inset(-30% ${((1 - p) * 100 - 8 * p).toFixed(2)}% -30% -4%)`;
}
function textIn(t, at) {
  if (CAMERA === "film") at = Math.max(0.35, at - 0.5);
  if (!SCENE.title) { titleEl.style.opacity = 0; subEl.style.opacity = 0; return; }
  wipe(titleEl, eOut(seg(t, at, 0.7)));
  wipe(subEl, SCENE.subtitle ? eOut(seg(t, at + 0.45, 0.8)) : 0);
  scrim.style.opacity = eOut(seg(t, at - 0.2, 0.6)).toFixed(3);
  if (V2.textDeco) V2.textDeco(t, at);
}
/* v2: the title block's real extent (for its decoration), and a bottom title set flush right (the radar look) */
function v2TextBox(mode, colW, left, top, th, sh) {
  const range = document.createRange();
  const tw = Math.min(colW, titleEl.scrollWidth);
  let sw = 0;
  if (SCENE.subtitle) { range.selectNodeContents(subEl); sw = Math.min(Math.max(colW, W * 0.5), range.getBoundingClientRect().width); }
  let x0 = left;
  if (mode === "bottom" && tok("titleAlign", "left") === "right") {
    const edge = W * 0.935;
    titleEl.style.left = (edge - tw) + "px";
    /* measured, not trusted: the glyphs' real right edge (plus an italic's lean) lands on the edge, never past it */
    range.selectNodeContents(titleEl);
    const fs = parseFloat(titleEl.style.fontSize) || 100;
    const over = range.getBoundingClientRect().right + (tok("titleItalic", false) ? fs * 0.12 : 0) - edge;
    if (over > 0) titleEl.style.left = (edge - tw - over) + "px";
    const sub = Math.max(colW, W * 0.5);
    subEl.style.left = (edge - sub) + "px"; subEl.style.textAlign = "right";
    x0 = edge - Math.max(tw + Math.max(0, over), sw);
    window.__tbox = { tw, over, left: titleEl.style.left, scrollW: titleEl.scrollWidth, fs };
  }
  TBOX = { left: x0, top, bottom: top + th + sh, right: x0 + Math.max(tw, sw), split: top + th + 3 };
}

/* ── shots ─────────────────────────────────────────────────────────────── */
const SHOTS = {};

/* REGION — the reference move: the country, a push in, the place lights up, lifts
   off the map and the name writes itself on beside it. Seas and deserts light up
   in place instead of lifting. */
SHOTS.region = () => {
  const tg = SCENE.targets[0];
  const flat = tg.level === "water" || tg.level === "region";
  const liftOn = !flat && tg.lift !== false && LIFT;
  const probe = fit(tg.frame, [0, 0, W * 0.3, H * 0.3]);
  const aspect = probe.bw / Math.max(1, probe.bh);
  const side = aspect < 1.35;
  const socketBox = !liftOn ? (side ? [W * 0.40, H * 0.12, W * 0.92, H * 0.88] : [W * 0.10, H * 0.08, W * 0.90, H * 0.66])
                            : (side ? [W * 0.20, H * 0.13, W * 0.54, H * 0.87] : [W * 0.17, H * 0.10, W * 0.83, H * 0.61]);
  const end = CAMERA === "film" ? { ...zoomAbout(fit(tg.frame, socketBox), 0.62), tilt: 9 } : { ...fit(tg.frame, socketBox), tilt: side ? 10 : 8 };
  const start = CAMERA === "globe" ? globeStart(end) : SCENE.context && SCENE.context.frame
    ? { ...fit(SCENE.context.frame, [W * 0.08, H * 0.08, W * 0.92, H * 0.92]), tilt: 18 }
    : { ...zoomAbout(end, 0.35), tilt: 18 };
  const path0 = fly(start, end);
  const liftDX = side ? W * 0.30 : 0, liftDY = side ? -H * 0.02 : -H * 0.035;
  const flyA = 0.12, flyB = HIT + 0.1;
  const txt = placeText(side ? "left" : "bottom", side ? (liftOn ? W * 0.42 : W * 0.34) : W * 0.8);

  return t => {
    let cam = settle(path0(approach(t, flyA, flyB)), t);
    cam = zoomAbout(cam, 1 + 0.035 * eSine(seg(t, flyB, D - flyB)));   /* the camera never quite stops */
    cam = orbit(cam, t, flyB + 1.0, D - 0.2);
    applyCam(cam);
    const k = cam.k, f = feature(tg.id, k);
    const hiAmt = eOut(seg(t, HIT - 0.2 - (CAMERA === "film" ? 0.5 : 0), 0.45));
    const L = liftOn ? eBack(seg(t, HIT + 0.3, 0.75)) : 0, Lc = cl(L, 0, 1.2), L1 = cl(L, 0, 1);

    bctx.clearRect(0, 0, W, H);
    drawGlobeBackdrop(bctx, bpath, k);
    drawGraticule(bctx, bpath, k);
    drawLand(bctx, bpath, k);
    if (liftOn) {
      drawSocket(bctx, bpath, f, cl(L * 1.4, 0, 1));
      drawHighlight(bctx, bpath, f, hiAmt * (1 - cl(L * 1.6, 0, 1)), 1);
    } else {
      drawHighlight(bctx, bpath, f, hiAmt, 1 + 0.25 * Math.sin((t - HIT) * 2.2), flat);
    }
    base.style.filter = liftOn ? `blur(${(2.2 * L1).toFixed(2)}px) brightness(${(1 - (LANDS === "glow" ? 0.18 : 0.06) * L1).toFixed(3)})` : "none";

    lctx.clearRect(0, 0, W, H);
    const bbL = f ? shapeBounds(bpath, f) : null;
    if (liftOn && f && L > 0.001 && bbL.ok) {
      const bb = bbL;
      const bob = Math.sin((t - HIT) * 1.3) * 3 * L1;
      lctx.save();
      lctx.translate(bb.cx + liftDX * Lc, bb.cy + liftDY * Lc + bob);
      const sc = 1 + 0.07 * Lc;
      lctx.scale(sc, sc);
      lctx.translate(-bb.cx, -bb.cy);
      /* the shadow it casts on the map below */
      lctx.save();
      lctx.beginPath(); lpath(f);
      lctx.shadowColor = PAL.liftShadow || "rgba(0,0,0,0.6)"; lctx.shadowBlur = 36 * L1;
      lctx.shadowOffsetX = -18 * Lc; lctx.shadowOffsetY = 26 * Lc;
      lctx.fillStyle = PAL.liftBody || "rgba(0,0,0,0.9)"; lctx.fill();
      lctx.restore();
      drawHighlight(lctx, lpath, f, 1, 1.25);
      /* a slow sheen crossing the raised shape */
      const sw = seg(t, HIT + 1.6, 1.1);
      if (sw > 0 && sw < 1) {
        lctx.save(); lctx.beginPath(); lpath(f); lctx.clip();
        const x = lerp(bb.x0 - 200, bb.x1 + 200, eInOut(sw));
        const g = lctx.createLinearGradient(x - 120, bb.y0, x + 120, bb.y1);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.22)"); g.addColorStop(1, "rgba(255,255,255,0)");
        lctx.fillStyle = g; lctx.fillRect(bb.x0 - 10, bb.y0 - 10, bb.x1 - bb.x0 + 20, bb.y1 - bb.y0 + 20);
        lctx.restore();
      }
      lctx.restore();
    }

    /* a soft disc breathes out behind the name as it lands */
    fctx.clearRect(0, 0, W, H);
    const rp = seg(t, HIT + 0.55, 1.5);
    if (rp > 0 && rp < 1 && f && side && liftOn) {
      fctx.save();
      fctx.globalAlpha = 0.30 * (1 - eIn(rp));
      fctx.fillStyle = PAL.ring;
      fctx.beginPath(); fctx.arc(W * 0.27, txt.mid, lerp(40, 230, eOut(rp)), 0, Math.PI * 2); fctx.fill();
      fctx.restore();
    }
    textIn(t, HIT + (liftOn ? 0.45 : 0.25));
  };
};

/* PIN — a city: the country, a push in, the pin drops on the word and rings
   ripple out while a line runs from the pin to its name. */
SHOTS.pin = () => {
  const tg = SCENE.targets[0], P = [tg.lon, tg.lat];
  const txt0 = { mode: "left", colW: W * 0.36 };
  const endBox = [W * 0.44, H * 0.12, W * 0.94, H * 0.88];
  let end = { ...fit(tg.frame, endBox), tilt: 12 };
  /* keep the pin itself comfortably inside the map side of the frame */
  applyCam(end);
  const q = ortho(P);
  const sx = cl(q[0], W * 0.52, W * 0.84), sy = cl(q[1], H * 0.30, H * 0.74);
  end = aimAt(end, P, sx, sy);
  const start = CAMERA === "globe" ? globeStart(end) : SCENE.context && SCENE.context.frame
    ? { ...fit(SCENE.context.frame, [W * 0.08, H * 0.08, W * 0.92, H * 0.92]), tilt: 20 }
    : { ...zoomAbout(end, 0.4), tilt: 20 };
  const path0 = fly(start, end);
  const flyA = 0.12, flyB = HIT;
  const txt = placeText(txt0.mode, txt0.colW);

  return t => {
    let cam = settle(path0(approach(t, flyA, flyB)), t);
    cam = zoomAbout(cam, 1 + 0.04 * eSine(seg(t, flyB, D - flyB)));
    cam = orbit(cam, t, flyB + 1.0, D - 0.2);
    applyCam(cam);
    const k = cam.k;
    bctx.clearRect(0, 0, W, H);
    drawGlobeBackdrop(bctx, bpath, k);
    drawGraticule(bctx, bpath, k);
    drawLand(bctx, bpath, k);
    if (tg.area && HISTYLE !== "film") drawHighlight(bctx, bpath, feature(tg.area, k), 0.55 * eOut(seg(t, HIT - 0.1, 0.5)), 0.6, true);

    lctx.clearRect(0, 0, W, H);
    fctx.clearRect(0, 0, W, H);
    const p = screen(P);
    if (p) {
      const early = CAMERA === "film" ? 0.55 : 0;          /* the film look: the mark lands as the camera arrives */
      ripple(lctx, p[0], p[1], HIT + 0.25 - early, t, PAL.hiLight, 3);
      drawPin(lctx, p[0], p[1], seg(t, HIT - 0.15 - early, 0.85), PAL.pin, 1.15);
      /* the leader: from the end of the name block to the foot of the pin */
      const lp = eInOut(seg(t, HIT + 0.55, 0.6));
      if (lp > 0 && SCENE.title) {
        const x0 = Math.min(txt.right + 40, p[0] - 60), y0 = txt.mid;
        const xm = lerp(x0, p[0] - 34, 0.55);
        fctx.save();
        fctx.strokeStyle = PAL.leader; fctx.lineWidth = 3; fctx.globalAlpha = 0.9;
        fctx.beginPath(); fctx.moveTo(x0, y0);
        const pts = [[x0, y0], [xm, y0], [p[0] - 30, p[1] - 30]];
        const l1 = Math.hypot(pts[1][0] - pts[0][0], 0), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
        const L = (l1 + l2) * lp;
        if (L <= l1) fctx.lineTo(x0 + L, y0);
        else { const u = (L - l1) / l2; fctx.lineTo(xm, y0); fctx.lineTo(lerp(xm, pts[2][0], u), lerp(y0, pts[2][1], u)); }
        fctx.stroke();
        fctx.fillStyle = PAL.leader; fctx.beginPath(); fctx.arc(x0, y0, 5, 0, Math.PI * 2); fctx.fill();
        fctx.restore();
      }
    }
    textIn(t, HIT + 0.2);
  };
};

/* ROUTE — a journey. The line draws from stop to stop with a plane, a ship or a
   glowing head on it; the camera pulls out as the line grows; each stop names
   itself as the line reaches it. */
SHOTS.route = () => {
  const stops = SCENE.stops || [];
  const pts = stops.map(s => [s.lon, s.lat]);
  /* sample every leg along its great circle */
  const line = [], cum = [0];
  for (let i = 0; i < pts.length - 1; i++) {
    const gi = d3.geoInterpolate(pts[i], pts[i + 1]), dd = d3.geoDistance(pts[i], pts[i + 1]);
    const n = Math.max(2, Math.ceil(dd / 0.004));
    for (let j = (i ? 1 : 0); j <= n; j++) line.push(gi(j / n));
  }
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + d3.geoDistance(line[i - 1], line[i]));
  const total = cum[cum.length - 1] || 1e-6;
  const stopAt = pts.map(p => { let best = 0, bd = 9; line.forEach((q, i) => { const d = d3.geoDistance(p, q); if (d < bd) { bd = d; best = i; } }); return cum[best] / total; });
  const mode = SCENE.text_at === "top" ? "top" : "bottom";
  const txt = placeText(mode, W * 0.8);
  const mapBox = mode === "bottom" ? [W * 0.08, H * 0.08, W * 0.92, H * 0.70] : [W * 0.08, H * 0.30, W * 0.92, H * 0.92];
  const end = { ...fit(SCENE.frame, mapBox), tilt: 10 };
  const firstBox = SCENE.first_frame || SCENE.frame;
  const start = CAMERA === "globe" ? globeStart(end) : { ...fit(firstBox, [W * 0.2, H * 0.12, W * 0.8, H * 0.78]), tilt: 16 };
  /* A stop may carry `at`: the second its name is spoken. Then the line reaches each stop
     exactly then, leg by leg, instead of crossing the whole route at one speed. */
  const timed = stops.length > 1 && stops.every((st, i) => st.via || typeof st.at === "number");
  const DRAW0 = timed ? (stops[0].at != null ? stops[0].at + 0.25 : HIT) : HIT;
  const DRAW1 = timed ? stops[stops.length - 1].at : Math.min(D - 1.4, HIT + (SCENE.draw_s || cl(2.2 + total * 2.2, 2.4, 4.6)));
  const keys = timed ? stops.map((st, i) => ({ t: i === 0 ? DRAW0 : st.at, f: stopAt[i] })).filter((k, i) => !stops[i].via || i === 0) : null;
  function fracAt(t) {
    if (!timed) return eInOut(seg(t, DRAW0, DRAW1 - DRAW0));
    if (t <= keys[0].t) return 0;
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) return lerp(keys[i - 1].f, keys[i].f, eInOut(seg(t, keys[i - 1].t, keys[i].t - keys[i - 1].t)));
    }
    return 1;
  }
  const path0 = fly(start, end);
  const icon = SCENE.icon ? { p: new Path2D(SCENE.icon.d), vb: (SCENE.icon.vb || "0 0 512 512").split(/\s+/).map(Number) } : null;

  function partial(frac) {
    const L = frac * total;
    let i = 1;
    while (i < cum.length && cum[i] < L) i++;
    const out = line.slice(0, i);
    if (i < line.length) {
      const u = (L - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
      out.push(d3.geoInterpolate(line[i - 1], line[i])(u));
    }
    return out;
  }

  return t => {
    const u = CAMERA === "film" ? eOut(seg(t, 0, DRAW1 + 0.3)) : eInOut(seg(t, 0.1, DRAW1 - 0.1 + 0.4));
    let cam = path0(u);
    cam = zoomAbout(cam, 1 + 0.03 * eSine(seg(t, DRAW1, D - DRAW1)));
    cam = orbit(cam, t, DRAW1 + 0.3, D - 0.2);
    applyCam(cam);
    const k = cam.k;
    bctx.clearRect(0, 0, W, H);
    drawGlobeBackdrop(bctx, bpath, k);
    drawGraticule(bctx, bpath, k);
    drawLand(bctx, bpath, k);

    lctx.clearRect(0, 0, W, H);
    const frac = fracAt(t);
    if (frac > 0) routeLine(lctx, lpath, { type: "LineString", coordinates: partial(frac) }, t, frac);
    /* stops: a dot and a plate as the line arrives; the first one is there from the start */
    stops.forEach((s, i) => {
      const p = screen(pts[i]);
      if (!p) return;
      const arrive = timed && typeof s.at === "number" ? s.at - (i === 0 ? 0.15 : 0.05)
                   : i === 0 ? HIT - 0.4 : DRAW0 + (DRAW1 - DRAW0) * eInOut(stopAt[i]) - 0.05;
      const a = seg(t, arrive, 0.45);
      if (a <= 0 || s.via) return;
      ripple(lctx, p[0], p[1], arrive, t, PAL.hiLight, 2);
      dot(lctx, p[0], p[1], 11, PAL.pin, eOut(a));
      plate(lctx, p[0], p[1], s.name, seg(t, arrive + 0.15, 0.5), i === 0 && pts.length > 1 && pts[1][0] > pts[0][0] ? "left" : "right", pts[i]);
    });
    /* the head: a plane points where it flies; a ship or a walker only faces left or right */
    if (frac > 0 && frac < 1) {
      const cur = partial(frac), hd = cur[cur.length - 1], prev = cur[Math.max(0, cur.length - 4)];
      const a = screen(hd), b = screen(prev);
      if (a && b) {
        if (icon && ROUTE !== "terrain") {
          const ang = Math.atan2(a[1] - b[1], a[0] - b[0]), S = 64 / Math.max(icon.vb[2], icon.vb[3]);
          lctx.save();
          lctx.translate(a[0], a[1]);
          if (SCENE.icon_rotate) lctx.rotate(ang + (SCENE.icon_angle || 0) * Math.PI / 180);
          else if (a[0] < b[0]) lctx.scale(-1, 1);
          lctx.scale(S, S); lctx.translate(-icon.vb[2] / 2, -icon.vb[3] / 2);
          lctx.shadowColor = "rgba(0,0,0,0.6)"; lctx.shadowBlur = 10 / S;
          lctx.fillStyle = PAL.icon || "#ffffff"; lctx.fill(icon.p);
          lctx.restore();
        } else if (ROUTE !== "terrain") dot(lctx, a[0], a[1], 12, "#ffffff", 1);   /* the war map's arrow is its own head */
      }
    }
    fctx.clearRect(0, 0, W, H);
    textIn(t, 0.35);
  };
};

/* MULTI — several places named in one breath: the map that holds them all, each
   lighting up in turn with its name beside it. */
SHOTS.multi = () => {
  const tgs = SCENE.targets || [];
  const mode = SCENE.title ? "bottom" : "none";
  const txt = mode === "none" ? null : placeText("bottom", W * 0.8);
  const box = mode === "none" ? [W * 0.08, H * 0.1, W * 0.92, H * 0.9] : [W * 0.08, H * 0.08, W * 0.92, H * 0.70];
  const step = tgs.length > 1 ? cl((D - HIT - 2.2) / tgs.length, 0.35, 0.9) : 0;
  const hits = tgs.map((tg, i) => tg.hit != null ? tg.hit : HIT + i * step);
  let camAt;
  if (SCENE.tour) {
    /* one view per place, flown between so each arrives as it is named */
    const cams = SCENE.frames.map(f => ({ ...fit(f, box), tilt: 10 }));
    const legs = cams.slice(1).map((c, i) => fly(cams[i], c));
    const first = fly(CAMERA === "globe" ? globeStart(cams[0]) : { ...zoomAbout(cams[0], 0.55), tilt: 18 }, cams[0]);
    camAt = t => {
      if (t < hits[0] || cams.length === 1) return first(eInOut(seg(t, 0.1, hits[0] - 0.1)));
      for (let i = legs.length - 1; i >= 0; i--) {
        const a = Math.max(hits[i] + 0.5, hits[i + 1] - 1.6), b = hits[i + 1] - 0.05;
        if (t >= a) return legs[i](eInOut(seg(t, a, b - a)));
      }
      return cams[0];
    };
  } else {
    const end = { ...fit(SCENE.frame, box), tilt: 10 };
    const path0 = fly(CAMERA === "globe" ? globeStart(end) : { ...zoomAbout(end, 0.72), tilt: 18 }, end);
    camAt = t => path0(eInOut(seg(t, 0.1, HIT + 0.2)));
  }

  return t => {
    let cam = camAt(t);
    cam = zoomAbout(cam, 1 + 0.03 * eSine(seg(t, HIT, D - HIT)));
    applyCam(cam);
    const k = cam.k;
    bctx.clearRect(0, 0, W, H);
    drawGlobeBackdrop(bctx, bpath, k);
    drawGraticule(bctx, bpath, k);
    drawLand(bctx, bpath, k);
    lctx.clearRect(0, 0, W, H);
    tgs.forEach((tg, i) => {
      const at = hits[i];
      const a = eOut(seg(t, at - 0.1, 0.45));
      if (tg.level === "point") {
        const p = screen([tg.lon, tg.lat]);
        if (p) { ripple(lctx, p[0], p[1], at, t, PAL.hiLight, 2); dot(lctx, p[0], p[1], 11, PAL.pin, a); }
      } else {
        drawHighlight(bctx, bpath, feature(tg.id, k), a, 0.8, tg.level === "water" || tg.level === "region");
      }
      const lp = screen(tg.label || [tg.lon, tg.lat]);
      if (lp) plate(lctx, lp[0], lp[1], tg.name, seg(t, at + 0.2, 0.5), tg.level === "point" ? "right" : "center", tg.label || [tg.lon, tg.lat]);
    });
    fctx.clearRect(0, 0, W, H);
    if (txt) textIn(t, 0.4);
  };
};

/* ══ autostyle v2 map looks (maps.py SKINS[<look>].look + lookreg/maps.py) ════════════════════════════════════
   Everything below is reached only through a style token a v2 look sets in PAL.look. The nine shipped skins never
   name these styles, so they draw exactly as they always did (proved frame by frame, build/maps/pixcheck.py).
   Static decor is painted ONCE (ground, overlay); per-frame work stays on the story features, routes and pins —
   a shadowBlur over hundreds of context outlines once tripled the render time. Decor has its own seeded generator:
   rnd() is one stream and every shipped skin's grain depends on what it hands out first. */
const V2 = { globe: {}, grid: {}, land: {}, hi: {}, pin: {}, dot: {}, ripple: {}, label: {}, route: {},
             post: null, boot() {}, textStyle: null, textDeco: null, now: 0 };
const V2ON = Object.keys(LK).length > 0;
function rng2(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const GLOWC = PAL.glowColor || PAL.hiGlow || "rgba(255,255,255,0.6)";
const GLOWL = PAL.glowLight || GLOWC;
const LFONT = PAL.labelFont || PAL.font;
const LWEIGHT = PAL.labelWeight || PAL.weight;
const MFONT = PAL.monoFont || LFONT;            /* coordinates and readouts (a look that names a mono face) */
const MWEIGHT = PAL.monoWeight || LWEIGHT;

/* the ONE glow family of the title (lookreg.common.GLOW_FAMILIES), under a route or a pin: only the light is drawn
   here — the element draws its own core after. build() issues the path and the stroke/fill; it is run far off the
   canvas and only its shadow is offset back (a path keeps the transform it was built under, so build() rebuilds). */
function glowUnder(ctx, build, mul, color) {
  if (!GLOW) return;
  const fam = String(GLOW.family || "none");
  if (fam === "none") return;
  const s = cl(GLOW.strength == null ? 0.6 : +GLOW.strength, 0, 1), m = mul || 1, c = color || GLOWC;
  const P = {
    soft: [["rgba(0,0,0,1)", 0.34, 16, 3]],
    bloom: [[GLOWL, 0.42, 8, 0], [c, 0.24, 26, 0]],
    neon: [[c, 0.62, 4, 0], [c, 0.38, 12, 0], [c, 0.20, 30, 0]],
    halo: [[GLOWL, 0.32, 44, 0]],
    rim: [[GLOWL, 0.95, 2.5, 0], ["rgba(0,0,0,1)", 0.30, 12, 2]],
    halation: [["#FF5A1E", 0.42, 5, 0], ["#FF7A30", 0.20, 16, 0]],
  }[fam] || [];
  const far = 20000;
  for (const [col, a, b, dy] of P) {
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * cl(a * s / 0.6, 0, 1);
    ctx.translate(-far, 0);
    ctx.shadowColor = col; ctx.shadowBlur = b * m; ctx.shadowOffsetX = far; ctx.shadowOffsetY = dy * m;
    build();
    ctx.restore();
  }
}
/* a neon tube switching on, `dt` seconds after the switch: dark, one short flick, a breath of dark, then it warms up
   to full — deterministic in time, so every render of a frame is the same (the neon sign look only) */
function ignite(dt) {
  if (dt >= 0.75) return 1;
  if (dt < 0.06) return 0;
  if (dt < 0.13) return 0.78;
  if (dt < 0.26) return 0.16;
  return 0.16 + 0.84 * smooth(cl((dt - 0.26) / 0.49, 0, 1));
}

/* ── static textures ── */
function noiseR(size, alpha, r) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), im = g.createImageData(size, size);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.floor(alpha * 255 * r());
  }
  g.putImageData(im, 0, 0);
  return c;
}
function edgeDark(g, color, inner) {
  const v = g.createRadialGradient(W / 2, H / 2, H * (inner || 0.35), W / 2, H / 2, W * 0.74);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, color);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}
function gridLines(g, step, color, width, x0, y0) {
  g.save(); g.strokeStyle = color; g.lineWidth = width || 1; g.beginPath();
  for (let x = (x0 || 0) % step; x <= W; x += step) { const xx = Math.round(x) + 0.5; g.moveTo(xx, 0); g.lineTo(xx, H); }
  for (let y = (y0 || 0) % step; y <= H; y += step) { const yy = Math.round(y) + 0.5; g.moveTo(0, yy); g.lineTo(W, yy); }
  g.stroke(); g.restore();
}
/* a print screen at 45 degrees: dots on a diagonal grid, ~8.5 px apart (finer swims under h264), static on screen */
function halftone(color, r) {
  const P = 12, c = document.createElement("canvas"); c.width = c.height = P;
  const g = c.getContext("2d"); g.fillStyle = color;
  for (const [x, y] of [[0, 0], [P, 0], [0, P], [P, P], [P / 2, P / 2]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  return bctx.createPattern(c, "repeat");
}
const GROUNDS_V2 = {
  desk(g) {                 /* investigator: a dark desk under one lamp, the light falling off to the corners */
    const r = rng2(4111);
    const lamp = g.createRadialGradient(W * 0.42, H * 0.30, 0, W * 0.42, H * 0.30, W * 0.66);
    lamp.addColorStop(0, PAL.lamp || "rgba(255,226,170,0.13)"); lamp.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = lamp; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.55; g.fillStyle = g.createPattern(noiseR(256, 0.07, r), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; edgeDark(g, "rgba(0,0,0,0.6)", 0.28);
  },
  newsprint(g) {            /* newsprint: grey-cream stock, its fibre, a slightly uneven ink density */
    const r = rng2(5227);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    for (const [cells, a] of [[11, 0.05], [38, 0.05]]) {
      const c = document.createElement("canvas"); c.width = cells; c.height = Math.ceil(cells * H / W);
      const cg = c.getContext("2d"), im = cg.createImageData(c.width, c.height);
      for (let i = 0; i < im.data.length; i += 4) { im.data[i] = 70; im.data[i + 1] = 66; im.data[i + 2] = 58; im.data[i + 3] = Math.floor(Math.pow(r(), 2.4) * a * 255); }
      cg.putImageData(im, 0, 0); g.drawImage(c, 0, 0, W, H);
    }
    g.globalAlpha = 0.6; g.fillStyle = g.createPattern(noiseR(256, 0.09, r), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; edgeDark(g, "rgba(60,52,40,0.22)", 0.45);
  },
  blueprint(g) {            /* drafting film: a fine grid, a heavier one every fifth line */
    const r = rng2(6343);
    gridLines(g, 24, PAL.gridMinor || "rgba(255,255,255,0.05)", 1);
    gridLines(g, 120, PAL.gridMajor || "rgba(255,255,255,0.11)", 1);
    g.globalAlpha = 0.35; g.fillStyle = g.createPattern(noiseR(256, 0.06, r), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; edgeDark(g, PAL.edge || "rgba(0,8,24,0.5)", 0.32);
  },
  ops(g) {                  /* an operations table: a plotting grid under the map */
    const r = rng2(7459);
    gridLines(g, 24, PAL.gridMinor || "rgba(200,220,180,0.035)", 1);
    gridLines(g, 96, PAL.gridMajor || "rgba(200,220,180,0.085)", 1);
    g.globalAlpha = 0.5; g.fillStyle = g.createPattern(noiseR(256, 0.07, r), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; edgeDark(g, "rgba(0,0,0,0.55)", 0.3);
  },
  space(g) {                /* the dark around a globe: a few hundred quiet stars, never a starfield screensaver */
    const r = rng2(8573);
    for (let i = 0; i < 380; i++) {
      const x = r() * W, y = r() * H, b = Math.pow(r(), 3), rad = 0.5 + b * 1.3;
      g.fillStyle = `rgba(${215 + Math.floor(r() * 40)},${225 + Math.floor(r() * 30)},255,${(0.12 + b * 0.6).toFixed(3)})`;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    edgeDark(g, "rgba(0,0,0,0.6)", 0.3);
  },
  atlas(g) {                /* a clean cream sheet: the tooth of the paper, no stains (an engraved atlas is a new book) */
    const r = rng2(9689);
    g.globalAlpha = 0.5; g.fillStyle = g.createPattern(noiseR(256, 0.07, r), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; edgeDark(g, PAL.edge || "rgba(110,80,40,0.20)", 0.42);
  },
  scan(g) {                 /* a dark screen or a projection table: a faint grid and a pool of light */
    const pool = g.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, W * 0.6);
    pool.addColorStop(0, PAL.tableGlow || "rgba(0,0,0,0)"); pool.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = pool; g.fillRect(0, 0, W, H);
    gridLines(g, 80, PAL.gridMajor || "rgba(255,255,255,0.04)", 1);
    edgeDark(g, "rgba(0,0,0,0.7)", 0.3);
  },
  flatwater(g) {            /* a pause-menu map: one flat sea */
    const r = rng2(1031);
    g.fillStyle = PAL.bg; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.25; g.fillStyle = g.createPattern(noiseR(256, 0.05, r), "repeat"); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  },
  clean(g) {                /* a plain light field for the explainer */
    edgeDark(g, PAL.edge || "rgba(30,40,60,0.10)", 0.5);
  },
  night(g) {                /* the neon sign's night: black, a dot matrix where the sea is, a low haze of the tube's
                               colour (static on screen, 26 px apart: nothing fine enough to swim under h264) */
    const step = 26;
    g.fillStyle = PAL.dots || "rgba(200,210,235,0.07)";
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    const hz = g.createRadialGradient(W * 0.5, H * 1.1, 0, W * 0.5, H * 1.1, W * 0.62);
    hz.addColorStop(0, PAL.haze || "rgba(0,0,0,0)"); hz.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = hz; g.fillRect(0, 0, W, H);
    edgeDark(g, "rgba(0,0,0,0.72)", 0.3);
  },
};

/* ── overlay: static decor ABOVE the map and under the type (painted once) ── */
function overlayCanvas(id, before) {
  const c = document.createElement("canvas"); c.id = id; c.width = W; c.height = H;
  c.style.position = "absolute"; c.style.left = "0"; c.style.top = "0"; c.style.width = W + "px"; c.style.height = H + "px";
  c.style.pointerEvents = "none";
  $("stage").insertBefore(c, $(before));
  return c;
}
const OVERLAYS = {
  neatline(g) {             /* the engraved sheet's frame: a heavy and a hairline rule, and a compass rose */
    g.strokeStyle = PAL.ink; g.globalAlpha = 0.75;
    g.lineWidth = 3; g.strokeRect(30.5, 30.5, W - 61, H - 61);
    g.lineWidth = 1; g.strokeRect(40.5, 40.5, W - 81, H - 81);
    compass(g, W - 150, H - 160, 64);
    g.globalAlpha = 1;
  },
  masthead(g) {             /* a newspaper page: a thick rule and a hairline across the top, a hairline at the foot */
    g.fillStyle = PAL.ink; g.globalAlpha = 0.85;
    g.fillRect(W * 0.04, 36, W * 0.92, 5); g.fillRect(W * 0.04, 47, W * 0.92, 1.5);
    g.fillRect(W * 0.04, H - 40, W * 0.92, 1.5);
    g.globalAlpha = 1;
  },
  sheet(g) {                /* a drawing sheet: a double border and registration crosses in the corners */
    g.strokeStyle = PAL.ink; g.globalAlpha = 0.55; g.lineWidth = 1.5;
    g.strokeRect(26.5, 26.5, W - 53, H - 53);
    g.globalAlpha = 0.3; g.lineWidth = 1; g.strokeRect(34.5, 34.5, W - 69, H - 69);
    g.globalAlpha = 0.6; g.lineWidth = 1.5;
    for (const [x, y] of [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60]]) {
      g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke();
      g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1;
  },
  gridref(g) {              /* an ops table's border: grid letters across the top, numbers down the side */
    g.fillStyle = PAL.edgeBand || "rgba(0,0,0,0.45)"; g.fillRect(0, 0, W, 34); g.fillRect(0, 34, 34, H - 34);
    g.font = `600 16px ${LFONT}`; g.fillStyle = PAL.inkSoft; g.textAlign = "center"; g.textBaseline = "middle";
    const L = "ABCDEFGHJKLMNOPQRSTU";
    for (let i = 0; i * 96 + 48 + 34 < W; i++) g.fillText(L[i % L.length], 34 + i * 96 + 48, 18);
    for (let j = 0; j * 96 + 48 + 34 < H; j++) g.fillText(String(j + 1), 17, 34 + j * 96 + 48);
    g.strokeStyle = PAL.inkSoft; g.globalAlpha = 0.5; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 34.5); g.lineTo(W, 34.5); g.moveTo(34.5, 34); g.lineTo(34.5, H); g.stroke();
    g.globalAlpha = 1;
  },
  scanlines(g) {            /* a projection: faint horizontal lines (static on screen, so nothing swims) */
    g.fillStyle = PAL.scanInk || "rgba(0,0,0,0.16)";
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.4);
  },
  hud(g) {                  /* the frame's corners, bracketed */
    g.strokeStyle = PAL.inkSoft; g.lineWidth = 2; g.globalAlpha = 0.55;
    const a = 44, L = 46;
    for (const [x, y, sx, sy] of [[a, a, 1, 1], [W - a, a, -1, 1], [a, H - a, 1, -1], [W - a, H - a, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
    }
    g.globalAlpha = 1;
  },
};
function compass(g, cx, cy, R) {
  g.save(); g.translate(cx, cy);
  g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R * 0.62, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(0, 0, R * 0.56, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2, l = i % 8 === 0 ? 0.0 : i % 4 === 0 ? 0.08 : 0.04;
    g.beginPath(); g.moveTo(Math.sin(a) * R * 0.56, -Math.cos(a) * R * 0.56); g.lineTo(Math.sin(a) * R * (0.62 + l), -Math.cos(a) * R * (0.62 + l)); g.stroke();
  }
  for (let i = 0; i < 8; i++) {                 /* the star: long points N E S W, short ones between */
    const a = i / 8 * Math.PI * 2, len = i % 2 ? R * 0.42 : R, w = R * 0.11;
    for (const side of [-1, 1]) {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(a + side * 0.5) * w, -Math.cos(a + side * 0.5) * w);
      g.lineTo(Math.sin(a) * len, -Math.cos(a) * len); g.closePath();
      g.fillStyle = side < 0 ? PAL.ink : PAL.bg2; g.fill(); g.stroke();
    }
  }
  g.font = `400 ${Math.round(R * 0.36)}px ${LFONT}`; g.fillStyle = PAL.ink; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillText("N", 0, -R - 8);
  g.restore();
}

/* ── land ── */
function admin1(ctx, path, k, L, dash, color) {
  if (!L.a1mesh) return;
  ctx.save(); ctx.beginPath(); path(L.a1mesh); if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = color || PAL.border; ctx.lineWidth = cl(k / 2600, 0.8, 1.8); ctx.stroke(); ctx.restore();
}
function storePath(ctx, path, list) { ctx.beginPath(); for (const f of list) path(f); }
V2.land.solid = (ctx, path, k, L) => {     /* flat fields with a crisp edge: the explainer, the pause-menu map */
  ctx.save(); ctx.lineJoin = "round";
  storePath(ctx, path, L.others);
  ctx.fillStyle = SCENE.near ? PAL.landNear : PAL.landDim; ctx.fill();
  ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = tok("borderW", 1.4); ctx.stroke();
  if (tok("outlineAll", false)) { ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1600, 1.6, 3.2) * tok("coastMul", 1); ctx.stroke(); }
  ctx.restore();
  if (!L.land.length) return;
  ctx.save(); storePath(ctx, path, L.land);
  if (tok("landShadow", false)) { ctx.shadowColor = PAL.liftShadow; ctx.shadowBlur = 26; ctx.shadowOffsetY = 9; }
  ctx.fillStyle = PAL.land; ctx.fill(); ctx.restore();
  admin1(ctx, path, k, L, [8, 6]);
  ctx.save(); storePath(ctx, path, L.land); ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1500, 1.6, 3.0) * tok("coastMul", 1); ctx.stroke(); ctx.restore();
};
V2.land.outline = (ctx, path, k, L) => {   /* line work only: drafting film, a hologram */
  ctx.save(); ctx.lineJoin = "round";
  storePath(ctx, path, L.others);
  ctx.fillStyle = SCENE.near ? PAL.landNear : PAL.landDim; ctx.fill();
  ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = tok("borderW", 1.1); ctx.stroke();
  ctx.restore();
  if (!L.land.length) return;
  ctx.save(); storePath(ctx, path, L.land); ctx.fillStyle = PAL.land; ctx.fill(); ctx.restore();
  admin1(ctx, path, k, L, [10, 7]);
  ctx.save(); ctx.lineJoin = "round"; ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1500, 1.4, 2.6);
  glowUnder(ctx, () => { storePath(ctx, path, L.land); ctx.stroke(); }, 0.8, PAL.coast);
  storePath(ctx, path, L.land); ctx.stroke(); ctx.restore();
};
let HALF = null;
V2.land.halftone = (ctx, path, k, L) => {  /* newsprint: grey land printed through a dot screen, inked borders */
  ctx.save(); ctx.lineJoin = "round";
  storePath(ctx, path, L.others);
  ctx.fillStyle = PAL.landNear; ctx.fill();
  ctx.fillStyle = HALF.dim; ctx.fill();
  ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  if (!L.land.length) return;
  ctx.save(); storePath(ctx, path, L.land);
  ctx.fillStyle = PAL.land; ctx.fill(); ctx.fillStyle = HALF.land; ctx.fill(); ctx.restore();
  admin1(ctx, path, k, L, [6, 5]);
  ctx.save(); storePath(ctx, path, L.land); ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1500, 1.5, 2.6); ctx.stroke(); ctx.restore();
};
function waterLines(ctx, path, k, list) {   /* the engraver's rings round the coasts (as the paper skin draws them) */
  ctx.save(); ctx.beginPath();
  if (k / R_KM > 0.09) for (const f of list) { if (sizeSr(f) * k > 40) path(f); }
  ctx.lineJoin = "round";
  const sc = cl(k / 2500, 0.55, 1.2);
  for (const [w, a] of [[44, 0.30], [30, 0.5], [17, 0.75]]) {
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a;
    ctx.strokeStyle = PAL.waterLine; ctx.lineWidth = w * sc; ctx.stroke();
    ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = 1;
    ctx.lineWidth = w * sc - 2; ctx.stroke();
  }
  ctx.restore();
}
const BANDS = () => [PAL.band1, PAL.band2, PAL.band3, PAL.band4].filter(Boolean);
function idHash(id) { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
V2.land.engraved = (ctx, path, k, L) => {  /* the hand-coloured atlas: each country edged inside with its own wash */
  const all = L.others.concat(L.land);
  waterLines(ctx, path, k, all);
  ctx.save(); storePath(ctx, path, L.others); ctx.fillStyle = SCENE.near ? PAL.landNear : PAL.landDim; ctx.fill(); ctx.restore();
  const bands = BANDS(), bw = cl(k / 160, 7, 22);
  if (bands.length) {
    for (const f of L.others) {
      if (sizeSr(f) * k < 26) continue;          /* a speck gets no band: it would only fill in */
      ctx.save(); ctx.beginPath(); path(f); ctx.clip();
      ctx.beginPath(); path(f); ctx.strokeStyle = bands[idHash(f.id) % bands.length]; ctx.lineWidth = bw; ctx.lineJoin = "round"; ctx.stroke();
      ctx.restore();
    }
  }
  ctx.save(); storePath(ctx, path, L.others); ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore();
  if (!L.land.length) return;
  ctx.save(); storePath(ctx, path, L.land); ctx.fillStyle = PAL.land; ctx.fill(); ctx.restore();
  admin1(ctx, path, k, L, [5, 4]);
  ctx.save(); storePath(ctx, path, L.land); ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1600, 1.1, 2.0); ctx.stroke(); ctx.restore();
};
V2.land.neon = (ctx, path, k, L) => {      /* dark land drawn in light: borders as thin tubes, the story country lit */
  ctx.save(); ctx.lineJoin = "round";
  storePath(ctx, path, L.others);
  ctx.fillStyle = SCENE.near ? PAL.landNear : PAL.landDim; ctx.fill();
  ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  if (!L.land.length) return;
  ctx.save(); storePath(ctx, path, L.land); ctx.fillStyle = PAL.land; ctx.fill(); ctx.restore();
  admin1(ctx, path, k, L, [4, 6], PAL.borderDim);
  ctx.save(); ctx.lineJoin = "round"; ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1600, 1.4, 2.4);
  glowUnder(ctx, () => { storePath(ctx, path, L.land); ctx.stroke(); }, 1, PAL.coast);
  storePath(ctx, path, L.land); ctx.stroke(); ctx.restore();
};
V2.land.globe = (ctx, path, k, L) => {     /* a dark planet: slate land with a soft light from the upper left */
  ctx.save(); storePath(ctx, path, L.others);
  ctx.fillStyle = SCENE.near ? PAL.landNear : PAL.landDim; ctx.fill();
  ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore();
  if (L.land.length) {
    ctx.save(); storePath(ctx, path, L.land); ctx.fillStyle = landGradient(ctx); ctx.fill(); ctx.restore();
    admin1(ctx, path, k, L, [6, 6], PAL.borderDim);
    ctx.save(); storePath(ctx, path, L.land); ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1600, 1.0, 2.0); ctx.stroke(); ctx.restore();
  }
  /* the light on the sphere: brighter towards the upper left, the limb falling away (only while the globe shows) */
  const show = cl((H * 1.6 - k) / (H * 0.9), 0, 1);
  if (show > 0) {
    const c = tiltXY(ortho.translate()[0], ortho.translate()[1]), R = ortho.scale();
    ctx.save(); ctx.beginPath(); path({ type: "Sphere" }); ctx.clip();
    const g = ctx.createRadialGradient(c[0] - R * 0.35, c[1] - R * 0.4, R * 0.1, c[0], c[1], R * 1.02);
    g.addColorStop(0, "rgba(255,255,255,0.07)"); g.addColorStop(0.7, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.globalAlpha = show; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
};
V2.globe.globe = (ctx, path, k) => {       /* the atmosphere: a thin bright rim and a soft haze outside it */
  const show = cl((H * 1.6 - k) / (H * 0.9), 0, 1);
  if (show <= 0) return;
  const c = tiltXY(ortho.translate()[0], ortho.translate()[1]), R = ortho.scale();
  ctx.save(); ctx.globalAlpha = show;
  ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = PAL.ocean; ctx.fill();
  const g = ctx.createRadialGradient(c[0], c[1], R * 0.97, c[0], c[1], R * 1.16);
  g.addColorStop(0, PAL.atmo || "rgba(120,180,255,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], R * 1.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); path({ type: "Sphere" }); ctx.strokeStyle = PAL.atmoRim || "rgba(170,210,255,0.55)"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
};
V2.land.tube = (ctx, path, k, L) => {      /* the neon sign's city: dark FILLED land, a dim lit coast, no light on borders */
  const all = L.others.concat(L.land);
  ctx.save(); ctx.lineJoin = "round";
  /* the coast: one stroke under the fills — the land covers its inner half and both halves of every border, so only
     the sea side of the coastline stays lit (no topology needed, no lit seams where a data level ends) */
  storePath(ctx, path, all);
  ctx.strokeStyle = PAL.coast; ctx.lineWidth = cl(k / 1100, 1.8, 3.4); ctx.stroke();
  ctx.fillStyle = SCENE.near ? PAL.landNear : PAL.landDim; ctx.fill();
  ctx.restore();
  ctx.save(); storePath(ctx, path, L.others); ctx.lineJoin = "round";
  ctx.strokeStyle = SCENE.near ? PAL.borderNear : PAL.borderDim; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  if (!L.land.length) return;
  ctx.save(); storePath(ctx, path, L.land); ctx.fillStyle = PAL.land; ctx.fill(); ctx.restore();
  admin1(ctx, path, k, L, [3, 6], PAL.border);
};
V2.globe.tube = (ctx, path, k) => {        /* the planet as a dark disc on the dot matrix, a dim lit limb */
  const show = cl((H * 1.25 - k) / (H * 0.7), 0, 1);
  if (show <= 0) return;
  ctx.save(); ctx.globalAlpha = show;
  ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = PAL.ocean; ctx.fill();
  ctx.strokeStyle = PAL.coast; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
};
V2.grid.tube = () => {};                   /* no graticule: the dot matrix is the only grid */

/* ── the lit place ── */
function hatchIn(ctx, bb, ink, width, step) {
  ctx.save(); ctx.clip(); ctx.strokeStyle = ink; ctx.lineWidth = width;
  const span = (bb.y1 - bb.y0) + 60;
  ctx.beginPath();
  for (let x = bb.x0 - span; x < bb.x1 + 40; x += step) { ctx.moveTo(x, bb.y1 + 30); ctx.lineTo(x + span, bb.y0 - 30); }
  ctx.stroke(); ctx.restore();
}
V2.hi.solid = (ctx, path, f, amt, glow, flat) => {
  ctx.save(); ctx.globalAlpha = amt; ctx.lineJoin = "round";
  ctx.beginPath(); path(f);
  ctx.fillStyle = flat ? PAL.hiWash : PAL.hi; ctx.fill();
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = tok("hiEdgeW", 4);
  glowUnder(ctx, () => { ctx.beginPath(); path(f); ctx.stroke(); }, 1, GLOWC);
  ctx.beginPath(); path(f); ctx.stroke();
  ctx.restore();
};
V2.hi.outline = (ctx, path, f, amt, glow, flat) => {
  ctx.save(); ctx.globalAlpha = amt; ctx.lineJoin = "round";
  ctx.beginPath(); path(f);
  const bb = shapeBounds(path, f);
  ctx.fillStyle = PAL.hiWash; ctx.fill();
  if (!flat) { ctx.beginPath(); path(f); hatchIn(ctx, bb, PAL.hatchInk || PAL.hiEdge, 1.6, 14); }
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 2.6;
  glowUnder(ctx, () => { ctx.beginPath(); path(f); ctx.stroke(); }, 1, GLOWC);
  ctx.beginPath(); path(f); ctx.stroke();
  ctx.restore();
};
V2.hi.hatch = (ctx, path, f, amt, glow, flat) => {      /* an ops map's objective: tint, heavy hatching, a hard edge */
  ctx.save(); ctx.globalAlpha = amt; ctx.lineJoin = "round";
  ctx.beginPath(); path(f);
  const bb = shapeBounds(path, f);
  ctx.fillStyle = PAL.hiWash; ctx.fill();
  if (!flat) { ctx.beginPath(); path(f); hatchIn(ctx, bb, PAL.hatchInk || PAL.hi, 3, 18); }
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 3.2;
  glowUnder(ctx, () => { ctx.beginPath(); path(f); ctx.stroke(); }, 1, GLOWC);
  ctx.beginPath(); path(f); ctx.stroke();
  ctx.restore();
};
V2.hi.halftone = (ctx, path, f, amt, glow, flat) => {   /* printed in spot colour, the second plate a hair off */
  ctx.save(); ctx.globalAlpha = amt;
  ctx.beginPath(); path(f);
  ctx.fillStyle = PAL.hiWash; ctx.fill();
  ctx.fillStyle = HALF.hi; ctx.fill();
  ctx.save(); ctx.translate(3, 2); ctx.beginPath(); path(f); ctx.globalAlpha = amt * 0.45; ctx.fillStyle = HALF.mis; ctx.fill(); ctx.restore();
  ctx.beginPath(); path(f); ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = flat ? 2 : 2.4; ctx.lineJoin = "round"; ctx.stroke();
  ctx.restore();
};
V2.hi.engraved = (ctx, path, f, amt, glow, flat) => {   /* the story country hand-coloured in the accent, wider */
  ctx.save(); ctx.globalAlpha = amt; ctx.lineJoin = "round";
  ctx.beginPath(); path(f); ctx.fillStyle = PAL.hiWash; ctx.fill();
  ctx.save(); ctx.clip(); ctx.beginPath(); path(f); ctx.strokeStyle = PAL.hi; ctx.globalAlpha = amt * 0.8;
  ctx.lineWidth = flat ? 18 : 30; ctx.stroke(); ctx.restore();
  ctx.beginPath(); path(f); ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.restore();
};
V2.hi.neon = (ctx, path, f, amt, glow, flat) => {
  ctx.save(); ctx.globalAlpha = amt; ctx.lineJoin = "round";
  ctx.beginPath(); path(f); ctx.fillStyle = PAL.hiWash; ctx.fill();
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 2.6;
  glowUnder(ctx, () => { ctx.beginPath(); path(f); ctx.stroke(); }, 1.3, GLOWC);
  ctx.beginPath(); path(f); ctx.stroke();
  ctx.restore();
};
V2.hi.holo = (ctx, path, f, amt, glow, flat) => {       /* the place rises off the table as stacked light */
  ctx.save(); ctx.lineJoin = "round";
  const n = flat ? 0 : 7;
  for (let i = n; i >= 1; i--) {
    ctx.save(); ctx.translate(0, -i * 3.2 * amt); ctx.beginPath(); path(f);
    ctx.globalAlpha = amt * 0.06; ctx.fillStyle = PAL.hi; ctx.fill(); ctx.restore();
  }
  ctx.save(); ctx.translate(0, -n * 3.2 * amt); ctx.beginPath(); path(f);
  ctx.globalAlpha = amt; ctx.fillStyle = PAL.hiWash; ctx.fill();
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 2.2;
  glowUnder(ctx, () => { ctx.beginPath(); path(f); ctx.stroke(); }, 1.2, GLOWC);
  ctx.beginPath(); path(f); ctx.stroke(); ctx.restore();
  ctx.restore();
};
V2.hi.tube = (ctx, path, f, amt, glow, flat) => {       /* the place as a neon sign: ONE tube round it, light inside */
  const on = amt * ignite(V2.now - (HIT - 0.2));
  if (on <= 0.001) return;
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  /* the light the tube spills inward: a faint fill, then the edge's blurred light kept inside the shape (a shadow
     cast from far off the canvas, as glowUnder does — stroked bands read as stepped contour rings) */
  ctx.globalAlpha = on; ctx.beginPath(); path(f); ctx.fillStyle = PAL.hiWash; ctx.fill();
  ctx.save(); ctx.clip();
  const far = 20000;
  for (const [blur, lw] of (flat ? [[16, 6], [6, 3]] : [[36, 12], [12, 5]])) {
    ctx.save(); ctx.translate(-far, 0);
    ctx.shadowColor = PAL.hiSpill || PAL.hiGlow; ctx.shadowBlur = blur; ctx.shadowOffsetX = far;
    ctx.strokeStyle = "#000000"; ctx.lineWidth = lw; ctx.beginPath(); path(f); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  /* the tube: its light (the title's one glow family), the coloured glass, the white-hot core */
  ctx.globalAlpha = on; ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = flat ? 4 : 5.2;
  glowUnder(ctx, () => { ctx.beginPath(); path(f); ctx.stroke(); }, 1.3, GLOWC);
  ctx.beginPath(); path(f); ctx.stroke();
  ctx.strokeStyle = PAL.hiCore || "#ffffff"; ctx.lineWidth = flat ? 1.4 : 1.8; ctx.stroke();
  ctx.restore();
};

/* ── pins ── */
V2.pin.ring = (ctx, x, y, p, color, scale) => {         /* a solid dot in a white ring: lands, never bounces */
  const s = (scale || 1) * smooth(cl(p * 1.6, 0, 1)), R = 15 * s;
  if (R <= 0.3) return;
  ctx.save(); ctx.globalAlpha = cl(p * 4, 0, 1);
  ctx.fillStyle = color;
  glowUnder(ctx, () => { ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill(); }, s);
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillStyle = PAL.pinRing || "#ffffff"; ctx.beginPath(); ctx.arc(x, y, R + 4.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
V2.dot.ring = (ctx, x, y, r, color, alpha) => V2.pin.ring(ctx, x, y, alpha >= 1 ? 1 : alpha * 0.62, color, r / 15);
V2.pin.blip = (ctx, x, y, p, color, scale) => {         /* the pause-menu blip: a coloured square, white border */
  const s = (scale || 1) * smooth(cl(p * 1.8, 0, 1)), h = 15 * s;
  if (h <= 0.3) return;
  ctx.save(); ctx.globalAlpha = cl(p * 4, 0, 1);
  ctx.fillStyle = color;
  glowUnder(ctx, () => { ctx.fillRect(x - h, y - h, 2 * h, 2 * h); }, s);
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#000000"; ctx.fillRect(x - h - 5 * s, y - h - 5 * s, 2 * h + 10 * s, 2 * h + 10 * s);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = PAL.pinRing || "#ffffff"; ctx.fillRect(x - h - 3.5 * s, y - h - 3.5 * s, 2 * h + 7 * s, 2 * h + 7 * s);
  ctx.fillStyle = color; ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
  ctx.restore();
};
V2.dot.blip = (ctx, x, y, r, color, alpha) => V2.pin.blip(ctx, x, y, alpha >= 1 ? 1 : alpha * 0.55, color, r / 18);
V2.ripple.blip = (ctx, x, y, t0, t, color, count) => {
  for (let i = 0; i < (count || 2); i++) {
    const p = ((t - t0) / 1.4 - i * 0.5); if (p <= 0) continue;
    const q = p % 1, h = 20 + q * 60;
    ctx.save(); ctx.globalAlpha = 0.55 * (1 - q) * cl((t - t0) / 0.3, 0, 1);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(x - h, y - h, 2 * h, 2 * h); ctx.restore();
  }
};
V2.pin.crosshair = (ctx, x, y, p, color, scale) => {    /* a drafting mark: the circle draws round, ticks come in */
  const s = scale || 1, a = smooth(cl(p * 1.4, 0, 1)), R = 24 * s;
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  glowUnder(ctx, () => { ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a); ctx.stroke(); }, s);
  ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a); ctx.stroke();
  ctx.globalAlpha = a;
  for (const q of [0, 1, 2, 3]) {
    const ang = q * Math.PI / 2, r0 = R * (1.9 - 0.9 * a), r1 = R * (1.9 - 0.9 * a) + R * 0.7;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0); ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1); ctx.stroke();
  }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
V2.dot.crosshair = (ctx, x, y, r, color, alpha) => {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};
V2.ripple.crosshair = (ctx, x, y, t0, t, color) => {
  const p = (t - t0) / 1.2; if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.globalAlpha = 0.5 * (1 - p); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 24 + 80 * eOut(p), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
};
V2.pin.ink = (ctx, x, y, p, color, scale) => {          /* an atlas town mark: a ring and a dot of ink */
  const s = (scale || 1), a = smooth(cl(p * 1.6, 0, 1));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = PAL.pinRing || PAL.bg2; ctx.beginPath(); ctx.arc(x, y, 13 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 13 * s * (1.25 - 0.25 * a), 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 6.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
V2.dot.ink = (ctx, x, y, r, color, alpha) => V2.pin.ink(ctx, x, y, alpha, color, r / 13);
V2.ripple.ink = () => {};
V2.pin.beacon = (ctx, x, y, p, color, scale) => {       /* a hologram marker: a column of light off the table */
  const s = scale || 1, a = smooth(cl(p * 1.4, 0, 1)), Hh = 230 * s * a;
  if (a <= 0) return;
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x, y - Hh);
  g.addColorStop(0, GLOWL); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.9 * a; ctx.fillStyle = g; ctx.fillRect(x - 3 * s, y - Hh, 6 * s, Hh);
  ctx.globalAlpha = 0.25 * a; ctx.fillRect(x - 14 * s, y - Hh * 0.8, 28 * s, Hh * 0.8);
  ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 2.2;
  glowUnder(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, 30 * s, 12 * s, 0, 0, Math.PI * 2); ctx.stroke(); }, s);
  ctx.beginPath(); ctx.ellipse(x, y, 30 * s, 12 * s, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = GLOWL; ctx.beginPath(); ctx.arc(x, y, 5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
V2.dot.beacon = (ctx, x, y, r, color, alpha) => V2.pin.beacon(ctx, x, y, alpha * 0.55, color, r / 22);
V2.pin.radar = (ctx, x, y, p, color, scale) => {        /* range rings and a sweep turning round the place */
  const s = scale || 1, a = smooth(cl(p * 1.4, 0, 1));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 1.4;
  for (const r of [22, 44, 66]) { ctx.globalAlpha = a * (r === 22 ? 0.9 : 0.45); ctx.beginPath(); ctx.arc(x, y, r * s * a, 0, Math.PI * 2); ctx.stroke(); }
  const ang = V2.now * 2.2;
  const g = ctx.createConicGradient ? ctx.createConicGradient(ang - 1.1, x, y) : null;
  if (g) {
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.17, GLOWC); g.addColorStop(0.175, "rgba(0,0,0,0)");
    ctx.globalAlpha = a * 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 66 * s * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = a; ctx.fillStyle = color;
  glowUnder(ctx, () => { ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, Math.PI * 2); ctx.fill(); }, s);
  ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
V2.dot.radar = (ctx, x, y, r, color, alpha) => {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.4;
  glowUnder(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill(); });
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha * 0.6; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
};
function tubeRing(ctx, x, y, R, on, color, s) {         /* a ring of neon glass and its hot centre */
  ctx.save(); ctx.globalAlpha = on;
  ctx.strokeStyle = color; ctx.lineWidth = 4.2 * s;
  glowUnder(ctx, () => { ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke(); }, s);
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = PAL.pinLight || "#ffffff"; ctx.lineWidth = 1.4 * s; ctx.stroke();
  ctx.fillStyle = PAL.pinLight || "#ffffff";
  glowUnder(ctx, () => { ctx.beginPath(); ctx.arc(x, y, 4.4 * s, 0, Math.PI * 2); ctx.fill(); }, s, color);
  ctx.beginPath(); ctx.arc(x, y, 4.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
V2.pin.tube = (ctx, x, y, p, color, scale) => {         /* the neon sign's mark: it ignites in place, never bounces,
                                                             and lights the ground round it */
  const s = scale || 1, on = ignite(p * 0.85);
  if (on <= 0.001) return;
  const R = 120 * s, pool = ctx.createRadialGradient(x, y, 0, x, y, R);
  pool.addColorStop(0, PAL.hiSpill || PAL.haze || "rgba(255,255,255,0.08)"); pool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save(); ctx.globalAlpha = on; ctx.fillStyle = pool; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); ctx.restore();
  tubeRing(ctx, x, y, 21 * s, on, color, s);
};
V2.dot.tube = (ctx, x, y, r, color, alpha) => {
  if (alpha <= 0.001) return;
  tubeRing(ctx, x, y, r * 1.25, alpha, color, cl(r / 12, 0.6, 1.2));
};
V2.ripple.tube = (ctx, x, y, t0, t, color) => {         /* one faint ring of light leaving the place, once */
  const p = (t - t0) / 1.4; if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.globalAlpha = 0.32 * (1 - eIn(p)); ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 22 + 74 * eOut(p), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
};

/* ── labels: every v2 label stays inside the frame ── */
function fitFont(ctx, text, size, min, maxW, style) {
  let s = size;
  ctx.font = `${style || ""} ${LWEIGHT} ${s}px ${LFONT}`;
  while (s > min && textW(ctx, text) > maxW) { s -= 2; ctx.font = `${style || ""} ${LWEIGHT} ${s}px ${LFONT}`; }
  return s;
}
function placeBox(x, y, w, h, side, gap) {
  const centre = side === "center";
  let right = side !== "left";
  if (!centre && right && x + gap + w > W - 40) right = false;
  if (!centre && !right && x - gap - w < 40) right = true;
  const bx = cl(centre ? x - w / 2 : right ? x + gap : x - gap - w, 28, W - 28 - w);
  const by = cl(y - h / 2, 28, H - 28 - h);
  return { bx, by, right: right || centre, centre };
}
function revealClip(ctx, b, w, h, alpha) {
  const reveal = eOut(cl(alpha, 0, 1)), cw = (w + 16) * reveal;
  ctx.beginPath(); ctx.rect(b.right ? b.bx - 8 : b.bx + w + 8 - cw, b.by - 30, cw, h + 60); ctx.clip();
}
/* tracking is measured by hand: whether measureText counts letterSpacing has changed between Chromium versions, and a
   box measured short clips its last letter ("PALO ALT(O)") */
let TRACK = 0;
function letters(ctx, px) { TRACK = +px || 0; try { ctx.letterSpacing = TRACK + "px"; } catch (e) { /* older canvas */ } }
function llText(ll) {
  if (!ll) return "";
  const f = (v, p, n) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? p : n}`;
  return `${f(ll[1], "N", "S")}  ${f(ll[0], "E", "W")}`;
}
function textW(ctx, text) {
  let ls = null;
  try { ls = ctx.letterSpacing; ctx.letterSpacing = "0px"; } catch (e) { ls = null; }
  const w = ctx.measureText(text).width;
  if (ls != null) ctx.letterSpacing = ls;
  return w + TRACK * Math.max(0, Array.from(String(text)).length - 1);
}
V2.label.card = (ctx, x, y, text, alpha, side) => {     /* an index card on the desk, typed, a red margin rule */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 1.5));
  const fs = fitFont(ctx, label, 27, 18, W * 0.38);
  const w = textW(ctx, label) + 40, h = fs + 26;
  const b = placeBox(x, y, w, h, side, 24);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  const rot = ((idHash(text) % 9) - 4) * 0.0035;
  ctx.translate(b.bx + w / 2, b.by + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  ctx.fillStyle = PAL.plate; ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = PAL.hi; ctx.fillRect(12, 0, 2, h);
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "middle"; ctx.fillText(label, 24, h / 2 + 1);
  ctx.restore();
};
V2.label.bold = (ctx, x, y, text, alpha, side) => {     /* big heavy type with a halo: an explainer's names */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 0.5));
  const fs = fitFont(ctx, label, 40, 22, W * 0.42);
  const w = textW(ctx, label), h = fs;
  const b = placeBox(x, y, w, h, side, 26);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.plate; ctx.lineWidth = 9; ctx.strokeText(label, b.bx, b.by + h / 2);
  ctx.fillStyle = PAL.plateInk; ctx.fillText(label, b.bx, b.by + h / 2);
  ctx.restore();
};
V2.label.line = (ctx, x, y, text, alpha, side) => {     /* quiet tracked capitals on a hairline leader */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 4));
  const fs = fitFont(ctx, label, 26, 16, W * 0.4);
  const w = textW(ctx, label), h = fs + 14, gap = 56;
  const b = placeBox(x, y - 18, w, h, side, gap);
  const a = cl(alpha * 1.5, 0, 1);
  ctx.globalAlpha = a;
  const lx = b.right ? b.bx - 10 : b.bx + w + 10, ly = b.by + h - 4;
  const lp = eOut(cl(alpha * 1.4, 0, 1));
  ctx.strokeStyle = PAL.leader; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, lx, lp), lerp(y, ly, lp)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lerp(lx, b.right ? b.bx + w : b.bx, lp), ly); ctx.stroke();
  revealClip(ctx, b, w, h, alpha);
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "alphabetic"; ctx.fillText(label, b.bx, ly - 8);
  ctx.restore();
};
V2.label.bar = (ctx, x, y, text, alpha, side) => {      /* a newspaper map's name: white capitals on a black bar */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 1));
  const fs = fitFont(ctx, label, 28, 18, W * 0.4);
  const w = textW(ctx, label) + 30, h = fs + 18;
  const b = placeBox(x, y, w, h, side, 22);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.fillStyle = PAL.plate; ctx.fillRect(b.bx, b.by, w, h);
  ctx.fillStyle = PAL.hi; ctx.fillRect(b.right ? b.bx : b.bx + w - 8, b.by, 8, h);
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "middle"; ctx.fillText(label, b.bx + (b.right ? 19 : 11), b.by + h / 2 + 1);
  ctx.restore();
};
V2.label.stencil = (ctx, x, y, text, alpha, side) => {  /* an ops tag: stencil capitals on a dark chip, brackets */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 2));
  const fs = fitFont(ctx, label, 28, 18, W * 0.4);
  const w = textW(ctx, label) + 34, h = fs + 20;
  const b = placeBox(x, y, w, h, side, 24);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.fillStyle = PAL.plate; ctx.fillRect(b.bx, b.by, w, h);
  ctx.strokeStyle = PAL.hi; ctx.lineWidth = 2.4; const c = 10;
  for (const [px, py, sx, sy] of [[b.bx, b.by, 1, 1], [b.bx + w, b.by, -1, 1], [b.bx, b.by + h, 1, -1], [b.bx + w, b.by + h, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(px, py + sy * c); ctx.lineTo(px, py); ctx.lineTo(px + sx * c, py); ctx.stroke();
  }
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "middle"; ctx.fillText(label, b.bx + 17, b.by + h / 2 + 1);
  ctx.restore();
};
V2.label.dimension = (ctx, x, y, text, alpha, side) => { /* a draughtsman's note: mono capitals over a dimension line */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 3));
  const fs = fitFont(ctx, label, 24, 16, W * 0.4);
  const w = textW(ctx, label), h = fs + 18;
  const b = placeBox(x, y - 14, w, h, side, 30);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "alphabetic"; ctx.fillText(label, b.bx, b.by + fs);
  const ly = b.by + fs + 10;
  ctx.strokeStyle = PAL.leader; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(b.bx, ly); ctx.lineTo(b.bx + w, ly);
  ctx.moveTo(b.bx, ly - 7); ctx.lineTo(b.bx, ly + 7); ctx.moveTo(b.bx + w, ly - 7); ctx.lineTo(b.bx + w, ly + 7); ctx.stroke();
  ctx.restore();
};
V2.label.gta = (ctx, x, y, text, alpha, side) => {      /* heavy italic capitals, white with a thick black edge */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 1));
  const fs = fitFont(ctx, label, 36, 22, W * 0.42, "italic");
  const w = textW(ctx, label) + 8, h = fs;
  const b = placeBox(x, y, w, h, side, 26);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.strokeStyle = "#000000"; ctx.lineWidth = 8; ctx.strokeText(label, b.bx + 2, b.by + h / 2);
  ctx.fillStyle = PAL.plateInk; ctx.fillText(label, b.bx + 2, b.by + h / 2);
  ctx.restore();
};
V2.label.holo = (ctx, x, y, text, alpha, side) => {     /* a projected tag: an outlined box with corner ticks */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 3));
  const fs = fitFont(ctx, label, 24, 16, W * 0.4);
  const w = textW(ctx, label) + 34, h = fs + 20;
  const b = placeBox(x, y, w, h, side, 30);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.fillStyle = PAL.plate; ctx.fillRect(b.bx, b.by, w, h);
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 1.3; ctx.strokeRect(b.bx + 0.5, b.by + 0.5, w - 1, h - 1);
  ctx.lineWidth = 3; const c = 8;
  for (const [px, py, sx, sy] of [[b.bx, b.by, 1, 1], [b.bx + w, b.by + h, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(px, py + sy * c); ctx.lineTo(px, py); ctx.lineTo(px + sx * c, py); ctx.stroke();
  }
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "middle"; ctx.fillText(label, b.bx + 17, b.by + h / 2 + 1);
  ctx.restore();
};
V2.label.engraved = (ctx, x, y, text, alpha, side) => { /* copperplate: mixed-case italic, spaced, on a paper halo */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 2));
  const fs = fitFont(ctx, label, 36, 22, W * 0.42, tok("labelItalic", true) ? "italic" : "");
  const w = textW(ctx, label), h = fs;
  const b = placeBox(x, y, w, h, side, 22);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.plate; ctx.lineWidth = 7; ctx.strokeText(label, b.bx, b.by + h / 2);
  ctx.fillStyle = PAL.plateInk; ctx.fillText(label, b.bx, b.by + h / 2);
  ctx.restore();
};
V2.label.bracket = (ctx, x, y, text, alpha, side, ll) => { /* tactical: bracketed mono name, a coordinate under it */
  ctx.save(); const label = upper(text);
  letters(ctx, tok("labelTrack", 3));
  const fs = fitFont(ctx, label, 26, 16, W * 0.4);
  const sub = llText(ll);
  ctx.font = `${LWEIGHT} ${fs}px ${LFONT}`;
  let w = textW(ctx, label);
  if (sub) { ctx.save(); ctx.font = `${LWEIGHT} ${Math.round(fs * 0.62)}px ${LFONT}`; w = Math.max(w, textW(ctx, sub)); ctx.restore(); }
  w += 36; const h = fs + (sub ? fs * 0.75 : 0) + 22;
  const b = placeBox(x, y, w, h, side, 28);
  ctx.globalAlpha = cl(alpha * 1.5, 0, 1); revealClip(ctx, b, w, h, alpha);
  ctx.fillStyle = PAL.plate; ctx.fillRect(b.bx, b.by, w, h);
  ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 2;
  const c = 12;
  for (const [px, sx] of [[b.bx, 1], [b.bx + w, -1]]) {
    ctx.beginPath(); ctx.moveTo(px + sx * c, b.by); ctx.lineTo(px, b.by); ctx.lineTo(px, b.by + h); ctx.lineTo(px + sx * c, b.by + h); ctx.stroke();
  }
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "top"; ctx.fillText(label, b.bx + 18, b.by + 11);
  if (sub) { ctx.font = `${LWEIGHT} ${Math.round(fs * 0.62)}px ${LFONT}`; ctx.fillStyle = PAL.hiEdge; ctx.fillText(sub, b.bx + 18, b.by + 13 + fs); }
  ctx.restore();
};
V2.label.rule = (ctx, x, y, text, alpha, side, ll) => { /* a neon sign's name: a thin lit rule, tracked capitals, its
                                                             coordinates in mono under it (no box, no brackets) */
  ctx.save(); const label = upper(text), trk = tok("labelTrack", 3);
  letters(ctx, trk);
  const fs = fitFont(ctx, label, 32, 18, W * 0.36);
  let w = textW(ctx, label);
  const sub = llText(ll), ms = Math.round(cl(fs * 0.52, 13, 17));
  if (sub) { letters(ctx, 1); ctx.font = `${MWEIGHT} ${ms}px ${MFONT}`; w = Math.max(w, textW(ctx, sub)); }
  const gap = 18, h = fs + (sub ? ms + 10 : 0) + 6, bw = w + gap;
  const b = placeBox(x, y, bw, h, side, 30);
  const a = cl(alpha * 1.5, 0, 1), rp = smooth(cl(alpha * 2.2, 0, 1));
  /* the rule lights first, on the side towards the place */
  const rx = b.right ? b.bx : b.bx + bw, my = b.by + h / 2;
  ctx.globalAlpha = a; ctx.lineCap = "round"; ctx.strokeStyle = PAL.hiEdge; ctx.lineWidth = 3;
  const rule = () => { ctx.beginPath(); ctx.moveTo(rx, my - h / 2 * rp); ctx.lineTo(rx, my + h / 2 * rp); ctx.stroke(); };
  glowUnder(ctx, rule, 0.8, GLOWC);
  rule(); ctx.strokeStyle = PAL.hiCore || "#ffffff"; ctx.lineWidth = 1; ctx.stroke();
  revealClip(ctx, b, bw, h, alpha);
  const tx = b.right ? b.bx + gap : b.bx;
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 10;
  ctx.fillStyle = PAL.plateInk; ctx.textBaseline = "top";
  letters(ctx, trk); ctx.font = `${LWEIGHT} ${fs}px ${LFONT}`; ctx.fillText(label, tx, b.by + 3);
  if (sub) { letters(ctx, 1); ctx.font = `${MWEIGHT} ${ms}px ${MFONT}`; ctx.fillStyle = PAL.hiLight; ctx.fillText(sub, tx, b.by + fs + 10); }
  ctx.restore();
};

/* ── routes ── */
function tipArrow(ctx, line, color, L, outline) {
  const co = (line && line.coordinates) || [];
  if (co.length < 2) return;
  const b = screen(co[co.length - 1]), a = screen(co[Math.max(0, co.length - 5)]);
  if (!a || !b || Math.hypot(b[0] - a[0], b[1] - a[1]) < 1) return;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), Wd = L * 0.72;
  ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(ang); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(L * 0.55, 0); ctx.lineTo(-L * 0.45, Wd / 2); ctx.lineTo(-L * 0.25, 0); ctx.lineTo(-L * 0.45, -Wd / 2); ctx.closePath();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.stroke(); }
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
V2.route.gps = (ctx, path, line, t, frac) => {          /* a sat-nav route: a thick bright line in a dark casing */
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.routeCase || "rgba(0,0,0,0.85)"; ctx.lineWidth = 15;
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.beginPath(); path(line); ctx.stroke();
  ctx.shadowColor = "transparent"; ctx.strokeStyle = PAL.route; ctx.lineWidth = 9;
  glowUnder(ctx, () => { ctx.beginPath(); path(line); ctx.stroke(); });
  ctx.beginPath(); path(line); ctx.stroke();
  ctx.restore();
};
V2.route.bold = (ctx, path, line, t, frac) => {         /* the explainer's arrow: white casing, solid colour, a head */
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.routeCase || "#ffffff"; ctx.lineWidth = 14; ctx.beginPath(); path(line); ctx.stroke();
  ctx.strokeStyle = PAL.route; ctx.lineWidth = 8;
  glowUnder(ctx, () => { ctx.beginPath(); path(line); ctx.stroke(); });
  ctx.beginPath(); path(line); ctx.stroke();
  tipArrow(ctx, line, PAL.route, 34, PAL.routeCase || "#ffffff");
  ctx.restore();
};
V2.route.tech = (ctx, path, line, t, frac) => {         /* a drafting line: long dashes, an open arrowhead */
  ctx.save(); ctx.lineCap = "butt"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.route; ctx.lineWidth = 2.6; ctx.setLineDash([18, 9]);
  glowUnder(ctx, () => { ctx.beginPath(); path(line); ctx.stroke(); });
  ctx.beginPath(); path(line); ctx.stroke();
  tipArrow(ctx, line, PAL.route, 26);
  ctx.restore();
};
V2.route.ink = (ctx, path, line, t, frac) => {          /* an inked track: short dashes, a small solid head */
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.route; ctx.lineWidth = 3.4; ctx.setLineDash([9, 8]);
  glowUnder(ctx, () => { ctx.beginPath(); path(line); ctx.stroke(); });
  ctx.beginPath(); path(line); ctx.stroke();
  tipArrow(ctx, line, PAL.route, 24);
  ctx.restore();
};
V2.route.neon = (ctx, path, line, t, frac) => {         /* a light line: the glow under it, a pulse running along */
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.route; ctx.lineWidth = 4.5;
  glowUnder(ctx, () => { ctx.beginPath(); path(line); ctx.stroke(); }, 1.2, PAL.route);
  ctx.beginPath(); path(line); ctx.stroke();
  ctx.setLineDash([2, 34]); ctx.lineDashOffset = -t * 60; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2.4;
  ctx.beginPath(); path(line); ctx.stroke();
  ctx.restore();
};
V2.route.tube = (ctx, path, line, t, frac) => {         /* a neon tube laid along the journey: glass, light, core */
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.route; ctx.lineWidth = 5;
  glowUnder(ctx, () => { ctx.beginPath(); path(line); ctx.stroke(); }, 1.2, GLOWC);
  ctx.beginPath(); path(line); ctx.stroke();
  ctx.strokeStyle = PAL.routeCore || PAL.pinLight || "#ffffff"; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.restore();
};

/* ── the GTA-style round radar in the corner (radar_hud) ── */
function radarCentre() {
  const tg = (SCENE.targets || [])[0], st = SCENE.stops || [];
  if (st.length) { const s = st[st.length - 1]; return [s.lon, s.lat]; }
  if (!tg) return null;
  if (tg.level === "point") return [tg.lon, tg.lat];
  return tg.label || boxCenter(tg.frame);
}
function radarKm() {
  const st = SCENE.stops || [];
  if (st.length > 1) {
    let m = 0; const c = radarCentre();
    for (const s of st) m = Math.max(m, d3.geoDistance(c, [s.lon, s.lat]) * R_KM);
    return cl(m * 1.25, 120, 6000);
  }
  const tg = (SCENE.targets || [])[0];
  if (tg && tg.frame && tg.level !== "point") {
    const b = tg.frame, w = (b[2] - b[0] + 360) % 360 || 1, h = b[3] - b[1];
    return cl(Math.max(w * 111 * Math.cos((b[1] + b[3]) / 2 * Math.PI / 180), h * 111) * 0.9, 80, 4000);
  }
  return 260;
}
const RADAR = { c: null, km: 0 };
function radarInset(t) {
  const a = smooth(seg(t, 0.3, 0.6));
  if (a <= 0) return;
  if (!RADAR.c) { RADAR.c = radarCentre(); RADAR.km = radarKm(); }
  if (!RADAR.c) return;
  const R = 128, cx = 64 + R, cy = H - 58 - R;
  const pr = d3.geoOrthographic().clipAngle(90).precision(0.6).rotate([-RADAR.c[0], -RADAR.c[1]])
    .scale(R / (RADAR.km / R_KM)).translate([cx, cy]);
  const gp = d3.geoPath(pr, fctx);
  const L = LV.mid.topo ? LV.mid : LV.lo.topo ? LV.lo : LV.hi;
  fctx.save(); fctx.globalAlpha = a;
  fctx.shadowColor = "rgba(0,0,0,0.55)"; fctx.shadowBlur = 18; fctx.shadowOffsetY = 6;
  fctx.beginPath(); fctx.arc(cx, cy, R + 6, 0, Math.PI * 2); fctx.fillStyle = "#000000"; fctx.fill();
  fctx.shadowColor = "transparent";
  fctx.save(); fctx.beginPath(); fctx.arc(cx, cy, R, 0, Math.PI * 2); fctx.clip();
  fctx.fillStyle = PAL.bg; fctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  fctx.beginPath(); for (const f of L.all) gp(f); fctx.fillStyle = PAL.landNear; fctx.fill();
  fctx.strokeStyle = PAL.coast; fctx.lineWidth = 1.6; fctx.lineJoin = "round"; fctx.stroke();
  const tg = (SCENE.targets || [])[0];
  if (tg && tg.level !== "point") { const f = feature(tg.id, pr.scale()); if (f) { fctx.beginPath(); gp(f); fctx.fillStyle = PAL.hi; fctx.fill(); fctx.stroke(); } }
  if ((SCENE.stops || []).length > 1) {
    const ln = { type: "LineString", coordinates: SCENE.stops.map(s => [s.lon, s.lat]) };
    fctx.lineCap = "round"; fctx.lineJoin = "round";
    fctx.beginPath(); gp(ln); fctx.strokeStyle = PAL.routeCase || "#000"; fctx.lineWidth = 7; fctx.stroke();
    fctx.beginPath(); gp(ln); fctx.strokeStyle = PAL.route; fctx.lineWidth = 4; fctx.stroke();
  }
  for (const s of (SCENE.stops || []).filter(s => !s.via)) { const q = pr([s.lon, s.lat]); if (q) V2.pin.blip(fctx, q[0], q[1], 1, PAL.pin, 0.42); }
  /* the player arrow in the middle */
  fctx.save(); fctx.translate(cx, cy);
  fctx.beginPath(); fctx.moveTo(0, -13); fctx.lineTo(10, 11); fctx.lineTo(0, 5); fctx.lineTo(-10, 11); fctx.closePath();
  fctx.fillStyle = "#ffffff"; fctx.strokeStyle = "#000000"; fctx.lineWidth = 2.5; fctx.lineJoin = "round"; fctx.stroke(); fctx.fill();
  fctx.restore();
  fctx.restore();
  fctx.lineWidth = 3; fctx.strokeStyle = PAL.radarRim || "rgba(255,255,255,0.85)";
  fctx.beginPath(); fctx.arc(cx, cy, R + 1, 0, Math.PI * 2); fctx.stroke();
  /* north: a small disc on the rim */
  fctx.fillStyle = "#000000"; fctx.beginPath(); fctx.arc(cx, cy - R - 2, 15, 0, Math.PI * 2); fctx.fill();
  fctx.strokeStyle = PAL.radarRim || "#ffffff"; fctx.lineWidth = 2; fctx.stroke();
  fctx.fillStyle = "#ffffff"; fctx.font = `italic ${LWEIGHT} 17px ${LFONT}`; fctx.textAlign = "center"; fctx.textBaseline = "middle";
  fctx.fillText("N", cx, cy - R - 1);
  fctx.restore();
}

/* ── type: the look's lettering on the title block, and the decoration drawn round it ── */
let TDECO = null, TBOX = null;
function titleStyle() {
  if (tok("titleTrack", null) != null) titleEl.style.letterSpacing = tok("titleTrack", 0) + "px";
  if (tok("titleItalic", false)) titleEl.style.fontStyle = "italic";
  if (tok("titleStroke", null)) {
    titleEl.style.webkitTextStroke = tok("titleStroke", "");
    titleEl.style.paintOrder = "stroke fill";
  }
  if (tok("subTrack", null) != null) subEl.style.letterSpacing = tok("subTrack", 0) + "px";
  if (tok("subUpper", false)) subEl.textContent = upper(SCENE.subtitle || "");
  if (PAL.subWeight) subEl.style.fontWeight = PAL.subWeight;
  if (tok("subItalic", false)) subEl.style.fontStyle = "italic";
}
function textDeco(t, at) {
  const kind = tok("titleDeco", "none");
  if (!TDECO || !TBOX || kind === "none") return;
  const g = TDECO.getContext("2d");
  g.clearRect(0, 0, W, H);
  const p = eOut(seg(t, at - 0.1, 0.75));
  if (p <= 0 || !SCENE.title) return;
  const b = TBOX, x0 = b.left - 26, x1 = b.right + 30, y0 = b.top - 16, y1 = b.bottom + 18;
  g.save();
  if (kind === "rules") {               /* newsprint: a heavy rule over the headline, a hairline under the deck */
    g.fillStyle = PAL.ink; g.fillRect(b.left, y0 - 10, (x1 - b.left) * p, 6); g.fillRect(b.left, y1 + 2, (x1 - b.left) * p, 1.6);
  } else if (kind === "cartouche") {    /* the atlas title in a cartouche: a cream panel, a double rule */
    g.globalAlpha = p; g.fillStyle = PAL.cartouche || PAL.bg2;
    g.shadowColor = "rgba(60,40,20,0.25)"; g.shadowBlur = 18; g.shadowOffsetY = 4;
    g.fillRect(x0 - 14, y0 - 14, x1 - x0 + 28, y1 - y0 + 28); g.shadowColor = "transparent";
    g.strokeStyle = PAL.ink; g.lineWidth = 2.2; g.strokeRect(x0 - 6.5, y0 - 6.5, x1 - x0 + 13, y1 - y0 + 13);
    g.lineWidth = 0.9; g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
  } else if (kind === "block") {        /* a drawing's title block: a box drawn in, a rule between title and note */
    g.strokeStyle = PAL.inkSoft; g.lineWidth = 1.5; g.globalAlpha = 0.9;
    const w = (x1 - x0) * p, h = (y1 - y0);
    g.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
    if (b.split && p > 0.6) { g.beginPath(); g.moveTo(x0, b.split); g.lineTo(x0 + w, b.split); g.stroke(); }
  } else if (kind === "brackets") {     /* tactical: corner brackets round the block */
    g.strokeStyle = PAL.hiEdge || PAL.ink; g.lineWidth = 3; g.globalAlpha = p; const c = 26 * p + 6;
    for (const [px, py, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      g.beginPath(); g.moveTo(px, py + sy * c); g.lineTo(px, py); g.lineTo(px + sx * c, py); g.stroke();
    }
  } else if (kind === "bar") {          /* the explainer: a thick accent bar beside the block */
    g.fillStyle = PAL.hi; g.fillRect(b.left - 30, y0, 10, (y1 - y0) * p);
  } else if (kind === "rule") {         /* the neon sign: a lit rule beside the block (it ignites), the place's
                                           coordinates above the title in mono */
    const rx = b.left - 24, h = (y1 - y0) * smooth(cl(p * 1.3, 0, 1)), on = ignite(t - (at - 0.1));
    if (on > 0.001 && h > 1) {
      const rule = () => { g.beginPath(); g.moveTo(rx, y1); g.lineTo(rx, y1 - h); g.stroke(); };
      g.globalAlpha = on; g.lineCap = "round"; g.strokeStyle = PAL.hiEdge; g.lineWidth = 4;
      glowUnder(g, rule, 1, GLOWC);
      rule(); g.strokeStyle = PAL.hiCore || "#ffffff"; g.lineWidth = 1.4; g.stroke();
    }
    const c = radarCentre();
    if (c) {
      g.globalAlpha = p; letters(g, 2); g.font = `${MWEIGHT} 22px ${MFONT}`; g.fillStyle = PAL.hiLight;
      g.textBaseline = "alphabetic"; g.fillText(llText(c), b.left + 4, y0 - 4); letters(g, 0);
    }
  }
  g.restore();
}

/* every embedded face loaded BEFORE the title is measured (a v2 look only). A face no element has used yet is still
   unloaded when document.fonts.ready resolves, so the title was fitted and aligned on the FALLBACK face's width —
   the radar look's flush-right title then ran ~60 px past its edge in the real, wider face. */
V2.fonts = async () => {
  try { await Promise.all(Array.from(document.fonts).map(f => f.load().catch(() => null))); } catch (e) { /* fallback */ }
};
/* boot: the look's own layers (a v2 look only — the shipped skins never get here) */
V2.boot = () => {
  if (!V2ON) return;
  if (FADE === "black") { document.documentElement.style.background = "#000"; document.body.style.background = "#000"; }
  HALF = { dim: halftone(PAL.halfDim || "rgba(40,40,40,0.35)", 2.2), land: halftone(PAL.halfLand || "rgba(30,30,30,0.5)", 2.8),
           hi: halftone(PAL.hi, 4.0), mis: halftone(PAL.halfMis || "rgba(0,160,200,0.8)", 3.0) };
  const ov = tok("overlay", "");
  if (OVERLAYS[ov]) OVERLAYS[ov](overlayCanvas("over", "vig").getContext("2d"));
  if (tok("titleDeco", "none") !== "none") { TDECO = overlayCanvas("tdeco", "title"); V2.textDeco = textDeco; }
  V2.textStyle = titleStyle;
  if (LK.radar) V2.post = radarInset;
};

/* ── drive ─────────────────────────────────────────────────────────────── */
async function boot() {
  try { await document.fonts.ready; } catch (e) { /* the fallback face still renders */ }
  if (V2ON) await V2.fonts();
  try { await loadRelief(); } catch (e) { /* no photograph: the vectors carry the scene */ }
  paintGround();
  V2.boot();
  const frame = (SHOTS[SCENE.shot] || SHOTS.region)();
  window.__errors = [];
  window.renderFrame = t => {
    const fin = cl(t / 0.35, 0, 1), fout = cl((D - t) / 0.45, 0, 1);
    /* v2 looks may cut instead of dipping (FADE "cut"), or dip to black rather than to a light paper ("black") */
    $("stage").style.opacity = FADE === "cut" ? "1.000" : Math.min(fin, fout).toFixed(3);
    /* A bug in one frame is reported, not fatal: maps.py prints what went wrong, and
       the video keeps the frames around it instead of losing the whole render. */
    try { V2.now = t; frame(t); if (V2.post) V2.post(t); } catch (e) { if (window.__errors.length < 5) window.__errors.push(`t=${t.toFixed(2)}: ${e && e.stack || e}`); }
  };
  window.renderFrame(0);
  window.__ready = true;
}
boot().catch(e => { document.title = "ERR " + e; throw e; });
