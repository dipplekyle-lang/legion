// para.js — Legion 3D v3, WP5 (V3_SPEC 2.5): paratroopers in the air.
//   para.jumper  one paratrooper (any kit, default para_soe; or a video cast ref) falling through the phases
//                exit -> freefall -> deploy -> descent -> landing on a physical track: the slipstream throw-back, free fall
//                v = vt tanh(g t / vt), the static line, the canopy coming out (bag -> streamer 0.35 s -> inflation `open`
//                0.6-0.9 s, radius overshoot 1.05 -> 1.0, all smootherstep), the deceleration to `descent` m/s and the
//                pendulum swing under the canopy, then the landing (knees, the canopy collapses downwind).
//                A flying item (catalog fly: true, snap: false): anchors.body follows the figure (camera target, DOF and
//                the QA probe see it at its real height), positionAt(t) gives the harness point (x, y, z) for camera
//                moves that fall with it (WP1 freefall_follow).
//   para.canopy  an X-type canopy on its own (28 gores, apex vent, scalloped skirt, 28 rigging lines, 4 risers, silk that
//                breathes and lets the moon through): open | streamer | collapsed | deploy, with load none | container
//   para.stick   a stick of N jumpers leaving the aircraft `spacing` s apart along its heading (each its own canopy,
//                per-jumper refs / kits / variations); anchors jumper_N / canopy_N, body = the first jumper
// Pure functions of t (every sub-frame stands alone); the tracks are integrated once at build time at 240 Hz.
import * as THREE from 'three';
import { buildCharacter, findCastDef } from '../human/cast.js';
import { blobMaterial } from '../human/common.js';
import { patchMaterial } from '../shared/env.js';
import { clamp, lerp } from '../shared/util.js';
import './kit_ww2.js';
import { POSE_V3, mixPose } from '../human/actions_v3.js';

const PI = Math.PI, TAU = PI * 2, DEG = PI / 180, GRAV = 9.81;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const DEFP = { lArmZ: 0.07, rArmZ: -0.07, lElbow: -0.14, rElbow: -0.14, lLegY: 0.06, rLegY: -0.06, lLegZ: 0.015, rLegZ: -0.015 };
const hash = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

// ── silk: gore seams, panel seams, vent and hem tapes (one gore per texture tile across, vent -> skirt down) ────────
let SILK_TEX = null;
function silkTex() {
  if (SILK_TEX) return SILK_TEX;
  const W = 128, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), id = g.createImageData(W, H), d = id.data;
  let s = 4242; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H;
    // fix1: pillowed gores (fern's "brain" relief from below): each panel lighter in its middle, darker toward the
    // radial tapes and the horizontal panel seams, the tapes themselves a darker double layer (they block the back light)
    const pv = (v * 6) % 1, pil = Math.sin(PI * u) ** 0.6 * (0.55 + 0.45 * Math.sin(PI * pv) ** 0.5);
    let k = 0.66 + 0.2 * pil + 0.03 * Math.sin(v * 900 + u * 40) + (rnd() - 0.5) * 0.03; // silk weave + shimmer
    const seam = Math.min(u, 1 - u) * W;                                                // the radial tape at the gore edges
    if (seam < 3) k = 0.5 + seam * 0.02; else if (seam < 5) k -= 0.06;                  // tape + the stitch shadow beside it
    if (pv < 0.014 || pv > 0.986) k -= 0.1;
    if (v < 0.03) k = 0.62; else if (v < 0.045) k = 0.9; if (v > 0.965) k = 0.92;     // vent edge (dark), vent tape, hem tape
    k = clamp(k, 0, 1) * 255;
    const o = (y * W + x) * 4; d[o] = d[o + 1] = d[o + 2] = k; d[o + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (SILK_TEX = t);
}
const COLORS = { olive: 0x67654A, khaki: 0x8A7F5E, white: 0xD9D5C8, camo: 0x5E5C44, sand: 0xB3A47E, grey: 0x8E8C86, black: 0x1E1E1C };
// silk lets light through: a back-lit panel glows with the light behind it (moon, sun), seen from below in the dark
function silkMat(col, trans) {
  const m = new THREE.MeshStandardMaterial({ color: col, map: silkTex(), roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
  m.userData.progKey = 'para_silk';
  const U = { uTrans: { value: trans } };
  m.userData.uTrans = U.uTrans;
  return patchMaterial(m, (sh) => {
    sh.uniforms.uTrans = U.uTrans;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTrans;')
      .replace('#include <lights_fragment_end>', `
#if NUM_DIR_LIGHTS > 0
  #pragma unroll_loop_start
  for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
    // fix1 it2: a soft band, not max(0, -N.L): the pillowed gores' normals cross 0 one gore in two, which made a
    // black-and-white beach ball against the moon
    reflectedLight.directDiffuse += min( vec3( 1.0 ), diffuseColor.rgb * 3.0 ) * directionalLights[ i ].color * smoothstep( -0.4, 1.0, - dot( normal, directionalLights[ i ].direction ) ) * uTrans * 0.75;
  }
  #pragma unroll_loop_end
#endif
#if NUM_HEMI_LIGHTS > 0
  // fix1: the sky behind the cloth shines through it (seen from below the dome glows grey with the gore relief, not a
  // flat black disc); from above the ground side is dark, so nothing changes there
  #pragma unroll_loop_start
  for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
    reflectedLight.indirectDiffuse += min( vec3( 1.0 ), diffuseColor.rgb * 3.0 ) * getHemisphereLightIrradiance( hemisphereLights[ i ], - normal ) * uTrans * 2.2;
  }
  #pragma unroll_loop_end
#endif
#include <lights_fragment_end>`);
  });
}

// ── the canopy: a mesh rebuilt per frame from a few numbers (shape in the canopy frame: origin at the riser tops, +Y up) ─
function makeCanopy(o, ctx) {
  const lod = ctx?.lod?.detail ?? 1, GORES = 28, NG = lod < 1 ? 4 : 6, NU = GORES * NG, NV = lod < 1 ? 12 : 18;
  // fix1: Hd 0.8 -> 0.74 Rin (from above the domes read a little less like balloons)
  const D = clamp(num(o.diameter, 8.5), 3, 14), Rin = 0.33 * D, Hd = 0.74 * Rin, TH0 = 0.07, THS = 1.9;
  const Lline = num(o.lines, 0.75 * D), Rh = Rin * Math.sin(THS), ys = Lline * Math.sqrt(Math.max(0.2, 1 - (Rh / Lline) ** 2));
  const yc = ys - Hd * Math.cos(THS);
  const col = typeof o.color === 'string' && COLORS[o.color] != null ? COLORS[o.color] : (() => { try { return new THREE.Color(o.color ?? COLORS.olive).getHex(); } catch (e) { return COLORS.olive; } })();
  const group = new THREE.Group(); group.name = 'para.canopy';
  const nV = (NU + 1) * (NV + 1), pos = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), idx = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const k = j * (NU + 1) + i; uv[k * 2] = i / NG; uv[k * 2 + 1] = 1 - j / NV; }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nV * 3), 3));
  const mat = silkMat(col, num(o.translucency, 0.32));
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'canopy_silk'; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  group.add(mesh);
  // rigging lines (thin, a little transparent: 1-2 px at this distance) and the four risers
  // fix1: two segments per line (hem -> middle -> riser link), so a line lying over a hump never cuts into the ground
  const lpos = new Float32Array(GORES * 4 * 3), lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  const lmat = new THREE.LineBasicMaterial({ color: 0x2A2A24, transparent: true, opacity: 0.55, depthWrite: false });
  patchMaterial(lmat);
  const lines = new THREE.LineSegments(lgeo, lmat); lines.name = 'canopy_lines'; lines.frustumCulled = false; lines.userData.noQA = true;
  group.add(lines);
  // riser tops in the canopy frame (x, z): front-left, front-right, back-left, back-right. The risers splay out from the
  // shoulders (x 0.125) to the line links 0.62 m up, wide enough to pass outside the helmet with the hands on the front pair
  const RT = [[0.2, 0.1], [-0.2, 0.1], [0.2, -0.08], [-0.2, -0.08]];
  const riserOf = (g) => { const a = (g + 0.5) / GORES * TAU; const x = Math.cos(a), z = Math.sin(a); return (z >= 0 ? 0 : 2) + (x >= 0 ? 0 : 1); };
  const P = geo.attributes.position;
  const hemPt = V3(), tmp = V3(), lk = V3(), lm = V3();
  // shape at (u gore coordinate 0..GORES, v 0 vent .. 1 skirt) for the state st -> writes into out (canopy frame)
  function shape(u, v, st, out) {
    const g = Math.floor(u), f = u - g, a0 = u / GORES * TAU, a = a0 + (st.twist || 0);
    const ca = Math.cos(a), sa = Math.sin(a), scal = Math.sin(PI * f);
    const d = st.deflate || 0;                   // 0 = full .. 1 = empty
    // full dome: an oblate cap from the vent to the hem, the cloth pillowing between the radial tapes (fern's gore relief),
    // the hem scalloped; deflating, the pillows relax and fall in a little
    const th = lerp(TH0, THS, v) - 0.085 * scal * v ** 4;
    const bulge = 1 + (0.04 * (1 - d) - 0.012 * d) * scal * Math.sqrt(Math.sin(th));
    const k = st.k ?? 1, br = st.breathe ?? 0, fl = 0.014 * (st.flutter ?? 0) * v ** 3 * Math.sin(st.ph - u * 0.9 * PI);
    let r = Rin * Math.sin(th) * bulge * k * (1 + br + fl), y = yc + Hd * Math.cos(th) * (1 - 0.6 * br);
    if (d > 0) {
      // fix1 (REVIEW_1 D1): the dome loses its air as ONE SOFT BAG: the apex sinks first (the crown caves into the dome),
      // the mouth narrows a little and the volume shrinks. The folds are low-frequency whole-turn harmonics of the angle
      // (2 and 3 per turn, so they close seamlessly round the canopy) and at most ~0.15 m: no gore pinches into a spike.
      const fold = 0.55 * Math.sin(2 * a0 + 1.3 + 2.1 * v + 0.6 * d) + 0.45 * Math.sin(3 * a0 - 0.7 + 1.4 * v);
      const crown = (1 - v) ** 2;
      // the side toward the man (upwind, the lines pull it) caves in first: one broad dent (a smooth first harmonic),
      // the classic kidney shape of a collapsing round canopy
      const up = st.windA != null ? Math.max(0, Math.cos(a0 - st.windA - PI)) ** 1.5 : 0;
      const dent = d * 0.4 * up * (0.3 + 0.7 * v);
      y -= d * (0.62 * Hd * crown + 0.25 * Hd * v * v) - 0.13 * d * fold * v + dent * 0.55 * Hd;
      r *= (1 - 0.1 * d) * (1 - 0.22 * d * v ** 1.6) * (1 + 0.045 * d * fold) * (1 + 0.12 * d * crown) * (1 - dent);
    }
    if (st.flat > 0) r *= 1 + 0.45 * st.flat * v;  // lying down the cloth slides out like a sheet
    const fx = ca * r, fz = sa * r;
    const m = st.m ?? 1;
    if (m >= 0.999) { out.set(fx, y, fz); return out; }
    // streamer (fix1 D6): a narrow silk sleeve (radius <= 0.18 m) from the line ends up the static line; a wave travels
    // up it (the whole sleeve snakes), the bag end flaps most
    const e = st.e ?? 1, Lc = 0.62 * D;
    const sy = (Lline * 0.92 + (1 - v) * Lc) * e;
    const sr = (0.035 + 0.11 * Math.sin(PI * clamp(v * 0.9 + 0.05)) ** 0.7) * (0.6 + 0.4 * e) * (1 + 0.22 * Math.sin(st.ph * 2.3 + g * 1.7 + v * 5) * e);
    const wv = e * (0.3 + 0.7 * (1 - v)) * 0.17;
    const sx = ca * sr + wv * Math.sin(st.ph * 0.75 - v * 6.5), sz = sa * sr + 0.6 * wv * Math.sin(st.ph * 0.6 - v * 5.3 + 1.1);
    // the inflation front: the crown fills first, the mouth last
    const mv = smr(m * 1.6 - v * 0.6);
    out.set(lerp(sx, fx, mv), lerp(sy, y, mv), lerp(sz, fz, mv));
    return out;
  }
  const _M = new THREE.Matrix4(), _Mi = new THREE.Matrix4();
  // st.G (world x, z -> ground y) and/or st.groundY: the cloth never goes below the terrain under EACH vertex (fix1 H1:
  // one height for the whole canopy sank it into any slope); st.flat 0..1 lays it onto that terrain as a crumpled sheet;
  // st.avoid {x, z, r, top}: no cloth inside that vertical capsule (the man standing in the snow), pushed out sideways
  function update(st) {
    group.visible = (st.e ?? 1) > 0.002;
    if (!group.visible) return;
    const gY = Number.isFinite(st.groundY) ? st.groundY : null, Gf = typeof st.G === 'function' ? st.G : null;
    const onG = gY != null || Gf != null, flat = onG ? (st.flat || 0) : 0, av = onG ? st.avoid || null : null;
    const gAt = (x, z) => (Gf ? Gf(x, z) : gY);
    if (onG) { group.updateWorldMatrix(true, false); _M.copy(group.matrixWorld); _Mi.copy(_M).invert(); }
    const rip = st.ripple || 0, rph = st.rph || 0, lie = onG && st.lie ? st.lie : null;
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * GORES, v = j / NV;
      shape(u, v, st, tmp);
      if (onG) {
        tmp.applyMatrix4(_M);
        if (av && tmp.y < av.top) {
          const dx = tmp.x - av.x, dz = tmp.z - av.z, dh = Math.hypot(dx, dz);
          if (dh < av.r) { let nx = dx / Math.max(dh, 1e-4) + 0.6 * (av.dx || 0), nz = dz / Math.max(dh, 1e-4) + 0.6 * (av.dz || 0); const nl = Math.hypot(nx, nz) || 1; tmp.x = av.x + nx / nl * av.r; tmp.z = av.z + nz / nl * av.r; }
        }
        let al = 0, ac = 0;
        if (flat > 0 && lie) {
          // a canopy lying in the snow is a long tongue downwind of the links (the lines pull the skirt in), narrow, with
          // a wavy outline: the cloth is gathered across and drawn out along the wind
          const rx = tmp.x - lie.ox, rz = tmp.z - lie.oz;
          al = rx * lie.dx + rz * lie.dz; ac = -rx * lie.dz + rz * lie.dx;
          const k = lerp(1, 0.52 + 0.1 * Math.sin(al * 1.3 + 0.7) + 0.07 * Math.sin(al * 2.9 + 2.1), flat);
          const al2 = al + flat * (0.22 * Math.sin(ac * 1.7 + 1.1) + 0.35), ac2 = ac * k;
          tmp.x = lie.ox + lie.dx * al2 - lie.dz * ac2; tmp.z = lie.oz + lie.dz * al2 + lie.dx * ac2;
        }
        const gy = gAt(tmp.x, tmp.z);
        if (flat > 0) {
          const a0 = u / GORES * TAU;
          const lump = lie ? 0.1 * Math.max(0, Math.sin(al * 1.1 + 0.4) * Math.sin(ac * 2.3 + 1.7)) : 0;    // trapped air
          const wr = 0.04 + 0.13 * (0.5 + 0.5 * Math.sin(3 * a0 + 5.1 * v + 0.4) * Math.sin(2 * a0 - 3.3 * v + 1.0)) * (1 - 0.45 * v) + 0.025 * Math.sin(PI * (u % 1))
            + lump + rip * v * (0.5 + 0.5 * Math.sin(2 * a0 + 6 * v - rph));    // the wind lifts the loose cloth in slow waves
          tmp.y = lerp(tmp.y, gy + wr, flat);
        }
        tmp.y = Math.max(tmp.y, gy + 0.03);
        tmp.applyMatrix4(_Mi);
      }
      P.setXYZ(j * (NU + 1) + i, tmp.x, tmp.y, tmp.z);
    }
    P.needsUpdate = true; geo.computeVertexNormals();
    const e = st.e ?? 1;
    for (let gI = 0; gI < GORES; gI++) {
      hemPt.fromBufferAttribute(P, NV * (NU + 1) + gI * NG);
      const r = RT[riserOf(gI)];
      lk.set(r[0] * e, 0, r[1] * e); lm.copy(hemPt).lerp(lk, 0.5);
      if (onG) {
        for (const q of [lk, lm]) { q.applyMatrix4(_M); q.y = Math.max(q.y, gAt(q.x, q.z) + 0.04); q.applyMatrix4(_Mi); }
      }
      lpos.set([hemPt.x, hemPt.y, hemPt.z, lm.x, lm.y, lm.z, lm.x, lm.y, lm.z, lk.x, lk.y, lk.z], gI * 12);
    }
    lgeo.attributes.position.needsUpdate = true;
  }
  return { group, update, mesh, lines, mat, RT, dims: { D, Rin, Hd, ys, yc, Lline, top: yc + Hd } };
}
// four risers: unit boxes stretched between two world points each (updated by the jumper)
function makeRisers(parent, key) {
  const mat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x8E896A, roughness: 0.92 }));
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const list = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(geo, mat); m.name = key + '_riser'; m.castShadow = true; m.frustumCulled = false; parent.add(m); list.push(m); }
  const up = V3(0, 1, 0), d = V3(), q = new THREE.Quaternion();
  return {
    list,
    set(i, a, b, vis = true) {
      const m = list[i]; m.visible = vis; if (!vis) return;
      d.subVectors(b, a); const L = d.length(); if (L < 1e-4) { m.visible = false; return; }
      q.setFromUnitVectors(up, d.multiplyScalar(1 / L));
      m.position.copy(a); m.quaternion.copy(q); m.scale.set(0.042, L, 0.005);
    },
  };
}

// ── the landing (fix1, REVIEW_1 D1): u s after the touchdown ─────────────────────────────────────────────────────────
// the legs come under him (feet flat), the knees give 0.25 s and hold, he rises over 1.2 s; the hands come down the risers
// to the chest during the flex, hold them at the waist while the canopy goes down, then let go (arms hang at the sides).
// The hands stay IK specs in chest space the whole time (mixPose blends them; no switch from IK to FK = no snap).
const LAND_STAND = { lLeg: -0.03, rLeg: 0.02, lKnee: 0.07, rKnee: 0.05, lFoot: 0.0, rFoot: 0.0, lean: 0.04, spineX: 0.02, chestX: 0.03, drop: 0.0,
  lLegY: 0.06, rLegY: -0.06, lLegZ: 0.015, rLegZ: -0.015, lShrug: 0.0, rShrug: 0.0 };
const LAND_FLEX = { lLeg: -0.88, rLeg: -0.82, lKnee: 1.42, rKnee: 1.34, lFoot: -0.36, rFoot: -0.33, lean: 0.32, chestX: 0.16, drop: 0.31, lLegZ: -0.025, rLegZ: 0.025, headX: 0.32 };
const hand = (side, p, fingers, palm, pole) => ({ space: 'chest', p: [side * p[0], p[1], p[2]], fingers: [side * fingers[0], fingers[1], fingers[2]], palm: [side * palm[0], palm[1], palm[2]], pole: [side * pole[0], pole[1], pole[2]] });
const LAND_H1 = { lHand: hand(1, [0.17, 0.3, 0.25], [0.1, 0.55, 0.8], [-0.7, -0.2, 0.65], [1, -0.5, 0.2]), rHand: hand(-1, [0.17, 0.3, 0.25], [0.1, 0.55, 0.8], [-0.7, -0.2, 0.65], [1, -0.5, 0.2]), lShape: 'grip', rShape: 'grip' };
const LAND_H2 = { lHand: hand(1, [0.15, -0.06, 0.25], [0.15, 0.2, 0.95], [-0.8, -0.1, 0.5], [1, -0.4, -0.3]), rHand: hand(-1, [0.15, -0.06, 0.25], [0.15, 0.2, 0.95], [-0.8, -0.1, 0.5], [1, -0.4, -0.3]), lShape: 'grip', rShape: 'grip' };
const LAND_H3 = { lHand: hand(1, [0.215, -0.39, 0.035], [0.02, -1, 0.1], [-1, 0, 0.05], [0.6, 0.0, -1]), rHand: hand(-1, [0.215, -0.39, 0.035], [0.02, -1, 0.1], [-1, 0, 0.05], [0.6, 0.0, -1]), lShape: 'relaxed', rShape: 'relaxed' };
function landPose(p, u) {
  p = mixPose(p, { ...p, ...LAND_STAND }, sm(u / 0.15));
  p = mixPose(p, { ...p, ...LAND_FLEX }, sm(u / 0.25) * (1 - smr((u - 0.55) / 1.2)));
  p = mixPose(p, { ...p, ...LAND_H1 }, sm(u / 0.35));
  p = mixPose(p, { ...p, ...LAND_H2 }, smr((u - 0.5) / 0.8));
  p = mixPose(p, { ...p, ...LAND_H3, headX: 0.12 }, smr((u - 1.7) / 1.0));
  return p;
}

// ── one jumper: track + figure + canopy ────────────────────────────────────────────────────────────────────────────
// o: resolved params; G(x, z): ground height
function planJumper(o, G, dur) {
  const hdg = num(o.heading, 0) * DEG, fwd = [Math.sin(hdg), -Math.cos(hdg)];
  const vt = clamp(num(o.fall_speed, 53), 10, 80), vc = clamp(num(o.descent, 5.5), 2, 12), vx = num(o.exit_speed, 45);
  const drift = Array.isArray(o.drift) ? [num(o.drift[0], 0), num(o.drift[1], 0)] : [0.6, 0.2];
  const open = clamp(num(o.open, 0.85), 0.6, 0.9);
  const phases = (Array.isArray(o.phases) && o.phases.length ? o.phases : ['exit', 'freefall', 'deploy', 'descent', 'landing']).map(String);
  const start = ['exit', 'freefall', 'deploy', 'descent', 'landing'].find((p) => phases.includes(p)) || 'exit';
  let tExit = num(o.t_exit, 0.3), tDep = num(o.t_deploy, NaN);
  if (start === 'freefall') { tExit = Math.min(num(o.t_exit, -0.9), -0.6); }
  if (start === 'deploy') { tDep = num(o.t_deploy, 0.2); tExit = Math.min(tDep - 1.0, num(o.t_exit, tDep - 1.0)); }
  if (start === 'descent' || start === 'landing') { tExit = -14; tDep = -13; }
  if (!Number.isFinite(tDep)) tDep = tExit + 1.0;
  if (tDep < tExit + 0.45) tDep = tExit + 0.45;
  const deploy = phases.includes('deploy') || phases.includes('descent') || start === 'descent' || !phases.every((p) => p === 'exit' || p === 'freefall');
  const tauS = tDep - tExit;                      // line stretch, s after the exit
  const tauOpen = tauS + 0.3 + open;              // fully open
  const s = o.scale ?? 1, foot = 1.45 * s;
  // relative track (harness point) from the exit, integrated at 240 Hz
  const DT = 1 / 240, tauMax = Math.max(1, dur + 1.5 - tExit), N = Math.ceil(tauMax / DT) + 2;
  const X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N), VY = new Float32Array(N);
  { let x = 0, y = 0, z = 0;
    for (let i = 0; i < N; i++) {
      const tau = i * DT;
      const vff = vt * Math.tanh(GRAV * tau / vt);
      const w = deploy ? smr((tau - (tauS + 0.15)) / (open + 0.85)) : 0;
      const vy = lerp(vff, vc * (1 + 0.035 * Math.sin(TAU * 0.31 * tau)), w);
      const vh = vx * Math.exp(-tau / 1.1);
      X[i] = x; Y[i] = y; Z[i] = z; VY[i] = vy;
      x += (fwd[0] * vh + drift[0]) * DT; z += (fwd[1] * vh + drift[1]) * DT; y -= vy * DT;
    }
  }
  const at = Array.isArray(o.at) ? [num(o.at[0], 0), num(o.at[o.at.length === 3 ? 2 : 1], 0)] : [0, 0];
  const y0 = (Array.isArray(o.at) && o.at.length === 3 ? num(o.at[1], 0) : G(at[0], at[1]) + num(o.alt, 250));
  // the reference: the exit point for an exit start, else the scene start
  const ref = start === 'exit' ? 0 : -tExit;
  const iRef = Math.min(N - 1, Math.round(ref / DT));
  const off = [at[0] - X[iRef], y0 - Y[iRef], at[1] - Z[iRef]];
  // landing: the first moment the feet reach the ground (the track then stops there)
  let iLand = -1;
  for (let i = 0; i < N; i++) { const gx = X[i] + off[0], gz = Z[i] + off[2]; if (Y[i] + off[1] - foot <= G(gx, gz)) { iLand = i; break; } }
  const landPt = iLand >= 0 ? [X[iLand] + off[0], G(X[iLand] + off[0], Z[iLand] + off[2]) + foot, Z[iLand] + off[2]] : null;
  const tauLand = iLand >= 0 ? iLand * DT : Infinity;
  const sampleP = (tau, out) => {
    if (tau >= tauLand) return out.set(landPt[0], landPt[1], landPt[2]);
    const f = clamp(tau / DT, 0, N - 1.0001), i = Math.floor(f), u = f - i;
    return out.set(lerp(X[i], X[i + 1], u) + off[0], lerp(Y[i], Y[i + 1], u) + off[1], lerp(Z[i], Z[i + 1], u) + off[2]);
  };
  const exitPt = V3(X[0] + off[0], Y[0] + off[1], Z[0] + off[2]);
  return { hdg, fwd, vt, vc, vx, drift, open, phases, start, tExit, tDep, tauS, tauOpen, tauLand, landPt, deploy, sampleP, exitPt, s, foot, VY, DT, N };
}

function buildJumper(o, ctx, idx, seed) {
  const G = (x, z) => { const g = ctx.ground?.height ? ctx.ground.height(x, z) : 0; return Number.isFinite(g) ? g : 0; };
  // the figure: a video cast member (identical in every scene) or a person in a kit
  let def = o.ref ? findCastDef(o.ref, ctx) : null;
  if (o.ref && !def) (ctx.warnings || []).push(`para.jumper: cast ref "${o.ref}" not in the video cast; using kit ${o.kit || 'para_soe'}`);
  if (!def) def = { id: o.id || `para_${idx}`, kit: o.kit || 'para_soe', colors: o.colors, headwear: o.headwear, accessories: o.accessories, build: o.build, signature: o.signature, variant: o.variant };
  const res = buildCharacter(def, ctx), fig = res.fig, s = fig.rig.s, B = fig.rig.B;
  const sil = clamp(num(o.silhouette, 0), 0, 1);
  if (sil > 0) {
    // the kit's materials belong to this figure alone (rig.js assemble makes them per build): darken them in place
    // fix1 (D5): the faceless head was the brightest thing in the silhouette (a pale egg at 4-7 m): the skin goes to the
    // fern cut-out tone (a dark blue-grey) much faster than the cloth
    const done = new Set(), SKIN_DARK = new THREE.Color(0x2A2C30);
    for (const m of fig.meshes) {
      const mt = m.material; if (!mt || !mt.color || done.has(mt)) continue; done.add(mt);
      if (m.name === 'skin') { mt.color.lerp(SKIN_DARK, clamp(sil * 1.3)); mt.roughness = Math.max(mt.roughness ?? 0.5, lerp(0.5, 0.92, sil)); mt.envMapIntensity = (mt.envMapIntensity ?? 1) * (1 - 0.6 * sil); }
      else mt.color.multiplyScalar(1 - 0.85 * sil);
      mt.envMapIntensity = (mt.envMapIntensity ?? 1) * (1 - 0.7 * sil);
    }
  }
  const plan = planJumper({ ...o, scale: s }, G, num(o.dur, ctx.dur ?? 10));
  const root = new THREE.Group(); root.name = 'para.jumper:' + (def.id || idx);
  root.add(fig.group);
  const cnp = makeCanopy({ ...(o.canopy || {}), color: o.canopy?.color ?? o.canopy_color }, ctx);
  root.add(cnp.group);
  const risers = makeRisers(root, 'para');
  const slGeo = new THREE.BufferGeometry(); slGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const slMat = patchMaterial(new THREE.LineBasicMaterial({ color: 0x6E6648, transparent: true, opacity: 0.55, depthWrite: false }));
  const sline = new THREE.Line(slGeo, slMat); sline.frustumCulled = false; sline.userData.noQA = true; root.add(sline);
  const stowed = fig.meshes.filter((m) => m.name === 'sline');
  // ground contact shadow for the landing (fades in near the ground)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-PI / 2), blobMaterial(0.5)); blob.renderOrder = 2; blob.userData.noQA = true; root.add(blob);
  const body = new THREE.Object3D(); body.name = 'body'; root.add(body);
  const canopyA = new THREE.Object3D(); canopyA.name = 'canopy'; root.add(canopyA);
  const rigA = new THREE.Object3D(); rigA.name = 'rig'; root.add(rigA);
  const ph = hash(seed * 1.37 + idx * 3.1) * TAU, ph2 = hash(seed * 2.71 + idx * 5.3) * TAU;
  const sway = clamp(num(o.sway, 0.6), 0, 1.5), wobK = clamp(num(o.wobble, 1), 0, 2), tumbleOn = !!o.tumble;
  const yaw0 = PI - plan.hdg + (hash(seed + idx * 7.7) - 0.5) * 0.5 + num(o.face, 0) * DEG;
  const T = 3.6, Lpend = 0.62 + cnp.dims.ys;
  const pre = o.pre === 'hatch' ? 'hatch' : 'hide';
  // the posed shoulder-mid in the figure frame (for placing the figure by its harness point)
  const shoulderLocal = (out) => {
    fig.group.updateMatrixWorld(true);
    const a = B.clavL.getWorldPosition(V3()), b = B.clavR.getWorldPosition(V3());
    out.copy(a).add(b).multiplyScalar(0.5); fig.group.worldToLocal(out); out.y += 0.03 * s; return out;
  };
  const applyP = (p) => fig._apply({ ...DEFP, ...p }, null);
  // the pose and the exit offset of the hatch pre-phase
  applyP(POSE_V3.hatch_jump(0.3)); fig.group.position.set(0, 0, 0); fig.group.quaternion.identity();
  const S_exit = shoulderLocal(V3());
  const tmpP = V3(), H = V3(), Sl = V3(), qBody = new THREE.Quaternion(), qYaw = new THREE.Quaternion(), qTilt = new THREE.Quaternion(), e3 = new THREE.Euler();
  const upV = V3(0, 1, 0), bodyUp = V3(), cAxis = V3(), riserTop = V3(), qC = new THREE.Quaternion(), shL = V3(), shR = V3();
  const lastState = { phase: 'pre', open: 0 };
  // phase weights at tau (s after the exit)
  function attitude(tau, t) {
    const P = plan, e = { pitch: 0, roll: 0, yaw: yaw0, pend: [0, 0] };
    // free fall: the slipstream throws him back, then a slow wobble; the exit tumble turns him over whole turns
    const blown = sm(tau / 0.25) * (1 - smr((tau - 0.45) / 0.7));
    e.pitch += -0.42 * blown;
    const wIn = sm((tau - 0.3) / 0.8);
    e.pitch += wobK * wIn * (0.09 * Math.sin(TAU * 0.47 * t + ph) + 0.04 * Math.sin(TAU * 0.83 * t + ph2));
    e.roll += wobK * wIn * (0.08 * Math.sin(TAU * 0.37 * t + ph2) + 0.035 * Math.sin(TAU * 0.71 * t + ph));
    e.yaw += 0.2 * sm(tau / Math.max(1, P.tauS)) + wobK * 0.06 * Math.sin(TAU * 0.13 * t + ph);
    // whole turns, finished 0.4 s before line stretch (kept out of the canopy blend below so nothing unwinds)
    let spin = 0;
    if (tumbleOn) { const turns = Math.max(1, Math.round((P.tauS - 0.4) * 0.7)); spin = TAU * turns * smr((tau - 0.15) / Math.max(0.5, P.tauS - 0.55)); }
    // under the canopy: the pendulum (pitch along the heading, roll across), kicked by the opening, then a gentle sway
    if (P.deploy) {
      const ramp = smr((tau - (P.tauS + 0.25)) / (P.open + 0.35)), since = Math.max(0, tau - P.tauOpen);
      const kick = 0.22 * Math.exp(-since / 3.2), land = tau >= P.tauLand ? 1 - smr((tau - P.tauLand) / 0.5) : 1;
      const tp = tau - P.tauS - 0.3;
      e.pend = [ramp * land * (kick * Math.sin(TAU * tp / T) + 0.07 * sway * Math.sin(TAU * tau / (T * 1.13) + ph)),
        ramp * land * (0.35 * kick * Math.sin(TAU * tp / (T * 1.05) + 1.1) + 0.055 * sway * Math.sin(TAU * tau / (T * 0.93) + ph2))];
      // free-fall wobble fades out as the body comes under the lines; the yaw keeps turning slowly with the canopy
      const k = 1 - ramp; e.pitch *= k; e.roll *= k;
      // fix1: frozen at the touchdown (a man standing in the snow does not keep turning on his feet)
      const tY = Math.min(tau, P.tauLand);
      e.yaw += ramp * (0.045 * Math.max(0, tY - P.tauS) + 0.08 * Math.sin(TAU * 0.07 * tY + ph2));
    }
    e.pitch += spin;
    return e;
  }
  function poseAt(tau, t) {
    const P = plan;
    if (tau < 0) return pre === 'hatch' ? (tau < -0.3 ? POSE_V3.hatch_sit(t, ph) : POSE_V3.hatch_jump(0.3 + tau)) : POSE_V3.freefall(t, ph);
    let p = POSE_V3.hatch_jump(0.3 + tau);
    const ff = POSE_V3.freefall(t, ph, { wobble: wobK });
    if (tumbleOn) p = mixPose(p, POSE_V3.tumble(t, ph), sm((tau - 0.05) / 0.3));
    else p = mixPose(p, POSE_V3.tumble(t, ph, { flail: 0.6 }), sm(tau / 0.22) * (1 - smr((tau - 0.35) / 0.55)));
    p = mixPose(p, ff, tumbleOn ? smr((tau - (P.tauS - 0.45)) / 0.45) : smr((tau - 0.45) / 0.7));
    if (P.deploy) p = mixPose(p, POSE_V3.hang(t, ph, { sway, look: o.look }), smr((tau - (P.tauS + 0.2)) / (P.open + 0.5)));
    if (tau >= P.tauLand) p = landPose(p, tau - P.tauLand);
    return p;
  }
  function canopyState(tau, t) {
    const P = plan;
    if (!P.deploy || tau < P.tauS - 0.25) return { e: 0, m: 0 };
    const e = smr((tau - (P.tauS - 0.25)) / 0.5);
    const ti0 = P.tauS + 0.3, ti1 = ti0 + P.open;
    const m = sm((tau - ti0) / P.open);          // smoothstep (peak slope 1.5/open): the dome grows, it never pops
    const over = 0.05 * smr((tau - ti0 - 0.5 * P.open) / (0.5 * P.open)) * (1 - smr((tau - ti1) / 0.45));
    const k = (0.62 + 0.38 * m) * (1 + over);
    const breathe = m * (0.017 * Math.sin(TAU * 0.78 * t + ph) + 0.008 * Math.sin(TAU * 1.9 * t + ph2));
    const flutter = 0.6 * m;
    // fix1 (D1): the collapse is a linear progress over 2.8 s; its parts ease on their own (deflate 1.1 s, tip 1.5 s,
    // lie down 1.7 s, the links slide 2.1 s), so nothing drops from overhead
    const collapse = tau >= P.tauLand ? clamp((tau - P.tauLand - 0.1) / 2.8) : 0;
    const deflate = smr(collapse / 0.38);
    return { e, m, k, breathe: breathe * (1 - deflate), flutter: flutter * (1 - 0.7 * deflate), collapse, deflate, ph: TAU * 2.2 * t, rph: TAU * 0.45 * t,
      twist: 0.3 * Math.sin(TAU * 0.05 * Math.min(t, P.tauLand + P.tExit) + ph) * m };
  }
  function update(t = 0) {
    const P = plan, tau = t - P.tExit;
    const visible = !(pre === 'hide' && tau < 0) && !(o.hide_after != null && t > num(o.hide_after, 1e9));
    root.visible = visible;
    // the figure's pose
    applyP(poseAt(tau, t));
    for (const m of stowed) m.visible = tau < 0.05;
    // where the harness is
    if (tau < 0) { H.copy(P.exitPt).add(V3(P.fwd[0] * P.vx * tau, 0, P.fwd[1] * P.vx * tau)); }
    else P.sampleP(tau, H);
    const a = attitude(Math.max(0, tau), t);
    // pendulum: the harness swings below the canopy (pivot Lpend above it)
    const pend = a.pend, side = V3(Math.cos(P.hdg), 0, Math.sin(P.hdg)), fw = V3(P.fwd[0], 0, P.fwd[1]);
    qTilt.setFromAxisAngle(side, pend[0]).multiply(new THREE.Quaternion().setFromAxisAngle(fw, pend[1]));
    bodyUp.copy(upV).applyQuaternion(qTilt);
    if (tau >= 0 && P.deploy) H.addScaledVector(upV, Lpend).addScaledVector(bodyUp, -Lpend);
    // body attitude: yaw, then the free-fall pitch / roll in the body frame, then the pendulum tilt
    qYaw.setFromAxisAngle(upV, a.yaw);
    e3.set(a.pitch, 0, a.roll, 'XYZ');
    qBody.copy(qTilt).multiply(qYaw).multiply(new THREE.Quaternion().setFromEuler(e3));
    fig.group.quaternion.copy(qBody); fig.group.position.set(0, 0, 0);
    if (tau < 0 && pre === 'hatch') { fig.group.quaternion.copy(qYaw); fig.group.position.copy(H).sub(S_exit.clone().applyQuaternion(qYaw)); }
    else { shoulderLocal(Sl); fig.group.position.copy(H).sub(Sl.applyQuaternion(qBody)); }
    fig.group.updateMatrixWorld(true);
    // after the landing the feet stand on the ground (the crouch lowers the pelvis, not the shoulders)
    if (tau >= P.tauLand) {
      const fc = fig.footContacts(); let mn = Infinity; for (const f of fc) for (const c of f) mn = Math.min(mn, c[1]);
      if (Number.isFinite(mn)) { fig.group.position.y += (G(H.x, H.z) - mn) * sm((tau - P.tauLand) / 0.15); fig.group.updateMatrixWorld(true); }
    }
    fig.update(t, {});
    // canopy frame: the riser tops above the shoulders along the lines, the canopy axis following the swing (a little less)
    const cs = canopyState(tau, t);
    const sh = (side0, out) => out.set(side0 * 0.125 * s * fig.rig.sw, 1.478 * s, -0.012 * s).sub(B.chest.userData.bind).applyMatrix4(B.chest.matrixWorld);
    sh(1, shL); sh(-1, shR);
    const mid = shL.clone().add(shR).multiplyScalar(0.5);
    // the streamer leans toward the aircraft (the static line pulls the bag back up), the open canopy stands over him
    const toAir = V3(-P.fwd[0] * 0.9, 1, -P.fwd[1] * 0.9).normalize();
    cAxis.copy(toAir).lerp(V3(0, 1, 0).applyQuaternion(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), qTilt, 0.8)), smr(cs.m * 1.2)).normalize();
    riserTop.copy(mid).addScaledVector(cAxis, 0.62 * (cs.e ?? 0));
    qC.setFromUnitVectors(upV, cAxis).multiply(new THREE.Quaternion().setFromAxisAngle(upV, a.yaw));
    let flat = 0, avoid = null, lieP = null, windA = null;
    const nearG = tau >= P.tauLand - 0.5;
    if (cs.collapse > 0) {
      // fix1 (H1 + D1): the empty bag tips over downwind about the riser links (1.25 rad over 1.5 s, smootherstep), the links
      // slide away from his shoulders to 1.4 m downwind just over the snow, and only once the cloth is well downwind
      // (tip > 0.5 rad) does it lie down onto the terrain under every vertex; no cloth within 0.85 m of him
      const u = cs.collapse;
      const dw = V3(P.drift[0], 0, P.drift[1]); if (dw.lengthSq() < 1e-4) dw.set(P.fwd[0], 0, P.fwd[1]); dw.normalize();
      const ax = V3().crossVectors(upV, dw).normalize();
      qC.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, 1.25 * smr((u - 0.08) / 0.55)));
      const end = V3(H.x + dw.x * 1.4, 0, H.z + dw.z * 1.4); end.y = G(end.x, end.z) + 0.3;
      riserTop.lerp(end, smr(u / 0.75));
      flat = smr((u - 0.33) / 0.62);
      avoid = { x: H.x, z: H.z, r: 0.85, top: G(H.x, H.z) + 2.4, dx: dw.x, dz: dw.z };
      lieP = { ox: end.x, oz: end.z, dx: dw.x, dz: dw.z };
      const dl = dw.clone().applyQuaternion(qC.clone().invert()); windA = Math.atan2(dl.z, dl.x);
    }
    cnp.group.position.copy(riserTop); cnp.group.quaternion.copy(qC);
    cnp.update({ ...cs, ph: cs.ph, flat, ripple: 0.04 * flat, G: nearG ? G : null, groundY: nearG ? G(H.x, H.z) : undefined, avoid, lie: lieP, windA });
    cnp.group.updateMatrixWorld(true);
    // risers from the shoulders to the riser tops
    const rv = cs.e > 0.02;
    for (let i = 0; i < 4; i++) {
      const r = cnp.RT[i], top = V3(r[0] * cs.e, 0, r[1] * cs.e).applyMatrix4(cnp.group.matrixWorld);
      if (nearG) top.y = Math.max(top.y, G(top.x, top.z) + 0.05);
      const from = (r[0] > 0 ? shL : shR).clone().addScaledVector(V3(0, 0, r[1] > 0 ? 0.025 : -0.03).applyQuaternion(qBody), 1);
      risers.set(i, from, top, rv);
    }
    // the static line: from the pack top toward the aircraft, taut until line stretch, then let go and drawn away
    const slA = V3(0, 1.46 * s, -0.17 * s).sub(B.chest.userData.bind).applyMatrix4(B.chest.matrixWorld);
    const air = P.exitPt.clone().add(V3(P.fwd[0] * P.vx * tau, 2.5, P.fwd[1] * P.vx * tau));
    const dir = air.clone().sub(slA); const dl = dir.length(); dir.multiplyScalar(1 / Math.max(1e-3, dl));
    // a held free fall (fern holds 3-4 s; a real static line opens in ~1 s) has no line left to show after ~1.2 s
    const slFade = P.tauS > 1.4 ? 1 - smr((tau - 0.8) / 0.45) : 1;
    const slOn = tau >= 0 && tau < P.tauS + 0.45 && P.deploy !== false && slFade > 0.01;
    sline.visible = slOn && root.visible;
    if (slOn) {
      const gone = smr((tau - P.tauS - 0.05) / 0.4);
      const from = slA.clone().addScaledVector(dir, Math.min(dl, 4.6) * gone), to = slA.clone().addScaledVector(dir, Math.min(dl, 4.6));
      slGeo.attributes.position.array.set([from.x, from.y, from.z, to.x, to.y, to.z]); slGeo.attributes.position.needsUpdate = true;
      slMat.opacity = 0.55 * (1 - gone) * slFade;
    }
    // anchors: body (camera target / probe base) and the canopy centre
    body.position.copy(H).addScaledVector(bodyUp, -1.45 * s);
    // fix1 (D8): rig = his chest in free fall, sliding (smootherstep) up to the middle of the rig once the canopy opens:
    // the camera target for a deploy inside a follow shot (target objects:N.rig / rig_N)
    { const kr = P.deploy ? smr((tau - P.tauS) / (P.open + 0.6)) : 0; rigA.position.copy(H).addScaledVector(bodyUp, -0.35 * s * (1 - kr)).addScaledVector(upV, 3.6 * kr); }
    canopyA.position.copy(V3(0, cnp.dims.yc + cnp.dims.Hd * 0.4, 0).applyMatrix4(cnp.group.matrixWorld));
    // contact shadow near the ground
    const feetY = H.y - P.foot, g = G(H.x, H.z), hgt = feetY - g;
    blob.visible = root.visible && hgt < 4;
    if (blob.visible) { blob.position.set(H.x, g + 0.03, H.z); blob.material.opacity = 0.5 * (1 - clamp(hgt / 4)); }
    lastState.phase = tau < 0 ? 'pre' : tau < P.tauS ? 'freefall' : tau < P.tauOpen ? 'deploy' : tau < P.tauLand ? 'descent' : 'landing';
    lastState.open = cs.m || 0;
    return root;
  }
  update(0);
  // the focus point for camera templates and the QA (camera.js itemSubject: res.subjectAt): in the air the default
  // subject sits on the ground under him. Free fall: his chest; under the canopy: the middle of the rig (lines).
  const dur = num(o.dur, ctx.dur ?? 10), rigShot = plan.deploy && plan.tauOpen + plan.tExit < dur * 0.5;
  // fix1 (D8): the focus follows the deploy whenever it happens inside the shot (it was fixed at build time)
  const focus = (t) => { update(t); return [rigA.position.x, rigA.position.y, rigA.position.z]; };
  return { root, update, fig, res, plan, body, canopyA, rigA, canopy: cnp, state: lastState, harness: (t) => { update(t); return H.clone(); }, focus, rigShot };
}

// ── param resolution shared by the kinds ───────────────────────────────────────────────────────────────────────────
const JPARAMS = ['silhouette', 'kit', 'ref', 'colors', 'headwear', 'accessories', 'build', 'signature', 'variant', 't_exit', 't_deploy', 'open', 'phases', 'fall_speed', 'descent', 'drift', 'exit_speed', 'heading', 'alt', 'sway', 'wobble', 'tumble', 'canopy', 'canopy_color', 'pre', 'look', 'face', 'hide_after'];
function paramsOf(item) {
  const P = { ...(item.params || {}) };
  const o = {};
  for (const k of JPARAMS) { const v = item[k] ?? P[k]; if (v != null) o[k] = v; }   // the spec's own key wins over a catalog default
  o.at = item.at ?? P.at; o.dur = item.dur ?? P.dur;
  if (o.heading == null) o.heading = item.heading ?? 0;
  // the registry hands `at` over as [x, z]: an absolute height comes as `y` (m, world) and wins over `alt`
  const y = item.y ?? P.y;
  if (y != null && Number.isFinite(+y) && Array.isArray(o.at)) o.at = [+o.at[0], +y, +o.at[o.at.length === 3 ? 2 : 1]];
  return o;
}
// the registry merges a CATALOG entry's `params` into item.params as DEFAULT VALUES (registry.js), so the catalog carries
// real defaults (null = "the code decides": it falls through to the item-level key / the built-in default) and the
// documentation lives in `doc`
const JDEF = { kit: 'para_soe', ref: null, y: null, alt: 250, t_exit: null, t_deploy: null, phases: null, fall_speed: 53, descent: 5.5, drift: null, sway: 0.6, canopy: null };
const JDOC = 'Params: at [x, z] + y (absolute m; the registry drops the y of a 3-element at) or alt (m above the ground, 250); kit para_soe | any kit, or ref (a video cast id: the identical figure in every scene); heading (aircraft heading deg: he leaves along it); exit_speed (aircraft m/s, 45: the throw-forward the air brakes in ~1 s); t_exit (s he leaves the hatch, 0.3; pre "hide" = invisible before, "hatch" = sitting in the hatch moving with the aircraft); t_deploy (s of line stretch; static line 0.6-1.2 s after the exit; default t_exit + 1.0); open (inflation s 0.6-0.9, 0.85); phases [exit, freefall, deploy, descent, landing] (the first one listed is where the scene starts: descent = already under the open canopy at t 0); fall_speed (terminal m/s, 53); descent (m/s under the canopy, 5.5); drift [vx, vz] wind m/s; sway 0..1.5 (swing under the canopy, 0.6); wobble 0..2 (free-fall wobble, 1); tumble true (whole turns before line stretch); look down|up|ahead (head under the canopy); canopy {color olive|khaki|white|sand|grey|camo|hex, diameter 8.5 flat m, lines m, translucency 0.32}; face (deg added to his yaw); hide_after (s); silhouette 0..1 (darkens his kit: 0.6-0.8 = the fern look, dark cut-outs against a night sky). positionAt(t) = the harness point (x, y, z) for cameras that fall with him; anchors body (the figure), canopy (the dome centre), rig (his chest in free fall, sliding up to the middle of the rig once the canopy opens). Camera targets: freefall_follow / chase on one jumper: objects:N (or objects:N.jumper_0); a deploy inside a follow shot: target objects:N.rig and rel back >= 16 m (the 10 m rig must fit); on a para.stick ALWAYS name the jumper (objects:N.jumper_0 / rig_0): objects:N alone frames the whole stick as one rigid box and the lead leaves the frame.';

// ── para.canopy on its own ─────────────────────────────────────────────────────────────────────────────────────────
function buildCanopyItem(item, ctx) {
  const P = { ...(item.params || {}), ...item };
  const G = (x, z) => { const g = ctx.ground?.height ? ctx.ground.height(x, z) : 0; return Number.isFinite(g) ? g : 0; };
  const at = Array.isArray(P.at) ? [num(P.at[0], 0), num(P.at[P.at.length === 3 ? 2 : 1], 0)] : [0, 0];
  const y0 = P.y != null && Number.isFinite(+P.y) ? +P.y : Array.isArray(P.at) && P.at.length === 3 ? num(P.at[1], 0) : G(at[0], at[1]) + num(P.alt, 30);
  const descent = num(P.descent, 0), drift = Array.isArray(P.drift) ? [num(P.drift[0], 0), num(P.drift[1], 0)] : [0, 0];
  const state = String(P.state || 'open'), tDep = num(P.t_deploy, 0.5), open = clamp(num(P.open, 0.85), 0.6, 0.9);
  const lying = state === 'collapsed';
  const root = new THREE.Group(); root.name = 'para.canopy';
  const cnp = makeCanopy({ ...(P.canopy || {}), color: P.canopy?.color ?? P.color, diameter: P.diameter ?? P.canopy?.diameter }, ctx);
  root.add(cnp.group);
  let load = null;
  if (P.load === 'container' && !lying) {
    const m = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x4B4C38, roughness: 0.8, metalness: 0.2 }));
    load = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.7, 16), m); load.castShadow = true; root.add(load);
  }
  const seedPh = hash(num(item.seed, 1) * 0.77) * TAU, yaw = (90 - num(item.heading, 0)) * DEG, body = new THREE.Object3D(); body.name = 'body'; root.add(body);
  // downwind: the drift, else the item heading (the convention of para.jumper: heading 0 = -Z)
  const hd = num(item.heading, 0) * DEG, dw = V3(drift[0], 0, drift[1]);
  if (dw.lengthSq() < 1e-4) dw.set(Math.sin(hd), 0, -Math.cos(hd)); dw.normalize();
  const qLie = new THREE.Quaternion().setFromAxisAngle(V3().crossVectors(V3(0, 1, 0), dw).normalize(), 1.25).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw));
  const windLie = (() => { const d = dw.clone().applyQuaternion(qLie.clone().invert()); return Math.atan2(d.z, d.x); })();
  const lowY = (t) => y0 - descent * t;
  const where = { x: at[0], z: at[1], yb: y0 };
  function update(t = 0) {
    const tau = t - tDep;
    let st;
    if (state === 'deploy') {
      const e = smr((tau + 0.25) / 0.5), m = sm((tau - 0.3) / open), over = 0.05 * smr((tau - 0.3 - 0.5 * open) / (0.5 * open)) * (1 - smr((tau - 0.3 - open) / 0.45));
      st = { e, m, k: (0.62 + 0.38 * m) * (1 + over), breathe: m * 0.017 * Math.sin(TAU * 0.78 * t + seedPh), flutter: 0.6 * m };
    } else if (state === 'streamer') st = { e: 1, m: 0.05 + 0.04 * Math.sin(TAU * 0.9 * t), k: 0.7, flutter: 0 };
    else if (lying) st = { e: 1, m: 1, k: 1, deflate: 1, flat: 1, breathe: 0, flutter: 0, ripple: 0.04, rph: TAU * 0.45 * t + seedPh, lie: { ox: at[0], oz: at[1], dx: dw.x, dz: dw.z }, windA: windLie };
    else st = { e: 1, m: 1, k: 1, breathe: 0.017 * Math.sin(TAU * 0.78 * t + seedPh) + 0.008 * Math.sin(TAU * 1.9 * t), flutter: 0.6 };
    st.ph = TAU * 2.2 * t; st.twist = lying ? 0 : 0.2 * Math.sin(TAU * 0.05 * t + seedPh);
    if (lying) {
      // fix1 (REVIEW_1 H2): "collapsed" LIES ON THE GROUND: the riser links on the snow at `at`, the empty cloth tipped
      // 1.25 rad downwind of them and laid onto the terrain under every vertex (a crumpled sheet 4-25 cm thick that the
      // wind lifts in slow waves), the lines running over the ground to the links. It does not drift.
      const g0 = G(at[0], at[1]);
      cnp.group.position.set(at[0], g0 + 0.3, at[1]); cnp.group.quaternion.copy(qLie);
      cnp.update({ ...st, G, groundY: g0 });
      body.position.set(at[0], g0, at[1]); where.x = at[0]; where.z = at[1]; where.yb = g0;
      return root;
    }
    const x = at[0] + drift[0] * t, z = at[1] + drift[1] * t;
    const ground = G(x, z);
    const yb = Math.max(ground + 1, lowY(t));
    const sw = 0.05 * Math.sin(TAU * t / 3.6 + seedPh);
    cnp.group.position.set(x, yb + (load ? 1.2 : 0), z);
    cnp.group.quaternion.setFromEuler(new THREE.Euler(sw, yaw, 0.6 * sw, 'YXZ'));
    // near the ground the cloth never goes below the terrain (a canopy hung low over a slope)
    cnp.update({ ...st, G: yb + (load ? 1.2 : 0) - ground < cnp.dims.top + 1 ? G : null });
    if (load) { load.position.set(x, yb + 0.35, z); load.rotation.set(sw, 0, 0); }
    body.position.set(x, yb, z); where.x = x; where.z = z; where.yb = yb;
    return root;
  }
  update(0);
  // fix1 (REVIEW_1 D4): the camera / QA subject is the canopy (the rig middle in the air, the sheet on the ground), not the
  // ground under it
  const rigH = (load ? 1.2 : 0) + cnp.dims.top + (load ? 0.5 : 0);
  const subjectAt = (t) => {
    update(t);
    if (lying) { const cx = at[0] + dw.x * 6.2, cz = at[1] + dw.z * 6.2; return [cx, G(cx, cz) + 0.3, cz]; }
    return [where.x, where.yb - (load ? 0.5 : 0) + rigH * 0.5, where.z];
  };
  return { root, update, radius: lying ? 5 : cnp.dims.Rin, height: lying ? 0.5 : rigH, snapped: true, contact: false, anchors: { body, canopy: cnp.group },
    positionAt: (t) => { update(t); return cnp.group.position.clone(); },
    subjectAt, subjectCy: lying ? 0.3 : rigH * 0.5, subjectTop: lying ? 0.7 : rigH };
}

// ── catalog + build ────────────────────────────────────────────────────────────────────────────────────────────────
export const CATALOG = {
  'para.jumper': { desc: 'a paratrooper in the air: exit -> free fall -> canopy deploy (eased, no pops) -> descent swinging under an X-type canopy -> landing; any kit (para_soe default) or a cast ref', fly: true, snap: false, contact: false, section: 'objects', tags: ['parachute', 'paratrooper', 'jumper', 'figure', 'ww2', 'soe', 'drop'], params: { ...JDEF }, height: 2.2, footprint: [0.8, 0.8],
    doc: 'Static-line drop of 1941: free fall is UPRIGHT, feet first, hands on the harness (not a skydiver arch). ' + JDOC + ' Cameras: one that falls WITH him (keys whose y follows positionAt(t), or WP1 freefall_follow) 6-8 m away, looking up 15-25 deg, FOV 38-45; canopies from below: the camera keeps falling (25-40 m/s, slowing) while they decelerate, so the canopies rise through the frame 20-35 m away; descent: match `descent` m/s, 18-30 m from the canopy so the whole rig (canopy + lines + man, ~10 m) fits. Never closer than 3 m to the figure.' },
  'para.stick': { desc: 'a stick of N paratroopers leaving one aircraft `spacing` s apart (each with its own canopy); anchors jumper_N / canopy_N', fly: true, snap: false, contact: false, section: 'objects', tags: ['parachute', 'paratroopers', 'stick', 'drop', 'ww2'], height: 2.2, footprint: [1, 1],
    params: { n: null, spacing: 0.9, jumpers: null, kit: 'para_soe', y: null, alt: 250, t_exit: null, t_deploy: null, phases: null, descent: 5.5, drift: null, vary: 0.5 },
    doc: 'Camera: on a stick target ONE jumper: objects:N.jumper_0 (the lead; jumper_1 ...), objects:N.rig_0 for a deploy inside a follow shot; objects:N alone = the whole stick as one rigid box (WP1 freefall_follow then frames the box and the lead leaves the frame). n jumpers (default the length of jumpers, else 2); spacing s between exits (0.9; the aircraft moves exit_speed x spacing between them); jumpers [{ref | kit, colors, t_exit, t_deploy, descent, at, y, ...}] per-jumper overrides; vary 0..1 per-jumper variation of descent, sway and yaw (0.5). Every para.jumper key applies to all of them: ' + JDOC },
  'para.canopy': { desc: 'an X-type round canopy (28 gores, vent, scalloped skirt, lines, risers): open | streamer | collapsed | deploy; load none | container', fly: true, snap: false, contact: false, section: 'objects', tags: ['parachute', 'canopy', 'silk'], height: 9, footprint: [6, 6],
    params: { state: 'open', alt: 30, y: null, t_deploy: 0.5, descent: 0, drift: null, load: null, color: 'olive', diameter: 8.5 },
    doc: 'at [x, z] + alt (m above the ground, 30) or y (absolute); state open | streamer | collapsed | deploy (opens at t_deploy, eased); descent m/s (0 = hanging still); drift [vx, vz]; load container (a supply container under it); color olive | white | khaki | sand | grey | camo | hex; diameter flat m (8.5). collapsed = LYING ON THE GROUND (the buried-parachute beat): the riser links at `at`, the crumpled cloth 5-10 m downwind (drift, else heading) on the terrain under every vertex, the lines over the snow to the links, the wind lifting it slowly; frame it from 6-12 m at eye level or from above. Camera templates frame the canopy itself (subjectAt: the rig middle in the air, the sheet on the ground).' },
};

export async function build(kind, item = {}, ctx = {}) {
  const seed = num(item.seed, 1);
  if (kind === 'para.canopy') return buildCanopyItem(item, ctx);
  if (kind === 'para.jumper') {
    const o = paramsOf(item);
    const J = buildJumper(o, ctx, 0, seed);
    const fig = J.fig;
    return {
      root: J.root, update: (t) => J.update(t), radius: 0.6, height: 1.9 * fig.rig.s, snapped: true, contact: false,
      anchors: { ...fig.anchors, body: J.body, canopy: J.canopyA, rig: J.rigA, jumper_0: J.body, canopy_0: J.canopyA, rig_0: J.rigA },
      figure: fig, character: fig.def?.id,
      positionAt: (t) => J.harness(t),
      subjectAt: (t) => J.focus(t), subjectCy: J.rigShot ? 4.2 : 1.1, subjectTop: J.rigShot ? 11 : 1.9,
      para: { plan: J.plan, state: (t) => { J.update(t); return { ...J.state }; } },
    };
  }
  if (kind === 'para.stick') {
    const P = { ...(item.params || {}), ...item };
    const n = clamp(Math.round(num(P.n, Array.isArray(P.jumpers) ? P.jumpers.length : 2)), 1, 12), sp = clamp(num(P.spacing, 0.9), 0.3, 6), vary = clamp(num(P.vary, 0.5), 0, 1);
    const base = paramsOf(item), hdg = num(base.heading, 0) * DEG, fwd = [Math.sin(hdg), -Math.cos(hdg)], vx = num(base.exit_speed, 45);
    const root = new THREE.Group(); root.name = 'para.stick';
    const list = [];
    // fix1 (D13): a stick that starts in free fall keeps its spacing: planJumper clamps a free-fall start's exit to <= -0.6 s,
    // so the computed exits are shifted together until the last one is there (explicit per-jumper t_exit stays as given)
    const ph0 = (Array.isArray(base.phases) && base.phases.length ? base.phases.map(String) : ['exit']);
    const start0 = ['exit', 'freefall', 'deploy', 'descent', 'landing'].find((q) => ph0.includes(q)) || 'exit';
    const tex = []; for (let i = 0; i < n; i++) { const per = Array.isArray(P.jumpers) ? (P.jumpers[i] || {}) : {}; tex.push(per.t_exit != null ? null : num(base.t_exit, start0 === 'freefall' ? -0.9 : 0.3) + i * sp); }
    let shift = 0; if (start0 === 'freefall') for (const v of tex) if (v != null) shift = Math.max(shift, v + 0.6);
    for (let i = 0; i < n; i++) {
      const per = Array.isArray(P.jumpers) ? (P.jumpers[i] || {}) : {};
      const r = (k) => hash(seed * 3.3 + i * 11.7 + k * 1.9) - 0.5;
      const o = { ...base, ...per };
      o.t_exit = per.t_exit != null ? num(per.t_exit, 0.3) : tex[i] - shift;
      if (base.t_deploy != null && per.t_deploy == null) o.t_deploy = num(base.t_deploy, 0) + i * sp + r(1) * 0.15 * vary;
      const at = Array.isArray(base.at) ? base.at.slice() : [0, 0];
      // the aircraft moved on between the exits (an exit start); for other starts the stick is spread the same way
      const dx = fwd[0] * vx * i * sp, dz = fwd[1] * vx * i * sp;
      if (at.length === 3) o.at = [at[0] + dx, at[1], at[2] + dz]; else o.at = [at[0] + dx, at[1] + dz];
      if (per.at) o.at = per.y != null ? [per.at[0], per.y, per.at[per.at.length === 3 ? 2 : 1]] : per.at;
      o.descent = num(per.descent, num(base.descent, 5.5) * (1 + 0.08 * r(2) * vary));
      o.sway = num(per.sway, num(base.sway, 0.6) * (1 + 0.5 * r(3) * vary));
      o.face = num(per.face, (base.face ?? 0) + 25 * r(4) * vary);
      const J = buildJumper(o, ctx, i, seed + i * 17);
      root.add(J.root); list.push(J);
    }
    const anchors = { body: list[0].body, canopy: list[0].canopyA };
    anchors.rig = list[0].rigA;
    list.forEach((J, i) => { anchors['jumper_' + i] = J.body; anchors['canopy_' + i] = J.canopyA; anchors['rig_' + i] = J.rigA; });
    return {
      root, update: (t) => { for (const J of list) J.update(t); return root; }, radius: 0.6, height: 1.9 * list[0].fig.rig.s, snapped: true, contact: false, anchors,
      figure: list[0].fig, positionAt: (t) => list[0].harness(t), positionsAt: (t) => list.map((J) => J.harness(t)),
      subjectAt: (t) => { const p = list[0].focus(t); for (let i = 1; i < list.length; i++) list[i].update(t); return p; }, subjectCy: list[0].rigShot ? 4.2 : 1.1, subjectTop: list[0].rigShot ? 11 : 1.9,
      para: { plans: list.map((J) => J.plan) },
    };
  }
  throw new Error('para.js: unknown kind ' + kind);
}
