// actions_v3.js — Legion 3D v3 figure actions (WP5; V3_SPEC 2.5). Hooked into actions.js exactly like actions_sp.js
// (its ACTIONS / ALIAS / SPEED / MOVING / FADE / BUILD tables), so they work for cast figures and figure.person; the
// same poses drive the flying para.jumper (lib/v3/para.js imports POSE_V3 / mixPose from here).
//   freefall       static-line free fall: upright, feet first, legs together, knees a little bent, toes pointed, both
//                  hands on the harness at the stomach, a slow wobble. params: elev (m above the ground, default 0)
//   tumble         the exit tumble: limbs thrown out by the slipstream, flailing; the whole body turns over about the
//                  pelvis (spin rev/s, default 0.6). params: elev, spin
//   hang           under the canopy: both hands up on the front risers, legs together and a little forward, swinging
//                  gently (sway 0..1). params: elev, sway, look 'down'|'up'
//   sit_bench      seated on a bench or a fuselage seat WITHOUT a chair: seat_h (m, default 0.42), hands on the thighs,
//                  head a little down; the shins reach the floor (feet flat) or dangle above a high seat. elev: the
//                  floor is that high above the terrain (a fuselage floor, a stage); back (m): the seat is that far
//                  behind `at` (use 0.3 with a solid prop bench: the placement check sees a standing body at `at`)
//   hatch_sit      on the floor at the rim of the "Joe hole", legs dangling into the hatch, hands on the floor beside
//                  the hips, looking down through the hole; `at` 7 cm back from the rim, facing the hole. elev: the floor's
//                  height above the surface he stands on (0 on a prop floor: the engine already stands him on it)
//   hatch_jump     from the hatch sit: the hands push off, the body straightens to attention (feet together, arms at
//                  the sides) and drops through the hole (gravity; drop m, default 2.6), hidden below (hide true)
//   aim_pistol_2h  standing, the pistol held out in both hands at eye height, arms nearly straight (isosceles), head on
//                  the sights; fire [t, ...] gives recoil + a muzzle flash (needs the pistol accessory for the gun)
// Every pose is a pure function of t; every change eases (cast.js cross-fades, FADE below); nothing snaps.
import * as THREE from 'three';
import { clamp, lerp } from '../shared/util.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);

export const ACTIONS = ['freefall', 'tumble', 'hang', 'sit_bench', 'hatch_sit', 'hatch_jump', 'aim_pistol_2h'];
// only names no other table uses (actions.js spreads this ALIAS last: a duplicate key would steal an old alias)
export const ALIAS = {
  free_fall: 'freefall', freefalling: 'freefall', static_line_fall: 'freefall', paratrooper_fall: 'freefall',
  tumbling: 'tumble', exit_tumble: 'tumble', somersault: 'tumble',
  under_canopy: 'hang', hang_canopy: 'hang', canopy_hang: 'hang', parachute_hang: 'hang', parachute_descent: 'hang',
  bench: 'sit_bench', sit_on_bench: 'sit_bench', bench_sit: 'sit_bench', seat_bench: 'sit_bench',
  sit_hatch: 'hatch_sit', hatch_edge: 'hatch_sit', sit_at_hatch: 'hatch_sit',
  jump_hatch: 'hatch_jump', exit_hatch: 'hatch_jump', hatch_exit: 'hatch_jump', jump_out: 'hatch_jump',
  aim_pistol_two_hand: 'aim_pistol_2h', aim_pistol_two_handed: 'aim_pistol_2h', pistol_2h: 'aim_pistol_2h', two_hand_pistol: 'aim_pistol_2h',
};
export const SPEED = {};
export const MOVING = [];
export const FADE = { freefall: 0.5, tumble: 0.3, hang: 0.8, sit_bench: 0.9, hatch_sit: 0.9, hatch_jump: 0.25, aim_pistol_2h: 0.6 };
export const WHOLE_BODY = ['freefall', 'tumble', 'hang', 'sit_bench', 'hatch_sit', 'hatch_jump'];
export const ARM = ['aim_pistol_2h'];
export const KEEP_GAIT = new Set();
// the placement posture of each v3 action for core/qa.js resolveFigures (cast.js placement() maps only sit / sit_ground /
// kneel today: until the lead wires X.V3_POSTURE in, a solid bench under sit_bench needs params.back >= 0.3)
export const POSTURE = { sit_bench: 'sit', hatch_sit: 'sit_ground', hatch_jump: 'sit_ground' };

// ── pose mixing (IK hand specs are blended when both sides are in the same space) ──────────────────────────────────
const DEFV = { lArmZ: 0.07, rArmZ: -0.07, lElbow: -0.14, rElbow: -0.14, lLegY: 0.06, rLegY: -0.06, lLegZ: 0.015, rLegZ: -0.015 };
const lerp3 = (a, b, w) => [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)];
function mixHand(a, b, w) {
  if (!a || !b || a.space !== b.space || !a.p || !b.p) return w < 0.5 ? a : b;
  return { space: a.space, p: lerp3(a.p, b.p, w), fingers: lerp3(a.fingers || [0, -1, 0], b.fingers || [0, -1, 0], w), palm: lerp3(a.palm || [0, 0, 1], b.palm || [0, 0, 1], w), pole: lerp3(a.pole || [0, -0.4, -1], b.pole || [0, -0.4, -1], w) };
}
export function mixPose(a, b, w) {
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
const wob = (t, ph, f, a) => a * Math.sin(TAU * f * t + ph);

// ── the poses (rig conventions: negative X = limb forward; elbows negative, knees positive; foot + = toes down) ────
// both hands on the harness at the stomach (chest space, reference metres), palms in, elbows out a little
const HANDS_STOMACH = {
  lHand: { space: 'chest', p: [0.075, -0.19, 0.205], fingers: [-0.8, -0.15, 0.45], palm: [-0.35, 0.05, -0.95], pole: [1, -0.35, -0.45] },
  rHand: { space: 'chest', p: [-0.075, -0.19, 0.205], fingers: [0.8, -0.15, 0.45], palm: [0.35, 0.05, -0.95], pole: [-1, -0.35, -0.45] },
  lShape: 'grip', rShape: 'grip',
};
const FREEFALL = { plant: false, weapon: null, armSwing: [0, 0], lean: 0.02, spineX: 0.04, chestX: 0.05, headX: 0.2, lShrug: 0.05, rShrug: 0.05,
  lLeg: -0.22, rLeg: -0.17, lKnee: 0.34, rKnee: 0.28, lLegY: 0.03, rLegY: -0.03, lLegZ: -0.032, rLegZ: 0.032, lFoot: 0.5, rFoot: 0.46, ...HANDS_STOMACH };
const TUMBLE = { plant: false, weapon: null, armSwing: [0, 0], lean: -0.12, spineX: -0.14, chestX: -0.12, headX: -0.3,
  lArmZ: 1.35, rArmZ: -1.25, lArmX: -0.45, rArmX: -0.2, lElbow: -0.55, rElbow: -0.8, lShape: 'soft', rShape: 'soft',
  lLeg: -0.55, rLeg: 0.18, lKnee: 0.95, rKnee: 0.5, lLegZ: 0.16, rLegZ: -0.2, lFoot: 0.3, rFoot: 0.45 };
// hands up on the front risers: the fist round a strap rising from the shoulder (fingers up the strap, palm forward-in)
const HANG = { plant: false, weapon: null, armSwing: [0, 0], lean: 0.0, spineX: 0.02, chestX: -0.05, headX: 0.12, lShrug: 0.22, rShrug: 0.22,
  // the front risers run from the shoulders (x 0.125, chest-space y 0.2) to the links 0.62 m up at x 0.2, z 0.1 (para.js
  // RT): the fists close round them above the helmet's brim line, forward of it, elbows out and forward (a V, not
  // hands-on-head)
  lHand: { space: 'chest', p: [0.178, 0.6, 0.1], fingers: [0.06, 1, 0.08], palm: [-0.8, 0.0, 0.6], pole: [1, -0.4, 0.5] },
  rHand: { space: 'chest', p: [-0.178, 0.6, 0.1], fingers: [-0.06, 1, 0.08], palm: [0.8, 0.0, 0.6], pole: [-1, -0.4, 0.5] },
  lShape: 'grip', rShape: 'grip',
  lLeg: -0.22, rLeg: -0.17, lKnee: 0.32, rKnee: 0.28, lLegY: 0.03, rLegY: -0.03, lLegZ: -0.03, rLegZ: 0.03, lFoot: 0.4, rFoot: 0.36 };
// sitting ON the rim, the legs hanging down into the hole: `at` = 7 cm back from the rim on the floor (the root stays on the
// floor; the pelvis sits 0.07 m forward of it, over the edge), facing the hole; the thighs 35 deg forward of vertical, the
// shins straight down, the hands flat on the floor beside and a little behind the hips
const HATCH_SIT = { plant: false, weapon: null, armSwing: [0, 0], drop: 0.835, fwd: 0.07, lean: 0.16, spineX: 0.06, chestX: 0.08, headX: 0.42,
  lLeg: -0.62, rLeg: -0.57, lKnee: 0.6, rKnee: 0.54, lLegY: 0.06, rLegY: -0.06, lLegZ: 0.02, rLegZ: -0.02, lFoot: 0.3, rFoot: 0.32,
  lHand: { space: 'root', p: [0.25, 0.06, -0.07], fingers: [0.15, -0.1, 1], palm: [0, -1, 0], pole: [0.6, 0.1, -1] },
  rHand: { space: 'root', p: [-0.25, 0.06, -0.07], fingers: [-0.15, -0.1, 1], palm: [0, -1, 0], pole: [-0.6, 0.1, -1] },
  lShape: 'flat', rShape: 'flat' };
// attention for the exit: straight body, feet together, toes down, arms tight at the sides, chin in
const ATTENTION_EXIT = { plant: false, weapon: null, armSwing: [0, 0], lean: 0.0, spineX: 0.0, chestX: -0.02, headX: 0.22,
  lArmZ: 0.035, rArmZ: -0.035, lArmX: 0.02, rArmX: 0.02, lElbow: -0.06, rElbow: -0.06, lShape: 'fist', rShape: 'fist',
  lLeg: -0.02, rLeg: -0.02, lKnee: 0.06, rKnee: 0.06, lLegY: 0.02, rLegY: -0.02, lLegZ: -0.03, rLegZ: 0.03, lFoot: 0.42, rFoot: 0.42 };
const AIM2H = { weapon: null, lean: 0.05, spineX: 0.02, chestX: 0.02, headX: 0.12, headY: 0.0,
  rHand: { space: 'chest', p: [-0.035, 0.175, 0.5], fingers: [0.04, 0.02, 1], palm: [1, 0, 0], pole: [-1, -0.8, -0.2] },
  lHand: { space: 'chest', p: [0.01, 0.135, 0.47], fingers: [-0.18, 0.12, 1], palm: [-0.84, 0.48, 0], pole: [1, -0.8, -0.2] },
  rShape: 'grip', lShape: 'grip', rFree: true, lFree: true,
  lLeg: -0.16, lKnee: 0.16, rLeg: 0.12, rKnee: 0.08, lLegY: 0.25, rLegY: -0.35, lLegZ: 0.05, rLegZ: -0.06 };

// sitting with the buttocks on a seat seat_h m high (figure scale s): the hip joint 0.09 m above the seat, the thighs
// level, the shins down to the floor (tilted forward when the seat is low, hanging when it is high), the feet flat
// back (m): the hip sits that far BEHIND the figure's `at` point (its feet stay near `at`), so a bench that is a solid prop
// can stand behind the placement point (core/qa.js moves a standing-posture figure out of solids; see POSTURE below)
function sitBenchPose(seatH, s = 1, back = 0) {
  const hip = seatH / s + 0.09, knee = hip - 0.415 * Math.cos(1.5), b = back / s;
  const phi = knee >= 0.51 ? 0 : Math.acos(clamp(knee / 0.51, 0, 1));
  return { plant: false, weapon: null, armSwing: [0, 0], drop: 0.925 - hip, fwd: -b, lean: 0.06, spineX: 0.07, chestX: 0.09, headX: 0.22,
    lLeg: -1.5, rLeg: -1.47, lKnee: 1.5 - phi, rKnee: 1.47 - phi, lFoot: phi, rFoot: phi, lLegY: 0.12, rLegY: -0.12, lLegZ: 0.04, rLegZ: -0.04,
    lHand: { space: 'root', p: [0.15, hip + 0.105, 0.3 - b], fingers: [-0.1, -0.15, 1], palm: [0, -1, 0.1], pole: [0.8, -0.4, -0.5] },
    rHand: { space: 'root', p: [-0.15, hip + 0.105, 0.3 - b], fingers: [0.1, -0.15, 1], palm: [0, -1, 0.1], pole: [-0.8, -0.4, -0.5] },
    lShape: 'soft', rShape: 'soft' };
}
// the exit from the hatch: u s since the start. 0..0.3 the hands push the body up and forward, then attention
// The pelvis never climbs: the hands lift it 6 cm off the rim while it slides forward over the hole (fwd 0.3 m), then
// the body straightens DOWNWARD into the hole: hatchJumpComp(u) is the pelvis rise the straightening would cause (the sit
// drop going to 0), which the handler (and para.js) take off the figure's height, so the feet sink through the hole.
const EXIT_FWD = 0.45;
function hatchJumpPose(u) {
  const push = sm(u / 0.22), straighten = smr((u - 0.12) / 0.38), slide = smr(u / 0.45);
  const fw = HATCH_SIT.fwd + EXIT_FWD * slide;
  const sitP = { ...HATCH_SIT, drop: HATCH_SIT.drop - 0.06 * push, fwd: fw, lean: HATCH_SIT.lean - 0.1 * push, headX: HATCH_SIT.headX - 0.12 * push };
  return mixPose(sitP, { ...ATTENTION_EXIT, fwd: fw }, straighten);
}
export function hatchJumpComp(u) {
  const push = sm(u / 0.22), straighten = smr((u - 0.12) / 0.38);
  const sitDrop = HATCH_SIT.drop - 0.06 * push;
  return sitDrop - lerp(sitDrop, 0, straighten);      // reference metres (x figure scale)
}

// pose dicts at time t for a phase offset ph (radians, per figure); o: per-action params
export const POSE_V3 = {
  freefall(t, ph = 0, o = {}) {
    const k = o.wobble ?? 1;
    return { ...FREEFALL,
      lLeg: FREEFALL.lLeg + wob(t, ph, 0.45, 0.05 * k), rLeg: FREEFALL.rLeg + wob(t, ph + 1.9, 0.45, 0.05 * k),
      lKnee: FREEFALL.lKnee + wob(t, ph + 0.7, 0.6, 0.05 * k), rKnee: FREEFALL.rKnee + wob(t, ph + 2.4, 0.6, 0.05 * k),
      headX: FREEFALL.headX + wob(t, ph + 0.3, 0.3, 0.06 * k), headY: wob(t, ph + 1.1, 0.21, 0.15 * k), chestX: FREEFALL.chestX + wob(t, ph, 0.5, 0.02 * k) };
  },
  tumble(t, ph = 0, o = {}) {
    const k = o.flail ?? 1;
    return { ...TUMBLE,
      lArmZ: TUMBLE.lArmZ + wob(t, ph, 1.3, 0.35 * k), rArmZ: TUMBLE.rArmZ + wob(t, ph + 2, 1.1, 0.35 * k),
      lArmX: TUMBLE.lArmX + wob(t, ph + 1, 0.9, 0.4 * k), rArmX: TUMBLE.rArmX + wob(t, ph + 3, 1.2, 0.4 * k),
      lElbow: TUMBLE.lElbow + wob(t, ph + 0.5, 1.4, 0.3 * k), rElbow: TUMBLE.rElbow + wob(t, ph + 1.5, 1.2, 0.3 * k),
      lLeg: TUMBLE.lLeg + wob(t, ph + 2.2, 0.8, 0.35 * k), rLeg: TUMBLE.rLeg + wob(t, ph + 0.4, 0.95, 0.35 * k),
      lKnee: TUMBLE.lKnee + wob(t, ph + 1.7, 1.0, 0.3 * k), rKnee: TUMBLE.rKnee + wob(t, ph + 2.9, 0.85, 0.3 * k),
      headX: TUMBLE.headX + wob(t, ph, 0.7, 0.15 * k) };
  },
  hang(t, ph = 0, o = {}) {
    const sw = o.sway ?? 1, T = 3.1, a = Math.sin(TAU * t / T + ph);
    const look = o.look === 'up' ? -0.55 : o.look === 'ahead' ? -0.05 : HANG.headX;
    return { ...HANG, headX: look + wob(t, ph + 0.4, 0.13, 0.08), headY: wob(t, ph + 2.1, 0.09, 0.3),
      lLeg: HANG.lLeg + 0.07 * sw * a, rLeg: HANG.rLeg + 0.07 * sw * Math.sin(TAU * t / T + ph + 0.35),
      lKnee: HANG.lKnee + 0.05 * sw * Math.max(0, a), rKnee: HANG.rKnee + 0.05 * sw * Math.max(0, -a),
      chestX: HANG.chestX + 0.015 * Math.sin(TAU * t / 4.2 + ph) };
  },
  hatch_sit(t, ph = 0) { return { ...HATCH_SIT, chestX: HATCH_SIT.chestX + 0.015 * Math.sin(TAU * t / 3.8 + ph), headY: wob(t, ph, 0.11, 0.12) }; },
  hatch_jump(u) { return hatchJumpPose(u); },
  attention_exit() { return { ...ATTENTION_EXIT }; },
  sit_bench(t, ph = 0, o = {}) { const p = sitBenchPose(num(o.seat_h, 0.42), o.s ?? 1, num(o.back, 0)); return { ...p, chestX: p.chestX + 0.014 * Math.sin(TAU * t / 4.1 + ph), headY: wob(t, ph, 0.1, 0.15) }; },
  aim_pistol_2h() { return { ...AIM2H }; },
};

// ── handlers (actions.js attach(): A = { fig, item, ctx, now, root, G, s, B, state, applyPose, paramsOf, seedPh, ... }) ──
const heldOf = (A, name) => A.fig?.rig?.held?.[name] || null;
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
// in the air / under the canopy / dropping: the figure group is lifted (elev) or lowered (drop) in after(); the tumble
// turns the group about the pelvis. state.v3 remembers which v3 action set the floor, so a later action can release it.
function airAfter(A, name, extra) {
  const { fig, G, state, paramsOf } = A, _pl = V3(), _q = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _qx = new THREE.Quaternion();
  return (t, st) => {
    const w = st.cur === name ? (st.prev != null && st.w < 1 ? st.w : 1) : st.prev === name && st.w < 1 ? 1 - st.w : 0;
    if (w <= 0) { if (state.v3 === name) { state.floor = null; state.v3 = null; } return; }
    const q = paramsOf(name, t), g = fig.group.position;
    const ex = extra ? extra(t, q, w) : { lift: 0, spin: 0, hide: false };
    state.floor = G.h(g.x, g.z) + (num(q.elev, 0) + ex.lift) * w; state.v3 = name;
    if (ex.hide != null) state.hide = ex.hide ? true : (state.hide === true && state.v3hid ? false : state.hide);
    state.v3hid = !!ex.hide;
    if (ex.spin) {
      // rotate about the pelvis (not the feet): keep the pelvis where the unrotated figure has it
      const yaw = fig.group.rotation.y, B = fig.rig.B;
      _pl.copy(B.pelvis.position);
      _qy.setFromAxisAngle(V3(0, 1, 0), yaw); _qx.setFromAxisAngle(V3(1, 0, 0), ex.spin * w);
      _q.copy(_qy).multiply(_qx);
      const a = _pl.clone().applyQuaternion(_qy), b = _pl.clone().applyQuaternion(_q);
      fig.group.quaternion.copy(_q);
      state.v3shift = [a.x - b.x, a.y - b.y, a.z - b.z];
      g.x += a.x - b.x; g.z += a.z - b.z; state.floor += a.y - b.y;
    }
  };
}
function freefallHandler(A) {
  return { eval(t, q) { A.applyPose(POSE_V3.freefall(t, A.seedPh, { wobble: num(q.wobble, 1) }), null, false); }, after: airAfter(A, 'freefall') };
}
function tumbleHandler(A) {
  return {
    eval(t, q) { A.applyPose(POSE_V3.tumble(t, A.seedPh, { flail: num(q.flail, 1) }), null, false); },
    after: airAfter(A, 'tumble', (t, q) => { const t0 = q.__t0 ?? 0, sp = num(q.spin, 0.6); const u = Math.max(0, t - t0); return { lift: 0, spin: TAU * sp * (u - 0.4 * (1 - Math.exp(-u / 0.4))) }; }),
  };
}
function hangHandler(A) {
  return { eval(t, q) { A.applyPose(POSE_V3.hang(t, A.seedPh, { sway: num(q.sway, 1), look: q.look }), null, false); }, after: airAfter(A, 'hang') };
}
function sitBenchHandler(A) {
  return { eval(t, q) { A.applyPose(POSE_V3.sit_bench(t, A.seedPh, { seat_h: q.seat_h, back: q.back, s: A.s }), null, false); }, after: airAfter(A, 'sit_bench') };
}
function hatchSitHandler(A) {
  return { eval(t) { A.applyPose(POSE_V3.hatch_sit(t, A.seedPh), null, false); }, after: airAfter(A, 'hatch_sit') };
}
function hatchJumpHandler(A) {
  return {
    eval(t, q) { A.applyPose(POSE_V3.hatch_jump(Math.max(0, t - (q.__t0 ?? 0))), null, false); },
    after: airAfter(A, 'hatch_jump', (t, q) => {
      const u = Math.max(0, t - (q.__t0 ?? 0)), uf = Math.max(0, u - 0.24), depth = num(q.drop, 2.6);
      const d = Math.min(depth, 0.5 * 9.81 * uf * uf);
      return { lift: -d - hatchJumpComp(u) * A.s, spin: 0, hide: q.hide !== false && d >= depth - 1e-3 };
    }),
  };
}
function aim2hHandler(A) {
  const mz = muzzle(A);
  return {
    eval(t, q) {
      const fire = (Array.isArray(q.fire) ? q.fire : q.fire != null ? [q.fire] : []).map(Number).filter(Number.isFinite);
      const k = mz.kick(t, fire);
      let p = POSE_V3.aim_pistol_2h();
      if (heldOf(A, 'flashlight') && !heldOf(A, 'pistol')) p = { ...p, rHand: undefined, rFree: false };
      if (k > 0) p = { ...p, rWristX: -0.55 * k, lWristX: -0.32 * k, chestX: (p.chestX ?? 0) - 0.06 * k, headX: (p.headX ?? 0) - 0.04 * k };
      A.applyPose(p, null, true, 0);
      mz.set(t, fire, heldOf(A, 'pistol')?.anchors?.muzzle || null);
    },
  };
}
export const BUILD = {
  freefall: freefallHandler, tumble: tumbleHandler, hang: hangHandler, sit_bench: sitBenchHandler,
  hatch_sit: hatchSitHandler, hatch_jump: hatchJumpHandler, aim_pistol_2h: aim2hHandler,
};
