// blast.js — fx.grenade_blast: a hand grenade / small charge going off (E1 specificity kit, 2026-09-29).
// Real frag grenades are not movie fireballs: a hard white-orange flash (1-2 frames), a crack of hot sparks and
// fragments, a burst of dirt and grey-brown dust thrown up and out, then a drifting dust-and-smoke cloud; a scorch on
// the ground. Lit billows (lib/fx billow machinery), grit (clods), sparks, a flash light, a scorch decal.
//   { "kind": "fx.grenade_blast", "at": [x, z], "t": 1.6, "size": 1, "surface": "dirt|grass|mud|floor|water" }
// makeBlast(ctx, {t, size, pos}) is used by prop.grenade (explode) and by the figure's throw action.
import * as THREE from 'three';
import { makePuffs, makeGrit, makeSparks, syncEnv } from '../fx/f_common.js';
import { ground, xz, patchAll } from './common.js';
import { clamp, lerp } from '../shared/util.js';

const TAU = Math.PI * 2;
const hf = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const TINTS = { dirt: [0.47, 0.41, 0.34], grass: [0.45, 0.42, 0.36], mud: [0.36, 0.31, 0.26], floor: [0.55, 0.53, 0.5], water: [0.72, 0.74, 0.76], sand: [0.62, 0.55, 0.44] };

let SCORCH = null;
function scorchTex() {
  if (SCORCH) return SCORCH;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i++) { const a = hf(i, 3) * TAU, r = 20 + hf(i, 4) * 40; g.fillStyle = `rgba(0,0,0,${0.15 + 0.2 * hf(i, 5)})`; g.beginPath(); g.ellipse(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + 5 * hf(i, 6), 1 + 2 * hf(i, 7), a, 0, TAU); g.fill(); }
  SCORCH = new THREE.CanvasTexture(c); return SCORCH;
}

// o: {t, size, pos [x, y, z] (world; else the follow object's position at t), follow (Object3D), hide (Object3D scaled to 0 at t), surface}
export function makeBlast(ctx, o = {}) {
  const T = num(o.t, 1), K = clamp(num(o.size, 1), 0.3, 4), tint = TINTS[o.surface] || TINTS.dirt, G = ground(ctx);
  const root = new THREE.Group(); root.name = 'fx.grenade_blast'; root.userData.noQA = true;
  const dust = makePuffs(ctx, { count: 360, tint, near: 0.5, groundFade: 0.12, softK: 0.35, name: 'blast.dust' });   // E5: finer, denser dust (was 180)
  const fire = makePuffs(ctx, { count: 24, mode: 'add', tint: [1.0, 0.62, 0.25], near: 0.3, name: 'blast.fire' });
  const grit = makeGrit(ctx, { count: 260, maxPx: 6, minPx: 1.3, name: 'blast.grit' });
  const sparks = makeSparks(ctx, { count: 160, maxPx: 4, minPx: 1.2, name: 'blast.sparks' });
  root.add(dust.mesh, fire.mesh, grit.mesh, sparks.mesh);
  const light = new THREE.PointLight(0xFFB870, 0, 9 * K, 2); light.name = 'blast_flash'; light.userData.noGovern = true; root.add(light);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.6 * K, 2.6 * K).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: scorchTex(), transparent: true, depthWrite: false, opacity: 0 }));
  sc.renderOrder = 3; sc.userData.noQA = true; sc.name = 'scorch'; root.add(sc);
  patchAll(sc, ctx);
  const P = new THREE.Vector3();
  let fixed = Array.isArray(o.pos) ? new THREE.Vector3(+o.pos[0], +o.pos[1], +o.pos[2]) : null;
  const where = () => { if (fixed) return fixed; if (o.follow) { o.follow.updateMatrixWorld(true); o.follow.getWorldPosition(P); return P; } return P.set(0, 0, 0); };
  function update(t, clock, camera) {
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;   // puffs sort toward the lens
    syncEnv(ctx);
    const x = t - T;
    // the grenade itself: gone at the detonation
    if (o.hide) { o.hide.visible = x < 0; }
    if (x < -0.001) { light.intensity = 0; dust.begin(); dust.end(camera); fire.begin(); fire.end(camera); grit.begin(); grit.end(); sparks.begin(); sparks.end(); sc.material.opacity = 0; return; }
    if (!fixed) { const w = where(); fixed = w.clone(); }
    const c = fixed, gy = G.h(c.x, c.z);
    root.position.set(c.x, 0, c.z);                        // children use (local x, world y, local z)
    const by = Math.max(gy, c.y);
    // flash: a hard peak over ~2 frames, a short orange tail
    light.position.set(0, by + 0.5 * K, 0);
    light.intensity = (x < 0.03 ? 420 * sm(x / 0.01) : 420 * Math.exp(-(x - 0.03) / 0.05)) * K * K;
    // fireball core: a short additive burst
    fire.begin();
    if (x < 0.35) for (let i = 0; i < 16; i++) {
      const a = hf(i, 1) * TAU, e = hf(i, 2) * 1.2, r = (0.25 + 0.55 * hf(i, 3)) * K * sm(x / 0.06), sz = (0.35 + 0.3 * hf(i, 4)) * K * (0.6 + 1.2 * sm(x / 0.08));
      fire.push(Math.cos(a) * Math.cos(e) * r, by + 0.25 * K + Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r, sz * 0.7, hf(i, 5) * 6, 0.55 * (1 - sm(x / 0.22)), i & 3, gy, 1, 1, 1, 0, 0, 1, hf(i, 6));   // additive: (alb, glow, heat) = the rgb gain
    }
    fire.end(camera);
    // dust + smoke: a burst up and out, slowing, growing, drifting downwind, thinning
    dust.begin();
    const wx = ctx.wind ? ctx.wind.x * 0.06 : 0.2, wz = ctx.wind ? ctx.wind.z * 0.06 : 0;
    for (let i = 0; i < 280; i++) {                      // E5: twice the billows at ~70 % the size: one cloud, not lumps
      const a = hf(i, 11) * TAU, up = Math.pow(hf(i, 12), 1.3), v0 = (2.2 + 5 * hf(i, 13)) * K, tau = 0.3 + 0.25 * hf(i, 14);
      const d = v0 * tau * (1 - Math.exp(-x / tau));
      const hr = d * Math.sqrt(1 - up * up) * (0.45 + 0.55 * hf(i, 15)), hv = d * up * (0.8 + 0.5 * hf(i, 16));
      const drift = Math.max(0, x - 0.6);
      const X = Math.cos(a) * hr + wx * drift, Z = Math.sin(a) * hr + wz * drift, Y = by + 0.15 * K + hv + 0.08 * drift * K;
      const size = (0.23 + 0.21 * hf(i, 17)) * K * (0.6 + 1.0 * sm(x / 0.8) + 0.12 * drift);
      const al = (0.42 + 0.22 * hf(i, 18)) * sm(x / 0.05) * (1 - sm((x - 2.5 - 2 * hf(i, 19)) / 3.5));
      const dark = x < 0.5 ? 0.62 : 0.8;                  // fresh blast smoke is darker at the core
      dust.push(X, Math.max(Y, gy + size * 0.4), Z, size, hf(i, 20) * 6.28 + 0.1 * x, al, i & 3, gy, dark + 0.2 * hf(i, 21), x < 0.12 ? 0.8 * (1 - x / 0.12) : 0, 0, 0.1 * up, clamp(0.25 + x * 0.12), clamp(0.55 + 0.4 * up), hf(i, 22), 0.35);
    }
    // the ground ring: a low skirt of dust racing out
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU + hf(i, 31) * 0.2, r = 3.2 * K * (1 - Math.exp(-x / 0.25)) * (0.55 + 0.45 * hf(i, 32));
      const size = (0.35 + 0.25 * hf(i, 33)) * K * (1 + 0.8 * sm(x / 1.2));
      dust.push(Math.cos(a) * r + wx * x * 0.5, gy + size * 0.35, Math.sin(a) * r + wz * x * 0.5, size, hf(i, 34) * 6, 0.3 * sm(x / 0.08) * (1 - sm((x - 0.8) / 2.0)), i & 3, gy, 0.85, 0, 0, 0, 0.55, 0.9, hf(i, 35), 0.5);
    }
    dust.end(camera);
    // clods and grit: ballistic, they land and lie
    grit.begin();
    for (let i = 0; i < 240; i++) {
      const a = hf(i, 41) * TAU, el = 0.35 + 1.0 * hf(i, 42), sp = (5 + 12 * Math.pow(hf(i, 43), 1.4)) * Math.sqrt(K);
      const vy = Math.sin(el) * sp, vh = Math.cos(el) * sp, land = 2 * vy / 9.81;
      const tt = Math.min(x, land), y = x >= land ? 0.02 : vy * tt - 4.9 * tt * tt, h = vh * tt;
      if (x > land + 3) continue;
      grit.push(Math.cos(a) * h, gy + 0.1 + y, Math.sin(a) * h, tint[0] * 0.7, tint[1] * 0.7, tint[2] * 0.7, (0.012 + 0.04 * hf(i, 44)) * K);
    }
    grit.end();
    // sparks: hot fragments, a fraction of a second
    sparks.begin();
    if (x < 0.4) for (let i = 0; i < 140; i++) {
      const a = hf(i, 51) * TAU, el = -0.1 + 0.9 * hf(i, 52), sp = 25 + 35 * hf(i, 53), life = 0.08 + 0.25 * hf(i, 54);
      if (x > life) continue;
      const d = sp * x, k = 1 - x / life;
      sparks.push(Math.cos(a) * Math.cos(el) * d, by + 0.2 + Math.sin(el) * d - 4.9 * x * x, Math.sin(a) * Math.cos(el) * d, 3.2 * k, 2.2 * k, 1.0 * k, 0.04);
    }
    sparks.end();
    sc.position.set(0, gy + 0.03, 0); sc.material.opacity = 0.75 * sm(x / 0.15);
  }
  return { root, update, t: T };
}

export const CATALOG = {
  'fx.grenade_blast': {
    desc: 'a hand grenade / small charge going off at `t`: a hard white-orange flash (a light that lights the scene for 2 frames), hot sparks and fragments, a burst of dirt thrown up and out, a grey-brown dust-and-smoke cloud that drifts downwind, a scorch on the ground. The figure action "throw" makes its own blast where the grenade lands; prop.grenade explode: t makes one at the grenade; trap.tripwire uses it too',
    params: { at: '[x, z]', t: 's: the detonation', size: '0.3..4 (1 = a frag grenade, 2.5 = a satchel charge / mine)', surface: 'dirt|grass|mud|sand|floor|water (dust colour)', elev: 'm above the ground (on a table, in a tunnel)' },
    footprint: [4, 4], height: 3, contact: false, tags: ['fx', 'explosion', 'blast', 'grenade', 'bomb', 'mine', 'detonation', 'boom', 'trap'],
  },
};
export async function build(kind, item = {}, ctx = {}) {
  const at = xz(item.at), G = ground(ctx), P = item.params || {};
  const y = G.h(at[0], at[1]) + num(item.elev ?? P.elev, 0);
  const tt = num(item.t ?? (typeof P.t === 'number' ? P.t : null), 1.5);
  const size = num(item.size ?? (typeof P.size === 'number' ? P.size : null), 1);
  const surface = typeof item.surface === 'string' ? item.surface : 'dirt';
  const bl = makeBlast(ctx, { t: tt, size, pos: [at[0], y, at[1]], surface });
  bl.root.position.set(at[0], 0, at[1]);
  return { root: bl.root, radius: 3 * size, height: 3 * size, update: (t, c, cam) => bl.update(t, c, cam), anchors: {}, contact: false, snapped: true, blast: bl };
}
