// a_giant.js — E2 (asteroid kit, 29 Sep 2026): planet-scale impacts, seen from space (the planets scale: Earth radius 600).
//   fx.giant_impact  mode crust (100 km .. Ceres): the rock comes in and sinks into the Earth; from the impact site the
//                    crust peels back in a glowing wave that races round the globe, a rock-vapour atmosphere spreads
//                    behind it, the oceans boil to white steam, a plume of vapour and ejecta rises into space.
//                    mode theia: a Mars-sized planet hits the young Earth: the two merge, a splash arm of molten rock is
//                    flung out and wraps into a glowing debris disc, the whole Earth becomes a magma ocean, and the Moon
//                    gathers out of the disc (`start` s skips ahead: 12 = the disc, 20 = the young Moon).
//   space.magma_earth a planet (the Earth after a giant impact, the young Earth) whose whole surface is a magma ocean:
//                    black crust plates on glowing rivers of lava, a hot orange limb of rock vapour; optional debris
//                    disc and a close, huge young Moon.
import * as THREE from 'three';
import { makePuffs, makeSparks, syncEnv, hf, clamp, lerp, sstep } from './f_common.js';
import { makeAsteroid, explicitParams, PLANET_SCALE } from './a_asteroid.js';
import { glowSprite } from './a_entry.js';

const DEG = Math.PI / 180;
const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const latLonDir = (lat, lon) => new THREE.Vector3(-Math.sin(lon * DEG) * Math.cos(lat * DEG), Math.sin(lat * DEG), -Math.cos(lon * DEG) * Math.cos(lat * DEG));

const NOISE = /* glsl */`
float gh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gh(i), gh(i + vec3(1,0,0)), f.x), mix(gh(i + vec3(0,1,0)), gh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(gh(i + vec3(0,0,1)), gh(i + vec3(1,0,1)), f.x), mix(gh(i + vec3(0,1,1)), gh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float gf(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * gn(p); p = p * 2.03 + 3.1; a *= 0.5; } return s; }`;

// a magma / crust-wave shell over a sphere of radius R. uAng: how far (rad from uSite) the melt has spread (PI = all);
// the front bulges up as a wave (uWave, m) and glows white-hot; behind it black crust plates float on lava.
function magmaShell(R, o = {}) {
  const uni = { uSite: { value: (o.site || new THREE.Vector3(0, 0, 1)).clone() }, uAng: { value: o.ang ?? 0 }, uWave: { value: o.wave ?? R * 0.02 }, uW: { value: o.width ?? 0.08 },
    uT: { value: 0 }, uSun: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() }, uCrust: { value: o.crust ?? 0.6 }, uHot: { value: o.hot ?? 1 }, uR: { value: R } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: true,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 uSite; uniform float uAng; uniform float uWave; uniform float uW; uniform float uR;
varying vec3 vL; varying vec3 vW; varying vec3 vN; varying float vA;
void main(){
  vec3 d = normalize(position); vL = d;
  float a = acos(clamp(dot(d, normalize(uSite)), -1.0, 1.0)); vA = a;
  float bump = uWave * exp(-pow((a - uAng) / uW, 2.0)) * step(0.001, uAng) + uWave * 0.15 * step(a, uAng);
  vec3 p = d * (uR + bump);
  vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * d);
  gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float uAng; uniform float uW; uniform float uT; uniform vec3 uSun; uniform float uCrust; uniform float uHot;
varying vec3 vL; varying vec3 vW; varying vec3 vN; varying float vA;
${NOISE}
void main(){
  #include <logdepthbuf_fragment>
  float inside = smoothstep(uAng + uW * 0.3, uAng - uW * 0.6, vA);         // 1 behind the front
  float front = exp(-pow((vA - uAng) / (uW * 0.7), 2.0)) * step(0.001, uAng);
  float cover = max(inside, front);
  if (cover < 0.01) discard;
  vec3 p = vL * 7.0 + vec3(0.0, uT * 0.02, 0.0);
  float n = gf(p), c = gf(vL * 23.0 - uT * 0.03);
  float th = 0.62 - 0.3 * uCrust;                                              // more crust = more of the area plated
  float plates = smoothstep(th - 0.03, th + 0.03, n + 0.12 * c);                 // black crust plates ...
  float cracks = pow(1.0 - abs(2.0 * gn(vL * 40.0 + uT * 0.04) - 1.0), 12.0);   // ... split by glowing rivers
  float age = clamp((uAng - vA) / 0.7, 0.0, 1.0);                              // cooling behind the front
  float crust = age * plates;
  vec3 lava = mix(vec3(0.9, 0.2, 0.03), vec3(1.0, 0.55, 0.12), c * c) * (1.25 + 0.8 * front) * uHot;
  vec3 rock = vec3(0.055, 0.042, 0.038) * (0.35 + 1.1 * max(dot(normalize(vN), uSun), 0.0));
  vec3 col = mix(lava, rock, crust) + vec3(1.0, 0.35, 0.06) * cracks * crust * 1.1 * uHot;
  col += vec3(1.0, 0.82, 0.6) * front * 2.6 * uHot;                            // the white-hot wave crest
  gl_FragColor = vec4(col, clamp(cover * 1.3, 0.0, 1.0));
}`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), mat); m.userData.noQA = true; m.renderOrder = 5;
  return { mesh: m, uni };
}
// the glowing vapour / steam atmosphere: an additive limb shell that fills in behind the front
function vapourShell(R, o = {}) {
  const uni = { uSite: { value: (o.site || new THREE.Vector3(0, 0, 1)).clone() }, uAng: { value: 0 }, uI: { value: 0 }, uCol: { value: new THREE.Color(...(o.col || [1.0, 0.45, 0.15])) }, uSteam: { value: o.steam ?? 0.5 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vL; varying vec3 vW; varying vec3 vN; void main(){ vL = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform vec3 uSite; uniform float uAng; uniform float uI; uniform vec3 uCol; uniform float uSteam;
varying vec3 vL; varying vec3 vW; varying vec3 vN;
${NOISE}
void main(){
  #include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vW); float mu = abs(dot(normalize(vN), V));
  float a = acos(clamp(dot(vL, normalize(uSite)), -1.0, 1.0));
  float inside = smoothstep(uAng + 0.15, uAng - 0.25, a);
  float n = gf(vL * 5.0);
  vec3 c = uCol * (0.05 + pow(1.0 - mu, 3.0) * 1.8) + vec3(0.9, 0.88, 0.85) * uSteam * smoothstep(0.5, 0.72, n) * 0.35 * mu;
  gl_FragColor = vec4(c * inside * uI, 1.0);
}`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), mat); m.userData.noQA = true; m.renderOrder = 21;
  return { mesh: m, uni };
}

// ── fx.giant_impact ─────────────────────────────────────────────────────────────────────────────────────────────
async function buildGiant(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.giant_impact']);
  const mode = String(p.mode || 'crust');
  const at = item.at || [0, 0];
  const R = num(p.radius, 600), tI = num(p.t_impact, 2), start = num(p.start, 0);
  const y0 = (item.y ?? p.y) != null ? +(item.y ?? p.y) : 0;
  const root = new THREE.Group(); root.name = 'fx.giant_impact'; root.position.set(at[0], y0, at[1]);
  const upd = [];
  // the planet: today's Earth (crust) or the young molten-crusted Earth (theia)
  let spinG = null, earth = null;
  if (mode !== 'theia') {
    const sp = await import('../nature/space.js');
    earth = await sp.build('space.earth', { at: [0, 0], y: 0, radius: R, spin: num(p.spin, 0.2), lon: num(p.lon, -60), lat: num(p.lat, 10), tilt: num(p.tilt, 23.4), face: p.face, clouds: 0.8 }, ctx);
    earth.root.position.set(0, 0, 0); root.add(earth.root); spinG = earth.spinG; upd.push((t) => earth.update(t));
  } else {
    spinG = new THREE.Group(); root.add(spinG);
    const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 128, 64), new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.9 })); spinG.add(core);
  }
  // the impact site (in the spinning frame): lat/lon for crust; the side facing the incoming Theia otherwise
  const site = mode === 'theia' ? new THREE.Vector3(-0.6, 0.25, 0.76).normalize() : latLonDir(num(p.site_lat, 20), num(p.site_lon, num(p.lon, -60) + 25));
  const shell = magmaShell(R, { site, wave: mode === 'theia' ? R * 0.05 : R * 0.028, width: mode === 'theia' ? 0.18 : 0.1, crust: 0.7 });
  shell.mesh.scale.setScalar(1); spinG.add(shell.mesh);
  const vap = vapourShell(R * 1.07, { site, col: mode === 'theia' ? [1.0, 0.4, 0.12] : [1.0, 0.5, 0.2], steam: mode === 'theia' ? 0.2 : 0.8 });
  vap.mesh.scale.setScalar(R * 1.07); spinG.add(vap.mesh);
  // the impactor
  const Dimp = num(p.diameter, mode === 'theia' ? 6.8e6 : 5.25e5);
  const Ri = mode === 'theia' ? R * 0.53 : Math.max(2, Dimp * PLANET_SCALE / 2 * (R / 600));
  let imp = null;
  if (mode === 'theia') {
    const P = await import('../nature/planets.js');
    imp = P.buildBody('mercury', { at: [0, 0], radius: Ri, spin: 3, face: false }, ctx);
    root.add(imp.root);
  } else {
    const A = makeAsteroid(ctx, { diameter: Dimp, size: Ri * 2, type: Dimp > 7e5 ? 'ceres' : Dimp > 3e5 ? 'vesta' : 'carbonaceous', seed: 29, detail: 5 });
    imp = { root: new THREE.Group(), update: (t) => A.update(t), A }; imp.root.add(A.group); root.add(imp.root);
  }
  // approach: from `from` {az, el} (world), aimed so it touches the site at tI (theia: an oblique, grazing hit)
  const siteW = new THREE.Vector3(), qS = new THREE.Quaternion();
  const siteWorld = (t) => { spinG.updateWorldMatrix(true, false); spinG.getWorldQuaternion(qS); return siteW.copy(site).applyQuaternion(qS); };
  const fr = p.from || {}, inDir = new THREE.Vector3(Math.sin(num(fr.az, 60) * DEG) * Math.cos(num(fr.el, 20) * DEG), Math.sin(num(fr.el, 20) * DEG), -Math.cos(num(fr.az, 60) * DEG) * Math.cos(num(fr.el, 20) * DEG)).normalize();
  const vApp = num(p.speed, mode === 'theia' ? R * 0.35 : R * 0.25);        // scene m per screen s
  const flash = glowSprite([1, 0.92, 0.8], 26); root.add(flash);
  const plume = makePuffs(ctx, { count: 2600, tint: [0.34, 0.27, 0.23], glow: [1, 0.4, 0.1], heat: [1, 0.42, 0.1], heatHDR: 2.0, near: 5, groundFade: 0, fog: 0, softK: 0.2, light: 1.0 });
  const sparks = makeSparks(ctx, { count: 3000, maxPx: 3, minPx: 1 });
  root.add(plume.mesh, sparks.mesh);
  // theia: the debris disc and the Moon gathering in it
  const moon = mode === 'theia' ? magmaShell(R * 0.27, { ang: Math.PI * 1.01, wave: 0, width: 0.2, crust: 0.5 }) : null;
  if (moon) { moon.uni.uR.value = R * 0.27; root.add(moon.mesh); }
  const tmp = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), cam = new THREE.Vector3();
  const spreadT = num(p.spread, mode === 'theia' ? 7 : 9);                  // screen s for the melt to reach the far side
  function update(t0, clock, camera) {
    const t = t0 + start;
    syncEnv(ctx);
    for (const f of upd) f(t0);
    if (camera) camera.getWorldPosition(cam);
    const tau = t - tI;
    shell.uni.uT.value = t; vap.uni.uAng.value = shell.uni.uAng.value = tau > 0 ? Math.min(Math.PI * 1.02, Math.PI * Math.pow(tau / spreadT, 0.8)) : 0;
    vap.uni.uI.value = tau > 0 ? sm(tau / 1.5) * (mode === 'theia' ? 1.1 : 0.9) : 0;
    shell.uni.uHot.value = 1;
    const sw = siteWorld(t);
    // the impactor: before tI on its way in; after, it sinks into the planet and is gone (occluded by the globe)
    if (mode === 'theia') {
      // an oblique hit: Theia's centre heads for a point beside the site; after contact it merges, squashing into the Earth
      const aim = sw.clone().multiplyScalar(R + Ri * 0.6);
      const side = new THREE.Vector3().crossVectors(inDir, sw).normalize();
      const pre = aim.clone().addScaledVector(inDir, Math.max(0, -tau) * vApp).addScaledVector(side, Ri * 0.5);
      const merge = sm(tau / 5);
      imp.root.position.copy(pre).multiplyScalar(1 - merge * 0.75);
      imp.root.scale.setScalar(1 - 0.85 * sm((tau - 0.5) / 6));
      imp.root.visible = imp.root.scale.x > 0.03;
      imp.update(t0);
    } else {
      const P = sw.clone().multiplyScalar(R + Ri * 0.95).addScaledVector(inDir, Math.max(0, -tau) * vApp);
      if (tau > 0) P.addScaledVector(sw, -Ri * 2.2 * sm(tau / 2.5));
      imp.root.position.copy(P); imp.root.visible = tau < 3; imp.update(t0);
      if (imp.A) imp.A.setHeat(tau > -1.5 ? clamp(1 + tau) : 0, inDir.clone().negate());
    }
    // flash
    flash.position.copy(sw).multiplyScalar(R * 1.05);
    flash.material.uniforms.uS.value = R * (mode === 'theia' ? 1.6 : 0.8); flash.material.uniforms.uMinPx.value = 30;
    flash.material.uniforms.uI.value = tau > 0 ? 2.5 * Math.exp(-tau / 0.5) + 0.3 * Math.exp(-tau / 4) : 0;
    // plume / splash: vapour and molten rock thrown out of the site; for theia a spiral arm that wraps into a disc
    plume.begin(); sparks.begin();
    if (tau > 0) {
      e1.crossVectors(sw, new THREE.Vector3(0, 1, 0)).normalize(); if (e1.lengthSq() < 0.1) e1.set(1, 0, 0); e2.crossVectors(sw, e1).normalize();
      const nP = mode === 'theia' ? 1500 : 1200;
      for (let i = 0; i < nP; i++) {
        const tl = hf(i, 1) * Math.min(tau, 3), age = tau - tl;
        if (mode === 'theia') {
          // a disc of debris in the equatorial-ish plane of the impact (normal = e2), winding up with time
          const r0 = R * (1.1 + 2.6 * Math.pow(hf(i, 2), 0.7)), a0 = hf(i, 3) * 6.28, spin = 0.6 * Math.pow(R * 1.5 / r0, 1.5);
          const grow = sm(age / 3);                                              // flung out, then orbiting
          const a = a0 + spin * age, r = lerp(R * 1.02, r0, grow);
          const zz = (hf(i, 4) - 0.5) * R * 0.25 * (1 - sm(age / 12)) * (1 - 0.6 * grow);
          tmp.copy(sw).multiplyScalar(Math.cos(a) * r).addScaledVector(e1, Math.sin(a) * r).addScaledVector(e2, zz);
          const hot = Math.exp(-age / 10);
          plume.push(tmp.x, tmp.y, tmp.z, R * (0.025 + 0.045 * hf(i, 5)) * (0.6 + grow), hf(i, 6) * 6.28 + t * 0.05, 0.42 * sstep(0, 0.4, age), i & 3, -1e9, 0.6, 0.5 * hot, clamp(0.55 * hot + 0.25 * hf(i, 8)), 0, 0.45, 0.8, hf(i, 7));
          if (i < 1400) sparks.push(tmp.x, tmp.y, tmp.z, 3 * hot + 0.4, 1.4 * hot + 0.2, 0.4 * hot + 0.1, R * 0.004);
        } else {
          const th = hf(i, 2) * 6.28, cone = (25 + 40 * hf(i, 3)) * DEG, v = R * (0.08 + 0.35 * Math.pow(hf(i, 4), 2));
          const dir = tmp.copy(sw).multiplyScalar(Math.cos(cone)).addScaledVector(e1, Math.sin(cone) * Math.cos(th)).addScaledVector(e2, Math.sin(cone) * Math.sin(th));
          const d = v * age * Math.exp(-age / 6), P2 = sw.clone().multiplyScalar(R).addScaledVector(dir, d);
          const hot = Math.exp(-age / 2.5);
          plume.push(P2.x, P2.y, P2.z, R * (0.02 + 0.05 * hf(i, 5)) * (0.5 + age * 0.4), hf(i, 6) * 6.28, 0.55 * sstep(0, 0.3, age) * (1 - sstep(8, 14, age)), i & 3, -1e9, 0.8, 0.9 * hot, clamp(hot), 0, clamp(0.2 + age / 10), 0.8, hf(i, 7));
          if (i < 900) sparks.push(P2.x, P2.y, P2.z, 4 * hot, 2 * hot, 0.6 * hot, R * 0.003);
        }
      }
    }
    plume.end(camera); sparks.end();
    // the young Moon: gathers out of the disc at ~3.8 R
    if (moon) {
      const g = sm((tau - 8) / 8);
      moon.mesh.visible = g > 0.01;
      const a = 0.4 + 0.25 * t;
      e1.crossVectors(sw, new THREE.Vector3(0, 1, 0)).normalize(); if (e1.lengthSq() < 0.1) e1.set(1, 0, 0);
      moon.mesh.position.copy(sw).multiplyScalar(Math.cos(a) * R * 3.8).addScaledVector(e1, Math.sin(a) * R * 3.8);
      moon.mesh.scale.setScalar(Math.max(0.02, g));
      moon.uni.uT.value = t; moon.uni.uAng.value = Math.PI * 1.01; moon.uni.uCrust.value = 0.3 + 0.4 * sm((tau - 14) / 8);
    }
  }
  update(0, 0, null);
  const center = () => root.getWorldPosition(new THREE.Vector3());
  return { root, radius: R * (mode === 'theia' ? 4.2 : 1.3), height: R * 2, snapped: true, update,
    flashAt: (t) => { const tau = t + start - tI; return tau > 0 ? clamp(2.5 * Math.exp(-tau / 0.5) - 0.2) : 0; },
    planet: { key: 'giant', R, obl: 1, center, st: earth && earth.planet ? earth.planet.st : null, body: shell.mesh, ring: null, rings: null, spanR: R * (mode === 'theia' ? 4 : 1.1) },
    subjectAt: () => { const c = center(); return [c.x, c.y, c.z]; }, subjectTop: R * 2, subjectCy: 0, anchors: {} };
}

// ── space.magma_earth ───────────────────────────────────────────────────────────────────────────────────────────
async function buildMagma(item, ctx) {
  const p = explicitParams(item, CATALOG['space.magma_earth']);
  const at = item.at || [0, 0];
  const R = num(p.radius, 600);
  const root = new THREE.Group(); root.name = 'space.magma_earth'; root.position.set(at[0], num(item.y ?? p.y, 0), at[1]);
  const spinG = new THREE.Group(); root.add(spinG);
  spinG.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 96, 48), new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 })));
  const sh = magmaShell(R, { ang: Math.PI * 1.02, wave: 0, crust: num(p.crust, 0.65) }); spinG.add(sh.mesh);
  const vap = vapourShell(R * 1.06, { site: new THREE.Vector3(0, 0, 1), col: [1.0, 0.42, 0.14], steam: num(p.steam, 0.3) }); vap.mesh.scale.setScalar(R * 1.06); vap.uni.uAng.value = Math.PI * 1.1; vap.uni.uI.value = num(p.glow, 1); spinG.add(vap.mesh);
  let disc = null;
  if (p.disc) { disc = makePuffs(ctx, { count: 1600, tint: [0.34, 0.27, 0.23], glow: [1, 0.4, 0.1], heat: [1, 0.42, 0.1], heatHDR: 2.0, near: 5, groundFade: 0, fog: 0 }); root.add(disc.mesh); }
  let moon = null;
  if (p.moon) { moon = magmaShell(R * 0.27, { ang: Math.PI * 1.02, wave: 0, crust: 0.55 }); moon.uni.uR.value = R * 0.27; const dM = num(p.moon_dist, 3.8) * R, ma = num(p.moon_az, 40) * DEG; moon.mesh.position.set(Math.sin(ma) * dM, R * 0.2, -Math.cos(ma) * dM); root.add(moon.mesh); }
  const spin = num(p.spin, 3);
  function update(t, clock, camera) {
    syncEnv(ctx);
    spinG.rotation.y = spin * DEG * t; sh.uni.uT.value = t; if (moon) moon.uni.uT.value = t;
    if (disc) {
      disc.begin();
      for (let i = 0; i < 1500; i++) { const r = R * (1.2 + 2.4 * Math.pow(hf(i, 2), 0.7)), a = hf(i, 3) * 6.28 + 0.6 * Math.pow(R * 1.5 / r, 1.5) * t, zz = (hf(i, 4) - 0.5) * R * 0.08; disc.push(Math.cos(a) * r, zz, Math.sin(a) * r, R * (0.025 + 0.04 * hf(i, 5)), hf(i, 6) * 6.28, 0.4, i & 3, -1e9, 0.6, 0.45, 0.25 + 0.3 * hf(i, 8), 0, 0.45, 0.8, hf(i, 7)); }
      disc.end(camera);
    }
  }
  update(0, 0, null);
  const center = () => root.getWorldPosition(new THREE.Vector3());
  return { root, radius: R * (p.disc ? 3.8 : 1.1), height: R * 2, snapped: true, update,
    planet: { key: 'magma', R, obl: 1, center, st: null, body: sh.mesh, ring: null, rings: null, spanR: R * (p.disc ? 3.7 : 1.1) },
    subjectAt: () => { const c = center(); return [c.x, c.y, c.z]; }, subjectTop: R * 2, subjectCy: 0, anchors: {} };
}

export const CATALOG = {
  'fx.giant_impact': {
    desc: 'a planet-scale impact seen from space (planets scale, Earth radius 600). mode crust (a 100 km rock .. Vesta .. Ceres .. Moon-size): the rock comes in and sinks into the Earth, the crust peels back in a glowing wave racing round the globe, a rock-vapour atmosphere spreads behind it, the oceans boil to steam, a vapour plume rises into space. mode theia (a Mars-sized planet, 4.5 billion years ago): the two planets merge, a splash arm of molten rock wraps into a glowing debris disc, the whole Earth becomes a magma ocean and the young Moon gathers out of the disc (start s skips ahead: 10 = the disc forming, 18 = the Moon). Camera: orbit_planet / approach on it',
    actions: ['impact'],
    params: { mode: 'crust|theia', diameter: 'm (crust: 100000 .. 3474000; default Vesta 525000)', t_impact: 's (2)', start: 's already elapsed at t = 0', spread: 's for the melt to reach the far side (9)', from: '{az, el} it comes from', speed: 'scene m per screen s', radius: 'Earth radius m (600)', lon: 'deg facing the camera', lat: 'deg', site_lat: 'deg', site_lon: 'deg', y: 'm' },
    footprint: [1400, 1400], height: 1200, snap: false, fly: true, tags: ['fx', 'giant impact', 'theia', 'moon', 'vesta', 'ceres', 'magma ocean', 'crust', 'planet', 'space', 'collision', 'disc'],
  },
  'space.magma_earth': {
    desc: 'a planet whose whole surface is a magma ocean (the Earth after a giant impact, the young Earth 4.5 billion years ago): black crust plates drifting on glowing rivers of lava, a hot orange limb of rock vapour; disc true = the glowing debris disc round it; moon true = the young Moon (also molten) hanging close (moon_dist radii)',
    actions: ['idle'],
    params: { radius: 'm (600)', crust: '0..1 (0.65)', steam: '0..1', glow: '0..2', disc: 'bool', moon: 'bool', moon_dist: 'radii (3.8)', moon_az: 'deg', spin: 'deg/s' },
    footprint: [1200, 1200], height: 1200, snap: false, fly: true, tags: ['space', 'planet', 'magma', 'magma ocean', 'young earth', 'hadean', 'theia', 'moon', 'lava'],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'space.magma_earth') return buildMagma(item, ctx);
  return buildGiant(item, ctx);
}
