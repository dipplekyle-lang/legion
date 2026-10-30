// mounts.js — QUEST toy animals the chibi world needs most: a chibi horse (the knight's charger, a farm horse, a pony)
// with a saddle and optional caparison, walking / trotting / galloping along its heading or a path, a rider seated on
// it (the cast's `ride` action builds one under the figure); and a few farm animals.
//   game.horse   params: color brown|chestnut|black|white|grey|#hex, mane, caparison #hex, gait idle|walk|trot|gallop,
//                speed, path [[x, z]...], rider: {def} (a chibi riding it)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, smooth } from '../shared/util.js';
import { makeMat, matKey } from './chibi.js';

const COAT = { brown: '#8A5A34', chestnut: '#A0522D', black: '#2A2524', white: '#F2EEE6', grey: '#A8A6A2', bay: '#7A4426', palomino: '#D8B470', dun: '#C2A070' };
const col = (c, d) => (COAT[c] || (/^#?[0-9a-f]{6}$/i.test(String(c || '')) ? (String(c)[0] === '#' ? c : '#' + c) : d));
const caps = (r, len, seg = 12) => new THREE.CapsuleGeometry(r, len, 4, seg);

// the horse: origin at the ground under its middle, facing +Z, ~1.55 m to the saddle top (chibi scale: a big toy)
export function buildHorse(o = {}, ctx = {}) {
  const coat = col(o.color, COAT.brown), mane = col(o.mane, o.color === 'white' || o.color === 'grey' ? '#D8D4CC' : '#2A2220');
  const M = (kind, hex) => makeMat(matKey(kind, hex), ctx);
  const g = new THREE.Group(); g.name = 'game.horse';
  const body = new THREE.Group(); body.position.y = 1.0; g.add(body);
  const add = (parent, geo, kind, hex, p = [0, 0, 0], r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, M(kind, hex)); m.position.set(...p); m.rotation.set(...r); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  add(body, caps(0.36, 0.75, 16), 'cloth', coat, [0, 0, 0], [Math.PI / 2, 0, 0]);                      // barrel
  const neck = new THREE.Group(); neck.position.set(0, 0.18, 0.55); body.add(neck);
  add(neck, caps(0.2, 0.42, 12), 'cloth', coat, [0, 0.25, 0.08], [-0.55, 0, 0]);
  const head = new THREE.Group(); head.position.set(0, 0.52, 0.22); neck.add(head);
  add(head, caps(0.17, 0.34, 12), 'cloth', coat, [0, 0, 0.15], [1.2, 0, 0]);
  add(head, new THREE.SphereGeometry(0.15, 14, 10), 'cloth', coat, [0, 0.06, 0.02]);
  for (const sx of [1, -1]) {
    add(head, new THREE.ConeGeometry(0.05, 0.14, 8), 'cloth', coat, [sx * 0.09, 0.2, -0.02], [0, 0, -sx * 0.2]);   // ears
    const e = add(head, new THREE.SphereGeometry(0.035, 10, 8), 'eye', '#1E1E24', [sx * 0.12, 0.08, 0.12]); e.scale.set(0.6, 1.2, 0.6);
  }
  add(head, caps(0.11, 0.08, 10), 'cloth', shade(coat, 0.75), [0, -0.12, 0.36], [1.2, 0, 0]);          // muzzle
  for (let k = 0; k < 5; k++) add(neck, new THREE.SphereGeometry(0.08, 8, 6), 'hair', mane, [0, 0.22 + k * 0.1, -0.08 + k * 0.03]);   // mane
  const tail = new THREE.Group(); tail.position.set(0, 0.12, -0.72); body.add(tail);
  add(tail, caps(0.08, 0.42, 8), 'hair', mane, [0, -0.25, -0.08], [0.35, 0, 0]);
  // saddle (+ caparison, the knight's draped cloth)
  add(body, new RoundedBoxGeometry(0.5, 0.12, 0.5, 2, 0.04), 'leather', '#5A3420', [0, 0.38, 0.0]);
  if (o.caparison) { const c = new THREE.CylinderGeometry(0.42, 0.5, 0.62, 20, 1, true); c.rotateX(Math.PI / 2); c.scale(1, 1.05, 1.25); add(body, c, 'cloth', col(o.caparison, '#2E4A8A'), [0, -0.05, 0]).material.side = THREE.DoubleSide; }
  // legs: hip pivots, a thigh capsule and a hoof
  const legs = [];
  for (const [x, z, front] of [[0.2, 0.42, 1], [-0.2, 0.42, 1], [0.2, -0.45, 0], [-0.2, -0.45, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x, -0.18, z); body.add(hip);
    add(hip, caps(0.09, 0.55, 10), 'cloth', coat, [0, -0.38, 0]);
    add(hip, new THREE.CylinderGeometry(0.1, 0.11, 0.1, 10), 'leather', '#2A2220', [0, -0.78, 0.01]);
    legs.push({ hip, front, x });
  }
  const saddle = new THREE.Object3D(); saddle.position.set(0, 1.47, -0.02); g.add(saddle);
  function pose(gait, ph, t) {
    const k = gait === 'gallop' ? 0.85 : gait === 'trot' ? 0.55 : gait === 'walk' ? 0.38 : 0;
    legs.forEach((L, i) => { const off = gait === 'gallop' ? [0, 0.3, 0.55, 0.85][i] * Math.PI * 2 : [0, Math.PI, Math.PI, 0][i]; L.hip.rotation.x = Math.sin(ph + off) * k; });
    body.position.y = 1.0 + (k ? Math.abs(Math.sin(ph)) * 0.05 * (k / 0.5) : Math.sin(t * 1.7) * 0.006);
    body.rotation.x = gait === 'gallop' ? Math.sin(ph) * 0.06 : 0;
    neck.rotation.x = k ? Math.sin(ph * 2) * 0.08 : Math.sin(t * 0.6) * 0.05;
    tail.rotation.x = 0.2 + Math.sin(t * 2.3) * 0.15 + k * 0.3;
  }
  pose('idle', 0, 0);
  return { group: g, saddle, pose, height: 1.95 };
}
function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

export const CATALOG = {
  'game.horse': { desc: 'QUEST: a chibi toy horse (color brown|chestnut|bay|black|white|grey|palomino, caparison #hex for a knight\'s draped horse), idle or walking / trotting / galloping along its heading or a path; a rider: {def} sits on it (or give a cast member the action ride)', params: { color: 'coat', mane: '#hex', caparison: '#hex', gait: 'idle|walk|trot|gallop', speed: 'm/s', path: '[[x,z]...]', rider: '{kit, chibi}' }, footprint: [1, 2.4], height: 1.95, tags: ['horse', 'animal', 'mount', 'game'], look: 'game', section: 'objects', actions: ['idle', 'walk', 'trot', 'gallop'] },
};
const GAIT_SPEED = { idle: 0, walk: 1.6, trot: 3.2, gallop: 6.5 };

export async function build(kind, item = {}, ctx = {}) {
  const H = buildHorse(item, ctx);
  const root = new THREE.Group(); root.name = kind; root.add(H.group);
  const at = Array.isArray(item.at) ? item.at : [0, 0];
  const gait = ['idle', 'walk', 'trot', 'gallop'].includes(item.gait || item.action) ? (item.gait || item.action) : 'idle';
  const speed = item.speed != null ? +item.speed : GAIT_SPEED[gait];
  const yaw = Math.PI - (item.heading ?? 180) * Math.PI / 180;
  const pth = Array.isArray(item.path) && item.path.length >= 2 ? item.path.map((p) => [+p[0], +p[p.length === 3 ? 2 : 1]]) : null;
  let total = 0; const segs = [];
  if (pth) for (let i = 0; i < pth.length - 1; i++) { const L = Math.hypot(pth[i + 1][0] - pth[i][0], pth[i + 1][1] - pth[i][1]); segs.push({ a: pth[i], b: pth[i + 1], L, s0: total }); total += L; }
  const G = (x, z) => (ctx.ground ? ctx.ground.height(x, z) : 0);
  let rider = null;
  if (item.rider) {
    const { person } = await import('./index.js');
    rider = person(item.rider.def || item.rider, { at: [0, 0], action: 'ride', mounted: true }, ctx);
    H.saddle.add(rider.root); rider.root.position.set(0, 0, 0);
  }
  const posAt = (t) => {
    const d = speed * Math.max(0, t);
    if (!pth) return [at[0] + Math.sin(yaw) * d, at[1] + Math.cos(yaw) * d, yaw];
    const dd = Math.min(total, d); let s = segs[segs.length - 1]; for (const q of segs) if (dd <= q.s0 + q.L) { s = q; break; }
    const u = s.L ? clamp((dd - s.s0) / s.L) : 0;
    return [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u, Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1])];
  };
  const stride = gait === 'gallop' ? 2.6 : gait === 'trot' ? 1.6 : 1.1;
  const update = (t) => {
    const [x, z, h] = posAt(t);
    H.group.position.set(x, G(x, z), z); H.group.rotation.y = h;
    H.pose(gait, (speed * t / stride) * Math.PI * 2, t);
    if (rider) rider.update(t);
  };
  update(0);
  return { root, radius: 1.3, height: H.height, update, snapped: true, anchors: { body: H.group, feet: H.group, top: H.saddle },
    ...(speed > 0 ? { members: (t) => { const [x, z] = posAt(t); return [[x, z]]; } } : {}) };
}
