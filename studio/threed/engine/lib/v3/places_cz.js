// places_cz.js — Legion 3D v3, WP6 (V3_SPEC 2.6): the Protectorate 1942 — Bohemia in the snow, Prague, the staff car.
//   town.bohemian_village  a Czech village round its long green (naves): gable-fronted farmhouses with yard walls and
//                          gates, barns behind, a baroque church with an onion tower on the green, a frozen pond, bare
//                          lindens; blackout (only `lit` windows glow), snow on every roof, chimney smoke drifting
//   landmark.prague_castle the Hradcany skyline on its ridge: the long south wing, St Vitus with the great south tower
//                          (copper helmet + lantern) and the two west spires, the Old Royal Palace roof, St George's
//                          towers, the Black Tower, gardens and walls on the slope, the Lesser Town roofs and the St
//                          Nicholas dome below; windows lit at dusk/night (shader grid, per-window hash on integers)
//   town.prague_1942       a street canyon of 4-6 storey baroque / neo-renaissance / art-nouveau houses: stucco facades
//                          with window surrounds, cornices, mansards, shop fronts; granite-sett carriageway, slab
//                          pavements on kerbs, tram rails + overhead wires on span wires, gas lamps lit at night (light
//                          pools + a few real lights), optional bend (the Holesovice curve), in-town trams
//   vehicle.mercedes_320   the open staff car (320 Cabriolet B silhouette): long bonnet, upright chrome radiator with the
//                          star, separate sweeping fenders into running boards, bowl headlamps, folded top, red leather,
//                          whitewall tyres, fender flags that flutter; drives a path or a town's lane (road: '<id>')
//   vehicle.tram_prague    a 1930s Prague two-axle tram, red + cream, clerestory roof, trolley pole on the wire, lit
//                          saloon at night, occasional blue sparks at the trolley wheel; runs a path or a town's track
// Everything is deterministic in t and item.seed. Models face +Z; compass headings (0 = north = -Z) like vehicles.js.
import * as THREE from 'three';
import { buildSyntheticTown, townTextures } from '../human/town.js';
import * as TX from '../human/textures.js';
import { patchMaterial, U } from '../shared/env.js';
import { rng as makeRng, clamp, lerp, smooth, smoother } from '../shared/util.js';
import { ground, xz, DEG, patchAll, rngFor } from '../human/common.js';
import { smoothTrack, speedProfile, turnRadius } from '../human/motion.js';
import { addCrew } from '../human/boats.js';

const TAU = Math.PI * 2;
const LIGHTS = () => smooth((0.12 - U.uSunDir.value.y) / 0.2);          // 0 by day .. 1 from dusk on (as towns.js)
const PU = { uPSnow: { value: 1 }, uPLights: { value: 0 }, uPTime: { value: 0 }, uPNoise: { value: null }, uPLitFrac: { value: 0.2 }, uPFlood: { value: 0 }, uPWet: { value: 0 } };
const hashN = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const warnOf = (ctx) => (m) => (ctx && ctx.warnings ? ctx.warnings.push(m) : console.warn('[f3d/v3/places]', m));

// ── a world-space mesh builder: polygons with auto winding, boxes, vertex colours, UVs in face-local metres ─────────
const _c = new THREE.Color();
class MB {
  constructor() { this.P = []; this.N = []; this.UV = []; this.C = []; this.W = []; this.col = [1, 1, 1]; this.win = [0, 0, 0, 0]; }
  color(h) { if (Array.isArray(h)) this.col = h; else { _c.set(h); this.col = [_c.r, _c.g, _c.b]; } return this; }
  // poly: convex planar polygon (fan); `want` = the side it must face. UV: vertical faces (u along the face from its
  // first-left edge, v = y), horizontal faces (x, z)
  poly(pts, want) {
    const n = pts.length; if (n < 3) return;
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); }
    const l = Math.hypot(nx, ny, nz); if (l < 1e-10) return;
    nx /= l; ny /= l; nz /= l;
    let order = pts;
    if (want && nx * want[0] + ny * want[1] + nz * want[2] < 0) { nx = -nx; ny = -ny; nz = -nz; order = pts.slice().reverse(); }
    const vert = Math.abs(ny) < 0.7;
    let tx = 1, tz = 0; if (vert) { tx = -nz; tz = nx; const m = Math.hypot(tx, tz) || 1; tx /= m; tz /= m; }
    let u0 = Infinity; if (vert) for (const p of order) u0 = Math.min(u0, p[0] * tx + p[2] * tz);
    const base = [];
    for (const p of order) base.push(vert ? [p[0] * tx + p[2] * tz - u0, p[1]] : [p[0], p[2]]);
    for (let i = 1; i < n - 1; i++) for (const k of [0, i, i + 1]) {
      const p = order[k]; this.P.push(p[0], p[1], p[2]); this.N.push(nx, ny, nz); this.UV.push(base[k][0], base[k][1]);
      this.C.push(this.col[0], this.col[1], this.col[2]); this.W.push(this.win[0], this.win[1], this.win[2], this.win[3]);
    }
  }
  tri(a, b, c, want) { this.poly([a, b, c], want); }
  // oriented box: centre c, unit axes ax ay (az = ax x ay), half sizes; skip bits 1 +x 2 -x 4 +y 8 -y 16 +z 32 -z
  box(c, ax, ay, hx, hy, hz, skip = 0) {
    const az = [ax[1] * ay[2] - ax[2] * ay[1], ax[2] * ay[0] - ax[0] * ay[2], ax[0] * ay[1] - ax[1] * ay[0]];
    const P = (sx, sy, sz) => [c[0] + ax[0] * hx * sx + ay[0] * hy * sy + az[0] * hz * sz, c[1] + ax[1] * hx * sx + ay[1] * hy * sy + az[1] * hz * sz, c[2] + ax[2] * hx * sx + ay[2] * hy * sy + az[2] * hz * sz];
    const ng = (a) => [-a[0], -a[1], -a[2]];
    if (!(skip & 1)) this.poly([P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1)], ax);
    if (!(skip & 2)) this.poly([P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], ng(ax));
    if (!(skip & 4)) this.poly([P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1)], ay);
    if (!(skip & 8)) this.poly([P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)], ng(ay));
    if (!(skip & 16)) this.poly([P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], az);
    if (!(skip & 32)) this.poly([P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), P(1, -1, -1)], ng(az));
  }
  // axis-aligned box in a frame F (F.p(s, y, t) -> world; F.u, F.v unit axes): s along u, t along v, y absolute
  fbox(F, s0, s1, y0, y1, t0, t1, skip = 0) {
    const c = F.p((s0 + s1) / 2, (y0 + y1) / 2, (t0 + t1) / 2);
    this.box(c, [F.u[0], 0, F.u[1]], [0, 1, 0], Math.abs(s1 - s0) / 2, Math.abs(y1 - y0) / 2, Math.abs(t1 - t0) / 2, skip);
  }
  // a frustum / cylinder p0 -> p1 with smooth sides (seg), optional caps
  cyl(p0, p1, r0, r1, seg = 8, caps = true) {
    const ax = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], L = Math.hypot(ax[0], ax[1], ax[2]); if (L < 1e-6) return;
    ax[0] /= L; ax[1] /= L; ax[2] /= L;
    let e1 = Math.abs(ax[1]) < 0.9 ? [ax[2], 0, -ax[0]] : [1, 0, 0]; const m = Math.hypot(...e1); e1 = e1.map((v) => v / m);
    const e2 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]];
    const ring = (p, r, a) => [p[0] + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * r, p[1] + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * r, p[2] + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * r];
    const slope = (r0 - r1) / L;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU, am = (a0 + a1) / 2;
      const out = [e1[0] * Math.cos(am) + e2[0] * Math.sin(am) + ax[0] * slope, e1[1] * Math.cos(am) + e2[1] * Math.sin(am) + ax[1] * slope, e1[2] * Math.cos(am) + e2[2] * Math.sin(am) + ax[2] * slope];
      if (r1 > 1e-5) this.poly([ring(p0, r0, a0), ring(p0, r0, a1), ring(p1, r1, a1), ring(p1, r1, a0)], out);
      else this.poly([ring(p0, r0, a0), ring(p0, r0, a1), p1], out);
    }
    if (caps) {
      if (r1 > 1e-5) { const q = []; for (let i = 0; i < seg; i++) q.push(ring(p1, r1, i / seg * TAU)); this.poly(q, ax); }
      if (r0 > 1e-5) { const q = []; for (let i = 0; i < seg; i++) q.push(ring(p0, r0, i / seg * TAU)); this.poly(q, [-ax[0], -ax[1], -ax[2]]); }
    }
  }
  get empty() { return this.P.length === 0; }
  geo(o = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.UV, 2));
    if (o.colors !== false) g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    if (o.win) { g.setAttribute('aWin', new THREE.Float32BufferAttribute(this.W, 4)); g.setAttribute('aFU', new THREE.Float32BufferAttribute(this.UV, 2)); }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  mesh(mat, name, o = {}) { const m = new THREE.Mesh(this.geo(o), mat); m.name = name; m.castShadow = o.cast ?? true; m.receiveShadow = true; return m; }
}
// a building frame: origin (cx, cz), unit axis u = [ux, uz] along the front; v = u turned right (into the plot)
function frameOf(cx, cz, ux, uz) { const vx = -uz, vz = ux; return { cx, cz, u: [ux, uz], v: [vx, vz], p: (s, y, t) => [cx + ux * s + vx * t, y, cz + uz * s + vz * t] }; }

// ── canvas textures (cached for the page) ─────────────────────────────────────────────────────────────────────────
const TEXC = {};
function canvasTex(key, size, draw, o = {}) {
  if (TEXC[key]) return TEXC[key];
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size, makeRng(o.seed ?? 7));
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8; return (TEXC[key] = t);
}
// normal map from a height canvas (Sobel), same size
function normalFrom(key, srcKey, k = 2.5) {
  if (TEXC[key]) return TEXC[key];
  const src = TEXC[srcKey + ':h'], S = src.width, gs = src.getContext('2d').getImageData(0, 0, S, S).data;
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), out = g.createImageData(S, S);
  const H = (x, y) => gs[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return (TEXC[key] = t);
}
// granite setts ("kocici hlavy" rows): colour + height (for the normal map); 2 m x 2 m per tile
function settsTex() {
  if (TEXC.setts) return { map: TEXC.setts, normalMap: TEXC['setts:n'] };
  const S = 512, R = makeRng(41), hc = document.createElement('canvas'); hc.width = hc.height = S; const hg = hc.getContext('2d');
  TEXC.setts = canvasTex('setts', S, (g) => {
    g.fillStyle = '#2E2C2A'; g.fillRect(0, 0, S, S); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
    const rows = 16, rh = S / rows;
    for (let r = 0; r < rows; r++) {
      let x = -R() * 30; const y0 = r * rh;
      while (x < S) {
        const w = rh * (0.75 + R() * 0.55), tone = 88 + R() * 52, cool = R() * 10;
        const rr = (cx, cy, ww, hh, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(cx, cy, ww, hh, Math.min(ww, hh) * 0.32); g.fill(); };
        for (const ox of [0, -S, S]) {
          rr(x + 2 + ox, y0 + 2, w - 4, rh - 4, `rgb(${tone - cool | 0},${tone - cool * 0.4 | 0},${tone + cool * 0.6 | 0})`);
          const gr = hg.createRadialGradient(x + w / 2 + ox, y0 + rh / 2, 1, x + w / 2 + ox, y0 + rh / 2, w * 0.62);
          gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#9a9a9a'); gr.addColorStop(1, '#202020'); hg.fillStyle = gr; hg.beginPath(); hg.roundRect(x + 2 + ox, y0 + 2, w - 4, rh - 4, Math.min(w, rh) * 0.32); hg.fill();
        }
        for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},${0.05 + R() * 0.06})`; g.fillRect(x + 4 + R() * (w - 8), y0 + 4 + R() * (rh - 8), 2 + R() * 4, 2 + R() * 3); }
        x += w;
      }
    }
  }, { seed: 41 });
  TEXC['setts:h'] = hc;
  return { map: TEXC.setts, normalMap: normalFrom('setts:n', 'setts', 3.5) };
}
// pavement: big granite slabs with a mosaic border strip at the kerb (2 m tile)
function slabsTex() {
  if (TEXC.slabs) return { map: TEXC.slabs, normalMap: TEXC['slabs:n'] };
  const S = 256, R = makeRng(43), hc = document.createElement('canvas'); hc.width = hc.height = S; const hg = hc.getContext('2d');
  TEXC.slabs = canvasTex('slabs', S, (g) => {
    g.fillStyle = '#3A3936'; g.fillRect(0, 0, S, S); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
    const rows = 4, rh = S / rows;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * rh * 0.6;
      while (x < S + rh) {
        const w = rh * (1.1 + R() * 0.6), t = 128 + R() * 30;
        for (const ox of [0, -S]) { g.fillStyle = `rgb(${t | 0},${t - 3 | 0},${t - 8 | 0})`; g.fillRect(x + 1.5 + ox, r * rh + 1.5, w - 3, rh - 3); hg.fillStyle = '#d8d8d8'; hg.fillRect(x + 1.5 + ox, r * rh + 1.5, w - 3, rh - 3); }
        for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(0,0,0,${R() * 0.07})`; g.fillRect(x + R() * w, r * rh + R() * rh, 2, 2); }
        x += w;
      }
    }
  }, { seed: 43 });
  TEXC['slabs:h'] = hc;
  return { map: TEXC.slabs, normalMap: normalFrom('slabs:n', 'slabs', 2.0) };
}
// packed snow on a village road: two darker wheel ruts, a pale crown, grain (4 m wide strip, 4 m long tile)
function snowRoadTex() {
  return canvasTex('snowroad', 256, (g, S, R) => {
    const id = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, w = Math.sin(y / S * TAU * 2) * 0.012;
      const rut = Math.exp(-(((u - 0.3 - w) / 0.055) ** 2)) + Math.exp(-(((u - 0.7 - w) / 0.055) ** 2));
      const v = 0.93 - rut * 0.2 + (R() - 0.5) * 0.06 - Math.abs(u - 0.5) * 0.02, i = (y * S + x) * 4;
      id.data[i] = 214 * v; id.data[i + 1] = 220 * v; id.data[i + 2] = 230 * v; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }, { seed: 9 });
}
// a soft radial blob (lamp light pools, smoke puffs)
function blobTex(key = 'blob', soft = 0.0) {
  return canvasTex(key, 128, (g, S, R) => {
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35 + soft * 0.2, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    if (key === 'puff') { const id = g.getImageData(0, 0, S, S); for (let i = 0; i < id.data.length; i += 4) { const n = 0.65 + 0.35 * R(); id.data[i + 3] *= n; } g.putImageData(id, 0, 0); }
  }, { seed: key === 'puff' ? 77 : 5 });
}
const noiseTex = () => (PU.uPNoise.value ||= townTextures().grime);
const masonryTex = (key, o) => (TEXC[key] ||= TX.masonry(o));

// ── materials: a snow cover on up-facing surfaces (PU.uPSnow), and the window grid for far facades ─────────────────
function snowPatch(lo) {
  return (sh) => {
    sh.uniforms.uPSnow = PU.uPSnow; sh.uniforms.uPNoise = PU.uPNoise;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW; varying vec3 vPN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        { vec4 pw = vec4(transformed, 1.0); vec3 pn = objectNormal;
        #ifdef USE_INSTANCING
          pw = instanceMatrix * pw; pn = mat3(instanceMatrix) * pn;
        #endif
          vPW = (modelMatrix * pw).xyz; vPN = normalize(mat3(modelMatrix) * pn); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW; varying vec3 vPN; uniform float uPSnow; uniform sampler2D uPNoise;')
      .replace('#include <roughnessmap_fragment>', `float pSnow = 0.0;
        { float n1 = texture2D(uPNoise, vPW.xz * 0.043).r, n2 = texture2D(uPNoise, vPW.xz * 0.53 + vPW.y * 0.21).b;
          float up = normalize(vPN).y + (n1 - 0.5) * 0.3 + (n2 - 0.5) * 0.12;
          float lo = mix(1.35, ${lo.toFixed(3)}, clamp(uPSnow, 0.0, 1.0));
          pSnow = smoothstep(lo, lo + 0.1, up);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.83, 0.87), pSnow); }
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.84, pSnow);`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n        normal = normalize(mix(normal, nonPerturbedNormal, pSnow));');
  };
}
// mat(o): MeshStandardMaterial (or Physical with o.physical) with the shared fog; o.snow = the cover threshold
function mat(o = {}, key = '') {
  const { snow, physical, ...p } = o;
  const m = physical ? new THREE.MeshPhysicalMaterial(p) : new THREE.MeshStandardMaterial(p);
  if (snow != null) { m.userData.progKey = 'pczsnow' + snow.toFixed(2) + key; return patchMaterial(m, snowPatch(snow)); }
  return patchMaterial(m);
}
function texMat(tex, meters, o = {}) {
  const map = tex.map.clone(); map.needsUpdate = true; map.repeat.set(1 / meters, 1 / meters);
  const p = { map, roughness: o.roughness ?? 1, color: o.color ?? 0xffffff, vertexColors: !!o.vertexColors, envMapIntensity: o.env ?? 0.5 };
  if (tex.normalMap) { const nm = tex.normalMap.clone(); nm.needsUpdate = true; nm.repeat.set(1 / meters, 1 / meters); p.normalMap = nm; p.normalScale = new THREE.Vector2(o.normal ?? 1, o.normal ?? 1); }
  if (tex.roughnessMap && o.roughMap !== false) { const rm = tex.roughnessMap.clone(); rm.needsUpdate = true; rm.repeat.set(1 / meters, 1 / meters); p.roughnessMap = rm; }
  return mat({ ...p, ...(o.snow != null ? { snow: o.snow } : {}), ...(o.extra || {}) }, o.key || '');
}
// windows drawn by the shader on far facades: a geometry with aWin = (seed, base y, top y, on) and aFU = face-local
// metres (u along the face, v = y). Per-window hash on INTEGER cell ids + a rounded seed: no varying noise, so no
// speckle on any GPU. cell: [cellX, cellY, wx0, wx1, wy0, wy1, y0]; lit fraction PU.uPLitFrac x PU.uPLights
function winPatch(o) {
  const f = (v) => Number(v).toFixed(3);
  return (sh) => {
    sh.uniforms.uPLights = PU.uPLights; sh.uniforms.uPLitFrac = PU.uPLitFrac; sh.uniforms.uPFlood = PU.uPFlood;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aWin; attribute vec2 aFU; varying vec4 vWin; varying vec2 vFU; varying vec3 vPN2; varying float vPY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vWin = aWin; vFU = aFU; vPN2 = normalize(mat3(modelMatrix) * objectNormal); vPY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec4 vWin; varying vec2 vFU; varying vec3 vPN2; varying float vPY; uniform float uPLights; uniform float uPLitFrac; uniform float uPFlood;
        float pHash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float pLit = 0.0, pWin = 0.0;
        if (vWin.w > 0.5 && abs(vPN2.y) < 0.5) {
          float v = vFU.y - vWin.y - ${f(o.y0)};
          vec2 cell = vec2(vFU.x / ${f(o.cx)}, v / ${f(o.cy)});
          vec2 fc = fract(cell), ci = floor(cell);
          pWin = step(${f(o.wx0)}, fc.x) * step(fc.x, ${f(o.wx1)}) * step(${f(o.wy0)}, fc.y) * step(fc.y, ${f(o.wy1)}) * step(0.0, ci.y) * step(vFU.y, vWin.z);
          float seed = floor(vWin.x + 0.5);
          float pick = pHash(vec3(ci, seed));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.04, 0.05), pWin * 0.92);
          pLit = pWin * step(1.0 - uPLitFrac, pick) * uPLights * (0.55 + 0.45 * pHash(vec3(ci.yx, seed + 7.0)));
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.6, 0.27) * pLit * ${f(o.lit ?? 2.0)};
        totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.82, 0.6) * uPFlood * 0.32 * (1.0 - pWin) * step(abs(vPN2.y), 0.5);`);
  };
}
// instanced unit boxes (base at y 0) as town houses seen from afar: window rows in the box's own metres (instance
// scale), per-house seed from its rounded position (a flat varying: exact on every GPU), a darker plinth, a few lit at
// dusk (PU.uPLitFrac x PU.uPLights)
function houseWinMat(map) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map });
  m.userData.progKey = 'pczhousewin';
  return patchMaterial(m, (sh) => {
    sh.uniforms.uPLights = PU.uPLights; sh.uniforms.uPLitFrac = PU.uPLitFrac;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLL; varying vec3 vLN0; flat varying vec3 vLS;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 lsc = vec3(1.0), lsd = vec3(0.0);
        #ifdef USE_INSTANCING
          lsc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)); lsd = instanceMatrix[3].xyz;
        #endif
          vLL = transformed * lsc; vLN0 = objectNormal; vLS = vec3(floor(lsd.x + 0.5), floor(lsd.z + 0.5), lsc.y); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vLL; varying vec3 vLN0; flat varying vec3 vLS; uniform float uPLights; uniform float uPLitFrac;
        float lHash(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float lLit = 0.0;
        { vec3 ln = abs(vLN0);
          if (ln.y < 0.5) {
            float u = (ln.x > ln.z ? vLL.z : vLL.x) + 0.65, v = vLL.y;
            vec2 cell = vec2(u / 2.5, (v - 1.1) / 3.1), f = fract(cell), ci = floor(cell);
            float isWin = step(0.3, f.x) * step(f.x, 0.7) * step(0.2, f.y) * step(f.y, 0.74) * step(0.0, ci.y) * step(v, vLS.z - 1.2);
            float seed = mod(vLS.x * 7.0 + vLS.y * 13.0, 997.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.05, 0.055), isWin * 0.9);
            lLit = isWin * step(1.0 - uPLitFrac, lHash(vec3(ci + 3.0, seed))) * uPLights;
            diffuseColor.rgb *= 1.0 - (1.0 - smoothstep(0.0, 1.8, v)) * 0.3;
          } }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.58, 0.24) * lLit * 1.4;`);
  });
}
function winMat(o, p = {}, key = '') { const m = new THREE.MeshStandardMaterial({ roughness: 0.9, vertexColors: true, ...p }); m.userData.progKey = 'pczwin' + key; return patchMaterial(m, winPatch(o)); }

// ── chimney smoke: billboard puffs rising and leaning downwind, lit like the night air ─────────────────────────────
function smokeWisps(sources, o = {}) {
  const N = o.puffs ?? 9, n = sources.length * N;
  const geo = new THREE.PlaneGeometry(1, 1);
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n)), 1);
  geo.setAttribute('aAlpha', alpha);
  const m = new THREE.MeshBasicMaterial({ map: blobTex('puff'), transparent: true, depthWrite: false, color: 0x8090a8, side: THREE.DoubleSide, fog: true });
  m.userData.progKey = 'pczsmoke';
  patchMaterial(m, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlpha; varying float vAlpha;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vAlpha;');
  });
  const im = new THREE.InstancedMesh(geo, m, Math.max(1, n)); im.count = n; im.name = 'smoke'; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.userData.noQA = true; im.renderOrder = 3;
  const wind = o.wind ?? [0.8, 0.3], life = o.life ?? 9, rise = o.rise ?? 1.1, amt = o.amount ?? 0.6;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qz = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  const col = new THREE.Color();
  function update(t, camera) {
    if (camera) _q.copy(camera.quaternion); else _q.identity();
    let i = 0;
    sources.forEach((s, si) => {
      const ph0 = hashN(si, 3), str = 0.55 + 0.45 * hashN(si, 9);
      for (let k = 0; k < N; k++) {
        const ph = ((t / life + k / N + ph0) % 1 + 1) % 1, a = ph * life;
        const lean = ph ** 1.4 * life;
        _p.set(s.x + wind[0] * lean + Math.sin(a * 0.9 + si) * 0.25 * ph, s.y + rise * a * (1 - 0.35 * ph), s.z + wind[1] * lean + Math.cos(a * 0.7 + si) * 0.25 * ph);
        const sc = (0.5 + ph * 3.2) * str;
        _qz.setFromAxisAngle(Z, hashN(si, k) * TAU + a * 0.12);
        _m.compose(_p, _q.clone().multiply(_qz), _s.set(sc, sc, sc)); im.setMatrixAt(i, _m);
        alpha.array[i] = amt * str * Math.sin(Math.PI * ph) ** 1.6 * smooth(ph * 6) * 0.7;
        i++;
      }
    });
    // smoke takes the colour of the air it hangs in: the fog colour, a touch of moon (cold) or sky (day)
    col.copy(U.uFogColor.value).multiplyScalar(1.1).add(_c.copy(U.uMoonColor.value).multiplyScalar(0.22)).add(_c.setRGB(0.1, 0.1, 0.11).multiplyScalar(0.3 + 0.7 * smooth((U.uSunDir.value.y + 0.05) / 0.3)));
    m.color.copy(col);
    im.instanceMatrix.needsUpdate = true; alpha.needsUpdate = true;
  }
  update(0, null);
  return { mesh: im, update };
}

// ── bare deciduous trees (lindens): recursive tapered limbs, three variants, instanced; snow lies on the limbs ──────
let TREEGEO = null;
function treeGeos() {
  if (TREEGEO) return TREEGEO;
  TREEGEO = [0, 1, 2].map((vi) => {
    const R = makeRng(311 + vi * 17), mb = new MB();
    const limb = (p, dir, len, r, depth) => {
      const q = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
      mb.cyl(p, q, r, r * 0.62, depth === 0 ? 7 : 5, false);
      if (depth >= 4) return;
      const kids = depth === 0 ? 5 : depth === 3 ? 2 : 3;
      for (let k = 0; k < kids; k++) {
        const az = (k / kids + R() * 0.3) * TAU, el = depth === 0 ? 0.5 + R() * 0.45 : 0.35 + R() * 0.5;
        const nd = [dir[0] * 0.45 + Math.cos(az) * Math.cos(el), dir[1] * 0.45 + Math.sin(el), dir[2] * 0.45 + Math.sin(az) * Math.cos(el)], l = Math.hypot(...nd);
        const at = depth === 0 ? 0.55 + R() * 0.4 : 0.6 + R() * 0.4;
        const bp = [p[0] + (q[0] - p[0]) * at, p[1] + (q[1] - p[1]) * at, p[2] + (q[2] - p[2]) * at];
        limb(bp, nd.map((v) => v / l), len * (depth === 0 ? 0.62 : 0.58) * (0.8 + R() * 0.4), r * 0.55, depth + 1);
      }
    };
    limb([0, -0.4, 0], [0, 1, 0], 5.2 + vi * 0.8, 0.32, 0);
    const g = mb.geo({ colors: false }); return g;
  });
  return TREEGEO;
}
function treeStand(points, R, o = {}) {
  const geos = treeGeos(), bark = mat({ color: 0x2B2622, roughness: 0.95, snow: o.snow ?? 0.42 }, 'bark');
  const groups = [[], [], []];
  points.forEach((p, i) => groups[Math.floor(hashN(i, 77) * 3) % 3].push(p));
  const root = new THREE.Group(); root.name = 'trees';
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  groups.forEach((list, vi) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geos[vi], bark, list.length); im.castShadow = true; im.receiveShadow = true; im.name = 'tree' + vi;
    list.forEach((p, k) => { const s = (p[3] ?? 1) * (0.85 + hashN(k, vi, 5) * 0.35); _q.setFromAxisAngle(Y, hashN(k, vi, 9) * TAU); _m.compose(new THREE.Vector3(p[0], p[1], p[2]), _q, new THREE.Vector3(s, s, s)); im.setMatrixAt(k, _m); });
    root.add(im);
  });
  return root;
}

// ── ribbons conformed to the ground (roads, rails, kerbs): pts [[x, z]...], offset across, width ─────────────────────
function ribbon(G, pts, w, o = {}) {
  const rows = [], step = o.step ?? 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 1e-6) continue; const n = Math.max(1, Math.ceil(L / step));
    for (let k = rows.length ? 1 : 0; k <= n; k++) rows.push([lerp(ax, bx, k / n), lerp(az, bz, k / n), (bx - ax) / L, (bz - az) / L]);
  }
  // smooth the tangents so the corners mitre
  for (let i = 1; i < rows.length - 1; i++) { const a = rows[i - 1], b = rows[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; rows[i][2] = dx / l; rows[i][3] = dz / l; }
  const nc = o.cols ?? 2, pos = [], uv = [], idx = []; let v = 0;
  const off = o.offset ?? 0, y0 = o.y ?? 0.06, yFn = o.yFn;
  rows.forEach(([x, z, dx, dz], i) => {
    if (i) v += Math.hypot(x - rows[i - 1][0], z - rows[i - 1][1]);
    for (let j = 0; j <= nc; j++) {
      const u = off + (j / nc - 0.5) * w, px = x - dz * u, pz = z + dx * u;
      const y = yFn ? yFn(px, pz, j / nc) : G.h(px, pz) + y0 + (o.crown ?? 0) * (1 - Math.abs(j / nc * 2 - 1));
      pos.push(px, y, pz); uv.push(o.uAcross ? (j / nc) * (o.uScale ?? 1) : u, v * (o.vScale ?? 1));
    }
  });
  const C = nc + 1;
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < nc; j++) { const a = i * C + j, b = a + 1, c = a + C, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // make the normals face up
  const nrm = g.attributes.normal; let up = 0; for (let i = 0; i < nrm.count; i++) up += nrm.getY(i); if (up < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}
// polyline helpers
function polyLen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
function offsetLine(P, off) {
  return P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * off, p[1] + dx / l * off]; });
}
function sampleLine(P) {   // -> {L, at(s) [x, z], dir(s) [dx, dz]}
  const acc = [0]; for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = acc[acc.length - 1];
  const seg = (s) => { s = clamp(s, 0, L); let lo = 0, hi = acc.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; } return [lo, hi, (s - acc[lo]) / Math.max(1e-9, acc[hi] - acc[lo])]; };
  return {
    L, acc,
    at: (s) => { const [a, b, u] = seg(s); return [lerp(P[a][0], P[b][0], u), lerp(P[a][1], P[b][1], u)]; },
    dir: (s) => { const [a, b] = seg(s); const dx = P[b][0] - P[a][0], dz = P[b][1] - P[a][1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; },
  };
}

// ════════════════════════════════════ town.bohemian_village ════════════════════════════════════════════════════════
// The baroque village church: nave with pilasters and arched windows, a polygonal apse, and the west tower with clock,
// belfry and the onion helmet (bell + bulb + lantern + small bulb + cross). Local frame: x along the nave (tower at -x,
// apse at +x), z across, y up from the floor. Returns {group, anchors{towerTop, belfry, door, onion}, glow(k)}.
function baroqueChurch(o = {}) {
  const Ln = o.nave ?? 21, Wn = o.width ?? 10.5, Hn = o.wall ?? 9.6, tw = o.tower ?? 6.4, Ht = o.towerH ?? 23, y0 = o.below ?? -1.6;
  const wall = o.wallCol ?? '#E9E1CC', pil = o.pilCol ?? '#CDA766', trim = '#F4F0E6', plinth = '#8C877E';
  const P = new MB(), Rf = new MB(), On = new MB(), Dk = new MB(), Gl = new MB(), Mt = new MB();
  const X = [1, 0, 0], Y = [0, 1, 0], Zn = [0, 0, 1];
  const xb = -Ln / 2, xe = Ln / 2;
  // nave walls + plinth + cornice
  P.color(wall).box([0, (y0 + Hn) / 2, 0], X, Y, Ln / 2, (Hn - y0) / 2, Wn / 2, 2);
  P.color(plinth).box([0, (y0 + 0.9) / 2, 0], X, Y, Ln / 2 + 0.06, (0.9 - y0) / 2, Wn / 2 + 0.06, 3);
  P.color(trim).box([0, Hn - 0.3, 0], X, Y, Ln / 2 + 0.32, 0.32, Wn / 2 + 0.32, 2);
  // pilasters + tall arched windows between them, both sides
  const bays = 4, bw = Ln / bays;
  const arch = (x0, x1, yb, ys, zf, n = 7) => { const pts = [[x0, yb], [x1, yb]]; const rr = (x1 - x0) / 2, cx = (x0 + x1) / 2; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI; pts.push([cx + Math.cos(a) * rr, ys + Math.sin(a) * rr]); } return pts.map(([x, y]) => [x, y, zf]); };
  for (const s of [1, -1]) {
    for (let b = 0; b <= bays; b++) P.color(pil).box([xb + b * bw, (0.9 + Hn - 0.6) / 2, s * (Wn / 2 + 0.07)], X, Y, 0.38, (Hn - 1.5) / 2, 0.07, 0);
    for (let b = 0; b < bays; b++) {
      const cx = xb + (b + 0.5) * bw, w = 1.5, z = s * (Wn / 2 + 0.015);
      P.color(trim).poly(arch(cx - w / 2 - 0.22, cx + w / 2 + 0.22, 2.6, 6.9, z).map(([x, y]) => [x, y, z + s * 0.01]), [0, 0, s]);
      Gl.poly(arch(cx - w / 2, cx + w / 2, 2.8, 6.9, z + s * 0.02), [0, 0, s]);
    }
  }
  // nave gable roof (ridge along x), west gable wall above the tower's sides, apse
  const pitch = 50 * DEG, ov = 0.45, rh = (Wn / 2 + ov) * Math.tan(pitch), yR = Hn + rh - ov * Math.tan(pitch);
  for (const s of [1, -1]) Rf.poly([[xb - 0.3, Hn - 0.05, s * (Wn / 2 + ov)], [xe, Hn - 0.05, s * (Wn / 2 + ov)], [xe, yR, 0], [xb - 0.3, yR, 0]], [0, 0.6, s]);
  P.color(wall).poly([[xb, Hn, -Wn / 2], [xb, Hn, Wn / 2], [xb, yR - 0.4, 0]], [-1, 0, 0]);
  Rf.poly([[xb - 0.3, Hn - 0.05, -Wn / 2 - ov], [xb - 0.3, Hn - 0.05, Wn / 2 + ov], [xb - 0.3, yR, 0]], [-1, 0, 0]);
  // apse: half octagon walls + a half-pyramid roof meeting the ridge
  const ar = Wn / 2, nA = 4;
  const apx = (k, r) => [xe + Math.sin(k / nA * Math.PI) * r, Math.cos(k / nA * Math.PI) * r];
  for (let k = 0; k < nA; k++) {
    const [ax, az] = apx(k, ar), [bx, bz] = apx(k + 1, ar), mx = (ax + bx) / 2 - xe, mz = (az + bz) / 2;
    P.color(wall).poly([[ax, y0, az], [bx, y0, bz], [bx, Hn, bz], [ax, Hn, az]], [mx, 0, mz]);
    P.color(trim).poly([[ax, Hn - 0.6, az], [bx, Hn - 0.6, bz], [bx, Hn, bz], [ax, Hn, az]].map(([x, y, z]) => [xe + (x - xe) * 1.03, y, z * 1.03]), [mx, 0, mz]);
    const [cx2, cz2] = apx(k + 0.5, ar + 0.02); const nx = cx2 - xe, nz = cz2;
    if (k > 0 && k < nA - 1) { const ux = -nz / ar, uz = nx / ar; Gl.poly([[-0.6, 3.0], [0.6, 3.0], [0.6, 6.4], [0, 7.0], [-0.6, 6.4]].map(([u, y]) => [cx2 + ux * u + nx * 0.01, y, cz2 + uz * u + nz * 0.01]), [nx, 0, nz]); }
    const [ex, ez] = apx(k, ar + ov), [fx, fz] = apx(k + 1, ar + ov);
    Rf.poly([[ex, Hn - 0.05, ez], [fx, Hn - 0.05, fz], [xe, yR, 0]], [mx, 0.8, mz]);
  }
  // the tower
  const tx = xb - tw / 2 + 0.6, ht = tw / 2;
  P.color(wall).box([tx, (y0 + Ht) / 2, 0], X, Y, ht, (Ht - y0) / 2, ht, 0);
  P.color(plinth).box([tx, (y0 + 1.0) / 2, 0], X, Y, ht + 0.08, (1.0 - y0) / 2, ht + 0.08, 12);
  for (const yb of [9.2, 16.0]) P.color(trim).box([tx, yb, 0], X, Y, ht + 0.22, 0.25, ht + 0.22, 0);
  P.color(trim).box([tx, Ht + 0.3, 0], X, Y, ht + 0.45, 0.3, ht + 0.45, 0);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) P.color(pil).box([tx + sx * (ht - 0.25), (1 + Ht) / 2, sz * (ht - 0.25)], X, Y, 0.3, (Ht - 1) / 2, 0.3, 0);
  // openings on the four tower faces: belfry arches (glow behind), clock dials, a small window, the west door
  const faces = [[[-1, 0, 0], [0, 0, -1]], [[0, 0, 1], [-1, 0, 0]], [[0, 0, -1], [1, 0, 0]], [[1, 0, 0], [0, 0, 1]]];
  const glowM = new MB();
  faces.forEach(([n, u], fi) => {
    const c = [tx + n[0] * (ht + 0.02), 0, n[2] * (ht + 0.02)];
    const F = (a, y, d = 0) => [c[0] + u[0] * a + n[0] * d, y, c[2] + u[2] * a + n[2] * d];
    const archF = (w, yb, ys, d) => { const pts = [F(-w / 2, yb, d), F(w / 2, yb, d)]; for (let k = 0; k <= 7; k++) { const a = k / 7 * Math.PI; pts.push(F(Math.cos(a) * w / 2, ys + Math.sin(a) * w / 2, d)); } return pts; };
    if (fi !== 3) {
      P.color(trim).poly(archF(2.3, 16.9, 20.2, 0.01), n);
      // the belfry opening: the lamp-lit bell chamber (glow, in front of the wall: the tower is a solid box) behind
      // four dark louvre boards and a thin reveal; dark by day (setGlow 0)
      glowM.poly(archF(1.8, 17.1, 20.2, 0.03), n);
      for (let q = 0; q < 4; q++) Dk.box(F(0, 17.75 + q * 0.62, 0.06), [u[0], 0, u[2]], [0, 1, 0], 0.86, 0.06, 0.025);
      Dk.box(F(0, 18.65, 0.065), [u[0], 0, u[2]], [0, 1, 0], 0.035, 1.45, 0.02);
      // clock: a pale dial with two hands
      const dial = []; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; dial.push(F(Math.cos(a) * 1.0, 13.7 + Math.sin(a) * 1.0, 0.03)); }
      P.color('#D8D2C0').poly(dial, n);
      Mt.box(F(0, 14.05, 0.06), [u[0], 0, u[2]], [0, 1, 0], 0.045, 0.38, 0.02);
      Mt.box(F(0.22, 13.7, 0.07), [u[0], 0, u[2]], [0, 1, 0], 0.27, 0.04, 0.02);
    }
    Dk.poly(archF(0.7, 10.6, 11.6, 0.03), n);
  });
  // west door: an arched oak door in a stone frame
  { const n = [-1, 0, 0], u = [0, 0, -1], c = [tx - ht - 0.02, 0, 0], F = (a, y, d = 0) => [c[0] + u[0] * a + n[0] * d, y, c[2] + u[2] * a + n[2] * d];
    const archF = (w, yb, ys, d) => { const pts = [F(-w / 2, yb, d), F(w / 2, yb, d)]; for (let k = 0; k <= 7; k++) { const a = k / 7 * Math.PI; pts.push(F(Math.cos(a) * w / 2, ys + Math.sin(a) * w / 2, d)); } return pts; };
    P.color(plinth).poly(archF(2.6, 0, 2.6, 0.02), n); Dk.color('#2A1E16').poly(archF(1.9, 0, 2.6, 0.05), n); }
  // the helmet: bell, bulb, lantern posts, small bulb, spike, ball and cross (lathe profiles, 16 sides)
  const lathe = (prof, y, seg = 16, mb = On) => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, h0] = prof[i], [r1, h1] = prof[i + 1];
      for (let k = 0; k < seg; k++) {
        const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU, am = (a0 + a1) / 2;
        const p = (r, h, a) => [tx + Math.cos(a) * r, y + h, Math.sin(a) * r];
        const dn = [Math.cos(am) * (h1 - h0), r0 - r1, Math.sin(am) * (h1 - h0)];
        if (r1 > 1e-4) mb.poly([p(r0, h0, a0), p(r0, h0, a1), p(r1, h1, a1), p(r1, h1, a0)], dn);
        else mb.poly([p(r0, h0, a0), p(r0, h0, a1), [tx, y + h1, 0]], dn);
      }
    }
  };
  const yH = Ht + 0.6, k0 = ht + 0.35;
  lathe([[k0, 0], [k0 * 0.94, 0.55], [k0 * 0.74, 1.5], [k0 * 0.55, 2.3], [k0 * 0.5, 2.75], [k0 * 0.64, 3.5], [k0 * 0.74, 4.35], [k0 * 0.68, 5.25], [k0 * 0.44, 6.1], [k0 * 0.2, 6.75], [0.55, 6.95]], yH);
  On.poly([[tx - 0.55, yH + 6.95, 0]].concat([...Array(16)].map((_, k) => [tx + Math.cos(k / 16 * TAU) * 0.95, yH + 6.95, Math.sin(k / 16 * TAU) * 0.95])).slice(1), [0, 1, 0]);
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; Mt.color('#3A3E3C').cyl([tx + Math.cos(a) * 0.82, yH + 6.95, Math.sin(a) * 0.82], [tx + Math.cos(a) * 0.82, yH + 8.7, Math.sin(a) * 0.82], 0.08, 0.08, 5, false); }
  glowM.cyl([tx, yH + 7.0, 0], [tx, yH + 8.6, 0], 0.62, 0.62, 10, false);
  lathe([[1.05, 0], [1.12, 0.45], [0.95, 0.95], [0.6, 1.45], [0.3, 1.85], [0.08, 2.3], [0.0, 2.45]], yH + 8.7);
  Mt.color('#B49650').cyl([tx, yH + 10.9, 0], [tx, yH + 13.2, 0], 0.05, 0.035, 6, false);
  { const pts = []; for (let k = 0; k < 10; k++) pts.push(k); const S = new THREE.SphereGeometry(0.22, 10, 8); S.translate(tx, yH + 11.3, 0); Mt._ball = S; }
  Mt.box([tx, yH + 12.6, 0], X, Y, 0.04, 0.62, 0.04, 0); Mt.box([tx, yH + 12.85, 0], [0, 0, 1], Y, 0.32, 0.04, 0.04, 0);
  // materials
  const T = townTextures();
  const plaster = mat({ map: (() => { const t = T.stucco.clone(); t.needsUpdate = true; t.repeat.set(1 / 3, 1 / 3); return t; })(), vertexColors: true, roughness: 0.92, snow: 0.55 }, 'chplaster');
  const roofTex = masonryTex('shingle', { size: 512, meters: 3, courseH: 0.16, blockL: [0.12, 0.2], tones: ['#4A4C50', '#3E4044', '#55575A', '#444649'], mortar: '#1E1F21', seed: 61, bevel: 0.05, dirt: 0.35 });
  const roof = texMat(roofTex, 3, { snow: 0.3, roughness: 0.85, normal: 0.9, key: 'chroof' });
  const copper = mat({ color: o.onionCol ?? 0x26302C, roughness: 0.66, metalness: 0.2, envMapIntensity: 0.6, snow: 0.6 }, 'chonion');   // painted sheet metal: no mirror (the env map blocked into squares on the bulb)
  const dark = mat({ color: 0x08090B, roughness: 0.95, vertexColors: true });
  const glass = mat({ color: 0x1A2026, roughness: 0.15, metalness: 0.2, envMapIntensity: 1.3, emissive: 0xFFB060, emissiveIntensity: 0 });
  const metal = mat({ color: 0xB49650, roughness: 0.35, metalness: 0.9, vertexColors: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFA850, side: THREE.DoubleSide }); patchMaterial(glowMat);
  const group = new THREE.Group(); group.name = 'church';
  group.add(P.mesh(plaster, 'church:plaster'), Rf.mesh(roof, 'church:roof', { colors: false }), On.mesh(copper, 'church:onion', { colors: false }), Dk.mesh(dark, 'church:dark', { cast: false }), Gl.mesh(glass, 'church:glass', { colors: false, cast: false }), Mt.mesh(metal, 'church:metal', { colors: false }));
  const ball = new THREE.Mesh(Mt._ball, metal); group.add(ball);
  const glow = glowM.mesh(glowMat, 'church:belfryglow', { colors: false, cast: false }); glow.userData.noQA = true; group.add(glow);
  // a lamp in the bell chamber: warm light spilling through the arches onto the helmet and the snow on the roofs
  const lamp = new THREE.PointLight(0xFFA458, 0, 60, 1.6); lamp.position.set(tx, 18.6, 0); lamp.castShadow = false; lamp.userData.noGovern = true; group.add(lamp);
  const anchors = { towerTop: new THREE.Vector3(tx, yH + 12.9, 0), belfry: new THREE.Vector3(tx, 18.6, 0), onion: new THREE.Vector3(tx, yH + 4.3, 0), door: new THREE.Vector3(tx - ht - 2, 0, 0), nave: new THREE.Vector3(0, Hn, 0) };
  function setGlow(k, lights) {
    const v = k * lights;
    glowMat.color.setRGB(1.0 * v * 1.6, 0.62 * v * 1.6, 0.3 * v * 1.6);
    lamp.intensity = 260 * v; lamp.visible = v > 0.01;
    glass.emissiveIntensity = 0.18 * lights * (o.windows ?? 0.6);
  }
  return { group, anchors, setGlow, height: yH + 13.2, length: Ln + tw + ar };
}

const VSIZE = { tiny: 40, small: 60, medium: 85, large: 110 };
function bohemianVillage(kind, item, ctx) {
  const G = ground(ctx), R = rngFor(ctx, (item.seed ?? 11) * 97 + 5), warn = warnOf(ctx);
  const at = xz(item.at), hdg = (item.heading ?? 90) * DEG;
  const d = [Math.sin(hdg), -Math.cos(hdg)], r = [Math.cos(hdg), Math.sin(hdg)];
  const W = (u, v) => [at[0] + d[0] * u + r[0] * v, at[1] + d[1] * u + r[1] * v];
  const size = VSIZE[item.size] ?? (typeof item.size === 'number' ? clamp(item.size, 30, 140) : VSIZE.small);
  const Lg = size, wg = 13 + size * 0.1, roadOff = wg + 3, rw = 5.2;
  const snow = item.snow ?? ctx.weather?.snow ?? 1;
  const snowK = snow > 0 ? clamp(snow, 0.35, 1.2) : 0;
  PU.uPSnow.value = snowK;
  // the loop road round the green (a stadium) + the two exits along the axis + a lane off one side
  const loop = [];
  for (let i = 0; i <= 64; i++) {
    const f = i / 64, per = 4 * Lg + TAU * roadOff, s = f * per;
    let u, v;
    if (s < 2 * Lg) { u = -Lg + s; v = -roadOff; }
    else if (s < 2 * Lg + Math.PI * roadOff) { const a = (s - 2 * Lg) / roadOff - Math.PI / 2; u = Lg + Math.cos(a) * roadOff; v = Math.sin(a) * roadOff; }
    else if (s < 4 * Lg + Math.PI * roadOff) { u = Lg - (s - 2 * Lg - Math.PI * roadOff); v = roadOff; }
    else { const a = (s - 4 * Lg - Math.PI * roadOff) / roadOff + Math.PI / 2; u = -Lg + Math.cos(a) * roadOff; v = Math.sin(a) * roadOff; }
    loop.push([u, v]);
  }
  const exitA = [[Lg + roadOff, 0], [Lg + roadOff + size * 0.6, 3], [Lg + roadOff + size * 1.6, 12]];
  const exitB = [[-Lg - roadOff, 0], [-Lg - roadOff - size * 0.6, -4], [-Lg - roadOff - size * 1.6, -14]];
  const lane = [[size * 0.1, roadOff], [size * 0.12, roadOff + 30], [size * 0.25, roadOff + size * 1.1]];
  const streets = [loop, exitA, exitB, lane];
  // farmsteads: house gable-on to the road, yard wall + gate, barn behind
  const fps = [], walls = [], gates = [];
  const yardWall = (a, b) => walls.push([a, b]);
  const frontV = roadOff + rw / 2 + 2.5;
  for (const side of [-1, 1]) {
    let u = -Lg + 3 + R() * 4;
    while (u < Lg - 8) {
      const pw = 15 + R() * 6, hw = 8.2 + R() * 1.4, hd = 12 + R() * 3.5, left = R() < 0.5;
      const hu0 = left ? u : u + pw - hw, hu1 = hu0 + hw;
      const v0 = side * frontV, v1 = side * (frontV + hd);
      fps.push({ p: [W(hu0, v0), W(hu1, v0), W(hu1, v1), W(hu0, v1)], k: 'house', lv: R() < 0.82 ? '1' : '2' });
      // yard wall with a gate along the frontage beside the house
      const wu0 = left ? hu1 : u, wu1 = left ? u + pw : hu0;
      if (wu1 - wu0 > 3) { yardWall(W(wu0, v0 + side * 0.4), W(wu1, v0 + side * 0.4)); gates.push({ c: W((wu0 + wu1) / 2, v0 + side * 0.4), dir: d, w: Math.min(3.6, wu1 - wu0 - 1.2) }); }
      // barn across the back of the yard (ridge along the road)
      if (R() < 0.85) { const bv0 = side * (frontV + hd + 4 + R() * 3), bv1 = bv0 + side * (7.5 + R() * 1.5); fps.push({ p: [W(u + 0.6, bv0), W(u + pw - 0.6, bv0), W(u + pw - 0.6, bv1), W(u + 0.6, bv1)], k: 'barn', lv: '1' }); }
      u += pw + R() * 1.5;
    }
  }
  // round the ends of the green: a few houses facing the centre, and some along the exits
  for (const end of [-1, 1]) {
    for (const a of [-0.55, 0.55]) {
      const ang = a + (R() - 0.5) * 0.2, rr = roadOff + rw / 2 + 9, cu = end * (Lg + Math.cos(ang) * rr), cv = Math.sin(ang) * rr;
      const ou = end * Math.cos(ang), ov = Math.sin(ang), pu = -ov, pv = ou, hw = 4.3, hd = 7;
      const C = (s, t) => W(cu + pu * s + ou * t, cv + pv * s + ov * t);
      fps.push({ p: [C(-hw, -hd), C(hw, -hd), C(hw, hd), C(-hw, hd)], k: 'house', lv: '1' });
    }
    const ex = end > 0 ? exitA : exitB;
    for (let k = 0; k < 4; k++) {
      const f = 0.25 + k * 0.2, p = [lerp(ex[0][0], ex[2][0], f), lerp(ex[0][1], ex[2][1], f)], sd = k % 2 ? 1 : -1;
      const cu = p[0], cv = p[1] + sd * (rw / 2 + 9);
      fps.push({ p: [W(cu - 4.2, cv - sd * 6.5), W(cu + 4.2, cv - sd * 6.5), W(cu + 4.2, cv + sd * 6.5), W(cu - 4.2, cv + sd * 6.5)], k: 'house', lv: '1' });
    }
  }
  const roads = []; for (const st of streets) for (let i = 0; i < st.length - 1; i++) roads.push([...W(...st[i]), ...W(...st[i + 1])]);
  const town = buildSyntheticTown({ heightAt: G.h, footprints: fps, roads, churches: [], style: 'village', seed: (item.seed ?? 11) * 13 + 3, name: kind, snow: snowK });
  const root = new THREE.Group(); root.name = kind; root.add(town.group);
  // blackout: keep only `lit` windows glowing (the town builder lights ~45 % of the houses)
  let litKept = 0;
  { const gm = town.group.children.find((m) => /:glass$/.test(m.name));
    const a = gm && gm.geometry.attributes.aLit, pos = gm && gm.geometry.attributes.position;
    if (a && pos) {
      const quads = []; for (let i = 0; i + 3 < a.count; i += 4) if (a.getX(i) > 0) quads.push(i);
      const want = Math.max(0, Math.round(item.lit ?? 5));
      // prefer windows that face the green (the road side): the quad centre nearer the axis than the house centre
      const score = (i) => { let x = 0, z = 0; for (let k = 0; k < 4; k++) { x += pos.getX(i + k); z += pos.getZ(i + k); } x /= 4; z /= 4; const v = Math.abs((x - at[0]) * r[0] + (z - at[1]) * r[1]); return v + R() * 6; };
      const ranked = quads.map((i) => [i, score(i)]).sort((p, q) => p[1] - q[1]);
      const keep = new Set(ranked.slice(0, want * 2).filter((_, k) => k % 2 === 0 || ranked.length < want * 2).slice(0, want).map((p) => p[0]));
      for (const i of quads) { const v = keep.has(i) ? 0.75 + 0.25 * R() : 0; for (let k = 0; k < 4; k++) a.setX(i + k, v); }
      a.needsUpdate = true; litKept = keep.size;
    } }
  // roads: packed snow with ruts (bare earth-grey when there is no snow)
  const roadMat = mat({ map: (() => { const t = snowRoadTex().clone(); t.needsUpdate = true; return t; })(), color: snowK > 0 ? 0xffffff : 0x6E655A, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (const st of streets) {
    const g = ribbon(G, st.map(([u, v]) => W(u, v)), rw, { uAcross: true, vScale: 0.25, y: 0.05, crown: 0.03 });
    const m = new THREE.Mesh(g, roadMat); m.name = 'road'; m.receiveShadow = true; m.userData.noQA = true; root.add(m);
  }
  // yard walls (plaster, a tiled coping with its snow) and the gates (dark planks under a little roof)
  { const Wm = new MB(), Gm = new MB(), Cp = new MB();
    for (const [a, b] of walls) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, gy = Math.min(G.h(a[0], a[1]), G.h(b[0], b[1]), G.h(cx, cz));
      Wm.color(['#DCD5C4', '#D2CABA', '#E2DCCD'][Math.floor(R() * 3)]).box([cx, gy - 0.5 + 1.25, cz], [ux, 0, uz], [0, 1, 0], L / 2, 1.75, 0.22, 0);
      Cp.box([cx, gy + 3.05, cz], [ux, 0, uz], [0, 1, 0], L / 2 + 0.05, 0.08, 0.36, 0);
    }
    for (const g of gates) {
      const gy = G.h(g.c[0], g.c[1]), ux = g.dir[0], uz = g.dir[1];
      Gm.color('#2E2219').box([g.c[0], gy + 1.15, g.c[1]], [ux, 0, uz], [0, 1, 0], g.w / 2, 1.2, 0.27, 0);
      for (const s of [-1, 1]) Wm.color('#E4DDCC').box([g.c[0] + ux * s * (g.w / 2 + 0.35), gy + 1.4, g.c[1] + uz * s * (g.w / 2 + 0.35)], [ux, 0, uz], [0, 1, 0], 0.35, 1.9, 0.35, 0);
      Cp.box([g.c[0], gy + 3.45, g.c[1]], [ux, 0, uz], [0, 1, 0], g.w / 2 + 0.8, 0.12, 0.6, 0);
    }
    const T = townTextures();
    const plaster = mat({ map: (() => { const t = T.stucco.clone(); t.needsUpdate = true; t.repeat.set(1 / 3, 1 / 3); return t; })(), vertexColors: true, roughness: 0.94, snow: 0.55 }, 'vwall');
    const wood = mat({ color: 0xffffff, vertexColors: true, roughness: 0.85, snow: 0.5 }, 'vgate');
    const coping = mat({ color: 0x5A3A2C, roughness: 0.8, snow: 0.25 }, 'vcoping');
    if (!Wm.empty) root.add(Wm.mesh(plaster, 'village:walls')); if (!Gm.empty) root.add(Gm.mesh(wood, 'village:gates')); if (!Cp.empty) root.add(Cp.mesh(coping, 'village:coping', { colors: false }));
  }
  // the church on the green (tower toward the centre of the green), the frozen pond at the other end, lindens
  const cs = item.church_side === 'west' ? -1 : 1;
  let church = null;
  if (item.church !== false) {
    church = baroqueChurch({ windows: 0.5 });
    const cu = cs * Lg * 0.42, [cx, cz] = W(cu, 0), gy = G.h(cx, cz);
    // local +x (tower -> apse) along +d*cs
    const ax = [d[0] * cs, d[1] * cs];
    church.group.position.set(cx, gy, cz); church.group.rotation.y = Math.atan2(-ax[1], ax[0]);
    root.add(church.group);
  }
  if (item.pond !== false) {
    const [px, pz] = W(-cs * Lg * 0.5, 0), g = new THREE.CircleGeometry(1, 40); g.rotateX(-Math.PI / 2);
    const ice = new THREE.Mesh(g, mat({ color: 0x5A6878, roughness: 0.3, metalness: 0.05, envMapIntensity: 1.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, snow: 0.97 }, 'pice'));   // grey-blue ice with drifted snow patches
    ice.scale.set(Math.min(16, wg * 0.9), 1, Math.min(9, wg * 0.55)); ice.rotation.y = -hdg + Math.PI / 2; ice.position.set(px, G.h(px, pz) + 0.07, pz); ice.name = 'pond'; ice.receiveShadow = true; ice.userData.noQA = true; root.add(ice);
  }
  const trees = [];
  const nT = item.trees ?? 1;
  if (nT > 0) {
    if (church) { const c = church.group.position; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 0.4, rr = 17 + R() * 5; const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr; if (Math.abs((x - at[0]) * r[0] + (z - at[1]) * r[1]) < wg - 3) trees.push([x, G.h(x, z), z, 1.1]); } }
    for (const side of [-1, 1]) for (let u = -Lg + 6; u < Lg - 6; u += 13 + R() * 6) { if (R() > nT * 0.8) continue; const [x, z] = W(u, side * (wg - 2.5)); trees.push([x, G.h(x, z), z, 0.9 + R() * 0.25]); }
    for (let k = 0; k < Math.round(14 * nT); k++) { const side = R() < 0.5 ? -1 : 1, u = (R() * 2 - 1) * Lg, v = side * (frontV + 18 + R() * 16); const [x, z] = W(u, v); trees.push([x, G.h(x, z), z, 0.8 + R() * 0.4]); }
    root.add(treeStand(trees, R, { snow: 0.42 }));
  }
  // chimney smoke from the occupied houses (blackout or not, the stoves burn)
  const smokeAmt = item.smoke ?? 0.7;
  const srcs = (town.anchors.smoke || []).slice(0, 14).map((v) => ({ x: v.x, y: v.y + 0.3, z: v.z }));
  const wdir = ctx.weather?.windDir != null ? ctx.weather.windDir * DEG : hdg + 0.6, wsp = 0.35 + (ctx.weather?.wind ?? 0.3) * 1.2;
  const smoke = smokeAmt > 0 && srcs.length ? smokeWisps(srcs, { wind: [Math.sin(wdir) * wsp, -Math.cos(wdir) * wsp], amount: smokeAmt }) : null;
  if (smoke) root.add(smoke.mesh);
  const tGlow = item.tower_glow ?? 0.6;
  const anchors = { chimneys: town.anchors.chimneys, smoke: town.anchors.smoke, green: new THREE.Vector3(at[0], G.h(at[0], at[1]), at[1]) };
  if (church) {
    church.group.updateMatrixWorld(true);
    for (const k of ['towerTop', 'belfry', 'onion', 'door']) anchors[k === 'towerTop' ? 'church_top' : k] = church.anchors[k].clone().applyMatrix4(church.group.matrixWorld);
    anchors.churchTop = anchors.church_top; anchors.church = church.group.position.clone();
  }
  const pond = W(-cs * Lg * 0.5, 0); anchors.pond = new THREE.Vector3(pond[0], G.h(pond[0], pond[1]), pond[1]);
  return {
    root, radius: Lg + roadOff + size * 0.9, height: church ? church.height : 14,
    update(t, clock, camera) {
      const L = LIGHTS();
      PU.uPSnow.value = snowK;
      town.update(t, { snow: snowK, lights: L, fire: 0 });
      if (church) church.setGlow(tGlow, L);
      if (smoke) smoke.update(t, camera);
    },
    anchors, stats: { houses: fps.length, lit: litKept, smoke: srcs.length, trees: trees.length },
    streets: streets.map((st) => st.map(([u, v]) => W(u, v))),
  };
}

// ════════════════════════════════════ landmark.prague_castle ═══════════════════════════════════════════════════════
// lathe profile [[r, h]...] around (cx, cz) from height y into a builder
function latheInto(mb, cx, cz, y, prof, seg = 16) {
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, h0] = prof[i], [r1, h1] = prof[i + 1];
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU, am = (a0 + a1) / 2;
      const p = (rr, h, a) => [cx + Math.cos(a) * rr, y + h, cz + Math.sin(a) * rr];
      const dn = [Math.cos(am) * (h1 - h0), r0 - r1, Math.sin(am) * (h1 - h0)];
      if (r1 > 1e-4 && r0 > 1e-4) mb.poly([p(r0, h0, a0), p(r0, h0, a1), p(r1, h1, a1), p(r1, h1, a0)], dn);
      else if (r1 <= 1e-4) mb.poly([p(r0, h0, a0), p(r0, h0, a1), [cx, y + h1, cz]], dn);
      else mb.poly([[cx, y + h0, cz], p(r1, h1, a1), p(r1, h1, a0)], dn);
    }
  }
}
// pyramid / spire with n sides from a square or polygon base
function spireInto(mb, cx, cz, y0, y1, r, n = 8, rot = Math.PI / 8) {
  for (let k = 0; k < n; k++) {
    const a0 = rot + k / n * TAU, a1 = rot + (k + 1) / n * TAU, am = (a0 + a1) / 2;
    mb.poly([[cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx, y1, cz]], [Math.cos(am), r / Math.max(1, y1 - y0), Math.sin(am)]);
  }
}
// hip / gable roof over an axis-aligned block (ridge along x when w >= d): x0..x1, z0..z1, eaves y, ridge y
function roofInto(mb, x0, x1, z0, z1, ye, yr, hip = true, ov = 0.4) {
  x0 -= ov; x1 += ov; z0 -= ov; z1 += ov;
  const alongX = x1 - x0 >= z1 - z0;
  if (alongX) {
    const zm = (z0 + z1) / 2, inset = hip ? Math.min((z1 - z0) / 2, (x1 - x0) / 2) : 0;
    mb.poly([[x0, ye, z1], [x1, ye, z1], [x1 - inset, yr, zm], [x0 + inset, yr, zm]], [0, 1, 1]);
    mb.poly([[x0, ye, z0], [x0 + inset, yr, zm], [x1 - inset, yr, zm], [x1, ye, z0]], [0, 1, -1]);
    mb.poly([[x0, ye, z0], [x0, ye, z1], [x0 + inset, yr, zm]], [-1, hip ? 1 : 0, 0]);
    mb.poly([[x1, ye, z0], [x1 - inset, yr, zm], [x1, ye, z1]], [1, hip ? 1 : 0, 0]);
  } else {
    const xm = (x0 + x1) / 2, inset = hip ? Math.min((x1 - x0) / 2, (z1 - z0) / 2) : 0;
    mb.poly([[x1, ye, z0], [x1, ye, z1], [xm, yr, z1 - inset], [xm, yr, z0 + inset]], [1, 1, 0]);
    mb.poly([[x0, ye, z0], [xm, yr, z0 + inset], [xm, yr, z1 - inset], [x0, ye, z1]], [-1, 1, 0]);
    mb.poly([[x0, ye, z0], [x1, ye, z0], [xm, yr, z0 + inset]], [0, hip ? 1 : 0, -1]);
    mb.poly([[x0, ye, z1], [xm, yr, z1 - inset], [x1, ye, z1]], [0, hip ? 1 : 0, 1]);
  }
}
function pragueCastle(kind, item, ctx) {
  const G = ground(ctx), R = rngFor(ctx, (item.seed ?? 3) * 53 + 1);
  const at = xz(item.at), hdg = (item.heading ?? 180) * DEG, k = clamp(item.scale ?? 1, 0.3, 2);
  const H = (item.hill ?? 52);
  const root = new THREE.Group(); root.name = kind;
  const g = new THREE.Group(); g.name = 'hradcany'; root.add(g);
  g.position.set(at[0], G.h(at[0], at[1]), at[1]); g.rotation.y = Math.atan2(Math.sin(hdg), -Math.cos(hdg)); g.scale.setScalar(k);
  // ── the ridge: plateau at H, a steep garden slope toward the front (+z), gentler behind; tapering ends
  const hill = (x, z) => {
    const ex = smooth((330 - Math.abs(x)) / 140);
    const fr = z > 14 ? smooth(1 - (z - 14) / 120) ** 1.15 : 1;
    const bk = z < -120 ? smooth(1 - (-120 - z) / 130) : 1;
    return H * ex * fr * bk - 3;
  };
  { const NX = 72, NZ = 48, X0 = -420, X1 = 420, Z0 = -260, Z1 = 150, pos = [], idx = [], col = [];
    const c1 = new THREE.Color(0x1E2A1C), c2 = new THREE.Color(0x3A3A2A), cc = new THREE.Color();
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const x = lerp(X0, X1, i / NX), z = lerp(Z0, Z1, j / NZ), y = hill(x, z);
      pos.push(x, y, z); cc.copy(c1).lerp(c2, hashN(i, j, 3) * 0.6); col.push(cc.r, cc.g, cc.b);
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d2 = c + 1; idx.push(a, c, b, b, c, d2); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.setIndex(idx); gg.computeVertexNormals();
    const hm = new THREE.Mesh(gg, mat({ vertexColors: true, roughness: 1, snow: item.snow ? 0.5 : null }, 'hill')); hm.name = 'castle:hill'; hm.receiveShadow = true; hm.userData.ground = true; g.add(hm);
    // garden trees on the slopes (dark crowns)
    const tg = new THREE.IcosahedronGeometry(1, 1), pts = [];
    for (let n = 0; n < 520; n++) { const x = (R() * 2 - 1) * 330, z = 18 + R() * 120; const y = hill(x, z); if (y < 2) continue; pts.push([x, y, z, 3 + R() * 3]); }
    for (let n = 0; n < 160; n++) { const x = (R() * 2 - 1) * 300, z = -60 - R() * 150; pts.push([x, hill(x, z), z, 3 + R() * 3]); }
    const im = new THREE.InstancedMesh(tg, mat({ color: 0x1C2618, roughness: 1, flatShading: true }), pts.length); im.name = 'castle:gardens';
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
    pts.forEach(([x, y, z, s], i) => { _m.compose(new THREE.Vector3(x, y + s * 0.7, z), _q, new THREE.Vector3(s, s * 0.85, s)); im.setMatrixAt(i, _m); });
    im.castShadow = true; im.receiveShadow = true; im.userData.noQA = true; g.add(im);
  }
  // ── builders: walls with shader windows (aWin), roofs, copper, dark, stone
  const WL = new MB(), RF = new MB(), CU = new MB(), ST = new MB(), DK = new MB();
  const X = [1, 0, 0], Y = [0, 1, 0];
  let seed = 1;
  const block = (x0, x1, z0, z1, y0, y1, colr, o = {}) => {
    WL.win = o.win === false ? [0, 0, 0, 0] : [seed++, y0 + (o.base ?? 0), y1 - 0.8, 1];
    WL.color(colr).box([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], X, Y, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2, 8);
    WL.win = [0, 0, 0, 0];
    WL.color(o.trim ?? '#EFE8D8').box([(x0 + x1) / 2, y1 - 0.3, (z0 + z1) / 2], X, Y, (x1 - x0) / 2 + 0.5, 0.35, (z1 - z0) / 2 + 0.5, 8);
    if (o.roof !== false) roofInto(o.copper ? CU : RF, x0, x1, z0, z1, y1, y1 + (o.rh ?? Math.min(x1 - x0, z1 - z0) * 0.55), o.hip ?? true, 0.5);
  };
  const cream = '#E6DCC2', ochre = '#DCC896', pale = '#ECE6D6', grey = '#C8C2B4';
  // retaining wall and the ramparts below the south front
  ST.color('#8E887C').box([10, H - 7, 13], X, Y, 165, 9, 1.6, 0);
  ST.color('#7E786C').box([-205, H - 10, 18], X, Y, 55, 10, 1.6, 0);
  // the south wing (Theresian front): long, regular, four storeys, central risalit with a pediment
  block(-112, 92, -6, 10, H, H + 17, cream, { rh: 7.5 });
  block(-14, 14, 9, 12, H, H + 19.5, pale, { rh: 0, roof: false });
  RF.poly([[-15, H + 19.5, 12.5], [15, H + 19.5, 12.5], [0, H + 25.5, 12.5]], [0, 0, 1]); RF.poly([[-15, H + 19.5, 12.5], [0, H + 25.5, 12.5], [0, H + 25.5, 6], [-15, H + 19.5, 6]], [-0.4, 1, 0]); RF.poly([[15, H + 19.5, 12.5], [15, H + 19.5, 6], [0, H + 25.5, 6], [0, H + 25.5, 12.5]], [0.4, 1, 0]);
  block(-150, -112, -4, 8, H, H + 14, ochre, { rh: 6 });
  // Hradcany square palaces at the west end: Schwarzenberg (gables) and the Archbishop's
  block(-236, -196, -4, 12, H - 2, H + 15, '#BDB6A6', { rh: 7 });
  for (let gx = -232; gx < -198; gx += 8.5) WL.color('#B4AD9C').poly([[gx, H + 15, 12.05], [gx + 7, H + 15, 12.05], [gx + 5.4, H + 19.5, 12.05], [gx + 1.6, H + 19.5, 12.05]], [0, 0, 1]);
  block(-194, -152, -2, 11, H - 1, H + 14, '#E8E2D2', { rh: 6.5 });
  // east: lower blocks stepping down the slope, the Lobkowicz palace, the Black Tower
  block(92, 150, -4, 9, H - 2, H + 13, ochre, { rh: 6 });
  block(150, 190, 0, 12, H - 9, H + 4, cream, { rh: 6 });
  ST.color('#5E5A54').box([200, H - 4, 6], X, Y, 5, 15, 5, 0); spireInto(RF, 200, 6, H + 11, H + 19, 7.2, 4, Math.PI / 4);
  // St Vitus: west front with two spires, nave + aisles, the great south tower, the crossing turret, the choir with its
  // flying buttresses (the spiky silhouette above the palace)
  const cz = -32, nx0 = -60, nx1 = 50;
  ST.color('#9A948A').box([(nx0 + nx1) / 2, H + 18, cz], X, Y, (nx1 - nx0) / 2, 18, 8, 8);
  for (const s of [1, -1]) ST.color('#8E887E').box([(nx0 + nx1) / 2 + 4, H + 9, cz + s * 12], X, Y, (nx1 - nx0) / 2 - 4, 9, 4, 8);
  for (const s of [1, -1]) RF.poly([[nx0 + 8, H + 18, cz + s * 16.5], [nx1, H + 18, cz + s * 16.5], [nx1, H + 25, cz + s * 8], [nx0 + 8, H + 25, cz + s * 8]], [0, 1, s]);
  // the nave's copper roof (ridge at H+52) and the polygonal apse roof
  CU.poly([[nx0 + 6, H + 36, cz + 8.8], [nx1, H + 36, cz + 8.8], [nx1, H + 52, cz], [nx0 + 6, H + 52, cz]], [0, 1, 1]);
  CU.poly([[nx0 + 6, H + 36, cz - 8.8], [nx0 + 6, H + 52, cz], [nx1, H + 52, cz], [nx1, H + 36, cz - 8.8]], [0, 1, -1]);
  for (let kk = 0; kk < 5; kk++) {
    const a0 = -Math.PI / 2 + kk / 5 * Math.PI, a1 = -Math.PI / 2 + (kk + 1) / 5 * Math.PI, am = (a0 + a1) / 2;
    ST.color('#9A948A').poly([[nx1 + Math.cos(a0) * 8, H, cz + Math.sin(a0) * 8], [nx1 + Math.cos(a1) * 8, H, cz + Math.sin(a1) * 8], [nx1 + Math.cos(a1) * 8, H + 36, cz + Math.sin(a1) * 8], [nx1 + Math.cos(a0) * 8, H + 36, cz + Math.sin(a0) * 8]], [Math.cos(am), 0, Math.sin(am)]);
    CU.poly([[nx1 + Math.cos(a0) * 8.8, H + 36, cz + Math.sin(a0) * 8.8], [nx1 + Math.cos(a1) * 8.8, H + 36, cz + Math.sin(a1) * 8.8], [nx1, H + 52, cz]], [Math.cos(am), 1, Math.sin(am)]);
  }
  // tall lancet windows on the clerestory (dark)
  for (let x = nx0 + 12; x < nx1 - 2; x += 7) for (const s of [1, -1]) DK.poly([[x - 1.3, H + 22, cz + s * 8.06], [x + 1.3, H + 22, cz + s * 8.06], [x + 1.3, H + 32, cz + s * 8.06], [x, H + 34.5, cz + s * 8.06], [x - 1.3, H + 32, cz + s * 8.06]], [0, 0, s]);
  // flying buttresses + pinnacles along the choir and nave
  for (let x = nx0 + 14; x <= nx1 + 4; x += 6.5) for (const s of [1, -1]) {
    const pz = cz + s * 18.5;
    ST.color('#8A847A').box([x, H + 14, pz], X, Y, 0.9, 14, 0.9, 8);
    spireInto(ST, x, pz, H + 28, H + 36.5, 1.0, 4, Math.PI / 4);
    const a = [x, H + 26, pz], b = [x, H + 33, cz + s * 8.4], dz = b[2] - a[2], dy = b[1] - a[1], L = Math.hypot(dz, dy);
    ST.box([x, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], X, [0, dy / L, dz / L], 0.45, L / 2, 0.5, 0);
    spireInto(ST, x, cz + s * 8.4, H + 36, H + 41, 0.6, 4, Math.PI / 4);
  }
  // west front: two towers + spires, the rose window gable between them
  for (const s of [1, -1]) {
    const tzc = cz + s * 12.5, tx0 = nx0 - 9, tx1 = nx0;
    ST.color('#A09A90').box([(tx0 + tx1) / 2, H + 29, tzc], X, Y, 4.5, 29, 4.5, 8);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) spireInto(ST, (tx0 + tx1) / 2 + sx * 4.3, tzc + sz * 4.3, H + 58, H + 66, 0.7, 4, Math.PI / 4);
    ST.cyl([(tx0 + tx1) / 2, H + 58, tzc], [(tx0 + tx1) / 2, H + 64, tzc], 3.6, 3.4, 8, true);
    spireInto(ST, (tx0 + tx1) / 2, tzc, H + 64, H + 82, 3.5, 8);
    for (let yy = H + 20; yy < H + 56; yy += 9) DK.poly([[tx0 - 0.03, yy, tzc - 1], [tx0 - 0.03, yy, tzc + 1], [tx0 - 0.03, yy + 5.5, tzc + 1], [tx0 - 0.03, yy + 6.6, tzc], [tx0 - 0.03, yy + 5.5, tzc - 1]], [-1, 0, 0]);
  }
  ST.color('#A09A90').poly([[nx0, H + 36, cz - 8], [nx0, H + 36, cz + 8], [nx0, H + 50, cz]], [-1, 0, 0]);
  { const rose = []; for (let kk = 0; kk < 18; kk++) { const a = kk / 18 * TAU; rose.push([nx0 - 0.05, H + 30 + Math.sin(a) * 4.2, cz + Math.cos(a) * 4.2]); } DK.poly(rose, [-1, 0, 0]); }
  // the great south tower (the icon): gothic shaft, renaissance gallery, baroque copper helmet with lantern, spike to 99 m
  { const sx = 8.5, sz = cz + 14.5, hw = 6.5;
    ST.color('#9C968C').box([sx, H + 28, sz], X, Y, hw, 28, hw, 8);
    for (let yy = H + 24; yy < H + 52; yy += 13) for (const [nx, nz] of [[0, 1], [1, 0], [-1, 0]]) { const c = [sx + nx * (hw + 0.04), 0, sz + nz * (hw + 0.04)], u = [-nz, nx]; DK.poly([[c[0] - u[0] * 1.4, yy, c[2] - u[1] * 1.4], [c[0] + u[0] * 1.4, yy, c[2] + u[1] * 1.4], [c[0] + u[0] * 1.4, yy + 8, c[2] + u[1] * 1.4], [c[0], yy + 9.8, c[2]], [c[0] - u[0] * 1.4, yy + 8, c[2] - u[1] * 1.4]], [nx, 0, nz]); }
    ST.color('#B0AA9E').box([sx, H + 57, sz], X, Y, hw + 0.8, 1.0, hw + 0.8, 0);
    ST.color('#A8A296').box([sx, H + 59.2, sz], X, Y, hw - 0.4, 1.4, hw - 0.4, 0);
    for (let kk = 0; kk < 16; kk++) { const a = kk / 16 * TAU, rr = hw + 0.5; ST.box([sx + Math.cos(a) * rr, H + 58.6, sz + Math.sin(a) * rr], X, Y, 0.18, 0.6, 0.18, 0); }
    latheInto(CU, sx, sz, H + 60.6, [[7.2, 0], [6.8, 1.8], [5.5, 4.6], [4.1, 7.6], [4.0, 8.4], [4.7, 10.4], [4.6, 12.8], [3.5, 15.2], [1.7, 16.9], [0.9, 17.4]], 20);
    for (let kk = 0; kk < 8; kk++) { const a = kk / 8 * TAU; ST.cyl([sx + Math.cos(a) * 1.5, H + 78, sz + Math.sin(a) * 1.5], [sx + Math.cos(a) * 1.5, H + 81.8, sz + Math.sin(a) * 1.5], 0.22, 0.22, 5, false); }
    latheInto(CU, sx, sz, H + 81.8, [[2.0, 0], [2.05, 1.0], [1.6, 2.4], [0.9, 3.6], [0.3, 4.6], [0.12, 5.2]], 14);
    CU.cyl([sx, H + 86.8, sz], [sx, H + 99, sz], 0.18, 0.05, 6, false);
    // the gallery glows faintly at night (the tower watch) — tiny dark-gold openings
    for (const [nx, nz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const c = [sx + nx * (hw - 0.35), 0, sz + nz * (hw - 0.35)], u = [-nz, nx]; DK.poly([[c[0] - u[0] * 3, H + 58.2, c[2] - u[1] * 3], [c[0] + u[0] * 3, H + 58.2, c[2] + u[1] * 3], [c[0] + u[0] * 3, H + 60.2, c[2] + u[1] * 3], [c[0] - u[0] * 3, H + 60.2, c[2] - u[1] * 3]], [nx, 0, nz]); }
  }
  // the crossing turret on the roof ridge
  ST.color('#7E786E').cyl([16, H + 50, cz], [16, H + 56, cz], 1.6, 1.4, 8, false); spireInto(CU, 16, cz, H + 56, H + 72, 1.7, 8);
  // the Old Royal Palace (Vladislav Hall's great roof) and St George's twin white towers behind to the right
  block(66, 116, -42, -12, H, H + 21, '#D6CCB4', { rh: 19, hip: true });
  block(120, 142, -62, -44, H, H + 17, '#C27A54', { rh: 6, win: false });
  for (const tz2 of [-48, -56]) { ST.color('#E6E0D2').box([146, H + 20, tz2], X, Y, 2.6, 20, 2.6, 8); spireInto(RF, 146, tz2, H + 40, H + 49, 3.4, 4, Math.PI / 4); }
  // ── materials + meshes
  const T = townTextures();
  const stuccoMap = (() => { const t = T.stucco.clone(); t.needsUpdate = true; t.repeat.set(1 / 3, 1 / 3); return t; })();
  const wallM = winMat({ cx: 3.4, cy: 3.55, wx0: 0.32, wx1: 0.68, wy0: 0.18, wy1: 0.74, y0: 0.9, lit: 1.5 }, { map: stuccoMap, roughness: 0.92 }, 'castle');
  const roofTex = masonryTex('castleroof', { size: 512, meters: 4, courseH: 0.3, blockL: [0.3, 0.5], tones: ['#5A4E48', '#4E4440', '#62564E', '#463E3A'], mortar: '#2A2422', seed: 71, bevel: 0.05, dirt: 0.4 });
  const roofM = texMat(roofTex, 4, { roughness: 0.82, snow: item.snow ? 0.3 : null, key: 'croof' });
  const copperM = mat({ color: 0x46695A, roughness: 0.62, metalness: 0.25, envMapIntensity: 0.7, snow: item.snow ? 0.55 : null }, 'ccopper');   // old verdigris, not a teal mirror
  const stoneTex = masonryTex('vitus', { size: 512, meters: 6, courseH: 0.5, blockL: [0.6, 1.2], tones: ['#9C968A', '#8E887E', '#A8A296', '#827C72'], mortar: '#5E5A52', seed: 73, dirt: 0.8 });
  const stoneM = texMat(stoneTex, 6, { vertexColors: true, roughness: 0.95, normal: 0.8, key: 'cstone' });
  const darkM = mat({ color: 0x0B0C10, roughness: 0.6, emissive: 0xFFB060, emissiveIntensity: 0, vertexColors: false });
  g.add(WL.mesh(wallM, 'castle:walls', { win: true }), RF.mesh(roofM, 'castle:roofs', { colors: false }), CU.mesh(copperM, 'castle:copper', { colors: false }), ST.mesh(stoneM, 'castle:stone'), DK.mesh(darkM, 'castle:openings', { colors: false, cast: false }));
  // ── the Lesser Town below: pale houses with red roofs down the slope and along the foot, St Nicholas' green dome
  if (item.lesser_town !== false) {
    const houses = [];
    for (let n = 0; n < 420; n++) {
      const x = (R() * 2 - 1) * 300, z = 70 + R() * 210, w = 9 + R() * 7, dd = 10 + R() * 5, h = 10 + R() * 8;
      if (Math.hypot(x + 40, z - 160) < 36) continue;
      houses.push([x, Math.max(-1, hill(x, z) - 1.5), z, w, h, dd, (R() - 0.5) * 0.25]);
    }
    const bx = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const pr = new THREE.BufferGeometry(); { const p = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, 0.5]; const ix = [0, 2, 1, 3, 5, 4, 0, 3, 4, 0, 4, 2, 1, 2, 4, 1, 4, 5, 0, 1, 5, 0, 5, 3]; pr.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); pr.setIndex(ix); }
    const prN = pr.toNonIndexed(); prN.computeVertexNormals();
    const wallI = new THREE.InstancedMesh(bx, houseWinMat(stuccoMap), houses.length);
    const roofI = new THREE.InstancedMesh(prN, mat({ color: 0xffffff, roughness: 0.8, snow: item.snow ? 0.3 : null }, 'mstrroof'), houses.length);
    const pal = ['#E8DFC8', '#E2D2B0', '#D8CCB8', '#ECE6D8', '#D6C2A0', '#E4D8C4', '#CFC6B4'], rpal = ['#8A4A34', '#7A4030', '#94523A', '#6E3A2C', '#5A4A44'];
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), Yv = new THREE.Vector3(0, 1, 0), cc = new THREE.Color();
    const litPts = [];
    houses.forEach(([x, y, z, w, h, dd, yaw], i) => {
      _q.setFromAxisAngle(Yv, yaw); _m.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(w, h, dd)); wallI.setMatrixAt(i, _m); wallI.setColorAt(i, cc.set(pal[i % pal.length]).multiplyScalar(0.8));
      _m.compose(new THREE.Vector3(x, y + h, z), _q, new THREE.Vector3(w + 0.8, 4 + R() * 3, dd + 0.8)); roofI.setMatrixAt(i, _m); roofI.setColorAt(i, cc.set(rpal[Math.floor(R() * rpal.length)]));
      const nl = 0; R(); // lit windows: the house shader (houseWinMat) now draws + lights them
      for (let q = 0; q < nl; q++) { const lx = (R() - 0.5) * (w - 3), ly = 3 + Math.floor(R() * (h / 3.4 - 1)) * 3.4; litPts.push([x + Math.cos(yaw) * lx + Math.sin(yaw) * (dd / 2 + 0.05), y + ly, z - Math.sin(yaw) * lx + Math.cos(yaw) * (dd / 2 + 0.05), yaw]); }
    });
    wallI.name = 'castle:lessertown'; roofI.name = 'castle:lessertown_roofs'; wallI.castShadow = roofI.castShadow = true; wallI.receiveShadow = roofI.receiveShadow = true;
    g.add(wallI, roofI);
    if (litPts.length) {
      const lm = new THREE.MeshBasicMaterial({ color: 0xFFB260 }); patchMaterial(lm);
      const li = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.6), lm, litPts.length); li.name = 'castle:lessertown_windows'; li.userData.noQA = true;
      litPts.forEach(([x, y, z, yaw], i) => { _q.setFromAxisAngle(Yv, yaw); _m.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(1, 1, 1)); li.setMatrixAt(i, _m); });
      g.add(li); g.userData.litWin = { mat: lm, n: litPts.length };
    }
    // St Nicholas (Lesser Town): baroque body, drum + green dome + lantern, and its bell tower
    const nb = new MB(), ncu = new MB(), sx = -40, sz = 160, sy = Math.max(-1, hill(sx, sz) - 1);
    nb.color('#D2C7AF').box([sx, sy + 12, sz], X, Y, 30, 13, 15, 8); roofInto(RF, sx - 30, sx + 30, sz - 15, sz + 15, sy + 25, sy + 33, true, 0.6);
    nb.cyl([sx + 6, sy + 25, sz], [sx + 6, sy + 35, sz], 10.5, 10.5, 20, false);
    latheInto(ncu, sx + 6, sz, sy + 35, [[11.2, 0], [11, 3], [9.8, 7], [7.6, 10.5], [4.6, 13.2], [2.2, 14.6], [0.01, 15]], 24);
    nb.cyl([sx + 6, sy + 49.5, sz], [sx + 6, sy + 55, sz], 2.0, 2.0, 10, false);
    latheInto(ncu, sx + 6, sz, sy + 55, [[2.4, 0], [2.1, 1.6], [1.2, 3.2], [0.2, 4.6], [0.05, 7]], 12);
    // the bell tower: a shaft, a cornice, the narrower belfry stage with dark arched openings, a cornice, the helmet
    { const bx2 = sx + 34, bz2 = sz - 8;
      nb.color('#CFC5AE').box([bx2, sy + 22, bz2], X, Y, 4.5, 22, 4.5, 8);
      nb.color('#DCD3BE').box([bx2, sy + 44.5, bz2], X, Y, 5.0, 0.6, 5.0, 0);
      nb.color('#CFC5AE').box([bx2, sy + 51, bz2], X, Y, 3.9, 6, 3.9, 8);
      nb.color('#DCD3BE').box([bx2, sy + 57.6, bz2], X, Y, 4.4, 0.6, 4.4, 0);
      for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cx = bx2 + nx * 3.93, cz = bz2 + nz * 3.93, ux = -nz, uz = nx, pts = [];
        for (const [a, y] of [[-1.1, sy + 47], [1.1, sy + 47]]) pts.push([cx + ux * a, y, cz + uz * a]);
        for (let q = 0; q <= 8; q++) { const an = q / 8 * Math.PI; pts.push([cx + ux * Math.cos(an) * 1.1, sy + 53.5 + Math.sin(an) * 1.1, cz + uz * Math.cos(an) * 1.1]); }
        nb.color('#16171B').poly(pts, [nx, 0, nz]);
        for (const yy of [sy + 30, sy + 38]) nb.color('#1C1D21').poly([[cx + ux * -0.6 + nx * 0.6, yy, cz + uz * -0.6 + nz * 0.6], [cx + ux * 0.6 + nx * 0.6, yy, cz + uz * 0.6 + nz * 0.6], [cx + ux * 0.6 + nx * 0.6, yy + 2.4, cz + uz * 0.6 + nz * 0.6], [cx + ux * -0.6 + nx * 0.6, yy + 2.4, cz + uz * -0.6 + nz * 0.6]], [nx, 0, nz]);
      }
      latheInto(ncu, bx2, bz2, sy + 58.2, [[4.6, 0], [4.3, 2], [3.0, 4], [2.4, 5.5], [2.8, 7], [2.0, 9], [0.8, 10.5], [0.05, 14]], 12); }
    const nbm = nb.mesh(mat({ vertexColors: true, roughness: 0.9, map: stuccoMap }), 'castle:stnicholas'); const ncm = ncu.mesh(copperM, 'castle:stnicholas_dome', { colors: false });
    g.add(nbm, ncm);
    // the rebuilt roof builder holds St Nicholas' roof too: rebuild that mesh
    const old = g.children.find((m) => m.name === 'castle:roofs'); if (old) { g.remove(old); old.geometry.dispose(); }
    g.add(RF.mesh(roofM, 'castle:roofs', { colors: false }));
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow ?? true; o.receiveShadow = true; } });
  g.updateMatrixWorld(true);
  const wp = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(g.matrixWorld);
  const anchors = { cathedral: wp(0, H + 40, cz), south_tower: wp(8.5, H + 78, cz + 14.5), spires: wp(-64.5, H + 75, cz), palace: wp(-10, H + 12, 10), front: wp(0, H, 14), hill_foot: wp(0, 2, 140), st_nicholas: wp(-34, 40, 160) };
  const litFrac = clamp(item.lit ?? 0.18, 0, 1), flood = clamp(item.floodlight ?? 0, 0, 1);
  return {
    root, radius: 340 * k, height: (H + 99) * k, anchors, footprint: [680 * k, 420 * k],
    update() {
      const L = LIGHTS(); PU.uPLights.value = L; PU.uPLitFrac.value = litFrac; PU.uPFlood.value = flood * L;
      darkM.emissiveIntensity = 0.06 * L;
      if (g.userData.litWin) g.userData.litWin.mat.color.setRGB(1.0 * 1.9 * L, 0.66 * 1.9 * L, 0.3 * 1.9 * L);
    },
  };
}

// ════════════════════════════════════ town.prague_1942 ═════════════════════════════════════════════════════════════
const PR_PAL = ['#D9BE84', '#E4D3A6', '#E7DFCB', '#BDB6A8', '#D7AE96', '#C8C9B0', '#DCD6C8', '#CFC0A0', '#E2C9A2', '#B9AE98', '#D3CBB8', '#C9B48C'];
const PR_STYLES = [['baroque', 0.3], ['neoren', 0.35], ['nouveau', 0.2], ['plain', 0.15]];
const pickW = (R, pairs) => { let s = 0; for (const [, w] of pairs) s += w; let x = R() * s; for (const [v, w] of pairs) { x -= w; if (x <= 0) return v; } return pairs[pairs.length - 1][0]; };
function shade(hex, k) { _c.set(hex); return [_c.r * k, _c.g * k, _c.b * k]; }

// one street house: a facade with real window recesses (reveals, surrounds, sills, hoods / pediments), a rusticated
// ground floor with shop windows, sign band and portal, string course, cornice, mansard with dormers, roof behind.
// F: frame (u along the facade, v into the block; facade plane at t = 0 facing -v). Glass goes to the instance lists.
function streetHouse(B, F, w, depth, gy, R, o) {
  const n = o.storeys, style = o.style, col = shade(o.color, 0.88), trim = o.trim, rus = shade(col, 0.82), dark = shade(col, 0.7);   // city grime: x0.88
  const g0 = gy, H1 = 4.6, FH = 3.5, Hc = g0 + H1 + (n - 1) * FH, y0 = gy - 1.2, rd = 0.24, hw = w / 2;
  const P = B.plaster, S = B.stone, D = B.dark, Wd = B.wood;
  // the body behind the facade (front face built piece by piece below)
  P.color(col).fbox(F, -hw, hw, y0, Hc, 0, depth, 32);
  // ── ground floor: rusticated band, shop windows + sign band, the portal
  S.color(rus).fbox(F, -hw, hw, y0, g0 + 0.5, -0.1, 0.02, 64);
  const shopN = w > 15 ? 3 : 2, door = R() < 0.5 ? -1 : 1, slot = w / (shopN + 1);
  const gfHoles = [];
  for (let k = 0; k < shopN + 1; k++) {
    const cx = -hw + slot * (k + 0.5);
    if ((door < 0 && k === 0) || (door > 0 && k === shopN)) { gfHoles.push([cx - 0.85, cx + 0.85, g0 + 0.5, g0 + 3.3, 'door']); continue; }
    gfHoles.push([cx - slot * 0.36, cx + slot * 0.36, g0 + 0.75, g0 + 3.15, 'shop']);
  }
  // front face pieces of the ground floor (from g0+0.5 to g0+H1): between and around the holes
  const face = (s0, s1, ya, yb, c = col) => { if (s1 - s0 > 0.01 && yb - ya > 0.01) P.color(c).poly([F.p(s0, ya, 0), F.p(s1, ya, 0), F.p(s1, yb, 0), F.p(s0, yb, 0)], [-F.v[0], 0, -F.v[1]]); };
  const holeRow = (holes, ya, yb, c) => {
    let s = -hw;
    for (const [a, b, h0, h1] of holes) { face(s, a, ya, yb, c); face(a, b, ya, Math.max(ya, h0), c); face(a, b, Math.min(yb, h1), yb, c); s = b; }
    face(s, hw, ya, yb, c);
  };
  holeRow(gfHoles.map(([a, b, h0, h1]) => [a, b, Math.max(g0 + 0.5, h0), h1]), g0 + 0.5, g0 + H1 - 0.35, rus);
  for (let yy = g0 + 1.1; yy < g0 + H1 - 0.5; yy += 0.62) S.color(shade(col, 0.74)).fbox(F, -hw, hw, yy, yy + 0.04, -0.012, 0.0, 0);     // rustication joints
  const reveal = (a, b, h0, h1, depthR, c) => {
    const M = P.color(c);
    M.poly([F.p(a, h0, 0), F.p(a, h1, 0), F.p(a, h1, depthR), F.p(a, h0, depthR)], [F.u[0], 0, F.u[1]]);
    M.poly([F.p(b, h0, 0), F.p(b, h0, depthR), F.p(b, h1, depthR), F.p(b, h1, 0)], [-F.u[0], 0, -F.u[1]]);
    M.poly([F.p(a, h1, 0), F.p(b, h1, 0), F.p(b, h1, depthR), F.p(a, h1, depthR)], [0, -1, 0]);
    M.poly([F.p(a, h0, 0), F.p(a, h0, depthR), F.p(b, h0, depthR), F.p(b, h0, 0)], [0, 1, 0]);
  };
  for (const [a, b, h0, h1, kind] of gfHoles) {
    reveal(a, b, Math.max(g0 + 0.5, h0), h1, kind === 'door' ? 0.45 : 0.3, rus);
    if (kind === 'shop') {
      o.glass.push({ F, s: (a + b) / 2, y: (h0 + h1) / 2, t: 0.3, w: b - a, h: h1 - h0, shop: true });
      Wd.color(o.sign).fbox(F, a - 0.15, b + 0.15, h1 + 0.12, h1 + 0.72, -0.12, 0.01, 0);               // the sign board
      Wd.color(shade('#3A2A20', 1)).fbox(F, a, b, h0 - 0.1, h0 + 0.02, 0.0, 0.32, 0);
      Wd.fbox(F, (a + b) / 2 - 0.04, (a + b) / 2 + 0.04, h0, h1, 0.26, 0.31, 0);                         // mullion
    } else {
      D.color('#2B2119').fbox(F, a, b, h0, h1, 0.42, 0.47, 0);
      S.color(trim).fbox(F, a - 0.3, a, g0 + 0.15, h1 + 0.3, -0.12, 0.02, 0); S.fbox(F, b, b + 0.3, g0 + 0.15, h1 + 0.3, -0.12, 0.02, 0); S.fbox(F, a - 0.3, b + 0.3, h1, h1 + 0.35, -0.14, 0.02, 0);
    }
  }
  S.color(trim).fbox(F, -hw - 0.02, hw + 0.02, g0 + H1 - 0.35, g0 + H1, -0.2, 0.02, 0);                   // string course
  // ── upper floors: window columns, piers, surrounds, sills, hoods / pediments, pilasters
  const cols = Math.max(2, Math.floor((w - 1.4) / 2.75)), pitch = w / cols;
  const wx = 1.12, pil = style === 'neoren' || style === 'baroque';
  for (let f = 1; f < n; f++) {
    const ya = g0 + H1 + (f - 1) * FH, yb = ya + FH, noble = f === 1, wh = noble ? 2.15 : f === n - 1 ? 1.65 : 1.9, wb = ya + (noble ? 0.75 : 0.85);
    const holes = []; for (let k = 0; k < cols; k++) { const cx = -hw + pitch * (k + 0.5); holes.push([cx - wx / 2, cx + wx / 2, wb, wb + wh]); }
    holeRow(holes, ya, yb, col);
    for (const [a, b, h0, h1] of holes) {
      reveal(a, b, h0, h1, rd, shade(col, 0.9));
      o.glass.push({ F, s: (a + b) / 2, y: (h0 + h1) / 2, t: rd, w: b - a, h: h1 - h0 });
      Wd.color('#E9E4D8').fbox(F, (a + b) / 2 - 0.035, (a + b) / 2 + 0.035, h0, h1, rd - 0.05, rd - 0.01, 0);  // casement bars
      Wd.fbox(F, a, b, h0 + (h1 - h0) * 0.68, h0 + (h1 - h0) * 0.68 + 0.06, rd - 0.05, rd - 0.01, 0);
      // surround (frame), sill, hood / pediment
      const fw = 0.16, T = P.color(trim);
      if (style !== 'plain') {
        T.fbox(F, a - fw, a, h0 - 0.02, h1 + fw, -0.06, 0.0, 32 | 1);
        T.fbox(F, b, b + fw, h0 - 0.02, h1 + fw, -0.06, 0.0, 32 | 2);
        T.fbox(F, a, b, h1, h1 + fw, -0.06, 0.0, 32);
      }
      S.color(trim).fbox(F, a - 0.22, b + 0.22, h0 - 0.12, h0 + 0.0, -0.16, 0.02, 0);
      if (noble && style !== 'plain') {
        if (style === 'neoren' || (style === 'baroque' && R() < 0.5)) {        // triangular pediment
          const pa = a - 0.3, pb = b + 0.3, py = h1 + fw + 0.08, pt = py + 0.55, M = P.color(trim);
          M.poly([F.p(pa, py, -0.2), F.p(pb, py, -0.2), F.p((pa + pb) / 2, pt, -0.2)], [-F.v[0], 0, -F.v[1]]);
          M.poly([F.p(pa, py, -0.2), F.p((pa + pb) / 2, pt, -0.2), F.p((pa + pb) / 2, pt, 0), F.p(pa, py, 0)], [-F.u[0] * 0.5, 1, -F.u[1] * 0.5]);
          M.poly([F.p(pb, py, -0.2), F.p(pb, py, 0), F.p((pa + pb) / 2, pt, 0), F.p((pa + pb) / 2, pt, -0.2)], [F.u[0] * 0.5, 1, F.u[1] * 0.5]);
          M.fbox(F, pa, pb, py - 0.1, py, -0.22, 0, 0);
        } else S.color(trim).fbox(F, a - 0.32, b + 0.32, h1 + fw, h1 + fw + 0.2, -0.24, 0.0, 0);          // straight hood
      } else if (style === 'nouveau' && f === n - 1) {
        const M = P.color(trim), cxw = (a + b) / 2, ys = h1 + 0.05; const pts = []; for (let q = 0; q <= 8; q++) { const an = q / 8 * Math.PI; pts.push(F.p(cxw + Math.cos(an) * (wx / 2 + fw), ys + Math.sin(an) * 0.5, -0.05)); }
        M.poly(pts, [-F.v[0], 0, -F.v[1]]);
      } else if (style !== 'plain') S.color(trim).fbox(F, a - 0.2, b + 0.2, h1 + fw, h1 + fw + 0.12, -0.14, 0.0, 0);
    }
    if (pil && f >= 1) for (let k = 0; k <= cols; k++) { const px = -hw + pitch * k; P.color(shade(col, 1.05)).fbox(F, px - 0.25, px + 0.25, ya + 0.05, yb - 0.05, -0.09, 0.0, 32); }
    if (f < n - 1) S.color(trim).fbox(F, -hw, hw, yb - 0.08, yb + 0.06, -0.07, 0.0, 0);
  }
  // ── main cornice (stepped), mansard with dormers, the roof behind
  const Cc = P.color(trim);
  Cc.fbox(F, -hw, hw, Hc - 0.55, Hc - 0.3, -0.18, 0.02, 0); Cc.fbox(F, -hw, hw, Hc - 0.3, Hc - 0.05, -0.42, 0.02, 0); Cc.fbox(F, -hw, hw, Hc - 0.05, Hc + 0.18, -0.68, 0.02, 0);
  for (let k = 0; k < Math.floor(w / 0.9); k++) { const sx = -hw + 0.45 + k * 0.9; Cc.fbox(F, sx - 0.09, sx + 0.09, Hc - 0.3, Hc - 0.05, -0.55, -0.4, 0); }        // modillions
  const M2 = B.roof, mh = 3.4, mt = 1.25, top = Hc + 0.18 + mh, ridgeT = Math.min(depth * 0.5, 7), ridgeY = top + 1.6;
  if (style === 'nouveau' && o.gable) {                     // a curved gable rising over the cornice, oculus in it
    const gw = Math.min(w * 0.55, 8), pts = [F.p(-gw / 2, Hc + 0.18, -0.02), F.p(gw / 2, Hc + 0.18, -0.02)];
    for (let q = 0; q <= 12; q++) { const an = q / 12 * Math.PI; pts.push(F.p(Math.cos(an) * gw / 2, Hc + 0.18 + 2.0 + Math.sin(an) * 2.2 * (0.7 + 0.3 * Math.sin(an)), -0.02)); }
    P.color(col).poly(pts, [-F.v[0], 0, -F.v[1]]);
    const oc = []; for (let q = 0; q < 12; q++) { const an = q / 12 * TAU; oc.push(F.p(Math.cos(an) * 0.55, Hc + 2.6 + Math.sin(an) * 0.55, -0.04)); } D.color('#0E1014').poly(oc, [-F.v[0], 0, -F.v[1]]);
    P.color(col).fbox(F, -gw / 2, gw / 2, Hc + 0.18, Hc + 4.2, -0.02, 1.0, 32 | 4);
  }
  M2.poly([F.p(-hw, Hc + 0.18, -0.1), F.p(hw, Hc + 0.18, -0.1), F.p(hw, top, mt), F.p(-hw, top, mt)], [-F.v[0], 0.4, -F.v[1]]);
  M2.poly([F.p(-hw, top, mt), F.p(hw, top, mt), F.p(hw, ridgeY, ridgeT), F.p(-hw, ridgeY, ridgeT)], [-F.v[0], 1.5, -F.v[1]]);
  M2.poly([F.p(-hw, ridgeY, ridgeT), F.p(hw, ridgeY, ridgeT), F.p(hw, Hc, depth), F.p(-hw, Hc, depth)], [F.v[0], 1.0, F.v[1]]);
  for (const sx of [-hw, hw]) M2.poly([F.p(sx, Hc + 0.18, -0.1), F.p(sx, top, mt), F.p(sx, ridgeY, ridgeT), F.p(sx, Hc, depth)], [sx < 0 ? -F.u[0] : F.u[0], 0, sx < 0 ? -F.u[1] : F.u[1]]);
  const nd = Math.max(1, Math.floor(w / 4.5));
  for (let k = 0; k < nd; k++) {                            // dormers on the mansard
    const cx = -hw + (k + 0.5) * w / nd, dw = 0.75, yb = Hc + 0.9, yt = yb + 1.5, tf = 0.35;
    P.color(trim).fbox(F, cx - dw, cx + dw, yb, yt, tf - 0.25, tf + 0.9, 0);
    o.glass.push({ F, s: cx, y: (yb + yt) / 2 - 0.05, t: tf - 0.27, w: dw * 1.3, h: 1.1, dormer: true });
    M2.poly([F.p(cx - dw - 0.12, yt, tf - 0.3), F.p(cx + dw + 0.12, yt, tf - 0.3), F.p(cx, yt + 0.7, tf - 0.3)], [-F.v[0], 0, -F.v[1]]);
    M2.poly([F.p(cx - dw - 0.12, yt, tf - 0.3), F.p(cx, yt + 0.7, tf - 0.3), F.p(cx, yt + 0.7, tf + 1.0), F.p(cx - dw - 0.12, yt, tf + 1.0)], [-F.u[0], 1, -F.u[1]]);
    M2.poly([F.p(cx + dw + 0.12, yt, tf - 0.3), F.p(cx + dw + 0.12, yt, tf + 1.0), F.p(cx, yt + 0.7, tf + 1.0), F.p(cx, yt + 0.7, tf - 0.3)], [F.u[0], 1, F.u[1]]);
  }
  if (R() < 0.6) { const cx = (R() - 0.5) * w * 0.7; S.color('#6E5E52').fbox(F, cx - 0.4, cx + 0.4, ridgeY - 1.2, ridgeY + 1.1, ridgeT - 0.4, ridgeT + 0.5, 0); }   // chimney
  // balcony on the piano nobile (some houses): slab + iron railing bars
  if (o.balcony && n >= 4) {
    const ya = g0 + H1 + 0.62, bw2 = Math.min(3.4, pitch * 1.3);
    S.color(trim).fbox(F, -bw2 / 2, bw2 / 2, ya - 0.18, ya, -1.1, 0, 0);
    for (let q = 0; q <= Math.round(bw2 / 0.12); q++) B.iron.fbox(F, -bw2 / 2 + q * 0.12 - 0.012, -bw2 / 2 + q * 0.12 + 0.012, ya, ya + 1.0, -1.06, -1.04, 0);
    B.iron.fbox(F, -bw2 / 2, bw2 / 2, ya + 0.98, ya + 1.04, -1.1, -1.0, 0);
  }
  return { top: ridgeY, cornice: Hc };
}
// the street lamp (Prague cast-iron candelabra, one lantern): post + lantern geometry (origin at the foot)
let LAMPGEO = null;
function lampGeos() {
  if (LAMPGEO) return LAMPGEO;
  const P = new MB(), Gs = new MB();
  P.cyl([0, -0.2, 0], [0, 0.65, 0], 0.2, 0.15, 10, true); P.cyl([0, 0.65, 0], [0, 0.8, 0], 0.17, 0.11, 10, true);
  P.cyl([0, 0.8, 0], [0, 3.55, 0], 0.075, 0.055, 8, false); P.cyl([0, 1.4, 0], [0, 1.55, 0], 0.1, 0.1, 8, true);
  P.cyl([0, 3.55, 0], [0, 3.7, 0], 0.12, 0.16, 8, true); for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) P.cyl([0, 3.5, 0], [x * 0.24, 3.66, z * 0.24], 0.02, 0.02, 4, false);
  Gs.cyl([0, 3.72, 0], [0, 4.3, 0], 0.18, 0.27, 6, false);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; P.cyl([Math.cos(a) * 0.18, 3.72, Math.sin(a) * 0.18], [Math.cos(a) * 0.27, 4.3, Math.sin(a) * 0.27], 0.012, 0.012, 3, false); }
  P.cyl([0, 4.3, 0], [0, 4.62, 0], 0.33, 0.05, 6, true); P.cyl([0, 4.62, 0], [0, 4.8, 0], 0.025, 0.01, 5, false);
  return (LAMPGEO = { post: P.geo({ colors: false }), glass: Gs.geo({ colors: false }) });
}
function pragueStreet(kind, item, ctx) {
  const G = ground(ctx), R = rngFor(ctx, (item.seed ?? 19) * 71 + 3), warn = warnOf(ctx);
  const pre = item.preset === 'holesovice' || item.bend === 'holesovice' ? { bend: 105, bend_r: 30, storeys: [3, 5], inner: 'railing', trees: 1, length: 190 } : {};
  const at = xz(item.at), hdg = (item.heading ?? 90) * DEG;
  const d = [Math.sin(hdg), -Math.cos(hdg)], r = [Math.cos(hdg), Math.sin(hdg)];
  const L = clamp(+(item.length ?? pre.length ?? 200), 60, 600), tram = item.tram !== false;
  const W = clamp(+(item.width ?? (tram ? 11.5 : 9)), 6, 24), PW = clamp(+(item.pavement ?? 3.8), 2, 8);
  const bend = clamp(+(typeof item.bend === 'number' ? item.bend : pre.bend ?? 0), -150, 150) * DEG;
  const bendR = Math.max(W / 2 + PW + 8, +(item.bend_r ?? pre.bend_r ?? 40));
  const storeys = Array.isArray(item.storeys) ? item.storeys.map((v) => clamp(Math.round(v), 2, 8)) : (pre.storeys ?? [4, 6]);
  const snow = clamp(item.snow ?? ctx.weather?.snow ?? 0, 0, 1.2), wet = clamp(item.wet ?? (ctx.weather?.rain ? 0.8 : 0), 0, 1);
  // centre line in local (x forward, z right), sampled every metre; the bend sits in the middle
  const arcL = Math.abs(bend) * bendR, straight = Math.max(0, (L - arcL) / 2), C0 = [];
  { let x = -L / 2, z = 0, yaw = 0; const step = 1; C0.push([x, z]);
    for (let s = step; s <= L + 1e-6; s += step) {
      if (s > straight && s <= straight + arcL && arcL > 0) yaw += (bend / arcL) * step;
      x += Math.cos(yaw) * step; z += Math.sin(yaw) * step; C0.push([x, z]);
    } }
  // centre the bend's chord on `at`
  { const m = C0[Math.round(C0.length / 2)]; for (const p of C0) { p[0] -= m[0] * (arcL > 0 ? 1 : 0); p[1] -= m[1] * (arcL > 0 ? 1 : 0); } }
  const Wd = ([x, z]) => [at[0] + d[0] * x + r[0] * z, at[1] + d[1] * x + r[1] * z];
  const C = C0.map(Wd), CL = sampleLine(C);
  const root = new THREE.Group(); root.name = kind;
  const surfY = (x, z) => G.h(x, z);
  // ── street surface: carriageway (setts), gutters, kerbs, pavements (slabs)
  const setts = settsTex(), slabs = slabsTex();
  const roadM = texMat(setts, 2.2, { roughness: lerp(0.86, 0.32, wet), color: new THREE.Color(1, 1, 1).multiplyScalar(lerp(1, 0.62, wet)), normal: 1.0, snow: snow > 0 ? 0.3 : null, key: 'pstreet', roughMap: false });
  roadM.polygonOffset = true; roadM.polygonOffsetFactor = -1; roadM.polygonOffsetUnits = -1;
  const paveM = texMat(slabs, 2.0, { roughness: lerp(0.8, 0.4, wet), color: new THREE.Color(1, 1, 1).multiplyScalar(lerp(1, 0.7, wet)), normal: 0.6, snow: snow > 0 ? 0.3 : null, key: 'ppave', roughMap: false });
  const kerbM = mat({ color: 0x8A8680, roughness: 0.7, snow: snow > 0 ? 0.3 : null }, 'pkerb');
  const addRib = (g, m, name) => { const o = new THREE.Mesh(g, m); o.name = name; o.receiveShadow = true; o.userData.noQA = true; root.add(o); return o; };
  addRib(ribbon(G, C, W, { y: 0.05, cols: 6, crown: 0.06, step: 1.5 }), roadM, 'road:setts');
  for (const s of [1, -1]) {
    const kerbOff = s * (W / 2 + 0.15);
    addRib(ribbon(G, C, 0.3, { offset: kerbOff, y: 0.2, cols: 1, step: 1.5 }), kerbM, 'road:kerb');
    // the kerb face: a vertical strip from the gutter to the kerb top
    { const Lk = offsetLine(C, s * W / 2), pos = [], idx = [];
      Lk.forEach(([x, z], i) => { const gy = surfY(x, z); pos.push(x, gy + 0.04, z, x, gy + 0.2, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(s < 0 ? idx : idx.map((v, i) => (i % 3 === 1 ? idx[i + 1] : i % 3 === 2 ? idx[i - 1] : v)));   // the face looks at the road
      g.computeVertexNormals();
      addRib(g, kerbM, 'road:kerbface'); }
    addRib(ribbon(G, C, PW, { offset: s * (W / 2 + 0.3 + PW / 2), y: 0.21, cols: 2, step: 1.5 }), paveM, 'road:pavement');
  }
  // ── tram tracks: two tracks, steel rails with a dark groove, and the overhead contact wires on span wires
  const trackOff = [1.55, -1.55];
  if (tram) {
    const railM = mat({ color: 0x9A9EA2, roughness: 0.28, metalness: 0.95, envMapIntensity: 1.3, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }, 'prail');
    const grooveM = mat({ color: 0x141416, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'pgroove');
    for (const to of trackOff) for (const rs of [-0.7175, 0.7175]) {
      addRib(ribbon(G, C, 0.075, { offset: to + rs, y: 0.072, cols: 1, step: 1.5, crown: 0 }), railM, 'road:rail');
      addRib(ribbon(G, C, 0.045, { offset: to + rs + Math.sign(rs) * -0.06, y: 0.068, cols: 1, step: 1.5 }), grooveM, 'road:groove');
    }
  }
  // ── houses on both sides (cross streets leave gaps; on the inside of a holesovice bend: a railing and trees)
  const B = { plaster: new MB(), stone: new MB(), dark: new MB(), wood: new MB(), roof: new MB(), iron: new MB() };
  const glass = [], facadeLines = {}, houses = [];
  const crossAt = (Array.isArray(item.cross) ? item.cross : [...Array(Math.max(0, Math.round(item.cross ?? (L > 140 ? 2 : 1))))].map((_, k, a) => (k + 1) / (a.length + 1))).map((f) => f * CL.L);
  const inner = item.inner ?? pre.inner ?? 'houses';
  for (const side of [1, -1]) {
    const off = side * (W / 2 + 0.3 + PW), line = offsetLine(C, off), FL = sampleLine(side > 0 ? line : line.slice().reverse());
    facadeLines[side] = line;
    let s = 0;
    const toCentreS = (sl) => (side > 0 ? sl : FL.L - sl) * (CL.L / FL.L);
    while (s < FL.L - 4) {
      const w = 10 + R() * 8.5, sc = toCentreS(s + w / 2);
      if (crossAt.some((c) => Math.abs(c - sc) < 9)) { s += 3; continue; }
      const innerSide = bend !== 0 && Math.sign(bend) === side;
      const inBend = arcL > 0 && sc > straight - 6 && sc < straight + arcL + 6;
      if (innerSide && inBend && inner === 'railing') { s += 3; continue; }
      const a = FL.at(s), b = FL.at(Math.min(FL.L, s + w)), ux = b[0] - a[0], uz = b[1] - a[1], lw = Math.hypot(ux, uz);
      if (lw < 6) { s += w; continue; }
      const F = frameOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, ux / lw, uz / lw);
      const gy = Math.min(surfY(a[0], a[1]), surfY(b[0], b[1])) + 0.21;
      const style = pickW(R, PR_STYLES), color = PR_PAL[Math.floor(R() * PR_PAL.length)];
      const trim = style === 'plain' ? shade(color, 1.0) : (R() < 0.6 ? shade(color, 1.12) : shade('#EEE8DA', 1));
      const sign = ['#2E3A30', '#4A2622', '#2A2E3A', '#3A2E22', '#1E1E1E'][Math.floor(R() * 5)];
      const n = storeys[0] + Math.floor(R() * (storeys[1] - storeys[0] + 1));
      const hs = streetHouse(B, F, lw + 0.04, 13 + R() * 3, gy, R, { storeys: n, style, color, trim, sign, glass, gable: R() < 0.6, balcony: R() < 0.3 });
      houses.push({ F, w: lw, gy, top: hs.top, side, s: sc });
      s += w;
    }
  }
  // the vistas are closed: beyond each end a cross street (setts + the far pavement) and a row of houses facing back up
  // the street, so an eye-level shot down the canyon ends in facades, not in the void of the empty world
  const ends = [];
  if (item.close !== false) for (const end of [0, 1]) {
    const p = end ? C[C.length - 1] : C[0], dd = CL.dir(end ? CL.L : 0), sg = end ? 1 : -1, o = [dd[0] * sg, dd[1] * sg], u = [o[1], -o[0]];
    const crossW = 11, half = W / 2 + PW + 34, faceD = crossW + PW + 0.3;
    const at2 = (a, b) => [p[0] + o[0] * a + u[0] * b, p[1] + o[1] * a + u[1] * b];
    addRib(ribbon(G, [at2(crossW / 2, -half), at2(crossW / 2, half)], crossW, { y: 0.05, cols: 4, crown: 0.05, step: 1.5 }), roadM, 'road:setts');
    addRib(ribbon(G, [at2(crossW + PW / 2, -half), at2(crossW + PW / 2, half)], PW, { y: 0.21, cols: 2, step: 1.5 }), paveM, 'road:pavement');
    addRib(ribbon(G, [at2(crossW + 0.15, -half), at2(crossW + 0.15, half)], 0.3, { y: 0.2, cols: 1, step: 1.5 }), kerbM, 'road:kerb');
    let sx = -half;
    while (sx < half - 5) {
      const w = Math.min(10 + R() * 8, half - sx), a = at2(faceD, sx), b = at2(faceD, sx + w);
      const F = frameOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, u[0], u[1]);
      const gy = Math.min(surfY(a[0], a[1]), surfY(b[0], b[1])) + 0.21;
      const style = pickW(R, PR_STYLES), color = PR_PAL[Math.floor(R() * PR_PAL.length)];
      const trim = style === 'plain' ? shade(color, 1.0) : (R() < 0.6 ? shade(color, 1.12) : shade('#EEE8DA', 1));
      const sign = ['#2E3A30', '#4A2622', '#2A2E3A', '#3A2E22', '#1E1E1E'][Math.floor(R() * 5)];
      const n = storeys[0] + Math.floor(R() * (storeys[1] - storeys[0] + 1));
      streetHouse(B, F, w + 0.04, 13 + R() * 3, gy, R, { storeys: n, style, color, trim, sign, glass, gable: R() < 0.6, balcony: R() < 0.3 });
      sx += w;
    }
    ends.push(at2(faceD, 0));
  }
  // railing + trees along the inside of the bend (the attack curve: iron railing on stone posts with ball finials)
  const trees = [];
  if (arcL > 0 && inner === 'railing') {
    const side = Math.sign(bend), line = offsetLine(C, side * (W / 2 + 0.3 + PW - 0.4)), FL = sampleLine(line);
    const s0 = Math.max(0, straight - 8) * FL.L / CL.L, s1 = Math.min(FL.L, (straight + arcL + 8) * FL.L / CL.L);
    for (let s = s0; s <= s1; s += 2.4) {
      const p = FL.at(s), gy = surfY(p[0], p[1]) + 0.21, dd = FL.dir(s);
      B.stone.color('#8C877E').box([p[0], gy + 0.55, p[1]], [dd[0], 0, dd[1]], [0, 1, 0], 0.22, 0.65, 0.22, 0);
      B.stone.cyl([p[0], gy + 1.2, p[1]], [p[0], gy + 1.42, p[1]], 0.14, 0.02, 8, false);
      if (s + 2.4 <= s1) { const q = FL.at(s + 2.4), mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, ln = Math.hypot(q[0] - p[0], q[1] - p[1]);
        B.iron.box([mx, gy + 1.02, mz], [dd[0], 0, dd[1]], [0, 1, 0], ln / 2 - 0.2, 0.025, 0.025, 0); B.iron.box([mx, gy + 0.25, mz], [dd[0], 0, dd[1]], [0, 1, 0], ln / 2 - 0.2, 0.025, 0.025, 0);
        for (let q2 = 1; q2 < 12; q2++) { const f = q2 / 12, x = lerp(p[0], q[0], f), z = lerp(p[1], q[1], f); B.iron.box([x, gy + 0.64, z], [dd[0], 0, dd[1]], [0, 1, 0], 0.012, 0.42, 0.012, 0); } }
      if (Math.round(s / 2.4) % 4 === 0) { const nb = [-dd[1] * side, dd[0] * side]; const tx = p[0] + nb[0] * 3.5, tz = p[1] + nb[1] * 3.5; trees.push([tx, surfY(tx, tz), tz, 1.15]); }
    }
  }
  if ((item.trees ?? pre.trees ?? 0) > 0 && !trees.length) for (const side of [1, -1]) { const line = offsetLine(C, side * (W / 2 + 1.4)), FL = sampleLine(line); for (let s = 8; s < FL.L - 6; s += 14) { const p = FL.at(s); trees.push([p[0], surfY(p[0], p[1]), p[1], 0.95]); } }
  // ── materials + facade meshes
  const T = townTextures();
  const stuccoMap = (() => { const t = T.stucco.clone(); t.needsUpdate = true; t.repeat.set(1 / 2.5, 1 / 2.5); return t; })();
  const plasterM = mat({ map: stuccoMap, vertexColors: true, roughness: 0.92, snow: snow > 0 ? 0.55 : null }, 'pplaster');
  const stoneTex = masonryTex('prstone', { size: 512, meters: 4, courseH: 0.62, blockL: [0.7, 1.4], tones: ['#FFFFFF', '#F2F0EC', '#E6E4E0', '#F8F6F2'], mortar: '#9A968E', seed: 81, dirt: 0.5 });
  const stoneM = texMat(stoneTex, 4, { vertexColors: true, roughness: 0.9, normal: 0.7, snow: snow > 0 ? 0.5 : null, key: 'pstone' });
  const roofTex = masonryTex('prroof', { size: 512, meters: 3, courseH: 0.2, blockL: [0.25, 0.4], tones: ['#4C4E52', '#424448', '#56585C', '#3E4044'], mortar: '#222326', seed: 83, bevel: 0.05, dirt: 0.35 });
  const roofM = texMat(roofTex, 3, { roughness: 0.75, normal: 0.8, snow: snow > 0 ? 0.28 : null, key: 'proof' });
  const woodM = mat({ vertexColors: true, roughness: 0.6 }, 'pwood'), darkM = mat({ vertexColors: true, roughness: 0.8 }, 'pdark');
  const ironM = mat({ color: 0x15171A, roughness: 0.45, metalness: 0.7, vertexColors: false }, 'piron');
  const meshOf = (mb, m, name, o) => { if (!mb.empty) root.add(mb.mesh(m, name, o)); };
  meshOf(B.plaster, plasterM, 'prague:plaster'); meshOf(B.stone, stoneM, 'prague:stone'); meshOf(B.roof, roofM, 'prague:roofs', { colors: false });
  meshOf(B.wood, woodM, 'prague:joinery'); meshOf(B.dark, darkM, 'prague:dark'); meshOf(B.iron, ironM, 'prague:iron', { colors: false });
  // ── glass: dark reflective panes + lit panes (instanced; lit chosen per window by the seed)
  const litFrac = clamp(item.lit ?? 0.15, 0, 1), shopLit = clamp(item.shops_lit ?? 0.1, 0, 1);
  const darkGlass = [], litGlass = [];
  glass.forEach((gq, i) => { const hit = hashN(i, (item.seed ?? 19), 13); (hit < (gq.shop ? shopLit : litFrac) ? litGlass : darkGlass).push(gq); });
  const pane = new THREE.PlaneGeometry(1, 1);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), cc = new THREE.Color();
  const place = (im, list, warm) => list.forEach((gq, i) => {
    const p = gq.F.p(gq.s, gq.y, gq.t - 0.005), yaw = Math.atan2(-gq.F.v[0], -gq.F.v[1]);
    _e.set(0, yaw, 0); _q.setFromEuler(_e); _m.compose(new THREE.Vector3(p[0], p[1], p[2]), _q, new THREE.Vector3(gq.w, gq.h, 1)); im.setMatrixAt(i, _m);
    if (warm) im.setColorAt(i, cc.setRGB(1, 0.55 + 0.25 * hashN(i, 3), 0.22 + 0.2 * hashN(i, 5)).multiplyScalar(gq.shop ? 1.1 : 0.55 + 0.45 * hashN(i, 7)));
  });
  const dgM = mat({ color: 0x3A4044, roughness: 0.14, metalness: 0.2, envMapIntensity: 1.4 }, 'pglass');   // panes with a hint of the room behind (not black holes)
  const darkWin = darkGlass.filter((g2) => !g2.shop), darkShop = darkGlass.filter((g2) => g2.shop);
  const dg = new THREE.InstancedMesh(pane, dgM, Math.max(1, darkWin.length)); dg.count = darkWin.length; place(dg, darkWin, false); dg.name = 'prague:glass'; dg.receiveShadow = true; dg.userData.noQA = true; root.add(dg);
  // shop windows: big panes with the dim shop behind them (displays, a counter) -- a lighter, warmer, rougher glass,
  // so a ground floor reads as shops and not as a row of black panels
  const sgM = mat({ color: 0x5A534A, roughness: 0.22, metalness: 0.1, envMapIntensity: 1.1, emissive: 0x2A2016, emissiveIntensity: 0.25 }, 'pshopglass');
  const sg = new THREE.InstancedMesh(pane, sgM, Math.max(1, darkShop.length)); sg.count = darkShop.length; place(sg, darkShop, false); sg.name = 'prague:shopglass'; sg.receiveShadow = true; sg.userData.noQA = true; root.add(sg);
  const lgM = new THREE.MeshBasicMaterial({ color: 0xffffff }); patchMaterial(lgM);
  const lg = new THREE.InstancedMesh(pane, lgM, Math.max(1, litGlass.length)); lg.count = litGlass.length; place(lg, litGlass, true); lg.name = 'prague:litglass'; lg.userData.noQA = true; root.add(lg);
  // ── overhead wires: contact wire over each track (5.6 m), span wires every 30 m between rosettes on the facades
  if (tram && item.wires !== false) {
    const segs = [];
    const spanS = []; for (let s = 6; s < CL.L - 3; s += 30) spanS.push(s);
    for (const to of trackOff) {
      const line = offsetLine(C, to);
      for (let i = 0; i < line.length - 1; i += 2) {
        const j = Math.min(line.length - 1, i + 2), si = i * CL.L / (C.length - 1), sj = j * CL.L / (C.length - 1);
        const sag = (s) => { const k = spanS.reduce((m, q) => Math.min(m, Math.abs(q - s)), 1e9); return 0.22 * (1 - Math.min(1, k / 15) ** 2) * 0 + 0.22 * Math.min(1, k / 15) ** 2; };
        const a = line[i], b = line[j]; segs.push(a[0], surfY(a[0], a[1]) + 5.65 - sag(si), a[1], b[0], surfY(b[0], b[1]) + 5.65 - sag(sj), b[1]);
      }
    }
    for (const s of spanS) {
      const c = CL.at(s), dd = CL.dir(s), nrm = [-dd[1], dd[0]], half = W / 2 + 0.3 + PW, gy = surfY(c[0], c[1]);
      const pts = []; for (let q = 0; q <= 10; q++) { const u = lerp(-half, half, q / 10), sagY = 6.6 - 0.75 * (1 - (u / half) ** 2); pts.push([c[0] + nrm[0] * u, gy + sagY, c[1] + nrm[1] * u]); }
      for (let q = 0; q < pts.length - 1; q++) segs.push(...pts[q], ...pts[q + 1]);
      for (const sd of [-1, 1]) B.iron.cyl([c[0] + nrm[0] * sd * half, gy + 6.6, c[1] + nrm[1] * sd * half], [c[0] + nrm[0] * sd * (half + 0.12), gy + 6.6, c[1] + nrm[1] * sd * (half + 0.12)], 0.12, 0.12, 8, true);
    }
    const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    const lmat = new THREE.LineBasicMaterial({ color: 0x16181C }); patchMaterial(lmat);
    const wires = new THREE.LineSegments(lgeo, lmat); wires.name = 'prague:wires'; wires.userData.noQA = true; wires.frustumCulled = false; root.add(wires);
  }
  // ── gas lamps along the kerbs (alternating sides), their glow and light pools; a few real lights near the middle
  const lamps = [];
  if (item.lamps !== false) for (let s = 10, k = 0; s < CL.L - 5; s += 26, k++) {
    const side = k % 2 ? 1 : -1, c = CL.at(s), dd = CL.dir(s), off = side * (W / 2 + 0.75), x = c[0] - dd[1] * off, z = c[1] + dd[0] * off;
    if (crossAt.some((q) => Math.abs(q - s) < 7)) continue;
    lamps.push([x, surfY(x, z) + 0.2, z, s]);
  }
  const lampLevel = item.lamps === 'dim' ? 0.35 : 1;
  let lampGlassM = null, poolM = null, lampLights = [];
  if (lamps.length) {
    const LG = lampGeos();
    const postI = new THREE.InstancedMesh(LG.post, mat({ color: 0x1A1D1F, roughness: 0.5, metalness: 0.6, snow: snow > 0 ? 0.5 : null }, 'plamp'), lamps.length); postI.name = 'prague:lamps'; postI.castShadow = true;
    lampGlassM = new THREE.MeshBasicMaterial({ color: 0x302820 }); patchMaterial(lampGlassM);
    const glI = new THREE.InstancedMesh(LG.glass, lampGlassM, lamps.length); glI.name = 'prague:lampglass'; glI.userData.noQA = true;
    poolM = new THREE.MeshBasicMaterial({ map: blobTex(), color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); patchMaterial(poolM);
    const disc = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const poolI = new THREE.InstancedMesh(disc, poolM, lamps.length); poolI.name = 'prague:lightpools'; poolI.userData.noQA = true; poolI.renderOrder = 2;
    lamps.forEach(([x, y, z], i) => { _m.makeTranslation(x, y, z); postI.setMatrixAt(i, _m); glI.setMatrixAt(i, _m); _m.compose(new THREE.Vector3(x, y + 0.04, z), new THREE.Quaternion(), new THREE.Vector3(9, 1, 9)); poolI.setMatrixAt(i, _m); });
    root.add(postI, glI, poolI);
    const nL = clamp(Math.round(item.lamp_lights ?? 3), 0, 6);
    const near = lamps.map((l, i) => [i, Math.abs(l[3] - (item.light_at ?? 0.5) * CL.L)]).sort((a, b) => a[1] - b[1]).slice(0, nL);
    for (const [i] of near) { const [x, y, z] = lamps[i]; const pl = new THREE.PointLight(0xFFB46A, 0, 26, 2); pl.position.set(x, y + 4.0, z); pl.castShadow = false; pl.userData.noGovern = true; root.add(pl); lampLights.push(pl); }
  }
  if (trees.length) root.add(treeStand(trees, R, { snow: snow > 0 ? 0.42 : 2 }));
  // ── trams running in the town (background life; for a tram the camera follows use vehicle.tram_prague + road)
  const trams = [];
  for (let k = 0; k < clamp(Math.round(item.trams ?? 0), 0, 3); k++) {
    const tr = buildTram({ seed: (item.seed ?? 19) + k * 7, lit: true });
    tr.group.traverse((o) => { o.userData.noQA = true; });
    root.add(tr.group);
    const dir = k % 2 ? -1 : 1, line = sampleLine(offsetLine(C, dir > 0 ? trackOff[0] : trackOff[1]));
    trams.push({ tr, dir, line, s0: (0.15 + 0.37 * k) * line.L, v: item.tram_speed ?? 6 });
  }
  const placeTram = (T2, t) => {
    const Ls = T2.line.L, sRaw = T2.s0 + T2.v * t * T2.dir, s = ((sRaw % Ls) + Ls) % Ls;
    const p = T2.line.at(s), dd = T2.line.dir(s), f = [dd[0] * T2.dir, dd[1] * T2.dir];
    T2.tr.group.position.set(p[0], surfY(p[0], p[1]) + 0.07, p[1]); T2.tr.group.rotation.set(0, Math.atan2(f[0], f[1]), 0);
    T2.tr.update(t, { distance: T2.v * t, lights: LIGHTS() });
  };
  // ── API for vehicles: lanes and tracks as waypoint lists (world [x, z])
  function lanePath(o = {}) {
    const dir = (o.dir ?? 1) < 0 ? -1 : 1;
    let off = typeof o.lane === 'number' ? o.lane : o.lane === 'left' ? -(W / 2 - 1.9) : o.lane === 'track' ? trackOff[0] : (W / 2 - 1.9);
    if (o.track != null) off = trackOff[clamp(Math.round(o.track), 0, 1)];
    const line = offsetLine(C, dir > 0 ? off : -off), SL = sampleLine(line);
    const from = clamp(o.from ?? (dir > 0 ? 0 : CL.L), 0, CL.L), to = clamp(o.to ?? (dir > 0 ? CL.L : 0), 0, CL.L);
    const pts = [], n = Math.max(2, Math.ceil(Math.abs(to - from) / 2));
    for (let i = 0; i <= n; i++) { const s = lerp(from, to, i / n) * SL.L / CL.L; pts.push(SL.at(s)); }
    return pts;
  }
  const mid = CL.at(CL.L / 2);
  const anchors = { street: new THREE.Vector3(mid[0], surfY(mid[0], mid[1]), mid[1]), start: new THREE.Vector3(C[0][0], surfY(C[0][0], C[0][1]), C[0][1]), end: new THREE.Vector3(C[C.length - 1][0], surfY(C[C.length - 1][0], C[C.length - 1][1]), C[C.length - 1][1]) };
  if (arcL > 0) { const b = CL.at(straight + arcL / 2); anchors.bend = new THREE.Vector3(b[0], surfY(b[0], b[1]), b[1]); }
  lamps.slice(0, 12).forEach((l, i) => { anchors['lamp_' + i] = new THREE.Vector3(l[0], l[1] + 4.0, l[2]); });
  return {
    root, radius: L / 2 + 50, height: 30, anchors, lanePath, length: CL.L, width: W, pavement: PW, centre: C, trackOffsets: trackOff,
    stats: { houses: houses.length, windows: glass.length, lit: litGlass.length, lamps: lamps.length, trams: trams.length },
    update(t) {
      const Lk = LIGHTS();
      PU.uPSnow.value = snow;
      lgM.color.setRGB(1.8 * Lk, 1.8 * Lk, 1.8 * Lk);
      if (lampGlassM) { const v = Lk * lampLevel; lampGlassM.color.setRGB(0.19 + 2.6 * v, 0.16 + 1.75 * v, 0.12 + 0.9 * v); poolM.color.setRGB(0.42 * v, 0.27 * v, 0.12 * v); for (const pl of lampLights) { pl.intensity = 70 * v; pl.visible = v > 0.01; } }
      for (const T2 of trams) placeTram(T2, t);
    },
  };
}

// ════════════════════════════════════ vehicles: mercedes_320 + tram_prague ═════════════════════════════════════════
// smooth lofts (rows of [x, y, z] rings) -> BufferGeometry with smooth normals (double-sided materials: winding-proof)
function loftGeo(rows, closed = true) {
  const nr = rows.length, nc = rows[0].length, cols = closed ? nc + 1 : nc, pos = [], uv = [], idx = [];
  for (let i = 0; i < nr; i++) for (let j = 0; j < cols; j++) { const p = rows[i][j % nc]; pos.push(p[0], p[1], p[2]); uv.push(j / (cols - 1), i / (nr - 1)); }
  for (let i = 0; i < nr - 1; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b = a + 1, c = a + cols, e = c + 1; idx.push(a, b, c, b, e, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (closed) { const n = g.attributes.normal, v = new THREE.Vector3(); for (let i = 0; i < nr; i++) { const a = i * cols, b = a + nc; v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize(); n.setXYZ(a, v.x, v.y, v.z); n.setXYZ(b, v.x, v.y, v.z); } }
  return g;
}
// a superellipse ring: half width hw, bottom yb, top yt, exponent n (2 round .. 6 boxy), tumblehome tum, M points,
// starting at the bottom centre and going round the +x side first
function seRing(z, hw, yb, yt, n = 4, tum = 0, M = 32) {
  const ym = (yb + yt) / 2, hh = (yt - yb) / 2, out = [];
  for (let j = 0; j < M; j++) {
    const th = -Math.PI / 2 + j / M * TAU, c = Math.cos(th), s = Math.sin(th);
    const x = hw * Math.sign(c) * Math.abs(c) ** (2 / n) * (1 - tum * Math.max(0, s) ** 2), y = ym + hh * Math.sign(s) * Math.abs(s) ** (2 / n);
    out.push([x, y, z]);
  }
  return out;
}
// the open cockpit's U ring: outer skin from the bottom up to the belt, a rim, the inner wall down to the floor, across
function uRing(z, hw, yb, belt, floor, M = 32) {
  const ym = (yb + belt) / 2, hh = (belt - yb) / 2, side = [];
  const no = 10;
  for (let k = 0; k <= no; k++) { const th = -Math.PI / 2 + k / no * Math.PI / 2, c = Math.cos(th), s = Math.sin(th); side.push([hw * Math.abs(c) ** 0.5, ym + hh * Math.sign(s) * Math.abs(s) ** 0.5]); }
  side.push([hw - 0.05, belt + 0.012], [hw - 0.07, belt - 0.03], [hw - 0.08, (belt + floor) / 2], [hw - 0.09, floor + 0.04], [hw - 0.13, floor]);
  const right = side.map(([x, y]) => [x, y, z]), left = side.slice().reverse().map(([x, y]) => [-x, y, z]);
  const ring = [[0, yb, z], ...right.slice(1), [0, floor, z], ...left.slice(0, -1)];
  return ring.slice(0, M).length === ring.length ? ring : ring;
}
function sweepGeo(path, sec) {           // path: [[x, y, z, hw, h, th]...] in the yz plane; section: an arch shell
  const rows = [], nA = 12;
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], tz = b[2] - a[2], ty = b[1] - a[1], l = Math.hypot(tz, ty) || 1;
    let nz = ty / l, ny = -tz / l; if (ny < 0) { nz = -nz; ny = -ny; }                 // the arch opens toward the ground
    const [x, y, z, hw, h, th] = path[i], row = [];
    for (let k = 0; k <= nA; k++) { const ph = k / nA * Math.PI; row.push([x + Math.cos(ph) * hw, y + ny * Math.sin(ph) * h, z + nz * Math.sin(ph) * h]); }
    for (let k = nA; k >= 0; k--) { const ph = k / nA * Math.PI; row.push([x + Math.cos(ph) * (hw - th), y + ny * (Math.sin(ph) * (h - th) - th), z + nz * (Math.sin(ph) * (h - th) - th)]); }
    rows.push(row);
  }
  return loftGeo(rows, true);
}
function capGeo(ring) {                   // fan cap (centroid) over a closed ring
  const c = [0, 0, 0]; for (const p of ring) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } c[0] /= ring.length; c[1] /= ring.length; c[2] /= ring.length;
  const pos = [...c], idx = []; for (const p of ring) pos.push(...p);
  for (let j = 0; j < ring.length; j++) idx.push(0, 1 + j, 1 + (j + 1) % ring.length);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// seated riders (faceless mannequins): {ref} a cast def, or {kit, headwear, colors}; default: officers in peaked caps
import { buildCharacter, findCastDef } from '../human/cast.js';
import { POSES } from '../human/rig.js';
function seatCrew(parent, list, slots, ctx, seed) {
  const items = typeof list === 'number' ? Array.from({ length: list }, () => ({})) : (Array.isArray(list) ? list : []).map((e) => (typeof e === 'string' ? { ref: e } : e || {}));
  const figs = [];
  items.slice(0, slots.length).forEach((e, i) => {
    try {
      const def = (e.ref && findCastDef(e.ref, ctx)) || { id: 'mb_' + seed + '_' + i, kit: e.kit || 'ww2_german', colors: e.colors || (i === 0 ? { coat: '#4E5248', trousers: '#4A4D44', accent: '#9A9A8A' } : { coat: '#3E4038', trousers: '#3A3C35', accent: '#B8B4A0' }), headwear: e.headwear || 'peaked_cap', accessories: e.accessories || [] };
      const res = buildCharacter(def, ctx), fig = res.fig, s = slots[i];
      // a car seat is low (cushion ~0.25 m over the floor): thighs near level, shins reaching forward into the footwell
      // (the chair pose's vertical shins would push the feet through the floor)
      fig.pose({ ...POSES.seated, lLeg: -1.36, rLeg: -1.3, lKnee: 0.34, rKnee: 0.28, lHand: s.hands?.[0] ?? POSES.seated.lHand, rHand: s.hands?.[1] ?? POSES.seated.rHand, weapon: null });
      fig.group.position.set(s.x, s.y, s.z); fig.group.rotation.y = s.yaw ?? 0; parent.add(fig.group);
      fig.group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      figs.push(fig);
    } catch (err) { warnOf(ctx)('mercedes riders: ' + String(err).slice(0, 140)); }
  });
  return figs;
}

// ── Mercedes-Benz 320 open staff car (W142 Cabriolet B silhouette). +Z forward, +X = left (LHD: the driver at +X) ──
function buildMercedes(o = {}, ctx = {}) {
  const group = new THREE.Group(); group.name = 'mercedes_320';
  const body = new THREE.Group(); body.name = 'mb:body'; group.add(body);
  const paintCol = o.color != null ? new THREE.Color(o.color).getHex() : 0x101814;
  const paint = mat({ physical: true, color: paintCol, roughness: 0.3, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.2, side: THREE.DoubleSide }, 'mbpaint');
  const chrome = mat({ color: 0xE2E4E6, roughness: 0.1, metalness: 1, envMapIntensity: 1.6, side: THREE.DoubleSide }, 'mbchrome');
  const leather = mat({ color: o.interior != null ? new THREE.Color(o.interior).getHex() : 0x7A1A16, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.6, side: THREE.DoubleSide }, 'mbleather');
  const black = mat({ color: 0x0B0B0C, roughness: 0.75, side: THREE.DoubleSide }, 'mbblack'), canvasM = mat({ color: o.top_color != null ? new THREE.Color(o.top_color).getHex() : 0x1A1A18, roughness: 0.95, side: THREE.DoubleSide }, 'mbcanvas');
  const tyreM = mat({ color: 0x121212, roughness: 0.88 }, 'mbtyre'), wallM = mat({ color: 0xE8E6E0, roughness: 0.6 }, 'mbwhitewall');
  const wood = mat({ color: 0x5A3420, roughness: 0.4, metalness: 0.1 }, 'mbwood');
  const glassM = mat({ physical: true, color: 0xC8D4DC, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }, 'mbglass');
  const lampM = mat({ color: 0x0E0E0E, roughness: 0.2, emissive: 0xFFE2A8, emissiveIntensity: 0 }, 'mblamp');
  const add = (g, m, name, parent = body) => { const x = new THREE.Mesh(g, m); x.name = name; x.castShadow = true; x.receiveShadow = true; parent.add(x); return x; };
  // body: bonnet + cowl (closed), the open cockpit (U section), the rear deck sloping to the tail (closed)
  const zc0 = 0.22, zc1 = -1.72, belt = 1.07, yb = 0.47, floor = 0.48;
  const front = [];
  for (const [z, hw, b0, t0, n] of [[zc0, 0.775, yb, belt, 4.5], [0.34, 0.77, yb + 0.02, belt + 0.01, 4.5], [0.46, 0.42, 0.6, 1.11, 3.6], [0.62, 0.37, 0.62, 1.115, 3.6], [1.2, 0.355, 0.62, 1.1, 3.6], [1.8, 0.335, 0.62, 1.085, 3.6], [2.02, 0.325, 0.63, 1.075, 3.6]]) front.push(seRing(z, hw, b0, t0, n, 0.08));
  add(loftGeo(front), paint, 'mb:bonnet'); add(capGeo(front[front.length - 1]), black, 'mb:radback');
  const cock = []; for (const [z, hw] of [[zc1, 0.77], [-1.2, 0.785], [-0.5, 0.79], [0.0, 0.785], [zc0, 0.775]]) cock.push(uRing(z, hw, yb, belt, floor));
  add(loftGeo(cock), paint, 'mb:tub');
  const rear = [];
  for (const [z, hw, b0, t0, n] of [[-2.52, 0.6, 0.56, 0.7, 2.8], [-2.44, 0.68, 0.52, 0.86, 3.2], [-2.25, 0.74, 0.49, 0.98, 3.8], [-2.0, 0.765, yb, 1.04, 4.2], [zc1, 0.77, yb, belt, 4.5]]) rear.push(seRing(z, hw, b0, t0, n, 0.08));
  add(loftGeo(rear), paint, 'mb:deck'); add(capGeo(rear[0]), paint, 'mb:tail');
  // dash (walnut) + scuttle panel, rear seat back panel
  const B = new MB(); B.box([0, 0.86, zc0 - 0.02], [1, 0, 0], [0, 1, 0], 0.74, 0.2, 0.025); add(B.geo({ colors: false }), wood, 'mb:dash');
  const Bb = new MB(); Bb.box([0, 0.8, zc1 + 0.02], [1, 0, 0], [0, 1, 0], 0.72, 0.25, 0.02); add(Bb.geo({ colors: false }), black, 'mb:rearpanel');
  // the radiator: a tall chrome shell, slightly pointed (V) in plan, dark slats with chrome bars, the star on the cap
  { const S = new MB(), D = new MB(), zg = 2.08;
    for (const s of [1, -1]) { const ax = [s * Math.cos(9 * DEG), 0, Math.sin(9 * DEG)], ay = [0, 1, 0]; S.box([s * 0.14, 0.9, zg + 0.02], ax, ay, 0.15, 0.3, 0.05); D.box([s * 0.135, 0.9, zg + 0.072], ax, ay, 0.12, 0.26, 0.004); for (let k = 0; k < 5; k++) S.box([s * (0.03 + k * 0.05), 0.9, zg + 0.078 - k * 0.008], ax, ay, 0.006, 0.255, 0.006); }
    add(S.geo({ colors: false }), chrome, 'mb:grille'); add(D.geo({ colors: false }), black, 'mb:slats');
    const cap = new MB(); cap.cyl([0, 1.2, zg + 0.02], [0, 1.25, zg + 0.02], 0.035, 0.03, 10); cap.cyl([0, 1.25, zg + 0.02], [0, 1.29, zg + 0.02], 0.012, 0.012, 6);
    const st = []; for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + k / 3 * TAU; cap.box([Math.cos(a) * 0.022, 1.335 + Math.sin(a) * 0.022, zg + 0.02], [Math.cos(a), Math.sin(a), 0], [0, 0, 1], 0.022, 0.003, 0.003); }
    const ring = new THREE.TorusGeometry(0.045, 0.004, 6, 24); ring.translate(0, 1.335, zg + 0.02); add(ring, chrome, 'mb:starring');
    add(cap.geo({ colors: false }), chrome, 'mb:star');
    // bonnet louvres (chrome strips) along both sides
    const Lv = new MB(); for (const s of [1, -1]) for (let k = 0; k < 12; k++) { const z = 0.75 + k * 0.08; Lv.box([s * 0.352, 0.82, z], [0, 0, 1], [0, 1, 0], 0.012, 0.11, 0.004); } add(Lv.geo({ colors: false }), chrome, 'mb:louvres');
  }
  // fenders: the front ones sweep down into the running boards, the rear ones rise over the rear wheels
  const fpath = [[2.42, 0.54, 0.7, 0.16, 0.06], [2.32, 0.67, 0.7, 0.165, 0.1], [2.14, 0.8, 0.7, 0.168, 0.12], [1.9, 0.88, 0.7, 0.168, 0.125], [1.65, 0.905, 0.7, 0.168, 0.125], [1.4, 0.895, 0.7, 0.168, 0.122], [1.15, 0.84, 0.705, 0.165, 0.11], [0.92, 0.74, 0.715, 0.16, 0.09], [0.72, 0.62, 0.73, 0.155, 0.07], [0.5, 0.52, 0.745, 0.148, 0.045], [0.25, 0.47, 0.755, 0.142, 0.03], [-0.2, 0.45, 0.76, 0.14, 0.025], [-0.7, 0.45, 0.76, 0.14, 0.025], [-0.98, 0.46, 0.755, 0.14, 0.03]];
  const rpath = [[-0.92, 0.47, 0.73, 0.14, 0.05], [-1.12, 0.6, 0.735, 0.15, 0.09], [-1.3, 0.76, 0.735, 0.152, 0.11], [-1.5, 0.86, 0.735, 0.152, 0.115], [-1.72, 0.895, 0.735, 0.152, 0.115], [-1.95, 0.865, 0.735, 0.15, 0.11], [-2.15, 0.77, 0.73, 0.148, 0.095], [-2.32, 0.63, 0.72, 0.14, 0.075], [-2.43, 0.52, 0.71, 0.13, 0.05]];
  // the wings are DEEP: their skirts come down past the top of the tyre (crown kept, the sides lowered), wider over the
  // wheels; the flat running board part stays a board
  const skirt = ([z, y, x, hw, h]) => { const k = smooth((h - 0.035) / 0.07), h2 = h * (1 + 1.05 * k); return [z, y + h - h2, x + 0.01 * k, hw + 0.03 * k, h2]; };
  const fpathD = fpath.map(skirt), rpathD = rpath.map(skirt);
  for (const s of [1, -1]) {
    add(sweepGeo(fpathD.map(([z, y, x, hw, h]) => [s * x, y, z, hw, h, 0.018])), paint, 'mb:fender_front');
    add(sweepGeo(rpathD.map(([z, y, x, hw, h]) => [s * x, y, z, hw, h, 0.018])), paint, 'mb:fender_rear');
    // the splash apron: closes the gap between the bonnet side and the wing's inner edge (no daylight through the front)
    { const rows = fpathD.filter(([z]) => z > 0.3 && z < 2.36).map(([z, y, x, hw, h]) => { const ya = y + h * 0.62; return [[s * 0.33, Math.min(ya, 1.0), z], [s * (x - hw * 0.8), ya, z]]; });
      if (rows.length > 1) add(loftGeo(rows, false), paint, 'mb:apron'); }
    { const rows = rpathD.filter(([z]) => z < -1.0 && z > -2.4).map(([z, y, x, hw, h]) => { const ya = y + h * 0.62; return [[s * 0.6, ya, z], [s * (x - hw * 0.8), ya, z]]; });
      if (rows.length > 1) add(loftGeo(rows, false), paint, 'mb:apron_rear'); }
    const rb = new MB(); for (let k = 0; k < 5; k++) rb.box([s * 0.76, 0.478, -0.92 + k * 0.24 + 0.12], [1, 0, 0], [0, 1, 0], 0.12, 0.004, 0.006); add(rb.geo({ colors: false }), chrome, 'mb:runningboard_trim');
    // door seams, handle, hinge line on the tub
    const dl = new MB(); for (const z of [0.16, -0.52]) dl.box([s * 0.79, 0.77, z], [0, 0, 1], [0, 1, 0], 0.004, 0.28, 0.003); add(dl.geo({ colors: false }), black, 'mb:doorline');
    const hd = new MB(); hd.box([s * 0.8, 0.98, -0.44], [0, 0, 1], [0, 1, 0], 0.06, 0.008, 0.012); add(hd.geo({ colors: false }), chrome, 'mb:handle');
    // headlamp bowls on the lamp bar, blackout slit covers
    // the big chrome bowls stand ON the wings' inner edge (centre ~1.06 m), on a stalk + the bar to the radiator
    const hx = s * 0.5, hy = 1.06, hz = 2.02;
    const hb = new THREE.SphereGeometry(0.135, 20, 12, 0, TAU, 0, Math.PI / 2); hb.rotateX(-Math.PI / 2); hb.scale(1, 1, 1.25); hb.translate(hx, hy, hz); add(hb, chrome, 'mb:headlamp');
    const rim = new THREE.TorusGeometry(0.132, 0.011, 6, 28); rim.translate(hx, hy, hz + 0.002); add(rim, chrome, 'mb:headlamp_rim');
    const lens = new THREE.CircleGeometry(0.124, 20); lens.translate(hx, hy, hz + 0.004); add(lens, black, 'mb:blackout');
    const slit = new THREE.PlaneGeometry(0.11, 0.012); slit.translate(hx, hy - 0.03, hz + 0.007); add(slit, lampM, 'mb:slit');
    const bar = new MB(); bar.cyl([hx, hy - 0.2, hz - 0.08], [hx, hy - 0.1, hz - 0.08], 0.022, 0.018, 6); bar.cyl([hx, hy - 0.12, hz - 0.08], [s * 0.17, 0.86, 2.06], 0.016, 0.016, 6); add(bar.geo({ colors: false }), chrome, 'mb:lampbar');
    // horn / fog lamp, small
    const fl = new THREE.SphereGeometry(0.065, 12, 8, 0, TAU, 0, Math.PI / 2); fl.rotateX(-Math.PI / 2); fl.translate(s * 0.3, 0.6, 2.28); add(fl, chrome, 'mb:foglamp');
    // a wing mirror on the front fender
    const mr = new MB(); mr.cyl([s * 0.68, 0.98, 1.0], [s * 0.68, 1.15, 1.0], 0.008, 0.008, 5); mr.cyl([s * 0.68, 1.15, 0.985], [s * 0.68, 1.15, 1.015], 0.05, 0.05, 12); add(mr.geo({ colors: false }), chrome, 'mb:mirror');
  }
  // the front valance: a curved apron under the radiator joining the two wings (no wheels seen through the nose)
  { const V = new MB(); V.box([0, 0.56, 2.2], [1, 0, 0], [0, Math.cos(0.5), Math.sin(0.5)], 0.56, 0.1, 0.02); add(V.geo({ colors: false }), paint, 'mb:valance'); }
  // bumpers: chrome blades on uprights, front and rear
  { const Bm = new MB(); for (const [z, y] of [[2.48, 0.44], [-2.66, 0.46]]) { Bm.box([0, y, z], [1, 0, 0], [0, 1, 0], 0.82, 0.045, 0.03); for (const s of [1, -1]) Bm.cyl([s * 0.45, y, z - Math.sign(z) * 0.03], [s * 0.45, y, z - Math.sign(z) * 0.22], 0.018, 0.018, 6); }
    add(Bm.geo({ colors: false }), chrome, 'mb:bumpers'); }
  // windscreen: chrome frame, raked glass, the folded top, seats, steering wheel
  { const rk = 8 * DEG, z0 = zc0 + 0.02, y0 = belt + 0.01, Hs = 0.42, wf = 0.66;
    const P = (x, h) => [x, y0 + h * Math.cos(rk), z0 - h * Math.sin(rk)];
    const F2 = new MB(); F2.cyl(P(-wf, 0), P(-wf, Hs), 0.016, 0.016, 6); F2.cyl(P(wf, 0), P(wf, Hs), 0.016, 0.016, 6); F2.cyl(P(-wf, Hs), P(wf, Hs), 0.014, 0.014, 6); F2.cyl(P(-wf, 0.01), P(wf, 0.01), 0.012, 0.012, 6);
    add(F2.geo({ colors: false }), chrome, 'mb:screenframe');
    const gp = new THREE.BufferGeometry(); const q = [P(-wf, 0.01), P(wf, 0.01), P(wf, Hs), P(-wf, Hs)]; gp.setAttribute('position', new THREE.Float32BufferAttribute([...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]], 3)); gp.computeVertexNormals();
    const gm = add(gp, glassM, 'mb:windscreen'); gm.castShadow = false; gm.userData.noCollide = true; }
  if (o.top !== 'up') {
    const roll = new THREE.CapsuleGeometry(0.15, 1.28, 6, 14); roll.rotateZ(Math.PI / 2); roll.scale(1, 1.05, 1.5); roll.translate(0, belt + 0.12, zc1 - 0.18); add(roll, canvasM, 'mb:foldedtop');
  } else {
    const top = new MB(); top.box([0, 1.45, -0.8], [1, 0, 0], [0, 1, 0], 0.75, 0.03, 0.95); for (const s of [1, -1]) top.poly([[s * 0.76, belt, zc1 - 0.1], [s * 0.76, belt, -0.0], [s * 0.76, 1.44, -0.1], [s * 0.76, 1.44, -1.7]], [s, 0, 0]); add(top.geo({ colors: false }), canvasM, 'mb:hood');
  }
  { const S2 = new MB();
    for (const s of [1, -1]) { S2.box([s * 0.35, 0.66, -0.3], [1, 0, 0], [0, 1, 0], 0.27, 0.07, 0.25); S2.box([s * 0.35, 0.92, -0.6], [1, 0, 0], [0, Math.cos(-12 * DEG), Math.sin(-12 * DEG)], 0.27, 0.24, 0.06); }
    S2.box([0, 0.68, -1.32], [1, 0, 0], [0, 1, 0], 0.66, 0.08, 0.26); S2.box([0, 0.95, -1.64], [1, 0, 0], [0, Math.cos(-10 * DEG), Math.sin(-10 * DEG)], 0.66, 0.26, 0.07);
    for (const s of [1, -1]) S2.box([s * 0.7, 0.86, -1.3], [1, 0, 0], [0, 1, 0], 0.06, 0.13, 0.3);
    add(S2.geo({ colors: false }), leather, 'mb:seats');
    const sw = new THREE.TorusGeometry(0.2, 0.014, 6, 24); sw.rotateX(-0.95); sw.translate(0.35, 1.02, -0.02); add(sw, black, 'mb:wheel');
    const col = new MB(); col.cyl([0.35, 1.0, 0.0], [0.35, 0.72, 0.42], 0.022, 0.022, 6); add(col.geo({ colors: false }), black, 'mb:column'); }
  // the spare wheel on the tail
  // wheels: black tyres with a thin whitewall, painted disc, chrome hubcap and trim ring
  const wr = 0.37, wheels = [];
  const wheelGeo = (() => {
    const g = new THREE.Group();
    const t = new THREE.TorusGeometry(wr - 0.085, 0.085, 12, 30); t.rotateY(Math.PI / 2); g.add(Object.assign(new THREE.Mesh(t, tyreM), { castShadow: true }));
    for (const s of [1, -1]) { const ww = new THREE.RingGeometry(wr - 0.12, wr - 0.07, 30); ww.rotateY(s * Math.PI / 2); ww.translate(s * 0.086, 0, 0); g.add(new THREE.Mesh(ww, wallM)); }
    const dsk = new THREE.CylinderGeometry(wr - 0.12, wr - 0.12, 0.12, 24); dsk.rotateZ(Math.PI / 2); g.add(new THREE.Mesh(dsk, paint));
    for (const s of [1, -1]) { const hc = new THREE.SphereGeometry(0.1, 14, 8, 0, TAU, 0, Math.PI / 2); hc.rotateZ(-s * Math.PI / 2); hc.scale(0.55, 1, 1); hc.translate(s * 0.06, 0, 0); g.add(new THREE.Mesh(hc, chrome));
      const tr = new THREE.TorusGeometry(wr - 0.125, 0.012, 6, 30); tr.rotateY(Math.PI / 2); tr.translate(s * 0.062, 0, 0); g.add(new THREE.Mesh(tr, chrome)); }
    return g;
  })();
  const track = 1.42, wb = 3.15, zf = 1.55, zr = -1.6;
  for (const s of [1, -1]) for (const z of [zf, zr]) {
    const steer = new THREE.Group(); steer.position.set(s * track / 2, wr, z); group.add(steer);
    const w = wheelGeo.clone(true); steer.add(w); wheels.push({ w, steer, front: z > 0 });
  }
  { const sp = wheelGeo.clone(true); sp.rotation.set(0.42, Math.PI / 2, 0, 'XYZ'); sp.position.set(0, 0.86, -2.5); body.add(sp); }
  // fender flags: chrome staffs on the front fenders, small pennants that flutter (CPU wave: speed + gusts)
  const flags = [];
  if (o.flags !== false) {
    const fc = o.flag_color != null ? o.flag_color : '#8E1A16', bc = o.flag_border ?? '#E8E2D2';
    const ftex = canvasTex('mbflag:' + fc + bc, 64, (g, S) => { g.fillStyle = bc; g.fillRect(0, 0, S, S); g.fillStyle = fc; g.fillRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8); g.strokeStyle = bc; g.lineWidth = 3; g.strokeRect(S * 0.28, S * 0.28, S * 0.44, S * 0.44); });
    const fm = mat({ map: ftex, roughness: 0.85, side: THREE.DoubleSide }, 'mbflagm');
    for (const s of [1, -1]) {
      const st = new MB(); st.cyl([s * 0.7, 0.9, 2.1], [s * 0.7, 1.28, 2.1], 0.007, 0.006, 6); st.cyl([s * 0.7, 1.28, 2.1], [s * 0.7, 1.3, 2.1], 0.014, 0.004, 6); add(st.geo({ colors: false }), chrome, 'mb:flagstaff');
      const pg = new THREE.PlaneGeometry(0.22, 0.15, 8, 4); pg.translate(-0.11, -0.075, 0); pg.rotateY(Math.PI / 2);   // along -Z from the staff
      const base = Float32Array.from(pg.attributes.position.array);
      const fmesh = add(pg, fm, 'mb:flag'); fmesh.position.set(s * 0.7, 1.275, 2.1); fmesh.castShadow = false; fmesh.userData.noCollide = true;
      flags.push({ g: pg, base, s, ph: s > 0 ? 0 : 1.7 });
    }
  }
  const lights = o.lights ?? 'auto';
  function update(t, st = {}) {
    const dist = st.distance ?? 0, steerA = clamp(st.steer ?? 0, -0.55, 0.55), v = st.speed ?? 0;
    for (const W2 of wheels) { W2.w.rotation.x = dist / wr; W2.steer.rotation.y = W2.front ? steerA : 0; }
    const amp = 0.25 + clamp(v / 14, 0, 1) * 0.75;
    for (const f of flags) {
      const P2 = f.g.attributes.position;
      for (let i = 0; i < P2.count; i++) {
        const bx = f.base[i * 3], by = f.base[i * 3 + 1], bz = f.base[i * 3 + 2], u = clamp(-bz / 0.22, 0, 1);      // u: 0 at the staff .. 1 at the fly
        const wv = Math.sin(t * (9 + v * 0.6) - u * 7 + f.ph) * 0.03 * u * amp + Math.sin(t * 17 + u * 11 + f.ph) * 0.008 * u;
        const droop = (1 - amp) * u * u * 0.09;
        P2.setXYZ(i, bx + wv, by - droop, bz * (1 - droop * 1.5));
      }
      P2.needsUpdate = true; f.g.computeVertexNormals();
    }
    const on = lights === true || (lights === 'auto' && LIGHTS() > 0.3);
    lampM.emissiveIntensity = on ? 1.4 : 0;
  }
  // riders: the driver (+X), the front passenger, two in the back
  const nR = o.riders ?? 2;
  const slots = [{ x: 0.35, y: 0.3, z: -0.3, hands: [{ space: 'root', p: [0.17, 0.75, 0.3], fingers: [-0.2, 0.1, 1], palm: [0, -0.3, 1], pole: [0.8, -0.5, -0.5] }, { space: 'root', p: [-0.17, 0.75, 0.3], fingers: [0.2, 0.1, 1], palm: [0, -0.3, 1], pole: [-0.8, -0.5, -0.5] }] }, { x: -0.35, y: 0.3, z: -0.3 }, { x: 0.36, y: 0.32, z: -1.3 }, { x: -0.36, y: 0.32, z: -1.3 }];
  const crew = nR ? seatCrew(body, nR, slots, ctx, o.seed ?? 1) : [];
  const anchors = {};
  for (const [k, p] of Object.entries({ driver: [0.35, 1.3, -0.25], passenger: [-0.35, 1.3, -0.25], rear: [0, 1.3, -1.3], flag_l: [0.7, 1.2, 2.1], flag_r: [-0.7, 1.2, 2.1], star: [0, 1.33, 2.1], bonnet: [0, 1.12, 1.2], tail: [0, 0.8, -2.6], seat_driver: [0.35, 0.72, -0.3], seat_front: [-0.35, 0.72, -0.3], seat_rear_l: [0.36, 0.74, -1.3], seat_rear_r: [-0.36, 0.74, -1.3] })) { const a = new THREE.Object3D(); a.position.set(...p); a.name = 'mb:' + k; body.add(a); anchors[k] = a; }
  update(0, {});
  return { group, update, anchors, length: 5.1, width: 1.75, wheelbase: wb, track, crew: crew.length, height: 1.48 };
}

// ── Prague tram, 1930s two-axle motor car: red + cream, clerestory, platforms, trolley pole on the 5.65 m wire ──────
function buildTram(o = {}) {
  const group = new THREE.Group(); group.name = 'tram_prague';
  const red = o.color ?? '#8E2620', cream = o.trim ?? '#E4D7B2';
  const P = new MB(), Dk = new MB(), Rf = new MB(), Mt = new MB(), Gl = new MB(), GlC = new MB();
  const X = [1, 0, 0], Y = [0, 1, 0];
  const L2 = 3.55, Lp = 4.7, hw = 1.05;
  Dk.color('#1A1A1A').box([0, 0.66, 0], X, Y, 0.95, 0.16, 4.5);                         // underframe
  P.color(red).box([0, 1.3, 0], X, Y, hw, 0.45, L2, 0);                                // saloon lower panels
  for (const s of [1, -1]) for (let k = -3; k <= 3; k++) P.color(shade(red, 0.8)).box([s * (hw + 0.004), 1.3, k * 1.0], X, Y, 0.004, 0.36, 0.008, 0);
  P.color(cream).box([0, 1.78, 0], X, Y, hw + 0.01, 0.04, L2 + 0.01, 0);               // waist rail
  // window band: posts + glass, letterboard
  const nW = 6, ww = (2 * L2) / nW;
  for (const s of [1, -1]) {
    for (let k = 0; k <= nW; k++) P.color(cream).box([s * (hw - 0.01), 2.22, -L2 + k * ww], X, Y, 0.02, 0.42, 0.09, 0);
    for (let k = 0; k < nW; k++) { const z = -L2 + (k + 0.5) * ww; Gl.poly([[s * (hw - 0.02), 1.86, z - ww / 2 + 0.1], [s * (hw - 0.02), 1.86, z + ww / 2 - 0.1], [s * (hw - 0.02), 2.56, z + ww / 2 - 0.1], [s * (hw - 0.02), 2.56, z - ww / 2 + 0.1]], [s, 0, 0]); }
  }
  P.color(cream).box([0, 2.77, 0], X, Y, hw + 0.01, 0.13, L2 + 0.01, 0);
  // platforms with curved dashes and windscreens, both ends
  for (const e of [1, -1]) {
    const zc = e * L2, seg = 6;
    for (let k = 0; k < seg; k++) {
      const a0 = -Math.PI / 2 + k / seg * Math.PI, a1 = -Math.PI / 2 + (k + 1) / seg * Math.PI, am = (a0 + a1) / 2, rr = hw, dz = Lp - L2;
      const p = (a, y, kk = 1) => [Math.sin(a) * rr * kk, y, zc + e * Math.cos(a) * dz * kk];
      P.color(red).poly([p(a0, 0.82), p(a1, 0.82), p(a1, 1.72), p(a0, 1.72)], [Math.sin(am), 0, e * Math.cos(am)]);
      P.color(cream).poly([p(a0, 1.72), p(a1, 1.72), p(a1, 1.84), p(a0, 1.84)], [Math.sin(am), 0, e * Math.cos(am)]);
      if (k > 0 && k < seg - 1) Gl.poly([p(a0, 1.88, 0.995), p(a1, 1.88, 0.995), p(a1, 2.6, 0.995), p(a0, 2.6, 0.995)], [Math.sin(am), 0, e * Math.cos(am)]);
      P.color(cream).poly([p(a0, 2.62), p(a1, 2.62), p(a1, 2.9), p(a0, 2.9)], [Math.sin(am), 0, e * Math.cos(am)]);
      Rf.poly([p(a0, 2.9, 1.02), p(a1, 2.9, 1.02), [0, 3.05, zc]], [0, 1, 0]);
      Mt.color('#222').box(p(am, 2.24), X, Y, 0.025, 0.36, 0.025, 0);
    }
    Dk.color('#151515').box([0, 0.42, e * (Lp + 0.05)], X, Y, 0.85, 0.06, 0.12, 0);    // lifeguard tray
    for (const s of [1, -1]) Dk.color('#222').box([s * 0.95, 0.5, e * (L2 + 0.55)], X, Y, 0.12, 0.03, 0.35, 0);   // steps
    const hl = new THREE.CircleGeometry(0.11, 16); hl.translate(0, 1.25, 0); hl.rotateY(e > 0 ? 0 : Math.PI); hl.translate(0, 0, e * (Lp + 0.003)); group.userData['hl' + e] = hl;
    GlC.box([0, 3.22, e * (L2 + 0.4)], X, Y, 0.38, 0.13, 0.05, 0);                        // route-number box
  }
  // roof: arched main roof + clerestory with small windows
  for (let k = 0; k < 6; k++) { const a0 = k / 6, a1 = (k + 1) / 6, x0 = lerp(-hw - 0.04, hw + 0.04, a0), x1 = lerp(-hw - 0.04, hw + 0.04, a1), y = (x) => 2.9 + 0.16 * (1 - (x / (hw + 0.04)) ** 2); Rf.poly([[x0, y(x0), -L2], [x1, y(x1), -L2], [x1, y(x1), L2], [x0, y(x0), L2]], [0, 1, 0]); }
  Rf.box([0, 3.17, 0], X, Y, 0.55, 0.12, L2 - 0.3, 0);
  for (const s of [1, -1]) for (let k = 0; k < 8; k++) GlC.poly([[s * 0.551, 3.1, -L2 + 0.5 + k * 0.8], [s * 0.551, 3.1, -L2 + 1.0 + k * 0.8], [s * 0.551, 3.24, -L2 + 1.0 + k * 0.8], [s * 0.551, 3.24, -L2 + 0.5 + k * 0.8]], [s, 0, 0]);
  // trucks, wheels, the trolley pole (base + spring + pole + wheel on the wire)
  const wheels = [];
  for (const z of [-1.5, 1.5]) for (const s of [1, -1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 18).rotateZ(Math.PI / 2), mat({ color: 0x1C1C1C, roughness: 0.6, metalness: 0.5 }, 'tramwheel')); w.position.set(s * 0.72, 0.4, z); group.add(w); wheels.push(w); }
  Dk.color('#222').box([0, 0.45, -1.5], X, Y, 0.85, 0.12, 0.6, 0); Dk.box([0, 0.45, 1.5], X, Y, 0.85, 0.12, 0.6, 0);
  Mt.color('#2A2A2A').box([0, 3.33, -0.6], X, Y, 0.3, 0.05, 0.5, 0);
  const wireY = o.wire ?? 5.65, poleL = 4.4, baseY = 3.42, ang = Math.asin(clamp((wireY - baseY - 0.08) / poleL, 0.1, 0.95));
  const pole = new MB(); pole.cyl([0, baseY, -0.6], [0, baseY + Math.sin(ang) * poleL, -0.6 - Math.cos(ang) * poleL], 0.03, 0.02, 6, false);
  const tip = [0, baseY + Math.sin(ang) * poleL, -0.6 - Math.cos(ang) * poleL];
  pole.cyl([0.04, tip[1], tip[2]], [-0.04, tip[1], tip[2]], 0.06, 0.06, 10, true);
  // materials
  const T = townTextures();
  const panelM = mat({ vertexColors: true, roughness: 0.45, metalness: 0.15, envMapIntensity: 0.9 }, 'trampanel');
  const roofM = mat({ color: 0x55534E, roughness: 0.8 }, 'tramroof'), darkM = mat({ vertexColors: true, roughness: 0.8 }, 'tramdark'), metM = mat({ vertexColors: true, roughness: 0.4, metalness: 0.7 }, 'trammetal');
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1E242A, roughness: 0.08, metalness: 0.3, envMapIntensity: 1.5, emissive: 0xFFC27A, emissiveIntensity: 0 }); patchMaterial(glassM);
  const capM = new THREE.MeshStandardMaterial({ color: 0xE8E4D8, roughness: 0.6, emissive: 0xFFE8C0, emissiveIntensity: 0 }); patchMaterial(capM);
  const hlM = new THREE.MeshBasicMaterial({ color: 0x444036 }); patchMaterial(hlM);
  const m = (mb, mm, nm, op = {}) => { const x = mb.mesh(mm, nm, op); group.add(x); return x; };
  m(P, panelM, 'tram:body'); m(Dk, darkM, 'tram:dark'); m(Rf, roofM, 'tram:roof', { colors: false }); m(Mt, metM, 'tram:metal'); m(Gl, glassM, 'tram:glass', { colors: false, cast: false }); m(GlC, capM, 'tram:clerestory', { colors: false, cast: false });
  const poleMesh = m(pole, mat({ color: 0x1E1E1E, roughness: 0.5, metalness: 0.6 }, 'trampole'), 'tram:pole', { colors: false });
  for (const e of [1, -1]) { const x = new THREE.Mesh(group.userData['hl' + e], hlM); x.name = 'tram:headlamp'; group.add(x); }
  // sparks at the trolley wheel: brief blue-white flashes (smooth 0.12 s envelopes) every few seconds
  const sparkM = new THREE.SpriteMaterial({ map: blobTex(), color: 0x9FC4FF, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const spark = new THREE.Sprite(sparkM); spark.position.set(...tip); spark.scale.set(0.9, 0.9, 0.9); spark.userData.noQA = true; group.add(spark);
  const sparkL = new THREE.PointLight(0xA8C8FF, 0, 14, 2); sparkL.position.set(...tip); sparkL.userData.noGovern = true; group.add(sparkL);
  const sparkK = o.sparks ?? 0.6, seed = o.seed ?? 1;
  const sparkAt = (t) => { let v = 0; const k0 = Math.floor(t * 2.2); for (let k = k0 - 1; k <= k0 + 1; k++) { if (hashN(k, seed, 51) > 0.18 * sparkK) continue; const tc = (k + hashN(k, seed, 53)) / 2.2, u = Math.abs(t - tc) / 0.07; v = Math.max(v, u < 1 ? smooth(1 - u) : 0); } return v; };
  function update(t, st = {}) {
    for (const w of wheels) w.rotation.x = (st.distance ?? 0) / 0.4;
    const L = st.lights ?? LIGHTS();
    glassM.emissiveIntensity = 1.1 * L; capM.emissiveIntensity = 0.5 * L; hlM.color.setRGB(0.27 + 2.2 * L, 0.25 + 2.0 * L, 0.21 + 1.4 * L);
    const sp = sparkAt(t) * (st.moving === false ? 0 : 1);
    sparkM.opacity = sp; sparkL.intensity = 40 * sp; sparkL.visible = sp > 0.01;
  }
  update(0, {});
  return { group, update, length: 2 * Lp + 0.2, width: 2 * hw, wheelbase: 3.0, track: 1.435, height: 3.4, pole: poleMesh, tip };
}

// ── a ground / rail vehicle that drives a path or a town's lane (`road: '<town id>'`, resolved lazily: objects are
// built before structures). Same kinematics as vehicles.js: smooth track, eased speed, pitch/roll from the ground
function driven(kind, item, ctx, v, o) {
  const G = ground(ctx), warn = warnOf(ctx);
  const root = new THREE.Group(); root.name = kind; root.add(v.group);
  const holder = v.group;
  const at = xz(item.at), hdg = item.heading ?? 180, action = String(item.action || (o.rail ? 'drive' : 'idle')).toLowerCase();
  const moving = ['drive', 'move', 'run', 'cruise'].includes(action);
  const speed = moving ? clamp(+(item.speed ?? o.speed), 0, 40) : 0;
  const d0 = [Math.sin(hdg * DEG), -Math.cos(hdg * DEG)];
  const rmin = +item.turn_radius > 0 ? +item.turn_radius : o.rail ? 14 : turnRadius('ground', v.length, speed, kind);
  let track = null, prof = null, resolved = false, warned = false;
  function resolve() {
    if (resolved) return true;
    let pts = null;
    if (typeof item.road === 'string' && item.road) {
      const host = ctx.S && (ctx.S.byRef['ref:' + item.road] || ctx.S.byRef[item.road]);
      if (!host) return false;                                    // its town is not built yet: stay at `at` until it is
      if (typeof host.res.lanePath === 'function') pts = host.res.lanePath({ lane: item.lane, track: o.rail ? (item.track ?? 0) : item.track, dir: item.dir ?? 1, from: item.from, to: item.to });
      else if (!warned) { warned = true; warn(`${kind}: road '${item.road}' has no lanes (use a town.prague_1942 id); driving its path / heading`); }
    }
    if (!pts) pts = Array.isArray(item.path) && item.path.length >= 2 ? [at, ...item.path.slice(1).map((p) => xz(p))] : [at, [at[0] + d0[0] * 80, at[1] + d0[1] * 80]];
    track = moving || pts.length > 1 ? smoothTrack(pts, { rmin }) : null;
    if (track && pts.length > 2 && !track.fits) warn(`${kind}: the path turns tighter than a ${Math.round(rmin)} m radius even smoothed`);
    prof = speedProfile(speed, { start: (+item.start > 0 || item.from_rest === true) ? (+item.start || 0) : null, ramp: item.ramp ?? 3, stopAt: item.stop === true ? Math.max(1, track.length) : null });
    resolved = true; return true;
  }
  function pose(t) {
    if (!resolve()) return { x: at[0], z: at[1], dir: d0, s: 0, v: 0, kappa: 0 };
    if (!moving) {                                               // parked: on the lane start (road) or at `at`, facing along
      const p = track ? track.at(item.road ? (+item.from_s || 0) : 0) : at, y = track ? track.yaw(0) : Math.atan2(d0[0], d0[1]);
      return { x: item.road ? p[0] : at[0], z: item.road ? p[1] : at[1], dir: [Math.sin(y), Math.cos(y)], s: 0, v: 0, kappa: 0 };
    }
    const s = prof.dist(t), p = track.at(s), yaw = track.yaw(s);
    return { x: p[0], z: p[1], dir: [Math.sin(yaw), Math.cos(yaw)], s, v: prof.speed(t), kappa: track.kappa(s) };
  }
  function update(t = 0) {
    const P = pose(t), { x, z, dir } = P, yaw = Math.atan2(dir[0], dir[1]), wb = v.wheelbase, tr = v.track;
    const fx2 = dir[0] * wb / 2, fz = dir[1] * wb / 2, rx = -dir[1] * tr / 2, rz = dir[0] * tr / 2;
    const hf = G.h(x + fx2, z + fz), hb = G.h(x - fx2, z - fz), hl = G.h(x + rx, z + rz), hr = G.h(x - rx, z - rz);
    const pitch = Math.atan2(hf - hb, wb), roll = Math.atan2(hl - hr, tr);
    const heel = o.rail ? 0 : clamp(4 * P.v * P.v * P.kappa / 9.81, -2.5, 2.5) * DEG;
    holder.position.set(x, (hf + hb + hl + hr) / 4 + (o.lift ?? 0), z);
    holder.rotation.set(0, 0, 0); holder.rotateY(yaw); holder.rotateX(-pitch); holder.rotateZ(roll + heel);
    v.update(t, { distance: P.s, steer: clamp(P.kappa * wb, -0.55, 0.55), speed: P.v, moving });
  }
  update(0);
  patchAll(root, ctx);
  const anchors = { body: holder, ...(v.anchors || {}) };
  return { root, snapped: true, radius: v.length / 2 + 1, height: v.height, update, anchors, length: v.length, beam: v.width,
    positionAt: (t) => { update(t); return holder.position.clone(); }, kin: { pose, get track() { return track; }, rmin },
    hooks: { dust: null } };
}

// ════════════════════════════════════ catalog + build ══════════════════════════════════════════════════════════════
const DRIVE = { at: '[x, z] start (ignored with road)', heading: 'deg compass (0 = north)', action: 'idle|drive', speed: 'm/s', path: '[[x, z], ...] waypoints (smoothed to the turning radius)', road: "'<id>' of a town.prague_1942: drive its lane instead of a path (the car stays ON the street)", lane: "right (default: right-hand traffic, 1939+) | left | track | metres from the centre", dir: '1 along the street (default) | -1 against it', from: 'm along the street where it starts', to: 'm along the street where it ends', start: 's: from rest at this time (eased)', stop: 'true: eases to rest at the path end', turn_radius: 'm' };
export const CATALOG = {
  'town.bohemian_village': { desc: 'Czech/Bohemian village c.1900-1945 round its long village green (naves): one-storey gable-fronted farmhouses with yard walls and arched gates, barns behind, a baroque church on the green (white plaster, ochre pilasters, west tower with clock, belfry and a dark onion helmet + lantern), frozen pond, bare lindens, snowy rutted roads; blackout = only `lit` windows glow; chimney smoke drifts; a lamp glows in the belfry at night. The occupied homeland at night in the snow.', params: { at: '[x, z] centre of the green', heading: 'deg compass of the green\'s long axis (default 90)', size: 'tiny|small|medium|large (green half-length 40|60|85|110 m)', seed: 'layout', snow: '0..1.2 (default: weather.snow, else 1)', lit: 'how many windows glow (blackout; default 5)', church: 'true|false', church_side: 'east|west (end of the green; east = +axis)', tower_glow: '0..1 lamp in the belfry at night (default 0.6)', smoke: '0..1 chimney smoke (default 0.7)', trees: '0..1 lindens (default 1)', pond: 'true|false' }, footprint: [260, 200], height: 38, tags: ['town', 'village', '1940s', 'czech', 'bohemia', 'snow', 'church', 'onion', 'baroque', 'protectorate', 'ww2'] },
  'landmark.prague_castle': { desc: 'Prague Castle (Hradcany) on its ridge as seen across the Vltava: the long pale south wing with rows of windows, St Vitus Cathedral rising behind it (the great south tower with its copper helmet and lantern ~99 m, the two needle west spires ~82 m, copper nave roof, flying buttresses), the Old Royal Palace roof, St George\'s twin towers, the Black Tower, palaces of Hradcany square, gardens and ramparts down the slope, the Lesser Town roofs and the St Nicholas dome below. Windows lit at dusk/night. Built at true scale (~680 m wide): film it from 400-1200 m.', params: { at: '[x, z] centre of the palace front (top of the ridge)', heading: 'deg compass the front faces (toward the river / the camera; default 180)', hill: 'm the ridge rises (default 52)', scale: '0.3..2 (default 1)', lit: '0..1 share of windows lit at night (default 0.18; 1942 blackout: 0.05)', floodlight: '0..1 warm floodlit facades (modern Prague; default 0)', lesser_town: 'true|false', snow: 'true: snow on roofs', seed: 'trees + houses' }, footprint: [680, 420], height: 151, tags: ['landmark', 'prague', 'castle', 'hradcany', 'cathedral', 'st vitus', 'czech', 'skyline', 'city'] },
  'town.prague_1942': { desc: 'a Prague street c.1900-1945: a canyon of 4-6 storey baroque / neo-renaissance / art-nouveau houses (stucco facades in ochre, cream, grey, salmon; recessed windows with surrounds, pediments, pilasters, cornices with modillions, mansards with dormers, shop fronts with sign boards, portals, some balconies), granite-sett carriageway, slab pavements on granite kerbs, double tram track with overhead contact wires on span wires, cast-iron gas lamps (lit at dusk: light pools + a few real lights), cross streets; bend for a curve (preset holesovice = the Heydrich attack curve: a sharp bend with an iron railing on stone posts and trees on the inside). Cars and trams follow it with road: <id>.', params: { at: '[x, z] middle of the street', heading: 'deg compass the street runs (default 90)', length: 'm (default 200)', width: 'carriageway m (default 11.5 with tram)', pavement: 'm (3.8)', bend: 'deg (+ right) or holesovice', bend_r: 'm (default 40)', preset: 'holesovice', storeys: '[min, max] (default [4, 6])', tram: 'true|false (rails + wires)', trams: '0..3 trams running in town (background)', lamps: 'true|false|dim (blackout)', lamp_lights: '0..6 real lights at the lamps nearest light_at (default 3)', light_at: '0..1 along the street (0.5)', lit: '0..1 windows lit at night (0.22)', shops_lit: '0..1', wet: '0..1 wet setts (rain)', snow: '0..1', cross: 'number of cross streets or [fractions]', inner: 'houses|railing (inside of the bend)', trees: '0|1', close: 'true|false (default true: a cross street + a row of houses closes both ends, no void down the street)', seed: 'houses' }, footprint: [40, 200], height: 30, tags: ['town', 'street', 'city', 'prague', '1940s', 'czech', 'tram', 'cobbles', 'baroque', 'art nouveau', 'protectorate', 'ww2', 'holesovice'] },
  'vehicle.mercedes_320': { desc: 'Mercedes-Benz 320 open staff car (W142 Cabriolet B, Heydrich\'s car): long bonnet with louvres, upright chrome radiator with the star, separate sweeping front fenders running into running boards, bowl headlamps with blackout slits, chrome bumpers, raked windscreen, folded top (or up), red leather seats, whitewall tyres with chrome hubcaps, spare on the tail, two fender flags that flutter with speed; seated faceless riders (default 2: driver + officer in peaked caps). Drives a path or a Prague street lane (road: <town id>).', actions: ['idle', 'drive'], params: { ...DRIVE, color: 'hex (default very dark green #101814; black #0c0c0d)', interior: 'hex leather (default red)', top: 'down|up', flags: 'true|false', flag_color: 'hex', riders: '0..4 or [{kit, headwear, colors} | castRef]', lights: 'auto|true|false (blackout slits)' }, footprint: [1.75, 5.1], height: 1.48, tags: ['vehicle', 'car', '1940s', 'mercedes', 'staff car', 'heydrich', 'open car', 'ww2', 'germany'] },
  'vehicle.tram_prague': { desc: '1930s Prague tram (two-axle motor car): dark red lower panels, cream window band and letterboard, curved platform dashes, clerestory roof, route box, trolley pole on the 5.65 m contact wire, saloon lit warm at dusk, occasional blue sparks at the trolley wheel. Runs a path or a Prague street track (road: <town id>, track 0|1).', actions: ['idle', 'drive'], params: { ...DRIVE, track: '0 (right-hand track for its direction) | 1', color: 'hex lower panels', trim: 'hex cream', sparks: '0..1 (default 0.6)' }, footprint: [2.1, 9.6], height: 3.4, tags: ['vehicle', 'tram', 'streetcar', 'prague', '1930s', '1940s', 'czech'] },
};
export async function build(kind, item = {}, ctx = {}) {
  noiseTex();
  let res;
  if (kind === 'town.bohemian_village') res = bohemianVillage(kind, item, ctx);
  else if (kind === 'landmark.prague_castle') res = pragueCastle(kind, item, ctx);
  else if (kind === 'town.prague_1942') res = pragueStreet(kind, item, ctx);
  else if (kind === 'vehicle.mercedes_320') { const v = buildMercedes({ ...item, seed: item.seed }, ctx); return driven(kind, item, ctx, v, { speed: 11 }); }
  else if (kind === 'vehicle.tram_prague') { const v = buildTram({ ...item, lit: true }); return driven(kind, item, ctx, v, { speed: 6, rail: true, lift: 0.07 }); }
  else throw new Error('places_cz: unknown kind ' + kind);
  patchAll(res.root, ctx);
  res.update(0, 0, null);
  return res;
}
