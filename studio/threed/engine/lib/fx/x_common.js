// x_common.js — E5 (explosions kit, 30 Sep 2026): shared machinery for lib/fx/x_*.js. Not a module (no CATALOG).
//   yield     parseYield('15 kt') -> tonnes of TNT; fmtYield(t) -> '15 kt'
//   scaling   blast radii ~ W^1/3 (Hopkinson-Cranz), a nuclear fireball ~ W^0.4, stabilised cloud heights by table
//             (Glasstone & Dolan, The Effects of Nuclear Weapons, 1977; Halifax / Beirut / MOAB cloud heights)
//   cpuffs    lit billows (billow.js) with a colour AND a temperature per puff: one sorted mesh can hold a whole mushroom
//             cloud (stem, cap, collars, the white condensation, the glowing core), so its parts overlap correctly
//   fireball  an emissive boiling black-body sphere (the first second of a nuclear fireball, a fuel-air flash)
//   veil      a smooth translucent condensation shell (the Wilson cloud's crisp edge, the ice cap over a rising head)
//   flash     glow sprites + a hard light from the burst that throws shadows towards the camera
// Everything is a pure function of t (seeded hashes), like the rest of lib/fx.
import * as THREE from 'three';
import { U, FOG_GLSL } from '../shared/env.js';
import { BILLOW_GLSL, billowUniforms, softDepth } from './billow.js';
import { FXU, clamp, lerp, sstep, hf } from './f_common.js';

export const DEG = Math.PI / 180;
export const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
export const headingYaw = (h) => Math.PI - (h ?? 180) * DEG;          // a +Z-facing model turned to face compass h
export const smoothstep = (a, b, x) => sstep(a, b, x);

// ── yield ────────────────────────────────────────────────────────────────────────────────────────────────────────
const UNITS = { g: 1e-6, gram: 1e-6, grams: 1e-6, kg: 1e-3, kilogram: 1e-3, kilograms: 1e-3, t: 1, ton: 1, tons: 1, tonne: 1, tonnes: 1,
  kt: 1e3, kiloton: 1e3, kilotons: 1e3, mt: 1e6, megaton: 1e6, megatons: 1e6, gt: 1e9 };
// -> tonnes of TNT. A number is tonnes (0.001 = 1 kg, 15000 = 15 kt); strings: '3 g', '1 kg', '11 t', '15 kt', '50 Mt'
export function parseYield(v, dflt = 1) {
  if (v == null || v === '') return dflt;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : dflt;
  const m = String(v).trim().toLowerCase().replace(/,/g, '').match(/^([0-9.]+(?:e[-+]?\d+)?)\s*([a-z]+)?/);
  if (!m) return dflt;
  const x = +m[1], u = m[2] || 't';
  return Number.isFinite(x) && x > 0 ? x * (UNITS[u] ?? 1) : dflt;
}
export function fmtYield(t) {
  const f = (x) => (x >= 100 ? Math.round(x).toString() : x >= 10 ? x.toFixed(x % 1 ? 1 : 0) : (+x.toPrecision(2)).toString());
  if (t >= 1e6) return f(t / 1e6) + ' Mt';
  if (t >= 1e3) return f(t / 1e3) + ' kt';
  if (t >= 1) return f(t) + ' t';
  if (t >= 1e-3) return f(t * 1e3) + ' kg';
  return f(t * 1e6) + ' g';
}

// ── scaling ──────────────────────────────────────────────────────────────────────────────────────────────────────
// log-interpolation in a table of (log10 x, y)
function tab(X, Y, x) {
  const l = Math.log10(Math.max(x, 1e-12));
  if (l <= X[0]) return Y[0] * Math.pow(10, (l - X[0]) * 0.33);
  if (l >= X[X.length - 1]) return Y[Y.length - 1] * Math.pow(10, (l - X[X.length - 1]) * 0.2);
  let i = 0; while (i < X.length - 2 && l > X[i + 1]) i++;
  const u = (l - X[i]) / (X[i + 1] - X[i]);
  return Math.exp(Math.log(Y[i]) + (Math.log(Y[i + 1]) - Math.log(Y[i])) * u);
}
// nuclear (W in kt): the fireball (air burst, max radius, Glasstone 2.  R ~ 70 m W^0.4), the time of the second
// thermal maximum (0.0417 W^0.44 s), and the stabilised cloud (~10 min): top, cap radius, cap thickness
const LW = [-3, -2, -1, 0, 1, 1.301, 2, 3, 4, 4.699, 5];
const TOP = [0.45, 1.1, 2.6, 6.0, 12.0, 16.0, 18.5, 22.0, 37.0, 64.0, 75.0];          // km (15 kt 16, 1 Mt 22, 10 Mt 37, 50 Mt 64-67)
const CAPR = [0.15, 0.35, 0.8, 1.8, 4.0, 5.2, 7.0, 11.0, 28.0, 47.0, 55.0];          // km (Tsar Bomba: 95 km wide)
export function nukeDims(Wkt, burst = 'air') {
  const W = Math.max(1e-4, Wkt);
  const surf = burst === 'surface' || burst === 'tower' || burst === 'water';
  const Rfb = 70 * Math.pow(W, 0.4) * (surf ? 1.26 : 1);
  const top = tab(LW, TOP, W) * 1000, capR = tab(LW, CAPR, W) * 1000;
  const thick = top * (W >= 1000 ? 0.4 : 0.36);
  return { W, Rfb, tmax: 0.0417 * Math.pow(W, 0.44), top, capR, thick, capBase: top - thick, surf };
}
// conventional (W in tonnes TNT): fireball radius ~ 0.75 m kg^1/3 (x2.4 for a fuel-air / thermobaric cloud), the cloud
// top (Halifax 2.9 kt: 3.6 km; Beirut ~1 kt: ~1.5 km; MOAB 11 t: ~0.5 km)
export function convDims(Wt, kind = 'tnt') {
  const kg = Math.max(1e-6, Wt * 1000), c = Math.cbrt(kg);
  const k = kind === 'thermobaric' ? 2.4 : kind === 'ammonium_nitrate' ? 1.25 : kind === 'ship' ? 1.1 : 1;
  const Rfb = 0.75 * c * k;
  const top = Math.max(Rfb * 3, 30 * c * (kind === 'thermobaric' ? 1.5 : 1) * Math.pow(Math.max(1, kg / 1e6), -0.05));
  return { kg, c, Rfb, top, capR: top * 0.32, thick: top * 0.32, capBase: top * 0.68 };
}
// the blast front radius r(t) (m, real seconds): Sedov-Taylor near (r = 1.03 (E/rho)^0.2 t^0.4), then at the speed of
// sound from where the Sedov front slows to it (t*). W in kg TNT (4.184 MJ/kg).
export function shockR(t, Wkg) {
  if (t <= 0) return 0;
  const a = 1.03 * Math.pow(4.184e6 * Wkg / 1.2, 0.2), ts = Math.pow(1.1662e-3 * a, 1 / 0.6), rs = a * Math.pow(ts, 0.4);   // dr/dt = 343 at ts
  return t < ts ? a * Math.pow(t, 0.4) : rs + 343 * (t - ts);
}
export function shockArrive(d, Wkg) {                     // real seconds for the front to reach d metres
  const a = 1.03 * Math.pow(4.184e6 * Wkg / 1.2, 0.2), ts = Math.pow(1.1662e-3 * a, 1 / 0.6), rs = a * Math.pow(ts, 0.4);
  return d <= rs ? Math.pow(d / a, 2.5) : ts + (d - rs) / 343;
}
// peak overpressure (kPa) at d metres from a surface burst of Wkg (Kinney-Graham fit on the scaled distance Z)
export function overpressure(d, Wkg) {
  const Z = d / Math.cbrt(Math.max(Wkg, 1e-6)), a = Z / 4.5;
  return 101.3 * 808 * (1 + a * a) / (Math.sqrt(1 + (Z / 0.048) ** 2) * Math.sqrt(1 + (Z / 0.32) ** 2) * Math.sqrt(1 + (Z / 1.35) ** 2));
}

// ── black body (temperature 0..1: 0 dark red, 0.35 orange-red, 0.6 orange-yellow, 0.85 yellow-white, 1 white) ─────
export const BB_GLSL = /* glsl */`
vec3 bbody(float T) {
  T = clamp(T, 0.0, 1.0);
  vec3 c = mix(vec3(0.42, 0.03, 0.005), vec3(1.0, 0.24, 0.03), smoothstep(0.0, 0.35, T));
  c = mix(c, vec3(1.0, 0.55, 0.14), smoothstep(0.3, 0.6, T));
  c = mix(c, vec3(1.0, 0.84, 0.55), smoothstep(0.55, 0.85, T));
  c = mix(c, vec3(1.0, 0.97, 0.93), smoothstep(0.82, 1.0, T));
  return c;
}`;
export function bbody(T, out = new THREE.Color()) {
  T = clamp(T);
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  let c = mix([0.42, 0.03, 0.005], [1.0, 0.24, 0.03], sstep(0, 0.35, T));
  c = mix(c, [1.0, 0.55, 0.14], sstep(0.3, 0.6, T));
  c = mix(c, [1.0, 0.84, 0.55], sstep(0.55, 0.85, T));
  c = mix(c, [1.0, 0.97, 0.93], sstep(0.82, 1.0, T));
  return out.setRGB(c[0], c[1], c[2]);
}

// ── cpuffs: lit billows with a per-puff colour and temperature ───────────────────────────────────────────────────
const CP_VS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 iA;   // xyz centre (world), size (radius m)
attribute vec4 iB;   // rotation, alpha, atlas cell, ground y
attribute vec4 iC;   // albedo, glow, heat, stretch (vertical elongation)
attribute vec4 iD;   // soft, occ, seed, blend
attribute vec4 iE;   // colour rgb (x the mesh tint), temperature 0..1 of the heat
uniform float uFogK;
${FOG_GLSL}
varying vec2 vQ; varying vec2 vCS; varying vec3 vW; varying vec3 vR; varying vec3 vU; varying vec3 vF;
varying float vAlpha; varying float vGround; varying float vSize; varying vec3 vC; varying float vDepth;
varying vec4 vD; varying float vCell; varying vec4 vFog; varying vec4 vE;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 fwd = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  vec2 q = position.xy * 2.0;
  vec2 qs = vec2(q.x, q.y * (1.0 + iC.w));
  vec3 w = iA.xyz + (right * qs.x + up * qs.y) * iA.w;
  vQ = q; vCS = vec2(cos(iB.x), sin(iB.x)); vW = w; vR = right; vU = up; vF = fwd;
  vAlpha = iB.y; vGround = iB.w; vSize = iA.w; vC = iC.xyz; vD = iD; vE = iE;
  vCell = mod(floor(iB.z + 0.5) + 4.0 * floor(fract(iD.z * 7.123) * 4.0), 16.0);
  vec4 mv = viewMatrix * vec4(w, 1.0);
  vDepth = -mv.z;
  vec3 fr = iA.xyz - cameraPosition; float fd = length(fr); vec3 frd = fr / max(fd, 1e-3);
  vFog = vec4(wfogColor(frd), wfogAmount(cameraPosition, frd, fd) * uFogK);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const CP_FS = /* glsl */`
#include <logdepthbuf_pars_fragment>
uniform vec3 uTint; uniform vec3 uGlowCol; uniform float uHeatHDR; uniform vec3 uSunDir;
uniform vec3 uKey; uniform vec3 uSky; uniform vec3 uGnd; uniform float uNear; uniform float uLightK;
uniform float uGroundFade; uniform float uSoftK; uniform vec3 uFlashDir; uniform vec3 uFlashCol;
${BILLOW_GLSL}
${BB_GLSL}
varying vec2 vQ; varying vec2 vCS; varying vec3 vW; varying vec3 vR; varying vec3 vU; varying vec3 vF;
varying float vAlpha; varying float vGround; varying float vSize; varying vec3 vC; varying float vDepth;
varying vec4 vD; varying float vCell; varying vec4 vFog; varying vec4 vE;
void main() {
  #include <logdepthbuf_fragment>
  float soft = vD.x, occ = vD.y;
  vec4 b = billowTex(vQ, vCS, vCell, vD.z, soft);
  float den = b.x;
  float a = clamp(den * vAlpha, 0.0, 1.0);
  a *= smoothstep(vGround - 0.1 * vSize, vGround + uGroundFade * vSize, vW.y);
  a *= smoothstep(uNear * 0.4, uNear, vDepth);
  if (a < 0.003) discard;
  a *= billowSoftDepth(vDepth, vSize * uSoftK);
  if (a < 0.003) discard;
  vec3 N = normalize(vR * b.y + vU * b.z + vF * sqrt(max(1.0 - dot(b.yz, b.yz), 0.02)));
  float ao = b.w;
  if (vD.w > 0.0) { N = normalize(mix(N, vF, vD.w)); ao = mix(b.w, 1.0, 0.7 * vD.w); }
  vec3 V = normalize(vW - cameraPosition);
  vec3 alb = uTint * vE.rgb * vC.x * (0.9 + 0.2 * den);
  vec3 col = billowLight(alb, N, uSunDir, V, den, ao, occ, soft, uKey * (0.95 * uLightK), uSky * 0.85, uGnd * 0.85);
  // the burst's own light (a flash, a fireball below): wrapped diffuse on the bump normal, only on the lit surface
  float fl = clamp((dot(N, uFlashDir) + 0.45) / 1.45, 0.0, 1.0);
  col += alb * uFlashCol * fl * mix(0.35, 1.0, occ);
  float under = clamp(0.55 - N.y * 0.6, 0.0, 1.0);
  col += alb * uGlowCol * vC.y * (0.35 + under) * mix(1.0, ao, 0.4) + uGlowCol * vC.y * 0.06 * (1.0 - den);
  // hot core: black-body by the puff's temperature, hottest in the crevices; blooms above the grade's threshold
  float T = vE.a;
  vec3 hot = bbody(T) * uHeatHDR * (0.25 + 1.6 * T * T) * (0.5 + 0.5 * den) * mix(1.0, 1.3 - ao * 0.6, 0.5);
  col = mix(col, hot, clamp(vC.z * (0.35 + 0.65 * den), 0.0, 1.0));
  col = mix(col, vFog.rgb, vFog.a);
  gl_FragColor = vec4(col, a);
}`;
// o: {count, tint, glow, heatHDR, near, fog, light, order, groundFade, softK, name}
// push(x, y, z, size, rot, alpha, cell, gy, alb, glow, heat, stretch, soft, occ, seed, blend, r, g, b, temp)
export function makeCPuffs(ctx, o = {}) {
  const N = o.count ?? 2000;
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
  const arrs = [0, 1, 2, 3, 4].map(() => new Float32Array(N * 4));
  const attrs = arrs.map((a) => new THREE.InstancedBufferAttribute(a, 4).setUsage(THREE.DynamicDrawUsage));
  ['iA', 'iB', 'iC', 'iD', 'iE'].forEach((n, i) => geo.setAttribute(n, attrs[i]));
  geo.instanceCount = 0;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1); geo.boundingBox = new THREE.Box3(new THREE.Vector3(-0.5, -0.5, 0), new THREE.Vector3(0.5, 0.5, 0));
  const uniforms = {
    ...billowUniforms(U.uTime), uTint: { value: new THREE.Color(...(o.tint || [1, 1, 1])) },
    uGlowCol: { value: new THREE.Color(...(o.glow || [1.0, 0.42, 0.12])) }, uHeatHDR: { value: o.heatHDR ?? 3.0 },
    uNear: { value: o.near ?? 6 }, uFogK: { value: o.fog ?? 1 }, uLightK: { value: o.light ?? 1 },
    uGroundFade: { value: o.groundFade ?? 0.35 }, uSoftK: { value: o.softK ?? 0.35 },
    uFlashDir: { value: new THREE.Vector3(0, 1, 0) }, uFlashCol: { value: new THREE.Color(0, 0, 0) },
    uKey: FXU.uKey, uSky: FXU.uSky, uGnd: FXU.uGnd,
    uFogColor: U.uFogColor, uFogSunColor: U.uFogSunColor, uSunDir: U.uSunDir, uFogDensity: U.uFogDensity, uFogFalloff: U.uFogFalloff, uFogBase: U.uFogBase, uMirror: U.uMirror,
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: CP_VS, fragmentShader: CP_FS, transparent: true, depthWrite: false, depthTest: true, blending: THREE.NormalBlending });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.userData.noQA = true; mesh.renderOrder = o.order ?? 10; mesh.name = o.name || 'fx.cpuffs';
  const st = arrs.map(() => new Float32Array(N * 4)), dep = new Float32Array(N), idx = new Array(N).fill(0).map((_, i) => i);
  let n = 0;
  const cam = new THREE.Vector3();
  const api = {
    mesh, uniforms, N,
    begin() { n = 0; },
    get n() { return n; },
    push(x, y, z, size, rot, alpha, cell, gy, alb = 1, glow = 0, heat = 0, stretch = 0, soft = 0, occ = 1, seed = 0, blend = 0, r = 1, g = 1, b = 1, temp = 0.5) {
      if (n >= N || !(alpha > 0.002) || !(size > 0)) return;
      const k = n * 4, [A, B, C, D, E] = st;
      A[k] = x; A[k + 1] = y; A[k + 2] = z; A[k + 3] = size;
      B[k] = rot; B[k + 1] = alpha; B[k + 2] = cell; B[k + 3] = gy;
      C[k] = alb; C[k + 1] = glow; C[k + 2] = heat; C[k + 3] = stretch;
      D[k] = soft; D[k + 1] = occ; D[k + 2] = seed; D[k + 3] = blend;
      E[k] = r; E[k + 1] = g; E[k + 2] = b; E[k + 3] = temp;
      n++;
    },
    end(camera) {
      const root = mesh.parent;
      let ox = 0, oy = 0, oz = 0;
      if (root) { root.updateMatrixWorld(); const e = root.matrixWorld.elements; ox = e[12]; oy = e[13]; oz = e[14]; }
      if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
      if (camera) camera.getWorldPosition(cam); else cam.set(0, 1e5, 0);
      const A = st[0];
      for (let i = 0; i < n; i++) { const k = i * 4; const dx = A[k] + ox - cam.x, dy = A[k + 1] + oy - cam.y, dz = A[k + 2] + oz - cam.z; dep[i] = dx * dx + dy * dy + dz * dz; }
      const ord = idx.slice(0, n); ord.sort((a, b) => dep[b] - dep[a]);
      for (let j = 0; j < n; j++) {
        const s = ord[j] * 4, d = j * 4;
        for (let q = 0; q < 5; q++) { const S = st[q], T = arrs[q]; T[d] = S[s]; T[d + 1] = S[s + 1]; T[d + 2] = S[s + 2]; T[d + 3] = S[s + 3]; }
        arrs[0][d] += ox; arrs[0][d + 1] += oy; arrs[0][d + 2] += oz; arrs[1][d + 3] += oy;
      }
      geo.instanceCount = n;
      for (const a of attrs) { a.needsUpdate = true; a.addUpdateRange(0, Math.max(4, n * 4)); }
    },
  };
  mesh.matrixAutoUpdate = false;
  // under a scene override material (qa.js camera-target mask) the billboards cannot be placed: draw nothing then (the
  // item's maskProxy stands in for it) instead of a 1 m quad at the world origin
  let saved = null;
  mesh.onBeforeRender = (renderer, scene, cam, g, material) => { if (material !== mat) { saved = geo.instanceCount; geo.instanceCount = 0; return; } mesh.matrixWorld.identity(); softDepth(renderer, uniforms); };
  mesh.onAfterRender = () => { if (saved != null) { geo.instanceCount = saved; saved = null; } };
  return api;
}

// ── mask proxy: the shape of an fx for the camera-target mask only ──────────────────────────────────────────────
// core/qa.js silhouetteSep renders the target item's meshes into a mask (layer 7, an override material) to measure its
// area on screen (the validator's no_subject). Billboard volumes cannot be masked, so each fx carries simple proxies
// (a unit sphere / cylinder scaled to the cloud, the column, the dust wall) that live on layer 7 ONLY: never in the
// picture, never in shadows, never hit by the camera's obstacle rays.
export const SEP_LAYER = 7;
export function maskProxy(shape = 'sphere') {
  const g = shape === 'cyl' ? new THREE.CylinderGeometry(1, 1, 1, 16) : shape === 'box' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.SphereGeometry(1, 20, 12);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.layers.set(SEP_LAYER); m.userData.noQA = true; m.userData.maskProxy = true; m.frustumCulled = false; m.castShadow = m.receiveShadow = false; m.name = 'fx.maskProxy';
  return m;
}

// ── GLSL value noise (3D) ────────────────────────────────────────────────────────────────────────────────────────
export const N3_GLSL = /* glsl */`
float xh3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float xn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(xh3(i), xh3(i + vec3(1,0,0)), f.x), mix(xh3(i + vec3(0,1,0)), xh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(xh3(i + vec3(0,0,1)), xh3(i + vec3(1,0,1)), f.x), mix(xh3(i + vec3(0,1,1)), xh3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float xfbm(vec3 p){ return xn3(p) * 0.52 + xn3(p * 2.07 + 13.1) * 0.29 + xn3(p * 4.31 + 7.7) * 0.19; }`;

// ── fireball: an emissive boiling sphere (radius 1; scale it), black body by uT, cells of hotter / cooler gas ────────
export function makeFireball(o = {}) {
  const uni = { uT: { value: 1 }, uI: { value: 1 }, uTime: { value: 0 }, uAmp: { value: o.amp ?? 0.07 }, uCell: { value: o.cell ?? 3.2 }, uHDR: { value: o.hdr ?? 6 }, uGround: { value: -1e9 }, uSeed: { value: o.seed ?? 1.7 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`#include <common>
#include <logdepthbuf_pars_vertex>
${'uniform float uTime; uniform float uAmp; uniform float uCell; uniform float uSeed;'}
${N3_GLSL}
varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){
  vec3 p = position; vL = p;
  float d = xfbm(p * uCell + vec3(0.0, -uTime * 0.35, uSeed)) - 0.5;
  p += normal * d * uAmp * 2.0;
  vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: /* glsl */`#include <logdepthbuf_pars_fragment>
uniform float uT; uniform float uI; uniform float uTime; uniform float uCell; uniform float uHDR; uniform float uGround; uniform float uSeed;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${N3_GLSL}
${BB_GLSL}
void main(){
  #include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vW); float mu = clamp(dot(normalize(vN), V), 0.0, 1.0);
  float c1 = xfbm(vL * uCell * 1.7 + vec3(uSeed, uTime * 0.5, 0.0));
  float c2 = xn3(vL * uCell * 5.3 - vec3(0.0, uTime * 0.9, uSeed));
  float cells = c1 * 0.7 + c2 * 0.3;
  // hotter cells, cooler lanes; the limb is a little cooler (optical depth) but brighter-edged when white-hot
  float T = clamp(uT + (cells - 0.5) * mix(0.18, 0.55, 1.0 - uT) - (1.0 - mu) * 0.12 * (1.0 - uT), 0.0, 1.0);
  vec3 col = bbody(T) * uHDR * (0.3 + 1.4 * T * T) * (0.75 + 0.35 * cells);
  float a = uI * smoothstep(0.0, 0.25, mu + 0.08) * smoothstep(uGround - 1.0, uGround + 3.0, vW.y);
  gl_FragColor = vec4(col * a, a);
}`,
  });
  mat.blending = THREE.CustomBlending; mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneMinusSrcAlphaFactor;   // premultiplied: opaque-ish, still blooms
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), mat);
  m.frustumCulled = false; m.userData.noQA = true; m.renderOrder = o.order ?? 9.5; m.name = o.name || 'fx.fireball_core';
  return { mesh: m, uni };
}

// ── veil: a smooth translucent condensation shell (radius 1, hemisphere by default); lit white, milky at the rim ────
export function makeVeil(o = {}) {
  const uni = { uA: { value: 0 }, uTime: { value: 0 }, uCol: { value: new THREE.Color(...(o.color || [0.96, 0.97, 1.0])) }, uCut: { value: o.cut ?? 0.0 }, uRimK: { value: o.rim ?? 1.6 }, uMottle: { value: o.mottle ?? 0.55 },
    uSunDir: U.uSunDir, uKey: FXU.uKey, uSky: FXU.uSky, uGround: { value: -1e9 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, side: THREE.FrontSide,
    vertexShader: /* glsl */`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){ vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: /* glsl */`#include <logdepthbuf_pars_fragment>
uniform float uA; uniform float uTime; uniform vec3 uCol; uniform float uCut; uniform float uRimK; uniform float uMottle; uniform vec3 uSunDir; uniform vec3 uKey; uniform vec3 uSky; uniform float uGround;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${N3_GLSL}
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  float mu = abs(dot(N, V));
  float n = xfbm(vL * 6.0 + vec3(uTime * 0.05, 0.0, 0.0)), n2 = xn3(vL * 23.0);
  float rim = pow(1.0 - mu, uRimK) * smoothstep(0.0, 0.22, mu);   // limb-brightened, fading to nothing at the silhouette
  float a = uA * (0.2 + 0.8 * rim) * mix(1.0, 0.45 + 1.1 * n * (0.8 + 0.4 * n2), uMottle);
  a *= smoothstep(uCut - 0.02, uCut + 0.12, vL.y) * smoothstep(uGround - 2.0, uGround + 8.0, vW.y);
  float dif = clamp((dot(N, uSunDir) + 0.5) / 1.5, 0.0, 1.0);
  vec3 col = uCol * (uKey * (0.22 + 0.5 * dif) + uSky * 0.75);
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
}`,
  });
  const g = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, o.full ? Math.PI : Math.PI * 0.5 + 0.08);
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.userData.noQA = true; m.renderOrder = o.order ?? 10.5; m.name = o.name || 'fx.veil';
  return { mesh: m, uni };
}

// ── disc: a flat soft ring of condensation (radius 1 = the outer edge; inner edge uIn), lit white, mottled ─────────
export function makeDisc(o = {}) {
  const uni = { uA: { value: 0 }, uIn: { value: o.inner ?? 0.25 }, uTime: { value: 0 }, uCol: { value: new THREE.Color(...(o.color || [0.97, 0.98, 1.0])) },
    uSunDir: U.uSunDir, uKey: FXU.uKey, uSky: FXU.uSky };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vP; varying vec3 vW;
void main(){ vP = position.xz; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: /* glsl */`#include <logdepthbuf_pars_fragment>
uniform float uA; uniform float uIn; uniform float uTime; uniform vec3 uCol; uniform vec3 uSunDir; uniform vec3 uKey; uniform vec3 uSky;
varying vec2 vP; varying vec3 vW;
${N3_GLSL}
void main(){
  #include <logdepthbuf_fragment>
  float r = length(vP), ang = atan(vP.y, vP.x);
  float n = xfbm(vec3(vP * 3.1, uTime * 0.03)), n2 = xn3(vec3(vP * 11.0, 1.7));
  float edge = 1.0 + (n - 0.5) * 0.35;
  float a = smoothstep(uIn * 0.85, uIn + 0.3, r) * (1.0 - smoothstep(0.35 * edge, 1.0 * edge, r));
  a *= smoothstep(0.25, 0.75, n * (0.85 + 0.3 * n2) + 0.15) * 1.3;   // patchy, torn: a wisp of cloud, not a plate
  vec3 V = normalize(cameraPosition - vW);
  float graze = 1.0 - abs(V.y);                                   // seen edge-on the thin layer is thicker along the view
  a *= uA * mix(0.6, 1.1, graze);
  vec3 col = uCol * (uKey * (0.45 + 0.55 * clamp(uSunDir.y + 0.3, 0.0, 1.0)) + uSky * 1.15);
  if (cameraPosition.y < vW.y) { col *= 0.5; a *= 0.7; }             // seen from below: the layer's shaded underside
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
}`,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 96, 0, Math.PI * 2).rotateX(-Math.PI / 2), mat);
  m.frustumCulled = false; m.userData.noQA = true; m.renderOrder = o.order ?? 9.4; m.name = o.name || 'fx.disc';
  return { mesh: m, uni };
}

// ── additive glow sprite (a copy of a_entry's with a minimum on-screen size) ───────────────────────────────────────
export function glow(col, order = 22) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(...col) }, uI: { value: 0 }, uS: { value: 1 }, uMinPx: { value: 0 }, uRes: { value: 1080 }, uCore: { value: 14 } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vQ; uniform float uS; uniform float uMinPx; uniform float uRes;
void main(){ vQ = position.xy * 2.0; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float s = uS; float pxS = uMinPx * (-mv.z) / (projectionMatrix[1][1] * uRes * 0.5); s = max(s, pxS);
  mv.xy += position.xy * s; gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
varying vec2 vQ; uniform vec3 uCol; uniform float uI; uniform float uCore; void main(){
  #include <logdepthbuf_fragment>
  float r = length(vQ); float g = exp(-r * r * uCore) * 4.0 + exp(-r * 4.5) * 0.7 + exp(-r * 1.6) * 0.1;
  gl_FragColor = vec4(uCol * g * uI * (1.0 - smoothstep(0.85, 1.0, r)), 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.frustumCulled = false; m.userData.noQA = true; m.renderOrder = order;
  return m;
}

// ── a hard light from the burst, aimed at what the camera sees (the ground 25 m ahead of it), with shadows ───────────
export function burstLight(root, o = {}) {
  const L = new THREE.DirectionalLight(new THREE.Color(...(o.color || [1.0, 0.93, 0.85])), 0);
  L.castShadow = o.shadows !== false;
  if (L.castShadow) { L.shadow.mapSize.set(2048, 2048); const sc = L.shadow.camera; const r = o.box ?? 70; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.near = 1; sc.far = 6000; L.shadow.bias = -0.0004; L.shadow.normalBias = 0.03; }
  L.userData.noGovern = true;
  root.add(L, L.target);
  const cam = new THREE.Vector3(), fw = new THREE.Vector3(), d = new THREE.Vector3();
  return {
    L,
    // src: the burst point in root space
    aim(camera, src, I) {
      L.intensity = I; L.visible = I > 0.01;
      if (!camera || !L.visible) return;
      camera.getWorldPosition(cam); camera.getWorldDirection(fw); fw.y = 0; if (fw.lengthSq() < 1e-6) fw.set(0, 0, -1); fw.normalize();
      L.target.position.copy(cam).addScaledVector(fw, o.ahead ?? 25).sub(root.position); L.target.position.y = cam.y - root.position.y - 2;
      d.copy(src).sub(L.target.position); const dl = d.length(); d.normalize();
      L.position.copy(L.target.position).addScaledVector(d, Math.min(dl, 2500)); L.target.updateMatrixWorld();
    },
  };
}

// ── a dust / spray front racing across the ground from a centre; only the arc facing the camera is filled ──────────
// P: cpuffs; c: centre in root space (x, z); R: front radius now; o: {tint [r,g,b], h (height m), w (depth m), n, age (s
// since it passed), alpha, gy(x, z) ground height in root space, cam (root-space camera position), seed, stretch}
export function pushFront(P, R, cam, o = {}) {
  if (!(R > 1)) return;
  const n = o.n ?? 900, H = o.h ?? 30, Wd = o.w ?? Math.max(20, H * 2.2), tint = o.tint || [0.62, 0.55, 0.47], seed = o.seed ?? 3;
  const aC = Math.atan2(cam.z, cam.x), span = Math.min(Math.PI, (o.span ?? 9000) / Math.max(R, 1));
  for (let i = 0; i < n; i++) {
    const k = hf(i, seed), fr = hf(i, seed + 1) < 0.85 ? (hf(i, seed + 2) - 0.5) * 2 * span : (hf(i, seed + 2) - 0.5) * 2 * Math.PI;
    const a = aC + fr, r = R - Wd * k * 1.5 - (o.lag ?? 0) * hf(i, seed + 3);
    if (r < 2) continue;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const dC = Math.hypot(x - cam.x, z - cam.z);
    if (dC > (o.maxD ?? 15000)) continue;
    const g = o.gy ? o.gy(x, z) : 0, age = k;
    const size = (0.35 + 0.5 * hf(i, seed + 4)) * H * (0.55 + 0.9 * age) * (1 + dC / (o.grow ?? 4000));
    const y = g + size * (0.35 + 0.25 * hf(i, seed + 5)) + H * 0.35 * age * hf(i, seed + 6);
    const up = clamp((y - g) / (H * 1.6)), occ = clamp(0.5 + 0.4 * up + 0.12 * hf(i, seed + 7) - 0.15 * age);
    const haze = hf(i, seed + 11) < 0.3;                                // a third are big thin haze billows that glue the wall together
    P.push(x, y + (haze ? size * 0.3 : 0), z, size * (haze ? 1.7 : 1), hf(i, seed + 8) * 6.28 + (o.t ?? 0) * 0.3 * (hf(i, seed + 9) - 0.5), (o.alpha ?? 0.8) * (1 - 0.75 * k) * (haze ? 0.45 : 0.85), i & 3, -1e9,
      o.alb ?? 0.95, 0, 0, o.stretch ?? 0.05, clamp((haze ? 0.65 : 0.25) + 0.3 * k), occ, hf(i, seed + 10), 0.45, tint[0], tint[1], tint[2], 0);
  }
}

// seeded point in a disc
export const disc = (i, s) => { const r = Math.sqrt(hf(i, s)), a = hf(i, s + 1) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; };
export { clamp, lerp, sstep, hf };
