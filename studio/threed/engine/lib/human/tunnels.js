// tunnels.js — E1 specificity kit (2026-09-29): tunnels you crawl through in the dark, and a hatch in the jungle floor.
//   interior.crawl_tunnel  a hand-dug earthen crawlway (0.8 m high, 0.7 m wide by default): red-brown laterite clay with
//                          pick marks, a flat trodden floor, roots hanging through the roof, slight turns; PITCH DARK by
//                          default (no sun, sky or fill: only the scene's own lights read - a flashlight). Film it with a
//                          keys camera and "limits": "macro" (the camera is inside a 0.8 m tube). Anchors: entrance, mid, end.
//                          The tunnel runs from `at` along `heading` for `length` m; a crawler: cast action crawl |
//                          belly_crawl with path [[x, z] along the same line] (the floor is at the ground height of `at`)
//   prop.trapdoor          a camouflaged hatch flush with the jungle floor (a plank lid under leaves and dirt, a frame,
//                          a black shaft below); open: t (+ dur) swings it up; `hole`: the dark opening a figure climbs into
import * as THREE from 'three';
import { plain } from '../shared/materials.js';
import { ground, xz, yawFromHeading, patchAll } from './common.js';
import { buildRecipe } from './propbuild.js';
import { pitShell, holeMask, drawUnder, UNDER } from './hole.js';
import { clamp, lerp } from '../shared/util.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
function vn(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, s), hash(i + 1, s), u) * 2 - 1; }
function vn2(x, y, s = 0) { return vn(x + 17.3 * vn(y * 0.7, s + 3), s) * 0.6 + vn(y + 9.1 * vn(x * 0.5, s + 5), s + 1) * 0.4; }

let CLAY = null;
function clayTex() {
  if (CLAY) return CLAY;
  const W = 512, c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'), id = g.createImageData(W, W), d = id.data;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W * 8, v = y / W * 8;
    let k = 0.75 + 0.18 * vn2(u * 1.3, v * 1.3, 1) + 0.08 * vn2(u * 6, v * 6, 2) + 0.05 * vn2(u * 20, v * 20, 3);
    const pick = Math.abs(Math.sin((u * 3 + v * 1.2 + vn(v * 2, 4) * 0.6) * PI));        // pick / spade marks
    k -= 0.1 * Math.pow(1 - pick, 8);
    const i = (y * W + x) * 4; d[i] = clamp(k * 205, 0, 255); d[i + 1] = clamp(k * 150, 0, 255); d[i + 2] = clamp(k * 112, 0, 255); d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  CLAY = new THREE.CanvasTexture(c); CLAY.wrapS = CLAY.wrapT = THREE.RepeatWrapping; CLAY.colorSpace = THREE.SRGBColorSpace; CLAY.anisotropy = 4;
  return CLAY;
}

// the crawlway: a section (flat floor, short walls, a low arch) swept along a gently wandering centreline
export function crawlTunnel(o = {}) {
  const L = num(o.length, 12), Hh = num(o.height, 0.8), Ww = num(o.width, 0.7), seed = num(o.seed, 3), turn = num(o.curve, 0.06);
  const G = new THREE.Group(); G.name = 'crawl_tunnel'; G.userData.noQA = true; G.userData.hollow = true;
  const nz = Math.max(24, Math.round(L * 10)), ns = 40;
  const dip = num(o.dip, 0);                                    // a U-bend (the water lock): the floor dips by `dip` in the middle half
  const dipAt = (z) => { const u = (z - 0.25 * L) / (0.5 * L); return u <= 0 || u >= 1 ? 0 : dip * Math.pow(Math.sin(PI * u), 2); };
  const center = (z) => [turn * Ww * vn(z * 0.18, seed) * sm(z / 1.5) * sm((L - z) / 1.5), 0.06 * vn(z * 0.3, seed + 2) * (dip ? 0.3 : 1) - dipAt(z)];
  // section: s in [0, 1) round the perimeter: floor (left -> right), right wall + arch + left wall back to the floor
  const sec = (s) => {
    const fl = 0.22;                                           // share of the perimeter that is floor
    if (s < fl) { const u = s / fl; return [lerp(-Ww / 2, Ww / 2, u), 0, 0]; }
    const a = (s - fl) / (1 - fl) * PI;                        // 0 = right foot of the arch .. PI = left foot
    const x = Math.cos(a) * Ww / 2, y = Math.sin(a) * (Hh - 0.12) + 0.12 * (1 - Math.pow(Math.cos(a), 8)) * 0 + 0.12 * Math.min(1, Math.sin(a) * 4);
    return [x, y, 1];
  };
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nz; i++) {
    const z = L * i / nz, [cx, cy] = center(z);
    for (let j = 0; j <= ns; j++) {
      const s = j / ns, [x0, y0, wall] = sec(s % 1);
      const r = wall ? 0.035 * vn2(z * 3.1 + s * 7, s * 13, seed + 7) + 0.02 * vn2(z * 9, s * 29, seed + 9) : 0.01 * vn2(z * 5, x0 * 9, seed + 11);
      const nx = wall ? Math.cos((s - 0.22) / 0.78 * PI) : 0, ny = wall ? Math.sin((s - 0.22) / 0.78 * PI) : -1;
      pos.push(cx + x0 + nx * r, cy + Math.max(0, y0 + (wall ? ny * r : r)), z);   // (the clamp keeps the walls above the local floor)
      uv.push(s * (Ww + Hh) * 1.6, z * 0.9);
    }
  }
  for (let i = 0; i < nz; i++) for (let j = 0; j < ns; j++) { const a = i * (ns + 1) + j, b = a + 1, c = a + ns + 1, d = c + 1; idx.push(a, c, b, b, c, d); }   // wound to face inward
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = plain({ color: o.color ? new THREE.Color(o.color) : 0xB08A70, map: clayTex(), roughness: 0.97, side: THREE.FrontSide });
  const tube = new THREE.Mesh(g, m); tube.castShadow = true; tube.receiveShadow = true; tube.name = 'tunnel_clay'; G.add(tube);
  // the outer shell (seen from outside the tunnel, e.g. from a cutaway): the same tube, other side, darker
  const shell = new THREE.Mesh(g, plain({ color: 0x3A2A1E, roughness: 1, side: THREE.BackSide })); shell.name = 'tunnel_shell'; shell.receiveShadow = true; G.add(shell);
  // roots through the roof: thin wandering tubes, a few long tendrils, clusters
  const rootM = new THREE.MeshLambertMaterial({ color: 0x6A4C36 });
  const nr = Math.round(num(o.roots, 1) * L * 6);
  for (let k = 0; k < nr; k++) {
    const z = 0.4 + (L - 0.8) * hash(k, seed + 21), [cx, cy] = center(z), a = 0.25 + 0.5 * hash(k, seed + 22);
    const x = cx + Math.cos(a * PI) * Ww * 0.42, y = cy + Math.sin(a * PI) * (Hh - 0.06) + 0.02;
    const len = 0.08 + 0.32 * Math.pow(hash(k, seed + 23), 2), pts = [];
    for (let q = 0; q <= 5; q++) { const u = q / 5; pts.push(V3(x + 0.05 * vn(u * 3 + k, seed + 24) * u, y - len * u, z + 0.05 * vn(u * 3 + k, seed + 25) * u)); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.004 + 0.006 * hash(k, seed + 26), 5, false);
    const r = new THREE.Mesh(tg, rootM); r.castShadow = true; G.add(r);
  }
  // loose clods on the floor
  const cl = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.03, 0), plain({ color: 0x7A5842, roughness: 1 }), 60);
  const M4 = new THREE.Matrix4();
  for (let k = 0; k < 60; k++) { const z = L * hash(k, seed + 31), [cx, cy] = center(z), x = cx + (hash(k, seed + 32) - 0.5) * Ww * 0.8, s = 0.4 + 1.2 * hash(k, seed + 33); M4.compose(V3(x, cy + 0.01, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(k, k * 2, k * 3)), V3(s, s * 0.6, s)); cl.setMatrixAt(k, M4); }
  cl.castShadow = true; cl.receiveShadow = true; G.add(cl);
  // end caps (a dead end at the far end, the entrance end closed too: nothing but dark earth past them)
  for (const z of [0, L]) { const [cx, cy] = center(z); const cap = new THREE.Mesh(new THREE.CircleGeometry(Math.max(Ww, Hh), 20), m); cap.position.set(cx, cy + Hh / 2, z); cap.rotation.y = z === 0 ? 0 : PI; G.add(cap); }
  return { group: G, center, L, H: Hh, W: Ww };
}

// the hatch: frame, plank lid under leaf litter (it swings up on its hinge at the -Z edge), the black shaft below
function trapdoor(o = {}) {
  const S = num(o.size, 0.6), G = new THREE.Group(); G.name = 'trapdoor';
  const t0 = num(o.open, null), dur = num(o.dur, 1.2), ang = num(o.angle, 105);
  // the shaft: a real hole in the ground (hole.js): clay walls 2.2 m down, bamboo rungs on the hinge side
  const shaft = pitShell({ w: S * 0.92, d: S * 0.92, depth: num(o.depth, 2.2), mat: plain({ color: 0x6A4A34, map: clayTex(), roughness: 1 }) });
  G.add(shaft.group);
  const rungs = buildRecipe({ parts: [{ shape: 'pole', from: [-S * 0.3, 0, 0], to: [S * 0.3, 0, 0], r: 0.014, mat: 'bamboo', nodes: 0, repeat: { n: 5, step: [0, -0.38, 0] }, pos: [0, -0.3, -S * 0.46 + 0.04] }] }, {});
  drawUnder(rungs.group); G.add(rungs.group);
  const hole = holeMask(shaft.outline, 0.012); hole.name = 'hole'; G.add(hole);
  // a soft dark rim: the earth sloping into the shaft
  const rim = buildRecipe({ parts: [
    { shape: 'box', size: [S + 0.1, 0.04, 0.05], mat: 'earth', color: '#3E2E20', pos: [0, 0.0, -(S + 0.05) / 2] },
    { shape: 'box', size: [S + 0.1, 0.04, 0.05], mat: 'earth', color: '#3E2E20', pos: [0, 0.0, (S + 0.05) / 2] },
    { shape: 'box', size: [0.05, 0.04, S], mat: 'earth', color: '#3E2E20', pos: [-(S + 0.05) / 2, 0.0, 0] },
    { shape: 'box', size: [0.05, 0.04, S], mat: 'earth', color: '#3E2E20', pos: [(S + 0.05) / 2, 0.0, 0] },
  ] }, {});
  G.add(rim.group);
  // the lid (hinged at -Z): planks + leaf litter + twigs on top
  const lid = new THREE.Group(); lid.position.set(0, 0.03, -S / 2); G.add(lid);
  const planks = buildRecipe({ parts: [
    { shape: 'box', size: [S / 5 - 0.006, 0.03, S], mat: 'wood', color: '#5A4430', pos: [-S * 0.4, 0, S / 2], repeat: { n: 5, step: [S / 5, 0, 0] } },
    { shape: 'box', size: [S * 0.98, 0.012, S * 0.98], mat: 'earth', color: '#4A3A26', pos: [0, 0.02, S / 2] },
  ] }, {});
  lid.add(planks.group);
  // leaves: small flat instanced ovals, brown and green
  const leafG = new THREE.CircleGeometry(0.035, 7); leafG.scale(1, 0.5, 1); leafG.rotateX(-PI / 2);
  const leaves = new THREE.InstancedMesh(leafG, plain({ color: 0x6E5A34, roughness: 0.9, side: THREE.DoubleSide }), 160);
  const col = new THREE.Color(), M4 = new THREE.Matrix4();
  for (let k = 0; k < 160; k++) {
    const x = (hash(k, 3) - 0.5) * S * 1.02, z = hash(k, 4) * S * 1.02 - 0.01;
    M4.compose(V3(x, 0.03 + 0.004 * hash(k, 5), z), new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(k, 6) - 0.5) * 0.4, hash(k, 7) * TAU, (hash(k, 8) - 0.5) * 0.4)), V3(1 + hash(k, 9), 1, 1 + hash(k, 9)));
    leaves.setMatrixAt(k, M4); col.setHSL(0.08 + 0.12 * hash(k, 10), 0.45, 0.18 + 0.14 * hash(k, 11)); leaves.setColorAt(k, col);
  }
  leaves.castShadow = true; leaves.receiveShadow = true; lid.add(leaves);
  G.traverse((m) => { if (m.isMesh && m !== hole) { m.receiveShadow = true; m.castShadow = m.renderOrder !== UNDER; } });
  const update = (t) => { if (t0 == null) { lid.rotation.x = 0; return; } lid.rotation.x = -ang * PI / 180 * sm((t - t0) / dur); };
  return { group: G, update, hole, lid };
}

export const CATALOG = {
  'interior.crawl_tunnel': {
    desc: 'a hand-dug earthen CRAWLWAY (Cu Chi-style tunnel): 0.8 m high, 0.7 m wide, red-brown laterite clay with pick marks, a flat trodden floor, roots hanging through the low arched roof, loose clods; PITCH DARK by default: no sun, sky or fill, only the scene\'s own lights read (a figure with the flashlight accessory, a prop.flashlight, a muzzle flash). Film inside with a keys camera and "limits": "macro". A crawler: cast action crawl or belly_crawl with a path along the tunnel line',
    params: { at: '[x, z] the entrance end', heading: 'deg: the tunnel runs that way from `at`', length: 'm (12)', height: 'm (0.8)', width: 'm (0.7)', curve: '0..1 wandering of the walls (0.06; a straight crawl path stays clear up to ~0.1)', roots: '0..3 density (1)', dark: 'true (pitch dark) | false (the scene\'s light)', color: 'clay hex' },
    footprint: [0.9, 12], height: 0.85, anchors: ['entrance', 'mid', 'end'], tags: ['interior', 'tunnel', 'crawl', 'underground', 'dark', 'cu chi', 'vietnam', 'earth', 'cave', 'passage'],
  },
  'prop.trapdoor': {
    desc: 'a camouflaged TRAPDOOR flush with the jungle floor: a plank hatch under leaf litter and dirt in a frame, hinged at one edge; open: t swings it up and shows the shaft (a REAL hole in any world\'s ground: clay walls 2.2 m down, bamboo rungs). A figure climbs down into it: cast at the hatch centre, action climb_down (t after the hatch is open)',
    params: { at: '[x, z]', heading: 'deg: the hinge side faces away from it', size: 'm (0.6)', open: 's: when it swings open (omit = closed)', dur: 's (1.2)', angle: 'deg (105)', depth: 'm (2.2) the shaft' },
    footprint: [0.7, 0.7], height: 0.05, anchors: ['hole', 'lid'], tags: ['prop', 'trapdoor', 'hatch', 'tunnel', 'entrance', 'hidden', 'camouflage', 'jungle', 'cu chi'],
  },
};
export async function build(kind, item = {}, ctx = {}) {
  const Gd = ground(ctx), at = xz(item.at), y = Gd.h(at[0], at[1]);
  const root = new THREE.Group(); root.name = kind; root.position.set(at[0], y, at[1]);
  root.rotation.y = yawFromHeading(item.heading ?? 180);
  const P = { ...item };
  if (kind === 'interior.crawl_tunnel') {
    const T = crawlTunnel(P); root.add(T.group);
    const anchors = {};
    for (const [n, z] of [['entrance', 0.6], ['mid', T.L / 2], ['end', T.L - 0.6]]) { const [cx, cy] = T.center(z); const a = new THREE.Object3D(); a.position.set(cx, cy + T.H * 0.45, z); T.group.add(a); anchors[n] = a; }
    patchAll(root, ctx);
    return { root, radius: T.L / 2, height: T.H, anchors: { ...anchors, center: anchors.mid }, update() {}, interior: true, pitchDark: P.dark !== false, contact: false };
  }
  const D = trapdoor(P); root.add(D.group);
  patchAll(root, ctx);
  return { root, radius: 0.5, height: 0.06, anchors: { hole: D.hole, lid: D.lid }, update: (t) => D.update(t), contact: false };
}
