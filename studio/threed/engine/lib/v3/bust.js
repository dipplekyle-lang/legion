// bust.js — Legion 3D v3, WP5 (V3_SPEC 2.5): figure.bust — a portrait bust cut from the dressed house mannequin.
// Faceless (the house rule): who it is reads from the silhouette alone — the cap, the collar and its tabs, the shoulder
// boards, the cross strap — and from a real archival photo cut in beside it (WP2 archive.*), never from a made-up face.
//   kit / ref / colors / headwear   the figure (default kit ss_officer; a cast ref keeps the character identical)
//   material  plaster | bronze | marble | painted (the kit's own cloth, a coloured statue) | dark (black lacquer / basalt)
//   mount     plinth (a stone column, top at plinth_h m, default 1.0) | floating (the cut at float_h m, default 1.05)
//   cut       chest (1.16) | waist (1.0) | m (reference figure height of the cut plane); default 1.1
//   turn      deg the head turns (0); chin deg up (+) / down (-) (4: a little arrogant)
//   light     optional built-in presentation light (noGovern; the general tool is WP3 light.spot):
//               { slit: '#ff2a14' | true, slit_w 0.045 m, slit_x m across the face (0.03), slit_from deg right of the axis (15),
//                 rim: '#ff3010' | '#3a62ff' (two small spots behind the shoulders), rim_i, key: '#ffffff' (a soft key) }
//   void      true: a black backdrop (inside-out sphere + matte floor) and a pitch-dark scene (res.pitchDark): the fern void
// Camera: eye level, 1.6-3 m (never a lit close-up under 1 m), 0.5 %/s push; FOV 30-40.
import * as THREE from 'three';
import * as R from '../human/rig.js';
import { buildCharacter, findCastDef } from '../human/cast.js';
import { patchMaterial } from '../shared/env.js';
import { clamp } from '../shared/util.js';
import './kit_ww2.js';
import { POSE_V3 } from '../human/actions_v3.js';
// fix1 (REVIEW_1 D3): a namespace import, so the WP0 stub (no registerKeep) and WP3's film.js both load; FILM.registerKeep
// tells a mono grade (void_blue, nocturne, archive_bw) to keep the slit's red
import * as FILM from '../../core/film.js';

const PI = Math.PI, DEG = PI / 180, TAU_ = PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const num = (v, d) => (v != null && Number.isFinite(+v) ? +v : d);
const hexOr = (v, d) => { if (v == null || v === true) return d; try { return new THREE.Color(v).getHex(); } catch (e) { return d; } };
const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const DEFP = { lArmZ: 0.07, rArmZ: -0.07, lElbow: -0.14, rElbow: -0.14, lLegY: 0.06, rLegY: -0.06, lLegZ: 0.015, rLegZ: -0.015 };

// marble: a few soft grey veins in a warm white (UVs are metres on the kit, so the veins run over the whole bust)
let MARBLE = null;
function marbleTex() {
  if (MARBLE) return MARBLE;
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'); g.fillStyle = '#f1eee8'; g.fillRect(0, 0, N, N);
  let s = 777; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 9; k++) {
    g.strokeStyle = `rgba(${110 + rnd() * 40}, ${108 + rnd() * 40}, ${112 + rnd() * 40}, ${0.12 + rnd() * 0.25})`; g.lineWidth = 0.6 + rnd() * 2.6;
    g.beginPath(); let x = rnd() * N, y = 0; g.moveTo(x, y);
    while (y < N) { x += (rnd() - 0.5) * 34; y += 10 + rnd() * 26; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1.6, 1.6);
  return (MARBLE = t);
}

// the bust shader: fragments below the cut plane are discarded; an optional slit of light (a gobo on the bust only:
// a vertical band of a directional light, soft-edged) is added after the scene's own lights
function bustPatch(U, gain = 1, spillK = 1) {
  const G = { uSlitGain: { value: gain }, uSpillK: { value: spillK } };
  return (sh) => {
    Object.assign(sh.uniforms, U, G);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBustW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vBustW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vBustW; uniform float uBustCut; uniform float uSlitGain; uniform float uSlitOn; uniform vec3 uSlitDir; uniform vec3 uSlitP; uniform vec3 uSlitN; uniform float uSlitW; uniform vec3 uSlitCol; uniform float uSpill; uniform float uSpillK;`)
      .replace(/void\s+main\s*\(\s*\)\s*\{/, (m) => `${m}\n  if (vBustW.y < uBustCut) discard;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  if (uSlitOn > 0.5) {
    vec3 sLv = normalize((viewMatrix * vec4(uSlitDir, 0.0)).xyz);
    float sNl = max(dot(normal, sLv), 0.0);
    float sD = abs(dot(vBustW - uSlitP, uSlitN));
    float sBand = 1.0 - smoothstep(uSlitW * 0.3, uSlitW * 0.5, sD);   // uSlitW = the band's full width
    vec3 sH = normalize(sLv + normalize(vViewPosition) * -1.0);
    float sSpec = pow(max(dot(normal, sH), 0.0), 40.0) * 0.6;
    reflectedLight.directDiffuse += max(diffuseColor.rgb, vec3(0.06)) * uSlitCol * sNl * sBand * uSlitGain;   // a slit reveals even black wool
    reflectedLight.directSpecular += uSlitCol * sSpec * sBand * sNl * uSlitGain;
    // fix1: the slit's soft spill (fern: the uniform reads as a dark red-brown form round the slit, never pure black);
    // weighted to the front-facing side and falling off with the distance from the band
    float sSp = exp(-sD / max(uSlitW * 5.0, 1e-3)) * 0.65 + 0.35;
    reflectedLight.indirectDiffuse += diffuseColor.rgb * uSlitCol * uSpill * sSp * (0.35 + 0.65 * sNl) * uSpillK;
  }`);
  };
}
function bustMaterial(kind, U, from, skin, isSkin = false, gain = null, head = false, spillK = null) {
  const p = { side: THREE.FrontSide };
  if (kind === 'bronze') Object.assign(p, { color: 0x6B4728, metalness: 0.86, roughness: 0.38 });
  else if (kind === 'marble') Object.assign(p, { color: 0xFFFFFF, map: marbleTex(), roughness: 0.24, metalness: 0 });
  else if (kind === 'dark') Object.assign(p, { color: 0x151517, roughness: 0.46, metalness: 0.18 });
  else if (kind === 'painted' && from && skin != null) Object.assign(p, { color: new THREE.Color(skin), roughness: 0.55, metalness: 0, normalMap: from.normalMap || null, normalScale: from.normalScale?.clone?.() });
  else if (kind === 'painted' && from) Object.assign(p, { color: from.color?.clone?.() ?? new THREE.Color(0x888888), map: from.map || null, normalMap: from.normalMap || null, normalScale: from.normalScale?.clone?.(), roughness: from.roughness ?? 0.8, metalness: from.metalness ?? 0, envMapIntensity: from.envMapIntensity ?? 1, side: from.side ?? THREE.FrontSide });
  else { const t = R.clothTex('plaster'); Object.assign(p, { color: 0xE6E1D7, map: t.map, normalMap: t.nrm, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.64, metalness: 0 }); }
  if (kind !== 'painted' && kind !== 'marble' && kind !== 'plaster' && from && from.normalMap) { p.normalMap = from.normalMap; p.normalScale = new THREE.Vector2(0.45, 0.45); }   // the cloth's weave stays under the finish
  // fix1 (D10): painted metal / patent (cap cords, badge, visor, buttons) goes satin: a coloured rim made sparks on them
  if (kind === 'painted' && from) { if ((p.metalness ?? 0) > 0.5) { p.metalness = 0.45; p.roughness = Math.max(p.roughness ?? 0.5, 0.6); } if ((p.roughness ?? 1) < 0.3) p.roughness = 0.32; }
  if (head && (kind === 'bronze' || kind === 'dark' || kind === 'marble')) p.roughness = Math.min(0.8, (p.roughness ?? 0.4) + 0.18);   // thin cords / brims spark under a rim
  const m = new THREE.MeshStandardMaterial(p);
  m.userData.progKey = 'bust_' + kind;
  // the slit is brightest on the face: cloth (the tunic) takes 55 % of it, the headwear 12 % (fix1 D9: the SS cap's
  // high saddle read as a tall red chimney in the band)
  // the spill (the slit's soft red round the band): little on the grey face (a red egg would drown the slit), more on
  // the dark cloth and the cap, so the uniform and the cap read as dim red forms (fern)
  return patchMaterial(m, bustPatch(U, gain ?? (isSkin ? 1 : 0.55), spillK ?? (isSkin ? 0.12 : head ? 0.6 : 0.8)));
}

export const CATALOG = {
  'figure.bust': {
    desc: 'a faceless portrait bust cut from a dressed figure (default kit ss_officer): plaster | bronze | marble | painted | dark, on a plinth or floating; optional slit / rim light and a black void',
    section: 'objects', tags: ['bust', 'statue', 'portrait', 'figure', 'void', 'ss', 'heydrich'], height: 1.8, footprint: [0.6, 0.5], contact: true,
    params: { kit: 'ss_officer', ref: null, material: 'plaster', mount: 'plinth', plinth_h: 1.0, float_h: 1.05, cut: 1.1, turn: 0, chin: 4, light: null, void: false, flank: null, dust: 0 },
    doc: 'Params: kit (ss_officer) or ref (a video cast id) + colors / headwear; material plaster | bronze | marble | painted | dark; mount plinth (plinth_h m, 1.0) | floating (float_h m = the cut height, 1.05); cut chest | waist | m (1.1); turn deg (head), chin deg (4); light {slit: colour, slit_w m (full band width 0.055), slit_x m across the face (0.034: over one eye), slit_from deg (15), slit_i (1.0), rim: colour, rim_i (3), rim_h m above the cut (0.25 shoulders; 0.75 = cap + head outline), key: colour, key_i, key_sweep deg (the key travels round the bust over the shot), spill (0.3: the soft red of the slit on the uniform and the face)}; dust 0..1 (motes drifting in the light); headwear none (bare-headed, like the fern bust); skin hex (head + hands under painted; grey by default with a slit); void true (black void + pitch dark); flank {n 2, kit civil_coat_1940s | refs [...], action aim_pistol_2h, t_in s, fade s (0.8), rim colour (#3a62ff), rim_i (30), dist m behind (2.4), spread m (1.45), turn deg inward (22), floor colour (#0a1640) | false}: the assassins who fade up behind him in blue rims. The antagonist portrait of the fern void beat: eye-level camera 1.6-3 m away, slow push 0.5 %/s, a red slit across the face (light.slit or WP3 light.spot cookie slit), blue-rim figures behind. It reads by its silhouette: keep the cap and the collar in a rim light. Never a lit close-up under 1 m. Under a mono grade (WP3 void_blue / nocturne / archive_bw) the slit registers itself as a keep_hue light and stays red; add look.keep_hue \'#ff2a14\' for any other red in the frame.',
  },
};

export async function build(kind, item = {}, ctx = {}) {
  const P = { ...(item.params || {}), ...item };
  let def = P.ref ? findCastDef(P.ref, ctx) : null;
  if (P.ref && !def) (ctx.warnings || []).push(`figure.bust: cast ref "${P.ref}" not in the video cast; using kit ${P.kit || 'ss_officer'}`);
  if (!def) def = { id: P.id || 'bust', kit: P.kit || 'ss_officer', colors: P.colors, headwear: P.headwear, accessories: P.accessories ?? [], build: P.build, signature: P.signature, variant: P.variant };
  // no pack / gun on a bust
  def = { ...def, accessories: (def.accessories || []).filter((a) => !/pack|static|reserve|rifle|sten|m16|ak47|carbine|musket|flag|lantern|briefcase/.test(String(a.kind ?? a))), pack: false };
  const res = buildCharacter(def, ctx), fig = res.fig, s = fig.rig.s;
  const turn = num(P.turn, 0) * DEG, chin = num(P.chin, 4) * DEG;
  fig._apply({ ...DEFP, lArmZ: 0.12, rArmZ: -0.12, lElbow: -0.18, rElbow: -0.18, chestX: -0.03, headX: -chin, headY: turn, lShape: 'relaxed', rShape: 'relaxed', weapon: 'sling' }, null);
  const cutRef = P.cut === 'chest' ? 1.16 : P.cut === 'waist' ? 1.0 : clamp(num(P.cut, 1.1), 0.8, 1.4), cutL = cutRef * s;
  const mount = P.mount === 'floating' || P.floating === true ? 'floating' : 'plinth';
  const G = ctx.ground?.height ? ctx.ground.height : () => 0;
  const at = Array.isArray(P.at) ? [num(P.at[0], 0), num(P.at[P.at.length === 3 ? 2 : 1], 0)] : [0, 0];
  const g0 = P.y != null && Number.isFinite(+P.y) ? +P.y : G(at[0], at[1]);
  const plinthH = clamp(num(P.plinth_h, 1.0), 0.2, 2.5), floatH = clamp(num(P.float_h, 1.05), 0.1, 3);
  const cutW = g0 + (mount === 'plinth' ? plinthH : floatH);
  const root = new THREE.Group(); root.name = 'figure.bust';
  const yaw = PI - num(item.heading, 0) * DEG;
  root.position.set(at[0], 0, at[1]); root.rotation.y = yaw;
  root.add(fig.group);
  fig.group.position.set(0, cutW - cutL, 0);
  // materials: one finish over everything (painted: each cloth keeps its colour), the cut plane discards below
  const U = { uBustCut: { value: cutW }, uSlitOn: { value: 0 }, uSlitDir: { value: V3(0, 0, 1) }, uSlitP: { value: V3() }, uSlitN: { value: V3(1, 0, 0) }, uSlitW: { value: 0.045 }, uSlitCol: { value: new THREE.Color(0, 0, 0) }, uSpill: { value: 0 } };
  const HEADWEAR_KEYS = /^(sscap|ssband|ssvisor|sssilver|cap|band|visor|silver|piping|hat|hatband|shell|hrim|hstrap|hcup)$/;
  const finish = String(P.material || 'plaster').toLowerCase(), cache = new Map();
  // the head and hands under a painted finish: `skin` (hex) or, with a slit light, a mid grey (a white egg would blow out)
  const skin = P.skin != null ? hexOr(P.skin, 0x8A8580) : (P.light && P.light.slit ? 0x8A847C : null);
  const slitOn = !!(P.light && P.light.slit);
  for (const m of fig.meshes) {
    const old = m.material;
    let nm = cache.get(old);
    if (!nm && slitOn && finish === 'painted' && m.name !== 'skin' && old?.color && (old.color.r + old.color.g + old.color.b) / 3 > 0.45) {
      // a white shirt collar in the void glows as a ring under the rims: in a slit portrait it goes to a dim grey
      nm = bustMaterial('painted', U, old, null, false, null, false, 0.15); nm.color.multiplyScalar(0.35); cache.set(old, nm);
    }
    if (!nm) { nm = bustMaterial(['plaster', 'bronze', 'marble', 'painted', 'dark'].includes(finish) ? finish : 'plaster', U, old, m.name === 'skin' ? skin : null, m.name === 'skin', HEADWEAR_KEYS.test(m.name) ? 0.12 : null, HEADWEAR_KEYS.test(m.name)); cache.set(old, nm); }
    m.material = nm; m.castShadow = true; m.receiveShadow = true;
  }
  // the cut face: the torso section (a superellipse a little proud of the cloth) and the two upper-arm sections
  fig.group.updateMatrixWorld(true);
  const capMat = (() => { const m0 = fig.meshes.find((m) => m.name === 'coat' || m.name === 'smock') || fig.meshes[0]; return m0 ? m0.material : bustMaterial(finish, U, null); })();
  const capMatSolid = patchMaterial(new THREE.MeshStandardMaterial({ color: capMat.color?.clone?.() ?? new THREE.Color(0xdddddd), roughness: capMat.roughness ?? 0.6, metalness: capMat.metalness ?? 0, map: finish === 'marble' ? marbleTex() : null, side: THREE.DoubleSide }));
  const sw = fig.rig.sw ?? 1, shape = new THREE.Shape(), M = 48;
  for (let j = 0; j <= M; j++) {
    const a = j / M * PI * 2, c = Math.cos(a), sn = Math.sin(a), e = 2.3;
    const x = Math.sign(c) * Math.abs(c) ** (2 / e) * 0.19 * s * sw, z = Math.sign(sn) * Math.abs(sn) ** (2 / e) * (sn > 0 ? 0.14 : 0.13) * s - 0.004 * s;
    if (j === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
  }
  const capG = new THREE.ShapeGeometry(shape, 1); capG.rotateX(-PI / 2);
  const cap = new THREE.Mesh(capG, capMatSolid); cap.position.set(0, cutW + 0.0015, 0); cap.name = 'bust_cut'; cap.receiveShadow = true;
  root.add(cap);
  const B = fig.rig.B;
  for (const sd of ['L', 'R']) {
    const a = B['arm' + sd].getWorldPosition(V3()), e = B['fore' + sd].getWorldPosition(V3());
    if ((a.y - cutW) * (e.y - cutW) < 0) {
      const u = (a.y - cutW) / (a.y - e.y), p = a.clone().lerp(e, u); root.worldToLocal(p);
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.062 * s, 20).rotateX(-PI / 2), capMatSolid); d.position.set(p.x, cutW + 0.0015, p.z); d.name = 'bust_cut'; root.add(d);
    }
  }
  // the mount
  const stone = patchMaterial(new THREE.MeshStandardMaterial({ color: finish === 'dark' ? 0x0E0E10 : finish === 'bronze' ? 0x2A2826 : 0x8F8B84, roughness: finish === 'dark' ? 0.55 : 0.82, metalness: 0 }));
  if (mount === 'plinth') {
    const pl = new THREE.Group(); pl.name = 'plinth';
    const add = (w, h, d, y) => { const m = new THREE.Mesh(R.rbox(w, h, d, Math.min(0.012, h / 3)), stone); m.position.y = y; m.castShadow = m.receiveShadow = true; pl.add(m); };
    add(0.5, 0.08, 0.42, g0 + 0.04); add(0.4, plinthH - 0.16, 0.32, g0 + 0.08 + (plinthH - 0.16) / 2); add(0.48, 0.05, 0.4, g0 + plinthH - 0.055); add(0.44, 0.03, 0.36, g0 + plinthH - 0.015);
    root.add(pl);
  }
  // presentation light (all noGovern: the governor must not dim a designed key on a face)
  const L = P.light || {};
  const lights = [];
  let keySp = null, keyBase = null;
  const head = B.head.getWorldPosition(V3()).add(V3(0, 0.08 * s, 0));
  if (L.slit) {
    const col = new THREE.Color(hexOr(L.slit, 0xFF2A14)), from = num(L.slit_from, 15) * DEG, inten = num(L.slit_i, 1.0);
    U.uSlitOn.value = 1; U.uSlitW.value = num(L.slit_w, 0.055) * s; U.uSlitCol.value.copy(col).multiplyScalar(inten);
    // the slit's light comes from the front, a little to the bust's right; the band is vertical, slit_x across the face
    const fw = V3(0, 0, 1).applyAxisAngle(V3(0, 1, 0), yaw), right = V3(-1, 0, 0).applyAxisAngle(V3(0, 1, 0), yaw);
    const dir = fw.clone().multiplyScalar(Math.cos(from)).addScaledVector(right, Math.sin(from)).normalize();
    U.uSlitDir.value.copy(dir);
    // the band's plane passes through the FRONT of the face (0.1 m before the head bone), slit_x to the bust's right: over
    // one eye. (Through the head centre the 15 deg slant put it 3 cm further out, off the face.)
    U.uSlitP.value.copy(head).addScaledVector(fw, 0.1 * s).addScaledVector(right, num(L.slit_x, 0.034) * s);
    U.uSlitN.value.copy(V3().crossVectors(dir, V3(0, 1, 0)).normalize());
    U.uSpill.value = num(L.spill, 0.3);
    // the keep-hue proxy: not a light (nothing is lit by it, no shader changes), just the colour + intensity the film
    // pass reads; it lives and dies with the bust (FILM attached())
    const keep = new THREE.Object3D(); keep.name = 'bust_slit_keep'; keep.color = col.clone(); keep.intensity = 1; keep.isLight = false;
    root.add(keep);
    try { FILM.registerKeep?.(keep); } catch (e) { /* stub or older film.js */ }
  }
  if (L.rim) {
    const col = hexOr(L.rim, 0xFF3010), ri = num(L.rim_i, 3);
    for (const side of [1, -1]) {
      const sp = new THREE.SpotLight(col, ri, 6, 0.55, 0.7, 2); sp.userData.noGovern = true; sp.name = 'bust_rim';
      // low and behind: a thin line on the shoulders and the arms, not on the cap (high rims made red 'horns' of its sides)
      const rh = num(L.rim_h, 0.25);   // m above the cut: 0.25 = the shoulder line; 0.7-0.8 = the cap and the head (a silhouette)
      // fix1: a shoulder rim (rim_h < 0.5) aims down and narrower, so its cone no longer outlines the egg head in red
      if (rh < 0.5) { sp.position.set(side * 0.8, cutW + rh - 0.02, -1.0); sp.target.position.set(side * 0.1, cutW + rh - 0.32, 0); sp.angle = 0.32; }
      else { sp.position.set(side * 0.8, cutW + rh, -1.0); sp.target.position.set(side * 0.1, cutW + rh - 0.05, 0); sp.angle = 0.42; }
      root.add(sp, sp.target); lights.push(sp);
    }
  }
  if (L.key) {
    const sp = new THREE.SpotLight(hexOr(L.key, 0xFFFFFF), num(L.key_i, 5), 8, 0.5, 0.8, 2); sp.userData.noGovern = true; sp.name = 'bust_key';
    sp.position.set(-1.0, cutW + 1.4, 1.8); sp.target.position.set(0, cutW + 0.35, 0); root.add(sp, sp.target); lights.push(sp);
    keySp = sp; keyBase = sp.position.clone();
  }
  // fix1 (D11): life for the museum / dossier busts: key_sweep deg (the key light travels round the bust over the shot,
  // smootherstep: the light slides over the folds) and dust 0..1 (motes drifting through the light, a pure function of t)
  const keySweep = num(L.key_sweep, 0) * DEG, dur = num(ctx.dur, 4);
  let dust = null;
  const dustK = clamp(num(P.dust, 0), 0, 1);
  if (dustK > 0) {
    const n = Math.round(60 + 300 * dustK), pos = new Float32Array(n * 3), seedA = new Float32Array(n * 4);
    let sd = 1234; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) seedA.set([rnd(), rnd(), rnd(), rnd()], i * 4);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const dcol = new THREE.Color(hexOr(L.key || L.rim || L.slit, 0xFFE8C8));
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const cg = cv.getContext('2d');
    const rg = cg.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    cg.fillStyle = rg; cg.fillRect(0, 0, 32, 32);
    const m = new THREE.PointsMaterial({ color: 0xffffff, vertexColors: true, size: 0.018, map: new THREE.CanvasTexture(cv), sizeAttenuation: true, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    dust = new THREE.Points(g, m); dust.name = 'bust_dust'; dust.frustumCulled = false; dust.userData.noQA = true; dust.renderOrder = 3; root.add(dust);
    dust.userData.seed = seedA; dust.userData.n = n; dust.userData.col = dcol;
  }
  const _ax = V3(), _ap = V3(), _q3 = V3();
  const dustAt = (t) => {
    if (!dust) return;
    const S = dust.userData.seed, n = dust.userData.n, P3 = dust.geometry.attributes.position, C3 = dust.geometry.attributes.color, dc = dust.userData.col;
    // the motes glow only inside the key's beam (distance to its axis), else near the bust's light (no key: a soft ball)
    const beam = !!keySp; if (beam) { _ap.copy(keySp.position); _ax.copy(keySp.target.position).sub(_ap).normalize(); }
    for (let i = 0; i < n; i++) {
      const a = S[i * 4], b = S[i * 4 + 1], c = S[i * 4 + 2], d = S[i * 4 + 3];
      const x = (a - 0.5) * 1.6 + 0.05 * Math.sin(0.3 * t * TAU_ * (0.4 + d) + 6 * c);
      const y = cutW - 0.2 + ((b + 0.018 * t * (0.3 + c)) % 1) * 1.4;
      const z = (c - 0.5) * 1.4 + 0.05 * Math.cos(0.23 * t * TAU_ * (0.5 + a) + 5 * d);
      P3.setXYZ(i, x, y, z);
      let bd;
      if (beam) { _q3.set(x, y, z).sub(_ap); const along = _q3.dot(_ax); _q3.addScaledVector(_ax, -along); bd = Math.exp(-((_q3.length() / (0.12 + 0.3 * Math.max(0, along) / 2.4)) ** 2)); }
      else bd = Math.exp(-((Math.hypot(x, y - cutW - 0.4, z) / 0.7) ** 2));
      const tw = (0.45 + 0.55 * Math.sin(TAU_ * (0.35 + 0.5 * d) * t + 9 * a) ** 2) * bd;
      C3.setXYZ(i, dc.r * tw, dc.g * tw, dc.b * tw);
    }
    P3.needsUpdate = true; C3.needsUpdate = true;
  };
  // the void: a black world around the bust and a matte black floor; the scene goes pitch dark (no exposure lift)
  let pitchDark = false;
  if (P.void === true || P.void === 'black') {
    pitchDark = true;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.position.set(0, g0, 0); sky.renderOrder = -10; sky.userData.noQA = true; sky.name = 'bust_void'; root.add(sky);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-PI / 2), patchMaterial(new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 })));
    floor.position.y = g0 + 0.004; floor.receiveShadow = true; floor.userData.noQA = true; floor.name = 'bust_floor'; root.add(floor);
  }
  // the flank (fern S1, 0:38): two assassins behind him on both sides, hats and coats, pistols up in both hands, invisible
  // in the void until their blue rims fade up at t_in (smootherstep over `fade` s) with a dark-blue floor glow
  const F = P.flank === true ? {} : (P.flank && typeof P.flank === 'object' ? P.flank : null);
  const flankLights = [], flankFigs = [], flankAnchors = {};
  let flankFloor = null, flankT0 = 0, flankFade = 0.8;
  if (F) {
    const n = clamp(Math.round(num(F.n, 2)), 1, 4), dist = num(F.dist, 2.4), spread = num(F.spread, 1.45);
    const rimCol = hexOr(F.rim, 0x3A62FF), rimI = num(F.rim_i, 30);
    flankT0 = num(F.t_in, 0); flankFade = Math.max(0.05, num(F.fade, 0.8));
    const act = String(F.action || 'aim_pistol_2h');
    for (let i = 0; i < n; i++) {
      const side = (i % 2 ? 1 : -1), row = Math.floor(i / 2);
      let fd = Array.isArray(F.refs) && F.refs[i] ? findCastDef(F.refs[i], ctx) : null;
      if (Array.isArray(F.refs) && F.refs[i] && !fd) (ctx.warnings || []).push(`figure.bust flank: cast ref "${F.refs[i]}" not in the video cast; using kit ${F.kit || 'civil_coat_1940s'}`);
      if (!fd) fd = { id: 'flank_' + i, kit: F.kit || 'civil_coat_1940s', colors: F.colors, variant: i % 2 ? 'collar_up' : '', accessories: act === 'aim_pistol_2h' ? ['pistol'] : [] };
      else if (act === 'aim_pistol_2h') fd = { ...fd, accessories: [...new Set([...(fd.accessories || []).map((a) => a.kind ?? a), 'pistol'])] };
      const r2 = buildCharacter(fd, ctx), f2 = r2.fig;
      const pose = act === 'aim_pistol_2h' ? POSE_V3.aim_pistol_2h() : act === 'stand' ? { lShape: 'relaxed', rShape: 'relaxed' } : (POSE_V3[act] ? POSE_V3[act](0, i) : {});
      f2._apply({ ...DEFP, ...pose }, null);
      f2.userData_pose = pose; f2.userData_ph = i * 2.3 + 0.7;
      const x = side * spread * (1 + 0.55 * row), z = -dist - 0.9 * row;
      f2.group.position.set(x, g0, z);
      f2.group.rotation.y = -side * num(F.turn, 22) * DEG;            // turned in toward him, the pistols across the frame
      root.add(f2.group); flankFigs.push(f2);
      f2.group.updateMatrixWorld(true);
      flankAnchors['flank_' + i] = f2.rig.B.chest;
      // two rims from behind: one outside-high (the hat, the shoulder line), one inside-low (the coat edge, the arms)
      const tgt = V3(x, g0 + 1.35 * f2.rig.s, z);
      for (const [dx, dy, dz, k] of [[side * 1.1, 2.3, -1.7, 1], [-side * 0.5, 1.2, -1.9, 0.6], [side * 1.4, 1.9, 1.6, 0.35]]) {
        const sp = new THREE.SpotLight(rimCol, 0, 7, 0.5, 0.75, 2); sp.userData.noGovern = true; sp.name = 'bust_flank_rim'; sp.castShadow = false;
        sp.position.set(x + dx, g0 + dy, z + dz); sp.target.position.copy(tgt); root.add(sp, sp.target);
        flankLights.push({ L: sp, I: rimI * k });
      }
      f2.group.visible = false;
    }
    // the floor glow: an emissive radial gradient under them (the void's only "ground")
    if (F.floor !== false) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
      // fix1 (D10): a soft gaussian-like pool that is gone at 0.8 of the radius (the old linear ramp showed a hard disc edge)
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      for (const [q, a] of [[0, 1], [0.2, 0.82], [0.4, 0.45], [0.6, 0.14], [0.72, 0.035], [0.8, 0]]) gr.addColorStop(q, `rgba(255,255,255,${a})`);
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(cv);
      const fm = new THREE.MeshBasicMaterial({ color: hexOr(F.floor, 0x0A1640), alphaMap: tex, transparent: true, opacity: 0, depthWrite: false, fog: false });
      flankFloor = new THREE.Mesh(new THREE.PlaneGeometry(spread * 4.6, dist * 3.0).rotateX(-PI / 2), fm);
      flankFloor.position.set(0, g0 + 0.008, -dist * 0.55); flankFloor.renderOrder = 1; flankFloor.userData.noQA = true; flankFloor.name = 'bust_flank_floor';
      root.add(flankFloor);
    }
  }
  const update = (t = 0) => {
    if (keySp && keySweep) { const a = keySweep * smr(t / Math.max(0.5, dur)); keySp.position.copy(keyBase).applyAxisAngle(V3(0, 1, 0), a); }
    dustAt(t);
    if (!F) return root;
    const k = smr((t - flankT0) / flankFade);
    for (const f of flankFigs) {
      f.group.visible = k > 0.002;
      // fix1 (D10): they breathe (chest 0.6-0.9 %) and the aim drifts a few mm: living men, not statues
      if (f.group.visible && f.userData_pose) {
        const ph = f.userData_ph, b = Math.sin(TAU_ * 0.27 * t + ph), w = Math.sin(TAU_ * 0.11 * t + 1.7 * ph);
        f._apply({ ...DEFP, ...f.userData_pose, chestX: (f.userData_pose.chestX ?? 0) + 0.012 * b, spineX: (f.userData_pose.spineX ?? 0) + 0.006 * b, headY: (f.userData_pose.headY ?? 0) + 0.02 * w }, null);
        f.update?.(t, {});
      }
    }
    for (const l of flankLights) l.L.intensity = l.I * k;
    if (flankFloor) { flankFloor.material.opacity = 0.9 * k; flankFloor.visible = k > 0.002; }
    return root;
  };
  update(0);
  root.updateMatrixWorld(true);
  const breathe = (t) => 0;   // a bust is still: the camera and the light carry the motion
  // the camera / QA subject: the bust itself (cut -> cap), not the root's box (the void sphere is 60 m wide)
  const topY = cutW + (1.86 * s - cutL), focusP = [at[0], cutW + (topY - cutW) * 0.55, at[1]];
  return {
    root, update, radius: 0.3, height: (mount === 'plinth' ? plinthH : floatH) + (1.85 * s - cutL),
    subjectAt: () => focusP.slice(), subjectCy: focusP[1] - g0, subjectTop: topY - g0,
    snapped: true, contact: mount === 'plinth', pitchDark,
    anchors: { ...fig.anchors, ...flankAnchors, body: root, head: fig.anchors.head, face: fig.anchors.head },
    figure: fig, character: def.id, bust: { cut: cutW, finish, mount, breathe },
  };
}
