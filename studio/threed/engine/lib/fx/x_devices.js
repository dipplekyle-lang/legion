// x_devices.js — E5 (explosions kit, 30 Sep 2026): the recurring devices of "How Long You'd Last Against Every Explosion".
//   map.blast_ring     THE 1 KM RING: a top-down map disc (field, city streets, harbour, island, quarry, atoll, ocean,
//                      arctic, desert) with the mustard blast crosshair, the dashed ring labelled "1 km · 0.6 mi", the
//                      tiny Witness on the ring, translucent danger discs / rings with sourced labels, and the moment:
//                      the flash (a white pulse racing to the Witness), the heat shimmer, the shock ring crawling out to
//                      the Witness at t_arrive, wind and grit swept after it; the ring can shrink to a point.
//   label.blast_clock  THE BLAST CLOCK: a HUD track along the bottom with five icons LIGHT, HEAT, BLAST, WIND, DEBRIS that
//                      light up at their times, a playhead, and SURVIVED 00:00.0 counting in tenths above it; it freezes
//                      red when the Witness is killed, or fast-forwards green to A LIFETIME; mode safe = SAFE DISTANCE in
//                      light-years (from the supernova on).
//   label.verdict_board THE VERDICT BOARD: five verdict rows, thirteen cards, a cursor dragging one card into its row.
import * as THREE from 'three';
import { num, clamp, lerp, sstep, hf, glow } from './x_common.js';
import { makeGrit } from './f_common.js';
import { explicitParams } from './a_asteroid.js';
import { loadFont } from '../shared/text3d.js';

const TAU = Math.PI * 2;
const fontUrl = (f) => new URL('../../fonts/' + f, import.meta.url).href;
async function fonts() { try { await loadFont('Inter', fontUrl('Inter-SemiBold.ttf')); await loadFont('EB Garamond', fontUrl('EB-Garamond.ttf')); } catch (e) { /* sans-serif fallback */ } }
const MUSTARD = '#D9A93F', INK = '#ECE6D8', RED = '#D8442B', GREEN = '#5DBB63';
const fadeIO = (t, tIn, tOut) => sstep(tIn, tIn + 0.4, t) * (Number.isFinite(tOut) ? 1 - sstep(tOut, tOut + 0.4, t) : 1);   // (sstep(Inf, Inf) is NaN)

// ── the map canvas per style (a stylised ALMANAC map: paper tones, no labels but the device's own) ────────────────
function drawMap(g, S, style, seed) {
  const c = S / 2, R = S / 2;
  const land = { field: '#b9b58f', city: '#d8d1c0', harbour: '#d3ccb8', island: '#7f9b62', quarry: '#b6a58a', atoll: '#2f7fa0', ocean: '#2f6f90', arctic: '#e3e8ec', desert: '#d6c39b', mountains: '#a39478', village: '#c9b58d' }[style] || '#c9c2ae';
  g.fillStyle = land; g.fillRect(0, 0, S, S);
  const noise = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${hf(i, seed) < 0.5 ? '0,0,0' : '255,255,255'},${a * hf(i, seed + 1)})`; g.beginPath(); g.arc(hf(i, seed + 2) * S, hf(i, seed + 3) * S, 4 + 30 * hf(i, seed + 4), 0, TAU); g.fill(); } };
  noise(900, 0.05);
  if (style === 'field' || style === 'village') {
    g.strokeStyle = 'rgba(80,70,40,0.25)'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) { g.beginPath(); const y = hf(i, 7) * S; g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + 80 * (hf(i, 8) - 0.5), S * 0.7, y - 80 * (hf(i, 9) - 0.5), S, y + 40 * (hf(i, 10) - 0.5)); g.stroke(); }
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${90 + 40 * hf(i, 11)},${100 + 30 * hf(i, 12)},60,0.25)`; g.fillRect(hf(i, 13) * S, hf(i, 14) * S, 120 + 200 * hf(i, 15), 80 + 160 * hf(i, 16)); }
    g.strokeStyle = 'rgba(120,100,70,0.6)'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, S * 0.62); g.bezierCurveTo(S * 0.4, S * 0.55, S * 0.6, S * 0.75, S, S * 0.68); g.stroke();
    if (style === 'village') for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(90,70,50,0.55)'; g.fillRect(S * 0.55 + hf(i, 17) * S * 0.3, S * 0.6 + hf(i, 18) * S * 0.25, 14, 12); }
  } else if (style === 'city' || style === 'harbour') {
    const blk = style === 'city' ? 52 : 64;
    g.fillStyle = 'rgba(120,110,95,0.35)';
    for (let y = 0; y < S; y += blk) for (let x = 0; x < S; x += blk) { const k = hf(x * 3 + y, 21); if (k < 0.08) continue; g.fillRect(x + 7, y + 7, blk - 14, blk - 14); }
    g.strokeStyle = 'rgba(255,255,250,0.85)'; g.lineWidth = 5; for (let y = 0; y < S; y += blk * 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); } for (let x = 0; x < S; x += blk * 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
    if (style === 'city') { g.strokeStyle = 'rgba(80,130,160,0.9)'; g.lineWidth = 34; g.beginPath(); g.moveTo(S * 0.1, 0); g.bezierCurveTo(S * 0.3, S * 0.4, S * 0.25, S * 0.6, S * 0.4, S); g.stroke(); g.lineWidth = 22; g.beginPath(); g.moveTo(S * 0.75, 0); g.bezierCurveTo(S * 0.7, S * 0.4, S * 0.85, S * 0.7, S * 0.8, S); g.stroke(); }
    if (style === 'harbour') {
      g.fillStyle = '#3f7f9e'; g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(S, S * 0.4); g.bezierCurveTo(S * 0.7, S * 0.46, S * 0.3, S * 0.38, 0, S * 0.45); g.closePath(); g.fill();
      g.fillStyle = '#9a9588'; for (let i = 0; i < 6; i++) g.fillRect(S * (0.18 + i * 0.12), S * 0.36, S * 0.05, S * 0.1);           // piers / quays
    }
  } else if (style === 'island' || style === 'atoll' || style === 'ocean') {
    g.fillStyle = '#2f6f90'; g.fillRect(0, 0, S, S); noise(600, 0.04);
    if (style === 'island') { g.fillStyle = '#e6d9b0'; g.beginPath(); g.ellipse(c, c, S * 0.36, S * 0.25, 0.3, 0, TAU); g.fill(); g.fillStyle = '#6f8f55'; g.beginPath(); g.ellipse(c, c, S * 0.33, S * 0.22, 0.3, 0, TAU); g.fill(); g.fillStyle = '#5a6b45'; g.beginPath(); g.ellipse(c + S * 0.12, c - S * 0.03, S * 0.1, S * 0.08, 0.3, 0, TAU); g.fill(); }
    if (style === 'atoll') { g.strokeStyle = '#bfe3d6'; g.lineWidth = 26; g.beginPath(); g.ellipse(c, c, S * 0.42, S * 0.3, 0.2, 0, TAU); g.stroke(); g.fillStyle = 'rgba(80,190,180,0.5)'; g.beginPath(); g.ellipse(c, c, S * 0.41, S * 0.29, 0.2, 0, TAU); g.fill(); for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; g.fillStyle = '#e8dcb8'; g.beginPath(); g.ellipse(c + Math.cos(a) * S * 0.42, c + Math.sin(a) * S * 0.3, 20 + 30 * hf(i, 5), 10, a, 0, TAU); g.fill(); } }
  } else if (style === 'quarry') {
    for (let k = 6; k > 0; k--) { g.fillStyle = `rgba(${140 + k * 12},${125 + k * 10},${100 + k * 8},1)`; g.beginPath(); g.ellipse(c + S * 0.05, c, S * 0.05 * k, S * 0.04 * k, 0.4, 0, TAU); g.fill(); }
  } else if (style === 'arctic') {
    g.fillStyle = '#6f8fa6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(S, S * 0.22); g.bezierCurveTo(S * 0.6, S * 0.3, S * 0.3, S * 0.18, 0, S * 0.28); g.closePath(); g.fill();
  } else if (style === 'mountains' || style === 'desert') {
    g.strokeStyle = 'rgba(90,70,50,0.25)'; g.lineWidth = 3;
    for (let k = 1; k < 16; k++) { g.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, r = S * 0.03 * k * (1 + 0.15 * Math.sin(a * 3 + k)); const x = S * 0.3 + Math.cos(a) * r, y = S * 0.35 + Math.sin(a) * r * 0.7; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  }
  // vignette to paper
  const vg = g.createRadialGradient(c, c, R * 0.6, c, c, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,18,14,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, S, S);
}
function textPlane(text, o = {}) {
  const cv = document.createElement('canvas'); cv.width = o.w || 1024; cv.height = o.h || 192; const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillStyle = o.color || INK; g.font = o.font || '600 96px "Inter", sans-serif';
  if ('letterSpacing' in g) g.letterSpacing = o.spacing || '4px';
  g.fillText(text, cv.width / 2, cv.height / 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, cv.height / cv.width), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  m.renderOrder = o.order ?? 30; m.userData.noQA = true;
  return m;
}

// ── map.blast_ring ───────────────────────────────────────────────────────────────────────────────────────────────
async function buildRing(item, ctx) {
  const p = explicitParams(item, CATALOG['map.blast_ring']);
  await fonts();
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'map.blast_ring';
  const S = num(p.size, 40);
  let gMax = -1e9; for (let i = 0; i <= 16; i++) for (let j = 0; j <= 16; j++) { const x = at[0] + (i / 16 - 0.5) * 2 * S, z = at[1] + (j / 16 - 0.5) * 2 * S; if (Math.hypot(x - at[0], z - at[1]) <= S * 1.02) gMax = Math.max(gMax, G.height(x, z)); }
  root.position.set(at[0], gMax + num(p.elev, 0.08), at[1]); root.rotation.y = -(num(p.rotate, 0)) * Math.PI / 180;   // above the highest ground under it (the terrain would cut it)
  const S_ = S, ringKm = num(p.ring_km, 1), range = num(p.range_km, Math.max(ringKm * 1.5, (Array.isArray(p.zones) ? Math.max(0, ...p.zones.map((z) => num(z.r_m ?? z.r, 0) / 1000)) : 0) * 1.25));
  const mPerKm = S / range, Rr = ringKm * mPerKm;
  const style = String(p.style || 'field');
  // the map disc
  const MS = 2048, cv = document.createElement('canvas'); cv.width = cv.height = MS; drawMap(cv.getContext('2d'), MS, style, 7);
  const mt = new THREE.CanvasTexture(cv); mt.colorSpace = THREE.SRGBColorSpace; mt.anisotropy = 8;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(S, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: mt, toneMapped: false, fog: false, color: new THREE.Color(0.92, 0.92, 0.92) }));
  disc.receiveShadow = false; disc.renderOrder = 1; root.add(disc);
  const edge = new THREE.Mesh(new THREE.RingGeometry(S * 0.995, S * 1.012, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(MUSTARD), toneMapped: false, fog: false }));
  edge.position.y = 0.01; root.add(edge);
  // danger zones: translucent discs and rings with their labels (radii in real metres)
  const zones = (Array.isArray(p.zones) ? p.zones : []).map((z, k) => {
    const r = num(z.r_m ?? z.r, 100) / 1000 * mPerKm, col = { red: '#c8332b', orange: '#e0782b', pale: '#e8d7b0', white: '#f4f1ea', yellow: '#e2b93b', fire: '#ff7a2a' }[String(z.color || 'red')] || String(z.color || '#c8332b');
    const grp = new THREE.Group(); root.add(grp);
    const dsk = new THREE.Mesh(new THREE.CircleGeometry(Math.max(0.02, r), 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: z.ring ? 0 : num(z.opacity, 0.38), depthWrite: false, toneMapped: false, fog: false }));
    dsk.position.y = 0.02 + k * 0.004; dsk.renderOrder = 3 + k; grp.add(dsk);
    const rim = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.01, r - S * 0.004), r + S * 0.004, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, fog: false }));
    rim.position.y = 0.03 + k * 0.004; rim.renderOrder = 4 + k; grp.add(rim);
    let lab = null;
    if (z.label) { lab = textPlane(String(z.label), { color: INK, font: '600 92px "Inter", sans-serif' }); const w = S * 0.16; lab.scale.setScalar(w); lab.rotation.x = -Math.PI / 2; const a = num(z.label_az, 35) * Math.PI / 180; lab.position.set(Math.sin(a) * (r + w * 0.12), 0.06, -Math.cos(a) * (r + w * 0.12) - w * 0.05); grp.add(lab); }
    return { grp, t: z.t_in != null ? +z.t_in : null };
  });
  // the fireball outline (Bravo: 7 km wide swallowing the ring)
  let fireDisc = null;
  if (p.fireball_km) { const r = num(p.fireball_km, 7) / 2 * mPerKm; fireDisc = new THREE.Mesh(new THREE.CircleGeometry(r, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.5), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, fog: false })); fireDisc.position.y = 0.09; fireDisc.renderOrder = 12; root.add(fireDisc); }
  // the dashed 1 km ring (a group, so it can shrink), its label
  const ringG = new THREE.Group(); ringG.position.y = 0.08; root.add(ringG);
  const nD = 72, dashM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.32, 1.25), toneMapped: false, fog: false });
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.02, 1), dashM, nD); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), v3 = new THREE.Vector3();
  for (let i = 0; i < nD; i++) { const a = (i + 0.25) / nD * TAU; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); m4.compose(v3.set(Math.cos(a), 0, Math.sin(a)), q, s3.set(0.012, 1, TAU / nD * 0.55)); dash.setMatrixAt(i, m4); }
  dash.renderOrder = 20; dash.userData.noQA = true; ringG.add(dash); ringG.scale.set(Rr, 1, Rr);
  const ringLab = textPlane(String(p.label || `${ringKm} km · ${+(ringKm * 0.621).toFixed(1)} mi`), { font: '600 96px "Inter", sans-serif' });
  const lw = S * 0.28; ringLab.scale.setScalar(lw); ringLab.rotation.x = -Math.PI / 2; root.add(ringLab);
  // the crosshair
  const ch = new THREE.Group(); ch.position.y = 0.1; root.add(ch);
  const chM = new THREE.MeshBasicMaterial({ color: new THREE.Color(MUSTARD).multiplyScalar(1.2), toneMapped: false, fog: false });
  const cs = S * 0.05;
  for (const [w, d] of [[cs * 2.2, cs * 0.07], [cs * 0.07, cs * 2.2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), chM); b.renderOrder = 22; ch.add(b); }
  const chr = new THREE.Mesh(new THREE.RingGeometry(cs * 0.55, cs * 0.66, 48).rotateX(-Math.PI / 2), chM); chr.renderOrder = 22; ch.add(chr);
  // the Witness on the ring: a little standing mannequin (white body, mustard scarf) with a shadow dot
  const wAz = num(p.witness_az, 150) * Math.PI / 180, wx = Math.sin(wAz) * Rr, wz = -Math.cos(wAz) * Rr;
  const wit = new THREE.Group(); wit.position.set(wx, 0.08, wz); root.add(wit);
  const hS = num(p.witness_size, S * 0.07), white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.5 }), mus = new THREE.MeshStandardMaterial({ color: new THREE.Color(MUSTARD), roughness: 0.6 });
  if (p.witness !== false) {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(hS * 0.13, hS * 0.5, 4, 12), white); body.position.y = hS * 0.42; body.castShadow = true; wit.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(hS * 0.12, 16, 12), white); head.position.y = hS * 0.9; head.castShadow = true; wit.add(head);
    const sc = new THREE.Mesh(new THREE.TorusGeometry(hS * 0.12, hS * 0.045, 8, 20), mus); sc.rotation.x = Math.PI / 2; sc.position.y = hS * 0.74; wit.add(sc);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(hS * 0.25, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); sh.position.y = 0.01; wit.add(sh);
  }
  // extra markers on the map (a window, a village, a boat): a small pin + a label
  const marks = (Array.isArray(p.markers) ? p.markers : []).map((mk) => {
    const a = num(mk.az, 90) * Math.PI / 180, r = num(mk.km, 1) * mPerKm, g = new THREE.Group(); g.position.set(Math.sin(a) * r, 0.1, -Math.cos(a) * r); root.add(g);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.012, S * 0.012, S * 0.04, 12), chM); pin.position.y = S * 0.02; g.add(pin);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(S * 0.022, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(mk.color || MUSTARD), toneMapped: false })); dot.position.y = S * 0.045; g.add(dot);
    if (mk.label) { const l = textPlane(String(mk.label), { font: '600 80px "Inter", sans-serif' }); l.scale.setScalar(S * 0.22); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.06, S * 0.05); g.add(l); }
    return g;
  });
  // the moment: flash pulse to the Witness, heat shimmer, the shock ring, wind grit
  const tF = p.t_flash != null ? +p.t_flash : null, tA = p.t_arrive != null ? +p.t_arrive : (tF != null ? tF + num(p.delay, 2.9) : null);
  const flash = glow([1, 0.97, 0.9], 40); flash.position.y = 0.3; root.add(flash);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.9, 2.6), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  beam.renderOrder = 35; root.add(beam);
  { const L = Rr, a = Math.atan2(wx, -wz); beam.position.set(wx / 2, 0.12, wz / 2); beam.rotation.y = -a; beam.scale.set(S * 0.012, 1, L); }
  const heat = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.8, 0.35), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  heat.position.y = 0.11; heat.renderOrder = 33; root.add(heat);
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.45), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  shock.position.y = 0.12; shock.renderOrder = 34; root.add(shock);
  const GRt = makeGrit(ctx, { count: 400, maxPx: 4, minPx: 1.2, order: 36 }); root.add(GRt.mesh);
  const heatOn = p.heat === true, windOn = p.wind !== false;
  const shr = p.shrink && typeof p.shrink === 'object' ? { t: num(p.shrink.t, 1), dur: num(p.shrink.dur, 1.5), to: num(p.shrink.to_km, 0) } : (p.shrink != null && p.shrink !== false ? { t: +p.shrink, dur: 1.5, to: 0 } : null);
  const zeroLab = shr ? textPlane(String(p.shrink_label || '0 m'), { font: '600 96px "Inter", sans-serif', color: MUSTARD }) : null;
  if (zeroLab) { zeroLab.scale.setScalar(S * 0.2); zeroLab.rotation.x = -Math.PI / 2; zeroLab.position.set(0, 0.15, S * 0.1); root.add(zeroLab); }
  function update(t) {
    // the ring (and the Witness with it) shrinking to a point
    let k = 1;
    if (shr) k = lerp(1, shr.to / ringKm, sstep(shr.t, shr.t + shr.dur, t));
    ringG.scale.set(Math.max(1e-3, Rr * k), 1, Math.max(1e-3, Rr * k)); wit.position.set(wx * k, 0.08, wz * k);
    ringLab.position.set(0, 0.09, Rr * k + lw * 0.12); ringLab.material.opacity = shr ? 1 - sstep(shr.t, shr.t + shr.dur * 0.5, t) : 1;
    if (zeroLab) zeroLab.material.opacity = sstep(shr.t + shr.dur * 0.8, shr.t + shr.dur, t);
    zones.forEach((z) => { const a = z.t == null ? 1 : sstep(z.t, z.t + 0.4, t); z.grp.scale.setScalar(Math.max(1e-3, a)); z.grp.visible = a > 0.001; });
    // the flash at the crosshair and the light racing to the Witness (instantly)
    const x = tF == null ? -1 : t - tF;
    const fI = x < 0 ? 0 : Math.exp(-x / 0.25) * 2 + 0.2 * Math.exp(-x / 1.5);
    flash.visible = fI > 0.01; flash.material.uniforms.uS.value = S * 0.3; flash.material.uniforms.uMinPx.value = 40 + 260 * Math.min(1, fI); flash.material.uniforms.uI.value = 1.6 * fI;
    beam.material.opacity = x < 0 ? 0 : 0.9 * Math.exp(-x / 0.35);
    chM.color.set(MUSTARD).multiplyScalar(1.2 + (x >= 0 ? 2.5 * Math.exp(-x / 0.3) : 0));
    const hr = x < 0 ? 0 : Math.min(1.2, x / 0.25) * Rr * 1.4;
    heat.visible = heatOn && x >= 0 && x < 1.2; heat.scale.set(Math.max(0.01, hr), 1, Math.max(0.01, hr)); heat.material.opacity = heatOn ? 0.45 * (1 - sstep(0.4, 1.2, x)) : 0;
    // the shock ring: from the centre, reaching the Witness at tA, then on and fading
    const y = tA == null || tF == null ? -1 : (t - tF) / Math.max(0.1, tA - tF);
    shock.visible = y > 0 && y < 1.6; const sr = Math.max(0.01, Rr * Math.pow(Math.max(0, y), 0.85));
    shock.scale.set(sr, 1, sr); shock.material.opacity = 0.9 * (1 - sstep(1.1, 1.6, y));
    // wind and grit swept outward after the front passes
    GRt.begin();
    if (windOn && y > 0) for (let i = 0; i < 400; i++) {
      const a = hf(i, 3) * TAU, r0 = Rr * (0.15 + 1.1 * hf(i, 4)), pass = Math.pow(r0 / Rr, 1 / 0.85);
      const dt = y - pass; if (dt < 0 || dt > 1.2) continue;
      const r = r0 + S * 0.25 * dt * (0.5 + hf(i, 5));
      GRt.push(Math.cos(a) * r, 0.2 + 0.4 * hf(i, 6) * S * 0.01, Math.sin(a) * r, 0.28, 0.24, 0.18, S * 0.004 * (0.5 + hf(i, 7)));
    }
    GRt.end();
  }
  update(0);
  root.traverse((o) => { if (o.isMesh) o.userData.noQA = true; });
  return { root, radius: S, height: 1, snapped: true, update, contact: false, footprint: [S * 2, S * 2],
    anchors: { center: new THREE.Vector3(0, 0, 0), witness: (t) => { const w = new THREE.Vector3(wx, 0.5, wz); root.localToWorld(w); return [w.x, w.y, w.z]; }, ring_label: new THREE.Vector3(0, 0, Rr), top: new THREE.Vector3(0, S * 1.6, 0) },
    info: { metres_per_km: +mPerKm.toFixed(2), ring_radius_m: +Rr.toFixed(2) } };
}

// ── label.blast_clock ────────────────────────────────────────────────────────────────────────────────────────────
function drawIcon(g, kind, x, y, s, on, col) {
  g.save(); g.translate(x, y); g.strokeStyle = on ? col : 'rgba(236,230,216,0.3)'; g.fillStyle = g.strokeStyle; g.lineWidth = s * 0.08; g.lineCap = 'round';
  if (kind === 'light') { g.beginPath(); g.arc(0, 0, s * 0.18, 0, TAU); g.fill(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.28, Math.sin(a) * s * 0.28); g.lineTo(Math.cos(a) * s * 0.44, Math.sin(a) * s * 0.44); g.stroke(); } }
  else if (kind === 'heat') { for (let k = -1; k <= 1; k++) { g.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20, yy = s * 0.4 - u * s * 0.8, xx = k * s * 0.22 + Math.sin(u * TAU * 1.2) * s * 0.07; if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke(); } }
  else if (kind === 'blast') { for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(-s * 0.25, 0, s * 0.14 * k, -0.9, 0.9); g.stroke(); } g.beginPath(); g.arc(-s * 0.3, 0, s * 0.07, 0, TAU); g.fill(); }
  else if (kind === 'wind') { for (let k = 0; k < 3; k++) { g.beginPath(); const yy = -s * 0.25 + k * s * 0.25; g.moveTo(-s * 0.4, yy); g.lineTo(s * 0.2, yy); g.arc(s * 0.2, yy - s * 0.08, s * 0.08, Math.PI / 2, -Math.PI / 2, true); g.stroke(); } }
  else if (kind === 'debris') { for (let k = 0; k < 6; k++) { const a = k * 1.1, r = s * (0.12 + 0.05 * k); g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a) * r + s * 0.08, Math.sin(a) * r - s * 0.05); g.lineTo(Math.cos(a) * r + s * 0.02, Math.sin(a) * r + s * 0.08); g.closePath(); g.fill(); } }
  g.restore();
}
async function buildClock(item, ctx) {
  const p = explicitParams(item, CATALOG['label.blast_clock']);
  await fonts();
  const mode = String(p.mode || 'clock');
  const t0 = num(p.t0 ?? p.t_flash, 0.5), rate = num(p.rate, 1), start = num(p.start, 0), span = num(p.span, 4);
  const tIn = num(p.t_in, 0), tOut = num(p.t_out, Infinity);
  const ICONS = ['light', 'heat', 'blast', 'wind', 'debris'];
  const iconT = {}; const IC = p.icons || {};
  for (const k of ICONS) iconT[k] = IC[k] != null ? +IC[k] : null;            // clock seconds (after the flash) each lights; null = never (greyed)
  if (!p.icons && mode === 'clock') { iconT.light = 0; }
  const killAt = p.killed != null ? +p.killed : null;                         // clock seconds: it freezes red there
  const lifeAt = p.lifetime != null ? +p.lifetime : null;                     // scene s: fast-forward to green A LIFETIME
  const paused = p.paused === true;
  const CW = 2048, CH = 400, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let last = '';
  const fmt = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`; };
  const draw = (clockS, state, blinkOff, lifeK, t) => {
    const lit = {}; for (const k of ICONS) lit[k] = iconT[k] != null && clockS >= iconT[k] - 1e-6;
    const key = `${mode}|${clockS.toFixed(1)}|${state}|${blinkOff}|${lifeK.toFixed(2)}|${ICONS.map((k) => lit[k] ? 1 : 0).join('')}|${mode === 'safe' ? t.toFixed(2) : ''}`;
    if (key === last) return; last = key;
    g.clearRect(0, 0, CW, CH);
    // a soft dark plate under the HUD: legible over a white flash, a pale map, snow
    g.fillStyle = 'rgba(14,13,12,0.46)'; const pr = 36; g.beginPath(); g.moveTo(60 + pr, 16); g.lineTo(CW - 60 - pr, 16); g.quadraticCurveTo(CW - 60, 16, CW - 60, 16 + pr); g.lineTo(CW - 60, CH - 8 - pr); g.quadraticCurveTo(CW - 60, CH - 8, CW - 60 - pr, CH - 8); g.lineTo(60 + pr, CH - 8); g.quadraticCurveTo(60, CH - 8, 60, CH - 8 - pr); g.lineTo(60, 16 + pr); g.quadraticCurveTo(60, 16, 60 + pr, 16); g.fill();
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 16;
    const col = state === 'dead' ? RED : state === 'life' ? GREEN : INK;
    if (mode === 'safe') {
      const v = lerp(num(p.from, 0), num(p.to, 50), sstep(0, num(p.dur, 2), t - t0));
      g.textAlign = 'center'; g.fillStyle = INK; g.font = '600 150px "Inter", sans-serif';
      g.fillText(`${Math.round(v).toLocaleString('en-US')} light-years`, CW / 2, 190);
      g.fillStyle = MUSTARD; g.fillRect(CW / 2 - 380, 225, 760, 7);
      g.fillStyle = INK; g.font = '500 62px "EB Garamond", serif'; if ('letterSpacing' in g) g.letterSpacing = '8px'; g.fillText(String(p.caption || 'SAFE DISTANCE'), CW / 2, 305); if ('letterSpacing' in g) g.letterSpacing = '0px';
      tex.needsUpdate = true; return;
    }
    // SURVIVED + the clock
    g.textAlign = 'left'; g.fillStyle = INK; g.font = '500 58px "EB Garamond", serif'; if ('letterSpacing' in g) g.letterSpacing = '8px';
    g.fillText(state === 'life' && lifeK > 0.99 ? 'SURVIVED' : 'SURVIVED', 120, 96); if ('letterSpacing' in g) g.letterSpacing = '0px';
    if (!blinkOff) { g.fillStyle = col; g.font = '600 118px "Inter", sans-serif'; g.fillText(state === 'life' && lifeK > 0.99 ? 'A LIFETIME' : fmt(clockS), 580, 110); }
    // the track: a thin line with ticks; a playhead; five icons with captions
    const x0 = 120, x1 = CW - 120, ty = 188;
    g.fillStyle = 'rgba(236,230,216,0.35)'; g.fillRect(x0, ty, x1 - x0, 4);
    for (let s = 0; s <= span + 1e-6; s += 1) { const xx = x0 + (x1 - x0) * s / span; g.fillRect(xx - 2, ty - 10, 4, 24); }
    const ph = x0 + (x1 - x0) * clamp(clockS / span); g.fillStyle = col; g.fillRect(x0, ty - 1, ph - x0, 6); g.beginPath(); g.arc(ph, ty + 2, 11, 0, TAU); g.fill();
    ICONS.forEach((k, i) => {
      const xx = x0 + 90 + i * (x1 - x0 - 180) / 4, on = lit[k];
      drawIcon(g, k, xx, 280, 120, on, k === 'heat' || k === 'light' ? '#F4E3B0' : INK);
      g.textAlign = 'center'; g.fillStyle = on ? INK : 'rgba(236,230,216,0.3)'; g.font = '600 38px "Inter", sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '6px'; g.fillText(k.toUpperCase(), xx, 372); if ('letterSpacing' in g) g.letterSpacing = '0px';
      if (iconT[k] != null) { const tx = x0 + (x1 - x0) * clamp(iconT[k] / span); g.fillStyle = on ? MUSTARD : 'rgba(217,169,63,0.35)'; g.fillRect(tx - 3, ty - 22, 6, 18); }
    });
    tex.needsUpdate = true;
  };
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, opacity: 0 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, CH / CW), mat); plane.renderOrder = 1e7; plane.frustumCulled = false; plane.userData.noQA = true;
  const root = new THREE.Group(); root.name = 'label.blast_clock'; root.add(plane);
  const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), P0 = new THREE.Vector3();
  let D = 6;
  function stateAt(t) {
    let cs = paused ? start : start + Math.max(0, (t - t0) * rate), st = 'run', lifeK = 0;
    if (killAt != null && cs >= killAt) { cs = killAt; st = 'dead'; }
    if (lifeAt != null && t >= lifeAt) { lifeK = sstep(lifeAt, lifeAt + 1.0, t); cs = Math.min(5999.9, cs + lifeK ** 3 * 6000); st = 'life'; }
    const blink = paused && p.blink !== false ? Math.floor(t * 2.5) % 2 === 1 : (st === 'dead' && Math.floor((t - t0) * 2) % 2 === 1 && p.blink === true);
    return { cs, st, blink, lifeK };
  }
  function update(t, clock, camera) {
    const S = stateAt(t); draw(S.cs, S.st, S.blink, S.lifeK, t);
    const a = fadeIO(t, tIn, tOut);
    mat.opacity = a; plane.visible = a > 0.003;
    if (!camera || !camera.isPerspectiveCamera) return;
    camera.updateMatrixWorld(); camera.matrixWorld.extractBasis(_r, _u, _f); _f.negate();
    D = Math.max(1, num(p.depth, 6));
    const hh = D * Math.tan(camera.fov * Math.PI / 360), hw = hh * (camera.aspect || 16 / 9);
    const Wp = hw * 2 * num(p.width, 0.62);
    const pos = String(p.position || 'bottom');
    const y = pos === 'top' ? hh - hh * 0.08 - Wp * (CH / CW) * 0.5 : -hh + hh * num(p.lift, 0.2) + Wp * (CH / CW) * 0.5;
    P0.copy(camera.position).addScaledVector(_f, D).addScaledVector(_u, y);
    root.position.copy(P0); root.quaternion.copy(camera.quaternion); plane.scale.setScalar(Wp);
  }
  update(0);
  return { root, radius: 1, height: 1, snapped: true, contact: false, story: false, update,
    dofShift: (A, dist) => { root.position.copy(P0).addScaledVector(A, 1 - D / Math.max(0.5, dist)); }, anchors: {}, readout: true };
}

// ── label.verdict_board ──────────────────────────────────────────────────────────────────────────────────────────
// THE VERDICT BOARD: five rows (NOWHERE ON EARTH black, LESS THAN A BLINK red, SECONDS orange, IT DEPENDS amber,
// A LIFETIME green), thirteen cards (a tray at the bottom holds the ones not placed yet), a mouse cursor dragging one
// card into its row at `t` with that card's personality (sparks, a fizzing fuse, flakes, a crack, a ring, a glow...).
const ROWS = [['NOWHERE ON EARTH', '#1b1b1d', '#6b6b70'], ['LESS THAN A BLINK', '#8e2a20', '#e04a36'], ['SECONDS', '#8e4f18', '#ec8a30'], ['IT DEPENDS', '#7d6320', '#e0b440'], ['A LIFETIME', '#2c5a32', '#6cc070']];
const ROW_ALIAS = { nowhere: 0, nowhere_on_earth: 0, blink: 1, less_than_a_blink: 1, seconds: 2, depends: 3, it_depends: 3, lifetime: 4, a_lifetime: 4 };
const CARDS = [['firecracker', 'FIRECRACKER', 'sparks'], ['dynamite', 'DYNAMITE', 'fizz'], ['grenade', 'HAND GRENADE', 'clink'], ['moab', 'MOAB', 'heavy'], ['beirut', 'BEIRUT', 'crack'], ['halifax', 'HALIFAX', 'tap'], ['hiroshima', 'HIROSHIMA', 'quiet'],
  ['castle_bravo', 'CASTLE BRAVO', 'flakes'], ['tsar_bomba', 'TSAR BOMBA', 'oversized'], ['krakatoa', 'KRAKATOA', 'ring'], ['supernova', 'SUPERNOVA', 'glow'], ['grb', 'GAMMA-RAY BURST', 'glow'], ['black_holes', 'TWO BLACK HOLES', 'ripple']];
const rowOf = (r) => (typeof r === 'number' ? clamp(Math.round(r), 0, 4) : ROW_ALIAS[String(r || '').toLowerCase().replace(/[\s-]+/g, '_')] ?? 4);
const cardOf = (c) => { const k = String(c || '').toLowerCase().replace(/[\s-]+/g, '_'); return CARDS.findIndex((x) => x[0] === k || x[1].toLowerCase().replace(/[\s-]+/g, '_') === k); };
async function buildBoard(item, ctx) {
  const p = explicitParams(item, CATALOG['label.verdict_board']);
  await fonts();
  const CW = 1920, CH = 1080, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const placed = (Array.isArray(p.placed) ? p.placed : []).map((q) => ({ c: cardOf(q.card ?? q), r: rowOf(q.row) })).filter((q) => q.c >= 0);
  const mv = p.move && typeof p.move === 'object' ? { c: cardOf(p.move.card), r: rowOf(p.move.row), t: num(p.move.t, 1), dur: num(p.move.dur, 1.4) } : null;
  const tIn = num(p.t_in, 0), slide = p.slide_in === true;
  const X0 = 200, X1 = 1760, Y0 = 110, RH = 128, CWd = 158, CHt = 84;
  const slotX = (r, k) => X0 + 480 + k * (CWd + 16);
  const trayPos = (idx, n) => [CW / 2 - (n * 118) / 2 + idx * 118 + 55, 900];
  const cardDraw = (c, x, y, sc, fxT, alpha = 1) => {
    const [, name, fx] = CARDS[c], big = fx === 'oversized' ? 1.25 : 1, w = CWd * sc * big, h = CHt * sc * big;
    g.save(); g.globalAlpha = alpha; g.translate(x, y);
    if (fx === 'glow' && fxT >= 0) { g.shadowColor = 'rgba(160,200,255,0.9)'; g.shadowBlur = 40 * (0.6 + 0.4 * Math.sin(fxT * 6)); }
    else { g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 14; g.shadowOffsetY = 4; }
    g.fillStyle = fx === 'oversized' ? '#f4f2ee' : '#ECE6D8'; g.fillRect(-w / 2, -h / 2, w, h);
    g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.strokeStyle = MUSTARD; g.lineWidth = 4 * sc; g.strokeRect(-w / 2 + 6 * sc, -h / 2 + 6 * sc, w - 12 * sc, h - 12 * sc);
    g.fillStyle = '#1c1b19'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fsz = Math.round(24 * sc * big); g.font = `600 ${fsz}px "Inter", sans-serif`;
    while (fsz > 8 && g.measureText(name).width > w - 22 * sc) { fsz -= 1; g.font = `600 ${fsz}px "Inter", sans-serif`; }   // fit the card
    g.fillText(name, 0, 2);
    if (fxT >= 0) {                                                        // the card's personality while it lands
      if (fx === 'crack') { g.strokeStyle = 'rgba(30,30,30,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w * 0.1, -h / 2); g.lineTo(0, -h * 0.05); g.lineTo(-w * 0.15, h * 0.2); g.lineTo(w * 0.05, h / 2); g.moveTo(0, -h * 0.05); g.lineTo(w * 0.3, h * 0.1); g.stroke(); }
      if (fx === 'sparks' || fx === 'fizz') for (let i = 0; i < 26; i++) { const a = hf(i, 3) * TAU, r = (fx === 'fizz' ? 20 : 30 + 90 * ((fxT * 1.8 + hf(i, 4)) % 1)) * sc, ox = fx === 'fizz' ? w * 0.42 : 0, oy = fx === 'fizz' ? -h * 0.42 : 0; g.fillStyle = `rgba(255,${190 + 60 * hf(i, 5)},90,${0.9 - 0.8 * ((fxT * 1.8 + hf(i, 4)) % 1)})`; g.fillRect(ox + Math.cos(a) * r, oy + Math.sin(a) * r, 4, 4); }
      if (fx === 'flakes') for (let i = 0; i < 40; i++) { const x = (hf(i, 7) - 0.5) * w * 1.4, y = -h / 2 + ((fxT * 60 + hf(i, 8) * 200) % 220); g.fillStyle = 'rgba(250,250,250,0.9)'; g.fillRect(x, y, 3, 3); }
      if (fx === 'ring') { const r = (fxT * 500) % 900; g.strokeStyle = `rgba(236,230,216,${Math.max(0, 0.7 - r / 900)})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
      if (fx === 'tap') { const on = Math.floor(fxT * 8) % 3 === 0; if (on) { g.fillStyle = MUSTARD; g.fillRect(w / 2 - 22, -h / 2 + 12, 10, 10); } }
    }
    g.restore();
  };
  let last = '';
  const draw = (t) => {
    const u = mv ? sstep(mv.t, mv.t + mv.dur, t) : 0, after = mv ? t - (mv.t + mv.dur) : -1;
    const key = `${u.toFixed(3)}|${after > 0 && after < 3 ? (after * 20 | 0) : after > 0 ? 'done' : ''}|${sstep(tIn, tIn + 0.6, t).toFixed(2)}`;
    if (key === last) return; last = key;
    const inK = slide ? sstep(tIn, tIn + 0.6, t) : 1;
    g.clearRect(0, 0, CW, CH);
    g.save(); g.translate(0, (1 - inK) * CH * 0.6); g.globalAlpha = inK;
    g.fillStyle = 'rgba(18,17,16,0.86)'; g.fillRect(X0 - 60, Y0 - 60, X1 - X0 + 120, 5 * RH + 110);
    ROWS.forEach(([label, dark, light], r) => {
      const y = Y0 + r * RH; g.fillStyle = dark; g.fillRect(X0, y, X1 - X0, RH - 14); g.fillStyle = light; g.fillRect(X0, y, 12, RH - 14);
      g.fillStyle = '#ECE6D8'; g.font = '600 32px "Inter", sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '4px'; g.fillText(label, X0 + 36, y + (RH - 14) / 2); if ('letterSpacing' in g) g.letterSpacing = '0px';
    });
    // the cards already placed, in their rows (in order)
    const perRow = [0, 0, 0, 0, 0];
    for (const q of placed) { const k = perRow[q.r]++; cardDraw(q.c, slotX(q.r, k) + CWd / 2, Y0 + q.r * RH + (RH - 14) / 2, 1, -1); }
    // the tray: the cards not placed yet
    const used = new Set(placed.map((q) => q.c)); if (mv && u > 0) used.add(mv.c);
    const tray = CARDS.map((_, i) => i).filter((i) => !used.has(i) && (p.tray === undefined || p.tray !== false));
    tray.forEach((c, i) => { const [x, y] = trayPos(i, tray.length); cardDraw(c, x, y, 0.5, -1, 0.9); });
    // the card on the move: from the tray to its slot, under a mouse cursor; its personality once it lands
    if (mv && mv.c >= 0) {
      const all = CARDS.map((_, i) => i).filter((i) => !placed.some((q) => q.c === i));
      const ti = all.indexOf(mv.c), [tx, ty] = trayPos(Math.max(0, ti), all.length), k = perRow[mv.r];
      const ex = slotX(mv.r, k) + CWd / 2, ey = Y0 + mv.r * RH + (RH - 14) / 2;
      const x = lerp(tx, ex, u), y = lerp(ty, ey, u) - Math.sin(u * Math.PI) * 60, sc = lerp(0.5, 1, sstep(0, 0.4, u));
      const land = after >= 0 ? after : -1, bump = land >= 0 && land < 0.25 ? (CARDS[mv.c][2] === 'heavy' ? 1 - 0.06 * Math.sin(land * 40) : 1 + 0.08 * Math.sin(land * 30) * (1 - land / 0.25)) : 1;
      cardDraw(mv.c, x, y + (CARDS[mv.c][2] === 'heavy' && land >= 0 && land < 0.3 ? 6 * Math.sin(land * 50) * (1 - land / 0.3) : 0), sc * bump, land);
      if (u > 0 && u < 1.05 || (land >= 0 && land < 0.6)) {                // the cursor
        const cx = x + 40, cy = y + 20; g.fillStyle = '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 46); g.lineTo(cx + 12, cy + 34); g.lineTo(cx + 22, cy + 54); g.lineTo(cx + 30, cy + 50); g.lineTo(cx + 20, cy + 30); g.lineTo(cx + 36, cy + 30); g.closePath(); g.fill(); g.stroke();
      }
      if (CARDS[mv.c][2] === 'ripple' && land >= 0 && land < 2.5) { g.strokeStyle = `rgba(236,230,216,${0.5 * (1 - land / 2.5)})`; g.lineWidth = 3; for (let k2 = 0; k2 < 3; k2++) { const r = (land * 400 + k2 * 120); g.beginPath(); g.ellipse(ex, ey, r, r * 0.35, 0, 0, TAU); g.stroke(); } }
    }
    g.restore();
    tex.needsUpdate = true;
  };
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, opacity: 1 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, CH / CW), mat); plane.renderOrder = 1e7 - 1; plane.frustumCulled = false; plane.userData.noQA = true;
  const root = new THREE.Group(); root.name = 'label.verdict_board'; root.add(plane);
  const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), P0 = new THREE.Vector3();
  let D = 5;
  function update(t, clock, camera) {
    draw(t);
    const a = slide ? 1 : fadeIO(t, tIn, num(p.t_out, Infinity));
    mat.opacity = a; plane.visible = a > 0.003;
    if (!camera || !camera.isPerspectiveCamera) return;
    camera.updateMatrixWorld(); camera.matrixWorld.extractBasis(_r, _u, _f); _f.negate();
    D = Math.max(1, num(p.depth, 5));
    const hh = D * Math.tan(camera.fov * Math.PI / 360), hw = hh * (camera.aspect || 16 / 9);
    P0.copy(camera.position).addScaledVector(_f, D);
    root.position.copy(P0); root.quaternion.copy(camera.quaternion); plane.scale.setScalar(hw * 2 * num(p.width, 1.0));
  }
  update(0);
  return { root, radius: 1, height: 1, snapped: true, contact: false, story: false, update,
    dofShift: (A, dist) => { root.position.copy(P0).addScaledVector(A, 1 - D / Math.max(0.5, dist)); }, anchors: {}, readout: true };
}

// ── label.log_scale: a log-scale ruler on the lens (the yield scale, the SAFE DISTANCE ruler, the sound-level bar) ──
function fmtV(v, unit) {
  if (unit === 't') return fmtYieldT(v);
  const a = Math.abs(v); const s = a >= 1e6 ? (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M' : a >= 1e4 ? Math.round(v / 1e3) + ',000' : a >= 1 ? String(+v.toPrecision(3)) : String(+v.toPrecision(2));
  return s + (unit ? ' ' + unit : '');
}
function fmtYieldT(t) { return t >= 1e6 ? +(t / 1e6).toPrecision(3) + ' Mt' : t >= 1e3 ? +(t / 1e3).toPrecision(3) + ' kt' : t >= 1 ? +t.toPrecision(3) + ' t' : t >= 1e-3 ? +(t * 1e3).toPrecision(3) + ' kg' : +(t * 1e6).toPrecision(3) + ' g'; }
async function buildLogScale(item, ctx) {
  const p = explicitParams(item, CATALOG['label.log_scale']);
  await fonts();
  const vert = String(p.orient || 'horizontal') === 'vertical';
  const CW = vert ? 1024 : 2048, CH = vert ? 1400 : 520, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const unit = String(p.unit ?? 'ly'), lo0 = Math.log10(Math.max(1e-12, num(p.min, 1))), hi0 = Math.log10(Math.max(1e-11, num(p.max, 100000)));
  const zoomTo = p.zoom && typeof p.zoom === 'object' ? { max: Math.log10(num(p.zoom.max, 1e5)), t: num(p.zoom.t, 1), dur: num(p.zoom.dur, 1.2) } : null;
  const zones = Array.isArray(p.zones) ? p.zones : [], marks = Array.isArray(p.markers) ? p.markers : [];
  const ptr = p.pointer && typeof p.pointer === 'object' ? { from: num(p.pointer.from, 1), to: num(p.pointer.to, 1), t: num(p.pointer.t, 1), dur: num(p.pointer.dur, 1.2), label: p.pointer.label } : null;
  const tIn = num(p.t_in, 0), tOut = num(p.t_out, Infinity);
  let last = '';
  const draw = (t) => {
    const hi = zoomTo ? lerp(hi0, zoomTo.max, sstep(zoomTo.t, zoomTo.t + zoomTo.dur, t)) : hi0, lo = lo0;
    const pv = ptr ? Math.pow(10, lerp(Math.log10(ptr.from), Math.log10(ptr.to), sstep(ptr.t, ptr.t + ptr.dur, t))) : null;
    const vis = marks.map((m) => (m.t_in == null || t >= +m.t_in ? 1 : 0)).join('') + zones.map((z) => (z.t_in == null ? 1 : sstep(+z.t_in, +z.t_in + 0.5, t)).toFixed(2)).join(',');
    const key = `${hi.toFixed(3)}|${pv == null ? '' : pv.toPrecision(4)}|${vis}`;
    if (key === last) return; last = key;
    g.clearRect(0, 0, CW, CH);
    g.fillStyle = 'rgba(14,13,12,0.62)'; g.fillRect(0, 0, CW, CH);
    const A = vert ? 180 : 140, B = vert ? CH - 120 : CW - 140, pos = (v) => { const u = (Math.log10(Math.max(1e-12, v)) - lo) / Math.max(1e-6, hi - lo); return vert ? B - u * (B - A) : A + u * (B - A); };
    const axis = vert ? 330 : CH * 0.52;
    // zones (a band along the axis), the axis, decade ticks with labels
    zones.forEach((z) => { const k = z.t_in == null ? 1 : sstep(+z.t_in, +z.t_in + 0.5, t); if (k <= 0) return; const a = pos(num(z.from, Math.pow(10, lo))), b = pos(Math.min(num(z.to, 1), Math.pow(10, hi)));
      g.fillStyle = z.color || 'rgba(216,68,43,0.55)'; g.globalAlpha = k; if (vert) g.fillRect(axis - 60, Math.min(a, b), 120, Math.abs(b - a)); else g.fillRect(Math.min(a, b), axis - 50, Math.abs(b - a), 100);
      if (z.label) { g.fillStyle = INK; g.font = '600 40px "Inter", sans-serif'; g.textAlign = 'center'; g.fillText(String(z.label), vert ? axis : (a + b) / 2, vert ? (a + b) / 2 : axis - 70); } g.globalAlpha = 1; });
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); if (vert) { g.moveTo(axis, A); g.lineTo(axis, B); } else { g.moveTo(A, axis); g.lineTo(B, axis); } g.stroke();
    g.font = '600 34px "Inter", sans-serif'; g.fillStyle = 'rgba(236,230,216,0.85)'; g.textAlign = vert ? 'right' : 'center';
    const step = Math.max(1, Math.ceil((hi - lo) / 9));
    for (let d = Math.ceil(lo); d <= Math.floor(hi); d += step) { const q = pos(Math.pow(10, d)); g.fillStyle = INK; if (vert) { g.fillRect(axis - 18, q - 2, 36, 4); g.fillText(fmtV(Math.pow(10, d), unit), axis - 40, q + 12); } else { g.fillRect(q - 2, axis - 18, 4, 36); g.fillText(fmtV(Math.pow(10, d), unit), q, axis + 70); } }
    // markers: a dot + a label (an entry, a star, a sound)
    marks.forEach((m, i) => { if (m.t_in != null && t < +m.t_in) return; const v = num(m.v, 1); if (Math.log10(v) > hi + 0.02 || Math.log10(v) < lo - 0.02) return; const q = pos(v);
      g.fillStyle = m.color || MUSTARD; g.beginPath(); if (vert) g.arc(axis, q, 16, 0, TAU); else g.arc(q, axis, 16, 0, TAU); g.fill();
      g.fillStyle = INK; g.font = '600 38px "Inter", sans-serif'; g.textAlign = vert ? 'left' : 'center';
      if (vert) g.fillText(String(m.label || fmtV(v, unit)), axis + 40, q + 13); else g.fillText(String(m.label || fmtV(v, unit)), q, axis - (i % 2 ? 110 : 70)); });
    // the pointer sliding along the scale
    if (pv != null) { const q = pos(pv); g.fillStyle = MUSTARD; g.beginPath(); if (vert) { g.moveTo(axis + 90, q); g.lineTo(axis + 140, q - 26); g.lineTo(axis + 140, q + 26); } else { g.moveTo(q, axis + 90); g.lineTo(q - 26, axis + 140); g.lineTo(q + 26, axis + 140); } g.closePath(); g.fill();
      g.font = '600 44px "Inter", sans-serif'; g.textAlign = vert ? 'left' : 'center'; g.fillText(String(ptr.label || fmtV(pv, unit)), vert ? axis + 160 : q, vert ? q + 15 : axis + 200); }
    if (p.title) { g.fillStyle = INK; g.font = '500 48px "EB Garamond", serif'; if ('letterSpacing' in g) g.letterSpacing = '8px'; g.textAlign = 'center'; g.fillText(String(p.title).toUpperCase(), CW / 2, vert ? 90 : 70); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
    tex.needsUpdate = true;
  };
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, opacity: 0 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, CH / CW), mat); plane.renderOrder = 1e7 - 2; plane.frustumCulled = false; plane.userData.noQA = true;
  const root = new THREE.Group(); root.name = 'label.log_scale'; root.add(plane);
  const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), P0 = new THREE.Vector3();
  let D = 5;
  function update(t, clock, camera) {
    draw(t);
    const a = fadeIO(t, tIn, tOut); mat.opacity = a; plane.visible = a > 0.003;
    if (!camera || !camera.isPerspectiveCamera) return;
    camera.updateMatrixWorld(); camera.matrixWorld.extractBasis(_r, _u, _f); _f.negate();
    D = Math.max(1, num(p.depth, 5));
    const hh = D * Math.tan(camera.fov * Math.PI / 360), hw = hh * (camera.aspect || 16 / 9);
    const Wp = vert ? hh * 2 * num(p.width, 0.9) * (CW / CH) : hw * 2 * num(p.width, 0.86);
    const side = String(p.position || 'center');
    const x = vert ? (side === 'left' ? -hw + Wp / 2 + hw * 0.05 : side === 'right' ? hw - Wp / 2 - hw * 0.05 : 0) : 0, y = vert ? 0 : side === 'top' ? hh - Wp * (CH / CW) / 2 - hh * 0.06 : side === 'bottom' ? -hh + Wp * (CH / CW) / 2 + hh * 0.22 : 0;
    P0.copy(camera.position).addScaledVector(_f, D).addScaledVector(_r, x).addScaledVector(_u, y);
    root.position.copy(P0); root.quaternion.copy(camera.quaternion); plane.scale.setScalar(Wp);
  }
  update(0);
  return { root, radius: 1, height: 1, snapped: true, contact: false, story: false, update,
    dofShift: (A, dist) => { root.position.copy(P0).addScaledVector(A, 1 - D / Math.max(0.5, dist)); }, anchors: {}, readout: true };
}

export const CATALOG = {
  'label.log_scale': {
    desc: 'A LOG-SCALE RULER on the lens (the video\'s yield scale, the SAFE DISTANCE ruler in light-years, the sound-level bar): `orient` horizontal|vertical, `min`..`max` with `unit` (t = TNT yields shown as g/kg/t/kt/Mt; ly; dB; km), decade ticks, `zones` [{from, to, color, label, t_in}] (the red 50 ly danger band), `markers` [{v, label, color, t_in}] (Halifax 2.9 kt, Hiroshima 15 kt, Betelgeuse 548 ly...), a `pointer` {from, to, t, dur, label} sliding along, `zoom` {max, t, dur} (the scale extending: "the top jumping far above Halifax", "past 50 ly toward galactic scale"), `title`, `position` center|top|bottom|left|right',
    actions: ['show'],
    params: { orient: 'horizontal|vertical', min: 'value', max: 'value', unit: "t|ly|dB|km|''", zones: '[{from, to, color, label, t_in}]', markers: '[{v, label, color, t_in}]', pointer: '{from, to, t, dur, label}', zoom: '{max, t, dur}', title: 'text', position: 'center|top|bottom|left|right', width: 'fraction (0.86)', t_in: 's', t_out: 's' },
    footprint: [1, 1], height: 1, tags: ['label', 'scale', 'ruler', 'log scale', 'yield scale', 'safe distance', 'light-years', 'decibels', 'chart', 'story', 'device'],
    examples: [{ note: 'the SAFE DISTANCE ruler: Earth at 1 ly, the red 50 ly band, Betelgeuse far beyond', spec: { labels: [{ kind: 'label.log_scale', unit: 'ly', min: 1, max: 1000, title: 'safe distance', zones: [{ from: 1, to: 50, color: 'rgba(216,68,43,0.55)', label: 'DANGER' }], markers: [{ v: 1, label: 'EARTH' }, { v: 548, label: 'BETELGEUSE' }] }] } }],
  },
  'label.verdict_board': {
    desc: 'THE VERDICT BOARD (the video\'s scoreboard, full frame on the lens over a dark plate): five rows NOWHERE ON EARTH (black), LESS THAN A BLINK (red), SECONDS (orange), IT DEPENDS (amber), A LIFETIME (green); the cards already `placed` sit in their rows, the tray at the bottom holds the rest of the thirteen (firecracker, dynamite, grenade, moab, beirut, halifax, hiroshima, castle_bravo, tsar_bomba, krakatoa, supernova, grb, black_holes); `move` {card, row, t, dur} = a mouse cursor drags that card from the tray into its row with its personality as it lands: firecracker sparks, dynamite fuse fizzing, moab heavy thud, beirut a crack across it, halifax a tapping light, hiroshima quiet, castle_bravo white flakes, tsar_bomba oversized white, krakatoa a ring across the board, supernova / grb glow, black_holes the board ripples. slide_in: true = the board slides in at t_in',
    actions: ['place'],
    params: { placed: '[{card, row}] (row: nowhere|blink|seconds|depends|lifetime)', move: '{card, row, t, dur}', slide_in: 'bool', t_in: 's', t_out: 's', tray: 'bool', width: 'fraction of the frame (1)' },
    footprint: [1, 1], height: 1, tags: ['label', 'verdict board', 'scoreboard', 'cards', 'rows', 'lifetime', 'seconds', 'blink', 'story', 'device'],
    examples: [{ note: 'after entry 1: the firecracker card dragged into A LIFETIME', spec: { labels: [{ kind: 'label.verdict_board', move: { card: 'firecracker', row: 'lifetime', t: 0.8, dur: 1.4 } }] } }],
  },
  'map.blast_ring': {
    desc: 'THE 1 KM RING (the video\'s map device): a top-down map disc on the ground (style field | village | city (streets + rivers) | harbour (quays and water) | island | atoll | ocean | quarry | arctic | desert | mountains; a stylised paper map, mustard rim) with the mustard blast crosshair in the middle, the dashed ring at ring_km labelled "1 km · 0.6 mi", the tiny Witness figure standing on the ring, danger `zones` (translucent discs or rings with their sourced labels, e.g. grenade 5 m / 15 m / 230 m, Hiroshima 2 km fire), an optional fireball outline (fireball_km: Bravo 7 km swallows the ring), map `markers` (a window, a village, a boat) and the moment: at t_flash the crosshair flashes and a white pulse races to the Witness instantly, heat: true = a heat shimmer rolling out with the light, the shock ring crawls out and reaches the Witness at t_arrive with grit swept after it; shrink: {t, dur, to_km} shrinks the ring (and the Witness) to a point labelled "0 m". Film it top-down: camera keys looking straight down from ~1.4 x size',
    actions: ['idle'],
    params: { size: 'm disc radius in the scene (40)', ring_km: 'km (1)', range_km: 'km at the disc edge (1.5 x ring)', label: 'text ("1 km · 0.6 mi")', style: 'field|village|city|harbour|island|atoll|ocean|quarry|arctic|desert|mountains', zones: '[{r_m, color: red|orange|pale|white|yellow|fire|#hex, label, ring: bool, t_in}]', fireball_km: 'km diameter', markers: '[{km, az, label, color}]', witness: 'bool', witness_az: 'deg (150)', t_flash: 's', t_arrive: 's (t_flash + 2.9)', heat: 'bool', wind: 'bool', shrink: '{t, dur, to_km} | s', shrink_label: 'text (0 m)', rotate: 'deg' },
    footprint: [80, 80], height: 1, snap: false, contact: false,
    tags: ['map', 'device', '1 km ring', 'ring', 'blast radius', 'danger zone', 'crosshair', 'diagram', 'top-down', 'distance'],
    examples: [{ note: 'the grenade zones inside the 1 km ring, the shock ring reaching the Witness at 2.9 s', spec: { look: { time: 'afternoon' }, world: { biome: 'plains', vegetation: 0 }, objects: [{ kind: 'map.blast_ring', at: [0, 0], size: 40, style: 'field', zones: [{ r_m: 230, color: 'pale', label: '230 m', ring: true }, { r_m: 15, color: 'orange', label: '15 m' }, { r_m: 5, color: 'red', label: '5 m' }], t_flash: 1, t_arrive: 3.9 }], camera: { move: 'keys', fov: 50, target: 'objects:0', keys: [{ t: 0, pos: [0, 62, 6], look: [0, 0, 0] }, { t: 6, pos: [0, 56, 4], look: [0, 0, 0] }] } } }],
  },
  'label.blast_clock': {
    desc: 'THE BLAST CLOCK (the video\'s HUD, on the lens): a thin track along the bottom with five icons LIGHT, HEAT, BLAST, WIND, DEBRIS (greyed until their time), a playhead, and SURVIVED 00:00.0 counting in tenths of a second from the flash (t0). icons {light: 0, heat: 0.1, blast: 2.2, wind: 2.4, debris: 2.6} = the clock second each lights (leave one out: it stays grey); killed: s = the clock freezes RED there (the lethal moment: pair with a white frame); lifetime: s (scene time) = the clock fast-forwards and turns GREEN: A LIFETIME; paused: true = 00:00.0 blinking (the freeze). mode safe = SAFE DISTANCE in light-years (from -> to over dur): from the supernova on',
    actions: ['count'],
    params: { t0: 's the flash (clock 0)', icons: '{light, heat, blast, wind, debris}: clock s', killed: 'clock s (freeze red)', lifetime: 's scene time (green A LIFETIME)', paused: 'bool', rate: 'x (1)', start: 'clock s at t0', span: 's of track (4)', mode: 'clock|safe', from: 'ly', to: 'ly', dur: 's', caption: 'safe mode caption', position: 'bottom|top', lift: '0..1 from the bottom (0.2 = above the subtitles)', width: '0.3..0.9 of the frame (0.62)', t_in: 's', t_out: 's' },
    footprint: [1, 1], height: 1, tags: ['label', 'hud', 'clock', 'timer', 'survived', 'blast clock', 'icons', 'light', 'heat', 'blast', 'wind', 'debris', 'safe distance', 'story'],
    examples: [{ note: 'Hiroshima at 1 km: light and heat at 0, blast at 2.2, killed at 2.2 (red)', spec: { labels: [{ kind: 'label.blast_clock', t0: 1, icons: { light: 0, heat: 0.05, blast: 2.2, wind: 2.3, debris: 2.4 }, killed: 2.2 }] } }],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'label.blast_clock') return buildClock(item, ctx);
  if (kind === 'label.verdict_board') return buildBoard(item, ctx);
  if (kind === 'label.log_scale') return buildLogScale(item, ctx);
  return buildRing(item, ctx);
}
