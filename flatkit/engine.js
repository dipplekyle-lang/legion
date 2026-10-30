// ═══ Flat engine: 2D vector motion design for vertical explainer Shorts (1080x1920), drawn in code ══════════════════════
// Rendered at 60 fps (the references are true 60 fps: a new drawing every frame while anything moves). FPS = 30 below is
// the TIMING unit the rules were measured in: '4 frames' means 4/30 s; between those, every 60 fps frame is drawn fresh.
// Contract with Legion's renderer: window.render(t) draws the frame at t seconds into the ONE <canvas id="c">;
// window.ready = true once fonts and words.json are in (start() does both). Picture only: Legion adds captions, voice, music, sound.
//
// A Short = SHOTS, a list of shot(t0, t1, draw, opts). draw(g, s) paints one frame of that shot:
//   g = the 2D context, s = the shot clock: s.t seconds since the shot started, s.f frames since, s.T global seconds,
//   s.k(t0, kind, o) = an entrance state (see ENTER), s.dur = shot length. Times inside a shot are SHOT seconds.
// opts.trans = how this shot comes IN: {type, dur, dir, x, y} (types below); default a hard cut.
//
// MEASURED rules this engine follows (from the style study; the style's SPEC.md is the law, these are its numbers):
// - a move peaks by frame ~3, then every frame covers ~16 % of the way still left (decay 0.84/frame): fast in, soft landing;
// - entrances: 'snap' 4 frames, 'slide' 10 frames over ~8 % of the width, 'pop' / 'grow' 12 frames; overshoot is RARE
//   (o.over = 0.08 on at most 1 entrance in 5); items in a group come in ~15 frames apart (STAGGER);
// - the camera is LOCKED during holds: life comes from WHOLE things moving inside the frame, all the time (alive(), person's idle,
//   drifting layers): ~12 % of the frame moving in any frame, a dead frame almost never (measured v2, see alive());
// - a move's fastest frame lands ON its word (hit(), s.hit()); one clear move per idea (~2.3 moves a second), ~0.3 s long;
// - idea changes (measured v2): 2 in 3 happen INSIDE a shot (rebuild(), carry, pan, bars, reveal, into); plain cuts ~1 in 4;
// - older shot-change notes: 'cut' (on a sentence start), 'whip' 0.13-0.35 s with blur along the move, 'push' ~0.4 s,
//   'zoom' (dive into a point, e.g. a zoom bubble, and out into the next shot) ~0.45 s, 'iris' ~0.4 s, 'dissolve' ~0.2 s,
//   'flash' (one white frame, once per Short at most).
// - flat vector, NO outlines on characters and props: a fill, one darker same-hue shading crescent, sometimes a light strip.
'use strict';
const W = 1080, H = 1920, FPS = 30;
const CV = document.getElementById('c');
const G = CV.getContext('2d');
let WORDS = [], SHOTS = [];
const STAGGER = 15 / FPS;
const DECAY = 0.84;

// ── numbers ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rng = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const out = f => f <= 0 ? 0 : 1 - Math.pow(DECAY, f);            // the measured landing: share of the way covered after f frames
const outT = (t, t0) => out((t - t0) * FPS);
// share of the way at time t of a move from t0 that should look "done" after d seconds (rescaled so it ends at 1, no dead stop)
const ease = (t, t0, d) => glide((t - t0) / Math.max(0.05, d * 1.4));   // looks done after d (95 %), settles by 1.4 d
const io = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;   // camera whips: accelerate, then land soft
// MEASURED at 60 fps (348 moves, 10 Shorts, optical flow): a move speeds up softly, peaks at ~38 % of its length (median), then
// lands on a long soft tail; only a third start at full speed. Median 0.3-0.4 s. glide(p) is that curve (speed ~ x^1.6 (1-x)^2.6,
// zero speed at both ends: no jolt at the start, no dead stop); popc(p) is the quicker third (peak at ~22 %) for scale pops.
const _curve = (a, b) => { const N = 256, v = [0]; let c = 0; for (let i = 1; i <= N; i++) { const x = (i - 0.5) / N; c += Math.pow(x, a) * Math.pow(1 - x, b); v.push(c); }
  return p => { const x = clamp(p) * N, i = Math.floor(x); return i >= N ? 1 : lerp(v[i], v[i + 1], x - i) / c; }; };
const glide = _curve(1.6, 2.6), popc = _curve(0.8, 2.8);
const lands = _curve(0.9, 3.0);   // linked shot changes (measured v2): fast in (peak at ~23 %), a long soft landing
// measured frame by frame (347 moves): ~1 travel in 4 and ~1 pop in 3 OVERSHOOT by ~12 % of the travel and settle back ONCE (never a
// wobble); ~1 travel in 5 WINDS UP first, pulling back ~10 % of its travel. Use them on those shares, not on every move.
const glideOver = (p, amt = 0.12) => p <= 0 ? 0 : p >= 1 ? 1 : p < 0.62 ? (1 + amt) * glide(p / 0.62) : 1 + amt - amt * glide((p - 0.62) / 0.38);
const windUp = (p, amt = 0.1) => p <= 0 ? 0 : p >= 1 ? 1 : p < 0.2 ? -amt * glide(p / 0.2) : lerp(-amt, 1, glide((p - 0.2) / 0.8));
// WEIGHT (o.mass, 1 = normal): a heavy thing (mass 1.5-2.5) starts slowly and lands slowly (its speed peaks later and the move takes
// longer, MOVE stretches d by sqrt(mass)); a light one (0.4-0.8) jumps off and overshoots a little more (it bounces). Never both
// windup and mass on a light thing: light things don't wind up.
const heavyc = _curve(2.4, 2.4);
const massed = (p, m) => m >= 1 ? lerp(glide(p), heavyc(p), clamp((m - 1) / 1.2)) : glideOver(p, 0.12 * clamp((1 - m) / 0.6) + 0.02);
const shaped = (p, o = {}) => o.windup ? windUp(p, o.windup === true ? 0.1 : o.windup) : o.over ? glideOver(p, o.over === true ? 0.12 : o.over) : o.mass && o.mass !== 1 ? massed(p, o.mass) : glide(p);
const wobble = (t, sp = 1, seed = 0) => Math.sin(t * 2.1 * sp + seed) * 0.6 + Math.sin(t * 3.7 * sp + seed * 1.7) * 0.4;

// ── words: find when a word is said (seconds, global) ───────────────────────────────────────────────────────────────
function wordAt(word, after = 0) {
  const w = String(word).toLowerCase().replace(/[^a-z0-9%$']/g, '');
  const hit = WORDS.find(x => x[0] >= after - 0.01 && String(x[2]).toLowerCase().replace(/[^a-z0-9%$']/g, '') === w);
  return hit ? hit[0] : after;
}
// TIMING (measured v2, 16 references at 60 fps, optical flow): a move's FASTEST frame lands on the word that names it (median
// 0.03 s before the word starts, p25-p75 -0.11..+0.06), so it STARTS about 0.1 s before the word. Never guess a lead by hand
// (the Moon build subtracted 0.1-0.35 s here and there: its moves fired early and read as loose). hit(word, kind, o) = the global
// start time that puts kind's peak on the word: 'snap' peaks 1 frame in, 'pop' 2.7 frames (0.09 s), 'slide' 0.14 s, 'grow' 0.15 s,
// 'move' (MOVE / ease, o.d) 0.53 d, 'along' (o.d) 0.38 d. In a shot: s.hit(word, kind, o) and s.at(word) give SHOT seconds.
const PEAK = { snap: 0.033, pop: 0.089, slide: 0.139, grow: 0.152, ring: 0.06, wipe: 0.05 };
// STRESS: when the voice was measured, each word also carries [stress 0..1, beat] (beat = when its loudest syllable starts). With
// MOTION.syllable (on for styles whose card sets it) hit() lands the peak on that syllable, not the word's first sound
// ("eNORmous": the pop hits "NOR"). stressed(from, to, min) = the words the voice leans on between two global times, loudest first,
// as {t, word, stress}: put the shot's BIG hits on those, the small ones on the rest. Without the data both fall back to word starts.
function beatAt(word, after = 0) { const t = wordAt(word, after), x = WORDS.find(y => Math.abs(y[0] - t) < 1e-4); return MOTION.syllable && x && x[4] != null ? x[4] : t; }
function stressed(from = 0, to = 1e9, min = 0.6) { return WORDS.filter(x => x[0] >= from && x[0] < to && (x[3] ?? 0) >= min && String(x[2]).replace(/[^a-z0-9]/gi, '').length > 2)
  .sort((a, b) => b[3] - a[3]).map(x => ({ t: MOTION.syllable && x[4] != null ? x[4] : x[0], word: x[2], stress: x[3] })); }
function hit(word, kind = 'pop', o = {}) { const pk = (kind === 'move' ? 0.53 * (o.d ?? 0.45) * Math.sqrt(o.mass || 1) : kind === 'along' ? 0.38 * (o.d ?? 0.6) : PEAK[kind] ?? 0.09);
  return beatAt(word, o.after ?? 0) - pk - 0.02; }

// ── colour ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l]; }
function hsl2hex(h, s, l) { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join(''); }
const dk = (c, k = 0.13) => { const [h, s, l] = rgb2hsl(hex2rgb(c)); return hsl2hex((h - 0.012 + 1) % 1, clamp(s + 0.08), clamp(l - k)); };   // the shading crescent: same hue, darker, a touch richer
const lt = (c, k = 0.12) => { const [h, s, l] = rgb2hsl(hex2rgb(c)); return hsl2hex(h, s, clamp(l + k)); };
const rgba = (c, a) => { const [r, g, b] = hex2rgb(c); return `rgba(${r},${g},${b},${a})`; };
// ears, necks and noses (measured on four reference faces): the skin made deeper and redder, never just darker
const DEEP = { '#EC5022': '#D52709', '#FBA589': '#EC8A6D' };
const deep = c => { if (DEEP[String(c).toUpperCase()]) return DEEP[String(c).toUpperCase()]; const [r, g_, b] = hex2rgb(c); return '#' + [r * 0.93, g_ * 0.72, b * 0.75].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); };
const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
// CIELAB (D65): the channel-wide measurements are lightness / chroma / hue steps, so the measured colour helpers work in Lab, not HSL
function hex2lab(c) { const lin = v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4, [r, g_, b] = hex2rgb(c).map(lin);
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116, x = f((r * 0.4124 + g_ * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g_ * 0.7152 + b * 0.0722), z = f((r * 0.0193 + g_ * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; }
function lab2hex(L, a, b) { const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, inv = t => t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883, gam = v => Math.round(255 * clamp(v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
  return '#' + [gam(x * 3.2406 - y * 1.5372 - z * 0.4986), gam(-x * 0.9689 + y * 1.8758 + z * 0.0415), gam(x * 0.0557 - y * 0.2040 + z * 1.0570)].map(v => v.toString(16).padStart(2, '0')).join(''); }
// lch(c) -> [L, C, h degrees]; fromLch(L, C, h) -> hex
const lch = c => { const [L, a, b] = hex2lab(c); return [L, Math.hypot(a, b), (Math.atan2(b, a) / D2R + 360) % 360]; };
const fromLch = (L, C, h) => lab2hex(L, C * Math.cos(h * D2R), C * Math.sin(h * D2R));
// the style's own palette (study: SPEC section 7) — a new Short may tweak the accent, never go grey, beige or pastel-dull
const PAL = { yellow: '#FFD23F', orange: '#FF7A1A', magenta: '#FF3CAC', violet: '#B13CFF', blue: '#2B4BFF', cyan: '#00C8FF',
  teal: '#19D6B8', navy: '#0B0A3C', indigo: '#24124F', label: '#FDEE00', red: '#E5262B', white: '#FFFFFF', ink: '#14112B',
  skin: ['#F2C9A0', '#E0A878', '#C98B5A', '#8A5A3C', '#5B3A29'], cheek: '#FF8FA3', limb: '#6B2FBF', sneaker: '#E5262B' };

// ── paths and flat shading ──────────────────────────────────────────────────────────────────────────────────────────
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function supEll(g, x, y, rx, ry, rot = 0, nt = 2, nb = 2) { g.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), n = sn > 0 ? nb : nt, u = Math.sign(c) * Math.abs(c) ** (2 / n) * rx, v = Math.sign(sn) * Math.abs(sn) ** (2 / n) * ry;   // a superellipse, its top and bottom halves their own powers
  const px = x + u * Math.cos(rot) - v * Math.sin(rot), py = y + u * Math.sin(rot) + v * Math.cos(rot); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); }
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); }
// a closed smooth path through points (Catmull-Rom; a point [x, y, 1] stays a sharp corner), scaled by k: how measured outlines become presets
// (sub = true adds a ring to the current path: a hole, filled with 'evenodd')
function spline(g, pts, k = 1, sub = false) { const n = pts.length, P = i => pts[(i + n) % n]; if (!sub) g.beginPath(); g.moveTo(P(0)[0] * k, P(0)[1] * k);
  for (let i = 0; i < n; i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), a = p1[2] ? 0 : 1 / 6, b = p2[2] ? 0 : 1 / 6;
    g.bezierCurveTo((p1[0] + (p2[0] - p0[0]) * a) * k, (p1[1] + (p2[1] - p0[1]) * a) * k, (p2[0] - (p3[0] - p1[0]) * b) * k, (p2[1] - (p3[1] - p1[1]) * b) * k, p2[0] * k, p2[1] * k); }
  g.closePath(); }
function blob(g, x, y, r, seed = 1, wob = 0.12, n = 9) { const R = rng(seed); const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr_ = r * (1 + (R() - 0.5) * 2 * wob); pts.push([x + Math.cos(a) * rr_, y + Math.sin(a) * rr_]); }
  g.beginPath(); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; if (i === 0) { const z = pts[n - 1]; g.moveTo((z[0] + p[0]) / 2, (z[1] + p[1]) / 2); } g.quadraticCurveTo(p[0], p[1], m[0], m[1]); } g.closePath(); }
// fill a path with the style's shading: base fill, then a darker same-hue crescent on the shade side (light from upper left),
// then optionally a thin light strip on the lit side. path(g) must only build the path (no fill). size = rough size in px.
// o.rim = a light colour: a thin rim-lit edge on the light side (upper left) of the shape, for depth on dark/glowing scenes.
function flat(g, path, fill, size, o = {}) {
  const sx = (o.sx ?? 0.14) * size, sy = (o.sy ?? 0.06) * size;
  g.save();
  if (o.rim) { const rw = (o.rimW ?? 0.035) * size; path(g); g.clip(); g.fillStyle = o.rim; g.fillRect(-W, -H, 3 * W, 3 * H); g.translate(rw, rw * 0.5); }
  path(g); g.fillStyle = fill; g.fill(); g.clip();
  if (o.shade !== false) { g.fillStyle = o.shadeCol || dk(fill, o.k ?? 0.12); g.fillRect(-W, -H, 3 * W, 3 * H);
    g.translate(-sx, -sy); path(g); g.fillStyle = fill; g.fill(); g.translate(sx, sy); }
  if (o.hl) { g.translate(sx * 0.55, sy * 0.55); g.globalCompositeOperation = 'source-atop'; g.save(); g.fillStyle = o.hlCol || lt(fill, 0.1); g.fillRect(-W, -H, 3 * W, 3 * H); g.restore();
    g.translate(-sx * 0.55 + sx * 0.25, -sy * 0.55 + sy * 0.25); path(g); g.fillStyle = fill; g.fill(); }
  g.restore();
}
function cap(g, x1, y1, x2, y2, w, col) { g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore(); }
function noodle(g, pts, w, col) { g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 3) g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); else if (pts.length === 4) g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); else for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], f1 = p1[2] ? 0 : 1 / 6, f2 = p2[2] ? 0 : 1 / 6;   // 5+ points: a smooth curve through every one (a 3rd element = a sharp corner)
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * f1, p1[1] + (p2[1] - p0[1]) * f1, p2[0] - (p3[0] - p1[0]) * f2, p2[1] - (p3[1] - p1[1]) * f2, p2[0], p2[1]); }
  g.stroke(); g.restore(); }

// ── grounds, light, atmosphere ──────────────────────────────────────────────────────────────────────────────────────
// the ground is the farthest plane: it moves least in a push/whip (parallax) and is drawn big enough never to show an edge
// sky backgrounds (measured on four reference frames): ONE linear gradient from the top to ~55 % of the height, flat below (the
// ground colour); both ends fully saturated, a deep hue on top and a light hue 60-120 degrees round the wheel below. SKY holds the
// measured pairs: bg(g, ...SKY.violet). o.end moves the end of the gradient; o.mid keeps the old three-stop full-height one.
const SKY = { violet: ['#BD1AFF', '#00FFE2'], royal: ['#0030D0', '#00E1F2'], ember: ['#EA4300', '#FEB910'] };
function bg(g, top, bot, o = {}) { g.save(); g.translate(-CAM.x * 0.6, -CAM.y * 0.6); const gr = g.createLinearGradient(0, 0, 0, H * (o.mid ? 1 : o.end ?? 0.55)); gr.addColorStop(0, top); if (o.mid) gr.addColorStop(0.5, o.mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); if (o.vig) vignette(g, o.vig); }
function glow(g, x, y, r, col, a = 0.6) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.45, rgba(col, a * 0.35)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
function rays(g, x, y, n, len, col, a = 0.25, rot = 0, width = 0.5) { g.save(); g.translate(x, y); g.rotate(rot); for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = a0 + Math.PI * 2 / n * width;
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, len); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, len, a0, a1); g.closePath(); g.fill(); } g.restore(); }
function bokeh(g, seed, n, col, t, o = {}) { const R = rng(seed); for (let i = 0; i < n; i++) { const x = R() * W, y = R() * H * (o.h ?? 1) + (o.y ?? 0), r = lerp(o.rmin ?? 14, o.rmax ?? 60, R()), sp = lerp(4, 18, R());
  const yy = ((y - t * sp) % H + H) % H; g.fillStyle = rgba(col, lerp(0.06, o.a ?? 0.22, R())); ell(g, x + Math.sin(t * 0.4 + i) * 10, yy, r, r); g.fill(); } }
function dots(g, seed, n, col, t, o = {}) { const R = rng(seed); g.fillStyle = col; for (let i = 0; i < n; i++) { const x0 = R() * W, y0 = R() * H, r = lerp(o.rmin ?? 3, o.rmax ?? 7, R()), vx = (R() - 0.5) * 20, vy = -lerp(6, 24, R());
  g.globalAlpha = lerp(0.3, o.a ?? 0.8, R()); ell(g, ((x0 + vx * t) % W + W) % W, ((y0 + vy * t) % H + H) % H, r, r); g.fill(); } g.globalAlpha = 1; }
function vignette(g, a = 0.25) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.5, H * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
function floorShadow(g, x, y, w, ground, a = 0.28) { g.save(); g.fillStyle = rgba(dk(ground, 0.25), a); ell(g, x, y, w / 2, w * 0.09); g.fill(); g.restore(); }

// ── entrances (measured) ─────────────────────────────────────────────────────────────────────────────────────────────
// ENTER(t, t0, kind, o) -> {a: alpha, sc: scale, x, y}. kinds: 'snap' (4 f), 'slide' (11 f on the glide curve, from o.dir
// 'left|right|up|down', ~8 % of W), 'pop' (12 f, popc: quick but no jolt), 'grow' (12 f glide, from 0.35 with a small rise), 'none'.
// o.over (true = 12 %) overshoots and settles once; o.windup (slides) pulls back first; o.rot starts it rotated by that many degrees
// and o.tilt is the angle it lands on (cards fly in turning and land tilted). (f = 1/30 s timing units; rendered at 60 fps.)
const ENTER = (t, t0, kind = 'pop', o = {}) => {
  if (kind === 'none') return { a: 1, sc: 1, x: 0, y: 0 };
  const f = (t - t0) * FPS;
  if (f < 0) return { a: 0, sc: 0, x: 0, y: 0 };
  const over = o.over || 0;
  const bump = over ? over * Math.sin(clamp(f / 14) * Math.PI) * Math.exp(-f / 10) * 2.2 : 0;
  if (kind === 'snap') { const p = clamp(f / 4); return { a: clamp(f / 2), sc: lerp(0.9, 1, out(f) / out(4) > 1 ? 1 : out(f * 2) ) + bump, x: 0, y: 0 }; }
  const n = kind === 'slide' ? 11 : 12, ov = o.over ? (o.over === true ? 0.12 : o.over) : 0;
  const p = ov ? glideOver(f / n, ov) : o.windup ? windUp(f / n, o.windup === true ? 0.1 : o.windup) : kind === 'pop' ? popc(f / n) : glide(f / n);
  const r = ((o.rot || 0) * (1 - glide(f / (n + 4))) + (o.tilt || 0)) * Math.PI / 180;
  if (kind === 'slide') { const d = (o.dist ?? 0.08) * W, dir = o.dir || 'up'; const k = 1 - p;
    return { a: clamp(f / 3), sc: 1, r, x: dir === 'left' ? -d * k : dir === 'right' ? d * k : 0, y: dir === 'up' ? d * k : dir === 'down' ? -d * k : 0 }; }
  if (kind === 'grow') return { a: clamp(f / 3), sc: lerp(0.35, 1, p), r, x: 0, y: (1 - p) * 0.02 * W };
  return { a: clamp(f / 2), sc: p, r, x: 0, y: 0 };                                                        // pop
};
// draw fn() with an entrance applied around pivot (px, py)
function enter(g, st, px, py, fn) { if (st.a <= 0.001 || st.sc <= 0.001) return; g.save(); g.globalAlpha *= st.a; g.translate(px + st.x, py + st.y); if (st.r) g.rotate(st.r); g.scale(st.sc, st.sc); g.translate(-px, -py); fn(); g.restore(); }
// exits are rare (shots cut); a quick shrink when one must leave: EXIT(t, t1) 6 frames
// REBUILD IN PLACE (14 % of idea changes, measured v2: no cut, the background stays; old pieces leave, new ones arrive in the
// same frame, staggered, ~0.5 s): rebuild(s.t, t0, i, n, o) -> {out, in} states for piece i (use each with enter()). Old pieces
// shrink out 2 frames apart from t0; new ones come in (o.kind, default 'pop') 2 frames apart from t0 + 6 frames (o.every, o.gap).
function rebuild(t, t0, i = 0, n = 1, o = {}) { const ev = (o.every ?? 2) / FPS; return { out: EXIT(t, t0 + i * ev), in: ENTER(t, t0 + (o.gap ?? 6) / FPS + i * ev, o.kind || 'pop', o) }; }
const EXIT = (t, t1) => { const f = (t - t1) * FPS; return f <= 0 ? { a: 1, sc: 1, x: 0, y: 0 } : { a: clamp(1 - f / 6), sc: clamp(1 - out(f * 1.6)), x: 0, y: 0 }; };

// ── motion inside a shot (measured: 41 % of all big moves are an element moving while the shot stays) ──────────────
// snap(p, n) for p = 0..1 of a move n frames long: moves of 8+ frames follow the measured glide (soft start, peak at ~38 %,
// soft landing); tiny ones (wipes, stretches under 8 frames) keep the quick "snap, then settle".
const _SNAP = {};
function snap(p, n) { if (n >= 8) return glide(p); n = Math.max(4, Math.round(n)); if (!_SNAP[n]) { const v = [0]; let c = 0; for (let f = 1; f <= n; f++) { c += Math.min(f / 3, 1) * Math.pow(DECAY, Math.max(0, f - 3)); v.push(c); } _SNAP[n] = v.map(x => x / c); }
  const v = _SNAP[n], x = clamp(p) * n, i = Math.floor(x); return i >= n ? 1 : lerp(v[i], v[i + 1], x - i); }
// MOVE(t, t0, a, b, o): a value (number or array: [x, y], [x, y, scale, rotation]) travelling from a to b from t0 on,
// looking done after o.d seconds (0.45 default; small shifts 0.25, big travels 0.6); o.over / o.windup as in ENTER
function MOVE(t, t0, a, b, o = {}) { const p = shaped((t - t0) / Math.max(0.05, (o.d ?? 0.45) * 1.4 * Math.sqrt(o.mass || 1)), o); return Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], p)) : lerp(a, b, p); }
// fling: an element thrown out of frame (the whip's "flung up and out"): accelerates away over o.frames (8) with a little
// spin; draws nothing after. fn() draws it in place; (px, py) = its centre.
function fling(g, t, t1, dir, px, py, fn, o = {}) { const n = o.frames || 8, f = (t - t1) * FPS; if (f >= n) return; if (f <= 0) { fn(); return; }
  const k = Math.pow(f / n, 2), v = dir === 'up' || dir === 'down', d = (dir === 'up' || dir === 'left' ? -1 : 1) * (v ? H : W) * 1.1 * k;
  g.save(); g.translate(v ? 0 : d, v ? d : 0); g.translate(px, py); g.rotate((o.spin ?? 0.25) * k * Math.sign(d)); g.translate(-px, -py); fn(); g.restore(); }
// pulse(t, at): light bursts on beats ("pulse, hold, pulse"): 0..1, snaps up in 2 frames on each time in `at` (shot
// seconds) and settles back (o.decay per frame). Drive a glow's size, rays' alpha or a scale with it.
function pulse(t, at, o = {}) { let v = 0; for (const a of at) { const f = (t - a) * FPS; if (f >= 0) v = Math.max(v, f < 2 ? f / 2 : Math.pow(o.decay ?? 0.88, f - 2)); } return v; }
// swapAt(t, t0, every, n): which of n candidates shows now when they cycle every `every` seconds (the hook's face swaps,
// measured ~0.23 s); pair it with ENTER(t, t0 + i * every, 'snap') so each new one snaps in
const swapAt = (t, t0, every, n) => clamp(Math.floor((t - t0) / every), 0, n - 1);
// morph(g, t, t0, x, y, drawA, drawB): A collapses (squashing) and B pops out of the same spot, "snap, then settle", ~0.26 s
// (a crowd becomes one figure, a figure becomes a character, an outfit changes)
function morph(g, t, t0, x, y, drawA, drawB, o = {}) { const d = o.d ?? 0.26, n = d * FPS, f = (t - t0) * FPS;
  if (f < n * 0.5) { const k = f <= 0 ? 1 : 1 - snap(f / (n * 0.5), n * 0.5); g.save(); g.translate(x, y); g.scale(1 + (1 - k) * 0.35, Math.max(0.001, k)); g.translate(-x, -y); drawA(); g.restore(); }
  if (f >= n * 0.35) enter(g, ENTER(t, t0 + d * 0.35, 'pop', { over: o.over ?? 0.06 }), x, y, drawB); }

// ── life in the hold (optical flow on 65 held shots): the camera drifts 0 px/frame in 3 holds of 4, yet 98 % of frames have
// something moving: about 9 % of the frame at once (p25-p75 4-17 %) at ~3 px/frame (2-5). Seen in the holds (vision pass on
// the 10 longest): ONE act carries each hold (a creature rising on an arc ~1 s, a car arriving from off-frame in 0.4-0.5 s, a
// coin dropping into a slot under gravity in 6-10 frames, an arm reaching in 0.5-0.7 s, a heart thumping); under it a quiet idle
// (breathe 1-2 % at 1.5-2 s, head bob ~1 % of the frame at ~1.8 s with a 1-2 degree tilt, hair 1-4 frames behind, eye darts
// every 0.3-0.5 s, blinks every 2-4 s); a table of many items gives EACH its own small pulse on its own phase. Diagrams build in
// (staggered pops 2-4 frames apart, a ring drawing on, a title typing) and may then hold dead still. Backgrounds never move.
// wipe(g, t, t0, x, y, w, h, fn): a plate (date tag, number plate, label) revealed by a mask running across it in ~5 frames
// (snap), its text clipped with it; o.dir 'right' (default) | 'left' | 'up' | 'down'
function wipe(g, t, t0, x, y, w, h, fn, o = {}) { const n = o.frames || 5, f = (t - t0) * FPS; if (f <= 0) return; const p = f >= n ? 1 : snap(f / n, n), dir = o.dir || 'right';
  g.save(); g.beginPath(); if (dir === 'right') g.rect(x - 4, y - 4, (w + 8) * p, h + 8); else if (dir === 'left') g.rect(x - 4 + (w + 8) * (1 - p), y - 4, (w + 8) * p, h + 8);
  else if (dir === 'up') g.rect(x - 4, y - 4 + (h + 8) * (1 - p), w + 8, (h + 8) * p); else g.rect(x - 4, y - 4, w + 8, (h + 8) * p); g.clip(); fn(); g.restore(); }
// loopRow(g, t, y, n, gap, speed, draw): a conveyor / parade: n items `gap` px apart sliding at `speed` px/s (the one LINEAR
// motion: loops never ease), wrapping round forever; give alternate rows opposite signs. draw(i, x, y) draws item i centred.
function loopRow(g, t, y, n, gap, speed, draw) { const L = n * gap, off = ((t * speed) % L + L) % L;
  for (let c = -1; c * L < W + gap * 2; c++) for (let i = 0; i < n; i++) { const x = i * gap + off + c * L - gap; if (x > -gap && x < W + gap) draw(i, x, y); } }
// along(t, t0, d, a, c, b): [x, y, angle] on a curve from a through control c to b, snap-then-settle over d seconds (a creature
// rising out of the bottom edge in an arc, a hand reaching, a coin flicked); o.linear for a steady travel. Big moves 0.5-1 s.
function along(t, t0, d, a, c, b, o = {}) { const n = d * FPS, f = (t - t0) * FPS, p = f <= 0 ? 0 : f >= n ? 1 : o.linear ? f / n : shaped(f / n, o), q = 1 - p;
  const x = q * q * a[0] + 2 * q * p * c[0] + p * p * b[0], y = q * q * a[1] + 2 * q * p * c[1] + p * p * b[1];
  return [x, y, Math.atan2(2 * q * (c[1] - a[1]) + 2 * p * (b[1] - c[1]), 2 * q * (c[0] - a[0]) + 2 * p * (b[0] - c[0]))]; }
// fall(t, t0, y0): a dropped thing under gravity (px at 1920 tall; o.g px/s², o.v0 px/s); clamp it at its landing yourself
const fall = (t, t0, y0, o = {}) => { const s = Math.max(0, t - t0); return y0 + (o.v0 || 0) * s + 0.5 * (o.g ?? 5200) * s * s; };
// lidOf(t, seed): how closed the eyes are 0..1: a blink every ~3.4 s, shut in 2 frames, open in 4 (head/person use it)
function lidOf(t, seed = 0, every = 3.4) { const ph = ((t + seed * 0.7) % every + every) % every; return ph < 2 / FPS ? ph * FPS / 2 : ph < 6 / FPS ? 1 - (ph * FPS - 2) / 4 : 0; }
// bobOf(t, i): the small life of item i in a group (food on a table, icons in a row): {y, sc, rot}, scale 1-3 %, bob ~0.7 % of
// the frame, 0.6-1.2 s per cycle, every item on its own phase (measured). Apply with g.translate(0, b.y) / g.scale(b.sc, b.sc).
function bobOf(t, i, o = {}) { const R = rng(i * 13 + 5), per = lerp(0.6, 1.2, R()), ph = R() * 6.283, a = o.amp ?? 1, w = Math.sin(t * 6.283 / per + ph);
  return { y: w * H * 0.0035 * a, sc: 1 + Math.sin(t * 6.283 / per + ph + 1.2) * 0.015 * a, rot: (o.tilt ? Math.sin(t * 6.283 / per + ph + 2) * 0.05 * a : 0) }; }
// beat(t, o): a heartbeat 0..1, a double thump (lub-dub) every o.every s (0.7), snapping up in 2 frames and settling; scale a heart
// by 1 + 0.05 * beat(t) (measured 3-5 %)
// ALWAYS-ON LIFE (measured v2, 16 references at 60 fps): something moves in 94 % of frames (the Moon build: 75 %); at any moment
// ~12 % of the frame is moving (the Moon: 4 %), at a median ~120 px/s at 1080 wide, mostly WHOLE big shapes: a body bouncing and
// gesturing, a planet turning, a bubble bobbing, a sign swaying, in 2-3 layers at different speeds. Small fidgets (blinks, darting
// eyes) do not count: give every hero, cast member and big prop a loop, and a few drifting things behind.
// alive(g, t, px, py, fn, o): draws fn() inside a continuous loop around the pivot (px, py): the BASE of a standing thing, the
// CENTRE of a floating one. o.kind 'bounce' (standing: squash and stretch on its base, the top travels ~2.2 % of o.size, ~1.1 s)
// | 'bob' (floating: up and down ~2.5 % of o.size with a ±1.5° tilt, ~1.6 s) | 'sway' (rocks ±3° on its base, ~2.2 s) | 'breathe'
// (swells ±2 % round its centre, ~1.6 s) | 'spin' (turns o.sp deg/s, default 10) | 'drift' (travels o.vx, o.vy px/s with a slow
// wobble). o.size = its height in px (default 400), o.amp scales the loop, o.seed staggers the phase: neighbours never move in step.
// WEIGHT: o.mass (or, with MOTION.weight on, worked out from o.size: a 900 px whale is heavy, a 120 px bird light) slows a heavy
// thing's loop and shrinks it (sqrt(mass) slower, mass^-0.35 smaller) and gives a light thing a quicker, springier loop.
function alive(g, t, px, py, fn, o = {}) { const k = o.kind || 'bounce', S = o.size || 400, R = rng((o.seed ?? 1) * 7 + 3), ph = R() * 6.283;
  const m = o.mass ?? (MOTION.weight ? clamp(Math.sqrt(S / 400), 0.55, 1.9) : 1), a = (o.amp ?? 1) * Math.pow(m, -0.35), sp = lerp(0.88, 1.12, R()) / Math.sqrt(m);
  const w = per => { const s = Math.sin(t * 6.283 / (per / sp) + ph); return m < 0.9 ? s + 0.25 * (1 - m) * Math.sin(2 * (t * 6.283 / (per / sp) + ph)) : s; };
  g.save(); g.translate(px, py);
  if (k === 'bounce') { const v = w(1.1) * 0.022 * a; g.scale(1 - v * 0.55, 1 + v); }
  else if (k === 'bob') { g.translate(0, w(1.6) * S * 0.025 * a); g.rotate(Math.sin(t * 6.283 / (2.3 / sp) + ph * 1.7) * 1.5 * a * D2R); }
  else if (k === 'sway') g.rotate(w(2.2) * 3 * a * D2R);
  else if (k === 'breathe') { const v = 1 + w(1.6) * 0.02 * a; g.scale(v, v); }
  else if (k === 'spin') g.rotate(t * (o.sp ?? 10) * D2R + ph);
  else if (k === 'drift') g.translate((o.vx ?? 30) * t + w(2.6) * S * 0.01 * a, (o.vy ?? 0) * t + w(3.1) * S * 0.015 * a);
  g.translate(-px, -py); fn(); g.restore(); }
function beat(t, o = {}) { const e = o.every ?? 0.7, ph = ((t % e) + e) % e; return Math.max(pulse(ph, [0], { decay: 0.78 }), 0.6 * pulse(ph, [0.18], { decay: 0.78 })); }
// twitch(t, seed): an irregular jitter -1..1 (a gauge needle creeping and twitching, a nervous hand): steps every 0.3-0.6 s, eased
function twitch(t, seed = 0) { let a = 0, k = 0; while (a <= t) { a += lerp(0.3, 0.6, rng(seed * 31 + k)()); k++; } const st = a - lerp(0.3, 0.6, rng(seed * 31 + k - 1)()), v = i => rng(seed * 17 + i)() * 2 - 1;
  return lerp(v(k - 1), v(k), snap(clamp((t - st) / 0.2), 6)); }
// typeOn(str, t, t0): the part of str typed by now, ~1.5 letters a frame (a title pill writes itself in 8-10 frames and the
// pill widens with it: pill(g, typeOn(...), ...) measures its own width)
const typeOn = (str, t, t0, o = {}) => str.slice(0, Math.max(0, Math.floor((t - t0) * FPS * (o.per ?? 1.5))));
// ringOn(g, t, t0, x, y, r, o): a flow ring drawing itself on (a cycle diagram), ease-out over o.d (0.47 s), from angle o.a0,
// o.sweep radians (full turn), o.w stroke, o.col, an arrowhead riding its tip (o.arrow)
function ringOn(g, t, t0, x, y, r, o = {}) { const n = (o.d ?? 0.47) * FPS, f = (t - t0) * FPS; if (f <= 0) return; const p = f >= n ? 1 : snap(f / n, n), a0 = o.a0 ?? -Math.PI / 2, sw = (o.sweep ?? Math.PI * 2) * p, w = o.w || 26;
  g.save(); g.strokeStyle = o.col || PAL.cyan; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, a0, a0 + sw); g.stroke();
  if (o.arrow !== false && p > 0.05) { const a = a0 + sw; g.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillStyle = o.col || PAL.cyan; g.beginPath(); g.moveTo(w * 1.3, 0); g.lineTo(-w * 0.6, -w * 1.1); g.lineTo(-w * 0.6, w * 1.1); g.closePath(); g.fill(); } g.restore(); }
// stretch(g, t, t0, px, py, fn): a tag / plate / badge opening as the references do it (measured frame by frame): a thin bar grows
// out sideways from its stalk or centre first, then the bar grows to full height; its contents pop in after (o.frames 8 in all;
// o.one = only the sideways stretch, 5 frames)
function stretch(g, t, t0, px, py, fn, o = {}) { const n = o.frames || (o.one ? 5 : 8), f = (t - t0) * FPS; if (f <= 0) return; const p = clamp(f / n);
  const sx = o.one ? glide(p) : glide(clamp(p / 0.55)), sy = o.one ? 1 : lerp(0.1, 1, glide(clamp((p - 0.45) / 0.55)));
  g.save(); g.translate(px, py); g.scale(Math.max(0.03, sx), sy); g.translate(-px, -py); fn(); g.restore(); }
// lineWipe(g, t, t0, d, drawA, drawB, o): a picture turns into its next state as a thin bright line sweeps across it (the before /
// after of one diagram, measured ~0.45 s): the new state on the side the line has passed. o.dir 'right'|'left'|'down', o.col, o.w
function lineWipe(g, t, t0, d, drawA, drawB, o = {}) { const p = glide(clamp((t - t0) / d)); if (p <= 0) { drawA(); return; } if (p >= 1) { drawB(); return; }
  const v = o.dir === 'down', at = (o.dir === 'left' ? 1 - p : p) * (v ? H : W), w = o.w || 10, col = o.col || '#FF3D8B';
  drawA(); g.save(); g.beginPath(); if (v) g.rect(0, 0, W, at); else if (o.dir === 'left') g.rect(at, 0, W - at, H); else g.rect(0, 0, at, H); g.clip(); drawB(); g.restore();
  g.save(); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 26; if (v) g.fillRect(0, at - w / 2, W, w); else g.fillRect(at - w / 2, 0, w, H); g.restore(); }
// trail(g, t, fnAt, o): ghost copies behind a FAST move (an arm swung, a thing flung, a dizzy wave): fnAt(tt) draws the element as it
// was at time tt; o.n (2) fading copies o.dt (1/30 s) apart. Only while the move is fast; never on a slow move or a hold.
function trail(g, t, fnAt, o = {}) { const n = o.n ?? 2, dt = o.dt ?? 1 / 30; for (let i = n; i >= 1; i--) { g.save(); g.globalAlpha *= (o.a ?? 0.32) * (1 - (i - 1) / n); fnAt(t - i * dt); g.restore(); } fnAt(t); }
// burst(g, t, t0, x, y, o): sweat drops / sparks thrown out from a point on an entrance, gone in ~0.3 s (o.n 3, o.col, o.r size,
// o.spread radians, o.dir angle (up = -PI/2))
function burst(g, t, t0, x, y, o = {}) { const f = (t - t0) * FPS, n = o.frames || 9; if (f < 0 || f > n) return; const k = snap(f / n, n), N = o.n || 3, r = o.r || 26, sp = o.spread ?? 1.4, dir = o.dir ?? -Math.PI / 2;
  g.save(); g.fillStyle = o.col || '#7FD8FF'; for (let i = 0; i < N; i++) { const a = dir + (N > 1 ? (i / (N - 1) - 0.5) * sp : 0), d = r * (1.2 + 3 * k), sc = 1 - Math.max(0, k - 0.45) * 1.6;
    g.save(); g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); g.rotate(a + Math.PI / 2); g.scale(sc, sc); g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.75, r * 0.2, 0, r * 0.55); g.quadraticCurveTo(-r * 0.75, r * 0.2, 0, -r); g.fill(); g.restore(); } g.restore(); }
// waves(g, seed, n, col, t): small "~" water marks scattered on a sea (around a map, under a boat), drifting a little
function waves(g, seed, n, col, t, o = {}) { const R = rng(seed); g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = o.w || 6;
  for (let i = 0; i < n; i++) { const x = R() * W + Math.sin(t * 0.9 + i * 1.7) * 10, y = R() * H * (o.h ?? 1) + (o.y ?? 0), s = lerp(16, 30, R());
    g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s / 2, y - s * 0.45, x, y); g.quadraticCurveTo(x + s / 2, y + s * 0.45, x + s, y); g.stroke(); } g.restore(); }

// ── type ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// fonts: 'R' rounded (Fredoka, captions-like, pills), 'H' heavy geometric caps (Montserrat Black: banners, titles), 'B' rounded heavy (Baloo 2)
const FONT = { R: 'FlatRound', H: 'FlatHeavy', B: 'FlatBold' };
function setFont(g, size, f = 'R', weight = 700) { g.font = `${f === 'H' ? 900 : weight} ${Math.round(size)}px ${FONT[f] || f}`; }
function txtW(g, s, size, f = 'R', weight) { setFont(g, size, f, weight); return g.measureText(s).width; }
function txt(g, s, x, y, o = {}) {
  const size = o.size || 64; setFont(g, size, o.font || 'R', o.weight);
  g.save(); if (o.track) g.letterSpacing = (size * o.track).toFixed(1) + 'px';   // o.track = letter spacing as a share of the size
  g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.translate(x, y); if (o.tilt) g.rotate(o.tilt * Math.PI / 180);
  if (o.maxW) { const w = g.measureText(s).width; if (w > o.maxW) { const k = o.maxW / w; g.scale(k, k); } }
  if (o.shadow) { g.fillStyle = o.shadowCol || 'rgba(0,0,0,0.35)'; g.fillText(s, o.shadow * 0.4, o.shadow); }
  if (o.outline) { g.lineJoin = 'round'; g.lineWidth = o.outline[0] * 2; g.strokeStyle = o.outline[1]; g.strokeText(s, 0, 0); }
  g.fillStyle = o.col || '#fff'; g.fillText(s, 0, 0); g.restore();
}
// fact pill: rounded capsule, saturated fill, white bold text, a darker lip along the bottom. Returns its width.
function pill(g, s, x, y, o = {}) {
  const size = o.size || 64, padX = size * 0.62, h = size * 1.55, w = txtW(g, s, size, 'R', 700) + padX * 2, col = o.col || PAL.blue;
  const X = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  g.save(); rr(g, X, y - h / 2 + h * 0.07, w, h, h / 2); g.fillStyle = dk(col, 0.16); g.fill(); rr(g, X, y - h / 2, w, h, h / 2); g.fillStyle = col; g.fill(); g.restore();
  txt(g, s, X + w / 2, y + size * 0.02, { size, col: o.txtCol || '#fff', font: 'R' }); return w;
}
// the fact column (measured): equal-width pills that bleed off the LEFT edge, text right-aligned, ~107 px tall at 1920, sliding
// in from the left 3-4 frames apart on the words that state them. items = [[text, colour, t0], ...] (t0 = shot seconds).
function pills(g, s, items, y, o = {}) {
  const size = o.size || 64, h = size * 1.62, gap = o.gap ?? size * 0.42, pad = size * 0.55;
  const w = Math.max(...items.map(it => txtW(g, it[0], size, 'R', 700))) + pad * 2 + (o.bleed ?? 60), x0 = (o.x ?? 0) - (o.bleed ?? 60);
  items.forEach(([text, col, t0], i) => { const st = ENTER(s.t, t0 ?? (o.t0 ?? 0) + i * (o.every ?? 4 / FPS), 'slide', { dir: 'left', dist: (w + 40) / W });
    if (st.a <= 0) return; g.save(); g.translate(st.x, 0); const yy = y + i * (h + gap);
    rr(g, x0, yy - h / 2 + h * 0.07, w, h, h / 2); g.fillStyle = dk(col, 0.16); g.fill(); rr(g, x0, yy - h / 2, w, h, h / 2); g.fillStyle = col; g.fill();
    txt(g, text, x0 + w - pad, yy + size * 0.03, { size, col: '#fff', align: 'right' }); g.restore(); });
  return w + x0;
}
// name label (measured): a plain yellow (#FDEE00) rectangle, square corners, NO shadow, tilted 5-8 degrees either way, heavy black
// caps a little tracked, overlapping the edge of what it names (a zoom bubble's rim, the top of an object). o.shadow = a darker copy.
function banner(g, s, x, y, o = {}) {
  const size = o.size || 74, tilt = (o.tilt ?? -5) * Math.PI / 180, S = s.toUpperCase(), w = txtW(g, S, size, 'H') + S.length * size * 0.03 + size * 0.9, h = size * 1.42;
  g.save(); g.translate(x, y); g.rotate(tilt); if (o.shadow) { g.fillStyle = dk(o.col || PAL.label, 0.1); g.fillRect(-w / 2 + 6, -h / 2 + 8, w, h); }
  g.fillStyle = o.col || PAL.label; g.fillRect(-w / 2, -h / 2, w, h); g.restore();
  txt(g, S, x, y + size * 0.05, { size, font: 'H', col: o.txtCol || '#0A0A0A', tilt: o.tilt ?? -5, track: 0.03 }); return w;
}
// caveat / source box (measured): a deep indigo (#290466) hexagon plate ~0.82 of the frame wide near the top, its points 0.49 of
// its height deep, white bold rounded text tracked wide (0.05), sentence case with punctuation, 1-2 lines
function caveat(g, lines, x, y, o = {}) {
  // measured: the plate is ~0.82 of the frame wide, height ~0.2 of its width, text cap ~30 px at 1920 (font ~44)
  lines = [].concat(lines); const size = o.size || 46, lh = size * 1.18, w = Math.max(o.w ?? W * 0.82, Math.max(...lines.map(l => txtW(g, l, size, 'R', 700) + l.length * size * 0.05)) + size * 2.6), h = Math.max(lh * lines.length + size * 1.3, w * 0.2);
  g.save(); g.fillStyle = o.col || '#290466'; g.beginPath(); const c = h * 0.49; g.moveTo(x - w / 2 + c, y - h / 2); g.lineTo(x + w / 2 - c, y - h / 2); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2 - c, y + h / 2); g.lineTo(x - w / 2 + c, y + h / 2); g.lineTo(x - w / 2, y); g.closePath(); g.fill(); g.restore();
  lines.forEach((l, i) => txt(g, l, x, y - (lines.length - 1) * lh / 2 + i * lh, { size, weight: 700, col: '#fff', track: 0.05 }));
}
// a scary number: red rounded box, white heavy text
function numBox(g, s, x, y, o = {}) { const size = o.size || 72, w = txtW(g, s, size, 'H') + size * 0.8, h = size * 1.45; mark(g, 'device', x - w / 2, y - h / 2, x + w / 2, y + h / 2, 'number'); g.save(); rr(g, x - w / 2, y - h / 2 + 8, w, h, size * 0.28); g.fillStyle = dk(o.col || PAL.red, 0.16); g.fill(); rr(g, x - w / 2, y - h / 2, w, h, size * 0.28); g.fillStyle = o.col || PAL.red; g.fill(); g.restore(); txt(g, s, x, y + 2, { size, font: 'H', col: '#fff' }); return w; }
// hook title: huge heavy rounded words, white with a dark outline (or put words on banners instead)
function title(g, lines, x, y, o = {}) { lines = [].concat(lines); let yy = y, prev = 0; lines.forEach((l, i) => { const [str, size] = Array.isArray(l) ? l : [l, o.size || 132]; if (i) yy += (prev + size) * 0.52; prev = size; txt(g, str, x, yy, { size, tilt: o.tilt, font: o.font || 'B', weight: 800, col: o.col || '#fff', outline: [o.ow ?? 9, o.oc || PAL.ink], shadow: o.shadow ?? 10, maxW: o.maxW || W * 0.9 }); }); }
// rolling counter: value eases from a to b between t0 and t0+d, drawn in big heavy type
const _T = new OffscreenCanvas(W, H), gT = _T.getContext('2d');
// ── the hook title LOCKUP (measured on 10 recent hooks): 2-4 lines in MIXED sizes (key words huge, filler words about a third
// of that: "Can / YOU / Evolve to / NEVER SLEEP?"), 2-3 colours, a DOUBLE outline (dark inner ring, light or white outer ring),
// the key word often in a vertical gradient; upper third, the hero overlapping it; sometimes on a puffy plate, sometimes
// printed on an object (a pill-bottle label). parts = [[text, size, fill], ...] one per line, fill a colour or [top, bottom];
// o.ring inner outline colour, o.halo outer ring colour (null = none), o.halo2 a second, wider ring outside it, o.extrude a
// darker copy dropped below the letters (the 3D extruded look most titles have; o.ex its depth, 0.09 of the size), o.plate
// puffy plate colour (with a lighter rim inside its edge), o.tilt degrees, o.font. Fills can be dark inside bright rings.
// Returns the box {x0, y0, x1, y1}.
function lockup(g, parts, x, y, o = {}) {
  const f = o.font || 'B', gap = o.gap ?? 0.02, rows = []; let hTot = 0, wMax = 0;
  for (const [s, size, fill] of parts) { const w = txtW(g, s, size, f, 800); rows.push({ s, size, fill, w }); hTot += size * (0.86 + gap); wMax = Math.max(wMax, w); }
  const sc = Math.min(1, (o.maxW || W * 0.9) / wMax); g.save(); g.translate(x, y); if (o.tilt) g.rotate(o.tilt * Math.PI / 180); g.scale(sc, sc);
  if (o.plate) { const R = rng(o.seed || 7), pw = wMax * 0.56 + 70, ph = hTot * 0.5 + 60, puffs = [];
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; puffs.push([Math.cos(a) * pw * (0.92 + R() * 0.08), Math.sin(a) * ph * (0.9 + R() * 0.1) + hTot * 0.5 - hTot * 0.5, lerp(0.34, 0.5, R()) * Math.min(pw, ph)]); }
    const blobs = (dx, dy, col) => { g.fillStyle = col; rr(g, -pw + dx, -ph + hTot * 0.5 - hTot * 0.5 + dy, pw * 2, ph * 2, ph * 0.6); g.fill(); for (const [px, py, r] of puffs) { ell(g, px + dx, py + dy, r, r); g.fill(); } };
    g.save(); g.translate(0, hTot * 0.5 - rows[0].size * 0.43); blobs(0, 14, dk(o.plate, 0.18)); blobs(0, 0, lt(o.plate, 0.16)); g.scale(0.965, 0.95); blobs(0, 4, o.plate); g.restore(); }
  let yy = 0; const lines = rows.map(r => { const ly = yy + r.size * 0.43; yy += r.size * (0.86 + gap); return { ...r, ly }; });
  // the letters are built on their own layer, front to back: fill, inner ring, extrusion; then the rings go BEHIND them
  // ('destination-over'), so a ring only shows outside the letters and every small letter hole stays dark (depth), never white
  const T = gT; T.setTransform(1, 0, 0, 1, 0, 0); T.globalCompositeOperation = 'source-over'; T.clearRect(0, 0, W, H); T.setTransform(g.getTransform());
  T.textAlign = 'center'; T.textBaseline = 'middle'; T.lineJoin = 'round';
  const pass = fn => lines.forEach(l => { setFont(T, l.size, f, 800); fn(l); }), ex = l => o.extrude ? l.size * (o.ex ?? 0.09) : 0;
  pass(l => { if (Array.isArray(l.fill)) { const gr = T.createLinearGradient(0, l.ly - l.size * 0.4, 0, l.ly + l.size * 0.4); gr.addColorStop(0, l.fill[0]); gr.addColorStop(1, l.fill[1]); T.fillStyle = gr; } else T.fillStyle = l.fill || '#fff'; T.fillText(l.s, 0, l.ly); });
  T.globalCompositeOperation = 'destination-over';
  const dark = o.extrude || o.ring || '#2A0A5A';
  pass(l => { T.lineWidth = l.size * 0.17; T.strokeStyle = o.ring || '#2A0A5A'; T.strokeText(l.s, 0, l.ly); });
  pass(l => { T.strokeStyle = dark; T.fillStyle = dark; T.lineWidth = l.size * 0.4; for (let k = 0; k <= 4; k++) { T.strokeText(l.s, 0, l.ly + ex(l) * k / 4); T.fillText(l.s, 0, l.ly + ex(l) * k / 4); } });
  if (o.halo !== null) pass(l => { T.strokeStyle = o.halo || '#FFFFFF'; T.lineWidth = l.size * 0.58; for (let k = 0; k <= 4; k++) T.strokeText(l.s, 0, l.ly + ex(l) * k / 4); });
  if (o.halo2) pass(l => { T.strokeStyle = o.halo2; T.lineWidth = l.size * 0.78; for (let k = 0; k <= 4; k++) T.strokeText(l.s, 0, l.ly + ex(l) * k / 4); });
  T.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(_T, 0, 0); g.restore();
  mark(g, 'title', x - wMax * sc / 2, y, x + wMax * sc / 2, y + yy * sc, 'lockup');
  g.restore(); return { x0: x - wMax * sc / 2, y0: y, x1: x + wMax * sc / 2, y1: y + yy * sc };
}
// lockOut(t, t1, kind): how the hook title LEAVES at the end of the hook (it is the nearest plane, so it moves faster than
// the scene), accelerating over ~0.6 s: 'drop' falls out of the bottom, 'zoom' grows past the camera, 'up' flies out of the
// top, 'fade' melts while the camera pulls back. Same shape as ENTER: enter(g, lockOut(...), px, py, fn). The hero stays.
const lockOut = (t, t1, kind = 'drop', d = 0.6) => { const k = clamp((t - t1) / d), p = k * k;
  if (k <= 0) return { a: 1, sc: 1, x: 0, y: 0 };
  return kind === 'zoom' ? { a: 1 - clamp((k - 0.5) * 2), sc: 1 + 2.6 * p, x: 0, y: H * 0.25 * p } : kind === 'up' ? { a: 1, sc: 1, x: 0, y: -H * 0.7 * p }
    : kind === 'fade' ? { a: 1 - k, sc: 1 - 0.08 * k, x: 0, y: 0 } : { a: 1 - clamp((k - 0.7) * 3.3), sc: 1 + 0.15 * p, x: 0, y: H * 1.0 * p }; };
// label tags (the recent Shorts label things SMALL: cap height ~24 px at 1920, font ~34): o.shape 'pill' | 'chevron' (an arrow
// point on the right) | 'pennant' (a notch on the left, pointing at what it names) | 'hex' (hexagon ends: section headings,
// dark red/navy) | 'box' (square-cornered plate); o.col fill, o.txt text colour, o.ring thin border colour, o.at [x, y] a thin
// leader line to the thing it names, o.align 'left'|'center'|'right', o.size. Returns its width.
function tag(g, s, x, y, o = {}) {
  const size = o.size || 34, lines = [].concat(s), lh = size * 1.12, tw = Math.max(...lines.map(l => txtW(g, l, size, 'R', 700))), padX = size * (o.shape === 'hex' ? 1.2 : 0.6), h = lh * lines.length + size * 0.62, w = tw + padX * 2, col = o.col || PAL.blue;
  const X = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2, Y = y - h / 2, sh = o.shape || 'pill', c = h * 0.5;
  if (o.at) { g.save(); g.strokeStyle = o.line || col; g.lineWidth = 4; g.beginPath(); g.moveTo(X + (o.at[0] < X ? 0 : w), y); g.lineTo(o.at[0], o.at[1]); g.stroke(); g.fillStyle = o.line || col; ell(g, o.at[0], o.at[1], 7, 7); g.fill(); g.restore(); }
  const path = gg => { gg.beginPath();
    if (sh === 'chevron') { gg.moveTo(X + h * 0.2, Y); gg.lineTo(X + w, Y); gg.lineTo(X + w + c * 0.6, y); gg.lineTo(X + w, Y + h); gg.lineTo(X + h * 0.2, Y + h); gg.quadraticCurveTo(X, Y + h, X, Y + h - h * 0.2); gg.lineTo(X, Y + h * 0.2); gg.quadraticCurveTo(X, Y, X + h * 0.2, Y); }
    else if (sh === 'pennant') { gg.moveTo(X, Y); gg.lineTo(X + w, Y); gg.lineTo(X + w, Y + h); gg.lineTo(X, Y + h); gg.lineTo(X + c * 0.55, y); gg.closePath(); }
    else if (sh === 'hex') { gg.moveTo(X + c * 0.7, Y); gg.lineTo(X + w - c * 0.7, Y); gg.lineTo(X + w, y); gg.lineTo(X + w - c * 0.7, Y + h); gg.lineTo(X + c * 0.7, Y + h); gg.lineTo(X, y); gg.closePath(); }
    else if (sh === 'box') gg.rect(X, Y, w, h);
    else gg.roundRect(X, Y, w, h, h / 2); };
  g.save(); g.translate(0, h * 0.07); path(g); g.fillStyle = dk(col, 0.2); g.fill(); g.restore(); path(g); g.fillStyle = col; g.fill();
  if (o.ring) { g.strokeStyle = o.ring; g.lineWidth = 4; g.stroke(); }
  lines.forEach((l, i) => txt(g, l, X + w / 2 + (sh === 'pennant' ? c * 0.25 : 0), y - (lines.length - 1) * lh / 2 + i * lh + size * 0.03, { size, col: o.txt || '#fff', weight: 700 }));
  return w;
}
// field(g, n, draw, o): a crowd of copies that RECEDES (a field of skulls, people, sticks): rows from far (high in the frame,
// small, faded toward the ground, blurred) to near (low, big, crisp), each row offset half a step; draw(i, x, y, size).
// o.y0 / o.y1 the far and near row heights, o.s0 / o.s1 copy sizes, o.rows, o.blur far blur px (measured: far rows soft)
function field(g, draw, o = {}) { const rows = o.rows || 8, y0 = o.y0 ?? H * 0.12, y1 = o.y1 ?? H * 0.86, s0 = o.s0 || 40, s1 = o.s1 || 170; let i = 0;
  for (let r = 0; r < rows; r++) { const k = r / Math.max(1, rows - 1), size = lerp(s0, s1, k * k), y = lerp(y0, y1, Math.pow(k, 0.8)), step = size * (o.gap ?? 1.25), bl = (1 - k) * (o.blur ?? 6);
    g.save(); g.globalAlpha *= lerp(o.fade ?? 0.45, 1, k); if (bl > 0.6) g.filter = `blur(${bl.toFixed(1)}px)`;
    for (let x = (r % 2 ? step / 2 : 0) - step; x < W + step; x += step) draw(i++, x, y, size);
    g.restore(); } }
// bar3d(g, x, y, w, h, col, p): a data bar drawn as a cylinder (an ellipse cap, a darker side band), growing to p (0..1)
function bar3d(g, x, y, w, h, col, p = 1) { const hh = h * clamp(p), e = w * 0.16; g.save();
  g.fillStyle = dk(col, 0.12); g.fillRect(x - w / 2, y - hh, w, hh); g.fillStyle = col; g.fillRect(x - w / 2 + w * 0.18, y - hh, w * 0.64, hh);
  g.fillStyle = dk(col, 0.2); ell(g, x, y, w / 2, e); g.fill(); g.fillStyle = lt(col, 0.18); ell(g, x, y - hh, w / 2, e); g.fill(); g.restore(); }
function counter(g, s, a, b, t0, d, x, y, o = {}) { const v = lerp(a, b, ease(s.t, t0, d)); const str = (o.fmt || (n => Math.round(n).toLocaleString('en-US')))(v); txt(g, (o.pre || '') + str + (o.post || ''), x, y, { size: o.size || 150, font: 'H', col: o.col || '#fff', shadow: o.shadow ?? 0, outline: o.outline }); }
// speech bubble with a tail pointing at (tx, ty)
function speech(g, s, x, y, tx, ty, o = {}) { const size = o.size || 46, w = txtW(g, s, size) + size * 1.4, h = size * 1.7; g.save(); g.fillStyle = o.col || '#fff'; rr(g, x - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.beginPath(); g.moveTo(x - 18, y + h / 2 - 4); g.lineTo(tx, ty); g.lineTo(x + 18, y + h / 2 - 4); g.closePath(); g.fill(); g.restore(); txt(g, s, x, y + 2, { size, col: o.txtCol || PAL.ink }); }
function arrow(g, x1, y1, x2, y2, col = '#fff', w = 10, p = 1) { const x = lerp(x1, x2, p), y = lerp(y1, y2, p); cap(g, x1, y1, x, y, w, col); if (p > 0.3) { const a = Math.atan2(y - y1, x - x1), L = w * 3.2; g.save(); g.fillStyle = col; g.beginPath(); g.moveTo(x + Math.cos(a) * L * 0.4, y + Math.sin(a) * L * 0.4); g.lineTo(x + Math.cos(a + 2.5) * L, y + Math.sin(a + 2.5) * L); g.lineTo(x + Math.cos(a - 2.5) * L, y + Math.sin(a - 2.5) * L); g.closePath(); g.fill(); g.restore(); } }

// ── construction measured on four reference frames (deep7): how the style builds a hero object ─────────────────────────────────
// gloss(g, x, y, r, col, o): a glossy round thing as the style shades it: the base, a big darker core-shadow disc (0.66 r) low on the
// side away from the light, a lighter disc (0.37 r) toward the light with a white oval specular in it. o.rim = a white copy offset
// toward the light (0.06 r: the bright edge hero objects carry on the bright skies); o.band a darker wrapping band (a thick round
// stroke round the front, o.bandTilt radians); o.light 'left' (default: light from the upper left) | 'right'.
function gloss(g, x, y, r, col, o = {}) { const m = o.light === 'right' ? -1 : 1;
  g.save(); if (o.rim) { g.fillStyle = o.rim === true ? '#FFFFFF' : o.rim; ell(g, x - m * r * 0.06, y - r * 0.05, r, r); g.fill(); }
  g.fillStyle = col; ell(g, x, y, r, r); g.fill(); g.save(); ell(g, x, y, r, r); g.clip();
  g.fillStyle = o.core || mix(col, '#E8603A', 0.16); ell(g, x + m * r * 0.12, y + r * 0.42, r * 0.66, r * 0.62); g.fill();
  g.fillStyle = o.lit || lt(col, 0.16); ell(g, x - m * r * 0.24, y - r * 0.3, r * 0.42, r * 0.4); g.fill();
  g.fillStyle = '#FFFFFF'; ell(g, x - m * r * 0.3, y - r * 0.36, r * 0.19, r * 0.14, -0.2 * m); g.fill(); g.restore();
  if (o.band) { g.strokeStyle = o.band === true ? mix(col, '#C8601A', 0.3) : o.band; g.lineWidth = r * 0.15; g.lineCap = 'round'; g.beginPath(); g.ellipse(x, y + r * 0.12, r * 0.98, r * 0.36, o.bandTilt ?? 0.22 * m, 0.06 * Math.PI, 0.97 * Math.PI); g.stroke(); }
  g.restore(); }
// cyl(g, x, y, w, h, col, o): one cylinder section (bottles, jars, cans, pipes) as measured on a pill jar: the side split HARD into a
// shadow side (o.split 0.56 of the width, away from the light; 1 = all shadow) and a lit side; the top an ellipse (o.top, a shade
// lighter than the lit side); the bottom edge curved. (x, y) = the centre of the top ellipse; o.e ellipse depth (0.17 of w);
// o.shade / o.lit colours; o.light 'right' (default) | 'left'.
function cyl(g, x, y, w, h, col, o = {}) { const e = w * (o.e ?? 0.17), m = o.light === 'left' ? -1 : 1, sh = o.shade || dk(col, 0.045), xs = x - m * w * (0.5 - (o.split ?? 0.56));
  g.save(); g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y + h); g.ellipse(x, y + h, w / 2, e, 0, Math.PI, 0, true); g.lineTo(x + w / 2, y); g.closePath(); g.fillStyle = o.lit || col; g.fill(); g.clip();
  g.fillStyle = sh; if (m > 0) g.fillRect(x - w, y - 2 * e, xs - x + w, h + 4 * e); else g.fillRect(xs, y - 2 * e, x + w - xs, h + 4 * e); g.restore();
  if (o.top) { g.fillStyle = o.top === true ? col : o.top; ell(g, x, y, w / 2, e); g.fill(); } }
// a highlight stroke (measured): a thick round-capped stroke a shade lighter than the surface, following its curve on the lit side
function hlStroke(g, x, y, rx, ry, a0, a1, w, col) { g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, a0, a1); g.stroke(); g.restore(); }
// jar(g, x, y, w, h, o): a pill / spice jar as the reference builds one: a floor shadow cast to the side away from the light, the body
// (lit side white, shadow side tinted), a lavender collar, the cap (side darker, top lighter, a highlight arc on the top's lit front
// rim, a darker rim at its foot), a label wrapping round the lit side (split dark / light) with three highlight marks.
// (x, y) = bottom centre; o.cap, o.label, o.body (shadow-side tint), o.ground (the floor colour, for the shadow), o.light.
function jar(g, x, y, w, h, o = {}) { const m = o.light === 'left' ? -1 : 1, e = w * 0.17, top = y - h, capH = h * 0.25, colH = h * 0.035, cap_ = o.cap || '#AE2600', lab = o.label || cap_;
  if (o.ground) { g.fillStyle = mix(o.ground, '#005A8C', 0.35); ell(g, x - m * w * 0.12, y - e * 0.3, w * 0.69, w * 0.21); g.fill(); }
  const bTop = top + e + capH + colH;
  cyl(g, x, bTop, w, y - e - bTop, '#FFFFFF', { lit: o.lit || '#FFFFFF', shade: o.body || '#BCE6FF', light: o.light });
  g.save(); g.beginPath(); g.moveTo(x - w / 2, bTop); g.lineTo(x - w / 2, y - e); g.ellipse(x, y - e, w / 2, e, 0, Math.PI, 0, true); g.lineTo(x + w / 2, bTop); g.closePath(); g.clip();
  const lx = x - m * w * 0.19, ly0 = bTop + h * 0.03, ly1 = y - e - h * 0.01; g.fillStyle = dk(lab, 0.045); rr(g, m > 0 ? lx : lx - w, ly0, w, ly1 - ly0, w * 0.13); g.fill();
  g.fillStyle = lab; const xs = x + m * w * 0.06; if (m > 0) g.fillRect(xs, ly0, w, ly1 - ly0); else g.fillRect(xs - w, ly0, w, ly1 - ly0);
  const hc = o.hl || lt(lab, 0.1); for (const [k, len] of [[0.07, 0.3], [0.38, 0.12], [0.7, 0.3]]) hlStroke(g, x, ly0 + (ly1 - ly0) * k, w * 0.48, e * 0.9, m > 0 ? 0.08 : Math.PI - 0.08 - len * 4, m > 0 ? 0.08 + len * 4 : Math.PI - 0.08, w * 0.07, hc);
  g.restore();
  cyl(g, x, bTop - colH, w, colH, o.collar || '#A9B6F5', { split: 0, light: o.light });
  cyl(g, x, top + e, w, capH, cap_, { split: 1, shade: dk(cap_, 0.045), top: cap_, light: o.light });
  g.save(); g.beginPath(); g.ellipse(x, top + e + capH, w / 2, e, 0, 0, Math.PI); g.lineTo(x - w / 2, top + e + capH - h * 0.04); g.ellipse(x, top + e + capH - h * 0.04, w / 2, e, 0, Math.PI, 0, true); g.closePath(); g.fillStyle = dk(cap_, 0.12); g.fill(); g.restore();
  hlStroke(g, x, top + e, w * 0.4, e * 0.62, m > 0 ? 0.05 : Math.PI - 1.3, m > 0 ? 1.3 : Math.PI - 0.05, w * 0.075, o.capHl || mix(cap_, '#FF4A10', 0.55)); }
// sparks(g, t, t0, x, y, R, o): emphasis sparks round a hero that just landed (measured): 8 short round dashes evenly spaced (45
// degrees, the ring turned ~12), 0.2 R long, 0.08 R thick, solid at the OUTER end fading to nothing inward, in the sky's top colour.
// One burst of ~1 s: out from 0.75 R to R (fast start, soft landing, 11 frames), hang 5 frames, then speed outward to ~1.55 R and
// vanish (14 frames). R ~ 2x the hero's radius. o.col, o.n, o.rot degrees.
function sparks(g, t, t0, x, y, R, o = {}) { const f = (t - t0) * FPS; if (f < 0 || f > 30) return; const n = o.n || 8, col = o.col || '#9901E5', len = R * 0.2;
  const r = f < 11 ? R * (0.75 + 0.25 * (1 - Math.pow(1 - f / 11, 2.4))) : f < 16 ? R : R * (1 + 0.55 * Math.pow((f - 16) / 14, 2)), a = f < 2 ? f / 2 : f < 16 ? 1 : 1 - Math.pow((f - 16) / 14, 3);
  g.save(); g.globalAlpha *= a; g.lineCap = 'round'; g.lineWidth = R * 0.08;
  for (let i = 0; i < n; i++) { const an = (o.rot ?? 12) * Math.PI / 180 + i * Math.PI * 2 / n, c = Math.cos(an), sn = Math.sin(an), x0 = x + c * (r - len / 2), y0 = y + sn * (r - len / 2), x1 = x + c * (r + len / 2), y1 = y + sn * (r + len / 2);
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.7, rgba(col, 1)); gr.addColorStop(1, rgba(col, 1)); g.strokeStyle = gr; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  g.restore(); }
// stage(g, t, o): the party / club backdrop (measured): a magenta base, soft pink-white light cones from above that sway and pulse,
// big soft bokeh discs up top. Dancers in front bob on the beat; a dark crowd close to the lens (fgCrowd, heavy blur) in front of them.
function stage(g, t, o = {}) { const base = o.col || '#C24FAA'; bg(g, lt(base, 0.08), base, { end: 1 });
  depth(g, 2.4, () => beams(g, W * 0.55, -120, 5, o.light || '#FFC8EE', { t, spread: 1.5, w: 240, a: 0.2 + 0.05 * Math.sin(t * 4), len: H * 0.95, seed: o.seed || 3 }), { blur: 28 });
  lensBokeh(g, o.seed || 11, 6, ['#FFE2F6', '#FFB4E6'], t, { low: 3, centre: 0.6, a: 0.25, soft: 1.6 }); }

// ── scene changes measured on the reference (besides the hard cuts) ─────────────────────────────────────────────────────────
// xfade: the scene DISSOLVES into the next (~0.3 s) while the hero stays (draw it after) and transforms (grows ~0.6 -> 1 over ~0.5 s
// on glide, its detail swapping to the new look). iris: the next scene's backdrop disc grows out from behind the hero until it fills
// the frame (12 frames, glide) while the hero drops into its new spot, shedding its face and limbs.
function xfade(g, t, t0, d, drawA, drawB) { const p = glide(clamp((t - t0) / d)); if (p < 1) drawA(); if (p > 0) { g.save(); g.globalAlpha *= p; drawB(); g.restore(); } }
function iris(g, t, t0, x, y, r0, drawA, drawB, o = {}) { const p = glide(clamp((t - t0) * FPS / (o.frames || 12))); if (p >= 1) { drawB(); return; } drawA(); if (p <= 0) return;
  const R = lerp(r0, Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * 1.02, p); g.save(); ell(g, x, y, R, R); g.clip(); drawB(); g.restore(); }
// cascade(t, t1, i, n, o): a row or grid of copies leaving (measured): each shrinks to nothing over 6 frames, one frame after its
// neighbour, from the left (o.from 'right'); returns an enter() state for copy i of n.
const cascade = (t, t1, i, n, o = {}) => { const k = o.from === 'right' ? n - 1 - i : i, f = (t - t1 - k * (o.every ?? 1 / FPS)) * FPS;
  return f <= 0 ? { a: 1, sc: 1, x: 0, y: 0 } : { a: 1, sc: 1 - glide(clamp(f / 6)), x: 0, y: 0 }; };

// ── people ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// Measured on 31 reference people frames (deep8; wins over older notes). No outlines, flat fills. Limbs are EVEN tubes with round
// ends and soft round elbows and knees (never sticks that taper to a point); hands are BIG (a palm ~0.38 head widths, four thick
// round fingers, a thumb), open, relaxed, curled or in a fist; the leg (and any limb) on the shadow side is a step darker; ears and
// neck are the skin made deeper; clothes are flat panels: puffy round short sleeves, a crew ring, a crop hem with round corners,
// a belt riding the hips, a cross-body strap.
// person(g, o): a POSABLE figure. o.x, o.y = feet centre on the ground; o.s = head width. o.build 'kz' (the default, measured v2, see
// above) | 'story' (medium-shot
// characters, thick limbs, white eyes) | 'slim' (full-body infographic people: thin arms, long legs, dot eyes, a longer face).
// Arms: o.armL/o.armR shoulder angle in degrees from hanging (+ = out and up, 180 = straight up); o.elbowL/R the forearm's extra turn
// (+ further out/up, - across the body); o.handL/R 'open'|'relax'|'fist'|'curl'|'point'; o.wristL/R turns the hand; o.thumbL/R
// +1/-1 flips the thumb side; o.frontL/R draws that arm IN FRONT of the body (a hand on the belly, chest or chin).
// Legs: o.legL/o.legR hip angle (+ = out), o.kneeL/R the shin's extra turn; o.shoes, o.socks (colour), o.sockH (height from the ankle, past the knee = over-the-knee), o.socksDark, o.sockW [ankle, top], o.sockTop 'flat', o.sockBand/Y/H, o.legSkinDark (the shadow leg's skin), o.shoeL/R false (that foot hidden), o.creaseL/R [[t, len, depth]] (fold steps in a trouser edge);
// o.legJointL/R hip x (s), o.legLenL/R [thigh, shin], o.legWL/R, o.legEndL/R (end width share), o.hipBlock [w, h, r, dx] (the seat).
// Body: o.body overrides any proportion of the build ({torso, leg, neck, sh, hip, arm, up, fore, ...} in head widths); o.tilt leans the upper body (degrees), o.hipX swings the hips sideways, o.hipTilt tilts the belt, o.headTilt, o.light
// 'left' (default) | 'right' (the other leg is darker), o.flip mirrors, o.lean leans everything.
// Clothes: o.top, o.topStyle 'tee' (puffy sleeves + crew ring) | 'vest' (sleeveless over o.under, white by default) | 'tank' (a
// sleeveless crop top with a thick high collar ring) | 'crop' | 'bra' (a sports top: dark band over the chest cut in a V, straps,
// a dark hem band, sleeves to the elbow in o.band) | 'shirt' | 'rolled' (sleeves rolled up with white cuffs) | 'hoodie' | 'coat';
// o.trim (neck ring), o.sleeve (sleeve colour), o.hemW (hem width in heads); o.bottom, o.shorts, o.skirt, o.belt, o.strap, o.bag.
// Every head() option passes on (eyes, brows, hairStyle, turn, mood...).
// ANYTHING the presets lack is drawn by the builder in the same space and by the same rules: o.backFn(g, P) behind the body,
// o.topFn(g, P) over the garment, o.drawFn(g, P) last, where P holds the measured joints {s, shY, hipY, hemY, shW, hipW, arms:
// {L, R} (shoulder sx,sy, elbow ex,ey, wrist wx,wy), legs: {L, R} (hip, knee, ankle)}; head(g, x, y, s, o) takes o.hairFn too.
PAL.skinS = ['#F6B38A', '#EE8A5A', '#E8602F', '#B9502E', '#7A3A26', '#5A2A1E'];   // stylised skin, as the style does
const D2R = Math.PI / 180;
// torso forms (measured shares): o.form overrides the build's shoulder / hem widths and corner rounding (head widths)
const FORMS = { trap: { sh: 1.7, hem: 1.22, rS: 0.3 }, pear: { sh: 1.3, hem: 1.62, rS: 0.5, rH: 0.42, hip: 1.5 }, round: { sh: 1.5, hem: 1.52, rS: 0.62, rH: 0.56 }, tube: { sh: 1.36, hem: 1.36, rS: 0.36, rH: 0.3 } };
// acting poses (the references' people hold, lean, sit, open their arms): person(g, { ...POSE.present, x, y, s, ... }). Arm angles
// in degrees from hanging (+ out and up), elbows the forearm's extra turn (- across the body).
const POSE = {
  stand: { armL: 12, elbowL: 10, armR: 14, elbowR: 12, hipX: 0.04 },
  present: { armL: 10, elbowL: 8, armR: 58, elbowR: 52, handR: 'open', wristR: -14, headTilt: -4, turn: 0.22 },
  point: { armL: 10, elbowL: 8, armR: 88, elbowR: 2, handR: 'point', turn: 0.3, tilt: -3 },
  wide: { armL: 62, elbowL: 14, armR: 62, elbowR: 14, handL: 'open', handR: 'open' },
  shrug: { armL: 34, elbowL: 78, armR: 34, elbowR: 78, handL: 'open', handR: 'open', headTilt: 7, mood: 'smug' },
  cheer: { armL: 158, elbowL: 10, armR: 158, elbowR: 10, handL: 'fist', handR: 'fist' },
  belly: { armL: 6, elbowL: -112, frontL: true, armR: 6, elbowR: -112, frontR: true, handL: 'relax', handR: 'relax' },
  think: { armL: 4, elbowL: -100, frontL: true, armR: 10, elbowR: -158, frontR: true, handR: 'fist', armLenR: [0.66, 0.74], headTilt: 6, turn: 0.2, look: 0.6 },
  worry: { armL: 12, elbowL: -164, frontL: true, handL: 'open', armR: 12, elbowR: -164, frontR: true, handR: 'open', armLenL: [0.66, 0.78], armLenR: [0.66, 0.78], mood: 'worried' },
  wave: { armL: 10, elbowL: 8, armR: 128, elbowR: 30, handR: 'open', turn: 0.15 },
  hold: { armL: 22, elbowL: -78, frontL: true, armR: 22, elbowR: -78, frontR: true, handL: 'curl', handR: 'curl' },
  walk: { legL: 14, kneeL: -6, legR: -12, kneeR: 18, armL: -12, elbowL: 10, armR: 20, elbowR: 16, turn: 0.4 },
};
// MEASURED v2 (179 people boxed in the references, stylelab/people_vision.py): a figure is ~3.9 heads tall (the old 'story' build
// was 5.4), legs 40 % of the height, shoulders 1.7 head widths, a short neck (0.4 wide), thick arms (0.4) that taper, big hands
// (half a head long); a ROUND head (w/h ~0.9); DOT eyes in 59 % (white eyes mostly in close-ups), wide-set (0.42 of the head) at
// the middle of the face (0.52 down), 0.17 wide; no nose in 64 %, no mouth in 45 % (60 % of full-body figures: a mouth when they
// speak or feel something, a small smile curve or an 'o'), no brows in 60 % (they come with a feeling), small round ears or none;
// torso trapezoid with wide shoulders 34 %, tube 22 %, round 21 %, pear 17 % (full-body figures: pear 37 %), never a plain
// rectangle; shading SIDE TWO-TONE 43 % (the side away from the light a step darker on the torso, the far arm and leg, the face)
// or one crescent 21 %; ~3 small details each: collar 39 %, neck shadow 38 %, fingers 36 %, blush 25 %, cuffs 23 %, shoe soles
// 22 %, seams 20 %. Hair hugs the skull: a cap with a side swoop or fringe, a bob, a bun, a curly cap, a tuft or cowlick on top.
// They ACT: holding things, leaning, sitting, arms out wide, hands folded on the belly, three-quarter turns (see POSE).
// 'kz' (the default) is that build; o.form 'trap' | 'pear' | 'round' | 'tube' picks the torso.
const BUILDS = {   // proportions in head widths ('story' = the earlier club dancers, 'slim' = the "average person" infographic)
  kz: { leg: 1.72, torso: 1.2, neck: 0.5, neckW: 0.34, sh: 1.84, hem: 1.22, waist: 1.3, hip: 1.3, arm: 0.42, armEnd: 0.3, up: 0.6, fore: 0.6, legW: 0.62, legEnd: 0.82, skinLeg: 0.42,
    eyes: 'dot', chin: 0.5, jaw: 'round', rS: 0.3, rH: 0.3, ay: 0.2, puff: [0.14, 0.27, 0.27], shoe: 0.29, hand: 1.25, tone: true, details: true, armDef: [12, 10, 14, 12],
    face: { eyeX: 0.22, eyeS: 1.12, eyeUp: 0.06, earS: 0.7, nose: 'none', brows: 'auto', mouth: 'auto', hairStyle: 'swoop' } },
  story: { leg: 2.9, torso: 1.62, sh: 1.37, waist: 1.09, hip: 1.12, arm: 0.34, armEnd: 0.33, up: 0.72, fore: 0.88, legW: 0.7, skinLeg: 0.4, neck: 0.64, eyes: 'white', chin: 0.52,
    rS: 0.3, ay: 0.19, puff: [0.24, 0.42, 0.42], shoe: 0.24, hand: 1.2 },
  slim: { leg: 3.14, torso: 2.08, sh: 1.56, waist: 1.77, hip: 1.62, arm: 0.3, armEnd: 0.14, up: 0.62, fore: 0.64, legW: 0.74, legEnd: 0.78, shoe: 0.3, skinLeg: 0.3, neck: 0.54, eyes: 'dot', chin: 0.47,
    rS: 0.62, ax: 1.0, ay: 0.92, puff: [-0.16, 0.42, 0.36], head: 1.12, face: { eyeX: 0.22, eyeS: 1.16, earS: 1.1, earY: 0.05 } },
};
// limb(g, pts, w1, w2, col): a tube through the joints, round at both ends and at every joint (w1 at the root, w2 at the tip)
function limb(g, pts, w1, w2, col) { const n = pts.length - 1, wAt = i => lerp(w1, w2 ?? w1, i / n); g.save(); g.fillStyle = col;
  for (let i = 0; i < n; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, c = Math.cos(a), d = Math.sin(a), u = wAt(i) / 2, v = wAt(i + 1) / 2;
    g.beginPath(); g.moveTo(x1 + c * u, y1 + d * u); g.lineTo(x2 + c * v, y2 + d * v); g.lineTo(x2 - c * v, y2 - d * v); g.lineTo(x1 - c * u, y1 - d * u); g.closePath(); g.fill(); }
  pts.forEach((p, i) => { ell(g, p[0], p[1], wAt(i) / 2, wAt(i) / 2); g.fill(); }); g.restore(); }
// point at fraction f along a joint chain
function along3(pts, f) { const L = []; let T = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); T += l; }
  let d = clamp(f) * T; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { if (d <= L[i - 1]) { const k = d / L[i - 1]; out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]); return out; } d -= L[i - 1]; out.push(pts[i]); } return out; }
// hand(g, x, y, ang, s, pose, col, o): a hand at the wrist x, y pointing along ang (radians), s = head width (measured: palm ~0.38 s
// wide, fingers ~0.22 s long and 0.1 s thick, round tips, a thumb near the wrist). pose 'open' (fanned, palm out) | 'relax' (fingers
// together) | 'fist' | 'curl' (hooked over something, seen from the back, knuckle bumps) | 'point'. o.side +1/-1 = thumb side,
// o.thumbBack draws the thumb in deep skin behind, o.size scales it.
function hand(g, x, y, ang, s, pose = 'relax', col = '#E8602F', o = {}) {
  const k = o.size ?? 1, F = s * 0.118, FL = o.fingerL ?? 1; g.save(); g.translate(x, y); g.rotate(ang - Math.PI / 2); g.scale((o.side ?? 1) * k, k); if (o.probe) (window.PROBE = window.PROBE || {})[o.probe] = { m: g.getTransform().toJSON(), s };
  const fing = (ax, ay, a, L, c = col, w = F) => cap(g, ax * s, ay * s, ax * s + Math.sin(a) * L * FL * s, ay * s + Math.cos(a) * L * FL * s, w, c), tc = o.thumbBack ? deep(col) : col;
  if (typeof pose === 'object') { g.fillStyle = pose.thumbCol || deep(col); if (pose.under) { spline(g, pose.under, s); g.fill(); } g.fillStyle = col; spline(g, pose.pts, s); g.fill(); if (pose.over) { g.fillStyle = pose.thumbCol || deep(col); spline(g, pose.over, s); g.fill(); } }   // a measured hand: {pts, under, over} outlines in hand space (y toward the fingers, s units)
  else if (pose === 'open') { fing(0.16, 0.08, 0.95, 0.14, tc); g.fillStyle = col; ell(g, 0, s * 0.17, s * 0.2, s * 0.18); g.fill();
    [[-0.125, -0.3, 0.14], [-0.042, -0.1, 0.18], [0.042, 0.08, 0.185], [0.125, 0.26, 0.16]].forEach(([fx, a, L]) => fing(fx, 0.25, a, L)); }
  else if (pose === 'fist' || pose === 'point') { g.fillStyle = col; ell(g, 0, s * 0.18, s * 0.2, s * 0.19); g.fill();
    for (const fx of [-0.12, -0.04, 0.04, 0.12]) { ell(g, fx * s, s * 0.31, s * 0.062, s * 0.062); g.fill(); }
    if (pose === 'point') fing(0.06, 0.28, 0.02, 0.26); fing(0.17, 0.1, -0.5, 0.15, tc); }
  else if (pose === 'curl') { fing(0.15, 0.1, 2.15, 0.11, tc, F * 1.15); g.fillStyle = col; rr(g, -s * 0.19, 0, s * 0.38, s * 0.33, s * 0.12); g.fill();
    for (const [fx, fy] of [[-0.13, 0.31], [-0.04, 0.34], [0.05, 0.34], [0.13, 0.3]]) { ell(g, fx * s, fy * s, s * 0.066, s * 0.066); g.fill(); }
    fing(-0.15, 0.3, -2.3, 0.1); }
  else { fing(0.15, 0.1, 0.62, 0.13, tc); g.fillStyle = col; ell(g, 0, s * 0.17, s * 0.18, s * 0.17); g.fill();
    [[-0.11, -0.13, 0.15], [-0.037, -0.04, 0.19], [0.037, 0.04, 0.2], [0.11, 0.12, 0.17]].forEach(([fx, a, L]) => fing(fx, 0.25, a, L)); }
  g.restore(); }
function person(g, o) {
  const M0 = (o.reachL || o.reachR) && g.getTransform();
  const B = { ...(BUILDS[o.build] || BUILDS.kz), ...(FORMS[o.form] || {}), ...(o.body || {}) };
  if ((!BUILDS[o.build] || o.build === 'kz') && !o.kid) { B.leg = clamp(B.leg, 1.58, 1.9); B.torso = clamp(B.torso, 1.08, 1.32); }   /* the style's person: ~3.8 heads, legs ~37 %, shoulders wide; a body override can tune, never turn it into a stubby mascot (o.kid: a child, shorter, free) */
  const s = o.s || 150, t = o.t || 0, skin = o.skin || PAL.skinS[2], top = o.top || o.shirt || PAL.teal, bot = o.bottom || o.pants || '#25236A';
  // the life loop (measured v2: whole bodies keep moving): breathing ~1.2 s, the whole figure rocking on its feet ±1.8° (~2.4 s),
  // free arms swinging ±6° at the shoulder (~1.7 s); o.idle scales it all (0 = a still figure)
  const idl = (o.idle ?? 1) * (MOTION.life ? 1.7 : 1), sd0 = o.seed || 0, breathe = 1 + Math.sin(t * 5.2 + sd0) * 0.02 * idl, rock = Math.sin(t * 2.6 + sd0 * 1.3) * 1.8 * idl * D2R,
    swing = (K, ph) => o['front' + K] ? 0 : (Math.sin(t * 3.7 + sd0 + ph) * 6 + Math.sin(t * 2.6 + sd0 * 1.3 - 0.55 - ph * 0.2) * 2.4) * idl * (o['arm' + K] != null ? 0.6 : 1), ts = o.topStyle || 'tee', skin0 = o.armSkin || skin, armSkin = skin0, neckSkin = deep(skin);
  const legH = s * B.leg, torsoH = s * B.torso, shW = s * (o.shW ?? B.sh), hipW = s * (o.hipW ?? B.hip), hipY = -legH, shY = hipY - torsoH, headY = shY - s * B.neck;
  const crop = ts === 'crop' || ts === 'tank' || ts === 'bra', hemY = crop ? shY + torsoH * (o.hem ?? 0.66) : hipY + s * (o.hemDrop ?? 0.06), waistW = s * (o.hemW ?? (crop ? B.waist : B.hem ?? Math.max(B.sh, B.waist)));
  const aw = s * (o.armW ?? B.arm), aw2 = s * (o.armW ?? B.armEnd), shoeH = s * (B.shoe ?? 0.22), hipX = (o.hipX || 0) * s, lightL = o.light !== 'right';
  const band = o.band || mix(top, '#2A1A8A', 0.38);
  g.save(); g.translate(o.x, o.y); if (o.flip) g.scale(-1, 1); if (o.lean) g.rotate(o.lean * D2R);
  if (o.ground && !o.only) floorShadow(g, 0, 0, s * 1.9, o.ground);
  g.rotate(rock);
  // joints
  const P = { s, shY, hipY, hemY, shW, hipW, arms: {}, legs: {} };
  for (const side of [-1, 1]) { const K = side < 0 ? 'L' : 'R', a = (o['leg' + K] ?? 3) * D2R, b = (o['knee' + K] ?? 0) * D2R, LL = o['legLen' + K] || [], th = LL[0] != null ? LL[0] * s : legH * 0.5, sh_ = LL[1] != null ? LL[1] * s : legH * 0.5 - shoeH;   // o.legLenL/R [thigh, shin] in s (a shin near 0 = foreshortened, no shoe)
    const lj = o['legJoint' + K], hx = hipX + (lj != null ? lj * s : side * hipW * 0.24), kx = hx + side * Math.sin(a) * th, ky = hipY + Math.cos(a) * th, ax = kx + side * Math.sin(a + b) * sh_, ay = ky + Math.cos(a + b) * sh_;
    P.legs[K] = { hx, hy: hipY, kx, ky, ax, ay }; }
  const tilt = ((o.tilt || 0) + Math.sin(t * 1.15 + sd0 * 0.7) * 1.3 * idl) * D2R;   /* creator 2026-10-27 "frozen": the upper body sways ±1.3° over the planted legs (~5.5 s), the arms trail the rock (follow-through) */
  for (const side of [-1, 1]) { const K = side < 0 ? 'L' : 'R', AD = B.armDef || [8, 6, 8, 6], a = ((o['arm' + K] ?? AD[side < 0 ? 0 : 2]) + swing(K, side * 1.1)) * D2R, b = ((o['elbow' + K] ?? AD[side < 0 ? 1 : 3]) + swing(K, side * 1.1 + 0.6) * 1.2) * D2R, AL = o['armLen' + K] || [], up = s * (AL[0] ?? B.up), fore = s * (AL[1] ?? B.fore);   // o.armLenL/R [upper, fore] in s: one arm longer (foreshortening, a reach)
    const jt = o['joint' + K], sx = jt ? jt[0] * s : side * (B.ax ? s * B.ax : shW / 2 - aw * 0.42), sy = shY + s * (jt ? jt[1] : B.ay), ex = sx + side * Math.sin(a) * up, ey = sy + Math.cos(a) * up, wx = ex + side * Math.sin(a + b) * fore, wy = ey + Math.cos(a + b) * fore;
    P.arms[K] = { sx, sy, ex, ey, wx, wy }; }
  if (!o.only) mark(g, 'cast', -Math.max(shW, hipW) / 2 - aw, headY - s * 0.95, Math.max(shW, hipW) / 2 + aw, 0, o.on ? 'person on' : 'person'); for (const A of Object.values(P.arms)) mark(g, 'hand', A.wx - s * 0.22, A.wy - s * 0.22, A.wx + s * 0.22, A.wy + s * 0.22, 'hand');
  // legs (behind everything): the shadow-side leg a step darker; trousers, or shorts over skin legs; socks; dome shoes
  const legDraw = side => { const K = side < 0 ? 'L' : 'R', J = P.legs[K], dark = (side > 0) === lightL, pts = [[J.hx, J.hy], [J.kx, J.ky], [J.ax, J.ay]];
    const pc = dark ? o.legDark || mix(bot, deep(bot), o.legDk ?? 0.6) : bot, sk = dark ? o.legSkinDark || mix(skin, neckSkin, 0.7) : skin;
    if (o.shorts || o.skirt) { const Lsk = Math.hypot(J.kx - J.hx, J.ky - J.hy) + Math.hypot(J.ax - J.kx, J.ay - J.ky), skTo = o.socks && o.sockW ? Math.min(1, (Lsk - (o.sockH ?? 0.18) * s + s * 0.1) / Lsk) : 1;   // a measured sock (o.sockW) hides the skin it covers
      limb(g, along3(pts, skTo), s * B.skinLeg, s * B.skinLeg * 0.92, sk);
      if (o.socks) { const Ls = Math.hypot(J.kx - J.ax, J.ky - J.ay), Lt = Math.hypot(J.hx - J.kx, J.hy - J.ky), Hs = (o.sockH ?? 0.18) * s, SW = o.sockW || [], swA = SW[0] != null ? SW[0] * s : s * B.skinLeg * 1.05, sw = SW[1] != null ? SW[1] * s : swA, sc = dark ? o.socksDark || dk(o.socks, 0.05) : o.socks;
        // o.sockH runs up from the ankle; taller than the shin it goes on up the thigh (over-the-knee socks). at(d): point + direction d along it
        const at = d => d <= Ls ? [lerp(J.ax, J.kx, d / Ls), lerp(J.ay, J.ky, d / Ls), (J.kx - J.ax) / Ls, (J.ky - J.ay) / Ls] : [lerp(J.kx, J.hx, Math.min(1, (d - Ls) / Lt)), lerp(J.ky, J.hy, Math.min(1, (d - Ls) / Lt)), (J.hx - J.kx) / Lt, (J.hy - J.ky) / Lt];
        const flat = o.sockTop === 'flat', dT = flat ? Hs - sw / 2 : Hs, T = at(dT), path = [[J.ax, J.ay]]; if (dT > Ls) path.push([J.kx, J.ky]); path.push([T[0], T[1]]); limb(g, path, swA, sw, sc);   // o.sockW [ankle, top] in s: the sock tapers like the calf
        if (flat) { const q = at(Hs), n = [-q[3] * sw / 2, q[2] * sw / 2];   // o.sockTop 'flat': a straight cut top, square to the leg there
          g.fillStyle = sc; g.beginPath(); g.moveTo(T[0] + n[0], T[1] + n[1]); g.lineTo(q[0] + n[0], q[1] + n[1]); g.lineTo(q[0] - n[0], q[1] - n[1]); g.lineTo(T[0] - n[0], T[1] - n[1]); g.closePath(); g.fill(); }
        if (o.sockBand) { const P_ = at(o.sockBandY != null ? Hs - o.sockBandY * s : Hs * 0.95), bw = (o.sockW ? sw : s * B.skinLeg * 1.05) * 1.01, bh = s * (o.sockBandH ?? 0.1); g.save(); g.translate(P_[0], P_[1]); g.rotate(Math.atan2(P_[3], P_[2]) - Math.PI / 2); g.fillStyle = o.sockBand; g.fillRect(-bw / 2, -bh / 2, bw, bh); g.restore(); } }
      }
    else { const L = Math.hypot(J.kx - J.hx, J.ky - J.hy) + Math.hypot(J.ax - J.kx, J.ay - J.ky);
      if (o.socks) limb(g, [along3(pts, 1 - s * 0.2 / L).pop(), [J.ax, J.ay]], s * B.skinLeg * 1.1, s * B.skinLeg * 1.1, o.socks);
      const lw = s * (o['legW' + K] ?? B.legW), lw2 = lw * (o['legEnd' + K] ?? B.legEnd ?? 0.84), CR = o['crease' + K];
      if (CR) { const Lh = Math.hypot(J.kx - J.hx, J.ky - J.hy), u = [(J.kx - J.hx) / Lh, (J.ky - J.hy) / Lh], n = [side * u[1], -side * u[0]], E = d => { const w = lerp(lw, lw2, d / L) / 2; return [J.hx + u[0] * d + n[0] * w, J.hy + u[1] * d + n[1] * w]; };
        g.save(); g.beginPath(); g.rect(-1e4, -1e4, 2e4, 2e4);   // o.creaseL/R [[t, len, depth], ...]: fabric folds, a step cut into the outer edge that ends at t of the thigh
        CR.forEach(([t, len, dep]) => { const A = E(t * Lh - len * s), C = E(t * Lh); g.moveTo(A[0] + n[0] * 3, A[1] + n[1] * 3); g.lineTo(C[0] - n[0] * dep * s, C[1] - n[1] * dep * s); g.lineTo(C[0] + n[0] * 3, C[1] + n[1] * 3); g.closePath(); }); g.clip('evenodd'); }
      limb(g, along3(pts, o.socks ? 1 - (s * 0.2 + lw2 / 2) / L : 1), lw, lw2, pc); if (CR) g.restore(); }
    if ((o['legLen' + K] || [])[1] < 0.05 || o['shoe' + K] === false) return; const shc = o.shoes || '#6A2E2A'; g.fillStyle = dark ? dk(shc, 0.06) : shc; g.beginPath(); g.ellipse(J.ax + side * s * 0.05, J.ay + shoeH, s * 0.27, shoeH * 1.08, 0, Math.PI, 0); g.closePath(); g.fill();
    if (o.details ?? B.details) { g.fillStyle = o.sole || mix(shc, '#FFFFFF', 0.55); rr(g, J.ax + side * s * 0.05 - s * 0.28, J.ay + shoeH * 0.78, s * 0.56, shoeH * 0.3, shoeH * 0.15); g.fill(); } };   // shoe soles
  if (!o.only) { legDraw(lightL ? 1 : -1); legDraw(lightL ? -1 : 1); }
  // the hip block joins the legs (trousers / shorts / skirt)
  if (o.only) {} else if (o.shorts) { const ht = (o.hipTilt || 0) * D2R, rot = (x, y) => [hipX + x * Math.cos(ht) - y * Math.sin(ht), hipY + x * Math.sin(ht) + y * Math.cos(ht)], hem = {}, hf = o.hemFlat ?? 0.7;
    // measured: wide round shorts, the hems nearly LEVEL (not square to the thigh), a small notch between the legs (o.notch, the round stroke fills ~0.07 s back), big round corners
    for (const side of [-1, 1]) { const K = side < 0 ? 'L' : 'R', J = P.legs[K], pts = [[J.hx, J.hy], [J.kx, J.ky], [J.ax, J.ay]], E = along3(pts, o.shortsL ?? 0.3).pop(),
        ha = lerp(Math.atan2(J.ky - J.hy, J.kx - J.hx) - Math.PI / 2, 0, hf), w = s * B.skinLeg * (o.flare ?? 1.35) / 2, ux = Math.cos(ha) * side * w, uy = Math.sin(ha) * side * w;
      const fo = 1 + (o.flareOut ?? 0.12) * s / w; hem[K] = { o: [E[0] + ux * fo, E[1] + uy * fo], i: [side < 0 ? Math.min(E[0] - ux, hipX - s * 0.09) : Math.max(E[0] - ux, hipX + s * 0.09), E[1] - uy] }; }   // A-line: the outer side flares past the waist
    const cr = [(hem.L.i[0] + hem.R.i[0]) / 2, Math.max(hipY + s * 0.05, Math.min(hem.L.i[1], hem.R.i[1]) - s * (o.notch ?? 0.26))], sw = o.shortsW ?? 0.5;
    const st = -s * (o.shortsTop ?? 0.22); let poly = [rot(-hipW * sw, st), hem.L.o, hem.L.i, cr, hem.R.i, hem.R.o, rot(hipW * sw, st)];   // the top hides under the belt (o.shortsTop lower = a round top corner shows below it)
    const r = s * (o.shortsR ?? 0.07), cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    poly = poly.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x - (x - cx) / d * r, y - (y - cy) / d * r]; });   // inset by r, then a 2r round stroke = round corners
    const pc = o.shortsCol || bot; g.fillStyle = pc; g.strokeStyle = pc; g.lineWidth = r * 2; g.lineJoin = 'round'; g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke(); }
  else if (!o.skirt) { const bw = Math.min(hipW, hipW * 0.48 + s * B.legW * (o.shorts ? 1.05 : 1)), dkc = o.legDark || mix(bot, deep(bot), o.legDk ?? 0.6); g.save(); g.translate(hipX, hipY); g.rotate((o.hipTilt || 0) * D2R);
    const HB = o.hipBlock; if (HB) rr(g, (HB[3] || 0) * s - HB[0] * s / 2, -s * 0.32, HB[0] * s, HB[1] * s, HB[2] * s); else rr(g, -bw / 2, -s * 0.32, bw, s * 0.34, s * 0.12); g.clip(); const hs = (o.hipSplit || 0) * s; g.fillStyle = lightL ? bot : dkc; g.fillRect(-bw, -s, bw + hs, s * 2); g.fillStyle = lightL ? dkc : bot; g.fillRect(hs, -s, bw, s * 2); g.restore(); }   // o.hipSplit: where the shadow half starts (s); o.hipBlock [w, h, r, dx] in s: a measured seat
  else { g.fillStyle = o.skirt === true ? bot : o.skirt; g.beginPath(); g.moveTo(hipX - hipW * 0.46, hipY - s * 0.3); g.lineTo(hipX + hipW * 0.46, hipY - s * 0.3); g.lineTo(hipX + hipW * 0.62, hipY + s * 0.62); g.lineTo(hipX - hipW * 0.62, hipY + s * 0.62); g.closePath(); g.fill(); }
  // the upper body leans around the hips
  g.save(); g.translate(hipX, hipY); g.rotate(tilt); g.translate(-hipX, -hipY);
  // o.reachL / o.reachR [x, y] in the caller's space: two-bone IK, the WRIST lands on the target in one unbroken arm, the elbow bending
  // down (o.elbowUpL / R: up). Never draw a separate arm by hand: an arm that must pass in front of a desk or prop is drawn with a
  // second call, o.only 'L' | 'R' (that arm and its sleeve alone, same options), after the prop; the first call hides it (o.hideL / R).
  for (const side of [-1, 1]) { const K = side < 0 ? 'L' : 'R', T = o['reach' + K]; if (!T) continue;
    const q = g.getTransform().inverse().multiply(M0).transformPoint(new DOMPoint(T[0], T[1])), J = P.arms[K], AL = o['armLen' + K] || [], up = s * (AL[0] ?? B.up), fore = s * (AL[1] ?? B.fore);
    const dx = q.x - J.sx, dy = q.y - J.sy, d = clamp(Math.hypot(dx, dy), Math.abs(up - fore) + 1, up + fore - 0.5), th = Math.atan2(dy, dx), al = Math.acos(clamp((up * up + d * d - fore * fore) / (2 * up * d), -1, 1));
    const e1 = [J.sx + Math.cos(th + al) * up, J.sy + Math.sin(th + al) * up], e2 = [J.sx + Math.cos(th - al) * up, J.sy + Math.sin(th - al) * up], E = (e1[1] > e2[1]) !== !!o['elbowUp' + K] ? e1 : e2;
    P.arms[K] = { sx: J.sx, sy: J.sy, ex: E[0], ey: E[1], wx: J.sx + Math.cos(th) * d, wy: J.sy + Math.sin(th) * d }; }
  const hX = (o.headX || 0) * s, headAt = (tt, fn) => { const piv = headY + s * 0.46; g.save(); g.translate(hX, piv + Math.sin(tt * 3.5 + (o.seed || 0) - 0.6) * s * 0.03 * idl - torsoH * (breathe - 1));
    g.rotate(Math.sin(tt * 3.1 + (o.seed || 0) + 1) * 0.026 * idl + (o.headTilt || 0) * D2R); g.translate(0, -piv); fn(); g.restore(); };
  const sleeveOf = { tee: 'puff', vest: 'puff', shirt: 1, coat: 1, hoodie: 1, rolled: 0.5, bra: 0.48 }[ts] ?? 0, slCol0 = o.sleeve || (ts === 'vest' ? o.under || '#F2F2F8' : ts === 'bra' ? band : sleeveOf === 'puff' ? dk(top, 0.05) : dk(top, 0.03)), slCol = slCol0;
  const puffOf = side => { const slCol = (o.tone ?? B.tone) && ((side > 0) === lightL) ? dk(slCol0, 0.06) : slCol0, J = P.arms[side < 0 ? 'L' : 'R'], a = Math.atan2(J.ey - J.sy, J.ex - J.sx), [po, pa, pb] = B.puff, cx = J.sx + Math.cos(a) * s * po, cy = J.sy + Math.sin(a) * s * po; g.fillStyle = slCol; ell(g, cx, cy, s * (o.puff ?? pa), s * pb, a); g.fill(); };
  const foreDraw = side => { const K = side < 0 ? 'L' : 'R', J = P.arms[K], pose = o['hand' + K] || 'relax', wk = o['armW' + K], W = wk != null ? [].concat(wk) : null;   // the forearm and hand alone, over the sleeve (o.foreOverL/R) or, with o.frontL/R = 'fore', over the head
    const aw = W ? s * W[0] : s * (o.armW ?? B.arm), aw2 = W ? s * W[W.length - 1] : s * (o.armW ?? B.armEnd), ha = Math.atan2(J.wy - J.ey, J.wx - J.ex) + (o['wrist' + K] || 0) * D2R * side;
    limb(g, [[J.ex, J.ey], [J.wx, J.wy]], W && W.length > 2 ? s * W[1] : lerp(aw, aw2, 0.5), aw2, armSkin);
    hand(g, J.wx, J.wy, ha, s, pose, armSkin, { side: o['thumb' + K] ?? (pose === 'open' ? side : -side), thumbBack: pose === 'curl', size: o.handSize ?? B.hand, probe: o.probe && o.probe + K }); };
  const armDraw = side => { const K = side < 0 ? 'L' : 'R', J = P.arms[K], pts = [[J.sx, J.sy], [J.ex, J.ey], [J.wx, J.wy]], pose = o['hand' + K] || 'relax', wk = o['armW' + K];
    const far = (o.tone ?? B.tone) && ((side > 0) === lightL), armSkin = far ? mix(skin, neckSkin, 0.5) : skin0, slCol = far ? dk(slCol0, 0.06) : slCol0;   // side two-tone: the arm away from the light a step darker
    const aw = wk != null ? s * [].concat(wk)[0] : s * (o.armW ?? B.arm), aw2 = wk != null ? s * [].concat(wk).pop() : s * (o.armW ?? B.armEnd), fo = o['foreOver' + K];   // o.armWL/armWR [shoulder, (elbow,) wrist]; o.foreOverL/R: the forearm in front of the sleeve (a raised arm); o.sleeveLenL/R: how far down the arm the sleeve goes (0-1)
    limb(g, pts, aw, aw2, armSkin);
    const ha = Math.atan2(J.wy - J.ey, J.wx - J.ex) + (o['wrist' + K] || 0) * D2R * side;
    hand(g, J.wx, J.wy, ha, s, pose, armSkin, { side: o['thumb' + K] ?? (pose === 'open' ? side : -side), thumbBack: pose === 'curl', size: o.handSize ?? B.hand, probe: o.probe && o.probe + K });
    if (sleeveOf === 'puff') { if (!o['sleeveFront' + K]) puffOf(side); }
    else if (sleeveOf) { limb(g, along3(pts, o['sleeveLen' + K] ?? sleeveOf), aw * 1.12, aw2 * 1.12, slCol);
      if ((o.details ?? B.details) && sleeveOf === 1 && ts !== 'rolled') { const c1 = along3(pts, 0.97).pop(), c0 = along3(pts, 0.86).pop(); limb(g, [c0, c1], aw2 * 1.2, aw2 * 1.2, o.cuff || lt(slCol, 0.14)); }   // cuffs
      if (fo && o['front' + K] !== 'fore') foreDraw(side); if (ts === 'rolled') { const c = along3(pts, 0.5).pop(), p0 = along3(pts, 0.44).pop(); limb(g, [p0, c], aw * 1.22, aw * 1.22, o.cuff || '#FFFFFF'); } } };
  if (o.only) { armDraw(o.only === 'L' ? -1 : 1); g.restore(); g.restore(); return P; }
  if (o.backFn) o.backFn(g, P);
  const hS = s * (B.head ?? 1);
  headAt(t - 0.1, () => hairBack(g, 0, headY, hS, { ...(B.face || {}), ...o }));     // long hair hangs BEHIND the shoulders, never over the shirt
  if ((!o.frontL || o.frontL === 'fore') && !o.hideL) armDraw(-1); if ((!o.frontR || o.frontR === 'fore') && !o.hideR) armDraw(1);
  g.save(); g.translate(0, hipY); g.scale(1, breathe); g.translate(0, -hipY);
  // neck (deep skin), midriff, belt, then the garment
  const nW = s * (o.neckW ?? B.neckW ?? 0.42), nX = hX + (o.neckX || 0) * s; g.fillStyle = neckSkin; rr(g, nX - nW / 2, headY + s * 0.2, nW, shY - headY, s * 0.1); g.fill();
  if (crop) { const mW = o.midW != null ? o.midW * s : waistW - s * 0.08, mX = (o.midX || 0) * s; g.fillStyle = skin; rr(g, mX - mW / 2, hemY - s * 0.2, mW, hipY - hemY + s * 0.1, s * 0.08); g.fill(); }   // o.midW / o.midX: the bare midriff's width and offset (s)
  const belt = () => { if (!o.belt) return; g.save(); g.translate(hipX, hipY - s * (o.beltY ?? 0.2)); g.rotate((o.beltTilt ?? o.hipTilt ?? 0) * D2R); const bw = o.beltW != null ? o.beltW * s : hipW * 1.06, bh = s * (o.beltH ?? 0.22); g.fillStyle = o.belt; rr(g, (o.beltX || 0) * s - bw / 2, -bh / 2, bw, bh, o.beltR != null ? o.beltR * s : bh / 2); g.fill(); g.restore(); };   // o.beltW / beltH / beltX in s
  if (crop) belt();
  const rS = s * (o.rS ?? B.rS), rSY = s * (o.rSY ?? o.rS ?? B.rS), cut = o.shCut || 0, rH = s * (crop ? 0.16 : B.rH ?? 0.3), hw2 = waistW / 2;   // o.rSY: how far the shoulders slope down (a tank top); o.shCut 0-1: round to straight-cut shoulders
  const torso = gg => { gg.beginPath(); gg.moveTo(-shW / 2 + rS, shY); gg.lineTo(shW / 2 - rS, shY); gg.quadraticCurveTo(lerp(shW / 2, shW / 2 - rS / 2, cut), shY + rSY / 2 * cut, shW / 2, shY + rSY);
    gg.lineTo(hw2, hemY - rH); gg.quadraticCurveTo(hw2, hemY, hw2 - rH, hemY); gg.lineTo(-hw2 + rH, hemY); gg.quadraticCurveTo(-hw2, hemY, -hw2, hemY - rH);
    gg.lineTo(-shW / 2, shY + rSY); gg.quadraticCurveTo(lerp(-shW / 2, -shW / 2 + rS / 2, cut), shY + rSY / 2 * cut, -shW / 2 + rS, shY); gg.closePath(); };
  flat(g, torso, top, shW, { shade: o.shade === true, sx: 0.1, sy: 0.02, k: 0.08, rim: o.rim });
  const tone = o.tone ?? B.tone, det = o.details ?? B.details;
  if (tone || det) { g.save(); torso(g); g.clip();
    if (det && !crop) { g.fillStyle = dk(top, 0.05); g.fillRect(-shW, hemY - s * 0.13, shW * 2, s * 0.2); }   // a hem band (sweaters, coats)
    if (tone) { g.fillStyle = rgba(dk(top, 0.22), 0.42); const sx_ = (lightL ? 1 : -1) * shW * (o.toneX ?? 0.14); g.fillRect(lightL ? sx_ : -shW * 2 + sx_, shY - s, shW * 2, torsoH + s * 2); }   // side two-tone: the half away from the light
    g.restore(); }
  if (ts === 'bra') { g.save(); torso(g); g.clip(); g.fillStyle = band; g.beginPath(); g.moveTo(-shW, shY - s); g.lineTo(shW, shY - s);
    if (o.braV) [...o.braV].reverse().forEach(([u, v]) => g.lineTo(u * s, shY + v * s));   // o.braV: the measured cup line, left to right ([x, y below the shoulders] in s)
    else { g.lineTo(shW, shY + torsoH * 0.27); g.lineTo(s * 0.32, shY + torsoH * 0.27); g.lineTo(0, shY + torsoH * 0.34); g.lineTo(-s * 0.32, shY + torsoH * 0.27); g.lineTo(-shW, shY + torsoH * 0.27); }
    g.closePath(); g.fill(); g.fillRect(-shW, hemY - s * (o.bandH ?? 0.22), shW * 2, s); g.restore();
    (o.braStraps || [[-0.44, 0.02, -0.38, torsoH * 0.3 / s], [0.44, 0.02, 0.38, torsoH * 0.3 / s]]).forEach(([x0, y0, x1, y1]) => cap(g, x0 * s, shY + y0 * s, x1 * s, shY + y1 * s, s * (o.strapW ?? 0.07), o.braStrap || lt(top, 0.04))); }   // o.braStraps [[x0, y0, x1, y1]] in s
  if (!crop) belt();
  const pieces = front => (o.pieces || []).filter(p => !!p[2] === front).forEach(([col, pts]) => { g.fillStyle = col; spline(g, pts.map(([u, v, c]) => [u, v + shY / s, c]), s); g.fill(); });   // o.pieces [[col, pts, front]]: measured extra pieces (a bag, a flap, a patch) in s, x from the body centre, y below the shoulders; front = over the strap
  pieces(false);
  if (o.strap) noodle(g, o.strapPts ? o.strapPts.map(([u, v, c]) => [u * s, shY + v * s, c]) : [[-shW * 0.36, shY + s * 0.05], [-s * 0.05, shY + torsoH * 0.55], [shW * 0.42, hipY - s * 0.1]], s * 0.075, o.strap);   // a cross-body bag strap (o.strapPts its path: [x, y below the shoulders] in s)
  pieces(true);
  if (o.bag) { g.fillStyle = o.bag; rr(g, shW * 0.36, hipY - s * 0.2, s * 0.34, s * 0.38, s * 0.12); g.fill(); }
  // neckline (measured): a crew RING round a U of deep neck (tee, vest: the undershirt's ring), a thick high ring (tank), a bare U (bra)
  const ring = (w, d, th, col) => { const ry = shY - s * 0.02; g.fillStyle = col; g.beginPath(); g.ellipse(hX * 0.5, ry, w + th, d + th, 0, 0, Math.PI); g.closePath(); g.fill();
    if (w > 0 && d > 0) { g.fillStyle = neckSkin; g.beginPath(); g.ellipse(hX * 0.5, ry, w, d, 0, 0, Math.PI); g.closePath(); g.fill(); } };
  if (o.scoop) { const [du, dd] = [].concat(o.scoop, 0.08), w = nW / 2, yb = shY + du * s, top = shY - s * 0.2, r = Math.min(w, s * (o.scoopR ?? 9));
    g.save(); if (o.scoopRot) { g.translate(nX, shY); g.rotate(o.scoopRot * D2R); g.translate(-nX, -shY); }   // o.scoopRot: the whole neckline tilted (deg)
    if (o.scoopTrim) { const T = o.scoopT || [], wb = (T[0] ?? (w / s + 0.075)) * s, bd = (T[1] ?? 0.075) * s, rb = (T[2] ?? T[0] ?? (w / s + 0.075)) * s, cy = yb + bd - rb, bx = nX + (T[3] || 0) * s, ty = T[4] != null ? shY - T[4] * s : Math.min(cy, shY - s * 0.02);
      g.fillStyle = o.scoopTrim; g.beginPath(); g.ellipse(bx, cy, wb, rb, 0, 0, Math.PI); g.lineTo(bx - wb, ty); g.lineTo(bx + wb, ty); g.closePath(); g.fill(); }   // o.scoopTrim: a binding bowl round the U (o.scoopT [half width, below the U, depth, x shift, top above the shoulders])
    g.fillStyle = skin; g.beginPath(); g.moveTo(nX - w, top);
    if (o.scoopRY) { const ry = o.scoopRY * s; g.lineTo(nX - w, yb - ry); g.ellipse(nX, yb - ry, w, ry, 0, Math.PI, 0, true); }   // o.scoopRY: a full round U bottom this deep (s)
    else { g.lineTo(nX - w, yb - r); g.arcTo(nX - w, yb, nX - w + r, yb, r); g.lineTo(nX + w - r, yb); g.arcTo(nX + w, yb, nX + w, yb - r, r); }
    g.lineTo(nX + w, top); g.closePath(); g.fill();
    g.save(); g.clip(); g.fillStyle = neckSkin; g.beginPath(); g.moveTo(nX - w * 1.1, shY - s * 0.3); g.lineTo(nX - w * 1.1, shY + (dd - 0.06) * s); g.quadraticCurveTo(nX, shY + (dd + 0.06) * s, nX + w * 1.1, shY + (dd - 0.06) * s); g.lineTo(nX + w * 1.1, shY - s * 0.3); g.closePath(); g.fill(); g.restore(); g.restore(); }   // o.scoop [U depth, shadow depth]: a U neckline the neck's width, skin below the neck's shadow (o.scoopR its corner radius; measured)
  else if (ts === 'tank') ring(s * 0.2, s * 0.05, s * 0.12, o.trim || lt(top, 0.2));
  else if (ts === 'bra') ring(s * 0.2, s * 0.04, 0, neckSkin);
  else if (ts === 'vest') ring(s * 0.2, s * 0.19, s * 0.11, o.under || '#F2F2F8');
  else if (ts === 'shirt' || ts === 'rolled' || ts === 'coat') { ring(s * 0.2, s * 0.08, 0, neckSkin); const cc = o.collar || '#FFFFFF';
    for (const sd of [-1, 1]) { g.fillStyle = cc; g.beginPath(); g.moveTo(sd * s * 0.04, shY + s * 0.12); g.lineTo(sd * s * 0.3, shY - s * 0.04); g.lineTo(sd * s * 0.26, shY + s * 0.2); g.closePath(); g.fill(); }
    if (ts !== 'coat') { g.fillStyle = dk(top, 0.1); for (let i = 0; i < 4; i++) { ell(g, 0, shY + s * 0.42 + i * s * 0.26, s * 0.035, s * 0.035); g.fill(); } } }
  else ring(s * 0.22, s * 0.09, s * 0.1, o.trim || dk(top, 0.04));
  if (ts === 'hoodie') { g.fillStyle = dk(top, 0.1); ell(g, 0, shY + s * 0.02, s * 0.5, s * 0.16); g.fill(); cap(g, -s * 0.1, shY + s * 0.1, -s * 0.12, shY + s * 0.45, s * 0.04, lt(top, 0.2)); cap(g, s * 0.1, shY + s * 0.1, s * 0.12, shY + s * 0.45, s * 0.04, lt(top, 0.2)); }
  if (sleeveOf === 'puff') { if (o.sleeveFrontL && !o.frontL) puffOf(-1); if (o.sleeveFrontR && !o.frontR) puffOf(1); }
  if (o.topFn) o.topFn(g, P);
  g.restore();
  headAt(t, () => head(g, 0, headY, hS, { eyes: B.eyes, chin: B.chin, jaw: B.jaw, tone: B.tone, light: o.light, ...(B.face || {}), ...o, skin, noBack: true }));
  if (!o.hideL) { if (o.frontL === 'fore') foreDraw(-1); else if (o.frontL) armDraw(-1); } if (!o.hideR) { if (o.frontR === 'fore') foreDraw(1); else if (o.frontR) armDraw(1); }
  if (o.sweat) { g.fillStyle = '#7FD8FF'; const sy = headY - s * 0.25 + (t * 40 % (s * 0.3)); g.beginPath(); g.moveTo(s * 0.55, sy - s * 0.1); g.quadraticCurveTo(s * 0.63, sy, s * 0.55, sy + s * 0.04); g.quadraticCurveTo(s * 0.47, sy, s * 0.55, sy - s * 0.1); g.fill(); }
  if (o.drawFn) o.drawFn(g, P);
  g.restore(); g.restore();
}
// bust(g, o): a CLOSE-UP (measured on a reference close-up): the head (o.s wide, at o.x, o.y) on a short neck, round shoulders
// spreading to ~2.4 head widths just under the chin, the frame's bottom edge cutting the chest; o.topStyle 'shirt' (default: a
// collar with two points, a placket and buttons) | 'tee' (a lighter neckline ring); two soft arm lines; every head() option passes on.
// ACT: key poses for person() (creator 2026-10-27: "moves feel on/off, no overlap or follow-through"). NEVER switch a pose with
// t > x ? a : b (it jumps on one frame). act(t, keys) blends key poses like an animator. keys = [{ t, armR: 60, elbowR: -20,
// handR: 'point', tilt: 4, ... }, ...] (any person() option, t in shot seconds, put t ON the word). Numbers ease from wherever the
// last key had got to, so moves chain without pops. The body leads and the limbs follow (overlap): tilt / lean / legs at once, the
// shoulders 2 frames later, elbows 5, wrists 7, the head 4; elbows, wrists and the head overshoot ~8 % and settle once (follow-
// through). Words and shapes (handR 'fist', mood, mouth) switch half-way through the blend. Per key: blend (seconds, default 0.32),
// ant: 1 (a small wind-up the other way first: big moves), heavy: 1 (slow out and in: a tired or big body), snap: 1 (fast arrival:
// a shock, a point). Use: const K1 = [...]; person(g, { ...DARA, x, y, s, t, ...act(t, K1) }). Shot clocks: act(s.t, K1).
const _ACTD = { tilt: 0, lean: 0, hipX: 0, hipTilt: 0, legL: 0, legR: 0, kneeL: 0.02, kneeR: 0.02, armL: 0.035, armR: 0.035, elbowL: 0.085, elbowR: 0.085, wristL: 0.12, wristR: 0.12, headTilt: 0.07, headX: 0.07, turn: 0.05, look: 0.07, lid: 0.03 };
const _ACTO = { elbowL: 0.08, elbowR: 0.08, wristL: 0.12, wristR: 0.12, headTilt: 0.07, headX: 0.05 }, _ACTK = new Set(['t', 'blend', 'ant', 'heavy', 'snap']);
function _actSeg(S, k, f, u) { const T = k[f], dur = Math.max(0.12, (k.blend ?? 0.32) * (k.heavy ? 1.4 : 1) * (k.snap ? 0.65 : 1)), x = u / dur;
  const e = k.heavy ? heavyc(Math.min(1, x)) : k.snap ? popc(Math.min(1, x)) : glide(Math.min(1, x)), os = (_ACTO[f] || 0) * (k.snap ? 1.3 : 1) * (k.heavy ? 0.5 : 1);
  return S + (T - S) * (e + os * Math.max(0, Math.sin(Math.PI * clamp((x - 0.5) / 0.9)))); }
function act(t, keys) { const out = {}, fields = new Set(); keys.forEach(k => Object.keys(k).forEach(f => _ACTK.has(f) || fields.add(f)));
  for (const f of fields) { const ks = keys.filter(k => k[f] !== undefined).sort((a, b) => a.t - b.t), tt = t - (_ACTD[f] ?? 0.04);
    if (typeof ks[0][f] !== 'number') { let cur = ks[0][f]; for (const k of ks) if (tt >= k.t + (k.blend ?? 0.32) * 0.45) cur = k[f]; out[f] = cur; continue; }
    let S = ks[0][f];
    for (let i = 0; i < ks.length && ks[i].t <= tt; i++) S = _actSeg(S, ks[i], f, Math.min(tt, i + 1 < ks.length ? ks[i + 1].t : tt) - ks[i].t);
    const nx = ks.find(k => k.t > tt); if (nx && nx.ant && tt > nx.t - 0.16) S -= (nx[f] - S) * 0.1 * Math.sin(Math.PI * (tt - (nx.t - 0.16)) / 0.16);
    out[f] = S; }
  return out; }
function bust(g, o) { const s = o.s || 400, x = o.x, y = o.y, top = o.top || '#EDDDAB', skin = o.skin || PAL.skinS[1], cy = y + s * 0.46, nk = deep(skin);
  /* its own life (creator 2026-10-27 "close-ups frozen"): the shoulders breathe (~1.2 s), the head rides the breath a beat later, tilts and drifts (o.idle scales it, 0 = still) */
  const t = o.t || 0, idl = (o.idle ?? 1) * (MOTION.life ? 1.7 : 1), sd = o.seed || 0, br0 = Math.sin(t * 5.2 + sd) * 0.014 * idl; g.save(); g.translate(x, H); g.scale(1 + br0 * 0.4, 1 + br0); g.translate(-x, -H);
  if (!o.nomark) mark(g, 'cast', x - s * 1.2, y - s * 0.62, x + s * 1.2, H, 'bust');   /* a close-up person counts as the cast (composition and variety checks) */
  g.fillStyle = nk; rr(g, x - s * 0.17, cy - s * 0.2, s * 0.34, s * 0.3, s * 0.08); g.fill();
  g.fillStyle = top; g.beginPath(); g.moveTo(x - s * 0.34, cy - s * 0.04); g.bezierCurveTo(x - s * 0.62, cy + s * 0.06, x - s * 1.14, cy + s * 0.26, x - s * 1.18, cy + s * 0.72); g.lineTo(x - s * 1.22, H + 60);
  g.lineTo(x + s * 1.22, H + 60); g.lineTo(x + s * 1.18, cy + s * 0.72); g.bezierCurveTo(x + s * 1.14, cy + s * 0.26, x + s * 0.62, cy + s * 0.06, x + s * 0.34, cy - s * 0.04); g.closePath(); g.fill();
  for (const sd of [-1, 1]) cap(g, x + sd * s * 0.86, cy + s * 0.62, x + sd * s * 0.8, H + 40, s * 0.03, dk(top, 0.035));
  g.fillStyle = nk; g.beginPath(); g.moveTo(x - s * 0.2, cy - s * 0.02); g.quadraticCurveTo(x, cy + s * 0.3, x + s * 0.2, cy - s * 0.02); g.closePath(); g.fill();
  if ((o.topStyle || 'shirt') === 'shirt') { const cc = o.collar || mix(top, '#D8A850', 0.22); cap(g, x, cy + s * 0.3, x, H + 40, s * 0.035, dk(top, 0.03));
    for (let k = 0; k < 3; k++) { g.fillStyle = mix(top, '#C8A060', 0.28); ell(g, x - s * 0.08, cy + s * 0.78 + k * s * 0.48, s * 0.05, s * 0.05); g.fill(); }
    for (const sd of [-1, 1]) { g.fillStyle = cc; g.beginPath(); g.moveTo(x + sd * s * 0.36, cy - s * 0.05); g.quadraticCurveTo(x + sd * s * 0.34, cy + s * 0.3, x + sd * s * 0.1, cy + s * 0.55);
      g.quadraticCurveTo(x + sd * s * 0.06, cy + s * 0.3, x + sd * s * 0.02, cy + s * 0.26); g.quadraticCurveTo(x + sd * s * 0.2, cy + s * 0.12, x + sd * s * 0.24, cy + s * 0.0); g.closePath(); g.fill(); } }
  else { g.strokeStyle = o.trim || lt(top, 0.2); g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(x - s * 0.27, cy + s * 0.03); g.quadraticCurveTo(x, cy + s * 0.42, x + s * 0.27, cy + s * 0.03); g.stroke(); }
  g.restore(); const br = Math.sin(t * 5.2 + sd - 0.5) * 0.014 * idl; g.save(); g.translate(x, cy - (H - cy) * br); g.rotate((Math.sin(t * 1.9 + sd * 1.3) * 0.03 + Math.sin(t * 0.7 + sd) * 0.02) * idl); g.translate(-x, -cy);
  head(g, x, y, s, { ...o, skin }); g.restore(); }
// the hair mass behind the head (long / bob); person() draws it before the body, head() alone draws it itself.
// Measured: long hair falls to the shoulders and FLICKS OUT sideways into long pointed tips, the two sides not quite level.
function hairBack(g, x, y, s, o = {}) { const hs = o.hairStyle || 'long'; x -= clamp(o.turn || 0, -1, 1) * s * 0.14;
  if (o.tail) { const m = o.part === 'right' ? -1 : 1; g.fillStyle = o.tail === true ? dk(o.hair || '#2E0A26', 0.05) : o.tail;
    if (o.tailPts) { g.save(); g.translate(x, y); g.scale(m, 1); spline(g, o.tailPts, s); g.fill(); g.restore(); }   // o.tailPts: a measured ponytail outline in head space (s)
    else { ell(g, x - m * s * (o.tailX ?? 0.6), y + s * (o.tailY ?? 0.42), s * 0.17 * (o.tailS ?? 1), s * 0.26 * (o.tailS ?? 1), m * 0.45); g.fill(); } }   // o.tail: a ponytail behind (its own colour allowed)
  if (o.hairBackFn) { g.save(); g.translate(x, y); g.fillStyle = dk(o.hair || '#2E0A26', 0.03); o.hairBackFn(g, s); g.restore(); }
  if (hs === 'bob') { g.fillStyle = o.hair || '#2E0A26'; rr(g, x - s * 0.64, y - s * 0.36, s * 1.28, s * (0.36 + (o.hairLen ?? 0.36)), s * 0.04); g.fill(); return; }   // measured: the sides fall straight, cut flat at the jaw
  if (hs === 'parted') { const m = o.part === 'right' ? -1 : 1; g.save(); g.translate(x, y); g.scale(m, 1); g.fillStyle = o.hairBackCol || o.hair || '#2E0A26'; spline(g, HAIR.partedBack, s); g.fill(); g.restore(); return; }   // measured: hangs to the shoulders behind the body, a flick out at each side
  if (hs !== 'long') return; const L = hs === 'long', m = o.part === 'right' ? -1 : 1;
  g.save(); g.translate(x, y); g.scale(m, 1); g.fillStyle = dk(o.hair || '#2E0A26', 0.03); g.beginPath();
  g.moveTo(-s * 0.6, -s * 0.35); g.bezierCurveTo(-s * 0.68, s * 0.1, -s * 0.66, s * 0.4, -s * (L ? 0.66 : 0.6), s * (L ? 0.62 : 0.5));
  if (L) { g.quadraticCurveTo(-s * 0.82, s * 0.7, -s * 1.04, s * 0.74); g.quadraticCurveTo(-s * 0.84, s * 0.86, -s * 0.6, s * 0.95); }
  else g.quadraticCurveTo(-s * 0.55, s * 0.68, -s * 0.38, s * 0.62);
  g.lineTo(s * (L ? 0.6 : 0.38), s * (L ? 1.0 : 0.62));
  if (L) { g.quadraticCurveTo(s * 0.84, s * 0.98, s * 1.02, s * 0.98); g.quadraticCurveTo(s * 0.82, s * 0.86, s * 0.66, s * 0.66); }
  else g.quadraticCurveTo(s * 0.55, s * 0.68, s * 0.6, s * 0.5);
  g.bezierCurveTo(s * 0.66, s * 0.4, s * 0.68, s * 0.1, s * 0.6, -s * 0.35); g.closePath(); g.fill(); g.restore(); }
// measured outlines (head space, s = 1, before the turn slide): the swept cut is a mass that passes BEHIND the far ear and a side
// lock drawn OVER it (outer hair < ear < lock, as the reference layers them)
const HAIR = {
  swept: [[0.605, -0.559], [0.59, -0.62], [0.53, -0.685], [0.43, -0.75], [0.322, -0.826], [0.221, -0.896], [0.1, -0.952], [0.014, -0.974], [-0.076, -0.983], [-0.251, -0.965],
    [-0.35, -0.937], [-0.453, -0.884], [-0.55, -0.814], [-0.609, -0.754], [-0.679, -0.662], [-0.728, -0.557], [-0.776, -0.371], [-0.778, -0.287], [-0.851, -0.157], [-0.924, 0.039],
    [-0.969, 0.242], [-0.96, 0.292], [-0.918, 0.325], [-0.878, 0.319], [-0.748, 0.192], [-0.663, 0.129], [-0.58, 0.08], [-0.52, -0.02], [-0.44, -0.12], [-0.4, -0.3], [-0.3, -0.45],
    [-0.216, -0.475], [-0.176, -0.474], [-0.1, -0.382], [-0.026, -0.353], [0.15, -0.369], [0.3, -0.384], [0.475, -0.399], [0.511, -0.379], [0.541, -0.303], [0.555, -0.292],
    [0.561, -0.309], [0.554, -0.416], [0.596, -0.5]],
  sweptLock: [[-0.216, -0.475], [-0.245, -0.454], [-0.291, -0.395], [-0.344, -0.277], [-0.362, -0.15], [-0.353, 0.07], [-0.365, 0.117], [-0.391, 0.12], [-0.414, 0.082],
    [-0.473, -0.115], [-0.5, -0.3], [-0.4, -0.5], [-0.28, -0.56]],
  // the parted cut (club dancer): the fringe and both temple locks (front) with a skin window above the far eye, the blade strand over that eye (drawn after the eyes),
  // and the mass hanging behind the head to the shoulders with a flick out at each side (back)
  parted: [[-0.594, -0.328], [-0.564, -0.07], [-0.547, -0.056], [-0.526, -0.064], [-0.495, -0.176], [-0.476, -0.205], [-0.448, -0.218], [-0.399, -0.217], [-0.34, -0.243],
    [-0.301, -0.247], [-0.268, -0.235], [-0.256, -0.21], [-0.18, -0.26], [-0.1, -0.4], [-0.05, -0.55], [0.041, -0.628], [0.079, -0.639], [0.154, -0.614], [0.194, -0.591],
    [0.289, -0.505], [0.339, -0.419], [0.359, -0.357], [0.376, -0.258], [0.376, -0.046], [0.383, -0.022], [0.402, -0.014], [0.421, -0.03], [0.45, -0.135], [0.52, -0.09],
    [0.6, -0.01], [0.684, -0.035], [0.655, -0.159], [0.643, -0.367], [0.63, -0.455], [0.599, -0.563], [0.556, -0.65], [0.483, -0.752], [0.396, -0.832], [0.288, -0.897],
    [0.161, -0.94], [0.043, -0.956], [-0.048, -0.952], [-0.176, -0.924], [-0.281, -0.876], [-0.369, -0.817], [-0.452, -0.734], [-0.523, -0.628], [-0.558, -0.547], [-0.589, -0.418]],
  partedHole: [[-0.168, -0.618], [-0.156, -0.592], [-0.178, -0.44], [-0.22, -0.297], [-0.249, -0.28], [-0.332, -0.292], [-0.345, -0.305], [-0.342, -0.32], [-0.26, -0.458],
    [-0.203, -0.599], [-0.186, -0.617]],
  partedStrand: [[-0.256, -0.21], [-0.29, -0.12], [-0.312, -0.075], [-0.32, -0.048], [-0.306, -0.032], [-0.285, -0.034], [-0.258, -0.058], [-0.222, -0.097], [-0.18, -0.15], [-0.14, -0.2], [-0.062, -0.325], [-0.005, -0.457], [0.041, -0.628], [-0.168, -0.618],
    [-0.156, -0.592], [-0.178, -0.44], [-0.22, -0.297], [-0.249, -0.28]],
  partedBack: [[0.643, -0.367], [0.655, -0.159], [0.684, -0.035], [0.737, 0.063], [0.825, 0.141], [0.84, 0.166], [0.834, 0.183], [0.813, 0.19], [0.669, 0.149], [0.643, 0.166],
    [0.647, 0.424], [0.671, 0.535], [0.728, 0.694], [0.74, 0.786], [0.738, 0.85], [0.66, 1.0], [0.6, 1.05], [-0.66, 1.05], [-0.678, 0.631], [-0.668, 0.568], [-0.614, 0.425], [-0.595, 0.351],
    [-0.578, 0.186], [-0.61, 0.11], [-0.674, 0.1], [-0.742, 0.097], [-0.81, 0.086], [-0.829, 0.063], [-0.821, 0.048], [-0.802, 0.039], [-0.694, 0.021], [-0.61, -0.01],
    [-0.555, -0.11], [-0.565, -0.35], [-0.3, -0.7], [0.3, -0.7]] };
// head(g, x, y, s, o): the head alone, built as the reference people are (measured close up). s = head width.
// A short U (the chin ~0.45 s below the eyes, a broad round jaw), FLAT skin (o.shade true adds a crescent down the shadow side); big
// half-disc ears in deep() skin at eye level. Eyes: o.eyes 'dot' (default) | 'white' (smiling medium shots: cream ovals, a big teal
// iris, no pupil, no catchlight) | 'shut' (squeezed, ill: purple capsules). o.brows 'soft' | 'arc' (thin, smiling) | 'thick' (hair
// colour, worried close-ups); o.nose also 'bean'; o.mouth 'o'; o.drops sweat popping in from o.dropsAt; o.wash + o.washP skin that
// turns; o.turn -1..1 a three-quarter face; o.strand a lock over one eye; hair also 'bowl' | 'swept' (o.tail a ponytail). Dot eyes:
// mood carried by skin LIDS cutting the dots flat (worried/sad slant out, angry slant in, o.lid tired); muted capsule brows; a
// small nose a shade deeper than the skin (o.nose 'soft' default | 'bulb' | 'line' | false); a tiny dark-red capsule mouth;
// o.bags purple crescents for tired or ill; o.cheeks blush. o.hairHL adds a lighter band across the crown (some newer frames). Hair: a big dome whose fringe falls in a few flame-shaped locks ending in points at eye
// level (o.part 'left'|'right' flips the parting). o.close = a close-up: white eyes with a coloured iris and catchlights.
// o.hairStyle 'long'|'bob'|'locks'|'short'|'spiky'|'curly'|'bun'|'bald'|'cap'|'bowl'|'swept'; o.mood 'calm'|'happy'|'shock'|'sad'|'worried'|
// 'smug'|'angry'|'bliss'|'dead'; o.look -1..1; o.t time (blinks: lids close in 2 frames, open in 4); o.lid 0..1 a held half-lid (tired, sly); o.dart gaze snaps every ~0.4 s; o.talk mouth flaps every 4 frames; o.rim light colour; o.cheeks true adds blush.
function head(g, x, y, s, o = {}) {
  const t = o.t || 0, hair = o.hair || '#2E0A26', mood = o.mood || 'calm', hs = o.hairStyle || 'locks', close = !!o.close, eyes = o.eyes || (close ? 'close' : 'dot');
  const skin = o.wash ? mix(o.skin || PAL.skinS[2], o.wash, clamp(o.washP ?? 1) * 0.45) : o.skin || PAL.skinS[2];   // o.wash: the skin turns (ill, cold, starving) as the line says it
  const tn = clamp(o.turn || 0, -1, 1), fx_ = tn * s * 0.11;                            // o.turn: a three-quarter face, the features slide toward the side it faces
  const hw = s * 0.5, top = -s * 0.6, chin = s * (o.chin ?? 0.46), ey = -s * (o.eyeUp ?? 0.02), ex = s * (o.eyeX ?? (eyes === 'white' ? 0.175 : 0.25)) * (1 - Math.abs(tn) * 0.18), m = o.part === 'right' ? -1 : 1;
  const JL = o.jawL || {}, JR = o.jawR || {}, hwP = JR.w != null ? JR.w * s : hw * (1 - 0.13 * Math.max(0, tn)), hwN = JL.w != null ? JL.w * s : hw * (1 - 0.13 * Math.max(0, -tn));   // o.turn: the side it turns toward narrows; o.jawL/jawR {w half width, c jaw depth, x chin width}: one side of the face (measured, a turned head)
  // o.dart: the gaze snaps to a new spot every ~0.4 s (stepped, never sliding), around o.look; o.talk: the mouth flips open/shut every 4 frames
  const dk_ = o.dart ? Math.floor((t + (o.seed || 0)) / 0.4) : 0, look = ((o.look || 0) + (o.dart ? (rng(dk_ * 7 + 3)() - 0.5) * 1.1 : 0)) * s * 0.035;
  const talking = o.talk && Math.floor(t * FPS / 4) % 2 === 0;
  if (!o.noBack) hairBack(g, x, y, s, o);
  g.save(); g.translate(x, y);
  if (o.probe) (window.PROBE = window.PROBE || {})[o.probe] = { m: g.getTransform().toJSON(), s, hsh: -tn * s * 0.14, mir: m, fx: fx_, ex, ey };   // o.probe: records where this head sits (rebuild_check maps real outlines into head space)
  if (hs === 'bun') { g.fillStyle = hair; ell(g, 0, top - s * 0.2, s * 0.24, s * 0.21); g.fill(); }
  // ears (measured): half discs in deep skin at eye level, drawn OVER the hair (a lock or a bob passes behind them), never over the face
  const ears = back => { const fp = new Path2D(); fp.rect(-s * 3, -s * 3, s * 6, s * 6); face(fp); g.save(); g.clip(fp, 'evenodd');
    for (const sd of [-1, 1]) { const eo = sd < 0 ? o.earL : o.earR, E = typeof eo === 'object' ? eo : { s: eo ?? 1 }, ew = sd > 0 ? hwP : hwN, ek = (o.earS ?? 1) * (E.s ?? 1);
      if ((o.earsBack === true || E.back === true) !== back) continue;   // E.back: this ear under the hair (a lock falls over it)
      const exx = sd * (ew * 0.98 - Math.max(0, 1 - ek) * s * 0.12 + (E.x || 0) * s), eyy = ey + s * ((o.earY ?? 0.1) + (E.y || 0)), erx = s * 0.13 * ek * (E.w ?? 1), ery = s * 0.15 * ek, ea = (E.r || 0) * D2R;
      if (ek <= 0) continue; if (o.rim) { g.fillStyle = o.rim; ell(g, exx * 1.02, eyy, erx * 1.15, ery * 1.13, ea); g.fill(); }
      g.fillStyle = E.col || (Array.isArray(o.ear) ? o.ear[sd < 0 ? 0 : 1] : o.ear) || deep(skin); ell(g, exx, eyy, erx, ery, ea); g.fill(); } g.restore(); };   // o.earL/earR: a size, or {s, x outward, y, w width, r deg, col, back} per ear (a turned or tilted head)
  const sq = o.jaw === 'square', vj = o.jaw === 'v', rj = o.jaw === 'round', jy = rj ? -s * 0.08 : ey + s * (sq ? 0.14 : vj ? 0.06 : 0.03), jc = rj ? jy + (chin - jy) * 0.56 : sq ? chin - s * 0.06 : chin * (vj ? 0.62 : 0.8), jx = rj ? 0.56 : sq ? 0.52 : vj ? 0.3 : 0.46;   // 'round' (measured v2): the lower face a half ellipse
  const jcL = JL.c != null ? chin * JL.c : jc, jcR = JR.c != null ? chin * JR.c : jc, jxL = JL.x ?? jx, jxR = JR.x ?? jx;
  const face = gg => { if (gg.beginPath) gg.beginPath(); gg.moveTo(-hwN, top + s * 0.32); gg.lineTo(-hwN, jy); gg.bezierCurveTo(-hwN, jcL, -hwN * jxL, chin, 0, chin);
    gg.bezierCurveTo(hwP * jxR, chin, hwP, jcR, hwP, jy); gg.lineTo(hwP, top + s * 0.32); gg.bezierCurveTo(hwP, top - s * 0.02, -hwN, top - s * 0.02, -hwN, top + s * 0.32); gg.closePath(); };
  ears(true);
  flat(g, face, skin, s, { shade: o.shade === true, sx: 0.15, sy: 0.02, k: 0.06, rim: o.rim, rimW: 0.03 });   // measured: faces are FLAT (o.shade adds a crescent)
  if (o.tone) { g.save(); face(g); g.clip(); const lr = o.light === 'right' ? -1 : 1; g.fillStyle = rgba(deep(skin), 0.32); g.fillRect(lr > 0 ? s * 0.2 + fx_ : -s * 2 - s * 0.2 + fx_, -s, s * 2, s * 2); g.restore(); }   // side two-tone
  if (o.scalp !== false && !['bald', 'cap', 'curly'].includes(hs)) { g.fillStyle = skin; ell(g, 0, -s * 0.5, s * 0.44, s * 0.27); g.fill(); }
  // the hair on top
  // the hair mass carries one lighter same-hue band across its crown (measured on the newer references)
  // o.hairHL: off by default (the four studied frames show flat hair)
  const hairShine = () => { if (!o.hairHL) return; g.save(); g.clip(); g.fillStyle = lt(hair, 0.08); g.beginPath(); g.ellipse(-s * 0.16, -s * 0.68, s * 0.32, s * 0.085, -0.38, 0, Math.PI * 2); g.fill(); g.restore(); };
  const hsh = -tn * s * 0.14; g.fillStyle = hair; g.save(); g.translate(hsh, 0); g.scale(m, 1);
  if (hs === 'long' || hs === 'locks' || hs === 'fringe') {              // dome + three flame locks
    g.beginPath(); g.moveTo(-s * 0.6, s * 0.2); g.bezierCurveTo(-s * 0.68, -s * 0.55, -s * 0.4, -s * 0.85, 0, -s * 0.85); g.bezierCurveTo(s * 0.42, -s * 0.85, s * 0.68, -s * 0.55, s * 0.6, s * 0.2);
    g.quadraticCurveTo(s * 0.53, s * 0.1, s * 0.47, s * 0.04); g.quadraticCurveTo(s * 0.45, -s * 0.22, s * 0.34, -s * 0.38); g.quadraticCurveTo(s * 0.2, -s * 0.2, s * 0.07, s * 0.0);
    g.quadraticCurveTo(s * 0.03, -s * 0.25, -s * 0.06, -s * 0.41); g.quadraticCurveTo(-s * 0.34, -s * 0.3, -s * 0.44, s * 0.04); g.quadraticCurveTo(-s * 0.5, s * 0.12, -s * 0.6, s * 0.2); g.closePath(); g.fill(); hairShine(); }
  else if (hs === 'short' || hs === 'spiky') {                                           // dome to the ears, a fringe of points
    g.beginPath(); g.moveTo(-s * 0.56, -s * 0.02); g.bezierCurveTo(-s * 0.64, -s * 0.6, -s * 0.38, -s * 0.84, 0, -s * 0.84); g.bezierCurveTo(s * 0.38, -s * 0.84, s * 0.64, -s * 0.6, s * 0.56, -s * 0.02);
    g.lineTo(s * 0.5, s * 0.0); g.lineTo(s * 0.48, -s * 0.24); const n = hs === 'spiky' ? 7 : 5;
    for (let i = 0; i <= n; i++) { const xx = lerp(s * 0.44, -s * 0.44, i / n); g.lineTo(xx + s * 0.06, -s * (i % 2 ? 0.2 : 0.36) + (hs === 'spiky' ? s * 0.06 : 0)); }
    g.lineTo(-s * 0.48, -s * 0.24); g.lineTo(-s * 0.5, s * 0.0); g.closePath(); g.fill(); hairShine(); }
  else if (hs === 'curly') { for (let i = 0; i < 11; i++) { const a = Math.PI * (0.95 + i * 0.11); ell(g, Math.cos(a) * s * 0.52, Math.sin(a) * s * 0.62 - s * 0.12, s * 0.17, s * 0.17); g.fill(); }
    ell(g, 0, -s * 0.52, s * 0.42, s * 0.28); g.fill(); }
  else if (hs === 'swept') { spline(g, HAIR.swept, s); g.fill(); hairShine(); }   // measured (club dancer): a big round crown, the fringe rising to a sideburn at the near temple, the far side hanging past the jaw behind the ear
  else if (hs === 'bob') {                                                              // measured: a dome, the fringe cut STRAIGHT across with two small notches (the sides hang behind, see hairBack)
    g.beginPath(); g.moveTo(-s * 0.64, -s * 0.34); g.bezierCurveTo(-s * 0.68, -s * 0.82, -s * 0.36, -s * 1.02, 0, -s * 1.02); g.bezierCurveTo(s * 0.36, -s * 1.02, s * 0.68, -s * 0.82, s * 0.64, -s * 0.34);
    g.lineTo(s * 0.2, -s * 0.34); g.lineTo(s * 0.14, -s * 0.43); g.lineTo(s * 0.08, -s * 0.34); g.lineTo(-s * 0.21, -s * 0.34); g.lineTo(-s * 0.27, -s * 0.43); g.lineTo(-s * 0.33, -s * 0.34); g.closePath(); g.fill(); hairShine(); }
  else if (hs === 'parted') { spline(g, HAIR.parted, s); spline(g, HAIR.partedHole, s, true); g.fill('evenodd'); hairShine(); }   // measured (club dancer): a high dome, a lock down each temple, a skin sliver between the far lock and the strand
  else if (hs === 'neat') {                                                             // measured (infographic man): a low wide dome with a small top dip, a window with round top corners and a centre point, pointed sideburns inside the face edge
    g.beginPath(); g.moveTo(-s * 0.45, -s * 0.25); g.lineTo(-s * 0.37, -s * 0.47); g.quadraticCurveTo(-s * 0.35, -s * 0.545, -s * 0.28, -s * 0.545);
    g.quadraticCurveTo(-s * 0.12, -s * 0.55, 0, -s * 0.47); g.quadraticCurveTo(s * 0.12, -s * 0.55, s * 0.28, -s * 0.545); g.quadraticCurveTo(s * 0.35, -s * 0.545, s * 0.37, -s * 0.47); g.lineTo(s * 0.45, -s * 0.25); g.lineTo(s * 0.5, -s * 0.2);
    g.lineTo(s * 0.62, -s * 0.17); g.quadraticCurveTo(s * 0.68, -s * 0.2, s * 0.68, -s * 0.44); g.bezierCurveTo(s * 0.71, -s * 0.72, s * 0.48, -s * 0.9, s * 0.18, -s * 0.89); g.quadraticCurveTo(s * 0.06, -s * 0.89, 0, -s * 0.81);
    g.quadraticCurveTo(-s * 0.07, -s * 0.9, -s * 0.2, -s * 0.89); g.bezierCurveTo(-s * 0.5, -s * 0.9, -s * 0.73, -s * 0.72, -s * 0.69, -s * 0.44); g.quadraticCurveTo(-s * 0.69, -s * 0.2, -s * 0.62, -s * 0.17); g.lineTo(-s * 0.5, -s * 0.2); g.closePath(); g.fill(); hairShine(); }
  else if (hs === 'bowl') {                                                             // a dome wider than the face, the fringe cut in two straight lines up to a peak off-centre
    g.beginPath(); g.moveTo(-s * 0.5, -s * 0.12); g.quadraticCurveTo(-s * 0.66, -s * 0.06, -s * 0.68, -s * 0.3); g.bezierCurveTo(-s * 0.72, -s * 0.78, -s * 0.4, -s * 1.02, 0, -s * 1.02);
    g.bezierCurveTo(s * 0.42, -s * 1.02, s * 0.72, -s * 0.76, s * 0.68, -s * 0.3); g.quadraticCurveTo(s * 0.66, -s * 0.1, s * 0.5, -s * 0.13); g.lineTo(s * 0.5, -s * 0.35); g.quadraticCurveTo(s * 0.32, -s * 0.5, s * 0.17, -s * 0.58); g.quadraticCurveTo(-s * 0.15, -s * 0.38, -s * 0.5, -s * 0.24); g.closePath(); g.fill(); hairShine(); }
  else if (hs === 'swoop' || hs === 'bun') {                                                            // measured v2 (the commonest): a cap hugging the skull, the fringe swept to one side in a curve, a tuft on top
    g.beginPath(); g.moveTo(-s * 0.53, -s * 0.12); g.bezierCurveTo(-s * 0.62, -s * 0.66, -s * 0.36, -s * 0.8, 0, -s * 0.8); g.bezierCurveTo(s * 0.38, -s * 0.8, s * 0.62, -s * 0.64, s * 0.54, -s * 0.14);
    g.quadraticCurveTo(s * 0.5, -s * 0.3, s * 0.44, -s * 0.36); g.bezierCurveTo(s * 0.26, -s * 0.3, s * 0.02, -s * 0.28, -s * 0.24, -s * 0.46); g.quadraticCurveTo(-s * 0.4, -s * 0.36, -s * 0.47, -s * 0.18); g.closePath(); g.fill();
    if (hs === 'swoop' && o.tuft !== false) { g.beginPath(); g.moveTo(-s * 0.04, -s * 0.78); g.quadraticCurveTo(s * 0.02, -s * 0.98, s * 0.16, -s * 0.94); g.quadraticCurveTo(s * 0.05, -s * 0.9, s * 0.08, -s * 0.76); g.closePath(); g.fill(); } hairShine(); }
  else if (hs === 'cap') { g.fillStyle = o.capCol || PAL.red; g.beginPath(); g.ellipse(0, -s * 0.3, s * 0.54, s * 0.46, 0, Math.PI, 0); g.fill(); rr(g, -s * 0.1, -s * 0.36, s * 0.78, s * 0.1, s * 0.05); g.fill(); }
  if (o.hairFn) o.hairFn(g, s);                                                         // any hair the presets lack: drawn in head space (s = head width), same rules
  g.restore();
  ears(false);
  if (hs === 'swept') { g.save(); g.translate(hsh, 0); g.scale(m, 1); g.fillStyle = hair; spline(g, HAIR.sweptLock, s); g.fill(); g.restore(); }   // the side lock lies over the far ear
  g.save(); g.translate(fx_ + (o.featX || 0) * s, (o.featY || 0) * s);                 // the features (o.turn slides them; o.featX/featY nudge eyes, brows, nose and mouth together)
  // brows, angled by mood: o.brows 'soft' muted capsules (default) | 'arc' thin dark arcs (smiling, relaxed faces) | 'thick' fat
  // beans in the hair colour (a close-up, worried or ill face) (all measured on the reference faces)
  const browA = { angry: 0.32, worried: -0.32, sad: -0.32, shock: -0.12, smug: 0.12 }[mood] || 0, bs = o.brows || 'soft', browC = o.brow || (bs === 'thick' || bs === 'bar' ? hair : bs === 'arc' ? mix(deep(skin), '#7A2A00', 0.45) : mix(hair, skin, 0.38));
  const browOn = bs === 'none' || o.brows === false ? false : bs === 'auto' ? ['worried', 'sad', 'angry', 'shock', 'smug'].includes(mood) : true;
  if (mood !== 'dead' && browOn) for (const sd of [-1, 1]) { g.save(); g.translate(sd * ex, ey - s * (bs === 'thick' || bs === 'bar' ? 0.17 : close ? 0.16 : bs === 'arc' ? 0.15 : 0.13) - (mood === 'shock' ? s * 0.04 : 0) - s * (o.browY ?? 0) - (eyes === 'white' ? s * 0.11 * ((o.eyeS ?? 1) - 1) : 0)); const bo = (sd < 0 ? o.browL : o.browR) || {};   // o.browL/browR {x, y, r deg, s, a, w}: one brow moved / reshaped (the far brow on a turned face sits out at the edge, tilted)
    g.translate((bo.x || 0) * s, (bo.y || 0) * s); g.rotate(-sd * browA + (bo.r || 0) * D2R);
    if (bs === 'thick') { g.fillStyle = browC; rr(g, -s * 0.12, -s * 0.05, s * 0.24, s * 0.1, s * 0.05); g.fill(); }
    else if (bs === 'arc') { const R0 = s * 0.11 * (o.browS ?? 1), R = R0 * (bo.s ?? 1), sp = (bo.a ?? 90) * D2R / 2; g.strokeStyle = browC; g.lineWidth = s * (bo.w ?? o.browW ?? 0.05); g.lineCap = 'round'; g.beginPath(); g.arc(0, s * 0.07 - R0 + R, R, Math.PI * 1.5 - sp, Math.PI * 1.5 + sp); g.stroke(); }   // per brow: bo.s radius (flatter), bo.a span deg, bo.w thickness
    else if (bs === 'bar') { g.strokeStyle = browC; g.lineWidth = s * 0.07; g.lineCap = 'round'; g.beginPath(); g.arc(0, s * 0.2, s * 0.22, Math.PI * 1.36, Math.PI * 1.64); g.stroke(); }
    else cap(g, -s * 0.09, 0, s * 0.09, 0, s * (close ? 0.06 : 0.055), browC); g.restore(); }
  // eye bags (tired, ill): soft purple crescents under the eyes
  if (o.bags) { g.fillStyle = rgba(o.bags === true ? '#6A1E7A' : o.bags, 0.42); for (const sd of [-1, 1]) { ell(g, sd * ex, ey + s * 0.07, s * 0.085, s * 0.04); g.fill(); } }
  // eyes
  const lid = mood === 'dead' ? 0 : Math.max(lidOf(t, o.seed || 0), o.lid || 0), blink = lid > 0.75;
  for (const sd of [-1, 1]) { const x0 = sd * ex, ey0 = ey;
    if (mood === 'dead') { cap(g, x0 - s * 0.06, ey - s * 0.06, x0 + s * 0.06, ey + s * 0.06, s * 0.035, PAL.ink); cap(g, x0 + s * 0.06, ey - s * 0.06, x0 - s * 0.06, ey + s * 0.06, s * 0.035, PAL.ink); continue; }
    if ((blink && !close && eyes !== 'shut') || ((mood === 'bliss' || mood === 'happy') && eyes === 'dot')) { g.save(); g.strokeStyle = o.eyeCol || '#2A0A4A'; g.lineWidth = s * 0.035; g.lineCap = 'round'; g.beginPath();
      if (blink) { g.moveTo(x0 - s * 0.06, ey); g.lineTo(x0 + s * 0.06, ey); } else g.arc(x0, ey + s * 0.03, s * 0.06, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.restore(); continue; }
    // o.eyes 'shut': squeezed shut (ill, straining): flat capsules in the eye colour (measured #5B2996 on an ill face)
    if (eyes === 'shut') { g.fillStyle = o.eyeCol || '#5B2996'; rr(g, x0 - s * 0.088, ey - s * 0.055, s * 0.176, s * 0.11, s * 0.055); g.fill(); continue; }
    // o.eyes 'white' (measured on smiling medium shots): cream ovals, a big dark-teal iris pushed toward the gaze, NO pupil and NO
    // catchlight, the lids cutting the top flat by mood or o.lid
    if (eyes === 'slit') { const w = s * 0.085, h = s * (o.eyeH ?? 0.03), gz = Math.sign(look || 0.001); g.save(); rr(g, x0 - w, ey - h, w * 2, h * 2, h); g.clip(); g.fillStyle = o.white || '#FDF2E4'; g.fillRect(x0 - w, ey - h, w * 2, h * 2);
      g.fillStyle = o.iris || '#4A1C50'; g.fillRect(x0 - w + (gz < 0 ? 0 : w * 0.45), ey - h, w * 1.55, h * 2); g.restore(); continue; }
    if (eyes === 'white') { const E = (sd < 0 ? o.eyeL : o.eyeR) || {}, x0 = sd * ex + (E.x || 0) * s, ey = ey0 + (E.y || 0) * s, rx = s * 0.125 * (o.eyeS ?? 1) * (E.w ?? 1), ry = s * (o.eyeH ?? 0.11) * (o.eyeS ?? 1) * (E.h ?? 1);   // o.eyeL/eyeR {x, y, w, h, ix, iy}: one eye on a turned or squinting face
      const ml = { worried: [0.18, 0.48], sad: [0.18, 0.48], angry: [0.52, 0.16], smug: [0.42, 0.42] }[mood] || [0, 0], li = Math.max(ml[0], lid), lo = Math.max(ml[1], lid);
      g.save(); if (li > 0.02 || lo > 0.02) { const xi = x0 - sd * rx * 1.3, xo = x0 + sd * rx * 1.3; g.beginPath(); g.moveTo(xi, ey - ry + 2 * ry * li); g.lineTo(xo, ey - ry + 2 * ry * lo); g.lineTo(xo, ey + ry * 1.3); g.lineTo(xi, ey + ry * 1.3); g.closePath(); g.clip(); }
      const nb = E.nb ?? o.eyeNB ?? 2; if (nb !== 2) supEll(g, x0, ey, rx, ry, sd * 0.06, 2, nb); else ell(g, x0, ey, rx, ry, sd * 0.06); g.fillStyle = o.white || '#FDF2E4'; g.fill(); g.clip();   // o.eyeNB / E.nb: a flatter lower lid (superellipse power of the bottom half, 2 = round)
      g.fillStyle = o.iris || '#014D7B'; const ir = rx * 0.56 * (o.irisS ?? 1) / (E.w ?? 1); ell(g, x0 + look * 1.6 + tn * rx * 0.3 + (E.ix || 0) * s, ey + ry * 0.08 + ((o.irisY || 0) + (E.iy || 0)) * s, ir, ir); g.fill();
      g.restore(); continue; }
    if (close) { const r = s * 0.12; g.fillStyle = '#fff'; ell(g, x0, ey, r, r * 1.04); g.fill(); g.fillStyle = o.iris || '#7A3A1A'; ell(g, x0 + look, ey + r * 0.04, r * 0.62, r * 0.66); g.fill();
      g.fillStyle = PAL.ink; ell(g, x0 + look, ey + r * 0.06, r * 0.34, r * 0.36); g.fill(); g.fillStyle = '#fff'; ell(g, x0 + look + r * 0.18, ey - r * 0.16, r * 0.17, r * 0.17); g.fill();
      if (lid > 0.02) { const ly = ey - r * 1.08 + r * 2.16 * lid; g.save(); ell(g, x0, ey, r * 1.01, r * 1.05); g.clip(); g.fillStyle = dk(skin, 0.04); g.fillRect(x0 - r * 1.2, ey - r * 1.2, r * 2.4, ly - ey + r * 1.2);
        g.strokeStyle = dk(skin, 0.38); g.lineWidth = r * 0.14; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0 - r * 1.1, ly - r * 0.05); g.quadraticCurveTo(x0, ly + r * 0.12, x0 + r * 1.1, ly - r * 0.05); g.stroke(); g.restore(); } }
    else { const r = s * (mood === 'shock' ? 0.09 : 0.075) * (o.eyeS ?? 1), cx = x0 + look; g.fillStyle = o.eyeCol || '#2A0A4A'; ell(g, cx, ey, r, r); g.fill();
      // the mood is in the LIDS (measured close up): a skin lid cuts the dot flat across the top, slanting down to the outside when
      // worried or sad, down to the inside when angry, level when tired (o.lid) or mid-blink
      const ml = { worried: [0.18, 0.48], sad: [0.18, 0.48], angry: [0.52, 0.16], smug: [0.42, 0.42] }[mood] || [0, 0];
      const li = Math.max(ml[0], lid), lo = Math.max(ml[1], lid);
      if (li > 0.02 || lo > 0.02) { const xi = cx - sd * r * 1.15, xo = cx + sd * r * 1.15; g.save(); ell(g, cx, ey, r * 1.03, r * 1.03); g.clip(); g.fillStyle = skin; g.beginPath();
        g.moveTo(xi, ey - r * 1.2); g.lineTo(xi, ey - r + 2 * r * li); g.lineTo(xo, ey - r + 2 * r * lo); g.lineTo(xo, ey - r * 1.2); g.closePath(); g.fill(); g.restore(); } } }
  // the parted cut's blade strand lies OVER the eye (measured)
  if (hs === 'parted' && o.strand !== false) { g.save(); g.translate(-fx_ - (o.featX || 0) * s + hsh, -(o.featY || 0) * s); g.scale(m, 1); g.fillStyle = hair; spline(g, HAIR.partedStrand, s); g.fill(); g.restore(); }
  // o.strand: one lock falling from the hairline over an eye, tapering to a point (long hair, measured)
  if (o.strand) { const k = o.strand === 'left' ? -1 : 1; g.fillStyle = hair; g.beginPath(); g.moveTo(k * s * 0.0, -s * 0.66); g.quadraticCurveTo(k * s * 0.2, -s * 0.36, k * s * 0.17, ey + s * 0.02); g.quadraticCurveTo(k * s * 0.12, -s * 0.3, -k * s * 0.08, -s * 0.6); g.closePath(); g.fill(); }
  // the nose: a small rounded shape a shade deeper than the skin (most newer references), 'bulb' for an older man, 'line', or false
  const nose = o.nose === 'none' ? false : o.nose ?? 'soft';
  if (nose && mood !== 'dead') { g.fillStyle = deep(skin); if (nose === 'bean') { cap(g, s * 0.0, ey + s * 0.03, -s * 0.01, ey + s * 0.1, s * 0.05, deep(skin)); ell(g, s * 0.008, ey + s * 0.115, s * 0.03, s * 0.024); g.fill(); }
    else if (nose === 'bulb') { ell(g, s * 0.01, ey + s * 0.12, s * 0.075, s * 0.06); g.fill(); }
    else if (nose === 'line') cap(g, s * 0.012, ey + s * 0.06, -s * 0.012, ey + s * 0.135, s * 0.032, dk(skin, 0.16)); else { ell(g, s * 0.012, ey + s * 0.125, s * 0.042, s * 0.032); g.fill(); } }
  if (o.cheeks === 'deep') { g.fillStyle = mix(skin, deep(skin), 0.75); for (const sd of [-1, 1]) { rr(g, sd * s * 0.3 - s * 0.085, ey + s * 0.07, s * 0.17, s * 0.11, s * 0.055); g.fill(); } }
  else if (o.cheeks) { g.fillStyle = rgba(PAL.cheek, 0.35); for (const sd of [-1, 1]) { ell(g, sd * s * 0.32, ey + s * 0.16, s * 0.08, s * 0.05); g.fill(); } }
  // sweat (measured): o.drops 1-6 rounded drops on the face, pale at the top, bright cyan below, popping on one by one from
  // o.dropsAt (3 frames apart) as the worry builds
  if (o.drops) { const spots = [[0.16, -0.37], [0.0, -0.17], [-0.45, -0.08], [0.17, 0.2], [-0.22, -0.3], [0.38, 0.05]];
    for (let i = 0; i < Math.min(6, o.drops); i++) { const st = ENTER(t, (o.dropsAt ?? -9) + i * 3 / FPS, 'pop'); if (st.sc <= 0.01) continue; const w = s * 0.056 * st.sc, h = s * 0.078 * st.sc, px = spots[i][0] * s, py = spots[i][1] * s;
      const gr = g.createLinearGradient(0, py - h / 2, 0, py + h / 2); gr.addColorStop(0, 'rgba(150,215,225,0.85)'); gr.addColorStop(1, '#00D2FF'); g.fillStyle = gr; rr(g, px - w / 2, py - h / 2, w, h, w / 2); g.fill(); } }
  // mouth: a small red capsule; moods bend or open it (o.mouth 'o' = the round open mouth of a gasp or an ill face)
  const my = ey + s * (o.mouthY ?? (0.24 + ((o.chin ?? 0.46) - 0.46) * 0.8)), mc = o.mouthCol || (o.mouth === 'o' ? '#CC5A59' : '#B8001E'); g.save(); g.translate(s * (o.mouthX || 0), 0); g.lineCap = 'round';
  const mAuto = o.mouth === 'auto' || o.mouth === 'none' || o.mouth === 'curve';
  if (mAuto && !talking && mood !== 'shock' && (o.mouth === 'none' || (o.mouth === 'auto' && (mood === 'calm' || mood === 'neutral') && s < 150))) { /* measured v2: no mouth until they speak or feel */ }
  else if (mAuto && !talking && mood !== 'shock' && mood !== 'sad' && mood !== 'angry') { const wdt = s * (mood === 'happy' || mood === 'bliss' ? 0.1 : 0.065); g.strokeStyle = mc; g.lineWidth = s * 0.036; g.beginPath(); g.arc(0, my - wdt * 0.9, wdt * 1.25, Math.PI * 0.3, Math.PI * 0.7); g.stroke(); }   // a small smile curve
  else if (o.mouth === 'o') { g.fillStyle = mc; ell(g, s * 0.005, my + s * 0.04, s * 0.078, s * 0.07); g.fill(); }
  else if (talking && mood !== 'shock' && mood !== 'dead') { g.fillStyle = mc; ell(g, 0, my + s * 0.015, s * 0.06, s * 0.048); g.fill(); g.fillStyle = '#FF6A8A'; ell(g, 0, my + s * 0.04, s * 0.035, s * 0.02); g.fill(); }
  else if (mood === 'shock') { g.fillStyle = mc; ell(g, 0, my + s * 0.02, s * 0.05, s * 0.065); g.fill(); }
  else if (mood === 'happy' || mood === 'bliss') { const mr = s * (o.mouthR || 0), ma = (o.mouthTilt || 0) * D2R; g.fillStyle = mc; g.beginPath(); g.ellipse(-Math.sin(ma) * mr, my - s * 0.025 + Math.cos(ma) * mr, s * (o.mouthW ?? 0.115) - mr, s * (o.mouthH ?? 0.1) - mr * 2, ma, 0, Math.PI); g.closePath(); g.fill();
    if (mr > 0) { g.strokeStyle = mc; g.lineWidth = mr * 2; g.lineJoin = 'round'; g.stroke(); } }   // o.mouthR rounds the two corners (measured on smiling dancers)   // a half-disc
  else if (mood === 'sad') { g.strokeStyle = mc; g.lineWidth = s * 0.035; g.beginPath(); g.arc(0, my + s * 0.06, s * 0.06, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  else if (mood === 'smug') { g.strokeStyle = mc; g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(-s * 0.05, my); g.quadraticCurveTo(s * 0.03, my + s * 0.03, s * 0.08, my - s * 0.03); g.stroke(); }
  else if (mood === 'angry') cap(g, -s * 0.06, my + s * 0.01, s * 0.06, my - s * 0.01, s * 0.04, mc);
  else cap(g, -s * (o.mouthW ?? 0.05), my, s * (o.mouthW ?? 0.05), my, s * (o.mouthH ?? 0.045), mc);
  g.restore(); g.restore();
  if (o.faceFn) o.faceFn(g, s);                                                         // anything worn on the head (earrings, glasses, a plaster): drawn last, in head space
  g.restore();
}

// ── depth (the style's planes) ──────────────────────────────────────────────────────────────────────────────────────
// A frame is built in planes: far background (hazed toward the ground colour, a little soft), the subject plane (crisp, bright,
// rim-lit), and dark foreground shapes close to the lens (blurred, framing the subject). During pushes and whips every plane
// moves at its own speed (parallax), so the picture has real depth. depth(g, z, fn): z = 1 subject, 2-4 far, 0.3-0.7 near.
// It blurs by distance (o.blur overrides) and shifts with the camera. haze() pushes everything drawn so far back.
let CAM = { x: 0, y: 0 }, NOW = 0;
// with MOTION.life (the card's motion.life) every plane that isn't the subject also drifts on its own, slowly and out of step
// (far planes ~0.4 % of the frame over ~15 s, near ones ~1 %): the background is never locked, even in a quiet hold. o.still: 0 drift.
function depth(g, z, fn, o = {}) {
  const k = 1 / Math.max(0.15, z), b = o.blur ?? (z < 0.85 ? (0.85 - z) * 40 : z > 1.6 ? (z - 1.6) * 3 : 0);
  const lv = MOTION.life && !o.still && Math.abs(z - 1) > 0.05 ? Math.min(1, Math.abs(z - 1)) * (z < 1 ? 2.4 : 1) : 0, dx = lv * Math.sin(NOW * (0.32 + 0.07 * z) + z * 2.3) * W * 0.004, dy = lv * Math.cos(NOW * 0.27 + z * 1.7) * H * 0.0025;
  g.save(); g.translate(CAM.x * (k - 1) + dx, CAM.y * (k - 1) + dy); const wash = o.wash ? ' brightness(1.12) saturate(0.8) contrast(0.82)' : '';
  if (b > 0.3 || wash) g.filter = (b > 0.3 ? `blur(${b.toFixed(1)}px)` : '') + wash; fn(); g.restore();
}
function haze(g, col, a = 0.35, o = {}) { const gr = g.createLinearGradient(0, o.y0 ?? 0, 0, o.y1 ?? H); gr.addColorStop(0, rgba(col, a * (o.top ?? 1))); gr.addColorStop(1, rgba(col, a * (o.bottom ?? 0.6))); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
// near-lens silhouettes framing the subject: heads and shoulders along the bottom, dark, blurred; o.size scales them (a club crowd
// close to the lens: ~1.6, covering the lower third and the dancers' legs), o.hands raises an arm at each edge (never over the subject), o.lift
function fgCrowd(g, seed, col, o = {}) { depth(g, o.z ?? 0.45, () => { const R = rng(seed), n = o.n || 5; g.fillStyle = col;
  for (let i = 0; i < n; i++) { const x = lerp(-80, W + 80, (i + R() * 0.6) / n), s = lerp(260, 420, R()) * (o.size || 1), y = H + s * lerp(0.05, 0.35, R()) - (o.lift || 0);
    if (o.cols) g.fillStyle = o.cols[i % o.cols.length];   // o.cols: alternate tones (a club crowd: plum and indigo)
    ell(g, x, y - s * 0.9, s * 0.36, s * 0.4); g.fill(); rr(g, x - s * 0.62, y - s * 0.5, s * 1.24, s * 1.2, s * 0.4); g.fill();
    if (o.hands && (i === 0 || i === n - 1)) { const sd = i === 0 ? 1 : -1; cap(g, x + sd * s * 0.4, y - s * 0.55, x + sd * s * 0.62, y - s * 1.45, s * 0.2, col); ell(g, x + sd * s * 0.64, y - s * 1.55, s * 0.17, s * 0.19); g.fill(); } } }); }
// soft light beams from above (stage light, sun through water): cones that fade downwards
function beams(g, x, y, n, col, o = {}) { const R = rng(o.seed || 3); g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const a = lerp(-0.5, 0.5, n > 1 ? i / (n - 1) : 0.5) * (o.spread ?? 1) + (R() - 0.5) * 0.1 + Math.sin((o.t || 0) * 0.5 + i) * 0.03, L = o.len || H * 1.1, w = (o.w || 160) * lerp(0.7, 1.3, R());
  const gr = g.createLinearGradient(x, y, x + Math.sin(a) * L, y + Math.cos(a) * L); gr.addColorStop(0, rgba(col, o.a ?? 0.22)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - w * 0.15, y); g.lineTo(x + w * 0.15, y); g.lineTo(x + Math.sin(a) * L + w, y + Math.cos(a) * L); g.lineTo(x + Math.sin(a) * L - w, y + Math.cos(a) * L); g.closePath(); g.fill(); } g.restore(); }
// lens bokeh: bright saturated discs in three planes (near = big, very soft, moves fastest in a camera move; far = small and
// crisp), denser toward the frame edges and the bottom. The dark glow scenes' main depth cue. cols = a few palette colours.
function lensBokeh(g, seed, n, cols, t, o = {}) { const R = rng(seed);
  [[0.38, 0.32, 95, 150], [0.6, 0.38, 46, 80], [0.82, 0.3, 18, 38]].forEach(([z, share, r0, r1], li) => depth(g, z, () => {
    g.save(); g.globalCompositeOperation = o.add ? 'lighter' : 'source-over';
    for (let i = 0; i < Math.round(n * share); i++) { const side = R() < 0.5 ? R() * 0.3 : 0.7 + R() * 0.3, x = (R() < (o.centre ?? 0.35) ? R() : side) * W, y = Math.pow(R(), o.low ?? 0.6) * H,
      r = lerp(r0, r1, R()), col = cols[Math.floor(R() * cols.length)], dr = Math.sin(t * lerp(0.3, 0.8, R()) + i) * (12 + li * 4);
      g.fillStyle = rgba(col, lerp(0.55, 0.9, R()) * (o.a ?? 1)); ell(g, x + dr, y - t * (10 - li * 3), r, r); g.fill(); }
    g.restore(); }, { blur: [26, 12, 3][li] * (o.soft ?? 1) })); }
// a tube along a path (food going down, a nerve signal): a thick bright line with a dark core and dots running along it.
// pts = [[x,y], ...]; o.p 0..1 draws it on; o.speed px/s; o.gap between dots.
function tube(g, pts, t, o = {}) { const col = o.col || PAL.yellow, w = o.w || 30, seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  const shown = L * clamp(o.p ?? 1), line = (c, lw) => { g.save(); g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([shown, L + 1]); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.stroke(); g.restore(); };
  line(col, w); line(o.core || dk(PAL.violet, 0.25), w * 0.46);
  const at = d => { for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const k = d / seg[i]; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d -= seg[i]; } return pts[pts.length - 1]; };
  g.fillStyle = o.dot || col; const gap = o.gap || 70; for (let d = (t * (o.speed || 160)) % gap; d < shown; d += gap) { const [x, y] = at(d); ell(g, x, y, w * 0.2, w * 0.2); g.fill(); } }
// a backdrop shape behind a hero (the spotlight egg / blob), with its darker offset copy as the cast shadow
// o.col2 = a second colour: the disc runs top (col) to bottom (col2), as the reference's orange-to-yellow egg does
function backdrop(g, x, y, rx, ry, col, o = {}) { g.save(); g.fillStyle = dk(o.ground || col, 0.12); ell(g, x + rx * 0.08, y - ry * 0.04, rx, ry); g.fill();
  let gr; if (o.col2) { gr = g.createLinearGradient(0, y - ry, 0, y + ry); gr.addColorStop(0, col); gr.addColorStop(1, o.col2); } else { gr = g.createRadialGradient(x, y - ry * 0.3, ry * 0.1, x, y, ry); gr.addColorStop(0, lt(col, 0.08)); gr.addColorStop(1, col); }
  g.fillStyle = gr; ell(g, x, y, rx, ry); g.fill(); g.restore(); }

// ── detail and depth (studied close-up on the reference frames) ────────────────────────────────────────────────────
// tiny white specular specks on glossy shapes (a soft oval and a dot), upper left of the form
function specks(g, x, y, r, a = 0.9) { g.save(); g.fillStyle = rgba('#FFFFFF', a); ell(g, x, y, r, r * 0.6, -0.6); g.fill(); ell(g, x + r * 1.3, y + r * 0.9, r * 0.32, r * 0.32); g.fill(); g.restore(); }
// cast shadow: the style's strongest depth cue. A character throws a flat copy of its WHOLE silhouette (arms, legs, gloves)
// onto the backdrop behind it, offset up/right, in the ground's dark colour. shadowed(g, gg => draw(gg), {dx, dy, col}).
const _S = new OffscreenCanvas(W, H), gS = _S.getContext('2d');
function shadowed(g, fn, o = {}) { const T = g.getTransform();
  gS.setTransform(1, 0, 0, 1, 0, 0); gS.globalCompositeOperation = 'source-over'; gS.globalAlpha = 1; gS.filter = 'none'; gS.clearRect(0, 0, W, H); gS.setTransform(T); fn(gS);
  gS.setTransform(1, 0, 0, 1, 0, 0); gS.globalCompositeOperation = 'source-in'; gS.fillStyle = o.col || 'rgba(26,6,60,0.92)'; gS.fillRect(0, 0, W, H); gS.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (o.blur) g.filter = `blur(${o.blur}px)`; g.drawImage(_S, o.dx ?? 60, o.dy ?? -34); g.restore(); fn(g); }
// a puffy cloud: overlapping round bumps on a rounded base, a darker band underneath, a light strip on top. o.face draws the
// style's sad/happy cloud face (white eyes with lids, pink cheeks). o.rain = streak count.
function cloud(g, x, y, w, col = '#B9C6FF', o = {}) {
  const B = [[-0.3, -0.02, 0.22], [-0.06, -0.16, 0.28], [0.22, -0.06, 0.24], [0.4, 0.06, 0.15], [-0.43, 0.08, 0.14]];
  const path = gg => { gg.beginPath(); for (const [bx, by, br] of B) { gg.moveTo(x + bx * w + br * w, y + by * w); gg.arc(x + bx * w, y + by * w, br * w, 0, Math.PI * 2); } gg.roundRect(x - w * 0.55, y - w * 0.02, w * 1.08, w * 0.24, w * 0.12); };
  if (o.rain) { g.save(); g.lineCap = 'round'; const R = rng(o.seed || 4); for (let i = 0; i < o.rain; i++) { const rx = x + lerp(-0.4, 0.4, (i + 0.5) / o.rain) * w, L = w * lerp(0.15, 0.35, R()), yy = y + w * 0.26 + ((o.t || 0) * 300 + R() * 200) % (w * 0.3);
    cap(g, rx, yy, rx, yy + L, w * 0.022, rgba(i % 2 ? '#7FD8FF' : '#B8F0FF', 0.85)); } g.restore(); }
  flat(g, path, col, w, { sx: 0.02, sy: 0.07, k: 0.07, hl: true, hlCol: lt(col, 0.07) });
  if (o.face) { const ey = y + w * 0.02, ex = w * 0.14, r = w * 0.075, mood = o.mood || 'sad';
    for (const sd of [-1, 1]) { g.save(); ell(g, x + sd * ex, ey, r, r * 0.95); g.fillStyle = '#fff'; g.fill(); g.clip(); g.fillStyle = '#2A1E6E'; ell(g, x + sd * ex, ey + r * 0.2, r * 0.42, r * 0.5); g.fill();
      g.fillStyle = dk(col, 0.04); g.save(); g.translate(x + sd * ex, ey - r); g.rotate(mood === 'sad' ? sd * 0.3 : 0); g.fillRect(-r * 1.5, -r, r * 3, r * (mood === 'sad' ? 1.75 : 1.3)); g.restore(); g.restore();
      g.fillStyle = rgba('#FF6FA8', 0.85); ell(g, x + sd * ex * 2.05, ey + r * 0.7, r * 0.75, r * 0.45); g.fill(); }
    g.save(); g.strokeStyle = '#2A1E6E'; g.lineWidth = w * 0.018; g.lineCap = 'round'; g.beginPath(); if (mood === 'sad') g.arc(x, ey + r * 1.5, r * 0.4, Math.PI * 1.15, Math.PI * 1.85); else g.arc(x, ey + r * 0.6, r * 0.4, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); g.restore(); }
}
// a bush / tree crown: three overlapping bumps with the style's shading
function bush(g, x, y, s, col) { flat(g, gg => { gg.beginPath(); for (const [bx, by, br] of [[-0.32, -0.25, 0.3], [0, -0.45, 0.38], [0.32, -0.28, 0.3]]) { gg.moveTo(x + bx * s + br * s, y + by * s); gg.arc(x + bx * s, y + by * s, br * s, 0, Math.PI * 2); } gg.rect(x - s * 0.62, y - s * 0.3, s * 1.24, s * 0.3); }, col, s, { sx: 0.1, sy: 0.04 }); }
// a rolling band of land (hills, dunes, mountains with o.peaks) from baseline y with amplitude amp, filled down past the frame
function hills(g, seed, y, amp, col, o = {}) { const R = rng(seed), k = [R() * 6, R() * 6, R() * 6], f = o.freq || 1;
  g.save(); g.fillStyle = col; g.beginPath(); g.moveTo(-W, H * 2.5); for (let x = -W; x <= 2 * W; x += 18) { const u = x / W * f;
    let v = 0.55 * Math.sin(u * 3.1 + k[0]) + 0.3 * Math.sin(u * 7.3 + k[1]) + 0.15 * Math.sin(u * 13 + k[2]); if (o.peaks) v = 1 - Math.abs(v) * 2; g.lineTo(x, y - amp * v); }
  g.lineTo(2 * W, H * 2.5); g.closePath(); g.fill(); g.restore(); }
// a landscape in planes (atmospheric perspective, measured): the far plane is light and close to the sky colour, every nearer
// plane is darker and more saturated, the nearest is the ground. Each plane sits in depth() so camera moves give parallax.
// layers = [[baseline y, amplitude, z, o?], ...] far to near. o.bushes adds bush clusters on the near planes.
function landscape(g, skyTop, skyBot, ground, layers, o = {}) {
  bg(g, skyTop, skyBot);
  layers.forEach(([y, amp, z, lo = {}], i) => { const k = layers.length > 1 ? i / (layers.length - 1) : 1, col = lo.col || mix(skyBot, ground, lerp(0.28, 1, k));
    depth(g, z, () => { hills(g, 31 + i * 7, y, amp, col, lo); if (lo.bushes) { const R = rng(51 + i); for (let b = 0; b < lo.bushes; b++) { const bx = R() * W * 1.2 - W * 0.1; bush(g, bx, y + amp * 0.25 + 10, lerp(70, 130, R()) * (lo.bushScale || 1), dk(col, 0.06)); } } }, { blur: lo.blur }); });
}

// ── talking objects (the style's signature device: our own designs) ────────────────────────────────────────────────
// obj(g, o): an everyday object with huge white eyes, noodle limbs, white mitten gloves and red sneakers.
// o.x, o.y = feet centre; o.w, o.h = body size; o.body = (g, w, h) => draws the object centred at (0,-h/2) (or o.shape
// 'box'|'jar'|'bottle'|'bowl'|'can'|'blob' with o.col and o.label text); o.pose 'stand'|'dance'|'wave'|'proud'|'scared'|'run';
// o.t time; o.look -1..1; o.mood 'calm'|'happy'|'angry'|'scared'|'sly'; o.limb colour; o.shoe colour; o.ground for the shadow.
function obj(g, o) {
  const w = o.w || 300, h = o.h || 380, t = o.t || 0, limb = o.limb || PAL.limb, shoe = o.shoe || PAL.sneaker, pose = o.pose || 'stand';
  const beat = pose === 'dance' ? Math.abs(Math.sin(t * Math.PI * 2)) : pose === 'run' ? Math.abs(Math.sin(t * Math.PI * 4)) : 0;
  const hop = beat * h * 0.06, squash = 1 - beat * 0.04;
  g.save(); g.translate(o.x, o.y);
  if (o.ground) floorShadow(g, 0, 0, w * 1.2, o.ground);
  const legY = -h * 0.12 - hop, LW = Math.max(10, w * 0.07);             // measured: limbs 7 % of the body width
  for (const side of [-1, 1]) {                            // legs + sneakers
    const kick = pose === 'run' ? Math.sin(t * Math.PI * 4 + (side > 0 ? Math.PI : 0)) * w * 0.12 : pose === 'dance' ? Math.sin(t * Math.PI * 2 + side) * w * 0.05 : 0;
    const fx = side * w * 0.22 + kick, fy = -h * 0.02 - (pose === 'run' ? Math.max(0, kick * side * 0.4) : 0);
    noodle(g, [[side * w * 0.2, legY], [side * w * 0.24 + kick * 0.5, (legY + fy) / 2], [fx, fy]], LW, limb);
    // chunky sneakers (measured: both shoes ~0.57 of the body width), darker sole
    g.save(); g.translate(fx + side * w * 0.05, fy); g.fillStyle = dk(shoe, 0.18); rr(g, -w * 0.15, -w * 0.02, w * 0.3, w * 0.07, w * 0.035); g.fill();
    g.fillStyle = shoe; rr(g, -w * 0.15, -w * 0.11, w * 0.27, w * 0.12, w * 0.06); g.fill(); g.fillStyle = '#fff'; ell(g, w * 0.06, -w * 0.07, w * 0.03, w * 0.025); g.fill(); g.restore();
  }
  for (const side of [-1, 1]) {                            // arms + mitten gloves
    let ang = { stand: 20, dance: 70 + Math.sin(t * Math.PI * 2 + side) * 50, wave: side > 0 ? 150 + Math.sin(t * 9) * 20 : 25, proud: 130, scared: 160 + Math.sin(t * 20) * 6, run: 40 + Math.sin(t * Math.PI * 4 + side) * 40 }[pose] ?? 20;
    if (pose === 'proud') ang = side > 0 ? 40 : 40;
    const a = ang * Math.PI / 180, sx = side * w * 0.48, sy = -h * 0.55 - hop, L = w * 0.55;
    const hx = sx + side * Math.sin(a) * L, hy = sy + Math.cos(a) * L * (pose === 'proud' ? -0.2 : 1) - (ang > 90 ? L * 0.2 : 0);
    noodle(g, [[sx, sy], [sx + side * L * 0.45, sy + (hy - sy) * 0.15 + L * 0.15], [hx, hy]], LW, limb);
    // puffy white mitts (measured ~0.17 of the body width each) with a thumb and a soft grey shade
    g.fillStyle = '#fff'; ell(g, hx, hy, w * 0.1, w * 0.094); g.fill(); ell(g, hx + side * w * 0.078, hy - w * 0.05, w * 0.046, w * 0.056); g.fill(); rr(g, hx - side * w * 0.11 - w * 0.03, hy - w * 0.05, w * 0.06, w * 0.1, w * 0.03); g.fill();
    g.save(); ell(g, hx, hy, w * 0.1, w * 0.094); g.clip(); g.fillStyle = '#CFE4FF'; ell(g, hx - side * w * 0.03, hy + w * 0.075, w * 0.12, w * 0.06); g.fill(); g.restore();   // cool shade under the puff
  }
  g.save(); g.translate(0, -hop); g.scale(1 / squash * 0.5 + 0.5, squash);
  if (o.body) o.body(g, w, h); else objShape(g, o.shape || 'box', w, h, o.col || PAL.yellow, o);
  // the eyes (measured: each 0.4 of the body width, 0.36 of its height): two big overlapping white ovals with a cool blue shade
  // in their lower part, tall navy pupil blocks with a catchlight, and a lid in its OWN colour (often a warm contrast, e.g.
  // coral on a pale object) with a lighter top, angled by mood
  const ery = h * (o.eyeH ?? 0.36) / 2, erx = w * 0.2, ey = -h * (o.eyeY ?? 0.66), ex = w * 0.165, lk = (o.look || 0) * erx * 0.35, mood = o.mood || 'calm';
  const bl = lidOf(t + 1.3, 0, 3.1), blink = bl > 0.75, lidC = o.lidCol || dk(o.col || PAL.yellow, 0.06);
  for (const side of [1, -1]) { const cx = side * ex;
    g.save(); ell(g, cx, ey, erx, ery); g.fillStyle = '#fff'; g.fill(); g.clip();
    g.fillStyle = o.scleraShade || '#CFEAFF'; ell(g, cx + erx * 0.15, ey + ery * 0.98, erx * 1.25, ery * 0.6); g.fill();
    if (!blink) { const px = cx + lk - side * erx * 0.1; g.fillStyle = o.pupil || '#0D2F7A'; rr(g, px - erx * 0.31, ey - ery * 0.28, erx * 0.62, ery * 0.98, erx * 0.31); g.fill();
      g.fillStyle = '#fff'; ell(g, px + erx * 0.06, ey - ery * 0.08, erx * 0.11, erx * 0.11); g.fill(); }
    const lid = Math.max(bl, { sly: 0.44, angry: 0.38, happy: 0.12, calm: 0.18, sad: 0.3 }[mood] ?? 0);
    if (lid) { g.save(); g.translate(cx, ey - ery); g.rotate(mood === 'angry' ? -side * 0.35 : mood === 'sad' ? side * 0.3 : side * 0.08); const lh = ery * 2 * lid + ery * 0.1;
      g.fillStyle = lidC; g.fillRect(-erx * 1.6, -ery, erx * 3.2, ery + lh); g.fillStyle = lt(lidC, 0.07); g.fillRect(-erx * 1.6, -ery, erx * 3.2, ery + lh * 0.42); g.restore(); }
    g.restore(); }
  const er = erx;
  if (o.mouth !== false) { g.save(); g.strokeStyle = PAL.ink; g.lineWidth = w * 0.022; g.lineCap = 'round'; const my = ey + ery * 1.3;
    if (mood === 'scared') { g.fillStyle = '#5A1E2E'; ell(g, 0, my + 6, w * 0.05, w * 0.06); g.fill(); } else { g.beginPath(); g.arc(0, my - w * 0.05, w * 0.08, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); } g.restore(); }
  g.restore(); g.restore();
}
// the built-in object bodies (flat, no outline, one shading crescent); body is drawn with its feet line at y=0
function objShape(g, shape, w, h, col, o = {}) {
  const top = -h * 0.95;
  if (shape === 'box') { flat(g, gg => rr(gg, -w / 2, top, w, h * 0.85, w * 0.08), col, w, { hl: true }); if (o.label) { g.fillStyle = '#fff'; rr(g, -w * 0.38, top + h * 0.06, w * 0.76, h * 0.18, w * 0.05); g.fill(); txt(g, o.label, 0, top + h * 0.15, { size: w * 0.13, font: 'H', col: o.labelCol || PAL.blue, maxW: w * 0.68 }); } }
  else if (shape === 'jar') { flat(g, gg => rr(gg, -w / 2, top + h * 0.12, w, h * 0.73, w * 0.18), col, w, { hl: true }); flat(g, gg => rr(gg, -w * 0.44, top, w * 0.88, h * 0.15, w * 0.06), o.lid || PAL.red, w * 0.8);
    if (o.label) { g.fillStyle = '#fff'; rr(g, -w * 0.4, top + h * 0.42, w * 0.8, h * 0.2, w * 0.04); g.fill(); txt(g, o.label, 0, top + h * 0.52, { size: w * 0.13, font: 'H', col: PAL.ink, maxW: w * 0.7 }); } }
  else if (shape === 'bottle') { flat(g, gg => { gg.beginPath(); gg.moveTo(-w * 0.16, top); gg.lineTo(w * 0.16, top); gg.lineTo(w * 0.16, top + h * 0.2); gg.quadraticCurveTo(w * 0.5, top + h * 0.3, w * 0.5, top + h * 0.45); gg.lineTo(w * 0.5, top + h * 0.78); gg.quadraticCurveTo(w * 0.5, top + h * 0.85, w * 0.4, top + h * 0.85); gg.lineTo(-w * 0.4, top + h * 0.85); gg.quadraticCurveTo(-w * 0.5, top + h * 0.85, -w * 0.5, top + h * 0.78); gg.lineTo(-w * 0.5, top + h * 0.45); gg.quadraticCurveTo(-w * 0.5, top + h * 0.3, -w * 0.16, top + h * 0.2); gg.closePath(); }, col, w, { hl: true });
    g.fillStyle = o.lid || PAL.red; rr(g, -w * 0.19, top - h * 0.06, w * 0.38, h * 0.09, w * 0.04); g.fill(); }
  else if (shape === 'bowl') { flat(g, gg => { gg.beginPath(); gg.moveTo(-w / 2, top + h * 0.35); gg.lineTo(w / 2, top + h * 0.35); gg.quadraticCurveTo(w * 0.48, top + h * 0.85, 0, top + h * 0.85); gg.quadraticCurveTo(-w * 0.48, top + h * 0.85, -w / 2, top + h * 0.35); gg.closePath(); }, col, w);
    if (o.fill) { g.fillStyle = o.fill; ell(g, 0, top + h * 0.35, w * 0.5, h * 0.09); g.fill(); blob(g, 0, top + h * 0.3, w * 0.36, 7, 0.15); g.fill(); } }
  else if (shape === 'can') { flat(g, gg => rr(gg, -w / 2, top, w, h * 0.85, w * 0.12), col, w, { hl: true }); g.fillStyle = '#D9DDE8'; ell(g, 0, top + w * 0.06, w * 0.48, w * 0.07); g.fill(); }
  else { flat(g, gg => blob(gg, 0, top + h * 0.45, Math.min(w, h) * 0.5, o.seed || 3, 0.1), col, w, { hl: true }); }
}

// ── devices ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// zoom bubble (measured): a navy disc (#11004C) magnifying a micro world, its ring 0.058 of the radius thick (amber #FFBA00, or
// violet #9955FA on warm skies), NO shadow, and a pointer to what it magnifies: a thin line (o.stalk, 0.62 of the ring) or a short
// thick stub (o.stub). The measured entrance, popOut(t, t0): the pointer grows out of the object for 7 frames, then the bubble grows
// off its tip for 8 frames (glide, no overshoot); popOut(t, t0, {dot: true}) holds a small seed dot for 5 frames first.
// inside(g, cx, cy, r) draws the micro view (clipped). p = 0..1 growth, o.stalk = [x, y] on the object, o.stalkP 0..1, o.ring, o.w.
const popOut = (t, t0, o = {}) => { const f = (t - t0) * FPS, d = o.dot ? 5 : 0; return { stalkP: glide(clamp(f / 7)), p: glide(clamp((f - 7 - d) / 8)), dot: !!o.dot && f >= 7 && f < 7 + d + 1 }; };
function bubble(g, x, y, r, p, inside, o = {}) { if (p > 0.5) mark(g, 'device', x - r, y - r, x + r, y + r, 'bubble', 'ell');
  const ring = o.ring || '#FFBA00', rw = o.w || r * 0.058;
  let fx = o.fx ?? x, fy = o.fy ?? y;
  if (o.stalk) { const a = Math.atan2(o.stalk[1] - y, o.stalk[0] - x), ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r, k = o.stalkP ?? 1;
    if (o.fx === undefined) { fx = ex; fy = ey; }
    if (k > 0) cap(g, o.stalk[0], o.stalk[1], lerp(o.stalk[0], ex, k), lerp(o.stalk[1], ey, k), rw * (o.stub ? 1.3 : 0.62), ring); }
  if (o.dot && p <= 0.001) { g.fillStyle = ring; ell(g, fx, fy, rw * 1.3, rw * 1.3); g.fill(); }
  if (p <= 0.001) return; const cx = lerp(fx, x, p), cy = lerp(fy, y, p), R = r * p;
  if (!o.stalk && o.cone !== false && (fx !== x || fy !== y)) { g.save(); g.fillStyle = rgba(ring, 0.18); g.beginPath(); const a = Math.atan2(cy - fy, cx - fx) + Math.PI / 2; g.moveTo(fx, fy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); g.closePath(); g.fill(); g.restore(); }
  g.save(); ell(g, cx, cy, R, R); g.clip(); g.fillStyle = o.fill || '#11004C'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); inside(g, cx, cy, R); g.restore();
  g.save(); g.strokeStyle = ring; g.lineWidth = rw * Math.min(1, p * 1.5); ell(g, cx, cy, R, R); g.stroke();
  if (o.shadow) { g.strokeStyle = rgba('#000000', 0.15); g.lineWidth = 6; ell(g, cx + 4, cy + 6, R + rw / 2, R + rw / 2); g.stroke(); } g.restore();
}
// crowd grid: one little figure tiled to fill an area, split into two colours to show a share; fills in row by row with p
function crowd(g, o) {
  const cols = o.cols || 12, rows = o.rows || 16, x0 = o.x ?? 60, y0 = o.y ?? 260, ww = o.w ?? W - 120, hh = o.h ?? H * 0.62, cw = ww / cols, ch = hh / rows;
  const n = cols * rows, shown = Math.floor(n * clamp(o.p ?? 1)), split = Math.round(n * (o.share ?? 0));
  for (let i = 0; i < shown; i++) { const c = i % cols, r = Math.floor(i / cols), x = x0 + (c + 0.5 + (r % 2 ? 0.25 : -0.25)) * cw, y = y0 + (r + 0.5) * ch, col = i < split ? (o.colB || PAL.magenta) : (o.colA || PAL.violet), sz = Math.min(cw, ch) * 0.86;
    if (o.sprite) o.sprite(g, x, y, sz, col, i); else pawn(g, x, y, sz, col); }
}
function pawn(g, x, y, s, col) { g.fillStyle = dk(col, 0.1); ell(g, x, y + s * 0.38, s * 0.3, s * 0.08); g.fill(); g.fillStyle = col; ell(g, x, y - s * 0.22, s * 0.16, s * 0.16); g.fill(); g.beginPath(); g.moveTo(x - s * 0.22, y + s * 0.38); g.quadraticCurveTo(x - s * 0.18, y - s * 0.06, x, y - s * 0.08); g.quadraticCurveTo(x + s * 0.18, y - s * 0.06, x + s * 0.22, y + s * 0.38); g.closePath(); g.fill(); }
// pie chart that fills slice by slice: slices [[share, colour, label], ...], p = 0..1 how much is drawn
function pie(g, x, y, r, slices, p = 1, o = {}) { let a = -Math.PI / 2; const tot = slices.reduce((s, x) => s + x[0], 0); let left = p * Math.PI * 2;
  g.fillStyle = dk(o.base || PAL.navy, -0.05); ell(g, x, y + r * 0.06, r, r); g.fill();
  for (const [sh, col, lab] of slices) { const d = sh / tot * Math.PI * 2, dd = Math.min(d, left); if (dd <= 0) break; g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a, a + dd); g.closePath(); g.fill();
    if (lab && dd >= d * 0.98) { const m = a + d / 2; txt(g, lab, x + Math.cos(m) * r * 0.62, y + Math.sin(m) * r * 0.62, { size: r * 0.16, font: 'H', col: '#fff' }); } a += d; left -= dd; } }
// fill meter: a rounded bar filling to v (0..1)
function meter(g, x, y, w, h, v, col = PAL.teal, o = {}) { g.save(); rr(g, x, y, w, h, h / 2); g.fillStyle = o.track || rgba('#000000', 0.25); g.fill(); rr(g, x, y, Math.max(h, w * clamp(v)), h, h / 2); g.fillStyle = col; g.fill(); g.restore(); }
// a molecule (measured close up): FLAT atoms with no highlight; bonds 0.19 of the bond length thick, each bond half in each atom's
// colour a shade darker than the atom; double bonds add a thin (0.06) parallel line inside the ring, triple bonds two; the small end
// atoms (hydrogen) sit UNDER their bonds, so a darker stub shows inside them. Atoms: C magenta, H aqua, O amber, N blue.
// s = bond length (atoms 0.27 of it). o.atoms [[x, y, el], ...] in units of s + o.bonds [[i, j, order], ...] draw a real structure;
// otherwise o.rings 1|2 fused hexagons with hydrogens round the outside, the seed turning one ring atom and one side group to oxygen.
const ATOM = { C: ['#FF0097', '#D50085'], H: ['#01E8C3', '#00C2A6'], O: ['#FFBD01', '#FC9901'], N: ['#2B7BFF', '#1F5AD8'] };
function molecule(g, x, y, s, seed = 2, o = {}) {
  let A = o.atoms, B = o.bonds; const ctr = [];
  if (!A) { const R = rng(seed), hexes = (o.rings || 1) === 2 ? [[-Math.sqrt(3) / 2, 0], [Math.sqrt(3) / 2, 0]] : [[0, 0]]; A = []; B = [];
    const add = (px, py, el) => { let k = A.findIndex(q => Math.hypot(q[0] - px, q[1] - py) < 0.01); if (k < 0) { A.push([px, py, el]); k = A.length - 1; } return k; };
    for (const [hx, hy] of hexes) { const ids = []; for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + i * Math.PI / 3; ids.push(add(hx + Math.cos(an), hy + Math.sin(an), 'C')); }
      for (let i = 0; i < 6; i++) { const u = ids[i], v = ids[(i + 1) % 6]; if (!B.some(q => (q[0] === u && q[1] === v) || (q[0] === v && q[1] === u))) { B.push([u, v, i % 2 ? 1 : 2]); ctr.push([hx, hy]); } } }
    const shared = B.filter(q => hexes.length > 1 && Math.abs(A[q[0]][0]) < 0.01 && Math.abs(A[q[1]][0]) < 0.01); shared.forEach(q => q[2] = 1);
    const deg = i => B.filter(q => q[0] === i || q[1] === i).length, outer = A.map((q, i) => i).filter(i => deg(i) === 2);
    const swapO = outer.length > 3 && hexes.length > 1 ? outer.filter(i => A[i][0] > 0.2)[Math.floor(R() * 2)] : -1, side = outer.filter(i => i !== swapO)[Math.floor(R() * outer.length * 0.5) + 1];
    if (swapO >= 0) { A[swapO][2] = 'O'; B.forEach(q => { if (q[0] === swapO || q[1] === swapO) q[2] = 1; }); }
    for (const i of outer) { if (i === swapO) continue; const nb = B.filter(q => q[0] === i || q[1] === i).map(q => q[0] === i ? q[1] : q[0]);
      const mx = nb.reduce((t, k) => t + A[k][0], 0) / nb.length, my = nb.reduce((t, k) => t + A[k][1], 0) / nb.length, d = Math.hypot(A[i][0] - mx, A[i][1] - my) || 1;
      const el = i === side && swapO >= 0 ? 'O' : 'H', L = el === 'O' ? 0.95 : 0.88; A.push([A[i][0] + (A[i][0] - mx) / d * L, A[i][1] + (A[i][1] - my) / d * L, el]);
      B.push([i, A.length - 1, el === 'O' ? 2 : 1]); ctr.push(null); } }
  const rot = o.rot || 0, P = A.map(q => [x + (q[0] * Math.cos(rot) - q[1] * Math.sin(rot)) * s, y + (q[0] * Math.sin(rot) + q[1] * Math.cos(rot)) * s]);
  const heavy = P.filter((q, i) => A[i][2] !== 'H'), gx = heavy.reduce((t, q) => t + q[0], 0) / heavy.length, gy = heavy.reduce((t, q) => t + q[1], 0) / heavy.length;
  const col = i => ATOM[A[i][2]] || ATOM.C, ar = s * 0.27, k = o.p ?? 1;
  g.save(); g.globalAlpha *= clamp(k * 3);
  for (let i = 0; i < A.length; i++) if (A[i][2] === 'H') { g.fillStyle = col(i)[0]; ell(g, P[i][0], P[i][1], ar * 0.96 * k, ar * 0.96 * k); g.fill(); }
  B.forEach(([i, j, n], bi) => { const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2; cap(g, P[i][0], P[i][1], mx, my, s * 0.19, col(i)[1]); cap(g, P[j][0], P[j][1], mx, my, s * 0.19, col(j)[1]);
    if (n > 1) { const c = ctr[bi] ? [x + (ctr[bi][0] * Math.cos(rot) - ctr[bi][1] * Math.sin(rot)) * s, y + (ctr[bi][0] * Math.sin(rot) + ctr[bi][1] * Math.cos(rot)) * s] : [gx, gy];
      const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, sg = Math.sign((c[0] - mx) * nx + (c[1] - my) * ny) || 1;
      for (let m = 1; m < n; m++) { const off = s * (0.17 + 0.1 * (m - 1)) * sg; cap(g, P[i][0] + dx * 0.24 + nx * off, P[i][1] + dy * 0.24 + ny * off, P[j][0] - dx * 0.24 + nx * off, P[j][1] - dy * 0.24 + ny * off, s * 0.07, col(i)[1]); } } });
  for (let i = 0; i < A.length; i++) if (A[i][2] !== 'H') { g.fillStyle = col(i)[0]; ell(g, P[i][0], P[i][1], ar * k, ar * k); g.fill(); }
  g.restore(); }
// drifting cells (blood cells, bacteria): flat discs with a darker dimple
function cells(g, seed, n, area, col, t, o = {}) { const R = rng(seed), [x0, y0, ww, hh] = area; for (let i = 0; i < n; i++) { const x = x0 + ((R() * ww + t * (o.vx ?? 30) * lerp(0.6, 1.4, R())) % ww), y = y0 + R() * hh + Math.sin(t + i) * 8, r = lerp(o.rmin ?? 28, o.rmax ?? 52, R()), rot = R() * 3 + t * 0.3;
  flat(g, gg => ell(gg, x, y, r, r * 0.82, rot), col, r * 2, { sx: 0.1, sy: 0.08 }); g.fillStyle = dk(col, 0.1); ell(g, x, y, r * 0.42, r * 0.3, rot); g.fill(); } }
// the body silhouette (inside-the-body scenes), as the style builds it: a mid-blue figure with a top-to-bottom gradient and a
// THICK deeper-blue edge, the arms separate shapes hanging beside the torso (the edge line between them), the head in profile
// (o.profile, facing left: forehead, nose, lips, chin) or front. (x, y) = the chest centre, s = half the shoulder width: the
// figure should FILL the width and the head is often cropped by the top edge. Returns anchor points for organs and tubes.
function body(g, x, y, s, col = '#1E6FD6', o = {}) {
  const edge = o.edge || o.rim || mix(dk(col, 0.1), '#2A2AD8', 0.4), ew = s * 0.04, hy = y - s * 1.2, nk = s * 0.21;
  const fill = () => { const gr = g.createLinearGradient(0, hy - s * 0.6, 0, y + s * 2.6); gr.addColorStop(0, lt(col, 0.07)); gr.addColorStop(1, mix(dk(col, 0.2), '#2A1A8A', 0.35)); return gr; };
  const draw = path => { g.save(); g.lineJoin = 'round'; g.strokeStyle = edge; g.lineWidth = ew * 2; path(g); g.stroke(); g.fillStyle = fill(); g.fill(); g.restore(); };
  for (const sd of [-1, 1]) draw(gg => { gg.beginPath(); gg.moveTo(x + sd * s * 0.78, y - s * 0.5); gg.quadraticCurveTo(x + sd * s * 1.1, y - s * 0.45, x + sd * s * 1.12, y + s * 0.05);
    gg.lineTo(x + sd * s * 1.24, y + s * 1.8); gg.quadraticCurveTo(x + sd * s * 1.1, y + s * 2.02, x + sd * s * 0.94, y + s * 1.84); gg.lineTo(x + sd * s * 0.84, y + s * 0.4); gg.closePath(); });
  draw(gg => { gg.beginPath(); gg.moveTo(x - nk, y - s * 0.64);
    gg.bezierCurveTo(x - s * 0.55, y - s * 0.64, x - s * 0.92, y - s * 0.58, x - s * 0.95, y - s * 0.15); gg.lineTo(x - s * 0.8, y + s * 1.4); gg.lineTo(x - s * 0.86, y + s * 2.8);
    gg.lineTo(x + s * 0.86, y + s * 2.8); gg.lineTo(x + s * 0.8, y + s * 1.4); gg.lineTo(x + s * 0.95, y - s * 0.15); gg.bezierCurveTo(x + s * 0.92, y - s * 0.58, x + s * 0.55, y - s * 0.64, x + nk, y - s * 0.64);
    if (o.profile) { gg.lineTo(x + nk * 1.15, hy + s * 0.36); gg.bezierCurveTo(x + s * 0.56, hy + s * 0.25, x + s * 0.6, hy - s * 0.62, x, hy - s * 0.62);
      gg.bezierCurveTo(x - s * 0.34, hy - s * 0.62, x - s * 0.47, hy - s * 0.36, x - s * 0.46, hy - s * 0.06); gg.lineTo(x - s * 0.6, hy + s * 0.13); gg.lineTo(x - s * 0.46, hy + s * 0.19);
      gg.quadraticCurveTo(x - s * 0.53, hy + s * 0.25, x - s * 0.46, hy + s * 0.31); gg.quadraticCurveTo(x - s * 0.5, hy + s * 0.46, x - s * 0.3, hy + s * 0.49); gg.lineTo(x - nk, hy + s * 0.52); }
    else { gg.lineTo(x + nk, hy + s * 0.4); gg.bezierCurveTo(x + s * 0.52, hy + s * 0.42, x + s * 0.54, hy - s * 0.58, x, hy - s * 0.6); gg.bezierCurveTo(x - s * 0.54, hy - s * 0.58, x - s * 0.52, hy + s * 0.42, x - nk, hy + s * 0.4); }
    gg.closePath(); });
  return { brain: [x, hy - s * 0.15], mouth: [x - s * (o.profile ? 0.5 : 0), hy + s * (o.profile ? 0.25 : 0.25)], throat: [x - nk * 0.2, y - s * 0.64],
    lungs: [x, y + s * 0.05], heart: [x + s * 0.14, y + s * 0.2], stomach: [x + s * 0.12, y + s * 0.62], gut: [x, y + s * 1.12] };
}
// a soft rounded mass in the style's organ shading (measured close up): the base colour, a darker band along the edge on
// the shadow side (lower right, or o.dir), and a LIGHTER copy of the same shape inset toward the light. (cx, cy) = its centre.
function form(g, path, col, size, cx, cy, o = {}) { const dx = (o.dir ?? 1) * size;
  g.save(); path(g); g.fillStyle = dk(col, o.k ?? 0.07); g.fill(); g.clip();
  g.save(); g.translate(-dx * 0.05, -size * 0.05); path(g); g.fillStyle = col; g.fill(); g.restore();
  if (o.inset !== 0) { const k = o.inset ?? 0.72; g.save(); g.translate(cx - dx * 0.06, cy - size * 0.07); g.scale(k, k); g.translate(-cx, -cy); path(g); g.fillStyle = o.light || lt(col, o.l ?? 0.06); g.fill(); g.restore(); }
  g.restore(); }
// organs, built the way the style builds them: soft rounded masses in ONE hue family (purple lungs, magenta heart and gut,
// lilac liver, pink stomach), each with its darker edge band and its lighter inset, packed tight and overlapping; veins drawn
// LIGHTER than the organ. o.edge = a thick outline (e.g. yellow, a path through the body): give it to every organ of that
// path and draw them in two passes, o.pass 'edge' for all of them first, then o.pass 'fill', so the outline runs round the
// whole tract. o.glow adds a glow. Returns nothing; draw back to front (lungs, liver, stomach, heart, gut).
function organ(g, kind, x, y, s, o = {}) {
  const col = o.col || { brain: '#FF5C9A', heart: '#E03CC8', lungs: '#9A1ED8', stomach: '#E46AE0', gut: '#D030B8', liver: '#DE7EEA' }[kind] || PAL.magenta;
  const P = (fx, fy) => [x + fx * s, y + fy * s], shapes = [];                         // [path, colour, centre, opts]
  const lump = (pts, r) => gg => { gg.beginPath(); for (const [a, b, rr_] of pts) { const [cx, cy] = P(a, b); gg.moveTo(cx + rr_ * r * s, cy); gg.arc(cx, cy, rr_ * r * s, 0, Math.PI * 2); } };
  const caps = (list, w) => gg => { gg.beginPath(); for (const [a, b, c, d] of list) { const [x1, y1] = P(a, b), [x2, y2] = P(c, d), r = w * s / 2, an = Math.atan2(y2 - y1, x2 - x1);
    gg.moveTo(x1 + Math.cos(an + Math.PI / 2) * r, y1 + Math.sin(an + Math.PI / 2) * r); gg.arc(x1, y1, r, an + Math.PI / 2, an + Math.PI * 1.5); gg.arc(x2, y2, r, an - Math.PI / 2, an + Math.PI / 2); gg.closePath(); } };
  if (kind === 'lungs') for (const sd of [-1, 1]) shapes.push([gg => { gg.beginPath(); const [ax, ay] = P(sd * 0.07, -0.48);
    gg.moveTo(ax, ay); gg.bezierCurveTo(...P(sd * 0.36, -0.56), ...P(sd * 0.56, -0.4), ...P(sd * 0.56, -0.05)); gg.bezierCurveTo(...P(sd * 0.56, 0.32), ...P(sd * 0.5, 0.5), ...P(sd * 0.3, 0.5));
    gg.bezierCurveTo(...P(sd * 0.12, 0.5), ...P(sd * 0.1, 0.38), ...P(sd * 0.14, 0.2)); gg.quadraticCurveTo(...P(sd * 0.2, -0.1), ax, ay); gg.closePath(); }, col, P(sd * 0.32, 0), { dir: sd, inset: 0, k: 0.06 }]);
  else if (kind === 'heart') { shapes.push([lump([[0, 0.05, 0.5], [0.12, -0.22, 0.38], [-0.1, 0.25, 0.36]], 0.84), col, P(0, 0), {}]);
    shapes.push([lump([[-0.2, -0.28, 0.24]], 1), lt(col, 0.1), P(-0.2, -0.28), { inset: 0 }]); }
  else if (kind === 'stomach') shapes.push([caps([[-0.32, -0.2, 0.24, 0.12], [0.24, 0.12, 0.3, -0.24], [-0.36, 0.18, 0.12, 0.3]], 0.42), col, P(0, 0), {}]);
  else if (kind === 'liver') shapes.push([caps([[-0.4, -0.15, 0.35, -0.2], [-0.3, -0.1, -0.32, 0.3], [-0.05, -0.1, -0.06, 0.18], [0.2, -0.15, 0.22, 0.05]], 0.34), col, P(0, -0.02), { dir: -1 }]);
  else if (kind === 'gut') { const R = rng(o.seed || 8), rows = 4, list = [];
    for (let i = 0; i < rows; i++) { const yy = -0.36 + i * 0.22, l = -lerp(0.24, 0.4, R()), r = lerp(0.24, 0.4, R()), w = lerp(0.2, 0.27, R()); list.push([l, yy, r, yy, w]);
      if (i < rows - 1) list.push(i % 2 ? [l + 0.03, yy, l + 0.05, yy + 0.22, w * 0.9] : [r - 0.03, yy, r - 0.05, yy + 0.22, w * 0.9]); }
    for (const q of list) shapes.push([caps([q], q[4]), q[1] === q[3] ? col : dk(col, 0.03), P((q[0] + q[2]) / 2, (q[1] + q[3]) / 2), { inset: 0, k: 0.13 }]);
    const end = list[list.length - 1]; shapes.push([lump([[end[2] - 0.08, end[1] + 0.2, 0.17]], 1), lt(col, 0.02), P(end[2] - 0.08, end[1] + 0.2), { inset: 0.6, k: 0.1 }]);
    shapes.gutRows = list.filter(q => q[1] === q[3]); }
  else if (kind === 'brain') shapes.push([lump([[-0.22, -0.08, 0.36], [0.2, -0.1, 0.36], [0, 0.12, 0.38]], 1), col, P(0, 0), {}]);
  else shapes.push([lump([[0, 0, 0.45]], 1), col, P(0, 0), {}]);
  if (o.pass !== 'fill' && o.edge) { g.save(); g.lineJoin = 'round'; g.strokeStyle = o.edge; g.lineWidth = (o.edgeW || s * 0.06) * 2; for (const [p] of shapes) { p(g); g.stroke(); } g.restore(); }
  if (o.pass === 'edge') return;
  if (o.glow) glow(g, x, y, s * 1.3, o.glowCol || col, 0.4);
  for (const [p, c, [cx, cy], fo] of shapes) form(g, p, c, s, cx, cy, fo);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'lungs') { g.strokeStyle = rgba(lt(col, 0.07), 0.9); g.lineWidth = s * 0.04;                          // the airway tree, lighter than the lung
    for (const sd of [-1, 1]) { g.save(); shapes[sd < 0 ? 0 : 1][0](g); g.clip(); const [bx, by] = P(sd * 0.3, -0.05);
      g.beginPath(); g.moveTo(...P(sd * 0.12, -0.3)); g.quadraticCurveTo(...P(sd * 0.2, -0.1), bx, by);
      for (const [dx, dy] of [[0.12, -0.24], [0.18, -0.02], [0.12, 0.22], [-0.02, 0.26], [-0.08, -0.22]]) { const [qx, qy] = [bx + sd * dx * s, by + dy * s]; g.moveTo(bx, by); g.quadraticCurveTo(bx + sd * dx * s * 0.2, by + dy * s * 0.7, qx, qy);
        g.moveTo(qx, qy); g.lineTo(qx + sd * s * 0.05, qy - s * 0.05); } g.stroke(); g.restore(); } }
  else if (kind === 'heart') { form(g, gg => rr(gg, x - s * 0.17, y - s * 0.24, s * 0.34, s * 0.46, s * 0.17), lt(col, 0.05), s * 0.4, x, y, { inset: 0, k: 0.03 });
    if (o.vessel) noodle(g, [[x - s * 0.06, y - s * 0.3], [x + s * 0.02, y - s * 0.62], [x + s * 0.28, y - s * 0.52], [x + s * 0.26, y - s * 0.24]], s * 0.13, o.vessel); }
  else if (kind === 'stomach') form(g, lump([[0.08, -0.12, 0.2], [-0.1, 0.06, 0.16]], 1), lt(col, 0.07), s * 0.5, x, y - s * 0.03, { inset: 0, k: 0.02 });
  else if (kind === 'gut') { for (const [a, b, c] of shapes.gutRows) cap(g, x + (a + 0.12) * s, y + (b - 0.05) * s, x + (c - 0.12) * s, y + (b - 0.05) * s, s * 0.06, lt(col, 0.08));   // the light stripe along each fold
    if (o.food !== undefined) shapes.gutRows.forEach(([a, b, c], i) => { for (let k = 0; k < 3; k++) { const u = ((o.food * 0.12 + k / 3 + i * 0.17) % 1), fx = x + lerp(i % 2 ? c : a, i % 2 ? a : c, u) * s, fy = y + (b + 0.02) * s;
      glow(g, fx, fy, s * 0.06, PAL.yellow, 0.6); g.fillStyle = '#FFE14A'; ell(g, fx, fy, s * 0.022, s * 0.022); g.fill(); } }); }
  else if (kind === 'brain') { const R = rng(o.seed || 5); g.save(); shapes[0][0](g); g.clip(); g.strokeStyle = dk(col, 0.12); g.lineWidth = s * 0.045;
    for (let i = 0; i < 8; i++) { const [px, py] = P(lerp(-0.45, 0.45, R()), lerp(-0.35, 0.35, R())), rot = R() * Math.PI, L = s * lerp(0.1, 0.16, R());
      g.beginPath(); g.moveTo(px - Math.cos(rot) * L, py - Math.sin(rot) * L); g.quadraticCurveTo(px - Math.sin(rot) * L * 0.8, py + Math.cos(rot) * L * 0.8, px + Math.cos(rot) * L, py + Math.sin(rot) * L); g.stroke(); }
    g.restore(); cap(g, x, y - s * 0.42, x, y - s * 0.1, s * 0.05, dk(col, 0.16)); specks(g, x - s * 0.3, y - s * 0.26, s * 0.05); }
  g.restore();
}

// cracked earth (Voronoi cells, drawn once per seed and cached)
const _cache = {};
function cracks(g, seed, area, col, o = {}) { const key = 'cr' + seed + area.join(',') + col; if (!_cache[key]) { const [x0, y0, ww, hh] = area; const c = new OffscreenCanvas(Math.ceil(ww), Math.ceil(hh)), cg = c.getContext('2d'); const R = rng(seed), n = o.n || 40, P = [];
  for (let i = 0; i < n; i++) P.push([R() * ww, R() * hh]); const img = cg.createImageData(c.width, c.height), step = 3; cg.fillStyle = dk(col, 0.22); cg.fillRect(0, 0, ww, hh);
  for (const [px, py] of P) { const cc = lerp(0, 0.08, R()); cg.fillStyle = lt(col, cc); cg.beginPath(); const pts = []; for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; let r = 4; while (r < 300) { const qx = px + Math.cos(an) * r, qy = py + Math.sin(an) * r; let near = P.reduce((m, q) => Math.min(m, Math.hypot(q[0] - qx, q[1] - qy)), 1e9); if (near < Math.hypot(px - qx, py - qy) - 6) break; r += step; } pts.push([px + Math.cos(an) * (r - 7), py + Math.sin(an) * (r - 7)]); }
    cg.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => cg.lineTo(p[0], p[1])); cg.closePath(); cg.fill(); }
  _cache[key] = c; } g.drawImage(_cache[key], area[0], area[1]); }

// ── study 9 (20 more Shorts, 2026-10-26): light from one source, fog, thickness, the space cast, data devices, time skips ──────
// srcSky(g, sx, sy, stops, o): a sky lit from ONE source off the frame (a star, a sun behind the horizon): a radial gradient from the
// source, warm near it and cooler far away (measured on a planet-surface frame: #E99229 at the source, then #B03544, #8F4B74 and
// #5D398D on the far side). sx, sy usually off the frame (W * 1.15, -H * 0.08); o.r = the radius (default 1.7 H).
function srcSky(g, sx, sy, stops, o = {}) { const r = o.r || H * 1.7, gr = g.createRadialGradient(sx, sy, 0, sx, sy, r);
  stops.forEach((c, i) => gr.addColorStop(i / Math.max(1, stops.length - 1), c)); g.save(); g.fillStyle = gr; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); }
// godRays(g, sx, sy, o): light shafts from that source across the WHOLE frame, sky and ground alike, drawn under the characters
// (measured): a fan of o.n (5) long wedges 5-11 degrees wide, lit wedges a few points lighter than the sky ('screen', o.col, o.a 0.16)
// with darker gaps between them ('multiply', o.dark, o.d 0.14); soft edges (o.soft px, 18); NO fade along their length (o.fade 0..1
// adds one). o.dir = where they point in degrees (0 = straight down, positive = toward the right; default: the frame centre),
// o.spread = the fan's width in degrees (75); o.t sways the fan +-0.8 degrees over ~6 s. Planet surfaces, stages, windows, water.
function godRays(g, sx, sy, o = {}) { const R = rng(o.seed || 11), n = o.n || 5, L = H * 3, sp = (o.spread ?? 75) * D2R;
  const dir = o.dir != null ? o.dir * D2R : Math.atan2(W / 2 - sx, H * 0.45 - sy), sway = Math.sin((o.t || 0) * 1.05) * 0.8 * D2R;
  const wedge = (a, hw, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.sin(a - hw) * L, sy + Math.cos(a - hw) * L); g.lineTo(sx + Math.sin(a + hw) * L, sy + Math.cos(a + hw) * L); g.closePath(); g.fill(); };
  const paint = (col, a) => { if (!o.fade) return rgba(col, a); const gr = g.createLinearGradient(sx, sy, sx + Math.sin(dir) * H * 2, sy + Math.cos(dir) * H * 2); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, a * (1 - o.fade))); return gr; };
  g.save(); g.filter = `blur(${o.soft ?? 18}px)`;
  for (let i = 0; i < n; i++) { const ca = dir - sp / 2 + sp * (i + 0.5) / n + (R() - 0.5) * sp / n * 0.5 + sway, hw = lerp(2.5, 5.5, R()) * D2R, gap = lerp(2.5, 4.5, R()) * D2R;
    g.globalCompositeOperation = 'screen'; wedge(ca, hw, paint(o.col || '#FFE2B0', o.a ?? 0.16));
    if (i < n - 1) { g.globalCompositeOperation = 'multiply'; wedge(ca + sp / n / 2, gap, paint(o.dark || '#4A1A6A', o.d ?? 0.14)); } }
  g.restore(); }
// motes(g, seed, n, col, t, o): dust in the light: tiny bright discs (r 3-7) each with a soft halo (3x, alpha 0.3), drifting slowly
// (o.vx, o.vy px/s; default a slow rise) and twinkling; o.box = [x, y, w, h] keeps them in (default the upper two thirds).
function motes(g, seed, n, col = '#FFE9B8', t = 0, o = {}) { const R = rng(seed), [bx, by, bw, bh] = o.box || [0, 0, W, H * 0.66];
  g.save(); for (let i = 0; i < n; i++) { const r = lerp(3, 7, R()) * (o.size || 1), x = bx + ((R() * bw + t * (o.vx ?? 6) * lerp(0.5, 1.5, R())) % bw + bw) % bw;
    const y = by + ((R() * bh - t * (o.vy ?? 9) * lerp(0.5, 1.5, R())) % bh + bh) % bh, tw = 0.6 + 0.4 * Math.sin(t * lerp(1.5, 3.5, R()) + i * 2.3);
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 3.2); gr.addColorStop(0, rgba(col, 0.32 * tw)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; ell(g, x, y, r * 3.2, r * 3.2); g.fill();
    g.fillStyle = rgba(col, 0.9 * tw); ell(g, x, y, r, r); g.fill(); } g.restore(); }
// fog(g, seed, y, col, t, o): a bank of soft fog between two planes of a place (rows of graves, trees, buildings): o.n (7) wide
// ellipses (300-620 x 70-150 px), light and low in contrast (o.a 0.3), blurred (o.blur 22), drifting sideways at 6-14 px/s and
// wrapping. Draw it AFTER a far plane and BEFORE the nearer one. Measured: far rows hazed L 25-60, the lit middle row brightest
// (L 72), the near row darker (L 42) with a lit top rim, the ground darkening toward the viewer (L 29 -> 21).
function fog(g, seed, y, col, t = 0, o = {}) { const R = rng(seed), n = o.n || 7, span = W + 700;
  g.save(); g.filter = `blur(${o.blur ?? 22}px)`; g.fillStyle = rgba(col, o.a ?? 0.3);
  for (let i = 0; i < n; i++) { const w = lerp(300, 620, R()) * (o.size || 1), h = lerp(70, 150, R()) * (o.size || 1), v = lerp(6, 14, R()) * (R() < 0.5 ? -1 : 1);
    const x = ((i / n * span + R() * 120 + t * v) % span + span) % span - 350, yy = y + (R() - 0.5) * (o.spread ?? 120); ell(g, x, yy, w / 2, h / 2); g.fill(); }
  g.restore(); }
// extrude(g, path, dx, dy, face, side, o): a flat shape WITH THICKNESS, the way the style builds slabs, signs, tiles, cards and
// buildings (measured on gravestones and road signs): the side is the face path stepped toward (dx, dy) in the darker side colour,
// the face on top. o.rim = a lighter band along the lit top edge (true = the face a shade lighter; o.rimW px, 10); o.edge = a thin
// line round the face (o.edgeW). path(g) builds the face path, e.g. g => rr(g, x, y, w, h, 40).
function extrude(g, path, dx, dy, face, side, o = {}) { const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
  g.save(); g.fillStyle = side; for (let i = n; i >= 1; i--) { g.save(); g.translate(dx * i / n, dy * i / n); path(g); g.fill(); g.restore(); }
  path(g); g.fillStyle = face; g.fill();
  if (o.rim) { g.save(); path(g); g.clip(); g.fillStyle = o.rim === true ? lt(face, 0.1) : o.rim; path(g); g.fill(); g.translate(0, o.rimW ?? 10); g.fillStyle = face; path(g); g.fill(); g.restore(); }
  if (o.edge) { g.lineWidth = o.edgeW || 4; g.strokeStyle = o.edge; path(g); g.stroke(); }
  g.restore(); }
// face(g, x, y, s, o): the face the style gives ANY thing the script turns into a character (a planet, a star, the Moon, a dust grain,
// a cloud, a black hole, a virus); s = the thing's radius. Measured on star, planet, grain and black-hole faces: the face sits LOW on a
// round body (o.low, 0.12 s below the middle), two dark ovals (0.13 x 0.17 s, o.ink) a third of s apart, ONE white catchlight each
// (upper left), thin arc brows, a tiny mouth. o.mood 'happy' | 'sad' | 'worried' | 'angry' | 'shocked' | 'sleepy' | 'smug' | 'scream'
// sets brows, lids and mouth together (o.mouth overrides: 'smile' | 'o' | 'grin' | 'frown' | 'flat' | 'scream' | 'smug');
// o.look = [-1..1, -1..1] moves the pupils; o.whites = white eyes with pupils (grains, rocks, bigger faces); o.blush; o.col = the
// body colour (for the lids); blinks every ~3.4 s (o.t, o.seed).
function face(g, x, y, s, o = {}) { const m = o.mood || 'happy', ink = o.ink || '#141B5C', cy = y + s * (o.low ?? 0.12), dx = s * 0.33, ew = s * 0.13, eh = s * 0.17;
  const lk = o.look || [0, 0], lid = Math.max(lidOf(o.t || 0, o.seed || 0), m === 'sleepy' ? 0.55 : m === 'smug' ? 0.42 : m === 'sad' ? 0.25 : 0), sc = m === 'shocked' || m === 'scream' ? 1.25 : 1;
  g.save();
  if (o.blush) { g.fillStyle = rgba(o.blush === true ? '#FF6FA8' : o.blush, 0.45); for (const sd of [-1, 1]) { ell(g, x + sd * dx * 1.35, cy + eh * 0.95, ew * 1.1, ew * 0.6); g.fill(); } }
  for (const sd of [-1, 1]) { const ex = x + sd * dx, rx = (o.whites ? ew * 1.6 : ew) * sc, ry = (o.whites ? eh * 1.25 : eh) * sc;
    g.save(); ell(g, ex, cy, rx, ry); g.clip();
    if (o.whites) { g.fillStyle = '#FFFFFF'; g.fillRect(ex - rx, cy - ry, rx * 2, ry * 2); g.fillStyle = ink; ell(g, ex + lk[0] * rx * 0.4, cy + lk[1] * ry * 0.3, ew * 0.8 * sc, eh * 0.85 * sc); g.fill(); }
    else { g.fillStyle = ink; g.fillRect(ex - rx, cy - ry, rx * 2, ry * 2); }
    g.fillStyle = '#FFFFFF'; ell(g, ex - rx * 0.32 + lk[0] * rx * 0.3, cy - ry * 0.42 + lk[1] * ry * 0.2, ew * 0.3, ew * 0.3); g.fill();
    const sl = m === 'sad' || m === 'worried' ? sd * 0.35 : m === 'angry' ? -sd * 0.45 : 0;
    if (lid > 0 || sl) { g.fillStyle = o.col || '#8E98CF'; g.translate(ex, cy - ry); g.rotate(sl); g.fillRect(-rx * 1.6, -ry * 2, rx * 3.2, ry * 2 + ry * 2 * Math.max(lid, sl ? 0.3 : 0)); }
    g.restore();
    const by = cy - ry - s * 0.09, tilt = m === 'angry' ? -sd * 0.35 : m === 'sad' || m === 'worried' ? sd * 0.3 : 0, lift = m === 'shocked' || m === 'scream' ? s * 0.06 : 0;
    g.save(); g.translate(ex, by - lift); g.rotate(tilt); g.strokeStyle = ink; g.lineWidth = s * 0.035; g.lineCap = 'round'; g.beginPath(); g.arc(0, ew * 1.6, ew * 1.9, -Math.PI * 0.68, -Math.PI * 0.32); g.stroke(); g.restore(); }
  const mo = o.mouth || { happy: 'smile', sad: 'frown', worried: 'flat', angry: 'frown', shocked: 'o', sleepy: 'flat', smug: 'smug', scream: 'scream' }[m] || 'smile', my = cy + eh * 1.3, mw = s * 0.08;
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = s * 0.035; g.lineCap = 'round';
  if (mo === 'smile') { g.beginPath(); g.arc(x, my - mw * 0.4, mw, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
  else if (mo === 'frown') { g.beginPath(); g.arc(x, my + mw * 0.8, mw, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke(); }
  else if (mo === 'flat') cap(g, x - mw * 0.7, my, x + mw * 0.7, my, s * 0.035, ink);
  else if (mo === 'o') { ell(g, x, my, mw * 0.5, mw * 0.65); g.fill(); }
  else if (mo === 'smug') { g.beginPath(); g.arc(x + mw * 0.3, my - mw * 0.6, mw, Math.PI * 0.2, Math.PI * 0.62); g.stroke(); }
  else if (mo === 'grin' || mo === 'scream') { const hw = mw * (mo === 'scream' ? 1.1 : 1.5), hh = mw * (mo === 'scream' ? 2.4 : 1.1);
    g.beginPath(); g.moveTo(x - hw, my - hh * 0.3); g.quadraticCurveTo(x, my - hh * 0.45, x + hw, my - hh * 0.3); g.quadraticCurveTo(x + hw, my + hh, x, my + hh); g.quadraticCurveTo(x - hw, my + hh, x - hw, my - hh * 0.3); g.closePath(); g.fill();
    g.save(); g.clip(); g.fillStyle = '#FFFFFF'; g.fillRect(x - hw, my - hh * 0.5, hw * 2, hh * 0.32); if (mo === 'scream') { g.fillStyle = '#FF6F91'; ell(g, x, my + hh * 0.85, hw * 0.75, hh * 0.3); g.fill(); } g.restore(); }
  g.restore(); }
// planet(g, x, y, r, o): a planet, moon or star the way the style paints them (measured on the space Shorts): a flat disc, the shadow
// side as ONE darker crescent (o.light = the direction the light comes FROM in degrees, 0 = right, 90 = above, default 135 upper left;
// o.term 0.3 = how far the lit disc is offset, bigger = a thicker crescent), o.glow = an atmosphere halo colour, o.rim = a lit edge in
// another colour (a red rock lit yellow by its star), o.ring = Saturn's ring colour (back half behind the body, front half over it).
// o.half = the light's direction in degrees for a HALF-lit body (a straight terminator with a narrow mid-tone band, the night side o.night:
// the big moons of the night-sky title frames). o.kind: 'rock' (craters: a darker disc with a lighter lip toward the light), 'moon' (pale periwinkle, maria = darker blobs with a
// lighter inset rim, one ray crater = light lines from a pit, ringed small craters), 'gas' (o.bands colours as wavy stripes, a spot),
// 'earth' (blue ocean, green continents with a darker edge, white cloud capsules), 'star' (a glowing disc with lighter spots, a
// bloom 2.2 r and uneven soft spikes, o.spikes). o.face = face() options: the thing becomes a character. o.seed varies the layout.
function planet(g, x, y, r, o = {}) { if (r >= 110) mark(g, 'hero', x - r, y - r, x + r, y + r, o.kind || 'planet', 'ell'); const k = o.kind || 'rock', R = rng(o.seed || 7), la = (o.light ?? 135) * D2R, lx = Math.cos(la), ly = -Math.sin(la);
  const col = o.col || { rock: '#C9774A', moon: '#BFC7EA', gas: '#F2A24A', earth: '#2F6BFF', star: '#FFF2B8' }[k] || '#C9774A', shade = o.shade || (k === 'moon' ? '#7D86B8' : dk(col, 0.16));
  g.save();
  if (k === 'star') { glow(g, x, y, r * 2.2, o.glow || col, 0.55); g.save(); g.globalCompositeOperation = 'screen'; const ns = o.spikes || 9;
    for (let i = 0; i < ns; i++) { const a = R() * Math.PI * 2, L = r * lerp(1.6, 3.2, R()), w = lerp(0.05, 0.12, R()); const gr = g.createRadialGradient(x, y, r * 0.8, x, y, L); gr.addColorStop(0, rgba(o.glow || col, 0.5)); gr.addColorStop(1, rgba(o.glow || col, 0)); g.fillStyle = gr;
      g.beginPath(); g.moveTo(x + Math.cos(a - w) * r * 0.9, y + Math.sin(a - w) * r * 0.9); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineTo(x + Math.cos(a + w) * r * 0.9, y + Math.sin(a + w) * r * 0.9); g.closePath(); g.fill(); } g.restore(); }
  else if (o.glow) glow(g, x, y, r * 1.4, o.glow, 0.5);
  if (o.ring) { g.strokeStyle = o.ring; g.lineWidth = r * 0.16; g.beginPath(); g.ellipse(x, y, r * 1.75, r * 0.42, -0.25, Math.PI, Math.PI * 2); g.stroke(); }
  if (o.rim) { g.fillStyle = o.rim; ell(g, x + lx * r * 0.08, y + ly * r * 0.08, r, r); g.fill(); }
  g.save(); ell(g, x, y, r, r); g.clip();
  g.fillStyle = k === 'star' ? col : shade; g.fillRect(x - r, y - r, r * 2, r * 2);
  if (k !== 'star') { g.fillStyle = col; ell(g, x + lx * r * (o.term ?? 0.3), y + ly * r * (o.term ?? 0.3), r * 1.02, r * 1.02); g.fill(); }
  if (o.half != null && k !== 'star') { g.save(); g.translate(x, y); g.rotate(-o.half * D2R); g.fillStyle = col; g.fillRect(-r, -r, r * 2, r * 2);
    const lg = g.createLinearGradient(0, 0, r, 0); lg.addColorStop(0, col); lg.addColorStop(1, lightOf(col, 1.6)); g.fillStyle = lg; g.fillRect(0, -r, r, r * 2);
    g.fillStyle = mix(col, shade, 0.55); g.fillRect(-r * 0.12, -r, r * 0.12, r * 2); g.fillStyle = o.night || dk(shade, 0.18); g.fillRect(-r, -r, r * 0.88, r * 2); g.restore(); }
  if (k === 'gas') { const bands = o.bands || [dk(col, 0.1), lt(col, 0.1), mix(col, '#E8603A', 0.35)];
    for (let i = 0; i < 6; i++) { const yy = y - r + r * 2 * (i + 0.5) / 6 + (R() - 0.5) * r * 0.1, hh = r * lerp(0.08, 0.2, R()); g.fillStyle = rgba(bands[i % bands.length], 0.85); g.beginPath();
      for (let xx = x - r; xx <= x + r; xx += r / 12) g.lineTo(xx, yy + Math.sin(xx / r * 5 + i) * hh * 0.3); for (let xx = x + r; xx >= x - r; xx -= r / 12) g.lineTo(xx, yy + hh + Math.sin(xx / r * 5 + i + 1) * hh * 0.3); g.closePath(); g.fill(); }
    g.fillStyle = mix(col, '#C2402A', 0.5); ell(g, x + r * 0.25, y + r * 0.25, r * 0.2, r * 0.11); g.fill(); }
  if (k === 'earth') { for (let i = 0; i < 5; i++) { const cx = x + (R() - 0.5) * r * 1.5, cy = y + (R() - 0.5) * r * 1.5, rr2 = r * lerp(0.22, 0.42, R()), pts = [];
      for (let j = 0; j < 9; j++) { const a = j / 9 * Math.PI * 2; pts.push([cx + Math.cos(a) * rr2 * lerp(0.6, 1.2, R()), cy + Math.sin(a) * rr2 * lerp(0.6, 1.2, R())]); }
      spline(g, pts); g.fillStyle = '#1E9E5A'; g.fill(); g.save(); g.translate(-r * 0.03, -r * 0.03); spline(g, pts); g.fillStyle = '#3CCB7F'; g.fill(); g.restore(); }
    g.fillStyle = 'rgba(255,255,255,0.92)'; for (let i = 0; i < 4; i++) { const cx = x + (R() - 0.5) * r * 1.4, cy = y + (R() - 0.5) * r * 1.4, w = r * lerp(0.3, 0.6, R()); rr(g, cx - w / 2, cy, w, r * 0.11, r * 0.06); g.fill(); } }
  if (k === 'rock' || k === 'moon') {
    if (k === 'moon' && o.half == null) for (let i = 0; i < 4; i++) { const cx = x + (R() - 0.5) * r * 1.3, cy = y + (R() - 0.5) * r * 1.3, rr2 = r * lerp(0.18, 0.34, R()), pts = [];
      for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2; pts.push([cx + Math.cos(a) * rr2 * lerp(0.7, 1.25, R()), cy + Math.sin(a) * rr2 * lerp(0.7, 1.25, R())]); }
      spline(g, pts); g.fillStyle = mix(col, '#9EA8DA', 0.6); g.fill(); g.save(); g.translate(lx * r * 0.03, ly * r * 0.03); spline(g, pts.map(([px, py]) => [cx + (px - cx) * 0.82, cy + (py - cy) * 0.82])); g.fillStyle = '#8E98CF'; g.fill(); g.restore(); }
    if (k === 'moon' && o.rays !== false && o.half == null) { const cx = x + r * (o.face ? 0.42 : 0.2), cy = y + r * (o.face ? -0.5 : 0.25); g.fillStyle = rgba('#FFFFFF', 0.35);
      for (let i = 0; i < 11; i++) { const a = R() * Math.PI * 2, L = r * lerp(0.18, 0.45, R()), w = r * 0.018; g.beginPath(); g.moveTo(cx + Math.cos(a + 1.57) * w, cy + Math.sin(a + 1.57) * w); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.lineTo(cx - Math.cos(a + 1.57) * w, cy - Math.sin(a + 1.57) * w); g.closePath(); g.fill(); }
      g.fillStyle = '#FFFFFF'; ell(g, cx, cy, r * 0.035, r * 0.035); g.fill(); }
    const nc = o.craters ?? (o.half != null ? 0 : k === 'moon' ? 7 : 6); for (let i = 0; i < nc; i++) { const cx = x + (R() - 0.5) * r * 1.6, cy = y + (R() - 0.5) * r * 1.6, cr = r * lerp(0.05, 0.13, R());
      g.fillStyle = lt(k === 'moon' ? '#8E98CF' : col, 0.08); ell(g, cx + lx * cr * 0.25, cy + ly * cr * 0.25, cr * 1.18, cr * 1.18); g.fill(); g.fillStyle = k === 'moon' ? '#7A84BE' : dk(col, 0.12); ell(g, cx, cy, cr, cr); g.fill(); } }
  if (k === 'star') { g.fillStyle = lt(col, 0.08); for (let i = 0; i < 7; i++) { ell(g, x + (R() - 0.5) * r * 1.5, y + (R() - 0.5) * r * 1.5, r * lerp(0.05, 0.12, R()), r * lerp(0.05, 0.12, R())); g.fill(); } }
  g.restore();
  if (o.ring) { g.strokeStyle = o.ring; g.lineWidth = r * 0.16; g.beginPath(); g.ellipse(x, y, r * 1.75, r * 0.42, -0.25, 0, Math.PI); g.stroke(); }
  if (o.face) face(g, x, y, r, { col, ...o.face });
  g.restore(); }
// pixelIn(g, p, x, y, w, h, draw, o): a thing ASSEMBLING out of square pixels (measured: a planet forming over ~4.5 s): draw(gg) paints
// the finished thing into a w x h box (0, 0 = its top left); its picture is cut into o.px (14) px squares that fly in from scattered
// spots one by one (the middle first), blocky until p = 0.85, then the smooth drawing fades in over them by p = 1.
const _PX = new OffscreenCanvas(W, H), gPX = _PX.getContext('2d', { willReadFrequently: true });
function pixelIn(g, p, x, y, w, h, draw, o = {}) { if (p <= 0) return; gPX.setTransform(1, 0, 0, 1, 0, 0); gPX.clearRect(0, 0, W, H); draw(gPX);
  if (p >= 1) { g.drawImage(_PX, 0, 0, w, h, x, y, w, h); return; }
  const px = o.px || 14, data = gPX.getImageData(0, 0, w, h).data, R = rng(o.seed || 5), md = Math.hypot(w, h) / 2, q = clamp(p / 0.85);
  for (let by = 0; by < h; by += px) for (let bx = 0; bx < w; bx += px) { const st = Math.hypot(bx - w / 2, by - h / 2) / md * 0.55 + R() * 0.3, fx = (R() - 0.5) * w * 0.7, fy = (R() - 0.5) * h * 0.7;
    const i = (Math.min(h - 1, by + (px >> 1)) * w + Math.min(w - 1, bx + (px >> 1))) * 4; if (data[i + 3] < 40) continue;
    const a = glide(clamp((q - st) / 0.15)); if (a <= 0) continue;
    g.fillStyle = `rgba(${data[i]},${data[i + 1]},${data[i + 2]},${Math.min(1, a * 1.5)})`; g.fillRect(x + bx + fx * (1 - a), y + by + fy * (1 - a), px - 1, px - 1); }
  if (p > 0.85) { g.save(); g.globalAlpha = (p - 0.85) / 0.15; g.drawImage(_PX, 0, 0, w, h, x, y, w, h); g.restore(); } }
// ffwd(g, t, t0, t1, o): the time skip ("millions of years later", "bake it for a while"; measured): a white three-arrow sign top left
// whose arrows light one after another every 0.1 s, faint scanlines over the whole frame, and glitch bars (short horizontal strips in
// cyan, blue, grey and white) that change every 0.1 s and thicken from 3 to ~20 over the skip. Run the picture under it on FFT() time.
function ffwd(g, t, t0, t1, o = {}) { if (t < t0 || t > t1) return; const p = clamp((t - t0) / Math.max(0.1, t1 - t0)), st = Math.floor((t - t0) * 10), R = rng(997 + st * 31);
  g.save(); g.fillStyle = 'rgba(0,0,0,0.13)'; for (let yy = 0; yy < H; yy += 7) g.fillRect(-W, yy, 3 * W, 2);
  const nb = Math.round(lerp(3, o.max || 20, p)), cols = o.cols || ['#4FC3E8', '#3B4FD8', '#9AA0B8', '#E8ECF8', '#2E7FD0'];
  for (let i = 0; i < nb; i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.globalAlpha = lerp(0.55, 0.9, R()); g.fillRect(R() * W - 60, H * 0.05 + R() * H * 0.8, lerp(40, 220, R()), lerp(8, 16, R())); }
  g.globalAlpha = 1; const lit = st % 4;
  for (let k = 0; k < 3; k++) { g.fillStyle = lit === 3 || k < lit ? '#FFFFFF' : 'rgba(255,255,255,0.35)'; const ax = (o.x ?? 70) + k * 46, ay = o.y ?? 120; g.beginPath(); g.moveTo(ax, ay - 20); g.lineTo(ax + 36, ay); g.lineTo(ax, ay + 20); g.closePath(); g.fill(); }
  g.restore(); }
// FFT(t, t0, t1, speed): the clock for the picture under a time skip: `speed` times faster inside [t0, t1] and stepped at 10 fps there
const FFT = (t, t0, t1, speed = 8) => t < t0 ? t : t > t1 ? t + (t1 - t0) * (speed - 1) : t0 + Math.floor((t - t0) * 10) / 10 * speed;
// twinkles(g, seed, n, col, t, o): the 4-point sparkles every starfield of the space Shorts has (measured: lavender or white, 10-30 px,
// a few per screen among the round dots, a slow twinkle); o.box = [x, y, w, h], o.size scales them.
function twinkles(g, seed, n, col = '#B8A8FF', t = 0, o = {}) { const R = rng(seed), [bx, by, bw, bh] = o.box || [0, 0, W, H];
  g.save(); g.fillStyle = col; for (let i = 0; i < n; i++) { const x = bx + R() * bw, y = by + R() * bh, s = lerp(10, 30, R()) * (o.size || 1) * (0.75 + 0.25 * Math.sin(t * lerp(1, 2.5, R()) + i)), k = s * 0.22;
    g.globalAlpha = lerp(0.55, 1, R()); g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x + k * 0.3, y - k * 0.3, x + s, y); g.quadraticCurveTo(x + k * 0.3, y + k * 0.3, x, y + s); g.quadraticCurveTo(x - k * 0.3, y + k * 0.3, x - s, y); g.quadraticCurveTo(x - k * 0.3, y - k * 0.3, x, y - s); g.fill(); }
  g.restore(); }
// shard(g, x, y, s, o): a faceted fragment: a dust grain, ice, a rock chip, debris (measured on the dust-grain shots): an irregular
// polygon of o.sides (5) corners split into 2-3 facet tones from one light direction (upper left), o.col = the mid tone; o.face = face()
// options with whites: the grain becomes a character (its eyes sit low and close, the face small: s is scaled 0.6 for it). o.rot, o.seed.
function shard(g, x, y, s, o = {}) { const R = rng(o.seed || 3), n = o.sides || 5, col = o.col || '#A9B4F0', pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (R() - 0.5) * 0.7 + (o.rot || 0); const r = s * lerp(0.6, 1.15, R()); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * (o.squash || 1)]); }
  const c = [x + (R() - 0.5) * s * 0.3, y + (R() - 0.5) * s * 0.3];
  g.save(); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2 - c[0], my = (p[1] + q[1]) / 2 - c[1], lit = -(mx + my) / (Math.hypot(mx, my) + 1e-3);
    g.fillStyle = lit > 0.35 ? lt(col, 0.12) : lit < -0.35 ? dk(col, 0.14) : col; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.closePath(); g.fill(); g.strokeStyle = g.fillStyle; g.lineWidth = 1.5; g.stroke(); }
  if (o.face) face(g, x, y, s * 0.6, { whites: true, col, low: 0.2, ...o.face });
  g.restore(); }
// fineprint(g, lines, o): the tiny caveat in a top corner ("Not to scale", "Enlarged for visual purposes", "Simplified"; measured: ~28 px,
// white at ~80 %, left-aligned at x 60, y 110) and the source line at the bottom; o.x, o.y, o.size, o.col, o.align.
function fineprint(g, lines, o = {}) { lines = [].concat(lines); const size = o.size || 28;
  lines.forEach((l, i) => txt(g, l, o.x ?? 60, (o.y ?? 110) + i * size * 1.25, { size, weight: 600, col: o.col || 'rgba(255,255,255,0.8)', align: o.align || 'left' })); }
// split(g, panels, o): the split screen (two consequences at once, this world vs that one): panels = [draw, ...]; o.dir 'h' stacks
// them top to bottom (default: the frame is tall), 'v' puts them side by side; a white divider (o.line 8 px, o.lineCol) between them.
// draw(g, x, y, w, h) paints inside its own clipped box. Measured: two stacked panels for "meanwhile", a left|right pair with a white
// line for a comparison, three strips for three states of one thing.
function split(g, panels, o = {}) { const n = panels.length, v = o.dir === 'v', lw = o.line ?? 8;
  panels.forEach((d, i) => { const x = v ? i * W / n : 0, y = v ? 0 : i * H / n, w = v ? W / n : W, h = v ? H : H / n; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); d(g, x, y, w, h); g.restore(); });
  g.save(); g.fillStyle = o.lineCol || '#FFFFFF'; for (let i = 1; i < n; i++) { if (v) g.fillRect(i * W / n - lw / 2, 0, lw, H); else g.fillRect(0, i * H / n - lw / 2, W, lw); } g.restore(); }
// skull(g, x, y, s, col) and skullTag(g, n, x, y, o): the death counter (measured on three Shorts): a black rounded plate, a pale
// skull, a big white number (feed it a counted value); o.size = the number's size (64).
function skull(g, x, y, s, col = '#F4E6FF') { g.save(); g.fillStyle = col; ell(g, x, y - s * 0.12, s * 0.5, s * 0.44); g.fill(); rr(g, x - s * 0.3, y + s * 0.1, s * 0.6, s * 0.36, s * 0.1); g.fill();
  g.fillStyle = '#1A0B2E'; ell(g, x - s * 0.19, y - s * 0.06, s * 0.13, s * 0.15); g.fill(); ell(g, x + s * 0.19, y - s * 0.06, s * 0.13, s * 0.15); g.fill(); ell(g, x, y + s * 0.14, s * 0.05, s * 0.07); g.fill(); g.restore(); }
function skullTag(g, n, x, y, o = {}) { const size = o.size || 64, s = String(n), w = txtW(g, s, size, 'H') + size * 2.6, h = size * 1.5;
  g.save(); rr(g, x - w / 2, y - h / 2, w, h, size * 0.18); g.fillStyle = o.col || '#000000'; g.fill(); skull(g, x - w / 2 + size * 1.0, y, size * 0.95); txt(g, s, x + size * 0.55, y, { size, font: 'H', col: '#FFFFFF' }); g.restore(); }
// gauge(g, x, y, r, v, o): a dial (wind speed, rocket speed, a hormone level; measured on three Shorts): a navy face in a lighter ring,
// ticks and numbers on a 240-degree arc, a yellow needle at v (0..1) that twitches a little (o.t), a big readout under the hub (o.read,
// o.unit); o.zones = [[from, to, colour], ...] paints bands on the arc (low / medium / high); o.labels = the numbers.
function gauge(g, x, y, r, v, o = {}) { mark(g, 'device', x - r, y - r, x + r, y + r, 'gauge', 'ell'); const a0 = 150 * D2R, a1 = 390 * D2R, tw = o.t != null ? Math.sin(o.t * 9) * 0.008 + Math.sin(o.t * 3.1) * 0.006 : 0, ang = lerp(a0, a1, clamp(v + tw));
  g.save(); g.fillStyle = o.ring || '#2E57D6'; ell(g, x, y, r, r); g.fill(); g.fillStyle = o.face || '#0E1A4F'; ell(g, x, y, r * 0.9, r * 0.9); g.fill();
  (o.zones || []).forEach(([f, t2, c]) => { g.strokeStyle = c; g.lineWidth = r * 0.09; g.beginPath(); g.arc(x, y, r * 0.76, lerp(a0, a1, f), lerp(a0, a1, t2)); g.stroke(); });
  const nt = o.ticks || 6; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = r * 0.025;
  for (let i = 0; i <= nt * 2; i++) { const a = lerp(a0, a1, i / (nt * 2)), l = i % 2 ? 0.06 : 0.11; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); g.lineTo(x + Math.cos(a) * r * (0.86 - l), y + Math.sin(a) * r * (0.86 - l)); g.stroke();
    if (!(i % 2) && o.labels) txt(g, String(o.labels[i / 2] ?? ''), x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, { size: r * 0.12, col: 'rgba(255,255,255,0.8)' }); }
  g.strokeStyle = o.needle || PAL.yellow; g.lineWidth = r * 0.07; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - Math.cos(ang) * r * 0.1, y - Math.sin(ang) * r * 0.1); g.lineTo(x + Math.cos(ang) * r * 0.7, y + Math.sin(ang) * r * 0.7); g.stroke();
  g.fillStyle = o.needle || PAL.yellow; ell(g, x, y, r * 0.09, r * 0.09); g.fill();
  if (o.read != null) { txt(g, String(o.read), x, y + r * 0.42, { size: r * 0.34, font: 'H', col: PAL.yellow }); if (o.unit) txt(g, o.unit, x, y + r * 0.66, { size: r * 0.12, col: PAL.yellow }); }
  g.restore(); }
// perspGrid(g, o): the neon perspective floor (warped space near a black hole, a simulation, a game board): lines from a vanishing point
// (o.vx) at the horizon o.hy, cross lines spaced in perspective that roll toward the viewer (o.t, o.speed); o.col, o.a, o.w. Clip it to
// a disc or a funnel yourself for the gravity-well look.
function perspGrid(g, o = {}) { const vx = o.vx ?? W / 2, hy = o.hy ?? H * 0.55, n = o.n || 14, rows = o.rows || 12;
  g.save(); g.strokeStyle = rgba(o.col || '#4D5BFF', o.a ?? 0.85); g.lineWidth = o.w || 5;
  for (let i = -n; i <= n; i++) { g.beginPath(); g.moveTo(vx, hy); g.lineTo(vx + i * W * 0.22, H * 1.1); g.stroke(); }
  const sh = ((o.t || 0) * (o.speed ?? 0.4)) % 1; for (let j = 0; j < rows; j++) { const k = (j + sh) / rows, y = hy + (H * 1.1 - hy) * k * k; g.beginPath(); g.moveTo(-W, y); g.lineTo(2 * W, y); g.stroke(); }
  g.restore(); }
// speedLines(g, seed, t, o): travel at speed (a star flung away, a probe racing): long thin streaks (o.dir 'x' | 'y') in two or three
// blues, soft (blur 3 px), racing past at o.speed px/s; the moving hero gets a smear and a trail on top.
function speedLines(g, seed, t, o = {}) { const R = rng(seed), n = o.n || 26, sp = o.speed || 2600, cols = o.cols || ['#3E5BD8', '#6FA8FF', '#2B2F8F'];
  g.save(); g.filter = 'blur(3px)';
  for (let i = 0; i < n; i++) { const L = lerp(80, 420, R()), y = R() * H, v = sp * lerp(0.6, 1.4, R()), span = W + L * 2, x = ((R() * span - t * v) % span + span) % span - L, th = lerp(3, 7, R());
    g.fillStyle = rgba(cols[i % cols.length], lerp(0.35, 0.8, R())); if (o.dir === 'y') g.fillRect(y * W / H, x * H / W, th, L); else g.fillRect(x, y, L, th); }
  g.restore(); }

// ── study 10: the whole channel (141 Shorts, a frame every 2.5 s = 3,868 frames, measured with code) ─────────────────────────────
// SHADING, measured on 15,596 shadow/surface pairs and 14,848 highlight/surface pairs (flat regions of one hue touching each other):
// a shadow is ~10 L darker and its hue turns TOWARD PURPLE (yellow -> orange, green -> teal, cyan -> blue, red -> magenta); a highlight
// is ~10 L lighter and turns TOWARD YELLOW. The table is the measured median per 60-degree band of Lab hue (centres 30, 90, ... 330):
// [hue shift, dL, chroma ratio]; values in between are interpolated. Dark bases (L < 45) lose a little chroma in shadow (x0.88) and
// gain some in light (x1.1); light bases (L > 70) lose chroma in light (x0.85).
const SHADE_T = [[-8.5, 9.7, 0.95], [-11.4, 10.2, 0.99], [5.6, 11.7, 0.85], [13.4, 8.3, 0.99], [8.6, 10.5, 1.14], [-0.6, 8.9, 0.89]];
const LIGHT_T = [[8.1, 11.4, 1.01], [9.7, 9.7, 0.99], [-4.7, 11.2, 1.14], [-7.6, 9.1, 1.0], [-7.7, 9.6, 0.9], [0.4, 9.9, 1.1]];
const _band = (T, h) => { const u = ((h - 30) / 60 + 6) % 6, i = Math.floor(u), f = u - i, a = T[i], b = T[(i + 1) % 6]; return a.map((v, j) => lerp(v, b[j], f)); };
// shadeOf(c, k): the measured shadow colour of c (k scales the step: 0.5 = a soft core shadow, 2 = a deep cast shadow)
function shadeOf(c, k = 1) { const [L, C, h] = lch(c), [dh, dL, cr] = _band(SHADE_T, h); return fromLch(L - dL * k, C * lerp(1, cr * (L < 45 ? 0.88 : 1), Math.min(1, k)), h + dh * Math.min(1.5, k)); }
// lightOf(c, k): the measured highlight / lit-side colour of c
function lightOf(c, k = 1) { const [L, C, h] = lch(c), [dh, dL, cr] = _band(LIGHT_T, h); return fromLch(L + dL * k, C * lerp(1, cr * (L < 45 ? 1.1 : L > 70 ? 0.85 : 1), Math.min(1, k)), h + dh * Math.min(1.5, k)); }
// ATMOSPHERE, measured on 1,600 frames with a sky and 3+ full-width planes: every plane nearer the viewer moves FURTHER from the sky
// colour (|dL| to the sky 5, 10, 14, 16, 18 for planes 1-5 below it; hue 8, 16, 23, 24, 28 degrees away; chroma +1.5 a plane). On a
// light sky the nearer planes are darker, on a dark sky lighter. atmos(col, sky, d): a plane's colour at depth d (0 = the nearest
// plane, unchanged; 1 = the farthest, keeping 25 % of its difference from the sky), mixed in Lab. planesOf(sky, near, n): n plane
// colours from the farthest to the nearest (4 planes give the measured 5 / 9 / 13 / 18 L from the sky).
function atmos(col, sky, d) { const A = hex2lab(col), S = hex2lab(sky), k = clamp(d) * 0.75; return lab2hex(lerp(A[0], S[0], k), lerp(A[1], S[1], k), lerp(A[2], S[2], k)); }
const planesOf = (sky, near, n = 4) => Array.from({ length: n }, (_, i) => atmos(near, sky, 1 - i / Math.max(1, n - 1)));
// BLOOM, measured on 4,428 bright blobs on 1,838 dark frames: a TIGHT bright rim (+12 L right at the edge, half of it by 0.1 r) over a
// faint wide halo (+3 L out to 2 r, gone by 3 r). bloom(g, x, y, r, col, o): both parts around a disc of radius r (draw it after the
// glow so the disc stays crisp); o.k scales them, o.op the blend ('screen').
function bloom(g, x, y, r, col, o = {}) { const k = o.k ?? 1; g.save(); g.globalCompositeOperation = o.op || 'screen';
  let gr = g.createRadialGradient(x, y, r * 0.98, x, y, r * 3); gr.addColorStop(0, rgba(col, 0.12 * k)); gr.addColorStop(0.5, rgba(col, 0.05 * k)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; ell(g, x, y, r * 3, r * 3); g.fill();
  gr = g.createRadialGradient(x, y, r * 0.98, x, y, r * 1.3); gr.addColorStop(0, rgba(col, 0.5 * k)); gr.addColorStop(0.25, rgba(col, 0.2 * k)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; ell(g, x, y, r * 1.3, r * 1.3); g.fill();
  g.restore(); }
// STARFIELD, measured on 1,636 dark frames: ~71 specks a frame, core radius ~2.5 px (90 % under 7), 92 % TINTED (lavender-blue, Lab hue
// ~265; white is the minority), a few big ones with a small halo, ~5 four-point sparkles. starfield(g, seed, t, o): o.n, o.cols,
// o.sparkles, o.box = [x, y, w, h]; twinkles slowly with t. Lay it on a navy-to-purple bg().
function starfield(g, seed, t = 0, o = {}) { const R = rng(seed), n = o.n ?? 71, cols = o.cols || ['#8E8CFF', '#A99CFF', '#6F9BFF', '#C3A4FF', '#FFFFFF'], [bx, by, bw, bh] = o.box || [0, 0, W, H];
  g.save(); for (let i = 0; i < n; i++) { const x = bx + R() * bw, y = by + R() * bh, u = R(), r = (u < 0.5 ? lerp(1, 2.5, u * 2) : u < 0.9 ? lerp(2.5, 4.5, (u - 0.5) / 0.4) : lerp(4.5, 7, (u - 0.9) / 0.1)) * (o.size || 1);
    const c = cols[Math.floor(R() * cols.length)], tw = 0.75 + 0.25 * Math.sin(t * lerp(0.8, 2.2, R()) + i * 1.7);
    if (r > 4.4) { g.fillStyle = rgba(c, 0.16 * tw); ell(g, x, y, r * 2.6, r * 2.6); g.fill(); }
    g.fillStyle = rgba(c, lerp(0.55, 1, R()) * tw); ell(g, x, y, r, r); g.fill(); }
  g.restore(); twinkles(g, seed + 101, o.sparkles ?? 5, cols[1], t, { box: o.box, size: 0.8 }); }
// ORBIT DIAGRAMS (the space Shorts' most used device): orbit(g, x, y, rx, ry, o): a thin orbit line (o.col, o.w 4, o.dash = [on, off]
// for a dashed one, o.rot), o.glow = a soft wide copy under it; o.trail = [from, to] angles in radians draws only that arc fading toward
// `from` (a moon's path); o.dot = an angle where a small body sits on it (o.dotR, o.dotCol). zone(g, x, y, r, o): a translucent disc
// with a dashed rim (a "zone", a sphere of influence, a safe area). marker(g, n, x, y, o): a numbered disc (1, 2, 3: steps or options).
function orbit(g, x, y, rx, ry, o = {}) { const col = o.col || '#5B6BFF', w = o.w ?? 4;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0);
  if (o.glow) { g.strokeStyle = rgba(o.glow === true ? col : o.glow, 0.18); g.lineWidth = w * 5; g.filter = 'blur(6px)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke(); g.filter = 'none'; }
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; if (o.dash) g.setLineDash(o.dash);
  if (o.trail) { const [a0, a1] = o.trail, n = 24; for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / n), b = lerp(a0, a1, (i + 1) / n); g.globalAlpha = (i + 1) / n; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, a, b); g.stroke(); } g.globalAlpha = 1; }
  else { g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke(); }
  g.setLineDash([]);
  if (o.dot != null) { g.fillStyle = o.dotCol || '#FFFFFF'; ell(g, Math.cos(o.dot) * rx, Math.sin(o.dot) * ry, o.dotR || 10, o.dotR || 10); g.fill(); }
  g.restore(); }
function zone(g, x, y, r, o = {}) { const col = o.col || '#4FC3F7'; g.save(); g.fillStyle = rgba(col, o.a ?? 0.35); ell(g, x, y, r, r); g.fill();
  g.strokeStyle = o.rim || lightOf(col, 1.2); g.lineWidth = o.w ?? 5; g.setLineDash(o.dash || [18, 12]); ell(g, x, y, r, r); g.stroke(); g.setLineDash([]);
  if (o.center !== false) { g.fillStyle = '#FFFFFF'; ell(g, x, y, 6, 6); g.fill(); } g.restore(); }
// onFace(g, ox, oy, ux, uy, vx, vy, fn): draw fn in a unit square mapped onto a parallelogram (origin, u edge, v edge): windows and
// slits on the receding side of a box. Fill only inside (strokes would be skewed too).
function onFace(g, ox, oy, ux, uy, vx, vy, fn) { g.save(); g.transform(ux, uy, vx, vy, ox, oy); fn(g); g.restore(); }
// building(g, x, y, w, floors, o): a building in the 3/4 view of the night-city shots (measured on a title frame): stacked floor
// slabs that stick out a little, each with a light top (o.top) and a fascia (o.fascia), between them a band of wall columns (o.wall)
// and windows: lit ones warm (o.lit) with two diagonal glints, dark ones deep glass; the side face (o.side) recedes to the left
// (o.depth = its depth as a share of w, 0.3) with lighter window slits. (x, y) = the bottom left of the FRONT face; o.fh = floor
// height (0.3 w); o.cols = windows per floor (3); o.litShare (0.5); o.seed; o.roof adds a roof slab with a box on it.
// Measured near-building palette: wall #24CBB0, fascia #338D9B, top #A8E0E3, side #2A237A, lit #E5A44A.
function building(g, x, y, w, floors, o = {}) {
  const fh = o.fh || w * 0.3, dep = (o.depth ?? 0.3) * w, dx = -dep, dy = -dep * 0.5, R = rng(o.seed || 1), h = fh * floors, nc = o.cols || 3;
  const wall = o.wall || '#24CBB0', fascia = o.fascia || '#338D9B', top = o.top || '#A8E0E3', side = o.side || '#2A237A', lit = o.lit || '#E5A44A', glass = o.glass || shadeOf(side, 0.8);
  g.save();
  g.fillStyle = side; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.lineTo(x + dx, y + dy - h); g.lineTo(x, y - h); g.closePath(); g.fill();
  onFace(g, x, y - h, dx, dy, 0, h, gg => { gg.fillStyle = lightOf(side, 0.7); for (let f = 0; f < floors; f++) for (let k = 0; k < 2; k++) gg.fillRect(0.25 + k * 0.38, (f + 0.3) / floors, 0.09, 0.45 / floors); });
  g.fillStyle = wall; g.fillRect(x, y - h, w, h);
  for (let f = 0; f < floors; f++) { const yb = y - f * fh, ww = w / nc;
    for (let c = 0; c < nc; c++) { const wx = x + c * ww + ww * 0.12, wy = yb - fh * 0.78, wwi = ww * 0.76, whi = fh * 0.62, on = R() < (o.litShare ?? 0.5);
      g.fillStyle = on ? lit : glass; g.fillRect(wx, wy, wwi, whi);
      if (on) { g.save(); g.beginPath(); g.rect(wx, wy, wwi, whi); g.clip(); g.fillStyle = lightOf(lit, 1.2);
        for (const s of [0.25, 0.48]) { const sx = wx + wwi * s; g.beginPath(); g.moveTo(sx, wy + whi); g.lineTo(sx + whi * 0.7, wy); g.lineTo(sx + whi * 0.7 + wwi * 0.07, wy); g.lineTo(sx + wwi * 0.07, wy + whi); g.closePath(); g.fill(); } g.restore(); } }
    const sy = yb - fh, ov = w * 0.03, th = fh * 0.15;
    g.fillStyle = top; g.beginPath(); g.moveTo(x - ov, sy); g.lineTo(x - ov + dx * 0.35, sy + dy * 0.35); g.lineTo(x + w + ov + dx * 0.35, sy + dy * 0.35); g.lineTo(x + w + ov, sy); g.closePath(); g.fill();
    g.fillStyle = fascia; g.fillRect(x - ov, sy, w + ov * 2, th); }
  if (o.roof) { const ry = y - h; g.fillStyle = top; g.beginPath(); g.moveTo(x - w * 0.04, ry); g.lineTo(x - w * 0.04 + dx, ry + dy); g.lineTo(x + w * 1.04 + dx, ry + dy); g.lineTo(x + w * 1.04, ry); g.closePath(); g.fill();
    g.fillStyle = fascia; g.fillRect(x - w * 0.04, ry, w * 1.08, fh * 0.2); g.fillStyle = shadeOf(top, 0.6); g.fillRect(x + w * 0.55, ry + dy * 0.5 - fh * 0.35, w * 0.18, fh * 0.35); }
  g.restore(); }
// city(g, seed, o): a night skyline in planes (measured): the far rows are WARM (magenta / crimson / red: #7A0A6B, #A5058C, #C41B63,
// #D53235) with two-pane yellow windows, hazed toward the horizon colour (o.horizon, '#B3185F'); the near buildings are cool (teal,
// indigo). o.y = the street line (default H), o.rows (3), o.near = false skips the nearest teal row; o.t lets a few windows flicker.
function city(g, seed, o = {}) { const R = rng(seed), base = o.y ?? H, rows = o.rows || 3, hz = o.horizon || '#B3185F', warm = o.warm || ['#7A0A6B', '#A5058C', '#C41B63', '#D53235'];
  g.save();
  for (let r = 0; r < rows; r++) { const d = 1 - r / Math.max(1, rows), sc = lerp(1, 0.45, d), yb = base - lerp(0, H * 0.06, d);
    if (r === 0) { const gl = g.createLinearGradient(0, yb - H * 0.35, 0, yb); gl.addColorStop(0, rgba(hz, 0)); gl.addColorStop(1, rgba(hz, 0.55)); g.fillStyle = gl; g.fillRect(-W, yb - H * 0.35, 3 * W, H * 0.35); }
    for (let x = -60 + R() * 80; x < W + 60;) { const w = lerp(140, 300, R()) * sc, hgt = lerp(300, 760, R()) * sc, col = atmos(warm[Math.floor(R() * warm.length)], hz, d * 0.7);
      g.fillStyle = col; g.fillRect(x, yb - hgt, w, hgt + 4); g.fillStyle = shadeOf(col, 0.7); g.fillRect(x, yb - hgt, w * 0.12, hgt + 4);
      const nw = Math.max(1, Math.floor(w / (70 * sc))), nf = Math.max(1, Math.floor(hgt / (90 * sc)));
      for (let f = 0; f < nf; f++) for (let c = 0; c < nw; c++) { if (R() < 0.45) continue; const wx = x + w * 0.2 + c * (w * 0.7 / nw), wy = yb - hgt + 30 * sc + f * (hgt - 40 * sc) / nf, pw = 14 * sc, ph = 30 * sc;
        g.fillStyle = atmos('#F5B34C', hz, d * 0.5); g.fillRect(wx, wy, pw, ph); g.fillRect(wx + pw + 5 * sc, wy, pw, ph); }
      x += w + lerp(-10, 40, R()) * sc; } }
  if (o.near !== false) { building(g, W * 0.12, base + 10, W * 0.46, 6, { seed: seed + 1, roof: true }); building(g, W * 0.74, base + 30, W * 0.34, 3, { seed: seed + 2, depth: 0.2 }); }
  g.restore(); }
// ocean(g, y, o): open water to a horizon at y (measured on a horizon frame): the sea is BRIGHTEST at the horizon (#15D6F3) and darkens
// toward the viewer (#18A2DA, #1E6FC1, #233EAC, #271398); a thin light line and a soft cyan glow sit on the horizon; the light's path is
// a cluster of short horizontal capsules (white, pale pink, pale blue) under o.lx, small and dense near the horizon, longer and
// sparser nearer, shimmering with o.t. o.stops overrides the gradient, o.glints = how many (40).
function ocean(g, y, o = {}) { const st = o.stops || ['#15D6F3', '#18A2DA', '#1E6FC1', '#233EAC', '#271398'], R = rng(o.seed || 9), lx = o.lx ?? W * 0.45, t = o.t || 0;
  g.save(); const gr = g.createLinearGradient(0, y, 0, H); st.forEach((c, i) => gr.addColorStop(i === 0 ? 0 : Math.pow(i / (st.length - 1), 0.8), c)); g.fillStyle = gr; g.fillRect(-W, y, 3 * W, H * 2);
  const hg = g.createLinearGradient(0, y - 90, 0, y); hg.addColorStop(0, rgba(st[0], 0)); hg.addColorStop(1, rgba(st[0], 0.35)); g.fillStyle = hg; g.fillRect(-W, y - 90, 3 * W, 90);
  g.fillStyle = rgba('#FFFFFF', 0.55); g.fillRect(-W, y - 2, 3 * W, 4);
  const cols = ['#FFFFFF', '#F4C6D8', '#BFE9FF', '#E2E5E7'];
  for (let i = 0; i < (o.glints ?? 40); i++) { const k = Math.pow(R(), 1.6), yy = y + 14 + k * (H - y) * 0.45, sp = lerp(70, 320, k), len = lerp(14, 70, k), th = lerp(4, 9, k);
    const xx = lx + (R() - 0.5) * 2 * sp + Math.sin(t * lerp(1, 2.5, R()) + i) * 6; g.fillStyle = rgba(cols[i % cols.length], lerp(0.5, 0.95, R()) * (0.7 + 0.3 * Math.sin(t * 3 + i * 1.3)));
    rr(g, xx - len / 2, yy - th / 2, len, th, th / 2); g.fill(); }
  g.restore(); }
// canopy(g, seed, o): a forest seen from above (measured on a canopy frame): round crowns in three greens (#1AC52C, #0EBE42, #0CA843),
// each with a darker lower crescent of its own colour and a dark cast shadow below it on the ground (#086E5C), the ground deep teal
// (#044D4E), a few maroon trunk stubs showing; crowns grow toward the bottom (o.r0 far, o.r1 near) and overlap far-to-near. o.box.
function canopy(g, seed, o = {}) { const R = rng(seed), [bx, by, bw, bh] = o.box || [0, 0, W, H], cols = o.cols || ['#1AC52C', '#0EBE42', '#0CA843', '#098A4B', '#22CC3A'], ground = o.ground || '#044D4E';
  g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip(); g.fillStyle = ground; g.fillRect(bx, by, bw, bh);
  const trees = []; for (let yy = by - 40; yy < by + bh + 80;) { const r = lerp(o.r0 ?? 90, o.r1 ?? 150, clamp((yy - by) / bh)); for (let xx = bx - r * R(); xx < bx + bw + r; xx += r * lerp(1.6, 2.3, R())) trees.push([xx, yy + (R() - 0.5) * r * 0.6, r * lerp(0.55, 1.1, R())]); yy += r * (o.gap ?? 0.95); }
  for (const [x, y, r] of trees) { g.fillStyle = o.shadow || '#03404A'; ell(g, x + r * 0.1, y + r * 0.5, r * 1.0, r * 0.62); g.fill(); }
  for (const [x, y, r] of trees) { const c = cols[Math.floor(R() * cols.length)];
    if (R() < 0.25) { g.fillStyle = '#663A62'; rr(g, x - r * 0.06, y + r * 0.55, r * 0.12, r * 0.3, r * 0.05); g.fill(); }
    g.fillStyle = shadeOf(c, 1.1); ell(g, x, y + r * 0.08, r, r * 0.9); g.fill(); g.fillStyle = c; ell(g, x - r * 0.02, y - r * 0.08, r * 0.92, r * 0.8); g.fill(); }
  g.restore(); }
function marker(g, n, x, y, o = {}) { const r = o.r || 48; g.save(); g.fillStyle = o.col || '#FFB21E'; ell(g, x, y, r, r); g.fill(); txt(g, String(n), x, y + r * 0.04, { size: r * 1.15, font: 'H', col: o.txt || '#FFFFFF' }); g.restore(); }

// ── the whole-channel study (141 Shorts, 3,868 frames): rooms, colour fields, deep space, maps, cells, data devices, animals ──────────
// tone(c, dL, dh, kC): the same colour moved in LCh (dL lightness, dh hue in degrees, kC chroma factor). The channel's wall decor is
// TONAL: the wall colour at +6..+14 L (lighter in about two thirds of rooms), within 20 degrees of its hue, so it stays background.
const tone = (c, dL = 0, dh = 0, kC = 1) => { const [L, C, h] = lch(c); return fromLch(clamp(L + dL, 0, 100), Math.max(0, C * kC), h + dh); };
// ROOMS, measured on all 516 interior frames of the channel (home 158, office / school / ship 239, lab / hospital 119): ONE flat
// saturated wall colour (purple, magenta, teal, yellow, lavender) fills most of the frame; the floor meets it at 0.73 H (p25 0.6;
// table-top close-ups ~0.5); where floor and wall differ the floor is a little LIGHTER (median +2 L in homes and offices, +7 in labs),
// the same hue family in half the rooms and a warm contrast in a quarter (orange / salmon under purple, orange under teal).
// room(g, o): o.wall, o.floor (default tone(wall, +6, +5)), o.seam (0.73), o.lamp = [x, y, r] a
// pool of light on the wall, o.decor = [[kind, x, y, w, h, opts], ...] tonal wall pieces (decor), o.skirt (false = no skirting
// band), o.rug = [x, y, w, h, col]. Furniture goes on top with furn().
function room(g, o = {}) { const wall = o.wall || '#5B027A', floor = o.floor || tone(wall, 6, 5), sy = H * (o.seam ?? 0.73);
  g.save(); g.fillStyle = wall; g.fillRect(-W, -H, 3 * W, sy + H);
  if (o.lamp) { const [lx, ly, lr] = o.lamp, gr = g.createRadialGradient(lx, ly, 0, lx, ly, lr); gr.addColorStop(0, rgba(tone(wall, 14, -8, 1.05), 0.9)); gr.addColorStop(1, rgba(wall, 0)); g.fillStyle = gr; g.fillRect(lx - lr, ly - lr, 2 * lr, 2 * lr); }
  for (const d of o.decor || []) decor(g, d[0], d[1], d[2], d[3], d[4], wall, d[5] || {});
  g.fillStyle = floor; g.fillRect(-W, sy, 3 * W, 2 * H);
  const gr = g.createLinearGradient(0, sy, 0, sy + H * 0.07); gr.addColorStop(0, rgba(shadeOf(floor), 0.7)); gr.addColorStop(1, rgba(shadeOf(floor), 0)); g.fillStyle = gr; g.fillRect(-W, sy, 3 * W, H * 0.07);
  if (o.skirt !== false) { g.fillStyle = shadeOf(wall, 1.2); g.fillRect(-W, sy - H * 0.012, 3 * W, H * 0.012); }
  if (o.rug) { const [x, y, w, h, col] = o.rug; rug(g, x, y, w, h, col || tone(floor, 12, -10)); }
  mark(g, 'floor', 0, sy, W, H, 'floor'); g.restore(); }
// rug(g, x, y, w, h, col): a floor rug in perspective (narrower at the back) with scalloped fringes front and back.
function rug(g, x, y, w, h, col) { const k = w * 0.12, n = 9; g.save(); g.fillStyle = col; g.beginPath(); g.moveTo(x - w / 2 + k, y - h / 2); g.lineTo(x + w / 2 - k, y - h / 2); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x - w / 2, y + h / 2); g.closePath(); g.fill();
  g.fillStyle = tone(col, 10); for (const e of [-1, 1]) { const yy = y + e * h / 2, ww = e < 0 ? w - 2 * k : w; for (let i = 0; i < n; i++) { ell(g, x - ww / 2 + (i + 0.5) * ww / n, yy, ww / n * 0.42, h * 0.07); g.fill(); } }
  g.restore(); }
// decor(g, kind, x, y, w, h, wall, o): one tonal wall piece centred at (x, y): 'frame' (a picture: tonal border, a small landscape or
// o.art(g, x, y, w, h)), 'poster' (thin border, tonal blobs), 'window' (o.sky or o.inside(g, x, y, w, h), o.blinds = slat count),
// 'arch' (a tall arched window, o.inside), 'shelf' (a plank with books, o.books colours), 'clock', 'rail' (the hospital wall rail with
// sockets, full width, h = its height), 'board' (a chalkboard: dark green panel o.col, warm frame o.frame, chalk ledge, o.inside for the
// chalk), 'door'. o.dl overrides the +9 L tone (pale walls get -9 automatically).
function decor(g, kind, x, y, w, h, wall, o = {}) { const dl = o.dl ?? (lch(wall)[0] > 70 ? -9 : 9), fr = tone(wall, dl), inn = tone(wall, dl * 0.45), R = rng(o.seed || 5);
  g.save();
  if (kind === 'frame' || kind === 'poster') { g.fillStyle = fr; rr(g, x - w / 2, y - h / 2, w, h, w * 0.02); g.fill(); const b = Math.min(w, h) * (kind === 'frame' ? 0.09 : 0.03);
    g.save(); rr(g, x - w / 2 + b, y - h / 2 + b, w - 2 * b, h - 2 * b, 2); g.clip(); g.fillStyle = inn; g.fillRect(x - w / 2, y - h / 2, w, h);
    if (o.art) o.art(g, x, y, w - 2 * b, h - 2 * b);
    else if (kind === 'frame') { g.fillStyle = tone(wall, dl * 1.6); g.beginPath(); g.moveTo(x - w / 2, y + h / 2); g.lineTo(x - w * 0.15, y - h * 0.05); g.lineTo(x + w * 0.05, y + h * 0.15); g.lineTo(x + w * 0.25, y - h * 0.12); g.lineTo(x + w / 2, y + h * 0.2); g.lineTo(x + w / 2, y + h / 2); g.closePath(); g.fill(); ell(g, x - w * 0.22, y - h * 0.22, w * 0.08, w * 0.08); g.fill(); }
    else { for (let i = 0; i < 3; i++) { g.fillStyle = tone(wall, dl * (1.2 + R() * 0.8), (R() - 0.5) * 40); ell(g, x + (R() - 0.5) * w * 0.6, y + (R() - 0.5) * h * 0.6, w * lerp(0.12, 0.25, R()), w * lerp(0.12, 0.25, R())); g.fill(); } }
    g.restore(); }
  else if (kind === 'window' || kind === 'arch') { const b = w * 0.06, ar = kind === 'arch', path = (gg, i) => { const X = x - w / 2 + i, Y = y - h / 2 + i, ww = w - 2 * i, hh = h - 2 * i; if (ar) { gg.beginPath(); gg.moveTo(X, Y + hh); gg.lineTo(X, Y + ww / 2); gg.arc(X + ww / 2, Y + ww / 2, ww / 2, Math.PI, 0); gg.lineTo(X + ww, Y + hh); gg.closePath(); } else rr(gg, X, Y, ww, hh, w * 0.03); };
    g.fillStyle = fr; path(g, 0); g.fill(); g.save(); path(g, b); g.clip();
    if (o.inside) o.inside(g, x, y, w - 2 * b, h - 2 * b); else { const sky = o.sky || '#7FE3FF', gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2); gr.addColorStop(0, sky); gr.addColorStop(1, lightOf(sky, 1.5)); g.fillStyle = gr; g.fillRect(x - w, y - h, 2 * w, 2 * h); }
    if (o.blinds) { g.fillStyle = rgba(tone(wall, dl * 1.6), 0.92); const n = o.blinds === true ? 9 : o.blinds; for (let i = 0; i < n; i++) g.fillRect(x - w / 2, y - h / 2 + i * h / n, w, h / n * 0.62); }
    g.restore(); g.fillStyle = fr; const my = ar ? y - h / 2 + w * 0.5 : y - h / 2; g.fillRect(x - b / 2, my, b, y + h / 2 - my);
    if (!ar) g.fillRect(x - w / 2, y - b / 2, w, b); }
  else if (kind === 'shelf') { g.fillStyle = fr; g.fillRect(x - w / 2, y, w, h * 0.12); let bx = x - w / 2 + w * 0.05;
    while (bx < x + w / 2 - w * 0.08) { const bw = w * lerp(0.05, 0.09, R()), bh = h * lerp(0.6, 0.95, R()); g.fillStyle = o.books ? o.books[Math.floor(R() * o.books.length)] : tone(wall, dl * lerp(0.6, 1.8, R()), (R() - 0.5) * 30); g.fillRect(bx, y - bh, bw, bh); bx += bw + w * 0.008; } }
  else if (kind === 'clock') { g.fillStyle = fr; ell(g, x, y, w / 2, w / 2); g.fill(); g.fillStyle = inn; ell(g, x, y, w * 0.4, w * 0.4); g.fill(); cap(g, x, y, x, y - w * 0.3, w * 0.05, fr); cap(g, x, y, x + w * 0.2, y + w * 0.05, w * 0.05, fr); }
  else if (kind === 'rail') { const n = o.n || 4; g.fillStyle = fr; g.fillRect(-W, y - h / 2, 3 * W, h); g.fillStyle = tone(wall, dl * 0.4); for (let i = 0; i < n; i++) { ell(g, x + (i - (n - 1) / 2) * h * 1.6, y, h * 0.25, h * 0.25); g.fill(); } }
  else if (kind === 'board') { const fcol = o.frame || '#E14C36', bcol = o.col || '#0C5D5D', b = w * 0.035; g.fillStyle = fcol; rr(g, x - w / 2, y - h / 2, w, h, b); g.fill(); g.fillStyle = bcol; g.fillRect(x - w / 2 + b, y - h / 2 + b, w - 2 * b, h - 2 * b);
    g.fillStyle = shadeOf(fcol); g.fillRect(x - w / 2 - b, y + h / 2 - b, w + 2 * b, b * 1.4);
    if (o.inside) { g.save(); g.beginPath(); g.rect(x - w / 2 + b, y - h / 2 + b, w - 2 * b, h - 2 * b); g.clip(); o.inside(g, x, y, w - 2 * b, h - 2 * b); g.restore(); } }
  else if (kind === 'door') { g.fillStyle = fr; rr(g, x - w / 2, y - h / 2, w, h, w * 0.04); g.fill(); g.fillStyle = inn; rr(g, x - w * 0.36, y - h * 0.42, w * 0.72, h * 0.36, w * 0.03); g.fill(); rr(g, x - w * 0.36, y + h * 0.02, w * 0.72, h * 0.36, w * 0.03); g.fill(); g.fillStyle = tone(wall, dl * 2); ell(g, x + w * 0.34, y + h * 0.02, w * 0.05, w * 0.05); g.fill(); }
  g.restore(); }
// FURNITURE, drawn like the reference rooms: flat blocks, one shade side (shadeOf), a light top edge (lightOf), a soft contact shadow,
// no outlines. furn(g, kind, x, y, s, o): (x, y) = the middle of its foot line, s = its width. kinds: 'sofa', 'armchair', 'table',
// 'desk' (the top seen from the front and a little above: a shallow trapezoid, o.depth 0.16, o.h), 'bed' (a hospital bed: frame o.frame, mattress, pillow,
// blanket o.col2, wheels), 'drawers' (a bedside cabinet on wheels, o.n drawers), 'bookshelf' (o.books colours, o.rows), 'plant' (pot
// o.col, leaves o.col2), 'lamp' (a floor lamp with a warm glow, o.light), 'monitor' (o.screen(g, x, y, w, h) draws the picture, o.scr
// its dark), 'console' (a control desk with lights o.lights and sliders), 'pedestal' (a hexagonal stand for a hero object, o.spot =
// a light cone colour, o.ring). o.col main colour, o.ground the floor colour for the contact shadow (false = none), o.t time.
function furn(g, kind, x, y, s, o = {}) { const col = o.col || { sofa: '#F5D04A', armchair: '#5A49E8', table: '#C8752F', desk: '#0A9487', bed: '#E9E2FB', drawers: '#3E9BE8', bookshelf: '#7A2E8C', plant: '#E86A3A', lamp: '#F2C14E', monitor: '#2B2F8F', console: '#3C2D9A', pedestal: '#E8F7F5' }[kind] || '#888888', c2 = o.col2, sh = shadeOf(col), li = lightOf(col), R = rng(o.seed || 3);
  if (kind !== 'lamp' && !o.wall) mark(g, o.on ? 'prop' : 'furn', x - s / 2, y - s * 0.5, x + s / 2, y, kind);   // o.on: it stands on a desk / shelf, not the floor
  g.save(); if (o.ground !== false && kind !== 'lamp') floorShadow(g, x, y, s * 1.05, o.ground || '#000000', 0.25);
  if (kind === 'sofa' || kind === 'armchair') { const so = kind === 'sofa', w = s, h = s * (so ? 0.42 : 0.62), arm = w * (so ? 0.09 : 0.18);
    g.fillStyle = sh; rr(g, x - w / 2 + arm * 0.6, y - h, w - arm * 1.2, h * 0.7, w * 0.04); g.fill();
    g.fillStyle = col; rr(g, x - w / 2 + arm * 0.6, y - h, w - arm * 1.2, h * 0.6, w * 0.04); g.fill(); g.fillStyle = li; rr(g, x - w / 2 + arm * 0.8, y - h, w - arm * 1.6, h * 0.07, h * 0.035); g.fill();
    if (so && c2 !== null) { g.fillStyle = c2 || '#DDF1F4'; g.save(); g.translate(x - w * 0.34, y - h * 0.6); g.rotate(-0.25); rr(g, -w * 0.08, -h * 0.2, w * 0.16, h * 0.34, w * 0.04); g.fill(); g.fillStyle = shadeOf(c2 || '#DDF1F4'); rr(g, -w * 0.08, h * 0.04, w * 0.16, h * 0.1, w * 0.03); g.fill(); g.restore(); }
    g.fillStyle = li; rr(g, x - w / 2 + arm * 0.9, y - h * 0.46, w - arm * 1.8, h * 0.22, w * 0.03); g.fill();
    g.fillStyle = col; rr(g, x - w / 2 + arm * 0.9, y - h * 0.39, w - arm * 1.8, h * 0.22, w * 0.03); g.fill();
    for (const e of [-1, 1]) { const ax = x + e * (w / 2 - arm / 2) - arm / 2; g.fillStyle = sh; rr(g, ax, y - h * 0.62, arm, h * 0.5, arm * 0.4); g.fill(); g.fillStyle = col; rr(g, ax + (e > 0 ? arm * 0.14 : 0), y - h * 0.62, arm * 0.86, h * 0.44, arm * 0.4); g.fill(); }
    g.fillStyle = sh; rr(g, x - w / 2 + arm * 0.2, y - h * 0.19, w - arm * 0.4, h * 0.11, w * 0.02); g.fill();
    g.fillStyle = shadeOf(col, 1.6); for (const e of [-1, 1]) g.fillRect(x + e * w * 0.38 - w * 0.02, y - h * 0.08, w * 0.04, h * 0.08); }
  else if (kind === 'table') { const w = s, h = s * 0.45, t = s * 0.06; g.fillStyle = sh; for (const e of [-1, 1]) g.fillRect(x + e * w * 0.4 - t / 2, y - h, t, h); g.fillStyle = li; g.fillRect(x - w / 2, y - h - t * 1.4, w, t * 0.6); g.fillStyle = col; g.fillRect(x - w / 2, y - h - t * 0.8, w, t * 1.2); }
  else if (kind === 'desk') { const w = s, d = s * (o.depth ?? 0.16), top = y - (o.h ?? s * 0.5); g.fillStyle = sh; for (const e of [-1, 1]) g.fillRect(x + e * w * 0.42 - s * 0.025, top, s * 0.05, y - top);
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w * 0.42, top - d); g.lineTo(x + w * 0.42, top - d); g.lineTo(x + w / 2, top); g.lineTo(x - w / 2, top); g.closePath(); g.fill();
    g.fillStyle = li; g.fillRect(x - w * 0.42, top - d, w * 0.84, s * 0.008); g.fillStyle = sh; g.fillRect(x - w / 2, top, w, s * 0.04); }
  else if (kind === 'bed') { const w = s, h = s * 0.32, fc = o.frame || '#3E9BE8', blanket = c2 || '#E9E2FB', ft = s * 0.035;
    for (const e of [-1, 1]) { g.fillStyle = fc; rr(g, x + e * (w / 2 - ft / 2) - ft / 2, y - h * (e < 0 ? 1.55 : 1.1), ft, h * (e < 0 ? 1.45 : 1.0), ft / 2); g.fill(); }
    g.fillStyle = shadeOf(fc); g.fillRect(x - w / 2, y - h * 0.62, w, h * 0.12);
    g.fillStyle = '#FFFFFF'; rr(g, x - w * 0.47, y - h * 0.95, w * 0.94, h * 0.36, h * 0.12); g.fill();
    g.fillStyle = tone('#FFFFFF', -8); rr(g, x - w * 0.47, y - h * 0.7, w * 0.94, h * 0.1, h * 0.05); g.fill();
    g.fillStyle = '#FFFFFF'; rr(g, x - w * 0.46, y - h * 1.18, w * 0.2, h * 0.32, h * 0.14); g.fill(); g.fillStyle = tone('#FFFFFF', -6, 280, 1); rr(g, x - w * 0.46, y - h * 0.96, w * 0.2, h * 0.08, h * 0.04); g.fill();
    g.fillStyle = blanket; rr(g, x - w * 0.2, y - h * 1.0, w * 0.67, h * 0.4, h * 0.14); g.fill(); g.fillStyle = shadeOf(blanket); rr(g, x - w * 0.2, y - h * 0.72, w * 0.67, h * 0.12, h * 0.06); g.fill();
    g.fillStyle = lightOf(blanket); rr(g, x - w * 0.24, y - h * 1.02, w * 0.1, h * 0.4, h * 0.05); g.fill();
    g.fillStyle = shadeOf(fc, 1.4); for (const e of [-0.4, 0.4]) { g.fillRect(x + e * w - ft * 0.3, y - h * 0.5, ft * 0.6, h * 0.36); ell(g, x + e * w, y - h * 0.1, h * 0.12, h * 0.12); g.fill(); } }
  else if (kind === 'drawers') { const w = s, h = s, n = o.n || 2; g.fillStyle = sh; rr(g, x - w / 2, y - h, w, h * 0.92, w * 0.05); g.fill(); g.fillStyle = col; rr(g, x - w / 2, y - h, w * 0.92, h * 0.88, w * 0.05); g.fill();
    g.fillStyle = li; g.fillRect(x - w / 2 + w * 0.04, y - h, w * 0.84, h * 0.04);
    for (let i = 0; i < n; i++) { const dy = y - h + h * 0.1 + i * h * 0.78 / n; g.fillStyle = tone(col, 6); rr(g, x - w * 0.42, dy, w * 0.76, h * 0.78 / n - h * 0.05, w * 0.03); g.fill(); g.fillStyle = sh; rr(g, x - w * 0.1, dy + h * 0.39 / n - h * 0.05, w * 0.16, h * 0.05, h * 0.025); g.fill(); }
    if (o.wheels !== false) { g.fillStyle = shadeOf(col, 1.8); for (const e of [-0.32, 0.28]) { ell(g, x + e * w, y - w * 0.05, w * 0.06, w * 0.06); g.fill(); } } }
  else if (kind === 'bookshelf') { const w = s, h = s * (o.tall ?? 1.4), rows = o.rows || 4, books = o.books || ['#FF8A2B', '#FFD23F', '#2BB3FF', '#FF4F7B', '#7CE05A', '#F4F1E8'], fw = w * 0.05, rh = (h - fw * 2) / rows;
    g.fillStyle = col; g.fillRect(x - w / 2, y - h, w, h); g.fillStyle = sh; g.fillRect(x - w / 2 + fw, y - h + fw, w - 2 * fw, h - 2 * fw);
    for (let r = 0; r < rows; r++) { const by = y - h + fw + (r + 1) * rh; let bx = x - w / 2 + fw * 1.4;
      while (bx < x + w / 2 - w * 0.14) { const bw = w * lerp(0.05, 0.1, R()), bh = rh * lerp(0.62, 0.86, R()); g.fillStyle = books[Math.floor(R() * books.length)];
        if (R() < 0.08) { g.save(); g.translate(bx, by); g.rotate(0.3); g.fillRect(0, -bh, bw, bh); g.restore(); bx += bh * 0.3 + bw; } else { g.fillRect(bx, by - bh, bw, bh); g.fillStyle = rgba('#FFFFFF', 0.35); g.fillRect(bx + bw * 0.2, by - bh * 0.85, bw * 0.6, bh * 0.08); bx += bw + w * 0.006; } }
      g.fillStyle = col; g.fillRect(x - w / 2, by - fw * 0.4, w, fw * 0.8); } }
  else if (kind === 'plant') { const pot = col, leaf = c2 || '#22B573', ph = s * 0.55;
    for (let i = 0; i < 7; i++) { const a = lerp(-1.1, 1.1, i / 6) + (R() - 0.5) * 0.2, L = s * lerp(0.7, 1.05, R()); g.save(); g.translate(x, y - ph * 0.9); g.rotate(a); g.fillStyle = i % 2 ? leaf : shadeOf(leaf); ell(g, 0, -L / 2, s * 0.13, L / 2); g.fill(); g.restore(); }
    g.fillStyle = pot; g.beginPath(); g.moveTo(x - s * 0.32, y - ph); g.lineTo(x + s * 0.32, y - ph); g.lineTo(x + s * 0.24, y); g.lineTo(x - s * 0.24, y); g.closePath(); g.fill();
    g.fillStyle = shadeOf(pot); g.fillRect(x - s * 0.36, y - ph - s * 0.02, s * 0.72, s * 0.1); }
  else if (kind === 'lamp') { const hy = y - s * 2.6; glow(g, x, hy + s * 0.4, s * 1.8, o.light || '#FFD27A', 0.45 + (o.t != null ? Math.sin(o.t * 7) * 0.02 : 0));
    cap(g, x, y, x, hy + s * 0.3, s * 0.06, shadeOf(col, 1.5)); g.fillStyle = shadeOf(col, 1.5); ell(g, x, y - s * 0.02, s * 0.25, s * 0.05); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 0.22, hy); g.lineTo(x + s * 0.22, hy); g.lineTo(x + s * 0.4, hy + s * 0.42); g.lineTo(x - s * 0.4, hy + s * 0.42); g.closePath(); g.fill();
    g.fillStyle = lightOf(col, 1.4); ell(g, x, hy + s * 0.42, s * 0.4, s * 0.06); g.fill(); }
  else if (kind === 'monitor') { const w = s, h = s * 0.62, top = y - h - s * 0.28, b = w * 0.04; g.fillStyle = sh; g.fillRect(x - s * 0.04, top + h, s * 0.08, s * 0.24); rr(g, x - s * 0.2, y - s * 0.05, s * 0.4, s * 0.05, s * 0.02); g.fill();
    g.fillStyle = col; rr(g, x - w / 2, top, w, h, w * 0.04); g.fill(); g.save(); rr(g, x - w / 2 + b, top + b, w - 2 * b, h - 2 * b, w * 0.015); g.clip();
    g.fillStyle = o.scr || '#0E1B4A'; g.fillRect(x - w / 2, top, w, h); if (o.screen) o.screen(g, x, top + h / 2, w - 2 * b, h - 2 * b);
    g.fillStyle = rgba('#FFFFFF', 0.07); g.beginPath(); g.moveTo(x - w / 2, top); g.lineTo(x - w * 0.1, top); g.lineTo(x - w * 0.35, top + h); g.lineTo(x - w / 2, top + h); g.closePath(); g.fill(); g.restore(); }
  else if (kind === 'console') { const w = s, h = s * 0.5, d = s * 0.22, top = y - h, lc = o.lights || ['#FF4F6E', '#FFD23F', '#3FE0C8', '#7A8CFF'], t = o.t || 0; g.fillStyle = sh; g.fillRect(x - w / 2, top, w, h);
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w / 2 + d * 0.3, top - d); g.lineTo(x + w / 2 - d * 0.3, top - d); g.lineTo(x + w / 2, top); g.lineTo(x - w / 2, top); g.closePath(); g.fill();
    for (let i = 0; i < 9; i++) { const bx = lerp(x - w * 0.42, x + w * 0.42, (i + 0.5) / 9), c = lc[i % lc.length], on = Math.sin(t * 3 + i * 2.1) > -0.6; g.fillStyle = on ? c : shadeOf(c, 1.4); if (i % 3 === 1) rr(g, bx - w * 0.03, top - d * 0.8, w * 0.06, d * 0.2, d * 0.05); else ell(g, bx, top - d * 0.7, w * 0.022, d * 0.1); g.fill(); }
    for (let i = 0; i < 4; i++) { const bx = lerp(x - w * 0.3, x + w * 0.3, i / 3), ky = top - d * (0.42 - (Math.sin(t * 1.3 + i) + 1) * 0.08); g.fillStyle = shadeOf(col, 1.4); g.fillRect(bx - w * 0.005, top - d * 0.45, w * 0.01, d * 0.32); g.fillStyle = '#FFFFFF'; rr(g, bx - w * 0.025, ky - d * 0.04, w * 0.05, d * 0.08, 3); g.fill(); }
    g.fillStyle = li; g.fillRect(x - w / 2, top, w, s * 0.012); }
  else if (kind === 'pedestal') { const w = s, h = s * 0.2, k = w * 0.2, ty = y - h - k * 0.7, T = [[x - w / 2, ty], [x - w / 2 + k, ty - k * 0.7], [x + w / 2 - k, ty - k * 0.7], [x + w / 2, ty], [x + w / 2 - k, ty + k * 0.7], [x - w / 2 + k, ty + k * 0.7]];
    const poly = P => { g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); }, dn = p => [p[0], p[1] + h];
    if (o.spot) { const gr = g.createLinearGradient(0, ty - H, 0, ty); gr.addColorStop(0, rgba(o.spot, 0)); gr.addColorStop(1, rgba(o.spot, 0.5)); g.fillStyle = gr; g.beginPath(); g.moveTo(x - w * 0.28, ty - H); g.lineTo(x + w * 0.28, ty - H); g.lineTo(x + w * 0.62, ty); g.lineTo(x - w * 0.62, ty); g.closePath(); g.fill(); }
    g.fillStyle = shadeOf(col, 0.5); poly([T[0], T[5], dn(T[5]), dn(T[0])]); g.fillStyle = shadeOf(col, 0.9); poly([T[5], T[4], dn(T[4]), dn(T[5])]); g.fillStyle = shadeOf(col, 1.5); poly([T[4], T[3], dn(T[3]), dn(T[4])]);
    g.fillStyle = col; poly(T); g.fillStyle = o.ring || tone(col, -14, -20, 1.4); ell(g, x, ty, w * 0.22, k * 0.3); g.fill(); }
  g.restore(); }
// COLOUR FIELDS, the most used setting (854 of 3,868 inventoried shots, all measured): one hero object or character, big and centred,
// on ONE saturated colour: flat in 37 %, a soft vertical gradient (4-15 L) in 31 %, a strong one (15+ L, either way) in 31 %, with a
// hue turn of 25+ degrees in a third (violet to cyan, mint to yellow). Light fields: pale saturated cyans, mints, lilacs, yellows;
// dark ones (40 %): near-black navy and deep purple. Often a floor disc under the hero, a slow sunburst, or diagonal streaks.
// heroField(g, col, o): o.to (the bottom colour) or o.dl / o.dh (move it in LCh), o.floor = [x, y, rx] (a disc the hero stands on,
// o.floorCol), o.burst = n rays (o.bx, o.by, turning with o.t), o.streaks = n (o.ang degrees, flowing with o.t), o.vig.
function heroField(g, col, o = {}) { const to = o.to || (o.dl || o.dh ? tone(col, o.dl || 0, o.dh || 0) : col), t = o.t || 0;
  bg(g, col, to, { end: 1, vig: o.vig });
  if (o.burst) { g.save(); g.globalAlpha = o.burstA ?? 0.55; rays(g, o.bx ?? W / 2, o.by ?? H * 0.45, o.burst, H * 1.2, tone(col, lch(col)[0] > 60 ? -6 : 7), 1, t * 0.08, 0.5); g.restore(); }
  if (o.streaks) { const R = rng(o.seed || 11), a = (o.ang ?? -20) * D2R, span = W * 2.2; g.save(); g.translate(W / 2, H / 2); g.rotate(a);
    for (let i = 0; i < o.streaks; i++) { const y = (R() - 0.5) * H * 1.3, len = lerp(200, 700, R()), x = ((R() * span + t * lerp(600, 1400, R())) % span + span) % span - span / 2; g.fillStyle = rgba(tone(col, 12), lerp(0.25, 0.6, R())); rr(g, x - len, y, len, lerp(4, 10, R()), 5); g.fill(); } g.restore(); }
  if (o.floor) { const [fx, fy, frx] = o.floor; g.fillStyle = o.floorCol || tone(to, lch(to)[0] > 70 ? -8 : 12, 0, 0.8); ell(g, fx, fy, frx, frx * 0.22); g.fill(); } }
// DEEP SPACE (black-hole-or-galaxy: 80 shots). galaxy(g, x, y, r, o): a spiral seen at an angle (o.tilt = height / width, 0.42; o.rot),
// coloured from the core out (o.cols: white-yellow core, orange, hot pink, violet rim; pass a cool set for a second galaxy), made of
// broken bands (arcs with gaps: the arms) and specks along them over a bloom; o.t turns it slowly (inner bands faster).
function galaxy(g, x, y, r, o = {}) { const cols = o.cols || ['#FFF4CF', '#FFC23D', '#FF7A2E', '#FF3C8E', '#B33CFF', '#5B3CFF'], tilt = o.tilt ?? 0.42, R = rng(o.seed || 21), t = o.t || 0, n = o.bands || 14, cAt = u => cols[Math.min(cols.length - 1, Math.floor(u * cols.length))];
  g.save(); g.translate(x, y); g.rotate(o.rot ?? -0.35); g.scale(1, tilt); bloom(g, 0, 0, r * 0.4, cols[3], { k: 1.3 }); g.lineCap = 'round';
  for (let i = n - 1; i >= 0; i--) { const u = (i + 1) / n, w = r / n * lerp(0.9, 0.6, u), segs = 2 + Math.floor(R() * 2);
    for (let k = 0; k < segs; k++) { const a0 = R() * Math.PI * 2 + t * (0.25 / (u + 0.2)) + u * 3.2, len = lerp(1.2, 2.6, R()); g.strokeStyle = cAt(u); g.globalAlpha = lerp(0.75, 1, R()); g.lineWidth = w; g.beginPath(); g.arc(0, 0, r * u, a0, a0 + len); g.stroke(); } }
  g.globalAlpha = 1;
  for (let i = 0; i < (o.specks ?? 60); i++) { const u = Math.sqrt(R()) * 1.08, a = R() * Math.PI * 2 + t * 0.2 / (u + 0.2), sz = lerp(3, 8, R()); g.fillStyle = R() < 0.3 ? '#FFFFFF' : lightOf(cAt(Math.min(1, u)), 1.3); ell(g, Math.cos(a) * r * u, Math.sin(a) * r * u, sz, sz); g.fill(); }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.3); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.35, cols[0]); gr.addColorStop(1, rgba(cols[1], 0)); g.fillStyle = gr; ell(g, 0, 0, r * 0.3, r * 0.3); g.fill();
  g.restore(); }
// blackHole(g, x, y, r, o): a black disc (r) in a thin white photon ring; a tilted accretion disc (o.tilt 0.28, out to o.disc x r) whose
// far half passes behind the hole and bends up over its top (the lensing arc) and whose near half crosses in front; banded white-hot
// inside to yellow, orange, red outside (o.cols), over an orange / magenta glow. o.rot tilts it all.
function blackHole(g, x, y, r, o = {}) { const cols = o.cols || ['#FFFFFF', '#FFF0A8', '#FFC23D', '#FF7A2E', '#E8304A'], tilt = o.tilt ?? 0.28, R1 = r * 1.25, R2 = r * (o.disc ?? 2.3), m = cols.length;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); glow(g, 0, 0, R2 * 1.5, cols[m - 2], 0.35); glow(g, 0, 0, R2 * 1.1, o.glow || '#FF3CAC', 0.18);
  const disc = (a0, a1) => { for (let i = m - 1; i >= 0; i--) { const q = lerp(R1, R2, (i + 1) / m); g.fillStyle = cols[i]; g.beginPath(); g.ellipse(0, 0, q, q * tilt, 0, a0, a1); g.ellipse(0, 0, R1 * 0.98, R1 * 0.98 * tilt, 0, a1, a0, true); g.closePath(); g.fill(); } };
  disc(Math.PI, Math.PI * 2);
  for (let i = m - 1; i >= 0; i--) { const q = lerp(r * 1.04, r * 1.45, (i + 1) / m); g.fillStyle = cols[i]; g.beginPath(); g.arc(0, 0, q, Math.PI, Math.PI * 2); g.arc(0, 0, r * 1.02, Math.PI * 2, Math.PI, true); g.closePath(); g.fill(); }
  g.fillStyle = o.hole || '#000000'; ell(g, 0, 0, r, r); g.fill(); g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(3, r * 0.025); ell(g, 0, 0, r * 1.02, r * 1.02); g.stroke();
  disc(0, Math.PI); g.restore(); }
// flare(g, x, y, r, o): a star flare (galaxy cores, collisions, a star being born): a white core, a tinted bloom (o.col) and o.n (6)
// long thin tapered rays of different lengths (the longest ~3 r); o.rot, o.seed, o.t (a slow shimmer).
function flare(g, x, y, r, o = {}) { const n = o.n || 6, col = o.col || '#FFE6A8', R = rng(o.seed || 5), t = o.t || 0;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.globalCompositeOperation = 'screen'; glow(g, 0, 0, r * 2.2, col, 0.5);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (R() - 0.5) * 0.5, L = r * lerp(1.2, 3.2, R()) * (1 + Math.sin(t * 2 + i) * 0.05), w = r * lerp(0.04, 0.08, R());
    g.save(); g.rotate(a); const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, rgba('#FFFFFF', 0.95)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -w); g.lineTo(L, 0); g.lineTo(0, w); g.closePath(); g.fill(); g.restore(); }
  g.fillStyle = '#FFFFFF'; ell(g, 0, 0, r * 0.35, r * 0.35); g.fill(); g.restore(); }
// MAPS (map-or-globe: 71 shots): blobby smoothed continents (no borders unless the story needs one) on a flat sea, a lighter shallow-water
// halo round every coast, land in CONTOUR BANDS parallel to the coast (green coast, yellow, orange core: an elevation look), white ice,
// sometimes pixelated. LAND = coarse continent outlines in [lon, lat] (0 North America, 1 Greenland, 2 Antarctica, 3 South America,
// 4 Eurasia, 5 Africa, 6 Australia, then islands).
const LAND = [
  [[-168, 66], [-162, 70], [-150, 71], [-140, 70], [-128, 70], [-115, 68], [-100, 68], [-95, 72], [-85, 70], [-80, 63], [-90, 58], [-94, 60], [-82, 52], [-78, 55], [-76, 62], [-70, 61], [-64, 60], [-61, 56], [-56, 52], [-60, 47], [-66, 45], [-70, 42], [-74, 40], [-76, 35], [-81, 31], [-80, 26], [-82, 25], [-83, 29], [-90, 30], [-97, 27], [-97, 22], [-92, 18], [-87, 21], [-88, 16], [-83, 15], [-83, 10], [-79, 9], [-80, 7], [-85, 10], [-92, 14], [-105, 20], [-110, 24], [-114, 31], [-117, 32], [-121, 35], [-124, 40], [-124, 46], [-125, 50], [-132, 55], [-140, 60], [-150, 60], [-158, 57], [-165, 55], [-160, 59], [-166, 62]],
  [[-73, 78], [-60, 82], [-30, 83], [-20, 80], [-20, 72], [-30, 68], [-42, 60], [-48, 61], [-53, 66], [-56, 72], [-68, 76]],
  [[-180, -78], [-150, -76], [-120, -73], [-90, -72], [-60, -64], [-58, -66], [-30, -74], [0, -70], [30, -69], [60, -67], [90, -66], [120, -66], [150, -69], [180, -78], [180, -90], [-180, -90]],
  [[-80, 8], [-77, 9], [-72, 12], [-63, 11], [-60, 8], [-52, 5], [-50, 0], [-44, -2], [-35, -5], [-35, -9], [-39, -14], [-40, -22], [-48, -26], [-53, -34], [-58, -38], [-62, -40], [-65, -45], [-68, -50], [-69, -55], [-74, -52], [-74, -45], [-73, -37], [-71, -30], [-70, -18], [-76, -14], [-81, -6], [-80, -2], [-78, 2]],
  [[-9, 43], [-9, 37], [-6, 36], [-2, 37], [0, 39], [3, 42], [6, 43], [9, 44], [12, 44], [16, 41], [18, 40], [16, 38], [15, 40], [13, 42], [14, 45], [19, 42], [20, 40], [22, 37], [24, 38], [26, 40], [27, 38], [30, 36], [36, 36], [35, 33], [34, 31], [35, 28], [39, 22], [43, 13], [45, 13], [52, 16], [57, 19], [59, 22], [56, 26], [51, 24], [48, 29], [50, 30], [56, 27], [62, 25], [67, 24], [73, 21], [77, 8], [80, 13], [80, 16], [87, 21], [91, 22], [94, 17], [98, 16], [98, 8], [101, 3], [104, 1], [103, 6], [100, 13], [103, 11], [105, 9], [109, 12], [108, 17], [106, 20], [110, 21], [117, 23], [121, 28], [122, 31], [119, 35], [122, 37], [118, 38], [121, 40], [125, 40], [127, 35], [129, 35], [130, 42], [136, 44], [141, 48], [140, 53], [135, 55], [143, 59], [150, 59], [156, 58], [160, 61], [163, 60], [178, 62], [180, 65], [180, 69], [170, 70], [160, 70], [150, 72], [140, 73], [130, 71], [120, 73], [113, 74], [105, 78], [100, 76], [90, 76], [80, 73], [73, 69], [67, 69], [60, 69], [54, 69], [44, 68], [40, 66], [38, 67], [40, 68], [33, 70], [28, 71], [20, 70], [14, 67], [12, 64], [6, 62], [5, 59], [8, 58], [11, 59], [12, 56], [10, 55], [8, 54], [4, 52], [2, 51], [-2, 48], [-5, 48], [-2, 46], [-1, 44]],
  [[-17, 21], [-16, 28], [-10, 30], [-6, 36], [0, 36], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [34, 28], [38, 18], [43, 12], [51, 12], [50, 8], [40, -3], [39, -10], [40, -15], [35, -22], [33, -26], [28, -33], [20, -35], [18, -32], [12, -17], [12, -6], [9, -1], [9, 4], [3, 6], [-8, 4], [-13, 8], [-17, 13]],
  [[113, -22], [115, -34], [118, -35], [124, -33], [131, -31], [138, -35], [141, -38], [147, -38], [150, -37], [153, -31], [153, -25], [146, -19], [142, -11], [141, -17], [136, -12], [131, -11], [126, -14], [122, -18]],
  [[-5, 50], [1, 51], [2, 53], [-2, 56], [-2, 58], [-5, 58], [-6, 56], [-3, 54], [-5, 52]],
  [[-10, 52], [-6, 52], [-6, 55], [-8, 55], [-10, 54]],
  [[130, 31], [132, 34], [135, 34], [140, 35], [141, 38], [142, 41], [141, 45], [140, 42], [139, 38], [136, 36], [133, 35], [130, 34]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
  [[95, 5], [98, 4], [104, -3], [106, -6], [101, -3], [96, 3]],
  [[109, 1], [111, -3], [116, -4], [119, 1], [117, 7], [113, 3]],
  [[131, -1], [138, -2], [146, -6], [150, -10], [142, -9], [138, -8], [134, -4]],
  [[106, -6], [114, -7], [114, -8.5], [106, -7]],
  [[172, -34], [178, -38], [175, -41], [171, -46], [167, -46], [172, -41]],
  [[-24, 64], [-22, 66], [-15, 66.5], [-13, 65], [-18, 63.5]],
  [[120, 18], [122, 18], [126, 7], [122, 7]]];
const _MAPC = {};
const _dense = (pts, step) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step)); for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); } return out; };
function _landPath(g, P) { g.beginPath(); for (const pts of P) if (pts.length > 2) spline(g, pts, 1, true); }
function _landDraw(g, P, o, s) { const bands = o.bands || ['#2FD35C', '#FFE14D', '#FF9F2E'], bw = o.bandW || [26 * s, 14 * s], halo = o.halo ?? '#7FE9FF';
  g.save(); g.lineJoin = 'round';
  if (halo) { g.strokeStyle = halo; g.lineWidth = (o.haloW ?? 18) * s; _landPath(g, P); g.stroke(); }
  _landPath(g, P); g.fillStyle = bands[bands.length - 1]; g.fill(); g.clip();
  for (let i = bands.length - 2; i >= 0; i--) { let ws = 0; for (let k = 0; k <= i; k++) ws += bw[k] ?? bw[bw.length - 1]; g.strokeStyle = bands[i]; g.lineWidth = ws * 2; _landPath(g, P); g.stroke(); }
  g.restore(); }
// worldMap(g, x, y, w, o): the world (equirectangular), centred at (x, y), height w / 2. o.sea (false = transparent), o.halo (shallow
// colour, false = none; o.haloW), o.bands = colours from the coast inward (o.bandW their widths at w = 1000), o.ice (white Greenland and
// Antarctica), o.frame (true = a white card round it, or a colour, with a hard drop shadow), o.pixel = cell size for the pixel-map look,
// o.only = LAND indices to draw.
function worldMap(g, x, y, w, o = {}) { const h = w / 2, idx = o.only || LAND.map((_, i) => i), cell = o.pixel || 0, s = w / 1000;
  if (o.frame) { const fc = o.frame === true ? '#FFFFFF' : o.frame, p = w * 0.03; g.fillStyle = rgba('#000000', 0.18); rr(g, x - w / 2 - p + w * 0.012, y - h / 2 - p + w * 0.018, w + 2 * p, h + 2 * p, w * 0.02); g.fill(); g.fillStyle = fc; rr(g, x - w / 2 - p, y - h / 2 - p, w + 2 * p, h + 2 * p, w * 0.02); g.fill(); }
  const draw = (gg, pr, k) => { const P = [], I = []; for (const i of idx) (o.ice && (i === 1 || i === 2) ? I : P).push(LAND[i].map(q => pr(q[0], q[1])));
    if (o.sea !== false) { const a = pr(-180, 90), b = pr(180, -90); gg.fillStyle = o.sea || '#2156E8'; gg.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }
    _landDraw(gg, P, o, k); if (I.length) _landDraw(gg, I, { ...o, bands: ['#FFFFFF', '#CFEFFF'], bandW: [8 * k] }, k); };
  if (!cell) { g.save(); g.beginPath(); g.rect(x - w / 2, y - h / 2, w, h); g.clip(); draw(g, (lon, lat) => [x - w / 2 + (lon + 180) / 360 * w, y - h / 2 + (90 - lat) / 180 * h], s); g.restore(); return; }
  const cw = Math.ceil(w / cell), ch = Math.ceil(h / cell), key = cw + 'x' + ch, c = _MAPC[key] || (_MAPC[key] = new OffscreenCanvas(cw, ch)), cg = c.getContext('2d'); cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, cw, ch);
  draw(cg, (lon, lat) => [(lon + 180) / 360 * cw, (90 - lat) / 180 * ch], s / cell);
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(c, x - w / 2, y - h / 2, cw * cell, ch * cell); g.restore(); }
// globe(g, x, y, r, o): the same land on a sphere (orthographic): o.lon / o.lat = the point facing the camera (o.spin degrees a second
// with o.t), the sea o.sea, bands / halo / ice as worldMap, a night crescent away from o.light (degrees; o.night colour, false = none),
// an atmosphere bloom (o.glow colour, false = none).
function globe(g, x, y, r, o = {}) { const lon0 = (o.lon ?? 10) + (o.t || 0) * (o.spin ?? 8), p0 = (o.lat ?? 15) * D2R, s = r / 300;
  const vis = (lo, la) => { const l = (lo - lon0) * D2R, p = la * D2R; return Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l); };
  const pr = (lo, la) => { const l = (lo - lon0) * D2R, p = la * D2R, cx = Math.cos(p) * Math.sin(l), cy = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l); if (vis(lo, la) >= 0) return [x + cx * r, y - cy * r]; const m = Math.hypot(cx, cy) || 1; return [x + cx / m * r * 1.04, y - cy / m * r * 1.04]; };
  if (o.glow !== false) bloom(g, x, y, r, o.glow || '#7FD8FF', { k: 0.9 });
  g.save(); ell(g, x, y, r, r); g.clip(); g.fillStyle = o.sea || '#2156E8'; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  const P = [], I = []; LAND.forEach((pts, i) => { const D = _dense(pts, 4); if (D.some(q => vis(q[0], q[1]) > 0)) (o.ice !== false && (i === 1 || i === 2) ? I : P).push(D.map(q => pr(q[0], q[1]))); });
  _landDraw(g, P, o, s); if (I.length) _landDraw(g, I, { ...o, bands: ['#FFFFFF', '#CFEFFF'], bandW: [8 * s] }, s);
  if (o.night !== false) { const la = (o.light ?? 135) * D2R; g.fillStyle = rgba(o.night || '#1A0F5C', 0.45); g.beginPath(); g.arc(x, y, r * 1.01, 0, Math.PI * 2); g.arc(x + Math.cos(la) * r * 0.3, y - Math.sin(la) * r * 0.3, r * 1.02, 0, Math.PI * 2); g.fill('evenodd'); }
  g.restore(); }
// CELLS AND BODIES (cell-or-molecular 80 shots, inside-body 79). neurons(g, seed, o): a nerve network on a dark field: star-shaped cell
// bodies (a soma with 5 tapering arms and a ringed nucleus) joined by thick curving tubes, each with a dashed glowing core that flows
// with o.t; o.cols (cyan, teal, blue, violet: measured), o.n bodies (6, zig-zagging down the frame), o.w tube width (52).
function neurons(g, seed, o = {}) { const R = rng(seed), n = o.n || 6, cols = o.cols || ['#29D3FF', '#3CF0B4', '#4C6BFF', '#C23CFF', '#2EA8FF'], w = o.w || 52, t = o.t || 0, S = [];
  for (let i = 0; i < n; i++) S.push([W * ((i % 2) ? 0.7 : 0.28) + (R() - 0.5) * W * 0.3, H * (i + 0.5) / n + (R() - 0.5) * H * 0.08, cols[i % cols.length]]);
  const tube = (a, b, c, k) => { const mx = (a[0] + b[0]) / 2 + (R() - 0.5) * 500, my = (a[1] + b[1]) / 2 + (R() - 0.5) * 500; g.save(); g.lineCap = 'round'; g.strokeStyle = shadeOf(c, 1.3); g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(mx, my, b[0], b[1]); g.stroke();
    g.strokeStyle = c; g.lineWidth = w * 0.5; g.setLineDash([w * 1.4, w * 0.9]); g.lineDashOffset = -t * 160 * k; g.stroke(); g.restore(); };
  for (let i = 0; i < n; i++) for (const j of [(i + 1) % n, (i + 2) % n]) tube(S[i], S[j], S[i][2], j > i ? 1 : -1);
  for (let i = 0; i < 6; i++) { const a = S[Math.floor(R() * n)], ang = R() * Math.PI * 2; tube(a, [a[0] + Math.cos(ang) * 1400, a[1] + Math.sin(ang) * 1400], a[2], 1); }
  for (const [x, y, c] of S) { const r = w * 1.6; g.fillStyle = c; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + x; g.moveTo(x, y); g.lineTo(x + Math.cos(a - 0.35) * r, y + Math.sin(a - 0.35) * r); g.lineTo(x + Math.cos(a) * r * 2.2, y + Math.sin(a) * r * 2.2); g.lineTo(x + Math.cos(a + 0.35) * r, y + Math.sin(a + 0.35) * r); g.closePath(); } g.fill(); ell(g, x, y, r * 1.1, r * 1.1); g.fill();
    g.fillStyle = shadeOf(c, 1.4); ell(g, x, y, r * 0.55, r * 0.55); g.fill(); g.fillStyle = lightOf(c, 1.2); ell(g, x - r * 0.1, y - r * 0.1, r * 0.3, r * 0.3); g.fill(); } }
// virus(g, x, y, r, o): a virion: club-tipped spikes all round (o.spikes 16, o.spike colour), a dark shell (o.shell), an inner ring of
// small arcs (o.ring), a coiled genome loop in the middle (o.core); o.t turns it and wobbles the spikes.
function virus(g, x, y, r, o = {}) { const n = o.spikes || 16, sc = o.spike || '#E8205E', shell = o.shell || '#3A0F6E', core = o.core || '#C8F03C', t = o.t || 0;
  g.save(); g.translate(x, y); g.rotate(t * 0.15);
  for (let i = 0; i < n; i++) { g.save(); g.rotate(i / n * Math.PI * 2 + Math.sin(t * 3 + i) * 0.04); g.fillStyle = sc; g.fillRect(-r * 0.05, -r * 1.25, r * 0.1, r * 0.35); ell(g, 0, -r * 1.3, r * 0.13, r * 0.13); g.fill(); g.restore(); }
  g.fillStyle = shell; ell(g, 0, 0, r, r); g.fill(); g.fillStyle = shadeOf(shell, 1.2); ell(g, r * 0.06, r * 0.06, r * 0.86, r * 0.86); g.fill();
  g.strokeStyle = o.ring || '#F2B33D'; g.lineWidth = r * 0.06; g.lineCap = 'round'; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.08, a, a + Math.PI); g.stroke(); }
  g.strokeStyle = core; g.lineWidth = r * 0.07; g.beginPath(); for (let k = 0; k <= 120; k++) { const a = k / 120 * Math.PI * 2, q = r * (0.36 + 0.14 * Math.sin(a * 11 + t)); if (k) g.lineTo(Math.cos(a) * q, Math.sin(a) * q); else g.moveTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.stroke();
  g.restore(); }
// chromo(g, x, y, s, o): an X chromosome: two crossed rounded arms (o.col) with lighter end caps (o.cap), a coiled DNA thread running
// through each arm (o.dna, coiling with o.t); o.rot.
function chromo(g, x, y, s, o = {}) { const col = o.col || '#D21FD8', dna = o.dna || '#FFB13D', cp = o.cap || '#8FE3E8', t = o.t || 0, L = s * 0.62, w = s * 0.2;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0);
  for (const e of [-1, 1]) { g.save(); g.rotate(e * 0.42); g.fillStyle = cp; rr(g, -w, -L, w * 2, L * 2, w); g.fill(); g.fillStyle = col; rr(g, -w, -L + w * 0.55, w * 2, L * 2 - w * 1.1, w * 0.7); g.fill();
    g.strokeStyle = dna; g.lineWidth = s * 0.022; g.beginPath(); for (let k = 0; k <= 80; k++) { const v = lerp(-L * 0.9, L * 0.9, k / 80), u = Math.sin(k * 0.9 + t * 2 + e) * w * 0.55; if (k) g.lineTo(u, v); else g.moveTo(u, v); } g.stroke(); g.restore(); }
  g.restore(); }
// xray(g, clip, inside, o): the see-through body look (x-ray / cross-section shots): clip(g) builds the region's path; it gets a light
// translucent wash (o.wash, o.a 0.55) and inside(g) draws the bones / organs / veins on top, all clipped to the region.
function xray(g, clip, inside, o = {}) { g.save(); clip(g); g.clip(); g.fillStyle = rgba(o.wash || '#FFB3C7', o.a ?? 0.55); g.fillRect(-W, -H, 3 * W, 3 * H); if (inside) inside(g); g.restore(); }
// heat(g, x, y, r, o): a thermal-camera blob (red core, orange, yellow, green, cyan, blue edge), clipped by o.clip(g) or to a disc; o.frame
// = [x, y, w, h] adds the camera frame: a neon rounded rectangle (o.frameCol) with ruler ticks (o.tick) on its left and bottom edges.
function heat(g, x, y, r, o = {}) { g.save(); if (o.clip) o.clip(g); else ell(g, x, y, r, r); g.clip(); const gr = g.createRadialGradient(x, y, 0, x, y, r);
  [['#FF2A1A', 0], ['#FF7A1A', 0.25], ['#FFE14D', 0.45], ['#3FE05A', 0.65], ['#22C8FF', 0.82], ['#2546E8', 1]].forEach(([c, k]) => gr.addColorStop(k, c)); g.fillStyle = gr; g.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3); g.restore();
  if (o.frame) { const [fx, fy, fw, fh] = o.frame, tc = o.tick || '#2B7BFF'; g.save(); g.strokeStyle = o.frameCol || '#22F04A'; g.lineWidth = fw * 0.025; rr(g, fx, fy, fw, fh, fw * 0.08); g.stroke();
    for (let i = 0; i <= 12; i++) { const ty = fy + fh * 0.12 + i * fh * 0.62 / 12, tx = fx + fw * 0.2 + i * fw * 0.62 / 12; cap(g, fx + fw * 0.07, ty, fx + fw * (i % 4 ? 0.1 : 0.14), ty, fw * 0.012, tc); cap(g, tx, fy + fh * 0.93, tx, fy + fh * (i % 4 ? 0.9 : 0.86), fw * 0.012, tc); } g.restore(); } }
// PAPER AND DATA DEVICES. paper(g, x, y, w, h, o): a sheet (a study, a document, a patent, a blueprint): o.rot, a hard flat drop
// shadow down-right (the channel's 'drop-shadow' depth: 156 tags; o.shadow colour, false = none), o.fold (a folded top-right corner),
// o.title, o.lines (rows of text bars, true = 6; o.linesAt), o.blue (blueprint: blue sheet, fine white grid, inner border),
// o.inside(g, w, h) draws on it in its own frame (origin top left).
function paper(g, x, y, w, h, o = {}) { const col = o.col || (o.blue ? '#6C86F0' : '#F7FBFF'), ink = o.blue ? rgba('#FFFFFF', 0.55) : (o.ink || '#BCD3E6'), f = o.fold ? w * 0.12 : 0;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.translate(-w / 2, -h / 2);
  const path = gg => { gg.beginPath(); gg.moveTo(0, 0); gg.lineTo(w - f, 0); gg.lineTo(w, f); gg.lineTo(w, h); gg.lineTo(0, h); gg.closePath(); };
  if (o.shadow !== false) { g.save(); g.translate(w * 0.04, w * 0.05); path(g); g.fillStyle = o.shadow || rgba('#000000', 0.22); g.fill(); g.restore(); }
  path(g); g.fillStyle = col; g.fill(); g.save(); path(g); g.clip();
  if (o.blue) { g.strokeStyle = rgba('#FFFFFF', 0.18); g.lineWidth = 2; for (let gx = w * 0.06; gx < w; gx += w * 0.06) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, h); g.stroke(); } for (let gy = w * 0.06; gy < h; gy += w * 0.06) { g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke(); } g.strokeStyle = rgba('#FFFFFF', 0.5); g.lineWidth = 3; g.strokeRect(w * 0.05, w * 0.05, w * 0.9, h - w * 0.1); }
  if (o.title) txt(g, o.title, w * 0.5, w * 0.16, { size: w * 0.09, font: 'H', col: o.blue ? rgba('#FFFFFF', 0.8) : (o.titleCol || '#2B3A8F'), maxW: w * 0.8 });
  if (o.inside) o.inside(g, w, h);
  if (o.lines) { const R = rng(o.seed || 4), rows = o.lines === true ? 6 : o.lines, y0 = o.linesAt ?? h * 0.62; g.fillStyle = ink; for (let i = 0; i < rows; i++) { let lx = w * 0.1; const yy = y0 + i * w * 0.07; while (lx < w * 0.85) { const lw = w * lerp(0.08, 0.26, R()); rr(g, lx, yy, Math.min(lw, w * 0.9 - lx), w * 0.025, w * 0.0125); g.fill(); lx += lw + w * 0.03; } } }
  g.restore(); if (o.fold) { g.fillStyle = shadeOf(col, 1.2); g.beginPath(); g.moveTo(w - f, 0); g.lineTo(w - f, f); g.lineTo(w, f); g.closePath(); g.fill(); }
  g.restore(); }
// slider(g, x, y, w, v, o): a timeline / setting slider: a rounded track (o.track), the filled part (o.col) up to v (0..1), a round knob
// with a flat shadow (o.knob), o.label under the knob (a year, a value; o.size, o.labelCol).
function slider(g, x, y, w, v, o = {}) { const h = o.h || 26, kx = x + w * clamp(v), kc = o.knob || '#3A5BFF'; g.save(); g.fillStyle = o.track || '#3FE8FF'; rr(g, x, y - h / 2, w, h, h / 2); g.fill(); g.fillStyle = o.col || '#3A2CD9'; rr(g, x, y - h / 2, Math.max(h, kx - x), h, h / 2); g.fill();
  g.fillStyle = shadeOf(kc); ell(g, kx + 3, y + 5, h * 1.5, h * 1.5); g.fill(); g.fillStyle = kc; ell(g, kx, y, h * 1.5, h * 1.5); g.fill();
  if (o.label != null) txt(g, String(o.label), kx - (o.labelDx ?? 0), y + h * 2.8, { size: o.size || 52, font: 'H', col: o.labelCol || '#FFFFFF' }); g.restore(); }
// dotGrid(g, x, y, cols, rows, gap, o): a dot matrix ("1 in 200", 200 dots over a globe): dots of o.r (gap x 0.36) in o.col, the first o.hi
// (or the indices in o.hiSet) in o.colB, filling in row by row with o.p; centred at (x, y).
function dotGrid(g, x, y, cols, rows, gap, o = {}) { const r = o.r || gap * 0.36, shown = Math.floor(cols * rows * clamp(o.p ?? 1)), x0 = x - (cols - 1) * gap / 2, y0 = y - (rows - 1) * gap / 2, hs = o.hiSet ? new Set(o.hiSet) : null;
  g.save(); for (let i = 0; i < shown; i++) { const hi = hs ? hs.has(i) : i < (o.hi || 0); g.fillStyle = hi ? (o.colB || '#FFE14D') : (o.col || '#FF1F8E'); ell(g, x0 + (i % cols) * gap, y0 + Math.floor(i / cols) * gap, r, r); g.fill(); } g.restore(); }
// metro(g, lines, o): a transit-map diagram (routes, pathways, networks): lines = [{pts: [[x, y], ...], col}] as thick rounded polylines
// (o.w 14) with white stations ringed in the line colour at every point; o.p (0..1) draws them in.
function metro(g, lines, o = {}) { const w = o.w || 14, p = clamp(o.p ?? 1); g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const L of lines) { const pts = L.pts, n = pts.length, m = p * (n - 1); g.strokeStyle = L.col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n && i - 1 < m; i++) { const k = Math.min(1, m - (i - 1)); g.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); } g.stroke(); }
  for (const L of lines) { const n = L.pts.length; L.pts.forEach((q, i) => { if (i > p * (n - 1) + 0.01) return; g.fillStyle = '#FFFFFF'; ell(g, q[0], q[1], w * 0.95, w * 0.95); g.fill(); g.strokeStyle = L.col; g.lineWidth = w * 0.45; g.stroke(); }); }
  g.restore(); }
// plate(g, s, x, y, o): a bold gradient label plate (TODAY, a year, a verdict): a left-to-right gradient (o.cols, orange to magenta),
// white heavy text, a hard flat drop shadow down-right (o.shadow); o.size.
function plate(g, s, x, y, o = {}) { const size = o.size || 72, cols = o.cols || ['#FF9A1F', '#FF1F8E'], w = txtW(g, s, size, 'H') + size * 0.8, h = size * 1.3, X = x - w / 2, Y = y - h / 2; mark(g, 'device', X, Y, X + w, Y + h, 'plate');
  g.save(); g.fillStyle = o.shadow || rgba('#000000', 0.35); g.fillRect(X + size * 0.12, Y + size * 0.14, w, h); const gr = g.createLinearGradient(X, 0, X + w, 0); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr; g.fillRect(X, Y, w, h);
  txt(g, s, x, y + size * 0.04, { size, font: 'H', col: o.txtCol || '#FFFFFF' }); g.restore(); }
// phone(g, x, y, w, o): a phone (news, apps, feeds: the 'screen-or-ui' device): rounded body (o.col) with a flat shadow, a dark screen
// (o.scr) and o.screen(g, x, y, w, h) for its picture (clipped, centred on the phone), a speaker slot, a soft glare; o.rot.
function phone(g, x, y, w, o = {}) { const h = w * 2.05, col = o.col || '#2B2F6E', b = w * 0.05;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0);
  g.fillStyle = shadeOf(col, 1.3); rr(g, -w / 2 + w * 0.03, -h / 2 + w * 0.04, w, h, w * 0.14); g.fill(); g.fillStyle = col; rr(g, -w / 2, -h / 2, w, h, w * 0.14); g.fill();
  g.save(); rr(g, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, w * 0.1); g.clip(); g.fillStyle = o.scr || '#10123A'; g.fillRect(-w, -h, 2 * w, 2 * h); if (o.screen) o.screen(g, 0, 0, w - 2 * b, h - 2 * b);
  g.fillStyle = rgba('#FFFFFF', 0.06); g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w * 0.1, -h / 2); g.lineTo(-w / 2, h * 0.1); g.closePath(); g.fill(); g.restore();
  g.fillStyle = col; rr(g, -w * 0.15, -h / 2 + b * 0.6, w * 0.3, w * 0.06, w * 0.03); g.fill(); g.restore(); }
// ANIMALS (the most common cast after people: 245 of ~700 cast entries). The channel's animals: a big round head on a soft pear body,
// flat colour with one shade side, a lighter muzzle / belly patch, short stubby legs, big eyes (face() with whites), no outlines.
// critter(g, o): o.kind ('cat' | 'dog' | 'rat' | 'rabbit' | 'bear' | 'fox' | 'pig'; o.ears 'point' | 'tall' | 'flop' | 'round' and
// o.tail 'long' | 'thin' | 'bush' | 'puff' | 'curl' | 'stub' override it), o.x, o.y (feet centre), o.s (height, 400), o.col, o.belly,
// o.pose ('sit' | 'stand' | 'run': a gallop, the legs swinging in pairs, the body bobbing; o.phase drives it (or o.t * o.speed,
// default 14): pass the wheel's or the ground's travel so the feet never slide), o.mood (face() moods), o.look ([-1..1, -1..1]),
// o.flip (face left), o.t (blink, tail sway), o.ground. 'rat' / 'mouse' (measured on the reference's lab mouse): a long egg head
// running into a pointed snout with a big pink nose ball, big round ears with pink insides set at the back, white eyes, slim legs,
// a long thin pink tail that waves.
// Never draw the reference channel's own bird hosts or mascots.
function critter(g, o) { mark(g, 'cast', o.x - (o.s || 400) * 0.5, o.y - (o.s || 400), o.x + (o.s || 400) * 0.5, o.y, (o.kind || 'critter') + (o.on ? ' on' : ''));   /* o.on: standing on something that is not the floor (a wheel, a table) */ const k = o.kind || 'cat', s = o.s || 400, t = o.t || 0, D = { cat: ['#4C8DF0', '#F4F1FF', 'point', 'long'], dog: ['#E08A3C', '#FFE3C4', 'flop', 'stub'], rat: ['#8C86B8', '#F2C9D8', 'round', 'thin'], mouse: ['#F4F0FF', '#FFC1D6', 'round', 'thin'], rabbit: ['#F1EEF8', '#FFC9DA', 'tall', 'puff'], bear: ['#8A4A2C', '#E8B58A', 'round', 'stub'], fox: ['#F2702A', '#FFF4E6', 'point', 'bush'], pig: ['#F59BB8', '#FFC6D6', 'flop', 'curl'] }[k] || ['#999999', '#DDDDDD', 'round', 'stub'];
  const col = o.col || D[0], belly = o.belly || D[1], ears = o.ears || D[2], tail = o.tail || D[3], sh = shadeOf(col), sit = (o.pose || 'sit') === 'sit';
  const hr = s * 0.24, bw = s * (sit ? 0.3 : 0.44), bh = s * (sit ? 0.36 : 0.24), by = sit ? -bh - s * 0.02 : -bh - s * 0.16, hx = sit ? bw * 0.05 : bw * 0.78, hy = sit ? by - bh - hr * 0.55 : by - bh * 0.6, sway = Math.sin(t * 2.2) * 0.15;
  const rod = k === 'rat' || k === 'mouse', run = o.pose === 'run', ph = o.phase ?? t * (o.speed ?? 14), bob = run ? -Math.abs(Math.sin(ph)) * s * 0.035 : 0;
  const leg = (lx, h, c) => { g.fillStyle = c; rr(g, lx - s * 0.05, -h, s * 0.1, h, s * 0.05); g.fill(); g.fillStyle = tone(c, -4); ell(g, lx, -s * 0.025, s * 0.065, s * 0.035); g.fill(); };
  const runLeg = (lx, p, c) => { const y0 = by + bob + bh * 0.35, L = -y0 - s * 0.01, lift = Math.max(0, -Math.cos(p)) * L * 0.25; g.save(); g.translate(lx, y0); g.rotate(Math.sin(p) * 0.75);
    g.fillStyle = c; rr(g, -s * 0.04, 0, s * (rod ? 0.07 : 0.08), L - lift, s * 0.035); g.fill(); g.fillStyle = tone(c, -4); ell(g, s * 0.012, L - lift, s * 0.055, s * 0.03); g.fill(); g.restore(); };
  g.save(); g.translate(o.x, o.y); if (o.flip) g.scale(-1, 1); if (o.ground) floorShadow(g, 0, 0, s * (run ? 0.75 + 0.1 * Math.cos(ph * 2) : 0.85), o.ground);
  g.save(); g.translate(-bw * 0.85, sit ? -s * 0.08 : by + bob); g.rotate(rod ? sway * 0.3 : sway);
  if (rod) { const wv = Math.sin(t * 6 + ph * 0.5) * s * 0.04; noodle(g, [[s * 0.04, 0], [-s * 0.2, s * 0.05 + wv], [-s * 0.42, -s * 0.02 - wv], [-s * 0.62, s * 0.04 + wv * 0.6]], s * 0.032, belly); }
  else if (tail === 'long' || tail === 'thin') noodle(g, [[0, 0], [-s * 0.18, -s * 0.05], [-s * 0.2, -s * 0.28], [-s * 0.08, -s * 0.36]], s * (tail === 'thin' ? 0.035 : 0.07), tail === 'thin' ? belly : col);
  else if (tail === 'bush') { g.fillStyle = col; ell(g, -s * 0.16, -s * 0.12, s * 0.2, s * 0.09, -0.8); g.fill(); g.fillStyle = belly; ell(g, -s * 0.3, -s * 0.26, s * 0.07, s * 0.05, -0.8); g.fill(); }
  else if (tail === 'puff') { g.fillStyle = belly; ell(g, 0, 0, s * 0.07, s * 0.07); g.fill(); }
  else if (tail === 'curl') { g.strokeStyle = sh; g.lineWidth = s * 0.03; g.lineCap = 'round'; g.beginPath(); g.arc(-s * 0.05, -s * 0.03, s * 0.05, 0, Math.PI * 1.6); g.stroke(); }
  else cap(g, 0, 0, -s * 0.1, -s * 0.08, s * 0.06, col);
  g.restore();
  if (sit) { g.fillStyle = sh; ell(g, -bw * 0.75, -s * 0.09, s * 0.14, s * 0.09); g.fill(); ell(g, bw * 0.75, -s * 0.09, s * 0.14, s * 0.09); g.fill(); }
  else if (run) { runLeg(-bw * 0.55, ph + 0.7, sh); runLeg(bw * 0.5, ph + Math.PI + 0.7, sh); }
  else { leg(-bw * 0.6, s * 0.2, sh); leg(bw * 0.5, s * 0.2, sh); }
  g.save(); g.translate(0, bob); g.rotate(run ? Math.sin(ph) * 0.04 : 0);
  flat(g, gg => { gg.beginPath(); gg.ellipse(0, by, bw, bh, 0, 0, Math.PI * 2); }, col, s * 0.8);
  g.save(); g.beginPath(); g.ellipse(0, by, bw, bh, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = belly; ell(g, sit ? bw * 0.12 : bw * 0.1, by + bh * 0.4, bw * (sit ? 0.55 : 0.72), bh * 0.62); g.fill(); g.restore(); g.restore();
  if (sit) { leg(-bw * 0.3, s * 0.3, col); leg(bw * 0.36, s * 0.3, col); } else if (run) { runLeg(-bw * 0.4, ph, col); runLeg(bw * 0.62, ph + Math.PI, col); } else { leg(-bw * 0.4, s * 0.2, col); leg(bw * 0.62, s * 0.2, col); }
  g.save(); g.translate(hx + (rod && !sit ? hr * 0.25 : 0), hy + bob + (run ? Math.sin(ph * 2) * s * 0.012 + s * 0.03 : 0));
  const ear = e => { g.save(); g.scale(e, 1);
    if (ears === 'point') { g.fillStyle = col; g.beginPath(); g.moveTo(hr * 0.15, -hr * 0.75); g.lineTo(hr * 0.55, -hr * 1.45); g.lineTo(hr * 0.95, -hr * 0.4); g.closePath(); g.fill(); g.fillStyle = belly; g.beginPath(); g.moveTo(hr * 0.36, -hr * 0.78); g.lineTo(hr * 0.57, -hr * 1.2); g.lineTo(hr * 0.8, -hr * 0.58); g.closePath(); g.fill(); }
    else if (ears === 'tall') { g.fillStyle = col; ell(g, hr * 0.38, -hr * 1.35, hr * 0.2, hr * 0.62, 0.15); g.fill(); g.fillStyle = belly; ell(g, hr * 0.38, -hr * 1.3, hr * 0.1, hr * 0.45, 0.15); g.fill(); }
    else if (ears === 'flop') { g.fillStyle = sh; ell(g, hr * 0.9, -hr * 0.15, hr * 0.26, hr * 0.52, -0.3); g.fill(); }
    else { g.fillStyle = col; ell(g, hr * 0.68, -hr * 0.72, hr * 0.32, hr * 0.32); g.fill(); g.fillStyle = belly; ell(g, hr * 0.68, -hr * 0.72, hr * 0.18, hr * 0.18); g.fill(); }
    g.restore(); };
  if (rod) {   // ears behind, the egg head with its snout, the nose ball, white eyes, no mouth
    const flop = run ? Math.sin(ph) * 0.12 : Math.sin(t * 1.3) * 0.04;
    for (const [ex, ey, er] of [[-hr * 0.42, -hr * 0.78, hr * 0.6], [hr * 0.18, -hr * 0.98, hr * 0.66]]) { g.save(); g.translate(ex, ey + er); g.rotate(flop); g.translate(-ex, -ey - er); g.fillStyle = er < hr * 0.63 ? sh : col; ell(g, ex, ey, er, er); g.fill(); g.fillStyle = belly; ell(g, ex + er * 0.06, ey + er * 0.04, er * 0.64, er * 0.64); g.fill(); g.restore(); }
    flat(g, gg => { gg.beginPath(); gg.moveTo(-hr * 0.92, hr * 0.05); gg.bezierCurveTo(-hr * 0.95, -hr * 0.95, hr * 0.55, -hr * 1.0, hr * 0.95, -hr * 0.18); gg.quadraticCurveTo(hr * 1.45, hr * 0.12, hr * 1.62, hr * 0.36);
      gg.quadraticCurveTo(hr * 1.25, hr * 0.78, hr * 0.25, hr * 0.8); gg.bezierCurveTo(-hr * 0.55, hr * 0.84, -hr * 0.9, hr * 0.55, -hr * 0.92, hr * 0.05); gg.closePath(); }, col, hr * 2.4);
    const nc = o.nose || '#FF4F8E'; g.fillStyle = nc; ell(g, hr * 1.6, hr * 0.34, hr * 0.21, hr * 0.19); g.fill(); g.fillStyle = lightOf(nc, 1.5); ell(g, hr * 1.55, hr * 0.27, hr * 0.06, hr * 0.05); g.fill();
    face(g, hr * 0.42, -hr * 0.28, hr * 0.95, { whites: true, mood: o.mood || 'happy', look: o.look || [0.5, 0], t, seed: o.seed || 2, col, mouth: o.mouth || 'none', low: 0.2 });
  } else {
  if (ears !== 'flop') { ear(-1); ear(1); }
  flat(g, gg => { gg.beginPath(); gg.ellipse(0, 0, hr * 1.05, hr * 0.95, 0, 0, Math.PI * 2); }, col, hr * 2);
  if (ears === 'flop') { ear(-1); ear(1); }
  const sn = { dog: 0.4, rat: 0.5, fox: 0.45, pig: 0.3, bear: 0.35 }[k] ?? 0.25;
  g.fillStyle = belly; ell(g, hr * sn * 0.4, hr * 0.42, hr * (0.42 + sn * 0.3), hr * 0.32); g.fill();
  if (k === 'pig') { g.fillStyle = shadeOf(col); ell(g, hr * 0.12, hr * 0.36, hr * 0.24, hr * 0.17); g.fill(); g.fillStyle = shadeOf(col, 1.8); for (const e of [-1, 1]) { ell(g, hr * 0.12 + e * hr * 0.08, hr * 0.36, hr * 0.04, hr * 0.065); g.fill(); } }
  else { g.fillStyle = '#2A1B3D'; ell(g, hr * sn * 0.6, hr * 0.27, hr * 0.11, hr * 0.075); g.fill(); }
  face(g, 0, -hr * 0.28, hr * 1.25, { whites: true, mood: o.mood || 'happy', look: o.look, t, seed: o.seed || 2, col, mouth: o.mouth || (k === 'pig' ? undefined : 'smile'), low: 0.2 }); }
  g.restore(); g.restore(); }
// SLEEPERS (measured on the reference's sleeping hosts): never a standing figure turned on its side. Two set-ups:
// isoBed(g, x, y, s, o): a small bed in the 30-degree view standing ON the ground, (x, y) = its front bottom corner, s = its length:
// a dark frame box, a pale mattress, a tall headboard at the back, a low footboard at the front, a pillow, and the sleeper (o.sleeper:
// head() options, e.g. { ...MOO }) tucked in, the head on the pillow, eyes shut, the blanket (o.blanket) over the body with a rolled
// fold and the bump of the body, breathing with o.t; 'z's float up (o.z false = none). o.frame, o.mattress; o.ground = a floor shadow;
// o.sleeper.lift 0-1 sits them up (awake), o.sleeper.mood / eyes override the shut sleeping face.
// bedTop(g, o): the close-up seen from above: a big pillow filling the frame, the head on it (o.s, at o.x, o.y), eyes shut, the blanket
// pulled up to the chin with a rolled fold, both hands over the fold, breathing; 'z's float up. head() options pass on.
function isoBed(g, x, y, s, o = {}) { const t = o.t || 0, c = Math.cos(Math.PI / 6), Wb = s * 0.56, R = [c, -0.5], L = [-c, -0.5], fr = o.frame || '#7A3A2A', ma = o.mattress || '#F4F0FF', bl = o.blanket || '#E6DDFB';
  const pt = (u, v, h = 0) => [x + R[0] * u + L[0] * v, y + R[1] * u + L[1] * v - h], hb = s * 0.13, hm = s * 0.1, br = Math.sin(t * 2.4) * s * 0.006;
  mark(g, 'furn', ...pt(0, s), ...pt(Wb, 0).map((q, i) => i ? y : q), 'bed');
  g.save(); if (o.ground) { g.fillStyle = rgba(dk(o.ground, 0.25), 0.3); g.beginPath(); [pt(-s * 0.05, -s * 0.05), pt(Wb + s * 0.08, -s * 0.05), pt(Wb + s * 0.08, s * 1.04), pt(-s * 0.05, s * 1.04)].forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); }
  isoBox(g, ...pt(0, s - s * 0.07), Wb, s * 0.07, s * 0.42, fr, { side: shadeOf(fr, 1.25), topCol: lightOf(fr, 1.2) });                       // the headboard
  isoBox(g, x, y, Wb, s * 0.93, hb, fr, { side: shadeOf(fr, 1.25), topCol: lightOf(fr, 1.2) });                                            // the frame
  isoBox(g, ...pt(0, 0, hb), Wb, s * 0.93, hm, ma, { side: shadeOf(ma, 1.12), topCol: ma });                                                // the mattress
  const top = hb + hm, P = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); };
  P([pt(Wb * 0.14, s * 0.7, top), pt(Wb * 0.86, s * 0.7, top), pt(Wb * 0.86, s * 0.9, top + s * 0.03), pt(Wb * 0.14, s * 0.9, top + s * 0.03)], '#FFFFFF');   // the pillow
  const SL = o.sleeper || {}, lift = SL.lift || 0, [hx, hy] = pt(Wb * 0.5, s * (0.74 - lift * 0.1), top + s * (0.06 + lift * 0.13)); g.save(); g.translate(hx, hy); g.rotate(-0.42 * (1 - lift));
  g.fillStyle = SL.top || '#4A7BE8'; rr(g, -s * 0.17, s * 0.1, s * 0.34, s * 0.3, s * 0.12); g.fill();                                          // the shoulders (o.sleeper.lift 0-1: sitting up)
  head(g, 0, 0, s * 0.16, { mood: 'bliss', eyes: 'dot', brows: 'none', mouth: 'none', ...SL, t }); g.restore();
  isoBox(g, ...pt(-s * 0.012, -s * 0.01, hb), Wb + s * 0.024, s * 0.68, hm + s * 0.03 + br, bl, { side: shadeOf(bl, 1.15), topCol: bl });     // the blanket, draped over the sides
  P([pt(Wb * 0.25, s * 0.08, top + s * 0.03 + br), pt(Wb * 0.75, s * 0.08, top + s * 0.03 + br), pt(Wb * 0.8, s * 0.55, top + s * 0.07 + br), pt(Wb * 0.2, s * 0.55, top + s * 0.07 + br)], lightOf(bl, 1.12));   // the body's bump
  P([pt(-s * 0.012, s * 0.6, top + s * 0.03 + br), pt(Wb + s * 0.012, s * 0.6, top + s * 0.03 + br), pt(Wb + s * 0.012, s * 0.67, top + s * 0.05 + br), pt(-s * 0.012, s * 0.67, top + s * 0.05 + br)], lightOf(bl, 1.3));   // the rolled fold
  isoBox(g, x, y, Wb, s * 0.05, hb + hm * 0.7, fr, { side: shadeOf(fr, 1.25), topCol: lightOf(fr, 1.2) });                                 // the footboard, in front
  if (o.z !== false) for (let i = 0; i < 3; i++) { const u = (t * 0.45 + i / 3) % 1; g.globalAlpha = Math.sin(u * Math.PI); txt(g, 'z', hx + s * 0.12 + u * s * 0.12, hy - s * 0.16 - u * s * 0.3, { size: s * (0.07 + u * 0.05), font: 'H', col: o.zCol || '#7FA8FF' }); }
  g.restore(); }
function bedTop(g, o = {}) { const x = o.x ?? W / 2, y = o.y ?? H * 0.4, s = o.s || 420, t = o.t || 0, bl = o.blanket || '#C2186B', pc = o.pillow || lightOf(bl, 1.35), skin = o.skin || PAL.skinS[2], br = 1 + Math.sin(t * 2.4) * 0.012, ey = y + s * 0.66;
  g.save(); flat(g, gg => rr(gg, x - s * 1.3, y - s * 1.0, s * 2.6, s * 1.9, s * 0.55), pc, s * 2.6, { sx: 0.04, sy: 0.05 });               // the pillow
  g.fillStyle = shadeOf(pc, 1.12); ell(g, x, y + s * 0.18, s * 0.9, s * 0.72); g.fill();                                                     // the dent the head makes
  head(g, x, y, s, { mood: 'bliss', eyes: 'dot', brows: 'none', mouth: 'curve', ...o, t });
  g.save(); g.translate(x, ey); g.scale(1, br); g.translate(-x, -ey);
  const edge = (gg, dy) => { gg.moveTo(-W, ey + s * 0.12 + dy); gg.quadraticCurveTo(x, ey - s * 0.16 + dy, W * 2, ey + s * 0.12 + dy); };
  flat(g, gg => { gg.beginPath(); edge(gg, 0); gg.lineTo(W * 2, H * 2); gg.lineTo(-W, H * 2); gg.closePath(); }, bl, W, { sx: 0.02, sy: 0.04 });
  g.fillStyle = lightOf(bl, 1.25); g.beginPath(); edge(g, 0); g.lineTo(W * 2, ey + s * 0.3); g.quadraticCurveTo(x, ey + s * 0.02, -W, ey + s * 0.3); g.closePath(); g.fill();   // the rolled fold
  for (const e of [-1, 1]) hand(g, x + e * s * 0.92, ey + s * 0.02, Math.PI / 2, s, 'relax', skin, { side: -e, size: o.handSize ?? 1.15 });
  g.restore();
  if (o.z !== false) for (let i = 0; i < 3; i++) { const u = (t * 0.45 + i / 3) % 1; g.globalAlpha = Math.sin(u * Math.PI); txt(g, 'z', x + s * 0.8 + u * s * 0.35, y - s * 0.62 - u * s * 0.6, { size: s * (0.2 + u * 0.12), font: 'H', col: o.zCol || '#FFFFFF' }); }
  g.restore(); }
// fish(g, x, y, s, o): a round flat fish facing right (o.flip left): body o.col with a lighter belly (o.belly), fins o.fin, o.stripes
// (true = white or a colour), a big eye; the tail beats with o.t. worm(g, pts, o): a segmented worm / larva / tapeworm along points
// (the head at the last point): banded body (o.col, o.band), a round head with one big eye or two (o.eyes), o.w thickness.
function fish(g, x, y, s, o = {}) { const col = o.col || '#FF8A2B', fin = o.fin || shadeOf(col, 1.3), beat = Math.sin((o.t || 0) * 8) * 0.25;
  g.save(); g.translate(x, y); if (o.flip) g.scale(-1, 1);
  g.save(); g.translate(-s * 0.42, 0); g.rotate(beat); g.fillStyle = fin; g.beginPath(); g.moveTo(s * 0.05, 0); g.lineTo(-s * 0.3, -s * 0.26); g.quadraticCurveTo(-s * 0.2, 0, -s * 0.3, s * 0.26); g.closePath(); g.fill(); g.restore();
  g.fillStyle = fin; g.beginPath(); g.moveTo(-s * 0.2, -s * 0.24); g.quadraticCurveTo(0, -s * 0.5, s * 0.15, -s * 0.28); g.closePath(); g.fill();
  flat(g, gg => { gg.beginPath(); gg.ellipse(0, 0, s * 0.5, s * 0.32, 0, 0, Math.PI * 2); }, col, s);
  g.save(); g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.32, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = o.belly || lightOf(col, 1.6); ell(g, s * 0.05, s * 0.28, s * 0.5, s * 0.16); g.fill();
  if (o.stripes) { g.fillStyle = o.stripes === true ? '#FFFFFF' : o.stripes; for (const sx of [-0.18, 0.08]) g.fillRect(s * sx, -s * 0.4, s * 0.08, s * 0.8); } g.restore();
  g.fillStyle = fin; ell(g, s * 0.02, s * 0.06, s * 0.1, s * 0.05, 0.5); g.fill();
  g.fillStyle = '#FFFFFF'; ell(g, s * 0.28, -s * 0.06, s * 0.1, s * 0.1); g.fill(); g.fillStyle = '#141B5C'; ell(g, s * 0.31, -s * 0.05, s * 0.055, s * 0.06); g.fill(); g.fillStyle = '#FFFFFF'; ell(g, s * 0.29, -s * 0.08, s * 0.018, s * 0.018); g.fill();
  g.restore(); }
function worm(g, pts, o = {}) { const w = o.w || 60, col = o.col || '#F06AB8', band = o.band || shadeOf(col), n = pts.length, L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
  g.fillStyle = band; for (let d = w * 0.6; d < L[n - 1] - w * 0.8; d += w * 0.55) { let i = 1; while (L[i] < d) i++; const k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1), a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); ell(g, lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k), w * 0.07, w * 0.47, a); g.fill(); }
  const [hx, hy] = pts[n - 1]; g.fillStyle = col; ell(g, hx, hy, w * 0.62, w * 0.62); g.fill();
  if ((o.eyes ?? 2) === 1) { g.fillStyle = '#FFFFFF'; ell(g, hx, hy - w * 0.08, w * 0.32, w * 0.32); g.fill(); g.fillStyle = '#3A1450'; ell(g, hx + w * 0.06, hy - w * 0.06, w * 0.15, w * 0.17); g.fill(); g.fillStyle = '#FFFFFF'; ell(g, hx + w * 0.02, hy - w * 0.12, w * 0.05, w * 0.05); g.fill(); }
  else for (const e of [-1, 1]) { g.fillStyle = '#FFFFFF'; ell(g, hx + e * w * 0.24, hy - w * 0.1, w * 0.16, w * 0.19); g.fill(); g.fillStyle = '#141B5C'; ell(g, hx + e * w * 0.24 + w * 0.04, hy - w * 0.08, w * 0.08, w * 0.11); g.fill(); }
  g.restore(); }

// INSECTS (mosquitoes, flies, larvae, spiders: the most frequent non-mammal animals). bug(g, x, y, s, o): o.kind 'mosquito' | 'fly' |
// 'spider' | 'beetle' | 'ant', body o.col, legs o.leg, big white eyes, see-through wings buzzing with o.t; facing right (o.flip left);
// s = body length.
function bug(g, x, y, s, o = {}) { const k = o.kind || 'fly', t = o.t || 0, col = o.col || { mosquito: '#3A2C6E', fly: '#2F7A5A', spider: '#6B3A2A', beetle: '#C8303C', ant: '#3A1E4A' }[k] || '#444466', leg = o.leg || shadeOf(col, 1.4), buzz = Math.sin(t * 60) * 0.25;
  const n = k === 'spider' ? 4 : 3, ll = s * (k === 'mosquito' ? 0.9 : k === 'spider' ? 0.7 : 0.45);
  g.save(); g.translate(x, y); if (o.flip) g.scale(-1, 1); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = leg; g.lineWidth = s * (k === 'mosquito' ? 0.025 : 0.045);
  for (let i = 0; i < n; i++) for (const e of [-1, 1]) { const u = i / (n - 1) - 0.5, bx = s * 0.06 + u * s * 0.18, sp = k === 'spider' ? 1.8 : 1, kx = bx + u * ll * 0.7 * sp + e * s * 0.03, ky = -ll * (k === 'spider' ? 0.4 : 0.15), fx = bx + u * ll * 1.1 * sp + e * s * 0.05, fy = ll * 0.5; g.beginPath(); g.moveTo(bx, 0); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke(); }
  const ab = k === 'mosquito' ? [-s * 0.36, s * 0.34, s * 0.08, 0.25] : k === 'spider' ? [-s * 0.3, s * 0.3, s * 0.27, 0] : k === 'ant' ? [-s * 0.3, s * 0.18, s * 0.15, 0] : k === 'beetle' ? [-s * 0.08, s * 0.36, s * 0.24, 0] : [-s * 0.24, s * 0.28, s * 0.19, 0.1];
  flat(g, gg => { gg.beginPath(); gg.ellipse(ab[0], -s * 0.02, ab[1], ab[2], ab[3], 0, Math.PI * 2); }, col, s);
  if (k === 'mosquito' || k === 'fly') { g.save(); g.beginPath(); g.ellipse(ab[0], -s * 0.02, ab[1], ab[2], ab[3], 0, Math.PI * 2); g.clip(); g.fillStyle = lightOf(col, 1.6); for (let i = 1; i < 4; i++) g.fillRect(ab[0] - ab[1] + i * ab[1] * 0.5, -s, s * 0.035, 2 * s); g.restore(); }
  if (k === 'beetle') { g.strokeStyle = shadeOf(col, 1.4); g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(s * 0.26, -s * 0.02); g.lineTo(-s * 0.42, -s * 0.02); g.stroke(); g.fillStyle = '#1A1030'; for (const [dx, dy] of [[-0.2, -0.12], [0, 0.1], [0.12, -0.12], [-0.3, 0.08]]) { ell(g, s * dx, s * dy, s * 0.045, s * 0.045); g.fill(); } }
  if (k !== 'beetle') { flat(g, gg => { gg.beginPath(); gg.ellipse(s * 0.06, -s * 0.04, s * 0.14, s * 0.12, 0, 0, Math.PI * 2); }, col, s * 0.5); }
  const hx = s * (k === 'beetle' ? 0.34 : 0.25), hy = -s * 0.06, hr = s * (k === 'spider' ? 0.1 : 0.12);
  if (k === 'mosquito') cap(g, hx + hr * 0.6, hy + hr * 0.4, hx + s * 0.42, hy + s * 0.32, s * 0.025, leg);
  if (k === 'fly' || k === 'ant' || k === 'beetle') { g.strokeStyle = leg; g.lineWidth = s * 0.025; for (const e of [0, 1]) { g.beginPath(); g.moveTo(hx + hr * 0.3, hy - hr * 0.7); g.quadraticCurveTo(hx + hr * (0.8 + e), hy - hr * 2.2, hx + hr * (1.6 + e * 0.8), hy - hr * (1.8 - e * 0.4)); g.stroke(); } }
  g.fillStyle = col; ell(g, hx, hy, hr, hr); g.fill();
  const ew = hr * (k === 'fly' ? 0.75 : 0.55); g.fillStyle = k === 'fly' ? '#E8304A' : '#FFFFFF'; ell(g, hx + hr * 0.35, hy - hr * 0.15, ew, ew); g.fill(); g.fillStyle = '#141B5C'; ell(g, hx + hr * 0.48, hy - hr * 0.1, ew * 0.45, ew * 0.55); g.fill(); g.fillStyle = '#FFFFFF'; ell(g, hx + hr * 0.4, hy - hr * 0.26, ew * 0.16, ew * 0.16); g.fill();
  if (k === 'mosquito' || k === 'fly') { g.save(); g.translate(s * 0.02, -s * 0.13); for (const e of [0, 1]) { g.save(); g.rotate(-0.55 - e * 0.4 + buzz); g.fillStyle = rgba('#DDF3FF', 0.5); ell(g, -s * 0.3, 0, s * 0.32, s * 0.1); g.fill(); g.restore(); } g.restore(); }
  g.restore(); }
// ISOMETRIC (5 % of shots: factories, assembly lines, scanners, blocks seen from above). isoBox(g, x, y, w, d, h, col, o): a box in the
// 30-degree isometric view, (x, y) = its bottom front corner, w along the right axis, d along the left, h up: left face col, right face
// shadeOf (o.side), top lightOf (o.topCol); o.top(g) draws on the top face in a unit square (via onFace).
function isoBox(g, x, y, w, d, h, col, o = {}) { const c = Math.cos(Math.PI / 6), R = [w * c, -w * 0.5], L = [-d * c, -d * 0.5];
  const P = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); };
  g.save(); g.fillStyle = col; P([[x, y], [x + L[0], y + L[1]], [x + L[0], y + L[1] - h], [x, y - h]]);
  g.fillStyle = o.side || shadeOf(col, 1.2); P([[x, y], [x + R[0], y + R[1]], [x + R[0], y + R[1] - h], [x, y - h]]);
  g.fillStyle = o.topCol || lightOf(col, 1.2); P([[x, y - h], [x + R[0], y + R[1] - h], [x + R[0] + L[0], y + R[1] + L[1] - h], [x + L[0], y + L[1] - h]]);
  if (o.top) onFace(g, x + L[0], y + L[1] - h, R[0], R[1], -L[0], -L[1], o.top);
  g.restore(); }
// stamp(g, s, x, y, o): a rubber stamp (APPROVED, FAKE, a verdict: 2 % of shots): tilted (o.rot -0.18), a double rounded border and heavy
// text in one colour (o.col), a little see-through (o.a); slams in with o.p 0..1 (scale 1.6 to 1 on the glide curve).
function stamp(g, s, x, y, o = {}) { const size = o.size || 80, col = o.col || '#E8304A', p = clamp(o.p ?? 1), k = lerp(1.6, 1, glide(p)), w = txtW(g, s, size, 'H') + size * 0.9, h = size * 1.5;
  if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(o.rot ?? -0.18); g.scale(k, k); g.globalAlpha = (o.a ?? 0.9) * Math.min(1, p * 2);
  g.strokeStyle = col; g.lineWidth = size * 0.09; rr(g, -w / 2, -h / 2, w, h, size * 0.2); g.stroke(); g.lineWidth = size * 0.04; rr(g, -w / 2 + size * 0.14, -h / 2 + size * 0.14, w - size * 0.28, h - size * 0.28, size * 0.12); g.stroke();
  txt(g, s, 0, size * 0.04, { size, font: 'H', col }); g.restore(); }

// ── composition marks (BUILD.md "Nothing covers the hero") ──────────────────────────────────────────────────────────────
// Helpers record where the hero, the cast and the devices sit on screen in every frame (planet r >= 110 = 'hero', gauge / bubble /
// numBox / plate = 'device', lockup = 'title', person / critter = 'cast', a person's hands = 'hand'). render.py --stills writes them
// next to each still and check.py flags a cast member drawn OVER a hero or a device, and a hero, device or title in the caption band.
// Mark your own heroes and devices the same way: mark(g, 'hero' | 'device', x0, y0, x1, y1, name, 'ell' for round ones).
let MARKS = [];
window.marks = () => MARKS;
function mark(g, kind, x0, y0, x1, y1, name = '', shape = 'box') { if (g.globalAlpha < 0.35) return; const T = g.getTransform();
  const P = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f]);
  MARKS.push({ kind, name, shape, order: MARKS.length, box: [Math.min(...P.map(q => q[0])), Math.min(...P.map(q => q[1])), Math.max(...P.map(q => q[0])), Math.max(...P.map(q => q[1]))].map(Math.round) }); }

// ── placement (SPEC section 22, 535 reference frames boxed element by element) ───────────────────────────────────────────
// ONE hero on the middle line at mid-height (x 50 %, y 49 %, p25-p75 43-56 %), median 56 % of the width; its size follows the shot's
// job (area share below); cut by a side or bottom edge in ~1 shot in 3. A device sits ON or right against what it explains (gap ~2 %
// of the frame, about a third of its size); the title's centre sits at ~25 % of the height, ~2/3 of the width wide.
const HERO_AREA = { joke: 0.24, hook: 0.23, example: 0.21, bookend: 0.2, turn: 0.19, consequence: 0.18, history: 0.18, mechanism: 0.16,
  scale: 0.14, solution: 0.13, comparison: 0.13, number: 0.11 };
// slot(job, o): where the hero goes: {x, y, w, r} (w = its width for a wide hero, r = the radius of a round one with the measured area).
// o.y overrides the height share (0.43-0.56 is the reference's middle half), o.cut = 'left' | 'right' | 'bottom' pushes it past that
// edge so ~30 % of it leaves the frame (the reference's cut heroes), o.area overrides the share.
function slot(job = 'mechanism', o = {}) { const a = o.area ?? HERO_AREA[job] ?? 0.19, r = Math.sqrt(a * W * H / Math.PI);
  let x = W * 0.5, y = H * (o.y ?? 0.49);
  if (o.cut === 'left') x = r * 0.4; else if (o.cut === 'right') x = W - r * 0.4; else if (o.cut === 'bottom') y = H - r * 0.4;
  return { x, y, r, w: Math.min(W * 0.9, W * 0.56 * Math.sqrt(a / 0.19)) }; }
// against(box, side, size, o): where a device goes for the thing it explains, box = [x0, y0, x1, y1] (or a slot: {x, y, r}); side =
// 'on' (inside it, the most common: 42 %), 'above' (25 %), 'side' (21 %, toward the frame centre), 'below' (13 %); gap ~2 % of H.
// Returns the device centre {x, y}. Keep it out of the caption band (0.70-0.84 H).
function against(b, side = 'above', size = 160, o = {}) { if (!Array.isArray(b)) b = [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r];
  const [x0, y0, x1, y1] = b, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, gap = o.gap ?? H * 0.02, h = size / 2;
  let p = side === 'on' ? { x: cx + (x1 - x0) * 0.18, y: cy - (y1 - y0) * 0.18 }
    : side === 'below' ? { x: cx, y: y1 + gap + h }
    : side === 'side' ? (cx > W / 2 ? { x: x0 - gap - h, y: cy } : { x: x1 + gap + h, y: cy })
    : { x: cx, y: y0 - gap - h };
  if (p.y > H * 0.70 - h && p.y < H * 0.84 + h) p.y = H * 0.70 - h;
  return { x: clamp(p.x, h, W - h), y: clamp(p.y, h, H - h) }; }

// ── density: what fills a busy frame (SPEC section 21, measured on all 3,868 reference frames) ─────────────────────────
// The reference is busy in 4 frames of 10 (30+ flat shapes) and very busy in 1 of 6 (50+); every Short peaks near 85 shapes and dips
// to ~5. Busy frames are filled with a few cheap, repeatable fillers, never with clutter: things repeated in perspective rows, a
// dense tangle in the near plane, radiating ribbons, a motif on a garment or wall, tonal texture strokes on grounds, a radial
// repeat, a device column on one edge, the architecture of the room in the back plane. These helpers draw them.

// strew(g, seed, fn, o): repeat one drawer in perspective rows (a flock, a crowd, a field of plants, a shelf of jars). Rows run far
// (top of o.box, small, toward o.sky) to near (bottom, big, saturated); fn(g, x, y, s, i, d, R) draws one at its feet (x, y) and
// scale s; d = 0 near .. 1 far, so pass atmos(col, o.sky, d) for colour. o.rows (4), o.s1 the nearest row's scale (1). MEASURED
// (940 row sets in 1,934 frames): a copy grows ~25 % per 10 % of frame height toward the viewer (o.grow 1.25; p25 1.18, p75 1.46),
// far flatter than a true ground plane; a row set spans ~34 % of the height, nearest copy ~2.4x the farthest, and lightness barely
// changes inside one row (the haze is between planes, not along a row). o.s0 / o.s1 (far / near) override the measured growth,
// o.per (items in the nearest row, 3; far rows get more), o.jit (0.35). o.near = [x, s] adds one GIANT copy cut by the bottom edge.
// i is stable per item: pick colours / kinds from i, never from x or y (a moving item would flicker between them).
function strew(g, seed, fn, o = {}) { const R = rng(seed), [bx, by, bw, bh] = o.box || [0, H * 0.35, W, H * 0.5], rows = o.rows || 4, items = [];
  for (let r = 0; r < rows; r++) { const k = rows === 1 ? 1 : r / (rows - 1), d = 1 - k, y = by + bh * Math.pow(k, 1.35),
      s = o.s0 != null ? lerp(o.s0, o.s1 ?? 1, k * k) : (o.s1 ?? 1) * Math.pow(o.grow ?? 1.25, (y - by - bh) / (0.1 * H)), n = Math.max(1, Math.round((o.per || 3) / Math.max(0.3, s)));
    for (let i = 0; i < n; i++) { const x = bx + bw * ((i + 0.5 + (R() - 0.5) * (o.jit ?? 0.35) * 2) / n); items.push([x, y + (R() - 0.5) * bh * 0.05, s, d]); } }
  items.sort((a, b) => a[1] - b[1]).forEach(([x, y, s, d], i) => fn(g, x, y, s, i, d, R));
  if (o.near) fn(g, o.near[0], H + o.near[1] * 0.25, o.near[1], items.length, 0, R); }

// dashes(g, seed, box, col, o): tonal texture strokes on a ground (barn floor, sand, soil, a planet's crust): short rounded strokes
// 1-3 % of the width long, a few degrees off horizontal, the ground colour +/- 6 L, thinning toward the top of the box (far).
// o.n (60), o.dl (6, negative = darker), o.len [14, 40], o.w (6).
function dashes(g, seed, box, col, o = {}) { const R = rng(seed), [bx, by, bw, bh] = box, c = tone(col, o.dl ?? 6, 0, 1), [l0, l1] = o.len || [14, 40];
  g.save(); g.strokeStyle = c; g.lineCap = 'round';
  for (let i = 0; i < (o.n || 60); i++) { const k = Math.pow(R(), 0.7), x = bx + R() * bw, y = by + k * bh, l = lerp(l0, l1, R()) * lerp(0.5, 1, k), a = (R() - 0.5) * 0.5;
    g.lineWidth = (o.w || 6) * lerp(0.5, 1, k); g.beginPath(); g.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); g.lineTo(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); g.stroke(); }
  g.restore(); }

// tangle(g, seed, o): a dense near-plane thicket rising from the bottom edge (crops, reeds, wheat, rape, weeds): broad dark leaves
// behind, then many thin curved stems crossing each other, with capsule pods or blossoms along them; it covers the lower o.top..H
// of the frame and is cut by the frame on three sides. o.stem ('#8C7A3C'), o.leaf ('#5E5A1C'), o.pods (['#F3B51B', '#E8742C']),
// o.n stems (26), o.w stem width (9), o.pod pod size (1), o.t sways it. Stems must read against the leaves: keep them 15+ L apart.
function tangle(g, seed, o = {}) { const R = rng(seed), top = o.top ?? H * 0.55, t = o.t || 0, stem = o.stem || '#8C7A3C', leaf = o.leaf || '#5E5A1C', pods = o.pods || ['#F3B51B', '#E8742C'];
  g.save();
  g.fillStyle = leaf; for (let i = 0; i < 7; i++) { const x = lerp(-0.1, 1.1, i / 6 + (R() - 0.5) * 0.12) * W, hgt = (H - top) * lerp(0.75, 1.1, R()), lean = (R() - 0.5) * W * 0.5;
    const lw = Math.max(80, hgt * 0.35); g.beginPath(); g.moveTo(x - lw, H + 10); g.quadraticCurveTo(x - lw * 0.8 + lean * 0.4, H - hgt * 0.6, x + lean, H - hgt); g.quadraticCurveTo(x + lw * 0.7 + lean * 0.3, H - hgt * 0.5, x + lw, H + 10); g.closePath(); g.fill(); }
  const tips = [];
  g.strokeStyle = stem; g.lineCap = 'round'; g.lineWidth = o.w || 9;
  for (let i = 0; i < (o.n || 26); i++) { const x0 = lerp(-0.05, 1.05, R()) * W, hgt = (H - top) * lerp(0.55, 1, R()), bend = (R() - 0.5) * W * 0.55, sw = Math.sin(t * 1.3 + i) * 8;
    const x1 = x0 + bend + sw, y1 = H - hgt; g.beginPath(); g.moveTo(x0, H + 10); g.bezierCurveTo(x0, H - hgt * 0.5, x1 - bend * 0.2, y1 + 40, x1, y1); g.stroke();
    for (let k = 0; k < 4; k++) { const u = lerp(0.55, 1, R()); tips.push([lerp(x0, x1, u) + (R() - 0.5) * 30, lerp(H, y1, u), R() * Math.PI, pods[(i + k) % pods.length]]); }
    if (R() < 0.5) { g.beginPath(); g.moveTo(x1, y1 + 30); g.quadraticCurveTo(x1 + bend * 0.3, y1 - 40, x1 + bend * 0.45 + 30, y1 + 20); g.stroke(); } }
  for (const [x, y, a, pc] of tips) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = pc; const ps = o.pod ?? 1; rr(g, -24 * ps, -10 * ps, 48 * ps, 20 * ps, 10 * ps); g.fill(); g.restore(); }
  g.restore(); }

// strands(g, x, y, o): wavy ribbons radiating from a centre to past the frame edge (a trip, an overload, a burst of signals): thick
// bands alternating two colours, each edged by a thin bright line, waving along their length and drifting with o.t; draw it right
// after the ground and put the hero on the centre. o.n (22), o.cols (['#E0389C', '#F6A0C8']), o.line ('#7DF0D0'), o.w (34).
function strands(g, x, y, o = {}) { const n = o.n || 22, cols = o.cols || ['#E0389C', '#F6A0C8'], line = o.line || '#7DF0D0', w = o.w || 34, t = o.t || 0, L = Math.hypot(W, H);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2 + (o.rot || 0), pts = [];
    for (let k = 0; k <= 24; k++) { const r = k / 24 * L, a = a0 + Math.sin(k * 0.55 + i * 1.7 + t * 1.2) * 0.12 * (r / L); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); };
    g.strokeStyle = line; g.lineWidth = w + 8; path(); g.stroke(); g.strokeStyle = cols[i % cols.length]; g.lineWidth = w; path(); g.stroke(); }
  g.restore(); }

// radial(g, x, y, n, fn, o): one drawer repeated n times around a centre (machine arms, petals, spokes, a ring of satellites):
// fn(g, i) draws ONE copy pointing up from (0, 0); o.rot turns the whole ring, o.r pushes copies out from the centre.
function radial(g, x, y, n, fn, o = {}) { for (let i = 0; i < n; i++) { g.save(); g.translate(x, y); g.rotate((o.rot || 0) + i / n * Math.PI * 2); g.translate(0, -(o.r || 0)); fn(g, i); g.restore(); } }

// motif(g, pathFn, kind, o): fill a region with a repeating motif, clipped to it (hearts on boxer shorts, dots on a dress, stripes on
// a sock, checks on a tablecloth, tiles on a floor, stars on wallpaper). pathFn(g) builds the clip path. kind 'hearts' | 'dots' |
// 'stripes' | 'checks' | 'stars'; o.col (motif), o.step (48), o.size (0.36 of the step), o.rot.
function motif(g, pathFn, kind, o = {}) { const st = o.step || 48, sz = st * (o.size ?? 0.36), col = o.col || '#E8338F';
  g.save(); pathFn(g); g.clip(); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = sz * 0.7; g.rotate(o.rot || 0);
  for (let yy = -H; yy < 2 * H; yy += st) for (let xx = -W, k = 0; xx < 2 * W; xx += st, k++) { const x = xx + ((yy / st) % 2 ? st / 2 : 0), y = yy;
    if (kind === 'dots') { ell(g, x, y, sz * 0.5, sz * 0.5); g.fill(); }
    else if (kind === 'hearts') { g.beginPath(); g.moveTo(x, y + sz * 0.55); g.bezierCurveTo(x - sz * 1.1, y - sz * 0.2, x - sz * 0.45, y - sz * 0.85, x, y - sz * 0.3); g.bezierCurveTo(x + sz * 0.45, y - sz * 0.85, x + sz * 1.1, y - sz * 0.2, x, y + sz * 0.55); g.fill(); }
    else if (kind === 'stars') { g.beginPath(); for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2 - Math.PI / 2, r = j % 2 ? sz * 0.22 : sz * 0.55; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
    else if (kind === 'checks') { if ((Math.round(xx / st) + Math.round(yy / st)) % 2 === 0) g.fillRect(xx, yy, st, st); } }
  if (kind === 'stripes') for (let yy = -H; yy < 2 * H; yy += st) g.fillRect(-W, yy, 3 * W, sz);
  g.restore(); }

// edgeStack(g, items, o): the device column down one edge (a list of foods, symptoms, risk levels): round white chips with an icon,
// some with a small coloured percentage pill hanging off their lower right. items = [{ draw(gg, x, y, r), pill: '70%', pc: col }].
// o.x (left edge, 72), o.y0 (H * 0.06), o.r (44), o.gap (2.76 = centre to centre in r), o.p reveals them top-down 0..1.
function edgeStack(g, items, o = {}) { const r = o.r || 44, x = o.x ?? 72, gap = r * (o.gap || 2.76), p = o.p ?? 1;
  items.forEach((it, i) => { const k = clamp(p * items.length - i), y = (o.y0 ?? H * 0.06) + r + i * gap; if (k <= 0) return; const s = popc(k);
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = rgba('#000000', 0.12); ell(g, 0, r * 0.12, r, r); g.fill(); g.fillStyle = '#F7F4FF'; ell(g, 0, 0, r, r); g.fill();
    if (it.draw) it.draw(g, 0, 0, r * 0.62); else if (it.col) { g.fillStyle = it.col; ell(g, 0, 0, r * 0.55, r * 0.45); g.fill(); }
    if (it.pill) { g.fillStyle = it.pc || '#2CC7C0'; ell(g, r * 0.78, r * 0.62, r * 0.5, r * 0.5); g.fill(); txt(g, it.pill, r * 0.78, r * 0.62, { size: r * 0.36, col: '#FFFFFF', font: 'H' }); }
    g.restore(); }); }

// rafters(g, o): the back plane of an interior (a barn, a hall, a warehouse, a gym): tonal roof beams converging to a far wall,
// a far door frame, and hanging cone lamps on cords; everything the wall colour +/- 8 L so the cast stays the focus.
// o.wall ('#8E3A73'), o.y (where the far wall meets the floor, H * 0.42), o.lamps (4), o.t swings the lamps a touch.
function rafters(g, o = {}) { const wall = o.wall || '#8E3A73', y = o.y ?? H * 0.42, t = o.t || 0, dk2 = tone(wall, -8, 0, 1), lt2 = tone(wall, 7, 0, 1), vx = W / 2, top = y - H * 0.24;
  g.save(); g.fillStyle = wall; g.fillRect(0, 0, W, y);
  g.fillStyle = lt2; g.fillRect(vx - W * 0.22, top, W * 0.44, y - top);
  g.strokeStyle = dk2; g.lineWidth = 14; g.strokeRect(vx - W * 0.16, top + (y - top) * 0.18, W * 0.32, (y - top) * 0.82); g.beginPath(); g.moveTo(vx - W * 0.16, top + (y - top) * 0.18); g.lineTo(vx + W * 0.16, y); g.moveTo(vx + W * 0.16, top + (y - top) * 0.18); g.lineTo(vx - W * 0.16, y); g.stroke();
  g.strokeStyle = dk2; g.lineWidth = 22; for (const u of [-1.4, -0.7, 0, 0.7, 1.4]) { g.beginPath(); g.moveTo(vx + u * W * 0.75, -40); g.lineTo(vx + u * W * 0.16, top); g.stroke(); }
  g.lineWidth = 12; for (const k of [0.25, 0.55, 0.8]) { g.beginPath(); g.moveTo(0, top * k); g.lineTo(W, top * k); g.stroke(); }
  for (let i = 0; i < (o.lamps ?? 4); i++) { const lx = W * (0.14 + i * 0.72 / Math.max(1, (o.lamps ?? 4) - 1)), ly = H * (0.05 + 0.025 * (i % 2)), sw = Math.sin(t * 1.1 + i) * 3;
    g.strokeStyle = dk2; g.lineWidth = 4; g.beginPath(); g.moveTo(lx, -10); g.lineTo(lx + sw, ly); g.stroke();
    g.fillStyle = shadeOf(wall, 1.6); g.beginPath(); g.moveTo(lx + sw - 46, ly + 46); g.lineTo(lx + sw - 16, ly); g.lineTo(lx + sw + 16, ly); g.lineTo(lx + sw + 46, ly + 46); g.closePath(); g.fill(); }
  g.restore(); }

// ── shots, transitions, the frame ───────────────────────────────────────────────────────────────────────────────────
// MEASURED v2 (205 changes named frame by frame in nine references, 723 s): 5.8 hard cuts a minute and 11.2 big changes a minute
// INSIDE a shot. How one idea becomes the next: plain cut 24 %, rebuild in place 14 % (no cut: rebuild()), carry 13 % (one thing
// stays put, the world changes round it), pan to a new part of the same world 11 %, object wipe 7 % (bars or a panel sweep across,
// the new picture behind), zoom-out reveal 7 % (the camera pulls back: the old picture was inside a bubble, window or photo in the
// new one), zoom-through 5 % (the camera dives into a bubble, pod or photo and comes out inside it), dissolve 4 %, match cut 4 %
// (a hard cut, the same shape in the same place), push 3 %, whip 2 %, flash 1.5 %, morph 1 % (inside a shot: morph()). Linked
// changes take ~30 frames at 60 fps (0.5 s), fast in, soft out; a dive ~21 frames; a whip ~16 frames, blurred.
// opts.trans types: 'cut' | 'match' (a cut; put the matching shape in the same place) | 'carry' {x, y: the thing that stays; the new
// world opens round it; tr.over(g, s) draws it on top} | 'pan' {dir} | 'bars' {dir 'up'|'down', from 'left'|'right', n, col} |
// 'reveal' {x, y, r: the window the old picture shrinks into, shape 'circle'|'round'|'photo', ring, glow, keep: seconds it stays
// before popping away, 'shot' = all shot} | 'into' {x, y, r: the window in the old picture the camera dives through, peek: seconds
// the new picture shows in it first} | 'push' | 'whip' | 'diag' | 'zoom' | 'iris' | 'dissolve' | 'flash'. tr.dur and tr.lead override.
const TDUR = { whip: 0.28, push: 0.5, pan: 0.6, diag: 0.6, zoom: 0.35, into: 0.36, reveal: 0.5, bars: 0.5, iris: 0.3, dissolve: 0.3, carry: 0.5, flash: 0.36 };
// how much of a transition runs BEFORE the new shot's first word: the fast part of a fast-in change lands on the word
const LEAD = { whip: 0.4, push: 0.3, pan: 0.35, diag: 0.3, zoom: 0.5, into: 0.45, reveal: 0.2, bars: 0.45, iris: 0.4, dissolve: 0.5, carry: 0.25, flash: 0.5 };
function shot(t0, t1, draw, opts = {}) { return { t0, t1, draw, trans: opts.trans || { type: 'auto' }, ground: opts.ground, name: opts.name || '', lock: opts.lock, drift: opts.drift, ambient: opts.ambient, moteCol: opts.moteCol }; }
// the style's motion rules from job.json (the card's "motion"): cam 'drift' = every shot breathes (a slow push and a drift, so depth()
// layers and bg() get parallax for free; opts.lock or opts.drift: 0 turns it off for one shot); trans = the linked changes used,
// in turn, wherever a shot gives no trans of its own ('cut' = plain cuts)
let MOTION = { cam: 'off', trans: 'cut' };
function autoTrans() { const L = Array.isArray(MOTION.trans) ? MOTION.trans : [MOTION.trans || 'cut']; let n = 0;
  SHOTS.forEach((s, i) => { if (s.trans.type !== 'auto') return; const ty = i === 0 ? 'cut' : L[n++ % L.length];
    s.trans = ty === 'pan' ? { type: 'pan', dir: ['up', 'left', 'down', 'right'][(n - 1) % 4] } : { type: ty }; }); }
const _A = new OffscreenCanvas(W, H), _B = new OffscreenCanvas(W, H), gA = _A.getContext('2d'), gB = _B.getContext('2d');
function clockOf(sh, t) { const st = t - sh.t0; return { t: st, f: st * FPS, T: t, dur: sh.t1 - sh.t0, k: (t0, kind, o) => ENTER(st, t0, kind, o),
  at: (w, a = 0) => wordAt(w, sh.t0 - 0.3 + a) - sh.t0, hit: (w, kind, o = {}) => hit(w, kind, { ...o, after: sh.t0 - 0.3 + (o.after || 0) }) - sh.t0 }; }
// paint one shot into g. cam = the camera offset of this frame (a push/whip moves the camera, and depth() turns that into
// parallax: far planes slower, near planes faster); clip = only inside the shot's moving frame window
// AMBIENT (creator 2026-10-27: "backgrounds locked, no environmental motion"): with MOTION.life every shot gets a quiet layer of
// floating motes in three depths (far ones small and slow, near ones bigger, soft and moving with the camera), drifting up and
// twinkling. shot opts: ambient: false (none: a clean diagram, space), ambient: 'dust' | 'snow' | 'spark' | number (how many,
// default 16), moteCol (default the card's motion.moteCol or soft white). The builder's own life (alive(), steam, birds) comes first.
function ambient(g, t, sh) { const kind = typeof sh.ambient === 'string' ? sh.ambient : 'dust', n = typeof sh.ambient === 'number' ? sh.ambient : kind === 'snow' ? 40 : 16, col = sh.moteCol || MOTION.moteCol || '#FFFFFF';
  const R = rng(Math.round(sh.t0 * 100) + 11); g.save();
  for (let i = 0; i < n; i++) { const z = [0.45, 1, 2.2][i % 3], k = 1 / z, sz = (kind === 'snow' ? 5 : kind === 'spark' ? 3 : 4) * k * lerp(0.7, 1.4, R()), vy = (kind === 'snow' ? 55 : -14) * k * lerp(0.6, 1.3, R());
    const x0 = R() * W, y0 = R() * H, ph = R() * 6.283, x = ((x0 + Math.sin(t * 0.6 + ph) * 26 * k + CAM.x * (k - 1)) % W + W) % W, y = ((y0 + vy * t + CAM.y * (k - 1)) % (H + 40) + H + 40) % (H + 40) - 20;
    const a = (kind === 'spark' ? 0.55 : 0.22) * (0.55 + 0.45 * Math.sin(t * lerp(1.2, 2.6, R()) + ph)) * (z < 0.6 ? 0.6 : 1);
    g.globalAlpha = a; if (z < 0.6) g.filter = 'blur(3px)'; g.fillStyle = col; ell(g, x, y, sz, sz); g.fill(); g.filter = 'none'; }
  g.restore(); }
function paint(g, sh, t, cam = { x: 0, y: 0 }, clip = false) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W, H);
  if (clip) { g.beginPath(); g.rect(cam.x, cam.y, W, H); g.clip(); }
  const amp = MOTION.cam === 'drift' && !sh.lock ? (sh.drift ?? 1) : 0;
  if (amp) { const st = t - sh.t0, sd = sh.t0 * 1.7, z = 1.02 + 0.022 * amp * io(clamp(st / Math.max(0.5, sh.t1 - sh.t0)));   // starts 2 % in, so a drift never shows an edge
    cam = { x: cam.x + Math.sin(st * 0.45 + sd) * W * 0.007 * amp, y: cam.y + Math.cos(st * 0.37 + sd) * H * 0.004 * amp };
    g.translate(W / 2, H * 0.45); g.scale(z, z); g.translate(-W / 2, -H * 0.45); }
  CAM = cam; NOW = t; g.translate(cam.x, cam.y); sh.draw(g, clockOf(sh, t)); if (MOTION.life && sh.ambient !== false) ambient(g, t, sh); CAM = { x: 0, y: 0 }; g.restore();
}
// motion smear along the move: a true box blur over the distance travelled this frame, trailing behind the motion. Built by
// halving passes (each pass averages the picture with itself shifted by d, d halves): 2^k even taps from ~2k draws, no ghosts.
const _C = new OffscreenCanvas(W, H), gC = _C.getContext('2d');
function smear(g, src, speed, axis, back) {
  let inp = src, d = speed / 2, k = 0; const bufs = [[_A, gA], [_B, gB]];
  while (d >= 1.5) { const [ob, og] = bufs[k]; og.setTransform(1, 0, 0, 1, 0, 0); og.filter = 'none'; og.globalCompositeOperation = 'copy'; og.globalAlpha = 1; og.drawImage(inp, 0, 0);
    og.globalCompositeOperation = 'source-over'; og.globalAlpha = 0.5; og.drawImage(inp, axis === 'x' ? back * d : 0, axis === 'y' ? back * d : 0); og.globalAlpha = 1;
    inp = ob; k ^= 1; d /= 2; }
  g.drawImage(inp, 0, 0); }
// the window a reveal shrinks into / an 'into' dives through: a circle (default), a rounded panel ('round', tr.aspect h/w) or a
// photo ('photo': a white border, deeper at the bottom). While it is big it is the frame itself; it rounds into its shape as it shrinks.
function windowed(g, tr, src, out, q, pop = 1) {
  const x = (tr.x ?? 0.5) * W, y = (tr.y ?? 0.42) * H, r = (tr.r ?? 0.24) * W, sh = tr.shape || 'circle', photo = sh === 'photo', asp = sh === 'circle' ? 1 : tr.aspect ?? 1.2;
  const w1 = W * 0.46, zEnd = r / w1, z = Math.exp(Math.log(zEnd) * q);                      // inner picture scale: 1 (fills the frame) -> its window
  const pw = lerp(W / 2, w1, q), ph = lerp(H / 2, w1 * asp, q), pcr = lerp(0, sh === 'circle' ? w1 : w1 * (photo ? 0.05 : 0.28), Math.pow(q, 0.7));
  const cx = lerp(W / 2, x, q), cy = lerp(H / 2, y, q), hw = pw * z, zo = hw / r;            // the outer picture moves with the same camera
  const ox = clamp(cx - zo * x, W - zo * W, 0), oy = clamp(cy - zo * y, H - zo * H, 0);     // the outer picture always covers the frame
  g.save(); g.translate(ox, oy); g.scale(zo, zo); g.drawImage(out, 0, 0); g.restore();
  if (pop <= 0.001) return;
  const k = z * pop, Hw = pw * k, Hh = ph * k, Cr = pcr * k, path = (e, eb = e) => rr(g, cx - Hw - e, cy - Hh - e, (Hw + e) * 2, (Hh + e) * 2 + (eb - e), Cr + e);
  if (tr.glow) glow(g, cx, cy, Math.max(Hw, Hh) * 1.7, tr.glow, 0.55 * q);
  if (tr.ring !== false) { const bw = (tr.ringW ?? (photo ? 22 : 14)) * zo * pop; g.save(); g.fillStyle = tr.ring || '#FFFFFF'; path(bw, photo ? bw * 4 : bw); g.fill(); g.restore(); }
  g.save(); path(0); g.clip(); g.translate(cx, cy); g.scale(k, k); g.translate(-W / 2, -H / 2); g.drawImage(src, 0, 0); g.restore();
}
// MOTIVATED CHANGES (creator 2026-10-27: "transitions not continuous or motivated"): an 'into', 'zoom' or 'carry' that gives no
// x, y goes through the outgoing shot's main thing (its hero, else its person, else its biggest device), found once per change
// from the old shot's own frame, so the eye is led into the next idea. A 'pan' travels with a slight push-in and a light smear.
const _D = new OffscreenCanvas(W, H), gD = _D.getContext('2d');
function anchorOf(tr, A, at) { if (tr._anc) return tr._anc; const keep = MARKS; MARKS = []; paint(gD, A, Math.max(A.t0, Math.min(A.t1 - 0.01, at)));
  const rank = { hero: 4, cast: 3, device: 2, furn: 1 }, ms = MARKS.filter(m => rank[m.kind]).map(m => ({ ...m, a: (m.box[2] - m.box[0]) * (m.box[3] - m.box[1]) }))
    .filter(m => m.a > W * H * 0.004).sort((p, q) => rank[q.kind] - rank[p.kind] || q.a - p.a); MARKS = keep;
  const m = ms[0]; tr._anc = m ? { x: clamp((m.box[0] + m.box[2]) / 2 / W, 0.12, 0.88), y: clamp((m.box[1] * 0.6 + m.box[3] * 0.4) / H, 0.12, 0.85) } : { x: 0.5, y: 0.42 };
  return tr._anc; }
window.render = function (t) {
  MARKS = [];
  const g = G; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  let i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = t < (SHOTS[0] ? SHOTS[0].t0 : 0) ? 0 : SHOTS.length - 1;
  const cur = SHOTS[i]; if (!cur) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
  // is a transition running? It starts LEAD x its length before the new shot's t0; an 'into' shows the new picture in its window
  // for tr.peek s first (p < 0), a reveal keeps the old picture in its window for tr.keep s after (p > 1)
  let k = -1, p = 0;
  for (const j of [i, i + 1]) { const s = SHOTS[j]; if (!s || j === 0 || s.trans.type === 'cut' || s.trans.type === 'match') continue;
    const ty = s.trans.type, d = s.trans.dur || TDUR[ty] || 0.3, a = s.t0 - d * (s.trans.lead ?? LEAD[ty] ?? 0.5);
    const pre = ty === 'into' ? s.trans.peek ?? 0.5 : 0, kp = s.trans.keep ?? 1, post = ty === 'reveal' ? (kp === 'shot' ? s.t1 - a : d + kp + 0.25) : d;
    if (t >= a - pre && t < a + post) { k = j; p = (t - a) / d; } }
  if (k < 0) { paint(g, cur, t); return; }
  const A = SHOTS[k - 1], B = SHOTS[k], tr0 = B.trans, dd = tr0.dur || TDUR[tr0.type] || 0.3, pc = clamp(p);
  const tr = ['into', 'zoom', 'carry'].includes(tr0.type) && tr0.x == null ? { ...tr0, ...anchorOf(tr0, A, B.t0 - dd * (tr0.lead ?? LEAD[tr0.type] ?? 0.5)) } : tr0;
  const e = ['whip', 'push', 'diag'].includes(tr.type) ? snap(pc, dd * FPS) : tr.type === 'pan' ? io(pc) : ['reveal', 'into', 'bars', 'carry'].includes(tr.type) ? lands(pc) : io(pc);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const dir = tr.dir || (tr.type === 'diag' ? 'down' : 'up'), sgn = dir === 'left' || dir === 'up' ? -1 : 1, axis = dir === 'left' || dir === 'right' ? 'x' : 'y', span = axis === 'x' ? W : H;
  // marks (the composition check) come from the shot that is mostly on screen
  const m0 = MARKS.length, keepMarks = (m1, m2, useB) => { MARKS = useB ? MARKS.slice(m1, m2) : MARKS.slice(m0, m1); };
  const over = () => { if (tr.over) { g.save(); tr.over(g, clockOf(B, t)); g.restore(); } };
  if (tr.type === 'whip' || tr.type === 'push' || tr.type === 'pan') {
    // the camera travels: each shot is painted with its camera offset (planes move at their own speed) inside its frame window
    const d = dd, sp = tr.type === 'pan' ? Math.abs(io(clamp(pc + 1 / FPS / d)) - e) * span * 0.35 : Math.abs(snap(pc + 1 / FPS / d, d * FPS) - e) * span * (tr.type === 'whip' ? 1 : 0.25);
    const oa = sgn * span * e, ob = oa - sgn * span, ca = axis === 'x' ? { x: oa, y: 0 } : { x: 0, y: oa }, cb = axis === 'x' ? { x: ob, y: 0 } : { x: 0, y: ob };
    paint(gA, A, t, ca, true); const m1 = MARKS.length; paint(gB, B, t, cb, true); keepMarks(m1, MARKS.length, p >= 0.5);
    gC.setTransform(1, 0, 0, 1, 0, 0); gC.globalAlpha = 1; gC.globalCompositeOperation = 'source-over'; gC.fillStyle = '#000'; gC.fillRect(0, 0, W, H); gC.drawImage(_A, 0, 0); gC.drawImage(_B, 0, 0);
    const zk = tr.type === 'pan' ? 1 + 0.05 * Math.sin(Math.PI * pc) : 1; g.save(); g.translate(W / 2, H / 2); g.scale(zk, zk); g.translate(-W / 2, -H / 2); smear(g, _C, sp, axis, -sgn); g.restore(); over();
    return;
  }
  if (tr.type === 'diag') {
    // the diagonal wipe (study 9): the new shot slides in behind an edge tilted ~16 degrees, higher on the right, snap then settle;
    // dir 'down' (default) = it comes from the top, 'up' = from the bottom; the old shot gives way a little, the new one settles into place
    const tn = Math.tan((tr.tilt ?? 16) * D2R), s = dir === 'up' ? -1 : 1, rise = W / 2 * tn, c = lerp(-rise, H + rise, e), off = (1 - e) * H * 0.25;
    paint(gA, A, t, { x: 0, y: s * e * H * 0.12 }); const m1 = MARKS.length; paint(gB, B, t, { x: 0, y: -s * off }); keepMarks(m1, MARKS.length, p >= 0.5);
    g.drawImage(_A, 0, 0); g.save(); g.beginPath();
    if (s > 0) { g.moveTo(0, c + rise); g.lineTo(W, c - rise); g.lineTo(W, -10); g.lineTo(0, -10); }
    else { g.moveTo(0, H - c + rise); g.lineTo(W, H - c - rise); g.lineTo(W, H + 10); g.lineTo(0, H + 10); }
    g.closePath(); g.clip(); g.drawImage(_B, 0, 0); g.restore(); over();
    return;
  }
  paint(gA, A, t); const m1 = MARKS.length; paint(gB, B, t); const m2 = MARKS.length;
  if (tr.type === 'reveal') {
    // zoom-out reveal: the camera pulls back and the old picture turns out to sit in a window of the new one; it stays tr.keep s,
    // then pops away (the builder may instead draw its own window in B and set keep: 0)
    keepMarks(m1, m2, true);
    const kp = tr.keep ?? 1, tEnd = dd + (kp === 'shot' ? 1e9 : kp), pop = p * dd <= tEnd ? 1 : clamp(1 - out((p * dd - tEnd) * FPS * 1.6));
    windowed(g, tr, _A, _B, e, pop);
  } else if (tr.type === 'into') {
    // zoom-through: a window in the old picture (popping in tr.peek s before, showing the new picture) grows round the camera as
    // it dives in, and the new picture fills the frame
    keepMarks(m1, m2, p >= 0.5);
    const pk = tr.peek ?? 0.5, pop = p >= 0 || pk <= 0 ? 1 : popc(clamp((p * dd + pk) * FPS / 12));
    windowed(g, tr, _B, _A, p >= 0 ? 1 - e : 1, pop);
  } else if (tr.type === 'bars') {
    // object wipe: tall bars run up (or down) their columns one after another, ~2 frames apart: the old picture above a bar, the
    // new one below it. tr.col (default the brand blue), tr.n bars (5), tr.from 'right' starts at the right, tr.len bar length (H)
    keepMarks(m1, m2, p >= 0.5);
    const n = tr.n || 5, st = tr.stagger ?? 0.09, cw = W / n, col = tr.col || PAL.blue, L = H * (tr.len ?? 0.55), down = dir === 'down';
    for (let c = 0; c < n; c++) { const ci = tr.from === 'right' ? n - 1 - c : c, q = lands(clamp((pc - ci * st) / (1 - (n - 1) * st))), x0 = Math.floor(c * cw), w = Math.ceil(cw) + 1;
      const top = lerp(H, -L, q), seg = (y0, y1) => down ? [H - y1, H - y0] : [y0, y1];
      const [a0, a1] = seg(0, clamp(top, 0, H)), [b0, b1] = seg(clamp(top + L, 0, H), H), [c0, c1] = seg(clamp(top, 0, H), clamp(top + L, 0, H));
      if (a1 > a0) g.drawImage(_A, x0, a0, w, a1 - a0, x0, a0, w, a1 - a0);
      if (b1 > b0) g.drawImage(_B, x0, b0, w, b1 - b0, x0, b0, w, b1 - b0);
      if (c1 > c0) { g.fillStyle = c % 2 ? col : lt(col, 0.06); g.fillRect(x0, c0, w, c1 - c0); g.fillStyle = lt(col, 0.18); const ed = Math.min(L * 0.06, c1 - c0); g.fillRect(x0, down ? c1 - ed : c0, w, ed); } }
  } else if (tr.type === 'carry') {
    // carry: one thing stays exactly where it is (draw it the same in both shots, or with tr.over on top) and the new world opens
    // round it from its centre
    keepMarks(m1, m2, p >= 0.5);
    const x = (tr.x ?? 0.5) * W, y = (tr.y ?? 0.48) * H, R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * e;
    g.drawImage(_A, 0, 0); g.save(); ell(g, x, y, R, R); g.clip(); g.drawImage(_B, 0, 0); g.restore();
  } else if (tr.type === 'zoom') {                    // dive into (x, y) of the old shot, come out of the same point in the new one
    keepMarks(m1, m2, p >= 0.5);
    const x = (tr.x ?? 0.5) * W, y = (tr.y ?? 0.4) * H;
    if (p < 0.5) { const z = Math.pow(5, io(p * 2) * 1); g.save(); g.translate(x, y); g.scale(z, z); g.translate(-x, -y); g.drawImage(_A, 0, 0); g.restore(); }
    else { const z = lerp(0.3, 1, out((p - 0.5) * 2 * 14) / out(14)); g.save(); g.translate(x, y); g.scale(z, z); g.translate(-x, -y); g.fillStyle = '#000'; g.drawImage(_B, 0, 0); g.restore();
      if (p < 0.6) { g.globalAlpha = 1 - (p - 0.5) * 10; const zz = 5; g.save(); g.translate(x, y); g.scale(zz, zz); g.translate(-x, -y); g.drawImage(_A, 0, 0); g.restore(); g.globalAlpha = 1; } }
  } else if (tr.type === 'iris') {
    keepMarks(m1, m2, p >= 0.5);
    const x = (tr.x ?? 0.5) * W, y = (tr.y ?? 0.45) * H, r = Math.hypot(W, H) * e; g.drawImage(_A, 0, 0); g.save(); ell(g, x, y, r, r); g.clip(); g.drawImage(_B, 0, 0); g.restore();
    if (tr.ring) { g.save(); g.strokeStyle = tr.ring; g.lineWidth = 22; ell(g, x, y, r, r); g.stroke(); g.restore(); }
  } else if (tr.type === 'dissolve') { keepMarks(m1, m2, p >= 0.5); g.drawImage(_A, 0, 0); g.globalAlpha = clamp(p); g.drawImage(_B, 0, 0); g.globalAlpha = 1; }
  else if (tr.type === 'flash') { keepMarks(m1, m2, p >= 0.5); g.drawImage(p < 0.5 ? _A : _B, 0, 0); g.fillStyle = `rgba(255,255,255,${clamp(1 - Math.abs(p - 0.5) * 4)})`; g.fillRect(0, 0, W, H); }
  else { keepMarks(m1, m2, p >= 0.5); g.drawImage(p < 0.5 ? _A : _B, 0, 0); }
  over();
};
// start(): load the fonts and the voice's words, draw frame 0, tell the renderer we are ready
function start() {
  const faces = [new FontFace('FlatRound', 'url(fonts/Fredoka.ttf)'), new FontFace('FlatHeavy', 'url(fonts/Montserrat-Black.ttf)'), new FontFace('FlatBold', 'url(fonts/Baloo2.ttf)')];
  Promise.all(faces.map(f => f.load().then(ff => document.fonts.add(ff)).catch(() => null)))
    .then(() => fetch('./words.json').then(r => r.json()).catch(() => []))
    .then(w => { WORDS = w || []; return fetch('./job.json').then(r => r.json()).catch(() => ({})); })
    .then(j => { window.JOB = j || {}; MOTION = { ...MOTION, ...(j && j.motion || {}) }; autoTrans(); return window.beforeReady ? window.beforeReady() : null; })   /* map.js: world data + the tiles this page needs */
    .then(() => { window.render(0); window.ready = true; })
    .catch(e => { window.failed = String(e); });
}
window.addEventListener('error', e => { window.failed = String(e.message || e); });
