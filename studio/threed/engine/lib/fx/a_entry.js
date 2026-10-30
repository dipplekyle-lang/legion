// a_entry.js — E2 (asteroid kit, 29 Sep 2026): a rock meeting the air, by size.
//   fx.meteor    shooting stars at night: a single streak or a shower from a radiant (sand-grain meteoroids burning up
//                at ~100 km: thin fast streaks, a green-white head, a short fading train)
//   fx.fireball  a metre-to-100-m rock entering: the white-hot head in its plasma sheath, flares and fragmentation, the
//                burst (airburst altitude), the smoke trail left in the sky (lit by a low sun at dawn: Chelyabinsk), the
//                flash that throws moving shadows on the ground, and a sonic-boom sound cue (res.cues) at the time the
//                boom reaches the stage (distance / 343 m/s).
// Coordinates: `at` [x, z] is the ground point under the burst; `alt` the burst height (m); the rock comes FROM compass
// `from` at `angle` above the horizon. Everything is a pure function of t.
import * as THREE from 'three';
import { makePuffs, makeSparks, syncEnv, hf, clamp, lerp, sstep } from './f_common.js';
import { makeAsteroid, explicitParams, PRESETS } from './a_asteroid.js';

const DEG = Math.PI / 180;
const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const dirAzEl = (az, el) => new THREE.Vector3(Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), -Math.cos(az * DEG) * Math.cos(el * DEG));

// camera-facing additive glow (size in metres, or a minimum apparent size in px via uMinPx)
export function glowSprite(col, order = 22) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(...col) }, uI: { value: 0 }, uS: { value: 1 }, uMinPx: { value: 0 }, uRes: { value: 1080 } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vQ; uniform float uS; uniform float uMinPx; uniform float uRes;
void main(){ vQ = position.xy * 2.0; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float s = uS; float pxS = uMinPx * (-mv.z) / (projectionMatrix[1][1] * uRes * 0.5); s = max(s, pxS);
  mv.xy += position.xy * s; gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
varying vec2 vQ; uniform vec3 uCol; uniform float uI; void main(){
  #include <logdepthbuf_fragment>
  float r = length(vQ); float g = exp(-r * r * 14.0) * 4.0 + exp(-r * 4.5) * 0.7 + exp(-r * 1.6) * 0.1;
  gl_FragColor = vec4(uCol * g * uI * (1.0 - smoothstep(0.85, 1.0, r)), 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.frustumCulled = false; m.userData.noQA = true; m.renderOrder = order;
  return m;
}

// ── streak ribbons (shared by the meteor shower and the fragments' incandescent heads) ─────────────────────────────
// per streak: tail T and head H (world), width w (m), intensity, colour; drawn as a camera-facing ribbon, bright at the head
export function makeStreaks(n, order = 24) {
  const pos = new Float32Array(n * 4 * 3), aU = new Float32Array(n * 4 * 2), aC = new Float32Array(n * 4 * 4);
  const idx = []; for (let i = 0; i < n; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aU', new THREE.BufferAttribute(aU, 2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aC', new THREE.BufferAttribute(aC, 4).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const mat = new THREE.ShaderMaterial({
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 aU; attribute vec4 aC; varying vec2 vU; varying vec4 vC;
void main(){ vU = aU; vC = aC; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
varying vec2 vU; varying vec4 vC;
void main(){
  #include <logdepthbuf_fragment>
  float along = vU.x, side = vU.y;
  float core = exp(-side * side * 3.5), halo = exp(-abs(side) * 1.8) * 0.35;
  float head = pow(along, 5.0) * 2.2 + pow(along, 1.6) * 0.8;       // bright at the head, fading along the train
  vec3 hot = mix(vC.rgb, vec3(1.0, 0.98, 0.94), pow(along, 8.0) * core);
  gl_FragColor = vec4(hot * (core + halo) * head * vC.a, 1.0);
}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.userData.noQA = true; mesh.renderOrder = order;
  const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _s = new THREE.Vector3(), cam = new THREE.Vector3();
  let k = 0, pxK = 0.001;
  return {
    mesh,
    // pxK: metres per pixel per metre of distance (a streak is never thinner than ~2.4 px: no sub-pixel dashes without MSAA)
    begin(camera, Hpx = 1080, origin = null) { k = 0; if (camera) { camera.getWorldPosition(cam); if (origin) cam.sub(origin); pxK = 2 * Math.tan((camera.fov || 40) * Math.PI / 360) / Hpx; } },
    // T, H: THREE.Vector3 world; w: width (m); I: intensity; col: [r, g, b]
    push(T, H, w, I, col) {
      if (k >= n || !(I > 1e-4)) return;
      _d.copy(H).sub(T); if (_d.lengthSq() < 1e-8) _d.set(0, 1e-3, 0);
      _v.copy(H).sub(cam); w = Math.max(w, _v.length() * pxK * 2.4); _s.crossVectors(_d, _v).normalize().multiplyScalar(w);
      const b = k * 4;
      const set = (j, P, sg, u) => { pos[(b + j) * 3] = P.x + _s.x * sg; pos[(b + j) * 3 + 1] = P.y + _s.y * sg; pos[(b + j) * 3 + 2] = P.z + _s.z * sg; aU[(b + j) * 2] = u; aU[(b + j) * 2 + 1] = sg; aC[(b + j) * 4] = col[0]; aC[(b + j) * 4 + 1] = col[1]; aC[(b + j) * 4 + 2] = col[2]; aC[(b + j) * 4 + 3] = I; };
      set(0, T, -1, 0); set(1, T, 1, 0); set(2, H, -1, 1); set(3, H, 1, 1);
      k++;
    },
    end() {
      for (let j = k * 4; j < n * 4; j++) aC[j * 4 + 3] = 0;
      g.attributes.position.needsUpdate = g.attributes.aU.needsUpdate = g.attributes.aC.needsUpdate = true;
    },
  };
}

// ── fx.meteor ───────────────────────────────────────────────────────────────────────────────────────────────────
async function buildMeteor(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.meteor']);
  const root = new THREE.Group(); root.name = 'fx.meteor';
  const count = clamp(Math.round(num(p.count, 1)), 1, 400), dur = ctx.dur || 8;
  const rad = p.radiant || {}, rAz = num(rad.az ?? p.radiant_az, 60), rEl = num(rad.el ?? p.radiant_el, 45);
  const radiant = dirAzEl(rAz, rEl);
  const t0 = num(p.t0, count === 1 ? 1.2 : 0.2), span = num(p.span, Math.max(0.5, dur - t0 - 0.8));
  const bright = num(p.brightness, 1), colName = String(p.color || 'green');
  const COLS = { green: [0.55, 1.0, 0.7], white: [0.95, 0.97, 1.0], orange: [1.0, 0.7, 0.35], blue: [0.7, 0.85, 1.0] };
  const base = COLS[colName] || COLS.green;
  const Rsky = 9000;                                                  // drawn on a sphere round the camera (the streaks are ~100 km up)
  const S = makeStreaks(count + 4, 25); root.add(S.mesh);
  const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), T = new THREE.Vector3(), H = new THREE.Vector3();
  const M = [];
  for (let i = 0; i < count; i++) {
    // start 5..40 deg from the radiant, moving straight away from it; single meteors cross the given part of the sky
    let st;
    if (count === 1 && p.path) { st = { a: dirAzEl(+p.path[0][0], +p.path[0][1]), b: dirAzEl(+p.path[1][0], +p.path[1][1]) }; }
    else {
      const off = (8 + 40 * hf(i, 3)) * DEG, rot = hf(i, 4) * Math.PI * 2;
      const e1 = new THREE.Vector3().crossVectors(radiant, up).normalize(), e2 = new THREE.Vector3().crossVectors(e1, radiant).normalize();
      const dirOff = e1.clone().multiplyScalar(Math.cos(rot)).addScaledVector(e2, Math.sin(rot));
      const s0 = radiant.clone().multiplyScalar(Math.cos(off)).addScaledVector(dirOff, Math.sin(off)).normalize();
      const len = (6 + 22 * hf(i, 5)) * DEG;
      const s1 = radiant.clone().multiplyScalar(Math.cos(off + len)).addScaledVector(dirOff, Math.sin(off + len)).normalize();
      st = { a: s0, b: s1 };
    }
    if (st.a.y < 0.05 && st.b.y < 0.05) continue;
    const tS = count === 1 ? t0 : t0 + span * hf(i, 6), d = 0.35 + 0.9 * hf(i, 7);
    const mag = count === 1 ? 1.4 : Math.pow(hf(i, 8), 3) * 1.4 + 0.25;
    M.push({ ...st, tS, d, mag, col: base.map((c, k) => lerp(c, [1, 0.95, 0.85][k], hf(i, 9) * 0.5)) });
  }
  const cam = new THREE.Vector3();
  function update(t, clock, camera) {
    if (camera) camera.getWorldPosition(cam);
    root.position.set(0, 0, 0);
    S.begin(camera, (ctx.renderer && ctx.renderer.domElement.height) || 1080);
    for (const m of M) {
      const u = (t - m.tS) / m.d; if (u < 0 || u > 1.8) continue;
      const uh = clamp(u), ut = clamp(u - 0.28);                        // head and the end of the fading train
      const env = u < 1 ? Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 0.6 * (1 + 0.8 * Math.exp(-(((u - 0.72) / 0.06) ** 2))) : Math.max(0, 1 - (u - 1) / 0.8) * 0.25;   // a flare near the end, a fading persistent train
      a.copy(m.a).lerp(m.b, uh).normalize(); b.copy(m.a).lerp(m.b, ut).normalize();
      H.copy(cam).addScaledVector(a, Rsky); T.copy(cam).addScaledVector(b, Rsky);
      S.push(T, H, Rsky * 0.0016 * (0.8 + m.mag * 0.5), env * m.mag * bright * 1.6, m.col);
    }
    S.end();
  }
  update(0, 0, null);
  return { root, radius: 10, height: 10, snapped: true, update, anchors: {}, flashAt: () => 0, farNeed: Rsky * 1.5 };
}

// ── fx.fireball ─────────────────────────────────────────────────────────────────────────────────────────────────
async function buildFireball(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.fireball']);
  const pre = PRESETS[String(p.preset || '').toLowerCase()] || {};
  const D = num(p.diameter, pre.diameter ?? 19);
  // defaults by size: burst altitude (Chelyabinsk 19 m -> 29.7 km; Tunguska 55 m -> ~8 km; TC3 4 m -> 37 km)
  const altDef = D < 8 ? 37000 : D < 30 ? 29700 : D < 80 ? 8500 : 3000;
  const alt = num(p.alt, altDef), tB = num(p.t_burst, 4), speed = num(p.speed, 19000);
  const angle = num(p.angle, 18), from = num(p.from, 100);
  const at = item.at || [0, 0];
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  const root = new THREE.Group(); root.name = 'fx.fireball'; root.position.set(at[0], gy, at[1]);
  const back = dirAzEl(from, angle);                                 // from the burst back up the path
  const B = new THREE.Vector3(0, alt, 0);
  const vis = num(p.visible, 95000);                                 // the head starts glowing at ~95 km altitude
  const Lpath = Math.max(1000, (vis - alt) / Math.max(0.05, Math.sin(angle * DEG)));
  const tStart = tB - Lpath / speed;
  const headAt = (t, out) => out.copy(B).addScaledVector(back, Math.max(0, (tB - t) * speed));
  // the scale of the event: brightness and trail width grow with the rock
  const k = clamp(Math.log10(Math.max(D, 0.5)) / Math.log10(60));      // 0 (0.5 m) .. 1 (60 m)
  const trailW = num(p.trail_width, lerp(150, 2000, k));              // trail thickness near the burst (m): 'thick as a cloud'
  const trailLife = num(p.trail_life, 600);                           // s the smoke trail stays (it spreads and drifts)
  const nFrag = clamp(Math.round(num(p.fragments, D < 3 ? 3 : 7)), 0, 16);
  const trailOn = p.trail !== false;
  // the head: a plasma glow with a minimum apparent size (it must read from 50 km), the white-hot core, the rock itself
  const head = glowSprite([1.0, 0.93, 0.82], 26), core = glowSprite([0.92, 0.95, 1.0], 27), halo = glowSprite([1.0, 0.75, 0.5], 18);
  root.add(head, core, halo);
  const rock = makeAsteroid(ctx, { diameter: D, type: p.type || pre.type || 'stony', seed: item.seed ?? 3, detail: 4 });
  root.add(rock.group);
  // the hot sheath and the incandescent part of the trail: streak ribbons (head -> ~1 s back), one per fragment after the burst
  const S = makeStreaks(nFrag + 4, 25); root.add(S.mesh);
  // the smoke trail: lit billows along the path, widening with age; hot near the head
  const NP = trailOn ? 2600 : 0;
  const puffs = makePuffs(ctx, { count: NP + 900, tint: [1.0, 1.0, 1.0], glow: [1, 0.5, 0.2], heat: [1.0, 0.62, 0.3], heatHDR: 4, near: 60, groundFade: 0.02, fog: num(p.fog, 0.12), softK: 0.5, light: num(p.trail_light, 2.6) });
  root.add(puffs.mesh);
  // light: the fireball lights the land (hard moving shadows); strongest at the burst
  const L = new THREE.DirectionalLight(new THREE.Color(1.0, 0.93, 0.84), 0);
  L.castShadow = p.shadows !== false; if (L.castShadow) { L.shadow.mapSize.set(2048, 2048); const sc = L.shadow.camera; sc.left = sc.bottom = -80; sc.right = sc.top = 80; sc.near = 1; sc.far = 4000; L.shadow.bias = -0.0004; L.shadow.normalBias = 0.03; }
  root.add(L, L.target);
  const Hf = new THREE.HemisphereLight(0xfff6ea, 0xd8d2c8, 0); root.add(Hf);   // the flash washes everything (a room facing it turns white)
  const Hp = new THREE.Vector3(), Tp = new THREE.Vector3(), tmp = new THREE.Vector3(), cam = new THREE.Vector3(), fw = new THREE.Vector3();
  // brightness curve: rises through the entry, flares, peaks at the burst (Chelyabinsk: ~30x the Sun for a moment)
  const peak = num(p.brightness, lerp(0.6, 2.2, k));
  const lum = (t) => {
    if (t < tStart) return 0;
    const u = clamp((t - tStart) / Math.max(0.1, tB - tStart));
    let I = Math.pow(u, 2.2) * 0.45;
    for (const f of [0.55, 0.78, 0.9]) I += 0.18 * Math.exp(-(((u - f) / 0.02) ** 2));   // flares as it breaks up
    if (t >= tB) I = Math.exp(-(t - tB) / 0.35) + 0.08 * Math.exp(-(t - tB) / 2.5);
    else I += 0.9 * Math.exp(-(((t - tB) / 0.25) ** 2));
    return I;
  };
  const flashAt = (t) => clamp(lum(t) * peak * 0.6 - 0.25);
  // the dispersal of the fragments after the burst (a cone round the path), each slowing and cooling
  const frag = []; for (let i = 0; i < nFrag; i++) { const a = hf(i, 51) * Math.PI * 2, s = (0.02 + 0.06 * hf(i, 52)); frag.push({ a, s, v: 0.55 + 0.35 * hf(i, 53), life: 1.2 + 2.2 * hf(i, 54), size: 0.4 + 0.6 * hf(i, 55) }); }
  const e1 = new THREE.Vector3().crossVectors(back, new THREE.Vector3(0, 1, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(e1, back).normalize();
  const fragPos = (f, t, out) => {                                     // position of fragment f at time t (> tB)
    const dt = t - tB, trav = speed * f.v * (1 - Math.exp(-dt / 1.6)) * 1.6;
    out.copy(B).addScaledVector(back, -trav).addScaledVector(e1, Math.cos(f.a) * f.s * trav).addScaledVector(e2, Math.sin(f.a) * f.s * trav);
    return out;
  };
  const boomDist = Math.hypot(at[0], alt, at[1]);                      // to the stage origin (where YOU stand, by convention)
  const cues = [{ t: +(tB).toFixed(2), sound: 'fireball_flash', note: 'silent in reality: the light arrives first' }, { t: +(tB + boomDist / 343).toFixed(2), sound: 'sonic_boom', gain: clamp(1.2 - boomDist / 120000, 0.3, 1), note: `shock wave arrives ${Math.round(boomDist / 343)} s after the flash (${(boomDist / 1000).toFixed(0)} km)` }];
  function update(t, clock, camera) {
    syncEnv(ctx);
    if (camera) camera.getWorldPosition(cam);
    const I = lum(t) * peak;
    const inFlight = t < tB && t >= tStart;
    headAt(Math.min(t, tB), Hp);
    const dCam = cam.distanceTo(tmp.copy(Hp).add(root.position));
    // head glows: a few metres of plasma; apparent size kept >= a few px so a dot at 60 km still reads
    head.position.copy(Hp); core.position.copy(Hp); halo.position.copy(Hp);
    const glowI = t < tB ? I : 0;
    head.material.uniforms.uS.value = D * 6 + 40; head.material.uniforms.uMinPx.value = 26 + 60 * Math.min(1, I); head.material.uniforms.uI.value = glowI * 1.2;
    core.material.uniforms.uS.value = D * 2 + 10; core.material.uniforms.uMinPx.value = 7 + 16 * Math.min(1, I); core.material.uniforms.uI.value = glowI * 3.0;
    halo.material.uniforms.uS.value = 3000 + D * 60; halo.material.uniforms.uMinPx.value = 140 * Math.min(1.5, I); halo.material.uniforms.uI.value = (t < tB ? I : lum(t) * peak) * 0.22;
    if (t >= tB) { head.position.copy(B); core.position.copy(B); halo.position.copy(B); const bI = lum(t) * peak; head.material.uniforms.uI.value = bI * 1.5; head.material.uniforms.uMinPx.value = 60 + 200 * Math.min(1, bI); core.material.uniforms.uI.value = bI * 3; }
    rock.group.position.copy(Hp); rock.group.visible = inFlight && dCam < D * 400; rock.update(t); rock.setHeat(1.2, tmp.copy(back).negate());
    // incandescent streaks: the sheath behind the head; after the burst the fragments' own
    S.begin(camera, (ctx.renderer && ctx.renderer.domElement.height) || 1080, root.position);
    if (inFlight) { Tp.copy(Hp).addScaledVector(back, speed * lerp(0.35, 0.9, k)); S.push(Tp, Hp, lerp(25, 260, k) + dCam * 0.0012, Math.min(3, I * 1.4 + 0.25), [1.0, 0.72, 0.42]); }
    if (t >= tB) for (const f of frag) {
      const dt = t - tB; if (dt > f.life) continue;
      fragPos(f, t, Hp); fragPos(f, Math.max(tB, t - 0.5), Tp);
      S.push(Tp, Hp, (lerp(15, 150, k) + dCam * 0.0009) * f.size, 1.6 * Math.exp(-dt / (f.life * 0.5)) * (1 - dt / f.life), [1.0, 0.6, 0.3]);
    }
    S.end();
    // smoke trail
    puffs.begin();
    if (trailOn && t >= tStart) {
      const sHead = t < tB ? (tB - t) * speed : 0;                    // distance of the head from the burst along the path
      for (let i = 0; i < NP; i++) {
        const u = (i + hf(i, 1) * 0.8) / NP;                         // 0 at the burst .. 1 at the top of the visible path
        const s = u * Lpath; if (s < sHead) continue;                 // not there yet
        const tb = tB - s / speed, age = t - tb; if (age < 0) continue;
        const h = alt + s * Math.sin(angle * DEG);
        const w0 = trailW * (0.3 + 0.7 * Math.exp(-(h - alt) / 30000)) * (0.35 + 0.65 * sstep(0.02, 0.35, 1 - u)); // thinner high up, thick near the burst
        const wA = w0 * (0.35 + 0.65 * sstep(0, 1.5, age)) * (1 + age / 45);
        // two strands twisting round each other (the Chelyabinsk trail's double helix: the wake's vortex pair), with
        // a little random spread so the edges read as torn billows
        const strand = i & 1, tw = s / (trailW * 6) + strand * Math.PI + 0.3 * Math.sin(s / (trailW * 23));
        const sep = wA * 0.42 * (0.4 + 0.6 * sstep(0, 30, age)), ra = hf(i, 2) * Math.PI * 2, jit = wA * 0.18 * hf(i, 3);
        tmp.copy(B).addScaledVector(back, s).addScaledVector(e1, Math.cos(tw) * sep + Math.cos(ra) * jit).addScaledVector(e2, Math.sin(tw) * sep + Math.sin(ra) * jit);
        tmp.x += age * 6; tmp.z += age * 2;                           // the high wind drifts it
        const hot = Math.exp(-age / 0.45) * (1 - u * 0.5);
        const fade = 1 - sstep(trailLife * 0.6, trailLife, age);
        const dC = Math.hypot(tmp.x + root.position.x - cam.x, tmp.y + root.position.y - cam.y, tmp.z + root.position.z - cam.z), pxm = dC * 2 * Math.tan(((camera && camera.fov) || 50) * Math.PI / 360) / 1080;
        const low = 1 - sstep(0.03, 0.14, u);                         // the lower end near the burst: a faint orange glow lingers
        puffs.push(tmp.x, tmp.y, tmp.z, Math.max(wA * (0.62 + 0.45 * hf(i, 4)), pxm * 9), hf(i, 5) * 6.28 + age * 0.01, 0.78 * fade * sstep(0, 0.25, age), i & 3, -1e9, 1.0, 0.6 * hot + 0.28 * low, clamp(hot * 1.2 + 0.12 * low), 0.0, clamp(0.2 + age / 150), 1.0, hf(i, 6));
      }
      // the burst cloud: a bulbous knot of smoke where it broke apart, and the fragments' own short trails
      if (t >= tB) {
        const dt = t - tB;
        for (let i = 0; i < 420; i++) {
          const r = trailW * (0.5 + 1.4 * sstep(0, 3, dt)) * Math.cbrt(hf(i, 21)), th = hf(i, 22) * Math.PI * 2, ph = Math.acos(2 * hf(i, 23) - 1);
          tmp.set(Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r * 0.8, Math.sin(ph) * Math.sin(th) * r).add(B).addScaledVector(back, -r * 0.6 * hf(i, 24));
          tmp.x += dt * 6;
          const hot = Math.exp(-dt / 0.6);
          puffs.push(tmp.x, tmp.y, tmp.z, trailW * (0.55 + 0.4 * hf(i, 25)) * (0.5 + 0.5 * sstep(0, 2, dt)), hf(i, 26) * 6.28, 0.6 * sstep(0, 0.15, dt), i & 3, -1e9, 1.0, 1.2 * hot + 0.2, clamp(hot * 1.4 + 0.06), 0, clamp(0.2 + dt / 60), 1.0, hf(i, 27));
        }
        for (const [fi, f] of frag.entries()) for (let j = 0; j < 36; j++) {
          const dt2 = t - tB, tt = tB + dt2 * (j / 36); if (tt - tB > f.life) continue;
          fragPos(f, tt, tmp); const age = t - tt;
          puffs.push(tmp.x + age * 6, tmp.y, tmp.z, trailW * 0.28 * f.size * (0.5 + sstep(0, 2, age)), hf(fi * 40 + j, 31) * 6.28, 0.5, j & 3, -1e9, 0.9, 0.5 * Math.exp(-age / 0.5), clamp(Math.exp(-age / 0.4)), 0, 0.3, 0.85, hf(fi * 40 + j, 32));
        }
      }
    }
    puffs.end(camera);
    // the light on the ground: from the head, a hard key that swings as it crosses the sky
    const LI = I * num(p.light, 9);                                    // brighter than the Sun at the burst: a room facing it turns white
    L.intensity = LI; L.visible = LI > 0.01;
    const wash = t >= tB - 0.3 ? Math.max(0, lum(t) * peak - 0.35) * num(p.wash, 5) : 0; Hf.intensity = wash; Hf.visible = wash > 0.01;
    if (camera && LI > 0.01) {
      camera.getWorldDirection(fw); fw.y = 0; if (fw.lengthSq() < 1e-6) fw.set(0, 0, -1); fw.normalize();
      L.target.position.copy(cam).addScaledVector(fw, 30).sub(root.position); L.target.position.y = cam.y - root.position.y - 2;
      tmp.copy(t < tB ? Hp : B).sub(L.target.position).normalize();
      L.position.copy(L.target.position).addScaledVector(tmp, 1500); L.target.updateMatrixWorld();
    }
  }
  update(0, 0, null);
  const burstW = () => root.localToWorld(B.clone());
  return { root, radius: 2000, height: alt, snapped: true, update, anchors: { burst: B, head: head }, flashAt, cues, farNeed: Math.min(900000, Lpath + alt + 150000),
    subjectAt: (t) => { const P = headAt(Math.min(t ?? tB, tB), new THREE.Vector3()).add(root.position); return [P.x, P.y, P.z]; }, subjectTop: 2000, subjectCy: 0 };
}

export const CATALOG = {
  'fx.meteor': {
    desc: 'shooting stars at night: one streak (count 1) or a meteor shower from a radiant (count 20..200): thin fast streaks with a green-white head, a flare near the end and a short fading train. Needs look.time night (the sky must be dark)',
    actions: ['streak'],
    params: { count: 'int (1 = a single shooting star)', radiant: '{az, el} of the shower radiant', t0: 's: first streak', span: 's over which a shower spreads', brightness: 'x', color: 'green|white|orange|blue', path: 'single: [[az, el], [az, el]] start/end in the sky' },
    doc: { count: '1 = one shooting star at t0; a shower spreads `count` streaks over `span`', radiant: '{az, el}: the streaks fly away from it (Perseids: az 45, el 40 at night)', t0: 's', span: 's', brightness: 'x (1)', color: 'green|white|orange|blue', path: 'one streak across the sky: [[az0, el0], [az1, el1]] deg' },
    footprint: [10, 10], height: 10, snap: false, fly: true, tags: ['fx', 'meteor', 'shooting star', 'meteor shower', 'perseids', 'night', 'sky', 'asteroid'],
  },
  'fx.fireball': {
    desc: 'a rock entering the air (1..100 m): the white-hot head in its plasma sheath crossing the sky, flares, the burst brighter than the Sun, the fragments, and the long smoke trail left in the sky (dawn light makes it pink-orange: Chelyabinsk); the flash throws moving shadows on the ground; res.cues gives the sonic boom time at the stage (distance / 343 m/s). `at` = the ground point under the burst (put it 20..60 km away from the camera for a sky-crossing trail)',
    actions: ['enter', 'burst'],
    params: { diameter: 'm (or preset)', preset: 'tc3|chelyabinsk|tunguska', alt: 'burst altitude m', t_burst: 's', from: 'compass deg it comes from', angle: 'deg above the horizon', speed: 'm/s', fragments: 'int', trail: 'bool', trail_width: 'm', brightness: 'x', light: 'x', shadows: 'bool', fog: '0..1' },
    doc: {
      diameter: 'm: 4 (2008 TC3), 19 (Chelyabinsk), 55 (Tunguska); sets brightness, trail width, fragments', preset: 'tc3|chelyabinsk|tunguska',
      alt: 'burst altitude m (defaults: 37 km for < 8 m, 29.7 km for < 30 m, 8.5 km for < 80 m)', t_burst: 's in the shot (negative = it burst before the shot: only the trail hangs in the sky)',
      from: 'compass deg the rock comes from (Chelyabinsk ~100)', angle: 'entry angle above the horizon deg (Chelyabinsk 18)', speed: 'm/s (19,000)',
      fragments: 'pieces after the burst (7)', wash: 'x the white fill at the burst (5: a room facing it washes white; 0 = off)', trail: 'false = no smoke trail (two white strands twisting round each other; the lower end glows faintly orange)', trail_width: 'm near the burst', trail_life: 's', brightness: 'x peak glow', light: 'x the light it throws (9: at the burst it outshines the Sun several times)', shadows: 'false = no moving shadows', fog: 'fog on the trail 0..1 (0.35)',
      cues: 'res.cues = [{t, sound: fireball_flash}, {t, sound: sonic_boom, gain}] (the boom arrives distance/343 s after the flash)',
    },
    footprint: [4000, 4000], height: 30000, snap: false, fly: true, tags: ['fx', 'fireball', 'bolide', 'meteor', 'chelyabinsk', 'entry', 'airburst', 'trail', 'asteroid', 'sonic boom'],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'fx.meteor') return buildMeteor(item, ctx);
  return buildFireball(item, ctx);
}
