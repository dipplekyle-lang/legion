// firebase.js — a MILITARY BASE CAMP (E1 specificity kit, 2026-09-29): the base the narration puts "squarely above"
// the tunnels. Olive GP tents in rows, sandbag bunkers and walls, a timber watchtower with a sandbagged platform,
// concertina wire on pickets round a cleared dirt perimeter, 2½-ton trucks and jeeps (the vehicles kit), a flagpole.
//   { "kind": "landmark.firebase", "at": [0, 0], "heading": 180, "size": 34, "tents": 6, "trucks": 3, "jeeps": 1 }
// It sits on any world (jungle, plains, farmland): the dirt clearing follows the terrain. Anchors: tower, gate, tents, center.
import * as THREE from 'three';
import { plain } from '../shared/materials.js';
import { ground, xz, yawFromHeading, patchAll } from './common.js';
import * as vehicles from './vehicles.js';
import { clamp, lerp } from '../shared/util.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const M = {};
function mat(k) {
  if (M[k]) return M[k];
  const P = { canvas: { color: 0x59603D, roughness: 0.96, side: THREE.DoubleSide }, canvasD: { color: 0x474D31, roughness: 0.97, side: THREE.DoubleSide }, bag: { color: 0x8A7A58, roughness: 0.95 },
    bagD: { color: 0x6E6246, roughness: 0.95 }, timber: { color: 0x6A5236, roughness: 0.85 }, tin: { color: 0x8C8C86, roughness: 0.55, metalness: 0.6 }, wire: { color: 0x7C7C78, roughness: 0.5, metalness: 0.7 },
    dirt: { color: 0x9A7652, roughness: 1 }, pole: { color: 0xD8D6CE, roughness: 0.5 }, flag: { color: 0x9A2A2A, roughness: 0.8, side: THREE.DoubleSide } }[k];
  return (M[k] = plain({ ...P }));
}
function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, typeof m === 'string' ? mat(m) : m); o.castShadow = cast; o.receiveShadow = true; return o; }

// a GP medium tent (5 x 10 m, ridge 3 m, walls 1.5 m): a sagging canvas roof over a ridge, side walls, end walls, guy ropes
function tent(L = 9.8, W = 5.2, Hr = 3.0, Hw = 1.5) {
  const G = new THREE.Group(); G.name = 'gp_tent';
  const roof = (s) => {
    const n = 20, m = 8, pos = [], idx = [];
    for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
      const z = -L / 2 + L * i / n, u = j / m, x = s * (W / 2) * u, y = Hr - (Hr - Hw) * u - 0.08 * Math.sin(PI * u) * (0.6 + 0.4 * Math.abs(Math.sin(z * 1.9)));
      pos.push(x, y, z);
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, b = a + 1, c = a + m + 1, d = c + 1; if (s > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  G.add(mesh(roof(1), 'canvas'), mesh(roof(-1), 'canvas'));
  for (const s of [1, -1]) { const w = mesh(new THREE.PlaneGeometry(L, Hw), 'canvasD'); w.position.set(s * W / 2, Hw / 2, 0); w.rotation.y = s * PI / 2; G.add(w); }
  const end = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, Hw), new THREE.Vector2(0, Hr), new THREE.Vector2(-W / 2, Hw)]);
  for (const s of [1, -1]) { const e = mesh(new THREE.ShapeGeometry(end), 'canvasD'); e.position.z = s * L / 2; G.add(e); }
  // the door flap rolled up on the front end: a dark opening
  const door = mesh(new THREE.PlaneGeometry(1.1, 1.9), plain({ color: 0x15170F, roughness: 1 }), false); door.position.set(0, 0.95, L / 2 + 0.01); G.add(door);
  G.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8).rotateZ(PI / 2), 'canvasD').translateY(2.0).translateZ(L / 2 + 0.05));
  // guy ropes + stakes along the sides
  const rope = new THREE.MeshLambertMaterial({ color: 0x9C8A64 });
  for (let i = 0; i < 5; i++) for (const s of [1, -1]) {
    const z = -L / 2 + 0.6 + (L - 1.2) * i / 4, a = V3(s * W / 2, Hw, z), b = V3(s * (W / 2 + 1.3), 0.02, z);
    G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, 0.008, 4), rope));
    G.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), 'timber').translateX(b.x).translateY(0.1).translateZ(b.z));
  }
  return G;
}
// sandbags: instanced, along a polyline, `rows` high, staggered courses
function sandbags(pts, rows, out, M4 = new THREE.Matrix4()) {
  for (let r = 0; r < rows; r++) for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 0.52)), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5 + (r % 2) * 0.5) / n; if (u > 1) continue;
      const x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u), j = out.length;
      M4.compose(V3(x + (hash(j, 1) - 0.5) * 0.03, 0.08 + r * 0.14, z + (hash(j, 2) - 0.5) * 0.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + PI / 2 + (hash(j, 3) - 0.5) * 0.12, (hash(j, 4) - 0.5) * 0.06)), V3(1, 1, 1));
      out.push(M4.clone());
    }
  }
  return out;
}
function bagMesh(list, m) {
  const g = new THREE.CapsuleGeometry(0.1, 0.32, 3, 8); g.rotateZ(PI / 2); g.scale(1, 0.62, 1.35);
  const im = new THREE.InstancedMesh(g, mat(m), list.length); list.forEach((M4, i) => im.setMatrixAt(i, M4)); im.castShadow = true; im.receiveShadow = true;
  return im;
}
function watchtower(h = 6.5) {
  const G = new THREE.Group(); G.name = 'watchtower';
  const b = 1.4, t = 1.0;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const p = mesh(new THREE.CylinderGeometry(0.1, 0.12, h + 0.2, 8), 'timber'); const top = V3(sx * t, h, sz * t), bot = V3(sx * b, 0, sz * b); p.position.copy(top.clone().add(bot).multiplyScalar(0.5)); p.quaternion.setFromUnitVectors(V3(0, 1, 0), top.clone().sub(bot).normalize()); G.add(p); }
  for (const y of [1.6, 3.4, 5.0]) { const k = lerp(b, t, y / h); for (const [ax, az, len, ry] of [[0, k, 2 * k, 0], [0, -k, 2 * k, 0], [k, 0, 2 * k, PI / 2], [-k, 0, 2 * k, PI / 2]]) { const r = mesh(new THREE.BoxGeometry(len, 0.1, 0.08), 'timber'); r.position.set(ax, y, az); r.rotation.y = ry; G.add(r); } }
  // X braces on two faces
  for (const sz of [1, -1]) for (const d of [1, -1]) { const a = V3(-b * d * 0.95, 0.4, sz * b * 0.95), c = V3(t * d * 0.95, h - 0.6, sz * t * 0.95); const r = mesh(new THREE.BoxGeometry(0.07, a.distanceTo(c), 0.07), 'timber'); r.position.copy(a.clone().add(c).multiplyScalar(0.5)); r.quaternion.setFromUnitVectors(V3(0, 1, 0), c.clone().sub(a).normalize()); G.add(r); }
  const plat = mesh(new THREE.BoxGeometry(2.8, 0.14, 2.8), 'timber'); plat.position.y = h; G.add(plat);
  const bags = []; const s = 1.3; sandbags([[-s, -s], [s, -s], [s, s], [-s, s], [-s, -s]], 4, bags);
  const bm = bagMesh(bags, 'bag'); bm.position.y = h + 0.07; G.add(bm);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) G.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6), 'timber').translateX(sx * 1.3).translateY(h + 0.95).translateZ(sz * 1.3));
  const roof = mesh(new THREE.ConeGeometry(2.3, 0.7, 4, 1).rotateY(PI / 4), 'tin'); roof.position.y = h + 2.2; G.add(roof);
  const ladder = mesh(new THREE.BoxGeometry(0.5, h, 0.06), plain({ color: 0x5E4830, roughness: 0.9, transparent: false })); ladder.position.set(0, h / 2, b + 0.15); ladder.rotation.x = -0.12; G.add(ladder);
  return G;
}
// concertina wire: a helix of wire along a polyline, on pickets
function concertina(pts) {
  const G = new THREE.Group(); G.name = 'concertina';
  const wm = mat('wire'), R = 0.42;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = V3(pts[k][0], 0, pts[k][1]), b = V3(pts[k + 1][0], 0, pts[k + 1][1]), L = a.distanceTo(b), dir = b.clone().sub(a).normalize(), side = V3(-dir.z, 0, dir.x);
    const turns = Math.round(L / 0.22), hp = [];
    for (let i = 0; i <= turns * 12; i++) { const u = i / (turns * 12), ang = u * turns * TAU; hp.push(a.clone().addScaledVector(dir, u * L).addScaledVector(side, Math.cos(ang) * R).add(V3(0, R + 0.02 + Math.sin(ang) * R, 0))); }
    G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), hp.length * 2, 0.006, 4), wm));
    for (let i = 0; i <= Math.floor(L / 3); i++) { const p = a.clone().addScaledVector(dir, Math.min(L, i * 3)); G.add(mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), 'wire').translateX(p.x).translateY(0.5).translateZ(p.z)); }
  }
  return G;
}
function clearing(G, R, root, ground) {
  // a dirt disc that follows the terrain (built in world space under the root's transform)
  const n = 36, m = 8, pos = [], idx = [], uv = [];
  root.updateMatrixWorld(true);
  const w = V3();
  for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, r = R * (j / m) * (1 + 0.06 * Math.sin(a * 5 + 1.3) * (j / m));
    w.set(Math.cos(a) * r, 0, Math.sin(a) * r); root.localToWorld(w);
    const y = ground.h(w.x, w.z) - root.position.y + 0.035;
    pos.push(Math.cos(a) * r, y, Math.sin(a) * r); uv.push(Math.cos(a) * r / 8, Math.sin(a) * r / 8);
  }
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const cl = mesh(g, 'dirt', false); cl.name = 'clearing'; cl.userData.noQA = true; G.add(cl);
}

export const CATALOG = {
  'landmark.firebase': {
    desc: 'a MILITARY BASE CAMP / firebase (Vietnam 1966, also Korea, WW2): olive GP tents in rows on a cleared dirt compound, sandbag bunkers and walls, a timber watchtower with a sandbagged platform and a tin roof, concertina wire on pickets round the perimeter with a gate, 2½-ton trucks and jeeps parked, a flagpole. Put it on a jungle / plains world; a tunnel network under it: interior.crawl_tunnel scenes, trap.* and prop.trapdoor inside the compound',
    params: { at: '[x, z] the compound centre', heading: 'deg: the gate faces it', size: 'm (34) the compound diameter', tents: 'n (6)', trucks: 'n (3)', jeeps: 'n (1)', wire: 'true', tower: 'true', flag: 'true' },
    footprint: [34, 34], height: 9, anchors: ['tower', 'gate', 'tents', 'center'], tags: ['landmark', 'base', 'camp', 'firebase', 'military', 'army', 'vietnam', 'tents', 'sandbags', 'wire', 'watchtower', 'trucks', 'compound'],
  },
};
export async function build(kind, item = {}, ctx = {}) {
  const Gd = ground(ctx), at = xz(item.at), y = Gd.h(at[0], at[1]);
  const root = new THREE.Group(); root.name = kind; root.position.set(at[0], y, at[1]);
  root.rotation.y = yawFromHeading(item.heading ?? 180);
  const G = new THREE.Group(); root.add(G);
  const R = num(item.size, 34) / 2, nT = Math.round(clamp(num(item.tents, 6), 0, 12)), nTr = Math.round(clamp(num(item.trucks, 3), 0, 6)), nJ = Math.round(clamp(num(item.jeeps, 1), 0, 4));
  clearing(G, R + 2, root, Gd);
  const hAt = (x, z) => { const w = V3(x, 0, z); root.updateMatrixWorld(true); root.localToWorld(w); return Gd.h(w.x, w.z) - root.position.y; };
  // tents in two rows along the compound's back half
  const tents = new THREE.Group(); G.add(tents);
  for (let i = 0; i < nT; i++) { const row = i % 2, k = Math.floor(i / 2), x = -R * 0.55 + k * 7.2, z = -R * 0.52 + row * 10.8; const t = tent(); t.position.set(x, hAt(x, z), z); t.rotation.y = row ? PI : 0; tents.add(t); }
  // sandbag bunkers (two) and a wall along the gate side
  const bags = [], dark = [];
  for (const [cx, cz] of [[R * 0.55, -R * 0.35], [-R * 0.6, R * 0.5]]) { const s = 1.6; sandbags([[cx - s, cz - s], [cx + s, cz - s], [cx + s, cz + s], [cx - 0.6, cz + s]], 6, bags); }
  sandbags([[-R * 0.45, R * 0.86], [-3, R * 0.9]], 4, dark); sandbags([[3, R * 0.9], [R * 0.45, R * 0.86]], 4, dark);
  const bmA = bagMesh(bags, 'bag'), bmB = bagMesh(dark, 'bagD'); G.add(bmA, bmB);
  // settle the bags on the terrain (per instance)
  for (const im of [bmA, bmB]) { const M4 = new THREE.Matrix4(), p = V3(), q = new THREE.Quaternion(), s = V3(); for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, M4); M4.decompose(p, q, s); p.y += hAt(p.x, p.z); M4.compose(p, q, s); im.setMatrixAt(i, M4); } im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  // bunker roofs: timber + a layer of bags
  for (const [cx, cz] of [[R * 0.55, -R * 0.35], [-R * 0.6, R * 0.5]]) { const r = mesh(new THREE.BoxGeometry(3.8, 0.2, 3.8), 'timber'); r.position.set(cx, hAt(cx, cz) + 0.95, cz); G.add(r); const top = mesh(new THREE.BoxGeometry(3.6, 0.22, 3.6), 'bag'); top.position.set(cx, hAt(cx, cz) + 1.16, cz); G.add(top); }
  // watchtower at a corner
  const anchors = {};
  if (item.tower !== false) { const tw = watchtower(); const tx = R * 0.72, tz = R * 0.62; tw.position.set(tx, hAt(tx, tz), tz); G.add(tw); const a = new THREE.Object3D(); a.position.set(0, 7.2, 0); tw.add(a); anchors.tower = a; }
  // concertina wire round the perimeter, a gate gap at +Z
  if (item.wire !== false) {
    const pts = []; for (let i = 0; i <= 28; i++) { const a = PI / 2 + 0.16 + (TAU - 0.32) * i / 28; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
    const cw = concertina(pts); G.add(cw);
    cw.traverse((o) => { if (o.isMesh) { const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) P.setY(i, P.getY(i) + hAt(P.getX(i), P.getZ(i))); P.needsUpdate = true; o.geometry.computeBoundingSphere(); } });
  }
  const gate = new THREE.Object3D(); gate.position.set(0, 1.5, R); G.add(gate); anchors.gate = gate;
  // flagpole
  if (item.flag !== false) { const fx = 0, fz = R * 0.2; G.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 9, 8), 'pole').translateX(fx).translateY(hAt(fx, fz) + 4.5).translateZ(fz)); }
  // trucks and jeeps (the vehicles kit), parked in a row near the gate, facing out
  const parts = [];
  for (let i = 0; i < nTr + nJ; i++) {
    const kindV = i < nTr ? 'vehicle.truck_ww2' : 'vehicle.jeep', x = -R * 0.5 + i * 4.2, z = R * 0.6;
    root.updateMatrixWorld(true); const w = V3(x, 0, z); root.localToWorld(w);
    try {
      const hd = ((item.heading ?? 180) + 360) % 360;
      const v = await vehicles.build(kindV, { kind: kindV, at: [w.x, w.z], heading: hd, action: 'idle', load: i % 2 ? 'canvas' : 'empty', seed: 11 + i, params: {} }, ctx);
      if (v && v.root) { if (v.root.parent) v.root.parent.remove(v.root); ctx.scene ? ctx.scene.add(v.root) : root.add(v.root); if (v.update) parts.push(v.update); }
    } catch (e) { (ctx.warnings || []).push('firebase vehicle: ' + String(e).slice(0, 120)); }
  }
  anchors.tents = tents; anchors.center = G;
  patchAll(root, ctx);
  return { root, radius: R + 2, height: 9, anchors, update: (t) => { for (const f of parts) f(t, t); }, footprint: [2 * R, 2 * R], contact: false };
}
