// b25.js — aircraft.b25: the North American B-25B Mitchell of the Doolittle Raid (18 April 1942, USS Hornet). Not a
// module (vehicles.js builds it; its catalog entry is look-gated to NOCTURNE). Built for the hero shots a documentary
// needs: the deep slab-sided fuselage lofted on real stations, the framed glass bombardier nose, the stepped cockpit
// canopy, the GULL wing (inner panels with dihedral, outer panels flat), two Wright R-2600 radials in big round cowlings
// with three-blade Hamilton props (a blur disc when spinning), nacelles running past the trailing edge, the twin oval
// fins at the tips of a dihedral tailplane, the Bendix dorsal turret, the raiders' black "broomstick" tail guns,
// tricycle gear (down / up / retracting), an opening forward crew hatch with its ladder. Olive drab over neutral grey in
// an object-space shader (panel seams, faded patches, exhaust staining), the 1942 star-with-red-dot insignia, the serial
// in yellow on the fins. Model faces +Z (nose), +X = port; the group origin is the ground contact under the main wheels
// (idle alt 0 = parked), the fuselage axis 2.3 m above it. Deterministic in t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMaterial } from '../shared/env.js';
import { plain } from '../shared/materials.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const B25_AXIS = 2.3;                       // the fuselage axis above the ground contact (gear down)

// ── the paint: olive drab 41 over neutral grey 43, seams, insignia (object space) ─────────────────────────────────
const PAINT_GLSL = /* glsl */`
varying vec3 vBP; varying vec3 vBN;
float bRough;
float bH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float bN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(bH(i), bH(i + vec2(1.0, 0.0)), u.x), mix(bH(i + vec2(0.0, 1.0)), bH(i + vec2(1.0, 1.0)), u.x), u.y); }
float bSeam(float v, float w){ float d = abs(fract(v) - 0.5); float fw = fwidth(v) * 1.3 + w; return smoothstep(0.5 - fw, 0.5, d); }
float bRing(float d, float r){ float fw = fwidth(d) + 1e-4; return 1.0 - smoothstep(r - fw, r + fw, d); }
float bStar(vec2 p, float r){                       // 1 inside a five-point star of outer radius r
  float a = atan(p.x, p.y), l = length(p);
  float k = 6.2831853 / 5.0; a = mod(a + k * 0.5, k) - k * 0.5;
  vec2 q = l * vec2(cos(a), abs(sin(a)));
  float ri = r * 0.382;                              // inner radius of a regular star
  vec2 A = vec2(r, 0.0), B = vec2(ri * cos(k * 0.5), ri * sin(k * 0.5));
  vec2 e = B - A, w = q - A; float c = e.x * w.y - e.y * w.x;
  float fw = fwidth(c) + 1e-4;
  return smoothstep(fw, -fw, c) * step(l, r * 1.05);
}
vec3 bInsignia(vec3 col, vec2 p, float R){          // blue disc, white star, red centre dot (to May 1942)
  float d = length(p);
  col = mix(col, vec3(0.012, 0.022, 0.075), bRing(d, R));
  col = mix(col, vec3(0.62, 0.62, 0.6), bStar(p, R * 0.98) * bRing(d, R));
  col = mix(col, vec3(0.32, 0.012, 0.01), bRing(d, R * 0.3));
  return col;
}
void bPaint(inout vec3 col){
  vec3 P = vBP, N = normalize(vBN);
  vec3 od = vec3(0.072, 0.066, 0.036), grey = vec3(0.21, 0.215, 0.21);
  float up;
#if B_MODE == 1
  up = smoothstep(-0.12, 0.12, N.y);                                   // wings / tailplane: OD on top
#else
  up = smoothstep(-0.55, -0.25, P.y + 0.25 * N.y);                     // fuselage / nacelles: the demarcation low on the sides
#endif
  float fade = bN(P.xz * 0.35 + 3.0) * 0.6 + bN(P.zy * 1.1) * 0.4;
  od *= 0.85 + 0.35 * fade; grey *= 0.9 + 0.15 * fade;
  vec3 base = mix(grey, od, up);
  float seam = max(bSeam(P.z / 0.55, 0.004), bSeam((P.y + P.x * 0.3) / 0.5, 0.003) * step(0.5, abs(N.x)));
#if B_MODE == 1
  seam = 0.55 * max(bSeam(P.x / 1.1, 0.003), bSeam(P.z / 0.7, 0.002));
#endif
  float panel = bH(floor(vec2(P.z / 0.55, P.y / 0.5 + P.x)) + 0.5);
  col = base * (1.0 - 0.28 * seam) * (0.93 + 0.14 * panel);
#if B_MODE == 2
  col = base * (0.93 + 0.14 * panel);
  float ex = smoothstep(0.2, -0.6, P.z) * smoothstep(0.45, 0.0, abs(P.x)) * 0.0;
  col *= 1.0 - ex;
#endif
  bRough = 0.08 * seam + (panel - 0.5) * 0.08;
#if B_MODE == 0
  if (abs(N.x) > 0.5) col = bInsignia(col, vec2(P.z + 4.25, P.y - 0.05), 0.55);   // fuselage sides aft of the wing
  // exhaust stain streaks on the sides behind the wing roots
#elif B_MODE == 1
  if (N.y > 0.2 && P.x > 6.0) col = bInsignia(col, vec2(P.x - 7.6, P.z - 0.45), 0.62);    // upper port wing
  if (N.y < -0.2 && P.x < -6.0) col = bInsignia(col, vec2(P.x + 7.6, P.z - 0.45), 0.62);  // lower starboard wing
#endif
}`;
function paintMat(mode) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.05, envMapIntensity: 0.5 });
  m.userData.progKey = 'b25-paint-' + mode;
  return patchMaterial(m, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBP; varying vec3 vBN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBP = position; vBN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n#define B_MODE ${mode}\n${PAINT_GLSL}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nbPaint(diffuseColor.rgb);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + bRough, 0.05, 1.0);');
  });
}

// ── geometry helpers ───────────────────────────────────────────────────────────────────────────────────────────
// a loft along +Z through stations {z, w (half width), top, bot}; superellipse sections (exponent e: 2 = ellipse)
function loft(st, n = 28, e = 2.6, capA = true, capB = true) {
  const pos = [], idx = [];
  for (const s of st) {
    const cy = (s.top + s.bot) / 2, hh = Math.max(1e-3, (s.top - s.bot) / 2), w = Math.max(1e-3, s.w), ee = s.e ?? e;
    for (let j = 0; j < n; j++) {
      const a = j / n * TAU, c = Math.cos(a), sn = Math.sin(a);
      const x = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / ee), y = cy + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / ee);
      pos.push(x, y, s.z);
    }
  }
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n;
    if (st[i].z > st[i + 1].z) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const cap = (i, flip) => {
    const s = st[i], k = pos.length / 3; pos.push(0, (s.top + s.bot) / 2, s.z);
    for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n; if (flip) idx.push(k, b, a); else idx.push(k, a, b); }
  };
  const desc = st[0].z > st[st.length - 1].z;
  if (capA) cap(0, !desc); if (capB) cap(st.length - 1, desc);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a NACA-like section (le z, chord c, centre y, thickness ratio t) as m points around (TE upper -> LE -> TE lower)
function section(le, c, y, t, m = 18) {
  const out = [];
  for (let k = 0; k <= m; k++) {                        // upper surface TE -> LE
    const u = 1 - k / m, uu = u * u;
    const th = 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * uu + 0.2843 * uu * u - 0.1036 * uu * uu);
    out.push([le - u * c, y + th * c * 1.05]);
  }
  for (let k = 1; k < m; k++) {                         // lower surface LE -> TE
    const u = k / m, uu = u * u;
    const th = 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * uu + 0.2843 * uu * u - 0.1036 * uu * uu);
    out.push([le - u * c, y - th * c * 0.8]);
  }
  return out;                                           // [z, y] pairs
}
// a surface lofted spanwise through sections at x stations: [{x, le, c, y, t}]
function wingLoft(stations, m = 18, capTip = true) {
  const pos = [], idx = [], ring = 2 * m;
  for (const s of stations) for (const [z, y] of section(s.le, s.c, s.y, s.t, m)) pos.push(s.x, y, z);
  for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, c = a + ring, d = b + ring;
    idx.push(a, b, c, b, d, c);
  }
  if (capTip) {
    const i = stations.length - 1, s = stations[i], k = pos.length / 3; pos.push(s.x, s.y, s.le - s.c * 0.4);
    for (let j = 0; j < ring; j++) idx.push(k, i * ring + j, i * ring + (j + 1) % ring);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function mirrorX(g) {
  g = g.clone(); g.scale(-1, 1, 1);
  if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; }
  g.computeVertexNormals(); return g;
}
function rod(a, b, r, seg = 8, r2 = null) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r2 ?? r, r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return g.translate(A.x, A.y, A.z);
}
const ix = (g) => { if (g.index === null) g.setIndex([...Array(g.attributes.position.count).keys()]); if (g.attributes.uv) g.deleteAttribute('uv'); return g; };
const merge = (list) => mergeGeometries(list.map((g) => ix(g)));

// ── the airframe ────────────────────────────────────────────────────────────────────────────────────────────────
const FUS = [                                            // z, half width, top, bottom (axis y 0)
  { z: 6.62, w: 0.6, top: 0.6, bot: -0.8 }, { z: 5.9, w: 0.67, top: 0.74, bot: -0.88 }, { z: 4.6, w: 0.7, top: 0.8, bot: -0.92 },
  { z: 2.0, w: 0.71, top: 0.82, bot: -0.93 }, { z: -0.5, w: 0.7, top: 0.82, bot: -0.92 }, { z: -2.8, w: 0.64, top: 0.76, bot: -0.74 },
  { z: -4.8, w: 0.5, top: 0.66, bot: -0.42 }, { z: -6.4, w: 0.33, top: 0.58, bot: -0.08 }, { z: -7.45, w: 0.18, top: 0.52, bot: 0.16, e: 2.2 },
  { z: -7.95, w: 0.07, top: 0.46, bot: 0.3, e: 2.0 },
];
const NOSE = [                                           // the glazed bombardier nose (glass) from the frame at 6.62
  { z: 6.62, w: 0.6, top: 0.6, bot: -0.8, e: 2.3 }, { z: 7.2, w: 0.52, top: 0.5, bot: -0.66, e: 2.15 }, { z: 7.7, w: 0.38, top: 0.34, bot: -0.48, e: 2.0 },
  { z: 8.02, w: 0.2, top: 0.14, bot: -0.28, e: 2.0 }, { z: 8.16, w: 0.04, top: -0.04, bot: -0.12, e: 2.0 },
];
const CANOPY = [                                         // the stepped cockpit glazing
  { z: 5.95, w: 0.5, top: 0.76, bot: 0.55, e: 2.4 }, { z: 5.45, w: 0.56, top: 1.2, bot: 0.55, e: 3.2 }, { z: 4.55, w: 0.6, top: 1.32, bot: 0.55, e: 3.6 },
  { z: 3.85, w: 0.6, top: 1.28, bot: 0.55, e: 3.6 }, { z: 3.3, w: 0.5, top: 0.98, bot: 0.55, e: 3 }, { z: 2.6, w: 0.3, top: 0.84, bot: 0.55, e: 2.4 },
];
const NAC_X = 3.12, NAC_Y = -0.08, PROP_Z = 4.32, PROP_R = 1.9;
const WING = [                                           // gull: the inner panel with dihedral, the outer panel flat
  { x: 0.55, le: 2.18, c: 3.88, y: 0.02, t: 0.165 }, { x: 2.1, le: 2.1, c: 3.6, y: 0.14, t: 0.16 }, { x: 4.15, le: 1.98, c: 3.18, y: 0.3, t: 0.15 },
  { x: 7.2, le: 1.68, c: 2.3, y: 0.31, t: 0.12 }, { x: 9.6, le: 1.4, c: 1.62, y: 0.3, t: 0.1 }, { x: 10.28, le: 1.26, c: 1.18, y: 0.3, t: 0.09 },
];
const TAIL_Y = 0.42, TAIL_DIH = 7 * DEG;
const TAILPLANE = [{ x: 0.2, le: -5.62, c: 1.95, y: TAIL_Y, t: 0.11 }, { x: 3.42, le: -5.86, c: 1.55, y: TAIL_Y + 3.22 * Math.tan(TAIL_DIH), t: 0.09 }];

function nacelleGeo() {                                  // a lathe along z: the cowl (open front), the nacelle tapering aft
  const pts = [[PROP_Z - 0.14, 0.58], [PROP_Z - 0.18, 0.72], [PROP_Z - 0.4, 0.76], [PROP_Z - 1.1, 0.76], [PROP_Z - 1.3, 0.74],
    [2.2, 0.68], [0.8, 0.66], [-0.6, 0.6], [-1.6, 0.46], [-2.5, 0.24], [-3.05, 0.05]];
  const g = new THREE.LatheGeometry(pts.slice().reverse().map(([z, r]) => new THREE.Vector2(r, z)), 32);
  g.rotateX(Math.PI / 2);                                   // lathe y -> z (rotateX +90: y -> z)
  // squash the lower half deeper (the gear well) and the upper half into the wing
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setY(i, y < 0 ? y * 1.12 : y * 0.96); }
  g.computeVertexNormals();
  return g;
}
function finShape() {                                    // the oval-ended rectangular fin (side view, z along x)
  const s = new THREE.Shape(), c = 1.72, h0 = -0.78, h1 = 1.86;
  s.moveTo(0.25, h0); s.lineTo(c - 0.35, h0); s.quadraticCurveTo(c, h0, c, h0 + 0.42); s.lineTo(c - 0.05, h1 - 0.5);
  s.quadraticCurveTo(c - 0.1, h1, c - 0.62, h1); s.lineTo(0.42, h1); s.quadraticCurveTo(0.0, h1, 0.0, h1 - 0.55);
  s.lineTo(0.0, h0 + 0.3); s.quadraticCurveTo(0.0, h0, 0.25, h0);
  return s;
}
function bladeGeo() {                                    // a Hamilton Standard blade: a paddle with a twist-like taper
  const s = new THREE.Shape(); const r0 = 0.22, r1 = PROP_R;
  s.moveTo(-0.06, r0); s.quadraticCurveTo(-0.15, r0 + 0.5, -0.13, r1 * 0.55); s.quadraticCurveTo(-0.11, r1 - 0.12, -0.04, r1);
  s.lineTo(0.05, r1); s.quadraticCurveTo(0.12, r1 - 0.2, 0.12, r1 * 0.6); s.quadraticCurveTo(0.12, r0 + 0.4, 0.06, r0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.018); g.rotateY(18 * DEG);
  return g;
}

// o: {serial, gear: 'down'|'up'|'auto', hatch, props: 'spin'|'still', color}; -> {group, body, props, span, length, cruise, update, anchors, solid}
export function buildB25(o = {}) {
  const group = new THREE.Group(); group.name = 'b25';
  const body = new THREE.Group(); body.name = 'b25.body'; body.position.y = B25_AXIS; group.add(body);
  const fusM = paintMat(0), wingM = paintMat(1), nacM = paintMat(0);
  const metal = plain({ color: 0x2C2D2E, roughness: 0.45, metalness: 0.6 });
  const black = plain({ color: 0x0B0B0C, roughness: 0.6 });
  const tyre = plain({ color: 0x111111, roughness: 0.9 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x182028, roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.72, envMapIntensity: 1.4, depthWrite: true });
  patchMaterial(glassM);
  const frameM = plain({ color: 0x1E1D16, roughness: 0.7 });
  const yellow = plain({ color: 0xC9A21E, roughness: 0.6 });
  const add = (g, m, name, parent = body) => { const x = new THREE.Mesh(g, m); x.name = name; x.castShadow = x.receiveShadow = true; parent.add(x); return x; };

  // fuselage + tail cone, the glazed nose with its frames, the cockpit glazing with its frames
  add(loft(FUS, 32, 2.6, false, true), fusM, 'b25.fuselage');
  add(loft(NOSE, 32, 2.2, false, false), glassM, 'b25.nose_glass');
  const frames = [];
  for (const k of [0, 2]) {                              // ring frames of the nose
    const s = NOSE[k], cy = (s.top + s.bot) / 2, hh = (s.top - s.bot) / 2;
    const ring = new THREE.TorusGeometry(1, 0.014 / Math.max(0.2, s.w), 4, 32); ring.scale(s.w * 1.01, hh * 1.01, 1); ring.translate(0, cy, s.z); frames.push(ring);
  }
  for (const a of [-50, 0, 50, 180]) {                   // longitudinal bars
    const pts = NOSE.slice(0, 4).map((s) => { const cy = (s.top + s.bot) / 2, hh = (s.top - s.bot) / 2, r = a * DEG; return [Math.sin(r) * s.w * 1.01, cy + Math.cos(r) * hh * 1.01, s.z]; });
    for (let i = 0; i < pts.length - 1; i++) frames.push(rod(pts[i], pts[i + 1], 0.014, 4));
  }
  add(loft(CANOPY, 24, 3, true, true), glassM, 'b25.canopy');
  for (const z of [5.45, 4.55, 3.85]) { const s = CANOPY.find((q) => q.z === z); frames.push(new THREE.BoxGeometry(s.w * 2.02, 0.04, 0.05).translate(0, s.top - 0.01, z)); for (const sx of [-1, 1]) frames.push(new THREE.BoxGeometry(0.04, s.top - 0.55, 0.05).translate(sx * s.w, (s.top + 0.55) / 2, z)); }
  frames.push(new THREE.BoxGeometry(0.05, 0.05, 2.9).translate(0, 1.31, 4.55));
  add(merge(frames), frameM, 'b25.frames');
  // the nose gun (a .30 cal through the glazing) and the antenna mast
  add(rod([0.12, -0.18, 7.9], [0.14, -0.22, 8.75], 0.025, 6), black, 'b25.nose_gun');
  add(rod([0, 0.82, 2.4], [0, 1.25, 2.1], 0.025, 6), black, 'b25.mast');

  // the gull wing (both sides), the nacelles, the cowls' engine faces, exhaust stubs
  const wg = wingLoft(WING, 20);
  add(wg, wingM, 'b25.wing_l'); add(mirrorX(wg), wingM, 'b25.wing_r');
  const ng = nacelleGeo().translate(NAC_X, NAC_Y, 0);
  add(ng, nacM, 'b25.nacelle_l'); add(mirrorX(ng), nacM, 'b25.nacelle_r');
  for (const s of [1, -1]) {
    const face = new THREE.CircleGeometry(0.6, 28); face.translate(s * NAC_X, NAC_Y, PROP_Z - 0.3); add(face, black, 'b25.engine_face');
    const cyls = [];
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; cyls.push(new THREE.CylinderGeometry(0.075, 0.09, 0.32, 8).rotateX(Math.PI / 2).translate(s * NAC_X + Math.cos(a) * 0.43, NAC_Y + Math.sin(a) * 0.43, PROP_Z - 0.42)); }
    add(merge(cyls), metal, 'b25.cylinders');
    add(new THREE.SphereGeometry(0.2, 14, 8).scale(1, 1, 0.9).translate(s * NAC_X, NAC_Y, PROP_Z - 0.06), metal, 'b25.hub_cap');
    for (const sx of [1, -1]) add(rod([s * NAC_X + sx * 0.66, NAC_Y - 0.25, PROP_Z - 1.6], [s * NAC_X + sx * 0.7, NAC_Y - 0.32, PROP_Z - 2.3], 0.07, 6), black, 'b25.exhaust');
  }

  // the tailplane with dihedral, the twin oval fins at its tips (rudders), the serial in yellow
  const tp = wingLoft(TAILPLANE, 14);
  add(tp, wingM, 'b25.tailplane_l'); add(mirrorX(tp), wingM, 'b25.tailplane_r');
  const fin = new THREE.ExtrudeGeometry(finShape(), { depth: 0.13, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 10 });
  fin.translate(0, 0, -0.065); fin.rotateY(Math.PI / 2);    // shape x -> -z: the fin runs aft from its leading edge
  const finY = TAIL_Y + 3.42 * Math.tan(TAIL_DIH);
  for (const s of [1, -1]) add(fin.clone().translate(s * 3.42, finY, -5.55), fusM, 'b25.fin');
  { // the serial "40-2344" on the outer face of each fin (a small canvas decal)
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 64); g.fillStyle = '#E2B21C'; g.font = 'bold 46px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(o.serial || '02344'), 128, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const dm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    patchMaterial(dm);
    for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.24), dm); p.rotation.y = s * Math.PI / 2; p.position.set(s * (3.42 + 0.1), finY + 0.62, -6.35); p.name = 'b25.serial'; p.userData.noQA = true; body.add(p); }
  }
  // the Bendix dorsal turret (ring + dome + twin .50s), the raiders' broomstick tail guns, the astrodome
  add(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 24).translate(0, 0.74, -3.45), metal, 'b25.turret_ring');
  add(new THREE.SphereGeometry(0.46, 20, 10, 0, TAU, 0, Math.PI / 2).scale(1, 0.85, 1).translate(0, 0.79, -3.45), glassM, 'b25.turret');
  for (const s of [1, -1]) add(rod([s * 0.1, 1.0, -3.3], [s * 0.1, 1.08, -2.15], 0.03, 6), black, 'b25.turret_gun');
  for (const s of [1, -1]) add(rod([s * 0.06, 0.4, -7.9], [s * 0.07, 0.38, -8.85], 0.022, 6), black, 'b25.broomstick');

  // tricycle gear: nose strut + wheel, two main struts + wheels under the nacelles; the forward hatch + ladder
  const gearG = new THREE.Group(); gearG.name = 'b25.gear'; body.add(gearG);
  const gearParts = { m: [], t: [] };
  gearParts.m.push(rod([0, -0.85, 5.95], [0, -1.86, 6.05], 0.06, 8)); gearParts.t.push(new THREE.CylinderGeometry(0.44, 0.44, 0.24, 20).rotateZ(Math.PI / 2).translate(0, -1.86, 6.05));
  for (const s of [1, -1]) {
    gearParts.m.push(rod([s * NAC_X, -0.7, -0.25], [s * NAC_X, -1.7, -0.35], 0.09, 8)); gearParts.m.push(rod([s * NAC_X, -0.75, -1.0], [s * NAC_X, -1.62, -0.38], 0.05, 6));
    gearParts.t.push(new THREE.CylinderGeometry(0.6, 0.6, 0.36, 22).rotateZ(Math.PI / 2).translate(s * NAC_X, -1.7, -0.35));
  }
  add(merge(gearParts.m), metal, 'b25.struts', gearG); add(merge(gearParts.t), tyre, 'b25.tyres', gearG);
  const hatchG = new THREE.Group(); hatchG.name = 'b25.hatch'; body.add(hatchG);
  if (o.hatch) {
    add(new THREE.BoxGeometry(0.62, 0.04, 0.9).translate(0, -0.95, 4.65), black, 'b25.hatch_well', hatchG);
    const door = add(new THREE.BoxGeometry(0.6, 0.03, 0.85), fusM, 'b25.hatch_door', hatchG); door.position.set(0, -1.3, 4.25); door.rotation.x = -70 * DEG;
    const lad = []; for (const sx of [-1, 1]) lad.push(rod([sx * 0.2, -0.95, 4.75], [sx * 0.2, -B25_AXIS + 0.02, 5.1], 0.018, 5));
    for (let k = 1; k <= 4; k++) { const u = k / 5, y = lerp(-0.95, -B25_AXIS, u), z = lerp(4.75, 5.1, u); lad.push(rod([-0.2, y, z], [0.2, y, z], 0.014, 4)); }
    add(merge(lad), metal, 'b25.ladder', hatchG);
  }

  // props: three blades on each hub + a blur disc
  const props = [];
  const bg = bladeGeo();
  for (const s of [1, -1]) {
    const p = new THREE.Group(); p.name = 'b25.prop'; p.position.set(s * NAC_X, NAC_Y, PROP_Z); body.add(p);
    const blades = []; for (let k = 0; k < 3; k++) blades.push(bg.clone().rotateZ(k / 3 * TAU));
    const bm = new THREE.Mesh(merge(blades), black); bm.castShadow = true; p.add(bm);
    const tipM = new THREE.MeshBasicMaterial({ color: 0x8A7A28, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(PROP_R - 0.14, PROP_R, 48), tipM); ring.castShadow = false; ring.userData.noQA = true; p.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(PROP_R, 48), new THREE.MeshBasicMaterial({ color: 0x202020, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    disc.castShadow = false; disc.userData.noQA = true; p.add(disc); p.userData.disc = disc; p.userData.ring = ring; p.userData.blades = bm; props.push(p);
  }

  // anchors (target them as objects:N.<anchor>)
  const anchors = {};
  const A = (k, x, y, z) => { const a = new THREE.Object3D(); a.name = 'anchor:' + k; a.position.set(x, y, z); body.add(a); anchors[k] = a; };
  A('nose', 0, -0.1, 8.0); A('cockpit', 0, 1.0, 4.6); A('tail', 0, 0.5, -7.6); A('wing_l', 8.5, 0.3, 0.6); A('wing_r', -8.5, 0.3, 0.6);
  A('engine_l', NAC_X, NAC_Y, PROP_Z); A('engine_r', -NAC_X, NAC_Y, PROP_Z); A('turret', 0, 0.9, -3.45); A('hatch', 0, -1.0, 4.65); A('hatch_below', 0, -B25_AXIS, 4.9);

  const gearMode = String(o.gear || 'auto');
  // solid: the airframe as boxes in group space (the fuselage, the wing slab, the nacelles, the tail) -> top y or 0
  const SOL = [[-0.75, 0.75, B25_AXIS - 0.95, B25_AXIS + 1.35, -8.0, 8.2], [-10.4, 10.4, B25_AXIS - 0.3, B25_AXIS + 0.62, -1.8, 2.25],
    [NAC_X - 0.8, NAC_X + 0.8, B25_AXIS - 0.95, B25_AXIS + 0.7, -3.0, PROP_Z + 0.1], [-NAC_X - 0.8, -NAC_X + 0.8, B25_AXIS - 0.95, B25_AXIS + 0.7, -3.0, PROP_Z + 0.1],
    [-3.6, 3.6, B25_AXIS + 0.2, B25_AXIS + 0.95, -7.6, -5.5], [3.25, 3.6, B25_AXIS - 0.4, B25_AXIS + 2.75, -7.5, -5.5], [-3.6, -3.25, B25_AXIS - 0.4, B25_AXIS + 2.75, -7.5, -5.5]];
  function solid(x, y, z, m = 0.3) {
    let top = 0;
    for (const [x0, x1, y0, y1, z0, z1] of SOL) if (x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m && z > z0 - m && z < z1 + m) top = Math.max(top, y1);
    return top;
  }
  let gearK = 1;
  return {
    group, body, props, span: 20.6, length: 16.1, cruise: 72, height: B25_AXIS + 2.75, anchors, solid,
    setGear(k) { gearK = clamp(k); gearG.visible = gearK > 0.02; gearG.position.y = (1 - gearK) * 0.9; gearG.scale.setScalar(lerp(0.75, 1, gearK)); },
    update(t, s = {}) {
      const rpm = o.props === 'still' ? 0 : (s.rpm ?? 1), spin = rpm * t * TAU * 21;
      for (const p of props) {
        p.rotation.z = spin * (p.position.x > 0 ? 1 : -1);
        const blur = rpm > 0.3; p.userData.disc.visible = blur; p.userData.ring.visible = blur;
        p.userData.blades.visible = !blur || rpm < 0.85;   // a spinning prop is a disc with a faint tip ring
      }
      if (gearMode === 'down') this.setGear(1); else if (gearMode === 'up') this.setGear(0);
      else if (s.gear != null) this.setGear(s.gear);
    },
  };
}
