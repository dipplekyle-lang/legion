// a_global.js — E2 (asteroid kit, 29 Sep 2026): what a big impact does to the whole world, seen from the ground.
//   fx.ejecta_sky   hours after Chicxulub: the sky glows red-orange like an oven as trillions of ejecta grains re-enter
//                   everywhere at once; countless short meteor streaks, the land lit hot red from above (heat pulse)
//   fx.firestorm    the forests igniting under that sky: spot fires catching across the land at staggered times, growing
//                   into walls of flame with smoke columns leaning in the wind
//   fx.ejecta_rain  rock falling out of the sky a minute and a half after an impact: from a light rain of gravel to metres
//                   of rubble; glowing streaks, stones striking the ground with dust bursts
//   flora.dead      the impact winter's dead vegetation: grey-brown dead ferns, cycads and bare, broken trees, frosted
//                   (pair with look overcast|storm, grade cold, weather snow / ash + ash_cover: the dark, snowy winter)
import * as THREE from 'three';
import { makePuffs, makeFlames, makeSparks, syncEnv, hf, clamp, lerp, sstep } from './f_common.js';
import { makeStreaks } from './a_entry.js';
import { explicitParams } from './a_asteroid.js';
import { patchMaterial } from '../shared/env.js';

const DEG = Math.PI / 180;
const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const rampOf = (p, dur) => { const r = Array.isArray(p.ramp) ? p.ramp.map(Number) : [num(p.t0, 0), num(p.t0, 0) + num(p.rise, 2)]; return (t) => sm((t - r[0]) / Math.max(0.01, r[1] - r[0])); };

// ── fx.ejecta_sky ───────────────────────────────────────────────────────────────────────────────────────────────
async function buildEjectaSky(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.ejecta_sky']);
  const root = new THREE.Group(); root.name = 'fx.ejecta_sky';
  const I0 = num(p.intensity, 1), K = rampOf(p, ctx.dur);
  // an inside-out dome round the camera: the glow is strongest overhead and toward `az` (the impact side), hazy at the horizon
  const az = num(p.az, 160) * DEG, dirI = new THREE.Vector3(Math.sin(az) * 0.5, 0.85, -Math.cos(az) * 0.5).normalize();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 }, uDir: { value: dirI }, uT: { value: 0 } }, transparent: true, depthWrite: false, depthTest: true, side: THREE.BackSide, blending: THREE.NormalBlending,
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
varying vec3 vD; uniform float uI; uniform vec3 uDir; uniform float uT;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
void main(){
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float up = clamp(d.y, 0.0, 1.0);
  float g = 0.55 + 0.45 * max(dot(d, uDir), 0.0);
  vec2 q = d.xz / max(0.15, d.y + 0.25) * 3.0;
  float mott = 0.75 + 0.35 * n2(q + uT * 0.05) + 0.15 * n2(q * 3.1 - uT * 0.08);        // a churning, uneven glow
  vec3 hot = mix(vec3(0.85, 0.16, 0.03), vec3(1.0, 0.55, 0.18), pow(up, 0.7) * g);
  vec3 col = hot * (0.9 + 1.6 * pow(up, 1.2) * g) * mott;
  float a = uI * smoothstep(-0.12, 0.25, d.y) * 0.96;
  gl_FragColor = vec4(col * 1.6, a); }`,
  }));
  dome.renderOrder = 2; dome.frustumCulled = false; dome.userData.noQA = true; root.add(dome);
  // the streaks: ejecta grains burning in on steep paths (short, fast, everywhere)
  const NS = clamp(Math.round(num(p.streaks, 260)), 0, 1200);
  const S = makeStreaks(NS + 2, 26); root.add(S.mesh);
  const Rs = 3000, T = new THREE.Vector3(), H = new THREE.Vector3(), cam = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const light = new THREE.HemisphereLight(0xff5a1e, 0x3a0c04, 0); root.add(light);
  const key = new THREE.DirectionalLight(0xff6a28, 0); key.position.copy(dirI).multiplyScalar(500); root.add(key, key.target);
  const heat = num(p.light, 2.2);
  function update(t, clock, camera) {
    const k = K(t) * I0;
    dome.material.uniforms.uI.value = k; dome.material.uniforms.uT.value = t;
    if (camera) { camera.getWorldPosition(cam); dome.position.copy(cam); }
    light.intensity = k * heat; key.intensity = k * heat * 0.6;
    if (camera) { key.target.position.copy(cam); key.position.copy(cam).addScaledVector(dirI, 500); key.target.updateMatrixWorld(); }
    S.begin(camera, (ctx.renderer && ctx.renderer.domElement.height) || 1080);
    if (k > 0.01) for (let i = 0; i < NS; i++) {
      const life = 0.5 + 0.9 * hf(i, 1), ph = (t / life + hf(i, 2)) % 1, cyc = Math.floor(t / life + hf(i, 2));
      const az2 = hf(i + cyc * 7919, 3) * Math.PI * 2, el = (12 + 70 * Math.sqrt(hf(i + cyc * 7919, 4))) * DEG, len = (3 + 7 * hf(i, 5)) * DEG;
      a.set(Math.sin(az2) * Math.cos(el), Math.sin(el), -Math.cos(az2) * Math.cos(el));
      b.set(Math.sin(az2 + 0.05) * Math.cos(el - len), Math.sin(el - len), -Math.cos(az2 + 0.05) * Math.cos(el - len));
      const u = ph, hd = a.clone().lerp(b, u).normalize(), tl = a.clone().lerp(b, Math.max(0, u - 0.35)).normalize();
      H.copy(cam).addScaledVector(hd, Rs); T.copy(cam).addScaledVector(tl, Rs);
      S.push(T, H, 3, k * (0.6 + 1.2 * hf(i, 6)) * Math.sin(Math.PI * u), [1.0, 0.62, 0.3]);
    }
    S.end();
  }
  update(0, 0, null);
  return { root, radius: 10, height: 10, snapped: true, update, anchors: {}, farNeed: 8000 };
}

// ── fx.firestorm ────────────────────────────────────────────────────────────────────────────────────────────────
async function buildFirestorm(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.firestorm']);
  const at = item.at || [0, 0];
  const G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.firestorm'; root.position.set(at[0], 0, at[1]);
  const R = num(p.radius, 600), nF = clamp(Math.round(num(p.fires, 60)), 1, 300), t0 = num(p.t0, 0), spread = num(p.spread, 6);
  const flames = makeFlames(ctx, { count: nF * 26 + 10 }); root.add(flames.mesh);
  const smoke = makePuffs(ctx, { count: nF * 40 + 50, tint: [0.2, 0.18, 0.17], glow: [1, 0.4, 0.12], heat: [1, 0.45, 0.12], heatHDR: 2.5, near: 4, groundFade: 0.1, fog: 0.8 });
  root.add(smoke.mesh);
  const embers = makeSparks(ctx, { count: 500, maxPx: 3, minPx: 1 }); root.add(embers.mesh);
  const F = [];
  for (let i = 0; i < nF; i++) {
    const r = Math.sqrt(hf(i, 1)) * R, a = hf(i, 2) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    F.push({ x, z, gy: G.height(x + at[0], z + at[1]), ti: t0 + spread * hf(i, 3) * (0.3 + 0.7 * r / R), w: 6 + 18 * hf(i, 4), h: 8 + 20 * hf(i, 5) });
  }
  const wind = ctx.wind || { x: 3, z: 0 };
  const light = new THREE.PointLight(0xff6a20, 0, R * 3, 1.5); light.position.set(0, 30, 0); root.add(light);
  function update(t, clock, camera) {
    syncEnv(ctx);
    flames.begin(t); smoke.begin(); embers.begin();
    let lit = 0;
    for (const [i, f] of F.entries()) {
      const age = t - f.ti; if (age < 0) continue;
      const g = sm(age / 2.5); lit += g;
      for (let k = 0; k < 24; k++) {
        const ox = (hf(i * 31 + k, 11) - 0.5) * f.w * (0.5 + g), oz = (hf(i * 31 + k, 12) - 0.5) * f.w * (0.5 + g);
        flames.push(f.x + ox, f.gy + (hf(i * 31 + k, 16) - 0.5) * 0.3, f.z + oz, f.h * g * (0.5 + 0.7 * hf(i * 31 + k, 13)), f.h * 0.35 * g * (0.6 + 0.6 * hf(i * 31 + k, 14)), hf(i * 31 + k, 15), 1.1, 0.4 + 0.5 * hf(i * 31 + k, 17));
      }
      for (let k = 0; k < 36; k++) {
        const life = 8, sa = ((t - f.ti) + hf(i * 41 + k, 21) * life) % life; if (sa > age) continue;
        const rise = sa * (6 + 5 * hf(i * 41 + k, 22)), lean = sa * sa * 0.15;
        smoke.push(f.x + wind.x * lean + (hf(i * 41 + k, 23) - 0.5) * f.w, f.gy + f.h * 0.7 + rise, f.z + wind.z * lean + (hf(i * 41 + k, 24) - 0.5) * f.w, f.w * 0.5 + sa * 2.5, hf(i * 41 + k, 25) * 6.28 + sa * 0.1, 0.55 * g * (1 - sa / life), k & 3, -1e9, 0.35, 0.8 * Math.exp(-sa / 1.5), clamp(0.6 * Math.exp(-sa / 1.0)), 0.2, clamp(0.2 + sa / life), 0.6, hf(i * 41 + k, 26));
      }
      if (i < 20) for (let k = 0; k < 20; k++) { const life = 3, sa = (t * 1.3 + hf(i * 17 + k, 31) * life) % life; embers.push(f.x + (hf(i * 17 + k, 32) - 0.5) * f.w + wind.x * sa * 2, f.gy + f.h * 0.5 + sa * 7, f.z + (hf(i * 17 + k, 33) - 0.5) * f.w + wind.z * sa * 2, 4 * g * (1 - sa / life), 1.6 * g * (1 - sa / life), 0.3, 0.25); }
    }
    flames.end(); smoke.end(camera); embers.end();
    light.intensity = Math.min(60, lit * 1.5) * num(p.light, 1);
  }
  update(0, 0, null);
  return { root, radius: R, height: 40, snapped: true, update, anchors: {}, contact: false, footprint: [R * 2, R * 2] };
}

// ── fx.ejecta_rain ──────────────────────────────────────────────────────────────────────────────────────────────
async function buildEjectaRain(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.ejecta_rain']);
  const at = item.at || [0, 0];
  const G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.ejecta_rain'; root.position.set(at[0], 0, at[1]);
  const R = num(p.radius, 80), dens = num(p.density, 1), t0 = num(p.t0, 0.5), glow = num(p.glow, 0.6), size = num(p.size, 0.12);
  const N = clamp(Math.round(260 * dens), 20, 2000);
  const az = num(p.from, 160) * DEG, slant = num(p.slant, 25) * DEG;
  const dirF = new THREE.Vector3(Math.sin(az) * Math.sin(slant), -Math.cos(slant), -Math.cos(az) * Math.sin(slant)).normalize();   // falling direction
  const S = makeStreaks(N + 2, 24); root.add(S.mesh);
  const rockG = new THREE.IcosahedronGeometry(1, 0), rockM = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.95, emissive: 0xff5010, emissiveIntensity: 0 }));
  const rocks = new THREE.InstancedMesh(rockG, rockM, N); rocks.frustumCulled = false; rocks.castShadow = true; rocks.userData.noQA = true; root.add(rocks);
  const dust = makePuffs(ctx, { count: Math.min(3000, N * 6), tint: [0.55, 0.5, 0.45], near: 1, groundFade: 0.05 }); root.add(dust.mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), T = new THREE.Vector3(), H = new THREE.Vector3();
  const vFall = num(p.speed, 45);
  const D = []; for (let i = 0; i < N; i++) { const r = Math.sqrt(hf(i, 1)) * R, a = hf(i, 2) * Math.PI * 2; const x = Math.cos(a) * r, z = Math.sin(a) * r; D.push({ x, z, gy: G.height(x + at[0], z + at[1]), tl: t0 + hf(i, 3) * num(p.span, 6), s: size * (0.3 + 1.7 * Math.pow(hf(i, 4), 3)) }); }
  function update(t, clock, camera) {
    syncEnv(ctx);
    S.begin(camera, (ctx.renderer && ctx.renderer.domElement.height) || 1080, root.position); dust.begin();
    for (let i = 0; i < N; i++) {
      const d = D[i], dt = t - d.tl, H0 = 120;                         // it falls from H0 m in H0 / vFall s, lands at tl + that
      const tf = H0 / vFall, u = dt / tf;
      if (u < 0) { m4.makeScale(0, 0, 0); rocks.setMatrixAt(i, m4); continue; }
      if (u < 1) {
        const h = H0 * (1 - u);
        v.set(d.x - dirF.x / dirF.y * -h, d.gy + h, d.z - dirF.z / dirF.y * -h);
        q.setFromAxisAngle(sc.set(1, 1, 0).normalize(), t * 8 + i); m4.compose(v, q, sc.setScalar(d.s)); rocks.setMatrixAt(i, m4);
        H.copy(v); T.copy(v).addScaledVector(dirF, -vFall * 0.12);
        S.push(T, H, d.s * 0.8, glow * 1.5, [1.0, 0.55, 0.25]);
      } else {
        const lie = Math.min(dt - tf, 0.3);
        v.set(d.x, d.gy + d.s * 0.3, d.z); q.setFromAxisAngle(sc.set(0, 1, 0), i); m4.compose(v, q, sc.setScalar(d.s)); rocks.setMatrixAt(i, m4);
        const ag = dt - tf; if (ag < 2.5 && i % 1 === 0) for (let k = 0; k < 4; k++) dust.push(d.x + (hf(i * 5 + k, 7) - 0.5) * d.s * 6 * (1 + ag), d.gy + d.s * (1 + ag * 3) * hf(i * 5 + k, 8), d.z + (hf(i * 5 + k, 9) - 0.5) * d.s * 6 * (1 + ag), d.s * (2 + ag * 4), hf(i * 5 + k, 10) * 6.28, 0.35 * (1 - ag / 2.5), k & 3, d.gy - 0.1, 0.9, 0, 0, 0, 0.5, 0.9, hf(i * 5 + k, 11));
        void lie;
      }
    }
    rocks.instanceMatrix.needsUpdate = true; rockM.emissiveIntensity = glow * 0.8;
    S.end(); dust.end(camera);
  }
  update(0, 0, null);
  return { root, radius: R, height: 120, snapped: true, update, anchors: {}, contact: false, cues: [{ t: t0 + 120 / vFall, sound: 'gravel_rain' }] };
}

// ── flora.dead ──────────────────────────────────────────────────────────────────────────────────────────────────
async function buildDead(item, ctx) {
  const p = explicitParams(item, CATALOG['flora.dead']);
  const at = item.at || [0, 0];
  const G = ctx.ground;
  const root = new THREE.Group(); root.name = 'flora.dead'; root.position.set(at[0], 0, at[1]);
  const R = num(p.radius, 60), n = clamp(Math.round(num(p.count, 220)), 1, 3000), frost = num(p.frost, 0.5), trees = clamp(Math.round(num(p.trees, 30)), 0, 600);
  // a dead fern / cycad clump: drooping grey-brown fronds (cones of thin strips), broken
  const frondG = (() => { const g = new THREE.PlaneGeometry(0.16, 1, 1, 6); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i) + 0.5; P.setZ(i, -0.35 * y * y); P.setY(i, y * 0.8); P.setX(i, P.getX(i) * (1 - y * 0.8)); } g.computeVertexNormals(); return g; })();
  const frondM = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x6b5d4a, roughness: 0.95, side: THREE.DoubleSide }));
  const nfr = n * 7, fronds = new THREE.InstancedMesh(frondG, frondM, nfr); fronds.castShadow = true; fronds.receiveShadow = true; fronds.userData.noQA = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  let k = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(hf(i, 1)) * R, a = hf(i, 2) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, gy = G.height(x + at[0], z + at[1]), s = 0.6 + 1.2 * hf(i, 3);
    for (let j = 0; j < 7; j++) {
      const ya = j / 7 * Math.PI * 2 + hf(i * 7 + j, 4), droop = 0.9 + 0.7 * hf(i * 7 + j, 5);
      e.set(droop, ya, 0, 'YXZ'); q.setFromEuler(e); m4.compose(v.set(x, gy, z), q, sc.set(s, s * (0.5 + 0.6 * hf(i * 7 + j, 6)), s)); fronds.setMatrixAt(k, m4);
      const f = frost * hf(i * 7 + j, 8); fronds.setColorAt(k, col.setRGB(lerp(0.42, 0.8, f), lerp(0.36, 0.8, f), lerp(0.29, 0.82, f))); k++;
    }
  }
  root.add(fronds);
  if (trees) {
    const tg = new THREE.CylinderGeometry(0.1, 0.22, 1, 6).translate(0, 0.5, 0), tm = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x3e3a36, roughness: 0.95 }));
    const bg = new THREE.CylinderGeometry(0.03, 0.07, 1, 4).translate(0, 0.5, 0);
    const trunks = new THREE.InstancedMesh(tg, tm, trees), br = new THREE.InstancedMesh(bg, tm, trees * 6); trunks.castShadow = br.castShadow = true;
    for (let i = 0; i < trees; i++) {
      const r = R * (0.3 + 0.8 * Math.sqrt(hf(i, 11))), a = hf(i, 12) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, gy = G.height(x + at[0], z + at[1]);
      const h = 6 + 10 * hf(i, 13) * (hf(i, 14) < 0.3 ? 0.5 : 1), lean = (hf(i, 15) - 0.5) * 0.15;
      e.set(lean, hf(i, 16) * 6.28, lean * 0.5, 'YXZ'); q.setFromEuler(e); m4.compose(v.set(x, gy - 0.2, z), q, sc.set(h * 0.06, h, h * 0.06)); trunks.setMatrixAt(i, m4);
      for (let j = 0; j < 6; j++) { const y = h * (0.45 + 0.08 * j); e.set(0.9 + 0.3 * hf(i * 6 + j, 17), j * 2.3 + hf(i, 18), 0, 'YXZ'); q.setFromEuler(e); m4.compose(v.set(x, gy + y, z), q, sc.set(h * 0.05, h * (0.18 - j * 0.02), h * 0.05)); br.setMatrixAt(i * 6 + j, m4); }
    }
    trunks.userData.noQA = br.userData.noQA = true; root.add(trunks, br);
  }
  return { root, radius: R, height: 16, snapped: true, update() {}, anchors: {}, contact: false, footprint: [R * 2, R * 2] };
}

export const CATALOG = {
  'fx.ejecta_sky': {
    desc: 'from the ground, hours after a giant impact (Chicxulub): the whole sky glows red-orange like an oven as ejecta re-enters everywhere at once, countless short meteor streaks, the land lit hot red from above. Ramp it in (t0 + rise); pair with fx.firestorm, dinosaurs in action alarm, weather embers',
    actions: ['glow'],
    params: { intensity: '0..1.5', t0: 's', rise: 's', ramp: '[t0, t1]', az: 'deg the brightest side', streaks: 'int (260)', light: 'x red light on the land (2.2)' },
    footprint: [10, 10], height: 10, snap: false, fly: true, tags: ['fx', 'sky', 'ejecta', 'chicxulub', 'dinosaur', 'red sky', 'heat pulse', 'global', 'extinction'],
  },
  'fx.firestorm': {
    desc: 'a firestorm: spot fires catching across the land at staggered times (t0 + spread), growing into walls of flame with dark smoke columns leaning downwind and embers, the land lit orange (the global firestorm after Chicxulub; forest fires). radius m, fires count',
    actions: ['burn'],
    params: { radius: 'm (600)', fires: 'int (60)', t0: 's first fire', spread: 's over which they catch (6)', light: 'x' },
    footprint: [1200, 1200], height: 40, tags: ['fx', 'fire', 'firestorm', 'wildfire', 'chicxulub', 'dinosaur', 'extinction', 'smoke'],
  },
  'fx.ejecta_rain': {
    desc: 'rock falling out of the sky after an impact (a minute and a half at 40 km): density 0.2 = a light rain of gravel (Apophis) .. 3 = metres of rubble (1 km impact); glowing streaks, stones striking the ground with dust bursts, then lying there. radius m around `at`',
    actions: ['fall'],
    params: { t0: 's first stones land', span: 's (6)', density: '0.2..3', size: 'm stone size (0.12)', radius: 'm (80)', from: 'deg they come from (the impact side)', slant: 'deg from vertical (25)', speed: 'm/s (45)', glow: '0..1' },
    footprint: [160, 160], height: 120, tags: ['fx', 'ejecta', 'rock', 'gravel', 'rain', 'debris', 'impact', 'apophis'],
  },
  'flora.dead': {
    desc: 'dead vegetation of an impact winter / after a firestorm: drooping grey-brown dead fern and cycad clumps and bare broken trees, with frost (frost 0..1). Pair with look overcast|storm + grade cold, weather snow + ash (+ ash_cover) for the dark snowy winter over the dinosaurs',
    actions: ['idle'],
    params: { radius: 'm (60)', count: 'clumps (220)', trees: 'int (30)', frost: '0..1' },
    footprint: [120, 120], height: 16, tags: ['flora', 'dead', 'winter', 'impact winter', 'extinction', 'burnt', 'ferns'],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'fx.firestorm') return buildFirestorm(item, ctx);
  if (kind === 'fx.ejecta_rain') return buildEjectaRain(item, ctx);
  if (kind === 'flora.dead') return buildDead(item, ctx);
  return buildEjectaSky(item, ctx);
}
