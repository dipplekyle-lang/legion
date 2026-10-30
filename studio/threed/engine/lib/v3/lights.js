// lights.js — Legion 3D v3, WP3: fern's motivated light (V3_SPEC 2.3).
//   light.spot       one spotlight with a projected cookie (slit, blinds, window, bars, foliage, gate), an optional
//                    raymarched beam with drifting smoke and dust motes (core/film.js volumetric pass), keep_hue (its
//                    colour survives a mono grade), real spot shadows, eased fades / sweeps / flicker; follows its target
//   light.rig        key / rim / fill spots riding a cast member (aimed at the head), coloured (red / blue / amber ...)
//   light.practical  a visible practical: a bare bulb, a desk lamp, the jump light (red -> green at t_switch), flicker
// Every light is noGovern (the face governor never dims a designed key) and EXPOSURE-COMPENSATED: intensity is in
// candela at exposure 1 and divided by the scene's exposure (look.js -> film.js FILM_STATE), so a red slit looks the
// same in a night scene (exposure 2.7) and a day scene (0.8). Everything is a pure function of t.
import * as THREE from 'three';
import { cookie, COOKIE_NAMES } from '../shared/cookies.js';
import { FILM_STATE, registerVolume, registerKeep, KEY_COLOURS } from '../../core/film.js';
import { clamp, smoother } from '../shared/util.js';

const D2R = Math.PI / 180;
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const colOf = (c, d) => { if (c == null) return new THREE.Color(d); if (typeof c === 'string' && KEY_COLOURS[c.toLowerCase()] != null) return new THREE.Color(KEY_COLOURS[c.toLowerCase()]); try { return new THREE.Color(c); } catch (e) { return new THREE.Color(d); } };
const fhash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _f = new THREE.Vector3(), _u = new THREE.Vector3();

// ── targets: a cast member's head / chest / feet, an item's body, a point ─────────────────────────────────────────
function itemOf(ctx, ref) {
  const B = ctx.S?.byRef || {};
  if (typeof ref !== 'string') return null;
  return B[ref] || B['ref:' + ref] || B['ref:' + ref.replace(/^ref:/, '')] || null;
}
const figOf = (it) => (it && it.res && (it.res.figure || it.res.fig)) || null;
// a function t -> world point (call after the items updated at t), + the subject's facing (unit xz) for rigs
function targetFn(ctx, target, aim) {
  if (Array.isArray(target) && target.length >= 2) {
    const p = target.length >= 3 ? new THREE.Vector3(+target[0], +target[1], +target[2]) : new THREE.Vector3(+target[0], ctx.ground.height(+target[0], +target[1]) + num(aim, 1.5), +target[1]);
    return { at: () => p, facing: () => _f.set(0, 0, 1), item: null };
  }
  const it = itemOf(ctx, target);
  if (!it) return null;
  const fig = figOf(it);
  const B = fig && fig.rig && fig.rig.B;
  const bone = B ? ({ head: B.head, chest: B.chest, waist: B.pelvis, hips: B.pelvis, feet: null }[aim ?? 'head'] ?? B.head) : null;
  const body = (it.res.anchors && it.res.anchors.body && it.res.anchors.body.isObject3D) ? it.res.anchors.body : it.res.root;
  const out = new THREE.Vector3();
  return {
    item: it,
    at: () => {
      if (bone) { bone.getWorldPosition(out); if (bone === B.head) out.y += 0.06; return out; }
      body.getWorldPosition(out);
      if (aim === 'feet') return out;
      out.y += typeof aim === 'number' ? aim : (fig ? 1.0 : (it.res.height || it.entry?.height || 1.6) * 0.55);
      return out;
    },
    facing: () => { const g = fig ? fig.group : it.res.root; g.updateMatrixWorld(); _f.set(0, 0, 1).transformDirection(g.matrixWorld); _f.y = 0; if (_f.lengthSq() < 1e-6) _f.set(0, 0, 1); return _f.normalize(); },
  };
}

// ── spot shadows under the logarithmic depth buffer ──────────────────────────────────────────────────────────────
// three r186 writes gl_FragDepth = log depth in the shadow pass, but compares the spot's PERSPECTIVE depth: spot shadows
// break (hq.js). A shadow depth material without the log-depth write fixes it. For the orthographic key light the log
// chunk writes gl_FragCoord.z anyway, so its shadows are unchanged. Applied only in a scene with a shadowed v3 spot.
let DEPTH = null; const DEPTH_AT = new Map();
function noLog(m, key) { m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <logdepthbuf_fragment>', ''); }; m.customProgramCacheKey = () => key; return m; }
function depthFor(src) {
  if (src && src.alphaTest > 0 && (src.map || src.alphaMap)) {
    if (!DEPTH_AT.has(src.uuid)) DEPTH_AT.set(src.uuid, noLog(new THREE.MeshDepthMaterial({ map: src.map, alphaMap: src.alphaMap, alphaTest: src.alphaTest, side: src.side }), 'v3-nolog-depth-at'));
    return DEPTH_AT.get(src.uuid);
  }
  return DEPTH || (DEPTH = noLog(new THREE.MeshDepthMaterial(), 'v3-nolog-depth'));
}
function patchShadowDepth(stage) {
  if (stage.userData.v3depth) return;
  stage.userData.v3depth = true;
  stage.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) || !o.castShadow || o.customDepthMaterial) return;
    o.customDepthMaterial = depthFor(Array.isArray(o.material) ? o.material[0] : o.material);
  });
}

// ── dust motes: points in the cone, lit by the spot's cone x cookie x distance, drifting slowly ─────────────────────
const MOTE_VS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
uniform mat4 uMat; uniform sampler2D tCk; uniform float uCk; uniform vec3 uLPos; uniform vec3 uLDir; uniform vec2 uCone; uniform float uRange;
uniform vec3 uCol; uniform float uTime; uniform float uPx; uniform float uK;
attribute vec4 seed;
varying vec3 vC;
void main(){
  vec3 p = position;
  float ph = seed.x * 6.2831;
  p += vec3(sin(uTime * (0.21 + 0.17 * seed.y) + ph), sin(uTime * (0.16 + 0.13 * seed.z) + ph * 1.7) + 0.0, sin(uTime * (0.19 + 0.11 * seed.w) + ph * 2.3)) * (0.04 + 0.08 * seed.y);
  p.y += mod(uTime * (0.01 + 0.025 * seed.z) + seed.w * 0.3, 0.3) - 0.15;               // a slow convection lift
  vec4 w = modelMatrix * vec4(p, 1.0);
  vec3 lp = w.xyz - uLPos; float d2 = max(dot(lp, lp), 1e-3), d = sqrt(d2);
  float cone = smoothstep(uCone.x, uCone.y, dot(lp / d, uLDir));
  float rf = uRange > 0.0 ? pow(clamp(1.0 - pow(d / uRange, 4.0), 0.0, 1.0), 2.0) : 1.0;
  vec4 sc = uMat * w; sc.xyz /= sc.w;
  float ck = uCk > 0.5 ? ((sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0) ? textureLod(tCk, sc.xy, 0.0).r : 0.0) : 1.0;
  float tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.5 + 2.5 * seed.z) + ph * 3.0), 3.0);   // flakes glint as they turn
  vC = uCol * (cone * rf * ck * tw * uK / d2);
  vec4 mv = viewMatrix * w;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPx * (0.6 + 0.8 * seed.x) / max(-mv.z, 0.1), 1.0, 4.0);
  #include <logdepthbuf_vertex>
}`;
const MOTE_FS = /* glsl */`
#include <logdepthbuf_pars_fragment>
varying vec3 vC;
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord - 0.5; float a = 1.0 - smoothstep(0.15, 0.5, length(q));
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vC * a, 1.0);
}`;
function makeMotes(L, n, len, ctx, seed) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), SD = new Float32Array(n * 4);
  const ta = Math.tan(L.angle);
  for (let i = 0; i < n; i++) {
    const z = len * (0.12 + 0.86 * Math.cbrt(fhash(i * 3.1 + seed)));      // more volume far from the apex
    const r = z * ta * Math.sqrt(fhash(i * 7.7 + seed + 1)), a = fhash(i * 1.3 + seed + 2) * Math.PI * 2;
    P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = Math.sin(a) * r; P[i * 3 + 2] = z;     // light space: +Z along the beam
    for (let k = 0; k < 4; k++) SD[i * 4 + k] = fhash(i * 11.3 + k * 5.1 + seed);
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('seed', new THREE.BufferAttribute(SD, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, len / 2), len);
  const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); blank.needsUpdate = true;
  const m = new THREE.ShaderMaterial({
    uniforms: { uMat: { value: new THREE.Matrix4() }, tCk: { value: L.map || blank }, uCk: { value: L.map ? 1 : 0 }, uLPos: { value: new THREE.Vector3() }, uLDir: { value: new THREE.Vector3() },
      uCone: { value: new THREE.Vector2() }, uRange: { value: 0 }, uCol: { value: new THREE.Color() }, uTime: { value: 0 }, uPx: { value: 1 }, uK: { value: 0 } },
    vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m); pts.name = 'light_motes'; pts.frustumCulled = false; pts.userData.noQA = true; pts.renderOrder = 13;
  return pts;
}

// ── one spot (light.spot, and each light of a rig) ───────────────────────────────────────────────────────────────
// o: {color, intensity, angle, penumbra, range, cookie, cookie_rot, cookie_opts, sway, beam, haze, dust, keep_hue, shadow,
//     fade: [t0, dur] | t_on, t_off, keys [{t, i}], flicker, sweep {deg, t: [t0, t1]} | {from, to, t}, shadow_map}
function makeSpot(o, root, ctx, name, seed) {
  const col = colOf(o.color, 0xFFF1D8);
  const I = num(o.intensity, 40), ang = clamp(num(o.angle, 14), 1, 80) * D2R, pen = clamp(num(o.penumbra, o.cookie && o.cookie !== 'none' ? 0.15 : 0.35), 0, 1);
  const L = new THREE.SpotLight(col, 0, num(o.range, 0), ang, pen, 2);
  L.name = name; L.userData.noGovern = o.noGovern !== false; L.userData.v3 = true;
  const ck = o.cookie && o.cookie !== 'none' ? cookie(o.cookie, o.cookie_opts || {}) : null;
  if (o.cookie && o.cookie !== 'none' && !ck) ctx.warn(`${name}: cookie '${o.cookie}' unknown (${COOKIE_NAMES.join('|')}); plain spot`);
  if (ck) L.map = ck;
  const shadow = o.shadow ?? true;
  if (shadow) {
    L.castShadow = true; const ms = num(o.shadow_map, ctx.quality === 'draft' ? 1024 : 2048);
    L.shadow.mapSize.set(ms, ms); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.015; L.shadow.radius = num(o.shadow_soft, 2.5); L.shadow.camera.near = 0.1;
  }
  root.add(L, L.target);
  // spill: the slit / blinds light's own soft bounce — a wide, feathered, uncookied spot of the same colour at a fraction
  // of the intensity, so the figure around the slit reads as a dark coloured form (fern T07: the uniform is dark maroon,
  // not black). No shadow, no beam; it follows the main light.
  const spill = clamp(num(o.spill, 0), 0, 1), spillDrop = clamp(num(o.spill_drop, 0.4), 0, 2);   // the spill aims lower (the chest, not the face)
  let SP = null;
  if (spill > 0) {
    const sa = o.spill_angle != null ? clamp(num(o.spill_angle, 20), 4, 70) * D2R : clamp(Math.max(ang * 3.2, 16 * D2R), 0, 70 * D2R);
    SP = new THREE.SpotLight(col, 0, num(o.range, 0), sa, 0.85, 2);
    SP.name = name + '_spill'; SP.userData.noGovern = true; SP.userData.v3 = true;
    root.add(SP, SP.target);
  }
  const beam = clamp(num(o.beam, 0), 0, 2);
  let motes = null;
  if (beam > 0) {
    registerVolume({ kind: 'beam', obj: L, light: L, beam, haze: clamp(num(o.haze, 0.55), 0, 2), g: num(o.phase, 0.35) });
    const dust = clamp(num(o.dust, 0.6), 0, 1);
    if (dust > 0) { motes = makeMotes(L, Math.round((ctx.quality === 'draft' ? 900 : 1800) * dust), num(o.dust_len, 6), ctx, seed); motes.userData.k = dust; root.add(motes); }
  }
  if (o.keep_hue) registerKeep(L);
  // the intensity envelope: fade in / out, keyframes, flicker (all smooth; flicker is the practical's own)
  const fade = Array.isArray(o.fade) ? o.fade : (o.t_on != null ? [+o.t_on, num(o.fade_dur, 0.8)] : null);
  const off = o.t_off != null ? [+o.t_off, num(o.fade_dur, 0.8)] : null;
  const keys = Array.isArray(o.keys) ? o.keys.filter((k) => k && Number.isFinite(+k.t)).sort((a, b) => a.t - b.t) : null;
  const fl = clamp(num(o.flicker, 0), 0, 1), ph = fhash(seed + 9) * 40;
  const env = (t) => {
    let k = 1;
    if (fade) k *= smoother((t - fade[0]) / Math.max(0.05, fade[1]));
    if (off) k *= 1 - smoother((t - off[0]) / Math.max(0.05, off[1]));
    if (keys && keys.length) {
      let v = num(keys[0].i, 1);
      for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t) v = num(keys[i].i, 1) + (num(keys[i + 1].i, 1) - num(keys[i].i, 1)) * smoother((t - keys[i].t) / Math.max(0.05, keys[i + 1].t - keys[i].t));
      k *= v;
    }
    if (fl > 0) k *= 1 - fl * (0.1 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 7.3 + ph)) + 0.08 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.9 + ph * 2)) + 0.07 * fhash(Math.floor(t * 9 + ph)));
    return Math.max(0, k);
  };
  // sweep: the light pans across its target. Expressed AT THE TARGET in metres (m: the whole slide, default 0.12 =
  // across a face; from_m / to_m: offsets, + = toward the lamp's right), so 'the slit slides over the face' holds at any
  // lamp distance. Legacy degrees ({deg} or {from, to} at the lamp) are converted at the target and, for a slit cookie,
  // clamped so the offset stays <= 0.09 m (0.6 x a face width): a wider slide only paints the collar and the void.
  const sw = o.sweep && typeof o.sweep === 'object' ? o.sweep : (o.sweep === true ? {} : null);
  const swDeg = sw && (sw.deg != null || sw.from != null || sw.to != null) && sw.m == null && sw.from_m == null && sw.to_m == null;
  const swMax = o.cookie === 'slit' ? 0.09 : 1e9;
  let swWarned = false;
  const sway = num(o.sway, o.cookie === 'foliage' ? 1.5 : 0) * D2R, rot = num(o.cookie_rot, 0) * D2R;
  // aim + cookie orientation for this frame: pos, look point (world)
  const aimAt = (t, pos, look) => {
    L.position.copy(pos);
    _v.copy(look).sub(pos);
    let yaw = 0;
    if (sw) {
      const tt = Array.isArray(sw.t) ? sw.t : [0, ctx.dur || 6], d = Math.max(0.2, _v.length());
      let a, b;
      if (swDeg) { a = d * Math.tan(num(sw.from, -num(sw.deg, 2) / 2) * D2R); b = d * Math.tan(num(sw.to, num(sw.deg, 2) / 2) * D2R); }
      else { a = num(sw.from_m, -num(sw.m, 0.12) / 2); b = num(sw.to_m, num(sw.m, 0.12) / 2); }
      if (Math.max(Math.abs(a), Math.abs(b)) > swMax) {
        if (!swWarned) { ctx.warn(`${name}: sweep of ${(Math.max(Math.abs(a), Math.abs(b)) * 100).toFixed(0)} cm at the target would carry the slit off the face; clamped to ${(swMax * 100).toFixed(0)} cm (give sweep.m in metres)`); swWarned = true; }
        a = clamp(a, -swMax, swMax); b = clamp(b, -swMax, swMax);
      }
      yaw = Math.atan2(a + (b - a) * smoother((t - tt[0]) / Math.max(0.05, tt[1] - tt[0])), d);
    }
    if (yaw) _v.applyAxisAngle(_u.set(0, 1, 0), yaw);
    L.target.position.copy(pos).add(_v);
    // the cookie's up: world up projected off the beam, turned by cookie_rot (+ a leafy sway)
    const dir = _w.copy(_v).normalize();
    const up = Math.abs(dir.y) > 0.96 ? _u.set(0, 0, -1) : _u.set(0, 1, 0);
    up.addScaledVector(dir, -up.dot(dir)).normalize();
    const r = rot + (sway ? sway * (0.6 * Math.sin(t * 0.9 + seed) + 0.4 * Math.sin(t * 2.3 + seed * 2)) : 0);
    if (r) up.applyAxisAngle(dir, r);
    L.shadow.camera.up.copy(up);
    if (SP) { SP.position.copy(pos); SP.target.position.copy(L.target.position); SP.target.position.y -= spillDrop; }
    if (motes) { motes.position.copy(pos); motes.quaternion.setFromUnitVectors(_f.set(0, 0, 1), dir); }
  };
  const update = (t, camera) => {
    const ex = Math.max(0.05, FILM_STATE.exposure || 1);
    const k = env(t);
    L.intensity = I * k / ex; L.visible = k > 0.0005;
    if (SP) { SP.intensity = L.intensity * spill; SP.visible = L.visible; }
    if (camera) FILM_STATE.camera = camera;
    if (motes) {
      const u = motes.material.uniforms;
      L.updateMatrixWorld(); L.target.updateMatrixWorld(); L.shadow.updateMatrices(L);
      u.uMat.value.copy(L.shadow.matrix); u.uLPos.value.copy(L.position); u.uLDir.value.copy(L.target.position).sub(L.position).normalize();
      u.uCone.value.set(Math.cos(L.angle), Math.max(Math.cos(L.angle * (1 - L.penumbra)), Math.cos(L.angle) + 1e-4)); u.uRange.value = L.distance;
      u.uCol.value.copy(L.color); u.uTime.value = t; u.uK.value = L.intensity * 0.05 * motes.userData.k * beam;
      u.uPx.value = 0.012 * (camera ? (ctx.renderer?.domElement?.height || 1080) / (2 * Math.tan((camera.fov || 40) * D2R / 2)) : 1000);
      motes.visible = L.visible;
    }
  };
  return { L, update, aimAt };
}

// ── kinds ────────────────────────────────────────────────────────────────────────────────────────────────────────
const SPOT_PARAMS = {
  at: '[x, z] where the lamp hangs (+ y), or from [az deg around the target from its front (+ = toward its right hand), el deg, dist m]',
  y: 'm above the ground (2.4)', target: "what it lights: 'ref:<castId>' | 'objects:N' | [x, y, z] | [x, z] (follows a moving target)", aim: "head|chest|waist|feet|<m> (figures: head)",
  color: "slit (#FF4A1E, the hot red-orange slit)|red|blue|amber|moon|tungsten|neutral|green|#hex", intensity: 'candela at exposure 1 (40; the slit 60-120, a rim 20-60)', angle: 'half-angle deg (14)', penumbra: '0..1',
  cookie: 'slit|blinds|window|bars|foliage|gate|none', cookie_rot: 'deg', cookie_opts: '{w, n, duty, cols, rows, ...}; slit {w 0.042, len 0.95, band 0.22 (glow band round the hot core), band_w 1.9}',
  beam: '0..1 visible beam in the air (raymarched, smoke + dust)', haze: '0..1 the air density in the beam (0.55)', dust: '0..1 motes in the beam (0.6)',
  keep_hue: 'true: its colour survives a mono grade (the red slit in a blue world)', shadow: 'true (spot shadows)',
  spill: "0..1 a soft wide uncookied bounce of the same colour (0.25-0.3 with a slit: the uniform around it reads as a dark maroon form, fern T07)", spill_drop: 'm the spill aims below the target (0.65: the chest, so the face outside the slit stays dark)', spill_angle: 'deg (3.2 x angle, >= 16; 9-10 keeps it off the face)', range: 'm the light dies out (0 = never; set it so a slit does not reach the figures behind)',
  fade: '[t0, dur] fade in', t_off: 's fade out', keys: '[{t, i}] intensity multipliers, eased', flicker: '0..1', sweep: '{m: 0.12, t: [t0, t1]} the light slides across its target: m = the whole slide in metres AT THE TARGET (0.12 = across a face; from_m / to_m offsets); a slit is clamped to +-0.09 m',
};
export const CATALOG = {
  'light.spot': {
    desc: "ONE MOTIVATED LIGHT (fern): a spotlight with a projected cookie - a vertical SLIT of light across a face in a black void, BLINDS stripes over a figure at a desk, a WINDOW cross on a wall, prison BARS, FOLIAGE dapple, a projector GATE - with an optional visible beam in smoky air (dust motes drifting in it), real shadows, keep_hue (the red slit stays red when the shot is graded blue). It follows a moving target. Put it in `objects`. Pair with stage.void for the antagonist portrait.",
    params: SPOT_PARAMS, section: 'objects', fly: true, snap: false, contact: false, footprint: [0.3, 0.3], height: 0.1, tags: ['light', 'lamp', 'spotlight', 'gobo', 'cookie', 'slit', 'blinds', 'beam', 'volumetric', 'fern', 'noir', 'v3'],
  },
  'light.rig': {
    desc: 'A LIGHT RIG RIDING A CAST MEMBER: coloured key / rim / fill spots that move with the figure and aim at its head (fern colour code: red = the perpetrator, blue = the heroes, amber = home). Rim light from behind separates a dark figure from a black void. Put it in `objects`.',
    params: { subject: "'ref:<castId>' (alias on)", key: "colour | {color, intensity, az, el, dist, angle, cookie}", rim: "colour | {color, intensity, az (142 = behind a shoulder; mirrored for the other side), el, dist, aim: head|chest}", fill: "colour | {color, intensity}",
      rim_side: 'left|right|both (both)', fade: '[t0, dur] the whole rig fades up (assassins appearing)', beam: '0..1 on the rims' },
    section: 'objects', fly: true, snap: false, contact: false, footprint: [0.3, 0.3], height: 0.1, tags: ['light', 'rig', 'rim', 'key', 'fill', 'silhouette', 'fern', 'v3'],
  },
  'light.practical': {
    desc: 'A VISIBLE PRACTICAL LIGHT: a bare bulb on a cord, a desk lamp throwing a pool on the desk, or the paratroopers\' JUMP LIGHT that switches red -> green at t_switch; optional flicker (a failing bulb, a candle). Put it in `objects`.',
    params: { practical: 'bulb|lamp|jump', at: '[x, z]', y: 'm (bulb 2.2, lamp 0.95, jump 1.9)', color: 'colour (bulb tungsten, jump red)', color2: 'jump: the second colour (green)',
      t_switch: 's (jump: red goes out, 0.12 s later green comes on)', intensity: 'candela at exposure 1 (bulb 6, lamp 10, jump 4)', flicker: '0..1', range: 'm', heading: 'deg (lamp / jump face)', shadow: 'true|false' },
    section: 'objects', fly: true, snap: false, contact: false, footprint: [0.3, 0.3], height: 0.3, tags: ['light', 'practical', 'bulb', 'lamp', 'jump light', 'red light', 'green light', 'v3'],
  },
};

function posOf(item, ctx, T, dflt) {
  // NOT item.pos: the registry stamps every object with pos = [x, ground, z] (a light hung at `y` would land on the floor)
  if (Array.isArray(item.from) && T) return null;                                  // relative to the target: per frame
  const at = Array.isArray(item.at) ? item.at : [0, 0];
  return new THREE.Vector3(+at[0], ctx.ground.height(+at[0], +at[at.length === 3 ? 2 : 1]) + num(item.y, dflt), +at[at.length === 3 ? 2 : 1]);
}
// a point around the target: az from its facing (+ toward its right hand = clockwise seen from above), el up, dist
function around(T, az, el, dist, out) {
  const p = T.at(), f = T.facing();
  const a = az * D2R, e = el * D2R;
  const ca = Math.cos(a), sa = Math.sin(a);
  // facing f; the subject's right hand (seen from above, compass clockwise) = (-f.z, f.x)
  const dx = f.x * ca - f.z * sa, dz = f.z * ca + f.x * sa;
  return out.set(p.x + dx * Math.cos(e) * dist, p.y + Math.sin(e) * dist, p.z + dz * Math.cos(e) * dist);
}

export async function build(kind, item = {}, ctx = {}) {
  const root = new THREE.Group(); root.name = kind;
  const seed = num(item.seed, 7) + num(item.index, 0) * 13.7;
  const parts = [];
  if (kind === 'light.spot') {
    const T = item.target != null ? targetFn(ctx, item.target, item.aim) : null;
    if (item.target != null && !T) ctx.warn(`light.spot: target ${JSON.stringify(item.target)} not found; aiming at the stage`);
    const S = makeSpot(item, root, ctx, 'v3_spot', seed);
    const fixed = posOf(item, ctx, T, 2.4), look = new THREE.Vector3(), pos = new THREE.Vector3();
    const fr = Array.isArray(item.from) ? item.from.map(Number) : null;
    parts.push({ S, frame: (t) => {
      if (T) look.copy(T.at()); else if (Array.isArray(item.look) && item.look.length >= 3) look.set(+item.look[0], +item.look[1], +item.look[2]); else look.set(0, 1.5, 0);
      if (fr && T) around(T, fr[0] || 0, fr[1] ?? 10, fr[2] ?? 3, pos); else pos.copy(fixed);
      S.aimAt(t, pos, look);
    } });
  } else if (kind === 'light.rig') {
    const who = item.subject ?? item.on ?? item.target;                          // `subject` (the engine reads `on` as 'stand aboard')
    const T = targetFn(ctx, who, 'head');
    if (!T) { ctx.warn(`light.rig: subject ${JSON.stringify(who)} is not a cast member; nothing lit`); }
    else {
      const spec = (v, d) => (v == null || v === false ? null : typeof v === 'object' ? { ...d, ...v } : { ...d, color: v });
      const common = { fade: item.fade, t_off: item.t_off, flicker: item.flicker, keys: item.keys };
      const key = spec(item.key, { color: 'neutral', intensity: 30, az: 35, el: 22, dist: 2.4, angle: 16 });
      const rim = spec(item.rim, { color: 'blue', intensity: 45, el: 32, dist: 2.0, angle: 18, beam: num(item.beam, 0) });
      const fill = spec(item.fill, { color: 'neutral', intensity: 4, az: -50, el: 5, dist: 3, angle: 30, shadow: false });
      const sides = item.rim_side === 'left' ? [1] : item.rim_side === 'right' ? [-1] : [1, -1];
      const TC = targetFn(ctx, who, 'chest') || T;                                 // aim: 'chest' = a rim that rakes the shoulders
      const add = (o, az, nm, i) => { const S = makeSpot({ ...common, ...o }, root, ctx, nm, seed + i * 3.3); const pos = new THREE.Vector3(), A = o.aim === 'chest' ? TC : T;
        parts.push({ S, frame: (t) => { around(T, az, o.el ?? 20, o.dist ?? 2.2, pos); S.aimAt(t, pos, A.at()); } }); };
      if (key) add(key, key.az ?? 35, 'v3_rig_key', 0);
      // rims: behind the subject, one per side; rim.az = the side angle from its front (142 = behind its right
      // shoulder, i.e. camera-left for a subject facing the lens); the other side mirrors it (360 - az)
      const raz = num(rim.az, 142);
      if (rim) sides.forEach((s, i) => add({ ...rim, intensity: num(rim.intensity, 45) * (sides.length > 1 ? 0.8 : 1) }, s > 0 ? raz : 360 - raz, 'v3_rig_rim', 1 + i));
      if (fill) add(fill, fill.az ?? -50, 'v3_rig_fill', 4);
    }
  } else if (kind === 'light.practical') {
    const pk = ['bulb', 'lamp', 'jump'].includes(item.kind_of || item.type || item.style || item.lamp) ? (item.kind_of || item.type || item.style || item.lamp) : (item.practical || item.variant || 'bulb');
    const P = ['bulb', 'lamp', 'jump'].includes(pk) ? pk : 'bulb';
    const y0 = { bulb: 2.2, lamp: 0.95, jump: 1.9 }[P];
    const pos = posOf({ ...item, from: null }, ctx, null, y0);
    const hd = num(item.heading, 0) * D2R;
    const c1 = colOf(item.color, P === 'jump' ? 'red' : 'tungsten'), c2 = colOf(item.color2, P === 'jump' ? 'green' : (item.color ?? 'tungsten'));
    const I = num(item.intensity, { bulb: 6, lamp: 10, jump: 4 }[P]);
    const grp = new THREE.Group(); grp.position.copy(pos); grp.rotation.y = -hd; root.add(grp);
    const emis = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c1.clone(), emissiveIntensity: 1, roughness: 0.4 });
    const dark = ctx.patch(new THREE.MeshStandardMaterial({ color: 0x15140f, roughness: 0.55, metalness: 0.5 }));
    let pl = null, sp = null;
    if (P === 'bulb') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), emis); grp.add(b);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 6), dark); cord.position.y = 0.64; grp.add(cord);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.05, 10), dark); sock.position.y = 0.05; grp.add(sock);
      pl = new THREE.PointLight(c1, 0, num(item.range, 8), 2);
    } else if (P === 'lamp') {
      // a closed enamel shade: green outside, a dark warm inside (no glowing green ring at the open top), a cap on top
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.14, 0.13, 20, 1, true), ctx.patch(new THREE.MeshStandardMaterial({ color: 0x1E3A2A, roughness: 0.35, side: THREE.FrontSide }))); grp.add(shade);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.137, 0.128, 20, 1, true), ctx.patch(new THREE.MeshStandardMaterial({ color: 0x2A2016, roughness: 0.8, side: THREE.BackSide }))); grp.add(inner);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.042, 0.018, 20), dark); cap.position.y = 0.072; grp.add(cap);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), emis); b.position.y = -0.02; grp.add(b);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), dark); st.position.set(0, -0.2, -0.06); grp.add(st);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.025, 20), dark); base.position.set(0, -0.36, -0.06); grp.add(base);
      sp = new THREE.SpotLight(c1, 0, num(item.range, 5), 1.15, 0.45, 2); sp.position.set(0, -0.03, 0); sp.target.position.set(0, -1, 0.05); grp.add(sp, sp.target);
      sp.castShadow = item.shadow !== false; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0006; sp.shadow.normalBias = 0.01; sp.shadow.camera.near = 0.08; sp.userData.noGovern = true;
      grp.userData.own = [shade, inner, cap, b];                                        // the lamp's own parts never shadow its pool (re-asserted on the first frame)
      pl = new THREE.PointLight(c1, 0, 1.2, 2); pl.position.y = 0.04;                 // the shade's own warm glow: a faint, short bounce (the shade blocks the rest)
    } else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), dark); grp.add(box);
      const lensG = new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16).rotateX(Math.PI / 2);
      const m2 = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c2.clone(), emissiveIntensity: 0, roughness: 0.4 });
      const l1 = new THREE.Mesh(lensG, emis); l1.position.set(-0.04, 0, 0.035); grp.add(l1);
      const l2 = new THREE.Mesh(lensG, m2); l2.position.set(0.04, 0, 0.035); grp.add(l2);
      pl = new THREE.PointLight(c1, 0, num(item.range, 5), 2); pl.position.z = 0.12;
      grp.userData.m2 = m2;
    }
    grp.add(pl);
    for (const L of [pl, sp]) if (L) { L.userData.noGovern = true; L.userData.v3 = true; }
    if (item.keep_hue) registerKeep(pl);
    const ts = num(item.t_switch, 1e9), fl = clamp(num(item.flicker, 0), 0, 1), ph = fhash(seed) * 30;
    const fade = Array.isArray(item.fade) ? item.fade : null;
    const tmp = new THREE.Color();
    // S.L = the lamp's shadowed spot: the update below patches the scene's shadow depth (log depth) for it, as for a
    // light.spot (REVIEW_1 #1: a lamp alone threw no pool because nothing ran the patch)
    parts.push({ frame: () => {}, S: { L: sp, update: (t, camera) => {
      if (grp.userData.own) { for (const m of grp.userData.own) m.castShadow = false; grp.userData.own = null; }
      const ex = Math.max(0.05, FILM_STATE.exposure || 1);
      let k = fade ? smoother((t - fade[0]) / Math.max(0.05, fade[1])) : 1;
      if (fl > 0) k *= 1 - fl * (0.12 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 8.1 + ph)) + 0.1 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 3.3 + ph * 2)) + 0.12 * fhash(Math.floor(t * 10 + ph)));
      // the jump light is two lamps: red goes out (0.08 s, eased), a beat of dark, then green comes on (0.08 s) -
      // never a colour lerp (that passes through amber); the colour swaps while both are dark
      const off = P === 'jump' ? smoother((t - ts) / 0.08) : 0, on = P === 'jump' ? smoother((t - ts - 0.12) / 0.08) : 0;
      const lv = P === 'jump' ? Math.max(1 - off, on) : 1;
      tmp.copy(P === 'jump' && t >= ts + 0.1 ? c2 : c1);
      pl.color.copy(tmp); pl.intensity = I * k * lv / ex * (P === 'lamp' ? 0.12 : 1);      // a lamp's point glow must not light the face above it
      if (sp) { sp.color.copy(tmp); sp.intensity = I * 1.6 * k / ex; }
      emis.emissive.copy(c1); emis.emissiveIntensity = (P === 'jump' ? (1 - off) : 1) * k * 5 / ex;
      if (grp.userData.m2) grp.userData.m2.emissiveIntensity = on * k * 5 / ex;
      if (camera) FILM_STATE.camera = camera;
    } } });
  } else {
    throw new Error('lights.js: unknown kind ' + kind);
  }
  let patched = false;
  const update = (t = 0, clock, camera) => {
    if (!patched && parts.some((p) => p.S.L && p.S.L.isSpotLight && p.S.L.castShadow)) { patchShadowDepth(ctx.scene); patched = true; }
    for (const p of parts) { p.frame(t); p.S.update(t, camera); }
  };
  return { root, radius: 0.15, height: 0.1, update, contact: false, snapped: true, anchors: {} };
}
