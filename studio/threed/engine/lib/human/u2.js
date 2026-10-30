// u2.js — aircraft.u2: the Lockheed U-2C high-altitude spy plane of the CIA ("Article 360", Francis Gary Powers, shot
// down near Sverdlovsk on 1 May 1960). Not a module (vehicles.js builds it; its catalog entry is look-gated to NOCTURNE).
// Built for the hero shots a documentary needs: the long slim fuselage with its pointed nose, the small bubble canopy
// with the pilot's pressure helmet inside, the dorsal spine, the half-round intakes, the glider-like straight wing
// (24.4 m span, high aspect ratio, flexing up in flight, titanium skids at the tips), the swept fin and small
// tailplane, the J57 nozzle; bicycle gear with the wing "pogos" when parked. Unmarked natural metal (livery metal) or
// the later dark "sea blue" (livery black), panel seams in an object-space shader. An optional long contrail, and the
// SHOOT-DOWN (hit: t): an SA-2 climbing from below-behind on a white smoke trail, its proximity burst behind the tail
// (flash, light, a dark expanding cloud, fragments), the tail breaking away, the nose dropping, the outer wings
// folding up and tearing off, the airframe tumbling. Model faces +Z (nose), +X = port; the group origin is the ground
// contact under the main wheels (idle alt 0 = parked), the fuselage axis 1.35 m above it. Deterministic in t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMaterial } from '../shared/env.js';
import { plain } from '../shared/materials.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const U2_AXIS = 1.35;                       // the fuselage axis above the ground contact (gear down)

// ── the skin: natural aluminium (or dark sea blue), panel seams, rivet lines (object space) ─────────────────────────
const SKIN_GLSL = /* glsl */`
varying vec3 vUP; varying vec3 vUN;
float uRough;
float uH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float uN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(uH(i), uH(i + vec2(1.0, 0.0)), u.x), mix(uH(i + vec2(0.0, 1.0)), uH(i + vec2(1.0, 1.0)), u.x), u.y); }
float uSeam(float v, float w){ float d = abs(fract(v) - 0.5); float fw = fwidth(v) * 1.3 + w; return smoothstep(0.5 - fw, 0.5, d); }
void uSkin(inout vec3 col){
  vec3 P = vUP, N = normalize(vUN);
#if U_BLACK == 1
  vec3 base = vec3(0.028, 0.032, 0.042);
#else
  vec3 base = vec3(0.50, 0.51, 0.52);
#endif
  float fade = uN(P.xz * 0.6 + 2.0) * 0.6 + uN(P.zy * 1.7) * 0.4;
  float panel = uH(floor(vec2(P.z / 0.9 + P.x * 0.13, P.y / 0.6 + P.x / 1.4)) + 0.5);
#if U_MODE == 1
  float seam = 0.6 * max(uSeam(P.x / 1.25, 0.003), uSeam(P.z / 0.62, 0.002));
  panel = uH(floor(vec2(P.x / 1.25, P.z / 0.62)) + 0.5);
#else
  float seam = max(uSeam(P.z / 0.9, 0.004), uSeam((P.y + P.x * 0.2) / 0.6, 0.003) * step(0.45, abs(N.x)));
#endif
  col = base * (0.86 + 0.22 * fade) * (1.0 - 0.12 * seam) * (0.94 + 0.12 * panel);
  uRough = 0.08 * seam + (panel - 0.5) * 0.12;
}`;
function skinMat(mode, black) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: black ? 0.55 : 0.34, metalness: black ? 0.2 : 0.72, envMapIntensity: black ? 0.6 : 1.0 });
  m.userData.progKey = 'u2-skin-' + mode + (black ? 'b' : 'm');
  return patchMaterial(m, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vUP; varying vec3 vUN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvUP = position; vUN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n#define U_MODE ${mode}\n#define U_BLACK ${black ? 1 : 0}\n${SKIN_GLSL}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nuSkin(diffuseColor.rgb);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + uRough, 0.05, 1.0);');
  });
}

// ── geometry helpers (as b25.js) ───────────────────────────────────────────────────────────────────────────────────
function loft(st, n = 28, e = 2.2, capA = true, capB = true) {
  const pos = [], idx = [];
  for (const s of st) {
    const cy = (s.top + s.bot) / 2, hh = Math.max(1e-3, (s.top - s.bot) / 2), w = Math.max(1e-3, s.w), ee = s.e ?? e;
    for (let j = 0; j < n; j++) {
      const a = j / n * TAU, c = Math.cos(a), sn = Math.sin(a);
      pos.push(w * Math.sign(c) * Math.pow(Math.abs(c), 2 / ee), cy + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / ee), s.z);
    }
  }
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n;
    if (st[i].z > st[i + 1].z) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const cap = (i, flip) => {
    const s = st[i], k = pos.length / 3; pos.push(0, (s.top + s.bot) / 2, s.z);
    for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n; if (flip) idx.push(k, b, a); else idx.push(k, a, b); }
  };
  const desc = st[0].z > st[st.length - 1].z;
  if (capA) cap(0, !desc); if (capB) cap(st.length - 1, desc);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function section(le, c, y, t, m = 16) {
  const out = [];
  for (let k = 0; k <= m; k++) {
    const u = 1 - k / m, uu = u * u;
    const th = 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * uu + 0.2843 * uu * u - 0.1036 * uu * uu);
    out.push([le - u * c, y + th * c * 1.05]);
  }
  for (let k = 1; k < m; k++) {
    const u = k / m, uu = u * u;
    const th = 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * uu + 0.2843 * uu * u - 0.1036 * uu * uu);
    out.push([le - u * c, y - th * c * 0.75]);
  }
  return out;
}
function wingLoft(stations, m = 16, capTip = true) {
  const pos = [], idx = [], ring = 2 * m;
  for (const s of stations) for (const [z, y] of section(s.le, s.c, s.y, s.t, m)) pos.push(s.x, y, z);
  for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, c = a + ring, d = b + ring;
    idx.push(a, b, c, b, d, c);
  }
  if (capTip) {
    const i = stations.length - 1, s = stations[i], k = pos.length / 3; pos.push(s.x, s.y, s.le - s.c * 0.4);
    for (let j = 0; j < ring; j++) idx.push(k, i * ring + j, i * ring + (j + 1) % ring);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function mirrorX(g) {
  g = g.clone(); g.scale(-1, 1, 1);
  if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; }
  g.computeVertexNormals(); return g;
}
function rod(a, b, r, seg = 8, r2 = null) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r2 ?? r, r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return g.translate(A.x, A.y, A.z);
}
const ix = (g) => { if (g.index === null) g.setIndex([...Array(g.attributes.position.count).keys()]); if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.normal === undefined) g.computeVertexNormals(); return g; };
const merge = (list) => mergeGeometries(list.map((g) => ix(g)));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// soft round sprite textures (smoke puff with a ragged edge, a hot flash core)
let PUFF = null, FLASH = null, SHARD = null;
function shardTex() {                                   // a jagged dark sliver (debris), soft-edged
  if (SHARD) return SHARD;
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.clearRect(0, 0, S, S); g.fillStyle = 'rgba(255,255,255,1)'; g.beginPath();
  g.moveTo(S * 0.18, S * 0.62); g.lineTo(S * 0.46, S * 0.2); g.lineTo(S * 0.86, S * 0.34); g.lineTo(S * 0.6, S * 0.52); g.lineTo(S * 0.72, S * 0.84); g.closePath(); g.fill();
  SHARD = new THREE.CanvasTexture(c); SHARD.colorSpace = THREE.SRGBColorSpace; return SHARD;
}
function puffTex() {
  if (PUFF) return PUFF;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const R = rng(7);
  g.clearRect(0, 0, S, S);
  // many small soft blobs in a gaussian cluster: a cauliflower puff whose edge frays out (no hard disc)
  for (let k = 0; k < 140; k++) {
    const a = R() * TAU, r = Math.abs((R() + R() + R()) / 3 - 0.5) * 2 * S * 0.3, x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const rr = S * (0.05 + R() * 0.09) * (1 - 0.5 * r / (S * 0.3));
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  // fade the whole puff to nothing well inside the square
  g.globalCompositeOperation = 'destination-in';
  const fo = g.createRadialGradient(S / 2, S / 2, S * 0.12, S / 2, S / 2, S * 0.5);
  fo.addColorStop(0, 'rgba(0,0,0,1)'); fo.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fo; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-over';
  PUFF = new THREE.CanvasTexture(c); PUFF.colorSpace = THREE.SRGBColorSpace; return PUFF;
}
function flashTex() {
  if (FLASH) return FLASH;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.18, 'rgba(255,214,140,0.95)'); gr.addColorStop(0.45, 'rgba(255,120,40,0.35)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  FLASH = new THREE.CanvasTexture(c); FLASH.colorSpace = THREE.SRGBColorSpace; return FLASH;
}

// ── the airframe (U-2C) ─────────────────────────────────────────────────────────────────────────────────────────
const FUS = [                                            // z, half width, top, bottom (axis y 0); nose +7.55 .. nozzle -7.5
  { z: 7.55, w: 0.02, top: 0.0, bot: -0.03 }, { z: 7.25, w: 0.17, top: 0.12, bot: -0.18 }, { z: 6.7, w: 0.33, top: 0.3, bot: -0.36 },
  { z: 5.9, w: 0.47, top: 0.45, bot: -0.5 }, { z: 4.9, w: 0.56, top: 0.55, bot: -0.6 }, { z: 3.6, w: 0.6, top: 0.6, bot: -0.64 },
  { z: 1.8, w: 0.62, top: 0.62, bot: -0.64 }, { z: 0.0, w: 0.6, top: 0.6, bot: -0.6 }, { z: -2.0, w: 0.52, top: 0.52, bot: -0.5 },
  { z: -4.2, w: 0.42, top: 0.42, bot: -0.38 }, { z: -6.0, w: 0.33, top: 0.33, bot: -0.3 }, { z: -7.1, w: 0.29, top: 0.29, bot: -0.27 },
  { z: -7.45, w: 0.27, top: 0.27, bot: -0.25 },
];
const SPLIT_Z = -4.6;                                    // where the tail breaks away in the shoot-down
const SPINE = [                                          // the dorsal spine behind the canopy
  { z: 4.0, w: 0.2, top: 0.62, bot: 0.4, e: 2.4 }, { z: 3.4, w: 0.3, top: 0.86, bot: 0.4, e: 2.6 }, { z: 1.6, w: 0.32, top: 0.86, bot: 0.4, e: 2.6 },
  { z: -0.8, w: 0.26, top: 0.74, bot: 0.4, e: 2.4 }, { z: -3.2, w: 0.14, top: 0.52, bot: 0.3, e: 2.2 },
];
const CANOPY = [                                         // the small bubble canopy over the cockpit
  { z: 5.75, w: 0.12, top: 0.5, bot: 0.38, e: 2 }, { z: 5.45, w: 0.33, top: 0.86, bot: 0.38, e: 2.2 }, { z: 4.95, w: 0.4, top: 1.0, bot: 0.38, e: 2.4 },
  { z: 4.4, w: 0.38, top: 0.98, bot: 0.38, e: 2.4 }, { z: 4.0, w: 0.26, top: 0.84, bot: 0.38, e: 2.2 },
];
const INTAKE = [                                         // a half-round intake lofted along the side (x>0 side; mirrored)
  { z: 3.55, w: 0.2, top: 0.3, bot: -0.12, e: 2.2 }, { z: 3.2, w: 0.27, top: 0.36, bot: -0.18, e: 2.3 }, { z: 2.2, w: 0.27, top: 0.36, bot: -0.18, e: 2.3 },
  { z: 0.9, w: 0.17, top: 0.28, bot: -0.1, e: 2.2 }, { z: 0.0, w: 0.04, top: 0.16, bot: 0.04, e: 2 },
];
const INTAKE_X = 0.6;
const WING_SPAN = 12.2;
function wingStations(flex) {                           // straight glider wing, slight taper; flex = tip rise m
  const S = [];
  const pts = [[0.55, 1.42, 3.05, 0.15], [2.4, 1.32, 2.72, 0.145], [5.0, 1.12, 2.2, 0.135], [8.0, 0.9, 1.7, 0.12], [10.6, 0.72, 1.32, 0.105], [WING_SPAN, 0.6, 1.08, 0.09]];
  for (const [x, le, c, t] of pts) { const u = x / WING_SPAN; S.push({ x, le, c, y: 0.04 + flex * u * u, t }); }
  return S;
}
const TAILPLANE = [{ x: 0.25, le: -5.72, c: 1.3, y: 0.08, t: 0.1 }, { x: 3.1, le: -6.3, c: 0.72, y: 0.12, t: 0.08 }];
function finShape() {                                    // the swept fin (side view, x = aft from the root LE, y up)
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(2.75, 0); s.lineTo(2.85, 0.25); s.lineTo(2.6, 2.05); s.quadraticCurveTo(2.45, 2.18, 2.2, 2.18);
  s.lineTo(1.65, 2.18); s.quadraticCurveTo(1.5, 2.16, 1.42, 2.02); s.lineTo(0.0, 0.18); s.closePath();
  return s;
}

// o: {livery: 'metal'|'black', gear: 'auto'|'down'|'up', flex (m tip rise in flight, default 0.55), pilot (bool),
//     contrail (bool | length m), hit (s: the SA-2 proximity burst), speed (m/s, for the world-fixed trails)}
export function buildU2(o = {}) {
  const group = new THREE.Group(); group.name = 'u2';
  const body = new THREE.Group(); body.name = 'u2.body'; body.position.y = U2_AXIS; group.add(body);
  const air = new THREE.Group(); air.name = 'u2.airframe'; body.add(air);          // tumbles in the shoot-down
  const tailG = new THREE.Group(); tailG.name = 'u2.tail'; tailG.position.z = SPLIT_Z; air.add(tailG);   // breaks away (pivot at the split)
  const tailIn = new THREE.Group(); tailIn.position.z = -SPLIT_Z; tailG.add(tailIn);
  const wingLG = new THREE.Group(); wingLG.name = 'u2.wing_out_l'; air.add(wingLG); // the outer wings fold + tear off
  const wingRG = new THREE.Group(); wingRG.name = 'u2.wing_out_r'; air.add(wingRG);
  const black = String(o.livery || 'metal') === 'black';
  const fusM = skinMat(0, black), wingM = skinMat(1, black);
  const dark = plain({ color: 0x0A0A0B, roughness: 0.7 });
  const metal = plain({ color: 0x3A3C40, roughness: 0.4, metalness: 0.7 });
  const tyre = plain({ color: 0x111111, roughness: 0.9 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x1A222A, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, envMapIntensity: 1.6, depthWrite: true });
  patchMaterial(glassM);
  const suitM = plain({ color: 0x5E5A44, roughness: 0.85 });
  const helmM = plain({ color: 0xB8B4A6, roughness: 0.45, metalness: 0.1 });
  const visorM = plain({ color: 0x0D1014, roughness: 0.1, metalness: 0.5 });
  const add = (g, m, name, parent = air) => { const x = new THREE.Mesh(g, m); x.name = name; x.castShadow = x.receiveShadow = true; parent.add(x); return x; };

  // fuselage: the front (to the split) on the airframe, the aft cone + nozzle on the tail group
  const iSplit = FUS.findIndex((s) => s.z < SPLIT_Z);
  const sz = (a, b, u) => ({ z: lerp(a.z, b.z, u), w: lerp(a.w, b.w, u), top: lerp(a.top, b.top, u), bot: lerp(a.bot, b.bot, u) });
  const cut = sz(FUS[iSplit - 1], FUS[iSplit], (FUS[iSplit - 1].z - SPLIT_Z) / (FUS[iSplit - 1].z - FUS[iSplit].z));
  add(loft([...FUS.slice(0, iSplit), cut], 32, 2.15, true, true), fusM, 'u2.fuselage');
  add(loft([cut, ...FUS.slice(iSplit)], 32, 2.15, true, false), fusM, 'u2.tailcone', tailIn);
  const nz = FUS[FUS.length - 1];
  add(new THREE.TorusGeometry(nz.w * 0.92, 0.035, 6, 28).translate(0, (nz.top + nz.bot) / 2, nz.z), metal, 'u2.nozzle_lip', tailIn);
  add(new THREE.CircleGeometry(nz.w * 0.9, 28).rotateY(Math.PI).translate(0, (nz.top + nz.bot) / 2, nz.z + 0.05), dark, 'u2.nozzle', tailIn);
  add(loft(SPINE, 24, 2.4, true, true), fusM, 'u2.spine');
  add(loft(CANOPY, 28, 2.2, true, true), glassM, 'u2.canopy');
  { // canopy frame: the bow at the windscreen + a sill rail
    const fr = [new THREE.TorusGeometry(1, 0.016, 4, 24, Math.PI).scale(0.34, 0.47, 1).translate(0, 0.39, 5.45)];
    for (const sx of [-1, 1]) fr.push(rod([sx * 0.38, 0.4, 5.6], [sx * 0.36, 0.4, 4.0], 0.018, 4));
    add(merge(fr), dark, 'u2.canopy_frame');
  }
  if (o.pilot !== false) {                               // Powers in a partial pressure suit + helmet (reads through the bubble)
    add(new THREE.SphereGeometry(0.17, 18, 12).scale(1, 1.08, 1.12).translate(0, 0.66, 4.72), helmM, 'u2.pilot_helmet');
    add(new THREE.SphereGeometry(0.18, 18, 10, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.3, Math.PI * 0.42).scale(1, 1.06, 1.12).translate(0, 0.66, 4.72), visorM, 'u2.pilot_visor');
    add(new THREE.CylinderGeometry(0.2, 0.25, 0.4, 12).translate(0, 0.38, 4.55), suitM, 'u2.pilot_body');
  }
  for (const s of [1, -1]) {                             // intakes + their dark mouths
    const g = loft(INTAKE, 20, 2.3, false, true).translate(INTAKE_X, 0.06, 0);
    const gi = s > 0 ? g : mirrorX(g);
    add(gi, fusM, 'u2.intake');
    add(new THREE.CircleGeometry(1, 20).scale(0.19, 0.22, 1).translate(s * INTAKE_X, 0.15, INTAKE[0].z + 0.01), dark, 'u2.intake_mouth');
  }
  add(rod([0, -0.6, 2.6], [0, -0.92, 2.45], 0.02, 5), dark, 'u2.antenna');                      // the belly blade
  add(new THREE.BoxGeometry(0.5, 0.06, 1.4).translate(0, -0.62, 3.2), dark, 'u2.q_bay');            // the camera bay hatch line

  // the wing: inner panels on the airframe, outer panels (x > OUT_X) on their own groups (folding pivot at OUT_X)
  const flex = Number.isFinite(+o.flex) ? +o.flex : 0.55;
  const OUT_X = 6.2;
  const WS = wingStations(flex);
  const inner = WS.filter((s) => s.x <= OUT_X), outer = WS.filter((s) => s.x >= OUT_X);
  const mid = (() => { const a = WS.find((s, i) => WS[i + 1] && WS[i + 1].x > OUT_X), b = WS[WS.indexOf(a) + 1], u = (OUT_X - a.x) / (b.x - a.x);
    return { x: OUT_X, le: lerp(a.le, b.le, u), c: lerp(a.c, b.c, u), y: lerp(a.y, b.y, u), t: lerp(a.t, b.t, u) }; })();
  const gIn = wingLoft([...inner, mid], 18, true), gOut = wingLoft([mid, ...outer], 18, true);
  add(gIn, wingM, 'u2.wing_l'); add(mirrorX(gIn), wingM, 'u2.wing_r');
  // the outer panels are built about the pivot (OUT_X, mid.y, mid.le - mid.c/2) so they can fold
  const PIV = [OUT_X, mid.y, mid.le - mid.c * 0.5];
  wingLG.position.set(PIV[0], PIV[1], PIV[2]); wingRG.position.set(-PIV[0], PIV[1], PIV[2]);
  add(gOut.clone().translate(-PIV[0], -PIV[1], -PIV[2]), wingM, 'u2.wing_out', wingLG);
  add(mirrorX(gOut).translate(PIV[0], -PIV[1], -PIV[2]), wingM, 'u2.wing_out', wingRG);
  for (const [G, s] of [[wingLG, 1], [wingRG, -1]]) {     // the titanium tip skids (curved down under the tip)
    const tip = WS[WS.length - 1];
    const sk = []; const tx = tip.x - 0.12, z0 = tip.le - 0.15, z1 = tip.le - tip.c + 0.12, y = tip.y - 0.06;
    sk.push(rod([0, y, z0], [0, y - 0.12, (z0 + z1) / 2], 0.022, 5)); sk.push(rod([0, y - 0.12, (z0 + z1) / 2], [0, y, z1], 0.022, 5));
    add(merge(sk).translate(s * tx - (s > 0 ? PIV[0] : -PIV[0]), -PIV[1], -PIV[2]), metal, 'u2.skid', G);
  }

  // tail: small tailplane + the swept fin (on the tail group)
  const tp = wingLoft(TAILPLANE, 12);
  add(tp, wingM, 'u2.tailplane_l', tailIn); add(mirrorX(tp), wingM, 'u2.tailplane_r', tailIn);
  const fin = new THREE.ExtrudeGeometry(finShape(), { depth: 0.11, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
  fin.translate(0, 0, -0.055); fin.rotateY(Math.PI / 2);       // shape x -> -z (aft)
  add(fin.translate(0, 0.24, -4.5), fusM, 'u2.fin', tailIn);

  // gear: the main bicycle unit forward, the tail wheels, the wing pogos (parked only)
  const gearG = new THREE.Group(); gearG.name = 'u2.gear'; air.add(gearG);
  const gm = [], gt = [];
  gm.push(rod([0, -0.6, 2.2], [0, -U2_AXIS + 0.42, 2.2], 0.07, 8)); gt.push(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 20).rotateZ(Math.PI / 2).translate(0.13, -U2_AXIS + 0.42, 2.2), new THREE.CylinderGeometry(0.42, 0.42, 0.2, 20).rotateZ(Math.PI / 2).translate(-0.13, -U2_AXIS + 0.42, 2.2));
  gm.push(rod([0, -0.3, -5.2], [0, -U2_AXIS + 0.18 + 0.55, -5.25], 0.04, 6)); gt.push(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 14).rotateZ(Math.PI / 2).translate(0, -U2_AXIS + 0.18 + 0.55, -5.25));
  add(merge(gm), metal, 'u2.struts', gearG); add(merge(gt), tyre, 'u2.tyres', gearG);
  const pogoG = new THREE.Group(); pogoG.name = 'u2.pogos'; air.add(pogoG);
  for (const s of [1, -1]) {
    const x = s * 6.0, wy = 0.04 + flex * 0 + 0.02;
    add(rod([x, wy - 0.05, 0.1], [x, -U2_AXIS + 0.15, 0.1], 0.035, 6), metal, 'u2.pogo', pogoG);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12).rotateZ(Math.PI / 2).translate(x, -U2_AXIS + 0.15, 0.1), tyre, 'u2.pogo_wheel', pogoG);
  }

  // anchors
  const anchors = {};
  const A = (k, x, y, z, parent = air) => { const a = new THREE.Object3D(); a.name = 'anchor:' + k; a.position.set(x, y, z); parent.add(a); anchors[k] = a; };
  A('nose', 0, 0, 7.4); A('cockpit', 0, 0.72, 4.75); A('canopy', 0, 1.0, 4.9); A('tail', 0, 1.6, -6.6, tailIn); A('nozzle', 0, 0.0, -7.5, tailIn);
  A('wing_l', 9.0, 0.3, 0.3); A('wing_r', -9.0, 0.3, 0.3); A('wingtip_l', WING_SPAN, flex, 0.0); A('wingtip_r', -WING_SPAN, flex, 0.0); A('belly', 0, -0.65, 1.5);

  // contrail: a long soft white trail from the nozzle (local -Z), widening and fading with distance
  let trail = null;
  if (o.contrail) {
    const L = Number.isFinite(+o.contrail) && +o.contrail > 20 ? +o.contrail : 420, GAP = 40;
    const n = 64, pos = [], col = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, z = -7.6 - GAP - u * L, w = 0.6 + u * 7.5, a = (1 - u) * sstep(0, 0.06, u);   // condensation forms ~40 m aft
      for (const s of [-1, 1]) { pos.push(s * w, 0, z); col.push(1, 1, 1, a); }
    }
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ color: 0xE8ECF2, vertexColors: true, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide, fog: true });   // < 0.35: out of the camera's hull
    const h = new THREE.Mesh(g, m); h.name = 'u2.contrail'; h.userData.noQA = true; h.castShadow = false;
    const v = h.clone(); v.rotation.z = Math.PI / 2;                    // a cross of two ribbons reads from any side
    trail = new THREE.Group(); trail.add(h, v); trail.position.set(0, 0, 0); body.add(trail);
  }

  // ── the shoot-down (hit: t) ──────────────────────────────────────────────────────────────────────────────────
  const hit = Number.isFinite(+o.hit) ? +o.hit : null;
  const V = Number.isFinite(+o.speed) ? +o.speed : 210;          // the plane's own speed: world-fixed things stream aft at V
  const fx = new THREE.Group(); fx.name = 'u2.shootdown'; body.add(fx);  // in body space, NOT tumbling with the airframe
  let fxUpd = () => {};
  if (hit !== null) {
    const R = rng(1960);
    const B = new THREE.Vector3(4.0, -3.0, -19);                  // the burst point relative to the plane at `hit` (~12 m aft of the tail)
    const M0 = new THREE.Vector3(260, -2400, -1900), MC = new THREE.Vector3(120, -700, -700);   // the missile's approach (relative)
    const TA = 2.6;                                               // seconds of climb shown before the burst
    const DRIFT = 0.08;                                           // the burst recedes at 0.08 x V from the decelerating wreck
    const head = (u) => { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; return new THREE.Vector3(a * M0.x + b * MC.x + c * B.x, a * M0.y + b * MC.y + c * B.y, a * M0.z + b * MC.z + c * B.z); };
    // the missile body: a slim white dart with fins + a hot exhaust sprite
    const mis = new THREE.Group(); mis.name = 'u2.sa2';          // sprites only: no mesh may sit kilometres from the hull
    const body2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex(), color: 0xBFC4C8, transparent: true, depthWrite: false, opacity: 0.9 }));
    body2.scale.set(3.2, 3.2, 1); body2.userData.noQA = true; mis.add(body2);
    const exh = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex(), color: 0xFFE2B0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    exh.scale.set(11, 11, 1); exh.position.set(0, 0, -3.6); exh.userData.noQA = true; mis.add(exh);
    mis.visible = false; fx.add(mis);
    // the smoke trail as one soft tube along the world-fixed climb, thickening with age (rebuilt every frame; opacity
    // < 0.35 keeps it out of the camera's hull) + a few billows on it for texture
    const trailM = new THREE.MeshBasicMaterial({ color: 0xE4E6E8, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const trailMesh = new THREE.Mesh(new THREE.BufferGeometry(), trailM); trailMesh.name = 'u2.sa2_trail'; trailMesh.userData.noQA = true; trailMesh.frustumCulled = false; trailMesh.visible = false; fx.add(trailMesh);
    const trailCore = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.34, depthWrite: false })); trailCore.userData.noQA = true; trailCore.frustumCulled = false; trailCore.visible = false; fx.add(trailCore);
    const NS = 72;
    const buildTrail = (t) => {
      const ta = t - (hit - TA), uNow = clamp(ta / TA);
      if (ta <= 0.05) { trailMesh.visible = trailCore.visible = false; return; }
      const pts = [], radii = [];
      for (let i = 0; i <= NS; i++) {
        const u = uNow * i / NS, te = hit - TA + u * TA, age = t - te, p = head(u);
        pts.push(new THREE.Vector3(p.x, p.y + age * 1.5, p.z - V * age)); radii.push(1.4 + age * 4.0);
      }
      const ring = 10, pos = [], idx = [];
      for (let i = 0; i <= NS; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(NS, i + 1)], d = b.clone().sub(a).normalize();
        const n1 = new THREE.Vector3(0, 1, 0).cross(d); if (n1.lengthSq() < 1e-6) n1.set(1, 0, 0); n1.normalize(); const n2 = d.clone().cross(n1).normalize();
        for (let j = 0; j < ring; j++) { const q = j / ring * TAU, r = radii[i]; pos.push(pts[i].x + (n1.x * Math.cos(q) + n2.x * Math.sin(q)) * r, pts[i].y + (n1.y * Math.cos(q) + n2.y * Math.sin(q)) * r, pts[i].z + (n1.z * Math.cos(q) + n2.z * Math.sin(q)) * r); }
      }
      for (let i = 0; i < NS; i++) for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + (j + 1) % ring, c = a + ring, d = b + ring; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      trailMesh.geometry.dispose(); trailMesh.geometry = g; trailMesh.visible = true;
      const gc = g.clone(); const P = gc.attributes.position;
      for (let i = 0; i <= NS; i++) for (let j = 0; j < ring; j++) { const k = i * ring + j; P.setXYZ(k, pts[i].x + (P.getX(k) - pts[i].x) * 0.45, pts[i].y + (P.getY(k) - pts[i].y) * 0.45, pts[i].z + (P.getZ(k) - pts[i].z) * 0.45); }
      trailCore.geometry.dispose(); trailCore.geometry = gc; trailCore.visible = true;
      const fade = 1 - sstep(4, 12, t - hit);
      trailM.opacity = 0.3 * fade; trailCore.material.opacity = 0.34 * fade;
    };
    // the smoke trail: world-fixed puffs emitted along the climb
    const NT = 46, puffs = [];
    for (let i = 0; i < NT; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0xD6D8DA, transparent: true, depthWrite: false, opacity: 0 }));
      sp.userData.noQA = true; sp.userData.te = hit - TA + (i / (NT - 1)) * TA; sp.userData.rot = R() * TAU; sp.material.rotation = sp.userData.rot; sp.visible = false; fx.add(sp); puffs.push(sp);
    }
    // the burst: flash + light + dark cloud + fragments
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex(), color: 0xFFFFFF, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flash.userData.noQA = true; flash.visible = false; fx.add(flash);
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0xFF7A22, transparent: true, depthWrite: false, opacity: 0 }));
    fire.userData.noQA = true; fire.visible = false; fx.add(fire);
    const light = new THREE.PointLight(0xFFB070, 0, 400, 1.6); fx.add(light);
    const NC = 120, cloud = [];
    for (let i = 0; i < NC; i++) {
      const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize().multiplyScalar(0.3 + R() * 0.7);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: i % 3 === 0 ? 0x4A4038 : (i % 3 === 1 ? 0x2A2622 : 0x36322E), transparent: true, depthWrite: false, opacity: 0 }));
      sp.userData = { noQA: true, d, s0: 2 + R() * 4, rot: R() * TAU, k: 0.5 + R() * 1.0 }; sp.material.rotation = sp.userData.rot; sp.visible = false; fx.add(sp); cloud.push(sp);
    }
    const NF = 70, frags = [];
    const fragM = new THREE.SpriteMaterial({ map: shardTex(), color: 0x101010, transparent: true, opacity: 0.95, depthWrite: false });   // sprites: never in the hull
    for (let i = 0; i < NF; i++) {
      const m = new THREE.Sprite(fragM); m.userData = { noQA: true, d: new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), v: 90 + R() * 220, spin: new THREE.Vector3(R(), R(), R()) };
      const k = 0.35 + R() * 0.9; m.scale.set(k, k * (0.5 + R() * 0.5), 1); m.material = fragM.clone(); m.material.rotation = R() * TAU; m.visible = false; fx.add(m); frags.push(m);
    }
    fxUpd = (t) => {
      buildTrail(t);
      const ta = t - (hit - TA);
      // the missile climbing (relative to the plane; it closes from below-behind)
      if (ta >= 0 && t < hit) {
        const u = clamp(ta / TA), p = head(u), q = head(Math.min(1, u + 0.02));
        const dir = q.clone().sub(p).multiplyScalar(1 / (0.02 * TA)).add(new THREE.Vector3(0, 0, V));   // its world velocity
        mis.visible = true; mis.position.copy(p); mis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
        exh.position.copy(dir.clone().normalize().multiplyScalar(-3.6)).applyQuaternion(mis.quaternion.clone().invert());
        exh.material.opacity = 0.8 + 0.2 * Math.sin(t * 90);
      } else mis.visible = false;
      for (const sp of puffs) {                                   // each puff stays where it was emitted (in the world)
        const te = sp.userData.te, age = t - te;
        if (age < 0 || ta < 0) { sp.visible = false; continue; }
        const u = clamp((te - (hit - TA)) / TA), p = head(u);
        sp.visible = true; sp.position.set(p.x, p.y + age * 1.5, p.z - V * age);
        const s = 4 + age * 7.0; sp.scale.set(s, s, 1);
        sp.material.opacity = 0.7 * sstep(0, 0.08, age) * (1 - sstep(4, 14, age));
      }
      const tb = t - hit;
      if (tb >= 0) {
        const bx = B.x, by = B.y + tb * 0.8, bz = B.z - DRIFT * V * tb;
        flash.visible = tb < 0.5; flash.position.set(bx, by, bz);
        const fs = 26 + 70 * sstep(0, 0.12, tb); flash.scale.set(fs, fs, 1); flash.material.opacity = 1 - sstep(0.05, 0.45, tb);
        light.position.set(bx, by, bz); light.intensity = 9000 * (1 - sstep(0.0, 0.6, tb));
        fire.visible = tb < 1.6; fire.position.set(bx, by, bz); const fr = 18 + 34 * sstep(0, 0.4, tb); fire.scale.set(fr, fr, 1);
        fire.material.opacity = sstep(0, 0.04, tb) * (1 - sstep(0.35, 1.5, tb)); fire.material.color.setRGB(1, lerp(0.55, 0.2, sstep(0, 0.8, tb)), lerp(0.2, 0.05, sstep(0, 0.8, tb)));
        for (const sp of cloud) {
          const g = 1 - Math.exp(-tb * 2.2), r = 30 * g;
          sp.visible = true; sp.position.set(bx + sp.userData.d.x * r, by + sp.userData.d.y * r + tb * 1.2, bz + sp.userData.d.z * r);
          const s = sp.userData.s0 + 13 * g * sp.userData.k; sp.scale.set(s, s, 1); sp.material.rotation = sp.userData.rot + tb * 0.15 * (sp.userData.k - 1);
          sp.material.opacity = 0.5 * sstep(0.02, 0.18, tb) * (1 - sstep(6, 16, tb));
        }
        for (const f of frags) {
          const d = f.userData.d, r = f.userData.v * (1 - Math.exp(-tb * 1.6)) / 1.6;
          f.visible = tb < 6; f.position.set(bx + d.x * r, by + d.y * r - 4.9 * tb * tb * 0.2, bz + d.z * r);

        }
      } else {
        flash.visible = false; fire.visible = false; light.intensity = 0;
        for (const sp of cloud) sp.visible = false; for (const f of frags) f.visible = false;
      }
    };
  }

  // solid: the airframe as boxes in group space -> top y or 0 (the camera probe may come close: cockpit, intake, tail)
  const SOL = [[-0.7, 0.7, U2_AXIS - 0.7, U2_AXIS + 1.05, -7.6, 7.6], [-WING_SPAN, WING_SPAN, U2_AXIS - 0.18, U2_AXIS + 0.3 + flex, -1.7, 1.5],
    [-3.2, 3.2, U2_AXIS - 0.1, U2_AXIS + 0.3, -7.1, -5.6], [-0.12, 0.12, U2_AXIS, U2_AXIS + 2.45, -7.4, -4.5], [-0.95, 0.95, U2_AXIS - 0.3, U2_AXIS + 0.5, 0.0, 3.6]];
  function solid(x, y, z, m = 0.3) {
    let top = 0;
    for (const [x0, x1, y0, y1, z0, z1] of SOL) if (x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m && z > z0 - m && z < z1 + m) top = Math.max(top, y1);
    return top;
  }
  let gearK = 1;
  const gearMode = String(o.gear || ((+o.alt || 0) > 30 ? 'up' : 'auto'));      // idle high in the sky: gear up
  const CG = new THREE.Vector3(0, 0, 0.6);
  return {
    group, body, props: [], span: WING_SPAN * 2, length: 15.1, cruise: 210, height: U2_AXIS + 2.5, anchors, solid,
    setGear(k) { gearK = clamp(k); gearG.visible = gearK > 0.02; gearG.position.y = (1 - gearK) * 0.7; gearG.scale.setScalar(lerp(0.7, 1, gearK)); pogoG.visible = gearK > 0.98; },
    update(t, s = {}) {
      if (gearMode === 'down') this.setGear(1); else if (gearMode === 'up') this.setGear(0);
      else if (s.gear != null) this.setGear(s.gear);
      fxUpd(t);
      // the airframe after the burst: the tail breaks away, the nose drops, the outer wings fold up and tear off, a tumble
      air.position.set(0, 0, 0); air.rotation.set(0, 0, 0); tailG.position.set(0, 0, SPLIT_Z); tailG.rotation.set(0, 0, 0);
      wingLG.rotation.set(0, 0, 0); wingRG.rotation.set(0, 0, 0); wingLG.position.set(PIV[0], PIV[1], PIV[2]); wingRG.position.set(-PIV[0], PIV[1], PIV[2]);
      if (hit !== null && t > hit) {
        const d = t - hit;
        // the jolt (a forward kick), then the nose drops and the airframe begins to roll / tumble, falling away
        const kick = 0.6 * Math.sin(Math.min(d, 0.25) / 0.25 * Math.PI) * (d < 0.25 ? 1 : 0);
        const pitch = 1.25 * sstep(0.15, 1.6, d) + 0.35 * Math.max(0, d - 1.6);    // + about X = the nose DOWN
        const roll = 0.5 * sstep(0.3, 1.2, d) * Math.sin(d * 2.4) + 1.8 * Math.max(0, d - 1.0) * sstep(1.0, 2.0, d);
        air.position.set(0, -2.5 * d * d - 3 * d, kick - 3 * d);
        // pivot about the CG
        air.position.add(CG); air.rotation.set(pitch, 0, roll, 'YXZ');
        const back = CG.clone().negate().applyEuler(air.rotation); air.position.add(back);
        // the tail: breaks away at d 0.15, falls behind (the plane slows less), tumbles end over end
        const dt = Math.max(0, d - 0.15);
        if (dt > 0) {
          tailG.position.set(0.8 * dt, 2.5 * dt - 3 * dt * dt, SPLIT_Z - 12 * dt - 6 * dt * dt);
          tailG.rotation.set(2.2 * dt, 0.6 * dt, 1.1 * dt);
        }
        // the outer wings: fold upward from d 0.35, tear away from d 0.7
        const fold = sstep(0.35, 0.75, d) * 1.1;
        wingLG.rotation.z = fold; wingRG.rotation.z = -fold;
        const dw = Math.max(0, d - 0.7);
        if (dw > 0) {
          wingLG.position.set(PIV[0] + 6 * dw, PIV[1] + 4 * dw - 6 * dw * dw, PIV[2] - 14 * dw);
          wingRG.position.set(-PIV[0] - 5 * dw, PIV[1] + 3 * dw - 6 * dw * dw, PIV[2] - 16 * dw);
          wingLG.rotation.set(1.6 * dw, 0.8 * dw, fold + 2.4 * dw); wingRG.rotation.set(1.2 * dw, -0.7 * dw, -fold - 2.8 * dw);
        }
      }
    },
  };
}
