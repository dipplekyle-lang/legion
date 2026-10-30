// CREATIVE kit — DATA scenes (kitdata, autostyle v2 wave 3): number, counter, bar_chart, line_chart, compare_table,
// versus, timeline, split_flap_board, terminal_screen, social. Loaded by kits.build_html after lib/cr_*.js and before
// creative.js; every type registers its compositions with CR.scene. The composition a world takes = the `layout`
// tables below (= lookreg.creative.DATA_LAYOUT, asserted by `python3 creative_data.py layouts`): every world draws
// data in its own design system (void: outlined numerals and light; navy: the briefing room's axes and readouts;
// charcoal: the museum; glass: frosted glass cards; paper: typed sheets and red pencil; newsprint: the printed page;
// blueprint: linework; concrete: notices taped to the wall; light table: grease pencil on the light; footage: type over
// the title's own still). Fields arrive normalised by creative_data.py (S.fig, S.sep, S.bars, S.pts ...): figures are
// already written the way the film's language writes them; the page only counts.
// Rules (the founder): real numbers only; smoothstep / cruise for anything that moves; no bounce on type; sources on screen.
(function () {
  if (typeof CR === 'undefined') return;
  try {
  const pal = CR.pal, F = CR.F, M = 128, at = CR.at;
  let mc = null;
  const measure = (s, role, size, weight, ls) => { mc = mc || document.createElement('canvas').getContext('2d'); mc.font = `${weight || CR.FW[role]} ${size}px ${F[role]}`; return mc.measureText(String(s)).width + (ls || 0) * size * String(s).length; };
  const fitSize = (s, role, maxW, big, small, ls, weight) => { let z = big; while (z > small && measure(s, role, z, weight, ls) > maxW) z -= 2; return z; };
  const NUMCSS = 'font-variant-numeric:lining-nums tabular-nums;';
  const NOC = 'rgba(0,0,0,0)';                                // secondary typed lines: no caret (one caret on screen)
  const L0 = () => CR.light;                                    // the ground itself is light (dark ink on it)
  const inkOn = paper => paper ? pal.sink : pal.ink;
  const dimOn = paper => paper ? CR.mix(pal.sink, CR.light ? pal.ground : pal.paper, .42) : pal.dim;
  const lineOn = (paper, a) => CR.rgba(paper ? pal.sink : pal.ink, a);
  // beats compress when the scene is cut short (CR.at) AND never land after `share` of the scene: at min_s every
  // figure is on screen and still for the last third
  const tb = (x, share = .62) => Math.min(at(x), D * share);
  const WORDS = {
    source: { en: 'Source', cs: 'Zdroj', pl: 'Źródło', de: 'Quelle' },
    of: { en: 'of', cs: 'z', pl: 'z', de: 'von' },
    before: { en: 'Before', cs: 'Předtím', pl: 'Przedtem', de: 'Vorher' },
    after: { en: 'After', cs: 'Potom', pl: 'Potem', de: 'Nachher' },
    vs: { en: 'vs.', cs: 'vs.', pl: 'vs.', de: 'vs.' },
    event: { en: 'Event', cs: 'Událost', pl: 'Wydarzenie', de: 'Ereignis' },
    no: { en: 'No.', cs: 'Č.', pl: 'Nr', de: 'Nr.' },
    unit: { en: 'Unit', cs: 'Jednotka', pl: 'Jednostka', de: 'Einheit' },
  };
  const tw = k => ((WORDS[k] || {})[CR.lang]) || ((WORDS[k] || {}).en) || k;
  const hero = (o) => Object.assign({ anim: CR.anim.hero }, o);
  // social pages: the platforms' UI sans arrives in the scene (creative_data.py embeds it only there) and joins the
  // page's fonts BEFORE the page awaits them, so build() measures in it
  if (S.type === 'social' && typeof S.ui_font === 'string' && S.ui_font.startsWith('data:')) {
    try { document.fonts.add(new FontFace('Cr UI', `url(${S.ui_font})`, { weight: '100 900' })); } catch (e) { /* the body face draws it */ }
  }
  const SEP = Array.isArray(S.sep) && S.sep.length === 2 ? S.sep.map(String) : [',', '.'];
  // a figure in the film's language (Python wrote the final text; the count writes the in-between values the same way)
  const fmtN = (v, dec, group) => {
    const neg = v < 0; const s = Math.abs(v).toFixed(Math.max(0, dec | 0)); const [i, f] = s.split('.');
    const ii = group ? i.replace(/\B(?=(\d{3})+(?!\d))/g, SEP[0]) : i;
    return (neg ? '−' : '') + ii + (f ? SEP[1] + f : '');
  };
  const srcText = () => { const s = String(S.source || '').trim(); if (!s) return '';
    return /^(source|sources|zdroj|zdroje|źródło|źródła|quelle|quellen)\b/i.test(s) ? s : `${tw('source')}: ${s}`; };
  // the source line every data scene carries (bottom-left by default): small tracked caps, never bright
  const source = (parent, o = {}) => {
    const s = srcText(); if (!s) return null;
    const paper = o.paper != null ? o.paper : L0();
    return CR.text(parent, s, Object.assign({ font: o.font || 'cond', size: 22, ls: .14, upper: o.upper !== false, x: M, y: H - 92, width: W - 2 * M,
      align: 'left', color: o.color || dimOn(paper), onLight: paper, anim: 'mask_wipe', t0: tb(1.0, .7), glow: false, nowrap: true }, o));
  };
  const veil = (parent, kind) => {
    const g = { bl: 'linear-gradient(20deg, rgba(0,0,0,.8) 0%, rgba(0,0,0,.44) 40%, rgba(0,0,0,0) 68%)',
                b: 'linear-gradient(0deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.32) 44%, rgba(0,0,0,0) 72%)',
                l: 'linear-gradient(90deg, rgba(0,0,0,.84) 0%, rgba(0,0,0,.5) 42%, rgba(0,0,0,0) 72%)',
                all: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.42), rgba(0,0,0,.78))',
                r: 'linear-gradient(270deg, rgba(0,0,0,.84) 0%, rgba(0,0,0,.5) 40%, rgba(0,0,0,0) 70%)',
                t: 'linear-gradient(180deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.36) 40%, rgba(0,0,0,0) 66%)' }[kind || 'bl'];
    return CR.el('div', `position:absolute;inset:0;background:${g}`, parent);
  };
  // a type block placed by the title's placement token (the composition's default otherwise) — creative.js block()
  const PCLS = { lower_left: '', vertical_side: 'vs', letterbox_bar: 'll', dateline_credit: 'tl', hud_corners: 'tl', top_centre: 'tc', centre_small: 'c', full_bleed: 'c', right_panel: 'rp' };
  const hudCorners = () => {
    if (CR._hud) return; CR._hud = true;
    const s = CR.svg(CR.L.front), a = 64, x0 = 96, y0 = 84, x1 = W - 96, y1 = H - 84, col = CR.rgba(L0() ? pal.sink : pal.ink, .7);
    const cs = [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].map(([x, y, sx, sy]) =>
      CR.sv('path', { d: `M${x},${y + sy * a} L${x},${y} L${x + sx * a},${y}`, fill: 'none', stroke: col, 'stroke-width': 2.5, 'stroke-linecap': 'square' }, s));
    cs.forEach(p => { p.style.strokeDasharray = `${2 * a} ${2 * a}`; });
    CR.on(t => { const p = CR.sseg(t, at(.05), at(.05) + .8); cs.forEach(c => { c.style.strokeDashoffset = (2 * a * (1 - p)).toFixed(1); }); });
  };
  const block = (parent, def, w) => {
    const c = (PCLS[CR.placement] != null && CR.placement !== 'lower_left') ? PCLS[CR.placement] : def;
    const cc = c === 'vs' ? 'll' : c;                       // a data block is never turned on its side: it reads level
    const align = (cc === 'tc' || cc === 'c') ? 'center' : 'left';
    const bw = cc === 'rp' ? Math.min(w, 820) : w, x = cc === 'rp' ? W - M - bw : align === 'center' ? (W - bw) / 2 : M;
    const el = CR.el('div', `position:absolute;left:${x}px;top:0;width:${bw}px`, parent);
    const B = { el, cls: cc, align, w: bw, x };
    B.pin = (h, bottom = 880, top = 136) => {
      const k = B.cls, y = (k === 'll' || k === 'rp' || k === '') ? bottom - h : k === 'c' ? (H - h) / 2 : top;
      el.style.top = y.toFixed(1) + 'px';
      if (CR.placement === 'hud_corners') hudCorners();
      return y;
    };
    B.veil = () => ({ ll: 'bl', '': 'bl', rp: 'r', tl: 't', tc: 't', c: 'all' }[B.cls] || 'bl');
    return B;
  };
  const sheetOn = (parent, o) => {                          // a sheet: laid on the desk, taped to the concrete wall
    const sh = CR.sheet(parent, Object.assign({ pad: 0, seed: 31, age: .5 }, o));
    if (CR.W === 'concrete') { CR.enter(sh.el, { kind: 'land', t0: 0, rot: o.rot == null ? -.6 : o.rot, dur: .45, dy: -14 });
      CR.tape(sh.el, 40, 6, 120, -22); CR.tape(sh.el, o.w - 40, 6, 120, 20); }
    else CR.enter(sh.el, { kind: 'land', t0: 0, rot: o.rot == null ? -.8 : o.rot, dur: .55 });
    return sh;
  };
  // a hand-drawn pencil / grease line (accent): an SVG path drawn by its dash, slightly irregular, never perfect
  const pencil = (svg, d, o = {}) => {
    const p = CR.sv('path', { d, fill: 'none', stroke: o.color || pal.accent, 'stroke-width': o.w || 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: o.op == null ? .9 : o.op }, svg);
    if (o.grease) p.style.filter = 'url(#crdGrease)';
    const Ln = p.getTotalLength(); p.style.strokeDasharray = `${Ln} ${Ln}`; p.style.strokeDashoffset = Ln;
    const t0 = o.t0 || 0, du = o.dur || .5;
    CR.on(t => { p.style.strokeDashoffset = (Ln * (1 - CR.sseg(t, t0, t0 + du))).toFixed(2); });
    return { el: p, end: t0 + du };
  };
  // an ellipse ring drawn by hand around a box (it overshoots its start a little, like a real pencil ring)
  const ringPath = (cx, cy, rx, ry, seed) => {
    const pts = [], n = 44, a0 = -2.2 + CR.hash(seed, 1) * .5;
    for (let i = 0; i <= n + 5; i++) { const a = a0 + i / n * Math.PI * 2, wob = 1 + (CR.hash(seed + i, 3) - .5) * .035 + i / n * .045;
      pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]); }
    return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
  };
  const boxPath = (x, y, w, h, seed) => { const j = k => (CR.hash(seed + k, 9) - .5) * 5, r = 18;
    return `M${x + r + j(1)},${y + j(2)} L${x + w - r + j(3)},${y + j(4)} Q${x + w + j(5)},${y + j(6)} ${x + w + j(7)},${y + r} L${x + w + j(8)},${y + h - r} Q${x + w + j(9)},${y + h + j(10)} ${x + w - r},${y + h + j(11)} ` +
      `L${x + r + j(12)},${y + h + j(13)} Q${x + j(14)},${y + h} ${x + j(15)},${y + h - r} L${x + j(16)},${y + r} Q${x + j(17)},${y + j(18)} ${x + r + 14},${y - 3 + j(19)}`; };
  const wobLine = (x0, y0, x1, seed, amp = 2.4) => { const n = 12, pts = [];
    for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (CR.hash(seed + i, 5) - .5) * amp + (i / n - .5) * 1.5]);
    return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'); };
  const greaseDefs = (svg) => { if (svg.querySelector('#crdGrease')) return;
    const d = CR.sv('defs', {}, svg), f = CR.sv('filter', { id: 'crdGrease', x: '-5%', y: '-20%', width: '110%', height: '140%' }, d);
    CR.sv('feTurbulence', { type: 'fractalNoise', baseFrequency: '.9', numOctaves: '2', seed: '4', result: 'n' }, f);
    CR.sv('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '2.2' }, f); };

  // ── the museum (charcoal): data hung like the core kit's exhibits — a framed, matted print under a warm spot with
  //    its wall label beside it (small capitals, the name in the head face, a short accent rule, the italic line) ──
  const museumSpot = (cx, cy, w, h) => CR.el('div', `position:absolute;left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;` +
    `background:radial-gradient(ellipse at 50% 46%, ${CR.rgba('#FFE2B4', .17)} 0%, ${CR.rgba('#FFD49C', .06)} 42%, rgba(0,0,0,0) 68%);pointer-events:none`, CR.L.back);
  const museumFrame = (x, y, w, h, seed) => {
    // the gallery frame of CR.photo('museum') around a print of w x h: content goes into .print (ink on warm white)
    const pad = Math.round(Math.min(w, h) * .11), bd = Math.max(10, Math.round(Math.min(w, h) * .022));
    const el = CR.el('div', `position:absolute;left:${x}px;top:${y}px;width:${w + pad * 2}px;height:${h + pad * 2}px;box-sizing:content-box;` +
      `background:#EFEBE3 url(${CR.paperURL(w + pad * 2, h + pad * 2, '#EFEBE3', seed || 13, .08)}) center/100% 100%;border:${bd}px solid #141312;` +
      `box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), 0 34px 70px rgba(0,0,0,.62), 0 6px 14px rgba(0,0,0,.45);transform-origin:50% 50%`, CR.L.mid);
    const print = CR.el('div', `position:absolute;left:${pad}px;top:${pad}px;width:${w}px;height:${h}px;background:#F7F4EE;overflow:hidden;` +
      `box-shadow:0 0 0 1px rgba(0,0,0,.28), 0 0 0 5px rgba(0,0,0,.035)`, el);
    CR.enter(el, { kind: 'fade', t0: 0, dur: .8 });
    return { el, print, pad, bd, ow: w + 2 * pad + 2 * bd, oh: h + 2 * pad + 2 * bd };
  };
  const PINK = '#22201C';                                       // ink on the museum print
  const pAcc = () => CR.mix(pal.accent, PINK, .28);             // the accent dark enough to read on the warm white
  const wallLabel = (x, yMid, w, o) => {
    const host = CR.el('div', `position:absolute;left:${x}px;top:0;width:${w}px`, CR.L.front), up = CR.case === 'upper', t0 = o.t0 || .4;
    let y = 0;
    if (o.kick) { const k = CR.text(host, o.kick, { font: 'cond', size: 24, upper: true, ls: .3, x: 0, y, width: w, lh: 1.25, color: pal.dim, anim: 'mask_wipe', t0: at(t0) }); y += k.el.offsetHeight + 20; }
    if (o.name) { const nm0 = up ? String(o.name).toUpperCase() : String(o.name), sz = Math.min(o.max || 60, fitSize(nm0, 'head', w * 2.5, o.max || 60, 34));
      const nm = CR.text(host, o.name, hero({ font: 'head', size: sz, x: 0, y, width: w, upper: up, lh: 1.08, t0: at(t0 + .15) })); y += nm.el.offsetHeight + 24; }
    CR.rule(host, { x: 0, y, w: 64, h: 2, color: pal.accent, t0: at(t0 + .5), glow: false }); y += 26;
    if (o.sub) { const sb = CR.text(host, o.sub, { font: 'serif', italic: true, size: 30, x: 0, y, width: w, lh: 1.3, color: pal.dim, anim: 'mask_wipe', t0: at(t0 + .65) }); y += sb.el.offsetHeight + 16; }
    const s = srcText(); if (s) { const st = CR.text(host, s, { font: 'cond', size: 20, upper: true, ls: .16, x: 0, y, width: w, lh: 1.3, color: pal.dim, anim: 'mask_wipe', t0: tb(1.0, .7), glow: false }); y += st.el.offsetHeight; }
    host.style.top = (yMid - y / 2).toFixed(1) + 'px';
    return { el: host, h: y };
  };

  // ── the drawing office (blueprint): linework that draws itself, a title block, numbered balloons, hatching ───────
  const bpLine = (s, x1, y1, x2, y2, o = {}) => {             // a drafted line drawn from (x1,y1) to (x2,y2)
    const l = CR.sv('line', { x1, y1, x2: x1, y2: y1, stroke: o.color || CR.rgba(pal.ink, o.a == null ? .85 : o.a), 'stroke-width': o.w || 1.5, 'stroke-dasharray': o.dash || 'none' }, s);
    const t0 = o.t0 || 0, du = o.dur || .5;
    CR.on(t => { const p = CR.sseg(t, t0, t0 + du); l.setAttribute('x2', lerp(x1, x2, p).toFixed(1)); l.setAttribute('y2', lerp(y1, y2, p).toFixed(1)); });
    return l;
  };
  const bpHatch = (s, id, col, gap = 10, w = 2) => { let d = s.querySelector('defs'); if (!d) d = CR.sv('defs', {}, s);
    if (!s.querySelector('#' + id)) { const p = CR.sv('pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
      CR.sv('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: col, 'stroke-width': w }, p); }
    return `url(#${id})`; };
  // the title block in the drawing's corner: ruled rows, a small label over each value (the kit's own words)
  const bpBlock = (rows, o = {}) => {
    rows = rows.filter(r => r && r[1]); if (!rows.length) return null;
    const ink = pal.ink, bw = o.w || 760, rh = o.rh || 76, bh = rows.length * rh, bx = o.x == null ? W - M - bw : o.x, by = o.y == null ? H - 70 - bh : o.y;
    const s = CR.svg(CR.L.mid), t0 = o.t0 == null ? at(.15) : o.t0;
    bpLine(s, bx, by, bx + bw, by, { w: 3, t0, a: .9 }); bpLine(s, bx, by + bh, bx + bw, by + bh, { w: 3, t0: t0 + .05, a: .9 });
    bpLine(s, bx, by, bx, by + bh, { w: 3, t0, a: .9 }); bpLine(s, bx + bw, by, bx + bw, by + bh, { w: 3, t0: t0 + .05, a: .9 });
    rows.forEach((r, i) => { const y = by + i * rh;
      if (i) bpLine(s, bx, y, bx + bw, y, { w: 1.5, t0: t0 + .15, a: .7 });
      CR.text(CR.L.front, String(r[0]), { font: 'mono', size: 16, ls: .14, upper: true, x: bx + 18, y: y + 10, width: bw - 36, nowrap: true, color: pal.dim, anim: 'none', t0: t0 + .3, glow: false });
      const v = String(r[1]), vs = fitSize(v, 'mono', bw - 36, r[2] || 26, 17);
      CR.text(CR.L.front, v, { font: 'mono', size: vs, x: bx + 18, y: y + 32 + (26 - vs) * .5, width: bw - 36, nowrap: true, color: ink, anim: 'typewriter', caret: NOC, t0: t0 + .4 + i * .15, cps: Math.max(44, v.length / .8) / CR.ts, glow: false }); });
    return { x: bx, y: by, w: bw, h: bh };
  };
  // a numbered balloon (the drawing's callout): a circle with its number, drawn round
  const bpBalloon = (s, L, x, y, r, n, o = {}) => {
    const c = CR.sv('circle', { cx: x, cy: y, r, fill: o.fill || pal.ground, stroke: o.color || pal.ink, 'stroke-width': o.w || 2 }, s);
    const C = 2 * Math.PI * r; c.style.strokeDasharray = `${C} ${C}`; c.style.strokeDashoffset = C;
    const t0 = o.t0 || 0; CR.on(t => { c.style.strokeDashoffset = (C * (1 - CR.sseg(t, t0, t0 + .35))).toFixed(1); });
    const tx = CR.el('div', `position:absolute;left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;line-height:${2 * r}px;text-align:center;font-family:${F.mono};font-weight:700;font-size:${Math.round(r * .95)}px;color:${o.color || pal.ink};${NUMCSS}opacity:0`, L, esc(String(n)));
    CR.on(t => { tx.style.opacity = CR.sseg(t, t0 + .2, t0 + .4).toFixed(3); });
    return { c, tx };
  };

  // ── the light table: 35 mm slide mounts (the core kit's slide), film strips with sprocket holes, acetate, grease
  //    pencil; everything lies on the light and is read through it ─────────────────────────────────────────────
  const MOUNT = '#ECE9E2';
  const ltMount = (parent, x, y, w, h, o = {}) => {          // a slide mount: printed card, rounded, its lit window
    const m = CR.el('div', `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${Math.round(Math.min(w, h) * .06)}px;` +
      `background:${MOUNT} url(${CR.paperURL(w, h, MOUNT, o.seed || 51, .12)}) center/100% 100%;box-shadow:0 2px 2px rgba(0,0,0,.18), 0 22px 44px rgba(0,0,0,.2)`, parent);
    const ww = w - 2 * (o.mx || Math.round(w * .1)), wh = h - (o.mt || Math.round(h * .2)) - (o.mb || Math.round(h * .12)), wx = (w - ww) / 2, wy = o.mt || Math.round(h * .2);
    const win = CR.el('div', `position:absolute;left:${wx}px;top:${wy}px;width:${ww}px;height:${wh}px;border-radius:6px;overflow:hidden;background:#FFFFFF;` +
      `box-shadow:inset 0 0 0 2px rgba(0,0,0,.14), inset 0 0 40px rgba(255,248,230,.6)`, m);
    return { el: m, win, wx, wy, ww, wh };
  };
  const ltRing = (svg, cx, cy, rx, ry, seed, t0, dur) => { greaseDefs(svg); return pencil(svg, ringPath(cx, cy, rx, ry, seed), { w: 8, grease: true, t0, dur: dur || .6, op: .88 }); };
  const ltSvg = () => { const s = CR.svg(CR.L.front); s.setAttribute('width', W); s.setAttribute('height', H); s.setAttribute('viewBox', `0 0 ${W} ${H}`); greaseDefs(s); return s; };

  // ── the concrete wall: figures and words sprayed through stencils in worn paint (the core kit's stencil), notes
  //    typed on paper taped to the wall ─────────────────────────────────────────────────────────────────────────
  const ccPaint = () => CR.mix(pal.ink, '#CFCAC0', .25), ccAcc = () => CR.mix(pal.accent, '#D8D2C6', .12);
  const ccSpray = el => { el.style.webkitMaskImage = `url(${CR.wear()})`; el.style.webkitMaskSize = '100% 100%'; el.style.mixBlendMode = 'screen'; el.style.opacity = .93; return el; };
  // stencilled text: the wear mask on a wrapper so the text's own reveal (mask_wipe) keeps working under it
  const ccText = (parent, str, o) => {
    const wr = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${o.width || 600}px`, parent);
    const tx = CR.text(wr, str, Object.assign({}, o, { x: 0, y: 0 }));
    wr.style.height = Math.ceil(tx.el.offsetHeight + 4) + 'px'; ccSpray(wr);
    return { el: wr, tx, h: tx.el.offsetHeight };
  };
  // a typed note taped to the wall: lines of mono text on a small sheet; returns the sheet
  const ccNote = (parent, x, y, lines, o = {}) => {
    const sz = o.size || 26, pad = o.pad || 34, w = o.w || Math.min(o.maxW || 1100, Math.max(...lines.map(l => measure(l.t, 'mono', l.size || sz, l.bold ? 700 : 400))) + 2 * pad + 10);
    const h = Math.round(2 * pad + lines.reduce((a, l) => a + (l.size || sz) * 1.32 * Math.max(1, Math.ceil(measure(l.t, 'mono', l.size || sz, l.bold ? 700 : 400) / (w - 2 * pad))), 0));
    const sh = CR.sheet(parent, { x, y, w, h, pad: 0, seed: o.seed || 29, age: .5 });
    CR.enter(sh.el, { kind: 'land', t0: o.t0 || 0, rot: o.rot == null ? -1 : o.rot, dur: .45, dy: -14 });
    CR.tape(sh.el, Math.min(60, w * .2), 6, Math.min(110, w * .4), -22); CR.tape(sh.el, w - Math.min(60, w * .2), 6, Math.min(110, w * .4), 20);
    let ty = pad;
    lines.forEach((l, i) => { const z = l.size || sz, tx = CR.text(sh.el, l.t, { font: 'mono', size: z, weight: l.bold ? 700 : 400, x: pad, y: ty, width: w - 2 * pad, lh: 1.3, color: l.color || pal.sink, onLight: true,
      anim: o.typed === false ? 'none' : 'typewriter', caret: i || o.caret === false ? NOC : undefined, t0: (o.t1 == null ? (o.t0 || 0) + .3 : o.t1) + i * .3, cps: 44 / CR.ts });
      ty += tx.el.offsetHeight || z * 1.32; });
    return { el: sh.el, w, h };
  };

  // ── the figure: prefix and suffix set smaller beside lining, tabular digits; counted with smoothstep when o.count,
  //    else revealed by the title's hero animation (mask / focus / rise / slam / type; outline on the void) ─────────
  const FIGANIM = { mask_wipe: 'mask', typewriter: 'type', slam: 'slam', letter_rise: 'rise', tracking_open: 'focus', focus_pull: 'focus',
                    split_flap: 'focus', highlighter: 'mask', stamp: 'mask', redaction: 'mask', none: 'none' };
  const figParts = (f) => {
    f = f || {};
    if (typeof f.value === 'number' && !f.text) return { pre: String(f.prefix || ''), main: fmtN(f.value, f.dec, f.group), suf: String(f.suffix || ''), num: true };
    return { pre: '', main: String(f.text || ''), suf: '', num: false };
  };
  const preK = s => /^\s*[$€£¥₽₹#№]\s*$/.test(s) ? .56 : .42;
  const sufK = s => /^\s*(%|‰|×|x|°[CF]?|\+)\s*$/.test(s) ? .58 : .34;
  const figWidth = (f, role, size, weight) => { const p = figParts(f);
    return measure(p.pre, role, size * preK(p.pre), weight) + measure(p.main, role, size, weight) + measure(p.suf, role, size * sufK(p.suf), weight) + (p.suf && sufK(p.suf) < .4 ? size * .12 : 0); };
  const fitFig = (f, role, maxW, big, small, weight) => { let z = big; while (z > small && figWidth(f, role, z, weight) > maxW) z -= 4; return z; };
  const figure = (parent, o) => {
    const f = o.fig || S.fig || {}, p = figParts(f), role = o.font || 'head', size = o.size || 200;
    const weight = o.weight || CR.FW[role], paper = o.paper != null ? o.paper : L0();
    const base = o.color || inkOn(paper);
    const box = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;white-space:nowrap;line-height:1;font-family:${F[role]};font-weight:${weight};` +
      `${NUMCSS}font-size:${size}px;letter-spacing:${o.ls || 0}em;display:flex;align-items:baseline;${o.gradient ? '' : `color:${o.glow === false ? base : CR.glowFill(base, size)};`}`, parent);
    if (!o.gradient && o.glow !== false) box.style.textShadow = CR.glowText(size, o.glowColor, paper);
    const pre = p.pre ? CR.el('span', `font-size:${(preK(p.pre) * 100).toFixed(0)}%;${preK(p.pre) > .5 ? 'align-self:flex-start;margin-top:.12em;' : ''}margin-right:.04em`, box, esc(p.pre)) : null;
    const mainEl = CR.el('span', 'display:inline-block', box, esc(p.main));
    const suf = p.suf ? CR.el('span', `font-size:${(sufK(p.suf) * 100).toFixed(0)}%;margin-left:${sufK(p.suf) < .4 ? '.3em' : '.03em'};${o.sufColor ? `color:${o.sufColor};` : ''}`, box, esc(p.suf.trim())) : null;
    if (o.gradient) {                                          // keynote: the figure lit from above (glass)
      box.style.backgroundImage = `linear-gradient(180deg, ${CR.mix(pal.ink, '#FFFFFF', .2)} 0%, ${pal.ink} 46%, ${CR.mix(pal.ink, pal.glow, .55)} 100%)`;
      box.style.webkitBackgroundClip = 'text'; box.style.color = 'transparent';
      const gf = CR.glowFilter(pal.glow, size * .5); if (gf) box.style.filter = gf;
    }
    const wNow = box.offsetWidth, hNow = box.offsetHeight;
    // count: the digits box keeps the FINAL width (right-aligned, like an odometer) so the figure never shifts
    const counting = o.count && p.num && typeof o.from === 'number' && isFinite(o.from) && o.from !== f.value;
    if (counting) { mainEl.style.width = mainEl.offsetWidth + 'px'; mainEl.style.textAlign = 'right'; }
    if (o.align === 'center') box.style.left = ((o.x || 0) - wNow / 2).toFixed(1) + 'px';
    else if (o.align === 'right') box.style.left = ((o.x || 0) - wNow).toFixed(1) + 'px';
    const t0 = o.t0 || 0, kk = CR.ts;                         // a scene cut short draws its figure faster
    const anim = o.mode === 'outline' ? 'outline' : (FIGANIM[o.anim || CR.anim.hero] || 'focus');
    if (CR.glow.family === 'halo' && !paper && o.glow !== false) { const hEl = CR.halo(parent, box.offsetLeft + wNow / 2, box.offsetTop + hNow / 2, wNow * .9, hNow * 1.1);
      if (hEl) { parent.insertBefore(hEl, box); CR.on(t => { hEl.style.opacity = CR.sseg(t, t0, t0 + 1.2).toFixed(3); }); } }
    const res = { el: box, w: wNow, h: hNow, x: box.offsetLeft, y: box.offsetTop, end: t0 + .8, land: t0 + .6, main: mainEl };
    let fill = null;
    if (anim === 'outline') {                                  // void: the figure drawn as an outline, then filled with light
      box.style.color = 'transparent'; box.style.textShadow = 'none'; box.style.webkitTextStroke = `${Math.max(1.5, size * .009).toFixed(2)}px ${CR.rgba(base, .85)}`;
      fill = CR.el('div', box.style.cssText, parent); fill.style.webkitTextStroke = '0'; fill.style.color = CR.glowFill(base, size); fill.style.textShadow = CR.glowText(size, o.glowColor, paper);
      fill.style.left = box.style.left; fill.innerHTML = box.innerHTML; fill.style.clipPath = 'inset(100% 0 0 0)';
      res.fillEl = fill;
    }
    const cd = o.countDur || Math.min(D * .45, 1.9 * kk), dl = .35 * kk, cps = 14 / kk;
    if (counting) { res.end = t0 + dl + cd; res.land = res.end; }
    else if (anim === 'type') { res.end = t0 + p.main.length / cps + .1; res.land = res.end; }
    else if (anim === 'outline') { res.end = t0 + 1.25 * kk; res.land = res.end; }
    else { res.end = t0 + .8 * kk; res.land = t0 + .6 * kk; }
    const chars = [...p.main];
    const upd = (t) => {
      if (anim === 'none') box.style.opacity = t >= t0 ? 1 : 0;
      else if (anim === 'mask' || anim === 'outline') { const q = CR.sseg(t, t0, t0 + .8 * kk), a = lerp(-18, 100, q);
        box.style.opacity = q > 0 ? 1 : 0; box.style.webkitMaskImage = q >= 1 ? 'none' : `linear-gradient(90deg, #000 ${a.toFixed(2)}%, rgba(0,0,0,0) ${(a + 18).toFixed(2)}%)`; }
      else if (anim === 'focus' || anim === 'slam') { const d = (anim === 'slam' ? .2 : .7) * kk, q = CR.sseg(t, t0, t0 + d);
        box.style.opacity = (anim === 'slam' ? clamp(q * 2.2) : q).toFixed(3); box.style.transform = `scale(${((anim === 'slam' ? 1.14 : 1.03) - (anim === 'slam' ? .14 : .03) * q).toFixed(4)})`;
        box.style.filter = q < 1 ? `blur(${((anim === 'slam' ? 6 : 14) * (1 - q)).toFixed(2)}px)` : (o.gradient ? (CR.glowFilter(pal.glow, size * .5) || 'none') : 'none'); }
      else if (anim === 'rise') { const q = CR.sseg(t, t0, t0 + .6 * kk); box.style.opacity = q > 0 ? 1 : 0; box.style.clipPath = 'inset(-10% -5% -10% -5%)';
        box.style.transform = `translateY(${((1 - q) * 30).toFixed(2)}px)`; box.style.webkitMaskImage = q >= 1 ? 'none' : `linear-gradient(0deg, #000 ${(q * 120 - 20).toFixed(1)}%, rgba(0,0,0,0) ${(q * 120).toFixed(1)}%)`; }
      else if (anim === 'type') { const n = Math.floor(Math.max(0, t - t0) * cps + 1e-6); box.style.opacity = t >= t0 ? 1 : 0; if (!counting) mainEl.textContent = chars.slice(0, n).join(''); }
      if (fill) { const q = CR.sseg(t, t0 + .7 * kk, t0 + 1.25 * kk); fill.style.clipPath = `inset(${((1 - q) * 100).toFixed(2)}% 0 0 0)`; }
      if (counting) {
        const q = CR.sseg(t, t0 + dl, t0 + dl + cd), v = lerp(o.from, f.value, q);
        const s = q >= 1 ? fmtN(f.value, f.dec, f.group) : fmtN(f.dec ? v : Math.round(v), f.dec, f.group);
        if (mainEl.textContent !== s) { mainEl.textContent = s; if (fill) fill.children[pre ? 1 : 0].textContent = s; }
      }
    };
    CR.on(upd); upd(-1);
    if (counting) mainEl.textContent = fmtN(o.from, f.dec, f.group);
    void suf;
    return res;
  };
  const hasFig = () => !!(S.fig && (typeof S.fig.value === 'number' || S.fig.text));
  const countFrom = () => (typeof S.from === 'number' && isFinite(S.from)) ? S.from : 0;
  const unitLine = (parent, o) => S.unit ? CR.text(parent, S.unit, Object.assign({ font: 'cond', size: 40, ls: .14, upper: true, anim: 'mask_wipe', glow: false }, o)) : null;
  const ctxLine = (parent, o) => S.context ? CR.text(parent, S.context, Object.assign({ font: 'serif', italic: true, size: 34, anim: 'mask_wipe', glow: false }, o)) : null;

  // ══ NUMBER — one figure, big ══════════════════════════════════════════════════════════════════════════════════
  const numberComps = (count) => ({
    outline: { build() {
      // void / charcoal: the figure alone in the dark, centred like a credit — on the void drawn as an outline that
      // fills with light; the unit in tracked capitals under it, the context in a quiet serif line
      if (CR.foot) { CR.footLook(4, .36, .8); veil(CR.L.back, 'all'); }
      const B = block(CR.L.front, 'c', W - 2 * M - 80), host = B.el, cen = B.align === 'center';
      let y = 0;
      if (S.kicker) { CR.label(host, S.kicker, { x: 0, y: 0, width: B.w, align: B.align, size: 26, ls: .3, t0: at(.1), color: pal.accent }); y = 72; }
      const role = 'head', size = fitFig(S.fig, role, B.w, cen ? 300 : 250, 110);
      const fg = figure(host, { x: cen ? B.w / 2 : 0, y, align: B.align, size, font: role, t0: at(.25), count, from: countFrom(), mode: CR.W === 'void_black' && !count ? 'outline' : null });
      y += fg.h + 22;
      const u = unitLine(host, { x: 0, y, width: B.w, align: B.align, color: pal.ink, t0: Math.min(fg.land, tb(1.2)) - .3 }); if (u) y += 60;
      if (count && (S.from_label || S.to_label)) {             // the span the count covers: 1970 ——— 2020
        const lw = 420, lx = cen ? (B.w - lw) / 2 : 0, ly = y + 20;
        CR.text(host, S.from_label || '', { font: 'mono', size: 24, x: lx - 230, y: ly - 14, width: 210, align: 'right', color: pal.dim, anim: 'none', t0: at(.3), glow: false });
        CR.text(host, S.to_label || '', { font: 'mono', size: 24, x: lx + lw + 20, y: ly - 14, width: 210, color: pal.ink, anim: 'none', t0: fg.land - .2, glow: false });
        CR.el('div', `position:absolute;left:${lx}px;top:${ly}px;width:${lw}px;height:1px;background:${CR.rgba(pal.ink, .25)}`, host);
        const r = CR.el('div', `position:absolute;left:${lx}px;top:${ly - 1}px;width:${lw}px;height:3px;background:${pal.accent};transform-origin:0 50%;transform:scaleX(0)`, host);
        r.style.filter = CR.glowFilter(pal.accent, 24) || 'none';
        const a0 = at(.25) + .35, a1 = fg.land;
        CR.on(t => { r.style.transform = `scaleX(${CR.sseg(t, a0, a1).toFixed(4)})`; });
        y += 56;
      }
      const c = ctxLine(host, { x: 0, y: y + 4, width: B.w, align: B.align, color: pal.dim, t0: Math.min(fg.land + .1, tb(1.4)) }); if (c) y += c.el.offsetHeight + 8;
      const top = B.pin(y, 900, 150);
      source(CR.L.front, { align: cen ? 'center' : 'left', x: cen ? M : B.x, width: cen ? W - 2 * M : B.w });
      CR.beat = fg.land; CR.focus = [B.x + B.w / 2, top + fg.h / 2 + 40];
    } },
    band: { build() {
      // footage: the figure low over the title's own still, a long feathered shade under it, unit and context beside it
      if (CR.foot) CR.footLook(0, .64, .92);
      const B = block(CR.L.front, 'll', W - 2 * M), host = B.el, cen = B.align === 'center';
      if (CR.foot) veil(CR.L.back, B.veil());
      const role = 'display', size = fitFig(S.fig, role, B.w * (cen ? 1 : .62), 230, 110);
      let y = 0;
      if (S.kicker) { CR.label(host, S.kicker, { x: 0, y: 0, width: B.w, align: B.align, size: 26, ls: .28, t0: at(.1), color: pal.accent }); y = 62; }
      const fg = figure(host, { x: cen ? B.w / 2 : 0, y, align: B.align, size, font: role, t0: at(.2), count, from: countFrom() });
      const side = !cen && B.cls !== 'rp' && fg.w < B.w * .66; // unit + context to the right of the figure when there is room
      const sx = side ? fg.w + 56 : 0, sw = side ? B.w - sx : B.w;
      let sy = side ? y + fg.h * .18 : y + fg.h + 18;
      if (side) CR.rule(host, { x: fg.w + 28, y: y + fg.h * .16, w: 3, h: fg.h * .72, color: pal.accent, t0: at(.4), dur: .6 }).el.style.transformOrigin = '50% 0%';
      const u = unitLine(host, { x: sx, y: sy, width: sw, align: B.align, color: pal.ink, size: side ? 44 : 40, t0: Math.min(fg.land, tb(1.1)) - .25 }); if (u) sy += u.el.offsetHeight + 10;
      const cwid = Math.min(sw, 700), c = ctxLine(host, { x: cen ? (B.w - cwid) / 2 : sx, y: sy, width: cwid, align: B.align, color: CR.mix(pal.ink, pal.dim, .4), size: 32, t0: Math.min(fg.land, tb(1.3)) }); if (c) sy += c.el.offsetHeight;
      const h = side ? Math.max(y + fg.h, sy) : sy;
      const top = B.pin(h, 900, 150);
      source(CR.L.front, B.cls === 'rp' ? { x: B.x, width: B.w } : { align: 'right', x: M, width: W - 2 * M });
      CR.beat = fg.land; CR.focus = [B.x + fg.w / 2, top + fg.h / 2];
    } },
    magnitude: { build() {
      // navy / blueprint: the briefing readout — the figure top-left, and under it a scale of powers of ten where a
      // marker rises at the figure's order of magnitude (a plain readout with corner brackets when it is a range)
      const L = CR.L.front, line = CR.W === 'blueprint', ink = pal.ink, f = S.fig || {};
      const x0 = M, ay = 790;
      let y = 214;
      if (S.kicker) { CR.label(L, S.kicker, { x: x0, y, size: 26, ls: .3, t0: at(.1), color: pal.accent }); y += 58; }
      const role = line ? 'cond' : 'head', size = fitFig(f, role, W - 2 * M, 230, 110, line ? 600 : null);
      const fg = figure(L, { x: x0 - 6, y, size, font: role, weight: line ? 600 : null, t0: at(.25), count, from: countFrom() });
      y += fg.h + 14;
      const u = unitLine(L, { x: x0, y, width: 1100, color: ink, t0: Math.min(fg.land, tb(1.1)) - .3 }); if (u) y += 58;
      ctxLine(L, { x: x0, y: y + 2, width: 1100, color: pal.dim, size: 32, t0: Math.min(fg.land, tb(1.3)) });
      const s = CR.svg(CR.L.mid), v = typeof f.value === 'number' ? Math.abs(f.value) : NaN;
      if (isFinite(v) && v >= 1 && !f.text) {
        const e = Math.floor(Math.log10(v) + 1e-9), lo = Math.max(0, Math.min(e - 3, 99)), hi = lo + 7, aw = W - 2 * M;
        const X = lg => x0 + (lg - lo) / (hi - lo) * aw;
        const axis = CR.sv('line', { x1: x0, y1: ay, x2: x0, y2: ay, stroke: CR.rgba(ink, .55), 'stroke-width': 1.5 }, s);
        const ticks = [];
        for (let d = lo; d <= hi; d++) {
          ticks.push([X(d), CR.sv('line', { x1: X(d), y1: ay, x2: X(d), y2: ay + 22, stroke: CR.rgba(ink, .6), 'stroke-width': 1.5, opacity: 0 }, s), d]);
          if (d < hi) for (let m = 2; m <= 9; m++) { const xx = X(d + Math.log10(m)); ticks.push([xx, CR.sv('line', { x1: xx, y1: ay, x2: xx, y2: ay + 9, stroke: CR.rgba(ink, .28), 'stroke-width': 1, opacity: 0 }, s), null]); }
        }
        const labs = [];
        for (let d = lo; d <= hi; d++) { const tx = CR.sv('text', { x: X(d), y: ay + 58, 'text-anchor': 'middle', fill: d === e ? pal.accent : CR.rgba(ink, .5), 'font-family': F.mono, 'font-size': 22, opacity: 0 }, s);
          CR.sv('tspan', {}, tx).textContent = '10'; const ex = CR.sv('tspan', { dy: -11, 'font-size': 15 }, tx); ex.textContent = String(d); labs.push([X(d), tx]); }
        const a0 = at(.15), a1 = a0 + 1.3;
        CR.on(t => { const p = CR.sseg(t, a0, a1), xe = lerp(x0, x0 + aw, p); axis.setAttribute('x2', xe.toFixed(1));
          ticks.forEach(([x, l]) => l.setAttribute('opacity', clamp((xe - x) / 60).toFixed(3))); labs.forEach(([x, l]) => l.setAttribute('opacity', clamp((xe - x) / 60).toFixed(3))); });
        const mx = X(Math.log10(v)), m0 = Math.max(a1 - .2, Math.min(fg.land, tb(1.3)) - .4);
        const mk = CR.sv('line', { x1: mx, y1: ay, x2: mx, y2: ay, stroke: pal.accent, 'stroke-width': 3 }, s);
        mk.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
        const dot = CR.sv('circle', { cx: mx, cy: ay, r: 7, fill: pal.accent, opacity: 0 }, s);
        CR.on(t => { const p = CR.sseg(t, m0, m0 + .7); mk.setAttribute('y2', (ay - 120 * p).toFixed(1)); dot.setAttribute('opacity', CR.sseg(t, m0 - .1, m0 + .2).toFixed(3)); });
        CR.beat = m0;
      } else {                                                 // a range: corner brackets frame the readout
        const bx = x0 - 40, by = 170, bw2 = Math.min(W - 2 * M + 60, fg.w + 120), bh = y - 120, a = 40, col = CR.rgba(ink, .6);
        [[bx, by, 1, 1], [bx + bw2, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw2, by + bh, -1, -1]].forEach(([x, yy, sx, sy]) => {
          const p = CR.sv('path', { d: `M${x},${yy + sy * a} L${x},${yy} L${x + sx * a},${yy}`, fill: 'none', stroke: col, 'stroke-width': 2 }, s);
          p.style.strokeDasharray = `${2 * a} ${2 * a}`; CR.on(t => { p.style.strokeDashoffset = (2 * a * (1 - CR.sseg(t, at(.1), at(.1) + .7))).toFixed(1); }); });
        CR.beat = fg.land;
      }
      source(L, { y: H - 96 });
      CR.focus = [x0 + Math.min(fg.w, 900) / 2, 420];
    } },
    keynote: { build() {
      // glass: a frosted glass card, the figure set huge in the display face and lit from above, the unit under it
      const f = S.fig || {}, role = 'display', cw = 1240;
      const size = fitFig(f, role, cw - 200, 250, 110);
      const ch = 140 + (S.kicker ? 50 : 0) + size * 1.02 + (S.unit ? 66 : 0) + (S.context ? 58 : 0) + (srcText() ? 70 : 20);
      const cx = (W - cw) / 2, cy = (H - ch) / 2;
      const g = CR.glass(CR.L.mid, { x: cx, y: cy, w: cw, h: ch, r: 30 });
      CR.enter(g.el, { kind: 'rise', t0: 0, dur: .7 });
      const host = CR.el('div', `position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px`, CR.L.front);
      let y = 76;
      if (S.kicker) { CR.label(host, S.kicker, { x: 100, y, size: 24, ls: .26, t0: at(.2), color: pal.accent }); y += 50; }
      const fg = figure(host, { x: 94, y, size, font: role, t0: at(.3), count, from: countFrom(), gradient: true });
      y += fg.h + 8;
      const u = S.unit ? CR.text(host, S.unit, { font: 'body', size: 44, weight: 600, x: 100, y, width: cw - 200, color: pal.ink, anim: 'mask_wipe', t0: Math.min(fg.land, tb(1.1)) - .3 }) : null; if (u) y += 66;
      ctxLine(host, { font: 'body', italic: false, size: 30, x: 100, y, width: cw - 200, color: pal.dim, t0: Math.min(fg.land, tb(1.3)) });
      source(host, { x: 100, y: ch - 64, width: cw - 200, size: 20 });
      CR.beat = fg.land; CR.focus = [W / 2, cy + ch / 2];
    } },
    ledger: { build() {
      // paper / concrete: a typed card laid on the desk (taped to the wall): the figure typed large, then underlined
      // twice in red pencil the way a reader marks the number that matters
      const f = S.fig || {}, sw = 1220, role = 'mono';
      const size = fitFig(f, role, sw - 220, 190, 90, 700);
      const sh = 150 + (S.kicker || S.unit ? 70 : 0) + size * 1.05 + 80 + (S.context ? 90 : 0) + 90;
      const sx = (W - sw) / 2, sy = (H - sh) / 2 - 10;
      const card = sheetOn(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, seed: 33, age: .45, rot: -.7 });
      const host = card.el, ink = pal.sink, dk = CR.mix(ink, pal.paper, .4), X = 104;
      let y = 84;
      const head = S.kicker || S.unit;
      if (head) { CR.text(host, String(head).toUpperCase(), { font: 'mono', size: 28, weight: 700, ls: .06, x: X, y, width: sw - 2 * X, color: dk, onLight: true, anim: 'typewriter', t0: at(.4), cps: 32 }); y += 46;
        CR.el('div', `position:absolute;left:${X}px;top:${y}px;width:${sw - 2 * X}px;height:2px;background:${CR.rgba(ink, .55)}`, host); y += 34; }
      const fg = figure(host, { x: X - 4, y, size, font: role, weight: 700, color: ink, paper: true, t0: at(.6), count, from: countFrom(), anim: count ? 'none' : 'typewriter', glow: false });
      y += fg.h + 14;
      const svg = CR.svg(host); svg.setAttribute('width', sw); svg.setAttribute('height', sh); svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`);
      const ux0 = X - 10, ux1 = X + fg.w + 14, ue = fg.end + .15;
      pencil(svg, wobLine(ux0, y, ux1, 41), { w: 5, t0: ue, dur: .32 });
      pencil(svg, wobLine(ux0 + 8, y + 13, ux1 - 6, 57), { w: 4.2, t0: ue + .3, dur: .3 });
      y += 52;
      if (S.unit && S.kicker) { CR.text(host, S.unit, { font: 'mono', size: 34, x: X, y, width: sw - 2 * X, color: ink, onLight: true, anim: 'typewriter', caret: NOC, t0: tb(1.5, .7), cps: 34 }); y += 50; }
      if (S.context) CR.text(host, S.context, { font: 'mono', size: 30, x: X, y, width: sw - 2 * X, lh: 1.25, color: dk, onLight: true, anim: 'typewriter', caret: NOC, t0: tb(1.7, .72), cps: 40 });
      const s = srcText(); if (s) CR.text(host, s, { font: 'mono', size: 22, x: X, y: sh - 66, width: sw - 2 * X, align: 'right', color: dk, onLight: true, anim: 'none', t0: tb(1.2, .7) });
      CR.beat = fg.land; CR.focus = [W / 2, sy + sh * .45];
    } },
    banner: { build() {
      // newsprint: the figure IS the front-page banner — heavy rules, the kicker in capitals, the figure in the heavy
      // head face, the deck line in the serif, the credit line under the last rule
      const f = S.fig || {}, ink = pal.sink, rw = W - 2 * M, x0 = M;
      const box = CR.el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, CR.L.mid);
      const size = fitFig(f, 'head', rw, 330, 120, Math.max(CR.FW.head, 700));
      let y = 150;
      CR.rule(box, { x: x0, y, w: rw, h: 8, color: ink, t0: at(.1), dur: .7, from: 'center', glow: false });
      CR.rule(box, { x: x0, y: y + 16, w: rw, h: 2, color: ink, t0: at(.2), dur: .7, from: 'center', glow: false });
      y += 40;
      if (S.kicker) { CR.text(box, S.kicker, { font: 'cond', size: 30, ls: .3, upper: true, x: x0, y, width: rw, align: 'center', color: pal.accent, onLight: true, anim: 'mask_wipe', t0: at(.3) }); y += 58; }
      const fg = figure(box, { x: W / 2, y, align: 'center', size, font: 'head', weight: Math.max(CR.FW.head, 700), color: ink, paper: true, t0: at(.4), count, from: countFrom(), glow: false,
        anim: ['typewriter', 'stamp'].includes(CR.anim.hero) ? 'mask_wipe' : null });
      y += fg.h + 10;
      if (S.unit) { CR.text(box, S.unit, { font: 'head', size: 64, weight: Math.max(CR.FW.head, 600), x: x0, y, width: rw, align: 'center', lh: 1.04, color: ink, onLight: true, anim: 'mask_wipe', t0: Math.min(fg.land, tb(1.1)) - .3 }); y += 80; }
      CR.rule(box, { x: x0 + rw * .3, y: y + 10, w: rw * .4, h: 2, color: ink, t0: tb(1.1), dur: .5, from: 'center', glow: false });
      y += 34;
      if (S.context) { const c = CR.text(box, S.context, { font: 'serif', italic: true, size: 38, x: x0 + 160, y, width: rw - 320, align: 'center', lh: 1.2, color: CR.mix(ink, pal.ground, .2), onLight: true, anim: 'mask_wipe', t0: tb(1.25) }); y += c.el.offsetHeight + 8; }
      CR.rule(box, { x: x0, y: y + 22, w: rw, h: 2, color: ink, t0: tb(1.3), dur: .7, from: 'center', glow: false });
      source(box, { x: x0, y: y + 36, width: rw, align: 'right', paper: true, color: CR.mix(ink, pal.ground, .3) });
      box.style.top = Math.max(-60, (H - (y + 70) - 150) / 2 - 40).toFixed(0) + 'px';
      CR.beat = fg.land; CR.focus = [W / 2, 430];
    } },
    ringed: { build() {
      // light table: the figure set in ink on the white light, then ringed in red grease pencil; the unit typed below
      const f = S.fig || {}, ink = pal.sink, role = 'head';
      const size = fitFig(f, role, 1300, 260, 110);
      const host = CR.el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, CR.L.front);
      let y = 0;
      if (S.kicker) { CR.text(host, S.kicker, { font: 'mono', size: 26, upper: true, ls: .12, x: 0, y, width: W, align: 'center', color: CR.mix(ink, pal.ground, .4), onLight: true, anim: 'typewriter', t0: at(.15), cps: 30 }); y += 70 + Math.round(size * .18); }
      const fg = figure(host, { x: W / 2, y, align: 'center', size, font: role, color: ink, paper: true, t0: at(.3), count, from: countFrom(), glow: false });
      // the ring holds the whole figure, prefix and suffix included (a wide range or "$26.2 billion" crossed it at the
      // ends): an ellipse through points beyond the figure's corners; the unit sits below the ring
      const ry = y + fg.h * .5, rrx = fg.w / 2 * 1.12 + 56, rry = fg.h * .66; y += fg.h + Math.max(62, fg.h * .16 + 46);
      if (S.unit) { CR.text(host, S.unit, { font: 'mono', size: 36, weight: 700, x: 0, y, width: W, align: 'center', color: ink, onLight: true, anim: 'typewriter', t0: Math.min(fg.land, tb(1.2)) - .2, cps: 30 }); y += 56; }
      if (S.context) { const c = CR.text(host, S.context, { font: 'serif', italic: true, size: 34, x: 360, y, width: W - 720, align: 'center', color: CR.mix(ink, pal.ground, .35), onLight: true, anim: 'mask_wipe', t0: tb(1.4) }); y += c.el.offsetHeight; }
      const top = (H - y) / 2 - 20; host.style.top = top + 'px';
      const svg = CR.svg(host); greaseDefs(svg);
      pencil(svg, ringPath(W / 2, ry, rrx, rry, 71), { w: 7, grease: true, t0: fg.end + .1, dur: .6, op: .88 });
      source(CR.L.front, { align: 'center', paper: true, font: 'mono', upper: false, size: 22 });
      CR.beat = fg.land; CR.focus = [W / 2, top + ry];
    } },
    exhibit: { build() {
      // charcoal (the museum): the figure typeset on a framed print under a warm spot — the head face in ink on the
      // warm white, its unit in small capitals under it (a count runs on the print) — the wall label beside the frame
      const pw = 860, ph = 480, pad = Math.round(ph * .11), bd = Math.max(10, Math.round(ph * .022)), ow = pw + 2 * pad + 2 * bd, oh = ph + 2 * pad + 2 * bd;
      const label = !!(S.kicker || S.context || srcText()), fx = label ? 196 : (W - ow) / 2, fy = (H - oh) / 2 - 6;
      const fr = museumFrame(fx, fy, pw, ph, 66), PR = fr.print;
      museumSpot(fx + fr.ow / 2, fy + fr.oh / 2, fr.ow * 1.5, fr.oh * 2.0);
      CR.halo(CR.L.back, fx + fr.ow / 2, fy + fr.oh / 2, fr.ow, fr.oh * .7);
      const box = CR.el('div', `position:absolute;left:0;top:0;width:${pw}px`, PR);
      const size = fitFig(S.fig, 'head', pw - 150, 230, 90);
      const fg = figure(box, { x: pw / 2, y: 0, align: 'center', size, font: 'head', color: PINK, paper: true, glow: false, t0: at(.35), count, from: countFrom() });
      let y = fg.h + 26;
      if (S.unit) { const u = CR.text(box, S.unit, { font: 'cond', size: 30, upper: true, ls: .2, x: 40, y, width: pw - 80, align: 'center', nowrap: true, color: CR.rgba(PINK, .78), onLight: true, anim: 'mask_wipe', t0: Math.min(fg.land, tb(1.2)) - .3, glow: false }); y += u.el.offsetHeight + 6; }
      if (count && (S.from_label || S.to_label)) {             // the span the count covers, in the print's small type
        const sw2 = 300, sx = (pw - sw2) / 2, sy = y + 28;
        CR.text(box, S.from_label || '', { font: 'mono', size: 22, x: sx - 200, y: sy - 13, width: 184, align: 'right', color: CR.rgba(PINK, .55), onLight: true, anim: 'none', t0: at(.3), glow: false });
        CR.text(box, S.to_label || '', { font: 'mono', size: 22, x: sx + sw2 + 16, y: sy - 13, width: 184, color: PINK, onLight: true, anim: 'none', t0: fg.land - .2, glow: false });
        CR.el('div', `position:absolute;left:${sx}px;top:${sy}px;width:${sw2}px;height:1px;background:${CR.rgba(PINK, .25)}`, box);
        const r = CR.el('div', `position:absolute;left:${sx}px;top:${sy - 1}px;width:${sw2}px;height:3px;background:${pAcc()};transform-origin:0 50%;transform:scaleX(0)`, box);
        const a0 = at(.35) + .35, a1 = fg.land; CR.on(t => { r.style.transform = `scaleX(${CR.sseg(t, a0, a1).toFixed(4)})`; });
        y += 52;
      }
      box.style.top = ((ph - y) / 2 + 6).toFixed(1) + 'px';
      const lx = fx + fr.ow + 84;
      if (label) wallLabel(lx, fy + fr.oh / 2, W - M - lx, { kick: S.kicker, sub: S.context, t0: .5 });
      CR.beat = fg.land; CR.focus = [label ? fx + fr.ow * .62 : W / 2, fy + fr.oh / 2];
    } },
    stencil: { build() {
      // concrete: the figure sprayed through a stencil on the wall in worn off-white paint (a soft overspray), the
      // unit stencilled under it, the context typed on a notice taped below — the core kit's concrete stencil
      const L = CR.L.front, paint = CR.mix(pal.ink, '#CFCAC0', .25), wear = `url(${CR.wear()})`, bw = W - 2 * M;
      const spray = el => { el.style.webkitMaskImage = wear; el.style.webkitMaskSize = '100% 100%'; el.style.mixBlendMode = 'screen'; el.style.opacity = .93; };
      const host = CR.el('div', `position:absolute;left:${M}px;top:0;width:${bw}px`, L);
      let y = 0;
      if (S.kicker) { CR.text(host, S.kicker, { font: 'cond', size: 30, upper: true, ls: .3, x: 4, y: 0, width: bw, color: pal.dim, anim: 'mask_wipe', t0: at(.15) }); y = 66; }
      const size = fitFig(S.fig, 'stamp', bw - 40, 300, 120);
      const wrap = CR.el('div', `position:absolute;left:0;top:${y}px`, host);       // the wear mask on a wrapper: the figure's own reveal masks the figure
      const fg = figure(wrap, { x: 0, y: 0, size, font: 'stamp', color: paint, glow: false, paper: false, t0: at(.25), count, from: countFrom() });
      wrap.style.width = Math.ceil(fg.w + 8) + 'px'; wrap.style.height = Math.ceil(fg.h + 4) + 'px'; spray(wrap);
      fg.el.style.textShadow = `0 0 ${(size * .045).toFixed(1)}px ${CR.rgba(paint, .32)}`;
      y += fg.h + 14;
      if (S.unit) { const u = CR.text(host, String(S.unit).toUpperCase(), { font: 'stamp', size: Math.min(64, Math.max(40, Math.round(size * .24))), ls: .04, x: 4, y, width: bw, lh: 1.0, color: paint, anim: 'mask_wipe', t0: Math.min(fg.land, tb(1.1)) - .3, glow: false });
        spray(u.el); y += u.el.offsetHeight + 8; }
      let note = null, nh = 0;
      if (S.context) { const sz = 30, s0 = String(S.context), tw0 = measure(s0, 'mono', sz), nw = Math.min(1100, tw0 + 130), nl = Math.max(1, Math.ceil(tw0 / (nw - 110)));
        nh = Math.round(64 + nl * sz * 1.3);
        note = CR.sheet(CR.L.mid, { x: M, y: 0, w: nw, h: nh, pad: 0, seed: 29, age: .5 });
        CR.enter(note.el, { kind: 'land', t0: tb(.9, .4), rot: -1, dur: .45 }); CR.tape(note.el, 30, 8, 110, -24); CR.tape(note.el, nw - 30, 8, 110, 22);
        CR.text(note.el, s0, { font: 'mono', size: sz, x: 64, y: 32, width: nw - 100, lh: 1.3, color: pal.sink, onLight: true, anim: 'typewriter', caret: NOC, t0: tb(1.2, .5), cps: Math.max(40, s0.length / 1.3) / CR.ts }); }
      const total = y + (note ? 34 + nh : 0), top = Math.max(90, (H - total) / 2 - 12);
      host.style.top = top + 'px'; if (note) note.el.style.top = (top + y + 34) + 'px';
      source(CR.L.front, { align: 'right', x: M, width: bw, y: H - 92 });
      CR.beat = fg.land; CR.focus = [M + Math.min(bw, fg.w) / 2, top + (S.kicker ? 66 : 0) + fg.h / 2];
    } },
    dimension: { build() {
      // blueprint (the drawing office): the figure lettered large in the drawing's condensed hand — drawn as outline
      // linework, then inked — and dimensioned like a part: extension lines down from its two ends, a dimension line
      // with arrowheads between them, the unit lettered under it (a count: the dimension line runs out in step with
      // the count, the span's two dates at its ends); what it means and its source in the title block in the corner
      const L = CR.L.front, ink = pal.ink, f = S.fig || {}, s = CR.svg(CR.L.mid);
      if (S.kicker) CR.label(L, S.kicker, { x: M, y: 150, size: 26, ls: .3, t0: at(.1), color: pal.accent, width: W - 2 * M, nowrap: true });
      const y = 230, size = fitFig(f, 'cond', W - 2 * M - 200, 280, 120, 600);
      const fg = figure(L, { x: W / 2, y, align: 'center', size, font: 'cond', weight: 600, t0: at(.25), count, from: countFrom(), mode: count ? null : 'outline' });
      const xa = fg.x, xb = fg.x + fg.w, dy = y + fg.h + 74;
      bpLine(s, xa, y + fg.h + 12, xa, dy + 30, { t0: at(.2), dur: .4 }); bpLine(s, xb, y + fg.h + 12, xb, dy + 30, { t0: at(.25), dur: .4 });
      const dl = CR.sv('line', { x1: xa, y1: dy, x2: xa, y2: dy, stroke: ink, 'stroke-width': 2 }, s);
      const head = dir => CR.sv('path', { d: `M0,0 L${dir * 24},-8 L${dir * 24},8 Z`, fill: ink, opacity: 0 }, s);
      const h0 = head(1), h1 = head(-1); h0.setAttribute('transform', `translate(${xa} ${dy})`);
      const a0 = count ? at(.25) + .35 * CR.ts : at(.45), a1 = count ? fg.land : a0 + .7 * CR.ts;
      CR.on(t => { const p = CR.sseg(t, a0, a1), xe = lerp(xa, xb, p); dl.setAttribute('x2', xe.toFixed(1));
        h0.setAttribute('opacity', CR.sseg(t, a0, a0 + .12).toFixed(3)); h1.setAttribute('transform', `translate(${xe.toFixed(1)} ${dy})`); h1.setAttribute('opacity', CR.sseg(t, a0 + .05, a0 + .17).toFixed(3)); });
      let uy = dy + 26;
      if (S.unit) { const ut = String(S.unit).toUpperCase(), usz = fitSize(ut, 'mono', Math.max(560, xb - xa), 34, 22, .08, 700);
        CR.text(L, ut, { font: 'mono', size: usz, weight: 700, ls: .08, x: W / 2 - 700, y: uy, width: 1400, align: 'center', nowrap: true, color: ink, anim: 'mask_wipe', t0: Math.min(a1, tb(1.2)) - .2, glow: false }); uy += usz + 20; }
      if (count && (S.from_label || S.to_label)) {             // the span's ends, lettered under the extension lines
        CR.text(L, S.from_label || '', { font: 'mono', size: 24, x: xa - 200, y: dy + 40, width: 190, align: 'right', nowrap: true, color: pal.dim, anim: 'none', t0: at(.3), glow: false });
        CR.text(L, S.to_label || '', { font: 'mono', size: 24, x: xb + 10, y: dy + 40, width: 190, nowrap: true, color: ink, anim: 'none', t0: a1 - .2, glow: false }); }
      bpBlock([[CR.t('title'), S.context], [tw('source'), String(S.source || '')]], { w: 820, t0: tb(.9, .5) });
      CR.beat = count ? fg.land : a1; CR.focus = [W / 2, y + fg.h / 2 + 60];
    } },
  });
  CR.scene('number', {
    s: 4.4,
    layout: { void_black: 'outline', navy_falloff: 'magnitude', charcoal_light: 'exhibit', glass_dark: 'keynote', paper_desk: 'ledger', newsprint: 'banner',
              blueprint: 'dimension', concrete: 'stencil', light_table: 'ringed', footage_sharp: 'band', footage_moving: 'band' },
    comps: numberComps(false),
  });

  // ══ COUNTER — a figure counting (smoothstep) from where the story starts to where it lands ═════════════════════
  const cnt = numberComps(true);
  const counterComps = {
    figure: cnt.outline,                                      // void / charcoal: the count alone, the span it covers under it
    band: cnt.band,
    banner: cnt.banner,
    exhibit: cnt.exhibit,                                     // charcoal: the count on a framed print, the wall label beside it
    dimension: cnt.dimension,                                 // blueprint: the dimension line runs out with the count
    stencil: cnt.stencil,                                     // concrete: the count sprayed through the stencil
    ringed: cnt.ringed,                                       // light table: the count in ink, then ringed in grease pencil
    tally: { build() {
      // navy: the count top-left, a track under it filling in step with the count (a part of a whole:
      // the track is the whole, "of 200")
      const L = CR.L.front, f = S.fig || {}, ink = pal.ink, line = CR.W === 'blueprint', x0 = M;
      let y = 230;
      if (S.kicker) { CR.label(L, S.kicker, { x: x0, y, size: 26, ls: .3, t0: at(.1), color: pal.accent }); y += 58; }
      const role = line ? 'cond' : 'head', size = fitFig(f, role, W - 2 * M - 420, 230, 110, line ? 600 : null);
      const fg = figure(L, { x: x0 - 6, y, size, font: role, weight: line ? 600 : null, t0: at(.2), count: true, from: countFrom() });
      const of = typeof S.of === 'number' && S.of > 0 ? S.of : null;
      if (of) CR.text(L, `${tw('of')} ${fmtN(of, (f.dec || 0), of >= 10000 || !!f.group)}`, { font: 'serif', italic: true, size: Math.round(size * .3), x: x0 + fg.w + 24, y: y + fg.h * .58, color: pal.dim, anim: 'mask_wipe', t0: at(.4) });
      y += fg.h + 14;
      const u = unitLine(L, { x: x0, y, width: 1200, color: ink, t0: at(.5) }); if (u) y += 58;
      ctxLine(L, { x: x0, y: y + 2, width: 1200, size: 32, color: pal.dim, t0: Math.min(fg.land, tb(1.3)) });
      const ty = 820, tw_ = W - 2 * M, v = typeof f.value === 'number' ? f.value : 0, from = countFrom();
      const lo = Math.min(0, from, v), hi = Math.max(of || 0, v, from) || 1;
      const X = val => x0 + (val - lo) / (hi - lo) * tw_;
      const s = CR.svg(CR.L.mid);
      const base = CR.sv('line', { x1: x0, y1: ty, x2: x0 + tw_, y2: ty, stroke: CR.rgba(ink, .22), 'stroke-width': line ? 1.5 : 10, 'stroke-linecap': line ? 'butt' : 'round' }, s);
      void base;
      for (let i = 0; i <= 10; i++) CR.sv('line', { x1: x0 + tw_ * i / 10, y1: ty + 14, x2: x0 + tw_ * i / 10, y2: ty + (i % 5 ? 24 : 34), stroke: CR.rgba(ink, i % 5 ? .25 : .5), 'stroke-width': 1.5 }, s);
      const fill = CR.sv('line', { x1: X(from), y1: ty, x2: X(from), y2: ty, stroke: pal.accent, 'stroke-width': line ? 6 : 10, 'stroke-linecap': line ? 'butt' : 'round' }, s);
      fill.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
      const lab = (str, x, anchor, col) => { const tx = CR.sv('text', { x, y: ty + 72, 'text-anchor': anchor, fill: col, 'font-family': F.mono, 'font-size': 24 }, s); tx.textContent = str; return tx; };
      lab(S.from_label || fmtN(lo, f.dec || 0, Math.abs(lo) >= 10000), x0, 'start', CR.rgba(ink, .55));
      lab(S.to_label || fmtN(hi, f.dec || 0, hi >= 10000 || !!f.group), x0 + tw_, 'end', CR.rgba(ink, .55));
      const a0 = at(.2) + .35, a1 = fg.land;
      CR.on(t => { const q = CR.sseg(t, a0, a1); fill.setAttribute('x2', X(lerp(from, v, q)).toFixed(1)); });
      source(L, { y: H - 96, align: 'right', x: M, width: W - 2 * M });
      CR.beat = fg.land; CR.focus = [W / 2, 520];
    } },
    ring: { build() {
      // glass: the count inside a ring of light on a glass card; the ring fills to the share of the whole — only for a
      // part of a whole ("of"): a ring that merely closes with the count means nothing (a fitness-app gauge), so a
      // plain count is the keynote figure on its glass card instead
      if (!(typeof S.of === 'number' && S.of > 0) || !(S.fig && typeof S.fig.value === 'number')) return cnt.keynote.build();
      const f = S.fig || {}, cw = 980, ch = 840, cx = (W - cw) / 2, cy = (H - ch) / 2 + 10;
      const g = CR.glass(CR.L.mid, { x: cx, y: cy, w: cw, h: ch, r: 34 }); CR.enter(g.el, { kind: 'rise', t0: 0, dur: .7 });
      const host = CR.el('div', `position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px`, CR.L.front);
      if (S.kicker) CR.label(host, S.kicker, { x: 0, y: 62, width: cw, align: 'center', size: 24, ls: .26, t0: at(.15), color: pal.accent });
      const R = 250, ox = cw / 2, oy = 400, s = CR.svg(host); s.setAttribute('width', cw); s.setAttribute('height', ch); s.setAttribute('viewBox', `0 0 ${cw} ${ch}`);
      CR.sv('circle', { cx: ox, cy: oy, r: R, fill: 'none', stroke: CR.rgba(pal.ink, .1), 'stroke-width': 16 }, s);
      const of = typeof S.of === 'number' && S.of > 0 ? S.of : null, v = typeof f.value === 'number' ? f.value : 0, from = countFrom();
      const share = of ? clamp(v / of) : 1, C = 2 * Math.PI * R;
      const arc = CR.sv('circle', { cx: ox, cy: oy, r: R, fill: 'none', stroke: pal.accent, 'stroke-width': 16, 'stroke-linecap': 'round', transform: `rotate(-90 ${ox} ${oy})` }, s);
      arc.style.strokeDasharray = `${C} ${C}`; arc.style.strokeDashoffset = C; arc.style.filter = CR.glowFilter(pal.glow, 40) || 'none';
      const size = fitFig(f, 'display', R * 1.55, 150, 40);
      const fg = figure(host, { x: ox, y: oy - size * .62, align: 'center', size, font: 'display', t0: at(.3), count: true, from });
      if (S.unit) CR.text(host, S.unit, { font: 'body', size: 30, weight: 600, x: ox - R * .8, y: oy + size * .5, width: R * 1.6, align: 'center', color: pal.dim, anim: 'mask_wipe', t0: at(.6) });
      if (of) CR.text(host, `${tw('of')} ${fmtN(of, 0, of >= 10000 || !!f.group)}`, { font: 'mono', size: 24, x: ox - 200, y: oy + R + 34, width: 400, align: 'center', color: pal.dim, anim: 'mask_wipe', t0: at(.7) });
      const a0 = at(.3) + .35, a1 = fg.land;
      CR.on(t => { const q = CR.sseg(t, a0, a1), sv = of ? clamp(lerp(from, v, q) / of) : q * share; arc.style.strokeDashoffset = (C * (1 - sv)).toFixed(2); });
      ctxLine(host, { font: 'body', italic: false, size: 28, x: 90, y: ch - 150, width: cw - 180, align: 'center', color: pal.dim, t0: Math.min(fg.land, tb(1.3)) });
      source(host, { x: 0, y: ch - 70, width: cw, align: 'center', size: 20 });
      CR.beat = fg.land; CR.focus = [W / 2, cy + oy];
    } },
    drums: { build() {
      // paper: a mechanical counter — numbered drums in a dark housing that really turn (the last drum
      // spins, each one to its left steps over when the one beside it passes nine), a typed label card under it
      const f = S.fig || {}, v = typeof f.value === 'number' ? f.value : NaN;
      if (!isFinite(v) || f.text) return cnt.ledger.build();  // a range does not turn on drums: typed instead
      const dec = Math.max(0, f.dec | 0), neg = v < 0, from = countFrom();
      const digits = Math.max(String(Math.floor(Math.abs(v))).length, String(Math.floor(Math.abs(from))).length) + dec;
      const n = Math.min(12, Math.max(digits, 3)), dh = n <= 4 ? 260 : n <= 6 ? 228 : 190, dw = Math.min(n <= 4 ? 176 : n <= 6 ? 150 : 124, Math.floor(1380 / n) - 8), gap = 8;
      const grpGap = i => (f.group && i > 0 && (n - dec - i) % 3 === 0 && i < n - dec) ? 26 : 0;   // a gap between thousands
      // the decimal sign gets its own cell in the housing (a 3 px dot squeezed between two drums read "110.6" as
      // "1 1 0 6"): as wide as half a drum, the film's own sign set at the digits' size, sitting on their baseline
      const dcw = dec ? Math.round(dw * .5) : 0;
      let hw = 70; for (let i = 0; i < n; i++) hw += dw + gap + grpGap(i) + (dec && i === n - dec ? dcw + gap : 0);
      hw += 62 - gap;
      const hh = dh + 96, hx = (W - hw) / 2, hy = 210;
      const housing = CR.el('div', `position:absolute;left:${hx}px;top:${hy}px;width:${hw}px;height:${hh}px;border-radius:18px;` +
        `background:linear-gradient(180deg,#3A3835 0%,#1E1D1B 48%,#141312 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.12), inset 0 -3px 0 rgba(0,0,0,.6), 0 30px 60px rgba(0,0,0,.55), 0 6px 14px rgba(0,0,0,.45)`, CR.L.mid);
      CR.enter(housing, { kind: CR.W === 'concrete' ? 'fade' : 'land', t0: 0, dur: .55, rot: 0, drot: .4 });
      [[22, 22], [hw - 34, 22], [22, hh - 34], [hw - 34, hh - 34]].forEach(([x, y]) => CR.el('div', `position:absolute;left:${x}px;top:${y}px;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#9A968F,#3A3835 70%);box-shadow:0 1px 1px rgba(0,0,0,.6)`, housing));
      const win = CR.el('div', `position:absolute;left:${35}px;top:48px;width:${hw - 70}px;height:${dh}px;background:#0B0B0A;border-radius:6px;box-shadow:inset 0 0 0 2px rgba(0,0,0,.8), inset 0 10px 18px rgba(0,0,0,.8)`, housing);
      const fam = F.cond, wt = 600, fsz = Math.round(dh * .62);
      const drums = []; let x = 20;
      for (let i = 0; i < n; i++) {
        x += grpGap(i);
        if (dec && i === n - dec) {                            // the decimal cell: housing black, the sign in cream
          const dcell = CR.el('div', `position:absolute;left:${x}px;top:0;width:${dcw}px;height:${dh}px;background:#141312;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)`, win);
          CR.el('div', `position:absolute;left:0;top:0;width:${dcw}px;height:${dh}px;line-height:${dh}px;text-align:center;font-family:${F.cond};font-weight:700;font-size:${fsz * 1.12}px;color:#F0ECE2`, dcell, esc(SEP[1]));
          x += dcw + gap;
        }
        const isDec = i >= n - dec;
        const dr = CR.el('div', `position:absolute;left:${x}px;top:0;width:${dw}px;height:${dh}px;overflow:hidden;background:${isDec ? '#E9E4D8' : '#1C1B19'}`, win);
        const strip = CR.el('div', `position:absolute;left:0;top:0;width:${dw}px;font-family:${fam};font-weight:${wt};font-size:${fsz}px;${NUMCSS}color:${isDec ? '#141312' : '#F0ECE2'};text-align:center;will-change:transform`, dr);
        for (let k = 0; k < 11; k++) CR.el('div', `height:${dh}px;line-height:${dh}px`, strip, String(k % 10));
        CR.el('div', `position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,0) 30%, rgba(255,255,255,.05) 50%, rgba(0,0,0,0) 70%, rgba(0,0,0,.72) 100%)`, dr);
        drums.push(strip); x += dw + gap;
      }
      CR.el('div', `position:absolute;left:0;right:0;top:${dh / 2 - 1}px;height:2px;background:rgba(0,0,0,.35)`, win);
      CR.el('div', `position:absolute;inset:0;border-radius:6px;background:linear-gradient(180deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,0) 22%)`, win);
      // true mechanical carries: drum i shows floor(u / 10^i) mod 10 and turns over only while the drums to its right
      // pass from 9 to 0 (u in units of the last digit)
      const scale = Math.pow(10, dec), U0 = Math.round(Math.abs(from) * scale), U1 = Math.round(Math.abs(v) * scale);
      const a0 = at(.35), a1 = a0 + Math.min(D * .5, 2.1 * CR.ts);
      CR.on(t => { const q = CR.sseg(t, a0, a1), u = lerp(U0, U1, q);
        for (let i = 0; i < n; i++) { const pw = Math.pow(10, i), d = Math.floor(u / pw) % 10, rest = u - Math.floor(u / pw) * pw;
          const turn = i === 0 ? rest : Math.max(0, rest - (pw - 1));      // the carry window: the last unit before rolling over
          const pos = q >= 1 ? Math.floor(U1 / pw) % 10 : d + turn;
          drums[n - 1 - i].style.transform = `translateY(${(-pos * dh).toFixed(2)}px)`; } });
      void neg;
      const lw = Math.min(1180, Math.max(640, hw)), lh = 70 + (S.unit ? 56 : 0) + (S.context ? 92 : 0) + (srcText() ? 46 : 0);
      if (S.unit || S.context || S.kicker) {
        const card = sheetOn(CR.L.front, { x: (W - lw) / 2 + 30, y: hy + hh + 40, w: lw, h: lh, seed: 35, age: .4, rot: .6 });
        let y = 40; const ink = pal.sink, dk = CR.mix(ink, pal.paper, .4);
        if (S.unit || S.kicker) { CR.text(card.el, String(S.unit || S.kicker).toUpperCase(), { font: 'mono', size: 34, weight: 700, ls: .04, x: 60, y, width: lw - 120, color: ink, onLight: true, anim: 'typewriter', t0: at(.6), cps: 30 }); y += 56; }
        if (S.context) { CR.text(card.el, S.context, { font: 'mono', size: 28, x: 60, y, width: lw - 120, lh: 1.25, color: dk, onLight: true, anim: 'typewriter', caret: NOC, t0: tb(1.6, .7), cps: 40 }); y += 92; }
        const s = srcText(); if (s) CR.text(card.el, s, { font: 'mono', size: 21, x: 60, y: lh - 52, width: lw - 120, align: 'right', color: dk, onLight: true, anim: 'none', t0: tb(1.2, .7) });
      }
      CR.beat = a1; CR.focus = [W / 2, hy + hh / 2 + 60];
    } },
  };
  CR.scene('counter', {
    s: 4.8,
    layout: { void_black: 'figure', navy_falloff: 'tally', charcoal_light: 'exhibit', glass_dark: 'ring', paper_desk: 'drums', newsprint: 'banner',
              blueprint: 'dimension', concrete: 'stencil', light_table: 'ringed', footage_sharp: 'band', footage_moving: 'band' },
    comps: counterComps,
  });

  // ── shared chart helpers ──────────────────────────────────────────────────────────────────────────────────────
  const GRP = S.grp === 5 ? 5 : 4;                           // digits from which a figure gets thousands separators
  const grp = v => String(Math.floor(Math.abs(v))).length >= GRP;
  const nice = (lo, hi, n = 4) => {
    const span = (hi - lo) || Math.abs(hi) || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
    const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, ticks = [];
    for (let v = a; v <= b + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
    return { lo: a, hi: b, step, ticks };
  };
  const tickDec = step => step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9));
  const tickTxt = (v, step) => fmtN(v, tickDec(step), grp(v));
  const bars = () => (Array.isArray(S.bars) ? S.bars : []).filter(b => b && typeof b.value === 'number').slice(0, 7);
  const barTxt = (b, q) => q >= 1 ? String(b.text || fmtN(b.value, b.dec || 0, grp(b.value))) : fmtN((b.dec ? 1 : 0) ? b.value * q : Math.round(b.value * q), b.dec || 0, grp(b.value));
  const isHi = i => S.highlight === i;
  const chartHead = (parent, o = {}) => {                     // kicker-style title + the unit in a quiet line
    let y = o.y == null ? 128 : o.y; const x = o.x == null ? M : o.x, paper = o.paper != null ? o.paper : L0();
    if (S.title) { CR.label(parent, S.title, { x, y, size: o.size || 28, ls: .26, t0: at(.1), color: o.color || (paper ? CR.mix(pal.sink, pal.ground, .15) : pal.accent), onLight: paper, width: o.w || W - 2 * M, nowrap: true }); y += (o.size || 28) + 22; }
    if (S.unit) { CR.text(parent, S.unit, { font: 'serif', italic: true, size: 30, x, y, width: o.w || W - 2 * M, color: dimOn(paper), onLight: paper, anim: 'mask_wipe', t0: at(.25), glow: false }); y += 44; }
    return y;
  };
  const grow = (el, t0, dur, axis = 'Y') => { el.style.transformOrigin = axis === 'Y' ? '50% 100%' : '0 50%';
    CR.on(t => { el.style.transform = `scale${axis}(${CR.sseg(t, t0, t0 + dur).toFixed(4)})`; }); };
  const countIn = (el, b, t0, dur) => CR.on(t => { const q = CR.sseg(t, t0, t0 + dur), s = barTxt(b, q); if (el.textContent !== s) el.textContent = s; el.style.opacity = CR.sseg(t, t0, t0 + .25).toFixed(3); });
  const barCol = (b, i, paper, a) => isHi(i) ? pal.accent : (b.color && !paper ? CR.rgba(b.color, .78) : b.color ? b.color : CR.rgba(inkOn(paper), a));

  // ══ BAR CHART ═══════════════════════════════════════════════════════════════════════════════════════════════
  CR.scene('bar_chart', {
    s: 6.0,
    layout: { void_black: 'columns', navy_falloff: 'hbars', charcoal_light: 'exhibit', glass_dark: 'panel', paper_desk: 'ledger', newsprint: 'press',
              blueprint: 'hbars', concrete: 'stencil', light_table: 'columns', footage_sharp: 'hbars', footage_moving: 'hbars' },
    comps: {
      columns: { build() {
        // void / light table: quiet columns on one hairline, the one that matters in the accent,
        // each figure counting up as its column rises, the names under the line
        if (CR.foot) { CR.footLook(8, .3, .7); veil(CR.L.back, 'all'); }
        const L = CR.L.front, bs = bars(), n = bs.length, paper = L0();
        chartHead(L, { paper });
        const base = 830, top = 330, x0 = M + 40, x1 = W - M - 40, slot = (x1 - x0) / n, cw = Math.min(170, slot * .46);
        const mx = Math.max(...bs.map(b => b.value), 1e-9);
        CR.rule(L, { x: x0 - 30, y: base, w: x1 - x0 + 60, h: 2, color: CR.rgba(inkOn(paper), .5), glow: false, t0: at(.15), dur: .8 });
        const vsize = Math.min(58, Math.max(30, Math.min(...bs.map(b => fitSize(String(b.text || ''), 'head', slot - 16, 58, 30)))));
        const lsize = Math.min(28, Math.min(...bs.map(b => fitSize(String(b.label || '').toUpperCase(), 'cond', slot - 12, 28, 18, .1))));
        bs.forEach((b, i) => {
          const cx = x0 + slot * (i + .5), h = Math.max(4, (top - 80 > 0 ? (base - top) : 400) * b.value / mx), t0 = at(.35 + i * .14), du = Math.min(1.1, D * .25);
          const col = CR.el('div', `position:absolute;left:${cx - cw / 2}px;top:${base - h}px;width:${cw}px;height:${h}px;background:${barCol(b, i, paper, paper ? .62 : .26)}`, L);
          if (isHi(i) && !paper) col.style.filter = CR.glowFilter(pal.accent, 34) || 'none';
          grow(col, t0, du);
          const v = CR.el('div', `position:absolute;left:${cx - slot / 2}px;top:${base - h - vsize * 1.25 - 8}px;width:${slot}px;text-align:center;font-family:${F.head};font-weight:${CR.FW.head};font-size:${vsize}px;line-height:1.2;${NUMCSS}` +
            `color:${isHi(i) ? pal.accent : inkOn(paper)};${paper ? '' : `text-shadow:${CR.glowText(vsize, isHi(i) ? pal.accent : null, paper)}`}`, L);
          countIn(v, b, t0, du);
          CR.text(L, b.label || '', { font: 'cond', size: lsize, ls: .1, upper: true, x: cx - slot / 2 + 6, y: base + 22, width: slot - 12, align: 'center', lh: 1.15, color: isHi(i) ? inkOn(paper) : dimOn(paper), onLight: paper, anim: 'mask_wipe', t0: t0 + .1, glow: false });
        });
        source(L, { paper, y: H - 92 });
        CR.beat = at(.35 + Math.max(0, S.highlight) * .14) + .6; CR.focus = [W / 2, (base + top) / 2];
      } },
      exhibit: { build() {
        // charcoal (the museum): the chart printed in ink on a framed, matted print under a warm spot — quiet columns,
        // the one that matters in the accent, the figures counting up as they rise — the title and unit on the wall
        // label beside the frame
        const bs = bars(), n = bs.length, pw = 1000, ph = 600, pad = Math.round(ph * .11), bd = Math.max(10, Math.round(ph * .022));
        const ow = pw + 2 * pad + 2 * bd, oh = ph + 2 * pad + 2 * bd, label = !!(S.title || S.unit || srcText()), fx = label ? 150 : (W - ow) / 2, fy = (H - oh) / 2 - 6;
        const fr = museumFrame(fx, fy, pw, ph, 68), PR = fr.print, acc = pAcc();
        museumSpot(fx + ow / 2, fy + oh / 2, ow * 1.45, oh * 1.9); CR.halo(CR.L.back, fx + ow / 2, fy + oh / 2, ow, oh * .7);
        const base = ph - 112, top = 128, x0 = 64, x1 = pw - 64, slot = (x1 - x0) / n, cw = Math.min(112, slot * .5), mx = Math.max(...bs.map(b => b.value), 1e-9);
        CR.el('div', `position:absolute;left:${x0 - 18}px;top:${base}px;width:${x1 - x0 + 36}px;height:1.5px;background:${CR.rgba(PINK, .55)}`, PR);
        // the figures keep air between them (7 bars: "389.9" and "414.2" nearly touched at slot - 12)
        const vsize = Math.min(44, Math.max(20, Math.min(...bs.map(b => fitSize(String(b.text || ''), 'head', slot - Math.max(30, slot * .26), 44, 20)))));
        const lsize = Math.min(22, Math.min(...bs.map(b => fitSize(String(b.label || '').toUpperCase(), 'cond', slot - 10, 22, 15, .1))));
        bs.forEach((b, i) => {
          const cx = x0 + slot * (i + .5), h = Math.max(3, (base - top) * b.value / mx), t0 = at(.45 + i * .13), du = Math.min(1.0, D * .22);
          const col = CR.el('div', `position:absolute;left:${cx - cw / 2}px;top:${base - h}px;width:${cw}px;height:${h}px;background:${isHi(i) ? acc : (b.color || CR.rgba(PINK, .58))}`, PR);
          grow(col, t0, du);
          const v = CR.el('div', `position:absolute;left:${cx - slot / 2}px;top:${base - h - vsize * 1.25 - 6}px;width:${slot}px;text-align:center;font-family:${F.head};` +
            `font-weight:${CR.FW.head};font-size:${vsize}px;line-height:1.2;${NUMCSS}color:${isHi(i) ? acc : PINK}`, PR);
          countIn(v, b, t0, du);
          CR.text(PR, b.label || '', { font: 'cond', size: lsize, ls: .1, upper: true, x: cx - slot / 2 + 5, y: base + 16, width: slot - 10, align: 'center', lh: 1.15,
            color: isHi(i) ? PINK : CR.rgba(PINK, .6), onLight: true, anim: 'mask_wipe', t0: t0 + .1, glow: false });
        });
        const lx = fx + ow + 80;
        if (label) wallLabel(lx, fy + oh / 2, W - M - lx, { name: S.title || S.unit, sub: S.title ? S.unit : '', t0: .2, max: 52 });
        CR.beat = at(.45 + Math.max(0, S.highlight) * .13) + .5; CR.focus = [label ? fx + ow * .58 : W / 2, fy + oh / 2];
      } },
      hbars: { build() {
        // navy / blueprint / footage: horizontal bars against a measured scale — gridlines, tick values in the mono face, names
        // right-aligned before the bars, the figure at each bar's end; blueprint draws them as hatched linework
        if (CR.foot) { CR.footLook(8, .28, .7); veil(CR.L.back, 'all'); }   // footage: the still darkened under the chart
        const L = CR.L.front, bs = bars(), n = bs.length, line = CR.W === 'blueprint', ink = pal.ink;
        chartHead(L, {});
        const lx = M + 400, rx = W - M - 190, y0 = 330, y1 = 830, rowH = Math.min(118, (y1 - y0) / n), th = rowH * .44;
        const sc = nice(0, Math.max(...bs.map(b => b.value), 1e-9), 4), X = v => lx + (v - sc.lo) / (sc.hi - sc.lo) * (rx - lx);
        const s = CR.svg(CR.L.mid);
        if (line) { const d = CR.sv('defs', {}, s), p = CR.sv('pattern', { id: 'crdHatch', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
          CR.sv('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: CR.rgba(ink, .7), 'stroke-width': 2 }, p);
          const p2 = CR.sv('pattern', { id: 'crdHatchA', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
          CR.sv('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: pal.accent, 'stroke-width': 3 }, p2); }
        const yb = y0 + n * rowH;
        sc.ticks.forEach((v, k) => { const x = X(v);
          const gl = CR.sv('line', { x1: x, y1: y0 - 20, x2: x, y2: yb, stroke: CR.rgba(ink, k ? .12 : .45), 'stroke-width': k ? 1 : 1.5, 'stroke-dasharray': line && k ? '6 6' : 'none', opacity: 0 }, s);
          const tx = CR.sv('text', { x, y: yb + 40, 'text-anchor': 'middle', fill: CR.rgba(ink, .5), 'font-family': F.mono, 'font-size': 22, opacity: 0 }, s); tx.textContent = tickTxt(v, sc.step);
          CR.on(t => { const q = CR.sseg(t, at(.1 + k * .06), at(.1 + k * .06) + .5).toFixed(3); gl.setAttribute('opacity', q); tx.setAttribute('opacity', q); }); });
        const lsize = Math.min(30, Math.min(...bs.map(b => fitSize(String(b.label || '').toUpperCase(), 'cond', lx - M - 40, 30, 18, .08))));
        bs.forEach((b, i) => {
          const yc = y0 + rowH * (i + .5), t0 = at(.35 + i * .13), du = Math.min(1.0, D * .22), w = Math.max(3, X(b.value) - lx);
          const r = CR.sv('rect', { x: lx, y: yc - th / 2, width: w, height: th, rx: line ? 0 : 3,
            fill: line ? `url(#${isHi(i) ? 'crdHatchA' : 'crdHatch'})` : (isHi(i) ? pal.accent : b.color ? CR.rgba(b.color, .8) : CR.rgba(ink, .3)),
            stroke: line ? (isHi(i) ? pal.accent : ink) : 'none', 'stroke-width': line ? 2 : 0 }, s);
          if (isHi(i)) r.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
          CR.on(t => { r.setAttribute('width', (w * CR.sseg(t, t0, t0 + du)).toFixed(1)); });
          CR.text(L, b.label || '', { font: 'cond', size: lsize, ls: .08, upper: true, x: M, y: yc - lsize * .62, width: lx - M - 32, align: 'right', nowrap: true, color: isHi(i) ? ink : pal.dim, anim: 'mask_wipe', t0, glow: false });
          const v = CR.el('div', `position:absolute;left:${lx + w + 18}px;top:${yc - 20}px;font-family:${F.mono};font-size:34px;font-weight:700;line-height:1.2;${NUMCSS}white-space:nowrap;color:${isHi(i) ? pal.accent : ink};text-shadow:${CR.glowText(34, isHi(i) ? pal.accent : null)}`, L);
          countIn(v, b, t0, du);
        });
        source(L, { y: H - 92 });
        CR.beat = at(.35 + Math.max(0, S.highlight) * .13) + .5; CR.focus = [W / 2, (y0 + yb) / 2];
      } },
      panel: { build() {
        // glass: a frosted glass panel of rounded columns lit from inside; the one that matters glows in the accent
        const bs = bars(), n = bs.length, gx = M - 20, gy = 150, gw = W - 2 * M + 40, gh = 800;
        const g = CR.glass(CR.L.mid, { x: gx, y: gy, w: gw, h: gh, r: 30 }); CR.enter(g.el, { kind: 'rise', t0: 0, dur: .7 });
        const L = CR.el('div', `position:absolute;left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px`, CR.L.front);
        let y = 64;
        if (S.title) { CR.text(L, S.title, { font: 'body', size: 40, weight: 600, x: 80, y, width: gw - 160, nowrap: true, color: pal.ink, anim: 'mask_wipe', t0: at(.2) }); y += 56; }
        if (S.unit) CR.text(L, S.unit, { font: 'body', size: 26, x: 80, y, width: gw - 160, color: pal.dim, anim: 'mask_wipe', t0: at(.3), glow: false });
        const base = gh - 150, top = 250, x0 = 110, x1 = gw - 110, slot = (x1 - x0) / n, cw = Math.min(150, slot * .5);
        const mx = Math.max(...bs.map(b => b.value), 1e-9);
        CR.el('div', `position:absolute;left:${x0 - 20}px;top:${base}px;width:${x1 - x0 + 40}px;height:1px;background:${CR.rgba(pal.ink, .22)}`, L);
        const vsize = Math.min(52, Math.min(...bs.map(b => fitSize(String(b.text || ''), 'display', slot - 16, 52, 28))));
        bs.forEach((b, i) => {
          const cx = x0 + slot * (i + .5), h = Math.max(6, (base - top) * b.value / mx), t0 = at(.35 + i * .14), du = Math.min(1.1, D * .25), hi = isHi(i);
          const c0 = hi ? pal.accent : b.color || pal.ink;
          const col = CR.el('div', `position:absolute;left:${cx - cw / 2}px;top:${base - h}px;width:${cw}px;height:${h}px;border-radius:14px 14px 3px 3px;` +
            `background:linear-gradient(180deg, ${CR.rgba(c0, hi ? .95 : .34)} 0%, ${CR.rgba(c0, hi ? .45 : .08)} 100%);box-shadow:inset 0 1px 0 ${CR.rgba('#FFFFFF', hi ? .45 : .2)}`, L);
          if (hi) col.style.filter = CR.glowFilter(pal.glow, 40) || 'none';
          grow(col, t0, du);
          const v = CR.el('div', `position:absolute;left:${cx - slot / 2}px;top:${base - h - vsize * 1.3 - 6}px;width:${slot}px;text-align:center;font-family:${F.display};font-weight:${CR.FW.display};font-size:${vsize}px;line-height:1.2;${NUMCSS}color:${hi ? pal.ink : CR.mix(pal.ink, pal.dim, .35)}`, L);
          countIn(v, b, t0, du);
          CR.text(L, b.label || '', { font: 'body', size: 26, weight: hi ? 600 : 500, x: cx - slot / 2 + 4, y: base + 22, width: slot - 8, align: 'center', lh: 1.15, color: hi ? pal.ink : pal.dim, anim: 'mask_wipe', t0: t0 + .1, glow: false });
        });
        source(L, { x: 80, y: gh - 62, width: gw - 160, size: 20 });
        CR.beat = at(.35 + Math.max(0, S.highlight) * .14) + .6; CR.focus = [W / 2, gy + gh / 2];
      } },
      ledger: { build() {
        // paper: a typed report sheet — each row typed, its bar drawn in pencil hatching after it, the one
        // that matters in red pencil, the figure typed at the bar's end
        const bs = bars(), n = bs.length, sw = 1520, rowH = Math.min(100, 560 / n), sh = 230 + n * rowH + 100;
        const sx = (W - sw) / 2, sy = (H - sh) / 2;
        const sh_ = sheetOn(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, seed: 37, age: .5, rot: -.5 });
        const host = sh_.el, ink = pal.sink, dk = CR.mix(ink, pal.paper, .4), X = 100;
        let y = 76;
        if (S.title) { CR.text(host, String(S.title).toUpperCase(), { font: 'mono', size: 32, weight: 700, ls: .04, x: X, y, width: sw - 2 * X, color: ink, onLight: true, anim: 'typewriter', t0: at(.35), cps: 34 }); y += 48; }
        if (S.unit) { CR.text(host, S.unit, { font: 'mono', size: 26, x: X, y, width: sw - 2 * X, color: dk, onLight: true, anim: 'typewriter', caret: NOC, t0: at(.6), cps: 40 }); y += 40; }
        CR.el('div', `position:absolute;left:${X}px;top:${y + 8}px;width:${sw - 2 * X}px;height:2px;background:${CR.rgba(ink, .6)}`, host); y += 40;
        const lw = 470, bx = X + lw + 20, bw = sw - X - bx - 230, mx = Math.max(...bs.map(b => b.value), 1e-9);
        const svg = CR.svg(host); svg.setAttribute('width', sw); svg.setAttribute('height', sh); svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`); greaseDefs(svg);
        const d = CR.sv('defs', {}, svg);
        const pat = (id, col) => { const p = CR.sv('pattern', { id, width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(58)' }, d); CR.sv('line', { x1: 0, y1: 0, x2: 0, y2: 9, stroke: col, 'stroke-width': 2.4, opacity: .8 }, p); };
        pat('crdPen', '#3B3936'); pat('crdRed', pal.accent);
        bs.forEach((b, i) => {
          const yc = y + rowH * (i + .5), t0 = tb(.8 + i * .32, .55), hi = isHi(i);
          CR.text(host, b.label || '', { font: 'mono', size: 30, x: X, y: yc - 18, width: lw, nowrap: true, color: ink, onLight: true, anim: 'typewriter', caret: NOC, t0, cps: 40 });
          const w = Math.max(6, bw * b.value / mx), bh = rowH * .46, du = Math.min(.7, D * .14), b0 = t0 + .35;
          const r = CR.sv('rect', { x: bx, y: yc - bh / 2, width: w, height: bh, fill: `url(#${hi ? 'crdRed' : 'crdPen'})`, stroke: hi ? pal.accent : '#3B3936', 'stroke-width': 2, 'stroke-opacity': .8 }, svg);
          r.style.filter = 'url(#crdGrease)';
          CR.on(t => { r.setAttribute('width', (w * CR.sseg(t, b0, b0 + du)).toFixed(1)); });
          CR.text(host, String(b.text || ''), { font: 'mono', size: 30, weight: 700, x: bx + w + 18, y: yc - 18, nowrap: true, color: hi ? pal.accent : ink, onLight: true, anim: 'typewriter', caret: NOC, t0: b0 + du, cps: 30 });
          if (i < n - 1) CR.el('div', `position:absolute;left:${X}px;top:${y + rowH * (i + 1)}px;width:${sw - 2 * X}px;height:1px;background:${CR.rgba(ink, .14)}`, host);
        });
        const s = srcText(); if (s) CR.text(host, s, { font: 'mono', size: 22, x: X, y: sh - 66, width: sw - 2 * X, align: 'right', color: dk, onLight: true, anim: 'none', t0: tb(1.3, .7) });
        CR.beat = tb(.8 + Math.max(0, S.highlight) * .32, .55) + .6; CR.focus = [W / 2, sy + sh / 2];
      } },
      press: { build() {
        // newsprint: the paper's own chart — the heavy rule, a bold head, the deck in the serif, grey ink bars with the
        // names over them and the figure in bold at each end, the one that matters in the paper's red
        const bs = bars(), n = bs.length, ink = pal.sink, L = CR.L.front, x0 = M + 40, rw = W - 2 * M - 80;
        CR.rule(L, { x: x0, y: 112, w: rw, h: 7, color: ink, glow: false, t0: at(.05), dur: .6 });
        let y = 138;
        if (S.title) { const tsz = fitSize(S.title, 'head', rw, 64, 40, 0, Math.max(CR.FW.head, 700));
          CR.text(L, S.title, { font: 'head', size: tsz, weight: Math.max(CR.FW.head, 700), x: x0, y, width: rw, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.15), glow: false }); y += tsz * 1.2; }
        if (S.unit) { CR.text(L, S.unit, { font: 'serif', italic: true, size: 32, x: x0, y, width: rw, color: CR.mix(ink, pal.ground, .3), onLight: true, anim: 'mask_wipe', t0: at(.25), glow: false }); y += 50; }
        y += 26;
        const avail = 900 - y, rowH = Math.min(116, avail / n), th = Math.min(46, rowH * .42), bw = rw - 230, mx = Math.max(...bs.map(b => b.value), 1e-9);
        CR.el('div', `position:absolute;left:${x0}px;top:${y}px;width:2px;height:${n * rowH}px;background:${ink}`, L);
        bs.forEach((b, i) => {
          const ry = y + i * rowH, t0 = at(.35 + i * .13), du = Math.min(1.0, D * .22), w = Math.max(4, bw * b.value / mx), hi = isHi(i);
          CR.text(L, b.label || '', { font: 'body', size: 26, weight: 700, upper: true, ls: .04, x: x0 + 14, y: ry + 4, width: bw, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0, glow: false });
          const bar = CR.el('div', `position:absolute;left:${x0 + 2}px;top:${ry + 38}px;width:${w}px;height:${th}px;background:${hi ? pal.accent : b.color || CR.mix(ink, pal.ground, .42)}`, L);
          grow(bar, t0 + .05, du, 'X');
          const v = CR.el('div', `position:absolute;left:${x0 + w + 16}px;top:${ry + 38 + th / 2 - 22}px;font-family:${F.head};font-weight:${Math.max(CR.FW.head, 700)};font-size:38px;line-height:1.15;${NUMCSS}white-space:nowrap;color:${hi ? pal.accent : ink}`, L);
          countIn(v, b, t0 + .05, du);
        });
        source(L, { x: x0, y: y + n * rowH + 30, width: rw, font: 'serif', upper: false, size: 26, ls: 0, paper: true, color: CR.mix(ink, pal.ground, .3) });
        CR.beat = at(.35 + Math.max(0, S.highlight) * .13) + .5; CR.focus = [W / 2, 500];
      } },
      stencil: { build() {
        // concrete: the bars sprayed on the wall through a stencil in worn off-white paint, the one that matters in the
        // accent paint, each figure stencilled over its bar and each name under the sprayed base line; the title and
        // unit typed on a notice taped to the wall
        const bs = bars(), n = bs.length, paint = ccPaint(), acc = ccAcc(), base = 860, top = 330, x0 = M + 60, x1 = W - M - 60, slot = (x1 - x0) / n, cw = Math.min(170, slot * .52);
        const mx = Math.max(...bs.map(b => b.value), 1e-9);
        const nl = [S.title ? { t: String(S.title).toUpperCase(), bold: true, size: 28 } : null, S.unit ? { t: S.unit, size: 24 } : null].filter(Boolean);
        if (nl.length) ccNote(CR.L.mid, M, 96, nl, { t0: at(.1), maxW: 1200, rot: -.8 });
        const bl = ccSpray(CR.el('div', `position:absolute;left:${x0 - 30}px;top:${base}px;width:${x1 - x0 + 60}px;height:6px;background:${paint};transform-origin:0 50%`, CR.L.front));
        CR.on(t => { bl.style.transform = `scaleX(${CR.sseg(t, at(.15), at(.15) + .7).toFixed(4)})`; });
        const vsize = Math.min(60, Math.max(28, Math.min(...bs.map(b => fitSize(String(b.text || ''), 'stamp', slot - Math.max(26, slot * .2), 60, 28)))));
        const lsize = Math.min(28, Math.min(...bs.map(b => fitSize(String(b.label || '').toUpperCase(), 'cond', slot - 14, 28, 18, .1))));
        bs.forEach((b, i) => {
          const cx = x0 + slot * (i + .5), h = Math.max(6, (base - top) * b.value / mx), t0 = at(.4 + i * .16), du = Math.min(.9, D * .2), col = isHi(i) ? acc : paint;
          const wrap = ccSpray(CR.el('div', `position:absolute;left:${cx - cw / 2 - 10}px;top:${base - h - 8}px;width:${cw + 20}px;height:${h + 8}px`, CR.L.front));
          const bar = CR.el('div', `position:absolute;left:10px;top:8px;width:${cw}px;height:${h}px;background:${col};box-shadow:0 0 14px ${CR.rgba(col, .35)}`, wrap);
          CR.on(t => { const q = CR.sseg(t, t0, t0 + du); bar.style.clipPath = `inset(${((1 - q) * 100).toFixed(2)}% 0 0 0)`; });
          const v = ccSpray(CR.el('div', `position:absolute;left:${cx - slot / 2}px;top:${base - h - vsize * 1.2 - 14}px;width:${slot}px;text-align:center;font-family:${F.stamp};font-size:${vsize}px;line-height:1.2;${NUMCSS}color:${col}`, CR.L.front));
          countIn(v, b, t0, du);
          CR.text(CR.L.front, b.label || '', { font: 'cond', size: lsize, weight: 600, ls: .1, upper: true, x: cx - slot / 2 + 6, y: base + 24, width: slot - 12, align: 'center', lh: 1.15, color: isHi(i) ? acc : CR.rgba(paint, .82), anim: 'mask_wipe', t0: t0 + .1, glow: false });
        });
        source(CR.L.front, { align: 'right', x: M, width: W - 2 * M, y: H - 80 });
        CR.beat = at(.4 + Math.max(0, S.highlight) * .16) + .6; CR.focus = [W / 2, (base + top) / 2];
      } },
    },
  });

  // ══ LINE CHART ══════════════════════════════════════════════════════════════════════════════════════════════
  const pts = () => (Array.isArray(S.pts) ? S.pts : []).filter(p => p && typeof p.y === 'number').slice(0, 60);
  const lineFrame = (box, o = {}) => {                        // scales + the path points of the series inside a box
    const ps = pts(), ys = ps.map(p => p.y), lo0 = Math.min(...ys), hi0 = Math.max(...ys);
    const from0 = typeof S.y0 === 'number' ? S.y0 : (lo0 >= 0 && lo0 <= hi0 * .35 ? 0 : lo0 - (hi0 - lo0) * .12);
    const sc = nice(Math.min(from0, lo0), hi0, o.ticks || 4);
    const xs = ps.map((p, i) => typeof p.xv === 'number' ? p.xv : i), xa = Math.min(...xs), xb = Math.max(...xs);
    const X = xv => box.x + (xb > xa ? (xv - xa) / (xb - xa) : .5) * box.w, Y = v => box.y + box.h - (v - sc.lo) / ((sc.hi - sc.lo) || 1) * box.h;
    return { ps, sc, X, Y, P: ps.map((p, i) => [X(xs[i]), Y(p.y)]) };
  };
  const pathOf = (P) => 'M' + P.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
  // the pen: a path drawn by its dash from a0 to a1 (cruise: it glides), returns (t) -> the pen's point
  const pen = (path, a0, a1) => { const Ln = path.getTotalLength(); path.style.strokeDasharray = `${Ln} ${Ln}`; path.style.strokeDashoffset = Ln;
    let last = 0; CR.on(t => { last = CR.cruise(seg(t, a0, a1), .25); path.style.strokeDashoffset = (Ln * (1 - last)).toFixed(2); });
    return { Ln, at: q => path.getPointAtLength(Ln * clamp(q)), q: t => CR.cruise(seg(t, a0, a1), .25) }; };
  const xLabels = (ps, maxN) => { const n = ps.length, step = Math.max(1, Math.ceil(n / maxN)), out = [];
    for (let i = 0; i < n; i += step) out.push(i); if (out[out.length - 1] !== n - 1) { if (n - 1 - out[out.length - 1] < step * .6) out.pop(); out.push(n - 1); } return out; };
  // the first of the candidate boxes the series does not cross (sampled along every segment), else the least crossed
  const freeSpot = (P, cands, w, h, pad = 16) => { let best = cands[0], bestN = 1e9;
    for (const [x, y] of cands) { let n = 0;
      for (let i = 1; i < P.length; i++) for (let k = 0; k <= 10; k++) { const px = lerp(P[i - 1][0], P[i][0], k / 10), py = lerp(P[i - 1][1], P[i][1], k / 10);
        if (px > x - pad && px < x + w + pad && py > y - pad && py < y + h + pad) n++; }
      if (n === 0) return [x, y]; if (n < bestN) { bestN = n; best = [x, y]; } }
    return best; };
  const noteSpots = (m, w, h, box) => { const cl = (x, y) => [clamp(x, box.x - 40, box.x + box.w + 40 - w), clamp(y, box.y - 70, box.y + box.h - h - 10)];
    return [cl(m[0] - w / 2, m[1] - h - 70), cl(m[0] + 40, m[1] - h - 50), cl(m[0] - w - 40, m[1] - h - 50), cl(m[0] - w / 2, box.y - 60),
            cl(m[0] + 40, m[1] + 50), cl(m[0] - w - 40, m[1] + 50), cl(m[0] - w / 2, m[1] + 60)]; };
  const markIdx = () => { const ps = pts(); return (typeof S.mark === 'number' && S.mark >= 0 && S.mark < ps.length) ? S.mark : -1; };
  // the second along the pen at which it reaches point i (the path is drawn by length, so the arrival follows it)
  const arrive = (P, i, a0, a1) => { let tot = 0, upto = 0; for (let k = 1; k < P.length; k++) { const d = Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); tot += d; if (k <= i) upto += d; }
    const f = tot ? upto / tot : 0; let lo = 0, hi = 1; for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (CR.cruise(m, .25) < f) lo = m; else hi = m; } return a0 + (a1 - a0) * hi; };
  CR.scene('line_chart', {
    s: 6.5,
    layout: { void_black: 'trace', navy_falloff: 'plot', charcoal_light: 'exhibit', glass_dark: 'panel', paper_desk: 'graph', newsprint: 'press',
              blueprint: 'drafted', concrete: 'graph', light_table: 'acetate', footage_sharp: 'trace', footage_moving: 'trace' },
    comps: {
      trace: { build() {
        // void / charcoal / footage: one line of light drawn across the dark, a faint wash under it, the first and the
        // last figure only — and the moment that matters marked on the line with its note
        if (CR.foot) { CR.footLook(8, .3, .7); veil(CR.L.back, 'all'); }
        const L = CR.L.front, ink = pal.ink;
        chartHead(L, {});
        const box = { x: M + 40, y: 330, w: W - 2 * M - 300, h: 460 }, fr = lineFrame(box), P = fr.P, ps = fr.ps;
        const s = CR.svg(CR.L.mid), d = CR.sv('defs', {}, s);
        const lg = CR.sv('linearGradient', { id: 'crdWash', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
        CR.sv('stop', { offset: '0', 'stop-color': pal.accent, 'stop-opacity': .2 }, lg); CR.sv('stop', { offset: '1', 'stop-color': pal.accent, 'stop-opacity': 0 }, lg);
        const cp = CR.sv('clipPath', { id: 'crdPenClip' }, d), cr = CR.sv('rect', { x: box.x - 4, y: 0, width: 0, height: H }, cp);
        const yb = box.y + box.h;
        CR.sv('line', { x1: box.x - 20, y1: yb, x2: box.x + box.w + 20, y2: yb, stroke: CR.rgba(ink, .3), 'stroke-width': 1.5 }, s);
        CR.sv('path', { d: pathOf(P) + ` L${P[P.length - 1][0].toFixed(1)},${yb} L${P[0][0].toFixed(1)},${yb} Z`, fill: 'url(#crdWash)', 'clip-path': 'url(#crdPenClip)' }, s);
        const path = CR.sv('path', { d: pathOf(P), fill: 'none', stroke: pal.accent, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
        path.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
        const a0 = at(.45), a1 = Math.min(D * .66, a0 + 2.4 * CR.ts);
        const pn = pen(path, a0, a1);
        const head = CR.sv('circle', { r: 7, fill: CR.mix(pal.accent, '#FFFFFF', .55) }, s); head.style.filter = CR.glowFilter(pal.glow, 30) || 'none';
        CR.on(t => { const q = pn.q(t), p = pn.at(q); head.setAttribute('cx', p.x); head.setAttribute('cy', p.y); head.style.opacity = q > 0 && q < 1 ? 1 : 0; cr.setAttribute('width', (p.x - box.x + 6).toFixed(1)); });
        const lab = (str, x, y, anchor, col, sz, t0, fam) => { const tx = CR.sv('text', { x, y, 'text-anchor': anchor, fill: col, 'font-family': fam || F.mono, 'font-size': sz, opacity: 0 }, s); tx.textContent = str;
          CR.on(t => tx.setAttribute('opacity', CR.sseg(t, t0, t0 + .4).toFixed(3))); return tx; };
        lab(ps[0].x, P[0][0], yb + 44, 'start', CR.rgba(ink, .55), 24, a0 - .2);
        lab(ps[ps.length - 1].x, P[P.length - 1][0], yb + 44, 'end', CR.rgba(ink, .55), 24, a1 - .3);
        lab(ps[0].yt, P[0][0], P[0][1] - 22, 'start', CR.rgba(ink, .7), 30, a0, F.head);
        const e = P[P.length - 1];
        const ev = CR.el('div', `position:absolute;left:${e[0] + 26}px;top:${e[1] - 40}px;font-family:${F.head};font-weight:${CR.FW.head};font-size:72px;line-height:1;${NUMCSS}white-space:nowrap;color:${pal.ink};text-shadow:${CR.glowText(72)}`, L, esc(ps[ps.length - 1].yt));
        CR.on(t => { const q = CR.sseg(t, a1 - .1, a1 + .5); ev.style.opacity = q.toFixed(3); ev.style.filter = q < 1 ? `blur(${(8 * (1 - q)).toFixed(2)}px)` : 'none'; });
        const mi = markIdx();
        if (mi >= 0) { const m = P[mi], ta = arrive(P, mi, a0, a1);
          const ml = CR.sv('line', { x1: m[0], y1: m[1] - 14, x2: m[0], y2: m[1] - 14, stroke: CR.rgba(ink, .6), 'stroke-width': 1.5 }, s);
          const dot = CR.sv('circle', { cx: m[0], cy: m[1], r: 9, fill: 'none', stroke: pal.ink, 'stroke-width': 2.5, opacity: 0 }, s);
          CR.on(t => { dot.setAttribute('opacity', CR.sseg(t, ta - .1, ta + .15).toFixed(3)); });
          const note = [ps[mi].x, S.note].filter(Boolean).join(' · '), nw = Math.min(600, measure(note, 'serif', 32) + 30);
          const [nx, ny] = freeSpot(P, noteSpots(m, nw, 44, box), nw, 44);
          const top = ny + 44 < m[1] ? ny + 52 : ny - 8; ml.setAttribute('y1', m[1] + (top < m[1] ? -14 : 14));
          CR.on(t => ml.setAttribute('y2', lerp(m[1] + (top < m[1] ? -14 : 14), top, CR.sseg(t, ta, ta + .5)).toFixed(1)));
          CR.text(L, note, { font: 'serif', italic: true, size: 32, x: nx, y: ny, width: nw, align: 'center', nowrap: true, color: pal.ink, anim: 'mask_wipe', t0: ta + .3 });
          CR.beat = ta; } else CR.beat = a1;
        source(L, { y: H - 92 });
        CR.focus = [box.x + box.w * .6, box.y + box.h / 2];
      } },
      exhibit: { build() {
        // charcoal (the museum): the series drawn by a pen in ink on a framed print under a warm spot, a light wash
        // under it, the first and the last figure; the moment that matters dotted in the accent with its note; the
        // title and unit on the wall label beside the frame
        const pw = 1000, ph = 600, pad = Math.round(ph * .11), bd = Math.max(10, Math.round(ph * .022));
        const ow = pw + 2 * pad + 2 * bd, oh = ph + 2 * pad + 2 * bd, label = !!(S.title || S.unit || srcText()), fx = label ? 150 : (W - ow) / 2, fy = (H - oh) / 2 - 6;
        const fr = museumFrame(fx, fy, pw, ph, 69), PR = fr.print, acc = pAcc();
        museumSpot(fx + ow / 2, fy + oh / 2, ow * 1.45, oh * 1.9); CR.halo(CR.L.back, fx + ow / 2, fy + oh / 2, ow, oh * .7);
        const box = { x: 74, y: 96, w: pw - 250, h: ph - 210 }, lf = lineFrame(box), Pt = lf.P, ps = lf.ps, yb = box.y + box.h;
        const s = CR.svg(PR); s.setAttribute('width', pw); s.setAttribute('height', ph); s.setAttribute('viewBox', `0 0 ${pw} ${ph}`);
        s.style.position = 'absolute'; s.style.left = '0px'; s.style.top = '0px'; s.style.overflow = 'visible';
        const d = CR.sv('defs', {}, s), cp = CR.sv('clipPath', { id: 'crdPenClipM' }, d), cr = CR.sv('rect', { x: box.x - 4, y: 0, width: 0, height: ph }, cp);
        CR.sv('line', { x1: box.x - 16, y1: yb, x2: box.x + box.w + 16, y2: yb, stroke: CR.rgba(PINK, .4), 'stroke-width': 1.5 }, s);
        CR.sv('path', { d: pathOf(Pt) + ` L${Pt[Pt.length - 1][0].toFixed(1)},${yb} L${Pt[0][0].toFixed(1)},${yb} Z`, fill: CR.rgba(PINK, .07), 'clip-path': 'url(#crdPenClipM)' }, s);
        const path = CR.sv('path', { d: pathOf(Pt), fill: 'none', stroke: PINK, 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
        const a0 = at(.45), a1 = Math.min(D * .66, a0 + 2.4 * CR.ts), pn = pen(path, a0, a1);
        CR.on(t => { const p = pn.at(pn.q(t)); cr.setAttribute('width', (p.x - box.x + 6).toFixed(1)); });
        xLabels(ps, 6).forEach(i => { const tx = CR.sv('text', { x: Pt[i][0], y: yb + 36, 'text-anchor': i === 0 ? 'start' : i === ps.length - 1 ? 'end' : 'middle', fill: CR.rgba(PINK, .55), 'font-family': F.mono, 'font-size': 20 }, s); tx.textContent = ps[i].x; });
        const v0 = CR.sv('text', { x: Pt[0][0], y: Pt[0][1] - 18, 'text-anchor': 'start', fill: CR.rgba(PINK, .75), 'font-family': F.head, 'font-size': 28, opacity: 0 }, s); v0.textContent = ps[0].yt;
        CR.on(t => v0.setAttribute('opacity', CR.sseg(t, a0, a0 + .4).toFixed(3)));
        const e = Pt[Pt.length - 1], et = String(ps[ps.length - 1].yt), esz = fitSize(et, 'head', pw - e[0] - 40, 56, 28);
        const ev = CR.el('div', `position:absolute;left:${e[0] + 18}px;top:${e[1] - esz * .62}px;font-family:${F.head};font-weight:${CR.FW.head};font-size:${esz}px;line-height:1;${NUMCSS}white-space:nowrap;color:${PINK}`, PR, esc(et));
        CR.on(t => { ev.style.opacity = CR.sseg(t, a1 - .1, a1 + .45).toFixed(3); });
        const mi = markIdx();
        if (mi >= 0) { const m = Pt[mi], ta = arrive(Pt, mi, a0, a1);
          const dot = CR.sv('circle', { cx: m[0], cy: m[1], r: 8, fill: acc, opacity: 0 }, s);
          const rg = CR.sv('circle', { cx: m[0], cy: m[1], r: 16, fill: 'none', stroke: acc, 'stroke-width': 2, opacity: 0 }, s);
          CR.on(t => { const q = CR.sseg(t, ta - .1, ta + .2); dot.setAttribute('opacity', q.toFixed(3)); rg.setAttribute('opacity', (q * .85).toFixed(3)); });
          const note = [ps[mi].x, S.note].filter(Boolean).join(' · '), nw = Math.min(520, measure(note, 'serif', 26) + 24);
          const [nx, ny] = freeSpot(Pt, noteSpots(m, nw, 36, box), nw, 36);
          const top2 = ny + 36 < m[1] ? ny + 42 : ny - 6, y1 = m[1] + (top2 < m[1] ? -18 : 18);
          const ml = CR.sv('line', { x1: m[0], y1, x2: m[0], y2: y1, stroke: CR.rgba(PINK, .55), 'stroke-width': 1.5 }, s);
          CR.on(t => ml.setAttribute('y2', lerp(y1, top2, CR.sseg(t, ta, ta + .45)).toFixed(1)));
          CR.text(PR, note, { font: 'serif', italic: true, size: 26, x: nx, y: ny, width: nw, align: 'center', nowrap: true, color: PINK, onLight: true, anim: 'mask_wipe', t0: ta + .3, glow: false });
          CR.beat = ta; } else CR.beat = a1;
        const lx = fx + ow + 80;
        if (label) wallLabel(lx, fy + oh / 2, W - M - lx, { name: S.title || S.unit, sub: S.title ? S.unit : '', t0: .2, max: 52 });
        CR.focus = [label ? fx + ow * .58 : W / 2, fy + oh / 2];
      } },
      plot: { build() {
        // navy: the briefing plot — a measured grid, the values in the mono face, the series drawn in the
        // accent with its points ticking on as the pen passes, the moment that matters called out in a box
        const L = CR.L.front, ink = pal.ink, line = CR.W === 'blueprint';
        chartHead(L, {});
        const box = { x: M + 140, y: 320, w: W - 2 * M - 220, h: 470 }, fr = lineFrame(box, { ticks: 4 }), P = fr.P, ps = fr.ps, sc = fr.sc, yb = box.y + box.h;
        const s = CR.svg(CR.L.mid);
        sc.ticks.forEach((v, k) => { const y = fr.Y(v);
          const gl = CR.sv('line', { x1: box.x, y1: y, x2: box.x, y2: y, stroke: CR.rgba(ink, k ? .14 : .45), 'stroke-width': k ? 1 : 1.5, 'stroke-dasharray': line && k ? '6 6' : 'none' }, s);
          const tx = CR.sv('text', { x: box.x - 24, y: y + 8, 'text-anchor': 'end', fill: CR.rgba(ink, .55), 'font-family': F.mono, 'font-size': 22, opacity: 0 }, s); tx.textContent = tickTxt(v, sc.step);
          const t0 = at(.1 + k * .05); CR.on(t => { const q = CR.sseg(t, t0, t0 + .7); gl.setAttribute('x2', (box.x + box.w * q).toFixed(1)); tx.setAttribute('opacity', q.toFixed(3)); }); });
        xLabels(ps, 8).forEach(i => { const tx = CR.sv('text', { x: P[i][0], y: yb + 42, 'text-anchor': 'middle', fill: CR.rgba(ink, .55), 'font-family': F.mono, 'font-size': 22 }, s); tx.textContent = ps[i].x;
          const tk = CR.sv('line', { x1: P[i][0], y1: yb, x2: P[i][0], y2: yb + 10, stroke: CR.rgba(ink, .45), 'stroke-width': 1.5 }, s); void tk; });
        const path = CR.sv('path', { d: pathOf(P), fill: 'none', stroke: line ? ink : pal.accent, 'stroke-width': line ? 3 : 4, 'stroke-linejoin': 'round' }, s);
        if (!line) path.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
        const a0 = at(.5), a1 = Math.min(D * .66, a0 + 2.4 * CR.ts);
        pen(path, a0, a1);
        if (ps.length <= 24) P.forEach((p, i) => { const c = CR.sv('circle', { cx: p[0], cy: p[1], r: line ? 5 : 5.5, fill: line ? pal.ground : pal.accent, stroke: line ? ink : 'none', 'stroke-width': 2, opacity: 0 }, s);
          const ta = arrive(P, i, a0, a1); CR.on(t => c.setAttribute('opacity', CR.sseg(t, ta - .05, ta + .12).toFixed(3))); });
        const mi = markIdx();
        if (mi >= 0) { const m = P[mi], ta = arrive(P, mi, a0, a1), bw = 420;
          const [bx, by] = freeSpot(P, [[m[0] + 60, m[1] - 200], [m[0] - 60 - bw, m[1] - 200], [m[0] - bw / 2, box.y - 40], [m[0] + 60, m[1] + 60], [m[0] - 60 - bw, m[1] + 60]]
            .map(([x, y]) => [clamp(x, box.x, box.x + box.w - bw), clamp(y, box.y - 50, yb - 130)]), bw, 120);
          const ex = bx > m[0] ? bx : bx + bw < m[0] ? bx + bw : m[0], ey = by > m[1] ? by : by + 120;
          const ld = CR.sv('path', { d: `M${m[0]},${m[1]} L${ex},${ey}`, fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, s);
          const lL = ld.getTotalLength(); ld.style.strokeDasharray = `${lL} ${lL}`;
          const ring = CR.sv('circle', { cx: m[0], cy: m[1], r: 14, fill: 'none', stroke: pal.accent, 'stroke-width': 2.5, opacity: 0 }, s);
          CR.on(t => { const q = CR.sseg(t, ta, ta + .45); ld.style.strokeDashoffset = (lL * (1 - q)).toFixed(1); ring.setAttribute('opacity', CR.sseg(t, ta - .05, ta + .2).toFixed(3)); });
          const card = line ? CR.el('div', `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:120px;border:2px solid ${pal.ink};background:${CR.rgba(pal.ground, .85)}`, L)
                            : CR.panel(L, { x: bx, y: by, w: bw, h: 120, r: 10 }).el;
          CR.enter(card, { kind: 'fade', t0: ta + .3, dur: .4 });
          CR.text(card, `${ps[mi].x}  ·  ${ps[mi].yt}`, { font: 'mono', size: 26, weight: 700, x: 22, y: 18, width: bw - 44, nowrap: true, color: pal.accent, anim: 'mask_wipe', t0: ta + .35 });
          if (S.note) CR.text(card, S.note, { font: 'body', size: 26, x: 22, y: 60, width: bw - 44, nowrap: true, color: ink, anim: 'mask_wipe', t0: ta + .45 });
          CR.beat = ta; } else CR.beat = a1;
        source(L, { y: H - 92 });
        CR.focus = [W / 2, box.y + box.h / 2];
      } },
      panel: { build() {
        // glass: a glass card; the readout top-left follows the pen (the figure of the point it is drawing), the series
        // as a lit line over a gradient wash, the years along the bottom
        const gx = M - 20, gy = 140, gw = W - 2 * M + 40, gh = 820, ink = pal.ink;
        const g = CR.glass(CR.L.mid, { x: gx, y: gy, w: gw, h: gh, r: 30 }); CR.enter(g.el, { kind: 'rise', t0: 0, dur: .7 });
        const L = CR.el('div', `position:absolute;left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px`, CR.L.front);
        if (S.title) CR.text(L, S.title, { font: 'body', size: 34, weight: 600, x: 80, y: 60, width: gw - 160, nowrap: true, color: ink, anim: 'mask_wipe', t0: at(.2) });
        const box = { x: 100, y: 300, w: gw - 200, h: 380 }, fr = lineFrame(box), P = fr.P, ps = fr.ps, yb = box.y + box.h;
        const s = CR.svg(L); s.setAttribute('width', gw); s.setAttribute('height', gh); s.setAttribute('viewBox', `0 0 ${gw} ${gh}`);
        const d = CR.sv('defs', {}, s), lg = CR.sv('linearGradient', { id: 'crdGW', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
        CR.sv('stop', { offset: '0', 'stop-color': pal.accent, 'stop-opacity': .38 }, lg); CR.sv('stop', { offset: '1', 'stop-color': pal.accent, 'stop-opacity': 0 }, lg);
        const cp = CR.sv('clipPath', { id: 'crdGC' }, d), cr = CR.sv('rect', { x: 0, y: 0, width: 0, height: gh }, cp);
        fr.sc.ticks.forEach((v, k) => { if (!k) return; CR.sv('line', { x1: box.x, y1: fr.Y(v), x2: box.x + box.w, y2: fr.Y(v), stroke: CR.rgba(ink, .07), 'stroke-width': 1 }, s); });
        CR.sv('path', { d: pathOf(P) + ` L${P[P.length - 1][0].toFixed(1)},${yb} L${P[0][0].toFixed(1)},${yb} Z`, fill: 'url(#crdGW)', 'clip-path': 'url(#crdGC)' }, s);
        const path = CR.sv('path', { d: pathOf(P), fill: 'none', stroke: CR.mix(pal.accent, '#FFFFFF', .2), 'stroke-width': 4, 'stroke-linejoin': 'round' }, s);
        path.style.filter = CR.glowFilter(pal.glow, 34) || 'none';
        const a0 = at(.45), a1 = Math.min(D * .66, a0 + 2.4 * CR.ts), pn = pen(path, a0, a1);
        const head = CR.sv('circle', { r: 8, fill: '#FFFFFF' }, s); head.style.filter = CR.glowFilter(pal.glow, 30) || 'none';
        xLabels(ps, 7).forEach(i => { const tx = CR.sv('text', { x: P[i][0], y: yb + 46, 'text-anchor': 'middle', fill: CR.rgba(ink, .5), 'font-family': F.body, 'font-size': 22 }, s); tx.textContent = ps[i].x; });
        const ro = CR.el('div', `position:absolute;left:80px;top:${S.title ? 112 : 70}px;font-family:${F.display};font-weight:${CR.FW.display};font-size:110px;line-height:1;${NUMCSS}white-space:nowrap;color:${ink}`, L, esc(ps[0].yt));
        const rx = CR.el('div', `position:absolute;left:84px;top:${(S.title ? 112 : 70) + 120}px;font-family:${F.body};font-size:26px;color:${pal.dim};white-space:nowrap`, L, esc(ps[0].x + (S.unit ? '  ·  ' + S.unit : '')));
        CR.on(t => { const q = pn.q(t), p = pn.at(q); head.setAttribute('cx', p.x); head.setAttribute('cy', p.y); head.style.opacity = q > 0 && q < 1 ? 1 : 0; cr.setAttribute('width', (p.x + 6).toFixed(1));
          let k = 0; for (let i = 0; i < P.length; i++) if (P[i][0] <= p.x + .5) k = i;
          if (q >= 1) k = P.length - 1;
          const s1 = ps[k].yt, s2 = ps[k].x + (S.unit ? '  ·  ' + S.unit : ''); if (ro.textContent !== s1) ro.textContent = s1; if (rx.textContent !== s2) rx.textContent = s2;
          ro.style.opacity = rx.style.opacity = CR.sseg(t, a0 - .3, a0).toFixed(3); });
        source(L, { x: 80, y: gh - 62, width: gw - 160, size: 20 });
        CR.beat = a1; CR.focus = [W / 2, gy + gh / 2];
      } },
      graph: { build() {
        // paper / concrete: graph paper laid on the desk — the series inked point to point, the axes typed, the
        // moment that matters ringed in red pencil with a typed note
        const sw = 1560, sh = 900, sx = (W - sw) / 2, sy = (H - sh) / 2, ink = pal.sink;
        const sheet = sheetOn(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, seed: 39, age: .4, rot: -.4, color: CR.mix(pal.paper, '#FFFFFF', .25) });
        const host = sheet.el, svg = CR.svg(host); svg.setAttribute('width', sw); svg.setAttribute('height', sh); svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`); greaseDefs(svg);
        const gc = '#5B86B8';
        for (let x = 60; x < sw - 40; x += 24) CR.sv('line', { x1: x, y1: 50, x2: x, y2: sh - 50, stroke: gc, 'stroke-width': (x - 60) % 120 ? .6 : 1.2, opacity: (x - 60) % 120 ? .22 : .38 }, svg);
        for (let y = 50; y < sh - 40; y += 24) CR.sv('line', { x1: 60, y1: y, x2: sw - 60, y2: y, stroke: gc, 'stroke-width': (y - 50) % 120 ? .6 : 1.2, opacity: (y - 50) % 120 ? .22 : .38 }, svg);
        let y = 74;
        if (S.title) { CR.text(host, String(S.title).toUpperCase(), { font: 'mono', size: 30, weight: 700, x: 120, y, width: sw - 240, nowrap: true, color: ink, onLight: true, anim: 'typewriter', t0: at(.35), cps: 34 }); y += 44; }
        if (S.unit) CR.text(host, S.unit, { font: 'mono', size: 24, x: 120, y, width: sw - 240, color: CR.mix(ink, pal.paper, .4), onLight: true, anim: 'typewriter', caret: NOC, t0: at(.6), cps: 40 });
        const box = { x: 240, y: 230, w: sw - 400, h: 480 }, fr = lineFrame(box), P = fr.P, ps = fr.ps, yb = box.y + box.h;
        CR.sv('path', { d: `M${box.x},${box.y - 20} L${box.x},${yb} L${box.x + box.w + 30},${yb}`, fill: 'none', stroke: ink, 'stroke-width': 2.5 }, svg);
        fr.sc.ticks.forEach(v => { const tx = CR.sv('text', { x: box.x - 18, y: fr.Y(v) + 8, 'text-anchor': 'end', fill: ink, 'font-family': F.mono, 'font-size': 22 }, svg); tx.textContent = tickTxt(v, fr.sc.step);
          CR.sv('line', { x1: box.x - 8, y1: fr.Y(v), x2: box.x, y2: fr.Y(v), stroke: ink, 'stroke-width': 2 }, svg); });
        xLabels(ps, 8).forEach(i => { const tx = CR.sv('text', { x: P[i][0], y: yb + 40, 'text-anchor': 'middle', fill: ink, 'font-family': F.mono, 'font-size': 22 }, svg); tx.textContent = ps[i].x; });
        const path = CR.sv('path', { d: pathOf(P), fill: 'none', stroke: '#26231F', 'stroke-width': 3.2, 'stroke-linejoin': 'round', opacity: .9 }, svg);
        path.style.filter = 'url(#crdGrease)';
        const a0 = tb(.9, .4), a1 = Math.min(D * .66, a0 + 2.2 * CR.ts); pen(path, a0, a1);
        if (ps.length <= 30) P.forEach((p, i) => { const c = CR.sv('circle', { cx: p[0], cy: p[1], r: 5, fill: pal.paper, stroke: '#26231F', 'stroke-width': 2.2, opacity: 0 }, svg);
          const ta = arrive(P, i, a0, a1); CR.on(t => c.setAttribute('opacity', CR.sseg(t, ta - .05, ta + .1).toFixed(3))); });
        const mi = markIdx();
        if (mi >= 0) { const m = P[mi], ta = arrive(P, mi, a0, a1) + .15;
          pencil(svg, ringPath(m[0], m[1], 34, 26, 83), { w: 4.5, grease: true, t0: ta, dur: .45 });
          const note = [ps[mi].x + ': ' + ps[mi].yt, S.note].filter(Boolean).join(' — ');
          const [nx, ny] = freeSpot(P, [[m[0] + 50, m[1] - 130], [m[0] - 570, m[1] - 130], [m[0] + 50, m[1] + 50], [m[0] - 570, m[1] + 50], [m[0] - 260, box.y - 50]]
            .map(([x, y]) => [clamp(x, box.x + 10, sw - 600), clamp(y, 140, box.y + box.h - 70)]), 520, 64);
          pencil(svg, `M${nx + 4},${ny + 46} Q${(nx + m[0]) / 2},${ny + 40} ${m[0] + 26},${m[1] - 22}`, { w: 3, grease: true, t0: ta + .35, dur: .3 });
          CR.text(host, note, { font: 'mono', size: 24, x: nx, y: ny, width: 520, lh: 1.2, color: pal.accent, onLight: true, anim: 'typewriter', t0: ta + .5, cps: 40 });
          CR.beat = ta; } else CR.beat = a1;
        const s = srcText(); if (s) CR.text(host, s, { font: 'mono', size: 22, x: 120, y: sh - 92, width: sw - 240, align: 'right', color: CR.mix(ink, pal.paper, .4), onLight: true, anim: 'none', t0: tb(1.3, .7) });
        CR.focus = [W / 2, sy + sh / 2];
      } },
      press: { build() {
        // newsprint: the paper's fever chart — heavy rule, bold head, deck, dotted gridlines with the
        // values at the right edge, the series in black ink over a grey tint, the moment that matters in red
        const L = CR.L.front, ink = pal.sink, x0 = M + 40, rw = W - 2 * M - 80, light = CR.W === 'light_table';
        if (!light) CR.rule(L, { x: x0, y: 112, w: rw, h: 7, color: ink, glow: false, t0: at(.05), dur: .6 });
        let y = 138;
        if (S.title) { const tsz = fitSize(S.title, 'head', rw, 60, 40, 0, Math.max(CR.FW.head, 700));
          CR.text(L, S.title, { font: 'head', size: tsz, weight: Math.max(CR.FW.head, 700), x: x0, y, width: rw, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.15), glow: false }); y += tsz * 1.2; }
        if (S.unit) { CR.text(L, S.unit, { font: 'serif', italic: true, size: 30, x: x0, y, width: rw, color: CR.mix(ink, pal.ground, .3), onLight: true, anim: 'mask_wipe', t0: at(.25), glow: false }); y += 46; }
        const box = { x: x0, y: Math.max(y + 40, 330), w: rw - 140, h: 0 }; box.h = 840 - box.y;
        const fr = lineFrame(box), P = fr.P, ps = fr.ps, yb = box.y + box.h, s = CR.svg(CR.L.mid);
        fr.sc.ticks.forEach((v, k) => { const yy = fr.Y(v);
          CR.sv('line', { x1: box.x, y1: yy, x2: box.x + box.w + 20, y2: yy, stroke: CR.rgba(ink, k ? .5 : .9), 'stroke-width': k ? 1.2 : 2.5, 'stroke-dasharray': k ? '2 5' : 'none' }, s);
          const tx = CR.sv('text', { x: box.x + box.w + 136, y: yy + 9, 'text-anchor': 'end', fill: ink, 'font-family': F.body, 'font-weight': 600, 'font-size': 24 }, s); tx.textContent = tickTxt(v, fr.sc.step); });
        xLabels(ps, 8).forEach(i => { const tx = CR.sv('text', { x: P[i][0], y: yb + 40, 'text-anchor': 'middle', fill: ink, 'font-family': F.body, 'font-weight': 600, 'font-size': 24 }, s); tx.textContent = ps[i].x; });
        const d = CR.sv('defs', {}, s), cp = CR.sv('clipPath', { id: 'crdPC' }, d), cr = CR.sv('rect', { x: box.x - 4, y: 0, width: 0, height: H }, cp);
        CR.sv('path', { d: pathOf(P) + ` L${P[P.length - 1][0].toFixed(1)},${yb} L${P[0][0].toFixed(1)},${yb} Z`, fill: CR.rgba(ink, .1), 'clip-path': 'url(#crdPC)' }, s);
        const path = CR.sv('path', { d: pathOf(P), fill: 'none', stroke: ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, s);
        const a0 = at(.45), a1 = Math.min(D * .66, a0 + 2.3 * CR.ts), pn = pen(path, a0, a1);
        CR.on(t => { const p = pn.at(pn.q(t)); cr.setAttribute('width', (p.x - box.x + 6).toFixed(1)); });
        const mi = markIdx();
        if (mi >= 0) { const m = P[mi], ta = arrive(P, mi, a0, a1);
          const dot = CR.sv('circle', { cx: m[0], cy: m[1], r: 10, fill: pal.accent, opacity: 0 }, s);
          const ml = CR.sv('line', { x1: m[0], y1: m[1] - 16, x2: m[0], y2: m[1] - 16, stroke: ink, 'stroke-width': 1.5 }, s);
          CR.on(t => { dot.setAttribute('opacity', CR.sseg(t, ta - .05, ta + .15).toFixed(3)); const y1 = +ml.getAttribute('y1'), top = ml._top == null ? y1 : ml._top; ml.setAttribute('y2', lerp(y1, top, CR.sseg(t, ta, ta + .4)).toFixed(1)); });
          const note = [ps[mi].x + ' — ' + ps[mi].yt, S.note].filter(Boolean).join(': ');
          const nw = Math.min(640, measure(note, 'body', 26, 700) + 30), [nx, ny] = freeSpot(P, noteSpots(m, nw, 40, box), nw, 40);
          CR.text(L, note, { font: 'body', size: 26, weight: 700, x: nx, y: ny, width: nw, align: 'center', nowrap: true, color: pal.accent, onLight: true, anim: 'mask_wipe', t0: ta + .25, glow: false });
          const top = ny + 40 < m[1] ? ny + 46 : ny - 6; ml.setAttribute('y1', m[1] + (top < m[1] ? -16 : 16)); ml._top = top;
          CR.beat = ta; } else CR.beat = a1;
        source(L, { x: x0, y: yb + 72, width: rw, font: 'serif', upper: false, size: 26, ls: 0, paper: true, color: CR.mix(ink, pal.ground, .3) });
        CR.focus = [W / 2, box.y + box.h / 2];
      } },
      drafted: { build() {
        // blueprint: the series as a drawing plate — the sheet's double border, the axes ruled with their ticks, the
        // values lettered in mono, the series drawn point to point in one ink line with each reading circled, the
        // moment that matters called out with a numbered balloon and its note; title, unit and source in the title
        // block in the corner (no glow: linework)
        const L = CR.L.front, ink = pal.ink, s = CR.svg(CR.L.mid);
        bpLine(s, 52, 44, W - 52, 44, { w: 3, t0: 0, dur: .7, a: .7 }); bpLine(s, 52, H - 44, W - 52, H - 44, { w: 3, t0: .05, dur: .7, a: .7 });
        bpLine(s, 52, 44, 52, H - 44, { w: 3, t0: 0, dur: .7, a: .7 }); bpLine(s, W - 52, 44, W - 52, H - 44, { w: 3, t0: .05, dur: .7, a: .7 });
        bpLine(s, 66, 58, W - 66, 58, { w: 1, t0: .1, dur: .7, a: .45 }); bpLine(s, 66, H - 58, W - 66, H - 58, { w: 1, t0: .15, dur: .7, a: .45 });
        bpLine(s, 66, 58, 66, H - 58, { w: 1, t0: .1, dur: .7, a: .45 }); bpLine(s, W - 66, 58, W - 66, H - 58, { w: 1, t0: .15, dur: .7, a: .45 });
        const blk = bpBlock([[CR.t('title'), S.title, 30], [tw('unit'), S.unit], [tw('source'), String(S.source || '')]], { w: 720, rh: 70, x: W - 66 - 720, y: null, t0: at(.15) });
        const yb0 = blk ? blk.y - 92 : H - 170;
        const box = { x: M + 150, y: 150, w: W - 2 * M - 230, h: yb0 - 150 }, fr = lineFrame(box, { ticks: 4 }), P = fr.P, ps = fr.ps, sc = fr.sc, yb = box.y + box.h;
        bpLine(s, box.x, box.y - 30, box.x, yb, { w: 2, t0: at(.2), dur: .6 }); bpLine(s, box.x, yb, box.x + box.w + 30, yb, { w: 2, t0: at(.25), dur: .7 });
        sc.ticks.forEach((v, k) => { const y = fr.Y(v), t0 = at(.3 + k * .05);
          if (k) bpLine(s, box.x, y, box.x + box.w, y, { w: 1, t0, dur: .7, a: .2, dash: '4 8' });
          bpLine(s, box.x - 14, y, box.x, y, { w: 2, t0, dur: .2 });
          const tx = CR.sv('text', { x: box.x - 26, y: y + 8, 'text-anchor': 'end', fill: CR.rgba(ink, .7), 'font-family': F.mono, 'font-size': 22, opacity: 0 }, s); tx.textContent = tickTxt(v, sc.step);
          CR.on(t => tx.setAttribute('opacity', CR.sseg(t, t0, t0 + .4).toFixed(3))); });
        xLabels(ps, 8).forEach(i => { bpLine(s, P[i][0], yb, P[i][0], yb + 14, { w: 2, t0: at(.35), dur: .2 });
          const tx = CR.sv('text', { x: P[i][0], y: yb + 44, 'text-anchor': 'middle', fill: CR.rgba(ink, .7), 'font-family': F.mono, 'font-size': 22 }, s); tx.textContent = ps[i].x; });
        const path = CR.sv('path', { d: pathOf(P), fill: 'none', stroke: ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, s);
        const a0 = at(.55), a1 = Math.min(D * .66, a0 + 2.3 * CR.ts); pen(path, a0, a1);
        if (ps.length <= 30) P.forEach((p, i) => { const c = CR.sv('circle', { cx: p[0], cy: p[1], r: 6, fill: pal.ground, stroke: ink, 'stroke-width': 2, opacity: 0 }, s);
          const ta = arrive(P, i, a0, a1); CR.on(t => c.setAttribute('opacity', CR.sseg(t, ta - .05, ta + .1).toFixed(3))); });
        const mi = markIdx();
        if (mi >= 0) { const m = P[mi], ta = arrive(P, mi, a0, a1), note = [ps[mi].x + ': ' + ps[mi].yt, S.note].filter(Boolean).join(' — ');
          const nw = Math.min(620, measure(note, 'mono', 26) + 20), bw = 64 + 22 + nw, bh = 64;
          const [bx, by] = freeSpot(P, noteSpots(m, bw, bh, box), bw, bh);
          const r = CR.sv('circle', { cx: m[0], cy: m[1], r: 14, fill: 'none', stroke: pal.accent, 'stroke-width': 3, opacity: 0 }, s);
          CR.on(t => r.setAttribute('opacity', CR.sseg(t, ta - .05, ta + .15).toFixed(3)));
          const ex = bx + 32, ey = by + 32, ang = Math.atan2(ey - m[1], ex - m[0]);
          bpLine(s, m[0] + Math.cos(ang) * 16, m[1] + Math.sin(ang) * 16, ex - Math.cos(ang) * 32, ey - Math.sin(ang) * 32, { w: 2, color: pal.accent, t0: ta + .1, dur: .35 });
          bpBalloon(s, L, ex, ey, 30, 1, { color: pal.accent, t0: ta + .3 });
          CR.text(L, note, { font: 'mono', size: 26, x: bx + 86, y: by + 16, width: nw, nowrap: true, color: pal.accent, anim: 'typewriter', caret: NOC, t0: ta + .5, cps: 40, glow: false });
          CR.beat = ta; } else CR.beat = a1;
        CR.focus = [box.x + box.w / 2, box.y + box.h / 2];
      } },
      acetate: { build() {
        // light table: an acetate transparency on the lit table — a faint cool film with bright cut edges and a
        // registration mark at each corner; the axes and values printed on it in thin dark ink, the series drawn
        // across it in black grease pencil, the moment that matters ringed in red grease pencil with a typed note
        const ink = pal.sink, fw = 1600, fh = 860, fx = (W - fw) / 2, fy = (H - fh) / 2 + 6;
        const film = CR.el('div', `position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border-radius:6px;` +
          'background:linear-gradient(135deg, rgba(255,255,255,.42) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 70%, rgba(255,255,255,.22) 100%), rgba(200,222,242,.20);' +
          'box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.95), 0 0 0 1px rgba(60,80,100,.22), 12px 16px 26px rgba(40,52,64,.16)', CR.L.mid);
        CR.enter(film, { kind: 'land', t0: 0, rot: -.6, dur: .55 });
        const s = CR.svg(film); s.setAttribute('width', fw); s.setAttribute('height', fh); s.setAttribute('viewBox', `0 0 ${fw} ${fh}`); greaseDefs(s);
        [[44, 44], [fw - 44, 44], [44, fh - 44], [fw - 44, fh - 44]].forEach(([x, y]) => { CR.sv('circle', { cx: x, cy: y, r: 13, fill: 'none', stroke: CR.rgba(ink, .55), 'stroke-width': 1.5 }, s);
          CR.sv('line', { x1: x - 22, y1: y, x2: x + 22, y2: y, stroke: CR.rgba(ink, .55), 'stroke-width': 1.5 }, s); CR.sv('line', { x1: x, y1: y - 22, x2: x, y2: y + 22, stroke: CR.rgba(ink, .55), 'stroke-width': 1.5 }, s); });
        let y = 74;
        if (S.title) { CR.text(film, String(S.title).toUpperCase(), { font: 'mono', size: 30, weight: 700, ls: .06, x: 110, y, width: fw - 220, nowrap: true, color: ink, onLight: true, anim: 'typewriter', t0: at(.3), cps: 34 }); y += 46; }
        if (S.unit) CR.text(film, S.unit, { font: 'mono', size: 24, x: 110, y, width: fw - 220, color: CR.mix(ink, pal.ground, .4), onLight: true, anim: 'typewriter', caret: NOC, t0: at(.55), cps: 40 });
        const box = { x: 230, y: 220, w: fw - 380, h: fh - 360 }, fr = lineFrame(box), P = fr.P, ps = fr.ps, yb = box.y + box.h;
        CR.sv('path', { d: `M${box.x},${box.y - 20} L${box.x},${yb} L${box.x + box.w + 30},${yb}`, fill: 'none', stroke: CR.rgba(ink, .7), 'stroke-width': 1.5 }, s);
        fr.sc.ticks.forEach((v, k) => { const yy = fr.Y(v);
          if (k) CR.sv('line', { x1: box.x, y1: yy, x2: box.x + box.w, y2: yy, stroke: CR.rgba(ink, .14), 'stroke-width': 1 }, s);
          const tx = CR.sv('text', { x: box.x - 18, y: yy + 8, 'text-anchor': 'end', fill: CR.rgba(ink, .75), 'font-family': F.mono, 'font-size': 22 }, s); tx.textContent = tickTxt(v, fr.sc.step); });
        xLabels(ps, 8).forEach(i => { const tx = CR.sv('text', { x: P[i][0], y: yb + 40, 'text-anchor': 'middle', fill: CR.rgba(ink, .75), 'font-family': F.mono, 'font-size': 22 }, s); tx.textContent = ps[i].x; });
        const path = CR.sv('path', { d: pathOf(P), fill: 'none', stroke: '#1E1C1A', 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: .92 }, s);
        path.style.filter = 'url(#crdGrease)';
        const a0 = tb(.8, .4), a1 = Math.min(D * .66, a0 + 2.2 * CR.ts); pen(path, a0, a1);
        const mi = markIdx();
        if (mi >= 0) { const m = P[mi], ta = arrive(P, mi, a0, a1) + .15;
          pencil(s, ringPath(m[0], m[1], 40, 32, 171), { w: 6, grease: true, t0: ta, dur: .45 });
          const note = [ps[mi].x + ': ' + ps[mi].yt, S.note].filter(Boolean).join(' — '), nw = Math.min(600, measure(note, 'mono', 26) + 20);
          const [nx, ny] = freeSpot(P, noteSpots(m, nw, 40, box).map(([x, y]) => [clamp(x, 110, fw - 110 - nw), clamp(y, 150, fh - 120)]), nw, 40);
          CR.text(film, note, { font: 'mono', size: 26, weight: 700, x: nx, y: ny, width: nw, nowrap: true, color: pal.accent, onLight: true, anim: 'typewriter', t0: ta + .4, cps: 40 });
          CR.beat = ta; } else CR.beat = a1;
        const sr = srcText(); if (sr) CR.text(film, sr, { font: 'mono', size: 22, x: 110, y: fh - 90, width: fw - 220, align: 'right', color: CR.mix(ink, pal.ground, .4), onLight: true, anim: 'none', t0: tb(1.3, .7) });
        CR.focus = [W / 2, fy + fh / 2];
      } },
    },
  });

  // ══ COMPARE TABLE ═══════════════════════════════════════════════════════════════════════════════════════════
  const tRows = () => (Array.isArray(S.rows) ? S.rows : []).filter(r => r && Array.isArray(r.cells)).slice(0, 6);
  const tCols = () => (Array.isArray(S.columns) ? S.columns : []).map(String).slice(0, 4);
  const hc = () => (typeof S.hcol === 'number' ? S.hcol : -1), hr = () => (typeof S.hrow === 'number' ? S.hrow : -1);
  const cellTxt = c => String((c && c.t) || '');
  const tableSizes = (cols, rows, lw, cw, role, big, small, lrole) => {
    const vs = Math.min(big, ...rows.flatMap(r => r.cells.map(c => fitSize(cellTxt(c), role, cw - 24, big, small))));
    const ls = Math.min(Math.round(big * .9), ...rows.map(r => fitSize(String(r.label || ''), lrole || 'serif', lw - 24, Math.round(big * .9), small)));
    return { vs, ls };
  };
  CR.scene('compare_table', {
    s: 6.0,
    layout: { void_black: 'grid', navy_falloff: 'matrix', charcoal_light: 'grid', glass_dark: 'cards', paper_desk: 'typed', newsprint: 'boxscore',
              blueprint: 'spec', concrete: 'typed', light_table: 'slides', footage_sharp: 'matrix', footage_moving: 'matrix' },
    comps: {
      grid: { build() {
        // void / charcoal / footage: a quiet table set like a credit roll — tracked heads, serif names, hairlines that
        // draw across, the column that matters in the accent
        if (CR.foot) { CR.footLook(8, .3, .7); veil(CR.L.back, 'all'); }
        const L = CR.L.front, cols = tCols(), rows = tRows(), nc = Math.max(1, cols.length), ink = pal.ink;
        const tw2 = Math.min(1560, 560 + nc * 330), x0 = (W - tw2) / 2, lw = tw2 - nc * Math.min(330, (tw2 - 420) / nc), cw = (tw2 - lw) / nc;
        const rowH = Math.min(104, 520 / Math.max(1, rows.length)), { vs, ls } = tableSizes(cols, rows, lw, cw, 'head', 46, 26);
        let y = 200;
        if (S.title) { CR.label(L, S.title, { x: x0, y: y - 60, size: 28, ls: .28, t0: at(.1), color: pal.accent, width: tw2, nowrap: true }); }
        cols.forEach((c, j) => { const x = x0 + lw + j * cw, hi = hc() === j;
          CR.text(L, c, { font: 'cond', size: 26, ls: .16, upper: true, x: x + 8, y: y + 40, width: cw - 16, align: 'center', nowrap: true, color: hi ? pal.accent : pal.dim, anim: 'mask_wipe', t0: at(.2 + j * .08), glow: false });
          if (hi) CR.rule(L, { x: x + cw / 2 - 40, y: y + 18, w: 80, h: 3, color: pal.accent, from: 'center', t0: at(.3), dur: .5 }); });
        if (S.label_head) CR.text(L, S.label_head, { font: 'cond', size: 26, ls: .16, upper: true, x: x0, y: y + 40, width: lw - 20, nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: at(.2), glow: false });
        y += 96;
        CR.rule(L, { x: x0, y, w: tw2, h: 1.5, color: CR.rgba(ink, .5), glow: false, t0: at(.25), dur: .8 });
        rows.forEach((r, i) => { const ry = y + i * rowH, t0 = at(.4 + i * .16), hiR = hr() === i;
          CR.text(L, r.label || '', { font: 'serif', size: ls, x: x0, y: ry + (rowH - ls * 1.1) / 2, width: lw - 24, nowrap: true, color: hiR || hr() < 0 ? ink : pal.dim, anim: 'mask_wipe', t0, glow: false });
          r.cells.slice(0, nc).forEach((c, j) => { const hi = hc() === j || (hiR && hc() < 0);
            CR.text(L, cellTxt(c), { font: 'head', size: vs, x: x0 + lw + j * cw + 8, y: ry + (rowH - vs * 1.1) / 2, width: cw - 16, align: 'center', nowrap: true, color: hi ? pal.accent : (hr() >= 0 && !hiR ? pal.dim : ink), anim: 'mask_wipe', t0: t0 + .06 * (j + 1), glow: hi }).el.style.fontVariantNumeric = 'lining-nums tabular-nums'; });
          CR.rule(L, { x: x0, y: ry + rowH, w: tw2, h: 1, color: CR.rgba(ink, .14), glow: false, t0: t0 + .1, dur: .7 }); });
        source(L, { x: x0, width: tw2, y: y + rows.length * rowH + 36 });
        CR.beat = at(.4 + Math.max(0, hr()) * .16) + .4; CR.focus = [W / 2, y + rows.length * rowH / 2];
      } },
      matrix: { build() {
        // navy / footage: the briefing matrix — mono heads over an accent rule, the rows slide in, the column that
        // matters boxed by a drawn frame
        if (CR.foot) { CR.footLook(8, .28, .7); veil(CR.L.back, 'all'); }   // footage: the still darkened under the chart
        const L = CR.L.front, cols = tCols(), rows = tRows(), nc = Math.max(1, cols.length), ink = pal.ink, line = CR.W === 'blueprint';
        chartHead(L, {});
        const x0 = M, tw2 = W - 2 * M, lw = Math.min(620, tw2 * .4), cw = (tw2 - lw) / nc, y0 = 300;
        const rowH = Math.min(100, 500 / Math.max(1, rows.length)), { vs, ls } = tableSizes(cols, rows, lw, cw, 'cond', 44, 24, 'body');
        cols.forEach((c, j) => CR.text(L, c, { font: 'mono', size: 24, upper: true, ls: .06, x: x0 + lw + j * cw + 20, y: y0, width: cw - 40, nowrap: true, color: hc() === j ? pal.accent : pal.dim, anim: 'typewriter', caret: NOC, t0: at(.2 + j * .1), cps: 34, glow: false }));
        CR.rule(L, { x: x0, y: y0 + 46, w: tw2, h: 2, color: pal.accent, t0: at(.25), dur: .8 });
        const s = CR.svg(CR.L.mid);
        rows.forEach((r, i) => { const ry = y0 + 60 + i * rowH, t0 = at(.45 + i * .14), hiR = hr() === i;
          const rowEl = CR.el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, L);
          CR.enter(rowEl, { kind: 'slide', dx: -40, t0, dur: .5 });
          if (hiR) { const band = CR.el('div', `position:absolute;left:${x0 - 16}px;top:${ry + 6}px;width:${tw2 + 32}px;height:${rowH - 12}px;background:${CR.rgba(pal.accent, .12)};border-left:3px solid ${pal.accent}`, rowEl); void band; }
          CR.text(rowEl, r.label || '', { font: 'body', size: ls, x: x0, y: ry + (rowH - ls * 1.2) / 2, width: lw - 20, nowrap: true, color: ink, anim: 'none', t0, glow: false });
          r.cells.slice(0, nc).forEach((c, j) => CR.text(rowEl, cellTxt(c), { font: 'cond', size: vs, weight: 600, x: x0 + lw + j * cw + 20, y: ry + (rowH - vs * 1.15) / 2, width: cw - 40, nowrap: true, color: hc() === j ? pal.accent : ink, anim: 'none', t0, glow: hc() === j }).el.style.fontVariantNumeric = 'lining-nums tabular-nums');
          CR.sv('line', { x1: x0, y1: ry + rowH, x2: x0 + tw2, y2: ry + rowH, stroke: CR.rgba(ink, .16), 'stroke-width': 1, 'stroke-dasharray': '4 6' }, s); });
        if (hc() >= 0) { const bx = x0 + lw + hc() * cw + 4, by = y0 - 22, bw = cw - 8, bh = 60 + rows.length * rowH + 30;
          const fr = CR.sv('rect', { x: bx, y: by, width: bw, height: bh, fill: 'none', stroke: pal.accent, 'stroke-width': line ? 2.5 : 2, rx: line ? 0 : 6 }, s);
          if (!line) fr.style.filter = CR.glowFilter(pal.accent, 26) || 'none';
          const P = 2 * (bw + bh); fr.style.strokeDasharray = `${P} ${P}`; const t0 = at(.5 + rows.length * .14);
          CR.on(t => { fr.style.strokeDashoffset = (P * (1 - CR.sseg(t, t0, t0 + .8))).toFixed(1); }); CR.beat = t0; }
        else CR.beat = at(.5);
        source(L, { y: H - 92 });
        CR.focus = [W / 2, y0 + rows.length * rowH / 2];
      } },
      cards: { build() {
        // glass: one frosted card per column, side by side — the column's name on top, each row as a small label and
        // its figure; the card that matters lit along its top edge
        const cols = tCols(), rows = tRows(), nc = Math.max(1, cols.length), gap = 40, cw = Math.min(520, (W - 2 * M - gap * (nc - 1)) / nc);
        const rowH = Math.min(118, 560 / Math.max(1, rows.length)), ch = 150 + rows.length * rowH + 40, tw2 = nc * cw + (nc - 1) * gap, x0 = (W - tw2) / 2, y0 = (H - ch) / 2 + (S.title ? 30 : 0);
        if (S.title) CR.label(CR.L.front, S.title, { x: x0, y: y0 - 64, size: 26, ls: .26, t0: at(.1), color: pal.accent, width: tw2, nowrap: true });
        const vs = Math.min(52, ...rows.flatMap(r => r.cells.map(c => fitSize(cellTxt(c), 'display', cw - 80, 52, 26))));
        cols.forEach((c, j) => { const x = x0 + j * (cw + gap), hi = hc() === j, t0 = at(.2 + j * .15);
          const g = CR.glass(CR.L.mid, { x, y: y0, w: cw, h: ch, r: 26 }); CR.enter(g.el, { kind: 'rise', t0, dur: .7 });
          if (hi) { const edge = CR.el('div', `position:absolute;left:0;right:0;top:0;height:4px;background:${pal.accent}`, g.el); edge.style.boxShadow = `0 0 24px ${CR.rgba(pal.glow, .7)}`; }
          const host = CR.el('div', `position:absolute;left:${x}px;top:${y0}px;width:${cw}px;height:${ch}px`, CR.L.front);
          CR.enter(host, { kind: 'rise', t0, dur: .7 });
          CR.text(host, c, { font: 'body', size: 34, weight: 600, x: 40, y: 48, width: cw - 80, nowrap: true, color: hi ? pal.ink : CR.mix(pal.ink, pal.dim, .3), anim: 'mask_wipe', t0: t0 + .2 });
          CR.el('div', `position:absolute;left:40px;top:112px;width:${cw - 80}px;height:1px;background:${CR.rgba(pal.ink, .14)}`, host);
          rows.forEach((r, i) => { const ry = 132 + i * rowH, hiR = hr() === i;
            CR.text(host, r.label || '', { font: 'body', size: 21, upper: true, ls: .08, x: 40, y: ry, width: cw - 80, nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: t0 + .3 + i * .1, glow: false });
            CR.text(host, cellTxt(r.cells[j]), { font: 'display', size: vs, x: 40, y: ry + 30, width: cw - 80, nowrap: true, color: hi || hiR ? (hi ? pal.accent : pal.ink) : CR.mix(pal.ink, pal.dim, .2), anim: 'mask_wipe', t0: t0 + .35 + i * .1, glow: hi }).el.style.fontVariantNumeric = 'lining-nums tabular-nums'; });
        });
        source(CR.L.front, { x: x0, width: tw2, y: y0 + ch + 34 });
        CR.beat = at(.2 + Math.max(0, hc()) * .15) + .5; CR.focus = [W / 2, y0 + ch / 2];
      } },
      typed: { build() {
        // paper / concrete: the table typed on a sheet — heads typed in capitals and underlined, the cells typed row by
        // row, the column that matters ringed in red pencil
        const cols = tCols(), rows = tRows(), nc = Math.max(1, cols.length), sw = 1560, rowH = Math.min(84, 470 / Math.max(1, rows.length));
        const sh = 250 + rows.length * rowH + 110, sx = (W - sw) / 2, sy = (H - sh) / 2, ink = pal.sink, dk = CR.mix(ink, pal.paper, .4);
        const sheet = sheetOn(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, seed: 41, age: .5, rot: .5 });
        const host = sheet.el, X = 100, lw = Math.min(560, (sw - 2 * X) * .4), cw = (sw - 2 * X - lw) / nc;
        let y = 76;
        if (S.title) { CR.text(host, String(S.title).toUpperCase(), { font: 'mono', size: 32, weight: 700, ls: .04, x: X, y, width: sw - 2 * X, color: ink, onLight: true, anim: 'typewriter', t0: at(.35), cps: 34 }); y += 70; }
        const vs = Math.min(32, ...rows.flatMap(r => r.cells.map(c => fitSize(cellTxt(c), 'mono', cw - 20, 32, 20))));
        let t = at(.6);
        cols.forEach((c, j) => { CR.text(host, String(c).toUpperCase(), { font: 'mono', size: 26, weight: 700, x: X + lw + j * cw, y, width: cw - 20, nowrap: true, color: ink, onLight: true, anim: 'typewriter', caret: NOC, t0: t, cps: 40 }); t += String(c).length / 40 + .05; });
        y += 40; CR.el('div', `position:absolute;left:${X}px;top:${y}px;width:${sw - 2 * X}px;height:2px;background:${CR.rgba(ink, .6)}`, host); y += 22;
        t = Math.min(t, tb(1.0, .5));
        const span = Math.max(.6, Math.min(D * .55, 2.4) - t + at(.2));
        const per = span / Math.max(1, rows.length);
        rows.forEach((r, i) => { const ry = y + i * rowH, t0 = t + i * per;
          CR.text(host, r.label || '', { font: 'mono', size: vs, weight: 700, x: X, y: ry + (rowH - vs * 1.2) / 2, width: lw - 20, nowrap: true, color: CR.mix(ink, pal.paper, .12), onLight: true, anim: 'typewriter', caret: NOC, t0, cps: 60 });
          r.cells.slice(0, nc).forEach((c, j) => CR.text(host, cellTxt(c), { font: 'mono', size: vs, weight: hc() === j ? 700 : 400, x: X + lw + j * cw, y: ry + (rowH - vs * 1.2) / 2, width: cw - 20, nowrap: true, color: ink, onLight: true, anim: 'typewriter', caret: NOC, t0: t0 + .1 * (j + 1), cps: 60 }));
          if (i < rows.length - 1) CR.el('div', `position:absolute;left:${X}px;top:${ry + rowH}px;width:${sw - 2 * X}px;height:1px;background:${CR.rgba('#5B86B8', .35)}`, host); });
        const svg = CR.svg(host); svg.setAttribute('width', sw); svg.setAttribute('height', sh); svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`); greaseDefs(svg);
        const tEnd = t + rows.length * per + .2;
        if (hc() >= 0) { const bx = X + lw + hc() * cw - 22, by = y - 84, bw2 = Math.min(cw + 4, sw - X - (X + lw + hc() * cw) + 40), bh2 = rows.length * rowH + 96;
          pencil(svg, boxPath(bx, by, bw2, bh2, 91), { w: 4.2, grease: true, t0: Math.min(tEnd, D - .8), dur: .7 }); }
        else if (hr() >= 0) { const ry = y + hr() * rowH + rowH / 2; pencil(svg, wobLine(X - 10, ry + vs * .7, sw - X, 93), { w: 4.5, grease: true, t0: Math.min(tEnd, D - .8), dur: .45 }); }
        const s = srcText(); if (s) CR.text(host, s, { font: 'mono', size: 22, x: X, y: sh - 66, width: sw - 2 * X, align: 'right', color: dk, onLight: true, anim: 'none', t0: tb(1.3, .7) });
        CR.beat = Math.min(tEnd, D - .8); CR.focus = [W / 2, sy + sh / 2];
      } },
      boxscore: { build() {
        // newsprint: the paper's box score — a black head bar with the column names in white capitals,
        // the rows between thin rules, the column that matters set bold in the paper's red
        const L = CR.L.front, cols = tCols(), rows = tRows(), nc = Math.max(1, cols.length), ink = pal.sink, tw2 = Math.min(1560, 700 + nc * 280), x0 = (W - tw2) / 2;
        const lw = tw2 - nc * Math.min(280, (tw2 - 460) / nc), cw = (tw2 - lw) / nc, rowH = Math.min(88, 480 / Math.max(1, rows.length));
        const { vs, ls } = tableSizes(cols, rows, lw, cw, 'cond', 40, 22, 'body');
        let y = 190;
        if (S.title) { const tsz = fitSize(S.title, 'head', tw2, 56, 36, 0, Math.max(CR.FW.head, 700)); CR.text(L, S.title, { font: 'head', size: tsz, weight: Math.max(CR.FW.head, 700), x: x0, y: y - tsz * 1.3, width: tw2, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.1), glow: false }); }
        const bar = CR.el('div', `position:absolute;left:${x0}px;top:${y}px;width:${tw2}px;height:64px;background:${ink}`, L); CR.enter(bar, { kind: 'fade', t0: at(.15), dur: .4 });
        if (S.label_head) CR.text(bar, S.label_head, { font: 'cond', size: 26, weight: 600, upper: true, ls: .12, x: 24, y: 16, width: lw - 40, nowrap: true, color: pal.ground, onLight: false, glow: false, anim: 'mask_wipe', t0: at(.25) });
        cols.forEach((c, j) => CR.text(bar, c, { font: 'cond', size: 26, weight: 600, upper: true, ls: .12, x: lw + j * cw + 10, y: 16, width: cw - 20, align: 'right', nowrap: true, color: hc() === j ? CR.mix(pal.accent, '#FFFFFF', .35) : pal.ground, onLight: false, glow: false, anim: 'mask_wipe', t0: at(.25 + j * .06) }));
        y += 64;
        rows.forEach((r, i) => { const ry = y + i * rowH, t0 = at(.4 + i * .13), hiR = hr() === i;
          if (hiR) CR.el('div', `position:absolute;left:${x0}px;top:${ry}px;width:${tw2}px;height:${rowH}px;background:${CR.rgba(pal.accent, .1)}`, L);
          CR.text(L, r.label || '', { font: 'body', size: ls, weight: 600, x: x0 + 24, y: ry + (rowH - ls * 1.2) / 2, width: lw - 40, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0, glow: false });
          r.cells.slice(0, nc).forEach((c, j) => CR.text(L, cellTxt(c), { font: 'cond', size: vs, weight: hc() === j || hiR ? 700 : 500, x: x0 + lw + j * cw + 10, y: ry + (rowH - vs * 1.2) / 2, width: cw - 20, align: 'right', nowrap: true, color: hc() === j ? pal.accent : ink, onLight: true, anim: 'mask_wipe', t0: t0 + .05 * (j + 1), glow: false }).el.style.fontVariantNumeric = 'lining-nums tabular-nums');
          CR.el('div', `position:absolute;left:${x0}px;top:${ry + rowH - 1}px;width:${tw2}px;height:${i === rows.length - 1 ? 3 : 1}px;background:${CR.rgba(ink, i === rows.length - 1 ? .9 : .3)}`, L); });
        source(L, { x: x0, width: tw2, y: y + rows.length * rowH + 22, font: 'serif', upper: false, size: 26, ls: 0, paper: true, color: CR.mix(ink, pal.ground, .3) });
        CR.beat = at(.4 + Math.max(0, hr()) * .13) + .4; CR.focus = [W / 2, y + rows.length * rowH / 2];
      } },
      spec: { build() {
        // blueprint: the drawing's spec table — a heavy ruled frame, the title lettered across its top row, the column
        // heads in the condensed hand over a hatched band, the rows ruled as they are drawn, values in mono, the column
        // that matters hatched in the accent and framed; the source in the table's foot row
        const L = CR.L.front, cols = tCols(), rows = tRows(), nc = Math.max(1, cols.length), ink = pal.ink, s = CR.svg(CR.L.mid);
        const tw2 = W - 2 * M, x0 = M, lw = Math.min(560, tw2 * .34), cw = (tw2 - lw) / nc, th = S.title ? 84 : 0, hh = 66, rowH = Math.min(92, 520 / Math.max(1, rows.length)), fh = srcText() ? 56 : 0;
        const tbh = th + hh + rows.length * rowH + fh, y0 = Math.round((H - tbh) / 2);
        const { vs, ls } = tableSizes(cols, rows, lw, cw, 'mono', 36, 20, 'mono');
        const t0 = at(.1);
        bpLine(s, x0, y0, x0 + tw2, y0, { w: 3, t0, dur: .6 }); bpLine(s, x0, y0 + tbh, x0 + tw2, y0 + tbh, { w: 3, t0: t0 + .05, dur: .6 });
        bpLine(s, x0, y0, x0, y0 + tbh, { w: 3, t0, dur: .6 }); bpLine(s, x0 + tw2, y0, x0 + tw2, y0 + tbh, { w: 3, t0: t0 + .05, dur: .6 });
        if (th) { bpLine(s, x0, y0 + th, x0 + tw2, y0 + th, { w: 2, t0: t0 + .1 });
          CR.text(L, String(S.title).toUpperCase(), { font: 'cond', size: fitSize(String(S.title).toUpperCase(), 'cond', tw2 - 60, 44, 28, .04, 600), weight: 600, ls: .04, x: x0 + 30, y: y0 + 18, width: tw2 - 60, nowrap: true, color: ink, anim: 'mask_wipe', t0: at(.2), glow: false }); }
        const hy = y0 + th, hc_ = hc();
        const band = CR.sv('rect', { x: x0, y: hy, width: tw2, height: hh, fill: bpHatch(s, 'crdSpecH', CR.rgba(ink, .14), 9, 2), opacity: 0 }, s);
        CR.on(t => band.setAttribute('opacity', CR.sseg(t, at(.25), at(.25) + .4).toFixed(3)));
        bpLine(s, x0, hy + hh, x0 + tw2, hy + hh, { w: 2, t0: at(.2) });
        if (S.label_head) CR.text(L, S.label_head, { font: 'cond', size: 26, weight: 600, upper: true, ls: .1, x: x0 + 26, y: hy + 18, width: lw - 40, nowrap: true, color: ink, anim: 'mask_wipe', t0: at(.3), glow: false });
        cols.forEach((c, j) => { const x = x0 + lw + j * cw;
          bpLine(s, x, hy, x, y0 + tbh - fh, { w: 1.5, t0: at(.2 + j * .05), dur: .7, a: .7 });
          CR.text(L, c, { font: 'cond', size: 28, weight: 600, upper: true, ls: .08, x: x + 20, y: hy + 17, width: cw - 40, align: 'center', nowrap: true, color: hc_ === j ? pal.accent : ink, anim: 'mask_wipe', t0: at(.3 + j * .06), glow: false }); });
        if (hc_ >= 0) { const x = x0 + lw + hc_ * cw, hy2 = hy + hh, hh2 = rows.length * rowH;
          const hr_ = CR.sv('rect', { x: x + 3, y: hy2 + 3, width: cw - 6, height: hh2 - 6, fill: bpHatch(s, 'crdSpecA', CR.rgba(pal.accent, .22), 12, 2.5), opacity: 0 }, s);
          const fr = CR.sv('rect', { x: x + 1, y: hy - 1, width: cw - 2, height: hh + hh2 + 2, fill: 'none', stroke: pal.accent, 'stroke-width': 3 }, s);
          const Pm = 2 * (cw + hh + hh2); fr.style.strokeDasharray = `${Pm} ${Pm}`;
          const ta = at(.5 + rows.length * .14); CR.on(t => { hr_.setAttribute('opacity', CR.sseg(t, ta, ta + .4).toFixed(3)); fr.style.strokeDashoffset = (Pm * (1 - CR.sseg(t, ta, ta + .7))).toFixed(1); }); CR.beat = ta; }
        else CR.beat = at(.5);
        rows.forEach((r, i) => { const ry = hy + hh + i * rowH, t1 = at(.45 + i * .14), hiR = hr() === i;
          if (i) bpLine(s, x0, ry, x0 + tw2, ry, { w: 1, t0: t1 - .1, dur: .6, a: .45 });
          CR.text(L, String(r.label || '').toUpperCase(), { font: 'mono', size: Math.min(ls, 26), weight: 700, ls: .04, x: x0 + 26, y: ry + (rowH - Math.min(ls, 26) * 1.2) / 2, width: lw - 44, nowrap: true, color: hiR ? pal.accent : ink, anim: 'typewriter', caret: NOC, t0: t1, cps: 50, glow: false });
          r.cells.slice(0, nc).forEach((c, j) => CR.text(L, cellTxt(c), { font: 'mono', size: vs, weight: hc_ === j ? 700 : 400, x: x0 + lw + j * cw + 16, y: ry + (rowH - vs * 1.2) / 2, width: cw - 32, align: 'center', nowrap: true, color: hc_ === j ? pal.accent : ink, anim: 'typewriter', caret: NOC, t0: t1 + .08 * (j + 1), cps: 50, glow: false })); });
        if (fh) { const fy = y0 + tbh - fh; bpLine(s, x0, fy, x0 + tw2, fy, { w: 2, t0: at(.3) });
          CR.text(L, srcText(), { font: 'mono', size: 20, ls: .1, upper: true, x: x0 + 26, y: fy + 17, width: tw2 - 52, nowrap: true, color: pal.dim, anim: 'none', t0: tb(1.0, .7), glow: false }); }
        CR.focus = [W / 2, y0 + tbh / 2];
      } },
      slides: { build() {
        // light table: one 35 mm slide mount per column laid on the light — the column's name printed on the mount's
        // edge, its window lit with the rows (each measure small, its value set large); the mount that matters ringed
        // in red grease pencil; the title typed above
        const cols = tCols(), rows = tRows(), nc = Math.max(1, cols.length), ink = pal.sink, gap = 44;
        const mw = Math.min(440, (W - 2 * M - gap * (nc - 1)) / nc), wwin = mw - 2 * Math.round(mw * .1), rowH = Math.max(58, Math.min(76, 380 / Math.max(1, rows.length)));
        const mt = Math.round(mw * .19), mb = Math.round(mw * .12), mh = Math.max(mw, mt + mb + rows.length * rowH + 40);
        const tw2 = nc * mw + (nc - 1) * gap, x0 = (W - tw2) / 2, y0 = Math.round((H - mh) / 2) + 26;
        if (S.title) CR.text(CR.L.front, String(S.title).toUpperCase(), { font: 'mono', size: 30, weight: 700, ls: .08, x: x0, y: y0 - 84, width: tw2, nowrap: true, color: ink, onLight: true, anim: 'typewriter', t0: at(.15), cps: 34 });
        const vs = Math.min(40, ...rows.flatMap(r => r.cells.map(c => fitSize(cellTxt(c), 'head', wwin - 36, 40, 20))));
        const s = ltSvg(), hcol = hc(); let tEnd = at(.5);
        cols.forEach((c, j) => { const x = x0 + j * (mw + gap), t0 = at(.2 + j * .16), rot = [-1.2, .8, -.5, 1.1][j % 4];
          const mt0 = ltMount(CR.L.mid, x, y0, mw, mh, { seed: 53 + j, mt, mb }); CR.enter(mt0.el, { kind: 'land', t0, rot, dur: .55 });
          CR.text(mt0.el, String(c).toUpperCase(), { font: 'mono', size: 22, weight: 700, ls: .12, x: 0, y: Math.round(mt * .38), width: mw, align: 'center', nowrap: true, color: CR.mix(pal.sink, MOUNT, hcol === j ? 0 : .3), onLight: true, anim: 'none', t0: 0 });
          rows.forEach((r, i) => { const ry = 22 + i * rowH, hiR = hr() === i;
            CR.text(mt0.win, String(r.label || '').toUpperCase(), { font: 'cond', size: 17, weight: 600, ls: .12, x: 18, y: ry, width: wwin - 36, nowrap: true, color: CR.mix(ink, '#FFFFFF', .45), onLight: true, anim: 'none', t0: 0, glow: false });
            CR.text(mt0.win, cellTxt(r.cells[j]), { font: 'head', size: vs, x: 18, y: ry + 20, width: wwin - 36, nowrap: true, color: hiR && hcol < 0 ? pal.accent : ink, onLight: true, anim: 'mask_wipe', t0: t0 + .35 + i * .08, glow: false }).el.style.fontVariantNumeric = 'lining-nums tabular-nums'; });
          tEnd = Math.max(tEnd, t0 + .35 + rows.length * .08 + .4);
          if (hcol === j) ltRing(s, x + mw / 2, y0 + mh / 2, mw * .62, mh * .6, 151, Math.min(D - .8, tEnd + .1), .6); });
        source(CR.L.front, { align: 'center', paper: true, font: 'mono', upper: false, size: 22, y: y0 + mh + 46 });
        CR.beat = Math.min(D - .8, tEnd + .1); CR.focus = [W / 2, y0 + mh / 2];
      } },
    },
  });

  // ══ VERSUS — two sides face to face ════════════════════════════════════════════════════════════════════════
  const side = k => (S[k] && typeof S[k] === 'object') ? S[k] : { name: String(S[k] || '') };
  const vStats = () => (Array.isArray(S.stats) ? S.stats : []).filter(s => s && (s.l || s.r)).slice(0, 4);
  const winOf = (st, k) => st.win === k;
  const statBars = (st) => typeof st.lv === 'number' && typeof st.rv === 'number' && st.lv >= 0 && st.rv >= 0 && (st.lv + st.rv) > 0;
  CR.scene('versus', {
    s: 5.5,
    layout: { void_black: 'split', navy_falloff: 'duel', charcoal_light: 'split', glass_dark: 'cards', paper_desk: 'files', newsprint: 'tale',
              blueprint: 'elevation', concrete: 'stencil', light_table: 'slides', footage_sharp: 'duel', footage_moving: 'duel' },
    comps: {
      split: { build() {
        // void / charcoal / footage: the frame split by one hairline — each side centred in its half (its real photo
        // above when there is one), the figures facing each other across the line, the stronger one in the accent
        if (CR.foot) { CR.footLook(8, .3, .7); veil(CR.L.back, 'all'); }
        const L = CR.L.front, a = side('left'), b = side('right'), sts = vStats(), ink = pal.ink, cx = [W / 2 - 440, W / 2 + 440];
        const photos = !!(a.photo || b.photo);
        if (S.title) CR.label(L, S.title, { x: 0, y: 96, width: W, align: 'center', size: 26, ls: .3, t0: at(.1), color: pal.accent, nowrap: true });
        const hl = CR.el('div', `position:absolute;left:${W / 2 - 1}px;top:170px;width:1.5px;height:760px;background:${CR.rgba(ink, .35)};transform-origin:50% 50%;transform:scaleY(0)`, L);
        CR.on(t => { hl.style.transform = `scaleY(${CR.sseg(t, at(.1), at(.1) + .9).toFixed(4)})`; });
        let ny = photos ? 640 : 250;
        [a, b].forEach((s_, k) => {
          const t0 = at(.25 + k * .15);
          if (photos && s_.photo) { const ph = CR.photo(CR.L.mid, s_.photo, { x: cx[k] - 190, y: 160, w: 380, h: 440, frame: CR.W === 'charcoal_light' ? 'museum' : 'none', focus: [.5, .35] }); CR.enter(ph.el, { kind: 'fade', t0, dur: .8 }); }
          const nsz = fitSize(CR.up(s_.name || ''), 'head', 740, photos ? 72 : 96, 44);
          CR.text(L, s_.name || '', hero({ font: 'head', size: nsz, upper: CR.case === 'upper', x: cx[k] - 380, y: ny, width: 760, align: 'center', lh: 1.02, t0 }));
          if (s_.sub) CR.text(L, s_.sub, { font: 'cond', size: 26, ls: .16, upper: true, x: cx[k] - 380, y: ny + nsz * 1.16 + 8, width: 760, align: 'center', nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: t0 + .2, glow: false });
        });
        const vs = CR.el('div', `position:absolute;left:${W / 2 - 44}px;top:${ny + 6}px;width:88px;height:64px;background:${CR.foot ? 'transparent' : pal.ground};display:flex;align-items:center;justify-content:center;font-family:${F.serif};font-style:italic;font-size:42px;color:${pal.accent}`, L, esc(tw('vs')));
        CR.enter(vs, { kind: 'fade', t0: at(.4), dur: .5 });
        const rowH = photos ? 92 : 124, y0 = photos ? 800 : 500, vsz = photos ? 52 : 70;
        sts.slice(0, photos ? 2 : 4).forEach((st, i) => { const ry = y0 + i * rowH, t0 = tb(.7 + i * .2);
          const lab = CR.el('div', `position:absolute;left:${W / 2 - 200}px;top:${ry - 34}px;width:400px;text-align:center`, L);
          CR.text(lab, st.label || '', { font: 'cond', size: 22, ls: .16, upper: true, x: 0, y: 0, width: 400, align: 'center', nowrap: true, color: pal.dim, anim: 'mask_wipe', t0, glow: false });
          ['l', 'r'].forEach((k, j) => { const w = winOf(st, k);
            CR.text(L, String(st[k] || ''), { font: 'head', size: vsz, x: cx[j] - 380, y: ry, width: 760, align: 'center', nowrap: true, color: w ? pal.accent : ink, anim: 'mask_wipe', t0: t0 + .1 * j, glow: w }).el.style.fontVariantNumeric = 'lining-nums tabular-nums'; }); });
        source(L, { align: 'center', x: M, width: W - 2 * M });
        CR.beat = tb(.7); CR.focus = [W / 2, H / 2];
      } },
      duel: { build() {
        // navy / footage: two names at the far edges, one axis down the middle, each figure a bar growing outward
        // from it — the longer side in the accent
        if (CR.foot) { CR.footLook(8, .28, .7); veil(CR.L.back, 'all'); }   // footage: the still darkened under the chart
        const L = CR.L.front, a = side('left'), b = side('right'), sts = vStats(), ink = pal.ink, line = CR.W === 'blueprint', cxm = W / 2;
        if (S.title) CR.label(L, S.title, { x: 0, y: 108, width: W, align: 'center', size: 26, ls: .3, t0: at(.1), color: pal.accent, nowrap: true });
        const pics = !!(a.photo || b.photo), pw2 = 190, ph2 = 230, nw = pics ? 540 : 760;
        [[a, pics ? M + pw2 + 36 : M, 'left'], [b, pics ? W - M - pw2 - 36 - nw : W - M - nw, 'right']].forEach(([s_, x, al], k) => { const t0 = at(.2 + k * .12);
          if (pics && s_.photo) { const ph = CR.photo(CR.L.mid, s_.photo, { x: k ? W - M - pw2 : M, y: 120, w: pw2, h: ph2, frame: 'keyline', treat: line ? 'cyan' : 'duo', focus: [.5, .3] }); CR.enter(ph.el, { kind: 'fade', t0, dur: .7 }); }
          const nsz = fitSize(CR.up(s_.name || ''), 'head', nw, 84, 40);
          CR.text(L, s_.name || '', hero({ font: 'head', size: nsz, upper: CR.case === 'upper', x, y: 170, width: nw, align: al, lh: 1, t0 }));
          if (s_.sub) CR.text(L, s_.sub, { font: 'mono', size: 22, upper: true, ls: .08, x, y: 170 + nsz * 1.1 + 10, width: nw, align: al, nowrap: true, color: pal.dim, anim: 'typewriter', caret: NOC, t0: t0 + .25, cps: 36, glow: false }); });
        const y0 = 380, rowH = Math.min(150, 480 / Math.max(1, sts.length)), s = CR.svg(CR.L.mid), half = cxm - M - 170;
        const ax = CR.sv('line', { x1: cxm, y1: y0 - 30, x2: cxm, y2: y0 - 30, stroke: CR.rgba(ink, .5), 'stroke-width': 1.5 }, s);
        const yEnd = y0 + sts.length * rowH; CR.on(t => ax.setAttribute('y2', lerp(y0 - 30, yEnd, CR.sseg(t, at(.15), at(.15) + .8)).toFixed(1)));
        if (line) { const d = CR.sv('defs', {}, s), p = CR.sv('pattern', { id: 'crdHV', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d); CR.sv('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: CR.rgba(ink, .7), 'stroke-width': 2 }, p);
          const p2 = CR.sv('pattern', { id: 'crdHVA', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d); CR.sv('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: pal.accent, 'stroke-width': 3 }, p2); }
        sts.forEach((st, i) => { const yc = y0 + rowH * (i + .5), t0 = tb(.55 + i * .2), du = Math.min(.9, D * .2);
          CR.text(L, st.label || '', { font: 'mono', size: 22, upper: true, ls: .08, x: cxm - 400, y: yc - rowH * .5 + 6, width: 800, align: 'center', nowrap: true, color: pal.dim, anim: 'mask_wipe', t0, glow: false });
          const mx = statBars(st) ? Math.max(st.lv, st.rv) : 0, th = Math.min(30, rowH * .24);
          [['l', -1], ['r', 1]].forEach(([k, dir]) => { const w = winOf(st, k), v = st[k + 'v'], len = mx ? Math.max(3, half * v / mx) : 0;
            if (len) { const r = CR.sv('rect', { x: cxm, y: yc - th / 2 + 8, width: 0, height: th, fill: line ? `url(#${w ? 'crdHVA' : 'crdHV'})` : (w ? pal.accent : CR.rgba(ink, .3)), stroke: line ? (w ? pal.accent : ink) : 'none', 'stroke-width': line ? 2 : 0 }, s);
              if (w && !line) r.style.filter = CR.glowFilter(pal.accent, 28) || 'none';
              CR.on(t => { const q = CR.sseg(t, t0, t0 + du), ww = len * q; r.setAttribute('width', ww.toFixed(1)); r.setAttribute('x', (dir < 0 ? cxm - 4 - ww : cxm + 4).toFixed(1)); }); }
            const vx = dir < 0 ? cxm - 4 - len - 20 - 360 : cxm + 4 + len + 20;
            CR.text(L, String(st[k] || ''), { font: 'mono', size: 34, weight: 700, x: vx, y: yc - 12, width: 360, align: dir < 0 ? 'right' : 'left', nowrap: true, color: w ? pal.accent : ink, anim: 'mask_wipe', t0: t0 + du * .7, glow: w }); }); });
        source(L, { align: 'center', x: M, width: W - 2 * M });
        CR.beat = tb(.55); CR.focus = [W / 2, H / 2];
      } },
      cards: { build() {
        // glass: two glass profile cards facing each other (the real photo on top when there is one), each figure on
        // its own card, a small "vs." between them
        const a = side('left'), b = side('right'), sts = vStats(), cw = 660, photos = !!(a.photo || b.photo), ph = photos ? 300 : 0;
        const ch = 120 + ph + 130 + sts.length * 110 + 40, y0 = (H - ch) / 2 + (S.title ? 26 : 0), xs = [W / 2 - 60 - cw, W / 2 + 60];
        if (S.title) CR.label(CR.L.front, S.title, { x: 0, y: y0 - 66, width: W, align: 'center', size: 24, ls: .26, t0: at(.1), color: pal.accent, nowrap: true });
        [a, b].forEach((s_, k) => { const x = xs[k], t0 = at(.15 + k * .15);
          const g = CR.glass(CR.L.mid, { x, y: y0, w: cw, h: ch, r: 28 }); CR.enter(g.el, { kind: 'rise', t0, dur: .7 });
          const host = CR.el('div', `position:absolute;left:${x}px;top:${y0}px;width:${cw}px;height:${ch}px`, CR.L.front); CR.enter(host, { kind: 'rise', t0, dur: .7 });
          let y = 44;
          if (photos) { if (s_.photo) { const p = CR.photo(host, s_.photo, { x: 44, y, w: cw - 88, h: ph, frame: 'card', treat: 'clean', focus: [.5, .32] }); CR.enter(p.el, { kind: 'fade', t0: t0 + .2, dur: .7 }); } y += ph + 30; }
          const nsz = fitSize(s_.name || '', 'display', cw - 88, 58, 34);
          CR.text(host, s_.name || '', { font: 'display', size: nsz, x: 44, y, width: cw - 88, nowrap: true, color: pal.ink, anim: 'mask_wipe', t0: t0 + .25 }); y += nsz * 1.15;
          if (s_.sub) CR.text(host, s_.sub, { font: 'body', size: 26, x: 44, y, width: cw - 88, nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: t0 + .3, glow: false });
          y += 56; CR.el('div', `position:absolute;left:44px;top:${y}px;width:${cw - 88}px;height:1px;background:${CR.rgba(pal.ink, .14)}`, host); y += 24;
          sts.forEach((st, i) => { const kk = k ? 'r' : 'l', w = winOf(st, kk), ry = y + i * 110;
            CR.text(host, st.label || '', { font: 'body', size: 20, upper: true, ls: .08, x: 44, y: ry, width: cw - 88, nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: tb(.6 + i * .15), glow: false });
            CR.text(host, String(st[kk] || ''), { font: 'display', size: 50, x: 44, y: ry + 30, width: cw - 88, nowrap: true, color: w ? pal.accent : pal.ink, anim: 'mask_wipe', t0: tb(.7 + i * .15), glow: w }).el.style.fontVariantNumeric = 'lining-nums tabular-nums'; });
        });
        const vs = CR.el('div', `position:absolute;left:${W / 2 - 50}px;top:${y0 + ch / 2 - 30}px;width:100px;text-align:center;font-family:${F.serif};font-style:italic;font-size:40px;color:${pal.dim}`, CR.L.front, esc(tw('vs')));
        CR.enter(vs, { kind: 'fade', t0: at(.45), dur: .5 });
        source(CR.L.front, { align: 'center', x: M, width: W - 2 * M, y: Math.min(H - 70, y0 + ch + 30) });
        CR.beat = tb(.6); CR.focus = [W / 2, y0 + ch / 2];
      } },
      files: { build() {
        // paper / concrete: two personal file cards side by side — each typed, its real print clipped on when there is
        // one, the stronger figure ringed in red pencil
        const a = side('left'), b = side('right'), sts = vStats(), sw = 780, photos = !!(a.photo || b.photo);
        const sh = 180 + (photos ? 300 : 0) + 120 + sts.length * 74 + 90, sy = (H - sh) / 2 + 10, xs = [W / 2 - sw - 30, W / 2 + 30], ink = pal.sink, dk = CR.mix(ink, pal.paper, .4);
        [a, b].forEach((s_, k) => { const x = xs[k], rot = k ? 1.1 : -1.3;
          const card = sheetOn(CR.L.mid, { x, y: sy + (k ? 18 : 0), w: sw, h: sh, seed: 43 + k, age: .55, rot });
          const host = card.el, X = 70; let y = 64;
          CR.text(host, CR.t('file').toUpperCase(), { font: 'mono', size: 22, weight: 700, ls: .12, x: X, y, width: sw - 2 * X, color: dk, onLight: true, anim: 'none', t0: 0 });
          y += 44; CR.el('div', `position:absolute;left:${X}px;top:${y}px;width:${sw - 2 * X}px;height:2px;background:${CR.rgba(ink, .55)}`, host); y += 28;
          if (photos) { if (s_.photo) { const p = CR.photo(host, s_.photo, { x: sw - X - 250, y: y - 10, w: 230, h: 290, frame: 'print', treat: 'print', seed: 47 + k, focus: [.5, .32] });
              CR.enter(p.el, { kind: 'land', t0: at(.3 + k * .15), rot: k ? -2 : 2, dur: .45 }); CR.clip(host, sw - X - 90, y - 46, 6); } }
          const nsz = fitSize(String(s_.name || '').toUpperCase(), 'mono', photos ? sw - 2 * X - 280 : sw - 2 * X, 46, 28, 0, 700);
          const t0 = at(.45 + k * .3);
          CR.text(host, String(s_.name || '').toUpperCase(), { font: 'mono', size: nsz, weight: 700, x: X, y, width: photos ? sw - 2 * X - 280 : sw - 2 * X, lh: 1.15, color: ink, onLight: true, anim: 'typewriter', t0, cps: 30 });
          if (s_.sub) CR.text(host, s_.sub, { font: 'mono', size: 26, x: X, y: y + nsz * 1.25 + 8, width: photos ? sw - 2 * X - 280 : sw - 2 * X, color: dk, onLight: true, anim: 'typewriter', caret: NOC, t0: t0 + .4, cps: 40 });
          y += (photos ? 320 : 130);
          const svg = CR.svg(host); svg.setAttribute('width', sw); svg.setAttribute('height', sh); svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`); greaseDefs(svg);
          sts.forEach((st, i) => { const kk = k ? 'r' : 'l', ry = y + i * 74, ti = tb(.9 + i * .25 + k * .1, .6);
            CR.text(host, String(st.label || '').toUpperCase(), { font: 'mono', size: 24, x: X, y: ry, width: sw - 2 * X - 220, nowrap: true, color: dk, onLight: true, anim: 'typewriter', caret: NOC, t0: ti, cps: 50 });
            const v = String(st[kk] || ''), vw = measure(v, 'mono', 32, 700);
            CR.text(host, v, { font: 'mono', size: 32, weight: 700, x: sw - X - 200, y: ry - 4, width: 200, align: 'right', nowrap: true, color: ink, onLight: true, anim: 'typewriter', caret: NOC, t0: ti + .2, cps: 30 });
            CR.el('div', `position:absolute;left:${X}px;top:${ry + 44}px;width:${sw - 2 * X}px;height:1px;background:${CR.rgba(ink, .16)}`, host);
            if (winOf(st, kk)) pencil(svg, ringPath(sw - X - vw / 2, ry + 14, vw / 2 + 26, 30, 101 + i), { w: 4, grease: true, t0: Math.min(D - .7, ti + .8), dur: .45 }); });
          const s = srcText(); if (s && k === 1) CR.text(host, s, { font: 'mono', size: 20, x: X, y: sh - 58, width: sw - 2 * X, align: 'right', color: dk, onLight: true, anim: 'none', t0: tb(1.2, .7) });
        });
        CR.beat = tb(.9, .6); CR.focus = [W / 2, sy + sh / 2];
      } },
      tale: { build() {
        // newsprint: the tale of the tape — heavy rules, the two names over their own columns (their
        // halftone photos above them), the measures named down the middle column, each side's figure under its own
        // name, the stronger one in bold red
        const L = CR.L.front, a = side('left'), b = side('right'), ink = pal.sink, photos = !!(a.photo || b.photo), x0 = M + 40, rw = W - 2 * M - 80;
        const sts = vStats().slice(0, photos ? 2 : 4);
        if (CR.W === 'newsprint') { CR.rule(L, { x: x0, y: 96, w: rw, h: 7, color: ink, glow: false, t0: at(.05), dur: .6, from: 'center' }); CR.rule(L, { x: x0, y: 110, w: rw, h: 2, color: ink, glow: false, t0: at(.1), dur: .6, from: 'center' }); }
        if (S.title) CR.text(L, S.title, { font: 'cond', size: 30, weight: 600, upper: true, ls: .24, x: x0, y: 132, width: rw, align: 'center', nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.15), glow: false });
        const colW = 560, cx = [x0 + colW / 2, x0 + rw - colW / 2], ny = photos ? 610 : 250, mw = rw - 2 * colW;
        [a, b].forEach((s_, k) => { const t0 = at(.25 + k * .15);
          if (photos && s_.photo) { const p = CR.photo(CR.L.mid, s_.photo, { x: cx[k] - 170, y: 186, w: 340, h: 400, frame: 'none', treat: CR.W === 'newsprint' ? 'halftone' : 'mono', focus: [.5, .32] }); CR.enter(p.el, { kind: 'fade', t0, dur: .8 }); }
          const nsz = fitSize(s_.name || '', 'head', colW - 20, 66, 36, 0, Math.max(CR.FW.head, 700));
          CR.text(L, s_.name || '', { font: 'head', size: nsz, weight: Math.max(CR.FW.head, 700), x: cx[k] - colW / 2, y: ny, width: colW, align: 'center', nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0, glow: false });
          if (s_.sub) CR.text(L, s_.sub, { font: 'serif', italic: true, size: 28, x: cx[k] - colW / 2, y: ny + nsz * 1.2 + 4, width: colW, align: 'center', nowrap: true, color: CR.mix(ink, pal.ground, .3), onLight: true, anim: 'mask_wipe', t0: t0 + .15, glow: false }); });
        const y0 = photos ? 780 : 470, rowH = photos ? 90 : 116, vsz = photos ? 46 : 58;
        if (sts.length) [x0 + colW, x0 + rw - colW].forEach(x => { const v = CR.el('div', `position:absolute;left:${x}px;top:${y0 - 18}px;width:1px;height:${sts.length * rowH}px;background:${CR.rgba(ink, .35)};transform-origin:50% 0;transform:scaleY(0)`, L);
          CR.on(t => { v.style.transform = `scaleY(${CR.sseg(t, tb(.5), tb(.5) + .6).toFixed(4)})`; }); });
        sts.forEach((st, i) => { const ry = y0 + i * rowH, t0 = tb(.6 + i * .2);
          CR.text(L, st.label || '', { font: 'cond', size: 24, weight: 600, upper: true, ls: .12, x: x0 + colW + 16, y: ry + (rowH - 30) / 2 - 8, width: mw - 32, align: 'center', lh: 1.1, color: CR.mix(ink, pal.ground, .25), onLight: true, anim: 'mask_wipe', t0, glow: false });
          ['l', 'r'].forEach((k, j) => { const w = winOf(st, k);
            CR.text(L, String(st[k] || ''), { font: 'head', size: vsz, weight: w ? Math.max(CR.FW.head, 800) : Math.max(CR.FW.head, 600), x: cx[j] - colW / 2, y: ry + (rowH - vsz * 1.15) / 2 - 8, width: colW, align: 'center', nowrap: true, color: w ? pal.accent : ink, onLight: true, anim: 'mask_wipe', t0: t0 + .08, glow: false }).el.style.fontVariantNumeric = 'lining-nums tabular-nums'; });
          if (i < sts.length - 1) CR.el('div', `position:absolute;left:${x0}px;top:${ry + rowH - 10}px;width:${rw}px;height:1px;background:${CR.rgba(ink, .22)}`, L); });
        source(L, { x: x0, width: rw, align: 'center', font: 'serif', upper: false, size: 24, ls: 0, paper: true, color: CR.mix(ink, pal.ground, .3) });
        CR.beat = tb(.6); CR.focus = [W / 2, H / 2];
      } },
      elevation: { build() {
        // blueprint: two sides drawn as two dimensioned parts — each name lettered over its own column in the drawing's
        // condensed hand (its real photo in a drawn frame above when there is one), each measure lettered down the
        // middle, and each side's figure drawn as a DIMENSION: a line with arrowheads and end ticks whose length is the
        // value on one shared scale, the figure lettered over it; the larger one in the accent
        const L = CR.L.front, a = side('left'), b = side('right'), sts = vStats(), ink = pal.ink, s = CR.svg(CR.L.mid), photos = !!(a.photo || b.photo);
        if (S.title) CR.label(L, S.title, { x: 0, y: 96, width: W, align: 'center', size: 26, ls: .3, t0: at(.1), color: pal.accent, nowrap: true });
        const mid = W / 2, cwid = 380, half = mid - cwid / 2 - M - 20, ny = photos ? 400 : Math.max(170, Math.round((H - 200 - Math.max(1, sts.length) * 150) / 2) - 10);   // the block centred
        [[a, M, 'left'], [b, W - M - 700, 'right']].forEach(([s_, x, al], k) => { const t0 = at(.2 + k * .12);
          if (photos && s_.photo) { const px = k ? W - M - 240 : M, ph = CR.photo(CR.L.mid, s_.photo, { x: px, y: 150, w: 240, h: 220, frame: 'none', treat: 'cyan', focus: [.5, .3] });
            CR.enter(ph.el, { kind: 'fade', t0, dur: .7 });
            bpLine(s, px - 10, 140, px + 250, 140, { t0, a: .7 }); bpLine(s, px - 10, 380, px + 250, 380, { t0, a: .7 }); bpLine(s, px - 10, 140, px - 10, 380, { t0, a: .7 }); bpLine(s, px + 250, 140, px + 250, 380, { t0, a: .7 }); }
          const nsz = fitSize(String(s_.name || '').toUpperCase(), 'cond', 700, 92, 44, .02, 600);
          CR.text(L, String(s_.name || ''), hero({ font: 'cond', size: nsz, weight: 600, upper: true, ls: .02, x, y: ny, width: 700, align: al, nowrap: true, lh: 1, t0 }));
          if (s_.sub) CR.text(L, s_.sub, { font: 'mono', size: 24, upper: true, ls: .08, x, y: ny + nsz + 14, width: 700, align: al, nowrap: true, color: pal.dim, anim: 'typewriter', caret: NOC, t0: t0 + .25, cps: 36, glow: false });
          bpLine(s, k ? W - M - 700 : M, ny + nsz + 56, k ? W - M : M + 700, ny + nsz + 56, { w: 2, t0: t0 + .1, dur: .6 }); });
        const y0 = ny + 200, rowH = Math.min(150, (H - 120 - y0) / Math.max(1, sts.length));
        bpLine(s, mid - cwid / 2, y0 - 20, mid - cwid / 2, y0 + sts.length * rowH - 30, { w: 1, t0: at(.3), dur: .7, a: .35, dash: '4 7' });
        bpLine(s, mid + cwid / 2, y0 - 20, mid + cwid / 2, y0 + sts.length * rowH - 30, { w: 1, t0: at(.3), dur: .7, a: .35, dash: '4 7' });
        const allV = sts.filter(statBars).flatMap(st => [st.lv, st.rv]), mx = allV.length ? Math.max(...allV) : 0;
        sts.forEach((st, i) => { const yc = y0 + i * rowH + rowH * .4, t0 = tb(.55 + i * .2), du = Math.min(.8, D * .18);
          CR.text(L, String(st.label || '').toUpperCase(), { font: 'mono', size: 22, ls: .06, x: mid - cwid / 2 + 14, y: yc - 26, width: cwid - 28, align: 'center', lh: 1.2, color: pal.dim, anim: 'mask_wipe', t0, glow: false });
          [['l', -1], ['r', 1]].forEach(([k, dir]) => { const w = winOf(st, k), col = w ? pal.accent : ink, v = st[k + 'v'];
            const x0 = mid + dir * (cwid / 2 + 30), num = statBars(st) && mx, len = num && v > 0 ? Math.max(24, half * v / mx) : 0, x1 = x0 + dir * len;
            if (num && !len) { const zt = CR.sv('line', { x1: x0, y1: yc - 14, x2: x0, y2: yc + 22, stroke: col, 'stroke-width': 2, opacity: 0 }, s);   // a zero: one end tick, no length
              CR.on(t => zt.setAttribute('opacity', CR.sseg(t, t0, t0 + .15).toFixed(3))); }
            if (len) { bpLine(s, x0, yc + 4, x1, yc + 4, { w: 2.5, color: col, t0, dur: du });
              [x0, x1].forEach((xx, e) => { const tk = CR.sv('line', { x1: xx, y1: yc - 14, x2: xx, y2: yc + 22, stroke: col, 'stroke-width': 2, opacity: 0 }, s);
                CR.on(t => tk.setAttribute('opacity', CR.sseg(t, t0 + (e ? du : 0), t0 + (e ? du : 0) + .1).toFixed(3))); });
              const ah = CR.sv('path', { d: `M${x1},${yc + 4} L${x1 - dir * 20},${yc - 3} L${x1 - dir * 20},${yc + 11} Z`, fill: col, opacity: 0 }, s);
              CR.on(t => ah.setAttribute('opacity', CR.sseg(t, t0 + du - .05, t0 + du + .05).toFixed(3))); }
            const vw = 480, vx = len ? (x0 + x1) / 2 - vw / 2 : (dir < 0 ? x0 - vw : x0);
            CR.text(L, String(st[k] || ''), { font: 'cond', size: 46, weight: 600, x: len ? vx : (dir < 0 ? x0 - vw - 14 : x0 + 14), y: len || num ? yc - 66 : yc - 30, width: vw, align: len ? 'center' : (dir < 0 ? 'right' : 'left'), nowrap: true, color: col, anim: 'mask_wipe', t0: t0 + du * .6, glow: false }).el.style.fontVariantNumeric = 'lining-nums tabular-nums'; }); });
        source(L, { align: 'center', x: M, width: W - 2 * M });
        CR.beat = tb(.55); CR.focus = [W / 2, H / 2];
      } },
      slides: { build() {
        // light table: the two sides as two slide mounts on the light — the real photo in the window when there is
        // one (the name printed on the mount's edge), else the name itself set in the lit window; the measures typed
        // between them, each side's figure under its own mount, the stronger one ringed in red grease pencil
        const a = side('left'), b = side('right'), sts = vStats().slice(0, 3), ink = pal.sink, ms = sts.length > 2 ? 380 : 440, gap = 360;
        const xs = [W / 2 - gap / 2 - ms, W / 2 + gap / 2], y0 = S.title ? 150 : 104, s = ltSvg();
        if (S.title) CR.text(CR.L.front, String(S.title).toUpperCase(), { font: 'mono', size: 28, weight: 700, ls: .08, x: M, y: y0 - 80, width: W - 2 * M, align: 'center', nowrap: true, color: ink, onLight: true, anim: 'typewriter', t0: at(.1), cps: 34 });
        const vsx = CR.el('div', `position:absolute;left:${W / 2 - 60}px;top:${y0 + ms / 2 - 30}px;width:120px;text-align:center;font-family:${F.serif};font-style:italic;font-size:44px;color:${CR.mix(ink, pal.ground, .35)}`, CR.L.front, esc(tw('vs')));
        CR.enter(vsx, { kind: 'fade', t0: at(.4), dur: .5 });
        [a, b].forEach((s_, k) => { const t0 = at(.15 + k * .15), m = ltMount(CR.L.mid, xs[k], y0, ms, ms, { seed: 61 + k });
          CR.enter(m.el, { kind: 'land', t0, rot: k ? 1.1 : -1.3, dur: .55 });
          const nm = String(s_.name || '');
          if (s_.photo) { CR.photo(m.win, s_.photo, { x: 0, y: 0, w: m.ww, h: m.wh, frame: 'none', treat: 'slide', focus: [.5, .32] });
            CR.text(m.el, nm.toUpperCase(), { font: 'mono', size: 22, weight: 700, ls: .1, x: 0, y: Math.round(m.wy * .36), width: ms, align: 'center', nowrap: true, color: CR.mix(ink, MOUNT, .15), onLight: true, anim: 'none', t0: 0 }); }
          else { const nz = Math.min(76, fitSize(nm, 'head', (m.ww - 40) * 1.9, 76, 34));
            const tx = CR.text(m.win, nm, hero({ font: 'head', size: nz, x: 20, y: 0, width: m.ww - 40, align: 'center', lh: 1.04, color: ink, onLight: true, t0: t0 + .3, anim: ['typewriter', 'stamp', 'slam', 'split_flap'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
            tx.el.style.top = Math.round((m.wh - tx.el.offsetHeight) / 2 - (s_.sub ? 18 : 0)) + 'px';
            if (s_.sub) CR.text(m.win, s_.sub, { font: 'serif', italic: true, size: 26, x: 20, y: Math.round((m.wh + tx.el.offsetHeight) / 2 + 2), width: m.ww - 40, align: 'center', nowrap: true, color: CR.mix(ink, '#FFFFFF', .35), onLight: true, anim: 'mask_wipe', t0: t0 + .5, glow: false }); } });
        const sy = y0 + ms + 56, rowH = 92;
        sts.forEach((st, i) => { const ry = sy + i * rowH, t0 = tb(.7 + i * .2);
          CR.text(CR.L.front, String(st.label || '').toUpperCase(), { font: 'mono', size: 22, weight: 700, ls: .06, x: W / 2 - gap / 2 + 10, y: ry + 16, width: gap - 20, align: 'center', lh: 1.2, color: CR.mix(ink, pal.ground, .3), onLight: true, anim: 'typewriter', caret: NOC, t0, cps: 46 });
          ['l', 'r'].forEach((k, j) => { const v = String(st[k] || ''), vz = fitSize(v, 'head', ms - 40, 54, 30);
            CR.text(CR.L.front, v, { font: 'head', size: vz, x: xs[j], y: ry, width: ms, align: 'center', nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: t0 + .1, glow: false }).el.style.fontVariantNumeric = 'lining-nums tabular-nums';
            if (winOf(st, k)) { const vw = measure(v, 'head', vz); ltRing(s, xs[j] + ms / 2, ry + vz * .62, vw / 2 + 40, vz * .78, 161 + i, Math.min(D - .7, t0 + .6), .45); } });
          if (i < sts.length - 1) CR.el('div', `position:absolute;left:${xs[0]}px;top:${ry + rowH - 8}px;width:${xs[1] + ms - xs[0]}px;height:1px;background:${CR.rgba(ink, .14)}`, CR.L.front); });
        source(CR.L.front, { align: 'center', paper: true, font: 'mono', upper: false, size: 22, y: H - 64 });
        CR.beat = tb(.7); CR.focus = [W / 2, H / 2];
      } },
      stencil: { build() {
        // concrete: the two names sprayed big on the wall through a stencil, each in its own half (a real print taped
        // above when there is one), a sprayed "vs." between them in the accent paint; the measures typed on a notice
        // taped under them, the stronger figure in the accent
        const a = side('left'), b = side('right'), sts = vStats(), paint = ccPaint(), acc = ccAcc(), photos = !!(a.photo || b.photo), cx = [W / 2 - 440, W / 2 + 440];
        if (S.title) CR.text(CR.L.front, String(S.title).toUpperCase(), { font: 'cond', size: 30, weight: 600, ls: .26, x: 0, y: 76, width: W, align: 'center', nowrap: true, color: CR.rgba(paint, .8), anim: 'mask_wipe', t0: at(.1), glow: false });
        const ny = photos ? 490 : Math.max(200, Math.round((H - (300 + 70 + sts.length * 78)) / 2));        // names + the notice, centred
        [a, b].forEach((s_, k) => { const t0 = at(.2 + k * .2);
          if (photos && s_.photo) { const p = CR.photo(CR.L.mid, s_.photo, { x: cx[k] - 140, y: 160, w: 280, h: 290, frame: 'print', treat: 'print', seed: 81 + k, focus: [.5, .32] });
            CR.enter(p.el, { kind: 'land', t0, rot: k ? 1.4 : -1.6, dur: .45, dy: -14 }); CR.tape(p.el, 140, 4, 110, k ? 14 : -16); }
          const nm = String(s_.name || '').toUpperCase(), nz = fitSize(nm, 'stamp', 780, photos ? 92 : 120, 48);
          ccText(CR.L.front, nm, { font: 'stamp', size: nz, x: cx[k] - 400, y: ny, width: 800, align: 'center', nowrap: true, color: paint, anim: 'mask_wipe', t0, glow: false });
          if (s_.sub) { const sw = Math.min(700, measure(s_.sub, 'mono', 26) + 70);
            ccNote(CR.L.mid, cx[k] - sw / 2, ny + nz * 1.15 + 14, [{ t: s_.sub, size: 26 }], { w: sw, t0: t0 + .25, rot: k ? 1 : -1.2, seed: 85 + k, pad: 20, caret: false }); } });
        const vs = ccSpray(CR.el('div', `position:absolute;left:${W / 2 - 80}px;top:${ny + 10}px;width:160px;text-align:center;font-family:${F.stamp};font-size:64px;line-height:1.2;color:${acc}`, CR.L.front, esc(tw('vs'))));
        CR.enter(vs, { kind: 'fade', t0: at(.5), dur: .4 }); vs.style.mixBlendMode = 'screen';
        if (sts.length) { const lw = 600, vw = 330, nwid = lw + 2 * vw + 90, rows = [];
          const t1 = tb(.9, .5), sy = ny + (photos ? 220 : 300);
          const note = CR.sheet(CR.L.mid, { x: (W - nwid) / 2, y: sy, w: nwid, h: 70 + sts.length * 78, pad: 0, seed: 89, age: .5 });
          CR.enter(note.el, { kind: 'land', t0: t1, rot: -.6, dur: .45, dy: -14 }); CR.tape(note.el, 60, 6, 110, -22); CR.tape(note.el, nwid - 60, 6, 110, 20);
          sts.forEach((st, i) => { const ry = 36 + i * 78, ti = t1 + .3 + i * .25, lz = fitSize(String(st.label || '').toUpperCase(), 'mono', lw - 30, 28, 18, 0, 700);
            CR.text(note.el, String(st.label || '').toUpperCase(), { font: 'mono', size: lz, weight: 700, x: 44, y: ry + (38 - lz) * .6 + 4, width: lw - 20, nowrap: true, color: pal.sink, onLight: true, anim: 'typewriter', caret: NOC, t0: ti, cps: 60 / CR.ts });
            ['l', 'r'].forEach((k, j) => { const w = winOf(st, k);
              CR.text(note.el, String(st[k] || ''), { font: 'mono', size: 38, weight: w ? 700 : 400, x: 44 + lw + j * vw, y: ry, width: vw - 24, align: 'right', nowrap: true, color: w ? pal.accent : pal.sink, onLight: true, anim: 'typewriter', caret: NOC, t0: ti + .15 + j * .1, cps: 40 / CR.ts }); });
            if (i < sts.length - 1) CR.el('div', `position:absolute;left:44px;top:${ry + 62}px;width:${nwid - 88}px;height:1px;background:${CR.rgba(pal.sink, .18)}`, note.el); void rows; }); }
        source(CR.L.front, { align: 'right', x: M, width: W - 2 * M, y: H - 80 });
        CR.beat = tb(.9, .5); CR.focus = [W / 2, H / 2];
      } },
    },
  });

  // ══ TIMELINE — dated events on a line ══════════════════════════════════════════════════════════════════════════
  const evs = () => (Array.isArray(S.events) ? S.events : []).filter(e => e && (e.date || e.label)).slice(0, 6);
  const evMark = () => { const n = evs().length; return (typeof S.mark === 'number' && S.mark >= 0 && S.mark < n) ? S.mark : -1; };
  // the second each event arrives: the narration's own times when creative_data.py found them, else evenly spaced
  const evTimes = (a0, a1) => { const n = evs().length, b = Array.isArray(S.beats) ? S.beats : [];
    if (b.length === n && b.every((x, i) => typeof x === 'number' && x >= 0 && x < D - .6 && (!i || x > b[i - 1] + .25))) return b.map(x => Math.max(a0, x));
    return evs().map((_, i) => n > 1 ? a0 + (a1 - a0) * i / (n - 1) : a0); };
  const evX = (x0, x1, minPx) => { const e = evs(), n = e.length, tv = e.map(v => v.tv), mf = minPx ? minPx / Math.max(1, x1 - x0) : .09;
    if (n > 1 && (n - 1) * mf < 1 && tv.every(v => typeof v === 'number') && tv[n - 1] > tv[0]) { const raw = tv.map(v => (v - tv[0]) / (tv[n - 1] - tv[0]));
      // proportional, but no two events closer than their labels need (minPx along the line): push apart, rescale to
      // the line, again until the gaps hold after the rescale
      let out = raw.slice();
      for (let it = 0; it < 8; it++) { for (let i = 1; i < n; i++) out[i] = Math.max(out[i], out[i - 1] + mf);
        const a = out[0], b = out[n - 1]; out = out.map(v => (v - a) / ((b - a) || 1)); }
      const lo = out[0], hi = out[n - 1];
      return out.map(v => x0 + (x1 - x0) * (hi > lo ? (v - lo) / (hi - lo) : 0)); }
    return e.map((_, i) => n > 1 ? x0 + (x1 - x0) * i / (n - 1) : (x0 + x1) / 2); };
  // the axis comp's labels: each event's label beside its leader at one of three heights, left of the leader near the
  // right edge — chosen so no label touches another label or crosses another event's leader. bad = the clashes left
  const axisLayout = (xs, e, ay, lw, HS0) => {
    // every event's label (date + words) beside its leader at one of the heights, left or right of it; a full
    // search (backtracking, the alternating order first) for an assignment where no two labels touch and no leader
    // crosses another event's label — a greedy pass missed layouts that exist (6 long labels: heights must rise
    // toward the middle). bad = 1 when none exists
    const HS = HS0 || [150, 290, 430], n = e.length;
    const lap = (a0, a1, b0, b1, pad) => a0 < b1 + pad && b0 < a1 + pad;
    const opts = e.map((v, i) => {
      const x = xs[i], dw = measure(String(v.date || '').toUpperCase(), 'mono', 24, 700), tw0 = measure(String(v.label || ''), 'body', 28);
      const bw = Math.min(lw, Math.max(dw, tw0)) + 6, nl = Math.max(1, Math.ceil(tw0 / (lw - 44)));   // word wrap needs slack
      const pref = HS.map((_, k) => k).sort((a, b) => Math.abs(a - (i % 2 ? 0 : 1)) - Math.abs(b - (i % 2 ? 0 : 1)) || a - b);
      const sides = x + 12 + bw > W - M + 40 ? ['right'] : (x - 12 - bw < M - 40 ? ['left'] : ['left', 'right']), out = [];
      pref.forEach(k => sides.forEach(sd => { const h = HS[k], X0 = sd === 'right' ? x - 12 - bw : x + 12;
        out.push({ x, h, sd, X0, X1: X0 + bw, Y0: ay - h - 8, Y1: ay - h + 30 + nl * 33 }); }));
      return out; });
    const clash = (a, p) => (lap(a.X0, a.X1, p.X0, p.X1, 22) && lap(a.Y0, a.Y1, p.Y0, p.Y1, 10))   // two labels touch
      || (a.x > p.X0 - 10 && a.x < p.X1 + 10 && ay - a.h < p.Y1)                                    // my leader crosses a label
      || (p.x > a.X0 - 10 && p.x < a.X1 + 10 && ay - p.h < a.Y1);                                   // its leader crosses mine
    const pick = []; let steps = 0;
    const go = i => { if (i === n) return true;
      for (const o of opts[i]) { if (++steps > 150000) return false;
        if (pick.every(q => !clash(o, q))) { pick.push(o); if (go(i + 1)) return true; pick.pop(); } }
      return false; };
    if (!go(0)) return { xs, hgt: [], al: [], bad: 1, lw };
    return { xs, hgt: pick.map(q => q.h), al: pick.map(q => q.sd), bad: 0, lw };
  };
  // the axis layout with no clash at all: to scale, then evenly spaced, each with 3 then 4 heights and narrower label
  // columns; null when every try still has a leader through a label (the comp then draws the 'track' instead)
  const axisPick = (e, ay) => {
    const xsP = evX(M + 140, W - M - 140, 210), xsE = evX(M + 140, W - M - 140, 1e9);
    for (const lw of [380, 330, 290]) for (const HS of [[150, 290, 430], [130, 250, 370, 490]]) for (const xs of [xsP, xsE]) {
      const lay = axisLayout(xs, e, ay, lw, HS);
      if (!lay.bad) return lay;
    }
    return null;
  };
  CR.scene('timeline', {
    s: 6.5,
    layout: { void_black: 'track', navy_falloff: 'axis', charcoal_light: 'exhibit', glass_dark: 'cards', paper_desk: 'strip', newsprint: 'chronology',
              blueprint: 'schedule', concrete: 'stencil', light_table: 'contact', footage_sharp: 'track', footage_moving: 'track' },
    comps: {
      track: { build() {
        // void / footage (and axis's fallback): one hairline across the frame and a point of light that travels it, stopping at
        // each date in turn — the date above the line, what happened below it, the moment that matters in the accent
        if (CR.foot) { CR.footLook(8, .3, .7); veil(CR.L.back, 'all'); }
        const L = CR.L.front, e = evs(), n = e.length, ink = pal.ink, y = 560, mi = evMark();
        if (S.title) CR.label(L, S.title, { x: M, y: 150, size: 28, ls: .28, t0: at(.1), color: pal.accent, width: W - 2 * M, nowrap: true });
        const lw = Math.min(400, (W - 2 * M) / Math.max(1, n) - 24), xs = evX(M + lw / 2, W - M - lw / 2, lw + 24);
        const a0 = at(.5), a1 = Math.min(D * .66, a0 + 2.6 * CR.ts), ts = evTimes(a0, a1);
        const s = CR.svg(CR.L.mid);
        const base = CR.sv('line', { x1: M, y1: y, x2: M, y2: y, stroke: CR.rgba(ink, .25), 'stroke-width': 1.5 }, s);
        CR.on(t => base.setAttribute('x2', lerp(M, W - M, CR.sseg(t, at(.1), at(.1) + 1.0)).toFixed(1)));
        const lit = CR.sv('line', { x1: xs[0], y1: y, x2: xs[0], y2: y, stroke: CR.rgba(pal.accent, .85), 'stroke-width': 2.5 }, s);
        lit.style.filter = CR.glowFilter(pal.accent, 26) || 'none';
        const head = CR.sv('circle', { cx: xs[0], cy: y, r: 6, fill: CR.mix(pal.accent, '#FFFFFF', .6) }, s); head.style.filter = CR.glowFilter(pal.glow, 30) || 'none';
        const posAt = t => { if (t <= ts[0]) return xs[0]; for (let i = 1; i < n; i++) if (t < ts[i]) return lerp(xs[i - 1], xs[i], CR.cruise(seg(t, ts[i - 1] + .15, ts[i]), .3)); return xs[n - 1]; };
        CR.on(t => { const x = posAt(t); lit.setAttribute('x2', x.toFixed(1)); head.setAttribute('cx', x.toFixed(1)); head.style.opacity = t > ts[0] - .3 && t < ts[n - 1] + .4 ? 1 : 0; });
        const lsize = Math.min(32, ...e.map(v => fitSize(String(v.label || '').split(' ').slice(0, 3).join(' '), 'serif', lw, 32, 24)));
        // every date fits its own slot (six long dates: "27 JANUARY 1967" at 30 px would run into its neighbour)
        const dsz = Math.min(30, ...e.map(v => fitSize(String(v.date || '').toUpperCase(), 'cond', lw - 8, 30, 18, .14)));
        e.forEach((v, i) => { const x = xs[i], t0 = ts[i], m = i === mi;
          const dot = CR.sv('circle', { cx: x, cy: y, r: m ? 9 : 6.5, fill: m ? pal.accent : ink, opacity: .25 }, s);
          CR.on(t => { const q = CR.sseg(t, t0 - .1, t0 + .2); dot.setAttribute('opacity', (.25 + .75 * q).toFixed(3)); });
          if (m) { const ring = CR.sv('circle', { cx: x, cy: y, r: 20, fill: 'none', stroke: pal.accent, 'stroke-width': 2, opacity: 0 }, s); CR.on(t => ring.setAttribute('opacity', CR.sseg(t, t0, t0 + .4).toFixed(3))); }
          const al = 'center', lx = x - lw / 2;
          CR.text(L, v.date || '', { font: 'cond', size: dsz, ls: .14, upper: true, x: lx, y: y - 48 - dsz, width: lw, align: al, nowrap: true, color: m ? pal.accent : ink, anim: 'mask_wipe', t0, glow: m });
          CR.text(L, v.label || '', { font: 'serif', size: lsize, x: lx, y: y + 34, width: lw, align: al, lh: 1.18, color: m ? ink : CR.mix(ink, pal.dim, .35), anim: 'mask_wipe', t0: t0 + .12, glow: false }); });
        source(L, { y: H - 92 });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, y];
      } },
      exhibit: { build() {
        // charcoal (the museum): the timeline painted along the gallery wall — a thin rule, each date in the head face
        // above it and what happened in the italic serif below — while a warm spot walks the wall from date to date and
        // each one comes up as the light reaches it; the date that matters in the accent
        const L = CR.L.front, e = evs(), n = e.length, mi = evMark(), y = 590, ink = pal.ink;
        if (S.title) CR.text(L, S.title, { font: 'cond', size: 26, upper: true, ls: .3, x: M, y: 150, width: W - 2 * M, nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: at(.1), glow: false });
        const lw = Math.min(420, (W - 2 * M) / Math.max(1, n) - 30), xs = evX(M + lw / 2, W - M - lw / 2, lw + 30);
        const a0 = at(.45), a1 = Math.min(D * .66, a0 + 2.6 * CR.ts), ts = evTimes(a0, a1);
        const spot = CR.el('div', `position:absolute;left:0;top:${y - 400}px;width:800px;height:800px;background:radial-gradient(ellipse at 50% 50%, ${CR.rgba('#FFE2B4', .2)} 0%, ${CR.rgba('#FFD49C', .07)} 40%, rgba(0,0,0,0) 68%);pointer-events:none`, CR.L.mid);
        const posAt = t => { if (t <= ts[0]) return xs[0]; for (let i = 1; i < n; i++) if (t < ts[i]) return lerp(xs[i - 1], xs[i], CR.cruise(seg(t, ts[i - 1] + .1, ts[i]), .3)); return xs[n - 1]; };
        CR.on(t => { spot.style.transform = `translateX(${(posAt(t) - 400).toFixed(1)}px)`; spot.style.opacity = CR.sseg(t, a0 - .6, a0).toFixed(3); });
        CR.rule(L, { x: M, y, w: W - 2 * M, h: 1.5, color: CR.rgba(ink, .32), glow: false, t0: at(.1), dur: 1.0 });
        const dsz = Math.min(56, ...e.map(v => fitSize(String(v.date || ''), 'head', lw - 10, 56, 26)));
        e.forEach((v, i) => { const x = xs[i], t0 = ts[i], m = i === mi, lx = x - lw / 2;
          const tick = CR.el('div', `position:absolute;left:${x - 1}px;top:${y - 14}px;width:2px;height:28px;background:${m ? pal.accent : CR.rgba(ink, .55)}`, L);
          const dt = CR.text(L, v.date || '', { font: 'head', size: dsz, x: lx, y: y - 36 - dsz * 1.2, width: lw, align: 'center', nowrap: true, color: m ? pal.accent : ink, anim: 'none', t0: 0, glow: m });
          const lb = CR.text(L, v.label || '', { font: 'serif', italic: true, size: 28, x: lx + 8, y: y + 38, width: lw - 16, align: 'center', lh: 1.25, color: CR.mix(ink, pal.dim, .3), anim: 'none', t0: 0, glow: false });
          // the wall is dim until the light comes: each date rises from .2 to full as the spot reaches it, and stays lit
          CR.on(t => { const q = CR.sseg(t, t0 - .35, t0 + .15), o = (.2 + .8 * q).toFixed(3);
            dt.el.style.opacity = o; tick.style.opacity = o; lb.el.style.opacity = (.1 + .9 * CR.sseg(t, t0 - .2, t0 + .3)).toFixed(3); }); });
        source(L, { y: H - 92 });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, y];
      } },
      axis: { build() {
        // navy: time to scale — a measured axis, a playhead sweeping it, each event on its own leader line
        // (heights alternate so the labels never meet), dates in the mono face
        const L = CR.L.front, e = evs(), n = e.length, ink = pal.ink, line = CR.W === 'blueprint', ay = 720, mi = evMark();
        // to scale when the labels can be stacked without a leader crossing a label (3 or 4 heights, narrower
        // columns), else evenly spaced; when nothing is clean (many long labels) the scene draws the 'track' instead
        const lay = axisPick(e, ay);
        if (!lay) return CR.SCENES.timeline.comps.track.build(CR.ctx);
        if (S.title) CR.label(L, S.title, { x: M, y: 140, size: 28, ls: .28, t0: at(.1), color: pal.accent, width: W - 2 * M, nowrap: true });
        const lw = lay.lw, xs = lay.xs, a0 = at(.5), a1 = Math.min(D * .66, a0 + 2.6 * CR.ts), ts = evTimes(a0, a1);
        const s = CR.svg(CR.L.mid);
        const ax = CR.sv('line', { x1: M, y1: ay, x2: M, y2: ay, stroke: CR.rgba(ink, .55), 'stroke-width': 1.5 }, s);
        const ticks = []; for (let x = M; x <= W - M + .5; x += (W - 2 * M) / 60) { const k = ticks.length; ticks.push([x, CR.sv('line', { x1: x, y1: ay, x2: x, y2: ay + (k % 5 ? 9 : 18), stroke: CR.rgba(ink, k % 5 ? .22 : .45), 'stroke-width': 1, opacity: 0 }, s)]); }
        CR.on(t => { const xe = lerp(M, W - M, CR.sseg(t, at(.1), at(.1) + 1.1)); ax.setAttribute('x2', xe.toFixed(1)); ticks.forEach(([x, l]) => l.setAttribute('opacity', clamp((xe - x) / 50).toFixed(3))); });
        const ph = CR.sv('line', { x1: xs[0], y1: ay - 40, x2: xs[0], y2: ay + 40, stroke: pal.accent, 'stroke-width': 2.5, opacity: 0 }, s); ph.style.filter = CR.glowFilter(pal.accent, 26) || 'none';
        CR.on(t => { let x = xs[0]; for (let i = 1; i < n; i++) if (t >= ts[i - 1]) x = lerp(xs[i - 1], xs[i], CR.cruise(seg(t, ts[i - 1] + .1, ts[i]), .3));
          ph.setAttribute('x1', x.toFixed(1)); ph.setAttribute('x2', x.toFixed(1)); ph.setAttribute('opacity', (CR.sseg(t, a0 - .3, a0) * (1 - CR.sseg(t, ts[n - 1] + .3, ts[n - 1] + .8))).toFixed(3)); });
        e.forEach((v, i) => { const x = xs[i], t0 = ts[i], m = i === mi, hgt = lay.hgt[i];
          const ld = CR.sv('line', { x1: x, y1: ay, x2: x, y2: ay, stroke: m ? pal.accent : CR.rgba(ink, .6), 'stroke-width': m ? 2.5 : 1.5, 'stroke-dasharray': line && !m ? '5 5' : 'none' }, s);
          const dm = CR.sv('rect', { x: x - 6, y: ay - 6, width: 12, height: 12, fill: m ? pal.accent : (line ? pal.ground : ink), stroke: line ? ink : 'none', 'stroke-width': 2, transform: `rotate(45 ${x} ${ay})`, opacity: 0 }, s);
          if (m && !line) ld.style.filter = CR.glowFilter(pal.accent, 24) || 'none';
          CR.on(t => { const q = CR.sseg(t, t0, t0 + .45); ld.setAttribute('y2', (ay - hgt * q).toFixed(1)); dm.setAttribute('opacity', CR.sseg(t, t0 - .1, t0 + .1).toFixed(3)); });
          const al = lay.al[i], lx = al === 'right' ? x - lw - 12 : x + 12;
          CR.text(L, v.date || '', { font: 'mono', size: 24, weight: 700, upper: true, x: lx, y: ay - hgt - 6, width: lw, align: al, nowrap: true, color: m ? pal.accent : CR.mix(ink, pal.dim, .2), anim: 'typewriter', caret: NOC, t0: t0 + .3, cps: 36, glow: m });
          CR.text(L, v.label || '', { font: 'body', size: 28, x: lx, y: ay - hgt + 28, width: lw, align: al, lh: 1.15, color: ink, anim: 'mask_wipe', t0: t0 + .4, glow: false }); });
        source(L, { y: H - 92 });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, ay - 150];
      } },
      cards: { build() {
        // glass: one glass tile per date in a row on a thin line of light, each tile lit as its moment arrives
        const e = evs(), n = e.length, mi = evMark(), gap = 28, tw2 = Math.min(390, (W - 2 * M - gap * (n - 1)) / n), x0 = (W - (n * tw2 + (n - 1) * gap)) / 2;
        // the tiles as tall as their words (a fixed 320 left the lower half of every tile empty)
        const dsz = Math.min(48, ...e.map(v => fitSize(String(v.date || ''), 'display', tw2 - 56, 48, 26)));
        const nl = Math.max(1, ...e.map(v => Math.ceil(measure(String(v.label || ''), 'body', 28) / (tw2 - 66))));
        const th = Math.max(220, Math.round(64 + dsz * 1.3 + nl * 34 + 46)), y0 = Math.round((H - th) / 2 + 20);
        if (S.title) CR.label(CR.L.front, S.title, { x: x0, y: y0 - 100, size: 26, ls: .26, t0: at(.1), color: pal.accent, width: W - 2 * x0, nowrap: true });
        const a0 = at(.4), a1 = Math.min(D * .62, a0 + 2.4 * CR.ts), ts = evTimes(a0, a1);
        const ln = CR.el('div', `position:absolute;left:${x0}px;top:${y0 + th / 2}px;width:${n * tw2 + (n - 1) * gap}px;height:2px;background:${CR.rgba(pal.glow, .6)};transform-origin:0 50%;transform:scaleX(0)`, CR.L.back);
        ln.style.filter = CR.glowFilter(pal.glow, 20) || 'none';
        CR.on(t => { ln.style.transform = `scaleX(${CR.sseg(t, a0 - .2, ts[n - 1] + .3).toFixed(4)})`; });
        e.forEach((v, i) => { const x = x0 + i * (tw2 + gap), t0 = ts[i], m = i === mi;
          const g = CR.glass(CR.L.mid, { x, y: y0, w: tw2, h: th, r: 22 }); CR.enter(g.el, { kind: 'rise', t0: t0 - .2, dur: .6 });
          if (m) { const ed = CR.el('div', `position:absolute;left:0;right:0;top:0;height:4px;background:${pal.accent};box-shadow:0 0 22px ${CR.rgba(pal.glow, .8)}`, g.el); void ed; }
          const host = CR.el('div', `position:absolute;left:${x}px;top:${y0}px;width:${tw2}px;height:${th}px`, CR.L.front); CR.enter(host, { kind: 'rise', t0: t0 - .2, dur: .6 });
          CR.text(host, v.date || '', { font: 'display', size: dsz, x: 28, y: 40, width: tw2 - 56, nowrap: true, color: m ? pal.accent : pal.ink, anim: 'mask_wipe', t0, glow: m });
          CR.el('div', `position:absolute;left:28px;top:${40 + dsz * 1.3}px;width:44px;height:2px;background:${m ? pal.accent : CR.rgba(pal.ink, .3)}`, host);
          CR.text(host, v.label || '', { font: 'body', size: 28, x: 28, y: 64 + dsz * 1.3, width: tw2 - 56, lh: 1.2, color: m ? pal.ink : CR.mix(pal.ink, pal.dim, .3), anim: 'mask_wipe', t0: t0 + .12, glow: false }); });
        source(CR.L.front, { x: x0, y: y0 + th + 60, width: W - 2 * x0 });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, y0 + th / 2];
      } },
      strip: { build() {
        // paper: a typed chronology — the dates typed down a ruled margin, each entry typed as its moment
        // arrives, the one that matters ringed in red pencil
        const e = evs(), n = e.length, mi = evMark(), sw = 1280, rowH = Math.min(118, 620 / Math.max(1, n)), sh = 200 + n * rowH + 70;
        const sx = (W - sw) / 2, sy = (H - sh) / 2, ink = pal.sink, dk = CR.mix(ink, pal.paper, .4);
        const sheet = sheetOn(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, seed: 51, age: .55, rot: -.6 });
        const host = sheet.el, X = 96, dx = X + 300;
        if (S.title) CR.text(host, String(S.title).toUpperCase(), { font: 'mono', size: 32, weight: 700, ls: .04, x: X, y: 72, width: sw - 2 * X, color: ink, onLight: true, anim: 'typewriter', t0: at(.3), cps: 34 });
        const y0 = 150, ml = CR.el('div', `position:absolute;left:${dx - 32}px;top:${y0}px;width:2px;height:${n * rowH}px;background:${CR.rgba(pal.accent, .55)};transform-origin:50% 0;transform:scaleY(0)`, host);
        CR.on(t => { ml.style.transform = `scaleY(${CR.sseg(t, at(.3), at(.3) + 1.0).toFixed(4)})`; });
        const a0 = tb(.7, .35), a1 = Math.min(D * .62, a0 + 2.4 * CR.ts), ts = evTimes(a0, a1);
        const svg = CR.svg(host); svg.setAttribute('width', sw); svg.setAttribute('height', sh); svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`); greaseDefs(svg);
        e.forEach((v, i) => { const ry = y0 + i * rowH + 18, t0 = ts[i];
          CR.text(host, String(v.date || '').toUpperCase(), { font: 'mono', size: 28, weight: 700, x: X, y: ry, width: dx - X - 60, nowrap: true, color: ink, onLight: true, anim: 'typewriter', t0, cps: 40 });
          CR.text(host, v.label || '', { font: 'mono', size: 28, x: dx, y: ry, width: sw - dx - X, lh: 1.2, color: dk, onLight: true, anim: 'typewriter', caret: NOC, t0: t0 + .25, cps: 48 });
          if (i === mi) { const dw = measure(String(v.date || '').toUpperCase(), 'mono', 28, 700); pencil(svg, ringPath(X + dw / 2, ry + 16, dw / 2 + 24, 30, 111), { w: 4.5, grease: true, t0: Math.min(D - .7, t0 + .6), dur: .45 }); } });
        const s = srcText(); if (s) CR.text(host, s, { font: 'mono', size: 22, x: X, y: sh - 62, width: sw - 2 * X, align: 'right', color: dk, onLight: true, anim: 'none', t0: tb(1.3, .7) });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, sy + sh / 2];
      } },
      chronology: { build() {
        // newsprint: the paper's chronology column — a heavy rule, the head, a black line with a dot per
        // entry, the dates in the bold head face, the entries in the serif, the one that matters in red
        const L = CR.L.front, e = evs(), n = e.length, mi = evMark(), ink = pal.sink, x0 = 360, rw = W - 2 * x0, rowH = Math.min(118, 600 / Math.max(1, n));
        let y = 150;
        if (CR.W === 'newsprint') CR.rule(L, { x: x0, y: y - 30, w: rw, h: 7, color: ink, glow: false, t0: at(.05), dur: .6 });
        if (S.title) { const tsz = fitSize(S.title, 'head', rw, 60, 40, 0, Math.max(CR.FW.head, 700)); CR.text(L, S.title, { font: 'head', size: tsz, weight: Math.max(CR.FW.head, 700), x: x0, y, width: rw, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.15), glow: false }); y += tsz * 1.3 + 20; }
        const a0 = at(.45), a1 = Math.min(D * .62, a0 + 2.4 * CR.ts), ts = evTimes(a0, a1), lx = x0 + 14;
        const vl = CR.el('div', `position:absolute;left:${lx}px;top:${y + 14}px;width:3px;height:${(n - 1) * rowH}px;background:${ink};transform-origin:50% 0;transform:scaleY(0)`, L);
        CR.on(t => { vl.style.transform = `scaleY(${CR.sseg(t, a0 - .2, ts[n - 1]).toFixed(4)})`; });
        const dsz = Math.min(44, ...e.map(v => fitSize(String(v.date || ''), 'head', 330, 44, 28, 0, Math.max(CR.FW.head, 700))));
        e.forEach((v, i) => { const ry = y + i * rowH, t0 = ts[i], m = i === mi;
          const dot = CR.el('div', `position:absolute;left:${lx - 8}px;top:${ry + 6}px;width:19px;height:19px;border-radius:50%;background:${m ? pal.accent : ink}`, L); CR.enter(dot, { kind: 'fade', t0: t0 - .1, dur: .25 });
          CR.text(L, v.date || '', { font: 'head', size: dsz, weight: Math.max(CR.FW.head, 700), x: lx + 50, y: ry - 8, width: 340, nowrap: true, color: m ? pal.accent : ink, onLight: true, anim: 'mask_wipe', t0, glow: false });
          CR.text(L, v.label || '', { font: 'serif', size: 34, x: lx + 420, y: ry - 2, width: rw - 430, lh: 1.18, color: ink, onLight: true, anim: 'mask_wipe', t0: t0 + .1, glow: false });
          if (i < n - 1) CR.el('div', `position:absolute;left:${lx + 50}px;top:${ry + rowH - 22}px;width:${rw - 64}px;height:1px;background:${CR.rgba(ink, .25)}`, L); });
        source(L, { x: x0, width: rw, y: y + n * rowH + 10, font: 'serif', upper: false, size: 24, ls: 0, paper: true, color: CR.mix(ink, pal.ground, .3) });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, y + n * rowH / 2];
      } },
      schedule: { build() {
        // blueprint: the events as numbered balloons on a datum line (to scale when the dates can be read), and under
        // it the drawing's schedule — a ruled table, one row per balloon: number, date, what happened. A balloon and
        // its row come up together as the moment arrives; the one that matters in the accent. No label ever stands on
        // the line, so nothing can collide however close the dates are
        const L = CR.L.front, e = evs(), n = e.length, mi = evMark(), ink = pal.ink, s = CR.svg(CR.L.mid);
        const sh0 = Math.max(0, Math.round((H - 100 - (414 + 84 * n)) / 2) - 20);          // a short schedule sits in the middle
        if (S.title) CR.label(L, S.title, { x: M, y: 112 + sh0, size: 28, ls: .28, t0: at(.1), color: pal.accent, width: W - 2 * M, nowrap: true });
        const ly = 262 + sh0, xs = evX(M + 80, W - M - 80, 96), a0 = at(.5), a1 = Math.min(D * .66, a0 + 2.6 * CR.ts), ts = evTimes(a0, a1);
        bpLine(s, M, ly, W - M, ly, { w: 2, t0: at(.1), dur: 1.0 });
        bpLine(s, M, ly - 18, M, ly + 18, { w: 2, t0: at(.1), dur: .2 }); bpLine(s, W - M, ly - 18, W - M, ly + 18, { w: 2, t0: at(.9), dur: .2 });
        const yrs = e.map(v => (String(v.date || '').match(/\b(1\d{3}|20\d{2})\b/) || [])[1]);
        if (yrs[0] && yrs[n - 1] && yrs[0] !== yrs[n - 1]) [[0, 'start', M], [n - 1, 'end', W - M]].forEach(([i, an, x]) => {
          const tx = CR.sv('text', { x, y: ly + 52, 'text-anchor': an, fill: CR.rgba(ink, .6), 'font-family': F.mono, 'font-size': 22 }, s); tx.textContent = yrs[i]; });
        const r = 26, top = 360 + sh0, hh = 54, rowH = Math.min(84, (H - 110 - top - hh) / Math.max(1, n)), x0 = M, tw2 = W - 2 * M, c1 = 130, c2 = 560;
        const tbh = hh + n * rowH;
        bpLine(s, x0, top, x0 + tw2, top, { w: 3, t0: at(.2), dur: .7 }); bpLine(s, x0, top + tbh, x0 + tw2, top + tbh, { w: 3, t0: at(.25), dur: .7 });
        bpLine(s, x0, top, x0, top + tbh, { w: 3, t0: at(.2), dur: .6 }); bpLine(s, x0 + tw2, top, x0 + tw2, top + tbh, { w: 3, t0: at(.25), dur: .6 });
        bpLine(s, x0, top + hh, x0 + tw2, top + hh, { w: 2, t0: at(.3), dur: .7 });
        bpLine(s, x0 + c1, top, x0 + c1, top + tbh, { w: 1.5, t0: at(.3), dur: .6, a: .7 }); bpLine(s, x0 + c2, top, x0 + c2, top + tbh, { w: 1.5, t0: at(.3), dur: .6, a: .7 });
        [[tw('no'), x0, c1, 'center'], [CR.t('date'), x0 + c1 + 24, c2 - c1 - 48, 'left'], [tw('event'), x0 + c2 + 24, tw2 - c2 - 48, 'left']].forEach(([w_, x, wd, al]) =>
          CR.text(L, w_, { font: 'mono', size: 18, ls: .14, upper: true, x, y: top + 18, width: wd, align: al, nowrap: true, color: pal.dim, anim: 'none', t0: at(.35), glow: false }));
        const dsz = Math.min(30, ...e.map(v => fitSize(String(v.date || '').toUpperCase(), 'mono', c2 - c1 - 48, 30, 18, 0, 700)));
        const lsz = Math.min(32, ...e.map(v => fitSize(String(v.label || ''), 'body', tw2 - c2 - 48, 32, 20)));
        e.forEach((v, i) => { const x = xs[i], t0 = ts[i], m = i === mi, col = m ? pal.accent : ink, ry = top + hh + i * rowH;
          const st = CR.sv('line', { x1: x, y1: ly, x2: x, y2: ly, stroke: col, 'stroke-width': 2 }, s);
          CR.on(t => st.setAttribute('y2', (ly - 30 * CR.sseg(t, t0 - .1, t0 + .1)).toFixed(1)));
          bpBalloon(s, L, x, ly - 30 - r, r, i + 1, { color: col, t0, w: m ? 3 : 2 });
          const dot = CR.sv('circle', { cx: x, cy: ly, r: 5, fill: col, opacity: 0 }, s); CR.on(t => dot.setAttribute('opacity', CR.sseg(t, t0 - .1, t0).toFixed(3)));
          if (i) bpLine(s, x0, ry, x0 + tw2, ry, { w: 1, t0: t0 - .15, dur: .5, a: .4 });
          if (m) { const hb = CR.sv('rect', { x: x0 + 3, y: ry + 3, width: c1 - 6, height: rowH - 6, fill: bpHatch(s, 'crdSchA', CR.rgba(pal.accent, .35), 10, 2.5), opacity: 0 }, s);
            CR.on(t => hb.setAttribute('opacity', CR.sseg(t, t0, t0 + .3).toFixed(3))); }
          CR.text(L, String(i + 1), { font: 'mono', size: 30, weight: 700, x: x0, y: ry + (rowH - 36) / 2, width: c1, align: 'center', color: col, anim: 'none', t0, glow: false });
          CR.text(L, String(v.date || '').toUpperCase(), { font: 'mono', size: dsz, weight: 700, x: x0 + c1 + 24, y: ry + (rowH - dsz * 1.2) / 2, width: c2 - c1 - 48, nowrap: true, color: col, anim: 'typewriter', caret: NOC, t0: t0 + .05, cps: 40, glow: false });
          CR.text(L, v.label || '', { font: 'body', size: lsz, x: x0 + c2 + 24, y: ry + (rowH - lsz * 1.2) / 2, width: tw2 - c2 - 48, nowrap: true, color: m ? ink : CR.mix(ink, pal.dim, .25), anim: 'mask_wipe', t0: t0 + .12, glow: false }); });
        source(L, { y: H - 80, align: 'right', x: M, width: W - 2 * M });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, (ly + top + tbh) / 2];
      } },
      contact: { build() {
        // light table: the events as frames of one film strip lying across the light — sprocket holes along both
        // edges, the frame numbers printed on the film's edge, each frame's window lighting up as its moment arrives
        // (the date set large in it, what happened under it); the frame that matters ringed in red grease pencil, as
        // an editor marks the pick on a contact strip
        const e = evs(), n = e.length, mi = evMark(), ink = pal.sink, gap = 26, sw = Math.min(W - 160, n * 330 + (n - 1) * gap + 120), sx = (W - sw) / 2;
        const fw = (sw - 120 - (n - 1) * gap) / n, fh = Math.min(380, Math.max(300, fw * 1.05)), sh = fh + 150, sy = Math.round((H - sh) / 2) + 24;
        if (S.title) CR.text(CR.L.front, String(S.title).toUpperCase(), { font: 'mono', size: 30, weight: 700, ls: .08, x: sx, y: sy - 78, width: sw, nowrap: true, color: ink, onLight: true, anim: 'typewriter', t0: at(.2), cps: 34 });
        const strip = CR.el('div', `position:absolute;left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;border-radius:4px;background:linear-gradient(180deg,#24221F,#171614);box-shadow:0 18px 34px rgba(0,0,0,.24)`, CR.L.mid);
        CR.enter(strip, { kind: 'land', t0: 0, rot: -.5, dur: .55 });
        const holes = Math.floor((sw - 30) / 44);
        for (let i = 0; i < holes; i++) for (const yy of [20, sh - 42]) CR.el('div', `position:absolute;left:${18 + i * (sw - 36) / holes}px;top:${yy}px;width:22px;height:22px;border-radius:4px;background:${CR.mix(pal.ground, '#FFFFFF', .75)};box-shadow:inset 0 0 4px rgba(255,255,255,.6)`, strip);
        const a0 = at(.5), a1 = Math.min(D * .62, a0 + 2.4 * CR.ts), ts = evTimes(a0, a1);
        const dsz = Math.min(54, ...e.map(v => fitSize(String(v.date || ''), 'head', fw - 40, 54, 26)));
        const lsz = Math.min(30, ...e.map(v => { let z = 30; while (z > 20 && Math.ceil(measure(String(v.label || ''), 'serif', z) / (fw - 44)) * z * 1.22 > fh - dsz * 1.3 - 120) z -= 2; return z; }));
        const s = ltSvg();
        e.forEach((v, i) => { const x = 60 + i * (fw + gap), t0 = ts[i], m = i === mi;
          const fr = CR.el('div', `position:absolute;left:${x}px;top:75px;width:${fw}px;height:${fh}px;border-radius:3px;overflow:hidden;background:#FFFDF6;box-shadow:inset 0 0 30px rgba(255,236,190,.55)`, strip);
          const dim = CR.el('div', 'position:absolute;inset:0;background:#3A3732', fr);
          CR.on(t => { dim.style.opacity = (.82 * (1 - CR.sseg(t, t0 - .25, t0 + .2))).toFixed(3); });
          CR.text(fr, v.date || '', { font: 'head', size: dsz, x: 20, y: 40, width: fw - 40, align: 'center', nowrap: true, color: m ? pal.accent : ink, onLight: true, anim: 'none', t0: 0, glow: false });
          CR.el('div', `position:absolute;left:${fw / 2 - 26}px;top:${48 + dsz * 1.25}px;width:52px;height:2px;background:${m ? pal.accent : CR.rgba(ink, .35)}`, fr);
          CR.text(fr, v.label || '', { font: 'serif', size: lsz, x: 22, y: 70 + dsz * 1.25, width: fw - 44, align: 'center', lh: 1.22, color: ink, onLight: true, anim: 'none', t0: 0, glow: false });
          fr.appendChild(dim);
          CR.el('div', `position:absolute;left:${x}px;top:${75 + fh + 10}px;width:${fw}px;text-align:center;font-family:${F.mono};font-size:20px;font-weight:700;color:#E8B04A;letter-spacing:.1em;opacity:.85`, strip, esc(String(i + 1)));
          if (m) { const cx = sx + x + fw / 2, cy = sy + 75 + fh / 2; ltRing(s, cx, cy, fw * .6, fh * .6, 141, Math.min(D - .8, t0 + .45), .6); } });
        source(CR.L.front, { align: 'center', paper: true, font: 'mono', upper: false, size: 22, y: sy + sh + 40 });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, sy + sh / 2];
      } },
      stencil: { build() {
        // concrete: a line sprayed along the wall, each date stencilled over it in worn paint (the one that matters in
        // the accent paint), and what happened typed on a small notice taped under its date as the moment arrives
        const e = evs(), n = e.length, mi = evMark(), paint = ccPaint(), acc = ccAcc(), ly = n > 4 ? 430 : 500;
        if (S.title) ccText(CR.L.front, String(S.title).toUpperCase(), { font: 'stamp', size: 52, ls: .04, x: M, y: 170, width: W - 2 * M, nowrap: true, color: paint, anim: 'mask_wipe', t0: at(.1), glow: false });
        // up to 4 events: one notice under each date; 5-6: the notices in two staggered rows (every other one hangs
        // lower on a painted drop line), so each is twice as wide and a label never runs out of its notice
        const slot = (W - 2 * M) / n, dense = n > 4, sp = Math.min(380, slot - 20), nw = dense ? Math.min(440, 2 * slot - 48) : sp;
        const xs = evX(M + sp / 2, W - M - sp / 2, sp + 20);
        const ln = ccSpray(CR.el('div', `position:absolute;left:${M - 20}px;top:${ly}px;width:${W - 2 * M + 40}px;height:7px;background:${paint};transform-origin:0 50%`, CR.L.front));
        CR.on(t => { ln.style.transform = `scaleX(${CR.sseg(t, at(.15), at(.15) + .9).toFixed(4)})`; });
        const a0 = at(.5), a1 = Math.min(D * .62, a0 + 2.5 * CR.ts), ts = evTimes(a0, a1);
        // the dates keep air between them (the closest two events stand sp + 20 apart)
        const dsz = Math.min(58, ...e.map(v => fitSize(String(v.date || '').toUpperCase(), 'stamp', sp - 70, 52, 22)));
        const lz = dense ? 26 : 30, row1 = [];
        const note = (v, i, y) => { const x = clamp(xs[i] - nw / 2, M - 50, W - M + 50 - nw);
          return ccNote(CR.L.mid, x, y, [{ t: String(v.label || ''), size: lz }], { w: nw, t0: ts[i] + .05, t1: ts[i] + .3, rot: [-1.4, .9, -.6, 1.2, -1, .7][i % 6], seed: 70 + i, pad: 26, caret: false }); };   // several notices: no caret on any
        e.forEach((v, i) => { const x = xs[i], t0 = ts[i], m = i === mi, col = m ? acc : paint;
          const tk = ccSpray(CR.el('div', `position:absolute;left:${x - 4}px;top:${ly - 20}px;width:8px;height:46px;background:${col}`, CR.L.front));
          CR.on(t => { tk.style.opacity = (.93 * CR.sseg(t, t0 - .1, t0 + .1)).toFixed(3); });
          ccText(CR.L.front, String(v.date || '').toUpperCase(), { font: 'stamp', size: dsz, x: x - sp / 2 - 10, y: ly - 44 - dsz * 1.15, width: sp + 20, align: 'center', nowrap: true, color: col, anim: 'mask_wipe', t0, glow: false });
          if (!dense || i % 2 === 0) row1.push(note(v, i, ly + 46)); });
        if (dense) { const y2 = ly + 46 + Math.max(0, ...row1.map(r => r.h)) + 34;
          e.forEach((v, i) => { if (i % 2 === 0) return; const x = xs[i], t0 = ts[i];
            const drop = ccSpray(CR.el('div', `position:absolute;left:${x - 2}px;top:${ly + 26}px;width:4px;height:${y2 - ly - 20}px;background:${i === mi ? acc : paint};transform-origin:50% 0`, CR.L.mid));
            CR.on(t => { drop.style.transform = `scaleY(${CR.sseg(t, t0 - .05, t0 + .2).toFixed(4)})`; });
            note(v, i, y2); }); }
        source(CR.L.front, { align: 'right', x: M, width: W - 2 * M, y: H - 80 });
        CR.beat = mi >= 0 ? ts[mi] : ts[n - 1]; CR.focus = [W / 2, ly + 100];
      } },
    },
  });

  // ══ SPLIT-FLAP BOARD — a departure board of rows ════════════════════════════════════════════════════════════
  const FLAPSEQ = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-/';
  const fRows = () => (Array.isArray(S.rows) ? S.rows : []).filter(r => Array.isArray(r)).slice(0, 8).map(r => r.slice(0, 4).map(c => String(c == null ? '' : c).toUpperCase()));
  const fWidths = () => { const rs = fRows(), nc = Math.max(1, ...rs.map(r => r.length));
    const ws = Array.isArray(S.widths) && S.widths.length === nc ? S.widths.map(x => Math.max(1, x | 0)) : [...Array(nc)].map((_, j) => Math.max(1, ...rs.map(r => (r[j] || '').length)));
    return ws; };
  const fMark = () => { const n = fRows().length; return (typeof S.mark === 'number' && S.mark >= 0 && S.mark < n) ? S.mark : -1; };
  // one flap cell: the drum turns through the board's own letter sequence to its character (top flap falls, the
  // bottom flap lands); settle = the second it stops
  const flapCell = (parent, ch, x, y, cw, chh, o) => {
    const fsz = Math.round(chh * .74), bg = o.bg || '#1B1B1A', ink = o.ink || '#F2EFE6', rad = Math.max(2, cw * .08);
    const c = CR.el('div', `position:absolute;left:${x}px;top:${y}px;width:${cw}px;height:${chh}px;border-radius:${rad}px;background:${bg};overflow:hidden;` +
      `box-shadow:inset 0 1px 0 rgba(255,255,255,.08), inset 0 -2px 0 rgba(0,0,0,.45), 0 2px 3px rgba(0,0,0,.5)`, parent);
    const face = css => CR.el('div', `position:absolute;left:0;right:0;top:0;height:${chh}px;display:flex;align-items:center;justify-content:center;font-family:${F.cond};font-weight:600;font-size:${fsz}px;color:${ink};${NUMCSS}${css}`, c);
    const top = face('clip-path:inset(0 0 50% 0)'), bot = face('clip-path:inset(50% 0 0 0)');
    const fT = face(`clip-path:inset(0 0 50% 0);transform-origin:50% ${chh / 2}px;background:${bg}`), fB = face(`clip-path:inset(50% 0 0 0);transform-origin:50% ${chh / 2}px;background:${bg}`);
    CR.el('div', `position:absolute;left:0;right:0;top:${chh / 2 - .75}px;height:1.5px;background:rgba(0,0,0,.7)`, c);
    CR.el('div', `position:absolute;left:-1px;top:${chh / 2 - 3}px;width:3px;height:6px;background:#0A0A0A;border-radius:1px`, c); CR.el('div', `position:absolute;right:-1px;top:${chh / 2 - 3}px;width:3px;height:6px;background:#0A0A0A;border-radius:1px`, c);
    const sh = CR.el('div', `position:absolute;left:0;right:0;top:${chh / 2}px;height:${chh / 2}px;background:rgba(0,0,0,.42);opacity:0;pointer-events:none`, c);
    const ti = FLAPSEQ.indexOf(ch), k = Math.max(0, o.flips | 0);
    const seq = []; if (ti >= 0) { for (let i = k; i >= 1; i--) seq.push(FLAPSEQ[(ti - i + FLAPSEQ.length * 4) % FLAPSEQ.length]); } else for (let i = 0; i < k; i++) seq.push(FLAPSEQ[1 + Math.floor(CR.hash(i, o.seed || 1) * 26)]);
    seq.push(ch);
    const rate = o.rate || 16, t0 = o.t0 || 0, settle = t0 + (seq.length - 1) / rate;
    const set = (el, s) => { if (el.textContent !== s) el.textContent = s; };
    const upd = t => {
      if (t < t0) { set(top, seq[0]); set(bot, seq[0]); fT.style.opacity = fB.style.opacity = 0; sh.style.opacity = 0; return; }
      const f = Math.min(seq.length - 1, (t - t0) * rate), i = Math.floor(f), ph = f - i;
      if (i >= seq.length - 1) { set(top, ch); set(bot, ch); fT.style.opacity = fB.style.opacity = 0; sh.style.opacity = 0; return; }
      const cur = seq[i], nxt = seq[i + 1];
      set(top, nxt); set(bot, cur);
      if (ph < .5) { set(fT, cur); fT.style.opacity = 1; fT.style.transform = `scaleY(${(1 - ph * 2).toFixed(3)})`; fB.style.opacity = 0; sh.style.opacity = (ph * 1.2).toFixed(3); }
      else { set(fB, nxt); fB.style.opacity = 1; fB.style.transform = `scaleY(${((ph - .5) * 2).toFixed(3)})`; fT.style.opacity = 0; sh.style.opacity = ((1 - ph) * 1.2).toFixed(3); }
    };
    CR.on(upd); upd(-1);
    return { el: c, settle };
  };
  // a row of cells laid out by the board's column widths (one blank cell between columns)
  const flapRow = (parent, cells, ws, x, y, cw, chh, gap, o) => {
    let cx = x, last = 0; const out = [];
    ws.forEach((w, j) => { const s = String(cells[j] || '').slice(0, w), al = o.right && o.right(j) ? 'r' : 'l', pad = w - s.length;
      for (let k = 0; k < w; k++) { const ch = al === 'r' ? (k < pad ? ' ' : s[k - pad]) : (s[k] || ' ');
        const cell = flapCell(parent, ch, cx, y, cw, chh, Object.assign({}, o, { ink: o.inkOf ? o.inkOf(j) : o.ink, t0: (o.t0 || 0) + (j * 4 + k) * .028, flips: ch === ' ' ? 0 : 3 + Math.floor(CR.hash(k + j * 17, (o.seed || 3) + y) * (o.maxFlips || 9)), seed: k * 7 + j }));
        last = Math.max(last, cell.settle); out.push(cell); cx += cw + gap; }
      cx += cw * .55; });
    return { settle: last, w: cx - x };
  };
  const boardDom = (parent, o) => {
    // the board: a black housing, a header line (the board's title + column heads), the rows of flaps
    const rs = fRows(), ws = fWidths(), nchar = ws.reduce((a, b) => a + b, 0), nr = rs.length, mi = fMark();
    const gap = 3, avail = o.w - 120, cw = Math.max(18, Math.min(o.maxCell || 58, (avail - gap * nchar) / (nchar + .55 * (ws.length - 1)))), chh = Math.round(cw * 1.42), rowGap = Math.round(chh * .28);
    const bw = 60 * 2 + nchar * (cw + gap) + (ws.length - 1) * cw * .55, bh = 150 + nr * (chh + rowGap) + 40;
    const box = CR.el('div', `position:absolute;left:${o.x}px;top:${o.y}px;width:${bw}px;height:${bh}px;border-radius:12px;` +
      `background:linear-gradient(180deg,#232322 0%,#121211 60%,#0D0D0C 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.1), 0 40px 90px rgba(0,0,0,.6), 0 8px 18px rgba(0,0,0,.45)`, parent);
    const yell = '#F2C94C';
    CR.text(box, String(S.title || '').toUpperCase(), { font: 'cond', size: 46, weight: 600, ls: .14, x: 60, y: 40, width: bw - 120, nowrap: true, color: '#F2EFE6', onLight: false, glow: false, anim: 'mask_wipe', t0: at(.1) });
    const heads = Array.isArray(S.cols) ? S.cols : [];
    let hx = 60; ws.forEach((w, j) => { if (heads[j]) CR.text(box, String(heads[j]).toUpperCase(), { font: 'mono', size: 18, ls: .1, x: hx, y: 112, width: w * (cw + gap), nowrap: true, color: CR.rgba('#F2EFE6', .55), onLight: false, glow: false, anim: 'none', t0: at(.15) }); hx += w * (cw + gap) + cw * .55; });
    let settle = 0;
    rs.forEach((r, i) => { const ry = 146 + i * (chh + rowGap), m = i === mi;
      const row = flapRow(box, r, ws, 60, ry, cw, chh, gap, { t0: (o.t0 || at(.3)) + i * (o.rowStep || .18), seed: i * 13 + 5, rate: 16, inkOf: j => (m && j === ws.length - 1) ? (o.markInk || yell) : '#F2EFE6', right: o.right });
      settle = Math.max(settle, row.settle); });
    return { el: box, w: bw, h: bh, settle, cw, chh };
  };
  CR.scene('split_flap_board', {
    s: 6.0,
    layout: { void_black: 'board', navy_falloff: 'closeup', charcoal_light: 'closeup', glass_dark: 'perspective', paper_desk: 'manifest', newsprint: 'listing',
              blueprint: 'board', concrete: 'board', light_table: 'manifest', footage_sharp: 'closeup', footage_moving: 'closeup' },
    comps: {
      board: { build() {
        // void / concrete / blueprint: the whole board in its black housing — the rows flip in from the top, every cell
        // turning through the board's letters to its own; the row that matters lands last, its status in yellow
        const bw0 = W - 2 * M + 40;
        const b = boardDom(CR.L.mid, { x: 0, y: 0, w: bw0, t0: at(.25), markInk: CR.mix(pal.accent, '#F2C94C', .35) });
        b.el.style.left = ((W - b.w) / 2).toFixed(0) + 'px'; b.el.style.top = ((H - b.h) / 2 - 20).toFixed(0) + 'px';
        CR.enter(b.el, { kind: 'fade', t0: 0, dur: .5 });
        source(CR.L.front, { x: (W - b.w) / 2, width: b.w, y: (H + b.h) / 2 - 4, align: 'right' });
        CR.beat = Math.min(D - .5, b.settle); CR.focus = [W / 2, H / 2];
      } },
      closeup: { build() {
        // navy / charcoal / footage: the camera close on the board — only the row that matters, big, flipping into
        // place between the soft rows above and below it, cut by the frame
        if (CR.foot) { CR.footLook(10, .25, .6); veil(CR.L.back, 'all'); }
        const rs = fRows(), ws = fWidths(), mi = Math.max(0, fMark()), nchar = ws.reduce((a, b) => a + b, 0), gap = 5;
        const cw = Math.min(118, (W - 2 * M + 80 - gap * nchar) / (nchar + .55 * (ws.length - 1))), chh = Math.round(cw * 1.42), rowGap = Math.round(chh * .3);
        const rw = nchar * (cw + gap) + (ws.length - 1) * cw * .55, x0 = (W - rw) / 2, yc = H / 2 - chh / 2 + 30;
        const back = CR.el('div', `position:absolute;left:${x0 - 80}px;top:-40px;width:${rw + 160}px;height:${H + 80}px;background:linear-gradient(180deg,#141413,#0E0E0D);box-shadow:0 0 120px rgba(0,0,0,.7)`, CR.L.back);
        CR.enter(back, { kind: 'fade', t0: 0, dur: .5 });
        [-1, 1, -2, 2].forEach(dk => { const i = mi + dk; if (i < 0 || i >= rs.length) return;
          const lay = CR.el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px;filter:blur(${Math.abs(dk) * 2.2}px);opacity:${Math.abs(dk) === 1 ? .55 : .3}`, CR.L.mid);
          flapRow(lay, rs[i], ws, x0, yc + dk * (chh + rowGap) - (dk < 0 ? 56 : 0), cw, chh, gap, { t0: at(.15) + Math.abs(dk) * .1, seed: i * 13 + 5, maxFlips: 5 }); });
        const front = CR.el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, CR.L.front);
        const markInk = CR.mix(pal.accent, '#F2C94C', .35);
        const row = flapRow(front, rs[mi] || [], ws, x0, yc, cw, chh, gap, { t0: at(.35), seed: mi * 13 + 5, inkOf: j => j === ws.length - 1 ? markInk : '#F2EFE6', maxFlips: 11 });
        if (S.title) CR.label(CR.L.front, S.title, { x: x0, y: yc - 52, size: 26, ls: .3, t0: at(.1), color: pal.accent, nowrap: true, width: rw });
        source(CR.L.front, { x: x0, width: rw, align: 'right' });
        CR.beat = Math.min(D - .5, row.settle); CR.focus = [W / 2, yc + chh / 2];
      } },
      perspective: { build() {
        // glass: the board seen from the concourse — turned away into depth, its far end softer and darker, the rows
        // flipping in as the camera drifts
        const wrap = CR.el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px;perspective:1700px;perspective-origin:30% 50%`, CR.L.mid);
        const b = boardDom(wrap, { x: 0, y: 0, w: W * 1.06, t0: at(.3), maxCell: 62, markInk: CR.mix(CR.mix(pal.accent, '#FFFFFF', .25), '#F2C94C', .3) });
        b.el.style.left = (W * .04).toFixed(0) + 'px'; b.el.style.top = ((H - b.h) / 2).toFixed(0) + 'px';
        b.el.style.transformOrigin = '0 50%'; b.el.style.transform = 'rotateY(20deg)';   // + = the right end recedes
        const shade = CR.el('div', `position:absolute;inset:0;border-radius:12px;background:linear-gradient(90deg, rgba(0,0,0,0) 45%, rgba(4,6,10,.38) 100%);pointer-events:none`, b.el);
        void shade;
        CR.enter(wrap, { kind: 'fade', t0: 0, dur: .6 });
        const rf = CR.el('div', `position:absolute;left:0;top:${(H + b.h) / 2 + 10}px;width:${W}px;height:200px;background:linear-gradient(180deg, ${CR.rgba(pal.glow, .06)}, rgba(0,0,0,0));filter:blur(8px)`, CR.L.back); void rf;
        source(CR.L.front, { y: H - 92 });
        CR.beat = Math.min(D - .5, b.settle); CR.focus = [W * .42, H / 2];
      } },
      manifest: { build() {
        // paper / light table: the board's paper twin — a typed manifest, its rows typed in columns with dot leaders,
        // the status of the row that matters stamped in red
        const rs = fRows(), ws = fWidths(), mi = fMark(), heads = Array.isArray(S.cols) ? S.cols : [];
        const sw = 1480, rowH = Math.min(84, 560 / Math.max(1, rs.length)), sh = 230 + rs.length * rowH + 90, ink = pal.sink, dk = CR.mix(ink, CR.light ? pal.ground : pal.paper, .4);
        const sx = (W - sw) / 2, sy = (H - sh) / 2;
        let host;
        if (CR.light) { host = CR.el('div', `position:absolute;left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;background:${CR.rgba('#FFFFFF', .72)};box-shadow:0 14px 30px rgba(0,0,0,.16)`, CR.L.mid); CR.enter(host, { kind: 'rise', t0: 0, dur: .6 }); }
        else host = sheetOn(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, seed: 53, age: .55, rot: -.5 }).el;
        const X = 90, total = ws.reduce((a, b) => a + b, 0) + ws.length * 2, csz = Math.min(32, Math.floor((sw - 2 * X) / total / .6));
        if (S.title) CR.text(host, String(S.title).toUpperCase(), { font: 'mono', size: 34, weight: 700, ls: .06, x: X, y: 70, width: sw - 2 * X, color: ink, onLight: true, anim: 'typewriter', t0: at(.3), cps: 30 });
        const colX = []; let cx = X; ws.forEach(w => { colX.push(cx); cx += (w + 2) * csz * .6; }); colX[ws.length - 1] = sw - X - ws[ws.length - 1] * csz * .6;
        heads.forEach((h_, j) => j < ws.length && CR.text(host, String(h_).toUpperCase(), { font: 'mono', size: 22, ls: .06, x: colX[j], y: 140, width: ws[j] * csz * .6 + 40, nowrap: true, color: dk, onLight: true, anim: 'none', t0: at(.4) }));
        CR.el('div', `position:absolute;left:${X}px;top:${176}px;width:${sw - 2 * X}px;height:2px;background:${CR.rgba(ink, .6)}`, host);
        const a0 = tb(.7, .35), per = Math.max(.18, Math.min(.5, (D * .6 - a0) / Math.max(1, rs.length)));
        rs.forEach((r, i) => { const ry = 196 + i * rowH, t0 = a0 + i * per;
          r.forEach((c, j) => { if (j >= ws.length) return; const stamp = i === mi && j === ws.length - 1;
            if (stamp) CR.text(host, c, { font: 'stamp', size: Math.round(csz * 1.05), x: colX[j] - 16, y: ry - 10, color: pal.accent, onLight: true, anim: 'stamp', t0: Math.min(D - .8, t0 + .45), rot: -4 });
            else CR.text(host, c, { font: 'mono', size: csz, weight: j === 0 ? 700 : 400, x: colX[j], y: ry, width: ws[j] * csz * .62 + 20, nowrap: true, color: ink, onLight: true, anim: 'typewriter', caret: NOC, t0: t0 + j * .08, cps: 60 }); });
          if (i < rs.length - 1) CR.el('div', `position:absolute;left:${X}px;top:${ry + rowH - 14}px;width:${sw - 2 * X}px;height:1px;background-image:radial-gradient(circle, ${CR.rgba(ink, .4)} 1px, rgba(0,0,0,0) 1.4px);background-size:9px 2px`, host); });
        const s = srcText(); if (s) CR.text(host, s, { font: 'mono', size: 22, x: X, y: sh - 62, width: sw - 2 * X, align: 'right', color: dk, onLight: true, anim: 'none', t0: tb(1.3, .7) });
        CR.beat = mi >= 0 ? a0 + mi * per + .45 : a0; CR.focus = [W / 2, sy + sh / 2];
      } },
      listing: { build() {
        // newsprint: the paper's listings — a black head bar, the rows set in the condensed face between hairlines with
        // dot leaders to the last column, the row that matters in bold red
        const L = CR.L.front, rs = fRows(), ws = fWidths(), mi = fMark(), ink = pal.sink, tw2 = 1300, x0 = (W - tw2) / 2, rowH = Math.min(78, 560 / Math.max(1, rs.length));
        const heads = Array.isArray(S.cols) ? S.cols : [];
        const y0 = (H - (90 + rs.length * rowH)) / 2;
        const bar = CR.el('div', `position:absolute;left:${x0}px;top:${y0}px;width:${tw2}px;height:72px;background:${ink}`, L); CR.enter(bar, { kind: 'fade', t0: at(.1), dur: .4 });
        CR.text(bar, String(S.title || '').toUpperCase(), { font: 'cond', size: 38, weight: 600, ls: .16, x: 28, y: 14, width: tw2 - 56, nowrap: true, color: pal.ground, onLight: false, glow: false, anim: 'mask_wipe', t0: at(.2) });
        const colX = [x0 + 10, x0 + 10 + Math.max(150, ws[0] * 24 + 40)], last = ws.length - 1;
        rs.forEach((r, i) => { const ry = y0 + 90 + i * rowH, t0 = at(.35 + i * .11), m = i === mi, col = m ? pal.accent : ink, wt = m ? 700 : 500;
          CR.text(L, r[0] || '', { font: 'cond', size: 34, weight: 700, x: colX[0], y: ry, width: colX[1] - colX[0] - 10, nowrap: true, color: col, onLight: true, anim: 'mask_wipe', t0, glow: false });
          const mid = r.slice(1, Math.max(1, last)).filter(Boolean).join('  ');
          if (last > 0) CR.text(L, mid, { font: 'cond', size: 34, weight: wt, x: colX[1], y: ry, width: tw2 - (colX[1] - x0) - 300, nowrap: true, color: col, onLight: true, anim: 'mask_wipe', t0: t0 + .05, glow: false });
          if (last > 0) CR.text(L, r[last] || '', { font: 'cond', size: 34, weight: 700, x: x0 + tw2 - 300, y: ry, width: 290, align: 'right', nowrap: true, color: col, onLight: true, anim: 'mask_wipe', t0: t0 + .1, glow: false });
          CR.el('div', `position:absolute;left:${x0}px;top:${ry + rowH - 16}px;width:${tw2}px;height:1px;background:${CR.rgba(ink, .3)}`, L); });
        if (heads.length) CR.text(L, heads.map(String).join('  ·  ').toUpperCase(), { font: 'mono', size: 20, x: x0, y: y0 - 40, width: tw2, nowrap: true, color: CR.mix(ink, pal.ground, .35), onLight: true, anim: 'none', t0: at(.2), glow: false });
        source(L, { x: x0, width: tw2, y: y0 + 90 + rs.length * rowH + 10, font: 'serif', upper: false, size: 24, ls: 0, paper: true, color: CR.mix(ink, pal.ground, .3) });
        CR.beat = at(.35 + Math.max(0, mi) * .11); CR.focus = [W / 2, H / 2];
      } },
    },
  });

  // ══ TERMINAL SCREEN — a real command / log / code on a screen ══════════════════════════════════════════════════
  const tLines = () => (Array.isArray(S.lines) ? S.lines : []).map(l => typeof l === 'object' && l ? { t: String(l.t || ''), cmd: !!l.cmd } : { t: String(l), cmd: /^\s*[$>#]\s/.test(String(l)) }).slice(0, 16);
  const tMark = () => { const n = tLines().length; return (typeof S.mark === 'number' && S.mark >= 0 && S.mark < n) ? S.mark : -1; };
  // the session's clock: a command types at `cps`, an output line appears whole a beat after the one before (as a
  // terminal prints it) — squeezed so the whole screen is there by 70 % of the scene
  const tPlan = (t0, cps = 24) => { const ls = tLines(); let t = t0; const raw = ls.map(l => { const s = t, d = l.cmd ? Math.max(.25, l.t.length / cps) : .1; t += d + (l.cmd ? .22 : .09); return [s, d]; });
    const end = D * .7, k = t > end && t > t0 ? (end - t0) / (t - t0) : 1; return raw.map(([s, d]) => [t0 + (s - t0) * k, d * k]); };
  const termBody = (host, o) => {
    // the lines in the mono face: commands typed (the prompt in its colour), output printed, a block cursor, the line
    // that matters lit once it is there; o: x, y, w, size, lh, ink, dim, prompt, band, maxLines (scrolls past it)
    const ls = tLines(), plan = tPlan(o.t0 || at(.4), o.cps), mi = tMark(), size = o.size || 30, lh = Math.round(size * (o.lh || 1.45)), maxL = o.maxLines || 14;
    const box = CR.el('div', `position:absolute;left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${Math.min(ls.length, maxL) * lh + 8}px;overflow:hidden`, host);
    const col = CR.el('div', 'position:absolute;left:0;top:0;width:100%', box);
    const rows = ls.map((l, i) => {
      const r = CR.el('div', `position:absolute;left:0;top:${i * lh}px;width:100%;height:${lh}px;font-family:${F.mono};font-size:${size}px;line-height:${lh}px;white-space:pre;overflow:hidden;color:${o.ink}`, col);
      if (o.shadow) r.style.textShadow = o.shadow;
      if (i === mi) { const b = CR.el('div', `position:absolute;left:-12px;right:-12px;top:2px;bottom:2px;background:${o.band};opacity:0`, r); r._band = b; }
      const txt = l.cmd ? l.t.replace(/^\s*[$>#]\s?/, '') : l.t, pr = l.cmd ? (o.prompt || '$') + ' ' : '';
      const pe = CR.el('span', `color:${o.promptColor || o.ink};position:relative`, r, esc(pr)), te = CR.el('span', `position:relative;color:${l.cmd ? o.ink : (o.dim || o.ink)}`, r);
      return { r, pe, te, txt, cmd: l.cmd, s: plan[i][0], d: plan[i][1] };
    });
    const cur = CR.el('span', `display:inline-block;width:.6em;height:1em;vertical-align:-.15em;background:${o.cursor || o.ink};margin-left:2px;position:relative`, null);
    CR.on(t => {
      let lastShown = -1;
      rows.forEach((w, i) => { const on = t >= w.s;
        w.r.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return; lastShown = i;
        const n = w.cmd ? Math.floor(clamp((t - w.s) / Math.max(.01, w.d)) * w.txt.length + 1e-6) : w.txt.length;
        const s = w.txt.slice(0, n); if (w.te.textContent !== s) w.te.textContent = s;
        if (w.r._band) w.r._band.style.opacity = (CR.sseg(t, w.s + w.d + .15, w.s + w.d + .5) * .9).toFixed(3); });
      const li = lastShown >= 0 ? lastShown : 0, w = rows[li];
      if (w && cur.parentNode !== w.r) w.r.appendChild(cur);
      const done = rows.length ? t - (rows[rows.length - 1].s + rows[rows.length - 1].d) : 0;
      cur.style.opacity = (t < (o.t0 || 0) - .3) ? 0 : (done > 0 ? (Math.floor(done * 2.4) % 2 ? 0 : 1) : 1);
      const over = Math.max(0, li - maxL + 1); col.style.transform = `translateY(${(-over * lh).toFixed(1)}px)`;
    });
    return { box, end: rows.length ? rows[rows.length - 1].s + rows[rows.length - 1].d : 0, markAt: mi >= 0 ? rows[mi].s + rows[mi].d : -1, lh, h: Math.min(ls.length, maxL) * lh };
  };
  CR.scene('terminal_screen', {
    s: 5.0,
    layout: { void_black: 'phosphor', navy_falloff: 'console', charcoal_light: 'window', glass_dark: 'window', paper_desk: 'printout', newsprint: 'excerpt',
              blueprint: 'console', concrete: 'teletype', light_table: 'printout', footage_sharp: 'window', footage_moving: 'window' },
    comps: {
      phosphor: { build() {
        // void: the screen itself — a dark curved glass with the phosphor of the title's light, scan lines, the commands
        // typed and the output printed, the line that matters lit in reverse
        const ph = CR.mix(pal.glow, '#FFFFFF', .12), gx = M - 20, gy = 96, gw = W - 2 * M + 40, gh = H - 192;
        const scr = CR.el('div', `position:absolute;left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px;border-radius:38px;overflow:hidden;` +
          `background:radial-gradient(ellipse at 50% 45%, ${CR.mix(pal.ground, ph, .07)} 0%, ${CR.mix(pal.ground, '#000000', .3)} 75%);box-shadow:inset 0 0 120px rgba(0,0,0,.9), inset 0 0 0 2px rgba(255,255,255,.04), 0 0 0 14px #0A0A0A, 0 0 0 16px rgba(255,255,255,.05), 0 40px 120px rgba(0,0,0,.8)`, CR.L.mid);
        CR.enter(scr, { kind: 'fade', t0: 0, dur: .5 });
        const halo = CR.glow.family === 'none' ? `0 0 ${(.18 * 32).toFixed(1)}px ${CR.rgba(ph, .45)}` : CR.glowText(32, ph);
        if (S.title) CR.text(scr, S.title, { font: 'mono', size: 24, x: 90, y: 64, width: gw - 180, nowrap: true, color: CR.rgba(ph, .55), anim: 'none', t0: at(.1), glow: false, shadow: halo });
        // a short session is set larger (never wider than the longest line allows) and sits in the middle of the glass
        const tl = tLines(), tn = tl.length, mxc = Math.max(8, ...tl.map(l => l.t.length));
        const tsz = Math.max(26, Math.min(tn <= 3 ? 52 : tn <= 4 ? 46 : tn <= 8 ? 36 : 32, Math.floor((gw - 200) / (mxc * .61))));
        const y0t = S.title ? 130 : 80, bh = Math.min(tn, Math.floor((gh - 220) / (tsz * 1.45))) * Math.round(tsz * 1.45), ty = Math.max(y0t, Math.round((gh - bh) / 2 - 10));
        termBody(scr, { x: 90, y: ty, w: gw - 180, size: tsz, maxLines: Math.floor((gh - 220) / (tsz * 1.45)), ink: ph, dim: CR.mix(ph, pal.ground, .25), prompt: S.prompt || '$', promptColor: ph, band: CR.rgba(ph, .2), cursor: ph, shadow: halo, t0: at(.35) });
        CR.el('div', 'position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg, rgba(0,0,0,.26) 0 1px, rgba(0,0,0,0) 1px 3px);mix-blend-mode:multiply', scr);
        CR.el('div', 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 30% 18%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%)', scr);
        source(CR.L.front, { y: H - 70, align: 'right', x: M, width: W - 2 * M, size: 20 });
        CR.beat = at(.6); CR.focus = [W / 2, H / 2];
      } },
      console: { build() {
        // navy / blueprint: the briefing console — a ruled frame, the title in mono capitals, a gutter of line numbers,
        // the lines streaming in, the line that matters banded in the accent
        // the frame is as tall as the session (a 3-line session left three quarters of a fixed 760 px frame empty),
        // short sessions set larger, never wider than the longest line allows; the frame centred on the frame
        const L = CR.L.front, ink = pal.ink, line = CR.W === 'blueprint', fx = M, fw = W - 2 * M, tl0 = tLines(), n = tl0.length;
        const mxc = Math.max(8, ...tl0.map(l => l.t.length + 2)), size = Math.max(26, Math.min(n <= 3 ? 44 : n <= 5 ? 38 : n <= 8 ? 30 : 28, Math.floor((fw - 180) / (mxc * .61))));
        const lh = Math.round(size * 1.5), maxL = Math.min(n, Math.floor(660 / lh)), fh = Math.max(300, 58 + 44 + maxL * lh + 40), fy = Math.round((H - fh) / 2 - 10);
        const fr = CR.el('div', `position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border:1.5px solid ${CR.rgba(ink, .4)};${line ? '' : `background:${CR.rgba(CR.mix(pal.ground, '#000', .3), .55)};`}`, CR.L.mid);
        CR.enter(fr, { kind: 'fade', t0: 0, dur: .5 });
        CR.el('div', `position:absolute;left:0;right:0;top:0;height:58px;border-bottom:1.5px solid ${CR.rgba(ink, .4)}`, fr);
        CR.text(fr, String(S.title || '').toUpperCase(), { font: 'mono', size: 22, ls: .1, x: 28, y: 16, width: fw - 56, nowrap: true, color: pal.accent, anim: 'typewriter', t0: at(.15), cps: 40, glow: false });
        for (let i = 0; i < Math.min(n, maxL); i++) CR.text(fr, String(i + 1).padStart(2, '0'), { font: 'mono', size: 22, x: 22, y: 82 + i * lh + Math.round((size - 22) * .62) + 4, color: CR.rgba(ink, .32), anim: 'none', t0: at(.3), glow: false });
        CR.el('div', `position:absolute;left:78px;top:58px;bottom:0;width:1px;background:${CR.rgba(ink, .18)}`, fr);
        termBody(fr, { x: 100, y: 80, w: fw - 140, size, lh: 1.5, ink, dim: CR.mix(ink, pal.dim, .35), prompt: S.prompt || '$', promptColor: pal.accent, band: CR.rgba(pal.accent, .2), cursor: pal.accent, maxLines: maxL, t0: at(.4) });
        void L; source(CR.L.front, { y: fy + fh + 26 });
        CR.beat = at(.6); CR.focus = [W / 2, fy + fh / 2];
      } },
      window: { build() {
        // glass / charcoal / footage: a modern terminal window floating over the dark — a title bar with its three
        // quiet dots, the session in the mono face, the prompt in the accent
        if (CR.foot) { CR.footLook(10, .3, .7); veil(CR.L.back, 'all'); }
        const n = tLines().length, size = n <= 4 ? 36 : n <= 8 ? 32 : 30, lh = Math.round(size * 1.45), rows = Math.min(n, 13), ww = 1460, wh = 56 + 60 + rows * lh + 40, wx = (W - ww) / 2, wy = (H - wh) / 2;
        const win = CR.el('div', `position:absolute;left:${wx}px;top:${wy}px;width:${ww}px;height:${wh}px;border-radius:16px;overflow:hidden;` +
          `background:${CR.W === 'glass_dark' ? CR.rgba(CR.mix(pal.ground, '#0D1117', .5), .86) : '#0E1013'};box-shadow:inset 0 0 0 1px rgba(255,255,255,.09), 0 50px 120px rgba(0,0,0,.65), 0 10px 26px rgba(0,0,0,.45)`, CR.L.mid);
        CR.enter(win, { kind: 'rise', t0: 0, dur: .6 });
        const bar = CR.el('div', `position:absolute;left:0;right:0;top:0;height:56px;background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));border-bottom:1px solid rgba(255,255,255,.07)`, win);
        [0, 1, 2].forEach(k => CR.el('div', `position:absolute;left:${24 + k * 26}px;top:21px;width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,${(.22 - k * .04).toFixed(2)})`, bar));
        if (S.title) CR.text(bar, S.title, { font: 'mono', size: 22, x: 120, y: 15, width: ww - 240, align: 'center', nowrap: true, color: 'rgba(230,237,243,.6)', anim: 'none', t0: 0, glow: false });
        termBody(win, { x: 44, y: 56 + 34, w: ww - 88, size, ink: '#E6EDF3', dim: '#AEB7C2', prompt: S.prompt || '$', promptColor: pal.accent, band: CR.rgba(pal.accent, .22), cursor: '#E6EDF3', maxLines: 13, t0: at(.35) });
        source(CR.L.front, { x: wx, width: ww, y: wy + wh + 26, align: 'right' });
        CR.beat = at(.6); CR.focus = [W / 2, H / 2];
      } },
      printout: { build() {
        // paper / light table: the session as a line-printer printout — tractor-feed paper with its sprocket
        // holes and pale green bars, each line printed whole, the line that matters bracketed in red pencil
        const ls = tLines(), n = ls.length, size = 28, lh = 48, rows = Math.min(n, 14), pw = 1420, ph_ = 110 + rows * lh + 90, px = (W - pw) / 2, py = (H - ph_) / 2;
        const paper = CR.el('div', `position:absolute;left:${px}px;top:${py}px;width:${pw}px;height:${ph_}px;background:#F4F2EA url(${CR.paperURL(pw, ph_, '#F4F2EA', 57, .3)}) center/100% 100%;box-shadow:0 18px 40px rgba(0,0,0,.4), 0 2px 4px rgba(0,0,0,.3)`, CR.L.mid);
        if (CR.W === 'concrete') { CR.enter(paper, { kind: 'land', t0: 0, rot: -.5, dur: .45, dy: -14 }); CR.tape(paper, 120, 6, 130, -18); CR.tape(paper, pw - 120, 6, 130, 16); }
        else CR.enter(paper, { kind: CR.light ? 'rise' : 'land', t0: 0, rot: -.6, dur: .55 });
        // the green bars stay on the sheet (a bar past its bottom edge read as a stray stripe under every printout)
        for (let i = 0; 70 + i * lh * 2 + lh <= ph_ - 10; i++) CR.el('div', `position:absolute;left:70px;right:70px;top:${70 + i * lh * 2}px;height:${lh}px;background:rgba(150,196,150,.28)`, paper);
        [[0, 70], [pw - 70, 70]].forEach(([x, w]) => { const st = CR.el('div', `position:absolute;left:${x}px;top:0;width:${w}px;height:100%;border-${x ? 'left' : 'right'}:1px dashed rgba(80,80,70,.35)`, paper);
          for (let y = 22; y < ph_ - 10; y += 48) CR.el('div', `position:absolute;left:${w / 2 - 9}px;top:${y}px;width:18px;height:18px;border-radius:50%;background:${CR.light ? pal.ground : CR.W === 'concrete' ? '#2B2B2A' : '#17110C'};box-shadow:inset 0 1px 2px rgba(0,0,0,.5)`, st); });
        const ink = '#2A2824';
        if (S.title) CR.text(paper, String(S.title).toUpperCase(), { font: 'mono', size: 24, weight: 700, ls: .06, x: 110, y: 40, width: pw - 220, nowrap: true, color: ink, onLight: true, anim: 'none', t0: at(.15) });
        const tb2 = termBody(paper, { x: 110, y: 96, w: pw - 220, size, lh: lh / size, ink, dim: '#4A4740', prompt: S.prompt || '$', promptColor: ink, band: 'rgba(0,0,0,0)', cursor: 'rgba(0,0,0,0)', maxLines: 14, t0: at(.35), cps: 60 });
        const mi = tMark();
        if (mi >= 0 && mi < 14) { const svg = CR.svg(paper); svg.setAttribute('width', pw); svg.setAttribute('height', ph_); svg.setAttribute('viewBox', `0 0 ${pw} ${ph_}`); greaseDefs(svg);
          const yy = 96 + mi * lh, ta = Math.min(D - .7, tb2.markAt + .2);
          pencil(svg, `M100,${yy + 4} Q90,${yy + 4} 90,${yy + 14} L90,${yy + lh - 10} Q90,${yy + lh - 2} 100,${yy + lh - 2}`, { w: 4.5, grease: true, t0: ta, dur: .3 });
          const lw = Math.min(pw - 240, measure((tLines()[mi].cmd ? (S.prompt || '$') + ' ' : '') + tLines()[mi].t.replace(/^\s*[$>#]\s?/, ''), 'mono', size) + 20);
          pencil(svg, wobLine(108, yy + lh - 6, 108 + lw, 121, 2), { w: 4, grease: true, t0: ta + .25, dur: .35 }); CR.beat = ta; } else CR.beat = at(.6);
        source(CR.L.front, { x: px, width: pw, y: py + ph_ + 20, align: 'right', paper: CR.light, font: 'mono', upper: false });
        CR.focus = [W / 2, H / 2];
      } },
      excerpt: { build() {
        // newsprint: the session reprinted in the paper as a boxed figure — a tinted box, its heading in bold capitals,
        // the lines in the mono face, the line that matters underlined in red, a cutline under the box
        const L = CR.L.mid, ink = pal.sink, n = tLines().length, size = 28, lh = 44, rows = Math.min(n, 12), bw = 1320, bh = 96 + rows * lh + 50, bx = (W - bw) / 2, by = (H - bh) / 2 - 30;
        const box = CR.el('div', `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border:2px solid ${ink};background:${CR.mix(pal.ground, ink, .06)}`, L);
        CR.enter(box, { kind: 'fade', t0: 0, dur: .5 });
        const hd = CR.el('div', `position:absolute;left:0;right:0;top:0;height:62px;border-bottom:2px solid ${ink}`, box); void hd;
        CR.text(box, String(S.title || '').toUpperCase(), { font: 'cond', size: 30, weight: 700, ls: .14, x: 30, y: 13, width: bw - 60, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.15), glow: false });
        const tb2 = termBody(box, { x: 36, y: 84, w: bw - 72, size, lh: lh / size, ink, dim: CR.mix(ink, pal.ground, .25), prompt: S.prompt || '$', promptColor: ink, band: 'rgba(0,0,0,0)', cursor: ink, maxLines: 12, t0: at(.35), cps: 40 });
        const mi = tMark();
        if (mi >= 0 && mi < 12) { const lw = Math.min(bw - 80, measure(tLines()[mi].t, 'mono', size) + 30), u = CR.el('div', `position:absolute;left:36px;top:${84 + mi * lh + lh - 6}px;width:${lw}px;height:4px;background:${pal.accent};transform-origin:0 50%;transform:scaleX(0)`, box);
          const ta = Math.min(D - .6, tb2.markAt + .2); CR.on(t => { u.style.transform = `scaleX(${CR.sseg(t, ta, ta + .35).toFixed(4)})`; }); CR.beat = ta; } else CR.beat = at(.6);
        const cut = [S.note, srcText()].filter(Boolean).join(' — ');
        if (cut) CR.text(CR.L.front, cut, { font: 'serif', italic: true, size: 28, x: bx, y: by + bh + 22, width: bw, color: CR.mix(ink, pal.ground, .25), onLight: true, anim: 'mask_wipe', t0: tb(1.2), glow: false });
        CR.focus = [W / 2, H / 2];
      } },
      teletype: { build() {
        // concrete: the session as a length of teletype paper torn off the roll and taped to the wall — canary paper
        // with torn ends, each line printed whole in the machine's mono, the line that matters underlined in red
        // marker; the heading printed first, as the machine does
        const ls = tLines(), n = ls.length, mxc = Math.max(20, ...ls.map(l => l.t.length + 2)), size = Math.max(24, Math.min(n <= 4 ? 36 : 30, Math.floor(1240 / (mxc * .61)))), lh = Math.round(size * 1.6), rows = Math.min(n, 13);
        const pw = Math.min(1480, Math.max(980, mxc * size * .61 + 220)), ph_ = 150 + rows * lh + 80, px = (W - pw) / 2, py = Math.max(60, (H - ph_) / 2 - 10);
        const zig = (k, top) => { const pts = []; for (let i = 0; i <= 40; i++) pts.push(`${(i / 40 * 100).toFixed(2)}% ${top ? (CR.hash(i, k) * 12).toFixed(1) + 'px' : `calc(100% - ${(CR.hash(i, k) * 12).toFixed(1)}px)`}`); return pts; };
        // the shadow on a holder: a clip-path cuts away its own element's drop shadow
        const hold = CR.el('div', `position:absolute;left:${px}px;top:${py}px;width:${pw}px;height:${ph_}px;filter:drop-shadow(0 16px 24px rgba(0,0,0,.45))`, CR.L.mid);
        const paper = CR.el('div', `position:absolute;left:0;top:0;width:${pw}px;height:${ph_}px;background:#EFE4B6 url(${CR.paperURL(pw, ph_, '#EFE4B6', 91, .35)}) center/100% 100%;` +
          `clip-path:polygon(${zig(7, true).join(',')}, ${zig(9, false).reverse().join(',')})`, hold);
        CR.enter(hold, { kind: 'land', t0: 0, rot: -.5, dur: .45, dy: -14 });
        CR.tape(hold, 130, 10, 140, -16); CR.tape(hold, pw - 130, 10, 140, 18);
        const ink = '#2B2925';
        if (S.title) CR.text(paper, String(S.title).toUpperCase(), { font: 'mono', size: Math.min(28, size), weight: 700, ls: .06, x: 100, y: 62, width: pw - 200, nowrap: true, color: ink, onLight: true, anim: 'none', t0: at(.15) });
        CR.el('div', `position:absolute;left:100px;top:${S.title ? 112 : 70}px;width:${pw - 200}px;height:0;border-top:2px dashed ${CR.rgba(ink, .35)}`, paper);
        const y0 = S.title ? 132 : 92;
        const tb2 = termBody(paper, { x: 100, y: y0, w: pw - 200, size, lh: lh / size, ink, dim: '#4A463E', prompt: S.prompt || '$', promptColor: ink, band: 'rgba(0,0,0,0)', cursor: 'rgba(0,0,0,0)', maxLines: 13, t0: at(.35), cps: 60 });
        const mi = tMark();
        if (mi >= 0 && mi < 13) { const svg = CR.svg(paper); svg.setAttribute('width', pw); svg.setAttribute('height', ph_); svg.setAttribute('viewBox', `0 0 ${pw} ${ph_}`); greaseDefs(svg);
          const yy = y0 + mi * lh, ta = Math.min(D - .7, tb2.markAt + .2), l0 = tLines()[mi];
          const lw = Math.min(pw - 220, measure((l0.cmd ? (S.prompt || '$') + ' ' : '') + l0.t.replace(/^\s*[$>#]\s?/, ''), 'mono', size) + 16);
          pencil(svg, wobLine(96, yy + lh - 8, 96 + lw, 181, 2.4), { w: 5, t0: ta, dur: .35 });
          pencil(svg, wobLine(104, yy + lh - 1, 96 + lw * .96, 183, 2.4), { w: 4, t0: ta + .3, dur: .3, op: .75 }); CR.beat = ta; } else CR.beat = at(.6);
        source(CR.L.front, { x: px, width: pw, y: Math.min(H - 70, py + ph_ + 26), align: 'right', font: 'mono', upper: false });
        CR.focus = [W / 2, py + ph_ / 2];
      } },
    },
  });

  // ══ SOCIAL — a real social-media action: someone follows / unfollows someone, or a real post ══════════════════
  // The platform's own skin (its colours, its button, its words in the film's language) — never its logo or its name.
  const SKIN = {
    instagram: { bg: '#FFFFFF', ink: '#000000', sub: '#737373', line: '#DBDBDB', btn: '#0095F6', btnInk: '#FFFFFF', alt: '#EFEFEF', altInk: '#000000', r: 8, wide: true, danger: '#ED4956', avatar: '#DBDBDB', ring: true },
    threads: { bg: '#FFFFFF', ink: '#000000', sub: '#999999', line: '#E5E5E5', btn: '#000000', btnInk: '#FFFFFF', alt: '#FFFFFF', altInk: '#000000', altBorder: '#D9D9D9', r: 10, wide: true, danger: '#FF3040', avatar: '#E5E5E5' },
    x: { bg: '#000000', ink: '#E7E9EA', sub: '#71767B', line: '#2F3336', btn: '#EFF3F4', btnInk: '#0F1419', alt: 'transparent', altInk: '#EFF3F4', altBorder: '#536471', r: 999, wide: false, danger: '#F4212E', avatar: '#333639', dark: true },
    tiktok: { bg: '#121212', ink: '#FFFFFF', sub: '#A8A8A8', line: '#2A2A2A', btn: '#FE2C55', btnInk: '#FFFFFF', alt: '#2F2F2F', altInk: '#FFFFFF', r: 4, wide: true, danger: '#FE2C55', avatar: '#2F2F2F', dark: true },
    youtube: { bg: '#0F0F0F', ink: '#F1F1F1', sub: '#AAAAAA', line: '#272727', btn: '#F1F1F1', btnInk: '#0F0F0F', alt: '#272727', altInk: '#F1F1F1', r: 999, wide: false, danger: '#F1F1F1', avatar: '#272727', dark: true },
    facebook: { bg: '#FFFFFF', ink: '#050505', sub: '#65676B', line: '#CED0D4', btn: '#0866FF', btnInk: '#FFFFFF', alt: '#E4E6EB', altInk: '#050505', r: 6, wide: false, danger: '#050505', avatar: '#E4E6EB' },
  };
  // the platforms' own dark modes (a light card on the void reads as a sticker; on paper the print is the light one)
  const DARKMODE = {
    instagram: { bg: '#000000', ink: '#F5F5F5', sub: '#A8A8A8', line: '#262626', alt: '#363636', altInk: '#F5F5F5', avatar: '#262626', dark: true },
    threads: { bg: '#101010', ink: '#F3F5F7', sub: '#777777', line: '#2D2D2D', btn: '#F3F5F7', btnInk: '#101010', alt: '#101010', altInk: '#F3F5F7', altBorder: '#383939', avatar: '#2D2D2D', dark: true, danger: '#FF3040' },
    facebook: { bg: '#242526', ink: '#E4E6EB', sub: '#B0B3B8', line: '#3E4042', alt: '#3A3B3C', altInk: '#E4E6EB', avatar: '#3A3B3C', dark: true, danger: '#E4E6EB' },
  };
  const skinOf = (p, dark) => Object.assign({}, SKIN[p] || SKIN.instagram, dark && DARKMODE[p] ? DARKMODE[p] : {});
  const UIW = {
    follow: { en: 'Follow', cs: 'Sledovat', pl: 'Obserwuj', de: 'Folgen' },
    following: { en: 'Following', cs: 'Sledujete', pl: 'Obserwujesz', de: 'Gefolgt' },
    unfollow: { en: 'Unfollow', cs: 'Přestat sledovat', pl: 'Przestań obserwować', de: 'Nicht mehr folgen' },
    followers: { en: 'followers', cs: 'sledujících', pl: 'obserwujących', de: 'Follower' },
    subscribe: { en: 'Subscribe', cs: 'Odebírat', pl: 'Subskrybuj', de: 'Abonnieren' },
    subscribed: { en: 'Subscribed', cs: 'Odebíráno', pl: 'Subskrybujesz', de: 'Abonniert' },
    unsubscribe: { en: 'Unsubscribe', cs: 'Zrušit odběr', pl: 'Anuluj subskrypcję', de: 'Abo beenden' },
    subscribers: { en: 'subscribers', cs: 'odběratelů', pl: 'subskrybentów', de: 'Abonnenten' },
    likes: { en: 'likes', cs: 'To se mi líbí', pl: 'polubień', de: 'Gefällt mir' },
  };
  const uw = k => (UIW[k] || {})[CR.lang] || (UIW[k] || {}).en || k;
  const plat = () => SKIN[S.platform] ? S.platform : 'instagram';
  const words = p => p === 'youtube' ? { on: uw('subscribed'), off: uw('subscribe'), drop: uw('unsubscribe'), fl: uw('subscribers') }
                                     : { on: uw('following'), off: uw('follow'), drop: uw('unfollow'), fl: uw('followers') };
  const person = k => { const v = S[k]; return (v && typeof v === 'object') ? v : { name: String(v || '') }; };
  const UIF = "'Cr UI', " + F.body;                          // the platforms' own UI sans (Inter, embedded for social pages)
  const avatar = (parent, x, y, d, who, sk) => {
    const a = CR.el('div', `position:absolute;left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;overflow:hidden;background:${sk.avatar}`, parent);
    if (who.photo) a.style.cssText += `;background:${sk.avatar} url(${who.photo}) center 30%/cover no-repeat`;
    else {                                                   // the platform's own empty avatar (no face is invented)
      const c = CR.mix(sk.avatar, sk.dark ? '#FFFFFF' : '#FFFFFF', sk.dark ? .16 : .55);
      CR.el('div', `position:absolute;left:${d * .32}px;top:${d * .18}px;width:${d * .36}px;height:${d * .36}px;border-radius:50%;background:${c}`, a);
      CR.el('div', `position:absolute;left:${d * .14}px;top:${d * .6}px;width:${d * .72}px;height:${d * .6}px;border-radius:50%;background:${c}`, a); }
    if (sk.ring) { const r = CR.el('div', `position:absolute;left:${x - d * .045}px;top:${y - d * .045}px;width:${d * 1.09}px;height:${d * 1.09}px;border-radius:50%;box-shadow:0 0 0 ${Math.max(1.5, d * .018)}px ${sk.line}`, parent); parent.insertBefore(r, a); }
    return a;
  };
  // the BIG profile card (docgfx's scale, the unfollow the founder liked): avatar ~.22 of the card, the name ~50 px, the
  // handle and followers under it, and the platform's button under the name ON the profile being acted on (34 px). A
  // card without a button (the one who acts) centres its name beside the avatar — never an empty lower half.
  // o: x, y, w, who, state, dark, noBtn, flat, minH (cards side by side share one height)
  const mUI = (s, size, weight) => { mc = mc || document.createElement('canvas').getContext('2d'); mc.font = `${weight || 400} ${size}px ${UIF}`; return mc.measureText(String(s)).width; };
  const uiBig = (parent, o) => {
    const p = o.plat || plat(), sk = skinOf(p, o.dark), wd = words(p), who = o.who || person('to'), cw = o.w || 780;
    const pad = Math.round(cw * .058), d = Math.round(cw * .215), tx = pad + d + Math.round(cw * .045), tw2 = cw - tx - pad;
    let nm = Math.round(cw * .064); while (nm > 34 && mUI(who.name || '', nm, 700) > tw2) nm -= 2;
    const hd = Math.round(cw * .037), fs = Math.round(cw * .043), bh = Math.round(cw * .097);
    const bw = o.noBtn ? 0 : Math.min(tw2, Math.max(Math.round(cw * .36), mUI(wd.on, fs, 700) + 96, mUI(wd.off, fs, 700) + 96));
    const sub = [who.handle ? (/^@/.test(who.handle) ? '' : '@') + who.handle : ''].filter(Boolean);
    const blockH = nm * 1.18 + (sub.length ? hd * 1.45 : 0) + (who.followers_t ? hd * 1.45 : 0) + (o.noBtn ? 0 : Math.round(cw * .03) + bh);
    const h = Math.round(Math.max(o.minH || 0, Math.max(d, blockH) + 2 * pad));
    // a dark-mode card on a dark world is lifted a step (the platforms' own elevated surface) and gets a lit top edge:
    // a #000 card on the void read as a hole in the frame
    const bg = sk.dark && !o.flat ? CR.mix(sk.bg, '#FFFFFF', .075) : sk.bg;
    const card = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${cw}px;height:${h}px;background:${bg};border-radius:${Math.round(cw * .036)}px;overflow:hidden;font-family:${UIF};color:${sk.ink};` +
      `box-shadow:${o.flat ? 'none' : `0 44px 110px rgba(0,0,0,.6), 0 10px 26px rgba(0,0,0,.38)${sk.dark ? ', inset 0 1px 0 rgba(255,255,255,.16), inset 0 0 0 1px rgba(255,255,255,.1)' : ''}`}`, parent);
    avatar(card, pad, Math.round((h - d) / 2), d, who, sk);
    let ty = Math.round((h - blockH) / 2);
    CR.el('div', `position:absolute;left:${tx}px;top:${ty}px;width:${tw2}px;font-weight:700;font-size:${nm}px;line-height:1.18;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, card, esc(who.name || ''));
    ty += nm * 1.18;
    if (sub.length) { CR.el('div', `position:absolute;left:${tx}px;top:${ty + hd * .2}px;width:${tw2}px;font-size:${hd}px;line-height:1.2;color:${sk.sub};white-space:nowrap;overflow:hidden`, card, esc(sub.join(' · '))); ty += hd * 1.45; }
    let fl = null;
    if (who.followers_t) { fl = CR.el('div', `position:absolute;left:${tx}px;top:${ty + hd * .2}px;font-size:${hd}px;line-height:1.2;color:${sk.sub};white-space:nowrap;${NUMCSS}`, card);
      fl.innerHTML = `<b style="color:${sk.ink};font-weight:700">${esc(who.followers_t)}</b> ${esc(wd.fl)}`; ty += hd * 1.45; }
    if (o.noBtn) return { el: card, btn: null, set: () => {}, fl, w: cw, h, bx: 0, by: 0, bw: 0, bh: 0, sk, wd, p, big: true };
    const bx = tx, by = Math.round(ty + cw * .03);
    const btn = CR.el('div', `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border-radius:${Math.min(sk.r * 1.5, bh / 2)}px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fs}px;transform-origin:50% 50%`, card);
    const set = st => { const on = st === 'on'; btn.textContent = on ? wd.on : wd.off;
      btn.style.background = on ? (sk.alt === 'transparent' ? 'transparent' : sk.alt) : sk.btn; btn.style.color = on ? sk.altInk : sk.btnInk; btn.style.boxShadow = on && sk.altBorder ? `inset 0 0 0 2px ${sk.altBorder}` : 'none'; };
    set(o.state || 'on');
    return { el: card, btn, set, fl, w: cw, h, bx: (o.x || 0) + bx, by: (o.y || 0) + by, bw, bh, sk, wd, p, big: true };
  };
  // two big cards side by side at one height (the one with more lines sets it)
  const uiPair = (host, oa, ob) => {
    let A = uiBig(host, oa), B = uiBig(host, ob);
    if (A.h !== B.h) { const h = Math.max(A.h, B.h); if (A.h < h) { A.el.remove(); A = uiBig(host, Object.assign({}, oa, { minH: h })); } else { B.el.remove(); B = uiBig(host, Object.assign({}, ob, { minH: h })); } }
    return [A, B];
  };
  // the cursor that does it: an arrow moving smoothly to the button, a press, the menu item, a press
  const cursor = (parent, k = 1) => { const s = CR.svg(parent); s.setAttribute('width', 40 * k); s.setAttribute('height', 52 * k); s.setAttribute('viewBox', '0 0 40 52'); s.style.width = (40 * k) + 'px'; s.style.height = (52 * k) + 'px';
    CR.sv('path', { d: 'M3 2 L3 40 L12 31 L19 47 L26 44 L19 29 L32 29 Z', fill: '#FFFFFF', stroke: '#111111', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, s);
    s.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,.45))'; s.style.left = '0px'; s.style.top = '0px'; return s; };
  // the unfollow (follow) sequence on one card: [t_click1, t_menu, t_click2, t_done]
  const actSeq = (ui, host, ox, oy, t0, o = {}) => {
    const act = S.action === 'follow' ? 'follow' : 'unfollow', sk = ui.sk, kb = ui.big ? 1.25 : 1;
    const cur = o.touch ? null : cursor(host, kb), tap = CR.el('div', `position:absolute;width:${60 * kb}px;height:${60 * kb}px;border-radius:50%;border:3px solid ${CR.rgba(sk.dark ? '#FFFFFF' : '#000000', .35)};opacity:0;pointer-events:none`, host);
    const bxc = ox + ui.bx + ui.bw / 2, byc = oy + ui.by + ui.bh / 2;
    let menu = null, item = null, mx = bxc, my = byc;
    if (act === 'unfollow' && !o.noMenu) {                     // the confirm sheet the platform shows before it unfollows
      const fz = Math.round(30 * kb), mw = Math.max(360 * kb, mUI(ui.wd.drop, fz, 700) + 120 * kb), mh = Math.round(96 * kb), cx0 = ox + ui.el.offsetLeft, mxx = Math.min(cx0 + ui.w - mw - 10, Math.max(cx0 + 10, bxc - mw / 2)), myy = oy + ui.by + ui.bh + 14;
      menu = CR.el('div', `position:absolute;left:${mxx}px;top:${myy}px;width:${mw}px;height:${mh}px;border-radius:${Math.round(14 * kb)}px;background:${sk.dark ? '#1F1F1F' : '#FFFFFF'};box-shadow:0 18px 50px rgba(0,0,0,.5), 0 0 0 1px ${CR.rgba(sk.dark ? '#FFFFFF' : '#000000', .08)};opacity:0;font-family:${UIF};transform-origin:50% 0`, host);
      item = CR.el('div', `position:absolute;left:0;right:0;top:0;height:${mh}px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fz}px;color:${sk.danger}`, menu, esc(ui.wd.drop));
      mx = mxx + mw / 2; my = myy + mh / 2;
    }
    if (o.menuAt) { const m = o.menuAt; mx = m[0]; my = m[1]; }   // the comp draws its own confirm (the phone's bottom sheet)
    const dt = Math.max(.5, Math.min(1, (D * .62 - t0) / 3.2));
    const c1 = t0 + .9 * dt, c2 = act === 'unfollow' ? c1 + 1.1 * dt : c1, done = c2 + .12;
    const sx = bxc + 300, sy = byc + 260;
    const fv = typeof person('to').followers === 'number' ? person('to').followers : null;
    CR.on(t => {
      // path: in from the lower right to the button, then down to the menu item (cruise), no jumps
      let x = sx, y = sy;
      if (t < c1) { const q = CR.cruise(seg(t, t0, c1 - .12), .35); x = lerp(sx, bxc + 16, q); y = lerp(sy, byc + 10, q); }
      else if (t < c2 && act === 'unfollow') { const q = CR.cruise(seg(t, c1 + .25, c2 - .12), .35); x = lerp(bxc + 16, mx + 16, q); y = lerp(byc + 10, my + 8, q); }
      else { x = (act === 'unfollow' ? mx : bxc) + 16; y = (act === 'unfollow' ? my : byc) + 10 + 30 * CR.sseg(t, done + .2, done + 1); }
      if (cur) { cur.style.left = (x - 3).toFixed(1) + 'px'; cur.style.top = (y - 2).toFixed(1) + 'px'; cur.style.opacity = CR.sseg(t, t0 - .2, t0 + .2) * (1 - CR.sseg(t, done + .5, done + 1.1)); }
      const press = (tc) => 1 - .035 * (CR.sseg(t, tc - .06, tc) - CR.sseg(t, tc, tc + .1));
      ui.btn.style.transform = `scale(${press(c1).toFixed(4)})`;
      const tc = t < c2 - .05 || act === 'follow' ? c1 : c2, tq = seg(t, tc, tc + .45);
      tap.style.left = ((t < c2 - .05 || act === 'follow' ? bxc : mx) - 30).toFixed(1) + 'px'; tap.style.top = ((t < c2 - .05 || act === 'follow' ? byc : my) - 30).toFixed(1) + 'px';
      tap.style.opacity = (t >= tc && tq < 1 ? (1 - tq) * .9 : 0).toFixed(3); tap.style.transform = `scale(${(.4 + tq * 1.2).toFixed(3)})`;
      if (menu) { const q = CR.sseg(t, c1 + .05, c1 + .3) * (1 - CR.sseg(t, c2 + .05, c2 + .3)); menu.style.opacity = q.toFixed(3); menu.style.transform = `scale(${(.96 + .04 * q).toFixed(4)})`;
        item.style.background = t >= c2 - .05 && t < c2 + .2 ? CR.rgba(sk.dark ? '#FFFFFF' : '#000000', .06) : 'transparent'; }
      const st = act === 'unfollow' ? (t >= c2 ? 'off' : 'on') : (t >= c1 ? 'on' : 'off');
      if (ui._st !== st) { ui._st = st; ui.set(st); }
      if (ui.fl && fv != null) { const v = fv + (act === 'unfollow' ? (t >= c2 ? -1 : 0) : (t >= c1 ? 1 : 0)), s = fmtN(v, 0, grp(v));
        const b = ui.fl.querySelector('b'); if (b && b.textContent !== s && t >= c1) b.textContent = s; }
    });
    return { c1, c2, done };
  };
  const socialKicker = () => { const a = person('from'); return [a.name, S.note].filter(Boolean).join('  ·  '); };
  // a post (action "post"): the author, the real text as posted, its time, the likes counting
  const uiPost = (parent, o) => {
    const p = o.plat || plat(), sk = skinOf(p, o.dark), who = person('from').name ? person('from') : person('to'), cw = o.w || 900, pad = Math.round(cw * .05), d = Math.round(cw * .09);
    const card = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${cw}px;background:${sk.bg};border-radius:${Math.round(cw * .028)}px;overflow:hidden;font-family:${UIF};color:${sk.ink};` +
      `box-shadow:${o.flat ? 'none' : '0 40px 100px rgba(0,0,0,.55), 0 8px 22px rgba(0,0,0,.35)'}`, parent);
    avatar(card, pad, pad, d, who, sk);
    const nm = Math.round(cw * .033), hd = Math.round(cw * .026);
    CR.el('div', `position:absolute;left:${pad + d + 22}px;top:${pad + d * .08}px;font-weight:700;font-size:${nm}px;white-space:nowrap`, card, esc(who.name || ''));
    CR.el('div', `position:absolute;left:${pad + d + 22}px;top:${pad + d * .08 + nm * 1.3}px;font-size:${hd}px;color:${sk.sub};white-space:nowrap`, card, esc([(who.handle ? (/^@/.test(who.handle) ? '' : '@') + who.handle : ''), S.note || S.when || ''].filter(Boolean).join(' · ')));
    const body = CR.el('div', `position:absolute;left:${pad}px;top:${pad + d + 26}px;width:${cw - 2 * pad}px;font-size:${Math.round(cw * .036)}px;line-height:1.38;font-weight:400;white-space:pre-wrap`, card, esc(String(S.text || '')));
    const bh = body.offsetHeight, ly = pad + d + 26 + bh + 30;
    CR.el('div', `position:absolute;left:${pad}px;top:${ly}px;width:${cw - 2 * pad}px;height:1px;background:${sk.line}`, card);
    const likes = CR.el('div', `position:absolute;left:${pad}px;top:${ly + 22}px;font-size:${hd}px;color:${sk.sub};white-space:nowrap;${NUMCSS}`, card);
    const h = ly + 22 + hd * 1.4 + pad; card.style.height = h + 'px';
    const lv = typeof S.likes === 'number' ? S.likes : null;
    if (lv != null || S.likes_t) likes.innerHTML = `<b style="color:${sk.ink}">${esc(S.likes_t || fmtN(lv, 0, grp(lv)))}</b> ${esc(uw('likes'))}`;
    return { el: card, body, likes, lv, w: cw, h, sk };
  };
  const postCount = (ui, t0, dur) => { if (ui.lv == null) return; const b = ui.likes.querySelector('b'); if (!b) return;
    CR.on(t => { const q = CR.sseg(t, t0, t0 + dur), s = q >= 1 ? (S.likes_t || fmtN(ui.lv, 0, grp(ui.lv))) : fmtN(Math.round(ui.lv * q), 0, grp(ui.lv)); if (b.textContent !== s) b.textContent = s; }); };
  const isPost = () => S.action === 'post' && S.text;
  // a printed screenshot (paper worlds / the press): the card drawn at its final state, then printed onto paper
  const printed = (parent, make, o) => {
    const holder = CR.el('div', `position:absolute;left:${o.x}px;top:${o.y}px;width:${o.w + 2 * o.pad}px;background:#F5F3EE;padding:${o.pad}px;box-shadow:0 18px 40px rgba(0,0,0,.42), 0 2px 4px rgba(0,0,0,.3);transform-origin:50% 50%`, parent);
    const inner = CR.el('div', `position:relative;width:${o.w}px`, holder);
    const ui = make(inner, { x: 0, y: 0, w: o.w, flat: true, state: o.state });
    inner.style.height = ui.h + 'px'; holder.style.height = (ui.h + 2 * o.pad) + 'px';
    inner.style.filter = o.halftone ? 'grayscale(1) contrast(1.15) brightness(1.02)' : 'saturate(.82) contrast(.96) sepia(.08)';
    if (o.halftone) CR.el('div', `position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.55;background-image:radial-gradient(circle, rgba(0,0,0,.55) 1px, rgba(0,0,0,0) 1.6px);background-size:6px 6px`, inner);
    CR.el('div', `position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.5;background:url(${CR.paperURL(o.w, ui.h, '#FFFFFF', o.seed || 61, .25)}) center/100% 100%`, inner);
    return { holder, ui, h: ui.h + 2 * o.pad, w: o.w + 2 * o.pad };
  };
  CR.scene('social', {
    s: 5.5,
    layout: { void_black: 'card', navy_falloff: 'link', charcoal_light: 'card', glass_dark: 'phone', paper_desk: 'print', newsprint: 'press',
              blueprint: 'link', concrete: 'print', light_table: 'print', footage_sharp: 'card', footage_moving: 'card' },
    comps: {
      card: { build() {
        // void / charcoal / footage: both profiles in the platform's own skin (dark mode), a tie between them (a heart
        // when the story is a couple); the cursor goes to the other one's button, the confirm sheet opens, Unfollow —
        // the button turns back and the tie snaps (mutual: the second one does the same); a follow draws the tie in
        if (CR.foot) { CR.footLook(10, .28, .7); veil(CR.L.back, 'all'); }
        if (isPost()) { const k = socialKicker(), ui = uiPost(CR.L.mid, { x: 0, y: 0, w: 1200, dark: true }); ui.el.style.left = ((W - ui.w) / 2) + 'px'; ui.el.style.top = ((H - ui.h) / 2 + 20) + 'px';
          CR.enter(ui.el, { kind: 'rise', t0: 0, dur: .7 }); if (k) CR.label(CR.L.front, k, { x: 0, y: (H - ui.h) / 2 - 50, width: W, align: 'center', size: 24, ls: .26, t0: at(.2), color: pal.accent, nowrap: true });
          postCount(ui, at(.8), Math.min(1.6, D * .35)); CR.beat = at(.8); CR.focus = [W / 2, H / 2]; return; }
        const mutual = !!S.mutual && S.action === 'unfollow', act = S.action === 'follow' ? 'follow' : 'unfollow';
        // docgfx's scale: two ~790 px profile cards, names ~50 px, the button (34 px) on the profile being acted on;
        // the one who acts carries no button (a mutual unfollow: both do) and its name sits level with the avatar
        const cw = 790, gap = 116, x0 = (W - 2 * cw - gap) / 2, x1 = x0 + cw + gap;
        const host = CR.el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, CR.L.mid);
        const [A, B] = uiPair(host, { x: x0, y: 0, w: cw, who: person('from'), state: 'on', dark: true, noBtn: !mutual },
                                    { x: x1, y: 0, w: cw, who: person('to'), state: act === 'follow' ? 'off' : 'on', dark: true });
        const ch = B.h, y0 = Math.round((H - ch) / 2 - (S.note ? 40 : 10));
        [A, B].forEach(u => { u.el.style.top = y0 + 'px'; u.by += y0; });
        CR.enter(A.el, { kind: 'rise', t0: 0, dur: .7 }); CR.enter(B.el, { kind: 'rise', t0: .12, dur: .7 });
        if (!CR.foot) { const pool = CR.el('div', `position:absolute;left:0;top:${y0 - 260}px;width:${W}px;height:${ch + 520}px;pointer-events:none;` +   // a soft light the cards sit in
          `background:radial-gradient(ellipse at 50% 50%, ${CR.rgba(CR.mix(pal.glow, '#FFFFFF', .6), .09)} 0%, ${CR.rgba(CR.mix(pal.glow, '#FFFFFF', .6), .03)} 45%, rgba(0,0,0,0) 70%)`, CR.L.back);
          CR.enter(pool, { kind: 'fade', t0: 0, dur: .8 }); }
        // the note under the cards in the quiet serif (docgfx: who / when as a caption line, never the platform's name)
        if (S.note) CR.text(CR.L.front, S.note, { font: 'serif', italic: true, size: 48, x: M, y: y0 + ch + 74, width: W - 2 * M, align: 'center', nowrap: true, color: CR.rgba(pal.ink, .86), anim: 'mask_wipe', t0: at(.3), glow: false });
        const s = CR.svg(CR.L.front), ty = y0 + ch / 2, lx0 = x0 + cw + 12, lx1 = x1 - 12, mid = (lx0 + lx1) / 2, inkL = CR.rgba(pal.ink, .8);
        const tl = CR.sv('line', { x1: lx0, y1: ty, x2: lx0, y2: ty, stroke: inkL, 'stroke-width': 4, 'stroke-dasharray': '12 10', 'stroke-linecap': 'round' }, s);
        const tr = CR.sv('line', { x1: lx1, y1: ty, x2: lx1, y2: ty, stroke: inkL, 'stroke-width': 4, 'stroke-dasharray': '12 10', 'stroke-linecap': 'round' }, s);
        let hl = null, hr = null, hg = null;
        if (S.heart) { hg = CR.sv('g', { transform: `translate(${mid} ${ty})` }, s);
          hl = CR.sv('path', { d: 'M0,22 C-7,15 -34,-2 -34,-19 C-34,-31 -25,-39 -15,-39 C-8,-39 -3,-35 0,-30 L0,22 Z', fill: '#FF3040' }, hg);
          hr = CR.sv('path', { d: 'M0,22 C7,15 34,-2 34,-19 C34,-31 25,-39 15,-39 C8,-39 3,-35 0,-30 L0,22 Z', fill: '#FF3040' }, hg); }
        const sq = actSeq(B, host, 0, 0, at(.5)), sq2 = mutual ? actSeq(A, host, 0, 0, sq.done + .1) : null, last = (sq2 || sq).done;
        CR.on(t => { const tie = CR.sseg(t, at(.15), at(.15) + .6), cut = act === 'unfollow' ? CR.sseg(t, last + .1, last + .65) : 0, join = act === 'follow' ? CR.sseg(t, last + .05, last + .6) : 1;
          const reach = (mid - lx0 - 4) * (act === 'unfollow' ? tie * (1 - cut) : join);
          tl.setAttribute('x2', (lx0 + reach).toFixed(1)); tr.setAttribute('x2', (lx1 - reach).toFixed(1));
          if (hg) { const hs = act === 'unfollow' ? CR.sseg(t, at(.3), at(.3) + .5) : CR.sseg(t, last + .1, last + .55), split = act === 'unfollow' ? CR.sseg(t, last, last + .6) : 0;
            hg.setAttribute('transform', `translate(${mid} ${ty}) scale(${(hs * 1.1).toFixed(3)})`);
            hl.setAttribute('transform', `translate(${(-30 * split).toFixed(2)} ${(20 * split).toFixed(2)}) rotate(${(-22 * split).toFixed(2)})`);
            hr.setAttribute('transform', `translate(${(30 * split).toFixed(2)} ${(20 * split).toFixed(2)}) rotate(${(22 * split).toFixed(2)})`);
            hg.style.opacity = (1 - .8 * CR.sseg(t, last + .5, last + 1.2)).toFixed(3); } });
        CR.beat = sq.c2; CR.focus = [W / 2, ty];
      } },
      link: { build() {
        // navy (the briefing room): the two people as two nodes on the table — each a real photo (the platform's empty
        // avatar when none was found) inside a measured ring, the name and handle under it — and the follow between
        // them as a lit arrow from the one who acts to the one followed. The platform's button sits under the person
        // being acted on (it is that profile's button): pressed, it turns, the arrow breaks and goes cold (a follow
        // draws it in)
        const L = CR.L.front, ink = pal.ink, a = person('from'), b = person('to'), sk = skinOf(plat(), true), wd = words(plat()), act = S.action === 'follow' ? 'follow' : 'unfollow';
        if (S.note) CR.label(L, S.note, { x: 0, y: 112, width: W, align: 'center', size: 30, ls: .3, t0: at(.1), color: pal.accent, nowrap: true });
        const d = 270, cy = 410, xs = [W / 2 - 500, W / 2 + 500], s = CR.svg(CR.L.mid), ends = [];
        [a, b].forEach((p, k) => { const t0 = at(.2 + k * .15), x = xs[k];
          const g = CR.sv('g', { opacity: 0 }, s), r0 = d / 2 + 22;            // the reticle: a hairline ring, 24 ticks
          CR.sv('circle', { cx: x, cy, r: r0, fill: 'none', stroke: CR.rgba(ink, .4), 'stroke-width': 1.5 }, g);
          for (let i = 0; i < 24; i++) { const an = i / 24 * Math.PI * 2, r1 = r0 + (i % 6 ? 9 : 20);
            CR.sv('line', { x1: x + Math.cos(an) * r0, y1: cy + Math.sin(an) * r0, x2: x + Math.cos(an) * r1, y2: cy + Math.sin(an) * r1, stroke: CR.rgba(ink, i % 6 ? .3 : .62), 'stroke-width': 1.5 }, g); }
          CR.on(t => g.setAttribute('opacity', CR.sseg(t, t0, t0 + .6).toFixed(3)));
          const av = avatar(L, x - d / 2, cy - d / 2, d, p, sk); CR.enter(av, { kind: 'fade', t0, dur: .6 });
          let y = cy + d / 2 + 58;
          const nsz = fitSize(CR.up(p.name || ''), 'head', 760, 66, 36);
          CR.text(L, p.name || '', hero({ font: 'head', size: nsz, upper: CR.case === 'upper', x: x - 380, y, width: 760, align: 'center', nowrap: true, t0: t0 + .1 })); y += nsz * 1.18 + 4;
          if (p.handle) { CR.text(L, (/^@/.test(p.handle) ? '' : '@') + p.handle, { font: 'mono', size: 28, x: x - 380, y, width: 760, align: 'center', nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: t0 + .2, glow: false }); y += 46; }
          ends.push(y);
        });
        const x1 = xs[0] + d / 2 + 52, x2 = xs[1] - d / 2 - 52, mxp = (x1 + x2) / 2;
        const segL = CR.sv('line', { x1, y1: cy, x2: mxp, y2: cy, stroke: pal.accent, 'stroke-width': 4 }, s), segR = CR.sv('line', { x1: mxp, y1: cy, x2: x2 - 16, y2: cy, stroke: pal.accent, 'stroke-width': 4 }, s);
        const arr = CR.sv('path', { d: `M${x2 - 26},${cy - 15} L${x2},${cy} L${x2 - 26},${cy + 15}`, fill: 'none', stroke: pal.accent, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
        [segL, segR, arr].forEach(e => { e.style.filter = CR.glowFilter(pal.accent, 24) || 'none'; });
        // the button of the profile being acted on, under that person
        const fs = 34, bw = Math.max(300, mUI(wd.on, fs, 700) + 104, mUI(wd.off, fs, 700) + 104), bh = 78, bx = xs[1] - bw / 2, by = Math.max(ends[0], ends[1]) + 26;
        const btn = CR.el('div', `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border-radius:${Math.min(sk.r * 1.5, bh / 2)}px;display:flex;align-items:center;justify-content:center;font-family:${UIF};font-weight:700;font-size:${fs}px;box-shadow:0 14px 34px rgba(0,0,0,.4)`, L);
        const setB = st => { const on = st === 'on'; btn.textContent = on ? wd.on : wd.off; btn.style.background = on ? (sk.alt === 'transparent' ? CR.rgba('#000000', .4) : sk.alt) : sk.btn;
          btn.style.color = on ? sk.altInk : sk.btnInk; btn.style.boxShadow = (on && sk.altBorder ? `inset 0 0 0 2px ${sk.altBorder}, ` : '') + '0 14px 34px rgba(0,0,0,.4)'; };
        setB(act === 'unfollow' ? 'on' : 'off'); CR.enter(btn, { kind: 'fade', t0: at(.45), dur: .4 });
        const c1 = tb(1.5, .55), drawIn = act === 'follow';
        const cur = cursor(L, 1.25); let st0 = null;
        CR.on(t => { const q = CR.cruise(seg(t, at(.6), c1 - .1), .35), cx = lerp(bx + bw + 200, bx + bw * .6, q), cyy = lerp(by + 230, by + bh * .55, q);
          cur.style.left = cx.toFixed(1) + 'px'; cur.style.top = cyy.toFixed(1) + 'px'; cur.style.opacity = CR.sseg(t, at(.5), at(.7)) * (1 - CR.sseg(t, c1 + .5, c1 + 1));
          btn.style.transform = `scale(${(1 - .04 * (CR.sseg(t, c1 - .06, c1) - CR.sseg(t, c1, c1 + .1))).toFixed(4)})`;
          const st = drawIn ? (t >= c1 ? 'on' : 'off') : (t >= c1 ? 'off' : 'on'); if (st !== st0) { st0 = st; setB(st); }
          if (drawIn) { const p = CR.sseg(t, c1 + .1, c1 + .8), xe = lerp(x1, x2 - 16, p); segL.setAttribute('x2', Math.min(mxp, xe).toFixed(1)); segR.setAttribute('x2', Math.max(mxp, xe).toFixed(1)); segR.style.opacity = xe > mxp ? 1 : 0; arr.style.opacity = p >= 1 ? 1 : 0; }
          else { const p = CR.sseg(t, c1 + .05, c1 + .7), g = 70 * p;     // the arrow breaks in the middle and goes cold
            segL.setAttribute('x2', (mxp - g).toFixed(1)); segR.setAttribute('x1', (mxp + g).toFixed(1));
            const col = p > 0 ? CR.mix(pal.accent, CR.mix(ink, pal.ground, .55), p) : pal.accent; [segL, segR, arr].forEach(e => { e.setAttribute('stroke', col); e.style.opacity = (1 - .45 * p).toFixed(3); }); } });
        if (drawIn) { segL.setAttribute('x2', x1); segR.style.opacity = 0; arr.style.opacity = 0; }
        if (S.mutual && !drawIn) { const back = CR.sv('line', { x1: x2 - 16, y1: cy + 30, x2: x1 + 16, y2: cy + 30, stroke: CR.rgba(ink, .4), 'stroke-width': 2, 'stroke-dasharray': '6 8' }, s); void back; }
        source(L, { align: 'center', x: M, width: W - 2 * M });
        CR.beat = c1; CR.focus = [W / 2, cy + 60];
      } },
      phone: { build() {
        // glass: the phone whole in the frame — the platform's mobile profile set large (the handle on the top bar, the
        // avatar, the name, the full-width button), the thumb's tap, the confirm rising as the platform's own bottom
        // sheet, the button turning; who and when set beside the phone. Nothing under the profile is invented (no
        // posts, no loading grid): the screen ends in the profile's tab line and the app's own dark
        const pw = 500, ph = 980, px = W / 2 + 150, py = Math.round((H - ph) / 2), sk = skinOf(plat(), true), wd = words(plat());
        const body = CR.el('div', `position:absolute;left:${px}px;top:${py}px;width:${pw}px;height:${ph}px;border-radius:76px;background:linear-gradient(160deg,#2A2E35,#0B0D10 60%);` +
          `box-shadow:inset 0 0 0 2px rgba(255,255,255,.14), inset 0 0 0 9px #050608, 0 60px 140px rgba(0,0,0,.7), 0 14px 30px rgba(0,0,0,.5)`, CR.L.mid);
        CR.enter(body, { kind: 'rise', t0: 0, dur: .7 });
        const sw = pw - 36, shh = ph - 36;
        const scr = CR.el('div', `position:absolute;left:18px;top:18px;width:${sw}px;height:${shh}px;border-radius:60px;overflow:hidden;background:${sk.bg};font-family:${UIF};color:${sk.ink}`, body);
        CR.el('div', `position:absolute;left:${sw / 2 - 60}px;top:18px;width:120px;height:34px;border-radius:20px;background:#000`, scr);
        const L = CR.L.front, a = person('from');
        if (isPost()) {                                        // the post at a phone's reading size (laid out narrow, scaled up)
          const k2 = 1.6, ui = uiPost(scr, { x: 0, y: 92, w: sw / k2, flat: true, dark: true }); ui.el.style.borderRadius = '0'; ui.el.style.transformOrigin = '0 0'; ui.el.style.transform = `scale(${k2})`;
          postCount(ui, at(.9), Math.min(1.6, D * .35)); CR.beat = at(.9); }
        else {
          const who = person('to'), act = S.action === 'follow' ? 'follow' : 'unfollow';
          let y = 84;
          const top = who.handle ? (/^@/.test(who.handle) ? '' : '@') + who.handle : (who.name || '');
          CR.el('div', `position:absolute;left:30px;top:${y}px;width:${sw - 60}px;text-align:center;font-weight:700;font-size:27px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, scr, esc(top));
          y += 74;
          const d = 214; avatar(scr, sw / 2 - d / 2, y, d, who, sk); y += d + 30;
          let nz = 44; while (nz > 28 && mUI(who.name || '', nz, 700) > sw - 60) nz -= 2;
          CR.el('div', `position:absolute;left:30px;top:${y}px;width:${sw - 60}px;text-align:center;font-weight:700;font-size:${nz}px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, scr, esc(who.name || ''));
          y += nz * 1.2 + 10;
          let fl = null;
          if (who.followers_t) { fl = CR.el('div', `position:absolute;left:30px;top:${y}px;width:${sw - 60}px;text-align:center;font-size:27px;color:${sk.sub};white-space:nowrap;${NUMCSS}`, scr);
            fl.innerHTML = `<b style="color:${sk.ink};font-weight:700">${esc(who.followers_t)}</b> ${esc(wd.fl)}`; y += 44; }
          y += 22;
          const bh = 86, bx = 34, bw = sw - 68, by = y;
          const btn = CR.el('div', `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border-radius:${Math.min(sk.r * 1.6, bh / 2)}px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:33px;transform-origin:50% 50%`, scr);
          const set = st => { const on = st === 'on'; btn.textContent = on ? wd.on : wd.off; btn.style.background = on ? (sk.alt === 'transparent' ? 'transparent' : sk.alt) : sk.btn;
            btn.style.color = on ? sk.altInk : sk.btnInk; btn.style.boxShadow = on && sk.altBorder ? `inset 0 0 0 2px ${sk.altBorder}` : 'none'; };
          set(act === 'follow' ? 'off' : 'on');
          // the profile's tab line (three tabs, the first one current) — the app's chrome, no invented posts under it
          const tly = by + bh + 58;
          CR.el('div', `position:absolute;left:0;right:0;top:${tly + 58}px;height:1px;background:${sk.line}`, scr);
          CR.el('div', `position:absolute;left:0;top:${tly + 56}px;width:${sw / 3}px;height:3px;background:${sk.ink}`, scr);
          [0, 1, 2].forEach(k => CR.el('div', `position:absolute;left:${sw / 6 + k * sw / 3 - 15}px;top:${tly + 12}px;width:30px;height:30px;border-radius:6px;box-shadow:inset 0 0 0 3px ${CR.rgba(sk.ink, k ? .45 : .95)}`, scr));
          CR.el('div', `position:absolute;left:0;right:0;top:${tly + 59}px;bottom:0;background:linear-gradient(180deg, ${CR.rgba(sk.bg, 0)}, ${CR.rgba('#000000', .25)})`, scr);
          // the platform's confirm, as phones show it: a bottom sheet with the person and the red action
          let sheet = null, scrim = null, item = null, sh2 = 0, menuAt = null;
          if (act === 'unfollow') {
            sh2 = 360; scrim = CR.el('div', `position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0`, scr);
            sheet = CR.el('div', `position:absolute;left:0;right:0;top:${shh - sh2}px;height:${sh2 + 40}px;border-radius:30px 30px 0 0;background:${sk.dark ? '#262626' : '#FFFFFF'};transform:translateY(${sh2 + 40}px)`, scr);
            CR.el('div', `position:absolute;left:${sw / 2 - 30}px;top:14px;width:60px;height:6px;border-radius:3px;background:${CR.rgba(sk.ink, .3)}`, sheet);
            avatar(sheet, sw / 2 - 40, 40, 80, who, sk);
            CR.el('div', `position:absolute;left:30px;top:132px;width:${sw - 60}px;text-align:center;font-weight:700;font-size:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, sheet, esc(top));
            CR.el('div', `position:absolute;left:0;right:0;top:186px;height:1px;background:${CR.rgba(sk.ink, .12)}`, sheet);
            item = CR.el('div', `position:absolute;left:0;right:0;top:187px;height:96px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:33px;color:${sk.danger}`, sheet, esc(wd.drop));
            CR.el('div', `position:absolute;left:0;right:0;top:283px;height:1px;background:${CR.rgba(sk.ink, .12)}`, sheet);
            menuAt = [sw / 2, shh - sh2 + 187 + 48];
          }
          const ui = { el: scr, btn, set, fl, w: sw, bx, by, bw, bh, sk, wd, p: plat(), big: true };
          const sq = actSeq(ui, scr, 0, 0, at(.6), { touch: true, noMenu: true, menuAt });
          if (sheet) CR.on(t => { const up = CR.sseg(t, sq.c1 + .05, sq.c1 + .4), dn = CR.sseg(t, sq.c2 + .1, sq.c2 + .45), q = up * (1 - dn);
            sheet.style.transform = `translateY(${((1 - q) * (sh2 + 40)).toFixed(1)}px)`; scrim.style.opacity = (q * .9).toFixed(3);
            item.style.background = t >= sq.c2 - .05 && t < sq.c2 + .25 ? CR.rgba(sk.ink, .08) : 'transparent'; });
          CR.beat = sq.c2;
        }
        CR.el('div', 'position:absolute;inset:0;border-radius:60px;pointer-events:none;background:linear-gradient(125deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,0) 30%)', scr);
        // who did it and when, beside the phone
        const tx = M, tw3 = px - M - 110, nsz = fitSize(a.name || '', 'display', tw3 * 1.9, 104, 56);
        const host = CR.el('div', `position:absolute;left:${tx}px;top:0;width:${tw3}px`, L);
        let ly = 0;
        if (S.note) { CR.label(host, S.note, { x: 0, y: 0, width: tw3, size: 28, ls: .26, t0: at(.2), color: pal.accent, nowrap: true }); ly += 64; }
        const nmT = CR.text(host, a.name || '', hero({ font: 'display', size: nsz, x: 0, y: ly, width: tw3, lh: 1.02, t0: at(.3) })); ly += nmT.el.offsetHeight + 18;
        if (a.handle) { CR.text(host, (/^@/.test(a.handle) ? '' : '@') + a.handle, { font: 'body', size: 32, x: 0, y: ly, width: tw3, nowrap: true, color: pal.dim, anim: 'mask_wipe', t0: at(.45), glow: false }); ly += 48; }
        host.style.top = Math.round(H / 2 - ly / 2 - 20) + 'px';
        source(L, { x: tx, width: tw3, y: H - 110 });
        CR.focus = [W / 2, H / 2];
      } },
      print: { build() {
        // paper / concrete / light table: two prints of the screen — before and after — laid one over the other; the
        // button that changed ringed in red pencil, who and when typed on a strip
        const k = socialKicker(), make = isPost() ? (p, o) => uiPost(p, o) : (p, o) => uiBig(p, o), ww = isPost() ? 900 : 760, pad = 26;
        const A = printed(CR.L.mid, make, { x: 0, y: 0, w: ww, pad, state: S.action === 'follow' ? 'off' : 'on', seed: 63 });
        const one = isPost();
        const B = one ? null : printed(CR.L.mid, make, { x: 0, y: 0, w: ww, pad, state: S.action === 'follow' ? 'on' : 'off', seed: 65 });
        const OV = 36;                                          // the after-print overlaps only the before-print's margin (its button stays seen)
        const tw3 = one ? A.w : A.w + B.w - OV, x0 = (W - tw3) / 2, y0 = (H - A.h) / 2 + 20;
        A.holder.style.left = x0 + 'px'; A.holder.style.top = y0 + 'px';
        CR.enter(A.holder, { kind: CR.W === 'concrete' ? 'fade' : 'land', t0: 0, rot: one ? -1 : -2.2, dur: .55 });
        if (CR.W === 'concrete') { CR.tape(A.holder, 60, 4, 120, -20); }
        if (B) { const t1 = tb(1.2, .45); B.holder.style.left = (x0 + A.w - OV) + 'px'; B.holder.style.top = (y0 + 40) + 'px';
          CR.enter(B.holder, { kind: 'land', t0: t1, rot: 1.6, dur: .5 }); if (CR.W === 'concrete') CR.tape(B.holder, B.w - 60, 4, 120, 18);
          const svg = CR.svg(B.holder); svg.setAttribute('width', B.w); svg.setAttribute('height', B.h); svg.setAttribute('viewBox', `0 0 ${B.w} ${B.h}`); greaseDefs(svg);
          const u = B.ui, cx = pad + u.bx + u.bw / 2 - 0, cy = pad + u.by + u.bh / 2;
          pencil(svg, ringPath(cx, cy, u.bw / 2 + 30, u.bh / 2 + 22, 131), { w: 5, grease: true, t0: Math.min(D - .7, t1 + .7), dur: .5 });
          CR.beat = t1; } else CR.beat = at(.4);
        if (k) { const sw = Math.min(1000, measure(k, 'mono', 30) + 120), st = sheetOn(CR.L.front, { x: (W - sw) / 2, y: Math.max(40, y0 - 110), w: sw, h: 76, seed: 67, age: .4, rot: -.8 });
          CR.text(st.el, k, { font: 'mono', size: 30, x: 60, y: 20, width: sw - 100, nowrap: true, color: pal.sink, onLight: true, anim: 'typewriter', t0: at(.4), cps: 32 }); }
        source(CR.L.front, { y: H - 80, align: 'right', x: M, width: W - 2 * M, font: 'mono', upper: false, paper: CR.light });
        CR.focus = [W / 2, H / 2];
      } },
      press: { build() {
        // newsprint: the two screenshots reprinted in the paper at a size the page is built around — halftone, side by
        // side under the paper's small heads (before / after) between heavy rules, the changed button underlined in
        // the paper's red, a cutline under them saying who and when
        const L = CR.L.mid, ink = pal.sink, one = isPost(), make = one ? (p, o) => uiPost(p, o) : (p, o) => uiBig(p, o), ww = one ? 1000 : 790, pad = 0;
        const A = printed(L, make, { x: 0, y: 0, w: ww, pad, state: S.action === 'follow' ? 'off' : 'on', halftone: true, seed: 71 });
        const B = one ? null : printed(L, make, { x: 0, y: 0, w: ww, pad, state: S.action === 'follow' ? 'on' : 'off', halftone: true, seed: 73 });
        [A, B].forEach(P => P && (P.holder.style.boxShadow = 'none', P.holder.style.background = 'transparent', P.holder.style.border = `3px solid ${ink}`));
        const gap = 60, tw3 = one ? A.w : A.w + gap + B.w, x0 = Math.round((W - tw3) / 2), cut = [socialKicker(), srcText()].filter(Boolean).join(' — ');
        const blockH = 30 + 70 + A.h + (cut ? 110 : 40), y0 = Math.round((H - blockH) / 2) + 100;
        const F2 = CR.L.front;
        CR.rule(F2, { x: x0, y: y0 - 100, w: tw3, h: 7, color: ink, glow: false, t0: at(.05), dur: .6, from: 'center' });
        CR.rule(F2, { x: x0, y: y0 - 86, w: tw3, h: 2, color: ink, glow: false, t0: at(.1), dur: .6, from: 'center' });
        A.holder.style.left = x0 + 'px'; A.holder.style.top = y0 + 'px'; CR.enter(A.holder, { kind: 'fade', t0: at(.1), dur: .6 });
        if (B) { B.holder.style.left = (x0 + A.w + gap) + 'px'; B.holder.style.top = y0 + 'px'; CR.enter(B.holder, { kind: 'fade', t0: tb(1.0, .45), dur: .6 }); }
        if (B) { [[x0, tw('before'), at(.15)], [x0 + A.w + gap, tw('after'), tb(1.0, .45)]].forEach(([x, w_, t0]) => CR.text(F2, w_, { font: 'cond', size: 32, weight: 700, upper: true, ls: .22, x, y: y0 - 58, width: ww, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0, glow: false }));
          const u = B.ui, bx = x0 + A.w + gap + u.bx, by = y0 + u.by; const ul = CR.el('div', `position:absolute;left:${bx - 8}px;top:${by + u.bh + 12}px;width:${u.bw + 16}px;height:6px;background:${pal.accent};transform-origin:0 50%;transform:scaleX(0)`, F2);
          const ta = tb(1.6, .6); CR.on(t => { ul.style.transform = `scaleX(${CR.sseg(t, ta, ta + .35).toFixed(4)})`; }); CR.beat = ta; } else CR.beat = at(.4);
        if (cut) CR.text(F2, cut, { font: 'serif', italic: true, size: 36, x: x0, y: y0 + A.h + 30, width: tw3, color: CR.mix(ink, pal.ground, .2), onLight: true, anim: 'mask_wipe', t0: tb(1.3), glow: false });
        CR.focus = [W / 2, H / 2];
      } },
    },
  });

  // ── END OF PART 4 ──
  } catch (e) { window.__crdata_err = String(e && e.stack || e); }
})();
