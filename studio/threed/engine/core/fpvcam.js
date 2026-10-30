// fpvcam.js — Legion 3D v3 FPV camera (WP1, V3_SPEC 2.1), registered by camera.js exactly like spacecam.js.
//   FPV_TEMPLATES   freefall_follow, chase, proximity_pass, orbit_reveal, fpv_line, cloud_tunnel: direct templates (pure
//                   functions of t), C2 paths (wcam.js nspline / glide2), smoothstep speed profiles whose peak stays
//                   <= 1.5 x their mean, the lens eased toward the subject, the roll from the LATERAL ACCELERATION of the
//                   real path (a coordinated turn: roll = atan(gain x a_right / g), soft-clamped to camera.bank_max,
//                   default 18, max 30, low-passed) — never a constant roll. They fly under qa.js FPV_LIMITS (no lift
//                   bumps, no fitSpeed shortening: a breach is re-planned wider (relax) or reported, never crawled).
//   FPV_CAMERA_DOC  move -> one-line doc for the catalog (the director reads it).
//   makeDesigned    the designed layers riding on the base path like shake: camera.whip [{t, yaw, dur, back}] (a smear
//                   pan used as an in-shot cut) and camera.zoom [{t, fov, dur, ease}] (a crash / snap zoom). QA measures
//                   the base path (cam.kin); render.py's frame check skips their windows.
//   fpvProbe        FPV only: a moving item (an aircraft, a falling bomb) is tested as the boxes of its own meshes in its
//                   own frame (margin 0.35 m) instead of the probe's cylinder of its radius (a 30 m C-130 was a 40 m
//                   wide, 13 m tall drum no chase could come near).
//   occludeOf       transition.out {kind: 'occlude', by, frames}: {t0, owners} for qa.js's occlusion-wipe exception.
//   fpvKeys / bankFn / diveBank   camera.profile 'fpv' on move keys (a C2 spline in time through the keys), on
//                   fpv_flythrough and on fpv_dive (the bank from lateral acceleration instead of the 7 / 6.5 deg clamp).
// A spec that uses none of this builds exactly what it built before (camera.js calls in only for FPV moves / keys).
import * as THREE from 'three';
import { clamp, lerp, smooth, smoother, deg, rng } from '../lib/shared/util.js';
import { glide2, nspline, hermiteTable } from './wcam.js';
import { FPV_LIMITS, VEG_ABOVE } from './qa.js';

const UP = [0, 1, 0], GACC = 9.81;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const num = (v, d) => (v !== null && v !== '' && Number.isFinite(+v) ? +v : d);
const vec3 = (v, d) => (Array.isArray(v) && v.length >= 3 ? [num(v[0], d[0]), num(v[1], d[1]), num(v[2], d[2])] : d.slice());
const fmt = (v, d = 1) => (+v).toFixed(d);
// eased progress that never stops: velocity k at both ends, peak (1.5 - 0.5 k) x the mean (memory: camera-move-easing)
const ease = (u, k = 0.3) => { u = clamp(u); return k * u + (1 - k) * smooth(u); };
// rotate v about the world up axis by a (radians, compass sense: +a turns north -> east)
const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c]; };
const azDir = (azDeg) => [Math.sin(azDeg * deg), 0, -Math.cos(azDeg * deg)];
function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// Catmull-Rom (C1) through samples at a fixed rate: a smooth reading of a sampled track
function crTrack(samples, t0, hz) {
  const n = samples.length;
  return (t) => {
    const g = (t - t0) * hz;
    if (g < 0 || g > n - 1) { const e = g < 0 ? 0 : n - 1, o = g < 0 ? 1 : n - 2, out = new Array(samples[e].length); for (let i = 0; i < out.length; i++) out[i] = samples[e][i] + (samples[e][i] - samples[o][i]) * Math.abs(g - e); return out; }   // carried on linearly
    const f = clamp(g, 0, n - 1.000001), k = Math.floor(f), u = f - k;
    const p0 = samples[Math.max(0, k - 1)], p1 = samples[k], p2 = samples[Math.min(n - 1, k + 1)], p3 = samples[Math.min(n - 1, k + 2)];
    const u2 = u * u, u3 = u2 * u, out = new Array(p1.length);
    for (let i = 0; i < p1.length; i++) out[i] = 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u3);
    return out;
  };
}

// an item's track outside the shot: most movers clamp t < 0 to their start (parked until t = 0, then 65 m/s at once):
// a lagged chase or the bank's low-pass reaching back across t = 0 saw a speed step (roll rate 115 deg/s, jerk 83 at
// t = 0 in the first chase render). Where the samples outside [0, D] are (nearly) still while the item moves inside,
// they are replaced by its own motion carried on at the end velocity (mean over 0.2 s), C1 at the seam.
function fixEnds(smp, T0, HZ, D) {
  const n = smp.length, k0 = clamp(Math.round(-T0 * HZ), 0, n - 1), k1 = clamp(Math.round((D - T0) * HZ), 0, n - 1), w = Math.max(2, Math.round(0.2 * HZ));
  const spd = (a, b) => (b > a ? len(sub(smp[b], smp[a])) * HZ / (b - a) : 0);
  // velocity + acceleration at the seam from three samples 0.25 s apart (one-sided, 2nd order): the carried-on motion is
  // C2 there (a turning aircraft keeps turning, no step in its lateral acceleration)
  const carry = (kS, dirK) => {
    const q = Math.max(1, Math.round(0.25 * HZ)), d = q / HZ, p0 = smp[kS], p1 = smp[kS + dirK * q], p2 = smp[kS + 2 * dirK * q];   // 0.25 s apart: a turn is carried, a fast wobble mostly not
    const v = mul(add(add(mul(p0, -3), mul(p1, 4)), mul(p2, -1)), dirK / (2 * d)), a = mul(add(sub(p0, mul(p1, 2)), p2), 1 / (d * d));
    return (k) => { const tau = (k - kS) / HZ; return add(add(p0, mul(v, tau)), mul(a, 0.5 * tau * tau)); };
  };
  if (k0 > 2 && k0 + w < n) {
    const vin = spd(k0, k0 + w), vout = spd(0, k0);
    if (vin > 1 && vout < 0.3 * vin) { const f = carry(k0, 1); for (let k = 0; k < k0; k++) smp[k] = f(k); }
  }
  if (k1 < n - 3 && k1 - w >= 0) {
    const vin = spd(k1 - w, k1), vout = spd(k1, n - 1);
    if (vin > 1 && vout < 0.3 * vin) { const f = carry(k1, -1); for (let k = k1 + 1; k < n; k++) smp[k] = f(k); }
  }
  return smp;
}

// a view direction low-passed in time (Gaussian, sigma s, 60 Hz samples, re-normalised): the pilot's reaction. A glance
// that would snap (the aim point swinging abeam of a compact tower at 3 m: 694 deg/s2) becomes a bounded turn
// (a 90 deg change: <= ~350 deg/s2 at sigma 0.25 s)
function smoothDir(dirFn, T0, T1, sigma = 0.25) {
  const HZ = 60, ta = T0 - 3 * sigma - 0.1, n = Math.ceil((T1 + 3 * sigma + 0.1 - ta) * HZ) + 1, raw = [];
  for (let k = 0; k < n; k++) raw.push(dirFn(ta + k / HZ));
  const sg = sigma * HZ, R = Math.ceil(sg * 3), sm = [];
  for (let k = 0; k < n; k++) { let a = [0, 0, 0]; for (let j = -R; j <= R; j++) { const i = clamp(k + j, 0, n - 1); a = add(a, mul(raw[i], Math.exp(-(j * j) / (2 * sg * sg)))); } sm.push(nrm(a)); }
  const tr = crTrack(sm, ta, HZ);
  return (t) => nrm(tr(t));
}

// a point track low-passed in time (Gaussian, sigma s): what a pilot follows of a subject whose own track is filleted
// from a polyline (bomber_ww2's turns: the curvature steps every ~28 m gave a chase jerk of 80-150 m/s3 every 0.4 s)
// win [wa, wb]: the subject is only sampled inside it and carried on linearly (its edge velocity over 0.2 s) outside, so
// what it did before the shot (parked, a hatch exit kink at t_exit) never leaks into the shot through the filter
function smoothTrack(fn, T0, T1, sigma = 0.3, win = null) {
  const HZ = 30, ta = T0 - 3 * sigma - 0.2, n = Math.ceil((T1 + 3 * sigma + 0.2 - ta) * HZ) + 1, raw = [];
  let f = fn;
  if (win) {
    const [wa, wb] = win, pa = fn(wa), pb = fn(wb), va = mul(sub(fn(wa + 0.2), pa), 5), vb = mul(sub(pb, fn(wb - 0.2)), 5);
    f = (t) => (t < wa ? add(pa, mul(va, t - wa)) : t > wb ? add(pb, mul(vb, t - wb)) : fn(t));
  }
  for (let k = 0; k < n; k++) raw.push(f(ta + k / HZ));
  const sg = sigma * HZ, R = Math.ceil(sg * 3), sm = [];
  for (let k = 0; k < n; k++) { let a = [0, 0, 0], w = 0; for (let j = -R; j <= R; j++) { const i = k + j; if (i < 0 || i >= n) continue; const g = Math.exp(-(j * j) / (2 * sg * sg)); a = add(a, mul(raw[i], g)); w += g; } sm.push(mul(a, 1 / w)); }
  return crTrack(sm, ta, HZ);
}

// ── bodies: where a target REALLY is (3D, incl. height: a falling bomb, a plane at 1900 m), in its own frame ─────────
// {name, owner, it, center(t), origin(t), toWorld(t, lp), toLocal(t, p), axes(t) -> {x, y, z} unit, fwd(t) (travel or
// nose, unit), box {min, max} (frame-local metres), hull [{min, max}] (per mesh), L (long side), B, H, moving}
// Frame-local is the item's own frame (its anchors.body when it drives one, else its root): +Z = its nose for vehicles
// and aircraft, +X = its LEFT. Semantic offsets [right, up, forward] convert with sem().
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _b = new THREE.Box3(), _v = new THREE.Vector3();
const CACHE = new WeakMap();
function findItem(S, k) {
  if (!k || typeof k !== 'string' || k === 'stage') return null;
  return S.byRef[k] || S.byRef['ref:' + k.replace(/^ref:/, '')] || S.byRef[k.replace(/^ref:/, 'cast:')] || null;
}
export function bodyOf(P, target) {
  const S = P.S, D = P.D, T0 = -2.75, T1 = D + 2.0, HZ = 30;     // a 1.5 s chase lag + the bank's 0.8 s look-back + the 0.25 s pre-roll
  let key = Array.isArray(target) ? JSON.stringify(target) : String(target ?? 'stage');
  let it = target && target.res ? target : null;
  let anchorName = null;
  if (!it && typeof target === 'string') {
    it = findItem(S, target);
    if (!it) { const m = /^(.+)\.([A-Za-z_]\w*)$/.exec(target); if (m && findItem(S, m[1])) { it = findItem(S, m[1]); anchorName = m[2]; } }
  }
  if (it) key = `${it.section}:${it.index}${anchorName ? '.' + anchorName : ''}`;
  let byS = CACHE.get(S); if (!byS) { byS = new Map(); CACHE.set(S, byS); }
  const ck = key + '|' + D;
  if (byS.has(ck)) return byS.get(ck);
  let B;
  if (!it) {
    // a point or the stage: a still frame at that point
    const pt = P.ptOf ? P.ptOf(Array.isArray(target) ? target : 'stage') : { center: () => [0, 1.5, 0], top: 2 };
    const c0 = pt.center(0);
    if (typeof target === 'string' && target !== 'stage') P.warnings && P.warnings.push(`camera.target '${target}' not found; flying round the stage`);
    B = fixedBody(c0, pt.top || 2, key);
  } else B = itemBody(P, it, anchorName, T0, T1, HZ);
  byS.set(ck, B);
  return B;
}
function fixedBody(c, top, name) {
  const box = { min: [-1, -c[1] + c[1] - top * 0.5, -1], max: [1, top * 0.5, 1] };
  const ax = { x: [-1, 0, 0], y: [0, 1, 0], z: [0, 0, -1] };   // +Z north (a nose pointing north), +X west (its left)
  return { name, owner: null, it: null, moving: false, box, hull: null, L: 2, B: 2, H: top, center: () => c.slice(), origin: () => c.slice(), axes: () => ax, fwd: () => [0, 0, -1],
    toWorld: (t, lp) => [c[0] - lp[0], c[1] + lp[1], c[2] - lp[2]], toLocal: (t, p) => [c[0] - p[0], p[1] - c[1], c[2] - p[2]], vel: () => [0, 0, 0] };
}
function itemBody(P, it, anchorName, T0, T1, HZ) {
  const r = it.res, A = r.anchors || {}, owner = `${it.section}:${it.index}`, name = `${owner} ${it.kind}`;
  const n = Math.ceil((T1 - T0) * HZ) + 1, tAt = (k) => T0 + k / HZ;
  const isCast = it.section === 'cast' || it.figure || typeof r.members === 'function';
  const upd = (t) => { try { r.update && r.update(t, t); } catch (e) { /* */ } r.root.updateMatrixWorld(true); };
  let meshes = 0; if (r.root && r.root.traverse) r.root.traverse((o) => { if (o.isMesh) meshes++; });
  // a figure / a crowd / an anchor / a mesh-less builder with positionAt: a point track; the frame from its travel.
  // Everything else is RIGID (vehicles have positionAt too, but a bomber is its wings, not a 17 m drum: it3 passed its
  // wingtip 19 m out because the body was a point + radius)
  if (isCast || anchorName || (typeof r.positionAt === 'function' && !meshes)) {
    let cen;
    if (typeof r.positionAt === 'function' && !anchorName) {
      const smp = []; for (let k = 0; k < n; k++) { const q = r.positionAt(tAt(k)); smp.push(q && q.isVector3 ? [q.x, q.y, q.z] : [+q[0], +q[1], +q[2]]); }
      cen = crTrack(fixEnds(smp, T0, HZ, P.D), T0, HZ);
    } else {
      const pt = P.ptOf(anchorName ? `${owner}.${anchorName}` : owner), smp = [];
      for (let k = 0; k < n; k++) smp.push(pt.center(tAt(k)));
      cen = crTrack(fixEnds(smp, T0, HZ, P.D), T0, HZ);
    }
    // the track point of a figure is its FEET (pointOf / positionAt): measure its visible meshes at t = 0 so the body's
    // centre is its real middle (REVIEW_1 fix round: an orbit "at the king's centre" looked at his knees and cut the crown;
    // a freefall pass aimed at an astronaut's hips ended between its legs)
    let H = clamp(r.height ?? 1.85, 0.3, 400), rad = clamp(r.radius ?? 0.4, 0.2, 400), cy = 0;
    try {
      upd(0); const vb = new THREE.Box3(), bb = new THREE.Box3();
      r.root.traverse((o) => {
        if (!(o.isMesh || o.isSkinnedMesh) || o.isPoints || o.isSprite || !o.geometry) return;
        for (let q = o; q; q = q.parent) if (q.visible === false) return;
        const mt = Array.isArray(o.material) ? o.material[0] : o.material; if (mt && mt.transparent && (mt.opacity ?? 1) < 0.35) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); if (!o.geometry.boundingBox || o.geometry.boundingBox.isEmpty()) return;
        bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); const e = bb.getSize(new THREE.Vector3()); if (Math.max(e.x, e.y, e.z) > 600) return;
        vb.union(bb);
      });
      const p0 = cen(0);
      if (!vb.isEmpty() && vb.max.y - vb.min.y > 0.3 && Math.abs((vb.min.y + vb.max.y) / 2 - p0[1]) < 50) {
        H = clamp(vb.max.y - vb.min.y, 0.3, 400); cy = (vb.min.y + vb.max.y) / 2 - p0[1];
        rad = clamp(Math.max(vb.max.x - vb.min.x, vb.max.z - vb.min.z) / 2, 0.2, 400);
      }
    } catch (e) { /* the builder's own height */ }
    if (cy) { const c1 = cen; cen = (t) => { const q = c1(t); return [q[0], q[1] + cy, q[2]]; }; }
    const hd = (it.item?.heading ?? 0);
    const vel = (t) => mul(sub(cen(t + 0.05), cen(t - 0.05)), 10);
    const fwd = (t) => { const v = vel(t), h = [v[0], 0, v[2]]; return len(h) > 1 ? nrm(h) : azDir(hd); };
    const axes = (t) => { const z = fwd(t), x = cross(UP, z); return { x: nrm(x), y: UP, z }; };   // +X = left of the travel
    const o0 = cen(0);
    const toWorld = (t, lp) => { const a = axes(t), c = cen(t); return add(add(add(c, mul(a.x, lp[0])), mul(a.y, lp[1])), mul(a.z, lp[2])); };
    const toLocal = (t, p) => { const a = axes(t), d = sub(p, cen(t)); return [dot(d, a.x), dot(d, a.y), dot(d, a.z)]; };
    const moving = len(sub(cen(Math.min(P.D, 2)), o0)) > 0.3 || len(sub(cen(P.D), o0)) > 0.3;
    return { name, owner, it, moving, box: { min: [-rad, -H * 0.5, -rad], max: [rad, H * 0.5, rad] }, hull: null, L: rad * 2, B: rad * 2, H,
      center: cen, origin: cen, axes, fwd, vel, toWorld, toLocal };
  }
  // a rigid item: its frame object (anchors.body when it drives one inside a still root, else the root) sampled at 30 Hz
  const fo = A.body && A.body.isObject3D ? A.body : r.root;
  const E = [];
  for (let k = 0; k < n; k++) { upd(tAt(k)); fo.updateWorldMatrix(true, false); E.push(fo.matrixWorld.elements.slice()); }
  upd(0); fo.updateWorldMatrix(true, false);
  // the hull: every mesh's box in the frame (metres), at t = 0
  _mi.copy(fo.matrixWorld).invert();
  const sx = new THREE.Vector3(), sq = new THREE.Quaternion(), sp = new THREE.Vector3(); fo.matrixWorld.decompose(sp, sq, sx);
  const hull = [], box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  r.root.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh) || o.isPoints || !o.geometry) return;
    for (let q = o; q; q = q.parent) if (q.visible === false) return;
    const mt = Array.isArray(o.material) ? o.material[0] : o.material;
    if (mt && mt.transparent && (mt.opacity ?? 1) < 0.35) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingBox || g.boundingBox.isEmpty()) return;
    _m.multiplyMatrices(_mi, o.matrixWorld);
    _b.copy(g.boundingBox).applyMatrix4(_m);
    const mn = [_b.min.x * sx.x, _b.min.y * sx.y, _b.min.z * sx.z], mx = [_b.max.x * sx.x, _b.max.y * sx.y, _b.max.z * sx.z];
    const ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    if (!(ext > 0.15) || ext > 600) return;
    hull.push({ min: mn, max: mx, name: o.name || o.parent?.name || 'part' });
    for (let i = 0; i < 3; i++) { box.min[i] = Math.min(box.min[i], mn[i]); box.max[i] = Math.max(box.max[i], mx[i]); }
  });
  if (!hull.length) { const rr = clamp(r.radius ?? 2, 0.3, 400), hh = clamp(r.height ?? 2, 0.3, 400); box.min = [-rr, 0, -rr]; box.max = [rr, hh, rr]; }
  const O = crTrack(fixEnds(E.map((e) => [e[12], e[13], e[14]]), T0, HZ, P.D), T0, HZ);
  const Xs = crTrack(E.map((e) => [e[0], e[1], e[2]]), T0, HZ), Ys = crTrack(E.map((e) => [e[4], e[5], e[6]]), T0, HZ), Zs = crTrack(E.map((e) => [e[8], e[9], e[10]]), T0, HZ);
  const axes = (t) => { const z = nrm(Zs(t)); let x = Xs(t); x = nrm(sub(x, mul(z, dot(x, z)))); const y = cross(z, x); return { x, y, z }; };
  const toWorld = (t, lp) => { const a = axes(t), o = O(t); return add(add(add(o, mul(a.x, lp[0])), mul(a.y, lp[1])), mul(a.z, lp[2])); };
  const toLocal = (t, p) => { const a = axes(t), d = sub(p, O(t)); return [dot(d, a.x), dot(d, a.y), dot(d, a.z)]; };
  const cl = [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2];
  const center = (t) => toWorld(t, cl);
  const vel = (t) => mul(sub(O(t + 0.05), O(t - 0.05)), 10);
  const fwd = (t) => { const v = vel(t); return len(v) > 1 ? nrm(v) : axes(t).z; };
  const o0 = O(0), moving = len(sub(O(Math.min(P.D, 2)), o0)) > 0.3 || len(sub(O(P.D), o0)) > 0.3;
  const ex = [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]];
  return { name, owner, it, moving, box, hull: hull.length ? hull : null, L: Math.max(ex[0], ex[2]), B: Math.min(ex[0], ex[2]), H: ex[1],
    center, origin: O, axes, fwd, vel, toWorld, toLocal };
}
const sem = (r) => [-r[0], r[1], r[2]];                     // [right, up, forward] -> frame-local (+X = left)

// distance from a frame-local point to the hull (0 inside)
function hullDist(B, lp) {
  let best = Infinity;
  for (const h of B.hull || [B.box]) {
    const dx = Math.max(h.min[0] - lp[0], 0, lp[0] - h.max[0]), dy = Math.max(h.min[1] - lp[1], 0, lp[1] - h.max[1]), dz = Math.max(h.min[2] - lp[2], 0, lp[2] - h.max[2]);
    best = Math.min(best, Math.hypot(dx, dy, dz));
  }
  return best;
}

// the points QA projects to decide whether the subject is readable in frame (qa.js fpvSceneQA): its box corners and
// centre plus the centres of its biggest mesh boxes (a wing, a spire), world space at t
function subjPts(B) {
  const bx = B.box, mid = (q) => [(q.min[0] + q.max[0]) / 2, (q.min[1] + q.max[1]) / 2, (q.min[2] + q.max[2]) / 2];
  const loc = [mid(bx)];
  for (let i = 0; i < 8; i++) loc.push([i & 1 ? bx.max[0] : bx.min[0], i & 2 ? bx.max[1] : bx.min[1], i & 4 ? bx.max[2] : bx.min[2]]);
  if (B.hull) { const hs = [...B.hull].sort((a, b) => (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]) - (a.max[0] - a.min[0]) * (a.max[1] - a.min[1]) * (a.max[2] - a.min[2])); for (const q of hs.slice(0, 12)) loc.push(mid(q)); }
  return { at: (t) => loc.map((lp) => B.toWorld(t, lp)), box: (t) => loc.slice(1, 9).map((lp) => B.toWorld(t, lp)) };
}

// the REAL surface along a ray (the item's visible, opaque meshes at time t; world metres from `from`, or null): an
// occlusion wipe must END a few cm in front of the skin, never inside it (single-sided meshes are see-through from
// inside: it2's last freefall frame showed the inside of Fat Man's box tail, the tunnel flew through the tail ring)
const _ray = new THREE.Raycaster();
function surfaceDist(B, t, from, dir, maxD = 60) {
  const r = B.it && B.it.res; if (!r || !r.root) return null;
  try { r.update && r.update(t, t); } catch (e) { /* */ }
  r.root.updateMatrixWorld(true);
  _ray.set(new THREE.Vector3(from[0], from[1], from[2]), new THREE.Vector3(dir[0], dir[1], dir[2]).normalize());
  _ray.near = 0; _ray.far = maxD;
  // meshes only: a Sprite (an exhaust glow) needs Raycaster.camera and threw inside the Halifax (comp1: the template
  // crashed and the planner fell back to a flyover)
  const list = []; r.root.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && !o.isSprite && !o.isPoints && !o.isLine && !o.isInstancedMesh) list.push(o); });
  let hits = []; try { hits = _ray.intersectObjects(list, false); } catch (e) { return null; }
  for (const h of hits) {
    const o = h.object; if (!(o.isMesh || o.isSkinnedMesh) || o.isPoints || o.isLine || o.isSprite) continue;
    let vis = true; for (let q = o; q; q = q.parent) if (q.visible === false) { vis = false; break; }
    if (!vis) continue;
    const mt = Array.isArray(o.material) ? o.material[0] : o.material;
    if (mt && (mt.transparent && (mt.opacity ?? 1) < 0.5 || mt.visible === false || mt.colorWrite === false)) continue;
    return h.distance;
  }
  return null;
}
const SKIN_END = 0.15;                                      // the lens stops this far from the skin on the last frame (near plane 0.05)
// where a line (frame-local from + s x dir) first enters the QA probe's `inside` for this body at time t — the test QA
// itself runs (a solidAt hull like WP4's Halifax, or the FPV mesh boxes); null when it never does within maxS
function probeEntry(P, B, t, fromL, dirL, maxS, step = 0.02) {
  if (!P.probe || typeof P.probe.check !== 'function') return null;
  for (let s2 = 0; s2 <= maxS; s2 += step) {
    let q; try { q = P.probe.check(B.toWorld(t, add(fromL, mul(dirL, s2))), t, FPV_LIMITS.margin); } catch (e) { return null; }
    if (q && q.inside && (!B.owner || String(q.insideOwner ?? q.inside).split(/[ #]/)[0] === B.owner)) return s2;
  }
  return null;
}

// ── FPV probe: moving items as their own mesh boxes (V3_SPEC 2.1: proximity passes 1-3 m from a wing / a hull) ──────
export function fpvProbe(probe, P) {
  if (!probe || probe.__fpv) return 0;
  probe.__fpv = true;
  const hulls = [];
  for (const it of P.S.items) {
    if (!it.moving || it.figure || it.label || it.section === 'cast' || typeof it.res.members === 'function') continue;
    if (typeof it.res.solidAt === 'function') continue;               // ships: camera.js refineProbe tests their hull
    let B = null; try { B = bodyOf(P, it); } catch (e) { B = null; }
    if (!B || !B.hull) continue;
    hulls.push({ name: `${it.section}:${it.index} ${it.kind}`, B });
  }
  if (!hulls.length) return 0;
  const names = new Set(hulls.map((h) => h.name));
  if (Array.isArray(probe.dyn)) for (let i = probe.dyn.length - 1; i >= 0; i--) if (names.has(probe.dyn[i].name)) probe.dyn.splice(i, 1);
  const base = probe.check;
  probe.check = (p, t, m) => {
    const out = base(p, t, m);
    const M = m ?? FPV_LIMITS.margin;
    for (const h of hulls) {
      const B = h.B, lp = B.toLocal(t, p), bx = B.box;
      if (lp[0] < bx.min[0] - M || lp[0] > bx.max[0] + M || lp[1] < bx.min[1] - M || lp[1] > bx.max[1] + M || lp[2] < bx.min[2] - M || lp[2] > bx.max[2] + M) continue;
      for (const q of B.hull) {
        if (lp[0] > q.min[0] - M && lp[0] < q.max[0] + M && lp[1] > q.min[1] - M && lp[1] < q.max[1] + M && lp[2] > q.min[2] - M && lp[2] < q.max[2] + M) {
          const top = B.toWorld(t, [(q.min[0] + q.max[0]) / 2, q.max[1], (q.min[2] + q.max[2]) / 2])[1];
          if (!out.inside || top >= out.insideTop) { out.inside = `${h.name} ${q.name}`; out.insideTop = top; out.insideOwner = B.owner; }
          break;
        }
      }
    }
    return out;
  };
  return hulls.length;
}

// ── the occlusion wipe: transition.out {kind: 'occlude', by, frames 3..10} -> {t0, owners, by, frames} ───────────────
export function occludeOf(spec, S, D) {
  const x = spec && spec.transition && spec.transition.out;
  if (!x || typeof x !== 'object' || x.kind !== 'occlude') return null;
  const frames = clamp(Math.round(num(x.frames, 6)), 3, 10);
  const it = findItem(S, typeof x.by === 'string' ? x.by.replace(/\..*$/, '') : null);
  const owners = new Set(); if (it) owners.add(`${it.section}:${it.index}`);
  return { t0: D - frames / 30, owners, by: x.by ?? null, frames, owner: it ? `${it.section}:${it.index}` : null };
}

// ── timing: a smooth speed profile over [T0, T1] -> s(t) (arc length) ──────────────────────────────────────────────
// shape(x) = (k0 + (1-k0) smooth(x / xi)) x (k1 + (1-k1)(1 - smooth((x - 1 + xo) / xo))): starts at k0, ends at k1 of the
// cruise speed, eased (C1 speed = C2 path); peak/mean stays <= 1.3 for k >= 0.5. vc given (m/s) or L (m) to cover.
function timeline(T0, T1, o) {
  const k0 = clamp(num(o.k0, 0.7), 0.2, 1), k1 = clamp(num(o.k1, 1), 0.2, 1), xi = clamp(num(o.xi, 0.35), 0.05, 0.9), xo = clamp(num(o.xo, 0.35), 0.05, 0.9);
  const shape = (x) => (k0 + (1 - k0) * smooth(x / xi)) * (k1 + (1 - k1) * (1 - smooth((x - (1 - xo)) / xo)));
  const N = 480, Tt = T1 - T0, xs = [], A = [0];
  for (let i = 0; i <= N; i++) xs.push(i / N);
  for (let i = 1; i <= N; i++) { const a = xs[i - 1], b = xs[i]; A.push(A[i - 1] + (b - a) * (shape(a) + 4 * shape((a + b) / 2) + shape(b)) / 6); }
  const mean = A[N];
  const vc = o.vc != null ? o.vc : (o.L ?? 0) / (Tt * mean);
  const ts = xs.map((x) => T0 + x * Tt), ss = A.map((a) => a * Tt * vc + (o.s0 ?? 0)), vs = xs.map((x) => vc * shape(x));
  const sAt = hermiteTable(ts, ss, vs);
  const vAt = (t) => vc * shape(clamp((t - T0) / Tt));
  const tOfS = (s) => { let lo = T0 - 5, hi = T1 + 5; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (sAt(m) < s) lo = m; else hi = m; } return (lo + hi) / 2; };
  return { sAt, vAt, vc, total: ss[N] - (o.s0 ?? 0), peakOverMean: 1 / mean, tOfS };
}

// capTimeline: the same smooth profile along the ARC LENGTH, held under a speed cap per metre (FPV_LIMITS: 1.6 x the
// ground clearance below 60 m, x 0.92) by a soft minimum and a Gaussian low-pass along the path, so the line keeps its
// shape and only its timing changes ("re-time, never re-shape"). vc given: cruise speed (the line may end early or
// continue straight); else vc is solved so the line takes exactly [T0, T1] (when the cap allows). sPin/tPin: arc length
// sPin is reached at tPin (the pass point of proximity_pass).
function capTimeline(pathAt, Ltot, T0, T1, o) {
  const Tt = T1 - T0, k0 = clamp(num(o.k0, 0.7), 0.2, 1), k1 = clamp(num(o.k1, 1), 0.2, 1), xi = 0.35, xo = 0.35;
  const shape = (x) => (k0 + (1 - k0) * smooth(x / xi)) * (k1 + (1 - k1) * (1 - smooth((x - (1 - xo)) / xo)));
  const Smax = 2.5 * Ltot + 80, N = 900, ds = Smax / N, cap = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) cap[i] = o.cap ? Math.max(0.3, o.cap(pathAt(i * ds))) : 1e5;
  const capHi = Math.max(5, (() => { const a = []; for (let i = 0; i <= Math.min(N, Math.round(Ltot / ds)); i++) a.push(Math.min(cap[i], 150)); a.sort((x, y) => x - y); return a[Math.floor(a.length * 0.35)] ?? 150; })());   // a low-quantile cap: the speed scale the smoothing works at
  const build = (vc) => {
    // the speed is smoothed over ~0.4 s of flight (sigma >= 0.4 vc metres: a cap dip over one tree crown braked inside
    // 4 m = jerk 76-96 m/s3); the cap is eroded (a running min over 2 sigma) first so the smoothed profile stays under it
    const sgm = Math.max(3, 0.03 * Ltot, 0.25 * Math.min(vc, capHi)), sg = sgm / ds, R = Math.ceil(sg * 3), R2 = Math.ceil(sg * 1.2);
    const capE = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) { let m = Infinity; for (let j = -R2; j <= R2; j++) m = Math.min(m, cap[clamp(i + j, 0, N)]); capE[i] = m; }
    const v = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) { const a = vc * shape(Math.min(1, i * ds / Ltot)), b = capE[i]; v[i] = 1 / Math.pow(Math.pow(a, -4) + Math.pow(b, -4), 0.25); }
    const vs = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) { let a = 0, w = 0; for (let j = -R; j <= R; j++) { const q = clamp(i + j, 0, N), g = Math.exp(-(j * j) / (2 * sg * sg)); a += v[q] * g; w += g; } vs[i] = Math.min(a / w, cap[i]); }
    const ts = [0]; for (let i = 1; i <= N; i++) ts.push(ts[i - 1] + ds * 2 / (vs[i - 1] + vs[i]));
    return { vs, ts };
  };
  let vc = o.vc, B = null, capped = false;
  if (vc == null) {
    let lo = 0.2, hi = 400;
    for (let it = 0; it < 40; it++) { const m = Math.sqrt(lo * hi), b = build(m), tL = b.ts[Math.round(Ltot / ds)]; if (tL > Tt) lo = m; else hi = m; }
    vc = hi; B = build(vc); capped = B.ts[Math.round(Ltot / ds)] > Tt * 1.02;
    // capped: the cruise only has to reach what the cap allows (REVIEW_1: the note printed the 400 m/s search bound)
    if (capped) { let vm = 0; for (let i = 0; i <= Math.round(Math.min(Smax, Ltot) / ds); i++) vm = Math.max(vm, cap[i]); vc = Math.min(vc, Math.max(0.5, vm / Math.max(0.2, Math.min(k0, k1)))); B = build(vc); }
  } else B = build(vc);
  // o.even (e.g. 1.45): the speed over the shot peaks at most that many times its mean (the founder's guardrail): where the cap
  // slows the line over trees or roofs, the cruise comes down to it instead of rushing between them (keys over a village
  // went 41 -> 9 -> 23 m/s: peak 2.2 x the mean, jerk 63 at the braking)
  if (o.even > 1) {
    const ratio = (b) => { let i = 0, pk = 0; while (i < N && b.ts[i + 1] <= Tt) { pk = Math.max(pk, b.vs[i]); i++; } const sT = i * ds + (i < N ? (Tt - b.ts[i]) * b.vs[i] : 0); return pk / Math.max(1e-6, sT / Tt); };
    for (let it = 0; it < 40 && ratio(B) > o.even; it++) { vc *= 0.93; B = build(vc); }
    if (o.vc == null) capped = B.ts[Math.round(Ltot / ds)] > Tt * 1.02;
  }
  const shift = o.sPin != null ? o.tPin - B.ts[Math.round(o.sPin / ds)] : T0;
  const tt = Array.from(B.ts, (x) => x + shift), ss = Array.from({ length: N + 1 }, (_, i) => i * ds);
  const sAt = hermiteTable(tt, ss, Array.from(B.vs));
  const vPeak = Math.max(...B.vs.slice(0, Math.round(Math.min(Smax, Ltot) / ds) + 1));
  const capHit = Array.from(B.vs).some((x, i) => i * ds <= Ltot && x < vc * shape(Math.min(1, i * ds / Ltot)) * 0.9);
  return { sAt, vc, capped, capHit, vPeak, tOfS: (sv) => B.ts[clamp(Math.round(sv / ds), 0, N)] + shift, total: sAt(T1) - sAt(T0), tNeed: B.ts[clamp(Math.round(Ltot / ds), 0, N)] };
}
// liftLine: when a capped line cannot be flown in its time (REVIEW_1: fpv_line flew 71 of 148 m, the planned rise over
// the church never came), the LOW stretches are lifted to the clearance the needed speed asks for (1.6 x clearance x
// 0.9), as one smooth field along the arc (a running max then a Gaussian, sigma >= 12 m), and the line is re-fitted
// C2 through dense samples. The plan view and the order of the waypoints stay; only the heights where it ran low change.
function liftLine(P, path, Tt, o = {}) {
  const L = path.total, n = Math.max(8, Math.ceil(L / Math.max(2.5, L / 90)) + 1), step = L / (n - 1), cap = speedCap(P);   // even samples (a 0.3 m last segment bent the end tangent)
  const vNeed = (o.k ?? 1.25) * L / Tt, kx = 0.9 * FPV_LIMITS.speedK;
  const raw = new Float64Array(n), pts = [];
  for (let i = 0; i < n; i++) {
    const p = path.at(i * step); pts.push(p);
    const c = cap(p), clr = c >= 1e4 ? Infinity : c / kx;
    raw[i] = Number.isFinite(clr) ? Math.max(0, vNeed / kx - clr) : 0;
  }
  // the field must stay C2-gentle at FPV speed: jerk ~ |y'''| v^3 <= 60 m/s3 asks sigma >= ~(1.4 A v^3 / 60)^(1/3); a
  // running max over 2 sigma first, so the smoothed field still covers every low point
  let pk0 = 0; for (let i = 0; i < n; i++) pk0 = Math.max(pk0, raw[i]);
  const sgM = Math.max(25, 0.22 * L, Math.cbrt(1.4 * pk0 * vNeed * vNeed * vNeed / 40));
  const sg = sgM / step, R = Math.ceil(sg * 2), R3 = Math.ceil(sg * 3), mx = new Float64Array(n), lift = new Float64Array(n);
  for (let i = 0; i < n; i++) { let m = 0; for (let j = -R; j <= R; j++) m = Math.max(m, raw[clamp(i + j, 0, n - 1)]); mx[i] = m; }
  for (let i = 0; i < n; i++) { let a = 0, w = 0; for (let j = -R3; j <= R3; j++) { const g = Math.exp(-(j * j) / (2 * sg * sg)); a += mx[clamp(i + j, 0, n - 1)] * g; w += g; } lift[i] = a / w; }
  for (let i = 0; i < n; i++) lift[i] *= 1.06;                              // the smoothed plateau sits a few % under its raw peak
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, lift[i]);
  if (peak < 0.3) return null;
  const P2 = pts.map((p, i) => [p[0], p[1] + lift[i], p[2]]);
  return { path: glide2(P2), peak, vNeed };
}
// the speed cap per point: the clearance exactly as qa.js measures it (the probe: roofs, solids, and over the trees the
// treetops: the first fpv_line render broke 1.6 x the 11 m over the treetops while the ground said 20 m), x 0.9 headroom
const speedCap = (P, L = FPV_LIMITS) => (p) => {
  let clr = p[1] - P.G(p[0], p[2]);
  if (P.probe && typeof P.probe.check === 'function') {
    try { const q = P.probe.check(p, 0, L.margin); if (Number.isFinite(q.clearance)) clr = q.clearance > VEG_ABOVE && Number.isFinite(q.veg) && q.veg < q.clearance ? Math.max(0, q.veg) : q.clearance; } catch (e) { /* the ground alone */ }
  }
  return clr < L.nearGround ? 0.9 * L.speedK * Math.max(0.5, clr) : 1e5;
};

// ── bank: roll from the lateral acceleration of the real path (a coordinated turn), soft-clamped, low-passed ──────────
// roll(t) = -bmax tanh(atan(gain x a_right / g) / bmax) on the Gaussian-low-passed (sigma 0.2 s) lateral acceleration.
// three.js rotateZ(+) lifts the right side: turning right (a_right > 0) banks right = negative roll.
export function bankFn(posFn, dirFn, T0, T1, bmaxDeg = 18, gain = 0.6, o = {}) {
  const HZ = 60, ta = T0 - 0.8, n = Math.ceil((T1 + 0.8 - ta) * HZ) + 1, h = 1 / HZ;
  const bm = clamp(bmaxDeg, 0, 30) * deg;
  if (bm <= 0) return () => 0;
  const ar = new Float64Array(n), wt = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const t = clamp(ta + k * h, T0 + h, T1 - h), p0 = posFn(t - h), p1 = posFn(t), p2 = posFn(t + h);   // held at the shot's ends (a template's parked pre-roll is no turn)
    const a = [(p2[0] - 2 * p1[0] + p0[0]) / (h * h), (p2[1] - 2 * p1[1] + p0[1]) / (h * h), (p2[2] - 2 * p1[2] + p0[2]) / (h * h)];
    const f = dirFn(t), r = cross(f, UP), rl = len(r);
    wt[k] = smooth((rl - 0.08) / 0.2);                     // looking straight up / down: no defined bank, fade it out
    ar[k] = rl > 1e-4 ? dot(a, mul(r, 1 / rl)) : 0;
  }
  const sig = (o.sigma ?? 0.2) * HZ, R = Math.ceil(sig * 3), sm = new Float64Array(n);
  for (let k = 0; k < n; k++) { let s = 0, w = 0; for (let j = -R; j <= R; j++) { const i = clamp(k + j, 0, n - 1), g = Math.exp(-(j * j) / (2 * sig * sig)); s += ar[i] * wt[i] * g; w += g; } sm[k] = s / w; }
  let rl = new Float64Array(n); for (let k = 0; k < n; k++) { const raw = Math.atan(gain * sm[k] / GACC); rl[k] = -bm * Math.tanh(raw / bm); }
  // the roll RATE soft cap (o.rateCap deg/s; chase 0.8 x FPV_LIMITS.rollRate): a slew limiter run forward and backward,
  // its corners rounded by a 0.12 s Gaussian, repeated until the rate holds (an S-bend's bank change becomes a ramp at
  // the cap instead of a flip). Only the moves that pass it (chase, the levelling tail) are touched
  if (o.rateCap > 0) {
    const cap = o.rateCap * deg / HZ, s2 = 0.12 * HZ, R2 = Math.ceil(s2 * 3);
    for (let pass = 0; pass < 6; pass++) {
      let mr = 0; for (let k = 1; k < n; k++) mr = Math.max(mr, Math.abs(rl[k] - rl[k - 1]));
      if (mr <= cap) break;
      const a = Float64Array.from(rl), c2 = cap * 0.9;
      for (let k = 1; k < n; k++) a[k] = clamp(a[k], a[k - 1] - c2, a[k - 1] + c2);
      for (let k = n - 2; k >= 0; k--) a[k] = clamp(a[k], a[k + 1] - c2, a[k + 1] + c2);
      const b = new Float64Array(n);
      for (let k = 0; k < n; k++) { let s = 0, w = 0; for (let j = -R2; j <= R2; j++) { const i = clamp(k + j, 0, n - 1), g = Math.exp(-(j * j) / (2 * s2 * s2)); s += a[i] * g; w += g; } b[k] = s / w; }
      rl = b;
    }
  }
  // o.level: [t0, t1] -> the roll eases to 0 over that window (fern levels the horizon before the hidden cut)
  if (o.level) { const [l0, l1] = o.level; for (let k = 0; k < n; k++) rl[k] *= 1 - smooth((ta + k * h - l0) / Math.max(0.05, l1 - l0)); }
  const roll = new Array(n); for (let k = 0; k < n; k++) roll[k] = [rl[k]];
  const tr = crTrack(roll, ta, HZ);
  return (t) => tr(t)[0];
}
const bankMax = (c) => clamp(num(c.bank_max, FPV_LIMITS.bankMax ?? 18), 0, 30);

// turn a view direction by yaw (about world up) and pitch (about the camera's right)
function turnDir(d, yaw, pitch) {
  let f = rotY(d, yaw);
  if (pitch) { let r = cross(f, UP); const rl = len(r); r = rl > 1e-4 ? mul(r, 1 / rl) : [1, 0, 0]; const u = cross(r, f); f = nrm(add(mul(f, Math.cos(pitch)), mul(u, Math.sin(pitch)))); }
  return f;
}
// screen framing: put the aim point at aim [x, y] (half-frame units, +x right, +y up) and pitch up by lookUp deg
function framed(dir, aim, lookUp, fov) {
  const tv = Math.tan(fov * deg / 2), th = tv * 16 / 9;
  const yaw = aim ? -Math.atan(-num(aim[0], 0) * th) : 0, pitch = (aim ? -Math.atan(num(aim[1], 0) * tv) : 0) + (lookUp || 0) * deg;
  return yaw || pitch ? turnDir(dir, yaw, pitch) : dir;
}
// slow, smooth life (< 0.6 Hz): three incommensurate sines per axis
function lifeNoise(seed) {
  const R = rng(seed >>> 0), ph = Array.from({ length: 12 }, () => R() * 2 * Math.PI), w = (f) => 2 * Math.PI * f;
  return (t) => [0.6 * Math.sin(w(0.23) * t + ph[0]) + 0.4 * Math.sin(w(0.41) * t + ph[1]), 0.6 * Math.sin(w(0.19) * t + ph[2]) + 0.4 * Math.sin(w(0.37) * t + ph[3]),
    0.6 * Math.sin(w(0.17) * t + ph[4]) + 0.4 * Math.sin(w(0.31) * t + ph[5]), Math.sin(w(0.11) * t + ph[6]) * 0.7 + Math.sin(w(0.27) * t + ph[7]) * 0.3];
}
function seedOf(P) { return (hashStr(JSON.stringify(P.cam?.target ?? 'stage')) ^ Math.imul((P.seed ?? 1) | 0, 2654435761) ^ (P.level || 0) * 7919) >>> 0; }
function out(P, extra) { return { keys: [], times: [[P.T0, 0], [P.T1, 0]], lookFn: null, bank: false, limits: FPV_LIMITS, noBumps: true, ...extra }; }
const sideSign = (P, def) => (P.sideName === 'left' ? -1 : P.sideName === 'right' ? 1 : def);

// ── freefall_follow ─────────────────────────────────────────────────────────────────────────────────────────────────
// The camera shares the subject's world fall (any speed, 53 m/s): position = subject(t) + an offset in the subject's
// frame [side, up, back] (default [3, 1.5, 7]) that orbits (<= 40 deg, eased) and drifts in (drift_in 0..1: the subject
// grows toward the lens; 1 with transition.out occlude by the target = it passes the lens in the last frames). The lens
// looks at the subject (aim [x, y] places it on screen, look_up tilts the view up), wobble 0..1 = slow smooth life
// (+-0.35 m, +-3 deg roll, < 0.5 Hz). Speed and turn are measured relative to the shared fall: a 53 m/s fall reads 1-3 m/s.
// GROUND (REVIEW_1: the camera rode a bomb into the terrain, clearance -37 m): the subject's impact time is found at plan
// time; when the camera would come within hStop + the flare distance of the ground inside the shot, it FLARES (fern C4):
// its share of the fall eases to zero (smootherstep, jerk <= ~40 m/s3) so it stops >= hStop over the ground while the
// subject keeps falling and drops out of the bottom of the frame (the lens stays mostly level).
// The drift-in pass (REVIEW_1: back-loaded, speed peak 3.0 x mean): an even approach from t = 0 (eased start, then a
// constant speed vc >= the speed the occlusion window needs); when the asked distance is too short for that, the lens
// starts farther away (reported) — transition.out frames 10 halves that.
function T_freefall(P) {
  const { D, T0, T1, K } = P, c = P.cam || {}, Tt = T1 - T0;
  const B = bodyOf(P, c.target ?? 'stage');
  const relv = vec3(c.rel ?? c.offset, [3, 1.5, 7]).map((v) => v * K.dist);
  const F0 = (() => { const f = B.fwd(0); const hz = [f[0], 0, f[2]]; return len(hz) > 0.2 ? nrm(hz) : nrm([B.axes(0).z[0], 0, B.axes(0).z[2]]); })();
  const R0 = nrm(cross(F0, UP));
  const o0 = add(add(mul(R0, relv[0]), mul(UP, relv[1])), mul(F0, -relv[2]));
  let d0 = Math.max(0.8, len(o0));
  const n0 = mul(o0, 1 / len(o0));
  const orbit = clamp(num(c.orbit, 0), -40, 40) * deg;
  const dIn = clamp(num(c.drift_in, 0), 0, 1);
  const wob = clamp(num(c.wobble, 0.35), 0, 1);
  const fov = clamp(num(c.fov, 42), 14, 100);
  const occ = P.occ && B.owner && P.occ.owners.has(B.owner) ? P.occ : null;
  let pass = dIn >= 0.95 && !!occ;
  const LIM = FPV_LIMITS;
  // a figure (a point body: a jumper, an astronaut) is framed and entered at its CHEST, not its hips (the first astronaut
  // pass ended between its legs with the fields showing under the crotch)
  const chestUp = !B.hull && B.H > 1 ? clamp(num(c.chest, 0.18), -0.4, 0.45) * B.H : 0;
  const C0 = B.center, C = chestUp ? (t) => add(C0(t), [0, chestUp, 0]) : C0;
  const CS = smoothTrack(C, T0 - 1, T1 + 0.5, 0.3, [T0, T1]);
  // ── the ground: impact time of the subject, and the flare that keeps the camera clear of the terrain ──
  const Gat = (p) => P.G(p[0], p[2]);
  const baseH = Math.max(0.3, -B.box.min[1]);                               // centre -> its lowest point (frame-local)
  let tImp = null; for (let t = 0; t <= D + 1e-6; t += 1 / 30) { const q = C0(t); if (q[1] - baseH <= Gat(q) + 0.3) { tImp = t; break; } }
  const vyAt = (t) => (CS(t + 0.05)[1] - CS(t - 0.05)[1]) * 10;
  const thAt = (t) => orbit * ease((t - T0) / Tt, 0.55);
  // first guess of the camera height (no flare, no wobble) to find the flare start
  const camY0 = (t, dd) => add(CS(t), mul(rotY(n0, thAt(t)), dd));
  let tf = null, Tf = 0, hStop = 0;
  {
    const vf = Math.max(0, -vyAt(clamp(tImp ?? D, 0, D) * 0.6));
    hStop = Math.max(30, vf / (0.9 * LIM.speedK) + 4, LIM.clearFast + Math.abs(relv[1]) + 2);
    Tf = clamp(vf / 18, 1.0, 3.0);
    const need = hStop + 0.55 * vf * Tf;
    const hAt = (t) => { const p = camY0(t, d0 * (pass ? 0.5 : 1)); return p[1] - Gat(p); };
    if (vf > 3 && hAt(T1) < need) {
      let lo = T0, hi = T1; if (hAt(T0) < need) { tf = T0; P.warnings.push(`freefall_follow: the camera starts only ${fmt(hAt(T0), 0)} m over the ground at ${fmt(vf, 0)} m/s; it flares from the first frame (start the fall >= ${fmt(need + 20, 0)} m up)`); }
      else { for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (hAt(m) > need) lo = m; else hi = m; } tf = lo; }
    }
    if (tImp != null) P.notes.push(`freefall_follow: ${B.name} reaches the ground at t=${fmt(tImp, 2)} s${tf != null ? `; the camera flares from t=${fmt(tf, 2)} s over ${fmt(Tf, 1)} s and stops >= ${fmt(hStop, 0)} m over the ground (the subject drops away below)` : ''}`);
    else if (tf != null) P.notes.push(`freefall_follow: the camera flares from t=${fmt(tf, 2)} s over ${fmt(Tf, 1)} s, stopping >= ${fmt(hStop, 0)} m over the ground`);
    if (tf != null && pass && tf < D - 0.3) { P.warnings.push(`freefall_follow: ${B.name} reaches the ground before the occlusion pass can happen; the shot ends on the flare (drop transition.out occlude, or start higher)`); pass = false; }
  }
  // the flare: F(t) = how much the camera has NOT fallen since tf (it shares (1 - S5) of the subject's vertical speed)
  let Ftab = null;
  if (tf != null) { const HZ = 120, n = Math.ceil((T1 + 1 - tf) * HZ) + 2, a = new Float64Array(n); let acc = 0; for (let k = 1; k < n; k++) { const t = tf + (k - 0.5) / HZ; acc += smoother((t - tf) / Tf) * Math.max(0, -vyAt(t)) / HZ; a[k] = acc; } Ftab = { a, HZ, n }; }
  const Fl = (t) => { if (!Ftab || t <= tf) return 0; const g = (t - tf) * Ftab.HZ; if (g >= Ftab.n - 1) return Ftab.a[Ftab.n - 1]; const k = Math.floor(g), u = g - k; return Ftab.a[k] + (Ftab.a[k + 1] - Ftab.a[k]) * u; };
  const flK = (t) => (tf == null ? 0 : smoother((t - tf) / Tf));
  let dAt;
  if (pass) {
    // the approach line is the FINAL orbit direction; the lens crosses the hull margin as the wipe window opens (tA) and
    // stops SKIN_END m in front of the real skin on the last frame, the subject filling the frame (never inside it)
    const tA = occ.t0, tE = D - 1 / 30, nE = rotY(n0, orbit * ease((tE - T0) / Tt, 0.3));
    let rHit = 0; if (B.hull) for (let r = 0; r < 12; r += 0.02) { if (hullDist(B, B.toLocal(tA, add(B.center(tA), mul(nE, r)))) > 0) { rHit = r; break; } }
    const far = Math.max(8, rHit + 6), sd = surfaceDist(B, tE, add(C(tE), mul(nE, far)), mul(nE, -1), far + 2);
    const rSurf = sd != null ? far - sd : rHit;
    // the last frame must be ALL subject: the frustum corners + edge midpoints from the end pose must meet its skin within
    // 3 m; the lens goes to 0.08 m from the skin when 0.15 does not cover
    let skinE = SKIN_END, cover = 0, rays = 8;
    if (sd != null) {
      const fW = mul(nE, -1); let rW = cross(fW, UP); rW = len(rW) > 1e-4 ? nrm(rW) : [1, 0, 0]; const uW = cross(rW, fW);
      const tv = Math.tan(fov * deg / 2), th = tv * 16 / 9;
      for (const sk of [SKIN_END, 0.08]) {
        const eW = add(C(tE), mul(nE, rSurf + sk)); let cv = 0;
        for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]) { const dW = nrm(add(add(fW, mul(rW, x * th * 0.98)), mul(uW, y * tv * 0.98))); if (surfaceDist(B, tE, eW, dW, 3) != null) cv++; }
        if (cv > cover) { cover = cv; skinE = sk; }
        if (cover === rays) break;
      }
      if (cover < rays) P.notes.push(`freefall_follow: the last frame is skin on ${cover} of ${rays} frustum rays (aim the pass at a broader part: rel / orbit, or chest)`);
    }
    const dEnd = Math.max(0.12, rSurf + skinE);
    const dA = Math.max(dEnd + 0.12, Math.max(LIM.fig + 0.3, rHit + LIM.margin + 0.05));
    const W = Math.max(1 / 30, tE - tA), vB = (dA - dEnd) / W;
    // an even approach: v(t) = vc (k0 + (1 - k0) smooth((t - T0) / (0.4 Tt))) — peak / mean ~1.06; vc >= vB
    const k0 = 0.72, xi = 0.4 * (tE - T0), Te = tE - T0, m = 1 - (1 - k0) * xi / Te * 0.5;
    const Ish = (x) => (x <= 0 ? 0 : x >= 1 ? x - 0.5 : x * x * x - x * x * x * x / 2);     // integral of smooth over [0, x]
    const Sdist = (t) => { const u = t - T0; return k0 * u + (1 - k0) * (u <= xi ? xi * Ish(u / xi) : (u - xi) + xi * 0.5); };
    let vc = (d0 - dEnd) / (Te * m);
    if (vc < vB) {
      const dNeed = dEnd + vB * Te * m;
      P.notes.push(`freefall_follow: the pass needs ${fmt(vB, 1)} m/s through the ${occ.frames}-frame occlusion window; to keep the approach even (no lunge) the lens starts ${fmt(dNeed, 1)} m off (asked ${fmt(d0, 1)})${occ.frames < 10 ? '; transition.out frames 10 lets it start closer' : ''}`);
      if (occ.frames < 10 && dNeed > 1.4 * d0) P.warnings.push(`freefall_follow: an even drift-in from ${fmt(d0, 1)} m needs transition.out {kind: 'occlude', frames: 10} (it starts ${fmt(dNeed, 1)} m off with ${occ.frames})`);
      d0 = dNeed; vc = vB;
    }
    const sEnd = Sdist(tE);
    dAt = (t) => d0 - (d0 - dEnd) * Sdist(Math.min(t, tE + 1)) / sEnd - (t > tE + 1 ? vc * (t - tE - 1) : 0);
    P.notes.push(`freefall_follow: drift_in 1 + occlude by ${occ.by}: an even approach ${fmt(d0, 1)} -> ${fmt(dA, 2)} m by t=${fmt(tA, 2)} s at ${fmt(vc * k0, 2)} -> ${fmt(vc, 2)} m/s, ends ${fmt(skinE, 2)} m from its skin (${sd != null ? `ray-cast, ${cover}/${rays} frustum rays on skin` : 'hull box'}, ${fmt(dEnd, 2)} m from its ${chestUp ? 'chest' : 'centre'}) on the last frame: the subject fills the lens`);
  } else {
    let dEnd = d0 * (1 - 0.8 * dIn);
    if (dIn >= 0.95 && !occ) P.warnings.push('camera.drift_in 1 needs transition.out {kind: "occlude", by: <the target>} for the pass through the lens; it stops 1.4 m short');
    dEnd = Math.max(dEnd, LIM.fig + 0.6);
    // an even drift (eased start, then constant), like the pass: the old exponential ease peaked at 1.4-1.6 x its mean
    const k0 = 0.72, xi = 0.4 * Tt, Ish = (x) => (x <= 0 ? 0 : x >= 1 ? x - 0.5 : x * x * x - x * x * x * x / 2);
    const Sd = (t) => { const u = clamp(t - T0, 0, Tt + 2); return k0 * u + (1 - k0) * (u <= xi ? xi * Ish(u / xi) : (u - xi) + xi * 0.5); };
    const sT = Sd(T1);
    dAt = (t) => d0 - (d0 - dEnd) * Sd(t) / sT;
  }
  const N = lifeNoise(seedOf(P));
  const lookUp = num(c.look_up, 0), aim = Array.isArray(c.aim) ? c.aim : null;
  // the camera falls with the subject's LOW-PASSED track (a jumper's free-fall wobble swung the box centre and banked
  // the lens 16.7 deg in comp1); for the pass it blends onto the real centre over the last ~0.8 s before the window
  const tB = pass ? occ.t0 - 0.8 : Infinity;
  const base = (t) => { const k = smooth((t - tB) / 0.6), b = k <= 0 ? CS(t) : k >= 1 ? C(t) : mix(CS(t), C(t), k); return tf == null ? b : [b[0], b[1] + Fl(t), b[2]]; };
  const posAt = (t) => {
    const n = rotY(n0, thAt(t)), d = dAt(t), z = N(t), fade = smoother(d / 3), Rt = rotY(R0, thAt(t)), Ft = rotY(F0, thAt(t));   // C2 fade (no |d| kink at the pass)
    const w = add(add(mul(Rt, 0.35 * z[0]), mul(UP, 0.25 * z[1])), mul(Ft, 0.3 * z[2]));
    return add(add(base(t), mul(n, d)), mul(w, wob * fade));
  };
  // the look: at the subject; during the flare toward its phantom (where it would be had it flared too), so it falls out
  // of the bottom of the frame instead of dragging the lens straight down
  const lookPt = (t) => (tf == null ? C(t) : mix(C(t), add(C(t), [0, Fl(t), 0]), 0.85 * flK(t)));
  const dirAt = (t) => {
    const n = rotY(n0, thAt(t)), d = dAt(t), p = posAt(t);
    const toS = nrm(sub(lookPt(t), p)), k = smooth((d - 0.7) / 1.4);       // close in: along the approach line (no flip at the pass)
    return framed(nrm(mix(mul(n, -1), toS, k)), aim, lookUp, fov);
  };
  // the bank comes from the camera's own flight round the smooth fall (orbit, drift), never from the subject's wobble
  const CSb = smoothTrack(C, T0 - 1.5, T1 + 1, 0.6, [T0, T1]);
  const posSmooth = (t) => { const n = rotY(n0, thAt(t)), b = CSb(t); return add(tf == null ? b : [b[0], b[1] + Fl(t), b[2]], mul(n, dAt(t))); };
  const bank = bankFn(posSmooth, dirAt, T0, T1, bankMax(c), num(c.bank_gain, 0.6), { rateCap: 0.8 * FPV_LIMITS.rollRate });
  const direct = (t) => { const p = posAt(t), f = dirAt(t); return { pos: p, look: add(p, mul(f, 30)), fov, roll: bank(t) + wob * 3 * deg * N(t)[3] }; };
  // the designed path relative to the shared fall, without the life wobble (a handheld-like layer): the speed profile QA
  const evenPos = (t) => sub(mul(rotY(n0, thAt(t)), dAt(t)), [0, 0, 0]);
  P.notes.push(`freefall_follow: rides ${B.name || 'the stage'} ${fmt(d0)} m off (side ${fmt(relv[0])}, up ${fmt(relv[1])}, back ${fmt(relv[2])}), orbit ${fmt(orbit / deg, 0)} deg, drift_in ${fmt(dIn, 2)}, wobble ${fmt(wob, 2)}; speed measured relative to the shared fall`);
  // relative to the shared (smooth) fall, flare included: the camera's own motion is the orbit + drift
  // the flare's exit is designed (the subject shoots away below): frames after the flare's midpoint + 0.4 s are not
  // counted by the subject-in-frame check
  const sp = subjPts(B), tExit = tf != null ? tf + 0.5 * Tf + 0.4 : Infinity;
  return out(P, { direct, rel: (t) => sub(base(t), base(0)), subjectCenter: C, dofAuto: true, subjPts: { ...sp, at: (t) => (t > tExit ? null : sp.at(t)) }, evenSpeed: true, evenPos });   // subjectCenter: the chest of a figure (focus there)
}

// ── chase ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// A follow of a moving subject (aircraft, car, train, a runner) ON ITS OWN PAST TRACK: the camera is where the subject
// was `back` metres of road / sky ago (by arc length on its low-passed track, + up / side in that track's frame), so it
// drives the same road and flies the same line, swings through the same corners a beat later and banks with them. No
// rigid boom: a boom fixed behind a turning subject swung the lens out and back at every corner (REVIEW_1: a car on a
// gently curving road flipped the bank +17 <-> -20 deg at 207 deg/s and failed QA at every relax level).
// `back` is the TRUE camera-subject distance (the old lag x speed came on top: a fighter 44 m away, 3 % of the frame);
// without offset it is fitted so the subject spans `fill` (0.5) of the frame width at the fov. lag_s is the time this
// back means at the subject's speed (reported; it no longer adds distance). The bank (lateral acceleration of the
// camera's path, low-passed sigma track_sigma >= 0.5 s, roll rate soft-capped at 0.8 x FPV_LIMITS.rollRate). Relax
// raises the smoothing and lowers the bank gain; it never widens the chase (a longer boom only swings harder).
function pastTrack(CS, ta, tb, HZ = 60) {
  const n = Math.ceil((tb - ta) * HZ) + 1, ts = new Float64Array(n), ss = new Float64Array(n);
  let prev = CS(ta), acc = 0;
  for (let k = 0; k < n; k++) { const t = ta + k / HZ, p = CS(t); if (k) acc += len(sub(p, prev)); ts[k] = t; ss[k] = acc; prev = p; }
  const sOf = (t) => { const g = clamp((t - ta) * HZ, 0, n - 1.000001), k = Math.floor(g), u = g - k; return ss[k] + (ss[k + 1] - ss[k]) * u; };
  // the time the track passed arc length s (bisection on the monotone table; flat stretches = a halt: the latest time)
  const tOf = (s) => {
    if (s <= ss[0]) { const v0 = (ss[Math.min(n - 1, HZ)] - ss[0]) || 1e-6; return ta + (s - ss[0]) / (v0 / Math.min(1, (n - 1) / HZ)); }
    let lo = 0, hi = n - 1; if (s >= ss[hi]) return tb;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ss[m] < s) lo = m; else hi = m; }
    const d = ss[hi] - ss[lo]; return ts[lo] + (d > 1e-9 ? (s - ss[lo]) / d : 1) / HZ;
  };
  return { sOf, tOf, total: ss[n - 1] };
}
function T_chase(P) {
  const { D, T0, T1 } = P, c = P.cam || {}, lvl = P.level || 0;
  const B = bodyOf(P, c.target ?? 'stage');
  const fov = clamp(num(c.fov, 50), 14, 100);
  const L = Math.max(1, B.L), H = Math.max(0.5, B.H);
  const kind = B.it?.kind || '';
  const ground = !/^(aircraft|sky|prop\.bomb|para)/.test(kind) && !(B.it && (B.it.flies || B.it.res?.fly));
  // the subject's visible width seen from behind (its frame's x extent; a point body: 2 r), and the fitted distance
  const span = Math.max(0.6, B.box.max[0] - B.box.min[0], 0.8 * H);
  const fill = clamp(num(c.fill, 0.5), 0.15, 0.9), hw = Math.tan(fov * deg / 2) * 16 / 9;
  const minBack = ground ? Math.max(5, 1.3 * Math.max(B.box.max[2] - B.box.min[2], 1)) : Math.max(6, 0.45 * L);
  const fitBack = Math.max(minBack, span / (fill * 2 * hw));
  const offIn = Array.isArray(c.offset) ? vec3(c.offset, [0, 0, fitBack]) : null;
  const back0 = offIn ? Math.max(0.5 * minBack, offIn[2]) : fitBack;
  let up = offIn ? offIn[1] : Math.max(1.2, 0.12 * L + 1);
  const side = offIn ? offIn[0] : 0;
  const sigma = Math.max(0.5, num(c.track_sigma, 0.5)) + 0.15 * lvl;        // relax: a calmer line, never a longer boom
  const gain = num(c.bank_gain, ground ? 0.55 : 0.8) * Math.pow(0.8, lvl);
  const weave = clamp(num(c.weave, 0.03 * back0), 0, 20);
  const close = clamp(num(c.close, 0.12), -0.6, 0.6);                      // fraction of `back` closed over the shot (never a dead hold)
  const N = lifeNoise(seedOf(P));
  const C = B.center;
  const v0 = len(B.vel(D / 2)), vMin = Math.max(0.5, Math.min(v0, len(B.vel(0)), len(B.vel(D))));
  const reach = clamp(back0 * (1 + Math.abs(close)) / vMin + 1, 2, 12);
  const CS = smoothTrack(C, T0 - reach - 1, T1 + 0.5, sigma);
  const moving = B.moving && v0 > 0.5;
  const TR = moving ? pastTrack(CS, T0 - reach, T1 + 0.3) : null;
  const backAt = (t) => back0 * (1 - close * ease((t - T0) / (T1 - T0), 0.3));
  // a ground vehicle at speed: the lens holds FPV clearance above the road (>= 2.5 m + 0.4 above 15 m/s)
  if (ground && moving) {
    const base = C(0)[1] - P.G(C(0)[0], C(0)[2]), need = (v0 > FPV_LIMITS.fastSpeed * 0.9 ? FPV_LIMITS.clearFast : FPV_LIMITS.clear) + 0.45;
    if (base + up < need) { P.notes.push(`chase: up ${fmt(up, 1)} -> ${fmt(need - base, 1)} m (the lens keeps ${fmt(need, 1)} m over the road at ${fmt(v0, 0)} m/s)`); up = need - base; }
  }
  up *= 1 + 0.08 * lvl;
  const fwdS = (t) => { const v = sub(CS(t + 0.05), CS(t - 0.05)); return len(v) > 0.02 ? nrm(v) : B.fwd(t); };
  const carrier = (t) => {
    if (!TR) { const f = B.fwd(0), hz = nrm([f[0], 0, f[2]]); return { p: sub(CS(t), mul(hz, backAt(t))), f: hz }; }
    const ts = TR.tOf(TR.sOf(t) - backAt(t));
    return { p: CS(ts), f: fwdS(ts), ts };
  };
  const posAt = (t) => {
    const q = carrier(t), r = nrm(cross(q.f, UP)), z = N(0.45 * t);
    return add(add(q.p, mul(r, side + weave * z[0])), mul(UP, up + 0.25 * weave * z[1]));
  };
  const lead = num(c.lead, 0.15 * L), lookH = num(c.look_h, 0.1 * H), aim = Array.isArray(c.aim) ? c.aim : null;
  const dirRaw = (t) => framed(nrm(sub(add(add(C(t), mul(B.fwd(t), lead)), mul(UP, lookH)), posAt(t))), aim, num(c.look_up, 0), fov);
  const dirAt = smoothDir(dirRaw, T0, T1, num(c.look_lag, 0.12));
  const bank = bankFn(posAt, dirAt, T0, T1, bankMax(c), gain, { sigma, rateCap: 0.8 * FPV_LIMITS.rollRate });
  const direct = (t) => { const p = posAt(t), f = dirAt(t); return { pos: p, look: add(p, mul(f, 40)), fov, roll: bank(t) }; };
  let dS = 0, dE = 0; { const a = posAt(0), b = posAt(D); dS = len(sub(C(0), a)); dE = len(sub(C(D), b)); }
  const lagS = moving ? back0 / v0 : 0;
  if (c.lag_s != null && moving && Math.abs(num(c.lag_s, lagS) - lagS) > 0.15) P.notes.push(`chase: lag_s ${fmt(num(c.lag_s, 0), 2)} ignored for the distance: ${fmt(back0, 1)} m back = ${fmt(lagS, 2)} s behind at ${fmt(v0, 0)} m/s (the camera rides its past track)`);
  if (!moving) P.notes.push('chase: the target does not move; the camera holds its station behind it');
  P.notes.push(`chase: ${B.name} at ${fmt(v0)} m/s, on its past track ${fmt(back0, 1)} m back (${offIn ? 'asked' : `fitted: ${Math.round(fill * 100)} % of the frame width at fov ${fmt(fov, 0)}`}; ${fmt(lagS, 2)} s behind), ${fmt(up, 1)} m up, ${fmt(side, 1)} m side, distance ${fmt(dS, 1)} -> ${fmt(dE, 1)} m; banks with its turns (<= ${fmt(bankMax(c), 0)} deg, gain ${fmt(gain, 2)}, track sigma ${fmt(sigma, 2)} s, roll rate <= ${fmt(0.8 * FPV_LIMITS.rollRate, 0)} deg/s)`);
  return out(P, { direct, rel: (t) => sub(CS(t), CS(0)), subjectCenter: C, dofAuto: true, subjPts: subjPts(B), evenSpeed: false });
}

// ── proximity_pass ──────────────────────────────────────────────────────────────────────────────────────────────────
// Skim past an object (a wing, a hull, a tower) at `clearance` m (2.5) from its real mesh boxes, at `speed` m/s (18,
// relative to it when it moves), along its `length` (default) or `span`, on its `side` (left|right|over|under), the
// closest point at `pass_at` (0.5 of the shot), coming in on a wider line and leaving on one (`bulge` m) so the drone
// carves (and banks) through the pass; the lens looks along the flight, turned toward the object ahead of the camera
// (`glance` 0..1, 0.5) so it sweeps through one side of the frame; exits continuing. `height` (m above its base) or auto:
// the band where the line can come closest (under a wing, beside a fuselage, mid-tower).
function T_proximity(P) {
  const { D, T0, T1, K, R } = P, c = P.cam || {}, Tt = T1 - T0;
  const B = bodyOf(P, c.target ?? 'stage');
  const bx = B.box, hull = B.hull || [bx];
  const exZ = bx.max[2] - bx.min[2], exX = bx.max[0] - bx.min[0];
  const along = c.along === 'span' ? 'span' : 'length';
  const noseAxis = B.moving || /^(aircraft|vehicle|ship|boat|train|tram)/.test(B.it?.kind || '');      // its length is its nose axis (a wingspan is longer)
  const ax = (along === 'length') === (noseAxis || exZ >= exX) ? 2 : 0, la = ax === 2 ? 0 : 2;
  const sd = typeof c.side === 'string' ? c.side : (R() < 0.5 ? 'left' : 'right');
  const vert = sd === 'over' || sd === 'under';
  const gap = clamp(num(c.clearance ?? c.gap, 2.5), 0.8, 60) * K.dist;
  const speed = clamp(num(c.speed, B.moving ? 8 : 18), 2, 150) * K.spd;    // a moving target overtakes at 8 m/s relative: it stays big for the whole shot
  // +1: toward the item's +axis (its nose). A MOVING target is overtaken by default (dir back): the drone flies a little
  // slower than it, looking where it flies, so the hull slides past overhead / alongside and pulls away AHEAD of the lens
  // (the first render overtook the plane instead and spent the second half of the shot looking at empty sky)
  const dirS = c.dir === 'back' ? -1 : c.dir === 'forward' ? 1 : (B.moving ? -1 : (R() < 0.5 ? -1 : 1));
  // side: the item's own left (+X) / right for a pass along its length; its front (+Z) / back for a pass along its span
  let latSign = vert ? 1 : (sd === 'right' ? -1 : 1);
  let ac = (bx.min[ax] + bx.max[ax]) / 2, Lh = (bx.max[ax] - bx.min[ax]) / 2;
  const mid = (bx.min[1] + bx.max[1]) / 2;
  // the pass station: lateral offset l (along la) and height v (frame y)
  let lPass, vPass;
  const groundMin = (() => { const o = B.toWorld(0, [0, 0, 0]); return B.moving ? -Infinity : (P.G(o[0], o[2]) - o[1]) + 1.6; })();
  if (!vert) {
    // heights round the object's bulk (its volume-weighted centre +- 0.35 of its height): beside a fuselage, not over its fin
    const Hx = bx.max[1] - bx.min[1];
    let vw = 0, vy = 0; for (const q of hull) { const vol = Math.max(1e-3, (q.max[0] - q.min[0]) * (q.max[1] - q.min[1]) * (q.max[2] - q.min[2])); vw += vol; vy += vol * (q.min[1] + q.max[1]) / 2; }
    const bulk = vy / vw;
    // the whole height range incl. under a low / mid wing and its nacelles (a B-17's wing at mid-fuselage blocked every
    // height of the old +-0.35 H band: it2 passed 19 m out, beside the wingtip, the bomber an edge-on sliver)
    // a tall, thin target (a tower, a spire: height > 1.8 x its footprint) is passed BESIDE it, in the band at 40-70 % of
    // its height (REVIEW_1: the auto height picked the spire tip 25.8 m up and the spire left the frame after 1.5 s)
    // a TOWER on a wider building (a church: the parts in its upper 45 % are much narrower than the whole) counts too
    const up = hull.filter((q) => q.max[1] > bx.min[1] + 0.7 * Hx);
    const upW = up.length ? Math.max(Math.max(...up.map((q) => q.max[0])) - Math.min(...up.map((q) => q.min[0])), Math.max(...up.map((q) => q.max[2])) - Math.min(...up.map((q) => q.min[2]))) : Infinity;
    const tall = !B.moving && (Hx > 1.8 * Math.max(exX, exZ) || (Hx > 12 && upW < 0.45 * Math.max(exX, exZ)));
    const want = Number.isFinite(+c.height) ? [bx.min[1] + +c.height] : tall ? Array.from({ length: 13 }, (_, i) => bx.min[1] + Hx * lerp(0.4, 0.7, i / 12)) : Array.from({ length: 29 }, (_, i) => lerp(bx.min[1] - 0.8 * gap, bx.max[1] + 0.3 * gap, i / 28));
    // tower mode: the pass station is the tower's own position along the line (its top parts), and without a side the
    // side where the line comes closest to the tower itself
    let tw = null;
    if (tall) {
      const top = hull.filter((q) => q.max[1] > bx.min[1] + 0.75 * Hx), T = top.length ? top : up;
      if (T.length) tw = { a0: Math.min(...T.map((q) => q.min[ax])), a1: Math.max(...T.map((q) => q.max[ax])), l0: Math.min(...T.map((q) => q.min[la])), l1: Math.max(...T.map((q) => q.max[la])) };
      if (tw) { ac = (tw.a0 + tw.a1) / 2; Lh = Math.max(2, (tw.a1 - tw.a0) / 2); }
    }
    let best = null;
    for (const sgn of (tw && typeof c.side !== 'string') ? [1, -1] : [latSign]) {
      for (const v of want) {
        if (v < groundMin) continue;
        let need = 0;
        for (const q of hull) {
          if (q.max[1] < v - gap || q.min[1] > v + gap) continue;
          need = Math.max(need, sgn > 0 ? q.max[la] + gap : -q.min[la] + gap);
        }
        const toTower = tw ? (sgn > 0 ? need - tw.l1 : need + tw.l0) : need;
        const sc = toTower + 0.12 * Math.abs(v - (tw ? bx.min[1] + 0.55 * Hx : bulk));
        if (!best || sc < best.sc) best = { sc, v, need, sgn };
      }
    }
    if (!best) best = { v: Math.max(groundMin, mid), need: (latSign > 0 ? bx.max[la] : -bx.min[la]) + gap, sgn: latSign };
    latSign = best.sgn;
    if (tw) P.notes.push(`proximity_pass: a tower on ${B.name}: passed beside it at ${fmt(best.v - bx.min[1], 1)} m (${Math.round((best.v - bx.min[1]) / Hx * 100)} % of its height), the closest point at its station`);
    lPass = latSign * best.need; vPass = best.v;
  } else {
    const l0 = num(c.offset, 0);
    let need = sd === 'over' ? -Infinity : Infinity;
    for (const q of hull) { if (q.max[la] < l0 - gap || q.min[la] > l0 + gap) continue; need = sd === 'over' ? Math.max(need, q.max[1] + gap) : Math.min(need, q.min[1] - gap); }
    if (!Number.isFinite(need)) need = sd === 'over' ? bx.max[1] + gap : bx.min[1] - gap;
    if (sd === 'under' && need < groundMin) { P.warnings.push(`proximity_pass: no room under ${B.name}; passing over`); need = bx.max[1] + gap; }
    lPass = l0; vPass = need;
  }
  // the closest point: early for an overtaken target (it then recedes ahead, in frame), late for a still one (the exit,
  // with the object behind the lens, stays short)
  // REVIEW_1 (dead air): an OVERTAKEN target starts with the camera beside its middle (pass_at 0.06: its front half and
  // wings ahead in frame, the tail passes ~1 s in, then it pulls away ahead, in frame); a still target or one the drone
  // overtakes (dir forward) passes at 0.8 of the shot (it is ahead, in frame, for 80 %), +0.03 per relax level
  const passT = clamp(num(c.pass_at, B.moving && dirS < 0 ? 0.06 : 0.8 + 0.03 * (P.level || 0)), 0.0, 0.9) * D;
  const sBefore = Math.max(0.5, speed * (passT - T0)), sAfter = speed * (T1 - passT);
  const bulge = num(c.bulge, Math.max(1.5, 0.12 * Math.min(sBefore, sAfter)));
  const blend = Math.max(6, 0.5 * Math.min(sBefore, sAfter));
  const rise = num(c.rise, 0);
  // the line in frame-local coordinates, sampled from its shape and fitted C2
  // the carve: a convex "U" round the object, C-infinity, no inflection (one bank direction, no flip at the pass):
  // straight along the hull at the gap, curving smoothly out to `bulge` per `blend` m beyond its ends (asymptotically straight)
  const uOut = (a) => { const x = (Math.sqrt((a - ac) * (a - ac) + 0.25) - Lh) / blend, m = (x + Math.sqrt(x * x + 0.1225)) / 2; return bulge * (Math.sqrt(1 + m * m) - 1); };
  const lat = (a) => lPass + Math.sign(lPass || 1) * (vert ? 0 : uOut(a));
  const hgt = (a) => vPass + (vert ? Math.sign(vPass - mid || 1) * uOut(a) : 0) + rise * ((a - ac) * dirS / Math.max(1, sBefore + sAfter));
  const pts = [];
  for (let k = 0; k <= 10; k++) {
    const a = ac + dirS * lerp(-sBefore, sAfter, k / 10);
    const lp = [0, 0, 0]; lp[ax] = a; lp[la] = vert ? lPass : lat(a); lp[1] = hgt(a);
    pts.push(lp);
  }
  const path = glide2(pts);
  const sPass = path.knotS[Math.round(10 * sBefore / (sBefore + sAfter))];
  const tl = capTimeline(B.moving ? path.at : (lp) => B.toWorld(0, lp), path.total, T0, T1, { vc: speed, k0: num(c.ease_in, 0.85), k1: num(c.ease_out, 0.9), sPin: sPass, tPin: passT, cap: B.moving ? null : speedCap(P) });
  if (tl.capHit) P.notes.push(`proximity_pass: slowed to ${fmt(tl.vPeak)} m/s where it runs low (speed <= 1.6 x clearance)`);
  const sAt = (t) => tl.sAt(t);
  const localAt = (t) => path.at(sAt(t));
  const posAt = (t) => B.toWorld(t, localAt(t));
  const glance = clamp(num(c.glance, 0.5), 0, 0.9), ahead = Math.max(6, num(c.ahead, 0.6 * speed));
  const fov = clamp(num(c.fov, 70), 20, 110);
  // the lens looks where the drone really flies (its WORLD velocity: riding a 70 m/s plane at -14 m/s relative it still
  // flies forward at 56 m/s), turned toward the object at the station `ahead` m in front of it in that sense; the turn
  // fades as that point swings abeam or behind (it never chases the closest point: no glance whip at the pass)
  const vItem = B.moving ? len(B.vel(passT)) : 0;
  const fsRel = ax === 2 && B.moving ? (vItem + dirS * speed >= 0 ? 1 : -1) : dirS;          // world-forward along the item axis
  const tanAt = (t) => (B.moving ? nrm(sub(posAt(t + 0.05), posAt(t - 0.05))) : (() => { const lp = localAt(t), lp2 = path.at(sAt(t) + Math.max(2, speed * 0.3)); return nrm(sub(B.toWorld(t, lp2), B.toWorld(t, lp))); })());
  // the subject's bulk (volume-weighted height, box centre in plan): what the lens keeps in frame
  let bw = 0, by = 0; for (const q of hull) { const vol = Math.max(1e-3, (q.max[0] - q.min[0]) * (q.max[1] - q.min[1]) * (q.max[2] - q.min[2])); bw += vol; by += vol * (q.min[1] + q.max[1]) / 2; }
  const bulkL = [(bx.min[0] + bx.max[0]) / 2, by / bw, (bx.min[2] + bx.max[2]) / 2];
  const halfV = Math.min(fov, 2 * Math.atan(Math.tan(fov * deg / 2) * 16 / 9) / deg) / 2, edge = 0.72 * halfV * deg, maxDev = clamp(num(c.keep_dev, 75), 0, 110) * deg;
  const turnToward = (d, to, phi) => { const cs = dot(d, to), pp = sub(to, mul(d, cs)), pl = len(pp); if (pl < 1e-6 || phi <= 0) return d; return nrm(add(mul(d, Math.cos(phi)), mul(pp, Math.sin(phi) / pl))); };
  const dirRaw = (t) => {
    const lp = localAt(t), tanW = tanAt(t), pW = B.toWorld(t, lp);
    const aimA = clamp(lp[ax] + fsRel * ahead, ac - Lh, ac + Lh);
    const al = [0, 0, 0]; al[ax] = aimA; al[la] = vert ? lPass : 0; al[1] = vert ? mid : bulkL[1];   // the glance aims at the bulk, not at the camera's own height (it looked over the wing at the sky)
    const toA = nrm(sub(B.toWorld(t, al), pW));
    const dA = len(sub(B.toWorld(t, al), pW));
    const w = glance * smooth((dot(toA, tanW) + 0.25) / 0.6) * (1 - smooth((dA - 3 * ahead) / (2 * ahead)));
    let d = nrm(mix(tanW, toA, w));
    // keep it in frame: turn toward its bulk until it sits inside 0.72 of the half-fov, never more than keep_dev (75 deg)
    // from the flight; released (eased) once it is far behind (> 150 deg off the flight)
    const toC = nrm(sub(B.toWorld(t, bulkL), pW)), ang = Math.acos(clamp(dot(d, toC), -1, 1));
    const ex = ang - edge, phi0 = ex > -0.3 ? 0.1 * Math.log1p(Math.exp(ex / 0.1)) : 0;          // a soft plus (no kink when it engages)
    const dev = Math.acos(clamp(dot(d, tanW), -1, 1)), rel = 1 - smooth((Math.acos(clamp(dot(tanW, toC), -1, 1)) - 150 * deg) / (25 * deg));
    d = turnToward(d, toC, Math.min(phi0, Math.max(0, maxDev - dev)) * rel);
    return framed(d, null, num(c.look_up, 0), fov);
  };
  const dirAt = smoothDir(dirRaw, T0, T1, num(c.look_lag, 0.25));
  const bank = bankFn(posAt, dirAt, T0, T1, bankMax(c), num(c.bank_gain, 0.45));
  const direct = (t) => { const p = posAt(t), f = dirAt(t); return { pos: p, look: add(p, mul(f, 40)), fov, roll: bank(t) }; };
  // the real closest approach to the hull over the shot
  let dMin = Infinity, tMin = 0; for (let t = 0; t <= D; t += 1 / 30) { const d = hullDist(B, localAt(t)); if (d < dMin) { dMin = d; tMin = t; } }
  P.notes.push(`proximity_pass: ${sd} of ${B.name} along its ${along}, ${fmt(speed)} m/s${B.moving ? ' relative to it' : ''}, closest ${fmt(dMin, 2)} m from its mesh boxes at t=${fmt(tMin, 2)} s (asked ${fmt(gap, 1)} m, line at ${fmt(Math.abs(lPass), 1)} m off its axis, ${fmt(vPass, 1)} m up its frame), bulge ${fmt(bulge, 1)} m`);
  const evenPos = (t) => localAt(t);
  return out(P, { direct, rel: B.moving ? (t) => sub(B.origin(t), B.origin(0)) : undefined, subjectCenter: B.center, dofAuto: false, subjPts: subjPts(B), evenSpeed: !tl.capHit, evenPos });
}

// ── orbit_reveal ────────────────────────────────────────────────────────────────────────────────────────────────────
// A spiral orbit round the subject: radius r0 -> r1 (spiral in by default), `deg` of arc (120; side left = the other way),
// rising `rise` m, starting at azimuth `az`, looking at the subject (+look_h). The angle, radius and height ease with the
// same never-stopping smoothstep (peak 1.225 x the mean angular speed). REVIEW_1 fixes:
//  - CLEAR ARC: the probe is scanned per azimuth (a ray out from the subject at the camera's height): the radius dips
//    smoothly toward the free space near a column or a wall (never below 0.75 x r1 or the figure distance), and without
//    `az` the start azimuth is chosen among 24 so the whole arc stays clear (a hall orbit flew through columns and walls).
//  - INSIDE a room (an interior.* structure round the subject) relax TIGHTENS the radius and shortens the arc; outdoors
//    it widens as before.
//  - CONTEXT: without `az` the arc ends facing the densest structure behind the subject (cam_orbit ended on an empty
//    snowfield), and the lean is capped at 3 deg unless bank_max asks for more (the horizon swung 8 deg).
//  - SPEED: a path too fast for its height (1.6 x clearance) is raised as a whole first (a hall orbit at 1.5 m ran 2.6 m/s).
function T_orbitReveal(P) {
  const { D, T0, T1, K } = P, c = P.cam || {}, Tt = T1 - T0, lvl = P.level || 0;
  const B = bodyOf(P, c.target ?? 'stage');
  const C = B.center, c0 = C(0);
  const inRoom = P.S.items.some((it) => {
    if (!/^interior\./.test(it.kind || '') || !it.res?.root) return false;
    try { it.res.root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(it.res.root); return c0[0] > bb.min.x && c0[0] < bb.max.x && c0[2] > bb.min.z && c0[2] < bb.max.z && c0[1] < bb.max.y; } catch (e) { return false; }
  });
  const kD = inRoom ? 1 / K.dist : K.dist;                                  // indoors relax tightens
  const size = Math.max(1, B.H, 0.5 * B.L);
  const r0 = Math.max(1.2, num(c.r0, 2.2 * size + 2) * kD), r1 = Math.max(1.0, num(c.r1, 0.62 * num(c.r0, 2.2 * size + 2)) * kD);
  const sg = sideSign(P, 1);
  const arc = clamp(num(c.deg ?? c.arc, 120), -300, 300) * sg * (inRoom ? Math.pow(0.85, lvl) : K.arc);
  let h0 = num(c.h0 ?? c.height, 0.12 * r0);
  const rise = num(c.rise, 0.3 * r0);
  const fov = clamp(num(c.fov, 45), 14, 100);
  const lookH = num(c.look_h, 0), aim = Array.isArray(c.aim) ? c.aim : null;
  const LIM = FPV_LIMITS;
  const probeOK = !!(P.probe && typeof P.probe.check === 'function');
  const own = B.owner;
  const solidAt = (p, t) => { if (!probeOK) return false; try { const q = P.probe.check(p, t, LIM.margin); if (q.inside && String(q.insideOwner ?? q.inside).split(/[ #]/)[0] !== own) return true; return q.fig < LIM.fig + 0.25 && q.figName && !String(q.figName).startsWith(own || '#'); } catch (e) { return false; } };
  const uOf = (t) => (t - T0) / Tt;
  const thOf = (az0, t) => az0 + arc * ease(uOf(t), 0.55);
  const rPlan = (t) => lerp(r0, r1, ease(uOf(t), 0.55));
  const yOf = (t, dh = 0) => h0 + dh + rise * ease(uOf(t), 0.3);
  const rMin = Math.max(0.75 * Math.min(r0, r1), LIM.fig + 0.6 + (B.it && B.it.section === 'cast' ? 0.3 : 0));
  // free radius along an azimuth at time t (a ray out from the subject at the camera height, 0.15 m steps)
  const freeR = (th, t, y) => { const dir = azDir(th), cc = C(t); let r = 0.3; for (; r <= Math.max(r0, r1) + 0.6; r += 0.15) if (solidAt(add(add(cc, mul(dir, r)), [0, y, 0]), t)) return r - 0.45; return Infinity; };
  const NS = 48, ts = Array.from({ length: NS + 1 }, (_, i) => T0 + Tt * i / NS), capF = speedCap(P);
  const plan = (az0, dh = 0) => {
    const raw = ts.map((t) => Math.min(rPlan(t), freeR(thOf(az0, t), t, yOf(t, dh))));
    const sgm = 2.2, rs = raw.map((_, i) => { let a = 0, w = 0; for (let j = -7; j <= 7; j++) { const k = clamp(i + j, 0, NS), g = Math.exp(-(j * j) / (2 * sgm * sgm)); a += Math.min(raw[k], rPlan(ts[k])) * g; w += g; } return a / w; });
    // a dip never above the free radius after smoothing: take the soft min again, clamp to rMin
    const r = rs.map((v, i) => Math.max(rMin, Math.min(v, raw[i] + 0.25)));
    let hits = 0, blocked = 0, over = 0;
    const pp = ts.map((t, i) => add(add(C(t), mul(azDir(thOf(az0, t)), r[i])), [0, yOf(t, dh), 0]));
    for (let i = 0; i <= NS; i++) {
      if (solidAt(pp[i], ts[i])) hits++;
      if (i) { const v = len(sub(sub(pp[i], C(ts[i])), sub(pp[i - 1], C(ts[i - 1])))) / (Tt / NS), cp = capF(pp[i]); if (cp < 1e4 && v > cp) over = Math.max(over, (v - cp) / (0.9 * LIM.speedK)); }
    }
    return { r, hits, blocked, over, dip: Math.max(...r.map((v, i) => rPlan(ts[i]) - v)) };
  };
  // context behind the subject at the arc's end: structure volume within +-28 deg of the end view, 8-220 m beyond it
  const boxes = probeOK && Array.isArray(P.probe.boxes) ? P.probe.boxes : [];
  const context = (az0) => {
    const thE = thOf(az0, T1), view = mul(azDir(thE), -1);
    let sc = 0; for (const bb of boxes) { if (!bb.owner || bb.owner === own || !/^structures:/.test(bb.owner)) continue;   // buildings only: a conifer patch is not "the town behind it"
      const m = [(bb.min[0] + bb.max[0]) / 2, (bb.min[2] + bb.max[2]) / 2]; const dx = m[0] - c0[0], dz = m[1] - c0[2], dd = Math.hypot(dx, dz); if (dd < 8 || dd > 220) continue; const cs = (dx * view[0] + dz * view[2]) / dd; if (cs < Math.cos(28 * deg)) continue; sc += Math.cbrt(Math.max(0.1, (bb.max[0] - bb.min[0]) * (bb.max[1] - bb.min[1]) * (bb.max[2] - bb.min[2]))) * (0.5 + cs) / (1 + dd / 80); }
    return sc;
  };
  let az0 = num(c.az, NaN), pl = null;
  if (Number.isFinite(az0)) pl = plan(az0);
  else {
    let best = null;
    for (let k = 0; k < 24; k++) {
      const a0 = P.camAng + k * 15, q = plan(a0), cx = inRoom ? 0 : context(a0);
      const sc = q.hits * 100 + q.dip * 3 + q.over * 1.2 - 4 * Math.log1p(cx / 10) + (k ? 0.01 * k : 0);   // clear first, then a low legal path, then what it ends on
      if (!best || sc < best.sc) best = { sc, a0, q, cx };
    }
    az0 = best.a0; pl = best.q;
    P.notes.push(`orbit_reveal: start azimuth ${fmt(((az0 % 360) + 360) % 360, 0)} deg chosen from 24 (${pl.hits ? `${pl.hits} blocked samples left` : 'the arc is clear'}${inRoom ? ', inside the room' : `, ends facing ${best.cx > 0 ? 'the structure behind it' : 'open ground'}`})`);
  }
  if (pl.dip > 0.2) P.notes.push(`orbit_reveal: the radius dips up to ${fmt(pl.dip, 1)} m toward free space near solids (min ${fmt(Math.min(...pl.r), 1)} m)`);
  const rTab = nspline(ts, pl.r.map((v) => [v]));
  let dh = 0;
  const posAtH = (t, dhh) => add(add(C(t), mul(azDir(thOf(az0, t)), rTab.f(clamp(t, T0, T1))[0])), [0, yOf(t, dhh), 0]);
  // the speed cap: raise the whole height profile until the eased orbit is legal for its clearance (x 0.92 headroom)
  const cap = speedCap(P);
  for (let it = 0; it < 4; it++) {
    let need = 0;
    for (let i = 1; i <= NS; i++) {
      const t = ts[i], h = Tt / NS, v = len(sub(sub(posAtH(t, dh), C(t)), sub(posAtH(t - h, dh), C(t - h)))) / h;
      const cp = cap(posAtH(t, dh)); if (cp < 1e4 && v > cp) need = Math.max(need, (v - cp) / (0.9 * LIM.speedK) + 0.1);
    }
    if (need <= 0.02) break;
    dh += need;
  }
  if (dh > 0.05) P.notes.push(`orbit_reveal: raised ${fmt(dh, 1)} m so its speed stays <= 1.6 x clearance`);
  const posAt = (t) => posAtH(t, dh);
  // outdoors the horizon stays in frame (the context the arc was chosen for): a view pitched below -(half fov - 4 deg) is
  // lifted (soft) by up to 0.7 of the half fov, the subject sitting lower in the frame (cam_orbit ended looking 42 deg down
  // at snow, the village above the frame)
  const half = fov / 2 * deg, pMin = -(half - 4 * deg), liftMax = 0.7 * half, keepH = !inRoom && c.horizon !== false && !aim;
  // headroom: the subject's top (a figure's crown) stays inside the frame (the hall orbit cut the king's crown from 3.3 s
  // on while the camera rose above his head): the view lifts by the excess over (half fov - 4 deg), softly
  const topUp = B.hull ? B.box.max[1] - (B.box.min[1] + B.box.max[1]) / 2 : 0.5 * B.H + 0.12;
  const dirAt = (t) => {
    const p0 = posAt(t);
    let d = nrm(sub(add(C(t), mul(UP, lookH)), p0));
    if (keepH) { const p = Math.asin(clamp(d[1], -1, 1)), ex = pMin - p; if (ex > -0.6) { const lift = Math.min(liftMax, 0.15 * Math.log1p(Math.exp(ex / 0.15))); d = turnDir(d, 0, lift); } }
    if (!aim) {
      const tp = nrm(sub(add(C(t), [0, topUp, 0]), p0)), pd = Math.asin(clamp(d[1], -1, 1)), pt = Math.asin(clamp(tp[1], -1, 1));
      const ex = (pt - pd) - (half - 4 * deg); if (ex > -0.3) d = turnDir(d, 0, Math.min(0.5 * half, 0.06 * Math.log1p(Math.exp(ex / 0.06))));
    }
    return framed(d, aim, num(c.look_up, 0), fov);
  };
  const bank = bankFn(posAt, dirAt, T0, T1, Math.min(bankMax(c), num(c.bank_max, 3)), num(c.bank_gain, 0.1));
  const direct = (t) => { const p = posAt(t), f = dirAt(t); return { pos: p, look: add(p, mul(f, 30)), fov, roll: bank(t) }; };
  const wPeak = Math.abs(arc) * 1.225 / Tt;
  P.notes.push(`orbit_reveal: ${fmt(Math.abs(arc), 0)} deg ${sg > 0 ? 'clockwise' : 'anticlockwise'} round ${B.name || 'the stage'}, r ${fmt(r0)} -> ${fmt(r1)} m${inRoom ? ' (inside a room: relax tightens)' : ''}, rising ${fmt(rise)} m, peak ${fmt(wPeak, 0)} deg/s`);
  const evenPos = (t) => sub(posAt(t), C(t));
  return out(P, { direct, rel: B.moving ? (t) => sub(C(t), C(0)) : undefined, subjectCenter: C, dofAuto: true, subjPts: subjPts(B), evenSpeed: true, evenPos });
}

// ── fpv_line ────────────────────────────────────────────────────────────────────────────────────────────────────────
// The director's free FPV line through waypoints, C2: via = [[x, y, z] | [x, z] (alt m above the ground, default 3) |
// '<ref>' (that item's centre when the camera passes) | {target, offset: [right, up, forward] in its frame} | ...]. With
// frame: '<ref>' the whole line rides that (moving) item: via are [right, up, forward] in its own frame or its anchor
// names ('ramp', 'tail', 'hold'), e.g. under the tail -> into the hatch. speed m/s (cruise; default: fits the line to the
// shot; a longer cover continues straight past the last point), ease_in 0.7 (start speed fraction), look: along the
// flight `look_ahead` s ahead (0.35), turned toward look_at by look_w (0.6), tilt deg (-4 = slightly down).
function T_line(P) {
  const { D, T0, T1, G } = P, c = P.cam || {}, Tt = T1 - T0;
  const via = Array.isArray(c.via) ? c.via : (Array.isArray(c.path) ? c.path : null);
  if (!via || via.length < 2) throw new Error('fpv_line: camera.via needs >= 2 waypoints');
  const FB = c.frame ? bodyOf(P, c.frame) : null;
  const alt = num(c.alt, 3);
  const anchorLocal = (name) => {
    const it = FB && FB.it, A = it && it.res.anchors ? it.res.anchors : {}, a = A[name];
    if (!a) return null;
    if (a.isVector3) return [a.x, a.y, a.z];
    if (a.isObject3D) { const w = a.getWorldPosition(new THREE.Vector3()); return FB.toLocal(0, [w.x, w.y, w.z]); }
    if (Array.isArray(a) && a.length === 3) return a.map(Number);
    return null;
  };
  // waypoint k at time t (world, or frame-local when frame is set)
  const wp = (v, t) => {
    if (FB) {
      if (typeof v === 'string') { const a = anchorLocal(v); if (a) return a; P.warnings.push(`fpv_line: no anchor '${v}' on ${FB.name}`); return [0, 0, 0]; }
      if (Array.isArray(v)) return sem(v.length >= 3 ? v : [v[0], 0, v[1]]);
      if (v && typeof v === 'object') { const a = typeof v.anchor === 'string' ? anchorLocal(v.anchor) : [0, 0, 0]; return add(a || [0, 0, 0], sem(vec3(v.offset, [0, 0, 0]))); }
      return [0, 0, 0];
    }
    if (Array.isArray(v) && v.length >= 3) return v.map(Number);
    if (Array.isArray(v) && v.length === 2) return [+v[0], G(+v[0], +v[1]) + alt, +v[1]];
    if (typeof v === 'string') return bodyOf(P, v).center(t);
    if (v && typeof v === 'object') {
      if (Array.isArray(v.pos)) return v.pos.map(Number);
      if (Array.isArray(v.at)) return [+v.at[0], G(+v.at[0], +v.at[1]) + num(v.alt, alt), +v.at[1]];
      if (v.target) { const b = bodyOf(P, v.target); return b.toWorld(t, add(b.toLocal(t, b.center(t)), sem(vec3(v.offset, [0, 0, 0])))); }
    }
    return [0, 0, 0];
  };
  let tk = via.map((_, i) => lerp(T0, T1, i / (via.length - 1)));
  let path = null, tl = null;
  const vcAsk = Number.isFinite(+c.speed) ? clamp(+c.speed, 0.5, 150) : null;
  for (let it = 0; it < 4; it++) {
    const pts = via.map((v, i) => wp(v, tk[i]));
    path = glide2(pts);
    const po = { vc: vcAsk, k0: num(c.ease_in, 0.7), k1: num(c.ease_out, 1) };
    tl = FB ? timeline(T0, T1, vcAsk != null ? po : { ...po, vc: undefined, L: path.total }) : capTimeline(path.at, path.total, T0, T1, { ...po, cap: speedCap(P), even: 1.45 });   // riding a moving item: relative speed, no ground cap
    tk = path.knotS.map((s) => tl.tOfS(s));
  }
  // REVIEW_1: a capped line that cannot be flown in the shot (71 of 148 m: the planned rise over the church never came)
  // is RESHAPED by default: its low stretches lifted to the clearance the needed speed asks for (liftLine, reported);
  // camera.reshape false keeps the heights and ends early with a director-facing warning (the duration it needs)
  if (!FB && vcAsk == null && tl.capped) {
    const tNeed = tl.tNeed;
    if (c.reshape !== false) {
      for (let pass = 0; pass < 3 && tl.capped; pass++) {
        const lf = liftLine(P, path, Tt * 0.97, { k: 1.25 + 0.15 * pass });
        if (!lf) break;
        const L0 = path.total, nS = lf.path.knotS.length - 1;
        const knotMap = (path.wpS || path.knotS).map((sv) => lf.path.knotS[clamp(Math.round(sv / L0 * nS), 0, nS)]);
        path = lf.path; path.wpS = knotMap;
        tl = capTimeline(path.at, path.total, T0, T1, { k0: num(c.ease_in, 0.7), k1: num(c.ease_out, 1), cap: speedCap(P), even: 1.45 });
        P.notes.push(`fpv_line: the line needed ${fmt(tNeed, 1)} s at its heights (asked ${fmt(Tt, 1)} s): its low stretches lifted up to ${fmt(lf.peak, 1)} m (one smooth field, plan view kept) so every waypoint is reached`);
      }
      tk = (path.wpS || path.knotS).map((sv) => tl.tOfS(sv));
    }
    if (tl.capped) P.warnings.push(`camera fpv_line: the line needs ${fmt(tNeed, 1)} s at a legal speed for its heights (asked ${fmt(Tt, 1)} s); the shot ends before its last waypoint${c.reshape === false ? ' (reshape false)' : ''}: give dur >= ${fmt(tNeed - 0.5, 1)} or fly it higher`);
  }
  if (tl.capHit) P.notes.push(`fpv_line: slowed where the line runs low (speed <= 1.6 x clearance); peak ${fmt(tl.vPeak)} m/s`);
  if (Math.abs(tl.total - path.total) > 0.05 * path.total) P.notes.push(`fpv_line: the shot covers ${fmt(tl.total, 0)} m of the ${fmt(path.total, 0)} m line (${tl.total > path.total ? 'continuing straight past the last waypoint' : 'ending before the last waypoint'})`);
  const localAt = (t) => path.at(tl.sAt(t));
  const posAt = FB ? (t) => FB.toWorld(t, localAt(t)) : localAt;
  const la = clamp(num(c.look_ahead, 0.35), 0.05, 2), tilt = num(c.tilt, -4);
  const LA = c.look_at != null ? bodyOf(P, c.look_at) : null, lw = clamp(num(c.look_w, LA ? 0.6 : 0), 0, 1);
  const fov = clamp(num(c.fov, 72), 20, 110);
  const dirAt = (t) => {
    let d = nrm(sub(posAt(t + la), posAt(t)));
    if (LA && lw > 0) d = nrm(mix(d, nrm(sub(LA.center(t), posAt(t))), lw));
    return framed(d, null, tilt, fov);
  };
  const bank = bankFn(posAt, dirAt, T0, T1, bankMax(c), num(c.bank_gain, 0.6));
  const direct = (t) => { const p = posAt(t), f = dirAt(t); return { pos: p, look: add(p, mul(f, 40)), fov, roll: bank(t) }; };
  P.notes.push(`fpv_line: ${via.length} waypoints${FB ? ` riding ${FB.name}` : ''}, ${fmt(path.total, 0)} m C2 line at ${fmt(Math.min(tl.vc, tl.vPeak ?? tl.vc))} m/s cruise, passing them at ${tk.map((t) => fmt(t, 2)).join(' / ')} s`);
  const evenPos = FB ? (t) => localAt(t) : posAt;
  return out(P, { direct, rel: FB && FB.moving ? (t) => sub(FB.origin(t), FB.origin(0)) : undefined, subjectCenter: LA ? LA.center : (FB ? FB.center : null), dofAuto: false, subjPts: LA ? subjPts(LA) : null, evenSpeed: true, evenPos });
}

// ── cloud_tunnel ────────────────────────────────────────────────────────────────────────────────────────────────────
// fern's cold-open reveal: the camera starts `length` m behind and below an aircraft (inside the cloud layer when WP4's
// sky.cloud_layer has a tunnel along this line), swings in from the side (the swing banks it ~10 deg from the lateral
// acceleration, levelling as it lines up), emerges under the tail by `emerge_t` s and closes on it; with transition.out
// occlude by the target it flies into the dark hull in the last frames (the hidden cut), else it settles behind the tail.
// A C2 spline in time in the aircraft's frame; speed measured relative to it.
function T_tunnel(P) {
  const { D, T0, T1, K } = P, c = P.cam || {};
  const B = bodyOf(P, c.target ?? 'stage');
  const L = Math.max(4, B.L), H = Math.max(1, B.H), bx = B.box, Lz = Math.max(4, bx.max[2] - bx.min[2]);   // Lz: nose-tail length (L may be the wingspan)
  const length = Math.max(10, num(c.length, Math.max(35, 1.4 * Math.max(4, B.box.max[2] - B.box.min[2]))) * Math.sqrt(K.dist));   // 1.4 x its nose-tail length (a wingspan made the run-in 57 m)
  const emerge = clamp(num(c.emerge_t, 0.42 * D), 0.3, D - 0.4);
  const sg = sideSign(P, -1);
  const occ = P.occ && B.owner && P.occ.owners.has(B.owner) ? P.occ : null;
  const tail = bx.min[2], yMid = (bx.min[1] + bx.max[1]) / 2;
  let below = num(c.below, 0.42 * length);
  // WP4's sky.cloud_layer {base, top, tunnel}: the start must be INSIDE the deck (fern T01: 0.55 s of whiteout, then the
  // bomber). Flying just above the deck the start drops into it (<= 1.2 x length); far above or under it: a note
  const deck = P.S.items.find((it) => it.kind === 'sky.cloud_layer');
  if (deck && c.below == null) {
    const g0 = P.G(0, 0), dc = deck.res && deck.res.cloud ? deck.res.cloud : { base: g0 + num(deck.item?.base, 800), top: g0 + num(deck.item?.top, 1500) };
    const yc = B.toWorld(emerge, [0, yMid, tail])[1];
    if (yc > dc.top - 5) {
      const want = yc - (dc.top - Math.min(40, 0.3 * (dc.top - dc.base)));
      if (want <= 1.2 * length) below = Math.max(below, want);
      else P.warnings.push(`cloud_tunnel: ${B.name} flies ${fmt(yc - dc.top, 0)} m above the cloud deck top; the start cannot be inside it (fly it within ${fmt(0.8 * length, 0)} m of the top, or inside the deck)`);
    } else if (yc < dc.base) P.notes.push(`cloud_tunnel: ${B.name} is under the cloud deck base; the camera starts in clear air`);
    P.notes.push(`cloud_tunnel: pair with sky.cloud_layer tunnel {follow: '${typeof c.target === 'string' ? c.target : 'objects:0'}', t: [0, ${fmt(emerge, 2)}]} (the lens starts behind the t0 end, inside the deck)`);
  }
  // [right, up, forward] relative to the frame origin
  const p0 = [sg * 0.32 * length, yMid - below, tail - length];
  const p1 = [sg * 0.08 * length, yMid - 0.33 * below, tail - 0.5 * length];
  let p2, p2t = D, occPath = null;
  if (occ) {
    // into the hull: up into the rear BELLY (fern T01: the dark underside fills the lens), never through a hollow turret
    // ring; the entry point is the bottom of the mesh boxes under x = 0 at 28 % of the length from the tail, the lens
    // crosses the hull margin just after the wipe window opens (occ.t0) and stops SKIN_END m short of the real skin
    // (ray-cast) on the last frame. Keys are [right, up, forward] (sem() is its own inverse)
    // candidate entry stations (fractions of the length from the tail): the first where the real skin (ray-cast) and the
    // QA hull agree wins — an open or inside-out patch of the model (comp1: the Halifax belly) is skipped
    const tE = D - 1 / 30;
    const entryAt = (fr) => {
      const ze = tail + fr * Lz;
      let yB = Infinity; for (const q of B.hull || [bx]) if (q.min[0] <= 0.3 && q.max[0] >= -0.3 && q.min[2] <= ze && q.max[2] >= ze) yB = Math.min(yB, q.min[1]);
      if (!Number.isFinite(yB)) yB = bx.min[1];
      const eL = sem([0, yB, ze]), aL = sem([0, yB - 6, ze - 9]), dv = nrm(sub(eL, aL));
      const fromW = B.toWorld(tE, aL), sd = surfaceDist(B, tE, fromW, sub(B.toWorld(tE, add(aL, dv)), fromW), 30);
      const dl = sd != null ? sd : len(sub(eL, aL));
      let sh = probeEntry(P, B, tE, aL, dv, dl + 2);
      if (sh == null) { sh = 0; for (let s2 = 0; s2 <= dl + 2; s2 += 0.02) { if (hullDist(B, add(aL, mul(dv, s2))) < FPV_LIMITS.margin + 0.03) { sh = s2; break; } } }
      // the last frame must be ALL skin (REVIEW_1: a stray grey triangle of sky in a frame corner past a fighter's thin
      // belly): ray-cast the frustum corners and edge midpoints from the end pose; every ray must meet the skin within 3 m
      let cover = 0, rays = 0, skin = SKIN_END;
      if (sd != null) {
        const fW = nrm(sub(B.toWorld(tE, add(aL, dv)), B.toWorld(tE, aL)));
        let rW = cross(fW, UP); rW = len(rW) > 1e-4 ? nrm(rW) : [1, 0, 0]; const uW = cross(rW, fW);
        const tv = Math.tan(clamp(num(c.fov, 42), 20, 100) * deg / 2), th = tv * 16 / 9;
        for (const sk of [SKIN_END, 0.08]) {                                 // closer to the skin, the frustum's footprint halves
          const eEndW = B.toWorld(tE, add(aL, mul(dv, Math.max(0, dl - sk))));
          let cv = 0, ry = 0;
          for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]) { ry++; const dW = nrm(add(add(fW, mul(rW, x * th * 0.98)), mul(uW, y * tv * 0.98))); if (surfaceDist(B, tE, eEndW, dW, 3) != null) cv++; }
          if (cv > cover || !rays) { cover = cv; rays = ry; skin = sk; }
          if (cover === rays) break;
        }
      }
      return { fr, ze, eL, aL, dv, dl, sh, sd, cover, rays, skin, ok: sd != null && !(sh > 0 && dl > sh + FPV_LIMITS.margin + 0.6) };
    };
    const cands = [0.28, 0.2, 0.36, 0.14, 0.44, 0.1, 0.52].map(entryAt);
    const E = cands.find((q) => q.ok && q.cover === q.rays) || cands.filter((q) => q.ok).sort((a, b) => b.cover - a.cover)[0] || cands[0];
    if (E.cover < E.rays) P.notes.push(`cloud_tunnel: the last frame is skin on ${E.cover} of ${E.rays} frustum rays (no belly station fully covers the lens)`);
    const { ze, eL, aL, dv, dl, sh, sd } = E;
    let dlUse = dl;
    if (!E.ok && sh > 0 && dl > sh + FPV_LIMITS.margin + 0.6) { P.warnings.push(`cloud_tunnel: no skin where the QA hull of ${B.name} is along any belly entry (the ray-cast found it ${fmt(dl - sh, 1)} m further: an open or inside-out mesh); ending at the hull`); dlUse = sh + FPV_LIMITS.margin + 0.15; }
    if (E !== cands[0]) P.notes.push(`cloud_tunnel: belly entry moved to ${fmt(E.fr * 100, 0)} % of the length (the skin is open / missing at 28 %)`);
    // a C2 line (glide2) p0 -> p1 -> under the belly -> straight up into it, timed by a speed profile that cruises at vm
    // and eases (smoothstep, C2) to the closing speed vc on the final line: the lens is SKIN_END m from the skin on the
    // last frame and crosses the hull margin no earlier than the wipe window opens (vc >= (sEnd - sh) / window)
    const skinE = E.skin ?? SKIN_END, sEnd = Math.max(sh + 0.1, dlUse - skinE), tIn = occ.t0 + 0.012;
    const eEnd = add(aL, mul(dv, sEnd));
    const aS = sem(aL), p1m = [sg * 0.1 * length, lerp(p0[1], aS[1], 0.6), lerp(p0[2], aS[2], 0.5)];   // monotone climb (no dip before the belly)
    const path = glide2([sem(p0), sem(p1m), aL, eEnd, add(eEnd, mul(dv, 3))]);
    const S_end = path.knotS[3], Tt = tE - T0;
    const vc = Math.max(1.2 * (sEnd - sh) / Math.max(0.05, tE - tIn), clamp(0.35 * S_end / Tt, 3, 10));
    const A = 0.4, Is = (x) => x * x * x - x * x * x * x / 2, Wint = (u) => (u <= A ? u : A + (u - A) - (1 - A) * Is(Math.min(1, (u - A) / (1 - A))));
    const vm = Math.max(0.5, (S_end / Tt - (1 - Wint(1)) * vc) / Wint(1));
    const sOf = (t) => { const u = (t - T0) / Tt; if (u >= 1) return S_end + vc * (t - tE); if (u <= 0) return vm * (t - T0); return Tt * (vc * u + (vm - vc) * Wint(u)); };
    occPath = { at: (t) => path.at(sOf(t)), eL: add(eL, mul(dv, 25)), tE };   // aim far along the entry line (no flip past it)
    P.notes.push(`cloud_tunnel: entry line ${fmt(len(sub(eL, aL)), 1)} m to the belly box, skin at ${fmt(dlUse, 2)} m, QA hull from ${fmt(sh, 2)} m`);
    P.notes.push(`cloud_tunnel: into the belly ${fmt(ze - tail, 1)} m forward of the tail at ${fmt(vc, 1)} m/s closing (cruise ${fmt(vm, 1)} m/s relative), ending ${fmt(skinE, 2)} m from its skin (${sd != null ? 'ray-cast' : 'hull box'}; the last frame is skin on ${E.cover}/${E.rays} frustum rays)`);
  } else p2 = [0, yMid + 0.05 * H, tail - Math.max(6, 0.3 * L)];
  const keys = occPath ? null : [[T0, p0], [emerge, p1], [p2t, p2]];
  const SP = keys ? nspline(keys.map((k) => k[0]), keys.map((k) => sem(k[1]))) : null;
  const localAt = occPath ? occPath.at : (t) => SP.f(t);
  const posAt = (t) => B.toWorld(t, localAt(t));
  const aimL = [0, yMid, tail + 0.3 * L];
  const fov = clamp(num(c.fov, 42), 20, 100);
  const dirAt = (t) => {
    const p = posAt(t), tan = nrm(sub(posAt(t + 0.15), posAt(t - 0.15)));
    const toA = nrm(sub(B.toWorld(t, aimL), p)), w = 0.55 + 0.45 * smooth((t - T0) / (emerge - T0));
    let d = nrm(mix(tan, toA, w));
    if (occPath) d = nrm(mix(d, nrm(sub(B.toWorld(t, occPath.eL), p)), smooth((t - (occPath.tE - 0.8)) / 0.65)));   // the last 0.8 s: into the entry point
    return framed(d, null, num(c.look_up, 0), fov);
  };
  // the horizon levels over the last 30 % (fern T01 levels by ~1.1 s before the hidden cut; a turning target held a 16 deg
  // roll to the last frame and read as a crooked horizon)
  const bank = bankFn(posAt, dirAt, T0, T1, bankMax(c), num(c.bank_gain, 0.9), { rateCap: 0.8 * FPV_LIMITS.rollRate, level: [T0 + 0.7 * (T1 - T0), T1 - 0.1] });
  const direct = (t) => { const p = posAt(t), f = dirAt(t); return { pos: p, look: add(p, mul(f, 40)), fov, roll: bank(t) }; };
  const w0 = B.toWorld(0, sem(p0)), we = B.toWorld(emerge, sem(p1));
  P.notes.push(`cloud_tunnel: from ${fmt(length, 0)} m behind / ${fmt(below, 0)} m below ${B.name}, emerging under the tail at t=${fmt(emerge, 2)} s, ${occ ? `into the hull in the last ${occ.frames} frames (occlude)` : 'settling behind the tail'}; corridor for sky.cloud_layer tunnel: from [${w0.map((v) => fmt(v, 0)).join(', ')}] to [${we.map((v) => fmt(v, 0)).join(', ')}]`);
  return out(P, { direct, rel: B.moving ? (t) => sub(B.origin(t), B.origin(0)) : undefined, subjectCenter: B.center, dofAuto: false, subjPts: subjPts(B), evenSpeed: false });
}

export const FPV_TEMPLATES = { freefall_follow: T_freefall, chase: T_chase, proximity_pass: T_proximity, orbit_reveal: T_orbitReveal, fpv_line: T_line, cloud_tunnel: T_tunnel };

// ── camera.profile 'fpv' on the older moves ─────────────────────────────────────────────────────────────────────────
// keys: the director's key POSITIONS are kept and joined by a C2 line by arc length (glide2); the line is RE-TIMED
// like capTimeline does for fpv_line (an eased, never-stopping arc-length speed held under 1.6 x clearance), so the key
// times move and are reported; looks ride the same arc parameter. Never lifted (fixWithBumps' 22.6 m jumps), never a
// flyover: REVIEW_1's keys over a village were lifted 22.6 m, then replaced by a static aerial 175 m away. A line that
// cannot be flown in the shot's time ends before its last keys (a warning names the duration it needs and the height
// that would allow it); camera.reshape true lifts its low stretches instead (all keys reached, re-timed).
export function fpvKeys(P, keys, times, lookFn = null) {
  const c = P.cam || {};
  const order = times.map((x) => x[1]), T0 = times[0][0], T1 = times[times.length - 1][0];
  const fov0 = keys[0].fov ?? P.fov;
  const pts = order.map((i) => keys[i].pos), looks = order.map((i) => keys[i].look);
  // consecutive duplicate positions (a hold key) would break the arc length: nudge them apart by 1 cm
  for (let i = 1; i < pts.length; i++) if (len(sub(pts[i], pts[i - 1])) < 0.01) pts[i] = add(pts[i], [0, 0.01 * i, 0]);
  let path = glide2(pts), knot = path.knotS.slice();
  const k0 = num(c.ease_in, 0.75), k1 = num(c.ease_out, 0.85);
  let tl = capTimeline(path.at, path.total, T0, T1, { k0, k1, cap: speedCap(P), even: 1.45 });
  if (tl.capped && c.reshape === true) {
    const lf = liftLine(P, path, T1 - T0);
    if (lf) {
      const L0 = path.total, nS = lf.path.knotS.length - 1;
      knot = knot.map((sv) => lf.path.knotS[clamp(Math.round(sv / L0 * nS), 0, nS)]);
      path = lf.path; tl = capTimeline(path.at, path.total, T0, T1, { k0, k1, cap: speedCap(P), even: 1.45 });
      P.notes.push(`keys (profile fpv, reshape): the low stretches lifted up to ${fmt(lf.peak, 1)} m so the keys fit ${fmt(T1 - T0, 1)} s at a legal speed`);
    }
  }
  const lsp = nspline(knot, looks);
  const sOf = (t) => tl.sAt(t);
  const posAt = (t) => path.at(sOf(t));
  const lookAt = lookFn || ((t) => lsp.f(clamp(sOf(t), 0, path.total)));
  const dirAt = (t) => nrm(sub(lookAt(t), posAt(t)));
  const bank = bankFn(posAt, dirAt, T0, T1, bankMax(c), num(c.bank_gain, 0.6), { rateCap: 0.8 * FPV_LIMITS.rollRate });
  const kt = knot.map((sv) => tl.tOfS(sv));
  const asked = times.map((x) => x[0]);
  P.notes.push(`keys (profile fpv): ${keys.length} key positions kept, C2 line ${fmt(path.total, 0)} m re-timed under 1.6 x clearance at ${fmt(tl.vc, 1)} m/s cruise (peak ${fmt(tl.vPeak, 1)}): keys at ${kt.map((x, i) => `${fmt(Math.max(0, x), 2)}${Math.abs(x - asked[i]) > 0.05 ? ` (asked ${fmt(Math.max(0, asked[i]), 2)})` : ''}`).join(' / ')} s; banked from lateral acceleration (<= ${fmt(bankMax(c), 0)} deg)`);
  if (tl.capped) {
    const reached = kt.filter((x) => x <= P.D + 0.01).length, clrNeed = path.total / (T1 - T0) * 1.2 / (0.9 * FPV_LIMITS.speedK);
    P.warnings.push(`camera.keys (profile fpv): the line needs ${fmt(tl.tNeed, 1)} s at a legal speed near the ground (asked ${fmt(T1 - T0, 1)} s); the shot ends before the last ${keys.length - reached} key(s). Give dur >= ${fmt(tl.tNeed - 0.5, 1)}, fly >= ${fmt(clrNeed, 0)} m clear of roofs and trees, or set camera.reshape: true`);
  }
  return { direct: (t) => ({ pos: posAt(t), look: lookAt(t), fov: fov0, roll: bank(t) }), subjPts: null };
}
// the bank of a C1 template path under camera.profile 'fpv' (fpv_flythrough, fpv_dive): from its own lateral acceleration
export function profileBank(c, posFn, dirFn, T0, T1) { return bankFn(posFn, dirFn, T0, T1, bankMax(c), num(c.bank_gain, 0.6)); }

export const FPV_CAMERA_KEYS = ['profile', 'rel', 'look_up', 'orbit', 'drift_in', 'wobble', 'lag_s', 'lag', 'weave', 'close', 'lead', 'bank_max', 'bank_gain', 'clearance', 'gap', 'along', 'r0', 'r1', 'deg', 'rise', 'h0', 'via', 'length', 'below', 'emerge_t', 'whip', 'zoom', 'aim', 'pass_at', 'glance', 'ahead', 'bulge', 'dir', 'look_lag', 'frame', 'look_at', 'look_w', 'look_ahead', 'tilt', 'alt', 'ease_in', 'ease_out', 'track_sigma', 'fill', 'reshape', 'keep_dev', 'chest', 'horizon'];   // spec.js KNOWN.camera should list these (LOG NEEDS FROM LEAD)
export const FPV_CAMERA_DOC = {
  profile: "camera.profile 'fpv' (v3): FPV limits (roll <= 30 deg, roll rate 75 deg/s, turn 140 deg/s, eased turns, jerk-free C2 paths, speed <= 1.6 x clearance below 60 m, clearance 1 m / 2.5 m above 15 m/s, figures 0.8 m, never shortened, never lifted) and the bank from lateral acceleration (bank_max 18, max 30). Implied by every FPV move below. On keys: the key POSITIONS are kept and re-timed on an even arc-length speed under the cap (the new key times are reported); a line too long for its time ends before its last keys (warning with the duration it needs) unless reshape: true lifts its low stretches",
  freefall_follow: "move freefall_follow (v3 FPV): falls WITH a falling target (para.jumper / space.astronaut float with drift [0,-48,0] / prop.bomb / any flying item) at its speed: rel [side, up, back] m in its frame (default [3, 1.5, 7]; up < 0 = below looking up at it against the sky), orbit deg over the shot (<= 40), drift_in 0..1 (an even approach; 1 + transition.out {kind:'occlude', by: <target>, frames: 10} = it passes the lens in the last frames: the hidden cut; with fewer frames the lens starts farther away), wobble 0..1 (0.35), aim [x, y], look_up deg, fov 42. Near the ground the camera FLARES (stops >= 30 m up while the subject drops away below); the notes give the impact time. 3-5 s",
  chase: "move chase (v3 FPV): rides a moving target's own PAST TRACK (where it was `back` m ago: the same road, the same line, the same corners a beat later): offset [side, up, back] m where back is the TRUE distance (default: fitted so it spans fill 0.5 of the frame width: bomber ~30-40 m, fighter 10-16 m, car 6-8 m), weave m, lead m, banks with its turns (bank_max 18..30, track_sigma 0.5 s, roll rate soft-capped at 60 deg/s), fov 50. A car at speed keeps the lens >= 2.9 m over the road. Aircraft, cars, trains, horses. 3-8 s",
  proximity_pass: "move proximity_pass (v3 FPV): skims past a target's real mesh boxes at clearance m (2.5; 1.2-4 looks fast and safe), speed m/s (18; 8 relative when it moves), along length|span, side left|right|over|under, dir forward|back (a moving target overtakes the lens by default: the camera starts beside its middle, the tail passes ~1 s in, it pulls away ahead), pass_at (0.8 for a still target or dir forward: it is ahead, in frame, most of the shot), height m above its base (auto: under / over a wing beside the fuselage; a tower or spire: beside it at 40-70 % of its height), bulge m, glance 0..1, keep_dev deg (75: the lens turns toward it to keep it in frame), fov 70. Wings, hulls, towers, a church spire. 2.5-4 s",
  orbit_reveal: "move orbit_reveal (v3 FPV): spiral orbit round the target: r0 -> r1 m (default 2.2 x size + 2 -> 0.62 x r0), deg of arc (120, <= 300; side left = the other way), rise m (0.3 x r0), h0 m above its centre, az (start compass deg; default: chosen so the arc stays clear and ends facing the structure behind the target), look_h, aim [x, y], fov 45. Indoors (an interior.* room) the radius dips round columns and walls and relax tightens; lean <= 3 deg; raised if too fast for its height. A bust in a void, canopies, a landmark, a figure in a hall. 4-8 s",
  fpv_line: "move fpv_line (v3 FPV): the director's flown line through via waypoints (C2): [x, y, z] | [x, z] (+alt m, default 3) | '<ref>' (its centre when the camera passes) | {target, offset: [right, up, forward]}; frame: '<ref>' = the line rides that moving item and via are [right, up, forward] in its frame or its anchor names ('ramp', 'tail', 'nose'); speed m/s (cruise; default fits the shot, even speed <= 1.45 x mean, <= 1.6 x clearance over roofs and treetops), reshape (default: a line too long for its time at its heights gets its low stretches lifted so every waypoint is reached; false = it ends early with a warning), ease_in 0.7, look_ahead s (0.35), look_at '<ref>' + look_w 0..1 (0.6), tilt deg (-4), fov 72. Waypoints >= 8 m from walls and treetops. 3-8 s",
  cloud_tunnel: "move cloud_tunnel (v3 FPV): fern's cold-open reveal on an aircraft target: starts length m behind it (1.4 L, >= 35) and below (below m), swings in from the side (banks ~10-15 deg, levels the horizon over the last 30 %), emerges under the tail at emerge_t s (0.42 x dur) and closes on it; with transition.out {kind:'occlude', by: <target>} it flies into the belly in the last frames (the last frame is skin on every frustum ray: the hidden cut). The report notes give the corridor for sky.cloud_layer tunnel {from, to}. fov 42. 2-4 s",
  whip: "camera.whip [{t, yaw: +-60..180 deg | to: '<ref>' (the yaw / pitch that land the view on it), dur: 0.15..0.35 s (0.35 default above 120 deg), back: false, pitch}] (v3, any move, max 2): a smear pan used as an in-shot cut, eased (smootherstep), a 4-8 deg lean into it; the view stays turned unless back: true (a big whip renders 12 sub-frames at final quality). Plan the base move so the new direction has something to see",
  zoom: "camera.zoom [{t, fov, dur: 0.12..1 s, ease: smooth|snap, land: 0..1}] (v3, any move, max 3): crash / snap zoom to fov (held after), snap = most of it in the first third, a tiny settle shake on landing (land 0.3)",
};

// ── designed layers: whip pan + crash zoom (ride on the base path like shake; QA measures the base) ───────────────────
const S5 = smoother;
const bell = (x) => (x <= 0 || x >= 1 ? 0 : x < 0.5 ? S5(x * 2) : S5(2 - x * 2));
export function makeDesigned(spec, c, base, notes, warnings, o = {}) {
  const wl = (Array.isArray(c.whip) ? c.whip : []).filter((e) => e && Number.isFinite(+e.t));
  const zl = (Array.isArray(c.zoom) ? c.zoom : []).filter((e) => e && Number.isFinite(+e.t));
  if (!wl.length && !zl.length) return null;
  if (wl.length > 2) warnings.push(`camera.whip: ${wl.length} whips; keeping the first 2 (one in-shot cut is the rule)`);
  if (zl.length > 3) warnings.push(`camera.zoom: ${zl.length} zooms; keeping the first 3`);
  // whip {to: '<ref>' | [x, z]}: the yaw (and pitch) are solved so the view LANDS on that target at the end of the whip
  // (cam_line's -145 deg by hand ended on empty snow with the church at the frame edge)
  const aimYaw = (e) => {
    if (e.to == null || !o.ptOf) return null;
    try {
      const pt = o.ptOf(e.to), d0 = clamp(num(e.dur, 0.3), 0.15, 0.35), tE = +e.t + d0, q = base(tE), tg = pt.center(tE);
      const f = sub(q.look, q.pos), g = sub(tg, q.pos), hd = (v) => Math.atan2(v[0], -v[2]);
      let y = (hd(g) - hd(f)) / deg; while (y > 180) y -= 360; while (y < -180) y += 360;
      const pf = Math.atan2(f[1], Math.hypot(f[0], f[2])), pg = Math.atan2(g[1], Math.hypot(g[0], g[2]));
      return { yaw: y, pitch: clamp((pg - pf) / deg * 0.8, -40, 40) };
    } catch (err) { warnings.push(`camera.whip to '${e.to}': target not found`); return null; }
  };
  const W = wl.slice(0, 2).map((e) => {
    const ay = aimYaw(e); if (ay) { e = { ...e, yaw: e.yaw ?? ay.yaw, pitch: e.pitch ?? ay.pitch }; notes.push(`designed · whip at ${fmt(+e.t, 2)} s aimed at ${e.to}: ${fmt(ay.yaw, 0)} deg, pitch ${fmt(ay.pitch, 0)}`); }
    // a big whip (> 120 deg) defaults to the longest window (0.35 s): at final quality an 860 deg/s smear showed 5-6
    // discrete ghost copies (REVIEW_1 minor 11; more sub-frames inside the window is render.py's, NEEDS FROM LEAD)
    const yaw = clamp(num(e.yaw, 90), -180, 180), dDef = Math.abs(yaw) > 120 ? 0.35 : 0.25, dur = clamp(num(e.dur, dDef), 0.15, 0.35);
    if (Math.abs(num(e.yaw, 90)) > 180 || num(e.dur, dDef) < 0.15 || num(e.dur, dDef) > 0.35) warnings.push(`camera.whip at ${fmt(+e.t, 2)} s: clamped to ${fmt(yaw, 0)} deg in ${fmt(dur, 2)} s`);
    if (Math.abs(yaw) > 120 && dur < 0.3) warnings.push(`camera.whip at ${fmt(+e.t, 2)} s: ${fmt(Math.abs(yaw), 0)} deg in ${fmt(dur, 2)} s smears into ghost copies at final quality; give dur 0.35`);
    return { t: +e.t, yaw, dur, back: !!e.back, pitch: clamp(num(e.pitch, 0), -40, 40), lean: clamp(num(e.lean, Math.min(8, 4 + Math.abs(yaw) / 45)), 0, 12) };
  });
  const Z = zl.slice(0, 3).sort((a, b) => +a.t - +b.t).map((e) => {
    const t = +e.t, f0 = base(clamp(t, 0, spec.dur ?? 10)).fov ?? 40, f1 = clamp(num(e.fov, f0 * 0.4), 8, 100), dur = clamp(num(e.dur, 0.3), 0.12, 1.0);
    return { t, f0, f1, dur, snap: e.ease === 'snap', land: clamp(num(e.land, 0.3), 0, 1), k: Math.tan(f1 * deg / 2) / Math.tan(f0 * deg / 2) };
  });
  // zooms chain: each one's ratio is taken against the base lens at its start (so two zooms compose without a jump)
  const zE = (z, x) => (z.snap ? (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3) * (1 + 3 * x)) : S5(x));
  const kAt = (t) => { let k = 1; for (const z of Z) { const x = (t - z.t) / z.dur; if (x <= 0) continue; k *= lerp(1, z.k, zE(z, clamp(x))); } return k; };
  const landAt = (t) => { let y = 0, p = 0; for (const z of Z) { const x = t - z.t - z.dur * 0.85; if (x <= 0 || x > 0.35 || !z.land) continue; const env = Math.sin(Math.PI * clamp(x / 0.35)) * (1 - x / 0.35); y += z.land * 0.35 * deg * env * Math.sin(2 * Math.PI * 9 * x); p += z.land * 0.3 * deg * env * Math.sin(2 * Math.PI * 11 * x + 1.3); } return [y, p]; };
  const wAt = (t) => {
    let yaw = 0, pitch = 0, roll = 0, e = 0;
    for (const w of W) {
      const x = (t - w.t) / w.dur;
      if (x <= 0) continue;
      const p = w.back ? bell(clamp(x)) : S5(clamp(x)), b = bell(clamp(x));
      yaw += w.yaw * deg * p; pitch += w.pitch * deg * p; roll += -Math.sign(w.yaw) * w.lean * deg * b;
      if (x < 1) e = Math.max(e, 1);
    }
    return { yaw, pitch, roll, e };
  };
  for (const w of W) notes.push(`designed · whip at ${fmt(w.t, 2)} s: ${fmt(w.yaw, 0)} deg${w.pitch ? ` / pitch ${fmt(w.pitch, 0)}` : ''} in ${fmt(w.dur, 2)} s (peak ${fmt(Math.abs(w.yaw) * 1.875 / w.dur, 0)} deg/s, lean ${fmt(w.lean, 0)} deg)${w.back ? ', and back' : ''}: a smear pan, declared (not a turn breach)`);
  for (const z of Z) notes.push(`designed · ${z.snap ? 'snap' : 'crash'} zoom at ${fmt(z.t, 2)} s: ${fmt(z.f0, 0)} -> ${fmt(z.f1, 0)} deg in ${fmt(z.dur, 2)} s${z.land ? ` (settle ${fmt(z.land, 1)})` : ''}`);
  const apply = (q, t) => {
    const w = W.length ? wAt(t) : null, k = Z.length ? kAt(t) : 1, ld = Z.length ? landAt(t) : [0, 0];
    let o2 = q;
    if (w && (w.yaw || w.pitch || w.roll) || ld[0] || ld[1]) {
      const d = sub(q.look, q.pos), L = len(d) || 1;
      const f = turnDir(mul(d, 1 / L), (w ? w.yaw : 0) + ld[0], (w ? w.pitch : 0) + ld[1]);
      o2 = { ...q, look: add(q.pos, mul(f, L)), roll: (q.roll || 0) + (w ? w.roll : 0) };
    }
    if (k !== 1) o2 = { ...o2, fov: clamp(2 * Math.atan(k * Math.tan((o2.fov ?? 40) * deg / 2)) / deg, 6, 110) };
    return o2;
  };
  const designedAt = (t) => {
    const r = {};
    if (W.length) r.whip = W.some((w) => t >= w.t - 0.02 && t <= w.t + w.dur + 0.02) ? 1 : 0;
    if (Z.length) r.zoom = Z.some((z) => t >= z.t - 0.02 && t <= z.t + z.dur + (z.land ? 0.35 : 0) + 0.02) ? 1 : 0;
    return r;
  };
  return { apply, designedAt, list: [...W.map((w) => ({ type: 'whip', t: w.t, yaw: w.yaw, dur: w.dur, back: w.back })), ...Z.map((z) => ({ type: 'zoom', t: z.t, fov: z.f1, dur: z.dur, ease: z.snap ? 'snap' : 'smooth' }))] };
}
