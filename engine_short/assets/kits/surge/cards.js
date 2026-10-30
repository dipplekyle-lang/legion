/* surge/cards.js — the card devices: life stack (M3), card montage (M1 glow/paper), count card (M2), handles card,
   flipbook (M4), photo deck (P-DECK). Sizes/cadences measured on the refs (refs/fast/graphics/LOG.md). */
const DEV = {};
// life stack card widths (% W) measured on t1 f947-985 (glow removed): big, then jittering down
const LIFE_W = [100, 58, 92, 76, 40, 56, 52, 47, 27, 43, 40, 40, 41, 40, 37, 34, 32, 30, 29, 28];

DEV.lifestack = {                    // photos stepping BACK in age, each a smaller glowing card on plum-black
  build() { setGround('plum'); const L = pics(S.images, 16); this.c = card(L, {glow: true, pos: '50% 30%'});
    this.s = sched(cadence(L.length, S.cadence || [3, 2])); },
  frame(f) { const k = Math.min(this.s.at(f % this.s.total), this.c.n - 1);
    const w = W * LIFE_W[Math.min(k, LIFE_W.length - 1)] / 100, h = k === 0 ? H : Math.min(H * 0.97, w / 1.3);
    this.c.show(k); this.c.place(k === 0 ? 960 : W * (0.45 + 0.05 * (hrnd(k + 9) - 0.5)), k === 0 ? 540 : H * (0.47 + 0.1 * (hrnd(k + 3) - 0.5)), w, h); } };

function smearSet(L, parent) {        // the paper card's horizontal edge smear: 7 offset copies per picture (~38 px)
  const el = document.createElement('div'); el.className = 'scard'; (parent || scene).appendChild(el);
  const groups = L.map(s => { const g = document.createElement('div'); g.className = 'sbox'; g.style.overflow = 'visible'; vis(g, false);
    [-36, -24, -12, 0, 12, 24, 36].forEach(dx => { const i = img(s, `visibility:visible;opacity:.24;transform:translateX(${dx}px)`); g.appendChild(i); });
    el.appendChild(g); return g; });
  let cur = -1;
  return {el, show(i) { if (cur >= 0) vis(groups[cur], false); vis(groups[i], true); cur = i; },
    place(cx, cy, w, h) { Object.assign(el.style, {left: (cx - w / 2) + 'px', top: (cy - h / 2) + 'px', width: w + 'px', height: h + 'px'}); }};
}
DEV.montage = {                       // one card, its picture swapping every 2-4 f; GLOW on plum, PAPER flies on white
  build() { const L = pics(S.images, 12); this.paper = SK === 'paper';
    setGround(S.ground || (this.paper ? 'white' : 'plum'));
    if (this.paper) this.sm = smearSet(L);
    this.c = card(L, {glow: !this.paper, pos: '50% 35%'}); if (this.paper) this.c.el.classList.add('pcard');
    this.s = sched(cadence(L.length, S.cadence || (this.paper ? [4, 4, 4, 3] : [3, 2, 3, 4, 2]))); },
  frame(f) { const k = Math.min(this.s.at(f), this.c.n - 1); this.c.show(k);
    if (this.paper) {                   // 38 > 42 > 60 > 61 > ... > 72 % W (smear included), aspect 1.4, rises to 0.40 H
      const ws = [38, 42, 60, 61, 63, 64, 66, 67, 68, 70, 71, 72], ww = W * (k < ws.length ? ws[k] : 72) / 100, w = ww - 76, h = w / 1.4;
      const cx = 960 + 48 * (hrnd(k) - 0.5), cy = H * (0.5 - 0.1 * Math.min(1, k / 2)) + 24 * (hrnd(k + 5) - 0.5);
      this.c.place(cx, cy, w, h); this.sm.show(k); this.sm.place(cx, cy, w, h);
      this.c.box.style.filter = (k === 0 && f < 8) ? 'grayscale(1) contrast(1.05)' : 'none';
    } else {
      const w = W * (0.45 + 0.15 * hrnd(k)), h = Math.min(H * 0.9, w / 1.3);
      this.c.place(W * (0.5 + 0.2 * (hrnd(k + 1) - 0.5)), H * (0.5 + 0.12 * (hrnd(k + 2) - 0.5)), w, h);
    } } };

DEV.countcard = {                     // "over 400 times": a tall card holds while instances swap, then rushes the lens
  build() { setGround('plum'); const L = pics(S.images, 13); this.c = card(L, {glow: true});
    this.s = sched(cadence(L.length * 3, S.cadence || [2, 3, 4, 2, 6, 3])); this.g = Math.min(10, Math.floor(NF / 3)); },
  frame(f) { const k = this.s.at(f) % this.c.n; this.c.show(k); const g0 = NF - this.g;
    let w, h, cy;
    if (f < g0) { const p = stp(f) / Math.max(1, g0); w = W * (0.19 + 0.05 * p); h = H * (0.73 + 0.03 * p); cy = H * 0.555; }
    else { const q = Math.pow((Math.floor((f - g0) / 2) * 2 + 2) / this.g, 3); w = W * (0.24 + 0.22 * q); h = H * (0.76 + 0.21 * q); cy = H * (0.555 - 0.055 * q); }
    this.c.place(960, cy, w, h); } };

DEV.handles = {                       // design-tool card: 4 corner handles; black 1 f, white canvas 7 f, black 6 f; swaps 1-2 f
  build() { this.wg = plane('white'); this.bg = plane('black'); scene.appendChild(this.bg); scene.appendChild(this.wg);
    const L = pics(S.images, 8); this.c = card(L, {glow: true, pos: '50% 30%'});
    this.hs = [0, 1, 2, 3].map(() => { const d = document.createElement('div'); d.className = 'hdl'; this.c.el.appendChild(d); return d; });
    this.s = sched(cadence(L.length * 4, [2, 1, 2])); this.ph = [['black', 1], ['white', 7], ['black', 6]]; },
  frame(f) { let a = f % 14, g = 'black'; for (const [k, l] of this.ph) { if (a < l) { g = k; break; } a -= l; }
    const white = g === 'white', hot = !white && (f % 14) >= 8; vis(this.wg, white); vis(this.c.glow, !white);
    this.c.el.classList.toggle('glow', !white); this.c.el.classList.toggle('glow2', hot); this.c.show(this.s.at(f));
    const w = W * Math.min(0.42, 0.21 + 0.012 * f) * (hot ? 1.12 : 1), h = w / 1.18; this.c.place(960, 540, w, h);
    const pos = [[-8, -8], [w - 6, -8], [-8, h - 6], [w - 6, h - 6]];
    this.hs.forEach((d, i) => { d.style.left = pos[i][0] + 'px'; d.style.top = pos[i][1] + 'px'; d.className = 'hdl' + (white ? '' : ' lit'); }); } };

DEV.flipbook = {                      // 5-12 same-class macros, identically framed, 2-3 f each (money = banknotes)
  build() { setGround('black'); const L = pics(S.images, 10); this.c = card(L, {}); this.c.place(960, 540, W, H);
    this.s = sched(cadence(L.length * 4, S.cadence || [2, 3])); },
  frame(f) { this.c.show(this.s.at(f)); const z = 1 + (Number(S.push) || 0) * stp(f, 2); this.c.box.style.transform = `scale(${z})`; } };

DEV.deck = {                          // full-bleed photo steps to a card, more land on top, the deck pulls back on 12 fps
  build() { setGround(S.ground || 'white'); const L = pics(S.images, 4).slice(0, 5); this.wrap = document.createElement('div'); this.wrap.className = 'deck'; scene.appendChild(this.wrap);
    this.cs = L.map(s => card([s], {parent: this.wrap})); this.cs.forEach(c => c.show(0));
    this.k0 = Math.min(6, Math.max(3, Math.round(NF * 0.2))); const gaps = [1, 5, 10, 8];
    this.land = [0]; let a = this.k0; const g12 = v => Math.ceil(Math.ceil(v * 12 / 30) * 30 / 12);   // on the deck's 12 fps grid
    for (let i = 1; i < L.length; i++) { a += gaps[(i - 1) % gaps.length]; this.land.push(Math.min(g12(a), NF - 3)); } },
  frame(f) { const full = f < this.k0;
    this.cs.forEach((c, i) => { vis(c.el, i === 0 || f >= this.land[i]);
      if (full && i === 0) { c.place(960, 540, W, H); c.el.style.transform = 'none'; c.el.classList.remove('dcard'); return; }
      const w = W * 0.84 * Math.pow(0.88, i), h = w / 1.5; c.el.classList.add('dcard');
      c.place(960 + i * W * 0.04, 540 + i * H * 0.05, w, h); c.el.style.transform = `perspective(2200px) rotateY(${-8 + i * 1.5}deg) rotate(${(i % 2 ? 1.5 : -1) * 1.2}deg)`; });
    const st = full ? 0 : Math.floor((f - this.k0) * 12 / 30); this.wrap.style.transform = `scale(${Math.max(0.6, 1 - 0.02 * st)})`; } };

DEV.collage = {                       // hook exit (t1 f70-78): a centre card over scattered cut-out cards, the ground swapping
  build() { const L = pics(S.images, 9); this.bgs = L.slice(Math.min(7, Math.max(1, L.length - 3)));
    this.bg = card(this.bgs.length ? this.bgs : [L[0]], {}); this.bg.place(960, 540, W * 1.04, H * 1.04); this.bg.box.style.filter = 'blur(2px) contrast(1.15) saturate(.8)';
    const small = L.slice(1, Math.min(L.length, 7)), spots = [[0.24, 0.3, 0.12], [0.72, 0.22, 0.16], [0.2, 0.62, 0.1], [0.75, 0.55, 0.14], [0.56, 0.8, 0.15], [0.3, 0.85, 0.11]];
    small.forEach((s, i) => { const c = card([s], {}); const [x, y, w] = spots[i % spots.length]; c.place(W * x, H * y, W * w, W * w * (0.8 + 0.4 * hrnd(i))); c.show(0); c.el.classList.add('cut'); });
    this.c = card([L[0]], {pos: '50% 30%'}); this.c.place(W * 0.5, H * 0.48, W * 0.44, H * 0.42); this.c.show(0); this.c.el.classList.add('cut');
    this.s = sched(cadence(this.bgs.length * 3 || 3, [3, 4, 2])); },
  frame(f) { this.bg.show(this.s.at(f)); } };
