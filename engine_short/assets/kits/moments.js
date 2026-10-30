// MOMENTS — story-moment devices for the v6 documentary engine (moments.py places them on the word clock):
// toll (a death toll in human figures), counter (a number rolls and slams), money (bills stack up with the figure),
// compare (two quantities side by side), list (items fly in one per spoken item), date (a year/date stamps, blurs
// in or flickers on), quote (a page flies in, the spoken line is highlighted), mapping (a place pinged on a dark
// map), kinetic (the thesis line in kinetic type).
// One design system: near-black grounds with living grain, Anton for figures, Oswald for labels, one red for loss.
// Nothing ever stands still: the camera creeps, drifts and KICKS on every hit. S.hit = the second the key beat lands
// (moments.py puts it 0-4 f before the spoken word). S.fps < 30 = stepped motion (EDIT_GRAMMAR §6 S1: every move
// is drawn at floor(t*fps)/fps); the grain keeps the full rate. Everything is drawn from t alone.

const MO = {};
const RED = '#E3262B', RED2 = '#7A1014', INK = '#F2F0EB', DIM = '#8A8A8E', VOID = '#070708', AMB = '#FFB000';
const SMS = x => x * x * (3 - 2 * x);                   // whole-frame moves: smoothstep (peak 1.5x avg)
const STEP = S.fps && +S.fps < 30 ? +S.fps : 0;
const HIT = S.hit != null ? +S.hit : 1.0;
const hn = (i, s = 0) => { const v = Math.sin((i + 1) * 127.13 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const kf = (keys, f) => {                               // keyframes in FRAMES: [[f, a, b, ...], ...]
  if (f <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) if (f <= keys[i + 1][0]) {
    const A = keys[i], B = keys[i + 1], u = (f - A[0]) / (B[0] - A[0]);
    return A.slice(1).map((v, k) => v + (B[k + 1] - v) * u);
  }
  return keys[keys.length - 1].slice(1);
};
const SLAM = [[0, 2.0, 0.35, 14], [1, 1.3, 0.85, 5], [2, 1.08, 1, 1.5], [3, 1, 1, 0]];   // TERRA text_numeral_3d
const POP = [[0, 0.58, 0], [1, 0.88, 1], [2, 1.07, 1], [3, 1, 1]];                         // TERRA pawn pop
function el(tag, css, parent, html) {
  const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html;
  (parent || scene).appendChild(e); return e;
}
function cnv(parent, w = W, h = H, css = '') {
  const c = el('canvas', `position:absolute;left:0;top:0;width:${w}px;height:${h}px;${css}`, parent);
  c.width = w; c.height = h; return [c, c.getContext('2d')];
}
const LANG = String(S.lang || 'en').toLowerCase();
function num(v, dec = 0) {                              // thousands as the language writes them
  const sep = { cs: ' ', cz: ' ', pl: ' ', de: '.', fr: ' ' }[LANG] || ',';
  const dp = { cs: ',', cz: ',', pl: ',', de: ',', fr: ',' }[LANG] || '.';
  const p = Math.abs(v).toFixed(dec).split('.');
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (v < 0 ? '-' : '') + p.join(dp);
}
// ── the rig every scene shares: ground, void haze, camera, grain, vignette, flash, fx canvas ─────────────────────
const R = { kicks: [], push: [1.0, 1.05], ease: x => x, drift: 1, rot: [0, 0], pan: [0, 0, 0, 0], off: [0, 0], out: S.out || 'push' };
function kick(t, amt = 0.045, shake = 12) { R.kicks.push([t, amt, shake]); }
let CAMEL, FX, FXC, FLASH, HAZE;
function rig(opt = {}) {
  vig.style.background = 'radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 40%, rgba(0,0,0,.78) 100%)';
  grain(opt.grain ?? 0.26);
  if (S.ground) {
    const dim = el('div', `position:absolute;inset:0;background:rgba(4,4,5,${opt.dim ?? 0.62})`, scene);
    ground.style.filter = `saturate(${opt.sat ?? 0.55}) contrast(1.08)`;
  } else {
    scene.style.background = opt.bg || VOID;
    HAZE = el('div', `position:absolute;inset:-10%;background:radial-gradient(ellipse 55% 45% at 50% ${opt.hy ?? 55}%,
      ${opt.haze || 'rgba(70,72,80,.30)'} 0%, rgba(0,0,0,0) 70%)`, scene);
  }
  CAMEL = el('div', `position:absolute;inset:0;transform-origin:${opt.origin || '960px 540px'}`, scene);   // the push zooms INTO its subject
  [FX, FXC] = cnv(scene, W, H, 'pointer-events:none');
  FLASH = el('div', 'position:absolute;inset:0;opacity:0;background:#fff;mix-blend-mode:screen', scene);
  return CAMEL;
}
function camAt(t, tRaw) {
  const p = clamp(t / D);
  // after the hit the camera never settles: +3 %/s creep on top of the scene's own push (EDIT_GRAMMAR §7.2 hero hold)
  let s = lerp(R.push[0], R.push[1], R.ease(p)) * (1 + 0.03 * Math.max(0, t - HIT)), sh = 0;
  for (const [k0, amt, shake] of R.kicks) {
    if (t < k0) continue;
    const u = t - k0; s *= 1 + amt * Math.exp(-u / 0.14); sh += shake * Math.exp(-u / 0.2);
  }
  const fi = Math.floor(tRaw * 30 + 1e-6);
  let dx = R.drift * (9 * Math.sin(t * 0.9 + 1.3) + 4 * Math.sin(t * 2.3)) + sh * (hn(fi, 1) * 2 - 1);
  let dy = R.drift * (6 * Math.sin(t * 0.7) + 3 * Math.sin(t * 1.9 + 0.4)) + sh * (hn(fi, 2) * 2 - 1);
  dx += lerp(R.pan[0], R.pan[2], SMS(p)) + R.off[0]; dy += lerp(R.pan[1], R.pan[3], SMS(p)) + R.off[1];
  const rot = lerp(R.rot[0], R.rot[1], SMS(p)) + 0.25 * Math.sin(t * 0.8);
  if (R.out === 'push') s *= 1 + 0.07 * ei3(seg(t, D - 0.32, D));
  return `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${s.toFixed(5)}) rotate(${rot.toFixed(3)}deg)`;
}
// flash: 2 frames (white at a, then a/2); rings, sparks and embers live on the fx canvas
const FLASHES = [], RINGS = [], SPARKS = [];
function flash(t, a = 0.5, col = '#fff') { FLASHES.push([t, a, col]); }
function ring(t, x, y, r1, col = RED, w = 10, life = 0.55) { RINGS.push([t, x, y, r1, col, w, life]); }
function sparks(t, x, y, n = 26, col = '#FFD7B0', sp = 900) {
  for (let i = 0; i < n; i++) SPARKS.push([t, x, y, hn(i, 7 + SPARKS.length) * Math.PI * 2, sp * (0.4 + 0.8 * hn(i, 9)), col, 0.35 + 0.4 * hn(i, 11)]);
}
let EMB = null;
function embers(n = 60, col = '255,120,90', up = 60) { EMB = { n, col, up }; }
function drawFx(t, tRaw) {
  FXC.clearRect(0, 0, W, H);
  if (EMB) {                                            // slow embers / dust rising: the frame is never still
    for (let i = 0; i < EMB.n; i++) {
      const x0 = hn(i, 21) * W, y0 = hn(i, 22) * H, v = EMB.up * (0.4 + hn(i, 23));
      const y = ((y0 - v * tRaw) % H + H) % H, x = x0 + 18 * Math.sin(tRaw * (0.5 + hn(i, 24)) + i);
      const a = 0.25 + 0.55 * hn(i, 25) * (0.6 + 0.4 * Math.sin(tRaw * 3 + i)), r = 1 + 2.4 * hn(i, 26);
      FXC.fillStyle = `rgba(${EMB.col},${a.toFixed(3)})`; FXC.beginPath(); FXC.arc(x, y, r, 0, 7); FXC.fill();
    }
  }
  for (const [t0, x, y, r1, col, w, life] of RINGS) {
    const u = (t - t0) / life; if (u < 0 || u > 1) continue;
    FXC.strokeStyle = col; FXC.globalAlpha = (1 - u) * 0.9; FXC.lineWidth = Math.max(1, w * (1 - u));
    FXC.beginPath(); FXC.arc(x, y, 30 + r1 * eo3(u), 0, 7); FXC.stroke(); FXC.globalAlpha = 1;
  }
  for (const [t0, x, y, ang, sp, col, life] of SPARKS) {
    const u = t - t0; if (u < 0 || u > life) continue;
    const px = x + Math.cos(ang) * sp * u, py = y + Math.sin(ang) * sp * u + 900 * u * u;
    const qx = px - Math.cos(ang) * sp * 0.03, qy = py - (Math.sin(ang) * sp + 1800 * u) * 0.03;
    FXC.strokeStyle = col; FXC.globalAlpha = 1 - u / life; FXC.lineWidth = 3;
    FXC.beginPath(); FXC.moveTo(qx, qy); FXC.lineTo(px, py); FXC.stroke(); FXC.globalAlpha = 1;
  }
  let fa = 0, fc = '#fff';
  for (const [t0, a, col] of FLASHES) { const f = Math.floor((t - t0) * 30 + 1e-6); if (f === 0) { fa = Math.max(fa, a); fc = col; } else if (f === 1) { fa = Math.max(fa, a * 0.45); fc = col; } }
  FLASH.style.opacity = fa; FLASH.style.background = fc;
}
// a big figure: Anton, a hard drop shadow (y06 counter) or a stacked extrusion (y13 "370"); the SLAM lands it
function bigText(parent, css, look = 'white') {
  const ext = look === 'red'
    ? Array.from({ length: 9 }, (_, i) => `${i + 1}px ${i + 1}px 0 ${i < 5 ? '#9E1418' : '#5C0A0D'}`).join(',') + ',14px 22px 40px rgba(0,0,0,.65)'
    : '0 12px 0 rgba(0,0,0,.92), 0 18px 40px rgba(0,0,0,.6)';
  const wrap = el('div', `position:absolute;left:0;width:1920px;text-align:center;white-space:nowrap;${css}`, parent);
  const gR = el('div', `position:absolute;inset:0;color:#ff2020;mix-blend-mode:screen;opacity:0`, wrap);
  const gC = el('div', `position:absolute;inset:0;color:#20e8ff;mix-blend-mode:screen;opacity:0`, wrap);
  const main = el('div', `position:relative;color:${look === 'red' ? RED : INK};text-shadow:${ext}`, wrap);
  const ghost = el('div', `position:absolute;inset:0;color:${look === 'red' ? RED : INK};opacity:0`, wrap);
  return { wrap, main, ghost, gR, gC, set(s) { main.textContent = s; gR.textContent = s; gC.textContent = s; } };
}
// roll: v(t) = to * (1-(1-u)^2.5) per VIDEO frame, jittered up/down with a blurred ghost of the last value
// (TERRA counter_jitter_year); slam at `land`: 2.0x blurred -> 1.0 in 3 frames + chromatic split + flash
function rollSlam(B, t, t0, land, from, to, fmtv, cap) {
  const fi = Math.floor(t * 30 + 1e-6), tf = fi / 30;
  const val = typeof from === 'function' ? from : (tt => from + (to - from) * (1 - Math.pow(1 - seg(tt, t0, land), 2.5)));
  if (t < land) {
    const v = val(tf), vp = val(tf - 1 / 30), off = (hn(fi, 5) * 2 - 1) * 0.16 * cap;
    B.set(fmtv(v)); B.ghost.textContent = fmtv(vp);
    B.main.style.transform = `translateY(${off.toFixed(1)}px)`; B.main.style.filter = 'blur(2.2px)';
    B.ghost.style.opacity = 0.28; B.ghost.style.transform = `translateY(${(-off * 0.6 + cap * 0.18).toFixed(1)}px)`;
    B.ghost.style.filter = 'blur(6px)'; B.wrap.style.transform = ''; B.wrap.style.opacity = t < t0 ? 0 : 1;
    B.gR.style.opacity = B.gC.style.opacity = 0;
    return;
  }
  B.set(fmtv(to)); B.ghost.style.opacity = 0; B.main.style.transform = '';
  const [s, a, bl] = kf(SLAM, (t - land) * 30);
  B.wrap.style.transform = `scale(${s.toFixed(4)})`; B.wrap.style.opacity = a;
  B.main.style.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : '';
  const ca = Math.exp(-(t - land) / 0.07), off = 14 * ca;
  B.gR.style.opacity = B.gC.style.opacity = (0.85 * ca).toFixed(3);
  B.gR.style.transform = `translate(${-off}px,0)`; B.gC.style.transform = `translate(${off}px,0)`;
}
function tag(parent, text, css, bg = RED, col = '#fff') {   // y13 "PEOPLE" tag: a red box that wipes open
  const box = el('div', `position:absolute;overflow:hidden;white-space:nowrap;background:${bg};color:${col};${css}`, parent);
  const inner = el('div', 'display:inline-block', box, esc(text));
  return { box, inner, at(t, t0, dur = 0.22) { const p = eo3(seg(t, t0, t0 + dur)); box.style.clipPath = `inset(0 ${(100 - 100 * p).toFixed(2)}% 0 0)`; inner.style.transform = `translateX(${(-40 * (1 - p)).toFixed(1)}px)`; } };
}
function typedAt(node, s, t, t0, cps = 26) { node.innerHTML = t < t0 ? '' : typed(s, (t - t0) * cps, '▌'); }
// ── figures: the 2D human pictogram (head, torso, two arms, two legs), unit box 100 x 250, feet at y = 250 ─────────
const FIG = (() => {
  const p = new Path2D(), rr = (x, y, w, h, r) => { p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); };
  p.moveTo(70, 24); p.arc(50, 24, 20, 0, Math.PI * 2); p.closePath();
  rr(29, 49, 42, 94, 11); rr(14, 51, 12, 86, 6); rr(74, 51, 12, 86, 6); rr(30, 139, 18, 111, 7); rr(52, 139, 18, 111, 7);
  return p;
})();
function drawFig(g, x, footY, h, col, rot = 0, alpha = 1, sx = 1) {
  g.save(); g.translate(x, footY); if (rot) g.rotate(rot); g.scale(h / 250 * sx, h / 250); g.translate(-50, -250);
  g.globalAlpha = alpha; g.fillStyle = col; g.fill(FIG); g.restore();
}
// a crowd on a floor seen in perspective: rows back -> front, a little jitter so it reads as people, not a chart
function field(n, opt = {}) {
  const rows = opt.rows || (n <= 14 ? 1 : n <= 48 ? 3 : Math.max(3, Math.round(Math.sqrt(n / 3.3))));
  const cols = Math.ceil(n / rows), zb = Math.min(2.6, 1 + 0.32 * (rows - 1));
  const yh = opt.horizon ?? 330, yf = opt.front ?? 1010, span = opt.span ?? 1640;
  const sp = span / cols, hf = Math.min(opt.hmax ?? 300, sp * (rows === 1 ? 2.4 : 1.75));
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c; if (i >= n) break;
    const z = 1 + (zb - 1) * (rows === 1 ? 0 : (rows - 1 - r) / (rows - 1)) + (rows > 1 ? (hn(i, 3) - 0.5) * 0.12 : 0);
    const x = 960 + ((c - (cols - 1) / 2) * sp + (hn(i, 4) - 0.5) * sp * (rows > 1 ? 0.34 : 0.1)) / z;
    out.push({ i, r, c, z, x, y: yh + (yf - yh) / z, h: hf / z, dir: hn(i, 6) < 0.5 ? -1 : 1, rnd: hn(i, 8) });
  }
  out.sort((a, b) => b.z - a.z);                         // draw back to front
  return { pts: out, rows, cols };
}

// ── TOLL: N figures appear in waves while the count rolls with them; the number SLAMS on the word; the dead fall ──
// value (the toll), total (optional: everyone, e.g. 97 aboard -> the dead turn red among the grey), mode deaths|count,
// unit ("PEOPLE DIE"), sub ("OF 97 ABOARD"), kicker ("NEARLY"), fall_at (s: the verb), hit (s: the number lands)
MO.toll = function () {
  const N = Math.max(1, Math.round(+S.value || 1)), mode = S.mode || 'deaths', deaths = mode === 'deaths';
  const total = S.total && +S.total > N ? Math.round(+S.total) : 0;
  const nf = total ? Math.min(total, 400) : Math.min(N, 400);
  const nDead = total ? Math.max(1, Math.round(nf * N / total)) : nf;
  const look = S.look || (deaths ? 'red' : 'white');
  const cam = rig({ haze: deaths ? 'rgba(90,40,40,.30)' : 'rgba(70,72,80,.30)', hy: 70, origin: '960px 330px' });
  R.push = [1.0, 1.09]; R.rot = [0, -1.2]; R.pan = [0, 10, 0, -14];
  embers(deaths ? 70 : 40, deaths ? '255,110,80' : '220,220,230', 50);
  const floor = el('div', 'position:absolute;left:-10%;right:-10%;bottom:-6%;height:62%;background:radial-gradient(ellipse 60% 70% at 50% 100%, rgba(120,120,130,.20), rgba(0,0,0,0) 70%)', cam);
  const glowC = cnv(cam, W, H, `filter:blur(16px);opacity:.75;mix-blend-mode:screen`);
  const [, g] = cnv(cam);
  const halo = el('div', 'position:absolute;left:360px;top:20px;width:1200px;height:560px;background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,.82), rgba(0,0,0,0) 72%)', cam);
  const redGlow = el('div', `position:absolute;left:260px;top:-60px;width:1400px;height:700px;opacity:0;background:radial-gradient(ellipse 50% 45% at 50% 50%, rgba(227,38,43,.55), rgba(0,0,0,0) 70%)`, cam);
  const cap = nf > 150 ? 330 : 400, top0 = S.kicker ? 70 : 34;
  const B = bigText(cam, `top:${top0}px;font:400 ${cap}px/1 'Mo Num'`, look);
  const kick0 = S.kicker ? el('div', `position:absolute;left:0;width:1920px;top:18px;text-align:center;font:600 40px 'Mo Cond';letter-spacing:.32em;color:rgba(242,240,235,.75)`, cam, esc(String(S.kicker).toUpperCase())) : null;
  const T = S.unit ? tag(cam, String(S.unit).toUpperCase(), `left:50%;top:${top0 + cap * 0.97}px;transform:translateX(-50%);padding:6px 26px 4px;font:700 50px/1.15 'Mo Cond';letter-spacing:.14em`, deaths ? RED : INK, deaths ? '#fff' : '#0A0A0B') : null;
  const sub = S.sub ? el('div', `position:absolute;left:0;width:1920px;top:${top0 + cap * 0.97 + 84}px;text-align:center;font:700 30px 'Mo Mono';letter-spacing:.12em;color:rgba(242,240,235,.85)`, cam, '') : null;
  const F = field(nf, { horizon: 330, front: 1068, span: nf <= 14 ? 1300 : nf <= 40 ? 1760 : 2060, hmax: nf <= 14 ? 330 : 300 });
  // the crowd grows out of the middle of the floor (a ripple, front figures first): big readable people from frame 1
  const dC = p => Math.hypot(p.x - 960, (p.y - 820) * 1.8);
  const order = F.pts.slice().sort((a, b) => dC(a) - dC(b));
  const dead = new Set(total ? order.map(p => p.i).sort((a, b) => hn(a, 13) - hn(b, 13)).slice(0, nDead) : order.map(p => p.i));
  const tIn = 0.04, land = HIT, span = Math.max(0.3, land - 0.07 - tIn);
  // with a total and little breath before the number (< 0.9 s): everyone is on the floor first, and the dead turn red
  // ALL AT ONCE with the slam (a ripple from the centre in ~5 frames) — the count needs no roll to be read
  const burst = total && land - tIn < 0.9;
  const fillEnd = total && !burst ? tIn + span * 0.42 : land - 0.07;
  const appear = {}, redAt = {};
  // a total's crowd is a quarter there on the cut (no near-empty first frames), the rest pops in; a pure count
  // starts from the first figure (the counter counts them)
  const pre0 = total ? 0.25 : 0;
  order.forEach((p, k) => { const q = k / Math.max(1, order.length);
    appear[p.i] = q < pre0 ? 0 : tIn + (fillEnd - tIn) * Math.pow((q - pre0) / (1 - pre0), total ? 0.6 : 0.72); });
  const deadList = order.filter(p => dead.has(p.i));
  if (total && !burst) deadList.forEach((p, k) => { redAt[p.i] = fillEnd + (land - 0.07 - fillEnd) * Math.pow(k / Math.max(1, deadList.length), 0.8); });
  if (burst) deadList.forEach(p => { redAt[p.i] = land + 0.16 * Math.min(1, Math.hypot(p.x - 960, (p.y - 760) * 2) / 1100); });
  const FALL = S.fall_at != null ? +S.fall_at : land + 0.9;
  kick(land, 0.065, 18); flash(land, deaths ? 0.42 : 0.3, deaths ? '#ffd0c8' : '#fff');
  ring(land, 960, cap * 0.55 + 50, 900, deaths ? RED : INK, 14, 0.6); sparks(land, 960, cap * 0.55 + 50, 30, deaths ? '#FF8A70' : '#FFFFFF');
  if (deaths) kick(FALL + 0.3, 0.018, 7);
  const firstT = burst ? land : total ? Math.min(...deadList.map(p => redAt[p.i])) : Math.min(...order.map(p => appear[p.i]));
  const valFn = tt => total ? deadList.filter(p => redAt[p.i] <= tt).length * N / Math.max(1, deadList.length)
    : order.filter(p => appear[p.i] <= tt).length * N / Math.max(1, order.length);
  return (t, tRaw) => {
    g.clearRect(0, 0, W, H);
    const after = t >= land, pulse = after ? 1 + 0.05 * Math.exp(-(t - land) / 0.12) : 1;
    for (const p of F.pts) {
      const u = t - appear[p.i]; if (u < 0) continue;
      const [ps, pa] = kf(POP, u * 30);
      let col = deaths && !total ? RED : (look === 'white' ? '#E9E7E2' : '#55565C'), rot = 0, al = pa, dy = (1 - Math.min(1, u * 10)) * -18 / p.z;
      if (total && dead.has(p.i) && t >= redAt[p.i]) { const f = (t - redAt[p.i]) * 30; col = f < 1.5 ? '#FFFFFF' : RED; }
      if (dead.has(p.i) && deaths && t >= FALL) {
        const tf = FALL + (nf > 60 ? 0.9 * Math.hypot(p.x - 960, p.y - 700) / 1100 : 0.7 * p.rnd), v = t - tf;
        if (v > 0) {
          const fallU = clamp(v / 0.34), ang = p.dir * (Math.PI / 2 - 0.05) * ei3(fallU);
          const bounce = v > 0.34 ? p.dir * 0.09 * Math.exp(-(v - 0.34) / 0.1) * Math.sin((v - 0.34) * 40) : 0;
          rot = ang - bounce; col = v > 0.34 ? RED2 : col; al *= v > 0.34 ? 0.78 : 1;
        }
      }
      drawFig(g, p.x, p.y + dy, p.h * ps * (dead.has(p.i) ? pulse : 1), col, rot, al);
      const tr = total ? redAt[p.i] : (deaths ? appear[p.i] : null), ur = tr != null ? (t - tr) / 0.4 : -1;
      if (ur >= 0 && ur < 1 && dead.has(p.i)) { g.strokeStyle = `rgba(255,70,60,${(1 - ur).toFixed(3)})`; g.lineWidth = 3;
        g.beginPath(); g.ellipse(p.x, p.y, (8 + 60 * eo3(ur)) / p.z, (3 + 20 * eo3(ur)) / p.z, 0, 0, 7); g.stroke(); }
    }
    const gg = glowC[1]; gg.clearRect(0, 0, W, H); gg.drawImage(g.canvas, 0, 0);
    rollSlam(B, t, 0.0, land, burst ? N : valFn, N, v => num(Math.round(v)), cap);
    if (!after) B.main.style.filter = 'blur(1.6px)';
    if (t < firstT) B.wrap.style.opacity = 0;
    redGlow.style.opacity = after ? (deaths ? 0.75 : 0.25) * (0.85 + 0.15 * Math.sin(tRaw * 9)) * clamp((t - land) * 6) : 0;
    if (kick0) kick0.style.opacity = seg(t, 0.0, 0.25);
    if (T) T.at(t, land + 0.1);
    if (sub) typedAt(sub, String(S.sub).toUpperCase(), t, land + 0.42, 30);
    halo.style.opacity = 0.9;
    floor.style.opacity = 1;
  };
};

// ── dispatch ─────────────────────────────────────────────────────────────────────────────────────────────────────
let _mf = null;
function build() {
  const f = MO[S.type];
  if (!f) throw new Error('moments: unknown scene ' + S.type);
  if (S.error) throw new Error(S.error);
  _mf = f();
}
function frame(tRaw) {
  const t = STEP ? Math.floor(tRaw * STEP + 1e-6) / STEP : tRaw;
  if (_mf) _mf(t, tRaw);
  if (CAMEL) CAMEL.style.transform = camAt(t, tRaw);
  if (FXC) drawFx(t, tRaw);
  const fi = Math.floor(tRaw * 30 + 1e-6);              // the grain lives at the full rate, stepped or not
  document.getElementById('grain').style.backgroundPosition = `${Math.floor(hn(fi, 31) * 512)}px ${Math.floor(hn(fi, 32) * 512)}px`;
  if (S.ground) ground.style.transform = `scale(${(1.06 + 0.05 * t / D).toFixed(4)}) translate(${(-8 * t / D).toFixed(2)}px,${(4 * Math.sin(t * 0.6)).toFixed(2)}px)`;
}

// ── COUNTER: one big figure rolls (jittered, blurred ghost) and SLAMS on the word; the camera pushes INTO it ──────
// value, from (a figure the narration said before; else it rolls up from zero at once — a held "0" never shows),
// prefix, suffix, decimals, unit ("TONS OF AMMONIUM NITRATE"), kicker ("NEARLY"), look white|red, hit
MO.counter = function () {
  const v1 = +S.value || 0, v0 = S.from != null ? +S.from : 0, dec = +S.decimals || 0;
  const look = S.look || 'white', red = look === 'red';
  const cam = rig({ dim: 0.58, haze: red ? 'rgba(90,30,30,.32)' : 'rgba(80,84,96,.30)', hy: 50 });
  const hp = clamp(HIT / D, 0.15, 0.85);
  R.push = [1.0, 1.13]; R.ease = u => u < hp ? 0.72 * Math.pow(u / hp, 2) : 0.72 + 0.28 * (u - hp) / (1 - hp);
  R.rot = [-0.6, 0.5];
  embers(45, red ? '255,120,90' : '230,230,240', 40);
  const rays = el('div', `position:absolute;left:-40%;top:-60%;width:180%;height:220%;opacity:.0;background:repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,.07) 0deg 3deg, rgba(0,0,0,0) 3deg 12deg);mix-blend-mode:screen`, cam);
  const halo = el('div', 'position:absolute;left:260px;top:140px;width:1400px;height:800px;background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,.72), rgba(0,0,0,0) 72%)', cam);
  const txt = String(S.prefix || '') + num(v1, dec) + String(S.suffix || '');
  const cap = Math.min(430, Math.floor(1750 / Math.max(2.2, txt.length * 0.5)));
  const top = 540 - cap * 0.74;
  const B = bigText(cam, `top:${top}px;font:400 ${cap}px/1 'Mo Num'`, look);
  const kick0 = S.kicker ? el('div', `position:absolute;left:0;width:1920px;top:${top - 70}px;text-align:center;font:600 44px 'Mo Cond';letter-spacing:.34em;color:rgba(242,240,235,.78)`, cam, '') : null;
  const rule = el('div', `position:absolute;left:960px;top:${top + cap * 1.06}px;height:6px;width:0;background:${RED}`, cam);
  const unit = S.unit ? el('div', `position:absolute;left:0;width:1920px;top:${top + cap * 1.06 + 26}px;text-align:center;font:700 64px/1.1 'Mo Cond';letter-spacing:.12em;color:${INK};text-shadow:0 6px 0 rgba(0,0,0,.8)`, cam, '') : null;
  const land = HIT;
  kick(land, 0.07, 16); flash(land, 0.38, red ? '#ffcfc4' : '#fff');
  ring(land, 960, top + cap * 0.5, 1000, red ? RED : 'rgba(255,255,255,.9)', 12, 0.55); sparks(land, 960, top + cap * 0.5, 22, red ? '#FF8A70' : '#fff', 1100);
  const STREAKS = Array.from({ length: 26 }, (_, i) => [hn(i, 51), hn(i, 52), hn(i, 53)]);
  const fmtv = v => String(S.prefix || '') + num(dec ? v : Math.round(v), dec) + String(S.suffix || '');
  return (t, tRaw) => {
    rollSlam(B, t, 0.02, land, v0, v1, fmtv, cap);
    rays.style.opacity = (t < land ? 0.25 * seg(t, 0, land) : 0.9 * Math.exp(-(t - land) / 0.5) + 0.35).toFixed(3);
    rays.style.transform = `rotate(${(t * 6).toFixed(2)}deg)`;
    if (kick0) { kick0.style.opacity = seg(t, 0, 0.2); kick0.textContent = String(S.kicker).toUpperCase(); }
    const rp = eo3(seg(t, land + 0.08, land + 0.45));
    rule.style.width = (rp * 760) + 'px'; rule.style.left = (960 - rp * 380) + 'px';
    if (unit) { unit.innerHTML = typed(String(S.unit).toUpperCase(), (t - land - 0.18) * 34, ''); }
    if (t < land) {                                     // speed streaks while it rolls: the figure is RUSHING
      const g = FXC; g.save();
      for (const [a, b, c] of STREAKS) {
        const y = top + cap * (0.1 + 0.8 * a), x = ((b * 2400 - tRaw * (1400 + 900 * c)) % 2400 + 2400) % 2400 - 240;
        g.globalAlpha = 0.12 + 0.18 * c; g.fillStyle = '#fff'; g.fillRect(x, y, 160 + 260 * c, 2);
      }
      g.restore();
    }
  };
};

// ── MONEY: bundles (or gold bars) drop onto stacks while the sum rolls; the last one thumps down on the word ───────
// value, prefix ("$"), suffix (" Kč"), decimals, unit, kicker, metal bills|gold, hit
MO.money = function () {
  const v1 = +S.value || 0, dec = +S.decimals || 0, gold = S.metal === 'gold';
  const cam = rig({ haze: gold ? 'rgba(120,90,30,.28)' : 'rgba(60,80,62,.30)', hy: 78 });
  R.push = [1.0, 1.06]; R.pan = [0, 120, 0, -40]; R.rot = [0.6, -0.4];
  embers(30, gold ? '255,210,120' : '210,230,200', 30);
  const light = el('div', 'position:absolute;left:460px;top:-200px;width:1000px;height:1300px;background:radial-gradient(ellipse 40% 60% at 50% 20%, rgba(255,245,220,.16), rgba(0,0,0,0) 70%)', cam);
  const [, g] = cnv(cam);
  const txt = String(S.prefix || '') + num(v1, dec) + String(S.suffix || '');
  const cap = Math.min(300, Math.floor(1700 / Math.max(2.2, txt.length * 0.5)));
  const B = bigText(cam, `top:70px;font:400 ${cap}px/1 'Mo Num'`, 'white');
  B.main.style.color = gold ? '#F2C35B' : INK;
  const unit = S.unit ? el('div', `position:absolute;left:0;width:1920px;top:${80 + cap * 1.02}px;text-align:center;font:700 54px 'Mo Cond';letter-spacing:.14em;color:${INK}`, cam, '') : null;
  const K = 7, BW = 190, BH = 26, DD = 46;
  const cols = Array.from({ length: K }, (_, k) => ({ x: 960 + (k - (K - 1) / 2) * 232 - BW / 2 - DD / 2, base: 1010 - Math.abs(k - 3) * 12,
    n: Math.round(7 + 8 * (1 - Math.abs(k - 3) / 3) + 2 * hn(k, 61)) }));
  const seq = []; for (let j = 0; j < 24; j++) for (let k = 0; k < K; k++) if (j < cols[k].n) seq.push([k, j]);
  const land = HIT, t0 = 0.05, NQ = seq.length;
  // bundle q lands when the rolling sum passes q/NQ of it (the roll is v = 1-(1-u)^2.5), the last one ON the word
  const ta = seq.map((_, q) => q === NQ - 1 ? land : t0 + (land - 0.12 - t0) * (1 - Math.pow(1 - q / NQ, 1 / 2.5)));
  kick(land, 0.05, 14); flash(land, 0.3, gold ? '#fff2cc' : '#fff');
  const face = gold ? ['#B8862B', '#F2C35B', '#7F5A1B'] : ['#33493A', '#5F7E5F', '#22302A'];
  function bundle(x, y, drop) {
    g.save(); g.translate(0, drop);
    g.fillStyle = face[0]; g.fillRect(x, y, BW, BH);
    g.fillStyle = face[1]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + DD, y - DD * 0.55); g.lineTo(x + BW + DD, y - DD * 0.55); g.lineTo(x + BW, y); g.closePath(); g.fill();
    g.fillStyle = face[2]; g.beginPath(); g.moveTo(x + BW, y); g.lineTo(x + BW + DD, y - DD * 0.55); g.lineTo(x + BW + DD, y + BH - DD * 0.55); g.lineTo(x + BW, y + BH); g.closePath(); g.fill();
    if (!gold) {
      g.fillStyle = '#D9D0B0'; g.fillRect(x + BW * 0.42, y, BW * 0.16, BH);
      g.beginPath(); g.moveTo(x + BW * 0.42, y); g.lineTo(x + BW * 0.42 + DD, y - DD * 0.55); g.lineTo(x + BW * 0.58 + DD, y - DD * 0.55); g.lineTo(x + BW * 0.58, y); g.closePath(); g.fillStyle = '#EAE2C4'; g.fill();
      g.fillStyle = 'rgba(255,255,255,.10)'; for (let q = 1; q < 6; q++) g.fillRect(x, y + q * BH / 6, BW, 1);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + BH - 2, BW, 2);
    }
    else { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 8, y + 5, BW * 0.5, 3); }
    g.restore();
  }
  return (t, tRaw) => {
    g.clearRect(0, 0, W, H);
    seq.forEach(([k, j], q) => {
      const f = (t - ta[q]) * 30; if (f < -4) return;
      const hi = q === NQ - 1 ? 220 : 80, dy = f < 0 ? -hi * (1 - Math.pow((f + 4) / 4, 2)) : 0;
      if (f < -3.99) return;
      bundle(cols[k].x, cols[k].base - (j + 1) * BH, dy);
    });
    rollSlam(B, t, t0, land, 0, v1, v => String(S.prefix || '') + num(dec ? v : Math.round(v), dec) + String(S.suffix || ''), cap);
    if (unit) unit.innerHTML = typed(String(S.unit).toUpperCase(), (t - land - 0.15) * 34, '');
    light.style.opacity = 0.8 + 0.2 * Math.sin(tRaw * 2.2);
  };
};

// ── COMPARE: two quantities as bars in true proportion; each rolls up on its own word, the camera trucks across ──
// a: {label, value, prefix, suffix}, b: {...}, a_at (s), hit (b lands), decimals, unit, ratio (only a ratio the
// narration says, e.g. "TEN TIMES")
MO.compare = function () {
  const A = S.a || {}, Bv = S.b || {}, dec = +S.decimals || 0;
  const va = Math.max(0, +A.value || 0), vb = Math.max(0, +Bv.value || 0), vmax = Math.max(va, vb, 1e-9);
  const cam = rig({ haze: 'rgba(80,80,90,.28)', hy: 70 });
  R.push = [1.02, 1.08]; R.pan = [110, 24, -90, -8]; R.rot = [-0.5, 0.5];
  embers(30, '230,230,240', 30);
  const base = 900, HMAX = 520, BWID = 320;
  el('div', `position:absolute;left:300px;top:${base}px;width:1320px;height:3px;background:rgba(242,240,235,.55)`, cam);
  const side = (o, x, at, isB) => {
    const big = (isB ? vb : va) >= (isB ? va : vb);
    const col = big ? RED : '#D9D6CF';
    const bar = el('div', `position:absolute;left:${x - BWID / 2}px;width:${BWID}px;top:${base}px;height:0;background:linear-gradient(90deg, ${col}, ${big ? '#B51C20' : '#A9A6A0'});box-shadow:0 0 70px ${big ? 'rgba(227,38,43,.40)' : 'rgba(255,255,255,.08)'}, inset 0 7px 0 rgba(255,255,255,.35)`, cam);
    const refl = el('div', `position:absolute;left:${x - BWID / 2}px;width:${BWID}px;top:${base + 4}px;height:0;opacity:.22;background:linear-gradient(180deg, ${col}, rgba(0,0,0,0))`, cam);
    const val = bigText(cam, `font:400 150px/1 'Mo Num';width:${BWID + 500}px;left:${x - BWID / 2 - 250}px`, 'white');
    const lab = el('div', `position:absolute;left:${x - 330}px;width:660px;top:${base + 22}px;text-align:center;font:600 46px/1.1 'Mo Cond';letter-spacing:.12em;color:rgba(242,240,235,.88)`, cam, '');
    return { o, x, at, bar, refl, val, lab, v: isB ? vb : va, big };
  };
  const L = side(A, 700, S.a_at != null ? +S.a_at : Math.max(0.6, HIT - 1.4), false), Rr = side(Bv, 1220, HIT, true);
  const ratio = S.ratio ? tag(cam, String(S.ratio).toUpperCase(), `left:${960 - 170}px;top:120px;padding:8px 26px 4px;font:400 92px/1 'Mo Num';letter-spacing:.04em`, RED, '#fff') : null;
  for (const s of [L, Rr]) { kick(s.at, s.big ? 0.05 : 0.03, s.big ? 12 : 6); if (s.big) flash(s.at, 0.25); }
  return (t, tRaw) => {
    for (const s of [L, Rr]) {                         // the first bar rises from frame 1, the second as the first lands
      const t0 = s === L ? 0.0 : Math.max(L.at - 0.1, s.at - 0.9), u = eo3(seg(t, t0, s.at));
      const h = Math.max(t >= t0 ? 8 : 0, HMAX * s.v / vmax * u);
      s.bar.style.height = h + 'px'; s.bar.style.top = (base - h) + 'px'; s.refl.style.height = (0.35 * h) + 'px';
      s.val.wrap.style.top = (base - h - 175) + 'px';
      rollSlam(s.val, t, t0, s.at, 0, s.v, v => String(s.o.prefix || '') + num(dec ? v : Math.round(v), dec) + String(s.o.suffix || ''), 150);
      s.lab.style.top = (base + 30) + 'px'; s.lab.innerHTML = typed(String(s.o.label || '').toUpperCase(), (t - t0 + 0.3) * 40, '');
    }
    if (ratio) ratio.at(t, HIT + 0.35);
  };
};

// ── LIST: one item per spoken item, flying in on its word; the earlier ones step back; the camera follows ────────
// items: ["...", ...] (2-5), item_at: [s, ...], title (optional, said), hit (the last item)
MO.list = function () {
  // the item being said is BIG in the middle (a giant outlined number behind it); when the next one comes, it flies
  // into the column on the left and the new one slams in from the right — the frame changes on every item
  const items = (S.items || []).slice(0, 5).map(String), n = Math.max(1, items.length);
  const at = items.map((_, i) => (S.item_at && S.item_at[i] != null) ? +S.item_at[i] : 0.35 + i * Math.max(0.5, (HIT - 0.35) / Math.max(1, n - 1)));
  const cam = rig({ haze: 'rgba(90,40,40,.26)', hy: 50 });
  R.push = [1.0, 1.06]; R.rot = [-1.0, 0.6];
  embers(36, '230,230,240', 36);
  const title = S.title ? el('div', `position:absolute;left:0;width:1920px;top:110px;text-align:center;font:600 46px 'Mo Cond';letter-spacing:.34em;color:rgba(242,240,235,.7)`, cam, '') : null;
  const ghost = el('div', `position:absolute;left:0;width:1920px;top:150px;text-align:center;font:400 760px/1 'Mo Num';color:transparent;-webkit-text-stroke:4px rgba(227,38,43,.55);letter-spacing:-.02em`, cam, '01');
  const sweep = el('div', `position:absolute;left:0;top:${540 + 120}px;height:8px;width:0;background:${RED}`, cam);
  const rows = items.map((txt, i) => {
    const box = el('div', `position:absolute;left:0;top:0;white-space:nowrap;transform-origin:0 50%`, cam);
    const num_ = el('span', `font:700 64px 'Mo Mono';color:${RED};margin-right:34px;vertical-align:middle`, box, String(i + 1).padStart(2, '0'));
    const tx = el('span', `font:400 200px/1 'Mo Num';color:${INK};text-shadow:0 12px 0 rgba(0,0,0,.9);text-transform:uppercase;vertical-align:middle`, box, esc(txt));
    let fs = 200; while (box.offsetWidth > (n > 1 ? 1300 : 1640) && fs > 80) { fs -= 10; tx.style.fontSize = fs + 'px'; }
    return { box, tx, w: box.offsetWidth, h: box.offsetHeight };
  });
  at.forEach((a, i) => kick(a, i === n - 1 ? 0.05 : 0.028, i === n - 1 ? 14 : 8));
  flash(at[n - 1], 0.22);
  const colY = i => 300 + i * 80, colX = 110, colW = 380;
  return (t, tRaw) => {
    if (title) title.innerHTML = typed(String(S.title).toUpperCase(), (t - 0.05) * 40, '');
    let cur = 0; for (let i = 0; i < n; i++) if (t >= at[i] - 0.18) cur = i;
    ghost.textContent = String(cur + 1).padStart(2, '0');
    const gf = (t - (at[cur] - 0.18)) * 30, [gs, ga] = gf < 0 ? [1.1, 0.4] : kf([[0, 1.25, 0.2], [3, 1.0, 1], [40, 0.96, 1]], gf);
    ghost.style.transform = `scale(${gs.toFixed(3)}) translateX(${(-30 * Math.sin(tRaw * 0.6)).toFixed(1)}px)`; ghost.style.opacity = ga;
    rows.forEach((r, i) => {
      const inP = eo5(seg(t, at[i] - 0.18, at[i] + 0.04));                 // slam in from the right on its word
      const outP = i < n - 1 ? SMS(seg(t, at[i + 1] - 0.2, at[i + 1] + 0.12)) : 0;   // to the column when the next comes
      const cx = n > 1 ? 1060 : 960, bx = Math.min(1880 - r.w, Math.max(colX + colW + 40, cx - r.w / 2)), by = 540 - r.h / 2 + 20;
      const colS = Math.min(0.3, colW / r.w);
      const x = lerp(bx + 1300 * (1 - inP), colX, outP), y = lerp(by, colY(i), outP), sc = lerp(1, colS, outP);
      r.box.style.opacity = t < at[i] - 0.18 ? 0 : (outP > 0 ? 1 - 0.45 * outP : 1);
      r.box.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(4)}) skewX(${(-16 * (1 - inP)).toFixed(2)}deg)`;
      r.box.style.filter = inP < 0.85 ? `blur(${(8 * (1 - inP)).toFixed(1)}px)` : '';
    });
    const sp = eo3(seg(t, at[cur] + 0.02, at[cur] + 0.32));
    sweep.style.width = (sp * 1200) + 'px'; sweep.style.left = (360 + 1200 * 0 - 0) + 'px'; sweep.style.opacity = 1 - 0.6 * seg(t, at[cur] + 0.5, at[cur] + 1.2);
  };
};

// ── DATE: a year/date lands on its word — film (y06 date card: blur-in, tracking closes, sharp ON the year), ink (a
// rubber stamp slams onto paper, the typed place above it), led (segment digits flicker on, then lock) ───────────
// text ("MAY 6, 1937" | "1937" | "7:25"), place ("LAKEHURST, NEW JERSEY"), sub ("PM"), variant film|ink|led, hit
function inkMask() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { x.globalAlpha = 0.25 + 0.75 * hn(i, 71); x.beginPath(); x.arc(hn(i, 72) * 256, hn(i, 73) * 256, 0.5 + 2.6 * Math.pow(hn(i, 74), 3), 0, 7); x.fill(); }
  return c.toDataURL();
}
const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
function segPath(g, ch, x, y, w, h, lit, off) {
  const t = w * 0.17, m = t * 0.18, hh = h / 2;
  const S_ = { a: [x + m, y, w - 2 * m, 0], d: [x + m, y + h, w - 2 * m, 0], g: [x + m, y + hh, w - 2 * m, 0], f: [x, y + m, 0, hh - 2 * m], b: [x + w, y + m, 0, hh - 2 * m], e: [x, y + hh + m, 0, hh - 2 * m], c: [x + w, y + hh + m, 0, hh - 2 * m] };
  for (const k of 'abcdefg') {
    const [sx, sy, dx, dy] = S_[k], on = (SEG[ch] || '').includes(k);
    g.fillStyle = on && lit ? AMB : off; g.beginPath();
    if (dy === 0) { g.moveTo(sx, sy); g.lineTo(sx + t / 2, sy - t / 2); g.lineTo(sx + dx - t / 2, sy - t / 2); g.lineTo(sx + dx, sy); g.lineTo(sx + dx - t / 2, sy + t / 2); g.lineTo(sx + t / 2, sy + t / 2); }
    else { g.moveTo(sx, sy); g.lineTo(sx + t / 2, sy + t / 2); g.lineTo(sx + t / 2, sy + dy - t / 2); g.lineTo(sx, sy + dy); g.lineTo(sx - t / 2, sy + dy - t / 2); g.lineTo(sx - t / 2, sy + t / 2); }
    g.closePath(); g.fill();
  }
}
MO.date = function () {
  const v = S.variant || 'film', text = String(S.text || '').toUpperCase(), land = HIT;
  if (v === 'ink') {
    // a sheet on a dark desk; the place typed at its head; the rubber stamp SLAMS onto it on the date
    const cam = rig({ bg: '#15110D', grain: 0.36, haze: 'rgba(255,230,190,.10)', hy: 45 });
    R.push = [1.0, 1.07]; R.rot = [1.0, -0.5]; R.drift = 0.7;
    const sheet = el('div', `position:absolute;left:250px;top:70px;width:1420px;height:950px;background:#E8E1CE;transform:rotate(-1.2deg);box-shadow:0 40px 90px rgba(0,0,0,.75), inset 0 0 120px rgba(120,95,60,.22)`, cam);
    el('div', `position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(120,100,70,.05) 0 2px, rgba(0,0,0,0) 2px 7px)`, sheet);
    for (const y of [200, 236, 760, 796]) el('div', `position:absolute;left:110px;right:110px;top:${y}px;height:2px;background:rgba(60,50,40,.16)`, sheet);
    const place = el('div', `position:absolute;left:0;right:0;top:120px;text-align:center;font:700 54px 'Mo Type';letter-spacing:.06em;color:#2A2622`, sheet, '');
    const st = el('div', `position:absolute;left:50%;top:330px;transform:translateX(-50%);padding:30px 64px 20px;border:14px solid #B3201E;border-radius:20px;color:#B3201E;font:400 ${text.length > 8 ? 168 : 230}px/1 'Mo Stamp';white-space:nowrap;-webkit-mask-image:url(${inkMask()});-webkit-mask-size:256px`, sheet, esc(text));
    const sub = S.sub ? el('div', `position:absolute;left:0;right:0;top:700px;text-align:center;font:400 42px 'Mo Type';letter-spacing:.2em;color:#4A443D`, sheet, '') : null;
    kick(land, 0.06, 22); sparks(land, 960, 560, 22, 'rgba(179,32,30,.85)', 700);
    return (t) => {
      place.innerHTML = t < 0.05 ? '' : typed(String(S.place || '').toUpperCase(), (t - 0.05) * 30, '▌');
      const f = (t - land) * 30, [sc, a] = f < 0 ? [2.1, 0] : kf([[0, 1.9, 0.6], [1, 1.25, 1], [2, 0.97, 1], [3, 1.0, 1]], f);
      st.style.opacity = a; st.style.transform = `translateX(-50%) rotate(-5deg) scale(${sc.toFixed(3)})`;
      if (sub) sub.innerHTML = t < land + 0.3 ? '' : typed(String(S.sub).toUpperCase(), (t - land - 0.3) * 30, '');
      sheet.style.transform = `rotate(${(-1.2 + 0.3 * Math.sin(t * 0.8)).toFixed(3)}deg) translateY(${(f >= 0 && f < 3 ? 6 : 0)}px)`;
    };
  }
  if (v === 'led') {
    const cam = rig({ haze: 'rgba(255,150,0,.10)', hy: 50 });
    R.push = [1.0, 1.08]; R.rot = [-0.8, 0.4];
    const [, g] = cnv(cam), [glowEl, gg] = cnv(cam, W, H, 'filter:blur(24px);opacity:1;mix-blend-mode:screen');
    const scan = el('div', 'position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, rgba(0,0,0,0) 2px 5px)', cam);
    const chars = text.replace(/[^0-9:.\- ]/g, '').split('');
    const DW = 220, DH = 380, GAP = 52, colW = 110;
    const wide = chars.reduce((a, c) => a + (c === ':' || c === '.' ? colW : DW + GAP), -GAP);
    const x0 = 960 - wide / 2, y0 = 290;
    const bez = el('div', `position:absolute;left:${x0 - 80}px;top:${y0 - 70}px;width:${wide + 160}px;height:${DH + 140}px;border-radius:26px;background:linear-gradient(180deg,#141210,#0A0908);box-shadow:inset 0 0 0 3px #26221B, inset 0 30px 60px rgba(255,255,255,.04), 0 30px 80px rgba(0,0,0,.8)`, cam);
    cam.insertBefore(bez, cam.firstChild);
    const on = chars.map((_, i) => land - 0.75 + 0.6 * hn(i, 81));
    const sub = S.sub || S.place ? el('div', `position:absolute;left:0;width:1920px;top:${y0 + DH + 110}px;text-align:center;font:700 46px 'Mo Mono';letter-spacing:.3em;color:${AMB};text-shadow:0 0 18px rgba(255,176,0,.6)`, cam, '') : null;
    kick(land, 0.05, 12); flash(land, 0.25, '#ffcc66');
    return (t, tRaw) => {
      g.clearRect(0, 0, W, H); gg.clearRect(0, 0, W, H);
      let x = x0;
      chars.forEach((c, i) => {
        const fi = Math.floor((t - on[i]) * 30), lit = t >= land || (fi >= 0 && (fi > 5 || [1, 0, 1, 1, 0, 1][fi]));
        if (c === ':' || c === '.') {
          const blink = t < land || Math.floor(tRaw * 2) % 2 === 0;
          for (const yy of (c === ':' ? [y0 + DH * 0.3, y0 + DH * 0.72] : [y0 + DH])) for (const G of [g, gg]) { G.fillStyle = lit && blink ? AMB : 'rgba(255,176,0,.07)'; G.fillRect(x + colW / 2 - 20, yy - 20, 40, 40); }
          x += colW; return;
        }
        segPath(g, c, x, y0, DW, DH, lit, 'rgba(255,176,0,.07)'); segPath(gg, c, x, y0, DW, DH, lit, 'rgba(0,0,0,0)');
        x += DW + GAP;
      });
      if (sub) sub.textContent = t >= land + 0.15 ? String(S.sub || S.place).toUpperCase() : '';
      scan.style.transform = `translateY(${(tRaw * 40 % 5).toFixed(1)}px)`;
    };
  }
  // film: big condensed caps, defocused -> sharp ON the year, tracking closing in (y06 186-191.5)
  const cam = rig({ dim: 0.45, haze: 'rgba(120,90,60,.25)', hy: 45, sat: 0.6 });
  R.push = [1.0, 1.07]; R.rot = [0.3, -0.3];
  embers(40, '255,220,180', 22);
  const leak = el('div', 'position:absolute;inset:-20%;background:radial-gradient(ellipse 40% 50% at 20% 30%, rgba(255,140,60,.22), rgba(0,0,0,0) 70%);mix-blend-mode:screen', cam);
  const cap = text.length > 12 ? 190 : 250;
  const big = el('div', `position:absolute;left:0;width:1920px;top:${540 - cap * 0.62}px;text-align:center;white-space:nowrap;font:400 ${cap}px/1 'Mo Num';color:${INK};text-shadow:0 10px 0 rgba(0,0,0,.85),0 16px 40px rgba(0,0,0,.6)`, cam, esc(text));
  const rule = el('div', `position:absolute;top:${540 + cap * 0.5}px;height:5px;left:960px;width:0;background:${RED}`, cam);
  const place = S.place ? el('div', `position:absolute;left:0;width:1920px;top:${540 + cap * 0.5 + 28}px;text-align:center;font:500 46px 'Mo Cond';letter-spacing:.32em;color:rgba(242,240,235,.9)`, cam, '') : null;
  kick(land, 0.03, 8);
  return (t, tRaw) => {
    const p = SMS(seg(t, 0, land));
    big.style.filter = t < land ? `blur(${(24 * (1 - p)).toFixed(1)}px)` : '';
    big.style.letterSpacing = (0.22 * (1 - p) + 0.01).toFixed(3) + 'em';
    big.style.opacity = seg(t, 0, 0.35);
    const rp = eo3(seg(t, land + 0.1, land + 0.5)); rule.style.width = 640 * rp + 'px'; rule.style.left = (960 - 320 * rp) + 'px';
    if (place) place.innerHTML = typed(String(S.place).toUpperCase(), (t - land - 0.15) * 36, '');
    leak.style.transform = `translate(${(220 * Math.sin(tRaw * 0.5)).toFixed(1)}px,${(60 * Math.sin(tRaw * 0.8)).toFixed(1)}px)`;
    leak.style.opacity = 0.6 + 0.4 * Math.sin(tRaw * 1.7);
  };
};

// ── QUOTE / DOC: a page flies in and lands; the camera travels to the line being said; a highlighter sweeps it ─────
// An honest sheet (no outlet masthead, no invented dateline): text = the words the narration quotes or states,
// source = only a source the narration names. text, key (the phrase to light), key_at (s), key_dur (s), source,
// style typed|serif, hit (the page lands)
MO.quote = function () {
  const cam = rig({ haze: 'rgba(90,90,100,.30)', hy: 45 });
  R.push = [1.0, 1.04]; R.rot = [-0.4, 0.3]; R.drift = 0.6;
  embers(26, '235,235,240', 20);
  const serif = S.style === 'serif', land = HIT;
  const persp = el('div', 'position:absolute;inset:0;perspective:2200px;perspective-origin:50% 30%', cam);
  const page = el('div', `position:absolute;left:330px;top:70px;width:1260px;min-height:640px;padding:130px 120px 120px;background:#EDE7D8;color:#24211D;transform-origin:50% 0%;box-shadow:0 50px 90px rgba(0,0,0,.7)`, persp);
  el('div', 'position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(120,100,70,.045) 0 2px, rgba(0,0,0,0) 2px 6px), radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.35), rgba(0,0,0,0) 60%)', page);
  const txt = String(S.text || ''), key = String(S.key || '');
  const nW = String(S.text || '').split(/\s+/).length;
  if (serif) el('div', `position:absolute;left:54px;top:-30px;font:700 300px/1 'Mo Serif';color:${RED}`, page, '“');
  const body = el('div', `position:relative;font:${serif ? `italic 500 ${nW <= 14 ? 82 : 64}px/1.38 'Mo Serif'` : `400 ${nW <= 18 ? 60 : 50}px/1.6 'Mo Type'`}`, page);
  const words = txt.split(/\s+/).filter(Boolean), kw = key.split(/\s+/).filter(Boolean);
  let k0 = -1;
  const fold = w => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  for (let i = 0; i + kw.length <= words.length && kw.length; i++) if (kw.every((w, j) => fold(words[i + j]) === fold(w))) { k0 = i; break; }
  const spans = words.map((w, i) => el('span', '', body, esc(w + (serif && i === words.length - 1 ? '”' : '')) + ' '));
  const keys = k0 < 0 ? [] : spans.slice(k0, k0 + kw.length);
  keys.forEach(s => { s.style.backgroundImage = 'linear-gradient(#F5E14B,#F5E14B)'; s.style.backgroundRepeat = 'no-repeat'; s.style.backgroundPosition = '0 62%'; s.style.backgroundSize = '0% 76%'; });
  const src = S.source ? el('div', `position:relative;margin-top:56px;font:600 40px 'Mo Cond';letter-spacing:.16em;color:#6B6358`, page, '— ' + esc(String(S.source).toUpperCase())) : null;
  const kAt = S.key_at != null ? +S.key_at : land + 0.5, kDur = Math.max(0.4, +S.key_dur || 0.9);
  kick(land, 0.03, 10); sparks(land, 960, 1000, 14, 'rgba(255,255,255,.6)', 500);
  let ky = null, py0 = 70;
  return (t, tRaw) => {
    if (ky === null) { ky = keys.length ? keys[0].offsetTop + 130 + 40 : 400; py0 = Math.max(40, (1080 - page.offsetHeight) / 2); page.style.top = py0 + 'px'; }
    const u = eo3(seg(t, 0, land)), fly = 1 - u;
    const zoom = SMS(seg(t, land + 0.1, Math.max(land + 0.9, kAt + 0.3)));
    const sc = 0.94 + 0.24 * zoom + 0.03 * seg(t, land, D);
    const ty = 700 * fly - zoom * (ky * 1.18 - 540 + py0);
    page.style.transform = `translateY(${ty.toFixed(1)}px) rotateX(${(58 * fly).toFixed(2)}deg) rotateZ(${(-7 * fly - 1.2).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    page.style.opacity = seg(t, 0, 0.12);
    keys.forEach((s, j) => { const p = seg(t, kAt + j * kDur / keys.length, kAt + (j + 1) * kDur / keys.length); s.style.backgroundSize = `${(p * 100).toFixed(1)}% 76%`; });
  };
};

// ── MAPPING: a dark map snippet, the camera hops in, the region lights, rings ping out of the place on its name ────
// geo (moments.py: {w, h, land:[[x,y,...]], lines:[[...]], hi:[[...]], pt:[x,y]} in map pixels), label, sub, hit
MO.mapping = function () {
  const G = S.geo || { w: 3200, h: 1800, land: [], lines: [], hi: [], pt: [1600, 900] };
  const cam = rig({ bg: '#07090C', haze: 'rgba(40,60,80,.25)', hy: 50 });
  R.push = [1.0, 1.03]; R.drift = 0.5;
  const box = el('div', `position:absolute;left:0;top:0;width:${G.w}px;height:${G.h}px;transform-origin:0 0`, cam);
  const [, m] = cnv(box, G.w, G.h);
  m.fillStyle = '#05070A'; m.fillRect(0, 0, G.w, G.h);
  m.strokeStyle = 'rgba(120,140,160,.07)'; m.lineWidth = 2;
  for (let x = 0; x < G.w; x += 160) { m.beginPath(); m.moveTo(x, 0); m.lineTo(x, G.h); m.stroke(); }
  for (let y = 0; y < G.h; y += 160) { m.beginPath(); m.moveTo(0, y); m.lineTo(G.w, y); m.stroke(); }
  const poly = (a, ctx) => { ctx.beginPath(); for (const r of a) { ctx.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]); ctx.closePath(); } };
  poly(G.land || [], m); const lg = m.createLinearGradient(0, 0, 0, G.h); lg.addColorStop(0, '#323943'); lg.addColorStop(1, '#232830');
  m.fillStyle = lg; m.fill('evenodd'); m.strokeStyle = '#59616E'; m.lineWidth = 3; m.stroke();
  m.strokeStyle = 'rgba(150,160,175,.22)'; m.lineWidth = 1.5; m.setLineDash([8, 7]);
  for (const r of G.lines || []) { m.beginPath(); m.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) m.lineTo(r[i], r[i + 1]); m.stroke(); }
  m.setLineDash([]);
  const [hiC, h] = cnv(box, G.w, G.h); poly(G.hi || [], h); h.fillStyle = 'rgba(227,38,43,.30)'; h.fill('evenodd'); h.strokeStyle = RED; h.lineWidth = 6; h.stroke();
  hiC.style.opacity = 0;
  const [px, py] = G.pt, land = HIT;
  const pin = el('div', `position:absolute;left:${960 - 15}px;top:${540 - 15}px;width:30px;height:30px;border-radius:50%;background:${RED};box-shadow:0 0 0 7px rgba(255,255,255,.95),0 0 40px rgba(227,38,43,.9)`, cam);
  const [, pc] = cnv(cam);
  const lead = el('div', `position:absolute;left:975px;top:540px;height:3px;width:0;background:#fff;transform-origin:0 0;transform:rotate(-32deg)`, cam);
  const lab = el('div', `position:absolute;left:1210px;top:330px;padding:14px 30px 10px 34px;background:rgba(8,9,11,.82);border-left:10px solid ${RED};white-space:nowrap`, cam);
  const l1 = el('div', `font:700 70px/1.05 'Mo Cond';letter-spacing:.08em;color:#fff`, lab, '');
  const l2 = S.sub ? el('div', `font:700 30px 'Mo Mono';letter-spacing:.14em;color:rgba(242,240,235,.75);margin-top:6px`, lab, '') : null;
  kick(land, 0.04, 10); flash(land, 0.2, '#ffd6d0');
  return (t, tRaw) => {
    const p = SMS(seg(t, 0, land + 0.15));
    const s = lerp(0.8, 1.2, p) + 0.12 * t / D;          // + a linear creep: the hop never settles to a stop
    const ox = lerp(-200, 0, p), oy = lerp(110, 0, p);
    box.style.transform = `translate(${(960 + ox - px * s).toFixed(1)}px,${(540 + oy - py * s).toFixed(1)}px) scale(${s.toFixed(4)})`;
    hiC.style.opacity = (0.35 + 0.65 * seg(t, land - 0.5, land)) * seg(t, land - 0.9, land - 0.5) + (t >= land ? 0.06 * Math.sin(tRaw * 6) : 0);
    const pf = (t - land) * 30, [ps, pa] = pf < 0 ? [0, 0] : kf([[0, 2.2, 0.4], [1, 1.4, 1], [2, 0.9, 1], [3, 1, 1]], pf);
    pin.style.opacity = pa; pin.style.transform = `translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(${ps.toFixed(3)})`;
    pc.clearRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) {                       // a ping every 0.55 s from the landing on: always something moving
      const u = ((t - land - k * 0.55) % 2.2) / 1.1; if (t < land + k * 0.55 || u > 1 || u < 0) continue;
      pc.strokeStyle = `rgba(227,38,43,${(1 - u).toFixed(3)})`; pc.lineWidth = 6 * (1 - u) + 1;
      pc.beginPath(); pc.arc(960 + ox, 540 + oy, 20 + 260 * eo3(u), 0, 7); pc.stroke();
    }
    const lp = eo3(seg(t, land + 0.1, land + 0.38));
    lead.style.width = (lp * 300) + 'px'; lead.style.opacity = lp > 0 ? 1 : 0;
    lab.style.opacity = seg(t, land + 0.3, land + 0.36); lab.style.clipPath = `inset(0 ${(100 - 100 * eo3(seg(t, land + 0.3, land + 0.6))).toFixed(1)}% 0 0)`;
    l1.textContent = String(S.label || '').toUpperCase();
    if (l2) l2.innerHTML = typed(String(S.sub).toUpperCase(), (t - land - 0.55) * 30, '');
  };
};

// ── KINETIC: the thesis line, word by word ON the voice; the key word lands red with the biggest hit ──────────────
// line: [the words as said] ("words" is the director's anchor field, kits._normalise drops it), word_at: [s...],
// key: [indices], hit (the key word, or the last), sub (optional small line)
MO.kinetic = function () {
  const words = (Array.isArray(S.line) ? S.line : String(S.line || S.text || '').split(/\s+/)).filter(Boolean).map(w => String(w).toUpperCase());
  const n = words.length, keyset = new Set((S.key || []).map(Number));
  const at = words.map((_, i) => (S.word_at && S.word_at[i] != null) ? +S.word_at[i] - 0.067 : 0.1 + i * 0.28);
  const cam = rig({ haze: 'rgba(110,30,30,.22)', hy: 50 });
  R.push = [1.0, 1.09]; R.rot = [-1.6, 0.8];
  embers(40, '240,240,245', 26);
  const beam = el('div', 'position:absolute;left:-60%;top:-40%;width:60%;height:180%;background:linear-gradient(90deg, rgba(255,60,50,0), rgba(255,60,50,.16), rgba(255,60,50,0));transform:rotate(18deg);mix-blend-mode:screen', cam);
  const block = el('div', 'position:absolute;left:160px;width:1600px;top:0;text-align:center', cam);
  let F = 220;
  const KS = 1.38, k0 = keyset.size ? Math.min(...keyset) : -1;   // the key word(s): their own line, 1.38x bigger
  const spans = words.map((w, i) => { if (i === k0 && i > 0) el('br', '', block);
    return el('span', `display:inline-block;margin:0 .14em;font:400 ${Math.round(F * (keyset.has(i) ? KS : 1))}px/1.02 'Mo Num';color:${INK};text-shadow:0 10px 0 rgba(0,0,0,.9)`, block, esc(w)); });
  const fitLines = () => { const tops = new Set(spans.map(s => s.offsetTop)); return tops.size; };
  const wide = () => spans.some(s => s.offsetWidth > 1600);
  while ((fitLines() > 3 || block.offsetHeight > 860 || wide()) && F > 90) { F -= 12; spans.forEach((s, i) => s.style.fontSize = Math.round(F * (keyset.has(i) ? KS : 1)) + 'px'); }
  const BH0 = block.offsetHeight;
  block.style.top = (540 - BH0 / 2 - 10) + 'px';
  const pos = spans.map(s => [s.offsetLeft, s.offsetTop, s.offsetWidth, s.offsetHeight]);
  spans.forEach((s, i) => { s.style.position = 'absolute'; s.style.left = pos[i][0] + 'px'; s.style.top = pos[i][1] + 'px'; s.style.margin = '0'; s.style.transformOrigin = '50% 60%'; });
  block.querySelectorAll('br').forEach(b => b.remove());
  const ghosts = spans.map((s, i) => { const gh = el('span', s.style.cssText, block, esc(words[i]));
    gh.style.color = 'transparent'; gh.style.textShadow = 'none'; gh.style.webkitTextStroke = '2px rgba(242,240,235,.16)';
    block.insertBefore(gh, block.firstChild); return gh; });
  const bars = spans.map((s, i) => keyset.has(i) ? el('div', `position:absolute;left:${pos[i][0]}px;top:${pos[i][1] + pos[i][3] * 0.9}px;height:${Math.round(F * KS * 0.07)}px;width:0;background:${RED}`, block) : null);
  const last = keyset.size ? Math.max(...keyset) : n - 1;
  at.forEach((a, i) => kick(a, i === last ? 0.07 : 0.022, i === last ? 18 : 5));
  flash(at[last], 0.35, '#ffd0c8');
  const sub = S.sub ? el('div', `position:absolute;left:0;width:1920px;top:${540 + BH0 / 2 + 30}px;text-align:center;font:600 40px 'Mo Cond';letter-spacing:.3em;color:rgba(242,240,235,.7)`, cam, '') : null;
  return (t, tRaw) => {
    spans.forEach((s, i) => {
      const f = (t - at[i]) * 30;
      if (f < 0) { s.style.opacity = 0; return; }
      const [sc, a, bl] = kf(i === last ? SLAM : [[0, 1.55, 0.3, 8], [1, 1.12, 1, 2], [2, 0.98, 1, 0], [3, 1, 1, 0]], f);
      s.style.opacity = a; s.style.transform = `scale(${sc.toFixed(4)})`; s.style.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : '';
      s.style.color = f < 1.5 ? '#FFFFFF' : keyset.has(i) ? RED : INK;
      if (keyset.has(i)) s.style.textShadow = f < 1.5 ? '0 10px 0 rgba(0,0,0,.9)' : `0 10px 0 rgba(0,0,0,.9), 0 0 50px rgba(227,38,43,.55)`;
      if (bars[i]) bars[i].style.width = (eo3(seg(t, at[i] + 0.05, at[i] + 0.3)) * pos[i][2]) + 'px';
    });
    ghosts.forEach((g, i) => { const f = (t - at[i]) * 30; g.style.opacity = f < 0 ? (0.55 + 0.45 * seg(t, 0, 0.3)).toFixed(3) : 0;
      g.style.transform = `translateY(${(6 * Math.sin(tRaw * 2 + i)).toFixed(1)}px)`; });
    beam.style.transform = `translateX(${((tRaw * 520) % 3400).toFixed(1)}px) rotate(18deg)`;
    if (sub) sub.innerHTML = typed(String(S.sub).toUpperCase(), (t - at[n - 1] - 0.3) * 34, '');
  };
};
