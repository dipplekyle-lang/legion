/* surge/hero.js — G-HERO (comet into a red tracking box, the key word 2.4-3.2x in serif italic: defocus > bloom >
   sharp > glitch exit), FIGURE (a number as the shot: GLOW glow-serif + data label / PAPER punch grotesk + sub-line),
   TERMINAL (green-phosphor bracketed number grid insert, 3-8 f). */
function hudBox(cls) { const b = document.createElement('div'); b.className = 'hbox ' + (cls || ''); const tg = document.createElement('div'); tg.className = 'htag'; b.appendChild(tg); scene.appendChild(b); return b; }
function boxAt(b, x, y, w, h) { b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = w + 'px'; b.style.height = h + 'px';
  b.firstChild.textContent = `x: ${Math.max(0, Math.round(x / 1.5))}  y: ${Math.round(y / 1.5)}`; }
function glitchExit(f, k) {                    // X9: the frame shrinks into a smeared border, RGB split, a pink bar
  const st = document.getElementById('stage');
  if (k < 0) { st.style.transform = ''; st.style.filter = ''; GL.style.visibility = 'hidden'; return; }
  st.style.transform = `scale(${0.965 - 0.005 * k})`; st.style.filter = 'url(#rgbsplit)'; GL.style.visibility = 'visible';
  GL.style.top = (430 + 60 * hrnd(f)) + 'px';
}
let GL = null;
function glitchLayer() { document.body.style.background = '#1a1a1a';
  const svg = `<svg width="0" height="0" style="position:absolute"><filter id="rgbsplit"><feOffset in="SourceGraphic" dx="-6" result="r"/><feColorMatrix in="r" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="R"/><feOffset in="SourceGraphic" dx="6" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="GB"/><feBlend in="R" in2="GB" mode="screen"/></filter></svg>`;
  document.body.insertAdjacentHTML('beforeend', svg); GL = txt('pinkbar', ''); GL.style.visibility = 'hidden'; }

DEV.hero = {
  build() { setGround('hero'); glitchLayer(); const w = String(S.word || S.text || '');
    this.comet = txt('comet', ''); this.dot = txt('gdot', ''); this.box = hudBox(); this.bg = txt('bloomglow', '');
    this.el = txt('hword', esc(w), 'white-space:nowrap'); let s = Math.round(Number(S.size) || 214); this.el.style.fontSize = s + 'px';
    while (s > 60 && this.el.offsetWidth > W * 0.82) { s -= 6; this.el.style.fontSize = s + 'px'; }
    this.ww = this.el.offsetWidth; this.fs = s; this.x0 = 960 - this.ww / 2; this.el.style.left = this.x0 + 'px'; this.el.style.top = (H * 0.5 - s * 0.62) + 'px';
    this.t0 = Math.min(5, Math.max(0, NF - 9)); this.exit = NF >= 12 ? NF - 3 : NF; },
  frame(f) { const c = this.t0, word = f >= c, yb = H * 0.5 + this.fs * 0.18;
    vis(this.el, word); this.el.className = 'hword' + (f === c ? ' defocus' : f === c + 1 ? ' bloom' : '');
    vis(this.bg, f === c + 1); Object.assign(this.bg.style, {left: (this.x0 - 220) + 'px', width: (this.ww + 440) + 'px', top: (H * 0.5 - 190) + 'px', height: '380px'});
    // the comet: a light streak flying L>R, its head stepping each frame; after the word lands it rests left of it
    const p = c ? Math.min(f, c) / c : 1, head = word ? this.x0 - 20 : W * (0.36 + 0.36 * p), sy = word ? yb - this.fs * 0.3 : H * (0.53 - 0.04 * p);
    const len = Math.min(head, 1350); Object.assign(this.comet.style, {left: (head - len) + 'px', width: len + 'px', top: sy + 'px', opacity: word ? 0.55 : 1});
    vis(this.dot, !word); this.dot.style.left = (head - len * 0.45) + 'px'; this.dot.style.top = (sy - 1) + 'px';
    if (!word) { const j = stp(f, 2); boxAt(this.box, Math.max(0, head - len - 10 + 30 * (hrnd(j) - 0.5)), sy - 64 + 20 * (hrnd(j + 4) - 0.5), len + 130, 128); }
    else boxAt(this.box, 0, yb - this.fs * 0.86, this.x0 + this.ww + 24, this.fs * 0.9);
    const flick = f >= c + 2 && f !== c + 4;                                   // re-wraps the word, flickers once
    vis(this.box, (!word || flick) && f < this.exit);
    glitchExit(f, f >= this.exit ? f - this.exit : -1); } };

DEV.figure = {                        // a number / record / money figure as the shot
  build() { const v = String(S.value || S.text || ''), sub = String(S.sub || '');
    if (SK === 'paper') { setGround(S.ground || 'disc'); this.c = punch(v, Number(S.scale || 3.2) >= 3 ? 110 : 70, H / 2);
      this.s = sub ? txt('fsub', esc(sub)) : null; if (this.s) this.s.style.top = (H / 2 + 110) + 'px'; return; }
    setGround('hero'); this.el = txt('hword glowtxt', esc(v), 'white-space:nowrap'); let s = 200; this.el.style.fontSize = s + 'px';
    while (s > 60 && this.el.offsetWidth > W * 0.8) { s -= 6; this.el.style.fontSize = s + 'px'; }
    this.el.style.left = (960 - this.el.offsetWidth / 2) + 'px'; this.el.style.top = (H * 0.56 - s * 0.95) + 'px';
    this.lab = txt('dlabel', `<b>${esc(S.label || v)}</b><i>${esc(sub)}</i>`); },
  frame(f) { const a = Math.min(1, stp(f, 2) / 4);
    if (this.s) this.s.style.opacity = f >= 4 ? 1 : 0;
    if (this.lab) this.lab.style.opacity = a; } };

DEV.terminal = {                      // 3-8 f tech insert: a bracketed 4-column x 8-row number grid, green phosphor
  build() { setGround('#030703'); this.d = String(S.digits || '').replace(/\D/g, '').slice(0, 4);
    this.el = txt('term', ''); this.scan = txt('scan', ''); this.el.style.transform = `scale(${Number(S.zoom) || 1})`; },
  frame(f) { const k = Math.floor(f / 3); let s = '';      // a few cells re-roll every 3 f
    for (let r = 0; r < 8; r++) { const row = []; for (let c = 0; c < 4; c++) { const i = r * 4 + c; let n = '';
      if (i === 0 && this.d.length === 4) n = this.d; else for (let j = 0; j < 4; j++) n += Math.floor(hrnd(i * 7 + j + (hrnd(i + 99) < 0.25 ? k * 131 : 0)) * 10);
      row.push(`[${n}]`); } s += row.join(' ') + (r < 7 ? '\n' : ''); }
    this.el.textContent = s; } };
