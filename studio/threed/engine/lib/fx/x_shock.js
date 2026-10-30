// x_shock.js — E5 (explosions kit, 30 Sep 2026): what reaches YOU at the stage.
//   fx.shock_front  the blast wave arriving at the stage from a far explosion: a wall of dust sweeping across the ground
//                   from `from` (compass deg towards ground zero), trees bending away from it (snapping when strong),
//                   leaves, twigs, paper and grit flying, dust hanging after it. Pair with cast struck_fall at t_arrive,
//                   fx.window_blast (t_hit = t_arrive) and a camera shake.
//   fx.heat_flash   the thermal pulse: a blinding light from the fireball's direction, long hard shadows, the sky
//                   whitening, surfaces facing it smoking and dry leaves catching fire; YOU shield the eyes (look_up
//                   shade / shield_face) and the silhouette burns bright against it.
import * as THREE from 'three';
import { makeCPuffs, maskProxy, glow, burstLight, num, clamp, lerp, sstep, hf, bbody, DEG } from './x_common.js';
import { syncEnv, makeSparks, makeGrit, makeFlames } from './f_common.js';
import { U } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';
import { build as buildFlora } from '../nature/flora.js';

const TAU = Math.PI * 2;
// compass deg -> unit vector on the ground (x east, z south: compass 0 = -z)
const dirOf = (deg) => [Math.sin(deg * DEG), -Math.cos(deg * DEG)];

async function buildShockFront(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.shock_front']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.shock_front'; root.position.set(at[0], 0, at[1]);
  const from = num(p.from, 0), [fx, fz] = dirOf(from);                     // unit vector from the stage towards ground zero
  const tA = num(p.t_arrive ?? p.t, 2), S = clamp(num(p.strength, 1), 0.2, 2.5), V = num(p.speed, 380 + 120 * S);
  const Rst = num(p.radius, 60);                                            // the dressed area round the stage
  const tint = Array.isArray(p.dust) ? p.dust.map(Number) : String(p.surface || '') === 'snow' ? [0.92, 0.93, 0.96] : String(p.surface || '') === 'sand' ? [0.76, 0.67, 0.53] : [0.63, 0.56, 0.47];
  const H = num(p.height, 6 + 10 * S);                                       // dust wall height (m)
  const P = makeCPuffs(ctx, { count: 2600, near: 1.5, fog: 0.8, groundFade: 0.08, softK: 0.35, order: 10.3, name: 'shock.dust' });
  const GR = makeGrit(ctx, { count: 2200, maxPx: 6, minPx: 1.2, order: 12 });
  root.add(P.mesh, GR.mesh);
  const pxWall = maskProxy('box'); root.add(pxWall);
  // trees on the stage that take the blast: bend away from it and spring back; strength >= 1.5 snaps and flattens them
  const nT = Math.round(clamp(num(p.trees, 10), 0, 40)), trees = [];
  const kinds = String(p.tree || 'deciduous').split('|');
  for (let i = 0; i < nT; i++) {
    const a = hf(i, 3) * TAU, r = Rst * (0.25 + 0.75 * Math.sqrt(hf(i, 4)));
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) < 8) continue;                                      // keep the stage itself clear
    const kind = 'flora.' + kinds[i % kinds.length];
    let tr = null;
    try { tr = await buildFlora(kind, { at: [0, 0], seed: 11 + i * 7, scale: 0.7 + 0.5 * hf(i, 5) }, ctx); } catch (e) { tr = null; }
    if (!tr) continue;
    const g0 = G.height(0, 0), pivot = new THREE.Group(); pivot.position.set(x, G.height(x + at[0], z + at[1]), z);
    tr.root.position.y -= g0; pivot.add(tr.root); root.add(pivot);
    trees.push({ pivot, x, z, h: tr.height || 14, ph: hf(i, 6), snap: S >= 1.3 && hf(i, 7) < (S - 1.1) * 0.9 });
  }
  const dist = (x, z) => -(x * fx + z * fz);                                   // metres downwind of the stage centre (the front moves -from)
  const arrive = (x, z) => tA + dist(x, z) / V;                                 // when the front reaches (x, z)
  const cues = [{ t: +tA.toFixed(2), sound: 'shock_wave_boom', gain: 1 }, { t: +(tA + 0.1).toFixed(2), sound: 'wind_roar', gain: 0.8 * S }];
  const ax = new THREE.Vector3(fz, 0, -fx);                                  // horizontal axis: rotating about it tips a tree away from `from`
  const camL = new THREE.Vector3(), sunV = new THREE.Vector3();
  function update(t, clock, camera) {
    for (const T of trees) {
      const x = t - arrive(T.x, T.z);
      let ang = 0;
      if (x > 0) {
        if (T.snap) ang = Math.min(1, (x / 0.9) ** 2) * (Math.PI / 2 - 0.08);
        else { const peak = 0.3 + 0.28 * S, k = 1 - Math.exp(-x / 0.12); ang = peak * k * (0.55 + 0.45 * Math.exp(-x / 1.2) * Math.cos(x * 7 + T.ph * 6)) + 0.08 * S * Math.sin(x * 11 + T.ph * 9) * Math.exp(-x / 2); }
      }
      T.pivot.quaternion.setFromAxisAngle(ax, -ang);
    }
    { const d0 = (t - tA) * V; pxWall.visible = d0 > -1200 && d0 < 400; pxWall.position.set(-fx * d0, G.height(at[0] - fx * d0, at[1] - fz * d0) + H * 0.6, -fz * d0); pxWall.scale.set(Math.abs(fz) * 500 + Math.abs(fx) * H * 3, H * 1.2, Math.abs(fx) * 500 + Math.abs(fz) * H * 3); }
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    if (!camera) return;
    syncEnv(ctx);
    camera.getWorldPosition(camL); camL.sub(root.position); sunV.copy(U.uSunDir.value);
    P.begin(); GR.begin();
    // the dust wall: a band of billows along the front line (perpendicular to `from`), across the camera's view
    const d0 = (t - tA) * V;                                                  // the front's distance downwind of the stage
    const cx = -fx * d0, cz = -fz * d0, px = fz, pz = -fx;                    // front centre + its line direction
    const camAlong = camL.x * px + camL.z * pz;
    if (d0 > -1200 && d0 < 1500) for (let i = 0; i < 1500; i++) {
      const k = hf(i, 11), along = camAlong + (hf(i, 12) - 0.5) * 2 * (220 + 0.8 * Math.abs(d0));
      const back = k * H * 3.5 * (0.4 + 0.6 * hf(i, 13));                      // billows trail behind the leading edge
      const x = cx + px * along + fx * back, z = cz + pz * along + fz * back;
      const g = G.height(x + at[0], z + at[1]);
      const size = H * (0.25 + 0.4 * hf(i, 14)) * (0.6 + 0.8 * k), y = g + size * 0.4 + H * 0.5 * k * hf(i, 15);
      const occ = clamp(0.5 + 0.45 * clamp((y - g) / (H * 1.4)) + 0.1 * hf(i, 16));
      const haze = hf(i, 17) < 0.3;
      P.push(x, y + (haze ? size * 0.3 : 0), z, size * (haze ? 1.8 : 1), hf(i, 18) * 6.28 + t * 0.4 * (hf(i, 19) - 0.5), (haze ? 0.14 : 0.3) * (1 - 0.7 * k), i & 3, -1e9, 0.95, 0, 0, 0.05,
        clamp((haze ? 0.6 : 0.2) + 0.3 * k), occ, hf(i, 20), 0.45, tint[0], tint[1], tint[2], 0);
    }
    // the dust left hanging behind the front: a thinning haze drifting downwind over the stage
    if (d0 > 0) for (let i = 0; i < 700; i++) {
      const u = hf(i, 31), along = camAlong + (hf(i, 32) - 0.5) * 2 * 260, back = u * Math.min(d0, 1200);
      const drift = (t - tA) * 12 * S;
      const x = cx + px * along + fx * back - fx * drift * 0.5, z = cz + pz * along + fz * back - fz * drift * 0.5;
      const g = G.height(x + at[0], z + at[1]), size = H * (0.5 + 0.6 * hf(i, 33)) * (1 + u * 0.6);
      const al = 0.4 * (1 - u * 0.5) * sstep(0, 0.3, t - tA) * (1 - sstep(6, 18, t - tA)) * clamp(S);
      P.push(x, g + size * (0.3 + 0.6 * hf(i, 34)), z, size, hf(i, 35) * 6.28, al, i & 3, -1e9, 0.95, 0, 0, 0, 0.7, 0.8, hf(i, 36), 0.6, tint[0], tint[1], tint[2], 0);
    }
    // flying stuff: leaves, twigs, paper, grit swept along with the wind behind the front
    for (let i = 0; i < 1600; i++) {
      const x0 = (hf(i, 41) - 0.5) * 2 * Rst * 1.4, z0 = (hf(i, 42) - 0.5) * 2 * Rst * 1.4;
      const tl = arrive(x0, z0), dt = t - tl;
      if (dt < 0 || dt > 6) {                                                 // lying on the ground before the front (leaves, litter)
        if (dt < 0 && i < 500) GR.push(x0, G.height(x0 + at[0], z0 + at[1]) + 0.02, z0, 0.3, 0.26, 0.18, 0.03 + 0.03 * hf(i, 43));
        continue;
      }
      const w = (22 + 30 * hf(i, 44)) * S, drag = 0.7, dx = w * (dt - drag * (1 - Math.exp(-dt / drag)));
      const lift = (1.5 + 5 * hf(i, 45)) * S * (1 - Math.exp(-dt / 0.3)) - 1.2 * Math.max(0, dt - 1.2) * (1 - 0.5 * hf(i, 46));
      const x = x0 - fx * dx + Math.sin(dt * 7 + i) * 0.3, z = z0 - fz * dx + Math.cos(dt * 6 + i) * 0.3, g = G.height(x + at[0], z + at[1]);
      const kind = hf(i, 47), c = kind < 0.4 ? [0.36, 0.4, 0.14] : kind < 0.6 ? [0.52, 0.4, 0.22] : kind < 0.75 ? [0.85, 0.83, 0.78] : [0.3, 0.27, 0.24];
      GR.push(x, Math.max(g + 0.02, g + 0.2 + lift), z, c[0], c[1], c[2], 0.02 + 0.05 * hf(i, 48));
    }
    P.end(camera); GR.end();
  }
  update(0, 0, null);
  return { root, radius: Rst, height: H * 2, snapped: true, update, cues, contact: false, anchors: { stage: new THREE.Vector3(0, 1, 0), front: (t) => { const d0 = (t - tA) * V; return [at[0] - fx * d0, G.height(at[0] - fx * d0, at[1] - fz * d0) + H * 0.5, at[1] - fz * d0]; } } };
}

async function buildHeatFlash(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.heat_flash']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.heat_flash'; root.position.set(at[0], G.height(at[0], at[1]), at[1]);
  const from = num(p.from, 0), el = num(p.el, 8), [fx, fz] = dirOf(from);
  const t0 = num(p.t, 1), dur = Math.max(0.3, num(p.dur, 2.5)), I0 = clamp(num(p.intensity, 1), 0.1, 3), R = num(p.radius, 40);
  const smokeK = clamp(num(p.smoke, 1), 0, 2), fireK = clamp(num(p.fire, I0 > 1.2 ? 1 : 0.4), 0, 2);
  const src = new THREE.Vector3(fx * Math.cos(el * DEG), Math.sin(el * DEG), fz * Math.cos(el * DEG)).multiplyScalar(3000);
  const BL = burstLight(root, { shadows: p.shadows !== false, color: [1, 0.95, 0.88], box: Math.max(30, R) });
  const sun = glow([1.0, 0.95, 0.88], 24), sky = glow([1.0, 0.88, 0.7], 23); sun.position.copy(src); sky.position.copy(src); root.add(sun, sky);
  const P = makeCPuffs(ctx, { count: 900, near: 0.8, fog: 0.9, groundFade: 0.1, softK: 0.3, order: 10.4, name: 'heat.smoke' });
  const FL = makeFlames(ctx, { count: 160, hdr: 3, order: 11 }), SP = makeSparks(ctx, { count: 500, maxPx: 3, minPx: 1.1, order: 13 });
  root.add(P.mesh, FL.mesh, SP.mesh);
  // the pulse: a hard first peak, the long thermal maximum, the fall
  const pulse = (x) => (x < 0 ? 0 : 1.4 * Math.exp(-x / 0.06) + (x / (dur * 0.2)) * Math.exp(1 - x / (dur * 0.2)) * (1 - sstep(dur * 0.8, dur * 1.3, x)));
  const cues = [{ t: +t0.toFixed(2), sound: 'airburst_flash', gain: 1 }, { t: +(t0 + 0.2).toFixed(2), sound: 'fire_crackle', gain: 0.5 * fireK }];
  const camL = new THREE.Vector3(), tmp = new THREE.Color();
  function update(t, clock, camera) {
    const x = t - t0, I = pulse(x) * I0;
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    BL.aim(camera, src, I * 45);
    bbody(clamp(0.95 - 0.25 * sstep(0, dur, x)), BL.L.color);
    sun.visible = sky.visible = I > 0.005;
    sun.material.uniforms.uS.value = 260; sun.material.uniforms.uMinPx.value = 220 + 900 * Math.min(1.3, I); sun.material.uniforms.uI.value = 2.4 * I;
    sky.material.uniforms.uS.value = 1800; sky.material.uniforms.uMinPx.value = 3400 * Math.min(1.2, I); sky.material.uniforms.uI.value = 0.9 * Math.min(1.5, I);
    if (!camera) return;
    syncEnv(ctx); camera.getWorldPosition(camL); camL.sub(root.position);
    P.begin(); FL.begin(t); SP.begin();
    const dose = clamp(x / (dur * 0.5));
    if (x > 0.15) {
      // surfaces facing the flash smoke: the ground, dry grass, leaves; the smoke streams up and away
      for (let i = 0; i < 700; i++) {
        const a = hf(i, 1) * TAU, r = R * Math.sqrt(hf(i, 2)), px = Math.cos(a) * r, pz = Math.sin(a) * r;
        if (Math.hypot(px, pz) < 2.5) continue;
        const L = 3 + 3 * hf(i, 3), age = ((x - 0.15 + hf(i, 4) * L) % L), g = G.height(px + at[0], pz + at[1]) - root.position.y;
        const on = sstep(0.15, 0.6, x) * (1 - sstep(dur * 1.3, dur * 2.5, x)) * (hf(i, 5) < 0.6 * smokeK ? 1 : 0);
        if (!on) continue;
        const sz = 0.15 + age * 0.45, y = g + 0.1 + age * (0.6 + 0.6 * hf(i, 6));
        P.push(px - fx * age * 0.6, y, pz - fz * age * 0.6, sz, hf(i, 7) * 6.28 + age * 0.4, 0.35 * on * (1 - age / L), i & 3, -1e9, 0.9, 0, 0, 0.2, clamp(0.3 + age * 0.15), 0.8, hf(i, 8), 0.3, 0.78, 0.76, 0.74, 0);
      }
      // dry leaves and grass catching fire (small flames, embers)
      if (fireK > 0) for (let i = 0; i < 150; i++) {
        const a = hf(i, 11) * TAU, r = R * Math.sqrt(hf(i, 12)), px = Math.cos(a) * r, pz = Math.sin(a) * r;
        if (Math.hypot(px, pz) < 3 || hf(i, 13) > 0.5 * fireK) continue;
        const ig = 0.2 + hf(i, 14) * dur * 0.6; if (x < ig) continue;
        const g = G.height(px + at[0], pz + at[1]) - root.position.y, k = sstep(ig, ig + 0.4, x) * (1 - sstep(dur * 2, dur * 3.5, x));
        FL.push(px, g, pz, 0.25 + 0.45 * hf(i, 15), 0.2 + 0.15 * hf(i, 16), hf(i, 17), 0.9 * k, 0.55);
        if (hf(i, 18) < 0.4) { const e = (x * 1.3 + hf(i, 19)) % 1; SP.push(px - fx * e, g + 0.3 + e * 2.5, pz - fz * e, 2.5 * (1 - e), 1.2 * (1 - e), 0.3 * (1 - e), 0.01); }
      }
    }
    P.end(camera); FL.end(); SP.end();
  }
  update(0, 0, null);
  return { root, radius: R, height: 5, snapped: true, update, cues, contact: false, anchors: { source: src.clone() },
    flashAt: (t) => { const x = t - t0; return x < 0 ? 0 : clamp(pulse(x) * I0); } };
}

export const CATALOG = {
  'fx.shock_front': {
    desc: 'THE BLAST WAVE REACHING YOU: put it at the stage (where YOU stand). At t_arrive a wall of dust sweeps across the ground from `from` (compass deg towards ground zero) at ~400-700 m/s, trees on the stage bend hard away from it and spring back (strength >= 1.5: they snap and go down), leaves, twigs, paper and grit fly with the wind behind it, and a haze of dust hangs after it. Pair it with cast struck_fall at t_arrive (YOU knocked down), fx.window_blast (t_hit = t_arrive), and a camera shake at t_arrive; for the distant explosion itself use fx.nuke / fx.explosion with the same t_arrive',
    actions: ['arrive'],
    params: { from: 'compass deg towards ground zero', t_arrive: 's the front passes the stage', strength: '0.2..2.5 (1 = trees bend hard; 2 = trees snap)', speed: 'm/s of the front', height: 'm of the dust wall', radius: 'm dressed round the stage (60)', trees: '0..40 trees that take the blast (10)', tree: 'deciduous|conifer|palm (| to mix)', surface: 'dirt|sand|snow (dust colour)', dust: '[r,g,b]' },
    footprint: [120, 120], height: 30, snap: false, contact: false,
    tags: ['fx', 'shock wave', 'blast wave', 'wind', 'dust', 'trees bending', 'overpressure', 'debris', 'explosion'],
    examples: [{ note: 'YOU 10 km from a 15 kt blast: the wave hits at 3 s', spec: { world: { biome: 'plains' }, objects: [{ kind: 'fx.nuke', at: [0, -10000], preset: 'hiroshima', phase: 0.35, t_arrive: 3 }, { kind: 'fx.shock_front', at: [0, 0], from: 0, t_arrive: 3, strength: 1.2, trees: 12 }], cast: [{ ref: 'witness', at: [0, 0], heading: 0, actions: [{ t: 0, action: 'watch' }, { t: 3, action: 'struck_fall', fall: 'back' }] }], camera: { move: 'keys', fov: 50, target: 'cast:0', shake: [{ t: 3, amp: 1.2, dur: 1.4, freq: 8 }], keys: [{ t: 0, at: [-4, 7], alt: 1.6, look_at: [0, -40], look_h: 6 }, { t: 6, at: [-3.4, 6.2], alt: 1.7, look_at: [0, -40], look_h: 6 }] } } }],
  },
  'fx.heat_flash': {
    desc: 'THE HEAT FLASH reaching you (the thermal pulse of a nuclear fireball): put it at the stage. From `t` a blinding light from the fireball (`from` compass deg, `el` deg above the horizon) floods the scene: long hard shadows, the sky whitening round the glare, surfaces facing it start to smoke and dry leaves / grass catch fire as the pulse goes on (`dur` s). YOU: cast look_up with shade: true or shield_face at t; the rim of the silhouette burns bright against it. Use with fx.nuke far away (its own flash is at the same t)',
    actions: ['flash'],
    params: { from: 'compass deg of the fireball', el: 'deg above the horizon (8)', t: 's', dur: 's the pulse lasts (2.5; ~10 s for a megaton)', intensity: '0.1..3', radius: 'm of ground that smokes (40)', smoke: '0..2', fire: '0..2 (dry vegetation igniting)', shadows: 'bool' },
    footprint: [80, 80], height: 5, snap: false, contact: false,
    tags: ['fx', 'heat', 'thermal', 'flash', 'burn', 'radiation', 'nuclear', 'light', 'blinding'],
    examples: [{ note: 'YOU shield your eyes; the ground smokes', spec: { world: { biome: 'plains' }, objects: [{ kind: 'fx.heat_flash', at: [0, 0], from: 0, el: 10, t: 1, dur: 3 }], cast: [{ ref: 'witness', at: [0, 0], heading: 0, actions: [{ t: 0, action: 'watch' }, { t: 1.05, action: 'shield_face' }] }], camera: { move: 'keys', fov: 45, target: 'cast:0', keys: [{ t: 0, at: [2.5, 3.5], alt: 1.3, look_at: [0, 0], look_h: 1.4 }, { t: 5, at: [2.1, 3.0], alt: 1.35, look_at: [0, 0], look_h: 1.45 }] } } }],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'fx.heat_flash') return buildHeatFlash(item, ctx);
  return buildShockFront(item, ctx);
}
