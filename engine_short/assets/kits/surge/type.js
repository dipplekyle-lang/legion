/* surge/type.js — type as the picture: canvas (+ the paper punch word), paper karaoke page, polarity title card,
   footage-in-letters slam, giant-letter flash. Faces: Kit Sans (Inter var), Kit Slab (DM Serif Display),
   Kit Didone (Playfair Display 900). Big type is drawn on canvas so its cap band sits exactly where measured. */
function speckle(x, w, h, seed) {             // white 1-2 px dust inside black glyphs (t2 punch words)
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,255,255,.85)';
  let s = seed || 11; for (let i = 0; i < w * h / 900; i++) { s = (s * 16807) % 2147483647; const X = s % w; s = (s * 16807) % 2147483647; const Y = s % h; x.fillRect(X, Y, 1 + (s % 2), 1 + ((s >> 3) % 2)); }
  x.globalCompositeOperation = 'source-over';
}
function fullCanvas() { const c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'full'; scene.appendChild(c); return c; }
function punch(word, cap, cy) {                // a black heavy grotesk word, cap height `cap`, tracking -5 %, speckled
  const c = fullCanvas(), x = c.getContext('2d');
  let fs = Math.round(cap / 0.727); x.font = `900 ${fs}px 'Kit Sans'`; x.letterSpacing = Math.round(-0.05 * fs) + 'px';
  const w = x.measureText(word).width; if (w > W * 0.86) { fs = Math.floor(fs * W * 0.86 / w); x.font = `900 ${fs}px 'Kit Sans'`; x.letterSpacing = Math.round(-0.05 * fs) + 'px'; }
  x.textAlign = 'center'; x.fillStyle = '#000'; x.fillText(word, 960, cy + fs * 0.727 / 2); speckle(x, W, H, 7); return c;
}
DEV.canvas = {                         // a flat ground that IS the shot (breath frame, paper page, card ground)
  build() { setGround(S.ground || (SK === 'paper' ? 'white' : 'beat'));
    if (S.word) punch(String(S.word), Number(S.scale || 2) >= 3 ? 110 : 70, H / 2); },
  frame() {} };

DEV.page = {                           // K1 karaoke: the whole line grey + blurred, each word snaps black on its time
  build() { const g = S.ground || 'white'; setGround(g); const words = String(S.line || '').split(/\s+/).filter(Boolean);
    const fs = Math.round(Number(S.size) || (g === 'disc' ? 35 : 44));
    this.el = txt('kpage', words.map(w => `<span class="kw">${esc(w)}</span>`).join(' '), `font-size:${fs}px;top:${Math.round(H * 0.515 - fs * 0.95)}px`);
    this.sp = [...this.el.querySelectorAll('.kw')]; const n = this.sp.length, span = Math.max(0.2, D - 0.15);
    this.tm = (Array.isArray(S.times) && S.times.length === n) ? S.times.map(Number) : this.sp.map((_, i) => 2 / 30 + span * i / Math.max(1, n));
    this.mode = S.mode || 'k1'; },
  frame(f) { const t = f / FR; this.sp.forEach((s, i) => { const on = t >= this.tm[i] - 1 / FR;
    if (this.mode === 'k3') { s.style.display = (on && !(i + 1 < this.sp.length && t >= this.tm[i + 1] - 1 / FR)) ? 'inline' : 'none'; s.style.color = '#000'; return; }
    s.style.color = on ? '#000' : (this.mode === 'k2' ? 'transparent' : '#C4C4C4'); s.style.filter = on || this.mode === 'k2' ? 'none' : 'blur(2.5px)'; }); } };

DEV.titlecard = {                      // 1-3 words, bold serif ~77 % W on dot-grid paper, polarity W4 B4 W2
  build() { this.w = plane('dotgrid'); scene.appendChild(this.w); this.cv = fullCanvas(); this.x = this.cv.getContext('2d');
    this.t = String(S.text || S.word || ''); let fs = 430; this.x.font = `${fs}px 'Kit Slab'`;
    fs = Math.min(430, Math.floor(fs * W * 0.77 / Math.max(1, this.x.measureText(this.t).width))); this.fs = fs;
    this.seq = String(S.flips || 'W4 B4 W2').split(/\s+/).map(s => [s[0].toUpperCase(), parseInt(s.slice(1)) || 1]); this.st = ''; },
  frame(f) { let a = f, st = this.seq[this.seq.length - 1][0]; for (const [k, l] of this.seq) { if (a < l) { st = k; break; } a -= l; }
    if (st === this.st) return; this.st = st; vis(this.w, st === 'W'); const x = this.x;
    x.clearRect(0, 0, W, H); if (st !== 'W') { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); }
    x.font = `${this.fs}px 'Kit Slab'`; x.textAlign = 'center'; const cap = x.measureText('H').actualBoundingBoxAscent;
    x.fillStyle = st === 'W' ? '#000' : '#FEFEFE'; x.fillText(this.t, 960, 538 + cap / 2); } };

DEV.letters = {                        // "NO": huge serif caps (cap 68 % H) as windows onto photos, fine halftone, black
  build() { setGround('black'); this.t = String(S.text || 'NO').toUpperCase().slice(0, 4); const L = pics(S.images, this.t.length);
    this.im = L.map(s => { const i = new Image(); i.src = s; WAIT.push(i.decode().catch(() => null)); return i; });
    this.cv = fullCanvas(); this.lead = S.lead || 'flash'; },
  draw(solid) { const x = this.cv.getContext('2d'); x.clearRect(0, 0, W, H);
    let fs = 1000; x.font = `${fs}px 'Kit Slab'`; const capR = x.measureText('N').actualBoundingBoxAscent / fs;
    fs = Math.round(H * 0.68 / capR); x.font = `${fs}px 'Kit Slab'`;
    const tw = x.measureText(this.t).width; if (tw > W * 0.9) { fs = Math.floor(fs * W * 0.9 / tw); x.font = `${fs}px 'Kit Slab'`; }
    const cap = capR * fs, base = H * 0.52 + cap / 2; let left = 960 - x.measureText(this.t).width / 2;
    [...this.t].forEach((ch, i) => { const aw = x.measureText(ch).width, o = document.createElement('canvas'); o.width = W; o.height = H; const y = o.getContext('2d');
      y.font = x.font; y.fillStyle = '#F4F4F4'; y.fillText(ch, left, base);
      if (!(solid && i === this.t.length - 1)) { const im = this.im[i % this.im.length], bh = cap * 1.05;
        const r = Math.max(aw / (im.naturalWidth || 1), bh / (im.naturalHeight || 1)), dw = (im.naturalWidth || 1) * r, dh = (im.naturalHeight || 1) * r;
        y.globalCompositeOperation = 'source-in'; y.drawImage(im, left + (aw - dw) / 2, base - cap + (bh - dh) * 0.35, dw, dh);
        y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(0,0,0,.38)';
        for (let yy = base - cap; yy < base; yy += 6) for (let xx = left; xx < left + aw; xx += 6) { y.beginPath(); y.arc(xx, yy, 1.3, 0, 6.3); y.fill(); } }
      x.drawImage(o, 0, 0); left += aw; }); },
  frame(f) { const solid = this.lead === 'flash' && f === 0; if (this.state !== solid) { this.draw(solid); this.state = solid; }
    this.cv.style.transform = `scale(${1 + 0.003 * stp(f, 2)})`; } };

DEV.giant = {                          // 1 f: 1-3 white Didone letters 75-100 % H, cropped by the frame, over the dimmed plate
  build() { const L = pics(S.plate || S.image || S.images, 1); const p = card([L[0]], {}); p.place(960, 540, W, H); p.show(0); p.box.style.filter = 'brightness(.5) saturate(.85)';
    const t = String(S.letters || S.word || 'M').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3);
    this.el = txt('didone', esc(t), 'white-space:nowrap'); const fs = Math.round(H * (0.95 + 0.4 * hrnd(2)) / 0.708); this.el.style.fontSize = fs + 'px';
    const left = hrnd(5) < 0.5 ? -0.06 * W : 960 - this.el.offsetWidth / 2 + 0.12 * W * (hrnd(6) - 0.5);
    this.el.style.left = left + 'px'; this.el.style.top = (H * (0.08 + 0.1 * hrnd(7)) - fs * 0.25) + 'px'; },
  frame() {} };
