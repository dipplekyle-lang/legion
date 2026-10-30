// stage.js — Legion 3D v3, WP3: fern's black void stage and local fog (V3_SPEC 2.3).
//   stage.void   a black stage: no terrain, no sky, no ambient light (res.pitchDark: main.js skips the exposure floor
//                and the auto rim; look.js hides the sky while it is live). Optional gloss / matte floor that only
//                shows where a light falls, fern's dark floor glow fading up under the subject, haze for the beams,
//                and `rise`: figures come up out of the darkness (eased).
//   fog.volume   a local fog: box | sphere | ground layer, density, drifting noise, a faint self-glow; lit by any
//                light.spot beam passing through it (core/film.js volumetric pass), it hides what is behind it.
import * as THREE from 'three';
import { registerVolume, KEY_COLOURS } from '../../core/film.js';
import { clamp, smoother } from '../shared/util.js';
import { makePlume, makeSmokeBall } from '../fx/plume.js';

const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const colOf = (c, d) => { if (c == null) return new THREE.Color(d); if (typeof c === 'string' && KEY_COLOURS[c.toLowerCase()] != null) return new THREE.Color(KEY_COLOURS[c.toLowerCase()]); try { return new THREE.Color(c); } catch (e) { return new THREE.Color(d); } };
function radial(inner = 0) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, '#fff'); gr.addColorStop(Math.max(0.01, inner), '#fff'); gr.addColorStop(0.55, '#7a7a7a'); gr.addColorStop(0.8, '#262626'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; return t;
}
// the backdrop glow: a camera-facing soft disc (radial alpha) that fades to nothing toward the floor (uFloorY + uFade), so a
// gloss / matte floor never cuts it in a ruler-straight horizon line (REVIEW_1 #5). Log depth like every engine material.
const BACK_VS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying float vY;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
const BACK_FS = /* glsl */`
#include <logdepthbuf_pars_fragment>
uniform vec3 uCol; uniform float uOp; uniform float uFloorY; uniform float uFade; uniform sampler2D tA;
varying vec2 vUv; varying float vY;
void main(){
  #include <logdepthbuf_fragment>
  float a = texture2D(tA, vUv).g * smoothstep(uFloorY, uFloorY + uFade, vY);
  gl_FragColor = vec4(uCol * a * uOp, 1.0);
}`;
const keyEnv = (keys, t) => {             // [{t, i}] eased multipliers (as light.spot keys); null = 1
  if (!keys || !keys.length) return 1;
  let v = num(keys[0].i, 1);
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t) v = num(keys[i].i, 1) + (num(keys[i + 1].i, 1) - num(keys[i].i, 1)) * smoother((t - keys[i].t) / Math.max(0.05, keys[i + 1].t - keys[i].t));
  return Math.max(0, v);
};
const keyList = (k) => (Array.isArray(k) ? k.filter((q) => q && Number.isFinite(+q.t)).map((q) => ({ t: +q.t, i: num(q.i, 1) })).sort((a, b) => a.t - b.t) : null);
function itemOf(ctx, ref) {
  const B = ctx.S?.byRef || {};
  if (typeof ref !== 'string') return null;
  return B[ref] || B['ref:' + ref] || B['ref:' + ref.replace(/^ref:/, '')] || null;
}

export const CATALOG = {
  'stage.void': {
    desc: "FERN'S BLACK VOID STAGE: the subject alone on an empty black stage, lit only by a slit, a rim or a spot (light.spot / light.rig) - the antagonist portrait, a symbolic object, a line-up. No terrain, no sky, no ambient light. Optional floor that shows only where light falls (gloss reflects the lights), a dark floor glow that fades up under the subject, haze so the beams show, and figures that RISE out of the darkness. Put it in `objects`; add the lights; frame from 1.8-6 m.",
    params: { floor: 'none|gloss|matte (none)', floor_color: '#hex (near black)', haze: '0..1 air in the beams (0.5)',
      glow: "{color, r m, intensity, fade: [t0, dur], keys: [{t, i}], at: [x, z], backdrop: true, y} (or a LIST of them) a dark floor glow under the subject (fern: #0a1640 blue); backdrop: a soft disc standing behind the figures facing the lens (the haze dark silhouettes read against; with a floor it fades out toward the floor). keys: eased intensity multipliers - e.g. the haze at 0.25 from frame 1 (the officer's cap and shoulders read as a silhouette) rising to 1 on the beat. A small backdrop halo BETWEEN the hero and the figures behind hides them until their own light comes up",
      rise: "[{ref: 'ref:<castId>', t, dur, depth m}] figures come up from below the darkness, eased (floor none only; with a floor they fade up from darkness, no lift)", env: 'image light 0..0.05 (0.015)' },
    section: 'objects', fly: true, snap: false, contact: false, footprint: [0.5, 0.5], height: 0.1, tags: ['stage', 'void', 'black', 'darkness', 'studio', 'portrait', 'fern', 'v3'],
  },
  'fog.volume': {
    desc: 'A LOCAL FOG / SMOKE VOLUME: a box, a sphere or a low ground layer of drifting smoke - lit by any light.spot beam that passes through it (a beam turns solid in it) and hiding what is behind it. For the smoke floor of a void stage, haze in a room, valley fog. Put it in `objects`.',
    params: { shape: 'box|sphere|layer|plume (a rising lit smoke COLUMN from a fire / a burning ship / a chimney: h, r, spread, fire, drift = wind)', at: '[x, z]', y: 'm (box / sphere centre; layer base 0)', size: '[w, h, d] m (box)', r: 'm (sphere)', h: 'm (layer thickness 0.6)',
      density: '0..1 (0.4)', noise: '0..1 drifting smoke (0.6)', color: 'colour of its own glow', glow: '0..1 self-glow so it reads without a beam (0.05)',
      drift: '[vx, vy, vz] m/s the smoke drifts (wind; [0.12, 0.03, 0] = a slow lateral drift: a moving layer in a still shot)', scale: 'smoke detail 0.4..3 (0.8; higher = finer wisps)', fade: '[t0, dur] fade in', keys: '[{t, i}] eased density multipliers', spread: 'plume: top radius m (h x 0.3)', fire: 'plume: 0..1 flames + an orange glow at its base', lean: 'plume: [dx, dz] m the top is carried downwind (default from drift)' },
    section: 'objects', fly: true, snap: false, contact: false, footprint: [1, 1], height: 0.5, tags: ['fog', 'smoke', 'haze', 'mist', 'volume', 'atmosphere', 'v3'],
  },
};

export async function build(kind, item = {}, ctx = {}) {
  const root = new THREE.Group(); root.name = kind;
  if (kind === 'stage.void') {
    root.userData.v3void = { fog: 0, env: clamp(num(item.env, 0.015), 0, 0.08) };
    registerVolume({ kind: 'haze', obj: root, haze: clamp(num(item.haze, 0.5), 0, 2) });
    const fl = item.floor || 'none';
    if (fl === 'gloss' || fl === 'matte') {
      const m = ctx.patch(new THREE.MeshStandardMaterial({ color: colOf(item.floor_color, fl === 'gloss' ? 0x060607 : 0x0b0b0c), roughness: fl === 'gloss' ? 0.26 : 0.92, metalness: 0, envMapIntensity: 0.4 }));
      const f = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), m); f.name = 'void_floor'; f.receiveShadow = true; f.userData.ground = true; f.userData.noQA = true;
      f.position.y = 0.001; root.add(f);
    }
    const glows = [];
    const fl0 = fl === 'gloss' || fl === 'matte';
    for (const G0 of [].concat(item.glow || [])) {
      if (!G0) continue;
      const G = typeof G0 === 'object' ? G0 : { color: G0 };
      const r = num(G.r, 3.2), at = Array.isArray(G.at) ? G.at : (Array.isArray(item.at) ? item.at : [0, 0]);
      let glow, mat;
      if (G.backdrop) {
        // a backdrop glow: a soft disc standing behind the subject, always facing the lens (fern's dark blue haze behind
        // the assassins: a dark figure reads against it, S3 silhouettes). Never writes depth, never in the QA probe.
        mat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: colOf(G.color, 0x0A1640) }, uOp: { value: 1 }, uFloorY: { value: fl0 ? 0.0 : -1e4 }, uFade: { value: num(G.floor_fade, 0.9) }, tA: { value: radial(0.05) } },
          vertexShader: BACK_VS, fragmentShader: BACK_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        glow = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat); glow.name = 'void_glow_backdrop'; glow.userData.noQA = true; glow.renderOrder = 2;
        glow.position.set(+at[0], num(G.y, r * 0.45), +at[1]); root.add(glow);
        const cq = new THREE.Quaternion(), pq = new THREE.Quaternion(), g = glow;
        glow.onBeforeRender = (rd, sc, cam) => { cam.getWorldQuaternion(cq); g.parent.getWorldQuaternion(pq); g.quaternion.copy(pq.invert().multiply(cq)); g.updateMatrixWorld(); };
      } else {
        mat = new THREE.MeshBasicMaterial({ color: colOf(G.color, 0x0A1640), alphaMap: radial(0.05), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        glow = new THREE.Mesh(new THREE.CircleGeometry(r, 64).rotateX(-Math.PI / 2), mat); glow.name = 'void_glow'; glow.userData.noQA = true; glow.renderOrder = 3;
        glow.position.set(+at[0], 0.004, +at[1]); root.add(glow);
      }
      glows.push({ glow, mat, fade: Array.isArray(G.fade) ? G.fade : null, keys: keyList(G.keys), I: num(G.intensity, 1) });
    }
    const rises = (Array.isArray(item.rise) ? item.rise : []).filter((r) => r && r.ref);
    // a visible floor: a figure lowered by `rise` would stand IN the floor (H3). Then rise = fade from darkness only (the
    // figures' rig / spot fades carry it); the lift needs floor 'none' (REVIEW_1 #6)
    if (rises.length && fl0) ctx.warn(`stage.void: rise with floor '${fl}': no lift (the feet would sink into the floor); the figures come up from darkness by their light fades`);
    let hidden = false; const base = new Map();
    const update = (t = 0) => {
      if (!hidden && ctx.S && ctx.S.items) {
        // the world (terrain, sea, flora) and anything else that is not an item of this scene goes dark
        const roots = new Set(ctx.S.items.map((it) => it.res && it.res.root));
        roots.add(root);
        for (const c of ctx.scene.children) if (!roots.has(c) && c.name !== 'contacts') c.visible = false;
        hidden = true;
      }
      if (fl0 && !root.userData.floorY) {               // the floor's world height (the root sits on the ground)
        root.updateMatrixWorld(); const fy = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld).y + 0.001; root.userData.floorY = true;
        for (const G of glows) if (G.mat.isShaderMaterial) G.mat.uniforms.uFloorY.value = fy;
      }
      for (const G of glows) {
        const k = (G.fade ? smoother((t - G.fade[0]) / Math.max(0.05, G.fade[1])) : 1) * keyEnv(G.keys, t) * G.I;
        if (G.mat.isShaderMaterial) G.mat.uniforms.uOp.value = k; else G.mat.opacity = k;
        G.glow.visible = k > 0.002;
      }
      if (!fl0) for (const r of rises) {
        const it = itemOf(ctx, r.ref); if (!it) continue;
        const R = it.res.root;
        if (!base.has(R)) base.set(R, R.position.y);
        const k = smoother((t - num(r.t, 0)) / Math.max(0.1, num(r.dur, 1.2)));
        R.position.y = base.get(R) - num(r.depth, 0.6) * (1 - k);
      }
    };
    return { root, radius: 0.2, height: 0.1, update, contact: false, snapped: true, pitchDark: true, anchors: {} };
  }
  if (kind === 'fog.volume') {
    const shape = ['box', 'sphere', 'layer', 'plume'].includes(item.shape) ? item.shape : 'box';
    const at = Array.isArray(item.at) ? item.at : [0, 0];
    const gy = ctx.ground.height(+at[0], +at[at.length === 3 ? 2 : 1]);
    // smoke at outdoor scale is lit billows (lib/fx/plume.js), never a smooth raymarched ball: shape 'plume' = a rising,
    // widening, wind-sheared smoke column (fire: a burning base); a big dark sphere (r >= 5 m, glow <= 0.15) = a smoke
    // mass, so the director's stacked spheres merge into one torn column. Rooms / haze / glows keep the volume pass.
    const glow0 = clamp(num(item.glow, 0.05), 0, 2);
    if (shape === 'plume' || (shape === 'sphere' && num(item.r, 2) >= 5 && glow0 <= 0.15)) {
      const fade = Array.isArray(item.fade) ? item.fade : null, fk = keyList(item.keys);
      const dr = Array.isArray(item.drift) ? [0, 1, 2].map((i) => clamp(num(item.drift[i], 0), -12, 12)) : [0, 0, 0];
      const x0 = +at[0], z0 = +at[at.length === 3 ? 2 : 1];
      let fx;
      if (shape === 'plume') {
        const wl = ctx.waterLevel ?? ctx.world?.water?.level ?? ctx.water?.level;
        const by = (Number.isFinite(wl) ? Math.max(gy, wl) : gy) + num(item.y, 0);
        const H = num(item.h, 40);
        fx = makePlume(ctx, { h: H, r: num(item.r, Math.max(1.5, H * 0.07)), spread: num(item.spread, H * 0.3), wind: Array.isArray(item.wind) ? item.wind : [dr[0], dr[2]], lean: item.lean,
          rise: dr[1] > 0 ? dr[1] : undefined, color: item.color ?? '#2a2724', density: num(item.density, 0.6), fire: num(item.fire, 0), seed: num(item.seed, 7) + Math.round(x0 * 3.1 + z0 * 1.7),
          gy: Number.isFinite(wl) ? wl : gy, base: () => [x0, by, z0] });
      } else {
        const r = num(item.r, 8);
        fx = makeSmokeBall(ctx, { c: [x0, gy + num(item.y, r), z0], r, color: item.color ?? '#2a2724', density: num(item.density, 0.4), drift: dr, seed: 11 + Math.round(x0 * 1.3 + z0 * 0.7 + r) });
      }
      root.add(fx.root);
      const update = (t = 0, clock, camera) => {
        const k = (fade ? smoother((t - fade[0]) / Math.max(0.05, fade[1])) : 1) * keyEnv(fk, t);
        if (fx.setK) fx.setK(k);
        fx.root.visible = k > 0.002;
        fx.update(t, clock, camera);
      };
      return { root, radius: 0.2, height: 0.1, update, contact: false, snapped: true, anchors: {} };
    }
    const sz = Array.isArray(item.size) ? item.size.map(Number) : [4, 2, 4];
    const type = { box: 0, sphere: 1, layer: 2 }[shape];
    const c = [+at[0], gy + num(item.y, shape === 'layer' ? 0 : (shape === 'box' ? sz[1] / 2 : num(item.r, 2))), +at[at.length === 3 ? 2 : 1]];
    const h = shape === 'box' ? [sz[0] / 2, sz[1] / 2, sz[2] / 2] : shape === 'sphere' ? [num(item.r, 2), 0, 0] : [0, num(item.h, 0.6), 0];
    const dens = clamp(num(item.density, 0.4), 0, 3) * 1.2, noise = clamp(num(item.noise, 0.6), 0, 1);
    const col = colOf(item.color, 0x8A9AB8), glow = clamp(num(item.glow, 0.05), 0, 2);
    const fade = Array.isArray(item.fade) ? item.fade : null, fk = keyList(item.keys);
    const dr = Array.isArray(item.drift) ? [0, 1, 2].map((i) => clamp(num(item.drift[i], 0), -3, 3)) : [0, 0, 0], scl = clamp(num(item.scale, 0.8), 0.2, 4);
    let k = 1;
    registerVolume({ kind: 'fog', obj: root, state: () => ({ type, c, h, density: dens * k, noise, col: [col.r * glow * 0.4, col.g * glow * 0.4, col.b * glow * 0.4], drift: dr, scale: scl }) });
    const update = (t = 0) => { k = (fade ? smoother((t - fade[0]) / Math.max(0.05, fade[1])) : 1) * keyEnv(fk, t); };
    return { root, radius: 0.2, height: 0.1, update, contact: false, snapped: true, anchors: {} };
  }
  throw new Error('stage.js: unknown kind ' + kind);
}
