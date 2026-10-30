// surgery.js — the SURGERY KIT (E1 specificity kit, 2026-09-29): "a surgery on a table" that reads in one second.
//   interior.operating_room  a hospital operating room (era modern | 1960s): pale green tiled walls, a terrazzo floor,
//                            the operating table with the patient under surgical drapes (the head free at the top end,
//                            the operating field open on the abdomen), a ceiling surgical lamp throwing a hard white
//                            pool on the field, an instrument tray on a Mayo stand, an IV pole, an anaesthesia monitor
//   interior.field_hospital  an army field-hospital tent (olive canvas, wooden poles, bare bulbs on a wire, crates, a
//                            stretcher on trestles) with the same table, patient and a hanging lamp
//   prop.operating_table     the table with the draped patient on its own (for any room); prop.surgical_lamp,
//                            prop.instrument_tray
// Surgeons: cast with kit "surgeon" (gown, cap, mask, gloves), action "operate" (tool scalpel|forceps|none), standing at
// the table's sides: with the table at [x, z] and heading 180 (the patient's head toward +Z), stand at [x - 0.72, z + 0.13]
// heading 90 and [x + 0.72, z + 0.15] heading 270 (anchors: left_side, right_side, field, head, lamp, tray).
import * as THREE from 'three';
import { plain } from '../shared/materials.js';
import { ground, xz, yawFromHeading, patchAll } from './common.js';
import { buildRecipe, PRESETS } from './propbuild.js';
import { buildCharacter } from './cast.js';
import { clamp, lerp } from '../shared/util.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

// ── tiles / terrazzo / canvas textures ─────────────────────────────────────────────────────────────────────────
const TX = {};
function tileTex(col = '#B9CFC4', grout = '#8FA39A', n = 8) {
  const k = 'tile' + col + n; if (TX[k]) return TX[k];
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = grout; g.fillRect(0, 0, 256, 256);
  const w = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 0.94 + 0.06 * Math.sin(i * 12.9 + j * 7.3); g.fillStyle = col; g.globalAlpha = 1; g.fillRect(i * w + 1.5, j * w + 1.5, w - 3, w - 3); g.fillStyle = `rgba(255,255,255,${0.05 * v})`; g.fillRect(i * w + 2, j * w + 2, w - 4, (w - 4) * 0.4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TX[k] = t);
}
function speckTex(base = '#C9C4B8') {
  const k = 'speck' + base; if (TX[k]) return TX[k];
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 0.6 + Math.random() * 1.6; const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(60,60,58,0.5)' : v < 0.8 ? 'rgba(240,238,230,0.6)' : 'rgba(120,110,95,0.5)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TX[k] = t);
}
const M = {};
function mat(key) {
  if (M[key]) return M[key];
  const P = {
    steel: { color: 0xC9CDD0, roughness: 0.28, metalness: 0.85 }, dsteel: { color: 0x6A6E72, roughness: 0.35, metalness: 0.8 },
    pad: { color: 0x2A2F34, roughness: 0.6 }, sheet: { color: 0x4F8074, roughness: 0.92, side: THREE.DoubleSide }, sheetB: { color: 0x3F6F8E, roughness: 0.92, side: THREE.DoubleSide },
    skin: { color: 0xE9DCCB, roughness: 0.55 }, cut: { color: 0x5A1614, roughness: 0.4 }, white: { color: 0xEEEEEA, roughness: 0.5 }, cream: { color: 0xE8E2D2, roughness: 0.7 },
    screen: { color: 0x061008, roughness: 0.2, metalness: 0.1 }, trace: { color: 0x40FF70, emissive: 0x30FF60, emissiveIntensity: 2.2 },
    lamp: { color: 0xF5F7F8, emissive: 0xFFFFFF, emissiveIntensity: 3.2, roughness: 0.2 }, lampBody: { color: 0xDADDE0, roughness: 0.35, metalness: 0.5 },
    wood: { color: 0x6E5238, roughness: 0.75 }, canvas: { color: 0x5A5E3E, roughness: 0.97, side: THREE.DoubleSide }, canvasIn: { color: 0x6B6E4B, roughness: 0.97, side: THREE.DoubleSide },
    bulb: { color: 0xFFE8B8, emissive: 0xFFD890, emissiveIntensity: 3.5 }, bag: { color: 0xE8F0F2, roughness: 0.15, transparent: true, opacity: 0.6 },
    floorOR: { color: 0xFFFFFF, roughness: 0.55, map: speckTex('#C9C6BC') }, wallOR: { color: 0xFFFFFF, roughness: 0.4, map: tileTex('#B7CEC3', '#94A69D', 8) },
    ceil: { color: 0xE9ECEA, roughness: 0.9 }, earth: { color: 0x5E4A34, roughness: 1 }, crate: { color: 0x5F6440, roughness: 0.8 },
  }[key] || { color: 0x888888 };
  M[key] = plain({ ...P });
  return M[key];
}
function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, typeof m === 'string' ? mat(m) : m); o.castShadow = cast; o.receiveShadow = true; return o; }
function box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }

// ── the patient: the house mannequin lying on its back on the table (feet toward +Z), head free at -Z ────────────────
const LIE = { plant: false, drop: 0.85, lean: -PI / 2, spineX: 0.02, chestX: 0.0, headX: -0.12, headY: 0.18, headZ: 0.02,
  lArmX: 0.06, rArmX: 0.06, lArmZ: 0.04, rArmZ: -0.04, lElbow: -0.08, rElbow: -0.08, lForeY: 0.4, rForeY: -0.4,
  lLeg: -0.02, rLeg: -0.02, lKnee: 0.06, rKnee: 0.06, lLegZ: 0.03, rLegZ: -0.03, lLegY: 0.3, rLegY: -0.3, lFoot: 0.5, rFoot: 0.5,
  lShape: 'relaxed', rShape: 'relaxed', weapon: null, armSwing: [0, 0] };
function patientFigure(ctx, o = {}) {
  const res = buildCharacter({ id: 'patient', kit: o.kit || 'patient', colors: o.colors }, ctx);
  const fig = res.fig;
  fig._apply({ lArmZ: 0.07, rArmZ: -0.07, lElbow: -0.14, rElbow: -0.14, ...LIE }, null);
  fig.group.updateMatrixWorld(true);
  // the lowest point of the posed skin (SkinnedMesh boxes follow the bones) onto y = 0 of the figure group
  let lo = Infinity; const bb = new THREE.Box3();
  fig.group.traverse((m) => { if (m.isSkinnedMesh) { m.computeBoundingBox(); bb.copy(m.boundingBox).applyMatrix4(m.matrixWorld); lo = Math.min(lo, bb.min.y); } else if (m.isMesh && m.geometry) { bb.setFromObject(m); if (!bb.isEmpty()) lo = Math.min(lo, bb.min.y); } });
  if (!Number.isFinite(lo)) lo = 0.02;
  fig.group.position.y = -lo + 0.004;
  fig.group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return fig;
}

// ── the drape: a sheet over a body-shaped mound, hanging down the table sides; the field window on the abdomen ───────
function drapeGeo(L, W, top, drop, field) {
  // u along the table (-L/2 .. L/2, the head end at -L/2), v across; the body mound under it
  const nu = 70, nv = 34, pos = [], uv = [], idx = [];
  const prof = (z) => {                                         // body thickness along z (the head end is uncovered)
    const k = (z + L / 2) / L;                                  // 0 head end .. 1 foot end
    const chest = 0.3 * Math.exp(-(((k - 0.3) / 0.13) ** 2)), belly = 0.28 * Math.exp(-(((k - 0.45) / 0.11) ** 2));
    const thighs = 0.22 * Math.exp(-(((k - 0.62) / 0.12) ** 2)), shins = 0.17 * Math.exp(-(((k - 0.8) / 0.1) ** 2)), feet = 0.26 * Math.exp(-(((k - 0.93) / 0.05) ** 2));
    return Math.max(chest, belly, thighs, shins, feet, 0.06) * (k < 0.2 ? sm((k - 0.13) / 0.07) : 1);
  };
  const halfW = (z) => { const k = (z + L / 2) / L; return lerp(0.27, 0.2, sm((k - 0.45) / 0.45)); };
  for (let i = 0; i <= nu; i++) {
    const z = -L / 2 + 0.22 + (L - 0.22) * i / nu;
    for (let j = 0; j <= nv; j++) {
      const v = (j / nv) * 2 - 1;                               // -1 .. 1 across the whole sheet (incl. the hanging sides)
      const x = v * (W / 2 + 0.06), ax = Math.abs(x);
      let y;
      if (ax <= W / 2) { const hw = halfW(z), h = prof(z); const q = clamp(ax / hw); y = top + h * Math.sqrt(Math.max(0, 1 - q * q)) * (ax < hw ? 1 : 0) + 0.012 + 0.006 * Math.sin(z * 9 + v * 5); }
      else y = top + 0.012;
      // the sides hang: past the table edge the sheet falls
      const over = Math.max(0, ax - W / 2) / 0.06;
      const xx = ax > W / 2 ? Math.sign(x) * (W / 2 + 0.02) : x;
      if (ax > W / 2) y = top + 0.012 - drop * sm(over);
      pos.push(xx, y, z); uv.push(j / nv, i / nu);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return { g, prof, halfW };
}

// ── the operating table with the patient ─────────────────────────────────────────────────────────────────────────
function operatingTable(ctx, o = {}) {
  const G = new THREE.Group(); G.name = 'operating_table';
  const L = 2.0, W = 0.52, top = num(o.height, 0.92), era = o.era || 'modern', field = o.field !== false;
  // base: a column on a foot (modern) or a pedestal with a crank (1960s) / a wooden field table
  if (era === 'field') {
    G.add(mesh(box(W + 0.06, 0.05, L), 'wood').translateY(top - 0.1));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) G.add(mesh(box(0.06, top - 0.12, 0.06), 'wood').translateX(x * (W / 2 - 0.02)).translateY((top - 0.12) / 2).translateZ(z * (L / 2 - 0.1)));
    G.add(mesh(box(W, 0.05, L - 0.1), 'cream').translateY(top - 0.05));
  } else {
    G.add(mesh(box(0.6, 0.08, 1.0), 'dsteel').translateY(0.04));
    G.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, top - 0.22, 20), 'steel').translateY(0.08 + (top - 0.22) / 2));
    G.add(mesh(box(W - 0.04, 0.08, L - 0.2), 'steel').translateY(top - 0.13));
    G.add(mesh(box(W, 0.08, L), 'pad').translateY(top - 0.04));
    for (const s of [1, -1]) G.add(mesh(box(0.02, 0.025, L - 0.3), 'steel').translateX(s * (W / 2 + 0.01)).translateY(top - 0.1));   // side rails
    // an arm board out to the side for the IV
    G.add(mesh(box(0.55, 0.05, 0.16), 'pad').translateX(-(W / 2 + 0.27)).translateY(top - 0.03).translateZ(-L / 2 + 0.55));
  }
  const anchors = {};
  const A = (n, x, y, z) => { const a = new THREE.Object3D(); a.position.set(x, y, z); a.name = 'anchor:' + n; G.add(a); anchors[n] = a; };
  let fig = null;
  if (o.patient !== false) {
    fig = patientFigure(ctx, { kit: o.patient_kit });
    // head at the -Z end: the figure lies with its feet toward +Z of its own frame when its group faces +Z... LIE puts the
    // feet toward +Z and the head toward -Z
    fig.group.position.set(0, fig.group.position.y + top, -0.1);
    G.add(fig.group);
  }
  // drapes
  const d = drapeGeo(L, W, top, 0.38, field);
  const drape = mesh(d.g, o.drape === 'blue' ? 'sheetB' : 'sheet'); drape.name = 'drape'; G.add(drape);
  // the anaesthesia screen at the chest: a drape over a bar (the head stays on the anaesthetist's side)
  if (o.screen === true) {                     // the anaesthesia screen (off by default: it blocks inserts)
    const zs = -L / 2 + 0.52;
    for (const s of [1, -1]) G.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8), 'dsteel').translateX(s * (W / 2 + 0.1)).translateY(top + 0.2).translateZ(zs));
    const scr = new THREE.PlaneGeometry(W + 0.2, 0.36, 10, 6); { const P = scr.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setZ(i, 0.04 * Math.cos(P.getX(i) * 4) * (0.18 - y) * 2); } scr.computeVertexNormals(); }
    G.add(mesh(scr, o.drape === 'blue' ? 'sheetB' : 'sheet').translateY(top + 0.24).translateZ(zs));
  }
  // the operating field on the abdomen: skin + a clean incision line (no gore)
  const zf = -L / 2 + 0.22 + (L - 0.22) * 0.44, hf = d.prof(zf);
  if (field) {
    const f = mesh(new THREE.PlaneGeometry(0.2, 0.26).rotateX(-PI / 2), 'skin', false); f.position.set(0, top + hf + 0.016, zf); G.add(f);
    const c = mesh(new THREE.PlaneGeometry(0.008, 0.16).rotateX(-PI / 2), 'cut', false); c.position.set(0, top + hf + 0.018, zf); G.add(c);
    for (const s of [1, -1]) { const e = mesh(new THREE.BoxGeometry(0.02, 0.012, 0.28), 'white'); e.position.set(s * 0.11, top + hf + 0.02, zf); G.add(e); }    // towels framing the field
  }
  // under the drape the body is not drawn at all (a clipping plane just below the drape's top edge keeps the head,
  // neck and shoulders): arms, legs and belly can never poke through the sheet, whatever the pose
  const clip = (renderer) => {
    if (!fig || o.drape === false) return;
    if (renderer) renderer.localClippingEnabled = true;
    const zc = -L / 2 + 0.2 + 0.24;
    G.updateMatrixWorld(true);
    const pw = G.localToWorld(V3(0, top, zc)), n = V3(0, 0, -1).transformDirection(G.matrixWorld);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, pw);
    fig.group.traverse((m) => { if (!m.isMesh || !m.material) return; const cl = (x) => { const y = x.clone(); y.clippingPlanes = [plane]; y.clipShadows = true; y.needsUpdate = true; return y; }; m.material = Array.isArray(m.material) ? m.material.map(cl) : cl(m.material); });
  };
  A('field', 0, top + hf + 0.02, zf); A('head', 0, top + 0.12, -L / 2 + 0.2); A('table', 0, top, 0);
  A('left_side', -0.72, 0, zf - 0.05); A('right_side', 0.72, 0, zf - 0.05);
  G.traverse((m) => { if (m.isMesh && m.castShadow === undefined) m.castShadow = true; });
  return { group: G, anchors, top, L, W, fig, zf, clip };
}

function surgicalLamp(o = {}) {
  const G = new THREE.Group(); G.name = 'surgical_lamp';
  const h = num(o.height, 2.25), R = 0.34;
  const head = new THREE.Group(); head.position.set(0, h, 0); G.add(head);
  head.add(mesh(new THREE.CylinderGeometry(R, R * 0.92, 0.12, 36), 'lampBody'));
  head.add(mesh(new THREE.TorusGeometry(R, 0.03, 10, 36).rotateX(PI / 2), 'lampBody'));
  // the lit underside: a ring of bulbs + the centre
  const bulbs = new THREE.Group(); bulbs.position.y = -0.062; head.add(bulbs);
  bulbs.add(mesh(new THREE.CircleGeometry(R * 0.9, 36).rotateX(PI / 2), 'lampBody', false));
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; const b = mesh(new THREE.CircleGeometry(0.055, 16).rotateX(PI / 2), 'lamp', false); b.position.set(Math.cos(a) * 0.21, -0.002, Math.sin(a) * 0.21); bulbs.add(b); }
  const c0 = mesh(new THREE.CircleGeometry(0.07, 18).rotateX(PI / 2), 'lamp', false); c0.position.y = -0.002; bulbs.add(c0);
  head.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 10), 'lampBody').translateY(0.12));               // handle
  // the arm up to the ceiling
  const top = num(o.ceiling, 3.0);
  G.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, top - h - 0.35, 12), 'lampBody').translateY(h + 0.35 + (top - h - 0.35) / 2).translateX(0.45));
  G.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10).rotateZ(PI / 2), 'lampBody').translateY(h + 0.35).translateX(0.22));
  G.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), 'lampBody').translateY(h + 0.2));
  const L = new THREE.SpotLight(0xFFFBF2, num(o.intensity, 30), 6, 0.36, 0.55, 2);
  L.position.set(0, h - 0.08, 0); L.target.position.set(0, 0, 0); G.add(L, L.target);
  L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.0015; L.shadow.normalBias = 0.03; L.name = 'surgical_lamp_light';
  return { group: G, light: L, head };
}

function instrumentTray(o = {}) {
  const G = new THREE.Group(); G.name = 'instrument_tray';
  const h = num(o.height, 1.0);
  // Mayo stand: a U-foot, a post, the tray
  G.add(mesh(box(0.5, 0.03, 0.05), 'dsteel').translateY(0.03).translateZ(-0.2)); G.add(mesh(box(0.05, 0.03, 0.5), 'dsteel').translateY(0.03).translateX(-0.22)); G.add(mesh(box(0.05, 0.03, 0.5), 'dsteel').translateY(0.03).translateX(0.22));
  G.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, h - 0.05, 10), 'steel').translateY((h - 0.05) / 2).translateZ(-0.2));
  const tray = new THREE.Group(); tray.position.y = h; G.add(tray);
  tray.add(mesh(box(0.62, 0.012, 0.44), 'steel'));
  for (const [w, d, x, z] of [[0.62, 0.012, 0, 0.22], [0.62, 0.012, 0, -0.22], [0.012, 0.44, 0.31, 0], [0.012, 0.44, -0.31, 0]]) tray.add(mesh(box(w, 0.03, d), 'steel').translateX(x).translateY(0.015).translateZ(z));
  tray.add(mesh(box(0.56, 0.004, 0.38), 'sheet', false).translateY(0.008));                                   // the green towel
  // instruments in a row
  const items = ['scalpel', 'scalpel', 'forceps', 'forceps', 'forceps', 'scalpel'];
  items.forEach((n, i) => { const B = buildRecipe(PRESETS[n], {}); B.group.rotation.set(0, 0, PI / 2); B.group.position.set(-0.2 + i * 0.08, 0.016, 0); B.group.rotation.set(-PI / 2, 0, 0); B.group.position.set(-0.22 + i * 0.085, 0.016, 0.02); tray.add(B.group); });
  // gauze squares
  for (let k = 0; k < 3; k++) tray.add(mesh(box(0.08, 0.01, 0.08), 'white').translateX(0.2).translateY(0.016 + k * 0.01).translateZ(-0.12 + k * 0.004));
  return { group: G, top: h + 0.02 };
}
function ivPole(o = {}) {
  const G = new THREE.Group(); G.name = 'iv_pole';
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; G.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6).rotateZ(PI / 2).rotateY(a), 'dsteel').translateY(0.05).translateX(Math.cos(a) * 0.14).translateZ(-Math.sin(a) * 0.14)); }
  G.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.9, 8), 'steel').translateY(1.0));
  G.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6).rotateZ(PI / 2), 'steel').translateY(1.92));
  const bag = mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), 'bag', false); bag.scale.set(1, 1, 0.45); bag.position.set(0.09, 1.78, 0); G.add(bag);
  return G;
}
function monitor() {
  const G = new THREE.Group(); G.name = 'monitor';
  G.add(mesh(box(0.5, 0.9, 0.45), 'dsteel').translateY(0.45));
  const scr = new THREE.Group(); scr.position.set(0, 1.18, 0); G.add(scr);
  scr.add(mesh(box(0.46, 0.34, 0.08), 'lampBody')); const s = mesh(new THREE.PlaneGeometry(0.4, 0.28), 'screen', false); s.position.z = 0.041; scr.add(s);
  // the ECG trace
  const pts = []; for (let i = 0; i <= 80; i++) { const x = -0.18 + 0.36 * i / 80, u = (i % 20) / 20; const y = u > 0.4 && u < 0.46 ? 0.07 : u > 0.46 && u < 0.5 ? -0.04 : 0.01 * Math.sin(u * TAU); pts.push(new THREE.Vector3(x, y + 0.03, 0.043)); }
  scr.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0025, 4), 'trace', false));
  const pts2 = pts.map((p) => new THREE.Vector3(p.x, p.y * 0.5 - 0.08, p.z)); scr.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 160, 0.002, 4), 'trace', false));
  return G;
}

// ── rooms ───────────────────────────────────────────────────────────────────────────────────────────────────────
function operatingRoom(ctx, item) {
  const G = new THREE.Group(); G.name = 'operating_room'; G.userData.noQA = true;
  const W = num(item.width, 6.4), D = num(item.depth, 7.0), H = 3.0, era = item.era === '1960s' ? '1960s' : 'modern';
  const floor = mesh(new THREE.PlaneGeometry(W, D).rotateX(-PI / 2), 'floorOR', false); floor.material.map.repeat.set(W / 2, D / 2); floor.position.y = 0.003; G.add(floor);
  const wm = mat('wallOR'); wm.map.repeat.set(3, 1.5);
  const wall = (w, x, z, ry) => { const m = mesh(new THREE.PlaneGeometry(w, H), wm, false); m.position.set(x, H / 2, z); m.rotation.y = ry; m.name = 'wall'; G.add(m); };
  wall(W, 0, -D / 2, 0); wall(W, 0, D / 2, PI); wall(D, -W / 2, 0, PI / 2); wall(D, W / 2, 0, -PI / 2);
  const ceil = mesh(new THREE.PlaneGeometry(W, D).rotateX(PI / 2), 'ceil', false); ceil.position.y = H; G.add(ceil);
  // ceiling light panels (a soft general light) + two point lights for the room
  for (const [x, z] of [[-1.6, -1.8], [1.6, -1.8], [-1.6, 1.8], [1.6, 1.8]]) { const p = mesh(new THREE.PlaneGeometry(1.1, 0.55).rotateX(PI / 2), 'lamp', false); p.material = mat('lamp'); p.position.set(x, H - 0.01, z); G.add(p); }
  const lights = [];
  for (const [x, z] of [[-1.4, 0], [1.4, 0]]) { const l = new THREE.PointLight(0xEFF6F2, 6, 9, 2); l.position.set(x, H - 0.4, z); G.add(l); lights.push(l); }
  const T = operatingTable(ctx, { ...item, era: era === '1960s' ? '1960s' : 'modern' });
  G.add(T.group);
  const lamp = surgicalLamp({ height: T.top + 1.35, ceiling: H, intensity: num(item.lamp_intensity, 28) });
  lamp.group.position.set(0, 0, T.zf); lamp.light.target.position.set(0, T.top + 0.1, 0); G.add(lamp.group);
  const tray = instrumentTray({ height: T.top + 0.1 }); tray.group.position.set(0.95, 0, T.zf + 0.55); tray.group.rotation.y = PI / 2; G.add(tray.group);
  const iv = ivPole(); iv.position.set(-0.95, 0, -0.55); G.add(iv);
  if (item.monitor !== false) { const mo = monitor(); mo.position.set(-0.85, 0, -1.45); mo.rotation.y = PI / 4; G.add(mo); }
  // a wall clock + a cabinet for scale and life
  const cab = mesh(box(1.4, 1.9, 0.45), 'lampBody'); cab.position.set(-W / 2 + 0.3, 0.95, 1.6); cab.rotation.y = PI / 2; G.add(cab);
  const anchors = { ...T.anchors, lamp: lamp.head };
  const ta = new THREE.Object3D(); ta.position.set(0, tray.top, 0); tray.group.add(ta); anchors.tray = ta;
  return { group: G, anchors, lights, size: [W, H, D], T };
}
function fieldHospital(ctx, item) {
  const G = new THREE.Group(); G.name = 'field_hospital'; G.userData.noQA = true;
  const W = num(item.width, 6.0), D = num(item.depth, 8.0), Hw = 1.9, Hr = 3.3;
  // floor: packed earth with duckboards
  const fl = mesh(new THREE.PlaneGeometry(W, D).rotateX(-PI / 2), 'earth', false); fl.position.y = 0.004; G.add(fl);
  for (let i = 0; i < 5; i++) G.add(mesh(box(1.2, 0.04, 0.12), 'wood').translateY(0.02).translateZ(-1.5 + i * 0.18).translateX(-1.6));
  // the canvas: side walls + the pitched roof, a centre ridge on poles
  const side = (s) => { const m = mesh(new THREE.PlaneGeometry(D, Hw, 12, 3), 'canvasIn', false); const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, 0.04 * Math.sin(P.getX(i) * 3.1) * (1 - Math.abs(P.getY(i)) / Hw)); m.geometry.computeVertexNormals(); m.position.set(s * W / 2, Hw / 2, 0); m.rotation.y = -s * PI / 2; G.add(m); };
  side(1); side(-1);
  const rl = Math.hypot(W / 2, Hr - Hw);
  for (const s of [1, -1]) { const m = mesh(new THREE.PlaneGeometry(D, rl, 12, 4), 'canvasIn', false); const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, -0.05 * Math.sin((P.getY(i) / rl + 0.5) * PI) * (0.7 + 0.3 * Math.sin(P.getX(i) * 2))); m.geometry.computeVertexNormals();
    const ang = Math.atan2(Hr - Hw, W / 2); m.position.set(s * W / 4, (Hw + Hr) / 2, 0); m.rotation.set(0, 0, 0); m.rotation.order = 'YXZ'; m.rotation.y = -s * PI / 2; m.rotation.x = -(PI / 2 - ang); G.add(m); }
  for (const s of [1, -1]) { const g = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, Hw), new THREE.Vector2(0, Hr), new THREE.Vector2(-W / 2, Hw)]); const m = mesh(new THREE.ShapeGeometry(g), 'canvasIn', false); m.position.set(0, 0, s * D / 2); if (s < 0) m.rotation.y = 0; else m.rotation.y = PI; G.add(m); }
  for (const z of [-D / 2 + 0.3, 0, D / 2 - 0.3]) G.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, Hr, 10), 'wood').translateY(Hr / 2).translateZ(z));
  G.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, D, 10).rotateX(PI / 2), 'wood').translateY(Hr - 0.05));
  // bulbs on a wire along the ridge
  const lights = [];
  for (const z of [-2.2, 0.9, 2.8]) {
    G.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.6, 5), 'pad').translateY(Hr - 0.35).translateZ(z));
    const b = mesh(new THREE.SphereGeometry(0.04, 12, 10), 'bulb', false); b.position.set(0, Hr - 0.68, z); G.add(b);
    const l = new THREE.PointLight(0xFFD9A0, 2.4, 7, 2); l.position.set(0, Hr - 0.75, z); G.add(l); lights.push(l);
  }
  const T = operatingTable(ctx, { ...item, era: 'field', drape: item.drape });
  T.group.position.set(0, 0, -0.4); G.add(T.group);
  // a hanging lamp over the table (a pan shade)
  const shade = new THREE.Group(); shade.position.set(0, T.top + 1.25, -0.4 + T.zf); G.add(shade);
  shade.add(mesh(new THREE.CylinderGeometry(0.06, 0.26, 0.16, 24, 1, true), 'lampBody')); shade.add(mesh(new THREE.SphereGeometry(0.05, 12, 10), 'bulb', false).translateY(-0.04));
  G.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, Hr - T.top - 1.3, 5), 'pad').translateY((Hr + T.top + 1.3) / 2 - 0.05).translateZ(-0.4 + T.zf));
  const L = new THREE.SpotLight(0xFFE4B8, num(item.lamp_intensity, 18), 5, 0.62, 0.6, 2); L.position.copy(shade.position).add(V3(0, -0.06, 0)); L.target.position.set(0, T.top, -0.4 + T.zf); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.0015; L.shadow.normalBias = 0.03; G.add(L, L.target); lights.push(L);
  // a stretcher on trestles, crates, a tray on a crate
  const st = new THREE.Group(); st.position.set(2.0, 0, 1.6); G.add(st);
  for (const z of [-0.8, 0.8]) { st.add(mesh(box(0.7, 0.05, 0.06), 'wood').translateY(0.62).translateZ(z)); for (const x of [-0.3, 0.3]) st.add(mesh(box(0.05, 0.62, 0.05), 'wood').translateX(x).translateY(0.31).translateZ(z)); }
  st.add(mesh(box(0.56, 0.03, 2.0), 'canvas').translateY(0.67)); for (const x of [-0.3, 0.3]) st.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.3, 8).rotateX(PI / 2), 'wood').translateX(x).translateY(0.68));
  for (const [x, z, h] of [[-2.2, 2.6, 0.5], [-2.2, 3.2, 0.5], [-1.6, 3.2, 0.45]]) G.add(mesh(box(0.55, h, 0.45), 'crate').translateX(x).translateY(h / 2).translateZ(z));
  const tray = instrumentTray({ height: T.top + 0.1 }); tray.group.position.set(0.95, 0, -0.4 + T.zf + 0.55); tray.group.rotation.y = PI / 2; G.add(tray.group);
  const anchors = {};
  for (const [k, a] of Object.entries(T.anchors)) { const o = new THREE.Object3D(); o.position.copy(a.position).add(T.group.position); G.add(o); anchors[k] = o; }
  return { group: G, anchors, lights, size: [W, Hr, D], T };
}

export const CATALOG = {
  'interior.operating_room': {
    desc: 'a hospital OPERATING ROOM (era modern | 1960s): pale green tiled walls, terrazzo floor, the operating table with the patient on it under green surgical drapes (the head free at the top end behind the anaesthesia screen, the operating field open on the abdomen with a clean incision line), a ceiling surgical lamp with a hard white pool on the field, an instrument tray on a Mayo stand, an IV pole, an ECG monitor. Add surgeons: cast kit "surgeon" + action "operate" at the anchors left_side / right_side (table at `at`, heading 180: stand at [x-0.72, z+0.15] heading 90 and [x+0.72, z+0.15] heading 270)',
    params: { at: '[x, z] the table', heading: 'deg: the patient\'s head points that way (180 = toward +Z)', era: 'modern|1960s', drape: 'green|blue', field: 'true: the open operating field', patient: 'true', lamp_intensity: 'cd (28)', monitor: 'true' },
    footprint: [6.4, 7], height: 3, anchors: ['field', 'head', 'table', 'left_side', 'right_side', 'lamp', 'tray'], tags: ['interior', 'hospital', 'surgery', 'operating', 'theatre', 'medical', 'doctor', 'surgeon', 'patient'],
  },
  'interior.field_hospital': {
    desc: 'an army FIELD HOSPITAL tent (Vietnam / WW2 / Korea): olive canvas walls and pitched roof on wooden poles, bare bulbs on a wire, packed earth and duckboards, the operating table (a wooden field table) with the draped patient, a pan-shade lamp hanging over it, an instrument tray, a stretcher on trestles, crates. Surgeons as in interior.operating_room (anchors left_side / right_side)',
    params: { at: '[x, z]', heading: 'deg', drape: 'green|blue', field: 'true', patient: 'true', lamp_intensity: 'cd (18)' },
    footprint: [6, 8], height: 3.3, anchors: ['field', 'head', 'table', 'left_side', 'right_side'], tags: ['interior', 'hospital', 'field', 'tent', 'army', 'medic', 'surgery', 'war', 'vietnam', 'mash'],
  },
  'prop.operating_table': {
    desc: 'an operating table with the patient lying on it under surgical drapes (the head free, the operating field open), for any room; era modern|1960s|field (wooden)',
    params: { at: '[x, z]', heading: 'deg', era: 'modern|1960s|field', drape: 'green|blue', field: 'true', patient: 'true|false', height: 'm (0.92)' },
    footprint: [0.6, 2.0], height: 1.3, anchors: ['field', 'head', 'table', 'left_side', 'right_side'], tags: ['prop', 'surgery', 'table', 'operating', 'patient', 'hospital'],
  },
  'prop.surgical_lamp': { desc: 'a surgical lamp: a round lamp head with a ring of bulbs on an arm from the ceiling, a hard white spot straight down', params: { at: '[x, z]', height: 'm (2.25) the lamp head', ceiling: 'm (3)', intensity: 'cd (30)' }, footprint: [0.8, 0.8], height: 3, tags: ['prop', 'lamp', 'surgery', 'light', 'hospital'] },
  'prop.instrument_tray': { desc: 'a Mayo stand with a steel instrument tray: scalpels, forceps, gauze on a green towel', params: { at: '[x, z]', heading: 'deg', height: 'm (1.0)' }, footprint: [0.62, 0.5], height: 1.05, anchors: ['tray'], tags: ['prop', 'surgery', 'instruments', 'scalpel', 'tray', 'hospital'] },
};

export async function build(kind, item = {}, ctx = {}) {
  const Gd = ground(ctx), at = xz(item.at), y = Gd.h(at[0], at[1]);
  const root = new THREE.Group(); root.name = kind; root.position.set(at[0], y, at[1]);
  const place = new THREE.Group(); place.rotation.y = yawFromHeading(item.heading ?? 180) - PI; root.add(place);   // heading 180 = the authored frame
  const P = { ...item };
  let anchors = {}, radius = 2, height = 2, lights = [], clipT = null;
  if (kind === 'interior.operating_room') { const r = operatingRoom(ctx, P); place.add(r.group); anchors = r.anchors; radius = 4.5; height = 3; lights = r.lights; clipT = r.T.clip; }
  else if (kind === 'interior.field_hospital') { const r = fieldHospital(ctx, P); place.add(r.group); anchors = r.anchors; radius = 5; height = 3.3; lights = r.lights; clipT = r.T.clip; }
  else if (kind === 'prop.operating_table') { const T = operatingTable(ctx, P); place.add(T.group); anchors = T.anchors; radius = 1.1; height = 1.3; clipT = T.clip; }
  else if (kind === 'prop.surgical_lamp') { const l = surgicalLamp(P); place.add(l.group); anchors = { lamp: l.head }; radius = 0.5; height = num(P.ceiling, 3); }
  else if (kind === 'prop.instrument_tray') { const t = instrumentTray(P); place.add(t.group); const a = new THREE.Object3D(); a.position.set(0, t.top, 0); t.group.add(a); anchors = { tray: a }; radius = 0.4; height = t.top; }
  // the patient's clipping plane needs the final placement (world space)
  root.updateMatrixWorld(true);
  if (clipT) clipT(ctx.renderer);
  patchAll(root, ctx);
  root.traverse((o) => { if (o.isMesh && o.receiveShadow === false) o.receiveShadow = true; });
  return { root, radius, height, anchors: { ...anchors, center: place }, update() {}, interior: kind.startsWith('interior.') };
}
