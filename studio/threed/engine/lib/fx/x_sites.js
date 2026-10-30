// x_sites.js — E5 (explosions kit, 30 Sep 2026): historic places of the explosion ladder (own land, biome ocean).
//   landmark.harbour_1917  Halifax, 6 December 1917: the Narrows between Halifax and Dartmouth, the wooden piers with
//                          their sheds (Pier 6), the railway along the shore with boxcars and the little Richmond station
//                          (the telegraph office), the Acadia sugar refinery, and the Richmond district's ~300 wooden
//                          houses and church steeples climbing the hill; Dartmouth across the water
//   landmark.atoll         Bikini / Enewetak: a ring of low coral islets with white beaches and coconut palms round a
//                          turquoise lagoon, the reef's surf line outside, a few test-site bunkers and towers
//   ship.fishing_boat      the Lucky Dragon No. 5 (Daigo Fukuryu Maru, 1954): a 28 m wooden Japanese tuna boat, white
//                          hull, the wheelhouse aft, masts, lines and flags; rides the swell; `ash` 0..1 = white coral ash
//                          falling on her deck (Castle Bravo's fallout)
import * as THREE from 'three';
import { num, clamp, lerp, sstep, hf, headingYaw, DEG, makeCPuffs, shockArrive } from './x_common.js';
import { syncEnv, makeGrit, makeFlames } from './f_common.js';
import { patchMaterial } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';
import { palmMesh } from '../nature/flora.js';

const TAU = Math.PI * 2;
const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));
function addBox(parent, w, h, d, m, x, y, z, rotY = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = rotY; b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; }
function canvasTex(w, h, draw, rep = [1, 1]) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const noQA = (r) => r.traverse((o) => { if (o.isMesh) o.userData.noQA = true; });
// a gabled roof prism: width w (x), depth d (z), rise h; base at y 0
function roofGeo() { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g; }

// ── flattening: instanced houses knocked flat as the blast front passes (away from ground zero), roofs torn off ──────
// H: [{x, y, z, w, d, h, rot}] (root space); inst: [{im, n}] per house (the body and its roof instance); gz [x, z]
function flattenAt(t, H, bodies, roofs, gz, tB, Wkg, Rmax) {
  // static before the blast and once everything has fallen: only recompute while the wave is crossing the town
  const tEnd = tB == null ? -1e9 : tB + shockArrive(Rmax * 1.3, Wkg) + 1.0;
  const phase = tB == null || t < tB ? 'before' : t > tEnd ? 'after' : null;
  if (phase && H._flat === phase) return;
  H._flat = phase;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), ax = new THREE.Vector3();
  for (let i = 0; i < H.length; i++) {
    const h = H[i], dx = h.x - gz[0], dz = h.z - gz[1], d = Math.hypot(dx, dz);
    const hit = tB == null || d > Rmax ? -1 : t - (tB + shockArrive(d, Wkg));
    const k = hit < 0 ? 0 : Math.min(1, (hit / 0.45) ** 2) * clamp(1.25 - d / Rmax);          // how flat (1 = razed)
    const dirA = Math.atan2(dz, dx); ax.set(-Math.sin(dirA), 0, Math.cos(dirA));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.rot); q2.setFromAxisAngle(ax, -k * 0.5); q.premultiply(q2);
    const sy = 1 - 0.82 * k;
    m4.compose(v.set(h.x + Math.cos(dirA) * k * h.w * 0.4, h.y + h.h * sy / 2, h.z + Math.sin(dirA) * k * h.w * 0.4), q, s.set(h.w * (1 + 0.25 * k), h.h * sy, h.d)); bodies.setMatrixAt(i, m4);
    // the roof: lifted and flung away from ground zero, tumbling, then lying in the rubble
    const fly = hit < 0 ? 0 : Math.min(1, hit / 0.8) * clamp(1.3 - d / Rmax);
    q2.setFromAxisAngle(ax, -fly * 1.2); const qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.rot).premultiply(q2);
    const lift = fly > 0 ? Math.sin(Math.min(1, fly) * Math.PI) * h.h * 0.8 : 0;
    m4.compose(v.set(h.x + Math.cos(dirA) * fly * h.w * 1.6, h.y + h.h * sy + lift - fly * h.h * 0.7, h.z + Math.sin(dirA) * fly * h.w * 1.6), qr, s.set(h.w * 1.08, h.h * 0.45 * (1 - 0.5 * fly), h.d * 1.04)); roofs.setMatrixAt(i, m4);
  }
  bodies.instanceMatrix.needsUpdate = roofs.instanceMatrix.needsUpdate = true;
}

// ── town.hiroshima_1945 ──────────────────────────────────────────────────────────────────────────────────────────
async function buildHiroshima(item, ctx) {
  const p = explicitParams(item, CATALOG['town.hiroshima_1945']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'town.hiroshima_1945'; root.position.set(at[0], G.height(at[0], at[1]), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const R = num(p.radius, 1700), gyL = (x, z) => { const v = new THREE.Vector3(x, 0, z).applyEuler(root.rotation).add(root.position); return G.height(v.x, v.z) - root.position.y; };
  // the river delta: branches of the Ota running roughly north-south, bridges across (the T-shaped Aioi Bridge)
  const water = stdM({ color: 0x2c4a50, roughness: 0.12, metalness: 0.1 }), bank = stdM({ color: 0x8c8676, roughness: 0.95 });
  const rivers = [[-600, 70, 0.12], [-120, 90, -0.05], [420, 80, 0.08], [900, 60, -0.1]];     // x, width, slant
  const riverAt = (x, z) => rivers.some(([rx, w, sl]) => Math.abs(x - (rx + z * sl)) < w / 2 + 8);
  for (const [rx, w, sl] of rivers) {
    const g = new THREE.PlaneGeometry(w, R * 2.4, 1, 40).rotateX(-Math.PI / 2), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const z = P.getZ(i); P.setX(i, P.getX(i) + rx + z * sl); P.setY(i, gyL(rx + z * sl, z) + 0.3); }
    const m = new THREE.Mesh(g, water); m.receiveShadow = true; root.add(m);
    for (let k = -3; k <= 3; k++) { const z = k * R * 0.28 + 60; const br = new THREE.Mesh(new THREE.BoxGeometry(w + 20, 1.2, 12), bank); br.position.set(rx + z * sl, gyL(rx + z * sl, z) + 2.2, z); br.rotation.y = -sl; br.castShadow = true; root.add(br); }
  }
  // Aioi: the T bridge over the -120 branch at the fork, near ground zero
  const tb = new THREE.Mesh(new THREE.BoxGeometry(60, 1.4, 14), bank); tb.position.set(-150, 2.4, -60); tb.castShadow = true; root.add(tb);
  // the houses: dense low wooden houses with dark tiled roofs along narrow streets (instanced)
  // a dense grid of lots (13 x 11 m) along narrow streets every ~60 m; each lot a house (one or two storeys)
  // (every lot is collected first, then thinned evenly to `houses`: a cap reached row by row left the far side empty)
  const N = Math.round(clamp(num(p.houses, 32000), 0, 40000)), H = [], LOTS = [];
  for (let gz = -R; gz <= R; gz += 11) for (let gx = -R; gx <= R; gx += 13) {
    const k = gx * 7919 + gz * 3 + 1e5, x = gx + (hf(k, 3) - 0.5) * 2.5, z = gz + (hf(k, 4) - 0.5) * 2.5;
    const rr = Math.hypot(x, z) / R; if (rr > 1.12 || (rr > 0.8 && hf(k, 16) < (rr - 0.8) * 3) || riverAt(x, z) || (((gx % 65) + 65) % 65 < 5) || (((gz % 77) + 77) % 77 < 5) || hf(k, 14) < 0.08) continue;   // streets, gaps; thinning out at the edge
    LOTS.push([x, z, k]);
  }
  const keep = Math.min(1, N / Math.max(1, LOTS.length));
  for (const [x, z, k] of LOTS) {
    if (hf(k, 41) > keep) continue;
    const turned = hf(k, 17) < 0.18, w = 8 + 4.5 * hf(k, 6), d = 7 + 3.5 * hf(k, 7), hh = (hf(k, 8) < 0.3 ? 6.4 : 3.8) + 0.5 * hf(k, 9);
    H.push({ x, y: gyL(x, z), z, w: turned ? d : w, d: turned ? w : d, h: hh, rot: (hf(k, 10) - 0.5) * 0.16 });
  }
  // the city ground: packed earth and streets (grey-brown), burnt dark where the city burned
  const cityG = new THREE.CircleGeometry(R * 1.02, 96).rotateX(-Math.PI / 2), CP = cityG.attributes.position;
  for (let i = 0; i < CP.count; i++) CP.setY(i, gyL(CP.getX(i), CP.getZ(i)) + 0.12);
  const edgeC = document.createElement('canvas'); edgeC.width = edgeC.height = 256; { const eg = edgeC.getContext('2d'), gr = eg.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.84, '#fff'); gr.addColorStop(1, '#000'); eg.fillStyle = gr; eg.fillRect(0, 0, 256, 256); }
  const cityM = stdM({ color: 0x57524a, roughness: 0.95, alphaMap: new THREE.CanvasTexture(edgeC), transparent: true, depthWrite: false }); const cityDisc = new THREE.Mesh(cityG, cityM); cityDisc.receiveShadow = true; cityDisc.renderOrder = 1; root.add(cityDisc);   // the city fades into the fields
  const wallM = stdM({ roughness: 0.9 }), roofM = stdM({ color: 0x3b4046, roughness: 0.7 });
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallM, H.length), roofs = new THREE.InstancedMesh(roofGeo(), roofM, H.length);
  const WC = [0x6b5a48, 0x857058, 0xb9ad98, 0x5a4a3c, 0xcfc4ae], col = new THREE.Color();
  H.forEach((h, i) => { bodies.setColorAt(i, col.setHex(WC[Math.floor(hf(i, 11) * WC.length)]).multiplyScalar(0.85 + 0.25 * hf(i, 12))); roofs.setColorAt(i, col.setHex([0x4a4f55, 0x3b4046, 0x5f564c, 0x6e6b66][Math.floor(hf(i, 15) * 4)]).multiplyScalar(0.75 + 0.55 * hf(i, 13))); });
  bodies.castShadow = roofs.castShadow = true; bodies.receiveShadow = true; root.add(bodies, roofs);
  // the concrete buildings that stayed standing: the Industrial Promotion Hall (the A-Bomb Dome), a department store, banks
  const conc = stdM({ color: 0xbdb3a2, roughness: 0.85 }), brick = stdM({ color: 0x9a6a4e, roughness: 0.85 }), copper = stdM({ color: 0x5e8f7a, roughness: 0.5, metalness: 0.4 }), steel = stdM({ color: 0x3a3632, roughness: 0.6, metalness: 0.5 });
  const hall = new THREE.Group(); hall.position.set(-200, gyL(-200, -120), -120); root.add(hall);
  const hb = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; hall.add(b); return b; };
  hb(34, 12, 22, brick, 0, 6, 0); hb(12, 17, 12, brick, 0, 8.5, 0);
  const domeFull = new THREE.Mesh(new THREE.SphereGeometry(6.2, 24, 12, 0, TAU, 0, Math.PI / 2), copper); domeFull.scale.set(1, 1.25, 1.1); domeFull.position.y = 17; domeFull.castShadow = true; hall.add(domeFull);
  const domeRib = new THREE.Group(); domeRib.position.y = 17; hall.add(domeRib);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; const pts = []; for (let j = 0; j <= 10; j++) { const e = j / 10 * Math.PI / 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(e) * 6.2, Math.sin(e) * 7.7, Math.sin(a) * Math.cos(e) * 6.8)); } const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.12, 5), steel); domeRib.add(tube); }
  for (const [x, z, w, d, h] of [[380, -300, 30, 40, 30], [140, 360, 26, 30, 21], [-520, 280, 22, 26, 15], [620, 150, 30, 24, 18]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), conc); b.position.set(x, gyL(x, z) + h / 2, z); b.castShadow = b.receiveShadow = true; root.add(b); }
  // the blast: t_blast (15 kt) flattens the wooden city outward from ground zero; fires later (t_fire)
  const tB = p.t_blast != null ? +p.t_blast : null, Wkg = num(p.yield_kt, 15) * 1e6, Rflat = num(p.flat_radius, 1800), after = p.after === true;
  const tF = p.t_fire != null ? +p.t_fire : (tB != null ? tB + 6 : (after ? -1e9 : null));
  const FL = makeFlames(ctx, { count: 700, hdr: 3, order: 11 }), SM = makeCPuffs(ctx, { count: 1400, near: 20, fog: 0.8, order: 9.6 });
  root.add(FL.mesh, SM.mesh);
  const camV = new THREE.Vector3();
  function update(t, clock, camera) {
    const tt = after ? 1e6 : t;
    flattenAt(tt, H, bodies, roofs, [0, 0], after ? 0 : tB, Wkg, Rflat);
    const gone = after || (tB != null && t > tB + 0.3);
    domeFull.visible = !gone; domeRib.visible = gone;
    const burnt = after ? 1 : tF == null ? 0 : sstep(tF, tF + 8, t); cityM.color.setRGB(lerp(0.15, 0.045, burnt), lerp(0.135, 0.04, burnt), lerp(0.11, 0.035, burnt));   // linear: packed-earth streets, burnt black
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    if (!camera || tF == null) return;
    syncEnv(ctx); FL.begin(t); SM.begin();
    const f = after ? 1 : sstep(tF, tF + 4, t);
    if (f > 0) {
      for (let i = 0; i < 600; i++) { const hI = Math.floor(hf(i, 21) * H.length), h = H[hI]; if (!h || Math.hypot(h.x, h.z) > Rflat * 1.1 || hf(i, 22) > f) continue; FL.push(h.x, h.y, h.z, 4 + 9 * hf(i, 23), 3 + 3 * hf(i, 24), hf(i, 25), 0.9, 0.5); }
      for (let i = 0; i < 1300; i++) { const hI = Math.floor(hf(i, 31) * H.length), h = H[hI]; if (!h || Math.hypot(h.x, h.z) > Rflat * 1.1) continue; const L = 20, age = ((t + hf(i, 32) * L) % L), fr = age / L; SM.push(h.x + fr * 60, h.y + 10 + age * 18, h.z + fr * 30, 12 + 60 * fr, hf(i, 33) * 6.28, 0.7 * f * (1 - sstep(0.7, 1, fr)), i & 3, -1e9, 0.8, fr < 0.1 ? 0.8 : 0, 0, 0.1, 0.2 + 0.5 * fr, 0.5, hf(i, 34), 0.4, 0.3, 0.28, 0.27, 0); }
    }
    FL.end(); SM.end(camera);
  }
  update(0, 0, null);
  noQA(root);
  return { root, radius: R, height: 30, snapped: true, update, footprint: [R * 2, R * 2], contact: false,
    anchors: { ground_zero: new THREE.Vector3(0, 0, 0), dome: new THREE.Vector3(-200, 20, -120), aioi_bridge: new THREE.Vector3(-150, 3, -60), river: new THREE.Vector3(-120, 1, 300), street_1km: new THREE.Vector3(0, 0, 1000) } };
}

// ── landmark.harbour_1917 ────────────────────────────────────────────────────────────────────────────────────────
async function buildHalifax(item, ctx) {
  const p = explicitParams(item, CATALOG['landmark.harbour_1917']);
  const at = item.at || [0, 0], G = ctx.ground;
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : G.height(at[0], at[1]);
  const root = new THREE.Group(); root.name = 'landmark.harbour_1917';
  root.position.set(at[0], wl, at[1]); root.rotation.y = headingYaw(item.heading ?? 180);   // local +Z = up the Narrows (towards Bedford Basin)
  const W = num(p.width, 520) / 2;                                              // half the Narrows
  const landM = stdM({ color: 0x6b7050, roughness: 0.95, side: THREE.DoubleSide }), snowy = p.snow === true;
  if (snowy) landM.color.setHex(0xd8dcdf);
  // the two shores: land rising from the water (Halifax / Richmond to the west, -x; Dartmouth to the east, +x)
  const shore = (side) => {
    const g = new THREE.PlaneGeometry(2200, 3200, 60, 80).rotateX(-Math.PI / 2), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const lx = P.getX(i) + 1100, z = P.getZ(i);                              // 0 .. 2200 m inland
      const h = lx < 8 ? -6 + lx : Math.min(2.5 + lx * (side < 0 ? 0.075 : 0.045) + 8 * Math.sin(z / 260 + side) * sstep(100, 600, lx), side < 0 ? 95 : 60);
      P.setXYZ(i, side * (W + lx), h, z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, landM); m.receiveShadow = true; root.add(m);
  };
  shore(-1); shore(1);
  const hy = (x) => { const lx = Math.abs(x) - W; return lx < 8 ? -6 + Math.max(lx, 0) : Math.min(2.5 + lx * (x < 0 ? 0.075 : 0.045), x < 0 ? 95 : 60); };
  const wood = stdM({ color: 0x6b5238, roughness: 0.9 }), shedM = stdM({ color: 0x7d6a55, roughness: 0.85 }), roofM = stdM({ color: 0x4a4540, roughness: 0.8 });
  const brick = stdM({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7a3a2a'; g.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = hf(i + j * 8, 3); g.fillStyle = k < 0.3 ? '#2a2826' : '#3b3632'; g.fillRect(i * 16 + 4, j * 16 + 4, 8, 9); } g.fillStyle = 'rgba(0,0,0,0.15)'; for (let j = 0; j < 16; j++) g.fillRect(0, j * 8 + 7, w, 1); }, [4, 6]), roughness: 0.9 });
  // piers 6-9 on the Halifax side with long sheds; Pier 6 is the southern one (z < 0)
  const piers = {};
  [[-420, 6], [-140, 7], [140, 8], [420, 9]].forEach(([z, n]) => {
    const L = 170, x0 = -W - 5;
    addBox(root, L, 1.6, 22, wood, x0 + L / 2 - 10, 1.8, z);
    addBox(root, L * 0.8, 8, 16, shedM, x0 + L * 0.4, 6.6, z);
    const r = new THREE.Mesh(roofGeo(), roofM); r.scale.set(17, 3, L * 0.8); r.rotation.y = Math.PI / 2; r.position.set(x0 + L * 0.4, 10.6, z); r.castShadow = true; root.add(r);
    for (let k = 0; k < 12; k++) addBox(root, 0.5, 5, 0.5, wood, x0 + 10 + k * 14, -1, z + 11);
    piers['pier' + n] = new THREE.Vector3(x0 + L + 20, 0, z);
  });
  // the railway along the shore: two tracks, freight cars; the little Richmond station (the telegraph office)
  const railM = stdM({ color: 0x55504a, roughness: 0.6, metalness: 0.5 }), tieM = stdM({ color: 0x3a2e24, roughness: 0.95 });
  const xr = -W - 40;
  for (const dx of [0, 5]) { addBox(root, 0.1, 0.15, 3000, railM, xr - dx - 0.72, hy(xr) + 0.35, 0); addBox(root, 0.1, 0.15, 3000, railM, xr - dx + 0.72, hy(xr) + 0.35, 0); }
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.18, 0.25), tieM, 1200); const m4 = new THREE.Matrix4();
  for (let i = 0; i < 1200; i++) { m4.makeTranslation(xr - (i % 2) * 5, hy(xr) + 0.2, -1500 + Math.floor(i / 2) * 5); ties.setMatrixAt(i, m4); } root.add(ties);
  const carM = [0x6b2a1f, 0x4a3a2a, 0x5a5a52].map((c) => stdM({ color: c, roughness: 0.85 }));
  for (let i = 0; i < 26; i++) { const z = -900 + i * 13.5 + (i > 12 ? 90 : 0); addBox(root, 2.8, 3.4, 12, carM[i % 3], xr - 5, hy(xr) + 2.4, z); }
  const station = new THREE.Group(); station.position.set(xr - 16, hy(xr - 16), -330); root.add(station);
  addBox(station, 8, 4.5, 14, stdM({ color: 0x8a5a3a, roughness: 0.85 }), 0, 2.25, 0);
  const sr = new THREE.Mesh(roofGeo(), stdM({ color: 0x3c3a38, roughness: 0.8 })); sr.scale.set(10, 2.6, 16); sr.rotation.y = Math.PI / 2; sr.position.y = 4.5; sr.castShadow = true; station.add(sr);
  addBox(station, 0.2, 1.2, 3, stdM({ color: 0xe8e0c8, roughness: 0.8 }), 4.1, 3.4, 0);  // the name board
  // the Acadia sugar refinery: a tall brick block near the shore
  const ref = addBox(root, 30, 38, 50, brick, -W - 90, hy(-W - 90) + 19, 120);
  addBox(root, 4, 16, 4, brick, -W - 90, hy(-W - 90) + 46, 105);
  // the Richmond district: rows of wooden houses climbing the hill; church steeples
  const NH = Math.round(clamp(num(p.houses, 520), 0, 1200));
  const HC = [0xe7e2d6, 0x9aa0a0, 0x7a5c44, 0x8a3a2e, 0x5f6f5a, 0xd8c9a6, 0x6d6a66];
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stdM({ roughness: 0.85 }), NH + 60), roof = new THREE.InstancedMesh(roofGeo(), stdM({ color: 0x3f3b37, roughness: 0.8 }), NH + 60);
  body.castShadow = roof.castShadow = true; body.receiveShadow = true;
  const col = new THREE.Color(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(); let n = 0;
  const place = (x, z, w, d, h, rot, cHex) => { const y = hy(x); m4.compose(v.set(x, y + h / 2, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), s.set(w, h, d)); body.setMatrixAt(n, m4); body.setColorAt(n, col.setHex(cHex).multiplyScalar(0.85 + 0.25 * hf(n, 9)));
    m4.compose(v.set(x, y + h, z), q, s.set(w * 1.08, h * 0.45, d * 1.04)); roof.setMatrixAt(n, m4); n++; };
  for (let i = 0; i < NH; i++) {
    const row = Math.floor(i / 34), k = i % 34, x = -W - 140 - row * 34 - (hf(i, 1) - 0.5) * 6, z = -1050 + k * 52 + (row % 2) * 24 + (hf(i, 2) - 0.5) * 8;
    if (x < -W - 1100) break;
    place(x, z, 9 + 3 * hf(i, 3), 11 + 4 * hf(i, 4), 7.5 + 3.5 * hf(i, 5), (hf(i, 6) - 0.5) * 0.1, HC[Math.floor(hf(i, 7) * HC.length)]);
  }
  for (let i = 0; i < 60; i++) { const x = W + 150 + (hf(i, 11) * 700), z = -1200 + hf(i, 12) * 2400; place(x, z, 7 + 3 * hf(i, 13), 9 + 3 * hf(i, 14), 6 + 3 * hf(i, 15), hf(i, 16) * 0.3, HC[Math.floor(hf(i, 17) * HC.length)]); }
  body.count = roof.count = n; root.add(body, roof);
  // t_blast: the explosion off Pier 6 knocks the wooden houses flat outward (2.9 kt: razed within ~800 m)
  const hList = []; { const mm = new THREE.Matrix4(), pp = new THREE.Vector3(), qq = new THREE.Quaternion(), ss = new THREE.Vector3(), eu = new THREE.Euler();
    for (let i = 0; i < n; i++) { body.getMatrixAt(i, mm); mm.decompose(pp, qq, ss); eu.setFromQuaternion(qq); hList.push({ x: pp.x, y: pp.y - ss.y / 2, z: pp.z, w: ss.x, d: ss.z, h: ss.y, rot: eu.y }); } }
  const tBh = p.t_blast != null ? +p.t_blast : null, gzh = [-W - 5 + 190, -420];
  const steeple = (x, z) => { const y = hy(x); addBox(root, 12, 12, 22, stdM({ color: 0xe8e4da, roughness: 0.85 }), x, y + 6, z); addBox(root, 5, 18, 5, stdM({ color: 0xe8e4da, roughness: 0.85 }), x, y + 9, z - 10); const c = new THREE.Mesh(new THREE.ConeGeometry(3.4, 14, 4), stdM({ color: 0x3a3836, roughness: 0.8 })); c.position.set(x, y + 25, z - 10); c.rotation.y = Math.PI / 4; c.castShadow = true; root.add(c); };
  steeple(-W - 330, -240); steeple(-W - 520, 380);
  noQA(root);
  return { root, radius: 1400, height: 80, snapped: true, footprint: [3000, 3000], update: (t) => { if (tBh != null) flattenAt(t, hList, body, roof, gzh, tBh, 2.9e6, 1100); }, contact: false,
    anchors: { ...piers, narrows: new THREE.Vector3(0, 0, -380), station: new THREE.Vector3(xr - 16, hy(xr - 16) + 2, -330), refinery: new THREE.Vector3(-W - 90, hy(-W - 90) + 20, 120), richmond: new THREE.Vector3(-W - 400, hy(-W - 400) + 5, 0), dartmouth: new THREE.Vector3(W + 300, hy(W + 300) + 5, 0) } };
}

// ── landmark.atoll ───────────────────────────────────────────────────────────────────────────────────────────────
async function buildAtoll(item, ctx) {
  const p = explicitParams(item, CATALOG['landmark.atoll']);
  const at = item.at || [0, 0], G = ctx.ground;
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : G.height(at[0], at[1]);
  const root = new THREE.Group(); root.name = 'landmark.atoll'; root.position.set(at[0], wl, at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const R = num(p.radius, 7000), ecc = num(p.ecc, 0.6);
  const rimAt = (a) => R * (1 + 0.12 * Math.sin(a * 3 + 1) + 0.06 * Math.sin(a * 7)) * Math.hypot(Math.cos(a), Math.sin(a) * ecc) / Math.hypot(Math.cos(a), Math.sin(a));
  // the lagoon: a turquoise sheet just over the sea inside the reef (the sea's own shader stays outside)
  const lg = new THREE.CircleGeometry(1, 128).rotateX(-Math.PI / 2), LP = lg.attributes.position;
  for (let i = 0; i < LP.count; i++) { const x = LP.getX(i), z = LP.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); const rr = rimAt(a) * r * 0.985; LP.setX(i, Math.cos(a) * rr); LP.setZ(i, Math.sin(a) * rr); }
  const lagoon = new THREE.Mesh(lg, patchMaterial(new THREE.MeshStandardMaterial({ color: 0x48b4a8, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.42, depthWrite: false })));
  lagoon.position.y = 0.05; lagoon.renderOrder = 1; lagoon.userData.noQA = true; root.add(lagoon);
  // the reef ring (pale, awash) with the surf line on its outer edge
  const reefG = new THREE.RingGeometry(0.97, 1.05, 256, 1).rotateX(-Math.PI / 2), RP = reefG.attributes.position;
  for (let i = 0; i < RP.count; i++) { const x = RP.getX(i), z = RP.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); const rr = rimAt(a) * r; RP.setX(i, Math.cos(a) * rr); RP.setZ(i, Math.sin(a) * rr); }
  const reef = new THREE.Mesh(reefG, patchMaterial(new THREE.MeshStandardMaterial({ color: 0xbfe0d6, roughness: 0.5, transparent: true, opacity: 0.8, depthWrite: false })));
  reef.position.y = 0.08; reef.renderOrder = 2; reef.userData.noQA = true; root.add(reef);
  // the islets: low sandy strips along the rim (some long, some tiny), palms on them
  const sandM = stdM({ color: 0xe7dcc0, roughness: 0.9 }), scrubM = stdM({ color: 0x4d6b3a, roughness: 0.9 });
  const NI = Math.round(clamp(num(p.islets, 26), 4, 60)), islets = [];
  const palm = palmMesh(ctx, 3), NP = Math.round(clamp(num(p.palms, 1400), 0, 5000));
  const palms = new THREE.InstancedMesh(palm.geometry, palm.material, Math.max(1, NP)); palms.castShadow = true; palms.userData.noQA = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(); let np = 0;
  for (let k = 0; k < NI; k++) {
    const a0 = (k + 0.3 * hf(k, 1)) / NI * TAU, span = (0.35 + 0.65 * hf(k, 2) ** 1.5) * TAU / NI * 0.85, rr = rimAt(a0);
    const L = span * rr, Wd = 140 + 320 * hf(k, 3);
    const sh = new THREE.Shape(); const N = 24;
    for (let i = 0; i <= N; i++) { const u = i / N, a = a0 - span / 2 + span * u, w = Wd * Math.sin(Math.PI * u) ** 0.5; const r = rimAt(a) + w * 0.5; if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    for (let i = N; i >= 0; i--) { const u = i / N, a = a0 - span / 2 + span * u, w = Wd * Math.sin(Math.PI * u) ** 0.5; const r = rimAt(a) - w * 0.5; sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 8, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, -1.8, 0);
    const is = new THREE.Mesh(g, sandM); is.receiveShadow = true; root.add(is);
    const g2 = new THREE.ExtrudeGeometry(sh, { depth: 2, bevelEnabled: true, bevelThickness: 1, bevelSize: -12, bevelSegments: 1 }); g2.rotateX(-Math.PI / 2); g2.translate(0, 0.2, 0);
    const sc = new THREE.Mesh(g2, scrubM); sc.receiveShadow = true; root.add(sc);
    islets.push([a0, rr, L]);
    const nPal = Math.round(NP * (L / (TAU * R)) * 1.3);
    for (let i = 0; i < nPal && np < NP; i++) { const u = hf(i + k * 999, 5), a = a0 - span / 2 + span * (0.08 + 0.84 * u), w = Wd * 0.7 * (hf(i + k * 999, 6) - 0.5) * Math.sin(Math.PI * (0.08 + 0.84 * u)); const r = rimAt(a) + w; m4.compose(v.set(Math.cos(a) * r, 1.8, Math.sin(a) * r), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hf(i, 7) * TAU), s.setScalar(0.8 + 0.5 * hf(i, 8))); palms.setMatrixAt(np++, m4); }
  }
  palms.count = np; root.add(palms);
  // the Castle Bravo crater (today): a dark blue round hole in the reef, ~2 km across (crater: true | diameter m)
  if (p.crater) { const cd = typeof p.crater === 'number' ? p.crater : 2000, a = Math.PI; const cx = Math.cos(a) * rimAt(a) * 0.98, cz = Math.sin(a) * rimAt(a) * 0.98;
    const cr = new THREE.Mesh(new THREE.CircleGeometry(cd / 2, 64).rotateX(-Math.PI / 2), patchMaterial(new THREE.MeshStandardMaterial({ color: 0x0b2d5c, roughness: 0.1, transparent: true, opacity: 0.85, depthWrite: false })));
    cr.position.set(cx, 0.12, cz); cr.renderOrder = 3; cr.userData.noQA = true; root.add(cr);
    const rim = new THREE.Mesh(new THREE.RingGeometry(cd / 2, cd / 2 + 60, 64).rotateX(-Math.PI / 2), patchMaterial(new THREE.MeshStandardMaterial({ color: 0x5fc2c0, roughness: 0.3, transparent: true, opacity: 0.6, depthWrite: false })));
    rim.position.set(cx, 0.13, cz); rim.renderOrder = 3; root.add(rim); }
  // a test-site bunker and a camera tower on the main island (a0 of the longest)
  const main = islets.slice().sort((a, b) => b[2] - a[2])[0];
  const conc = stdM({ color: 0xb8b2a4, roughness: 0.9 });
  const bx = Math.cos(main[0]) * main[1], bz = Math.sin(main[0]) * main[1];
  addBox(root, 14, 5, 10, conc, bx, 3.8, bz, -main[0]);
  noQA(root);
  return { root, radius: R * 1.1, height: 20, snapped: true, footprint: [R * 2, R * 2 * ecc], update: () => {}, contact: false,
    anchors: { lagoon: new THREE.Vector3(0, 0, 0), main_island: new THREE.Vector3(bx, 4, bz), reef_west: new THREE.Vector3(-rimAt(Math.PI), 0, 0), reef_east: new THREE.Vector3(rimAt(0), 0, 0), outside: new THREE.Vector3(0, 0, rimAt(Math.PI / 2) * 1.8) } };
}

// ── ship.fishing_boat (the Lucky Dragon No. 5) ───────────────────────────────────────────────────────────────────
async function buildFishing(item, ctx) {
  const p = explicitParams(item, CATALOG['ship.fishing_boat']);
  const at = item.at || [0, 0], G = ctx.ground;
  const wl = ctx.water && ctx.water.level != null ? ctx.water.level : G.height(at[0], at[1]);
  const root = new THREE.Group(); root.name = 'ship.fishing_boat';
  const boat = new THREE.Group(); root.add(boat);
  const L = num(p.length, 28), B = L * 0.21, D = 2.6;
  const hullM = stdM({ color: 0xece8de, roughness: 0.7, side: THREE.DoubleSide }), belowM = stdM({ color: 0x6a2a24, roughness: 0.8, side: THREE.DoubleSide }), woodM = stdM({ color: 0x8b6a45, roughness: 0.85 }), darkM = stdM({ color: 0x2f3438, roughness: 0.7 }), blueM = stdM({ color: 0x2c4b6e, roughness: 0.7 });
  // hull: lathe-like sections along the keel (sheer up to a high bow, a rounded stern)
  const nL = 30, nS = 12, pos = [], idx = [], cols = [];
  for (let i = 0; i <= nL; i++) {
    const u = i / nL, z = (u - 0.5) * L, w = B / 2 * (u > 0.7 ? Math.pow((1 - u) / 0.3, 0.65) : u < 0.12 ? 0.65 + 0.35 * u / 0.12 : 1), top = 1.2 + 1.1 * Math.pow(Math.max(0, u - 0.6) / 0.4, 2);
    for (let j = 0; j <= nS; j++) { const a = j / nS * Math.PI, y = top - (top + D * 0.55) * Math.pow(Math.sin(a), 0.6); pos.push(-Math.cos(a) * Math.max(0.05, w) * Math.pow(Math.abs(Math.cos(a)), 0.25), y, z); const c = y < 0 ? [0.42, 0.16, 0.14] : [0.93, 0.91, 0.87]; cols.push(...c); }
  }
  for (let i = 0; i < nL; i++) for (let j = 0; j < nS; j++) { const a = i * (nS + 1) + j, b = a + nS + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); hg.setIndex(idx); hg.computeVertexNormals();
  const hull = new THREE.Mesh(hg, stdM({ color: 0xffffff, vertexColors: true, roughness: 0.75, side: THREE.DoubleSide })); hull.castShadow = true; boat.add(hull);
  addBox(boat, B * 0.9, 0.12, L * 0.8, woodM, 0, 1.25, -L * 0.03);
  // the wheelhouse aft, a mast forward and one aft, a boom, the long-line gear, flags
  addBox(boat, B * 0.62, 2.3, 4.2, hullM, 0, 2.45, -L * 0.28); addBox(boat, B * 0.66, 0.2, 4.6, blueM, 0, 3.7, -L * 0.28);
  for (let k = 0; k < 4; k++) addBox(boat, 0.05, 0.6, 0.7, darkM, B * 0.31, 2.9, -L * 0.28 - 1.5 + k * 1.0);
  const mast = (z, h) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 8), woodM); m.position.set(0, 1.3 + h / 2, z); m.castShadow = true; boat.add(m); };
  mast(L * 0.2, 9); mast(-L * 0.36, 6.5);
  const flagM = stdM({ color: 0xd62a2a, roughness: 0.7, side: THREE.DoubleSide }); const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), flagM); fl.position.set(0.7, 10, L * 0.2); boat.add(fl);
  addBox(boat, B * 0.4, 0.8, 2, darkM, 0, 1.7, L * 0.08);                      // line hauler
  if (p.name !== false) {
    const nt = canvasTex(512, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#1b1b1b'; g.font = 'bold 60px serif'; g.textAlign = 'center'; g.fillText(String(p.name || '第五福竜丸'), w / 2, 72); });
    for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshBasicMaterial({ map: nt, transparent: true, depthWrite: false })); pl.position.set(s * (B / 2 * 0.78 + 0.03), 1.3, L * 0.3); pl.rotation.y = s * Math.PI / 2 + (s > 0 ? 0.25 : -0.25); boat.add(pl); }
  }
  // Castle Bravo's fallout: white coral ash falling on her (ash 0..1)
  const ashK = clamp(num(p.ash, 0), 0, 1), GR = ashK > 0 ? makeGrit(ctx, { count: 2500, maxPx: 3, minPx: 1.0, order: 12 }) : null;
  if (GR) root.add(GR.mesh);
  const hd = (item.heading ?? 0) * DEG, spd = num(p.speed, 0), dx = Math.sin(hd), dz = -Math.cos(hd);
  root.rotation.y = Math.atan2(dx, dz);
  function update(t) {
    root.position.set(at[0] + dx * spd * t, wl, at[1] + dz * spd * t);
    boat.rotation.x = 0.03 * Math.sin(t * 0.9); boat.rotation.z = 0.05 * Math.sin(t * 0.7 + 1); boat.position.y = 0.15 * Math.sin(t * 1.1);
    fl.rotation.y = 0.3 * Math.sin(t * 3.1);
    if (!GR) return;
    GR.begin();
    for (let i = 0; i < 2400 * ashK; i++) { const fall = 1.2 + 0.8 * hf(i, 1), H = 14, y = H - ((t * fall + hf(i, 2) * H) % H) + 0.2; GR.push((hf(i, 3) - 0.5) * 30, y, (hf(i, 4) - 0.5) * 40, 0.9, 0.9, 0.88, 0.006 + 0.01 * hf(i, 5)); }
    GR.end();
  }
  update(0);
  noQA(root); root.traverse((o) => { if (o.isMesh && o.parent === boat) o.userData.noQA = false; });
  return { root, radius: L / 2, height: 11, snapped: true, update, footprint: [B, L], contact: false,
    anchors: { body: boat, deck: new THREE.Vector3(0, 1.4, L * 0.05), wheelhouse: new THREE.Vector3(0, 3, -L * 0.28), bow: new THREE.Vector3(0, 2, L * 0.48) } };
}

export const CATALOG = {
  'landmark.harbour_1917': {
    desc: 'HALIFAX HARBOUR, 6 December 1917, on its own land (use biome ocean, water level 0): the Narrows (~520 m of water) between Halifax / the Richmond district (west, -x) and Dartmouth (east); wooden Piers 6-9 with long sheds on the Halifax side, the railway along the shore with boxcars and the little Richmond station (the telegraph office: film detail.wireless inside for the telegraph key), the brick Acadia sugar refinery, ~300 wooden houses in rows climbing the hill and two white churches with steeples, a few houses in Dartmouth. snow: true = a winter shore. Anchors pier6 (where the Mont-Blanc drifted, burning: put ship.cargo era 1917 and fx.explosion preset halifax there), pier7..9, station, refinery, richmond, dartmouth, narrows',
    actions: ['idle'],
    params: { width: 'm of the Narrows (520)', houses: 'int (320)', snow: 'bool', t_blast: 's: the Mont-Blanc explodes off Pier 6: the houses are knocked flat outward as the front passes (razed within ~800 m)', heading: 'deg the Narrows run (local +Z)' },
    footprint: [3000, 3000], height: 80, snap: false, contact: false,
    tags: ['landmark', 'halifax', 'harbour', 'harbor', '1917', 'narrows', 'pier', 'richmond', 'nova scotia', 'railway', 'station', 'telegraph', 'town', 'wooden houses'],
    examples: [{ note: 'the Narrows from the water, the Mont-Blanc burning off Pier 6', spec: { world: { biome: 'ocean' }, look: { time: 'morning', sun: { az: 120, el: 15 }, sky: 'scattered', grade: 'cold' }, structures: [{ kind: 'landmark.harbour_1917', at: [0, 0], heading: 0 }], objects: [{ kind: 'ship.cargo', at: [0, 440], era: '1917', name: 'MONT-BLANC', fire: 1, heading: 250 }], camera: { move: 'keys', fov: 50, target: 'objects:0', keys: [{ t: 0, at: [150, 1100], alt: 30, look_at: [-150, 380], look_h: 20 }, { t: 8, at: [120, 1000], alt: 34, look_at: [-150, 380], look_h: 24 }] } } }],
  },
  'town.hiroshima_1945': {
    desc: 'HIROSHIMA, 6 August 1945 (handled with respect: physics and objects, no people): the Ota river delta (river branches, bridges, the T-shaped Aioi Bridge), thousands of low wooden houses with dark tiled roofs along narrow streets, the brick Industrial Promotion Hall with its green copper dome (anchor dome) and a few concrete buildings. t_blast (the 15 kt air burst over ground zero = the town centre, anchor ground_zero) knocks the wooden city flat in a wave running outward (razed within ~1.8 km), the dome is stripped to its steel ribs, the concrete shells stay; fires spread from t_fire (default t_blast + 6); after: true = the flattened burning city. Put fx.nuke preset hiroshima at the town centre; film from the air 600-2500 m up, or at street level (anchor street_1km: the corner 1 km out)',
    actions: ['idle'],
    params: { radius: 'm (1700)', houses: 'int (32000)', t_blast: 's', t_fire: 's', after: 'bool', flat_radius: 'm (1800)', yield_kt: '15', heading: 'deg' },
    footprint: [4800, 4800], height: 30, snap: false, contact: false,
    tags: ['town', 'hiroshima', '1945', 'japan', 'city', 'wooden houses', 'a-bomb dome', 'genbaku dome', 'river', 'bridge', 'flattened', 'fire'],
    examples: [{ note: 'the calm aerial, then the blast flattening the city outward', spec: { world: { biome: 'plains', relief: 0.05 }, look: { time: 'morning', sky: 'clear' }, structures: [{ kind: 'town.hiroshima_1945', at: [0, 0], t_blast: 1 }], objects: [{ kind: 'fx.nuke', at: [0, 0], preset: 'hiroshima', t: 1, grow: 8 }], camera: { move: 'keys', fov: 50, target: 'structures:0', keys: [{ t: 0, at: [-1800, 2600], alt: 1500, look_at: [0, 0], look_h: 0 }, { t: 8, at: [-1500, 2700], alt: 1600, look_at: [0, 0], look_h: 300 }] } } }],
  },
  'landmark.atoll': {
    desc: 'a CORAL ATOLL (Bikini, Enewetak): a ring of low sandy islets with coconut palms and scrub round a turquoise lagoon, the pale reef awash between them, a concrete test-site bunker on the main island. Use biome ocean. radius m of the ring (7000; the real Bikini is ~20 x 40 km: this is compressed to read in a shot). Anchors lagoon, main_island, reef_west, reef_east, outside (the open sea south of it: put ship.fishing_boat there). Castle Bravo: fx.nuke preset castle_bravo on the reef_west anchor',
    actions: ['idle'],
    params: { radius: 'm (7000)', ecc: '0.3..1 ring shape (0.6)', islets: 'int (26)', palms: 'int (1400)', crater: 'true | diameter m: the Castle Bravo crater (today) in the west reef', heading: 'deg' },
    footprint: [14000, 9000], height: 20, snap: false, contact: false,
    tags: ['landmark', 'atoll', 'bikini', 'enewetak', 'lagoon', 'island', 'palms', 'reef', 'pacific', 'nuclear test', 'marshall islands'],
    examples: [{ note: 'the atoll from the air', spec: { world: { biome: 'ocean' }, look: { time: 'morning', sky: 'scattered' }, structures: [{ kind: 'landmark.atoll', at: [0, 0] }], camera: { move: 'keys', fov: 50, target: 'structures:0', keys: [{ t: 0, at: [-2000, 9000], alt: 2500, look_at: [0, 0], look_h: 0 }, { t: 8, at: [-1000, 8800], alt: 2400, look_at: [0, 0], look_h: 0 }] } } }],
  },
  'ship.fishing_boat': {
    desc: 'the LUCKY DRAGON No. 5 (Daigo Fukuryu Maru, 1 March 1954): a 28 m wooden Japanese tuna long-liner, white hull with a red bottom, the wheelhouse aft, two masts, a line hauler, a red flag, her name in kanji on the bows (name: text to change it); rides the swell, drifts along heading at speed; ash 0..1 = the white radioactive coral ash from Castle Bravo falling on her deck (hours after the flash, 130 km away). Crew: cast figures standing on anchors deck / wheelhouse',
    actions: ['idle', 'sail'],
    params: { length: 'm (28)', name: 'text (default the kanji name)', ash: '0..1', speed: 'm/s', heading: 'deg' },
    footprint: [6, 28], height: 11, tags: ['ship', 'boat', 'fishing', 'lucky dragon', 'daigo fukuryu maru', 'japan', '1954', 'tuna', 'castle bravo', 'fallout'],
    examples: [{ note: 'the Lucky Dragon under the falling ash', spec: { world: { biome: 'ocean' }, look: { time: 'morning', sky: 'overcast' }, objects: [{ kind: 'ship.fishing_boat', at: [0, 0], ash: 0.8, heading: 90 }], camera: { move: 'keys', fov: 45, target: 'objects:0', keys: [{ t: 0, at: [-25, 30], alt: 6, look_at: [0, 0], look_h: 3 }, { t: 7, at: [-18, 34], alt: 7, look_at: [0, 0], look_h: 3 }] } } }],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'town.hiroshima_1945') return buildHiroshima(item, ctx);
  if (kind === 'landmark.atoll') return buildAtoll(item, ctx);
  if (kind === 'ship.fishing_boat') return buildFishing(item, ctx);
  return buildHalifax(item, ctx);
}
