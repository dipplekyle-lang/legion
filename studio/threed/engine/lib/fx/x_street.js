// x_street.js — E5 (explosions, 30 Sep 2026): the hook's neighbours (beats 007-008)
//   landmark.balconies  the apartment block across the street: a plaster façade with balconies on every floor, and on
//                       them faceless white mannequin neighbours, most holding a phone up (its screen glowing), all
//                       turned towards `look_at` (the port)
import * as THREE from 'three';
import { num, clamp, hf, headingYaw, DEG } from './x_common.js';
import { patchMaterial } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';

const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));

function facadeTex(base) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.035)`; g.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 8, 2 + Math.random() * 5); }
  g.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function buildBalconies(item, ctx) {
  const p = explicitParams(item, CATALOG['landmark.balconies']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'landmark.balconies';
  root.position.set(at[0], G.height(at[0], at[1]), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);   // the façade faces the heading
  const floors = Math.round(clamp(num(p.floors, 6), 2, 14)), bays = Math.round(clamp(num(p.bays, 6), 2, 14)), FH = 3.1, BW = 4.6;
  const W = bays * BW, H = floors * FH + 1.2, D = 12;
  const plaster = stdM({ map: facadeTex(p.color || '#d9cfbb'), roughness: 0.92 }); plaster.map.repeat.set(W / 8, H / 8);
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), plaster); body.position.set(0, H / 2, -D / 2); body.castShadow = body.receiveShadow = true; root.add(body);
  const slabM = stdM({ color: 0xcfc6b4, roughness: 0.9 }), railM = stdM({ color: 0x3b3d40, metalness: 0.6, roughness: 0.45 });
  const glassM = stdM({ color: 0x1d2328, roughness: 0.15, metalness: 0.3 }), frameM = stdM({ color: 0xe9e6de, roughness: 0.6 });
  const awnM = [0x2f6b4f, 0xb7462f, 0xd9b24a, 0x3a5f8a].map((c) => stdM({ color: c, roughness: 0.85, side: THREE.DoubleSide }));
  const box = (w, h, d, m, x, y, z, parent = root) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
  // the balconies: a slab, a parapet of thin rails, the balcony door behind (dark glass in a white frame), some awnings
  const occ = clamp(num(p.people, 0.85), 0, 1), phoneK = clamp(num(p.phones, 0.7), 0, 1), spots = [], bars = [];
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const x = -W / 2 + (b + 0.5) * BW, y = 1.2 + f * FH, k = f * 31 + b * 7;
    box(1.9, 2.3, 0.06, glassM, x, y + 1.15, 0.01); box(2.0, 0.08, 0.1, frameM, x, y + 2.34, 0.03); box(0.08, 2.3, 0.1, frameM, x - 0.98, y + 1.15, 0.03); box(0.08, 2.3, 0.1, frameM, x + 0.98, y + 1.15, 0.03);
    if (f === 0) continue;                                            // the ground floor: shop fronts, no balcony
    box(BW - 0.5, 0.16, 1.5, slabM, x, y - 0.08, 0.75);
    box(BW - 0.5, 0.05, 0.05, railM, x, y + 1.02, 1.47); box(0.05, 1.02, 1.5, railM, x - (BW - 0.5) / 2, y + 0.51, 0.75); box(0.05, 1.02, 1.5, railM, x + (BW - 0.5) / 2, y + 0.51, 0.75);
    for (let r = 0; r < 14; r++) bars.push([x - (BW - 0.6) / 2 + r * (BW - 0.6) / 13, y + 0.5, 1.47]);
    if (hf(k, 3) < 0.3) { const aw = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.6, 1.5), awnM[Math.floor(hf(k, 4) * 4)]); aw.position.set(x, y + 2.55, 0.62); aw.rotation.x = -0.62; aw.castShadow = true; root.add(aw); }
    const n = hf(k, 5) < occ ? (hf(k, 6) < 0.45 ? 2 : 1) : 0;
    for (let j = 0; j < n; j++) spots.push({ x: x + (n === 2 ? (j ? 0.75 : -0.75) : (hf(k, 7) - 0.5) * 1.2), y, z: 0.85 + 0.25 * hf(k + j, 8), phone: hf(k + j, 9) < phoneK, k: k + j * 101 });
  }
  box(W + 0.4, 0.5, D + 0.4, slabM, 0, H + 0.25, -D / 2);                 // the roof edge
  const barIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 1.0, 0.022), railM, Math.max(1, bars.length)); barIM.castShadow = true;
  bars.forEach((b, i) => barIM.setMatrixAt(i, new THREE.Matrix4().makeTranslation(b[0], b[1], b[2]))); barIM.count = bars.length; root.add(barIM);
  // the neighbours: faceless white mannequins (instanced): torso, head, the phone arm raised (screen glowing) or arms down
  const la = Array.isArray(p.look_at) ? p.look_at.map(Number) : null;
  const skin = stdM({ color: 0xcfc9bf, roughness: 0.55 }), shirtC = [0x9fb6cf, 0xd9d4c8, 0x6b7f96, 0xb58f6a, 0x8f9f7a, 0x5b5b66];
  const N = spots.length;
  const torso = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), stdM({ color: 0xffffff, roughness: 0.85 }), N);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 14, 10).scale(1, 1.22, 1.05), skin, N);
  const armG = new THREE.CapsuleGeometry(0.045, 0.5, 3, 8), armU = new THREE.InstancedMesh(armG, skin, N * 2);
  const legs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.14, 0.42, 4, 10).scale(1.15, 1, 0.8), stdM({ color: 0x55595f, roughness: 0.85 }), N);
  const phone = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.15, 0.012), stdM({ color: 0x1a1b1e, roughness: 0.3, metalness: 0.4 }), N);
  const scr = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.9) }), N);
  for (const m of [torso, head, armU, phone, legs]) { m.castShadow = true; m.receiveShadow = true; root.add(m); }
  root.add(scr);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), E = new THREE.Euler(0, 0, 0, 'YXZ'), col = new THREE.Color();
  const wInv = new THREE.Matrix4(); root.updateMatrixWorld(true); wInv.copy(root.matrixWorld).invert();
  let na = 0, np = 0;
  spots.forEach((s, i) => {
    // the figure's yaw (local): towards look_at, else straight out of the façade (+Z), with a little scatter
    let yaw = (hf(s.k, 11) - 0.5) * 0.5;
    if (la) { const v = new THREE.Vector3(la[0], 0, la[1]).applyMatrix4(wInv); yaw = Math.atan2(v.x - s.x, v.z - s.z) + (hf(s.k, 11) - 0.5) * 0.25; }
    const cy = Math.cos(yaw), sy = Math.sin(yaw), loc = (dx, dy, dz) => P.set(s.x + dx * cy + dz * sy, s.y + dy, s.z - dx * sy + dz * cy);
    const put = (im, n, pos, e, sc = S1) => { M4.compose(pos, Q.setFromEuler(e), sc); im.setMatrixAt(n, M4); };
    put(legs, i, loc(0, 0.37, 0), E.set(0, yaw, 0, 'YXZ'));
    put(torso, i, loc(0, 1.0, 0), E.set(0, yaw, 0, 'YXZ')); torso.setColorAt(i, col.setHex(shirtC[Math.floor(hf(s.k, 12) * shirtC.length)]));
    put(head, i, loc(0, 1.6, 0.02), E.set(-0.1, yaw, 0, 'YXZ'));
    if (s.phone) {                                                        // the right arm up, the phone at eye height ahead
      put(armU, na++, loc(-0.22, 1.42, 0.2), E.set(1.2, yaw, 0, 'YXZ'));
      put(phone, np, loc(-0.2, 1.62, 0.43), E.set(0, yaw, 0.05 * (hf(s.k, 13) - 0.5), 'YXZ'));
      put(scr, np, loc(-0.2, 1.62, 0.4225), E.set(0, yaw + Math.PI, 0, 'YXZ')); np++;
      put(armU, na++, loc(0.22, 1.0, 0.03), E.set(0.08, yaw, 0.1, 'YXZ'));
    } else { put(armU, na++, loc(-0.22, 1.0, 0.03), E.set(0.08, yaw, -0.1, 'YXZ')); put(armU, na++, loc(0.22, 1.0, 0.03), E.set(0.08, yaw, 0.1, 'YXZ')); }
  });
  torso.count = N; head.count = N; legs.count = N; armU.count = na; phone.count = np; scr.count = np;
  for (const m of [torso, head, armU, phone, scr, legs]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  return { root, radius: Math.max(W, D) / 2, height: H + 0.5, snapped: true, footprint: [W, D], contact: true,
    anchors: { facade: new THREE.Vector3(0, H / 2, 0.8), balconies: new THREE.Vector3(0, 1.2 + FH * 1.5, 1), top: new THREE.Vector3(0, H, 0) } };
}

export const CATALOG = {
  'landmark.balconies': {
    desc: "THE BUILDING ACROSS THE STREET (the hook, beats 007-008): a plaster apartment block with balconies on every floor (thin steel rails, dark balcony doors, a few striped awnings) and on them faceless white mannequin NEIGHBOURS in coloured shirts, most holding a phone up at eye height (screens glowing), all turned towards `look_at` [x, z] (the port). The façade faces `heading`. Film it from the Witness's window or the street, 15-40 m away",
    actions: ['idle'],
    params: { floors: 'int (6)', bays: 'int (6, 4.6 m each)', people: '0..1 balconies occupied (0.85)', phones: '0..1 of them filming (0.7)', look_at: '[x, z] world: where they all look (the port)', color: 'css plaster colour', heading: 'deg the façade faces' },
    footprint: [28, 12], height: 20, tags: ['landmark', 'building', 'balconies', 'neighbours', 'people', 'phones', 'filming', 'apartment block', 'beirut', 'street'],
    examples: [{ note: 'the neighbours on their balconies, all turned to the port (behind the camera)', spec: { look: { time: 'dusk' }, world: { biome: 'plains' }, structures: [{ kind: 'landmark.balconies', at: [0, 0], heading: 0, look_at: [-300, -1000] }], camera: { move: 'keys', fov: 50, target: 'structures:0', keys: [{ t: 0, at: [-6, -26], alt: 9, look_at: [0, 0], look_h: 9 }, { t: 6, at: [4, -25], alt: 9.5, look_at: [0, 0], look_h: 9 }] } } }],
  },
};

export async function build(kind, item, ctx) {
  return buildBalconies(item, ctx);
}
