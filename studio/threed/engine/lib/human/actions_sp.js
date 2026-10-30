// actions_sp.js — E1 specificity kit (2026-09-29): the figure actions the narration names. Hooked into actions.js
// (its ACTIONS / ALIAS / SPEED / MOVING / FADE / BUILD tables), so they work for cast figures and figure.person.
//   throw        a grenade throw: wind-up, release over the shoulder, follow-through; the grenade flies on a ballistic
//                arc to `target` [x, z], rolls, and goes off (fx.grenade_blast) `fuse` s after landing
//                params: target [x, z] (default 9 m ahead), t_release (default the action's start + 0.75), fuse (0.9),
//                size (blast 1), kneel true (throw from a kneel)
//   kneel_aim    kneeling on the right knee, the weapon up at the eye (rifle: the rig's aim carry; pistol: two hands);
//                fire [t, ...]: recoil + a muzzle flash at each time
//   aim_pistol   standing, the .45 raised in both hands (or the pistol + the flashlight side by side: tunnel rat);
//                fire [t, ...]
//   prone        lying face down, propped on the elbows, head up, hands forward (the weapon / flashlight ahead)
//   crawl        on hands and knees along `path` (0.35 m/s): diagonal pairs, no sliding hands or knees
//   belly_crawl  the low crawl flat on the ground (0.22 m/s): the forearms reach and pull, a knee draws up
//   operate      a surgeon at the operating table: leaning in, both gloved hands working over the patient (scalpel in
//                the right hand, `tool` scalpel|forceps|none), small precise strokes; params table_h (0.92), reach (0.42)
//   climb_down   down a ladder / into a hole: the body sinks by `depth` (1.6 m) over `dur` (2.5 s), hands on the rim
import * as THREE from 'three';
import { buildRecipe, PRESETS } from './propbuild.js';
import { makeBlast } from './blast.js';
import { clamp, lerp } from '../shared/util.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);

export const ACTIONS = ['throw', 'kneel_aim', 'aim_pistol', 'prone', 'crawl', 'belly_crawl', 'operate', 'climb_down'];
export const ALIAS = {
  throw_grenade: 'throw', grenade: 'throw', lob: 'throw', toss: 'throw', hurl: 'throw',
  kneeling_aim: 'kneel_aim', kneel_fire: 'kneel_aim', kneel_shoot: 'kneel_aim', aim_kneel: 'kneel_aim',
  pistol: 'aim_pistol', aim_handgun: 'aim_pistol', handgun: 'aim_pistol', shoot_pistol: 'aim_pistol', fire_pistol: 'aim_pistol',
  lie_prone: 'prone', lie_down_prone: 'prone', prone_aim: 'prone', face_down: 'prone',
  hands_and_knees: 'crawl', crawling: 'crawl', crawl_hands_knees: 'crawl',
  low_crawl: 'belly_crawl', commando_crawl: 'belly_crawl', army_crawl: 'belly_crawl', slither: 'belly_crawl', crawl_belly: 'belly_crawl',
  surgery: 'operate', operating: 'operate', surgeon: 'operate', perform_surgery: 'operate', suture: 'operate',
  climb_into: 'climb_down', descend: 'climb_down', lower_into: 'climb_down', go_down: 'climb_down',
};
export const SPEED = { crawl: 0.35, belly_crawl: 0.22 };
export const MOVING = ['crawl', 'belly_crawl'];
export const FADE = { throw: 0.35, kneel_aim: 0.8, aim_pistol: 0.6 };
export const WHOLE_BODY = ['throw', 'kneel_aim', 'prone', 'crawl', 'belly_crawl', 'operate', 'climb_down'];
export const KEEP_GAIT = new Set(['crawl', 'belly_crawl']);      // at the end of the path they stay down (no blend to standing)

// ── pose helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
const lerp3 = (a, b, w) => [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)];
function mixHand(a, b, w) {
  if (!a || !b || a.space !== b.space || !a.p || !b.p) return w < 0.5 ? a : b;
  return { space: a.space, p: lerp3(a.p, b.p, w), fingers: lerp3(a.fingers || [0, -1, 0], b.fingers || [0, -1, 0], w), palm: lerp3(a.palm || [0, 0, 1], b.palm || [0, 0, 1], w), pole: lerp3(a.pole || [0, -0.4, -1], b.pole || [0, -0.4, -1], w) };
}
const DEFV = { lArmZ: 0.07, rArmZ: -0.07, lElbow: -0.14, rElbow: -0.14, lLegY: 0.06, rLegY: -0.06, lLegZ: 0.015, rLegZ: -0.015 };
function mixP(a, b, w) {
  if (w <= 0) return a; if (w >= 1) return b;
  const out = { ...a };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k], vb = b[k];
    if (typeof va === 'number' || typeof vb === 'number') out[k] = lerp(typeof va === 'number' ? va : (DEFV[k] ?? 0), typeof vb === 'number' ? vb : (DEFV[k] ?? 0), w);
    else if (k === 'lHand' || k === 'rHand') out[k] = va && vb ? mixHand(va, vb, w) : (w < 0.5 ? va : vb);
    else out[k] = w < 0.5 ? (va ?? vb) : (vb ?? va);
  }
  return out;
}
function keysP(keys, u) {                   // [[u, pose], ...] eased per segment
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) if (u <= keys[i + 1][0]) return mixP(keys[i][1], keys[i + 1][1], sm((u - keys[i][0]) / Math.max(1e-6, keys[i + 1][0] - keys[i][0])));
  return keys[keys.length - 1][1];
}
// hand frame for a held prop (the recipe origin in the fist, +Z along the fingers, +Y the thumb side)
function holdProp(A, side, recipe, name) {
  const r = side === 'l' ? 'L' : 'R', s = A.s, bone = A.B['hand' + r];
  const B = buildRecipe(recipe, {});
  B.group.name = 'held:' + name;
  B.group.position.set((r === 'R' ? 0.018 : -0.018) * s, -0.078 * s, 0.014 * s); B.group.rotation.set(PI / 2, 0, 0);
  B.group.traverse((o) => { if (o.isMesh) { o.castShadow = o.name !== 'beam'; o.receiveShadow = true; } });
  bone.add(B.group);
  return B;
}
const STANDP = { lArmZ: 0.08, rArmZ: -0.08, lElbow: -0.16, rElbow: -0.16, weapon: null };
const heldOf = (A, name) => A.fig?.rig?.held?.[name] || null;

// ── the kneel (the rig's crouch: left foot flat, right knee down) ─────────────────────────────────────────────────
const KNEEL = { plant: false, drop: 0.42, lean: 0.14, chestX: 0.06, headX: -0.05, lLeg: -1.55, lKnee: 1.95, lFoot: -0.35, rLeg: -0.45, rKnee: 2.2, rFoot: 0.55, rToe: -0.9 };
// two hands on a pistol at eye height (chest space, unit metres): the right hand grips, the left cups it
const PISTOL2 = {
  rHand: { space: 'chest', p: [-0.05, 0.2, 0.52], fingers: [0.05, 0.02, 1], palm: [1, 0, 0], pole: [-1, -0.8, -0.2] },
  lHand: { space: 'chest', p: [0.0, 0.16, 0.49], fingers: [-0.1, 0.1, 1], palm: [-0.8, 0.5, 0], pole: [1, -0.8, -0.2] },
  rShape: 'grip', lShape: 'grip', headX: 0.08, chestX: -0.02, rFree: true, lFree: true, weapon: null };
// pistol in the right hand, the flashlight in the left, side by side (the tunnel rat's way)
const PISTOL_LIGHT = {
  rHand: { space: 'chest', p: [-0.1, 0.16, 0.5], fingers: [0.02, 0.02, 1], palm: [1, 0, 0], pole: [-1, -0.8, -0.2] },
  lHand: { space: 'chest', p: [0.12, 0.16, 0.48], fingers: [-0.02, 0.02, 1], palm: [-1, 0, 0], pole: [1, -0.8, -0.2] },
  rShape: 'grip', lShape: 'grip', headX: 0.1, rFree: true, lFree: true, weapon: null };
function aimHands(A) {
  const hasL = !!heldOf(A, 'flashlight'), hasP = !!heldOf(A, 'pistol');
  if (hasP && hasL) return PISTOL_LIGHT;
  if (hasP) return PISTOL2;
  if (hasL) return { lHand: PISTOL_LIGHT.lHand, lShape: 'grip', lFree: true };
  return null;
}
// muzzle flash + recoil at the fire times
function muzzle(A) {
  const L = new THREE.PointLight(0xFFC070, 0, 3.5, 2); L.name = 'muzzle_flash'; L.userData.noGovern = true;
  const star = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 5, 2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  star.scale.set(1, 1, 2.6); star.visible = false; star.userData.noQA = true;
  const g = new THREE.Group(); g.add(L, star); A.root.add(g);
  const _p = V3(), _q = new THREE.Quaternion();
  return {
    kick(t, fire) { let k = 0; for (const f of fire) { const x = t - f; if (x >= -0.001 && x < 0.3) k = Math.max(k, Math.exp(-x / 0.06) * (x < 0.02 ? x / 0.02 : 1)); } return k; },
    set(t, fire, at) {
      let fl = 0; for (const f of fire) { const x = t - f; if (x >= 0 && x < 0.07) fl = Math.max(fl, 1 - x / 0.07); }
      L.intensity = 6 * fl; star.visible = fl > 0.02;
      if (at && fl > 0) { at.getWorldPosition(_p); at.getWorldQuaternion(_q); g.position.copy(_p); star.quaternion.copy(_q); star.scale.set(1 + fl, 1 + fl, 2.6 + 2 * fl); }
    },
  };
}

// ── handlers ─────────────────────────────────────────────────────────────────────────────────────────────────────
function kneelAimHandler(A) {
  const { fig, applyPose } = A, mz = muzzle(A);
  return {
    eval(t, q) {
      const fire = (Array.isArray(q.fire) ? q.fire : q.fire != null ? [q.fire] : []).map(Number).filter(Number.isFinite);
      const k = mz.kick(t, fire);
      let p;
      if (fig.armed) p = { ...KNEEL, weapon: 'aim', lShape: 'grip', rShape: 'grip', turn: -0.3, chestY: -0.3, chestX: 0.02, lean: 0.1, headY: 0.5, headX: 0.3 - 0.1 * k, headZ: -0.22 };
      else { const h = aimHands(A) || PISTOL2; p = { ...KNEEL, ...h, lean: 0.08 }; }
      if (k > 0) p = { ...p, chestX: (p.chestX ?? 0) - 0.08 * k, rWristX: -0.5 * k, lWristX: -0.3 * k, spineX: -0.03 * k };
      applyPose(p, null, true, 0);
      const pist = heldOf(A, 'pistol');
      mz.set(t, fire, pist?.anchors?.muzzle || (fig.rig.B.weapon ? fig.rig.B.weapon : null));
    },
  };
}
function aimPistolHandler(A) {
  const { applyPose } = A, mz = muzzle(A);
  return {
    eval(t, q) {
      const fire = (Array.isArray(q.fire) ? q.fire : q.fire != null ? [q.fire] : []).map(Number).filter(Number.isFinite);
      const k = mz.kick(t, fire), h = aimHands(A) || PISTOL2;
      let p = { ...STANDP, ...h, lean: 0.04, lLeg: -0.12, lKnee: 0.12, rLeg: 0.1, lLegY: 0.2, rLegY: -0.3 };
      if (k > 0) p = { ...p, rWristX: -0.55 * k, lWristX: -0.3 * k, chestX: -0.06 * k, headX: (p.headX ?? 0) - 0.04 * k };
      applyPose(p, null, true, 0);
      mz.set(t, fire, heldOf(A, 'pistol')?.anchors?.muzzle || null);
    },
  };
}
// prone: face down on the elbows; the hands ahead (root space: the pelvis sits at the root, the head toward +Z)
const PRONE = { plant: false, drop: 0.86, lean: PI / 2 - 0.02, spineX: -0.12, chestX: -0.34, headX: -0.95, headY: 0,
  lLeg: 0.02, rLeg: 0.02, lKnee: 0.05, rKnee: 0.08, lLegZ: 0.08, rLegZ: -0.08, lLegY: 0.35, rLegY: -0.35, lFoot: 0.6, rFoot: 0.6, lToe: 0.4, rToe: 0.4,
  lHand: { space: 'root', p: [0.14, 0.1, 0.82], fingers: [-0.1, 0.05, 1], palm: [-0.2, -1, 0], pole: [1, -0.6, -0.3] },
  rHand: { space: 'root', p: [-0.14, 0.1, 0.84], fingers: [0.1, 0.05, 1], palm: [0.2, -1, 0], pole: [-1, -0.6, -0.3] },
  lShape: 'soft', rShape: 'soft', weapon: null, armSwing: [0, 0] };
function proneHands(A) {
  const hasL = !!heldOf(A, 'flashlight'), hasP = !!heldOf(A, 'pistol');
  const out = {};
  if (hasP) out.rHand = { space: 'root', p: [-0.12, 0.14, 0.86], fingers: [0.05, 0.08, 1], palm: [1, 0, 0], pole: [-1, -0.6, -0.3] }, out.rShape = 'grip';
  if (hasL) out.lHand = { space: 'root', p: [0.14, 0.14, 0.84], fingers: [-0.05, 0.08, 1], palm: [-1, 0, 0], pole: [1, -0.6, -0.3] }, out.lShape = 'grip';
  return out;
}
function proneHandler(A) {
  const { fig, applyPose, s, state } = A;
  return {
    eval(t, q) {
      state.bodyMid = -0.05 * s;
      const br = 0.012 * Math.sin(TAU * t / 3.6 + A.seedPh);                     // breathing
      let p = { ...PRONE, ...proneHands(A), chestX: PRONE.chestX + br };
      if (fig.armed) p = { ...p, weapon: 'prone', lHand: undefined, rHand: undefined, lShape: 'grip', rShape: 'grip' };
      applyPose(p, null, true, 0);
    },
  };
}
// crawl on hands and knees: body length ~ the pelvis at the root, shoulders ~0.45 ahead. The phase comes from the
// distance travelled: a full cycle = 0.5 m, each limb in stance for half of it (planted: it moves back exactly as the
// body moves forward, so nothing slides), diagonal pairs (left hand + right knee) half a cycle apart
const CRAWL = { plant: false, drop: 0.46, lean: PI / 2 - 0.18, spineX: 0.02, chestX: -0.04, headX: -0.85, lShape: 'flat', rShape: 'flat',
  lLeg: -PI / 2 + 0.12, rLeg: -PI / 2 + 0.12, lKnee: PI / 2 - 0.05, rKnee: PI / 2 - 0.05, lFoot: 0.75, rFoot: 0.75, lToe: 0.3, rToe: 0.3, lLegZ: 0.05, rLegZ: -0.05, weapon: null, armSwing: [0, 0] };
function limb(ph, off, C) {                  // stance/swing offset along +Z (m) and lift, for a limb at phase offset `off`
  const u = (((ph + off) % 1) + 1) % 1;
  if (u < 0.5) return { dz: C / 4 - (u / 0.5) * (C / 2), lift: 0 };            // stance: from +C/4 back to -C/4
  const w = (u - 0.5) / 0.5; return { dz: -C / 4 + sm(w) * (C / 2), lift: Math.sin(PI * w) };
}
function crawlHandler(A) {
  const { fig, applyPose, s, state, o } = A;
  const orig = fig.footContacts; fig.footContacts = () => (state.noFeet ? undefined : orig());
  const C = 0.5;
  return {
    eval(t, q) {
      state.noFeet = true; state.bodyMid = -0.1 * s;
      const dist = o.sAt ? o.sAt(t) : 0, ph = dist / C + (A.seedPh / TAU);
      const lh = limb(ph, 0, C), rh = limb(ph, 0.5, C), lk = limb(ph, 0.5, C), rk = limb(ph, 0, C);
      const hl = proneHands(A);
      const handP = (x, L, held) => ({ space: 'root', p: [x, 0.03 + 0.07 * L.lift + (held ? 0.04 : 0), 0.5 / s + L.dz / s], fingers: held ? [0, 0.1, 1] : [0, -0.35, 1], palm: held ? [-Math.sign(x), -0.3, 0] : [0, -1, 0.1], pole: [Math.sign(x) * 0.6, 0.2, -1] });
      const p = { ...CRAWL,
        lHand: handP(0.16, lh, !!hl.lHand), rHand: handP(-0.16, rh, !!hl.rHand), lShape: hl.lHand ? 'grip' : 'flat', rShape: hl.rHand ? 'grip' : 'flat',
        lLeg: CRAWL.lLeg - Math.asin(clamp(lk.dz / 0.42, -0.6, 0.6)) - 0.12 * lk.lift, rLeg: CRAWL.rLeg - Math.asin(clamp(rk.dz / 0.42, -0.6, 0.6)) - 0.12 * rk.lift,
        lKnee: CRAWL.lKnee + 0.1 * lk.lift, rKnee: CRAWL.rKnee + 0.1 * rk.lift,
        chestY: 0.06 * Math.sin(TAU * ph), spineZ: 0.04 * Math.sin(TAU * ph), headY: -0.05 * Math.sin(TAU * ph) };
      applyPose(p, null, true, 0);
    },
    after(t, st) { state.noFeet = st.cur === 'crawl' || st.cur === 'belly_crawl' || (st.prev != null && st.w < 1 && (st.prev === 'crawl' || st.prev === 'belly_crawl')); },
  };
}
// the low crawl: flat, the forearms alternately reach ahead and pull the body, the opposite knee draws up to the side
function bellyHandler(A) {
  const { fig, applyPose, s, state, o } = A;
  const orig = fig.footContacts; fig.footContacts = () => (state.noFeet ? undefined : orig());
  const C = 0.6;
  return {
    eval(t, q) {
      state.noFeet = true; state.bodyMid = -0.05 * s;
      const dist = o.sAt ? o.sAt(t) : 0, ph = dist / C + (A.seedPh / TAU);
      const L = limb(ph, 0, C), Rr = limb(ph, 0.5, C);
      const hl = proneHands(A);
      const handP = (x, Lm, held) => ({ space: 'root', p: [x, 0.07 + 0.06 * Lm.lift + (held ? 0.04 : 0), 0.78 / s + Lm.dz * 1.2 / s], fingers: held ? [0, 0.08, 1] : [0, -0.2, 1], palm: held ? [-Math.sign(x), -0.2, 0] : [0, -1, 0.1], pole: [Math.sign(x), -0.6, -0.3] });
      const wl = 0.5 + 0.5 * Math.sin(TAU * ph), wr = 1 - wl;       // which knee is drawn up
      const p = { ...PRONE, chestX: -0.22, headX: -0.8,
        lHand: handP(0.17, L, !!hl.lHand), rHand: handP(-0.17, Rr, !!hl.rHand), lShape: hl.lHand ? 'grip' : 'soft', rShape: hl.rHand ? 'grip' : 'soft',
        lLegZ: 0.1 + 0.32 * wl, rLegZ: -0.1 - 0.32 * wr, lLeg: 0.04, rLeg: 0.04, lKnee: 0.08 + 0.22 * wl, rKnee: 0.08 + 0.22 * wr,
        lLegY: 0.45, rLegY: -0.45, lFoot: 0.75, rFoot: 0.75, chestY: 0.08 * Math.sin(TAU * ph), turn: 0.05 * Math.sin(TAU * ph) };
      applyPose(p, null, true, 0);
    },
    after(t, st) { state.noFeet = st.cur === 'crawl' || st.cur === 'belly_crawl' || (st.prev != null && st.w < 1 && (st.prev === 'crawl' || st.prev === 'belly_crawl')); },
  };
}
// throw: stand (or kneel) -> wind-up -> release over the shoulder -> follow-through -> ready
function throwKeys(kneel) {
  const low = kneel ? { ...KNEEL, lean: 0.05, chestX: 0.0 } : { lLeg: -0.18, lKnee: 0.16, rLeg: 0.22, rKnee: 0.1, lLegY: 0.25, rLegY: -0.3 };
  return [
    [0.0, { ...STANDP, ...low, rHand: { space: 'chest', p: [-0.12, 0.02, 0.28], fingers: [0.3, 0.6, 0.6], palm: [0.6, 0, -0.5], pole: [-1, -0.6, -0.2] }, rShape: 'grip', rFree: true }],
    [0.42, { ...low, turn: -0.22, chestY: -0.38, lean: kneel ? 0.02 : -0.06, chestX: -0.12, headY: 0.55, headX: -0.08,
      rHand: { space: 'chest', p: [-0.38, 0.32, -0.2], fingers: [-0.2, 0.6, -0.7], palm: [0.6, 0.2, 0.5], pole: [-1, -0.8, 0.3] }, rShape: 'grip',
      lArmX: -1.35, lArmZ: 0.12, lElbow: -0.2, lShape: 'flat', rFree: true }],
    [0.62, { ...low, turn: 0.1, chestY: 0.18, lean: kneel ? 0.18 : 0.14, chestX: 0.1, headY: -0.1, headX: -0.02,
      rHand: { space: 'chest', p: [-0.12, 0.42, 0.42], fingers: [0.1, 0.9, 0.5], palm: [0.4, 0.3, 0.8], pole: [-1, -0.5, -0.5] }, rShape: 'soft',
      lArmX: -0.6, lArmZ: 0.25, lElbow: -0.9, lShape: 'soft', rFree: true }],
    [0.82, { ...low, turn: 0.16, chestY: 0.28, lean: kneel ? 0.25 : 0.22, chestX: 0.16, headY: -0.3, headX: 0.05,
      rHand: { space: 'chest', p: [0.12, -0.12, 0.42], fingers: [0.3, -0.7, 0.6], palm: [-0.3, -0.4, 0.8], pole: [-1, -0.2, -0.6] }, rShape: 'relaxed',
      lArmX: -0.2, lArmZ: 0.2, lElbow: -0.6, lShape: 'soft', rFree: true }],
    [1.0, { ...STANDP, ...low, lean: kneel ? 0.12 : 0.05, headX: 0.05, lShape: 'soft', rShape: 'soft', rFree: true,
      rHand: { space: 'chest', p: [-0.2, -0.36, 0.08], fingers: [0.05, -1, 0.1], palm: [1, 0, 0], pole: [-1, -0.3, -0.5] } }],
  ];
}
function throwHandler(A) {
  const { fig, applyPose, s, B, ctx, G, now } = A;
  const gHand = holdProp(A, 'r', PRESETS.grenade, 'grenade');
  const fly = buildRecipe(PRESETS.grenade, {}); fly.group.name = 'grenade_thrown'; fly.group.visible = false; A.root.add(fly.group);
  fly.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let blast = null, plan = null;
  const _p = V3();
  function planOf(q) {
    const t0 = q.__t0 ?? 0, dur = num(q.throw_dur, 1.25), tr = num(q.t_release, t0 + 0.62 * dur);
    // the release point: the right hand over the shoulder (root space) -> world, from where the figure stands
    const c = Math.cos(now.yaw), sn = Math.sin(now.yaw), rel = [-0.12 * s, (q.kneel ? 1.2 : 1.72) * s, 0.28 * s];
    const P0 = V3(now.x + rel[0] * c + rel[2] * sn, now.y + rel[1], now.z - rel[0] * sn + rel[2] * c);
    let tx, tz;
    if (Array.isArray(q.target) && q.target.length >= 2) { tx = +q.target[0]; tz = +q.target[q.target.length === 3 ? 2 : 1]; }
    else { const d = num(q.distance, 9); tx = now.x + Math.sin(now.yaw) * d; tz = now.z + Math.cos(now.yaw) * d; }
    const ty = G.h(tx, tz) + 0.04, dist = Math.hypot(tx - P0.x, tz - P0.z);
    const T = clamp(0.45 + 0.1 * dist, 0.6, 1.8), g = 9.81;
    const v = V3((tx - P0.x) / T, (ty - P0.y + 0.5 * g * T * T) / T, (tz - P0.z) / T);
    const roll = V3(v.x, 0, v.z).normalize().multiplyScalar(Math.min(1.6, 0.18 * Math.hypot(v.x, v.z)));
    const tb = tr + T + num(q.fuse, 0.9);
    return { t0, dur, tr, T, P0, v, g, roll, land: V3(tx, ty, tz), tb, size: num(q.size ?? q.blast_size, 1) };
  }
  return {
    eval(t, q) {
      if (!plan) { plan = planOf(q); blast = makeBlast(ctx, { t: plan.tb, pos: [plan.land.x + plan.roll.x * 0.25, plan.land.y, plan.land.z + plan.roll.z * 0.25], size: plan.size, surface: q.surface }); A.root.add(blast.root); }
      const u = clamp((t - plan.t0) / plan.dur);
      applyPose(keysP(throwKeys(!!q.kneel), u), null, true, 0);
    },
    after(t, st) {
      if (!plan) { gHand.group.visible = false; return; }
      const active = st.cur === 'throw' || (st.prev === 'throw' && st.w < 1);
      gHand.group.visible = active && t < plan.tr && (st.cur === 'throw' ? st.w > 0.6 : true);
      const x = t - plan.tr;
      if (x >= 0 && t < plan.tb) {
        fly.group.visible = true;
        if (x <= plan.T) { _p.copy(plan.P0).addScaledVector(plan.v, x); _p.y -= 0.5 * plan.g * x * x; fly.group.rotation.set(-9 * x, 0, 2.5 * x); }
        else { const y = x - plan.T, k = 1 - Math.exp(-y / 0.18); _p.copy(plan.land).addScaledVector(plan.roll, 0.25 * k); fly.group.rotation.set(-9 * plan.T - 6 * k, 0, 2.5 * plan.T); }
        fly.group.position.copy(_p);
      } else fly.group.visible = false;
      if (blast) blast.update(t, t, (typeof window !== 'undefined' && window.__f3d) ? window.__f3d.camera : null);
    },
  };
}
// operate: standing at the table, leaning in, both gloved hands over the patient, small strokes
function operateHandler(A) {
  const { fig, applyPose, s, item } = A;
  const P0 = { ...(item.params || {}), ...item };
  const tool = String(P0.tool ?? 'scalpel');
  const held = tool !== 'none' && (tool === 'forceps' ? PRESETS.forceps : PRESETS.scalpel) ? holdProp(A, 'r', tool === 'forceps' ? PRESETS.forceps : PRESETS.scalpel, tool) : null;
  return {
    eval(t, q) {
      const th = num(q.table_h, 0.92), reach = num(q.reach, 0.42), ph = A.seedPh;
      const y = (th + 0.1) / s, z = reach / s;
      const st1 = Math.sin(TAU * t / 1.7 + ph), st2 = Math.sin(TAU * t / 0.9 + ph * 1.7);
      const p = { ...STANDP, lean: 0.3, spineX: 0.12, chestX: 0.16, headX: 0.45, headY: 0.05 * Math.sin(TAU * t / 4 + ph),
        lLeg: -0.34, rLeg: -0.26, lKnee: 0.08, rKnee: 0.06, lLegY: 0.15, rLegY: -0.15,
        rHand: { space: 'root', p: [-0.07 + 0.025 * st1, y + 0.012 * Math.max(0, st2), z + 0.03 * st1], fingers: [0.35, -0.75, 0.55], palm: [0.6, 0.1, -0.2], pole: [-1, -0.2, -0.6] },
        lHand: { space: 'root', p: [0.12, y + 0.015, z - 0.02 + 0.01 * st2], fingers: [-0.3, -0.8, 0.5], palm: [-0.5, -0.3, -0.3], pole: [1, -0.2, -0.6] },
        rShape: held ? 'grip' : 'pinch', lShape: 'pinch', rFree: true, lFree: true, weapon: null };
      applyPose(p, null, true, 0);
    },
    after(t, st) { if (held) held.group.visible = st.cur === 'operate' || (st.prev === 'operate' && st.w < 0.5); },
  };
}
// climb down a ladder / into a hole: the body sinks by `depth`; the hands stay on the rim as long as they can
function climbHandler(A) {
  const { applyPose, s, state, o } = A;
  A.fig.group.traverse((m) => { if (m.isMesh) m.renderOrder = -3; });     // hole.js: drawn with the shaft, so the body shows inside the opening
  return {
    eval(t, q) {
      const t0 = q.__t0 ?? 0, dur = Math.max(0.5, num(q.climb_dur ?? q.dur_climb, 2.6)), depth = num(q.depth, 1.6);
      const u = clamp((t - t0) / dur), dy = depth * sm(u);
      const step = Math.sin(TAU * u * 3);
      const rimY = 0.03 / s;                                   // the rim = the ground at the root (only the pelvis sinks)
      const hands = u < 0.7;
      const p = { plant: false, drop: dy / s, lean: 0.12, chestX: 0.05, headX: u < 0.5 ? 0.35 : -0.2, weapon: null,
        lLeg: -0.5 - 0.35 * Math.max(0, step), rLeg: -0.5 - 0.35 * Math.max(0, -step), lKnee: 0.9 + 0.6 * Math.max(0, step), rKnee: 0.9 + 0.6 * Math.max(0, -step),
        lHand: hands ? { space: 'root', p: [0.24, rimY, 0.3], fingers: [0, -0.1, 1], palm: [0, -1, 0], pole: [1, -1, 0] } : undefined,
        rHand: hands ? { space: 'root', p: [-0.24, rimY, 0.3], fingers: [0, -0.1, 1], palm: [0, -1, 0], pole: [-1, -1, 0] } : undefined,
        lShape: 'grip', rShape: 'grip', lArmX: hands ? 0 : -2.6, rArmX: hands ? 0 : -2.6, lElbow: -0.5, rElbow: -0.5 };
      applyPose(p, null, false, 0);
      state.sink = dy;
    },
  };
}
export const BUILD = {
  throw: throwHandler, kneel_aim: kneelAimHandler, aim_pistol: aimPistolHandler, prone: proneHandler, crawl: crawlHandler, belly_crawl: bellyHandler,
  operate: operateHandler, climb_down: climbHandler,
};
