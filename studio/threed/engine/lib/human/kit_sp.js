// kit_sp.js — E1 specificity kit (2026-09-29): costume kits and hand-held accessories the narration names.
//   kits:        surgeon (gown, cap, mask, gloves), patient (the bare house mannequin, no scarf), tunnel_rat (olive T-shirt,
//                fatigue trousers, boots, flashlight + .45 by default), vietnam_us (OG-107 jungle fatigues, M1 helmet,
//                web gear, M16), viet_cong (black pajamas)
//   accessories: pistol (M1911 in the right hand), flashlight (lit, in the left hand: a spot light + a visible beam),
//                flashlight_right, m16, ak47 (rifles on the rig's carry modes: sling | aim | port | low), surgical_mask,
//                scrub_cap, grenades (two on the chest)
// Loaded by lib/human/index.js before any figure is built: it extends kits.js (KITS, ACCESSORIES) and rig.js (WEAPON).
import * as THREE from 'three';
import * as R from './rig.js';
import { KITS, ACCESSORIES, HEADWEAR, KIT_PARTS as KP, PROF, SK } from './kits.js';
import { buildRecipe, PRESETS } from './propbuild.js';
import { CATALOG as CAST_CAT } from './cast.js';

const { V3, TAU, lerp, sstep } = R;
const PI = Math.PI, DS = THREE.DoubleSide;

// ── hand-held props as children of the hand bone (real metres): the recipe origin in the fist, +Z along the fingers ──
function holdIn(c, side, recipe, name) {
  const r = side === 'l' ? 'L' : 'R', s = c.rig.s, bone = c.rig.B['hand' + r];
  const B = buildRecipe(recipe, {});
  const g = B.group; g.name = 'held:' + name;
  g.position.set((r === 'R' ? 0.018 : -0.018) * s, -0.078 * s, 0.014 * s);
  g.rotation.set(PI / 2, 0, 0);
  bone.add(g);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !(o.material && o.material.transparent) && o.name !== 'beam'; o.receiveShadow = true; } });
  c.extras.hold[side] = 'grip';
  c.rig.held = c.rig.held || {}; c.rig.held[name] = { group: g, side, update: B.update, anchors: B.anchors };   // actions_sp.js reads fig.rig.held
  return B;
}
function pistol(c) { holdIn(c, 'r', PRESETS.pistol_m1911, 'pistol'); c.extras.pistol = true; }
function flashlight(c, a = {}, side = 'l') {
  const pre = PRESETS.flashlight, L = { ...pre.light, ...(a.intensity != null ? { intensity: +a.intensity } : {}), ...(a.beam != null ? { beam: +a.beam } : {}), ...(a.angle != null ? { angle: +a.angle } : {}) };
  const B = holdIn(c, side, { ...pre, light: L }, 'flashlight');
  c.extras.flashlight = side;
  return B;
}

// ── rifles on the rig's weapon system (+Z to the muzzle, +Y up, origin at the right hand's grip) ────────────────────
R.WEAPON.m16 = {
  len: 0.99, butt: 0.42, grips: { r: V3(0, -0.015, 0.0), l: V3(0, 0.03, 0.3) }, swivel: [V3(0, 0.02, 0.45), V3(0, -0.02, -0.4)],
  build(add, K) {
    add(K.steel, R.rbox(0.05, 0.07, 0.22, 0.008).translate(0, 0.05, 0.08));                       // receiver
    add(K.steel, R.rbox(0.028, 0.05, 0.13, 0.006).translate(0, 0.105, 0.04));                      // carry handle
    add(K.wood, new THREE.CylinderGeometry(0.03, 0.028, 0.3, 12).rotateX(PI / 2).translate(0, 0.055, 0.34));   // handguard
    add(K.steel, R.rod(V3(0, 0.058, 0.48), V3(0, 0.058, 0.72), 0.0085, 0.0085, 8));                 // barrel
    add(K.steel, R.rod(V3(0, 0.058, 0.67), V3(0, 0.058, 0.72), 0.011, 0.011, 8));                   // flash hider
    add(K.steel, R.rbox(0.012, 0.075, 0.012, 0.002).translate(0, 0.095, 0.52));                     // front sight
    add(K.wood, R.rbox(0.036, 0.06, 0.35, 0.008).translate(0, 0.035, -0.24));                       // stock
    add(K.wood, R.rbox(0.04, 0.12, 0.02, 0.004).translate(0, 0.015, -0.415));
    add(K.wood, R.rbox(0.03, 0.1, 0.04, 0.006).rotateX(-0.31).translate(0, -0.03, -0.005));          // pistol grip
    add(K.steel, R.rbox(0.026, 0.19, 0.065, 0.004).rotateX(0.14).translate(0, -0.065, 0.1));        // magazine
    const tg = new THREE.TorusGeometry(0.018, 0.003, 5, 12, PI); tg.rotateY(PI / 2); tg.rotateX(PI); tg.translate(0, -0.012, 0.035); add(K.steel, tg);
  },
};
R.WEAPON.ak47 = {
  len: 0.88, butt: 0.38, grips: { r: V3(0, -0.015, 0.0), l: V3(0, 0.03, 0.3) }, swivel: [V3(0, 0.02, 0.45), V3(0, -0.04, -0.34)],
  build(add, K) {
    add(K.steel, R.rbox(0.05, 0.075, 0.26, 0.006).translate(0, 0.05, 0.07));
    add(K.wood, R.rbox(0.05, 0.055, 0.2, 0.01).translate(0, 0.04, 0.3));
    add(K.wood, R.rbox(0.04, 0.03, 0.16, 0.008).translate(0, 0.085, 0.32));
    add(K.steel, R.rod(V3(0, 0.062, 0.38), V3(0, 0.062, 0.66), 0.0085, 0.0085, 8));
    add(K.steel, R.rod(V3(0, 0.09, 0.32), V3(0, 0.09, 0.56), 0.008, 0.008, 8));
    add(K.steel, R.rbox(0.014, 0.04, 0.014, 0.002).translate(0, 0.085, 0.64));
    add(K.wood, R.stock([[-0.36, -0.12, 0.03, 0.02], [-0.3, -0.11, 0.032, 0.021], [-0.15, -0.07, 0.03, 0.019], [-0.05, -0.04, 0.025, 0.017], [0.0, -0.035, 0.02, 0.016]]));
    add(K.wood, R.rbox(0.03, 0.1, 0.04, 0.006).rotateX(-0.31).translate(0, -0.03, -0.005));
    add(K.steel, R.tube(R.path([[0, 0.02, 0.1], [0, -0.07, 0.13], [0, -0.16, 0.19], [0, -0.2, 0.26]], 12), 0.018, 8));
    const tg = new THREE.TorusGeometry(0.018, 0.003, 5, 12, PI); tg.rotateY(PI / 2); tg.rotateX(PI); tg.translate(0, -0.012, 0.035); add(K.steel, tg);
  },
};
// prone: the rifle lies forward on the ground ahead of the head, butt at the right shoulder (root space, metres)
R.CARRY.prone = { space: 'root', p: [-0.1, 0.2, 0.74], r: [-0.06, 0.0, -0.1], r_: { fingers: [0.3, -0.9, 0.25], palm: [1, 0.1, 0] }, l_: { fingers: [1, 0.2, 0.25], palm: [0, 1, 0.1] } };
function rifle(c, kind) {
  if (c.extras.props.weapon) return;
  c.mat('rfurn', null, kind === 'ak47' ? 0x6A3E1E : 0x1C1D1F, { roughness: kind === 'ak47' ? 0.55 : 0.5 }, 0.25, 0.02);
  c.mat('wsteel', null, 0x2A2C2B, { roughness: 0.42, metalness: 0.75 }, 0.2, 0);
  if (!c.M.strap) c.mat('strap', 'web', 0x4E5236, { roughness: 0.95 }, 0.5);
  const WB = R.buildWeapon(c.kit, c.rig, kind, { wood: 'rfurn', steel: 'wsteel', strap: 'strap' });
  c.extras.props.weapon = R.weaponPlacer(c.rig, WB);
  c.extras.armed = true;
}

// ── surgical mask and cap: shells that follow the house head (rig.buildHead, egg, scale 0.96) ───────────────────────
function headShell(y0, y1, a0, a1, grow, n = 22, m = 28) {
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= n; i++) {
    const y = lerp(y0, y1, i / n), rr = Math.sqrt(Math.max(0, 1 - y * y));
    const lo = sstep(0.05, -1, y), kx = 1 - 0.2 * lo;
    for (let j = 0; j <= m; j++) {
      const a = lerp(a0, a1, j / m);                                   // 0 = the face (+Z)
      let x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      let kz = 1 - 0.08 * sstep(0.2, -1, y) * (z < 0 ? 1.6 : 0.4);
      if (z > 0.55) z = 0.55 + (z - 0.55) * 0.8;
      pos.push(x * 0.075 * kx * 0.96 * grow, y * 0.121 * 0.96 * (1 + (grow - 1) * 0.6) + 1.6634, z * 0.098 * kz * 0.96 * grow + 0.014);
      uv.push(j / m, i / n);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, b = a + 1, c2 = a + m + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function surgicalMask(c, a = {}) {
  c.mat('mask', 'sateen', KP.hexOf(a.color, 0x8FB9CF), { roughness: 0.9, side: DS }, 0.4, 0);
  c.kit.add('mask', headShell(-0.9, -0.06, -1.25, 1.25, 1.08), c.rig.B.head);
  // ties round the back of the head
  for (const y of [1.66, 1.6]) c.kit.add('mask', R.tube(R.path([[-0.068, y, 0.03], [-0.07, y + 0.01, -0.06], [0, y + 0.012, -0.095], [0.07, y + 0.01, -0.06], [0.068, y, 0.03]], 14), 0.004, 5), c.rig.B.head);
}
function scrubCap(c, a = {}) {
  c.mat('cap', 'sateen', KP.hexOf(a.color, 0x4F8074), { roughness: 0.85, side: DS }, 0.6, 0);
  c.kit.add('cap', headShell(0.12, 1.0, -PI, PI, 1.1, 18, 40), c.rig.B.head);
}
function grenades(c) {
  c.mat('gren', null, 0x4B5232, { roughness: 0.6, metalness: 0.2 }, 0.3, 0);
  for (const sx of [1, -1]) { const g = new THREE.SphereGeometry(0.03, 12, 10); g.scale(1, 1.25, 1); R.placeBox(c.kit, 'gren', g, c.at, 1.2, PI / 2 + sx * 0.55, 0.035, c.tw); }
}
Object.assign(ACCESSORIES, {
  pistol, handgun: pistol, m1911: pistol, colt: pistol,
  flashlight: (c, a) => flashlight(c, a, 'l'), torch: (c, a) => flashlight(c, a, 'l'), flashlight_right: (c, a) => flashlight(c, a, 'r'),
  m16: (c) => rifle(c, 'm16'), ak47: (c) => rifle(c, 'ak47'),
  surgical_mask: surgicalMask, mask: surgicalMask, scrub_cap: scrubCap, surgical_cap: scrubCap, grenades,
});

// ── kits ────────────────────────────────────────────────────────────────────────────────────────────────────────
function dressSurgeon(c) {
  const { coat, trousers, accent } = c.col;
  KP.base(c, { glove: { tex: 'sateen', color: accent, rough: 0.42 } }); KP.std(c);
  c.mat('coat', 'sateen', coat, { roughness: 0.88, side: DS }, 1, 0);
  c.mat('trousers', 'sateen', trousers, { roughness: 0.9 }, 1, 0);
  KP.torso(c, 'coat', PROF.jacket, {});
  KP.skirt(c, 'coat', SK.knee.map((r) => [r[0], r[1] * 0.95, r[2] * 0.9, r[3] * 0.95, r[4]]), { ov: -0.12, shinK: 0.35 });
  KP.sleeves(c, 'coat', [0.066, 0.056, 0.05], { ext: 0.012 });
  R.buildCollar(c.kit, c.rig, 'coat', 'jacket', null);
  c.mat('shoe', 'leather', 0xE8E6E0, { roughness: 0.5 }, 0.3, 0);
  const top = KP.boots(c, 'sneaker', { upper: 'shoe', sole: 'sole', metal: 'metal' });
  KP.legs(c, 'trousers', [0.088, 0.066, 0.062, 0.058], top - 0.015, {});
  surgicalMask(c, { color: c.def?.colors?.mask ?? 0x8FB9CF });
  scrubCap(c, { color: coat });
}
function dressPatient(c) {
  c.mat('body', 'plaster', 0xF1EEE8, { roughness: 0.5, nScale: 0.5, envMapIntensity: 0.55 }, 0.35, 0);
  c.M.skin = c.M.body;
  R.buildHead(c.kit, c.rig, 'body', { egg: true, neckR: 0.93, scale: 0.95 });
  R.buildHands(c.kit, c.rig, 'body', {});
  c.at = R.buildTorso(c.kit, c.rig, 'body', { rows: R.WITNESS_TORSO, e: 2.1, m: 64, n: 44, capEnd: true }).at;
  R.buildSleeves(c.kit, c.rig, 'body', { r: [0.05, 0.036, 0.029], ext: -0.004, wrinkle: 0, cap: 0.95 });
  R.buildLegs(c.kit, c.rig, 'body', { r: [0.082, 0.05, 0.046, 0.035], end: 0.105, pelvis: [0.13, 0.09, 0.1], hipCap: 0.9, muscle: true });
  R.buildBoots(c.kit, c.rig, { upper: 'body', sole: 'body', metal: 'body' }, 'bare');
  c.clothed = false;
}
function dressTunnelRat(c) {
  const { coat, trousers } = c.col;
  KP.base(c); KP.std(c);
  c.mat('shirt', 'knit', coat, { roughness: 0.95, side: DS }, 1, 0.03);
  c.mat('trousers', 'serge', trousers, { roughness: 0.95 }, 1, 0.05);
  KP.skinArms(c); KP.shortSleeves(c, 'shirt', 0.062, 0.057, 0.42);
  KP.torso(c, 'shirt', PROF.shirt, {});
  KP.skirt(c, 'shirt', SK.short, { ov: 0.3, legK: 0.25, shinK: 0 });
  R.buildCollar(c.kit, c.rig, 'shirt', 'jacket', null);
  c.mat('boot', 'leather', 0x2A2420, { roughness: 0.7 }, 0.8, 0.04);
  const top = KP.boots(c, 'jump', { upper: 'boot', sole: 'sole', metal: 'metal' });
  KP.legs(c, 'trousers', [0.09, 0.068, 0.064, 0.06], top - 0.03, { blouse: [0.05, 0.01] });
  KP.belt(c, 'trousers', 1.0, 0.04, 0.009);
}
function dressVietnamUS(c) { c.def = { ...(c.def || {}), variant: 'jacket' }; KITS.ww2_us.dress(c); }
function dressVC(c) {
  const { coat, trousers } = c.col;
  KP.base(c); KP.std(c);
  c.mat('shirt', 'sateen', coat, { roughness: 0.92, side: DS }, 1, 0.03);
  c.mat('trousers', 'sateen', trousers, { roughness: 0.92 }, 1, 0.03);
  KP.sleeves(c, 'shirt', [0.06, 0.05, 0.045], { ext: 0.0 });
  KP.torso(c, 'shirt', PROF.shirt, {});
  KP.skirt(c, 'shirt', SK.short, { ov: 0.3, legK: 0.25, shinK: 0 });
  R.buildCollar(c.kit, c.rig, 'shirt', 'jacket', null);
  c.mat('shoe', 'leather', 0x2A2622, { roughness: 0.8 }, 0.5, 0);
  const top = KP.boots(c, 'sneaker', { upper: 'shoe', sole: 'sole', metal: 'metal' });
  KP.legs(c, 'trousers', [0.09, 0.07, 0.066, 0.062], top - 0.015, {});
}
Object.assign(KITS, {
  surgeon: { dress: dressSurgeon, colors: { coat: '#4F8074', trousers: '#4F8074', accent: '#E3D7BE' }, headwear: 'none', accessories: [], era: 'modern' },
  patient: { dress: dressPatient, colors: { coat: '#F1EEE8', trousers: '#F1EEE8', accent: '#F1EEE8' }, headwear: 'none', accessories: [], era: 'any' },
  tunnel_rat: { dress: dressTunnelRat, colors: { coat: '#4A5134', trousers: '#4E5438', accent: '#6A6E4C' }, headwear: 'none', accessories: ['flashlight', 'pistol'], era: '1960s', armed: false },
  vietnam_us: { dress: dressVietnamUS, colors: { coat: '#4E5536', trousers: '#4E5536', accent: '#5E6242' }, headwear: 'm1', accessories: ['m16'], era: '1960s', armed: true },
  viet_cong: { dress: dressVC, colors: { coat: '#1E1F22', trousers: '#1E1F22', accent: '#3A3A36' }, headwear: 'none', accessories: ['ak47'], era: '1960s', armed: true },
});

// the cast catalog was written before these kits and actions existed: document them there for the director
{
  const kitList = Object.keys(KITS).join('|');
  const extra = {
    target: 'throw: [x, z] where the grenade lands (default 9 m ahead); t_release s; fuse s after landing (0.9); size (blast 1); kneel true',
    fire: 'kneel_aim | aim_pistol: [t, ...] shots (recoil + muzzle flash)',
    tool: 'operate: scalpel | forceps | none (in the right hand); table_h m (0.92); reach m (0.42)',
    depth: 'climb_down: m (1.6) the body sinks into the hole (at a prop.trapdoor)',
    accessories: 'CastDef accessories: pistol (M1911, right hand) | flashlight (lit beam, left hand) | flashlight_right | m16 | ak47 | rifle | carbine | surgical_mask | scrub_cap | grenades | lantern | backpack ...',
  };
  const doc = 'E1 specificity actions: throw (a grenade: wind-up, release over the shoulder, the grenade flies to `target` and goes off with fx.grenade_blast), kneel_aim (rifle at the eye, or the .45 two-handed / pistol + flashlight side by side), aim_pistol (standing), prone (face down on the elbows, weapon or pistol + flashlight ahead), crawl (hands and knees along `path`, 0.35 m/s), belly_crawl (the low crawl, 0.22 m/s), operate (a surgeon at the table), climb_down (into a hole). Kits: surgeon, patient, tunnel_rat (flashlight + .45 by default), vietnam_us (M16), viet_cong (AK-47). A lit flashlight in a pitch-dark interior.crawl_tunnel is the only light: frame the crawler from behind (his silhouette against the lit passage) or from the front (the beam and his hands lit by its spill).';
  for (const k of ['cast', 'figure.person', 'figure.witness']) {
    const e = CAST_CAT[k]; if (!e) continue;
    e.params = { ...e.params, ...extra };
    if (k === 'figure.person') e.params.kit = kitList;
    e.doc = e.doc ? e.doc + ' ' + doc : doc;
  }
}
export const CATALOG = {};
export async function build(kind) { throw new Error('kit_sp.js: no kinds ' + kind); }
