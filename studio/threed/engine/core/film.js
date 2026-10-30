// film.js — Legion 3D v3 film texture, scene grades, engine transitions and the volumetric light pass (WP3; V3_SPEC
// 2.3). post.js splices the GLSL below into a SECOND grade program (gradeFS(true)) that is used only on frames where
// filmSet() reports something active; every other frame renders through the pre-v3 program, untouched. So a spec that
// uses no v3 key is pixel-identical to the pre-v3 engine by construction (no new code runs in its shader).
//   filmUniforms()   fresh uniform objects merged into the grade material's uniforms (read only by the film program)
//   FILM_GLSL_DECL   declarations + helpers (after the grade shader's hash / vn / fbm, before main())
//   FILM_GLSL_PRE    after the source fetch (HDR exposed `c`): gate weave re-fetch, flicker, keep_hue mask -> fMono, fSat
//   FILM_GLSL_POST   display space after the whiteout, before scanlines / grain: dust, hairs, scratches
//   FILM_GLSL_END    after grain + levels, before the fade: burn, leak, flash, negative, iris, matte
//   FILM_GRADES      scene grades (look.grade): nocturne, dossier, void_red, void_blue, interior_warm, archive_bw
//   filmSet(u, g, frameNo, t, ctx) -> bool   per frame (after setGrade, before the bloom): sets the film uniforms and
//                    the halation tint of the bloom; true = render this frame through the film program
//   FILM_STATE       the live v3 registry the light / stage kinds write: scene exposure (look.js), the camera, the
//                    volumetric beams + fog volumes, the keep_hue lights. Entries die with their scene (attached()).
//   makeVolume(W, H) the volumetric pass (post.js runs it per sub-frame while a beam / fog volume is live)
// Everything is a pure function of the frame number / t (grain, weave, flicker, dirt, transitions, beam noise).
import * as THREE from 'three';

// look.film keys (snake, spec) -> grade keys (camel, presets' post rows use the camel names directly)
export const FILM_KEYS = { grain_px: 'grainPx', weave: 'weave', flicker: 'flicker', halation: 'halation', dirt: 'dirt', vig_pow: 'vigPow', matte: 'matte' };
const FILM_G = Object.values(FILM_KEYS);

// ── the live registry ────────────────────────────────────────────────────────────────────────────────────────────
export const FILM_STATE = { exposure: 1, camera: null, vols: [], keeps: [], seed: 0 };
// an object belongs to the live scene while its parent chain reaches a THREE.Scene (loadScene removes the old stage)
export function attached(o) { for (let p = o; p; p = p.parent) if (p.isScene) return true; return false; }
export function registerVolume(e) { FILM_STATE.vols.push(e); return e; }          // e = {kind: 'beam'|'fog', obj, ...}
export function registerKeep(light) { FILM_STATE.keeps.push(light); }
export function volumesLive() {
  const V = FILM_STATE.vols;
  for (let i = V.length - 1; i >= 0; i--) if (!attached(V[i].obj)) V.splice(i, 1);
  if (!V.length || !FILM_STATE.camera) return null;
  const beams = V.filter((e) => e.kind === 'beam' && e.on !== false).slice(0, 3), fogs = V.filter((e) => e.kind === 'fog').slice(0, 4);
  const haze = V.reduce((m, e) => Math.max(m, e.haze || 0), 0);
  return beams.length || fogs.length ? { beams, fogs, haze } : null;
}

// ── scene grades: deltas on post.js GRADE (they may carry film keys too) ──────────────────────────────────────────
export const FILM_GRADES = {
  // fern's blue night: a blue duotone (navy ink -> pale moon-blue paper), crushed blacks, soft bloom, heavy oval vignette
  // (measured on fern's night sheets T01/T03/T14: blacks lifted to navy ~#0d192f, mids ~#324d8c, lit snow ~#5f85d6)
  nocturne: { mono: 0.92, ink: [0.03, 0.06, 0.13], mid: [0.19, 0.29, 0.56], midAt: 0.42, paper: [0.56, 0.7, 1.0], contrast: 1.1, lift: [0.0, 0.002, 0.008], sat: 1,
    vignette: 0.66, vigPow: 1.55, grain: 0.03, bloom: 0.34, bloomT: 1.6, bloomR: 0.55, shoulder: 0.8, toe: 0.5 },
  // the dossier desk (fern T05, measured): near-neutral prints with a breath of warmth, dark brown wood, a soft vignette
  // (fix round 1: was a yellow-orange sepia; fern's prints are grey-white, the warmth lives in the wood)
  dossier: { mono: 0.62, ink: [0.032, 0.026, 0.02], mid: [0.44, 0.39, 0.33], midAt: 0.45, paper: [0.95, 0.92, 0.85], sat: 0.72, contrast: 1.12, lift: [0.01, 0.008, 0.006],
    gain: [1.01, 0.99, 0.96], vignette: 0.52, vigPow: 1.45, grain: 0.026, bloom: 0.18 },
  // the void: deep blacks, saturated practicals; red key world / blue (mono) world where a keep_hue light stays its colour
  void_red: { contrast: 1.2, lift: [0.0, 0.0, 0.0], sat: 1.15, shadowTint: [0.004, -0.001, -0.002], highTint: [0.01, -0.004, -0.008],
    vignette: 0.56, vigPow: 1.5, grain: 0.028, bloom: 0.3, bloomT: 1.8, toe: 0.45, shoulder: 0.82 },
  void_blue: { mono: 0.88, ink: [0.0, 0.002, 0.01], mid: [0.1, 0.2, 0.72], midAt: 0.38, paper: [0.55, 0.68, 1.0], contrast: 1.2, lift: [0.0, 0.0, 0.002], sat: 1,
    vignette: 0.56, vigPow: 1.5, grain: 0.028, bloom: 0.3, bloomT: 1.8, toe: 0.45, shoulder: 0.82 },
  // fern's fuselage / radio room: dark warm browns, a cool rim stays cool
  interior_warm: { gain: [1.06, 0.98, 0.86], shadowTint: [0.008, 0.003, -0.002], highTint: [-0.006, 0.0, 0.012], sat: 0.78, contrast: 1.12,
    lift: [0.006, 0.004, 0.002], vignette: 0.5, vigPow: 1.45, grain: 0.026, bloom: 0.26, toe: 0.7 },
  // a 3D shot that imitates newsreel: clean B&W, a little crushed, grain
  archive_bw: { mono: 1, ink: [0.014, 0.014, 0.014], paper: [0.95, 0.95, 0.93], sat: 1, contrast: 1.16, lift: [0.012, 0.012, 0.012], gamma: [1.14, 1.14, 1.14],
    vignette: 0.44, vigPow: 1.4, grain: 0.034, bloom: 0.18 },
};
// the director's names for light colours (V3 S2 colour code), linear-ish sRGB hex
export const KEY_COLOURS = { slit: 0xFF4A1E, red: 0xFF2A14, blue: 0x3A62FF, amber: 0xFFB060, neutral: 0xD8DDE6, moon: 0x9DB8FF, tungsten: 0xFFC98A, green: 0x2BFF6A, white: 0xFFFFFF, cyan: 0x6FE6FF };

// ── shader pieces ────────────────────────────────────────────────────────────────────────────────────────────────
export function filmUniforms() {
  return {
    uGrainPx: { value: 0 }, uWeave: { value: new THREE.Vector2() }, uFlick: { value: 1 }, uDirt: { value: 0 }, uVigPow: { value: 0 },
    uMatte: { value: 0 }, uNeg: { value: 0 }, uFlash: { value: 0 }, uBurn: { value: 0 }, uLeak: { value: 0 }, uIris: { value: 0 },
    uTrSeed: { value: 0 }, uFSeed: { value: 0 }, uKeep0: { value: new THREE.Vector4() }, uKeep1: { value: new THREE.Vector4() }, uMid: { value: new THREE.Vector4() },
  };
}
export const FILM_GLSL_DECL = /* glsl */`
      uniform float uGrainPx; uniform vec2 uWeave; uniform float uFlick; uniform float uDirt; uniform float uVigPow; uniform float uMatte;
      uniform float uNeg; uniform float uFlash; uniform float uBurn; uniform float uLeak; uniform float uIris; uniform float uTrSeed; uniform float uFSeed;
      // the film's frame counter: the frame number + a per-scene seed (dust, hairs, scratches and grain never repeat at the
      // same place and time in every shot of a video)
      float fFrame(){ return uFrame + uFSeed; }
      uniform vec4 uKeep0; uniform vec4 uKeep1; uniform vec4 uMid;
      // the mono duotone with a third colour in the middle (uMid.rgb at the knee uMid.w; 0 = the plain ink -> paper ramp)
      vec3 fMonoCol(float l){ float s = smoothstep(0.0, 1.0, l); if (uMid.w <= 0.0) return mix(uInk, uPaper, s);
        return s < uMid.w ? mix(uInk, uMid.rgb, s / uMid.w) : mix(uMid.rgb, uPaper, (s - uMid.w) / (1.0 - uMid.w)); }
      // keep_hue: a pixel lit by a kept light keeps its colour through the mono / desat grade. k.rgb = the light's unit
      // chroma direction (colour minus its luminance), k.w = strength. The match is on the HDR colour before tone mapping.
      float keepOne(vec3 c, vec4 k){
        if (k.w <= 0.0) return 0.0;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); vec3 ch = c - vec3(l); float cl = length(ch);
        float mx = max(c.r, max(c.g, c.b));
        if (mx < 1e-5 || cl < 1e-6) return 0.0;
        return k.w * smoothstep(0.78, 0.94, dot(ch / cl, k.rgb)) * smoothstep(0.1, 0.32, cl / mx) * smoothstep(0.0005, 0.006, mx);
      }
      float keepMask(vec3 c){ return max(keepOne(c, uKeep0), keepOne(c, uKeep1)); }
      // clumped grain: value noise at the grain size (px), a fresh field every frame (seeded by the frame number)
      float filmGrain(vec2 px){
        vec2 o = vec2(fract(fFrame() * 0.6180339) * 913.0, fract(fFrame() * 0.7548777) * 577.0);
        vec2 p = px / max(uGrainPx, 1.0) + o;
        return (vn(p) + 0.6 * vn(p * 1.93 + 37.1) - 0.8) * 1.75;
      }`;
export const FILM_GLSL_PRE = /* glsl */`
        if (uWeave.x != 0.0 || uWeave.y != 0.0) {          // gate weave: the whole frame drifts by a pixel, smoothly
          vec2 wv = vUv + uWeave / uRes;
          c = ((uSoft > 0.0 || uTilt.w > 0.0 || uCA > 0.0) ? fxSrc(wv) : texture2D(tSrc, wv).rgb) * uExposure;
        }
        c *= uFlick;
        float fKeep = keepMask(c);
        float fSat = mix(uSat, max(uSat, 1.0), fKeep), fMono = uMono * (1.0 - fKeep);
        float fVigPow = uVigPow > 0.0 ? uVigPow : 1.3;`;
export const FILM_GLSL_POST = /* glsl */`
        if (uDirt > 0.0) {
          // dust on the print: a few irregular specks per frame (most dark, some bright), never the same place twice
          vec2 P = vUv * uRes; float sc = uRes.y / 540.0, S = 46.0 * sc, fr = floor(fFrame() + 0.5);
          vec2 cell = floor(P / S);
          if (hash(cell + fr * 17.31) > 1.0 - 0.035 * uDirt) {
            vec2 ctr = (cell + vec2(0.15 + 0.7 * hash(cell + fr * 3.1), 0.15 + 0.7 * hash(cell.yx + fr * 5.7))) * S;
            vec2 dp = P - ctr; float r = (0.7 + 2.4 * hash(cell * 1.7 + fr)) * sc;
            float rr = r * (0.65 + 0.55 * vn(vec2(atan(dp.y, dp.x) * 1.7 + 4.0, fr + cell.x)));
            float spk = 1.0 - smoothstep(rr * 0.55, rr, length(dp));
            c = hash(cell + fr * 9.13) > 0.3 ? mix(c, c * 0.18, spk * 0.85) : mix(c, vec3(0.86), spk * 0.55);
          }
          // a hair in the gate now and then: a thin dark arc that stays a few frames
          float hs = floor(fFrame() / 11.0);
          if (hash(vec2(hs, 71.0)) > 1.0 - 0.18 * uDirt) {
            vec2 hc = vec2(0.15 + 0.7 * hash(vec2(hs, 2.0)), 0.15 + 0.7 * hash(vec2(hs, 3.0)));
            vec2 a = (vUv - hc) * vec2(uRes.x / uRes.y, 1.0); float R = 0.05 + 0.06 * hash(vec2(hs, 4.0));
            float ang = atan(a.y, a.x), arc = smoothstep(0.0, 0.4, sin(ang * 0.5 + hash(vec2(hs, 5.0)) * 6.28));
            float hl = (1.0 - smoothstep(0.6, 1.6, abs(length(a) - R) * uRes.y)) * arc;
            c = mix(c, c * 0.3, hl * 0.6);
          }
          // scratches: up to two thin vertical lines that hold for a few frames and wander slowly
          float seg = floor(fFrame() / 7.0);
          for (int i = 0; i < 2; i++) {
            float fi = float(i);
            if (hash(vec2(seg, fi * 13.0 + 1.0)) > 1.0 - 0.4 * uDirt) {
              float x0 = 0.05 + 0.9 * hash(vec2(seg * 1.3, fi + 4.0)) + 0.0025 * sin(fFrame() * 0.6 + fi * 2.0);
              float wpx = 0.6 + 0.8 * hash(vec2(seg, fi + 9.0));
              float d = abs(vUv.x - x0) * uRes.x;
              float ln = (1.0 - smoothstep(wpx * 0.5, wpx * 1.4, d)) * smoothstep(0.25, 0.6, vn(vec2(vUv.y * 7.0, seg * 3.0 + fi)));
              c = mix(c, c * 0.6 + 0.05, ln * 0.55);
            }
          }
        }`;
export const FILM_GLSL_END = /* glsl */`
        if (uBurn > 0.0) {                                  // film burn: a hot orange-white flare spreads from an edge
          float asp = uRes.x / uRes.y; vec2 a = vec2(vUv.x * asp, vUv.y);
          vec2 org = vec2(hash(vec2(uTrSeed, 1.0)) > 0.5 ? asp + 0.08 : -0.08, 0.2 + 0.6 * hash(vec2(uTrSeed, 2.0)));
          float nb = fbm(a * 2.6 + vec2(uTime * 0.7, uTrSeed * 7.0));
          float kb = smoothstep(uBurn * 2.3 - 0.05, uBurn * 2.3 - 0.75, length(a - org) + 0.55 * nb);
          vec3 bc = mix(vec3(0.75, 0.1, 0.02), vec3(1.0, 0.62, 0.22), smoothstep(0.15, 0.65, kb));
          bc = mix(bc, vec3(1.0, 0.95, 0.86), smoothstep(0.7, 1.0, kb));
          c = 1.0 - (1.0 - c) * (1.0 - clamp(bc * kb * 1.3, 0.0, 1.0));
          c = mix(c, vec3(1.0, 0.95, 0.86), smoothstep(0.82, 1.0, uBurn) * kb);
        }
        if (uLeak > 0.0) {                                  // light leak: a soft warm wash from one side, never the full frame
          float sd = hash(vec2(uTrSeed, 3.0)) > 0.5 ? vUv.x : 1.0 - vUv.x;
          float dr = 0.06 * sin(uTime * 1.3 + uTrSeed);
          float g1 = exp(-pow((sd - 0.02 - dr) / (0.16 + 0.42 * uLeak), 2.0));
          float g2 = exp(-pow(length(vec2((sd - 0.22) * 1.3, vUv.y - 0.62)) / (0.2 + 0.3 * uLeak), 2.0));
          vec3 lc = (vec3(1.0, 0.36, 0.1) * g1 + vec3(1.0, 0.72, 0.32) * g2 * 0.75) * uLeak * (0.82 + 0.3 * fbm(vUv * 3.5 + uTime * 0.25));
          c = 1.0 - (1.0 - c) * (1.0 - clamp(lc, 0.0, 1.0));
        }
        if (uFlash > 0.0) c = mix(c, vec3(1.0, 0.985, 0.96), uFlash);
        if (uNeg > 0.0) c = mix(c, (1.0 - c) * 0.9 + 0.05, uNeg);      // a film negative of the graded frame
        if (uIris > 0.0) { vec2 a = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0); float R = (1.0 - uIris) * 1.06; c *= 1.0 - smoothstep(R - 0.012, R, length(a)); }
        if (uMatte > 0.0) c *= step(uMatte, vUv.y) * step(vUv.y, 1.0 - uMatte);`;

// ── per frame ────────────────────────────────────────────────────────────────────────────────────────────────────
const clamp01 = (x, a, b) => Math.min(b, Math.max(a, +x || 0));
const fhash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const chromaDir = (col) => {             // THREE.Color -> unit chroma direction (colour minus luminance) or null
  const l = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b, d = [col.r - l, col.g - l, col.b - l], n = Math.hypot(...d);
  return n > 1e-4 ? d.map((v) => v / n) : null;
};
const HAL = [[0, 0], [0.1, 0.15], [0.35, 0.5], [0.5, 0.68], [0.6, 0.78]];   // halation: the wide bloom mips go red-orange
let halOn = false;
export function filmActive(g) {
  for (const k of FILM_G) if (g[k]) return true;
  return !!(g.neg || g.flash || g.burn || g.leak || g.iris || (g.mid && g.mono > 0));
}
function keepList(g) {
  const out = [];
  const add = (c, w = 1) => { const d = c && chromaDir(c); if (d && out.length < 2 && !out.some((o) => o[0] * d[0] + o[1] * d[1] + o[2] * d[2] > 0.97)) out.push([...d, w]); };
  if (g.keepHue) for (const h of [].concat(g.keepHue)) { try { add(new THREE.Color(KEY_COLOURS[h] ?? h)); } catch (e) { /* bad colour */ } }
  const K = FILM_STATE.keeps;
  for (let i = K.length - 1; i >= 0; i--) if (!attached(K[i])) K.splice(i, 1);
  for (const L of K) if (L.visible && L.intensity > 0) add(L.color, 1);
  return out;
}
export function filmSet(u, g, frameNo, t, ctx) {
  const keeps = (g.mono > 0 || g.sat < 1) ? keepList(g) : [];
  const on = filmActive(g) || keeps.length > 0;
  const bl = ctx && ctx.bloom;
  if (!on) {
    if (halOn && bl) { for (const v of bl.bloomTintColors) v.set(1, 1, 1); halOn = false; }
    return false;
  }
  const H = ctx?.H ?? 1080, W = ctx?.W ?? 1920, f = frameNo;
  u.uGrainPx.value = g.grainPx > 0 ? Math.max(1, g.grainPx * H / 1080) : 0;
  const wv = (g.weave || 0) * (H / 1080);
  u.uWeave.value.set(wv * (0.75 * Math.sin(f * 0.37 + 1.3) + 0.25 * Math.sin(f * 1.13 + 0.2)), wv * 0.6 * (0.7 * Math.sin(f * 0.29 + 2.1) + 0.3 * Math.sin(f * 0.91 + 4.0)));
  const fl = g.flicker || 0;
  u.uFlick.value = 1 + fl * 0.09 * ((fhash(f) - 0.5) * 1.2 + 0.4 * Math.sin(f * 0.53));
  u.uDirt.value = g.dirt || 0;
  u.uVigPow.value = g.vigPow || 0;
  const M = +g.matte || 0, A = W / H;
  u.uMatte.value = M > A ? (1 - A / M) / 2 : 0;
  u.uNeg.value = g.neg || 0; u.uFlash.value = g.flash || 0; u.uBurn.value = g.burn || 0; u.uLeak.value = g.leak || 0; u.uIris.value = g.iris || 0;
  // per-scene seed (look.js FILM_STATE.seed from the scene's look + camera; look.film.seed overrides): grain, dust,
  // hairs, scratches and the burn / leak edge differ per shot. Two shots that cut with a burn / leak and must continue
  // it across the cut give both the same look.film.seed.
  const sd = Number.isFinite(+g.filmSeed) ? +g.filmSeed : (FILM_STATE.seed || 0);
  u.uFSeed.value = Math.floor(fhash(sd * 0.731 + 0.17) * 997);
  u.uTrSeed.value = 1.9 + Math.floor(fhash(sd * 1.37 + 0.53) * 61);
  const md = Array.isArray(g.mid) && g.mid.length >= 3 ? g.mid : null;
  u.uMid.value.set(md ? md[0] : 0, md ? md[1] : 0, md ? md[2] : 0, md ? clamp01(g.midAt ?? 0.45, 0.1, 0.9) : 0);                      // fixed through a transition window (no jumping blob)
  const k0 = keeps[0], k1 = keeps[1];
  u.uKeep0.value.set(...(k0 || [0, 0, 0, 0])); u.uKeep1.value.set(...(k1 || [0, 0, 0, 0]));
  const h = Math.max(0, Math.min(1, g.halation || 0));
  if (bl) {
    if (h > 0) {
      HAL.forEach(([a, b], i) => bl.bloomTintColors[i].set(1, 1 - a * h, 1 - b * h));
      bl.strength *= 1 + 0.7 * h; bl.threshold *= 1 - 0.4 * h; bl.radius = Math.max(bl.radius, 0.45 + 0.25 * h);
      halOn = true;
    } else if (halOn) { for (const v of bl.bloomTintColors) v.set(1, 1, 1); halOn = false; }
  }
  return true;
}

// ── the volumetric pass: beams (spot cones with cookie + shadow) and fog volumes, per sub-frame, in scene-linear HDR.
// Output rgba = in-scattered light, transmittance (post.js: acc += (scene * a + rgb) / n). The camera ray stops at the
// scene depth (log depth: w = 2^(d log2(far + 1)) - 1), so a beam never shows through a wall or a figure.
const VOL_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export function volFS(nb, nf) {
  const B = [...Array(nb).keys()], F = [...Array(nf).keys()];
  return /* glsl */`
  precision highp float; precision highp sampler2DShadow;
  uniform sampler2D tDepth; uniform float uLogFar; uniform mat4 uProjInv; uniform mat4 uCamWorld; uniform vec3 uCamPos;
  uniform float uSeed; uniform float uTime; uniform float uHaze; uniform float uSteps;
  ${nb ? `uniform vec3 uBPos[${nb}]; uniform vec3 uBDir[${nb}]; uniform vec4 uBCone[${nb}]; uniform vec3 uBCol[${nb}]; uniform mat4 uBMat[${nb}]; uniform vec4 uBEx[${nb}];` : ''}
  ${B.map((i) => `uniform sampler2D tCk${i}; uniform sampler2DShadow tSh${i};`).join('\n  ')}
  ${nf ? `uniform vec4 uFA[${nf}]; uniform vec4 uFB[${nf}]; uniform vec4 uFC[${nf}];` : ''}
  varying vec2 vUv;
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  ${nf ? `uniform vec4 uFD[${nf}];` : ''}
  float smoke(vec3 p){ vec3 q = p * 0.9 + vec3(uTime * 0.05, uTime * 0.11, -uTime * 0.03); return 0.62 * n3(q) + 0.38 * n3(q * 2.3 + 7.1); }
  // fog volumes: box (0), sphere (1), layer (2: unbounded in x/z, soft top)
  float fogAt(vec3 p){
    float d = 0.0;
    ${F.map((i) => `{ vec4 a = uFA[${i}], b = uFB[${i}]; vec3 q = p - a.xyz; float e;
      if (a.w < 0.5) { vec3 m = (b.xyz - abs(q)) / max(b.xyz * 0.35, vec3(0.05)); e = clamp(min(m.x, min(m.y, m.z)), 0.0, 1.0); }
      else if (a.w < 1.5) { e = clamp((b.x - length(q)) / max(b.x * 0.4, 0.05), 0.0, 1.0); }
      else { e = clamp((b.y - q.y) / max(b.y * 0.8, 0.05), 0.0, 1.0) * step(-b.y, q.y); }
      d += b.w * e * e * (1.0 - uFC[${i}].w + uFC[${i}].w * 1.6 * smoke((p - uFD[${i}].xyz * uTime) * uFD[${i}].w + float(${i}) * 3.1)); }`).join('\n    ')}
    return d;
  }
  vec2 slab(vec3 ro, vec3 rd, vec3 c, vec3 h){ vec3 iv = 1.0 / (rd + vec3(1e-7)); vec3 t0 = (c - h - ro) * iv, t1 = (c + h - ro) * iv;
    vec3 lo = min(t0, t1), hi = max(t0, t1); return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z)); }
  vec2 fogSpan(vec3 ro, vec3 rd, int i){
    ${F.map((i) => `if (i == ${i}) { vec4 a = uFA[${i}], b = uFB[${i}];
      if (a.w < 0.5) return slab(ro, rd, a.xyz, b.xyz);
      if (a.w < 1.5) { vec3 oc = ro - a.xyz; float bb = dot(oc, rd), cc = dot(oc, oc) - b.x * b.x, dd = bb * bb - cc; if (dd < 0.0) return vec2(1.0, 0.0); dd = sqrt(dd); return vec2(-bb - dd, -bb + dd); }
      return slab(ro, rd, vec3(a.x, a.y, a.z), vec3(1e4, b.y, 1e4)); }`).join('\n    ')}
    return vec2(1.0, 0.0);
  }
  // the ray's interval inside the forward nappe of a cone (apex A, axis D, cos half-angle ca), capped at axial distance R
  vec2 coneSpan(vec3 ro, vec3 rd, vec3 A, vec3 D, float ca, float R){
    vec3 co = ro - A; float c2 = ca * ca, dv = dot(rd, D), cv = dot(co, D);
    float a = dv * dv - c2, b = dv * cv - dot(rd, co) * c2, c = cv * cv - dot(co, co) * c2;
    float t0 = -1e9, t1 = 1e9;
    if (abs(a) < 1e-7) { if (abs(b) < 1e-9) return vec2(1.0, 0.0); float r = -c / (2.0 * b); if (b > 0.0) t0 = r; else t1 = r; }
    else {
      float dd = b * b - a * c; if (dd < 0.0) return vec2(1.0, 0.0);
      dd = sqrt(dd); float r1 = (-b - dd) / a, r2 = (-b + dd) / a, lo = min(r1, r2), hi = max(r1, r2);
      if (a < 0.0) { t0 = lo; t1 = hi; }
      else { if (dv > 0.0) t0 = hi; else t1 = lo; }
    }
    float tm = (max(t0, -1e4) + min(t1, 1e4)) * 0.5;
    if (cv + tm * dv < 0.0) return vec2(1.0, 0.0);              // the backward nappe
    if (abs(dv) > 1e-7) { float s0 = -cv / dv, s1 = (R - cv) / dv; t0 = max(t0, min(s0, s1)); t1 = min(t1, max(s0, s1)); }
    else if (cv < 0.0 || cv > R) return vec2(1.0, 0.0);
    return vec2(t0, t1);
  }
  ${B.map((i) => `vec3 beam${i}(vec3 p, vec3 rd){
    vec3 lp = p - uBPos[${i}]; float d2 = max(dot(lp, lp), 1e-4), d = sqrt(d2); vec3 l = lp / d;
    float cone = smoothstep(uBCone[${i}].x, uBCone[${i}].y, dot(l, uBDir[${i}]));
    if (cone <= 0.0) return vec3(0.0);
    float rf = uBCone[${i}].z > 0.0 ? pow(clamp(1.0 - pow(d / uBCone[${i}].z, 4.0), 0.0, 1.0), 2.0) : 1.0;
    vec4 sc = uBMat[${i}] * vec4(p, 1.0); sc.xyz /= sc.w;
    float ck = 1.0;
    if (uBEx[${i}].x > 0.5) ck = (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0) ? textureLod(tCk${i}, sc.xy, 0.0).r : 0.0;
    if (ck <= 0.002) return vec3(0.0);
    float sh = 1.0;
    if (uBEx[${i}].y > 0.5 && sc.z < 1.0 && sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0) sh = texture(tSh${i}, vec3(sc.xy, sc.z - 0.0008));
    float g = uBEx[${i}].w, cs = dot(l, -rd), ph = 0.0796 * (1.0 - g * g) / pow(max(1.0 + g * g - 2.0 * g * cs, 1e-3), 1.5);
    return uBCol[${i}] * (cone * rf / d2 * ck * sh * ph);
  }`).join('\n  ')}
  void main(){
    float dz = texture2D(tDepth, vUv).x;
    vec4 v4 = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); vec3 vd = normalize(v4.xyz / v4.w);
    float tMax = dz >= 0.99999 ? 1e5 : (exp2(dz * uLogFar) - 1.0) / max(-vd.z, 1e-5);
    vec3 rd = normalize((uCamWorld * vec4(vd, 0.0)).xyz), ro = uCamPos;
    float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uSeed);
    vec3 Ls = vec3(0.0); float T = 1.0;
    ${F.map((i) => `{ vec2 s = fogSpan(ro, rd, ${i}); s.x = max(s.x, 0.0); s.y = min(min(s.y, tMax), s.x + 60.0);
      if (s.y > s.x) { float dt = (s.y - s.x) / 14.0;
        for (int k = 0; k < 14; k++) { vec3 p = ro + rd * (s.x + (float(k) + jit) * dt); float de = fogAt(p);
          Ls += T * uFC[${i}].rgb * de * dt; T *= exp(-de * dt); } } }`).join('\n    ')}
    ${B.map((i) => `{ vec2 s = coneSpan(ro, rd, uBPos[${i}], uBDir[${i}], uBCone[${i}].x, uBEx[${i}].z); s.x = max(s.x, 0.02); s.y = min(s.y, tMax);
      if (s.y > s.x) { float dt = (s.y - s.x) / uSteps; vec3 acc = vec3(0.0);
        for (int k = 0; k < 64; k++) { if (float(k) >= uSteps) break; vec3 p = ro + rd * (s.x + (float(k) + jit) * dt);
          float de = uHaze * (0.35 + 1.3 * smoke(p * 1.4)) ${nf ? '+ fogAt(p)' : ''};
          acc += beam${i}(p, rd) * de; }
        Ls += acc * dt * T; } }`).join('\n    ')}
    gl_FragColor = vec4(Ls, T);
  }`;
}
export function makeVolume(W, H) {
  const progs = {};
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
  const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); blank.needsUpdate = true;
  // a beam without spot shadows still needs a DEPTH texture with a compare mode on its sampler2DShadow: WebGL2 refuses
  // the whole draw when a plain texture is bound to a shadow sampler (a shadow: false beam blanked every beam + fog).
  // 1 x 1, cleared to the far plane once: the test always passes (lit).
  const noShadowRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, depthTexture: new THREE.DepthTexture(1, 1) });
  noShadowRT.depthTexture.compareFunction = THREE.LessEqualCompare;
  let noShadowReady = false;
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Vector3();
  function mat(nb, nf) {
    const k = nb + '_' + nf;
    if (progs[k]) return progs[k];
    const u = { tDepth: { value: null }, uLogFar: { value: 15 }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() }, uSeed: { value: 0 }, uTime: { value: 0 }, uHaze: { value: 0 }, uSteps: { value: 40 } };
    if (nb) Object.assign(u, { uBPos: { value: [...Array(nb)].map(() => new THREE.Vector3()) }, uBDir: { value: [...Array(nb)].map(() => new THREE.Vector3()) },
      uBCone: { value: [...Array(nb)].map(() => new THREE.Vector4()) }, uBCol: { value: [...Array(nb)].map(() => new THREE.Vector3()) },
      uBMat: { value: [...Array(nb)].map(() => new THREE.Matrix4()) }, uBEx: { value: [...Array(nb)].map(() => new THREE.Vector4()) } });
    for (let i = 0; i < nb; i++) { u['tCk' + i] = { value: blank }; u['tSh' + i] = { value: noShadowRT.depthTexture }; }
    if (nf) Object.assign(u, { uFA: { value: [...Array(nf)].map(() => new THREE.Vector4()) }, uFB: { value: [...Array(nf)].map(() => new THREE.Vector4()) }, uFC: { value: [...Array(nf)].map(() => new THREE.Vector4()) }, uFD: { value: [...Array(nf)].map(() => new THREE.Vector4(0, 0, 0, 0.8)) } });
    progs[k] = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VOL_VS, fragmentShader: volFS(nb, nf), depthTest: false, depthWrite: false });
    return progs[k];
  }
  // V = volumesLive(); depthTex = the scene target's depth texture of this sub-frame; j, n = the sub-frame
  function render(renderer, V, depthTex, frameNo, j, n, t, quality) {
    const camera = FILM_STATE.camera; if (!camera) return null;
    if (!noShadowReady) { const pr = renderer.getRenderTarget(); renderer.setRenderTarget(noShadowRT); renderer.clear(true, true, false); renderer.setRenderTarget(pr); noShadowReady = true; }
    const m = mat(V.beams.length, V.fogs.length), u = m.uniforms;
    quad.material = m;
    u.tDepth.value = depthTex; u.uLogFar.value = Math.log2(camera.far + 1);
    u.uProjInv.value.copy(camera.projectionMatrixInverse); u.uCamWorld.value.copy(camera.matrixWorld);
    u.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
    u.uSeed.value = fhash(frameNo * 7 + j * 3.1 + 0.5); u.uTime.value = t; u.uHaze.value = V.haze;
    u.uSteps.value = quality === 'draft' ? 32 : 48;
    const ex = Math.max(0.05, FILM_STATE.exposure || 1);
    V.beams.forEach((b, i) => {
      const L = b.light;
      L.updateMatrixWorld(); L.target.updateMatrixWorld();
      _p.setFromMatrixPosition(L.matrixWorld); _q.setFromMatrixPosition(L.target.matrixWorld);
      u.uBPos.value[i].copy(_p); u.uBDir.value[i].copy(_q).sub(_p).normalize();
      const co = Math.cos(L.angle), ci = Math.cos(L.angle * (1 - L.penumbra));
      const R = L.distance > 0 ? L.distance : 40;
      u.uBCone.value[i].set(co, Math.max(ci, co + 1e-4), L.distance || 0, 0);
      const k = (b.beam || 0) * (L.visible ? L.intensity : 0) * 0.16;          // the light's own (exposure-compensated) intensity: beam and lit surfaces stay in ratio
      u.uBCol.value[i].set(L.color.r * k, L.color.g * k, L.color.b * k);
      L.shadow.updateMatrices(L);                                              // the cookie / shadow projection of this sub-frame
      u.uBMat.value[i].copy(L.shadow.matrix);
      const sh = L.castShadow && L.shadow.map && L.shadow.map.depthTexture ? L.shadow.map.depthTexture : null;
      u['tCk' + i].value = L.map || blank; u['tSh' + i].value = sh || noShadowRT.depthTexture;
      u.uBEx.value[i].set(L.map ? 1 : 0, sh ? 1 : 0, R, b.g ?? 0.35);
    });
    V.fogs.forEach((f, i) => {
      const s = f.state();
      u.uFA.value[i].set(s.c[0], s.c[1], s.c[2], s.type); u.uFB.value[i].set(s.h[0], s.h[1], s.h[2], s.density);
      u.uFC.value[i].set(s.col[0] / ex, s.col[1] / ex, s.col[2] / ex, s.noise);
      const dr = s.drift || [0, 0, 0]; u.uFD.value[i].set(dr[0], dr[1], dr[2], s.scale ?? 0.8);          // wind drift (m/s) + smoke scale
    });
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt); renderer.render(scene, cam);
    renderer.setRenderTarget(prev);
    return rt.texture;
  }
  function dispose() { rt.dispose(); noShadowRT.dispose(); for (const m of Object.values(progs)) m.dispose(); }
  return { render, dispose, rt };
}
