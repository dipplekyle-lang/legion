// x_sets.js — E5 (explosions kit, 30 Sep 2026): the places, machines and scale devices of the explosion ladder.
//   scale.tnt            DATA MADE PHYSICAL: a yield as the TNT itself at true scale (1 kg = a wrapped block, 25 kg
//                        crates, 1 t = a pallet cube 0.85 m, kilotons a warehouse-size stack, megatons a mountain)
//   landmark.beirut_port the port of Beirut (2020): the grain silos, Hangar 12, the quay, container cranes, stacks of
//                        containers, warehouses and the city of beige apartment blocks rising behind (own land: biome ocean)
//   landmark.test_tower  a nuclear shot tower (Trinity: a 30 m steel lattice tower with the corrugated shot cab on top)
//                        or a shot cab building (Ivy Mike)
//   prop.bomb            a bomb at true size: tsar (Tsar Bomba, 8 m, with its huge parachute), little_boy, fat_man,
//                        moab (GBU-43/B with grid fins), mk82; `parachute`, falling
//   aircraft.tu95        the Tu-95V bomber that dropped Tsar Bomba (white anti-flash paint, swept wings, four turboprops
//                        with contra-rotating propellers), the bomb in its belly, flying a straight line
//   detail.barograph     INSERT: a recording barograph (clockwork drum, ink pen, aneroid capsules under glass); the pen
//                        draws the pressure spike at t_spike (Krakatoa 1883, Tsar Bomba's wave circling the Earth)
//   ship.cargo           a cargo steamer: era 1917 (SS Mont-Blanc: one tall funnel, two masts, drums of benzol on deck),
//                        1947 (a Liberty ship: the Grandcamp) or modern; floats, rides the swell, can burn
import * as THREE from 'three';
import { parseYield, fmtYield, num, clamp, lerp, sstep, hf, headingYaw, DEG, makeCPuffs, shockArrive } from './x_common.js';
import { syncEnv, makeFlames, makeSparks } from './f_common.js';
import { patchMaterial, U } from '../shared/env.js';
import { explicitParams, buildRefModel } from './a_asteroid.js';

const TAU = Math.PI * 2;
const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));
function canvasTex(w, h, draw, rep = [1, 1], srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function addBox(parent, w, h, d, m, x, y, z, o = {}) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = o.cast !== false; b.receiveShadow = true;
  if (o.rot) b.rotation.set(...o.rot); parent.add(b); return b;
}
function addCyl(parent, r0, r1, h, m, x, y, z, seg = 16, o = {}) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg, 1, !!o.open), m); c.position.set(x, y, z); c.castShadow = o.cast !== false; c.receiveShadow = true;
  if (o.rot) c.rotation.set(...o.rot); parent.add(c); return c;
}
// a strut between two points
function strut(parent, a, b, r, m, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m); c.position.copy(A).add(B).multiplyScalar(0.5);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); c.castShadow = true; parent.add(c); return c;
}
const noQA = (root) => root.traverse((o) => { if (o.isMesh) o.userData.noQA = true; });
const TEX = {};

// ── scale.tnt ────────────────────────────────────────────────────────────────────────────────────────────────────
function crateTex() {
  return TEX.crate ||= canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6f7a4b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + 0.06 * hf(i, 1)})`; g.fillRect(0, i * h / 6, w, h / 6 - 3); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, (i + 1) * h / 6 - 3, w, 2); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${hf(i, 2) < 0.5 ? '0,0,0' : '255,255,230'},${0.03 + 0.04 * hf(i, 3)})`; g.fillRect(hf(i, 4) * w, hf(i, 5) * h, 20 + 40 * hf(i, 6), 1); }
    g.strokeStyle = '#454d2d'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = '#d9c35a'; g.font = 'bold 72px Courier Prime, monospace'; g.textAlign = 'center'; g.fillText('TNT', w / 2, h / 2 + 8);
    g.font = 'bold 26px Courier Prime, monospace'; g.fillText('1000 KG', w / 2, h / 2 + 48); g.font = 'bold 18px Courier Prime, monospace'; g.fillText('HIGH EXPLOSIVE', w / 2, h / 2 - 58);
  });
}
function smallCrateTex() {
  return TEX.scrate ||= canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#56603c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, (i + 1) * h / 4 - 2, w, 2); }
    g.strokeStyle = '#353b25'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#e0c860'; g.font = 'bold 40px Courier Prime, monospace'; g.textAlign = 'center'; g.fillText('TNT', w / 2, h / 2 + 4); g.font = 'bold 20px Courier Prime, monospace'; g.fillText('25 KG', w / 2, h / 2 + 34);
  });
}
function blockTex() {
  return TEX.block ||= canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d8c48c'); gr.addColorStop(1, '#c8b074'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(90,70,30,${0.05 + 0.08 * hf(i, 1)})`; g.beginPath(); g.moveTo(hf(i, 2) * w, hf(i, 3) * h); g.lineTo(hf(i, 2) * w + 30 * (hf(i, 4) - 0.5), hf(i, 3) * h + 20 * (hf(i, 5) - 0.5)); g.stroke(); }
    g.fillStyle = '#1b1b1b'; g.font = 'bold 44px Courier Prime, monospace'; g.textAlign = 'center'; g.fillText('TNT', w / 2, h / 2 + 6); g.font = 'bold 20px Courier Prime, monospace'; g.fillText('1 KG  HIGH EXPLOSIVE', w / 2, h / 2 + 36);
  });
}
function gridTex() {
  return TEX.grid ||= canvasTex(256, 256, (g, w, h) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const k = hf(i + j * 4, 9), x = i * 64, y = j * 64;
      g.fillStyle = `rgb(${112 + 18 * k},${120 + 14 * k},${78 + 12 * k})`; g.fillRect(x, y, 64, 64);
      g.strokeStyle = '#4a5231'; g.lineWidth = 5; g.strokeRect(x + 2, y + 2, 60, 60);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + 58, 64, 6);
      g.fillStyle = 'rgba(220,196,90,0.9)'; g.font = 'bold 17px Courier Prime, monospace'; g.textAlign = 'center'; g.fillText('TNT', x + 32, y + 36);
    }
  });
}
async function buildTNT(item, ctx) {
  const p = explicitParams(item, CATALOG['scale.tnt']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'scale.tnt';
  root.position.set(at[0], G.height(at[0], at[1]) + num(p.elev, 0), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);   // elev: on a table
  const Wt = parseYield(p.yield, 1), kg = Wt * 1000, V = kg / 1650;               // TNT is 1.65 t per cubic metre
  let W = 0, D = 0, Hh = 0, mode = '';
  const style = String(p.style || 'block');
  if (style === 'block') return buildTNTBlock(item, ctx, p, root, Wt, V);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), col = new THREE.Color();
  if (kg < 20) {                                                              // wrapped 1 kg blocks
    mode = 'blocks';
    const n = Math.max(1, Math.round(kg)), k = kg < 1 ? Math.cbrt(kg) : 1, bl = 0.15 * k, bh = 0.054 * k, bd = 0.075 * k;
    const mat = stdM({ map: blockTex(), roughness: 0.65 }), side = stdM({ color: 0xcdb679, roughness: 0.7 });
    const mats = [side, side, mat, side, mat, mat];
    const per = n > 8 ? 4 : n, rows = n > 8 ? 3 : 1;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(bl, bh, bd), mats, n); im.castShadow = im.receiveShadow = true;
    for (let i = 0; i < n; i++) {
      const lay = Math.floor(i / (per * rows)), r = Math.floor(i / per) % rows, c = i % per;
      v.set((c - (per - 1) / 2) * bl * 1.02 + (lay % 2 ? bl * 0.08 : 0), bh / 2 + lay * bh * 1.01, (r - (rows - 1) / 2) * bd * 1.03);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (hf(i, 3) - 0.5) * 0.08); m4.compose(v, q, s.set(1, 1, 1)); im.setMatrixAt(i, m4);
    }
    root.add(im); W = per * bl; D = rows * bd; Hh = (Math.floor((n - 1) / (per * rows)) + 1) * bh;
  } else if (kg < 1000) {                                                      // 25 kg crates
    mode = 'crates';
    const n = Math.max(1, Math.round(kg / 25)), cl = 0.35, ch = 0.216, cd = 0.2;
    const face = stdM({ map: smallCrateTex(), roughness: 0.85 }), top = stdM({ color: 0x4f5838, roughness: 0.85 });
    const per = Math.max(1, Math.ceil(Math.sqrt(n / Math.min(5, Math.ceil(Math.cbrt(n)))))), lay = Math.ceil(n / (per * per));
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(cl, ch, cd), [top, top, top, top, face, face], n); im.castShadow = im.receiveShadow = true;
    for (let i = 0; i < n; i++) {
      const L = Math.floor(i / (per * per)), r = Math.floor(i / per) % per, c = i % per;
      v.set((c - (per - 1) / 2) * cl * 1.02, ch / 2 + L * ch, (r - (per - 1) / 2) * cd * 1.04); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (hf(i, 5) - 0.5) * 0.04);
      m4.compose(v, q, s.set(1, 1, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setScalar(0.85 + 0.15 * hf(i, 6)));
    }
    root.add(im); W = per * cl; D = per * cd; Hh = lay * ch;
  } else if (Wt < 50000) {                                                     // 1 t pallet cubes (0.846 m of TNT on a pallet)
    mode = 'pallets';
    const n = Math.max(1, Math.round(Wt)), c = 0.846, ph = 0.12, cell = c + 0.04;
    const side = Math.max(1, Math.round(Math.cbrt(n))), per = Math.max(1, Math.ceil(Math.sqrt(n / side))), lay = Math.ceil(n / (per * per));
    const face = stdM({ map: crateTex(), roughness: 0.85 }), top = stdM({ color: 0x6a744a, roughness: 0.85 }), wood = stdM({ color: 0x8a7050, roughness: 0.9 });
    const cube = new THREE.InstancedMesh(new THREE.BoxGeometry(c, c, c), [face, face, top, top, face, face], n), pal = new THREE.InstancedMesh(new THREE.BoxGeometry(c * 1.02, ph, c * 1.02), wood, n);
    cube.castShadow = cube.receiveShadow = pal.castShadow = pal.receiveShadow = true;
    for (let i = 0; i < n; i++) {
      const L = Math.floor(i / (per * per)), r = Math.floor(i / per) % per, cc = i % per, y0 = L * (c + ph);
      v.set((cc - (per - 1) / 2) * cell, y0 + ph + c / 2, (r - (per - 1) / 2) * cell); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (hf(i, 7) - 0.5) * 0.03);
      m4.compose(v, q, s.set(1, 1, 1)); cube.setMatrixAt(i, m4); cube.setColorAt(i, col.setScalar(0.82 + 0.18 * hf(i, 8)));
      v.y = y0 + ph / 2; m4.compose(v, q, s); pal.setMatrixAt(i, m4);
    }
    root.add(cube, pal); W = D = per * cell; Hh = lay * (c + ph);
  } else {                                                                     // kilotons+ : a solid of crate-grid, a cube or a stepped mountain
    const pyr = p.shape ? p.shape === 'pyramid' : Wt >= 1e6;
    mode = pyr ? 'mountain' : 'block';
    const tex = gridTex().clone(); tex.needsUpdate = true;
    const mk = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, P = g.attributes.position, nn = g.attributes.normal;
      for (let i = 0; i < uv.count; i++) { const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)); const a = ax > 0.5 ? P.getZ(i) : P.getX(i), b = ay > 0.5 ? P.getZ(i) : P.getY(i); uv.setXY(i, a / (0.886 * 4), b / (0.966 * 4)); }
      return g; };
    const mat = stdM({ map: tex, roughness: 0.9 });
    if (!pyr) { const a = Math.cbrt(V); const b = new THREE.Mesh(mk(a, a, a), mat); b.position.y = a / 2; b.castShadow = true; b.receiveShadow = false; root.add(b); W = D = Hh = a; }
    else {
      const N = 14, base = Math.cbrt(6 * V), hTot = base / 2, th = hTot / N;       // a pyramid with h = base / 2 has V = base^3 / 6
      let vol = 0; const tiers = [];
      for (let k = 0; k < N; k++) { const w = base * (1 - (k + 0.5) / N); tiers.push(w); vol += w * w * th; }
      const f = Math.cbrt(V / vol);
      tiers.forEach((w, k) => { const b = new THREE.Mesh(mk(w * f, th * f, w * f), mat); b.position.y = th * f * (k + 0.5); b.castShadow = true; b.receiveShadow = false; root.add(b); });   // no self-shadow: a 500 m solid in the shadow map is all acne
      W = D = base * f; Hh = hTot * f;
    }
  }
  noQA(root);
  root.traverse((o) => { if (o.isMesh) o.userData.noQA = false; });           // solid: the camera must not pass through it
  return { root, radius: Math.max(W, D) / 2, height: Hh, snapped: true, footprint: [W, D], update: () => {},
    anchors: { top: new THREE.Vector3(0, Hh, 0), front: new THREE.Vector3(0, 0, D / 2 + Math.max(0.6, 0.15 * W)), side: new THREE.Vector3(W / 2 + Math.max(0.6, 0.15 * W), 0, 0) },
    info: { yield: fmtYield(Wt), mode, volume_m3: +V.toFixed(V < 10 ? 3 : 0), width_m: +W.toFixed(2), height_m: +Hh.toFixed(2) } };
}

// the TNT CUBE device: ONE orange-red block of the yield's TNT at true volume, TNT stencilled on its faces, the yield
// stamped under it, beside a familiar thing (an apple on a kitchen scale, the Witness, a house, a seven-storey block,
// the Eiffel Tower) on the same ground line
function cubeTex(stamp) {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9472e'); gr.addColorStop(1, '#b23a25'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${hf(i, 1) < 0.5 ? '0,0,0' : '255,220,200'},${0.03 + 0.05 * hf(i, 2)})`; g.fillRect(hf(i, 3) * w, hf(i, 4) * h, 2 + 6 * hf(i, 5), 2 + 6 * hf(i, 6)); }
    g.strokeStyle = 'rgba(60,15,8,0.55)'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#1c1512'; g.font = 'bold 170px Courier Prime, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TNT', w / 2, h * 0.47);
    if (stamp) { g.font = 'bold 52px Courier Prime, monospace'; g.fillText(stamp, w / 2, h * 0.72); }
  }, [1, 1]);
}
function appleOnScale(stampG) {
  const G = new THREE.Group();
  const white = stdM({ color: 0xeeeeea, roughness: 0.35 }), dark = stdM({ color: 0x1a1d20, roughness: 0.3 });
  addBox(G, 0.2, 0.03, 0.17, white, 0, 0.015, 0); addBox(G, 0.19, 0.008, 0.15, stdM({ color: 0xd8dadc, metalness: 0.8, roughness: 0.25 }), 0, 0.034, -0.005);
  const disp = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#1d2a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#9ef0a8'; g.font = 'bold 64px Courier Prime, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(stampG, w / 2, h / 2 + 2); }, [1, 1]);
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.026), new THREE.MeshBasicMaterial({ map: disp, toneMapped: false })); dm.position.set(0, 0.018, 0.0852); G.add(dm);
  addBox(G, 0.08, 0.03, 0.004, dark, 0, 0.016, 0.0848);
  // the apple: a lathe with the dimple at the stem and the calyx, red with a yellow blush, a stem, a leaf
  const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, a = u * Math.PI; const r = 0.041 * Math.sin(a) * (1 + 0.08 * Math.sin(a * 2)) + 0.001; const y = 0.004 + 0.074 * (1 - Math.cos(a)) / 2 - (u > 0.9 ? (u - 0.9) * 0.06 : 0) + (u < 0.08 ? (0.08 - u) * 0.05 : 0); pts.push(new THREE.Vector2(r, y)); }
  const apple = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), stdM({ color: 0xb3161b, roughness: 0.35 })); apple.position.set(0.17, 0, 0.02); apple.castShadow = true; G.add(apple);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, 0.02, 6), stdM({ color: 0x4a3322, roughness: 0.8 })); stem.position.set(0.17, 0.083, 0.02); stem.rotation.z = 0.25; G.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 6), stdM({ color: 0x3f7a2c, roughness: 0.6 })); leaf.scale.set(1.4, 0.2, 0.6); leaf.position.set(0.18, 0.09, 0.023); leaf.rotation.z = -0.4; G.add(leaf);
  return G;
}
async function buildTNTBlock(item, ctx, p, root, Wt, V) {
  const a = Math.cbrt(V), stamp = p.stamp != null ? String(p.stamp) : '≈ ' + fmtYield(Wt) + ' TNT';
  const ref = String(p.ref || (a < 0.2 ? 'apple' : a < 3 ? 'witness' : a < 12 ? 'house' : a < 60 ? 'building7' : 'eiffel')).toLowerCase();
  const tex = cubeTex(a > 0.4 ? stamp : null), side = stdM({ map: tex, roughness: 0.75 }), top = stdM({ color: 0xc0412a, roughness: 0.8 });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(a, a, a), [side, side, top, top, side, side]); cube.castShadow = true; cube.receiveShadow = a < 50;
  const onScale = ref === 'apple';
  cube.position.set(0, a / 2 + (onScale ? 0.038 : 0), 0); root.add(cube);
  // the reference beside it, on the same ground line
  let refW = 0, refH = 0, refG = null;
  const gap = num(p.gap, Math.max(0.05, a * 0.35));
  if (ref === 'apple') { refG = appleOnScale(p.scale_text || `${Math.round(Wt * 1e6)} g`); refW = 0.25; refH = 0.09; cube.position.x = 0; refG.position.set(0, 0, 0); root.add(refG); cube.position.set(-0.03, 0.038 + a / 2, 0); }
  else if (ref !== 'none') {
    const kind = ref === 'witness' || ref === 'you' ? 'person' : ref === 'building7' ? 'building6' : ref;
    try { refG = await buildRefModel(kind, ctx, { face: 270 }); } catch (e) { refG = null; }
    if (refG) {
      if (ref === 'building7') refG.scale.set(1, 21 / 20, 1);
      root.add(refG); const bb = new THREE.Box3().setFromObject(refG); refW = bb.max.x - bb.min.x; refH = bb.max.y - bb.min.y;
      refG.position.x = a / 2 + gap + refW / 2 - (bb.max.x + bb.min.x) / 2;
    }
  }
  // the yield stamp on the ground in front of small blocks (big ones carry it on their face)
  if (a <= 0.4 && p.stamp !== false) {
    const lt = canvasTex(512, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#1c1512'; g.font = 'bold 56px Courier Prime, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(stamp, w / 2, h / 2); }, [1, 1]);
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.2, a * 3), Math.max(0.2, a * 3) * 96 / 512), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false }));
    lp.rotation.x = -Math.PI / 2; lp.position.set(0, (onScale ? 0 : 0) + 0.002, a / 2 + Math.max(0.04, a * 0.6)); root.add(lp);
  }
  root.traverse((o) => { if (o.isMesh) o.userData.noQA = o === cube ? false : true; });
  const W = a + (refW ? gap + refW : 0);
  return { root, radius: Math.max(W, a) / 2 + 0.2, height: Math.max(a, refH), snapped: true, footprint: [W, Math.max(a, 1)], update: () => {},
    anchors: { top: new THREE.Vector3(0, a, 0), front: new THREE.Vector3(-a * 0.3, 0, a / 2 + Math.max(0.6, 0.3 * a)), side: new THREE.Vector3(-(a / 2 + Math.max(0.6, 0.3 * a)), 0, 0), ref: new THREE.Vector3(a / 2 + gap + refW / 2, refH / 2, 0), cube: new THREE.Vector3(0, a / 2, 0) },
    info: { yield: fmtYield(Wt), style: 'block', side_m: +a.toFixed(3), ref } };
}

// ── landmark.beirut_port ─────────────────────────────────────────────────────────────────────────────────────────
function windowsTex(tone = '#d8cfbd', seed = 1) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = tone; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const k = hf(i + j * 4, seed); g.fillStyle = k < 0.18 ? '#6b665c' : k < 0.5 ? '#2f3336' : '#3b4247'; g.fillRect(i * 32 + 7, j * 32 + 9, 18, 15);
      if (k > 0.75) { g.fillStyle = 'rgba(230,225,210,0.8)'; g.fillRect(i * 32 + 5, j * 32 + 24, 22, 3); }        // balconies
    }
    g.fillStyle = 'rgba(0,0,0,0.08)'; for (let j = 0; j < 4; j++) g.fillRect(0, j * 32 + 29, w, 3);
  });
}
function corrugTex(tone = '#9aa0a3') {
  return canvasTex(128, 64, (g, w, h) => { g.fillStyle = tone; g.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.08)'; g.fillRect(i * 4, 0, 2, h); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,60,40,${0.05 + 0.08 * hf(i, 3)})`; g.fillRect(hf(i, 4) * w, hf(i, 5) * h, 3, 10 + 20 * hf(i, 6)); } });
}
async function buildBeirut(item, ctx) {
  const p = explicitParams(item, CATALOG['landmark.beirut_port']);
  const at = item.at || [0, 0], G = ctx.ground;
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : G.height(at[0], at[1]);
  const root = new THREE.Group(); root.name = 'landmark.beirut_port';
  root.position.set(at[0], wl, at[1]); root.rotation.y = headingYaw(item.heading ?? 0);    // +Z (local) = the sea side of the quay
  const damaged = p.damaged === true;
  const concrete = stdM({ color: 0xb9b2a4, roughness: 0.92 }), apron = stdM({ color: 0x8f8b84, roughness: 0.95 }), wallM = stdM({ color: 0x6e6a62, roughness: 0.95 });
  const deck = 3.2;
  // the land: the port platform and the city ground rising behind it
  addBox(root, 1500, deck + 12, 900, apron, 0, (deck - 12) / 2, -450, { cast: false });
  addBox(root, 1500, 14, 2, wallM, 0, deck - 7, 0.5, { cast: false });                        // quay wall face
  const slope = new THREE.PlaneGeometry(3200, 2400, 64, 48).rotateX(-Math.PI / 2), SP = slope.attributes.position;
  for (let i = 0; i < SP.count; i++) { const z = SP.getZ(i) - 2100, x = SP.getX(i); const u = clamp((-z - 900) / 1800); SP.setXYZ(i, x, deck + 150 * u * u * (3 - 2 * u) + 6 * Math.sin(x / 90) * u, z); }
  slope.computeVertexNormals();
  const land = new THREE.Mesh(slope, stdM({ color: 0x9c9383, roughness: 0.95 })); land.receiveShadow = true; root.add(land);
  const landY = (z) => { const u = clamp((-z - 900) / 1800); return deck + 150 * u * u * (3 - 2 * u); };
  // the grain silos: a block of 3 x 14 cylinders (48 m) fused together, a gallery along the top, the elevator tower
  const silos = new THREE.Group(); silos.position.set(-40, deck, -70); root.add(silos);
  const sR = 5.4, sH = 48, nx = 14, nz = 3;
  const silM = stdM({ color: 0xcfc8b8, roughness: 0.9 }), silDark = stdM({ color: 0x9f988a, roughness: 0.9 });
  const cyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(sR, sR, sH, 28), silM, nx * nz); cyl.castShadow = cyl.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = (i - (nx - 1) / 2) * sR * 2, z = (j - (nz - 1) / 2) * sR * 2;
    const broken = damaged && (j === nz - 1 || (j === 1 && hf(i, 4) < 0.5)) && i > 2;
    m4.compose(new THREE.Vector3(x, (broken ? sH * (0.45 + 0.35 * hf(i + j, 5)) : sH) / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, broken ? 0.45 + 0.35 * hf(i + j, 5) : 1, 1)); cyl.setMatrixAt(k++, m4);
  }
  silos.add(cyl);
  addBox(silos, (nx - 1) * sR * 2, sH * 0.998, (nz - 1) * sR * 2, silDark, 0, sH / 2, 0);
  addBox(silos, (nx - 1) * sR * 2 + 4, 4.5, 8, silM, 0, sH + 2.25, 0);                        // the conveyor gallery on top
  addBox(silos, 22, sH + 16, 30, silM, -(nx * sR) - 10, (sH + 16) / 2, 2);                   // the elevator / head house
  addBox(silos, 12, 8, 12, silDark, -(nx * sR) - 10, sH + 20, 2);
  // Hangar 12 (east of the silos along the quay) + the row of warehouses behind
  const corr = stdM({ map: corrugTex('#a3a7a6'), roughness: 0.8, metalness: 0.2 }), roofM = stdM({ color: 0x7f8486, roughness: 0.7, metalness: 0.3 });
  const hangar = (x, z, L, Wd, Hh, name) => {
    const g = new THREE.Group(); g.position.set(x, deck, z); root.add(g);
    const tx = corr.map.clone(); tx.needsUpdate = true; tx.repeat.set(L / 8, 1); const mm = corr.clone(); mm.map = tx;
    addBox(g, L, Hh, Wd, mm, 0, Hh / 2, 0);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(Wd * 0.62, Wd * 0.62, L, 24, 1, false, -0.7, 1.4), roofM); roof.rotation.set(-Math.PI / 2, 0, Math.PI / 2); roof.position.set(0, Hh - Wd * 0.62 * Math.cos(0.7) + 0.2, 0); roof.castShadow = true; g.add(roof);   // axis along x, the arc up
    for (let d = 0; d < Math.floor(L / 20); d++) addBox(g, 9, Hh * 0.7, 0.3, wallM, -L / 2 + 10 + d * 20, Hh * 0.35, Wd / 2 + 0.1, { cast: false });   // the doors on the quay side
    if (name) g.name = name;
    return g;
  };
  const h12 = hangar(150, -58, 132, 34, 13, 'hangar12');
  if (damaged) h12.visible = false;
  hangar(150, -170, 150, 36, 12); hangar(-60, -200, 180, 36, 12); hangar(-280, -120, 140, 34, 12);
  // containers (40 ft) stacked on the east apron; gantry cranes on the quay
  const NCt = 420, cont = new THREE.InstancedMesh(new THREE.BoxGeometry(12.2, 2.6, 2.44), stdM({ roughness: 0.7, metalness: 0.25 }), NCt); cont.castShadow = cont.receiveShadow = true;
  const COLS = [0x9b2b22, 0x1f4e7a, 0x2e6b3b, 0xc36b1f, 0x7d8286, 0xd9d5cc, 0x5a3b2e, 0x274a5c];
  const col = new THREE.Color();
  for (let i = 0; i < NCt; i++) {
    const bx = i % 8, by = Math.floor(i / 8) % 14, lay = Math.floor(i / 112);
    if (hf(i, 9) < lay * 0.22) { m4.makeScale(0, 0, 0); cont.setMatrixAt(i, m4); continue; }
    m4.compose(new THREE.Vector3(300 + bx * 13.5 + (by > 6 ? 30 : 0), deck + 1.3 + lay * 2.6, -40 - by * 2.6 - (by > 6 ? 8 : 0)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); cont.setMatrixAt(i, m4);
    cont.setColorAt(i, col.setHex(COLS[Math.floor(hf(i, 10) * COLS.length)]).multiplyScalar(0.8 + 0.3 * hf(i, 11)));
  }
  root.add(cont);
  const craneM = stdM({ color: 0xb33a2a, roughness: 0.6, metalness: 0.4 }), whiteM = stdM({ color: 0xe6e3dc, roughness: 0.6 });
  for (const cx of [-330, -260, 330]) {
    const g = new THREE.Group(); g.position.set(cx, deck, -8); root.add(g);
    for (const lx of [-8, 8]) for (const lz of [-14, 8]) addBox(g, 1.6, 42, 1.6, craneM, lx, 21, lz);
    addBox(g, 20, 3, 3, craneM, 0, 41, -14); addBox(g, 20, 3, 3, craneM, 0, 41, 8);
    addBox(g, 3.5, 3.5, 95, whiteM, 0, 45, 18); addBox(g, 9, 6, 8, whiteM, 0, 40, 4);
    strut(g, [0, 60, -10], [0, 46, 60], 0.5, craneM); strut(g, [-6, 42, -14], [0, 60, -10], 0.8, craneM); strut(g, [6, 42, -14], [0, 60, -10], 0.8, craneM);
  }
  // the city: beige / white apartment blocks rising behind the port (instanced; windows textured)
  const NB = Math.round(clamp(num(p.buildings, 520), 0, 1400));
  const winM = [0, 1, 2].map((s) => stdM({ map: windowsTex(['#d8cfbd', '#e6e0d2', '#cbbfa8'][s], 11 + s), roughness: 0.85 }));
  const bgeo = new THREE.BoxGeometry(1, 1, 1);
  const uvS = bgeo.attributes.uv; for (let i = 0; i < uvS.count; i++) uvS.setXY(i, uvS.getX(i), uvS.getY(i));
  const roofs = [];                                                          // every block's roof: water tanks and dishes go on them
  // p.clear = [x, z, r] (WORLD metres): no city block within r of that point (room for fx.window_blast's apartment block)
  const clr = Array.isArray(p.clear) ? (() => { const v = new THREE.Vector3(+p.clear[0], 0, +p.clear[1]); root.updateMatrixWorld(true); root.worldToLocal(v); return [v.x, v.z, +(p.clear[2] ?? 30)]; })() : null;
  // the old quarters by the port: a close street grid of low blocks (the hook looks over their roofs to the port; a
  // sparse scatter read as an empty plain from the window), then taller blocks scattered up the hill
  const cand = [];
  if (p.grid !== false) for (let gz = -440; gz > -1350; gz -= 34) for (let gx = -1296; gx <= 1296; gx += 36) {
    const k = Math.round(gx * 13 + gz * 7 + 20000);
    if (hf(k, 41) < 0.12) continue;                                                // a gap: a yard, a car park, a church square
    const x = gx + (hf(k, 42) - 0.5) * 4, z = gz + (hf(k, 43) - 0.5) * 4;
    if (Math.abs(x) < 520 && z > -420) continue;
    if (clr && Math.hypot(x - clr[0], z - clr[1]) < clr[2]) continue;
    cand.push([x, z, 20 + 12 * hf(k, 44), 18 + 11 * hf(k, 45), 2 + Math.floor(hf(k, 46) * 3), (hf(k, 47) - 0.5) * 0.08, k]);
  }
  for (let i = 0; i < NB; i++) {
    const x = (hf(i, 21) - 0.5) * 2600, z = (p.grid !== false ? -1350 : -330) - Math.pow(hf(i, 22), 0.8) * (p.grid !== false ? 700 : 1700);
    if (Math.abs(x) < 520 && z > -420) continue;
    if (clr && Math.hypot(x - clr[0], z - clr[1]) < clr[2]) continue;           // keep a plot free (the apartment of the hook)
    const near = z > -1350;
    cand.push([x, z, 14 + 18 * hf(i, 23), 12 + 14 * hf(i, 24), near ? 2 + Math.floor(hf(i, 25) * 3) : 3 + Math.floor(hf(i, 25) * 9), (hf(i, 26) - 0.5) * 0.3, i]);   // taller up the hill
  }
  for (let s = 0; s < 3; s++) {
    const list = [];
    for (let n = s; n < cand.length; n += 3) {
      const [x, z, w, d, fl, rot, i] = cand[n], hh = fl * 3.1;
      list.push([x, landY(z), z, w, hh, d, rot]); roofs.push([x, landY(z) + hh, z, w, d, rot, i]);
    }
    const im = new THREE.InstancedMesh(bgeo, winM[s], list.length); im.castShadow = true; im.receiveShadow = true;
    list.forEach((b, i) => { m4.compose(new THREE.Vector3(b[0], b[1] + b[4] / 2, b[2]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b[6]), new THREE.Vector3(b[3], b[4], b[5])); im.setMatrixAt(i, m4); });
    // window texture repeats per metre: scale the uvs on the shader side via onBeforeCompile (cheap: world-scaled uv)
    winM[s].onBeforeCompile = ((prev) => (sh, r) => { prev && prev(sh, r); sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_MAP
      { vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec2 f = abs(normal.x) > 0.5 ? vec2(sc.z, sc.y) : abs(normal.y) > 0.5 ? vec2(0.0) : vec2(sc.x, sc.y);
        vMapUv = uv * f / vec2(12.4, 12.4); }
      #endif`); })(winM[s].onBeforeCompile);
    root.add(im);
  }
  // rooftop water tanks (black plastic, white steel) and satellite dishes; they jolt as the blast front passes (t_blast)
  const NT = roofs.length * 2, tankM = stdM({ roughness: 0.6 }), tanks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 12).translate(0, 0.65, 0), tankM, NT);
  const dishes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 12, 6, 0, Math.PI * 2, 0, 0.9).rotateX(-1.1).translate(0, 0.9, 0), stdM({ color: 0xdcdcd6, roughness: 0.5, side: THREE.DoubleSide }), roofs.length);
  const roofItems = [];
  roofs.forEach((r, k) => {
    const [x, y, z, w, d, rot, i] = r, cr = Math.cos(rot), sr = Math.sin(rot);
    for (let j = 0; j < 2; j++) { const lx = (hf(i + j * 7, 31) - 0.5) * w * 0.7, lz = (hf(i + j * 7, 32) - 0.5) * d * 0.7; roofItems.push({ im: tanks, n: k * 2 + j, x: x + lx * cr + lz * sr, y, z: z - lx * sr + lz * cr, s: 0.8 + 0.5 * hf(i + j, 33) }); tanks.setColorAt(k * 2 + j, new THREE.Color(hf(i + j, 34) < 0.55 ? 0x1c1c1c : 0xe8e6e0)); }
    roofItems.push({ im: dishes, n: k, x: x + w * 0.3 * cr, y, z: z - w * 0.3 * sr, s: 1, rot: hf(i, 35) * 6.28 });
  });
  const tb = p.t_blast != null ? +p.t_blast : null, gz = new THREE.Vector3(150, 0, -58);
  const placeRoof = (t) => {
    for (const it of roofItems) {
      const dist = Math.hypot(it.x - gz.x, it.z - gz.z), ta = tb == null ? 1e9 : tb + shockArrive(dist, 1.1e6), x = t - ta;
      const j = x > 0 ? Math.exp(-x / 0.5) : 0, kx = j * 0.25 * Math.sin(x * 23 + it.n), kz = j * 0.2 * Math.cos(x * 19 + it.n);
      m4.compose(new THREE.Vector3(it.x + kx * 0.6, it.y, it.z + kz * 0.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(kx, it.rot || 0, kz)), new THREE.Vector3(it.s, it.s, it.s));
      it.im.setMatrixAt(it.n, m4);
    }
    tanks.instanceMatrix.needsUpdate = dishes.instanceMatrix.needsUpdate = true;
  };
  placeRoof(0); tanks.castShadow = dishes.castShadow = true; root.add(tanks, dishes);
  noQA(root);
  const hangarTop = new THREE.Vector3(150, deck + 13, -58);
  return { root, radius: 800, height: 80, snapped: true, footprint: [1500, 900], update: (t) => { if (tb != null) { placeRoof(t); h12.visible = !damaged && t < tb + 0.04; } }, contact: false,
    anchors: { silos: new THREE.Vector3(-40, deck + 30, -70), hangar12: hangarTop, ground_zero: new THREE.Vector3(150, deck, -58), quay: new THREE.Vector3(0, deck, -5), city: new THREE.Vector3(0, landY(-900) + 20, -900), crane: new THREE.Vector3(-330, deck + 45, -8) } };
}

// ── interior.hangar12 (the inside of Hangar 12) ──────────────────────────────────────────────────────────────────
async function buildHangarIn(item, ctx) {
  const p = explicitParams(item, CATALOG['interior.hangar12']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'interior.hangar12';
  root.position.set(at[0], G.height(at[0], at[1]), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const place = new THREE.Group(); place.name = 'hangar12_place'; root.add(place);   // the floor level (QA reads the first child as the room)
  const L = num(p.length, 60), W = num(p.width, 30), H = 12;
  const corr = stdM({ map: corrugTex('#8d9294'), roughness: 0.8, metalness: 0.25, side: THREE.DoubleSide }), conc = stdM({ color: 0x77736c, roughness: 0.95 }), steel = stdM({ color: 0x55595c, roughness: 0.5, metalness: 0.6 });
  addBox(place, W, 0.2, L, conc, 0, -0.1, 0);
  for (const s2 of [-1, 1]) { const w = addBox(place, 0.2, H, L, corr, s2 * W / 2, H / 2, 0); w.material = corr; }
  addBox(place, W, H, 0.2, corr, 0, H / 2, -L / 2); addBox(place, W, H, 0.2, corr, 0, H / 2, L / 2);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.62, W * 0.62, L, 24, 1, true, -0.7, 1.4), corr); roof.rotation.set(-Math.PI / 2, 0, 0); roof.position.y = H - W * 0.62 * Math.cos(0.7) + 0.2; place.add(roof);   // axis along z, the arc up
  for (let k = 0; k < 7; k++) { const z = -L / 2 + (k + 0.5) * L / 7; strut(place, [-W / 2, H, z], [0, H + 3, z], 0.15, steel); strut(place, [W / 2, H, z], [0, H + 3, z], 0.15, steel); strut(place, [-W / 2, H, z], [W / 2, H, z], 0.1, steel); }
  // skylight strips: pale light panels in the roof
  for (let k = 0; k < 5; k++) { const sk = new THREE.Mesh(new THREE.PlaneGeometry(2.2, L * 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.15, 1.08), side: THREE.DoubleSide })); sk.rotation.x = Math.PI / 2; sk.position.set(-W * 0.3 + k * W * 0.15, H + 2.2, 0); place.add(sk); }
  const fill = new THREE.PointLight(new THREE.Color(1, 0.97, 0.9), 900, 60, 1.6); fill.position.set(0, H - 1, 0); fill.userData.noGovern = true; place.add(fill);
  for (const [lx, lz] of [[W * 0.3, -L * 0.3], [W * 0.3, L * 0.3], [-W * 0.3, 0]]) { const f2 = new THREE.PointLight(new THREE.Color(1, 0.95, 0.86), 420, 50, 1.6); f2.position.set(lx, H - 2, lz); f2.userData.noGovern = true; place.add(f2); }
  const hemiIn = new THREE.HemisphereLight(0xf2ece2, 0x6f665a, 0.9); place.add(hemiIn);   // daylight through the skylights and the door, not the sky's blue
  // the bulk bags (FIBC: white woven bags ~1.1 m, lifting loops), stacked in rows to the roof
  const bagG = new THREE.BoxGeometry(1.05, 1.1, 1.05, 8, 8, 8), BP = bagG.attributes.position;   // a soft woven bulk bag: sides bulging, corners rounded, the top sagging
  for (let i = 0; i < BP.count; i++) {
    const x = BP.getX(i), y = BP.getY(i), z = BP.getZ(i), u = x / 0.525, v = y / 0.55, w = z / 0.525;
    const side = 1 + 0.09 * (1 - v * v), corner = 1 - 0.16 * Math.pow(Math.abs(u * w), 1.5), sag = v > 0 ? 0.07 * (1 - u * u) * (1 - w * w) * v : 0;
    BP.setXYZ(i, x * side * corner, y - sag - (v < 0 ? 0.03 * (u * u + w * w) * -v : 0), z * side * corner);
  }
  bagG.computeVertexNormals();
  const bagTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, w, h); for (let i = 0; i < 64; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(i * 2, 0, 1, h); g.fillRect(0, i * 2, w, 1); } g.fillStyle = '#1d4f91'; g.font = 'bold 18px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('NH4NO3', 64, 60); g.fillText('34.7% N', 64, 82); }, [1, 1]);
  const bags = new THREE.InstancedMesh(bagG, stdM({ map: bagTex, roughness: 0.85, envMapIntensity: 0.35 }), 1400); const m4 = new THREE.Matrix4(); let nb = 0;
  for (let row = 0; row < 6 && nb < 1400; row++) for (let i = 0; i < 40 && nb < 1400; i++) for (let lv = 0; lv < 6 && nb < 1400; lv++) {
    if (lv > 3 + Math.floor(hf(row * 40 + i, 3) * 3)) continue;
    const x = -W / 2 + 2 + row * 2.4 + (row > 2 ? 3.5 : 0), z = -L / 2 + 6 + i * 1.12;
    m4.compose(new THREE.Vector3(x + (hf(nb, 4) - 0.5) * 0.1, 0.55 + lv * 1.1, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (hf(nb, 5) - 0.5) * 0.1), new THREE.Vector3(1, 1, 1)); bags.setMatrixAt(nb++, m4);
  }
  bags.count = nb; bags.castShadow = bags.receiveShadow = true; place.add(bags);
  // the fireworks: stacks of dark nylon bags / boxes near the door end, sparking from t_spark; flames at the far end from t_fire
  const fwM = stdM({ color: 0x2b3440, roughness: 0.7 }), boxM = stdM({ color: 0xa8743c, roughness: 0.85 });
  for (let i = 0; i < 24; i++) addBox(place, 0.9, 0.6, 0.7, i % 3 ? fwM : boxM, W / 2 - 2.5 - (i % 3) * 0.95, 0.3 + Math.floor(i / 12) * 0.6, L / 2 - 4 - (Math.floor(i / 3) % 4) * 0.8);
  const SP = makeSparks(ctx, { count: 600, maxPx: 5, minPx: 1.2, order: 13 }), FLm = makeFlames(ctx, { count: 120, hdr: 3.5, order: 11 }), SM = makeCPuffs(ctx, { count: 600, near: 1, fog: 0.9, order: 10 });
  place.add(SP.mesh, FLm.mesh, SM.mesh);
  const FL = new THREE.PointLight(new THREE.Color(1, 0.55, 0.25), 0, 40, 2); FL.userData.noGovern = true; FL.position.set(-W * 0.2, 3, -L / 2 + 4); place.add(FL);
  const tS = p.t_spark != null ? +p.t_spark : null, tF = p.t_fire != null ? +p.t_fire : null;
  function update(t, clock, camera) {
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    syncEnv(ctx); SP.begin(); FLm.begin(t); SM.begin();
    if (tS != null && t > tS) for (let k = 0; k < 16; k++) {                 // the fireworks popping
      const tp = tS + hf(k, 11) * 6, dt = ((t - tp) % 1.7 + 1.7) % 1.7; if (t < tp) continue;
      const ox = W / 2 - 2.5 - hf(k, 12) * 2, oz = L / 2 - 4 - hf(k, 13) * 3, oy = 0.8 + hf(k, 14);
      for (let j = 0; j < 30; j++) { const a = hf(j + k * 40, 15) * TAU, e = (hf(j + k * 40, 16) - 0.2) * 2, v = 3 + 6 * hf(j + k * 40, 17), kk = Math.max(0, 1 - dt / 0.8); if (kk <= 0) continue; SP.push(ox + Math.cos(a) * Math.cos(e) * v * dt, oy + Math.sin(e) * v * dt - 4.9 * dt * dt, oz + Math.sin(a) * Math.cos(e) * v * dt, 3.5 * kk, 2.8 * kk, 1.6 * kk, 0.03); }
    }
    const fk = tF == null ? 0 : sstep(tF, tF + 3, t);
    if (fk > 0) {
      for (let i = 0; i < 60; i++) FLm.push(-W * 0.35 + hf(i, 21) * W * 0.4, 0, -L / 2 + 2 + hf(i, 22) * 8, (1.5 + 3.5 * hf(i, 23)) * fk, 1 + hf(i, 24), hf(i, 25), 0.9, 0.5);
      for (let i = 0; i < 400; i++) { const Lf = 8, age = ((t + hf(i, 31) * Lf) % Lf), f = age / Lf; SM.push(-W * 0.2 + (hf(i, 32) - 0.5) * W * 0.5 + f * 4, 2 + age * 1.6, -L / 2 + 5 + f * L * 0.5, 1 + 3 * f, hf(i, 33) * 6.28, 0.55 * fk * (1 - sstep(0.7, 1, f)), i & 3, -1e9, 0.9, f < 0.1 ? 0.8 : 0, 0, 0, 0.3 + 0.4 * f, 0.6, hf(i, 34), 0.4, 0.55, 0.53, 0.5, 0); }
      FL.intensity = 400 * fk * (0.85 + 0.15 * Math.sin(t * 11));
    } else FL.intensity = 0;
    SP.end(); FLm.end(); SM.end(camera);
  }
  update(0, 0, null);
  root.traverse((o) => { if (o.isMesh) o.userData.noQA = true; });
  return { root, radius: L / 2, height: H + 3, snapped: true, update, footprint: [W, L], contact: false, pitchDark: false,
    anchors: { bags: new THREE.Vector3(-W / 2 + 6, 3, 0), fireworks: new THREE.Vector3(W / 2 - 3.5, 1, L / 2 - 5), fire: new THREE.Vector3(-W * 0.2, 2, -L / 2 + 5), door: new THREE.Vector3(0, 2, L / 2 - 2) } };
}

// ── landmark.test_tower ──────────────────────────────────────────────────────────────────────────────────────────
async function buildTower(item, ctx) {
  const p = explicitParams(item, CATALOG['landmark.test_tower']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'landmark.test_tower';
  root.position.set(at[0], G.height(at[0], at[1]), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const style = String(p.style || 'trinity');
  const steel = stdM({ color: 0x7c7f80, roughness: 0.55, metalness: 0.6 }), shed = stdM({ map: corrugTex('#b9b4a8'), roughness: 0.75, metalness: 0.25 }), wood = stdM({ color: 0x8c7250, roughness: 0.9 }), conc = stdM({ color: 0xb4ada0, roughness: 0.95 });
  let H = 0;
  if (style === 'cab') {                                                     // Ivy Mike's shot cab: a big corrugated building + the cryogenic annex
    H = 27;
    addBox(root, 26, 27, 20, shed, 0, 13.5, 0); addBox(root, 40, 12, 18, shed, -33, 6, 2); addBox(root, 8, 34, 8, shed, 12, 17, -6);
    for (let i = 0; i < 6; i++) strut(root, [-60 - i * 12, 1.5, 0], [-54 - i * 12, 1.5, 0], 0.45, steel);
    addBox(root, 90, 0.4, 3, conc, -95, 0.2, 0, { cast: false });
  } else {
    H = num(p.height, 30.5);
    const b = 5.8, tp = 2.2, n = 6;
    const leg = (sx, sz) => strut(root, [sx * b, 0, sz * b], [sx * tp, H, sz * tp], 0.14, steel, 8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { leg(sx, sz); addBox(root, 1.2, 0.6, 1.2, conc, sx * b, 0.3, sz * b); }
    for (let k = 0; k < n; k++) {                                            // cross-bracing per section
      const y0 = H * k / n, y1 = H * (k + 1) / n, w0 = lerp(b, tp, k / n), w1 = lerp(b, tp, (k + 1) / n);
      for (const [a0, a1] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) {
        strut(root, [a0[0] * w0, y0, a0[1] * w0], [a1[0] * w1, y1, a1[1] * w1], 0.05, steel, 5);
        strut(root, [a1[0] * w0, y0, a1[1] * w0], [a0[0] * w1, y1, a0[1] * w1], 0.05, steel, 5);
        strut(root, [a0[0] * w1, y1, a0[1] * w1], [a1[0] * w1, y1, a1[1] * w1], 0.07, steel, 5);
      }
    }
    addBox(root, 6.2, 0.35, 6.2, wood, 0, H + 0.18, 0);                       // the platform
    addBox(root, 4.2, 3.2, 4.2, shed, 0, H + 0.35 + 1.6, 0);                  // the shot cab (the device inside)
    addBox(root, 4.6, 0.2, 4.6, stdM({ color: 0x8a8a86, roughness: 0.6, metalness: 0.4 }), 0, H + 3.65, 0);
    for (let k = 0; k < 40; k++) strut(root, [-b - 0.6, k * H / 40, 0], [-b - 0.6, (k + 0.5) * H / 40, 0], 0.02, steel, 4);   // (ladder rail)
  }
  noQA(root); root.traverse((o) => { if (o.isMesh) o.userData.noQA = false; });
  return { root, radius: 8, height: H + 4, snapped: true, footprint: [12, 12], update: () => {}, anchors: { cab: new THREE.Vector3(0, H + 2, 0), top: new THREE.Vector3(0, H + 4, 0), base: new THREE.Vector3(0, 0, 0) } };
}

// ── prop.bomb ────────────────────────────────────────────────────────────────────────────────────────────────────
const BOMBS = {
  tsar: { L: 8.0, D: 2.1, color: 0x5d6457, nose: 0.9, tail: 0.3, fins: 4, finH: 1.0, chute: 22 },          // RDS-220, 27 t
  little_boy: { L: 3.0, D: 0.71, color: 0x40443d, nose: 0.5, tail: 0.6, box: true, chute: 0 },
  fat_man: { L: 3.25, D: 1.52, color: 0xc5b35a, nose: 1.6, tail: 0.35, box: true, egg: true, chute: 0 },
  moab: { L: 9.18, D: 1.03, color: 0x5f6b45, nose: 1.4, tail: 0.5, grid: true, bands: true, chute: 0 },
  mk82: { L: 2.21, D: 0.27, color: 0x5f6b45, nose: 1.1, tail: 0.35, fins: 4, finH: 0.25, bands: true, chute: 0 },
};
async function buildBomb(item, ctx) {
  const p = explicitParams(item, CATALOG['prop.bomb']);
  const at = item.at || [0, 0], G = ctx.ground;
  const B = BOMBS[String(p.variant || 'tsar').toLowerCase()] || BOMBS.tsar;
  const root = new THREE.Group(); root.name = 'prop.bomb';
  const body = new THREE.Group(); root.add(body);                        // the bomb along +Z (nose forward); pitched nose-down when falling
  const skin = stdM({ color: B.color, roughness: 0.55, metalness: 0.35 }), dark = stdM({ color: 0x2c2f2b, roughness: 0.6, metalness: 0.4 }), band = stdM({ color: 0xc9a933, roughness: 0.6 });
  const R = B.D / 2, L = B.L;
  const prof = [];
  for (let i = 0; i <= 24; i++) {                                         // lathe profile: tail (y 0) .. nose (y L)
    const u = i / 24, y = u * L;
    let r = R;
    if (B.egg) r = R * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.45) / 0.55, 2))) + 0.02;
    else { const tn = B.nose * R, tt = B.tail * L * 0.3; if (y > L - tn) r = R * Math.sqrt(Math.max(0, 1 - ((y - (L - tn)) / tn) ** 2)); if (y < tt) r = R * lerp(0.45, 1, y / tt); }
    prof.push(new THREE.Vector2(Math.max(0.005, r), y));
  }
  const lat = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), skin); lat.rotation.x = Math.PI / 2; lat.position.z = -L / 2; lat.castShadow = true; body.add(lat);
  if (B.bands) for (const u of [0.35, 0.72]) addCyl(body, R * 1.005, R * 1.005, L * 0.02, band, 0, 0, -L / 2 + u * L, 36, { rot: [Math.PI / 2, 0, 0] });
  if (B.fins) for (let k = 0; k < B.fins; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.04 * R + 0.02, B.finH * 2, L * 0.16), dark); f.position.set(0, B.finH + R * 0.35, -L / 2 + L * 0.08); const g = new THREE.Group(); g.rotation.z = k * TAU / B.fins + Math.PI / 4; g.add(f); body.add(g); }
  if (B.box) { const bx = new THREE.Mesh(new THREE.BoxGeometry(R * 2.3, R * 2.3, L * 0.22), dark); bx.position.z = -L / 2 + L * 0.02; body.add(bx); const inner = new THREE.Mesh(new THREE.BoxGeometry(R * 2.1, R * 2.1, L * 0.23), skin); inner.position.z = bx.position.z; inner.scale.set(0.92, 0.92, 1.01); body.add(inner); }
  if (B.grid) for (let k = 0; k < 4; k++) { const g = new THREE.Group(); g.rotation.z = k * TAU / 4; body.add(g); for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.24), dark); c.position.set(-0.48 + a * 0.24, R + 0.1 + b * 0.24, -L / 2 + 0.35); const fr = new THREE.Mesh(new THREE.EdgesGeometry(c.geometry), new THREE.LineBasicMaterial({ color: 0x1a1c19 })); c.add(fr); g.add(c); } }
  // the parachute: a big canopy with orange and white gores, the lines converging on the tail
  const chuteR = num(p.chute_r, B.chute || (p.parachute ? Math.max(6, L * 1.2) : 0));
  const wantChute = p.parachute !== false && (p.parachute === true || B.chute > 0) && chuteR > 0;
  let canopy = null;
  if (wantChute) {
    const gores = 24, tex = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < gores; i++) { g.fillStyle = i % 2 ? '#f2efe6' : '#e2692c'; g.fillRect(i * w / gores, 0, w / gores + 1, h); } g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 6, w, 6); }, [1, 1]);
    canopy = new THREE.Group(); root.add(canopy);
    const cg = new THREE.SphereGeometry(chuteR, 48, 16, 0, TAU, 0, Math.PI * 0.42);
    const cm = new THREE.Mesh(cg, stdM({ map: tex, roughness: 0.8, side: THREE.DoubleSide })); cm.scale.set(1, 0.62, 1); cm.castShadow = true; canopy.add(cm);
    const rim = chuteR * Math.sin(Math.PI * 0.42), rimY = chuteR * 0.62 * Math.cos(Math.PI * 0.42);
    const lineM = new THREE.LineBasicMaterial({ color: 0x3a3833, transparent: true, opacity: 0.7 });
    const pts = []; for (let i = 0; i < gores; i++) { const a = i / gores * TAU; pts.push(new THREE.Vector3(Math.cos(a) * rim, rimY, Math.sin(a) * rim), new THREE.Vector3(0, -chuteR * 1.3, 0)); }
    canopy.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineM));
    canopy.position.y = chuteR * 1.3 + L / 2 + 2;
    strut(root, [0, L / 2, 0], [0, L / 2 + 2, 0], 0.03, dark, 4);
  }
  // pose: falling nose-down under the chute, or lying / hanging as a prop
  const falling = wantChute || p.fall != null;
  if (falling) body.rotation.x = -Math.PI / 2;                              // nose down (+Z -> -Y)
  else body.position.y = R + 0.02;
  if (!falling && p.trolley === true) {                                     // a low steel trolley with wheels under it (the hangar shot)
    const tm = stdM({ color: 0x3d4146, roughness: 0.5, metalness: 0.6 }), tl = L * 0.8, th = 0.35 + R * 0.15;
    addBox(root, R * 1.3, 0.14, tl, tm, 0, th, 0); for (const z of [-tl * 0.35, tl * 0.35]) { addBox(root, R * 1.3, R * 0.5, 0.18, tm, 0, th + R * 0.25, z); }
    for (const x of [-R * 0.55, R * 0.55]) for (const z of [-tl * 0.4, 0, tl * 0.4]) addCyl(root, 0.18, 0.18, 0.12, stdM({ color: 0x1a1a1a, roughness: 0.8 }), x, 0.18, z, 16, { rot: [0, 0, Math.PI / 2] });
    body.position.y = th + 0.07 + R;
  }
  const y0 = num(p.y, falling ? 4000 : G.height(at[0], at[1])), vFall = num(p.speed, wantChute ? 35 : 0), tF = num(p.fall, 0);
  root.position.set(at[0], y0, at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  noQA(root);
  function update(t) {
    if (!falling) return;
    const x = Math.max(0, t - tF);
    root.position.y = y0 - vFall * x;
    root.rotation.z = 0.03 * Math.sin(t * 0.9); root.rotation.x = 0.02 * Math.sin(t * 0.7 + 1);
    if (canopy) { const b = 1 + 0.025 * Math.sin(t * 2.3); canopy.scale.set(b, 1 / b, b); }
  }
  update(0);
  return { root, radius: Math.max(L, chuteR * 2) / 2, height: L + chuteR * 2.6, snapped: true, fly: falling, update, contact: !falling,
    anchors: { bomb: new THREE.Vector3(0, 0, 0), chute: new THREE.Vector3(0, chuteR * 1.3 + L / 2 + 2, 0) } };
}

// ── aircraft.tu95 ────────────────────────────────────────────────────────────────────────────────────────────────
async function buildTu95(item, ctx) {
  const p = explicitParams(item, CATALOG['aircraft.tu95']);
  const at = item.at || [0, 0], G = ctx.ground;
  const white = p.livery !== 'metal';
  const skin = stdM({ color: white ? 0xeeeeea : 0xb9bcbe, roughness: white ? 0.45 : 0.3, metalness: white ? 0.05 : 0.8 }), dark = stdM({ color: 0x2a2d30, roughness: 0.5, metalness: 0.3 });
  const glass = stdM({ color: 0x1c2a33, roughness: 0.1, metalness: 0.6 }), red = stdM({ color: 0xb22222, roughness: 0.5 });
  const root = new THREE.Group(); root.name = 'aircraft.tu95';
  const ac = new THREE.Group(); root.add(ac);                             // +Z = nose
  // fuselage: 46 m, 2.9 m wide
  const fp = []; for (let i = 0; i <= 30; i++) { const u = i / 30, y = u * 46; let r = 1.45; if (u > 0.9) r *= Math.sqrt(Math.max(0, 1 - ((u - 0.9) / 0.1) ** 2)) * 0.9 + 0.1; if (u < 0.2) r *= lerp(0.35, 1, (u / 0.2) ** 0.7); fp.push(new THREE.Vector2(Math.max(0.05, r), y)); }
  const fus = new THREE.Mesh(new THREE.LatheGeometry(fp, 28), skin); fus.rotation.x = Math.PI / 2; fus.position.z = -23; fus.castShadow = true; ac.add(fus);
  addBox(ac, 1.6, 0.6, 2.4, glass, 0, 1.1, 18.5, { cast: false });                     // cockpit glazing
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), glass); nose.position.set(0, -0.2, 22.6); nose.scale.set(1, 0.9, 0.8); ac.add(nose);
  // swept wings (35 deg), 50 m span; tailplane; fin
  const wing = (span, root_c, tip_c, sweep, th, y, z, mat) => {
    const sh = new THREE.Shape(); const s = span / 2, sw = Math.tan(sweep * DEG) * s;
    sh.moveTo(0, root_c / 2); sh.lineTo(s, root_c / 2 - sw); sh.lineTo(s, root_c / 2 - sw - tip_c); sh.lineTo(0, -root_c / 2); sh.lineTo(-s, root_c / 2 - sw - tip_c); sh.lineTo(-s, root_c / 2 - sw); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * 0.3, bevelSize: th * 0.4, bevelSegments: 2 }); g.rotateX(Math.PI / 2); g.translate(0, y + th / 2, z);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; ac.add(m); return m;
  };
  wing(50, 7.5, 2.6, 35, 0.55, -0.2, 2.5, skin);
  wing(14.8, 4.2, 1.6, 40, 0.25, 0.7, -20.5, skin);
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(-6.8, 0); fin.lineTo(-10.2, 7.4); fin.lineTo(-7.9, 7.4); fin.closePath();
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.35, bevelEnabled: false }); fg.rotateY(-Math.PI / 2); fg.translate(0.17, 1.2, -13.7);
  const fm = new THREE.Mesh(fg, skin); fm.castShadow = true; ac.add(fm);
  addBox(ac, 0.36, 1.1, 1.2, red, 0, 6.0, -21.4, { cast: false });           // fin tip marking
  // four NK-12 turboprops with contra-rotating propellers (blurred discs + blades), long nacelles
  const props = [];
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const x = sx * (k ? 13.4 : 6.2), z = 2.5 + 3.8 - Math.tan(35 * DEG) * Math.abs(x);
    addCyl(ac, 0.7, 0.9, 8, skin, x, -0.4, z - 1.5, 16, { rot: [Math.PI / 2, 0, 0] });
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 16), dark); sp.rotation.x = Math.PI / 2; sp.position.set(x, -0.4, z + 3.4); ac.add(sp);
    for (const dz of [0, -0.7]) {
      const pr = new THREE.Group(); pr.position.set(x, -0.4, z + 2.5 + dz); ac.add(pr);
      for (let b = 0; b < 4; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.8, 0.06), dark); bl.position.y = 1.5; const g = new THREE.Group(); g.rotation.z = b * TAU / 4 + dz * 3; g.add(bl); pr.add(g); }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.9, 32), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); pr.add(disc);
      props.push({ pr, dir: dz ? -1 : 1 });
    }
  }
  // the bomb in its belly (Tsar Bomba was carried half outside: the bay doors were removed)
  let bomb = null;
  if (p.bomb !== false) { bomb = new THREE.Group(); const b = await buildBomb({ variant: 'tsar', parachute: false, at: [0, 0] }, { ground: { height: () => 0 } }); b.root.position.set(0, -1.9, 1); b.root.rotation.set(0, 0, 0); b.root.children[0].position.set(0, 0, 0); bomb.add(b.root); ac.add(bomb); }
  // flight: a straight line through `at` at `alt`, heading, speed; `drop` hides the bomb (it falls on its own prop.bomb)
  const alt = num(p.alt, 10500), spd = num(p.speed, 200), hd = (item.heading ?? 0) * DEG, dropT = p.drop != null ? +p.drop : null;
  const dx = Math.sin(hd), dz = -Math.cos(hd);
  root.rotation.y = Math.atan2(dx, dz);
  function update(t) {
    root.position.set(at[0] + dx * spd * t, alt + 0.6 * Math.sin(t * 0.8), at[1] + dz * spd * t);
    ac.rotation.z = 0.004 * Math.sin(t * 0.5);
    for (const q of props) q.pr.rotation.z = q.dir * t * 22;
    if (bomb) bomb.visible = dropT == null || t < dropT;
  }
  update(0);
  noQA(root);
  return { root, radius: 25, height: 12, snapped: true, fly: true, update, footprint: [50, 46], contact: false,
    anchors: { body: ac, nose: new THREE.Vector3(0, 0, 22), bomb_bay: new THREE.Vector3(0, -2, 1), tail: new THREE.Vector3(0, 6, -21) },
    positionAt: (t) => [at[0] + dx * spd * t, alt, at[1] + dz * spd * t] };
}

// ── aircraft.c130 (the MOAB drop) ────────────────────────────────────────────────────────────────────────────────
async function buildC130(item, ctx) {
  const p = explicitParams(item, CATALOG['aircraft.c130']);
  const at = item.at || [0, 0];
  const grey = stdM({ color: 0x7d8387, roughness: 0.55, metalness: 0.2 }), dark = stdM({ color: 0x2a2d30, roughness: 0.6 }), inner = stdM({ color: 0x4a4d4f, roughness: 0.8, side: THREE.DoubleSide }), glass = stdM({ color: 0x18222a, roughness: 0.1, metalness: 0.6 });
  const root = new THREE.Group(); root.name = 'aircraft.c130';
  const ac = new THREE.Group(); root.add(ac);                               // +Z = nose; the cargo floor at y 0
  // fuselage: a hollow shell (the hold) with a flat floor, rounded nose, the upswept tail with the ramp opening
  const L = 29.8, R = 2.2;
  const prof = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40, z = -L / 2 + u * L; let r = R; if (u > 0.86) r = R * Math.sqrt(Math.max(0, 1 - ((u - 0.86) / 0.14) ** 2)) * 0.95 + 0.05; prof.push([z, r]); }
  const shell = new THREE.Group(); ac.add(shell);
  const segs = 28, pos = [], idx = [];
  for (let i = 0; i < prof.length; i++) {
    const [z, r] = prof[i], tail = clamp((-z - 4) / 10.9);                    // aft of z -4 the belly sweeps up to the ramp hinge
    for (let j = 0; j <= segs; j++) {
      const a = j / segs * TAU, cy = Math.cos(a), sy = Math.sin(a);
      let y = R * 0.85 + cy * r * 0.95, x = sy * r;
      if (cy < -0.3) y = Math.max(y, R * 0.85 - r * 0.95 + tail * tail * R * 1.55);   // the upswept tail underside
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + segs + 1; const u = i / (prof.length - 1), aj = j / segs, bottom = Math.cos(aj * TAU) < -0.55; if (u < 0.18 && bottom && p.ramp !== false) continue; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setIndex(idx); fg.computeVertexNormals();
  const fus = new THREE.Mesh(fg, grey); fus.castShadow = true; shell.add(fus);
  const fin = new THREE.Mesh(fg, inner); fin.scale.setScalar(0.985); fin.position.y = 0.03; shell.add(fin);
  addBox(ac, 3.1, 0.1, 13, dark, 0, 0.05, -1.5);                              // the cargo floor with its rails
  for (const x of [-0.9, 0.9]) addBox(ac, 0.12, 0.08, 13, stdM({ color: 0x8a8d8f, metalness: 0.7, roughness: 0.35 }), x, 0.14, -1.5);
  addBox(ac, 1.5, 0.5, 1.2, glass, 0, R * 1.55, L / 2 - 2.6);                 // cockpit glazing
  // wings: a straight high wing, 40.4 m span, 4 nacelles with 4-blade props
  const wing = new THREE.Mesh(new THREE.BoxGeometry(40.4, 0.45, 4.2), grey); wing.position.set(0, R * 1.85, 1.2); wing.castShadow = true; ac.add(wing);
  const props = [];
  for (const x of [-10.2, -5.2, 5.2, 10.2]) {
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 5.6, 14), grey); nac.rotation.x = Math.PI / 2; nac.position.set(x, R * 1.72, 2.4); nac.castShadow = true; ac.add(nac);
    const pr = new THREE.Group(); pr.position.set(x, R * 1.72, 5.35); ac.add(pr);
    for (let b = 0; b < 4; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.05, 0.05), dark); bl.position.y = 1.05; const g2 = new THREE.Group(); g2.rotation.z = b * TAU / 4; g2.add(bl); pr.add(g2); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); pr.add(disc); props.push(pr);
  }
  // the tail: a tall fin, stabilisers
  const tailY = R * 1.4;
  const finG = new THREE.Shape(); finG.moveTo(0, 0); finG.lineTo(-5.2, 0); finG.lineTo(-6.6, 6.2); finG.lineTo(-4.4, 6.2); finG.closePath();
  const fgm = new THREE.ExtrudeGeometry(finG, { depth: 0.3, bevelEnabled: false }); fgm.rotateY(-Math.PI / 2); fgm.translate(0.15, tailY + 0.8, -L / 2 + 5.8);
  const fm = new THREE.Mesh(fgm, grey); fm.castShadow = true; ac.add(fm);
  const hs = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 3.2), grey); hs.position.set(0, tailY + 1.1, -L / 2 + 1.8); hs.castShadow = true; ac.add(hs);
  // the ramp (lowered to level with the floor) and the upper door raised into the tail
  const rampG = new THREE.Group(); rampG.position.set(0, 0.1, -L / 2 + 5.2); ac.add(rampG);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 3.6), grey); ramp.position.z = -1.8; ramp.castShadow = true; rampG.add(ramp);
  rampG.rotation.x = p.ramp === false ? -1.0 : 0.12;
  // the load: a MOAB (GBU-43/B) on its cradle, pulled out by a drogue chute at `extract`
  const load = new THREE.Group(); ac.add(load);
  const cradle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 9.6), stdM({ color: 0x6f6a58, roughness: 0.8 })); cradle.position.y = 0.4; load.add(cradle);
  let bombRoot = null; try { const b = await buildBomb({ variant: 'moab', parachute: false, at: [0, 0] }, { ground: { height: () => 0 } }); bombRoot = b.root; bombRoot.position.set(0, 0.62 + 0.52, 0); load.add(bombRoot); } catch (e) { /* */ }
  const chute = new THREE.Group(); ac.add(chute);
  const gtex = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#e8e4d8' : '#c8a060'; g.fillRect(i * 16, 0, 16, h); } }, [1, 1]);
  const cm = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 10, 0, TAU, 0, Math.PI * 0.42), stdM({ map: gtex, roughness: 0.85, side: THREE.DoubleSide })); cm.rotation.x = Math.PI / 2; cm.scale.set(1, 0.7, 1); chute.add(cm);   // the mouth faces the plane
  const lpts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; lpts.push(new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.6), new THREE.Vector3(0, 0, 5)); }
  chute.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lpts), new THREE.LineBasicMaterial({ color: 0x3a3833 })));
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), dark); line.rotation.x = Math.PI / 2; ac.add(line);
  const hd = (item.heading ?? 0) * DEG, spd = num(p.speed, 70), alt = num(p.alt, 1900), dx = Math.sin(hd), dz = -Math.cos(hd);
  const tX = p.extract != null ? +p.extract : null;
  root.rotation.y = Math.atan2(dx, dz);
  const load0 = -1.2;
  function update(t) {
    root.position.set(at[0] + dx * spd * t, alt + 0.5 * Math.sin(t * 0.7), at[1] + dz * spd * t);
    for (const pr of props) pr.rotation.z = t * 25;
    // the drogue behind the ramp, then the load sliding aft (a = 0.6 g) and dropping away behind the plane
    const x = tX == null ? -1 : t - tX;
    const chZ = -L / 2 - 6 - (x > 0 ? 18 * Math.min(1, x / 0.8) : 0);
    chute.visible = tX != null && x > -1.5; chute.position.set(0, 0.8, chZ + (x > 0.8 ? -8 * (x - 0.8) : 0));
    let lz = load0, ly = 0, pitch = 0;
    if (x > 0) { const s = 0.5 * 6 * x * x; lz = load0 - s; const edge = -L / 2 + 5.2 - 3.6 + 4.8; if (lz < -L / 2 - 1) { const tf = x - Math.sqrt(2 * (load0 - (-L / 2 - 1)) / 6); ly = -4.9 * tf * tf; lz -= tf * 4; pitch = -Math.min(0.6, tf * 0.5); } }
    load.position.set(0, ly, lz); load.rotation.x = pitch;
    const a = new THREE.Vector3(0, 0.8, load.position.z - 4.8), b = chute.position.clone(); line.position.copy(a).add(b).multiplyScalar(0.5); line.scale.set(1, a.distanceTo(b), 1); line.lookAt(b); line.rotateX(Math.PI / 2); line.visible = chute.visible;
  }
  update(0);
  noQA(root);
  return { root, radius: 20, height: 12, snapped: true, fly: true, update, footprint: [40, 30], contact: false,
    anchors: { body: ac, ramp: new THREE.Vector3(0, 1, -L / 2 + 1), hold: new THREE.Vector3(0, 1.6, 2), bomb: load, nose: new THREE.Vector3(0, 2, L / 2) } };
}

// ── detail.barograph ─────────────────────────────────────────────────────────────────────────────────────────────
async function buildBarograph(item, ctx) {
  const p = explicitParams(item, CATALOG['detail.barograph']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'detail.barograph';
  root.position.set(at[0], G.height(at[0], at[1]) + num(p.elev, 0), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const tS = num(p.t_spike, 2), amp = clamp(num(p.amp, 1), 0.1, 1.6), passes = Array.isArray(p.passes) ? p.passes.map(Number) : [];
  const drumRate = num(p.drum_rate, 0.05);                                 // rad per screen second (time-compressed clockwork)
  const mahog = stdM({ color: 0x5a2a17, roughness: 0.45 }), brass = stdM({ color: 0xc8a25a, roughness: 0.3, metalness: 0.9 }), steel = stdM({ color: 0x9aa0a4, roughness: 0.3, metalness: 0.9 }), black = stdM({ color: 0x151515, roughness: 0.4 });
  addBox(root, 0.34, 0.06, 0.2, mahog, 0, 0.03, 0);                       // the case base
  addBox(root, 0.33, 0.012, 0.19, stdM({ color: 0x7a3a1f, roughness: 0.4 }), 0, 0.066, 0, { cast: false });
  // the glass cover (a clear box with brass edges)
  const gl = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.12, envMapIntensity: 1.5, depthWrite: false }); patchMaterial(gl);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.17, 0.19), gl); cover.position.y = 0.072 + 0.085; cover.renderOrder = 6; root.add(cover);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cover.geometry), new THREE.LineBasicMaterial({ color: 0x8a6a30 })); edges.position.copy(cover.position); root.add(edges);
  // the drum with its chart (printed grid; the recorded line is drawn on a canvas as the pen moves)
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const g = cv.getContext('2d');
  const chartTex = new THREE.CanvasTexture(cv); chartTex.colorSpace = THREE.SRGBColorSpace; chartTex.anisotropy = 8;
  const drumR = 0.045, drumH = 0.09, drumX = 0.07;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR, drumH, 64, 1, true), stdM({ map: chartTex, roughness: 0.8 })); drum.position.set(drumX, 0.072 + 0.012 + drumH / 2, 0); root.add(drum);
  addCyl(root, drumR * 1.02, drumR * 1.02, 0.004, brass, drumX, 0.072 + 0.012, 0, 32); addCyl(root, drumR * 0.3, drumR * 0.3, 0.012, brass, drumX, 0.072 + 0.012 + drumH + 0.006, 0, 16);
  // the aneroid capsule stack and the linkage, the long pen arm reaching to the drum
  for (let i = 0; i < 6; i++) addCyl(root, 0.03, 0.03, 0.007, steel, -0.08, 0.08 + i * 0.009, 0, 32);
  addBox(root, 0.01, 0.07, 0.01, brass, -0.08, 0.12, 0.03); addBox(root, 0.06, 0.006, 0.006, brass, -0.05, 0.14, 0.03);
  const arm = new THREE.Group(); arm.position.set(-0.05, 0.14, 0.03); root.add(arm);
  const armLen = Math.hypot(drumX + drumR - (-0.05), 0.03) + 0.002;
  const armM = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.0025, 0.004), brass); armM.position.x = armLen / 2; arm.add(armM);
  const pen = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 8), stdM({ color: 0x3a2a7a, roughness: 0.4 })); pen.rotation.z = -Math.PI / 2; pen.position.x = armLen; arm.add(pen);
  arm.rotation.y = Math.atan2(0.03, drumX + drumR + 0.05);
  // the trace: pressure over the chart (a flat line, then the spike: sharp rise, a long fall, a smaller rebound)
  const trace = (tt) => {
    let v = 0.02 * Math.sin(tt * 0.9) + 0.01 * Math.sin(tt * 2.3);
    const spike = (x, a) => (x < 0 ? 0 : a * (x < 0.15 ? x / 0.15 : Math.exp(-(x - 0.15) / 0.6) * (1 - 0.35 * Math.sin((x - 0.15) * 3.2)) - 0.25 * Math.exp(-((x - 1.4) ** 2) / 0.3)));
    v += spike(tt - tS, amp); for (const [k, tp] of passes.entries()) v += spike(tt - tp, amp * Math.pow(0.55, k + 1));
    return v;
  };
  const ARC = 0.9;                                                          // the part of the drum the shot sees (the chart runs this way)
  const drawChart = (t) => {
    g.fillStyle = '#f3efe2'; g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = 'rgba(40,80,160,0.35)'; g.lineWidth = 1; for (let i = 0; i <= 40; i++) { g.beginPath(); g.moveTo(i * 25.6, 0); g.lineTo(i * 25.6, 256); g.stroke(); } for (let j = 0; j <= 10; j++) { g.beginPath(); g.moveTo(0, j * 25.6); g.lineTo(1024, j * 25.6); g.stroke(); }
    g.strokeStyle = 'rgba(40,80,160,0.7)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 256); g.stroke(); }
    g.fillStyle = 'rgba(40,80,160,0.9)'; g.font = '14px Courier Prime, monospace'; ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'MON'].forEach((d, i) => g.fillText(d, i * 128 + 4, 14));
    // ink: from the chart start to the current pen position (the drum turns under a fixed pen)
    const u1 = (t * drumRate) / TAU;                                        // chart fraction passed under the pen
    g.strokeStyle = '#3b2a8c'; g.lineWidth = 2.2; g.beginPath();
    const N = 400;
    for (let i = 0; i <= N; i++) { const tt = (i / N) * t, u = 0.3 + (tt * drumRate) / TAU, x = (1 - u % 1) * 1024, y = 150 - trace(tt) * 90; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    chartTex.needsUpdate = true;
    return trace(t);
  };
  const penY0 = 0.072 + 0.012 + drumH * 0.5;
  function update(t) {
    const v = drawChart(t);
    drum.rotation.y = -t * drumRate;
    arm.position.y = 0.14 + 0.0; arm.rotation.z = Math.asin(clamp(v * 0.03 / armLen, -0.9, 0.9));
  }
  update(0);
  noQA(root);
  return { root, radius: 0.2, height: 0.25, snapped: true, update, footprint: [0.34, 0.2], contact: true,
    anchors: { pen: new THREE.Vector3(drumX + drumR, penY0, 0.0), drum: new THREE.Vector3(drumX, penY0, 0), case: new THREE.Vector3(0, 0.12, 0) } };
}

// ── ship.cargo ───────────────────────────────────────────────────────────────────────────────────────────────────
function hullGeo(L, B, D, cAbove, cBelow, bowK = 0.16, sternK = 0.1) {
  // a ship hull: a superellipse section (flat bottom, round bilge, vertical sides) tapering to a raked bow and a rounded
  // counter stern. Local: +Z bow, y 0 = the waterline, the deck edge at 0.4 D, the keel at -0.6 D. Vertex colours:
  // cAbove over the waterline, cBelow (antifouling) under it.
  const nL = 48, nS = 16, pos = [], col = [], idx = [], top = 0.4 * D, n = 5;
  const halfW = (u) => (u > 1 - bowK ? B / 2 * Math.pow((1 - u) / bowK, 0.75) : u < sternK ? B / 2 * (0.6 + 0.4 * Math.sqrt(u / sternK)) : B / 2);
  for (let i = 0; i <= nL; i++) {
    const u = i / nL, z = (u - 0.5) * L, w = Math.max(0.02, halfW(u));
    const keelUp = u > 1 - bowK ? Math.pow((u - (1 - bowK)) / bowK, 1.5) * 0.55 * D : u < 0.04 ? (0.04 - u) / 0.04 * 0.35 * D : 0;
    const sheer = 0.06 * D * Math.pow(Math.abs(u - 0.45) / 0.55, 2);
    for (let j = 0; j <= nS; j++) {
      const a = j / nS * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
      const x = -Math.sign(ca) * w * Math.pow(Math.abs(ca), 2 / n), yb = -0.6 * D + keelUp;
      const y = top + sheer - (top + sheer - yb) * Math.pow(sa, 2 / n);
      pos.push(x, y, z); const c = y < 0.02 ? cBelow : cAbove; col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < nL; i++) for (let j = 0; j < nS; j++) { const a = i * (nS + 1) + j, b = a + nS + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
async function buildCargo(item, ctx) {
  const p = explicitParams(item, CATALOG['ship.cargo']);
  const at = item.at || [0, 0], G = ctx.ground;
  const era = String(p.era || '1917');
  const L = num(p.length, era === '1917' ? 97 : era === '1947' ? 135 : 150), B = L * (era === 'modern' ? 0.16 : 0.14), D = L * 0.085;
  const root = new THREE.Group(); root.name = 'ship.cargo';
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : G.height(at[0], at[1]);
  const ship = new THREE.Group(); root.add(ship);
  const hullC = era === '1947' ? 0x5c6166 : era === 'modern' ? 0x2e4a6b : 0x1d1d1f, upC = era === '1947' ? 0x80868a : 0xe8e2d4;
  const hullM = stdM({ color: 0xffffff, vertexColors: true, roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide }), upM = stdM({ color: upC, roughness: 0.7 }), deckM = stdM({ color: era === '1917' ? 0x8b7355 : 0x6f6a60, roughness: 0.9 });
  const sideM = stdM({ color: hullC, roughness: 0.7, metalness: 0.15 });
  const funM = stdM({ color: era === '1917' ? 0x2a2a2a : era === '1947' ? 0x2a2c2e : 0xc8c3b6, roughness: 0.6 }), mastM = stdM({ color: 0x4a4038, roughness: 0.7 });
  const hull = new THREE.Mesh(hullGeo(L, B, D, new THREE.Color(hullC), new THREE.Color(0x6e2a22)), hullM); hull.castShadow = true; hull.receiveShadow = true; ship.add(hull);
  const deckY = 0.4 * D + 0.02;
  const deckG = new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, w = (u > 0.84 ? Math.pow((1 - u) / 0.16, 0.75) : u < 0.1 ? 0.6 + 0.4 * Math.sqrt(u / 0.1) : 1) * B / 2 * 0.985; pts.push([w, (0.5 - u) * L]); } sh.moveTo(pts[0][0], pts[0][1]); for (const q of pts) sh.lineTo(q[0], q[1]); for (const q of pts.slice().reverse()) sh.lineTo(-q[0], q[1]); return sh; })());
  deckG.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(deckG, deckM); deck.position.y = deckY; deck.receiveShadow = true; ship.add(deck);
  addBox(ship, B * 0.62, D * 0.2, L * 0.1, sideM, 0, deckY + D * 0.1, L * 0.36);        // forecastle
  addBox(ship, B * 0.8, D * 0.16, L * 0.12, sideM, 0, deckY + D * 0.08, -L * 0.4);      // poop
  // superstructure + funnel(s), masts with derricks
  const midZ = era === '1947' ? 0 : -L * 0.06;
  addBox(ship, B * 0.62, D * 0.34, L * 0.13, upM, 0, deckY + D * 0.17, midZ);
  addBox(ship, B * 0.5, D * 0.2, L * 0.07, upM, 0, deckY + D * 0.44, midZ + L * 0.02);
  addBox(ship, B * 0.66, 0.2, L * 0.04, upM, 0, deckY + D * 0.55, midZ + L * 0.04);     // bridge wings
  const fH = era === '1917' ? D * 1.5 : D * 0.8, fR = B * (era === '1917' ? 0.1 : 0.12);
  addCyl(ship, fR, fR * 1.05, fH, funM, 0, deckY + D * 0.34 + fH / 2, midZ - L * 0.04, 20);
  if (era !== 'modern') {
    for (const mz of era === '1947' ? [L * 0.3, L * 0.14, -L * 0.22] : [L * 0.28, -L * 0.28]) {
      const mh = D * (era === '1917' ? 3 : 1.9);
      addCyl(ship, 0.25, 0.35, mh, mastM, 0, deckY + mh / 2, mz, 8);
      strut(ship, [0, deckY + mh * 0.25, mz], [0, deckY + mh * 0.05, mz + (mz > 0 ? -1 : 1) * L * 0.1], 0.12, mastM);
      addBox(ship, B * 0.5, 0.2, 0.2, mastM, 0, deckY + mh * 0.6, mz);
      const hatch = addBox(ship, B * 0.45, 0.8, L * 0.07, deckM, 0, deckY + 0.4, mz + (mz > 0 ? -1 : 1) * L * 0.06);
    }
  }
  // deck cargo: drums of benzol on the foredeck (Mont-Blanc) — they burn and pop in fx.explosion ship
  if (p.cargo === 'drums' || (p.cargo == null && era === '1917')) {
    const dm = stdM({ color: 0x5a5a4a, roughness: 0.6, metalness: 0.4 });
    const dr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10), dm, 160); const m4 = new THREE.Matrix4();
    for (let i = 0; i < 160; i++) { const lay = Math.floor(i / 80), r = Math.floor(i % 80 / 10), c = i % 10; m4.compose(new THREE.Vector3((c - 4.5) * 0.66 * B / 7.5, deckY + 0.45 + lay * 0.9, L * 0.12 + r * 0.66 + (lay ? 0.3 : 0)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); dr.setMatrixAt(i, m4); }
    dr.castShadow = true; ship.add(dr);
  }
  if (p.name) {                                                            // the name on the bows
    const nt = canvasTex(512, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e8e4d8'; g.font = 'bold 44px Courier Prime, monospace'; g.textAlign = 'center'; g.fillText(String(p.name).toUpperCase(), w / 2, 46); }, [1, 1]);
    for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(B * 1.4, B * 0.18), new THREE.MeshBasicMaterial({ map: nt, transparent: true, depthWrite: false })); pl.position.set(s * (B / 2 * 0.72 + 0.05), deckY - D * 0.12, L * 0.36); pl.rotation.y = s * Math.PI / 2 + (s > 0 ? 0.12 : -0.12); ship.add(pl); }
  }
  // fire aboard: flames on the foredeck and a smoke column (fire 0..1), lit from within
  const fireK = clamp(num(p.fire, 0), 0, 1.5);
  const FLm = fireK > 0 ? makeFlames(ctx, { count: 70, hdr: 3.2, order: 11 }) : null, SM = fireK > 0 ? makeCPuffs(ctx, { count: 700, near: 3, fog: 0.8, order: 9.5 }) : null;
  const FL = fireK > 0 ? new THREE.PointLight(new THREE.Color(1, 0.55, 0.25), 0, L * 1.5, 2) : null;
  if (FLm) { root.add(FLm.mesh, SM.mesh, FL); FL.userData.noGovern = true; }
  const hd = (item.heading ?? 0) * DEG, spd = num(p.speed, 0), dx = Math.sin(hd), dz = -Math.cos(hd);
  root.rotation.y = Math.atan2(dx, dz);
  const cam = new THREE.Vector3();
  const tV = p.vanish != null ? +p.vanish : null;
  function update(t, clock, camera) {
    root.position.set(at[0] + dx * spd * t, wl, at[1] + dz * spd * t);
    ship.visible = tV == null || t < tV + 0.03;                      // gone in the flash (fx.explosion type ship at the same t)
    ship.rotation.x = 0.006 * Math.sin(t * 0.55); ship.rotation.z = 0.012 * Math.sin(t * 0.43 + 1); ship.position.y = 0.12 * Math.sin(t * 0.6);
    if (!FLm) return;
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    syncEnv(ctx); FLm.begin(t); SM.begin();
    if (tV != null && t >= tV) { FLm.end(); SM.end(camera); FL.intensity = 0; return; }
    for (let i = 0; i < 50; i++) FLm.push((hf(i, 1) - 0.5) * B * 0.8, deckY + 0.5, L * 0.12 + hf(i, 2) * L * 0.15, (2 + 5 * hf(i, 3)) * fireK, 1.2 + 1.4 * hf(i, 4), hf(i, 5), 0.9, 0.5);
    for (let i = 0; i < 600; i++) {
      const Lf = 16, age = ((t + hf(i, 11) * Lf) % Lf), f = age / Lf;
      const w = ctx.wind || { x: 3, z: 1 };
      const x = (hf(i, 12) - 0.5) * B * 0.6 + w.x * age * 1.2, y = deckY + 2 + age * 9 * fireK, z = L * 0.18 + w.z * age * 1.2 + (hf(i, 13) - 0.5) * 3;
      SM.push(x, y, z, (1.5 + 9 * f) * fireK * (0.7 + 0.5 * hf(i, 14)), hf(i, 15) * 6.28, 0.8 * (1 - sstep(0.7, 1, f)), i & 3, -1e9, 0.9, f < 0.08 ? 0.8 : 0, 0, 0.1, 0.2 + 0.5 * f, 0.5 + 0.3 * hf(i, 16), hf(i, 17), 0.4, 0.2, 0.19, 0.18, 0);
    }
    FL.position.set(0, deckY + 3, L * 0.18); FL.intensity = 800 * fireK * (0.8 + 0.2 * Math.sin(t * 13));
    FLm.end(); SM.end(camera);
  }
  update(0, 0, null);
  noQA(root); root.traverse((o) => { if (o.isMesh && o.parent === ship) o.userData.noQA = false; });
  return { root, radius: L / 2, height: D * 3.5, snapped: true, update, footprint: [B, L], contact: false,
    anchors: { body: ship, bow: new THREE.Vector3(0, deckY, L * 0.45), foredeck: new THREE.Vector3(0, deckY + 1, L * 0.2), bridge: new THREE.Vector3(0, deckY + D * 0.5, midZ), stern: new THREE.Vector3(0, deckY, -L * 0.45), funnel: new THREE.Vector3(0, deckY + D * 0.34 + fH, midZ - L * 0.04) } };
}

export const CATALOG = {
  'scale.tnt': {
    desc: 'THE TNT CUBE (data made physical): an explosion\'s yield as the TNT itself at TRUE volume (1.65 t per cubic metre). style block (default, the video\'s device): ONE orange-red block stencilled TNT with the yield stamp, beside a familiar thing on the same ground line, `ref` apple (a red apple and the block on a kitchen scale reading the grams: grenade 180 g = a 4.8 cm cube) | witness (MOAB 11 t = 1.9 m, taller than YOU) | house (Beirut ~1 kt = 8 m, a two-storey house) | building7 (Hiroshima 15 kt = 21 m, a seven-storey block) | eiffel (Tsar Bomba 50 Mt = 312 m vs 330 m). style crates: under 20 kg wrapped 1 kg blocks (half a brick each), up to a tonne olive 25 kg crates, from 1 t pallet cubes of TNT (0.85 m, "TNT 1000 KG") in a stack (1 kt: 11 x 11 x 8 m, a house; Hiroshima 15 kt: 24 x 24 x 21 m, a warehouse block), from 50 kt a solid block of crates (1 Mt: 85 m cube) and from 1 Mt a stepped mountain of crates (50 Mt: 570 m wide, 285 m high). Put YOU (cast) at anchor front; film it with the Witness in frame for the scale',
    actions: ['idle'],
    params: { yield: "'1 kg' | '11 t' | '15 kt' | '50 Mt' (a number = tonnes)", elev: 'm (a table: 0.76)', style: 'block (default: THE TNT CUBE device) | crates', ref: 'block: apple|witness|house|building6|building7|eiffel|pyramid|none (auto by size)', stamp: 'text under TNT (≈ 11 t TNT)', scale_text: 'the kitchen scale reading (apple)', gap: 'm', shape: 'crates: cube|pyramid', heading: 'deg the front faces' },
    doc: { yield: 'TNT equivalent (true volume at 1.65 t/m3: 1 kg = 0.6 litre, 1 t = 0.61 m3, 1 kt = 606 m3, 1 Mt = 606,000 m3)', front: 'anchor objects:N.front = a standing spot 0.6 m+ in front of the stack for YOU; objects:N.top = its top' },
    footprint: [3, 3], height: 3, tags: ['scale', 'tnt', 'yield', 'comparison', 'crates', 'explosives', 'kiloton', 'megaton', 'data', 'true scale'],
    examples: [{ note: 'Hiroshima\'s 15 kt as TNT beside YOU', spec: { world: { biome: 'desert' }, objects: [{ kind: 'scale.tnt', at: [0, -20], yield: '15 kt', heading: 180 }], cast: [{ ref: 'witness', at: [6, -6], heading: 330, action: 'look_up' }], camera: { move: 'keys', fov: 50, target: 'objects:0', keys: [{ t: 0, at: [18, 30], alt: 1.7, look_at: [0, -20], look_h: 11 }, { t: 7, at: [24, 28], alt: 2.2, look_at: [0, -20], look_h: 12 }] } } }],
  },
  'landmark.beirut_port': {
    desc: 'THE PORT OF BEIRUT (4 Aug 2020) on its own land (use biome ocean, water level 0; +Z = the sea side of the quay, heading 0 = the quay faces north): the landmark GRAIN SILOS (a 48 m block of 42 fused concrete cylinders with the gallery on top and the elevator tower), HANGAR 12 (the long corrugated warehouse east of the silos where 2,750 t of ammonium nitrate burned), more warehouses, stacks of containers, red gantry cranes on the quay, and the city of beige apartment blocks rising up the hill behind. damaged: true = the day after (the silos\' seaward half broken off, Hangar 12 gone). Anchors: hangar12 (the fire / blast point: put fx.explosion preset beirut there), silos, quay, city, crane, ground_zero',
    actions: ['idle'],
    params: { damaged: 'bool', buildings: 'int blocks scattered up the hill (520; the old quarters by the port are a street grid of ~1,500 low blocks, grid: false = the old scatter)', grid: 'bool (true): the street grid of low blocks by the port', t_blast: 's the explosion at Hangar 12: the rooftop water tanks and dishes jolt as the front reaches them', clear: '[x, z, r] world m: no city block there (the hook apartment)', heading: 'deg the quay faces (0 = north)' },
    footprint: [1500, 900], height: 80, snap: false, contact: false,
    tags: ['landmark', 'beirut', 'port', 'harbour', 'grain silos', 'hangar 12', 'warehouse', 'lebanon', '2020', 'city', 'containers', 'cranes'],
    examples: [{ note: 'the port from the sea, the fire in Hangar 12 (put the explosion at the hangar)', spec: { world: { biome: 'ocean' }, look: { time: 'dusk', sky: 'scattered' }, structures: [{ kind: 'landmark.beirut_port', at: [0, 0], heading: 0 }], objects: [{ kind: 'fx.explosion', at: [150, -58], preset: 'beirut', t: 6 }], camera: { move: 'keys', fov: 45, target: 'structures:0.silos', keys: [{ t: 0, at: [-300, 900], alt: 40, look_at: [60, -60], look_h: 40 }, { t: 10, at: [-200, 850], alt: 45, look_at: [60, -60], look_h: 60 }] } } }],
  },
  'interior.hangar12': {
    desc: 'INSIDE HANGAR 12 (Beirut, 4 Aug 2020): a long dim corrugated warehouse (steel trusses, skylights) with 2,750 t of ammonium nitrate in white woven bulk bags (NH4NO3 34.7% N) stacked in rows up towards the roof, stacks of fireworks (dark nylon bags, boxes) near the door; t_spark = the fireworks start popping (bursts of sparks), t_fire = flames and smoke at the far end. Film at eye level inside (limits eye)',
    actions: ['idle'],
    params: { length: 'm (60)', width: 'm (30)', t_spark: 's', t_fire: 's', heading: 'deg' },
    footprint: [30, 60], height: 15, tags: ['interior', 'warehouse', 'hangar 12', 'beirut', 'ammonium nitrate', 'fertiliser', 'sacks', 'bulk bags', 'fireworks', 'fire'],
    examples: [{ note: 'the sacks, the fire starting', spec: { structures: [{ kind: 'interior.hangar12', at: [0, 0], t_spark: 1, t_fire: 0.5 }], camera: { move: 'keys', fov: 55, target: 'structures:0.bags', limits: 'eye', keys: [{ t: 0, pos: [4, 1.7, 22], look: [-6, 3, 0] }, { t: 6, pos: [3, 1.8, 18], look: [-6, 3, -4] }] } } }],
  },
  'landmark.test_tower': {
    desc: 'a NUCLEAR TEST SHOT TOWER: style trinity (16 Jul 1945: a 30 m four-legged steel lattice tower with cross-bracing on concrete footings, a wooden platform and the corrugated-iron shot cab on top that held the device) | cab (Ivy Mike 1952: the big corrugated shot cab building with its tall annex and the long instrument pipe running off). Put fx.nuke burst: tower (Trinity) or surface (Ivy Mike) at the same spot; the tower vanishes in the flash (hide it by cutting)',
    actions: ['idle'],
    params: { style: 'trinity|cab', height: 'm (30.5)' },
    footprint: [12, 12], height: 35, tags: ['landmark', 'tower', 'test', 'nuclear', 'trinity', 'shot cab', 'ivy mike', 'steel', '1945'],
    examples: [{ note: 'the Trinity tower at dawn', spec: { world: { biome: 'desert', relief: 0.05 }, look: { time: 'dawn' }, structures: [{ kind: 'landmark.test_tower', at: [0, -40], style: 'trinity' }], camera: { move: 'keys', fov: 45, target: 'structures:0', keys: [{ t: 0, at: [-20, 10], alt: 2, look_at: [0, -40], look_h: 18 }, { t: 6, at: [-12, 14], alt: 3, look_at: [0, -40], look_h: 20 }] } } }],
  },
  'prop.bomb': {
    desc: 'a BOMB at true size: variant tsar (Tsar Bomba RDS-220: 8 m long, 2.1 m wide, 27 t, fins; by default hanging under its huge orange-and-white parachute, falling), little_boy (Hiroshima: 3 m, the box tail), fat_man (Nagasaki: 3.25 m egg with the box tail), moab (GBU-43/B: 9.2 m with lattice grid fins, yellow bands), mk82 (a 500 lb bomb). parachute true|false; falling from y at speed (m/s) from `fall` s; else it lies on the ground as a prop',
    actions: ['idle', 'fall'],
    params: { variant: 'tsar|little_boy|fat_man|moab|mk82', parachute: 'bool', chute_r: 'm canopy radius', y: 'm start height (falling)', speed: 'm/s descent (35 under the chute)', fall: 's it starts falling', trolley: 'bool: on a wheeled trolley (parachute: false)' },
    footprint: [3, 10], height: 3, fly: true, tags: ['prop', 'bomb', 'tsar bomba', 'little boy', 'fat man', 'moab', 'parachute', 'nuclear', 'weapon'],
    examples: [{ note: 'Tsar Bomba under its parachute over Novaya Zemlya', spec: { world: { biome: 'arctic_ice' }, objects: [{ kind: 'prop.bomb', at: [0, 0], variant: 'tsar', y: 6000, speed: 35 }], camera: { move: 'keys', fov: 40, target: 'objects:0', keys: [{ t: 0, pos: [60, 6010, 90], look: [0, 6010, 0] }, { t: 6, pos: [70, 5800, 80], look: [0, 5800, 0] }] } } }],
  },
  'aircraft.tu95': {
    desc: 'the Tu-95V "Bear" bomber that dropped Tsar Bomba (30 Oct 1961): 46 m long, 50 m span, 35-degree swept wings, four NK-12 turboprops with contra-rotating eight-blade propellers, glazed nose, white anti-flash paint (livery white | metal), the bomb half outside its belly (bomb false = none; drop: t hides it there). Flies a straight line through `at` at `alt` along `heading` at `speed` m/s',
    actions: ['fly'],
    params: { alt: 'm (10500)', speed: 'm/s (200)', livery: 'white|metal', bomb: 'bool', drop: 's the bomb leaves the plane', heading: 'deg' },
    footprint: [50, 46], height: 12, fly: true, snap: false, tags: ['aircraft', 'bomber', 'tu-95', 'bear', 'soviet', 'tsar bomba', '1961', 'turboprop'],
    examples: [{ note: 'the Tu-95V over the Arctic, camera alongside', spec: { world: { biome: 'arctic_ice' }, objects: [{ kind: 'aircraft.tu95', at: [0, 0], alt: 10500, heading: 90, speed: 200 }], camera: { move: 'keys', fov: 40, target: 'objects:0', keys: [{ t: 0, pos: [-20, 10520, 70], look: [0, 10500, 0] }, { t: 6, pos: [1180, 10515, 75], look: [1200, 10500, 0] }] } } }],
  },
  'aircraft.c130': {
    desc: 'a C-130 HERCULES / MC-130 cargo plane (grey, 30 m, straight high wing, four turboprops) with its REAR RAMP OPEN and the hold visible: a MOAB (GBU-43/B, olive with grid fins) on its cradle in the hold; `extract` s = the drogue parachute pulls the cradle out: it slides aft down the ramp and drops away behind the plane (the MOAB is never dropped from a bomber bay). Flies a straight line through `at` at `alt` along heading at `speed` (70 m/s). Follow with prop.bomb variant moab for the fall',
    actions: ['fly'],
    params: { alt: 'm (1900)', speed: 'm/s (70)', extract: 's the load leaves', ramp: 'bool (open)', heading: 'deg' },
    footprint: [40, 30], height: 12, fly: true, snap: false, tags: ['aircraft', 'c-130', 'hercules', 'mc-130', 'cargo plane', 'ramp', 'moab', 'airdrop', 'parachute'],
    examples: [{ note: 'the drop over the mountains, from behind the ramp', spec: { world: { biome: 'mountains' }, objects: [{ kind: 'aircraft.c130', at: [0, 0], alt: 1900, heading: 0, speed: 70, extract: 2 }], camera: { move: 'keys', fov: 50, target: 'objects:0', keys: [{ t: 0, pos: [8, 1906, 40], look: [0, 1900, 0] }, { t: 6, pos: [9, 1905, -380], look: [0, 1899, -420] }] } } }],
  },
  'detail.barograph': {
    desc: 'INSERT: a recording BAROGRAPH (Richard Freres style): mahogany case under a glass cover, the aneroid capsule stack, the brass linkage and the long pen arm inking a line on a paper chart (blue grid, weekdays) wrapped round a clockwork drum; at t_spike the pen jumps: the PRESSURE SPIKE of a far explosion arriving (Krakatoa 1883 was recorded on barographs worldwide, the wave passing 7 times; Tsar Bomba\'s went round the Earth 3 times) and falls back with a long tail; `passes` [t, ...] = later, smaller spikes (the wave coming round again). Film with an insert camera 0.25-0.6 m, limits macro',
    actions: ['record'],
    params: { t_spike: 's', amp: '0.1..1.6', passes: '[s, ...]', drum_rate: 'rad/s the drum turns (0.05, time-compressed)', elev: 'm (on a desk: 0.75)' },
    footprint: [0.34, 0.2], height: 0.25, tags: ['detail', 'insert', 'barograph', 'pressure', 'instrument', 'krakatoa', 'shock wave', 'chart', 'pen', '1883'],
    examples: [{ note: 'the pen draws the spike', spec: { structures: [{ kind: 'interior.study', at: [0, 0] }], objects: [{ kind: 'detail.barograph', at: [0, -1.2], elev: 0.76, t_spike: 2, passes: [5] }], camera: { move: 'keys', fov: 35, target: 'objects:0', limits: 'macro', keys: [{ t: 0, pos: [0.18, 1.0, -0.85], look: [0.07, 0.86, -1.2] }, { t: 6, pos: [0.12, 0.98, -0.9], look: [0.08, 0.86, -1.2] }] } } }],
  },
  'ship.cargo': {
    desc: 'a CARGO STEAMER on the water: era 1917 (SS Mont-Blanc, Halifax: 97 m, black hull, one tall black funnel, two masts with derricks, drums of benzol stacked on the foredeck), 1947 (a Liberty ship like the Grandcamp at Texas City: 135 m, grey, midships house, three masts) or modern; `name` on the bows; fire 0..1.5 = burning on the foredeck (flames, a column of black smoke, the glow on the water); drifts along heading at speed m/s; rides the swell. Put fx.explosion type ship at its foredeck anchor for the blast',
    actions: ['idle', 'sail'],
    params: { era: '1917|1947|modern', length: 'm', name: 'text', cargo: 'drums|none', fire: '0..1.5', vanish: 's: gone in the flash (the fx.explosion t)', speed: 'm/s', heading: 'deg' },
    footprint: [14, 97], height: 25, tags: ['ship', 'cargo', 'steamer', 'mont-blanc', 'halifax', '1917', 'liberty ship', 'grandcamp', 'texas city', 'freighter'],
    examples: [{ note: 'the Mont-Blanc burning in the Narrows', spec: { world: { biome: 'ocean' }, objects: [{ kind: 'ship.cargo', at: [0, 0], era: '1917', name: 'MONT-BLANC', fire: 1, heading: 20 }], camera: { move: 'keys', fov: 45, target: 'objects:0', keys: [{ t: 0, at: [-160, 120], alt: 12, look_at: [0, 0], look_h: 15 }, { t: 8, at: [-120, 150], alt: 14, look_at: [0, 0], look_h: 18 }] } } }],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'scale.tnt') return buildTNT(item, ctx);
  if (kind === 'landmark.beirut_port') return buildBeirut(item, ctx);
  if (kind === 'landmark.test_tower') return buildTower(item, ctx);
  if (kind === 'prop.bomb') return buildBomb(item, ctx);
  if (kind === 'aircraft.tu95') return buildTu95(item, ctx);
  if (kind === 'detail.barograph') return buildBarograph(item, ctx);
  if (kind === 'aircraft.c130') return buildC130(item, ctx);
  if (kind === 'interior.hangar12') return buildHangarIn(item, ctx);
  return buildCargo(item, ctx);
}
