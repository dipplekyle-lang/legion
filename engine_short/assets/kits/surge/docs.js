/* surge/docs.js — PAPER document devices: highlighter sweep (the signature), headline on a dimmed plate, article
   macro, article card rise + punch-in, strip stack / clipping collage / list reveal. Bars are flat, slightly dirty,
   one accent per video (S.accent), expo ease-out, STEPPED every 4 f (7.5 fps) unless S.step says otherwise. */
const EASE = [0, 0.16, 0.4, 0.58, 0.72, 0.82, 0.88, 0.92, 0.95, 0.975, 0.99, 1];   // olive sweep f52-62 (measured)
function sweep(f, f0, len) { if (f < f0) return 0; const k = Math.min(1, (stp(f - f0) + STEP) / Math.max(STEP, len)); return EASE[Math.round(k * (EASE.length - 1))]; }
function markSpans(html, marks) {             // wrap each mark phrase (first occurrence) in <span class="mk">
  (marks || []).filter(Boolean).forEach((m, i) => { const e = esc(m), k = html.toLowerCase().indexOf(e.toLowerCase());
    if (k >= 0) html = html.slice(0, k) + `<span class="mk" data-i="${i}">` + html.slice(k, k + e.length) + '</span>' + html.slice(k + e.length); });
  return html;
}
function bars(host, under) {                   // one bar per line fragment of each .mk span, drawn under the text
  const hr = under.getBoundingClientRect(), out = [];
  host.querySelectorAll('.mk').forEach(sp => { let d = 0; [...sp.getClientRects()].forEach(r => {
    const b = document.createElement('div'); b.className = 'hbar'; b.style.background = ACC;
    b.style.left = (r.left - hr.left - 0.18 * r.height) + 'px'; b.style.top = (r.top - hr.top + 0.04 * r.height) + 'px';
    b.style.height = (r.height * 0.94) + 'px'; b.dataset.w = r.width + 0.3 * r.height; b.dataset.d = d; d += 3; b.style.width = '0px';
    under.appendChild(b); out.push(b); }); });
  return out;
}

DEV.headline = {                      // footage dimmed to ~20 % luma in 4 f, a real headline in white bold sans, a sweep
  build() { const L = pics(S.plate || S.image || S.images, 1); this.p = card([L[0]], {}); this.p.place(960, 540, W, H); this.p.show(0);
    if (!S.plate && !S.image && !S.images) this.p.el.style.display = 'none';
    this.layer = txt('hlayer', ''); this.under = document.createElement('div'); this.under.className = 'hunder'; this.layer.appendChild(this.under);
    this.t = document.createElement('div'); this.t.className = 'hl'; this.t.innerHTML = markSpans(esc(S.headline || S.text || ''), [S.mark].concat(S.marks || []));
    this.layer.appendChild(this.t); this.b = bars(this.t, this.under); this.dim = [1, 0.85, 0.53, 0.25, 0.18]; },
  frame(f) { this.p.box.style.filter = `brightness(${this.dim[Math.min(f, 4)]})`;
    this.p.box.style.transform = `scale(${1 + 0.0015 * f})`;                    // house push 0.15 %/f, linear
    this.t.style.opacity = Math.min(1, (f + 1) / 5);
    this.b.forEach((b, i) => { b.style.width = (b.dataset.w * sweep(f, 2 + i * 5, Number(S.sweep) || 26)) + 'px'; }); } };

DEV.article = {                       // a paragraph in macro (lines run off both edges), 1-2 sweeps, push + reading pan
  build() { setGround(S.ground || 'white'); this.cam = txt('acam', '');
    if (S.doc) { const L = pics(S.doc, 1); this.im = img(L[0], 'visibility:visible;object-fit:cover'); this.cam.appendChild(this.im);
      this.under = document.createElement('div'); this.under.className = 'hunder'; this.cam.appendChild(this.under);
      this.b = (S.boxes || []).map(bx => { const b = document.createElement('div'); b.className = 'hbar mul'; b.style.background = ACC;
        Object.assign(b.style, {left: bx[0] + 'px', top: bx[1] + 'px', height: bx[3] + 'px'}); b.dataset.w = bx[2]; this.under.appendChild(b); return b; });
    } else { this.under = document.createElement('div'); this.under.className = 'hunder'; this.cam.appendChild(this.under);
      const p = document.createElement('div'); p.className = 'para'; p.innerHTML = markSpans(esc(S.text || ''), S.marks || [S.mark]); this.cam.appendChild(p);
      const m = p.querySelector('.mk'); if (m) { const r = m.getBoundingClientRect();
        if (r.left < W * 0.06) p.style.left = (parseFloat(getComputedStyle(p).left) + W * 0.06 - r.left) + 'px';   // keep the mark on screen
        p.style.top = (parseFloat(getComputedStyle(p).top) - (r.top - H * 0.3)) + 'px'; }
      this.b = bars(p, this.under); }
    this.pan = Number(S.pan == null ? 368 : S.pan); },
  frame(f) { const k = Math.floor(f * 12 / 30) * 30 / 12, p = k / Math.max(1, NF), g = Math.floor(k);   // 12 fps steps:
    this.cam.style.transform = `translateX(${-this.pan * p}px) scale(${1 + 0.074 * p})`;        // camera and bars share them
    this.b.forEach((b, i) => { b.style.width = (b.dataset.w * sweep(g, 2 + i * 5 + Number(b.dataset.d || 0), Number(S.sweep) || 20)) + 'px'; }); } };

DEV.cardrise = {                      // a centred article card 40 % W rises on 7.5 fps steps, holds, then punches in 2.2x
  build() { setGround(S.ground || 'white'); this.c = txt('acard', ''); const L = S.image ? pics(S.image, 1) : null;
    this.c.innerHTML = S.doc ? '' : `<div class="ah">${esc(S.headline || '')}</div>` + (L ? '<div class="aph"></div>' : '');
    if (S.doc) { const i = img(pics(S.doc, 1)[0], 'position:relative;visibility:visible;height:auto'); this.c.appendChild(i); }
    else if (L) { const i = img(L[0], 'visibility:visible'); this.c.querySelector('.aph').appendChild(i); }
    this.tops = [783, 480, 336, 258, 219, 204, 203]; this.at = [0, 4, 8, 11, 15, 19, 23]; this.hold = 30; },
  frame(f) { let k = 0; while (k + 1 < this.at.length && this.at[k + 1] <= f) k++;
    const punch = f >= Math.min(this.hold, NF - 6), z = punch ? 2.2 : 1, w = 768 * z;
    this.c.style.transform = `scale(${z})`; this.c.style.left = (punch ? (W - w) / 2 : 960 - 384) + 'px';
    this.c.style.top = (punch ? 300 - 30 * z : this.tops[k]) + 'px'; this.c.style.filter = (!punch && k <= 1) ? `url(#vsmear${k})` : 'none'; } };

DEV.stack = {                         // evidence piles / list reveal: strips or clippings LAND in 1 f, 2-6 f apart
  build() { const g = S.ground || 'black'; if (g === 'plate') { const p = card(pics(S.plate || S.image, 1), {}); p.place(960, 540, W, H); p.show(0); p.box.style.filter = 'brightness(.5)'; }
    else setGround(g);
    const it = (S.items || []).slice(0, 6).map(x => typeof x === 'string' ? {head: x} : x);
    const listMode = (S.items || []).every(x => typeof x === 'string');            // a spoken list: big words, one per row
    this.els = it.map((x, i) => {
      const e = document.createElement('div'); e.className = x.image ? 'clip' : (listMode ? 'strip list' : 'strip');
      if (x.image) { const im = img(pics(x.image, 1)[0], 'position:relative;visibility:visible;height:auto'); e.appendChild(im); }
      else e.innerHTML = `<div class="sh">${esc(x.head || '')}</div>` + (listMode ? '' : (x.sub ? `<div class="ss">${esc(x.sub)}</div>` : '') + '<div class="sl"></div><div class="sl s2"></div>');
      const list = listMode, n = it.length;
      const r = (hrnd(i + 20) - 0.5) * (x.image ? 7 : 4), w = W * (x.image ? 0.26 + 0.02 * i : list ? 0.4 : Math.min(0.8, 0.62 + 0.045 * i));
      if (!x.image && !list) e.querySelector('.sh').style.fontSize = Math.min(66, 44 + 6 * i) + 'px';
      e.style.width = w + 'px'; if (x.dark) e.classList.add('dark');
      const cx = list ? 960 : 960 + W * 0.08 * (hrnd(i + 30) - 0.5), cy = list ? H * (n > 1 ? 0.24 + 0.52 * i / (n - 1) : 0.45) : H * (0.43 + 0.08 * (hrnd(i + 40) - 0.5));
      e.style.left = (cx - w / 2) + 'px'; e.style.top = (cy - (list ? 55 : 120)) + 'px';
      e.style.transform = `rotate(${r}deg)`; e.style.zIndex = 10 + i; scene.appendChild(e); return e; });
    const gaps = S.gaps || [4, 3, 3, 6, 4]; let a = 0;
    this.on = this.els.map((_, i) => { if (Array.isArray(S.times) && S.times[i] != null) return Math.round(Number(S.times[i]) * FR); const v = a; a += gaps[i % gaps.length]; return v; }); },
  frame(f) { this.els.forEach((e, i) => vis(e, f >= this.on[i])); } };
