// x_gw.js — E5 (explosions kit, 30 Sep 2026): the last two entries (a gamma-ray burst, two black holes).
//   space.black_holes  two black holes (36 and 29 solar masses) spiralling in faster and faster and merging at t_merge:
//                      black spheres ringed by their bright photon rings, the starlight bent round them, and below them a
//                      glowing grid of spacetime dimpled by their wells, stirred into a two-armed spiral of ripples that
//                      runs out in rings after the merger (GW150914). Silent and dark: no flash.
//   fx.gw_ripple       the ripples reaching a quiet field at night (put it at the stage): faint rings of distorted light
//                      sweeping over the ground, and the target figure stretching tall and squeezing thin (exaggerated)
//   landmark.ligo      a LIGO observatory: the L of two 4 km concrete arm tunnels, the corner station, the end stations
//   space.vela         the Vela satellites (1960s): 26-sided polyhedra covered in solar cells, with antennas (count 2)
import * as THREE from 'three';
import { num, clamp, lerp, sstep, hf, glow, DEG, headingYaw } from './x_common.js';
import { patchMaterial } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';

const TAU = Math.PI * 2;
const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));

// ── space.black_holes ────────────────────────────────────────────────────────────────────────────────────────────
function ringMat(col, width) {
  return new THREE.ShaderMaterial({
    uniforms: { uI: { value: 1 }, uW: { value: width }, uCol: { value: new THREE.Color(...col) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vQ; void main(){ vQ = position.xy * 2.0; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz)); gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float uI; uniform float uW; uniform vec3 uCol; varying vec2 vQ; void main(){
  #include <logdepthbuf_fragment>
  float r = length(vQ); float ring = exp(-pow((r - 0.62) / uW, 2.0)) + 0.25 * exp(-pow((r - 0.62) / (uW * 5.0), 2.0));
  float halo = smoothstep(1.0, 0.62, r) * 0.12;
  gl_FragColor = vec4(uCol * (ring * 2.5 + halo) * uI * (1.0 - smoothstep(0.92, 1.0, r)), 1.0); }`,
  });
}
async function buildBH(item, ctx) {
  const p = explicitParams(item, CATALOG['space.black_holes']);
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'space.black_holes'; root.position.set(at[0], num(p.y, 0), at[1]);
  const R = num(p.radius, 60), m1 = num(p.m1, 36), m2 = num(p.m2, 29), r1 = R, r2 = R * m2 / m1;
  const tM = num(p.t_merge, 7), d0 = num(p.sep, 6) * R, tau0 = Math.max(0.5, num(p.inspiral, tM));
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bh = [r1, r2].map((r) => { const g = new THREE.Group(); root.add(g); const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), black); s.renderOrder = 24; g.add(s);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat([1.0, 0.86, 0.7], 0.02)); ring.scale.set(r * 4.4, r * 4.4, 1); ring.renderOrder = 25; ring.frustumCulled = false; g.add(ring);
    const lens = glow([0.5, 0.6, 1.0], 20); lens.material.uniforms.uS.value = r * 7; lens.material.uniforms.uI.value = 0.12; g.add(lens); return { g, s, ring, r }; });
  const fin = new THREE.Group(); root.add(fin);
  const rf = R * (m1 + m2 - 3) / m1 * 0.75, fs = new THREE.Mesh(new THREE.SphereGeometry(rf, 48, 32), black); fs.renderOrder = 24; fin.add(fs);
  const fring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat([1.0, 0.86, 0.7], 0.02)); fring.scale.set(rf * 4.4, rf * 4.4, 1); fring.renderOrder = 25; fin.add(fring);
  // the spacetime grid under them: glowing lines, wells, the spiral ripples, the rings after the merger
  const G = num(p.grid_size, R * 60), N = 160, grid = p.grid !== false;
  let gridMesh = null, gpos = null, gbase = null;
  if (grid) {
    const pts = [], lines = 40;
    for (let k = 0; k <= lines; k++) { const v = -G / 2 + k * G / lines; for (let i = 0; i < N; i++) { const u0 = -G / 2 + i * G / N, u1 = -G / 2 + (i + 1) * G / N; pts.push(u0, 0, v, u1, 0, v, v, 0, u0, v, 0, u1); } }
    const gg = new THREE.BufferGeometry(); gbase = new Float32Array(pts); gpos = new Float32Array(pts); gg.setAttribute('position', new THREE.BufferAttribute(gpos, 3).setUsage(THREE.DynamicDrawUsage));
    gridMesh = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: new THREE.Color(0.35, 0.55, 1.0).multiplyScalar(1.3), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    gridMesh.position.y = -num(p.grid_depth, R * 5); gridMesh.frustumCulled = false; gridMesh.userData.noQA = true; root.add(gridMesh);
  }
  const phaseAt = (t) => { const x = Math.max(1e-3, tM - t); const w0 = 0.9; return -w0 * tau0 * Math.pow(x / tau0, 0.625) * 1.6; };   // omega ~ (tM - t)^-3/8
  const sepAt = (t) => d0 * Math.pow(Math.max(0, (tM - t) / tau0), 0.25);
  const cues = [{ t: +tM.toFixed(2), sound: 'deep_rumble', gain: 0.4 }];
  function update(t) {
    const merged = t >= tM, d = sepAt(t), ph = phaseAt(t), a1 = d * m2 / (m1 + m2), a2 = d * m1 / (m1 + m2);
    bh[0].g.visible = bh[1].g.visible = !merged; fin.visible = merged;
    bh[0].g.position.set(Math.cos(ph) * a1, 0, Math.sin(ph) * a1); bh[1].g.position.set(-Math.cos(ph) * a2, 0, -Math.sin(ph) * a2);
    if (merged) { const x = t - tM, wob = 0.06 * Math.exp(-x / 0.4) * Math.sin(x * 40); fs.scale.set(1 + wob, 1 - wob, 1 + wob); }
    if (!gridMesh) return;
    const c = G * 0.12, well = R * 2.2;                                     // ripple speed (scene m / s), well depth
    for (let i = 0; i < gpos.length; i += 3) {
      const x = gbase[i], z = gbase[i + 2], r = Math.hypot(x, z) + 1e-3, th = Math.atan2(z, x);
      let h = 0;
      if (!merged) { const q1 = Math.hypot(x - bh[0].g.position.x, z - bh[0].g.position.z), q2 = Math.hypot(x - bh[1].g.position.x, z - bh[1].g.position.z); h -= well * (r1 / (q1 + r1 * 1.2) + r2 / (q2 + r2 * 1.2)); }
      else h -= well * 1.6 * rf / (r + rf * 1.2);
      const tr = t - r / c;                                                    // retarded time
      const amp = R * 1.8 * Math.min(1, (R * 8) / r) * (tr < tM ? Math.pow(Math.max(0.05, sepAt(tr) / d0), -1.2) * 0.25 : 1.6 * Math.exp(-(tr - tM) / 0.35));
      h += (tr > -2) ? amp * Math.cos(2 * th - 2 * phaseAt(Math.min(tr, tM))) * (tr < tM ? 1 : 0) + (tr >= tM ? 0.45 * amp * Math.cos((tr - tM) * 9) : 0) : 0;
      gpos[i + 1] = h;
    }
    gridMesh.geometry.attributes.position.needsUpdate = true;
  }
  update(0);
  return { root, radius: d0, height: R * 2, snapped: true, fly: true, update, cues, contact: false,
    planet: { center: () => root.getWorldPosition(new THREE.Vector3()), R: d0 * 0.8 }, anchors: { center: new THREE.Vector3(0, 0, 0) } };
}

// ── fx.gw_ripple ─────────────────────────────────────────────────────────────────────────────────────────────────
async function buildRipple(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.gw_ripple']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.gw_ripple'; root.position.set(at[0], G.height(at[0], at[1]) + 0.05, at[1]);
  const t0 = num(p.t, 1), dur = num(p.dur, 3), R = num(p.radius, 40), amp = clamp(num(p.stretch, 0.18), 0, 0.5), from = num(p.from, 200) * DEG;
  const rings = [];
  for (let k = 0; k < 6; k++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.renderOrder = 30; m.userData.noQA = true; root.add(m); rings.push(m);
  }
  let tgt = null;
  function update(t) {
    const x = t - t0;
    rings.forEach((m, k) => { const u = x - k * (dur / 6); const r = u > 0 ? (u * R * 0.8) % (R * 1.6) : 0; m.visible = u > 0 && x < dur + 1; m.scale.set(Math.max(0.01, r), 1, Math.max(0.01, r)); m.material.opacity = 0.35 * (1 - r / (R * 1.6)) * (1 - sstep(dur, dur + 1, x)); });
    if (!tgt && ctx.S) { const it = ctx.S.byRef[String(p.target || 'cast:0')]; tgt = it ? (it.res.figure?.group || it.res.root) : null; }
    if (tgt) { const k = x > 0 && x < dur ? amp * Math.sin(x * TAU * num(p.freq, 1.2)) * Math.sin(Math.PI * x / dur) : 0; tgt.scale.set(1 - k * 0.6, 1 + k, 1 - k * 0.6); }
  }
  update(0);
  return { root, radius: R, height: 2, snapped: true, update, contact: false, anchors: {} };
}

// ── landmark.ligo ────────────────────────────────────────────────────────────────────────────────────────────────
async function buildLigo(item, ctx) {
  const p = explicitParams(item, CATALOG['landmark.ligo']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'landmark.ligo'; root.position.set(at[0], G.height(at[0], at[1]), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const L = num(p.arm, 4000), conc = stdM({ color: 0xcfcac0, roughness: 0.9 }), white = stdM({ color: 0xeeeeea, roughness: 0.7 }), road = stdM({ color: 0x6e6a62, roughness: 0.95 });
  const gy = (x, z) => { const v = new THREE.Vector3(x, 0, z).applyEuler(root.rotation).add(root.position); return G.height(v.x, v.z) - root.position.y; };
  for (const [dx, dz] of [[1, 0], [0, 1]]) {
    const n = 40;
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n * L, x = dx * u, z = dz * u, y = gy(x, z); const b = new THREE.Mesh(new THREE.BoxGeometry(dx ? L / n + 0.2 : 3.2, 2.2, dz ? L / n + 0.2 : 3.2), conc); b.position.set(x, y + 1.1, z); b.castShadow = b.receiveShadow = true; root.add(b);
      const r = new THREE.Mesh(new THREE.BoxGeometry(dx ? L / n : 4, 0.1, dz ? L / n : 4), road); r.position.set(x + dz * 5, y + 0.05, z + dx * 5); r.receiveShadow = true; root.add(r); }
    const end = new THREE.Mesh(new THREE.BoxGeometry(24, 11, 18), white); end.position.set(dx * (L + 10), gy(dx * L, dz * L) + 5.5, dz * (L + 10)); end.castShadow = true; root.add(end);
  }
  const corner = new THREE.Group(); root.add(corner);
  const cb = new THREE.Mesh(new THREE.BoxGeometry(60, 16, 44), white); cb.position.set(-18, gy(0, 0) + 8, -14); cb.castShadow = true; corner.add(cb);
  const cb2 = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 26), white); cb2.position.set(-50, gy(0, 0) + 5, 10); cb2.castShadow = true; corner.add(cb2);
  root.traverse((o) => { if (o.isMesh) o.userData.noQA = false; });
  return { root, radius: L * 0.7, height: 16, snapped: true, update: () => {}, footprint: [L, L], contact: false,
    anchors: { corner: new THREE.Vector3(-18, 8, -14), arm_x: new THREE.Vector3(L / 2, 1, 0), arm_y: new THREE.Vector3(0, 1, L / 2), end_x: new THREE.Vector3(L, 5, 0) } };
}

// ── space.vela ───────────────────────────────────────────────────────────────────────────────────────────────────
async function buildVela(item, ctx) {
  const p = explicitParams(item, CATALOG['space.vela']);
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'space.vela'; root.position.set(at[0], num(p.y, 0), at[1]);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = '#c9ccd2'; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { g.fillStyle = `rgb(${20 + 12 * hf(i + j * 8, 3)},${30 + 14 * hf(i + j * 8, 4)},${70 + 30 * hf(i + j * 8, 5)})`; g.fillRect(8 + i * 30, 8 + j * 30, 27, 27); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const cells = stdM({ map: tex, roughness: 0.35, metalness: 0.5 }), metal = stdM({ color: 0xd8d8d0, roughness: 0.3, metalness: 0.9 });
  const n = Math.round(clamp(num(p.count, 2), 1, 4)), sats = [];
  for (let k = 0; k < n; k++) {
    const s = new THREE.Group(); root.add(s); s.position.set((k - (n - 1) / 2) * num(p.spacing, 6), 0, 0);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), cells); body.castShadow = true; s.add(body);   // a many-faced solar-cell polyhedron (Vela 5: 26 faces)
    for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), metal); a.position.set(x * 1.3, y * 1.3, z * 1.3); a.lookAt(x * 3, y * 3, z * 3); a.rotateX(Math.PI / 2); s.add(a); }
    const det = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 12), metal); det.position.set(0, 0.8, 0); s.add(det);
    sats.push(s);
  }
  function update(t) { sats.forEach((s, k) => { s.rotation.set(t * 0.2 + k, t * 0.35 + k * 2, 0); }); }
  update(0);
  return { root, radius: n * 3, height: 2, snapped: true, fly: true, update, contact: false, planet: { center: () => root.getWorldPosition(new THREE.Vector3()), R: Math.max(1.2, n * 2) }, anchors: {} };
}

// ── space.galaxy: a spiral galaxy (the Milky Way) from above or at a tilt ────────────────────────────────────────
let GAL = null;
function galaxyTex() {
  if (GAL) return GAL;
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const c = S / 2;
  // stars along two log-spiral arms (+ two weaker ones), a haze, dust lanes, the yellow bulge
  // the arms' own glow first (continuous bands of blue-white light the stars sit in): two main arms, two weaker
  for (let arm = 0; arm < 4; arm++) for (let j = 0; j < 240; j++) {
    const k = j / 240, r = c * (0.08 + 0.84 * Math.pow(k, 0.85)), th = (arm < 2 ? arm * Math.PI : arm * Math.PI + Math.PI / 2 + 0.3) + Math.log(1 + r / 40) * 1.9;
    const x = c + Math.cos(th) * r, y = c + Math.sin(th) * r, rad = (arm < 2 ? 22 : 15) + 34 * k, a = (arm < 2 ? 0.16 : 0.08) * (1 - 0.6 * k);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(165,185,255,${a})`); gr.addColorStop(1, 'rgba(165,185,255,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  for (let i = 0; i < 90000; i++) {
    const arm = i % 4, weak = arm > 1, k = hf(i, 1), r = Math.pow(k, 0.7) * c * 0.95, th0 = weak ? arm * Math.PI + Math.PI / 2 + 0.3 : arm * Math.PI;
    const th = th0 + Math.log(1 + r / 40) * 1.9 + (hf(i, 2) - 0.5) * (0.3 + 0.6 * (1 - k)) * (weak ? 1.5 : 1);
    const x = c + Math.cos(th) * r + (hf(i, 3) - 0.5) * 12, y = c + Math.sin(th) * r + (hf(i, 4) - 0.5) * 12;
    const b = 0.3 + 0.7 * hf(i, 5), blue = r > c * 0.25;
    g.fillStyle = blue ? `rgba(${170 + 60 * b},${190 + 50 * b},255,${0.34 * b})` : `rgba(255,${220 + 30 * b},${170 + 40 * b},${0.36 * b})`;
    g.fillRect(x, y, 1.7, 1.7);
  }
  for (let i = 0; i < 2600; i++) { const r = Math.pow(hf(i, 11), 0.9) * c * 0.9, th = hf(i, 12) * Math.PI * 2; g.fillStyle = `rgba(255,${160 + 60 * hf(i, 13)},${200 * hf(i, 14)},0.25)`; g.beginPath(); g.arc(c + Math.cos(th) * r, c + Math.sin(th) * r, 1 + 2 * hf(i, 15), 0, Math.PI * 2); g.fill(); }   // HII knots
  const bulge = g.createRadialGradient(c, c, 0, c, c, c * 0.3); bulge.addColorStop(0, 'rgba(255,240,200,1)'); bulge.addColorStop(0.3, 'rgba(255,220,160,0.6)'); bulge.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = bulge; g.fillRect(0, 0, S, S);
  const haze = g.createRadialGradient(c, c, 0, c, c, c); haze.addColorStop(0, 'rgba(160,170,210,0.25)'); haze.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = haze; g.fillRect(0, 0, S, S);
  GAL = new THREE.CanvasTexture(cv); GAL.colorSpace = THREE.SRGBColorSpace; GAL.userData.keep = true; return GAL;
}
async function buildGalaxy(item, ctx) {
  const p = explicitParams(item, CATALOG['space.galaxy']);
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'space.galaxy'; root.position.set(at[0], num(p.y, 0), at[1]); root.rotation.x = num(p.tilt, 0) * DEG;
  const R = num(p.radius, 1000);
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: galaxyTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.8, 1.8, 1.8), side: THREE.DoubleSide }));
  disc.renderOrder = 18; disc.userData.noQA = true; root.add(disc);
  const softC = document.createElement('canvas'); softC.width = softC.height = 256; { const sg = softC.getContext('2d'), gr = sg.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 256, 256); }
  const red = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(softC), color: new THREE.Color(0.9, 0.08, 0.05), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));   // a soft-edged red wash, not a flat disc
  red.position.y = 1; red.renderOrder = 19; root.add(red);
  const sunXZ = Array.isArray(p.sun) ? p.sun.map(Number) : [0.52, 0.12], sunP = new THREE.Vector3(sunXZ[0] * R, 2, sunXZ[1] * R);
  const sunMark = new THREE.Mesh(new THREE.RingGeometry(R * 0.018, R * 0.024, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 0.6), side: THREE.DoubleSide }));
  sunMark.position.copy(sunP); sunMark.visible = p.sun !== false; root.add(sunMark);
  const bXZ = Array.isArray(p.burst) ? p.burst.map(Number) : null, tB = num(p.t_burst, 1);
  const bP = bXZ ? new THREE.Vector3(bXZ[0] * R, 3, bXZ[1] * R) : null;
  const flare = glow([0.85, 0.85, 1.0], 25); if (bP) flare.position.copy(bP); root.add(flare);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.004, R * 0.03, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.6, 2.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  root.add(jet);
  if (bP && p.jet !== false) { const d = sunP.clone().sub(bP); jet.position.copy(bP).addScaledVector(d, 0.5); jet.scale.set(1, d.length(), 1); jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); }
  const tRed = p.t_red != null ? +p.t_red : null;
  function update(t) {
    disc.rotation.y = -t * num(p.spin, 0.01);
    const x = bP ? t - tB : -1, k = x < 0 ? 0 : Math.exp(-x / 2.5);
    flare.visible = bP != null && x >= 0; flare.material.uniforms.uS.value = R * 0.4; flare.material.uniforms.uMinPx.value = 20 + 220 * k; flare.material.uniforms.uI.value = 3 * (0.15 + k);
    jet.material.opacity = bP && x >= 0 ? 0.85 * Math.min(1, x / 0.4) * (0.6 + 0.4 * k) : 0;
    const rk = tRed == null ? 0 : sstep(tRed, tRed + 1.2, t);
    red.material.opacity = 0.3 * rk; disc.material.color.setRGB(1.8 + 0.6 * rk, 1.8 - 1.1 * rk, 1.8 - 1.25 * rk);   // the stars themselves turn red too
  }
  update(0);
  return { root, radius: R, height: R * 0.2, snapped: true, fly: true, update, contact: false, planet: { center: () => root.getWorldPosition(new THREE.Vector3()), R: R * 0.9 },
    anchors: { center: new THREE.Vector3(0, 0, 0), sun: sunP.clone(), burst: bP ? bP.clone() : new THREE.Vector3(0, 0, 0) } };
}

export const CATALOG = {
  'space.galaxy': {
    desc: 'a SPIRAL GALAXY (the Milky Way) in space, face-on from above (`tilt` 0) or tilted: blue star-streaked spiral arms, pink star-forming knots, a haze, the golden bulge; `sun` [x, z] (fractions of the radius, default [0.52, 0.12]: 26,000 ly out) marked by a small ring; `burst` [x, z] + `t_burst` = a point flaring as bright as the whole galaxy (a supernova, a gamma-ray burst), `jet` (default true) = its beam drawn to the Sun; `t_red` = the whole disc shades red (nowhere in the galaxy is safe). Camera: orbit_planet on it (dist 2.2-3) or a slow push down onto it',
    actions: ['idle'],
    params: { radius: 'm (1000)', tilt: 'deg (0 = face-on)', sun: '[x, z] fractions | false', burst: '[x, z] fractions', t_burst: 's (1)', jet: 'bool', t_red: 's', spin: 'rad/s', y: 'm' },
    footprint: [2000, 2000], height: 200, fly: true, snap: false, contact: false,
    tags: ['space', 'galaxy', 'milky way', 'spiral', 'stars', 'gamma-ray burst', 'supernova', 'cosmic'],
    examples: [{ note: 'a burst anywhere in the galaxy with its jet aimed at the Sun; then the whole galaxy red', spec: { world: { biome: 'space' }, objects: [{ kind: 'space.galaxy', at: [0, 0], burst: [-0.3, -0.4], t_burst: 1, t_red: 4 }], camera: { move: 'orbit_planet', target: 'objects:0', dist: 2.4, arc: 20, el: 60 } } }],
  },
  'space.black_holes': {
    desc: 'TWO BLACK HOLES merging (GW150914: 36 + 29 solar masses) in space: two black spheres ringed by bright photon rings, the starlight bent round them, spiralling in faster and faster (the chirp) and merging at t_merge into one (a quick ringdown wobble) — silent and dark, no flash; grid: true (default) = a glowing grid of spacetime below them, dimpled by their wells and stirred into a two-armed spiral of ripples that runs out in rings after the merger. Camera: orbit_planet on it (dist 2.5-3.5) or a high 3/4 view onto the grid',
    actions: ['merge'],
    params: { t_merge: 's (7)', radius: 'm of the bigger one (60)', m1: '36', m2: '29', sep: 'x radius at t=0 (6)', inspiral: 's of inspiral before t_merge (t_merge)', grid: 'bool', grid_size: 'm', grid_depth: 'm below' },
    footprint: [800, 800], height: 200, fly: true, snap: false, contact: false,
    tags: ['space', 'black hole', 'black holes', 'merger', 'gravitational waves', 'ligo', 'gw150914', 'spacetime', 'ripples', 'chirp'],
    examples: [{ note: 'the inspiral and the ripples on the spacetime grid', spec: { world: { biome: 'space' }, objects: [{ kind: 'space.black_holes', at: [0, 0], t_merge: 7 }], camera: { move: 'orbit_planet', target: 'objects:0', dist: 3, arc: 30, el: 25 } } }],
  },
  'fx.gw_ripple': {
    desc: 'GRAVITATIONAL WAVES passing through a quiet field (put it at the stage, night): faint blue-white rings sweeping over the ground from `t` for `dur` s, and the `target` figure (cast:0 = YOU) stretching tall and squeezing thin, exaggerated (`stretch` 0..0.5)',
    actions: ['pass'],
    params: { t: 's', dur: 's (3)', radius: 'm (40)', stretch: '0..0.5 (0.18)', freq: 'Hz (1.2)', target: "'cast:0'" },
    footprint: [80, 80], height: 2, snap: false, contact: false,
    tags: ['fx', 'gravitational waves', 'ripples', 'stretch', 'squeeze', 'spacetime', 'night', 'black holes'],
    examples: [{ note: 'the waves through YOU', spec: { look: { time: 'night', sky: 'clear' }, world: { biome: 'plains' }, objects: [{ kind: 'fx.gw_ripple', at: [0, 0], t: 1, dur: 3 }], cast: [{ ref: 'witness', at: [0, 0], heading: 180, action: 'look_up' }], camera: { move: 'keys', fov: 45, target: 'cast:0', keys: [{ t: 0, at: [3, 5], alt: 1.5, look_at: [0, 0], look_h: 1.1 }, { t: 6, at: [2.4, 4.6], alt: 1.5, look_at: [0, 0], look_h: 1.1 }] } } }],
  },
  'landmark.ligo': {
    desc: 'a LIGO gravitational-wave observatory (Hanford, Washington / Livingston, Louisiana): the L of two 4 km concrete arm tunnels at right angles with service roads, the white corner station and the end stations. Film it from the air (500-2500 m up)',
    actions: ['idle'],
    params: { arm: 'm (4000)', heading: 'deg' },
    footprint: [4000, 4000], height: 16, tags: ['landmark', 'ligo', 'observatory', 'gravitational waves', 'hanford', 'livingston', 'laser', 'arms'],
    examples: [{ note: 'the L from the air', spec: { world: { biome: 'desert', relief: 0.02 }, structures: [{ kind: 'landmark.ligo', at: [0, 0] }], camera: { move: 'keys', fov: 50, target: 'structures:0', keys: [{ t: 0, at: [-900, -900], alt: 900, look_at: [900, 900], look_h: 0 }, { t: 8, at: [-700, -1000], alt: 950, look_at: [900, 900], look_h: 0 }] } } }],
  },
  'space.vela': {
    desc: 'the VELA satellites (1960s nuclear-test watchers, the first to catch a gamma-ray burst in 1967): many-faced polyhedra covered in dark blue solar cells with silver edges, antennas on six sides, an X-ray detector; `count` 2 (the pair), slowly tumbling. Put space.earth far behind',
    actions: ['idle'],
    params: { count: '1..4 (2)', spacing: 'm (6)', y: 'm' },
    footprint: [12, 4], height: 2, fly: true, snap: false, tags: ['space', 'satellite', 'vela', '1960s', 'gamma-ray', 'solar cells', 'spacecraft'],
    examples: [{ note: 'the pair in high orbit', spec: { world: { biome: 'space' }, objects: [{ kind: 'space.vela', at: [0, 0], count: 2 }], camera: { move: 'orbit_planet', target: 'objects:0', dist: 3, arc: 30, el: 10 } } }],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'space.galaxy') return buildGalaxy(item, ctx);
  if (kind === 'fx.gw_ripple') return buildRipple(item, ctx);
  if (kind === 'landmark.ligo') return buildLigo(item, ctx);
  if (kind === 'space.vela') return buildVela(item, ctx);
  return buildBH(item, ctx);
}
