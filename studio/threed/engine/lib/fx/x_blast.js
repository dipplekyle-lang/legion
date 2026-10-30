// x_blast.js — E5 (explosions kit, 30 Sep 2026): conventional explosions driven by their yield (TNT equivalent).
//   fx.explosion   any chemical explosion from a kilogram to kilotons, sized by `yield` (fireball ~0.75 m x kg^1/3,
//                  cloud and debris by the cube root): the flash, the fireball (orange, sooty; a fuel-air cloud burns
//                  big and long), the white condensation dome of the shock in humid air, the rising cloud (a small
//                  mushroom from tonnes up), the dust ring racing out, debris on ballistic arcs trailing smoke, a scorch.
//                  type tnt | thermobaric (MOAB) | ammonium_nitrate (Beirut: grey smoke turning red-brown before, the
//                  white dome, the black-orange fireball, the salmon mushroom) | ship (Halifax / Texas City: the burning
//                  ship, the white pillar, the harbour water thrown up) | industrial (Tianjin).
//   fx.firecracker a firecracker / M-80 / a string of crackers: the fuse fizzing, the bang (flash, sparks, torn red
//                  paper confetti, a puff of white smoke).
//   fx.dynamite    a bundle of dynamite sticks with a burning fuse, then the blast (rock and dirt thrown up, grey dust).
import * as THREE from 'three';
import { makeCPuffs, makeFireball, makeVeil, maskProxy, glow, burstLight, pushFront, parseYield, fmtYield, convDims, shockR, shockArrive, num, clamp, lerp, sstep, hf, bbody, headingYaw, DEG } from './x_common.js';
import { syncEnv, makeSparks, makeGrit, makeFlames } from './f_common.js';
import { curl3 } from './billow.js';
import { U, patchMaterial } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';

const TAU = Math.PI * 2;
const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// the look of each kind of explosive: cloud colour, how sooty the fireball is, how long it burns, cloud height factor
export const TYPES = {
  tnt: { fbK: 1, smoke: [0.24, 0.22, 0.21], dust: [0.58, 0.5, 0.42], soot: 0.55, burn: 1, topK: 1, wil: 0.1, debris: 1, fire: [1.0, 0.55, 0.18] },
  thermobaric: { fbK: 2.4, smoke: [0.3, 0.28, 0.27], dust: [0.6, 0.52, 0.43], soot: 0.4, burn: 3.2, topK: 1.5, wil: 0.15, debris: 0.55, fire: [1.0, 0.62, 0.2] },
  ammonium_nitrate: { fbK: 1.25, smoke: [0.7, 0.38, 0.24], dust: [0.66, 0.54, 0.44], soot: 0.45, burn: 1.2, topK: 1.05, wil: 1, debris: 1.25, fire: [1.0, 0.5, 0.16], pre: 'an' },
  ship: { fbK: 1.1, smoke: [0.86, 0.85, 0.84], dust: [0.72, 0.7, 0.68], soot: 0.3, burn: 1, topK: 1.3, wil: 0.55, debris: 1.35, fire: [1.0, 0.55, 0.2], pre: 'ship' },
  industrial: { fbK: 1.7, smoke: [0.25, 0.23, 0.22], dust: [0.52, 0.47, 0.42], soot: 0.5, burn: 2.2, topK: 1.2, wil: 0.15, debris: 1.2, fire: [1.0, 0.58, 0.2] },
};
const TYPE_ALIAS = { he: 'tnt', c4: 'tnt', high_explosive: 'tnt', bomb: 'tnt', fae: 'thermobaric', fuel_air: 'thermobaric', moab: 'thermobaric', an: 'ammonium_nitrate', fertilizer: 'ammonium_nitrate', beirut: 'ammonium_nitrate', harbour: 'ship', harbor: 'ship', tianjin: 'industrial', chemical: 'industrial' };
export const BLAST_PRESETS = {
  moab: { yield: '11 t', type: 'thermobaric', height: 2 },                 // GBU-43/B, 13 Apr 2017: 8.5 t of H6 ~ 11 t TNT
  beirut: { yield: '1.1 kt', type: 'ammonium_nitrate', pre: 5 },           // 4 Aug 2020, Hangar 12: 2,750 t AN (0.5-1.1 kt TNT)
  halifax: { yield: '2.9 kt', type: 'ship', pre: 5 },                      // SS Mont-Blanc, 6 Dec 1917, 09:04:35
  texas_city: { yield: '3.2 kt', type: 'ship', pre: 5, smoke: [0.62, 0.42, 0.26] },   // SS Grandcamp, 16 Apr 1947 (2,300 t AN)
  tianjin: { yield: '336 t', type: 'industrial' },                          // 12 Aug 2015, the second blast
  truck_bomb: { yield: '2 t', type: 'tnt' }, bomb_500lb: { yield: '0.12 t', type: 'tnt' }, tnt_1kg: { yield: '1 kg', type: 'tnt' },
};

async function buildExplosion(item, ctx) {
  const p0 = explicitParams(item, CATALOG['fx.explosion']);
  const pre0 = BLAST_PRESETS[String(p0.preset || '').toLowerCase().replace(/[\s-]+/g, '_')] || {};
  const p = { ...pre0, ...p0 };
  const tname = TYPE_ALIAS[String(p.type || 'tnt').toLowerCase()] || String(p.type || 'tnt').toLowerCase();
  const TY = { ...(TYPES[tname] || TYPES.tnt) };
  if (Array.isArray(p.smoke)) TY.smoke = p.smoke.map(Number);
  const at = item.at || [0, 0], G = ctx.ground, gy0 = G.height(at[0], at[1]);
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : null;
  const onWater = wl != null && wl >= gy0 - 0.3;
  const base = onWater ? wl : gy0;
  const root = new THREE.Group(); root.name = 'fx.explosion'; root.position.set(at[0], base, at[1]);
  const Wt = parseYield(p.yield, 1), kg = Wt * 1000, c = Math.cbrt(kg);
  const SC = clamp(num(p.scale, 1), 0.02, 1);
  const Rfb = 0.75 * c * TY.fbK * SC;
  const small = kg < 60;                                                   // a puff, not a mushroom
  const TOP = (small ? 6 * c : 17 * c * TY.topK) * SC;
  const hB = num(p.height, 0) * SC;
  const t0 = num(p.t, 1.5), preT = Math.max(0, num(p.pre, TY.pre ? 0 : 0));
  const grow = Math.max(1.2, num(p.grow, clamp(2 + 1.25 * Math.log10(Math.max(kg, 1)), 1.6, 10)));
  const tfb = clamp(0.012 * c, 0.04, 0.6) * (tname === 'thermobaric' ? 1.8 : 1);                    // screen s the fireball takes to grow
  const burnT = tfb * 3 * (tname === 'thermobaric' ? 1.6 : tname === 'industrial' ? 1.4 : 1) + 0.1;   // how long it glows
  const wilK = clamp(num(p.wilson, TY.wil), 0, 1.2), debK = clamp(num(p.debris, TY.debris), 0, 2), lightK = num(p.light, 1);
  const surf = String(p.surface || (onWater ? 'water' : 'dirt'));
  const dustC = surf === 'water' ? [0.93, 0.94, 0.96] : surf === 'sand' ? [0.75, 0.66, 0.52] : surf === 'concrete' ? [0.66, 0.64, 0.61] : surf === 'snow' ? [0.92, 0.93, 0.96] : TY.dust;
  const dS = Math.hypot(at[0], at[1]);
  const realArr = shockArrive(dS / SC, kg);
  const tA = num(p.t_arrive, t0 + Math.min(realArr, 5));

  const P = makeCPuffs(ctx, { count: 4600, near: Math.max(0.5, Rfb * 0.12), fog: small ? 1 : 0.7, groundFade: 0.06, softK: 0.3, heatHDR: 5, glow: TY.fire, order: 9.3, name: 'blast.cloud' });
  const F = makeCPuffs(ctx, { count: 900, near: 2, fog: 0.8, groundFade: 0.05, softK: 0.35, order: 10.2, name: 'blast.front' });
  const SP = makeSparks(ctx, { count: 1400, maxPx: 5, minPx: 1.3, order: 13 });
  const GR = makeGrit(ctx, { count: 1600, maxPx: 5, minPx: 1.2, order: 12 });
  const FL = makeFlames(ctx, { count: 90, hdr: 3, order: 11 });
  root.add(P.mesh, F.mesh, SP.mesh, GR.mesh, FL.mesh);
  const fb = makeFireball({ hdr: 6.5, amp: 0.12, cell: 2.2, order: 9.2, seed: 3.1 }); root.add(fb.mesh);
  const dome = makeVeil({ full: false, mottle: 0.35, rim: 1.25, order: 9.8, color: [0.9, 0.91, 0.93] }); root.add(dome.mesh);
  const flash = glow([1.0, 0.9, 0.7], 24), halo = glow([1.0, 0.75, 0.45], 23); root.add(flash, halo);
  const pxHead = maskProxy('sphere'), pxCol = maskProxy('cyl'), pxPre = maskProxy('cyl'); root.add(pxHead, pxCol, pxPre);
  const BL = burstLight(root, { shadows: p.shadows !== false && !small, color: [1.0, 0.75, 0.45], box: small ? 20 : 90 });
  const PL = new THREE.PointLight(new THREE.Color(1.0, 0.62, 0.3), 0, Math.max(8, Rfb * 40), 2); PL.userData.noGovern = true; root.add(PL);
  // scorch on the ground
  let scorch = null;
  if (!onWater && p.scorch !== false) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 6, 128, 128, 128); gr.addColorStop(0, 'rgba(8,6,5,0.92)'); gr.addColorStop(0.35, 'rgba(14,11,9,0.7)'); gr.addColorStop(0.75, 'rgba(20,16,12,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) { const a = hf(i, 3) * TAU, r0 = 20 + hf(i, 4) * 60, l = 20 + 40 * hf(i, 5); g.strokeStyle = `rgba(0,0,0,${0.1 + 0.2 * hf(i, 6)})`; g.lineWidth = 1 + 2 * hf(i, 7); g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a) * (r0 + l), 128 + Math.sin(a) * (r0 + l)); g.stroke(); }
    const S2 = Rfb * 3.2, geo = new THREE.PlaneGeometry(S2, S2, 24, 24).rotateX(-Math.PI / 2), PP = geo.attributes.position;
    for (let i = 0; i < PP.count; i++) PP.setY(i, G.height(PP.getX(i) + at[0], PP.getZ(i) + at[1]) - base + 0.04 + S2 * 0.0005);
    scorch = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    scorch.renderOrder = 3; scorch.userData.noQA = true; root.add(scorch);
  }
  const gyL = (x, z) => (onWater ? 0 : G.height(x + at[0], z + at[1]) - base);
  const cv3 = [0, 0, 0], sunV = new THREE.Vector3(), camL = new THREE.Vector3(), tmpC = new THREE.Color();
  const headAt = (q) => {
    const e = q < 1 ? q * q * (3 - 2 * q) : 1 + 0.05 * (q - 1);          // a thermal accelerates from rest, then slows
    const hc = lerp(Math.max(hB, Rfb * 0.55), TOP * 0.74, Math.min(1.05, e));
    const Rh = lerp(Rfb * 1.05, Math.max(Rfb * 1.2, TOP * (small ? 0.35 : 0.3)), Math.min(1.1, (1 - Math.exp(-2 * q)) / (1 - Math.exp(-2))));
    return { hc, Rh, Th: Rh * (small ? 0.8 : 0.62) };
  };
  const cues = [];
  if (preT > 0) cues.push({ t: +(t0 - preT).toFixed(2), sound: TY.pre === 'ship' ? 'fire_roar' : 'fire_crackle', gain: 0.6 });
  cues.push({ t: +t0.toFixed(2), sound: small ? 'explosion_small' : 'explosion_big', gain: 1 }, { t: +tA.toFixed(2), sound: 'shock_wave_boom', gain: small ? 0.5 : 1 });
  if (debK > 0 && !small) cues.push({ t: +(t0 + 1.5).toFixed(2), sound: 'debris_rain', gain: 0.6 });
  const headPos = (t) => { const q = Math.max(0, (t - t0) / grow), H = headAt(q); return [at[0], base + (t < t0 ? Math.max(hB, Rfb * 0.5) : H.hc), at[1]]; };
  // debris pieces: speed, direction, size; some trail smoke
  const ND = Math.round(clamp(260 * debK, 0, 600)), vD = Math.max(8, 26 * Math.pow(c, 0.42)) * Math.sqrt(SC) * (0.55 + 0.45 * Math.min(1, debK)), gD = 9.81 * SC;

  function update(t, clock, camera) {
    const tau = t - t0;
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    const q = Math.max(0, tau / grow), H = headAt(q);
    const src = new THREE.Vector3(0, Math.max(hB, Rfb * 0.4), 0);
    const fI = tau < 0 ? 0 : 1.5 * Math.exp(-tau / 0.035) + 0.35 * Math.exp(-tau / 0.25);
    flash.visible = halo.visible = fI > 0.005;
    flash.position.copy(src); halo.position.copy(src);
    flash.material.uniforms.uS.value = Rfb * 2.2; flash.material.uniforms.uMinPx.value = 900 * Math.min(1, fI) * (small ? 0.35 : 1); flash.material.uniforms.uI.value = 2.6 * fI;
    halo.material.uniforms.uS.value = Rfb * 5; halo.material.uniforms.uMinPx.value = 1200 * Math.min(1, fI * fI) * (small ? 0.3 : 1); halo.material.uniforms.uI.value = 0.45 * Math.min(1.4, fI);
    BL.aim(camera, src, tau < 0 ? 0 : lightK * (small ? 2.5 : 8) * (Math.exp(-tau / 0.05) + 0.5 * Math.exp(-tau / burnT)));
    PL.position.copy(src); PL.intensity = tau < 0 ? 0 : lightK * 60 * Rfb * Rfb * (Math.exp(-tau / 0.04) * 3 + Math.exp(-tau / burnT));
    // the fireball core (a hot ball for the first instants)
    const fbR = tau < 0 ? 0 : Rfb * Math.min(1, Math.pow(tau / tfb, 0.45));
    fb.mesh.visible = tau >= 0 && tau < burnT * 1.15; fb.mesh.position.copy(src); fb.mesh.position.y = Math.max(hB, fbR * 0.35);
    fb.mesh.scale.set(fbR, fbR * (hB > fbR ? 1 : 0.8), fbR);
    fb.uni.uT.value = clamp(0.95 - 0.5 * sstep(0, burnT, tau)); fb.uni.uTime.value = t; fb.uni.uI.value = 1 - sstep(burnT * 0.4, burnT * 1.1, tau); fb.uni.uGround.value = root.position.y - 0.2;
    // the condensation dome (the shock front made visible in humid air)
    const rW = shockR(Math.max(0, tau), kg) * SC * 0.97, wA = wilK * sstep(0.01, 0.08, tau) * (1 - sstep(0.45, 1.3, tau));
    dome.mesh.visible = wA > 0.01; dome.mesh.position.set(0, 0, 0); dome.mesh.scale.set(rW, rW * 0.9, rW); dome.uni.uA.value = wA * 0.72; dome.uni.uTime.value = t; dome.uni.uGround.value = root.position.y - 0.5;
    if (scorch) scorch.material.opacity = 0.85 * sstep(0, 0.3, tau);
    // mask proxies: the fireball / rising cloud, its column, the smoke column of the fire before
    { const on = tau >= 0, lift = sstep(burnT * 0.4, burnT * 2 + grow * 0.25, tau), y = lerp(Math.max(hB, Rfb * 0.5), H.hc, lift), r = lerp(Math.max(fbR, Rfb * 0.6), H.Rh, lift);
      pxHead.visible = on; pxHead.position.set(0, y, 0); pxHead.scale.set(r, lerp(r * 0.85, H.Th, lift), r);
      const yT = H.hc - H.Th * 0.4; pxCol.visible = on && !small && lift > 0.3 && yT > 1; pxCol.position.set(0, yT / 2, 0); pxCol.scale.set(H.Rh * 0.25, Math.max(1, yT), H.Rh * 0.25);
      const Hs = Math.max(TOP * 0.35, 40 * SC), Rs = Math.max(Rfb * 0.35, 4 * SC); pxPre.visible = preT > 0 && !!TY.pre && tau < 0.3 && tau > -preT; pxPre.position.set(0, Hs / 2, 0); pxPre.scale.set(Rs * 2.5, Hs, Rs * 2.5); }
    if (!camera) return;
    syncEnv(ctx);
    camera.getWorldPosition(camL); camL.sub(root.position);
    sunV.copy(U.uSunDir.value);
    P.begin(); F.begin(); SP.begin(); GR.begin(); FL.begin(t);
    const side = (x, y, z, l) => (x * sunV.x + y * sunV.y + z * sunV.z) / Math.max(l, 1e-3);
    // ── before: the fire (ammonium nitrate: grey smoke turning red-brown; ship: black smoke and flames) ──
    if (preT > 0 && TY.pre && tau < 0.6) {
      const since = tau + preT + (p.burning === false ? 0 : 40), on = sstep(0, 0.8, since) * (1 - sstep(0.1, 0.6, tau));
      const Hs = Math.max(TOP * 0.35, 40 * SC), Rs = Math.max(Rfb * 0.35, 4 * SC), wx = (ctx.wind ? ctx.wind.x : 3) * 1.6 * SC, wz = (ctx.wind ? ctx.wind.z : 1) * 1.6 * SC;
      const red = TY.pre === 'an' ? sstep(-3.2, -1.2, tau) : 0;
      const col0 = TY.pre === 'ship' ? [0.2, 0.18, 0.17] : [0.8, 0.79, 0.77], col1 = [0.74, 0.4, 0.24];
      for (let i = 0; i < 700; i++) {
        const L = 14, age = ((since + hf(i, 91) * L) % L), f = age / L;
        if (age > since + 0.01) continue;
        const up = Hs * Math.pow(f, 0.75), rr = Rs * (0.4 + 2.6 * f) * Math.sqrt(hf(i, 92)), a = hf(i, 93) * TAU;
        curl3(i * 0.013, up / (Rs * 3) - t * 0.08, hf(i, 94) * 3, 7, cv3);
        const x = Math.cos(a) * rr + wx * age + cv3[0] * Rs * 0.6, z = Math.sin(a) * rr + wz * age + cv3[2] * Rs * 0.6, y = Math.max(hB, 0) + Rs * 0.5 + up;
        const cc = mix3(col0, col1, red * (0.55 + 0.45 * (1 - f)));
        const sz = Rs * (0.7 + 2.2 * f) * (0.7 + 0.5 * hf(i, 95));
        P.push(x, y, z, sz, hf(i, 96) * 6.28 + age * 0.05, 0.8 * on * (1 - sstep(0.75, 1, f)), i & 3, -1e9, 0.95, f < 0.12 ? 0.6 : 0, 0, 0.1, clamp(0.2 + 0.5 * f), clamp(0.4 + 0.5 * sstep(-0.4, 0.6, side(Math.cos(a), 0.3, Math.sin(a), 1))), hf(i, 97), 0.35,
          cc[0], cc[1], cc[2], 0);
      }
      for (let i = 0; i < 40; i++) FL.push((hf(i, 101) - 0.5) * Rs * 2.2, Math.max(hB, 0), (hf(i, 102) - 0.5) * Rs * 2.2, Rs * (0.5 + 0.9 * hf(i, 103)), Rs * (0.35 + 0.3 * hf(i, 104)), hf(i, 105), 0.45 * on, 0.45);
      // pops: fireworks / drums going off in the fire (bursts of sparks)
      for (let k = 0; k < 10; k++) {
        const tp = -preT + hf(k, 111) * (preT - 0.3), dt = tau - tp;
        if (dt < 0 || dt > 0.9) continue;
        const ox = (hf(k, 112) - 0.5) * Rs * 2, oz = (hf(k, 113) - 0.5) * Rs * 2, oy = Rs * (0.5 + 2 * hf(k, 114));
        for (let j = 0; j < 40; j++) {
          const a = hf(j + k * 50, 115) * TAU, e = (hf(j + k * 50, 116) - 0.3) * 2.2, v = Rs * (3 + 5 * hf(j + k * 50, 117)), kk = 1 - dt / 0.9;
          SP.push(ox + Math.cos(a) * Math.cos(e) * v * dt, oy + Math.sin(e) * v * dt - 4 * dt * dt * SC, oz + Math.sin(a) * Math.cos(e) * v * dt, 3.2 * kk, 2.4 * kk, 1.4 * kk, 0.05 * SC + Rs * 0.01);
        }
      }
    }
    if (tau >= 0) {
      const fr = tau / Math.max(0.05, tfb);
      // 1. the fireball + soot: billows flung out from the centre, hot, cooling to smoke while the cloud rises
      const NF = 900, cool = sstep(burnT * 0.3, burnT * 1.6, tau);
      for (let i = 0; i < NF; i++) {
        const a = hf(i, 1) * TAU, cz = hf(i, 2) * (hB > Rfb ? 2 : 1) - (hB > Rfb ? 1 : 0), s = Math.sqrt(Math.max(0, 1 - cz * cz));
        const rr = Rfb * (0.35 + 0.75 * Math.pow(hf(i, 3), 0.6)) * (1 - Math.exp(-fr * 1.6)) * (1 + 0.25 * sstep(1, 6, fr));
        // after the burst the billows are carried up into the rising head
        const lift = sstep(burnT * 0.4, burnT * 2 + grow * 0.25, tau);
        let x = Math.cos(a) * s * rr, y = Math.max(hB, 0) + cz * rr * 0.85 + rr * 0.15, z = Math.sin(a) * s * rr;
        const hx = Math.cos(a) * s * H.Rh * 0.8 * Math.sqrt(hf(i, 4)), hy = H.hc + cz * H.Th * 0.7, hz = Math.sin(a) * s * H.Rh * 0.8 * Math.sqrt(hf(i, 4));
        x = lerp(x, hx, lift); y = lerp(y, hy, lift); z = lerp(z, hz, lift);
        curl3(x / (Rfb * 1.5) + i * 0.01, y / (Rfb * 1.5) - t * 0.2, z / (Rfb * 1.5), 5, cv3);
        x += cv3[0] * Rfb * 0.25; y += cv3[1] * Rfb * 0.2; z += cv3[2] * Rfb * 0.25;
        const sootP = hf(i, 5) < TY.soot, hot = clamp(1 - cool * (sootP ? 1.4 : 1)) * (sootP ? 0.6 : 1);
        const cc = sootP ? TY.smoke.map((v) => v * 0.55) : mix3(TY.smoke, dustC, 0.35);
        const sz = lerp(Rfb * (0.3 + 0.25 * hf(i, 6)), H.Rh * (0.28 + 0.2 * hf(i, 6)), lift) * (0.6 + 0.4 * Math.min(1, fr));
        const occ = clamp(0.3 + 0.6 * sstep(-0.4, 0.6, side(x, y - H.hc * lift, z, Math.hypot(x, y - H.hc * lift, z))));
        P.push(x, y, z, sz, hf(i, 7) * 6.28 + tau * 0.3 * (hf(i, 8) - 0.5), 0.95 * sstep(0, 0.4, fr), i & 3, -1e9, 0.9, 0.9 * hot, hot, 0.05, clamp(0.05 + 0.25 * cool * lift), occ, hf(i, 9), 0.3 * (1 - occ),
          cc[0], cc[1], cc[2], clamp(0.35 + 0.6 * (1 - cool) * (1 - 0.5 * sstep(0, 3, fr))));
      }
      // 2. the rising cloud: head + column (tonnes up: a small mushroom), dust sucked up behind it
      if (!small || kg > 5) {
        const NH = small ? 200 : 1100, colC = mix3(TY.smoke, dustC, 0.3);
        for (let i = 0; i < NH; i++) {
          const th = hf(i, 21) * TAU, ph = hf(i, 22) * TAU - q * 2.2 * (0.7 + 0.6 * hf(i, 23)), u = 0.7 + 0.3 * hf(i, 24);
          const tor = sstep(0.1, 0.5, q), Rt = 0.45 * H.Rh * tor, rt = H.Rh - Rt;
          const cph = Math.cos(ph), sph = Math.sin(ph);
          let r = Rt + rt * u * cph, y = H.hc + H.Th * u * sph * (sph < 0 ? 0.6 : 1);
          curl3(Math.cos(th) * 2, ph * 0.5 + t * 0.06, Math.sin(th) * 2, 13, cv3);
          r += cv3[0] * rt * 0.14; y += cv3[1] * H.Th * 0.12;
          const x = Math.cos(th) * r, z = Math.sin(th) * r;
          const occ = clamp((0.22 + 0.72 * sstep(-0.45, 0.65, Math.cos(th) * cph * sunV.x + sph * sunV.y + Math.sin(th) * cph * sunV.z)) * (sph < 0 ? 0.7 : 1));
          const al = 0.9 * sstep(burnT * 0.5, burnT * 1.6 + 0.3, tau);
          const hot = 0.6 * Math.exp(-tau / (burnT * 1.5)) * (sph < 0 ? 1 : 0.4);
          P.push(x, y, z, rt * (0.26 + 0.2 * hf(i, 25)), hf(i, 26) * 6.28, al, i & 3, -1e9, 0.9, hot, hot * 0.8, 0, clamp(0.08 + 0.2 * q), occ, hf(i, 27), 0.3 * (1 - occ),
            colC[0], colC[1], colC[2], 0.45);
        }
        // the column
        const yTop = H.hc - H.Th * 0.4, rs = H.Rh * 0.22;
        if (yTop > rs) for (let i = 0; i < (small ? 120 : 600); i++) {
          const f = (hf(i, 31) + tau * 0.22 * (0.8 + 0.4 * hf(i, 32))) % 1, y = f * yTop;
          const flare = 1 + 1.4 * Math.pow(1 - f, 4) + 1.2 * sstep(0.8, 1, f);
          const rr = rs * flare * Math.sqrt(hf(i, 33)) * 0.8, a = hf(i, 34) * TAU;
          const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
          const occ = clamp(0.3 + 0.6 * sstep(-0.5, 0.6, Math.cos(a) * sunV.x + Math.sin(a) * sunV.z));
          const cc = mix3(dustC, colC, sstep(0.2, 0.9, f));
          P.push(x, y + gyL(x, z) * (1 - f), z, rs * flare * (0.6 + 0.35 * hf(i, 35)), hf(i, 36) * 6.28, 0.85 * sstep(0, 0.05, f) * sstep(0.1, 0.5, q) * (1 - sstep(0.93, 1, f)), i & 3, -1e9, 0.9, 0, 0, 0.1, 0.15 + 0.2 * q, occ, hf(i, 37), 0.3,
            cc[0], cc[1], cc[2], 0);
        }
      }
      // 3. the ground ring: dust (spray on water) pushed out along the ground, slowing and lingering
      const Rr = Math.min(shockR(tau, kg) * SC, Rfb * 9 + tau * 30 * SC) * 0.8;
      for (let i = 0; i < (small ? 160 : 520); i++) {
        const a = hf(i, 41) * TAU, k = hf(i, 42), rr = Rr * (0.55 + 0.45 * Math.sqrt(k));
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr, g = gyL(x, z);
        const hgt = Rfb * (0.25 + 0.5 * hf(i, 43)) * (0.5 + 0.8 * sstep(0, 2, tau)), sz = Rfb * (0.3 + 0.3 * hf(i, 44)) * (0.6 + 0.6 * sstep(0, 3, tau));
        const occ = clamp(0.5 + 0.45 * sstep(-0.4, 0.6, Math.cos(a) * sunV.x + Math.sin(a) * sunV.z + sunV.y * 0.5));
        F.push(x, g + hgt * 0.4 + sz * 0.3, z, sz, hf(i, 45) * 6.28 + tau * 0.1, 0.7 * sstep(0, 0.15, tau) * (1 - 0.6 * sstep(3, 8, tau)) * (1 - 0.5 * k), i & 3, -1e9, 0.95, 0, 0, -0.1, clamp(0.25 + 0.1 * tau), occ, hf(i, 46), 0.4,
          dustC[0], dustC[1], dustC[2], 0);
      }
      // 4. the front passing the stage (only when the stage is far from the blast)
      if (dS > Rfb * 6 && tau < (tA - t0) * 1.6 + 2) {
        const fr2 = tau / Math.max(0.2, tA - t0), R = dS * Math.pow(fr2, 0.75), hF = clamp(3 + c * 0.35, 2, 120) * SC;
        if (R > Rr) pushFront(F, R, camL, { n: 380, h: hF, w: hF * 2.2, tint: dustC, gy: gyL, alpha: 0.6 * sstep(0, 0.1, fr2), seed: 131, t, maxD: 6000, grow: 2500, span: 3000 });
      }
      // 5. debris: chunks on ballistic arcs, the big ones trailing smoke; glowing fragments as sparks
      for (let i = 0; i < ND; i++) {
        const a = hf(i, 51) * TAU, el = (0.25 + 1.15 * hf(i, 52)) * (onWater ? 1.2 : 1), v = vD * (0.3 + 0.9 * Math.pow(hf(i, 53), 1.5));
        const vy = Math.sin(el) * v, vh = Math.cos(el) * v, tl = 2 * vy / gD;
        const tt = Math.min(tau, tl), y = vy * tt - 0.5 * gD * tt * tt, h = vh * tt, landed = tau >= tl;
        if (tau > tl + 6) continue;
        const x = Math.cos(a) * (h + Rfb * 0.2), z = Math.sin(a) * (h + Rfb * 0.2), g = landed ? gyL(x, z) : 0;
        const size = (0.02 + 0.08 * Math.pow(hf(i, 54), 2)) * c * 0.25 * SC + 0.01;
        GR.push(x, Math.max(g, Math.max(hB, 0) + y) + 0.02, z, 0.1, 0.09, 0.08, size);
        if (i < 34 && !small && !landed) {                                  // smoke streamers behind the big pieces
          for (let j = 1; j <= 7; j++) {
            const tb = tt - j * 0.09 * (1 + tt * 0.3); if (tb < 0) break;
            const yb = vy * tb - 0.5 * gD * tb * tb, hb = vh * tb;
            const age = tt - tb, sz = Math.min(size * 3 + age * c * 0.06 * SC, Rfb * 0.35);
            P.push(Math.cos(a) * (hb + Rfb * 0.2), Math.max(hB, 0) + yb, Math.sin(a) * (hb + Rfb * 0.2), sz, hf(i * 9 + j, 55) * 6.28, 0.4 * (1 - j / 8) * (1 - sstep(1.5, 4, tt)), (i + j) & 3, -1e9, 0.7, 0, 0, 0, 0.3 + 0.3 * age, 0.6, hf(i * 9 + j, 56), 0.3,
              TY.smoke[0] * 0.8, TY.smoke[1] * 0.8, TY.smoke[2] * 0.8, 0);
          }
        }
        if (i < 220 && tau < 1.2 + tl * 0.5 && !landed) { const k = Math.exp(-tau / 0.8); SP.push(x, Math.max(hB, 0) + y, z, 3.2 * k, 1.9 * k, 0.8 * k, size * 0.8); }
      }
    }
    P.end(camera); F.end(camera); SP.end(); GR.end(); FL.end();
  }
  update(0, 0, null);
  return {
    root, radius: Math.max(Rfb * 3, TOP * 0.35), height: TOP, snapped: true, update, cues, contact: false, farNeed: dS + TOP * 3 + 2000,
    flashAt: (t) => { const tau = t - t0; return tau < 0 ? 0 : clamp(1.3 * Math.exp(-tau / 0.08) + 0.3 * Math.exp(-tau / burnT)); },
    anchors: { front: (t) => headPos(t), cloud: (t) => headPos(t), blast: new THREE.Vector3(0, Math.max(hB, Rfb * 0.4), 0), ground_zero: new THREE.Vector3(0, 0, 0) },
    planet: TOP > 150 ? { center: () => new THREE.Vector3(at[0], base + TOP * 0.45, at[1]), R: TOP * 0.45 } : undefined,
    info: { yield: fmtYield(Wt), type: tname, fireball_m: +(Rfb * 2).toFixed(2), cloud_top_m: Math.round(TOP), t: t0, t_arrive: tA },
  };
}

// ── fx.firecracker ───────────────────────────────────────────────────────────────────────────────────────────────
async function buildFirecracker(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.firecracker']);
  const at = item.at || [0, 0], G = ctx.ground;
  const variant = String(p.variant || 'm80').toLowerCase();
  const n = variant === 'string' ? Math.round(clamp(num(p.count, 30), 2, 120)) : 1;
  const root = new THREE.Group(); root.name = 'fx.firecracker';
  root.position.set(at[0], G.height(at[0], at[1]) + num(p.elev, 0), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const t0 = num(p.t, 1.5), fuse = num(p.fuse, variant === 'string' ? 0.6 : 1.4), K = variant === 'm80' ? 1 : variant === 'cherry_bomb' ? 0.9 : 0.45;
  // the cracker(s): red paper tubes with a green fuse; a string hangs as a braided line of small crackers
  const red = stdM({ color: 0xb3171b, roughness: 0.7 }), paper = stdM({ color: 0xd8c9a6, roughness: 0.9 }), green = stdM({ color: 0x3f7d3a, roughness: 0.6 });
  const tubes = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    if (variant === 'string') {
      const L = 0.035, R = 0.0045;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 10), red); m.rotation.z = Math.PI / 2 * (i % 2 ? 1 : -1) * 0.8; g.add(m);
      g.position.set((i % 2 ? 0.012 : -0.012), 0.02 + i * 0.012, 0);
    } else if (variant === 'cherry_bomb') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 20, 14), red); m.position.y = 0.0125; g.add(m);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.04, 6), green); f.position.set(0, 0.035, 0); f.rotation.z = 0.3; g.add(f);
    } else {
      const L = variant === 'm80' ? 0.038 : 0.03, R = variant === 'm80' ? 0.0075 : 0.004;
      const cut = p.cutaway === true;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 18, 1, cut, 0, cut ? Math.PI : TAU), cut ? stdM({ color: 0xb3171b, roughness: 0.7, side: THREE.DoubleSide }) : red); m.rotation.z = Math.PI / 2; m.position.y = R; g.add(m);
      if (cut) { const pw = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.8, R * 0.8, L * 0.7, 14, 1, false, 0, Math.PI), stdM({ color: 0x1c1b1a, roughness: 0.95 })); pw.rotation.z = Math.PI / 2; pw.position.y = R; g.add(pw);
        const gr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), stdM({ color: 0x2a2826, roughness: 0.9 }), 120); const mm = new THREE.Matrix4();
        for (let k = 0; k < 120; k++) { mm.compose(new THREE.Vector3((hf(k, 3) - 0.5) * L * 0.68, R + (hf(k, 4) - 0.2) * R * 0.7, -hf(k, 5) * R * 0.2), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(R * (0.06 + 0.08 * hf(k, 6)))); gr.setMatrixAt(k, mm); } g.add(gr); }
      for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.002, 18), paper); cap.rotation.z = Math.PI / 2; cap.position.set(s * L / 2, R, 0); g.add(cap); }
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.05, 6), green); f.position.set(0, R + 0.022, 0); f.rotation.x = 0.35; g.add(f);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.noQA = true; } });
    root.add(g); tubes.push(g);
  }
  if (variant === 'string') { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, n * 0.012 + 0.08, 6), green); br.position.y = (n * 0.012 + 0.08) / 2; root.add(br); }
  const P = makeCPuffs(ctx, { count: 60 * n + 40, near: 0.04, fog: 1, groundFade: 0.3, softK: 0.2, order: 10.4 });
  const SP = makeSparks(ctx, { count: 90 * n + 120, maxPx: 5, minPx: 1.2, order: 13 });
  const GR = makeGrit(ctx, { count: 70 * n, maxPx: 5, minPx: 1.3, order: 12 });
  root.add(P.mesh, SP.mesh, GR.mesh);
  const L = new THREE.PointLight(new THREE.Color(1, 0.8, 0.55), 0, 4, 2); L.userData.noGovern = true; root.add(L);
  const bang = (i) => t0 + (variant === 'string' ? fuse + i * 0.055 + (hf(i, 7) - 0.5) * 0.04 : fuse);
  const cues = variant === 'string' ? [{ t: +t0.toFixed(2), sound: 'fuse_fizz', gain: 0.5 }, { t: +bang(0).toFixed(2), sound: 'firecracker_string', gain: 0.9 }] : [{ t: +t0.toFixed(2), sound: 'fuse_fizz', gain: 0.5 }, { t: +bang(0).toFixed(2), sound: 'firecracker_bang', gain: 1 }];
  const wp = new THREE.Vector3();
  function update(t, clock, camera) {
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    syncEnv(ctx);
    P.begin(); SP.begin(); GR.begin();
    let li = 0;
    for (let i = 0; i < n; i++) {
      const tb = bang(i), x = t - tb, tub = tubes[i];
      tub.visible = x < 0;
      const sw = x > -0.012 && x < 0 ? 1 + 0.35 * sstep(-0.012, 0, x) : 1;     // the gas swells the tube for a few ms (slow motion shows it)
      tub.scale.set(1, sw, sw);
      tub.getWorldPosition(wp); root.worldToLocal(wp);
      const ox = wp.x, oy = wp.y + 0.01, oz = wp.z;
      // the fuse fizzing: a spray of tiny sparks (only for the first / single cracker, or the fuse end of a string)
      if (x < 0 && t > t0 && (i === 0 || variant !== 'string')) for (let j = 0; j < 30; j++) {
        const age = (t * 7 + hf(j, 1)) % 1 * 0.14, a = hf(j, 2) * TAU, v = 0.3 + 0.6 * hf(j, 3), k = 1 - age / 0.14;
        SP.push(ox + Math.cos(a) * v * age, oy + 0.03 * K + v * age * 0.8 - 2 * age * age, oz + Math.sin(a) * v * age, 3.5 * k, 2.4 * k, 1.1 * k, 0.003);
      }
      if (x < 0 || x > 4) continue;
      // bang: a white-hot flash, sparks, torn red paper confetti, a puff of white-grey smoke
      li = Math.max(li, x < 0.02 ? 1 : Math.exp(-(x - 0.02) / 0.03));
      if (x < 0.25) for (let j = 0; j < 90; j++) {
        const a = hf(j + i * 97, 11) * TAU, e = (hf(j + i * 97, 12) - 0.2) * 2.4, v = (4 + 10 * hf(j + i * 97, 13)) * K, life = 0.05 + 0.18 * hf(j + i * 97, 14);
        if (x > life) continue; const k = 1 - x / life;
        SP.push(ox + Math.cos(a) * Math.cos(e) * v * x, oy + Math.sin(e) * v * x - 4.9 * x * x, oz + Math.sin(a) * Math.cos(e) * v * x, 4 * k, 3 * k, 1.8 * k, 0.004);
      }
      for (let j = 0; j < 70; j++) {                                        // paper bits: flutter down with drag, then lie
        const a = hf(j + i * 71, 21) * TAU, e = 0.3 + 1.1 * hf(j + i * 71, 22), v = (1.5 + 3.5 * hf(j + i * 71, 23)) * K, tau = 0.25;
        const hd = v * Math.cos(e) * tau * (1 - Math.exp(-x / tau)), up = v * Math.sin(e) * tau * (1 - Math.exp(-x / tau)) - 0.6 * Math.max(0, x - 0.1);
        const y = Math.max(0.002, oy + up + 0.01 * Math.sin(x * 12 + j));
        const rr = hf(j + i * 71, 24) < 0.7;
        GR.push(ox + Math.cos(a) * hd, y, oz + Math.sin(a) * hd, rr ? 0.6 : 0.85, rr ? 0.06 : 0.78, rr ? 0.05 : 0.6, 0.004 + 0.006 * hf(j + i * 71, 25));
      }
      for (let j = 0; j < 22; j++) {                                        // smoke
        const a = hf(j + i * 31, 31) * TAU, r = (0.04 + 0.12 * hf(j + i * 31, 32)) * K * (1 - Math.exp(-x / 0.06)), sz = (0.05 + 0.06 * hf(j + i * 31, 33)) * K * (1 + 1.6 * Math.min(1, x / 1.5));
        const dr = Math.max(0, x - 0.2) * 0.12;
        P.push(ox + Math.cos(a) * r + dr, oy + 0.03 * K + r * 0.6 + x * 0.1 * K, oz + Math.sin(a) * r, sz, hf(j + i * 31, 34) * 6.28, 0.65 * sstep(0, 0.03, x) * (1 - sstep(1.2, 3.5, x)), j & 3, -1e9, 1.0, 0, x < 0.06 ? 0.9 : 0, 0, clamp(0.2 + 0.3 * x), 0.8, hf(j + i * 31, 35), 0.3, 0.9, 0.9, 0.9, 0.9);
      }
    }
    L.position.set(0, 0.05, 0); L.intensity = 90 * li * K;
    P.end(camera); SP.end(); GR.end();
  }
  update(0, 0, null);
  return { root, radius: 0.3, height: 0.2, snapped: true, update, cues, contact: false, anchors: { cracker: new THREE.Vector3(0, 0.01, 0) }, flashAt: (t) => { const x = t - bang(0); return x < 0 || x > 0.2 ? 0 : 0.6; } };
}

// ── fx.dynamite ──────────────────────────────────────────────────────────────────────────────────────────────────
async function buildDynamite(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.dynamite']);
  const at = item.at || [0, 0], G = ctx.ground;
  const sticks = Math.round(clamp(num(p.sticks, 3), 1, 24)), t0 = num(p.t, 1.0), fuse = num(p.fuse, 2.5);
  const root = new THREE.Group(); root.name = 'fx.dynamite';
  root.position.set(at[0], G.height(at[0], at[1]) + num(p.elev, 0), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  // the bundle: red paper sticks (20 cm x 3.2 cm) lying on the ground, taped, one blasting cap with the fuse coiling off
  const bundle = new THREE.Group(); root.add(bundle);
  const paperM = stdM({ color: 0xa3261f, roughness: 0.75 }), endM = stdM({ color: 0xcfc3a5, roughness: 0.9 }), tapeM = stdM({ color: 0x2b2b2d, roughness: 0.55 }), fuseM = stdM({ color: 0x6b5a3a, roughness: 0.9 }), capM = stdM({ color: 0xb8a57a, metalness: 0.7, roughness: 0.35 });
  const Rs = 0.016, Ls = 0.2, cols = Math.ceil(Math.sqrt(sticks)), pos = [];
  for (let i = 0; i < sticks; i++) { const r = Math.floor(i / cols), c2 = i % cols; pos.push([(c2 - (cols - 1) / 2) * Rs * 2.05 + (r % 2 ? Rs : 0), Rs + r * Rs * 1.75]); }
  for (const [x, y] of pos) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(Rs, Rs, Ls, 16), paperM); s.rotation.x = Math.PI / 2; s.position.set(x, y, 0); s.castShadow = true; bundle.add(s);
    for (const e of [-1, 1]) { const en = new THREE.Mesh(new THREE.CircleGeometry(Rs * 0.98, 16), endM); en.position.set(x, y, e * (Ls / 2 + 0.0005)); en.rotation.y = e > 0 ? 0 : Math.PI; bundle.add(en); }
  }
  const bw = cols * Rs * 2.1 + 0.004, bh = Math.max(...pos.map((q) => q[1])) + Rs + 0.002;
  for (const z of [-0.05, 0.05]) { const tp = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.022), tapeM); tp.position.set(0, bh / 2, z); bundle.add(tp); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.04, 10), capM); cap.rotation.x = Math.PI / 2; cap.position.set(pos[0][0], pos[pos.length - 1][1] + Rs * 0.2, Ls / 2 + 0.01); bundle.add(cap);
  const fusePts = [];
  for (let k = 0; k <= 30; k++) { const u = k / 30; fusePts.push(new THREE.Vector3(pos[0][0] + Math.sin(u * 5) * 0.05 * u, Math.max(0.004, pos[pos.length - 1][1] * (1 - u) + 0.004), Ls / 2 + 0.03 + u * 0.55)); }
  const curve = new THREE.CatmullRomCurve3(fusePts);
  const fuseMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.0028, 6, false), fuseM); fuseMesh.castShadow = true; root.add(fuseMesh);
  bundle.traverse((o) => { if (o.isMesh) o.userData.noQA = true; }); fuseMesh.userData.noQA = true;
  const SP = makeSparks(ctx, { count: 160, maxPx: 5, minPx: 1.3, order: 13 }), PS = makeCPuffs(ctx, { count: 90, near: 0.05, fog: 1, order: 10.5 });
  root.add(SP.mesh, PS.mesh);
  const FL = new THREE.PointLight(new THREE.Color(1, 0.75, 0.4), 0, 2.5, 2); FL.userData.noGovern = true; root.add(FL);
  // the blast itself: an fx.explosion of the bundle's TNT equivalent (a stick ~ 0.19 kg of dynamite ~ 0.25 kg TNT)
  const tB = t0 + fuse, yieldT = num(p.yield_kg, sticks * 0.25) / 1000;
  const ex = await buildExplosion({ ...item, kind: 'fx.explosion', params: {}, yield: yieldT, t: tB, type: 'tnt', surface: p.surface || 'rock', debris: num(p.debris, 1.3), pre: 0, heading: 0, at: item.at, scale: 1 }, ctx);
  ex.root.position.set(0, 0, 0); root.add(ex.root);
  const wp = new THREE.Vector3();
  function update(t, clock, camera) {
    const burnt = clamp((t - t0) / fuse);                                   // the fuse burns from its free end to the cap
    const u = 1 - burnt; curve.getPointAt(Math.max(0.001, u), wp);
    bundle.visible = t < tB; fuseMesh.visible = t < tB;
    fuseMesh.geometry.setDrawRange(0, Math.floor(u * fuseMesh.geometry.index.count / 3) * 3);
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    SP.begin(); PS.begin(); syncEnv(ctx);
    if (t > t0 && t < tB) {
      for (let j = 0; j < 60; j++) { const age = ((t * 9 + hf(j, 1)) % 1) * 0.16, a = hf(j, 2) * TAU, v = 0.4 + 0.8 * hf(j, 3), k = 1 - age / 0.16; SP.push(wp.x + Math.cos(a) * v * age, wp.y + 0.01 + v * age * 0.9 - 3 * age * age, wp.z + Math.sin(a) * v * age, 4 * k, 2.6 * k, 1 * k, 0.004); }
      for (let j = 0; j < 30; j++) { const age = ((t * 0.9 + hf(j, 5)) % 1) * 1.6; const x = wp.x + age * 0.05 + (hf(j, 6) - 0.5) * 0.02, y = wp.y + 0.02 + age * 0.3, z = wp.z; PS.push(x, y, z, 0.015 + age * 0.05, hf(j, 7) * 6, 0.35 * (1 - age / 1.6), j & 3, -1e9, 1, 0, 0, 0.2, 0.5, 0.8, hf(j, 8), 0.3, 0.85, 0.85, 0.85, 0); }
      FL.position.copy(wp); FL.intensity = 1.2 + 0.4 * Math.sin(t * 40);
    } else FL.intensity = 0;
    SP.end(); PS.end(camera);
    ex.update(t, clock, camera);
  }
  update(0, 0, null);
  return { root, radius: 1, height: 0.4, snapped: true, update, contact: false, cues: [{ t: +t0.toFixed(2), sound: 'fuse_fizz', gain: 0.6 }, ...ex.cues.filter((q) => q.t >= tB - 0.01)],
    flashAt: ex.flashAt, anchors: { bundle: new THREE.Vector3(0, 0.05, 0), fuse: (t) => { const u = 1 - clamp((t - t0) / fuse); curve.getPointAt(Math.max(0.001, u), wp); const w = wp.clone(); root.localToWorld(w); return [w.x, w.y, w.z]; } } };
}

// ── fx.frag_burst: a hand grenade's steel shell splitting into fragments (made for slow motion / a frozen instant) ──
async function buildFrag(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.frag_burst']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.frag_burst';
  const R = num(p.radius, 0.032), elev = num(p.elev, 0), t0 = num(p.t, 1), n = Math.round(clamp(num(p.count, 360), 20, 2000));
  root.position.set(at[0], G.height(at[0], at[1]) + elev + R, at[1]);
  const v0 = num(p.speed, 1300), slow = clamp(num(p.slow, 0.0002), 1e-5, 1);  // m/s real; slow = real seconds per screen second (0.0002: a 5000x camera)
  // the grenade (M67-like: a smooth olive steel sphere, spoon, pin ring) until t
  const body = new THREE.Group(); root.add(body);
  const olive = stdM({ color: 0x4a5a33, roughness: 0.5, metalness: 0.45 }), steel = stdM({ color: 0x8a8d90, roughness: 0.35, metalness: 0.85 });
  const sph = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), olive); sph.castShadow = true; body.add(sph);
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.35, R * 0.4, R * 0.5, 16), steel); fuse.position.y = R * 1.05; body.add(fuse);
  const spoon = new THREE.Mesh(new THREE.BoxGeometry(R * 0.3, R * 1.6, R * 0.06), steel); spoon.position.set(R * 0.55, R * 0.55, 0); spoon.rotation.z = -0.25; body.add(spoon);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.35, R * 0.04, 8, 20), steel); ring.position.set(-R * 0.5, R * 1.25, 0); ring.rotation.y = Math.PI / 2; body.add(ring);
  // the fragments: irregular steel chips from the shell, hot at first, flying out radially (air drag slows them)
  const geo = new THREE.TetrahedronGeometry(1, 0), mat = stdM({ color: 0x3c3c3a, roughness: 0.5, metalness: 0.7, emissive: 0xff7a2a, emissiveIntensity: 0 });
  const frags = new THREE.InstancedMesh(geo, mat, n); frags.castShadow = true; frags.frustumCulled = false; root.add(frags);
  const F = [];
  for (let i = 0; i < n; i++) { const u = hf(i, 1) * 2 - 1, a = hf(i, 2) * TAU, s2 = Math.sqrt(1 - u * u); F.push({ d: new THREE.Vector3(Math.cos(a) * s2, u, Math.sin(a) * s2), sz: R * (0.1 + 0.22 * Math.pow(hf(i, 3), 1.5)), v: v0 * (0.75 + 0.5 * hf(i, 4)), sp: new THREE.Vector3(hf(i, 5) - 0.5, hf(i, 6) - 0.5, hf(i, 7) - 0.5).normalize(), w: 2000 + 6000 * hf(i, 8) }); }
  const blastRing = makeVeil({ full: true, mottle: 0.2, rim: 3, order: 12, color: [1, 1, 1] }); root.add(blastRing.mesh);
  const flash = glow([1.0, 0.8, 0.5], 24); root.add(flash);
  const PL = new THREE.PointLight(new THREE.Color(1, 0.7, 0.4), 0, 6, 2); PL.userData.noGovern = true; root.add(PL);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const drag = num(p.drag, 0.004);                                           // s (real): how fast the fragments lose speed
  function update(t) {
    const x = t - t0, xr = Math.max(0, x) * slow;                        // real seconds since the burst
    body.visible = x < 0;
    for (let i = 0; i < n; i++) {
      const f = F[i];
      if (x < 0) { m4.makeScale(0, 0, 0); frags.setMatrixAt(i, m4); continue; }
      const dist = f.v * drag * (1 - Math.exp(-xr / drag)) + f.v * 0.05 * xr;   // fast, slowed by the air, then coasting
      v.copy(f.d).multiplyScalar(R + dist); q.setFromAxisAngle(f.sp, xr * f.w); sc.setScalar(f.sz);
      m4.compose(v, q, sc); frags.setMatrixAt(i, m4);
    }
    frags.instanceMatrix.needsUpdate = true;
    mat.emissiveIntensity = x < 0 ? 0 : 3.5 * Math.exp(-xr / num(p.glow_time, 0.004));
    const rr = x < 0 ? 0 : R * 3 + xr * 1500;                               // the faint air-blast shell (supersonic near the burst)
    blastRing.mesh.visible = x > 0 && x < 1.5; blastRing.mesh.scale.setScalar(Math.max(0.001, Math.min(rr, R * 400))); blastRing.uni.uA.value = x > 0 ? 0.25 * (1 - sstep(0.3, 1.5, x)) : 0;
    const fk = Math.exp(-xr / 0.0006) * Math.exp(-x / 0.6);                 // the flash: brief in screen time too (a slow-motion glare that lingered read as a lamp)
    flash.visible = x >= 0 && fk > 0.01; flash.material.uniforms.uS.value = R * 6; flash.material.uniforms.uMinPx.value = 140 * fk; flash.material.uniforms.uI.value = 1.6 * fk;
    PL.intensity = x < 0 ? 0 : 12 * fk;
  }
  update(0);
  return { root, radius: 0.5, height: 0.2, snapped: true, update, contact: false, cues: [{ t: +t0.toFixed(2), sound: 'explosion_small', gain: 1 }],
    flashAt: (t) => { const x = t - t0; return x < 0 || x > 0.3 ? 0 : 0.5; }, anchors: { grenade: new THREE.Vector3(0, 0, 0) } };
}

export const CATALOG = {
  'fx.frag_burst': {
    desc: 'A HAND GRENADE\'S SHELL SPLITTING (made for slow motion / a frozen instant, close-up): an olive steel grenade (M67: sphere, fuse, spoon, pin ring) that at `t` glows hot and breaks into hundreds of small dark steel fragments flying outward in every direction, a small flash, a faint air-blast shell expanding. `slow` = real seconds per screen second (default 0.0002: a 5000x slow-motion camera, the fragments cross ~25 cm in a screen second, glowing; 0.002 = ten times faster; 1 = real time); spec.clock freeze_at freezes them mid-flight. Film with a macro camera 0.6-1.2 m, lens >= 0.4 m up',
    actions: ['explode'],
    params: { t: 's', count: 'fragments (360)', slow: 'real seconds per screen second (0.0002 = a 5000x slow-motion camera; 1 = real time)', speed: 'm/s (1300)', radius: 'm grenade radius (0.032)', elev: 'm (on a table, a crate lid)', drag: 's real (0.004)', glow_time: 's real (0.004)' },
    footprint: [1, 1], height: 0.2, contact: false, tags: ['fx', 'grenade', 'fragments', 'shrapnel', 'frag', 'explosion', 'slow motion', 'shell'],
    examples: [{ note: 'the shell bursting in slow motion', spec: { world: { biome: 'plains' }, objects: [{ kind: 'fx.frag_burst', at: [0, 0], t: 1 }], camera: { move: 'keys', fov: 30, target: 'objects:0', limits: 'macro', keys: [{ t: 0, pos: [0.7, 0.45, 0.75], look: [0, 0.04, 0] }, { t: 6, pos: [0.6, 0.42, 0.85], look: [0, 0.04, 0] }] } } }],
  },
  'fx.explosion': {
    desc: 'a CONVENTIONAL EXPLOSION of any size from its yield (TNT equivalent: 1 kg .. kilotons): a flash, the orange sooty fireball, the white condensation dome of the shock in humid air, the cloud rising (a small mushroom from tonnes up), the dust ring racing out, debris on ballistic arcs trailing smoke, a scorch. type tnt | thermobaric (MOAB fuel-air: a huge long-burning fireball) | ammonium_nitrate (Beirut: `pre` s of grey smoke turning red-brown with fireworks popping, then the white dome, the black-orange fireball, the salmon mushroom) | ship (Halifax / Texas City: the burning ship with black smoke, the white pillar, harbour water thrown up) | industrial (Tianjin). presets moab, beirut, halifax, texas_city, tianjin, truck_bomb, bomb_500lb, tnt_1kg. The stage (YOU at the world origin) gets the dust front at t_arrive',
    actions: ['detonate'],
    params: { preset: 'moab|beirut|halifax|texas_city|tianjin|truck_bomb|bomb_500lb|tnt_1kg', yield: "'1 kg' | '11 t' | '1.1 kt' (a number = tonnes TNT)", type: 'tnt|thermobaric|ammonium_nitrate|ship|industrial', t: 's the detonation', pre: 's of the fire before (ammonium_nitrate, ship)', height: 'm above ground (air burst)', grow: 's the cloud takes to rise', t_arrive: 's the dust front passes the stage', wilson: '0..1.2 the white shock dome', debris: '0..2', surface: 'dirt|sand|concrete|rock|snow|water', smoke: '[r,g,b] cloud colour', scale: '0.02..1', light: 'x', shadows: 'bool', scorch: 'bool' },
    doc: {
      yield: "TNT equivalent sets everything by the cube root: fireball (1 kg: 1.5 m wide; 1 t: 15 m; 11 t MOAB fuel-air: 80 m; 1 kt: 150 m), cloud top (1 t: 170 m; 11 t: 600 m; 1 kt: 1.8 km; Halifax 2.9 kt: 3.4 km), debris speed and reach, dust ring",
      type: 'the explosive: tnt (sooty orange fireball, black-grey smoke, brown dust), thermobaric (MOAB: the fuel cloud burns as a huge orange ball for ~1 s, then a tall dark column), ammonium_nitrate (Beirut 2020 look), ship (a ship blowing up in a harbour: white-grey pillar), industrial (Tianjin: a big orange fireball, black smoke)',
      pre: "seconds of the fire BEFORE the blast inside the shot (t - pre .. t): ammonium_nitrate = the warehouse fire's grey smoke column turning red-brown (nitrogen dioxide) with fireworks popping; ship = black smoke and flames on deck with drums bursting. Put the blast source (landmark.beirut_port anchor hangar12, a ship) at `at`",
      wilson: '0..1.2 the white hemispherical condensation dome racing out with the shock for ~1 s (default 1 for ammonium_nitrate: the Beirut dome; 0.55 ship; 0.1 tnt)',
      t_arrive: 's (screen) the dust front passes the stage (YOU at the world origin); default the real delay (distance / ~343 m/s) capped at 5 s — pair with fx.shock_front at the stage',
      grow: 's of screen time for the cloud to rise to its top (default by yield: 2 s for 1 kg .. 7.5 s for 1 kt)', scale: 'draw smaller than true', height: 'm: an air burst (thermobaric bombs burst ~2-6 m up)',
    },
    footprint: [200, 200], height: 600, snap: false, fly: true, contact: false,
    tags: ['fx', 'explosion', 'blast', 'bomb', 'tnt', 'moab', 'thermobaric', 'fuel-air', 'ammonium nitrate', 'beirut', 'halifax', 'texas city', 'tianjin', 'fireball', 'mushroom cloud', 'detonation', 'warehouse', 'port', 'ship explosion'],
    examples: [
      { note: 'Beirut from the hills 2 km away: 5 s of red-brown smoke, then the white dome', spec: { look: { time: 'dusk', sky: 'scattered', haze: 0.3 }, world: { biome: 'coast' }, objects: [{ kind: 'fx.explosion', at: [0, -2000], preset: 'beirut', t: 5.5 }], camera: { move: 'keys', fov: 45, target: 'objects:0', keys: [{ t: 0, at: [0, 0], alt: 60, look_at: [0, -2000], look_h: 250 }, { t: 12, at: [80, 30], alt: 62, look_at: [0, -2000], look_h: 700 }] } } },
    ],
  },
  'fx.firecracker': {
    desc: 'a FIRECRACKER going off (close-up scale): variant m80 (the red cardboard M-80 tube with a green fuse, ~3 g of flash powder), cherry_bomb (a red ball), firecracker (a small red tube), string (a braided string of `count` crackers popping in a rattling sequence). The fuse fizzes with sparks from `t`, then the bang after `fuse` s: a white-hot flash (a light on everything within a metre or two), a spray of sparks, torn red paper confetti fluttering down, a puff of white-grey smoke. Film it with a macro / insert camera (0.3-1.5 m)',
    actions: ['explode'],
    params: { variant: 'm80|cherry_bomb|firecracker|string', t: 's the fuse is lit', fuse: 's until the bang (1.4)', count: 'crackers in a string (30)', elev: 'm (on a table, a step)', cutaway: 'bool: half the tube cut away, the black powder inside' },
    footprint: [0.4, 0.4], height: 0.3, contact: false, tags: ['fx', 'firecracker', 'm-80', 'm80', 'cherry bomb', 'fireworks', 'explosion', 'bang', 'fuse', 'small'],
    examples: [{ note: 'an M-80 on concrete, macro', spec: { objects: [{ kind: 'fx.firecracker', at: [0, 0], variant: 'm80', t: 0.5, fuse: 1.5 }], camera: { move: 'keys', fov: 40, target: 'objects:0', limits: 'macro', keys: [{ t: 0, pos: [0.5, 0.18, 0.55], look: [0, 0.02, 0] }, { t: 5, pos: [0.38, 0.16, 0.5], look: [0, 0.05, 0] }] } } }],
  },
  'fx.dynamite': {
    desc: 'DYNAMITE: a bundle of red paper sticks (20 cm) taped together with a blasting cap and a fuse coiling off along the ground; the fuse is lit at `t` and burns towards the bundle (sparks, a thread of smoke, a flicker of light) for `fuse` s, then the bundle blows: flash, fireball, rock and dirt thrown up, grey-brown dust (the fx.explosion of its TNT equivalent: ~0.25 kg per stick). Film the fuse close, the blast from 10-30 m',
    actions: ['explode'],
    params: { sticks: '1..24 (3)', t: 's the fuse is lit', fuse: 's of fuse (2.5)', yield_kg: 'kg TNT (sticks x 0.25)', surface: 'rock|dirt|sand|concrete', debris: '0..2' },
    footprint: [1, 1], height: 0.4, contact: false, tags: ['fx', 'dynamite', 'tnt', 'sticks', 'fuse', 'explosion', 'blast', 'mining', 'demolition'],
    examples: [{ note: 'the fuse burning down, the blast at 3.5 s', spec: { world: { biome: 'desert' }, objects: [{ kind: 'fx.dynamite', at: [0, 0], sticks: 4, t: 0.5, fuse: 3 }], camera: { move: 'keys', fov: 45, target: 'objects:0', keys: [{ t: 0, pos: [1.2, 0.35, 1.4], look: [0, 0.05, 0.3] }, { t: 7, pos: [2.5, 1.2, 3.5], look: [0, 0.5, 0] }] } } }],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'fx.frag_burst') return buildFrag(item, ctx);
  if (kind === 'fx.firecracker') return buildFirecracker(item, ctx);
  if (kind === 'fx.dynamite') return buildDynamite(item, ctx);
  return buildExplosion(item, ctx);
}
