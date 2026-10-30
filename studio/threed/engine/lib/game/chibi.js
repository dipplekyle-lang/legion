// chibi.js — the QUEST look's people: toy-like chibi figures WITH faces (a big round head, dot eyes with a catch-light,
// short brows, pink blush, a button nose), a small soft body, mitten hands and stubby legs, in matte plastic.
// One parametric figure dresses every era and job: an outfit (tunic, segmented armour, mail, plate, cuirass, robe, toga,
// coat, uniform, suit, dress, shirt, apron, spacesuit, lab coat, kimono, rags, fur), a hair style, headwear, a cape,
// and things in the hands and on the back. Figures stand at their origin, facing +Z, metres, Y up (left = +X).
//
//   chibiLook(def)                  a CastDef (or inline item) -> the normalised look (kit names map to outfits)
//   buildParts(look, o)             -> { joints: {name: [{geo, mat}]}, pivots: {name: [x, y, z]}, height }   (rest pose,
//                                     every geometry in its joint's space; crowds instance these, heroes parent them)
//   buildChibi(look, ctx, o)        -> { group, J (joints), pose(p), height, anchors }
//   makeChibiController(fig, item, ctx) -> { root, update(t), members?(t), loco? }   actions + path walking
//   POSE(name, phase, t)            joint angles of an action at its phase (crowds use it too)
// Deterministic in t; no textures except small canvas decals (shield emblems).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, lerp, smooth } from '../shared/util.js';

const TAU = Math.PI * 2;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ── rest skeleton (nominal 1.5 m figure; build.h scales the whole figure) ─────────────────────────────────────────
export const PIV = {
  hips: [0, 0.36, 0], torso: [0, 0.40, 0], head: [0, 0.80, 0], cape: [0, 0.74, -0.15],
  lLeg: [0.095, 0.36, 0], rLeg: [-0.095, 0.36, 0],
  lUpper: [0.2, 0.705, 0], rUpper: [-0.2, 0.705, 0], lFore: [0.232, 0.565, 0.0], rFore: [-0.232, 0.565, 0.0],
};
const HEAD_C = [0, 1.115, 0.0], HR = 0.31;          // head centre (rest) and radius
export const PARENT = { hips: null, torso: null, head: 'torso', cape: 'torso', lLeg: null, rLeg: null, lUpper: 'torso', rUpper: 'torso', lFore: 'lUpper', rFore: 'rUpper' };

// ── palette ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const SKIN = { light: '#F6CFAE', fair: '#F1CDB0', medium: '#E0B08A', tan: '#C68E62', brown: '#986040', dark: '#6B442E' };
const HAIRC = { brown: '#7A5640', dark: '#3A2A22', black: '#22201F', blond: '#E2C072', ginger: '#C8683A', grey: '#A9A6A2', white: '#ECEAE4', auburn: '#8E3E2A' };
const NAMED = {
  red: '#C8322E', roman_red: '#C42E2B', crimson: '#A61E2A', scarlet: '#D8382C', blue: '#2F5DA8', navy: '#22305A', sky: '#7DB4E6',
  green: '#3E8A48', olive: '#6E6A3C', khaki: '#B49F6E', brown: '#7A5232', tan: '#C9A272', white: '#F4F1EA', cream: '#EFE6CF',
  grey: '#8D9096', black: '#25262B', purple: '#6B3A8C', gold: '#E2B23E', yellow: '#EAC33F', orange: '#E07A2E', pink: '#E58FA8',
  steel: '#C9D2DC', bronze: '#C08A42', leather: '#8A5A34', wood: '#B88A55',
};
const col = (c, d) => { if (c == null || c === '') return d; const s = String(c).trim().toLowerCase(); return NAMED[s] || SKIN[s] || HAIRC[s] || (/^#?[0-9a-f]{6}$/i.test(s) ? (s[0] === '#' ? s : '#' + s) : d); };

// kits of the documentary library (lib/human/kits.js) -> chibi outfits, so a director's CastDef works in both looks
const KIT_OUTFIT = {
  roman_legion: { outfit: 'armor_bands', top: 'roman_red', wear: 'galea', held: 'gladius', heldL: 'scutum', shoes: 'sandals' },
  ancient_robe: { outfit: 'robe', top: 'cream', wear: 'none', shoes: 'sandals' },
  medieval_knight: { outfit: 'plate', top: 'steel', wear: 'great_helm', held: 'longsword', heldL: 'heater', tabard: 'red' },
  medieval_peasant: { outfit: 'rags', top: '#8A7452', wear: 'hood', shoes: 'boots' },
  renaissance: { outfit: 'coat', top: '#5A1E28', wear: 'beret' },
  '1800s_formal': { outfit: 'coat', top: '#1C1D22', wear: 'top_hat' },
  napoleonic_british: { outfit: 'uniform', top: '#B8221E', wear: 'shako', held: 'musket', crossbelts: true },
  napoleonic_french: { outfit: 'uniform', top: '#22327A', wear: 'shako', held: 'musket', crossbelts: true },
  civil_war: { outfit: 'uniform', top: '#26304E', wear: 'kepi', held: 'musket' },
  '1910s_formal': { outfit: 'suit', top: '#2E2A28', wear: 'bowler' },
  ww1_soldier: { outfit: 'uniform', top: '#7A6E4A', wear: 'brodie', held: 'rifle' },
  ww2_us: { outfit: 'uniform', top: '#6E6844', wear: 'm1', held: 'rifle' },
  ww2_german: { outfit: 'uniform', top: '#646A5C', wear: 'stahlhelm', held: 'rifle' },
  ww2_british: { outfit: 'uniform', top: '#7A6A48', wear: 'brodie', held: 'rifle' },
  '1950s_casual': { outfit: 'shirt', top: '#6A8AB0', wear: 'fedora' },
  modern_business: { outfit: 'suit', top: '#2B2E36', wear: 'none' },
  modern_casual: { outfit: 'shirt', top: '#4A7AB0', wear: 'none' },
  scientist: { outfit: 'labcoat', top: '#F4F3EE', wear: 'none' },
  astronaut: { outfit: 'spacesuit', top: '#F2F1EC', wear: 'bubble' },
  worker: { outfit: 'apron', top: '#2E5A8A', wear: 'hard_hat' },
  royalty: { outfit: 'robe', top: '#5A1438', wear: 'crown', cape: '#8A1A2E' },
  farm_1800s: { outfit: 'shirt', top: '#8A6A4A', wear: 'straw', held: 'pitchfork' },
  forager: { outfit: 'fur', top: '#9A7650', wear: 'none', held: 'spear' },
  witness: { outfit: 'shirt', top: '#F1EEE8', wear: 'none' },
};

// documentary headwear names (lib/human/kits.js HEADWEAR) -> chibi headwear
const HEADWEAR_MAP = { coif: 'nasal_helm', farm: 'straw', none: 'none', helmet: 'galea', tricorne: 'tricorn', bicorn: 'bicorne', cap_peaked: 'kepi' };

// outfit -> garment recipe: sleeves none|short|long|wide, skirt none|short|knee|long|full, legs 'skin'|'trousers'
const OUTFIT = {
  tunic: { sleeves: 'short', skirt: 'short', legs: 'skin', belt: '#6A4428', shoes: 'sandals' },
  armor_bands: { sleeves: 'short', skirt: 'short', legs: 'skin', belt: '#6A4428', shoes: 'sandals', bands: true },
  mail: { sleeves: 'short', skirt: 'knee', legs: 'trousers', belt: '#5A3A22', shoes: 'boots', mail: true },
  plate: { sleeves: 'long', skirt: 'short', legs: 'trousers', belt: '#5A3A22', shoes: 'boots', plate: true },
  cuirass: { sleeves: 'short', skirt: 'short', legs: 'skin', belt: '#6A4428', shoes: 'sandals', cuirass: true },
  robe: { sleeves: 'wide', skirt: 'full', legs: 'skin', belt: null, shoes: 'sandals' },
  toga: { sleeves: 'short', skirt: 'full', legs: 'skin', belt: null, shoes: 'sandals', toga: true },
  coat: { sleeves: 'long', skirt: 'knee', legs: 'trousers', belt: null, shoes: 'boots', buttons: true },
  uniform: { sleeves: 'long', skirt: 'none', legs: 'trousers', belt: '#3A2A1E', shoes: 'boots', buttons: true },
  suit: { sleeves: 'long', skirt: 'none', legs: 'trousers', belt: null, shoes: 'shoes', tie: true },
  dress: { sleeves: 'short', skirt: 'full', legs: 'skin', belt: null, shoes: 'shoes' },
  shirt: { sleeves: 'short', skirt: 'none', legs: 'trousers', belt: '#3A2A1E', shoes: 'shoes' },
  apron: { sleeves: 'long', skirt: 'none', legs: 'trousers', belt: null, shoes: 'boots', apron: true },
  spacesuit: { sleeves: 'long', skirt: 'none', legs: 'trousers', belt: '#9AA0A8', shoes: 'boots', puffy: true, pack: 'oxygen' },
  labcoat: { sleeves: 'long', skirt: 'knee', legs: 'trousers', belt: null, shoes: 'shoes', buttons: true },
  kimono: { sleeves: 'wide', skirt: 'long', legs: 'skin', belt: '#2A2A3A', shoes: 'sandals', wrap: true },
  samurai: { sleeves: 'wide', skirt: 'knee', legs: 'trousers', belt: '#2A2A3A', shoes: 'sandals', bands: true },
  rags: { sleeves: 'short', skirt: 'knee', legs: 'skin', belt: '#5A4026', shoes: 'bare', patches: true },
  fur: { sleeves: 'none', skirt: 'short', legs: 'skin', belt: '#5A4026', shoes: 'bare', fur: true },
};

// a CastDef / item -> the normalised look. def.chibi (any of the keys below) overrides the kit's defaults.
export function chibiLook(def = {}) {
  const c = def.chibi && typeof def.chibi === 'object' ? def.chibi : {};
  const kit = KIT_OUTFIT[def.kit] || {};
  const pick = (k, d) => (c[k] !== undefined ? c[k] : def[k] !== undefined && typeof def[k] !== 'object' ? def[k] : kit[k] !== undefined ? kit[k] : d);
  const outfit = OUTFIT[pick('outfit', 'tunic')] ? pick('outfit', 'tunic') : 'tunic';
  const O = OUTFIT[outfit];
  const colors = def.colors || {};
  const seed = hashStr(JSON.stringify([def.id || '', def.name || '', c.seed ?? '']));
  const r = rng(seed);
  const hairStyles = ['curly', 'short', 'short', 'side', 'spiky'];
  const L = {
    id: def.id || 'chibi', seed,
    skin: col(pick('skin', null), SKIN.light),
    hair: pick('hair', hairStyles[Math.floor(r() * hairStyles.length)]),
    hairColor: col(pick('hair_color', null), HAIRC[['brown', 'dark', 'brown', 'blond', 'black'][Math.floor(r() * 5)]]),
    beard: pick('beard', 'none'),
    expr: pick('expression', 'neutral'),
    outfit,
    top: col(c.top ?? colors.coat ?? kit.top, '#F4F1EA'),
    skirtColor: col(c.skirt_color ?? null, null),
    legs: col(c.legs ?? colors.trousers ?? null, null),
    accent: col(c.accent ?? colors.accent ?? null, '#E2B23E'),
    trim: col(c.trim ?? null, null),
    metal: col(c.metal ?? null, outfit === 'cuirass' ? '#D8DEE6' : '#C9D2DC'),
    sleeves: c.sleeves || O.sleeves, skirt: c.skirt || O.skirt, legKind: c.leg_kind || O.legs,
    belt: c.belt === false ? null : col(c.belt, O.belt), shoes: c.shoes || kit.shoes || O.shoes,
    wear: c.wear ?? (typeof def.headwear === 'string' && def.headwear ? (HEADWEAR_MAP[def.headwear] ?? def.headwear) : kit.wear) ?? 'none',
    wearColor: col(c.wear_color ?? null, null),
    crest: c.crest || (pick('wear', '') === 'galea_crest' ? 'transverse' : 'none'),
    crestColor: col(c.crest_color ?? null, '#D8352F'),
    cape: c.cape === false ? null : col(c.cape ?? kit.cape ?? null, null),
    tabard: col(c.tabard ?? kit.tabard ?? null, null),
    held: c.held ?? kit.held ?? null, heldL: c.held_l ?? c.heldL ?? kit.heldL ?? null,
    back: c.back ?? O.pack ?? null,
    medals: !!(c.medals), sash: col(c.sash ?? null, null), stripe: col(c.stripe ?? null, null),
    glasses: !!c.glasses, crossbelts: !!(c.crossbelts ?? kit.crossbelts),
    emblem: c.emblem || null, shieldColor: col(c.shield_color ?? null, null),
    h: clamp(+(c.height ?? def.build?.height / 1.2 ?? 1.5) || 1.5, 0.9, 2.1),
    bulk: clamp(+(c.bulk ?? def.build?.bulk ?? 1) || 1, 0.8, 1.35),
    O,
  };
  if (L.wear === 'galea_crest') L.wear = 'galea';
  if (!L.legs) L.legs = L.legKind === 'skin' ? L.skin : col(null, outfit === 'suit' ? L.top : '#4A4038');
  if (!L.skirtColor) L.skirtColor = L.top;
  return L;
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000003 + 1; }

// ── geometry helpers (absolute rest coordinates) ─────────────────────────────────────────────────────────────────
let DET = 1;
const sg = (n, min = 5) => Math.max(min, Math.round(n * DET));
function sph(r, x, y, z, sx = 1, sy = 1, sz = 1, ws = 24, hs = 16) { const g = new THREE.SphereGeometry(r, sg(ws), sg(hs, 4)); g.scale(sx, sy, sz); g.translate(x, y, z); return g; }
function cap(r, a, b, seg = 14) {
  const A = V(...a), B = V(...b), len = A.distanceTo(B);
  const g = new THREE.CapsuleGeometry(r, Math.max(1e-3, len), sg(4, 2), sg(seg));
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()));
  const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
}
function cyl(r0, r1, a, b, seg = 18, open = false) {
  const A = V(...a), B = V(...b), len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r0, len, sg(seg), 1, open);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()));
  const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
}
function rbox(w, h, d, r, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new RoundedBoxGeometry(w, h, d, DET >= 1 ? 3 : 1, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  if (rx || ry || rz) g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)));
  g.translate(x, y, z); return g;
}
function lathe(pts, x = 0, y = 0, z = 0, sz = 1, seg = 28) { const g = new THREE.LatheGeometry(pts.map(([r, yy]) => new THREE.Vector2(Math.max(1e-4, r), yy)), sg(seg)); g.scale(1, 1, sz); g.translate(x, y, z); return g; }
function torus(R, r, x, y, z, rx = Math.PI / 2, arc = TAU, sx = 1, sz = 1, seg = 32) { const g = new THREE.TorusGeometry(R, r, sg(8, 4), sg(seg), arc); g.rotateX(rx); g.scale(sx, 1, sz); g.translate(x, y, z); return g; }
function xf(g, { r = [0, 0, 0], t = [0, 0, 0], s = null } = {}) { if (s) g.scale(...s); if (r[0] || r[1] || r[2]) g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...r))); g.translate(...t); return g; }
// a point on the head sphere: yaw (+ = the figure's left), pitch (+ = up), out = distance from the surface
function onHead(yaw, pitch, out = 0, sx = 1.05, sy = 0.97, sz = 1.0) {
  const R = HR + out;
  return [HEAD_C[0] + Math.sin(yaw) * Math.cos(pitch) * R * sx, HEAD_C[1] + Math.sin(pitch) * R * sy, HEAD_C[2] + Math.cos(yaw) * Math.cos(pitch) * R * sz];
}
// orient a geometry so its +Z points along the head normal at (yaw, pitch), then place it there
function faceDecal(g, yaw, pitch, out = 0, roll = 0) {
  const p = onHead(yaw, pitch, out);
  const n = V(p[0] - HEAD_C[0], p[1] - HEAD_C[1], p[2] - HEAD_C[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n);
  if (roll) g.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), roll));
  g.applyQuaternion(q); g.translate(...p); return g;
}

// ── materials (cached per job) ─────────────────────────────────────────────────────────────────────────────────────
const MAT_KIND = {
  cloth: { roughness: 0.78, metalness: 0, envMapIntensity: 0.55 },
  skin: { roughness: 0.62, metalness: 0, envMapIntensity: 0.5 },
  plastic: { roughness: 0.5, metalness: 0, envMapIntensity: 0.7 },
  hair: { roughness: 0.7, metalness: 0, envMapIntensity: 0.5 },
  eye: { roughness: 0.25, metalness: 0, envMapIntensity: 0.9 },
  chrome: { roughness: 0.16, metalness: 1.0, envMapIntensity: 1.35 },
  steel: { roughness: 0.32, metalness: 0.85, envMapIntensity: 0.9 },
  gold: { roughness: 0.28, metalness: 1.0, envMapIntensity: 1.25 },
  leather: { roughness: 0.66, metalness: 0, envMapIntensity: 0.5 },
  wood: { roughness: 0.74, metalness: 0, envMapIntensity: 0.45 },
  glass: { roughness: 0.05, metalness: 0, envMapIntensity: 1.6, transparent: true, opacity: 0.32, depthWrite: false },
  blush: { roughness: 0.8, metalness: 0, envMapIntensity: 0.3, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 },
  glow: { roughness: 0.5, metalness: 0, emissiveIntensity: 1.6 },
};
export function matKey(kind, hex) { return kind + ':' + String(hex).toLowerCase(); }
export function makeMat(key, ctx) {
  const cache = ctx?.cache, ck = 'game.mat:' + key;
  if (cache && cache.get(ck)) return cache.get(ck);
  const [kind, hex] = key.split(':');
  const o = { ...(MAT_KIND[kind] || MAT_KIND.cloth), color: new THREE.Color(hex) };
  if (kind === 'glow') o.emissive = new THREE.Color(hex);
  let m = new THREE.MeshStandardMaterial(o);
  if (kind === 'blush' || kind === 'glass') m.userData.noInk = true;
  if (ctx?.patch) m = ctx.patch(m) || m;
  if (cache) cache.set(ck, m);
  return m;
}

// ── the parts of one figure in its rest pose ───────────────────────────────────────────────────────────────────────
// returns joints: {name: [{geo, key}]} with every geometry moved into its joint's space (minus the pivot)
export function buildParts(L, o = {}) {
  DET = o.detail ?? 1;
  const J = { hips: [], torso: [], head: [], cape: [], lLeg: [], rLeg: [], lUpper: [], rUpper: [], lFore: [], rFore: [] };
  const add = (j, geo, kind, hex) => { if (geo) J[j].push({ geo, key: matKey(kind, hex) }); };
  const B = L.bulk, skin = L.skin, top = L.top, O = L.O, low = DET < 0.6;
  // feet + legs
  const shoe = L.shoes === 'bare' ? skin : L.shoes === 'sandals' ? '#8A5A34' : L.shoes === 'boots' ? '#4A3424' : '#2C2A2A';
  for (const [j, sx] of [['lLeg', 1], ['rLeg', -1]]) {
    const x = 0.095 * sx;
    add(j, cap(0.078 * B, [x, 0.33, 0], [x, 0.1, 0.005]), O.plate ? 'steel' : L.legKind === 'skin' ? 'skin' : 'cloth', O.plate ? L.metal : L.legKind === 'skin' ? skin : L.legs);
    add(j, rbox(0.14 * B, 0.085, 0.22, 0.04, x, 0.045, 0.03), L.shoes === 'bare' ? 'skin' : 'leather', shoe);
    if (L.shoes === 'boots') add(j, cap(0.084 * B, [x, 0.2, 0], [x, 0.07, 0.01]), 'leather', shoe);
    if (L.shoes === 'sandals') { add(j, torus(0.08 * B, 0.012, x, 0.17, 0.005, Math.PI / 2, TAU, 1, 0.95, 18), 'leather', '#7A4A2A'); }
  }
  // hips / pelvis (under the skirt) and the torso
  add('hips', sph(0.19 * B, 0, 0.38, 0, 1, 0.62, 0.8), L.legKind === 'skin' && O.skirt !== 'none' ? 'cloth' : 'cloth', O.skirt !== 'none' ? L.skirtColor : L.legs);
  const tor = [[0.172, 0.34], [0.2, 0.42], [0.206, 0.52], [0.198, 0.62], [0.175, 0.7], [0.13, 0.77], [0.06, 0.815], [0.001, 0.82]].map(([r, y]) => [r * B * (O.puffy ? 1.12 : 1), y]);
  add('torso', lathe(tor, 0, 0, 0, 0.8), O.plate ? 'steel' : 'cloth', O.plate ? L.metal : top);
  // skirt
  const sk = { short: 0.24, knee: 0.15, long: 0.04, full: 0.0 }[L.skirt];
  if (sk != null) {
    const bot = L.skirt === 'full' ? 0.0 : sk, flare = L.skirt === 'full' ? 0.3 : L.skirt === 'long' ? 0.27 : L.skirt === 'knee' ? 0.26 : 0.245;
    add('hips', lathe([[flare * B, bot], [0.235 * B, (bot + 0.46) / 2], [0.205 * B, 0.48], [0.185 * B, 0.5]], 0, 0, 0, 0.82), 'cloth', L.skirtColor);
    if (L.skirt === 'short' && !low) add('hips', lathe([[0.25 * B, sk - 0.005], [0.251 * B, sk + 0.03]], 0, 0, 0, 0.82), 'cloth', shade(L.skirtColor, 0.82));   // hem
  }
  if (L.belt) add('torso', lathe([[0.2 * B + 0.012, 0.44], [0.212 * B + 0.012, 0.47], [0.208 * B + 0.012, 0.5]], 0, 0, 0, 0.82), 'leather', L.belt);
  // arms (upper: sleeve or skin; fore + mitten hand)
  for (const [u, f, sx] of [['lUpper', 'lFore', 1], ['rUpper', 'rFore', -1]]) {
    const sh = [0.2 * sx, 0.705, 0], el = [0.232 * sx, 0.565, 0], wr = [0.245 * sx, 0.455, 0.01];
    const sleeve = L.sleeves !== 'none';
    add(u, sph(0.075 * B, sh[0], sh[1], sh[2], 1, 1, 1, 16, 12), O.plate ? 'steel' : sleeve ? 'cloth' : 'skin', O.plate ? L.metal : sleeve ? top : skin);
    add(u, cap(0.064 * B, sh, el), O.plate ? 'steel' : sleeve ? 'cloth' : 'skin', O.plate ? L.metal : sleeve ? top : skin);
    const longS = L.sleeves === 'long' || L.sleeves === 'wide';
    add(f, cap((L.sleeves === 'wide' ? 0.075 : 0.058) * B, el, wr), O.plate ? 'steel' : longS ? 'cloth' : 'skin', O.plate ? L.metal : longS ? top : skin);
    if (L.sleeves === 'wide') add(f, cyl(0.085 * B, 0.1 * B, [el[0], el[1] - 0.02, 0], [wr[0], wr[1] + 0.005, wr[2]], 16, true), 'cloth', top);
    add(f, sph(0.074, wr[0] + 0.004 * sx, wr[1] - 0.05, wr[2] + 0.01, 1, 1.05, 0.95, 16, 12), O.puffy ? 'cloth' : 'skin', O.puffy ? '#E8E6E0' : skin);   // mitten
  }
  // ── outfit overlays ──
  if (O.bands) {                 // lorica segmentata / lamellar: metal hoops round the chest + shoulder hoops
    const m = O === OUTFIT.samurai ? (L.trim || L.accent) : L.metal;
    const kind = O === OUTFIT.samurai ? 'plastic' : 'chrome';
    for (let i = 0; i < (low ? 3 : 5); i++) {
      const y = 0.5 + i * (low ? 0.085 : 0.052), rr = (0.205 - Math.max(0, i - 2) * 0.012) * B + 0.016;
      add('torso', lathe([[rr, y], [rr + 0.006, y + 0.018], [rr, y + 0.036]], 0, 0, 0, 0.82, 26), kind, m);
    }
    for (const [u, sx] of [['lUpper', 1], ['rUpper', -1]]) for (let i = 0; i < (low ? 1 : 3); i++)
      add(u, xf(new THREE.SphereGeometry(0.093 * B, sg(16), sg(8), 0, TAU, 0, Math.PI * 0.42), { r: [0, 0, -sx * (0.5 + i * 0.32)], t: [0.2 * sx + sx * i * 0.016, 0.715 - i * 0.03, 0] }), kind, m);
  }
  if (O.mail) for (const y of [0.52, 0.64]) add('torso', lathe([[0.214 * B, y], [0.22 * B, y + 0.04], [0.212 * B, y + 0.08]], 0, 0, 0, 0.82, 26), 'chrome', shade(L.metal, 0.75));
  if (O.plate || O.cuirass) {
    const m = O.cuirass ? (L.metal) : L.metal;
    add('torso', lathe([[0.19 * B, 0.44], [0.222 * B, 0.52], [0.226 * B, 0.6], [0.21 * B, 0.68], [0.17 * B, 0.74], [0.11 * B, 0.785]], 0, 0, 0.012, 0.86, 30), O.plate ? 'steel' : 'chrome', m);
    if (O.cuirass && !low) for (const sx of [1, -1]) add('torso', sph(0.07, 0.075 * sx, 0.64, 0.155, 1.1, 0.75, 0.45, 14, 10), 'chrome', m);   // sculpted pecs
    if (O.plate) for (const [u, sx] of [['lUpper', 1], ['rUpper', -1]]) add(u, xf(new THREE.SphereGeometry(0.1 * B, sg(18), sg(10), 0, TAU, 0, Math.PI * 0.5), { r: [0, 0, -sx * 0.55], t: [0.205 * sx, 0.72, 0] }), 'steel', m);
    if (O.cuirass) for (let k = 0; k < (low ? 6 : 12); k++) {            // pteruges: leather strips round the waist
      const a = (k / (low ? 6 : 12)) * TAU; add('hips', rbox(0.06, 0.13, 0.02, 0.008, Math.sin(a) * 0.235 * B, 0.29, Math.cos(a) * 0.235 * B * 0.82, 0.12 * Math.cos(a), a, -0.12 * Math.sin(a)), 'leather', L.trim || '#C9A060');
    }
  }
  if (L.tabard) { const zf = (O.plate || O.cuirass ? 0.205 : 0.17) * B; add('torso', rbox(0.25 * B, 0.33, 0.03, 0.02, 0, 0.58, zf), 'cloth', L.tabard); add('torso', rbox(0.25 * B, 0.33, 0.03, 0.02, 0, 0.58, -zf), 'cloth', L.tabard); add('hips', rbox(0.24 * B, 0.22, 0.03, 0.02, 0, 0.32, 0.215 * B, 0.12), 'cloth', L.tabard); if (L.accent && !low) add('torso', rbox(0.07, 0.07, 0.012, 0.01, 0, 0.6, zf + 0.018), 'gold', L.accent); }
  if (O.toga || L.sash) {          // a drape over the left shoulder, across the chest to the right hip
    const c2 = L.sash || shade(top, 0.92);
    const path = new THREE.CatmullRomCurve3([V(0.16, 0.76, 0.06), V(0.05, 0.64, 0.17), V(-0.1, 0.5, 0.17), V(-0.2, 0.42, 0.07), V(-0.18, 0.4, -0.1), V(0.04, 0.5, -0.17), V(0.17, 0.72, -0.08)].map((v) => v.multiplyScalar(B).setY(v.y)));
    add('torso', new THREE.TubeGeometry(path, sg(40), 0.045, sg(8), false), 'cloth', c2);
    if (L.stripe) add('torso', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.15, 0.78, 0.09), V(0.03, 0.665, 0.205), V(-0.13, 0.515, 0.2)].map((v) => v.multiplyScalar(B).setY(v.y))), sg(20), 0.014, sg(6), false), 'cloth', L.stripe);
  }
  if (O.buttons && !low) for (let i = 0; i < 4; i++) add('torso', sph(0.014, 0, 0.5 + i * 0.065, 0.168 * B + 0.004 - Math.max(0, i - 2) * 0.012, 1, 1, 0.6, 8, 6), 'gold', L.accent);
  if (O.tie) { add('torso', rbox(0.11, 0.16, 0.02, 0.01, 0, 0.71, 0.13 * B, -0.35), 'cloth', '#F4F2EC'); add('torso', rbox(0.04, 0.2, 0.02, 0.01, 0, 0.6, 0.168 * B, -0.1), 'cloth', L.accent || '#A01E2A'); }
  if (O.apron) { add('torso', rbox(0.24 * B, 0.3, 0.02, 0.015, 0, 0.52, 0.17 * B, -0.06), 'cloth', L.accent || '#E8E2D2'); }
  if (O.wrap) add('torso', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.1, 0.8, 0.1), V(0.02, 0.64, 0.175), V(-0.08, 0.48, 0.16)]), sg(20), 0.022, sg(6), false), 'cloth', L.accent || '#E8E2D2');
  if (O.patches && !low) { add('torso', rbox(0.07, 0.06, 0.012, 0.008, 0.08, 0.6, 0.165), 'cloth', shade(top, 0.7)); add('hips', rbox(0.06, 0.05, 0.012, 0.008, -0.1, 0.28, 0.2), 'cloth', shade(top, 0.75)); }
  if (O.fur) add('torso', xf(new THREE.SphereGeometry(0.215 * B, sg(16), sg(10), 0, TAU, 0, Math.PI * 0.5), { s: [1, 0.7, 0.85], t: [0, 0.66, 0], r: [0, 0, 0.25] }), 'hair', shade(top, 0.85));
  if (L.crossbelts) for (const sx of [1, -1]) add('torso', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.15 * sx, 0.77, 0.03), V(0.0, 0.6, 0.18), V(-0.17 * sx, 0.44, 0.1)]), sg(18), 0.016, sg(5), false), 'cloth', '#F2EFE6');
  if (L.medals) for (let i = 0; i < 6; i++) add('torso', xf(new THREE.CylinderGeometry(0.03, 0.03, 0.012, sg(14)), { r: [Math.PI / 2, 0, 0], t: [(i % 2 ? 1 : -1) * 0.07, 0.69 - Math.floor(i / 2) * 0.075, 0.185 * B] }), 'gold', '#E8BC48');
  if (O.puffy) for (let i = 0; i < 3; i++) add('torso', lathe([[0.235 * B, 0.46 + i * 0.1], [0.24 * B, 0.475 + i * 0.1]], 0, 0, 0, 0.82), 'cloth', '#D8D6D0');
  // back
  if (L.back === 'oxygen' || L.back === 'backpack' || L.back === 'jetpack') add('torso', rbox(0.3 * B, 0.36, 0.14, 0.05, 0, 0.6, -0.2 * B), 'plastic', L.back === 'backpack' ? '#7A6040' : '#E4E2DC');
  if (L.back === 'quiver') { add('torso', cyl(0.045, 0.05, [0.08, 0.42, -0.2], [-0.12, 0.85, -0.2]), 'leather', '#8A5A34'); for (let k = 0; k < 4; k++) add('torso', cyl(0.006, 0.006, [-0.12 + k * 0.012, 0.85, -0.2], [-0.15 + k * 0.014, 0.96, -0.2], 5), 'wood', '#E8E0C8'); }
  // cape
  if (L.cape) {
    const g = new THREE.CylinderGeometry(0.2 * B, 0.29 * B, 0.66, sg(20), sg(6), true, Math.PI * 0.62, Math.PI * 0.76);
    g.translate(0, -0.29, 0.06); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) * 0.75 - 0.02 * (y + 0.6)); }
    g.computeVertexNormals();
    J.cape.push({ geo: g.translate(PIV.cape[0], PIV.cape[1], PIV.cape[2]), key: matKey('cloth', L.cape) });
    J.cape[0].geo.userData = { cape: true };
    add('torso', torus(0.16 * B, 0.03, 0, 0.77, -0.02, Math.PI / 2 + 0.25, Math.PI, 1, 0.8, 16), 'cloth', L.cape);
  }
  headParts(L, add, low);
  heldParts(L, add, low);
  // into joint space
  for (const [j, list] of Object.entries(J)) {
    const p = PIV[j];
    for (const it of list) { it.geo.translate(-p[0], -p[1], -p[2]); if (!it.geo.attributes.normal) it.geo.computeVertexNormals(); }
  }
  DET = 1;
  return { joints: J, pivots: PIV, height: 1.45 * L.h / 1.5 };
}

function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

// ── head: face, hair, headwear ─────────────────────────────────────────────────────────────────────────────────────
const HAIR_SKIP = { kettle: 'top', great_helm: 'all', bubble: 'none', galea: 'top', crown: 'none', hood: 'top', nemes: 'top', kabuto: 'top', nasal_helm: 'top', stahlhelm: 'top', m1: 'top', brodie: 'top', hard_hat: 'top', shako: 'top', kepi: 'top', top_hat: 'top', bowler: 'top', fedora: 'top', tricorn: 'top', bicorne: 'top', turban: 'top', fez: 'none', beret: 'none', cap: 'top', straw: 'top', wizard: 'top', chef: 'top', pith: 'top', laurel: 'none', headband: 'none', bandana: 'top', mitre: 'top' };
function headParts(L, add, low) {
  const s = L.skin, hc = L.hairColor;
  add('head', sph(HR, HEAD_C[0], HEAD_C[1], HEAD_C[2], 1.05, 0.97, 1.0, low ? 18 : 36, low ? 14 : 26), 'skin', s);
  add('head', cap(0.07, [0, 0.79, 0], [0, 0.86, 0]), 'skin', s);   // neck
  // ears
  for (const sx of [1, -1]) add('head', xf(sph(0.06, 0, 0, 0, 0.5, 1, 0.8, 12, 10), { t: onHead(sx * Math.PI / 2, -0.05, -0.01) }), 'skin', s);
  const covered = L.wear === 'great_helm' || L.wear === 'bubble_closed';
  if (!covered) {
    // eyes: dark ellipsoids with a catch-light
    const ex = L.expr, eyeY = ex === 'surprised' ? 0.0 : -0.03;
    for (const sx of [1, -1]) {
      const e = new THREE.SphereGeometry(0.045, sg(16), sg(12)); e.scale(0.88, ex === 'happy' ? 0.55 : 1.34, 0.5);
      add('head', faceDecal(e, sx * 0.33, eyeY, -0.012), 'eye', '#24242E');
      if (!low) {
        const hl = new THREE.SphereGeometry(0.0145, 10, 8); hl.scale(1, 1, 0.4);
        add('head', faceDecal(hl, sx * 0.33 + 0.045, eyeY + 0.07, 0.008), 'glow', '#FFFFFF');
        // brows
        const tilt = { neutral: 0.08, worried: -0.32, angry: 0.38, determined: 0.24, happy: 0.0, surprised: -0.1, sad: -0.4 }[ex] ?? 0.08;
        const br = new THREE.CapsuleGeometry(0.014, 0.07, 3, 8); br.rotateZ(Math.PI / 2 + sx * tilt);
        add('head', faceDecal(br, sx * 0.33, eyeY + 0.2, 0.0), 'hair', shade(hc, 0.75));
      }
    }
    // nose, blush, mouth
    add('head', faceDecal(sph(0.032, 0, 0, 0, 1, 0.85, 0.75, 12, 10), 0, -0.13, -0.006), 'skin', shade(s, 0.96));
    if (!low) for (const sx of [1, -1]) add('head', faceDecal(new THREE.CircleGeometry(0.052, 20).scale(1, 0.7, 1), sx * 0.54, -0.15, 0.004), 'blush', '#F2938A');
    if (!low && ex !== 'neutral') {
      const sm = ex === 'happy' || ex === 'determined' ? 1 : ex === 'surprised' ? 0 : -1;
      const m = sm === 0 ? new THREE.TorusGeometry(0.02, 0.008, 6, 14) : new THREE.TorusGeometry(0.03, 0.007, 6, 14, Math.PI * 0.75);
      if (sm !== 0) m.rotateZ(sm > 0 ? Math.PI * 1.125 : Math.PI * 0.125);
      add('head', faceDecal(m, 0, -0.27, -0.004), 'eye', '#7A3430');
    }
    if (L.glasses) for (const sx of [1, -1]) add('head', faceDecal(new THREE.TorusGeometry(0.06, 0.008, 6, 20), sx * 0.33, -0.03, 0.02), 'plastic', '#2A2A30');
  }
  // hair
  const skip = HAIR_SKIP[L.wear] || 'none';
  if (skip !== 'all' && L.hair !== 'bald') hairParts(L, add, skip, low);
  // beard
  if (L.beard && L.beard !== 'none' && !covered) {
    if (L.beard === 'mustache') add('head', faceDecal(new THREE.CapsuleGeometry(0.018, 0.09, 3, 8).rotateZ(Math.PI / 2), 0, -0.2, 0.002), 'hair', hc);
    else {
      const n = L.beard === 'long' ? 14 : 9;
      for (let i = 0; i < n; i++) { const a = -0.62 + (i % 7) * 0.2, p = -0.34 - Math.floor(i / 7) * 0.16; add('head', sph(0.07, ...onHead(a, p, -0.03), 1, 1, 1, 10, 8), 'hair', hc); }
    }
  }
  wearParts(L, add, low);
}
function hairParts(L, add, skip, low) {
  const hc = L.hairColor, R = HR, top = skip === 'top';
  const style = L.hair;
  if (style === 'afro') { add('head', sph(R * 1.02, HEAD_C[0], HEAD_C[1] + 0.09, HEAD_C[2] - 0.05, 1.3, 1.05, 1.15, 22, 16), 'hair', hc); return; }
  // a cap of hair over the back and the top (always), the fringe in front (unless headwear hides it)
  // under headwear only a band of hair shows below the rim (at the back and the sides); bare heads get the whole cap
  const capG = top ? new THREE.SphereGeometry(R * 1.03, sg(30), sg(8), 0, TAU, Math.PI * 0.4, Math.PI * 0.2)
    : new THREE.SphereGeometry(R * 1.035, sg(30), sg(18), 0, TAU, 0, Math.PI * 0.56);
  capG.rotateX(-0.42); capG.scale(1.05, 0.97, 1.0); capG.translate(HEAD_C[0], HEAD_C[1] + 0.01, HEAD_C[2] - 0.012);
  add('head', capG, 'hair', hc);
  if (style === 'curly' && !low && !top) {    // clustered curls on top (the reference's Tiro); none under headwear
    const r = rng(L.seed * 7 + 3);
    for (let i = 0; i < 20; i++) {
      const yaw = (r() - 0.5) * 2.6, pitch = 0.32 + r() * 0.95;
      if (top && pitch > 0.75) continue;
      add('head', sph(0.085 + r() * 0.03, ...onHead(yaw, pitch, 0.02), 1, 0.85, 1, 12, 9), 'hair', i % 3 ? hc : shade(hc, 0.9));
    }
    for (let i = 0; i < 6; i++) add('head', sph(0.075, ...onHead((i - 2.5) * 0.28, 0.4, 0.02), 1, 0.8, 1, 12, 9), 'hair', hc);
  } else if (style === 'spiky' && !low && !top) {
    for (let i = 0; i < 9; i++) { const yaw = (i - 4) * 0.32, p = onHead(yaw, 0.85 - Math.abs(i - 4) * 0.05, 0.03); const g = new THREE.ConeGeometry(0.07, 0.17, 8); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(p[0] - HEAD_C[0], p[1] - HEAD_C[1], p[2] - HEAD_C[2]).normalize())); g.translate(...p); add('head', g, 'hair', hc); }
  } else if (!top) {                          // fringe: a soft band across the brow
    const side = style === 'side' ? 0.22 : 0;
    for (let i = 0; i < 5; i++) add('head', sph(0.08, ...onHead((i - 2) * 0.27 + side, 0.5 - Math.abs(i - 2 - side * 3) * 0.04, 0.015), 1.2, 0.7, 0.8, 12, 8), 'hair', hc);
  }
  if (style === 'long' || style === 'ponytail' || style === 'braids' || style === 'bun' || style === 'topknot') {
    if (style === 'long') add('head', xf(new THREE.CylinderGeometry(R * 0.95, R * 1.0, 0.36, sg(22), 1, false, Math.PI * 0.55, Math.PI * 0.9), { t: [HEAD_C[0], HEAD_C[1] - 0.2, HEAD_C[2] - 0.03] }), 'hair', hc);
    if (style === 'ponytail') add('head', cap(0.06, onHead(0, 0.25, 0.0).map((v, i) => i === 2 ? HEAD_C[2] - R * 1.0 : v), [0, HEAD_C[1] - 0.25, HEAD_C[2] - R * 1.12]), 'hair', hc);
    if (style === 'bun' || style === 'topknot') add('head', sph(style === 'bun' ? 0.11 : 0.07, HEAD_C[0], HEAD_C[1] + R * 0.86, HEAD_C[2] - (style === 'bun' ? 0.16 : 0.05), 1, style === 'topknot' ? 1.4 : 1, 1, 14, 10), 'hair', hc);
    if (style === 'braids') for (const sx of [1, -1]) add('head', cap(0.045, onHead(sx * 1.25, -0.2, 0.0), [sx * 0.27, HEAD_C[1] - 0.42, 0.02]), 'hair', hc);
  }
}
function wearParts(L, add, low) {
  const w = L.wear, C = HEAD_C, R = HR;
  const m = (k, d) => L.wearColor || d;
  const dome = (r, thetaLen, color, kind, tilt = -0.18, sy = 0.92) => { const g = new THREE.SphereGeometry(r, sg(32), sg(16), 0, TAU, 0, thetaLen); g.rotateX(tilt); g.scale(1.05, sy, 1.0); g.translate(C[0], C[1] + 0.005, C[2] - 0.01); add('head', g, kind, color); };
  // a crest (transverse = side to side, a centurion's; long = front to back) on any helmet, sitting at height y0 above C
  const crestOn = (y0) => {
    const g = new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.075, sg(28), 1, false, 0, Math.PI);
    g.rotateZ(Math.PI / 2); if (L.crest === 'transverse') g.rotateY(Math.PI / 2);
    g.scale(1, 0.8, 1); g.translate(C[0], C[1] + y0, C[2] - 0.02);
    add('head', g, 'cloth', L.crestColor);
  };
  const brim = (r, w2, y, color, kind, sz = 1, tilt = 0) => add('head', xf(new THREE.CylinderGeometry(r + w2, r + w2, 0.018, sg(32)), { s: [1.05, 1, sz], r: [tilt, 0, 0], t: [C[0], y, C[2] - 0.01] }), kind, color);
  switch (w) {
    case 'galea': {            // Roman helmet: shiny steel dome, brow ridge, neck guard, cheek guards, a knob or a crest
      const st = m('w', L.metal || '#C9D2DC');
      dome(R * 1.09, Math.PI * 0.5, st, 'chrome', -0.12);
      add('head', torus(R * 1.1, 0.022, C[0], C[1] - 0.005, C[2] - 0.03, Math.PI / 2 - 0.12, TAU, 1.05, 1, 36), 'gold', '#D9B048');
      add('head', xf(new THREE.CylinderGeometry(R * 1.1, R * 1.26, 0.07, sg(24), 1, false, Math.PI * 0.7, Math.PI * 0.6), { t: [C[0], C[1] - 0.04, C[2] - 0.04] }), 'chrome', st);   // neck guard
      for (const sx of [1, -1]) add('head', rbox(0.05, 0.2, 0.15, 0.02, sx * R * 1.04, C[1] - 0.13, C[2] + 0.05, 0.1, 0, sx * 0.12), 'chrome', st);
      if (L.crest && L.crest !== 'none') {
        crestOn(R * 0.86);
      } else add('head', sph(0.032, C[0], C[1] + R * 1.04, C[2] - 0.02, 1, 1.2, 1, 10, 8), 'gold', '#D9B048');
      break;
    }
    case 'great_helm': { add('head', cyl(R * 1.12, R * 1.08, [C[0], C[1] - R * 0.95, C[2]], [C[0], C[1] + R * 0.85, C[2]], 28), 'steel', m('w', '#9EA6AE')); dome(R * 1.08, Math.PI * 0.35, m('w', '#9EA6AE'), 'steel', 0, 0.5); add('head', rbox(R * 1.5, 0.035, 0.05, 0.01, C[0], C[1] + 0.03, C[2] + R * 1.08), 'eye', '#121216'); add('head', rbox(0.035, R * 0.9, 0.04, 0.01, C[0], C[1] - 0.12, C[2] + R * 1.1), 'gold', L.accent); break; }
    case 'nasal_helm': {        // Norman / spangenhelm: a steel dome rising to a point, a rim band and the nose guard
      const st = m('w', L.metal || '#A8B0B8');
      dome(R * 1.1, Math.PI * 0.5, st, 'steel', -0.1);
      const g = new THREE.ConeGeometry(R * 0.62, R * 0.55, sg(20)); g.translate(C[0], C[1] + R * 1.12, C[2] - 0.02); add('head', g, 'steel', st);
      add('head', torus(R * 1.1, 0.024, C[0], C[1] + 0.005, C[2] - 0.03, Math.PI / 2 - 0.1, TAU, 1.05, 1, 36), 'steel', shade(st, 0.8));
      add('head', rbox(0.045, 0.17, 0.03, 0.012, C[0], C[1] - 0.04, C[2] + R * 1.06), 'steel', st);
      if (L.crest && L.crest !== 'none') crestOn(R * 1.05);
      break;
    }
    case 'crown': { const g = new THREE.CylinderGeometry(R * 0.78, R * 0.72, 0.12, sg(24), 1, true); g.translate(C[0], C[1] + R * 0.88, C[2] - 0.02); add('head', g, 'gold', '#E6B640'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const c = new THREE.ConeGeometry(0.035, 0.09, 6); c.translate(C[0] + Math.sin(a) * R * 0.78, C[1] + R * 0.88 + 0.1, C[2] - 0.02 + Math.cos(a) * R * 0.78); add('head', c, 'gold', '#E6B640'); } for (const a of [0, Math.PI / 2, -Math.PI / 2]) add('head', sph(0.022, C[0] + Math.sin(a) * R * 0.8, C[1] + R * 0.88, C[2] - 0.02 + Math.cos(a) * R * 0.8, 1, 1, 0.6, 8, 6), 'glow', '#D02838'); break; }
    case 'laurel': for (let i = 0; i < 16; i++) { const a = (i / 15 - 0.5) * Math.PI * 1.5 + Math.PI; const g = sph(0.035, 0, 0, 0, 1.8, 0.5, 0.9, 8, 6); g.rotateZ(0.6); add('head', xf(g, { r: [0, a, 0], t: [C[0] + Math.sin(a + Math.PI) * R * 1.02, C[1] + R * 0.45, C[2] + Math.cos(a + Math.PI) * R * 1.0] }), 'gold', '#D8B040'); } break;
    case 'hood': dome(R * 1.13, Math.PI * 0.62, m('w', shade(L.top, 0.9)), 'cloth', -0.55); break;
    case 'nemes': { dome(R * 1.08, Math.PI * 0.5, m('w', '#E8C24A'), 'cloth', -0.2); for (const sx of [1, -1]) add('head', rbox(0.1, 0.34, 0.06, 0.03, sx * R * 1.0, C[1] - 0.2, C[2] + 0.02, 0, 0, sx * 0.08), 'cloth', '#2A4A8A'); break; }
    case 'kabuto': { dome(R * 1.12, Math.PI * 0.5, m('w', '#2A2A34'), 'plastic', -0.12); add('head', xf(new THREE.CylinderGeometry(R * 1.2, R * 1.45, 0.16, sg(24), 1, true, Math.PI * 0.6, Math.PI * 0.8), { t: [C[0], C[1] - 0.06, C[2] - 0.02] }), 'plastic', '#2A2A34'); for (const sx of [1, -1]) add('head', xf(new THREE.ConeGeometry(0.03, 0.26, 6), { r: [0, 0, -sx * 0.6], t: [sx * 0.11, C[1] + R * 0.95, C[2] + R * 0.6] }), 'gold', '#E2B23E'); break; }
    case 'kettle': { const st = m('w', L.metal || '#A8B0B8'); dome(R * 1.08, Math.PI * 0.45, st, 'steel', -0.05); brim(R * 1.0, 0.14, C[1] + 0.12, st, 'steel', 1, 0); if (L.crest && L.crest !== 'none') crestOn(R * 0.9); break; }
    case 'stahlhelm': case 'm1': case 'brodie': {
      const c = m('w', w === 'stahlhelm' ? '#5E6458' : w === 'm1' ? '#5E5C40' : '#6A6448');
      dome(R * 1.12, Math.PI * (w === 'brodie' ? 0.42 : 0.52), c, 'plastic', -0.15);
      if (w === 'brodie') brim(R * 1.05, 0.12, C[1] + 0.1, c, 'plastic');
      if (w === 'stahlhelm') add('head', xf(new THREE.CylinderGeometry(R * 1.13, R * 1.32, 0.14, sg(24), 1, true, Math.PI * 0.35, Math.PI * 1.3), { t: [C[0], C[1] - 0.05, C[2] - 0.02] }), 'plastic', c);
      break;
    }
    case 'hard_hat': dome(R * 1.08, Math.PI * 0.48, m('w', '#F2C12E'), 'plastic', -0.1); brim(R * 1.0, 0.05, C[1] + 0.08, m('w', '#F2C12E'), 'plastic', 1.15); break;
    case 'shako': case 'kepi': { const h = w === 'shako' ? 0.3 : 0.18; add('head', cyl(R * 0.82, w === 'shako' ? R * 0.9 : R * 0.74, [C[0], C[1] + R * 0.55, C[2]], [C[0], C[1] + R * 0.55 + h, C[2] - (w === 'kepi' ? 0.03 : 0)], 24), 'cloth', m('w', w === 'shako' ? '#1E1E24' : L.top)); add('head', xf(new THREE.CylinderGeometry(R * 0.7, R * 0.7, 0.015, sg(20), 1, false, -Math.PI / 2, Math.PI), { s: [1, 1, 0.7], t: [C[0], C[1] + R * 0.6, C[2] + R * 0.55] }), 'leather', '#1A1A1E'); if (w === 'shako') add('head', sph(0.03, C[0], C[1] + R * 0.55 + h - 0.02, C[2] + R * 0.86, 1, 1, 0.5, 8, 6), 'gold', '#E2B23E'); break; }
    case 'top_hat': case 'bowler': case 'fedora': case 'cowboy': case 'straw': case 'pith': {
      const c = m('w', { top_hat: '#1E1E22', bowler: '#2A2622', fedora: '#4A4036', cowboy: '#8A6440', straw: '#E2C886', pith: '#E8DEC4' }[w]);
      const crownH = { top_hat: 0.34, bowler: 0.14, fedora: 0.16, cowboy: 0.16, straw: 0.1, pith: 0.16 }[w];
      if (w === 'bowler' || w === 'pith') dome(R * 0.98, Math.PI * 0.5, c, 'cloth', 0, 0.8);
      else add('head', cyl(R * 0.82, R * 0.78, [C[0], C[1] + R * 0.62, C[2]], [C[0], C[1] + R * 0.62 + crownH, C[2]], 24), 'cloth', c);
      brim(R * 0.78, { top_hat: 0.08, bowler: 0.06, fedora: 0.12, cowboy: 0.2, straw: 0.26, pith: 0.12 }[w], C[1] + R * 0.6, c, 'cloth');
      if (w !== 'straw' && w !== 'pith') add('head', cyl(R * 0.83, R * 0.83, [C[0], C[1] + R * 0.64, C[2]], [C[0], C[1] + R * 0.64 + 0.04, C[2]], 24), 'cloth', '#1A1A1A');
      break;
    }
    case 'tricorn': case 'bicorne': { const c = m('w', '#1E1E24'); dome(R * 0.98, Math.PI * 0.45, c, 'cloth', 0, 0.8); const g = new THREE.CylinderGeometry(R * 1.2, R * 1.2, 0.12, w === 'tricorn' ? 3 : 2 * 12, 1, true); g.scale(w === 'bicorne' ? 1.5 : 1, 1, w === 'bicorne' ? 0.35 : 1); g.translate(C[0], C[1] + R * 0.7, C[2]); add('head', g, 'cloth', c); break; }
    case 'turban': for (let i = 0; i < 4; i++) add('head', torus(R * (0.98 - i * 0.12), 0.07, C[0], C[1] + R * (0.45 + i * 0.16), C[2] - 0.02, Math.PI / 2 - 0.1, TAU, 1.05, 1, 22), 'cloth', m('w', i % 2 ? '#F0E8D8' : '#E2D6C0')); break;
    case 'fez': add('head', cyl(R * 0.5, R * 0.42, [C[0], C[1] + R * 0.82, C[2]], [C[0], C[1] + R * 0.82 + 0.17, C[2]], 20), 'cloth', m('w', '#B82424')); break;
    case 'beret': add('head', xf(sph(R * 0.86, 0, 0, 0, 1.15, 0.32, 1.05, 22, 12), { r: [0, 0, 0.18], t: [C[0] - 0.03, C[1] + R * 0.82, C[2] - 0.03] }), 'cloth', m('w', '#2A2A30')); break;
    case 'cap': dome(R * 1.06, Math.PI * 0.42, m('w', L.accent || '#2E4A8A'), 'cloth', -0.1); add('head', xf(new THREE.CylinderGeometry(R * 0.75, R * 0.75, 0.02, sg(20), 1, false, -Math.PI / 2, Math.PI), { s: [1, 1, 0.75], r: [0.15, 0, 0], t: [C[0], C[1] + R * 0.55, C[2] + R * 0.62] }), 'cloth', m('w', L.accent || '#2E4A8A')); break;
    case 'bandana': dome(R * 1.06, Math.PI * 0.42, m('w', '#B8282A'), 'cloth', -0.3); break;
    case 'headband': add('head', torus(R * 1.05, 0.03, C[0], C[1] + R * 0.35, C[2] - 0.02, Math.PI / 2 - 0.15, TAU, 1.04, 1, 30), 'cloth', m('w', '#C8322E')); break;
    case 'wizard': { const g = new THREE.ConeGeometry(R * 0.85, 0.62, sg(22)); g.translate(C[0], C[1] + R * 0.8 + 0.28, C[2] - 0.02); add('head', g, 'cloth', m('w', '#3A3A8A')); brim(R * 0.84, 0.18, C[1] + R * 0.68, m('w', '#3A3A8A'), 'cloth'); break; }
    case 'chef': { add('head', cyl(R * 0.8, R * 0.85, [C[0], C[1] + R * 0.6, C[2]], [C[0], C[1] + R * 0.6 + 0.16, C[2]], 22), 'cloth', '#F6F4EE'); add('head', sph(R * 0.95, C[0], C[1] + R * 0.6 + 0.24, C[2], 1, 0.55, 1, 20, 12), 'cloth', '#F6F4EE'); break; }
    case 'mitre': { const g = new THREE.ConeGeometry(R * 0.7, 0.42, 4); g.rotateY(Math.PI / 4); g.scale(1, 1, 0.55); g.translate(C[0], C[1] + R * 0.75 + 0.18, C[2]); add('head', g, 'cloth', m('w', '#F2EEE4')); break; }
    case 'bubble': add('head', sph(R * 1.32, C[0], C[1] - 0.01, C[2] + 0.01, 1, 1, 1, 30, 22), 'glass', '#DDEEFF'); add('head', torus(R * 1.12, 0.05, C[0], C[1] - R * 0.92, C[2], Math.PI / 2, TAU, 1, 1, 30), 'plastic', '#D8D8D4'); break;
    default: break;
  }
}

// ── things in the hands and on the back ─────────────────────────────────────────────────────────────────────────────
// a right-hand item is authored gripped at the right mitten (rest pose: hand at about (-0.25, 0.4, 0.02)), pointing
// forward-up; left-hand items at the left mitten. Shields hang on the left forearm, facing out.
const HAND_R = [-0.249, 0.405, 0.03], HAND_L = [0.249, 0.405, 0.03];
function heldParts(L, add, low) {
  const one = (item, side) => {
    if (!item || item === 'none') return;
    const H = side > 0 ? HAND_L : HAND_R, j = side > 0 ? 'lFore' : 'rFore', x = H[0], y = H[1], z = H[2];
    const up = (len, r, c, kind = 'wood', tip = null, tipC = '#C9D2DC', tipKind = 'chrome', lean = 0.12) => {
      add(j, cyl(r, r, [x, y - len * 0.25, z - lean * 0.25], [x, y + len * 0.75, z + lean * 0.75], 10), kind, c);
      if (tip) { const g = tip(); g.translate(x, y + len * 0.75, z + lean * 0.75); add(j, g, tipKind, tipC); }
    };
    switch (item) {
      case 'gladius': case 'sword': case 'longsword': case 'katana': {
        const len = item === 'longsword' ? 0.55 : item === 'katana' ? 0.5 : 0.34;
        add(j, cyl(0.022, 0.022, [x, y - 0.04, z], [x, y + 0.06, z + 0.01], 8), 'leather', '#5A3A22');
        add(j, rbox(0.12, 0.025, 0.04, 0.01, x, y + 0.075, z + 0.012), 'gold', '#D9B048');
        const b = new THREE.BoxGeometry(item === 'katana' ? 0.03 : 0.055, len, 0.012); b.translate(0, len / 2, 0); b.rotateX(0.12); b.translate(x, y + 0.085, z + 0.012);
        add(j, b, 'chrome', '#DDE4EA'); break;
      }
      case 'spear': case 'pilum': case 'trident': case 'pitchfork': case 'staff': case 'vine_stick': case 'torch': case 'flag': case 'standard': case 'aquila':
        if (item === 'vine_stick') { up(0.62, 0.016, '#8A5A30', 'wood', null, null, null, 0.3); break; }
        if (item === 'torch') { up(0.42, 0.024, '#7A5032', 'wood', () => sph(0.07, 0, 0.04, 0, 1, 1.5, 1, 10, 8), '#FFB040', 'glow', 0.1); break; }
        if (item === 'staff') { up(1.1, 0.022, '#8A6440', 'wood', () => sph(0.05, 0, 0, 0, 1, 1, 1, 10, 8), '#9AD8F0', 'glow'); break; }
        if (item === 'flag' || item === 'standard' || item === 'aquila') {
          up(1.45, 0.02, '#8A6440', 'wood');
          if (item === 'aquila') { const e = new THREE.Group(); add(j, xf(sph(0.06, 0, 0, 0, 1, 1.2, 1.1, 12, 10), { t: [x, y + 1.15, z + 0.17] }), 'gold', '#E6B640'); for (const sx of [1, -1]) add(j, xf(new THREE.BoxGeometry(0.2, 0.08, 0.015), { r: [0, 0, sx * 0.5], t: [x + sx * 0.12, y + 1.2, z + 0.17] }), 'gold', '#E6B640'); }
          else { const c = L.accent || '#C8322E'; add(j, xf(new THREE.BoxGeometry(0.42, 0.3, 0.012), { t: [x + (item === 'flag' ? -0.22 : 0), y + 0.92, z + 0.13] }), 'cloth', c); }
          break;
        }
        up(item === 'spear' || item === 'pilum' ? 1.3 : 1.2, 0.017, '#8A6440', 'wood', () => {
          if (item === 'trident' || item === 'pitchfork') { const g = mergeGeometries([0, 1, 2].map((k) => new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6).translate((k - 1) * 0.05, 0.1, 0)).concat([new THREE.BoxGeometry(0.12, 0.015, 0.015)])); return g; }
          return new THREE.ConeGeometry(0.03, item === 'pilum' ? 0.26 : 0.16, 8).translate(0, item === 'pilum' ? 0.13 : 0.08, 0);
        });
        break;
      case 'hammer': case 'pickaxe': case 'axe': case 'shovel': case 'hoe': case 'sickle': {
        up(0.58, 0.02, '#8A6440', 'wood');
        const tx = x, ty = y + 0.43, tz = z + 0.08;
        if (item === 'hammer') add(j, rbox(0.17, 0.08, 0.08, 0.015, tx, ty, tz), 'chrome', '#8A9098');
        if (item === 'pickaxe') add(j, xf(new THREE.TorusGeometry(0.16, 0.02, 6, 16, Math.PI * 0.8), { r: [0, Math.PI / 2, Math.PI * 0.1], t: [tx, ty - 0.12, tz] }), 'chrome', '#8A9098');
        if (item === 'axe') add(j, rbox(0.14, 0.12, 0.02, 0.01, tx + 0.05, ty, tz, 0, Math.PI / 2, 0), 'chrome', '#A8B0B8');
        if (item === 'shovel') add(j, rbox(0.15, 0.2, 0.02, 0.03, x, y - 0.25, z - 0.03, 0.12), 'chrome', '#8A9098');
        if (item === 'sickle') add(j, xf(new THREE.TorusGeometry(0.11, 0.012, 6, 16, Math.PI * 1.2), { t: [tx, ty, tz] }), 'chrome', '#A8B0B8');
        break;
      }
      case 'scroll': add(j, xf(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12), { r: [0, 0, Math.PI / 2], t: [x, y + 0.03, z + 0.04] }), 'cloth', '#EDE2C4'); break;
      case 'book': add(j, rbox(0.15, 0.2, 0.05, 0.01, x, y + 0.06, z + 0.06), 'cloth', L.accent || '#7A2A2A'); break;
      case 'lantern': add(j, cyl(0.05, 0.05, [x, y - 0.18, z + 0.02], [x, y - 0.04, z + 0.02], 8), 'glow', '#FFC870'); add(j, cyl(0.06, 0.03, [x, y - 0.04, z + 0.02], [x, y + 0.0, z + 0.02], 8), 'chrome', '#3A3A3A'); break;
      case 'coin_bag': case 'bag': add(j, sph(0.09, x, y - 0.1, z + 0.03, 1, 1.1, 1, 12, 10), 'cloth', '#B08A52'); break;
      case 'musket': case 'rifle': {
        const len = item === 'musket' ? 0.82 : 0.66;
        add(j, xf(new THREE.BoxGeometry(0.05, len * 0.45, 0.06), { r: [0.15, 0, 0], t: [x, y + len * 0.05, z + 0.02] }), 'wood', '#7A4E2C');
        add(j, cyl(0.014, 0.014, [x, y + len * 0.2, z + 0.05], [x, y + len * 0.95, z + 0.16], 8), 'chrome', '#3A3C40');
        break;
      }
      case 'pistol': add(j, rbox(0.04, 0.06, 0.16, 0.01, x, y + 0.02, z + 0.08), 'plastic', '#2A2A2E'); break;
      case 'bow': add(j, xf(new THREE.TorusGeometry(0.42, 0.014, 6, 24, Math.PI * 0.7), { r: [0, Math.PI / 2, Math.PI * 0.65], t: [x + 0.0, y + 0.03, z - 0.15] }), 'wood', '#8A5A30'); break;
      case 'quill': add(j, cyl(0.004, 0.02, [x, y, z + 0.02], [x, y + 0.2, z + 0.06], 6), 'cloth', '#F4F2EC'); break;
      case 'cup': case 'goblet': add(j, cyl(0.035, 0.05, [x, y + 0.02, z + 0.06], [x, y + 0.12, z + 0.06], 12), 'gold', '#E2B23E'); break;
      case 'briefcase': add(j, rbox(0.3, 0.22, 0.08, 0.02, x, y - 0.15, z), 'leather', '#4A3224'); break;
      case 'phone': add(j, rbox(0.06, 0.12, 0.012, 0.01, x, y + 0.04, z + 0.07, -0.5), 'plastic', '#1A1A1E'); break;
      case 'scutum': case 'shield': {   // Roman rectangular curved shield on the left forearm, red with a gold boss and wings
        const c = L.shieldColor || '#C42E2B';
        const g = new THREE.CylinderGeometry(0.42, 0.42, 0.78, sg(20), 1, true, -0.38, 0.76); g.translate(0, 0, -0.42);
        g.rotateY(side * 0.75);
        xf(g, { t: [x + side * 0.08, y + 0.07, z + 0.14] });
        add(j, g, 'cloth', c);
        const nrm = V(Math.sin(side * 0.75), 0, Math.cos(side * 0.75)), ctr = V(x + side * 0.08, y + 0.07, z + 0.14);
        const onS = (u, v, out = 0.012) => { const tg = V(Math.cos(side * 0.75), 0, -Math.sin(side * 0.75)); return ctr.clone().addScaledVector(tg, u).add(V(0, v, 0)).addScaledVector(nrm, out); };
        const qS = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), nrm);
        add(j, xf(sph(0.055, 0, 0, 0, 1, 1, 0.55, 12, 10).applyQuaternion(qS), { t: onS(0, 0, 0.02).toArray() }), 'gold', '#E2B23E');
        if (!low) {
          for (const sy of [1, -1]) { const w = new THREE.BoxGeometry(0.2, 0.05, 0.012); w.rotateZ(sy * 0.55); w.applyQuaternion(qS); add(j, w.translate(...onS(0, sy * 0.1).toArray()), 'gold', '#E2B23E'); }
          for (const su of [1, -1]) { const st = new THREE.BoxGeometry(0.018, 0.68, 0.012); st.applyQuaternion(qS); add(j, st.translate(...onS(su * 0.24, 0).toArray()), 'gold', '#E2B23E'); }
        }
        break;
      }
      case 'round_shield': case 'parma': case 'buckler': case 'hoplon': case 'heater': case 'kite': {
        const c = L.shieldColor || (item === 'parma' ? '#D9C08A' : item === 'hoplon' ? '#C08A42' : '#2E4A8A');
        let g;
        if (item === 'heater' || item === 'kite') { const s = new THREE.Shape(); const wdt = 0.24, h = item === 'kite' ? 0.62 : 0.5; s.moveTo(-wdt, h * 0.4); s.lineTo(wdt, h * 0.4); s.quadraticCurveTo(wdt, -h * 0.2, 0, -h * 0.6); s.quadraticCurveTo(-wdt, -h * 0.2, -wdt, h * 0.4); g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10 }); }
        else { const r = item === 'buckler' ? 0.16 : item === 'parma' ? 0.32 : 0.36; g = new THREE.CylinderGeometry(r, r, 0.035, sg(28)); g.rotateX(Math.PI / 2); }
        g.rotateY(side * 0.7);
        xf(g, { t: [x + side * 0.1, y + 0.08, z + 0.13] });
        add(j, g, item === 'hoplon' ? 'gold' : 'cloth', c);
        const nr = V(Math.sin(side * 0.7), 0, Math.cos(side * 0.7));
        if (item !== 'heater' && item !== 'kite') add(j, xf(sph(0.06, 0, 0, 0, 1, 1, 0.6, 12, 10).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), nr)), { t: [x + side * 0.1 + nr.x * 0.03, y + 0.08, z + 0.13 + nr.z * 0.03] }), 'chrome', '#C9D2DC');
        else add(j, xf(new THREE.BoxGeometry(0.06, 0.3, 0.012).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), nr)), { t: [x + side * 0.1 + nr.x * 0.03, y + 0.08, z + 0.13 + nr.z * 0.03] }), 'gold', L.accent || '#E2B23E');
        break;
      }
      default: break;
    }
  };
  one(L.held, -1); one(L.heldL, 1);
  // a marching pack on a pole over the right shoulder (the Roman furca)
  if (L.back === 'furca' || L.back === 'pack_pole') {
    add('rUpper', cyl(0.016, 0.016, [-0.25, 0.42, 0.06], [-0.12, 1.02, -0.32], 8), 'wood', '#8A6440');
    add('rUpper', sph(0.13, -0.12, 0.98, -0.34, 1, 1.15, 1, 14, 10), 'cloth', '#E8DCC0');
    add('rUpper', sph(0.06, -0.06, 0.86, -0.26, 1, 1, 1, 10, 8), 'chrome', '#C08A42');
  }
}

// ── one figure: the joint hierarchy, meshes parented to it ────────────────────────────────────────────────────────
export function buildChibi(L, ctx = {}, o = {}) {
  const P = buildParts(L, o);
  const group = new THREE.Group(); group.name = 'chibi:' + L.id;
  const scaleK = L.h / 1.5; group.scale.setScalar(scaleK);
  const J = {};
  const order = ['hips', 'torso', 'lLeg', 'rLeg', 'head', 'cape', 'lUpper', 'rUpper', 'lFore', 'rFore'];
  for (const j of order) {
    const node = new THREE.Group(); node.name = j;
    const par = PARENT[j] ? J[PARENT[j]] : group;
    const pp = PARENT[j] ? PIV[PARENT[j]] : [0, 0, 0];
    node.position.set(PIV[j][0] - pp[0], PIV[j][1] - pp[1], PIV[j][2] - pp[2]);
    par.add(node); J[j] = node;
    // merge this joint's geometries per material
    const byKey = {};
    for (const it of P.joints[j]) (byKey[it.key] ||= []).push(it.geo);
    for (const [key, gs] of Object.entries(byKey)) {
      const merged = gs.length === 1 ? gs[0] : mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)).map(stripUV));
      const mesh = new THREE.Mesh(merged, makeMat(key, ctx));
      mesh.castShadow = !key.startsWith('blush') && !key.startsWith('glass'); mesh.receiveShadow = true;
      if (key.startsWith('blush') || key.startsWith('glass')) mesh.renderOrder = 2;
      node.add(mesh);
    }
  }
  // the hips joint carries the lower body: legs swing from the group, the body bobs through `hips` + `torso`
  const anchors = { head: new THREE.Object3D(), rightHand: new THREE.Object3D(), leftHand: new THREE.Object3D(), feet: group };
  anchors.head.position.set(0, HEAD_C[1] - PIV.head[1], 0); J.head.add(anchors.head);
  anchors.rightHand.position.set(HAND_R[0] - PIV.rFore[0], HAND_R[1] - PIV.rFore[1], HAND_R[2] - PIV.rFore[2]); J.rFore.add(anchors.rightHand);
  anchors.leftHand.position.set(HAND_L[0] - PIV.lFore[0], HAND_L[1] - PIV.lFore[1], HAND_L[2] - PIV.lFore[2]); J.lFore.add(anchors.leftHand);
  const top = new THREE.Object3D(); top.position.set(0, HEAD_C[1] + HR + 0.12, 0); group.add(top); anchors.top = top;   // tags float above this
  const fig = { group, J, L, height: (HEAD_C[1] + HR + 0.05) * scaleK, anchors, scale: scaleK };
  fig.pose = (p) => applyPose(fig, p);
  applyPose(fig, POSE('stand', 0, 0, L.seed));
  return fig;
}
function stripUV(g) { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }

// ── poses: joint angles (radians) + a body offset; arms: X forward(-)/back(+), Z out ───────────────────────────────
// p = {bob, lean, turn, headX, headY, headZ, lLeg, rLeg, lArmX, lArmZ, rArmX, rArmZ, lElbow, rElbow, cape, squash, hop}
export function applyPose(fig, p) {
  const J = fig.J;
  J.hips.position.y = PIV.hips[1] + (p.bob || 0) + (p.hop || 0);
  J.torso.position.y = PIV.torso[1] + (p.bob || 0) + (p.hop || 0);
  J.torso.rotation.set(p.lean || 0, p.turn || 0, p.roll || 0);
  J.hips.rotation.set(0, (p.turn || 0) * 0.4, 0);
  J.head.rotation.set(p.headX || 0, p.headY || 0, p.headZ || 0);
  J.lLeg.position.y = PIV.lLeg[1] + (p.hop || 0); J.rLeg.position.y = PIV.rLeg[1] + (p.hop || 0);
  J.lLeg.rotation.set(p.lLeg || 0, 0, p.lLegZ || 0); J.rLeg.rotation.set(p.rLeg || 0, 0, p.rLegZ || 0);
  J.lUpper.rotation.set(p.lArmX || 0, p.lArmY || 0, (p.lArmZ ?? 0.12));
  J.rUpper.rotation.set(p.rArmX || 0, p.rArmY || 0, -(p.rArmZ ?? 0.12));
  J.lFore.rotation.set(p.lElbow || 0, 0, 0); J.rFore.rotation.set(p.rElbow || 0, 0, 0);
  if (J.cape) J.cape.rotation.set(p.cape ?? 0.08, 0, 0);
  if (p.squash) { const s = p.squash; fig.group.children.forEach(() => {}); J.torso.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5); }
  else J.torso.scale.set(1, 1, 1);
}

// an action at its phase. ph: the gait phase (radians) for moving actions; u: seconds into the action (for one-shots)
export const ACTIONS = ['stand', 'idle', 'ride', 'walk', 'march', 'run', 'salute', 'point', 'wave', 'cheer', 'celebrate', 'levelup', 'dig', 'build', 'swing', 'block', 'talk', 'nod', 'look_around', 'think', 'carry', 'sit', 'kneel', 'bow', 'scared', 'tired', 'aim', 'read', 'count', 'pray', 'push', 'fall', 'lie'];
export function POSE(a, ph = 0, u = 0, seed = 1) {
  const br = Math.sin(u * 2.1 + seed) * 0.006;                       // breathing
  const sway = Math.sin(u * 0.9 + seed * 1.7) * 0.03;
  switch (a) {
    case 'walk': case 'march': case 'run': case 'carry': {
      const k = a === 'run' ? 1.25 : a === 'march' ? 0.9 : 0.7, s = Math.sin(ph), c = Math.cos(ph);
      const legA = (a === 'march' ? 0.62 : 0.55) * k;
      return { bob: Math.abs(c) * (a === 'run' ? 0.05 : 0.025), lean: a === 'run' ? 0.22 : a === 'march' ? -0.02 : 0.04, headX: a === 'run' ? -0.12 : 0, roll: s * 0.04,
        lLeg: -s * legA, rLeg: s * legA, lArmX: a === 'carry' ? -1.1 : s * 0.75 * k, rArmX: a === 'carry' ? -1.1 : -s * 0.75 * k, lArmZ: a === 'carry' ? 0.05 : 0.14, rArmZ: a === 'carry' ? 0.05 : 0.14,
        lElbow: a === 'run' ? -1.1 : a === 'carry' ? -0.4 : -0.25, rElbow: a === 'run' ? -1.1 : a === 'carry' ? -0.4 : -0.25, cape: 0.25 + Math.abs(c) * 0.08 };
    }
    case 'salute': return { bob: br, rArmX: -0.6, rArmZ: 1.45, rArmY: 0.2, rElbow: -2.3, lArmZ: 0.12, headX: -0.05 };
    case 'point': return { bob: br, rArmX: -1.5, rArmZ: 0.12, rElbow: -0.05, headY: -0.08, turn: -0.08, lArmZ: 0.15 };
    case 'wave': return { bob: br, rArmZ: 2.5 + Math.sin(u * 8) * 0.35, rElbow: -0.3, lArmZ: 0.14, headZ: 0.06 };
    case 'cheer': case 'celebrate': {
      const j = a === 'celebrate' ? Math.max(0, Math.sin(u * 6.5)) * 0.16 : 0;
      return { hop: j, rArmZ: 2.6, lArmZ: 2.6, rElbow: -0.2 - Math.sin(u * 6.5) * 0.2, lElbow: -0.2 - Math.cos(u * 6.5) * 0.2, headX: -0.15, lLeg: j ? -0.2 : 0, rLeg: j ? 0.2 : 0, squash: 0 };
    }
    case 'levelup': {          // a hop and a full turn on the spot, arms up at the top (the level-up beat)
      const T = 1.1, x = clamp(u / T);
      const hop = Math.sin(Math.PI * x) * 0.32, turn = smooth(x) * TAU;
      return { hop, turn, rArmZ: 0.2 + 2.3 * Math.sin(Math.PI * x), lArmZ: 0.2 + 2.3 * Math.sin(Math.PI * x), headX: -0.2 * Math.sin(Math.PI * x), lLeg: -0.3 * Math.sin(Math.PI * x), rLeg: -0.1 * Math.sin(Math.PI * x) };
    }
    case 'dig': case 'build': { const s = Math.sin(u * (a === 'build' ? 7 : 4.2)); return { lean: 0.35 + s * 0.15, bob: -0.03, rArmX: -1.2 - s * 0.6, lArmX: -1.0 - s * 0.5, rElbow: -0.6, lElbow: -0.6, headX: 0.2 }; }
    case 'swing': { const s = Math.sin(u * 5.5); return { turn: s * 0.35, rArmX: -1.4 - s * 0.9, rArmZ: 0.4, rElbow: -0.4, lArmX: -0.9, lElbow: -1.2, lean: 0.08 }; }
    case 'block': return { lean: 0.1, lArmX: -1.35, lArmZ: 0.1, lElbow: -0.9, rArmX: -0.5, rElbow: -0.8, bob: -0.02, headX: 0.08 };
    case 'aim': return { lArmX: -1.4, lElbow: -0.3, rArmX: -1.1, rElbow: -1.1, rArmZ: -0.1, headY: 0.06, lean: 0.06 };
    case 'talk': { const s = Math.sin(u * 3.3 + seed); return { bob: br, rArmX: -0.7 + s * 0.25, rElbow: -0.9, rArmZ: 0.3, lArmX: -0.35 - s * 0.15, lElbow: -0.7, headY: s * 0.1, headX: Math.sin(u * 5) * 0.04 }; }
    case 'nod': return { bob: br, headX: Math.max(0, Math.sin(u * 5)) * 0.25 };
    case 'look_around': return { bob: br, headY: Math.sin(u * 1.4) * 0.6, turn: Math.sin(u * 1.4) * 0.15 };
    case 'think': return { bob: br, rArmX: -1.2, rElbow: -2.1, rArmZ: 0.25, headX: 0.12, headZ: 0.12 };
    case 'read': return { bob: br, rArmX: -1.0, lArmX: -1.0, rElbow: -1.1, lElbow: -1.1, rArmZ: 0.3, lArmZ: 0.3, headX: 0.3 };
    case 'count': { const s = Math.sin(u * 4); return { bob: br, rArmX: -0.9, rElbow: -1.0 + s * 0.2, lArmX: -0.9, lElbow: -1.0, headX: 0.25 }; }
    case 'pray': return { bob: br, rArmX: -1.0, lArmX: -1.0, rElbow: -1.5, lElbow: -1.5, rArmZ: -0.25, lArmZ: -0.25, headX: 0.3 };
    case 'push': { const s = Math.sin(u * 3); return { lean: 0.45, rArmX: -1.5, lArmX: -1.5, rElbow: -0.3, lElbow: -0.3, lLeg: -0.4 + s * 0.2, rLeg: 0.4 - s * 0.2, bob: -0.03 }; }
    case 'sit': return { bob: -0.2, lLeg: -1.45, rLeg: -1.45, lArmX: -0.4, rArmX: -0.4, lElbow: -0.6, rElbow: -0.6 };
    case 'ride': { const s = Math.sin(u * 2.2 + seed) * 0.02; return { bob: -0.18 + s, lLeg: -0.85, rLeg: -0.85, lLegZ: 0.6, rLegZ: -0.6, lArmX: -0.75, rArmX: -0.75, lElbow: -0.7, rElbow: -0.7, lArmZ: 0.05, rArmZ: 0.05, lean: 0.05 }; }
    case 'kneel': return { bob: -0.16, lLeg: -1.4, rLeg: 0.2, lean: 0.08, rArmX: -0.3, lArmX: -0.6, lElbow: -0.8 };
    case 'bow': return { lean: 0.55, headX: 0.2, rArmX: -0.2, lArmX: -0.2, rArmZ: 0.05, lArmZ: 0.05 };
    case 'scared': { const s = Math.sin(u * 30) * 0.02; return { bob: -0.03, lean: -0.08, rArmX: -1.2, lArmX: -1.2, rElbow: -1.6, lElbow: -1.6, rArmZ: -0.1, lArmZ: -0.1, headX: 0.15, roll: s, turn: s }; }
    case 'tired': return { bob: -0.02 + br, lean: 0.25, headX: 0.35, rArmZ: 0.05, lArmZ: 0.05, rArmX: 0.05, lArmX: 0.05 };
    case 'fall': { const x = clamp(u / 0.6); return { lean: -1.45 * smooth(x), bob: -0.25 * smooth(x), rArmZ: 1.2 * x, lArmZ: 1.2 * x, headX: -0.2 }; }
    case 'lie': return { lean: -1.45, bob: -0.25, rArmZ: 1.0, lArmZ: 1.0 };
    default: return { bob: br, lArmZ: 0.12 + sway * 0.2, rArmZ: 0.12 - sway * 0.2, headY: sway * 1.2, headX: Math.sin(u * 0.7 + seed) * 0.03, cape: 0.08 + sway * 0.4 };
  }
}
function mixP(a, b, w) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? (k.endsWith('ArmZ') ? 0.12 : 0), y = b[k] ?? (k.endsWith('ArmZ') ? 0.12 : 0);
    out[k] = x + (y - x) * w;
  }
  return out;
}

// ── controller: actions over time + walking a path ────────────────────────────────────────────────────────────────
const SPEED = { walk: 1.15, march: 1.3, run: 3.0, carry: 1.0 };
const MOVING = new Set(['walk', 'march', 'run', 'carry']);
const ALIAS = { idle: 'stand', watch: 'stand', attention: 'stand', speak: 'talk', gesture: 'talk', sprint: 'run', jog: 'run', charge: 'run', jump: 'celebrate', dance: 'celebrate', fight: 'swing', attack: 'swing', strike: 'swing', defend: 'block', shield: 'block', train: 'swing', work: 'build', hammer: 'build', write: 'read', study: 'read', worry: 'scared', afraid: 'scared', die: 'fall', dead: 'lie', sleep: 'lie', level_up: 'levelup', victory: 'celebrate', win: 'celebrate', kneel_down: 'kneel', sit_ground: 'sit', riding: 'ride', horse: 'ride', mounted: 'ride', take_cover: 'kneel', look: 'look_around', observe: 'look_around' };
export function normAction(a) { let x = String(a || 'stand').toLowerCase().trim().replace(/\s+/g, '_'); x = ALIAS[x] || x; return ACTIONS.includes(x) ? x : 'stand'; }

export function makeChibiController(fig, item = {}, ctx = {}) {
  const root = new THREE.Group(); root.name = 'chibiRoot';
  root.add(fig.group);
  const at = Array.isArray(item.at) ? item.at : [0, 0];
  const yaw0 = Math.PI - (item.heading ?? 180) * Math.PI / 180;
  const list = (Array.isArray(item.actions) && item.actions.length ? item.actions.map((e) => (Array.isArray(e) ? { t: +e[0] || 0, action: e[1] } : { t: +e.t || 0, action: e.action || e.a }))
    : [{ t: 0, action: item.action }]).map((e) => ({ ...e, action: normAction(e.action) })).sort((a, b) => a.t - b.t);
  list[0].t = Math.min(0, list[0].t);
  // path: [[x, z]...] walked at the action's speed while a moving action is on
  const pts = Array.isArray(item.path) && item.path.length >= 2 ? item.path.map((p) => [+p[0], +p[p.length === 3 ? 2 : 1]]) : null;
  let segs = null, total = 0;
  if (pts) { segs = []; for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push({ a: pts[i], b: pts[i + 1], L, s0: total }); total += L; } }
  const speedOf = (a) => (item.speed != null ? +item.speed : SPEED[a] || 0);
  // distance walked by time t (integrating the speed; speed eases over 0.4 s at every change)
  const N = 600, DT = 1 / 30, dist = new Float32Array(N + 1);
  const actionAt = (t) => { let k = 0; for (let i = 0; i < list.length; i++) if (list[i].t <= t) k = i; return k; };
  if (pts) { let d = 0, v = 0; for (let i = 0; i <= N; i++) { const t = i * DT; const a = list[actionAt(t)].action; const tv = MOVING.has(a) ? speedOf(a) : 0; v += (tv - v) * Math.min(1, DT / 0.35); d += v * DT; dist[i] = Math.min(total, d); } }
  const distAt = (t) => { if (!pts) return 0; const x = clamp(t / DT, 0, N), i = Math.floor(x), f = x - i; return i >= N ? dist[N] : dist[i] + (dist[i + 1] - dist[i]) * f; };
  const posAt = (d) => {
    if (!segs) return [at[0], at[1], yaw0];
    let s = segs[segs.length - 1]; for (const q of segs) if (d <= q.s0 + q.L) { s = q; break; }
    const u = s.L > 0 ? clamp((d - s.s0) / s.L) : 0;
    const x = s.a[0] + (s.b[0] - s.a[0]) * u, z = s.a[1] + (s.b[1] - s.a[1]) * u;
    // heading: eased across corners (look 0.6 m ahead and behind)
    const ah = sample(d + 0.6), bh = sample(d - 0.6);
    return [x, z, Math.atan2(ah[0] - bh[0], ah[1] - bh[1])];
  };
  function sample(d) { d = clamp(d, 0, total); let s = segs[segs.length - 1]; for (const q of segs) if (d <= q.s0 + q.L) { s = q; break; } const u = s.L > 0 ? clamp((d - s.s0) / s.L) : 0; return [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u]; }
  const face = Array.isArray(item.face) ? item.face : null;
  const stride = 0.42 * fig.scale;
  function update(t) {
    const k = actionAt(t), cur = list[k], prev = k > 0 ? list[k - 1] : null;
    const w = prev ? smooth((t - cur.t) / 0.35) : 1;
    const d = distAt(t);
    const [x, z, yawPath] = posAt(d);
    const ph = (d / stride) * Math.PI;
    const poseOf = (e) => POSE(e.action, MOVING.has(e.action) && pts ? ph : MOVING.has(e.action) ? t * 6 : 0, t - e.t, fig.L.seed);
    let p = poseOf(cur);
    if (prev && w < 1) p = mixP(poseOf(prev), p, w);
    fig.pose(p);
    fig.group.position.set(x, 0, z);
    let yaw = pts && total > 0.01 ? yawPath : yaw0;
    if (face && !(pts && MOVING.has(cur.action))) yaw = Math.atan2(face[0] - x, face[1] - z);
    fig.group.rotation.y = yaw;
  }
  update(0);
  const res = { root, update, actionAt: (t) => list[actionAt(t)].action, moving: !!pts };
  if (pts) {
    res.members = (t) => { update(t); return [[fig.group.position.x, fig.group.position.z]]; };
    res.loco = { kind: 'chibi', walkers: (t) => { update(t); const a = list[actionAt(t)].action; return [{ x: fig.group.position.x, z: fig.group.position.z, yaw: fig.group.rotation.y, phase: distAt(t) / (2 * stride), stride: 2 * stride, moving: MOVING.has(a) }]; } };
  }
  return res;
}
