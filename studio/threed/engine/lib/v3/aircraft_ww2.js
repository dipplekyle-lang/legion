// aircraft_ww2.js — Legion 3D v3, WP4 (V3_SPEC 2.4): aircraft.halifax, the Handley Page Halifax Mk II (SOE 138 Sqn
// "special duties"), exterior hero + an enterable hold.
//   * exterior: a lofted fuselage on real stations (slab sides, deep nose, rising tail cone), NACA-section wings with
//     taper, a level centre section and 4.5 deg outer dihedral, rounded tips, four Merlin "power egg" nacelles (the
//     inner ones run past the trailing edge), 3-blade props with a blur disc when spinning (yellow tips), flame-damper
//     exhaust shrouds that glow dull orange at night, the twin square-ish (D-type) fins at the tailplane tips, glazed
//     nose, mid-upper and tail turrets with their guns, the stepped cockpit canopy, the aerial mast + wires to the fins.
//     Night finish in the shader (object space): matt black belly and sides, dark green / dark earth disruptive
//     pattern on the upper surfaces, panel seams that read in the moon's sheen, dull night roundels.
//   * interior: true: a hold between the main spar and the rear bulkhead: frames (ribs) and stringers on a thin inner
//     shell, a plank floor with the round "Joe hole" hatch (a short well through the belly, doors folded open), the
//     static-line cable along the roof (+ optional static lines to the seats), benches both sides with seat_N deck
//     points for aboard.js (cast: `on: "objects:N.seat_0"`, action sit, seat bench), the red/green jump light, a dim
//     amber bulb, moonlight shafting up through the hatch (a cool spot from below + a soft beam with dust motes) and
//     faint window glow. The hold's own surfaces never take the moon key (it has no shadow at altitude: it would light
//     the floor through the roof); while the camera is inside the hold the global key / sky / image light are dimmed
//     (spacefx overrideLights precedent), so figures aboard read as silhouettes against the hatch light.
//   * motion: `speed` m/s along `heading` or a smoothed `path` (coordinated bank from the curvature), `alt` m above the
//     ground at `at` (then held level; `y` = absolute), `keys` [{t, roll, pitch, yaw, dy}] eased additive attitude
//     (e.g. banked 12 deg levelling out), `life` 0..1 slow bob / roll. speed 0 = the airframe frame: keep it still and
//     give sky.cloud_layer a wind of -airspeed, then camera keys are metres around the aircraft (no slipping).
//   * the probe: res.solidAt(p, t, margin) is the hull (fuselage, wings, nacelles, props, tail, turrets), with the hold
//     and the hatch well hollow, so a camera may fly into the hold through the Joe hole and sit by the hatch.
// Model faces +Z (nose), +X = port, origin on the fuselage axis at the wing. Deterministic in t.
import * as THREE from 'three';
import { patchMaterial, U } from '../shared/env.js';
import { clamp, lerp, smooth, smoother, catmull } from '../shared/util.js';
import { smoothTrack } from '../human/motion.js';
import { baseLights, shelter, lensFogT } from './cloudsky.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;

export const CATALOG = {
  'aircraft.halifax': {
    desc: 'Handley Page Halifax Mk II four-engine RAF night bomber (SOE special duties, 1941-42): twin square fins, four Merlin nacelles with glowing flame-damper exhausts and spinning props, nose / mid-upper / tail turrets, matt black night finish; interior: true opens a hold with ribs, a plank floor, the floor "Joe hole" hatch, static-line cable, benches (seat_0..3 deck points), red/green jump light and moonlight up through the hatch. Anchors (target them as objects:N.<anchor>; a bare objects:N is measured from the ground under it): body, nose, cockpit, tail, wing_l (port), wing_r (starboard), engine_1..4 (port outer .. starboard outer), door, hatch_below; interior: hatch, hatch_edge (stand point at the forward rim, facing aft: hatch_sit), seat_0..3 (benches, 0/1 starboard, 2/3 port), hold, jump_light',
    actions: ['fly', 'hold'],
    params: {
      at: '[x, z]', heading: 'deg (0 = north)', speed: 'm/s (default 62; 0 = holds still: the airframe frame, give the cloud layer wind -airspeed)',
      path: '[[x, z], ...] smoothed, banks into turns', alt: 'm above the ground at `at` (default 900), then flown level', y: 'absolute world y (overrides alt)',
      keys: '[{t, roll deg (+ = starboard wing down), pitch deg (+ nose up), yaw deg, dy m}] eased attitude offsets, e.g. [{t:0, roll:12}, {t:1.4, roll:0}]',
      interior: 'true: the enterable hold (ribs, floor, Joe hole, benches, jump light)', hatch_open: 'true (default) | false | t: opens at t (0.8 s)',
      props: 'spin (default: blur discs) | still', exhaust: 'glow 0..1 (default 0.8 at night)', livery: 'night (default)',
      jump_light: '{red: t (default 0), green: t}: the jump light turns green at t', static_lines: '0..4 (the first N seats) | [seat indices]: static lines from the roof cable to the seats',
      hatch_light: '0..2 moonlight up through the hatch (default 1)', life: '0..1 slow bob / roll (default 1)',
    },
    footprint: [31.6, 21.4], height: 6.3, snap: false, fly: true, contact: false,
    tags: ['aircraft', 'bomber', 'halifax', 'lancaster', 'raf', '1940s', 'war', 'ww2', 'night', 'soe', 'paratroopers', 'four-engine'],
  },
};

// ── materials ───────────────────────────────────────────────────────────────────────────────────────────────────
const SKIN_GLSL = /* glsl */`
varying vec3 vHP; varying vec3 vHN;
float hfxRough;
float hfxH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hfxN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hfxH(i), hfxH(i + vec2(1.0, 0.0)), u.x), mix(hfxH(i + vec2(0.0, 1.0)), hfxH(i + vec2(1.0, 1.0)), u.x), u.y); }
float hfxSeam(float v, float w){ float d = abs(fract(v) - 0.5); float fw = fwidth(v) * 1.3 + w; return smoothstep(0.5 - fw, 0.5, d); }
float hfxRing(float d, float r){ float fw = fwidth(d) + 1e-4; return 1.0 - smoothstep(r - fw, r + fw, d); }
void hfxSkin(inout vec3 col){
  vec3 P = vHP, N = normalize(vHN);
  float camoK = 0.0;
#if HFX_MODE == 0
  float line = 0.84 + 0.07 * sin(P.z * 0.9 + 1.3) + 0.04 * sin(P.z * 2.3);
  camoK = smoothstep(line - 0.03, line + 0.03, P.y) * smoothstep(-0.05, 0.3, N.y);
#elif HFX_MODE == 1
  camoK = smoothstep(0.05, 0.3, N.y);
#elif HFX_MODE == 3
  camoK = smoothstep(0.4, 0.7, N.y);
#endif
  vec2 q = (abs(N.y) > 0.55 ? P.xz : P.zy) * 0.2;
  float pat = hfxN(q + 3.1) * 0.65 + hfxN(q * 2.3 + 7.7) * 0.35;
  // Dark Green / Dark Earth upper surfaces at their real albedo (linear ~0.06 / ~0.11): the old 0.04-0.07 read as black
  // from above in daylight; Bomber Command's matt black only on the belly and the sides
  vec3 camo = mix(vec3(0.055, 0.072, 0.034), vec3(0.118, 0.081, 0.041), smoothstep(0.46, 0.54, pat));
#ifdef HFX_DAY
  camo *= 1.3; vec3 blk = vec3(0.026, 0.027, 0.029);
#else
  vec3 blk = vec3(0.0105, 0.0115, 0.0135);
#endif
  vec3 base = mix(blk, camo, camoK);
  float seam, panel;
#if HFX_MODE == 1
  seam = max(hfxSeam(P.x / 1.24, 0.004), hfxSeam(P.z / 0.95, 0.003));
  panel = hfxH(floor(vec2(P.x / 1.24, P.z / 0.95)) + 0.5);
#else
  seam = max(hfxSeam(P.z / 0.62, 0.005), hfxSeam(P.y / 0.56, 0.003) * step(0.55, abs(N.x)));
  panel = hfxH(floor(vec2(P.z / 0.62, P.y / 0.56 + P.x)) + 0.5);
#endif
#if HFX_MODE == 2
  col = base * (1.0 - 0.12 * seam) * (0.96 + 0.08 * panel);        // the fins: faint seams (a moonlit fin read as a grille)
#else
  col = base * (1.0 - 0.3 * seam) * (0.9 + 0.2 * panel);
#endif
  hfxRough = 0.08 * seam + (panel - 0.5) * 0.1;
#if HFX_MODE == 0
  if (abs(N.x) > 0.55) {                                  // dull night roundel on the fuselage sides (A1, toned down)
    float d = length(vec2(P.y - 0.22, P.z + 3.75));
    vec3 r = col;
    r = mix(r, vec3(0.16, 0.12, 0.025), hfxRing(d, 0.9));
    r = mix(r, vec3(0.012, 0.02, 0.07), hfxRing(d, 0.77));
    r = mix(r, vec3(0.11, 0.11, 0.1), hfxRing(d, 0.47));
    r = mix(r, vec3(0.1, 0.008, 0.006), hfxRing(d, 0.29));
    col = r;
  }
#elif HFX_MODE == 1
  if (N.y > 0.2 && abs(P.x) > 8.5) {                     // Type B on the upper wings
    float d = length(vec2(abs(P.x) - 10.3, P.z - 0.05));
    col = mix(col, vec3(0.012, 0.02, 0.07), hfxRing(d, 1.1));
    col = mix(col, vec3(0.1, 0.008, 0.006), hfxRing(d, 0.45));
  }
#endif
}`;
function skinMat(mode, day = false) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.0, envMapIntensity: 0.55 });
  m.userData.progKey = 'hfx-skin-' + mode + (day ? '-day' : '');
  return patchMaterial(m, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHP; varying vec3 vHN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHP = position; vHN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n#define HFX_MODE ${mode}\n${day ? '#define HFX_DAY 1\n' : ''}${SKIN_GLSL}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nhfxSkin(diffuseColor.rgb);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + hfxRough, 0.05, 1.0);');
  });
}
// glazing: dark glass with its frame bars drawn in object space (0: a turret sphere around its own origin; 1: the
// cockpit canopy in aircraft space, metal fairing aft of z 4.55)
const GLASS_GLSL = /* glsl */`
varying vec3 vGP;
float hfxFrame;
float gSeam(float v, float w){ float d = abs(fract(v) - 0.5); float fw = fwidth(v) * 1.2 + w; return smoothstep(0.5 - fw, 0.5, d); }
void hfxGlass(inout vec3 col){
  vec3 P = vGP;
#if GLASS_MODE == 0
  float r = max(length(P), 1e-3);
  float az = atan(P.x, P.z), el = asin(clamp(P.y / r, -1.0, 1.0));
  hfxFrame = max(gSeam(az / 0.52, 0.03), gSeam(el / 0.36 + 0.5, 0.03));
  hfxFrame = max(hfxFrame, 1.0 - smoothstep(-0.55, -0.42, P.y / r));          // metal ring at the bottom
#elif GLASS_MODE == 2
  hfxFrame = max(gSeam(P.x / 0.2 + 0.5, 0.06), gSeam(P.y / 0.17 + 0.5, 0.06));
  hfxFrame = max(hfxFrame, max(smoothstep(0.36, 0.39, abs(P.x)), smoothstep(0.23, 0.26, abs(P.y))));      // the metal border
#else
  hfxFrame = max(gSeam(P.z / 0.44, 0.035), gSeam((P.y - 1.3) / 0.27, 0.03));
  hfxFrame = max(hfxFrame, gSeam(P.x / 0.5 + 0.5, 0.03));
  hfxFrame = max(hfxFrame, 1.0 - smoothstep(4.45, 4.62, P.z));
#endif
  col = mix(col, vec3(0.012, 0.013, 0.015), hfxFrame);
}`;
function glassMat(mode) {
  const m = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.06, metalness: 0.0, envMapIntensity: 1.6 });
  m.userData.progKey = 'hfx-glass-' + mode;
  return patchMaterial(m, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n#define GLASS_MODE ${mode}\n${GLASS_GLSL}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nhfxGlass(diffuseColor.rgb);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.62, hfxFrame);');
  });
}
// the hold: its surfaces never take the moon key / sky fill (no shadows up here: the roof would not stop them). The
// lights below the floor (moonlight up through the Joe hole) reach a surface above the floor only through the hole: an
// analytic floor shadow (the segment light -> surface must cross the floor plane inside the hatch radius), so the hole is
// the aperture (bench legs and frames lit through the planks read as leaks)
const HOLD_GLSL = /* glsl */`
uniform mat4 uV2H;
float hfxFloorPass(vec3 Lv, vec3 Pv){
  vec3 L = (uV2H * vec4(Lv, 1.0)).xyz, P = (uV2H * vec4(Pv, 1.0)).xyz;
  if (L.y >= HFX_FLOOR || P.y <= HFX_FLOOR + 0.005) return 1.0;
  float s = (HFX_FLOOR - L.y) / max(P.y - L.y, 1e-4);
  vec2 X = mix(L.xz, P.xz, s);
  return 1.0 - smoothstep(HFX_HR - 0.05, HFX_HR + 0.05, length(X - vec2(HFX_HX, HFX_HZ)));
}`;
function holdMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0x5b6152, roughness: o.roughness ?? 0.78, metalness: o.metalness ?? 0.05, envMapIntensity: 0.03, map: o.map || null, side: o.side ?? THREE.FrontSide, vertexColors: !!o.vertexColors, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1 });
  m.userData.progKey = 'hfx-hold2';
  const HU = o.HU;
  return patchMaterial(m, (sh) => {
    let lf = THREE.ShaderChunk.lights_fragment_begin
      .replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= 0.0;')
      .replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );', 'irradiance += 0.04 * getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );');
    if (HU) {
      lf = lf.replace('getPointLightInfo( pointLight, geometryPosition, directLight );', 'getPointLightInfo( pointLight, geometryPosition, directLight ); directLight.color *= hfxFloorPass( pointLight.position, geometryPosition );')
        .replace('getSpotLightInfo( spotLight, geometryPosition, directLight );', 'getSpotLightInfo( spotLight, geometryPosition, directLight ); directLight.color *= hfxFloorPass( spotLight.position, geometryPosition );');
      sh.uniforms.uV2H = HU.uV2H;
      const f = (v) => Number(v).toFixed(4);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n#define HFX_FLOOR ${f(HOLD.floor)}\n#define HFX_HR ${f(HOLD.hr)}\n#define HFX_HX ${f(HOLD.hatch[0])}\n#define HFX_HZ ${f(HOLD.hatch[1])}\n${HOLD_GLSL}`);
    }
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', lf);
  });
}
const plainMat = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; return t;
}
let TEX = null;
function textures() {
  if (TEX) return TEX;
  // prop blur disc (alpha): a faint dark blur (fern's props are near-invisible): denser at the roots, three smeared
  // blade sectors (the disc turns slowly), no tip ring (it read as a soap-bubble hoop), a soft outer fade
  const disc = canvasTex(256, 256, (g, w, h) => {
    const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + 0.5) / w * 2 - 1, dy = (y + 0.5) / h * 2 - 1, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      let v = 0;
      if (r < 1 && r > 0.2) {
        const sec = Math.pow(0.5 + 0.5 * Math.cos(3 * a + r * 2.2), 2.2);
        v = (0.24 - 0.13 * r) * (0.45 + 0.55 * sec) * smooth((r - 0.2) / 0.1);
        v *= 1 - smooth((r - 0.84) / 0.16);
      }
      const k = (y * w + x) * 4, c8 = Math.round(clamp(v) * 255);
      im.data[k] = im.data[k + 1] = im.data[k + 2] = c8; im.data[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }, false);
  const glow = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
  const planks = canvasTex(256, 512, (g, w, h) => {
    let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 8; i++) { const v = 52 + R() * 18; g.fillStyle = `rgb(${v + 14},${v},${v - 14})`; g.fillRect(i * 32, 0, 32, h); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(i * 32, 0, 2, h); }
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(0,0,0,${R() * 0.12})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 6 + R() * 30); }
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = 'rgba(20,18,16,0.8)'; g.beginPath(); g.arc(i * 32 + 6, j * 128 + 20, 1.6, 0, TAU); g.fill(); g.beginPath(); g.arc(i * 32 + 26, j * 128 + 20, 1.6, 0, TAU); g.fill(); }
  });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  return (TEX = { disc, glow, planks });
}

// ── geometry helpers ─────────────────────────────────────────────────────────────────────────────────────────────
const sp = (c, n) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
// rings: [[ [x,y,z] x (NS + 1) ] ...] (the last point repeats the first when closed). skip(i, j, c) drops a quad.
function ringsGeo(rings, o = {}) {
  const nr = rings.length, ns = rings[0].length, pos = [], idx = [];
  for (const r of rings) for (const p of r) pos.push(p[0], p[1], p[2]);
  for (let i = 0; i < nr - 1; i++) for (let j = 0; j < ns - 1; j++) {
    const a = i * ns + j, b = (i + 1) * ns + j;
    if (o.skip) { const p1 = rings[i][j], p2 = rings[i + 1][j + 1]; if (o.skip(i, j, [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2])) continue; }
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  // the sides first: outward (or inward) by their signed volume about the centroid
  {
    let cx = 0, cy = 0, cz = 0; const np = pos.length / 3;
    for (let i = 0; i < np; i++) { cx += pos[i * 3] / np; cy += pos[i * 3 + 1] / np; cz += pos[i * 3 + 2] / np; }
    let vol = 0;
    for (let k = 0; k < idx.length; k += 3) {
      const A = idx[k] * 3, B = idx[k + 1] * 3, C = idx[k + 2] * 3;
      const ax = pos[A] - cx, ay = pos[A + 1] - cy, az = pos[A + 2] - cz, bx = pos[B] - cx, by = pos[B + 1] - cy, bz = pos[B + 2] - cz, qx = pos[C] - cx, qy = pos[C + 1] - cy, qz = pos[C + 2] - cz;
      vol += ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx);
    }
    if ((vol < 0) !== !!o.inward) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
  }
  // the caps: a fan to the ring's centroid on its OWN copy of the ring (shared rim vertices averaged the cap's normal with
  // the sides'), wound to face away from the neighbouring ring (the old fixed winding faced INTO the loft: every nacelle's
  // front was see-through, a white crescent of sky round each spinner)
  const cap = (ri) => {
    const r = rings[ri], adj = rings[ri === 0 ? 1 : nr - 2], m = ns - 1, c = [0, 0, 0], ca = [0, 0, 0];
    for (let j = 0; j < m; j++) for (let e = 0; e < 3; e++) { c[e] += r[j][e] / m; ca[e] += adj[j][e] / m; }
    let n0 = 0, n1 = 0, n2 = 0;                       // Newell: the ring polygon's normal in its point order
    for (let j = 0; j < m; j++) { const P = r[j], Q = r[(j + 1) % m]; n0 += (P[1] - Q[1]) * (P[2] + Q[2]); n1 += (P[2] - Q[2]) * (P[0] + Q[0]); n2 += (P[0] - Q[0]) * (P[1] + Q[1]); }
    const fwd = (n0 * (c[0] - ca[0]) + n1 * (c[1] - ca[1]) + n2 * (c[2] - ca[2]) > 0) !== !!o.inward;
    const ci = pos.length / 3; pos.push(...c);
    const r0 = pos.length / 3; for (const p of r) pos.push(p[0], p[1], p[2]);
    for (let j = 0; j < ns - 1; j++) { const a = r0 + j; if (fwd) idx.push(ci, a, a + 1); else idx.push(ci, a + 1, a); }
  };
  if (o.capStart) cap(0);
  if (o.capEnd) cap(nr - 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  if (o.seam !== false && ns > 2) {            // the closed ring's seam: one normal for the duplicated points
    const N = g.attributes.normal;
    for (let i = 0; i < nr; i++) {
      const a = i * ns, b = i * ns + ns - 1;
      const P0 = rings[i][0], P1 = rings[i][ns - 1];
      if (Math.hypot(P0[0] - P1[0], P0[1] - P1[1], P0[2] - P1[2]) > 1e-5) continue;
      const nx = N.getX(a) + N.getX(b), ny = N.getY(a) + N.getY(b), nz = N.getZ(a) + N.getZ(b), l = Math.hypot(nx, ny, nz) || 1;
      N.setXYZ(a, nx / l, ny / l, nz / l); N.setXYZ(b, nx / l, ny / l, nz / l);
    }
  }
  return g;
}
// outward faces for a (roughly) convex loft: the signed volume about the centroid; inward: the other way
function orient(g, inward) {
  const P = g.attributes.position, I = g.index.array, c = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { c.x += P.getX(i); c.y += P.getY(i); c.z += P.getZ(i); }
  c.divideScalar(P.count);
  let vol = 0;
  for (let i = 0; i < I.length; i += 3) {
    a.fromBufferAttribute(P, I[i]).sub(c); b.fromBufferAttribute(P, I[i + 1]).sub(c); d.fromBufferAttribute(P, I[i + 2]).sub(c);
    vol += a.dot(b.cross(d));
  }
  if ((vol < 0) !== !!inward) for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
}
function mirrorX(g) {
  const out = g.clone(); out.scale(-1, 1, 1);
  const ix = out.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  out.computeVertexNormals(); return out;
}
// NACA 4-digit loop: upper surface TE -> LE, lower LE -> TE; [u (0 LE .. 1 TE), v] in chords
function airfoil(n, t, m = 0, p = 0.4) {
  const yt = (x) => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const yc = (x) => (m ? (x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x)) : 0);
  const pts = [];
  for (let i = 0; i < n; i++) { const x = 0.5 * (1 + Math.cos(Math.PI * i / n)); pts.push([x, yc(x) + yt(x)]); }
  for (let i = 0; i < n; i++) { const x = 0.5 * (1 - Math.cos(Math.PI * i / n)); pts.push([x, yc(x) - yt(x)]); }
  pts.push(pts[0].slice());
  return pts;
}

// ── the Halifax's shape (metres; +Z nose, +X port) ───────────────────────────────────────────────────────────────
// fuselage stations [z, top, bottom, half width, superellipse n]
// (fix round 1: a deeper, blunter nose under the turret and a straighter top line to the tail: the Mk II's slab-sided
// box, not a blimp)
const FUS = [
  [9.05, 0.40, -0.22, 0.16, 2.2], [8.85, 0.70, -0.74, 0.58, 2.4], [8.40, 0.95, -1.08, 0.84, 2.8], [7.40, 1.14, -1.30, 0.95, 3.2],
  [6.30, 1.29, -1.39, 0.99, 3.5], [4.80, 1.36, -1.42, 1.01, 3.7], [2.00, 1.38, -1.43, 1.01, 3.8], [-1.00, 1.38, -1.43, 1.01, 3.8],
  [-4.00, 1.37, -1.38, 0.99, 3.6], [-6.00, 1.35, -1.25, 0.92, 3.4], [-8.00, 1.31, -1.05, 0.80, 3.1], [-10.00, 1.24, -0.74, 0.62, 2.8],
  [-11.30, 1.16, -0.42, 0.48, 2.5], [-12.05, 1.09, -0.16, 0.37, 2.3],
];
const Z_NOSE = 9.05, Z_TAIL = -12.05;
const FT = (() => {     // dense lookup by z (Catmull-Rom through the stations)
  const S = [];
  for (let i = 0; i <= 900; i++) S.push(catmull(FUS, i / 900));
  S.sort((a, b) => a[0] - b[0]);
  return S;
})();
function F(z) {
  const S = FT;
  if (z <= S[0][0]) return { top: S[0][1], bot: S[0][2], hw: S[0][3], n: S[0][4] };
  if (z >= S[S.length - 1][0]) { const q = S[S.length - 1]; return { top: q[1], bot: q[2], hw: q[3], n: q[4] }; }
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m][0] <= z) lo = m; else hi = m; }
  const a = S[lo], b = S[hi], u = (z - a[0]) / Math.max(1e-9, b[0] - a[0]);
  return { top: lerp(a[1], b[1], u), bot: lerp(a[2], b[2], u), hw: lerp(a[3], b[3], u), n: lerp(a[4], b[4], u) };
}
// the section's point at angle a (0 = port side, pi/2 = top): flatter belly, rounder spine
function secPt(f, a, inset = 0) {
  const c = Math.cos(a), s = Math.sin(a), n = s >= 0 ? Math.max(2, f.n - 0.4) : f.n + 0.8;
  const hw = Math.max(0.005, f.hw - inset), yc = (f.top + f.bot) / 2, hh = Math.max(0.005, (f.top - f.bot) / 2 - inset);
  return [hw * sp(c, n), yc + hh * sp(s, n)];
}
// the half width of the section at height y (the wall), and where the floor meets it
function wallX(f, y, inset = 0) {
  const yc = (f.top + f.bot) / 2, hh = (f.top - f.bot) / 2 - inset, hw = f.hw - inset;
  const s = clamp((y - yc) / Math.max(hh, 1e-3), -0.9999, 0.9999), n = s >= 0 ? Math.max(2, f.n - 0.4) : f.n + 0.8;
  return hw * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), n)), 1 / n);
}
// wing planform by semi-span s (m from the centreline)
const WING_Y0 = -0.42, DIH = Math.tan(4.5 * DEG), S_TIP = 15.86;
function wingAt(s) {
  let le, c, t;
  if (s <= 5.6) { le = 1.55 - 0.02 * s; c = 5.35 - 0.0625 * s; t = lerp(0.18, 0.16, s / 5.6); }
  else if (s <= 15.0) { const u = (s - 5.6) / 9.4; le = lerp(1.438, 0.448, u); c = lerp(5.0, 2.1, u); t = lerp(0.16, 0.115, u); }
  else { const zm = 0.448 - 1.05, k = Math.sqrt(Math.max(0.0, 1 - ((s - 15.0) / 0.88) ** 2)); c = Math.max(0.05, 2.1 * k); le = zm + c / 2; t = 0.11; }
  const y = WING_Y0 + Math.max(0, s - 5.6) * DIH;
  return { le, c, t, y };
}
// nacelles: [x, front z (cowling ring), back z, centre y]; prop disc 0.62 m ahead of the ring
const NAC = [[8.2, 3.42, -2.45, -0.17], [3.9, 3.72, -4.65, -0.37], [-3.9, 3.72, -4.65, -0.37], [-8.2, 3.42, -2.45, -0.17]];
const NAC_PROF = [[0, 0.46, 0.5, 0], [0.05, 0.56, 0.64, -0.06], [0.18, 0.6, 0.74, -0.12], [0.36, 0.58, 0.72, -0.1], [0.58, 0.52, 0.62, -0.05], [0.84, 0.36, 0.4, 0.0], [1, 0.07, 0.07, 0.04]];
const TP_Y = 0.8, FIN_X = 4.78, FIN_Z = -9.85, FIN_C = 2.45, FIN_Y0 = -0.55, FIN_Y1 = 3.35;     // taller, thinner D fins (6 %)
function tailAt(s) { const u = clamp(s / FIN_X); return { le: lerp(-9.5, -9.92, u), c: lerp(2.75, 1.95, u) }; }
function finAt(y) {     // rounded-rectangle D fin: chord shrinks into the top / bottom corners
  const rc = 0.6, d = Math.min(y - FIN_Y0, FIN_Y1 - y), k = d < rc ? rc - Math.sqrt(Math.max(0, rc * rc - (rc - d) ** 2)) : 0;
  const le = FIN_Z - 0.035 * (y - FIN_Y0) - k * 0.85, c = Math.max(0.06, FIN_C - k * 1.7);
  return { le, c };
}
// hold layout
const HOLD = { zF: 1.25, zR: -8.4, floor: -0.95, hatch: [0, -5.6], hr: 0.5, inset: 0.04 };

// ── builders ─────────────────────────────────────────────────────────────────────────────────────────────────────
function fuselageGeo(o = {}) {
  const NS = o.ns ?? 56, zs = [];
  const z0 = o.z0 ?? Z_NOSE, z1 = o.z1 ?? Z_TAIL, n = o.nr ?? 120;
  for (let i = 0; i <= n; i++) { const u = i / n, w = u - 0.1 * Math.sin(TAU * u) / TAU; zs.push(lerp(z0, z1, w)); }
  const rings = zs.map((z) => { const f = F(z), r = []; for (let j = 0; j <= NS; j++) { const a = -Math.PI / 2 + j / NS * TAU, q = secPt(f, a, o.inset || 0); r.push([q[0], q[1], z]); } return r; });
  let skip = null;
  if (o.hatch) { const [hx, hz] = HOLD.hatch, R = HOLD.hr + 0.07; skip = (i, j, c) => c[1] < HOLD.floor && Math.hypot(c[0] - hx, c[2] - hz) < R; }
  return ringsGeo(rings, { skip, capStart: o.capStart, capEnd: o.capEnd, inward: !!o.inward });
}
function wingGeo(stations, at, o = {}) {     // stations: semi-span values; at(s) -> {le, c, t, y}; span along +X
  const foil = airfoil(o.n ?? 22, 1, o.m ?? 0.02);
  const rings = stations.map((s) => { const w = at(s); return foil.map(([u, v]) => [s, w.y + v * w.c * (w.t ?? o.t ?? 0.1), w.le - u * w.c]); });
  return ringsGeo(rings, { capEnd: true, seam: false });
}
function finGeo(x) {
  const foil = airfoil(18, 0.06, 0), ys = [];
  for (let i = 0; i <= 26; i++) { const u = i / 26; ys.push(lerp(FIN_Y0, FIN_Y1, 0.5 - 0.5 * Math.cos(Math.PI * u))); }
  const rings = ys.map((y) => { const f = finAt(y); return foil.map(([u, v]) => [x + v * f.c, y, f.le - u * f.c]); });
  return ringsGeo(rings, { capStart: true, capEnd: true, seam: false });
}
function nacelleGeo(nx, zf, zb, cy, ns = 32) {
  const L = zf - zb, rings = [];
  const prof = (f) => { let i = 0; while (i < NAC_PROF.length - 2 && f > NAC_PROF[i + 1][0]) i++; const a = NAC_PROF[i], b = NAC_PROF[i + 1], u = smooth((f - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; };
  for (let i = 0; i <= 30; i++) {
    const f = i / 30, [hw, hh, yo] = prof(f), r = [], z = zf - f * L;
    for (let j = 0; j <= ns; j++) { const a = -Math.PI / 2 + j / ns * TAU; r.push([nx + hw * sp(Math.cos(a), 2.4), cy + yo + hh * sp(Math.sin(a), 2.4), z]); }
    rings.push(r);
  }
  return ringsGeo(rings, { capStart: true });
}
function bladeGeo(R) {     // one blade along +Y: twisted, tapered, black with a yellow tip (vertex colours)
  const pos = [], col = [], idx = [], N = 14;
  for (let i = 0; i <= N; i++) {
    const r = lerp(0.32, R, i / N), u = (r - 0.32) / (R - 0.32);
    const c = (0.24 + 0.1 * Math.sin(Math.PI * Math.min(1, u * 1.25))) * (u > 0.9 ? Math.sqrt(Math.max(0.05, 1 - ((u - 0.9) / 0.1) ** 2)) : 1);
    const th = 0.05 * (1 - 0.6 * u), beta = lerp(48, 16, u) * DEG;
    const cd = [Math.cos(beta), 0, -Math.sin(beta)], td = [Math.sin(beta), 0, Math.cos(beta)];
    const P = [[0.38 * c, 0], [0, 0.5 * th], [-0.62 * c, 0], [0, -0.5 * th]];
    const yellow = r > R - 0.16;
    for (const [a, b] of P) { pos.push(cd[0] * a + td[0] * b, r, cd[2] * a + td[2] * b); col.push(...(yellow ? [0.75, 0.55, 0.04] : [0.012, 0.012, 0.012])); }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  orient(g); g.computeVertexNormals(); return g;
}
function addMesh(parent, geo, mat, name) { const m = new THREE.Mesh(geo, mat); if (name) m.name = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function rod(a, b, r, mat, parent, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg, 1), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  parent.add(m); return m;
}

function buildExterior(body, M, T, o) {
  const draft = o.draft;
  // fuselage
  addMesh(body, fuselageGeo({ ns: draft ? 40 : 60, nr: draft ? 80 : 130, hatch: o.interior, capEnd: true }), M.fus, 'halifax.fuselage');
  // wings
  const ws = [1.0, 1.6, 2.6, 3.4, 4.4, 5.0, 5.6, 6.6, 7.6, 8.8, 10.2, 11.6, 13.0, 14.2, 14.8, 15.2, 15.5, 15.7, 15.82];
  const wg = wingGeo(ws, wingAt, { n: draft ? 16 : 24 });
  addMesh(body, wg, M.wing, 'halifax.wing_l'); addMesh(body, mirrorX(wg), M.wing, 'halifax.wing_r');
  // tailplane + fins
  const tg = wingGeo([0.3, 1.2, 2.4, 3.6, 4.5, 4.95, 5.12], (s) => { const a = tailAt(Math.min(s, FIN_X)); const k = s > FIN_X ? Math.sqrt(Math.max(0.05, 1 - ((s - FIN_X) / 0.36) ** 2)) : 1; return { le: a.le - (1 - k) * a.c * 0.5, c: a.c * k, t: 0.1, y: TP_Y }; }, { m: 0, n: draft ? 12 : 18 });
  addMesh(body, tg, M.wing, 'halifax.tailplane_l'); addMesh(body, mirrorX(tg), M.wing, 'halifax.tailplane_r');
  for (const s of [1, -1]) addMesh(body, finGeo(s * FIN_X), M.fin, 'halifax.fin');
  // nacelles, exhausts, props
  const props = [], glows = [];
  NAC.forEach(([nx, zf, zb, cy], k) => {
    addMesh(body, nacelleGeo(nx, zf, zb, cy, draft ? 24 : 36), M.nac, 'halifax.nacelle');
    // chin radiator intake (dark)
    const rad = addMesh(body, new THREE.SphereGeometry(1, 16, 8), M.black, 'halifax.radiator'); rad.scale.set(0.34, 0.15, 0.5); rad.position.set(nx, cy - 0.74, zf - 0.75);
    // flame-damper shrouds both sides + their glow
    for (const sd of [1, -1]) {
      const x = nx + sd * 0.6, y = cy + 0.08;
      rod([x, y, zf - 0.3], [x, y, zf - 2.15], 0.075, M.metal, body, 10).name = 'halifax.damper';
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 1.15), M.ember.clone()); slit.position.set(x + sd * 0.03, y - 0.065, zf - 1.55); body.add(slit);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xff6a24, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
      spr.scale.set(0.9, 0.9, 1); spr.position.set(x + sd * 0.06, y - 0.06, zf - 2.05); spr.userData.noQA = true; spr.renderOrder = 3; body.add(spr);
      glows.push({ slit, spr, ph: k * 1.7 + sd });
    }
    // prop
    const pg = new THREE.Group(); pg.position.set(nx, cy, zf + 0.06); body.add(pg);
    const spn = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; spn.push(new THREE.Vector2(0.42 * Math.pow(Math.max(0, 1 - u * u), 0.55) + 0.001, u * 0.82)); }
    const sg = new THREE.LatheGeometry(spn, 20); sg.rotateX(Math.PI / 2);
    addMesh(pg, sg, M.spinner, 'halifax.spinner');
    const blades = new THREE.Group(); pg.add(blades);
    const bg = bladeGeo(1.9);
    for (let b = 0; b < 3; b++) { const m = addMesh(blades, bg, M.blade); m.rotation.z = b * TAU / 3; m.position.z = 0.18; }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.94, 64), M.disc); disc.name = 'halifax.prop_disc'; disc.position.z = 0.2; disc.renderOrder = 2; disc.castShadow = false; disc.userData.noQA = true; pg.add(disc);
    props.push({ pg, blades, disc, dir: k < 2 ? 1 : -1, ph: k * 0.9 });
  });
  // turrets: nose (2 guns), mid-upper (2), tail (4)
  const turret = (r, x, y, z, guns, gunDir, upper) => {
    const g = new THREE.Group(); g.position.set(x, y, z); body.add(g);
    const geo = upper ? new THREE.SphereGeometry(r, 28, 14, 0, TAU, 0, Math.PI * 0.55) : new THREE.SphereGeometry(r, 28, 18);
    addMesh(g, geo, M.glassT, 'halifax.turret');
    for (const [gx, gy] of guns) rod([gx, gy, 0], [gx + gunDir[0] * 0.95, gy + gunDir[1] * 0.95, gunDir[2] * 0.95 + Math.sign(gunDir[2]) * r * 0.5], 0.022, M.metal, g, 6);
    return g;
  };
  turret(0.6, 0, 0.3, 8.92, [[0.12, 0.1], [-0.12, 0.1]], [0, -0.05, 1], false);            // the nose turret dome stands proud of the nose
  const dorsal = turret(0.56, 0, 1.33, -3.45, [[0.1, 0.25], [-0.1, 0.25]], [0, 0.06, -1], true);
  addMesh(dorsal, new THREE.CylinderGeometry(0.66, 0.7, 0.16, 28), M.fus).position.y = 0.0;
  turret(0.63, 0, 0.5, -12.38, [[0.13, 0.36], [-0.13, 0.36], [0.13, 0.5], [-0.13, 0.5]].map(([a, b]) => [a, b - 0.42]), [0, 0, -1], false);
  // bomb-aimer's position under the nose turret: a small chin blister + the framed, forward-down facing optical panel
  const chin = addMesh(body, new THREE.SphereGeometry(1, 24, 14), M.glassT); chin.scale.set(0.5, 0.34, 0.55); chin.position.set(0, -0.48, 8.42);
  const pan = addMesh(body, new THREE.BoxGeometry(0.78, 0.52, 0.04), M.glassP, 'halifax.bombaimer'); pan.position.set(0, -0.5, 8.93); pan.rotation.x = 0.7;
  // cockpit canopy: a glazed hood on the spine, faired into metal aft
  const cz = [6.95, 6.7, 6.4, 6.1, 5.7, 5.2, 4.7, 4.4, 4.1, 3.85, 3.6];
  const ch = (z) => (z > 6.1 ? 0.66 * smooth((6.95 - z) / 0.85) : z > 4.55 ? 0.66 : 0.66 * smooth((z - 3.55) / 1.0));
  const cw = (z) => 0.6 * (z > 6.1 ? lerp(0.62, 1, smooth((6.95 - z) / 0.85)) : 1);
  const crings = cz.map((z) => { const f = F(z), r = []; for (let j = 0; j <= 20; j++) { const a = j / 20 * Math.PI, base = f.top - 0.1; r.push([cw(z) * sp(Math.cos(a), 2.6), base + (ch(z) + 0.1) * sp(Math.sin(a), 2.6), z]); } return r; });
  addMesh(body, ringsGeo(crings, { seam: false }), M.glassC, 'halifax.canopy');
  // aerial mast + wires to the fin tops
  rod([0, 1.36, 3.3], [0, 2.05, 3.05], 0.025, M.metal, body, 6);
  for (const s of [1, -1]) rod([0, 2.04, 3.05], [s * FIN_X, FIN_Y1 - 0.08, FIN_Z - 1.0], 0.009, M.metal, body, 4);
  return { props, glows };
}

function buildInterior(body, M, T, o) {
  const I = new THREE.Group(); I.name = 'interior.halifax_hold'; body.add(I);
  const { zF, zR, floor, hatch, hr, inset } = HOLD, draft = o.draft;
  // inner shell (faces in), the hatch cut through it
  addMesh(I, fuselageGeo({ ns: draft ? 40 : 56, nr: draft ? 50 : 80, z0: zF + 0.3, z1: zR - 0.25, inset, inward: true, hatch: true }), M.shell, 'halifax.hold_shell');
  // bulkheads (front: the main spar wall with a dark crawlway; rear: a plain wall with a door outline)
  for (const [z, front] of [[zF, true], [zR, false]]) {
    const f = F(z), sh = new THREE.Shape(), NS = 40;
    for (let j = 0; j <= NS; j++) { const q = secPt(f, -Math.PI / 2 + j / NS * TAU, inset + 0.01); if (j === 0) sh.moveTo(q[0], q[1]); else sh.lineTo(q[0], q[1]); }
    const hole = new THREE.Path(); const w = front ? 0.36 : 0.3, y0 = floor + (front ? 0.55 : 0.05), y1 = floor + (front ? 1.55 : 1.75);
    hole.moveTo(-w, y0); hole.lineTo(w, y0); hole.lineTo(w, y1); hole.lineTo(-w, y1); hole.lineTo(-w, y0); sh.holes.push(hole);
    const g = new THREE.ShapeGeometry(sh, 6); g.translate(0, 0, z);
    const m = addMesh(I, g, M.shell); m.material = M.shellD;
    // the door / crawlway backing overlaps its opening by 6 cm (an exact fit left bright slivers of sky at the edges)
    if (!front) { const door = addMesh(I, new THREE.PlaneGeometry(2 * w + 0.12, y1 - y0 + 0.12), M.door); door.position.set(0, (y0 + y1) / 2, z - 0.025); door.rotation.y = 0; }
    else { const back = addMesh(I, new THREE.BoxGeometry(2 * w + 0.12, y1 - y0 + 0.12, 0.42), M.black); back.position.set(0, (y0 + y1) / 2, z + 0.22); }
    if (front) { const spar = addMesh(I, new THREE.BoxGeometry(2 * wallX(F(z), floor + 0.3, inset) - 0.02, 0.5, 0.22), M.rib); spar.position.set(0, floor + 0.25, z - 0.11); }
  }
  // floor (planks) with the hatch hole
  {
    const sh = new THREE.Shape(), n = 24, xs = [];
    for (let i = 0; i <= n; i++) { const z = lerp(zF, zR, i / n); xs.push([wallX(F(z), floor + 0.02, inset) - 0.01, z]); }
    sh.moveTo(xs[0][0], -xs[0][1]); for (const [x, z] of xs) sh.lineTo(x, -z); for (let i = xs.length - 1; i >= 0; i--) sh.lineTo(-xs[i][0], -xs[i][1]);
    const h = new THREE.Path(); h.absarc(hatch[0], -hatch[1], hr, 0, TAU, true); sh.holes.push(h);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false, curveSegments: 36 });
    g.rotateX(-Math.PI / 2); g.translate(0, floor - 0.035, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.25);
    addMesh(I, g, M.floor, 'halifax.floor');
  }
  // hatch: the well through the belly, a rim, the two doors folded open
  const fz = F(hatch[1]), wellD = floor - (fz.bot - 0.05);
  // the well: 1.5 cm wider than the floor hole (even its 48-gon's flats stay outside the hole's edge, hidden under the
  // planks and the rim), so no sliver of sky shows at the top
  const well = addMesh(I, new THREE.CylinderGeometry(hr + 0.015, hr + 0.015, wellD, 48, 1, true), M.wellIn); well.position.set(hatch[0], floor - wellD / 2, hatch[1]); well.material = M.wellIn;
  // a doubler ring on the belly round the hole: hides the skin's stepped cut (whole quads dropped) from below
  const dbl = addMesh(I, new THREE.RingGeometry(hr - 0.01, hr + 0.3, 36, 1), M.fus); dbl.rotation.x = Math.PI / 2; dbl.position.set(hatch[0], fz.bot - 0.012, hatch[1]); dbl.name = 'halifax.hatch_doubler';
  const rim = addMesh(I, new THREE.TorusGeometry(hr + 0.02, 0.028, 8, 48), M.imetal); rim.rotation.x = Math.PI / 2; rim.position.set(hatch[0], floor + 0.012, hatch[1]);
  const rimB = addMesh(I, new THREE.TorusGeometry(hr + 0.03, 0.035, 8, 48), M.fus); rimB.rotation.x = Math.PI / 2; rimB.position.set(hatch[0], fz.bot + 0.03, hatch[1]);
  const doors = [];
  for (const s of [1, -1]) {
    const piv = new THREE.Group(); piv.position.set(hatch[0] + s * hr, floor + 0.03, hatch[1]); I.add(piv);
    const dg = new THREE.CylinderGeometry(hr, hr, 0.04, 32, 1, false, s > 0 ? 0 : Math.PI, Math.PI); dg.translate(-s * hr, 0, 0);
    const d = addMesh(piv, dg, M.doorM); piv.userData.s = s; doors.push(piv); d.name = 'halifax.hatch_door';
  }
  // while the doors are shut only a thin line of moonlight shows along their seam (fades out as they open)
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 2 * hr - 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.32, 0.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  seam.rotation.x = -Math.PI / 2; seam.position.set(hatch[0], floor + 0.052, hatch[1]); seam.userData.noQA = true; seam.renderOrder = 3; I.add(seam);
  // ribs (frames) and stringers on the inner wall, above the floor
  {
    const pos = [], idx = [];
    const quad = (a, b, c, d) => { const i = pos.length / 3; pos.push(...a, ...b, ...c, ...d); idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
    let fk = 0;
    for (let z = zF - 0.35; z > zR + 0.2; z -= 0.52, fk++) {
      // every third a deep main frame, light formers between (an even row of identical rings read as a sci-fi tube)
      const f = F(z), NS = 36, ring = [], dep = fk % 3 === 0 ? 0.11 : 0.05;
      for (let j = 0; j <= NS; j++) {
        const a = -0.5 * Math.PI + j / NS * TAU, q = secPt(f, a, inset + 0.005); if (q[1] < floor + 0.02) continue;
        const qi = secPt(f, a, inset + dep); ring.push([q, qi]);
      }
      for (let k = 0; k < ring.length - 1; k++) {
        const [o0, i0] = ring[k], [o1, i1] = ring[k + 1];
        for (const dz of [0.02, -0.02]) quad([o0[0], o0[1], z + dz], [i0[0], i0[1], z + dz], [i1[0], i1[1], z + dz], [o1[0], o1[1], z + dz]);
        quad([i0[0], i0[1], z + 0.02], [i0[0], i0[1], z - 0.02], [i1[0], i1[1], z - 0.02], [i1[0], i1[1], z + 0.02]);
      }
    }
    for (const a of [-0.12, 0.22, 0.52, 0.8, 1.05, 1.3, 1.57, 1.84, 2.09, 2.34, 2.62, 2.92, 3.26]) {
      let prev = null;
      for (let z = zF - 0.05; z >= zR + 0.05; z -= 0.35) {
        const f = F(z), q = secPt(f, a, inset + 0.005), qi = secPt(f, a, inset + 0.03);
        if (q[1] < floor + 0.05) { prev = null; continue; }
        const t = [-Math.sin(a), Math.cos(a)], w = 0.022;
        const cur = [[q[0] + t[0] * w, q[1] + t[1] * w, z], [qi[0] + t[0] * w, qi[1] + t[1] * w, z], [qi[0] - t[0] * w, qi[1] - t[1] * w, z], [q[0] - t[0] * w, q[1] - t[1] * w, z]];
        if (prev) { quad(prev[0], cur[0], cur[1], prev[1]); quad(prev[1], cur[1], cur[2], prev[2]); quad(prev[2], cur[2], cur[3], prev[3]); }
        prev = cur;
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = addMesh(I, g, M.rib, 'halifax.ribs'); m.material.side = THREE.DoubleSide;
  }
  // benches both sides + the seat deck points (aboard.js: a figure on seat_N sits on a 0.46 m bench, facing in)
  const anchors = {};
  const seatZ = [-4.55, -3.8, -3.05, -2.3];
  for (const s of [-1, 1]) {
    const z0 = -1.3, z1 = -4.95, zc = (z0 + z1) / 2, L = z0 - z1;
    const xw = wallX(F(zc), floor + 0.46, inset);
    const seat = addMesh(I, new THREE.BoxGeometry(0.36, 0.045, L), M.bench); seat.position.set(s * (xw - 0.2), floor + 0.4375, zc);       // top 0.46 m (aboard 'sit' / sit_bench seat_h 0.46)
    const lip = addMesh(I, new THREE.BoxGeometry(0.03, 0.08, L), M.bench); lip.position.set(s * (xw - 0.37), floor + 0.405, zc);
    const back = addMesh(I, new THREE.BoxGeometry(0.03, 0.42, L), M.bench); back.position.set(s * (wallX(F(zc), floor + 0.75, inset) - 0.03), floor + 0.78, zc);
    for (let z = z0 - 0.15; z >= z1 + 0.1; z -= 0.9) { const leg = addMesh(I, new THREE.BoxGeometry(0.04, 0.42, 0.04), M.imetal); leg.position.set(s * (xw - 0.34), floor + 0.21, z); }
  }
  [[-1, seatZ[0]], [-1, seatZ[1]], [1, seatZ[0]], [1, seatZ[1]]].forEach(([s, z], k) => {
    const a = new THREE.Object3D(); a.name = 'seat_' + k;
    a.position.set(s * (wallX(F(z), floor + 0.46, inset) - 0.22), floor, z); a.userData = { stand: true, floor: 0, face: 'in' }; I.add(a); anchors['seat_' + k] = a;
  });
  // static-line cable along the roof (+ static lines to the seats)
  const fy = (z) => F(z).top - inset - 0.24;
  rod([0.26, fy(zF - 0.3), zF - 0.3], [0.26, fy(zR + 0.6), zR + 0.6], 0.008, M.isteel, I, 6);
  for (const z of [zF - 0.3, -2.6, zR + 0.6]) rod([0.26, fy(z), z], [0.26, fy(z) + 0.24, z], 0.012, M.imetal, I, 6);
  const lines = [];
  const which = Array.isArray(o.static_lines) ? o.static_lines.map((v) => Math.round(+v)).filter((v) => v >= 0 && v < 4) : [...Array(clamp(Math.round(+o.static_lines || 0), 0, 4)).keys()];
  for (const k of which) {
    const an = anchors['seat_' + k], p = an.position;
    const A = new THREE.Vector3(0.26, fy(p.z + 0.25), p.z + 0.25), B = new THREE.Vector3(p.x * 0.72, floor + 1.18, p.z + 0.05);
    const mid = A.clone().lerp(B, 0.5); mid.y -= 0.12;
    // hung from its roof clip (a pivot at A): the line swings with the airframe instead of sliding along the cable
    const piv = new THREE.Group(); piv.position.copy(A); I.add(piv);
    const tg = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, mid, B), 16, 0.012, 5, false); tg.translate(-A.x, -A.y, -A.z);
    const tube = new THREE.Mesh(tg, M.strap); piv.add(tube);
    lines.push({ tube, piv, A, B, k });
  }
  // the jump light (port wall by the hatch): red, then green
  const JZ = -6.4, jx = wallX(F(JZ), floor + 1.45, inset) - 0.06;          // port wall, just aft of the hatch (not beside a seat)
  const box = addMesh(I, new THREE.BoxGeometry(0.08, 0.26, 0.16), M.imetal); box.position.set(jx, floor + 1.45, JZ);
  const red = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), M.lensR); red.position.set(jx - 0.042, floor + 1.51, JZ); red.rotation.y = -Math.PI / 2; I.add(red);
  const grn = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), M.lensG); grn.position.set(jx - 0.042, floor + 1.39, JZ); grn.rotation.y = -Math.PI / 2; I.add(grn);
  const lamp = new THREE.PointLight(0xff2a18, 0, 2.2, 2); lamp.position.set(jx - 0.14, floor + 1.45, JZ); lamp.userData.noGovern = true; I.add(lamp);
  // the lamp's glow on the lens (bloom picks it up): a small sprite, not a flood
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xff3020, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  halo.scale.set(0.34, 0.34, 1); halo.position.set(jx - 0.06, floor + 1.45, JZ); halo.userData.noQA = true; halo.renderOrder = 3; I.add(halo);
  // dim amber bulb in a cage at the front of the hold
  const bulbY = F(0.6).top - inset - 0.14;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), M.bulb); bulb.position.set(-0.32, bulbY, 0.6); I.add(bulb);
  // the one warm practical: the fore hold falls off from it
  const amber = new THREE.PointLight(0xffa04a, 0.8, 5.5, 1.8); amber.position.set(-0.32, bulbY - 0.06, 0.6); amber.userData.noGovern = true; I.add(amber);
  // moonlight up through the hatch: a cool spot from below + a soft beam with dust motes
  const hl = clamp(+(o.hatch_light ?? 1), 0, 2);
  // aimed a little aft (it hit the agent sitting on the forward rim full in the chest: a white ghost)
  const moon = new THREE.SpotLight(0xa8c2ff, 18 * hl, 6.5, 0.27, 0.95, 1.6);
  moon.position.set(hatch[0], fz.bot - 1.6, hatch[1] + 0.1); moon.target.position.set(hatch[0], F(hatch[1]).top, hatch[1] - 0.55); moon.userData.noGovern = true; I.add(moon, moon.target);
  // the deck below lights the hold softly through the hole (a wide, weak fill from the hatch: figures get a cool under-rim)
  // the fill sits BELOW the hole (0.9 m under the floor, out in the slipstream): it lights the roof and the upper walls the
  // way the open hatch does and only grazes the floor; at the rim it blew a sitting agent's front to white. Short range:
  // the hold falls off into the dark fore and aft
  const fillUp = new THREE.PointLight(0x90aef0, 7.0 * hl, 4.8, 2.0); fillUp.position.set(hatch[0], floor - 0.9, hatch[1]); fillUp.userData.noGovern = true; I.add(fillUp);
  const topY = F(hatch[1]).top - inset;
  const beamG = new THREE.CylinderGeometry(0.95, hr * 0.96, topY - floor, 40, 1, true); beamG.translate(0, (topY + floor) / 2, 0);
  const beamM = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(0.55, 0.68, 1.0) } },
    vertexShader: `#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying float vY; varying vec3 vN; varying vec3 vV;\nvoid main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}`,
    fragmentShader: `#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform float uA; uniform vec3 uC; varying float vY; varying vec3 vN; varying vec3 vV;\nvoid main(){\n#include <logdepthbuf_fragment>\n float edge = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.6); float a = uA * edge * pow(clamp(1.0 - vY, 0.0, 1.0), 1.4) * smoothstep(0.0, 0.06, vY); gl_FragColor = vec4(uC * a, a); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,     // additive: light never darkens
  });
  const beam = new THREE.Mesh(beamG, beamM); beam.position.set(hatch[0], 0, hatch[1]); beam.name = 'halifax.beam'; beam.userData.noQA = true; beam.renderOrder = 4; I.add(beam);
  const NM = draft ? 26 : 48, mp = new Float32Array(NM * 3), mc = new Float32Array(NM * 3), seeds = new Float32Array(NM * 4);
  let sd = 4242; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < NM; i++) { seeds[i * 4] = R(); seeds[i * 4 + 1] = R(); seeds[i * 4 + 2] = R(); seeds[i * 4 + 3] = R(); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('color', new THREE.BufferAttribute(mc, 3)); mg.boundingSphere = new THREE.Sphere(new THREE.Vector3(hatch[0], 0, hatch[1]), 4);
  // soft dust specks (2.5 cm sprites), each as bright as the beam where it floats: bright low over the hole, gone toward
  // the roof and the beam's edge (hard 7 mm points read as stars against the dark bulkheads)
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0xffffff, map: T.glow, size: 0.026, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, vertexColors: true }));
  motes.name = 'halifax.motes'; motes.userData.noQA = true; motes.frustumCulled = false; I.add(motes);
  const moteUpdate = (t) => {
    for (let i = 0; i < NM; i++) {
      const s0 = seeds[i * 4], s1 = seeds[i * 4 + 1], s2 = seeds[i * 4 + 2], s3 = seeds[i * 4 + 3];
      const h = ((s1 + t * (0.05 + 0.08 * s2)) % 1), y = floor + 0.05 + h * (topY - floor - 0.1), r = Math.sqrt(s0) * lerp(hr * 0.9, 0.6, h);
      const a = s3 * TAU + t * (0.3 + 0.5 * s2) * (s0 > 0.5 ? 1 : -1);
      mp[i * 3] = hatch[0] + Math.cos(a) * r; mp[i * 3 + 1] = y; mp[i * 3 + 2] = hatch[1] + Math.sin(a) * r;
      const b = Math.pow(1 - h, 1.6) * smooth(h / 0.08) * (1 - smooth((Math.sqrt(s0) - 0.7) / 0.3)) * (0.6 + 0.4 * Math.sin(t * (1.3 + s2) + s3 * 9));
      mc[i * 3] = 0.62 * b; mc[i * 3 + 1] = 0.74 * b; mc[i * 3 + 2] = 1.0 * b;
    }
    mg.attributes.position.needsUpdate = true; mg.attributes.color.needsUpdate = true;
  };
  // light spilling DOWN out of the open hatch (seen from outside: the hold's glow in the black belly; it takes the jump
  // light's colour, so red -> green reads from outside too)
  const spillH = 3.2, spillG = new THREE.CylinderGeometry(hr * 0.92, 1.25, spillH, 40, 1, true); spillG.translate(0, -spillH / 2, 0);
  const spillM = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(0.5, 0.55, 0.8) } },
    vertexShader: `#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying float vY; varying vec3 vN; varying vec3 vV;\nvoid main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}`,
    fragmentShader: `#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform float uA; uniform vec3 uC; varying float vY; varying vec3 vN; varying vec3 vV;\nvoid main(){\n#include <logdepthbuf_fragment>\n float edge = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.0); float a = uA * edge * pow(clamp(vY, 0.0, 1.0), 2.2) * smoothstep(0.0, 0.35, vY) * (1.0 - smoothstep(0.9, 1.0, vY)); gl_FragColor = vec4(uC * a, a); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,     // additive (it darkened bright fog), faded at both ends (no dotted rim)
  });
  const spill = new THREE.Mesh(spillG, spillM); spill.position.set(hatch[0], fz.bot - 0.02, hatch[1]); spill.name = 'halifax.hatch_spill'; spill.userData.noQA = true; spill.renderOrder = 4; I.add(spill);
  // window glow (moonlit sky through the small side windows)
  for (const s of [1, -1]) for (const z of [-1.9, -2.9, -7.25, -7.9]) {
    const y = 0.45, x = wallX(F(z), y, inset) - 0.005;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), M.window); w.position.set(s * x, y, z); w.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; I.add(w);
  }
  Object.assign(anchors, (() => {
    const mk = (n, x, y, z, ud) => { const a = new THREE.Object3D(); a.name = n; a.position.set(x, y, z); if (ud) a.userData = ud; I.add(a); return a; };
    return {
      hatch: mk('hatch', hatch[0], floor, hatch[1]),
      hatch_edge: mk('hatch_edge', hatch[0], floor, hatch[1] + hr + 0.12, { stand: true, floor: 0, face: 'stern' }),
      hold: mk('hold', 0, floor + 1.3, -3.2),
      jump_light: mk('jump_light', jx, floor + 1.45, JZ),
    };
  })());
  return { anchors, doors, lamp, halo, red, grn, moteUpdate, lines, amber, moon, spill, spillK: hl, fillUp, beamM, motes, seam, hl };
}

// ── build ────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function build(kind, item = {}, ctx = {}) {
  const doc = CATALOG[kind]?.params || CATALOG['aircraft.halifax'].params, p = {};
  for (const [k, v] of Object.entries(item.params || {})) if (v !== doc[k]) p[k] = v;          // the registry merges the doc strings in
  Object.assign(p, item);
  const draft = ctx.quality === 'draft';
  const dayL = String(p.livery || 'night').toLowerCase() === 'day';       // day: lighter undersides, brighter camo (a daylight raid)
  const T = textures();
  const G = (x, z) => { const v = ctx.ground && ctx.ground.height ? ctx.ground.height(x, z) : 0; return Number.isFinite(v) ? v : 0; };
  const M = {
    fus: skinMat(0, dayL), wing: skinMat(1, dayL), fin: skinMat(2, dayL), nac: skinMat(3, dayL),
    black: plainMat({ color: 0x050506, roughness: 0.9 }), metal: plainMat({ color: 0x1c1d1f, roughness: 0.45, metalness: 0.6 }),
    steel: plainMat({ color: 0x8a8e92, roughness: 0.3, metalness: 0.9 }), spinner: plainMat({ color: 0x0c0c0d, roughness: 0.72, metalness: 0.1, envMapIntensity: 0.35 }),
    blade: plainMat({ color: 0xffffff, roughness: 0.55, metalness: 0.1, vertexColors: true }),
    disc: plainMat({ color: 0x0b0b0c, roughness: 0.9, metalness: 0, envMapIntensity: 0.25, transparent: true, alphaMap: T.disc, depthWrite: false, side: THREE.DoubleSide }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.32, 0.08) }),
    glassT: glassMat(0), glassC: glassMat(1), glassP: glassMat(2),
  };
  M.ember.userData.base = M.ember.color.clone();
  const interior = p.interior === true || p.interior === 'true';
  const HU = { uV2H: { value: new THREE.Matrix4() } };          // view -> airframe space, for the hold's floor shadow
  if (interior) Object.assign(M, {
    shell: holdMat({ HU,  color: 0x3a4036, roughness: 0.82 }), shellD: holdMat({ HU,  color: 0x2c3029, roughness: 0.85, side: THREE.DoubleSide }),
    rib: holdMat({ HU,  color: 0x575c4d, roughness: 0.7, metalness: 0.15 }), floor: holdMat({ HU,  color: 0xc8c8c8, roughness: 0.9, map: T.planks }),
    bench: holdMat({ HU,  color: 0x6a5840, roughness: 0.8 }), imetal: holdMat({ HU,  color: 0x2a2c2e, roughness: 0.62, metalness: 0.45 }), isteel: holdMat({ HU,  color: 0x6a6e72, roughness: 0.45, metalness: 0.7 }), door: holdMat({ HU,  color: 0x2c302a, roughness: 0.8 }), doorM: holdMat({ HU,  color: 0x3a3d38, roughness: 0.6, metalness: 0.3 }),
    wellIn: holdMat({ HU,  color: 0x1c1e1b, roughness: 0.8, side: THREE.DoubleSide }), strap: holdMat({ HU,  color: 0x6b6450, roughness: 0.9 }),
    window: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.022, 0.034, 0.068) }),
    lensR: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.01, 0.01) }), lensG: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.01, 0.05, 0.02) }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.2, 0.45) }),
  });
  const root = new THREE.Group(); root.name = 'aircraft.halifax';
  const body = new THREE.Group(); body.name = 'halifax.body'; root.add(body);
  const ext = buildExterior(body, M, T, { draft, interior });
  const H = interior ? buildInterior(body, M, T, { draft, static_lines: p.static_lines, hatch_light: p.hatch_light }) : null;
  root.traverse((o) => { if (o.isMesh && o.material && !o.material.isShaderMaterial && !o.material.userData.__patched) patchMaterial(o.material); });

  // ── motion ──
  const at = Array.isArray(p.at) ? [+p.at[0] || 0, +p.at[p.at.length === 3 ? 2 : 1] || 0] : [0, 0];
  const hdg = Number.isFinite(+p.heading) ? +p.heading : 180;
  const speed = String(p.action || '').toLowerCase() === 'hold' ? 0 : Math.max(0, Number.isFinite(+p.speed) ? +p.speed : 62);
  const y0 = Number.isFinite(+p.y) ? +p.y : G(at[0], at[1]) + (Number.isFinite(+p.alt) ? +p.alt : Number.isFinite(+p.altitude) ? +p.altitude : 900);
  const d0 = [Math.sin(hdg * DEG), -Math.cos(hdg * DEG)], yaw0 = Math.atan2(d0[0], d0[1]);
  const track = speed > 0 && Array.isArray(p.path) && p.path.length >= 2 ? smoothTrack([at, ...p.path.slice(1)], { rmin: Math.max(150, speed * speed / (9.81 * Math.tan(25 * DEG))) }) : null;
  const keys = (Array.isArray(p.keys) ? p.keys : []).map((k) => ({ ...k, t: +k.t || 0 })).sort((a, b) => a.t - b.t);
  const keyAt = (f, t) => {
    const L = keys.filter((k) => Number.isFinite(+k[f])); if (!L.length) return 0;
    if (t <= L[0].t) return +L[0][f]; if (t >= L[L.length - 1].t) return +L[L.length - 1][f];
    for (let i = 0; i < L.length - 1; i++) if (t <= L[i + 1].t) return lerp(+L[i][f], +L[i + 1][f], smoother((t - L[i].t) / Math.max(1e-3, L[i + 1].t - L[i].t)));
    return 0;
  };
  const life = clamp(Number.isFinite(+p.life) ? +p.life : 1, 0, 2), ph = ((item.seed ?? 3) * 1.37) % TAU;
  function pose(t) {
    let x, z, yaw, bank = 0, v = speed;
    if (track) { const s = speed * t, q = track.at(s); x = q[0]; z = q[1]; yaw = track.yaw(s); bank = Math.atan(speed * speed * track.heel(s, Math.max(20, speed * 1.5)) / 9.81); }
    else { x = at[0] + d0[0] * speed * t; z = at[1] + d0[1] * speed * t; yaw = yaw0; }
    const bob = life * (0.12 * Math.sin(TAU * 0.23 * t + ph) + 0.05 * Math.sin(TAU * 0.61 * t + ph * 2));
    const roll = (keyAt('roll', t) + life * (0.45 * Math.sin(TAU * 0.17 * t + ph) + 0.2 * Math.sin(TAU * 0.43 * t + 1.1))) * DEG - bank;
    const pitch = (keyAt('pitch', t) + life * 0.25 * Math.sin(TAU * 0.21 * t + 1 + ph)) * DEG;
    return { x, y: y0 + bob + keyAt('dy', t), z, yaw: yaw + keyAt('yaw', t) * DEG, roll, pitch, v, dir: [Math.sin(yaw), Math.cos(yaw)] };
  }
  const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  function matrixAt(t, out) { const P = pose(t); _e.set(-P.pitch, P.yaw, P.roll, 'YXZ'); _q.setFromEuler(_e); _p.set(P.x, P.y, P.z); return out.compose(_p, _q, _s); }

  // ── state over time ──
  const propsMode = String(p.props || 'spin').toLowerCase();
  const exK = clamp(Number.isFinite(+p.exhaust) ? +p.exhaust : 0.8, 0, 1.5);
  for (const pr of ext.props) { pr.blades.visible = propsMode !== 'spin'; pr.disc.visible = propsMode === 'spin'; }
  const jl = p.jump_light || {}, tRed0 = Number.isFinite(+jl.red) ? +jl.red : 0, tGreen = Number.isFinite(+jl.green) ? +jl.green : null;
  const tRed = tRed0 <= 0 ? -1 : tRed0;          // red: 0 = already on when the shot starts (not fading in on frame 1)
  const hatchOpen = p.hatch_open === false || p.hatch_open === 'false' ? null : Number.isFinite(+p.hatch_open) && p.hatch_open !== true ? +p.hatch_open : -1e9;
  // camera inside the hold -> global moon / sky / env dimmed for that sub-frame (figures aboard go silhouette)
  const look = () => { try { const f = globalThis.__f3d; return (f && typeof f.look === 'function' && f.look()) || null; } catch (e) { return null; } };
  const _inv = new THREE.Matrix4(), _M = new THREE.Matrix4(), _c = new THREE.Vector3();
  function holdDepth(lp) {        // 0 outside .. 1 well inside the hold (local point)
    if (!interior) return 0;
    const f = F(lp.z), xw = wallX(f, clamp(lp.y, HOLD.floor + 0.05, f.top - 0.1), HOLD.inset);
    const dz = Math.min(lp.z - HOLD.zR, HOLD.zF - lp.z), dx = xw - Math.abs(lp.x), dy = Math.min(lp.y - HOLD.floor, f.top - HOLD.inset - lp.y);
    let k = smooth(Math.min(dz, dx, dy) / 0.12 + 0.5);
    // the hatch well: half in while passing through it
    const r = Math.hypot(lp.x - HOLD.hatch[0], lp.z - HOLD.hatch[1]);
    if (r < HOLD.hr && lp.y < HOLD.floor && lp.y > f.bot - 0.3) k = Math.max(k, smooth((lp.y - (f.bot - 0.3)) / (HOLD.floor - f.bot + 0.3)));
    return clamp(k);
  }
  function update(t = 0, clock, camera) {
    const P = pose(t);
    _e.set(-P.pitch, P.yaw, P.roll, 'YXZ'); body.quaternion.setFromEuler(_e); body.position.set(P.x, P.y, P.z);
    // props: the blur disc turns slowly (its lobes), blades still when props: still
    for (const pr of ext.props) { pr.disc.rotation.z = pr.dir * (t * TAU * 0.85 + pr.ph); if (propsMode !== 'spin') pr.blades.rotation.z = pr.ph; }
    // exhaust glow: a dull flicker (and the glows / discs drawn after the cloud deck fade inside a fog_in bank)
    const fogT = camera ? lensFogT(camera.position.distanceTo(body.position), t, ctx) : 1;
    M.disc.opacity = fogT;
    for (const g of ext.glows) {
      const f = exK * (0.82 + 0.1 * Math.sin(37 * t + g.ph) + 0.08 * Math.sin(91 * t + 2.3 * g.ph));
      g.slit.material.color.copy(M.ember.userData.base).multiplyScalar(Math.max(0.05, f * 1.6));
      g.spr.material.opacity = 0.55 * f * fogT;
    }
    if (H) {
      const u = hatchOpen == null ? 0 : smoother((t - hatchOpen) / 0.8);
      for (const d of H.doors) d.rotation.z = d.userData.s * -u * 2.85;
      const g = tGreen == null ? 0 : smooth((t - tGreen) / 0.14), r = (t >= tRed ? smooth((t - tRed) / 0.14) : 0) * (1 - g);
      M.lensR.color.setRGB(0.08 + 3.2 * r, 0.01 + 0.25 * r, 0.01 + 0.2 * r); M.lensG.color.setRGB(0.01 + 0.3 * g, 0.05 + 3.0 * g, 0.02 + 0.9 * g);
      H.lamp.color.setRGB(lerp(1, 0.25, g), lerp(0.16, 1, g), lerp(0.1, 0.42, g)); H.lamp.intensity = 0.55 * Math.max(r, g);
      H.halo.material.color.setRGB(lerp(1, 0.3, g), lerp(0.2, 1, g), lerp(0.12, 0.45, g)); H.halo.material.opacity = 0.75 * Math.max(r, g);
      const jk = Math.max(r, g), su = H.spill.material.uniforms;
      su.uC.value.setRGB(0.42 + 0.5 * jk * lerp(1, 0.25, g), 0.5 + 0.5 * jk * lerp(0.15, 1, g), 0.78 + 0.2 * jk * lerp(0.1, 0.4, g));
      // where the lens is, in the airframe's frame (the hold dims the outside light; the spill hides near the hatch)
      let k = 0, nearH = 0;
      if (camera) {
        body.updateMatrixWorld(true); _inv.copy(body.matrixWorld).invert(); _c.copy(camera.position).applyMatrix4(_inv);
        k = holdDepth(_c); shelter(k, t);
        HU.uV2H.value.copy(_inv).multiply(camera.matrixWorld);
        const below = HOLD.floor - _c.y, rr = Math.hypot(_c.x - HOLD.hatch[0], _c.z - HOLD.hatch[1]);
        nearH = Math.max(k, (1 - smooth((rr - 1.2) / 2.5)) * (1 - smooth((below - 3.0) / 2.5)) * smooth((below + 0.4) / 0.4));
      }
      su.uA.value = 0.075 * H.spillK * u * (1 - nearH);
      // the moonlight up through the hole comes only through the OPEN doors (it lit the hold with them shut), and it
      // breathes as the deck streams past below (billows 50-190 m at 62 m/s); shut, a hair line of light at the seam
      const fl = 1 + 0.12 * Math.sin(TAU * 0.63 * t + 0.4) + 0.08 * Math.sin(TAU * 1.37 * t + 1.9) + 0.05 * Math.sin(TAU * 2.9 * t + 0.7);
      H.moon.intensity = 18 * H.hl * u * fl; H.fillUp.intensity = 7.0 * H.hl * u * fl;
      H.beamM.uniforms.uA.value = 0.022 * H.hl * u * fl; H.motes.material.opacity = 0.55 * Math.min(1, H.hl) * u;
      H.seam.material.opacity = 0.9 * Math.min(1, H.hl) * (1 - smooth(u / 0.15));
      H.moteUpdate(t);
      for (const L of H.lines) { L.piv.rotation.set(0.05 * Math.sin(TAU * 0.7 * t + L.k) + 0.02 * Math.sin(TAU * 1.9 * t + 2 * L.k), 0, 0.04 * Math.sin(TAU * 0.53 * t + 1.3 * L.k)); }
      // the global light while the lens is in the hold
      const lk = look();
      if (lk && lk.cur && camera) {
        const base = baseLights(lk, ctx);
        lk.key.intensity = base.key * (1 - k); lk.hemi.intensity = base.hemi * (1 - 0.96 * k);
        if (ctx.world3) ctx.world3.environmentIntensity = base.env * (1 - 0.94 * k);
      }
    }
  }
  update(0);
  // anchors (all Object3D under the moving body)
  const anchors = { body };
  const mk = (n, x, y, z) => { const a = new THREE.Object3D(); a.name = n; a.position.set(x, y, z); body.add(a); anchors[n] = a; return a; };
  const wl = wingAt(11);
  mk('nose', 0, 0.28, 9.6); mk('cockpit', 0, 1.75, 5.4); mk('tail', 0, 0.5, -12.4);
  mk('wing_l', 11, wl.y + 0.12, wl.le - wl.c * 0.45); mk('wing_r', -11, wl.y + 0.12, wl.le - wl.c * 0.45);
  mk('door', F(-7.3).hw + 0.02, 0.1, -7.3); mk('hatch_below', HOLD.hatch[0], F(HOLD.hatch[1]).bot - 1.0, HOLD.hatch[1]);
  NAC.forEach(([nx, zf, , cy], k) => mk('engine_' + (k + 1), nx, cy, zf + 0.7));
  if (H) Object.assign(anchors, H.anchors);
  else { mk('hatch', HOLD.hatch[0], F(HOLD.hatch[1]).bot, HOLD.hatch[1]); }
  // debug (undocumented): debug_hide: ['spinner', 'prop_disc', ...] hides the parts whose name contains a word
  if (Array.isArray(p.debug_hide) && p.debug_hide.length) root.traverse((o) => { if (o.name && p.debug_hide.some((w) => o.name.includes(String(w)))) o.visible = false; });
  root.traverse((o) => { o.userData.noQA = o.userData.noQA || o === root; });

  // ── the hull for the camera probe ──
  function solidLocal(q, m) {
    const s = Math.abs(q.x), z = q.z;
    // the hold and the hatch well are hollow
    if (interior) {
      const f = F(z);
      if (z < HOLD.zF - 0.05 && z > HOLD.zR + 0.05) {
        const mi = Math.min(m, 0.3);
        if (q.y > HOLD.floor + 0.1 && q.y < f.top - HOLD.inset - mi && s < wallX(f, q.y, HOLD.inset) - mi) return false;
      }
      if (Math.hypot(q.x - HOLD.hatch[0], z - HOLD.hatch[1]) < HOLD.hr - 0.12 && q.y < HOLD.floor + 0.3 && q.y > f.bot - 3) return false;
    }
    if (z < Z_NOSE + 0.5 + m && z > Z_TAIL - 0.95 - m) {
      const f = F(clamp(z, Z_TAIL, Z_NOSE));
      if (s < f.hw + m && q.y > f.bot - m && q.y < f.top + m) return true;
    }
    if (s > 1.0 && s < S_TIP + m) { const w = wingAt(Math.min(s, S_TIP)); if (z < w.le + m && z > w.le - w.c - m && Math.abs(q.y - w.y) < w.t * w.c * 0.55 + m) return true; }
    for (const [nx, zf, zb, cy] of NAC) {
      const dx = q.x - nx, dy = q.y - cy;
      if (z > zb - m && z < zf + 0.9 + m && (dx / (0.62 + m)) ** 2 + (dy / (0.8 + m)) ** 2 < 1) return true;
      if (Math.abs(z - (zf + 0.26)) < 0.25 + m && Math.hypot(dx, dy) < 1.95 + m) return true;
    }
    if (s < FIN_X + 0.4 + m) { const a = tailAt(Math.min(s, FIN_X)); if (z < a.le + m && z > a.le - a.c - m && Math.abs(q.y - TP_Y) < 0.16 + m) return true; }
    if (Math.abs(s - FIN_X) < 0.14 + m && q.y > FIN_Y0 - m && q.y < FIN_Y1 + m && z < FIN_Z + m && z > FIN_Z - FIN_C - 0.2 - m) return true;
    for (const [tz, ty, r] of [[8.92, 0.3, 0.6], [-12.38, 0.5, 0.63], [-3.45, 1.33, 0.6]]) if (Math.hypot(q.x, q.y - ty, z - tz) < r + m) return true;
    return false;
  }
  const _l = new THREE.Vector3();
  function solidAt(pt, t, margin = 0.6) {
    matrixAt(t, _M); _inv.copy(_M).invert();
    _l.set(pt[0], pt[1], pt[2]).applyMatrix4(_inv);
    if (_l.lengthSq() > 30 * 30) return 0;
    return solidLocal(_l, margin) ? pose(t).y + 3.2 : 0;
  }
  const moving = speed > 0;
  return {
    root, radius: 16.5, height: 6.3, snapped: true, fly: true, contact: false, update, anchors, solidAt,
    length: 21.4, beam: 31.6, footprint: [31.6, 21.4],
    positionAt: (t) => { const P = pose(t); return new THREE.Vector3(P.x, P.y, P.z); },
    kin: moving ? { pose: (t) => { const P = pose(t); return { x: P.x, z: P.z, dir: P.dir, yaw: P.yaw, s: speed * t, v: speed, kappa: 0, heel: P.roll }; } } : undefined,
    halifax: { F, wingAt, HOLD, NAC, matrixAt, holdDepth },
  };
}
