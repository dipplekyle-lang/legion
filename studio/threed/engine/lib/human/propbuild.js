// propbuild.js — prop.build: the GENERIC PROP BUILDER (E1 specificity kit, 2026-09-29). The safety net of the director:
// whatever the narration names (a syringe, a padlock, a crossbow, a bamboo cage, a spiked mace...) is built from a
// RECIPE of primitives with material presets, groups with pivots, simple animations on cue times, an optional light
// (spot / point, with a visible beam cone) and a placement (on the ground, in a figure's hand, on another item).
// Named recipes (PRESETS) are built in: pistol_m1911, rifle_m16, rifle_ak47, grenade (M26), grenade_mk2, flashlight,
// flashlight_angle, syringe, field_phone, padlock, crossbow, bamboo_cage, spiked_mace, scalpel, forceps, and more; the
// kinds prop.pistol / prop.rifle / prop.grenade / prop.flashlight are those presets.
//
// Recipe contract (everything in metres, degrees, seconds; +Y up, +Z = the prop's FRONT, the side a heading looks to):
//   parts: [ Part ... ]      Part = { shape, mat, color?, id?, pos?, rot?, scale?, ...shape params, repeat? | ring? | sphere? | grid? }
//     box        size [w, h, d], bevel r (rounded edges)
//     cylinder   r (or [r_top, r_bottom]), h, seg, axis 'y'|'x'|'z' | from [x,y,z] + to [x,y,z], open
//     cone       r, h (base at -h/2, tip at +h/2 along the axis) | from (base) + to (tip)
//     sphere     r, seg, (scale [sx, sy, sz] squashes it)
//     capsule    r, h (the straight part), axis | from + to
//     torus      r (ring radius), tube, arc deg (360), seg
//     lathe      points [[r, y], ...] (a profile revolved around Y), seg
//     tube       points [[x, y, z], ...] (a smooth curve), r, seg, closed
//     extrude    outline [[x, y], ...] (a 2D outline in the XY plane), depth (along +Z, centred), bevel, holes, axis 'y' = lying flat
//     plane      size [w, h] (two-sided sheet in the XY plane)
//     pole       from + to, r, nodes (m between bamboo nodes, 0 = none): a bamboo / wooden pole
//     rope       from + to, r, sag (m): a hanging rope (catenary-like), or points [[x,y,z]...]
//     spike      r, h: a cone standing on its base (base at y 0, sharp tip at y h), or from (base) + to (tip)
//     group      id, pivot [x, y, z] (the rotation centre, in the prop's coordinates), parts [...]
//   repeat {n, step [x,y,z], rot_step [x,y,z]}, ring {n, r, axis 'y', start deg, arc deg, face 'out'|'none'},
//   sphere {n, r} (Fibonacci points, each copy's +Y pointing outward: spikes on a ball), grid {n [nx, nz], step [sx, sz]},
//   jitter {pos m, rot deg, seed}: copies of the part.
//   mat: metal steel gunmetal chrome brass copper gold iron wood dark_wood bamboo rope cloth canvas rubber plastic olive
//        glass rust bone leather paper stone earth ceramic white black light (emissive) — or any, with color '#hex'.
//        Per part: roughness, metalness, emissive '#hex', glow (emissive strength), opacity.
//   anim: [ {part: id, type, ...} ]
//     rotate    axis, keys [[t, deg], ...], ease smooth|linear|in|out|snap
//     translate keys [[t, [x, y, z]], ...]
//     open      axis, angle deg, t, dur (a lid / door / trapdoor)
//     spring    axis, from deg, to deg (0), t (release), freq Hz (2.2), damp (3.5): a sprung arm snapping over
//     pendulum  axis, from deg, length m (sets the swing rate), t (release), damp (0.35)
//     swing     axis, amp deg, freq Hz, damp, t: a free swing from rest
//     fall      t, drop m (default: down to the ground), g 9.81, bounce 0.25, spin [x, y, z] deg/s
//     shake     t [t0, t1], amp m, rot deg, freq Hz
//     spin      axis, rate deg/s, t (eases in)
//     show/hide t, dur (a scale fade, never a pop)
//   light: {type spot|point, pos, dir [x,y,z] | target, angle deg (half-angle, 18), penumbra, color, intensity, range,
//           cone true (a visible beam), beam (0.35 cone strength), shadow true, on true | [t0, t1], flicker 0..1, part id}
//   anchors: {name: [x, y, z]} (+ top, center, base, front automatically): camera targets 'objects:N.name', labels `on`.
// Placement: at + heading on the ground (the lowest point is set on the ground: nothing floats or sinks; `sink` m buries
// the base, `elev` m lifts it onto something), or hold {who 'ref:NAME' | 'cast:0' | 'objects:N', hand right|left}: the
// recipe's origin is gripped in the fist, its +Z points along the fingers (the barrel / beam direction), its +Y out of
// the thumb side (the top of the slide); or on 'objects:N' | 'structures:N.anchor' (+ offset [x, y, z]).
// size: the largest dimension in metres (scales the recipe uniformly). Everything is a pure function of t.
import * as THREE from 'three';
import { makeScopeFace } from './crtscope.js';
import { plain } from '../shared/materials.js';
import * as R from './rig.js';
import { ground, xz, yawFromHeading, DEG, patchAll } from './common.js';
import { clamp, lerp } from '../shared/util.js';
import { makeBlast } from './blast.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PI = Math.PI, TAU = PI * 2;
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const arr3 = (v, d = [0, 0, 0]) => (Array.isArray(v) && v.length >= 3 ? [num(v[0], d[0]), num(v[1], d[1]), num(v[2], d[2])] : Array.isArray(v) && v.length === 2 ? [num(v[0], d[0]), d[1], num(v[1], d[2])] : typeof v === 'number' ? [v, v, v] : d.slice());
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const EASE = { smooth: sm, linear: (x) => clamp(x), in: (x) => { x = clamp(x); return x * x; }, out: (x) => { x = clamp(x); return 1 - (1 - x) * (1 - x); }, snap: smr };
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// ── procedural textures (small, cached) ───────────────────────────────────────────────────────────────────────────
const TEX = {};
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texOf(kind) {
  if (TEX[kind]) return TEX[kind];
  const W = 256, c = cv(W, W), g = c.getContext('2d'), id = g.createImageData(W, W), d = id.data;
  const nz = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const h = (a, b) => hash(((a % 64) + 64) % 64 * 97 + (((b % 64) + 64) % 64) * 31, s); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / W; let k = 1;
    if (kind === 'wood') { const w = nz(u * 4, v * 40, 1) * 0.6 + nz(u * 12, v * 90, 2) * 0.4; const ring = 0.5 + 0.5 * Math.sin((u * 26 + w * 3.2) * PI); k = 0.8 + 0.2 * ring - 0.1 * nz(u * 30, v * 3, 3); }
    else if (kind === 'bamboo') { k = 0.9 + 0.08 * nz(u * 60, v * 3, 4) + 0.05 * nz(u * 8, v * 1.5, 5) - 0.08 * Math.pow(nz(u * 140, v * 6, 6), 3); }
    else if (kind === 'rope') { const s = (u * 6 + v * 2) % 1; k = 0.72 + 0.28 * Math.sin(s * PI) + 0.06 * (nz(u * 80, v * 80, 7) - 0.5); }
    else if (kind === 'weave') { const a = Math.sin(u * W * PI * 0.5), b = Math.sin(v * W * PI * 0.5); k = 0.88 + 0.06 * a * b + 0.08 * (nz(u * 16, v * 16, 8) - 0.5); }
    else if (kind === 'rust') { const n = nz(u * 8, v * 8, 9) * 0.6 + nz(u * 32, v * 32, 10) * 0.4; k = 0.7 + 0.45 * n; }
    else if (kind === 'earth') { const n = nz(u * 10, v * 10, 11) * 0.5 + nz(u * 40, v * 40, 12) * 0.3 + nz(u * 120, v * 120, 13) * 0.2; k = 0.72 + 0.5 * n; }
    const i = (y * W + x) * 4, val = clamp(k, 0, 1.2) * 212; d[i] = d[i + 1] = d[i + 2] = Math.min(255, val); d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TEX[kind] = t);
}

// ── material presets ───────────────────────────────────────────────────────────────────────────────────────────
const DS = THREE.DoubleSide;
export const MAT_PRESETS = {
  metal: { color: 0x9EA2A6, roughness: 0.32, metalness: 0.9 },
  steel: { color: 0x9EA2A6, roughness: 0.32, metalness: 0.9 },
  gunmetal: { color: 0x2B2D30, roughness: 0.4, metalness: 0.82 },
  chrome: { color: 0xE4E6E8, roughness: 0.1, metalness: 1 },
  brass: { color: 0xB8903F, roughness: 0.28, metalness: 0.95 },
  copper: { color: 0xB8643C, roughness: 0.32, metalness: 0.95 },
  gold: { color: 0xD4A845, roughness: 0.25, metalness: 1 },
  iron: { color: 0x3C3a37, roughness: 0.72, metalness: 0.7 },
  wood: { color: 0x6E5238, roughness: 0.72, tex: 'wood' },
  dark_wood: { color: 0x4A2E1A, roughness: 0.62, tex: 'wood' },
  bamboo: { color: 0x9E8C58, roughness: 0.6, tex: 'bamboo' },
  rope: { color: 0x9E875E, roughness: 0.95, tex: 'rope', lambert: true },
  cloth: { color: 0x8C877C, roughness: 0.95, tex: 'weave', side: DS },
  canvas: { color: 0x6B6848, roughness: 0.96, tex: 'weave', side: DS },
  rubber: { color: 0x1D1D1F, roughness: 0.82 },
  plastic: { color: 0x2E3236, roughness: 0.45 },
  olive: { color: 0x4B5232, roughness: 0.62, metalness: 0.25 },
  glass: { color: 0xD6E4EA, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.28, depthWrite: false, side: DS },
  rust: { color: 0x6E3E22, roughness: 0.92, metalness: 0.3, tex: 'rust' },
  bone: { color: 0xE8DDC5, roughness: 0.55 },
  leather: { color: 0x5A3A22, roughness: 0.6 },
  paper: { color: 0xEFEAD8, roughness: 0.9, side: DS },
  stone: { color: 0x8A857C, roughness: 0.9, tex: 'earth' },
  earth: { color: 0x5E4630, roughness: 1, tex: 'earth' },
  ceramic: { color: 0xF2F0EA, roughness: 0.25 },
  white: { color: 0xEEEEEA, roughness: 0.5 },
  black: { color: 0x141414, roughness: 0.6 },
  light: { color: 0xFFF3D6, emissive: 0xFFE7B0, emissiveIntensity: 4, roughness: 0.3 },
};
const MAT_ALIAS = { emissive: 'light', glow: 'light', bulb: 'light', lamp: 'light', blued: 'gunmetal', gun: 'gunmetal', aluminium: 'metal', aluminum: 'metal', silver: 'chrome', timber: 'wood', soil: 'earth', dirt: 'earth', mud: 'earth', fabric: 'cloth', cotton: 'cloth', linen: 'cloth', tarp: 'canvas', porcelain: 'ceramic', ivory: 'bone', string: 'rope', twine: 'rope', vine: 'rope', bronze: 'brass', paint: 'olive', army: 'olive', steel_dark: 'gunmetal' };
const MCACHE = new Map();
const hexOf = (v, d) => { if (v == null) return d; if (typeof v === 'number') return v; const s = String(v).trim(); if (/^#?[0-9a-f]{6}$/i.test(s)) return parseInt(s.replace('#', ''), 16); try { return new THREE.Color(s).getHex(); } catch (e) { return d; } };
export function matOf(p = {}, warn = () => {}) {
  let name = String(p.mat || p.material || 'metal').toLowerCase();
  if (MAT_ALIAS[name]) name = MAT_ALIAS[name];
  if (!MAT_PRESETS[name]) { warn(`prop.build: material '${p.mat}' unknown -> metal`); name = 'metal'; }
  const P = MAT_PRESETS[name];
  const color = hexOf(p.color, P.color), rough = num(p.roughness, P.roughness), metal = num(p.metalness, P.metalness ?? 0);
  // mat light with a colour glows IN that colour (a dim green CRT '#0d3a1e' was a warm-white x4 disc: the e2e glow balls)
  const emi = p.emissive != null ? hexOf(p.emissive, 0) : (name === 'light' && p.color != null ? color : P.emissive), glow = num(p.glow, P.emissiveIntensity ?? (p.emissive != null ? 2 : 0));
  const op = num(p.opacity, P.opacity ?? 1);
  const key = [name, color, rough, metal, emi, glow, op].join('|');
  if (MCACHE.has(key)) return MCACHE.get(key);
  const o = { color, roughness: rough, metalness: metal };
  if (P.tex) o.map = texOf(P.tex);
  if (emi != null && glow > 0) { o.emissive = new THREE.Color(emi); o.emissiveIntensity = glow; }
  if (op < 1) { o.transparent = true; o.opacity = op; o.depthWrite = false; }
  if (P.transparent) { o.transparent = true; o.opacity = op < 1 ? op : P.opacity; o.depthWrite = false; }
  if (P.side) o.side = P.side;
  let m;
  if (P.lambert) { const l = { color, map: o.map }; m = new THREE.MeshLambertMaterial(l); }
  else m = plain(o);
  m.name = 'prop:' + name;
  MCACHE.set(key, m);
  return m;
}

// ── geometry ────────────────────────────────────────────────────────────────────────────────────────────────────
const _q = new THREE.Quaternion();
function alongAxis(g, axis) {                // geometries are authored along +Y
  const a = String(axis || 'y').toLowerCase();
  if (a === 'x') g.rotateZ(-PI / 2); else if (a === 'z') g.rotateX(PI / 2);
  else if (Array.isArray(axis) && axis.length === 3) g.applyQuaternion(_q.setFromUnitVectors(V3(0, 1, 0), V3(...axis.map(Number)).normalize()));
  return g;
}
function between(g, a, b) {                  // a +Y geometry of unit-free length, centred -> placed from a to b
  const A = V3(...a), B = V3(...b), d = B.clone().sub(A), L = d.length();
  if (L > 1e-6) g.applyQuaternion(_q.setFromUnitVectors(V3(0, 1, 0), d.normalize()));
  const m = A.clone().add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
}
function catenary(a, b, sag, n = 24) {
  const A = V3(...a), B = V3(...b), pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, p = A.clone().lerp(B, u); p.y -= sag * 4 * u * (1 - u); pts.push(p); }
  return pts;
}
function geomOf(p, warn) {
  const s = String(p.shape || p.type || 'box').toLowerCase(), seg = Math.round(clamp(num(p.seg, 18), 3, 64));
  const hasFT = Array.isArray(p.from) && Array.isArray(p.to);
  const lenFT = hasFT ? V3(...arr3(p.from)).distanceTo(V3(...arr3(p.to))) : 0;
  switch (s) {
    case 'box': case 'cube': {
      const sz = arr3(p.size, [0.1, 0.1, 0.1]).map((v) => Math.max(0.0005, Math.abs(v)));
      const b = Math.max(num(p.bevel, 0), 0.0004);          // rbox: UVs in metres (the grain of wood has a real scale)
      return R.rbox(sz[0], sz[1], sz[2], Math.min(b, Math.min(...sz) * 0.49), 1);
    }
    case 'cylinder': case 'cyl': case 'tube_straight': case 'rod': {
      const r = Array.isArray(p.r) ? p.r : [num(p.r, 0.05), num(p.r, 0.05)], h = hasFT ? lenFT : num(p.h, 0.2);
      const g = new THREE.CylinderGeometry(Math.max(0.0005, num(r[0], 0.05)), Math.max(0.0005, num(r[1], r[0])), Math.max(0.0005, h), seg, 1, !!p.open);
      return hasFT ? between(g, arr3(p.from), arr3(p.to)) : alongAxis(g, p.axis);
    }
    case 'cone': {
      const h = hasFT ? lenFT : num(p.h, 0.2), g = new THREE.ConeGeometry(Math.max(0.0005, num(p.r, 0.05)), Math.max(0.0005, h), seg, 1, !!p.open);
      return hasFT ? between(g, arr3(p.from), arr3(p.to)) : alongAxis(g, p.axis);
    }
    case 'spike': {
      const h = hasFT ? lenFT : num(p.h, 0.3), g = new THREE.ConeGeometry(Math.max(0.0005, num(p.r, 0.012)), Math.max(0.001, h), Math.max(5, Math.min(seg, 10)));
      if (hasFT) return between(g, arr3(p.from), arr3(p.to));
      g.translate(0, h / 2, 0); return alongAxis(g, p.axis);
    }
    case 'sphere': case 'ball': {
      const g = new THREE.SphereGeometry(Math.max(0.0005, num(p.r, 0.05)), seg + 6, Math.max(4, Math.round((seg + 6) * 0.6)), 0, TAU, 0, num(p.theta, 180) * DEG);
      return g;
    }
    case 'capsule': {
      const r = Math.max(0.0005, num(p.r, 0.03)), h = hasFT ? Math.max(0.0005, lenFT - 2 * r) : Math.max(0.0005, num(p.h, 0.1));
      const g = new THREE.CapsuleGeometry(r, h, 4, seg);
      return hasFT ? between(g, arr3(p.from), arr3(p.to)) : alongAxis(g, p.axis);
    }
    case 'torus': case 'ring': {
      const g = new THREE.TorusGeometry(Math.max(0.0005, num(p.r, 0.05)), Math.max(0.0003, num(p.tube, 0.008)), Math.max(4, Math.round(seg / 2)), seg * 2, num(p.arc, 360) * DEG);
      return alongAxis(g, p.axis || 'z');       // default: the ring lies in the XY plane (its hole along Z)
    }
    case 'lathe': {
      const pts = (Array.isArray(p.points) ? p.points : []).filter((q) => Array.isArray(q) && q.length >= 2).map((q) => new THREE.Vector2(Math.max(0, +q[0] || 0), +q[1] || 0));
      if (pts.length < 2) { warn('prop.build: lathe needs points [[r, y], ...]'); return new THREE.SphereGeometry(0.05, 12, 8); }
      return alongAxis(new THREE.LatheGeometry(pts, seg + 6), p.axis);
    }
    case 'tube': case 'curve': case 'wire': {
      const pts = (Array.isArray(p.points) ? p.points : []).filter((q) => Array.isArray(q) && q.length >= 3).map((q) => V3(+q[0] || 0, +q[1] || 0, +q[2] || 0));
      if (pts.length < 2) { warn('prop.build: tube needs points [[x, y, z], ...]'); return new THREE.SphereGeometry(0.02, 8, 6); }
      const c = new THREE.CatmullRomCurve3(pts, !!p.closed, 'centripetal');
      return new THREE.TubeGeometry(c, Math.max(8, pts.length * 12), Math.max(0.0005, num(p.r, 0.01)), Math.max(4, Math.min(seg, 12)), !!p.closed);
    }
    case 'rope': case 'cord': case 'string': {
      let pts;
      if (Array.isArray(p.points) && p.points.length >= 2) pts = p.points.map((q) => V3(...arr3(q)));
      else if (hasFT) pts = catenary(arr3(p.from), arr3(p.to), num(p.sag, 0.05 * lenFT));
      else { warn('prop.build: rope needs from + to (or points)'); return new THREE.SphereGeometry(0.01, 6, 4); }
      const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const g = new THREE.TubeGeometry(c, Math.max(12, pts.length * 3), Math.max(0.0008, num(p.r, 0.008)), 6, false);
      return g;
    }
    case 'extrude': case 'shape2d': {
      const outl = (Array.isArray(p.shape2d) ? p.shape2d : Array.isArray(p.outline) ? p.outline : Array.isArray(p.points) ? p.points : []).filter((q) => Array.isArray(q) && q.length >= 2);
      if (outl.length < 3) { warn('prop.build: extrude needs outline [[x, y], ...] (3+ points)'); return new THREE.BoxGeometry(0.05, 0.05, 0.05); }
      const sh = new THREE.Shape(outl.map((q) => new THREE.Vector2(+q[0], +q[1])));
      for (const h of (Array.isArray(p.holes) ? p.holes : [])) if (Array.isArray(h) && h.length >= 3) sh.holes.push(new THREE.Path(h.map((q) => new THREE.Vector2(+q[0], +q[1]))));
      const depth = Math.max(0.0005, num(p.depth, 0.02)), bv = num(p.bevel, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 10 });
      g.translate(0, 0, -depth / 2);
      if (p.axis && String(p.axis).toLowerCase() === 'y') g.rotateX(-PI / 2);       // lying flat, the outline in XZ
      else if (p.axis && String(p.axis).toLowerCase() === 'x') g.rotateY(PI / 2);
      return g;
    }
    case 'plane': case 'sheet': {
      const sz = Array.isArray(p.size) ? p.size : [0.2, 0.2];
      const g = new THREE.PlaneGeometry(Math.max(0.001, +sz[0] || 0.2), Math.max(0.001, +sz[1] || 0.2));
      if (String(p.axis || '').toLowerCase() === 'y') g.rotateX(-PI / 2); else if (String(p.axis || '').toLowerCase() === 'x') g.rotateY(PI / 2);
      return g;
    }
    case 'pole': case 'bamboo': case 'post': {
      const a = hasFT ? arr3(p.from) : [0, 0, 0], b = hasFT ? arr3(p.to) : [0, num(p.h, 1.5), 0];
      const r = Math.max(0.002, num(p.r, 0.025)), L = V3(...a).distanceTo(V3(...b));
      const parts = [between(new THREE.CylinderGeometry(r * 0.97, r, L, Math.max(6, Math.min(seg, 14)), 1), a, b)];
      const nodes = num(p.nodes, s === 'bamboo' || /bamboo/.test(String(p.mat || '')) ? 0.32 : 0);
      if (nodes > 0.05) {
        const n = Math.floor(L / nodes);
        for (let i = 1; i <= n; i++) { const u = (i * nodes - 0.07 * nodes) / L; if (u >= 0.98) break; const c = V3(...a).lerp(V3(...b), u); parts.push(between(new THREE.CylinderGeometry(r * 1.07, r * 1.07, r * 0.35, Math.max(6, Math.min(seg, 14)), 1), c.toArray(), c.clone().add(V3(...b).sub(V3(...a)).normalize().multiplyScalar(r * 0.35)).toArray())); }
      }
      return parts.length > 1 ? mergeGeos(parts) : parts[0];
    }
    default:
      warn(`prop.build: shape '${p.shape}' unknown -> box`);
      return new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }
}
function mergeGeos(list) {
  const nonIdx = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of nonIdx) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2); let o = 0;
  for (const g of nonIdx) {
    if (!g.attributes.normal) g.computeVertexNormals();
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) UV.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  return out;
}

// copies of a part: repeat / ring / sphere / grid (+ jitter) -> list of Matrix4 (applied before the part's own transform)
function copiesOf(p) {
  const out = [];
  const jit = p.jitter || null, js = num(jit?.seed, 7), jp = num(jit?.pos, 0), jr = num(jit?.rot, 0) * DEG;
  const jm = (i) => { if (!jit) return new THREE.Matrix4(); return new THREE.Matrix4().compose(V3((hash(i, js) - 0.5) * 2 * jp, (hash(i, js + 1) - 0.5) * 2 * jp * 0.3, (hash(i, js + 2) - 0.5) * 2 * jp), new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(i, js + 3) - 0.5) * 2 * jr, (hash(i, js + 4) - 0.5) * 2 * jr, (hash(i, js + 5) - 0.5) * 2 * jr)), V3(1, 1, 1)); };
  if (p.repeat && typeof p.repeat === 'object') {
    const n = Math.round(clamp(num(p.repeat.n, 2), 1, 400)), st = arr3(p.repeat.step, [0.1, 0, 0]), rs = arr3(p.repeat.rot_step, [0, 0, 0]).map((v) => v * DEG);
    for (let i = 0; i < n; i++) out.push(new THREE.Matrix4().compose(V3(st[0] * i, st[1] * i, st[2] * i), new THREE.Quaternion().setFromEuler(new THREE.Euler(rs[0] * i, rs[1] * i, rs[2] * i)), V3(1, 1, 1)).multiply(jm(i)));
  } else if (p.ring && typeof p.ring === 'object') {
    const n = Math.round(clamp(num(p.ring.n, 8), 1, 400)), r = num(p.ring.r, 0.1), a0 = num(p.ring.start, 0) * DEG, arc = num(p.ring.arc, 360) * DEG, ax = String(p.ring.axis || 'y').toLowerCase();
    const full = Math.abs(arc - TAU) < 1e-3;
    for (let i = 0; i < n; i++) {
      const a = a0 + arc * (full ? i / n : n > 1 ? i / (n - 1) : 0), c = Math.cos(a), s = Math.sin(a);
      let pos, q = new THREE.Quaternion();
      if (ax === 'y') { pos = V3(c * r, 0, s * r); if (p.ring.face !== 'none') q.setFromAxisAngle(V3(0, 1, 0), -a); }
      else if (ax === 'x') { pos = V3(0, c * r, s * r); if (p.ring.face !== 'none') q.setFromAxisAngle(V3(1, 0, 0), a); }
      else { pos = V3(c * r, s * r, 0); if (p.ring.face !== 'none') q.setFromAxisAngle(V3(0, 0, 1), a - PI / 2); }
      out.push(new THREE.Matrix4().compose(pos, q, V3(1, 1, 1)).multiply(jm(i)));
    }
  } else if (p.sphere && typeof p.sphere === 'object') {
    const n = Math.round(clamp(num(p.sphere.n, 20), 1, 400)), r = num(p.sphere.r, 0.1), ga = PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), th = ga * i, d = V3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      out.push(new THREE.Matrix4().compose(d.clone().multiplyScalar(r), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d), V3(1, 1, 1)).multiply(jm(i)));
    }
  } else if (p.grid && typeof p.grid === 'object') {
    const n = Array.isArray(p.grid.n) ? p.grid.n : [num(p.grid.n, 3), num(p.grid.n, 3)], st = Array.isArray(p.grid.step) ? p.grid.step : [0.2, 0.2];
    const nx = Math.round(clamp(num(n[0], 3), 1, 60)), nz = Math.round(clamp(num(n[1], 3), 1, 60));
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) out.push(new THREE.Matrix4().makeTranslation((i - (nx - 1) / 2) * num(st[0], 0.2), 0, (k - (nz - 1) / 2) * num(st[1], 0.2)).multiply(jm(i * 131 + k)));
  } else out.push(new THREE.Matrix4());
  return out;
}

// ── recipe -> Object3D tree ──────────────────────────────────────────────────────────────────────────────────────
const MAX_PARTS = 900;
function buildParts(list, parent, st, depth = 0) {
  if (!Array.isArray(list) || depth > 6) return;
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    if (st.count >= MAX_PARTS) { if (!st.capped) { st.warn(`prop.build: more than ${MAX_PARTS} parts; the rest are skipped`); st.capped = true; } return; }
    const p = raw;
    const isGroup = String(p.shape || '').toLowerCase() === 'group' || (p.group != null && Array.isArray(p.parts)) || (Array.isArray(p.parts) && !p.shape);
    const node = new THREE.Group();
    const id = p.id ?? p.group ?? null;
    if (id != null && typeof id !== 'boolean') node.name = 'part:' + id;
    const pos = arr3(p.pos), rot = arr3(p.rot).map((v) => v * DEG), sc = p.scale != null ? arr3(p.scale, [1, 1, 1]) : [1, 1, 1];
    const pivot = Array.isArray(p.pivot) ? arr3(p.pivot) : null;
    // a group with a pivot: the node sits at the pivot (its rotation centre); children keep the prop's coordinates
    if (pivot) node.position.set(pivot[0] + pos[0], pivot[1] + pos[1], pivot[2] + pos[2]); else node.position.set(...pos);
    node.rotation.set(rot[0], rot[1], rot[2]); node.scale.set(...sc);
    parent.add(node);
    if (id != null && typeof id !== 'boolean') { if (st.parts[id]) st.warn(`prop.build: part id '${id}' used twice (the last one animates)`); st.parts[id] = node; }
    const inner = new THREE.Group(); if (pivot) inner.position.set(-pivot[0], -pivot[1], -pivot[2]); node.add(inner);
    const copies = copiesOf(p);
    if (isGroup) {
      for (const M of copies) { const c = new THREE.Group(); M.decompose(c.position, c.quaternion, c.scale); inner.add(c); buildParts(p.parts, c, st, depth + 1); }
      continue;
    }
    const g = geomOf(p, st.warn), m = matOf(p, st.warn);
    if (copies.length > 1) {
      const im = new THREE.InstancedMesh(g, m, copies.length);
      copies.forEach((M, i) => im.setMatrixAt(i, M)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.computeBoundingBox?.();
      im.castShadow = p.shadow !== false; im.receiveShadow = true; inner.add(im); st.count += copies.length;
    } else {
      const me = new THREE.Mesh(g, m); copies[0].decompose(me.position, me.quaternion, me.scale);
      me.castShadow = p.shadow !== false && !(m.transparent); me.receiveShadow = true; inner.add(me); st.count++;
    }
  }
}

// ── visible light beam: an open cone, apex at the lens, additive, fading along its length and at its rim ───────────
const BEAM_VS = /* glsl */`
varying float vV; varying vec3 vN; varying vec3 vW;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vV = uv.y; vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
const BEAM_FS = /* glsl */`
uniform vec3 uColor; uniform float uK;
varying float vV; varying vec3 vN; varying vec3 vW;
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vW);
  vec3 n = vN / max(length(vN), 1e-4);
  float facing = abs(dot(n, V));                                // the cone's middle (seen through more air) glows more
  float along = pow(clamp(vV, 0.0, 1.0), 2.4);                  // uv.y: 1 at the apex (the lens), 0 at the far end (pow of a
                                                                // hair below 0 is NaN: black dots along the far rim)
  float a = uK * along * smoothstep(0.0, 0.55, facing) * (0.55 + 0.45 * facing);
  gl_FragColor = vec4(max(uColor * a, vec3(0.0)), 1.0);
}`;
// how dark the scene is (the look of the scene being rendered): a beam in the air shows in the dark, not in the sun
let _dfL = null, _df = { beam: 1, light: 1 };
export function darkFactor() {
  const L = (typeof window !== 'undefined' && window.__f3d && window.__f3d.cur) ? window.__f3d.cur.L : null;
  if (!L) return { beam: 1, light: 1 };
  if (L === _dfL) return _df;
  _dfL = L;
  const t = String(L.time || ''), night = t === 'night' ? 1 : t === 'dusk' ? 0.8 : t === 'dawn' ? 0.6 : 0;
  if (L.pitch) _df = { beam: 1, light: 1 };
  else if (L.interior) _df = { beam: 0.55 + 0.45 * night, light: 0.7 + 0.3 * night };
  else _df = { beam: 0.06 + 0.9 * night, light: 0.18 + 0.82 * night };
  return _df;
}
function beamMesh(len, angle, color, k) {
  const r = Math.tan(angle) * len;
  const g = new THREE.CylinderGeometry(0.004, r, len, 28, 8, true);   // uv.y = 1 at the top (the narrow end)
  g.translate(0, -len / 2, 0); g.rotateX(-PI / 2);          // apex at the origin, the cone opening toward +Z
  const m = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: k } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const me = new THREE.Mesh(g, m); me.name = 'beam'; me.renderOrder = 12; me.userData.noQA = true; me.receiveShadow = false; me.frustumCulled = false;
  me.onBeforeRender = () => { const f = darkFactor(); m.uniforms.uK.value = k * (me.userData.k ?? 1) * f.beam; const L = me.userData.light; if (L) L.intensity = (L.userData.I ?? L.intensity) * (L.userData.k ?? 1) * f.light; };
  // a beam of light casts no shadow, even when a builder switches shadows on for everything under a figure
  Object.defineProperty(me, 'castShadow', { get: () => false, set: () => {}, configurable: true });
  return me;
}
// lights of a recipe: spot / point with an eased on/off, flicker, an optional visible cone. Returns updaters.
export function buildLights(spec, parent, parts, warn, scale = 1) {
  const list = Array.isArray(spec) ? spec : spec ? [spec] : [];
  const ups = [];
  for (const L of list) {
    if (!L || typeof L !== 'object') continue;
    const type = String(L.type || 'spot').toLowerCase();
    const col = hexOf(L.color, 0xFFF1D8), I = num(L.intensity, type === 'spot' ? 8 : 2), range = num(L.range, type === 'spot' ? 14 : 6) * scale;
    const host = (L.part != null && parts[L.part]) || parent;
    const pos = arr3(L.pos);
    let light;
    if (type === 'point') { light = new THREE.PointLight(col, I, range, 2); light.position.set(...pos); }
    else {
      const ang = clamp(num(L.angle, 18), 2, 80) * DEG;
      light = new THREE.SpotLight(col, I, range, ang, clamp(num(L.penumbra, 0.55), 0, 1), 2);
      light.position.set(...pos);
      const dir = Array.isArray(L.target) ? V3(...arr3(L.target)).sub(V3(...pos)) : V3(...arr3(L.dir, [0, 0, 1]));
      if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1);
      light.target.position.copy(V3(...pos).add(dir.normalize().multiplyScalar(2)));
      host.add(light.target);
      if (L.cone !== false && L.beam !== 0) {
        const bl = num(L.beam_len, Math.min(range * 0.3, 3.5 * scale)), bm = beamMesh(bl, ang * 0.9, col, num(L.beam, 0.12));
        bm.position.set(...pos); bm.quaternion.setFromUnitVectors(V3(0, 0, 1), dir.clone().normalize()); host.add(bm); light.userData.beam = bm; bm.userData.light = light;
      }
    }
    light.castShadow = L.shadow === true || (L.shadow == null && type === 'spot' && !L.handheld);
    if (light.castShadow) { light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.002; light.shadow.normalBias = 0.06; if (light.shadow.camera) { light.shadow.camera.near = 0.05; } }
    light.name = 'prop_light';
    host.add(light);
    // a flashlight in the dark reads by its SPILL (the dim halo round the hotspot: it lights the hands, the arms, the
    // face behind the lens) and by the BOUNCE of the hotspot off the walls ahead (warm, soft: it outlines the figure
    // from the front and lights the passage around the beam). spill / bounce: 0 = off
    const extra = [];
    if (type === 'spot' && (L.spill ?? (L.handheld ? 1 : 0)) > 0) {
      const sp = new THREE.PointLight(col, I * 0.05 * num(L.spill, 1), 1.6, 2); sp.position.set(...pos); sp.name = 'prop_light_spill'; host.add(sp); extra.push([sp, sp.intensity]);
    }
    if (type === 'spot' && (L.bounce ?? (L.handheld ? 1 : 0)) > 0) {
      const dir = Array.isArray(L.target) ? V3(...arr3(L.target)).sub(V3(...pos)) : V3(...arr3(L.dir, [0, 0, 1]));
      const bp = V3(...pos).add(dir.normalize().multiplyScalar(num(L.bounce_dist, 0.9) * scale));
      const bo = new THREE.PointLight(new THREE.Color(col).lerp(new THREE.Color(0xC87A50), 0.35), I * 0.1 * num(L.bounce, 1), 3.2, 2); bo.position.copy(bp); bo.name = 'prop_light_bounce'; host.add(bo); extra.push([bo, bo.intensity]);
    }
    if (light.userData.beam && extra.length) { const b = light.userData.beam, prev = b.onBeforeRender; b.onBeforeRender = (...a) => { prev(...a); const f = darkFactor(), k = light.userData.k ?? 1; for (const [x, i0] of extra) x.intensity = i0 * k * f.light; }; }
    const on = L.on, fl = clamp(num(L.flicker, 0), 0, 1), ph = hash(ups.length, 41) * 50;
    const bm = light.userData.beam;
    light.userData.I = I;
    ups.push((t) => {
      let k = 1;
      if (on === false) k = 0;
      else if (Array.isArray(on) && on.length >= 1) { const t0 = num(on[0], 0), t1 = num(on[1], 1e9); k = sm((t - t0) / 0.15) * (1 - sm((t - t1) / 0.15)); }
      if (fl > 0) k *= 1 - fl * (0.35 * (0.5 + 0.5 * Math.sin(t * 23 + ph)) * (0.5 + 0.5 * Math.sin(t * 7.3 + ph * 2)) + 0.25 * hash(Math.floor(t * 18), ph));
      const f = darkFactor();
      light.userData.k = k; light.intensity = I * k * f.light; light.visible = k > 0.002;
      for (const [x, i0] of extra) { x.intensity = i0 * k * f.light; x.visible = k > 0.002; }
      if (bm) { bm.userData.k = k; bm.visible = k > 0.002; }
    });
  }
  return ups;
}

// ── animations ───────────────────────────────────────────────────────────────────────────────────────────────────
function axisOf(a) {
  if (Array.isArray(a) && a.length === 3) return V3(...a.map(Number)).normalize();
  const s = String(a || 'x').toLowerCase().replace('-', '');
  const v = s === 'y' ? V3(0, 1, 0) : s === 'z' ? V3(0, 0, 1) : V3(1, 0, 0);
  return String(a || '').startsWith('-') ? v.negate() : v;
}
function keysAt(keys, t, ease) {             // [[t, v], ...] -> v (number or array), eased per segment, held outside
  if (!keys.length) return null;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) { const u = ease((t - t0) / Math.max(1e-6, t1 - t0)); return Array.isArray(a) ? a.map((v, j) => lerp(+v, +b[j], u)) : lerp(+a, +b, u); }
  }
  return keys[keys.length - 1][1];
}
// build one animation -> (t, node) that applies a delta on top of the node's base transform
function makeAnim(a, node, st) {
  const type = String(a.type || a.kind || 'rotate').toLowerCase(), ease = EASE[a.ease] || sm;
  const ax = axisOf(a.axis), q = new THREE.Quaternion();
  const keys = (Array.isArray(a.keys) ? a.keys : []).filter((k) => Array.isArray(k) && k.length >= 2 && Number.isFinite(+k[0])).map((k) => [+k[0], k[1]]).sort((x, y) => x[0] - y[0]);
  const t0 = num(Array.isArray(a.t) ? a.t[0] : a.t, 0);
  if (type === 'rotate' || type === 'turn') return (t, n) => { const v = keysAt(keys, t, ease); if (v != null) n.quaternion.multiply(q.setFromAxisAngle(ax, (+v || 0) * DEG)); };
  if (type === 'translate' || type === 'move') return (t, n) => { const v = keysAt(keys, t, ease); if (Array.isArray(v)) n.position.add(V3(+v[0] || 0, +v[1] || 0, +v[2] || 0)); };
  if (type === 'scale') return (t, n) => { const v = keysAt(keys, t, ease); if (v != null) { const s = Array.isArray(v) ? v : [v, v, v]; n.scale.multiply(V3(Math.max(1e-3, +s[0]), Math.max(1e-3, +s[1]), Math.max(1e-3, +s[2]))); } };
  if (type === 'open' || type === 'lid' || type === 'close') {
    const ang = num(a.angle, type === 'close' ? -100 : 100), dur = Math.max(0.05, num(a.dur, 0.9));
    return (t, n) => { const u = ease((t - t0) / dur); n.quaternion.multiply(q.setFromAxisAngle(ax, (type === 'close' ? ang * (1 - u) : ang * u) * DEG)); };
  }
  if (type === 'spring' || type === 'whip' || type === 'snap') {
    const from = num(a.from, -90), to = num(a.to, 0), f = num(a.freq, 2.2), damp = num(a.damp, 3.5);
    return (t, n) => { const x = t - t0; const ang = x <= 0 ? from : to + (from - to) * Math.exp(-damp * x) * Math.cos(TAU * f * x); n.quaternion.multiply(q.setFromAxisAngle(ax, ang * DEG)); };
  }
  if (type === 'pendulum') {
    const from = num(a.from, 80) * DEG, L = Math.max(0.05, num(a.length, 1.5)), w = Math.sqrt(9.81 / L), damp = num(a.damp, 0.35);
    // a large-angle release: the small-angle solution with the amplitude-dependent period (good to ~90 deg)
    const wk = w / (1 + from * from / 16);
    return (t, n) => { const x = t - t0; const ang = x <= 0 ? from : from * Math.exp(-damp * x) * Math.cos(wk * x); n.quaternion.multiply(q.setFromAxisAngle(ax, ang)); };
  }
  if (type === 'swing' || type === 'sway') {
    const amp = num(a.amp, 12), f = num(a.freq, 0.6), damp = num(a.damp, 0);
    return (t, n) => { const x = Math.max(0, t - t0); const ang = amp * Math.exp(-damp * x) * Math.sin(TAU * f * x) * sm(x / 0.4); n.quaternion.multiply(q.setFromAxisAngle(ax, ang * DEG)); };
  }
  if (type === 'spin') {
    const rate = num(a.rate, 90), ramp = Math.max(0.05, num(a.ramp, 0.5));
    return (t, n) => { const x = Math.max(0, t - t0); const ang = rate * (x > ramp ? x - ramp / 2 : x * x / (2 * ramp)); n.quaternion.multiply(q.setFromAxisAngle(ax, ang * DEG)); };
  }
  if (type === 'shake' || type === 'rattle' || type === 'tremble') {
    const t1 = num(Array.isArray(a.t) ? a.t[1] : null, t0 + num(a.dur, 1)), amp = num(a.amp, 0.01), ra = num(a.rot, 2) * DEG, f = num(a.freq, 16);
    return (t, n) => { if (t < t0 - 0.2 || t > t1 + 0.3) return; const e = sm((t - t0) / 0.12) * (1 - sm((t - t1) / 0.25)); const s = (k) => Math.sin(TAU * f * t * (1 + 0.13 * k) + k * 1.7) * 0.6 + Math.sin(TAU * f * 1.9 * t + k * 3.1) * 0.4;
      n.position.add(V3(s(1) * amp * e, s(2) * amp * 0.5 * e, s(3) * amp * e)); n.quaternion.multiply(q.setFromEuler(new THREE.Euler(s(4) * ra * e, s(5) * ra * e, s(6) * ra * e))); };
  }
  if (type === 'show' || type === 'appear' || type === 'hide' || type === 'vanish') {
    const dur = Math.max(0.05, num(a.dur, 0.35)), hide = type === 'hide' || type === 'vanish';
    return (t, n) => { const u = sm((t - t0) / dur), k = hide ? 1 - u : u; n.scale.multiplyScalar(Math.max(1e-3, k)); n.visible = k > 0.002; };
  }
  if (type === 'fall' || type === 'drop') {
    const g = num(a.g, 9.81), bounce = clamp(num(a.bounce, 0.25), 0, 0.8), spin = arr3(a.spin, [0, 0, 0]).map((v) => v * DEG);
    const drop = a.drop != null ? Math.max(0, num(a.drop, 1)) : null;
    let D = drop;
    return (t, n) => {
      if (D == null) D = Math.max(0, st.baseBottom?.(n) ?? 1);           // default: down onto the ground (y = 0 of the prop)
      const x = t - t0; if (x <= 0) return;
      const tl = Math.sqrt(2 * D / g), v0 = g * tl;
      let y, xs = Math.min(x, tl);
      if (x <= tl) y = -0.5 * g * x * x;
      else {                                  // bounces: each b times the last
        let tt = x - tl, v = v0 * bounce, yb = 0; y = -D;
        while (v > 0.05) { const tb = 2 * v / g; if (tt < tb) { yb = v * tt - 0.5 * g * tt * tt; break; } tt -= tb; v *= bounce; }
        y += yb; xs = tl;
      }
      n.position.y += y;
      if (spin.some((s) => s)) n.quaternion.multiply(q.setFromEuler(new THREE.Euler(spin[0] * xs, spin[1] * xs, spin[2] * xs)));
    };
  }
  st.warn(`prop.build: anim type '${a.type}' unknown (rotate translate open spring pendulum swing spin shake show hide fall scale)`);
  return null;
}

// ── named recipes (also the worked examples of the catalog doc) ──────────────────────────────────────────────────
export const PRESETS = {
  // M1911 .45 pistol: origin at the grip (in the fist), barrel along +Z, slide on top (+Y)
  pistol_m1911: { parts: [
    { shape: 'box', size: [0.029, 0.034, 0.21], bevel: 0.004, mat: 'gunmetal', pos: [0, 0.052, 0.068] },                      // slide
    { shape: 'box', size: [0.027, 0.02, 0.16], bevel: 0.003, mat: 'gunmetal', pos: [0, 0.03, 0.05] },                           // frame
    { shape: 'box', size: [0.03, 0.125, 0.052], bevel: 0.006, mat: 'gunmetal', pos: [0, -0.02, -0.022], rot: [-16, 0, 0] },      // grip frame
    { shape: 'box', size: [0.034, 0.1, 0.045], bevel: 0.006, mat: 'dark_wood', pos: [0, -0.018, -0.022], rot: [-16, 0, 0] },     // walnut grip panels
    { shape: 'torus', r: 0.017, tube: 0.0028, arc: 200, axis: 'x', mat: 'gunmetal', pos: [0, 0.018, 0.012], rot: [0, 0, 0] },  // trigger guard
    { shape: 'box', size: [0.006, 0.02, 0.006], mat: 'gunmetal', pos: [0, 0.02, 0.012], rot: [12, 0, 0] },                      // trigger
    { shape: 'cylinder', r: 0.0062, h: 0.012, axis: 'z', mat: 'black', pos: [0, 0.052, 0.174] },                                 // muzzle
    { shape: 'box', size: [0.008, 0.016, 0.012], mat: 'gunmetal', pos: [0, 0.066, -0.034], rot: [-30, 0, 0] },                   // hammer
    { shape: 'box', size: [0.004, 0.006, 0.006], mat: 'gunmetal', pos: [0, 0.072, 0.168] },                                     // front sight
  ], anchors: { muzzle: [0, 0.052, 0.18], grip: [0, 0, 0] } },
  // M16A1 rifle: origin at the pistol grip, barrel along +Z
  rifle_m16: { parts: [
    { shape: 'box', size: [0.05, 0.07, 0.22], bevel: 0.008, mat: 'gunmetal', pos: [0, 0.05, 0.08] },                           // receiver
    { shape: 'box', size: [0.028, 0.05, 0.13], bevel: 0.006, mat: 'gunmetal', pos: [0, 0.105, 0.04] },                          // carry handle
    { shape: 'cylinder', r: [0.028, 0.03], h: 0.3, axis: 'z', mat: 'plastic', pos: [0, 0.055, 0.34], seg: 12 },                 // handguard
    { shape: 'cylinder', r: 0.0085, h: 0.2, axis: 'z', mat: 'gunmetal', pos: [0, 0.058, 0.58] },                                 // barrel
    { shape: 'cylinder', r: 0.011, h: 0.045, axis: 'z', mat: 'gunmetal', pos: [0, 0.058, 0.69] },                                // flash hider
    { shape: 'box', size: [0.012, 0.075, 0.012], mat: 'gunmetal', pos: [0, 0.095, 0.52] },                                      // front sight post
    { shape: 'box', size: [0.036, 0.06, 0.35], bevel: 0.008, mat: 'plastic', pos: [0, 0.035, -0.24] },                          // stock
    { shape: 'box', size: [0.04, 0.12, 0.02], bevel: 0.004, mat: 'rubber', pos: [0, 0.015, -0.415] },                            // butt plate
    { shape: 'box', size: [0.03, 0.1, 0.04], bevel: 0.006, mat: 'plastic', pos: [0, -0.03, -0.005], rot: [-18, 0, 0] },         // pistol grip
    { shape: 'box', size: [0.026, 0.19, 0.065], bevel: 0.004, mat: 'gunmetal', pos: [0, -0.065, 0.1], rot: [8, 0, 0] },         // magazine
    { shape: 'torus', r: 0.018, tube: 0.003, arc: 200, axis: 'x', mat: 'gunmetal', pos: [0, 0.012, 0.035] },                     // trigger guard
  ], anchors: { muzzle: [0, 0.058, 0.72], grip: [0, 0, 0] } },
  rifle_ak47: { parts: [
    { shape: 'box', size: [0.05, 0.075, 0.26], bevel: 0.006, mat: 'gunmetal', pos: [0, 0.05, 0.07] },
    { shape: 'box', size: [0.05, 0.055, 0.2], bevel: 0.01, mat: 'wood', pos: [0, 0.04, 0.3] },                                   // lower handguard
    { shape: 'box', size: [0.04, 0.03, 0.16], bevel: 0.008, mat: 'wood', pos: [0, 0.085, 0.32] },                                // upper handguard
    { shape: 'cylinder', r: 0.0085, h: 0.28, axis: 'z', mat: 'gunmetal', pos: [0, 0.062, 0.52] },
    { shape: 'cylinder', r: 0.008, h: 0.24, axis: 'z', mat: 'gunmetal', pos: [0, 0.09, 0.44] },                                  // gas tube
    { shape: 'box', size: [0.014, 0.04, 0.014], mat: 'gunmetal', pos: [0, 0.085, 0.64] },
    { shape: 'extrude', outline: [[0, 0.02], [0.02, 0.025], [0.36, -0.03], [0.37, -0.12], [0.34, -0.13], [0.1, -0.06], [0, -0.03]], depth: 0.038, bevel: 0.004, mat: 'wood', pos: [0, 0.06, -0.06], rot: [0, 90, 0] },   // stock
    { shape: 'box', size: [0.03, 0.1, 0.04], bevel: 0.006, mat: 'wood', pos: [0, -0.03, -0.005], rot: [-18, 0, 0] },
    { shape: 'tube', points: [[0, 0.02, 0.1], [0, -0.07, 0.13], [0, -0.16, 0.19], [0, -0.2, 0.26]], r: 0.018, mat: 'gunmetal', seg: 8 },   // the curved magazine
    { shape: 'torus', r: 0.018, tube: 0.003, arc: 200, axis: 'x', mat: 'gunmetal', pos: [0, 0.012, 0.035] },
  ], anchors: { muzzle: [0, 0.062, 0.66], grip: [0, 0, 0] } },
  // M26 fragmentation grenade ("lemon"): 0.1 m tall, olive body, spoon + pin ring
  grenade: { parts: [
    { shape: 'lathe', points: [[0, -0.048], [0.02, -0.046], [0.029, -0.036], [0.031, -0.015], [0.029, 0.012], [0.023, 0.03], [0.016, 0.04], [0, 0.041]], mat: 'olive', seg: 20 },
    { shape: 'cylinder', r: 0.011, h: 0.024, mat: 'olive', pos: [0, 0.05, 0], color: '#5A5F3E' },                                // fuze
    { shape: 'box', size: [0.012, 0.075, 0.004], bevel: 0.0015, mat: 'olive', color: '#6A6E48', pos: [0, 0.028, 0.027], rot: [-8, 0, 0] },   // spoon
    { shape: 'torus', r: 0.011, tube: 0.0018, axis: 'x', mat: 'steel', pos: [0.018, 0.058, 0.0] },                                // pin ring
  ], anchors: { top: [0, 0.06, 0] } },
  // Mk 2 "pineapple": the segmented body
  grenade_mk2: { parts: [
    { shape: 'sphere', r: 0.029, scale: [1, 1.25, 1], mat: 'olive' },
    { shape: 'box', size: [0.058, 0.004, 0.058], mat: 'olive', color: '#3E4428', repeat: { n: 5, step: [0, 0.014, 0] }, pos: [0, -0.028, 0], scale: [1, 1, 1] },
    { shape: 'cylinder', r: 0.011, h: 0.025, mat: 'olive', pos: [0, 0.045, 0] },
    { shape: 'box', size: [0.012, 0.07, 0.004], mat: 'olive', pos: [0, 0.025, 0.03] },
    { shape: 'torus', r: 0.011, tube: 0.0018, axis: 'x', mat: 'steel', pos: [0.018, 0.052, 0] },
  ] },
  // a handheld flashlight, beam along +Z (origin at the grip)
  flashlight: { parts: [
    { shape: 'cylinder', r: 0.017, h: 0.16, axis: 'z', mat: 'olive', pos: [0, 0, 0.02], seg: 16 },
    { shape: 'cylinder', r: [0.024, 0.018], h: 0.04, axis: 'z', mat: 'olive', pos: [0, 0, 0.12], seg: 18 },
    { shape: 'cylinder', r: 0.024, h: 0.012, axis: 'z', mat: 'black', pos: [0, 0, 0.146] },
    { shape: 'cylinder', r: 0.02, h: 0.004, axis: 'z', mat: 'light', pos: [0, 0, 0.152], glow: 6 },                               // the lens
    { shape: 'box', size: [0.012, 0.01, 0.02], mat: 'black', pos: [0, 0.019, 0.04] },                                            // switch
  ], light: { type: 'spot', pos: [0, 0, 0.16], dir: [0, 0, 1], angle: 16, penumbra: 0.6, intensity: 9, range: 16, cone: true, beam: 0.12, handheld: true }, anchors: { lens: [0, 0, 0.155] } },
  // TL-122 angle-head flashlight (US Army, Vietnam): body upright, head bent forward
  flashlight_angle: { parts: [
    { shape: 'cylinder', r: 0.019, h: 0.15, mat: 'olive', pos: [0, -0.02, 0] },
    { shape: 'cylinder', r: 0.021, h: 0.05, mat: 'olive', pos: [0, 0.075, 0.0] },
    { shape: 'cylinder', r: 0.022, h: 0.035, axis: 'z', mat: 'olive', pos: [0, 0.085, 0.03] },
    { shape: 'cylinder', r: 0.018, h: 0.004, axis: 'z', mat: 'light', pos: [0, 0.085, 0.049], glow: 6 },
    { shape: 'torus', r: 0.012, tube: 0.002, axis: 'x', mat: 'olive', pos: [0.02, 0.02, 0] },
  ], light: { type: 'spot', pos: [0, 0.085, 0.055], dir: [0, 0, 1], angle: 17, intensity: 9, range: 16, cone: true, beam: 0.12, handheld: true }, anchors: { lens: [0, 0.085, 0.05] } },
  // ── the six worked recipes of the doc ──
  syringe: { parts: [
    { shape: 'cylinder', r: 0.0075, h: 0.075, axis: 'z', mat: 'glass', pos: [0, 0, 0.0] },
    { shape: 'cylinder', r: 0.0062, h: 0.045, axis: 'z', mat: 'white', color: '#D8E8F0', opacity: 0.7, pos: [0, 0, 0.012] },       // the dose
    { shape: 'cylinder', r: 0.0065, h: 0.004, axis: 'z', mat: 'rubber', pos: [0, 0, -0.03] },                                   // plunger seal
    { shape: 'cylinder', r: 0.0018, h: 0.05, axis: 'z', mat: 'white', pos: [0, 0, -0.056] },                                    // plunger rod
    { shape: 'cylinder', r: 0.009, h: 0.003, axis: 'z', mat: 'white', pos: [0, 0, -0.082] },                                    // thumb rest
    { shape: 'box', size: [0.03, 0.004, 0.003], mat: 'white', pos: [0, 0, -0.037] },                                           // finger flange
    { shape: 'cone', r: 0.004, h: 0.008, axis: 'z', mat: 'glass', pos: [0, 0, 0.041] },
    { shape: 'cylinder', r: 0.0004, h: 0.035, axis: 'z', mat: 'chrome', pos: [0, 0, 0.062] },                                   // needle
  ], anchors: { tip: [0, 0, 0.08] } },
  field_phone: { parts: [                                        // EE-8 field telephone in its leather case
    { shape: 'box', size: [0.26, 0.2, 0.1], bevel: 0.012, mat: 'leather', color: '#4E3A26', pos: [0, 0.1, 0] },
    { shape: 'box', size: [0.24, 0.02, 0.11], bevel: 0.006, mat: 'leather', color: '#5C4630', pos: [0, 0.205, 0] },
    { shape: 'cylinder', r: 0.02, h: 0.03, axis: 'x', mat: 'black', pos: [0.145, 0.12, 0] },                                   // crank hub
    { shape: 'box', size: [0.012, 0.06, 0.012], mat: 'black', pos: [0.165, 0.1, 0] },                                           // crank arm
    { shape: 'group', id: 'handset', pivot: [0, 0.23, 0], parts: [
      { shape: 'capsule', r: 0.016, h: 0.16, axis: 'x', mat: 'black', pos: [0, 0.235, 0] },
      { shape: 'cylinder', r: [0.026, 0.02], h: 0.03, mat: 'black', pos: [-0.1, 0.225, 0] },
      { shape: 'cylinder', r: [0.024, 0.018], h: 0.03, mat: 'black', pos: [0.1, 0.225, 0] },
    ] },
    { shape: 'rope', points: [[-0.1, 0.21, 0.02], [-0.16, 0.12, 0.08], [-0.1, 0.03, 0.09], [-0.05, 0.1, 0.05]], r: 0.004, mat: 'rubber' },
  ] },
  padlock: { parts: [
    { shape: 'box', size: [0.05, 0.045, 0.02], bevel: 0.006, mat: 'brass', pos: [0, 0.0225, 0] },
    { shape: 'group', id: 'shackle', pivot: [0.017, 0.045, 0], parts: [
      { shape: 'torus', r: 0.017, tube: 0.0035, arc: 180, mat: 'chrome', pos: [0, 0.058, 0] },
      { shape: 'cylinder', r: 0.0035, h: 0.016, mat: 'chrome', pos: [0.017, 0.05, 0] },
      { shape: 'cylinder', r: 0.0035, h: 0.016, mat: 'chrome', pos: [-0.017, 0.05, 0] },
    ] },
    { shape: 'cylinder', r: 0.0045, h: 0.003, axis: 'z', mat: 'black', pos: [0, 0.015, 0.0105] },                              // keyhole
  ], anim: [{ part: 'shackle', type: 'translate', keys: [[1.0, [0, 0, 0]], [1.2, [0, 0.012, 0]]] }, { part: 'shackle', type: 'rotate', axis: 'y', keys: [[1.2, 0], [1.6, 90]] }] },
  crossbow: { parts: [
    { shape: 'box', size: [0.05, 0.05, 0.7], bevel: 0.01, mat: 'wood', pos: [0, 0, 0.05] },                                    // tiller
    { shape: 'tube', points: [[-0.36, 0.0, 0.34], [-0.2, 0.0, 0.4], [0, 0.0, 0.42], [0.2, 0.0, 0.4], [0.36, 0.0, 0.34]], r: 0.012, mat: 'wood', color: '#5A3A20' },   // prod (the bow)
    { shape: 'rope', points: [[-0.36, 0.0, 0.34], [0, 0.012, 0.1], [0.36, 0.0, 0.34]], r: 0.0025, mat: 'rope' },               // string, drawn back
    { shape: 'cylinder', r: 0.005, h: 0.36, axis: 'z', mat: 'wood', color: '#8A6A40', pos: [0, 0.03, 0.27] },                   // bolt
    { shape: 'cone', r: 0.008, h: 0.03, axis: 'z', mat: 'iron', pos: [0, 0.03, 0.465] },
    { shape: 'box', size: [0.012, 0.06, 0.012], mat: 'iron', pos: [0, -0.05, -0.05], rot: [20, 0, 0] },                         // trigger lever
  ], anchors: { tip: [0, 0.03, 0.48] } },
  bamboo_cage: { parts: [                                        // 1.2 x 1.2 x 1.1 m bamboo tiger cage, lashed
    { shape: 'pole', mat: 'bamboo', r: 0.022, from: [-0.6, 0.02, 0], to: [0.6, 0.02, 0], repeat: { n: 2, step: [0, 1.05, 0] }, pos: [0, 0, -0.6] },
    { shape: 'pole', mat: 'bamboo', r: 0.022, from: [-0.6, 0.02, 0], to: [0.6, 0.02, 0], repeat: { n: 2, step: [0, 1.05, 0] }, pos: [0, 0, 0.6] },
    { shape: 'pole', mat: 'bamboo', r: 0.022, from: [0, 0.02, -0.6], to: [0, 0.02, 0.6], repeat: { n: 2, step: [0, 1.05, 0] }, pos: [-0.6, 0, 0] },
    { shape: 'pole', mat: 'bamboo', r: 0.022, from: [0, 0.02, -0.6], to: [0, 0.02, 0.6], repeat: { n: 2, step: [0, 1.05, 0] }, pos: [0.6, 0, 0] },
    { shape: 'pole', mat: 'bamboo', r: 0.018, from: [0, 0, 0], to: [0, 1.1, 0], repeat: { n: 9, step: [0.15, 0, 0] }, pos: [-0.6, 0, -0.6] },
    { shape: 'pole', mat: 'bamboo', r: 0.018, from: [0, 0, 0], to: [0, 1.1, 0], repeat: { n: 9, step: [0.15, 0, 0] }, pos: [-0.6, 0, 0.6] },
    { shape: 'pole', mat: 'bamboo', r: 0.018, from: [0, 0, 0], to: [0, 1.1, 0], repeat: { n: 7, step: [0, 0, 0.15] }, pos: [-0.6, 0, -0.45] },
    { shape: 'pole', mat: 'bamboo', r: 0.018, from: [0, 0, 0], to: [0, 1.1, 0], repeat: { n: 7, step: [0, 0, 0.15] }, pos: [0.6, 0, -0.45] },
    { shape: 'pole', mat: 'bamboo', r: 0.02, from: [-0.6, 1.1, 0], to: [0.6, 1.1, 0], repeat: { n: 6, step: [0, 0, 0.24] }, pos: [0, 0, -0.6] },
    { shape: 'torus', r: 0.028, tube: 0.006, axis: 'y', mat: 'rope', pos: [-0.6, 1.05, -0.6], repeat: { n: 2, step: [1.2, 0, 0] } },
    { shape: 'torus', r: 0.028, tube: 0.006, axis: 'y', mat: 'rope', pos: [-0.6, 1.05, 0.6], repeat: { n: 2, step: [1.2, 0, 0] } },
  ] },
  spiked_mace: { parts: [                                       // a 40-lb spiked ball on a rope, hung from a tree limb
    { shape: 'pole', from: [-1.3, 0, 0.1], to: [-1.1, 4.2, 0.0], r: 0.13, mat: 'dark_wood', nodes: 0 },                         // the trunk
    { shape: 'pole', from: [-1.15, 3.45, 0.02], to: [0.45, 3.28, 0.0], r: 0.065, mat: 'dark_wood', nodes: 0 },                    // the limb
    { shape: 'torus', r: 0.07, tube: 0.012, axis: 'x', mat: 'rope', pos: [0, 3.28, 0] },                                        // the lashing
    { shape: 'group', id: 'mace', pivot: [0, 3.2, 0], parts: [
      { shape: 'rope', from: [0, 3.24, 0], to: [0, 1.95, 0], sag: 0, r: 0.012, mat: 'rope' },
      { shape: 'sphere', r: 0.22, mat: 'earth', color: '#5A4630', pos: [0, 1.72, 0] },                                          // a mud-packed ball
      { shape: 'spike', r: 0.012, h: 0.3, mat: 'bamboo', color: '#C8B070', sphere: { n: 34, r: 0.2 }, pos: [0, 1.72, 0] },       // sharpened bamboo spikes
    ] },
  ], anim: [{ part: 'mace', type: 'pendulum', axis: 'x', from: 85, length: 1.5, t: 1.0, damp: 0.5 }], anchors: { ball: [0, 1.72, 0], branch: [0, 3.2, 0] } },
  // ── surgery ──
  scalpel: { parts: [
    { shape: 'box', size: [0.009, 0.004, 0.1], bevel: 0.0015, mat: 'chrome', pos: [0, 0, -0.02] },
    { shape: 'extrude', outline: [[0, 0], [0.028, 0.0], [0.04, 0.004], [0.028, 0.011], [0, 0.009]], depth: 0.0008, mat: 'chrome', pos: [0, -0.004, 0.03], rot: [0, -90, 90] },
  ], anchors: { tip: [0, 0, 0.07] } },
  forceps: { parts: [
    { shape: 'box', size: [0.004, 0.003, 0.13], mat: 'chrome', pos: [0.004, 0, 0], rot: [0, 2.5, 0] },
    { shape: 'box', size: [0.004, 0.003, 0.13], mat: 'chrome', pos: [-0.004, 0, 0], rot: [0, -2.5, 0] },
    { shape: 'torus', r: 0.009, tube: 0.0016, axis: 'y', mat: 'chrome', pos: [0.012, 0, -0.07] },
    { shape: 'torus', r: 0.009, tube: 0.0016, axis: 'y', mat: 'chrome', pos: [-0.012, 0, -0.07] },
  ] },
  // ── radar / oscilloscope consoles (1940s): the CRT face is real animated graphics (crtscope.js), never a glowing disc.
  // radar_scope = an A-scope (SCR-270 style: range trace + target spike); radar_ppi = a round sweep with blips
  radar_scope: { parts: [
    { shape: 'box', size: [0.52, 0.42, 0.44], bevel: 0.018, mat: 'olive', color: '#3E4530', pos: [0, 0.21, 0] },                // the steel cabinet
    { shape: 'box', size: [0.48, 0.38, 0.012], bevel: 0.004, mat: 'gunmetal', color: '#2B2E2A', pos: [0, 0.215, 0.222] },       // the front panel
    { shape: 'cylinder', r: 0.122, h: 0.02, axis: 'z', mat: 'black', pos: [-0.07, 0.25, 0.232] },                              // the tube's bezel
    { shape: 'torus', r: 0.112, tube: 0.008, rot: [90, 0, 0], mat: 'chrome', color: '#8A8E88', pos: [-0.07, 0.25, 0.244] },
    { shape: 'cylinder', r: 0.02, h: 0.022, axis: 'z', mat: 'black', pos: [0.15, 0.34, 0.238], repeat: { n: 3, step: [0, -0.085, 0] } },   // knobs
    { shape: 'box', size: [0.003, 0.014, 0.002], mat: 'white', pos: [0.15, 0.352, 0.25], repeat: { n: 3, step: [0, -0.085, 0] } },        // knob index marks
    { shape: 'cylinder', r: 0.026, h: 0.01, axis: 'z', mat: 'black', pos: [0.15, 0.085, 0.232] },                               // a small meter
    { shape: 'cylinder', r: 0.021, h: 0.004, axis: 'z', mat: 'paper', color: '#D8D2BC', pos: [0.15, 0.085, 0.238] },
    { shape: 'box', size: [0.006, 0.02, 0.012], mat: 'chrome', pos: [-0.16, 0.07, 0.235], repeat: { n: 4, step: [0.05, 0, 0] } },          // toggle switches
    { shape: 'box', size: [0.09, 0.03, 0.003], mat: 'brass', color: '#9A8450', pos: [-0.07, 0.07, 0.229] },                    // the data plate
    { shape: 'cylinder', r: 0.005, h: 0.004, axis: 'z', mat: 'chrome', pos: [-0.225, 0.395, 0.23], repeat: { n: 2, step: [0.45, 0, 0] } },   // panel screws
    { shape: 'cylinder', r: 0.005, h: 0.004, axis: 'z', mat: 'chrome', pos: [-0.225, 0.035, 0.23], repeat: { n: 2, step: [0.45, 0, 0] } },
    { shape: 'box', size: [0.3, 0.006, 0.004], mat: 'black', pos: [0, 0.405, -0.1], repeat: { n: 6, step: [0, 0, 0.03] } },     // vents on the top
    { shape: 'tube', points: [[-0.27, 0.12, 0.17], [-0.3, 0.21, 0.19], [-0.27, 0.3, 0.17]], r: 0.009, mat: 'chrome' },
    { shape: 'tube', points: [[0.27, 0.12, 0.17], [0.3, 0.21, 0.19], [0.27, 0.3, 0.17]], r: 0.009, mat: 'chrome' },
  ], crt: { mode: 'a', r: 0.104, pos: [-0.07, 0.25, 0.2445] }, anchors: { screen: [-0.07, 0.25, 0.24] } },
  radar_ppi: { parts: [
    { shape: 'box', size: [0.62, 0.5, 0.5], bevel: 0.02, mat: 'olive', color: '#3B4232', pos: [0, 0.25, 0] },
    { shape: 'box', size: [0.58, 0.46, 0.012], bevel: 0.004, mat: 'gunmetal', color: '#292C28', pos: [0, 0.255, 0.252] },
    { shape: 'cylinder', r: 0.175, h: 0.022, axis: 'z', mat: 'black', pos: [0, 0.29, 0.262] },
    { shape: 'torus', r: 0.163, tube: 0.009, rot: [90, 0, 0], mat: 'chrome', color: '#8A8E88', pos: [0, 0.29, 0.275] },
    { shape: 'cylinder', r: 0.004, h: 0.004, axis: 'z', mat: 'chrome', pos: [0, 0.29, 0.27], ring: { n: 12, r: 0.168, axis: 'z' } },
    { shape: 'cylinder', r: 0.022, h: 0.024, axis: 'z', mat: 'black', pos: [-0.2, 0.07, 0.268], repeat: { n: 5, step: [0.1, 0, 0] } },
    { shape: 'box', size: [0.003, 0.015, 0.002], mat: 'white', pos: [-0.2, 0.083, 0.281], repeat: { n: 5, step: [0.1, 0, 0] } },
    { shape: 'box', size: [0.1, 0.028, 0.003], mat: 'brass', color: '#9A8450', pos: [0.21, 0.45, 0.259] },
    { shape: 'box', size: [0.34, 0.006, 0.004], mat: 'black', pos: [0, 0.505, -0.12], repeat: { n: 7, step: [0, 0, 0.03] } },
  ], crt: { mode: 'ppi', r: 0.154, pos: [0, 0.29, 0.2745] }, anchors: { screen: [0, 0.29, 0.27] } },
  // punji stake: a sharpened bamboo splinter (base at 0, tip up)
  punji_stake: { parts: [
    { shape: 'spike', r: 0.014, h: 0.34, mat: 'bamboo', color: '#B8A26A' },
    { shape: 'spike', r: 0.01, h: 0.08, mat: 'earth', color: '#3A2C1E', pos: [0, 0.26, 0] },                                   // the dirty tip
  ] },
};
const PRESET_ALIAS = { m1911: 'pistol_m1911', pistol: 'pistol_m1911', handgun: 'pistol_m1911', colt: 'pistol_m1911', '45': 'pistol_m1911', m16: 'rifle_m16', rifle: 'rifle_m16', ak47: 'rifle_ak47', ak: 'rifle_ak47', kalashnikov: 'rifle_ak47',
  m26: 'grenade', frag: 'grenade', pineapple: 'grenade_mk2', mk2: 'grenade_mk2', torch: 'flashlight', tl122: 'flashlight_angle', telephone: 'field_phone', phone: 'field_phone', a_scope: 'radar_scope', ascope: 'radar_scope', oscilloscope: 'radar_scope', scope: 'radar_scope', radar: 'radar_scope', ppi: 'radar_ppi', radar_sweep: 'radar_ppi', plan_position_indicator: 'radar_ppi', lock: 'padlock', cage: 'bamboo_cage', tiger_cage: 'bamboo_cage', mace: 'spiked_mace', knife: 'scalpel', tweezers: 'forceps', stake: 'punji_stake' };
export function presetOf(name) { if (!name) return null; const k = String(name).toLowerCase().replace(/[\s-]+/g, '_'); return PRESETS[k] || PRESETS[PRESET_ALIAS[k]] || null; }

// ── the builder ──────────────────────────────────────────────────────────────────────────────────────────────────
// build a recipe into a Group (no placement): { group, parts, update(t), anchors, box, lights }
export function buildRecipe(recipe = {}, o = {}) {
  const warn = o.warn || (() => {});
  const st = { parts: {}, count: 0, warn, capped: false };
  const group = new THREE.Group(); group.name = 'prop.build' + (recipe.name ? ':' + recipe.name : '');
  const body = new THREE.Group(); group.add(body);
  buildParts(Array.isArray(recipe.parts) ? recipe.parts : [], body, st);
  if (!st.count) { warn('prop.build: the recipe has no parts; a small crate stands in'); buildParts([{ shape: 'box', size: [0.4, 0.3, 0.3], bevel: 0.01, mat: 'wood' }], body, st); }
  // o.rot: the whole prop turned before it is fitted to the ground (a rifle lying on its side: rot [0, 0, 90])
  if (Array.isArray(o.rot)) body.rotation.set(...arr3(o.rot).map((v) => v * DEG));
  // size: the largest dimension (m)
  body.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(body);
  const dims = box.getSize(V3());
  const want = num(recipe.size ?? o.size, null);
  let k = num(recipe.scale ?? o.scale, 1);
  if (want && want > 0) k = want / Math.max(1e-4, Math.max(dims.x, dims.y, dims.z));
  if (k !== 1) { body.scale.setScalar(k); body.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(body); }
  const d2 = box.getSize(V3()), big = Math.max(d2.x, d2.y, d2.z);
  if (big > 60) warn(`prop.build: the prop is ${big.toFixed(1)} m across (sizes are metres: check the recipe)`);
  if (big < 0.008) warn(`prop.build: the prop is only ${(big * 1000).toFixed(1)} mm across (sizes are metres: check the recipe)`);
  // animations: base transforms, then deltas each frame
  const anims = [];
  for (const a of (Array.isArray(recipe.anim) ? recipe.anim : recipe.anim ? [recipe.anim] : [])) {
    if (!a || typeof a !== 'object') continue;
    const n = a.part != null ? st.parts[a.part] : body;
    if (!n) { warn(`prop.build: anim on part '${a.part}' that does not exist`); continue; }
    const f = makeAnim(a, n, { warn, baseBottom: (node) => { node.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(node); const inv = group.matrixWorld.clone().invert(); return b.clone().applyMatrix4(inv).min.y - box.min.y; } });
    if (f) anims.push({ n, f });
  }
  const nodes = [...new Set(anims.map((a) => a.n))];
  const base = new Map(nodes.map((n) => [n, { p: n.position.clone(), q: n.quaternion.clone(), s: n.scale.clone(), v: n.visible }]));
  const lightUps = buildLights(recipe.light ?? recipe.lights, body, st.parts, warn, 1);
  const anchors = {};
  for (const [name, p] of Object.entries(recipe.anchors || {})) if (Array.isArray(p)) { const a = new THREE.Object3D(); a.position.set(...arr3(p)); a.name = 'anchor:' + name; body.add(a); anchors[name] = a; }
  for (const [id, n] of Object.entries(st.parts)) if (!anchors[id]) anchors[id] = n;
  function update(t) {
    for (const n of nodes) { const b = base.get(n); n.position.copy(b.p); n.quaternion.copy(b.q); n.scale.copy(b.s); n.visible = b.v; }
    for (const a of anims) a.f(t, a.n);
    for (const u of lightUps) u(t);
  }
  update(0);
  return { group, body, parts: st.parts, update, anchors, box, scale: k, count: st.count, lights: lightUps.length };
}

// ── placement ────────────────────────────────────────────────────────────────────────────────────────────────────
// find a built item of the scene by ref ('ref:NAME', 'NAME', 'cast:0', 'objects:3'); ctx.S is the scene under construction
function itemOf(ctx, who) {
  const S = ctx.S; if (!S || who == null) return null;
  const w = String(who);
  if (S.byRef[w]) return S.byRef[w];
  if (S.byRef['ref:' + w]) return S.byRef['ref:' + w];
  if (S.byRef['cast:' + w]) return S.byRef['cast:' + w];
  const m = /^cast:(\d+)$/.exec(w);
  if (m && Array.isArray(ctx.spec?.cast)) { const e = ctx.spec.cast[+m[1]]; if (e && S.byRef['ref:' + (e.ref || e.id)]) return S.byRef['ref:' + (e.ref || e.id)]; }
  return null;
}
const figOf = (it) => it?.res?.figure || it?.res?.fig || null;
// hand frame: the recipe's origin at the palm, +Z along the fingers (the arm's extension), +Y out of the thumb side
const HOLD_ROT = new THREE.Matrix4().makeRotationX(PI / 2);
export function handMatrix(fig, side = 'right', out = new THREE.Matrix4()) {
  const r = String(side).toLowerCase().startsWith('l') ? 'L' : 'R', B = fig.rig.B, s = fig.rig.s;
  const hb = B['hand' + r]; hb.updateWorldMatrix(true, false);
  const off = new THREE.Matrix4().makeTranslation((r === 'R' ? 0.018 : -0.018) * s, -0.078 * s, 0.014 * s);
  return out.copy(hb.matrixWorld).multiply(off).multiply(HOLD_ROT);
}

export const CATALOG = {
  'prop.build': {
    desc: 'THE GENERIC PROP BUILDER (safety net): ANY named object built from a recipe of primitives (box, cylinder, cone, sphere, capsule, torus, lathe, tube, extrude, plane, pole/bamboo, rope, spike, group) with material presets, groups with pivots, animations on cue times (rotate, translate, open, spring, pendulum, swing, spin, shake, fall, show/hide), an optional light (spot/point with a visible beam cone) and placement on the ground / in a figure\'s hand / on another item. Or `preset`: pistol_m1911 rifle_m16 rifle_ak47 grenade grenade_mk2 flashlight flashlight_angle syringe field_phone padlock crossbow bamboo_cage spiked_mace scalpel forceps punji_stake radar_scope radar_ppi. Never skip or swap a named object: build it. A radar / oscilloscope / any CRT screen = preset radar_scope (A-scope trace + target spike) or radar_ppi (round sweep + blips), drawn as real animated graphics: never a glowing disc from parts.',
    params: {
      at: '[x, z]', heading: 'deg: the prop\'s +Z front faces it', preset: 'a named recipe (see desc) - params below override it',
      parts: '[Part] - Part = {shape, mat, color, id, pos [x,y,z], rot [x,y,z] deg, scale, ...shape params, repeat|ring|sphere|grid|jitter}',
      shapes: 'box size [w,h,d] bevel | cylinder r|[rTop,rBot] h axis x|y|z | from+to | cone r h | spike r h (base at 0, tip up) | sphere r scale | capsule r h | torus r tube arc axis | lathe points [[r,y]] | tube points [[x,y,z]] r | extrude outline [[x,y]] depth bevel holes axis | plane size [w,h] | pole from to r nodes | rope from to r sag | group id pivot parts',
      copies: 'repeat {n, step [x,y,z], rot_step} | ring {n, r, axis, start, arc, face out|none} | sphere {n, r} (outward spikes) | grid {n [nx,nz], step [sx,sz]} | jitter {pos, rot, seed}',
      mat: 'metal steel gunmetal chrome brass copper gold iron wood dark_wood bamboo rope cloth canvas rubber plastic olive glass rust bone leather paper stone earth ceramic white black light(emissive); + color #hex, roughness, metalness, emissive, glow, opacity',
      anim: '[{part: id, type: rotate (axis, keys [[t, deg]]) | translate (keys [[t, [x,y,z]]]) | open (axis, angle, t, dur) | spring (axis, from, to, t, freq, damp) | pendulum (axis, from, length, t, damp) | swing (axis, amp, freq, t) | spin (axis, rate, t) | shake (t [t0,t1], amp, rot, freq) | fall (t, drop, bounce, spin) | show/hide (t, dur) | scale (keys)}]',
      light: '{type spot|point, pos, dir|target, angle deg, penumbra, color, intensity (spot 8), range, cone true (visible beam), beam 0.35, shadow, on true|[t0,t1], flicker 0..1, part}',
      anchors: '{name: [x,y,z]} -> camera target / focus "objects:N.name"; also top, center, base, front',
      size: 'm: the largest dimension (scales the recipe)', scale: 'x', rot: '[x, y, z] deg: the whole prop turned before it is set on the ground', lie: 'true: lying on its side (rot [0, 0, 90])',
      sink: 'm: bury the base (stakes in the ground)', elev: 'm above the ground (only on a surface)',
      hold: '{who: "ref:NAME" | "cast:0" | "objects:N", hand: right|left}: gripped at the recipe origin; +Z along the fingers (barrel / beam), +Y the thumb side',
      on: '"objects:N" | "structures:N.anchor": stands on that item (offset [x,y,z])',
      scope: "radar_scope / radar_ppi only: {trace '#7CFF8A', target 0..1 (A-scope spike range), approach /s (it closes in), blip 0..1, blip_in s, targets [[range 0..1, bearing deg]] (PPI blips), rpm (6), rings, range (150), unit 'MILES', glow, spill 0..4 (green light on the operator, 0.35), labels}"
    },
    footprint: [0.5, 0.5], height: 0.5, anchors: ['top', 'center', 'base', 'front', '<part ids>', '<recipe anchors>'],
    tags: ['prop', 'object', 'build', 'custom', 'recipe', 'generic', 'thing', 'tool', 'weapon', 'item', 'device', 'trap'],
    doc: 'RULES: metres and degrees; +Y up, +Z the front (the side `heading` faces); the recipe is fitted to the ground (its lowest point touches it); real sizes (a syringe 0.16, a pistol 0.21, a rifle 1.0, a cage 1.2, a mace on its tree 4); give moving parts an `id` (a group with a `pivot` rotates about that point); one idea per prop; film props under 0.3 m with an insert camera (keys, "limits": "macro", fov 24-34, 0.35-0.8 m off). A named preset is the quickest (the six below ARE presets: `"preset": "syringe"` etc.); write your own parts for anything else. WORKED RECIPES (as parts): '
      + 'SYRINGE {"kind":"prop.build","lie":true,"parts":[{"shape":"cylinder","r":0.0075,"h":0.075,"axis":"z","mat":"glass"},{"shape":"cylinder","r":0.0062,"h":0.045,"axis":"z","mat":"white","color":"#D8E8F0","opacity":0.7,"pos":[0,0,0.012]},{"shape":"cylinder","r":0.0018,"h":0.05,"axis":"z","mat":"white","pos":[0,0,-0.056]},{"shape":"cylinder","r":0.009,"h":0.003,"axis":"z","mat":"white","pos":[0,0,-0.082]},{"shape":"box","size":[0.03,0.004,0.003],"mat":"white","pos":[0,0,-0.037]},{"shape":"cylinder","r":0.0004,"h":0.035,"axis":"z","mat":"chrome","pos":[0,0,0.062]}]} | '
      + 'FIELD TELEPHONE {"parts":[{"shape":"box","size":[0.26,0.2,0.1],"bevel":0.012,"mat":"leather","pos":[0,0.1,0]},{"shape":"cylinder","r":0.02,"h":0.03,"axis":"x","mat":"black","pos":[0.145,0.12,0]},{"shape":"box","size":[0.012,0.06,0.012],"mat":"black","pos":[0.165,0.1,0]},{"shape":"group","id":"handset","pivot":[0,0.23,0],"parts":[{"shape":"capsule","r":0.016,"h":0.16,"axis":"x","mat":"black","pos":[0,0.235,0]},{"shape":"cylinder","r":[0.026,0.02],"h":0.03,"mat":"black","pos":[-0.1,0.225,0]},{"shape":"cylinder","r":[0.024,0.018],"h":0.03,"mat":"black","pos":[0.1,0.225,0]}]},{"shape":"rope","points":[[-0.1,0.21,0.02],[-0.16,0.12,0.08],[-0.1,0.03,0.09],[-0.05,0.1,0.05]],"r":0.004,"mat":"rubber"}]} | '
      + 'PADLOCK that springs open at 1 s {"parts":[{"shape":"box","size":[0.05,0.045,0.02],"bevel":0.006,"mat":"brass","pos":[0,0.0225,0]},{"shape":"group","id":"shackle","pivot":[0.017,0.045,0],"parts":[{"shape":"torus","r":0.017,"tube":0.0035,"arc":180,"mat":"chrome","pos":[0,0.058,0]},{"shape":"cylinder","r":0.0035,"h":0.016,"mat":"chrome","pos":[0.017,0.05,0]},{"shape":"cylinder","r":0.0035,"h":0.016,"mat":"chrome","pos":[-0.017,0.05,0]}]}],"anim":[{"part":"shackle","type":"translate","keys":[[1.0,[0,0,0]],[1.2,[0,0.012,0]]]},{"part":"shackle","type":"rotate","axis":"y","keys":[[1.2,0],[1.6,90]]}]} | '
      + 'CROSSBOW {"parts":[{"shape":"box","size":[0.05,0.05,0.7],"bevel":0.01,"mat":"wood","pos":[0,0,0.05]},{"shape":"tube","points":[[-0.36,0,0.34],[-0.2,0,0.4],[0,0,0.42],[0.2,0,0.4],[0.36,0,0.34]],"r":0.012,"mat":"wood","color":"#5A3A20"},{"shape":"rope","points":[[-0.36,0,0.34],[0,0.012,0.1],[0.36,0,0.34]],"r":0.0025,"mat":"rope"},{"shape":"cylinder","r":0.005,"h":0.36,"axis":"z","mat":"wood","pos":[0,0.03,0.27]},{"shape":"cone","r":0.008,"h":0.03,"axis":"z","mat":"iron","pos":[0,0.03,0.465]}]} | '
      + 'BAMBOO CAGE (1.2 m) {"parts":[{"shape":"pole","mat":"bamboo","r":0.022,"from":[-0.6,0.02,0],"to":[0.6,0.02,0],"repeat":{"n":2,"step":[0,1.05,0]},"pos":[0,0,-0.6]},{"shape":"pole","mat":"bamboo","r":0.022,"from":[-0.6,0.02,0],"to":[0.6,0.02,0],"repeat":{"n":2,"step":[0,1.05,0]},"pos":[0,0,0.6]},{"shape":"pole","mat":"bamboo","r":0.018,"from":[0,0,0],"to":[0,1.1,0],"repeat":{"n":9,"step":[0.15,0,0]},"pos":[-0.6,0,-0.6]},{"shape":"pole","mat":"bamboo","r":0.018,"from":[0,0,0],"to":[0,1.1,0],"repeat":{"n":9,"step":[0.15,0,0]},"pos":[-0.6,0,0.6]},{"shape":"pole","mat":"bamboo","r":0.018,"from":[0,0,0],"to":[0,1.1,0],"repeat":{"n":7,"step":[0,0,0.15]},"pos":[-0.6,0,-0.45]},{"shape":"pole","mat":"bamboo","r":0.018,"from":[0,0,0],"to":[0,1.1,0],"repeat":{"n":7,"step":[0,0,0.15]},"pos":[0.6,0,-0.45]},{"shape":"pole","mat":"bamboo","r":0.02,"from":[-0.6,1.1,0],"to":[0.6,1.1,0],"repeat":{"n":6,"step":[0,0,0.24]},"pos":[0,0,-0.6]}]} | '
      + 'SPIKED MACE dropping from a branch at 1 s {"parts":[{"shape":"pole","from":[-1.3,0,0.1],"to":[-1.1,4.2,0],"r":0.13,"mat":"dark_wood","nodes":0},{"shape":"pole","from":[-1.15,3.45,0.02],"to":[0.45,3.28,0],"r":0.065,"mat":"dark_wood","nodes":0},{"shape":"group","id":"mace","pivot":[0,3.2,0],"parts":[{"shape":"rope","from":[0,3.24,0],"to":[0,1.95,0],"sag":0,"r":0.012,"mat":"rope"},{"shape":"sphere","r":0.22,"mat":"earth","pos":[0,1.72,0]},{"shape":"spike","r":0.012,"h":0.3,"mat":"bamboo","sphere":{"n":34,"r":0.2},"pos":[0,1.72,0]}]}],"anim":[{"part":"mace","type":"pendulum","axis":"x","from":85,"length":1.5,"t":1.0,"damp":0.5}]}',
  },
  'prop.pistol': { desc: 'M1911 .45 ACP pistol (the tunnel rat\'s handgun): blued steel, walnut grips; on the ground/table, or `hold` in a figure\'s hand (or accessories ["pistol"] on a CastDef)', params: { at: '[x, z]', heading: 'deg', hold: '{who, hand}', on: 'objects:N', size: 'm' }, footprint: [0.25, 0.15], height: 0.15, anchors: ['muzzle', 'grip'], tags: ['prop', 'weapon', 'pistol', 'handgun', 'gun', '45', 'colt', 'm1911', 'vietnam', 'ww2'] },
  'prop.rifle': { desc: 'a rifle (variant m16 = M16A1, the US rifle in Vietnam; ak47 = AK-47 with the wooden stock and curved magazine): on the ground, leaning, or `hold`', params: { at: '[x, z]', heading: 'deg', variant: 'm16|ak47', hold: '{who, hand}', on: 'objects:N' }, footprint: [1.0, 0.2], height: 0.3, anchors: ['muzzle', 'grip'], tags: ['prop', 'weapon', 'rifle', 'gun', 'm16', 'ak47', 'vietnam'] },
  'prop.grenade': { desc: 'a hand grenade (variant m26 = the "lemon" frag, olive, spoon + pin ring; mk2 = the WW2 "pineapple"); explode: t -> the blast (fx.grenade_blast) at its position', params: { at: '[x, z]', heading: 'deg', variant: 'm26|mk2', explode: 's: detonation time (optional)', hold: '{who, hand}', on: 'objects:N' }, footprint: [0.1, 0.1], height: 0.11, tags: ['prop', 'weapon', 'grenade', 'explosive', 'frag', 'bomb'] },
  'prop.flashlight': { desc: 'a handheld flashlight with a LIT beam (a spot light + a visible cone in the air): variant straight | angle (the TL-122 angle-head of the US Army); `hold` it in a hand, or lay it on the ground; the one light of a pitch-dark scene', params: { at: '[x, z]', heading: 'deg: where the beam points', variant: 'straight|angle', intensity: 'cd (9)', angle: 'deg half-angle (16)', beam: 'visible cone strength (0.3)', on: 'true | [t0, t1]', hold: '{who, hand}' }, footprint: [0.2, 0.05], height: 0.05, anchors: ['lens'], tags: ['prop', 'flashlight', 'torch', 'light', 'beam', 'lamp', 'dark'] },
};
const KIND_PRESET = { 'prop.pistol': () => 'pistol_m1911', 'prop.rifle': (it) => (/ak/i.test(String(it.variant || '')) ? 'rifle_ak47' : 'rifle_m16'), 'prop.grenade': (it) => (/mk2|pine/i.test(String(it.variant || '')) ? 'grenade_mk2' : 'grenade'), 'prop.flashlight': (it) => (/angle|tl/i.test(String(it.variant || '')) ? 'flashlight_angle' : 'flashlight') };

export async function build(kind, item = {}, ctx = {}) {
  const warn = (m) => (ctx.warnings ? ctx.warnings.push(m) : console.warn('[f3d]', m));
  // the registry merges the catalog's param DOCS into item.params: keep only the spec's own values
  const docs = CATALOG[kind]?.params || {};
  const own = Object.fromEntries(Object.entries(item.params || {}).filter(([k, v]) => v !== docs[k]));
  const P = { ...own, ...item };
  // the recipe: a preset (by kind or `preset`), then the item's own recipe keys on top
  const pname = KIND_PRESET[kind] ? KIND_PRESET[kind](P) : P.preset;
  const pre = pname ? presetOf(pname) : null;
  if (P.preset && !pre) warn(`prop.build: preset '${P.preset}' unknown; building the parts given`);
  const recipe = { ...(pre || {}), ...(Array.isArray(P.parts) ? { parts: P.parts } : {}), ...(P.anim ? { anim: P.anim } : {}), ...(P.anchors ? { anchors: { ...(pre?.anchors || {}), ...P.anchors } } : {}), size: P.size, scale: P.scale, name: P.name || pname };
  if (P.light !== undefined) recipe.light = P.light === false ? null : (pre?.light && typeof P.light === 'object' && !Array.isArray(P.light) ? { ...pre.light, ...P.light } : P.light);
  if (kind === 'prop.flashlight' && recipe.light) recipe.light = { ...recipe.light, ...(P.intensity != null ? { intensity: P.intensity } : {}), ...(P.angle != null ? { angle: P.angle } : {}), ...(P.beam != null ? { beam: P.beam } : {}), ...(P.on != null ? { on: P.on } : {}) };
  const hold0 = P.hold && (typeof P.hold === 'object' || typeof P.hold === 'string');
  const B = buildRecipe(recipe, { warn, rot: hold0 ? null : (Array.isArray(P.rot) ? P.rot : P.lie ? [0, 0, 90] : null) });
  const G = ground(ctx), at = xz(item.at);
  const root = new THREE.Group(); root.name = kind + (recipe.name ? ':' + recipe.name : '');
  root.add(B.group);
  // ground: the lowest point on the ground (nothing floats / sinks), minus `sink`, plus `elev`
  const sink = num(P.sink, 0), elev = num(P.elev, 0);
  B.group.position.y = -B.box.min.y - sink + elev;
  const y0 = G.h(at[0], at[1]);
  root.position.set(at[0], y0, at[1]);
  root.rotation.y = yawFromHeading(item.heading ?? 180);
  // anchors: top / center / base / front of the built box (prop space)
  const bx = B.box, c = bx.getCenter(V3());
  const mk = (name, p) => { if (B.anchors[name]) return; const a = new THREE.Object3D(); a.position.copy(p); a.name = 'anchor:' + name; B.body.add(a); B.anchors[name] = a; };
  B.body.updateMatrix(); const inv = B.body.matrix.clone().invert();       // the box is in the group's frame; anchors live in the body's
  mk('top', V3(c.x, bx.max.y, c.z).applyMatrix4(inv)); mk('center', c.clone().applyMatrix4(inv)); mk('base', V3(c.x, bx.min.y, c.z).applyMatrix4(inv)); mk('front', V3(c.x, c.y, bx.max.z).applyMatrix4(inv));
  const hold = P.hold && typeof P.hold === 'object' ? P.hold : (typeof P.hold === 'string' ? { who: P.hold } : null);
  const onT = (P.on ?? P.place_on) != null && !hold ? String(P.on ?? P.place_on) : null;
  const offset = arr3(P.offset);
  const dims = bx.getSize(V3());
  let fig = null, onIt = null, held = false, warned = false;
  const M = new THREE.Matrix4(), pos = V3(), quat = new THREE.Quaternion(), scl = V3();
  const holdOff = new THREE.Matrix4().makeTranslation(...offset);
  function follow() {
    if (hold) {
      if (!fig) {
        const it = itemOf(ctx, hold.who ?? hold.ref ?? hold.figure);
        fig = figOf(it);
        if (fig) { const h = String(hold.hand || 'right').toLowerCase().startsWith('l') ? 'l' : 'r'; fig.hold = { ...(fig.hold || {}), [h]: 'grip' }; B.group.position.y = 0; }
        else if (!warned) { warned = true; warn(`prop.build: hold.who '${hold.who}' is not a figure of this scene (cast refs build first); left on the ground`); }
      }
      if (fig) {
        handMatrix(fig, hold.hand || 'right', M).multiply(holdOff);
        const rr = arr3(hold.rot).map((v) => v * DEG); if (rr.some((v) => v)) M.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rr)));
        M.decompose(pos, quat, scl); root.position.copy(pos); root.quaternion.copy(quat); held = true;
      }
    } else if (onT) {
      if (!onIt) {
        const [ref, anc] = onT.split(/\.(.+)/);
        const it = itemOf(ctx, ref);
        if (it) { onIt = { it, a: anc && it.res.anchors ? it.res.anchors[anc] : null }; if (anc && !onIt.a) warn(`prop.build: on '${onT}': no anchor '${anc}' (anchors: ${Object.keys(it.res.anchors || {}).join(', ')}); using its top`); }
        else if (!warned) { warned = true; warn(`prop.build: on '${onT}' not found (the item must be listed before this prop, or be a structure)`); }
      }
      if (onIt) {
        const r = onIt.it.res.root; r.updateMatrixWorld(true);
        if (onIt.a && onIt.a.isObject3D) onIt.a.getWorldPosition(pos);
        else { const b = new THREE.Box3().setFromObject(r); b.getCenter(pos); pos.y = b.max.y; }
        root.position.set(pos.x + offset[0], pos.y + offset[1], pos.z + offset[2]);
      }
    }
  }
  // the item's own time-cued extras: a grenade that explodes, etc. (hooks for the kits)
  const extras = [];
  if (pre && pre.crt) {                           // a scope preset: the CRT face as real graphics (crtscope.js)
    const C = pre.crt, so = P.scope && typeof P.scope === 'object' ? P.scope : {};
    const pick = (k) => (so[k] !== undefined ? so[k] : P[k]);
    const sc = makeScopeFace({ mode: C.mode, r: C.r, trace: pick('trace'), target: pick('target'), approach: pick('approach'), blip: pick('blip'), blip_in: pick('blip_in'), targets: pick('targets'), rpm: pick('rpm'), rings: pick('rings'), range: pick('range'), unit: pick('unit'), glow: pick('glow'), spill: pick('spill'), labels: pick('labels'), seed: num(P.seed, 3) });
    sc.group.position.set(...arr3(C.pos)); if (Array.isArray(C.rot)) sc.group.rotation.set(...arr3(C.rot).map((v) => v * DEG));
    B.body.add(sc.group); extras.push({ update: (t) => sc.update(t) });
  }
  if (kind === 'prop.grenade' && P.explode != null && Number.isFinite(+P.explode)) { const bl = makeBlast(ctx, { t: +P.explode, size: num(P.blast_size, 1), follow: root, hide: B.group, surface: P.surface }); (ctx.scene || root).add(bl.root); extras.push(bl); }
  patchAll(root, ctx);
  const res = {
    root, radius: Math.max(0.05, Math.hypot(dims.x, dims.z) / 2), height: Math.max(0.02, dims.y),
    footprint: [Math.max(0.05, dims.x), Math.max(0.05, dims.z)],
    anchors: { ...B.anchors, body: B.body },
    update(t, clock, camera) { B.update(t); follow(); for (const e of extras) e && e.update && e.update(t, clock, camera); },
    recipe: { parts: B.count, lights: B.lights, scale: B.scale },
  };
  if (hold || onT) { res.snapped = true; res.contact = false; }
  if (onT) res.ownOn = true;                 // aboard.js leaves it alone
  return res;
}
