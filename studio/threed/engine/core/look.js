// look.js — the `look` block of a scene: time of day -> sun (or moon), sky type -> clouds, fog + haze -> the shared
// height fog, and the grade preset. Also the lights (sun/moon key with soft shadows sized to the stage, sky/ground
// hemisphere) and the PMREM environment baked from the sky once per scene. Everything is fixed per scene except the
// clouds' slow drift, so every frame is a pure function of t.
import * as THREE from 'three';
import { U, computeEnv } from '../lib/shared/env.js';
import { makeSky, applySkyEnv, SKY_UNIFORMS, cloudParams } from './sky.js';
import { GRADE, GRADES } from './post.js';
import { presetGrade } from './presets.js';
import { clamp, lerp, lin, smooth } from '../lib/shared/util.js';
import { FILM_STATE, FILM_KEYS, registerKeep } from './film.js';   // v3 (WP3): the scene exposure for exposure-compensated v3 lights; look.film keys

// sun elevation per time preset; azimuth is placed relative to the camera's mean view direction (side-back light
// that models the forms) unless the spec gives look.sun.az. `rel` = degrees between the view azimuth and the sun.
export const TIMES = {
  dawn: { el: 3.5, rel: 55, grade: 'warm' },
  morning: { el: 22, rel: 75, grade: 'neutral' },
  noon: { el: 62, rel: 110, grade: 'neutral' },
  afternoon: { el: 34, rel: 80, grade: 'neutral' },
  golden: { el: 7, rel: 50, grade: 'warm' },
  dusk: { el: -2.5, rel: 40, grade: 'warm' },
  night: { el: -22, rel: 60, grade: 'cold' },
  overcast: { el: 36, rel: 90, grade: 'neutral', sky: 'overcast' },
};
export const SKIES = {
  clear: { cloud: 0.1, storm: 0, sunMul: 1, ambMul: 1, soft: 2.5 },
  scattered: { cloud: 0.5, storm: 0, sunMul: 0.92, ambMul: 1.05, soft: 3 },
  overcast: { cloud: 1.0, storm: 0.28, sunMul: 0.3, ambMul: 1.55, soft: 9 },
  storm: { cloud: 1.0, storm: 1, sunMul: 1, ambMul: 1.2, soft: 10 },
  // Q5 casts. 'smoke': a wildfire pall, the day the sky turned orange: a diffuse deep-orange deck, a dim red sun disc
  // through it, orange skylight, low contrast, long soft shadows (the sun stays low unless look.sun.el is given).
  // 'storm_green': the storm with the green cast of a hail core ("the sky's turned green").
  smoke: { cloud: 1.0, storm: 0.4, sunMul: 0.45, ambMul: 1.3, soft: 18, cast: 'smoke', maxEl: 14 },
  storm_green: { cloud: 1.0, storm: 1, sunMul: 1, ambMul: 1.2, soft: 10, cast: 'green' },
};
const LID = new Set(['overcast', 'storm', 'storm_green', 'smoke']);     // skies under a full deck

export function makeLook(renderer, scene, tex) {
  const sky = makeSky(tex.moon);
  scene.add(sky);
  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00025; key.shadow.normalBias = 0.035; key.shadow.radius = 3;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight(0x8899bb, 0x443322, 0.5);
  scene.add(hemi);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(sky.geometry, sky.material); envSky.frustumCulled = false; envScene.add(envSky);
  const envClouds = new THREE.Mesh(sky.userData.clouds.geometry, sky.userData.clouds.material);    // Q5: the cloud pass
  envClouds.frustumCulled = false; envClouds.renderOrder = 1; envScene.add(envClouds);
  let envRT = null;

  let cur = null;          // the resolved look of the current scene
  let voidHid = false;     // v3: the sky is hidden by a stage.void
  const shadowBox = { cx: 0, cz: 0, S: 120, y: 0 };

  // resolve a look block (+ weather) into env numbers. viewAz: mean camera azimuth (deg, from north clockwise)
  function resolve(look = {}, weather = {}, o = {}) {
    const warnings = [];
    const time = TIMES[look.time] ? look.time : (look.time ? (warnings.push(`look.time '${look.time}' unknown, using afternoon`), 'afternoon') : 'afternoon');
    const T = TIMES[time];
    const skyName = SKIES[look.sky] ? look.sky : (look.sky ? (warnings.push(`look.sky '${look.sky}' unknown, using scattered`), 'scattered') : (T.sky || 'scattered'));
    const S = SKIES[skyName];
    const side = o.side ?? 1;
    const viewAz = o.viewAz ?? 0;
    const sunEl = look.sun?.el ?? (S.maxEl != null ? Math.min(T.el, S.maxEl) : T.el);
    const sunAz = look.sun?.az ?? (viewAz + side * T.rel + 360) % 360;
    const rain = clamp(weather.rain ?? 0), snow = clamp(weather.snow ?? 0), dust = clamp(weather.dust ?? 0), ash = clamp(weather.ash ?? 0);
    const storm = clamp(Math.max(S.storm, rain * 0.7, ash * 0.45));
    const cloud = clamp(Math.max(S.cloud, rain * 0.9, snow * 0.85, ash * 0.8));
    const haze = clamp(look.haze ?? 0.45), fog = clamp(look.fog ?? 0);
    const env = computeEnv({
      sunEl, sunAz, storm, cloud, haze: 0.35 + 2.3 * haze,
      moonAz: look.moon?.az ?? (viewAz + side * 135 + 360) % 360, moonEl: look.moon?.el ?? 30, moonI: 0.9,
      sunMul: S.sunMul * (1 - ash * 0.5) * (1 - dust * 0.3), ambMul: S.ambMul,
    });
    // fog: a low, thick layer on top of the haze
    env.fogDensity *= (1 + 60 * fog * fog) * (1 + 3 * dust + 2 * ash + 1.2 * snow + 0.8 * rain);
    env.fogFalloff = 0.0032 + 0.022 * fog;
    const tint = (col, amt) => { env.fog = env.fog.map((v, i) => lerp(v, col[i] * (0.25 + 0.75 * (1 - env.night)), amt)); };
    if (dust > 0) tint([0.52, 0.4, 0.27], clamp(dust * 0.8));
    if (ash > 0) tint([0.3, 0.29, 0.28], clamp(ash * 0.75));
    if (skyName === 'overcast') tint([0.55, 0.57, 0.6], 0.55);
    if (snow > 0) tint([0.72, 0.76, 0.82], snow * 0.35);
    if (S.cast === 'smoke') {
      // the whole atmosphere is smoke: orange haze and skylight, a weak red-shifted sun (linear, before exposure)
      const day = 0.3 + 0.7 * (1 - env.night);
      env.fog = env.fog.map((v, i) => lerp(v, [0.58, 0.2, 0.05][i] * day, 0.9));
      env.fogSun = [0.5, 0.13, 0.02].map((v) => v * day);
      env.amb = [0.62, 0.3, 0.1]; env.gnd = [0.12, 0.05, 0.018];
      env.sunColor = [1.0, 0.28, 0.06];
      env.zenith = [0.26, 0.07, 0.018].map((v) => v * day); env.horizon = [0.6, 0.21, 0.05].map((v) => v * day); env.sunHorizon = [0.8, 0.28, 0.06].map((v) => v * day);
      env.fogDensity *= 1.5;
    }
    if (S.cast === 'green') {
      // the hail core: the light under the deck turns green-teal, strongest overhead
      env.fog = env.fog.map((v, i) => v * [0.76, 1.0, 0.8][i]);
      env.amb = env.amb.map((v, i) => v * [0.66, 1.0, 0.72][i]);
      env.horizon = env.horizon.map((v, i) => v * [0.8, 1.0, 0.78][i]);
    }
    // autostyle v2 look preset (presets.js): its atmosphere over every exterior (San Andreas' smog, noir's smoky air)
    const A = o.preset && o.preset.atmos;
    if (A && !o.interior) {
      const day = 0.3 + 0.7 * (1 - env.night), dk = 1 - 0.8 * env.night;      // a smog is a day thing: at night it thins out
      if (A.tint) env.fog = env.fog.map((v, i) => lerp(v, A.tint[i] * day, clamp((A.tintAmt ?? 0.5) * dk)));
      if (A.density) env.fogDensity *= lerp(1, A.density, dk);
      if (A.d50) env.fogDensity = Math.max(env.fogDensity, lerp(0, Math.LN2 / A.d50, dk));   // a short draw distance: half the light gone at d50 m (thins at night)
      if (A.falloff != null) env.fogFalloff *= lerp(1, A.falloff, dk);
      if (A.horizon && A.tint) env.horizon = env.horizon.map((v, i) => lerp(v, A.tint[i] * day, clamp(A.horizon * dk)));
      if (A.fogAbs) { env.fogDensity = A.fogAbs[0]; env.fogFalloff = A.fogAbs[1]; }   // a plain distance fog (the hologram's void)
      if (A.fogSun != null) env.fogSun = env.fogSun.map((v) => v * A.fogSun);
      if (A.cloud != null) env.cloud = Math.min(env.cloud, A.cloud);   // a look that draws its own clouds (game: cartoon puffs) caps the sky's
      if (A.sky) {                                   // a painted sky colour (the hologram's dark void): no clouds, no stars
        env.realSky = { zenith: env.zenith, horizon: env.horizon, sunHorizon: env.sunHorizon };   // the reflections keep the real sky
        env.zenith = A.sky.slice(); env.horizon = (A.skyHorizon || A.sky).slice(); env.sunHorizon = (A.skyHorizon || A.sky).slice();
        env.stars = 0; env.cloud = 0;
      }
    }
    const grade = GRADES[look.grade] ? look.grade : (look.grade ? (warnings.push(`look.grade '${look.grade}' unknown, using neutral`), 'neutral') : T.grade);
    return { time, sky: skyName, S, sunEl, sunAz, env, rain, snow, dust, ash, fog, haze, grade, warnings, wet: clamp(Math.max(rain, /^storm/.test(skyName) ? 0.4 : 0)) };
  }

  function setUniforms(e, L) {
    U.uSunDir.value.copy(e.sunDir);
    U.uSunColor.value.setRGB(...e.sunColor);
    U.uMoonDir.value.copy(e.moonDir);
    U.uMoonColor.value.setRGB(...e.moonColor);
    U.uFogColor.value.setRGB(...e.fog);
    U.uFogSunColor.value.setRGB(...e.fogSun);
    U.uFogDensity.value = e.fogDensity;
    U.uFogFalloff.value = e.fogFalloff;
    U.uFogBase.value = L.baseY ?? 0;
    U.uNight.value = e.night;
    U.uWet.value = L.wet;
    applySkyEnv(e);
    // Q5: the cloud slab for this cover and storm (heights, heaped vs flat, cirrus, scud) + the ground's bounce light
    const cp = cloudParams(e.cloud, e.storm);
    SKY_UNIFORMS.uCloudBase.value = cp.base; SKY_UNIFORMS.uCloudThick.value = cp.thick; SKY_UNIFORMS.uCumulus.value = cp.cumulus;
    SKY_UNIFORMS.uCirrus.value = cp.cirrus; SKY_UNIFORMS.uScud.value = cp.scud;
    SKY_UNIFORMS.uGndCol.value.setRGB(...e.gnd).multiplyScalar(Math.max(e.sunI, 0) * 0.25 + e.ambI * 2);
    SKY_UNIFORMS.uSunDisk.value = L.S.cast === 'smoke' ? 0.05 : 1;              // smoke: a dim red disc shows through
    const skyP = L.P && L.P.atmos && L.P.atmos.sky && !L.interior;
    if (skyP) { SKY_UNIFORMS.uSunDisk.value = 0; }                             // a look preset's painted sky: no sun disc
    // aerial perspective: through a little air the added light is the sky ~10 degrees up (distant land turns blue),
    // through a lot of it the pale horizon; only under an open sky, by day, out of fog, dust and ash
    U.uFogNear.value.setRGB(...e.zenith.map((z, i) => lerp(z, e.horizon[i], 0.47)));
    U.uFogBlue.value = LID.has(L.sky) ? 0 : 0.6 * (1 - e.night) * (1 - clamp(L.fog * 2.5)) * (1 - clamp(L.dust + L.ash));
    if (LID.has(L.sky)) {
      // a flat grey lid: the zenith sinks toward the cloud base, the sun disk hides
      const g = { storm: [0.06, 0.065, 0.075], storm_green: [0.035, 0.06, 0.045], smoke: [0.24, 0.065, 0.016] }[L.sky] || [0.3, 0.32, 0.35];
      SKY_UNIFORMS.uZenith.value.lerp(new THREE.Color(...g.map((v) => v * (1 - e.night * 0.85))), 0.75);
      SKY_UNIFORMS.uHorizon.value.lerp(new THREE.Color(...e.fog), 0.6);
      SKY_UNIFORMS.uSunI.value *= 0.15;
    }
    if (skyP) {                                       // the painted sky wins over the lid's grey (the key light keeps the sun)
      SKY_UNIFORMS.uZenith.value.setRGB(...L.P.atmos.sky); SKY_UNIFORMS.uHorizon.value.setRGB(...(L.P.atmos.skyHorizon || L.P.atmos.sky));
      SKY_UNIFORMS.uSunI.value = 0;
    }
  }

  // per scene: resolve, set uniforms and lights, bake the environment
  function apply(look, weather, o = {}) {
    const L = resolve(look, weather, o);
    L.P = o.preset || null;                                 // autostyle v2 look preset (null = documentary)
    L.baseY = o.baseY ?? 0;
    setUniforms(L.env, L);
    if (o.noClouds) SKY_UNIFORMS.uCloud.value = 0;          // space, the moon, Mars: no Earth clouds (and no cost)
    L.interior = !!o.interior;
    // E1 v2 night skies: a clear night has NO clouds (the Titanic's night: moonless, flat calm, brilliant stars) -- a
    // deep sky, a dense starfield and a faint glow along the horizon. Any cloud at night is dark, low-contrast, at most
    // faintly rimmed (sky.js uNightDim), never bright white lumps.
    const nightK = clamp((L.env.night - 0.5) / 0.4);
    if (nightK > 0 && L.sky === 'clear') { SKY_UNIFORMS.uCloud.value = 0; SKY_UNIFORMS.uCirrus.value = 0; }
    SKY_UNIFORMS.uNightDim.value = nightK;
    SKY_UNIFORMS.uStars.value = L.env.stars * (1 + (L.sky === 'clear' ? 0.9 : 0.3) * nightK);
    SKY_UNIFORMS.uMilky.value = 0.8 * (1 - 0.45 * nightK);
    SKY_UNIFORMS.uGlow.value.setRGB(0.010, 0.016, 0.030).multiplyScalar(nightK * (L.sky === 'clear' ? 1 : 0.5));
    // a space.starfield object under an Earth sky: add its stars to the painted sky instead of replacing it (it drew
    // opaque: it hid the horizon glow and the haze, and its Milky Way dust lane read as a dark smudge)
    if (!o.noClouds) scene.traverse((m) => {
      if (m.name !== 'nature.stars' || !m.material?.uniforms) return;
      const mat = m.material;
      if (!mat.userData.e1Add) { mat.userData.e1Add = true; mat.transparent = true; mat.blending = THREE.AdditiveBlending; mat.depthWrite = false; mat.needsUpdate = true; }
      if (mat.uniforms.uMilky) mat.uniforms.uMilky.value = Math.min(mat.uniforms.uMilky.value, 0.25);
      if (mat.uniforms.uBright) mat.uniforms.uBright.value = Math.min(mat.uniforms.uBright.value, 0.8);
    });
    // a cloudless sky skips the cloud pass entirely (a full-screen blended draw costs even when it discards)
    sky.userData.clouds.visible = envClouds.visible = SKY_UNIFORMS.uCloud.value > 0.01;
    const e = L.env;
    const nightKey = e.sunEl < -1.5;
    L.keyIsMoon = nightKey;
    const k = nightKey ? e.moonColor.map((v) => v * e.moonI * 1.5) : e.sunColor.map((v) => v * e.sunI);
    key.color.setRGB(...k); key.intensity = 1.05;
    L.keyDir = (nightKey ? e.moonDir : e.sunDir).clone();
    if (L.keyDir.y < 0.035) L.keyDir.y = 0.035;           // never light from below the horizon
    L.keyDir.normalize();
    key.castShadow = (nightKey ? e.moonI : e.sunI) > 0.05;
    key.shadow.radius = L.S.soft * (o.quality === 'draft' ? 0.7 : 1);
    if (L.P && L.P.shadow && L.P.shadow.soft != null) key.shadow.radius *= L.P.shadow.soft;   // a preset's hard (noir) or blobby (PS2) shadows
    hemi.color.setRGB(...e.amb); hemi.groundColor.setRGB(...e.gnd); hemi.intensity = e.ambI * 2.1 * (1 + e.night * 1.5);
    SKY_UNIFORMS.uSunSize.value = 1.2;
    // environment for metals and glass
    // (a look preset's painted sky: the image light is still baked from the real sky — a black void starves the fill)
    const RS = e.realSky && !o.interior ? e.realSky : null, S0 = RS ? { z: SKY_UNIFORMS.uZenith.value.clone(), h: SKY_UNIFORMS.uHorizon.value.clone(), sh: SKY_UNIFORMS.uSunHorizon.value.clone(), si: SKY_UNIFORMS.uSunI.value, d: SKY_UNIFORMS.uSunDisk.value } : null;
    if (RS) { SKY_UNIFORMS.uZenith.value.setRGB(...RS.zenith); SKY_UNIFORMS.uHorizon.value.setRGB(...RS.horizon); SKY_UNIFORMS.uSunHorizon.value.setRGB(...RS.sunHorizon); SKY_UNIFORMS.uSunI.value = Math.max(e.sunI, 0.0) + (e.sunEl > -4 ? 0.4 : 0); SKY_UNIFORMS.uSunDisk.value = 1; }
    const rt = pmrem.fromScene(envScene, 0, 0.1, 1000);
    if (S0) { SKY_UNIFORMS.uZenith.value.copy(S0.z); SKY_UNIFORMS.uHorizon.value.copy(S0.h); SKY_UNIFORMS.uSunHorizon.value.copy(S0.sh); SKY_UNIFORMS.uSunI.value = S0.si; SKY_UNIFORMS.uSunDisk.value = S0.d; }
    if (envRT) envRT.dispose();
    envRT = rt; scene.environment = rt.texture;
    // at night the sky is nearly black: lift the reflections so metals and lettering still read
    scene.environmentIntensity = (LID.has(L.sky) ? 0.8 : 1.0) * (1 + e.night * 3);
    if (o.interior) scene.environmentIntensity = 0.35 * (1 - 0.5 * e.night);   // E1 v2: a room is not lit by the (night) sky: no blue cast
    // E1 specificity: PITCH DARK (look.dark 'pitch', or a builder's res.pitchDark: a crawl tunnel): no sun / moon, no sky
    // fill, almost no image light. The only light is what the scene carries (a flashlight, a match, a muzzle flash)
    L.pitch = !!o.pitch;
    if (o.pitch) { key.intensity = 0; key.castShadow = false; hemi.intensity = 0.004; scene.environmentIntensity = 0.015; }
    // v3 (WP3) LOW KEY (look.dark 'low' | 0..1): the sky fill and image light drop, the key (sun / moon) stays: figures
    // read by their rim and their silhouette (fern's nights); never on a pitch-dark scene
    const lk = look.dark === 'low' ? 0.8 : (typeof look.dark === 'number' && look.dark > 0 && look.dark < 1 ? look.dark : 0);
    // (REVIEW_1 #11) the fill drops less on UP-facing surfaces than on the sides: the sky half of the hemisphere keeps
    // ~half (snow in moon shadow stays a soft blue, not a black cut-out), the ground half drops hard, so a vertical
    // figure gets the same darkness as before (0.52 x (0.5 + 0.125) = 0.33 vs 0.32)
    // At night the image light (env) is most of the fill: it drops to 0.44 (was 0.36) and the moon's shadow edges soften
    // (x 2 at 'low'), so shadows on snow read as soft navy shapes, not black jagged cut-outs
    if (lk > 0 && !o.pitch) { hemi.intensity *= 1 - 0.6 * lk; hemi.groundColor.multiplyScalar(1 - 0.94 * lk); scene.environmentIntensity *= 1 - 0.7 * lk; key.shadow.radius *= 1 + 1.25 * lk; L.lowKey = lk; }
    // v3 (WP3) stage.void: a black stage. Its builder tags its root (userData.v3void); while one is in the scene the sky
    // (stars, clouds, moon) is hidden and the height fog goes black; the next scene without one gets the sky back.
    let vd = null;
    scene.traverse((m) => {
      if (!vd && m.userData && m.userData.v3void) vd = m.userData.v3void;
      // v3: a light flagged userData.keepHue by any builder (WP2's archive.relief slit) keeps its colour through a mono
      // grade like a light.spot keep_hue (film.js registry; entries die with their scene)
      if (m.isLight && m.userData && m.userData.keepHue && !FILM_STATE.keeps.includes(m)) registerKeep(m);
    });
    if (vd) {
      sky.visible = false; voidHid = true; L.void = true;
      U.uFogDensity.value = vd.fog ?? 0; U.uFogColor.value.setRGB(0, 0, 0); U.uFogSunColor.value.setRGB(0, 0, 0);
      scene.environmentIntensity = Math.min(scene.environmentIntensity, vd.env ?? 0.015);
    } else if (voidHid) { sky.visible = true; voidHid = false; }
    FILM_STATE.exposure = Math.max(0.05, o.interior ? Math.min(L.env.exposure, 1.45) : L.env.exposure) * (LID.has(L.sky) ? 1.12 : 1);
    // v3 (WP3): a per-scene film seed (dust / hairs / scratches / grain / burn edge differ per shot; REVIEW_1 #10). From
    // the scene's look + camera azimuth + side, so a re-render of the same scene is identical. Read only by film frames.
    { const str = JSON.stringify(look || {}) + '|' + Math.round((o.viewAz ?? 0) * 10) + '|' + (o.side ?? 1) + '|' + Math.round((o.baseY ?? 0) * 100);
      let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      FILM_STATE.seed = h % 100003; }
    cur = L;
    return L;
  }

  function setShadowMap(size) { if (key.shadow.mapSize.x !== size) { key.shadow.mapSize.set(size, size); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } } }

  // a fixed shadow box per scene (no popping): centre + half-size in metres, snapped to shadow texels
  function setShadowBox(cx, cz, S, y) { Object.assign(shadowBox, { cx, cz, S, y }); }

  function frame(t) {
    if (!cur) return;
    U.uTime.value = t;
    SKY_UNIFORMS.uCloudShift.value.set(t * 0.004 + 0.31 + (cur.seedOff ?? 0), t * 0.0012 + 0.17);
    const { cx, cz, S, y } = shadowBox;
    const snap = (2 * S) / key.shadow.mapSize.x;
    key.target.position.set(Math.round(cx / snap) * snap, y, Math.round(cz / snap) * snap);
    key.position.copy(key.target.position).addScaledVector(cur.keyDir, 2000);
    const sc = key.shadow.camera;
    if (sc.right !== S || key.userData.mapFor !== key.shadow.mapSize.x) {
      // a tight depth range: the bias is a fraction of it, so a loose range detaches shadows from feet (peter-panning)
      const reach = S * 1.5 + 400;
      sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = Math.max(1, 2000 - reach); sc.far = 2000 + reach;
      sc.updateProjectionMatrix();
      key.shadow.bias = -0.03 / (sc.far - sc.near);
      key.shadow.normalBias = clamp(1.2 * (2 * S) / key.shadow.mapSize.x, 0.008, 0.12);
      key.userData.mapFor = key.shadow.mapSize.x;
    }
    key.target.updateMatrixWorld(); key.updateMatrixWorld();
  }

  // o.dark: a black-sky world (space, the moon, interiors on the moon ground) keeps its shadow detail like night
  function grade(spec = {}, o = {}) {
    const g = Object.assign({}, GRADE, GRADES[cur?.grade ?? 'neutral'] || {});
    g.exposure = (cur ? (cur.interior ? Math.min(cur.env.exposure, 1.45) : cur.env.exposure) : 1) * (spec.exposure ?? 1);   // E1 v2: an interior at night is exposed for its lamps, not for the moonlit sea
    if (cur && LID.has(cur.sky)) g.exposure *= 1.12;
    if (cur && cur.S.cast === 'smoke') { g.contrast -= 0.1; g.sat *= 1.06; g.lift = g.lift.map((v, i) => v + [0.012, 0.005, 0.0][i]); }
    if (cur && cur.env.night > 0.5) { g.bloom = 0.32; }
    g.toe = 1 - 0.7 * Math.max(cur ? cur.env.night : 0, o.dark ? 1 : 0);
    if (cur && cur.fog > 0.3) g.whiteCol = cur.env.fog.map((v) => Math.min(1, Math.pow(v * 1.6 + 0.25, 0.8)));
    if (cur && cur.P) presetGrade(g, cur.P, cur);           // the video's look preset rides on the scene's own grade
    if (spec.film && typeof spec.film === 'object') {        // v3 (WP3): look.film {grain_px, weave, flicker, halation, dirt, vig_pow, matte} over the preset's
      for (const [k, gk] of Object.entries(FILM_KEYS)) if (spec.film[k] != null && Number.isFinite(+spec.film[k])) g[gk] = +spec.film[k];
      if (spec.film.seed != null && Number.isFinite(+spec.film.seed)) g.filmSeed = +spec.film.seed;   // the same seed on both sides of a burn / leak cut
    }
    if (spec.keep_hue != null && spec.keep_hue !== false) g.keepHue = spec.keep_hue === true ? 'red' : spec.keep_hue;   // v3: look.keep_hue: a colour (or list) that survives a mono grade
    return g;
  }

  // E1 v2: practical lights (lamps, lanterns, fires: every point/spot light under the stage) never blow out a face.
  // Per sub-frame, after the items have moved: the irradiance a light puts on the nearest figure's head (three.js
  // punctual falloff) is capped so a white mannequin head stays readable at the scene's exposure; the pool of light on
  // the desk stays warm and bright. A builder that animates its light (flicker) sets a new base each frame.
  function governor(stage, S, specLook) {
    // E1 v2: no emissive surface in a room outshines a sane exposure: a panel (a face > 0.08 m2: a window, a fire
    // opening, a lampshade) at most 1.2 exposed, a bulb 5 (it may bloom a little)
    if (cur && cur.interior) {
      const ex0 = Math.max(0.05, grade(specLook || {}, {}).exposure), sz = new THREE.Vector3(), sc = new THREE.Vector3();
      for (const it of S.items || []) {
        if (!/^interior\./.test(it.kind || '')) continue;
        it.res.root.updateMatrixWorld(true);
        it.res.root.traverse((o) => {
          if (!o.isMesh || !o.geometry) return;
          for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
            if (!m || !m.emissive || !(m.emissiveIntensity > 0)) continue;
            const e = Math.max(m.emissive.r, m.emissive.g, m.emissive.b) * m.emissiveIntensity * ex0;
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            o.geometry.boundingBox.getSize(sz).multiply(o.getWorldScale(sc));
            const cap = Math.max(sz.x * sz.y, sz.y * sz.z, sz.x * sz.z) > 0.08 ? 1.2 : 5;
            if (e > cap) m.emissiveIntensity *= cap / e;
          }
        });
      }
    }
    const lights = [], heads = [];
    stage.traverse((o) => { if ((o.isPointLight || o.isSpotLight) && !o.userData.noGovern) lights.push({ L: o, base: o.intensity, set: null }); });
    for (const it of S.items || []) { const f = it.res && (it.res.fig || it.res.figure); if (f && f.rig && f.rig.B && f.rig.B.head) heads.push({ b: f.rig.B.head, g: f.group, who: `${it.section}:${it.ref || it.index}` }); }
    if (!lights.length || !heads.length) return null;
    const expo = Math.max(0.05, grade(specLook || {}, {}).exposure);
    const lim = 2.6 / expo;                     // lux-like irradiance at the head: 0.8 albedo -> ~0.66 exposed linear
    const lp = new THREE.Vector3(), hp = new THREE.Vector3(), tp = new THREE.Vector3(), sd = new THREE.Vector3();
    // a spot only lights what is inside its cone (three.js: smoothstep from the cone's edge to the penumbra's start)
    const coneAt = (L, cosA) => { if (!L.isSpotLight) return 1; const c0 = Math.cos(L.angle), c1 = Math.cos(L.angle * (1 - L.penumbra)); const x = Math.min(1, Math.max(0, (cosA - c0) / Math.max(1e-4, c1 - c0))); return x * x * (3 - 2 * x); };
    const falloff = (d, cut, dec) => { let f = 1 / Math.max(Math.pow(d, dec ?? 2), 0.01); if (cut > 0) { const x = Math.min(1, Math.max(0, 1 - Math.pow(d / cut, 4))); f *= x * x; } return f; };
    const state = { capped: 0, min_k: 1 };
    const run = () => {
      for (const r of lights) {
        const cur0 = r.L.intensity;
        if (r.set == null || Math.abs(cur0 - r.set) > 1e-7) r.base = cur0;
        if (!(r.base > 0)) continue;
        r.L.getWorldPosition(lp);
        if (r.L.isSpotLight) { r.L.target.getWorldPosition(tp); sd.copy(tp).sub(lp).normalize(); }
        let E = 0;
        for (const h of heads) {
          if (h.g && !h.g.visible) continue;
          h.b.getWorldPosition(hp); hp.y += 0.06;
          const d = Math.max(0.15, lp.distanceTo(hp));
          if (d > 6) continue;
          const cone = r.L.isSpotLight ? coneAt(r.L, sd.dot(tp.copy(hp).sub(lp).normalize())) : 1;
          E = Math.max(E, r.base * falloff(d, r.L.distance, r.L.decay) * cone);
        }
        const k = E > lim ? lim / E : 1;
        if (k < 1) { state.capped++; state.min_k = Math.min(state.min_k, k); }
        r.L.intensity = r.base * k; r.set = r.L.intensity;
      }
    };
    run.state = state; run.lights = lights.length; run.heads = heads.length; run.lim = lim;
    return run;
  }

  return { sky, key, hemi, apply, frame, grade, governor, setShadowBox, setShadowMap, get cur() { return cur; } };
}
