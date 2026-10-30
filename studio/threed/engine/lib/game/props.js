// props.js — QUEST set pieces: the level map (pads joined by paths), a level pad, a treasure chest that bursts with coins,
// a floating ring / gem / trophy, the golden gate of the final level, tents and a fortified camp that builds itself,
// a stone road with milestones, columns and a toy temple, walls, houses, a castle, a watchtower, a training post,
// standards and banners, a light beam and a level-up burst. Low-poly, flat-shaded, toy colours; animated on scene time.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, smooth, lerp } from '../shared/util.js';

const TAU = Math.PI * 2;
const ease = (x) => smooth(clamp(x));
const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };   // overshoot
function M(ctx, hex, o = {}) {
  const k = 'game.prop:' + hex + JSON.stringify(o);
  const c = ctx.cache && ctx.cache.get(k); if (c) return c;
  const m = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: o.r ?? 0.7, metalness: o.m ?? 0, flatShading: o.flat ?? true, envMapIntensity: o.env ?? 0.6, emissive: o.e ? new THREE.Color(o.e) : new THREE.Color(0), emissiveIntensity: o.ei ?? 0, transparent: !!o.op, opacity: o.op ?? 1, depthWrite: o.op ? false : true, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }));
  if (ctx.cache) ctx.cache.set(k, m);
  return m;
}
const GOLD = { r: 0.28, m: 1, flat: false, env: 1.3 }, CHROME = { r: 0.15, m: 1, flat: false, env: 1.3 };
function mesh(g, m, shadow = true) { const x = new THREE.Mesh(g, m); x.castShadow = shadow; x.receiveShadow = true; return x; }
function rbox(w, h, d, r = 0.05) { return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)); }
function place(root, item, ctx) {
  const at = Array.isArray(item.at) ? item.at : [0, 0];
  root.position.set(at[0], ctx.ground ? ctx.ground.height(at[0], at[1]) : 0, at[1]);
  root.rotation.y = Math.PI - (item.heading ?? 180) * Math.PI / 180;
}
function numTex(text, o = {}) {
  const c = document.createElement('canvas'); c.width = o.w || 256; c.height = o.h || 256; const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.font = o.font || `900 ${Math.round(c.height * 0.62)}px "Montserrat", "Inter Display", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeC || 'rgba(0,0,0,0.5)'; g.strokeText(text, c.width / 2, c.height / 2 + 4); }
  g.fillStyle = o.color || '#F2C24E'; g.fillText(text, c.width / 2, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

const K = (desc, params = {}, extra = {}) => ({ desc: 'QUEST: ' + desc, params, look: 'game', tags: ['game', ...(extra.tags || [])], footprint: extra.fp || [3, 3], height: extra.h || 2, actions: extra.actions || [], section: extra.section || 'objects' });
export const CATALOG = {
  'game.level_map': K('the level map seen from above: numbered pads joined by white paths winding to the final building; the current level glows, passed pads turn gold, a crossed-out pad shows a red line', { levels: 'n pads (2-12)', current: 'the lit level', progress: '[[t, level]...] the light moving along', crossed: '[levels] struck through in red', final: 'temple|castle|tower|palace|none', spacing: 'm' }, { fp: [60, 60], h: 6, section: 'structures' }),
  'game.pad': K('one level pad: a white disc with a gold rim, glowing when active; the hero stands on it', { level: 'number shown on the rim', active: 'true', glow_at: 's' }, { fp: [4, 4], h: 0.4 }),
  'game.chest': K('a treasure chest that opens at t_open and bursts gold coins (pays out)', { t_open: 's', coins: 'n (0-80)', color: 'wood hex' }, { fp: [1.4, 1], h: 1.1 }),
  'game.coins': K('a pile of gold coins, or coins raining down from t (rain: true)', { count: 'n', rain: 'bool', t: 's' }, { fp: [2, 2], h: 0.6 }),
  'game.ring': K('a big floating golden ring with a red gem, turning and bobbing, glowing (a reward, a rank, an unlock)', { size: 'm (default 1.4)', gem: 'hex', height: 'm above ground' }, { fp: [2, 2], h: 3 }),
  'game.trophy': K('a floating reward object turning in the air: trophy|crown|gem|key|scroll|star|medal|coin|book|potion', { item: 'trophy|crown|gem|key|scroll|star|medal|coin|book|potion', size: 'm', height: 'm' }, { fp: [1.5, 1.5], h: 3 }),
  'game.gate': K('the final level: a monumental golden gate between sandstone pillars; the doors swing open at t_open and warm light pours out', { t_open: 's', width: 'm (default 6)', height: 'm (default 9)', glow: 'hex' }, { fp: [10, 3], h: 10, section: 'structures' }),
  'game.tent': K('a canvas A-frame tent (cream)', { color: 'hex', size: 'm' }, { fp: [3, 3.6], h: 2.2 }),
  'game.camp': K('a fortified camp: a square ditch and earth rampart with a palisade, gates on each side and rows of tents; builds itself over build:[t0, t1] (ditch, walls, then tents pop in)', { size: 'm side (default 40)', rows: 'tent rows', cols: 'tent cols', build: '[t0, t1] or omit = built', night: 'bool: torches lit' }, { fp: [44, 44], h: 4, section: 'structures' }),
  'game.road': K('a straight paved road with kerbs and milestone pillars (Roman road) from -> to', { from: '[x, z]', to: '[x, z]', width: 'm', milestones: 'every m (0 = none)', color: 'hex' }, { fp: [6, 60], h: 1.6, section: 'structures' }),
  'game.column': K('a white stone column (fluted, low-poly), optional broken', { height: 'm', broken: 'bool' }, { fp: [1.2, 1.2], h: 5 }),
  'game.temple': K('a toy Greek / Roman temple: stepped base, columns, pediment (white, red roof optional)', { width: 'm', depth: 'm', columns: 'n', roof: 'hex' }, { fp: [14, 20], h: 10, section: 'structures' }),
  'game.wall': K('a stone wall segment with crenellations from -> to (city wall, fort)', { from: '[x, z]', to: '[x, z]', height: 'm', color: 'hex' }, { fp: [2, 20], h: 4, section: 'structures' }),
  'game.house': K('a toy house (style roman|medieval|village|modern|hut|igloo|japanese), colour roof', { style: 'roman|medieval|village|modern|hut|igloo|japanese', roof: 'hex', wall: 'hex', size: 'm' }, { fp: [6, 6], h: 5, section: 'structures' }),
  'game.castle': K('a toy castle: four towers, walls, a keep, flags', { size: 'm', color: 'hex', flag: 'hex' }, { fp: [30, 30], h: 18, section: 'structures' }),
  'game.tower': K('a round watchtower with a cone roof', { height: 'm', roof: 'hex' }, { fp: [5, 5], h: 10, section: 'structures' }),
  'game.post': K('a wooden training post (palus) planted in the ground', { height: 'm' }, { fp: [0.6, 0.6], h: 2 }),
  'game.standard': K('a standard on a pole: aquila (golden eagle), banner (colour) or flag', { style: 'aquila|banner|flag', color: 'hex', height: 'm' }, { fp: [1, 1], h: 4 }),
  'game.beam': K('a vertical column of golden light (a level-up / a quest spot), fading in at t and out at t_out', { t: 's', t_out: 's', color: 'hex', radius: 'm' }, { fp: [2, 2], h: 12 }),
  'game.burst': K('a level-up burst at t: a ring wave on the ground, gold sparkles flying up, a flash', { t: 's', color: 'hex', size: 'm' }, { fp: [4, 4], h: 3 }),
  'game.campfire': K('a campfire with flickering flames and glow', { size: 'm' }, { fp: [1.5, 1.5], h: 1.2 }),
  'game.crates': K('a stack of crates, barrels and sacks (supplies, loot, a market)', { count: 'n' }, { fp: [3, 3], h: 1.5 }),
  'game.ship': K('a toy wooden ship with a sail (galley|sailship|longship), sailing along its heading at speed', { style: 'galley|sailship|longship', sail: 'hex', speed: 'm/s', length: 'm' }, { fp: [6, 18], h: 10 }),
  'game.cart': K('a two-wheeled cart (hand cart or ox cart without the ox), moving along its heading at speed', { speed: 'm/s', load: 'hay|crates|none' }, { fp: [2, 3], h: 1.5 }),
  'game.sign': K('a wooden signpost with arrows (text on it)', { text: 'short text', text2: 'second arrow' }, { fp: [1, 1], h: 2.4 }),
};

export async function build(kind, item = {}, ctx = {}) {
  const fn = B[kind.replace(/^game\./, '')];
  if (!fn) throw new Error('lib/game: no builder for ' + kind);
  const root = new THREE.Group(); root.name = kind;
  const res = (await fn(root, item, ctx, item.params || {})) || {};
  if (!res.placed) place(root, item, ctx);
  return { root, radius: res.radius ?? 2, height: res.height ?? 2, update: res.update, anchors: res.anchors || {}, footprint: res.footprint, contact: res.contact };
}

const B = {
  pad(root, item, ctx) {
    const lit = item.active !== false;
    root.add(mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.28, 40).translate(0, 0.14, 0), M(ctx, '#F4F2EE', { flat: false, r: 0.35 })));
    const rim = mesh(new THREE.TorusGeometry(1.95, 0.09, 10, 48).rotateX(Math.PI / 2).translate(0, 0.28, 0), M(ctx, '#E2B23E', GOLD)); root.add(rim);
    const glow = mesh(new THREE.CircleGeometry(1.75, 40).rotateX(-Math.PI / 2).translate(0, 0.29, 0), M(ctx, '#FFF2C8', { e: '#FFE8A0', ei: 0, flat: false, op: 0.85 }), false); root.add(glow);
    if (item.level != null) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex(String(item.level)), depthWrite: false, transparent: true })); s.scale.set(1.2, 1.2, 1); s.position.set(1.7, 1.0, 1.7); root.add(s); }
    const g0 = item.glow_at ?? 0;
    return { radius: 2, height: 0.4, update: (t) => { glow.material.emissiveIntensity = lit ? 0.4 + 0.5 * ease((t - g0) / 0.5) * (0.85 + 0.15 * Math.sin(t * 3)) : 0; } };
  },

  level_map(root, item, ctx) {
    const n = clamp(Math.round(item.levels ?? 6), 2, 12), sp = item.spacing ?? 8, r = rng(item.seed ?? 5);
    root.scale.setScalar(item.scale ?? 1.4);
    const pts = []; let x = 0, z = 0, a = -0.4;
    for (let i = 0; i < n; i++) { pts.push([x, z]); a += (r() - 0.5) * 1.3 + (i % 2 ? 0.5 : -0.5); x += Math.sin(a) * sp; z -= Math.cos(a) * sp; }
    const cx = pts.reduce((s, p) => s + p[0], 0) / n, cz = pts.reduce((s, p) => s + p[1], 0) / n;
    pts.forEach((p) => { p[0] -= cx; p[1] -= cz; });
    const pathM = M(ctx, '#F2F0EA', { r: 0.6 }), goldM = M(ctx, '#E2B23E', GOLD), padM = M(ctx, '#F4F2EE', { flat: false, r: 0.3 });
    const pads = [];
    for (let i = 0; i < n; i++) {
      const [px, pz] = pts[i];
      if (i < n - 1) { const [qx, qz] = pts[i + 1], L = Math.hypot(qx - px, qz - pz); for (const off of [-0.45, 0.45]) { const b = mesh(new THREE.BoxGeometry(0.14, 0.06, L), pathM, false); b.position.set((px + qx) / 2 + Math.cos(Math.atan2(qx - px, qz - pz)) * off, 0.04, (pz + qz) / 2 - Math.sin(Math.atan2(qx - px, qz - pz)) * off); b.rotation.y = Math.atan2(qx - px, qz - pz); root.add(b); } }
      const pad = new THREE.Group(); pad.position.set(px, 0, pz); root.add(pad);
      pad.add(mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.3, 36).translate(0, 0.15, 0), padM));
      const rim = mesh(new THREE.TorusGeometry(1.75, 0.09, 8, 40).rotateX(Math.PI / 2).translate(0, 0.3, 0), goldM); pad.add(rim);
      const top = mesh(new THREE.CircleGeometry(1.6, 36).rotateX(-Math.PI / 2).translate(0, 0.31, 0), new THREE.MeshStandardMaterial({ color: '#F4F2EE', emissive: new THREE.Color('#FFE6A0'), emissiveIntensity: 0, roughness: 0.3 }), false);
      ctx.patch(top.material); pad.add(top);
      const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex(String(i + 1), { stroke: 10 }), transparent: true, depthWrite: false })); lab.scale.set(1.3, 1.3, 1); lab.position.set(1.9, 1.2, 1.2); pad.add(lab);
      if ((item.crossed || []).includes(i + 1)) { const x2 = mesh(new THREE.BoxGeometry(4.2, 0.08, 0.3), M(ctx, '#D8302C', { e: '#D8302C', ei: 0.4 }), false); x2.position.set(0, 0.36, 0); x2.rotation.y = 0.5; pad.add(x2); }
      pads.push({ pad, top, rim });
    }
    // the final building at the end of a gold road
    const fin = item.final || 'temple';
    if (fin !== 'none') {
      const [lx, lz] = pts[n - 1]; const fx = lx + 10, fz = lz - 12;
      const road = mesh(new THREE.BoxGeometry(2.4, 0.08, Math.hypot(fx - lx, fz - lz)), M(ctx, '#F3DC6A', { e: '#F3DC6A', ei: 0.25 }), false);
      road.position.set((lx + fx) / 2, 0.05, (lz + fz) / 2); road.rotation.y = Math.atan2(fx - lx, fz - lz); root.add(road);
      const bld = new THREE.Group(); bld.position.set(fx, 0, fz); root.add(bld);
      const sub = fin === 'castle' ? B.castle : fin === 'tower' ? B.tower : B.temple;
      sub(bld, { width: 7, depth: 8, columns: 4, size: 12, height: 9, roof: '#C8322E' }, ctx, {}, true);
    }
    const prog = Array.isArray(item.progress) ? item.progress : [[0, item.current ?? 1]];
    const levelAt = (t) => { let L = prog[0][1]; for (const [tt, l] of prog) if (t >= tt) L = l; return L; };
    return { radius: 30, height: 4, footprint: [50, 50], update: (t) => { const L = levelAt(t); pads.forEach((p, i) => { const on = i + 1 === L; p.top.material.emissiveIntensity = on ? 0.7 + 0.3 * Math.sin(t * 4) : i + 1 < L ? 0.25 : 0; p.top.material.color.set(i + 1 < L ? '#F6E7B0' : '#F4F2EE'); }); }, anchors: Object.fromEntries(pads.map((p, i) => ['pad' + (i + 1), p.pad])) };
  },

  chest(root, item, ctx) {
    const wood = M(ctx, item.color || '#B07A42'), band = M(ctx, '#E2B23E', GOLD);
    const body = new THREE.Group(); root.add(body);
    body.add(mesh(rbox(1.3, 0.62, 0.86, 0.06).translate(0, 0.31, 0), wood));
    for (const x of [-0.5, 0.5]) body.add(mesh(new THREE.BoxGeometry(0.1, 0.64, 0.9).translate(x, 0.32, 0), band));
    const lid = new THREE.Group(); lid.position.set(0, 0.62, -0.43); body.add(lid);
    const lg = new THREE.CylinderGeometry(0.43, 0.43, 1.3, 16, 1, false, 0, Math.PI); lg.rotateZ(Math.PI / 2); lg.translate(0, 0, 0.43);
    lid.add(mesh(lg, wood)); for (const x of [-0.5, 0.5]) { const b = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16, 1, false, 0, Math.PI); b.rotateZ(Math.PI / 2); b.translate(x, 0, 0.43); lid.add(mesh(b, band)); }
    lid.add(mesh(new THREE.BoxGeometry(0.16, 0.2, 0.08).translate(0, 0.0, 0.88), band));
    const glow = new THREE.PointLight(0xFFD27A, 0, 6, 2); glow.position.set(0, 0.9, 0); root.add(glow);
    const inner = mesh(new THREE.BoxGeometry(1.18, 0.05, 0.74).translate(0, 0.6, 0), M(ctx, '#F6CF4E', { e: '#FFC830', ei: 0.0, ...GOLD }), false); body.add(inner);
    const n = clamp(Math.round(item.coins ?? 30), 0, 80), r = rng(item.seed ?? 9);
    const cg = new THREE.CylinderGeometry(0.09, 0.09, 0.025, 14); const coins = new THREE.InstancedMesh(cg, M(ctx, '#F2C232', GOLD), Math.max(1, n)); coins.castShadow = true; coins.frustumCulled = false; root.add(coins);
    const C = Array.from({ length: n }, () => ({ vx: (r() - 0.5) * 2.4, vz: (r() - 0.5) * 2.4 + 0.6, vy: 3.2 + r() * 2.2, d: r() * 0.5, sp: r() * 10 }));
    const to = item.t_open ?? 0.6, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    return { radius: 1, height: 1.1, update: (t) => {
      const o = back((t - to) / 0.45); lid.rotation.x = -1.9 * clamp(o, 0, 1.15);
      body.scale.setScalar(1 + 0.06 * Math.exp(-Math.pow((t - to) * 6, 2)));
      glow.intensity = 8 * ease((t - to) / 0.3); inner.material.emissiveIntensity = 1.4 * ease((t - to) / 0.3);
      C.forEach((c, i) => { const u = t - to - 0.12 - c.d; if (u <= 0) { m4.makeScale(0, 0, 0); coins.setMatrixAt(i, m4); return; } let y = 0.6 + c.vy * u - 4.9 * u * u; const land = y < 0.03; y = Math.max(0.03, y); const uu = land ? (c.vy + Math.sqrt(c.vy * c.vy + 4 * 4.9 * 0.57)) / 9.8 : u; m4.compose(v.set(c.vx * uu, y, c.vz * uu), q.setFromEuler(e.set(land ? Math.PI / 2 : u * c.sp, u * c.sp * 0.7, 0)), s); coins.setMatrixAt(i, m4); });
      coins.instanceMatrix.needsUpdate = true;
    } };
  },

  coins(root, item, ctx) {
    const n = clamp(Math.round(item.count ?? 60), 1, 400), r = rng(item.seed ?? 4), cg = new THREE.CylinderGeometry(0.09, 0.09, 0.025, 14);
    const im = new THREE.InstancedMesh(cg, M(ctx, '#F2C232', GOLD), n); im.castShadow = true; im.frustumCulled = false; root.add(im);
    const C = Array.from({ length: n }, (_, i) => { const a = r() * TAU, d = Math.sqrt(r()) * (0.4 + Math.sqrt(n) * 0.08); return { x: Math.cos(a) * d, z: Math.sin(a) * d, y: Math.max(0.02, (1 - d / (0.4 + Math.sqrt(n) * 0.08)) * Math.sqrt(n) * 0.04 + r() * 0.05), rx: r() * 0.6, ry: r() * 6, t0: (item.t ?? 0) + r() * 1.8, sp: 3 + r() * 6 }; });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    const rain = !!item.rain;
    const upd = (t) => { C.forEach((c, i) => { let y = c.y; if (rain) { const u = t - c.t0; y = u < 0 ? 99 : Math.max(c.y, 9 - 4.9 * u * u); } m4.compose(v.set(c.x, y, c.z), q.setFromEuler(e.set(y > c.y + 0.01 ? t * c.sp : c.rx, c.ry, 0)), y > 50 ? s.set(0, 0, 0) : s.set(1, 1, 1)); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; };
    upd(0); return { radius: 1.5, height: 0.6, update: upd };
  },

  ring(root, item, ctx) {
    const S = item.size ?? 1.4, H = item.height ?? 1.8;
    const g = new THREE.Group(); g.position.y = H; root.add(g);
    g.add(mesh(new THREE.TorusGeometry(S, S * 0.22, 20, 56), M(ctx, '#F3E07A', { ...GOLD, e: '#FFE680', ei: 0.55 })));
    g.add(mesh(new THREE.SphereGeometry(S * 0.27, 20, 16).translate(S * 1.05, 0, 0), M(ctx, item.gem || '#E8384A', { r: 0.15, flat: false, e: item.gem || '#E8384A', ei: 0.35, env: 1.5 })));
    const L = new THREE.PointLight(0xFFE08A, 4, 8, 2); g.add(L);
    return { radius: S * 1.4, height: H + S, contact: false, update: (t) => { g.rotation.y = t * 0.9; g.position.y = H + Math.sin(t * 2.1) * 0.12; } };
  },

  trophy(root, item, ctx) {
    const S = item.size ?? 1, H = item.height ?? 1.6, kind = item.item || 'trophy';
    const g = new THREE.Group(); g.position.y = H; root.add(g);
    const gold = M(ctx, '#F2C232', { ...GOLD, e: '#FFC830', ei: 0.25 });
    if (kind === 'trophy') { g.add(mesh(new THREE.LatheGeometry([[0.001, -0.6], [0.35, -0.6], [0.35, -0.5], [0.1, -0.45], [0.08, -0.1], [0.45, 0.1], [0.5, 0.55], [0.46, 0.56], [0.001, 0.2]].map(([x, y]) => new THREE.Vector2(x * S, y * S)), 28), gold)); for (const sx of [1, -1]) g.add(mesh(new THREE.TorusGeometry(0.18 * S, 0.04 * S, 8, 16, Math.PI).rotateZ(-sx * Math.PI / 2).translate(sx * 0.5 * S, 0.3 * S, 0), gold)); }
    else if (kind === 'crown') { const c = new THREE.CylinderGeometry(0.5 * S, 0.45 * S, 0.35 * S, 24, 1, true); g.add(mesh(c, gold)); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.add(mesh(new THREE.ConeGeometry(0.1 * S, 0.3 * S, 6).translate(Math.sin(a) * 0.48 * S, 0.3 * S, Math.cos(a) * 0.48 * S), gold)); } }
    else if (kind === 'gem') g.add(mesh(new THREE.OctahedronGeometry(0.55 * S, 0).scale(1, 1.3, 1), M(ctx, item.color || '#3AC8E8', { r: 0.08, e: item.color || '#3AC8E8', ei: 0.45, env: 1.6 })));
    else if (kind === 'key') { g.add(mesh(new THREE.TorusGeometry(0.25 * S, 0.07 * S, 8, 20).translate(0, 0.4 * S, 0), gold)); g.add(mesh(new THREE.BoxGeometry(0.1 * S, 0.8 * S, 0.1 * S).translate(0, -0.15 * S, 0), gold)); g.add(mesh(new THREE.BoxGeometry(0.22 * S, 0.08 * S, 0.1 * S).translate(0.12 * S, -0.45 * S, 0), gold)); }
    else if (kind === 'star') { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, rr = (i % 2 ? 0.25 : 0.6) * S; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.add(mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.15 * S, bevelEnabled: true, bevelSize: 0.04 * S, bevelThickness: 0.04 * S }).translate(0, 0, -0.07 * S), gold)); }
    else if (kind === 'scroll') { g.add(mesh(new THREE.CylinderGeometry(0.16 * S, 0.16 * S, 1.0 * S, 16).rotateZ(Math.PI / 2), M(ctx, '#EFE2C0', { flat: false }))); g.add(mesh(new THREE.TorusGeometry(0.17 * S, 0.035 * S, 6, 16).rotateY(Math.PI / 2), M(ctx, '#C8322E'))); }
    else if (kind === 'book') g.add(mesh(rbox(0.8 * S, 1.0 * S, 0.22 * S, 0.04), M(ctx, item.color || '#8A2A2A')));
    else if (kind === 'potion') { g.add(mesh(new THREE.SphereGeometry(0.4 * S, 18, 14), M(ctx, item.color || '#8A3AE8', { r: 0.1, e: item.color || '#8A3AE8', ei: 0.5, op: 0.85, flat: false }))); g.add(mesh(new THREE.CylinderGeometry(0.12 * S, 0.14 * S, 0.3 * S, 12).translate(0, 0.45 * S, 0), M(ctx, '#C8E8F0', { r: 0.1, op: 0.6, flat: false }))); }
    else { g.add(mesh(new THREE.CylinderGeometry(0.5 * S, 0.5 * S, 0.1 * S, 32).rotateX(Math.PI / 2), gold)); }   // medal / coin
    const L = new THREE.PointLight(0xFFE08A, 3, 6, 2); g.add(L);
    return { radius: S, height: H + S, contact: false, update: (t) => { g.rotation.y = t * 1.1; g.position.y = H + Math.sin(t * 2.3) * 0.1; } };
  },

  gate(root, item, ctx) {
    const W = item.width ?? 6, H = item.height ?? 9, to = item.t_open ?? 0.8;
    const stone = M(ctx, '#E9D9B8'), gold = M(ctx, '#E9B43C', { ...GOLD, e: '#C88A1E', ei: 0.25 });
    for (const sx of [1, -1]) { root.add(mesh(new THREE.BoxGeometry(2.4, H + 1.5, 2.6).translate(sx * (W / 2 + 1.2), (H + 1.5) / 2, 0), stone)); }
    root.add(mesh(new THREE.BoxGeometry(W + 4.8, 1.5, 2.8).translate(0, H + 0.75, 0), stone));
    const light = mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: new THREE.Color(item.glow || '#FFD27A'), transparent: true, opacity: 0 }), false); light.position.set(0, H / 2, -0.4); root.add(light);
    const doors = [];
    for (const sx of [1, -1]) {
      const hinge = new THREE.Group(); hinge.position.set(sx * W / 2, 0, 0.2); root.add(hinge);
      const d = mesh(new THREE.BoxGeometry(W / 2, H, 0.3).translate(-sx * W / 4, H / 2, 0), gold); hinge.add(d);
      for (let k = 0; k < 4; k++) hinge.add(mesh(new THREE.BoxGeometry(W / 2 - 0.3, 0.12, 0.36).translate(-sx * W / 4, 1 + k * (H - 2) / 3, 0), M(ctx, '#B8862A', GOLD)));
      for (let k = 0; k < 6; k++) hinge.add(mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(-sx * (0.4 + (k % 2) * (W / 2 - 0.8)), 1.5 + Math.floor(k / 2) * (H - 3) / 2, 0.18), M(ctx, '#F6D870', GOLD)));
      doors.push([hinge, sx]);
    }
    const L = new THREE.PointLight(new THREE.Color(item.glow || '#FFC860'), 0, 30, 1.6); L.position.set(0, H * 0.5, 1.5); root.add(L);
    // god rays: additive planes fanning out of the opening
    const rays = new THREE.Group(); rays.position.set(0, H * 0.5, 0.1); root.add(rays);
    const rm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE2A0'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let k = 0; k < 14; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, H * 1.4).translate(0, H * 0.7, 0), rm); p.rotation.z = (k / 14) * TAU; rays.add(p); }
    return { radius: W, height: H + 1.5, footprint: [W + 5, 3], anchors: { opening: { pos: [0, H / 2, 0], normal: [0, 0, 1], w: W, h: H } }, update: (t) => {
      const o = ease((t - to) / 1.6); doors.forEach(([h, sx]) => { h.rotation.y = sx * o * 1.75; });
      light.material.opacity = o; L.intensity = 60 * o; rm.opacity = 0.16 * o; rays.rotation.z = t * 0.15;
    } };
  },

  tent(root, item, ctx, _p, inner) {
    const s = item.size ?? 1, c = M(ctx, item.color || '#EFE3C2');
    const g = new THREE.CylinderGeometry(1.4 * s, 1.4 * s, 3.2 * s, 3, 1); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 6 * 3); g.rotateY(Math.PI / 2);
    // an A-frame: a triangular prism resting on its face
    const sh = new THREE.Shape(); sh.moveTo(-1.5 * s, 0); sh.lineTo(1.5 * s, 0); sh.lineTo(0, 2.1 * s); sh.lineTo(-1.5 * s, 0);
    const pr = new THREE.ExtrudeGeometry(sh, { depth: 3.2 * s, bevelEnabled: false }); pr.translate(0, 0, -1.6 * s);
    root.add(mesh(pr, c));
    root.add(mesh(new THREE.PlaneGeometry(0.8 * s, 1.3 * s).translate(0, 0.65 * s, 1.61 * s), M(ctx, '#5A4A36')));
    for (const z of [-1.7, 1.7]) root.add(mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 2.5 * s, 6).translate(0, 1.25 * s, z * s), M(ctx, '#8A6440')));
    return { radius: 1.9 * s, height: 2.3 * s };
  },

  camp(root, item, ctx) {
    const S = item.size ?? 40, r = rng(item.seed ?? 3), b = Array.isArray(item.build) ? item.build : null;
    const earth = M(ctx, '#8A6A48'), ditch = M(ctx, '#5A4632'), wood = M(ctx, '#9A7448');
    const ring = new THREE.Group(); root.add(ring);
    const walls = new THREE.Group(); root.add(walls);
    const tents = []; const tentsG = new THREE.Group(); root.add(tentsG);
    // ditch (dark band) + rampart (earth bank) + palisade stakes, with a gap (gate) in each side
    for (let s4 = 0; s4 < 4; s4++) {
      const side = new THREE.Group(); side.rotation.y = s4 * Math.PI / 2; ring.add(side);
      const sideW = new THREE.Group(); sideW.rotation.y = s4 * Math.PI / 2; walls.add(sideW);
      for (const half of [-1, 1]) {
        const L = S / 2 - 3, cx = half * (S / 4 + 1.5);
        side.add(mesh(new THREE.BoxGeometry(L, 0.06, 3).translate(cx, 0.03, S / 2 + 2.2), ditch, false));
        sideW.add(mesh(new THREE.BoxGeometry(L, 1.2, 2.2).translate(cx, 0.6, S / 2), earth));
        const stakes = Math.round(L / 0.45);
        const sg = new THREE.CylinderGeometry(0.09, 0.11, 1.6, 5); const im = new THREE.InstancedMesh(sg, wood, stakes);
        const m4 = new THREE.Matrix4(); for (let k = 0; k < stakes; k++) { m4.makeTranslation(cx - L / 2 + (k + 0.5) * L / stakes, 1.9, S / 2 - 0.6); im.setMatrixAt(k, m4); }
        im.castShadow = true; sideW.add(im);
      }
      for (const sx of [-1, 1]) sideW.add(mesh(new THREE.BoxGeometry(0.9, 3.4, 0.9).translate(sx * 3.1, 1.7, S / 2), wood));   // gate posts
    }
    const rows = item.rows ?? 4, cols = item.cols ?? 5, sp = (S - 12) / Math.max(cols, rows);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const t = new THREE.Group(); t.position.set((j - (cols - 1) / 2) * sp, 0, (i - (rows - 1) / 2) * sp * 1.15);
      B.tent(t, { size: 0.85, color: r() < 0.15 ? '#E6D6B0' : '#F0E6C8' }, ctx); tentsG.add(t); tents.push({ t, d: r() * 0.25 + (i * cols + j) / (rows * cols) * 0.7 });
    }
    if (item.night) { for (const [x, z] of [[-S / 2, -S / 2], [S / 2, -S / 2], [-S / 2, S / 2], [S / 2, S / 2]]) { const L = new THREE.PointLight(0xFFB050, 6, 18, 2); L.position.set(x, 3, z); root.add(L); root.add(mesh(new THREE.SphereGeometry(0.25, 8, 6).translate(x, 3, z), M(ctx, '#FFB040', { e: '#FFA030', ei: 3 }), false)); } }
    return { radius: S * 0.75, height: 3.5, footprint: [S + 6, S + 6], update: (t) => {
      if (!b) return;
      const u = clamp((t - b[0]) / Math.max(0.1, b[1] - b[0]));
      ring.scale.set(1, 1, 1); ring.visible = u > 0.0;
      ring.children.forEach((s) => s.children.forEach((m) => { m.scale.set(clamp(u / 0.25), 1, 1); }));
      walls.position.y = -3.4 * (1 - ease((u - 0.2) / 0.3));
      tents.forEach(({ t: tt, d }) => { const k = back((u - 0.5 - d * 0.5) / 0.08); tt.scale.setScalar(Math.max(0.0001, clamp(k, 0, 1.2))); tt.visible = k > 0.001; });
    } };
  },

  road(root, item, ctx) {
    const a = item.from || [-40, 0], b2 = item.to || [40, 0], W = item.width ?? 5, L = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
    root.position.set((a[0] + b2[0]) / 2, 0, (a[1] + b2[1]) / 2); root.rotation.y = Math.atan2(b2[0] - a[0], b2[1] - a[1]);
    const G = (x, z) => (ctx.ground ? ctx.ground.height(x, z) : 0); root.position.y = G(root.position.x, root.position.z);
    root.add(mesh(new THREE.BoxGeometry(W, 0.16, L).translate(0, 0.06, 0), M(ctx, item.color || '#C9C2B6', { r: 0.95 }), false));
    for (const sx of [1, -1]) root.add(mesh(new THREE.BoxGeometry(0.35, 0.28, L).translate(sx * (W / 2 + 0.1), 0.12, 0), M(ctx, '#BEB6AA')));
    const every = item.milestones ?? 14;
    if (every > 0) for (let z = -L / 2 + every / 2; z < L / 2; z += every) for (const sx of [1, -1]) { const c = mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.7, 9).translate(sx * (W / 2 + 1.4), 0.85, z), M(ctx, '#C8C2B8')); root.add(c); root.add(mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2).translate(sx * (W / 2 + 1.4), 0.1, z), M(ctx, '#B8B0A4'))); }
    return { placed: true, radius: L / 2, height: 1.7, footprint: [W + 4, L] };
  },

  column(root, item, ctx) {
    const H = item.height ?? 5, br = !!item.broken, h2 = br ? H * 0.55 : H;
    root.add(mesh(new THREE.BoxGeometry(1.3, 0.3, 1.3).translate(0, 0.15, 0), M(ctx, '#E6E2DA')));
    root.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, h2, 12).translate(0, 0.3 + h2 / 2, 0), M(ctx, '#EEEAE2')));
    if (!br) root.add(mesh(new THREE.BoxGeometry(1.2, 0.35, 1.2).translate(0, 0.3 + h2 + 0.17, 0), M(ctx, '#E6E2DA')));
    return { radius: 0.7, height: H };
  },

  temple(root, item, ctx, _p, inner) {
    const W = item.width ?? 12, D = item.depth ?? 16, nC = item.columns ?? 6, H = W * 0.62;
    const marble = M(ctx, '#F2EFE8'), roof = M(ctx, item.roof || '#E8E2D6');
    for (let s = 0; s < 3; s++) root.add(mesh(new THREE.BoxGeometry(W + 2 - s * 0.6, 0.35, D + 2 - s * 0.6).translate(0, 0.175 + s * 0.35, 0), marble));
    const y0 = 1.05, ch = H * 0.62, cr = W / nC * 0.18;
    for (const z of [-D / 2 + 0.8, D / 2 - 0.8]) for (let k = 0; k < nC; k++) root.add(mesh(new THREE.CylinderGeometry(cr, cr * 1.1, ch, 10).translate(-W / 2 + 0.8 + k * (W - 1.6) / (nC - 1), y0 + ch / 2, z), marble));
    for (const x of [-W / 2 + 0.8, W / 2 - 0.8]) for (let k = 1; k < Math.round(nC * D / W) - 1; k++) root.add(mesh(new THREE.CylinderGeometry(cr, cr * 1.1, ch, 10).translate(x, y0 + ch / 2, -D / 2 + 0.8 + k * (D - 1.6) / (Math.round(nC * D / W) - 1)), marble));
    root.add(mesh(new THREE.BoxGeometry(W - 3, ch, D - 4).translate(0, y0 + ch / 2, 0), M(ctx, '#E9E3D6')));
    root.add(mesh(new THREE.BoxGeometry(W + 0.4, 0.8, D + 0.4).translate(0, y0 + ch + 0.4, 0), marble));
    const sh = new THREE.Shape(); sh.moveTo(-W / 2 - 0.3, 0); sh.lineTo(W / 2 + 0.3, 0); sh.lineTo(0, W * 0.2); sh.lineTo(-W / 2 - 0.3, 0);
    const pg = new THREE.ExtrudeGeometry(sh, { depth: D + 0.6, bevelEnabled: false }); pg.translate(0, y0 + ch + 0.8, -D / 2 - 0.3); root.add(mesh(pg, roof));
    return { radius: Math.max(W, D) * 0.6, height: y0 + ch + 0.8 + W * 0.2 };
  },

  wall(root, item, ctx) {
    const a = item.from || [-15, 0], b2 = item.to || [15, 0], H = item.height ?? 4, L = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
    root.position.set((a[0] + b2[0]) / 2, ctx.ground ? ctx.ground.height((a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2) : 0, (a[1] + b2[1]) / 2); root.rotation.y = Math.atan2(b2[0] - a[0], b2[1] - a[1]);
    const st = M(ctx, item.color || '#D8CFC0');
    root.add(mesh(new THREE.BoxGeometry(1.6, H, L).translate(0, H / 2, 0), st));
    for (let z = -L / 2 + 0.5; z < L / 2; z += 1.4) root.add(mesh(new THREE.BoxGeometry(1.7, 0.7, 0.8).translate(0, H + 0.35, z), st));
    return { placed: true, radius: L / 2, height: H + 0.7, footprint: [2, L] };
  },

  house(root, item, ctx) {
    const s = item.size ?? 1, st = item.style || 'village';
    const wall = M(ctx, item.wall || { roman: '#F0E6D2', medieval: '#EDE4D0', village: '#F2EADA', modern: '#E8ECF0', hut: '#B08A5A', igloo: '#F2F6FA', japanese: '#E8DCC4' }[st] || '#F2EADA');
    const roof = M(ctx, item.roof || { roman: '#C8582E', medieval: '#7A4A32', village: '#C8463A', modern: '#4A5058', hut: '#C8A860', igloo: '#F2F6FA', japanese: '#3A3A44' }[st] || '#C8463A');
    if (st === 'igloo') { root.add(mesh(new THREE.SphereGeometry(2.4 * s, 14, 8, 0, TAU, 0, Math.PI / 2), wall)); return { radius: 2.5 * s, height: 2.4 * s }; }
    if (st === 'hut') { root.add(mesh(new THREE.CylinderGeometry(2 * s, 2 * s, 2 * s, 10).translate(0, s, 0), wall)); root.add(mesh(new THREE.ConeGeometry(2.6 * s, 2.2 * s, 10).translate(0, 3.1 * s, 0), roof)); return { radius: 2.6 * s, height: 4.2 * s }; }
    const W = 5 * s, D = 4.4 * s, H = 3 * s;
    root.add(mesh(new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0), wall));
    if (st === 'modern') root.add(mesh(new THREE.BoxGeometry(W + 0.4, 0.4, D + 0.4).translate(0, H + 0.2, 0), roof));
    else { const sh = new THREE.Shape(); sh.moveTo(-W / 2 - 0.4, 0); sh.lineTo(W / 2 + 0.4, 0); sh.lineTo(0, (st === 'roman' ? 0.9 : 1.9) * s); sh.lineTo(-W / 2 - 0.4, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: D + 0.6, bevelEnabled: false }); g.translate(0, H, -D / 2 - 0.3); root.add(mesh(g, roof)); }
    root.add(mesh(new THREE.BoxGeometry(0.9 * s, 1.8 * s, 0.1).translate(0, 0.9 * s, D / 2 + 0.05), M(ctx, '#7A5232')));
    for (const sx of [-1, 1]) root.add(mesh(new THREE.BoxGeometry(0.8 * s, 0.8 * s, 0.1).translate(sx * 1.5 * s, 1.9 * s, D / 2 + 0.05), M(ctx, '#5A7A9A', { r: 0.2 })));
    return { radius: Math.max(W, D) * 0.6, height: H + 1.9 * s };
  },

  castle(root, item, ctx) {
    const S = item.size ?? 24, st = M(ctx, item.color || '#D9D2C4'), roof = M(ctx, '#3A5A9A');
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { root.add(mesh(new THREE.CylinderGeometry(2.6, 2.8, 12, 12).translate(x * S / 2, 6, z * S / 2), st)); root.add(mesh(new THREE.ConeGeometry(3.2, 4, 12).translate(x * S / 2, 14, z * S / 2), roof)); }
    for (let s4 = 0; s4 < 4; s4++) { const g = new THREE.Group(); g.rotation.y = s4 * Math.PI / 2; root.add(g); g.add(mesh(new THREE.BoxGeometry(S, 7, 1.6).translate(0, 3.5, S / 2), st)); for (let x = -S / 2 + 1; x < S / 2; x += 1.6) g.add(mesh(new THREE.BoxGeometry(0.8, 0.8, 1.7).translate(x, 7.4, S / 2), st)); }
    root.add(mesh(new THREE.BoxGeometry(S * 0.4, 16, S * 0.4).translate(0, 8, 0), st)); root.add(mesh(new THREE.ConeGeometry(S * 0.32, 6, 4).rotateY(Math.PI / 4).translate(0, 19, 0), roof));
    const flag = mesh(new THREE.PlaneGeometry(2.2, 1.4).translate(1.1, 0, 0), M(ctx, item.flag || '#C8322E', { ds: true }), false); flag.position.set(0, 23, 0); root.add(flag); root.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6).translate(0, 22, 0), M(ctx, '#5A4A3A')));
    root.add(mesh(new THREE.BoxGeometry(3.6, 5, 0.3).translate(0, 2.5, S / 2 + 0.85), M(ctx, '#6A4A2E')));
    return { radius: S * 0.75, height: 22, update: (t) => { flag.rotation.y = Math.sin(t * 2.2) * 0.25; } };
  },

  tower(root, item, ctx) {
    const H = item.height ?? 10;
    root.add(mesh(new THREE.CylinderGeometry(2.1, 2.5, H, 12).translate(0, H / 2, 0), M(ctx, '#D8CFC0')));
    root.add(mesh(new THREE.ConeGeometry(3, 3.6, 12).translate(0, H + 1.8, 0), M(ctx, item.roof || '#C8463A')));
    root.add(mesh(new THREE.BoxGeometry(0.7, 1.1, 0.2).translate(0, H * 0.7, 2.25), M(ctx, '#3A3028')));
    return { radius: 3, height: H + 3.6 };
  },

  post(root, item, ctx) { const H = item.height ?? 1.9; root.add(mesh(new THREE.CylinderGeometry(0.16, 0.19, H, 8).translate(0, H / 2, 0), M(ctx, '#B48A54'))); root.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8).translate(0, H * 0.8, 0), M(ctx, '#E8DEC4'))); return { radius: 0.3, height: H }; },

  standard(root, item, ctx) {
    const H = item.height ?? 3.6, k = item.style || item.params?.style || 'aquila';
    root.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, H, 8).translate(0, H / 2, 0), M(ctx, '#8A6440')));
    let cloth = null;
    if (k === 'aquila') { const gold = M(ctx, '#E6B640', GOLD); root.add(mesh(new THREE.SphereGeometry(0.16, 12, 10).scale(1, 1.2, 1.1).translate(0, H + 0.12, 0), gold)); for (const sx of [1, -1]) root.add(mesh(new THREE.BoxGeometry(0.5, 0.18, 0.04).rotateZ(sx * 0.5).translate(sx * 0.3, H + 0.3, 0), gold)); root.add(mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 20).translate(0, H - 0.2, 0), gold)); }
    else { cloth = mesh(new THREE.PlaneGeometry(1.0, 1.4, 6, 1).translate(k === 'flag' ? 0.5 : 0, -0.7, 0), M(ctx, item.color || '#C8322E', { ds: true, flat: false }), true); cloth.position.set(0, H - 0.1, 0.06); root.add(cloth); if (k === 'banner') root.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6).rotateZ(Math.PI / 2).translate(0, H - 0.1, 0.06), M(ctx, '#8A6440'))); }
    return { radius: 0.6, height: H + 0.4, update: (t) => { if (cloth) { const p = cloth.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(t * 3 + x * 4) * 0.08 * (k === 'flag' ? x : 0.6)); } p.needsUpdate = true; } } };
  },

  beam(root, item, ctx) {
    const r = item.radius ?? 0.55, t0 = item.t ?? 0, t1 = item.t_out ?? 1e9;
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(item.color || '#FFD86A'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, 14, 24, 1, true).translate(0, 7, 0), m); root.add(c);
    const c2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.6, 14, 24, 1, true).translate(0, 7, 0), m.clone()); root.add(c2);
    const L = new THREE.PointLight(new THREE.Color(item.color || '#FFD86A'), 0, 12, 2); L.position.y = 2; root.add(L);
    return { radius: r, height: 14, contact: false, update: (t) => { const k = ease((t - t0) / 0.35) * (1 - ease((t - t1) / 0.4)); m.opacity = 0.06 * k * (0.85 + 0.15 * Math.sin(t * 9)); c2.material.opacity = 0.1 * k; L.intensity = 5 * k; c.rotation.y = t; } };
  },

  burst(root, item, ctx) {
    const t0 = item.t ?? 0.3, S = item.size ?? 1, col = new THREE.Color(item.color || '#FFD86A');
    const ringM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 48).rotateX(-Math.PI / 2).translate(0, 0.08, 0), ringM); root.add(ring);
    const n = 60, r = rng(item.seed ?? 2);
    const sp = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.07 * S, 0), new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), n); sp.frustumCulled = false; root.add(sp);
    const P = Array.from({ length: n }, () => ({ a: r() * TAU, v: 1.2 + r() * 2.2, up: 2 + r() * 3.5, d: r() * 0.25 }));
    const L = new THREE.PointLight(col, 0, 10, 2); L.position.y = 1.2; root.add(L);
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    return { radius: 3 * S, height: 3, contact: false, update: (t) => {
      const u = t - t0;
      const k = clamp(u / 0.7); ring.scale.setScalar(0.3 + 4.5 * S * smooth(k)); ringM.opacity = u < 0 ? 0 : 0.9 * (1 - k);
      L.intensity = u < 0 ? 0 : 25 * Math.exp(-u * 4);
      P.forEach((p, i) => { const w = u - p.d; if (w < 0 || w > 1.6) { m4.makeScale(0, 0, 0); } else { const sc = (1 - w / 1.6); m4.compose(v.set(Math.cos(p.a) * p.v * w * S, (0.4 + p.up * w - 2.2 * w * w) * S, Math.sin(p.a) * p.v * w * S), q.setFromAxisAngle(v.clone().set(0, 1, 0), w * 8), s.set(sc, sc, sc)); } sp.setMatrixAt(i, m4); });
      sp.instanceMatrix.needsUpdate = true;
    } };
  },

  campfire(root, item, ctx) {
    const s = item.size ?? 1;
    for (let k = 0; k < 5; k++) root.add(mesh(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.9 * s, 6).rotateZ(Math.PI / 2).rotateY(k / 5 * TAU).translate(0, 0.1 * s, 0), M(ctx, '#6A4A2E')));
    const fl = []; for (let k = 0; k < 3; k++) { const f = mesh(new THREE.ConeGeometry(0.22 * s - k * 0.04, 0.8 * s - k * 0.15, 6).translate(0, 0.45 * s, 0), M(ctx, ['#FF8A2A', '#FFB43A', '#FFE07A'][k], { e: ['#FF7A1A', '#FFA02A', '#FFD860'][k], ei: 2.2 }), false); root.add(f); fl.push(f); }
    const L = new THREE.PointLight(0xFF9A40, 10, 12, 2); L.position.y = 0.8; root.add(L);
    return { radius: 0.7 * s, height: 1.2 * s, update: (t) => { fl.forEach((f, k) => { f.scale.set(1 + Math.sin(t * 11 + k) * 0.08, 1 + Math.sin(t * 7 + k * 2) * 0.18, 1); f.rotation.y = t * (1 + k); }); L.intensity = 9 + Math.sin(t * 13) * 2 + Math.sin(t * 7.3) * 1.5; } };
  },

  crates(root, item, ctx) {
    const n = clamp(item.count ?? 6, 1, 20), r = rng(item.seed ?? 6);
    for (let i = 0; i < n; i++) {
      const k = r(); const x = (r() - 0.5) * 2.6, z = (r() - 0.5) * 2.6;
      if (k < 0.45) root.add(mesh(rbox(0.8, 0.8, 0.8, 0.04).translate(x, 0.4 + (i > 3 && r() < 0.4 ? 0.8 : 0), z), M(ctx, '#C09058')));
      else if (k < 0.75) root.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.95, 12).translate(x, 0.47, z), M(ctx, '#9A6A3A')));
      else root.add(mesh(new THREE.SphereGeometry(0.42, 10, 8).scale(1, 0.8, 0.9).translate(x, 0.33, z), M(ctx, '#E4D4AE')));
    }
    return { radius: 1.8, height: 1.6 };
  },

  ship(root, item, ctx) {
    const L = item.length ?? 14, st = item.style || 'galley', sp = item.speed ?? 0;
    const body = new THREE.Group(); root.add(body);
    const hull = new THREE.Shape(); hull.moveTo(-L / 2, 1.4); hull.quadraticCurveTo(-L / 2 + 1, 0, -L / 4, 0); hull.lineTo(L / 3, 0); hull.quadraticCurveTo(L / 2, 0.2, L / 2 + 0.6, 2.0); hull.lineTo(-L / 2, 1.4);
    const hg = new THREE.ExtrudeGeometry(hull, { depth: L * 0.26, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 1 }); hg.translate(0, 0, -L * 0.13); hg.rotateY(-Math.PI / 2);
    body.add(mesh(hg, M(ctx, '#9A6A3A')));
    body.add(mesh(new THREE.BoxGeometry(L * 0.24, 0.15, L * 0.8).translate(0, 1.5, 0), M(ctx, '#C8A070')));
    body.add(mesh(new THREE.CylinderGeometry(0.15, 0.18, L * 0.7, 8).translate(0, 1.5 + L * 0.35, 0), M(ctx, '#7A5232')));
    const sail = mesh(new THREE.PlaneGeometry(L * 0.5, L * 0.38, 4, 4).translate(0, 1.5 + L * 0.42, 0.2), M(ctx, item.sail || (st === 'longship' ? '#C8322E' : '#F2EAD6'), { ds: true, flat: false })); body.add(sail);
    if (st === 'galley' || st === 'longship') for (let k = 0; k < 7; k++) for (const sx of [1, -1]) body.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 5).rotateZ(sx * 1.1).translate(sx * L * 0.2, 1.0, -L * 0.3 + k * L * 0.1), M(ctx, '#B88A55')));
    const head = Math.PI - (item.heading ?? 180) * Math.PI / 180;
    return { radius: L * 0.6, height: L * 0.8, anchors: { body }, update: (t) => { const d = sp * t; body.position.set(Math.sin(0) * 0, Math.sin(t * 1.3) * 0.12, d); body.rotation.z = Math.sin(t * 1.1) * 0.03; } };
  },

  cart(root, item, ctx) {
    const body = new THREE.Group(); root.add(body); const sp = item.speed ?? 0;
    body.add(mesh(rbox(1.6, 0.5, 2.4, 0.05).translate(0, 0.9, 0), M(ctx, '#B08050')));
    const wheels = []; for (const sx of [1, -1]) { const w = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 12).rotateZ(Math.PI / 2), M(ctx, '#7A5232')); w.position.set(sx * 0.9, 0.6, 0); body.add(w); wheels.push(w); }
    body.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6).rotateX(Math.PI / 2).translate(0.3, 0.8, 2.0), M(ctx, '#8A6440'))); body.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6).rotateX(Math.PI / 2).translate(-0.3, 0.8, 2.0), M(ctx, '#8A6440')));
    if (item.load === 'hay') body.add(mesh(new THREE.SphereGeometry(0.9, 10, 8).scale(0.9, 0.5, 1.3).translate(0, 1.3, 0), M(ctx, '#E2C46A')));
    if (item.load === 'crates') for (let k = 0; k < 3; k++) body.add(mesh(rbox(0.6, 0.6, 0.6, 0.03).translate((k - 1) * 0.45, 1.45, (k % 2) * 0.4), M(ctx, '#C09058')));
    return { radius: 1.6, height: 1.8, anchors: { body }, update: (t) => { body.position.z = sp * t; wheels.forEach((w) => { w.rotation.x = sp * t / 0.6; }); } };
  },

  sign(root, item, ctx) {
    root.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6).translate(0, 1.2, 0), M(ctx, '#8A6440')));
    const arrow = (txt, y, dir) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#C8A06A'; g.beginPath(); g.moveTo(0, 0); g.lineTo(440, 0); g.lineTo(512, 64); g.lineTo(440, 128); g.lineTo(0, 128); g.closePath(); g.fill();
      g.fillStyle = '#3A2A1A'; g.font = '700 64px "Montserrat", "Inter", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(txt).toUpperCase().slice(0, 14), 220, 68);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.06), [M(ctx, '#C8A06A'), M(ctx, '#C8A06A'), M(ctx, '#C8A06A'), M(ctx, '#C8A06A'), ctx.patch(new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })), ctx.patch(new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 }))]);
      p.position.set(dir * 0.7, y, 0); p.rotation.y = dir < 0 ? Math.PI : 0; p.castShadow = true; root.add(p);
    };
    if (item.text) arrow(item.text, 2.0, 1);
    if (item.text2) arrow(item.text2, 1.5, -1);
    return { radius: 1, height: 2.4 };
  },
};
