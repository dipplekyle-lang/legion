// cutaway.js — cutaway.tunnels: the GROUND CUT OPEN (E1 specificity kit, 2026-09-29). "Their base sat squarely above an
// underground fortress": a long excavation in any world's ground (a real hole, hole.js) whose far wall is a SECTION through
// the earth: the tunnel network in red clay below the surface - crawlways at three levels, chambers (a meeting room, a
// sleeping chamber with hammocks, a kitchen with a smoke vent), shafts up to trapdoors on the surface, a flooded U-bend
// (the water lock) - lit by small oil lamps. Put landmark.firebase just behind the section (at + heading: the base's
// `at` = this `at` moved `depth_back` m along -heading, see `base_at`), so the tents stand on the surface right over it.
// Camera: in front of the excavation, 5-9 m up, looking at the section face (anchors: face, level1, level2, level3).
import * as THREE from 'three';
import { plain } from '../shared/materials.js';
import { ground, xz, yawFromHeading, patchAll } from './common.js';
import { holeMask, drawUnder, UNDER } from './hole.js';
import { clamp, lerp } from '../shared/util.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// the network, in the face's coordinates: x across (m), y down from the surface (negative), r = the tunnel's half height
function network(W) {
  const h = W / 2;
  const tun = [                                   // crawlways running along the section: [x0, x1, y, halfHeight]
    [-h + 1.5, h - 2.5, -2.0, 0.42], [-h + 3.0, h - 1.5, -4.4, 0.42], [-h + 2.0, h * 0.2, -6.8, 0.42], [h * 0.45, h - 2.0, -6.8, 0.42],
  ];
  const rooms = [                                 // chambers: [x, y (floor), w, h, kind]
    [-h * 0.45, -4.85, 3.2, 1.7, 'meeting'], [h * 0.35, -4.85, 2.8, 1.6, 'sleep'], [-h * 0.1, -2.45, 2.4, 1.4, 'kitchen'], [h * 0.72, -7.25, 2.2, 1.4, 'store'],
  ];
  const shafts = [                                // vertical shafts: [x, yTop, yBottom] (yTop 0 = a trapdoor on the surface)
    [-h + 2.2, 0, -2.0], [h * 0.55, 0, -2.0], [-h * 0.72, -2.0, -4.4], [h * 0.15, -2.0, -4.4], [-h * 0.3, -4.4, -6.8],
  ];
  const holes = [[-h * 0.62, -2.0], [h * 0.05, -4.4], [h * 0.82, -4.4], [-h * 0.05, -6.8]];   // tunnels leaving the section at right angles
  const ubend = [h * 0.2, h * 0.45, -6.8, 1.1];                                         // the water lock: x0, x1, y, dip
  return { tun, rooms, shafts, holes, ubend };
}
// the face's alpha: the network is cut out (transparent), the earth solid, with soil layers painted in
function faceTex(W, D, N) {
  const ppm = 48, cw = Math.round(W * ppm), ch = Math.round(D * ppm);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  // soil layers: topsoil, laterite clay (red-brown), deeper ochre clay, with streaks and stones
  const grd = g.createLinearGradient(0, 0, 0, ch);
  grd.addColorStop(0, '#3E2E1E'); grd.addColorStop(0.06, '#5A3E28'); grd.addColorStop(0.12, '#8A4E30'); grd.addColorStop(0.55, '#9A5A36'); grd.addColorStop(0.8, '#A26A3C'); grd.addColorStop(1, '#8C6038');
  g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 2600; i++) { const x = hash(i, 1) * cw, y = hash(i, 2) * ch, r = 1 + 4 * hash(i, 3) ** 3; g.fillStyle = hash(i, 4) < 0.5 ? 'rgba(40,24,14,0.25)' : 'rgba(210,150,100,0.18)'; g.beginPath(); g.ellipse(x, y, r * 2.2, r, 0, 0, TAU); g.fill(); }
  for (let k = 0; k < 7; k++) { const y0 = (0.1 + 0.12 * k + 0.03 * hash(k, 9)) * ch; g.strokeStyle = 'rgba(60,30,15,0.18)'; g.lineWidth = 2 + 3 * hash(k, 8); g.beginPath(); for (let x = 0; x <= cw; x += 20) { const y = y0 + 6 * Math.sin(x * 0.01 + k) + 4 * Math.sin(x * 0.037 + k * 3); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  // roots in the topsoil
  g.strokeStyle = 'rgba(35,22,12,0.7)';
  for (let i = 0; i < 60; i++) { let x = hash(i, 11) * cw, y = 0.04 * ch; g.lineWidth = 1 + 2 * hash(i, 12); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(i * 7 + k, 13) - 0.5) * 30; y += 8 + 14 * hash(i * 7 + k, 14); g.lineTo(x, y); } g.stroke(); }
  const col = g.getImageData(0, 0, cw, ch);
  // alpha: cut the network out
  const a = document.createElement('canvas'); a.width = cw; a.height = ch; const ga = a.getContext('2d');
  ga.fillStyle = '#fff'; ga.fillRect(0, 0, cw, ch); ga.fillStyle = '#000'; ga.strokeStyle = '#000';
  const X = (x) => (x + W / 2) * ppm, Y = (y) => -y * ppm;
  const arch = (x0, x1, yF, hh) => { ga.beginPath(); ga.moveTo(X(x0), Y(yF)); ga.lineTo(X(x1), Y(yF)); ga.lineTo(X(x1), Y(yF + hh * 1.3)); ga.quadraticCurveTo(X((x0 + x1) / 2), Y(yF + hh * 2.2), X(x0), Y(yF + hh * 1.3)); ga.closePath(); ga.fill(); };
  for (const [x0, x1, y, hh] of N.tun) arch(x0, x1, y - hh, hh);
  for (const [x, yF, w, hh] of N.rooms) arch(x - w / 2, x + w / 2, yF, hh / 1.6);
  for (const [x, yT, yB] of N.shafts) { ga.fillRect(X(x - 0.35), Y(yT), 0.7 * ppm, (yT - yB) * ppm + 0.2 * ppm); }
  for (const [x, y] of N.holes) { ga.beginPath(); ga.ellipse(X(x), Y(y - 0.05), 0.4 * ppm, 0.45 * ppm, 0, 0, TAU); ga.fill(); }
  { const [x0, x1, y, dip] = N.ubend; ga.lineWidth = 0.8 * ppm; ga.lineCap = 'round'; ga.beginPath(); ga.moveTo(X(x0), Y(y - 0.1)); ga.bezierCurveTo(X(x0 + 0.3), Y(y - dip), X(x1 - 0.3), Y(y - dip), X(x1), Y(y - 0.1)); ga.stroke(); }
  const ad = ga.getImageData(0, 0, cw, ch).data;
  // darken the rim round every opening (the cut edge in shadow)
  for (let i = 0; i < col.data.length; i += 4) col.data[i + 3] = ad[i];
  g.putImageData(col, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, mask: ga, ppm, X, Y };
}

function buildCutaway(ctx, P, root) {
  const W = num(P.width, 30), D = num(P.depth, 8.5), Lx = num(P.opening, 12);      // section width, depth, the excavation's depth toward the camera
  const G = new THREE.Group(); G.name = 'cutaway'; root.add(G);
  const N = network(W);
  // the cover over the opening sits just above the highest terrain inside it; every wall reaches exactly that high
  const Gd = ground(ctx); root.updateMatrixWorld(true);
  let top = -Infinity; const w = V3();
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 6; j++) { w.set(-W / 2 + W * i / 12, 0, Lx * j / 6); root.localToWorld(w); top = Math.max(top, Gd.h(w.x, w.z)); }
  const coverY = Math.max(0, top - root.position.y) + 0.015;
  const clay = plain({ color: 0x9A5C3A, roughness: 1 }), clayD = plain({ color: 0x6E4028, roughness: 1 }), earth = plain({ color: 0x5E4430, roughness: 1 });
  // the section face at z = 0 (the excavation lies at z > 0, toward the camera)
  const F = faceTex(W, D, N);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, D), plain({ map: F.tex, alphaTest: 0.5, roughness: 0.97, side: THREE.FrontSide }));
  face.position.set(0, -D / 2, 0); face.receiveShadow = true; face.castShadow = true; face.name = 'section_face'; G.add(face);
  // a strip of plain earth above the face's top edge (up to the cover) and a dark backing behind the whole network:
  // no sliver of sky shows through a gap between a cut-out and its recess (test still c1: white edges at the U-bend)
  if (coverY > 0.004) { const lip = new THREE.Mesh(new THREE.PlaneGeometry(W, coverY), plain({ color: 0x3E2E1E, roughness: 1 })); lip.position.set(0, coverY / 2, 0.002); G.add(lip); }
  const backing = new THREE.Mesh(new THREE.PlaneGeometry(W + 1, D + 1), plain({ color: 0x1A120C, roughness: 1 })); backing.position.set(0, -D / 2, -3.2); G.add(backing);
  // behind the face: the tunnels' insides (recesses 0.9 m deep), rooms (2 m deep), shafts, cross holes
  const shell = (w, h, d, x, yF, m = clay) => {
    const B = new THREE.Group(); B.position.set(x, yF, -d / 2);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h + 0.4), m); back.position.set(0, h / 2, -d / 2); B.add(back);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-PI / 2), clayD); B.add(floor);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(PI / 2), m); roof.position.y = h + 0.3; B.add(roof);
    for (const s of [1, -1]) { const wl = new THREE.Mesh(new THREE.PlaneGeometry(d, h + 0.4), m); wl.position.set(s * w / 2, h / 2, 0); wl.rotation.y = -s * PI / 2; B.add(wl); }
    B.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; } });
    G.add(B); return B;
  };
  for (const [x0, x1, y, hh] of N.tun) shell(x1 - x0 + 0.2, hh * 2.3, 0.9, (x0 + x1) / 2, y - hh);
  const lamps = [];
  for (const [x, yF, w, hh, kind] of N.rooms) {
    const B = shell(w + 0.2, hh * 1.45, 2.0, x, yF);
    // furniture in silhouette: a low table + stools (meeting), hammocks (sleep), a clay stove + vent pipe (kitchen), crates (store)
    const add = (g, m, px, py, pz) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.castShadow = true; B.add(o); return o; };
    const wood = plain({ color: 0x4A3424, roughness: 0.9 });
    if (kind === 'meeting') { add(new THREE.BoxGeometry(1.2, 0.06, 0.6), wood, 0, 0.45, 0.1); for (const s of [-0.5, 0.5]) add(new THREE.BoxGeometry(0.06, 0.45, 0.5), wood, s, 0.22, 0.1); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.3, 0.3, 0.3), wood, s * 0.9, 0.15, 0.3); }
    if (kind === 'sleep') for (const s of [-0.7, 0.6]) { const hm = add(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 12, 1, true, PI * 0.1, PI * 0.8).rotateZ(PI / 2), plain({ color: 0x5E5A3A, roughness: 0.95, side: THREE.DoubleSide }), s, 0.75, 0.2); hm.rotation.x = PI; }
    if (kind === 'kitchen') { add(new THREE.BoxGeometry(0.7, 0.4, 0.5), clayD, 0.4, 0.2, -0.3); add(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), plain({ color: 0x2A2018, roughness: 1 }), 0.4, 1.2, -0.5); }
    if (kind === 'store') for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.4, 0.35, 0.4), wood, -0.7 + k * 0.45, 0.18 + (k === 1 ? 0.35 : 0), -0.4);
    // an oil lamp: a warm point light low in the room
    const L = new THREE.PointLight(0xFFB060, num(P.lamps, 1) * 6, 4.5, 2); L.position.set(x - w * 0.25, yF + 0.6, -0.6); G.add(L); lamps.push(L);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 1) })); fl.position.copy(L.position); G.add(fl);
  }
  for (const [x, yT, yB] of N.shafts) shell(0.72, yT - yB - (yT === 0 ? 0.32 : -0.1), 0.8, x, yB);   // a shaft to the surface stays below it
  for (const [x, y] of N.holes) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 3, 16, 1, true).rotateX(PI / 2), plain({ color: 0x5A3422, roughness: 1, side: THREE.BackSide })); t.position.set(x, y + 0.4, -1.5); G.add(t); const cap = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), plain({ color: 0x120C08, roughness: 1 })); cap.position.set(x, y + 0.4, -2.95); G.add(cap); }
  { const [x0, x1, y, dip] = N.ubend; const pts = []; for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push(V3(lerp(x0, x1, u), y - 0.1 - dip * Math.sin(PI * u) ** 2 + 0.4, -0.45)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.5, 12, false), plain({ color: 0x8A5234, roughness: 1, side: THREE.BackSide })); G.add(tube);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.6, 0.9).rotateX(-PI / 2), plain({ color: 0x0C1414, roughness: 0.05 })); water.position.set((x0 + x1) / 2, y - dip + 0.55, -0.45); G.add(water); }
  // trapdoors on the surface over the shafts that reach it
  for (const [x, yT] of N.shafts) if (yT === 0) { const lid = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.7), plain({ color: 0x5A4430, roughness: 0.9 })); lid.position.set(x - 0.2, 0.03, -0.55); lid.rotation.z = 1.2; lid.castShadow = true; G.add(lid); }
  // the excavation: the near wall, the ends and the floor (plain earth), and the hole mask over the opening
  const ex = new THREE.Group(); G.add(ex);
  const wall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), earth); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; ex.add(m); };
  // the walls reach the cover (uneven terrain round the opening: no sliver of sky between a wall's top and the ground)
  const Hw = D + coverY;
  wall(W, Hw, 0, -D + Hw / 2, Lx, PI);                  // near wall (faces the section)
  wall(Lx, Hw, -W / 2, -D + Hw / 2, Lx / 2, PI / 2); wall(Lx, Hw, W / 2, -D + Hw / 2, Lx / 2, -PI / 2);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, Lx).rotateX(-PI / 2), earth); fl.position.set(0, -D, Lx / 2); fl.receiveShadow = true; ex.add(fl);
  drawUnder(G);
  const mask = holeMask([[-W / 2, 0.02], [W / 2, 0.02], [W / 2, Lx], [-W / 2, Lx]], coverY); G.add(mask);
  const anchors = {};
  const A = (n, x, y, z) => { const a = new THREE.Object3D(); a.position.set(x, y, z); G.add(a); anchors[n] = a; };
  A('face', 0, -D * 0.45, 0); A('level1', 0, -2.0, 0); A('level2', 0, -4.4, 0); A('level3', 0, -6.8, 0); A('surface', 0, 0, -3);
  return { anchors, W, D, Lx };
}

export const CATALOG = {
  'cutaway.tunnels': {
    section: 'structures',
    desc: 'the GROUND CUT OPEN in section (Cu Chi tunnels style): a long excavation in the world\'s ground whose far wall is a section through the red laterite: crawlways at three levels (-2, -4.4, -6.8 m), chambers (a meeting room, a sleeping chamber with hammocks, a kitchen with a smoke vent, a store), shafts up to trapdoors on the surface, tunnels leaving the section as round holes, a flooded U-bend (the water lock), lit by small oil lamps; the surface above stays the world\'s ground: put landmark.firebase right behind the section so the base sits over the tunnels. Use a plains / farmland world (trees growing inside the opening would float). Camera: 5-9 m up in front of the excavation, looking at anchor face',
    params: { at: '[x, z] the middle of the section\'s top edge', heading: 'deg: the section faces it (the excavation lies that way, 12 m)', width: 'm (30)', depth: 'm (8.5)', opening: 'm (12) the excavation toward the camera', lamps: '0..2 lamp strength (1)', base_at: 'the firebase goes at `at` moved 17 m against `heading`' },
    footprint: [30, 12], height: 1, anchors: ['face', 'level1', 'level2', 'level3', 'surface'], contact: false,
    tags: ['cutaway', 'section', 'cross-section', 'tunnels', 'underground', 'network', 'cu chi', 'diagram', 'base', 'below'],
  },
};
export async function build(kind, item = {}, ctx = {}) {
  const Gd = ground(ctx), at = xz(item.at), y = Gd.h(at[0], at[1]);
  const root = new THREE.Group(); root.name = kind; root.position.set(at[0], y, at[1]);
  root.rotation.y = yawFromHeading(item.heading ?? 180);
  const C = buildCutaway(ctx, { ...item }, root);
  patchAll(root, ctx);
  return { root, radius: 16, height: 1, anchors: { ...C.anchors, center: C.anchors.face }, update() {}, contact: false, snapped: true };
}
