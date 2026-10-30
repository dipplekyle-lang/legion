// a_crater.js — E2 (asteroid kit, 29 Sep 2026): how a crater forms, as a cutaway block (the science-documentary diorama).
//   fx.crater_form   a slab of layered crust cut through its centre (strata on the cut face), whose surface ANIMATES the
//                    formation: the rock hits at t0, the transient bowl opens (the ground flows like a liquid), the floor
//                    rebounds into a central peak towering over the rim, the peak collapses outward into a ring of peaks
//                    and the walls slump into terraces (complex); a simple crater just opens its bowl and keeps its rim.
//                    Molten rock glows in the floor; an optional ghost Everest stands for scale; a scale bar (km) along
//                    the front edge. Times are screen seconds (the real ~10 minutes, compressed).
import * as THREE from 'three';
import { makePuffs, syncEnv, hf, clamp, lerp, sstep } from './f_common.js';
import { explicitParams } from './a_asteroid.js';
import { patchMaterial } from '../shared/env.js';

const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

async function buildForm(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.crater_form']);
  const at = item.at || [0, 0];
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  const groundless = gy < -5000;
  const size = num(p.size, 1200);                                    // the block's width in scene metres
  const Dkm = num(p.diameter, 180);                                  // the FINAL crater diameter (km): the scale bar reads in km
  const complex = String(p.style || p.type || (Dkm > 4 ? 'complex' : 'simple')) === 'complex';   // (not 'kind': that is the item's own kind)
  const k = size / (Dkm * 2.6);                                      // scene m per km (the block is 2.6 crater diameters wide)
  const Rf = Dkm / 2 * k, Rt = Rf * (complex ? 0.5 : 0.85);          // final / transient radius (scene m)
  const Dt = Rt * 2 * (complex ? 0.33 : 0.33);                        // transient depth (d/D ~ 1/3 of the transient DIAMETER / 2)
  const depth = num(p.block_depth, size * 0.28);
  const t0 = num(p.t0, 0.8), tEx = num(p.excavate, 3), tRb = num(p.rebound, 2.5), tCol = num(p.collapse, 3);
  const peakH = num(p.peak_km, complex ? 17 : 0) * k;               // "twice Everest": ~17 km
  const root = new THREE.Group(); root.name = 'fx.crater_form';
  // the block stands ON the ground (its base on the terrain: the world's ground cannot show a hole) or floats in space
  root.position.set(at[0], groundless ? num(item.y ?? p.y, 0) : gy + num(p.elev, 0.5) + depth, at[1]);
  root.rotation.y = -(item.heading ?? 180) * Math.PI / 180;           // the cut face (local -Z) faces `heading`
  // the surface: a half disc grid (the block is cut through the centre along x: z >= 0 is kept, the cut face at z = 0)
  const N = 180, half = size / 2;
  const g = new THREE.PlaneGeometry(size, half, N, Math.round(N / 2)).rotateX(-Math.PI / 2); g.translate(0, 0, half / 2);   // z in [0, half]
  const P = g.attributes.position, base = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { base[i * 2] = P.getX(i); base[i * 2 + 1] = P.getZ(i); }
  const col = new Float32Array(P.count * 3); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const surfM = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }));
  const surf = new THREE.Mesh(g, surfM); surf.castShadow = surf.receiveShadow = true; surf.userData.noQA = true; root.add(surf);
  // the cut face: a vertical strip under the profile along z = 0 (strata by depth) + the block's outer skirt
  const NX = N + 1, face = new THREE.BufferGeometry(), fpos = new Float32Array(NX * 2 * 3), fcol = new Float32Array(NX * 2 * 3), fidx = [];
  for (let i = 0; i < N; i++) { const a = i * 2, b = (i + 1) * 2; fidx.push(a, b, a + 1, b, b + 1, a + 1); }
  face.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); face.setAttribute('color', new THREE.BufferAttribute(fcol, 3)); face.setIndex(fidx);
  // strata texture on the face (layers + the melt/breccia lens under the crater)
  const layers = Math.max(3, Math.round(num(p.layers, 7)));
  const faceM = new THREE.ShaderMaterial({
    uniforms: { uDepth: { value: depth }, uLayers: { value: layers }, uRt: { value: Rt }, uMelt: { value: 0 }, uFloor: { value: 0 }, uSun: { value: new THREE.Vector3(0.5, 0.8, 0.3) } },
    side: THREE.DoubleSide, vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vP; varying float vY0; attribute float aY0; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float uDepth; uniform float uLayers; uniform float uRt; uniform float uMelt; uniform float uFloor;
varying vec3 vP;
float h1(float x){ return fract(sin(x * 91.3) * 43758.5); }
void main(){
  #include <logdepthbuf_fragment>
  float d = -vP.y / uDepth;                                               // 0 at the old surface .. 1 at the block base
  float wob = 0.02 * sin(vP.x / uDepth * 7.0) + 0.015 * sin(vP.x / uDepth * 17.0 + 2.0);
  float L = (d + wob) * uLayers, li = floor(L), lf = fract(L);
  vec3 c = mix(vec3(0.62, 0.52, 0.4), vec3(0.34, 0.3, 0.27), h1(li)) * (0.85 + 0.15 * smoothstep(0.0, 0.08, lf));
  c *= 0.75 + 0.35 * (1.0 - d);
  // the disturbed zone under the crater: broken, darker breccia; molten rock glowing at the centre
  float r = abs(vP.x) / uRt;
  float zone = smoothstep(1.15, 0.9, r) * smoothstep(-0.05, 0.25, -vP.y / uRt + 0.3);
  c = mix(c, vec3(0.2, 0.18, 0.17), zone * 0.6);
  float melt = uMelt * smoothstep(0.55, 0.0, r) * smoothstep(0.45, 0.0, abs(-vP.y - uFloor) / uRt);
  c += vec3(1.0, 0.35, 0.05) * melt * 2.5;
  gl_FragColor = vec4(c, 1.0);
}`,
  });
  const faceMesh = new THREE.Mesh(face, faceM); faceMesh.userData.noQA = true; root.add(faceMesh);
  // the block's other sides + base (a neutral bedrock box, open at the top)
  const sideM = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x4d443c, roughness: 0.95 }));
  // three walls and a base (no top: the animated surface closes it; no front: the strata face is the front)
  for (const [w, h, x, y, z, ry, rx] of [[half, depth, -half, -depth / 2, half / 2, Math.PI / 2, 0], [half, depth, half, -depth / 2, half / 2, -Math.PI / 2, 0], [size, depth, 0, -depth / 2, half, Math.PI, 0], [size, half, 0, -depth, half / 2, 0, Math.PI / 2]]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), sideM); wall.position.set(x, y, z); wall.rotation.set(rx, ry, 0); wall.material.side = THREE.DoubleSide; wall.userData.noQA = true; wall.receiveShadow = true; root.add(wall);
  }
  // the profile h(r, t): the old surface 0; transient bowl; rebound peak; collapse to a peak ring + terraces
  const profile = (r, t) => {
    const u = t - t0; if (u <= 0) return 0;
    const ex = sm(u / tEx), rb = sm((u - tEx) / tRb), co = sm((u - tEx - tRb) / tCol);
    const Rtt = Rt * (0.35 + 0.65 * ex);
    // transient bowl (parabolic) with an overturned rim
    let h = r < Rtt ? -Dt * ex * (1 - (r / Rtt) ** 2) : 0;
    h += Dt * 0.12 * ex * Math.exp(-(((r - Rtt) / (Rt * 0.18)) ** 2));
    if (complex) {
      // rebound: the floor rises into a central peak (taller than the rim), then it collapses outward into a peak ring
      const peak = peakH * rb * (1 - co);
      h += (Dt * ex * 0.9 * rb) * Math.max(0, 1 - (r / (Rt * 0.9)) ** 2) * (1 - 0.3 * co);
      h += peak * Math.exp(-((r / (Rt * 0.28)) ** 2));
      // the final crater: shallow floor, a ring of peaks at ~0.5 Rf, terraced walls out to Rf
      const fin = -Dt * 0.12 * Math.max(0, 1 - (r / Rf) ** 6) + Dt * 0.18 * Math.exp(-(((r - Rf * 0.5) / (Rf * 0.07)) ** 2)) + Dt * 0.05 * Math.exp(-(((r - Rf) / (Rf * 0.08)) ** 2));
      const terr = r > Rf * 0.65 && r < Rf ? Dt * 0.03 * Math.sin((r - Rf * 0.65) / (Rf * 0.35) * Math.PI * 4) : 0;
      h = lerp(h, fin + terr, co);
    }
    return h;
  };
  const colorAt = (r, h, t) => {
    const u = t - t0, fresh = u > 0 ? Math.exp(-Math.max(0, u - tEx - tRb) / 6) : 0;
    const inside = r < Rf * 1.05 ? 1 : 0;
    let c = [0.46, 0.43, 0.33];                                       // plains
    if (inside) c = lerp3(c, [0.3, 0.27, 0.25], sm((Rf * 1.05 - r) / (Rf * 0.3)) * sm(u / 1));
    const melt = u > 0 && r < Rt * 0.6 ? fresh * sm((Rt * 0.6 - r) / (Rt * 0.3)) * (h < 0 ? 1 : 0.4) : 0;
    return [c[0] + melt * 0.9, c[1] + melt * 0.28, c[2] + melt * 0.02];
  };
  const lerp3 = (a, b, k2) => [lerp(a[0], b[0], k2), lerp(a[1], b[1], k2), lerp(a[2], b[2], k2)];
  // ghost Everest (translucent) beside the peak for scale; a km scale bar along the front edge
  let ghost = null;
  if (p.ghost_everest) {
    const eh = 8.849 * k;
    ghost = new THREE.Mesh(new THREE.ConeGeometry(eh * 0.9, eh, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8e6de, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    ghost.position.set(Rt * 0.55, eh / 2, half * 0.12); ghost.userData.noQA = true; root.add(ghost);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(ghost.geometry), new THREE.LineBasicMaterial({ color: 0xd9a93f, transparent: true, opacity: 0.8 })); ghost.add(edges);
  }
  const bar = new THREE.Group(); root.add(bar);
  { const km = Math.pow(10, Math.floor(Math.log10(Dkm))) * (Dkm / Math.pow(10, Math.floor(Math.log10(Dkm))) >= 5 ? 5 : 1) / (Dkm >= 50 ? 1 : 1);
    const L = km * k, m = new THREE.MeshBasicMaterial({ color: 0xd9a93f });
    const b = new THREE.Mesh(new THREE.BoxGeometry(L, size * 0.004, size * 0.004), m); b.position.set(-half + L / 2 + size * 0.04, size * 0.006, -size * 0.004); bar.add(b);
    for (const x of [-half + size * 0.04, -half + size * 0.04 + L]) { const tk = new THREE.Mesh(new THREE.BoxGeometry(size * 0.003, size * 0.02, size * 0.003), m); tk.position.set(x, size * 0.01, -size * 0.004); bar.add(tk); }
    bar.userData.km = km; }
  // ejecta curtain and vapour during the excavation
  const puffs = makePuffs(ctx, { count: 1400, tint: [0.45, 0.4, 0.36], glow: [1, 0.45, 0.12], heat: [1, 0.5, 0.15], heatHDR: 3, near: 4, groundFade: 0.02, fog: 0.4 });
  root.add(puffs.mesh);
  const flash = new THREE.PointLight(0xffc080, 0, size * 3, 1.5); flash.position.set(0, size * 0.1, half * 0.2); root.add(flash);
  function update(t, clock, camera) {
    syncEnv(ctx);
    for (let i = 0; i < P.count; i++) { const x = base[i * 2], z = base[i * 2 + 1], r = Math.hypot(x, z), h = profile(r, t); P.setY(i, h); const c = colorAt(r, h, t); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
    P.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals();
    // the cut face follows the profile along z = 0
    for (let i = 0; i < NX; i++) { const x = -half + i / N * size, h = profile(Math.abs(x), t); fpos[i * 6] = x; fpos[i * 6 + 1] = h; fpos[i * 6 + 2] = 0; fpos[i * 6 + 3] = x; fpos[i * 6 + 4] = -depth; fpos[i * 6 + 5] = 0; }
    face.attributes.position.needsUpdate = true; face.computeBoundingSphere();
    const u = t - t0;
    faceM.uniforms.uMelt.value = u > 0 ? Math.exp(-Math.max(0, u - tEx - tRb - tCol) / 8) * sm(u / 1.5) : 0; faceM.uniforms.uFloor.value = -profile(0, t);
    flash.intensity = u > 0 ? 40 * Math.exp(-u / 0.6) * (size / 1000) ** 2 : 0;
    puffs.begin();
    if (u > 0 && u < tEx + 4) for (let i = 0; i < 1300; i++) {
      const tl = hf(i, 1) * Math.min(u, tEx), age = u - tl, a = Math.PI * hf(i, 2);          // only the kept half (z >= 0)
      const r0 = Rt * (0.3 + 0.7 * sm(tl / tEx)), v0 = Dt * (2.2 - 1.4 * tl / tEx), y = v0 * age * 0.8 - 0.5 * Dt * 1.6 * age * age;
      if (y < -Dt * 0.1) continue;
      const r = r0 + v0 * 0.7 * age, x = Math.cos(a) * r, z = Math.sin(a) * r, hot = Math.exp(-age / 1.2);
      puffs.push(x, Math.max(0, y) + Dt * 0.05, z, Dt * (0.12 + 0.2 * hf(i, 3)) * (0.6 + age * 0.4), hf(i, 4) * 6.28, 0.6 * sstep(0, 0.15, age) * (1 - sstep(tEx + 2, tEx + 4, u)), i & 3, -Dt, 0.7, 0.6 * hot, clamp(hot), 0, clamp(0.2 + age / 5), 0.8, hf(i, 5));
    }
    puffs.end(camera);
  }
  update(0, 0, null);
  const center = () => root.getWorldPosition(new THREE.Vector3());
  return { root, radius: size * 0.55, height: Math.max(peakH, Dt), snapped: true, update, contact: false, anchors: { center: new THREE.Object3D() }, footprint: [size, half],
    subjectAt: () => { const c = center(); return [c.x, c.y - Dt * 0.3, c.z]; }, subjectTop: size * 0.3, subjectCy: 0,
    cues: [{ t: t0, sound: 'impact_boom' }], flashAt: (t) => (t > t0 ? clamp(Math.exp(-(t - t0) / 0.6) - 0.1) : 0) };
}

export const CATALOG = {
  'fx.crater_form': {
    desc: 'HOW A CRATER FORMS, as a cutaway diorama block of layered crust cut through its centre (strata on the cut face): at t0 the rock hits, the transient bowl opens (the ground flows like a liquid, ejecta curtain), the floor rebounds into a central peak taller than the rim (complex: "twice Everest"), then collapses outward into a ring of peaks with terraced walls; melt glows in the floor. simple (Meteor Crater) just opens its bowl. Optional ghost Everest for scale; a km scale bar on the front edge. Film it at 30-45 degrees from the cut side (the block\'s front faces `heading`)',
    actions: ['form'],
    params: { diameter: 'final crater km (180 Chicxulub, 1.2 Meteor Crater)', style: 'simple|complex (default by size)', size: 'block width in scene m (1200)', t0: 's impact', excavate: 's (3)', rebound: 's (2.5)', collapse: 's (3)', peak_km: 'central peak height km (17)', ghost_everest: 'bool', layers: 'int strata', block_depth: 'm', elev: 'm the block base stands above the ground', y: 'm (space: a floating cutaway, the science look)' },
    footprint: [1200, 600], height: 300, tags: ['fx', 'crater', 'formation', 'cutaway', 'cross-section', 'chicxulub', 'meteor crater', 'peak ring', 'science', 'diorama'],
  },
};

export async function build(kind, item, ctx) { return buildForm(item, ctx); }
