// world.js — the QUEST toy world: a low-poly landscape (flat-shaded facets, saturated colour patches), a level stage in
// the middle, rolling hills and far faceted mountains, instanced low-poly trees (cypress, umbrella pine, round, conifer,
// palm, birch), bushes, rocks, grass tufts and flowers, and puffy cartoon clouds drifting in the sky.
//   world { biome: 'game' | 'game_meadow' | 'game_autumn' | 'game_desert' | 'game_snow' | 'game_beach' | 'game_volcano'
//           | 'game_moon', seed, relief 0..1.5, clear (m, the empty stage radius, default 22), trees 0..2 (density),
//           flora 'mediterranean' | 'temperate' | 'boreal' | 'tropical' | 'none', clouds 0..2, features [{type: 'road',
//           from, to, width} | {type: 'river', from, to} | {type: 'clearing', at, r} | {type: 'hill', at, height, width}],
//           water {kind: 'sea'|'lake', level, at, radius} }
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, makeNoise, clamp, smooth, lerp } from '../shared/util.js';

const BIOMES = {
  meadow: { grass: ['#6CB04C', '#74B652', '#66AA48', '#7BBB57'], hill: ['#5E9E44', '#6AA84C', '#55943E'], mount: ['#8FA07A', '#A6B08E', '#C7CCB8'], dirt: '#C9B48A', road: '#D8D2C8', flora: 'mediterranean', tufts: '#6FB04C', flowers: ['#FFFFFF', '#F5D547', '#F29AC2'] },
  autumn: { grass: ['#B9B34E', '#C9A746', '#A8A84A', '#D0B254'], hill: ['#B38E3E', '#C79A44', '#9A8A40'], mount: ['#A89A80', '#B8AC94', '#D0CABB'], dirt: '#B89A70', road: '#D2C8B8', flora: 'temperate_autumn', tufts: '#B4A048', flowers: ['#E8A23A', '#D8552E'] },
  desert: { grass: ['#E9CD8E', '#F0D59A', '#E2C485', '#F2DBA4'], hill: ['#E3BE7C', '#D9B06C', '#EBC98C'], mount: ['#D9A866', '#C99858', '#E8C08A'], dirt: '#D8B87E', road: '#E8DCC4', flora: 'desert', tufts: '#B8A45A', flowers: [] },
  snow: { grass: ['#F3F6FA', '#E9EEF5', '#F8FAFC', '#E2E9F2'], hill: ['#EEF2F7', '#DEE6F0'], mount: ['#E6ECF4', '#C9D4E2', '#F6F8FB'], dirt: '#CBD3DD', road: '#B8B4AE', flora: 'boreal_snow', tufts: '#D8E2EC', flowers: [] },
  beach: { grass: ['#86C460', '#93CC68'], hill: ['#78B856', '#6AAA4C'], mount: ['#8FA07A', '#A6B08E'], dirt: '#EAD8A6', road: '#E0D6C4', flora: 'tropical', tufts: '#72B24E', flowers: ['#F5D547', '#F27A9A'] },
  volcano: { grass: ['#5A4A44', '#4A3E3A', '#6A5650'], hill: ['#3E3432', '#4E403C'], mount: ['#2E2826', '#3E3430'], dirt: '#6A5048', road: '#5A4E48', flora: 'none', tufts: '#5A4A40', flowers: [] },
  moon: { grass: ['#BDBDBA', '#B0B0AD', '#C8C8C5'], hill: ['#A8A8A5', '#9A9A97'], mount: ['#8E8E8B', '#A0A09D'], dirt: '#B5B5B2', road: '#C8C8C5', flora: 'none', tufts: '#AAAAAA', flowers: [] },
};
const BIO_ALIAS = { game: 'meadow', game_meadow: 'meadow', game_field: 'meadow', game_grass: 'meadow', game_autumn: 'autumn', game_desert: 'desert', game_snow: 'snow', game_winter: 'snow', game_beach: 'beach', game_coast: 'beach', game_island: 'beach', game_volcano: 'volcano', game_moon: 'moon', game_space: 'moon' };

export const CATALOG = {
  'biome.game_meadow': { desc: 'QUEST toy world: low-poly bright landscape, a flat stage in the middle, faceted hills, instanced cypress / umbrella pine / round trees, flowers, puffy cartoon clouds (biome game_meadow|game_autumn|game_desert|game_snow|game_beach|game_volcano|game_moon; trees 0..2, clouds 0..2, clear m, features road/river/clearing/hill, water sea|lake)', section: 'world', biomes: Object.keys(BIO_ALIAS), tags: ['world', 'game', 'toy', 'low poly', 'meadow'], look: 'game', params: { biome: Object.keys(BIO_ALIAS).join('|'), relief: '0..1.5', clear: 'm', trees: '0..2', flora: 'mediterranean|temperate|boreal|tropical|none', clouds: '0..2', features: '[{type, ...}]', water: '{kind: sea|lake, level, at, radius}' } },
};
for (const k of ['game_autumn', 'game_desert', 'game_snow', 'game_beach', 'game_volcano', 'game_moon']) CATALOG['biome.' + k] = { ...CATALOG['biome.game_meadow'], biome: k, desc: `QUEST toy world: ${BIO_ALIAS[k]} (low-poly, the game look's biome; same params as biome.game_meadow)` };
CATALOG['biome.game_meadow'].biome = 'game_meadow';

function axis(inner = 160, step0 = 3.2, grow = 1.07, outer = 9000) {
  const a = [0]; let x = 0, st = step0;
  while (x < outer) { x += st; a.push(x); if (x > inner) st *= grow; }
  return [...a.slice(1).reverse().map((v) => -v), ...a];
}
function bsearch(arr, v) { let lo = 0, hi = arr.length - 1; if (v <= arr[0]) return 0; if (v >= arr[hi]) return hi - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] <= v) lo = m; else hi = m; } return lo; }
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; const u = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2); return Math.hypot(a[0] + dx * u - x, a[1] + dz * u - z); };
const C3 = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };   // linear

export async function buildWorld(world = {}, look = {}, ctx = {}) {
  const bname = BIO_ALIAS[world.biome] || BIO_ALIAS[String(world.kind || '').replace(/^world\./, '')] || 'meadow';
  const B = BIOMES[bname];
  const seed = world.seed ?? 11, R = rng(seed * 7 + 5), N = makeNoise(seed * 13 + 3);
  const relief = clamp(world.relief ?? 0.6, 0, 1.6), clear = clamp(world.clear ?? 22, 4, 200);
  const feats = Array.isArray(world.features) ? world.features : [];
  const roads = feats.filter((f) => (f.type === 'road' || f.type === 'path') && f.from && f.to);
  const rivers = feats.filter((f) => f.type === 'river' && f.from && f.to);
  const clearings = feats.filter((f) => f.type === 'clearing' && f.at);
  const hills = feats.filter((f) => f.type === 'hill' && f.at);
  const water = world.water && world.water.kind && world.water.kind !== 'none' ? world.water : (bname === 'beach' ? { kind: 'sea', level: 0, at: [0, -260], radius: 200 } : null);
  const wl = water ? (water.level ?? 0) : null;
  const raw = (x, z) => {
    const r = Math.hypot(x, z);
    let h = relief * (3.2 * N.fbm2(x / 90, z / 90, 3) + 1.2 * N.fbm2(x / 33, z / 33, 2));
    h *= smooth((r - clear) / 70);                                           // the stage is level
    h += relief * 34 * smooth((r - 160) / 420) * (0.5 + 0.5 * N.fbm2(x / 260 + 7, z / 260, 3));   // rolling hills
    h += relief * 160 * smooth((r - 900) / 2200) * (0.45 + 0.55 * N.ridge2(x / 1400, z / 1400, 3));   // far mountains
    for (const f of hills) { const d = Math.hypot(x - f.at[0], z - f.at[1]); h += (f.height ?? 12) * Math.exp(-(d * d) / (2 * Math.pow(f.width ?? 40, 2))); }
    for (const rd of roads) { const d = segDist(x, z, rd.from, rd.to); h = lerp(h, 0.0 + h * 0.15, 1 - smooth((d - (rd.width ?? 5) * 0.6) / 8)); }
    for (const rv of rivers) { const d = segDist(x, z, rv.from, rv.to); h -= 2.6 * (1 - smooth((d - (rv.width ?? 8) * 0.4) / 6)); }
    if (water) { const c = water.at ?? [0, -260], d = Math.hypot(x - c[0], z - c[1]), Rw = water.radius ?? 200; h = lerp(h, wl - 4, 1 - smooth((d - Rw * 0.85) / (Rw * 0.35))); }
    return h;
  };
  const xs = axis(), zs = xs, nx = xs.length, nz = zs.length;
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) H[j * nx + i] = raw(xs[i], zs[j]);
  const height = (x, z) => {
    const i = bsearch(xs, x), j = bsearch(zs, z);
    const fx = clamp((x - xs[i]) / (xs[i + 1] - xs[i])), fz = clamp((z - zs[j]) / (zs[j + 1] - zs[j]));
    const a = H[j * nx + i], b = H[j * nx + i + 1], c = H[(j + 1) * nx + i + 1], d = H[(j + 1) * nx + i];
    return fx + fz <= 1 ? a + (b - a) * fx + (d - a) * fz : c + (d - c) * (1 - fx) + (b - c) * (1 - fz);
  };
  const normal = (x, z) => { const e = 0.5; return new THREE.Vector3(height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e)).normalize().toArray(); };
  // the ground: flat-shaded triangles, one colour each (low-poly patches), roads / dirt / sand blended in
  const grass = B.grass.map(C3), hillC = B.hill.map(C3), mount = B.mount.map(C3), dirt = C3(B.dirt), roadC = C3(B.road), sand = C3('#EBD7A2');
  const triCol = (x, z, y) => {
    const r = Math.hypot(x, z), n = N.fbm2(x / 26, z / 26, 2) * 0.5 + 0.5, f = clamp(n * (grass.length - 1), 0, grass.length - 1.001), k = Math.floor(f);
    let c = grass[k].map((v, q) => lerp(v, grass[k + 1][q], smooth(f - k)));
    if (r > 200) { const t = smooth((r - 200) / 500); const h2 = hillC[Math.floor(clamp((N.fbm2(x / 70, z / 70, 2) * 0.5 + 0.5) * hillC.length, 0, hillC.length - 0.001))]; c = c.map((v, q) => lerp(v, h2[q], t)); }
    if (y > 60) { const t = smooth((y - 60) / 120); const m = mount[Math.floor(clamp((N.fbm2(x / 120, z / 120, 2) * 0.5 + 0.5) * mount.length, 0, mount.length - 0.001))]; c = c.map((v, q) => lerp(v, m[q], t)); }
    for (const rd of roads) { const d = segDist(x, z, rd.from, rd.to); const kk = 1 - smooth((d - (rd.width ?? 5) * 0.5) / 1.2); if (kk > 0) c = c.map((v, q) => lerp(v, roadC[q], kk)); }
    for (const rv of rivers) { const d = segDist(x, z, rv.from, rv.to); const kk = 1 - smooth((d - (rv.width ?? 8) * 0.55) / 2); if (kk > 0) c = c.map((v, q) => lerp(v, dirt[q], kk)); }
    if (wl != null && y < wl + 1.2) { const kk = 1 - smooth((y - wl) / 1.2); c = c.map((v, q) => lerp(v, sand[q], kk)); }
    const sh = 0.96 + 0.06 * (N.fbm2(x / 7, z / 7, 1) * 0.5 + 0.5);
    return c.map((v) => v * sh);
  };
  const tris = (nx - 1) * (nz - 1) * 2;
  const pos = new Float32Array(tris * 9), colA = new Float32Array(tris * 9);
  let q = 0;
  const P = (i, j) => [xs[i], H[j * nx + i], zs[j]];
  const push = (a, b, c) => {
    const cx = (a[0] + b[0] + c[0]) / 3, cz = (a[2] + b[2] + c[2]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
    const cc = triCol(cx, cz, cy);
    for (const p of [a, b, c]) { pos[q] = p[0]; pos[q + 1] = p[1]; pos[q + 2] = p[2]; colA[q] = cc[0]; colA[q + 1] = cc[1]; colA[q + 2] = cc[2]; q += 3; }
  };
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); push(a, d, b); push(b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  const gmat = ctx.patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, envMapIntensity: 0.4, flatShading: true }));
  const ground = new THREE.Mesh(g, gmat); ground.receiveShadow = true; ground.name = 'ground'; ground.userData.noQA = true; ground.userData.ground = true;
  ctx.scene.add(ground);
  // water: a flat toy sea / lake (turquoise near the sand, deeper out)
  let wmesh = null;
  if (water) {
    const wm = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(bname === 'volcano' ? '#E2582A' : '#4FB8D8'), roughness: 0.18, metalness: 0, envMapIntensity: 1.0, emissive: new THREE.Color(bname === 'volcano' ? '#C83A12' : '#000000'), emissiveIntensity: bname === 'volcano' ? 1.2 : 0 }));
    wmesh = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000, 1, 1).rotateX(-Math.PI / 2), wm);
    wmesh.position.y = wl; wmesh.name = 'water'; wmesh.userData.noQA = true; wmesh.receiveShadow = true; ctx.scene.add(wmesh);
  }
  // keep-outs for scatter: the stage, clearings, roads, rivers, water
  const free = (x, z, pad = 0) => {
    if (Math.hypot(x, z) < clear + pad) return false;
    for (const c of clearings) if (Math.hypot(x - c.at[0], z - c.at[1]) < (c.r ?? 12) + pad) return false;
    for (const rd of roads) if (segDist(x, z, rd.from, rd.to) < (rd.width ?? 5) * 0.6 + 1.5 + pad) return false;
    for (const rv of rivers) if (segDist(x, z, rv.from, rv.to) < (rv.width ?? 8) * 0.7 + 1 + pad) return false;
    if (wl != null && height(x, z) < wl + 0.6) return false;
    return true;
  };
  const freeSmall = (x, z) => !roads.some((rd) => segDist(x, z, rd.from, rd.to) < (rd.width ?? 5) * 0.6 + 0.6) && !rivers.some((rv) => segDist(x, z, rv.from, rv.to) < (rv.width ?? 8) * 0.7) && !(wl != null && height(x, z) < wl + 0.6);
  const flora = world.flora || B.flora;
  const dens = clamp(world.trees ?? 1, 0, 2.5);
  scatterTrees(ctx, flora, dens, free, height, R, B);
  if (bname !== 'moon' && bname !== 'volcano') scatterSmall(ctx, B, free, freeSmall, height, R, clear, bname === 'snow' ? 0.4 : 1);
  if (bname === 'moon' || bname === 'volcano') scatterRocks(ctx, free, height, R, bname === 'moon' ? '#9A9A97' : '#2E2624', 140);
  const clouds = (bname === 'moon') ? null : makeClouds(ctx, clamp(world.clouds ?? 1, 0, 2.5), R);
  return {
    ground: { height, normal }, water: water ? { kind: water.kind, level: wl } : null, root: ground,
    hints: { sky: bname === 'moon' ? 'space' : 'game' },
    update(t) { if (clouds) clouds.update(t); },
  };
}

// ── trees: low-poly, flat-shaded, instanced per kind ──────────────────────────────────────────────────────────────
function ico(r, detail = 0) { return new THREE.IcosahedronGeometry(r, detail); }
function lowpoly(g) { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); n.computeVertexNormals(); return n; }
function treeKinds(flora) {
  const K = {};
  const trunk = (h, r0 = 0.16, r1 = 0.1, bend = 0) => { const g = new THREE.CylinderGeometry(r1, r0, h, 6, 1); g.translate(0, h / 2, 0); if (bend) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + bend * Math.pow(p.getY(i) / h, 2)); } return lowpoly(g); };
  K.cypress = { leaf: lowpoly(ico(1, 1).scale(0.85, 3.4, 0.85).translate(0, 3.9, 0)), trunk: trunk(1.2, 0.14, 0.1), leafC: '#3F8A45', trunkC: '#8A6A44', r: 1.0 };
  K.umbrella = { leaf: lowpoly(mergeGeometries([new THREE.DodecahedronGeometry(1.9, 0).scale(1.5, 0.42, 1.4).translate(0, 6.2, 0), new THREE.DodecahedronGeometry(1.3, 0).scale(1.4, 0.4, 1.3).translate(1.1, 5.7, 0.4)].map((x) => x.toNonIndexed()))), trunk: trunk(6.0, 0.17, 0.11, 0.6), leafC: '#5E9E3E', trunkC: '#9A7448', r: 2.6 };
  K.round = { leaf: lowpoly(ico(2.0, 1).scale(1, 0.92, 1).translate(0, 3.9, 0)), trunk: trunk(2.4, 0.2, 0.14), leafC: '#4E9A40', trunkC: '#8A6440', r: 2.0 };
  K.conifer = { leaf: lowpoly(mergeGeometries([new THREE.ConeGeometry(1.7, 2.6, 7).translate(0, 2.6, 0), new THREE.ConeGeometry(1.35, 2.2, 7).translate(0, 3.9, 0), new THREE.ConeGeometry(0.95, 1.9, 7).translate(0, 5.1, 0)].map((x) => x.toNonIndexed()))), trunk: trunk(1.6, 0.18, 0.14), leafC: '#2F7A48', trunkC: '#7A5A3A', r: 1.7 };
  K.birch = { leaf: lowpoly(ico(1.5, 0).scale(1, 1.4, 1).translate(0, 4.4, 0)), trunk: trunk(3.6, 0.13, 0.09), leafC: '#8CC250', trunkC: '#EDEAE2', r: 1.5 };
  K.palm = { leaf: lowpoly(mergeGeometries(Array.from({ length: 7 }, (_, k) => new THREE.ConeGeometry(0.5, 3.2, 3).rotateZ(Math.PI / 2 + 0.35).translate(1.5, 0, 0).rotateY(k / 7 * Math.PI * 2).translate(0, 6.6, 0).toNonIndexed()))), trunk: trunk(6.6, 0.2, 0.14, 1.0), leafC: '#4E9E3C', trunkC: '#A88A5A', r: 2.4 };
  K.bush = { leaf: lowpoly(ico(0.9, 0).scale(1.2, 0.8, 1.1).translate(0, 0.55, 0)), trunk: null, leafC: '#5AA244', r: 0.9 };
  K.cactus = { leaf: lowpoly(mergeGeometries([new THREE.CylinderGeometry(0.28, 0.32, 2.6, 7).translate(0, 1.3, 0), new THREE.CylinderGeometry(0.18, 0.2, 1.0, 6).translate(0.55, 1.6, 0), new THREE.CylinderGeometry(0.18, 0.2, 0.5, 6).rotateZ(Math.PI / 2).translate(0.38, 1.15, 0)].map((x) => x.toNonIndexed()))), trunk: null, leafC: '#5E9A48', r: 0.6 };
  const autumn = flora.endsWith('autumn'), snow = flora.endsWith('snow');
  if (autumn) { K.round.leafC = '#D88A2E'; K.birch.leafC = '#E8B83A'; K.bush.leafC = '#C8642E'; }
  if (snow) { K.conifer.leafC = '#2E6A4A'; K.round.leafC = '#E8EEF4'; K.bush.leafC = '#E4EAF2'; }
  const mix = { mediterranean: [['cypress', 0.38], ['umbrella', 0.3], ['round', 0.17], ['bush', 0.15]], temperate: [['round', 0.45], ['birch', 0.2], ['conifer', 0.15], ['bush', 0.2]], temperate_autumn: [['round', 0.45], ['birch', 0.25], ['conifer', 0.1], ['bush', 0.2]], boreal: [['conifer', 0.8], ['birch', 0.1], ['bush', 0.1]], boreal_snow: [['conifer', 0.9], ['bush', 0.1]], tropical: [['palm', 0.55], ['round', 0.2], ['bush', 0.25]], desert: [['cactus', 0.5], ['palm', 0.2], ['bush', 0.3]], none: [] }[flora] || [['round', 0.5], ['cypress', 0.3], ['bush', 0.2]];
  return { K, mix };
}
function scatterTrees(ctx, flora, dens, free, height, R, B) {
  if (dens <= 0) return;
  const { K, mix } = treeKinds(flora);
  if (!mix.length) return;
  const per = {};
  const n = Math.round(260 * dens);
  for (let i = 0; i < n * 3 && Object.values(per).reduce((a, b) => a + b.length, 0) < n; i++) {
    const a = R() * Math.PI * 2, d = 28 + Math.pow(R(), 1.6) * 900;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!free(x, z, 1.5)) continue;
    let u = R(), kind = mix[mix.length - 1][0]; for (const [k, w] of mix) { if (u < w) { kind = k; break; } u -= w; }
    (per[kind] ||= []).push([x, height(x, z), z, 0.75 + R() * 0.6, R() * Math.PI * 2]);
  }
  // a few groves near the stage edge (the reference's trees frame every shot)
  for (let i = 0; i < 18 * dens; i++) {
    const a = R() * Math.PI * 2, d = 26 + R() * 40, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!free(x, z, 1.5)) continue;
    const kind = mix[Math.floor(R() * Math.min(2, mix.length))][0];
    (per[kind] ||= []).push([x, height(x, z), z, 0.8 + R() * 0.5, R() * Math.PI * 2]);
  }
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [kind, list] of Object.entries(per)) {
    const k = K[kind];
    for (const [geo, c] of [[k.leaf, k.leafC], [k.trunk, k.trunkC]]) {
      if (!geo) continue;
      const mat = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85, metalness: 0, flatShading: true, envMapIntensity: 0.5 }));
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach(([x, y, z, s, r], i) => { m4.compose(new THREE.Vector3(x, y - 0.1, z), qq.setFromEuler(e.set(0, r, 0)), new THREE.Vector3(s, s * (0.9 + (i % 5) * 0.05), s)); im.setMatrixAt(i, m4); });
      im.castShadow = true; im.receiveShadow = true; im.name = 'game.tree.' + kind; im.userData.noQA = false;
      im.frustumCulled = false;
      ctx.scene.add(im);
    }
  }
}
function scatterSmall(ctx, B, free, freeSmall, height, R, clear, k = 1) {
  // grass tufts: 4 thin faceted blades; flowers: a stem and a ball; small rocks
  const blade = (h, a, lean) => { const g = new THREE.ConeGeometry(0.035, h, 3); g.translate(0, h / 2, 0); g.rotateZ(lean); g.rotateY(a); return g.toNonIndexed(); };
  const tuft = lowpoly(mergeGeometries([blade(0.42, 0, 0.18), blade(0.34, 1.7, -0.25), blade(0.38, 3.4, 0.22), blade(0.3, 4.6, -0.12), blade(0.36, 2.5, 0.05)]));
  const stem = lowpoly(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4).translate(0, 0.16, 0));
  const bloom = lowpoly(ico(0.055, 0).translate(0, 0.34, 0));
  const pts = [], fl = [];
  const n = Math.round(4200 * k);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = 3 + Math.pow(R(), 1.35) * 150, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (d > clear && !free(x, z, 0)) continue;                         // tufts sit on the stage too, never on a road or in water
    if (d <= clear && (R() < 0.5 || !freeSmall(x, z))) continue;
    pts.push([x, height(x, z), z, 0.7 + R() * 0.7, R() * 6.28]);
    if (B.flowers.length && R() < 0.07) fl.push([x + 0.3, height(x + 0.3, z), z, 0.8 + R() * 0.5, Math.floor(R() * B.flowers.length)]);
  }
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  const tm = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(B.tufts), roughness: 0.9, flatShading: true, envMapIntensity: 0.4 }));
  const ti = new THREE.InstancedMesh(tuft, tm, pts.length);
  pts.forEach(([x, y, z, s, r], i) => { m4.compose(v.set(x, y - 0.02, z), qq.setFromEuler(e.set(0, r, 0)), s3.set(s, s, s)); ti.setMatrixAt(i, m4); });
  ti.receiveShadow = true; ti.castShadow = false; ti.name = 'game.tufts'; ti.userData.noQA = true; ti.frustumCulled = false; ctx.scene.add(ti);
  if (fl.length) {
    const sm = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color('#5E9E44'), roughness: 0.9, flatShading: true }));
    const si = new THREE.InstancedMesh(stem, sm, fl.length); si.name = 'game.flowers'; si.userData.noQA = true; si.frustumCulled = false;
    const byC = B.flowers.map(() => []);
    fl.forEach(([x, y, z, s, c], i) => { m4.compose(v.set(x, y, z), qq.identity(), s3.set(s, s, s)); si.setMatrixAt(i, m4); byC[c].push(m4.clone()); });
    ctx.scene.add(si);
    byC.forEach((list, c) => {
      if (!list.length) return;
      const bm = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(B.flowers[c]), roughness: 0.7, flatShading: true, emissive: new THREE.Color(B.flowers[c]), emissiveIntensity: 0.08 }));
      const bi = new THREE.InstancedMesh(bloom, bm, list.length); list.forEach((mm, i) => bi.setMatrixAt(i, mm)); bi.name = 'game.blooms'; bi.userData.noQA = true; bi.frustumCulled = false; ctx.scene.add(bi);
    });
  }
}
function scatterRocks(ctx, free, height, R, c, n) {
  const g = lowpoly(ico(1, 0));
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler();
  const mat = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.95, flatShading: true }));
  const list = [];
  for (let i = 0; i < n * 3 && list.length < n; i++) { const a = R() * 6.28, d = 25 + Math.pow(R(), 1.4) * 500, x = Math.cos(a) * d, z = Math.sin(a) * d; if (free(x, z, 1)) list.push([x, height(x, z), z, 0.4 + R() * 2.2, R() * 6.28]); }
  const im = new THREE.InstancedMesh(g, mat, list.length);
  list.forEach(([x, y, z, s, r], i) => { m4.compose(new THREE.Vector3(x, y, z), qq.setFromEuler(e.set(r, r * 2, 0)), new THREE.Vector3(s * 1.3, s * 0.7, s)); im.setMatrixAt(i, m4); });
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.name = 'game.rocks'; ctx.scene.add(im);
}

// ── puffy cartoon clouds: clusters of soft white balls in a ring of sky, drifting ───────────────────────────────────
function makeClouds(ctx, amount, R) {
  if (amount <= 0) return null;
  const parts = [];
  const n = Math.round(22 * amount);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = 260 + R() * 900, y = 70 + R() * 120 + d * 0.05, s = 9 + R() * 12;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const k = 3 + Math.floor(R() * 4);
    for (let b = 0; b < k; b++) parts.push([cx + (b - k / 2) * s * 0.75 + R() * s * 0.3, y + (b % 2) * s * 0.25 - Math.abs(b - k / 2) * s * 0.1, cz + (R() - 0.5) * s * 0.6, s * (0.75 + R() * 0.45) * (b === Math.floor(k / 2) ? 1.25 : 1)]);
    parts.push([cx, y - s * 0.25, cz, s * 0.9]);
  }
  const g = new THREE.SphereGeometry(1, 18, 12);
  const mat = ctx.patch(new THREE.MeshStandardMaterial({ color: new THREE.Color('#FFFFFF'), roughness: 1, metalness: 0, emissive: new THREE.Color('#EEF4FF'), emissiveIntensity: 0.55, envMapIntensity: 0.6 }));
  const im = new THREE.InstancedMesh(g, mat, parts.length); im.name = 'game.clouds'; im.userData.noQA = true; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), qq = new THREE.Quaternion(), s3 = new THREE.Vector3();
  const set = (t) => { parts.forEach(([x, y, z, s], i) => { m4.compose(v.set(x + t * 1.6, y, z + t * 0.4), qq, s3.set(s, s * 0.72, s)); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; };
  set(0); ctx.scene.add(im);
  return { update: set };
}
