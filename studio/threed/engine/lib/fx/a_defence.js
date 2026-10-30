// a_defence.js — E2 (asteroid kit, 29 Sep 2026): planetary defence.
//   vehicle.dart        NASA's DART at true size (~vending-machine bus 1.2 x 1.3 x 1.3 m in gold foil, two 8.5 m roll-out
//                       ROSA solar arrays with their end rolls, the flat RLSA high-gain antenna, the DRACO camera, the
//                       NEXT-C ion thruster); flies `to` a point / along `vel`, `thruster` glow
//   space.didymos       the binary asteroid: Didymos (780 m spinning-top rubble pile) and its moonlet Dimorphos (151 m)
//                       on a 1.19 km orbit, the orbit drawn as a thin ring; with `dart` the spacecraft comes in and hits
//                       Dimorphos at `t_impact`: the flash, the ejecta cone and tail, and the new, tighter orbit ring
//                       (period 11 h 55 min -> 11 h 22 min; the shift is exaggerated x`exaggerate` so it reads)
//   structure.observatory  a telescope dome on a hill: the slit open toward `az`/`el`, the telescope inside, a red night
//                       lamp; optional `laser` (a green lunar-laser-ranging beam up to the Moon)
//   detail.discovery_screen the discovery moment on a monitor: four blinked frames of a star field, the moving dot of a new
//                       rock circled, a coordinate readout (Catalina Sky Survey style)
import * as THREE from 'three';
import { makePuffs, makeSparks, syncEnv, hf, clamp, lerp, sstep } from './f_common.js';
import { makeAsteroid, explicitParams } from './a_asteroid.js';
import { glowSprite } from './a_entry.js';
import { patchMaterial } from '../shared/env.js';

const DEG = Math.PI / 180;
const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

// ── textures ────────────────────────────────────────────────────────────────────────────────────────────────────
let FOIL = null, CELLS = null;
function foilTex() {
  if (FOIL) return FOIL;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#b8862e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const x = hf(i, 1) * 256, y = hf(i, 2) * 256, r = 4 + hf(i, 3) * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); const l = hf(i, 4); gr.addColorStop(0, l > 0.5 ? 'rgba(255,225,140,0.35)' : 'rgba(90,55,10,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  FOIL = new THREE.CanvasTexture(c); FOIL.wrapS = FOIL.wrapT = THREE.RepeatWrapping; FOIL.colorSpace = THREE.SRGBColorSpace; FOIL.userData.keep = true;
  return FOIL;
}
function cellTex() {
  if (CELLS) return CELLS;
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#c9c9cc'; g.fillRect(0, 0, 128, 512);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 7 === 0 ? '#141b3a' : '#10173a'; g.fillRect(x * 16 + 1.5, y * 16 + 1.5, 13, 13); }
  CELLS = new THREE.CanvasTexture(c); CELLS.colorSpace = THREE.SRGBColorSpace; CELLS.anisotropy = 8; CELLS.userData.keep = true;
  return CELLS;
}

// ── DART ────────────────────────────────────────────────────────────────────────────────────────────────────────
// the model faces +Z (DRACO looks along +Z); arrays along X; the antenna on +Y. Returns {group, thruster(k)}
export function makeDart(ctx, o = {}) {
  const G = new THREE.Group(); G.name = 'dart';
  const foil = stdM({ map: foilTex(), color: 0xffffff, roughness: 0.32, metalness: 0.85, envMapIntensity: 1.2 });
  const white = stdM({ color: 0xe8e8e4, roughness: 0.5 }), dark = stdM({ color: 0x1a1b1f, roughness: 0.4, metalness: 0.5 }), alu = stdM({ color: 0xb6b8bc, roughness: 0.35, metalness: 0.8 });
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.3, 1.3), foil); bus.castShadow = bus.receiveShadow = true; G.add(bus);
  // RLSA: the flat round high-gain antenna on top; DRACO: the camera tube on the front; star trackers
  const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 40), white); rl.position.y = 0.7; rl.castShadow = true; G.add(rl);
  const draco = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 20).rotateX(Math.PI / 2), dark); draco.position.set(0.2, 0.25, 0.9); G.add(draco);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), stdM({ color: 0x2a3550, roughness: 0.05, metalness: 0.9 })); lens.position.set(0.2, 0.25, 1.18); G.add(lens);
  for (const s of [1, -1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.2), dark); st.position.set(s * 0.45, 0.55, -0.4); G.add(st); }
  // NEXT-C gridded ion thruster at the back
  const th = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.25, 24).rotateX(Math.PI / 2), alu); th.position.set(0, 0, -0.78); G.add(th);
  const grid = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), dark); grid.position.set(0, 0, -0.91); grid.rotation.y = Math.PI; G.add(grid);
  const plume = glowSprite([0.45, 0.6, 1.0], 20); plume.position.set(0, 0, -1.2); G.add(plume);
  // ROSA: two roll-out arrays, 8.5 x 2.3 m each, on short yokes; the blanket of cells, the booms, the end roll
  const cellM = stdM({ map: cellTex(), color: 0xffffff, roughness: 0.25, metalness: 0.4, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  for (const s of [1, -1]) {
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), alu); yoke.position.set(s * 0.92, 0, 0); G.add(yoke);
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.3).rotateX(-Math.PI / 2), cellM); bl.position.set(s * (1.22 + 4.25), 0, 0); bl.castShadow = bl.receiveShadow = true; G.add(bl);
    for (const z of [1.18, -1.18]) { const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 8.5, 6).rotateZ(Math.PI / 2), alu); bm.position.set(s * (1.22 + 4.25), 0.02, z); G.add(bm); }
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 12).rotateX(Math.PI / 2), white); roll.position.set(s * (1.22 + 8.55), 0.02, 0); roll.castShadow = true; G.add(roll);
  }
  G.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: G, thruster(k) { plume.material.uniforms.uI.value = k * 1.2; plume.material.uniforms.uS.value = 0.9; plume.material.uniforms.uMinPx.value = 6 * k; } };
}

async function buildDart(item, ctx) {
  const p = explicitParams(item, CATALOG['vehicle.dart']);
  const D = makeDart(ctx, p);
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'vehicle.dart';
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0, groundless = gy < -5000;
  const y0 = p.y != null ? +p.y : groundless ? 0 : gy + 12;
  root.position.set(at[0], y0, at[1]); root.add(D.group);
  const vel = Array.isArray(p.vel) ? new THREE.Vector3(...p.vel.map(Number)) : null;
  const to = Array.isArray(p.to) ? new THREE.Vector3(+p.to[0], +(p.to.length === 3 ? p.to[1] : y0), +(p.to.length === 3 ? p.to[2] : p.to[1])) : null;
  const tArr = num(p.t_arrive, ctx.dur || 8);
  const P0 = root.position.clone();
  const dir = new THREE.Vector3(); if (to) dir.copy(to).sub(P0).normalize(); else if (vel && vel.lengthSq() > 0) dir.copy(vel).normalize(); else dir.set(-Math.sin((item.heading ?? 180) * DEG), 0, Math.cos((item.heading ?? 180) * DEG)).negate();
  D.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.lengthSq() > 0 ? dir : new THREE.Vector3(0, 0, 1));
  const roll = num(p.roll, 4);
  const q0 = D.group.quaternion.clone(), qr = new THREE.Quaternion();
  const update = (t) => {
    if (to) root.position.lerpVectors(P0, to, clamp(t / Math.max(0.1, tArr)));
    else if (vel) root.position.copy(P0).addScaledVector(vel, t);
    qr.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll * DEG * t); D.group.quaternion.copy(q0).multiply(qr);
    D.thruster(p.thruster ? 1 : 0);
  };
  update(0);
  const center = () => root.getWorldPosition(new THREE.Vector3());
  return { root, radius: 9.9, height: 2.3, snapped: true, update, anchors: { body: D.group },
    planet: { key: 'dart', R: 5, obl: 1, center, st: null, body: D.group, ring: null, rings: null, spanR: 10 },
    subjectAt: () => { const c = center(); return [c.x, c.y, c.z]; }, subjectTop: 3, subjectCy: 0 };
}

// ── Didymos + Dimorphos (+ DART) ────────────────────────────────────────────────────────────────────────────────
function ringLine(r, col, opacity = 0.6, dash = false) {
  const n = 256, pts = new Float32Array((n + 1) * 3);
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts[i * 3] = Math.cos(a) * r; pts[i * 3 + 2] = Math.sin(a) * r; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const m = dash ? new THREE.LineDashedMaterial({ color: col, transparent: true, opacity, dashSize: r * 0.03, gapSize: r * 0.02, depthWrite: false }) : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity, depthWrite: false });
  const L = new THREE.Line(g, m); if (dash) L.computeLineDistances(); L.userData.noQA = true; L.renderOrder = 15;
  return L;
}
async function buildDidymos(item, ctx) {
  const p = explicitParams(item, CATALOG['space.didymos']);
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'space.didymos';
  root.position.set(at[0], num(p.y, 0), at[1]);
  const didy = makeAsteroid(ctx, { preset: 'didymos', seed: 17, detail: ctx.quality === 'draft' ? 5 : 6 });
  const dimo = makeAsteroid(ctx, { preset: 'dimorphos', seed: 23, detail: 5 });
  root.add(didy.group);
  const orbit = new THREE.Group(); orbit.rotation.x = num(p.tilt, 12) * DEG; root.add(orbit);
  const r0 = num(p.orbit, 1190), period0 = num(p.period, 24);          // screen seconds per orbit (real: 11 h 55 min)
  const tI = p.dart === false ? null : num(p.t_impact, 4);
  const k = num(p.exaggerate, 4);
  const dP = 33 / (11 * 60 + 55);                                      // the real period change (-4.6 %)
  const r1 = r0 * Math.pow(1 - dP * k, 2 / 3), period1 = period0 * (1 - dP * k);
  orbit.add(dimo.group);
  const oldRing = ringLine(r0, 0xe8e6de, 0.55), newRing = ringLine(r1, 0xd9a93f, 0.0);
  if (p.rings !== false) orbit.add(oldRing, newRing);
  // DART: comes in from `from` (az, el) at a screen speed so it arrives at Dimorphos at t_impact
  const dart = tI != null ? makeDart(ctx, {}) : null;
  if (dart) root.add(dart.group);
  const dFrom = p.from || {}, dDir = new THREE.Vector3(Math.sin(num(dFrom.az, 250) * DEG) * Math.cos(num(dFrom.el, 12) * DEG), Math.sin(num(dFrom.el, 12) * DEG), -Math.cos(num(dFrom.az, 250) * DEG) * Math.cos(num(dFrom.el, 12) * DEG));
  const vS = num(p.dart_speed, 90);                                    // m per screen second (real 6.1 km/s)
  const ang0 = num(p.phase, 0) * DEG;
  // the moonlet's angle: before the impact on the old orbit; after it, the tighter orbit (continuous angle, eased radius)
  const angAt = (t) => (tI == null || t <= tI ? ang0 + t / period0 * Math.PI * 2 : ang0 + tI / period0 * Math.PI * 2 + (t - tI) / period1 * Math.PI * 2);
  const radAt = (t) => (tI == null || t <= tI ? r0 : lerp(r0, r1, sm((t - tI) / 3)));
  const dimoPos = (t, out) => { const a = angAt(t), r = radAt(t); out.set(Math.cos(a) * r, 0, Math.sin(a) * r); return out; };
  const tmp = new THREE.Vector3(), hit = new THREE.Vector3();
  const plume = makePuffs(ctx, { count: 1400, tint: [0.62, 0.6, 0.57], near: 3, groundFade: 0, fog: 0, softK: 0.3, light: 1.3 });
  const sparks = makeSparks(ctx, { count: 600, maxPx: 3, minPx: 1 });
  orbit.add(plume.mesh, sparks.mesh);
  const flash = glowSprite([1, 0.95, 0.85], 26); orbit.add(flash);
  const qd = new THREE.Quaternion(), zAx = new THREE.Vector3(0, 0, 1);
  function update(t, clock, camera) {
    syncEnv(ctx);
    didy.update(t);
    dimoPos(t, tmp); dimo.group.position.copy(tmp); dimo.update(t * 0.5);
    newRing.material.opacity = tI != null ? 0.85 * sm((t - tI - 0.5) / 1.5) : 0;
    oldRing.material.opacity = 0.55 - (tI != null ? 0.3 * sm((t - tI - 1) / 2) : 0);
    // DART (in the orbit frame, like the moonlet): a straight line into Dimorphos's impact position
    if (dart) {
      dimoPos(tI, hit);
      const dt = tI - t;
      dart.group.visible = dt > 0.02;
      if (dart.group.visible) {
        tmp.copy(hit).addScaledVector(dDir, dt * vS + dimo.R * 1.1); orbit.localToWorld(tmp); root.worldToLocal(tmp);
        dart.group.position.copy(tmp);
        const dW = dDir.clone().applyQuaternion(orbit.quaternion).negate();
        dart.group.quaternion.copy(qd.setFromUnitVectors(zAx, dW));
        dart.thruster(0);
      }
    }
    // the impact: flash, then the ejecta cone (back along the incoming line) turning into a tail
    plume.begin(); sparks.begin();
    if (tI != null && t >= tI) {
      const dt = t - tI; dimoPos(tI, hit);
      const hp = dimoPos(t, new THREE.Vector3()).addScaledVector(dDir, dimo.R * 0.95);
      flash.position.copy(hp); flash.material.uniforms.uS.value = dimo.R * 6; flash.material.uniforms.uMinPx.value = 20; flash.material.uniforms.uI.value = 3 * Math.exp(-dt / 0.15) + 0.2 * Math.exp(-dt / 1.5);
      const e1 = new THREE.Vector3().crossVectors(dDir, new THREE.Vector3(0, 1, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(e1, dDir).normalize();
      for (let i = 0; i < 1300; i++) {
        const tl = hf(i, 1) * Math.min(dt, 3), age = dt - tl; if (age < 0) continue;
        const cone = (35 + 25 * hf(i, 2)) * DEG, a = hf(i, 3) * Math.PI * 2, v = (8 + 45 * Math.pow(hf(i, 4), 2)) * (1 - tl / 4);
        const ray = hf(i, 9) < 0.5 ? Math.floor(hf(i, 10) * 9) / 9 * Math.PI * 2 : a;          // filaments (the rays in the LICIACube images)
        const dx = Math.cos(ray) * Math.sin(cone), dy = Math.sin(ray) * Math.sin(cone), dz = Math.cos(cone);
        const d = age * v, pushTail = age * age * 4;                   // later: sunlight pushes the dust into a tail (+X)
        const x = hp.x + (e1.x * dx + e2.x * dy + dDir.x * dz) * d + pushTail, y = hp.y + (e1.y * dx + e2.y * dy + dDir.y * dz) * d, z = hp.z + (e1.z * dx + e2.z * dy + dDir.z * dz) * d;
        const size = (4 + 10 * hf(i, 5)) * (0.4 + age * 0.4);
        plume.push(x, y, z, size, hf(i, 6) * 6.28, 0.5 * sstep(0, 0.15, age) * (1 - sstep(8, 16, age)), i & 3, -1e9, 0.9, 0, 0.6 * Math.exp(-age / 0.3), 0, clamp(0.4 + age * 0.08), 0.9, hf(i, 7));
        if (i < 500) sparks.push(x, y, z, 3 * Math.exp(-age / 0.6), 2.2 * Math.exp(-age / 0.6), 1.4 * Math.exp(-age / 0.6), 0.6);
      }
    } else flash.material.uniforms.uI.value = 0;
    plume.end(camera); sparks.end();
  }
  update(0, 0, null);
  const center = () => root.getWorldPosition(new THREE.Vector3());
  const dimoAnchor = new THREE.Object3D(); dimo.group.add(dimoAnchor);
  return {
    root, radius: r0 * 1.1, height: didy.R * 2, snapped: true, update, flashAt: (t) => (tI != null && t >= tI ? clamp(Math.exp(-(t - tI) / 0.15) - 0.05) : 0),
    anchors: { dimorphos: dimoAnchor, didymos: didy.group, dart: dart ? dart.group : null },
    planet: { key: 'didymos', R: r0 * 0.75, obl: 1, center, st: null, body: didy.mesh, ring: null, rings: null, spanR: r0 * 1.1 },
    subjectAt: () => { const c = center(); return [c.x, c.y, c.z]; }, subjectTop: r0, subjectCy: 0,
    cues: tI != null ? [{ t: tI, sound: 'dart_impact_flash', note: 'silent in space: use a musical hit' }] : [],
  };
}

// ── observatory ─────────────────────────────────────────────────────────────────────────────────────────────────
async function buildObservatory(item, ctx) {
  const p = explicitParams(item, CATALOG['structure.observatory']);
  const at = item.at || [0, 0];
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  const root = new THREE.Group(); root.name = 'structure.observatory'; root.position.set(at[0], gy, at[1]);
  const Rd = num(p.radius, 6), Hw = num(p.wall, 5);
  const white = stdM({ color: 0xe9e9e6, roughness: 0.45, metalness: 0.2 }), concrete = stdM({ color: 0xb8b4ac, roughness: 0.9 }), dark = stdM({ color: 0x101114, roughness: 0.6 }), steel = stdM({ color: 0x5a6068, roughness: 0.5, metalness: 0.6 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(Rd, Rd, Hw, 48), concrete); wall.position.y = Hw / 2; wall.castShadow = wall.receiveShadow = true; root.add(wall);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.1), dark); door.position.set(0, 1.05, Rd + 0.02); root.add(door);
  // the dome turns to az; the slit is a gap in it (two quarter-shells leave a 1/7 opening) + shutter track
  const domeG = new THREE.Group(); domeG.position.y = Hw; root.add(domeG);
  const slitW = 0.45;                                                  // radians of opening
  const shell = new THREE.Mesh(new THREE.SphereGeometry(Rd * 1.02, 48, 24, Math.PI / 2 + slitW / 2, Math.PI * 2 - slitW, 0, Math.PI / 2), white); shell.castShadow = shell.receiveShadow = true; domeG.add(shell);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(Rd * 0.99, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), stdM({ color: 0x2a2c30, roughness: 0.9, side: THREE.BackSide })); domeG.add(inner);
  for (const s of [1, -1]) { const rib = new THREE.Mesh(new THREE.TorusGeometry(Rd * 1.02, 0.08, 6, 48, Math.PI / 2), steel); rib.rotation.set(0, Math.PI / 2 + s * slitW / 2, 0); rib.rotation.order = 'YXZ'; domeG.add(rib); }
  // the telescope: a pier, a fork, an open truss tube pointing through the slit
  const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, Hw * 0.7, 16), concrete); pier.position.y = Hw * 0.35; root.add(pier);
  const tele = new THREE.Group(); tele.position.y = Hw * 0.75; root.add(tele);
  const tube = new THREE.Group(); tele.add(tube);
  const L = Rd * 1.1;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, L, 6), steel); tr.position.set(Math.cos(a) * 0.55, L * 0.3, Math.sin(a) * 0.55); tube.add(tr); }
  for (const y of [-0.2, L * 0.8]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 8, 32).rotateX(Math.PI / 2), white); ring.position.y = y; tube.add(ring); }
  const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.15, 32), dark); mirror.position.y = -0.3; tube.add(mirror);
  const az = num(p.az, 180), el = clamp(num(p.el, 45), 10, 89);
  domeG.rotation.y = Math.PI - az * DEG;
  tele.rotation.y = Math.PI - az * DEG; tube.rotation.x = (90 - el) * DEG;
  // a dim red night lamp inside + the slit glow
  const lamp = new THREE.PointLight(0xff3020, 1.2, 14, 2); lamp.position.set(0, 1.5, 0); root.add(lamp);
  // optional laser: the lunar laser-ranging beam (a thin green additive cylinder up to `laser_len`)
  let beam = null;
  if (p.laser) {
    const len = num(p.laser_len, 30000);
    const bg = new THREE.CylinderGeometry(0.3, 6, len, 12, 1, true); bg.translate(0, len / 2, 0);
    beam = new THREE.Mesh(bg, new THREE.ShaderMaterial({ uniforms: { uI: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
      fragmentShader: '#include <logdepthbuf_pars_fragment>\nvarying float vY; uniform float uI; void main(){\n#include <logdepthbuf_fragment>\n gl_FragColor = vec4(vec3(0.2, 1.0, 0.35) * (0.6 * (1.0 - vY) + 0.08) * uI, 1.0); }' }));
    beam.position.set(0, Hw * 0.75, 0); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), -Math.cos(az * DEG) * Math.cos(el * DEG)));
    beam.userData.noQA = true; beam.frustumCulled = false; root.add(beam);
  }
  const update = (t) => { if (beam) beam.material.uniforms.uI.value = 0.85 + 0.15 * Math.sin(t * 20); };
  return { root, radius: Rd * 1.05, height: Hw + Rd, snapped: true, update, anchors: { slit: domeG, door: door }, footprint: [Rd * 2, Rd * 2], farNeed: p.laser ? num(p.laser_len, 30000) + 5000 : 0 };
}

// ── discovery screen ────────────────────────────────────────────────────────────────────────────────────────────
async function buildDiscovery(item, ctx) {
  const p = explicitParams(item, CATALOG['detail.discovery_screen']);
  const at = item.at || [0, 0];
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  const root = new THREE.Group(); root.name = 'detail.discovery_screen';
  root.position.set(at[0], gy + num(p.y, 0.75), at[1]); root.rotation.y = Math.PI - (item.heading ?? 180) * DEG;
  const W = 0.62, H = 0.36;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, H + 0.04, 0.035), stdM({ color: 0x15161a, roughness: 0.4 })); frame.position.y = 0.3 + H / 2; root.add(frame);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), stdM({ color: 0x2a2c30, roughness: 0.5 })); stand.position.y = 0.15; root.add(stand);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.18), stdM({ color: 0x2a2c30, roughness: 0.5 })); root.add(base);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.7), stdM({ color: 0x6d5a45, roughness: 0.7 })); desk.position.set(0, -0.02, 0.1); root.add(desk);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 594; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.set(0, 0.3 + H / 2, 0.019); root.add(scr);
  const stars = []; for (let i = 0; i < 260; i++) stars.push([hf(i, 1) * 1024, hf(i, 2) * 520 + 40, 0.5 + 2.5 * Math.pow(hf(i, 3), 4)]);
  const name = String(p.name || '2008 TC3'), blink = num(p.blink, 0.6);
  let lastK = -1;
  const draw = (k, mark) => {
    g.fillStyle = '#030406'; g.fillRect(0, 0, 1024, 594);
    for (const [x, y, r] of stars) { g.fillStyle = `rgba(230,235,245,${Math.min(1, 0.4 + r / 3)})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    const mx = 420 + k * 38, my = 300 - k * 14;                        // the moving rock: shifts between the four exposures
    g.fillStyle = '#f2f2e8'; g.beginPath(); g.arc(mx, my, 2.6, 0, 6.283); g.fill();
    if (mark) { g.strokeStyle = '#d9a93f'; g.lineWidth = 3; g.beginPath(); g.arc(mx, my, 22, 0, 6.283); g.stroke(); }
    g.fillStyle = '#10141a'; g.fillRect(0, 0, 1024, 36); g.fillStyle = '#9fb3c8'; g.font = '20px monospace';
    g.fillText(`FRAME ${k + 1}/4   RA 22h 47m   DEC +18°   ${name}`, 16, 25);
    if (mark) { g.fillStyle = '#d9a93f'; g.fillText('NEW OBJECT - MOVING', 740, 25); }
    tex.needsUpdate = true;
  };
  const tMark = num(p.t_mark, 2);
  const update = (t) => { const k = Math.floor(t / blink) % 4, key = k + (t >= tMark ? 10 : 0); if (key !== lastK) { lastK = key; draw(k, t >= tMark); } };
  update(0);
  root.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  return { root, radius: 0.8, height: 0.8, snapped: true, update, anchors: { screen: scr }, footprint: [1.4, 0.7] };
}

export const CATALOG = {
  'vehicle.dart': {
    desc: 'NASA\'s DART spacecraft at true size: a gold-foil bus about the size of a vending machine, two 8.5 m roll-out solar arrays (ROSA) with their end rolls, the flat round RLSA antenna, the DRACO camera, the NEXT-C ion thruster; flies `to` a point (arriving at t_arrive) or along `vel`, rolls slowly. Use in space (world biome space); for the impact use space.didymos with dart',
    actions: ['fly'],
    params: { to: '[x, y, z] | [x, z]', t_arrive: 's', vel: '[vx, vy, vz] m/s', roll: 'deg/s', thruster: 'bool (blue ion glow)', y: 'm' },
    footprint: [19.6, 2.3], height: 2.3, snap: false, fly: true, tags: ['space', 'spacecraft', 'dart', 'nasa', 'probe', 'planetary defence'],
  },
  'space.didymos': {
    desc: 'the DART target: Didymos (780 m spinning-top rubble pile) with its moonlet Dimorphos (151 m) circling on a 1.19 km orbit drawn as a thin ring; with DART (default) the spacecraft comes in and hits Dimorphos at t_impact: the flash, an ejecta cone with filaments that turns into a tail, and the NEW tighter orbit ring in mustard (period 11 h 55 -> 11 h 22 min, the shift exaggerated x`exaggerate` so it reads). Camera: orbit_planet / approach on it (sized to the orbit), or keys on objects:N.dimorphos',
    actions: ['orbit', 'impact'],
    params: { t_impact: 's (dart false = no spacecraft)', dart: 'bool', from: '{az, el} DART comes from', dart_speed: 'm per screen s (90)', period: 'screen s per orbit (24)', orbit: 'm (1190)', tilt: 'deg', phase: 'deg', exaggerate: 'x the orbit change (4)', rings: 'bool', y: 'm' },
    footprint: [2600, 2600], height: 800, snap: false, fly: true, tags: ['space', 'asteroid', 'didymos', 'dimorphos', 'dart', 'binary', 'moonlet', 'planetary defence', 'orbit'],
  },
  'structure.observatory': {
    desc: 'an astronomical observatory: a white dome on a round concrete wall, the slit open toward az/el, the open-truss telescope inside pointing through it, a red night lamp; laser true = the green lunar-laser-ranging beam shooting up to the Moon (Apollo mirrors). Night hill-top scenes (look night, a starfield sky)',
    actions: ['idle', 'observe'],
    params: { az: 'deg the slit faces', el: 'deg the telescope points', radius: 'm (6)', wall: 'm (5)', laser: 'bool', laser_len: 'm' },
    footprint: [12, 12], height: 11, tags: ['structure', 'observatory', 'telescope', 'dome', 'astronomy', 'night', 'laser', 'planetary defence', 'discovery'],
  },
  'detail.discovery_screen': {
    desc: 'insert: the moment a new asteroid is spotted — a monitor on a desk blinking four exposures of a star field, one faint dot moving between them, circled in mustard at t_mark with "NEW OBJECT - MOVING" (Catalina Sky Survey style). Film it with keys + limits macro at 0.6-1 m',
    actions: ['blink'],
    params: { name: 'label text (2008 TC3)', blink: 's per frame (0.6)', t_mark: 's the circle appears', y: 'm desk height (0.75)' },
    footprint: [1.4, 0.7], height: 0.8, tags: ['detail', 'insert', 'screen', 'discovery', 'telescope', 'asteroid', 'astronomer', 'monitor'],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'vehicle.dart') return buildDart(item, ctx);
  if (kind === 'structure.observatory') return buildObservatory(item, ctx);
  if (kind === 'detail.discovery_screen') return buildDiscovery(item, ctx);
  return buildDidymos(item, ctx);
}
