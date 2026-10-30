// ACTIONS — designed 2D action animations for the v6 documentary engine (actions.py times each one on its verb):
// arrested, jailed, shot, fired, fled, flew, met, signed, burned, destroyed, hid, leaked, spied, bugged, died, voted,
// bought, built, sank, exploded, testified, crashed, resigned.
// ONE look (STYLE_2D "LUMEN" laws): flat vector cut-outs on a near-black ground, no outlines, ONE lamp pool per scene,
// the two-colour OFFSET RIM on every hero shape (key colour up-left, cool down-right), a soft floor glow under it,
// dust that never stops, a 2D camera that pushes, drifts and KICKS on the hit. S.hit = the second the action peaks
// (actions.py puts it 0-4 f before the spoken verb). S.fps < 30 = stepped motion (EDIT_GRAMMAR §6 S1). Colours are
// P.* (the style's palette, set by actions.py). Everything is computed from t alone (window.renderFrame(t)).
const AC = {};
const STEP = S.fps && +S.fps < 30 ? +S.fps : 0;
const HIT = S.hit != null ? +S.hit : 1.0;
const C = Object.assign({ bg: '#07090D', pool: '#3A4856', wall: '#121821', floor: '#0B0F15', ink: '#F3EEE4', fig: '#0E1219',
  key: '#E3B25B', cool: '#5E93AE', hot: '#D9412E', paper: '#E9E1CD', metal: '#B4BCC6', wood: '#5B3B27', water: '#123247',
  green: '#4FA36A' }, P || {});
const LANG = String(S.lang || 'en').toLowerCase();
const UP = s => String(s == null ? '' : s).toLocaleUpperCase(LANG === 'cs' ? 'cs-CZ' : LANG === 'pl' ? 'pl-PL' : LANG === 'de' ? 'de-DE' : 'en-US');
const TAU = Math.PI * 2;
const hn = (i, s = 0) => { const v = Math.sin((i + 1) * 127.13 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const sm = x => x * x * (3 - 2 * x);
const eo2 = x => 1 - (1 - x) * (1 - x), ei2 = x => x * x;
// a damped spring 0 -> 1 with overshoot (physics feel for anything that lands, swings or snaps)
const spring = (u, f = 2.2, z = 5.0) => u <= 0 ? 0 : 1 - Math.exp(-z * u) * Math.cos(f * TAU * u);
// gravity: y0 -> y1 landing at tl after a fall of tf seconds, then ONE bounce bh px high lasting tb seconds
function drop(t, tl, tf, y0, y1, bh = 0, tb = 0.2) {
  if (t < tl - tf) return y0;
  if (t < tl) { const u = (t - (tl - tf)) / tf; return y0 + (y1 - y0) * u * u; }
  if (bh && t < tl + tb) { const u = (t - tl) / tb; return y1 - bh * 4 * u * (1 - u); }
  return y1;
}
function hex(c) {
  c = String(c || '#000').trim();
  if (c.startsWith('rgb')) { const m = c.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
  c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c.slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (c, a) => { const [r, gg, b] = hex(c); return `rgba(${r},${gg},${b},${(+a).toFixed(3)})`; };
const mixc = (a, b, u) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(u))).join(',')})`; };
const shade = (c, k) => k >= 0 ? mixc(c, '#ffffff', k) : mixc(c, '#000000', -k);
function mk(tag, css, parent, html) {
  const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html;
  (parent || scene).appendChild(e); return e;
}
// ── the stage: one canvas drawn under a 2D camera, a DOM layer for type, a flash ──────────────────────────────────
let CV, g, UI, FLASH;
function stage() {
  CV = mk('canvas', 'position:absolute;left:0;top:0;width:1920px;height:1080px'); CV.width = W; CV.height = H;
  g = CV.getContext('2d');
  UI = mk('div', 'position:absolute;inset:0;pointer-events:none');
  FLASH = mk('div', 'position:absolute;inset:0;opacity:0;background:#fff;mix-blend-mode:screen');
  vig.style.background = 'radial-gradient(ellipse 78% 72% at 50% 47%, rgba(0,0,0,0) 46%, rgba(0,0,0,.72) 100%)';
  grain(S.grain != null ? +S.grain : 0.13);
}
// camera: keys [t, cx, cy, zoom, rotDeg] eased with smoothstep (memory camera-move-easing: never cubic in-out),
// a creep that never settles after the hit, impulse KICKS (zoom + shake + roll), a breathing drift
const CAM = { keys: [[0, 960, 540, 1, 0]], kicks: [], drift: 1, creep: 0.025, ease: sm };
let CX = 960, CY = 540, CZ = 1, CR = 0;
const PZ = W < H ? 0.8 : 1;       // a vertical frame shows 20 % more of the 16:9 scene, so nothing at its sides is cut off
function kick(t0, amt = 0.04, shake = 12, roll = 0) { CAM.kicks.push([t0, amt, shake, roll]); }
function camSolve(t, tRaw) {
  const K = CAM.keys; let k = K[K.length - 1].slice(1);
  if (t <= K[0][0]) k = K[0].slice(1);
  else for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) {
    const A = K[i], B = K[i + 1], u = CAM.ease(clamp((t - A[0]) / Math.max(1e-4, B[0] - A[0])));
    k = A.slice(1).map((v, j) => v + (B[j + 1] - v) * u); break;
  }
  let [cx, cy, z, r] = k, sx = 0, sy = 0;
  z *= 1 + CAM.creep * Math.max(0, t - HIT);
  z *= 1 + 0.05 * ei3(seg(t, D - 0.3, D));
  const fi = Math.floor(tRaw * 30 + 1e-6);
  for (const [k0, amt, sh, rl] of CAM.kicks) {
    if (t < k0) continue;
    const u = t - k0, e = sh * Math.exp(-u / 0.17);
    z *= 1 + amt * Math.exp(-u / 0.13); sx += e * (hn(fi, 1) * 2 - 1); sy += e * (hn(fi, 2) * 2 - 1); r += rl * Math.exp(-u / 0.22);
  }
  sx += CAM.drift * (7 * Math.sin(tRaw * 0.9 + 1.3) + 3 * Math.sin(tRaw * 2.1));
  sy += CAM.drift * (5 * Math.sin(tRaw * 0.7) + 2.5 * Math.sin(tRaw * 1.7 + 0.4));
  CX = cx - sx / z; CY = cy - sy / z; CZ = z; CR = r;
}
function cam(par = 1) {
  const z = 1 + (CZ - 1) * par, cx = 960 + (CX - 960) * par, cy = 540 + (CY - 540) * par;
  g.setTransform(1, 0, 0, 1, 0, 0); g.translate(W / 2, H / 2); g.rotate(CR * par * Math.PI / 180); g.scale(z * PZ, z * PZ); g.translate(-cx, -cy);
}
function w2s(x, y) {
  const a = CR * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), dx = (x - CX) * CZ * PZ, dy = (y - CY) * CZ * PZ;
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}
// ── light: lamp pools, beams, floor glows (L2/L3: one visible light per scene, corners fall to black) ─────────────
function pool(x, y, rx, ry, col, a = 1) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.45, rgba(col, a * 0.45)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
}
function beam(x0, y0, x1, y1, w0, w1, col, a = 0.4) {   // an additive light cone from (x0,y0) to (x1,y1)
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath();
  g.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); g.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  g.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); g.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); g.closePath(); g.fill(); g.restore();
}
function glow(x, y, w, col, a = 0.55) { pool(x, y, w / 2, w / 9, col, a); }
// a room: back wall down to the floor line, the floor falling to black, a baseboard, the lamp's pool on both
function room(fy = 860, lx = 960, col = C.pool, a = 0.55, wide = 1) {
  g.fillStyle = C.wall; g.fillRect(-600, -400, 3120, fy + 400);
  const fl = g.createLinearGradient(0, fy, 0, 1500); fl.addColorStop(0, shade(C.floor, 0.06)); fl.addColorStop(1, C.bg);
  g.fillStyle = fl; g.fillRect(-600, fy, 3120, 900);
  pool(lx, fy - 260, 760 * wide, 520, col, a);
  pool(lx, fy + 40, 640 * wide, 120, col, a * 0.55);
  g.fillStyle = rgba('#000', 0.35); g.fillRect(-600, fy - 6, 3120, 6);
}
// ── fx on the world: shock rings, sparks, smoke/dust puffs, flying debris, paper sheets ─────────────────────────────
const RINGS = [], SPARKS = [], PUFFS = [], FLASHES = [];
function ring(t0, x, y, r1, col, w = 8, life = 0.55, sy = 1) { RINGS.push([t0, x, y, r1, col, w, life, sy]); }
function sparks(t0, x, y, n, col, sp = 900, a0 = 0, spread = TAU, grav = 900, life = 0.5) {
  const k0 = SPARKS.length;
  for (let i = 0; i < n; i++) SPARKS.push([t0, x, y, a0 - spread / 2 + spread * hn(i, 7 + k0), sp * (0.35 + 0.8 * hn(i, 9 + k0)), col, life * (0.6 + 0.6 * hn(i, 11 + k0)), grav]);
}
function puffs(t0, x, y, n, col, r0 = 30, r1 = 120, life = 1.2, vx = 0, vy = -40, spread = 120, a = 0.5) {
  const k0 = PUFFS.length;
  for (let i = 0; i < n; i++) PUFFS.push([t0 + 0.05 * hn(i, 3 + k0), x + (hn(i, 4 + k0) - 0.5) * spread, y + (hn(i, 5 + k0) - 0.5) * spread * 0.3,
    r0 * (0.6 + 0.8 * hn(i, 6 + k0)), r1 * (0.6 + 0.7 * hn(i, 8 + k0)), life * (0.7 + 0.6 * hn(i, 10 + k0)), col,
    vx + (hn(i, 12 + k0) - 0.5) * 120, vy * (0.6 + 0.8 * hn(i, 13 + k0)), a]);
}
function flash(t0, a = 0.5, col = '#fff') { FLASHES.push([t0, a, col]); }
let FXF = false;
function drawFx(t) {
  FXF = true;
  for (const [t0, x, y, r1, col, w, life, sy] of RINGS) {
    const u = (t - t0) / life; if (u < 0 || u > 1) continue;
    g.save(); g.translate(x, y); g.scale(1, sy); g.strokeStyle = col; g.globalAlpha = (1 - u) * 0.9;
    g.lineWidth = Math.max(1, w * (1 - u)); g.beginPath(); g.arc(0, 0, 10 + r1 * eo3(u), 0, TAU); g.stroke(); g.restore();
  }
  for (const [t0, x, y, r0, r1, life, col, vx, vy, a] of PUFFS) {
    const u = (t - t0) / life; if (u < 0 || u > 1) continue;
    const r = r0 + (r1 - r0) * eo3(u), px = x + vx * u * life, py = y + vy * u * life;
    g.fillStyle = rgba(col, a * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85)); g.beginPath(); g.ellipse(px, py, r, r * 0.6, 0, 0, TAU); g.fill();
  }
  g.lineCap = 'round';
  for (const [t0, x, y, ang, sp, col, life, grav] of SPARKS) {
    const u = t - t0; if (u < 0 || u > life) continue;
    const px = x + Math.cos(ang) * sp * u, py = y + Math.sin(ang) * sp * u + grav * u * u;
    const qx = px - Math.cos(ang) * sp * 0.025, qy = py - (Math.sin(ang) * sp + 2 * grav * u) * 0.025;
    g.strokeStyle = col; g.globalAlpha = 1 - u / life; g.lineWidth = 3.2; g.beginPath(); g.moveTo(qx, qy); g.lineTo(px, py); g.stroke();
  }
  g.globalAlpha = 1;
}
// ambient life (L5): dust motes drifting through the light; brighter inside the pool, seeded, never still
let DUST = { n: 46, col: C.ink, x: 960, y: 520, r: 700, up: 14 };
function dust(t) {
  for (let i = 0; i < DUST.n; i++) {
    const x0 = -200 + hn(i, 41) * 2320, y0 = -100 + hn(i, 42) * 1280, v = DUST.up * (0.4 + hn(i, 43));
    const x = x0 + 22 * Math.sin(t * (0.3 + 0.4 * hn(i, 44)) + i) + 9 * t, y = ((y0 - v * t + 1380) % 1380) - 100;
    const d = Math.hypot(x - DUST.x, y - DUST.y) / DUST.r, a = (0.1 + 0.5 * hn(i, 45)) * clamp(1.2 - d) * (0.65 + 0.35 * Math.sin(t * 2 + i));
    if (a <= 0.01) continue;
    g.fillStyle = rgba(DUST.col, a); g.beginPath(); g.arc(x, y, 1.2 + 2.2 * hn(i, 46), 0, TAU); g.fill();
  }
}
// the OFFSET RIM (L4): draw(col) is called three times — key band up-left, cool band down-right, then the fill
function rim(draw, o = 6, ka = 1, ca = 1) {
  const ga = g.globalAlpha;
  g.save(); g.translate(-o, -o); g.globalAlpha = ga * ka; draw(C.key); g.restore();
  g.save(); g.translate(o, o); g.globalAlpha = ga * ca; draw(C.cool); g.restore();
  draw(null);
}
function rr(x, y, w, h, r) { const p = new Path2D(); r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
// a hand in close-up: suit sleeve, white cuff, a flat mitten hand with its thumb (STYLE_2D: hands = human agency);
// origin at the wrist, the arm coming in along -x, rotated by ang; grip = fingers curled round an edge
function hand(x, y, ang, opt = {}) {
  const skin = opt.skin || mixc(C.paper, '#A8714F', 0.5), sl = opt.sleeve || C.fig, k = opt.s || 1;
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(k, k * (opt.flip ? -1 : 1));
  rim(c => { g.fillStyle = c || sl; g.fill(rr(-1100, -40, 1080, 80, 34)); }, 4);
  g.fillStyle = C.ink; g.fill(rr(-44, -36, 30, 72, 6));
  rim(c => { g.fillStyle = c || skin; g.fill(rr(-22, -31, 74, 62, 24)); g.fill(rr(28, opt.grip ? -26 : -30, opt.grip ? 40 : 66, opt.grip ? 56 : 50, 20));
    g.save(); g.translate(18, -28); g.rotate(opt.grip ? 0.5 : -0.35); g.fill(rr(0, -12, 46, 24, 12)); g.restore(); }, 2.5, 0.8, 0.8);
  g.fillStyle = rgba('#000', 0.12); g.fillRect(30, -4, opt.grip ? 36 : 60, 3); g.fillRect(30, 10, opt.grip ? 36 : 60, 3);
  g.restore();
}
function poly(pts) { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; }
// ── the figure: a flat cut-out person (A8 HUMAN: no likeness, a suit's white V + tie), 100 units tall, feet at 0 ──
// pose: lean (rad, + = forward), head (tilt), an/af = near/far arm [shoulder, elbow] (from straight down, + = forward),
// ln/lf = near/far leg [hip, knee] (knee >= 0 bends back), drop (hips lowered, units), front (0 profile .. 1 facing us),
// back (1 = arms drawn behind the body: hands cuffed behind the back)
const POSE = {
  stand: { lean: 0, head: 0, an: [0.07, 0.1], af: [-0.07, 0.1], ln: [0.03, 0.02], lf: [-0.03, 0.02], drop: 0, front: 1, back: 0 },
  cuffed: { lean: 0.02, head: 0.12, an: [-0.3, -0.75], af: [0.3, 0.75], ln: [0.04, 0.02], lf: [-0.04, 0.02], drop: 0, front: 1, back: 1 },
  sit: { lean: -0.06, head: 0.18, an: [0.5, 0.9], af: [0.42, 1.0], ln: [1.5, 1.55], lf: [1.42, 1.5], drop: 22, front: 0.2, back: 0 },
  hunch: { lean: 0.22, head: 0.35, an: [0.42, 0.55], af: [0.36, 0.6], ln: [1.5, 1.55], lf: [1.42, 1.5], drop: 22, front: 0.2, back: 0 },
  shake: { lean: 0.05, head: 0.05, an: [1.1, 0.25], af: [-0.08, 0.15], ln: [0.12, 0.05], lf: [-0.1, 0.05], drop: 0, front: 0.15, back: 0 },
  carry: { lean: 0.05, head: 0.08, an: [0.55, 1.05], af: [0.5, 1.1], ln: [0.03, 0.02], lf: [-0.03, 0.02], drop: 0, front: 0.1, back: 0 },
  speak: { lean: 0.04, head: -0.05, an: [0.35, 1.25], af: [0.25, 1.3], ln: [0.03, 0.02], lf: [-0.03, 0.02], drop: 0, front: 0.8, back: 0 },
};
function lp(A, B, u) {
  const o = {};
  for (const k of Object.keys(A)) o[k] = Array.isArray(A[k]) ? A[k].map((v, i) => v + ((B[k] || A[k])[i] - v) * u) : A[k] + ((B[k] ?? A[k]) - A[k]) * u;
  return o;
}
function walk(ph, run = 0, base = POSE.stand) {   // a walk (run = 0) or a run (run = 1) cycle at phase ph (radians)
  const s = Math.sin(ph), sb = Math.sin(ph + Math.PI);
  const leg = (q, sq) => [lerp(0.42, 0.78, run) * sq + lerp(0, 0.15, run), Math.max(0, lerp(0.55, 1.15, run) * Math.sin(q + 1.6)) + 0.04];
  return Object.assign({}, base, {
    lean: lerp(0.05, 0.3, run), head: lerp(0.02, -0.1, run), front: lerp(0.12, 0, run), back: 0,
    ln: leg(ph, s), lf: leg(ph + Math.PI, sb),
    an: [-lerp(0.38, 0.95, run) * s + lerp(0.05, 0.25, run), lerp(0.25, 1.45, run)], af: [-lerp(0.38, 0.95, run) * sb + lerp(0.05, 0.25, run), lerp(0.25, 1.45, run)],
    drop: -lerp(1.2, 3.5, run) * Math.abs(Math.sin(ph)) + lerp(0, 3, run),
  });
}
function figure(x, fy, h, p, dir = 1, solid = null, opt = {}) {
  const sc = h / 100, F = p.front ?? 1;
  const col = solid || opt.col || C.fig, far = solid || shade(opt.col || C.fig, 0.08);
  const dv = (a, L) => [Math.sin(a) * dir * L, Math.cos(a) * L];
  g.save(); g.translate(x, fy); g.scale(sc, sc); if (opt.rot) g.rotate(opt.rot);
  const hip = [0, -47 + (p.drop || 0)], ax = [Math.sin(p.lean) * dir, -Math.cos(p.lean)], px = [Math.cos(p.lean), Math.sin(p.lean) * dir];
  const at = (L, s = 0) => [hip[0] + ax[0] * L + px[0] * s * dir, hip[1] + ax[1] * L + px[1] * s * dir];
  const sp = lerp(3, 10.5, F), hs = lerp(1.6, 4.4, F);
  // a tapered limb segment: a quad from a (width wa) to b (width wb) with round joints
  const cap = (a, b, wa, wb) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    g.beginPath(); g.moveTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2); g.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2); g.lineTo(b[0] - nx * wb / 2, b[1] - ny * wb / 2); g.lineTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2); g.closePath(); g.fill();
    g.beginPath(); g.arc(b[0], b[1], wb / 2, 0, TAU); g.fill(); };
  const leg = (q, s, cc) => { g.fillStyle = cc; const h0 = at(-2, s), k = dv(q[0], 22), kn = [h0[0] + k[0], h0[1] + k[1]], f = dv(q[0] - q[1], 24), ft = [kn[0] + f[0], kn[1] + f[1]];
    g.beginPath(); g.arc(h0[0], h0[1], 5, 0, TAU); g.fill(); cap(h0, kn, 10, 8.2); cap(kn, ft, 8.2, 6.4);
    g.beginPath(); g.ellipse(ft[0] + 2.8 * dir, ft[1] + 0.4, 6.4, 2.8, 0, 0, TAU); g.fill(); };
  const arm = (q, s, cc) => { g.fillStyle = cc; const s0 = at(29, s), e = dv(q[0], 16), el = [s0[0] + e[0], s0[1] + e[1]], f = dv(q[0] + q[1], 15), wr = [el[0] + f[0], el[1] + f[1]];
    g.beginPath(); g.arc(s0[0], s0[1], 4, 0, TAU); g.fill(); cap(s0, el, 7, 6); cap(el, wr, 6, 5);
    const hd = dv(q[0] + q[1], 3.2); g.beginPath(); g.ellipse(wr[0] + hd[0], wr[1] + hd[1], 3.2, 3.9, Math.atan2(hd[1], hd[0]) - Math.PI / 2, 0, TAU); g.fill(); return wr; };
  if (p.back) { arm(p.af, -sp, far); arm(p.an, sp, col); } else arm(p.af, -sp, far);
  leg(p.lf, -hs, far);
  leg(p.ln, hs, col);
  // the jacket: broad rounded shoulders, a waist, the hem over the hips
  const tw = lerp(7.5, 12.5, F), ww = lerp(6.2, 8.6, F), hw = lerp(6.6, 9.4, F);
  const S1 = at(31, -tw + 1.5), S2 = at(31, tw - 1.5), D1 = at(27.5, -tw), D2 = at(27.5, tw), W1 = at(10, -ww), W2 = at(10, ww), H1 = at(-5, -hw), H2 = at(-5, hw), N = at(33.5);
  g.fillStyle = col; g.beginPath(); g.moveTo(H1[0], H1[1]); g.lineTo(W1[0], W1[1]); g.lineTo(D1[0], D1[1]);
  g.quadraticCurveTo(S1[0] - ax[0] * 0.5, S1[1] - ax[1] * 0.5 - 1, N[0] - px[0] * 3 * dir, N[1]); g.lineTo(N[0] + px[0] * 3 * dir, N[1]);
  g.quadraticCurveTo(S2[0], S2[1] - 1, D2[0], D2[1]); g.lineTo(W2[0], W2[1]); g.lineTo(H2[0], H2[1]); g.closePath(); g.fill();
  if (opt.coat) { const c1 = at(-5, -hw - 0.5), c2 = at(-5, hw + 0.5), c3 = at(-27, hw + 3), c4 = at(-27, -hw - 3); g.beginPath(); [c1, c2, c3, c4].forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); }
  const nk = at(35), hd = at(42.3), hx = hd[0] + Math.sin(p.head) * dir * 1.6;
  cap(at(31.5), nk, 5.4, 5.0);
  g.save(); g.translate(hx, hd[1]); g.rotate(p.lean * 0.5 + p.head * 0.35 * dir);
  g.beginPath(); g.ellipse(0, 0, 6.4, 7.6, 0, 0, TAU); g.fill();
  if (F < 0.6) { g.beginPath(); g.moveTo(5.6 * dir, -1); g.lineTo(7.7 * dir, 1.4); g.lineTo(5.4 * dir, 2.6); g.fill(); }
  if (opt.hat) { g.beginPath(); g.ellipse(0, -4.6, 11, 2.3, 0, 0, TAU); g.fill(); g.fill(rr(-6.4, -12.6, 12.8, 8.5, 2.5)); }
  g.restore();
  if (!solid && F > 0.45 && opt.suit !== false) {          // the white shirt V and the tie: "an official" at a glance
    const a = at(31.5, -3.4 * F), b = at(31.5, 3.4 * F), c = at(19.5);
    g.fillStyle = rgba(C.ink, 0.92 * F); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill();
    const t1 = at(30.8), t2 = at(21.5), t3 = at(19.6); g.fillStyle = opt.tie || C.hot;
    g.beginPath(); g.moveTo(t1[0] - 0.9, t1[1]); g.lineTo(t1[0] + 0.9, t1[1]); g.lineTo(t2[0] + 1.3, t2[1]); g.lineTo(t3[0], t3[1]); g.lineTo(t2[0] - 1.3, t2[1]); g.closePath(); g.fill();
    g.fillStyle = rgba('#000', 0.25); const l1 = at(28, -tw + 3), l2 = at(12, -1.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(l1[0], l1[1]); g.lineTo(l2[0], l2[1]); g.closePath(); g.fill();
  }
  let wr = null;
  if (!p.back) wr = arm(p.an, sp, col);
  g.restore();
  return wr ? [x + wr[0] * sc, fy + wr[1] * sc] : null;
}
function figRim(x, fy, h, p, dir = 1, opt = {}) {    // the figure with its two-colour offset rim
  const o = Math.max(2.5, h * 0.011);
  let wr = null;
  rim(c => { const r = figure(x, fy, h, p, dir, c, opt); if (!c) wr = r; }, o, opt.ka ?? 1, opt.ca ?? 1);
  return wr;
}
// ── the real person: the job's photo cut-out (S.photo, a data URI) turned into the style's tritone, with its rim ──
let PH = null;
function loadPhoto() {
  if (!S.photo) return;
  window.__wait = new Promise(res => {
    const im = new Image();
    im.onload = () => { try { PH = duo(im); } catch (e) { PH = null; } res(); };
    im.onerror = () => res(); im.src = S.photo;
  });
}
function solidOf(src, col) {
  const k = document.createElement('canvas'); k.width = src.width; k.height = src.height;
  const y = k.getContext('2d'); y.drawImage(src, 0, 0); y.globalCompositeOperation = 'source-in'; y.fillStyle = col; y.fillRect(0, 0, k.width, k.height); return k;
}
function duo(im) {
  const s = Math.min(1, 1000 / im.height), w = Math.max(1, Math.round(im.width * s)), h = Math.max(1, Math.round(im.height * s));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), p = d.data, L = [];
  for (let i = 0; i < p.length; i += 16) if (p[i + 3] > 128) L.push(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]);
  L.sort((a, b) => a - b);
  const lo = L[Math.floor(L.length * 0.04)] || 0, hi = L[Math.floor(L.length * 0.97)] || 255;
  const A = hex(C.fig), M = hex(mixc(C.fig, C.cool, 0.75)), B = hex(C.ink);
  for (let i = 0; i < p.length; i += 4) {
    const l = Math.pow(clamp((0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2] - lo) / Math.max(1, hi - lo)), 0.85);
    const [P0, P1, u] = l < 0.5 ? [A, M, l / 0.5] : [M, B, (l - 0.5) / 0.5];
    for (let k = 0; k < 3; k++) p[i + k] = P0[k] + (P1[k] - P0[k]) * u;
  }
  x.putImageData(d, 0, 0);
  return { main: c, key: solidOf(c, C.key), cool: solidOf(c, C.cool), dark: solidOf(c, C.fig), w, h };
}
// the photo standing on its bottom edge (a bust is cut by the frame like a portrait), h tall, centred on cx
function bust(cx, by, h, opt = {}) {
  const s = h / PH.h, w = PH.w * s, x = cx - w / 2, y = by - h, o = Math.max(3, h * 0.008);
  g.save(); g.globalAlpha = opt.a ?? 1;
  if (opt.rot) { g.translate(cx, by); g.rotate(opt.rot); g.translate(-cx, -by); }
  g.drawImage(PH.key, x - o, y - o, w, h); g.drawImage(PH.cool, x + o, y + o, w, h);
  g.drawImage(opt.dark ? PH.dark : PH.main, x, y, w, h);
  g.restore(); return { x, y, w, h };
}
// draw something into an offscreen canvas with the same drawing code (g is swapped while it runs)
function snap(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const keep = g; g = c.getContext('2d');
  try { fn(); } finally { g = keep; } return c;
}
// a picture cut into small tiles (for dust / pixel death): [{sx, sy, a}] where the picture has paint
function tiles(c, ts = 7) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data, out = [];
  for (let y = 0; y < c.height; y += ts) for (let k = 0; k < c.width; k += ts) {
    const i = ((y + (ts >> 1)) * c.width + k + (ts >> 1)) * 4; if (d[i + 3] > 60) out.push({ sx: k, sy: y, r: hn(out.length, 51), q: hn(out.length, 52) });
  }
  return out;
}
// ── type: labels that SLIT-OPEN (hairline 1 f -> bar opens 4 f -> text rises), stamps that SLAM ─────────────────────
const SLAM = [[0, 1.75, 0.25, 10], [1, 1.28, 0.85, 4], [2, 1.06, 1, 1], [3, 1, 1, 0]];
const kfr = (keys, f) => {
  if (f <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) if (f <= keys[i + 1][0]) { const A = keys[i], B = keys[i + 1], u = (f - A[0]) / (B[0] - A[0]); return A.slice(1).map((v, k) => v + (B[k + 1] - v) * u); }
  return keys[keys.length - 1].slice(1);
};
const TAGS = [];
function tag(x, y, name, kicker = '', opt = {}) {
  if (!name && !kicker) return null;
  const right = opt.align === 'right', mid = opt.align === 'center';
  const wrap = mk('div', `position:absolute;left:${x}px;top:${y}px;text-align:${right ? 'right' : mid ? 'center' : 'left'};transform:translateX(${right ? '-100%' : mid ? '-50%' : '0'})`, UI);
  const kk = kicker ? mk('div', `font:500 ${opt.ks || 25}px/1 'Ac Cond';letter-spacing:.3em;color:${C.key};margin:0 4px 11px;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.8)`, wrap, '') : null;
  let bar = null, tx = null;
  if (name) {
    bar = mk('div', `position:relative;display:inline-block;background:rgba(6,8,12,.84);padding:9px 26px 11px 32px;white-space:nowrap;clip-path:inset(50% 0 50% 0)`, wrap);
    mk('div', `position:absolute;left:0;top:0;bottom:0;width:8px;background:${opt.tick || C.key}`, bar);
    tx = mk('div', `font:600 ${opt.size || 50}px/1.06 'Ac Cond';letter-spacing:.05em;color:${C.ink}`, bar, esc(UP(name)));
    let fs = opt.size || 50; while (bar.offsetWidth > (opt.max || 800) && fs > 24) { fs -= 2; tx.style.fontSize = fs + 'px'; }
  }
  const K = UP(kicker), T = { wrap, t0: opt.t0 ?? 0.2, at(t) {
    const f = (t - this.t0) * 30;
    if (kk) kk.innerHTML = f < 0 ? '' : esc(K.slice(0, Math.floor(f * 1.6)));
    if (!bar) return;
    if (f < 0) { bar.style.clipPath = 'inset(50% 0 50% 0)'; tx.style.opacity = 0; return; }
    const o = f < 1 ? 47 : 50 * (1 - eo3(clamp((f - 1) / 4)));
    bar.style.clipPath = `inset(${o.toFixed(2)}% 0 ${o.toFixed(2)}% 0)`;
    const u = eo3(clamp((f - 2) / 6)); tx.style.opacity = u; tx.style.transform = `translateY(${(8 * (1 - u)).toFixed(1)}px)`;
  } };
  TAGS.push(T); return T;
}
let NOISE = '';
function stamp(text, x, y, t0, opt = {}) {
  if (!text) return null;
  if (!NOISE) { const c = document.createElement('canvas'); c.width = c.height = 256; const x2 = c.getContext('2d'), im = x2.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = hn(i, 61) > 0.2 ? 255 : 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = 0; im.data[i + 3] = v; }
    x2.putImageData(im, 0, 0); NOISE = c.toDataURL(); }
  const col = opt.col || C.hot, rot = opt.rot ?? -7;
  const e = mk('div', `position:absolute;left:${x}px;top:${y}px;transform-origin:50% 50%;font:400 ${opt.size || 88}px/1 'Ac Stamp';color:${col};border:8px solid ${col};padding:10px 26px 2px;letter-spacing:.05em;white-space:nowrap;opacity:0;-webkit-mask-image:url(${NOISE});-webkit-mask-size:300px 300px`, UI, esc(UP(text)));
  const T = { at(t) { const f = (t - t0) * 30; if (f < 0) { e.style.opacity = 0; return; }
    const [s, a, b] = kfr(SLAM, f); e.style.opacity = a * 0.92; e.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${s.toFixed(3)})`; e.style.filter = b > 0.3 ? `blur(${b.toFixed(1)}px)` : ''; } };
  TAGS.push(T); return T;
}
// the standard labels: the place / date as a kicker over the person's name, top-left, before the hit (L13 names early)
function stdTags(opt = {}) {
  const k = [S.where, S.when].filter(Boolean).join(' · ');
  return tag(opt.x ?? 112, opt.y ?? 92, opt.name ?? S.who, opt.kicker ?? k, { t0: opt.t0 ?? Math.max(0.12, HIT - 0.75), align: opt.align, size: opt.size });
}
function metalBar(x, y, w, h, o = 4) {          // one bar of steel: dark body, a lit stripe, the rim bands
  const p = rr(x, y, w, h, Math.min(w, h) * 0.3);
  rim(c => { g.fillStyle = c || mixc(C.metal, C.fig, 0.62); g.fill(p); }, o, 0.95, 0.8);
  const lw = Math.max(3, Math.min(w, h) * 0.18);
  g.fillStyle = rgba(shade(C.metal, 0.25), 0.85);
  if (h > w) g.fillRect(x + w * 0.24, y + 4, lw, h - 8); else g.fillRect(x + 4, y + h * 0.24, w - 8, lw);
}
function glint(x, y, t, t0, s = 46) {             // a 4-point star that twinkles 0 -> 1 -> 0 in 6 f (GLINT)
  const u = (t - t0) * 30 / 6; if (u < 0 || u > 1) return;
  const k = Math.sin(u * Math.PI) * s;
  g.save(); g.translate(x, y); g.rotate(u * 0.6); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba('#fff', 0.95);
  g.beginPath(); g.moveTo(0, -k); g.quadraticCurveTo(0, 0, k * 0.22, 0); g.quadraticCurveTo(0, 0, 0, k); g.quadraticCurveTo(0, 0, -k * 0.22, 0); g.quadraticCurveTo(0, 0, 0, -k);
  g.moveTo(-k * 0.7, 0); g.quadraticCurveTo(0, 0, 0, k * 0.16); g.quadraticCurveTo(0, 0, k * 0.7, 0); g.quadraticCurveTo(0, 0, 0, -k * 0.16); g.quadraticCurveTo(0, 0, -k * 0.7, 0);
  g.fill(); pool(0, 0, k * 1.6, k * 1.6, C.key, 0.5); g.restore();
}
// ── ARRESTED: police lights wash the wall; a cell front of steel bars DROPS over the person and SLAMS on the verb
// (gravity, one bounce, dust, kick); then a pair of handcuffs snaps shut (the click) while the arms go behind the back
AC.arrested = function () {
  const FY = 880, X = 960, BX0 = 500, BX1 = 1420, NB = 9, BT = 96, BW = 30, tc = HIT + 0.5;
  CAM.keys = [[0, 960, 560, 1.0, 0], [HIT, 960, 546, 1.07, 0], [D, 960, 536, 1.1, 0]];
  DUST.x = X; DUST.y = 560;
  stdTags();
  kick(HIT, 0.055, 18, 0.6); flash(HIT, 0.2);
  puffs(HIT, X, FY - 6, 26, '#8A8F98', 10, 55, 1.0, 0, -18, 980, 0.12);
  sparks(HIT, BX0 + 20, FY, 7, C.key, 520, -Math.PI / 2, 1.3, 1700, 0.4); sparks(HIT, BX1 - 20, FY, 7, C.key, 520, -Math.PI / 2, 1.3, 1700, 0.4);
  const cuffs = (t) => {                          // a pair of handcuffs in the foreground: each jaw swings shut at tc
    const a = eo3(seg(t, tc - 0.6, tc - 0.22)); if (a <= 0) return;
    const cx = 1500 + 300 * (1 - a), cy = 810 + 60 * (1 - a);
    g.save(); g.translate(cx, cy); g.rotate(-0.32 + 0.05 * Math.sin(t * 2)); g.globalAlpha = a;
    const cuff = (x, flip, k) => {
      const sh = clamp(spring((t - (tc - 0.1 + 0.07 * k)) / 0.45, 1.5, 6), 0, 1.12), jaw = 1.5 * (1 - sh);
      g.save(); g.translate(x, 0); g.scale(flip, 1);
      const body = c => { g.lineCap = 'butt'; g.strokeStyle = c || mixc(C.metal, C.fig, 0.25); g.lineWidth = 20;
        g.beginPath(); g.arc(0, 0, 60, Math.PI * 0.62, Math.PI * 1.95); g.stroke();
        g.save(); g.translate(60 * Math.cos(Math.PI * 1.95), 60 * Math.sin(Math.PI * 1.95)); g.rotate(-jaw); g.translate(-60 * Math.cos(Math.PI * 1.95), -60 * Math.sin(Math.PI * 1.95));
        g.beginPath(); g.arc(0, 0, 60, Math.PI * 1.95, Math.PI * 2.6); g.stroke(); g.restore();
        g.fillStyle = c || mixc(C.metal, C.fig, 0.4); g.fill(rr(-104, -26, 54, 52, 8)); };
      rim(body, 3.5, 0.9, 0.8);
      g.strokeStyle = rgba(shade(C.metal, 0.35), 0.8); g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 54, Math.PI * 0.95, Math.PI * 1.55); g.stroke();
      g.restore();
    };
    rim(c => { g.strokeStyle = c || mixc(C.metal, C.fig, 0.35); g.lineWidth = 7; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(-24 + k * 24, 0, 15, 9, 0, 0, TAU); g.stroke(); } }, 2, 0.7, 0.7);
    cuff(-130, -1, 0); cuff(130, 1, 1);
    g.restore(); glint(cx + 150, cy - 70, t, tc + 0.02, 56);
  };
  return (t) => {
    cam(1);
    room(FY, X, C.pool, 0.58);
    const pl = (0.16 + 0.26 * seg(t, 0, HIT)) * (t > HIT ? 0.75 : 1), ph = t * 2.3 * TAU;
    pool(X - 560, 330, 620, 430, C.hot, pl * (0.5 + 0.5 * Math.sin(ph)));
    pool(X + 560, 330, 620, 430, '#3A6DFF', pl * (0.5 - 0.5 * Math.sin(ph)));
    beam(X, -80, X, FY + 10, 150, 760, C.ink, 0.11);
    glow(X, FY + 6, 560, C.pool, 0.7);
    if (t > HIT - 0.04) {                         // the bars' shadows thrown on the wall behind
      g.fillStyle = rgba('#000', 0.32 * seg(t, HIT - 0.04, HIT + 0.25));
      for (let k = 0; k < NB; k++) { const bx = BX0 + (BX1 - BX0) * k / (NB - 1); g.fillRect(X + (bx - X) * 0.82 + 18, BT + 80, BW * 0.75, FY - BT - 86); }
    }
    if (PH) bust(X, FY + 170, 900);
    else figRim(X, FY, 610, lp(POSE.stand, POSE.cuffed, sm(seg(t, tc - 0.32, tc))), 1, { ka: 0.9 });
    const yo = drop(t, HIT, 0.3, -1180, 0, 24, 0.2);
    for (let k = 0; k < NB; k++) metalBar(BX0 + (BX1 - BX0) * k / (NB - 1) - BW / 2, BT + yo, BW, FY - BT, 4);
    metalBar(BX0 - 50, BT - 10 + yo, BX1 - BX0 + 100, 40, 4);
    metalBar(BX0 - 50, BT + 300 + yo, BX1 - BX0 + 100, 26, 4);
    metalBar(BX0 - 50, FY - 150 + yo, BX1 - BX0 + 100, 26, 4);
    drawFx(t);
    cuffs(t);
  };
};
// ── dispatch ─────────────────────────────────────────────────────────────────────────────────────────────────────
let _af = null;
function build() {
  const f = AC[S.type];
  if (!f) throw new Error('actions: unknown scene ' + S.type);
  if (S.error) throw new Error(S.error);
  stage(); loadPhoto();
  const go = () => { _af = f(); };
  if (window.__wait) window.__wait = window.__wait.then(go); else go();
}
function frame(tRaw) {
  if (!_af) return;
  const t = STEP ? Math.floor(tRaw * STEP + 1e-6) / STEP : tRaw;
  camSolve(t, tRaw);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  FXF = false;
  _af(t, tRaw);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  cam(1); if (!FXF) drawFx(t);
  if (DUST) dust(tRaw);
  for (const T of TAGS) T.at(t);
  let fa = 0, fc = '#fff';
  for (const [t0, a, col] of FLASHES) { const f = Math.floor((t - t0) * 30 + 1e-6); if (f === 0) { fa = Math.max(fa, a); fc = col; } else if (f === 1) { fa = Math.max(fa, a * 0.45); fc = col; } }
  FLASH.style.opacity = fa; FLASH.style.background = fc;
  const fi = Math.floor(tRaw * 30 + 1e-6);
  document.getElementById('grain').style.backgroundPosition = `${Math.floor(hn(fi, 31) * 512)}px ${Math.floor(hn(fi, 32) * 512)}px`;
}
// ── JAILED: inside a cell — a barred window throws its shaft across the dark, the prisoner sits hunched on the bunk;
// the barred DOOR slides in front of the lens and SLAMS shut on the verb (the camera is outside); the shaft creeps
// on (time passing); S.years (only when the sentence says it) scratches that many tally marks into the wall
AC.jailed = function () {
  const FY = 860, WX = 1230, WY = 190, WW = 250, WH = 180, BX = 380, BY = 690;
  CAM.keys = [[0, 930, 540, 1.16, 0], [HIT, 950, 540, 1.04, 0], [D, 960, 545, 1.0, 0]]; CAM.creep = 0.012;
  DUST.x = 1000; DUST.y = 600; DUST.col = C.key;
  stdTags();
  kick(HIT, 0.045, 22, -0.6); flash(HIT, 0.14);
  sparks(HIT, 70, 560, 9, C.key, 650, 0, 1.2, 1300, 0.35);
  const yrs = Math.max(0, Math.min(40, Math.round(+S.years || 0)));
  const door = (t) => {
    let off;
    if (t < HIT) off = 1460 * (1 - ei2(seg(t, HIT - 0.46, HIT)));
    else { const u = t - HIT; off = -26 * Math.exp(-u / 0.1) * Math.sin(u * 34); }
    cam(1.35);
    const x0 = -120 + off;
    for (let k = 0; k < 14; k++) metalBar(x0 + k * 168, -260, 44, 1600, 5);
    metalBar(x0 - 40, 250, 2400, 36, 5); metalBar(x0 - 40, 830, 2400, 36, 5);
    rim(c => { g.fillStyle = c || mixc(C.metal, C.fig, 0.7); g.fill(rr(x0 - 40, 520, 140, 190, 10)); }, 5);
    g.fillStyle = rgba('#000', 0.6); g.fill(rr(x0 + 16, 590, 22, 44, 8));
    cam(1);
  };
  return (t) => {
    cam(1);
    room(FY, 900, C.pool, 0.3);
    g.fillStyle = rgba('#000', 0.16);
    for (let r = 0; r < 15; r++) { const y = 40 + r * 56; if (y > FY) break; g.fillRect(-300, y, 2600, 3); for (let c = 0; c < 24; c++) g.fillRect(-300 + c * 118 + (r % 2) * 59, y, 3, 56); }
    g.fillStyle = shade(C.cool, -0.25); g.fillRect(WX, WY, WW, WH);
    pool(WX + WW / 2, WY + WH / 2, 260, 200, C.cool, 0.35);
    const dx = -560 - 70 * t, fx0 = WX + dx, fx1 = WX + WW + dx - 40;
    g.save(); g.globalCompositeOperation = 'lighter';
    const sg = g.createLinearGradient(WX, WY, fx0, FY + 90); sg.addColorStop(0, rgba(C.key, 0.2)); sg.addColorStop(1, rgba(C.key, 0.05));
    g.fillStyle = sg; g.beginPath(); g.moveTo(WX, WY); g.lineTo(WX + WW, WY); g.lineTo(fx1 + 150, FY + 90); g.lineTo(fx0, FY + 90); g.closePath(); g.fill();
    g.fillStyle = rgba(C.key, 0.16); g.beginPath(); g.moveTo(fx0 + 60, FY + 10); g.lineTo(fx1 + 70, FY + 10); g.lineTo(fx1 + 150, FY + 90); g.lineTo(fx0, FY + 90); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = rgba('#000', 0.45);
    for (let k = 0; k < 4; k++) { const a = (k + 0.5) / 4; g.fillRect(fx0 + 30 + (fx1 - fx0 + 90) * a, FY + 10, 14, 80); }
    for (let k = 0; k < 4; k++) metalBar(WX + 22 + k * 62, WY - 8, 16, WH + 16, 2);
    if (yrs) {
      const n = Math.min(yrs, Math.floor(seg(t, HIT + 0.15, HIT + 0.15 + yrs / 14) * yrs + 1e-6));
      g.strokeStyle = rgba(C.ink, 0.55); g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < n; i++) { const gi = Math.floor(i / 5), k = i % 5, x = 1180 + (gi % 4) * 120, y = 470 + Math.floor(gi / 4) * 110;
        g.beginPath(); if (k < 4) { g.moveTo(x + k * 18, y); g.lineTo(x + k * 18 + 3, y + 70); } else { g.moveTo(x - 10, y + 56); g.lineTo(x + 70, y + 12); } g.stroke(); }
    }
    rim(c => { g.fillStyle = c || shade(C.wood, -0.45); g.fill(rr(BX, BY, 600, 32, 6)); }, 3);
    g.fillStyle = shade(C.wood, -0.6); g.fillRect(BX + 24, BY + 32, 18, FY - BY - 32); g.fillRect(BX + 556, BY + 32, 18, FY - BY - 32);
    glow(700, FY + 4, 620, C.pool, 0.5);
    if (PH) bust(700, FY + 70, 660);
    else { const br = Math.sin(t * 2.2) * 0.02; figRim(650, FY, 680, lp(POSE.sit, POSE.hunch, 0.75 + br), 1, { ka: 0.55 }); }
    drawFx(t);
    door(t);
  };
};
// ── SHOT: a cold spotlight on the person; a hand and a pistol slide in from the frame edge, aim, FIRE on the verb —
// a two-frame muzzle flash, the round as a streak of light, impact RIPPLES at the chest (no blood, ever); the person
// jolts back and, when the sentence says they died, falls out of the light. variant "quiet" (assassinated,
// murdered: the weapon is not said) — no gun: the light stutters, a red shock ring, the fall.
AC.shot = function () {
  const quiet = S.variant === 'quiet', falls = !!S.falls, X = 780, FY = 900, Hh = 620;
  CAM.keys = [[0, 920, 540, 1.04, 0], [HIT, 900, 540, 1.1, 0], [D, 860, 565, 1.15, 0]];
  DUST.x = X; DUST.y = 520;
  stdTags({ x: 112 });
  const chest = PH ? [X, FY + 180 - 860 * 0.42] : [X + 6, FY - Hh * 0.62];
  kick(HIT, 0.075, 24, -0.9); flash(HIT, quiet ? 0.32 : 0.55, quiet ? C.hot : '#fff');
  ring(HIT + 0.02, chest[0], chest[1], 230, C.hot, 13, 0.55); ring(HIT + 0.1, chest[0], chest[1], 420, C.ink, 5, 0.7); ring(HIT + 0.2, chest[0], chest[1], 640, C.hot, 3, 0.85);
  sparks(HIT + 0.02, chest[0], chest[1], 14, C.ink, 700, 0, TAU, 300, 0.3);
  const GX = 1530, GY = 470, piv = [130, 52];
  if (!quiet) sparks(HIT, GX - piv[0], GY - piv[1], 16, '#FFE2B0', 1100, Math.PI, 0.7, 150, 0.22);
  const crumple = { lean: -0.32, head: -0.5, an: [-1.1, 0.4], af: [-1.4, 0.35], ln: [0.55, 1.0], lf: [0.25, 0.6], drop: 6, front: 0.5, back: 0 };
  const gun = (t) => {
    const e = eo3(seg(t, HIT - 0.72, HIT - 0.24)); if (e <= 0) return;
    const u = t - HIT, rec = t >= HIT ? 0.34 * Math.exp(-u / 0.11) * Math.cos(u * 22) : 0;
    g.save(); g.translate(GX + 560 * (1 - e) + (t >= HIT ? 34 * Math.exp(-u / 0.1) : 0), GY + 4 * Math.sin(t * 3)); g.rotate(rec + 0.04 * (1 - e)); g.translate(-piv[0], -piv[1]);
    rim(c => {
      const f = c || C.fig; g.fillStyle = f;
      g.fill(rr(150, 18, 600, 82, 30)); g.fill(rr(92, 4, 92, 90, 28));
      g.fill(rr(0, -16, 168, 30, 6)); g.fill(poly([[96, 10], [146, 10], [166, 98], [122, 104]]));
      g.strokeStyle = f; g.lineWidth = 7; g.beginPath(); g.arc(104, 22, 18, 0.2, Math.PI * 0.95); g.stroke();
    }, 4.5);
    g.fillStyle = rgba(shade(C.metal, -0.2), 0.8); g.fillRect(8, -12, 150, 5);
    g.restore();
    const f = Math.floor((t - HIT) * 30 + 1e-6);
    if (f >= 0 && f <= 1) {                          // the muzzle flash: frame 0 big, frame 1 smaller, then gone
      const mx = GX - piv[0] - 10, my = GY - piv[1] - 2, k = f ? 0.55 : 1;
      g.save(); g.translate(mx, my); g.globalCompositeOperation = 'lighter';
      pool(0, 0, 260 * k, 260 * k, C.key, 0.8);
      g.fillStyle = '#FFF6DA'; g.beginPath();
      for (let i = 0; i < 16; i++) { const a = Math.PI + (i / 16) * TAU, r = (i % 2 ? 26 : (i % 4 ? 70 : 120)) * k * (i === 0 ? 1.4 : 1); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7); }
      g.closePath(); g.fill(); g.restore();
    }
    if (f >= 0 && f <= 4) {                          // the round: a streak of light from the muzzle to the chest
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#FFF2D0', 1 - f / 5); g.lineWidth = 6 - f; g.lineCap = 'round';
      g.beginPath(); g.moveTo(GX - piv[0] - 20, GY - piv[1]); g.lineTo(chest[0] + 30, chest[1]); g.stroke(); g.restore();
    }
  };
  return (t) => {
    cam(1);
    g.fillStyle = C.wall; g.fillRect(-600, -400, 3120, 1300); g.fillStyle = C.floor; g.fillRect(-600, FY, 3120, 800);
    let lit = 1;
    if (quiet && t > HIT - 0.5 && t < HIT) lit = (Math.floor((t - HIT) * 30) % 3 === 0) ? 0.35 : 1;
    if (falls && t > HIT) lit = 1 - 0.75 * sm(seg(t, HIT + 0.3, HIT + 1.1));
    const red = quiet ? sm(seg(t, HIT, HIT + 0.3)) : 0.5 * sm(seg(t, HIT, HIT + 0.25)) * Math.exp(-(t - HIT) / 1.2);
    pool(X, 560, 720, 640, mixc(C.pool, C.hot, red), 0.55 * lit);
    beam(X, -120, X, FY + 20, 110, 640, C.ink, 0.15 * lit);
    glow(X, FY + 6, 460, C.pool, 0.7 * lit);
    const u = t - HIT, jolt = t >= HIT ? -0.3 * Math.exp(-u / 0.25) * Math.cos(u * 9) : 0;
    if (PH) {
      const fall = falls ? ei2(seg(t, HIT + 0.2, HIT + 0.75)) : 0;
      bust(X, FY + 180 + 760 * fall, 860, { rot: jolt * 0.2 - 0.35 * fall, a: 1 - 0.5 * fall });
    } else {
      const fall = falls ? ei2(seg(t, HIT + 0.14, HIT + 0.66)) : 0, land = falls && t > HIT + 0.66 ? 0.06 * Math.exp(-(t - HIT - 0.66) / 0.1) * Math.sin((t - HIT - 0.66) * 30) : 0;
      const p = lp(lp(POSE.stand, Object.assign({}, POSE.stand, { lean: -0.35, head: -0.4, an: [-0.5, 0.3], af: [-0.7, 0.3] }), t >= HIT ? clamp(-jolt / 0.3) : 0), crumple, fall);
      figRim(X, FY, Hh, p, 1, { rot: -1.48 * fall + land });
    }
    if (!quiet) gun(t);
    drawFx(t);
  };
};
// ── DIED: the person stands in warm light; on the verb they come apart into dust that the wind carries off,
// head first, while the light goes cold. No drama, no body: the absence is the picture.
AC.died = function () {
  const X = 960, FY = 920, Hh = 640, OW = 900, OH = 1000;
  CAM.keys = [[0, 960, 540, 1.0, 0], [D, 975, 515, 1.09, 0]]; CAM.ease = x => x; CAM.creep = 0.006; CAM.drift = 0.6;
  DUST.x = X; DUST.y = 520; DUST.col = C.key; DUST.up = 9;
  stdTags({ kicker: S.when || S.where || '' });
  const off = snap(OW, OH, () => { if (PH) bust(OW / 2, OH + 40, 900); else figRim(OW / 2, OH - 10, Hh, POSE.stand, 1); });
  const TS = 6, T = tiles(off, TS), ox = X - OW / 2, oy = FY - OH + 10;
  let ymin = 1e9, ymax = -1e9; for (const p of T) { ymin = Math.min(ymin, p.sy); ymax = Math.max(ymax, p.sy); }
  for (const p of T) { const ny = (p.sy - ymin) / Math.max(1, ymax - ymin), nx = p.sx / OW; p.tr = HIT - 0.08 + 1.55 * (0.72 * ny + 0.28 * (1 - nx)) + 0.18 * p.r; }
  const LIFE = 1.5;
  return (t) => {
    cam(1);
    room(FY, X, mixc(C.key, C.cool, sm(seg(t, HIT, HIT + 1.4))), 0.34 * (1 - 0.35 * seg(t, HIT, HIT + 2)), 0.9);
    beam(X, -120, X, FY, 120, 700, mixc(C.key, C.cool, seg(t, HIT, HIT + 1.4)), 0.12 * (1 - 0.6 * seg(t, HIT + 0.3, HIT + 2.2)));
    const gl = 1 - sm(seg(t, HIT + 0.4, HIT + 2.0));
    glow(X, FY + 6, 520, C.key, 0.55 * gl);
    const bob = 3 * Math.sin(t * 1.6);
    if (t < HIT - 0.1) { g.drawImage(off, ox, oy + bob); }
    else {
      for (const p of T) {
        if (t < p.tr) { g.drawImage(off, p.sx, p.sy, TS, TS, ox + p.sx, oy + p.sy + bob, TS, TS); continue; }
        const u = (t - p.tr) / LIFE; if (u >= 1) continue;
        const dx = (140 + 300 * p.r) * u + 26 * Math.sin(u * 6 + p.q * 9), dy = -(50 + 150 * p.q) * u - 40 * u * u, s = TS * (1 - 0.7 * u);
        g.globalAlpha = (1 - u) * (1 - u); g.drawImage(off, p.sx, p.sy, TS, TS, ox + p.sx + dx, oy + p.sy + bob + dy, s, s);
      }
      g.globalAlpha = 1;
    }
    drawFx(t);
  };
};
// ── FIRED / DISMISSED: an office — the person carries a box of their things to the door and leaves; the door SLAMS on
// the verb, its draught lifts the papers off the desk and they flutter down (fired = out the door, not a gun)
AC.fired = function () {
  const FY = 880, DX = 1330, DW = 250, DH = 470, Hh = 560, tExit = HIT - 0.16;
  CAM.keys = [[0, 900, 540, 1.06, 0], [HIT, 1010, 540, 1.1, 0], [D, 1030, 550, 1.13, 0]];
  DUST.x = 1000; DUST.y = 560;
  stdTags({ name: S.who, kicker: [S.role, S.where].filter(Boolean).join(' · ') });
  kick(HIT, 0.045, 16, 0.5);
  puffs(HIT, DX + DW / 2, FY - 30, 8, C.ink, 10, 60, 0.9, -60, -20, 200, 0.12);
  const NP = 9, PAP = Array.from({ length: NP }, (_, i) => ({ x: 420 + 260 * hn(i, 71), y: 690 - 6 * i, vx: 120 + 380 * hn(i, 72), vy: -(380 + 420 * hn(i, 73)), r0: hn(i, 74) * 0.6 - 0.3, sp: (hn(i, 75) - 0.5) * 10 }));
  return (t) => {
    cam(1);
    room(FY, 960, C.pool, 0.42, 1.2);
    // the door: a frame, the dark corridor behind it, the leaf swinging (its width = cos of the angle)
    const open = t < tExit ? 1 : (t < HIT ? 1 - ei2(seg(t, tExit, HIT)) : -0.04 * Math.exp(-(t - HIT) / 0.08) * Math.sin((t - HIT) * 40));
    g.fillStyle = shade(C.wall, -0.5); g.fillRect(DX, FY - DH, DW, DH);
    pool(DX + DW / 2, FY - DH / 2, 240, 300, C.key, 0.3 * Math.max(0, open));
    // the desk (left) and its papers
    rim(c => { g.fillStyle = c || shade(C.wood, -0.3); g.fillRect(360, 700, 420, 26); g.fillRect(380, 726, 26, FY - 726); g.fillRect(734, 726, 26, FY - 726); }, 3);
    for (const p of PAP) {
      const u = Math.max(0, t - HIT + 0.04), fly = t >= HIT - 0.04;
      const x = p.x + (fly ? p.vx * u + 40 * Math.sin(u * 5 + p.sp) : 0), y = fly ? Math.min(FY - 4, p.y + p.vy * u + 520 * u * u) : p.y;
      g.save(); g.translate(x, y); g.rotate(p.r0 + (fly ? p.sp * u * 0.35 : 0)); g.scale(1, fly ? 0.55 + 0.45 * Math.cos(u * 7 + p.sp) : 0.35);
      g.fillStyle = C.paper; g.fillRect(-46, -30, 92, 60); g.fillStyle = rgba('#000', 0.18); for (let k = 0; k < 4; k++) g.fillRect(-36, -18 + k * 11, 70 - 14 * (k % 2), 4);
      g.restore();
    }
    // the person: walks from the desk to the door carrying the box, gone through it at tExit
    if (t < tExit + 0.02) {
      const sx = DX + DW * 0.45 - (tExit - t) * 300, ph = (t - tExit) * 9.5;
      const p = walk(ph, 0, POSE.carry); p.an = [0.55, 1.05]; p.af = [0.5, 1.1];
      const vis = clamp((DX + DW * 0.7 - sx) / 60);
      g.save(); if (sx > DX - 40) { g.beginPath(); g.rect(-600, -400, DX + DW + 600, 1600); g.clip(); }
      glow(sx, FY + 4, 260, C.pool, 0.5 * vis);
      figRim(sx, FY, Hh, p, 1);
      rim(c => { g.fillStyle = c || '#8B6A43'; g.fill(rr(sx + Hh * 0.05, FY - Hh * 0.62, Hh * 0.2, Hh * 0.14, 4)); }, 3);
      g.fillStyle = C.paper; g.fillRect(sx + Hh * 0.08, FY - Hh * 0.67, Hh * 0.06, Hh * 0.06); g.fillRect(sx + Hh * 0.15, FY - Hh * 0.66, Hh * 0.05, Hh * 0.05);
      g.restore();
    }
    rim(c => { g.fillStyle = c || shade(C.wood, -0.4); g.fillRect(DX - 22, FY - DH - 22, DW + 44, 22); g.fillRect(DX - 22, FY - DH, 22, DH); g.fillRect(DX + DW, FY - DH, 22, DH); }, 3);
    const lw = DW * Math.cos(Math.max(0, open) * 1.35), lx = DX + DW - lw;
    rim(c => { g.fillStyle = c || shade(C.wood, -0.18); g.fillRect(lx, FY - DH, Math.max(4, lw), DH); }, 3);
    if (lw > 30) { g.fillStyle = rgba('#000', 0.25); g.fillRect(lx + lw * 0.12, FY - DH + 40, lw * 0.76, 160); g.fillRect(lx + lw * 0.12, FY - DH + 240, lw * 0.76, 190);
      g.fillStyle = C.key; g.beginPath(); g.arc(lx + lw * 0.14, FY - DH * 0.48, 8, 0, TAU); g.fill(); }
    drawFx(t);
  };
};
// ── FLED / ESCAPED: night; a searchlight on a tower sweeps the yard; the person RUNS, a dashed trail on the ground
// behind them, through the gap in the wire on the verb — the beam lands a beat late on the empty gap (the miss)
AC.fled = function () {
  const FY = 860, Hh = 400, GX = 1300, SP = 640, xr = t => GX + (t - HIT) * SP;
  CAM.keys = [[0, xr(0) + 140, 520, 1.06, 0], [D, xr(D) + 200, 515, 1.1, 0]]; CAM.ease = x => x; CAM.creep = 0.01;
  DUST.col = C.cool; DUST.x = GX; DUST.y = 600;
  tag(112, 92, S.who, S.to ? (S.from ? S.from + ' → ' : '→ ') + S.to : (S.from || S.when || ''), { t0: Math.max(0.12, HIT - 0.75) });
  kick(HIT, 0.03, 8, 0.3);
  const hills = Array.from({ length: 30 }, (_, i) => [i * 260 - 2000, 560 - 90 * hn(i, 81) - 40 * hn(i, 82)]);
  return (t) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, 760); sky.addColorStop(0, C.bg); sky.addColorStop(1, shade(C.wall, 0.05));
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    cam(0.35); g.fillStyle = shade(C.wall, -0.25); g.beginPath(); g.moveTo(-3000, 900);
    hills.forEach(([x, y]) => g.lineTo(x + GX - 1000, y + 120)); g.lineTo(6000, 900); g.closePath(); g.fill();
    cam(1);
    g.fillStyle = C.floor; g.fillRect(-2000, FY - 40, 8000, 900);
    // the tower and its beam: the target lags the runner by 0.45 s — at the hit it lands on the empty gap
    const TX = GX - 1050, TY = 250, tgt = xr(t - 0.45);
    rim(c => { g.fillStyle = c || C.fig; g.fillRect(TX - 20, TY, 40, FY - TY); g.fillRect(TX - 70, TY - 40, 140, 50); }, 4);
    beam(TX + 30, TY - 15, tgt, FY + 10, 26, 330, C.ink, 0.2);
    pool(tgt, FY + 10, 230, 50, C.ink, 0.35);
    // the fence: posts and wire, a gap at GX with the wire curled back
    for (let k = -14; k < 26; k++) {
      const x = GX - 60 + k * 150; if (Math.abs(x - GX) < 100) continue;
      rim(c => { g.fillStyle = c || C.fig; g.fillRect(x - 7, FY - 270, 14, 290); }, 3, 0.7, 0.7);
    }
    g.strokeStyle = rgba(C.metal, 0.45); g.lineWidth = 2.5;
    for (let r = 0; r < 4; r++) { const y = FY - 250 + r * 62; g.beginPath(); g.moveTo(GX - 2400, y); g.lineTo(GX - 95, y + 4); g.moveTo(GX + 95, y + 4); g.lineTo(GX + 3200, y); g.stroke(); }
    // the trail and the runner (in front of the fence: a little lower on the ground)
    const x = xr(t), ph = (t - HIT) * 13.0, ry = FY + 70;
    g.setLineDash([22, 18]); g.lineDashOffset = -t * 60; g.strokeStyle = rgba(C.key, 0.75); g.lineWidth = 6; g.beginPath();
    for (let k = 0; k <= 40; k++) { const xx = xr(0) - 500 + (x - 60 - (xr(0) - 500)) * k / 40; g.lineTo(xx, ry + 12 + 10 * Math.sin(xx * 0.004)); }
    g.stroke(); g.setLineDash([]);
    glow(x, ry + 4, 230, C.pool, 0.45);
    figRim(x, ry, Hh, walk(ph, 1), 1, { coat: true });
    drawFx(t);
  };
};
// ── FLEW / TRAVELLED: the real ground between the two places (S.geo from actions.py: land rings + the two points in a
// 3200x1800 map), the plane takes off from A on the verb, the dashed arc draws behind it, the camera rides along
// (out mid-flight, in at B), B pings on S.arrive (the destination word). mode "route": a marker instead of a plane.
AC.flew = function () {
  const G = S.geo || null, MW = 3200, MH = 1800;
  const A = G ? G.a : [900, 1050], B = G ? G.b : [2300, 760], ARR = S.arrive != null ? +S.arrive : HIT + 1.7;
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = (A[1] - B[1]) / L, ny = (B[0] - A[0]) / L, sg = ny < 0 ? 1 : -1;
  const Q = [(A[0] + B[0]) / 2 + nx * sg * L * 0.26, (A[1] + B[1]) / 2 + ny * sg * L * 0.26];
  const at = s => [(1 - s) * (1 - s) * A[0] + 2 * (1 - s) * s * Q[0] + s * s * B[0], (1 - s) * (1 - s) * A[1] + 2 * (1 - s) * s * Q[1] + s * s * B[1]];
  const zf = Math.min(1.1, 1500 / (L + 500)), mid = at(0.5);
  CAM.keys = [[0, A[0] + 60, A[1] - 20, 1.25, 0], [HIT, A[0] + 90, A[1] - 30, 1.2, 0], [(HIT + ARR) / 2, mid[0], mid[1], zf, 0], [ARR, B[0], B[1], 1.15, 0], [D, B[0], B[1], 1.3, 0]];
  CAM.creep = 0; DUST = null;
  tag(112, 92, S.who, S.when || '', { t0: Math.max(0.12, HIT - 0.75) });
  ring(ARR, B[0], B[1], 150, C.key, 7, 0.7); ring(ARR + 0.12, B[0], B[1], 260, C.ink, 3, 0.9); kick(ARR, 0.035, 6);
  const land = G ? G.land.map(r => { const p = new Path2D(); for (let i = 0; i < r.length; i += 2) i ? p.lineTo(r[i], r[i + 1]) : p.moveTo(r[i], r[i + 1]); p.closePath(); return p; }) : [];
  const dots = [];
  if (!G) for (let y = 0; y < MH; y += 34) for (let x = 0; x < MW; x += 34) { const v = Math.sin(x * 0.0021 + 1.3) + Math.sin(y * 0.003 + x * 0.001) + 0.6 * Math.sin(x * 0.006 - y * 0.004); if (v > 0.55) dots.push([x + (y / 34 % 2) * 17, y]); }
  const pin = (p, name, t0, big) => {
    const u = t0 == null ? 1 : spring((t - t0) / 0.6); if (u <= 0) return;
    g.save(); g.translate(p[0], p[1]);
    pool(0, 0, 90, 90, C.key, 0.35 * clamp(u));
    g.fillStyle = C.key; g.beginPath(); g.arc(0, 0, (big ? 15 : 11) * u, 0, TAU); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, (big ? 26 : 20) * u, 0, TAU); g.stroke();
    if (name) { g.font = `600 ${big ? 50 : 40}px 'Ac Cond'`; g.fillStyle = C.ink; g.textBaseline = 'middle'; g.globalAlpha = clamp(u);
      g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 12; g.fillText(UP(name), 38, -4); g.shadowBlur = 0; }
    g.restore();
  };
  let t = 0;
  return (tt) => {
    t = tt; cam(1);
    g.fillStyle = shade(C.bg, 0.02); g.fillRect(-1000, -800, MW + 2000, MH + 1600);
    g.strokeStyle = rgba(C.cool, 0.08); g.lineWidth = 2;
    for (let x = 0; x <= MW; x += 200) { g.beginPath(); g.moveTo(x, -400); g.lineTo(x, MH + 400); g.stroke(); }
    for (let y = 0; y <= MH; y += 200) { g.beginPath(); g.moveTo(-600, y); g.lineTo(MW + 600, y); g.stroke(); }
    if (G) { g.fillStyle = mixc(C.wall, C.cool, 0.12); for (const p of land) g.fill(p); g.strokeStyle = rgba(C.cool, 0.55); g.lineWidth = 2.2; for (const p of land) g.stroke(p); }
    else { g.fillStyle = rgba(C.cool, 0.35); for (const [x, y] of dots) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } }
    const s = sm(seg(t, HIT, ARR)), P0 = at(s), P1 = at(Math.min(1, s + 0.01)), ang = Math.atan2(P1[1] - P0[1], P1[0] - P0[0]);
    g.setLineDash([16, 14]); g.strokeStyle = rgba(C.ink, 0.85); g.lineWidth = 5; g.beginPath();
    for (let k = 0; k <= 60; k++) { const q = at(s * k / 60); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); g.setLineDash([]);
    pin(A, S.from || '', null, false);
    if (t >= ARR - 0.05) pin(B, S.to || '', ARR - 0.05, true); else { g.strokeStyle = rgba(C.key, 0.6); g.lineWidth = 3; g.beginPath(); g.arc(B[0], B[1], 16 + 6 * Math.sin(t * 5), 0, TAU); g.stroke(); }
    if (t < ARR + 0.25 || S.mode !== 'route') {
      const alt = Math.sin(Math.PI * s), sc = 0.85 + 0.35 * alt, fade = S.mode === 'route' ? 1 : 1 - seg(t, ARR + 0.2, ARR + 0.6);
      g.save(); g.translate(P0[0] + 26 * alt, P0[1] + 34 * alt); g.rotate(ang); g.scale(sc, sc); g.fillStyle = rgba('#000', 0.35 * fade);
      plane(true); g.restore();
      g.save(); g.translate(P0[0], P0[1]); g.rotate(ang); g.scale(sc, sc); g.globalAlpha = fade; if (S.mode === 'route') { rim(c => { g.fillStyle = c || C.ink; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill(); }, 3); } else rim(c => plane(false, c), 3); g.restore();
    }
    drawFx(t);
  };
  function plane(shadow, c) {
    if (!shadow) g.fillStyle = c || C.ink;
    g.fill(rr(-62, -10, 124, 20, 10));
    g.fill(poly([[12, -8], [-14, -70], [-30, -70], [-12, -8]])); g.fill(poly([[12, 8], [-14, 70], [-30, 70], [-12, 8]]));
    g.fill(poly([[-46, -6], [-60, -28], [-68, -28], [-60, -4]])); g.fill(poly([[-46, 6], [-60, 28], [-68, 28], [-60, 4]]));
  }
};
// ── a paper document drawn once (title = the sentence's own words; the text is grey bars, never invented lines) ─────
function docCanvas(w, h, title, opt = {}) {
  return snap(w, h, () => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, shade(C.paper, 0.04)); gr.addColorStop(1, shade(C.paper, -0.1));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = rgba('#000', 0.06); g.fillRect(0, h - 8, w, 8); g.fillRect(w - 6, 0, 6, h);
    let y = 70;
    if (title) {
      let fs = Math.round(w * 0.075); g.font = `700 ${fs}px 'Ac Serif'`;
      const T = UP(title); while (g.measureText(T).width > w - 110 && fs > 18) { fs -= 2; g.font = `700 ${fs}px 'Ac Serif'`; }
      g.fillStyle = '#1D1A16'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(T, w / 2, y + fs); y += fs + 26;
      g.fillRect(w * 0.18, y, w * 0.64, 3); y += 34;
    }
    g.fillStyle = rgba('#1D1A16', 0.32);
    const rows = Math.floor((h - y - (opt.sign ? 230 : 60)) / 30);
    for (let r = 0; r < rows; r++) { const ww = (w - 120) * (r % 5 === 4 ? 0.55 : 0.82 + 0.16 * hn(r, 91)); g.fillRect(60, y + r * 30, ww, 10); }
    if (opt.sign) { g.fillStyle = rgba('#1D1A16', 0.6); g.fillRect(w * 0.42, h - 120, w * 0.48, 3); }
  });
}
// ── MET / NEGOTIATED: a room with a long table under one hanging lamp; the two walk in from either side and SHAKE
// HANDS on the verb (the grip lands, a glint, the lamp swells), then two short pumps; a name over each side
AC.met = function () {
  const FY = 880, Hh = 560, X = 960, stop = HIT - 0.32, R = 182;
  CAM.keys = [[0, 960, 540, 1.0, 0], [HIT, 960, 548, 1.07, 0], [D, 960, 552, 1.11, 0]];
  DUST.x = X; DUST.y = 520;
  tag(112, 92, S.who, [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  tag(1808, 92, S.who2, '', { align: 'right', t0: Math.max(0.2, HIT - 0.6) });
  kick(HIT, 0.03, 7, 0.2);
  return (t) => {
    cam(1);
    const sw = 1 + 0.35 * Math.exp(-Math.max(0, t - HIT) / 0.5) * (t >= HIT ? 1 : 0);
    room(FY, X, C.pool, 0.5 * sw);
    g.strokeStyle = rgba(C.metal, 0.4); g.lineWidth = 3; g.beginPath(); g.moveTo(X, -300); g.lineTo(X, 150); g.stroke();
    rim(c => { g.fillStyle = c || C.fig; g.fill(poly([[X - 40, 150], [X + 40, 150], [X + 110, 225], [X - 110, 225]])); }, 3);
    beam(X, 222, X, FY - 250, 200, 1100, C.key, 0.12 * sw);
    pool(X, 230, 120, 30, C.key, 0.9);
    rim(c => { g.fillStyle = c || shade(C.wood, -0.35); g.fillRect(X - 760, FY - 270, 1520, 30); g.fillRect(X - 730, FY - 240, 26, 240); g.fillRect(X + 704, FY - 240, 26, 240); }, 3);
    if (S.variant === 'talks') { g.fillStyle = C.paper; for (let k = 0; k < 4; k++) g.fillRect(X - 560 + k * 300, FY - 280, 120, 14); }
    glow(X, FY + 6, 760, C.pool, 0.6);
    const wl = Math.max(0, stop - t), u = sm(seg(t, stop - 0.05, HIT));
    for (const dir of [1, -1]) {
      const x = X - dir * (R + wl * 280), ph = (stop - t) * 9;
      let p = wl > 0 ? walk(-ph, 0) : Object.assign({}, POSE.stand, { front: 0.15 });
      p = lp(p, POSE.shake, u);
      if (t > HIT) { const k = Math.exp(-(t - HIT) / 0.55) * Math.sin((t - HIT) * 15); p.an = [p.an[0] + 0.1 * k, p.an[1] + 0.06 * k]; }
      figRim(x, FY, Hh, p, dir, { ka: dir > 0 ? 1 : 0.7, ca: dir > 0 ? 0.7 : 1 });
    }
    glint(X, FY - Hh * 0.66, t, HIT, 54);
    drawFx(t);
  };
};
// ── SIGNED: top-down on the desk — the document (title = S.what), the pen writes the name (S.who, in a hand) across
// the signature line, and the SEAL slams down on the verb (shudder, ring, kick)
AC.signed = function () {
  const DW = 820, DH = 1060, OX = 960 - DW / 2, OY = 60, sigY = OY + DH - 128, sigX = OX + DW * 0.44;
  const doc = docCanvas(DW, DH, S.what || '', { sign: true });
  const t0 = Math.max(0.05, HIT - 1.05), t1 = Math.max(t0 + 0.45, HIT - 0.18);
  CAM.keys = [[0, 960, 470, 1.12, -2], [t1, 1010, 820, 1.25, -1], [HIT, 1060, 860, 1.2, 0], [D, 1060, 860, 1.28, 0]];
  DUST = null;
  tag(112, 92, S.who || '', S.when || S.where || '', { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.05, 12, 0.6);
  const SX = OX + DW - 190, SY = OY + DH - 260;
  ring(HIT, SX, SY, 220, C.hot, 8, 0.5); sparks(HIT, SX, SY, 12, C.paper, 500, 0, TAU, 600, 0.3);
  g.font = "700 104px 'Ac Hand'"; const NAME = String(S.who || '').trim(), NW = Math.min(DW * 0.5, g.measureText(NAME).width || 1), NS = NAME ? Math.min(1, DW * 0.5 / (g.measureText(NAME).width || 1)) : 1;
  return (t) => {
    cam(1);
    g.fillStyle = shade(C.wood, -0.55); g.fillRect(-400, -400, 2720, 1900);
    g.strokeStyle = rgba('#000', 0.18); g.lineWidth = 3; for (let k = 0; k < 40; k++) { g.beginPath(); g.moveTo(-400, -300 + k * 48 + 8 * Math.sin(k)); g.bezierCurveTo(400, -280 + k * 48, 1200, -320 + k * 48, 2320, -300 + k * 48 + 6 * Math.cos(k)); g.stroke(); }
    pool(960, 620, 1100, 900, C.key, 0.22);
    const sh = t >= HIT ? 1 + 0.012 * Math.exp(-(t - HIT) / 0.1) : 1;
    g.save(); g.translate(960, 600); g.rotate(-0.025); g.scale(sh, sh); g.translate(-960, -600);
    g.fillStyle = rgba('#000', 0.45); g.fillRect(OX + 16, OY + 22, DW, DH);
    g.drawImage(doc, OX, OY);
    const pr = sm(seg(t, t0, t1));
    if (NAME && pr > 0) {
      g.save(); g.beginPath(); g.rect(sigX - 10, sigY - 140, NW * pr + 14, 200); g.clip();
      g.font = "700 104px 'Ac Hand'"; g.fillStyle = '#16233F'; g.translate(sigX, sigY - 14); g.rotate(-0.06); g.scale(NS, 1); g.fillText(NAME, 0, 0); g.restore();
    }
    const sf = (t - HIT) * 30;
    if (sf >= 0) {
      const [s, a, b] = kfr(SLAM, sf);
      g.save(); g.translate(SX, SY); g.rotate(-0.22); g.scale(s, s); g.globalAlpha = a * 0.9;
      g.strokeStyle = C.hot; g.fillStyle = C.hot; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 118, 0, TAU); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 92, 0, TAU); g.stroke();
      const RT = UP(S.what || S.who || '').slice(0, 26);
      if (RT) { g.font = "600 26px 'Ac Cond'"; g.textAlign = 'center'; g.textBaseline = 'middle'; const n = RT.length, span = Math.min(TAU * 0.9, n * 0.2);
        for (let i = 0; i < n; i++) { const an = -Math.PI / 2 - span / 2 + span * (i + 0.5) / n; g.save(); g.rotate(an + Math.PI / 2); g.fillText(RT[i], 0, -105 + 0); g.restore(); } }
      g.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * TAU / 10, r = i % 2 ? 22 : 52; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill();
      g.restore();
    }
    g.restore();
    if (pr > 0 && t < t1 + 0.5) {                    // the pen: nib on the writing point, then lifted away
      const lift = seg(t, t1, t1 + 0.4), nx = sigX + NW * pr + 4, ny = sigY - 30 + 16 * Math.sin(t * 40) * (1 - lift);
      g.save(); g.translate(nx + 260 * lift, ny - 240 * ei2(lift)); g.rotate(-0.75);
      g.fillStyle = rgba('#000', 0.35); g.fill(rr(30, 30, 420, 34, 17));
      rim(c => { g.fillStyle = c || '#14161B'; g.fill(rr(14, -17, 420, 34, 17)); g.fill(poly([[0, 0], [22, -12], [22, 12]])); }, 3);
      g.fillStyle = C.key; g.fillRect(150, -17, 16, 34); g.restore();
    }
    drawFx(t);
  };
};
// ── BURNED: the document (title = S.what) in a warm pool; a flame catches its lower corner and ROARS up on the verb
// (flare, kick); the burn front eats across the page — a char band, a glowing edge, flames riding it, embers rising
AC.burned = function () {
  const PW = 640, PH2 = 820, OX = 960 - PW / 2, OY = 140, CS = 10, NX = PW / CS, NY = PH2 / CS, tIg = Math.max(0.1, HIT - 0.6);
  const doc = docCanvas(PW, PH2, S.what || ''), tmp = document.createElement('canvas'); tmp.width = PW; tmp.height = PH2; const tg = tmp.getContext('2d');
  const span = (D + 0.4 - tIg) * 1.15, BT = new Float32Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const dx = (NX - i) / NX, dy = (NY - j) / NY, r = Math.hypot(dx * 0.8, dy) / 1.28;
    const nz = 0.5 * Math.sin(i * 0.55 + j * 0.21) + 0.5 * Math.sin(j * 0.47 - i * 0.3 + 2) + (hn(j * NX + i, 93) - 0.5) * 0.6;
    BT[j * NX + i] = tIg + span * Math.pow(Math.max(0, r + 0.07 * nz), 0.85) * (r < 0.12 ? 0.5 : 1);
  }
  CAM.keys = [[0, 960, 560, 1.05, 0], [HIT, 960, 580, 1.12, 1], [D, 950, 560, 1.18, 1.5]];
  DUST.col = C.key; DUST.up = 60; DUST.n = 60; DUST.x = 1100; DUST.y = 700;
  tag(112, 92, S.who || '', S.when || S.where || '', { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.045, 10, 0.4); flash(HIT, 0.18, C.key);
  puffs(HIT, OX + PW, OY + PH2, 10, '#000', 30, 160, 2.2, -30, -120, 200, 0.28);
  return (t) => {
    cam(1);
    g.fillStyle = C.wall; g.fillRect(-500, -400, 2920, 1900);
    const fl = 0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 7.3), heat = seg(t, tIg, HIT) * (t > HIT ? 1 : 0.6) + (t >= HIT ? 0.6 * Math.exp(-(t - HIT) / 0.35) : 0);
    pool(OX + PW * 0.8, OY + PH2 * 0.8, 900, 760, C.hot, 0.35 * heat * fl + 0.06);
    pool(960, 560, 900, 700, C.key, 0.14);
    tg.clearRect(0, 0, PW, PH2); tg.drawImage(doc, 0, 0);
    const front = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const dt = t - BT[j * NX + i]; if (dt < -0.32) continue;
      const x = i * CS, y = j * CS;
      if (dt > 0.3) { tg.clearRect(x, y, CS, CS); continue; }
      if (dt > 0) { tg.fillStyle = mixc(C.key, '#2A0F06', dt / 0.3); tg.fillRect(x, y, CS, CS); if (dt < 0.1 && (i + j) % 3 === 0) front.push([x, y]); }
      else { tg.fillStyle = rgba('#3A2210', 0.85 * (1 + dt / 0.32)); tg.fillRect(x, y, CS, CS); }
    }
    g.save(); g.translate(OX, OY + PH2); g.transform(1, 0, -0.05 * seg(t, HIT, D), 1 - 0.05 * seg(t, HIT, D), 0, 0); g.translate(0, -PH2);
    g.fillStyle = rgba('#000', 0.4); g.drawImage(tmp, 14, 18); g.globalCompositeOperation = 'source-over'; g.drawImage(tmp, 0, 0);
    g.globalCompositeOperation = 'lighter';
    const big = t >= HIT - 0.1 ? 1 + 1.4 * Math.exp(-Math.max(0, t - HIT) / 0.45) : 0.7;
    for (let k = 0; k < front.length; k += 2) {
      const [x, y] = front[k], hh = (28 + 50 * hn(k, 95) * (0.6 + 0.4 * Math.sin(t * 19 + k))) * big;
      const fg = g.createLinearGradient(x, y, x, y - hh); fg.addColorStop(0, rgba(C.key, 0.8)); fg.addColorStop(0.5, rgba(C.hot, 0.5)); fg.addColorStop(1, rgba(C.hot, 0));
      g.fillStyle = fg; g.beginPath(); g.moveTo(x - 12, y + 6); g.quadraticCurveTo(x - 8 + 10 * Math.sin(t * 13 + k), y - hh * 0.6, x + 6 * Math.sin(t * 11 + k), y - hh); g.quadraticCurveTo(x + 14, y - hh * 0.5, x + 16, y + 6); g.closePath(); g.fill();
    }
    g.restore();
    for (let i = 0; i < 40; i++) {                   // embers rising off the front
      const tb = tIg + hn(i, 96) * (D - tIg), u = t - tb; if (u < 0 || u > 1.6) continue;
      const x = OX + PW * (0.35 + 0.65 * hn(i, 97)) + 40 * Math.sin(u * 3 + i), y = OY + PH2 * (0.4 + 0.6 * hn(i, 98)) - 260 * u - 60 * u * u;
      g.fillStyle = rgba(i % 3 ? C.key : '#FFE8B0', 1 - u / 1.6); g.beginPath(); g.arc(x, y, 2 + 2.5 * hn(i, 99), 0, TAU); g.fill();
    }
    drawFx(t);
  };
};
// ── DESTROYED (torn up, shredded): two hands take the document's sides; on the verb it TEARS in two along a jagged
// line (fibres fly), the halves tear again and the pieces flutter down into the dark — not burned, torn
AC.destroyed = function () {
  const PW = 600, PH2 = 780, OX = 960 - PW / 2, OY = 150, doc = docCanvas(PW, PH2, S.what || ''), t2 = HIT + 0.45;
  const jag = (n, a, b, amp, vert) => Array.from({ length: n + 1 }, (_, k) => { const s = k / n, o = (hn(k, vert ? 101 : 103) - 0.5) * amp; return vert ? [a + o, b * s] : [b * s, a + o]; });
  const V = jag(14, PW / 2, PH2, 46, true), HL = jag(8, PH2 * 0.46, PW, 40, false), HR = jag(8, PH2 * 0.53, PW, 40, false);
  const V0 = V[0][0], Vn = V[V.length - 1][0];
  const halves = { '-1': poly([[-5, -5], [V0, -5], ...V, [Vn, PH2 + 5], [-5, PH2 + 5]]), '1': poly([[PW + 5, -5], [V0, -5], ...V, [Vn, PH2 + 5], [PW + 5, PH2 + 5]]) };
  const band = (L, low) => poly(low ? [[-5, L[0][1]], ...L, [PW + 5, L[L.length - 1][1]], [PW + 5, PH2 + 5], [-5, PH2 + 5]] : [[-5, -5], [PW + 5, -5], [PW + 5, L[L.length - 1][1]], ...L.slice().reverse(), [-5, L[0][1]]]);
  const pieces = [{ side: -1, low: 0 }, { side: -1, low: 1 }, { side: 1, low: 0 }, { side: 1, low: 1 }];
  pieces.forEach((p, i) => { p.half = halves[String(p.side)]; p.band = band(p.side < 0 ? HL : HR, p.low); p.vx = p.side * (60 + 60 * hn(i, 105)); p.rs = p.side * (0.6 + 0.8 * hn(i, 106)) * (p.low ? -1 : 1); p.fall = 380 + 200 * hn(i, 107); });
  CAM.keys = [[0, 960, 540, 1.08, 0], [HIT, 960, 545, 1.05, 0], [D, 960, 600, 1.0, 0]];
  DUST.x = 960; DUST.y = 520;
  tag(112, 92, S.who || '', S.when || S.where || '', { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.05, 14, 0.8); kick(t2, 0.025, 8, -0.4);
  sparks(HIT, OX + PW / 2, OY + PH2 * 0.3, 18, C.paper, 600, 0, TAU, 900, 0.4); sparks(HIT, OX + PW / 2, OY + PH2 * 0.7, 14, C.paper, 500, 0, TAU, 900, 0.4);
  const bits = Array.from({ length: 22 }, (_, i) => ({ x: OX + PW / 2 + (hn(i, 111) - 0.5) * 160, y: OY + PH2 * (0.2 + 0.6 * hn(i, 112)), w: 10 + 26 * hn(i, 113), h: 8 + 18 * hn(i, 114), vx: (hn(i, 115) - 0.5) * 500, r: hn(i, 116) * 6 }));
  const grip = (x, y, dir, a, rot) => { if (a <= 0) return; hand(x + dir * 620 * (1 - a), y, (dir < 0 ? 0 : Math.PI) + rot * dir, { grip: true, flip: dir > 0, s: 1.15 }); };
  return (t) => {
    cam(1);
    g.fillStyle = C.wall; g.fillRect(-500, -400, 2920, 1900);
    pool(960, 520, 900, 700, C.pool, 0.5);
    const tens = t < HIT ? 4 * Math.sin(t * 50) * seg(t, HIT - 0.4, HIT) : 0, hIn = eo3(seg(t, HIT - 0.75, HIT - 0.35)), hOut = 1 - eo3(seg(t, t2 + 0.1, t2 + 0.6));
    for (const [i, p] of pieces.entries()) {
      const split = t >= t2; if (!split && p.low) continue;
      const u = Math.max(0, t - HIT), sep = t >= HIT ? spring(u / 0.5, 1.2, 4) : 0, u2 = Math.max(0, t - t2);
      const cxH = p.side < 0 ? PW * 0.25 : PW * 0.75, cy = p.low ? PH2 * 0.75 : PH2 * 0.25;
      g.save(); g.translate(OX + p.side * (90 * sep + tens) + cxH, OY + PH2 / 2); g.rotate(p.side * 0.16 * sep); g.translate(-cxH, -PH2 / 2);
      if (split) { const land = 1020 - (OY + cy) - 60 * i, fy = Math.min(land, p.fall * u2 * u2 * 1.4 + (p.low ? 30 : -20) * Math.min(1, u2 * 3)), ld = fy >= land;
        g.translate(cxH + p.vx * Math.min(u2, 0.9) * 0.6, cy + fy); g.rotate(p.rs * Math.min(u2, 0.9) * 0.5); g.scale(1, ld ? 0.42 : 0.7 + 0.3 * Math.cos(u2 * 5 + i)); g.translate(-cxH, -cy); }
      g.save(); g.translate(12, 16); g.clip(p.half); if (split) g.clip(p.band); g.fillStyle = rgba('#000', 0.4); g.fillRect(-10, -10, PW + 20, PH2 + 20); g.restore();
      g.save(); g.clip(p.half); if (split) g.clip(p.band); g.drawImage(doc, 0, 0);
      if (t >= HIT) { g.strokeStyle = rgba('#fff', 0.9); g.lineWidth = 5; g.stroke(p.half); if (split) g.stroke(p.band); }
      g.restore();
      g.restore();
    }
    for (const b of bits) { const u = t - t2; if (u < 0) continue; const yy = Math.min(1010 + 20 * b.r, b.y + 420 * u * u + 40 * u), ld = yy >= 1010 + 20 * b.r;
      g.save(); g.translate(b.x + b.vx * Math.min(u, 1.2), yy); g.rotate(b.r + Math.min(u, 1.2) * 6); g.scale(1, ld ? 0.4 : Math.cos(u * 9 + b.r));
      g.fillStyle = C.paper; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); g.restore(); }
    const sep2 = t >= HIT ? spring((t - HIT) / 0.5, 1.2, 4) : 0;
    grip(OX - 70 - 90 * sep2 + tens, OY + PH2 * 0.3, -1, hIn * hOut, -0.16 * sep2); grip(OX + PW + 70 + 90 * sep2 - tens, OY + PH2 * 0.3, 1, hIn * hOut, -0.16 * sep2);
    drawFx(t);
  };
};
// a manila folder (front view), its tab carrying the sentence's own words
function folder(w, h, label, c) {
  const body = c || mixc(C.paper, C.key, 0.42), tabw = Math.min(w * 0.62, 90 + 17 * String(label || '').length);
  g.fillStyle = c || shade(body, -0.18); g.fill(rr(0, -34, tabw, 50, 8));
  g.fillStyle = body; g.fill(rr(0, 0, w, h, 8));
  if (!c) { g.fillStyle = rgba('#000', 0.08); g.fillRect(0, h * 0.5, w, h * 0.5);
    if (label) { g.font = "600 30px 'Ac Cond'"; g.fillStyle = '#2A2014'; g.textBaseline = 'middle'; g.fillText(UP(label).slice(0, 30), 18, -10); } }
}
// ── HID / COVERED UP: a filing cabinet, its top drawer open; the folder (tab = S.what) arcs into it, the drawer SLAMS
// on the verb, a padlock drops onto the hasp and CLICKS shut, and the lamp dims
AC.hid = function () {
  const X = 960, FY = 920, CW = 470, CH = 680, X0 = X - CW / 2, Y0 = FY - CH, DH2 = 205, tIn = HIT - 0.22, tLock = HIT + 0.62;
  CAM.keys = [[0, 960, 520, 1.02, 0], [HIT, 960, 470, 1.12, 0], [D, 960, 450, 1.2, 0]];
  DUST.x = X; DUST.y = 420;
  tag(112, 92, S.who || '', S.when || S.where || '', { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.05, 14, 0.5); kick(tLock, 0.02, 5);
  puffs(HIT, X, Y0 + 40, 8, C.metal, 10, 60, 0.8, 0, -30, 400, 0.15);
  return (t) => {
    cam(1);
    const dim = 1 - 0.55 * sm(seg(t, tLock + 0.1, tLock + 0.9));
    room(FY, X, C.pool, 0.55 * dim);
    beam(X, -200, X, FY, 160, 900, C.key, 0.12 * dim);
    glow(X, FY + 8, 640, C.pool, 0.7 * dim);
    rim(c => { g.fillStyle = c || mixc(C.metal, C.fig, 0.72); g.fill(rr(X0, Y0, CW, CH, 10)); }, 5);
    for (let k = 1; k < 3; k++) { const y = Y0 + 20 + k * (DH2 + 18); rim(c => { g.fillStyle = c || mixc(C.metal, C.fig, 0.6); g.fill(rr(X0 + 22, y, CW - 44, DH2, 6)); }, 2, 0.5, 0.5);
      g.fillStyle = rgba(C.metal, 0.8); g.fill(rr(X - 60, y + 40, 120, 22, 8)); }
    let ext = t < HIT - 0.2 ? 1 : t < HIT ? 1 - ei2(seg(t, HIT - 0.2, HIT)) : -0.03 * Math.exp(-(t - HIT) / 0.08) * Math.sin((t - HIT) * 45);
    const dy = 150 * ext, ds = 1 + 0.12 * ext, fy0 = Y0 + 20 + dy;
    if (ext > 0.02) { g.fillStyle = '#05060A'; g.fillRect(X0 + 22, Y0 + 14, CW - 44, dy + 20); }
    // the folder: an arc from the upper left into the drawer, then down inside it (the front hides it)
    const fu = eo2(seg(t, Math.max(0.05, tIn - 0.8), tIn)), sink = ei2(seg(t, tIn, HIT));
    if (t < HIT + 0.05) {
      const fx = lerp(330, X - 160, fu), fyy = lerp(170, Y0 - 120, fu) - 160 * Math.sin(fu * Math.PI) + 230 * sink, rot = lerp(-0.5, 0, fu);
      g.save(); g.beginPath(); g.rect(-500, -500, 3000, fy0 + 30 + 500); g.clip();
      g.translate(fx, fyy); g.rotate(rot); rim(c => folder(320, 230, S.what, c), 3); g.restore();
    }
    g.save(); g.translate(X, fy0 + DH2 / 2); g.scale(ds, ds); g.translate(-X, -(fy0 + DH2 / 2));
    rim(c => { g.fillStyle = c || mixc(C.metal, C.fig, 0.55); g.fill(rr(X0 + 22, fy0, CW - 44, DH2, 6)); }, 3);
    g.fillStyle = rgba(C.metal, 0.9); g.fill(rr(X - 60, fy0 + 40, 120, 22, 8));
    g.fillStyle = rgba(C.metal, 0.9); g.fill(rr(X + 120, fy0 + 26, 40, 54, 6));
    g.restore();
    // the padlock: drops onto the hasp, the shackle snaps down and CLICKS
    if (t > HIT + 0.05) {
      const ly = drop(t, HIT + 0.38, 0.3, Y0 - 700, fy0 + 70, 18, 0.16), sh = 16 * (1 - sm(seg(t, tLock - 0.06, tLock)));
      g.save(); g.translate(X + 140, ly);
      rim(c => { g.strokeStyle = c || C.metal; g.lineWidth = 13; g.beginPath(); g.arc(0, -30 - sh, 30, Math.PI, 0); g.lineTo(30, -10 - sh * 0.4); g.moveTo(-30, -30 - sh); g.lineTo(-30, -10); g.stroke(); }, 3);
      rim(c => { g.fillStyle = c || C.key; g.fill(rr(-46, -14, 92, 82, 12)); }, 3);
      g.fillStyle = rgba('#000', 0.55); g.beginPath(); g.arc(0, 18, 9, 0, TAU); g.fill(); g.fillRect(-4, 18, 8, 22);
      g.restore(); glint(X + 175, fy0 + 30, t, tLock, 50);
    }
    drawFx(t);
  };
};
// ── LEAKED / REVEALED: a closed folder (tab = S.what) trembles, light pressing out of its edges; on the verb it BURSTS
// open — the cover swings, light pours out in rays and the pages FLY at the lens, spinning
AC.leaked = function () {
  const X = 960, Y = 600, FW = 640, FH = 440, page = docCanvas(240, 310, '');
  CAM.keys = [[0, 960, 560, 1.1, 0], [HIT, 960, 570, 1.04, 0], [D, 960, 560, 0.98, 0]];
  DUST.x = X; DUST.y = Y;
  tag(112, 92, S.who || '', S.when || S.where || '', { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.06, 16, -0.6); flash(HIT, 0.4, '#FFF6E0');
  ring(HIT, X, Y, 700, C.key, 10, 0.6);
  const PG = Array.from({ length: 12 }, (_, i) => ({ a: -Math.PI / 2 + (hn(i, 121) - 0.5) * 2.6, v: 300 + 500 * hn(i, 122), z: 2.2 + 2.6 * hn(i, 123), r: (hn(i, 124) - 0.5) * 6, d: 0.05 * i }));
  return (t) => {
    cam(1);
    g.fillStyle = C.wall; g.fillRect(-500, -400, 2920, 1900);
    const op = t < HIT ? 0 : spring((t - HIT) / 0.7, 1.1, 5), lt = t < HIT ? 0.25 * seg(t, 0, HIT) : 0.9 * Math.exp(-(t - HIT) / 0.9) + 0.3;
    pool(X, Y, 900, 700, C.key, 0.12 + 0.3 * lt);
    if (t >= HIT) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.27 + 0.05 * Math.sin(t + k); beam(X, Y - 40, X + Math.cos(a) * 1400, Y - 40 + Math.sin(a) * 1400, 40, 380, C.key, 0.22 * lt); }
      g.restore();
    }
    const tr = t < HIT ? 3 * Math.sin(t * 60) * seg(t, HIT - 0.7, HIT) : 0;
    g.save(); g.translate(X - FW / 2 + tr, Y - FH / 2);
    g.fillStyle = rgba('#000', 0.45); g.fillRect(16, 22, FW, FH);
    rim(c => { g.fillStyle = c || shade(mixc(C.paper, C.key, 0.42), -0.22); g.fill(rr(0, 0, FW, FH, 8)); }, 4);
    if (t >= HIT) { g.fillStyle = C.paper; g.fillRect(24, 20, FW - 48, FH - 30); g.fillStyle = rgba('#1D1A16', 0.3); for (let r = 0; r < 9; r++) g.fillRect(60, 60 + r * 36, (FW - 140) * (0.7 + 0.3 * hn(r, 125)), 10); }
    const cw = FW * Math.cos(Math.min(Math.PI, op * Math.PI * 0.94));
    if (t < HIT) { g.strokeStyle = rgba(C.key, 0.5 + 0.5 * seg(t, HIT - 0.6, HIT)); g.lineWidth = 4; g.strokeRect(-2, -2, FW + 4, FH + 4); }
    g.save(); g.scale(1, 1); rim(c => { g.save(); if (cw < 0) { g.translate(0, 0); g.scale(-1, 1); } folder(Math.abs(cw), FH, cw > 0 ? S.what : '', c); g.restore(); }, 4); g.restore();
    g.restore();
    for (const [i, p] of PG.entries()) {
      const u = t - HIT - p.d; if (u < 0) continue;
      const z = 1 + p.z * ei2(Math.min(1, u / 1.4)), x = X + Math.cos(p.a) * p.v * u * z * 0.6, y = Y - 40 + Math.sin(p.a) * p.v * u * z * 0.45 + 60 * u * u;
      g.save(); g.translate(x, y); g.rotate(p.r * u); g.scale(z * 0.8, z * 0.8 * (0.6 + 0.4 * Math.cos(u * 4 + i))); g.globalAlpha = 1 - seg(u, 1.2, 1.8);
      g.fillStyle = rgba('#000', 0.3); g.fillRect(-110, -145, 240, 310); g.drawImage(page, -120, -155); g.restore();
    }
    drawFx(t);
  };
};
// ── SPIED / WATCHED: a night facade of windows seen through BINOCULARS (two circles, a reticle, focus ticks); the
// view sweeps the building and LOCKS on one window on the verb — it lights up warm with a figure inside, the focus
// ring snaps, a camera shutter fires three times
AC.spied = function () {
  const COLS = 12, ROWS = 7, WX0 = 260, WY0 = 120, PW2 = 170, PH3 = 150, TC = 8, TR = 3, tx = WX0 + TC * PW2 + 55, ty = WY0 + TR * PH3 + 55;
  CAM.keys = [[0, 640, 380, 1.5, -2], [HIT - 0.12, tx + 26, ty - 10, 1.62, 0], [HIT, tx, ty, 1.62, 0], [D, tx, ty, 1.95, 0]];
  CAM.creep = 0; CAM.drift = 1.4;
  DUST = null;
  tag(112, 92, S.who || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.6) });
  const shots = [HIT, HIT + 0.42, HIT + 0.7];
  shots.forEach((s, i) => { flash(s, i ? 0.18 : 0.3); kick(s, 0.012, 3); });
  const lit = Array.from({ length: COLS * ROWS }, (_, i) => hn(i, 131) < 0.3);
  return (t) => {
    cam(1);
    g.fillStyle = shade(C.bg, 0.03); g.fillRect(-800, -600, 3600, 2400);
    pool(1100, -200, 1400, 600, C.cool, 0.25);
    g.fillStyle = mixc(C.wall, C.cool, 0.08); g.fillRect(WX0 - 60, WY0 - 60, COLS * PW2 + 120, 2000);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = WX0 + c * PW2, y = WY0 + r * PH3, me = r === TR && c === TC, on = me ? sm(seg(t, HIT - 0.04, HIT + 0.12)) : (lit[r * COLS + c] ? 0.35 + 0.1 * Math.sin(t * 0.7 + r + c) : 0);
      g.fillStyle = mixc('#0A0D13', C.key, on * 0.85); g.fillRect(x, y, 110, 110);
      if (me && on > 0) { pool(x + 55, y + 55, 160, 160, C.key, 0.45 * on); g.save(); g.beginPath(); g.rect(x, y, 110, 110); g.clip(); figure(x + 60, y + 150, 150, POSE.speak, -1, '#16110C'); g.restore(); }
      g.fillStyle = rgba('#000', 0.5); g.fillRect(x + 52, y, 6, 110); g.fillRect(x, y + 52, 110, 6);
    }
    drawFx(t);
    // the binocular mask (screen space): two lenses, a reticle, focus ticks that tighten on the lock
    g.setTransform(1, 0, 0, 1, 0, 0);
    const R = 430, cx1 = 960 - 250, cx2 = 960 + 250, cy = 540;
    g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, W, H); g.arc(cx1, cy, R, 0, TAU); g.arc(cx2, cy, R, 0, TAU); g.fill('evenodd');
    g.beginPath(); g.arc(cx1, cy, R, 0, TAU); g.arc(cx2, cy, R, 0, TAU);
    const lens = g.createRadialGradient(960, 540, 300, 960, 540, 760); lens.addColorStop(0, 'rgba(0,0,0,0)'); lens.addColorStop(1, 'rgba(0,0,0,.75)');
    g.fillStyle = lens; g.fill('nonzero');
    const lock = sm(seg(t, HIT - 0.1, HIT + 0.08)), rr0 = lerp(260, 120, lock);
    g.strokeStyle = rgba(lock > 0.5 ? C.key : C.ink, 0.75); g.lineWidth = 3;
    g.beginPath(); g.moveTo(960 - 380, 540); g.lineTo(960 - 40, 540); g.moveTo(960 + 40, 540); g.lineTo(960 + 380, 540); g.moveTo(960, 540 - 340); g.lineTo(960, 540 - 40); g.moveTo(960, 540 + 40); g.lineTo(960, 540 + 340); g.stroke();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4 + (1 - lock) * t * 0.8; g.beginPath(); g.arc(960, 540, rr0, a - 0.3, a + 0.3); g.stroke(); }
    for (let k = -5; k <= 5; k++) { g.fillStyle = rgba(C.ink, 0.6); g.fillRect(960 + k * 40 - 1, 540 + 300, 2, k % 5 ? 14 : 26); }
    for (const s of shots) { const f = Math.floor((t - s) * 30 + 1e-6); if (f >= 0 && f < 2) { g.fillStyle = '#000'; g.fillRect(0, 0, W, f ? 260 : 540); g.fillRect(0, H - (f ? 260 : 540), W, 540); } }
  };
};
// ── BUGGED / WIRETAPPED: a desk telephone under a lamp, its line running off to a reel-to-reel recorder; on the verb a
// small TAP clamps onto the wire (red light), the voice runs along it as pulses, the reels start turning, the meter
// draws the waveform
AC.bugged = function () {
  const FY = 860, PX = 600, PY = 640, RX = 1380, RY = 600, MX = 1000, MY = 820;
  CAM.keys = [[0, 760, 560, 1.18, 0], [HIT, 960, 580, 1.08, 0], [D, 1060, 570, 1.12, 0]];
  DUST.x = 900; DUST.y = 520;
  tag(112, 92, S.who || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.04, 10, 0.4);
  const wire = s => { const u = 1 - s; return [u * u * u * (PX + 170) + 3 * u * u * s * (PX + 330) + 3 * u * s * s * (MX + 120) + s * s * s * (RX - 260), u * u * u * (PY + 40) + 3 * u * u * s * (FY + 60) + 3 * u * s * s * (FY + 70) + s * s * s * (RY + 70)]; };
  const ts = 0.47, TP = wire(ts);
  return (t) => {
    cam(1);
    room(FY, 900, C.pool, 0.42, 1.3);
    rim(c => { g.fillStyle = c || shade(C.wood, -0.35); g.fillRect(200, FY - 120, 1600, 30); }, 3);
    glow(PX, FY - 110, 500, C.key, 0.4); glow(RX, FY - 110, 520, C.pool, 0.5);
    // the wire, the tap, the pulses
    g.strokeStyle = '#05070A'; g.lineWidth = 8; g.beginPath(); for (let k = 0; k <= 40; k++) { const q = wire(k / 40); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke();
    if (t >= HIT) for (let i = 0; i < 9; i++) { const s = ((t - HIT) * 0.9 + i / 9) % 1; if ((t - HIT) * 0.9 < i / 9 * 0) continue; const q = wire(s); pool(q[0], q[1], 26, 26, C.hot, 0.9); g.fillStyle = '#FFE0D0'; g.beginPath(); g.arc(q[0], q[1], 5, 0, TAU); g.fill(); }
    const tu = drop(t, HIT, 0.28, TP[1] - 700, TP[1], 14, 0.15);
    if (t > HIT - 0.3) { rim(c => { g.fillStyle = c || C.fig; g.fill(rr(TP[0] - 46, tu - 34, 92, 60, 10)); }, 3);
      const led = t >= HIT && Math.floor(t * 4) % 2 === 0; g.fillStyle = led ? C.hot : shade(C.hot, -0.6); g.beginPath(); g.arc(TP[0] + 24, tu - 6, 8, 0, TAU); g.fill(); if (led) pool(TP[0] + 24, tu - 6, 50, 50, C.hot, 0.6); }
    // the telephone: base, dial, handset; the voice as arcs off the mouthpiece
    rim(c => { g.fillStyle = c || C.fig; g.fill(poly([[PX - 170, FY - 120], [PX + 170, FY - 120], [PX + 130, PY - 20], [PX - 130, PY - 20]])); g.fill(rr(PX - 210, PY - 110, 420, 76, 38)); g.fill(rr(PX - 230, PY - 120, 90, 100, 30)); g.fill(rr(PX + 140, PY - 120, 90, 100, 30)); }, 4);
    g.strokeStyle = rgba(C.ink, 0.65); g.lineWidth = 6; g.beginPath(); g.arc(PX, PY + 70, 58, 0, TAU); g.stroke();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * 0.56; g.fillStyle = rgba(C.ink, 0.55); g.beginPath(); g.arc(PX + Math.cos(a) * 40, PY + 70 + Math.sin(a) * 40, 7, 0, TAU); g.fill(); }
    for (let k = 0; k < 4; k++) { const u = ((t * 0.8 + k / 4) % 1); g.strokeStyle = rgba(C.key, 0.7 * (1 - u)); g.lineWidth = 5; g.beginPath(); g.arc(PX - 260, PY - 80, 30 + 120 * u, Math.PI * 0.75, Math.PI * 1.25); g.stroke(); }
    // the recorder: a box, two reels that spin up after the tap, a meter that draws the waveform
    rim(c => { g.fillStyle = c || mixc(C.metal, C.fig, 0.78); g.fill(rr(RX - 250, RY - 220, 500, 330, 16)); }, 4);
    const sp = t < HIT ? 0 : 7 * sm(seg(t, HIT, HIT + 0.5)), ang = t < HIT ? 0 : 7 * ((t - HIT) - 0.25 * (1 - Math.exp(-(t - HIT) / 0.25)));
    for (const [dx, k] of [[-120, 1], [120, 1.15]]) { g.save(); g.translate(RX + dx, RY - 90); g.rotate(ang * k);
      g.fillStyle = mixc(C.metal, C.fig, 0.35); g.beginPath(); g.arc(0, 0, 92, 0, TAU); g.fill(); g.fillStyle = mixc(C.metal, C.fig, 0.85);
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 70, i * TAU / 3, i * TAU / 3 + 0.8); g.closePath(); g.fill(); }
      g.fillStyle = C.ink; g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); g.restore(); }
    g.fillStyle = '#05070A'; g.fillRect(RX - 200, RY + 30, 400, 60);
    if (t >= HIT) { g.strokeStyle = C.key; g.lineWidth = 3; g.beginPath(); const n = Math.floor(seg(t, HIT, HIT + 1.2) * 80);
      for (let k = 0; k <= n; k++) { const x = RX - 196 + k * 4.9, a = 22 * Math.sin(k * 0.9) * Math.sin(k * 0.23 + 1) * (0.5 + 0.5 * hn(k, 141)); k ? g.lineTo(x, RY + 60 + a) : g.moveTo(x, RY + 60 + a); } g.stroke(); }
    drawFx(t);
    void sp;
  };
};
// ── VOTED / ELECTED: a ballot box under a lamp; a hand brings the ballot, the X is drawn, the ballot folds and DROPS
// through the slot on the verb (the box jolts, light bursts from the slot); "elected": a sunburst rises behind it
AC.voted = function () {
  const X = 960, FY = 900, BW = 540, BH = 430, BX = X - BW / 2, BY = FY - BH, el = S.variant === 'elected';
  CAM.keys = [[0, 1000, 470, 1.12, 0], [HIT, 960, 520, 1.06, 0], [D, 960, 520, 1.12, 0]];
  DUST.x = X; DUST.y = 500;
  tag(el ? 960 : 112, 92, S.who || '', [S.role, S.where, S.when].filter(Boolean).join(' · '), { t0: el ? HIT + 0.12 : Math.max(0.12, HIT - 0.8), align: el ? 'center' : 'left', size: el ? 64 : 50 });
  kick(HIT, 0.04, 10, 0.3); flash(HIT, 0.16, C.key);
  return (t) => {
    cam(1);
    room(FY, X, C.pool, 0.5);
    if (el && t > HIT) { const a = sm(seg(t, HIT, HIT + 0.5)); g.save(); g.translate(X, BY - 40); g.rotate(t * 0.25); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 16; k++) { g.rotate(TAU / 16); g.fillStyle = rgba(C.key, 0.13 * a); g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -1400); g.lineTo(90, -1400); g.closePath(); g.fill(); } g.restore(); }
    beam(X, -150, X, FY, 140, 820, C.ink, 0.1);
    glow(X, FY + 8, 700, C.pool, 0.7);
    // the ballot: in from the upper right, the X, the fold, the drop through the slot
    const tin = Math.max(0.05, HIT - 1.05), u = eo3(seg(t, tin, tin + 0.35)), xs = seg(t, HIT - 0.8, HIT - 0.45), fold = sm(seg(t, HIT - 0.42, HIT - 0.22)), dr = ei2(seg(t, HIT - 0.2, HIT));
    if (t < HIT + 0.02) {
      const bx = X + 40 + 500 * (1 - u), by = BY - 400 + 470 * dr;
      g.save(); g.beginPath(); g.rect(-500, -500, 3000, BY + 6 + 500); g.clip();
      g.translate(bx, by); g.rotate(0.12 * (1 - u) - 0.04); g.scale(1 - 0.35 * fold, 1 - 0.7 * fold);
      g.fillStyle = rgba('#000', 0.35); g.fillRect(-140, -175, 300, 380);
      g.fillStyle = C.paper; g.fillRect(-150, -190, 300, 380);
      for (let r = 0; r < 3; r++) { g.strokeStyle = '#2A2520'; g.lineWidth = 4; g.strokeRect(-120, -140 + r * 110, 54, 54); g.fillStyle = rgba('#2A2520', 0.35); g.fillRect(-46, -122 + r * 110, 150, 14); }
      if (xs > 0) { g.strokeStyle = C.hot; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); const a = Math.min(1, xs * 2), b = Math.max(0, xs * 2 - 1);
        g.moveTo(-112, -22); g.lineTo(-112 + 38 * a, -22 + 38 * a); if (b > 0) { g.moveTo(-74, -22); g.lineTo(-74 - 38 * b, -22 + 38 * b); } g.stroke(); }
      g.restore();
      const let_go = seg(t, HIT - 0.22, HIT - 0.02);
      if (let_go < 1) hand(bx + 175 + 300 * let_go, BY - 400 + 470 * dr + 120 - 200 * let_go, Math.PI - 0.5, { grip: true, flip: true });
    }
    const jolt = t >= HIT ? 1 + 0.03 * Math.exp(-(t - HIT) / 0.1) * Math.cos((t - HIT) * 40) : 1;
    g.save(); g.translate(X, FY); g.scale(1 / jolt, jolt); g.translate(-X, -FY);
    rim(c => { g.fillStyle = c || mixc(C.metal, C.fig, 0.68); g.fill(rr(BX, BY, BW, BH, 12)); }, 5);
    g.fillStyle = mixc(C.metal, C.fig, 0.5); g.fill(rr(BX - 20, BY - 30, BW + 40, 40, 8));
    g.fillStyle = '#04050A'; g.fill(rr(X - 140, BY - 20, 280, 16, 6));
    g.fillStyle = rgba(C.ink, 0.12); g.fill(rr(X - 120, BY + 140, 240, 150, 10));
    g.restore();
    if (t >= HIT) beam(X, BY - 12, X, BY - 600, 280, 600, C.key, 0.35 * Math.exp(-(t - HIT) / 0.4));
    drawFx(t);
  };
};
// ── BOUGHT / SOLD: a deal across the table — a stack of banknotes slides from the buyer to the seller, coins arc
// after it, the thing bought (a deed card, S.what) slides the other way and lands on the verb; the price (S.price)
// only when the sentence says it
AC.bought = function () {
  const FY = 900, TY = 690, LX = 470, RX = 1450, tm = HIT - 0.42;
  CAM.keys = [[0, 900, 560, 1.08, 0], [HIT, 960, 560, 1.04, 0], [D, 960, 560, 1.1, 0]];
  DUST.x = 960; DUST.y = 520;
  tag(112, 92, S.who || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  tag(1808, 92, S.who2 || '', '', { align: 'right', t0: Math.max(0.2, HIT - 0.6) });
  kick(HIT, 0.04, 9, 0.3);
  const coins = Array.from({ length: 8 }, (_, i) => ({ t0: tm + 0.05 * i, x0: LX + 40 * hn(i, 151), x1: RX - 120 + 160 * hn(i, 152), hh: 160 + 140 * hn(i, 153) }));
  coins.forEach((c, i) => sparks(c.t0 + 0.42, c.x1, TY + 70, 4, C.key, 260, -Math.PI / 2, 1.4, 800, 0.25));
  const deed = docCanvas(300, 380, S.what || '');
  return (t) => {
    cam(1);
    room(FY, 960, C.pool, 0.5, 1.3);
    beam(960, -150, 960, TY, 160, 1000, C.key, 0.1);
    rim(c => { g.fillStyle = c || shade(C.wood, -0.3); g.fill(poly([[160, TY], [1760, TY], [1900, FY + 40], [20, FY + 40]])); }, 3);
    const mv = sm(seg(t, tm, HIT));
    // the deed slides right -> left on the back lane
    const dx = lerp(RX, LX + 60, mv);
    g.save(); g.translate(dx, TY + 40); g.transform(1, 0, -0.35, 0.42, 0, 0); g.fillStyle = rgba('#000', 0.35); g.fillRect(-140, -170, 300, 380); g.drawImage(deed, -150, -190); g.restore();
    // the banknotes slide left -> right on the front lane
    const cx = lerp(LX, RX - 40, mv), lag = k => lerp(LX, RX - 40, sm(seg(t, tm + 0.03 * k, HIT + 0.03 * k)));
    for (let k = 0; k < 7; k++) { const x = k < 4 ? cx : lag(k); g.save(); g.translate(x, TY + 140 - k * 9); g.transform(1, 0, -0.35, 0.42, 0, 0);
      rim(c => { g.fillStyle = c || mixc(C.green, C.fig, 0.45); g.fill(rr(-150, -70, 300, 140, 8)); }, 3, 0.6, 0.6);
      g.strokeStyle = rgba(C.paper, 0.45); g.lineWidth = 5; g.strokeRect(-130, -52, 260, 104); g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.stroke(); g.restore(); }
    for (const c of coins) { const u = (t - c.t0) / 0.42; if (u < 0) continue; const uu = Math.min(1, u), x = lerp(c.x0, c.x1, uu), y = TY + 70 - c.hh * 4 * uu * (1 - uu) - (u > 1 ? 30 * Math.exp(-(u - 1) * 6) * Math.abs(Math.sin((u - 1) * 10)) : 0);
      rim(cc => { g.fillStyle = cc || C.key; g.beginPath(); g.ellipse(x, y, 30, 30 * (0.35 + 0.65 * Math.abs(Math.cos(u * 9))), 0, 0, TAU); g.fill(); }, 2); }
    if (S.price && t >= HIT) {
      const [s, a] = kfr(SLAM, (t - HIT) * 30); g.save(); g.translate(960, 330); g.scale(s, s); g.globalAlpha = a;
      g.font = "400 150px 'Ac Num'"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rgba('#000', 0.8); g.fillText(UP(S.price), 0, 12); g.fillStyle = C.ink; g.fillText(UP(S.price), 0, 0); g.restore();
    }
    drawFx(t);
  };
};
// ── BUILT: a blueprint; the structure (S.thing: building | tower | bridge | wall | factory) draws itself as white
// lines, its parts snap in from the ground up, the LAST piece lands on the verb — and the blueprint turns to night
// (lights come on). Parts are [x, y, w, h] in order of assembly.
function structureParts(kind, FY) {
  const P = [];
  if (kind === 'tower') { for (let k = 0; k < 9; k++) { const w = 340 - k * 30, h = 70; P.push([960 - w / 2, FY - (k + 1) * h, w, h - 8]); } P.push([948, FY - 9 * 70 - 140, 24, 140]); }
  else if (kind === 'bridge') { for (let k = 0; k < 10; k++) P.push([240 + k * 144, FY - 190, 140, 30]); P.push([520, FY - 520, 50, 520]); P.push([1350, FY - 520, 50, 520]); P.push([470, FY - 540, 150, 30]); P.push([1300, FY - 540, 150, 30]); }
  else if (kind === 'wall') { for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) P.push([300 + c * 148 + (r % 2) * 74 - 37, FY - (r + 1) * 64, 140, 58]); P.push([1500, FY - 520, 120, 200]); P.push([1490, FY - 560, 140, 40]); }
  else if (kind === 'factory') { for (let k = 0; k < 4; k++) P.push([420 + k * 230, FY - 260, 224, 260]); for (let k = 0; k < 4; k++) P.push([420 + k * 230, FY - 340, 224, 80, 1]); P.push([1380, FY - 560, 80, 560]); }
  else { for (let k = 0; k < 8; k++) P.push([700, FY - (k + 1) * 78, 520, 72]); P.push([760, FY - 8 * 78 - 40, 400, 34]); P.push([950, FY - 8 * 78 - 160, 20, 120]); }
  return P;
}
AC.built = function () {
  const FY = 920, kind = String(S.thing || 'building'), parts = structureParts(kind, FY), n = parts.length;
  const tL0 = 0.05, tL1 = Math.max(0.35, HIT * 0.5), tP0 = Math.max(0.3, HIT * 0.42), dt = (HIT - tP0) / n;
  const top = Math.min(...parts.map(p => p[1]));
  CAM.keys = [[0, 960, FY - 300, 1.15, 0], [HIT, 960, (FY + top) / 2, 1.0, 0], [D, 960, (FY + top) / 2 - 10, 1.06, 0]];
  DUST.x = 960; DUST.y = 500;
  tag(112, 92, S.what || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.04, 10, 0.3);
  const lp0 = parts[n - 1]; puffs(HIT, lp0[0] + lp0[2] / 2, lp0[1] + lp0[3], 6, C.ink, 8, 40, 0.6, 0, -20, lp0[2], 0.2);
  const win = parts.map((_, i) => hn(i, 161));
  return (t) => {
    cam(1);
    const night = sm(seg(t, HIT + 0.05, HIT + 0.55)), bp = mixc('#0E3A6B', C.wall, night);
    g.fillStyle = bp; g.fillRect(-600, -600, 3200, 2400);
    g.strokeStyle = rgba('#9CC8FF', 0.16 * (1 - night)); g.lineWidth = 1.5;
    for (let x = -600; x < 2600; x += 60) { g.beginPath(); g.moveTo(x, -600); g.lineTo(x, 1800); g.stroke(); }
    for (let y = -600; y < 1800; y += 60) { g.beginPath(); g.moveTo(-600, y); g.lineTo(2600, y); g.stroke(); }
    if (night > 0) { pool(960, FY - 300, 900, 600, C.pool, 0.45 * night); g.fillStyle = mixc(bp, C.floor, night); g.fillRect(-600, FY, 3200, 900); }
    g.strokeStyle = rgba('#DDEBFF', 0.6 * (1 - night)); g.lineWidth = 2; g.beginPath(); g.moveTo(-600, FY); g.lineTo(2600, FY); g.stroke();
    // the outlines draw on (dash offset), the parts snap in from the ground up
    const lo = seg(t, tL0, tL1);
    g.setLineDash([2400 * lo, 3000]); g.strokeStyle = rgba('#EAF3FF', 0.75 * (1 - night)); g.lineWidth = 3;
    for (const [x, y, w, h] of parts) g.strokeRect(x, y, w, h);
    g.setLineDash([]);
    for (let i = 0; i < n; i++) {
      const ti = tP0 + dt * (i + 1), u = seg(t, ti - 0.14, ti); if (u <= 0) continue;
      const [x, y, w, h, roof] = parts[i], yy = y - 70 * (1 - eo3(u)) + (t > ti ? 6 * Math.exp(-(t - ti) / 0.06) * Math.sin((t - ti) * 50) : 0);
      g.globalAlpha = Math.min(1, u * 2);
      const body = mixc('#CFE3FF', C.fig, night);
      rim(c => { g.fillStyle = c || body; if (roof) g.fill(poly([[x, yy + h], [x + w * 0.6, yy], [x + w, yy + h]])); else g.fill(rr(x, yy, w, h, 3)); }, 3, night, night);
      if (night > 0 && kind !== 'bridge' && kind !== 'wall' && !roof && h > 50) for (let k = 0; k < Math.floor(w / 70); k++) {
        const on = hn(i * 13 + k, 162) < 0.55 && t > HIT + 0.2 + 0.6 * hn(i * 7 + k, 163);
        g.fillStyle = on ? rgba(C.key, 0.9) : rgba('#000', 0.3 * night); g.fillRect(x + 20 + k * 70, yy + 16, 36, Math.min(40, h - 30)); }
      g.globalAlpha = 1;
    }
    if (kind === 'bridge' && t > HIT - 0.2) { const u = sm(seg(t, HIT - 0.2, HIT + 0.3)); g.strokeStyle = rgba(night > 0.5 ? C.key : '#EAF3FF', 0.8); g.lineWidth = 3;
      for (const tx of [545, 1375]) for (let k = 1; k <= 5; k++) { g.beginPath(); g.moveTo(tx, FY - 520); g.lineTo(tx + (k * 70 * (tx < 960 ? -1 : 1)) * u, FY - 190); g.moveTo(tx, FY - 520); g.lineTo(tx + (k * 70 * (tx < 960 ? 1 : -1)) * u, FY - 190); g.stroke(); } }
    drawFx(t);
  };
};
// ── SANK: a night sea, the moon and its streak; the ship (S.ship: liner | warship | boat) lists, its stern rises and it
// slips under the line on the verb — under the water the hull goes deep blue; bubbles, a foam ring, the sea closes
AC.sank = function () {
  const WL = 640, X = 960, kind = String(S.ship || 'liner');
  CAM.keys = [[0, 960, 520, 1.04, 0], [HIT, 960, 600, 1.08, 0], [D, 960, 660, 1.12, 0]];
  DUST = { n: 20, col: C.ink, x: 1400, y: 200, r: 900, up: 8 };
  tag(112, 92, S.who || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.03, 6, -0.3); ring(HIT, X - 60, WL, 520, C.ink, 6, 1.2, 0.18); ring(HIT + 0.3, X - 60, WL, 800, C.ink, 3, 1.4, 0.18);
  puffs(HIT - 0.1, X - 60, WL, 14, C.ink, 10, 50, 1.0, 0, -40, 300, 0.25);
  const ship = (c) => {
    g.fillStyle = c || C.fig;
    if (kind === 'warship') { g.fill(poly([[-480, 0], [460, 0], [520, -70], [-520, -70]])); g.fill(rr(-260, -150, 420, 84, 6)); g.fill(rr(-80, -250, 120, 110, 6)); g.fill(rr(-430, -110, 120, 44, 8)); g.fill(rr(330, -110, 120, 44, 8)); g.fillRect(-20, -360, 10, 120); }
    else if (kind === 'boat') { g.fill(poly([[-200, 0], [180, 0], [240, -60], [-230, -60]])); g.fill(rr(-80, -150, 160, 92, 8)); }
    else { g.fill(poly([[-520, 0], [500, 0], [560, -110], [-540, -110]])); g.fill(rr(-430, -170, 820, 64, 4)); g.fill(rr(-380, -215, 700, 50, 4));
      for (let k = 0; k < 4; k++) g.fill(poly([[-280 + k * 170, -210], [-220 + k * 170, -210], [-232 + k * 170, -330], [-292 + k * 170, -330]])); g.fillRect(-500, -330, 6, 220); g.fillRect(470, -330, 6, 220); }
    if (!c) { g.fillStyle = rgba(C.key, 0.85); for (let k = 0; k < 18; k++) if (hn(k, 171) < 0.7) g.fillRect(-440 + k * 48, -150, 14, 10); }
  };
  return (t) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, WL); sky.addColorStop(0, C.bg); sky.addColorStop(1, mixc(C.bg, C.water, 0.5)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    cam(1);
    g.fillStyle = mixc(C.bg, C.water, 0.4); g.fillRect(-600, -600, 3200, WL + 600);
    pool(1500, 170, 260, 260, C.ink, 0.3); g.fillStyle = shade(C.ink, -0.05); g.beginPath(); g.arc(1500, 170, 46, 0, TAU); g.fill();
    // the ship: bob, then list (stern up) and down past the line by the hit
    const s0 = Math.max(0.05, HIT - 1.3), u = seg(t, s0, HIT), sinkY = 420 * ei2(u) + (t > HIT ? 260 * (t - HIT) : 0), rot = -0.32 * sm(u) - (t > HIT ? 0.05 * (t - HIT) : 0);
    const bob = 6 * Math.sin(t * 2.1);
    const draw = (under) => { g.save(); g.translate(X, WL + 30 + bob + sinkY); g.rotate(rot); if (under) ship(mixc(C.water, C.fig, 0.4)); else rim(c => ship(c), 4, 0.9, 0.7); g.restore(); };
    g.save(); g.beginPath(); g.rect(-600, -600, 3200, WL + 600); g.clip(); draw(false); g.restore();
    const wg = g.createLinearGradient(0, WL, 0, 1400); wg.addColorStop(0, mixc(C.water, C.cool, 0.2)); wg.addColorStop(1, C.bg);
    g.fillStyle = wg; g.beginPath(); g.moveTo(-600, 2000);
    for (let x = -600; x <= 2600; x += 20) g.lineTo(x, WL + 7 * Math.sin(x * 0.012 + t * 2.2) + 4 * Math.sin(x * 0.031 - t * 3.1)); g.lineTo(2600, 2000); g.closePath(); g.fill();
    g.save(); g.beginPath(); g.rect(-600, WL + 6, 3200, 2000); g.clip(); g.globalAlpha = 0.55; draw(true); g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 12; k++) { const y = WL + 20 + k * 22, w = 120 - k * 6; g.fillStyle = rgba(C.ink, 0.12 - k * 0.008); g.fillRect(1500 - w / 2 + 14 * Math.sin(t * 2 + k), y, w, 5); } g.restore();
    for (let i = 0; i < 26; i++) { const u2 = t - (HIT - 0.4 + 0.08 * i); if (u2 < 0 || u2 > 1.4) continue; const x = X - 140 + 280 * hn(i, 172) + 20 * Math.sin(u2 * 6 + i), y = WL + 260 - 260 * u2 - 60 * hn(i, 173);
      if (y < WL) continue; g.strokeStyle = rgba(C.ink, 0.6 * (1 - u2 / 1.4)); g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 4 + 9 * hn(i, 174), 0, TAU); g.stroke(); }
    drawFx(t);
  };
};
// ── EXPLODED: the thing (S.thing: building | ship | car | plane | bridge) on its ground at night; on the verb a white
// flash, a fireball that swells and rolls up, a SHOCK RING racing out along the ground, debris thrown on arcs, smoke
// climbing; the camera takes the blast (heavy kick). No people in it.
AC.exploded = function () {
  const FY = 820, X = 960, kind = String(S.thing || 'building');
  CAM.keys = [[0, 960, 520, 1.06, 0], [HIT, 960, 520, 1.0, 0], [D, 960, 500, 0.96, 0]];
  DUST = null;
  tag(112, 92, S.who || S.what || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.12, 34, 1.4); flash(HIT, 0.85, '#FFF4DE');
  ring(HIT, X, FY, 1500, C.ink, 14, 0.8, 0.12); ring(HIT + 0.04, X, FY - 160, 900, C.key, 10, 0.5, 1);
  sparks(HIT, X, FY - 140, 40, '#FFD9A0', 1500, -Math.PI / 2, 2.6, 900, 0.9);
  puffs(HIT + 0.1, X, FY - 200, 26, '#15161A', 60, 260, 3.2, 0, -120, 420, 0.75);
  puffs(HIT, X, FY, 18, '#2A2B30', 40, 200, 2.4, 0, -20, 1200, 0.5);
  const DB = Array.from({ length: 26 }, (_, i) => ({ a: -Math.PI / 2 + (hn(i, 181) - 0.5) * 2.4, v: 500 + 900 * hn(i, 182), s: 10 + 30 * hn(i, 183), r: hn(i, 184) * 20 - 10 }));
  const thing = (c, broken) => {
    g.fillStyle = c || C.fig;
    if (kind === 'ship') { g.fill(poly([[-420, 0], [420, 0], [470, -70], [-470, -70]])); g.fill(rr(-260, -170, 420, 100, 6)); g.fill(rr(-60, -260, 90, 90, 6)); }
    else if (kind === 'car') { g.fill(rr(-260, -110, 520, 80, 30)); g.fill(poly([[-150, -110], [-90, -190], [110, -190], [170, -110]])); g.beginPath(); g.arc(-150, -24, 40, 0, TAU); g.arc(160, -24, 40, 0, TAU); g.fill(); }
    else if (kind === 'plane') { g.fill(rr(-380, -90, 760, 70, 35)); g.fill(poly([[-40, -60], [-180, 40], [-110, 40], [80, -60]])); g.fill(poly([[300, -70], [380, -200], [420, -200], [400, -70]])); }
    else if (kind === 'bridge') { g.fillRect(-700, -170, 1400, 40); for (const x of [-420, 0, 420]) g.fillRect(x - 25, -170, 50, 170); }
    else { g.fill(rr(-260, -520, 520, 520, 4)); g.fill(rr(-420, -300, 180, 300, 4)); g.fill(rr(240, -360, 200, 360, 4));
      if (!c) { g.fillStyle = rgba(C.key, 0.7); for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) if (hn(r * 5 + k, 185) < 0.5) g.fillRect(-220 + k * 92, -480 + r * 66, 40, 34); } }
    void broken;
  };
  return (t) => {
    cam(1);
    const fire = t >= HIT ? Math.exp(-(t - HIT) / 1.2) : 0;
    const sky = mixc(C.bg, C.hot, 0.35 * fire);
    g.fillStyle = sky; g.fillRect(-800, -600, 3600, 2400);
    pool(X, FY - 200, 1400, 900, C.hot, 0.5 * fire + 0.02); pool(X, FY - 200, 700, 500, C.key, 0.6 * fire);
    g.fillStyle = shade(C.wall, -0.3); g.fill(poly([[-800, FY], [300, FY - 60], [700, FY - 30], [1300, FY - 70], [2700, FY]]));
    g.fillStyle = C.floor; g.fillRect(-800, FY, 3600, 900);
    const gone = seg(t, HIT, HIT + 0.08);
    if (gone < 1) { g.save(); g.translate(X, FY); g.globalAlpha = 1 - gone; rim(c => thing(c), 4); g.restore(); }
    else { g.save(); g.translate(X, FY); g.beginPath(); g.rect(-900, -140 - 30 * Math.sin(t), 1800, 200); g.clip(); thing('#06070A'); g.restore(); }
    if (t >= HIT) {                                  // the fireball: layered discs swelling and rolling upward
      const u = t - HIT;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + u * 0.8, r = (180 + 260 * eo3(Math.min(1, u / 0.6))) * (0.5 + 0.5 * hn(k, 186)), y = FY - 160 - 260 * eo2(Math.min(1, u / 1.4)) + Math.sin(a) * r * 0.3;
        const fb = g.createRadialGradient(X + Math.cos(a) * r * 0.5, y, 0, X + Math.cos(a) * r * 0.5, y, r); fb.addColorStop(0, rgba('#FFF2C8', 0.55 * fire)); fb.addColorStop(0.4, rgba(C.key, 0.45 * fire)); fb.addColorStop(1, rgba(C.hot, 0));
        g.fillStyle = fb; g.beginPath(); g.arc(X + Math.cos(a) * r * 0.5, y, r, 0, TAU); g.fill(); }
      g.restore();
      for (const d of DB) { const x = X + Math.cos(d.a) * d.v * u, y = FY - 140 + Math.sin(d.a) * d.v * u + 900 * u * u; if (y > FY + 20) continue;
        g.save(); g.translate(x, y); g.rotate(d.r * u); g.fillStyle = C.fig; g.fillRect(-d.s / 2, -d.s / 3, d.s, d.s * 0.66); g.restore(); }
    }
    drawFx(t);
  };
};
// ── TESTIFIED: the courtroom — wood panelling, the witness stand with its microphone, the person in it (photo or
// figure), sound arcs off the mic as they speak; the GAVEL strikes its block on the verb (ring, kick)
AC.testified = function () {
  const FY = 900, X = 1080, SY = 640;
  CAM.keys = [[0, 1000, 520, 1.14, 0], [HIT, 960, 540, 1.04, 0], [D, 990, 530, 1.1, 0]];
  DUST.x = X; DUST.y = 420;
  tag(112, 92, S.who || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.04, 12, 0.5); ring(HIT, 440, 760, 240, C.key, 7, 0.5, 0.35); sparks(HIT, 440, 750, 8, C.key, 400, -Math.PI / 2, 1.6, 900, 0.3);
  return (t) => {
    cam(1);
    g.fillStyle = shade(C.wood, -0.62); g.fillRect(-600, -500, 3200, 2000);
    for (let k = 0; k < 14; k++) { const x = -300 + k * 200; g.fillStyle = rgba('#000', 0.22); g.fillRect(x, -300, 8, FY + 300); g.fillStyle = rgba(C.key, 0.05); g.fillRect(x + 10, -300, 4, FY + 300); }
    g.fillStyle = rgba('#000', 0.25); g.fillRect(-600, 420, 3200, 10);
    pool(X, 360, 700, 520, C.key, 0.3);
    g.strokeStyle = rgba(C.key, 0.35); g.lineWidth = 6; g.beginPath(); g.arc(X, 200, 110, 0, TAU); g.stroke(); g.beginPath(); g.arc(X, 200, 84, 0, TAU); g.stroke();
    // the witness
    if (PH) bust(X, SY + 260, 640); else figRim(X, FY + 30, 600, Object.assign({}, POSE.speak, { head: -0.05 + 0.05 * Math.sin(t * 3) }), -1, {});
    // the stand
    rim(c => { g.fillStyle = c || shade(C.wood, -0.25); g.fill(rr(X - 300, SY, 600, FY - SY + 100, 8)); }, 4);
    g.fillStyle = rgba('#000', 0.18); for (let k = 0; k < 3; k++) g.fill(rr(X - 260 + k * 180, SY + 50, 150, FY - SY - 40, 6));
    g.fillStyle = shade(C.wood, -0.1); g.fillRect(X - 320, SY - 18, 640, 26);
    // the microphone on its gooseneck; the voice as arcs
    g.strokeStyle = C.fig; g.lineWidth = 8; g.beginPath(); g.moveTo(X - 120, SY - 10); g.quadraticCurveTo(X - 130, SY - 120, X - 60, SY - 150); g.stroke();
    rim(c => { g.fillStyle = c || C.fig; g.fill(rr(X - 76, SY - 178, 34, 52, 14)); }, 2);
    for (let k = 0; k < 3; k++) { const u = ((t * 1.1 + k / 3) % 1); g.strokeStyle = rgba(C.ink, 0.5 * (1 - u)); g.lineWidth = 4; g.beginPath(); g.arc(X - 60, SY - 152, 30 + 110 * u, -Math.PI * 0.35, Math.PI * 0.35); g.stroke(); }
    // the bench edge and the gavel in the left foreground: up, then down on the block on the verb
    cam(1.25);
    rim(c => { g.fillStyle = c || shade(C.wood, -0.35); g.fillRect(-400, 780, 1000, 400); }, 4);
    rim(c => { g.fillStyle = c || shade(C.wood, -0.05); g.fill(rr(330, 740, 220, 46, 10)); }, 3);
    const up = t < HIT ? -0.95 * sm(seg(t, HIT - 0.75, HIT - 0.22)) + 0.95 * ei2(seg(t, HIT - 0.22, HIT)) : 0.06 * Math.exp(-(t - HIT) / 0.1) * Math.sin((t - HIT) * 40);
    g.save(); g.translate(240, 700); g.rotate(-0.6 * (t < HIT - 0.22 ? sm(seg(t, HIT - 0.75, HIT - 0.22)) : 1 - ei2(seg(t, HIT - 0.22, HIT))) + up * 0);
    rim(c => { g.fillStyle = c || shade(C.wood, -0.15); g.fill(rr(-10, -10, 230, 22, 10)); g.fill(rr(170, -48, 66, 98, 16)); }, 3);
    g.fillStyle = rgba(C.key, 0.8); g.fillRect(176, -20, 54, 8); g.fillRect(176, 14, 54, 8);
    g.restore();
    cam(1);
    drawFx(t);
  };
};
// ── CRASHED (a market, a currency, a price): a live price line climbs with its jitter, then on the verb it PLUNGES —
// the line turns red and falls off the cliff, the chart cracks like glass, the frame shakes. S.what = what crashed.
AC.crashed = function () {
  const X0 = 180, X1 = 1760, Y0 = 220, Y1 = 900, tC = HIT;
  CAM.keys = [[0, 860, 520, 1.12, 0], [HIT, 1180, 540, 1.1, 0], [D, 1300, 640, 1.18, 0]];
  DUST = null;
  tag(112, 92, S.what || S.who || '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.07, 22, -1.2); flash(HIT, 0.25, C.hot);
  const N = 140, pts = []; let v = 0.32;
  for (let i = 0; i < N; i++) { v += (hn(i, 191) - 0.42) * 0.035; pts.push(Math.min(0.85, Math.max(0.15, v))); }
  const xAt = s => X0 + (X1 - X0) * s, peak = 0.62, yv = val => Y1 - (Y1 - Y0) * val;
  return (t) => {
    cam(1);
    g.fillStyle = shade(C.bg, 0.02); g.fillRect(-600, -400, 3200, 2000);
    g.strokeStyle = rgba(C.cool, 0.12); g.lineWidth = 2;
    for (let k = 0; k <= 10; k++) { const y = Y0 + (Y1 - Y0) * k / 10; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1 + 300, y); g.stroke(); }
    for (let k = 0; k <= 16; k++) { const x = X0 + (X1 - X0) * k / 16; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1 + 200); g.stroke(); }
    const head = Math.min(peak, seg(t, 0, HIT) * peak + 0.02), fallU = t > HIT ? eo2(seg(t, HIT, HIT + 0.6)) : 0;
    const n = Math.floor(head * N), red = t > HIT;
    g.lineWidth = 7; g.lineJoin = 'round'; g.strokeStyle = C.green; g.beginPath();
    for (let i = 0; i <= n; i++) { const x = xAt(i / N), y = yv(pts[i] + 0.12 * i / N); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    const lx = xAt(n / N), ly = yv(pts[n] + 0.12 * n / N);
    if (red) { const ex = lx + 360 * fallU, ey = ly + (Y1 + 170 - ly) * fallU; g.strokeStyle = C.hot; g.lineWidth = 9; g.beginPath(); g.moveTo(lx, ly);
      for (let k = 1; k <= 12; k++) { const u = k / 12 * fallU; g.lineTo(lx + 360 * u + (k % 2 ? 12 : -8), ly + (Y1 + 170 - ly) * (u / Math.max(0.01, fallU)) * fallU); } g.stroke();
      pool(ex, ey, 160, 160, C.hot, 0.6); g.fillStyle = C.hot; g.beginPath(); g.arc(ex, ey, 12, 0, TAU); g.fill(); }
    else { pool(lx, ly, 90, 90, C.green, 0.6); g.fillStyle = C.ink; g.beginPath(); g.arc(lx, ly, 9, 0, TAU); g.fill(); }
    if (red) {                                       // the glass crack from the break point
      const u = eo3(seg(t, HIT, HIT + 0.25)); g.strokeStyle = rgba(C.ink, 0.7); g.lineWidth = 2.5;
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + 0.3, L = (180 + 260 * hn(k, 192)) * u; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a) * L * 0.5 + 20 * hn(k, 193), ly + Math.sin(a) * L * 0.5); g.lineTo(lx + Math.cos(a) * L, ly + Math.sin(a) * L); g.stroke(); }
    }
    drawFx(t);
  };
};
// ── RESIGNED: a desk under its lamp, the nameplate (S.who / S.role, the sentence's words) and the chair behind; a hand
// comes in, lifts the nameplate off the desk and away on the verb; the empty chair turns, the lamp clicks off
AC.resigned = function () {
  const FY = 900, X = 960, DY = 700, tOff = HIT + 0.75;
  CAM.keys = [[0, 960, 600, 1.16, 0], [HIT, 960, 560, 1.06, 0], [D, 960, 540, 1.02, 0]];
  DUST.x = X; DUST.y = 500;
  tag(112, 92, '', [S.where, S.when].filter(Boolean).join(' · '), { t0: Math.max(0.12, HIT - 0.8) });
  kick(HIT, 0.025, 6, 0.2); kick(tOff, 0.015, 3);
  const name = UP(S.who || ''), role = UP(S.role || '');
  return (t) => {
    cam(1);
    const lamp = t < tOff ? 1 : 0.28;
    room(FY, X, C.pool, 0.5 * lamp);
    // the chair: back panel + seat, turning slowly once empty
    const turn = t > HIT ? Math.sin(Math.min(1, (t - HIT) / 1.6) * Math.PI * 0.5) : 0, cw = 300 * (1 - 0.55 * turn);
    rim(c => { g.fillStyle = c || C.fig; g.fill(rr(X - cw / 2, 330, cw, 300, 30)); g.fillRect(X - 12, 630, 24, 80); }, 4, lamp, lamp);
    // the desk lamp (left) and its pool
    g.fillStyle = C.fig; g.fillRect(560, DY - 200, 10, 200); g.fill(poly([[520, DY - 210], [640, DY - 210], [610, DY - 260], [550, DY - 260]]));
    if (lamp > 0.5) { pool(580, DY - 60, 340, 140, C.key, 0.7); beam(580, DY - 210, 640, DY, 110, 420, C.key, 0.18); }
    rim(c => { g.fillStyle = c || shade(C.wood, -0.3); g.fillRect(260, DY, 1400, 40); g.fillRect(300, DY + 40, 30, FY - DY - 40); g.fillRect(1590, DY + 40, 30, FY - DY - 40); }, 3, lamp, lamp);
    g.fillStyle = C.paper; g.save(); g.translate(1240, DY - 6); g.transform(1, 0, -0.5, 0.25, 0, 0); g.fillRect(-120, -160, 240, 300); g.restore();
    // the nameplate: lifted off and away by a hand on the verb
    const lift = t < HIT - 0.45 ? 0 : t < HIT ? 0.06 * sm(seg(t, HIT - 0.45, HIT - 0.2)) : 0.06 + ei2(seg(t, HIT, HIT + 0.55));
    const nx = X + 900 * Math.max(0, lift - 0.06), ny = DY - 50 - 600 * Math.max(0, lift - 0.06) - 30 * Math.min(lift, 0.06) / 0.06, rot = 0.4 * Math.max(0, lift - 0.06);
    g.save(); g.translate(nx, ny); g.rotate(rot);
    rim(c => { g.fillStyle = c || shade(C.wood, -0.1); g.fill(poly([[-260, 50], [260, 50], [240, -40], [-240, -40]])); }, 3);
    g.fillStyle = mixc(C.key, '#6B5020', 0.2); g.fill(rr(-215, -30, 430, 72, 4));
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1A1408';
    let fs = 40; g.font = `600 ${fs}px 'Ac Cond'`; while (g.measureText(name).width > 400 && fs > 18) { fs -= 2; g.font = `600 ${fs}px 'Ac Cond'`; }
    g.fillText(name, 0, role ? -6 : 6); if (role) { g.font = "500 18px 'Ac Cond'"; g.fillText(role.slice(0, 38), 0, 26); }
    g.restore();
    const ha = t < HIT - 0.45 ? eo3(seg(t, HIT - 0.95, HIT - 0.45)) : 1;
    if (ha > 0 && lift < 0.9) { const hx = nx + 140 + 700 * (1 - ha), hy = ny - 70 - 300 * (1 - ha);
      hand(hx - 10, hy + 30, Math.PI - 0.6 + 0.3 * Math.min(1, lift * 2), { grip: true, flip: true }); }
    drawFx(t);
  };
};
