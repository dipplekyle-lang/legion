/* history.js — the HISTORY kit: a history channel told in sepia oil paintings and an embossed parchment map.
   Learned from a 19-minute city history (learned/history/): every picture is a painting that moves on a slow preset
   (x1.17 push drifting up, x1.09 drift, x0.84 pull-out, a 26 % pan), pictures join with 0.7 s sine dissolves, one
   painting is re-cropped 10 % closer with a 0.6 s dissolve, a Trajan-capital title card names the place or event,
   rulers get a round gold-rimmed portrait bottom left, empires spread over a cream relief map clipped to the land,
   routes draw with open arrowheads, battles get a crossed-swords roundel, turning points burn through like paper.
   Fonts: Hi Cap (Cinzel), Hi Serif (EB Garamond, roman + italic). Every frame is computed from t alone.

   Scene data (kits.py prepares it — pictures arrive as data URIs with their size):
     S.shots  [{src, iw, ih, t0, t1, m0, m1, c0:[x,y], s0, c1:[x,y], s1, enter:"cut"|"dissolve"|"reframe"|"burn",
                ed, figure:{src, iw, ih, x, y, h}}]    — the paintings of the scene, in order (times in scene seconds)
     S.prev   {src, iw, ih, c:[x,y], s, v:[dx,dy], vs} — the picture before this segment (a still continues its move)
     S.title / S.medallion / S.counter / S.map        — the overlays and the map (see each part below)            */
const CSS = `
.cap{font-family:'Hi Cap','Cinzel',Georgia,serif}
.srf{font-family:'Hi Serif','EB Garamond',Georgia,serif}
.it{font-family:'Hi Serif','EB Garamond',Georgia,serif;font-style:italic}
#ttl{position:absolute;left:0;width:1920px;text-align:center;color:#E9D6C4;pointer-events:none;font-size:0;line-height:0}
#ttl .t{display:inline-block;vertical-align:top;font-weight:650;white-space:nowrap;line-height:1;color:transparent;
  background-image:linear-gradient(100deg,#E9D6C4 0%,#E9D6C4 42%,#FFF4DC 48%,#FFFBF2 50%,#FFF4DC 52%,#E9D6C4 58%,#E9D6C4 100%);
  background-size:260% 100%;background-position:115% 0;-webkit-background-clip:text;background-clip:text}
#ttl .r{height:2px;margin:0 auto;background:linear-gradient(90deg,rgba(233,214,196,0),rgba(233,214,196,.62) 22%,rgba(233,214,196,.62) 78%,rgba(233,214,196,0))}
#ttl .s{display:block;white-space:nowrap;line-height:1;color:#D5C5B6}
#med{position:absolute;pointer-events:none}
#med .disc{position:absolute;border-radius:50%;background-size:cover;background-repeat:no-repeat}
#med .n{position:absolute;left:-200px;width:400px;text-align:center;white-space:nowrap;font-weight:600;color:#DDD1BE;line-height:1}
#ctr{position:absolute;background:rgba(92,75,48,.93);pointer-events:none}
#ctr .l{position:absolute;left:24px;top:14px;font-size:27px;color:#D6C8AE}
#ctr .v{position:absolute;left:22px;top:40px;font-size:70px;line-height:1;color:#EDE3D2;letter-spacing:.01em}
#ctr .u{position:absolute;left:24px;right:24px;top:122px;height:2px;background:rgba(214,190,140,.8)}
`;
const esio = x => (1 - Math.cos(Math.PI * clamp(x))) / 2;
const TAU = Math.PI * 2;
const TALL = H > W;   // a vertical Short: the title in the upper third, the medallion and counter under the captions
let cv, cx, pics = {}, vids = {}, noiseTile = null, cloudTile = null, R = null, RX = null, B1 = null, B1X = null, B2 = null, B2X = null, burnF = null;

// ── pictures ────────────────────────────────────────────────────────────────────────────────────
function img(src) {
  if (!src) return null;
  if (!pics[src]) { const im = new Image(); im.src = src; pics[src] = im; }
  return pics[src];
}
// a painting set in motion (image-to-video): one <video> per clip, seeked frame by frame before each frame is drawn
function vid(key, src) {
  if (!key) return null;
  if (!vids[key] && src) {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true;
    v._ready = fetch(src).then(r => r.blob()).then(b => { v.src = URL.createObjectURL(b); return new Promise(res => {
      v.addEventListener('loadeddata', () => res(), { once: true }); v.addEventListener('error', () => res(), { once: true }); }); });
    vids[key] = v;
  }
  return vids[key] || null;
}
function seekTo(v, tt) {
  if (!v || !v.duration) return null;
  const want = clamp(tt, 0, Math.max(0, v.duration - 0.04));
  if (Math.abs(v.currentTime - want) < 0.004 && v.readyState >= 2) return null;
  return new Promise(res => { const done = () => res(); v.addEventListener('seeked', done, { once: true }); setTimeout(done, 1500); v.currentTime = want; });
}
function camAt(sh, t) {
  // where the painting's camera is at scene time t: centre (fraction of the picture) and zoom (1 = cover-fit)
  const m0 = sh.m0 != null ? sh.m0 : sh.t0, m1 = sh.m1 != null ? sh.m1 : sh.t1;
  const p = esio((t - m0) / Math.max(0.01, m1 - m0));
  const ls = Math.log(sh.s0 || 1) + (Math.log(sh.s1 || 1) - Math.log(sh.s0 || 1)) * p;
  return { x: lerp(sh.c0[0], sh.c1[0], p), y: lerp(sh.c0[1], sh.c1[1], p), s: Math.exp(ls) };
}
function drawPic(c, im, iw, ih, x, y, s, alpha, filter) {
  if (!im || !iw) return;
  if (im.tagName === 'VIDEO' ? im.readyState < 2 : !im.complete) return;
  const base = Math.max(W / iw, H / ih) * s;
  c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
  if (filter) c.filter = filter;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(im, W / 2 - x * iw * base, H / 2 - y * ih * base, iw * base, ih * base);
  c.restore();
}
function drawFigure(c, sh, cam, alpha) {
  const f = sh.figure; if (!f || !f.src) return;
  const im = img(f.src); if (!im || !im.complete) return;
  if (!f._pin) {
    const c0 = camAt(sh, sh.t0), b0 = Math.max(W / sh.iw, H / sh.ih) * c0.s;
    f._pin = { px: c0.x + ((f.x != null ? f.x : 0.42) * W - W / 2) / (sh.iw * b0),
               py: c0.y + ((f.y != null ? f.y : 1.02) * H - H / 2) / (sh.ih * b0),
               hp: (f.h || 0.62) * H / (sh.ih * b0) };
  }
  const base = Math.max(W / sh.iw, H / sh.ih) * cam.s;
  const fx = W / 2 + (f._pin.px - cam.x) * sh.iw * base, fy = H / 2 + (f._pin.py - cam.y) * sh.ih * base;
  const hh = f._pin.hp * sh.ih * base, ww = hh * f.iw / f.ih;
  c.save(); c.globalAlpha = alpha;
  c.shadowColor = 'rgba(20,12,4,.35)'; c.shadowBlur = 18; c.shadowOffsetX = 6; c.shadowOffsetY = 2;
  c.filter = 'sepia(.12) saturate(1.1) brightness(.92) contrast(1.08)';
  c.drawImage(im, fx - ww / 2, fy - hh, ww, hh);
  c.restore();
}
function drawShot(c, sh, t, alpha, filter) {
  const cam = camAt(sh, t);
  const v = sh.video ? vid(sh.vkey, sh.video) : null;
  if (v && v.readyState >= 2) drawPic(c, v, sh.vw || 1920, sh.vh || 1080, cam.x, cam.y, cam.s, alpha, filter);
  else drawPic(c, img(sh.src), sh.iw, sh.ih, cam.x, cam.y, cam.s, alpha, filter);
  if (sh.figure) drawFigure(c, sh, cam, alpha);
}
function drawPrev(c, t, alpha) {
  const p = S.prev; if (!p || !p.src) return;
  // a still keeps moving under the dissolve at the speed it had; a graphic's last frame holds
  const x = p.c ? p.c[0] + (p.v ? p.v[0] * t : 0) : 0.5, y = p.c ? p.c[1] + (p.v ? p.v[1] * t : 0) : 0.5;
  const s = (p.s || 1) * Math.exp((p.vs || 0) * t);
  drawPic(c, img(p.src), p.iw, p.ih, x, y, s, alpha);
}

// ── the paper burn ─────────────────────────────────────────────────────────────────────────────
function burnField() {
  // a fixed fractal noise field (value noise, 4 octaves) at 1/4 of the frame: the burn front's ragged, patchy edge
  if (burnF) return burnF;
  const w = Math.round(W / 4), h = Math.round(H / 4), f = new Float32Array(w * h);
  let s = ((S.seed || 7) * 7919) >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grid = (n) => { const g = []; for (let i = 0; i < (n + 1) * (n + 1); i++) g.push(r()); return g; };
  const oct = [[5, 0.42], [11, 0.28], [23, 0.18], [47, 0.12]];
  const gs = oct.map(([n]) => grid(n));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    oct.forEach(([n, a], k) => {
      const gx = x / w * n, gy = y / h * n * (H / W) * 1.6, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
      const g = gs[k], q = (i, j) => g[Math.min(n, j) * (n + 1) + Math.min(n, i)];
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      v += a * lerp(lerp(q(ix, iy), q(ix + 1, iy), sx), lerp(q(ix, iy + 1), q(ix + 1, iy + 1), sx), sy);
    });
    f[y * w + x] = v;
  }
  burnF = { w, h, f, mask: document.createElement('canvas'), edge: document.createElement('canvas'), dir: null };
  burnF.mask.width = burnF.edge.width = w; burnF.mask.height = burnF.edge.height = h;
  return burnF;
}
function burnValues(B, dir) {
  if (B.dir === dir) return B.v;
  const { w, h, f } = B, v = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = dir === 'br' || dir === 'tr' ? 1 - x / w : x / w, fy = dir === 'tl' || dir === 'tr' ? y / h : 1 - y / h;
    v[y * w + x] = (fx * 0.55 + fy * 0.45) * 0.5 + f[y * w + x] * 0.5;
  }
  B.srt = Float32Array.from(v).sort();
  B.v = v; B.dir = dir; return v;
}
function drawBurn(c, p, drawOld, dir) {
  // p: 0..1 through the burn. The old picture (drawn by drawOld into a layer) burns away from one corner (measured:
  // lower left at 2:43, lower right at 13:58) with holes opening ahead of the front; a thin gold rim and a narrow
  // charred band ride every edge.
  const B = burnField(), { w, h } = B, v = burnValues(B, dir || 'bl');
  // the share of the picture burned follows the reference (3 / 20 / 45 / 70 / 90 / 99 % at 0.08 / 0.23 / 0.38 /
  // 0.54 / 0.69 / 0.92 of the burn): the front's threshold is that quantile of the field
  const cov = p <= 0 ? -1 : p >= 1 ? 2 : 1 - Math.pow(1 - p, 1.3);
  const thr = cov < 0 ? B.srt[0] - 0.05 : cov > 1 ? B.srt[B.srt.length - 1] + 0.05 : B.srt[Math.min(B.srt.length - 1, Math.floor(cov * B.srt.length))];
  const mc = B.mask.getContext('2d'), ec = B.edge.getContext('2d');
  const md = mc.createImageData(w, h), ed = ec.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const d = v[i] - thr;                                   // < 0 burned, > 0 still there
    md.data[i * 4 + 3] = clamp(d / 0.004 + 0.5) * 255;
    let r = 0, g = 0, b = 0, a = 0;
    if (d > -0.007 && d < 0.024) {
      if (d < 0.0015) {                                      // the glowing rim, gold to pale yellow
        const k = 1 - Math.abs(d + 0.0028) / 0.0045;
        r = 255; g = 168 + 72 * clamp(k); b = 50 + 80 * clamp(k); a = clamp(k * 1.35);
      } else {                                               // the char just outside it
        const k = 1 - (d - 0.0015) / 0.0225;
        r = 40; g = 24; b = 12; a = clamp(k * 1.3) * 0.94;
      }
    }
    ed.data[i * 4] = r; ed.data[i * 4 + 1] = g; ed.data[i * 4 + 2] = b; ed.data[i * 4 + 3] = a * 255;
  }
  mc.putImageData(md, 0, 0); ec.putImageData(ed, 0, 0);
  B1X.clearRect(0, 0, W, H); drawOld(B1X);
  B1X.save(); B1X.globalCompositeOperation = 'destination-in'; B1X.imageSmoothingEnabled = true;
  B1X.drawImage(B.mask, 0, 0, W, H); B1X.restore();
  c.drawImage(B1, 0, 0);
  c.save(); c.imageSmoothingEnabled = true; c.filter = 'blur(0.8px)'; c.drawImage(B.edge, 0, 0, W, H); c.restore();
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.filter = 'blur(6px)'; c.drawImage(B.edge, 0, 0, W, H); c.restore();
}

// ── the painting layer ─────────────────────────────────────────────────────────────────────────
function edOf(sh) { return sh.ed || (sh.enter === 'reframe' ? 0.6 : sh.enter === 'burn' ? 1.3 : 0.7); }
function winOf(shots, i) {
  // [start, end] of shot i's entrance: centred on its boundary when the shot before it is in the scene, after its
  // start when it enters from S.prev (a graphic's last frame, or the picture of the slot before)
  const sh = shots[i], ed = edOf(sh);
  if (sh.enter === 'cut' || (i === 0 && !S.prev)) return [sh.t0, sh.t0];
  return i > 0 ? [sh.t0 - ed / 2, sh.t0 + ed / 2] : [sh.t0, sh.t0 + ed];
}
function paintings(c, t) {
  const shots = S.shots || [];
  c.fillStyle = '#1A120A'; c.fillRect(0, 0, W, H);
  if (!shots.length) { if (S.prev) drawPrev(c, t, 1); return; }
  let k = 0;
  for (let i = 0; i < shots.length; i++) if (t >= winOf(shots, i)[0] - 1e-6) k = i;
  const sh = shots[k], [w0, w1] = winOf(shots, k), span = Math.max(0.001, w1 - w0), into = t - w0;
  const before = k > 0 ? (tt => drawShot(c, shots[k - 1], tt, 1)) : (S.prev ? (tt => drawPrev(c, tt, 1)) : null);
  const washF = (x) => { const wsh = 1 - esio(seg(x, span * 0.45, span + 0.5)); return `brightness(${1 + 0.12 * wsh}) contrast(${1 - 0.12 * wsh}) saturate(${1 - 0.15 * wsh})`; };
  if (sh.enter === 'burn' && before && into < span) {
    drawShot(c, sh, t, 1, washF(into));
    drawBurn(c, clamp(into / span), (lc) => { lc.fillStyle = '#1A120A'; lc.fillRect(0, 0, W, H); if (k > 0) drawShot(lc, shots[k - 1], t, 1); else drawPrev(lc, t, 1); }, sh.dir || S.burn_dir || 'bl');
    return;
  }
  if (sh.enter === 'burn' && into >= span && into < span + 0.5) { drawShot(c, sh, t, 1, washF(into)); return; }
  if ((sh.enter === 'dissolve' || sh.enter === 'reframe') && before && into < span) {
    before(t);
    drawShot(c, sh, t, esio(into / span));
    return;
  }
  drawShot(c, sh, t, 1);
}

// ── the title card ─────────────────────────────────────────────────────────────────────────────
function buildTitle() {
  const T = S.title; if (!T || !T.text) return;
  const el = $(`<div id="ttl"><div class="t cap"></div><div class="r"></div><div class="s it"></div></div>`);
  scene.appendChild(el); el.style.width = W + 'px';
  const t = el.querySelector('.t'), r = el.querySelector('.r'), s = el.querySelector('.s');
  t.textContent = String(T.text).toUpperCase(); s.textContent = T.sub || '';
  const size = T.size || 62;                               // Cinzel caps are 0.70 em: 43 px capitals, as measured
  t.style.fontSize = size + 'px';
  t.style.letterSpacing = (T.track || 0.155) + 'em'; t.style.paddingLeft = (T.track || 0.155) + 'em';
  fit(t, TALL ? W - 140 : 1560, size, 40);
  const fs = parseFloat(t.style.fontSize);
  s.style.fontSize = (T.sub_size || 37) + 'px'; s.style.letterSpacing = '0.03em';
  // measured (1080 lines): cap centre y 742, the rule's top y 800 (2 px, 385 px wide), the subtitle's centre y 837
  el.style.top = ((T.y || (TALL ? 560 : 742)) - 0.4516 * fs).toFixed(1) + 'px';
  r.style.marginTop = (T.rule_gap != null ? T.rule_gap : (800 - 742 - 0.5484 * fs)).toFixed(1) + 'px';
  r.style.width = (T.rule_w || (TALL ? 320 : 385)) + 'px';
  s.style.marginTop = (T.sub_gap || 15) + 'px';
  parts.title = { el, t, r, s, size: parseFloat(t.style.fontSize) };
}
function frameTitle(t) {
  const P_ = parts.title; if (!P_) return;
  const T = S.title, tin = T.t_in != null ? T.t_in : 0.67, tout = T.t_out != null ? T.t_out : Math.min(D - 1.0, tin + 4.1);
  const pin = eo3(seg(t, tin, tin + 0.4)), pout = ei3(seg(t, tout, tout + 0.35));
  const spread = 0.30 * (1 - pin) + 0.30 * pout;
  const tr = T.track || 0.155;
  P_.t.style.letterSpacing = (tr + spread) + 'em'; P_.t.style.paddingLeft = (tr + spread) + 'em';
  P_.t.style.opacity = seg(t, tin, tin + 0.25) * (1 - seg(t, tout + 0.05, tout + 0.35));
  P_.t.style.filter = `blur(${(6 * (1 - pin) + 6 * pout).toFixed(2)}px)`;
  const gl = seg(t, tin + 0.45, tin + 1.45);               // the glint: 1 s, left to right, once
  P_.t.style.backgroundPosition = `${(115 - 130 * esio(gl)).toFixed(2)}% 0`;
  const rw = eo3(seg(t, tin + 0.3, tin + 0.7)) * (1 - eo3(seg(t, tout - 0.05, tout + 0.3)));
  P_.r.style.transform = `scaleX(${rw.toFixed(4)})`; P_.r.style.opacity = rw > 0.001 ? 1 : 0;
  const sp = eo3(seg(t, tin + 0.6, tin + 0.95)), so = seg(t, tout - 0.05, tout + 0.3);
  P_.s.style.opacity = (T.sub ? sp * (1 - so) : 0) * 0.92;
  P_.s.style.filter = `blur(${(4 * (1 - sp) + 4 * so).toFixed(2)}px)`;
}

// ── the portrait medallion ─────────────────────────────────────────────────────────────────────
function buildMedallion(M, into) {
  if (!M || !M.src) return null;
  const d = M.size || 175;
  const el = $(`<div id="med"><div class="disc"></div><div class="n cap"></div></div>`);
  (into || scene).appendChild(el);
  const disc = el.querySelector('.disc'), n = el.querySelector('.n');
  // the picture covers the disc, is zoomed so the face is ~42 % of it, and the face sits in the middle
  const iw = M.iw || 900, ih = M.ih || 506, k = Math.max(d / iw, d / ih) * (M.zoom || 1), bw = iw * k, bh = ih * k;
  const bx = Math.min(0, Math.max(d - bw, d / 2 - (M.focus ? M.focus[0] : 0.5) * bw));
  const by = Math.min(0, Math.max(d - bh, d / 2 - (M.focus ? M.focus[1] : 0.36) * bh));
  disc.style.cssText += `left:${-d / 2}px;top:${-d / 2}px;width:${d}px;height:${d}px;background-image:url(${M.src});` +
    `background-position:${bx.toFixed(1)}px ${by.toFixed(1)}px;background-size:${bw.toFixed(1)}px ${bh.toFixed(1)}px;` +
    `box-shadow:inset 0 0 0 2px rgba(34,22,10,.85),inset 0 0 22px 6px rgba(22,14,6,.55),0 0 0 ${(d * 0.026).toFixed(1)}px #B09A66,` +
    `0 0 0 ${(d * 0.036).toFixed(1)}px rgba(40,27,12,.9),0 0 26px 10px rgba(12,8,3,.5);filter:sepia(.9) saturate(1.25) contrast(1.05) brightness(.93)`;
  n.textContent = String(M.name || '').toUpperCase();
  const nfs = M.name_size || 24;
  n.style.fontSize = nfs + 'px'; n.style.letterSpacing = '0.08em';
  // measured: the name's cap centre 120 px under the disc's centre (Cinzel caps: centre at 0.452 em in a line-height:1 box)
  n.style.top = ((M.name_dy || 120) - 0.452 * nfs).toFixed(1) + 'px';
  return { el, disc, n };
}
function frameMedallion(pm, M, t, x, y) {
  if (!pm) return;
  // measured (4:38.3, 18:25.2): r = 0.77, 0.89, 0.98, 1.03, 1.006 of its size at +0.08/0.18/0.28/0.48/0.88 s —
  // a damped spring, 1 - 0.38 e^(-5t) cos(5t)
  const tin = M.t_in != null ? M.t_in : 0.70, tau = t - tin;
  const sc = tau <= 0 ? 0.62 : 1 - 0.38 * Math.exp(-5 * tau) * Math.cos(5 * tau);
  pm.el.style.left = x + 'px'; pm.el.style.top = y + 'px';
  pm.el.style.transform = `scale(${sc.toFixed(4)})`;
  pm.el.style.opacity = seg(t, tin, tin + 0.06) * (M.t_out != null ? 1 - seg(t, M.t_out, M.t_out + 0.35) : 1);
  pm.el.style.filter = `blur(${(2.5 * (1 - seg(t, tin, tin + 0.25))).toFixed(2)}px)`;
}

// ── the population counter ─────────────────────────────────────────────────────────────────────
function buildCounter() {
  const C = S.counter; if (!C) return;
  const el = $(`<div id="ctr"><div class="l it"></div><div class="v srf"></div><div class="u"></div></div>`);
  scene.appendChild(el);
  el.style.left = (C.x || (TALL ? (W - (C.w || 355)) / 2 : 1422)) + 'px'; el.style.top = (C.y || (TALL ? 1500 : 828)) + 'px'; el.style.width = (C.w || 355) + 'px'; el.style.height = (C.h || 146) + 'px';
  el.querySelector('.l').textContent = C.label || 'Population';
  parts.counter = { el, v: el.querySelector('.v') };
}
function frameCounter(t) {
  const C = S.counter, pc = parts.counter; if (!pc) return;
  // measured (15:31): the box at +0.9 s, the count from +1.1 s for 1.9 s (exponential, 338,136 / 191,288 / 119,820 /
  // 66,478 / 52,809 at +1.3 / 1.5 / 1.7 / 2.1 / 2.5 s), out at +3.0 s in 0.3 s
  const tin = C.t_in != null ? C.t_in : 0.9, dur = C.count_s || 1.9, tout = C.t_out != null ? C.t_out : tin + dur + 0.2;
  const u = seg(t, tin + 0.25, tin + 0.25 + dur), k = 6.3, done = (1 - Math.exp(-k * u)) / (1 - Math.exp(-k));
  const a = Number(C.from), b = Number(C.to);
  const v = isFinite(a) && isFinite(b) ? a + (b - a) * done : b;
  pc.v.textContent = (C.prefix || '') + fmt(Math.round(v)) + (C.suffix || '');
  pc.el.style.opacity = seg(t, tin, tin + 0.3) * (1 - seg(t, tout, tout + 0.3));
}

// ── the parchment map ──────────────────────────────────────────────────────────────────────────
function mapCam(t) {
  const M = S.map, a = M.cam0, b = M.cam1 || M.cam0, f = M.fly;
  const p = esio(t / Math.max(0.01, D));
  let x = lerp(a[0], b[0], p), y = lerp(a[1], b[1], p), z = Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), p));
  if (f) {
    const q = eio3(seg(t, f.t0, f.t1));
    x = lerp(x, f.x, q); y = lerp(y, f.y, q); z = Math.exp(lerp(Math.log(z), Math.log(f.z), q));
  }
  return { x, y, z };
}
function ringsPath(c, rings) {
  c.beginPath();
  for (const r of rings) {
    if (!r || r.length < 6) continue;
    c.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]);
    c.closePath();
  }
}
function toScreen(cam, x, y) { return [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2]; }
function worldT(c, cam) { c.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.x * cam.z, H / 2 - cam.y * cam.z); }
function spacedText(c, txt, x, y, font, spacing, color, alpha, align) {
  c.save(); c.font = font; c.fillStyle = color; c.globalAlpha = alpha; c.textBaseline = 'middle';
  try { c.letterSpacing = spacing + 'px'; } catch (e) { }
  c.textAlign = align || 'center';
  c.fillText(txt, x + (align === 'left' ? 0 : spacing / 2), y);
  c.restore();
}
function paperNoise() {
  if (noiseTile) return noiseTile;
  const n = 256, cnv = document.createElement('canvas'); cnv.width = cnv.height = n;
  const x = cnv.getContext('2d'), im = x.createImageData(n, n);
  let s = 424242; const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const g = []; const G = 9; for (let i = 0; i < G * G; i++) g.push(r());
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
    const gx = xx / n * (G - 1), gy = y / n * (G - 1), ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const q = (i, j) => g[(j % (G - 1)) * G + (i % (G - 1))];
    const v = lerp(lerp(q(ix, iy), q(ix + 1, iy), fx), lerp(q(ix, iy + 1), q(ix + 1, iy + 1), fx), fy);
    const fine = r();
    const k = 0.955 + 0.035 * v + 0.01 * fine;
    const i = (y * n + xx) * 4; im.data[i] = 255 * k; im.data[i + 1] = 247 * k; im.data[i + 2] = 232 * k; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0); noiseTile = cnv; return cnv;
}
function lineProgress(pts, p) {
  // the first p of a polyline (flat [x,y,...]) and the tip's direction
  let L = 0; const seglen = [];
  for (let i = 2; i < pts.length; i += 2) { const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); seglen.push(d); L += d; }
  let want = L * clamp(p), out = [pts[0], pts[1]], ang = 0;
  for (let i = 0; i < seglen.length; i++) {
    const a = [pts[i * 2], pts[i * 2 + 1]], b = [pts[i * 2 + 2], pts[i * 2 + 3]];
    ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (want >= seglen[i]) { out.push(b[0], b[1]); want -= seglen[i]; }
    else { const f = want / Math.max(1e-6, seglen[i]); out.push(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); break; }
  }
  return { pts: out, ang };
}
function drawMap(c, t) {
  const M = S.map, cam = mapCam(t), pal = M.pal || {};
  const sea = pal.sea || '#BDC0B0', seaLine = pal.sea_line || '#8E9080', land = pal.land || '#DACBA6', coast = pal.coast || '#5E5638';
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = sea; c.fillRect(0, 0, W, H);
  // the engraved water lines: rings around every coast, the land drawn over their inner halves
  worldT(c, cam);
  // the engraved water lines: rings round every coast, spaced with the map's scale — none on an empire-wide view,
  // 2-3 clear rings on a region, wide ones round a city's harbour (as on the reference at 1:56, 0:12 and 0:36)
  const kmNow = (M.km || 2400) / cam.z, ringA = clamp((3300 - kmNow) / 1500);
  if (ringA > 0.02) {
    const sp = 11 * Math.sqrt(2400 / Math.max(250, kmNow));
    for (const [k, w] of [[3.3, 1.2], [2.1, 1.3], [1.0, 1.45]]) {
      const d = sp * k;
      ringsPath(c, M.land);
      c.lineJoin = 'round';
      c.strokeStyle = seaLine; c.globalAlpha = 0.5 * ringA; c.lineWidth = (2 * d) / cam.z; c.stroke();
      c.strokeStyle = sea; c.globalAlpha = 1; c.lineWidth = (2 * d - 2 * w) / cam.z; c.stroke();
    }
  }
  ringsPath(c, M.land);
  c.strokeStyle = coast; c.globalAlpha = 0.9; c.lineWidth = 3.2 / cam.z; c.stroke(); c.globalAlpha = 1;
  ringsPath(c, M.land); c.fillStyle = land; c.fill('nonzero');
  // realms: each drawn opaque in its own layer (so the member countries' borders vanish), revealed, then laid on
  for (const r of M.realms || []) {
    const tin = r.t_in != null ? r.t_in : 0.8, tout = r.t_out;
    let a = r.mode === 'fade' ? seg(t, tin, tin + 0.8) : (t >= tin ? 1 : 0);
    if (tout != null) a *= 1 - seg(t, tout, tout + (r.out_s || 0.9));
    if (a <= 0.001) continue;
    RX.setTransform(1, 0, 0, 1, 0, 0); RX.clearRect(0, 0, W, H);
    worldT(RX, cam);
    ringsPath(RX, r.rings);
    RX.lineJoin = 'round'; RX.strokeStyle = r.edge || '#6E4A36'; RX.lineWidth = 4.6 / cam.z; RX.stroke();
    ringsPath(RX, r.rings); RX.fillStyle = r.fill; RX.fill('nonzero');
    if (r.mode !== 'fade') {
      // a soft circle grows from the realm's seat over spread_s (ease-out)
      const [sx, sy] = toScreen(cam, r.seat[0], r.seat[1]);
      const rad = (r.reach || 1400) * cam.z * eo3(seg(t, tin, tin + (r.spread_s || 1.8))) + 1;
      RX.setTransform(1, 0, 0, 1, 0, 0); RX.globalCompositeOperation = 'destination-in';
      const g = RX.createRadialGradient(sx, sy, Math.max(0, rad - 90), sx, sy, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      RX.fillStyle = g; RX.fillRect(0, 0, W, H); RX.globalCompositeOperation = 'source-over';
    }
    c.save(); worldT(c, cam); ringsPath(c, M.land); c.clip('nonzero');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = (r.alpha || 0.86) * a; c.drawImage(R, 0, 0); c.restore();
  }
  // the relief shades land and realms alike
  const rl = M.relief;
  if (rl && rl.src) {
    const im = img(rl.src), fade = 0.45 + 0.55 * clamp(((rl.fade_z || 4.5) - cam.z) / 2.0);
    if (im && im.complete && fade > 0.02) {
      c.save(); worldT(c, cam); ringsPath(c, M.land); c.clip('nonzero');
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = fade; c.imageSmoothingQuality = 'high';
      c.drawImage(im, rl.x, rl.y, rl.w, rl.h); c.restore();
    }
  }
  if (M.lakes && M.lakes.length) {
    worldT(c, cam); ringsPath(c, M.lakes); c.fillStyle = sea; c.fill('nonzero');
    c.strokeStyle = coast; c.lineWidth = 1.6 / cam.z; c.stroke();
  }
  // the paper: a warm mottling that moves with the map
  c.save(); worldT(c, cam); c.globalCompositeOperation = 'multiply';
  // one seamless pattern in world space (tiles drawn side by side double-darkened their shared edge)
  if (!parts.paper) parts.paper = c.createPattern(paperNoise(), 'repeat');
  const pz = 900 / 256 / (M.cam0[2] || 1);
  parts.paper.setTransform(new DOMMatrix([pz, 0, 0, pz, 0, 0]));
  c.fillStyle = parts.paper; const v0 = [cam.x - W / 2 / cam.z, cam.y - H / 2 / cam.z];
  c.fillRect(v0[0], v0[1], W / cam.z, H / cam.z);
  c.restore();
  if (S.map.clouds !== false) drawClouds(c, t, cam);
  // lines: routes, borders, arrows
  for (const L of M.lines || []) {
    const t0 = L.t0 != null ? L.t0 : 1.0, t1 = L.t1 != null ? L.t1 : t0 + 1.5;
    const p = L.draw === false ? seg(t, t0, t0 + 0.5) : eio3(seg(t, t0, t1));
    if (p <= 0.001 || !L.pts || L.pts.length < 4) continue;
    const out = L.t_out != null ? 1 - seg(t, L.t_out, L.t_out + 0.6) : 1;
    const got = L.draw === false ? { pts: L.pts, ang: 0 } : lineProgress(L.pts, p);
    c.save(); worldT(c, cam); c.beginPath(); c.moveTo(got.pts[0], got.pts[1]);
    for (let i = 2; i < got.pts.length; i += 2) c.lineTo(got.pts[i], got.pts[i + 1]);
    c.globalAlpha = (L.draw === false ? p : 1) * out * (L.alpha || 0.95);
    c.strokeStyle = L.color || '#B0452D'; c.lineWidth = (L.width || 3.4) / cam.z; c.lineCap = 'round'; c.lineJoin = 'round';
    if (L.dash) c.setLineDash(L.dash.map(v => v / cam.z));
    c.stroke(); c.restore();
    if (L.arrow && p > 0.02) {
      const n = got.pts.length, [ex, ey] = toScreen(cam, got.pts[n - 2], got.pts[n - 1]), a = got.ang, s = L.head || 15;
      c.save(); c.globalAlpha = out * (L.alpha || 0.95) * clamp(p * 6); c.strokeStyle = L.color || '#B0452D';
      c.lineWidth = L.width || 3.4; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(ex - s * Math.cos(a - 0.5), ey - s * Math.sin(a - 0.5)); c.lineTo(ex, ey);
      c.lineTo(ex - s * Math.cos(a + 0.5), ey - s * Math.sin(a + 0.5)); c.stroke(); c.restore();
    }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  // realm names in spaced italic capitals, year labels, notes
  for (const r of M.realms || []) {
    if (!r.name || !r.label_xy) continue;
    const tl = r.t_label != null ? r.t_label : (r.t_in != null ? r.t_in : 0.8) + (r.spread_s || 1.8) + 0.3;
    let a = seg(t, tl, tl + 0.5); if (r.t_out != null) a *= 1 - seg(t, r.t_out, r.t_out + 0.6);
    if (a <= 0) continue;
    const [x, y] = toScreen(cam, r.label_xy[0], r.label_xy[1]), fs = r.label_size || 34;
    spacedText(c, String(r.name).toUpperCase(), x, y, `italic 500 ${fs}px 'Hi Serif'`, fs * 0.3, pal.ink || '#4A3818', 0.78 * a);
  }
  for (const n of M.notes || []) {
    const a = seg(t, n.t, n.t + 0.5) * (n.t_out != null ? 1 - seg(t, n.t_out, n.t_out + 0.5) : 1); if (a <= 0) continue;
    const [x, y] = toScreen(cam, n.x, n.y), fs = n.size || 30;
    if (n.caps) spacedText(c, String(n.text).toUpperCase(), x, y, `italic 500 ${fs}px 'Hi Serif'`, fs * 0.25, pal.ink || '#4A3818', 0.82 * a, n.align);
    else spacedText(c, String(n.text), x, y, `italic 500 ${fs}px 'Hi Serif'`, 0.5, pal.ink || '#4A3818', 0.9 * a, n.align);
  }
  // battles: a white roundel, a dark ring, crossed swords
  for (const b of M.battles || []) {
    const p = eback(seg(t, b.t, b.t + 0.35)); if (p <= 0) continue;
    const [x, y] = toScreen(cam, b.x, b.y), r = 17 * p;
    c.save(); c.translate(x, y); c.globalAlpha = clamp(p * 2);
    c.fillStyle = 'rgba(247,240,226,.95)'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = '#3A2E1E'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#3A2E1E'; c.lineWidth = 2.2; c.lineCap = 'round';
    for (const s of [1, -1]) {
      c.save(); c.rotate(s * Math.PI / 4);
      c.beginPath(); c.moveTo(0, -r * 0.66); c.lineTo(0, r * 0.5); c.stroke();                 // the blade
      c.beginPath(); c.moveTo(-r * 0.24, r * 0.38); c.lineTo(r * 0.24, r * 0.38); c.stroke(); // the guard
      c.restore();
    }
    c.restore();
  }
  // places: a dot (a star for a capital) and the name in small capitals; a name can change in place. Each label
  // takes the first side (right, left, above, below) where it collides with no other label, decided once
  if (!M._sides) {
    const cam0 = mapCam(0), boxes = [];
    for (const pl of M.places || []) { const [x, y] = toScreen(cam0, pl.x, pl.y); if (pl.dot !== false) boxes.push([x - 9, y - 9, x + 9, y + 9]); }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    M._sides = (M.places || []).map(pl => {
      const fs = pl.size || 30; c.font = `700 ${fs}px 'Hi Cap'`;
      const w = c.measureText(String(pl.rename && String(pl.rename).length > String(pl.name).length ? pl.rename : pl.name).toUpperCase()).width * 1.09 + 8;
      const [x, y] = toScreen(cam0, pl.x, pl.y), gap = pl.capital ? 18 : 13;
      const opts = pl.dx != null ? [[pl.dx, pl.dy || 1, pl.align || 'left']] :
        [[gap, 1, 'left'], [-gap, 1, 'right'], [0, -fs * 0.95, 'center'], [0, fs * 1.05, 'center']];
      const box = ([dx, dy, al]) => { const x0 = al === 'left' ? x + dx : al === 'right' ? x + dx - w : x - w / 2;
        return [x0, y + dy - fs * 0.55, x0 + w, y + dy + fs * 0.55]; };
      const hit = (b) => boxes.some(q => b[0] < q[2] && q[0] < b[2] && b[1] < q[3] && q[1] < b[3]);
      const pick = opts.find(o => !hit(box(o))) || opts[0];
      boxes.push(box(pick)); return pick;
    });
    for (const n of M.notes || []) {                     // the seas' names and notes
      const fs = n.size || 30; c.font = `italic 500 ${fs}px 'Hi Serif'`;
      const w = c.measureText(n.caps ? String(n.text).toUpperCase() : String(n.text)).width * (n.caps ? 1.3 : 1.0) + 10;
      const [x, y] = toScreen(cam0, n.x, n.y);
      boxes.push(n.align === 'left' ? [x, y - fs * 0.6, x + w, y + fs * 0.6] : [x - w / 2, y - fs * 0.6, x + w / 2, y + fs * 0.6]);
    }
    M._boxes = boxes;
    c.restore();
  }
  for (const [pi, pl] of (M.places || []).entries()) {
    const a = seg(t, pl.t, pl.t + 0.5) * (pl.t_out != null ? 1 - seg(t, pl.t_out, pl.t_out + 0.5) : 1); if (a <= 0) continue;
    const [x, y] = toScreen(cam, pl.x, pl.y), fs = pl.size || 30;
    c.save(); c.globalAlpha = a;
    if (pl.dot !== false) {
      if (pl.capital) {
        c.fillStyle = '#C9A24A'; c.strokeStyle = '#4A3818'; c.lineWidth = 1.2; c.beginPath();
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? 4.2 : 9.5, an = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + rr * Math.cos(an), y + rr * Math.sin(an)); }
        c.closePath(); c.fill(); c.stroke();
      } else {
        c.fillStyle = 'rgba(246,238,220,.95)'; c.beginPath(); c.arc(x, y, 5.2, 0, TAU); c.fill();
        c.strokeStyle = '#3A2E1E'; c.lineWidth = 2.4; c.stroke();
      }
    }
    c.restore();
    const sd = M._sides[pi], lx = x + sd[0], ly = y + sd[1], al = sd[2];
    const nameA = pl.rename ? 1 - seg(t, pl.rename_t, pl.rename_t + 0.7) : 1;
    spacedText(c, String(pl.name).toUpperCase(), lx, ly, `700 ${fs}px 'Hi Cap'`, fs * 0.08, pal.ink2 || '#4E3E1E', a * nameA * 0.95, al);
    if (pl.rename) spacedText(c, String(pl.rename).toUpperCase(), lx, ly, `700 ${fs}px 'Hi Cap'`, fs * 0.08, pal.ink2 || '#4E3E1E', a * seg(t, pl.rename_t, pl.rename_t + 0.7) * 0.95, al);
  }
  if (M.year) {
    const Y = M.year, a = seg(t, Y.t, Y.t + 0.5); if (a > 0) {
      const [x, y] = toScreen(cam, Y.x, Y.y), fs = Y.size || 42;
      spacedText(c, String(Y.text), x, y, `italic 600 ${fs}px 'Hi Serif'`, fs * 0.12, pal.ink || '#4A3818', 0.85 * a);
    }
  }
}
function M_boxes() { return (S.map && S.map._boxes) || []; }
function clouds() {
  // a soft, seamless cloud-shadow field (value noise, 3 octaves), drawn once
  if (cloudTile) return cloudTile;
  const n = 256, cnv = document.createElement('canvas'); cnv.width = cnv.height = n;
  const x = cnv.getContext('2d'), im = x.createImageData(n, n);
  let s = 9173; const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const oct = [[4, 0.6], [8, 0.28], [16, 0.12]].map(([g, a]) => { const v = []; for (let i = 0; i < g * g; i++) v.push(r()); return [g, a, v]; });
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
    let v = 0;
    for (const [g, a, grid] of oct) {
      const gx = xx / n * g, gy = y / n * g, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
      const q = (i, j) => grid[((j % g) + g) % g * g + ((i % g) + g) % g];
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      v += a * lerp(lerp(q(ix, iy), q(ix + 1, iy), sx), lerp(q(ix, iy + 1), q(ix + 1, iy + 1), sx), sy);
    }
    const k = clamp((v - 0.52) * 3.2), i = (y * n + xx) * 4;          // only the thicker parts cast a shadow
    im.data[i] = 38; im.data[i + 1] = 30; im.data[i + 2] = 20; im.data[i + 3] = 255 * k * k * (3 - 2 * k);
  }
  x.putImageData(im, 0, 0); cloudTile = x.createPattern(cnv, 'repeat'); return cloudTile;
}
function drawClouds(c, t, cam) {
  // two layers of cloud shadow drift across the map at different speeds and scales (the camera's parallax)
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const pat = clouds();
  // stretched into long soft bands and kept faint: a stain-like blob reads as dirt, not as weather
  for (const [sc, vx, vy, a] of [[6.0, 15, 4, 0.12], [3.6, 24, -3, 0.06]]) {
    const ox = -(cam.x * cam.z * 0.35) + vx * t, oy = -(cam.y * cam.z * 0.35) + vy * t;
    pat.setTransform(new DOMMatrix([sc * 1.8, 0, 0, sc, ox % (256 * sc * 1.8), oy % (256 * sc)]));
    c.globalAlpha = a; c.fillStyle = pat; c.fillRect(0, 0, W, H);
  }
  c.restore();
}
function mapTilt(t) {
  // the map is a sheet of paper under a moving camera: a few degrees of tilt that ease off as the camera settles
  const M = S.map, p = esio(t / Math.max(0.01, D)), f = M.fly ? eio3(seg(t, M.fly.t0, M.fly.t1)) : 0;
  const ax = lerp(8.5, 4.0, p) - 3.0 * f, az = lerp(-0.6, 0.4, p);
  scene.style.transformOrigin = '50% 58%';
  scene.style.transform = `perspective(2100px) rotateX(${ax.toFixed(3)}deg) rotateZ(${az.toFixed(3)}deg) scale(${(1.12 + 0.02 * f).toFixed(4)})`;
}
function mapPost(c) {
  // measured on the reference maps: sharpness falls to 0.63 at half radius and 0.17 in the corners, brightness to
  // 54 % in the corners (flat until 55 % of the radius)
  B2X.setTransform(1, 0, 0, 1, 0, 0); B2X.clearRect(0, 0, W, H); B2X.filter = 'blur(5px)'; B2X.drawImage(cv, 0, 0); B2X.filter = 'none';
  B2X.globalCompositeOperation = 'destination-in';
  const g = B2X.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, Math.hypot(W, H) / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  B2X.fillStyle = g; B2X.fillRect(0, 0, W, H); B2X.globalCompositeOperation = 'source-over';
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(B2, 0, 0);
}

// ── build / frame ───────────────────────────────────────────────────────────────────────────────
function build() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  grain(0.035);
  ground.style.backgroundImage = 'none'; ground.style.background = '#1A120A';
  scene.innerHTML = `<canvas id="pic" class="full"></canvas>`;
  cv = document.getElementById('pic'); cv.width = W; cv.height = H; cx = cv.getContext('2d');
  const mk = () => { const k = document.createElement('canvas'); k.width = W; k.height = H; return k; };
  R = mk(); RX = R.getContext('2d'); B1 = mk(); B1X = B1.getContext('2d'); B2 = mk(); B2X = B2.getContext('2d');
  // the vignette: paintings to ~42 % in the corners, maps to 54 % (mapPost adds the edge blur)
  vig.style.background = S.map
    ? 'radial-gradient(ellipse 72% 72% at 50% 50%, rgba(40,25,10,0) 58%, rgba(40,25,10,.30) 80%, rgba(34,20,8,.52) 100%)'
    : 'radial-gradient(ellipse 74% 74% at 50% 50%, rgba(20,12,4,0) 52%, rgba(20,12,4,.34) 78%, rgba(14,8,2,.62) 100%)';
  for (const sh of S.shots || []) { img(sh.src); if (sh.figure) img(sh.figure.src); if (sh.video) vid(sh.vkey, sh.video); }
  if (S.prev) img(S.prev.src);
  if (S.map && S.map.relief) img(S.map.relief.src);
  for (const m of [S.medallion, S.map && S.map.medallion]) if (m && m.src) img(m.src);
  // kits.py waits for this before the first frame: a picture still decoding would render as a black frame
  window.__wait = Promise.all(Object.values(pics).map(im => im.decode().catch(() => null))
    .concat(Object.values(vids).map(v => v._ready.catch(() => null))));
  buildTitle(); buildCounter();
  if (S.medallion) parts.med = buildMedallion(S.medallion);
  if (S.map && S.map.medallion) { parts.mmed = buildMedallion(S.map.medallion); if (parts.mmed) parts.mmed.n.style.color = '#3E2F18'; }
}
function frame(t) {
  // the videos on screen at t are sought first (a promise the renderer waits for), then the frame is drawn
  const want = [];
  for (const sh of S.shots || []) {
    if (!sh.video) continue;
    const e = sh.ed || 0.7, a = sh.t0 - e, b = sh.t1 + e;
    if (t >= a - 0.05 && t <= b + 0.05) want.push(seekTo(vid(sh.vkey, sh.video), t - (sh.vt0 || 0)));
  }
  const ps = want.filter(Boolean);
  if (ps.length) return Promise.all(ps).then(() => draw(t));
  draw(t);
}
function draw(t) {
  if (S.map) {
    mapTilt(t);
    drawMap(cx, t); mapPost(cx);
    const fin = S.fade_in != null ? S.fade_in : (S.map.fade_in != null ? S.map.fade_in : 0.7);
    if (S.prev && t < fin) { cx.setTransform(1, 0, 0, 1, 0, 0); drawPrev(cx, t, 1 - esio(t / fin)); }
    if (parts.mmed) {
      const mm = S.map.medallion, cam = mapCam(t), [x, y] = toScreen(cam, mm.x, mm.y), r = (mm.size || 175) / 2 * 1.06;
      if (!mm._off) {
        // the first side of its place where the disc and its name cover no label (decided once, on the first frame)
        const cam0 = mapCam(0), [x0, y0] = toScreen(cam0, mm.x, mm.y), bx = M_boxes();
        const opts = [[mm.dx != null ? mm.dx : -120, mm.dy != null ? mm.dy : -45], [-130, -60], [130, -60], [-130, 70], [130, 70], [0, -150], [0, 150]];
        const cover = ([dx, dy]) => { const cx = clamp(x0 + dx, 40 + r, W - 40 - r), cy = clamp(y0 + dy, 40 + r, H - 90 - r);
          const b = [cx - r - 70, cy - r, cx + r + 70, cy + r + 50];
          return bx.filter(q => b[0] < q[2] && q[0] < b[2] && b[1] < q[3] && q[1] < b[3]).length; };
        mm._off = opts.reduce((best, o) => cover(o) < cover(best) ? o : best, opts[0]);
      }
      // the disc and its name stay inside the frame, whatever the place's position
      const mx = clamp(x + mm._off[0], 40 + r, W - 40 - r), my = clamp(y + mm._off[1], 40 + r, H - 90 - r);
      frameMedallion(parts.mmed, mm, t, mx, my);
    }
  } else {
    paintings(cx, t);
  }
  if (parts.med) frameMedallion(parts.med, S.medallion, t, S.medallion.x || (TALL ? W / 2 : 238), S.medallion.y || (TALL ? 1560 : 868));
  frameTitle(t); frameCounter(t);
}
