// HACKER — the cyber-war documentary look, measured off a reference channel, then made livelier.
// Everything lives on pure black. Colour is the side: green = the hackers, red = the enemy, blue = institutions and
// platforms, white = neutral facts, yellow = everyone else. Neon line characters with a light core and a halo, a dark
// globe that whip-spins to each named place, a network that grows and changes colour, pixel figures that decode,
// rebuilt post cards, a chapter card in dripping red caps. Every scene enters out of black or through a glitch
// (RGB split + scanline bars + torn slices) and leaves the same way; every scene pushes in slowly.
// Each scene times itself on its own duration D; word-timed beats arrive as S.beat_at (seconds from the scene start).

const HK = {};
// a vertical Short (1080x1920): every scene keeps its idea but is laid out for the tall frame — content between
// y 180 and 1550, key text kept out of the caption band (y 1200-1360); the landscape layout is untouched
const TALL = H > W, CX = W / 2, CY = H / 2;
const SVGN = 'http://www.w3.org/2000/svg';
const SIDE = {
  ally:  { c: '#2FD84A', core: '#C8FFC2', eye: '#E6FFE3', bg: 'rgba(0,70,20,.42)', txt: '#2BE36A', dim: '#1E6B2E' },
  enemy: { c: '#E8243C', core: '#FF8A96', eye: '#FFE0E4', bg: 'rgba(90,0,14,.45)', txt: '#FF2340', dim: '#6B1420' },
  inst:  { c: '#2F8BFF', core: '#BFE0FF', eye: '#E8F4FF', bg: 'rgba(0,40,110,.40)', txt: '#3C9BFF', dim: '#183E6E' },
  white: { c: '#F2F2F2', core: '#FFFFFF', eye: '#FFFFFF', bg: 'rgba(90,90,90,.30)', txt: '#F4F4F4', dim: '#5A5A5A' },
  other: { c: '#D8CB12', core: '#FFF59A', eye: '#FFFBD0', bg: 'rgba(80,70,0,.45)', txt: '#E8DA1E', dim: '#5E5810' },
};
const WHO_SIDE = { hacker: 'ally', operative: 'enemy', militant: 'enemy', agent: 'inst', person: 'inst' };
const sideOf = (v, d = 'ally') => SIDE[v] ? v : (WHO_SIDE[v] || d);
const SM = p => p * p * (3 - 2 * p);
const EO2 = p => 1 - (1 - p) * (1 - p);
const num = (v, d = 0) => { const x = Number(v); return isFinite(x) ? x : d; };
const frameN = t => Math.floor(t * 30 + 1e-6);
function hrand(n) { let x = Math.sin(n * 127.1 + (S.seed || 7) * 311.7) * 43758.5453; return x - Math.floor(x); }
function el(tag, css, parent, html) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (html != null) e.innerHTML = html;
  (parent || scene).appendChild(e);
  return e;
}
function svg(parent, w = W, h = H, css = '') {
  const s = document.createElementNS(SVGN, 'svg');
  s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;' + css;
  parent.appendChild(s);
  return s;
}
function sv(tag, attrs, parent) {
  const e = document.createElementNS(SVGN, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
}
const beat = (i, dflt) => (Array.isArray(S.beat_at) && S.beat_at[i] != null && isFinite(S.beat_at[i])) ? Number(S.beat_at[i]) : dflt;
const neon = (c, a = 5, b = 14) => `drop-shadow(0 0 ${a}px ${c}) drop-shadow(0 0 ${b}px ${c})`;
const PIX = "'HK Pixel', monospace", DRIP = "'HK Drip', 'HK Pixel', sans-serif", TERM = "'HK Term', monospace",
      UI = "'HK Sans', Inter, Arial, sans-serif", TYPE = "'HK Type', 'Courier New', monospace", SERIF = "'HK Serif', Georgia, serif",
      HEAVY = "'HK Heavy', 'Arial Black', sans-serif";

// ── the stage: black, a radial glow in the side's colour, a camera that pushes in, the glitch ──────────────────────
let _stage = null;
// what moves by itself while a scene holds — the current in the neon, breathing, a flicker, drifting dust: stageFrame
// runs every one of them on every frame
const _live = [];
// the characters' neon lines, 1.75x the reference's 5-6 px: thicker, brighter tubes
const LINE_K = 1.75;
function stage(o = {}) {
  scene.style.background = '#000';
  const fx = el('div', 'position:absolute;inset:0;overflow:hidden', scene);          // the part the glitch tears
  const glow = el('div', 'position:absolute;inset:0;opacity:0', fx);
  const cam = el('div', 'position:absolute;inset:0;transform-origin:50% 50%', fx);
  const bars = el('div', 'position:absolute;inset:0;pointer-events:none', scene);     // crisp bars over the tear
  const glows = (o.glows || []).map(g => `radial-gradient(ellipse ${g.rx || 36}% ${g.ry || 55}% at ${g.x || 50}% ${g.y || 55}%, ${SIDE[g.side || 'ally'].bg} 0%, rgba(0,0,0,0) 100%)`);
  glow.style.background = glows.join(',') || 'none';
  // the RGB split + horizontal smear + torn slices, as one SVG filter on the torn layer
  const defs = svg(scene, 0, 0, 'position:absolute;width:0;height:0');
  defs.innerHTML = `<filter id="hkG" x="-5%" y="0" width="110%" height="100%" color-interpolation-filters="sRGB">
    <feImage id="hkGmap" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap id="hkGdisp" in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="torn"/>
    <feGaussianBlur id="hkGblur" in="torn" stdDeviation="0 0" result="sm"/>
    <feColorMatrix in="sm" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/>
    <feOffset id="hkGr" in="r" dx="0" result="r2"/>
    <feColorMatrix in="sm" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="gb"/>
    <feOffset id="hkGb" in="gb" dx="0" result="gb2"/>
    <feBlend in="r2" in2="gb2" mode="screen"/></filter>`;
  const mapc = document.createElement('canvas'); mapc.width = 4; mapc.height = 270;
  const barEls = [0, 1, 2, 3, 4, 5, 6].map(() => el('div', 'position:absolute;left:0;width:100%;height:4px;opacity:0', bars));
  // dust: faint specks of the side's colour drifting up through each glow — the air in the room the neon lights
  const dust = [];
  if (o.dust && (o.glows || []).length) {
    const layer = el('div', 'position:absolute;inset:0;pointer-events:none', cam);
    const n = o.dust === true ? 18 : num(o.dust, 18);
    for (let i = 0; i < n; i++) {
      const g = o.glows[i % o.glows.length], P = SIDE[g.side || 'ally'];
      const cx = (g.x || 50) * W / 100, cy = (g.y || 55) * H / 100, rx = (g.rx || 36) * W / 100 * 0.8, ry = (g.ry || 55) * H / 100 * 0.8;
      const a = hrand(i * 13 + 5) * 6.283, r = Math.sqrt(hrand(i * 7 + 2));
      const size = 2.5 + hrand(i * 3 + 9) * 3.5;
      const d = el('div', `position:absolute;left:0;top:0;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;border-radius:50%;background:${P.core};box-shadow:0 0 ${(size * 2.5).toFixed(0)}px ${P.c};opacity:0`, layer);
      dust.push({ d, x0: cx + Math.cos(a) * rx * r, y0: cy + Math.sin(a) * ry * r, ry, v: 14 + hrand(i * 5 + 1) * 26,
                  sway: 6 + hrand(i * 11) * 14, ph: hrand(i * 17 + 3) * 6.283, top: cy - ry, span: 2 * ry, k: 0.28 + hrand(i * 19) * 0.4 });
    }
  }
  _stage = { fx, glow, cam, bars, barEls, mapc, dust, rate: o.rate != null ? o.rate : 0.0163, fo: o.focus || [CX, CY],
             enter: S.enter || o.enter || (hrand(3) < .45 ? 'glitch' : 'fade'), exit: S.exit || o.exit || (hrand(5) < .4 ? 'glitch' : 'fade'),
             glowIn: o.glowIn != null ? o.glowIn : 0.25, fadeIn: o.fadeIn || [0.06, 0.34], glowK: 1 };
  return _stage;
}
// a glitch frame: k = 0..1 strength, n = frame number (the random pattern changes every frame)
function glitchFrame(k, n, black) {
  const st = _stage, f = st.fx;
  if (k <= 0) { f.style.filter = 'none'; st.barEls.forEach(b => b.style.opacity = 0); f.style.opacity = 1; return; }
  const x = st.mapc.getContext('2d'), im = x.createImageData(4, 270);
  let slice = 0, off = 128;
  for (let y = 0; y < 270; y++) {
    if (y >= slice) { slice = y + 2 + Math.floor(hrand(n * 31 + y) * 6); off = hrand(n * 17 + y * 3) < .45 ? 128 + Math.round((hrand(n * 7 + y) - .5) * 250) : 128; }
    for (let c = 0; c < 4; c++) { const i = (y * 4 + c) * 4; im.data[i] = off; im.data[i + 1] = 128; im.data[i + 2] = 128; im.data[i + 3] = 255; }
  }
  x.putImageData(im, 0, 0);
  document.getElementById('hkGmap').setAttribute('href', st.mapc.toDataURL());
  document.getElementById('hkGdisp').setAttribute('scale', (90 * k).toFixed(1));
  document.getElementById('hkGblur').setAttribute('stdDeviation', `${(10 * k).toFixed(1)} 0`);
  document.getElementById('hkGr').setAttribute('dx', (11 * k).toFixed(1));
  document.getElementById('hkGb').setAttribute('dx', (-11 * k).toFixed(1));
  f.style.filter = 'url(#hkG)';
  f.style.opacity = black ? 0 : (0.45 + 0.55 * hrand(n * 13));
  st.barEls.forEach((b, i) => {
    const on = hrand(n * 5 + i * 11) < 0.35 + 0.4 * k;
    b.style.opacity = on ? (0.35 + 0.4 * hrand(n + i)) : 0;
    b.style.top = Math.round(hrand(n * 3 + i * 7) * H) + 'px';
    b.style.height = (3 + Math.round(hrand(n + i * 2) * 2)) + 'px';
    b.style.background = hrand(n * 9 + i) < .6 ? '#8C8C8C' : '#2D7A3A';
  });
}
// the frame-level envelope every scene shares: black dip or glitch in, push, black dip or glitch out
function stageFrame(t, extraScale = 1) {
  const st = _stage; if (!st) return;
  const n = frameN(t), nOut = frameN(D) - n;       // frames left
  const s = (1 + st.rate * t) * extraScale;
  st.cam.style.transformOrigin = `${st.fo[0]}px ${st.fo[1]}px`;
  st.cam.style.transform = `scale(${s.toFixed(5)})`;
  st.glow.style.opacity = SM(seg(t, 0.05, 0.05 + st.glowIn + 0.5)) * st.glowK;
  let k = 0, black = false, op = 1;
  if (st.enter === 'glitch' && n <= 4) { k = n === 0 ? 1 : [1, 0.9, 0.7, 0.45, 0.25][n]; black = n === 0; }
  if (st.enter === 'fade') op = Math.min(op, SM(seg(t, st.fadeIn[0], st.fadeIn[1])));
  // 'cut': a carry-over — the scene is there from its first frame (its elements move in themselves)
  if (st.exit === 'glitch' && nOut <= 2) { k = Math.max(k, nOut <= 0 ? 1 : 0.8); black = black || nOut <= 0; }
  if (st.exit === 'fade') op = Math.min(op, seg(D - t, 0.02, 0.2));
  if (k > 0) glitchFrame(k, n, black);
  else { st.fx.style.filter = 'none'; st.barEls.forEach(b => b.style.opacity = 0); st.fx.style.opacity = op; }
  st.dust.forEach(p => {
    const y = p.top + ((p.y0 - p.top - p.v * t) % p.span + p.span) % p.span, x = p.x0 + p.sway * Math.sin(t * 0.9 + p.ph);
    p.d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    p.d.style.opacity = (p.k * SM(seg(t, 0.1, 0.9)) * (0.6 + 0.4 * Math.sin(t * 2.3 + p.ph * 3))).toFixed(3);
  });
  _live.forEach(f => f(t));
}

// ── line art: characters and icons, drawn once as SVG (a halo stroke + a light core) ───────────────────────────────
const FILL = '#0E1518';
function lineArt(parent, paths, side, sw = 5.5, x = 0, y = 0, sc = 1, opts = {}) {
  const P = SIDE[side] || SIDE.ally;
  const g = sv('g', { transform: `translate(${x},${y}) scale(${sc})` }, parent);
  const fills = sv('g', {}, g), halo = sv('g', { fill: 'none', stroke: P.c, 'stroke-width': sw * 2.1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .6 }, g);
  const main = sv('g', { fill: 'none', stroke: P.c, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const core = sv('g', { fill: 'none', stroke: P.core, 'stroke-width': sw * 0.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .92 }, g);
  halo.style.filter = `blur(${sw * 1.5}px)`;
  for (const p of paths) {
    if (p.fill) sv('path', { d: p.d, fill: p.fill === true ? FILL : p.fill, stroke: 'none' }, fills);
    if (p.fill === 'only') continue;
    sv('path', { d: p.d }, halo); sv('path', { d: p.d }, main);
    if (!p.nocore) sv('path', { d: p.d }, core);
  }
  if (opts.current) {             // a bright pulse running round the longest outlines, like current through the tube
    const spark = sv('g', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': sw * 0.62, 'stroke-linecap': 'round' }, g);
    spark.style.filter = neon(P.c, 3, 11);
    const longest = [...main.children].map(e => ({ e, L: e.getTotalLength ? e.getTotalLength() : 0 }))
      .filter(o => o.L > 900).sort((a, b) => b.L - a.L).slice(0, 2);
    const runs = [];
    longest.forEach((o, i) => { for (let k = 0; k < (i ? 1 : 2); k++) {
      const Dd = Math.min(150, o.L * 0.055);
      const pe = sv('path', { d: o.e.getAttribute('d'), 'stroke-dasharray': `${Dd.toFixed(0)} ${(o.L + Dd).toFixed(0)}` }, spark);
      runs.push({ pe, L: o.L, Dd, ph: hrand(i * 7 + k * 3 + Math.round(x)) * o.L + k * o.L / 2 }); } });
    const v = opts.speed || 640;
    _live.push(t => runs.forEach(r => {
      r.pe.setAttribute('stroke-dashoffset', (-((t * v + r.ph) % (r.L + r.Dd))).toFixed(1));
      r.pe.setAttribute('opacity', (0.55 + 0.45 * SM(seg(t, 0.4, 1.0))).toFixed(2));
    }));
  }
  return g;
}
// the hooded hacker bust, local units (hood tip at 497,82; at scale 0.92 the tip sits at y 170 and the shoulders run
// off both sides — proportions measured on the reference bust, GRAPHICS.md §1)
const HACKER = [
  { d: 'M0 1110 L10 950 C16 860 30 790 66 712 C88 690 110 676 150 662 C180 652 200 640 205 600 C212 560 214 540 216 520 C226 360 296 172 497 100 C698 172 768 360 778 520 C780 540 782 560 789 600 C794 640 814 652 844 662 C884 676 906 690 928 712 C964 790 978 860 984 950 L994 1110 Z', fill: true },
  { d: 'M497 332 C606 336 700 400 740 480 C770 545 760 590 722 628 C656 690 560 700 497 724 C434 700 338 690 272 628 C234 590 224 545 254 480 C294 400 388 336 497 332 Z', fill: true },
  { d: 'M497 358 C596 362 678 420 714 490 C740 546 732 584 698 616 C638 672 552 682 497 704 C442 682 356 672 296 616 C262 584 254 546 280 490 C316 420 398 362 497 358 Z' },
  { d: 'M497 100 L497 332' },
  { d: 'M420 700 C380 735 310 755 230 770' }, { d: 'M574 700 C614 735 684 755 764 770' },
  { d: 'M359 740 L359 972 C359 996 391 996 391 972 L391 744' }, { d: 'M603 744 L603 972 C603 996 635 996 635 972 L635 740' },
  { d: 'M130 780 C150 850 164 930 168 1110' }, { d: 'M864 780 C844 850 830 930 826 1110' },
];
// the masked operative: a head wrap with two bands and a tail, a rounded eye slit, a face cloth, three scarf wraps,
// shoulders wider than the frame's middle, a chest rig with straps, a band and pouches (top of the wrap at y 2)
const OPERATIVE = [
  { d: 'M-90 1110 L-80 1010 C-40 880 80 800 240 766 L760 766 C920 800 1040 880 1080 1010 L1090 1110 Z', fill: true },
  { d: 'M270 400 C212 430 160 480 130 560 L206 548 C196 588 204 626 226 650 L284 584 Z', fill: true },
  { d: 'M262 330 C250 150 360 12 500 2 C640 12 750 150 738 330 C740 470 712 590 660 690 L340 690 C288 590 260 470 262 330 Z', fill: true },
  { d: 'M262 330 C250 150 360 12 500 2 C640 12 750 150 738 330' },
  { d: 'M258 214 C380 150 620 146 742 206' }, { d: 'M262 276 C386 222 614 220 740 268' },
  { d: 'M340 305 L660 305 C690 305 704 325 704 352 C704 380 690 400 660 400 L340 400 C310 400 296 380 296 352 C296 325 310 305 340 305 Z', fill: true },
  { d: 'M300 400 C300 510 326 600 364 668' }, { d: 'M700 400 C700 510 674 600 636 668' },
  { d: 'M262 590 C380 700 620 700 738 590' }, { d: 'M238 672 C380 800 620 800 762 672' }, { d: 'M262 756 C400 850 600 850 738 756' },
  { d: 'M222 800 L196 1110' }, { d: 'M778 800 L804 1110' }, { d: 'M150 952 L850 952' },
  { d: 'M300 980 L420 980 L420 1110' }, { d: 'M580 980 L700 980 L700 1110' },
  { d: 'M60 900 C90 950 100 1010 100 1110' }, { d: 'M940 900 C910 950 900 1010 900 1110' },
];
const AGENT = [
  { d: 'M500 150 C590 150 650 216 650 300 C650 386 590 450 500 450 C410 450 350 386 350 300 C350 216 410 150 500 150 Z', fill: true },
  { d: 'M200 820 C220 620 340 520 500 520 C660 520 780 620 800 820 Z', fill: true },
  { d: 'M440 520 L500 640 L560 520' },
];
// the agent as a character (who: agent): a suited man in dark glasses with an earpiece — the institutions' face on
// black; the plain person icon (AGENT) stays for link targets, as in the reference (MICHAEL SMITH II)
const AGENT_FIG = [
  { d: 'M20 1110 C40 930 130 820 290 770 L430 722 L500 800 L570 722 L710 770 C870 820 960 930 980 1110 Z', fill: true },
  { d: 'M438 536 L438 640 L500 700 L562 640 L562 536 Z', fill: true },
  { d: 'M500 150 C604 150 672 232 672 338 C672 448 600 534 500 544 C400 534 328 448 328 338 C328 232 396 150 500 150 Z', fill: true },
  { d: 'M332 318 C322 206 404 130 500 128 C596 130 678 206 668 318 C650 262 606 236 548 232 C524 250 476 256 424 246 C386 262 350 284 332 318 Z', fill: true },
  { d: 'M366 318 L482 318 C486 356 470 388 428 390 C388 390 370 362 366 318 Z', fill: '#05080B' },
  { d: 'M518 318 L634 318 C630 362 612 390 572 390 C530 388 514 356 518 318 Z', fill: '#05080B' },
  { d: 'M482 330 C492 320 508 320 518 330' }, { d: 'M366 324 L332 318' }, { d: 'M634 324 L668 318' },
  { d: 'M668 330 C690 332 696 366 684 392 C676 406 666 408 660 402' },
  { d: 'M684 396 C712 450 706 520 676 580 C656 622 654 664 668 720', nocore: true },
  { d: 'M462 470 C480 478 520 478 538 470', nocore: true },
  { d: 'M438 640 L410 700 L470 742 L500 702 L530 742 L590 700 L562 640' },
  { d: 'M486 704 L514 704 L524 736 L510 760 L540 1000 L500 1060 L460 1000 L490 760 L476 736 Z', fill: true },
  { d: 'M430 724 L376 880 L456 840 L500 980' }, { d: 'M570 724 L624 880 L544 840 L500 980' },
];
const SHIELD = 'M100 250 C180 250 250 222 300 162 C362 204 440 202 500 130 C560 202 638 204 700 162 C750 222 820 250 900 250 L900 560 C900 700 720 800 500 850 C280 800 100 700 100 560 Z';
const STAR = 'M500 300 L541 424 L672 424 L566 501 L606 626 L500 549 L394 626 L434 501 L328 424 L459 424 Z';
const ICON = {
  cuffs: [{ d: 'M300 540 m-150 0 a150 150 0 1 0 300 0 a150 150 0 1 0 -300 0' }, { d: 'M700 540 m-150 0 a150 150 0 1 0 300 0 a150 150 0 1 0 -300 0' },
          { d: 'M300 390 L300 330 L700 330 L700 390' }, { d: 'M470 330 L530 330' }],
  person: AGENT,
  server: [{ d: 'M280 160 L720 160 L720 840 L280 840 Z', fill: true }, { d: 'M280 380 L720 380' }, { d: 'M280 600 L720 600' },
           { d: 'M340 270 L420 270' }, { d: 'M340 490 L420 490' }, { d: 'M340 710 L420 710' }],
  building: [{ d: 'M200 820 L800 820 L800 780 L200 780 Z', fill: true }, { d: 'M240 780 L240 460 M360 780 L360 460 M480 780 L480 460 M600 780 L600 460 M720 780 L720 460' },
             { d: 'M200 460 L800 460 L500 240 Z', fill: true }],
  laptop: [{ d: 'M260 300 L740 300 L740 640 L260 640 Z', fill: true }, { d: 'M180 700 L820 700 L760 640 L240 640 Z', fill: true }],
  phone: [{ d: 'M380 180 L620 180 C640 180 650 190 650 210 L650 790 C650 810 640 820 620 820 L380 820 C360 820 350 810 350 790 L350 210 C350 190 360 180 380 180 Z', fill: true }, { d: 'M470 760 L530 760' }],
  bomb: [{ d: 'M470 360 m-230 0 a230 230 0 1 0 460 0 a230 230 0 1 0 -460 0', fill: true }, { d: 'M600 200 L650 150 C690 110 730 120 760 90' }, { d: 'M590 170 L660 240' }],
  lock: [{ d: 'M300 460 L700 460 L700 820 L300 820 Z', fill: true }, { d: 'M370 460 L370 360 C370 250 630 250 630 360 L630 460' }, { d: 'M500 600 L500 690' }],
  wallet: [{ d: 'M220 330 L760 330 L760 760 L220 760 Z', fill: true }, { d: 'M600 470 L800 470 L800 620 L600 620 Z', fill: true }, { d: 'M260 330 L640 230 L680 330' }],
  coin: [{ d: 'M500 500 m-260 0 a260 260 0 1 0 520 0 a260 260 0 1 0 -520 0', fill: true }, { d: 'M500 500 m-200 0 a200 200 0 1 0 400 0 a200 200 0 1 0 -400 0' }],
  candle: [{ d: 'M400 480 L600 480 L600 860 L400 860 Z', fill: true }, { d: 'M500 440 C450 380 470 320 500 260 C530 320 550 380 500 440 Z' }],
  eye: [{ d: 'M160 500 C320 300 680 300 840 500 C680 700 320 700 160 500 Z', fill: true }, { d: 'M500 500 m-100 0 a100 100 0 1 0 200 0 a100 100 0 1 0 -200 0' }],
  globe: [{ d: 'M500 500 m-300 0 a300 300 0 1 0 600 0 a300 300 0 1 0 -600 0', fill: true }, { d: 'M200 500 L800 500 M500 200 C360 330 360 670 500 800 M500 200 C640 330 640 670 500 800' }],
  ghost: [{ d: 'M300 820 L300 420 C300 300 390 220 500 220 C610 220 700 300 700 420 L700 820 L633 760 L566 820 L500 760 L434 820 L367 760 Z', fill: true },
          { d: 'M430 430 m-30 0 a30 45 0 1 0 60 0 a30 45 0 1 0 -60 0' }, { d: 'M570 430 m-30 0 a30 45 0 1 0 60 0 a30 45 0 1 0 -60 0' }],
  skull: [{ d: 'M500 200 C660 200 760 310 760 450 C760 540 720 600 660 630 L660 760 L340 760 L340 630 C280 600 240 540 240 450 C240 310 340 200 500 200 Z', fill: true },
          { d: 'M410 470 m-55 0 a55 55 0 1 0 110 0 a55 55 0 1 0 -110 0' }, { d: 'M590 470 m-55 0 a55 55 0 1 0 110 0 a55 55 0 1 0 -110 0' }],
  check: [{ d: SHIELD, fill: true }, { d: 'M360 480 L460 580 L660 360' }],
  play: [{ d: 'M200 280 L800 280 L800 720 L200 720 Z', fill: true }, { d: 'M440 390 L600 500 L440 610 Z' }],
};
// a character: its line art, eyes that glow and flare, optional prop in front
function character(parent, who, side, x, y, sc, opts = {}) {
  const P = SIDE[side];
  const g = sv('g', {}, parent);
  const paths = who === 'operative' || who === 'militant' ? OPERATIVE : who === 'agent' ? AGENT_FIG : who === 'person' ? AGENT : HACKER;
  const live = opts.live !== false;
  lineArt(g, paths, side, (opts.sw || 5.6) * LINE_K, x, y, sc, { current: live ? 1 : 0 });
  if (paths === HACKER) {                                   // the bright highlight along the top of the inner rim
    const hl = sv('path', { d: 'M318 452 C372 386 440 362 497 360 C554 362 622 386 676 452', fill: 'none', stroke: '#F0FFEE', 'stroke-width': 3.2 * LINE_K * 0.85, 'stroke-linecap': 'round', transform: `translate(${x},${y}) scale(${sc})`, opacity: .85 }, g);
    hl.style.filter = neon(P.c, 3, 8);
  }
  const eyes = sv('g', {}, g);
  const E = who === 'operative' || who === 'militant' ? [[424, 352, 1], [603, 352, 1]] : who === 'agent' ? [[424, 338, 0], [576, 338, 0]] : who === 'person' ? [] : [[402, 470, -1], [587, 470, 1]];
  const eyeEls = E.map(([ex, ey, dir]) => {
    const cx = x + ex * sc, cy = y + ey * sc;
    const bloom = sv('circle', { cx, cy, r: (who === 'agent' ? 30 : 46) * sc, fill: P.c, opacity: .32 }, eyes); bloom.style.filter = `blur(${16 * sc}px)`;
    let slit;
    if (who === 'agent') {                                  // a glint across each dark lens
      slit = sv('path', { d: `M${cx - 30 * sc} ${cy + 6 * sc} L${cx + 8 * sc} ${cy - 9 * sc}`, fill: 'none', stroke: P.core, 'stroke-width': 7 * sc, 'stroke-linecap': 'round' }, eyes);
      slit.style.filter = neon(P.c, 3 * sc + 1, 10 * sc + 2);
      const pupil = sv('circle', { cx: cx + 8 * sc, cy: cy - 9 * sc, r: 5 * sc, fill: P.eye }, eyes);
      return { bloom, pupil, cx, cy };
    }
    if (who === 'operative' || who === 'militant') slit = sv('ellipse', { cx, cy, rx: 30 * sc, ry: 17 * sc, fill: P.c }, eyes);
    else { const xo = cx + 44 * sc * dir, xi = cx - 42 * sc * dir;
      slit = sv('path', { d: `M${xo} ${cy - 10 * sc} Q${cx} ${cy - 24 * sc} ${xi} ${cy + 7 * sc} Q${cx} ${cy + 9 * sc} ${xo} ${cy - 10 * sc} Z`, fill: P.c }, eyes); }
    slit.style.filter = neon(P.c, 3 * sc + 1, 10 * sc + 2);
    const pupil = sv('circle', { cx: who === 'operative' || who === 'militant' ? cx : cx + 28 * sc * dir, cy: cy - 5 * sc, r: 10 * sc, fill: P.eye }, eyes);
    return { bloom, pupil, cx, cy };
  });
  if (live) {
    // alive while it holds: it breathes (0.7 % from the bottom of the bust, a 2 px rise), the neon lights up like a
    // tube (a few flickers as it fades up, when asked) and drops out for two frames once somewhere after the first second
    const ph = hrand(Math.round(x) * 3 + Math.round(y) * 7 + who.length * 11);
    const bx = x + 500 * sc, by = y + 1100 * sc, ft = 1.3 + ph * 2.4;
    const ig = [0.1, 0.85, 0.25, 0.9, 0.2, 1, 0.6, 1, 0.85, 1, 1, 0.9];
    _live.push(t => {
      const b = Math.sin(t * 1.85 + ph * 6.283);
      g.setAttribute('transform', `translate(0 ${(-2.2 * b).toFixed(2)}) translate(${bx.toFixed(1)} ${by.toFixed(1)}) scale(${(1 + 0.007 * b).toFixed(4)}) translate(${(-bx).toFixed(1)} ${(-by).toFixed(1)})`);
      let o = 1;
      if (opts.ignite) { const f = Math.floor(t * 30); if (f < ig.length) o = ig[f]; }
      if (t > ft && t < ft + 0.067) o = Math.min(o, 0.45);
      g.style.opacity = o;
    });
  }
  return { g, eyes: eyeEls, flare(t) {                      // two short flares while it holds (+2.2 s and +2.7 s in the reference)
    const f = Math.max(Math.exp(-Math.pow((t - (opts.flare1 || 2.2)) / 0.12, 2)), Math.exp(-Math.pow((t - (opts.flare2 || 2.7)) / 0.12, 2)));
    eyeEls.forEach(e => { e.bloom.setAttribute('opacity', (.30 + .30 * f).toFixed(3)); e.bloom.setAttribute('r', (44 * sc * (1 + .22 * f)).toFixed(1)); e.pupil.setAttribute('r', (10 * sc * (1 + .35 * f)).toFixed(1)); });
    return f;
  } };
}
function icon(parent, name, side, x, y, sc, sw = 7) {
  if (name === 'shield') {                                 // the glass police badge: dark translucent body, bright rim, neon star
    const g = sv('g', { transform: `translate(${x},${y}) scale(${sc})` }, parent);
    const P = SIDE[side || 'inst'];
    const body = sv('path', { d: SHIELD, fill: 'rgba(14,26,42,.92)', stroke: P.c, 'stroke-width': 10 }, g); body.style.filter = neon(P.c, 5, 16);
    sv('path', { d: 'M130 262 C200 262 262 236 306 186 C366 226 440 224 500 160 C560 224 634 226 694 186 C738 236 800 262 870 262', fill: 'none', stroke: '#E8F4FF', 'stroke-width': 6, opacity: .5 }, g);
    sv('path', { d: 'M130 560 C130 690 300 780 500 822', fill: 'none', stroke: '#E8F4FF', 'stroke-width': 4, opacity: .25 }, g);
    const st = sv('path', { d: STAR, fill: 'none', stroke: P.core, 'stroke-width': 9, 'stroke-linejoin': 'round', transform: 'translate(500 480) scale(1.25) translate(-500 -463)' }, g); st.style.filter = neon(P.c, 4, 12);
    return g;
  }
  return lineArt(parent, ICON[name] || ICON.eye, side || 'inst', sw, x, y, sc);
}

// ── pixel type: glyphs that decode (top and bottom halves change on their own), boxed labels ───────────────────────
const GLY = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ#$%&@?';
function pixelText(parent, text, css) { return el('div', `position:absolute;font-family:${PIX};white-space:pre;${css}`, parent, esc(text)); }
function decodeSlots(parent, text, size, colour, x, y, align = 'center') {
  const box = el('div', `position:absolute;left:${x}px;top:${y}px;transform:translate(${align === 'center' ? -50 : 0}%,-50%);white-space:pre;font:${size}px/1 ${PIX};color:${colour};text-shadow:0 0 ${size * .1}px ${colour},0 0 ${size * .22}px ${colour}`, parent);
  const slots = [...String(text)].map(ch => {
    const s = el('span', 'position:relative;display:inline-block', box);
    const ghost = el('span', `position:absolute;left:${size * .06}px;top:${size * .05}px;color:rgba(160,160,160,.55);text-shadow:none;opacity:0`, s, esc(ch));
    const top = el('span', 'position:absolute;left:0;top:0;clip-path:inset(0 0 50% 0)', s, esc(ch));
    const bot = el('span', 'position:absolute;left:0;top:0;clip-path:inset(50% 0 0 0)', s, esc(ch));
    const sizer = el('span', 'visibility:hidden', s, esc(ch));
    return { ch, top, bot, ghost, fixed: !/[0-9A-Za-z]/.test(ch) };
  });
  return { box, slots, set(t, locks, n) {
    slots.forEach((s, i) => {
      const lk = locks[i] != null ? locks[i] : 0;
      if (s.fixed || t >= lk) { s.top.textContent = s.bot.textContent = s.ch; s.ghost.style.opacity = 0; return; }
      const set = /[0-9]/.test(s.ch) ? '0123456789' : GLY.slice(10);
      const a = set[Math.floor(hrand(n * 3 + i * 17) * set.length)], b = set[Math.floor(hrand(n * 5 + i * 29 + 7) * set.length)];
      s.top.textContent = a; s.bot.textContent = hrand(n + i) < .5 ? a : b;
      s.ghost.textContent = set[Math.floor(hrand(n * 11 + i) * set.length)]; s.ghost.style.opacity = .6;
    });
  } };
}
// a terminal window's life: the title bar (three dots and a prompt) and faint code scrolling up behind the text
function termChrome(win, P, label, size = 20) {
  const tex = el('div', `position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;opacity:.10`, win);
  const col = el('div', `position:absolute;left:18px;right:18px;top:0;font:${size}px/1.35 ${TERM};color:${P.txt};white-space:pre`, tex);
  const hex = '0123456789ABCDEF', ops = ['mov', 'xor', 'jmp', 'push', 'call', 'lea', 'cmp', 'ret'];
  const rows = [];
  for (let i = 0; i < 44; i++) {
    let r = '';
    for (let k = 0; k < 6; k++) r += hex[Math.floor(hrand(i * 31 + k) * 16)] + hex[Math.floor(hrand(i * 17 + k * 5) * 16)] + ' ';
    rows.push(`0x${(0x4f00 + i * 16).toString(16).toUpperCase()}  ${r} ${ops[i % ops.length]} ${hex[i % 16]}${hex[(i * 7) % 16]}h`);
  }
  col.textContent = rows.concat(rows).join('\n');
  const bar = el('div', `position:relative;z-index:1;display:flex;align-items:center;gap:${size * 0.55}px;margin:0 0 ${size * 0.9}px`, win);
  [0, 1, 2].forEach(i => el('div', `width:${size * 0.62}px;height:${size * 0.62}px;border-radius:50%;border:2px solid ${P.c};${i === 0 ? `background:${P.c};` : ''}box-shadow:0 0 6px ${P.c}`, bar, ''));
  el('div', `margin-left:${size * 0.4}px;font:${size * 0.8}px/1 ${PIX};color:${P.txt};opacity:.75;letter-spacing:.08em`, bar, esc(label));
  const line = size * 1.35;
  _live.push(t => { col.style.transform = `translateY(${(-((t * 34) % (line * 44))).toFixed(1)}px)`; });
  return bar;
}
function termLabel(S) {
  const slug = String(S.head || S.terminal_head || '').replace(/[^A-Za-z0-9]+/g, '').toLowerCase().slice(0, 14);
  return `root@${slug || 'node'}:~$`;
}
function boxedLabel(parent, text, colour, cx, cy, size = 38) {
  const b = el('div', `position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);padding:${size * .55}px ${size * .75}px ${size * .45}px;border:3px solid ${colour};font:${size}px/1 ${PIX};color:${colour};white-space:nowrap;letter-spacing:.06em;box-shadow:0 0 12px ${colour}66, inset 0 0 12px ${colour}33;text-shadow:0 0 8px ${colour}`, parent, esc(text));
  return b;
}

// ── 1. NEON — a character on black: fade up or glitch in, eyes flare, slow push ─────────────────────────────────────
HK.neon = function (S, root) {
  const who = S.who || 'hacker', side = sideOf(S.side || who), n = Math.max(1, Math.min(5, num(S.count, 1)));
  const hasSide = S.terminal || S.bubbles || S.prop === 'laptop';
  // tall: one bust fills the width above the captions (smaller and lower when a terminal or bubbles sit above it);
  // a group stands as a triangle (3) or two rows (5) instead of a line across the frame
  const BOT = 1180;                                           // the busts' feet, just above the caption band
  const sc = TALL ? (n === 1 ? (hasSide ? 0.74 : 0.98) : n === 3 ? 0.52 : 0.42) : (n === 1 ? (hasSide ? 0.9 : 0.92) : n === 3 ? 0.6 : 0.5);
  const offsets = TALL
    ? (n === 1 ? [[CX, BOT - 1110 * sc]] : n === 3 ? [[CX, 330], [CX - 255, 610], [CX + 255, 610]]
      : [[CX - 240, 380], [CX + 240, 380], [CX - 350, 700], [CX + 350, 700], [CX, 660]])
    : (n === 1 ? [[hasSide ? 640 : 960, 0]] : n === 3 ? [[620, 60], [960, 0], [1300, 60]] : [[380, 90], [670, 40], [960, 0], [1250, 40], [1540, 90]]);
  const topOf = dy => TALL ? dy : (n === 1 ? (who === 'operative' || who === 'militant' ? 95 : who === 'agent' ? 60 : 85) : 360) + dy;
  const st = stage({ glows: TALL ? [{ side, x: 50, y: 42, rx: 46, ry: 40 }, { side, x: 50, y: 42, rx: 30, ry: 26 }] : [{ side, x: 50, y: 50, rx: 34, ry: 62 }, { side, x: 50, y: 50, rx: 22, ry: 40 }],
                     rate: 0.0194, focus: TALL ? [CX, 720] : [960, 520], fadeIn: [0.0, 1.0], dust: 22 });
  const layer = svg(st.cam);
  const army = S.army ? sv('g', {}, layer) : null;
  if (army) for (let r = 0; r < 3; r++) for (let i = 0; i < (TALL ? 10 : 18); i++) {             // rows of red-eyed silhouettes behind
    const x = TALL ? 30 + i * 112 + (r % 2) * 56 : 40 + i * 108 + (r % 2) * 54, y = TALL ? 680 + r * 130 : 700 + r * 120, s = 0.22 + r * 0.05;
    character(army, who, side, x - 500 * s, y - 380 * s, s, { sw: 4, live: false });
  }
  const chars = [];
  offsets.forEach(([cx, dy], i) => chars.push(character(layer, who, side, cx - 500 * sc, topOf(dy), sc, { sw: 6.4, ignite: st.enter === 'fade' })));
  if (n > 1) { const haze = el('div', `position:absolute;left:10%;right:10%;${TALL ? `top:${BOT - 420}px;height:440px` : 'bottom:0;height:22%'};background:radial-gradient(ellipse 50% 60% at 50% 100%, ${SIDE[side].bg}, rgba(0,0,0,0));opacity:.9`, st.cam); }
  let kb = null;
  if (S.prop === 'keyboard' || S.terminal) {                  // a neon keyboard in perspective across the bottom
    const k = svg(st.cam); kb = k;
    const P = SIDE[side]; const g = sv('g', { stroke: P.c, fill: FILL, 'stroke-width': 4 }, k); g.style.filter = neon(P.c, 3, 9);
    // drawn once at the centred landscape place, then moved (tall: under the bust's hands, scaled with it)
    if (TALL) g.setAttribute('transform', `translate(${CX} ${BOT}) scale(${(sc / 0.92).toFixed(4)}) translate(-980 -1080)`);
    const ks = !TALL && hasSide;                              // landscape: beside the terminal, shifted left
    sv('path', { d: `M${ks ? 330 : 650} 1080 L${ks ? 430 : 750} 930 L${ks ? 890 : 1210} 930 L${ks ? 990 : 1310} 1080 Z` }, g);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) {
      const x0 = (ks ? 440 : 760) - r * 22 + c * 38 + r * 0, y0 = 945 + r * 34;
      sv('rect', { x: x0, y: y0, width: 30, height: 24, rx: 4, 'stroke-width': 2.5 }, g);
    }
  }
  let term = null, termLines = [];
  if (S.terminal) {
    const P = SIDE[S.terminal_side || side];
    term = el('div', `position:absolute;left:${TALL ? 60 : 1170}px;top:${TALL ? 170 : 170}px;width:${TALL ? W - 120 : 640}px;height:${TALL ? 250 : 380}px;border:3px solid ${P.c};border-radius:8px;background:rgba(0,0,0,.55);box-shadow:0 0 14px ${P.c}88, inset 0 0 20px ${P.c}22;padding:16px 26px 22px;font:${TALL ? 50 : 34}px/${TALL ? 1.2 : 1.25} ${TERM};color:${P.txt};text-shadow:0 0 6px ${P.c};overflow:hidden`, st.cam);
    termChrome(term, P, termLabel(S), TALL ? 18 : 16);
    termLines = (Array.isArray(S.terminal) ? S.terminal : [S.terminal]).map(() => el('div', `position:relative;z-index:1;white-space:${TALL ? 'pre-wrap' : 'pre'}`, term, ''));
  }
  let bubbles = [];
  if (S.bubbles) {
    const P = SIDE[side];
    // tall: two columns over the hood, left and right of its tip
    bubbles = S.bubbles.slice(0, 5).map((b, i) => el('div', `position:absolute;${TALL ? (i % 2 ? 'right:60px' : 'left:60px') : `left:${1260 + (i % 2) * 60}px`};top:${TALL ? 190 + Math.floor(i / 2) * 96 : 200 + i * 110}px;${TALL ? `max-width:${CX - 90}px;line-height:1.15;` : ''}padding:12px 22px;border:3px solid ${P.c};border-radius:10px;font:${TALL ? 40 : 28}px/1 ${UI};font-weight:600;color:${P.core};background:rgba(20,0,4,.6);box-shadow:0 0 12px ${P.c};opacity:0;transform-origin:${TALL && i % 2 ? '100%' : '0'} 50%`, st.cam, esc(b)));
  }
  const flip = S.flip_at != null ? num(S.flip_at) : null;
  const flipTo = sideOf(S.flip_to || 'enemy');
  let flipLayer = null;
  if (flip != null) {                                         // the colour flip: the same frame redrawn in the other side's colour
    flipLayer = el('div', 'position:absolute;inset:0;opacity:0', st.cam);
    const fg = el('div', `position:absolute;inset:0;background:radial-gradient(ellipse ${TALL ? '60% 40% at 50% 45%' : '40% 70% at 50% 58%'}, ${SIDE[flipTo].bg}, rgba(0,0,0,0))`, flipLayer);
    const l2 = svg(flipLayer); offsets.forEach(([cx, dy]) => character(l2, who, flipTo, cx - 500 * sc, TALL ? topOf(dy) : (n === 1 ? 95 : 360) + dy, sc));
  }
  const beams = S.beams ? chars.map(c => c.eyes.map(e => { const b = sv('path', { d: `M${e.cx} ${e.cy} L${e.cx} ${H + 40}`, stroke: SIDE[side].core, 'stroke-width': 10, opacity: 0 }, layer); b.style.filter = neon(SIDE[side].c, 6, 18); return b; })).flat() : [];
  return t => {
    stageFrame(t);
    let fl = 0; chars.forEach(c => { fl = Math.max(fl, c.flare(t) || 0); }); st.glowK = 0.85 + 0.35 * fl;
    termLines.forEach((ln, i) => { const L = String(S.terminal[i] ?? S.terminal); const t0 = 0.45 + i * 0.9; ln.innerHTML = typed(L, (t - t0) * 20, '█'); });
    bubbles.forEach((b, i) => { const t0 = beat(i, 0.5 + i * 0.8); const p = seg(t, t0, t0 + .18); b.style.opacity = p; b.style.transform = `scale(${(0.6 + 0.4 * eback(p)).toFixed(3)})`; });
    beams.forEach(b => b.setAttribute('opacity', SM(seg(t, 0.35, 0.55)).toFixed(3)));
    if (flipLayer) flipLayer.style.opacity = t >= flip ? 1 : 0;
  };
};

// ── 2. DUEL — two characters, eye lasers meeting in a spark ─────────────────────────────────────────────────────────
HK.duel = function (S, root) {
  const L = S.left || 'hacker', R = S.right || 'operative', sl = sideOf(S.left_side || L), sr = sideOf(S.right_side || R, 'enemy');
  // tall: a diagonal face-off — the left side high on the left, the other side low on the right, the beams meeting in
  // the black between the hood and the other's head
  const st = stage({ glows: TALL ? [{ side: sl, x: 26, y: 33, rx: 46, ry: 28 }, { side: sr, x: 74, y: 50, rx: 46, ry: 28 }] : [{ side: sl, x: 24, y: 58, rx: 30, ry: 62 }, { side: sr, x: 79, y: 58, rx: 30, ry: 62 }], rate: 0.019, enter: S.enter || 'cut', dust: 22 });
  const layer = svg(st.cam), sl_ = TALL ? 0.56 : L === 'operative' ? 0.82 : 0.8, sr_ = TALL ? 0.56 : R === 'operative' ? 0.82 : 0.8;
  const left = sv('g', {}, layer), right = sv('g', {}, layer);
  const yl = TALL ? 300 : L === 'operative' ? 640 - 352 * sl_ : 650 - 470 * sl_, yr = TALL ? 560 : R === 'operative' ? 640 - 352 * sr_ : 650 - 470 * sr_;
  const XL = TALL ? 280 : 470, XR = TALL ? W - 280 : 1500;
  const cl = character(left, L, sl, XL - 500 * sl_, yl, sl_, { sw: 6.4 }), cr = character(right, R, sr, XR - 500 * sr_, yr, sr_, { sw: 6.4 });
  const bx = TALL ? 610 : 945, by = TALL ? 440 : 392, TB = num(S.beams_at, 1.1), TS = TB + 0.2;
  const LO = TALL ? [XL, 600] : [470, 650];                    // where the left character's carry-over scales from
  const beams = [];
  [[cl, sl], [cr, sr]].forEach(([c, s]) => c.eyes.forEach(e => {
    const b = sv('line', { x1: e.cx, y1: e.cy, x2: bx, y2: by, stroke: SIDE[s].core, 'stroke-width': 5, opacity: 0 }, layer); b.style.filter = neon(SIDE[s].c, 3, 10); beams.push(b);
  }));
  const spark = sv('g', { opacity: 0 }, layer);
  sv('circle', { cx: bx, cy: by, r: 40, fill: 'rgba(200,200,200,.28)' }, spark);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; const col = Math.cos(a) < 0 ? SIDE[sl].c : SIDE[sr].c;
    const r = sv('line', { x1: bx, y1: by, x2: bx + Math.cos(a) * 64, y2: by + Math.sin(a) * 64, stroke: col, 'stroke-width': 3 }, spark); r.style.filter = neon(col, 2, 6); }
  const disc = sv('circle', { cx: bx, cy: by, r: 17, fill: '#fff' }, spark); disc.style.filter = neon('#ffffff', 6, 18);
  return t => {
    stageFrame(t);
    // the carry-over: the left character arrives from the centre, shrinking, blurred (done by 0.15 s); the right one
    // slides in from beyond the right edge and settles by 0.3 s
    const pl = EO2(seg(t, 0, 0.15)), pr = EO2(seg(t, 0, 0.3));
    left.setAttribute('transform', `translate(${lerp(TALL ? CX - XL : 420, 0, pl)},${lerp(-120, 0, pl)}) translate(${LO[0]} ${LO[1]}) scale(${lerp(1.25, 1, pl)}) translate(${-LO[0]} ${-LO[1]})`);
    left.style.filter = pl < 1 ? `blur(${((1 - pl) * 16).toFixed(1)}px)` : 'none'; left.style.opacity = (0.55 + 0.45 * pl).toFixed(3);
    right.setAttribute('transform', `translate(${lerp(520, 0, pr)},0)`);
    right.style.filter = pr < 1 ? `blur(${((1 - pr) * 6).toFixed(1)}px)` : 'none';
    const b = t >= TB ? 1 : 0; beams.forEach(x => x.setAttribute('opacity', b));
    spark.setAttribute('opacity', t >= TS ? 1 : 0);
    spark.setAttribute('transform', `rotate(${(t * 80) % 360} ${bx} ${by}) translate(${bx} ${by}) scale(${(1 + 0.15 * Math.sin(t * 14)).toFixed(3)}) translate(${-bx} ${-by})`);
    cl.flare(t - TB + 2.2); cr.flare(t - TB + 2.2);
  };
};

// ── 3. LINK — a character, a dotted line drawn to an institution's glass badge, a pixel label ───────────────────────
HK.link = function (S, root) {
  const who = S.from || 'hacker', side = sideOf(S.from_side || who), to = S.to || 'shield', ts = sideOf(S.to_side || (to === 'cuffs' ? 'white' : 'inst'), 'inst');
  // tall: top to bottom — the character, the dotted line running down, the institution's badge, its name under it
  const st = stage({ glows: TALL ? [{ side, x: 50, y: 22, rx: 44, ry: 20 }, { side: ts, x: 50, y: 52, rx: 40, ry: 18 }] : [{ side, x: 25, y: 50, rx: 24, ry: 48 }, { side: ts, x: 78, y: 45, rx: 22, ry: 42 }], rate: 0.016, fadeIn: [0.0, 0.3], dust: 16 });
  const layer = svg(st.cam), sc = TALL ? 0.48 : 0.5;
  const cg = sv('g', {}, layer); const ch = character(cg, who, side, (TALL ? CX : 480) - 500 * sc, TALL ? 160 : 166, sc, { sw: 7 });
  const tg = sv('g', { opacity: 0 }, layer);
  const tx = TALL ? CX : 1577, ty = TALL ? 990 : 495, tsz = TALL ? 0.4 : to === 'shield' ? 0.5 : 0.46;
  icon(tg, to, ts, tx - 500 * tsz, ty - 490 * tsz, tsz, 9);
  const P = SIDE[side];
  const x0 = TALL ? CX : 690, x1 = TALL ? CX : 1360, ly = 475, y0 = TALL ? 712 : ly, y1 = TALL ? 840 : ly;
  const line = sv('line', { x1: x0, y1: y0, x2: x0, y2: y0, stroke: P.c, 'stroke-width': 5 }, layer); line.style.filter = neon(P.c, 2, 6);
  const nodes = [0, 1, 2, 3, 4].map(i => { const r = TALL ? sv('rect', { x: x0 - 7, y: lerp(y0 + 12, y1 - 12, i / 4) - 7, width: 14, height: 14, fill: P.c, opacity: 0 }, layer)
    : sv('rect', { x: lerp(x0 + 30, x1 - 30, i / 4) - 7, y: ly - 7, width: 14, height: 14, fill: P.c, opacity: 0 }, layer); r.style.filter = neon(P.c, 2, 6); return r; });
  const text = String(S.label || '').toUpperCase();
  const lab = pixelText(st.cam, '', `left:${tx - 432}px;top:${ty + 268}px;font-size:40px;color:${SIDE[ts].txt};text-shadow:0 0 10px ${SIDE[ts].c};letter-spacing:.04em`);
  if (TALL) {                                                 // the name centred under the badge, measured whole so the typing never shifts it
    lab.textContent = text; fit(lab, W - 120, 46, 22);
    lab.style.left = Math.max(60, CX - lab.offsetWidth / 2) + 'px'; lab.style.top = (ty + 160) + 'px'; lab.textContent = '';
  }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const cut = S.cut ? sv('g', { opacity: 0 }, layer) : null;
  if (cut) { const a = sv('path', { d: `M${mx - 40} ${my - 40} L${mx + 40} ${my + 40} M${mx + 40} ${my - 40} L${mx - 40} ${my + 40}`, stroke: SIDE.enemy.c, 'stroke-width': 12, 'stroke-linecap': 'round' }, cut); a.style.filter = neon(SIDE.enemy.c, 4, 12); }
  return t => {
    stageFrame(t);
    const pm = SM(seg(t, 0.05, 0.45));
    cg.setAttribute('transform', TALL ? `translate(0,${lerp(-220, 0, pm)})` : `translate(${lerp(300, 0, pm)},0)`);
    const pt = seg(t, 0.45, 0.6); tg.setAttribute('opacity', pt > 0 ? Math.min(1, pt * 3) : 0);
    const s = lerp(0.35, 1, eback(pt)); tg.setAttribute('transform', `translate(${tx} ${ty}) scale(${s.toFixed(3)}) translate(${-tx} ${-ty})`);
    if (TALL) line.setAttribute('y2', lerp(y0, y1, seg(t, 0.55, 0.8)));
    else line.setAttribute('x2', lerp(x0, x1, seg(t, 0.55, 0.8)));
    nodes.forEach((nd, i) => nd.setAttribute('opacity', t >= 0.98 + i * 0.03 ? 1 : 0));
    lab.textContent = text.slice(0, Math.max(0, Math.floor((t - 1.0) * Math.max(10, text.length / 0.25))));
    if (cut) { const pc = seg(t, num(S.cut_at, 1.6), num(S.cut_at, 1.6) + 0.12); cut.setAttribute('opacity', pc > 0 ? 1 : 0); cut.setAttribute('transform', `translate(${mx} ${my}) scale(${lerp(1.8, 1, pc)}) translate(${-mx} ${-my})`); }
    ch.flare(t + 1);
  };
};

// ── 4. NETWORK — nodes grow outward from a centre icon, then a colour spreads through them ──────────────────────────
HK.network = function (S, root) {
  const side = sideOf(S.side || 'enemy', 'enemy'), mode = S.mode || 'spread', inv = sideOf(S.invader || (side === 'enemy' ? 'ally' : 'enemy'));
  // tall: the web grows in a tall ellipse over the upper two thirds (centre y 690), clear of the captions
  const NX = TALL ? CX : 960, NY = TALL ? 690 : 540, RX = TALL ? 470 : 760, RY = TALL ? 500 : 400;
  const st = stage({ glows: [TALL ? { side, x: 50, y: 36, rx: 60, ry: 34 } : { side, x: 50, y: 52, rx: 45, ry: 55 }], rate: 0.0134, glowIn: 1.6, fadeIn: [0.0, 0.12] });
  const layer = svg(st.cam);
  const N = Math.max(30, Math.min(150, num(S.nodes, 110)));
  const pts = [[NX, NY]]; let guard = 0;
  while (pts.length < N && guard++ < 20000) {                 // an ellipse of nodes, no two closer than 58 px
    const a = hrand(guard * 3) * Math.PI * 2, r = Math.sqrt(hrand(guard * 7 + 1)) ;
    const x = NX + Math.cos(a) * r * RX, y = NY + Math.sin(a) * r * RY;
    if (Math.hypot(x - NX, y - NY) < 150) continue;
    if (pts.every(p => Math.hypot(p[0] - x, p[1] - y) > 60)) pts.push([x, y]);
  }
  const links = [];
  pts.forEach((p, i) => {                                     // each node to its 1-2 nearest neighbours nearer the centre
    if (!i) return;
    const near = pts.map((q, j) => [j, Math.hypot(q[0] - p[0], q[1] - p[1])]).filter(([j, d]) => j !== i && d < 170).sort((a, b) => a[1] - b[1]).slice(0, 1 + (hrand(i) < .45 ? 1 : 0));
    near.forEach(([j]) => links.push([i, j]));
    if (Math.hypot(p[0] - NX, p[1] - NY) < 240) links.push([i, 0]);
  });
  const dist = pts.map(p => Math.hypot((p[0] - NX) / RX, (p[1] - NY) / RY));
  const T0 = 0.5, TG = num(S.grow_s, 0.8), TC = num(S.spread_at, 1.55), TCD = 0.8;
  const linkEls = links.map(([a, b]) => sv('line', { x1: pts[a][0], y1: pts[a][1], x2: pts[b][0], y2: pts[b][1], stroke: '#8A8A8A', 'stroke-width': 2.6, opacity: 0 }, layer));
  const nodeG = pts.map((p, i) => {
    if (!i) return null;
    const g = sv('g', { opacity: 0 }, layer);
    const ring = sv('circle', { cx: p[0], cy: p[1], r: 15, fill: 'rgba(10,10,10,.85)', stroke: '#9A9A9A', 'stroke-width': 3 }, g);
    const dot = sv('circle', { cx: p[0], cy: p[1], r: 5.5, fill: '#B8B8B8' }, g);
    const x = sv('path', { d: `M${p[0] - 9} ${p[1] - 9} L${p[0] + 9} ${p[1] + 9} M${p[0] + 9} ${p[1] - 9} L${p[0] - 9} ${p[1] + 9}`, stroke: SIDE[inv].c, 'stroke-width': 4, opacity: 0 }, g);
    return { g, ring, dot, x };
  });
  const cg = sv('g', { opacity: 0 }, layer);
  const P = SIDE[side];
  const ring = sv('circle', { cx: NX, cy: NY, r: 96, fill: '#050505', stroke: P.c, 'stroke-width': 6 }, cg); ring.style.filter = neon(P.c, 5, 16);
  const who = S.center || (side === 'enemy' ? 'operative' : side === 'inst' ? 'shield' : 'hacker');
  if (who === 'hacker' || who === 'operative' || who === 'agent') {
    const cid = 'hkring' + Math.floor(hrand(9) * 1e6);
    const cp = sv('clipPath', { id: cid }, cg); sv('circle', { cx: NX, cy: NY, r: 92 }, cp);
    const inner = sv('g', { 'clip-path': `url(#${cid})` }, cg);
    const k = who === 'operative' ? 0.2 : 0.19, cy0 = who === 'operative' ? 345 : 470;
    character(inner, who, side, NX - 500 * k, NY + 8 - cy0 * k, k, { sw: 6 });
  }
  else icon(cg, who, side, NX - 500 * 0.15, NY - 500 * 0.15, 0.15, 8);
  let ctr = null;
  if (S.counter) ctr = el('div', `position:absolute;left:${NX}px;top:${NY + 150}px;transform:translate(-50%,0);text-align:center;font:${TALL ? 52 : 44}px/1 ${PIX};color:#fff;text-shadow:0 0 10px #fff${TALL ? ';padding:14px 22px 12px;border-radius:10px;background:rgba(0,0,0,.78);box-shadow:0 0 30px 16px rgba(0,0,0,.78)' : ''}`, st.cam, '');
  const colFor = (i, t) => {                                  // grey -> side colour spreading from the centre (or the invader)
    const d = dist[i];
    if (mode === 'die') return { c: P.c, a: 1 - SM(seg(t, TC + d * TCD, TC + d * TCD + 0.25)) * 0.8 };
    const on = t >= TC + d * TCD;
    if (mode === 'infect') return { c: on ? SIDE[inv].c : P.c, a: 1 };
    if (mode === 'ban') return { c: P.c, a: 1 };
    return { c: on ? P.c : '#9A9A9A', a: on ? 1 : 0.72 };
  };
  return t => {
    stageFrame(t);
    const pc = seg(t, 0.08, 0.22); cg.setAttribute('opacity', pc);
    nodeG.forEach((nd, i) => {
      if (!nd) return;
      const t0 = T0 + dist[i] * TG; const p = seg(t, t0, t0 + 0.18);
      const k = colFor(i, t);
      nd.g.setAttribute('opacity', (p * k.a).toFixed(3));
      nd.ring.setAttribute('stroke', k.c); nd.dot.setAttribute('fill', k.c);
      nd.g.style.filter = k.c === '#9A9A9A' ? 'none' : `drop-shadow(0 0 5px ${k.c})`;
      if (mode === 'ban') nd.x.setAttribute('opacity', hrand(i * 13) < .35 && t >= TC + dist[i] * TCD ? 1 : 0);
    });
    linkEls.forEach((l, j) => {
      const [a, b] = links[j]; const t0 = T0 + Math.max(dist[a], dist[b] || 0) * TG + 0.1;
      l.setAttribute('opacity', (seg(t, t0, t0 + 0.2) * 0.7).toFixed(3));
      const k = colFor(a, t); l.setAttribute('stroke', k.c === '#9A9A9A' ? '#8A8A8A' : k.c);
    });
    if (ctr) { const v = num(S.counter.value), p = seg(t, 1.0, 2.6); ctr.innerHTML = `${fmt(Math.round(v * EO2(p)))}<div style="font-size:${TALL ? 22 : 18}px;margin-top:10px;opacity:.8">${esc(S.counter.label || '')}</div>`; }
  };
};

// ── 5. GLOBE — a dark orthographic globe that whip-spins to each named place, fills it, pulses, draws arcs ──────────
function world() { if (!world._f) world._f = topojson.feature(HK_WORLD, HK_WORLD.objects.countries).features; return world._f; }
function featuresOf(isos) { const set = new Set((isos || []).map(s => String(s).toUpperCase())); return world().filter(f => set.has(String(f.id))); }
function centroidOf(isos) { const fs = featuresOf(isos); if (!fs.length) return null; return d3.geoCentroid({ type: 'FeatureCollection', features: fs }); }
HK.globe = function (S, root) {
  // tall: the globe nearly the frame's width, centred at y 720 so its rim clears the captions
  const GX = TALL ? CX : 960, GY = TALL ? 720 : 545;
  const st = stage({ glows: [TALL ? { side: 'inst', x: 50, y: 37, rx: 62, ry: 34 } : { side: 'inst', x: 50, y: 50, rx: 38, ry: 52 }], rate: 0.0309, glowIn: 0.8, focus: TALL ? [GX, GY] : null });
  const cv = el('canvas', `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, st.cam); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');
  const R = TALL ? Math.min(W * 0.45, num(S.radius, 480)) : num(S.radius, 470);
  const proj = d3.geoOrthographic().scale(R).translate([GX, GY]).clipAngle(90).precision(0.6);
  const path = d3.geoPath(proj, cx), grat = d3.geoGraticule10(), feats = world();
  const stops = (S.stops || []).map((s, i) => {
    const c = s.lon != null ? [num(s.lon), num(s.lat)] : centroidOf(s.iso) || [0, 20];
    return { at: beat(i, s.at != null ? num(s.at) : 0.35 + i * 1.6), rot: [-c[0], -Math.max(-60, Math.min(60, c[1])) * 0.85], fs: featuresOf(s.iso), col: SIDE[sideOf(s.color || s.side || 'ally')].c };
  });
  const start = S.start ? [-num(S.start.lon), -num(S.start.lat)] : (stops[0] ? stops[0].rot : [-20, -25]);
  const hot = (S.hotspots || []).map(h => ({ lon: num(h[0] ?? h.lon), lat: num(h[1] ?? h.lat), col: SIDE[sideOf(h.color || S.hot_color || 'enemy')].c }));
  const arcs = (S.arcs || []).map((a, i) => ({ from: a.from, to: a.to, at: beat(stops.length + i, a.at != null ? num(a.at) : 0.6 + i * 0.3), col: a.color ? SIDE[sideOf(a.color)].core : '#FFFFFF' }));
  const lastC = stops.length ? [-stops[stops.length - 1].rot[0], -stops[stops.length - 1].rot[1] / 0.85] : (S.start ? [num(S.start.lon), num(S.start.lat)] : [20, 25]);
  const nDots = S.dots === true ? 16 : num(S.dots, 16);
  // the dots' side: dot_color, else the scene's side, else the colour its stops share (an attack's spread is red)
  const stopSides = [...new Set((S.stops || []).map(s => sideOf(s.color || s.side || 'ally')))];
  const dotSide = sideOf(S.dot_color || S.side || (stopSides.length === 1 ? stopSides[0] : 'ally'));
  const dotRgb = (() => { const h = SIDE[dotSide].c.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(','); })();
  const dots = S.dots ? d3.range(nDots).map(i => [lastC[0] + (hrand(i * 7) - .5) * 120, Math.max(-55, Math.min(70, lastC[1] + (hrand(i * 3) - .5) * 70))]) : [];
  const lighten = S.light ? featuresOf(S.light) : [];
  const spin = 0.27;
  function rotAt(t) {
    let r = start;
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i], t0 = s.at - spin - 0.03;
      if (t < t0) break;
      const p = seg(t, t0, t0 + spin); const e = eio3(p);
      const prev = r; let dl = s.rot[0] - prev[0]; dl = ((dl + 540) % 360) - 180;
      r = [prev[0] + dl * e, lerp(prev[1], s.rot[1], e)];
      if (p < 1) return r;
      r = s.rot;
    }
    return [r[0] + (S.drift != null ? num(S.drift) : 3) * Math.max(0, t - (stops.length ? stops[stops.length - 1].at : 0)) * 0, r[1]];
  }
  function draw(rot, alpha, t) {
    proj.rotate([rot[0], rot[1], 0]);
    cx.globalAlpha = alpha;
    cx.beginPath(); path({ type: 'Sphere' }); cx.fillStyle = '#0B0F12'; cx.fill();
    cx.beginPath(); path(grat); cx.strokeStyle = 'rgba(120,140,150,.10)'; cx.lineWidth = 1; cx.stroke();
    cx.beginPath(); feats.forEach(f => path(f)); cx.fillStyle = '#1B2023'; cx.fill();
    cx.strokeStyle = 'rgba(96,106,112,.55)'; cx.lineWidth = 1.1; cx.stroke();
    lighten.forEach(f => { cx.beginPath(); path(f); cx.fillStyle = 'rgba(190,196,200,.55)'; cx.fill(); });
    const clr = S.clear_at != null ? 1 - seg(t, num(S.clear_at), num(S.clear_at) + 0.25) : 1;
    stops.forEach(s => {
      const p = seg(t, s.at - 0.04, s.at + 0.1) * clr; if (p <= 0) return;
      s.fs.forEach(f => { cx.beginPath(); path(f); cx.fillStyle = s.col; cx.globalAlpha = alpha * p * .78; cx.fill(); cx.globalAlpha = alpha; });
    });
    hot.forEach((h, i) => {
      const xy = proj([h.lon, h.lat]); if (!xy || d3.geoDistance([h.lon, h.lat], [-rot[0], -rot[1]]) > 1.45) return;
      const ph = ((t * 0.9 + i * 0.37) % 1);
      cx.beginPath(); cx.arc(xy[0], xy[1], 6, 0, 7); cx.fillStyle = h.col; cx.shadowColor = h.col; cx.shadowBlur = 16; cx.fill();
      cx.beginPath(); cx.arc(xy[0], xy[1], 8 + ph * 34, 0, 7); cx.strokeStyle = h.col; cx.globalAlpha = alpha * (1 - ph) * .8; cx.lineWidth = 2.5; cx.stroke();
      cx.globalAlpha = alpha; cx.shadowBlur = 0;
    });
    dots.forEach((d, i) => {
      const d0 = num(S.dots_at, 0.4); const p = seg(t, d0 + i * 0.06, d0 + 0.15 + i * 0.06); if (p <= 0) return;
      const xy = proj(d); if (!xy || d3.geoDistance(d, [-rot[0], -rot[1]]) > 1.5) return;
      cx.beginPath(); cx.arc(xy[0], xy[1], 9, 0, 7); cx.fillStyle = SIDE[dotSide].c; cx.shadowColor = cx.fillStyle; cx.shadowBlur = 18; cx.globalAlpha = alpha * p; cx.fill();
      cx.beginPath(); cx.arc(xy[0], xy[1], 3.5, 0, 7); cx.fillStyle = SIDE[dotSide].core; cx.fill(); cx.shadowBlur = 0; cx.globalAlpha = alpha;
    });
    arcs.forEach(a => {
      const p = seg(t, a.at, a.at + 0.7); if (p <= 0) return;
      const ip = d3.geoInterpolate(a.from, a.to); const n = 48; cx.beginPath();
      for (let k = 0; k <= n * p; k++) { const q = ip(k / n); const xy = proj(q); const lift = Math.sin(Math.PI * k / n) * 0.12; if (!xy) continue;
        const X = GX + (xy[0] - GX) * (1 + lift), Y = GY + (xy[1] - GY) * (1 + lift); k ? cx.lineTo(X, Y) : cx.moveTo(X, Y); }
      cx.strokeStyle = a.col; cx.lineWidth = 3; cx.setLineDash([2, 9]); cx.shadowColor = a.col; cx.shadowBlur = 8; cx.stroke(); cx.setLineDash([]); cx.shadowBlur = 0;
      const end = proj(a.to); if (p >= 1 && end) { cx.beginPath(); cx.arc(end[0], end[1], 7, 0, 7); cx.fillStyle = SIDE.enemy.c; cx.fill(); }
    });
    cx.globalAlpha = alpha;
    const rimG = S.dots ? seg(t, num(S.dots_at, 0.4), num(S.dots_at, 0.4) + 0.3) : 0;
    cx.beginPath(); path({ type: 'Sphere' }); cx.strokeStyle = rimG > 0 ? `rgba(${dotRgb},${(.35 + .45 * rimG).toFixed(2)})` : 'rgba(170,190,200,.35)'; cx.lineWidth = 2 + rimG; cx.stroke();
    cx.globalAlpha = 1;
  }
  return t => {
    stageFrame(t);
    cx.clearRect(0, 0, W, H);
    // an in-frame motion blur for the whip-spins: the globe drawn at a few rotations across this frame's interval
    const r0 = rotAt(t), r1 = rotAt(t + 1 / 30);
    const d = Math.abs(((r1[0] - r0[0] + 540) % 360) - 180) + Math.abs(r1[1] - r0[1]);
    if (d > 2.5) { const n = 3; for (let k = 0; k < n; k++) draw(rotAt(t + k / (60 * n)), k === 0 ? 1 : 0.34, t); }
    else draw(r0, 1, t);
    const sp = S.shrink_at != null ? SM(seg(t, num(S.shrink_at), num(S.shrink_at) + 0.5)) : 0;
    cv.style.transform = `scale(${(1 - 0.22 * sp).toFixed(4)})`;
    if (TALL) cv.style.transformOrigin = `${GX}px ${GY}px`;
  };
};

// ── 6. MAP — a flat dark map framed on a region, pushing in; countries fill on their words, a pixel city label ──────
HK.map = function (S, root) {
  const st = stage({ glows: [], rate: 0.0295, glowIn: 0.5, focus: TALL ? [CX, 700] : null });
  const cv = el('canvas', `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, st.cam); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); const feats = world();
  const fills = (S.fills || []).map((f, i) => ({ fs: featuresOf(f.iso), at: beat(i, f.at != null ? num(f.at) : 0.5 + i * 1.2), col: SIDE[sideOf(f.color || 'enemy', 'enemy')].c, turn: f.turn ? SIDE[sideOf(f.turn)].c : null, turnAt: num(f.turn_at, 99) }));
  const focusFs = featuresOf(S.focus || (S.fills || []).flatMap(f => f.iso || []));
  // frame on each country's main landmass: France's overseas departments would otherwise frame the whole world
  const mainPart = f => {
    const g = f.geometry; if (!g || g.type !== 'MultiPolygon') return f;
    let best = null, ba = -1; g.coordinates.forEach(c => { const a = d3.geoArea({ type: 'Polygon', coordinates: c }); if (a > ba) { ba = a; best = c; } });
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: best } };
  };
  const fc = { type: 'FeatureCollection', features: (focusFs.length ? focusFs : featuresOf(['FRA'])).map(mainPart) };
  const pad = num(S.zoom_out, 1);
  const proj = d3.geoMercator(); // tall: the region framed in a tall box over the upper two thirds, clear of the captions
  if (TALL) proj.fitExtent([[CX - 400 * pad, 700 - 420 * pad], [CX + 400 * pad, 700 + 420 * pad]], fc);
  else proj.fitExtent([[960 - 330 * pad, 540 - 230 * pad], [960 + 330 * pad, 540 + 230 * pad]], fc);
  const k0 = proj.scale(), tr0 = proj.translate();
  const path = d3.geoPath(proj, cx);
  const lab = S.label ? { ...S.label, lon: num(S.label.lon), lat: num(S.label.lat) } : null;
  const labEl = lab ? pixelText(st.cam, '', `font-size:${TALL ? 36 : 24}px;color:${SIDE[sideOf(lab.color || 'white', 'white')].txt};text-shadow:0 0 8px ${SIDE[sideOf(lab.color || 'white', 'white')].c}`) : null;
  let labW = 0;                                               // tall: the label measured whole, kept inside the frame
  if (TALL && labEl) { labEl.textContent = String(lab.text || '').toUpperCase(); labW = labEl.offsetWidth; labEl.textContent = ''; }
  const drift = [num(S.drift_x, -18), num(S.drift_y, -6)];
  const lines = (S.lines || []).map((l, i) => ({ from: l.from, to: l.to, at: num(l.at, 1.2 + i * 0.25) }));
  return t => {
    stageFrame(t, 1);
    const z = 1 + 0.0 * t; proj.scale(k0 * z).translate([tr0[0] + drift[0] * t, tr0[1] + drift[1] * t]);
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = '#07090B'; cx.fillRect(0, 0, W, H);
    cx.beginPath(); feats.forEach(f => path(f)); cx.fillStyle = '#191D20'; cx.fill(); cx.strokeStyle = 'rgba(90,98,104,.6)'; cx.lineWidth = 1.2; cx.stroke();
    fills.forEach(f => {
      const p = seg(t, f.at - 0.05, f.at + 0.15); if (p <= 0) return;
      const col = t >= f.turnAt && f.turn ? f.turn : f.col;
      f.fs.forEach(g => { cx.beginPath(); path(g); cx.fillStyle = col; cx.globalAlpha = .62 * p; cx.shadowColor = col; cx.shadowBlur = 18; cx.fill(); cx.globalAlpha = 1; cx.shadowBlur = 0;
        cx.strokeStyle = col; cx.globalAlpha = .9 * p; cx.lineWidth = 2; cx.stroke(); cx.globalAlpha = 1; });
    });
    lines.forEach(l => { const p = seg(t, l.at, l.at + 0.5); if (p <= 0) return; const a = proj(l.from), b = proj(l.to);
      cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(lerp(a[0], b[0], p), lerp(a[1], b[1], p)); cx.strokeStyle = SIDE.enemy.c; cx.lineWidth = 3; cx.shadowColor = SIDE.enemy.c; cx.shadowBlur = 8; cx.stroke(); cx.shadowBlur = 0; });
    if (lab) {
      const xy = proj([lab.lon, lab.lat]); const p = seg(t, num(lab.at, 0.6), num(lab.at, 0.6) + 0.2);
      if (lab.crosshair) {
        const r = lerp(90, 42, EO2(seg(t, num(lab.at, 0.6), num(lab.at, 0.6) + 0.35)));
        cx.strokeStyle = SIDE.enemy.c; cx.lineWidth = 3; cx.globalAlpha = p; cx.shadowColor = SIDE.enemy.c; cx.shadowBlur = 10;
        cx.beginPath(); cx.arc(xy[0], xy[1], r, 0, 7); cx.stroke(); cx.beginPath(); cx.arc(xy[0], xy[1], 5, 0, 7); cx.fill();
        cx.beginPath(); cx.moveTo(xy[0] - r - 22, xy[1]); cx.lineTo(xy[0] - r + 12, xy[1]); cx.moveTo(xy[0] + r - 12, xy[1]); cx.lineTo(xy[0] + r + 22, xy[1]);
        cx.moveTo(xy[0], xy[1] - r - 22); cx.lineTo(xy[0], xy[1] - r + 12); cx.moveTo(xy[0], xy[1] + r - 12); cx.lineTo(xy[0], xy[1] + r + 22); cx.stroke(); cx.globalAlpha = 1; cx.shadowBlur = 0;
      } else {
        cx.globalAlpha = p; cx.beginPath(); cx.arc(xy[0], xy[1], 9, 0, 7); cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke(); cx.beginPath(); cx.arc(xy[0], xy[1], 3.5, 0, 7); cx.fillStyle = '#fff'; cx.fill(); cx.globalAlpha = 1;
      }
      if (TALL) {
        let lx = lab.crosshair ? xy[0] - labW / 2 : xy[0] + 26;
        if (!lab.crosshair && lx + labW > W - 50) lx = xy[0] - 26 - labW;      // no room on the right: the name goes left
        labEl.style.left = Math.max(50, Math.min(W - 50 - labW, lx)) + 'px'; labEl.style.top = (xy[1] + (lab.crosshair ? 92 : -18)) + 'px';
      } else { labEl.style.left = (xy[0] + (lab.crosshair ? 0 : 22)) + 'px'; labEl.style.top = (xy[1] + (lab.crosshair ? 60 : -12)) + 'px'; }
      labEl.textContent = String(lab.text || '').toUpperCase().slice(0, Math.max(0, Math.floor((t - num(lab.at, 0.6)) * 24)));
    }
  };
};

// ── 7. MONITOR — a picture inside a dark monitor turned in 3D (the footage frame `tilt` does the same for clips) ─────
function monitorBox(parent, o) {
  const w = o.w || 1500, h = o.h || 850;
  const wrap = el('div', `position:absolute;left:${o.x}px;top:${o.y}px;width:${w}px;height:${h}px;perspective:2400px`, parent);
  const mon = el('div', `position:absolute;inset:0;transform-origin:${o.side === 'right' ? '100%' : '0%'} 50%;transform:rotateY(${o.ry != null ? o.ry : 11}deg) rotateZ(${o.rz != null ? o.rz : -1.2}deg);border-radius:26px;background:linear-gradient(180deg,#26282C,#18191C 12%,#141518);box-shadow:0 0 0 1px #2E3034, 0 30px 80px rgba(0,0,0,.9)`, wrap);
  const scr = el('div', `position:absolute;left:28px;top:28px;right:28px;bottom:28px;border-radius:14px;overflow:hidden;background:#0B0C0E`, mon);
  return { wrap, mon, scr };
}
HK.monitor = function (S, root) {
  const st = stage({ rate: 0.0125, enter: S.enter || 'glitch', focus: TALL ? [CX, 740] : null });
  const side = S.place || 'full';
  // tall: a 16:10 monitor the frame's width, above the captions (a "right" one turns from its right edge)
  const box = TALL ? (side === 'full' ? { x: 50, y: 420, w: W - 100, h: 640 } : { x: 70, y: 450, w: W - 140, h: 580, side: side === 'right' ? 'right' : undefined })
    : side === 'full' ? { x: 210, y: 95, w: 1500, h: 880 } : side === 'right' ? { x: 880, y: 190, w: 780, h: 660, side: 'right' } : { x: 90, y: 180, w: 1000, h: 640 };
  const m = monitorBox(st.cam, box);
  if (S.src) el('div', `position:absolute;inset:-2%;background:url(${S.src}) center/cover;filter:saturate(.42) contrast(1.08) brightness(.9) hue-rotate(-6deg)`, m.scr);
  el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)', m.scr);
  const band = el('div', 'position:absolute;left:0;right:0;height:22%;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.05),rgba(255,255,255,0))', m.scr);
  return t => { stageFrame(t); band.style.top = ((t * 18) % 130 - 25) + '%'; };
};

// ── 8. DECODE — a date, a clock or a number decoding in chunky pixel glyphs; a counter with a boxed label ───────────
HK.decode = function (S, root) {
  const side = sideOf(S.side || 'white', 'white'), P = SIDE[side];
  const st = stage({ glows: [TALL ? { side, x: 50, y: 36, rx: 50, ry: 26 } : { side, x: 50, y: 55, rx: 30, ry: 40 }], rate: 0.014, dust: 12, focus: TALL ? [CX, 700] : null });
  const items = S.pair ? S.pair.slice(0, 2) : [S];
  const land = num(S.land_s, 1.25);
  const parts = items.map((it, j) => {
    // tall: one figure centred at y 700 (a label above it, an icon above that); a pair stacked, one over the other
    const cxp = TALL ? CX : items.length === 2 ? (j ? 1340 : 580) : 960;
    // a figure keeps its own decimals ("ten dollars and sixty-nine cents" is $10.69, never $11)
    const dec = it.decimals != null ? num(it.decimals, 0) : Math.min(3, (String(it.value ?? '').split('.')[1] || '').length);
    const big = it.text != null ? String(it.text) : `${it.prefix || ''}${fmt(num(it.value), dec)}${it.suffix || ''}`;
    // pixel glyphs are square (1 em a letter): a long date ("DECEMBER 2017") shrinks to fit the frame, never runs off it
    const size = Math.min(num(S.size, TALL ? (it.label || S.icon ? 200 : 240) : it.label || S.icon ? (big.length > 8 ? 130 : 150) : (big.length > 6 ? 150 : 200)),
                          (TALL ? W - 120 : items.length === 2 ? 800 : 1680) / (Math.max(1, big.length) * 1.04));
    const yT = items.length === 2 ? (j ? 960 : 540) : (S.icon ? 780 : 720), lyT = yT - (items.length === 2 ? 150 : S.icon ? 170 : 175);
    const y = TALL ? yT : it.label || S.icon ? (S.icon ? 610 : 600) : 540;
    const lbs = TALL ? Math.min(items.length === 2 ? 36 : 42, (W - 180) / (Math.max(1, String(it.label || '').length) * 1.07)) : items.length === 2 ? 30 : 36;
    const lbl = it.label ? boxedLabel(st.cam, String(it.label).toUpperCase(), P.txt, cxp, TALL ? lyT : S.icon ? 378 : 405, lbs) : null;
    if (lbl) lbl.style.opacity = 0;
    const d = decodeSlots(st.cam, big, size, P.txt, cxp, y);
    const scram = it.text == null && it.value != null;       // a counter scrambles through figures of the same length
    return { d, lbl, big, scram, t0: j * 0.45, ts0: d.box.style.textShadow, tf0: d.box.style.transform };
  });
  if (S.icon) icon(svg(st.cam), S.icon, S.icon === 'cuffs' ? 'white' : side, CX - 500 * (TALL ? 0.36 : 0.3), TALL ? 390 - 540 * 0.36 : 205 - 540 * 0.3, TALL ? 0.36 : 0.3, 10);
  return t => {
    stageFrame(t);
    const n = frameN(t);
    parts.forEach(p => {
      if (p.lbl) p.lbl.style.opacity = SM(seg(t, p.t0 + 0.08, p.t0 + 0.2));
      const L = p.big.length, T1 = p.t0 + land;
      const locks = [...p.big].map((c, i) => p.t0 + (p.scram ? 0.45 : 0.4) + (T1 - p.t0 - (p.scram ? 0.45 : 0.4)) * (i / Math.max(1, L - 1)) * (p.scram || i === L - 1 ? 1.0 : 0.72));
      p.d.box.style.opacity = t >= p.t0 + 0.08 ? 1 : 0;
      p.d.set(t, locks, n);
      const gT = t - T1;                                      // the lock: a split-colour jolt for four frames
      if (gT >= 0 && gT < 0.13) {
        p.d.box.style.textShadow = `-6px 0 0 rgba(255,40,90,.85), 6px 0 0 rgba(40,220,255,.85), ${p.ts0}`;
        p.d.box.style.transform = `${p.tf0} translateX(${((hrand(n * 7 + p.t0 * 100) - .5) * 18).toFixed(1)}px)`;
      } else { p.d.box.style.textShadow = p.ts0; p.d.box.style.transform = p.tf0; }
    });
  };
};

// ── 9. CHAPTER — "CHAPTER N" centre-out in pixel caps, the title typed from the centre in dripping red caps ─────────
HK.chapter = function (S, root) {
  const st = stage({ glows: [TALL ? { side: 'enemy', x: 50, y: 44, rx: 70, ry: 16 } : { side: 'enemy', x: 50, y: 53, rx: 46, ry: 22 }], rate: 0.006, focus: TALL ? [CX, 820] : null, enter: S.enter || 'fade', fadeIn: [0.0, 0.08], dust: 20 });
  // the chapter's number from the script ("## Title" lines, the cold open before the first is no chapter) in roman
  // numerals: a kicker handed in as "CHAPTER 2" reads CHAPTER II
  let kicker = String(S.kicker || `CHAPTER ${S.roman || roman(num(S.n, 1))}`).toUpperCase();
  const km = kicker.match(/^(\D+?)\s+(\d+)$/);
  if (km) kicker = `${km[1]} ${roman(Number(km[2]))}`;
  const k = pixelText(st.cam, '', `left:${CX}px;top:${TALL ? 700 : 408}px;transform:translate(-50%,-50%);font-size:${TALL ? 38 : 33}px;letter-spacing:.23em;color:#fff;text-shadow:0 0 8px rgba(255,255,255,.6)`);
  let title = String(S.title || '').toUpperCase();
  // tall: the title hangs from y 790, centred, broken over two balanced lines when one line would shrink it too far
  const tl = el('div', `position:absolute;left:${CX}px;top:${TALL ? 790 : 574}px;transform:translate(-50%,${TALL ? 0 : -50}%);white-space:${TALL ? 'pre' : 'nowrap'};${TALL ? 'text-align:center;' : ''}font:${num(S.size, 178)}px/1 ${DRIP};color:#FF2340;text-shadow:0 0 12px rgba(255,35,64,.85),0 0 30px rgba(255,35,64,.45)`, st.cam, esc(title));
  if (TALL) {
    const big = num(S.size, 170), ws = title.split(/\s+/).filter(Boolean);
    if ((fit(tl, W - 100, big, 60) < 150 || title.length > 13) && ws.length > 1) {
      let best = 1, bd = 1e9;
      for (let i = 1; i < ws.length; i++) { const d = Math.abs(ws.slice(0, i).join(' ').length - ws.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
      title = ws.slice(0, best).join(' ') + '\n' + ws.slice(best).join(' ');
      tl.textContent = title; tl.style.lineHeight = '1.05';
      let fs = big; tl.style.fontSize = fs + 'px'; while (fs > 60 && tl.offsetWidth > W - 100) { fs -= 4; tl.style.fontSize = fs + 'px'; }   // fit() would measure the two lines as one
    }
    tl.style.width = tl.offsetWidth + 'px';                   // a fixed box: each line stays centred while it types
  } else fit(tl, 1760, num(S.size, 178), 60);
  tl.innerHTML = '';
  const cps = 17, T0 = 0.85;
  return t => {
    stageFrame(t);
    k.textContent = kicker.slice(0, Math.max(0, Math.floor((t - 0.3) * kicker.length / 0.35)));
    const nch = Math.max(0, Math.floor((t - T0) * cps));
    const blink = Math.floor(t * 4) % 2 === 0;
    const cur = nch < title.length ? '_' : (blink && t < T0 + title.length / cps + 1.2 ? '_' : '');
    tl.innerHTML = t < T0 ? (blink || t < 0.3 ? '_' : '&nbsp;') : esc(title.slice(0, nch)) + `<span style="opacity:${cur ? 1 : 0}">_</span>`;
    tl.style.opacity = 0.93 + 0.07 * Math.sin(t * 23);
  };
};
function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n); }

// ── 10. POST — a rebuilt dark post card (or a messenger card) tilted in 3D: slides in, counts up, highlight, stamp ──
HK.post = function (S, root) {
  const enemy = sideOf(S.side || 'white', 'white') === 'enemy';
  const st = stage({ glows: [TALL ? { side: enemy ? 'enemy' : 'inst', x: 50, y: 46, rx: 56, ry: 22 } : { side: enemy ? 'enemy' : 'inst', x: 52, y: 64, rx: 30, ry: 26 }], rate: 0.0224, enter: S.enter || 'fade', focus: TALL ? [CX, 700] : null });
  const chat = S.kind === 'chat';
  // tall: the card the frame's width, bigger type, centred on y 700 once its height is known (below)
  const wrap = el('div', `position:absolute;left:${TALL ? 50 : chat ? 470 : 390}px;top:${chat ? 110 : 186}px;width:${TALL ? W - 100 : chat ? 1000 : 1210}px;perspective:2200px`, st.cam);
  const Z = TALL ? 1.2 : 1;                                   // the type scale
  const kc = enemy ? SIDE.enemy.c : '#222730';
  const card = el('div', `position:relative;transform-origin:50% 50%;border-radius:18px;background:${chat ? 'rgba(19,32,40,.94)' : '#0B0D11'};border:${enemy ? 3 : 2}px solid ${kc};box-shadow:${enemy ? `0 0 18px ${SIDE.enemy.c}aa,` : ''} 0 26px 60px rgba(0,0,0,.8);padding:${chat ? '34px 40px 44px' : TALL ? '44px 48px 54px' : '44px 56px 54px'};font-family:${UI};color:#E8E8E8`, wrap);
  let stats = [], mark = null, bubbles = [];
  const body = String(S.text || '');
  if (!chat) {
    const head = el('div', 'display:flex;align-items:center;gap:16px', card);
    el('div', `width:${66 * Z}px;height:${66 * Z}px;border-radius:50%;background:${enemy ? '#2A070C' : '#2A3038'};border:2px solid ${enemy ? SIDE.enemy.c : '#3A424C'};flex:none`, head, '');
    const nm = el('div', '', head, `<div style="font-weight:700;font-size:${34 * Z}px;color:#fff">${esc(S.who || 'Anon')}</div><div style="font-size:${23 * Z}px;color:#7A7F85;margin-top:2px">${esc(S.handle || '@user')}</div>`);
    el('div', 'margin-left:auto;width:44px;height:36px;align-self:flex-start', head, `<svg viewBox="0 0 24 20" width="44" height="36"><path fill="#1D9BF0" d="M23 2.3a9 9 0 0 1-2.6.7A4.6 4.6 0 0 0 22.4.4a9 9 0 0 1-2.9 1.1A4.5 4.5 0 0 0 11.8 5.6 12.8 12.8 0 0 1 2.5.9a4.5 4.5 0 0 0 1.4 6 4.5 4.5 0 0 1-2-.6v.1a4.5 4.5 0 0 0 3.6 4.4 4.5 4.5 0 0 1-2 .1 4.5 4.5 0 0 0 4.2 3.1A9 9 0 0 1 0 15.9 12.8 12.8 0 0 0 6.9 18c8.3 0 12.8-6.9 12.8-12.8v-.6A9.1 9.1 0 0 0 23 2.3z"/></svg>`);
    const tx = el('div', `margin-top:38px;font-size:${TALL ? 58 : 50}px;line-height:1.3;color:${enemy ? '#F29BA5' : '#EDEDED'}`, card);
    const marks = (S.marks || []).filter(Boolean);
    let html = esc(body);
    marks.forEach((m, i) => { html = html.replace(esc(m), `<span class="hkm" data-i="${i}" style="background:linear-gradient(#F2E600,#F2E600) no-repeat 0 0/0% 100%;color:inherit;padding:0 4px">${esc(m)}</span>`); });
    tx.innerHTML = html;
    mark = [...tx.querySelectorAll('.hkm')];
    const row = el('div', `display:flex;gap:64px;margin-top:36px;font-size:${24 * Z}px;color:#6E747B`, card);
    const base = S.stats || [40 + Math.round(hrand(1) * 200), 300 + Math.round(hrand(2) * 900), 800 + Math.round(hrand(3) * 2400)];
    stats = ['↩', '○', '♥'].map((ic, i) => ({ el: el('div', '', row, ''), ic, v: num(base[i]) }));
  } else {
    el('div', 'display:flex;align-items:center;gap:14px;margin-bottom:20px', card, `<div style="width:${40 * Z}px;height:${40 * Z}px;${TALL ? 'flex:none;' : ''}border-radius:50%;background:${enemy ? SIDE.enemy.c : '#27A6E5'}"></div><div><div style="font-weight:700;font-size:${26 * Z}px;color:#fff">${esc(S.header || 'intercepted — private group')}</div><div style="font-size:${17 * Z}px;color:#7C8A94">${esc(S.sub || '4 members')}</div></div>`);
    bubbles = (S.messages || []).slice(0, 6).map((m, i) => {
      const me = !!(m.me ?? (i % 2));
      const b = el('div', `display:table;margin:${i ? 18 : 0}px ${me ? '0 0 auto' : 'auto 0 0'};max-width:${TALL ? 84 : 78}%;padding:16px 26px;border-radius:16px;font-size:${TALL ? 40 : 32}px;line-height:1.25;background:${me ? '#2B5278' : '#22303A'};color:#EAF2F8;opacity:0;transform-origin:${me ? '100%' : '0%'} 50%;${me ? 'margin-left:auto' : ''}`, card, esc(m.text ?? m));
      return b;
    });
    if (S.tag !== false) el('div', `position:absolute;right:${TALL ? 0 : -30}px;top:-44px;font:${TALL ? 28 : 26}px ${PIX};color:${SIDE.ally.txt};text-shadow:0 0 10px ${SIDE.ally.c}`, card, esc(S.tag || 'INTERCEPTED'));
  }
  let stamp = null;
  if (S.stamp) {
    const sc = S.stamp_side ? SIDE[sideOf(S.stamp_side)].c : (/SUSPEND|OFFLINE|DOWN/i.test(S.stamp) ? SIDE.ally.c : SIDE.enemy.c);
    stamp = el('div', `position:absolute;left:50%;top:52%;transform:translate(-50%,-50%) rotate(-9deg);padding:10px 26px;border:6px solid ${sc};border-radius:8px;font:52px/1 ${PIX};color:${sc};text-shadow:0 0 8px ${sc};box-shadow:0 0 14px ${sc}66;white-space:nowrap;opacity:0`, card, esc(String(S.stamp).toUpperCase()));
  }
  const ry = num(S.ry, -5), rz = num(S.rz, -1.5);
  let swapEl = null; const swapAt = S.swap ? num(S.swap.at, 1.6) : 99;
  if (S.swap) {                                              // the post glitches into another one (a hijacked account)
    const w2 = el('div', `position:absolute;left:${TALL ? 50 : 390}px;top:170px;width:${TALL ? W - 100 : 1200}px;perspective:2200px;opacity:0`, st.cam);
    const c2 = el('div', `border-radius:18px;background:#0B0D11;border:3px solid ${SIDE.enemy.c};box-shadow:0 0 18px ${SIDE.enemy.c}aa;padding:40px 52px 34px;font-family:${UI};transform:rotateY(${ry}deg) rotateX(4deg) rotateZ(${rz}deg)`, w2);
    el('div', 'display:flex;align-items:center;gap:16px', c2, `<div style="width:66px;height:66px;border-radius:50%;background:#2A070C;border:2px solid ${SIDE.enemy.c}"></div><div><div style="font-weight:700;font-size:34px;color:#fff">${esc(S.swap.who || '[redacted] media')}</div><div style="font-size:23px;color:#7A7F85">${esc(S.swap.handle || S.handle || '')}</div></div>`);
    el('div', 'margin-top:26px;font-size:44px;line-height:1.28;color:#F29BA5', c2, esc(S.swap.text || ''));
    swapEl = w2;
  }
  if (TALL) {                                                 // centre the card (and its swap) on y 700, never above y 200
    wrap.style.top = Math.max(200, 700 - card.offsetHeight / 2) + 'px';
    if (swapEl) swapEl.style.top = Math.max(200, 700 - swapEl.offsetHeight / 2) + 'px';
  }
  return t => {
    stageFrame(t);
    const p = seg(t, 0.0, 0.3), e = eo3(p);
    card.style.transform = `translateX(${lerp(TALL ? -600 : -760, 0, e)}px) rotateY(${ry}deg) rotateX(4deg) rotateZ(${rz}deg)`;
    card.style.filter = p < 1 ? `blur(${((1 - e) * 14).toFixed(1)}px)` : 'none';
    card.style.opacity = p < 1 ? (0.5 + 0.5 * e).toFixed(3) : 1;
    if (swapEl) { const on = t >= swapAt; swapEl.style.opacity = on ? 1 : 0; card.style.visibility = on ? 'hidden' : 'visible';
      if (Math.abs(t - swapAt) < 0.1) glitchFrame(0.7, frameN(t), false); }
    stats.forEach((s, i) => { s.el.textContent = `${s.ic} ${fmt(Math.round(s.v * (0.3 + 0.7 * seg(t, 0.4, D))))}`; });
    (mark || []).forEach((m, i) => { const t0 = beat(i, num(S.mark_at, 0.9) + i * 0.5); m.style.backgroundSize = `${(100 * EO2(seg(t, t0, t0 + 0.3))).toFixed(1)}% 100%`; m.style.color = t > t0 + 0.05 ? '#000' : ''; });
    bubbles.forEach((b, i) => { const t0 = beat(i, 0.6 + i * 0.55); const q = seg(t, t0, t0 + 0.16); b.style.opacity = q; b.style.transform = `scale(${(0.7 + 0.3 * eback(q)).toFixed(3)})`; });
    if (stamp) { const t0 = num(S.stamp_at, Math.min(D - 1.2, 1.4)); const q = seg(t, t0, t0 + 0.12); stamp.style.opacity = q > 0 ? 1 : 0; stamp.style.transform = `translate(-50%,-50%) rotate(-9deg) scale(${lerp(1.7, 1, EO2(q)).toFixed(3)})`; }
  };
};

// ── MASK — a line mask in a tilted monitor; the other voice's words typed beside it in pixel caps ───────────────────
HK.mask = function (S, root) {
  // tall: the monitor on top, the words typed under it, stacked by their measured heights
  const st = stage({ glows: [TALL ? { side: 'ally', x: 50, y: 26, rx: 56, ry: 22 } : { side: 'ally', x: 30, y: 50, rx: 30, ry: 45 }], rate: 0.0181, enter: S.enter || 'glitch', focus: TALL ? [CX, 640] : null });
  const m = monitorBox(st.cam, TALL ? { x: 70, y: 190, w: W - 140, h: 640, ry: 9, rz: 1.8 } : { x: 70, y: 150, w: 940, h: 640, ry: 9, rz: 1.8 });
  const scr = m.scr; scr.style.background = 'linear-gradient(180deg,#1E2022,#151618)';
  const band = el('div', 'position:absolute;left:0;right:0;height:16%;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.06),rgba(255,255,255,0))', scr);
  const ms = svg(scr, 904, 564); const g = sv('g', { transform: 'translate(452 282) scale(.44) translate(-500 -520)' }, ms);
  lineArt(g, [{ d: 'M500 150 C660 150 760 250 760 420 C760 600 660 800 500 880 C340 800 240 600 240 420 C240 250 340 150 500 150 Z', fill: 'rgba(20,24,24,.4)' },
              { d: 'M330 430 C370 404 420 404 452 428 C420 446 370 446 330 430 Z' }, { d: 'M670 430 C630 404 580 404 548 428 C580 446 630 446 670 430 Z' },
              { d: 'M420 700 C470 720 530 720 580 700' }], 'ally', 5);
  const rec = el('div', `position:absolute;right:26px;bottom:18px;font:13px ${PIX};color:#ddd`, scr, '<span style="color:#FF2340">●</span> REC');
  const lines = (S.lines || [S.text || '']).map(x => String(x).toUpperCase());
  const lineEls = lines.map((ln, i) => el('div', `position:absolute;left:${TALL ? 70 : 1010}px;top:${300 + i * 104}px;width:${TALL ? W - 140 : 860}px;font:${TALL ? 40 : 34}px/1.5 ${PIX};color:${SIDE.ally.txt};text-shadow:0 0 10px ${SIDE.ally.c};white-space:pre-wrap`, st.cam, ''));
  if (TALL) {                                                 // each line measured whole, so a wrapped one never runs into the next
    let y = 900; const fs = lines.length > 4 ? 34 : 46;
    lineEls.forEach((le, i) => { le.style.fontSize = fs + 'px'; le.textContent = lines[i]; le.style.top = y + 'px'; y += le.offsetHeight + 14; le.textContent = ''; });
  }
  const redLast = S.red_last !== false && lines.length > 2;
  return t => {
    stageFrame(t);
    band.style.top = ((t * 22) % 140 - 30) + '%';
    rec.firstChild.style.opacity = Math.floor(t * 2) % 2 ? .25 : 1;
    lineEls.forEach((le, i) => {
      const t0 = beat(i, 0.45 + i * 1.35), t1 = beat(i + 1, 99);
      const L = lines[i], cps = Math.max(14, L.length / 1.1);
      le.textContent = L.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
      const last = i === lines.length - 1;
      const col = redLast && last ? SIDE.enemy : SIDE.ally;
      const dimmed = t > t1 && !last;
      le.style.color = dimmed ? SIDE.ally.dim : col.txt; le.style.textShadow = dimmed ? 'none' : `0 0 10px ${col.c}`;
    });
  };
};

// ── TERMINAL — a keyline window, a big pixel headline that decodes, `> ` lines typed with a block cursor ────────────
HK.terminal = function (S, root) {
  const side = sideOf(S.side || 'ally'), P = SIDE[side];
  // tall: a window the frame's width (y 430-1050), the headline fitted, long commands wrapping
  const st = stage({ glows: [TALL ? { side, x: 50, y: 39, rx: 58, ry: 28 } : { side, x: 50, y: 50, rx: 40, ry: 45 }], rate: 0.0165, focus: TALL ? [CX, 750] : null });
  const w = el('div', `position:absolute;left:${TALL ? 50 : 250}px;top:${TALL ? 430 : 230}px;width:${TALL ? W - 100 : 1420}px;height:${TALL ? 620 : 620}px;border:3px solid ${P.c};border-radius:8px;background:rgba(0,8,2,.6);box-shadow:0 0 16px ${P.c}77, inset 0 0 24px ${P.c}1f;padding:${TALL ? '26px 36px 34px' : '26px 46px 34px'};opacity:0;overflow:hidden`, st.cam);
  termChrome(w, P, termLabel(S), TALL ? 26 : 24);
  const head = S.head ? el('div', `position:relative;z-index:1;font:78px/1.1 ${PIX};color:${P.txt};text-shadow:0 0 14px ${P.c};margin-bottom:26px;white-space:pre`, w, '') : null;
  const lines = (S.lines || []).map(String);
  const le = lines.map(() => el('div', `position:relative;z-index:1;font:${TALL ? 62 : 46}px/1.3 ${TERM};color:${P.txt};text-shadow:0 0 8px ${P.c};white-space:${TALL ? 'pre-wrap' : 'pre'}`, w, ''));
  if (TALL && head) { head.style.display = 'inline-block'; head.textContent = String(S.head); fit(head, W - 100 - 72 - 10, 96, 40); head.style.display = 'block'; head.style.whiteSpace = 'pre'; head.textContent = ''; }
  return t => {
    stageFrame(t);
    w.style.opacity = SM(seg(t, 0.1, 0.3));
    let t0 = 0.35;
    if (head) { const h = String(S.head); const n = frameN(t); const k = Math.max(0, Math.min(h.length, Math.floor((t - 0.35) * 22)));
      head.textContent = h.slice(0, k) + (k < h.length ? GLY[Math.floor(hrand(n) * GLY.length)] : ''); t0 = 0.35 + h.length / 22 + 0.15; }
    lines.forEach((L, i) => { const s = beat(i, t0); le[i].innerHTML = typed(L, (t - s) * 24, '█'); t0 = s + L.length / 24 + 0.2; });
  };
};

// ── NOTE — a taped paper drops in: typewriter or clipping, a stamp slams or a highlighter wipes, redaction bars ──────
HK.note = function (S, root) {
  const st = stage({ rate: 0.0129, enter: 'fade', focus: TALL ? [CX, 700] : null });
  const clip = S.kind === 'clipping';
  // tall: the paper the frame's width, bigger type, centred on y 700 once its height is known
  const w = el('div', `position:absolute;left:${TALL ? 60 : clip ? 360 : 330}px;top:${clip ? 170 : 150}px;width:${TALL ? W - 120 : clip ? 1200 : 1260}px;min-height:${TALL ? 640 : clip ? 520 : 560}px;padding:${clip ? (TALL ? '58px 56px' : '54px 70px') : (TALL ? '64px 60px' : '64px 78px')};background:#ECE7DA;color:#1A1A1A;box-shadow:0 30px 80px rgba(0,0,0,.85);transform-origin:50% 0`, st.cam);
  el('div', `position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.35), rgba(0,0,0,0) 60%), radial-gradient(ellipse at 80% 90%, rgba(120,100,70,.18), rgba(0,0,0,0) 55%)`, w);
  ['left:60px', 'right:60px'].forEach((pos, i) => el('div', `position:absolute;top:-26px;${pos};width:170px;height:54px;background:rgba(215,215,205,.7);transform:rotate(${i ? 8 : -8}deg);box-shadow:0 2px 6px rgba(0,0,0,.2)`, w));
  const inner = el('div', 'position:relative', w);
  if (clip) {
    if (S.kicker) el('div', `font:700 ${TALL ? 24 : 20}px ${UI};letter-spacing:.12em;color:#B3122B;margin-bottom:10px;text-transform:uppercase`, inner, esc(S.kicker));
    el('div', `border-top:2px solid #1A1A1A;margin-bottom:18px`, inner);
    el('div', `font:700 ${TALL ? 74 : 64}px/1.12 ${SERIF};margin-bottom:26px`, inner, esc(S.head || ''));
  } else el('div', `font:${TALL ? 54 : 48}px/1.2 ${TYPE};margin-bottom:24px;border-bottom:3px solid #1A1A1A;padding-bottom:16px`, inner, esc(String(S.head || '').toUpperCase()));
  const bodyEl = el('div', `font:${clip ? (TALL ? 42 : 32) + 'px/1.45 ' + SERIF : (TALL ? 44 : 36) + 'px/1.5 ' + TYPE}`, inner, '');
  let html = esc(S.text || '');
  (S.marks || []).forEach((m, i) => { html = html.replace(esc(m), `<span class="hkm" style="background:linear-gradient(#F4E23A,#F4E23A) no-repeat 0 60%/0% 70%">${esc(m)}</span>`); });
  bodyEl.innerHTML = html;
  const marks = [...bodyEl.querySelectorAll('.hkm')];
  const bars = [];
  for (let i = 0; i < num(S.redact, 0); i++) bars.push(el('div', `height:30px;margin-top:18px;background:#111;width:0%`, inner));
  let stamp = null;
  if (S.stamp) { const sc = S.stamp_side ? SIDE[sideOf(S.stamp_side)].c : '#D0142C';
    stamp = el('div', `position:absolute;right:70px;bottom:44px;padding:8px 22px;border:6px solid ${sc};border-radius:6px;font:700 50px/1 ${TYPE};letter-spacing:.08em;color:${sc};transform:rotate(-8deg);opacity:0;white-space:nowrap`, w, esc(String(S.stamp).toUpperCase())); }
  if (TALL) w.style.top = Math.max(200, 700 - w.offsetHeight / 2) + 'px';
  const rot = num(S.rot, -1.6);
  return t => {
    stageFrame(t);
    const p = seg(t, 0.08, 0.33), e = eo3(p);
    w.style.transform = `translateY(${lerp(TALL ? -1700 : -1100, 0, e)}px) rotate(${lerp(rot - 5, rot, e)}deg)`;
    marks.forEach((m, i) => { const t0 = beat(i, num(S.mark_at, 1.2) + i * 0.5); m.style.backgroundSize = `${(100 * EO2(seg(t, t0, t0 + 0.4))).toFixed(1)}% 70%`; });
    bars.forEach((b, i) => b.style.width = `${(lerp(0, 60 + hrand(i * 5) * 38, EO2(seg(t, 0.8 + i * 0.25, 1.1 + i * 0.25)))).toFixed(1)}%`);
    if (stamp) { const t0 = num(S.stamp_at, Math.min(D - 1, 1.5)); const q = seg(t, t0, t0 + 0.12); stamp.style.opacity = q > 0 ? 1 : 0; stamp.style.transform = `rotate(-8deg) scale(${lerp(1.8, 1, EO2(q)).toFixed(3)})`; }
  };
};

// ── WORDS — one word per spoken word: the newest bright green with a glow, the older ones grey ──────────────────────
HK.words = function (S, root) {
  const side = sideOf(S.side || 'ally'), P = SIDE[side];
  const st = stage({ glows: [{ side, x: 50, y: 50, rx: 36, ry: 40 }], rate: 0.012, enter: 'fade' });
  const words = (S.items || []).map(w => String(w).toUpperCase()).slice(0, 12);
  let lay = S.layout || (words.length > 6 ? 'grid' : words.length > 4 ? 'scatter' : 'list');
  if (TALL && lay === 'row') lay = 'list';                    // tall: a row turns into a column
  const nw = words.length, rows = Math.ceil(nw / 2);
  const step = TALL ? Math.min(170, 860 / Math.max(1, nw - 1)) : 0;
  const pos = words.map((w, i) => {
    // tall: everything centred on y 700 — a column, two columns, or a staggered column for a scatter
    if (TALL && lay === 'grid') return [i % 2 ? 790 : 290, 700 - (rows - 1) * 75 + Math.floor(i / 2) * 150, 0];
    if (TALL && lay === 'scatter') return [[600, 300, -3], [470, 440, -3], [620, 580, 2], [440, 720, 3], [640, 860, 3], [500, 1000, 3], [580, 1130, -2], [420, 200, -2]][i % 8];
    if (TALL) return [CX, 700 - (nw - 1) * step / 2 + i * step, 0];
    if (lay === 'row') return [260 + i * (1400 / Math.max(1, words.length - 1)), 540, 0];
    if (lay === 'grid') return [i % 2 ? 1290 : 630, 300 + Math.floor(i / 2) * 150, 0];
    if (lay === 'scatter') return [[1180, 250, -3], [1250, 360, -3], [700, 470, 2], [1370, 600, 3], [1250, 700, 3], [1260, 800, 3], [1060, 900, -2], [600, 300, -2]][i % 8];
    return [960, 300 + i * 140, 0];
  });
  const els = words.map((w, i) => el('div', `position:absolute;left:${pos[i][0]}px;top:${pos[i][1]}px;transform:translate(-50%,-50%) rotate(${pos[i][2]}deg);font:${num(S.size, 84)}px/1 ${HEAVY};white-space:nowrap;opacity:0`, st.cam, esc(w)));
  if (TALL) els.forEach((e, i) => {                           // each word as big as its place allows
    const cx = pos[i][0], room = lay === 'grid' ? 480 : 2 * Math.min(cx, W - cx) - 80;
    fit(e, room, num(S.size, lay === 'grid' ? 72 : lay === 'scatter' ? 92 : Math.min(110, step * 0.72)), 30);
  });
  return t => {
    stageFrame(t);
    const T = words.map((w, i) => beat(i, 0.35 + i * 0.8));
    els.forEach((e, i) => {
      const p = seg(t, T[i], T[i] + 0.12); e.style.opacity = p;
      const newest = t >= T[i] && (i === els.length - 1 || t < T[i + 1]);
      e.style.color = newest ? P.txt : '#6E6E6E';
      e.style.textShadow = newest ? `0 0 14px ${P.c}, 0 0 34px ${P.c}` : 'none';
      e.style.transform = `translate(-50%,-50%) rotate(${pos[i][2]}deg) scale(${(1 + 0.18 * (1 - EO2(p))).toFixed(3)})`;
    });
  };
};

// ── TIMELINE — a red line drawing left to right, diamond nodes, pixel years above and below ─────────────────────────
HK.timeline = function (S, root) {
  const side = sideOf(S.side || 'enemy', 'enemy'), P = SIDE[side];
  // tall: the line runs down the middle (y 330-1180), the dates alternating left and right of it
  const st = stage({ glows: [TALL ? { side, x: 50, y: 38, rx: 50, ry: 30 } : { side, x: 50, y: 50, rx: 40, ry: 30 }], rate: 0.012, focus: TALL ? [CX, 700] : null });
  const pts = (S.points || ['2010', '2011']).slice(0, 6).map(String);
  const x0 = TALL ? 330 : 340, x1 = TALL ? 1260 : 1580, y = TALL ? CX : 540, n = pts.length;   // tall: x0/x1 run along y, y is the column's x
  const s = svg(st.cam);
  const L = (a, b, c, d, o) => sv('line', TALL ? { x1: c, y1: a, x2: d, y2: b, ...o } : { x1: a, y1: c, x2: b, y2: d, ...o }, s);
  const base = L(x0, TALL ? x1 - 80 : x1, y, y, { stroke: '#333', 'stroke-width': 3 });
  const line = L(x0, x0, y, y, { stroke: P.c, 'stroke-width': 5 }); line.style.filter = neon(P.c, 3, 10);
  const fsz = TALL ? Math.min(76, (CX - 110) / (Math.max(...pts.map(q => q.length)) * 1.04)) : 46;
  const nodes = pts.map((p, i) => { const x = n > 1 ? lerp(x0, x1 - 300, i / (n - 1)) : x0;
    const [px, py] = TALL ? [y, x] : [x, y];
    const d = sv('path', { d: `M${px} ${py - 13} L${px + 13} ${py} L${px} ${py + 13} L${px - 13} ${py} Z`, fill: P.c, opacity: 0 }, s); d.style.filter = neon(P.c, 3, 8);
    const where = TALL ? `left:${i % 2 ? px + 50 : px - 50}px;top:${py}px;transform:translate(${i % 2 ? 0 : -100}%,-50%)` : `left:${x}px;top:${i % 2 ? y + 70 : y - 70}px;transform:translate(-50%,-50%)`;
    const lab = pixelText(st.cam, p, `${where};font-size:${fsz}px;color:${i === n - 1 && S.hot_last !== false ? P.txt : '#9A9A9A'};text-shadow:0 0 10px ${P.c};opacity:0`); return { d, lab, x }; });
  return t => {
    stageFrame(t);
    const T = pts.map((p, i) => beat(i, 0.4 + i * 0.9));
    const last = T[T.length - 1] + 0.5;
    line.setAttribute(TALL ? 'y2' : 'x2', lerp(x0, x1 - 300, EO2(seg(t, 0.3, Math.max(0.9, last)))) );
    nodes.forEach((nd, i) => { const on = t >= T[i]; nd.d.setAttribute('opacity', on ? 1 : 0); nd.lab.style.opacity = on ? 1 : 0; });
  };
};

// ── TITLE — a line icon over a wordmark that decodes from random letters (pixel caps or a heavy grotesk) ─────────────
HK.title = function (S, root) {
  if (S.font === 'drip' || Array.isArray(S.lines)) return videoTitle(S);
  // colour is the side: a skull or a bomb marks the enemy's name (a hostile group, a malware) when no side is given
  const side = sideOf(S.side || (['skull', 'bomb'].includes(S.icon) ? 'enemy' : 'ally')), P = SIDE[side];
  // tall: kicker, a bigger icon, the wordmark under it — the block centred around y 650
  const st = stage({ glows: [TALL ? { side, x: 50, y: 36, rx: 52, ry: 28 } : { side, x: 50, y: 55, rx: 36, ry: 40 }], rate: 0.013, dust: 14, focus: TALL ? [CX, 680] : null });
  const txt = String(S.text || '').toUpperCase(), pixel = (S.font || 'pixel') === 'pixel';
  const ik = TALL ? 0.5 : 0.2, iy = TALL ? (S.kicker ? 470 : 430) : (S.kicker ? 380 : 330);
  const k = S.kicker ? pixelText(st.cam, String(S.kicker).toUpperCase(), `left:${CX}px;top:${TALL ? (S.icon ? 400 : 560) : S.icon ? 330 : 420}px;transform:translate(-50%,-50%);font-size:${TALL ? 36 : 30}px;color:#fff;letter-spacing:.1em`) : null;
  if (S.icon) icon(svg(st.cam), S.icon, side === 'white' ? 'white' : side, CX - 500 * ik, iy - 200 * ik, ik, 9);
  const dsz = TALL ? (pixel ? Math.min(150, (W - 100) / (Math.max(4, txt.length) * 1.04)) : Math.min(110, (W - 100) / (Math.max(4, txt.length) * 0.9))) : pixel ? Math.min(118, 1500 / Math.max(4, txt.length)) : 84;
  const d = decodeSlots(st.cam, txt, num(S.size, dsz), pixel ? P.txt : '#F4F4F4', CX, TALL ? (S.icon ? (S.kicker ? 960 : 920) : 700) : 640);
  if (!pixel) { d.box.style.fontFamily = HEAVY; d.box.style.textShadow = '0 0 16px rgba(255,255,255,.45)'; }
  return t => {
    stageFrame(t);
    const L = txt.length; const locks = [...txt].map((c, i) => 0.3 + 0.9 * ((i * 7) % L) / L);
    d.set(t, locks, frameN(t));
  };
};

// the VIDEO title that closes the hook (00:31.67-33.90): up to two lines of dripping caps — the hackers' line green,
// the other side's red — each popping in whole out of a blur (line 1 at 0.1 s, line 2 at 0.8 s, or on its beat),
// 160 px (measured: 4CHAN'S FIGHT 850 px, AGAINST TERRORISM 1200 px wide), centred on y 455 and 630 (one line:
// 540); a slow push, a quick fade out
function videoTitle(S) {
  const src = Array.isArray(S.lines) ? S.lines : String(S.text || '').split(/\s*[|\/]\s*/);
  const lines = src.map(x => String(x || '').toUpperCase().trim()).filter(Boolean).slice(0, 2);
  const sides = lines.map((_, i) => sideOf((S.sides || [])[i] || (i ? 'enemy' : 'ally')));
  const ys = TALL ? (lines.length === 2 ? [610, 800] : [700]) : lines.length === 2 ? [455, 630] : [540];
  const st = stage({ glows: lines.map((_, i) => ({ side: sides[i], x: 50, y: TALL ? ys[i] / H * 100 : ys[i] / 10.8, rx: TALL ? 56 : 34, ry: TALL ? 9 : 16 })), rate: 0.012, focus: TALL ? [CX, 700] : null,
                     enter: S.enter || 'cut', exit: S.exit || 'fade', glowIn: 0.3, dust: 16 });
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
  const els = lines.map((txt, i) => {
    const c = rgb(SIDE[sides[i]].c);
    const e = el('div', `position:absolute;left:${CX}px;top:${ys[i]}px;transform:translate(-50%,-50%);white-space:nowrap;font:${num(S.size, 160)}px/1 ${DRIP};color:${SIDE[sides[i]].txt};text-shadow:0 0 12px rgba(${c},.85),0 0 30px rgba(${c},.45);opacity:0`, st.cam, esc(txt));
    fit(e, TALL ? W - 80 : 1640, num(S.size, 160), 60);
    return e;
  });
  const t0s = lines.map((_, i) => beat(i, i ? 0.8 : 0.1));
  return t => {
    stageFrame(t);
    els.forEach((e, i) => {
      const p = seg(t, t0s[i], t0s[i] + 0.12);
      e.style.opacity = p.toFixed(3);
      e.style.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
    });
  };
}

let _hf = null;
function build() {
  const f = HK[S.type];
  if (!f) throw new Error('hacker: unknown scene ' + S.type);
  if (S.error) throw new Error(S.error);
  _hf = f(S, scene);
}
function frame(t) { if (_hf) _hf(t); }
