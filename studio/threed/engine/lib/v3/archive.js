// archive.js — Legion 3D v3, WP2 (V3_SPEC 2.2): REAL archival photos and film INSIDE the 3D world, deterministic per
// frame. Every kind takes its media from the job's assets (lib/shared/media.js: "src": "assets/<file>" or an image
// sequence "assets/<dir>/" + fps); a missing file renders a neutral card / screen and a warning, never a crash.
//   archive.photo        one print (white border, curl, gloss, age, typed label + decoded epithet), lying or tilted
//   archive.desk         fern's dossier: a dark plank desk under one warm lamp, prints / maps / documents / folders /
//                        telegrams / insignia overlapping, sliding in eased with a settling turn, soft contact shadows,
//                        clutter (pen, magnifier, ashtray with a smoking cigarette, paper clips, a coffee ring), dust in
//                        the lamp light; anchors item_N for camera targets and rack focus
//   archive.wall         cork / plaster / map board with pinned prints and RED STRING drawn pin to pin
//   archive.frame        a framed photo (wood | gilt | steel) on a wall or standing on a desk, glass reflection
//   archive.projector    a 16 mm projector in a dark room: reels turning, the lamp leaking light, a volumetric BEAM with
//                        dust motes and the film's own light in it, the screen playing the sequence (the image is the
//                        projector's light: anything in the beam catches the picture), the screen's glow on the room
//   archive.screen       a screen / hanging sheet playing a sequence (no projector)
//   archive.tv           a period CRT set (1940s-80s) playing a sequence: curvature, scanlines, glow, flicker
//   archive.filmstrip    a 35 mm strip (sprockets, edge code) snaking through space, frames from the sequence, scrolling
//   archive.float        a 2.5D parallax photo: depth layers of one real photo floating in a void or the sky
//   archive.relief       the real portrait as a displaced relief mesh lit by real lights (the red slit in the void)
//   archive.paper_label  a typed paper strip as an object in the world (decodes in like the screen strip)
// Faces: the real people appear only through these archival photographs (V3_SPEC 0); nothing here draws a face.
// Determinism: media are decoded in build(); every update(t) is a pure function of t (frame = floor(t x fps)).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { patchMaterial } from '../shared/env.js';
import { clamp, smooth, smoother, lerp } from '../shared/util.js';
import { loadImage, loadSequence, archivalMaterial, setArchivalFrame, paperSheet, printCanvas, typeLine, measureType, makeStrip, exposureOf, liveExposure, drawFrame, noLogShadows } from '../shared/media.js';
import { woodTex, canvas, ctex, cached, std, phys, makeRng, rgba } from '../human/details_core.js';
import { ground, xz, yawFromHeading } from '../human/common.js';

const DEG = Math.PI / 180, TAU = Math.PI * 2;
const num = (v, d) => (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(+v) ? +v : d);
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (t, s = 0) => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return lerp(hash(i, s), hash(i + 1, s), u) * 2 - 1; };
const keep = (o) => { if (o) o.userData.keep = true; return o; };

const P_PRINT = { src: 'assets/<photo>.jpg', w: 'print width m (0.18)', border: '0..0.12 white border', curl: '0..1', gloss: '0..1', age: '0..1', label: 'typed name on the border', label2: 'second line (bold epithet), decodes in', label2_t: 's: when label2 decodes (default: always typed)', label_font: 'courier (default) | typewriter (Special Elite) | hand', label2_font: 'courier' };
export const CATALOG = {
  'archive.photo': { section: 'objects', desc: 'ARCHIVE: one real archival print (src photo) with a white border, slight curl, matte or glossy, aged; a typed name on the bottom border and a bold epithet that decodes in (fern). Lies flat (tilt deg props it up)', params: { ...P_PRINT, tilt: 'deg (0 = flat)', elev: 'm above the ground (0.76 on a desk)' }, anchors: ['center'], footprint: [0.3, 0.3], height: 0.05, contact: false, tags: ['archive', 'photo', 'print', 'real photo', 'evidence'] },
  'archive.desk': { section: 'objects', desc: "ARCHIVE: fern's dossier desk — a dark plank desk under ONE warm lamp; real prints (src) with typed labels, maps, documents, folders, telegrams, an insignia patch, overlapping at angles; items slide in from a frame edge (enter_t) and settle; clutter (pen, magnifier, ashtray + smoking cigarette, paper clips, coffee ring); dust in the lamp light. Film it top-down (pitch -75..-85 deg, fov 30-35, 0.8-1.1 m above the top, slow push) with a rack focus between item_N anchors", params: { items: "[{src | kind: photo|map|doc|insignia|folder|telegram, at: [x, z] desk m from its centre (+z = reader), rot deg, w m, label, label2, label2_t, enter_t, enter_from: left|right|top|bottom, enter_dist m (0.5), enter_dur s (1.1), clip: bool, text, title, stamp}]", wood: 'walnut|oak|green_leather', lamp: 'true | banker (a visible green lamp) | false', lamp_at: '[x, y, z] desk m', clutter: '0..1', clutter_at: '{pen, magnifier, ashtray, coffee: [x, z]} (default: placed in the pile round the hero)', size: '[w, d] m (2.0, 1.2)', dust: '0..1' }, anchors: ['top', 'item_N', 'hero'], footprint: [2.0, 1.2], height: 0.8, contact: false, tags: ['archive', 'desk', 'dossier', 'photos', 'evidence', 'investigation', 'documents', 'map'] },
  'archive.wall': { section: 'objects', desc: 'ARCHIVE: an investigation wall — cork, plaster or a big map as the board, real prints and papers pinned, RED STRING drawn from pin to pin (strings_t), a warm lamp grazing it', params: { items: '[{src | kind, at: [x, y] board m from its centre, rot, w, label, label2}]', strings: '[[i, j], ...] item indices', strings_t: 's: first string starts drawing (each 0.5 s later)', board: 'cork|plaster|map', map_src: 'assets/<map>.jpg (board map)', size: '[w, h] m (2.4, 1.4)', elev: 'm board bottom (0.6)', lamp_angle: 'deg (27)', lamp_at: '[x, y, z]', lamp_aim: '[x, y, z]', dust: '0..1 (0.4)' }, anchors: ['center', 'item_N'], footprint: [2.6, 0.3], height: 2.2, contact: false, tags: ['archive', 'wall', 'red string', 'corkboard', 'conspiracy', 'investigation'] },
  'archive.frame': { section: 'objects', desc: 'ARCHIVE: a framed real photo (wood, gilt or steel frame, mat, glass with a soft reflection) on a wall or standing on a desk on its strut', params: { src: 'assets/<photo>.jpg', frame: 'wood|gilt|steel', mount: 'wall|desk', w: 'm (0.3)', elev: 'm (wall: centre 1.5; desk: 0.76)' }, anchors: ['center'], footprint: [0.4, 0.2], height: 0.4, contact: false, tags: ['archive', 'frame', 'portrait', 'photo'] },
  'archive.projector': { section: 'objects', desc: 'ARCHIVE: a 16 mm projector in a dark room playing a real film sequence on a screen: reels turning, a visible BEAM with dust motes and the film light in it, flicker; anything standing in the beam catches the picture (silhouettes in front of the screen). Put the camera beside / behind the projector, 1-2 m off the beam', params: { src: 'assets/<dir>/ (frames 0001.jpg...)', fps: '24', screen_w: 'm (2.4)', dist: 'm projector -> screen (5.5)', beam: '0..1 (0.6)', dust: '0..1 (0.6)', flicker: '0..1 (0.5)', screen: 'sheet|framed', room: 'true | false', elev: 'm lens table (0.9)', chairs: 'n empty chairs per row (0)', rows: '1..4 (2)' }, anchors: ['lens', 'screen', 'projector'], footprint: [1.0, 6.5], height: 2.5, contact: false, tags: ['archive', 'projector', 'cinema', 'newsreel', 'film', 'screening', 'beam'] },
  'archive.screen': { section: 'objects', desc: 'ARCHIVE: a screen or hanging sheet playing a real film sequence (no projector), glowing on a dark room', params: { src: 'assets/<dir>/', fps: '24', w: 'm (2.4)', elev: 'm bottom (0.8)', screen: 'sheet|framed', flicker: '0..1' }, anchors: ['screen'], footprint: [2.6, 0.3], height: 2.6, contact: false, tags: ['archive', 'screen', 'film', 'newsreel'] },
  'archive.tv': { section: 'objects', desc: 'ARCHIVE: a period CRT television (1940s-80s) playing a real sequence: curved glass, scanlines, phosphor glow, flicker, a rolling bar', params: { src: 'assets/<dir>/', fps: '24', era: '1950s|1970s', w: 'screen width m (0.42)', elev: 'm (0 = a console on the floor)', lamp: 'true: a dim warm room lamp to one side | false' }, anchors: ['screen'], footprint: [0.8, 0.5], height: 1.0, contact: false, tags: ['archive', 'tv', 'television', 'crt', 'broadcast'] },
  'archive.filmstrip': { section: 'objects', desc: 'ARCHIVE: a 35 mm film strip (sprockets, edge code) as a ribbon snaking through space, every frame a still of the sequence, scrolling; backlit', params: { src: 'assets/<dir>/', length: 'm (3)', scale: 'x real 35 mm (8)', scroll: 'm/s (0.12)', path: "'wave' | 'arc' | [[x, y, z] ...] local m", elev: 'm (1.4)' }, anchors: ['center'], footprint: [3, 1], height: 1.6, contact: false, fly: true, tags: ['archive', 'film', 'filmstrip', 'reel'] },
  'archive.float': { section: 'objects', desc: 'ARCHIVE: a 2.5D parallax photo — one real photo split into depth layers floating in a void or the sky, drifting; a camera move gives real parallax (push / truck 0.3-1 m across it)', params: { src: 'assets/<photo>.jpg', depth: "'auto' | 'src' (assets/<photo>.depth.png)", layers: '2..4 (3)', w: 'm (1.6)', elev: 'm centre (1.6)', sep: 'm between layers (w x 0.08)', drift: '0..1', lit: 'false (self-lit) | true', border: 'true = a white print border', edge: 'feather (default: melts into the void) | hard', feather: '0..0.3 (0.09)', dust: '0..1 faint drifting specks (0.35)' }, anchors: ['center'], footprint: [2, 0.5], height: 2.2, contact: false, fly: true, tags: ['archive', 'photo', 'parallax', '2.5d', 'memory'] },
  'archive.relief': { section: 'objects', desc: 'ARCHIVE: the real portrait as a relief: the photo displaced by its depth and lit by real light — a red slit gobo sliding across the face in a black void (fern red-slit beat, real likeness, no CG face)', params: { src: 'assets/<portrait>.jpg', depth: "'src' (assets/<photo>.depth.png) | 'auto'", w: 'm (0.7)', relief: 'm (0.16)', elev: 'm centre (1.55)', key: 'slit|soft|none', slit_color: '#ff7048 (x the gobo: deep-red edges, orange core)', slit_w: 'm core width (w x 0.07)', slit_soft: '0.002..0.08 edge blur (0.02)', fill: '0..1 dim warm fill outside the slit (0.045)', slit_sweep: '[x0, x1] m across the face', slit_t: '[t0, t1] s', rim: '0..1 cool side-back rim (0 with the slit, 0.25 otherwise)', soften: '0..0.1 depth blur (0.03)', edge_dark: '0..1 darkens steep depth walls (0.6)' }, anchors: ['center', 'face'], footprint: [0.8, 0.4], height: 2, contact: false, fly: true, tags: ['archive', 'portrait', 'relief', 'bust', 'void', 'face', 'real photo'] },
  'archive.paper_label': { section: 'objects', desc: 'ARCHIVE: a typed paper strip as an object in the world (on a desk, a wall, a box): off-white, dark typewriter text that decodes in at t_in', params: { text: 'string', text2: 'second line', font: 'courier (bold, default) | typewriter', h: 'cap height m (0.012)', t_in: 's', elev: 'm (0.76)', tilt: 'deg (0 = lying flat; 90 = standing)' }, anchors: ['center'], footprint: [0.3, 0.1], height: 0.02, contact: false, tags: ['archive', 'label', 'typewriter', 'date', 'paper'] },
};

// ── shared bits ──────────────────────────────────────────────────────────────────────────────────────────────────
function rootAt(kind, item, ctx, elev = 0) {
  const G = ground(ctx), at = xz(item.at), r = new THREE.Group(); r.name = kind;
  r.position.set(at[0], G.h(at[0], at[1]) + elev, at[1]);
  // heading = a plain turn of the whole set about its centre: 0 (the registry's default for objects) keeps local axes =
  // world axes (+z faces the reader / the room; a print's top edge points to -z); 90 turns it a quarter clockwise
  r.rotation.y = -num(item.heading, 0) * DEG;
  return r;
}
function softRectTex() {
  return cached('arc_softrect', () => {
    const [c, g] = canvas(256, 256); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    g.filter = 'blur(18px)'; g.fillStyle = '#fff'; g.fillRect(40, 40, 176, 176); g.filter = 'none';
    return ctex(c, false);
  });
}
// a soft rectangular contact shadow lying on a surface (named contactShadow: QA, DOF and the registry skip it)
function contactRect(w, d, a = 0.5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: softRectTex(), transparent: true, opacity: a, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  m.name = 'contactShadow'; m.userData.contactShadow = true; m.renderOrder = 1; m.castShadow = m.receiveShadow = false; return m;
}
const paperMat = (hex, rough = 0.92) => std({ color: hex, roughness: rough, metalness: 0 });
// the black void round a closed archive set (j1: the interior world's night sky and stars showed behind the relief, the
// float, the TV, the screen). Default on when the scene is a void (world interior / none) and has no interior.* room;
// `void: false` turns it off, `void: '#hex'` tints it. Named *sky* so the depth-of-field occluders skip it; writes depth
// so a sky drawn after it stays hidden; never a QA obstacle.
function wantsVoid(item, ctx) {
  if (item.void != null) return item.void !== false && item.void !== 'none';
  const w = (ctx.spec && ctx.spec.world) || {}, b = String(w.biome || w.kind || 'interior');
  return /^(interior|void|none|world\.interior)$/.test(b) && !(ctx.spec?.structures || []).some((e) => /^interior\./.test(String(e?.kind)));
}
function voidDome(root, item, ctx, r = 32) {
  if (!wantsVoid(item, ctx)) return null;
  const col = typeof item.void === 'string' && /^#?[0-9a-f]{6}$/i.test(item.void) ? new THREE.Color(item.void.startsWith('#') ? item.void : '#' + item.void) : new THREE.Color(0x000000);
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshBasicMaterial({ color: col, side: THREE.BackSide, fog: false, toneMapped: false }));
  m.name = 'arc_void_sky'; m.userData.noQA = true; m.frustumCulled = false; m.castShadow = m.receiveShadow = false;
  root.add(m); return m;
}
// image pixels at a size (an <img> or a canvas)
function pixels(src, w, h) {
  const [c, g] = canvas(w, h); g.drawImage(src, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

// a film sequence for a screen-type kind: HOLDS its last frame by default (review 1: looping repeated footage inside one
// shot, H8); `loop: true` opts in. Warns when the clip is shorter than the shot.
async function seqFor(item, ctx, kind, extra = {}) {
  if (!item.src) return null;
  const loop = item.loop === true;
  const seq = await loadSequence({ src: item.src, fps: num(item.fps, 24), loop, start: num(item.start, 0), t0: num(item.t0, 0), ...extra }, ctx);
  if (seq) {
    const len = (seq.n - num(item.start, 0)) / seq.fps, shot = num(ctx.dur, 0) - num(item.t0, 0);
    if (shot > len + 0.05) (ctx.warnings || []).push(`${kind}: the sequence '${item.src}' runs ${len.toFixed(1)} s, the shot ${shot.toFixed(1)} s: it ${loop ? 'LOOPS (repeated footage, H8)' : 'holds its last frame'} for the last ${(shot - len).toFixed(1)} s — give a clip at least as long as the shot`);
  }
  return seq;
}
// a dim grey "no signal" card for a screen whose sequence is missing (review 1: a blank glowing white sheet tripped the
// exposure safety): mid-grey noise at the level of a normal frame
function noSignalTex() {
  return cached('arc_nosignal', () => { const [c, g] = canvas(320, 240), R = makeRng(13); g.fillStyle = '#2E2D2B'; g.fillRect(0, 0, 320, 240);
    for (let i = 0; i < 9000; i++) { const v = 30 + R() * 50; g.fillStyle = `rgb(${v},${v},${v * 0.97})`; g.fillRect(R() * 320, R() * 240, 1, 1); }
    const q = g.createRadialGradient(160, 120, 20, 160, 120, 200); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = q; g.fillRect(0, 0, 320, 240);
    const t = ctex(c); return t; });
}

// ── depth for the relief / parallax kinds ────────────────────────────────────────────────────────────────────────
// 'src': a depth PNG next to the photo (assets/<name>.depth.png, white = near; made offline, e.g. by the PHOTO FX cut
// or a depth model); an optional matte <name>.matte.png (white = the subject) sharpens the cut-out. 'auto' (review 1:
// the old head-ellipse prior gave a balloon head, a halo cut-out and ragged layers): the border ring decides —
//   a BUSY background (texture in the upper border ring: brick, trees, an interior) -> 'flat': no displacement, a soft
//     oval matte (the print fades into the dark; the float gets one feathered oval cut);
//   a plain studio backdrop -> the subject matte (|L - the backdrop|, per row) inflated by its distance transform (a
//     rounded bas-relief that follows the real silhouette, low amplitude).
// -> { D (0..1, near = 1), M (matte 0..1), w, h, src: 'png' | 'auto' | 'flat', busy }
function chamfer(B, w, h) {          // distance (px) to the nearest 0 cell, 3-4 chamfer
  const D = new Float32Array(w * h), INF = 1e9;
  for (let i = 0; i < w * h; i++) D[i] = B[i] ? INF : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!D[i]) continue; let v = D[i];
    if (x > 0) v = Math.min(v, D[i - 1] + 3); if (y > 0) { v = Math.min(v, D[i - w] + 3); if (x > 0) v = Math.min(v, D[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, D[i - w + 1] + 4); } D[i] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!D[i]) continue; let v = D[i];
    if (x < w - 1) v = Math.min(v, D[i + 1] + 3); if (y < h - 1) { v = Math.min(v, D[i + w] + 3); if (x < w - 1) v = Math.min(v, D[i + w + 1] + 4); if (x > 0) v = Math.min(v, D[i + w - 1] + 4); } D[i] = v; }
  for (let i = 0; i < w * h; i++) D[i] = Math.min(D[i], 3 * (w + h)) / 3;
  return D;
}
function boxBlur(A, w, h, r) {
  if (!(r > 0)) return A;
  let X = A;
  for (let pass = 0; pass < 2; pass++) {
    const B = new Float32Array(w * h), C = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k; s += X[y * w + xx]; n++; } B[y * w + x] = s / n; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k; s += B[yy * w + x]; n++; } C[y * w + x] = s / n; }
    X = C;
  }
  return X;
}
function ovalMatte(w, h, item) {
  const M = new Float32Array(w * h), hx = num(item.head?.[0], 0.5), cy = Math.min(0.5, num(item.head?.[1], 0.35) + 0.12);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / (w - 1), v = y / (h - 1); const d = Math.hypot((u - hx) / 0.5, (v - cy) / 0.62); M[y * w + x] = (1 - smooth((d - 0.4) / 0.52)) * smooth(Math.min(u, 1 - u) / 0.06); }   // fully faded before the image's side edges (f1: the plane edge showed under a soft key)
  return M;
}
async function depthOf(item, img, ctx, N = 192) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const w = N, h = Math.max(8, Math.round(N * ih / iw));
  const bgT = clamp(num(item.bg, 0.12));
  if (item.depth !== 'auto') {
    const base = String(item.src).replace(/\.[a-z0-9]+$/i, '');
    const ds = item.depth_src || (typeof item.depth === 'string' && item.depth !== 'src' ? item.depth : base + '.depth.png');
    const t = await loadImage(ds, { ...ctx, warn: (m) => { if (item.depth === 'src') (ctx.warnings || []).push(m + ' (archive: using depth auto)'); } });
    if (t && t.image) {
      const d = pixels(t.image, w, h), D = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) D[i] = d[i * 4] / 255;
      let M = null;
      const mt = item.matte !== false ? await loadImage(item.matte_src || base + '.matte.png', { ...ctx, warn: () => {} }) : null;
      if (mt && mt.image) { const md = pixels(mt.image, w, h); M = new Float32Array(w * h); for (let i = 0; i < w * h; i++) M[i] = md[i * 4] / 255; }
      else { M = new Float32Array(w * h); for (let i = 0; i < w * h; i++) M[i] = smooth((D[i] - bgT * 0.6) / Math.max(0.02, bgT * 0.9)); }
      return { D, M, w, h, src: 'png', busy: false };
    }
  }
  const d = pixels(img, w, h), L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  // busy? the mean gradient over the upper 60 % of the side rings and the top ring (calibrated on the test photos: the
  // studio portrait 0.020; brick 0.035-0.062; interiors, trees, streets 0.055-0.14)
  const ring = Math.max(2, Math.round(w * 0.05)), hh = Math.round(h * 0.6);
  let gs = 0, gn = 0;
  for (let y = 0; y < hh; y++) for (let x = 0; x < w - 1; x++) {
    if (!(x < ring || x >= w - ring || y < ring)) continue;
    gs += Math.abs(L[y * w + x + 1] - L[y * w + x]) + Math.abs(L[(y + 1) * w + x] - L[y * w + x]); gn++;
  }
  // two-tone? (a light wall on one side, a dark door on the other: the subject cannot be told from the backdrop by
  // luminance; f2: the light wall beside the head was kept as a lit slab)
  let sl = 0, sr = 0, nl0 = 0; for (let y = 0; y < hh; y++) for (let x = 0; x < ring; x++) { sl += L[y * w + x]; sr += L[y * w + w - 1 - x]; nl0++; }
  const twoTone = Math.abs(sl - sr) / Math.max(1, nl0) > num(item.tone_max, 0.22);
  const busyK = gs / Math.max(1, gn), busy = busyK > num(item.busy_max, 0.028) || twoTone;
  if (busy) {
    (ctx.warnings || []).push(`archive: depth 'auto' on '${item.src}' — its background is ${twoTone ? 'two-tone' : `busy (texture ${busyK.toFixed(3)})`}, so it is not cut out: a flat print fading into the dark (give a <photo>.depth.png + .matte.png for a relief / parallax)`);
    return { D: new Float32Array(w * h), M: ovalMatte(w, h, item), w, h, src: 'flat', busy: true };
  }
  // the backdrop, interpolated per row from the left and right edges (studio backdrops vary)
  const edgeL = (y, x0, x1) => { let s = 0, n = 0; for (let x = x0; x < x1; x++) { s += L[y * w + x]; n++; } return s / Math.max(1, n); };
  const S = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { const l0 = edgeL(y, 0, ring), l1 = edgeL(y, w - ring, w); for (let x = 0; x < w; x++) S[y * w + x] = Math.abs(L[y * w + x] - lerp(l0, l1, x / (w - 1))); }
  const Sb = boxBlur(S, w, h, Math.round(w * 0.025));
  let M = new Float32Array(w * h); for (let i = 0; i < w * h; i++) M[i] = smooth((Sb[i] - 0.06) / 0.14);
  // the subject touches the bottom (a bust): fill each column from its lowest subject pixel down (no holes in the coat)
  for (let x = 0; x < w; x++) { let on = false; for (let y = 0; y < h; y++) { const i = y * w + x; if (M[i] > 0.6 && y > h * 0.45) on = true; if (on) M[i] = Math.max(M[i], 0.85); } }
  M = boxBlur(M, w, h, 1);
  const B = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) B[i] = M[i] > 0.5 ? 1 : 0;
  const DT = chamfer(B, w, h); let mx = 1e-3; for (let i = 0; i < w * h; i++) mx = Math.max(mx, DT[i]);
  const D = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) D[i] = clamp(Math.sqrt(DT[i] / mx) * 0.9 + (L[i] - 0.5) * 0.04) * M[i];
  return { D: boxBlur(D, w, h, 2), M, w, h, src: 'auto', busy: false };
}
// soften a depth map (two box passes ~ a gaussian): steps in a hand-made or heuristic depth become slopes, so a grazing
// light never draws the outline of the head ellipse (j2: the portrait read as a face on an egg)
function blurD(dm, r) {
  if (!(r > 0)) return dm;
  const { w, h } = dm; let A = dm.D;
  for (let pass = 0; pass < 2; pass++) {
    const B = new Float32Array(w * h), C = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k; s += A[y * w + xx]; n++; } B[y * w + x] = s / n; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k; s += B[yy * w + x]; n++; } C[y * w + x] = s / n; }
    A = C;
  }
  return { ...dm, D: A };
}
const sampleD = (dm, u, v) => {
  const x = clamp(u) * (dm.w - 1), y = clamp(v) * (dm.h - 1), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(dm.w - 1, x0 + 1), y1 = Math.min(dm.h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const D = dm.D; return lerp(lerp(D[y0 * dm.w + x0], D[y0 * dm.w + x1], fx), lerp(D[y1 * dm.w + x0], D[y1 * dm.w + x1], fx), fy);
};

// ── dust motes: points drifting in a box, lit only where a light cone (spot) or the projector's pyramid reaches ──
const MOTE_VS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec4 aSeed; uniform float uT; uniform vec3 uBox; uniform float uSize; uniform float uResY;
  uniform int uMode; uniform vec3 uLPos; uniform vec3 uLDir; uniform vec2 uCone; uniform mat4 uW2P; uniform vec2 uAx; uniform float uDist; uniform vec3 uN; uniform float uK;
  varying float vB; varying vec3 vTint;
  float h1(float n){ return fract(sin(n) * 43758.5453); }
  void main(){
    vec3 s = aSeed.xyz; float ph = aSeed.w * 6.2831;
    vec3 p = (s - 0.5) * uBox;
    p += vec3(sin(uT * (0.11 + 0.07 * s.x) + ph) * 0.06, 0.0, cos(uT * (0.09 + 0.05 * s.z) + ph * 1.3) * 0.06) * uBox.x / max(uBox.x, 1.0);
    p.y = mod(p.y + uBox.y * 0.5 + uT * (0.004 + 0.008 * s.y) + sin(uT * 0.3 + ph) * 0.01, uBox.y) - uBox.y * 0.5;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    float b = 0.0; vTint = vec3(1.0);
    if (uMode == 0) { vec3 d = wp.xyz - uLPos; float r = length(d); float c = dot(d / max(r, 1e-4), uLDir);
      b = smoothstep(uCone.x, uCone.y, c) / max(r * r, 0.05); }
    else if (uMode == 2) { vec3 d = wp.xyz - uLPos; float r = length(d); float al = dot(d, uLDir);      // a slit's band: a thin slab through the light
      if (al > 0.05) { float off = abs(dot(d, uN)) / al; b = (1.0 - smoothstep(uK * 0.45, uK * 1.5, off)) / max(r * r, 0.05); } }
    else { vec3 q = (uW2P * wp).xyz; if (q.z > 0.05 && q.z < uDist) { vec2 e = abs(q.xy / (q.z * uAx)); b = (1.0 - smoothstep(0.82, 1.0, max(e.x, e.y))) * smoothstep(0.6, 2.6, q.z) / max(q.z * q.z, 1.2); } }   // flat and fading in near the lens (j1/j2: a bright spray of specks there)
    float tw = 0.65 + 0.35 * sin(uT * (1.3 + 2.0 * s.z) + ph * 3.0);
    vB = b * tw;
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + s.x) * uResY / max(-mv.z, 0.05);
    #include <logdepthbuf_vertex>
  }`;
const MOTE_FS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uCol; uniform float uI; varying float vB; varying vec3 vTint;
  void main(){
    #include <logdepthbuf_fragment>
    vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d));
    gl_FragColor = vec4(uCol * vTint * vB * uI * a * a, 1.0);
  }`;
function motes(n, box, seed, col, mode) {
  const R = makeRng(seed), A = new Float32Array(n * 4), P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { A[i * 4] = R(); A[i * 4 + 1] = R(); A[i * 4 + 2] = R(); A[i * 4 + 3] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(A, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(...box));
  const U = { uT: { value: 0 }, uBox: { value: new THREE.Vector3(...box) }, uSize: { value: 0.0016 }, uResY: { value: 1080 }, uMode: { value: mode === 'proj' ? 1 : mode === 'slab' ? 2 : 0 },
    uLPos: { value: new THREE.Vector3() }, uLDir: { value: new THREE.Vector3(0, -1, 0) }, uCone: { value: new THREE.Vector2(0.8, 0.95) },
    uW2P: { value: new THREE.Matrix4() }, uAx: { value: new THREE.Vector2(0.2, 0.15) }, uDist: { value: 5 }, uCol: { value: new THREE.Color(col) }, uI: { value: 0.05 },
    uN: { value: new THREE.Vector3(1, 0, 0) }, uK: { value: 0.02 } };
  const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m); pts.name = 'arc_motes'; pts.frustumCulled = false; pts.userData.noQA = true; pts.renderOrder = 5;
  return { pts, U };
}

// dust INSIDE a spot's cone (the desk; review 1): motes are born in the cone between uS.x and uS.y metres from the lamp,
// drift and swirl slowly, fade toward the cone's edge, near the lens and wherever the view ray behind them misses the lit
// desk (no specks over the black void), and grow into soft, dimmer discs away from the focus distance (defocus)
const CONE_VS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec4 aSeed; uniform float uT; uniform float uSize; uniform float uResY; uniform float uFocus;
  uniform vec3 uLPos; uniform vec3 uLDir; uniform vec2 uCone; uniform vec2 uS; uniform mat4 uDeskInv; uniform vec2 uHalf;
  varying float vB; varying vec3 vTint;
  void main(){
    vec3 s = aSeed.xyz; float ph = aSeed.w * 6.2831; vTint = vec3(1.0);
    vec3 ax = normalize(uLDir);
    vec3 t1 = normalize(abs(ax.y) < 0.95 ? cross(ax, vec3(0.0, 1.0, 0.0)) : cross(ax, vec3(1.0, 0.0, 0.0))); vec3 t2 = cross(ax, t1);
    float tanA = sqrt(max(1.0 - uCone.x * uCone.x, 1e-4)) / max(uCone.x, 1e-3);
    float sa = fract(s.y + uT * (0.006 + 0.008 * s.x) * (aSeed.w > 0.5 ? 1.0 : -1.0));
    float sd = mix(uS.x, uS.y, sa);
    float rf = sqrt(s.x) * 0.8;
    float ang = s.z * 6.2831 + uT * (0.05 + 0.06 * s.y) * (aSeed.w > 0.5 ? 1.0 : -1.0);
    vec3 p = uLPos + ax * sd + (t1 * cos(ang) + t2 * sin(ang)) * rf * sd * tanA;
    p += vec3(sin(uT * 0.37 + ph), 0.6 * sin(uT * 0.23 + ph * 1.7), cos(uT * 0.31 + ph * 0.7)) * 0.01;
    vec3 d = p - uLPos; float r = length(d);
    float b = smoothstep(uCone.x, uCone.y, dot(d / max(r, 1e-4), ax)) / max(r * r, 0.05);
    b *= 1.0 - smoothstep(0.55, 0.95, rf);
    b *= smoothstep(0.0, 0.12, sa) * (1.0 - smoothstep(0.88, 1.0, sa));            // born and dying softly at the ends
    vec3 lo = (uDeskInv * vec4(cameraPosition, 1.0)).xyz, lp = (uDeskInv * vec4(p, 1.0)).xyz, ld = lp - lo;
    b *= smoothstep(0.004, 0.03, lp.y);                                            // above the top
    float bg = 0.0;
    if (ld.y < -1e-5) { float th = -lo.y / ld.y; vec2 hp = lo.xz + ld.xz * th; vec2 e = uHalf - abs(hp);
      bg = smoothstep(0.0, 0.1, min(e.x, e.y));
      vec3 hw = cameraPosition + (p - cameraPosition) * th; vec3 dh = hw - uLPos;
      bg *= 0.15 + 0.85 * smoothstep(uCone.x, uCone.y, dot(normalize(dh), ax)); }
    vec4 mv = viewMatrix * vec4(p, 1.0); float z = -mv.z;
    b *= smoothstep(0.12, 0.4, z);
    float blur = clamp(abs(z - uFocus) / max(uFocus, 0.1) * 2.5, 0.0, 2.5);
    vB = b * bg * (0.7 + 0.3 * sin(uT * (1.1 + 1.6 * s.z) + ph * 3.0)) / (1.0 + 1.4 * blur);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + blur) * (0.6 + 0.8 * s.x) * uResY * projectionMatrix[1][1] * 0.5 / max(z, 0.05);
    #include <logdepthbuf_vertex>
  }`;
function coneMotes(n, seed, col) {
  const R = makeRng(seed), A = new Float32Array(n * 4), P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { A[i * 4] = R(); A[i * 4 + 1] = R(); A[i * 4 + 2] = R(); A[i * 4 + 3] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(A, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  const U = { uT: { value: 0 }, uSize: { value: 0.003 }, uResY: { value: 1080 }, uFocus: { value: 1 }, uLPos: { value: new THREE.Vector3() }, uLDir: { value: new THREE.Vector3(0, -1, 0) },
    uCone: { value: new THREE.Vector2(0.8, 0.95) }, uS: { value: new THREE.Vector2(0.3, 1) }, uDeskInv: { value: new THREE.Matrix4() }, uHalf: { value: new THREE.Vector2(1, 0.6) },
    uCol: { value: new THREE.Color(col) }, uI: { value: 0.05 } };
  const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: CONE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m); pts.name = 'arc_motes'; pts.frustumCulled = false; pts.userData.noQA = true; pts.userData.noCollide = true; pts.renderOrder = 5;
  return { pts, U };
}

// per frame: a 'spot' mote cloud follows its light (position, direction, cone) — the desk, the wall
const _mlp = new THREE.Vector3(), _mlt = new THREE.Vector3();
function aimMotes(dust, spot, t, ctx) {
  dust.U.uT.value = t;
  spot.getWorldPosition(_mlp); spot.target.getWorldPosition(_mlt);
  dust.U.uLPos.value.copy(_mlp); dust.U.uLDir.value.copy(_mlt).sub(_mlp).normalize();
  dust.U.uCone.value.set(Math.cos(spot.angle), Math.cos(spot.angle * 0.45));
  dust.U.uResY.value = ctx.renderer ? ctx.renderer.domElement.height : 1080;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PRINTS AND PAPERS (one card = a canvas on a thin bent sheet)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// the planked desk top: the walnut / oak grain drawn plank by plank (each its own offset and tone), seams, butt joints,
// wear; 2048 px = 1.2 m
function plankWood(kind) {
  return cached('arc_planks:' + kind, () => {
    const S = 2048, src = woodTex(kind === 'oak' ? 'oak' : 'walnut').map.image, R = makeRng(kind === 'oak' ? 17 : 23);
    const [c, g] = canvas(S, S), n = 8, ph = S / n;
    for (let k = 0; k < n; k++) {
      const y = k * ph, ox = Math.floor(R() * S), oy = Math.floor(R() * (src.height - ph));
      g.save(); g.beginPath(); g.rect(0, y, S, ph); g.clip();
      g.drawImage(src, ox, oy, S - ox, ph, 0, y, S - ox, ph); if (ox > 0) g.drawImage(src, 0, oy, ox, ph, S - ox, y, ox, ph);
      const v = (R() - 0.5) * 0.5; g.fillStyle = v > 0 ? `rgba(200,150,100,${v * 0.35})` : `rgba(0,0,0,${-v * 0.6})`; g.fillRect(0, y, S, ph);
      const gr = g.createLinearGradient(0, y, 0, y + ph); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(0.15, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(0, y, S, ph);
      if (R() < 0.7) { const jx = Math.floor(R() * S); g.fillStyle = 'rgba(6,4,2,0.9)'; g.fillRect(jx, y, 4, ph); g.fillStyle = 'rgba(255,225,180,0.06)'; g.fillRect(jx + 4, y, 2, ph); }
      g.restore();
      g.fillStyle = 'rgba(5,3,2,0.95)'; g.fillRect(0, y, S, 5); g.fillStyle = 'rgba(255,225,185,0.07)'; g.fillRect(0, y + 5, S, 2);
    }
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? '255,230,200' : '0,0,0'},${0.03 + R() * 0.06})`; g.lineWidth = 0.6 + R(); g.beginPath(); const x = R() * S, y = R() * S, a = (R() - 0.5) * 0.6, l = 20 + R() * 160; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 18; i++) { const x = R() * S, y = R() * S, r = 60 + R() * 260, q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(0,0,0,${0.06 + R() * 0.1})`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const [rc, rg] = canvas(1024, 1024); rg.filter = 'blur(3px)'; rg.drawImage(c, 0, 0, 1024, 1024); rg.filter = 'none';
    const id = rg.getImageData(0, 0, 1024, 1024), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 765; const v = clamp(0.42 - l * 0.6 + (l < 0.04 ? 0.35 : 0), 0.22, 0.85) * 255; d[i] = d[i + 1] = d[i + 2] = v; }
    rg.putImageData(id, 0, 0);
    return { map: ctex(c, true, true), rough: ctex(rc, false, true), M: 1.2 };
  });
}
function leatherTex() {
  return cached('arc_leather', () => {
    const S = 1024, [c, g] = canvas(S, S), R = makeRng(41);
    g.fillStyle = '#1E3324'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '160,190,150'},${0.02 + R() * 0.05})`; g.fillRect(R() * S, R() * S, 1 + R() * 3, 1 + R() * 3); }
    for (let i = 0; i < 30; i++) { const x = R() * S, y = R() * S, r = 40 + R() * 200, q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(0,0,0,${0.08 + R() * 0.12})`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); }
    return { map: ctex(c, true, true), M: 0.8 };
  });
}

// typed labels on a print's bottom border (fern Y2): line 1 typed, line 2 bold, decoding in at label2_t
// fern Y2: line 1 a regular typewriter name, line 2 a BOLD typewriter epithet (Courier Prime 700: Special Elite has one
// thin weight that read grey at 960 px in j2); both double-struck in near-black ink, sized to fill ~3/4 of the border
// and shrunk to fit a long line
function labelLayout(info, it, g) {
  const W = info.W, py = info.photo.y + info.photo.h, room = info.H - py;
  const f1 = it.label_font || 'courier', f2 = it.label2_font || (f1 === 'typewriter' ? 'courier' : f1);   // fern's border labels are one crisp typewriter family: Courier Prime 400 / 700 (j5: Special Elite read mid-grey)
  const fit = (txt, px, font, bold) => { if (!txt || !g) return px; const w = measureType(g, txt, { px, font, bold }); return w > W * 0.8 ? px * W * 0.8 / w : px; };
  const px1 = fit(it.label, W * 0.062, f1, true), px2 = fit(it.label2, W * 0.064, f2, true);   // both Courier Prime 700: line 1 single-struck, line 2 double-struck (review 1: a 400 line 1 read thin mid-grey)
  const two = !!it.label2;
  const y1 = py + room * (two ? 0.36 : 0.56), y2 = y1 + Math.max(px1, px2) * 1.12;
  return { px1, px2, y1, y2, cx: W / 2, f1, f2 };
}
// the documents drawn on canvas (the desk's non-photo items). The papers speak the file's language: a desk whose texts
// are German (umlauts, Akte / GEHEIM / Abschrift ...) or `lang: "de"` keeps the German file defaults; every other desk
// gets neutral English defaults and story-safe filler (no names, places or dates the narration did not give)
const WORDS = ['Betreff', 'Abteilung', 'Prag', 'den', 'Bericht', 'gemäß', 'Anordnung', 'vom', 'Nr.', 'Dienststelle', 'Vorgang', 'betr.', 'Lage', 'Protektorat', 'Abschrift', 'Verteiler', 'z.', 'Hd.', 'Meldung', 'erfolgt', 'nach', 'und', 'die', 'der', 'im', 'Auftrag'];
const WORDS_EN = ['subject', 'reference', 'report', 'received', 'forwarded', 'for', 'action', 'and', 'the', 'the', 'of', 'of', 'to', 'to', 'by', 'copy', 'file', 'office', 'section', 'duty', 'officer', 'instructions', 'attached', 'as', 'per', 'noted', 'herewith', 'enclosed', 'request', 'further', 'advised', 'regarding', 'matter', 'above', 'routine', 'distribution', 'record', 'in', 'on', 'with', 'from', 'this', 'that', 'is', 'was', 'be', 'no.', 'at', 'item', 'para.', 'ref.', 'signed', 'information', 'summary', 'following', 'orders', 'channels', 'transmitted', 'acknowledged'];
const PAPER = {
  de: { folder: 'Akte', folderStamp: 'GEHEIM', telegram: 'TELEGRAMM', telegramText: 'ANKUNFT BESTAETIGT STOP WEITERE ANWEISUNGEN FOLGEN STOP', doc: 'Abschrift', docStamp: 'Geheime Reichssache', words: WORDS },
  en: { folder: 'FILE', folderStamp: 'CONFIDENTIAL', telegram: 'TELEGRAM', telegramText: 'MESSAGE RECEIVED STOP FURTHER INSTRUCTIONS FOLLOW STOP', doc: 'MEMORANDUM', docStamp: 'CONFIDENTIAL', words: WORDS_EN },
};
const DE_RX = /[äöüßÄÖÜ]|\b(und|der|die|das|den|dem|vom|nach|geheim|geheime|akte|abschrift|reichssache|reich|betreff|ankunft|bestaetigt|anweisungen?|telegramm|protektorat|prag|meldung|befehl|kommandeur)\b/i;
// the papers' language of one desk / wall: its own `lang`, else German when its texts are German, else English
function papersLang(item, items) {
  const l = String(item?.lang || '').toLowerCase();
  if (l) return l.startsWith('de') || l === 'german' ? 'de' : 'en';
  const txt = (items || []).filter((it) => it && typeof it === 'object' && !it.src && !it.photo).map((it) => [it.title, it.text, it.stamp, it.label, it.label2].filter((x) => typeof x === 'string').join(' ')).join(' ');
  return DE_RX.test(txt) ? 'de' : 'en';
}
// typed lines that wrap to maxW (px); a too-long single word is shrunk to fit -> [{ln, px}]
function wrapType(g, lines, maxW, px, font, bold) {
  const out = [];
  for (const raw of lines) {
    const words = String(raw).trim().split(/\s+/).filter(Boolean); let cur = '';
    if (!words.length) { out.push({ ln: '', px }); continue; }
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (cur && measureType(g, t, { px, font, bold }) > maxW) { out.push({ ln: cur, px }); cur = wd; } else cur = t; }
    if (cur) { const w = measureType(g, cur, { px, font, bold }); out.push({ ln: cur, px: w > maxW ? px * maxW / w : px }); }
  }
  return out;
}
function docCanvas(type, it, seed, lang = 'en') {
  const R = makeRng(seed);
  const L = PAPER[lang] || PAPER.en;
  if (type === 'insignia') {
    // an embroidered cloth patch in a heater-shield outline (review 1: the round disc read as a coin): navy twill, a gold
    // chain-stitch border, a parachute canopy over spread wings (no party symbol)
    const A = 0.82, H = 840, Wc = Math.round(H * A), [c, g] = canvas(Wc, H);
    g.clearRect(0, 0, Wc, H);
    const path = (gg, k = 1) => { const m = (1 - k) / 2; gg.beginPath(); shieldPath((x, y, cmd) => { const X = Wc * (m + k * x), Y = H * (m + k * y); if (cmd === 'm') gg.moveTo(X, Y); else gg.lineTo(X, Y); }); gg.closePath(); };
    path(g); g.fillStyle = '#1B2236'; g.fill();
    g.save(); path(g); g.clip();
    for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '120,130,170'},${0.05 + R() * 0.08})`; g.fillRect(R() * Wc, R() * H, 2, 1); }
    for (let y = 0; y < H; y += 5) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, y, Wc, 2); }
    g.restore();
    g.strokeStyle = '#C8A750'; g.lineWidth = H * 0.026; g.setLineDash([H * 0.012, H * 0.007]); path(g, 0.9); g.stroke(); g.setLineDash([]);
    const cx = Wc / 2, cy = H * 0.42, r = Wc * 0.4;
    g.strokeStyle = '#D9BC6A'; g.fillStyle = '#D9BC6A'; g.lineWidth = H * 0.011;
    g.beginPath(); g.arc(cx, cy, r * 0.42, Math.PI, 0); g.closePath(); g.fill();                                       // the canopy
    for (const k of [-0.36, -0.13, 0.13, 0.36]) { g.beginPath(); g.moveTo(cx + r * k * 1.15, cy); g.lineTo(cx, cy + r * 0.62); g.stroke(); }
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * r * 0.08, cy + r * 0.6); for (let k = 0; k <= 9; k++) g.lineTo(cx + sx * (r * 0.1 + k * r * 0.085), cy + r * 0.6 - k * r * 0.035 + (k % 2) * r * 0.06); g.lineTo(cx + sx * r * 0.1, cy + r * 0.74); g.closePath(); g.fill(); }
    return { canvas: c, aspect: A, shield: true };
  }
  const W = 1024, A = type === 'telegram' ? 0.62 : type === 'folder' ? 0.78 : 0.707;
  const H = Math.round(W / A), [c, g] = canvas(W, H);
  const tone = type === 'folder' ? '#A88A5C' : type === 'telegram' ? '#E2D7B4' : '#E9E2D0';
  g.fillStyle = tone; g.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '110,90,60' : '255,250,235'},${0.03 + R() * 0.05})`; g.fillRect(R() * W, R() * H, 1 + R() * 3, 1); }
  const ed = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.58); ed.addColorStop(0, 'rgba(120,85,40,0)'); ed.addColorStop(1, 'rgba(120,85,40,0.3)'); g.fillStyle = ed; g.fillRect(0, 0, W, H);
  const ink = '#1C1A18';
  const given = it.text ? String(it.text).split(/\n|\|/).filter((x) => x.trim()) : [];
  if (type === 'folder') {
    // a manila file: a typed label on the cover (big enough to read at the desk's top-down framing), the stamp
    g.fillStyle = 'rgba(80,55,20,0.25)'; g.fillRect(0, H * 0.06, W, 3);
    const t1 = String(it.title || it.label || L.folder);
    const lw = Math.min(W * 0.8, measureType(g, t1, { px: W * 0.075, font: 'courier', bold: true }) + W * 0.08);
    g.fillStyle = '#EFE8D6'; g.fillRect(W * 0.08, H * 0.11, lw, W * 0.12); g.strokeStyle = 'rgba(60,40,20,0.35)'; g.lineWidth = 2; g.strokeRect(W * 0.08, H * 0.11, lw, W * 0.12);
    const tf = wrapType(g, [t1], W * 0.72, W * 0.075, 'courier', true)[0];
    typeLine(g, tf.ln, W * 0.12, H * 0.11 + W * 0.085, { px: tf.px, font: 'courier', bold: true, color: ink, seed, strike: true });
    let y = H * 0.11 + W * 0.2;
    for (const q of wrapType(g, given.slice(0, 4), W * 0.8, W * 0.045, 'courier', true)) { typeLine(g, q.ln, W * 0.1, y, { px: q.px, font: 'courier', bold: true, color: ink, seed: seed + y }); y += W * 0.06; }
    if (it.stamp !== false) {
      const st = String(it.stamp || L.folderStamp), spx = Math.min(W * 0.09, W * 0.46 / Math.max(1, measureType(g, st, { px: 1, font: 'courier', bold: true })));
      g.save(); g.translate(W * 0.6, H * 0.66); g.rotate(-0.18); g.strokeStyle = 'rgba(170,25,20,0.8)'; g.lineWidth = W * 0.012; g.strokeRect(-W * 0.27, -W * 0.07, W * 0.54, W * 0.14);
      g.globalAlpha = 0.85; typeLine(g, st, 0, spx * 0.36, { px: spx, font: 'courier', bold: true, color: '#A8191A', align: 'center', seed: seed + 3, jitter: 0.5 }); g.restore();
    }
    return { canvas: c, aspect: A };
  }
  if (type === 'telegram') {
    const tt = String(it.title || L.telegram);
    g.fillStyle = 'rgba(60,40,20,0.8)'; let tpx = W * 0.075; g.font = `700 ${tpx}px "Courier Prime"`; while (g.measureText(tt).width > W * 0.86 && tpx > W * 0.035) { tpx *= 0.92; g.font = `700 ${tpx}px "Courier Prime"`; }
    g.textAlign = 'center'; g.fillText(tt, W / 2, H * 0.14);
    g.fillStyle = 'rgba(60,40,20,0.35)'; for (const y of [0.2, 0.21]) g.fillRect(W * 0.06, H * y, W * 0.88, 2);
    if (it.stamp) { g.save(); g.translate(W * 0.78, H * 0.27); g.rotate(-0.08); g.globalAlpha = 0.7; typeLine(g, String(it.stamp), 0, 0, { px: W * 0.042, font: 'courier', bold: true, color: '#7A2418', align: 'center', seed: seed + 9 }); g.restore(); }
    const lines = wrapType(g, given.length ? given : [L.telegramText], W * 0.82, W * 0.05, 'courier', true).slice(0, 7);
    let y = H * 0.4;
    for (const q of lines) { const tw = measureType(g, q.ln, { px: q.px, font: 'courier', bold: true }); g.fillStyle = '#F5F1E6'; g.fillRect(W * 0.08 - 8, y - q.px * 0.92, Math.min(W * 0.86, tw + 16), q.px * 1.3); typeLine(g, q.ln, W * 0.08, y, { px: q.px, font: 'courier', bold: true, color: ink, seed: seed + y }); y += W * 0.08; }
    return { canvas: c, aspect: A };
  }
  // doc: a typed sheet — a heading, the director's lines big enough to read, then typed filler in the file's language
  // (a full page, never a blank sheet), a stamp
  const tt = String(it.title || L.doc);
  const th = wrapType(g, [tt], W * 0.84, W * 0.056, 'courier', true);
  let y = H * 0.085;
  for (const q of th.slice(0, 2)) { typeLine(g, q.ln, W * 0.5, y, { px: q.px, font: 'courier', bold: true, color: ink, align: 'center', seed, strike: true }); y += q.px * 1.2; }
  g.fillStyle = 'rgba(28,26,24,0.55)'; g.fillRect(W * 0.1, y - W * 0.022, W * 0.8, 3); y += W * 0.035;
  for (const q of wrapType(g, given.slice(0, 8), W * 0.8, W * 0.04, 'courier', true)) { typeLine(g, q.ln, W * 0.1, y, { px: q.px, font: 'courier', bold: true, color: ink, seed: seed + y, alpha: 0.95 }); y += W * 0.054; }
  if (given.length) y += W * 0.03;
  const yEnd = it.stamp !== false ? H * 0.76 : H * 0.92;
  for (let i = 0; i < 40 && y < yEnd; i++) {
    if (R() < 0.12) { y += W * 0.03; continue; }
    let ln = ''; const n = 5 + Math.floor(R() * 7); for (let k = 0; k < n; k++) ln += L.words[Math.floor(R() * L.words.length)] + ' ';
    if (i === 0 || R() < 0.08) ln = ln.charAt(0).toUpperCase() + ln.slice(1);
    typeLine(g, ln.trim(), W * 0.1, y, { px: W * 0.026, font: 'courier', color: ink, seed: seed + i * 7, alpha: 0.82 });
    y += W * 0.034;
  }
  if (it.stamp !== false) {
    const st = String(it.stamp || L.docStamp), spx = Math.min(W * 0.068, W * 0.6 / Math.max(1, measureType(g, st, { px: 1, font: 'courier', bold: true })));
    g.save(); g.translate(W * 0.66, H * 0.86); g.rotate(-0.12); g.globalAlpha = 0.7;
    const sw = measureType(g, st, { px: spx, font: 'courier', bold: true }); g.strokeStyle = 'rgba(156,26,22,0.75)'; g.lineWidth = W * 0.007; g.strokeRect(-sw / 2 - spx * 0.4, -spx * 1.0, sw + spx * 0.8, spx * 1.35);
    typeLine(g, st, 0, 0, { px: spx, font: 'courier', bold: true, color: '#9C1A16', align: 'center', seed: seed + 5, jitter: 1.5 }); g.restore();
  }
  return { canvas: c, aspect: A };
}
// a heater shield's outline in a unit box (y down): flat top with rounded corners, straight sides, curving to a point
function shieldPath(f) {
  f(0.06, 0.02, 'm'); f(0.94, 0.02); f(0.98, 0.06); f(0.98, 0.52);
  for (let k = 1; k <= 12; k++) { const a = k / 12; f(0.98 - 0.48 * Math.sin(a * Math.PI / 2), 0.52 + 0.46 * (1 - Math.cos(a * Math.PI / 2))); }
  for (let k = 11; k >= 0; k--) { const a = k / 12; f(0.02 + 0.48 * Math.sin(a * Math.PI / 2), 0.52 + 0.46 * (1 - Math.cos(a * Math.PI / 2))); }
  f(0.02, 0.06);
}
// folds / creases across a map sheet
function folds(g, W, H, nx, ny) {
  for (let i = 1; i < nx; i++) { const x = W * i / nx, gr = g.createLinearGradient(x - 14, 0, x + 14, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.48, 'rgba(70,50,25,0.22)'); gr.addColorStop(0.52, 'rgba(255,250,235,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 14, 0, 28, H); }
  for (let i = 1; i < ny; i++) { const y = H * i / ny, gr = g.createLinearGradient(0, y - 14, 0, y + 14); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.48, 'rgba(70,50,25,0.2)'); gr.addColorStop(0.52, 'rgba(255,250,235,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, y - 14, W, 28); }
}

// one desk / wall item -> { group (pivot at its centre, top face at y = thick), w, h, paint(t), anchor, kind }
async function buildItem(it, ctx, idx, o = {}) {
  const type = String(it.kind || (it.src ? 'photo' : 'doc'));
  const seed = (num(it.seed, 0) || idx * 37 + 11);
  let info = null, aspect = 1, base = null, dyn = null, round = false, shield = false, w = num(it.w, 0);
  if (type === 'photo' || type === 'map' || (it.src && type !== 'doc')) {
    const tex = it.src ? await loadImage(it.src, ctx) : null;
    const img = tex ? tex.image : null;
    const isMap = type === 'map';
    const labels = !isMap && (it.label || it.label2);
    info = printCanvas(img, { w: 1024, border: isMap ? 0.012 : num(it.border, 0.065), bottom: labels ? (it.label2 ? 0.2 : 0.13) : (isMap ? 0 : 0.03), age: num(it.age, 0.35), mono: isMap ? num(it.mono, 0.6) : num(it.mono, 1), contrast: num(it.contrast, isMap ? 1.0 : 1.1), grain: isMap ? 0.1 : num(it.grain, 0.35), seed, tone: isMap ? '#E9E0C8' : '#F2EDE2', aspect: img ? undefined : 0.75, crop_y: num(it.crop_y, 0.3) });
    if (isMap) folds(info.canvas.getContext('2d'), info.W, info.H, 3, 2);
    base = info.canvas; aspect = info.W / info.H;
    if (!w) w = isMap ? 0.44 : 0.18;
    if (labels) {
      const g = base.getContext('2d'), L = labelLayout(info, it, g);
      if (it.label) typeLine(g, it.label, L.cx, L.y1, { px: L.px1, font: L.f1, bold: true, strike: false, color: '#100D0A', align: 'center', seed: seed + 1 });
      if (it.label2) {
        const t2 = num(it.label2_t, null);
        if (t2 == null) typeLine(g, it.label2, L.cx, L.y2, { px: L.px2, font: L.f2, bold: true, strike: true, color: '#0E0C0A', align: 'center', seed: seed + 2 });
        else {
          // the epithet decodes in the card's own texture (it inherits the lamp, the depth of field and the grain)
          const [dc, dg] = canvas(base.width, base.height);
          const tex2 = ctex(dc); tex2.anisotropy = 16;
          let last = null; const D = clamp(num(it.decode, 0.5), 0.1, 2);
          dyn = { tex: tex2, paint(t) {
            const key = t < t2 ? 'pre' : t >= t2 + D + 0.05 ? 'done' : String(Math.floor(t * 60));
            if (key === last) return; last = key;
            dg.drawImage(base, 0, 0);
            if (key !== 'pre') typeLine(dg, it.label2, L.cx, L.y2, { px: L.px2, font: L.f2, bold: true, strike: true, color: '#0E0C0A', align: 'center', seed: seed + 2, decode: key === 'done' ? null : { t, t0: t2, dur: D }, blurK: 1.4 });
            tex2.needsUpdate = true;
          } };
          dyn.paint(-1);
        }
      }
    }
  } else {
    const d = docCanvas(type, it, seed, o.lang || 'en');
    base = d.canvas; aspect = d.aspect; round = !!d.round; shield = !!d.shield;
    if (!w) w = type === 'insignia' ? 0.075 : type === 'telegram' ? 0.2 : type === 'folder' ? 0.3 : 0.21;
  }
  const h = w / aspect;
  const thick = type === 'folder' ? 0.003 : 0.0009;
  const top = dyn ? dyn.tex : ctex(base); top.anisotropy = 16;
  const gloss = clamp(num(it.gloss, type === 'photo' ? 0.25 : 0));
  const topM = round ? std({ map: top, roughness: 0.95, transparent: true, alphaTest: 0.5 })
    : gloss > 0 ? phys({ map: top, roughness: 0.62, clearcoat: gloss * 0.6, clearcoatRoughness: 0.35 }) : std({ map: top, roughness: 0.86 });
  const edgeTone = type === 'folder' ? 0xA88850 : type === 'map' ? 0xD9CFB2 : 0xE6E0D2;
  const group = new THREE.Group(); group.name = 'arc_item:' + type;
  let card;
  if (shield) {
    const sh = new THREE.Shape(); shieldPath((x, y, cmd) => { const X = (x - 0.5) * w, Y = (0.5 - y) * h; if (cmd === 'm') sh.moveTo(X, Y); else sh.lineTo(X, Y); });
    const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.0022, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 4 });
    const uvA = eg.attributes.uv, pA = eg.attributes.position;
    for (let i = 0; i < uvA.count; i++) uvA.setXY(i, pA.getX(i) / w + 0.5, pA.getY(i) / h + 0.5);
    eg.rotateX(-Math.PI / 2); eg.computeVertexNormals();
    const capM = std({ map: top, roughness: 0.95 });
    card = new THREE.Mesh(eg, [capM, paperMat(0x161C2C, 0.95)]);
  } else if (round) {
    card = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.0025, 48), [paperMat(0x1B2236, 0.95), topM, paperMat(0x1B2236)]);
    card.geometry.translate(0, 0.00125, 0);
    // a cylinder's cap UVs: map the canvas onto the top cap (group 1)
  } else {
    const geo = paperSheet(w, h, num(it.curl, 0.5) * (type === 'map' ? 0.004 : 0.0022), seed, thick);
    card = new THREE.Mesh(geo, [topM, paperMat(edgeTone, 0.95), paperMat(edgeTone, 0.95)]);
  }
  card.castShadow = true; card.receiveShadow = true; card.name = 'arc_card';
  group.add(card);
  const cs = contactRect(w * 1.07 + 0.012, h * 1.07 + 0.012, o.shadowA ?? 0.42); cs.position.y = -0.0004; group.add(cs);
  // a paper clip on the top edge
  if (it.clip) {
    const clipG = new THREE.Group(), r = 0.0006, L = 0.034, Wc = 0.009;
    const pts = [[0, 0], [0, L], [Wc, L], [Wc, L * 0.12], [Wc * 0.25, L * 0.12], [Wc * 0.25, L * 0.85], [Wc * 0.75, L * 0.85], [Wc * 0.75, L * 0.3]].map(([a, b]) => new THREE.Vector3(a - Wc / 2, 0, -b + L * 0.35));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 80, r, 6), std({ color: 0xB8BCC0, metalness: 1, roughness: 0.28 }));
    tube.castShadow = true; clipG.add(tube); clipG.position.set(-w * 0.28, thick + 0.0012, -h / 2); clipG.rotation.y = 0.12; group.add(clipG);
  }
  const anchor = new THREE.Object3D(); anchor.position.y = thick; group.add(anchor);
  return { group, w, h, thick, paint: dyn ? dyn.paint : null, anchor, type, card, shadow: cs };
}

// the slide-in of one card (fern 0:54-1:01): from beyond the frame edge along a gentle curve, decelerating into place
// (sine ease: peak speed 1.57 x mean, zero at the end), a 6-10 deg turn that settles, carried 1.2 cm up then set down
// with a 1.5 mm bounce. Pure function of t.
// Modes (fitEntrance picks one against the real camera plan): 'slide' (along the desk from a parked start outside the
// frame), 'drop' (glides down from above the frame onto the pile: no desk room outside the view), 'none' (no entrance
// possible without a pop: the card lies there from t = 0, with a warning).
const POSE0 = { y: 0, vis: true, lift: 0, tx: 0, tz: 0 };
function slidePose(c, t) {
  const mode = c.enter == null ? 'none' : c.mode || 'slide';
  if (mode === 'none') return { ...POSE0, x: c.x, z: c.z, rot: c.rot };
  const u = (t - c.enter) / c.dur;
  if (u >= 1) return { ...POSE0, x: c.x, z: c.z, rot: c.rot };
  if (mode === 'drop') {
    // a print let go above the frame: it glides down (smootherstep height), drifts 4-6 cm sideways onto its place, rocks
    // a little (decaying) and settles with a 1.2 mm bounce; the shadow sharpens as it lands
    const k = clamp(u), e = smoother(k), sway = Math.sin(k * Math.PI * 2.2) * (1 - e);
    const y = c.y0 * (1 - e) + (k > 0.9 ? Math.sin((k - 0.9) / 0.1 * Math.PI) * 0.0012 : 0);
    return { x: lerp(c.p0[0], c.x, e) + sway * c.sw[0] * 0.02, z: lerp(c.p0[1], c.z, e) + sway * c.sw[1] * 0.02, y, rot: c.rot + c.rotOff * (1 - e),
      vis: true, lift: smooth(y / 0.1), tx: sway * 0.16 * c.sw[1], tz: -sway * 0.16 * c.sw[0], drop: true };
  }
  // before the plan is fitted (the registry's settle at t = 0, no camera yet) the card hides until it moves; once fitted
  // it is parked (visible) at a start the camera never sees, so it is never switched on inside the frame
  if (u <= 0) return { x: c.p0[0], z: c.p0[1], y: 0.012, rot: c.rot + c.rotOff, vis: !!c.fitted, lift: 1, tx: 0, tz: 0 };
  const e = Math.sin(u * Math.PI / 2), a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, d = e * e;
  const x = a * c.p0[0] + b * c.p1[0] + d * c.x, z = a * c.p0[1] + b * c.p1[1] + d * c.z;
  const drop = 1 - smooth((u - 0.6) / 0.32);
  const bounce = u > 0.92 ? Math.sin((u - 0.92) / 0.08 * Math.PI) * 0.0015 : 0;
  return { x, z, y: 0.012 * drop + bounce, rot: c.rot + c.rotOff * (1 - smoother(u)), vis: true, lift: drop, tx: 0, tz: 0 };
}
const DIRS = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
function slideGeom(c, dir, L) {
  const perp = [-dir[1], dir[0]], bend = c.bend;
  return { p0: [c.x + dir[0] * L + perp[0] * bend, c.z + dir[1] * L + perp[1] * bend], p1: [c.x + dir[0] * L * 0.32 + perp[0] * bend * 0.4, c.z + dir[1] * L * 0.32 + perp[1] * bend * 0.4] };
}
function slidePlan(it, x, z, rot, idx, span) {
  const enter = num(it.enter_t, null);
  if (enter == null) return { enter: null, x, z, rot };
  const from = String(it.enter_from || 'bottom');
  const dir = DIRS[from] || DIRS.bottom;
  const L = num(it.enter_dist, Math.min(span, 0.5)), bend = (hash(idx, 3) - 0.5) * 0.1;   // provisional: just beyond a top-down frame's edge
  const c = { enter, dur0: clamp(num(it.enter_dur, 1.1), 0.5, 2.5), x, z, rot, from, dir, bend, mode: 'slide', fixedDist: num(it.enter_dist, null),
    rotOff: (hash(idx, 5) < 0.5 ? -1 : 1) * (6 + hash(idx, 7) * 4) * DEG };
  c.dur = c.dur0;
  return Object.assign(c, slideGeom(c, dir, L));
}

// ── camera-aware entrances (review 1, the hard defect: from an oblique camera the old fixed 0.5 m start lay inside the
// frame, so the print popped in mid-frame, or beyond the desk's back edge, so it slid in floating over the void) ──
// The camera plan exists only after every item is built; the desk fits its entrances on the first update that sees it
// (window.__f3d.cur.plan.camAt: any move, keys or template), and again if the plan is replaced (replan). camAt is a pure
// function of the scene time, so the fit is deterministic for previews, clips and every sub-frame.
function camFrames(cur, aspect) {
  const D = Math.max(0.1, +cur.dur || 8), out = [];
  for (let tt = 0; tt <= D + 1e-6; tt += 1 / 20) {
    const c = cur.plan.camAt(Math.min(tt, D));
    const p = new THREE.Vector3(...c.pos), f = new THREE.Vector3(...c.look).sub(p).normalize();
    let r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)); if (r.lengthSq() < 1e-8) r.set(1, 0, 0); r.normalize();
    let u = new THREE.Vector3().crossVectors(r, f).normalize();
    if (c.roll) { const cr = Math.cos(c.roll), sr = Math.sin(c.roll), r2 = r.clone().multiplyScalar(cr).addScaledVector(u, sr); u = u.clone().multiplyScalar(cr).addScaledVector(r, -sr); r = r2; }
    const th = Math.tan(((c.fov ?? 40) * DEG) / 2);
    out.push({ tt, w: cur.W ? cur.W(tt) : tt, p, f, r, u, th, tw: th * aspect });
  }
  return out;
}
// the frame nearest to world time w (the frames are monotonic in w)
function frameAtW(F, w) { let best = F[0], bd = Infinity; for (const fr of F) { const d = Math.abs(fr.w - w); if (d < bd) { bd = d; best = fr; } else if (fr.w > w) break; } return best; }
const _fq = new THREE.Vector3();
// is a world point inside the frame (with a margin as a fraction of the half-frame)?
function inFrame(fr, q, m = 0.05) {
  _fq.copy(q).sub(fr.p); const z = _fq.dot(fr.f); if (z < 0.03) return false;
  return Math.abs(_fq.dot(fr.r)) < z * fr.tw * (1 + m) && Math.abs(_fq.dot(fr.u)) < z * fr.th * (1 + m);
}
// is a convex patch (its corner points) entirely outside the frame? (all on the outer side of one frustum plane, or behind)
function outOfFrame(fr, Q, m = 0.05) {
  let behind = true; const s = [true, true, true, true];
  for (const q of Q) {
    _fq.copy(q).sub(fr.p); const z = _fq.dot(fr.f), x = _fq.dot(fr.r), y = _fq.dot(fr.u);
    if (z > 0.03) behind = false;
    const kx = z * fr.tw * (1 + m), ky = z * fr.th * (1 + m);
    if (!(x > kx)) s[0] = false; if (!(x < -kx)) s[1] = false; if (!(y > ky)) s[2] = false; if (!(y < -ky)) s[3] = false;
  }
  return behind || s[0] || s[1] || s[2] || s[3];
}
// the card at a pose: an n x n grid of points over its rect (padded for its shadow), in world space
function cardPoints(c, pose, top, n = 2, pad = 1.12) {
  const cs = Math.cos(pose.rot), sn = Math.sin(pose.rot), hw = c.w * pad / 2, hh = c.h * pad / 2, out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const lx = (n === 1 ? 0 : i / (n - 1) * 2 - 1) * hw, lz = (n === 1 ? 0 : j / (n - 1) * 2 - 1) * hh;
    const v = new THREE.Vector3(pose.x + lx * cs + lz * sn, c.layer + pose.y + 0.001, pose.z - lx * sn + lz * cs);
    v.local = [v.x, v.z]; out.push(top.localToWorld(v));
  }
  return out;
}
function fitEntrance(c, F, top, o) {
  const { W, D, obstacles, warn, idx } = o;
  const onDesk = (lx, lz) => Math.abs(lx) <= W / 2 - 0.004 && Math.abs(lz) <= D / 2 - 0.004;
  const hitsClutter = (pose) => obstacles.some((b) => Math.hypot(pose.x - b.x, pose.z - b.z) < b.r + Math.min(c.w, c.h) * 0.45);
  const parkedFrames = F.filter((fr) => fr.w <= c.enter + 1e-3);
  const parkedOK = (pose) => { const Q = cardPoints(c, pose, top, 2); return parkedFrames.every((fr) => outOfFrame(fr, Q)); };
  // while the card moves: wherever it can be seen it is over the desk (a point off the desk must be out of the frame) and
  // it never slides through the pen, the magnifier or the ashtray
  const pathOK = (cc) => {
    for (let k = 0; k <= 24; k++) {
      const te = cc.enter + (k / 24) * cc.dur, pose = slidePose(cc, te), fr = frameAtW(F, te);
      if (cc.mode === 'slide' && hitsClutter(pose)) return false;
      if (cc.mode !== 'slide') continue;
      const Q = cardPoints(cc, pose, top, 4);
      for (const q of Q) {
        const [lx, lz] = q.local;
        if (!onDesk(lx, lz) && inFrame(fr, q, 0.02)) return false;
      }
    }
    return true;
  };
  const tryDir = (dir) => {
    const Ls = c.fixedDist != null ? [c.fixedDist] : []; if (!Ls.length) for (let L = 0.08; L <= 2.0 + 1e-6; L += 0.03) Ls.push(L);
    for (const L of Ls) {
      const g = slideGeom(c, dir, L), cc = { ...c, ...g, dir, mode: 'slide', fitted: true, dur: clamp(Math.max(c.dur0, L / 0.45), c.dur0, 2.5) };   // a long run gets more time (<= 1.1 m/s mean, a card never whips across)
      if (!parkedOK({ x: g.p0[0], z: g.p0[1], y: 0.012, rot: c.rot + c.rotOff })) continue;
      if (!pathOK(cc)) continue;
      return { cc, L };
    }
    return null;
  };
  const order = [c.dir, ...Object.values(DIRS).filter((d) => d !== c.dir), [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];
  let best = tryDir(order[0]);
  if (!best) for (const d of order.slice(1)) { const r = tryDir(d); if (r && (!best || r.L < best.L)) best = r; }
  if (best) {
    if (best.cc.dir !== c.dir) warn(`archive.desk item ${idx}: no off-frame start ${c.from} of it on the desk for this camera; it slides in from another side`);
    Object.assign(c, best.cc); return 'slide';
  }
  // no room on the desk outside the view: drop it in from above the frame (a print let go, gliding onto the pile)
  const sw = [c.dir[0] || 0.3, c.dir[1] || 0.3];
  for (let y0 = 0.22; y0 <= 0.9 + 1e-6; y0 += 0.04) {
    const p0 = [c.x + c.dir[0] * 0.05, c.z + c.dir[1] * 0.05];
    const pose = { x: p0[0], z: p0[1], y: y0, rot: c.rot + c.rotOff };
    if (!parkedOK(pose)) continue;
    Object.assign(c, { mode: 'drop', y0, p0, sw, fitted: true, dur: clamp(Math.max(c.dur0, 0.9 + y0 * 0.9), 0.8, 2.2) });
    warn(`archive.desk item ${idx}: no desk room outside this camera's view for a slide from ${c.from}; it drops in from above the frame instead`);
    return 'drop';
  }
  Object.assign(c, { mode: 'none', fitted: true });
  warn(`archive.desk item ${idx}: this camera sees the whole desk and the air above it, so enter_t ${c.enter} cannot enter without popping in; the card lies in place from the start (frame the desk tighter, or top-down)`);
  return 'none';
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.desk
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function lampRig(parent, ctx, o) {
  // the warm key: one spot from the upper left, soft (penumbra 1), shadows on; a dim warm fill and a faint cool bounce
  const E = Math.max(0.2, exposureOf(ctx));
  const decay = o.decay ?? 2;
  const spot = new THREE.SpotLight(o.color ?? 0xFFE2C0, 1, 0, o.angle ?? 40 * DEG, o.penumbra ?? 1, decay);
  spot.position.set(...o.pos); spot.target.position.set(...o.aim);
  const d = new THREE.Vector3(...o.pos).distanceTo(new THREE.Vector3(...o.aim));
  // white paper (albedo ~0.85) at the pool's centre lands at ~o.level exposed (a print never clips); a low lamp (near)
  // is normalised between the pool centre and its nearest lit point
  const dRef = o.near ? (d + o.near) / 2 : d;
  spot.intensity = (o.level ?? 1.05) / E * Math.PI * Math.pow(dRef, decay) / 0.85 / 0.9;
  spot.castShadow = o.shadow !== false; const ms = o.mapSize || 2048; spot.shadow.mapSize.set(ms, ms); spot.shadow.camera.near = 0.2; spot.shadow.camera.far = d * 3;
  spot.shadow.bias = -0.0003; spot.shadow.normalBias = o.normalBias ?? 0.0022; spot.shadow.radius = 2.5;   // f1: a dotted shadow-filter pattern on the prints under a grazing lamp
  spot.userData.noGovern = true; spot.name = 'arc_lamp';
  parent.add(spot, spot.target);
  const fill = new THREE.PointLight(o.fill ?? 0x5A4630, (o.fillLevel ?? 0.07) / E * 4, 0, 2); fill.position.set(o.aim[0] + 0.6, o.aim[1] + 1.6, o.aim[2] + 1.2); fill.userData.noGovern = true; fill.name = 'arc_fill';
  parent.add(fill);
  return { spot, fill, E, d };
}
function deskClutter(top, ctx, o) {
  const R = makeRng(o.seed), parts = [], upd = [];
  const { W, D } = o, amt = clamp(o.clutter);
  if (amt <= 0) return { upd, parts, obstacles: [] };
  // placed INSIDE the composition (review 1: at W x 0.3-0.42 the pen, the ashtray and its smoke lay outside every
  // top-down frame): candidates over the items' box, never on a photo's face (its top 60 %), never on a card that slides
  // in later, may overlap a document's edge (then it lies on the paper: y = the stack's top), apart from each other
  const cardsF = o.items || [], placed = [];
  const loc = (c, x, z) => { const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot); return [dx * cs - dz * sn, dx * sn + dz * cs]; };
  let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
  for (const c of cardsF) { const e = Math.abs(Math.cos(c.rot)) * c.w / 2 + Math.abs(Math.sin(c.rot)) * c.h / 2, f = Math.abs(Math.sin(c.rot)) * c.w / 2 + Math.abs(Math.cos(c.rot)) * c.h / 2; bx0 = Math.min(bx0, c.x - e); bx1 = Math.max(bx1, c.x + e); bz0 = Math.min(bz0, c.z - f); bz1 = Math.max(bz1, c.z + f); }
  if (!cardsF.length) { bx0 = -W * 0.22; bx1 = W * 0.22; bz0 = -D * 0.22; bz1 = D * 0.22; }
  bx0 = Math.max(bx0, -W / 2 + 0.12); bx1 = Math.min(bx1, W / 2 - 0.12); bz0 = Math.max(bz0, -D / 2 + 0.1); bz1 = Math.min(bz1, D / 2 - 0.1);
  const stackY = (x, z, r) => { let y = 0; for (const c of cardsF) { const [lx, lz] = loc(c, x, z); if (Math.abs(lx) < c.w / 2 + r * 0.7 && Math.abs(lz) < c.h / 2 + r * 0.7) y = Math.max(y, c.layer + (c.thick || 0.001) + 0.0004); } return y; };
  // the composition's centre = the hero print (the camera frames it): clutter is pulled toward it, so it lands in frame
  const cx0 = o.focus ? o.focus[0] : (bx0 + bx1) / 2, cz0 = o.focus ? o.focus[1] : (bz0 + bz1) / 2;
  const spot = (r, pref, name) => {
    const fixed = o.at && Array.isArray(o.at[name]) ? o.at[name].map(Number) : null;   // clutter_at: {pen, magnifier, ashtray, coffee: [x, z]}
    if (fixed) { placed.push({ x: fixed[0], z: fixed[1], r }); return [fixed[0], fixed[1], stackY(fixed[0], fixed[1], r)]; }
    let best = null, bs = Infinity;
    for (let k = 0; k < 200; k++) {
      const x = lerp(bx0 - 0.04, bx1 + 0.04, R()), z = lerp(bz0 - 0.04, bz1 + 0.04, R());
      let sc = R() * 0.2 + (pref ? pref(x, z) : 0) + 0.4 * Math.hypot(x - cx0, z - cz0) / 0.5 + (Math.abs(x - cx0) > 0.36 || Math.abs(z - cz0) > 0.19 ? 1.5 : 0);   // inside the hero's top-down frame (f2: on free wood at the edge, out of frame)
      if (Math.abs(x) > W / 2 - r - 0.02 || Math.abs(z) > D / 2 - r - 0.02) continue;
      for (const c of cardsF) {
        const [lx, lz] = loc(c, x, z);
        if (!(Math.abs(lx) < c.w / 2 + r && Math.abs(lz) < c.h / 2 + r)) continue;
        if (c.enter != null) sc += 100;                                           // the slide-in lands here later
        else if (c.type === 'photo' && lz < -c.h / 2 + c.h * 0.62 + r && Math.abs(lx) < c.w / 2 + r * 0.6) sc += 100;   // a face
        else if (c.type === 'photo') sc += 3;                                      // its border and typed label
        else sc += 0.2;                                                            // a document's edge: fine
      }
      for (const q of placed) if (Math.hypot(x - q.x, z - q.z) < r + q.r + 0.03) sc += 100;
      if (sc < bs) { bs = sc; best = [x, z]; }
    }
    if (!best) best = [lerp(bx0, bx1, 0.9), lerp(bz0, bz1, 0.9)];
    placed.push({ x: best[0], z: best[1], r });
    return [best[0], best[1], stackY(best[0], best[1], r)];
  };
  // a fountain pen
  if (amt > 0.15) {
    const pen = new THREE.Group(), lac = phys({ color: 0x0D0C0C, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }), gold = std({ color: 0xC9A04A, metalness: 1, roughness: 0.3 });
    const add = (g, m, x) => { const s = new THREE.Mesh(g, m); s.rotation.z = Math.PI / 2; s.position.x = x; s.castShadow = s.receiveShadow = true; pen.add(s); return s; };
    add(new THREE.CylinderGeometry(0.0062, 0.0058, 0.075, 24), lac, -0.01); add(new THREE.CylinderGeometry(0.0066, 0.0064, 0.06, 24), lac, 0.056);
    add(new THREE.CylinderGeometry(0.0067, 0.0067, 0.004, 24), gold, 0.028); add(new THREE.ConeGeometry(0.0058, 0.016, 24), gold, -0.056).rotation.z = Math.PI / 2;
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.0015, 0.0022), gold); clip.position.set(0.058, 0.0072, 0); pen.add(clip);
    const p = spot(0.075, null, 'pen');
    pen.position.set(p[0], 0.0063 + p[2], p[1]); pen.rotation.y = (R() - 0.5) * 1.4; top.add(pen); parts.push(pen);
  }
  // a magnifying glass
  if (amt > 0.3) {
    const mg = new THREE.Group(), brass = std({ color: 0xB38B45, metalness: 1, roughness: 0.32 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0035, 12, 64), brass); ring.rotation.x = Math.PI / 2; ring.position.y = 0.004; ring.castShadow = true; mg.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.003, 48), phys({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.18, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2 }));
    lens.position.y = 0.004; mg.add(lens);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0065, 0.1, 16), phys({ color: 0x2A1508, roughness: 0.35, clearcoat: 0.8 })); hd.rotation.z = Math.PI / 2; hd.position.set(0.095, 0.0075, 0); hd.castShadow = true; mg.add(hd);
    const p = spot(0.1, null, 'magnifier');
    mg.position.set(p[0], p[2], p[1]); mg.rotation.y = R() * TAU; top.add(mg); parts.push(mg);
  }
  // an ashtray with a smouldering cigarette and a thin wisp of smoke (a moving layer)
  if (amt > 0.5) {
    const at = new THREE.Group();
    const glassM = phys({ color: 0x6B4A22, roughness: 0.08, transparent: true, opacity: 0.85, clearcoat: 1 });
    const dish = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.066, 0.006], [0.07, 0.018], [0.062, 0.02], [0.054, 0.008], [0, 0.008]].map(([r, y]) => new THREE.Vector2(r, y)), 48), glassM);
    dish.castShadow = dish.receiveShadow = true; at.add(dish);
    const cig = new THREE.Group();
    const paperC = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.055, 16), std({ color: 0xEFEBE2, roughness: 0.8 })); paperC.rotation.z = Math.PI / 2; cig.add(paperC);
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.0041, 0.0042, 0.012, 16), std({ color: 0x7C7A76, roughness: 1 })); ash.rotation.z = Math.PI / 2; ash.position.x = -0.0335; cig.add(ash);
    const emberM = std({ color: 0x222222, emissive: 0xFF5A1A, emissiveIntensity: 2.2, roughness: 1 });
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.0043, 12, 8), emberM); ember.scale.set(0.5, 1, 1); ember.position.x = -0.04; cig.add(ember);
    cig.position.set(0.035, 0.022, 0); cig.rotation.z = -0.12; cig.rotation.y = 0.3; cig.traverse((m) => { if (m.isMesh) m.castShadow = true; }); at.add(cig);
    // smoke: soft sprites rising and curling from the ember (each a pure function of t)
    const smokeT = cached('arc_smoke', () => { const [c, g] = canvas(128, 128); const q = g.createRadialGradient(64, 64, 0, 64, 64, 64); q.addColorStop(0, 'rgba(255,255,255,0.5)'); q.addColorStop(0.5, 'rgba(255,255,255,0.18)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, 128, 128); return ctex(c, false); });
    const N = 26, sm = [];
    for (let i = 0; i < N; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, color: 0xC8C4BC, transparent: true, depthWrite: false, opacity: 0 })); sp.userData.noQA = true; sp.renderOrder = 6; at.add(sp); sm.push(sp); }
    const emb = new THREE.Vector3();
    upd.push((t) => {
      emberM.emissiveIntensity = 1.8 + 0.6 * vnoise(t * 1.7, 4) + 0.3 * vnoise(t * 5.3, 9);
      at.updateMatrixWorld(true); ember.getWorldPosition(emb); at.worldToLocal(emb);
      for (let i = 0; i < N; i++) {
        const life = 4.2, a0 = (t / life + i / N) % 1, age = a0 * life, h0 = age * 0.05 + age * age * 0.004;
        const sw = vnoise(t * 0.4 + i * 0.37, 11) * 0.02 * age, sz = vnoise(t * 0.33 + i * 0.29, 13) * 0.02 * age;
        sm[i].position.set(emb.x + sw + Math.sin(age * 2.1 + i) * 0.004 * age, emb.y + h0, emb.z + sz);
        const s = 0.008 + age * 0.022; sm[i].scale.set(s, s * 1.4, 1);
        sm[i].material.opacity = 0.16 * smooth(age / 0.4) * (1 - smooth((a0 - 0.55) / 0.45));
        sm[i].material.rotation = age * 0.6 + i;
      }
    });
    const p = spot(0.075, null, 'ashtray');
    at.position.set(p[0], p[2], p[1]); top.add(at); parts.push(at);
  }
  // a coffee ring stain (a decal on the wood)
  if (amt > 0.2) {
    const tex = cached('arc_coffee', () => { const [c, g] = canvas(256, 256); const R2 = makeRng(5); g.clearRect(0, 0, 256, 256);
      for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(40,20,8,${0.35 - k * 0.08})`; g.lineWidth = 6 - k * 1.5; g.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.05) { const r = 96 + k * 3 + (R2() - 0.5) * 3; const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
      const q = g.createRadialGradient(128, 128, 60, 128, 128, 100); q.addColorStop(0, 'rgba(40,20,8,0)'); q.addColorStop(1, 'rgba(40,20,8,0.12)'); g.fillStyle = q; g.fillRect(0, 0, 256, 256); return ctex(c); });
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const p = spot(0.045, null, 'coffee');
    st.position.set(p[0], 0.0003 + p[2], p[1]); st.receiveShadow = true; st.userData.noQA = true; top.add(st);
  }
  return { upd, parts, obstacles: placed.filter((q) => q.r > 0.05) };
}
async function buildDesk(kind, item, ctx) {
  const size = Array.isArray(item.size) ? item.size.map(Number) : [2.0, 1.2];
  const W = clamp(size[0] || 2, 0.6, 4), D = clamp(size[1] || 1.2, 0.4, 3), elev = num(item.elev, 0.76);
  const root = rootAt(kind, item, ctx, 0);
  voidDome(root, item, ctx);
  const top = new THREE.Group(); top.position.y = elev; top.name = 'desk_top'; root.add(top);
  // the desk: a planked top (or green leather in a wooden rim), an apron, legs
  const wood = String(item.wood || 'walnut');
  const pw = plankWood(wood === 'oak' ? 'oak' : 'walnut');
  const mapT = pw.map.clone(); mapT.needsUpdate = true; mapT.repeat.set(W / pw.M, D / pw.M); keep(mapT);
  const roughT = pw.rough.clone(); roughT.needsUpdate = true; roughT.repeat.set(W / pw.M, D / pw.M); keep(roughT);
  const woodM = phys({ map: mapT, roughnessMap: roughT, roughness: 1, clearcoat: 0.07, clearcoatRoughness: 0.62, color: wood === 'oak' ? 0xFFFFFF : 0xE8DDD2 });   // a faint, rough sheen (j2 / review 1: a featureless specular pool of the lamp on the varnish)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.045, D), woodM); slab.position.y = -0.0225; slab.receiveShadow = true; slab.castShadow = true; slab.name = 'desk_surface'; top.add(slab);
  if (wood === 'green_leather') {
    const lt = leatherTex(), lm = lt.map.clone(); lm.needsUpdate = true; lm.repeat.set(W * 0.86 / lt.M, D * 0.8 / lt.M); keep(lm);
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.0015, D * 0.8), phys({ map: lm, roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.5 }));
    inlay.position.y = 0.00075 - 0.0015; inlay.receiveShadow = true; top.add(inlay);
  }
  const darkW = std({ color: 0x1A110A, roughness: 0.7 });
  for (const [sx, sz, w, d] of [[0, -1, W - 0.1, 0.03], [0, 1, W - 0.1, 0.03], [-1, 0, 0.03, D - 0.1], [1, 0, 0.03, D - 0.1]]) { const a = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), darkW); a.position.set(sx * (W / 2 - 0.06), -0.095, sz * (D / 2 - 0.06)); a.castShadow = true; top.add(a); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, elev - 0.05, 0.06), darkW); l.position.set(sx * (W / 2 - 0.07), -(elev - 0.05) / 2 - 0.045, sz * (D / 2 - 0.07)); l.castShadow = true; top.add(l); }
  // items (later = on top), each on its own layer a hair above the one before
  const list = Array.isArray(item.items) ? item.items.slice(0, 24) : [];
  const cards = [], anchors = { top: new THREE.Object3D() };
  top.add(anchors.top);
  const span = Math.max(W, D) * 0.75;
  const built = [], lang = papersLang(item, list);
  for (let i = 0; i < list.length; i++) {
    const it = list[i] || {};
    let c;
    try { c = await buildItem(it, ctx, i, { lang: papersLang({ lang: it.lang || lang }, []) }); } catch (e) { (ctx.warnings || []).push(`archive.desk item ${i}: ${String(e).slice(0, 120)}`); continue; }
    const hasAt = Array.isArray(it.at);
    built.push({ it, c, i, hasAt, x: hasAt ? num(it.at[0], 0) : 0, z: hasAt ? num(it.at[1], 0) : 0, rot: num(it.rot, (hash(i, 9) - 0.5) * (hasAt ? 24 : 18)) * DEG, w: c.w, h: c.h, type: c.type });
  }
  autoLayout(built, W, D);
  for (const b of built) {
    const { it, c, i } = b;
    const plan = slidePlan(it, b.x, b.z, b.rot, i, span);
    const holder = new THREE.Group(); holder.add(c.group); top.add(holder);
    const layer = 0.0006 + i * 0.0021;
    const C = { ...c, ...plan, holder, layer, w: c.w, h: c.h, idx: i };
    cards.push(C);
    anchors['item_' + i] = c.anchor;
  }
  // the hero: the labelled print with an epithet, else a labelled print, else the widest print (was: the first photo)
  const photos = cards.filter((c) => c.type === 'photo');
  const hero = photos.find((c) => list[c.idx]?.label2) || photos.find((c) => list[c.idx]?.label) || photos.slice().sort((a, b) => b.w - a.w)[0] || cards[0];
  if (hero) anchors.hero = hero.anchor;
  // the lamp: light only (true), a visible green banker's lamp (banker), or none (false: the scene's own lights)
  const lampOpt = item.lamp ?? true;
  let rig = null, lampBody = null;
  if (lampOpt !== false && lampOpt !== 'none') {
    const la = Array.isArray(item.lamp_at) ? item.lamp_at.map(Number) : [-W * 0.36, 1.15, -D * 0.32];   // higher: the near corner no longer burns (j4 folder)
    const aim = Array.isArray(item.lamp_aim) ? item.lamp_aim.map(Number) : hero ? [hero.x * 0.6, 0, hero.z * 0.6] : [0, 0, 0];
    const banker = lampOpt === 'banker';
    // the banker's bulb sits 0.3 m over the desk: its level is normalised with decay 1 between the pool centre and the
    // nearest lit wood (review 1: normalised at the 1.15 m height, then moved down, it burnt a featureless glare)
    const lp = banker ? [la[0], 0.3, la[2]] : la;
    rig = lampRig(top, ctx, { pos: lp, aim, color: item.lamp_color ? new THREE.Color(item.lamp_color) : 0xFFDDB4, angle: num(item.lamp_angle, banker ? 50 : 42) * DEG, level: num(item.lamp_level, banker ? 1.3 : 1.05), decay: banker ? 1 : 2, near: banker ? 0.3 : null, normalBias: banker ? 0.0035 : 0.0022 });
    if (banker) {
      lampBody = new THREE.Group();
      const brass = std({ color: 0xB08A40, metalness: 1, roughness: 0.3 });
      const baseM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.025, 32), brass); baseM.position.y = 0.0125; lampBody.add(baseM);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 12), brass); stem.position.y = 0.17; lampBody.add(stem);
      const shadeG = new THREE.CylinderGeometry(0.05, 0.13, 0.11, 32, 1, true, 0, Math.PI); shadeG.rotateZ(Math.PI / 2);
      const shade = new THREE.Mesh(shadeG, std({ color: 0x0F4A2A, roughness: 0.15, emissive: 0x1E8A50, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
      shade.rotation.y = Math.PI / 2; shade.position.y = 0.34; lampBody.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 2.2) })); bulb.position.y = 0.315; lampBody.add(bulb);
      lampBody.traverse((m) => { if (m.isMesh && m !== bulb) { m.castShadow = true; m.receiveShadow = true; } });
      lampBody.position.set(la[0] - 0.02, 0, la[2]); lampBody.rotation.y = Math.atan2(aim[0] - la[0], aim[2] - la[2]);
      top.add(lampBody);
    }
  }
  // clutter in the composition
  const cl = deskClutter(top, ctx, { W, D, clutter: num(item.clutter, 0.7), seed: num(item.seed, 3) * 7 + 1, items: cards, at: item.clutter_at, focus: hero ? [hero.x, hero.z] : null });
  // dust: ~100-150 soft motes INSIDE the lamp's cone, seen only against the lit desk (review 1: the old W x 0.55 x D box
  // read as a starfield over the black void from any oblique angle)
  let dust = null;
  const dustAmt = clamp(num(item.dust, 0.5));
  if (rig && dustAmt > 0) {
    dust = coneMotes(Math.round(90 + 70 * dustAmt), 31, 0xFFE6C8);
    top.add(dust.pts);
    dust.U.uI.value = 3.2 * dustAmt / rig.E; dust.U.uSize.value = 0.0036;
    dust.U.uHalf.value.set(W / 2, D / 2);
  }
  let fittedTo = null;
  const fitAll = () => {
    const F0 = typeof window !== 'undefined' ? window.__f3d : null, cur = F0 && F0.cur;
    if (!cur || cur.ctx !== ctx || !cur.plan || typeof cur.plan.camAt !== 'function' || fittedTo === cur.plan) return;
    fittedTo = cur.plan;
    const entering = cards.filter((c) => c.enter != null);
    if (!entering.length) return;
    try {
      root.updateMatrixWorld(true);
      const F = camFrames(cur, (F0.camera && F0.camera.aspect) || 16 / 9);
      for (const c of entering) fitEntrance(c, F, top, { W, D, obstacles: cl.obstacles || [], idx: c.idx, warn: (m) => { (ctx.warnings || []).push(m); console.warn('[f3d archive]', m); } });
      root.userData.entrances = entering.map((c) => ({ item: c.idx, mode: c.mode, dir: c.dir, p0: c.p0 && c.p0.map((v) => +v.toFixed(3)), y0: c.y0, dur: +c.dur.toFixed(2) }));
    } catch (e) { console.error(e); for (const c of entering) c.fitted = true; }
  };
  const _lp = new THREE.Vector3(), _lt = new THREE.Vector3(), _cf = new THREE.Vector3(), _cp = new THREE.Vector3();
  const update = (t = 0, clock, camera) => {
    fitAll();
    for (const c of cards) {
      const p = slidePose(c, t);
      c.holder.position.set(p.x, c.layer + p.y, p.z);
      c.holder.rotation.set(p.tx || 0, p.rot, p.tz || 0);
      c.holder.visible = p.vis;
      const sk = p.drop ? 1 - 0.95 * p.lift : 1 - 0.45 * p.lift;
      c.shadow.material.opacity = 0.42 * sk; c.shadow.scale.setScalar(1 + p.lift * (p.drop ? 0.3 : 0.08)); c.shadow.position.set(p.lift * 0.006, -0.0004 - p.y, p.lift * 0.01);
      c.shadow.rotation.set(-(p.tx || 0), 0, -(p.tz || 0));
      if (c.paint) c.paint(t);
    }
    for (const f of cl.upd) f(t);
    if (dust && rig) {
      dust.U.uT.value = t;
      rig.spot.getWorldPosition(_lp); rig.spot.target.getWorldPosition(_lt);
      dust.U.uLPos.value.copy(_lp); dust.U.uLDir.value.copy(_lt).sub(_lp).normalize();
      dust.U.uCone.value.set(Math.cos(rig.spot.angle), Math.cos(rig.spot.angle * 0.45));
      const dl = _lp.distanceTo(_lt); dust.U.uS.value.set(dl * 0.35, dl * 0.97);
      top.updateMatrixWorld(true); dust.U.uDeskInv.value.copy(top.matrixWorld).invert();
      dust.U.uResY.value = ctx.renderer ? ctx.renderer.domElement.height : 1080;
      if (camera && camera.isPerspectiveCamera) {     // focus ~ where the view ray meets the desk (the motes' defocus discs)
        camera.getWorldPosition(_cp); camera.getWorldDirection(_cf); const ty = top.getWorldPosition(_lt).y;
        dust.U.uFocus.value = _cf.y < -0.05 ? clamp((ty - _cp.y) / _cf.y, 0.2, 6) : 1.0;
      }
    }
  };
  update(0);
  root.updateMatrixWorld(true);
  return { root, radius: Math.hypot(W, D) / 2, height: elev + 0.05, update, anchors, footprint: [W, D], snapped: true, contact: false, pitchDark: !!rig && item.dark !== false };
}

// items without `at` (review 1: hash-placed, Kubiš's face lay under the hero): greedy placement on a grid that never lays
// a card over an earlier photo's face (its top 60 %), never puts a photo's own face under a later placed card, and keeps
// the pile compact round the placed items
function autoLayout(B, W, D) {
  if (!B.some((b) => !b.hasAt)) return;
  const inRect = (b, x, z, px, pz, x0 = -0.5, x1 = 0.5, z0 = -0.5, z1 = 0.5) => {
    const dx = px - x, dz = pz - z, cs = Math.cos(b.rot), sn = Math.sin(b.rot), lx = (dx * cs - dz * sn) / b.w, lz = (dx * sn + dz * cs) / b.h;
    return lx > x0 && lx < x1 && lz > z0 && lz < z1;
  };
  const pts = (b, x, z, zf0 = -0.5, zf1 = 0.5) => { const o = []; const cs = Math.cos(b.rot), sn = Math.sin(b.rot);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const lx = (i / 4 - 0.5) * b.w * 0.96, lz = lerp(zf0, zf1, j / 4) * b.h * 0.96; o.push([x + lx * cs + lz * sn, z - lx * sn + lz * cs]); } return o; };
  const FACE = [-0.5, 0.12];                                   // the photo's top 62 % (canvas top = -z)
  const placed = B.filter((b) => b.hasAt);
  for (const b of B) {
    if (b.hasAt) continue;
    const cx = placed.length ? placed.reduce((a, q) => a + q.x, 0) / placed.length : 0, cz = placed.length ? placed.reduce((a, q) => a + q.z, 0) / placed.length : 0;
    let best = null, bs = Infinity;
    for (let gi = 0; gi <= 16; gi++) for (let gj = 0; gj <= 10; gj++) {
      const x = (gi / 16 - 0.5) * (W * 0.7 - b.w), z = (gj / 10 - 0.5) * (D * 0.7 - b.h);
      let cost = 0.7 * Math.hypot(x - cx, z - cz) / (0.5 * W);
      const mine = pts(b, x, z);
      for (const q of placed) {
        const earlier = q.i < b.i;
        if (earlier && q.type === 'photo') cost += 10 * mine.filter(([px, pz]) => inRect(q, q.x, q.z, px, pz, -0.5, 0.5, FACE[0], FACE[1])).length / 25;   // b lies over q's face
        if (!earlier && b.type === 'photo') cost += 10 * pts(b, x, z, FACE[0], FACE[1]).filter(([px, pz]) => inRect(q, q.x, q.z, px, pz)).length / 25;   // q (on top) covers b's face
        cost += 0.6 * mine.filter(([px, pz]) => inRect(q, q.x, q.z, px, pz)).length / 25;
      }
      if (cost < bs) { bs = cost; best = [x, z]; }
    }
    b.x = best[0]; b.z = best[1]; placed.push(b);
  }
}

// archive.photo: one print
async function buildPhoto(kind, item, ctx) {
  const elev = num(item.elev, 0);
  const root = rootAt(kind, item, ctx, elev);
  const c = await buildItem({ ...item, kind: 'photo', w: num(item.w, 0.18) }, ctx, num(item.index, 0));
  const tilt = num(item.tilt, 0) * DEG;
  const pivot = new THREE.Group(); pivot.position.set(0, 0.0006, tilt ? c.h / 2 : 0); pivot.rotation.x = tilt; root.add(pivot);
  c.group.position.z = tilt ? -c.h / 2 : 0; pivot.add(c.group);
  if (tilt) c.shadow.visible = false;
  const update = (t = 0) => { if (c.paint) c.paint(t); };
  update(0);
  return { root, radius: Math.max(c.w, c.h), height: c.h * Math.sin(tilt) + 0.01, update, anchors: { center: c.anchor }, snapped: true, contact: false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.wall — pinned prints and red string
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function corkTex() {
  return cached('arc_cork', () => {
    const S = 1024, [c, g] = canvas(S, S), R = makeRng(61);
    g.fillStyle = '#8A5E36'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 70000; i++) { const v = R(); g.fillStyle = v < 0.45 ? `rgba(60,36,18,${0.2 + R() * 0.4})` : v < 0.9 ? `rgba(170,125,80,${0.15 + R() * 0.35})` : `rgba(30,18,8,${0.4 + R() * 0.4})`; const s = 1 + R() * 4; g.fillRect(R() * S, R() * S, s, s * (0.5 + R())); }
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(25,14,6,0.6)'; g.beginPath(); g.arc(R() * S, R() * S, 1 + R() * 1.6, 0, TAU); g.fill(); }   // old pin holes
    return { map: ctex(c, true, true), M: 0.6 };
  });
}
function plasterTex() {
  return cached('arc_plaster', () => {
    const S = 1024, [c, g] = canvas(S, S), R = makeRng(71);
    g.fillStyle = '#B9AE96'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) { const x = R() * S, y = R() * S, r = 80 + R() * 300, q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${R() < 0.5 ? '90,80,60' : '220,212,190'},${0.08 + R() * 0.12})`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 30000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '70,60,45' : '235,228,210'},${0.03 + R() * 0.05})`; g.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2); }
    return { map: ctex(c, true, true), M: 1.4 };
  });
}
function woolTex() {
  return cached('arc_wool', () => { const [c, g] = canvas(128, 32); g.fillStyle = '#A3150F'; g.fillRect(0, 0, 128, 32); const R = makeRng(3);
    for (let i = -6; i < 20; i++) { g.strokeStyle = 'rgba(40,0,0,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 8, 0); g.lineTo(i * 8 + 16, 32); g.stroke(); }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,${80 + R() * 60},${60 + R() * 40},${R() * 0.3})`; g.fillRect(R() * 128, R() * 32, 2, 1); }
    return ctex(c, true, true); });
}
async function buildWall(kind, item, ctx) {
  const size = Array.isArray(item.size) ? item.size.map(Number) : [2.4, 1.4];
  const W = clamp(size[0] || 2.4, 0.6, 8), H = clamp(size[1] || 1.4, 0.4, 5), elev = num(item.elev, 0.6);
  const root = rootAt(kind, item, ctx, 0);
  voidDome(root, item, ctx);
  const board = new THREE.Group(); board.position.set(0, elev + H / 2, 0); root.add(board);
  const type = String(item.board || 'cork');
  let bm;
  if (type === 'map' && item.map_src) {
    const t = await loadImage(item.map_src, ctx);
    const info = printCanvas(t ? t.image : null, { w: 2048, border: 0, mono: 0.35, contrast: 1, age: 0.6, grain: 0.1, aspect: W / H, tone: '#E2D7BC', seed: 4 });
    folds(info.canvas.getContext('2d'), info.W, info.H, 4, 3);
    bm = std({ map: ctex(info.canvas), roughness: 0.9 });
  } else {
    const T = type === 'plaster' ? plasterTex() : corkTex(), m = T.map.clone(); m.needsUpdate = true; m.repeat.set(W / T.M, H / T.M); keep(m);
    bm = std({ map: m, roughness: 0.95, color: type === 'plaster' ? 0xFFFFFF : 0xDDDDDD });
  }
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.02), [paperMat(0x3A2614), paperMat(0x3A2614), paperMat(0x3A2614), paperMat(0x3A2614), bm, paperMat(0x3A2614)]);
  slab.position.z = -0.01; slab.receiveShadow = true; slab.castShadow = true; board.add(slab);
  if (type !== 'plaster') {   // a wooden frame round a cork / map board
    const fm = std({ color: 0x3A2414, roughness: 0.6 });
    for (const [x, y, w, h] of [[0, H / 2 + 0.02, W + 0.08, 0.04], [0, -H / 2 - 0.02, W + 0.08, 0.04], [-W / 2 - 0.02, 0, 0.04, H], [W / 2 + 0.02, 0, 0.04, H]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.035), fm); f.position.set(x, y, 0); f.castShadow = f.receiveShadow = true; board.add(f); }
  }
  // the room's wall behind (dark, so a lamp shows its falloff)
  if (item.backwall !== false) { const bw = new THREE.Mesh(new THREE.PlaneGeometry(W + 6, 4.5), std({ color: 0x3A332B, roughness: 0.95 })); bw.position.set(0, 2.25 - elev - H / 2, -0.04); bw.receiveShadow = true; board.add(bw); }   // lighter: the lamp's spill shows a wall round the board (review 1: a board floating in black)
  const list = Array.isArray(item.items) ? item.items.slice(0, 24) : [];
  const anchors = { center: new THREE.Object3D() }; board.add(anchors.center);
  const cards = [], pins = [], wlang = papersLang(item, list);
  const pinM = [std({ color: 0xB0201A, roughness: 0.35 }), std({ color: 0xD8D2C0, roughness: 0.4 }), std({ color: 0x2A4A8A, roughness: 0.35 })];
  for (let i = 0; i < list.length; i++) {
    const it = list[i] || {};
    let c;
    try { c = await buildItem({ curl: 1.8, ...it }, ctx, i + 50, { shadowA: 0.5, lang: papersLang({ lang: it.lang || wlang }, []) }); } catch (e) { (ctx.warnings || []).push(`archive.wall item ${i}: ${String(e).slice(0, 120)}`); continue; }   // pinned prints curl off the board (review 1: flat prints)
    const at = Array.isArray(it.at) ? [num(it.at[0], 0), num(it.at[1], 0)] : [(hash(i, 1) - 0.5) * W * 0.7, (hash(i, 2) - 0.5) * H * 0.6];
    const holder = new THREE.Group(); holder.rotation.x = Math.PI / 2;            // the card's top face (+y) turns to +z (the room)
    const tiltG = new THREE.Group(); tiltG.position.set(at[0], at[1], 0.002 + i * 0.0018); tiltG.rotation.z = num(it.rot, (hash(i, 9) - 0.5) * 14) * DEG;
    tiltG.add(holder); holder.add(c.group); board.add(tiltG);
    c.shadow.material.opacity = 0.55; c.shadow.position.set(0.004, -0.0015, 0.006);
    // the pin: at the top centre of the card
    const pin = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 16, 12), pinM[it.pin === 'white' ? 1 : it.pin === 'blue' ? 2 : 0]); head.position.z = 0.012; head.castShadow = true; pin.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0035, 0.01, 12), head.material); neck.rotation.x = Math.PI / 2; neck.position.z = 0.0055; pin.add(neck);
    pin.position.set(0, c.h / 2 - Math.min(0.02, c.h * 0.08), 0.0015); tiltG.add(pin);
    pins.push(pin); cards.push(c);
    anchors['item_' + i] = c.anchor;
  }
  // red string pin to pin: a catenary tube drawn on over 0.5 s from strings_t, each string 0.45 s after the last
  const strings = Array.isArray(item.strings) ? item.strings : [];
  const woolM = std({ map: woolTex(), roughness: 0.9, color: 0xFFFFFF });
  const st0 = num(item.strings_t, null), drawn = [];
  board.updateMatrixWorld(true);
  const tmp = new THREE.Vector3();
  strings.forEach((pr, k) => {
    if (!Array.isArray(pr) || pins[pr[0]] == null || pins[pr[1]] == null) return;
    const a = board.worldToLocal(pins[pr[0]].localToWorld(tmp.set(0, 0, 0.011)).clone()), b = board.worldToLocal(pins[pr[1]].localToWorld(tmp.set(0, 0, 0.011)).clone());
    const L = a.distanceTo(b), sag = Math.min(0.05, L * 0.03), pts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, p = a.clone().lerp(b, u); p.y -= sag * 4 * u * (1 - u); p.z += 0.003 + 0.004 * Math.sin(u * Math.PI); pts.push(p); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.0016, 6), woolM);
    tube.castShadow = true; tube.receiveShadow = true; board.add(tube);
    drawn.push({ tube, n: tube.geometry.index.count, t0: st0 == null ? null : st0 + k * 0.45 });
  });
  // a warm lamp grazing the board from above-left (one motivated source)
  const rig = item.lamp === false ? null : lampRig(root, ctx, { pos: Array.isArray(item.lamp_at) ? item.lamp_at.map(Number) : [-W * 0.3, elev + H + 0.9, 1.5], aim: Array.isArray(item.lamp_aim) ? item.lamp_aim.map(Number) : [-W * 0.05, elev + H * 0.55, 0], angle: num(item.lamp_angle, 27) * DEG, level: num(item.lamp_level, 1.0), fillLevel: 0.03 });   // a pool, not a wash (j2 lit the board evenly)
  // dust drifting in the lamp's cone in front of the board (a second moving layer while the strings draw)
  const wDust = clamp(num(item.dust, 0.4)), wd = rig && wDust > 0 ? motes(Math.round(200 + 600 * wDust), [W * 1.1, H * 1.3, 1.4], 37, 0xFFE6C8, 'spot') : null;
  if (wd) { wd.pts.position.set(0, elev + H / 2, 0.75); root.add(wd.pts); wd.U.uI.value = 2.2 * wDust / rig.E; wd.U.uSize.value = 0.006; }
  const update = (t = 0) => {
    if (wd) aimMotes(wd, rig.spot, t, ctx);
    for (const c of cards) if (c.paint) c.paint(t);
    for (const d of drawn) {
      if (d.t0 == null) { d.tube.geometry.setDrawRange(0, d.n); continue; }
      const u = smoother((t - d.t0) / 0.5);
      const segs = Math.round(96 * u) * 6 * 6;                 // whole segments (6 radial quads x 6 indices)
      d.tube.geometry.setDrawRange(0, Math.min(d.n, segs)); d.tube.visible = u > 0.001;
    }
  };
  update(0);
  return { root, radius: W / 2 + 0.2, height: elev + H + 0.1, update, anchors, footprint: [W + 0.1, 0.1], snapped: true, contact: false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.frame
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function buildFrame(kind, item, ctx) {
  const mount = item.mount === 'desk' ? 'desk' : 'wall';
  const elev = num(item.elev, mount === 'desk' ? 0.76 : 1.5);
  const root = rootAt(kind, item, ctx, elev);
  const tex = item.src ? await loadImage(item.src, ctx) : null;
  const info = printCanvas(tex ? tex.image : null, { w: 1024, border: 0.11, mono: num(item.mono, 1), contrast: 1.08, age: num(item.age, 0.3), grain: 0.25, seed: 9, tone: '#ECE5D4', aspect: tex ? undefined : 0.75 });
  const w = num(item.w, 0.3), h = w * info.H / info.W, fw = w * 0.09, depth = 0.025;
  const style = String(item.frame || 'wood');
  const fm = style === 'gilt' ? std({ color: 0xC9A04A, metalness: 1, roughness: 0.32 }) : style === 'steel' ? std({ color: 0x9AA0A4, metalness: 1, roughness: 0.25 }) : phys({ color: 0x3A2414, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const g = new THREE.Group();
  const rail = (len, x, y, rz) => { const b = new THREE.Mesh(new RoundedBoxGeometry(len, fw, depth, 2, fw * 0.25), fm); b.position.set(x, y, depth / 2); b.rotation.z = rz; b.castShadow = b.receiveShadow = true; g.add(b); };
  rail(w + fw * 2, 0, h / 2 + fw / 2, 0); rail(w + fw * 2, 0, -h / 2 - fw / 2, 0); rail(h, -w / 2 - fw / 2, 0, Math.PI / 2); rail(h, w / 2 + fw / 2, 0, Math.PI / 2);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: ctex(info.canvas), roughness: 0.85 })); pic.position.z = 0.006; pic.receiveShadow = true; g.add(pic);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + fw * 2, h + fw * 2, 0.004), std({ color: 0x2A1E14, roughness: 0.9 })); back.position.z = 0.002; back.castShadow = true; g.add(back);
  const glassM = phys({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5, depthWrite: false });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassM); gl.position.z = 0.012; gl.renderOrder = 3; g.add(gl);
  if (mount === 'desk') {
    g.rotation.x = -14 * DEG; g.position.set(0, (h / 2 + fw) * Math.cos(14 * DEG), 0);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.03, h * 0.8, 0.004), std({ color: 0x2A1E14 })); strut.position.set(0, h * 0.35, -0.07); strut.rotation.x = 20 * DEG; root.add(strut);
    const cs = contactRect(w + fw * 2, 0.12, 0.5); cs.position.set(0, 0.0005, -0.02); root.add(cs);
  } else g.position.set(0, 0, 0);
  root.add(g);
  // a wall frame gets its wall and a brass picture light (review 1: the frame was unreadable outside any light); the warm
  // spot from the hood above grazes the glass, the mat and the wall below it (`light: false` for the scene's own light)
  let pic_ = null;
  const E = Math.max(0.2, exposureOf(ctx));
  if (mount === 'wall' && wantsVoid(item, ctx) && item.room !== false) darkRoom(root, { fw: 6, fd: 5, wh: 3.0, y0: -elev, z0: -0.004 });
  if (item.light ?? mount === 'wall') {
    const top = h / 2 + fw, hood = new THREE.Group(), brass = std({ color: 0xA8823E, metalness: 1, roughness: 0.3 });
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), brass); arm.rotation.x = Math.PI / 2 - 0.5; arm.position.set(0, top + 0.06, 0.05); hood.add(arm);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, w * 0.7, 20, 1, false, 0, Math.PI), brass); bar.rotation.z = Math.PI / 2; bar.rotation.x = -0.6; bar.position.set(0, top + 0.1, 0.1); hood.add(bar);
    hood.traverse((m) => { if (m.isMesh) m.castShadow = true; }); if (mount === 'wall') root.add(hood);
    pic_ = new THREE.SpotLight(0xFFD6A8, 1, 0, 34 * DEG, 0.85, 2);
    const lp = mount === 'wall' ? [0, top + 0.08, 0.16] : [0.25, h + 0.45, 0.45]; pic_.position.set(...lp); pic_.target.position.set(0, mount === 'wall' ? -h * 0.05 : h * 0.4, 0);
    const d = Math.hypot(lp[0], lp[1] - pic_.target.position.y, lp[2]);
    pic_.intensity = num(item.light_level, 0.85) / E * Math.PI * d * d / 0.8;
    pic_.castShadow = true; pic_.shadow.mapSize.set(1024, 1024); pic_.shadow.camera.near = 0.05; pic_.shadow.camera.far = 3; pic_.shadow.bias = -0.0004; pic_.shadow.normalBias = 0.002;
    pic_.userData.noGovern = true; pic_.name = 'arc_picture_light'; root.add(pic_, pic_.target);
  }
  const anchor = new THREE.Object3D(); anchor.position.z = 0.012; g.add(anchor);
  // dust drifting through the picture light (a second moving layer on a still frame)
  const fdK = pic_ ? clamp(num(item.dust, 0.4)) : 0, fdm = fdK > 0 ? motes(Math.round(120 + 260 * fdK), [w * 2.2, h * 2.2, 0.6], 43, 0xFFE2C0, 'spot') : null;
  if (fdm) { fdm.pts.position.set(0, mount === 'wall' ? 0 : h * 0.5, 0.32); root.add(fdm.pts); fdm.U.uI.value = 1.1 * fdK / E; fdm.U.uSize.value = 0.0035; }
  const update = (t = 0) => { if (fdm) aimMotes(fdm, pic_, t, ctx); };
  update(0);
  return { root, radius: w, height: h + fw * 2, update, anchors: { center: anchor }, snapped: true, contact: false, pitchDark: !!pic_ && mount === 'wall' && item.dark !== false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.projector / archive.screen — the film is light
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// the projection canvas: the current frame inside a square (the image rect fits the spot's inscribed circle: the
// spot's map is applied only inside its frustum, and its cone is round), soft gate edges, a hot centre, scratches and
// dust per frame -> a CanvasTexture used as the SpotLight's gobo (map) and by the beam
function projCanvas(seq, o = {}) {
  const S = 768, [c, g] = canvas(S, S), aspect = seq ? seq.aspect : 4 / 3;
  const hh = Math.sqrt(0.94 / (aspect * aspect + 1)), ww = aspect * hh;                // half-diagonal 0.485 of the square
  const rw = ww * S, rh = hh * S, rx = (S - rw) / 2, ry = (S - rh) / 2;
  const [mc, mg] = canvas(S, S);                                                         // gate + hot-centre mask (static)
  mg.fillStyle = '#000'; mg.fillRect(0, 0, S, S); mg.filter = `blur(${(S * 0.006).toFixed(1)}px)`; mg.fillStyle = '#fff'; mg.fillRect(rx + 2, ry + 2, rw - 4, rh - 4); mg.filter = 'none';
  const hot = mg.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.5); hot.addColorStop(0, 'rgba(0,0,0,0)'); hot.addColorStop(1, `rgba(0,0,0,${0.38 * (o.vignette ?? 1)})`);
  mg.globalCompositeOperation = 'source-atop'; mg.fillStyle = hot; mg.fillRect(0, 0, S, S); mg.globalCompositeOperation = 'source-over';
  // the lens's scatter: a faint glow round the picture (it reaches the wall round the screen, so the room reads; review 1:
  // the screen hung in a black void)
  const [hc, hg] = canvas(S, S); hg.filter = `blur(${(S * 0.045).toFixed(1)}px)`; hg.fillStyle = `rgba(255,248,236,${0.075 * (o.halo ?? 1)})`; hg.fillRect(rx - rw * 0.16, ry - rh * 0.2, rw * 1.32, rh * 1.4); hg.filter = 'none';
  const tex = ctex(c); tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  let last = -1;
  const paint = (i, frame) => {
    if (i === last) return false; last = i;
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    if (frame) drawFrame(g, frame, rx, ry, rw, rh); else g.drawImage(noSignalTex().image, rx, ry, rw, rh);   // missing film: a dim grey card
    // the print through the projector: a light mono stage (newsreels are B&W already), scratches and dust per frame
    const n = Math.floor(hash(i, 3) * 3);
    for (let k = 0; k < n; k++) { const x = rx + hash(i, k + 5) * rw; g.fillStyle = `rgba(${hash(i, k) > 0.5 ? '255,255,255' : '0,0,0'},${0.25 + hash(k, i) * 0.3})`; g.fillRect(x, ry, 1 + hash(i + k, 2) * 1.5, rh); }
    for (let k = 0; k < 6; k++) { if (hash(i * 7 + k, 11) > 0.55) continue; const x = rx + hash(i, k + 20) * rw, y = ry + hash(i, k + 40) * rh, r = 1 + hash(i, k + 60) * 3; g.fillStyle = hash(i, k + 80) > 0.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'multiply'; g.drawImage(mc, 0, 0); g.globalCompositeOperation = 'lighter'; g.drawImage(hc, 0, 0); g.globalCompositeOperation = 'source-over';
    tex.needsUpdate = true; return true;
  };
  return { canvas: c, texture: tex, paint, rect: { ww, hh }, S };
}
// the volumetric beam: a pyramid from the lens to the image rect, ray-marched in the projector's space (fog noise,
// 1/z^2 spread, the film's own light: each sample reads the projection blurred, so the beam carries the picture's
// streaks); additive, depth-tested (a figure in front hides it), jittered per pixel and sub-frame (no banding)
const BEAM_VS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vW;
  void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
  }`;
const BEAM_FS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform mat4 uW2P; uniform vec2 uAx; uniform vec2 uRect; uniform float uDist; uniform sampler2D uImg; uniform float uI; uniform float uT; uniform float uJ; uniform vec3 uCol;
  varying vec3 vW;
  float bh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float bn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y), mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z); }
  void main(){
    #include <logdepthbuf_fragment>
    vec3 rd = normalize(vW - cameraPosition);
    const int N = 64; float L = uDist * 1.15; float st = L / float(N);
    // interleaved-gradient start offset (blue-ish noise, rotated per sub-frame): j6/j9 showed white-noise grain in the beam
    float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uJ * 0.61803);
    vec3 acc = vec3(0.0);
    for (int i = 0; i < N; i++) {
      vec3 p = vW + rd * (float(i) + j) * st;
      vec3 q = (uW2P * vec4(p, 1.0)).xyz;
      if (q.z <= 0.02 || q.z >= uDist) continue;
      vec2 s = q.xy / (q.z * uAx);
      float e = max(abs(s.x), abs(s.y)); if (e >= 1.0) continue;
      vec2 cuv = 0.5 + vec2(-s.x, s.y) * uRect * 0.5;
      vec3 img = texture2D(uImg, cuv, 2.5).rgb;
      float fog = 0.35 + 0.65 * bn(q * vec3(2.2, 2.2, 0.9) + vec3(0.0, uT * 0.06, -uT * 0.05)) * (0.6 + 0.4 * bn(q * 0.7 - uT * 0.02));
      acc += img * fog * (1.0 - smoothstep(0.9, 1.0, e)) / max(q.z * q.z, 0.25);
    }
    gl_FragColor = vec4(acc * st * uI * uCol, 1.0);
  }`;
function screenGeo(w, h, type, seed) {
  const g = new THREE.PlaneGeometry(w, h, 40, 30), p = g.attributes.position, R = makeRng(seed);
  if (type === 'sheet') {                       // a hung sheet: soft vertical folds, a sag between the hanging points
    const ph = [R() * 6, R() * 6, R() * 6];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / w, y = p.getY(i) / h; p.setZ(i, 0.012 * Math.sin(x * 19 + ph[0]) * (0.4 + (0.5 - y)) + 0.008 * Math.sin(x * 7.3 + ph[1]) + 0.01 * (1 - Math.abs(x * 2)) * (y + 0.5)); }
  }
  g.computeVertexNormals(); return g;
}
// an empty bentwood chair (seat 0.46 m), its back rail at -z: a sitter faces +z
function bentwoodChair(cm) {
  const c = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), cm); seat.position.y = 0.46; c.add(seat);
  for (const [x, z] of [[-0.15, -0.13], [0.15, -0.13], [-0.14, 0.14], [0.14, 0.14]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 8), cm); l.position.set(x, 0.23, z); l.rotation.z = x * -0.15; c.add(l); }
  const bk = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 24, Math.PI), cm); bk.position.set(0, 0.62, -0.17); c.add(bk);
  for (const x of [-0.16, 0.16]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), cm); p.position.set(x, 0.54, -0.17); c.add(p); }
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.012), cm); sl.position.set(0, 0.66, -0.17); c.add(sl);
  c.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return c;
}
// the dark room round a screen-type set (review 1: the tv and the screen were lit rectangles in a black void): a plank
// floor and the wall the set stands against, lit only by the set's own glow and practicals. y0 = the floor's height in
// the root's space (a raised root), z0 = the wall plane.
function darkRoom(root, o) {
  const fw = o.fw ?? 7, fd = o.fd ?? 7, wh = o.wh ?? 3.2, y0 = o.y0 ?? 0, z0 = o.z0 ?? -0.1;
  const pw = plankWood('oak'), mp = pw.map.clone(); mp.needsUpdate = true; mp.repeat.set(fw / pw.M, fd / pw.M); mp.rotation = Math.PI / 2; keep(mp);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd).rotateX(-Math.PI / 2), std({ map: mp, color: 0xE0D2C2, roughness: 0.5 }));   // oak: light enough to catch the glow (f4: walnut stayed black)
  fl.position.set(0, y0 + 0.001, z0 + fd / 2); fl.receiveShadow = true; fl.userData.noQA = true; fl.name = 'arc_room_floor'; root.add(fl);
  const wallT = cached('arc_wallpaper', () => { const [c, g] = canvas(256, 256), R = makeRng(19); g.fillStyle = '#7A6A56'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 3, 256); g.fillStyle = 'rgba(255,235,200,0.04)'; g.fillRect(x + 12, 0, 8, 256); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,240,210'},${0.02 + R() * 0.04})`; g.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1); }
    return ctex(c, true, true); });
  const wt = wallT.clone(); wt.needsUpdate = true; wt.repeat.set(fw / 0.5, wh / 0.5); keep(wt);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(fw, wh), std({ map: wt, roughness: 0.95, color: o.wall ?? 0xFFFFFF })); back.position.set(0, y0 + wh / 2, z0); back.receiveShadow = true; back.name = 'arc_room_wall'; root.add(back);
  const sk = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.12, 0.02), std({ color: 0x1E1610, roughness: 0.6 })); sk.position.set(0, y0 + 0.06, z0 + 0.01); sk.receiveShadow = true; root.add(sk);
  return { floor: fl, back };
}
// a table lamp with a fabric shade (a visible practical: warm light, the shade glowing)
function tableLamp(E, level = 1) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.03, 24), std({ color: 0x6B4A22, metalness: 0.6, roughness: 0.35 })); base.position.y = 0.015; g.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.3, 12), std({ color: 0x6B4A22, metalness: 0.6, roughness: 0.35 })); stem.position.y = 0.18; g.add(stem);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.15, 28, 1, true), std({ color: 0x7A6448, emissive: 0xFFC27A, emissiveIntensity: 0.9 * level / E, roughness: 0.9, side: THREE.DoubleSide }));
  shade.position.y = 0.36; g.add(shade);
  const pl = new THREE.PointLight(0xFFC890, level * 2.0 / E, 0, 2); pl.position.y = 0.34; pl.userData.noGovern = true; pl.name = 'arc_practical'; g.add(pl);
  base.castShadow = stem.castShadow = true;
  return g;
}
function sideTable() {
  const g = new THREE.Group(), m = std({ color: 0x2A1C12, roughness: 0.5 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 32), m); top.position.y = 0.6; g.add(top);
  for (let k = 0; k < 3; k++) { const a = k * TAU / 3, l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.6, 8), m); l.position.set(Math.cos(a) * 0.17, 0.3, Math.sin(a) * 0.17); l.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08); g.add(l); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
// an armchair seen from behind (a dark silhouette against the screen's glow)
function armchair() {
  const g = new THREE.Group(), m = std({ color: 0x2C2420, roughness: 0.9 });
  const add = (w, h, d, x, y, z, r = 0.04) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  add(0.72, 0.18, 0.7, 0, 0.33, 0); add(0.72, 0.62, 0.16, 0, 0.6, 0.3, 0.06).rotation.x = -0.12;
  add(0.14, 0.34, 0.68, -0.33, 0.47, 0.02, 0.05); add(0.14, 0.34, 0.68, 0.33, 0.47, 0.02, 0.05);
  for (const [x, z] of [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]]) add(0.05, 0.24, 0.05, x, 0.12, z, 0.01);
  return g;                                            // faces -z (the back at +z)
}
async function buildProjector(kind, item, ctx) {
  RectAreaLightUniformsLib.init();
  const root = rootAt(kind, item, ctx, 0);
  voidDome(root, item, ctx);
  const seq = await seqFor(item, ctx, kind);
  const dist = clamp(num(item.dist, 5.5), 1.5, 30), elev = num(item.elev, 0.9);
  const PC = projCanvas(seq, {});
  const sw = clamp(num(item.screen_w, 2.4), 0.5, 12), sh = sw / PC.rect.ww * PC.rect.hh;
  const E = Math.max(0.2, exposureOf(ctx));
  const beamK = clamp(num(item.beam, 0.6)), dustK = clamp(num(item.dust, 0.6)), flick = clamp(num(item.flicker, 0.5));
  // the projector on its stand (root = the stand's foot; +z = toward the screen)
  const proj = new THREE.Group(); proj.name = 'projector'; root.add(proj);
  const tableM = std({ color: 0x2B1D12, roughness: 0.6 }), body = std({ color: 0x34383A, roughness: 0.5, metalness: 0.55 }), chrome = std({ color: 0xC8CACC, metalness: 1, roughness: 0.18 }), black = std({ color: 0x0C0C0D, roughness: 0.6 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.7), tableM); top.position.y = elev - 0.2; top.castShadow = top.receiveShadow = true; proj.add(top);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, elev - 0.22, 0.04), tableM); l.position.set(sx * 0.23, (elev - 0.22) / 2, sz * 0.3); l.castShadow = true; proj.add(l); }
  const ty = elev - 0.18;
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.2, 0.34, 3, 0.02), body); box.position.set(0, ty + 0.1, 0); box.castShadow = box.receiveShadow = true; proj.add(box);
  const lensY = elev, lensZ = 0.22;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.11, 32), black); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, lensY, lensZ - 0.05); barrel.castShadow = true; proj.add(barrel);
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.004, 10, 32), chrome); ringL.position.set(0, lensY, lensZ + 0.005); proj.add(ringL);
  const glassL = new THREE.Mesh(new THREE.CircleGeometry(0.024, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.0, 2.6) })); glassL.position.set(0, lensY, lensZ + 0.006); proj.add(glassL);
  const house = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.12, 0.12, 2, 0.015), body); house.position.set(0, ty + 0.26, -0.08); house.castShadow = true; proj.add(house);
  const ventM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xFFB060, emissiveIntensity: 0.0, roughness: 1 });
  for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.101, 0.008, 0.07), ventM); v.position.set(0, ty + 0.235 + k * 0.018, -0.08); proj.add(v); }
  // reels on their arms (feed in front, take-up behind), turning at the film's speed
  const reels = [];
  const reelM = std({ color: 0x8C9094, metalness: 1, roughness: 0.35 }), filmM = std({ color: 0x1A1410, roughness: 0.45, metalness: 0.2 });
  for (const [z, y, rPack, sgn] of [[0.1, ty + 0.46, 0.11, 1], [-0.17, ty + 0.44, 0.06, 1]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.018, y - ty - 0.18, 0.025), body); arm.position.set(0.075, (y + ty + 0.18) / 2, z); arm.castShadow = true; proj.add(arm);
    const reel = new THREE.Group(); reel.position.set(0.075, y, z); proj.add(reel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.004, 8, 64), reelM); rim.rotation.y = Math.PI / 2; reel.add(rim);
    const rimB = rim.clone(); rimB.position.x = 0.03; reel.add(rimB);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.29, 0.03), reelM); sp.rotation.x = k * TAU / 3; reel.add(sp); const sp2 = sp.clone(); sp2.position.x = 0.03; reel.add(sp2); }
    const pack = new THREE.Mesh(new THREE.CylinderGeometry(rPack, rPack, 0.016, 48), filmM); pack.rotation.z = Math.PI / 2; pack.position.x = 0.015; reel.add(pack);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 16), chrome); hub.rotation.z = Math.PI / 2; hub.position.x = 0.015; reel.add(hub);
    reel.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    reels.push({ reel, w: 0.183 / rPack * sgn });
  }
  // film path loops (feed reel -> gate -> take-up)
  const filmPath = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.09, ty + 0.4, 0.2], [0.085, ty + 0.25, 0.16], [0.075, ty + 0.17, 0.12], [0.075, ty + 0.12, 0.02], [0.08, ty + 0.2, -0.1], [0.09, ty + 0.38, -0.2]].map((a) => new THREE.Vector3(...a))), 48, 0.0035, 6), filmM);
  proj.add(filmPath);
  const leak = new THREE.PointLight(0xFFB070, 0, 0, 2); leak.position.set(0.16, ty + 0.27, -0.12); leak.userData.noGovern = true; proj.add(leak);   // the lamp house's spill: rims the body, the reels and the table
  // the projection light: a spot at the lens whose gobo is the frame; the beam frame (projector space) aims it
  const aim = new THREE.Group(); aim.position.set(0, lensY, lensZ); proj.add(aim);
  const rise = num(item.rise, 0.25);
  const screenC = new THREE.Vector3(0, lensY + rise + (num(item.screen_y, null) ?? 0), lensZ + dist);
  aim.lookAt(proj.localToWorld(screenC.clone()));    // provisional (root not yet placed in world: fixed after placement below)
  const half = 0.5 * PC.S / PC.S;                    // the square's half-extent in canvas units = 0.5
  const sqSide = sw / PC.rect.ww;                    // the square's side at the screen (m): the image covers ww of it
  const spot = new THREE.SpotLight(0xFFF6E8, 1, 0, Math.atan(half * sqSide / dist), 0.0, 2);
  spot.map = PC.texture; spot.castShadow = item.shadows !== false; spot.shadow.mapSize.set(1024, 1024); spot.shadow.camera.near = 0.3; spot.shadow.camera.far = dist + 2; spot.shadow.bias = -0.0003; spot.shadow.normalBias = 0.01; spot.shadow.radius = 2;
  spot.userData.noGovern = true; spot.name = 'arc_projection';
  const screenAlb = 0.82, I0 = (num(item.level, 1.15) / E) * Math.PI * dist * dist / screenAlb;
  spot.intensity = I0;
  root.add(spot, spot.target);
  // the screen
  const scr = new THREE.Group(); root.add(scr);
  const stype = item.screen === 'framed' ? 'framed' : 'sheet';
  const scrMesh = new THREE.Mesh(screenGeo(sw * 1.18, sh * 1.22, stype, 7), std({ color: new THREE.Color(screenAlb, screenAlb * 0.985, screenAlb * 0.95), roughness: 1 }));
  scrMesh.receiveShadow = true; scrMesh.name = 'arc_screen'; scr.add(scrMesh);
  if (stype === 'framed') { const bm = std({ color: 0x050505, roughness: 1 }); for (const [x, y, w, h] of [[0, sh * 0.61 + 0.05, sw * 1.18 + 0.2, 0.1], [0, -sh * 0.61 - 0.05, sw * 1.18 + 0.2, 0.1], [-sw * 0.59 - 0.05, 0, 0.1, sh * 1.22], [sw * 0.59 + 0.05, 0, 0.1, sh * 1.22]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), bm); f.position.set(x, y, 0.01); scr.add(f); } }
  else { const rope = std({ color: 0x2A2620, roughness: 0.9 }); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 6), rope); r.position.set(s * sw * 0.59, sh * 0.61 + 0.6, -0.01); scr.add(r); } const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, sw * 1.24, 12), std({ color: 0x3A2A1C })); bar.rotation.z = Math.PI / 2; bar.position.set(0, sh * 0.61 + 0.01, 0); scr.add(bar); }
  // the room: a floor and the walls round the screen (dark; the film's bounce lights them)
  if (item.room !== false) {
    const wallM = std({ color: 0x45403A, roughness: 0.95 }), floorM = std({ color: 0x2C241C, roughness: 0.8 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(sw * 3 + 4, 4.2), wallM); back.position.set(0, 2.1, lensZ + dist + 0.25); back.rotation.y = Math.PI; back.receiveShadow = true; root.add(back);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(sw * 3 + 4, dist + 6), floorM); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.002, lensZ + dist / 2 - 1.5); fl.receiveShadow = true; fl.userData.noQA = true; root.add(fl);
    for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(dist + 6, 4.2), wallM); sd.position.set(s * (sw * 1.5 + 2), 2.1, lensZ + dist / 2 - 1.5); sd.rotation.y = -s * Math.PI / 2; sd.receiveShadow = true; root.add(sd); }
    // two dim warm wall sconces near the screen (a screening room's house lights at their lowest): the side walls and the
    // floor get a shape, the room is no longer a void round the picture (`sconces: false` turns them off)
    if (item.sconces !== false) for (const s of [-1, 1]) {
      const x = s * (sw * 1.5 + 2 - 0.06), z = lensZ + dist - 0.9;
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.16, 20, 1, true), std({ color: 0x3A2A1A, emissive: 0xFFB070, emissiveIntensity: 0.55 / E, roughness: 0.8, side: THREE.DoubleSide }));
      sh.position.set(x, 2.15, z); root.add(sh);
      const pl = new THREE.PointLight(0xFFB070, num(item.sconce_level, 1) * 0.16 / E, 0, 2); pl.position.set(x - s * 0.12, 2.1, z); pl.userData.noGovern = true; pl.name = 'arc_sconce'; root.add(pl);
    }
  }
  // an audience's empty chairs between the projector and the screen (`chairs`: n per row, `rows`): bentwood silhouettes
  // against the picture; the beam clips the back row's top rail, so the screen's lower edge carries their shadows
  const nCh = clamp(Math.round(num(item.chairs, 0)), 0, 12), nRows = clamp(Math.round(num(item.rows, 2)), 1, 4);
  if (nCh > 0) {
    const cm = std({ color: 0x2A1C12, roughness: 0.55 }), R0 = makeRng(num(item.seed, 5) * 3 + 1);
    const chair = () => bentwoodChair(cm);
    for (let r = 0; r < nRows; r++) for (let k = 0; k < nCh; k++) {
      const c = chair(), x = (k - (nCh - 1) / 2) * 0.62 + (R0() - 0.5) * 0.08, z = lensZ + 1.6 + r * 0.95 + (R0() - 0.5) * 0.06;
      c.position.set(x, 0, z); c.rotation.y = (R0() - 0.5) * 0.12; root.add(c);                   // the back rail at -z: a sitter faces the screen (+z)
    }
  }
  // the screen's glow on the room (an area light facing back, coloured by the frame's mean light)
  const glow = new THREE.RectAreaLight(0xFFF4E4, 0, sw, sh); glow.name = 'arc_screen_glow'; root.add(glow);
  // the beam volume (pyramid in projector space, lens at the apex)
  const ax = new THREE.Vector2(0.5 * sw / dist, 0.5 * sh / dist);
  const bg = new THREE.BufferGeometry();
  {
    const z1 = dist - 0.02, a = 0.012, P = [];
    const n = [[-a, -a * 0.75, 0.02], [a, -a * 0.75, 0.02], [a, a * 0.75, 0.02], [-a, a * 0.75, 0.02]], f = [[-ax.x * z1, -ax.y * z1, z1], [ax.x * z1, -ax.y * z1, z1], [ax.x * z1, ax.y * z1, z1], [-ax.x * z1, ax.y * z1, z1]];
    for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; P.push(...n[k], ...f[k], ...f[k2], ...n[k], ...f[k2], ...n[k2]); }
    bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  }
  const BU = { uW2P: { value: new THREE.Matrix4() }, uAx: { value: ax }, uRect: { value: new THREE.Vector2(PC.rect.ww, PC.rect.hh) }, uDist: { value: dist }, uImg: { value: PC.texture }, uI: { value: 0 }, uT: { value: 0 }, uJ: { value: 0 }, uCol: { value: new THREE.Color(1.0, 0.94, 0.84) } };
  const beam = new THREE.Mesh(bg, new THREE.ShaderMaterial({ uniforms: BU, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.name = 'arc_beam'; beam.frustumCulled = false; beam.userData.noQA = true; beam.userData.noCollide = true; beam.renderOrder = 4;   // light, not a solid: people sit and stand in it (review 1: the registry moved the audience out of the beam)
  const beamFrame = new THREE.Group(); beamFrame.add(beam); root.add(beamFrame);
  const dust = dustK > 0 ? motes(Math.round(160 + 560 * dustK), [sw * 1.0, sh * 1.0, dist], 47, 0xFFF0DC, 'proj') : null;   // few, soft motes (j6 final: hundreds of specks read as sand)
  if (dust) { dust.pts.position.z = dist / 2; beamFrame.add(dust.pts); dust.U.uAx.value = ax; dust.U.uDist.value = dist; dust.U.uSize.value = 0.015; }
  // the beam frame's pose: lens -> screen centre (after the root is placed; the registry does not move it)
  const lensW = new THREE.Vector3(), scrW = new THREE.Vector3(), _m = new THREE.Matrix4();
  const place = () => {
    root.updateMatrixWorld(true);
    lensW.set(0, lensY, lensZ); proj.localToWorld(lensW);
    scrW.copy(screenC); proj.localToWorld(scrW);
    beamFrame.position.copy(root.worldToLocal(lensW.clone()));
    beamFrame.lookAt(scrW);                                  // +z of the frame toward the screen (Object3D.lookAt on a non-camera)
    beamFrame.updateMatrixWorld(true);
    spot.position.copy(beamFrame.position); spot.target.position.copy(root.worldToLocal(scrW.clone())); spot.updateMatrixWorld(); spot.target.updateMatrixWorld();
    scr.position.copy(root.worldToLocal(scrW.clone())).add(new THREE.Vector3(0, 0, 0)); scr.lookAt(lensW); scr.updateMatrixWorld(true);
    glow.position.copy(scr.position); glow.lookAt(lensW); glow.updateMatrixWorld();
    _m.copy(beamFrame.matrixWorld).invert(); BU.uW2P.value.copy(_m); if (dust) dust.U.uW2P.value.copy(_m);
  };
  place();
  const anchors = { lens: aim, projector: box, screen: scr };
  let jit = 0;
  const update = (t = 0) => {
    const i = seq ? seq.update(t) : 0;
    PC.paint(seq ? i : 0, seq ? seq.frames[i] : null);
    const fr = Math.floor(t * (seq ? seq.fps : 24) + 1e-6);
    // flicker at the shutter's 24 fps (two-blade irregularity), a slow lamp breathing; the gate weave nudges the aim
    const fl = 1 + flick * (0.16 * (hash(fr, 13) - 0.5) + 0.05 * Math.sin(t * 7.1)) ;
    const lum = seq ? seq.luma[i] : 0.3;
    spot.intensity = I0 * fl;
    const wx = (hash(fr, 21) - 0.5) * 0.0018 * sqSide * flick, wy = (hash(fr, 23) - 0.5) * 0.0014 * sqSide * flick;
    spot.target.position.copy(root.worldToLocal(scrW.clone())).add(new THREE.Vector3(wx, wy, 0)); spot.target.updateMatrixWorld();
    const scrRad = screenAlb / Math.PI * I0 / (dist * dist) * fl;             // the screen's radiance per unit image light
    glow.intensity = scrRad * lum * 7.0;                                      // the screen's light on the room (lifted: j1's walls read pure black)
    ventM.emissiveIntensity = (1.4 + 0.25 * Math.sin(t * 9.3)) * fl / E;
    leak.intensity = 1.1 * fl / E;
    for (const r of reels) r.reel.rotation.x = -t * r.w;
    BU.uT.value = t; BU.uJ.value = (jit = (jit + 1) % 997) * 0.618 + t * 13.0;
    BU.uI.value = beamK * 0.25 * I0 * fl / (4 * Math.PI);                         // in-scattering: sigma x I / 4 pi (I0 carries 1 / exposure)
    if (dust) { dust.U.uT.value = t; dust.U.uI.value = dustK * 2.6 * fl / E; dust.U.uResY.value = ctx.renderer ? ctx.renderer.domElement.height : 1080; }
  };
  update(0);
  return { root, radius: Math.max(dist / 2 + 0.5, sw), height: Math.max(2.4, screenC.y + sh), update, anchors, footprint: [Math.max(1, sw * 1.2), dist + 0.8], snapped: true, contact: false, pitchDark: item.dark !== false };
}

async function buildScreen(kind, item, ctx) {
  RectAreaLightUniformsLib.init();
  const root = rootAt(kind, item, ctx, 0);
  voidDome(root, item, ctx);
  const seq = await seqFor(item, ctx, kind);
  const w = clamp(num(item.w, 2.4), 0.3, 12), h = w / (seq ? seq.aspect : 4 / 3), elev = num(item.elev, 0.8);
  const E = Math.max(0.2, exposureOf(ctx)), flick = clamp(num(item.flicker, 0.4));
  const m = archivalMaterial({ map: seq ? seq.texture : noSignalTex(), emissive: true, mono: num(item.mono, 1), contrast: 1.1, age: 0.2, grain: 0.5, scratch: 0.6 * flick, dust: 0.5, flicker: flick, vignette: 0.55, hot: 0.25, seed: 5, intensity: 1.0 / E, base: 0x0E0D0C });
  // the room it hangs in: the wall, a plank floor catching its glow, empty chairs as silhouettes, dim sconces
  if (item.room !== false && wantsVoid(item, ctx)) {
    darkRoom(root, { fw: w * 3 + 4, fd: 9, wh: Math.max(3.2, elev + h + 1.2), z0: -0.08 });
    const nCh = clamp(Math.round(num(item.chairs, 4)), 0, 12), nRows = clamp(Math.round(num(item.rows, 2)), 1, 4), cm = std({ color: 0x2A1C12, roughness: 0.55 }), R0 = makeRng(num(item.seed, 7) * 5 + 3);
    for (let r = 0; r < nRows; r++) for (let k = 0; k < nCh; k++) { const c = bentwoodChair(cm); c.position.set((k - (nCh - 1) / 2) * 0.62 + (R0() - 0.5) * 0.08, 0, 2.0 + r * 0.95 + (R0() - 0.5) * 0.06); c.rotation.y = Math.PI + (R0() - 0.5) * 0.12; root.add(c); }   // facing the screen (-z)
    if (item.sconces !== false) for (const sx of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.16, 20, 1, true), std({ color: 0x3A2A1A, emissive: 0xFFB070, emissiveIntensity: 0.55 / E, roughness: 0.8, side: THREE.DoubleSide }));
      sh.position.set(sx * (w / 2 + 0.9), elev + h * 0.8, 0.0); root.add(sh);
      const pl = new THREE.PointLight(0xFFB070, num(item.sconce_level, 1) * 0.14 / E, 0, 2); pl.position.set(sx * (w / 2 + 0.9), elev + h * 0.8 - 0.05, 0.12); pl.userData.noGovern = true; pl.name = 'arc_sconce'; root.add(pl);
    }
  }
  const stype = item.screen === 'framed' ? 'framed' : 'sheet';
  const geo = screenGeo(w, h, stype, 9);
  const scr = new THREE.Mesh(geo, m); scr.position.set(0, elev + h / 2, 0); scr.name = 'arc_screen'; root.add(scr);
  if (stype === 'framed') { const bm = std({ color: 0x050505, roughness: 1 }); for (const [x, y, ww, hh] of [[0, h / 2 + 0.05, w + 0.2, 0.1], [0, -h / 2 - 0.05, w + 0.2, 0.1], [-w / 2 - 0.05, 0, 0.1, h], [w / 2 + 0.05, 0, 0.1, h]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.03), bm); f.position.set(x, elev + h / 2 + y, 0.01); root.add(f); } }
  const glow = new THREE.RectAreaLight(0xFFF2E0, 0, w, h); glow.position.set(0, elev + h / 2, 0.02); glow.rotation.y = Math.PI; root.add(glow);   // a light emits along -z: turned to the room (+z)
  const update = (t = 0) => {
    const i = seq ? seq.update(t) : 0;
    const fr = Math.floor(t * (seq ? seq.fps : 24) + 1e-6);
    setArchivalFrame(m, fr, [(hash(fr, 3) - 0.5) * 0.002 * flick, (hash(fr, 5) - 0.5) * 0.0016 * flick]);
    const e = liveExposure(ctx); m.emissiveIntensity = 1.0 / Math.max(0.2, e);
    glow.intensity = (seq ? seq.luma[i] : 0.03) * num(item.glow, 1) * 6.5 / Math.max(0.2, e);   // the room catches the film's light (f1: at 2.2 the floor and chairs stayed black)
  };
  update(0);
  return { root, radius: w / 2 + 0.2, height: elev + h, update, anchors: { screen: scr }, footprint: [w, 0.2], snapped: true, contact: false, pitchDark: item.dark !== false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.tv — a CRT set
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const CRT_GLSL = /* glsl */`
uniform float uCrtT; uniform float uCrtFrame; uniform float uCrtFlick; uniform float uCrtLines; uniform float uCrtRoll;
float crtH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;
function crtMaterial(map, E) {
  const U = { uCrtT: { value: 0 }, uCrtFrame: { value: 0 }, uCrtFlick: { value: 0.4 }, uCrtLines: { value: 240 }, uCrtRoll: { value: 0.5 } };
  const m = new THREE.MeshStandardMaterial({ color: 0x0A0B0A, roughness: 0.12, metalness: 0, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 1.1 / E, envMapIntensity: 0.6 });
  m.userData.crt = U; m.userData.progKey = 'f3dCrt';
  return patchMaterial(m, (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + CRT_GLSL)
      .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
        { vec2 uv = vEmissiveMapUv * 2.0 - 1.0; uv *= 1.0 + 0.06 * dot(uv, uv); vec2 q = uv * 0.5 + 0.5;            // barrel
          float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
          vec3 c = vec3(0.0); float bl = 1.6 / 960.0;
          c += texture2D(emissiveMap, q).rgb * 0.6 + texture2D(emissiveMap, q + vec2(bl, 0.0)).rgb * 0.2 + texture2D(emissiveMap, q - vec2(bl, 0.0)).rgb * 0.2;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(c, vec3(l) * vec3(0.92, 1.0, 1.06), 0.85);   // a B&W tube, faint blue-white phosphor
          // scanlines, faded out where they get finer than ~2.5 px (j1: 480 lines on a 220 px screen made moire)
          float ls = q.y * uCrtLines; float fw = fwidth(ls);
          float sl = mix(0.62 + 0.38 * pow(abs(sin(ls * 3.14159)), 0.8), 0.86, smoothstep(0.25, 0.45, fw));
          float mk = 1.0;
          float roll = 1.0 - 0.12 * uCrtRoll * smoothstep(0.0, 0.12, 0.12 - abs(fract(q.y - uCrtT * 0.11) - 0.5));
          float vg = smoothstep(1.25, 0.55, length(uv * vec2(0.9, 1.0)));
          float fl = 1.0 + (crtH(vec2(uCrtFrame, 3.0)) - 0.5) * 0.12 * uCrtFlick;
          float n = (crtH(gl_FragCoord.xy * 0.37 + uCrtFrame * 1.7) - 0.5) * 0.08;
          totalEmissiveRadiance *= max(c * sl * mk * roll * vg * fl + n * l, 0.0) * inside + vec3(0.012, 0.014, 0.013) * (1.0 - inside); }
        #endif`);
  });
}
async function buildTV(kind, item, ctx) {
  const era = String(item.era || '1950s');
  const elev = num(item.elev, era === '1970s' ? 0.75 : 0);
  const root = rootAt(kind, item, ctx, elev);
  voidDome(root, item, ctx);
  const seq = await seqFor(item, ctx, kind);
  const E = Math.max(0.2, exposureOf(ctx));
  const sw = clamp(num(item.w, 0.42), 0.15, 1.2), shh = sw * 0.76;
  const m = crtMaterial(seq ? seq.texture : noSignalTex(), E);
  const g = new THREE.Group(); root.add(g);
  const console_ = era !== '1970s';
  const cabW = sw * 1.55, cabH = console_ ? sw * 2.25 : sw * 1.25, cabD = sw * (console_ ? 1.1 : 1.0);
  const veneer = console_ ? (() => { const T = plankWood('walnut'); const mp = T.map.clone(); mp.needsUpdate = true; mp.repeat.set(0.5, 0.5); keep(mp); return phys({ map: mp, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.15 }); })() : std({ color: 0x8C8578, roughness: 0.45 });
  const cab = new THREE.Mesh(new RoundedBoxGeometry(cabW, cabH, cabD, 3, sw * 0.06), veneer); cab.position.y = cabH / 2 + (console_ ? 0.12 : 0); cab.castShadow = cab.receiveShadow = true; g.add(cab);
  if (console_) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.13, 10), std({ color: 0x1E140C })); l.position.set(sx * cabW * 0.42, 0.065, sz * cabD * 0.38); g.add(l); }
  const sy = (console_ ? 0.12 : 0) + cabH - sw * 0.15 - shh / 2;
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(sw * 1.12, shh * 1.14, 0.02, 3, sw * 0.08), std({ color: console_ ? 0xC9B98E : 0x2A2A28, metalness: console_ ? 0.6 : 0, roughness: 0.35 }));
  bezel.position.set(0, sy, cabD / 2 + 0.002); g.add(bezel);
  const sg = new THREE.PlaneGeometry(sw, shh, 24, 18), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) / (sw / 2), y = sp.getY(i) / (shh / 2); sp.setZ(i, sw * 0.045 * (1 - 0.5 * (x * x + y * y))); }
  sg.computeVertexNormals();
  const scr = new THREE.Mesh(sg, m); scr.position.set(0, sy, cabD / 2 + 0.006); scr.name = 'arc_tv_screen'; g.add(scr);
  if (console_) {
    const cloth = cached('arc_grille', () => { const [c, gg] = canvas(256, 256); gg.fillStyle = '#4A3E2C'; gg.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 3) { gg.fillStyle = 'rgba(0,0,0,0.25)'; gg.fillRect(0, y, 256, 1); } for (let x = 0; x < 256; x += 3) { gg.fillStyle = 'rgba(255,230,180,0.08)'; gg.fillRect(x, 0, 1, 256); } return ctex(c, true, true); });
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(sw * 1.2, cabH * 0.32), std({ map: cloth, roughness: 1 })); gr.position.set(0, 0.12 + cabH * 0.22, cabD / 2 + 0.003); g.add(gr);
  }
  for (const k of [0, 1]) { const kn = new THREE.Mesh(new THREE.CylinderGeometry(sw * 0.045, sw * 0.05, 0.02, 24), std({ color: 0x1A1612, roughness: 0.4 })); kn.rotation.x = Math.PI / 2; kn.position.set(sw * 0.35 + k * sw * 0.14 - sw * 0.07, sy - shh / 2 - sw * 0.1, cabD / 2 + 0.01); g.add(kn); }
  // a dim warm practical off to one side (a lamp in the room): the cabinet reads as furniture, not a floating screen (j2)
  // the room (review 1: a lit rectangle in a black void, p90 3 -> too_dark): a plank floor and a papered wall behind the
  // set, a side table with a visible table lamp (the practical), a sideboard under a table set, an armchair from behind
  const room = item.room !== false && wantsVoid(item, ctx);
  if (room) {
    darkRoom(root, { fw: 7, fd: 7, wh: 3.0, y0: -elev, z0: -cabD / 2 - 0.18 });
    if (elev > 0.3) { const sb = new THREE.Mesh(new RoundedBoxGeometry(cabW * 1.9, elev - 0.02, cabD * 1.25, 2, 0.01), phys({ color: 0x3A2616, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 })); sb.position.set(0, -elev / 2 - 0.01, 0); sb.castShadow = sb.receiveShadow = true; root.add(sb); }
    if (item.lamp !== false) {
      const st = sideTable(), side = item.lamp_side === 'right' ? 1 : -1; st.position.set(side * (cabW / 2 + 0.5), -elev, 0.05); root.add(st);
      const tl = tableLamp(E, num(item.lamp_level, 1)); tl.position.set(side * (cabW / 2 + 0.5), -elev + 0.6125, 0.05); root.add(tl);
    }
    if (item.armchair) { const ac = armchair(); ac.position.set(num(item.armchair_x, 0.35), -elev, cabD / 2 + num(item.armchair_dist, 1.7)); ac.rotation.y = num(item.armchair_turn, -8) * DEG; root.add(ac); }
    // a worn rug in front of the set: it catches the tube's glow and the lamp, so the floor (and the armchair's silhouette
    // on it) reads (`rug: false`)
    if (item.rug !== false) {
      const rt = cached('arc_rug', () => { const [c, gg] = canvas(512, 340), R2 = makeRng(29); gg.fillStyle = '#7A3A2A'; gg.fillRect(0, 0, 512, 340);
        gg.strokeStyle = '#C9A877'; gg.lineWidth = 10; gg.strokeRect(22, 22, 468, 296); gg.strokeStyle = '#3A2018'; gg.lineWidth = 4; gg.strokeRect(40, 40, 432, 260);
        for (let k = 0; k < 7; k++) { gg.fillStyle = k % 2 ? '#B8925E' : '#4A2A20'; gg.beginPath(); const cx = 256, cy = 170, r = 110 - k * 14; gg.moveTo(cx - r * 1.4, cy); gg.lineTo(cx, cy - r * 0.7); gg.lineTo(cx + r * 1.4, cy); gg.lineTo(cx, cy + r * 0.7); gg.closePath(); gg.fill(); }
        for (let i = 0; i < 26000; i++) { gg.fillStyle = `rgba(${R2() < 0.5 ? '0,0,0' : '255,230,190'},${0.04 + R2() * 0.07})`; gg.fillRect(R2() * 512, R2() * 340, 1 + R2() * 2, 1); }
        return ctex(c); });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.25).rotateX(-Math.PI / 2), std({ map: rt, roughness: 1 })); rug.position.set(0.05, -elev + 0.004, cabD / 2 + 0.75); rug.receiveShadow = true; rug.userData.noQA = true; root.add(rug);
    }
  } else if (item.lamp !== false) { const lp = new THREE.PointLight(0xFFC890, num(item.lamp_level, 1) * 1.6 / E, 0, 2); lp.position.set(-cabW * 1.6, (console_ ? 0.12 : 0) + cabH + 0.5, cabD * 1.6); lp.userData.noGovern = true; lp.name = 'arc_tv_lamp'; g.add(lp); }
  // the tube's light on the room: a soft area light in front of the glass, twice the screen and brighter than a real tube
  // (the film cheat that lets a TV light a face, a floor, an armchair; f1: a point light behind the glass left the room black)
  RectAreaLightUniformsLib.init();
  const glow = new THREE.RectAreaLight(0xC8D8FF, 0, sw * 2.2, shh * 2.2); glow.position.set(0, sy, cabD / 2 + 0.03); glow.rotation.y = Math.PI; glow.name = 'arc_tv_glow'; g.add(glow);
  const update = (t = 0) => {
    const i = seq ? seq.update(t) : 0;
    const fr = Math.floor(t * 30 + 1e-6);
    const U = m.userData.crt; U.uCrtT.value = t; U.uCrtFrame.value = fr;
    const e = Math.max(0.2, liveExposure(ctx)); m.emissiveIntensity = 1.15 / e;
    glow.intensity = (0.25 + (seq ? seq.luma[i] : 0.03)) * num(item.glow, 1) * 14.0 / e;   // flickers with the film (f2: at 6 the floor stayed black)
  };
  update(0);
  return { root, radius: cabW, height: elev + cabH + 0.12, update, anchors: { screen: scr }, footprint: [cabW, cabD], snapped: true, contact: true, pitchDark: room && item.dark !== false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.filmstrip
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function buildFilmstrip(kind, item, ctx) {
  const elev = num(item.elev, 1.4);
  const root = rootAt(kind, item, ctx, elev);
  voidDome(root, item, ctx);
  const seq = item.src ? await loadSequence({ src: item.src, fps: 24 }, ctx) : null;
  const NF = clamp(Math.round(num(item.frames, 8)), 2, 16);
  // the atlas: NF frames spread over the sequence, one row
  const cw = 360, chh = 240, [ac, ag] = canvas(cw * NF, chh);
  for (let k = 0; k < NF; k++) {
    if (seq) drawFrame(ag, seq.frames[Math.floor(k * seq.n / NF)], k * cw, 0, cw, chh); else { ag.fillStyle = '#777'; ag.fillRect(k * cw, 0, cw, chh); }
  }
  const atlas = ctex(ac); atlas.anisotropy = 8;
  const sc = clamp(num(item.scale, 8), 1, 40), Wd = 0.035 * sc, pitch = 0.038 * sc, len = clamp(num(item.length, 3), 0.3, 30);   // 135 film: 36 x 24 mm landscape frames along the strip, 8 perforations each
  let pts;
  if (Array.isArray(item.path) && item.path.length >= 2) pts = item.path.map((p) => new THREE.Vector3(+p[0] || 0, +p[1] || 0, +p[2] || 0));
  else if (item.path === 'arc') pts = [...Array(9)].map((_, i) => { const a = (i / 8 - 0.5) * 1.6; return new THREE.Vector3(Math.sin(a) * len / 1.6, 0, -Math.cos(a) * len / 3.2 + len / 3.2); });
  else pts = [...Array(9)].map((_, i) => { const u = i / 8; return new THREE.Vector3((u - 0.5) * len, Math.sin(u * TAU * 0.75) * len * 0.08, Math.sin(u * TAU * 0.5 + 0.6) * len * 0.12); });
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const L = curve.getLength(), NS = Math.max(40, Math.round(L / (pitch * 0.25)));
  const P = [], UV = [], N = [], I = [];
  const up = new THREE.Vector3(0, 1, 0), tw = num(item.twist, 0.6);
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    let side = new THREE.Vector3().crossVectors(tg, up).normalize();
    side.applyAxisAngle(tg, Math.sin(u * Math.PI * 1.5) * tw);
    const nrm = new THREE.Vector3().crossVectors(side, tg).normalize();
    for (const s of [-0.5, 0.5]) { const q = p.clone().addScaledVector(nrm, s * Wd); P.push(q.x, q.y, q.z); UV.push(u * L, s + 0.5); N.push(side.x, side.y, side.z); }
    if (i < NS) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setIndex(I);
  const E = Math.max(0.2, exposureOf(ctx));
  const U = { uFsAtlas: { value: atlas }, uFsN: { value: NF }, uFsPitch: { value: pitch }, uFsOff: { value: 0 }, uFsW: { value: Wd } };
  const m = new THREE.MeshStandardMaterial({ color: 0x0B0906, roughness: 0.25, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 1.0 / E, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 });
  m.userData.progKey = 'f3dFilmstrip';
  patchMaterial(m, (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFsUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\n vFsUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFsUv; uniform sampler2D uFsAtlas; uniform float uFsN; uniform float uFsPitch; uniform float uFsOff; uniform float uFsW;')
      .replace('#include <alphatest_fragment>', `{
        float s = (vFsUv.x + uFsOff) / uFsPitch; float k = floor(s); float f = fract(s); float v = vFsUv.y;
        // sprockets: holes along both edges, 4 per frame pitch
        float sp = fract(s * 8.0);
        bool edgeBand = (v > 0.05 && v < 0.135) || (v > 0.865 && v < 0.95);
        if (edgeBand && sp > 0.3 && sp < 0.7) discard;
        diffuseColor.a = 1.0;
      }
      #include <alphatest_fragment>`)
      .replace('#include <emissivemap_fragment>', `{
        float s = (vFsUv.x + uFsOff) / uFsPitch; float k = mod(floor(s), uFsN); float f = fract(s); float v = vFsUv.y;
        vec2 cell = vec2((f - 0.026) / 0.948, (v - 0.157) / 0.686);          // the frame's x along the strip, its y across (upright)
        float inF = step(0.0, cell.x) * step(cell.x, 1.0) * step(0.0, cell.y) * step(cell.y, 1.0);
        vec3 img = texture2D(uFsAtlas, vec2((k + clamp(cell.x, 0.0, 1.0)) / uFsN, clamp(cell.y, 0.0, 1.0))).rgb;
        float l = dot(img, vec3(0.2126, 0.7152, 0.0722));
        vec3 base = vec3(0.16, 0.1, 0.05);                                   // the amber film base, backlit
        float edge = step(0.93, fract(s * 3.0)) * step(0.012, v) * step(v, 0.036);   // edge code dashes (outside the perforations)
        totalEmissiveRadiance *= mix(base * 0.55, vec3(l) * vec3(1.0, 0.97, 0.9) * 0.95, inF) + vec3(edge) * 0.3;
      }`);
  });
  const strip = new THREE.Mesh(geo, m); strip.name = 'arc_filmstrip'; strip.castShadow = false; strip.userData.noQA = true; root.add(strip);
  const speed = num(item.scroll, 0.12);
  const update = (t = 0) => { U.uFsOff.value = -t * speed; const e = Math.max(0.2, liveExposure(ctx)); m.emissiveIntensity = 1.0 / e; };
  update(0);
  const anchor = new THREE.Object3D(); anchor.position.copy(curve.getPointAt(0.5)); root.add(anchor);
  return { root, radius: L / 2, height: elev + 0.5, update, anchors: { center: anchor }, snapped: true, contact: false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.float — 2.5D parallax photo
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function buildFloat(kind, item, ctx) {
  const elev = num(item.elev, 1.6);
  const root = rootAt(kind, item, ctx, elev);
  voidDome(root, item, ctx);
  const tex = item.src ? await loadImage(item.src, ctx) : null;
  const w = clamp(num(item.w, 1.6), 0.2, 20);
  let nl = clamp(Math.round(num(item.layers, 3)), 2, 4);
  // in an open sky / a lit world (no void) the float is a PRINT that catches the scene's light (review 1: a self-lit,
  // un-tone-mapped photo with feathered edges looked pasted into the dusk sky); in the void it stays the projected memory
  const inVoid = wantsVoid(item, ctx);
  const lit = item.lit ?? !inVoid;
  const E = Math.max(0.2, exposureOf(ctx));
  const img = tex ? tex.image : null;
  const iw = img ? img.naturalWidth : 4, ih = img ? img.naturalHeight : 3, h = w * ih / iw;
  const sep = num(item.sep, w * 0.16), vd = num(item.view_dist, w * 1.6);   // j4: w x 0.08 showed no parallax from 2.5 m
  const grp = new THREE.Group(); root.add(grp);
  const layers = [];
  if (img) {
    const dm = await depthOf(item, img, ctx, 160);
    // a busy photo without a depth PNG is never cut along its content (review 1: ragged layers sliding against each other):
    // two layers, the near one a heavily feathered oval round the subject
    const soft = dm.src === 'flat';
    if (soft) { nl = 2; dm.D = dm.M; }
    const CW = Math.min(1600, iw * 2), CH = Math.round(CW * ih / iw);
    // the print look first (mono, tone, grain)
    const pr = printCanvas(img, { w: CW, border: 0, mono: num(item.mono, 1), contrast: 1.1, age: num(item.age, 0.3), grain: 0.25, seed: 3, aspect: iw / ih });
    const P = pr.canvas;
    // thresholds: layer k shows depth >= th[k] (th[0] = 0: the whole plate)
    const sorted = Array.from(dm.D).sort((a, b) => a - b), q = (f) => sorted[Math.floor(clamp(f, 0, 0.999) * sorted.length)];
    const th = [0]; for (let k = 1; k < nl; k++) th.push(Math.max(0.12, q(0.45 + 0.4 * (k - 1) / Math.max(1, nl - 1))));
    const maskOf = (thr, feather) => {
      const [mc, mg] = canvas(dm.w, dm.h), id = mg.createImageData(dm.w, dm.h);
      for (let i = 0; i < dm.w * dm.h; i++) { const a = smooth((dm.D[i] - thr + feather) / (2 * feather)); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = a * 255; }
      mg.putImageData(id, 0, 0); return mc;
    };
    for (let k = 0; k < nl; k++) {
      const [lc, lg] = canvas(CW, CH);
      if (k === 0) {
        // the plate with the nearest subject filled in (normalised blur of everything outside the dilated subject mask), so a
        // parallax move never shows the subject twice
        lg.drawImage(P, 0, 0);
        const m1 = maskOf(Math.max(0.08, th[1] - 0.06), 0.05);
        const [bc, bgc] = canvas(CW, CH); bgc.drawImage(P, 0, 0); bgc.globalCompositeOperation = 'destination-out'; bgc.drawImage(m1, 0, 0, CW, CH); bgc.globalCompositeOperation = 'source-over';
        const [fc, fg] = canvas(CW, CH); fg.filter = `blur(${Math.round(CW * 0.035)}px)`; fg.drawImage(bc, 0, 0); fg.filter = `blur(${Math.round(CW * 0.012)}px)`; fg.drawImage(bc, 0, 0); fg.filter = 'none';
        const [mm, mmg] = canvas(CW, CH); mmg.drawImage(fc, 0, 0); mmg.globalCompositeOperation = 'destination-in'; mmg.drawImage(m1, 0, 0, CW, CH);
        lg.globalAlpha = 0.92; lg.drawImage(mm, 0, 0); lg.globalAlpha = 1;
      } else {
        lg.drawImage(P, 0, 0); lg.globalCompositeOperation = 'destination-in'; lg.drawImage(maskOf(th[k], soft ? 0.22 : dm.src === 'auto' ? 0.08 : 0.035), 0, 0, CW, CH); lg.globalCompositeOperation = 'source-over';
      }
      // feathered at the image border (`edge`: feather | hard): the photo melts into the void like a memory instead of
      // reading as a card (j4: a flat print turning in black); a cut-out that touches the border fades with it
      const feather = (item.edge ?? (inVoid ? 'feather' : 'hard')) === 'hard' ? 0 : clamp(num(item.feather, 0.09), 0, 0.3);
      if (feather > 0) {
        const fx = CW * feather, fy = CH * feather * CW / CH * 0.8;
        const [fc, fgc] = canvas(CW, CH);
        const gx = fgc.createLinearGradient(0, 0, CW, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(fx / CW, 'rgba(0,0,0,1)'); gx.addColorStop(1 - fx / CW, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
        fgc.fillStyle = gx; fgc.fillRect(0, 0, CW, CH);
        const gy = fgc.createLinearGradient(0, 0, 0, CH); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(Math.min(0.45, fy / CH), 'rgba(0,0,0,1)'); gy.addColorStop(Math.max(0.55, 1 - fy / CH), 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
        fgc.globalCompositeOperation = 'destination-in'; fgc.fillStyle = gy; fgc.fillRect(0, 0, CW, CH);
        lg.globalCompositeOperation = 'destination-in'; lg.drawImage(fc, 0, 0); lg.globalCompositeOperation = 'source-over';
        if (k === 0) { const vg = lg.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.25, CW / 2, CH / 2, Math.hypot(CW, CH) * 0.55); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); lg.globalCompositeOperation = 'source-atop'; lg.fillStyle = vg; lg.fillRect(0, 0, CW, CH); lg.globalCompositeOperation = 'source-over'; }
      }
      const t2 = ctex(lc); t2.anisotropy = 8;
      const z = k * sep, s = (vd - z) / vd;
      const tr = k > 0 || feather > 0;
      const mat = lit ? std({ map: t2, emissive: 0xffffff, emissiveMap: t2, emissiveIntensity: 0.22 / E, roughness: 0.85, transparent: tr, alphaTest: tr ? 0.02 : 0, side: THREE.DoubleSide })
        : new THREE.MeshBasicMaterial({ map: t2, transparent: tr, depthWrite: k === 0, color: new THREE.Color(1, 1, 1).multiplyScalar(1.15 / E), side: THREE.DoubleSide, fog: false, toneMapped: false });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w * s, h * s), mat); pl.position.z = z; pl.renderOrder = 3 + k; pl.name = 'arc_float_layer';
      grp.add(pl); layers.push({ pl, mat, z, s });
    }
    if (item.border ?? !inVoid) {
      const bm = lit ? std({ color: 0xEDE7DA, roughness: 0.9 }) : new THREE.MeshBasicMaterial({ color: new THREE.Color(0.86, 0.83, 0.77).multiplyScalar(1.1 / E), fog: false, toneMapped: false });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.08, h * 1.08 + w * 0.06), bm); b.position.set(0, -w * 0.02, -0.004); grp.add(b);
    }
  } else {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ color: 0x6A6660, roughness: 0.9 })); grp.add(pl);
  }
  const drift = clamp(num(item.drift, 0.5)), breathe = num(item.breathe, layers.length && item.depth === 'auto' ? 0 : 1);
  // faint dust drifting between the camera and the photo, lit by a virtual light above-front (no light is added: the
  // float is self-lit) — the air of a memory, a second moving layer
  const fDust = clamp(num(item.dust, 0.35)), fd = fDust > 0 ? motes(Math.round(150 + 450 * fDust), [w * 1.3, h * 1.4, 1.6], 53, 0xEDE4D4, 'spot') : null;
  const _fl = new THREE.Vector3(), _fc = new THREE.Vector3();
  if (fd) { fd.pts.position.set(0, 0, 0.9); root.add(fd.pts); fd.U.uI.value = 2.5 * fDust / E; fd.U.uSize.value = 0.006; fd.U.uCone.value.set(Math.cos(0.9), Math.cos(0.4)); }
  const update = (t = 0) => {
    if (fd) {
      fd.U.uT.value = t; root.updateMatrixWorld(true);
      root.localToWorld(_fl.set(-w * 0.35, h * 0.9, 1.8)); root.localToWorld(_fc.set(0, 0, 0.6));
      fd.U.uLPos.value.copy(_fl); fd.U.uLDir.value.copy(_fc).sub(_fl).normalize();
      fd.U.uResY.value = ctx.renderer ? ctx.renderer.domElement.height : 1080;
    }
    grp.position.set(Math.sin(t * 0.21 + 0.4) * 0.03 * w * drift, Math.sin(t * 0.17) * 0.02 * w * drift, 0);
    // the nearer layers breathe a little on their own (a second moving layer even on a locked camera)
    for (let k = 1; k < layers.length; k++) layers[k].pl.position.set(Math.sin(t * 0.31 + k * 1.7) * 0.002 * w * drift * k * breathe, Math.sin(t * 0.23 + k) * 0.0013 * w * drift * k * breathe, layers[k].z);   // a third of j5's breath, none on a guessed cut (review 1: layers slid against each other)
    grp.rotation.set(Math.sin(t * 0.13) * 0.02 * drift, Math.sin(t * 0.11 + 1.1) * 0.035 * drift, Math.sin(t * 0.09) * 0.01 * drift);
    if (!lit) { const e = Math.max(0.2, liveExposure(ctx)); for (const L of layers) L.mat.color.setScalar(1.15 / e); }
  };
  update(0);
  return { root, radius: w / 2 + sep * nl, height: elev + h / 2, update, anchors: { center: grp }, snapped: true, contact: false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.relief — the real portrait in relief, lit by a red slit
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// the slit gobo: a soft deep-red glow band round a hotter orange core (fern 0:34: the band is ~1/4 of the face, its edges
// melt, the middle burns hotter). wf = the core's width as a fraction of the gobo; the light colour multiplies it.
function slitTex(soft = 0.02, wf = 0.03) {
  return cached('arc_slit:' + soft + ':' + wf, () => { const S = 512, [c, g] = canvas(S, S); g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    const x0 = S * (0.5 - wf / 2), cw = S * wf;
    g.filter = `blur(${Math.max(2, Math.round(S * soft * 2.2))}px)`; g.fillStyle = 'rgb(160,28,12)'; g.fillRect(x0 - cw * 0.45, S * 0.03, cw * 1.9, S * 0.94);
    g.filter = `blur(${Math.max(1, Math.round(S * soft))}px)`; g.fillStyle = 'rgb(255,92,48)'; g.fillRect(x0, S * 0.04, cw, S * 0.92);
    g.filter = `blur(${Math.max(1, Math.round(S * soft * 0.8))}px)`; g.fillStyle = 'rgb(255,160,110)'; g.fillRect(x0 + cw * 0.32, S * 0.05, cw * 0.36, S * 0.9);   // a warm core, not a white neon tube (j4)
    g.filter = 'none'; return ctex(c, true); });
}
async function buildRelief(kind, item, ctx) {
  const elev = num(item.elev, 1.55);
  const root = rootAt(kind, item, ctx, elev);
  voidDome(root, item, ctx);
  const tex = item.src ? await loadImage(item.src, ctx) : null;
  const img = tex ? tex.image : null;
  const w = clamp(num(item.w, 0.7), 0.1, 6), iw = img ? img.naturalWidth : 3, ih = img ? img.naturalHeight : 4, h = w * ih / iw;
  const E = Math.max(0.2, exposureOf(ctx));
  const grp = new THREE.Group(); root.add(grp);
  const N = 200;
  const dm0 = img ? await depthOf(item, img, ctx, N) : null;
  const flat = !dm0 || dm0.src === 'flat';
  // auto depth is a gentle bas-relief (review 1: w x 0.14 on a heuristic depth made a balloon head); a model / hand
  // depth PNG may go deeper
  const relief = clamp(num(item.relief, flat ? 0 : dm0.src === 'auto' ? w * 0.06 : w * 0.14), 0, w);
  const dm = dm0 ? blurD(dm0, Math.round(clamp(num(item.soften, 0.03), 0, 0.1) * N)) : null;
  // the rim treatment (review 1: the egg-mask outline / the halo cut-out): Mb = the matte blurred over ~10 % of w; the
  // displacement ramps from 0 at the matte's edge to full ~5 % of w inside it (no wall at the outline), the photo fades to
  // black outside it, the band just inside the edge is darkened (edge_dark), and everything outside is cut away (alpha),
  // as is a 4 % border (the plane's edge and its rim never show)
  let Mb = null, rimR = null;
  if (dm) {
    const { w: mw, h: mh } = dm, edgeF = new Float32Array(mw * mh);
    // a bust that runs out of the photo's bottom fades into the dark over its last 12 % (no cut line across the chest)
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const u = x / (mw - 1), v = y / (mh - 1); edgeF[y * mw + x] = smooth((Math.min(u, 1 - u, v) - 0.004) / 0.05) * smooth((1 - v) / 0.12); }
    const M = new Float32Array(mw * mh); for (let i = 0; i < mw * mh; i++) M[i] = dm0.M[i] * edgeF[i];
    Mb = boxBlur(M, mw, mh, Math.max(2, Math.round(mw * num(item.rim_fade, 0.1) / 2)));
    for (let i = 0; i < mw * mh; i++) Mb[i] *= edgeF[i];                                    // after the blur too: the plane's edge is always cut (f1: a soft-keyed flat print showed its side edge)
    rimR = new Float32Array(mw * mh); for (let i = 0; i < mw * mh; i++) rimR[i] = smooth((Mb[i] - 0.5) / 0.5);
  }
  const sampleA = (A, u, v) => sampleD({ D: A, w: dm.w, h: dm.h }, u, v);
  const nx = 220, ny = Math.round(nx * h / w);
  const geo = new THREE.PlaneGeometry(w, h, nx, ny), p = geo.attributes.position, uv = geo.attributes.uv;
  const bg = clamp(num(item.bg, 0.12));
  const curl = flat ? num(item.curl, w * 0.025) : 0;                                     // a flat print bows a little
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i), v = 1 - uv.getY(i);
    const d = dm ? Math.max(0, sampleD(dm, u, v) - bg * 0.5) * sampleA(rimR, u, v) : 0;
    p.setZ(i, relief * d + curl * (1 - Math.pow(2 * u - 1, 2)) * 0.6 + curl * (1 - Math.pow(2 * v - 1, 2)) * 0.4);
  }
  geo.computeVertexNormals();
  // the albedo: the print (mono), black outside the matte and on the rim band and steep walls; alpha = the cut
  let mapT = null;
  if (img) {
    const pr = printCanvas(img, { w: Math.min(1400, iw * 2), border: 0, mono: 1, contrast: num(item.contrast, 1.15), age: 0.15, grain: 0.15, seed: 4, aspect: iw / ih });
    const g = pr.canvas.getContext('2d'), CW = pr.W, CH = pr.H;
    const [mc, mg] = canvas(dm.w, dm.h), id = mg.createImageData(dm.w, dm.h);
    const [ac, ag] = canvas(dm.w, dm.h), ad = ag.createImageData(dm.w, dm.h);
    const W2 = dm.w, edgeK = clamp(num(item.edge_dark, 0.6));
    for (let i = 0; i < dm.w * dm.h; i++) {
      const x = i % W2, y = (i / W2) | 0, D0 = dm.D, R0 = rimR;
      // steep walls of the displaced surface (depth x rim ramp), darkened like occlusion instead of stretched texels
      const dd = (k) => D0[k] * R0[k];
      const gx = (dd(y * W2 + Math.min(W2 - 1, x + 1)) - dd(y * W2 + Math.max(0, x - 1))) * 0.5, gy = (dd(Math.min(dm.h - 1, y + 1) * W2 + x) - dd(Math.max(0, y - 1) * W2 + x)) * 0.5;
      const wall = flat ? 0 : smooth((Math.hypot(gx, gy) * relief / (w * 0.14) - 0.01) / 0.03) * edgeK;
      // black outside the subject and fading to black across the rim zone inside the outline (the hair edge, the ear):
      // the slope where the relief ramps up is never lit as a ring (f2: a lit 'helmet' ring round the head)
      const out = flat ? 1 - smooth((Mb[i] - 0.14) / 0.6) : 1 - smooth((Mb[i] - 0.42) / 0.5);
      const band = 0;
      id.data[i * 4 + 3] = clamp(Math.max(out * clamp(num(item.bg_dark, 1)), wall, band)) * 255;
      // the cut lies where the albedo is already fully black (f2: a bright key lifted the last 6 % of the photo into a
      // visible oval edge)
      ad.data[i * 4] = ad.data[i * 4 + 1] = ad.data[i * 4 + 2] = 255; ad.data[i * 4 + 3] = smooth((Mb[i] - (flat ? 0.08 : 0.3)) / 0.1) * 255;
    }
    mg.putImageData(id, 0, 0); ag.putImageData(ad, 0, 0);
    g.drawImage(mc, 0, 0, CW, CH);                                                          // black over the background
    g.globalCompositeOperation = 'destination-in'; g.drawImage(ac, 0, 0, CW, CH); g.globalCompositeOperation = 'source-over';   // the cut (alpha)
    mapT = ctex(pr.canvas); mapT.anisotropy = 8;
  }
  const mat = std({ map: mapT, color: img ? 0xffffff : 0x777777, roughness: 0.78, metalness: 0, envMapIntensity: 0.03, alphaTest: img ? 0.04 : 0, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'arc_relief'; grp.add(mesh);
  // the key: a slit gobo spot sliding across (fern's red slit), or a soft key; plus an optional cool rim from behind
  const key = String(item.key || 'slit');
  let spot = null, rim = null;
  const faceY = h / 2 - num(item.head?.[1], 0.3) * h;
  const hx0 = (num(item.head?.[0], 0.5) - 0.5) * w, sweep = Array.isArray(item.slit_sweep) ? item.slit_sweep.map(Number) : [hx0 - w * 0.08, hx0 + w * 0.06];   // default: across the face, not its outline
  const st = Array.isArray(item.slit_t) ? item.slit_t.map(Number) : [0, num(ctx.dur, 8)];
  const sd = 2.4;
  if (key !== 'none') {
    const col = new THREE.Color(item.slit_color || (key === 'slit' ? '#FF7048' : '#FFE0C0'));
    spot = new THREE.SpotLight(col, 1, 0, key === 'slit' ? Math.atan(w * 0.65 / sd) : 26 * DEG, key === 'slit' ? 0 : 0.8, 2);   // +-0.65 w round the face (j8: a wider cone softened the band over the whole face and outlined the head)
    if (key === 'slit') { const gob = 2 * w * 0.65; spot.map = slitTex(clamp(num(item.slit_soft, 0.02), 0.002, 0.08), clamp(num(item.slit_w, w * 0.07) / gob, 0.01, 0.3)); }
    spot.position.set(-w * 0.12, relief + w * 0.12, sd); spot.target.position.set(0, 0, 0);   // nearly frontal: the slit lays a stripe, it does not rake the outline
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.camera.near = 0.5; spot.shadow.camera.far = sd + 2; spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.004;
    spot.userData.noGovern = true; spot.userData.keepHue = true; spot.name = 'arc_slit';
    // a lit print (albedo ~0.6 at the cheek) lands near 1.1 exposed inside the slit
    spot.intensity = num(item.slit_level, 1.25) / E * Math.PI * sd * sd / 0.55 * (key === 'slit' ? 1.6 : 1);   // the gobo core passes ~0.6 of the light
    grp.add(spot, spot.target);
  }
  // a very dim warm fill from the key's side: outside the slit the face and the uniform stay barely readable (fern)
  const fillK = num(item.fill, key === 'slit' ? 0.06 : 0);   // 0.06 (review 1: p90 7, too_dark in every frame)
  if (fillK > 0) {
    const fl = new THREE.SpotLight(key === 'slit' ? 0xFF5030 : 0xFFE0C0, fillK / E * Math.PI * 2.6 * 2.6 / 0.55, 0, 34 * DEG, 1, 2);
    fl.position.set(-w * 1.1, relief + w * 0.5, 2.2); fl.target.position.set(0, 0, 0); fl.userData.noGovern = true; fl.userData.keepHue = true; fl.name = 'arc_fill';
    grp.add(fl, fl.target);
  }
  if (num(item.rim, key === 'slit' ? 0 : 0.25) > 0) {
    rim = new THREE.SpotLight(0x5C7CFF, num(item.rim, 0.25) * 0.9 / E * Math.PI * 1.6 * 1.6, 0, 30 * DEG, 0.9, 2);
    rim.position.set(w * 1.5, w * 0.5, -0.35); rim.target.position.set(0, 0, relief * 0.5); rim.userData.noGovern = true; rim.name = 'arc_rim';   // grazing from the side-back: a thin cool edge on the far cheek and shoulder
    grp.add(rim, rim.target);
  }
  const face = new THREE.Object3D(); face.position.set(num(item.head?.[0], 0.5) * w - w / 2, h / 2 - num(item.head?.[1], 0.3) * h, relief * 0.8); grp.add(face);
  // haze in the slit (review 1: a near-static shot with no atmosphere): dust motes drifting through the band glow in its
  // colour as they cross it, a second moving layer between the lens and the face (`haze: 0` turns it off)
  const hazeK = key === 'slit' ? clamp(num(item.haze, 0.6)) : 0;
  const hz = hazeK > 0 ? motes(Math.round(260 + 420 * hazeK), [w * 1.5, h * 1.15, 1.2], 59, item.slit_color || '#FF7048', 'slab') : null;
  if (hz) { hz.pts.position.set(0, 0, relief + 0.62); grp.add(hz.pts); hz.U.uSize.value = 0.0042; hz.U.uI.value = 0.55 * hazeK / E; hz.U.uK.value = num(item.slit_w, w * 0.07) * 0.75 / sd; }
  const _hp = new THREE.Vector3(), _ht = new THREE.Vector3();
  const update = (t = 0) => {
    if (spot && key === 'slit') {
      const u = smooth((t - st[0]) / Math.max(0.1, st[1] - st[0]));     // smoothstep: peak 1.5 x the mean speed
      const x = lerp(sweep[0], sweep[1], u);
      spot.target.position.set(x, faceY, 0); spot.target.updateMatrixWorld();   // centred on the face: the slit's ends fall above the head and below the chest (j7: the top end drew an arc on the hair)
    }
    grp.rotation.y = Math.sin(t * 0.12) * 0.015;               // a breath of movement in the void
    if (hz && spot) {
      grp.updateMatrixWorld(true); spot.getWorldPosition(_hp); spot.target.getWorldPosition(_ht);
      hz.U.uT.value = t; hz.U.uLPos.value.copy(_hp); hz.U.uLDir.value.copy(_ht).sub(_hp).normalize();
      hz.U.uN.value.crossVectors(hz.U.uLDir.value, new THREE.Vector3(0, 1, 0)).normalize();
      hz.U.uResY.value = ctx.renderer ? ctx.renderer.domElement.height : 1080;
    }
  };
  update(0);
  return { root, radius: Math.max(w, h) / 2 + 0.2, height: elev + h / 2, update, anchors: { center: grp, face }, snapped: true, contact: false, pitchDark: item.dark !== false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// archive.paper_label — the typed strip as an object
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function buildPaperLabel(kind, item, ctx) {
  const elev = num(item.elev, 0.76);
  const root = rootAt(kind, item, ctx, elev);
  const tIn = num(item.t_in, null);
  const S = makeStrip({ text: item.text ?? '', text2: item.text2 ?? null, font: item.font === 'typewriter' ? 'typewriter' : 'courier', t_in: tIn, decode: num(item.decode, 0.45), seed: num(item.seed, 9), align: item.text2 ? 'left' : 'center', shadow: 0 });
  const capM = num(item.h, 0.012), Hm = capM * S.H / S.capPx, Wm = Hm * S.W / S.H;
  const m = std({ map: S.texture, roughness: 0.88, transparent: true, alphaTest: 0.02 });
  const g = new THREE.PlaneGeometry(Wm, Hm, 12, 2); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, 0.0006 * Math.sin(pos.getX(i) / Wm * 3.0 + 0.7));
  g.computeVertexNormals();
  const pl = new THREE.Mesh(g, m); pl.receiveShadow = true; pl.castShadow = true;
  const tilt = num(item.tilt, 0) * DEG; const piv = new THREE.Group(); piv.rotation.x = tilt; piv.position.y = 0.0008; piv.add(pl); root.add(piv);
  const cs = contactRect(Wm * 0.95, Hm * 0.7, 0.35); cs.position.y = 0.0003; if (!tilt) root.add(cs);
  const update = (t = 0) => { S.paint(t); };
  update(0);
  return { root, radius: Wm / 2, height: 0.01 + Hm * Math.sin(tilt), update, anchors: { center: piv }, snapped: true, contact: false };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const BUILD = {
  'archive.photo': buildPhoto, 'archive.desk': buildDesk, 'archive.wall': buildWall, 'archive.frame': buildFrame,
  'archive.projector': buildProjector, 'archive.screen': buildScreen, 'archive.tv': buildTV, 'archive.filmstrip': buildFilmstrip,
  'archive.float': buildFloat, 'archive.relief': buildRelief, 'archive.paper_label': buildPaperLabel,
};
export async function build(kind, item = {}, ctx = {}) {
  const f = BUILD[kind];
  if (!f) throw new Error('archive: unknown kind ' + kind);
  const res = await f(kind, item, ctx);
  // a set with a shadowed spot fixes the log-depth shadow pass for every caster in the scene on its first update (the
  // registry settles every item at t = 0 after all are built, so the other builders' casters are included)
  let spotShadow = false;
  res.root.traverse((o) => { if (o.isSpotLight && o.castShadow) spotShadow = true; });
  if (spotShadow && res.update) { const u = res.update; res.update = (t, clock, camera) => { if (ctx.scene) noLogShadows(ctx.scene); return u(t, clock, camera); }; }
  res.root.traverse((o) => { if (o.material && !Array.isArray(o.material) && !o.material.isShaderMaterial && ctx.patch) { try { ctx.patch(o.material); } catch (e) { /* */ } } });
  return res;
}
