// glienicke.js — landmark.glienicke: the Glienicke Bridge between Potsdam and West Berlin as it stood on 10 February
// 1962, when Francis Gary Powers was exchanged for Rudolf Abel on it ("the bridge of spies"). Not a module (landmarks.js
// builds it; its catalog entry is look-gated to NOCTURNE). A 128 m steel cantilever truss over the Havel: the two
// trusses rise to their peaks over the river piers and dip at mid-span (the bridge's camel-back outline), lattice
// verticals and diagonals, overhead bracing where the trusses are tall, a road between them with raised sidewalks and
// railings, cast-iron lamp posts with glowing lanterns, THE WHITE LINE painted across the deck where the two sides met,
// stone piers in the river and stone quay walls under the approach embankments. Its deck and its banks are GROUND for
// everything built after it (cars, people, crowds stand on them: ctx.ground.height is extended over its footprint), so
// it goes first in "objects". Model frame: the bridge axis is +Z (the heading), x across; the group origin is the water
// level under the middle of the bridge; the deck is DECK m above it. Deterministic, static.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plain } from '../shared/materials.js';

const DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const GL_DECK = 7.0, GL_HALF = 64, GL_TRUSS_X = 10.6, GL_ROAD = 8.0;

function rod(a, b, r, seg = 4) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1); g.rotateY(Math.PI / 4); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate(A.x, A.y, A.z);
}
const ix = (g) => { if (g.index === null) g.setIndex([...Array(g.attributes.position.count).keys()]); if (g.attributes.uv) g.deleteAttribute('uv'); return g; };
const merge = (list) => mergeGeometries(list.map((g) => ix(g)));
// the top chord's height above the deck along the bridge (z in [-64, 64]): low at the ends, peaks over the piers
// (z = +-37), a dip at mid-span — the camel-back outline of a cantilever truss
function topH(z) {
  const a = Math.abs(z), P = 37;
  if (a >= P) { const u = (a - P) / (GL_HALF - P); return 10.2 - 6.6 * u * u * (3 - 2 * u) * 0.95; }
  const u = a / P; return 5.6 + 4.6 * u * u;
}

// o: {line_at (z of the white line, default 0), lamps (true), lights (n real lights, default 4), banks (true), length}
export function buildGlienicke(o = {}) {
  const group = new THREE.Group(); group.name = 'glienicke';
  const steel = plain({ color: 0x56655B, roughness: 0.55, metalness: 0.35 });
  const asphalt = plain({ color: 0x29292C, roughness: 0.9 });
  const curb = plain({ color: 0x77766F, roughness: 0.85 });
  const stone = plain({ color: 0x5E5A52, roughness: 0.9 });
  const earth = plain({ color: 0x2A2D24, roughness: 0.95 });
  const iron = plain({ color: 0x141516, roughness: 0.6, metalness: 0.4 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xFFE0B0, emissive: 0xFFC27A, emissiveIntensity: 3.2, roughness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xEEECE4, emissive: 0x9A988E, emissiveIntensity: 0.25, roughness: 0.7 });
  const add = (g, m, name, cast = true) => { const x = new THREE.Mesh(g, m); x.name = name; x.castShadow = cast; x.receiveShadow = true; group.add(x); return x; };
  const D = GL_DECK, H = GL_HALF, TX = GL_TRUSS_X;

  // deck: the road slab, the girder under it, the sidewalks + curbs, the railings on the inner side of the trusses
  add(new THREE.BoxGeometry(2 * (TX + 0.4), 0.5, 2 * H).translate(0, D - 0.25, 0), asphalt, 'glienicke.deck');
  add(new THREE.BoxGeometry(2 * TX - 1, 1.3, 2 * H).translate(0, D - 1.15, 0), steel, 'glienicke.girder');
  for (const s of [1, -1]) {
    add(new THREE.BoxGeometry(TX - GL_ROAD - 0.3, 0.22, 2 * H).translate(s * (GL_ROAD + (TX - GL_ROAD - 0.3) / 2), D + 0.11, 0), curb, 'glienicke.sidewalk');
    const rl = [];
    rl.push(rod([s * (TX - 0.5), D + 1.05, -H], [s * (TX - 0.5), D + 1.05, H], 0.035));
    rl.push(rod([s * (TX - 0.5), D + 0.55, -H], [s * (TX - 0.5), D + 0.55, H], 0.025));
    for (let z = -H; z <= H; z += 2.2) rl.push(rod([s * (TX - 0.5), D + 0.22, z], [s * (TX - 0.5), D + 1.05, z], 0.02));
    add(merge(rl), iron, 'glienicke.railing');
  }
  // the white line across the road (and a thin dash on the sidewalks)
  const lineZ = Number.isFinite(+o.line_at) ? clamp(+o.line_at, -H + 2, H - 2) : 0;
  const line = add(new THREE.PlaneGeometry(2 * TX - 1.2, 0.55).rotateX(-Math.PI / 2).translate(0, D + 0.235, lineZ), white, 'glienicke.line', false);
  line.material = white.clone(); line.material.polygonOffset = true; line.material.polygonOffsetFactor = -2;

  // the two trusses: bottom chord on the deck edge, the camel-back top chord, verticals every panel, alternating diagonals
  const NP = 28, PL = 2 * H / NP;
  for (const s of [1, -1]) {
    const parts = [], x = s * TX, yb = D + 0.25;
    parts.push(new THREE.BoxGeometry(0.55, 0.7, 2 * H).translate(x, yb + 0.1, 0));
    for (let k = 0; k < NP; k++) {
      const z0 = -H + k * PL, z1 = z0 + PL;
      parts.push(rod([x, yb + topH(z0), z0], [x, yb + topH(z1), z1], 0.32));                     // top chord
      parts.push(rod([x, yb, z0], [x, yb + topH(z0), z0], 0.17));                                 // vertical
      if (k % 2 === 0) parts.push(rod([x, yb, z0], [x, yb + topH(z1), z1], 0.13)); else parts.push(rod([x, yb + topH(z0), z0], [x, yb, z1], 0.13));
      if (topH((z0 + z1) / 2) > 7) parts.push(rod([x, yb + 0.5 * topH(z0), z0], [x, yb + 0.5 * topH(z1), z1], 0.08));   // a mid rail in the tall panels
    }
    parts.push(rod([x, yb, H], [x, yb + topH(H), H], 0.24));
    add(merge(parts), steel, 'glienicke.truss');
  }
  // overhead bracing where the trusses are tall enough for traffic (> 7 m): struts + X-bracing + portal frames
  {
    const br = [], yb = D + 0.25;
    for (let k = 0; k <= NP; k++) {
      const z = -H + k * PL, h = topH(z);
      if (h < 7.2) continue;
      br.push(rod([-TX, yb + h, z], [TX, yb + h, z], 0.16));
      const z1 = z + PL, h1 = topH(z1);
      if (k < NP && h1 >= 7.2) { br.push(rod([-TX, yb + h, z], [TX, yb + h1, z1], 0.07)); br.push(rod([TX, yb + h, z], [-TX, yb + h1, z1], 0.07)); }
      if (topH(z - PL) < 7.2 || h1 < 7.2) for (const s of [1, -1]) br.push(rod([s * TX, yb + h - 1.6, z], [s * (TX - 2.4), yb + h, z], 0.12));   // portal knee braces
    }
    add(merge(br), steel, 'glienicke.bracing');
  }
  // piers in the river (stone, cutwaters up- and downstream) and the quay walls under the embankments
  for (const z of [-37, 37]) {
    const g = new THREE.BoxGeometry(2 * TX + 4, D + 3, 5.5).translate(0, (D + 3) / 2 - 3.6, z);
    add(g, stone, 'glienicke.pier');
    for (const s of [1, -1]) add(new THREE.CylinderGeometry(2.75, 2.75, D + 3, 3).rotateY(s > 0 ? Math.PI / 6 : -Math.PI / 6 + Math.PI).translate(s * (TX + 2), (D + 3) / 2 - 3.6, z), stone, 'glienicke.cutwater');
  }
  if (o.banks !== false) {
    const BW = 170, BL = 240;
    for (const s of [1, -1]) {
      add(new THREE.BoxGeometry(2 * BW, D + 4, BL).translate(0, (D + 4) / 2 - 4, s * (H + BL / 2)), earth, 'glienicke.bank');
      add(new THREE.BoxGeometry(2 * BW, D + 4, 1.2).translate(0, (D + 4) / 2 - 4, s * (H + 0.6)), stone, 'glienicke.quay');
      add(new THREE.BoxGeometry(2 * GL_ROAD + 1, 0.06, BL).translate(0, D + 0.03, s * (H + BL / 2)), asphalt, 'glienicke.road', false);
      for (const sx of [1, -1]) add(new THREE.BoxGeometry(1.2, 1.1, 3).translate(sx * (TX + 0.2), D + 0.55, s * (H + 1.5)), stone, 'glienicke.abutment_post');
    }
  }
  // lamp posts along the sidewalks: a cast-iron post, an arm, a glowing lantern (+ a few real lights nearest the line)
  const lampsZ = [];
  if (o.lamps !== false) {
    const posts = [];
    for (const s of [1, -1]) for (let z = -H + 8; z <= H - 8; z += 16) {
      const x = s * (GL_ROAD + 0.35);
      posts.push(rod([x, D + 0.22, z], [x, D + 5.8, z], 0.07, 8)); posts.push(rod([x, D + 5.8, z], [x - s * 0.9, D + 6.1, z], 0.04, 6));
      add(new THREE.SphereGeometry(0.24, 12, 8).translate(x - s * 0.9, D + 5.85, z), glow, 'glienicke.lantern', false);
      lampsZ.push([x - s * 0.9, D + 5.75, z]);
    }
    add(merge(posts), iron, 'glienicke.lamp_posts');
    const nl = Math.max(0, Math.min(8, Math.round(Number.isFinite(+o.lights) ? +o.lights : 4)));
    lampsZ.slice().sort((a, b) => Math.abs(a[2] - lineZ) - Math.abs(b[2] - lineZ)).slice(0, nl).forEach((p) => {
      const L = new THREE.PointLight(0xFFC890, 28, 26, 1.6); L.position.set(...p); L.castShadow = false; group.add(L);
    });
  }
  // anchors (objects:N.<anchor>): the line in the middle of the road, the line at each sidewalk, both ends of the
  // bridge on the road, a truss peak, the deck under the peak
  const anchors = {};
  const A = (k, x, y, z) => { const a = new THREE.Object3D(); a.name = 'anchor:' + k; a.position.set(x, y, z); group.add(a); anchors[k] = a; };
  A('line', 0, D + 0.25, lineZ); A('line_l', GL_ROAD + 1, D + 0.33, lineZ); A('line_r', -(GL_ROAD + 1), D + 0.33, lineZ);
  A('east_end', 0, D + 0.25, H - 4); A('west_end', 0, D + 0.25, -H + 4); A('peak', TX, D + 0.25 + topH(37), 37); A('deck', 0, D + 0.25, 0);
  return { group, anchors, deck: D, half: H, lineZ };
}

// the deck and the banks as ground for whatever is built after the bridge: a height function in the bridge's frame
export function glienickeHeight(lx, lz, base, banks = true) {
  const D = GL_DECK, H = GL_HALF, TX = GL_TRUSS_X;
  if (Math.abs(lz) <= H && Math.abs(lx) <= TX - 0.5) return base + D + (Math.abs(lx) > GL_ROAD ? 0.22 : 0.0);
  if (banks && Math.abs(lz) > H && Math.abs(lz) <= H + 240 && Math.abs(lx) <= 170) return base + D;
  return null;
}
