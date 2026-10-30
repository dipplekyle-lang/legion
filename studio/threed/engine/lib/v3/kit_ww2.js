// kit_ww2.js — Legion 3D v3, WP5 (V3_SPEC 2.5): the Operation Anthropoid people.
//   kits:        para_soe          SOE / Czechoslovak paratrooper of 1941: rimless para helmet, Denison smock (brush-stroke
//                                  camouflage, knitted cuffs, four pockets), baggy jump trousers bloused over jump boots,
//                                  the X-type harness (shoulder straps, chest strap, quick-release box, leg loops) and the
//                                  canvas X-type pack on the back with the static line stowed on it
//                ss_officer        SS officer (Heydrich stand-in): high-fronted peaked cap, open-collar tunic with collar
//                                  tabs, white shirt + black tie, silver shoulder boards, four pleated pockets, Sam Browne
//                                  belt + cross strap, holster, breeches and high-gloss riding boots. No symbols.
//                civil_coat_1940s  a 1940s civilian: double-breasted knee-length overcoat with wide lapels (or the collar
//                                  turned up: variant 'collar_up'; a belt: 'belted'), shirt and tie, dark fedora, shoes
//   headwear:    para_helmet (rimless dome, rubber edge, Y chinstraps + chin cup), ss_cap (peaked cap, high saddle front)
//   accessories: chute_pack, reserve (chest pack; the X-type had none: off by default), static_line, harness, sten (Sten
//                Mk II on the rig's weapon carry modes: sling | aim | port | low)
// Extends lib/human/kits.js (KITS, HEADWEAR, ACCESSORIES) and rig.js (WEAPON) by mutation at load time, like kit_sp.js.
// Adds no kind and touches no existing entry: a spec that does not name these kits renders exactly as before.
import * as THREE from 'three';
import * as R from '../human/rig.js';
import { KITS, ACCESSORIES, HEADWEAR, KIT_PARTS as KP, PROF, SK } from '../human/kits.js';
import { CATALOG as CAST_CAT } from '../human/cast.js';

const { V3, TAU, lerp, sstep, clamp } = R;
const PI = Math.PI, DS = THREE.DoubleSide;
const scaleRows = (rows, kx, kz = kx) => rows.map(([y, rx, zf, zb, cz]) => [y, rx * kx, zf * kz, zb * kz, cz]);

// ── Denison smock camouflage: a sand / olive ground with brown and green brush strokes (UVs are in metres) ──────────
const CAMO = {};
function camoTex(base, c1, c2) {
  const key = [base, c1, c2].join('|');
  if (CAMO[key]) return CAMO[key];
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d');
  const hex = (h) => '#' + new THREE.Color(h).getHexString();
  g.fillStyle = hex(base); g.fillRect(0, 0, N, N);
  let s = 9173; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // brush strokes: long soft-edged diagonal smears, wrapped so the tile repeats without a seam
  const stroke = (col, n, wMin, wMax) => {
    g.fillStyle = hex(col);
    for (let i = 0; i < n; i++) {
      const x = rnd() * N, y = rnd() * N, len = 30 + rnd() * 70, w = wMin + rnd() * (wMax - wMin), a = -0.9 + (rnd() - 0.5) * 0.5;
      for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
        g.save(); g.translate(x + dx, y + dy); g.rotate(a);
        g.beginPath();
        g.moveTo(-len / 2, 0);
        g.bezierCurveTo(-len / 4, -w * (0.7 + rnd() * 0.5), len / 4, -w * (0.8 + rnd() * 0.4), len / 2, -w * 0.1);
        g.bezierCurveTo(len / 4, w * (0.7 + rnd() * 0.4), -len / 4, w * (0.6 + rnd() * 0.5), -len / 2, 0);
        g.fill(); g.restore();
      }
    }
  };
  g.globalAlpha = 0.85; stroke(c1, 26, 5, 11);
  g.globalAlpha = 0.8; stroke(c2, 20, 4, 9);
  g.globalAlpha = 1;
  // cotton drill grain: fine noise + faint diagonal twill
  const id = g.getImageData(0, 0, N, N), d = id.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = (y * N + x) * 4, tw = 0.96 + 0.04 * Math.sin((x + y) * 0.9), n = 0.92 + rnd() * 0.08;
    d[k] *= tw * n; d[k + 1] *= tw * n; d[k + 2] *= tw * n;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.repeat.set(1 / 0.55, 1 / 0.55);
  return (CAMO[key] = t);
}
function camoMat(c, key, base, c1, c2, o = {}) {
  const m = c.mat(key, 'serge', 0xFFFFFF, { roughness: o.rough ?? 0.95, side: DS }, 1, 0);
  if (!m.userData.camo) { m.map = camoTex(base, c1, c2); m.color.setHex(0xFFFFFF); m.userData.camo = true; m.needsUpdate = true; }
  return m;
}
const darker = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return c.getHex(); };
const shift = (hex, dh, ds, dl) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL((h.h + dh + 1) % 1, clamp(h.s + ds), clamp(h.l + dl)); return c.getHex(); };

// ── the X-type harness, pack, reserve and static line (reference units; c.at = the garment surface) ──────────────────
function harnessMat(c) { if (!c.M.harness) c.mat('harness', 'web', c.def?.colors?.harness ? KP.hexOf(c.def.colors.harness, 0x8E896A) : 0x8E896A, { roughness: 0.92 }, 0.6, 0.03); return 'harness'; }
function harness(c) {
  if (c.extras.harness) return; c.extras.harness = true;
  const key = harnessMat(c), at = c.at, B = c.rig.B, tw = c.tw;
  const off = 0.016;
  for (const side of [1, -1]) {
    // main lift web: from the back over the shoulder, down the chest to the quick-release box
    R.strap(c.kit, key, [at(1.28, 1.5 * PI + side * 0.42, 0.02), at(1.4, 1.5 * PI + side * 0.5, 0.016), V3(side * 0.125, 1.478, -0.012),
      at(1.42, PI / 2 - side * 0.62, off), at(1.32, PI / 2 - side * 0.42, off), at(1.2, PI / 2 - side * 0.2, off + 0.002), at(1.125, PI / 2 - side * 0.05, off + 0.004)], 0.044, 0.004, tw, V3(0, 0, 1));
    // leg strap: from the box down the front of the hip and round the thigh
    const H = c.ref('thigh' + (side > 0 ? 'L' : 'R')), K = c.ref('shin' + (side > 0 ? 'L' : 'R'));
    const y = 0.8, t = (H.y - y) / (H.y - K.y), cx = lerp(H.x, K.x, t), cz = lerp(H.z, K.z, t) + 0.004;
    const ring = new THREE.TorusGeometry(0.104, 0.0075, 5, 24); ring.rotateX(PI / 2); ring.scale(1, 1, 1.06); ring.rotateX(-0.18); ring.translate(cx, y, cz);
    c.kit.add(key, ring, B['thigh' + (side > 0 ? 'L' : 'R')]);
    const thighW = (x2, y2) => { const k = sstep(0.98, 0.86, y2); return [[B.pelvis, 1 - k], [B['thigh' + (side > 0 ? 'L' : 'R')], k]]; };
    R.strap(c.kit, key, [at(1.11, PI / 2 - side * 0.12, off + 0.004), V3(side * 0.07, 0.99, 0.15), V3(cx - side * 0.02, 0.86, cz + 0.098), V3(cx + side * 0.02, 0.8, cz + 0.104)], 0.04, 0.004, thighW, V3(0, 0, 1));
  }
  // chest strap
  R.strap(c.kit, key, [at(1.3, PI / 2 - 0.62, off + 0.006), at(1.3, PI / 2 - 0.3, off + 0.008), at(1.3, PI / 2, off + 0.009), at(1.3, PI / 2 + 0.3, off + 0.008), at(1.3, PI / 2 + 0.62, off + 0.006)], 0.036, 0.004, tw, V3(0, 1, 0));
  // waist strap round the back
  R.band(c.kit, key, at, 1.06, 0.036, 0.014, tw);
  // quick-release box: a round alloy box with the turning plate
  const qr = new THREE.CylinderGeometry(0.04, 0.042, 0.016, 20); qr.rotateX(PI / 2);
  R.placeBox(c.kit, 'metal', qr, at, 1.12, PI / 2, off + 0.014, tw);
  const qp = new THREE.CylinderGeometry(0.026, 0.026, 0.006, 16); qp.rotateX(PI / 2);
  R.placeBox(c.kit, 'metal', qp, at, 1.12, PI / 2, off + 0.025, tw);
  // the lift-web adjusters on the chest
  for (const side of [1, -1]) R.placeBox(c.kit, 'metal', R.rbox(0.05, 0.022, 0.008, 0.003), at, 1.36, PI / 2 - side * 0.52, off + 0.006, tw);
}
function chutePack(c) {
  if (c.extras.pack) return; c.extras.pack = true;
  harness(c);
  c.mat('pack', 'serge', KP.hexOf(c.def?.colors?.pack, 0x55553D), { roughness: 0.95 }, 1, 0.04);
  const B = c.rig.B, at = c.at, w = () => [[B.chest, 0.72], [B.spine, 0.28]];
  // the X-type pack: a canvas bag from the shoulder blades to the small of the back, pulled in round its flaps
  const g = R.rbox(0.36, 0.44, 0.15, 0.045, 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const bulge = 1 + 0.12 * (1 - (2 * x / 0.36) ** 2) * (1 - (2 * y / 0.44) ** 2); P.setZ(i, z > 0 ? z * bulge : z); }
  g.computeVertexNormals();
  R.placeBox(c.kit, 'pack', g, at, 1.22, 1.5 * PI, 0.085, w);
  // flaps: the top closing flap and the side flaps, a few mm proud
  R.placeBox(c.kit, 'pack', R.rbox(0.37, 0.07, 0.03, 0.012), at, 1.42, 1.5 * PI, 0.155, w, -0.25);
  for (const side of [1, -1]) R.placeBox(c.kit, 'pack', R.rbox(0.03, 0.36, 0.12, 0.01), at, 1.22, 1.5 * PI + side * 0.62, 0.1, w);
  // pack straps over the bag
  harnessMat(c);
  for (const yy of [1.1, 1.33]) R.placeBox(c.kit, 'harness', R.rbox(0.38, 0.03, 0.17, 0.006), at, yy, 1.5 * PI, 0.086, w);
  c.extras.packTop = 1.46;
}
function staticLine(c) {
  if (c.extras.staticLine) return; c.extras.staticLine = true;
  chutePack(c);
  c.mat('sline', 'web', KP.hexOf(c.def?.colors?.static_line, 0xA79A6A), { roughness: 0.9 }, 0.5, 0);
  const B = c.rig.B, at = c.at, w = () => [[B.chest, 0.8], [B.spine, 0.2]];
  // stowed in zigzag loops under the elastic on the top of the pack, the snap hook over the right shoulder
  const pts = [];
  for (let k = 0; k < 5; k++) { const a = 1.5 * PI + (k % 2 ? 0.42 : -0.42); pts.push(at(1.39 - k * 0.014, a, 0.17)); }
  R.strap(c.kit, 'sline', pts, 0.03, 0.004, w, V3(0, 0, -1));
  R.strap(c.kit, 'sline', [at(1.38, 1.5 * PI - 0.42, 0.17), at(1.45, 1.5 * PI - 0.62, 0.05), V3(-0.13, 1.5, -0.04), at(1.42, PI / 2 - 0.78, 0.02)], 0.03, 0.004, (x, y, z) => [[B.chest, 0.6], [B.clavR, 0.4]], V3(0, 1, 0));
  R.placeBox(c.kit, 'metal', R.rbox(0.03, 0.07, 0.015, 0.006), at, 1.4, PI / 2 - 0.8, 0.03, (x, y, z) => [[B.chest, 0.6], [B.clavR, 0.4]], -0.4);
}
function reserve(c) {
  if (c.extras.reserve) return; c.extras.reserve = true;
  harness(c);
  c.mat('pack', 'serge', KP.hexOf(c.def?.colors?.pack, 0x55553D), { roughness: 0.95 }, 1, 0.04);
  R.placeBox(c.kit, 'pack', R.rbox(0.3, 0.16, 0.11, 0.03, 2), c.at, 1.2, PI / 2, 0.072, c.tw);
  R.placeBox(c.kit, 'metal', R.rbox(0.05, 0.03, 0.01, 0.004), c.at, 1.2, PI / 2 + 0.25, 0.13, c.tw);   // the rip-cord handle
}

// ── Sten Mk II: +Z to the muzzle, +Y up, origin at the right hand's grip (the stock's wrist behind the trigger) ─────
R.WEAPON.sten = {
  len: 0.76, butt: 0.3, grips: { r: V3(0, -0.02, 0.0), l: V3(-0.02, 0.0, 0.24) }, swivel: [V3(0, -0.012, 0.3), V3(0, -0.07, -0.26)],
  build(add, K) {
    add(K.steel, R.rod(V3(0, 0.03, -0.04), V3(0, 0.03, 0.3), 0.017, 0.017, 12));                   // receiver tube
    add(K.steel, R.rod(V3(0, 0.03, 0.3), V3(0, 0.03, 0.42), 0.014, 0.014, 10));                    // barrel sleeve
    add(K.steel, R.rod(V3(0, 0.03, 0.42), V3(0, 0.03, 0.47), 0.008, 0.008, 8));                    // muzzle
    add(K.steel, R.rbox(0.06, 0.012, 0.03, 0.003).translate(0, 0.03, 0.15));                       // magazine housing collar
    add(K.steel, R.rbox(0.2, 0.034, 0.018, 0.004).translate(-0.115, 0.03, 0.15));                  // side magazine (left)
    add(K.steel, R.rbox(0.03, 0.05, 0.03, 0.004).translate(0, -0.005, 0.0));                       // trigger group
    const tg = new THREE.TorusGeometry(0.016, 0.003, 5, 12, PI); tg.rotateY(PI / 2); tg.rotateX(PI); tg.translate(0, -0.02, 0.02); add(K.steel, tg);
    add(K.steel, R.rod(V3(0, 0.025, -0.04), V3(0, -0.02, -0.3), 0.007, 0.007, 8));                 // skeleton stock tube
    add(K.steel, R.rod(V3(0, -0.02, -0.3), V3(0, -0.085, -0.3), 0.006, 0.006, 6));
    add(K.steel, R.rbox(0.03, 0.09, 0.012, 0.004).translate(0, -0.06, -0.305));                    // butt plate
    add(K.steel, R.rod(V3(0, -0.075, -0.3), V3(0, -0.01, -0.05), 0.005, 0.005, 6));
  },
};
function sten(c) {
  if (c.extras.props.weapon) return;
  c.mat('wsteel', null, 0x2A2C2B, { roughness: 0.42, metalness: 0.75 }, 0.2, 0);
  if (!c.M.strap) c.mat('strap', 'web', 0x6E6A4C, { roughness: 0.95 }, 0.5);
  const WB = R.buildWeapon(c.kit, c.rig, 'sten', { wood: 'wsteel', steel: 'wsteel', strap: 'strap' });
  c.extras.props.weapon = R.weaponPlacer(c.rig, WB);
  c.extras.armed = true;
}
Object.assign(ACCESSORIES, {
  chute_pack: chutePack, parachute_pack: chutePack, reserve, reserve_chute: reserve, static_line: staticLine, harness, sten, sten_gun: sten,
});

// ── headwear ────────────────────────────────────────────────────────────────────────────────────────────────────────
// British airborne helmet (Mk II): a rimless steel dome, a rubber edge, Y chinstraps meeting at a leather chin cup
HEADWEAR.para_helmet = (c) => {
  c.mat('shell', 'steel', KP.hexOf(c.def?.colors?.helmet, 0x4C4C38), { roughness: 0.8, side: DS }, 1.2, 0.03);
  c.mat('hrim', null, 0x1A1917, { roughness: 0.7 }, 0.4, 0);
  c.mat('hstrap', 'web', 0x5E5A40, { roughness: 0.95 }, 0.5, 0);
  c.mat('hcup', 'leather', 0x3A2A1C, { roughness: 0.6 }, 0.3, 0);
  const B = c.rig.B, C = V3(0, 1.66, 0.012), Rr = V3(0.119, 0.15, 0.137), m = R.getDetail() < 1 ? 24 : 44;
  const rimY = (a) => 1.676 + 0.012 * Math.max(0, Math.sin(a)) - 0.016 * Math.max(0, -Math.sin(a)) ** 1.5;
  const rows = R.domeRows(C, Rr, rimY, [[() => 0.004, () => -0.003]], R.getDetail() < 1 ? 7 : 11, m);
  c.kit.add('shell', R.loft(rows), B.head);
  const rim = rows[rows.length - 1];
  c.kit.add('hrim', R.tube([...rim, rim[0]].map((p) => p.clone()), 0.0068, 6), B.head);
  // fix1 (REVIEW_1 D5): the Y straps run down the side of the head behind the cheek and the chin strap UNDER the jaw to a
  // small cup under the chin (they crossed the faceless face as a black X with a gag-like cup on it)
  for (const side of [1, -1]) {
    const front = V3(side * 0.1, 1.665, 0.04), back = V3(side * 0.106, 1.655, -0.06), join = V3(side * 0.06, 1.596, 0.0);
    R.strap(c.kit, 'hstrap', [front, V3(side * 0.075, 1.625, 0.022), join], 0.011, 0.002, B.head, V3(side, 0, 0));
    R.strap(c.kit, 'hstrap', [back, V3(side * 0.077, 1.62, -0.03), join], 0.011, 0.002, B.head, V3(side, 0, 0));
    R.strap(c.kit, 'hstrap', [join, V3(side * 0.04, 1.556, 0.02), V3(side * 0.015, 1.538, 0.04)], 0.01, 0.002, B.head, V3(side, -0.6, 0).normalize());
  }
  c.kit.add('hcup', R.sphereG(0.016, 0, 1.535, 0.044, 1.25, 0.75, 0.9, 12, 8), B.head);
};
// the SS peaked cap: the Schirmmuetze with a high saddle front (the crown raised in front), black band, silver piping
HEADWEAR.ss_cap = (c) => {
  const crown = KP.hexOf(c.def?.colors?.hat, c.col.coat);
  KP.hatMat(c, 'sscap', crown); KP.hatMat(c, 'ssband', 0x0B0B0C);
  c.mat('ssvisor', null, 0x050505, { roughness: 0.08, envMapIntensity: 1.3, side: DS }, 0.3, 0);
  c.mat('sssilver', null, 0xC9CAC4, { roughness: 0.3, metalness: 0.92 }, 0.2, 0);
  const orig = c.kit.add;
  // raise the front of the crown (and the badge on it): the saddle is the cap's whole silhouette
  const lift = (g) => { const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i), z = P.getZ(i); const k = sstep(1.735, 1.8, y) * sstep(-0.02, 0.13, z); P.setY(i, y + 0.03 * k); P.setZ(i, z + 0.01 * k); } g.computeVertexNormals(); return g; };
  // fix1 (REVIEW_1 note): the cap badge is a plain oval by default (no eagle: spec 2.5 needs no symbols); variant
  // 'eagle' keeps the rig's eagle
  const keepEagle = String(c.def?.variant || '').includes('eagle');
  const isEagle = (g) => { g.computeBoundingBox(); const b = g.boundingBox, w = b.max.x - b.min.x; return (b.min.y + b.max.y) / 2 > 1.765 && w > 0.03 && w < 0.08; };
  const plainBadge = () => { const g = new THREE.CylinderGeometry(1, 1, 0.0018, 20); g.rotateX(PI / 2); g.scale(0.015, 0.0105, 1); g.rotateX(-0.42); g.translate(0, 1.787, 0.146); return g; };
  c.kit.add = function (key, g, w) {
    if (key === 'sssilver' && !keepEagle && isEagle(g)) g = plainBadge();
    if (key === 'sscap' || (key === 'sssilver' && g.attributes.position.getY(0) > 1.74)) lift(g);
    return orig.call(this, key, g, w);
  };
  try { R.buildSchirm(c.kit, c.rig, { band: 'ssband', cap: 'sscap', visor: 'ssvisor', silver: 'sssilver', piping: 'sssilver' }); } finally { c.kit.add = orig; }
};

// the 1940s fedora: a teardrop crown with the centre crease and two front pinches, a snap brim (down at the front, up at
// the back), a broad band. kits.js `fedora` is a round lathe (a bowler-like dome from the side): this one reads as the
// 1942 assassins' hats in silhouette and in a rim light
HEADWEAR.fedora_40s = (c) => {
  KP.hatMat(c, 'hat', KP.hexOf(c.def?.colors?.hat, c.col.hat ?? 0x2B2725), 'melton', { rough: 0.85 });
  c.mat('hatband', 'sateen', 0x0F0D0C, { roughness: 0.4 }, 0.3, 0);
  const deform = (g) => {
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const zc = z - 0.012, r = Math.hypot(x, zc / 1.2);
      if (r < 0.097) {
        // crown: the crease along the front-back line, the two front pinches (a teardrop from above)
        const top = sstep(1.795, 1.872, y);
        y -= 0.024 * top * Math.exp(-((x / 0.032) ** 2)) * (1 - 0.5 * sstep(0.05, 0.11, Math.abs(zc)));
        x *= 1 - 0.2 * sstep(0.0, 0.1, zc) * sstep(1.775, 1.845, y);
        y -= 0.008 * sstep(0.04, 0.11, zc) * top;
      } else {
        // the snap brim: the front turned down, the back up, the sides a little up
        const k = clamp((r - 0.097) / 0.06);
        y += k * (-0.026 * sstep(0.0, 0.16, zc) + 0.014 * sstep(0.0, -0.16, zc) + 0.006 * (Math.abs(x) / Math.max(r, 1e-3)));
      }
      P.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals(); return g;
  };
  const orig = c.kit.add;
  c.kit.add = function (key, g, w) { if (key === 'hat' || key === 'hatband') deform(g); return orig.call(this, key, g, w); };
  try {
    KP.lathe(c, 'hat', [[0, 1.868], [0.03, 1.872], [0.062, 1.864], [0.083, 1.832], [0.089, 1.775], [0.091, 1.744], [0.148, 1.734], [0.16, 1.739], [0.148, 1.729], [0.087, 1.731]], { kz: 1.2, rx: 0.06, seg: 56 });
    KP.lathe(c, 'hatband', [[0.0905, 1.745], [0.0925, 1.747], [0.0925, 1.776], [0.0905, 1.778]], { kz: 1.2, rx: 0.06, seg: 56 });
  } finally { c.kit.add = orig; }
};

// ── kits ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function dressParaSOE(c) {
  const { coat, trousers, accent } = c.col;
  KP.base(c); KP.std(c);
  camoMat(c, 'smock', shift(coat, 0.0, -0.02, 0.1), shift(accent, -0.02, 0.0, -0.06), darker(coat, 0.55));
  c.mat('trousers', 'serge', trousers, { roughness: 0.95 }, 1, 0.05);
  c.mat('knit', 'knit', darker(trousers, 0.85), { roughness: 1 }, 0.5, 0);
  c.mat('boot', 'leather', 0x231A14, { roughness: 0.55, nScale: 0.7 }, 0.6, 0.02);
  // the smock: a loose pullover jacket to mid-thigh, half zip, knitted cuffs
  const at = KP.torso(c, 'smock', scaleRows(R.M43.torso, 1.04, 1.06), { edge: [0.04, 0.006, 1.5, 1.24] });
  KP.skirt(c, 'smock', SK.thigh.map((r) => [r[0], r[1] * 1.03, r[2] * 1.04, r[3] * 1.04, r[4]]), { ov: 0.1, legK: 0.42, shinK: 0 });
  KP.sleeves(c, 'smock', [0.072, 0.062, 0.054], { ext: -0.01, turn: [0.055, 0.0], turnKey: 'knit', wrinkle: 0.05 });
  R.buildCollar(c.kit, c.rig, 'smock', 'jacket', null);
  R.placeBox(c.kit, 'metal', R.rbox(0.012, 0.24, 0.005, 0.002), at, 1.37, PI / 2, 0.008, c.tw);           // half zip
  for (const side of [1, -1]) {
    R.placeBox(c.kit, 'smock', R.rbox(0.13, 0.15, 0.016, 0.012), at, 1.27, PI / 2 - side * 0.56, 0.006, c.tw);   // breast pockets
    R.placeBox(c.kit, 'smock', R.rbox(0.135, 0.05, 0.012, 0.008), at, 1.345, PI / 2 - side * 0.56, 0.02, c.tw, 0.12);
    R.placeBox(c.kit, 'smock', R.rbox(0.15, 0.16, 0.016, 0.012), c.sk, 0.87, PI / 2 - side * 0.72, 0.008, () => [[c.rig.B.pelvis, 1]]);   // skirt pockets
    R.placeBox(c.kit, 'smock', R.rbox(0.155, 0.05, 0.012, 0.008), c.sk, 0.95, PI / 2 - side * 0.72, 0.022, () => [[c.rig.B.pelvis, 1]], 0.1);
  }
  const top = KP.boots(c, 'jump', { upper: 'boot', sole: 'sole', metal: 'metal' });
  KP.legs(c, 'trousers', [0.1, 0.076, 0.072, 0.066], top - 0.03, { blouse: [0.065, 0.02] });
  harness(c);
  if (c.def?.pack !== false) { chutePack(c); if (c.def?.static_line !== false) staticLine(c); }   // the pack is part of the kit (a def's accessories list replaces the kit's)
  c.extras.para = true;
}
function dressSS(c) {
  const { coat, trousers, accent } = c.col;
  KP.base(c, c.def?.gloves ? { glove: { tex: 'leather', color: 0x2A2420, rough: 0.5, cuff: 'gauntlet' } } : {}); KP.std(c);
  c.mat('coat', 'serge', coat, { roughness: 0.8, side: DS }, 1, 0.02);
  c.mat('tab', 'melton', 0x0A0A0B, { roughness: 0.85 }, 0.5, 0);
  c.mat('shirt', 'sateen', 0xE9E7E1, { roughness: 0.62, side: DS }, 0.5, 0);
  c.mat('tie', 'sateen', 0x0C0C0E, { roughness: 0.45 }, 0.3, 0);
  c.mat('breeches', 'serge', trousers, { roughness: 0.84 }, 1, 0.02);
  c.mat('boot', 'leather', 0x09090A, { roughness: 0.12, nScale: 0.22, envMapIntensity: 1.3 }, 0.35, 0);
  c.mat('belt', 'leather', 0x121010, { roughness: 0.36, nScale: 0.5 }, 0.6, 0);
  c.mat('board', 'web', KP.hexOf(accent, 0xB9BAB2), { roughness: 0.38, metalness: 0.6 }, 0.6, 0);
  c.mat('silver', null, 0xC9CAC4, { roughness: 0.3, metalness: 0.92 }, 0.2, 0);
  // the tunic: fitted, open collar with lapels, four buttons, skirt to the upper thigh
  const at = KP.torso(c, 'coat', R.M43.torso, { edge: [0.06, 0.008, 1.4, 1.02] });
  KP.skirt(c, 'coat', SK.thigh.map((r, i, a) => (i === a.length - 1 ? [0.77, ...r.slice(1)] : r)), { ov: 0.1, legK: 0.38, shinK: 0 });
  KP.sleeves(c, 'coat', [0.064, 0.053, 0.047], { ext: 0.006 });
  KP.panel(c, 'shirt', at, 1.53, 1.36, 0.19, 0.0, 0.004);
  for (const s of [1, -1]) KP.panel(c, 'coat', at, 1.515, 1.35, 0.17, 0.02, 0.009, PI / 2 + s * 0.19, 5, 4);    // lapels
  R.strap(c.kit, 'tie', [at(1.51, PI / 2, 0.007), at(1.45, PI / 2, 0.008), at(1.38, PI / 2, 0.008)], 0.04, 0.004, c.tw, V3(0, 0, 1));
  R.buildCollar(c.kit, c.rig, 'coat', 'jacket', 'shirt');
  // collar tabs on both collar points (black patches with silver cord)
  for (const s of [1, -1]) {
    const g = R.rbox(0.042, 0.05, 0.004, 0.006); g.rotateX(-0.95); g.rotateY(s * 0.62); g.rotateZ(s * 0.28); g.translate(s * 0.082, 1.478, 0.066);
    c.kit.add('tab', g, () => [[c.rig.B.chest, 0.8], [c.rig.B.neck, 0.2]]);
    const cord = new THREE.TorusGeometry(0.026, 0.0016, 4, 18); cord.scale(0.85, 1.0, 1); cord.rotateX(-0.95); cord.rotateY(s * 0.62); cord.rotateZ(s * 0.28); cord.translate(s * 0.082, 1.479, 0.0685);
    c.kit.add('silver', cord, () => [[c.rig.B.chest, 0.8], [c.rig.B.neck, 0.2]]);
  }
  KP.buttons(c, 'silver', [1.33, 1.24, 1.15, 1.07], 0.0, 0.0072, 0.01);
  for (const side of [1, -1]) {
    R.placeBox(c.kit, 'coat', R.rbox(0.12, 0.135, 0.014, 0.01), at, 1.26, PI / 2 - side * 0.54, 0.004, c.tw);   // pleated breast pockets
    R.placeBox(c.kit, 'coat', R.rbox(0.125, 0.048, 0.012, 0.012), at, 1.335, PI / 2 - side * 0.54, 0.016, c.tw, 0.12);
    R.button(c.kit, 'silver', at(1.325, PI / 2 - side * 0.54, 0.026), R.surfNormal(at, 1.33, PI / 2 - side * 0.54), 0.0055, c.tw);
    R.placeBox(c.kit, 'coat', R.rbox(0.15, 0.15, 0.016, 0.012), c.sk, 0.88, PI / 2 - side * 0.66, 0.006, () => [[c.rig.B.pelvis, 1]], 0.04);
    R.placeBox(c.kit, 'coat', R.rbox(0.155, 0.05, 0.012, 0.012), c.sk, 0.955, PI / 2 - side * 0.66, 0.02, () => [[c.rig.B.pelvis, 1]], 0.1);
  }
  R.shoulderStraps(c.kit, c.rig, 'board', at, { w: 0.042, t: 0.006, button: 'silver' });
  // Sam Browne: the belt with a two-claw buckle and the cross strap from the right shoulder to the left hip
  KP.belt(c, 'belt', 1.045, 0.05, 0.012, 'silver');
  R.strap(c.kit, 'belt', [at(1.06, PI / 2 + 0.62, 0.016), at(1.2, PI / 2 + 0.28, 0.015), at(1.35, PI / 2 - 0.18, 0.012), at(1.45, PI / 2 - 0.6, 0.01), V3(-0.12, 1.485, -0.01), at(1.4, 1.5 * PI + 0.45, 0.012), at(1.22, 1.5 * PI + 0.02, 0.014), at(1.06, 1.5 * PI - 0.5, 0.016)], 0.026, 0.0035, c.tw, V3(0, 0, 1));
  R.placeBox(c.kit, 'belt', R.rbox(0.075, 0.13, 0.036, 0.012), at, 0.98, PI / 2 + 0.92, 0.03, c.tw, 0.12);       // holster, left front
  const top = KP.boots(c, 'riding', { upper: 'boot', sole: 'sole', metal: 'metal' });
  KP.legs(c, 'breeches', [0.104, 0.058, 0.054, 0.05], top - 0.03, {});
}
function dressCivilCoat(c) {
  const { coat, trousers, accent } = c.col;
  if (c.col.hat == null) c.col.hat = 0x2B2725;                       // a dark felt fedora unless the def names a colour
  KP.base(c, c.def?.gloves ? { glove: { tex: 'leather', color: 0x231C17, rough: 0.55 } } : {}); KP.std(c);
  c.mat('coat', 'melton', coat, { roughness: 0.9, side: DS }, 1, 0.03);
  c.mat('trousers', 'serge', trousers, { roughness: 0.86 }, 1, 0.02);
  c.mat('shirt', 'sateen', 0xD9D5CB, { roughness: 0.66, side: DS }, 0.5, 0);
  c.mat('tie', 'sateen', accent, { roughness: 0.5 }, 0.3, 0);
  const variant = String(c.def?.variant || '');
  const at = KP.torso(c, 'coat', R.OVERCOAT.torso, { edge: [0.4, 0.012, 1.46, 1.02] });
  KP.skirt(c, 'coat', R.OVERCOAT.skirt.map((r, i, a) => (i === a.length - 1 ? [0.46, ...r.slice(1)] : r)), { ov: 0.42, shinK: 0.45 });
  KP.sleeves(c, 'coat', [0.072, 0.063, 0.06], { ext: 0.02, turn: [0.07, 0.004] });
  if (variant.includes('collar_up')) {
    R.buildCollar(c.kit, c.rig, 'coat', 'roll');
  } else {
    KP.panel(c, 'shirt', at, 1.53, 1.37, 0.17, 0.0, 0.004);
    R.strap(c.kit, 'tie', [at(1.51, PI / 2, 0.007), at(1.45, PI / 2, 0.008), at(1.38, PI / 2, 0.008)], 0.04, 0.004, c.tw, V3(0, 0, 1));
    for (const s of [1, -1]) KP.panel(c, 'coat', at, 1.52, 1.33, 0.24, 0.04, 0.012, PI / 2 + s * 0.27, 6, 5);   // wide lapels
    R.buildCollar(c.kit, c.rig, 'coat', 'jacket', 'shirt');
  }
  R.coatDetails(c.kit, c.rig, { button: 'button', coat: 'coat' }, at, c.sk, 'overcoat');
  for (const side of [1, -1]) R.placeBox(c.kit, 'coat', R.rbox(0.17, 0.05, 0.014, 0.008), c.sk, 0.93, PI / 2 - side * 0.86, 0.006, () => [[c.rig.B.pelvis, 1]], 0.05);
  if (variant.includes('belted')) { c.mat('cbelt', 'melton', darker(coat, 0.9), { roughness: 0.9 }, 1, 0); R.band(c.kit, 'cbelt', at, 1.05, 0.05, 0.014, c.tw); R.placeBox(c.kit, 'metal', R.rbox(0.05, 0.05, 0.01, 0.004), at, 1.05, PI / 2, 0.022, c.tw); }
  const top = KP.shoes(c, 'shoe', 0x15110E, 0.34);
  KP.legs(c, 'trousers', [0.088, 0.066, 0.062, 0.058], top - 0.02, {});
}
Object.assign(KITS, {
  para_soe: { dress: dressParaSOE, colors: { coat: '#6A6446', trousers: '#4E4C37', accent: '#6E5A3C' }, headwear: 'para_helmet', accessories: ['chute_pack', 'static_line'], era: '1940s', armed: false },
  ss_officer: { dress: dressSS, colors: { coat: '#1C1C1F', trousers: '#1C1C1F', accent: '#BFC0BA' }, headwear: 'ss_cap', accessories: [], era: '1940s', h: 1.84 },
  civil_coat_1940s: { dress: dressCivilCoat, colors: { coat: '#36322E', trousers: '#29282A', accent: '#4A2622' }, headwear: 'fedora_40s', accessories: [], era: '1940s' },
});

// the cast catalog doc for the director (the kits list and the new accessories / actions)
{
  const kitList = Object.keys(KITS).join('|');
  const doc = 'v3 people (WP5): kits para_soe (SOE paratrooper 1941: rimless helmet, Denison smock, X-type harness + pack; accessories chute_pack, static_line, reserve, sten), ss_officer (Heydrich stand-in: high peaked cap, open-collar tunic, Sam Browne, breeches, riding boots; no symbols), civil_coat_1940s (double-breasted overcoat + fedora; variant collar_up | belted). Actions freefall, tumble, hang (under canopy), sit_bench (seat_h), hatch_sit, hatch_jump, aim_pistol_2h (two-handed pistol; fire [t...]). A jumper in the air is the objects kind para.jumper / para.stick, a bust is figure.bust.';
  for (const k of ['cast', 'figure.person']) {
    const e = CAST_CAT[k]; if (!e) continue;
    if (k === 'figure.person') e.params = { ...e.params, kit: kitList };
    e.doc = e.doc ? e.doc + ' ' + doc : doc;
  }
}
export const CATALOG = {};
export async function build(kind) { throw new Error('lib/v3/kit_ww2.js: no kinds (' + kind + ')'); }
