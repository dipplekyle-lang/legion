/* surge/scale.js — "size made physical" (t1 53.2-56.3 s): SLABS = white chamfered clay slabs on a dark grid floor,
   soft top light, a slow stepped dolly, tiny data labels (white value + 1 px leader) — compare: B's slabs DROP one
   per 2 f and stack beside A, ending lower (A is worth more); tower: slabs tile a long block beside A.
   TRIPTYCH = 3 vertical strips of B's pictures push in L>R one per 2 f, each from white, a leak on the last. */
function isoBox(x, o, b, cam) {                // o = [x, y, z] world corner, b = [w, d, h]; z up; 30-degree iso
  const u = cam.u, c30 = 0.866, s30 = 0.5;
  const P = (X, Y, Z) => [cam.cx + (X - Y) * c30 * u, cam.cy + (X + Y) * s30 * u - Z * u];
  const [X, Y, Z] = o, [w, d, h] = b;
  const t = [P(X, Y, Z + h), P(X + w, Y, Z + h), P(X + w, Y + d, Z + h), P(X, Y + d, Z + h)];
  const bl = [P(X, Y + d, Z), P(X + w, Y + d, Z), P(X + w, Y, Z)];
  const poly = (pts, fill) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fillStyle = fill; x.fill(); };
  const gl = x.createLinearGradient(t[3][0], t[3][1], bl[0][0], bl[0][1]); gl.addColorStop(0, '#D9D5D1'); gl.addColorStop(1, '#BDB8B4');
  poly([t[3], t[2], bl[1], bl[0]], gl);                                           // left face (lit from above-left)
  const gr = x.createLinearGradient(t[2][0], t[2][1], bl[2][0], bl[2][1]); gr.addColorStop(0, '#AAA6A3'); gr.addColorStop(1, '#8E8A88');
  poly([t[2], t[1], bl[2], bl[1]], gr);                                           // right face
  const gt = x.createLinearGradient(t[0][0], t[0][1], t[2][0], t[2][1]); gt.addColorStop(0, '#FBFAF8'); gt.addColorStop(1, '#ECE9E5');
  poly(t, gt);                                                                    // top
  x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 2.2 * cam.k; x.beginPath();   // the chamfer catching light
  x.moveTo(t[3][0], t[3][1]); x.lineTo(t[2][0], t[2][1]); x.lineTo(t[1][0], t[1][1]); x.stroke();
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; x.beginPath(); x.moveTo(t[2][0], t[2][1]); x.lineTo(bl[1][0], bl[1][1]); x.stroke();
  return {top: P(X, Y, Z + h), foot: P(X + w / 2, Y + d / 2, Z)};               // top = the back corner (highest)
}
function floorGrid(x, cam) {                   // the dark studio: top light, a fine perspective grid floor
  x.fillStyle = '#0C0A0D'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(960, H * 0.1, 30, 960, H * 0.35, 1100); g.addColorStop(0, 'rgba(255,248,240,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1;
  for (let k = -14; k <= 14; k++) { const a = cam.cx + k * 150 * cam.k; x.beginPath(); x.moveTo(cam.cx + k * 18 * cam.k, H * 0.36); x.lineTo(a + (a - 960) * 1.4, H); x.stroke(); }
  for (let k = 0; k < 16; k++) { const y = H * 0.36 + Math.pow(k / 15, 1.9) * H * 0.64; x.globalAlpha = 0.4 + 0.6 * k / 15; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  x.globalAlpha = 1;
}
function isoAt(o, b, cam) { const c30 = 0.866, s30 = 0.5, X = o[0] + b[0] / 2, Y = o[1] + b[1] / 2;
  return [cam.cx + (X - Y) * c30 * cam.u, cam.cy + (X + Y) * s30 * cam.u - o[2] * cam.u]; }
function shadow(x, p, r, cam) { x.save(); x.filter = `blur(${Math.round(16 * cam.k)}px)`; x.fillStyle = 'rgba(0,0,0,.6)';
  x.beginPath(); x.ellipse(p[0], p[1] + 6, r * cam.u, r * cam.u * 0.42, 0, 0, 7); x.fill(); x.restore(); }
function label(el, p, txt, op) { el.style.opacity = op; if (!op) return; el.innerHTML = `<b>${esc(txt)}</b>`;
  const top = Math.max(16, p[1] - 128);                                       // the leader ends 12 px over the slab
  Object.assign(el.style, {left: (p[0] - 1) + 'px', top: top + 'px', height: Math.max(30, p[1] - 12 - top) + 'px'}); }

DEV.slabs = {
  build() { this.cv = fullCanvas(); this.x = this.cv.getContext('2d'); const sb = S.slabs || {};
    this.mode = sb.mode === 'compare' && sb.b ? 'compare' : 'tower'; this.a = String(sb.a || S.label || S.word || ''); this.b = String(sb.b || '');
    this.la = txt('dlabel', ''); this.lb = txt('dlabel', '');
    this.every = STEP; this.n = Math.max(6, Math.min(12, Math.floor((NF - STEP) / STEP)));     // the stepped law: one drop
    this.pitch = 4.32 / this.n; },                                                          // per 10-fps step, B ends at 77 % of A
  frame(f) { const st = stp(f), x = this.x, p = st / Math.max(1, NF), k = 1.07 - 0.07 * p;   // stepped dolly back
    const cam = {u: 104 * k, k, cx: 960 - 36 * p, cy: H * 0.80};
    floorGrid(x, cam); const A = [2.3, 2.3, 5.6], cmp = this.mode === 'compare';
    const ao = cmp ? [-3.35, 1.05, 0] : [-4.6, 2.3, 0];       // A and B on one depth line (X + Y equal): heights compare
    shadow(x, isoAt(ao, A, cam), 2.1, cam);
    const ta = isoBox(x, ao, A, cam);
    let tb = null, landed = 0;
    for (let i = 0; i < this.n; i++) {                        // slab i drops at frame 4 + i*every: 1 f in the air, then lands
      const fi = STEP + i * this.every; if (fi > f) break;           // on the dolly's step grid
      const air = f < fi + this.every ? 1.4 : 0; if (!air) landed++;
      if (air) { x.save(); x.filter = 'blur(3px)'; x.globalAlpha = 0.85; }
      if (cmp) { if (i === 0) shadow(x, isoAt([1.05, -3.35, 0], A, cam), 2.1, cam);
        tb = isoBox(x, [1.05, -3.35, i * this.pitch + air], [2.3, 2.3, this.pitch * 0.92], cam); }
      else { const c = i % 6, r = Math.floor(i / 6);              // a long block: 2 rows of 6 on A's depth line
        tb = isoBox(x, [-0.8 + c * 0.93 + r * 0.95, 0.8 - c * 0.93 + r * 0.95, air], [0.85, 0.85, 0.85], cam); }
      if (air) x.restore();
    }
    label(this.la, ta.top, this.a, Math.min(1, stp(f) / 6));                     // fades in over 2 steps (t1: 4 f)
    label(this.lb, tb ? tb.top : [0, 0], this.b, cmp && landed >= 2 ? Math.min(1, (landed - 1) / 2) : 0); } };

DEV.triptych = {
  build() { setGround('beat'); const L = pics(S.images, 3); this.s = [];
    for (let i = 0; i < 3; i++) { const d = document.createElement('div'); d.style.cssText = `position:absolute;top:0;height:${H}px;left:${i * 640 + (i ? 4.5 : 0)}px;width:${640 - 4.5 - (i === 1 ? 4.5 : 0)}px;overflow:hidden`;
      const im = img(L[i % L.length], 'visibility:visible;object-position:50% 45%'); d.appendChild(im);
      const wh = document.createElement('div'); wh.style.cssText = 'position:absolute;inset:0;background:#FBFAF6'; d.appendChild(wh);
      scene.appendChild(d); this.s.push({d, im, wh}); }
    this.leak = txt('', '', 'position:absolute;left:1180px;top:-200px;width:900px;height:1500px;background:radial-gradient(ellipse at 70% 20%,rgba(255,250,236,.95),rgba(255,236,200,.35) 45%,rgba(255,255,255,0) 72%);mix-blend-mode:screen'); },
  frame(f) { this.s.forEach((s, i) => { const t = f - 2 * i; vis(s.d, t >= 0);
      s.wh.style.opacity = t <= 0 ? 0.88 : 0; s.im.style.transform = `scale(${1.12 - 0.028 * Math.floor(Math.max(0, t) / 2)})`; });
    this.leak.style.opacity = f >= 4 ? (f >= 6 ? 0.55 : 0.9) : 0; } };
