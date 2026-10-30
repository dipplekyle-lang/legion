// x_volcano.js — E5 (explosions kit, 30 Sep 2026): Krakatoa, 27 August 1883, 10:02.
//   fx.krakatoa   a volcanic island in the sea (jungle slopes, a beach, the Rakata peak ~800 m) blown apart by the
//                 paroxysm at `t`: a white shock dome racing out over the water, the island sinking into the blast,
//                 a column of ash climbing tens of kilometres (fx.eruption underneath: jet, convecting column,
//                 umbrella, lightning, bombs), pyroclastic surges racing out across the sea as a grey wall, and the
//                 tsunami ring spreading from the island. Before t an ash plume already rises from the summit.
//                 Use biome ocean (water level 0). A time-compressed hour in a shot.
import * as THREE from 'three';
import { makeCPuffs, makeVeil, maskProxy, glow, num, clamp, lerp, sstep, hf, headingYaw, DEG, pushFront } from './x_common.js';
import { syncEnv, fbm1 } from './f_common.js';
import { U, patchMaterial } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';
import { build as buildVolcano } from './f_volcano.js';
import { waterMat } from './w_tsunami.js';

const TAU = Math.PI * 2;

async function buildKrakatoa(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.krakatoa']);
  const at = item.at || [0, 0], G = ctx.ground;
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : G.height(at[0], at[1]);
  const root = new THREE.Group(); root.name = 'fx.krakatoa'; root.position.set(at[0], wl, at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const K = clamp(num(p.scale, 1), 0.2, 2), t0 = num(p.t, 2), rate = num(p.rate, 1.6);
  const Hpk = 813 * K, A = 4600 * K, B = 2700 * K;                          // Rakata peak, the island's half-length / half-width
  // the island: an elongated cone with the Rakata peak at one end and the lower Danan-Perboewatan ridge
  const hAt = (x, z) => {
    const d1 = Math.hypot((x - A * 0.35) / (A * 0.7), z / B), d2 = Math.hypot((x + A * 0.35) / (A * 0.75), z / (B * 0.8));
    const n = fbm1(x / 900 + 3.1, 5) * 0.08 + fbm1(z / 700 - 1.7, 6) * 0.06;
    return Math.max(Hpk * Math.pow(Math.max(0, 1 - d1), 1.7) * (1 + n), Hpk * 0.55 * Math.pow(Math.max(0, 1 - d2), 1.5) * (1 + n)) - 12;
  };
  const geo = new THREE.PlaneGeometry(A * 2.4, B * 2.4, 160, 110).rotateX(-Math.PI / 2), P = geo.attributes.position;
  const col = new Float32Array(P.count * 3), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), h = hAt(x, z); P.setY(i, h);
    const sand = h < 10 ? 1 : 0, rock = sstep(Hpk * 0.62, Hpk * 0.85, h) + 0.3 * sstep(0.35, 0.6, Math.abs(fbm1(x / 300, 9)));
    if (sand) c.setRGB(0.72, 0.66, 0.52); else c.setRGB(lerp(0.16, 0.36, rock), lerp(0.3, 0.32, rock), lerp(0.12, 0.28, rock)).multiplyScalar(0.8 + 0.3 * hf(i, 3));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const island = new THREE.Mesh(geo, patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));
  island.castShadow = island.receiveShadow = true; island.name = 'krakatoa.island'; root.add(island);
  // jungle: instanced tree crowns on the green slopes (cheap blobs at a few km; they burn and vanish in the blast)
  const NJ = Math.round(clamp(num(p.trees, 2600), 0, 8000)), crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), patchMaterial(new THREE.MeshStandardMaterial({ color: 0x2f5a26, roughness: 0.9, flatShading: true })), Math.max(1, NJ));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(); let nj = 0;
  for (let i = 0; i < NJ; i++) {
    const x = (hf(i, 11) - 0.5) * A * 2.2, z = (hf(i, 12) - 0.5) * B * 2.2, h = hAt(x, z);
    if (h < 14 || h > Hpk * 0.7) continue;
    const r = (14 + 12 * hf(i, 13)) * K; m4.compose(v.set(x, h + r * 0.6, z), q, s.set(r, r * 0.8, r)); crowns.setMatrixAt(nj, m4); crowns.setColorAt(nj++, c.setRGB(0.18 + 0.1 * hf(i, 14), 0.34 + 0.12 * hf(i, 15), 0.14)); }
  crowns.count = nj; crowns.castShadow = true; root.add(crowns);
  // the eruption column (f_volcano), its vent on the Perboewatan end; onset at the paroxysm
  const ventX = -A * 0.25, ventH = hAt(ventX, 0);
  const er = await buildVolcano('fx.eruption', { ...item, kind: 'fx.eruption', at: [0, 0], params: { height: num(p.plume, 16000) * K, umbrella: num(p.umbrella, 8000) * K, onset: t0 - num(p.before, 300), rate, cone: false, lightning: 1.2, bombs: 1.0 } }, { ...ctx, ground: { height: () => 0, normal: () => [0, 1, 0] } });
  er.root.position.set(ventX, ventH - 20, 0); root.add(er.root);
  const P2 = makeCPuffs(ctx, { count: 4600, near: 40, fog: 0.6, groundFade: 0.02, softK: 0.2, order: 9.05, name: 'krakatoa.ash' });
  root.add(P2.mesh);
  const dome = makeVeil({ full: false, mottle: 0.4, rim: 1.3, order: 9.8, color: [0.92, 0.93, 0.95] }); root.add(dome.mesh);
  const pxCol = maskProxy('cyl'); root.add(pxCol);
  // the tsunami ring on the sea (a raised annulus of water with a foam crest)
  const NA = 360, NR = 14, wUT = { value: 0 };
  const PROF = [[-3.2, -0.04], [-2.2, 0.12], [-1.4, 0.35], [-0.7, 0.7], [-0.25, 0.95], [0, 1], [0.18, 0.93], [0.34, 0.72], [0.46, 0.45], [0.56, 0.22], [0.66, 0.08], [0.8, 0.0], [1.0, -0.03], [1.3, -0.05]];
  const wgeo = new THREE.BufferGeometry(), wpos = new Float32Array(NA * NR * 3), wfx = new Float32Array(NA * NR * 3), wcol = new Float32Array(NA * NR * 3);
  for (let i = 0; i < NA * NR; i++) { wcol[i * 3] = 0.02; wcol[i * 3 + 1] = 0.07; wcol[i * 3 + 2] = 0.085; }
  wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3).setUsage(THREE.DynamicDrawUsage)); wgeo.setAttribute('color', new THREE.BufferAttribute(wcol, 3)); wgeo.setAttribute('aFx', new THREE.BufferAttribute(wfx, 3).setUsage(THREE.DynamicDrawUsage));
  const idx = []; for (let r = 0; r < NR - 1; r++) for (let a = 0; a < NA; a++) { const a1 = (a + 1) % NA, i0 = r * NA + a, i1 = r * NA + a1, i2 = (r + 1) * NA + a, i3 = (r + 1) * NA + a1; idx.push(i0, i1, i2, i1, i3, i2); }
  wgeo.setIndex(idx); wgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const wave = new THREE.Mesh(wgeo, waterMat(ctx, wUT, { uFlow: { value: new THREE.Vector2(0, 0) }, rough: 0.2, env: 0.8, bump: 0.5, sss: 1.0 }));
  wave.userData.noQA = true; wave.frustumCulled = false; wave.visible = false; root.add(wave);
  const tsuK = p.tsunami === false ? 0 : clamp(num(p.tsunami, 1), 0, 2), surgeK = clamp(num(p.surge, 1), 0, 2);
  const cam = new THREE.Vector3(), sunV = new THREE.Vector3();
  const cues = [{ t: +t0.toFixed(2), sound: 'explosion_big', gain: 1 }, { t: +(t0 + 0.2).toFixed(2), sound: 'deep_rumble', gain: 1 }, { t: +(t0 + 1.5).toFixed(2), sound: 'shock_wave_boom', gain: 0.9 }];
  function update(t, clock, camera) {
    const tau = t - t0;
    er.update(t, clock, camera);
    // the island blown apart: it sinks into the blast (the north two-thirds vanished into the caldera)
    const gone = sstep(0.3, 3.0, tau);
    island.scale.y = 1 - 0.75 * gone; island.position.y = -Hpk * 0.08 * gone; crowns.visible = gone < 0.5;
    crowns.scale.y = 1 - 0.75 * gone;
    // the shock dome over the water
    const rD = tau > 0 ? 343 * 2.2 * tau * K : 0, dA = sstep(0.02, 0.2, tau) * (1 - sstep(1.4, 2.8, tau));
    dome.mesh.visible = dA > 0.01; dome.mesh.position.set(ventX, 0, 0); dome.mesh.scale.set(rD, rD * 0.7, rD); dome.uni.uA.value = 0.6 * dA; dome.uni.uTime.value = t;
    // the tsunami ring
    wUT.value = t;
    const rw = tau > 0 ? A * 1.1 + 170 * K * Math.pow(tau, 0.9) * 6 : 0, hw = 40 * K * tsuK * sstep(0.2, 1.2, tau) * Math.exp(-Math.max(0, tau) / 30);
    wave.visible = tsuK > 0 && tau > 0.2;
    if (wave.visible) {
      for (let a = 0; a < NA; a++) {
        const th = a / NA * TAU, ca = Math.cos(th), sa = Math.sin(th), h = hw * (1 + 0.2 * fbm1(th * 6 + 3, 81));
        for (let r = 0; r < NR; r++) { const Q = PROF[r], rad = rw + Q[0] * Math.max(h, 1) * 5, i3 = (r * NA + a) * 3; wpos[i3] = ventX + ca * rad; wpos[i3 + 1] = Q[1] * h + 0.3; wpos[i3 + 2] = sa * rad; wfx[i3] = 0.25 + 1.1 * Math.exp(-(((Q[0] - 0.05) / 0.3) ** 2)); wfx[i3 + 1] = 0.8 * Math.exp(-(((Q[0] + 0.1) / 0.25) ** 2)); wfx[i3 + 2] = 0.6; }
      }
      wgeo.attributes.position.needsUpdate = wgeo.attributes.aFx.needsUpdate = true; wgeo.computeVertexNormals();
    }
    { const hc = tau < 0 ? num(p.plume, 16000) * K * 0.8 : Math.min(num(p.height, 38000) * K, 1500 * K + 2600 * K * rate * tau); pxCol.position.set(ventX, hc / 2, 0); pxCol.scale.set((tau < 0 ? 2000 : 3500) * K, hc, (tau < 0 ? 2000 : 3500) * K); }
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    if (!camera) return;
    syncEnv(ctx); camera.getWorldPosition(cam); root.worldToLocal(cam); sunV.copy(U.uSunDir.value);
    P2.begin();
    // before: a grey ash plume already streaming from the summit (the eruption had gone on since May)
    if (tau < 1) for (let i = 0; i < 700; i++) {
      const Lp = 20, age = ((t + hf(i, 1) * Lp) % Lp), f = age / Lp, up = 2600 * K * Math.pow(f, 0.7);
      const x = ventX + (hf(i, 2) - 0.5) * 200 * K * (1 + 4 * f) + 900 * K * f, z = (hf(i, 3) - 0.5) * 200 * K * (1 + 4 * f);
      const occ = clamp(0.35 + 0.55 * sstep(-0.4, 0.6, sunV.y + (hf(i, 4) - 0.5) * 0.6));
      P2.push(x, ventH + 60 * K + up, z, (90 + 420 * f) * K, hf(i, 5) * 6.28, 0.8 * (1 - sstep(0.8, 1, f)) * (1 - sstep(0.2, 1, tau)), i & 3, -1e9, 0.62, 0, 0, 0.1, 0.2 + 0.4 * f, occ, hf(i, 6), 0.4, 0.62, 0.6, 0.58, 0);
    }
    // the paroxysm: pyroclastic surges racing out over the sea in every direction, a grey wall hundreds of metres high
    if (tau > 0 && surgeK > 0) {
      const R = A * 0.6 + 140 * K * rate * Math.pow(tau, 0.85) * 6;
      for (let i = 0; i < 2000; i++) {
        const a = hf(i, 21) * TAU, k = hf(i, 22), rr = R * (0.5 + 0.5 * Math.sqrt(k)), x = ventX + Math.cos(a) * rr, z = Math.sin(a) * rr;
        const dC = Math.hypot(x - cam.x, z - cam.z); if (dC > 60000) continue;
        const hgt = (220 + 700 * hf(i, 23)) * K * surgeK * (0.6 + 0.6 * k), sz = (260 + 380 * hf(i, 24)) * K * (0.8 + 0.6 * k) * (1 + dC / 30000);
        const occ = clamp(0.3 + 0.6 * sstep(-0.4, 0.6, Math.cos(a) * sunV.x + Math.sin(a) * sunV.z + sunV.y * 0.6));
        P2.push(x, hgt * 0.5 + sz * 0.3, z, sz, hf(i, 25) * 6.28 + tau * 0.02, 0.85 * sstep(0, 0.6, tau) * (1 - 0.4 * k), i & 3, -1e9, 0.6, 0.3 * Math.exp(-tau / 3) * (1 - k), 0, 0, 0.15 + 0.25 * k, occ, hf(i, 26), 0.4, 0.55, 0.52, 0.5, 0);
      }
      // the paroxysm's own column punching up through the plume: dark grey-brown, glowing at its root at first
      const Hmax = num(p.height, 38000) * K, vUp = 2600 * K * rate, Hc = Math.min(Hmax, 1500 * K + vUp * tau * (1 - 0.25 * sstep(0, 12, tau)));
      for (let i = 0; i < 1300; i++) {
        const f = hf(i, 41), y = f * Hc, R0 = (1300 + 2600 * f + 1200 * sstep(0.8, 1, f)) * K * (0.8 + 0.4 * sstep(0, 6, tau));
        const a = hf(i, 42) * TAU, rr = R0 * Math.sqrt(hf(i, 43)) * 0.8, x = ventX + Math.cos(a) * rr, z = Math.sin(a) * rr;
        const occ = clamp(0.28 + 0.62 * sstep(-0.45, 0.6, Math.cos(a) * sunV.x + Math.sin(a) * sunV.z + sunV.y * 0.4) * (0.7 + 0.3 * rr / R0));
        const top = sstep(0.85, 1, f);
        P2.push(x, y + 400 * K, z, R0 * (0.32 + 0.2 * hf(i, 44)) * (1 + 0.5 * top), hf(i, 45) * 6.28 + tau * 0.03, 0.9 * sstep(0, 0.35, tau), i & 3, -1e9, 0.62 + 0.1 * f, 0.9 * Math.exp(-tau / 3) * (1 - f), 0.5 * Math.exp(-tau / 1.5) * (1 - f), 0, 0.1 + 0.2 * f, occ, hf(i, 46), 0.35 * (1 - occ),
          0.5, 0.47, 0.44, 0.45);
      }
      // the base of the column: a dark boiling mass over the drowned island
      for (let i = 0; i < 600; i++) {
        const a = hf(i, 31) * TAU, rr = A * 0.9 * Math.sqrt(hf(i, 32)) * sstep(0, 2, tau), h = 1800 * K * hf(i, 33) * sstep(0, 3, tau);
        P2.push(ventX + Math.cos(a) * rr, h + 300 * K, Math.sin(a) * rr, (500 + 500 * hf(i, 34)) * K, hf(i, 35) * 6.28, 0.9 * sstep(0, 0.5, tau), i & 3, -1e9, 0.5, 0.6 * Math.exp(-tau / 4), 0.2 * Math.exp(-tau / 2), 0, 0.12, clamp(0.3 + 0.5 * hf(i, 36)), hf(i, 37), 0.5, 0.5, 0.48, 0.46, 0.4);
      }
    }
    P2.end(camera);
  }
  update(0, 0, null);
  return { root, radius: A * 1.3, height: 36000 * K, snapped: true, update, cues, contact: false, farNeed: 120000,
    flashAt: (t) => { const x = t - t0; return x < 0 ? 0 : clamp(0.6 * Math.exp(-x / 0.3)); },
    anchors: { island: new THREE.Vector3(0, Hpk * 0.5, 0), vent: new THREE.Vector3(ventX, ventH, 0), peak: new THREE.Vector3(A * 0.35, Hpk, 0) },
    planet: { center: () => root.localToWorld(new THREE.Vector3(ventX, 8000 * K, 0)), R: 9000 * K } };
}

export const CATALOG = {
  'fx.krakatoa': {
    desc: 'KRAKATOA, 27 August 1883: a volcanic island in the sea (jungle slopes, a beach, the Rakata peak ~800 m at one end, the lower Perboewatan ridge where the vent is) blown apart by the paroxysm at `t`: a white shock dome racing out over the water, the island sinking into the blast, a column of ash climbing tens of kilometres (the Plinian column of fx.eruption: jet, convecting column, umbrella, lightning, glowing bombs), pyroclastic surges racing out across the sea as a grey wall hundreds of metres high, and the tsunami ring spreading from the island. Before t an ash plume already streams from the summit. Use biome ocean (water level 0); the real hour is time-compressed. For the coast being hit use fx.tsunami at the shore; for the ship use ship.cargo era 1917 (the Norham Castle)',
    actions: ['erupt'],
    params: { t: 's the paroxysm', rate: 'x column speed (1.6)', height: 'm the paroxysm column top (38000)', plume: 'm the eruption plume already standing before t (16000)', before: 's the eruption has been going (300)', umbrella: 'm (8000)', scale: '0.2..2 island size (1 = 9 km long)', tsunami: '0..2 (1)', surge: '0..2 (1)', trees: 'int (2600)', heading: 'deg of the island long axis' },
    footprint: [11000, 6500], height: 36000, snap: false, fly: true, contact: false,
    tags: ['fx', 'volcano', 'krakatoa', 'eruption', 'island', '1883', 'tsunami', 'pyroclastic', 'explosion', 'indonesia', 'sunda strait'],
    examples: [{ note: 'the island from a ship 25 km away', spec: { world: { biome: 'ocean' }, look: { time: 'morning', sky: 'scattered', haze: 0.35 }, objects: [{ kind: 'fx.krakatoa', at: [0, -25000], t: 2 }], camera: { move: 'keys', fov: 50, target: 'objects:0', keys: [{ t: 0, at: [0, 0], alt: 12, look_at: [0, -25000], look_h: 3000 }, { t: 12, at: [200, 100], alt: 14, look_at: [0, -25000], look_h: 9000 }] } } }],
  },
};

export async function build(kind, item, ctx) {
  return buildKrakatoa(item, ctx);
}
