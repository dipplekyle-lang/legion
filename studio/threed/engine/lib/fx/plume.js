// plume.js — a lit, billowing smoke column / smoke mass built from the Q4 billow puffs (f_common.makePuffs: cauliflower
// billows with bump normals, crevice occlusion, a self-shadowed core, a silver lining when backlit, soft depth where
// they meet geometry). Not a catalog module. Used by fog.volume shape "plume" (and big dark fog spheres: a billowing
// smoke mass instead of a smooth raymarched ball) and by ship.warship `fire` / `smoke` (a burning ship).
// Every puff is a pure function of t: it rises along the column on its own life cycle, grows, drifts downwind,
// thins and goes wispy aloft. Positions are pushed in WORLD-aligned axes relative to `root` (makePuffs adds only the
// root's translation), so the root must not be rotated.
import * as THREE from 'three';
import { clamp, hf, sstep, makePuffs, makeFlames, syncEnv } from './f_common.js';

const TAU = Math.PI * 2;
const num = (v, d) => (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(+v) ? +v : d);
function lum(c) { return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }

// o: {h m (40), r base radius m (3), spread top radius m (h * 0.32), lean [dx, dz] m the top is carried downwind
//     (default from wind), wind [vx, vz] m/s, rise m/s at the base (default ~ 1.2 sqrt(h)), color smoke tone '#hex'
//     (black oil '#151311', grey '#77736c'), density 0..1 (0.6), fire 0..1 (flames + an orange underglow at the base),
//     count, seed, gy ground / water y (fade), base () => [x, y, z] (a moving source, root-relative; default [0, 0, 0])}
export function makePlume(ctx, o = {}) {
  const root = new THREE.Group(); root.name = 'fx.plume'; root.userData.noQA = true;
  const H = Math.max(2, num(o.h, 40)), R0 = Math.max(0.2, num(o.r, 3)), R1 = Math.max(R0, num(o.spread, H * 0.32));
  const wind = Array.isArray(o.wind) ? [num(o.wind[0], 0), num(o.wind[1], 0)] : [0, 0];
  const rise = Math.max(0.3, num(o.rise, 1.2 * Math.sqrt(H)));
  const life = H / rise * 1.9;                                     // seconds a puff takes base -> top
  const lean = Array.isArray(o.lean) ? [num(o.lean[0], 0), num(o.lean[1], 0)] : [wind[0] * life * 1.3, wind[1] * life * 1.3];
  const wl = Math.hypot(lean[0], lean[1]), wd = wl > 1e-3 ? [lean[0] / wl, lean[1] / wl] : [1, 0];
  const col = (() => { try { return new THREE.Color(o.color ?? '#2a2724'); } catch (e) { return new THREE.Color('#2a2724'); } })();
  const alb = clamp(0.1 + lum(col) * 1.7, 0.08, 1.4);
  const dens = clamp(num(o.density, 0.6), 0, 1.5), fire = clamp(num(o.fire, 0), 0, 1.5), seed = num(o.seed, 7);
  const N = Math.round(clamp(num(o.count, 90 + H * 2.2), 40, 420));
  const FIRE = [1.0, 0.42, 0.12];
  const puffs = makePuffs(ctx, { count: N + 8, tint: [col.r * 0.5 + 0.5 * alb * 0.35, col.g * 0.5 + 0.5 * alb * 0.33, col.b * 0.5 + 0.5 * alb * 0.31].map((x) => clamp(x * 1.6, 0.05, 1)), glow: FIRE, heat: [1.0, 0.45, 0.12], heatHDR: 2.2, near: Math.max(1.5, R0 * 0.6), groundFade: 0.25, order: 11, name: 'fx.plume.puffs' });
  root.add(puffs.mesh);
  let flames = null, light = null;
  if (fire > 0.01) {
    flames = makeFlames(ctx, { count: 48, hdr: 2.4 }); root.add(flames.mesh);
    light = new THREE.PointLight(new THREE.Color(...FIRE), 0, Math.max(30, R0 * 30), 2); light.castShadow = false; light.userData.fx = true; root.add(light);
  }
  const base = typeof o.base === 'function' ? o.base : () => [0, 0, 0];
  const gy0 = num(o.gy, null);
  function update(t, clock, camera) {
    syncEnv(ctx);
    const [bx, by, bz] = base(t);
    const gy = gy0 ?? by - 0.5;
    puffs.begin();
    for (let i = 0; i < N; i++) {
      const L = life * (0.8 + 0.4 * hf(i, seed + 1));
      const f = (((t / L + hf(i, seed + 2)) % 1) + 1) % 1;          // 0 born at the base .. 1 dissolved at the top
      const hN = (1 - Math.exp(-2.2 * f)) / (1 - Math.exp(-2.2));     // fast off the fire, slowing aloft
      const y = hN * H;
      const rc = R0 + (R1 - R0) * Math.pow(hN, 1.25);                 // the column widens with height (slowly, then aloft)
      const ang = hf(i, seed + 3) * TAU + f * (1.2 + hf(i, seed + 4)) * (i & 1 ? 1 : -1);
      const rr = rc * (0.15 + 0.7 * Math.sqrt(hf(i, seed + 5)));
      const sh = Math.pow(hN, 1.7);                                   // downwind shear grows with height
      const trail = (hf(i, seed + 11) - 0.35) * wl * 0.45 * hN * hN;  // aloft the smoke smears out along the wind
      const x = bx + lean[0] * sh + wd[0] * trail + Math.cos(ang) * rr, z = bz + lean[1] * sh + wd[1] * trail + Math.sin(ang) * rr;
      const size = (R0 * 0.85 + rc * 0.55) * (0.75 + 0.5 * hf(i, seed + 6));
      const a = dens * 0.75 * sstep(0, 0.07, f) * (1 - sstep(0.35, 1, f) * 0.85) * (1 - sstep(0.9, 1, f)) * (0.75 + 0.25 * hf(i, seed + 7));
      const core = 1 - rr / Math.max(1e-3, rc);
      const occ = clamp(0.25 + 0.55 * (1 - core) + 0.25 * hN);
      const glowK = fire * Math.exp(-y / Math.max(2, R0 * 2.0)) * 0.9;
      const heat = fire * 0.28 * (1 - sstep(0, 0.06, f));
      puffs.push(x, by + y + size * 0.2, z, size, hf(i, seed + 8) * 6.28 + f * 0.6 * (hf(i, seed + 9) - 0.5), a, (i & 3), gy,
        alb * (0.75 + 0.5 * hN), glowK, heat, 0.12, clamp(0.15 + 0.7 * hN), occ, hf(i, seed + 10), clamp(0.25 + 0.5 * core));
    }
    puffs.end(camera);
    if (flames) {
      flames.begin(t);
      for (let j = 0; j < 28; j++) {
        const a = hf(j, seed + 20) * TAU, rr = R0 * 0.8 * Math.sqrt(hf(j, seed + 21));
        const hh = R0 * (1.0 + 1.6 * hf(j, seed + 22)) * fire * (0.8 + 0.2 * Math.sin(t * (5 + j % 3) + j));
        flames.push(bx + Math.cos(a) * rr, by - 0.2, bz + Math.sin(a) * rr, hh, hh * 0.55, hf(j, seed + 23), 0.55 * Math.min(1, fire), 0.2, 0.15);
      }
      flames.end();
      light.position.set(bx, by + R0, bz);
      light.intensity = fire * R0 * R0 * 70 * (0.85 + 0.15 * Math.sin(t * 13 + seed) + 0.08 * Math.sin(t * 31));
    }
  }
  return { root, update, puffs };
}

// a billowing smoke MASS filling a sphere (centre c, radius r): fog.volume spheres of smoke scale. Stacked spheres
// merge into one torn column instead of reading as balls.
export function makeSmokeBall(ctx, o = {}) {
  const root = new THREE.Group(); root.name = 'fx.smokeball'; root.userData.noQA = true;
  const r = Math.max(1, num(o.r, 8)), seed = num(o.seed, 11);
  const col = (() => { try { return new THREE.Color(o.color ?? '#2a2724'); } catch (e) { return new THREE.Color('#2a2724'); } })();
  const alb = clamp(0.1 + lum(col) * 1.7, 0.08, 1.4);
  const N = Math.round(clamp(r * 2.2, 18, 90));
  const puffs = makePuffs(ctx, { count: N + 4, tint: [col.r * 0.5 + 0.5 * alb * 0.35, col.g * 0.5 + 0.5 * alb * 0.33, col.b * 0.5 + 0.5 * alb * 0.31].map((x) => clamp(x * 1.6, 0.05, 1)), near: Math.max(1.5, r * 0.25), groundFade: 0.3, order: 11, name: 'fx.smokeball.puffs' });
  root.add(puffs.mesh);
  const dr = Array.isArray(o.drift) ? o.drift.map((v) => num(v, 0)) : [0, 0, 0];
  const c = o.c || [0, 0, 0];
  let k = 1;
  function update(t, clock, camera) {
    syncEnv(ctx);
    puffs.begin();
    const dens = clamp(num(o.density, 0.4), 0, 3) * k;
    for (let i = 0; i < N; i++) {
      // a stratified point in the ball, biased upward (smoke rolls up), each drifting with the wind plus its own curl
      const u = hf(i, seed), v = hf(i, seed + 1), w = hf(i, seed + 2);
      const th = u * TAU, ph = Math.acos(2 * v - 1), rr = r * 0.9 * Math.cbrt(w);
      const lx = rr * Math.sin(ph) * Math.cos(th), ly = rr * Math.cos(ph) * 0.85, lz = rr * Math.sin(ph) * Math.sin(th);
      const cu = Math.sin(t * 0.12 + i * 1.7) * r * 0.05;
      const x = c[0] + lx + dr[0] * t * 0.6 + cu, y = c[1] + ly + dr[1] * t * 0.35, z = c[2] + lz + dr[2] * t * 0.6 - cu;
      const size = r * (0.46 + 0.32 * hf(i, seed + 3));
      const core = 1 - rr / (r * 0.9);
      const a = clamp(dens * 1.3, 0, 0.95) * (0.6 + 0.4 * hf(i, seed + 4)) * (0.55 + 0.45 * core);
      puffs.push(x, y, z, size, hf(i, seed + 5) * 6.28 + t * 0.03 * (hf(i, seed + 6) - 0.5), a, (i & 3), num(o.gy, c[1] - r * 4),
        alb, 0, 0, 0.08, 0.35 + 0.4 * hf(i, seed + 7), clamp(0.3 + 0.6 * (1 - core) + (ly / r) * 0.3), hf(i, seed + 8), clamp(0.3 + 0.5 * core));
    }
    puffs.end(camera);
  }
  return { root, update, setK(v) { k = v; } };
}
