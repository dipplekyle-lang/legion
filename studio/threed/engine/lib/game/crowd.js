// crowd.js — QUEST groups: instanced chibi squads, centuries and whole armies (1 to 6,000 figures) in formations,
// marching in step with swinging arms and legs, cheering, saluting or standing at ease. One look per group (or a few
// variants for a civilian crowd); every body part is an InstancedMesh per material, posed per figure each frame.
//   game.formation   params: count, formation block|line|column|square|wedge|circle|scatter|ring, rows, cols, spacing,
//                    action idle|march|walk|run|cheer|salute|swing|block|dig|kneel, speed, path, def (chibi def) | kit,
//                    kits [mixed], gap: [row, col] (an empty slot for the hero), in_step
//   game.crowd       a civilian crowd of mixed looks (era via kits, or def variants), scattered, idle / cheering
//   game.army        game.formation for thousands (low detail; limbs still in big blocks only when count <= 2500)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { chibiLook, buildParts, makeMat, POSE, PIV, normAction, hashStr } from './chibi.js';
import { rng, clamp, smooth } from '../shared/util.js';

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _p = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const MOVING = new Set(['walk', 'march', 'run', 'carry']);
const SPEED = { walk: 1.15, march: 1.3, run: 3.0, carry: 1.0 };

const GP = { count: '1-6000', formation: 'block|line|column|square|wedge|circle|ring|scatter', rows: 'n', cols: 'n', spacing: 'm (default 1.0)', action: 'idle|march|walk|run|cheer|salute|swing|block|dig|kneel|talk', speed: 'm/s', path: '[[x,z]...] (moving)', def: '{kit, chibi:{...}} the look of every member', kits: '[kit|def...] mixed looks', gap: '[row, col] empty slot (the hero stands there)', in_step: 'true: march in step' };
export const CATALOG = {
  'game.formation': { desc: 'QUEST: a squad / century / cohort of chibi soldiers or workers in formation (instanced, arms and legs animated, marching in step)', actions: ['idle', 'march', 'walk', 'run', 'cheer', 'salute', 'swing', 'block', 'dig', 'kneel', 'talk'], params: GP, footprint: [10, 10], height: 1.5, tags: ['group', 'army', 'soldiers', 'troops', 'formation', 'game'], look: 'game', section: 'groups' },
  'game.army': { desc: 'QUEST: a whole army / legion of thousands of chibi soldiers in blocks (count up to 6000; blocks: [[rows, cols], ...] laid side by side)', actions: ['idle', 'march', 'cheer'], params: { ...GP, blocks: '[[rows, cols], ...] cohort blocks', block_gap: 'm between blocks' }, footprint: [80, 60], height: 1.5, tags: ['group', 'army', 'legion', 'thousands', 'game'], look: 'game', section: 'groups' },
  'game.crowd': { desc: 'QUEST: a civilian crowd of mixed chibi people (kits: [...] or era), scattered, idle / talking / cheering', actions: ['idle', 'cheer', 'talk', 'walk', 'wave'], params: { ...GP, era: 'ancient|medieval|1800s|1910s|1950s|modern' }, footprint: [20, 20], height: 1.5, tags: ['group', 'crowd', 'people', 'civilians', 'game'], look: 'game', section: 'groups' },
};
const ERA_KITS = {
  ancient: [{ chibi: { outfit: 'tunic', top: '#E8DCC0' } }, { chibi: { outfit: 'tunic', top: '#C9A272' } }, { chibi: { outfit: 'robe', top: '#B8C4D8', hair: 'long' } }, { chibi: { outfit: 'toga', top: '#F2EEE4' } }],
  medieval: [{ kit: 'medieval_peasant' }, { chibi: { outfit: 'rags', top: '#6A5A42', wear: 'none' } }, { chibi: { outfit: 'dress', top: '#8A3A3A', hair: 'long' } }, { chibi: { outfit: 'coat', top: '#3A5A3A', wear: 'hood' } }],
  '1800s': [{ kit: '1800s_formal' }, { chibi: { outfit: 'dress', top: '#4A5A8A', hair: 'bun' } }, { chibi: { outfit: 'shirt', top: '#B8A888', wear: 'cap' } }, { chibi: { outfit: 'apron', top: '#6A6A6A' } }],
  '1910s': [{ kit: '1910s_formal' }, { chibi: { outfit: 'dress', top: '#5A3A4A', hair: 'bun' } }, { chibi: { outfit: 'coat', top: '#4A4A4A', wear: 'bowler' } }],
  '1950s': [{ kit: '1950s_casual' }, { chibi: { outfit: 'dress', top: '#C85A5A', hair: 'short' } }, { chibi: { outfit: 'suit', top: '#3A4A5A', wear: 'fedora' } }],
  modern: [{ kit: 'modern_casual' }, { chibi: { outfit: 'shirt', top: '#D85A4A' } }, { chibi: { outfit: 'shirt', top: '#3A8A5A', hair: 'long' } }, { kit: 'modern_business' }],
};

// one figure's parts merged into the 5 instanced parts (body / lLeg / rLeg / lArm / rArm), keyed by material
function bake(L, detail, rigid) {
  const P = buildParts(L, { detail });
  const out = { body: {}, lLeg: {}, rLeg: {}, lArm: {}, rArm: {} };
  const put = (part, key, g) => { (out[part][key] ||= []).push(g); };
  const back = (j, g) => { const p = PIV[j]; return g.translate(p[0], p[1], p[2]); };     // joint space -> body space
  for (const [j, list] of Object.entries(P.joints)) {
    for (const it of list) {
      let g = it.geo.index ? it.geo.toNonIndexed() : it.geo;
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      if (rigid) { put('body', it.key, back(j, g)); continue; }
      if (j === 'lLeg' || j === 'rLeg') { put(j, it.key, g); continue; }             // already about the hip pivot
      if (j === 'lUpper' || j === 'rUpper') { put(j[0] + 'Arm', it.key, g); continue; }
      if (j === 'lFore' || j === 'rFore') {                                          // forearm: about the shoulder, elbow a little bent
        const sh = PIV[j[0] + 'Upper'], el = PIV[j];
        g.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.25)); g.translate(el[0] - sh[0], el[1] - sh[1], el[2] - sh[2]);
        put(j[0] + 'Arm', it.key, g); continue;
      }
      put('body', it.key, back(j, g));
    }
  }
  const res = {};
  for (const [part, by] of Object.entries(out)) for (const [key, gs] of Object.entries(by)) (res[part] ||= {})[key] = mergeGeometries(gs);
  return res;
}

function layout(item, r) {
  const n = clamp(Math.round(item.count ?? 24), 1, 6000);
  const sp = clamp(+(item.spacing ?? 1.0), 0.6, 6);
  const f = String(item.formation || (n > 40 ? 'block' : 'block')).toLowerCase();
  const pts = [];
  const gap = Array.isArray(item.gap) ? item.gap : null;
  if (Array.isArray(item.blocks) && item.blocks.length) {          // cohorts side by side
    const bg = +(item.block_gap ?? 4);
    let x0 = 0; const rowsMax = Math.max(...item.blocks.map((b) => +b[0] || 1));
    const widths = item.blocks.map((b) => (+b[1] || 1) * sp);
    const total = widths.reduce((a, b) => a + b, 0) + bg * (item.blocks.length - 1);
    x0 = -total / 2;
    item.blocks.forEach((b, k) => { const R = +b[0] || 1, C = +b[1] || 1; for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) pts.push([x0 + (j + 0.5) * sp, (i - (rowsMax - 1) / 2) * sp, i, j]); x0 += widths[k] + bg; });
    return pts.slice(0, 6000);
  }
  if (f === 'scatter' || f === 'crowd') {
    const R = Math.sqrt(n) * sp * 0.75;
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R; pts.push([Math.cos(a) * d, Math.sin(a) * d, 0, i]); }
    return pts;
  }
  if (f === 'circle' || f === 'ring') {
    const R = Math.max(2, n * sp / (Math.PI * 2));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([Math.cos(a) * R, Math.sin(a) * R, 0, i]); }
    return pts;
  }
  if (f === 'wedge') { let k = 0; for (let row = 0; k < n; row++) for (let j = -row; j <= row && k < n; j++, k++) pts.push([j * sp * 0.6, row * sp, row, j]); const zc = pts[pts.length - 1][1] / 2; pts.forEach((p) => { p[1] -= zc; }); return pts; }
  let cols = +item.cols || 0, rows = +item.rows || 0;
  if (!cols && !rows) { if (f === 'line') { rows = 1; cols = n; } else if (f === 'column') { cols = Math.min(4, n); rows = Math.ceil(n / cols); } else { cols = Math.ceil(Math.sqrt(n * (f === 'square' ? 1 : 1.25))); rows = Math.ceil(n / cols); } }
  else if (!cols) cols = Math.ceil(n / rows); else if (!rows) rows = Math.ceil(n / cols);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    if (pts.length >= n + (gap ? 1 : 0)) break;
    if (gap && gap[0] === i && gap[1] === j) continue;
    pts.push([(j - (cols - 1) / 2) * sp, (i - (rows - 1) / 2) * sp, i, j]);
  }
  return pts.slice(0, n);
}

export async function build(kind, item = {}, ctx = {}) {
  const r = rng((item.seed ?? 1) * 31 + hashStr(JSON.stringify([kind, item.count, item.formation, item.at])) % 9973);
  const army = kind === 'game.army';
  if (army && !item.blocks && !item.rows && !item.cols && (item.count ?? 0) > 600) {     // cohorts of 480 by default
    const n = clamp(Math.round(item.count), 600, 6000), per = 480, nb = Math.ceil(n / per);
    item = { ...item, blocks: Array.from({ length: nb }, () => [16, 30]), block_gap: item.block_gap ?? 5 };
  }
  const P = layout(item, r);
  const n = P.length;
  const action = normAction(item.action || (kind === 'game.crowd' ? 'stand' : 'stand'));
  const moving = MOVING.has(action);
  const speed = item.speed != null ? +item.speed : SPEED[action] || 0;
  // looks: one def (soldiers), or a few variants (a crowd)
  let defs;
  if (Array.isArray(item.kits) && item.kits.length) defs = item.kits.map((k) => (typeof k === 'string' ? { kit: k } : k));
  else if (kind === 'game.crowd') defs = ERA_KITS[item.era] || ERA_KITS.modern;
  else defs = [item.def || (item.kit ? { kit: item.kit, chibi: item.chibi } : { kit: 'roman_legion', chibi: item.chibi })];
  defs = defs.slice(0, 6).map((d, i) => ({ ...d, id: (d.id || 'm') + i, chibi: { ...(d.chibi || {}), seed: i * 17 + 3 } }));
  const detail = n > 1500 ? 0.3 : n > 400 ? 0.42 : n > 80 ? 0.6 : 0.85;
  const rigid = n > 2500;                                   // thousands: rigid bodies (bob only)
  const root = new THREE.Group(); root.name = kind;
  const at = Array.isArray(item.at) ? item.at : [0, 0];
  const yaw = Math.PI - (item.heading ?? 180) * Math.PI / 180;
  const G = (x, z) => (ctx.ground ? ctx.ground.height(x, z) : 0);
  // each member: variant, phase, local offset
  const M = P.map((p, i) => ({ v: defs.length > 1 ? Math.floor(r() * defs.length) : 0, ph: item.in_step === false || kind === 'game.crowd' ? r() * Math.PI * 2 : 0, off: r() * 10, lx: p[0] + (kind === 'game.crowd' ? 0 : (r() - 0.5) * 0.05), lz: p[1], yj: kind === 'game.crowd' ? (r() - 0.5) * 1.2 : (r() - 0.5) * 0.06, s: 1 + (r() - 0.5) * 0.06 }));
  const meshes = [];                                        // {mesh, part, v, idx: [member indices]}
  for (let v = 0; v < defs.length; v++) {
    const L = chibiLook(defs[v]);
    const parts = bake(L, detail, rigid);
    const ids = M.map((m, i) => (m.v === v ? i : -1)).filter((i) => i >= 0);
    if (!ids.length) continue;
    for (const [part, by] of Object.entries(parts)) for (const [key, geo] of Object.entries(by)) {
      const mesh = new THREE.InstancedMesh(geo, makeMat(key, ctx), ids.length);
      mesh.castShadow = !key.startsWith('blush') && !key.startsWith('glass') && n <= 1200; mesh.receiveShadow = true;
      mesh.frustumCulled = false; mesh.name = `${kind}:${part}`;
      if (key.startsWith('blush')) mesh.renderOrder = 2;
      root.add(mesh); meshes.push({ mesh, part, ids, L });
    }
  }
  // path / heading travel
  const pth = Array.isArray(item.path) && item.path.length >= 2 ? item.path.map((p) => [+p[0], +p[p.length === 3 ? 2 : 1]]) : null;
  let pathLen = 0; const segs = [];
  if (pth) for (let i = 0; i < pth.length - 1; i++) { const L = Math.hypot(pth[i + 1][0] - pth[i][0], pth[i + 1][1] - pth[i][1]); segs.push({ a: pth[i], b: pth[i + 1], L, s0: pathLen }); pathLen += L; }
  const centerAt = (t) => {
    const d = moving ? speed * Math.max(0, t) * smooth(Math.min(1, Math.max(0, t) / 0.5) * 0.5 + 0.5) : 0;
    if (!pth) return [at[0] + Math.sin(yaw) * d, at[1] + Math.cos(yaw) * d, yaw];
    const dd = Math.min(pathLen, d); let s = segs[segs.length - 1]; for (const q of segs) if (dd <= q.s0 + q.L) { s = q; break; }
    const u = s.L ? clamp((dd - s.s0) / s.L) : 0;
    return [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u, Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1])];
  };
  const pos = new Float32Array(n * 3);
  let lastT = null;
  function update(t) {
    if (lastT !== null && !moving && rigid && lastT === Math.round(t * 30)) return;
    lastT = Math.round(t * 30);
    const [cx, cz, hy] = centerAt(t);
    const ch = Math.cos(hy), sh = Math.sin(hy);
    const stride = 0.42, dist = moving ? speed * t : 0;
    for (let i = 0; i < n; i++) {
      const m = M[i];
      const x = cx + m.lx * ch + m.lz * sh, z = cz - m.lx * sh + m.lz * ch;
      pos[i * 3] = x; pos[i * 3 + 1] = G(x, z); pos[i * 3 + 2] = z;
    }
    for (const it of meshes) {
      const { mesh, part, ids } = it;
      for (let k = 0; k < ids.length; k++) {
        const i = ids[k], m = M[i];
        const u = t + m.off;
        const ph = moving ? (dist / stride) * Math.PI + m.ph : u * 6 + m.ph;
        const p = rigid ? { bob: moving ? Math.abs(Math.cos(ph)) * 0.02 : Math.sin(u * 2.1) * 0.005 } : POSE(action, ph, u, i);
        _q.setFromEuler(_e.set(rigid ? 0 : (p.lean || 0) * 0.6, hy + m.yj + (p.turn || 0), rigid ? 0 : (p.roll || 0)));
        _s.setScalar(m.s * (L_SCALE(it.L)));
        _m.compose(_v.set(pos[i * 3], pos[i * 3 + 1] + (p.bob || 0) + (p.hop || 0), pos[i * 3 + 2]), _q, _s);
        if (part !== 'body') {
          const pv = part === 'lLeg' ? PIV.lLeg : part === 'rLeg' ? PIV.rLeg : part === 'lArm' ? PIV.lUpper : PIV.rUpper;
          const ax = part === 'lLeg' ? p.lLeg : part === 'rLeg' ? p.rLeg : part === 'lArm' ? p.lArmX : p.rArmX;
          const az = part === 'lArm' ? (p.lArmZ ?? 0.12) : part === 'rArm' ? -(p.rArmZ ?? 0.12) : 0;
          _p.makeTranslation(pv[0], pv[1] - (part.endsWith('Leg') ? (p.bob || 0) + (p.hop || 0) : 0), pv[2]);
          _r.makeRotationFromEuler(_e.set(ax || 0, 0, az));
          _m.multiply(_p).multiply(_r);
        }
        mesh.setMatrixAt(k, _m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  update(0);
  const bodyAnchor = new THREE.Object3D(); root.add(bodyAnchor);
  const sample = n > 64 ? Array.from({ length: 64 }, (_, k) => Math.floor(k * n / 64)) : M.map((_, i) => i);
  const res = {
    root, radius: Math.max(2, Math.sqrt(n) * 0.9), height: 1.5, snapped: true,
    update: (t) => { update(t); const [cx, cz] = centerAt(t); bodyAnchor.position.set(cx, G(cx, cz) + 0.9, cz); },
    members: (t) => { update(t); return sample.map((i) => [pos[i * 3], pos[i * 3 + 2]]); },
    anchors: { body: bodyAnchor },
    count: n,
  };
  res.update(0);
  if (moving) res.loco = { kind: 'chibi-group', walkers: (t) => { update(t); const [, , hy] = centerAt(t); return sample.slice(0, 12).map((i) => ({ x: pos[i * 3], z: pos[i * 3 + 2], yaw: hy, phase: (speed * t) / 0.84, stride: 0.84, moving: true })); } };
  return res;
}
function L_SCALE(L) { return (L && L.h ? L.h / 1.5 : 1); }
