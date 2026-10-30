// post.js — the camera's film (the 3D engine's post pass): N sub-frames per frame averaged in HDR (180-degree
// shutter motion blur + the lens-aperture samples of the DOF), bloom, then one grade pass: exposure, ACES filmic,
// contrast, lift/gamma/gain, split toning, saturation, sepia/mono mix, a subtle vignette, deterministic grain, and the
// whiteout transition (the frame fills with drifting cloud). Grain is seeded by the frame number derived from t, so a
// re-rendered frame is identical. Last, on the graded 8-bit frame, the WARP transition: since E1 v2 a clean, colour-
// neutral whip pan (horizontal smear + slide, 0.15 s either side of the cut); edges reflect like cv2.BORDER_REFLECT.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { filmUniforms, filmSet, FILM_GLSL_DECL, FILM_GLSL_PRE, FILM_GLSL_POST, FILM_GLSL_END, FILM_GRADES, volumesLive, makeVolume } from './film.js';   // v3 (WP3): film texture, engine transitions, volumetric light (a second program / pass, used only when a v3 key asks)

const QUAD_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const GRADE = {
  exposure: 1, lift: [0.006, 0.006, 0.007], gamma: [1, 1, 1], gain: [1, 1, 1], sat: 1.0,
  shadowTint: [0, 0, 0], highTint: [0, 0, 0], vignette: 0.26, grain: 0.018,
  mono: 0, ink: [0.082, 0.07, 0.055], paper: [0.96, 0.9, 0.78], contrast: 1.05, bloom: 0.22,
  white: 0, whiteCol: [0.92, 0.93, 0.95], warp: 0,
  // Q5 filmic print curve: `contrast` drives the S (curve = 0.3 + (contrast - 1.05) * 1.6 unless given), `pivot` is its
  // display-space centre, `toe` scales it below the pivot (night/space keep their shadows), `shoulder` is where the
  // highlight roll-off starts (nothing reaches 1.0: no clipped whites). Bloom: only the energy above `bloomT` (exposed
  // units, max channel, soft knee) blooms, so fire, lava, lightning and the sun glow while sunlit white does not.
  pivot: 0.45, toe: 1, shoulder: 0.86, bloomT: 2.3,
};

// the five looks the spec can ask for ("grade"); every key is a delta on GRADE
export const GRADES = {
  neutral: {},
  warm: { gain: [1.045, 1.0, 0.93], shadowTint: [-0.004, 0.0, 0.006], highTint: [0.02, 0.01, -0.016], sat: 1.02, contrast: 1.07 },
  cold: { gain: [0.94, 0.995, 1.06], shadowTint: [0.0, 0.004, 0.012], highTint: [-0.006, 0.0, 0.012], sat: 0.88, contrast: 1.06, lift: [0.008, 0.01, 0.014] },
  sepia: { mono: 0.62, sat: 0.4, contrast: 1.08, lift: [0.018, 0.014, 0.01], vignette: 0.34, grain: 0.024 },
  bleach: { sat: 0.5, contrast: 1.24, lift: [0.004, 0.004, 0.005], gain: [0.99, 1.0, 1.01], highTint: [0.006, 0.006, 0.004], vignette: 0.32 },
};
Object.assign(GRADES, FILM_GRADES);   // v3 scene grades (core/film.js: nocturne, dossier, void_red, void_blue, interior_warm, archive_bw)

export function makePost(renderer, W, H) {
  const rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  // autostyle v2 look presets: a scene target WITH a depth texture, made only when a preset's post needs depth (cel
  // ink edges, the hologram's void). No MSAA on it: the sub-frame jitter already antialiases. The default target is
  // untouched, so a documentary frame renders exactly as before.
  let rtSceneD = null, useDepth = false;
  const sceneRT = () => (useDepth && rtSceneD ? rtSceneD : rtScene);
  const rtAcc = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const accMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: rtScene.texture }, uW: { value: 1 } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tSrc; uniform float uW; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tSrc, vUv).rgb; c = clamp(c, vec3(0.0), vec3(250.0)); gl_FragColor = vec4(c * uW, 1.0); }`,
    depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
  });
  const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(quadGeo, accMat));
  // v3 (WP3): the volumetric pass (beams, fog volumes) runs per sub-frame while one is live (core/film.js); its output
  // (in-scattered light rgb, transmittance a) joins the scene here: acc += (scene * a + rgb) / n. Made on first use.
  let vol = null, accVolMat = null, accVolScene = null;
  function volAcc() {
    if (accVolMat) return;
    accVolMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, tVol: { value: null }, uW: { value: 1 } },
      vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D tSrc; uniform sampler2D tVol; uniform float uW; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tSrc, vUv).rgb; c = clamp(c, vec3(0.0), vec3(250.0)); vec4 v = texture2D(tVol, vUv); gl_FragColor = vec4((c * v.a + v.rgb) * uW, 1.0); }`,
      depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    });
    accVolScene = new THREE.Scene(); accVolScene.add(new THREE.Mesh(quadGeo, accVolMat));
    vol = makeVolume(W, H);
  }

  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.35, 2.4);
  // Q5: soft-knee excess on the brightest channel instead of the full texel above a luminance step: a sunlit white
  // wall just over the threshold adds a trace, a flame or a bolt far over it blooms (hot orange counts by its red)
  bloom.materialHighPassFilter.fragmentShader = /* glsl */`
    uniform sampler2D tDiffuse; uniform float luminosityThreshold; uniform float smoothWidth; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float br = max(c.r, max(c.g, c.b)), T = luminosityThreshold, K = T * 0.5;
      float soft = clamp(br - T + K, 0.0, 2.0 * K); soft = soft * soft / (4.0 * K + 1e-5);
      gl_FragColor = vec4(c * (max(soft, br - T) / max(br, 1e-4)), 1.0);
    }`;
  bloom.materialHighPassFilter.needsUpdate = true;

  const GU = {
      tSrc: { value: rtAcc.texture }, uExposure: { value: 1 }, uFrame: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) },
      uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
      uSat: { value: 1 }, uShadowTint: { value: new THREE.Vector3() }, uHighTint: { value: new THREE.Vector3() },
      uVignette: { value: 0.3 }, uGrain: { value: 0.03 }, uMono: { value: 0 }, uInk: { value: new THREE.Vector3() },
      uPaper: { value: new THREE.Vector3(1, 1, 1) }, uContrast: { value: 1 }, uFade: { value: 0 }, uFadeCol: { value: new THREE.Vector3() },
      uWhite: { value: 0 }, uWhiteCol: { value: new THREE.Vector3(1, 1, 1) }, uTime: { value: 0 },
      uCurve: { value: 0.3 }, uPivot: { value: 0.45 }, uToe: { value: 1 }, uShoulder: { value: 0.86 },
      // look presets (presets.js): every one 0 = off, the shader skips its branch (documentary = today's frame)
      uSoft: { value: 0 }, uTilt: { value: new THREE.Vector4(0.5, 0.1, 0.25, 0) }, uCA: { value: 0 },
      uBands: { value: 0 }, uBandSoft: { value: 0.06 }, uBandFlat: { value: 0 }, uEdgeFar: { value: new THREE.Vector2(250, 700) },
      uEdge: { value: 0 }, uEdgePx: { value: 1.2 }, uEdgeT: { value: 0.12 },
      uEdgeCol: { value: new THREE.Vector3() }, uEdgeAdd: { value: 0 }, uVoid: { value: new THREE.Vector2(0, 0) },
      uVoidCol: { value: new THREE.Vector3() }, uScan: { value: 0 }, uScanPx: { value: 3 }, uSweep: { value: 0 },
      uLevels: { value: 0 }, uDither: { value: 0 }, tDepth: { value: null }, uDepthOn: { value: 0 }, uLogFar: { value: 15.87 },
      tMask: { value: null }, uMaskOn: { value: 0 }, tInk: { value: null }, uInkOn: { value: 0 }, uBgFlat: { value: 0 }, uFlatR: { value: 6 }, uBandBg: { value: 0 },
      ...filmUniforms(),                                   // v3 film.js: read only by the film program
  };
  // v3 (WP3): the grade fragment is built twice. gradeFS(false) is the pre-v3 shader exactly (no film code at all);
  // gradeFS(true) adds core/film.js (weave, flicker, keep_hue, clumped grain, oval vignette power, dirt, the v3
  // transitions, matte) and is used only on frames where filmSet() says a film key is active (frame() below).
  const gradeFS = (film) => /* glsl */`
      uniform sampler2D tSrc; uniform float uExposure; uniform float uFrame; uniform vec2 uRes;
      uniform vec3 uLift; uniform vec3 uGamma; uniform vec3 uGain; uniform float uSat;
      uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uVignette; uniform float uGrain;
      uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper; uniform float uContrast; uniform float uFade; uniform vec3 uFadeCol;
      uniform float uWhite; uniform vec3 uWhiteCol; uniform float uTime;
      uniform float uCurve; uniform float uPivot; uniform float uToe; uniform float uShoulder;
      uniform float uSoft; uniform vec4 uTilt; uniform float uCA; uniform float uBands; uniform float uBandSoft;
      uniform float uBandFlat; uniform vec2 uEdgeFar; uniform sampler2D tMask; uniform float uMaskOn;
      uniform sampler2D tInk; uniform float uInkOn; uniform float uBgFlat; uniform float uFlatR; uniform float uBandBg;
      // the inkable coverage of a pixel (the cast, vehicles, buildings, props; ink.b accumulated over the sub-frames)
      float solidAt(vec2 uv){ return uInkOn > 0.5 ? clamp(texture2D(tInk, uv).b, 0.0, 1.0) : 0.0; }
      // the story labels' pixels (a label-only mask render): the spatial passes leave them sharp and readable
      float labelMask(vec2 uv){ return uMaskOn > 0.5 ? texture2D(tMask, uv).r : 0.0; }
      uniform float uEdge; uniform float uEdgePx; uniform float uEdgeT; uniform vec3 uEdgeCol; uniform float uEdgeAdd;
      uniform vec2 uVoid; uniform vec3 uVoidCol; uniform float uScan; uniform float uScanPx; uniform float uSweep;
      uniform float uLevels; uniform float uDither; uniform sampler2D tDepth; uniform float uDepthOn; uniform float uLogFar;
      varying vec2 vUv;
      // ── look presets: the source frame read soft (PS2 640x360 upscale), through a tilt-shift band, with a chromatic split
      // one low-res texel = the box of the full-res pixels under it (4 bilinear taps), the frame = those texels bilinear
      vec3 boxAt(vec2 c){ vec2 o = vec2(uSoft * 0.25) / uRes;
        return 0.25 * (texture2D(tSrc, c - o).rgb + texture2D(tSrc, c + vec2(o.x, -o.y)).rgb + texture2D(tSrc, c + vec2(-o.x, o.y)).rgb + texture2D(tSrc, c + o).rgb); }
      vec3 lowRes(vec2 uv){ vec2 R = uRes / uSoft; vec2 p = uv * R - 0.5; vec2 i = floor(p); vec2 f = fract(p);
        vec3 a = boxAt((i + vec2(0.5, 0.5)) / R), b = boxAt((i + vec2(1.5, 0.5)) / R), c = boxAt((i + vec2(0.5, 1.5)) / R), d = boxAt((i + vec2(1.5, 1.5)) / R);
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
      // tilt-shift: a disc blur whose radius grows with the distance from the focus band (uTilt = y, half band, feather, px at 1080p)
      vec3 tiltAt(vec2 uv){ float k = smoothstep(uTilt.y, uTilt.y + uTilt.z, abs(uv.y - uTilt.x)); float r = uTilt.w * k * k * (uRes.y / 1080.0);
        if (r < 0.35) return texture2D(tSrc, uv).rgb;
        vec3 s = vec3(0.0);
        for (int i = 0; i < 40; i++) { float fi = float(i); float rr = sqrt((fi + 0.5) / 40.0) * r; float a = fi * 2.39996323;
          s += texture2D(tSrc, uv + vec2(cos(a), sin(a)) * rr / uRes).rgb; }
        return s / 40.0; }
      vec3 fxSrc(vec2 uv){
        vec3 c = uSoft > 0.0 ? lowRes(uv) : (uTilt.w > 0.0 ? tiltAt(uv) : texture2D(tSrc, uv).rgb);
        if (uCA > 0.0) { vec2 d = (uv - 0.5) * 2.0 * uCA * (uRes.y / 1080.0) / uRes; c.r = texture2D(tSrc, uv + d).r; c.b = texture2D(tSrc, uv - d).b; }
        float mk = labelMask(uv);
        return mk > 0.0 ? mix(c, texture2D(tSrc, uv).rgb, mk) : c; }
      // cel: the frame's low frequencies (a disc of ~6 px at 1080p) through the same print curve: the light bands are
      // decided on it (a textured ground does not break into splotches) and the colour flattens toward it
      // the background flatten: a wider disc over the NON-inkable pixels only (no figure, ink or building bleeds in)
      vec3 blurBg(vec2 uv){ float r = uFlatR * (uRes.y / 1080.0); vec3 s = texture2D(tSrc, uv).rgb * 0.05; float ws = 0.05;
        for (int i = 0; i < 16; i++) { float fi = float(i); float rr = sqrt((fi + 0.5) / 16.0) * r; float a = fi * 2.39996323;
          vec2 q = uv + vec2(cos(a), sin(a)) * rr / uRes; float w = 1.0 - solidAt(q); s += texture2D(tSrc, q).rgb * w; ws += w; }
        return s / ws; }
      vec3 blurSrc(vec2 uv){ float r = 6.0 * (uRes.y / 1080.0); vec3 s = texture2D(tSrc, uv).rgb;
        for (int i = 0; i < 12; i++) { float fi = float(i); float rr = sqrt((fi + 0.5) / 12.0) * r; float a = fi * 2.39996323;
          s += texture2D(tSrc, uv + vec2(cos(a), sin(a)) * rr / uRes).rgb; }
        return s / 13.0; }
      float bay2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a){ return bay2(0.5 * a) * 0.25 + bay2(a); }
      // print curve: mixes toward two power curves that meet at the pivot (slope 1.9 there, 0 at 0 and 1); the mix
      // weight is uToe below the pivot, 1 above, blended smoothly, so the curve stays C1 and inside 0..1
      vec3 sCurve(vec3 x){
        x = clamp(x, 0.0, 1.0);
        vec3 lo = uPivot * pow(x / uPivot, vec3(1.9));
        vec3 hi = 1.0 - (1.0 - uPivot) * pow(max(1.0 - x, 0.0) / (1.0 - uPivot), vec3(1.9));
        vec3 y = mix(lo, hi, step(vec3(uPivot), x));
        vec3 k = uCurve * mix(vec3(uToe), vec3(1.0), smoothstep(0.0, uPivot * 1.4, x));
        return mix(x, y, k);
      }
      // highlight roll-off: linear to the knee, then a tanh shoulder that approaches but never reaches 1
      vec3 shoulder(vec3 x){
        float s = uShoulder;
        vec3 r = s + (1.0 - s) * tanh(max(x - s, 0.0) / (1.0 - s));
        return mix(x, r, step(vec3(s), x));
      }
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
      vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 c){
        const mat3 AIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
        const mat3 AOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
        c = AOut * rrt(AIn * (c / 0.6));
        return clamp(c, 0.0, 1.0);
      }
      vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      vec3 toneOf(vec3 h){ vec3 t = srgb(aces(h)); t = sCurve(t); t = uGain * (t + uLift * (1.0 - t)); return pow(max(t, 0.0), 1.0 / uGamma); }
      ${film ? FILM_GLSL_DECL : ''}
      void main(){
        vec3 c;
        if (uSoft > 0.0 || uTilt.w > 0.0 || uCA > 0.0) { c = fxSrc(vUv) * uExposure; }
        else { c = texture2D(tSrc, vUv).rgb * uExposure; }
        ${film ? FILM_GLSL_PRE : ''}
        c = srgb(aces(c));
        c = sCurve(c);
        c = uGain * (c + uLift * (1.0 - c));
        c = pow(max(c, 0.0), 1.0 / uGamma);
        if (uBgFlat > 0.0) {                       // look presets (cel, clay): a simplified, painterly ground and plants
          float kb = uBgFlat * (1.0 - solidAt(vUv)) * (1.0 - labelMask(vUv));
          if (kb > 0.0) c = mix(c, toneOf(blurBg(vUv) * uExposure), kb);
        }
        if (uBands > 0.0 || uBandFlat > 0.0) {
          // cel: flatten toward the low frequencies (fine texture goes, colour fields stay), then (bands) snap their
          // luminance to uBands soft-edged steps (never black); the ratio keeps the hue
          vec3 cb = toneOf(blurSrc(vUv) * uExposure);
          float mkb = 1.0 - labelMask(vUv);
          c = mix(c, cb, uBandFlat * mkb);
          if (uBandBg > 0.5) mkb *= (1.0 - solidAt(vUv)) * clamp(texture2D(tInk, vUv).a, 0.0, 1.0);   // cel: the bands paint only the ground and the plants (the sky stays a smooth wash)
          if (uBands > 0.0) {
            float lb = dot(cb, vec3(0.2126, 0.7152, 0.0722)); float x = lb * uBands;
            float qb = (floor(x) + 0.5 + smoothstep(1.0 - uBandSoft, 1.0, fract(x))) / uBands;
            c *= mix(1.0, min(qb / max(lb, 1e-3), 4.0), mkb);
          }
        }
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c += uShadowTint * (1.0 - smoothstep(0.0, 0.45, l)) + uHighTint * smoothstep(0.45, 1.0, l);
        c = mix(vec3(l), c, ${film ? 'fSat' : 'uSat'});
        c = mix(c, ${film ? 'fMonoCol(l)' : 'mix(uInk, uPaper, smoothstep(0.0, 1.0, l))'}, ${film ? 'fMono' : 'uMono'});
        vec2 q = vUv - 0.5;
        c *= 1.0 - uVignette * pow(dot(q * vec2(1.0, 0.8), q * vec2(1.0, 0.8)) * 2.2, ${film ? 'fVigPow' : '1.3'});
        c = shoulder(c);
        if (uDepthOn > 0.5) {
          // depth (logarithmic buffer: d * log2(far + 1) = log2(1 + w)): ink edges where the depth BENDS (a silhouette, a
          // crease), not along a slanted plane; the void fades everything past uVoid.x..y metres (and the sky) to uVoidCol
          float dc = texture2D(tDepth, vUv).x;
          if (uEdge > 0.0) {
            vec2 px = uEdgePx * (uRes.y / 1080.0) / uRes;
            float dl = texture2D(tDepth, vUv - vec2(px.x, 0.0)).x, dr = texture2D(tDepth, vUv + vec2(px.x, 0.0)).x;
            float dd = texture2D(tDepth, vUv - vec2(0.0, px.y)).x, du = texture2D(tDepth, vUv + vec2(0.0, px.y)).x;
            float lap = (abs(dl + dr - 2.0 * dc) + abs(dd + du - 2.0 * dc)) * uLogFar;
            // no ink past uEdgeFar (the horizon's grazing ground bends the depth everywhere: speckle, not lines)
            float e = smoothstep(uEdgeT, uEdgeT * 2.5, lap) * uEdge * (1.0 - smoothstep(uEdgeFar.x, uEdgeFar.y, exp2(dc * uLogFar) - 1.0));
            e *= 1.0 - labelMask(vUv);                  // screen labels write no depth: the ink behind them must not cut them
            c = uEdgeAdd > 0.5 ? c + uEdgeCol * e : mix(c, uEdgeCol, e);
          }
          if (uVoid.y > 0.0) { float w = exp2(dc * uLogFar) - 1.0; c = mix(c, uVoidCol, smoothstep(uVoid.x, uVoid.y, w)); }
        }
        // whiteout: drifting cloud billows thicken until they fill the frame
        if (uWhite > 0.0) {
          vec2 p = vec2(vUv.x * uRes.x / uRes.y, vUv.y) * 3.0;
          float n = fbm(p + vec2(uTime * 0.35, uTime * 0.12)) * 0.65 + fbm(p * 2.3 - vec2(uTime * 0.5, 0.0)) * 0.35;
          float cov = smoothstep(1.05 - uWhite * 1.25, 1.25 - uWhite * 1.25, n + 0.25 * length(q) * (1.0 - uWhite));
          cov = max(cov, smoothstep(0.75, 1.0, uWhite));
          vec3 wc = uWhiteCol * (0.9 + 0.12 * n);
          c = mix(c, wc, cov);
        }
        ${film ? FILM_GLSL_POST : ''}
        if (uScan > 0.0) { float sp = uScanPx * (uRes.y / 1080.0); c *= 1.0 - uScan * (0.5 + 0.5 * cos(6.2831853 * vUv.y * uRes.y / sp)); }
        if (uSweep > 0.0) { float sb = fract(vUv.y * 0.35 - uTime * 0.09) - 0.5; c += uEdgeCol * uSweep * exp(-sb * sb * 300.0); }
        float n2 = ${film ? 'uGrainPx > 0.0 ? filmGrain(vUv * uRes) : ' : ''}hash(vUv * uRes + fract(uFrame * 0.618) * 1000.0) + hash(vUv * uRes * 1.37 - uFrame * 3.1) - 1.0;
        float lg = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c += n2 * uGrain * (0.45 + 2.2 * lg * (1.0 - lg));          // film grain sits in the mid-tones, per frame
        if (uLevels > 0.0) c = floor(c * uLevels + 0.5 + (bayer4(gl_FragCoord.xy) - 0.5) * uDither) / uLevels;   // a fixed (per pixel) ordered dither: no flicker
        ${film ? FILM_GLSL_END : ''}
        c = mix(c, uFadeCol, uFade);
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`;
  const gradeMat = new THREE.ShaderMaterial({ uniforms: GU, vertexShader: QUAD_VS, fragmentShader: gradeFS(false), depthTest: false, depthWrite: false });
  let gradeMatFilm = null;                                  // v3: made on the first film frame
  const filmMat = () => gradeMatFilm || (gradeMatFilm = new THREE.ShaderMaterial({ uniforms: GU, vertexShader: QUAD_VS, fragmentShader: gradeFS(true), depthTest: false, depthWrite: false }));
  const gradeMesh = new THREE.Mesh(quadGeo, gradeMat);
  const gradeScene = new THREE.Scene(); gradeScene.add(gradeMesh);
  const filmCtx = { renderer, bloom, W, H };                // v3 film.js filmSet's context

  // ── look presets: INK (cel outlines, the hologram's glowing edges; fix round 2026-10-03) ─────────────────────────────
  // Per sub-frame, right after the scene render with the SAME jittered camera, main.js draws a G-buffer (inkSub ->
  // drawInk: xyz = the view normal scaled by the pixel's class (1 inkable: cast, vehicles, buildings, props; 2 ground;
  // 3 any other solid: grass, foliage, trees), w = the view depth; 0 = nothing) and the edge pass adds this sub-frame's
  // ink into rtInk with weight 1/n: lines on the NEAR side of a depth step and along creases of inkable surfaces, never on
  // terrain or plants, averaged over the jittered (and DOF) sub-frames like the colour = antialiased. After the
  // sub-frames applyInk() puts it into the HDR frame before the bloom: cel darkens toward the ink colour; the hologram
  // ADDS light (edges + fresnel rim, which then bloom) and sinks every non-inkable pixel toward the void. The story
  // labels' pixels (their mask, dilated) never take ink. Made on first use: a documentary frame never touches it.
  let rtInkG = null, rtInk = null, inkOn = false, inkDraw = null, inkFrame = false;   // inkFrame: this frame has ink coverage
  const D8 = 'const vec2 D8[8] = vec2[8](vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0), vec2(0.71, 0.71), vec2(-0.71, 0.71), vec2(0.71, -0.71), vec2(-0.71, -0.71));';
  const inkEdgeMat = new THREE.ShaderMaterial({
    uniforms: { tG: { value: null }, uRes: { value: new THREE.Vector2(W, H) }, uPx: { value: 1 }, uPxC: { value: 1 }, uW: { value: 1 },
      uDepthK: { value: 0.035 }, uCrease: { value: 0.74 }, uFar: { value: new THREE.Vector2(160, 480) } },
    vertexShader: QUAD_VS,
    fragmentShader: /* glsl */`
      uniform sampler2D tG; uniform vec2 uRes; uniform float uPx; uniform float uPxC; uniform float uW; uniform float uDepthK; uniform float uCrease; uniform vec2 uFar;
      varying vec2 vUv;
      ${D8}
      void main(){
        vec4 c = texture2D(tG, vUv);
        float cls = length(c.xyz), e = 0.0, rim = 0.0, solid = 0.0, drawn = c.w > 0.0 ? 1.0 : 0.0;   // drawn: not the sky
        if (c.w > 0.0 && cls < 1.5) {
          vec3 nc = c.xyz / max(cls, 1e-4); float dc = c.w; solid = 1.0;
          rim = pow(1.0 - clamp(abs(nc.z), 0.0, 1.0), 2.0);
          for (int i = 0; i < 8; i++) {                                                   // silhouettes: the outer line (uPx)
            vec4 n = texture2D(tG, vUv + D8[i] * uPx / uRes);
            if (n.w <= 0.0 || n.w > dc * (1.0 + uDepthK) + 0.04) { e = 1.0; break; }      // we are in front of it
          }
          for (int i = 0; i < 8; i++) {                                                   // creases: the inner lines (uPxC)
            vec4 n = texture2D(tG, vUv + D8[i] * uPxC / uRes);
            float k = length(n.xyz);
            if (k < 2.5 && n.w > 0.0 && abs(n.w - dc) < dc * uDepthK * 2.0 + 0.02 && dot(nc, n.xyz / k) < uCrease) e = 1.0;   // with inkable or the ground
          }
          e *= 1.0 - smoothstep(uFar.x, uFar.y, dc);
        }
        gl_FragColor = vec4(e, rim, solid, drawn) * uW;
      }`,
    depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  });
  const inkEdgeScene = new THREE.Scene(); inkEdgeScene.add(new THREE.Mesh(quadGeo, inkEdgeMat));
  // out = frame * a + rgb (custom blend): cel a = 1 - ink, rgb = ink colour; hologram a = the void dim, rgb = the light
  const inkApplyMat = new THREE.ShaderMaterial({
    uniforms: { tInk: { value: null }, tMask: { value: null }, uMaskOn: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) },
      uCol: { value: new THREE.Vector3() }, uAmt: { value: 1 }, uRim: { value: 0 }, uDim: { value: 1 }, uFill: { value: 1 }, uAdd: { value: 0 }, uHdr: { value: 1 } },
    vertexShader: QUAD_VS,
    fragmentShader: /* glsl */`
      uniform sampler2D tInk; uniform sampler2D tMask; uniform float uMaskOn; uniform vec2 uRes;
      uniform vec3 uCol; uniform float uAmt; uniform float uRim; uniform float uDim; uniform float uFill; uniform float uAdd; uniform float uHdr;
      varying vec2 vUv;
      ${D8}
      void main(){
        vec4 k = texture2D(tInk, vUv);
        float m = 0.0;
        if (uMaskOn > 0.5) { vec2 o = 2.5 * (uRes.y / 1080.0) / uRes; m = texture2D(tMask, vUv).r;
          for (int i = 0; i < 8; i++) m = max(m, texture2D(tMask, vUv + D8[i] * o).r); }
        float e = clamp(k.r * uAmt, 0.0, 1.0) * (1.0 - m);
        if (uAdd > 0.5) {
          float f = mix(mix(uDim, uFill, clamp(k.b, 0.0, 1.0)), 1.0, m);
          gl_FragColor = vec4(uCol * uHdr * (e + clamp(k.g, 0.0, 1.0) * uRim * (1.0 - m)), f);
        } else {
          gl_FragColor = vec4(uCol * uHdr * e, 1.0 - e);
        }
      }`,
    depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.SrcAlphaFactor, blendEquation: THREE.AddEquation,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const inkApplyScene = new THREE.Scene(); inkApplyScene.add(new THREE.Mesh(quadGeo, inkApplyMat));
  function inkTargets() {
    if (rtInkG) return;
    rtInkG = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    rtInk = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
    inkEdgeMat.uniforms.tG.value = rtInkG.texture; inkApplyMat.uniforms.tInk.value = rtInk.texture;
  }
  // main.js: the G-buffer drawer (renders the scene with its ink override into the given target)
  function setInkDraw(fn) { inkDraw = fn; }
  // main.js renderSub, right after the scene render (the camera still carries this sub-frame's jitter / aperture)
  function inkSub() {
    if (!inkOn) return;
    const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha(), ac = renderer.autoClear;
    renderer.setRenderTarget(rtInkG); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, false);
    inkDraw(rtInkG);
    renderer.setRenderTarget(rtInk); renderer.autoClear = false; renderer.render(inkEdgeScene, cam); renderer.autoClear = ac;
    renderer.setClearColor(cc, ca);
  }
  function applyInk(g) {
    const k = g.outline, u = inkApplyMat.uniforms, ex = Math.max(0.05, g.exposure || 1);
    u.uCol.value.set(...(k.col ?? [0, 0, 0])); u.uAmt.value = k.amt ?? 1; u.uRim.value = k.rim ?? 0; u.uDim.value = k.dim ?? 1; u.uFill.value = k.fill ?? 1;
    u.uAdd.value = k.add ? 1 : 0; u.uHdr.value = (k.add ? (k.hdr ?? 1) : 1) / ex;
    u.uMaskOn.value = maskNow ? 1 : 0; u.tMask.value = maskNow ? rtMask.texture : null;
    renderer.setRenderTarget(rtAcc); const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.render(inkApplyScene, cam); renderer.autoClear = ac;
  }

  // the warp pass reads the graded frame from an 8-bit target (mirrored edges = cv2.BORDER_REFLECT)
  const rtGrade = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  rtGrade.texture.wrapS = rtGrade.texture.wrapT = THREE.MirroredRepeatWrapping;
  // E1 v2 WARP = a whip pan: the graded frame smears sideways and slides with the whip, 0.15 s either side of the cut
  // (0.3 s in all), colour-neutral: no zoom streak, no chromatic split, no warm flash (that read as a glitch). uDir -1
  // on the outgoing side (the picture slides left), +1 on the incoming one (it arrives from the right and settles), so
  // both halves read as one whip. 40 taps with a per-pixel offset: a soft streak, never ghost copies.
  const warpMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: rtGrade.texture }, uW: { value: 0 }, uDir: { value: -1 }, uRes: { value: new THREE.Vector2(W, H) } },
    vertexShader: QUAD_VS,
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform float uW; uniform float uDir; uniform vec2 uRes; varying vec2 vUv;
      float hsh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        float w = clamp(uW, 0.0, 1.0), e = w * w;
        float L = 0.45 * e, off = uDir * 0.18 * e;
        float j = hsh(vUv * uRes) - 0.5;
        vec3 acc = vec3(0.0); float ws = 0.0;
        for (int i = 0; i < 40; i++) {
          float u = (float(i) + 0.5 + j) / 40.0 - 0.5;
          float k = 1.0 - abs(u) * 1.6;
          acc += texture2D(tSrc, vec2(vUv.x - off + u * L, vUv.y)).rgb * k; ws += k;
        }
        gl_FragColor = vec4(clamp(acc / ws, 0.0, 1.0), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const warpScene = new THREE.Scene(); warpScene.add(new THREE.Mesh(quadGeo, warpMat));

  function setGrade(g) {
    const u = gradeMat.uniforms;
    u.uExposure.value = g.exposure;
    u.uLift.value.set(...g.lift); u.uGamma.value.set(...g.gamma); u.uGain.value.set(...g.gain);
    u.uSat.value = g.sat; u.uShadowTint.value.set(...g.shadowTint); u.uHighTint.value.set(...g.highTint);
    u.uVignette.value = g.vignette; u.uGrain.value = g.grain; u.uMono.value = g.mono;
    u.uInk.value.set(...g.ink); u.uPaper.value.set(...g.paper); u.uContrast.value = g.contrast;
    u.uFade.value = g.fade ?? 0; u.uFadeCol.value.set(...(g.fadeCol ?? [0, 0, 0]));
    u.uWhite.value = g.white ?? 0; u.uWhiteCol.value.set(...(g.whiteCol ?? [1, 1, 1]));
    u.uCurve.value = Math.min(0.9, Math.max(0, g.curve ?? 0.3 + (g.contrast - 1.05) * 1.6));
    u.uPivot.value = g.pivot ?? 0.45; u.uToe.value = g.toe ?? 1; u.uShoulder.value = g.shoulder ?? 0.86;
    bloom.strength = g.bloom;
    bloom.threshold = (g.bloomT ?? 2.3) / Math.max(0.05, g.exposure);     // exposed units -> the HDR buffer's units
    bloom.radius = g.bloomR ?? 0.35;
    // look presets (presets.js): absent keys = 0 = the pass is off
    // soft: the frame's height in lines (448 = the PS2); the factor follows the render size, off when not downscaling
    const sf = g.soft ? H / g.soft : 0;
    u.uSoft.value = sf > 1.05 ? sf : 0;
    const tl = g.tilt || {};
    u.uTilt.value.set(tl.y ?? 0.5, tl.band ?? 0.1, tl.feather ?? 0.25, tl.px ?? 0);
    u.uCA.value = g.ca ?? 0; u.uBands.value = g.bands ?? 0; u.uBandSoft.value = g.bandSoft ?? 0.06; u.uBandFlat.value = g.bandFlat ?? 0;
    const ed = g.edge || {};
    u.uEdge.value = useDepth ? (ed.amt ?? 0) : 0; u.uEdgePx.value = ed.px ?? 1.2; u.uEdgeT.value = ed.t ?? 0.12;
    u.uEdgeFar.value.set(...(ed.far ?? [250, 700]));
    u.uEdgeCol.value.set(...(ed.col ?? [0, 0, 0])); u.uEdgeAdd.value = ed.add ? 1 : 0;
    const vd = g.void || {};
    u.uVoid.value.set(vd.from ?? 0, useDepth ? (vd.to ?? 0) : 0); u.uVoidCol.value.set(...(g.voidCol ?? [0, 0, 0]));
    u.uScan.value = g.scan ?? 0; u.uScanPx.value = g.scanPx ?? 3; u.uSweep.value = g.sweep ?? 0;
    u.uLevels.value = g.levels ?? 0; u.uDither.value = g.dither ?? 0;
    u.uDepthOn.value = useDepth && rtSceneD ? 1 : 0; u.tDepth.value = useDepth && rtSceneD ? rtSceneD.depthTexture : null;
    u.uLogFar.value = g.logFar ?? 15.87;
    u.uMaskOn.value = maskNow ? 1 : 0; u.tMask.value = maskNow ? rtMask.texture : null;
    u.uBgFlat.value = inkFrame ? (g.bgFlat ?? 0) : 0; u.uFlatR.value = g.flatR ?? 6; u.uBandBg.value = inkFrame && g.bandBg ? 1 : 0;
    u.uInkOn.value = inkFrame ? 1 : 0; u.tInk.value = inkFrame ? rtInk.texture : null;
  }
  // the label mask (a preset with spatial passes keeps the story labels sharp): full resolution (thin sub-lines), made
  // on first use
  let rtMask = null, maskNow = false;
  function renderMask(maskFn) {
    if (!rtMask) rtMask = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    renderer.setRenderTarget(rtMask); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, false);
    maskFn(rtMask);
    maskNow = true;
  }

  // the depth target on / off for the frames that follow (a preset with edges or a void); made once, on first use
  function setDepth(on) {
    if (on && !rtSceneD) {
      try {
        rtSceneD = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
      } catch (e) { console.warn('[f3d] depth target', String(e)); rtSceneD = null; }
    }
    useDepth = !!on && !!rtSceneD;
    accMat.uniforms.tSrc.value = sceneRT().texture;
  }
  const wantsDepth = (g) => !!((g.edge && g.edge.amt > 0) || (g.void && g.void.to > 0));

  // one frame: renderSub(j) renders the scene into rtScene for sub-frame j (0..n-1)
  function frame(n, renderSub, frameNo, grade, t, maskFn) {
    const VL = volumesLive();                                        // v3: live beams / fog volumes (null for every pre-v3 scene)
    const wd = wantsDepth(grade) || !!VL;
    if (wd !== useDepth) setDepth(wd);
    if (VL) volAcc();
    maskNow = false;
    const ik = grade.outline && inkDraw ? grade.outline : null;     // look preset ink (cel, hologram; clay: coverage only)
    inkOn = inkFrame = !!ik;
    if (inkOn) {
      inkTargets();
      const e = inkEdgeMat.uniforms;
      e.uPx.value = Math.max(1, Math.round((ik.px ?? 1.5) * H / 1080)); e.uPxC.value = Math.max(1, Math.round((ik.pxC ?? ik.px ?? 1.5) * H / 1080)); e.uW.value = 1 / n;
      e.uDepthK.value = ik.depthK ?? 0.035; e.uCrease.value = ik.crease ?? 0.74; e.uFar.value.set(...(ik.far ?? [160, 480]));
      renderer.setRenderTarget(rtInk); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
    }
    const rtS = sceneRT();
    renderer.setRenderTarget(rtAcc);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, false, false);
    for (let j = 0; j < n; j++) {
      renderer.setRenderTarget(rtS);
      renderSub(j, rtS);
      const vt = VL && useDepth && rtSceneD ? vol.render(renderer, VL, rtSceneD.depthTexture, frameNo, j, n, t ?? 0, H < 700 ? 'draft' : 'final') : null;
      renderer.setRenderTarget(rtAcc);
      const ac = renderer.autoClear; renderer.autoClear = false;
      if (vt) { accVolMat.uniforms.tSrc.value = rtS.texture; accVolMat.uniforms.tVol.value = vt; accVolMat.uniforms.uW.value = 1 / n; renderer.render(accVolScene, cam); }
      else { accMat.uniforms.uW.value = 1 / n; renderer.render(accScene, cam); }
      renderer.autoClear = ac;
    }
    if (maskFn && grade.labelMask) renderMask(maskFn);    // look presets: the labels' pixels, for the spatial passes
    if (inkOn) { applyInk(grade); inkOn = false; }        // look presets: the ink into the HDR frame, before the bloom
    setGrade(grade);
    gradeMesh.material = filmSet(GU, grade, frameNo, t ?? 0, filmCtx) ? filmMat() : gradeMat;   // v3 film.js: the film program only when a film key / v3 transition / keep_hue is active
    if (grade.bloom > 0) bloom.render(renderer, null, rtAcc, 0, false);
    gradeMat.uniforms.uFrame.value = frameNo;
    gradeMat.uniforms.uTime.value = t ?? 0;
    const w = grade.warp ?? 0;
    if (w > 1e-3) {
      renderer.setRenderTarget(rtGrade); renderer.render(gradeScene, cam);
      warpMat.uniforms.uW.value = Math.min(1, w); warpMat.uniforms.uDir.value = grade.warpDir ?? -1;
      renderer.setRenderTarget(null); renderer.render(warpScene, cam);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(gradeScene, cam);
    }
  }
  function dispose() { if (vol) vol.dispose(); rtScene.dispose(); if (rtSceneD) rtSceneD.dispose(); if (rtMask) rtMask.dispose(); if (rtInkG) { rtInkG.dispose(); rtInk.dispose(); } rtAcc.dispose(); rtGrade.dispose(); bloom.dispose(); }
  // rtScene: the target the scene renders into right now (the depth one while a preset needs it)
  return { frame, get rtScene() { return sceneRT(); }, rtAcc, bloom, setGrade, setDepth, dispose, setInkDraw, inkSub };
}
