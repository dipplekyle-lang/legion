// a_asteroid.js — E2 (asteroid kit, 29 Sep 2026) for "How Long You'd Last Against Every Asteroid Size".
//   space.asteroid  ONE rock of any size, from a millimetre grain to a 1,000 km dwarf planet: stony | carbonaceous |
//                   iron | rubble (a spinning-top pile of boulders) | vesta | ceres; tumbling, cratered, with named
//                   presets (tc3, chelyabinsk, tunguska, barringer, city_killer, apophis, bennu, didymos, dimorphos,
//                   chicxulub, eros, psyche, vesta, ceres). The shape follows the size: angular broken facets for
//                   meteoroids, a cratered potato for km rocks, a round body past ~400 km.
//   scale.asteroid  the scale-comparison shot: the rock beside a reference at TRUE scale on one ground line —
//                   person | car | bus | house | stadium | eiffel | empire_state | everest | city | country.
// makeAsteroid(ctx, o) is exported for the other asteroid FX (entry, craters, DART's Didymos/Dimorphos).
// Everything is a pure function of t. Geometry is displaced on the CPU once per item; fine relief is a per-pixel bump
// in the shader (object-space noise, faded with the pixel footprint: no shimmer from far away).
import * as THREE from 'three';
import { patchMaterial } from '../shared/env.js';
import { rng, clamp, lerp, smooth } from '../shared/util.js';

const DEG = Math.PI / 180;
const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
// the spec's own values: item.params minus the catalog's descriptor strings the registry merged in, then the item's keys
export function explicitParams(item, cat) {
  const out = {}, P = item.params || {}, C = (cat && cat.params) || {};
  for (const k of Object.keys(P)) if (!(k in C) || P[k] !== C[k]) out[k] = P[k];
  for (const k of Object.keys(item)) if (k !== 'params' && item[k] !== undefined) out[k] = item[k];
  return out;
}

// ── presets: real bodies ───────────────────────────────────────────────────────────────────────────────────────
export const PRESETS = {
  grain: { diameter: 0.001, type: 'stony' }, pebble: { diameter: 0.05, type: 'stony' }, meteoroid: { diameter: 1, type: 'stony' },
  tc3: { diameter: 4.1, type: 'carbonaceous' },                 // 2008 TC3 -> Almahata Sitta (ureilite, dark)
  chelyabinsk: { diameter: 19, type: 'stony' },                 // LL chondrite, 15 Feb 2013
  tunguska: { diameter: 55, type: 'stony' },
  barringer: { diameter: 50, type: 'iron' },                    // Canyon Diablo iron, ~50,000 years ago
  city_killer: { diameter: 140, type: 'stony' },
  apophis: { diameter: 370, type: 'stony', axes: [1, 0.72, 0.62], bilobed: 0.35 },
  bennu: { diameter: 490, type: 'rubble' }, ryugu: { diameter: 900, type: 'rubble' }, itokawa: { diameter: 330, type: 'rubble', axes: [1, 0.55, 0.45], bilobed: 0.5 },
  didymos: { diameter: 780, type: 'rubble' }, dimorphos: { diameter: 151, type: 'rubble', axes: [1, 0.87, 0.65], top: 0 },
  km1: { diameter: 1000, type: 'stony' },
  chicxulub: { diameter: 10000, type: 'carbonaceous' },
  eros: { diameter: 16840, type: 'stony', axes: [1, 0.36, 0.33], bilobed: 0.25 },
  psyche: { diameter: 220000, type: 'iron', axes: [1, 0.83, 0.68] },
  vesta: { diameter: 525000, type: 'vesta' }, ceres: { diameter: 940000, type: 'ceres' },
};
const TYPE_COL = {                                               // linear albedo colours (a touch brighter than nature: it must read)
  stony: [[0.17, 0.142, 0.112], [0.105, 0.09, 0.074], [0.25, 0.215, 0.17]],
  carbonaceous: [[0.15, 0.142, 0.132], [0.1, 0.095, 0.09], [0.22, 0.208, 0.19]],
  rubble: [[0.16, 0.15, 0.14], [0.1, 0.094, 0.088], [0.26, 0.245, 0.225]],
  iron: [[0.3, 0.29, 0.275], [0.17, 0.16, 0.15], [0.42, 0.4, 0.37]],
  vesta: [[0.3, 0.27, 0.23], [0.17, 0.155, 0.14], [0.44, 0.4, 0.34]],
  ceres: [[0.16, 0.156, 0.15], [0.12, 0.117, 0.113], [0.21, 0.205, 0.198]],
};

// the rendered size: true metres up to 50 km; bigger bodies on the planets scale (Earth radius 6371 km = 600 m)
export const PLANET_SCALE = 600 / 6.371e6;
export function sceneSize(D, size, scale) {
  if (Number.isFinite(+size) && +size > 0) return +size;
  if (Number.isFinite(+scale) && +scale > 0) return D * +scale;
  return D <= 50000 ? D : D * PLANET_SCALE;
}

// ── small 3D value noise (CPU) ──────────────────────────────────────────────────────────────────────────────────
function h3(x, y, z, s) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(s, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn3(x, y, z, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(ix, iy, iz, s), h3(ix + 1, iy, iz, s), ux), L(h3(ix, iy + 1, iz, s), h3(ix + 1, iy + 1, iz, s), ux), uy),
    L(L(h3(ix, iy, iz + 1, s), h3(ix + 1, iy, iz + 1, s), ux), L(h3(ix, iy + 1, iz + 1, s), h3(ix + 1, iy + 1, iz + 1, s), ux), uy), uz) * 2 - 1;
}
const fbm3 = (x, y, z, s, oct = 4) => { let a = 0.5, f = 1, v = 0; for (let i = 0; i < oct; i++) { v += a * vn3(x * f + i * 7.1, y * f - i * 3.3, z * f + i * 5.7, s + i); f *= 2.03; a *= 0.5; } return v; };

// ── the shape ───────────────────────────────────────────────────────────────────────────────────────────────────
// o: {D (true diameter m), type, seed, axes, bilobed, top (equatorial ridge 0..1), craters (count), detail}
function shapeOf(o) {
  const D = o.D, R = rng(o.seed * 7919 + 13);
  const type = o.type;
  const round = type === 'ceres' ? 1 : type === 'vesta' ? 0.72 : smooth((Math.log10(Math.max(D, 1)) - 5.0) / 0.75);   // 100 km .. 560 km -> round
  const angular = type === 'rubble' ? 0 : 1 - smooth((Math.log10(Math.max(D, 1e-3)) - 1.2) / 1.1);          // < 16 m broken facets .. > 200 m none
  const lumps = type === 'ceres' ? 0.012 : type === 'vesta' ? 0.05 : lerp(type === 'iron' ? 0.16 : 0.22, 0.03, round) * (type === 'rubble' ? 0.55 : 1);
  const axes = o.axes || (type === 'ceres' ? [1, 0.93, 1] : type === 'vesta' ? [1, 0.8, 0.975] : type === 'rubble' ? [1, 0.9, 1] : [1, lerp(0.74 + R() * 0.1, 0.96, round), lerp(0.6 + R() * 0.12, 0.97, round)]);
  const top = o.top ?? (type === 'rubble' ? 0.12 : 0);
  // planes of a broken polyhedron (meteoroids): a convex hull of random cuts, edges softened
  const planes = []; for (let i = 0; i < 16; i++) { const z = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - z * z); planes.push([s * Math.cos(a), z, s * Math.sin(a), 0.78 + R() * 0.2]); }
  // craters: a power law of sizes; none on a sub-10 m meteoroid (fusion crust, thumbprints instead)
  const nC = o.craters ?? (D < 10 ? 0 : type === 'rubble' ? 14 : type === 'ceres' ? 70 : type === 'vesta' ? 60 : type === 'iron' ? 24 : Math.round(lerp(18, 80, smooth((Math.log10(D) - 1.5) / 2.5))));
  const craters = [];
  for (let i = 0; i < nC; i++) {
    const z = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    const rr = 0.035 + 0.42 * Math.pow(R(), 5.5);                   // angular radius (rad)
    craters.push({ c: [s * Math.cos(a), z, s * Math.sin(a)], r: rr, d: rr * (type === 'rubble' ? 0.1 : 0.2) * (0.7 + R() * 0.5), fresh: R() });
  }
  if (type === 'vesta') craters.push({ c: [0, -1, 0], r: 0.95, d: 0.075, fresh: 0.9, peak: 0.07 }, { c: [0.3, -0.85, 0.42].map((v) => v / 1.08), r: 0.7, d: 0.035, fresh: 0.3 });   // Rheasilvia (+ Veneneia under it)
  if (type === 'ceres') craters.push({ c: [0.55, 0.36, 0.75].map((v) => v / 1.0), r: 0.1, d: 0.012, fresh: 1, occator: 1 }, { c: [-0.6, -0.2, 0.77], r: 0.16, d: 0.014, fresh: 0.5 });
  // boulders (rubble piles: Bennu / Ryugu / Dimorphos are boulder fields)
  const nB = type === 'rubble' ? 260 : D > 50 && D < 50000 ? 60 : 0;
  const boulders = [];
  for (let i = 0; i < nB; i++) { const z = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - z * z); boulders.push({ c: [s * Math.cos(a), z, s * Math.sin(a)], r: (type === 'rubble' ? 0.03 + 0.11 * Math.pow(R(), 3) : 0.012 + 0.03 * Math.pow(R(), 3)), h: 0.5 + R() * 0.5 }); }
  const bil = o.bilobed || 0, seed = o.seed;
  const radial = (x, y, z) => {
    let r = 1 + lumps * fbm3(x * 1.2 + 3.1, y * 1.2, z * 1.2 - 1.7, seed, 3) + lumps * 0.35 * fbm3(x * 3.3, y * 3.3, z * 3.3, seed + 9, 3);
    if (bil) r *= 1 - bil * 0.35 * Math.exp(-x * x * 9);             // a waist: two lobes along x (Itokawa, Apophis, Eros)
    if (top) r *= 1 + top * Math.pow(1 - Math.abs(y), 3);            // the equatorial ridge of a spinning top
    if (angular > 0.01) {
      let rp = 9;
      for (const p of planes) { const d = x * p[0] + y * p[1] + z * p[2]; if (d > 0.05) rp = Math.min(rp, p[3] / d); }
      const k = 0.07;                                                // smooth min: softened edges
      const h = clamp(0.5 + 0.5 * (rp - r) / k, 0, 1), sm = rp * (1 - h) + r * h - k * h * (1 - h);
      r = lerp(r, sm * 1.08, angular);
    }
    for (const c of craters) {
      const cd = x * c.c[0] + y * c.c[1] + z * c.c[2]; if (cd < Math.cos(Math.min(Math.PI, c.r * 2.2))) continue;
      const q = Math.acos(clamp(cd, -1, 1)) / c.r;
      let h = 0;
      if (q < 1) h = -c.d * (1 - q * q) * (c.r > 0.25 ? Math.min(1, 1.25 - 0.25 * q * q) : 1);
      h += c.d * 0.34 * Math.exp(-(((q - 1) / 0.22) ** 2)) * (0.6 + 0.4 * c.fresh);
      if (q > 1) h += c.d * 0.12 * Math.max(0, 1 - (q - 1) / 1.2);
      if (c.peak && q < 0.28) h += c.peak * (1 - q / 0.28) ** 1.6;   // Rheasilvia's central peak
      r += h;
    }
    for (const b of boulders) {
      const dx = x - b.c[0], dy = y - b.c[1], dz = z - b.c[2], d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < b.r * b.r) r += b.r * b.h * Math.sqrt(1 - d2 / (b.r * b.r));
    }
    if (type === 'vesta') r -= 0.012 * Math.exp(-((y / 0.08) ** 2)) * (0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 26)) * 0.8;   // Divalia Fossae troughs
    return r;
  };
  return { radial, axes, craters, boulders, round, angular, lumps };
}
// the albedo per vertex (+ an AO-ish darkening in crater floors, bright fresh rims)
function colorAt(o, S, x, y, z, r) {
  const C = TYPE_COL[o.type] || TYPE_COL.stony;
  const n = fbm3(x * 2.2 + 11, y * 2.2, z * 2.2, o.seed + 31, 4), m = fbm3(x * 7, y * 7, z * 7, o.seed + 41, 3);
  let c = [0, 1, 2].map((i) => lerp(C[0][i], n > 0 ? C[2][i] : C[1][i], Math.min(1, Math.abs(n) * 1.5)) * (0.9 + 0.2 * m));
  let ao = clamp(1 + (r - 1) * 2.2, 0.55, 1.12);                      // low = darker (crater floors), high = catches light
  for (const cr of S.craters) {
    const cd = x * cr.c[0] + y * cr.c[1] + z * cr.c[2]; if (cd < Math.cos(Math.min(Math.PI, cr.r * 3))) continue;
    const q = Math.acos(clamp(cd, -1, 1)) / cr.r;
    if (cr.occator) { const b = Math.exp(-((q / 0.22) ** 2)) + 0.6 * Math.exp(-(((q - 0.45) / 0.12) ** 2)) * (0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 7)); c = c.map((v) => lerp(v, 0.78, clamp(b))); continue; }
    if (o.type !== 'rubble' && o.type !== 'carbonaceous' && o.type !== 'ceres' && cr.fresh > 0.72) { const ray = Math.exp(-(((q - 1) / 0.5) ** 2)) * 0.35 + (q < 3 ? 0.12 * Math.max(0, Math.sin(Math.atan2(y - cr.c[1], x - cr.c[0]) * 9 + cr.fresh * 40)) * (1 - q / 3) : 0); c = c.map((v) => v * (1 + ray)); }
  }
  if (o.type === 'vesta') { const dark = smooth((fbm3(x * 1.4 + 5, y * 1.4, z * 1.4, o.seed + 77, 3) - 0.1) / 0.3); c = c.map((v, i) => lerp(v, [0.12, 0.11, 0.1][i], dark * 0.6)); }
  return c.map((v) => v * ao);
}

// ── the material: MeshStandard + per-pixel relief, fusion crust / heat glow ──────────────────────────────────────────
function rockMaterial(ctx, o) {
  const iron = o.type === 'iron';
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: iron ? 0.6 : 0.93, metalness: iron ? 0.7 : 0.0, envMapIntensity: iron ? 0.5 : 0.35 });
  const uni = { uBumpA: { value: o.bumpA }, uBumpF: { value: o.bumpF }, uHeat: { value: 0 }, uHeatDir: { value: new THREE.Vector3(0, -1, 0) }, uCrust: { value: o.crust ? 1 : 0 }, uSeed: { value: (o.seed % 97) * 0.37 } };
  m.userData.progKey = 'e2rock';
  m.userData.uni = uni;
  const hook = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRP; varying vec3 vRN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRP = position; vRN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRP; varying vec3 vRN; uniform float uBumpA; uniform float uBumpF; uniform float uHeat; uniform vec3 uHeatDir; uniform float uCrust; uniform float uSeed;
float rh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rh(i), rh(i + vec3(1,0,0)), f.x), mix(rh(i + vec3(0,1,0)), rh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rh(i + vec3(0,0,1)), rh(i + vec3(1,0,1)), f.x), mix(rh(i + vec3(0,1,1)), rh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float rockH(vec3 p, float fw){
  float h = 0.0, a = 1.0, f = 1.0;
  for (int i = 0; i < 5; i++) {
    float k = 1.0 - smoothstep(0.25, 0.7, fw * f);                 // fade octaves finer than a pixel
    float v = rn(p * f + float(i) * 13.7 + uSeed);
    v = 1.0 - abs(v * 2.0 - 1.0);                                   // ridged: sharp cracks and chips
    h += a * k * v; a *= 0.52; f *= 2.13;
  }
  return h;
}
vec3 rockBump(vec3 sp, vec3 sn, float h){
  vec3 sx = dFdx(sp), sy = dFdy(sp); vec3 r1 = cross(sy, sn), r2 = cross(sn, sx); float det = dot(sx, r1);
  vec2 dh = vec2(dFdx(h), dFdy(h)); vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * sn - g);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    vec3 rp = vRP * uBumpF; float fw = length(fwidth(rp));
    float hh = rockH(rp, fw) * uBumpA;
    normal = rockBump(-vViewPosition, normal, hh);
  }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  if (uHeat > 0.001) {
    float face = clamp(dot(normalize(vRN), normalize(uHeatDir)) * 0.5 + 0.5, 0.0, 1.0);
    float glow = uHeat * (0.25 + 1.6 * pow(face, 3.0)) * (0.75 + 0.5 * rn(vRP * 9.0 + uSeed));
    totalEmissiveRadiance += mix(vec3(1.0, 0.32, 0.06), vec3(1.0, 0.86, 0.62), clamp(glow * 0.6, 0.0, 1.0)) * glow * 3.0;
  }`);
  };
  return patchMaterial(m, hook);
}

// ── makeAsteroid: {group (tumbles), mesh, R (rendered radius), setHeat(k, dirWorld), update(t)} ─────────────────
const GEO_CACHE = new Map();
export function makeAsteroid(ctx, o = {}) {
  const pre = PRESETS[String(o.preset || '').toLowerCase()] || {};
  const D = Math.max(1e-4, num(o.diameter, pre.diameter ?? 50));
  let type = String(o.type || pre.type || (D > 9e5 ? 'ceres' : 'stony')).toLowerCase();
  if (type === 'stone' || type === 's') type = 'stony'; if (type === 'metal' || type === 'm' || type === 'nickel') type = 'iron'; if (type === 'c' || type === 'dark' || type === 'carbon') type = 'carbonaceous'; if (type === 'rubble_pile' || type === 'pile') type = 'rubble';
  if (!TYPE_COL[type]) type = 'stony';
  const size = sceneSize(D, o.size, o.scale);
  const seed = Math.round(num(o.seed, 7));
  const detail = clamp(Math.round(num(o.detail, ctx.quality === 'draft' ? 5 : 6)), 3, 7);
  const key = [D.toPrecision(3), type, seed, detail, JSON.stringify(o.axes || pre.axes || null), o.bilobed ?? pre.bilobed ?? 0, o.top ?? pre.top ?? 'd', o.craters ?? 'd'].join('|');
  let geo = GEO_CACHE.get(key), S;
  const so = { D, type, seed, axes: o.axes || pre.axes, bilobed: o.bilobed ?? pre.bilobed, top: o.top ?? pre.top, craters: o.craters };
  if (!geo) {
    S = shapeOf(so);
    geo = new THREE.IcosahedronGeometry(1, detail);
    const P = geo.attributes.position, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      const r = S.radial(x, y, z);
      P.setXYZ(i, x * r * S.axes[0], y * r * S.axes[1], z * r * S.axes[2]);
      const c = colorAt(so, S, x, y, z, r); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    geo.userData.keep = true;
    GEO_CACHE.set(key, geo); if (GEO_CACHE.size > 24) GEO_CACHE.delete(GEO_CACHE.keys().next().value);
  }
  // relief detail: ~40 chips across a meteoroid, finer on big bodies (crater-scale relief is in the mesh)
  const bumpF = D < 30 ? 7 : D < 5000 ? 16 : 34, bumpA = (D < 30 ? 0.035 : 0.012) * size * 0.5 / (bumpF / 16);
  const mat = rockMaterial(ctx, { type, seed, bumpF, bumpA, crust: D < 10 });
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'asteroid'; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.scale.setScalar(size / 2);
  const group = new THREE.Group(); group.name = 'asteroid_tumble'; group.add(mesh);
  // spin: small rocks tumble fast, big bodies turn slowly (screen-time deg/s, overridable)
  const spin = num(o.spin, D < 1 ? 40 : D < 100 ? 14 : D < 5000 ? 8 : D < 1e5 ? 5 : 3);
  const R0 = rng(seed * 31 + 5), ax = new THREE.Vector3(R0() - 0.5, 1.2, R0() - 0.5).normalize(), ax2 = new THREE.Vector3(1, R0() - 0.5, R0() - 0.5).normalize();
  const tumble = o.tumble !== false && type !== 'ceres' && type !== 'vesta' ? num(o.tumble, 0.35) : 0;
  const phase0 = num(o.phase, R0() * 360) * DEG;
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const uni = mat.userData.uni, _inv = new THREE.Quaternion(), _d = new THREE.Vector3();
  const R = size / 2 * Math.max(...(S ? S.axes : (so.axes || [1, 1, 1])));
  return {
    group, mesh, R, size, D, type, spin,
    update(t) {
      q1.setFromAxisAngle(ax, phase0 + spin * DEG * t); q2.setFromAxisAngle(ax2, tumble * Math.sin(t * spin * DEG * 0.37 + 1.3));
      group.quaternion.copy(q1).multiply(q2);
    },
    // heat 0..1+: the face turned into the flight glows (entry); dirWorld = the direction of travel (world)
    setHeat(k, dirWorld) {
      uni.uHeat.value = Math.max(0, k || 0);
      if (dirWorld) { mesh.updateWorldMatrix(true, false); mesh.getWorldQuaternion(_inv).invert(); _d.copy(dirWorld).normalize().applyQuaternion(_inv); uni.uHeatDir.value.copy(_d); }
    },
  };
}

// ── space.asteroid ──────────────────────────────────────────────────────────────────────────────────────────────
async function buildRock(item, ctx) {
  const p = explicitParams(item, CATALOG['space.asteroid']);
  const A = makeAsteroid(ctx, { ...p, seed: p.seed ?? item.seed });
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'space.asteroid';
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  // y: centre height (m). Default: resting on the ground in a world with ground, floating at 0 in space
  const groundless = gy < -5000;
  const y0 = p.y != null ? +p.y : (p.elev != null ? gy + +p.elev + A.R : groundless ? 0 : gy + A.R * (p.rest === false ? 1.2 : 0.82));
  root.position.set(at[0], y0, at[1]);
  root.add(A.group);
  const vel = Array.isArray(p.vel) ? p.vel.map(Number) : null;
  const heat = p.heat != null ? p.heat : 0, hdir = new THREE.Vector3(...(Array.isArray(p.heat_dir) ? p.heat_dir.map(Number) : vel && Math.hypot(...vel) > 0 ? vel : [0, -1, 0]));
  const heatAt = (t) => (Array.isArray(heat) ? lerp(+heat[0], +heat[1], smooth(t / Math.max(0.1, +(p.heat_dur ?? ctx.dur ?? 8)))) : +heat || 0);
  const c0 = root.position.clone();
  const update = (t) => {
    if (vel) root.position.set(c0.x + vel[0] * t, c0.y + vel[1] * t, c0.z + vel[2] * t);
    A.update(t);
    const hk = heatAt(t); if (hk > 0 || A.mesh.material.userData.uni.uHeat.value > 0) A.setHeat(hk, hdir);
  };
  update(0);
  const center = () => root.getWorldPosition(new THREE.Vector3());
  root.userData.noQA = groundless;
  return {
    root, radius: A.R * 1.05, height: A.R * 2, snapped: true, update, anchors: { center: root }, farNeed: A.size > 5000 ? Math.abs(y0) + A.size * 3 : 0,   // a 100 km rock over your head needs a far plane past it
    planet: { key: 'asteroid', R: A.R, obl: 1, center, st: null, body: A.mesh, ring: null, rings: null, spanR: A.R * 1.05 },
    subjectAt: () => { const c = center(); return [c.x, c.y, c.z]; }, subjectTop: A.R * 2, subjectCy: 0,
    asteroid: A,
  };
}

// ── scale.asteroid: the rock beside a reference at true scale ───────────────────────────────────────────────────
const REF_SIZE = {                         // [width across the line, height, depth] m
  person: [0.6, 1.8, 0.4], car: [1.85, 1.45, 4.6], bus: [2.55, 3.2, 12], house: [10, 9, 8], stadium: [260, 48, 220],
  eiffel: [125, 330, 125], empire_state: [60, 443, 60], everest: [16000, 8849, 16000], city: [22000, 300, 22000],
  building6: [24, 20, 14], airliner: [37.6, 12, 35.8], pool: [50, 2, 25], pyramid: [230, 139, 230], burj: [70, 828, 70], vending: [0.9, 1.8, 0.8],
};
const COUNTRY = {                          // lat, lon, rough size km (the Earth is drawn at the planets scale)
  france: [46.6, 2.4, 1000], germany: [51.1, 10.4, 850], uk: [54, -2.5, 950], czechia: [49.8, 15.5, 480], czech_republic: [49.8, 15.5, 480],
  poland: [52, 19.3, 700], spain: [40.2, -3.6, 1000], italy: [42.8, 12.5, 1200], texas: [31.2, -99.3, 1250], california: [37.2, -119.5, 1240],
  japan: [36.5, 138, 2000], korea: [36.4, 127.8, 600], ukraine: [49, 31.3, 1300], usa: [39.5, -98.5, 4500], europe: [50, 12, 3500], australia: [-25.5, 134, 3900], mexico: [23.5, -102, 3000], india: [22, 79, 3000],
};
function stdM(ctx, o) { const m = new THREE.MeshStandardMaterial(o); return patchMaterial(m) || m; }
function box(w, h, d, m, x = 0, y = 0, z = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = b.receiveShadow = true; return b; }
// window grid: a canvas texture of lit/unlit panes (façades)
let WINTEX = null;
function windowTex() {
  if (WINTEX) return WINTEX;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#b8b1a4'; g.fillRect(0, 0, 128, 256);
  const R = rng(5);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const v = 40 + R() * 40; g.fillStyle = `rgb(${v * 0.8},${v * 0.9},${v + 20})`; g.fillRect(x * 16 + 3, y * 16 + 3, 10, 11); }
  WINTEX = new THREE.CanvasTexture(c); WINTEX.wrapS = WINTEX.wrapT = THREE.RepeatWrapping; WINTEX.colorSpace = THREE.SRGBColorSpace; WINTEX.anisotropy = 8; WINTEX.userData.keep = true;
  return WINTEX;
}
function façade(ctx, w, h, d, floors, color = 0xb8b1a4) {
  const t = windowTex().clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, w / 16), Math.max(1, floors / 16));
  const m = stdM(ctx, { map: t, color, roughness: 0.75, metalness: 0.05 });
  return m;
}
async function refModel(kind, ctx, o) {
  const G = new THREE.Group(); G.name = 'ref:' + kind;
  if (kind === 'person') {
    try { const H = await import('../human/cast.js'); const r = await H.build('figure.witness', { at: [0, 0], heading: o.face ?? 90, action: 'stand', pos: [0, 0, 0] }, ctx); r.root.position.set(0, 0, 0); G.add(r.root); G.userData.upd = r.update; }
    catch (e) { const m = stdM(ctx, { color: 0xf1eee8, roughness: 0.6 }); G.add(box(0.45, 1.8, 0.3, m)); }
  } else if (kind === 'car') {
    try { const V = await import('../human/vehicles.js'); const r = await V.build('vehicle.car_modern', { at: [0, 0], heading: 90, action: 'idle', color: o.color || '#8a1f1f' }, ctx); r.root.position.set(0, 0, 0); G.add(r.root); }
    catch (e) { G.add(box(4.6, 1.45, 1.85, stdM(ctx, { color: 0x8a1f1f, roughness: 0.4, metalness: 0.3 }))); }
  } else if (kind === 'bus') {
    // a yellow school bus (12 m): the shape everyone knows
    const body = stdM(ctx, { color: o.color || 0xe8a912, roughness: 0.45, metalness: 0.15 }), glass = stdM(ctx, { color: 0x151c22, roughness: 0.1, metalness: 0.6 }), dark = stdM(ctx, { color: 0x131313, roughness: 0.8 }), chrome = stdM(ctx, { color: 0xbfc3c6, roughness: 0.3, metalness: 0.9 });
    G.add(box(9.6, 2.45, 2.45, body, -1.1, 0.45)); G.add(box(2.2, 1.35, 2.35, body, 4.9, 0.45));                     // body + the hood
    for (let i = 0; i < 9; i++) G.add(box(0.8, 0.75, 2.47, glass, -5.3 + i * 1.03, 1.75));                           // the window row
    G.add(box(0.08, 0.9, 2.2, glass, 3.76, 1.7)); G.add(box(9.62, 0.12, 2.47, dark, -1.1, 1.3)); G.add(box(9.62, 0.12, 2.47, dark, -1.1, 0.95));
    G.add(box(0.2, 0.35, 2.4, chrome, 6.05, 0.4)); G.add(box(9.6, 0.1, 2.3, dark, -1.1, 2.9));
    for (const [x, z] of [[-4.2, 1.1], [-4.2, -1.1], [4.3, 1.1], [4.3, -1.1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 24).rotateX(Math.PI / 2), dark); w.position.set(x, 0.52, z); w.castShadow = true; G.add(w); }
  } else if (kind === 'house') {
    const wall = stdM(ctx, { color: 0xe7dfcf, roughness: 0.85 }), roof = stdM(ctx, { color: 0x6b2f22, roughness: 0.8 }), win = stdM(ctx, { color: 0x1d2530, roughness: 0.2, metalness: 0.4 });
    G.add(box(10, 6, 8, wall));
    const rg = new THREE.BufferGeometry(); const v = new Float32Array([-5.4, 6, 4.3, 5.4, 6, 4.3, 0, 9.3, 4.3, -5.4, 6, -4.3, 0, 9.3, -4.3, 5.4, 6, -4.3]);
    rg.setAttribute('position', new THREE.BufferAttribute(v, 3)); rg.setIndex([0, 1, 2, 5, 3, 4, 0, 2, 4, 0, 4, 3, 1, 5, 4, 1, 4, 2]); rg.computeVertexNormals();
    const rm = new THREE.Mesh(rg, roof); rm.castShadow = true; G.add(rm);
    for (const x of [-3, 0, 3]) for (const y of [1.2, 4.0]) { const w = box(1.2, 1.3, 0.1, win, x, y, 4.02); G.add(w); }
    G.add(box(1.1, 2.1, 0.12, stdM(ctx, { color: 0x3a2618 }), 3.4, 0, 4.03));
  } else if (kind === 'stadium') {
    const conc = stdM(ctx, { color: 0xc9c5bd, roughness: 0.85 }), seats = stdM(ctx, { color: 0x8e2c2c, roughness: 0.7 }), grass = stdM(ctx, { color: 0x2f6b2a, roughness: 0.95 }), roofM = stdM(ctx, { color: 0xf2f2ef, roughness: 0.5, side: THREE.DoubleSide });
    const pts = [new THREE.Vector2(62, 0), new THREE.Vector2(64, 4), new THREE.Vector2(118, 40), new THREE.Vector2(122, 40), new THREE.Vector2(124, 0)];
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), seats); bowl.scale.set(1.05, 1, 0.86); bowl.castShadow = bowl.receiveShadow = true; G.add(bowl);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(124, 126, 40, 96, 1, true), conc); wall.scale.set(1.05, 1, 0.86); wall.position.y = 20; wall.castShadow = true; G.add(wall);
    const rf = new THREE.Mesh(new THREE.RingGeometry(92, 128, 96).rotateX(-Math.PI / 2), roofM); rf.scale.set(1.05, 1, 0.86); rf.position.y = 47; rf.castShadow = true; G.add(rf);
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68).rotateX(-Math.PI / 2), grass); pitch.position.y = 0.05; pitch.receiveShadow = true; G.add(pitch);
    const lines = new THREE.Mesh(new THREE.RingGeometry(9, 9.3, 48).rotateX(-Math.PI / 2), stdM(ctx, { color: 0xeeeeee })); lines.position.y = 0.08; G.add(lines);
  } else if (kind === 'eiffel') {
    // 330 m wrought-iron lattice: four splayed legs to the first floor (57 m), one tapering square shaft above,
    // three platforms, the arches between the legs; the lattice is an alpha-cut texture (reads as iron lace)
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 7; g.strokeRect(0, 0, 64, 64); g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.lineWidth = 4; g.stroke();
    const lt = new THREE.CanvasTexture(c); lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.userData.keep = true;
    const latt = (rx, ry) => { const t = lt.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return stdM(ctx, { color: 0x6a5541, roughness: 0.75, metalness: 0.25, alphaMap: t, alphaTest: 0.45, side: THREE.DoubleSide }); };
    const solid = stdM(ctx, { color: 0x5b4836, roughness: 0.7, metalness: 0.3 });
    const hw = (y) => y <= 57 ? lerp(62.5, 35, Math.pow(y / 57, 0.8)) : y <= 115 ? lerp(35, 20, (y - 57) / 58) : y <= 276 ? lerp(20, 5, Math.pow((y - 115) / 161, 0.9)) : lerp(5, 2.5, (y - 276) / 30);
    // legs: square frusta from each base corner to the first floor
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const b0 = new THREE.Vector3(sx * 49, 0, sz * 49), b1 = new THREE.Vector3(sx * 27, 57, sz * 27), L = b0.distanceTo(b1);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 13.5, L, 4, 6, true), latt(2, 6)); leg.geometry.rotateY(Math.PI / 4);
      leg.position.copy(b0).add(b1).multiplyScalar(0.5); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b1.clone().sub(b0).normalize()); leg.castShadow = true; G.add(leg);
      const leg2 = leg.clone(); leg2.material = solid; leg2.scale.set(0.35, 1, 0.35); G.add(leg2);
    }
    const shaft = []; for (let i = 0; i <= 40; i++) { const y = 57 + i / 40 * 255; shaft.push(new THREE.Vector2(hw(y) * Math.SQRT2, y)); }
    const sh = new THREE.Mesh(new THREE.LatheGeometry(shaft, 4), latt(6, 60)); sh.rotation.y = Math.PI / 4; sh.castShadow = true; G.add(sh);
    const core = new THREE.Mesh(new THREE.LatheGeometry(shaft.map((v) => new THREE.Vector2(v.x * 0.3, v.y)), 4), solid); core.rotation.y = Math.PI / 4; G.add(core);
    for (const [y, w] of [[57, 72], [115, 42], [276, 13]]) { G.add(box(w, 5, w, solid, 0, y - 2.5, 0)); }
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2, 24, 8), solid); ant.position.y = 318; G.add(ant);
    for (const s2 of [1, -1]) {                                            // the decorative arches between the legs
      const arch = new THREE.Mesh(new THREE.TorusGeometry(37, 1.8, 6, 32, Math.PI), solid); arch.scale.set(1, 0.95, 1); arch.position.set(0, 18, s2 * 42); G.add(arch);
      const a2 = arch.clone(); a2.rotation.y = Math.PI / 2; a2.position.set(s2 * 42, 18, 0); G.add(a2);
    }
  } else if (kind === 'empire_state') {
    const lime = (w, f) => façade(ctx, w, 0, 0, f, 0xc9c2b2);
    const tiers = [[57, 61, 5], [48, 90, 20], [42, 20, 4], [36, 40, 6], [30, 150, 44], [25, 18, 4], [18, 12, 3]];
    let y = 0; for (const [w, h, f] of tiers) { G.add(box(w, h, w * 0.9, lime(w, f), 0, y)); y += h; }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 6, 45, 12), stdM(ctx, { color: 0xb8b2a4, roughness: 0.5, metalness: 0.3 })); mast.position.y = y + 22; G.add(mast);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 60, 8), stdM(ctx, { color: 0x9a9a9a, metalness: 0.6, roughness: 0.4 })); sp.position.y = y + 45 + 30; G.add(sp);
  } else if (kind === 'building6') {
    // a six-storey apartment block (~20 m): a window grid, a flat roof with a parapet
    const w = 24, h = 20, d = 14;
    G.add(box(w, h, d, façade(ctx, w, h, d, 6, 0xcfc6b6), 0, 0, 0));
    G.add(box(w + 0.4, 0.8, d + 0.4, stdM(ctx, { color: 0x8d877c, roughness: 0.9 }), 0, h, 0));
  } else if (kind === 'airliner') {
    try { const V = await import('../human/vehicles.js'); const r = await V.build('aircraft.airliner', { at: [0, 0], heading: 90, action: 'idle' }, ctx); r.root.position.set(0, 0, 0); G.add(r.root); }
    catch (e) { G.add(box(37.6, 4, 4, stdM(ctx, { color: 0xeeeeee }))); }
  } else if (kind === 'pool') {
    // an Olympic pool (50 x 25 m): the deck, lane ropes, the water
    const deck = stdM(ctx, { color: 0xd8d4cc, roughness: 0.8 }), water = stdM(ctx, { color: 0x2a8fb8, roughness: 0.08, metalness: 0.1, envMapIntensity: 1.5 }), rope = stdM(ctx, { color: 0xc03030, roughness: 0.5 });
    G.add(box(58, 0.4, 33, deck, 0, -0.2, 0));
    const wtr = new THREE.Mesh(new THREE.PlaneGeometry(50, 25).rotateX(-Math.PI / 2), water); wtr.position.y = 0.03; G.add(wtr);
    for (let i = 1; i < 10; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 50, 6).rotateZ(Math.PI / 2), rope); r.position.set(0, 0.08, -12.5 + i * 2.5); G.add(r); }
  } else if (kind === 'pyramid') {
    // the Great Pyramid (139 m today, 230 m base), limestone
    const pg = new THREE.ConeGeometry(230 / Math.SQRT2, 139, 4, 1); pg.rotateY(Math.PI / 4); pg.translate(0, 69.5, 0);
    const py = new THREE.Mesh(pg, stdM(ctx, { color: 0xc9ae7c, roughness: 0.95, flatShading: true })); py.castShadow = py.receiveShadow = true; G.add(py);
  } else if (kind === 'burj') {
    // the tallest building (Burj Khalifa, 828 m): a stepped Y-plan tower tapering to a spire
    const glassy = façade(ctx, 40, 0, 0, 40, 0xaebfcc);
    const tiers = [[70, 160], [58, 160], [46, 150], [34, 120], [24, 90], [14, 60]]; let y = 0;
    for (const [w, h] of tiers) { for (let k = 0; k < 3; k++) { const b = box(w * 0.34, h, w * 0.62, glassy, 0, y, 0); b.rotation.y = k * Math.PI * 2 / 3; b.position.x = Math.sin(k * 2.094) * w * 0.14; b.position.z = Math.cos(k * 2.094) * w * 0.14; G.add(b); } y += h; }
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 5, 828 - y, 8), stdM(ctx, { color: 0xb8c4cc, metalness: 0.7, roughness: 0.3 })); sp.position.y = y + (828 - y) / 2; G.add(sp);
  } else if (kind === 'vending') {
    // a vending machine (DART was about this size)
    const body = stdM(ctx, { color: 0xb02020, roughness: 0.4, metalness: 0.2 }), glass = stdM(ctx, { color: 0x1a2530, roughness: 0.1, metalness: 0.4 });
    G.add(box(0.9, 1.8, 0.8, body)); G.add(box(0.55, 1.1, 0.02, glass, -0.1, 0.55, 0.41));
  } else if (kind === 'everest') {
    const g = new THREE.PlaneGeometry(26000, 26000, 220, 220).rotateX(-Math.PI / 2), P = g.attributes.position, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z) / 11000, a = Math.atan2(z, x);
      const ridge = Math.pow(Math.abs(Math.cos(a * 1.5 + 0.4)), 6) * 0.22;                // three ridges (a pyramid peak)
      let h = 8849 * Math.pow(Math.max(0, 1 - r), 1.7) * (1 + ridge) + 700 * fbm3(x / 1800, 0, z / 1800, 3, 4) * Math.max(0, 1 - r * 0.8);
      h = Math.max(0, h); P.setY(i, h);
      const snow = smooth((h - 5300) / 900), gk = smooth(h / 1800), rock = [lerp(0.16, 0.26, gk), lerp(0.17, 0.245, gk), lerp(0.1, 0.225, gk)];
      col[i * 3] = lerp(rock[0], 0.9, snow); col[i * 3 + 1] = lerp(rock[1], 0.92, snow); col[i * 3 + 2] = lerp(rock[2], 0.95, snow);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const mtn = new THREE.Mesh(g, stdM(ctx, { vertexColors: true, roughness: 0.9 })); mtn.castShadow = mtn.receiveShadow = true; G.add(mtn);
  } else if (kind === 'city') {
    const n = 5200, R = rng(11), geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, façade(ctx, 30, 0, 0, 30, 0xb3ada2), n), m4 = new THREE.Matrix4(), cc = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(R() * 110) - 55, gz = Math.floor(R() * 110) - 55, r = Math.hypot(gx, gz) / 55; if (r > 1) { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); continue; }
      const h = 12 + (r < 0.18 ? 260 * Math.pow(R(), 2) : 60 * Math.pow(R(), 3)) * (1 - r * 0.8), w = 40 + R() * 60;
      m4.makeScale(w, h, w * (0.7 + R() * 0.6)); m4.setPosition(gx * 190 + (R() - 0.5) * 60, 0, gz * 190 + (R() - 0.5) * 60); im.setMatrixAt(i, m4);
      im.setColorAt(i, cc.setHSL(0.08, 0.05, 0.55 + R() * 0.25));
    }
    im.castShadow = im.receiveShadow = true; G.add(im);
    const base = new THREE.Mesh(new THREE.CircleGeometry(11000, 96).rotateX(-Math.PI / 2), stdM(ctx, { color: 0x4a4845, roughness: 0.95 })); base.position.y = 0.5; base.receiveShadow = true; G.add(base);
  }
  return G;
}
async function buildScale(item, ctx) {
  const p = explicitParams(item, CATALOG['scale.asteroid']);
  let ref = String(p.ref || p.compare || 'person').toLowerCase().replace(/[\s-]+/g, '_');
  const alias = { human: 'person', man: 'person', you: 'person', people: 'person', vehicle: 'car', school_bus: 'bus', home: 'house', building: 'house', arena: 'stadium', football_stadium: 'stadium', eiffel_tower: 'eiffel', empire_state_building: 'empire_state', skyscraper: 'empire_state', mount_everest: 'everest', mountain: 'everest', manhattan: 'city', town: 'city',
    apartment: 'building6', apartment_block: 'building6', six_storey: 'building6', six_story: 'building6', office_block: 'building6', jet: 'airliner', plane: 'airliner', passenger_jet: 'airliner', swimming_pool: 'pool', olympic_pool: 'pool', great_pyramid: 'pyramid', pyramid_of_giza: 'pyramid', burj_khalifa: 'burj', tallest_building: 'burj', vending_machine: 'vending', dart: 'vending' };
  ref = alias[ref] || ref;
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'scale.asteroid';
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  root.position.set(at[0], gy, at[1]);
  const A = makeAsteroid(ctx, { ...p, seed: p.seed ?? item.seed, size: p.size, scale: p.scale ?? 1 });
  const upd = [];
  let refW = 0, refH = 0, span = 0;
  const country = COUNTRY[ref] || (ref === 'country' ? COUNTRY[String(p.country || 'france').toLowerCase()] || COUNTRY.france : null);
  if (country) {
    // the rock hovering over a country: the Earth drawn at the planets scale, the rock at the same scale above it
    const S = PLANET_SCALE, Re = 600, [lat, lon] = country;
    const sp = await import('../nature/space.js');
    const e = await sp.build('space.earth', { at: [0, 0], y: -Re, radius: Re, spin: 0, lon, lat, tilt: 0, clouds: p.clouds ?? 0.25, face: [0, 1e4, 0] }, ctx);
    e.root.position.set(0, -Re, 0); root.add(e.root); upd.push((t) => e.update(t));
    const Rr = A.D * S / 2; A.mesh.scale.setScalar(Rr); A.group.position.set(0, Rr * (1 + num(p.hover, 0.6)) + 2, 0); root.add(A.group);
    refW = country[2] * 1000 * S; refH = 0; span = Math.max(refW, Rr * 2);
    const res = { root, radius: span * 0.75, height: Rr * 3, snapped: true, update: (t) => { A.update(t); for (const f of upd) f(t); }, anchors: { rock: A.group, ref: e.root } };
    res.subjectAt = () => { const c = A.group.getWorldPosition(new THREE.Vector3()); return [c.x, c.y * 0.5, c.z]; }; res.subjectTop = Rr * 3; res.subjectCy = 0;
    root.userData.noQA = true;
    return res;
  }
  const dims = REF_SIZE[ref] || REF_SIZE.person;
  const model = await refModel(REF_SIZE[ref] ? ref : 'person', ctx, p);
  refW = dims[0]; refH = dims[1];
  const R = A.size / 2;
  const gap = num(p.gap, Math.max(0.6, 0.25 * Math.min(R * 2, Math.max(refW, 1))));
  const side = p.side === 'right' ? 1 : -1;                           // the reference stands left of the rock (as seen from the south) by default
  const xRef = side * (R + gap + refW / 2);
  model.position.set(xRef, 0, 0);
  if (ref === 'car' || ref === 'bus' || ref === 'airliner') model.rotation.y = 0;
  root.add(model);
  if (model.userData.upd) upd.push(model.userData.upd);
  if (refW > 2000 || A.size > 2000) {
    const Rg = Math.max(refW, A.size) * 5, dg = new THREE.CircleGeometry(Rg, 128).rotateX(-Math.PI / 2), P = dg.attributes.position, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const n = fbm3(P.getX(i) / 3000, 0, P.getZ(i) / 3000, 5, 4); col[i * 3] = 0.16 + 0.05 * n; col[i * 3 + 1] = 0.17 + 0.05 * n; col[i * 3 + 2] = 0.1 + 0.03 * n; }
    dg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const disc = new THREE.Mesh(dg, stdM(ctx, { vertexColors: true, roughness: 0.95 })); disc.position.y = -1.5; disc.receiveShadow = true; disc.userData.noQA = true; root.add(disc);
  }
  const hover = num(p.hover, 0);
  A.group.position.set(0, R * (A.size > 500 ? 0.72 : 0.86) + hover * R * 2, 0); root.add(A.group);
  if (hover < 0.05) {                                                  // a soft dark contact under the rock (any size; the shadow map may not reach)
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cg = cv.getContext('2d'); const gr = cg.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cg.fillStyle = gr; cg.fillRect(0, 0, 128, 128);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.6, R * 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.8 }));
    blob.position.y = Math.max(0.02, R * 0.002); blob.renderOrder = 2; blob.userData.noQA = true; root.add(blob);
  }
  // a contact shadow under the rock (it sits on the ground)
  span = Math.abs(xRef) + refW / 2 + R;
  const cx = (xRef + side * refW / 2 + -side * R) / 2;
  const centre = new THREE.Object3D(); centre.position.set(cx, Math.max(R, refH / 2), 0); root.add(centre);
  const res = { root, radius: span * 0.55, height: Math.max(R * 2, refH), snapped: true, update: (t) => { A.update(t); for (const f of upd) f(t); }, anchors: { rock: A.group, ref: model, center: centre } };
  res.subjectAt = () => { const c = centre.getWorldPosition(new THREE.Vector3()); return [c.x, c.y, c.z]; }; res.subjectTop = Math.max(R * 2, refH); res.subjectCy = 0;
  res.footprint = [span, Math.max(R * 2, dims[2])];
  res.update(0);
  return res;
}

export const CATALOG = {
  'space.asteroid': {
    desc: 'ONE asteroid / meteoroid of any size, from a 1 mm grain to Ceres (940 km): diameter (m) sets the look — broken angular facets under ~20 m, a cratered potato for km rocks, a round body past ~400 km; type stony|carbonaceous|iron|rubble|vesta|ceres; tumbles; presets for real bodies (tc3, chelyabinsk, tunguska, barringer, city_killer, apophis, bennu, didymos, dimorphos, km1, chicxulub, eros, psyche, vesta, ceres). In a world with ground it rests on the ground unless y/elev is given; in space it floats (camera: approach / orbit_planet work on it)',
    actions: ['idle', 'tumble'],
    params: { diameter: 'm (default 50, or the preset\'s)', type: 'stony|carbonaceous|iron|rubble|vesta|ceres', preset: 'name', y: 'm', spin: 'deg/s', tumble: '0..1', heat: '0..1', vel: '[vx, vy, vz]' },
    doc: {
      diameter: 'true diameter in metres (0.001 .. 1,000,000). Rendered 1:1 up to 50 km; bigger bodies on the planets scale (Earth radius 6371 km = 600 m: Vesta 49 m, Ceres 88 m) unless size/scale is given',
      preset: 'grain|pebble|meteoroid|tc3|chelyabinsk|tunguska|barringer|city_killer|apophis|bennu|ryugu|itokawa|didymos|dimorphos|km1|chicxulub|eros|psyche|vesta|ceres (sets diameter, type and shape)',
      type: 'stony (grey-brown S-type) | carbonaceous (near-black C-type) | iron (metallic) | rubble (a spinning-top pile of boulders, Bennu/Ryugu/Didymos) | vesta (Rheasilvia basin + central peak, troughs) | ceres (round, dark, Occator bright spots)',
      size: 'rendered diameter in scene metres (overrides the default scale)', scale: 'scene metres per real metre',
      y: 'centre height (m); default: resting on the ground (ground worlds) / 0 (space)', elev: 'height of its lowest point above the ground (m)',
      spin: 'deg/s (default by size: 40 for grains .. 3 for dwarf planets)', tumble: '0..1 wobble of the spin axis (false = none)', phase: 'start angle (deg)',
      heat: '0..1 (or [from, to] over heat_dur) the leading face glows (entry)', vel: '[vx, vy, vz] m/s drift (a flyby)', axes: '[a, b, c] shape axes', seed: 'int (another rock)',
    },
    footprint: [50, 50], height: 50, snap: false, fly: true, tags: ['asteroid', 'meteoroid', 'meteorite', 'rock', 'space', 'comet', 'dwarf planet', 'vesta', 'ceres', 'apophis', 'bennu'],
  },
  'scale.asteroid': {
    desc: 'SCALE COMPARISON that reads at a glance: the asteroid beside a reference at TRUE scale on one ground line — person (the white mannequin) | vending (DART-size) | car | bus | house | building6 (six-storey block, 20 m) | airliner (38 m jet) | pool (Olympic, 50 m) | pyramid (Great Pyramid, 139 m) | stadium | eiffel (330 m) | empire_state (443 m) | burj (tallest building, 828 m) | everest (8,849 m) | city (22 km) | country (france, germany, uk, czechia, poland, spain, italy, texas, california, japan, korea, ukraine, usa, europe, australia, mexico, india: the rock hovering over the real map, planets scale). Frame it with orbit / push_in / pull_back on objects:N (its centre sits between the two)',
    actions: ['idle'],
    params: { diameter: 'm', type: 'stony|carbonaceous|iron|rubble', preset: 'name', ref: 'person|car|bus|house|stadium|eiffel|empire_state|everest|city|country', country: 'france|...', gap: 'm', side: 'left|right', hover: 'diameters' },
    doc: {
      ref: 'person|vending|car|bus|house|building6|airliner|pool|pyramid|stadium|eiffel|empire_state|burj|everest|city|country|<country name>',
      diameter: 'the rock (m), or preset (see space.asteroid)', gap: 'm between the two (default ~25 % of the smaller)', side: 'left|right: where the reference stands (seen from the south)',
      hover: 'rock height above the ground in diameters (0 = resting)', country: 'for ref country',
    },
    footprint: [60, 60], height: 60, tags: ['asteroid', 'scale', 'comparison', 'size', 'versus', 'eiffel', 'empire state', 'everest', 'stadium', 'bus'],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'scale.asteroid') return buildScale(item, ctx);
  return buildRock(item, ctx);
}

// E5 (explosions, 30 Sep 2026): the reference models reused by scale.tnt (additive export)
export { refModel as buildRefModel, REF_SIZE };
