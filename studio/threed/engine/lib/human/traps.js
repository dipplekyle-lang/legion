// traps.js — GENERIC TRAPS that animate on a cue time (E1 specificity kit, 2026-09-29). Everything is a pure function of t.
//   trap.punji_pit      a camouflaged pit: a real hole in the ground (hole.js), its floor bristling with sharpened bamboo
//                       stakes with dark tips; the cover of thin slats and leaves gives way at `t` and falls in
//   trap.punji_wall     chest-level punji stakes: a stake-studded board hinged on a tunnel wall / tree line that swings
//                       out at `t` (or is already out: t < 0), stakes at chest height pointing along `heading`
//   trap.tripwire       a wire across a trail at ankle height between two pegs, tied to a grenade in a can (or under a
//                       trapdoor: behind "trapdoor"); at `t` the wire is tripped, the grenade jerks out and goes off
//                       `fuse` s later (fx.grenade_blast)
//   trap.bamboo_whip    a bent bamboo pole with foot-long stakes lashed to its end, cocked back along the trail side;
//                       released at `t` it whips across the trail at chest height (a sprung pole: overshoot, rebound)
//   trap.spiked_mace    a 40-lb spiked ball (a mud-packed ball studded with bamboo spikes) on a rope from a tree limb,
//                       released at `t`: it swings down at head height (a pendulum)
//   trap.bamboo_viper   a bright green bamboo viper tethered by its tail to a bamboo stick in the tunnel roof or a branch,
//                       coiled; it strikes at `t` toward `target` (a lunge with an S-curve body, jaws open)
//   interior.water_lock a crawlway that dips into a flooded U-bend: the floor runs down into black still water that fills
//                       the passage to the roof (pitch dark like interior.crawl_tunnel)
// All take at [x, z], heading (deg: the side the trap faces / the trail direction), t (s: the trigger) and are film-ready at
// eye level; hazards read best with a close shot before the trigger and a wider one through it.
import * as THREE from 'three';
import { plain } from '../shared/materials.js';
import { ground, xz, yawFromHeading, patchAll } from './common.js';
import { buildRecipe, PRESETS } from './propbuild.js';
import { makeBlast } from './blast.js';
import { pitShell, holeMask, drawUnder, UNDER } from './hole.js';
import { crawlTunnel } from './tunnels.js';
import { clamp, lerp } from '../shared/util.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const M = {};
function mat(k) {
  if (M[k]) return M[k];
  const P = { earth: { color: 0x5A4330, roughness: 1 }, dark: { color: 0x2A2018, roughness: 1 }, bamboo: { color: 0x9E8C58, roughness: 0.6 }, tip: { color: 0x2E2418, roughness: 0.8 },
    wire: { color: 0x9A9A96, roughness: 0.4, metalness: 0.8 }, leaf: { color: 0x5E5230, roughness: 0.9, side: THREE.DoubleSide }, snake: { color: 0x5FA83A, roughness: 0.45 }, belly: { color: 0xB8D070, roughness: 0.5 },
    eye: { color: 0xE8C020, roughness: 0.2, emissive: 0x302000, emissiveIntensity: 0.4 }, mouth: { color: 0xE8A0A0, roughness: 0.5 }, can: { color: 0x7A6A4A, roughness: 0.5, metalness: 0.6 },
    water: { color: 0x0A0C0A, roughness: 0.06, metalness: 0.0 } }[k];
  return (M[k] = plain({ ...P }));
}
function stakes(n, w, d, h, seed, tipDark = true) {
  const G = new THREE.Group();
  const g = new THREE.ConeGeometry(0.018, h, 6); g.translate(0, h / 2, 0);
  const im = new THREE.InstancedMesh(g, mat('bamboo'), n), M4 = new THREE.Matrix4();
  const tg = new THREE.ConeGeometry(0.006, h * 0.22, 6); tg.translate(0, h * 0.89, 0);
  const tips = tipDark ? new THREE.InstancedMesh(tg, mat('tip'), n) : null;
  for (let i = 0; i < n; i++) {
    const x = (hash(i, seed) - 0.5) * w, z = (hash(i, seed + 1) - 0.5) * d, s = 0.75 + 0.5 * hash(i, seed + 2);
    M4.compose(V3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(i, seed + 3) - 0.5) * 0.35, hash(i, seed + 4) * TAU, (hash(i, seed + 5) - 0.5) * 0.35)), V3(1, s, 1));
    im.setMatrixAt(i, M4); if (tips) tips.setMatrixAt(i, M4);
  }
  im.castShadow = true; im.receiveShadow = true; G.add(im); if (tips) G.add(tips);
  return G;
}

// ── punji pit ──────────────────────────────────────────────────────────────────────────────────────────────────
function punjiPit(ctx, P, root) {
  const w = num(P.width, 1.0), d = num(P.length, 1.5), depth = num(P.depth, 1.2), t0 = P.t == null ? null : num(P.t, 1);
  const G = new THREE.Group();
  const pit = pitShell({ w, d, depth, mat: mat('earth') }); G.add(pit.group);
  const st = stakes(Math.round(num(P.stakes, 46)), w - 0.12, d - 0.12, num(P.stake_h, 0.42), 7); st.position.y = -depth; drawUnder(st); G.add(st);
  // the cover: a lattice of thin slats + leaf litter over the opening; it sags and drops in at t
  const cover = new THREE.Group(); G.add(cover);
  const sl = buildRecipe({ parts: [{ shape: 'pole', from: [-w / 2 - 0.08, 0, 0], to: [w / 2 + 0.08, 0, 0], r: 0.01, mat: 'bamboo', nodes: 0, repeat: { n: 8, step: [0, 0, (d + 0.1) / 7] }, pos: [0, 0.012, -(d + 0.1) / 2] }] }, {});
  cover.add(sl.group);
  const leafG = new THREE.CircleGeometry(0.05, 7); leafG.scale(1, 0.5, 1); leafG.rotateX(-PI / 2);
  const nl = 260, leaves = new THREE.InstancedMesh(leafG, mat('leaf'), nl), col = new THREE.Color(), M4 = new THREE.Matrix4();
  for (let k = 0; k < nl; k++) { M4.compose(V3((hash(k, 3) - 0.5) * (w + 0.2), 0.03 + 0.01 * hash(k, 5), (hash(k, 4) - 0.5) * (d + 0.2)), new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(k, 6) - 0.5) * 0.3, hash(k, 7) * TAU, 0)), V3(1 + hash(k, 9), 1, 1 + hash(k, 9))); leaves.setMatrixAt(k, M4); col.setHSL(0.07 + 0.14 * hash(k, 10), 0.4, 0.14 + 0.16 * hash(k, 11)); leaves.setColorAt(k, col); }
  leaves.castShadow = true; leaves.receiveShadow = true; cover.add(leaves);
  const mask = holeMask(pit.outline, 0.015); G.add(mask);
  root.add(G);
  const show = P.cover === false || P.cover === 'none';
  return (t) => {
    if (show) { cover.visible = false; return; }
    if (t0 == null) { cover.position.y = 0; cover.rotation.set(0, 0, 0); cover.visible = true; return; }
    const x = t - t0;
    if (x < 0) { cover.position.y = -0.03 * sm((x + 0.4) / 0.4); cover.rotation.set(0, 0, 0); cover.visible = true; return; }
    const y = -0.5 * 9.81 * x * x; cover.position.y = Math.max(-depth + 0.35, y); cover.rotation.set(0.35 * sm(x / 0.4), 0, -0.2 * sm(x / 0.4));
    cover.visible = true; drawUnder(cover);
    mask.visible = true;
  };
}
// ── chest-level stakes on a hinged board ─────────────────────────────────────────────────────────────────────────
function punjiWall(ctx, P, root) {
  const hgt = num(P.height, 1.25), W = num(P.width, 0.8), H = num(P.board_h, 0.6), t0 = P.t == null ? -1 : num(P.t, 1);
  const G = new THREE.Group(); root.add(G);
  // a mud wall / tree-line backing (the trap sits in a tunnel wall or a hedge): a rough earth slab
  const back = buildRecipe({ parts: [{ shape: 'box', size: [W + 0.9, hgt + H / 2 + 0.6, 0.35], bevel: 0.06, mat: 'earth', color: '#5A4330', pos: [0, (hgt + H / 2 + 0.6) / 2, -0.25] }] }, {});
  G.add(back.group);
  const hinge = new THREE.Group(); hinge.position.set(0, hgt - H / 2, -0.05); G.add(hinge);
  const board = buildRecipe({ parts: [
    { shape: 'box', size: [W, H, 0.04], mat: 'wood', color: '#5A4632', pos: [0, H / 2, 0] },
    { shape: 'spike', r: 0.013, h: 0.3, mat: 'bamboo', rot: [90, 0, 0], grid: { n: [6, 4], step: [W / 6, H / 4.2] }, pos: [0, H / 2, 0.02], jitter: { pos: 0.01, rot: 6, seed: 5 } },
  ] }, {});
  hinge.add(board.group);
  return (t) => {
    // folded flat against the wall (stakes pointing up), then swings out and down to horizontal stakes at chest height
    const x = t - t0;
    const a = t0 < 0 ? 0 : x <= 0 ? -PI / 2 : -PI / 2 * (1 - sm(x / 0.18)) + 0.12 * Math.exp(-6 * x) * Math.sin(28 * x) * sm(x / 0.18);
    hinge.rotation.x = a;
  };
}
// ── tripwire + grenade ────────────────────────────────────────────────────────────────────────────────────────────
function tripwire(ctx, P, root) {
  const span = num(P.span, 1.6), hw = num(P.wire_h, 0.14), t0 = P.t == null ? null : num(P.t, 1.5), fuse = num(P.fuse, 0.7);
  const G = new THREE.Group(); root.add(G);
  const pegs = buildRecipe({ parts: [
    { shape: 'pole', from: [-span / 2, -0.12, 0], to: [-span / 2, hw + 0.08, 0], r: 0.015, mat: 'wood', nodes: 0 },
    { shape: 'pole', from: [span / 2, -0.12, 0], to: [span / 2, hw + 0.08, 0], r: 0.015, mat: 'wood', nodes: 0 },
    { shape: 'cylinder', r: 0.04, h: 0.12, mat: 'rust', pos: [span / 2 + 0.06, 0.06, 0.02] },                                  // the can
  ] }, {});
  G.add(pegs.group);
  const gren = buildRecipe(PRESETS.grenade, {}); gren.group.position.set(span / 2 + 0.06, 0.1, 0.02); G.add(gren.group);
  // the wire: a thin tube, taut; tripped it pulls toward the trail side
  const wm = new THREE.MeshLambertMaterial({ color: 0xA8A8A0 });
  let wire = null;
  const setWire = (bow) => {
    if (wire) { wire.geometry.dispose(); G.remove(wire); }
    const pts = [V3(-span / 2, hw, 0), V3(0, hw - 0.01, bow), V3(span / 2, hw, 0), V3(span / 2 + 0.06, 0.13, 0.02)];
    wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 24, 0.0012, 4), wm); G.add(wire);
  };
  setWire(0);
  let blast = null, lastBow = 0;
  if (t0 != null) { blast = makeBlast(ctx, { t: t0 + fuse, size: num(P.size, 1), follow: gren.group, hide: gren.group, surface: P.surface }); (ctx.scene || root).add(blast.root); }
  return (t, clock, camera) => {
    if (t0 != null) {
      const x = t - t0, bow = x < 0 ? 0 : 0.25 * sm(x / 0.12) * (1 - 0.3 * sm((x - 0.12) / 0.3));
      if (Math.abs(bow - lastBow) > 1e-4 || !wire) { setWire(bow); lastBow = bow; }
      // the grenade is jerked out of its can toward the wire
      const k = x < 0 ? 0 : sm(x / 0.25);
      gren.group.position.set(span / 2 + 0.06 - 0.35 * k, 0.1 + 0.08 * Math.sin(PI * k) - 0.07 * k, 0.02 + 0.1 * k);
      gren.group.rotation.set(2.5 * k, 0, 1.2 * k);
      if (blast) blast.update(t, clock, camera);
    }
  };
}
// ── bamboo whip ──────────────────────────────────────────────────────────────────────────────────────────────────
function bambooWhip(ctx, P, root) {
  const L = num(P.length, 2.2), hgt = num(P.height, 1.25), t0 = P.t == null ? null : num(P.t, 1.2);
  const G = new THREE.Group(); root.add(G);
  // the anchor post on the trail side (x = -0.9); the whip pivots on it and sweeps across +X at chest height
  const post = buildRecipe({ parts: [
    { shape: 'pole', from: [0, 0, 0], to: [0, hgt + 0.35, 0], r: 0.06, mat: 'dark_wood', nodes: 0 },
    { shape: 'torus', r: 0.07, tube: 0.012, axis: 'y', mat: 'rope', pos: [0, hgt, 0] },
  ] }, {});
  post.group.position.set(-0.9, 0, 0); G.add(post.group);
  const arm = new THREE.Group(); arm.position.set(-0.9, hgt, 0); G.add(arm);
  const whip = buildRecipe({ parts: [
    { shape: 'pole', from: [0, 0, 0], to: [L, 0.05, 0], r: 0.035, mat: 'bamboo' },
    { shape: 'spike', r: 0.012, h: 0.3, mat: 'bamboo', color: '#B8A26A', rot: [-90, 0, 0], repeat: { n: 5, step: [0.12, 0, 0] }, pos: [L - 0.62, 0.05, 0.03] },
    { shape: 'spike', r: 0.012, h: 0.3, mat: 'bamboo', color: '#B8A26A', rot: [-90, 0, 0], repeat: { n: 4, step: [0.12, 0, 0] }, pos: [L - 0.56, -0.05, 0.03] },
    { shape: 'torus', r: 0.04, tube: 0.008, axis: 'x', mat: 'rope', repeat: { n: 3, step: [0.25, 0, 0] }, pos: [L - 0.65, 0.02, 0] },
  ] }, {});
  arm.add(whip.group);
  // the cocking cord to a peg behind (visible until the release)
  const cord = buildRecipe({ parts: [{ shape: 'rope', from: [-0.9, hgt, 0], to: [-0.9 + 0.3, 0.1, -1.4], sag: 0.05, r: 0.004, mat: 'rope' }] }, {}); G.add(cord.group);
  return (t) => {
    const x = t0 == null ? -1 : t - t0;
    // cocked: swung back along the trail edge (-110 deg about Y); released: a sprung pole snapping through the trail
    const from = -105, to = 0, f = 1.6, damp = 3.2;
    const ang = x <= 0 ? from : to + (from - to) * Math.exp(-damp * x) * Math.cos(TAU * f * x);
    arm.rotation.y = -ang * PI / 180;
    cord.group.visible = x <= 0;
  };
}
// ── bamboo viper ─────────────────────────────────────────────────────────────────────────────────────────────────
function viper(ctx, P, root) {
  const t0 = P.t == null ? null : num(P.t, 1.5), L = num(P.length, 0.62), hang = num(P.hang, 1.3);
  const G = new THREE.Group(); root.add(G);
  // the tether: a bamboo stick overhead (a tunnel roof or a branch) + a string round the tail
  const stick = buildRecipe({ parts: [{ shape: 'pole', from: [-0.5, hang + 0.35, 0], to: [0.5, hang + 0.35, 0], r: 0.02, mat: 'bamboo' }, { shape: 'rope', from: [0, hang + 0.35, 0], to: [0, hang + 0.12, 0], sag: 0, r: 0.003, mat: 'rope' }] }, {});
  G.add(stick.group);
  const tx = Array.isArray(P.target) ? P.target : null;
  const body = new THREE.Mesh(new THREE.BufferGeometry(), mat('snake')); body.castShadow = true; G.add(body);
  const head = new THREE.Group(); G.add(head);
  const hg = new THREE.SphereGeometry(0.022, 14, 10); hg.scale(1.1, 0.7, 1.6);
  head.add(new THREE.Mesh(hg, mat('snake')));
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8, 0, TAU, PI / 2, PI / 2).scale(1.05, 0.5, 1.5), mat('mouth')); jaw.position.set(0, -0.006, 0.006); head.add(jaw);
  for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), mat('eye')); e.position.set(s * 0.017, 0.007, 0.012); head.add(e); }
  head.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const N = 40, spine = Array.from({ length: N + 1 }, () => V3());
  function pose(t) {
    // the tail hangs from the string at (0, hang + 0.12, 0); the body coils down in an S; the strike: the front third
    // straightens and lunges forward (+Z) 0.35 m and back, jaws opening
    const x = t0 == null ? -1 : t - t0, k = x < 0 ? 0 : x < 0.14 ? sm(x / 0.14) : x < 0.5 ? 1 - 0.6 * sm((x - 0.14) / 0.36) : 0.4;
    const idle = 0.02 * Math.sin(t * 2.3);
    for (let i = 0; i <= N; i++) {
      const u = i / N;                                        // 0 tail .. 1 head
      const sway = Math.sin(u * 7 + t * 1.6) * 0.035 * (1 - k * u);
      const y = hang + 0.12 - u * 0.28 - 0.1 * Math.sin(u * PI) + idle * u;
      const z = 0.08 * Math.sin(u * 4.2) * (1 - k) + k * Math.max(0, u - 0.55) / 0.45 * 0.38;
      spine[i].set(sway + 0.06 * Math.sin(u * 5.5) * (1 - k * u), y + k * 0.1 * Math.max(0, u - 0.6), z);
    }
    const curve = new THREE.CatmullRomCurve3(spine);
    const g = new THREE.TubeGeometry(curve, 60, 1, 8, false), Pp = g.attributes.position, cen = new THREE.Vector3();
    // taper: thin tail, thicker middle, a neck before the head
    const segs = 61, ring = 9;
    for (let i = 0; i < segs; i++) { const u = i / (segs - 1), r = 0.005 + 0.014 * Math.sin(Math.min(1, u * 1.15) * PI * 0.92) * (u > 0.93 ? 0.8 : 1); curve.getPointAt(u, cen); for (let j = 0; j < ring; j++) { const idx = i * ring + j; const v = V3(Pp.getX(idx), Pp.getY(idx), Pp.getZ(idx)).sub(cen); v.setLength(r); Pp.setXYZ(idx, cen.x + v.x, cen.y + v.y, cen.z + v.z); } }
    g.computeVertexNormals();
    body.geometry.dispose(); body.geometry = g;
    const pH = spine[N], pN = spine[N - 2]; head.position.copy(pH); head.lookAt(pH.clone().add(pH.clone().sub(pN)));
    jaw.rotation.x = 0.7 * (x > 0.05 && x < 0.5 ? sm((x - 0.05) / 0.08) * (1 - sm((x - 0.3) / 0.2)) : 0);
  }
  return pose;
}
// ── water lock: a crawlway that dips into a flooded U-bend ─────────────────────────────────────────────────────────
function waterLock(ctx, P, root) {
  const L = num(P.length, 8), dip = num(P.dip, 1.1), Hh = num(P.height, 0.8);
  const T = crawlTunnel({ ...P, length: L, height: Hh, curve: 0.03, dip, roots: 0.6 });
  root.add(T.group);
  // below the floor of the world: the tube draws first and a cover over its footprint keeps the world's floor out (hole.js)
  drawUnder(T.group);
  root.add(holeMask([[-0.6, 0.2], [0.6, 0.2], [0.6, L - 0.2], [-0.6, L - 0.2]], -0.012));
  // the water fills the dip to above the roof at its lowest point: a black still surface with a faint sheen
  const wl = -dip + Hh + 0.08, span = L * 0.46;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1.2, span, 4, 16).rotateX(-PI / 2), mat('water'));
  water.position.set(0, wl, L / 2); water.receiveShadow = true; water.name = 'water_lock'; water.renderOrder = UNDER; root.add(water);
  return (t) => { water.position.y = wl + 0.004 * Math.sin(t * 1.3); };
}

export const CATALOG = {
  'trap.punji_pit': { desc: 'a camouflaged PUNJI PIT: a real hole in the ground (any world) 1.0 x 1.5 m, 1.2 m deep, its floor bristling with sharpened bamboo stakes with dark tips; covered by thin slats and leaf litter that give way at `t` and fall in (omit t = covered; cover false = open)', params: { at: '[x, z]', heading: 'deg', t: 's: the cover collapses', width: 'm (1.0)', length: 'm (1.5)', depth: 'm (1.2)', stakes: 'n (46)', cover: 'true|false' }, footprint: [1.2, 1.7], height: 0.05, contact: false, tags: ['trap', 'punji', 'pit', 'stakes', 'bamboo', 'hole', 'vietnam', 'booby trap', 'hidden'] },
  'trap.punji_wall': { desc: 'CHEST-LEVEL PUNJI STAKES: a stake-studded board hinged on an earth wall (a tunnel wall, a hedge) that swings out at `t` so the sharpened stakes point along `heading` at chest height (t < 0 or omitted: already out)', params: { at: '[x, z]', heading: 'deg: the stakes point that way', t: 's: it swings out', height: 'm (1.25) chest height', width: 'm (0.8)' }, footprint: [1.7, 0.6], height: 2, tags: ['trap', 'punji', 'stakes', 'chest', 'wall', 'bamboo', 'booby trap', 'tunnel'] },
  'trap.tripwire': { desc: 'a GRENADE TRIPWIRE: a thin wire across the trail at ankle height between two pegs, tied to a grenade in a rusty can; at `t` the wire is tripped (it bows and jerks the grenade out) and the grenade goes off `fuse` s later (fx.grenade_blast)', params: { at: '[x, z] the wire middle', heading: 'deg: the trail direction (the wire runs across it)', t: 's: tripped', fuse: 's (0.7)', span: 'm (1.6)', wire_h: 'm (0.14)', size: 'blast (1)' }, footprint: [1.8, 0.3], height: 0.25, tags: ['trap', 'tripwire', 'grenade', 'wire', 'booby trap', 'explosive'] },
  'trap.bamboo_whip': { desc: 'a SPRING-LOADED BAMBOO WHIP: a bent bamboo pole with foot-long stakes lashed to its end, cocked back along the trail edge on a post; released at `t` it whips across the trail at chest height (overshoot and rebound)', params: { at: '[x, z] where it strikes', heading: 'deg: the trail direction', t: 's: released', length: 'm (2.2)', height: 'm (1.25)' }, footprint: [2.5, 2.5], height: 1.7, tags: ['trap', 'bamboo', 'whip', 'spring', 'stakes', 'booby trap', 'jungle'] },
  'trap.spiked_mace': { desc: 'the 40-lb SPIKED MACE: a mud-packed ball studded with bamboo spikes on a rope from a tree limb (its own tree), held up in the canopy and released at `t`: it swings down through head height (a pendulum)', params: { at: '[x, z] the tree', heading: 'deg: it swings across that way', t: 's: released' }, footprint: [2, 1.5], height: 4.3, tags: ['trap', 'mace', 'spikes', 'ball', 'tree', 'booby trap', 'jungle'] },
  'trap.bamboo_viper': { desc: 'a BAMBOO VIPER tethered by its tail: a bright green snake hanging from a string on a bamboo stick (a tunnel roof, a branch), coiling; it strikes at `t` (the front of the body straightens and lunges forward, jaws open). Film it close (0.6-1.2 m)', params: { at: '[x, z]', heading: 'deg: it strikes that way', t: 's: the strike', hang: 'm: the head height (1.3; 0.55 in a crawlway)', length: 'm (0.62)' }, footprint: [0.4, 0.4], height: 1.7, tags: ['trap', 'snake', 'viper', 'bamboo viper', 'venomous', 'tethered', 'tunnel', 'booby trap'] },
  'interior.water_lock': { desc: 'a WATER LOCK: a crawlway (0.8 m high, red clay) whose floor dips into a flooded U-bend: black still water fills the passage to the roof (you must dive under). Pitch dark like interior.crawl_tunnel (light it with a flashlight)', params: { at: '[x, z] the entrance end', heading: 'deg', length: 'm (8)', dip: 'm (1.1)', dark: 'true' }, footprint: [0.9, 8], height: 0.9, tags: ['interior', 'tunnel', 'water', 'flooded', 'trap', 'drown', 'u-bend', 'cu chi'] },
};

export async function build(kind, item = {}, ctx = {}) {
  const Gd = ground(ctx), at = xz(item.at), y = Gd.h(at[0], at[1]);
  const root = new THREE.Group(); root.name = kind; root.position.set(at[0], y, at[1]);
  root.rotation.y = yawFromHeading(item.heading ?? 180);
  const P = { ...item };
  let upd = () => {}, radius = 1, height = 1, anchors = {};
  if (kind === 'trap.punji_pit') { upd = punjiPit(ctx, P, root); radius = 0.9; height = 0.05; }
  else if (kind === 'trap.punji_wall') { upd = punjiWall(ctx, P, root); radius = 0.9; height = 1.8; }
  else if (kind === 'trap.tripwire') { upd = tripwire(ctx, P, root); radius = 0.9; height = 0.2; }
  else if (kind === 'trap.bamboo_whip') { upd = bambooWhip(ctx, P, root); radius = 1.4; height = 1.6; }
  else if (kind === 'trap.spiked_mace') {
    const B = buildRecipe({ ...PRESETS.spiked_mace, anim: [{ part: 'mace', type: 'pendulum', axis: 'x', from: 85, length: 1.5, t: P.t == null ? 1e9 : num(P.t, 1), damp: 0.5 }] }, {});
    root.add(B.group); upd = (t) => B.update(t); radius = 1.4; height = 4.3; anchors = { ball: B.anchors.ball, branch: B.anchors.branch };
  }
  else if (kind === 'trap.bamboo_viper') { upd = viper(ctx, P, root); radius = 0.4; height = num(P.hang, 1.3) + 0.4; }
  else if (kind === 'interior.water_lock') { upd = waterLock(ctx, P, root); radius = 4; height = 0.9; }
  upd(0);
  patchAll(root, ctx);
  const res = { root, radius, height, anchors: { ...anchors, center: root }, update: (t, c, cam) => upd(t, c, cam), contact: kind === 'trap.punji_pit' || kind === 'trap.tripwire' ? false : undefined };
  if (kind === 'interior.water_lock') { res.interior = true; res.pitchDark = P.dark !== false; }
  return res;
}
