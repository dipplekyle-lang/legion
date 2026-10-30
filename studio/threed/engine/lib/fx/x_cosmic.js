// x_cosmic.js — E5 (explosions kit, 30 Sep 2026): the top of the ladder.
//   space.supernova   a red supergiant (Betelgeuse-like: a huge boiling red star, a few giant convection cells, dust)
//                     that collapses: the shock breaks out as a blue-white flash over its whole surface, the star
//                     balloons white-hot, then the ejecta expand into a glowing filamentary shell (red, teal, blue)
//                     round the tiny neutron star (optional pulsar beams). Time-compressed.
//   fx.supernova_sky  the same event from a planet's surface at night: a new "star" whose brightness follows its
//                     distance in light-years (M -17: at 50 ly it outshines the full Moon ~25 times and casts shadows),
//                     with a real Moon for comparison (moon: true)
//   space.kill_radius a diagram in space: the supernova, the ~50 light-year "kill sphere" round it (red, gridded),
//                     neighbouring stars, and the Sun marked at its true distance
//   fx.global_wave    the Earth from space (planets scale) with the pressure wave of a huge explosion racing round the
//                     globe from the site to the antipode and back, `passes` times (Krakatoa 1883: 7; Tsar Bomba: 3)
import * as THREE from 'three';
import { makeCPuffs, glow, burstLight, num, clamp, lerp, sstep, hf, bbody, N3_GLSL, DEG } from './x_common.js';
import { syncEnv } from './f_common.js';
import { U } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';
import { build as buildSpace } from '../nature/space.js';

const TAU = Math.PI * 2;

// ── space.supernova ──────────────────────────────────────────────────────────────────────────────────────────────
function starMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uT: { value: 0.12 }, uHDR: { value: 2.6 }, uFlash: { value: 0 }, uFlashDir: { value: new THREE.Vector3(0, 0, 1) }, uBreak: { value: 0 } },
    vertexShader: /* glsl */`#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uTime;
${N3_GLSL}
varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){ vec3 p = position; vL = normalize(p);
  p += normal * (xfbm(vL * 2.2 + vec3(uTime * 0.02)) - 0.5) * 0.06;
  vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: /* glsl */`#include <logdepthbuf_pars_fragment>
uniform float uTime; uniform float uT; uniform float uHDR; uniform float uFlash; uniform vec3 uFlashDir; uniform float uBreak;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${N3_GLSL}
vec3 bb(float T){ T = clamp(T, 0.0, 1.0);
  vec3 c = mix(vec3(0.35, 0.03, 0.0), vec3(1.0, 0.22, 0.02), smoothstep(0.0, 0.3, T));
  c = mix(c, vec3(1.0, 0.55, 0.16), smoothstep(0.25, 0.55, T)); c = mix(c, vec3(1.0, 0.9, 0.75), smoothstep(0.55, 0.85, T));
  return mix(c, vec3(0.75, 0.85, 1.0), smoothstep(0.85, 1.0, T)); }
void main(){
  #include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vW); float mu = clamp(dot(normalize(vN), V), 0.0, 1.0);
  // a few giant convection cells (Betelgeuse) + granules inside them
  float big = xfbm(vL * 1.6 + vec3(0.0, uTime * 0.01, 3.0)), gran = xn3(vL * 9.0 + vec3(uTime * 0.03));
  float cells = big * 0.75 + gran * 0.25;
  float T = uT + (cells - 0.5) * 0.22;
  float limb = pow(mu, 0.55);                                          // strong limb darkening
  vec3 col = bb(T) * uHDR * (0.35 + 0.9 * cells) * (0.25 + 0.75 * limb);
  // the shock breaking out: a blue-white front sweeping over the surface from uFlashDir
  float d = dot(vL, normalize(uFlashDir)), front = smoothstep(1.0 - uBreak * 2.2, 1.0 - uBreak * 2.2 + 0.25, d);
  col = mix(col, vec3(0.8, 0.88, 1.0) * uHDR * 4.0, front * uFlash);
  gl_FragColor = vec4(col, 1.0);
}`,
  });
}
function shellMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uI: { value: 0 }, uAge: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){ vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: /* glsl */`#include <logdepthbuf_pars_fragment>
uniform float uTime; uniform float uI; uniform float uAge;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${N3_GLSL}
float ridge(vec3 p){ float n = xn3(p); return 1.0 - abs(n * 2.0 - 1.0); }
void main(){
  #include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vW); float mu = abs(dot(normalize(vN), V));
  vec3 q = normalize(vL) * 3.0;
  // filaments: ridged noise at two scales (the Crab / Cas A look), knots where they cross
  float f1 = pow(ridge(q * 1.7 + vec3(1.3, uAge * 0.05, 0.0)), 6.0), f2 = pow(ridge(q * 4.1 + vec3(0.0, 2.7, uAge * 0.08)), 8.0);
  float fil = smoothstep(0.25, 0.9, f1 * 0.85 + f2 * 0.5), knots = pow(xn3(q * 7.0), 7.0) * 2.0;
  float rim = pow(1.0 - mu, 2.2);                                       // a shell is brightest at its limb
  fil *= 0.25 + 0.75 * rim;
  vec3 red = vec3(1.0, 0.25, 0.12), teal = vec3(0.25, 0.9, 0.8), blue = vec3(0.45, 0.55, 1.0);
  vec3 col = red * fil * (0.6 + rim * 1.6) + teal * f2 * 0.9 * (0.4 + rim) + blue * (0.08 + 0.25 * rim) * (0.5 + 0.5 * xfbm(q * 2.0)) + vec3(1.0, 0.8, 0.6) * knots * fil;
  gl_FragColor = vec4(col * uI, 1.0);
}`,
  });
}
async function buildSupernova(item, ctx) {
  const p = explicitParams(item, CATALOG['space.supernova']);
  const at = item.at || [0, 0];
  const R = num(p.radius, 400), tC = num(p.t_collapse ?? p.t, 1.5), tB = num(p.t_break, tC + 1.2), grow = Math.max(2, num(p.grow, 8)), shellK = num(p.shell, 3.5);
  const phase0 = p.phase != null ? clamp(+p.phase, 0, 2) : null;          // 1 = the remnant already (no star)
  const root = new THREE.Group(); root.name = 'space.supernova'; root.position.set(at[0], num(p.y, 0), at[1]);
  const star = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 6), starMat()); star.scale.setScalar(R); star.userData.noQA = true; root.add(star);
  const halo = glow([1.0, 0.35, 0.12], 20), flare = glow([0.8, 0.88, 1.0], 24), core = glow([0.7, 0.85, 1.0], 25);
  root.add(halo, flare, core);
  const dust = makeCPuffs(ctx, { count: 500, near: R * 0.05, fog: 0, groundFade: 0, softK: 0.2, heatHDR: 2, order: 9 }); root.add(dust.mesh);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), shellMat()); shell.userData.noQA = true; shell.renderOrder = 21; root.add(shell);
  const shell2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), shellMat()); shell2.userData.noQA = true; shell2.renderOrder = 21; root.add(shell2);
  const beams = new THREE.Group(); root.add(beams);
  // a collapsar (the gamma-ray burst): two narrow white-violet jets punching out of the poles at t_break
  const jets = new THREE.Group(); root.add(jets);
  if (p.jets === true) for (const sgn of [1, -1]) {
    const L = R * num(p.jet_len, 9), cone = new THREE.Mesh(new THREE.ConeGeometry(R * 1.3, L, 32, 1, true).translate(0, -L / 2, 0), new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`,
      fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float uI; varying vec2 vUv; void main(){
  #include <logdepthbuf_fragment>
  float core = pow(max(0.0, 1.0 - abs(fract(vUv.x * 2.0) - 0.5) * 2.0), 4.0); float fade = pow(vUv.y, 0.35);
  gl_FragColor = vec4(vec3(0.85, 0.8, 1.0) * (0.25 + 3.5 * core) * fade * uI, 1.0); }` }));
    cone.rotation.z = sgn > 0 ? Math.PI : 0; cone.userData.noQA = true; cone.renderOrder = 23; jets.add(cone);
  }
  jets.rotation.z = 0.35;
  if (p.pulsar === true) for (const s of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(R * 0.08, R * 3, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.7, 1.0).multiplyScalar(2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = s * R * 1.5; cone.rotation.z = s > 0 ? Math.PI : 0; beams.add(cone);
  }
  const L = new THREE.PointLight(new THREE.Color(1, 0.5, 0.3), 0, 0, 0); L.userData.noGovern = true; root.add(L);
  const fdir = new THREE.Vector3(0.4, 0.3, 1).normalize();
  const cues = [{ t: +tB.toFixed(2), sound: 'airburst_flash', gain: 1 }, { t: +(tB + 0.3).toFixed(2), sound: 'deep_rumble', gain: 0.8 }];
  function update(t, clock, camera) {
    const tau = t - tB, age = phase0 != null ? phase0 * grow + t * 0.4 : tau;
    const collapsed = phase0 != null ? true : t >= tC;
    // the star: boiling red giant; at the breakout the front sweeps over it, it balloons white-hot, then thins away
    const bl = phase0 != null ? 1 : sstep(0, 1.2, tau);
    star.visible = !(phase0 != null && phase0 >= 0.25) && !(tau > grow * 0.5);
    const swell = tau > 0 ? 1 + 0.45 * sstep(0.2, grow * 0.35, tau) : 1 - 0.04 * sstep(tC, tB, t);
    star.scale.setScalar(R * swell);
    star.material.uniforms.uTime.value = t; star.material.uniforms.uFlashDir.value.copy(fdir);
    star.material.uniforms.uBreak.value = tau > 0 ? sstep(0, 0.5, tau) : 0; star.material.uniforms.uFlash.value = tau > 0 ? 1 - sstep(0.8, 2.5, tau) : 0;
    star.material.uniforms.uT.value = tau > 0 ? lerp(0.95, 0.6, sstep(0.5, grow * 0.4, tau)) : 0.12;
    star.material.uniforms.uHDR.value = tau > 0 ? 4 * (1 - sstep(grow * 0.15, grow * 0.5, tau)) + 0.2 : 2.6;
    halo.material.uniforms.uS.value = R * 5; halo.material.uniforms.uI.value = tau > 0 ? 0.5 * (1 - sstep(0, grow * 0.3, tau)) : 0.35;
    flare.material.uniforms.uS.value = R * 8; flare.material.uniforms.uMinPx.value = tau > 0 ? 1600 * Math.exp(-tau / 0.8) : 0; flare.material.uniforms.uI.value = tau > 0 ? 3 * Math.exp(-tau / 0.9) + 0.4 * Math.exp(-tau / 4) : 0;
    core.material.uniforms.uS.value = R * 0.25; core.material.uniforms.uMinPx.value = collapsed && (tau > grow * 0.3 || phase0 != null) ? 16 : 0; core.material.uniforms.uI.value = collapsed && (tau > grow * 0.3 || phase0 != null) ? 2.5 : 0;
    // the shell of ejecta: grows fast then slower, brightens as the star fades
    const sa = phase0 != null ? phase0 : Math.max(0, tau / grow);
    const Rs = R * (1 + shellK * (1 - Math.exp(-2.2 * sa)) / (1 - Math.exp(-2.2)));
    shell.visible = shell2.visible = sa > 0.02;
    shell.scale.setScalar(Rs); shell2.scale.setScalar(Rs * 1.18);
    shell.material.uniforms.uI.value = 1.4 * sstep(0.02, 0.35, sa); shell.material.uniforms.uAge.value = age; shell.material.uniforms.uTime.value = t;
    shell2.material.uniforms.uI.value = 0.35 * sstep(0.05, 0.4, sa); shell2.material.uniforms.uAge.value = age * 0.7 + 5;
    beams.visible = p.pulsar === true && sa > 0.3; beams.rotation.z = 0.35; beams.rotation.y = t * 2.2;
    const jk = tau > 0 ? sstep(0, 0.4, tau) : 0; jets.visible = jk > 0; jets.children.forEach((c) => { c.scale.set(1, Math.max(0.01, sstep(0, 1.2, tau)), 1); c.material.uniforms.uI.value = 1.6 * jk * (0.85 + 0.15 * Math.sin(t * 17)); });
    L.intensity = tau > 0 ? 5e5 * (Math.exp(-tau / 1.5) + 0.1) : 1e4; L.color.copy(tau > 0 ? new THREE.Color(0.85, 0.9, 1) : new THREE.Color(1, 0.45, 0.25));
    // the dusty envelope of the old giant (lit from inside, red); blown away by the shell
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    if (!camera) return;
    dust.begin();
    if (phase0 == null || phase0 < 0.3) for (let i = 0; i < 420; i++) {
      const a = hf(i, 1) * TAU, cz = hf(i, 2) * 2 - 1, s = Math.sqrt(1 - cz * cz), r0 = R * (1.25 + 1.4 * hf(i, 3));
      const r = Math.max(r0, tau > 0 ? Rs * (0.92 + 0.1 * hf(i, 4)) : r0);
      const x = Math.cos(a) * s * r, y = cz * r, z = Math.sin(a) * s * r;
      dust.push(x, y, z, R * (0.18 + 0.2 * hf(i, 5)), hf(i, 6) * 6.28 + t * 0.02, 0.09 * (1 - sstep(0.1, 0.6, sa)), i & 3, -1e12, 0.5, 0.6, 0, 0, 0.85, 0.5, hf(i, 7), 0.6, 0.8, 0.3, 0.18, 0);
    }
    dust.end(camera);
  }
  update(0, 0, null);
  return { root, radius: R * shellK, height: R * 2, snapped: true, fly: true, update, cues, contact: false,
    flashAt: (t) => { const tau = t - tB; return tau < 0 || phase0 != null ? 0 : clamp(1.4 * Math.exp(-tau / 0.9)); },
    planet: { center: () => root.getWorldPosition(new THREE.Vector3()), R: R * 1.5 },
    anchors: { core: new THREE.Vector3(0, 0, 0) } };
}

// ── fx.supernova_sky ─────────────────────────────────────────────────────────────────────────────────────────────
function moonTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#e9e7e1'); gr.addColorStop(0.9, '#cfccc4'); gr.addColorStop(1, 'rgba(200,198,190,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, TAU); g.fill();
  const maria = [[100, 90, 38], [150, 80, 30], [160, 130, 34], [110, 150, 28], [80, 125, 22], [135, 175, 18]];
  for (const [x, y, r] of maria) { g.fillStyle = 'rgba(95,95,100,0.45)'; g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0.3, 0, TAU); g.fill(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(70,70,75,${0.1 + 0.15 * hf(i, 1)})`; g.beginPath(); g.arc(30 + hf(i, 2) * 196, 30 + hf(i, 3) * 196, 2 + 5 * hf(i, 4), 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
async function buildSNSky(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.supernova_sky']);
  const at = item.at || [0, 0], G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.supernova_sky'; root.position.set(at[0], G.height(at[0], at[1]), at[1]);
  const ly = Math.max(0.5, num(p.ly, 50)), M = String(p.type || 'ii').toLowerCase() === 'ia' ? -19.3 : -17.0;
  const mag = M + 5 * Math.log10(ly / 3.2616) - 5;                        // apparent magnitude
  const vsMoon = Math.pow(10, -0.4 * (mag + 12.7));                        // x the full Moon
  const az = num(p.az, 160), el = num(p.el, 35), t0 = num(p.t, 1), D = 9000;
  const dir = new THREE.Vector3(Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), -Math.cos(az * DEG) * Math.cos(el * DEG));
  const pos = dir.clone().multiplyScalar(D);
  const bright = clamp(Math.log10(vsMoon + 1e-3) / 3 + 0.45, 0.05, 1.6);   // 0 faint star .. 1 = the full Moon x25 .. more
  const pt = glow([0.85, 0.9, 1.0], 25), hal = glow([0.7, 0.8, 1.0], 24), sky = glow([0.35, 0.45, 0.7], 18);
  pt.position.copy(pos); hal.position.copy(pos); sky.position.copy(pos); root.add(pt, hal, sky);
  // diffraction spikes: two crossed thin quads, additive
  const spk = new THREE.Group(); spk.position.copy(pos); root.add(spk);
  const spMat = new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vQ; void main(){ vQ = position.xy; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy; gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float uI; varying vec2 vQ; void main(){
  #include <logdepthbuf_fragment>
  float L = 1.0; vec2 q = vQ / 600.0; float a = exp(-abs(q.y) * 900.0) * exp(-abs(q.x) * 4.0) + exp(-abs(q.x) * 900.0) * exp(-abs(q.y) * 4.0);
  gl_FragColor = vec4(vec3(0.8, 0.88, 1.0) * a * uI, 1.0); }` });
  const spQ = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), spMat); spQ.frustumCulled = false; spQ.userData.noQA = true; spQ.renderOrder = 25; spk.add(spQ);
  // the Moon for comparison
  let moon = null;
  if (p.moon !== false) {
    const maz = num(p.moon_az, az + 40), mel = num(p.moon_el, Math.max(12, el - 12));
    const md = new THREE.Vector3(Math.sin(maz * DEG) * Math.cos(mel * DEG), Math.sin(mel * DEG), -Math.cos(maz * DEG) * Math.cos(mel * DEG));
    moon = new THREE.Mesh(new THREE.CircleGeometry(D * 0.0045 * 1.0, 48), new THREE.MeshBasicMaterial({ map: moonTex(), transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
    moon.position.copy(md.multiplyScalar(D)); moon.lookAt(0, 0, 0); moon.userData.noQA = true; moon.renderOrder = 19; root.add(moon);
    const mh = glow([0.8, 0.85, 0.95], 19); mh.position.copy(moon.position); mh.material.uniforms.uS.value = D * 0.02; mh.material.uniforms.uI.value = 0.18; root.add(mh);
  }
  const BL = burstLight(root, { shadows: p.shadows !== false && bright > 0.6, color: [0.8, 0.86, 1.0], box: 60 });
  function update(t, clock, camera) {
    const on = sstep(t0, t0 + 1.2, t);
    const k = on * bright;
    pt.material.uniforms.uS.value = 10; pt.material.uniforms.uMinPx.value = 4 + 26 * k; pt.material.uniforms.uI.value = 2.5 * on * (0.5 + k);
    hal.material.uniforms.uS.value = 60; hal.material.uniforms.uMinPx.value = 90 * k * k + 10 * k; hal.material.uniforms.uI.value = 0.6 * k;
    sky.material.uniforms.uS.value = 3000; sky.material.uniforms.uMinPx.value = 900 * sstep(0.7, 1.4, bright) * on; sky.material.uniforms.uI.value = 0.35 * sstep(0.7, 1.4, bright) * on;
    spMat.uniforms.uI.value = 1.2 * k * sstep(0.35, 0.8, bright);
    if (!camera && typeof window !== 'undefined' && window.__f3d) camera = window.__f3d.camera;
    BL.aim(camera, pos, 0.9 * k * k);
  }
  update(0, 0, null);
  return { root, radius: 50, height: 10, snapped: true, update, contact: false, anchors: { star: pos.clone(), moon: moon ? moon.position.clone() : pos.clone() },
    info: { magnitude: +mag.toFixed(1), x_full_moon: +vsMoon.toPrecision(2) } };
}

// ── space.kill_radius ────────────────────────────────────────────────────────────────────────────────────────────
async function buildKill(item, ctx) {
  const p = explicitParams(item, CATALOG['space.kill_radius']);
  const at = item.at || [0, 0];
  const lyK = num(p.ly, 50), sunLy = num(p.sun_ly, 150), mpl = num(p.m_per_ly, 900 / Math.max(sunLy, lyK * 2.2));
  const root = new THREE.Group(); root.name = 'space.kill_radius'; root.position.set(at[0], num(p.y, 0), at[1]);
  const Rk = lyK * mpl;
  const sph = new THREE.Mesh(new THREE.SphereGeometry(Rk, 64, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.12, 0.08), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  sph.userData.noQA = true; sph.renderOrder = 15; root.add(sph);
  const grid = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(Rk, 24, 12), 1), new THREE.LineBasicMaterial({ color: 0xe0503a, transparent: true, opacity: 0.45 }));
  grid.userData.noQA = true; root.add(grid);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(Rk, Rk * 0.006, 8, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.5, 0.3) })); rim.rotation.x = Math.PI / 2; root.add(rim);
  const sn = glow([0.8, 0.88, 1.0], 25); sn.material.uniforms.uS.value = Rk * 0.1; sn.material.uniforms.uMinPx.value = 26; sn.material.uniforms.uI.value = 3; root.add(sn);
  const sd = new THREE.Vector3(...(Array.isArray(p.sun_dir) ? p.sun_dir : [1, 0.15, 0.4])).normalize();
  const sunPos = sd.clone().multiplyScalar(sunLy * mpl);
  const sun = glow([1.0, 0.85, 0.45], 25); sun.position.copy(sunPos); sun.material.uniforms.uS.value = Rk * 0.05; sun.material.uniforms.uMinPx.value = 14; sun.material.uniforms.uI.value = 2.4; root.add(sun);
  const ring = new THREE.Mesh(new THREE.RingGeometry(Rk * 0.05, Rk * 0.058, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.7, 0.6), side: THREE.DoubleSide, transparent: true, depthWrite: false }));
  ring.position.copy(sunPos); root.add(ring);
  // neighbouring stars: points of a few colours
  const n = Math.round(clamp(num(p.stars, 400), 0, 3000)), P = new Float32Array(n * 3), C = new Float32Array(n * 3), Rmax = Math.max(sunLy, lyK * 2) * mpl * 1.4;
  for (let i = 0; i < n; i++) {
    const a = hf(i, 1) * TAU, cz = hf(i, 2) * 2 - 1, s = Math.sqrt(1 - cz * cz), r = Rmax * Math.cbrt(hf(i, 3));
    P[i * 3] = Math.cos(a) * s * r; P[i * 3 + 1] = cz * r * 0.6; P[i * 3 + 2] = Math.sin(a) * s * r;
    const k = hf(i, 4), c = k < 0.6 ? [1, 0.95, 0.85] : k < 0.85 ? [1, 0.7, 0.45] : [0.7, 0.8, 1]; const b = 0.6 + 1.2 * hf(i, 5);
    C[i * 3] = c[0] * b; C[i * 3 + 1] = c[1] * b; C[i * 3 + 2] = c[2] * b;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  stars.userData.noQA = true; root.add(stars);
  function update(t, clock, camera) { if (camera) ring.lookAt(camera.getWorldPosition(new THREE.Vector3())); sph.material.opacity = 0.1 + 0.03 * Math.sin(t * 1.5); }
  update(0);
  return { root, radius: Math.max(Rk, sunLy * mpl), height: Rk * 2, snapped: true, fly: true, update, contact: false,
    planet: { center: () => root.getWorldPosition(new THREE.Vector3()), R: Rk },
    anchors: { sun: sunPos.clone(), supernova: new THREE.Vector3(0, 0, 0), edge: new THREE.Vector3(Rk, 0, 0) },
    info: { metres_per_ly: +mpl.toFixed(2), kill_radius_m: +Rk.toFixed(0) } };
}

// ── fx.global_wave ───────────────────────────────────────────────────────────────────────────────────────────────
const latLonDir = (lat, lon) => new THREE.Vector3(-Math.sin(lon * DEG) * Math.cos(lat * DEG), Math.sin(lat * DEG), -Math.cos(lon * DEG) * Math.cos(lat * DEG));
async function buildGlobalWave(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.global_wave']);
  const at = item.at || [0, 0];
  const R = num(p.radius, 600), t0 = num(p.t, 1), per = Math.max(1, num(p.period, 8)), passes = Math.round(clamp(num(p.passes, 3), 1, 9));
  const slat = num(p.site_lat, -6.1), slon = num(p.site_lon, 105.4);
  const ey = p.y != null ? +p.y : (ctx.ground ? ctx.ground.height(at[0], at[1]) : 0) + 170;
  const e = await buildSpace('space.earth', { at, y: ey, radius: R, spin: num(p.spin, 0.15), lon: num(p.lon, slon), lat: num(p.lat, slat * 0.6), tilt: num(p.tilt, 23.4), face: p.face, clouds: 0.8 }, ctx);
  const root = e.root; root.name = 'fx.global_wave';
  const site = latLonDir(slat, slon);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSite: { value: site }, uAng: { value: 0 }, uW: { value: 0.035 }, uI: { value: 0 }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vL; varying vec3 vN; varying vec3 vW;
void main(){ vL = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: /* glsl */`#include <logdepthbuf_pars_fragment>
uniform vec3 uSite; uniform float uAng; uniform float uW; uniform float uI; uniform float uTime;
varying vec3 vL; varying vec3 vN; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  float a = acos(clamp(dot(vL, normalize(uSite)), -1.0, 1.0));
  float d = (a - uAng) / uW, band = exp(-d * d * 2.0) + 0.35 * exp(-max(d, 0.0) * 0.25) * step(0.0, d) * 0.0;
  vec3 V = normalize(cameraPosition - vW); float mu = abs(dot(normalize(vN), V));
  float wake = exp(-max(-d, 0.0) * 0.18) * step(d, 0.0) * 0.18;      // a faint wake behind the front
  gl_FragColor = vec4(vec3(0.75, 0.9, 1.0) * (band + wake) * uI * (0.45 + 0.8 * pow(1.0 - mu, 1.5)), 1.0);
}`,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 128, 64), mat); shell.userData.noQA = true; shell.renderOrder = 21; e.spinG.add(shell);
  const mark = glow([1.0, 0.8, 0.5], 22); mark.position.copy(site).multiplyScalar(R * 1.02); e.spinG.add(mark);
  function update(t, clock, camera) {
    e.update(t);
    const tau = t - t0;
    if (tau < 0) { mat.uniforms.uI.value = 0; mark.material.uniforms.uI.value = 0; return; }
    const x = tau / (per / 2), k = Math.floor(x), f = x - k;                   // each half period: source -> antipode or back
    const ang = (k % 2 === 0 ? f : 1 - f) * Math.PI;
    mat.uniforms.uAng.value = ang; mat.uniforms.uI.value = k < passes * 2 ? 1.6 * Math.pow(0.8, k) * sstep(0, 0.15, tau) : 0; mat.uniforms.uTime.value = t;
    mark.material.uniforms.uS.value = R * 0.25; mark.material.uniforms.uMinPx.value = 6; mark.material.uniforms.uI.value = 1.2 * Math.exp(-tau / 1.5) + 0.3;
  }
  update(0, 0, null);
  return { root, radius: R * 1.05, height: R * 2, snapped: true, fly: true, update, contact: false, planet: e.planet || { center: () => root.getWorldPosition(new THREE.Vector3()), R }, anchors: {} };
}

export const CATALOG = {
  'space.supernova': {
    desc: 'a SUPERNOVA in space (biome space): a red supergiant (Betelgeuse-like: a huge boiling red star with a few giant convection cells, strong limb darkening, a dusty red envelope) that collapses at t_collapse; at t_break the shock breaks out as a blue-white flash sweeping over its whole surface, the star balloons white-hot and fades, and the ejecta expand into a glowing filamentary shell (red filaments, teal knots, a blue glow: the Crab / Cassiopeia A look) round the tiny blue-white neutron star (pulsar: true = two rotating beams). phase 1 = the remnant already (no star). Camera: orbit_planet / approach on it (sized from radius)',
    actions: ['explode'],
    params: { radius: 'm star radius (400)', t_collapse: 's', t_break: 's the flash (t_collapse + 1.2)', grow: 's the shell takes to expand (8)', shell: 'x the star radius the shell reaches (3.5)', pulsar: 'bool', jets: 'bool: a collapsar (the gamma-ray burst): two narrow white-violet jets from the poles at t_break', jet_len: 'x radius (14)', phase: '0..2 start developed (1 = the remnant)', y: 'm' },
    footprint: [800, 800], height: 800, fly: true, snap: false, contact: false,
    tags: ['space', 'supernova', 'star', 'explosion', 'betelgeuse', 'red supergiant', 'neutron star', 'pulsar', 'nebula', 'remnant', 'crab'],
    examples: [{ note: 'the collapse and the shell', spec: { world: { biome: 'space' }, objects: [{ kind: 'space.supernova', at: [0, 0], t_collapse: 1.5, grow: 8 }], camera: { move: 'orbit_planet', target: 'objects:0', dist: 3.2, arc: 25, el: 12 } } }],
  },
  'fx.supernova_sky': {
    desc: 'a SUPERNOVA SEEN FROM A PLANET\'S SURFACE at night (put it at the stage): a new "star" flaring at `t` whose brightness follows its distance `ly` in light-years (a type II peaks at absolute magnitude -17: at 50 ly it is ~25 x the full Moon and casts shadows, at 500 ly about a quarter Moon, at 5,000 ly a very bright star): a dazzling blue-white point, a halo, diffraction spikes, the sky round it paling, a hard light and shadows when it is bright; moon: true puts the full Moon in the sky for comparison. Use look.time night',
    actions: ['flare'],
    params: { ly: 'light-years (50)', type: 'ii|ia (ia peaks at -19.3)', az: 'deg (160)', el: 'deg (35)', t: 's', moon: 'bool (true)', moon_az: 'deg', moon_el: 'deg', shadows: 'bool' },
    footprint: [100, 100], height: 10, snap: false, contact: false,
    tags: ['fx', 'supernova', 'sky', 'star', 'night', 'light-years', 'brightness', 'moon'],
    examples: [{ note: 'at 50 light-years: brighter than the Moon', spec: { look: { time: 'night', sky: 'clear' }, world: { biome: 'plains' }, objects: [{ kind: 'fx.supernova_sky', at: [0, 0], ly: 50, az: 180, el: 30, t: 1 }], cast: [{ ref: 'witness', at: [0, -3], heading: 180, action: 'look_up' }], camera: { move: 'keys', fov: 60, target: 'cast:0', keys: [{ t: 0, at: [2, 3], alt: 1.2, look_at: [0, -40], look_h: 18 }, { t: 7, at: [1.6, 2.6], alt: 1.25, look_at: [0, -40], look_h: 19 }] } } }],
  },
  'space.kill_radius': {
    desc: 'a SPACE DIAGRAM of a supernova\'s danger zone (biome space): the supernova as a blinding point, a translucent red gridded sphere of radius `ly` light-years (~50 ly: close enough to strip the ozone layer), neighbouring stars as points, and the Sun marked (a yellow point in a ring) at `sun_ly` light-years; scaled to fit (info reports metres per light-year). Put label.almanac texts on anchors sun / edge',
    actions: ['idle'],
    params: { ly: 'kill radius in light-years (50)', sun_ly: 'the Sun\'s distance in ly (150; Betelgeuse 548)', sun_dir: '[x, y, z]', stars: 'count (400)', m_per_ly: 'scene metres per light-year (auto)' },
    footprint: [1000, 1000], height: 600, fly: true, snap: false, contact: false,
    tags: ['space', 'supernova', 'kill radius', 'light-years', 'diagram', 'sun', 'distance', 'danger zone'],
    examples: [{ note: 'the kill sphere and the Sun outside it', spec: { world: { biome: 'space' }, objects: [{ kind: 'space.kill_radius', at: [0, 0], ly: 50, sun_ly: 150 }], camera: { move: 'orbit_planet', target: 'objects:0', dist: 3.4, arc: 30, el: 20 } } }],
  },
  'fx.global_wave': {
    desc: 'THE PRESSURE WAVE GOING ROUND THE EARTH (biome space, planets scale: Earth radius 600): the Earth from space with a pale ring racing out from the explosion site (site_lat / site_lon; default Krakatoa), shrinking to the antipode, coming back, `passes` times (Krakatoa 1883: 7 passes recorded by barographs; Tsar Bomba 1961: 3). Real circuit ~36 hours, here `period` s. The Earth faces the site (lon/lat default)',
    actions: ['spread'],
    params: { site_lat: 'deg (-6.1)', site_lon: 'deg (105.4)', t: 's', period: 's for a full circuit there and back (8)', passes: '1..9 (3)', radius: 'Earth radius (600)', lon: 'deg facing the camera', lat: 'deg', y: 'm' },
    footprint: [1200, 1200], height: 1200, fly: true, snap: false, contact: false,
    tags: ['fx', 'space', 'earth', 'pressure wave', 'shock wave', 'krakatoa', 'tsar bomba', 'global', 'barograph', 'sound'],
    examples: [{ note: 'Krakatoa\'s wave circling the globe', spec: { world: { biome: 'space' }, objects: [{ kind: 'fx.global_wave', at: [0, 0], t: 1, period: 8, passes: 3 }], camera: { move: 'orbit_planet', target: 'objects:0', dist: 2.6, arc: 40, el: 10 } } }],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'fx.supernova_sky') return buildSNSky(item, ctx);
  if (kind === 'space.kill_radius') return buildKill(item, ctx);
  if (kind === 'fx.global_wave') return buildGlobalWave(item, ctx);
  return buildSupernova(item, ctx);
}
