// warship.js — ship.warship: a 1940s US standard-type battleship (Pennsylvania class: USS Arizona / Pennsylvania as of
// 1941, ~185 m). Not a module (vehicles.js builds it). The silhouette carries the realism from far away: a raked stem
// and a long sheer forecastle, torpedo bulges, four triple 14-inch turrets (II and III superfiring, blast bags, the
// turret rangefinder "ears"), the armoured conning tower and stepped bridge, TWO TRIPOD MASTS with their fire-control
// tops and topmasts, one oval funnel with its cap, boat cranes and launches amidships, 5-inch casemate guns along the
// sides and 5-inch AA guns on the boat deck, the stern catapult with a floatplane, railings, rigging. Up close: plated
// hull with strakes, butts, portholes, rust and grime, a planked deck. Model faces +Z, origin at the waterline amidships.
// Static parts are merged per material (few draw calls; sinking.js splitAt cuts the merged meshes at the break).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plain } from '../shared/materials.js';
import * as TX from './textures.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── hull form ───────────────────────────────────────────────────────────────────────────────────────────────────
const L2 = 90, BH = 16.0, DR = 8.8;                       // waterline half-length, half-beam over the bulges, draught
export const deckY = (z) => 7.4 + 3.0 * sstep(18, 92, z) + 0.9 * sstep(-62, -95, z);   // sheer: high forecastle, slight rise aft
function planHB(z) {                                       // waterline half-breadth
  if (z > 22) { const t = clamp((z - 22) / (L2 + 2 - 22)); return BH * Math.pow(Math.max(0, 1 - Math.pow(t, 2.1)), 0.78); }
  if (z < -58) { const t = clamp((-58 - z) / (L2 + 3 - 58)); return BH * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.55); }
  return BH;
}
// the half-breadth at (z, y): the stem rakes forward and the cruiser stern overhangs with height; bulges below the
// waterline amidships, slight tumblehome above them, flare at the bow, a V forefoot
function hb(z, y) {
  const Hd = deckY(z), k = clamp((y + DR) / (Hd + DR));
  const bow = sstep(30, 90, z), stern = sstep(-60, -92, z);
  const zz = z - 7.5 * k * bow + 4.0 * k * stern;
  let x = planHB(zz);
  const bulge = 1 - 0.09 * sstep(0, 1, (y - 0.5) / Math.max(1, Hd)) * (1 - bow) * (1 - stern);   // tumblehome above the bulge
  const flare = 1 + 0.07 * bow * clamp(y / Math.max(1, Hd));
  const bilge = y < -DR + 3 ? Math.sqrt(Math.max(0, 1 - Math.pow((-DR + 3 - y) / 3.2, 2))) * 0.9 + 0.1 : 1;
  const vee = Math.pow(k, 0.55 * bow + 0.25 * stern);
  return Math.max(0, x * bulge * flare * Math.min(bilge, 1) * (bow + stern > 0.01 ? vee : 1));
}
function hullGeometry() {
  const zs = []; for (let z = -L2 - 8; z <= L2 + 10.01; z += 1.25) zs.push(z);
  const NY = 22, pos = [], uv = [], idx = [];
  const cols = NY * 2 + 1;
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i], Hd = deckY(z);
    for (let j = 0; j < cols; j++) {
      const side = j < NY ? -1 : j > NY ? 1 : 0, jj = side < 0 ? NY - j : j - NY;     // jj 0 keel .. NY deck
      const u = jj / NY, yy = -DR + (Hd + DR) * u;
      const x = jj === 0 ? 0 : side * hb(z, yy) * (jj === 1 ? 0.6 : 1);
      pos.push(x, yy, z); uv.push((z + L2 + 8) / 200, (yy + DR) / (10 + DR));
    }
  }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < cols - 1; j++) {
    const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function deckGeometry() {
  const pos = [], uv = [], idx = []; let n = 0;
  for (let z = -L2 - 8; z <= L2 + 10.01; z += 1.25) {
    const y = deckY(z), x = Math.max(0.02, hb(z, y) * 0.985);
    pos.push(-x, y + 0.02, z, x, y + 0.02, z); uv.push(-x / 4, z / 4, x / 4, z / 4);
    if (n) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    n++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// plated hull paint: strakes, butts, rust weeping from scuppers and hawse pipes, grime at the waterline, boot topping,
// red antifouling below (u along the length, v keel -> deck)
let HULLTEX = null;
function hullTex() {
  if (HULLTEX) return HULLTEX;
  const W = 2048, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(1941);
  const vy = (y) => H - (y + DR) / (10 + DR) * H;           // a canvas row for a height (deck ~ 10 m)
  g.fillStyle = '#5B6168'; g.fillRect(0, 0, W, H);           // dark grey (Measure 1 hull)
  g.fillStyle = '#6E2A22'; g.fillRect(0, vy(-1.1), W, H);    // antifouling red below
  g.fillStyle = '#1A1A1C'; g.fillRect(0, vy(0.7), W, vy(-1.1) - vy(0.7));   // boot topping
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '20,22,26' : '150,155,160'},${0.03 + R() * 0.05})`; g.fillRect(R() * W, R() * H, 2 + R() * 10, 1 + R() * 2); }
  g.strokeStyle = 'rgba(30,32,36,0.35)'; g.lineWidth = 1.4;           // strakes every ~2.2 m, butts every ~9 m
  for (let y = -DR; y < 12; y += 2.2) { g.beginPath(); g.moveTo(0, vy(y)); g.lineTo(W, vy(y)); g.stroke(); }
  for (let k = 0; k < 24; k++) { const x = (k + R() * 0.3) * W / 24; for (let y = -DR; y < 12; y += 2.2) { g.beginPath(); g.moveTo(x + (R() - 0.5) * 20, vy(y)); g.lineTo(x + (R() - 0.5) * 20, vy(y + 2.2)); g.stroke(); } }
  for (let i = 0; i < 160; i++) {                                     // rust streaks running down
    const x = R() * W, y0 = vy(3 + R() * 5.5), len = 20 + R() * 90, gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, `rgba(110,60,30,${0.25 + R() * 0.25})`); gr.addColorStop(1, 'rgba(110,60,30,0)'); g.fillStyle = gr; g.fillRect(x, y0, 1.5 + R() * 3, len);
  }
  const wl = g.createLinearGradient(0, vy(2.2), 0, vy(0.7)); wl.addColorStop(0, 'rgba(40,38,32,0)'); wl.addColorStop(1, 'rgba(40,38,32,0.45)'); g.fillStyle = wl; g.fillRect(0, vy(2.2), W, vy(0.7) - vy(2.2));
  HULLTEX = new THREE.CanvasTexture(c); HULLTEX.colorSpace = THREE.SRGBColorSpace; HULLTEX.anisotropy = 8; HULLTEX.userData.keep = true;
  return HULLTEX;
}
let PAINTTEX = null;
function paintTex() {                                        // a weathered grey paint for the upperworks (tiles per box face)
  if (PAINTTEX) return PAINTTEX;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), R = rng(7);
  g.fillStyle = '#BFC3C6'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.6 ? '60,62,66' : '230,232,235'},${0.015 + R() * 0.025})`; g.fillRect(R() * N, R() * N, 1 + R() * 3, 1 + R() * 2); }
  for (let i = 0; i < 30; i++) { const x = R() * N, gr = g.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, 'rgba(70,66,60,0.07)'); gr.addColorStop(1, 'rgba(70,66,60,0)'); g.fillStyle = gr; g.fillRect(x, R() * N * 0.3, 1 + R() * 2, N); }
  PAINTTEX = new THREE.CanvasTexture(c); PAINTTEX.colorSpace = THREE.SRGBColorSpace; PAINTTEX.userData.keep = true;
  return PAINTTEX;
}

// ── geometry helpers (each returns a non-indexed-free indexed geometry placed in ship space) ──────────────────────
const box = (w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); return g.translate(x, y, z); };
const cyl = (rt, rb, h, x, y, z, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
function rod(a, b, r, seg = 6) {                            // a cylinder from a to b
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return g.translate(A.x, A.y, A.z);
}
function turretHouse(w, l, h) {                             // a turret house: flat sides, sloped armoured face, rounded rear
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -l * 0.45); s.lineTo(w / 2, -l * 0.45); s.lineTo(w / 2, l * 0.28); s.quadraticCurveTo(w / 2, l * 0.5, w * 0.3, l * 0.55);
  s.lineTo(-w * 0.3, l * 0.55); s.quadraticCurveTo(-w / 2, l * 0.5, -w / 2, l * 0.28); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2, curveSegments: 8 });
  g.rotateX(Math.PI / 2); g.translate(0, h, 0);            // extrude up (shape y -> +z: the face points +Z)
  // the sloped face: pull the top front edge back
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i), z = P.getZ(i); if (z > l * 0.2) P.setZ(i, z - (y / h) * l * 0.18); }
  g.computeVertexNormals();
  return g;
}

const ix = (g) => { if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
const merge = (list) => mergeGeometries(list.map((g) => ix(g)));
// o: {seed}; -> {group, length, beam, height, update(t), anchors}
export function buildWarship41(o = {}) {
  const group = new THREE.Group(); group.name = 'warship';
  const hullM = plain({ map: hullTex(), roughness: 0.7, metalness: 0.15 });
  const greyM = plain({ map: paintTex(), color: 0x7F858C, roughness: 0.62, metalness: 0.18 });       // upperworks
  const darkM = plain({ map: paintTex(), color: 0x50555C, roughness: 0.6, metalness: 0.2 });         // turrets, barrels, darker steel
  const blackM = plain({ color: 0x18191B, roughness: 0.55, metalness: 0.3 });
  const canvasM = plain({ color: 0xB9B4A2, roughness: 0.95 });                                         // blast bags, boat covers
  const deckT = TX.planks({ size: 512, meters: 4, boardW: 0.16, tone: '#77705F', tone2: '#8C8472', seed: 9 });
  const dmap = deckT.map.clone(); dmap.needsUpdate = true; dmap.wrapS = dmap.wrapT = THREE.RepeatWrapping;
  const deckM = plain({ map: dmap, color: 0xB0A894, roughness: 0.9 });
  const glassM = plain({ color: 0x0E1418, roughness: 0.15, metalness: 0.6 });
  const G = { grey: [], dark: [], black: [], canvas: [], glass: [] };
  const R = rng(o.seed ?? 1941);

  const hull = new THREE.Mesh(hullGeometry(), hullM); hull.name = 'hull'; group.add(hull);
  const deck = new THREE.Mesh(deckGeometry(), deckM); deck.name = 'deck'; group.add(deck);

  // ── turrets: 4 x triple 14-inch; II and III superfire; blast bags; rangefinder ears on II / III ──
  const turretAt = [[56, 0, 1], [40.5, 3.2, 1], [-43, 3.2, -1], [-58.5, 0, -1]];
  const anchors = {};
  turretAt.forEach(([z, lift, fwd], k) => {
    const tg = new THREE.Group(); tg.name = 'turret_' + (k + 1);
    const y0 = deckY(z) + lift;
    tg.position.set(0, y0, z); if (fwd < 0) tg.rotation.y = Math.PI;
    group.add(tg);
    const parts = { dark: [], black: [], canvas: [] };
    if (lift > 0) parts.dark.push(cyl(5.6, 5.8, lift + 0.4, 0, -lift / 2 + 0.1, 0, 28));                    // barbette
    parts.dark.push(turretHouse(10.6, 10.5, 3.3).translate(0, 0.15, -0.6));
    parts.dark.push(box(10.2, 0.25, 9.2, 0, 3.55, -1.1));                                                   // roof plate
    for (const x of [-2.1, 0, 2.1]) {                                                                         // the guns: 16 m, slightly elevated
      const gun = new THREE.CylinderGeometry(0.34, 0.5, 16.5, 12); gun.rotateX(Math.PI / 2 - 2.5 * DEG); gun.translate(x, 1.9 + 0.36, 4.6 + 8.25);
      parts.dark.push(gun);
      const mz = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 12); mz.rotateX(Math.PI / 2 - 2.5 * DEG); mz.translate(x, 1.9 + 0.72, 4.6 + 16.4); parts.black.push(mz);
      const bag = new THREE.CylinderGeometry(0.75, 0.9, 1.4, 12); bag.rotateX(Math.PI / 2); bag.translate(x, 1.85, 4.55); parts.canvas.push(bag);
    }
    if (lift > 0) { parts.dark.push(box(13.5, 0.9, 1.0, 0, 2.4, -3.2)); for (const s of [-1, 1]) parts.dark.push(cyl(0.6, 0.6, 1.2, s * 6.9, 2.4, -3.2, 10).rotateZ(0)); }   // rangefinder ears
    parts.dark.push(box(1.4, 0.7, 1.6, -3.4, 3.9, -3.0)); parts.dark.push(box(1.4, 0.7, 1.6, 3.4, 3.9, -3.0));   // sighting hoods
    if (k === 2) {                                                                                            // catapult girder on turret III
      parts.dark.push(box(1.0, 0.6, 18, 0, 4.2, 2.0)); parts.dark.push(box(0.2, 0.9, 18, -0.5, 4.5, 2.0)); parts.dark.push(box(0.2, 0.9, 18, 0.5, 4.5, 2.0));
    }
    for (const [key, M] of [['dark', darkM], ['black', blackM], ['canvas', canvasM]]) if (parts[key].length) { const m = new THREE.Mesh(merge(parts[key]), M); m.castShadow = m.receiveShadow = true; tg.add(m); }
    anchors['turret_' + (k + 1)] = tg;
  });

  // ── forward superstructure: conning tower, stepped bridge levels with wings, the tripod foremast and its tops ──
  const zb = 25, yb = deckY(zb);
  G.grey.push(box(15, 2.8, 18, 0, yb + 1.4, zb - 1));                       // 01 level
  G.grey.push(box(12, 2.6, 13, 0, yb + 4.1, zb - 2));                       // 02 level
  G.grey.push(box(20, 0.35, 5.2, 0, yb + 5.6, zb + 1.5));                   // the bridge wings
  G.grey.push(box(9.5, 2.4, 6.5, 0, yb + 6.6, zb + 0.5));                   // the navigating bridge
  G.glass.push(box(9.6, 0.7, 6.6, 0, yb + 7.0, zb + 0.5));                  // its windows band
  G.grey.push(box(8.0, 2.4, 7.5, 0, yb + 9.0, zb - 2.5));                   // the flag bridge / chart house climbing the tripod
  G.grey.push(box(14, 0.3, 4.0, 0, yb + 10.35, zb - 1.5));                  // its wings
  G.grey.push(box(6.0, 2.2, 6.0, 0, yb + 11.5, zb - 3.4));                  // the signal / searchlight level
  G.glass.push(box(6.1, 0.6, 6.1, 0, yb + 11.9, zb - 3.4));
  for (const s of [-1, 1]) G.grey.push(cyl(0.7, 0.7, 1.0, s * 3.6, yb + 13.0, zb - 3.4, 12));
  G.dark.push(cyl(3.3, 3.4, 6.2, 0, yb + 3.4, zb + 5.5, 24));               // conning tower
  G.dark.push(cyl(3.5, 3.5, 0.5, 0, yb + 6.7, zb + 5.5, 24));
  G.glass.push(cyl(3.32, 3.32, 0.45, 0, yb + 6.0, zb + 5.5, 24));           // its vision slits
  const fm = [0, 37.5, zb - 4];                                              // tripod apex
  for (const [x, z] of [[-4.6, zb + 1.5], [4.6, zb + 1.5], [0, zb - 10.5]]) G.dark.push(rod([x, yb + 0.5, z], fm, 0.55, 10));
  G.grey.push(cyl(4.4, 4.0, 2.6, fm[0], fm[1] + 1.0, fm[2], 20));          // fire-control top, lower level
  G.glass.push(cyl(4.42, 4.42, 0.8, fm[0], fm[1] + 1.4, fm[2], 20));
  G.grey.push(cyl(3.6, 4.3, 2.3, fm[0], fm[1] + 3.5, fm[2], 20));          // upper level
  G.glass.push(cyl(3.85, 3.85, 0.7, fm[0], fm[1] + 3.8, fm[2], 20));
  G.dark.push(cyl(4.6, 4.6, 0.3, fm[0], fm[1] - 0.4, fm[2], 20));          // platform
  G.dark.push(box(9, 0.3, 6, 0, yb + 21, zb - 4.6));                       // a searchlight / AA platform half way up the tripod
  for (const s of [-1, 1]) { G.grey.push(cyl(0.65, 0.65, 0.9, s * 3.5, yb + 21.6, zb - 4.6, 12)); G.dark.push(box(0.12, 1.0, 6, s * 4.5, yb + 21.6, zb - 4.6)); }
  G.dark.push(box(7.5, 1.1, 1.3, fm[0], fm[1] + 5.4, fm[2] - 0.4));        // the director's rangefinder
  G.dark.push(rod([0, fm[1] + 4.7, fm[2] - 1.2], [0, fm[1] + 16, fm[2] - 1.6], 0.28, 8));   // topmast
  G.dark.push(rod([-5, fm[1] + 11, fm[2] - 1.4], [5, fm[1] + 11, fm[2] - 1.4], 0.12, 6));   // yardarm
  G.dark.push(rod([-3, fm[1] + 14, fm[2] - 1.5], [3, fm[1] + 14, fm[2] - 1.5], 0.09, 6));
  anchors.bridge = new THREE.Object3D(); anchors.bridge.position.set(0, yb + 6.6, zb + 0.5);
  anchors.foremast_top = new THREE.Object3D(); anchors.foremast_top.position.set(...fm.map((v, i) => (i === 1 ? v + 3 : v)));

  // ── amidships: one oval funnel with cap and searchlight platforms, boat deck, launches, boat cranes, 5-inch AA ──
  const yd = deckY(0);
  G.grey.push(box(17, 3.2, 34, 0, yd + 1.6, -1));                           // the boat-deck house
  G.grey.push(box(21, 0.3, 32, 0, yd + 3.35, -1));                          // the boat deck
  { const f = new THREE.CylinderGeometry(3.5, 3.8, 18, 28); f.scale(1, 1, 1.5); f.rotateX(-3 * DEG); f.translate(0, yd + 3.4 + 9.0, 1.5); G.grey.push(f);
    const top = new THREE.CylinderGeometry(3.55, 3.55, 1.8, 28); top.scale(1, 1, 1.5); top.rotateX(-3 * DEG); top.translate(0, yd + 3.4 + 17.3, 1.0); G.black.push(top);
    const cap = new THREE.TorusGeometry(3.5, 0.2, 6, 28); cap.rotateX(Math.PI / 2); cap.scale(1, 1, 1.5); cap.translate(0, yd + 3.4 + 18.2, 0.95); G.dark.push(cap);
    for (const s of [-1, 1]) { G.dark.push(box(2.6, 0.25, 3.0, s * 4.4, yd + 3.4 + 9.5, 1.5)); G.grey.push(cyl(0.6, 0.6, 0.9, s * 4.6, yd + 3.4 + 10.1, 1.6, 14)); } }   // searchlights
  anchors.funnel = new THREE.Object3D(); anchors.funnel.position.set(0, yd + 21.6, 1.0);
  for (const [x, z, l] of [[-6.6, -10, 11], [6.6, -10, 11], [-6.4, 2.5, 9], [6.4, 2.5, 9], [-6.6, 13, 10], [6.6, 13, 10]]) {   // launches on chocks
    const hullB = new THREE.CapsuleGeometry(1.25, l - 2.5, 4, 10); hullB.rotateX(Math.PI / 2); hullB.scale(1, 0.75, 1); hullB.translate(x, yd + 4.4, z); G.grey.push(hullB);
    G.canvas.push(box(2.0, 0.5, l * 0.55, x, yd + 5.2, z - l * 0.1));
  }
  for (const s of [-1, 1]) {                                                 // boat cranes: kingpost + boom
    const kx = s * 8.2, kz = -3; G.dark.push(cyl(0.6, 0.75, 13, kx, yd + 3.4 + 6.5, kz, 12));
    G.dark.push(rod([kx, yd + 3.4 + 2.5, kz], [kx - s * 9.5, yd + 3.4 + 11, kz + 4], 0.3, 8));
  }
  for (const z of [-13, -5, 5, 12.5]) for (const s of [-1, 1]) {            // 5-inch/25 AA on open mounts
    const x = s * 9.3, y = yd + 3.5;
    G.dark.push(cyl(0.7, 0.9, 1.0, x, y + 0.5, z, 10));
    G.dark.push(box(1.6, 1.2, 1.2, x, y + 1.3, z));
    G.dark.push(rod([x, y + 1.5, z + 0.4], [x + s * 0.6, y + 3.6, z + 4.6], 0.13, 6));
  }

  // ── the tripod mainmast and the after deckhouse ──
  const zm = -22, ym = deckY(zm);
  G.grey.push(box(11, 2.6, 12, 0, ym + 1.3, zm - 1));
  const mm = [0, 31.5, zm - 2];
  for (const [x, z] of [[-4, zm + 2.5], [4, zm + 2.5], [0, zm - 8]]) G.dark.push(rod([x, ym + 0.5, z], mm, 0.5, 10));
  G.grey.push(cyl(3.8, 3.5, 2.4, mm[0], mm[1] + 1.0, mm[2], 20)); G.glass.push(cyl(3.82, 3.82, 0.7, mm[0], mm[1] + 1.4, mm[2], 20));
  G.grey.push(cyl(3.0, 3.6, 2.0, mm[0], mm[1] + 3.2, mm[2], 20));
  G.dark.push(cyl(4.0, 4.0, 0.3, mm[0], mm[1] - 0.4, mm[2], 20));
  G.dark.push(box(8, 0.3, 5.5, 0, ym + 14, zm - 2.5)); for (const s of [-1, 1]) G.grey.push(cyl(0.6, 0.6, 0.9, s * 3.1, ym + 14.6, zm - 2.5, 12));   // a searchlight platform
  G.dark.push(rod([0, mm[1] + 4.0, mm[2] - 0.6], [0, mm[1] + 13, mm[2] - 1.0], 0.24, 8));
  G.dark.push(rod([-4, mm[1] + 9, mm[2] - 0.8], [4, mm[1] + 9, mm[2] - 0.8], 0.1, 6));
  anchors.mainmast_top = new THREE.Object3D(); anchors.mainmast_top.position.set(mm[0], mm[1] + 3, mm[2]);

  // ── 5-inch/51 casemate guns along both sides (recess + barrel), portholes ──
  for (const s of [-1, 1]) for (const z of [-27, -18, -9, 0, 9, 18, 27]) {
    const y = deckY(z) - 2.4, x = s * hb(z, y);
    G.black.push(box(1.6, 1.3, 2.4, x - s * 0.4, y, z));
    const b = new THREE.CylinderGeometry(0.12, 0.16, 7.2, 8); b.rotateZ(-s * Math.PI / 2); b.rotateY(-s * 12 * DEG); b.translate(x + s * 3.0, y, z + 0.6); G.dark.push(b);
  }
  { const pts = [];
    for (const yy of [2.6, 4.4]) for (let z = -78; z <= 82; z += 2.6) { if (Math.abs(z) < 32 && yy > 4) continue; for (const s of [-1, 1]) { const x = s * (hb(z, yy) + 0.02); if (Math.abs(x) > 1) pts.push([x, yy, z, s]); } }
    const pg = new THREE.CircleGeometry(0.22, 10); const im = new THREE.InstancedMesh(pg, blackM, pts.length); im.name = 'portholes';
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    pts.forEach(([x, y, z, s], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * Math.PI / 2); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); });
    group.add(im); }

  // ── forecastle fittings: anchors in the hawse pipes, chains to the capstans, the jackstaff; stern: catapult, plane, flagstaff ──
  for (const s of [-1, 1]) {
    const z = 80, y = 5.4, x = s * (hb(z, y) + 0.1);
    G.black.push(box(0.4, 2.6, 1.6, x, y - 0.6, z));                         // the anchor
    G.black.push(cyl(0.55, 0.55, 0.3, x - s * 0.1, y + 0.9, z, 12).rotateZ(0));
    const yc = deckY(72); G.black.push(rod([s * 2.4, deckY(80) + 0.15, 80], [s * 1.6, yc + 0.15, 68], 0.22, 6)); G.dark.push(cyl(0.9, 1.0, 0.9, s * 1.6, yc + 0.5, 67.5, 14));
  }
  { const jz = 94, jy = deckY(jz); G.dark.push(rod([0, jy, jz], [0, jy + 7, jz + 0.6], 0.09, 6)); anchors.bow = new THREE.Object3D(); anchors.bow.position.set(0, jy, jz - 2); }
  { const sz = -92, sy = deckY(sz); G.dark.push(rod([0, sy, sz], [0, sy + 8, sz - 0.6], 0.1, 6)); anchors.stern = new THREE.Object3D(); anchors.stern.position.set(0, sy, sz + 2); }
  { const cz = -78, cy = deckY(cz);                                          // the stern catapult with a floatplane
    G.dark.push(cyl(1.3, 1.5, 1.0, 0, cy + 0.5, cz, 14)); G.dark.push(box(1.0, 0.7, 20, 0, cy + 1.3, cz + 1, 0.35));
    const P = []; const pz = cz + 2, py = cy + 3.0;
    P.push(new THREE.CapsuleGeometry(0.6, 7.5, 4, 8).rotateX(Math.PI / 2).translate(0, py, pz));
    P.push(box(11.5, 0.18, 1.7, 0, py + 0.6, pz + 1.2)); P.push(box(4.2, 0.12, 1.1, 0, py + 0.2, pz - 3.6)); P.push(box(0.12, 1.6, 1.2, 0, py + 0.9, pz - 3.8));
    P.push(new THREE.CapsuleGeometry(0.5, 5.0, 4, 8).rotateX(Math.PI / 2).translate(0, py - 1.5, pz + 0.6));
    for (const s of [-1, 1]) P.push(rod([s * 0.4, py - 1.3, pz + 1.5], [s * 0.25, py - 0.2, pz + 1.3], 0.06, 4));
    const pl = new THREE.Mesh(merge(P), greyM); pl.castShadow = true;
    const pg = new THREE.Group(); pg.name = 'floatplane'; pg.add(pl); group.add(pg); }

  // ── railings along the deck edge (stanchions + two rails), forecastle and quarterdeck ──
  { const st = [], rails = [];
    for (const [z0, z1] of [[34, 90], [-90, -34]]) for (const s of [-1, 1]) {
      let prev = null;
      for (let z = z0; z <= z1; z += 2.2) { const y = deckY(z), x = s * hb(z, y) * 0.975; st.push([x, y, z]); if (prev) for (const h of [0.55, 1.05]) rails.push(rod([prev[0], prev[1] + h, prev[2]], [x, y + h, z], 0.025, 4)); prev = [x, y, z]; }
    }
    const sg = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 4).translate(0, 0.55, 0);
    const im = new THREE.InstancedMesh(sg, greyM, st.length); im.name = 'stanchions'; const m4 = new THREE.Matrix4();
    st.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); im.setMatrixAt(i, m4); }); group.add(im);
    group.add(new THREE.Mesh(merge(rails), greyM)); }

  // ── merge the static parts per material ──
  for (const [key, M] of [['grey', greyM], ['dark', darkM], ['black', blackM], ['canvas', canvasM], ['glass', glassM]]) {
    if (!G[key].length) continue;
    const m = new THREE.Mesh(merge(G[key]), M);
    m.name = 'warship_' + key; m.castShadow = m.receiveShadow = true; group.add(m);
  }
  // ── rigging: the wireless aerials and stays, 1 px lines (masts -> bow / stern / each other) ──
  { const P = [], fT = [fm[0], fm[1] + 16, fm[2] - 1.6], mT = [mm[0], mm[1] + 13, mm[2] - 1.0];
    const J = [0, deckY(94) + 7, 94.6], S = [0, deckY(-92) + 8, -92.6];
    for (const [a, b] of [[fT, J], [fT, mT], [mT, S], [[-5, fm[1] + 11, fm[2] - 1.4], [-4, mm[1] + 9, mm[2] - 0.8]], [[5, fm[1] + 11, fm[2] - 1.4], [4, mm[1] + 9, mm[2] - 0.8]]]) P.push(...a, ...b);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2A2C30, transparent: true, opacity: 0.8 })); ln.name = 'rigging'; ln.userData.noQA = true; group.add(ln); }
  for (const [k, a] of Object.entries(anchors)) if (!a.parent) { a.name = 'anchor:' + k; group.add(a); }
  hull.castShadow = hull.receiveShadow = true; deck.receiveShadow = true;
  void R;
  return { group, length: 180, beam: 2 * BH, height: 54, anchors, update() {} };
}
