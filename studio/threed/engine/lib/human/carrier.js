// carrier.js — ship.carrier: USS Hornet (CV-8), a Yorktown-class aircraft carrier as of 18 April 1942 (the Doolittle
// Raid). Not a module (vehicles.js builds it; its catalog entry is look-gated to NOCTURNE). What sells it: the long
// wooden flight deck (planks laid athwartships, steel tie-down strips fore and aft, three elevator outlines, arresting
// wires aft, the two white guide lines painted for the B-25s' nose and left wheels), the open hangar under it with its
// dark bays and roller-curtain openings, the narrow starboard island (stepped bridge levels with window bands, the big
// funnel trunk with its cap, the tripod mast carrying the CXAM "bedspring" radar), 5-inch/38 guns on four corner
// sponsons, catwalks with railings along both deck edges, the hinged radio masts folded out, the fine flared bow over
// an open forecastle (anchor chains, capstans) and the overhanging round-down aft, a Measure 12 splotch camouflage on
// the hull. The deck load: `deck_load` B-25Bs (b25.js) spotted aft in a herringbone with their tails over the edges, the
// lead bomber on the white lines with 467 ft of deck ahead of it; `launch` t rolls the lead down the deck and lifts it
// off over the bow; `pitch` deg = a slow heavy-sea pitch and heave (the gale of 18 April 1942); `crew` deck crew around
// the lead. Model faces +Z, origin at the waterline amidships. Static parts merged per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plain } from '../shared/materials.js';
import { patchMaterial } from '../shared/env.js';
import { buildB25, B25_AXIS } from './b25.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── dimensions (m) ─────────────────────────────────────────────────────────────────────────────────────────────
export const CV = {
  L: 251, WL2: 117, BH: 12.7, DR: 7.9,                 // waterline half-length, half-beam, draught
  FD: 16.8, FDT: 0.45, FW2: 13.1, FZ0: -119.5, FZ1: 123,   // flight deck top y, thickness, half-width, aft / forward ends
  HD: 9.6,                                              // the hangar deck / main deck amidships
  ISL: { x0: -13.7, x1: -7.6, z0: -6, z1: 30 },         // the island's footprint on the starboard edge (+X = port)
  LINE_X: 2.7,                                          // the B-25 nose-wheel guide line (port of the centreline)
};
const STEM = 112, Z_END = 124, Z_BEG = -CV.WL2 - 6;   // the stem at the waterline (it rakes ~9 m forward to the deck); the hull's ends
const mainDeckY = (z) => CV.HD + 3.6 * sstep(60, 118, z) + 0.4 * sstep(-80, -118, z);   // sheer: the forecastle rises
function planHB(z) {
  if (z > 50) { const t = clamp((z - 50) / (STEM - 50)); return CV.BH * Math.pow(Math.max(0, 1 - Math.pow(t, 2.0)), 0.72); }
  if (z < -70) { const t = clamp((-70 - z) / (CV.WL2 + 4 - 70)); return CV.BH * Math.pow(Math.max(0, 1 - Math.pow(t, 2.6)), 0.45); }
  return CV.BH;
}
function hb(z, y) {                                     // half-breadth at (z, y): raked stem, flare at the bow, V forefoot
  const top = mainDeckY(z), k = clamp((y + CV.DR) / (top + CV.DR));
  const bow = sstep(55, 118, z), stern = sstep(-80, -118, z);
  const zz = z - 9 * k * bow + 3 * k * stern;
  let x = planHB(zz);
  const flare = 1 + 0.16 * bow * Math.pow(clamp(y / Math.max(1, top)), 1.4);
  const bilge = y < -CV.DR + 2.6 ? Math.sqrt(Math.max(0, 1 - Math.pow((-CV.DR + 2.6 - y) / 2.8, 2))) * 0.9 + 0.1 : 1;
  const vee = Math.pow(k, 0.6 * bow + 0.2 * stern);
  return Math.max(0, x * flare * Math.min(bilge, 1) * (bow + stern > 0.01 ? vee : 1));
}
function hullGeometry() {
  const zs = []; for (let z = Z_BEG; z <= Z_END + 0.01; z += 1.5) zs.push(z);
  const NY = 20, pos = [], idx = [], cols = NY * 2 + 1;
  for (const z of zs) {
    const H = mainDeckY(z);
    for (let j = 0; j < cols; j++) {
      const side = j < NY ? -1 : j > NY ? 1 : 0, jj = side < 0 ? NY - j : j - NY, u = jj / NY, yy = -CV.DR + (H + CV.DR) * u;
      const end = z <= Z_BEG + 0.01 || z >= Z_END - 0.01 ? 0 : 1;          // both ends close (no open hull end to see into)
      pos.push(jj === 0 ? 0 : side * hb(z, yy) * (jj === 1 ? 0.6 : 1) * end, yy, z);
    }
  }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function mainDeckGeometry() {                           // the steel main deck / forecastle surface inside the hull's top edge
  const pos = [], idx = []; let n = 0;
  for (let z = Z_BEG; z <= Z_END + 0.01; z += 1.5) {
    const y = mainDeckY(z), x = z <= Z_BEG + 0.01 || z >= Z_END - 0.01 ? 0.02 : Math.max(0.02, hb(z, y) * 0.985);
    pos.push(-x, y + 0.02, z, x, y + 0.02, z);
    if (n) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    n++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ── paint: Measure 12 (modified) splotches on the hull; weathered haze grey upperworks ────────────────────────────
let HULLTEX = null;
function hullTex() {
  if (HULLTEX) return HULLTEX;
  const W = 2048, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(1942);
  const vy = (y) => H - (y + CV.DR) / (17 + CV.DR) * H;
  g.fillStyle = '#4C5560'; g.fillRect(0, 0, W, H);                    // ocean grey
  for (let i = 0; i < 70; i++) {                                     // the splotches: navy blue and haze grey patches
    const x = R() * W, y = vy(-1 + R() * 15), rx = 30 + R() * 140, ry = 20 + R() * 70;
    g.fillStyle = R() < 0.55 ? '#2B3442' : '#7C8790'; g.beginPath();
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, r = 0.65 + R() * 0.5; g.lineTo(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r); }
    g.closePath(); g.fill();
  }
  g.fillStyle = '#2B3442'; g.fillRect(0, vy(2.4), W, vy(-1.0) - vy(2.4));   // navy blue up to the hangar deck line low down
  g.fillStyle = '#5E2A22'; g.fillRect(0, vy(-0.9), W, H);           // antifouling
  g.fillStyle = '#161718'; g.fillRect(0, vy(0.5), W, vy(-0.9) - vy(0.5));
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '20,22,26' : '150,155,160'},${0.03 + R() * 0.05})`; g.fillRect(R() * W, R() * H, 2 + R() * 10, 1 + R() * 2); }
  g.strokeStyle = 'rgba(25,28,32,0.35)'; g.lineWidth = 1.3;
  for (let y = -CV.DR; y < 16; y += 2.3) { g.beginPath(); g.moveTo(0, vy(y)); g.lineTo(W, vy(y)); g.stroke(); }
  for (let i = 0; i < 180; i++) { const x = R() * W, y0 = vy(3 + R() * 9), len = 20 + R() * 90, gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, `rgba(105,60,32,${0.2 + R() * 0.25})`); gr.addColorStop(1, 'rgba(105,60,32,0)'); g.fillStyle = gr; g.fillRect(x, y0, 1.5 + R() * 3, len); }
  HULLTEX = new THREE.CanvasTexture(c); HULLTEX.colorSpace = THREE.SRGBColorSpace; HULLTEX.anisotropy = 8; HULLTEX.userData.keep = true;
  return HULLTEX;
}
function hullUV(g) {                                    // u along the length, v keel -> flight deck
  const P = g.attributes.position, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { uv[i * 2] = (P.getZ(i) + CV.WL2 + 8) / 252; uv[i * 2 + 1] = (P.getY(i) + CV.DR) / (17 + CV.DR); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
let PAINTTEX = null;
function paintTex() {
  if (PAINTTEX) return PAINTTEX;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), R = rng(8);
  g.fillStyle = '#BFC3C6'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.6 ? '60,62,66' : '230,232,235'},${0.015 + R() * 0.025})`; g.fillRect(R() * N, R() * N, 1 + R() * 3, 1 + R() * 2); }
  for (let i = 0; i < 30; i++) { const x = R() * N, gr = g.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, 'rgba(70,66,60,0.08)'); gr.addColorStop(1, 'rgba(70,66,60,0)'); g.fillStyle = gr; g.fillRect(x, R() * N * 0.3, 1 + R() * 2, N); }
  PAINTTEX = new THREE.CanvasTexture(c); PAINTTEX.colorSpace = THREE.SRGBColorSpace; PAINTTEX.wrapS = PAINTTEX.wrapT = THREE.RepeatWrapping; PAINTTEX.userData.keep = true;
  return PAINTTEX;
}
// the flight deck markings, mapped over the whole deck: the two white B-25 guide lines, elevator outlines, the
// centreline dashes forward, tyre and oil stains, the hull number aft
let MARKTEX = null;
function markTex() {
  if (MARKTEX) return MARKTEX;
  const W = 512, H = 4096, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(18);
  const px = (x) => (x + CV.FW2) / (2 * CV.FW2) * W, pz = (z) => H - (z - CV.FZ0) / (CV.FZ1 - CV.FZ0) * H;
  g.clearRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {                                     // oil and tyre stains (darker), sun-bleached patches
    const x = px((R() - 0.5) * 22), z = pz(CV.FZ0 + R() * (CV.FZ1 - CV.FZ0)), r = 4 + R() * 30;
    const gr = g.createRadialGradient(x, z, 0, x, z, r); const dark = R() < 0.7;
    gr.addColorStop(0, dark ? `rgba(0,0,0,${0.12 + R() * 0.18})` : `rgba(255,255,255,${0.05 + R() * 0.06})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, z, r * 0.6, r * 1.6, 0, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;                // tyre tracks along the launch lane
  for (const x of [CV.LINE_X - 0.0, CV.LINE_X + 3.12, CV.LINE_X - 3.12]) { g.beginPath(); g.moveTo(px(x + 0.5), pz(-30)); g.lineTo(px(x + 0.3), pz(CV.FZ1 - 2)); g.stroke(); }
  g.fillStyle = 'rgba(236,234,226,0.95)';                             // the two white guide lines (nose wheel, port main wheel)
  for (const x of [CV.LINE_X, CV.LINE_X + 3.12]) g.fillRect(px(x) - 3, pz(CV.FZ1 - 1.5), 6, pz(-24) - pz(CV.FZ1 - 1.5));
  g.strokeStyle = 'rgba(30,30,30,0.85)'; g.lineWidth = 3;             // elevator outlines (forward, middle, aft)
  for (const [z, w, l] of [[86, 13.4, 14.6], [8, 13.4, 14.6], [-66, 11.6, 13.4]]) g.strokeRect(px(-w / 2), pz(z + l / 2), px(w / 2) - px(-w / 2), pz(z - l / 2) - pz(z + l / 2));
  g.fillStyle = 'rgba(236,234,226,0.8)';                              // centreline dashes forward of the island
  for (let z = 40; z < CV.FZ1 - 6; z += 6) g.fillRect(px(0) - 2, pz(z + 3), 4, pz(z) - pz(z + 3));
  g.save(); g.translate(px(0), pz(-108)); g.scale(1, -1); g.rotate(Math.PI);  // the hull number "8" aft, read from astern
  g.fillStyle = 'rgba(236,234,226,0.85)'; g.font = 'bold 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', 0, 0); g.restore();
  MARKTEX = new THREE.CanvasTexture(c); MARKTEX.colorSpace = THREE.SRGBColorSpace; MARKTEX.anisotropy = 8; MARKTEX.userData.keep = true;
  return MARKTEX;
}
// the flight deck: procedural planks laid athwartships (seams every 0.15 m of z, staggered butts), steel tie-down
// strips fore and aft every 2.1 m, plank-to-plank tone variation, wet sheen; + the markings texture
const DECK_GLSL = /* glsl */`
varying vec3 vDP; uniform sampler2D uMarks;
float dRough;
float dH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void dDeck(inout vec3 col){
  vec3 P = vDP;
  float pw = 0.153, k = floor(P.z / pw), fz = fract(P.z / pw);
  float fw = fwidth(P.z / pw) * 1.2 + 0.02;
  float seam = 1.0 - smoothstep(0.0, fw, fz) * smoothstep(1.0, 1.0 - fw, fz);
  float bl = 4.27 + dH(vec2(k, 3.0)) * 2.0, bx = fract((P.x + dH(vec2(k, 1.0)) * 7.0) / bl);
  float bw = fwidth(P.x / bl) * 1.2 + 0.004;
  float butt = 1.0 - smoothstep(0.0, bw, bx) * smoothstep(1.0, 1.0 - bw, bx);
  float tone = dH(vec2(k, floor((P.x + dH(vec2(k, 1.0)) * 7.0) / bl)));
  vec3 wood = mix(vec3(0.20, 0.19, 0.17), vec3(0.30, 0.285, 0.25), tone);
  float sx = fract((P.x + 0.4) / 2.1), sw = fwidth(P.x / 2.1) * 1.2 + 0.012;
  float strip = smoothstep(0.0, sw, sx) * smoothstep(0.06, 0.06 - sw, sx);
  col = wood * (1.0 - 0.45 * max(seam, butt * 0.7));
  col = mix(col, vec3(0.07, 0.075, 0.08), strip * 0.85);
  vec2 uv = vec2((P.x + ${CV.FW2.toFixed(2)}) / ${(2 * CV.FW2).toFixed(2)}, (P.z - (${CV.FZ0.toFixed(2)})) / ${(CV.FZ1 - CV.FZ0).toFixed(2)});
  vec4 mk = texture2D(uMarks, uv);
  col = mix(col, mk.rgb, mk.a);
  dRough = -0.1 * strip + 0.06 * seam;
}`;
function deckMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0, envMapIntensity: 0.45 });
  m.userData.progKey = 'cv8-deck';
  const marks = markTex();
  return patchMaterial(m, (sh) => {
    sh.uniforms.uMarks = { value: marks };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${DECK_GLSL}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\ndDeck(diffuseColor.rgb);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + dRough, 0.05, 1.0);');
  });
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────
const box = (w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); return g.translate(x, y, z); };
const cyl = (rt, rb, h, x, y, z, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
function rod(a, b, r, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return g.translate(A.x, A.y, A.z);
}
const ix = (g) => { if (g.index === null) g.setIndex([...Array(g.attributes.position.count).keys()]); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (g.attributes.normal === undefined) g.computeVertexNormals(); return g; };
const merge = (list) => mergeGeometries(list.map((g) => ix(g)));
function deckPlan(z) {                                  // the flight deck's half-width at z (the bow and stern ends taper)
  const f = z > CV.FZ1 - 22 ? lerp(CV.FW2, 7.5, sstep(CV.FZ1 - 22, CV.FZ1, z)) : z < CV.FZ0 + 8 ? lerp(CV.FW2, 11.5, sstep(CV.FZ0 + 8, CV.FZ0, z)) : CV.FW2;
  return f;
}
function flightDeckGeometry() {
  const s = new THREE.Shape(), pts = [];
  for (let z = CV.FZ0; z <= CV.FZ1 + 0.01; z += 1.5) pts.push([deckPlan(z), z]);
  s.moveTo(-pts[0][0], pts[0][1]);
  for (const [x, z] of pts) s.lineTo(-x, z);
  for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: CV.FDT, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(Math.PI / 2);                                // shape (x, z) in the XY plane -> extrude down: y = top .. top - FDT
  // after rotateX(+90): shape y -> +z? (THREE: rotateX(a) maps y -> y cos - z sin, z -> y sin + z cos) -> y' = -depth, z' = shape y
  g.translate(0, CV.FD, 0);
  return g;
}

// o: {deck_load, lead, launch, launch_dur, pitch, crew, seed}; ctx for crew figures
export function buildCarrierCV8(o = {}, ctx = {}) {
  const group = new THREE.Group(); group.name = 'carrier';
  const hullM = plain({ map: hullTex(), roughness: 0.72, metalness: 0.12 });
  const greyM = plain({ map: paintTex(), color: 0x7A838B, roughness: 0.64, metalness: 0.15 });
  const darkM = plain({ map: paintTex(), color: 0x4A5058, roughness: 0.6, metalness: 0.2 });
  const blackM = plain({ color: 0x0D0E10, roughness: 0.75, metalness: 0.1 });
  const steelM = plain({ color: 0x5C6168, roughness: 0.7, metalness: 0.3 });
  const glassM = plain({ color: 0x0C1216, roughness: 0.12, metalness: 0.55 });
  const canvasM = plain({ color: 0x8C8A7C, roughness: 0.95 });
  const G = { grey: [], dark: [], black: [], steel: [], glass: [], canvas: [] };
  const anchors = {};
  const A = (k, x, y, z) => { const a = new THREE.Object3D(); a.position.set(x, y, z); anchors[k] = a; };

  // hull + main deck / forecastle
  const hull = new THREE.Mesh(hullUV(hullGeometry()), hullM); hull.name = 'hull'; hull.castShadow = hull.receiveShadow = true; group.add(hull);
  const md = new THREE.Mesh(mainDeckGeometry(), steelM); md.name = 'main_deck'; md.receiveShadow = true; group.add(md);

  // the hangar between the main deck and the flight deck: side plating in bays with openings onto the dark hangar,
  // roller curtains half down in some, the dark interior box
  const HZ0 = -94, HZ1 = 78, hw = CV.BH - 0.3, hy0 = CV.HD, hy1 = CV.FD - CV.FDT;
  const wallX = (z) => Math.min(hw + 0.12, hb(z, hy0) + 0.12);           // the hangar sides follow the hull (never overhang it)
  G.black.push(box(2 * Math.min(wallX(HZ1), wallX(HZ0)) - 1.0, hy1 - hy0 - 0.2, HZ1 - HZ0 - 2, 0, (hy0 + hy1) / 2, (HZ0 + HZ1) / 2));     // the dark hangar
  for (const [z, s] of [[HZ1 + 0.2, 1], [HZ0 - 0.2, -1]]) {                // its end bulkheads (grey plating, doors, ports)
    G.grey.push(box(2 * wallX(z), hy1 - hy0, 0.4, 0, (hy0 + hy1) / 2, z));
    for (const dx of [-6, 0, 6]) G.black.push(box(2.2, 2.6, 0.1, dx, hy0 + 1.3, z + s * 0.22));
    for (const dx of [-8.5, -3, 3, 8.5]) G.glass.push(box(0.5, 0.5, 0.1, dx, hy0 + 4.2, z + s * 0.22));
  }
  { const R = rng(o.seed ?? 8);
    for (const s of [-1, 1]) for (let z = HZ0; z < HZ1; z += 9) {
      const isl = s < 0 && z > CV.ISL.z0 - 6 && z < CV.ISL.z1;
      const open = !isl && R() < 0.55, x = s * wallX(z + 4.5);
      if (open) {
        G.grey.push(box(0.25, hy1 - hy0, 1.2, x, (hy0 + hy1) / 2, z + 0.6));                                // the frame post
        G.grey.push(box(0.25, 1.4, 9, x, hy1 - 0.7, z + 4.5));                                              // the header
        const drop = R() < 0.5 ? 0.15 + R() * 0.5 : 0;                                                      // a roller curtain part-way down
        if (drop > 0) G.canvas.push(box(0.12, (hy1 - hy0 - 1.4) * drop, 7.6, x + s * 0.08, hy1 - 1.4 - (hy1 - hy0 - 1.4) * drop / 2, z + 4.9));
      } else {
        G.grey.push(box(0.25, hy1 - hy0, 9, x, (hy0 + hy1) / 2, z + 4.5));
        for (const zz of [z + 2.2, z + 6.6]) G.glass.push(box(0.27, 0.45, 0.45, x, hy0 + 3.6, zz));        // small ports
      }
    }
  }
  // the flight deck (wooden, procedural planks + markings), its edge, the supports fore and aft
  const deckM = deckMat();
  const fd = new THREE.Mesh(flightDeckGeometry(), [deckM, greyM]); fd.name = 'flight_deck'; fd.castShadow = fd.receiveShadow = true; group.add(fd);
  for (const z of [92, 100, 108, 116]) for (const s of [-1, 1]) G.dark.push(rod([s * Math.min(7, hb(z, mainDeckY(z)) * 0.8), mainDeckY(z), z], [s * Math.min(7.5, deckPlan(z) * 0.8), CV.FD - CV.FDT, z + 1.2], 0.32, 8));   // bow supports
  G.dark.push(box(10, 0.6, 30, 0, CV.FD - CV.FDT - 0.3, 104));                                              // the girder under the bow overhang
  for (const z of [-104, -111, -117]) for (const s of [-1, 1]) G.dark.push(rod([s * 6, mainDeckY(z), z], [s * 8, CV.FD - CV.FDT, z - 1], 0.3, 8));   // stern supports
  G.dark.push(box(18, 0.6, 16, 0, CV.FD - CV.FDT - 0.3, -110));
  // forecastle fittings: anchor chains to two capstans, the hawse pipes, a jackstaff; the anchors in the hawse
  for (const s of [-1, 1]) {
    const z = 108, y = mainDeckY(z);
    G.black.push(rod([s * 2.2, y + 0.12, 116], [s * 1.5, y + 0.12, 101], 0.18, 6)); G.dark.push(cyl(0.9, 1.0, 0.9, s * 1.5, y + 0.45, 100.4, 14));
    const xa = s * (hb(114, y - 2.2) + 0.1); G.black.push(box(0.4, 2.4, 1.5, xa, y - 2.6, 114));
  }
  G.dark.push(rod([0, mainDeckY(121) + 0.2, 121.5], [0, mainDeckY(121) + 5, 122], 0.08, 6));

  // catwalks + railings along both deck edges (gaps at the island and the sponsons)
  const rails = [], posts = [];
  for (const s of [-1, 1]) {
    for (const [z0, z1] of s < 0 ? [[-108, CV.ISL.z0 - 8], [CV.ISL.z1 + 4, 64], [76, 112]] : [[-108, -78], [-66, 64], [76, 112]]) {
      const x = s * (CV.FW2 + 0.7), y = CV.FD - 1.15;
      G.steel.push(box(1.4, 0.12, z1 - z0, x, y, (z0 + z1) / 2));
      let prev = null;
      for (let z = z0; z <= z1; z += 2.4) { const p = [s * (CV.FW2 + 1.35), y, z]; posts.push(p); if (prev) for (const h of [0.5, 1.0]) rails.push(rod([prev[0], prev[1] + h, prev[2]], [p[0], p[1] + h, p[2]], 0.025, 4)); prev = p; }
    }
  }
  if (rails.length) G.steel.push(...rails);
  // 5-inch/38 guns: two on each of the four corner sponsons (open mounts)
  for (const [s, z] of [[1, 72], [-1, 72], [1, -72], [-1, -72]]) {
    const x0 = s * (CV.BH + 0.5), y = CV.FD - 2.6;
    G.grey.push(box(4.6, 0.4, 13, x0 + s * 2.1, y, z)); G.dark.push(box(4.4, 1.0, 0.4, x0 + s * 2.1, y + 0.7, z + 6.3 * Math.sign(z)));
    for (const dz of [-3, 3]) {
      const gx = x0 + s * 2.2, gz = z + dz;
      G.dark.push(cyl(0.9, 1.1, 0.9, gx, y + 0.65, gz, 14)); G.dark.push(box(1.6, 1.2, 1.9, gx, y + 1.5, gz));
      G.dark.push(rod([gx, y + 1.7, gz + Math.sign(z) * 0.8], [gx + s * 0.5, y + 2.6, gz + Math.sign(z) * 5.6], 0.11, 8));
    }
  }
  // the hinged radio masts folded out horizontally on the starboard side (flight operations)
  for (const z of [-30, -46, -60]) G.dark.push(rod([-(CV.FW2 + 0.6), CV.FD - 1.6, z], [-(CV.FW2 + 13), CV.FD - 1.3, z - 1.5], 0.12, 6));
  // arresting wires aft (thin cables on low sheaves) and the deck-edge lights
  for (let z = -100; z <= -40; z += 6.5) { G.black.push(rod([-11.5, CV.FD + 0.06, z], [11.5, CV.FD + 0.06, z], 0.03, 4)); for (const s of [-1, 1]) G.dark.push(box(0.4, 0.25, 0.5, s * 11.7, CV.FD + 0.12, z)); }

  // ── the island (starboard): stepped levels, bridge windows, the funnel trunk, the tripod mast + CXAM radar ──
  const ix0 = CV.ISL.x0, ix1 = CV.ISL.x1, icx = (ix0 + ix1) / 2, iw = ix1 - ix0, y0 = CV.FD;
  G.grey.push(box(iw, 3.0, 36, icx, y0 + 1.5, 12));                       // level 1 (flight deck level)
  G.grey.push(box(iw - 0.4, 2.8, 30, icx, y0 + 4.4, 14));                  // level 2
  G.grey.push(box(iw - 0.6, 2.7, 22, icx, y0 + 7.15, 18));                 // level 3: flag bridge
  G.glass.push(box(iw - 0.5, 0.65, 22.05, icx, y0 + 7.5, 18));
  G.grey.push(box(iw + 2.6, 0.3, 4.5, icx, y0 + 8.65, 28.5));              // bridge wings
  G.grey.push(box(iw - 0.8, 2.6, 13, icx, y0 + 9.9, 22.5));                // level 4: the navigating bridge
  G.glass.push(box(iw - 0.7, 0.7, 13.05, icx, y0 + 10.3, 22.5));
  G.grey.push(box(iw - 1.4, 2.2, 7, icx, y0 + 12.3, 24));                  // the pilot house top / sky control
  G.glass.push(box(iw - 1.3, 0.55, 7.05, icx, y0 + 12.6, 24));
  for (const z of [27.5, 20]) G.grey.push(cyl(0.65, 0.65, 0.9, icx + 1.5, y0 + 13.9, z, 12));   // searchlights
  // the funnel trunk aft on the island: tall, flat-sided with rounded ends, raked slightly aft, cap and grille
  { const f = new THREE.CylinderGeometry(1, 1, 16, 28); f.scale(2.9, 1, 7.2); f.translate(icx + 0.1, y0 + 8.0, -1.5); G.grey.push(f);
    const cap = new THREE.CylinderGeometry(1, 1, 1.3, 28); cap.scale(3.05, 1, 7.35); cap.translate(icx + 0.1, y0 + 16.6, -1.5); G.black.push(cap);
    for (const z of [-5.5, -1.5, 2.5]) G.dark.push(box(5.4, 0.25, 0.3, icx + 0.1, y0 + 17.35, z));
    for (const y of [y0 + 6.0, y0 + 11.0]) G.dark.push(box(6.2, 0.22, 15.5, icx + 0.1, y, -1.5)); }   // the funnel's platforms
  // tripod mast forward of the funnel; the CXAM bedspring on top; yardarm; the fire-control director
  const mt = [icx, y0 + 26.5, 7.5];
  for (const [x, z] of [[icx - 2.2, 10.5], [icx + 2.2, 10.5], [icx, 3.5]]) G.dark.push(rod([x, y0 + 12.4, z], mt, 0.32, 8));
  G.dark.push(cyl(2.2, 2.2, 0.3, mt[0], mt[1] - 3.6, mt[2], 16)); G.grey.push(box(2.4, 1.6, 2.6, mt[0], mt[1] - 2.6, mt[2]));   // a platform + director
  { const R0 = []; const W = 5.2, H = 4.4, cz = mt[2] + 0.4, cy = mt[1] + 2.7;             // CXAM: a framed grid of dipoles
    R0.push(box(0.12, H, 0.12, mt[0] - W / 2, cy, cz)); R0.push(box(0.12, H, 0.12, mt[0] + W / 2, cy, cz));
    for (let k = 0; k <= 6; k++) R0.push(box(W, 0.06, 0.06, mt[0], cy - H / 2 + k * H / 6, cz));
    for (let k = 0; k <= 9; k++) R0.push(box(0.05, H, 0.05, mt[0] - W / 2 + k * W / 9, cy, cz));
    R0.push(rod([mt[0], mt[1], mt[2]], [mt[0], cy - H / 2, cz], 0.18, 8));
    G.dark.push(...R0); }
  G.dark.push(rod([mt[0] - 4.5, mt[1] - 1, mt[2]], [mt[0] + 4.5, mt[1] - 1, mt[2]], 0.09, 6));
  // 1.1-inch quad mounts at the island's ends (tubs with guns)
  for (const z of [32.5, -9.5]) { G.grey.push(cyl(2.0, 2.0, 1.1, icx, y0 + (z > 0 ? 3.55 : 0.55), z, 18)); for (const dx of [-0.45, -0.15, 0.15, 0.45]) G.dark.push(rod([icx + dx, y0 + (z > 0 ? 4.4 : 1.4), z], [icx + dx, y0 + (z > 0 ? 4.9 : 1.9), z + Math.sign(z) * 2.6], 0.05, 5)); }
  A('island', icx, y0 + 7, 12); A('bridge', icx, y0 + 10.3, 26); A('funnel', icx + 0.1, y0 + 17.5, -1.5); A('mast_top', mt[0], mt[1] + 5, mt[2]);
  A('bow', 0, CV.FD, CV.FZ1 - 2); A('stern', 0, CV.FD, CV.FZ0 + 2); A('deck', 0, CV.FD, 0); A('deck_bow', CV.LINE_X, CV.FD, CV.FZ1 - 8);
  A('forecastle', 0, mainDeckY(110) + 0.2, 110);
  // deck points people can stand on (aboard.js: cast / groups "on": "objects:N.<point>" ride with the pitching ship)
  const P = (k, x, y, z, face) => { A(k, x, y, z); anchors[k].userData = { stand: true, floor: 0, face }; };
  P('deck_hatch', CV.LINE_X + 1.35, CV.FD, -24 + 4.9, 'in');       // beside the foot of the lead's hatch ladder (clear of the nose strut)
  P('deck_lead', CV.LINE_X - 4.5, CV.FD, -24 + 7.0, 'in');         // beside the lead's nose (starboard side)
  P('deck_island', CV.ISL.x1 + 1.2, CV.FD, 14, 'port');            // in front of the island
  P('deck_officer', CV.LINE_X - 3.5, CV.FD, CV.FZ1 - 12, 'stern'); // the launch officer's spot near the bow
  P('deck_port', CV.FW2 - 2.0, CV.FD, 0, 'out');                   // the port deck edge amidships
  P('deck_aft', 0, CV.FD, -112, 'bow');                            // behind the deck load
  P('bridge_wing', CV.ISL.x0 + 0.6, CV.FD + 8.8, 28.5, 'bow');      // on the bridge wing looking ahead

  // ── merge the static parts per material ──
  for (const [key, M] of [['grey', greyM], ['dark', darkM], ['black', blackM], ['steel', steelM], ['glass', glassM], ['canvas', canvasM]]) {
    if (!G[key].length) continue;
    const m = new THREE.Mesh(merge(G[key]), M); m.name = 'carrier_' + key; m.castShadow = m.receiveShadow = true; group.add(m);
  }
  { const sg = new THREE.CylinderGeometry(0.03, 0.03, 1.05, 4).translate(0, 0.52, 0);
    const im = new THREE.InstancedMesh(sg, steelM, posts.length); im.name = 'stanchions'; const m4 = new THREE.Matrix4();
    posts.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); im.setMatrixAt(i, m4); }); group.add(im); }

  // ── the deck load: the lead B-25 on the white lines, the rest in a herringbone aft ──
  const planes = [], solids = [];
  const n = clamp(Math.round(Number.isFinite(+o.deck_load) ? +o.deck_load : 15), 0, 15);   // + the lead = the sixteen
  const leadOn = o.lead !== false;
  const LEAD_Z = -24 + B25_AXIS * 0;                     // the lead's main wheels: 467 ft (142 m) to the bow
  let lead = null;
  if (leadOn) {
    lead = buildB25({ serial: '02344', gear: 'auto', hatch: o.hatch === true, props: o.props });
    lead.group.position.set(CV.LINE_X, CV.FD, LEAD_Z); lead.group.name = 'b25_lead'; group.add(lead.group);
    planes.push(lead);
    for (const [k, a] of Object.entries(lead.anchors)) anchors['lead_' + k] = a;
    anchors.lead = lead.group;
  }
  if (n > 0) {
    const proto = buildB25({ serial: '02292', gear: 'down', props: 'still' });
    proto.update(0, { rpm: 0 });
    for (let k = 0; k < n; k++) {
      const s = k % 2 ? -1 : 1, z = -36 - k * 5.6, x = s * 5.2, yaw = -s * 34 * DEG;
      const g = proto.group.clone(true); g.position.set(x, CV.FD, z); g.rotation.y = yaw; g.name = 'b25_parked_' + k; group.add(g);
      const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, CV.FD, z);
      solids.push({ inv: m.clone().invert(), m, solid: proto.solid });
    }
  }
  // the deck crew around the lead (deck handlers, a plane captain, the launch officer with his flag)
  let figs = [];
  const nCrew = clamp(Math.round(+o.crew || 0), 0, 12);
  if (nCrew > 0 && o._addCrew) {
    const slots = [[CV.LINE_X + 9, LEAD_Z + 6, -2.4, 'stand'], [CV.LINE_X - 7.5, LEAD_Z + 4, 2.0, 'watch'], [CV.LINE_X + 4.2, LEAD_Z + 11, 3.1, 'stand'],
      [CV.LINE_X - 3, LEAD_Z + 24, Math.PI, 'stand'], [CV.LINE_X + 11.5, LEAD_Z - 2, -1.6, 'watch'], [CV.LINE_X - 10, LEAD_Z - 6, 1.4, 'stand'],
      [CV.LINE_X + 1.5, LEAD_Z - 9, 0.2, 'stand'], [-9, -2, 1.2, 'watch'], [8, 30, -2.6, 'stand'], [-6, 44, 2.9, 'stand'], [10.5, -46, -1.2, 'watch'], [-11, -60, 1.0, 'stand']]
      .slice(0, nCrew).map(([x, z, yaw, pose]) => ({ x, y: CV.FD, z, yaw, pose }));
    const NAVY = [{ coat: '#5F7898', trousers: '#2A3140', accent: '#5F7898' }, { coat: '#8A8F98', trousers: '#2A3140', accent: '#B8B0A0' }, { coat: '#3E4A5E', trousers: '#262B36', accent: '#C9B26A' }];
    figs = o._addCrew(group, Array.from({ length: nCrew }, (_, i) => ({ kit: 'worker', colors: NAVY[i % NAVY.length] })), slots, ctx, 42);
  }

  // ── motion: heavy-sea pitch + heave (the whole ship about her centre), the lead's launch ──
  const pitchA = clamp(+o.pitch || 0, 0, 6) * DEG, launchT = Number.isFinite(+o.launch) ? +o.launch : null, LD = clamp(+o.launch_dur || 6.5, 2.5, 15);
  const RUN = (CV.FZ1 - 2) - (LEAD_Z + 5.9);            // the nose's run to the bow end
  function leadPose(t) {                                  // [z offset, y offset, pitch rad] of the lead in the ship frame
    if (launchT == null || t <= launchT) return [0, 0, 0, 0];
    const u = (t - launchT) / LD;
    if (u <= 1) return [RUN * u * u, 0, 0, u];
    const v = 2 * RUN / LD, tt = (t - launchT) - LD;    // off the bow: keeps its speed, climbs out with the nose up, then levels
    const climb = 2.6 * tt + 0.6 * tt * tt;
    return [RUN + v * tt + 1.2 * tt * tt, climb, Math.min(9, 4 + 3 * tt) * DEG * (1 - sstep(4, 9, tt)), 1 + tt];
  }
  const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _e = new THREE.Euler();
  function shipRot(t) { return pitchA ? pitchA * Math.sin(TAU * t / 9.5) + 0.35 * pitchA * Math.sin(TAU * t / 4.1 + 1.3) : 0; }
  function heave(t) { return pitchA ? 0.6 * (pitchA / (2.5 * DEG)) * Math.sin(TAU * t / 7.3 + 0.7) : 0; }
  function update(t) {
    group.rotation.x = -shipRot(t); group.position.y = heave(t);
    if (lead) {
      const [dz, dy, pr, u] = leadPose(t);
      lead.group.position.set(CV.LINE_X, CV.FD + dy, LEAD_Z + dz); lead.group.rotation.x = -pr;
      lead.update(t, { rpm: o.props === 'still' ? 0 : 1, gear: u > 1.6 ? 0 : u > 1.1 ? 1 - (u - 1.1) / 0.5 : 1 });
    }
  }
  // solid in the ship frame (holder space, no pitch): flight deck + hull + hangar, the island, the funnel, the mast,
  // the parked bombers and the lead (at t)
  function solid(x, y, z, m = 0.5, t = 0) {
    const r = shipRot(t), c = Math.cos(r), s = Math.sin(r), y1 = y - heave(t);
    const yy = y1 * c - z * s, zz = y1 * s + z * c;      // undo the pitch (group.rotation.x = -r)
    let top = 0;
    const md = Math.min(m, 0.25);                       // the decks are floors: a camera may stand at eye height on them
    if (zz > CV.FZ0 - m && zz < CV.FZ1 + m && Math.abs(x) < deckPlan(zz) + m && yy < CV.FD + md && yy > -CV.DR) top = CV.FD;
    else if (zz > Z_BEG && zz < Z_END && yy < mainDeckY(zz) + md && Math.abs(x) < hb(zz, Math.max(-CV.DR, Math.min(yy, mainDeckY(zz)))) + m) top = mainDeckY(zz);
    if (x > CV.ISL.x0 - m && x < CV.ISL.x1 + m && zz > CV.ISL.z0 - 4 - m && zz < CV.ISL.z1 + 3 + m && yy < CV.FD + 14 + m) top = Math.max(top, CV.FD + 14);
    if (x > CV.ISL.x0 - m && x < CV.ISL.x1 + m && zz > -9 - m && zz < 6 + m && yy < CV.FD + 17.5 + m) top = Math.max(top, CV.FD + 17.5);
    if (Math.abs(x - mt[0]) < 3.2 + m && Math.abs(zz - mt[2]) < 3.5 + m && yy > CV.FD + 12 && yy < mt[1] + 5.2 + m) top = Math.max(top, mt[1] + 5);
    for (const S of solids) { _v.set(x, yy, zz).applyMatrix4(S.inv); const h = S.solid(_v.x, _v.y, _v.z, m); if (h > 0) top = Math.max(top, CV.FD + h); }
    if (lead) { const [dz, dy, pr] = leadPose(t); _v.set(x - CV.LINE_X, yy - CV.FD - dy, zz - LEAD_Z - dz); if (pr) _v.applyAxisAngle(new THREE.Vector3(1, 0, 0), pr); const h = lead.solid(_v.x, _v.y, _v.z, m); if (h > 0) top = Math.max(top, CV.FD + dy + h); }
    return top;
  }
  for (const [k, a] of Object.entries(anchors)) if (a && !a.parent) { a.name = 'anchor:' + k; group.add(a); }
  update(0);
  return { group, length: CV.L, beam: 2 * CV.BH, height: CV.FD + 32, anchors, update, solid, figs, deckY: CV.FD };
}
