// x_nuke.js — E5 (explosions kit, 30 Sep 2026): "How Long You'd Last Against Every Explosion".
//   fx.nuke   a nuclear explosion at TRUE scale from its yield (kt / Mt): the flash (brighter than the Sun, hard shadows),
//             the fireball (white-hot, then yellow, orange and red as it cools, boiling), the Wilson condensation cloud
//             (a white bubble that flicks on around it for a second or two), the rising fireball rolling into a
//             toroidal mushroom cap (billows roll up through the centre, out over the top and curl under at the rim),
//             the stem sucked up from the ground, condensation collars round the stem, the ice cap over the rising
//             head, the dust skirt / base surge racing out along the ground and past the stage at `t_arrive`.
//             burst: air (Hiroshima 580 m, Tsar Bomba 4 km) | surface (Ivy Mike, Castle Bravo) | tower (Trinity) | water.
// Sizes: fireball R ~ 70 m W^0.4 (W kt; x1.26 on the ground), the stabilised cloud from Glasstone & Dolan (15 kt: top
// 16 km; 1 Mt: 22 km; 10 Mt: 37 km; 50 Mt: 64 km, cap 95 km wide). The development is time-compressed so it reads in a
// shot: `grow` screen seconds from the flash to the mature mushroom (default 10).
import * as THREE from 'three';
import { makeCPuffs, makeFireball, makeVeil, makeDisc, maskProxy, glow, burstLight, pushFront, parseYield, fmtYield, nukeDims, shockR, shockArrive, num, clamp, lerp, sstep, hf, bbody } from './x_common.js';
import { syncEnv } from './f_common.js';
import { curl3 } from './billow.js';
import { U } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';

const TAU = Math.PI * 2;
export const NUKE_PRESETS = {
  hiroshima: { yield: '15 kt', burst: 'air', height: 580 },          // Little Boy, 6 Aug 1945, 08:15
  nagasaki: { yield: '21 kt', burst: 'air', height: 503 },           // Fat Man, 9 Aug 1945
  trinity: { yield: '25 kt', burst: 'tower', height: 30 },           // 16 Jul 1945, a 30 m steel tower
  ivy_mike: { yield: '10.4 Mt', burst: 'surface' },                  // 1 Nov 1952, Elugelab (Enewetak): the island vanished
  castle_bravo: { yield: '15 Mt', burst: 'water' },                  // 1 Mar 1954, the reef at Bikini
  tsar_bomba: { yield: '50 Mt', burst: 'air', height: 4000 },        // 30 Oct 1961, Novaya Zemlya
  crossroads_able: { yield: '23 kt', burst: 'air', height: 158 },    // Bikini lagoon, 1946
  small: { yield: '1 kt', burst: 'surface' },
};

async function buildNuke(item, ctx) {
  const p0 = explicitParams(item, CATALOG['fx.nuke']);
  const pre = NUKE_PRESETS[String(p0.preset || '').toLowerCase().replace(/[\s-]+/g, '_')] || {};
  const p = { ...pre, ...p0 };
  const at = item.at || [0, 0];
  const G = ctx.ground, gy0 = G.height(at[0], at[1]);
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : null;
  const onWater = wl != null && wl >= gy0 - 0.5;
  const base = onWater ? wl : gy0;
  const root = new THREE.Group(); root.name = 'fx.nuke'; root.position.set(at[0], base, at[1]);
  const Wkt = parseYield(p.yield, 15000) / 1000;
  let burst = String(p.burst || 'air').toLowerCase();
  if (!['air', 'surface', 'tower', 'water'].includes(burst)) burst = 'air';
  if (burst === 'surface' && onWater) burst = 'water';
  const D = nukeDims(Wkt, burst);
  const SC = clamp(num(p.scale, 1), 0.02, 1);                          // draw smaller than true (a whole 50 Mt cloud in frame)
  const Rfb = D.Rfb * SC, TOPH = D.top * SC, CAPR = D.capR * SC, THICK = D.thick * SC;
  const hB = burst === 'air' ? num(p.height, Math.min(240 * Math.cbrt(Wkt), 4000)) * SC : burst === 'tower' ? num(p.height, 30) * SC : 0;
  const t0 = p.phase != null && Number.isFinite(+p.phase) ? -(+p.phase) * num(p.grow, 10) : num(p.t, 1);
  const grow = Math.max(2, num(p.grow, 10));
  const tg = clamp(num(p.fireball_time, D.tmax * 1.2), 0.18, 2.4);    // screen s the fireball takes to reach its full size
  const water = burst === 'water';
  const dirty = burst !== 'air' || hB < Rfb * 1.2;                     // the fireball touches the ground: a dark, dirty stem
  const stemK = num(p.stem, 1), ringsN = Math.round(clamp(num(p.rings, Wkt >= 500 ? 2 : 1), 0, 3)), capK = clamp(num(p.cap, Wkt >= 500 ? 0.8 : 0.45), 0, 1);
  const wilK = clamp(num(p.wilson, water ? 0.85 : 0.22), 0, 1), surgeK = clamp(num(p.surge, 1), 0, 1.5), lightK = num(p.light, 1);
  const warm = clamp(num(p.warm, 0.25), 0, 1);                           // 0 grey-white cap .. 1 salmon-orange (Castle / Tsar film stock)
  // the stage (where YOU stand, the world origin): the ground front passes it at t_arrive (screen time)
  const dS = Math.hypot(at[0], at[1]), dSl = Math.hypot(dS, hB);
  const realArr = shockArrive(dSl / SC, Wkt * 1e6);
  const tA = num(p.t_arrive, t0 + Math.min(realArr, 6));
  const WILD = dS < 1 ? 1 : 0;                                          // the stage is ground zero (no stage front)

  // ── the cloud's shape by phase p (0 flash .. 1 mature mushroom .. 1.5 spreading) ──
  const hTarget = TOPH - THICK * 0.5;
  const h0 = burst === 'air' ? hB : Rfb * 0.55;
  const rise = (q) => (1 - Math.exp(-2.8 * Math.max(0, q))) / (1 - Math.exp(-2.8));
  const riseC = (q) => Math.min(1.04, rise(Math.min(q, 1.4)));
  const spread = (q) => { q = Math.max(0, q); return Math.min(1.18, (1 - Math.exp(-2.0 * q)) / (1 - Math.exp(-2.0))); };
  const headAt = (q) => {
    const hc = h0 + (hTarget - h0) * riseC(q);
    const g = spread(q), torus = sstep(0.03, 0.22, q);
    const Rh = lerp(Rfb * 1.05, CAPR, g), Th = Math.max(lerp(Rfb * 1.0, THICK * 0.5, g), Rh * 0.3);
    return { hc, Rh, Th, torus };
  };
  const stemTop = (q, H) => {
    if (dirty) return H.hc - H.Th * 0.45;
    const up = sstep(0.02, 0.55, q);                                     // the air-burst stem grows up from the ground to meet the cap
    return Math.min(H.hc - H.Th * 0.45, (H.hc - H.Th * 0.45) * up * 1.05);
  };
  const stemR0 = (H) => H.Rh * (dirty ? 0.17 : 0.1) * stemK;

  // ── meshes ──
  const P = makeCPuffs(ctx, { count: 5600, tint: [1, 1, 1], glow: [1.0, 0.42, 0.14], heatHDR: 5.5, near: Math.max(8, Rfb * 0.05), fog: clamp(num(p.fog, Wkt >= 1000 ? 0.35 : 0.6), 0, 1), groundFade: 0.06, softK: 0.25, order: 9.2, name: 'nuke.cloud' });
  const F = makeCPuffs(ctx, { count: 1300, tint: [1, 1, 1], near: 4, fog: 0.8, groundFade: 0.05, softK: 0.35, order: 10.2, name: 'nuke.front' });
  root.add(P.mesh, F.mesh);
  const fb = makeFireball({ hdr: 7, amp: 0.06, cell: 2.6, order: 9.1 }); root.add(fb.mesh);
  const wil = makeVeil({ full: burst === 'air' && hB > Rfb * 1.5, mottle: 0.5, rim: 1.4, order: 9.6 }); root.add(wil.mesh);
  const discs = []; for (let k = 0; k < ringsN; k++) { const d = makeDisc({ inner: 0.12, order: 9.25 + 0.01 * k }); d.mesh.visible = false; root.add(d.mesh); discs.push(d); }
  const flash = glow([1.0, 0.97, 0.92], 24), halo = glow([1.0, 0.9, 0.75], 23);
  root.add(flash, halo);
  const pxCap = maskProxy('sphere'), pxStem = maskProxy('cyl'); root.add(pxCap, pxStem);
  const BL = burstLight(root, { shadows: p.shadows !== false, color: [1.0, 0.92, 0.82], box: 90 });
  const cols = {
    capLit: water ? [0.93, 0.93, 0.95] : [lerp(0.88, 0.95, warm), lerp(0.86, 0.8, warm), lerp(0.86, 0.74, warm)],
    capYoung: [0.58, 0.39, 0.27], capMid: [0.66, 0.55, 0.48],
    stem: water ? [0.86, 0.87, 0.9] : dirty ? [0.5, 0.43, 0.37] : [0.76, 0.72, 0.68],
    dust: water ? [0.93, 0.94, 0.96] : [0.64, 0.56, 0.47], white: [0.97, 0.98, 1.0],
  };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const cv = [0, 0, 0], sunV = new THREE.Vector3(), camL = new THREE.Vector3(), tmpC = new THREE.Color();
  const gyL = (x, z) => (onWater ? 0 : G.height(x + at[0], z + at[1]) - base);
  const flashI = (tau) => (tau < 0 ? 0 : 1.6 * Math.exp(-tau / 0.05) + 0.7 * Math.exp(-tau / (0.12 + tg * 0.35)));
  const cues = [{ t: +t0.toFixed(2), sound: 'airburst_flash' }, { t: +(t0 + 0.4).toFixed(2), sound: 'fireball_roar', gain: 0.8 }, { t: +tA.toFixed(2), sound: 'shock_wave_boom', gain: 1 }, { t: +(tA + 0.2).toFixed(2), sound: 'deep_rumble', gain: 0.9 }];
  const phaseAt = (t) => (t - t0 - 0.8 * tg) / grow;
  const capPos = (t) => { const H = headAt(Math.max(0, phaseAt(t))); return [at[0], base + H.hc, at[1]]; };

  function update(t, clock, camera) {
    const tau = t - t0, q = Math.max(0, (tau - 0.8 * tg) / grow);
    const H = headAt(q), hc = H.hc, Rh = H.Rh, Th = H.Th, tor = H.torus;
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    const lit = tau >= 0;
    // flash, halo, light
    const fI = flashI(tau);
    const src = new THREE.Vector3(0, lerp(burst === 'air' ? hB : Rfb * 0.3, hc, sstep(0.04, 0.3, q)), 0);
    flash.position.copy(src); halo.position.copy(src);
    const fOn = lit && fI > 0.004;
    flash.visible = halo.visible = fOn;
    flash.material.uniforms.uS.value = Rfb * 2.0; flash.material.uniforms.uMinPx.value = fOn ? 1500 * Math.min(1.2, fI) : 0; flash.material.uniforms.uI.value = fOn ? 3.0 * fI : 0;
    halo.material.uniforms.uS.value = Rfb * 8; halo.material.uniforms.uMinPx.value = fOn ? 2600 * Math.min(1, fI * fI) : 0; halo.material.uniforms.uI.value = fOn ? 0.55 * Math.min(1.5, fI) : 0;
    BL.aim(camera, src, lit ? lightK * (14 * Math.exp(-tau / 0.07) + 6 * Math.exp(-tau / (tg * 2)) + 1.2 * Math.exp(-tau / (tg * 10))) : 0);
    bbody(clamp(1 - 0.5 * sstep(0, tg * 4, tau)), BL.L.color);
    // the fireball sphere: the first seconds, then the billows take over
    const fbR = !lit ? 0 : Rfb * Math.min(1, Math.pow(tau / tg, 0.4)) * (1 + 0.12 * sstep(tg, tg * 5, tau));
    fb.mesh.visible = lit && tau < tg * 7;
    fb.mesh.position.set(0, tau < tg ? (burst === 'air' ? hB : fbR * 0.15) : lerp(burst === 'air' ? hB : fbR * 0.15, hc, sstep(tg, tg * 6, tau)), 0);
    fb.mesh.scale.setScalar(Math.max(0.01, fbR));
    fb.uni.uT.value = clamp(1 - 0.55 * sstep(0.2 * tg, 4 * tg, tau)); fb.uni.uTime.value = t; fb.uni.uI.value = 1 - sstep(tg * 2.2, tg * 6.5, tau);
    fb.uni.uGround.value = root.position.y - 0.5;
    // the burst's light on the cloud: from the hot core below
    P.uniforms.uFlashDir.value.set(0, -1, 0);
    bbody(0.55, tmpC); P.uniforms.uFlashCol.value.copy(tmpC).multiplyScalar(lit ? 2.2 * Math.exp(-q / 0.12) + 1.5 * Math.exp(-tau / 0.3) : 0);
    F.uniforms.uFlashCol.value.setRGB(0, 0, 0);
    // Wilson cloud: a white condensation bubble for ~1-2 s, just behind the shock (screen = real time here)
    const rW = shockR(Math.max(0, tau), Wkt * 1e6) * SC * 0.82;
    const wA = wilK * sstep(0.12, 0.45, tau) * (1 - sstep(1.1, 2.4, tau));
    wil.mesh.visible = wA > 0.01; wil.mesh.position.set(0, burst === 'air' ? hB : 0, 0);
    wil.mesh.scale.set(rW, rW * (burst === 'air' ? 1 : 0.82), rW); wil.uni.uA.value = wA * 0.85; wil.uni.uTime.value = t; wil.uni.uGround.value = root.position.y - 0.5;
    // the ice cap (pileus) over the rising head: see the billows below
    const iA = capK * sstep(0.05, 0.14, q) * (1 - sstep(0.28, 0.5, q));
    // the mask proxies (qa.js camera-target mask): the head and the stem as they are now
    pxCap.visible = lit && tau > tg * 0.3; pxCap.position.set(0, tau < tg * 3 ? fb.mesh.position.y : hc, 0);
    { const r = tau < tg * 3 ? Math.max(fbR, Rh * 0.8) : Rh; pxCap.scale.set(r * 1.05, tau < tg * 3 ? r : Th * 1.25, r * 1.05); }
    { const yT = stemTop(q, H), rs = stemR0(H) * 1.3; pxStem.visible = lit && yT > rs && q > 0.03; pxStem.position.set(0, yT / 2, 0); pxStem.scale.set(rs, Math.max(1, yT), rs); }
    if (!camera) return;                                                  // camera tracking samples (itemTrack): anchors only
    syncEnv(ctx);
    camera.getWorldPosition(camL); camL.sub(root.position);
    sunV.copy(U.uSunDir.value);
    P.begin(); F.begin();
    if (lit) {
      const aIn = sstep(tg * 0.5, tg * 3.2, tau);                         // the billows appear over the fireball
      const hotOut = Math.exp(-q / 0.05), hotIn = Math.exp(-q / 0.16), glowK = 1.3 * Math.exp(-q / 0.28);
      const capCol = q < 0.12 ? mix3(cols.capYoung, cols.capMid, sstep(0.03, 0.12, q)) : mix3(cols.capMid, cols.capLit, sstep(0.14, 0.6, q));
      // poloidal circulation: up through the middle, out over the top, down at the rim, in along the bottom
      const Om = 0.62 * grow * 0.3 * (1 - Math.exp(-tau / (grow * 0.3))) * (1 / Math.max(1, grow / 10)) + 0.06 * tau;
      const Rt = 0.54 * Rh * tor, rt = Rh - Rt;
      // 1. the cap: big lobes deep in the torus + a skin of smaller billows riding them (two scales read as a real cloud)
      const NC = 2300;
      for (let i = 0; i < NC; i++) {
        const lobe = i < 700, th = hf(i, 1) * TAU, u = lobe ? 0.6 + 0.2 * hf(i, 3) : 0.84 + 0.18 * hf(i, 3);
        const ph = hf(i, 2) * TAU - Om * (0.7 + 0.6 * hf(i, 4));
        const cph = Math.cos(ph), sph = Math.sin(ph), under = sph < 0;
        let r = Rt + rt * u * cph, y = hc + Th * u * sph * (under ? lerp(1, 0.6, tor) : 0.94);
        const rn = clamp(r / Math.max(Rh, 1));
        if (sph < 0.35) y -= Th * 0.28 * tor * sstep(0.5, 1.0, rn) * (1 - sstep(0.1, 0.35, sph));       // the rim curls down: a hanging skirt
        curl3(Math.cos(th) * 2.1 + i * 0.001, ph * 0.6 + t * 0.04, Math.sin(th) * 2.1, 11 + (i & 3), cv);   // boil
        r += cv[0] * rt * 0.09; y += cv[1] * Th * 0.07;
        const x = Math.cos(th) * r + cv[2] * rt * 0.05, z = Math.sin(th) * r;
        const nx = Math.cos(th) * cph, nz = Math.sin(th) * cph, ny = sph;                // outward normal on the tube
        const side = nx * sunV.x + ny * sunV.y + nz * sunV.z;
        let occ = clamp((0.2 + 0.75 * sstep(-0.45, 0.65, side)) * (lobe ? 0.75 : 0.9 + 0.1 * (u - 0.84) / 0.18));
        if (under) occ *= lerp(1, 0.42 + 0.3 * rn, tor);                  // the underside sits in the cap's own shadow
        const sz = rt * (lobe ? 0.36 + 0.14 * hf(i, 5) : 0.19 + 0.14 * hf(i, 5)) * lerp(1.2, 1, tor);   // big lobes carry the shape; a skin of smaller billows
        const heat = clamp((under ? lerp(hotOut, hotIn, 0.85) : hotOut * (lobe ? 1.3 : 1)) * (0.75 + 0.25 * hf(i, 6)) * aIn + (1 - aIn) * 0.9);
        const temp = clamp(0.2 + 0.78 * Math.exp(-q / 0.06) + (under ? 0.12 * hotIn : 0));
        const dk = under ? 0.55 + 0.25 * rn : 1, c = [capCol[0] * lerp(1, 0.86, 1 - dk), capCol[1] * lerp(1, 0.76, 1 - dk), capCol[2] * lerp(1, 0.7, 1 - dk)];
        P.push(x, y, z, sz, hf(i, 7) * 6.28 + tau * 0.02 * (hf(i, 8) - 0.5), (lobe ? 0.9 : 0.95) * aIn, i & 3, -1e9, 0.92 + 0.12 * hf(i, 9), under ? glowK : glowK * 0.25, heat, 0.0,
          clamp(0.07 + 0.14 * q + (lobe ? 0.05 : 0)), occ, hf(i, 10), (lobe ? 0.5 : 0.32) * (1 - occ) + 0.08 * q, c[0], c[1], c[2], temp);   // older = softer, merged
      }
      // 2. the rising core (fills the middle of the cap, stays hot longest)
      const NK = 320;
      for (let i = 0; i < NK; i++) {
        const fr = (hf(i, 21) + tau * 0.06) % 1, rr = 0.4 * Rh * Math.sqrt(hf(i, 22)) * (0.35 + 0.65 * tor), a = hf(i, 23) * TAU;
        const y = hc + Th * (-0.6 + 1.45 * fr) * lerp(0.6, 1, tor);
        const sz = Rh * (0.2 + 0.1 * hf(i, 24));
        const al = 0.9 * aIn * sstep(0, 0.15, fr) * (1 - sstep(0.85, 1, fr));
        P.push(Math.cos(a) * rr, y, Math.sin(a) * rr, sz, hf(i, 25) * 6.28, al, i & 3, -1e9, 0.85, glowK, clamp(hotIn * 0.9 * aIn + (1 - aIn)), 0, 0.1, 0.45, hf(i, 26), 0.55,
          capCol[0] * 0.9, capCol[1] * 0.85, capCol[2] * 0.82, clamp(0.25 + 0.7 * Math.exp(-q / 0.2)));
      }
      // 2b. the ice cap (pileus): a smooth white hood of soft billows over the rising head
      if (iA > 0.01) for (let i = 0; i < 300; i++) {
        const a = hf(i, 81) * TAU, e = Math.asin(0.25 + 0.75 * hf(i, 82)), ce = Math.cos(e);
        const x = Math.cos(a) * ce * Rh * 1.12, z = Math.sin(a) * ce * Rh * 1.12, y = hc + Th * 0.2 + Math.sin(e) * Th * 1.1;
        const side = Math.cos(a) * ce * sunV.x + Math.sin(e) * sunV.y + Math.sin(a) * ce * sunV.z;
        P.push(x, y, z, Rh * (0.2 + 0.08 * hf(i, 83)), hf(i, 84) * 6.28, 0.42 * iA, i & 3, -1e9, 1.05, 0, 0, -0.3, 0.62, clamp(0.6 + 0.4 * sstep(-0.3, 0.6, side)), hf(i, 85), 0.6,
          cols.white[0], cols.white[1], cols.white[2], 0);
      }
      // 3. the stem: dust and cloud sucked up from the ground into the cap
      const yTop = stemTop(q, H), rs0 = stemR0(H);
      if (yTop > rs0 * 0.5 && q > 0.012) {
        const NS = 900, vS = 0.18;                                       // fraction of the stem climbed per screen second
        for (let i = 0; i < NS; i++) {
          const fr = (hf(i, 31) + tau * vS * (0.8 + 0.4 * hf(i, 32))) % 1, y = fr * yTop;
          const flare = 1 + 1.6 * Math.pow(1 - fr, 5) + 1.8 * sstep(0.78, 1, fr) * sstep(0.78, 1, fr);
          const rr = rs0 * flare * Math.sqrt(hf(i, 33)) * 0.85, a = hf(i, 34) * TAU;
          curl3(Math.cos(a) * 1.5, y / (rs0 * 4) - t * 0.05, Math.sin(a) * 1.5, 31 + (i & 3), cv);
          const x = Math.cos(a) * rr + cv[0] * rs0 * 0.35, z = Math.sin(a) * rr + cv[2] * rs0 * 0.35;
          const sz = rs0 * flare * (0.55 + 0.35 * hf(i, 35));
          const side = (Math.cos(a) * sunV.x + Math.sin(a) * sunV.z) * 0.8 + sunV.y * 0.2;
          const occ = clamp(0.3 + 0.6 * sstep(-0.5, 0.6, side));
          const al = 0.85 * sstep(0, 0.04, fr) * sstep(0.012, 0.06, q) * (1 - sstep(0.93, 1.0, fr));
          const c = mix3(cols.stem, capCol, sstep(0.6, 1, fr) * 0.6);
          const hotS = dirty ? 0.6 * Math.exp(-q / 0.1) * (1 - fr) : 0;
          P.push(x, y + gyL(x, z) * (1 - fr), z, sz, hf(i, 36) * 6.28, al, i & 3, -1e9, 0.9, dirty ? 0.3 * Math.exp(-q / 0.2) : 0, hotS, 0.15, clamp(0.12 + 0.2 * q), occ, hf(i, 37), 0.3,
            c[0], c[1], c[2], 0.35);
        }
      }
      // 4. the base: dust (or spray) round the foot of the stem, thick at the stem, feathering out, swept in and up
      const Rb = CAPR * lerp(0.12, 0.6, sstep(0.02, 0.9, q)) * surgeK * (dirty ? 1 : 0.8);
      if (surgeK > 0 && q > 0.01) {
        const NB = 620;
        for (let i = 0; i < NB; i++) {
          const f = Math.pow(hf(i, 41), 0.8), rr = Rb * (0.08 + 0.92 * f), a = hf(i, 42) * TAU;
          const x = Math.cos(a) * rr, z = Math.sin(a) * rr, g = gyL(x, z);
          const hgt = Rb * (0.03 + 0.08 * hf(i, 43)) * (1.5 - rr / Rb) * (dirty ? 1.25 : 0.85);
          const sz = Rb * (0.07 + 0.07 * hf(i, 44)) * (0.7 + 0.7 * (1 - f));
          const side = (Math.cos(a) * sunV.x + Math.sin(a) * sunV.z) * 0.6 + sunV.y * 0.5;
          const al = 0.8 * sstep(0.01, 0.08, q) * (1 - f * f * 0.8);
          P.push(x, g + hgt + sz * 0.25, z, sz, hf(i, 45) * 6.28 + tau * 0.01, al, i & 3, -1e9, 0.95, 0, 0, -0.2, clamp(0.25 + 0.45 * f), clamp(0.45 + 0.5 * sstep(-0.4, 0.6, side)), hf(i, 46), 0.45,
            cols.dust[0], cols.dust[1], cols.dust[2], 0);
        }
      }
      // 5. condensation collars round the stem: flat soft white rings (humid layers the rising column pushes through)
      discs.forEach((d, k) => {
        const hy = hTarget * [0.42, 0.27, 0.6][k], appear = sstep(0, 0.1, (Math.min(yTop, hc - Th * 0.5) - hy) / Math.max(1, hTarget));
        const RR = rs0 * (2.6 + 0.8 * k) * (0.55 + 0.45 * appear) * (1 + 0.35 * sstep(0.3, 1.2, q)), fade = 1 - sstep(0.8, 1.35, q);
        d.mesh.visible = appear * fade > 0.01; d.mesh.position.set(0, hy, 0); d.mesh.scale.set(RR, 1, RR * (0.92 + 0.1 * k));
        d.uni.uA.value = 0.42 * appear * fade; d.uni.uTime.value = t; d.uni.uIn.value = clamp(rs0 * 1.1 / RR, 0.2, 0.7);
      });
      // 6. Wilson cloud texture: soft white billows on the condensation shell
      if (wA > 0.01) {
        const cy = burst === 'air' ? hB : 0, full = burst === 'air' && hB > Rfb * 1.5;
        for (let i = 0; i < 160; i++) {                                     // a few hazy billows (a net of crisp balls read as bubbles)
          const a = hf(i, 61) * TAU, cz = full ? hf(i, 62) * 2 - 1 : hf(i, 62) * 0.98, s = Math.sqrt(1 - cz * cz);
          const x = Math.cos(a) * s * rW, y = cy + cz * rW * (full ? 1 : 0.82), z = Math.sin(a) * s * rW;
          if (y < -rW * 0.05) continue;
          P.push(x, y, z, rW * (0.22 + 0.1 * hf(i, 63)), hf(i, 64) * 6.28, 0.22 * wA, i & 3, -1e9, 1.0, 0, 0, 0, 0.85, 0.92, hf(i, 65), 0.6, 1, 1, 1, 0);
        }
      }
      // 7. the ground front: dust (spray on water) thrown up by the blast wave, racing out and past the stage at tA
      if (surgeK > 0) {
        const span = Math.max(0.3, tA - t0), fr = tau / span;
        const R = WILD ? shockR(tau, Wkt * 1e6) * SC : dS * Math.pow(Math.max(0, fr), 0.72);
        const c3 = Math.cbrt(Wkt) * SC, hF = (14 + 60 * c3 * Math.exp(-R / (1800 * c3 + 1))) * (water ? 1.1 : 1) * surgeK;
        pushFront(F, R, camL, { n: 1100, h: hF, w: hF * 2.6, tint: water ? cols.white : cols.dust, gy: gyL, alpha: 0.62 * sstep(0, 0.05, fr), seed: 71, t, maxD: 12000, grow: 3000, span: 7000 });
      }
    }
    P.end(camera); F.end(camera);
  }
  update(0, 0, null);
  const farNeed = Math.hypot(dS, TOPH) + TOPH * 2 + 40000;
  return {
    root, radius: CAPR, height: TOPH, snapped: true, update, cues, farNeed, contact: false,
    flashAt: (t) => { const tau = t - t0; return tau < 0 ? 0 : clamp(1.4 * Math.exp(-tau / 0.12) + 0.5 * Math.exp(-tau / (tg * 1.5))); },
    anchors: {
      front: (t) => capPos(t), cap: (t) => capPos(t), burst: new THREE.Vector3(0, hB, 0), ground_zero: new THREE.Vector3(0, 0, 0),
      stem: (t) => { const q = Math.max(0, phaseAt(t)), H = headAt(q); return [at[0], base + stemTop(q, H) * 0.5, at[1]]; },
      top: (t) => { const H = headAt(Math.max(0, phaseAt(t))); return [at[0], base + H.hc + H.Th, at[1]]; },
    },
    subjectAt: () => capPos(t0 + grow), subjectTop: TOPH,
    planet: { center: () => new THREE.Vector3(at[0], base + TOPH * 0.5, at[1]), R: Math.max(TOPH, CAPR * 2) * 0.5 },   // QA: its true angular size (qa.js subject_small)
    info: { yield_kt: Wkt, yield: fmtYield(Wkt * 1000), burst, fireball_m: Math.round(Rfb * 2), top_m: Math.round(TOPH), cap_m: Math.round(CAPR * 2), t_flash: t0, t_arrive: tA, real_arrive_s: +realArr.toFixed(1) },
  };
}

export const CATALOG = {
  'fx.nuke': {
    desc: 'a NUCLEAR EXPLOSION at true scale from its yield: the flash brighter than the Sun (hard shadows swinging from it), the white-hot fireball cooling to yellow, orange and red as it boils, the Wilson condensation cloud flicking on round it for a second, the fireball rising and rolling into the toroidal MUSHROOM CAP (billows roll up the middle, out over the top and curl under the rim), the stem sucked up from the ground, white condensation collars round the stem, the ice cap over the rising head, and the dust skirt / base surge racing out along the ground past the stage (YOU at the world origin) at t_arrive. presets: hiroshima (15 kt air burst 580 m), nagasaki, trinity (tower), ivy_mike (10.4 Mt surface), castle_bravo (15 Mt on the reef: water), tsar_bomba (50 Mt air burst 4 km). The development is time-compressed: `grow` screen seconds from the flash to the mature mushroom',
    actions: ['detonate'],
    params: { preset: 'hiroshima|nagasaki|trinity|ivy_mike|castle_bravo|tsar_bomba|crossroads_able', yield: "'15 kt' | '50 Mt' (or tonnes TNT as a number)", burst: 'air|surface|tower|water', height: 'm burst height (air)', t: 's the flash', grow: 's to the mature mushroom (10)', phase: '0..1.5 already developed at t=0 (the flash was before the shot)', t_arrive: 's the dust front passes the stage', wilson: '0..1', rings: '0..3', cap: '0..1', surge: '0..1.5', stem: 'x thickness', warm: '0..1', scale: '0.02..1', light: 'x', shadows: 'bool', fireball_time: 's', fog: '0..1' },
    doc: {
      preset: 'a real test / bombing (sets yield, burst, height): hiroshima, nagasaki, trinity, ivy_mike, castle_bravo, tsar_bomba, crossroads_able',
      yield: "TNT equivalent: '15 kt', '1 Mt', '50 Mt' (a number = tonnes). Everything scales with it: fireball (15 kt: 410 m wide; 1 Mt: 2.2 km; 50 Mt: 10 km), cloud top (15 kt: 16 km; 1 Mt: 22 km; 10 Mt: 37 km; 50 Mt: 64 km), cap width, stem, timing",
      burst: 'air (fireball in the air, thin pale stem that grows up from the ground to meet the cap) | surface (the fireball sits on the ground: thick dark dirty stem) | tower (Trinity) | water (on a reef / sea: white spray surge, strong Wilson cloud)',
      t: 's: the flash (screen time)', grow: 's of screen time from the flash to the mature mushroom (default 10: the real ~10 minutes compressed); 4-6 = a fast dramatic rise',
      phase: 'start with the cloud already developed: 0.3 = rising head with the stem forming, 1 = the mature mushroom, 1.4 = spreading (the flash was before the shot; no flash in this shot)',
      t_arrive: 's (screen) when the dust front passes the stage (the world origin, where YOU stand); default the real delay capped at 6 s — pair with fx.shock_front / fx.window_blast / cast struck_fall and a camera shake at t_arrive',
      wilson: '0..1 the white condensation bubble in the first 1-2 s (default 0.85 over water, 0.35 on land)', rings: 'condensation collars round the stem (0..3)', cap: '0..1 the smooth white ice cap over the rising head (Castle / Redwing films)',
      surge: '0..1.5 the dust skirt at the foot + the ground front', warm: '0 grey-white mature cap .. 1 salmon-orange (Tsar Bomba / Castle film look)', scale: 'draw it smaller than true (0.35 = a whole 50 Mt cloud 20 km away from the ground)',
      height: 'm above ground (air burst; default 240 x kt^(1/3), max 4 km)', fireball_time: 's the fireball takes to grow (default by yield: 0.2 s for 15 kt .. 2.4 s for 50 Mt)',
    },
    footprint: [6000, 6000], height: 16000, snap: false, fly: true, contact: false,
    tags: ['fx', 'nuclear', 'nuke', 'atomic', 'bomb', 'hydrogen bomb', 'thermonuclear', 'mushroom cloud', 'fireball', 'explosion', 'blast', 'hiroshima', 'nagasaki', 'trinity', 'ivy mike', 'castle bravo', 'tsar bomba', 'test', 'detonation'],
    examples: [
      { note: 'Hiroshima seen from 12 km: the flash at 1 s, the mushroom rising over 9 s', spec: { look: { time: 'morning', sky: 'clear', haze: 0.25 }, world: { biome: 'plains', relief: 0.1 }, objects: [{ kind: 'fx.nuke', at: [0, -12000], preset: 'hiroshima', t: 1, grow: 9 }], camera: { move: 'keys', fov: 55, target: 'objects:0', keys: [{ t: 0, at: [0, 0], alt: 30, look_at: [0, -12000], look_h: 2500 }, { t: 10, at: [300, 200], alt: 45, look_at: [0, -12000], look_h: 7000 }] } } },
    ],
  },
};

export async function build(kind, item, ctx) {
  return buildNuke(item, ctx);
}
