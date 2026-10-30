// CREATIVE — the token-driven documentary kit (autostyle v2). One design system per TITLE, not per channel: the world
// (ground), motion grammar, texture, glow family, type pairing, text animations and placement all arrive as tokens
// (S.tok, lookreg/creative.py adapt -> creative.py). Core scenes: title, chapter, person, place, date, quote,
// statement, document, evidence_board, list — each with >= 3 compositions; the world (and the placement) picks one, so
// two titles in two worlds never share a layout. Data scenes (number, bar_chart, ...) register from creative_data.js.
// The framework (CR.*) lives in lib/cr_core.js, cr_ground.js, cr_text.js, cr_parts.js — see build/kit/FRAMEWORK.md.
(function () {
  const pal = CR.pal, F = CR.F, M = 128;                     // M: the side margin (title-safe 5 % + air)
  const at = CR.at;
  let mc = null;
  const measure = (s, role, size, weight, ls) => { mc = mc || document.createElement('canvas').getContext('2d'); mc.font = `${weight || CR.FW[role]} ${size}px ${F[role]}`; return mc.measureText(s).width + (ls || 0) * size * s.length; };
  // the largest size (big..small) at which the text fits maxW on one line; when nothing fits, small (it wraps)
  const fitSize = (s, role, maxW, big, small, ls) => { let z = big; while (z > small && measure(s, role, z, null, ls) > maxW) z -= 4; return z; };
  const words = s => String(s || '').split(/\s+/).filter(Boolean).length;
  const onPaper = () => CR.light || ['paper_desk', 'cork_board'].includes(CR.W);
  const inkOn = paper => paper ? pal.sink : pal.ink;
  const dimOn = paper => paper ? CR.mix(pal.sink, pal.paper, .42) : pal.dim;
  const veil = (parent, kind) => {                         // legibility over footage: a long feathered dark gradient
    const g = { bl: 'linear-gradient(20deg, rgba(0,0,0,.78) 0%, rgba(0,0,0,.42) 38%, rgba(0,0,0,0) 66%)',
                b: 'linear-gradient(0deg, rgba(0,0,0,.8) 0%, rgba(0,0,0,.3) 42%, rgba(0,0,0,0) 70%)',
                l: 'linear-gradient(90deg, rgba(0,0,0,.84) 0%, rgba(0,0,0,.5) 42%, rgba(0,0,0,0) 72%)',
                all: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.35), rgba(0,0,0,.72))',
                r: 'linear-gradient(270deg, rgba(0,0,0,.84) 0%, rgba(0,0,0,.5) 40%, rgba(0,0,0,0) 70%)',
                t: 'linear-gradient(180deg, rgba(0,0,0,.8) 0%, rgba(0,0,0,.36) 40%, rgba(0,0,0,0) 66%)' }[kind || 'bl'];
    return CR.el('div', `position:absolute;inset:0;background:${g}`, parent);
  };
  // a type block placed by the title's placement token (lower_left = the composition's own default):
  //   vertical_side = the block turned to read bottom-to-top along the left edge (cls 'vs'),
  //   hud_corners   = top-left block inside four drawn corner brackets (cls 'tl' + marks)
  const PCLS = { lower_left: '', vertical_side: 'vs', letterbox_bar: 'll', dateline_credit: 'tl', hud_corners: 'tl', top_centre: 'tc', centre_small: 'c', full_bleed: 'c', right_panel: 'rp' };
  const hudCorners = () => {
    if (CR._hud) return;                                  // once per scene (a block may be pinned again)
    CR._hud = true;
    const s = CR.svg(CR.L.front), a = 64, x0 = 96, y0 = 84, x1 = W - 96, y1 = H - 84, col = CR.rgba(CR.light ? pal.sink : pal.ink, .7);
    const corners = [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].map(([x, y, sx, sy]) =>
      CR.sv('path', { d: `M${x},${y + sy * a} L${x},${y} L${x + sx * a},${y}`, fill: 'none', stroke: col, 'stroke-width': 2.5, 'stroke-linecap': 'square' }, s));
    corners.forEach(p => { const L = 2 * a; p.style.strokeDasharray = `${L} ${L}`; });
    CR.on(t => { const p = CR.sseg(t, at(.05), at(.05) + .8); corners.forEach(c => { c.style.strokeDashoffset = (2 * a * (1 - p)).toFixed(1); }); });
  };
  const block = (parent, def, w) => {
    const c = PCLS[CR.placement] || def, align = (c === 'tc' || c === 'c') ? 'center' : 'left';
    const bw = c === 'rp' ? Math.min(w, 780) : c === 'vs' ? Math.min(w, 800) : w, x = c === 'rp' ? W - M - bw : align === 'center' ? (W - bw) / 2 : M;
    const el = CR.el('div', `position:absolute;left:${x}px;top:0;width:${bw}px`, parent);
    const B = { el, cls: c, align, w: bw, x };
    B.pin = (h, bottom = 880, top = 136) => {
      const k = B.cls;
      if (k === 'vs') {                                   // turned: its top-left corner sits low on the left edge
        el.style.transformOrigin = '0 0'; el.style.transform = 'rotate(-90deg)';
        el.style.left = M.toFixed(1) + 'px'; el.style.top = (H - 140).toFixed(1) + 'px';
        CR.rule(parent, { x: M + h + 34, y: H - 140 - bw, w: 2, h: bw, color: pal.accent, t0: at(.1), dur: .9 }).el.style.transformOrigin = '50% 100%';
        return H - 140 - bw;
      }
      const y = (k === 'll' || k === 'rp') ? bottom - h : k === 'c' ? (H - h) / 2 : top; el.style.top = y.toFixed(1) + 'px';
      if (CR.placement === 'hud_corners') hudCorners();
      return y;
    };
    B.veil = () => ({ ll: 'bl', rp: 'r', tl: 't', tc: 't', c: 'all', vs: 'l' }[B.cls] || 'bl');
    return B;
  };
  const initials = s => String(s || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase();
  const hero = (o) => Object.assign({ anim: CR.anim.hero }, o);
  const parseDate = s => {
    s = String(s || '').trim();
    let m = s.match(/^(\d{1,2})\.?\s+([^\d\s,]+)\.?,?\s+(\d{3,4})$/u); if (m) return { day: m[1], month: m[2], year: m[3] };
    m = s.match(/^([^\d\s,]+)\.?\s+(\d{1,2}),?\s+(\d{3,4})$/u); if (m) return { day: m[2], month: m[1], year: m[3] };
    m = s.match(/^([^\d\s,]+)\s+(\d{3,4})$/u); if (m) return { day: '', month: m[1], year: m[2] };
    m = s.match(/(\d{3,4})\s*$/); if (m) return { day: '', month: s.slice(0, m.index).trim().replace(/[,.]$/, ''), year: m[1] };
    return { day: '', month: s, year: '' };
  };
  const enterKind = CR.defaultEnter;
  const shadowOf = (h, k) => `0 ${(h * .012 + 26 * (1 - k)).toFixed(0)}px ${(h * .03 + 40 * (1 - k)).toFixed(0)}px rgba(0,0,0,${(.42 - .12 * (1 - k)).toFixed(2)})`;
  // a photo for a person / place: the real one, else the footage still, else a quiet plate (never a stranger's face)
  const photoOf = (...keys) => { for (const k of keys) { const v = k === 'still' ? S.still : S[k]; if (v) return v; } return ''; };

  // ══ TITLE ══════════════════════════════════════════════════════════════════════════════════════════════════════
  CR.scene('title', {
    s: 4.6,
    layout: { void_black: 'credits', navy_falloff: 'axis', charcoal_light: 'monolith', glass_dark: 'split', paper_desk: 'report', newsprint: 'masthead',
              blueprint: 'title_block', concrete: 'stencil', light_table: 'credits', footage_sharp: 'monolith', footage_moving: 'credits' },
    place: { full_bleed: 'monolith' },
    comps: {
      axis: { build() {
        // navy: the film on a time scale — a hairline axis with year ticks draws across the frame, the title stands
        // above it and an accent marker rises from the year of the story
        const L = CR.L.front, t = String(S.text || S.title || ''), up = CR.case === 'upper';
        const yr = +(((String(S.sub || '') + ' ' + String(S.kicker || '')).match(/\b(1[5-9]\d\d|20\d\d)\b/) || [])[1] || 0);
        const ay = 742, x0 = M, x1 = W - M, step = 24, per = 5;          // five minor ticks to a year
        const s = CR.svg(CR.L.mid);
        const base = CR.sv('line', { x1: x0, y1: ay, x2: x0, y2: ay, stroke: CR.rgba(pal.ink, .5), 'stroke-width': 1.5 }, s);
        const n = Math.floor((x1 - x0) / step), mi = Math.round(n * .68 / per) * per, mx = x0 + mi * step;
        const ticks = [];
        for (let i = 0; i <= n; i++) {
          const x = x0 + i * step, major = (i - mi) % per === 0;
          const l = CR.sv('line', { x1: x, y1: ay, x2: x, y2: ay + (major ? 20 : 9), stroke: CR.rgba(pal.ink, major ? .5 : .22), 'stroke-width': major ? 1.5 : 1, opacity: 0 }, s);
          let lab = null;
          if (major && yr && i !== mi) { lab = CR.sv('text', { x, y: ay + 50, 'text-anchor': 'middle', fill: CR.rgba(pal.ink, .4), 'font-family': F.mono, 'font-size': 18, opacity: 0 }, s); lab.textContent = String(yr + (i - mi) / per); }
          ticks.push([x, l, lab]);
        }
        const a0 = at(.1), a1 = a0 + 1.5;
        CR.on(tt => { const p = CR.sseg(tt, a0, a1), xe = lerp(x0, x1, p); base.setAttribute('x2', xe.toFixed(1));
          ticks.forEach(([x, l, lab]) => { const q = clamp((xe - x) / 80).toFixed(3); l.setAttribute('opacity', q); if (lab) lab.setAttribute('opacity', q); }); });
        const mk = CR.sv('line', { x1: mx, y1: ay, x2: mx, y2: ay, stroke: pal.accent, 'stroke-width': 3 }, s);
        mk.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
        const dot = CR.sv('circle', { cx: mx, cy: ay, r: 7, fill: pal.accent, opacity: 0 }, s);
        const m0 = at(1.2);
        CR.on(tt => { const p = CR.sseg(tt, m0, m0 + .8); mk.setAttribute('y2', (ay - 132 * p).toFixed(1)); dot.setAttribute('opacity', CR.sseg(tt, m0 - .15, m0 + .2).toFixed(3)); });
        if (yr) CR.text(L, String(yr), { font: 'mono', size: 30, weight: 700, x: mx - 120, y: ay + 30, width: 240, align: 'center', color: pal.accent, anim: 'mask_wipe', t0: m0 + .3 });
        CR.beat = m0;
        const one = fitSize(up ? t.toUpperCase() : t, 'head', x1 - x0, 176, 100, up ? .03 : -.01);
        const size = one > 100 ? one : Math.max(84, fitSize(up ? t.toUpperCase() : t, 'head', (x1 - x0) * 1.9, 128, 84));
        const tx = CR.text(L, t, hero({ font: 'head', size, x: x0, y: 0, width: x1 - x0, upper: up, ls: up ? .03 : -.01, lh: 1.0, t0: at(.45), key: S.key }));
        const th = tx.el.offsetHeight, ty = ay - 176 - th; tx.el.style.top = ty + 'px';
        if (S.kicker) CR.label(L, S.kicker, { x: x0 + 2, y: ty - 58, size: 26, ls: .28, t0: at(.3), color: pal.accent });
        if (S.sub) CR.text(L, S.sub, { font: 'serif', italic: true, size: 34, x: x0 + 2, y: ay + 104, width: 1200, color: pal.dim, anim: 'mask_wipe', t0: at(1.0) });
        CR.focus = [mx, ay - 220];
      } },
      report: { build() {
        // paper_desk: a typed report cover laid on the desk over the sheet beneath it, the moment's print clipped on
        const src = photoOf('still', 'photo');
        const sw = 800, sh = 1000, sx = (W - sw) / 2, sy = 44;
        const under = CR.sheet(CR.L.back, { x: sx + 30, y: sy + 16, w: sw, h: sh, color: CR.mix(pal.paper, '#A89C84', .38), pad: 0, seed: 23, age: .8 });
        CR.enter(under.el, { kind: 'land', t0: 0, rot: 2.6, dur: .5 });
        const cover = CR.sheet(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, pad: 0, seed: 24, age: .55 });
        CR.enter(cover.el, { kind: 'land', t0: at(.12), rot: -.7, dur: .55 });
        const host = cover.el, ink = pal.sink, X = 84, TW = sw - 168, dimk = CR.mix(ink, pal.paper, .42);
        let y = 92;
        if (S.kicker) { CR.text(host, S.kicker, { font: 'cond', size: 24, upper: true, ls: .34, x: X, y, width: TW, align: 'center', color: dimk, onLight: true, anim: 'none', t0: 0 }); y += 52; }
        CR.el('div', `position:absolute;left:${X}px;top:${y}px;width:${TW}px;height:3px;background:${ink}`, host);
        CR.el('div', `position:absolute;left:${X}px;top:${y + 8}px;width:${TW}px;height:1px;background:${ink}`, host);
        y += 64;
        const t = String(S.text || S.title || '').toUpperCase();
        const size = Math.min(66, fitSize(t, 'mono', TW, 66, 40));
        const anim = ['typewriter', 'mask_wipe', 'redaction'].includes(CR.anim.hero) ? CR.anim.hero : 'typewriter';
        const tx = CR.text(host, t, hero({ font: 'mono', size, weight: 700, x: X, y, width: TW, align: 'center', lh: 1.12, color: ink, onLight: true, t0: at(.7), cps: 20, anim }));
        y += tx.el.offsetHeight + 34;
        CR.rule(host, { x: sw / 2 - 60, y, w: 120, h: 3, color: pal.accent, glow: false, from: 'center', t0: tx.end + .1, dur: .4 });
        y += 34;
        if (S.sub) { const sb = CR.text(host, S.sub, { font: 'mono', size: 28, x: X, y, width: TW, align: 'center', color: dimk, onLight: true, anim: 'typewriter', t0: tx.end + .3, cps: 30 }); y += sb.el.offsetHeight; }
        if (src && sh - y - 90 >= 300) {
          const pw = 520, ph = Math.min(380, sh - y - 150), px = (sw - pw) / 2 - 20, py = sh - ph - 96;
          const p = CR.photo(host, src, { x: px, y: py, w: pw, h: ph, frame: 'print', treat: 'print', seed: 25, focus: [.5, .45] });
          CR.enter(p.el, { kind: 'land', t0: at(.35), rot: 1.6, dur: .5 });
          CR.clip(host, px + p.w - 90, py - 34, 4);
        } else { host.style.top = ((H - sh) / 2 + 20) + 'px'; }
        CR.focus = [W / 2, sy + 330];
      } },
      stencil: { build() {
        // concrete: the title stencilled on the wall in off-white paint (worn, a soft overspray), the place and year on
        // a typed notice taped under it
        const L = CR.L.front, t = String(S.text || S.title || '').toUpperCase();
        const paint = CR.mix(pal.ink, '#CFCAC0', .25);
        const size = fitSize(t, 'stamp', W - 2 * M, 270, 120, .03);
        const tx = CR.text(L, t, { font: 'stamp', size, x: M, y: 0, width: W - 2 * M, ls: .03, lh: .92, color: paint, anim: 'mask_wipe', t0: at(.25), dur: 1.3, glow: false,
          shadow: `0 0 ${(size * .045).toFixed(1)}px ${CR.rgba(paint, .32)}` });
        tx.el.style.webkitMaskImage = `url(${CR.wear()})`; tx.el.style.webkitMaskSize = '100% 100%'; tx.el.style.mixBlendMode = 'screen'; tx.el.style.opacity = .93;
        const th = tx.el.offsetHeight, top = (H - th) / 2 - 80; tx.el.style.top = top + 'px';
        if (S.kicker) CR.text(L, S.kicker, { font: 'cond', size: 30, upper: true, ls: .3, x: M + 4, y: top - 64, width: W - 2 * M, color: pal.dim, anim: 'mask_wipe', t0: at(.15) });
        if (S.sub) {
          const sz = 34, nw = Math.min(1000, measure(String(S.sub), 'mono', sz) + 130);
          const no = CR.sheet(CR.L.mid, { x: M, y: top + th + 56, w: nw, h: 112, pad: 0, seed: 27, age: .5 });
          CR.enter(no.el, { kind: 'land', t0: at(.9), rot: -1, dur: .45 });
          CR.tape(no.el, 30, 8, 110, -24); CR.tape(no.el, nw - 30, 8, 110, 22);
          CR.text(no.el, S.sub, { font: 'mono', size: sz, x: 64, y: 34, width: nw - 100, color: pal.sink, onLight: true, anim: 'typewriter', t0: at(1.3), cps: 28 });
        }
        CR.focus = [W / 2, top + th / 2];
      } },
      credits: { build() {
        if (CR.foot) CR.footLook(3, .42, .85);
        const t = String(S.text || S.title || ''), up = CR.case === 'upper';
        const B = block(CR.L.front, 'c', W - 320), host = B.el, cen = B.align === 'center';
        const size = fitSize(up ? t.toUpperCase() : t, 'head', B.w, up ? 112 : 132, 64, up ? .14 : 0);
        let y = 0;
        if (S.kicker) { CR.label(host, S.kicker, { x: 0, y: 0, width: B.w, align: B.align, size: 26, ls: .34, t0: at(.15), color: CR.light ? dimOn(true) : pal.dim }); y = 78; }
        const tx = CR.text(host, t, hero({ font: 'head', size, x: 0, y, width: B.w, align: B.align, upper: up, ls: up ? .14 : .01, t0: at(.35), key: S.key,
          anim: CR.anim.hero === 'typewriter' ? 'tracking_open' : CR.anim.hero }));
        y += tx.el.offsetHeight;
        CR.rule(host, { x: cen ? B.w / 2 - 130 : 0, y: y + 34, w: 260, h: 2, from: cen ? 'center' : 'left', t0: at(1.0), dur: .9, color: pal.accent });
        if (S.sub) { CR.text(host, S.sub, { font: 'serif', size: 36, italic: true, x: 0, y: y + 64, width: B.w, align: B.align, color: CR.light ? dimOn(true) : pal.dim, anim: 'mask_wipe', t0: at(1.3) }); y += 110; } else y += 40;
        const top = B.pin(y, 900, 150);
        CR.focus = [B.x + B.w / 2, top + y / 2];
      } },
      monolith: { build() {
        const t = String(S.text || S.title || ''), up = CR.case === 'upper';
        const role = CR.W === 'concrete' ? 'cond' : 'head';
        const B = block(CR.L.front, 'll', W - 2 * M), host = B.el;
        if (CR.foot) { CR.footLook(0, .62, .92); veil(CR.L.back, B.veil()); }
        const one = fitSize(up ? t.toUpperCase() : t, role, B.w, B.cls === 'rp' ? 150 : 250, 120, up ? .02 : -.01);
        const size = one > 120 ? one : Math.max(B.cls === 'rp' ? 88 : 104, fitSize(up ? t.toUpperCase() : t, role, B.w * 1.85, 168, B.cls === 'rp' ? 88 : 104));
        let y = 0;
        if (S.kicker) { CR.rule(host, { x: B.align === 'center' ? B.w / 2 - 28 : 0, y: 16, w: 56, h: 3, t0: at(.1), color: pal.accent });
          CR.label(host, S.kicker, { x: B.align === 'center' ? 0 : 76, y: B.align === 'center' ? 34 : 0, width: B.align === 'center' ? B.w : B.w - 76, align: B.align, size: 26, ls: .28, t0: at(.15) }); y = B.align === 'center' ? 96 : 60; }
        const tx = CR.text(host, t, hero({ font: role, size, x: 0, y, width: B.w, align: B.align, upper: up, ls: up ? .02 : -.01, lh: .98, t0: at(.3), key: S.key }));
        y += tx.el.offsetHeight + (tx.pad || 0);           // tx.pad: a turned stamp reaches below its box
        if (S.sub) { CR.text(host, S.sub, { font: 'body', size: 34, x: 4, y: y + 26, width: B.w - 8, align: B.align, color: pal.dim, anim: 'mask_wipe', t0: at(1.1), weight: 500 }); y += 80; }
        const top = B.pin(y, 930, 130);
        CR.focus = [B.x + B.w * .45, top + y / 2];
      } },
      masthead: { build() {
        // a front page: double rule, kicker, the headline, a dateline, and the moment's own picture as the lead photo
        const news = CR.W === 'newsprint';
        let host = CR.L.mid, w = W, h = H, padT = 110, padB = 96;
        if (!news) {                                         // paper_desk: the front page is a sheet laid on the desk
          const sh = CR.sheet(CR.L.mid, { x: 250, y: 70, w: 1420, h: 940, color: CR.mix(pal.paper, '#D9D2C2', .3), pad: 0, seed: 21, age: .7 });
          CR.enter(sh.el, { kind: 'land', t0: 0, rot: -.7, dur: .6 });
          host = sh.el; w = 1420; h = 940; padT = 64; padB = 64;
        }
        const rw = w - (news ? 2 * M : 140), rx = (w - rw) / 2, ink = pal.sink;
        const box = CR.el('div', `position:absolute;left:0;top:0;width:${w}px;height:${h}px`, host);
        CR.rule(box, { x: rx, y: 0, w: rw, h: 7, color: ink, t0: at(.25), dur: .7, from: 'center', glow: false });
        CR.rule(box, { x: rx, y: 14, w: rw, h: 2, color: ink, t0: at(.35), dur: .7, from: 'center', glow: false });
        if (S.kicker) CR.text(box, S.kicker, { font: 'cond', size: 24, ls: .3, upper: true, x: rx, y: 30, width: rw, align: 'center', color: ink, onLight: true, anim: 'mask_wipe', t0: at(.45) });
        const t = String(S.text || S.title || '');
        const size = fitSize(t, 'head', rw, news ? 168 : 150, 84);
        const tx = CR.text(box, t, hero({ font: 'head', size, weight: Math.max(CR.FW.head, 700), x: rx, y: 78, width: rw, align: 'center', lh: 1.0, color: ink, onLight: true, t0: at(.55), key: S.key, keyColor: pal.accent,
          anim: ['typewriter', 'stamp', 'tracking_open'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
        let y = 78 + tx.el.offsetHeight + 18;
        CR.rule(box, { x: rx, y, w: rw, h: 2, color: ink, t0: at(1.0), dur: .6, from: 'center', glow: false });
        if (S.sub) { CR.text(box, S.sub, { font: 'serif', italic: true, size: 32, x: rx, y: y + 14, width: rw, align: 'center', color: CR.mix(ink, pal.paper, .25), onLight: true, anim: 'mask_wipe', t0: at(1.15) }); y += 62; }
        CR.rule(box, { x: rx, y: y + 14, w: rw, h: 2, color: ink, t0: at(1.1), dur: .6, from: 'center', glow: false });
        y += 16;
        const src = photoOf('still', 'photo'), phH = h - padB - padT - y - 34;
        if (src && phH >= 220) {
          const ph = CR.photo(box, src, { x: rx, y: y + 34, w: rw, h: phH, treat: 'halftone', frame: 'none', focus: [.5, .45] });
          CR.enter(ph.el, { kind: 'fade', t0: at(.8), dur: .9 });
          box.style.top = padT + 'px';
        } else box.style.top = ((h - y) / 2) + 'px';
        CR.focus = [W / 2, 400];
      } },
      split: { build() {
        const L = CR.L.front, src = photoOf('photo', 'still'), pw = src ? 900 : 1180;     // no picture: the panel takes more
        const pn = CR.panel(CR.L.mid, { x: -20, y: -20, w: pw + 20, h: H + 40, r: 0 });
        pn.el.style.background = `linear-gradient(90deg, ${CR.rgba(CR.mix(pal.ground, '#000', .35), .94)}, ${CR.rgba(CR.mix(pal.ground, '#FFFFFF', .04), .9)})`;
        CR.enter(pn.el, { kind: 'slide', dx: -90, t0: 0, dur: .8 });
        if (src) { const ph = CR.photo(CR.L.back, src, { x: pw + 90, y: 150, w: W - pw - 210, h: 780, frame: 'glass', treat: 'clean' }); CR.enter(ph.el, { kind: 'fade', t0: at(.35), dur: 1.1 }); }
        CR.rule(L, { x: pw, y: 0, w: 2, h: H, color: pal.accent, t0: at(.2), dur: .9 }).el.style.transformOrigin = '50% 0%';
        const t = String(S.text || S.title || ''), up = CR.case === 'upper';
        const inner = pw - M - 60, one = fitSize(up ? t.toUpperCase() : t, 'head', inner, 156, 96);
        const size = one > 96 ? one : Math.min(120, fitSize(up ? t.toUpperCase() : t, 'head', inner * 2.4, 120, 68));
        if (S.kicker) CR.label(L, S.kicker, { x: M, y: 330, size: 24, ls: .26, t0: at(.3), color: pal.accent });
        const tx = CR.text(L, t, hero({ font: 'head', size, x: M, y: 380, width: pw - M - 60, upper: up, lh: 1.02, t0: at(.45), key: S.key }));
        const r = tx.el.getBoundingClientRect();
        if (S.sub) CR.text(L, S.sub, { font: 'body', size: 30, x: M, y: r.bottom + 34, width: pw - M - 80, color: pal.dim, anim: 'mask_wipe', t0: at(1.2) });
        CR.focus = [pw * .55, 520];
      } },
      title_block: { build() {
        const L = CR.L.front, ink = pal.ink, bw = 980, bh = 330, bx = W - M - bw, by = H - 96 - bh;
        const s = CR.svg(CR.L.mid);
        const line = (x1, y1, x2, y2, w, t0) => { const l = CR.sv('line', { x1, y1, x2: x1, y2: y1, stroke: ink, 'stroke-width': w || 2, opacity: .85 }, s);
          CR.on(t => { const p = CR.sseg(t, t0, t0 + .6); l.setAttribute('x2', lerp(x1, x2, p)); l.setAttribute('y2', lerp(y1, y2, p)); }); return l; };
        line(bx, by, bx + bw, by, 3, at(.1)); line(bx, by + bh, bx + bw, by + bh, 3, at(.15)); line(bx, by, bx, by + bh, 3, at(.1)); line(bx + bw, by, bx + bw, by + bh, 3, at(.15));
        line(bx, by + 92, bx + bw, by + 92, 1.5, at(.3)); line(bx, by + 250, bx + bw, by + 250, 1.5, at(.35)); line(bx + bw * .6, by + 250, bx + bw * .6, by + bh, 1.5, at(.4));
        const lab = (str, x, y) => CR.text(L, str, { font: 'mono', size: 17, ls: .12, upper: true, x, y, color: pal.dim, anim: 'none', t0: at(.45) });
        lab(CR.t('project'), bx + 22, by + 16); lab(CR.t('title'), bx + 22, by + 104); lab(CR.t('date'), bx + 22, by + 262); lab(CR.t('sheet'), bx + bw * .6 + 22, by + 262);
        if (S.kicker) CR.text(L, S.kicker, { font: 'mono', size: 26, upper: true, ls: .06, x: bx + 22, y: by + 44, width: bw - 44, nowrap: true, anim: 'typewriter', t0: at(.5), color: pal.dim });
        const t = String(S.text || S.title || '');
        const size = fitSize(t.toUpperCase(), 'cond', bw - 44, 92, 52, .02);
        CR.text(L, t, hero({ font: 'cond', size, upper: true, ls: .02, x: bx + 22, y: by + 128, width: bw - 44, lh: 1, t0: at(.6), key: S.key, anim: CR.anim.hero === 'tracking_open' ? 'mask_wipe' : CR.anim.hero }));
        CR.text(L, S.sub || '', { font: 'mono', size: 26, x: bx + 22, y: by + 286, anim: 'typewriter', t0: at(1.1) });
        CR.text(L, '1 / 1', { font: 'mono', size: 26, x: bx + bw * .6 + 22, y: by + 286, anim: 'none', t0: at(1.1) });
        // the drawing itself: the title as outlined linework in the field, measured by a dimension line
        const big = t.toUpperCase(), bz = Math.min(250, fitSize(big, 'cond', W - 2 * M, 250, 110, .02));
        const out = CR.text(L, big, { font: 'cond', size: bz, ls: .02, x: M, y: 210, width: W - 2 * M, lh: .95, color: 'transparent', anim: 'mask_wipe', t0: at(.25), dur: 1.1, glow: false });
        out.el.style.webkitTextStroke = `3px ${CR.rgba(ink, .92)}`;
        const tw = Math.min(W - 2 * M, measure(big, 'cond', bz, null, .02)), dy = 168;
        line(M, dy, M + tw, dy, 1.5, at(.15));
        const tick = x => line(x, dy - 16, x, dy + 16, 1.5, at(.45)); tick(M); tick(M + tw);
        CR.focus = [W / 2, 420];
      } },
    },
  });

  // ══ CHAPTER (cinema fields: n, kicker, title, episode, ground, dark) ════════════════════════════════════════════
  CR.scene('chapter', {
    s: 4.4,
    layout: { void_black: 'numeral', navy_falloff: 'bearing', charcoal_light: 'numeral', glass_dark: 'pane', paper_desk: 'tab', newsprint: 'section',
              blueprint: 'section', concrete: 'stencil', light_table: 'slide', footage_sharp: 'rule_centre', footage_moving: 'rule_centre' },
    comps: {
      bearing: { build() {
        // navy: a bearing dial — the ring and its degree ticks draw round, the needle swings (smoothstep) to this
        // chapter's bearing, the number rolls in at its centre; the title stands to its right
        const L = CR.L.front, n = String(S.n || '1'), cx = 540, cy = 540, R = 300, ink = pal.ink;
        const s = CR.svg(CR.L.mid);
        const ring = CR.sv('circle', { cx, cy, r: R, fill: 'none', stroke: CR.rgba(ink, .42), 'stroke-width': 1.5, transform: `rotate(-90 ${cx} ${cy})` }, s);
        CR.sv('circle', { cx, cy, r: R - 66, fill: 'none', stroke: CR.rgba(ink, .12), 'stroke-width': 1 }, s);
        const C = 2 * Math.PI * R; ring.style.strokeDasharray = `${C} ${C}`;
        const ticks = [];
        for (let d = 0; d < 360; d += 5) {
          const major = d % 30 === 0, a = (d - 90) * Math.PI / 180, r0 = R - (major ? 28 : 12);
          const l = CR.sv('line', { x1: cx + Math.cos(a) * r0, y1: cy + Math.sin(a) * r0, x2: cx + Math.cos(a) * R, y2: cy + Math.sin(a) * R, stroke: CR.rgba(ink, major ? .62 : .26), 'stroke-width': major ? 2 : 1, opacity: 0 }, s);
          let lab = null;
          if (major) { const rl = R + 40; lab = CR.sv('text', { x: cx + Math.cos(a) * rl, y: cy + Math.sin(a) * rl + 6, 'text-anchor': 'middle', fill: CR.rgba(ink, .42), 'font-family': F.mono, 'font-size': 17, opacity: 0 }, s); lab.textContent = String(d).padStart(3, '0'); }
          ticks.push([d, l, lab]);
        }
        const brg = (37 * (parseInt(n, 10) || 1) + 18) % 360;
        const g = CR.sv('g', {}, s);
        CR.sv('line', { x1: cx, y1: cy - (R - 74), x2: cx, y2: cy - R + 2, stroke: pal.accent, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
        CR.sv('path', { d: `M${cx - 9},${cy - R - 4} L${cx},${cy - R - 24} L${cx + 9},${cy - R - 4} Z`, fill: pal.accent }, g);
        g.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
        const a0 = at(.05), a1 = a0 + 1.2, n0 = at(.55), n1 = n0 + 1.5;
        CR.on(t => {
          const p = CR.sseg(t, a0, a1);
          ring.style.strokeDashoffset = (C * (1 - p)).toFixed(1);
          ticks.forEach(([d, l, lab]) => { const q = clamp((p * 360 - d) / 40).toFixed(3); l.setAttribute('opacity', q); if (lab) lab.setAttribute('opacity', q); });
          const q = CR.sseg(t, n0, n1);
          g.setAttribute('transform', `rotate(${(brg - 110 * (1 - q)).toFixed(3)} ${cx} ${cy})`); g.style.opacity = CR.sseg(t, n0 - .2, n0 + .3).toFixed(3);
        });
        CR.beat = n1;
        const od = CR.odometer(L, n.padStart(2, '0'), { x: cx, y: cy - 98, size: 190, align: 'center', t0: at(.4), dur: 1.1, font: 'head' });
        void od;
        const colX = 1010, cw = W - colX - M;
        CR.label(L, S.kicker || `${CR.t('chapter')} ${n}`, { x: colX, y: 408, size: 28, ls: .3, t0: at(.35), color: pal.accent });
        CR.rule(L, { x: colX, y: 454, w: 90, h: 3, t0: at(.45), color: pal.accent });
        const t = String(S.title || ''), up = CR.case === 'upper';
        const size = Math.min(112, fitSize(up ? t.toUpperCase() : t, 'head', cw * 1.9, 112, 64));
        const tx = CR.text(L, t, hero({ font: 'head', size, x: colX, y: 484, width: cw, upper: up, lh: 1.02, t0: at(.6) }));
        if (S.episode) CR.text(L, S.episode, { font: 'serif', italic: true, size: 30, x: colX, y: 484 + tx.el.offsetHeight + 40, width: cw, color: pal.dim, anim: 'mask_wipe', t0: at(1.3) });
        CR.focus = [W * .5, 540];
      } },
      pane: { build() {
        // glass: a frosted glass card rises out of the night glass and a light sheen crosses it once; the chapter number
        // large and light on its left, the title on its right
        const n = String(S.n || '1'), cw = 1320, ch = 540, cx = (W - cw) / 2, cy = (H - ch) / 2;
        const card = CR.glass(CR.L.mid, { x: cx, y: cy, w: cw, h: ch, r: 26 });
        CR.enter(card.el, { kind: 'rise', t0: 0, dur: .9 });
        const sheen = CR.el('div', 'position:absolute;top:-20%;bottom:-20%;left:0;width:300px;transform:skewX(-18deg);background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.09), rgba(255,255,255,0));opacity:0', card.el);
        CR.on(t => { const p = CR.sseg(t, at(.45), at(.45) + 1.6); sheen.style.left = lerp(-360, cw + 60, p).toFixed(1) + 'px'; sheen.style.opacity = (p > 0 && p < 1) ? 1 : 0; });
        const num = CR.text(card.el, n.padStart(2, '0'), { font: 'body', size: 300, weight: 200, ls: -.04, x: 64, y: 0, lh: 1, nowrap: true, color: CR.rgba(pal.ink, .92), anim: 'focus_pull', t0: at(.3), dur: .9 });
        num.el.style.top = ((ch - num.el.offsetHeight) / 2 - 6) + 'px';
        const colX = 64 + num.el.offsetWidth + 70, cw2 = cw - colX - 70;
        CR.rule(card.el, { x: colX - 36, y: 120, w: 1.5, h: ch - 240, color: CR.rgba(pal.ink, .3), glow: false, t0: at(.35), dur: .8 }).el.style.transformOrigin = '50% 0';
        const t = String(S.title || ''), up = CR.case === 'upper';
        const size = Math.min(92, fitSize(up ? t.toUpperCase() : t, 'head', cw2 * 1.9, 92, 54));
        const kl = CR.label(card.el, S.kicker || `${CR.t('chapter')} ${n}`, { x: colX, y: 0, size: 26, ls: .3, t0: at(.4), color: pal.accent2 });
        const tx = CR.text(card.el, t, hero({ font: 'head', size, x: colX, y: 0, width: cw2, upper: up, lh: 1.04, t0: at(.55) }));
        const ep = S.episode ? CR.text(card.el, S.episode, { font: 'serif', italic: true, size: 30, x: colX, y: 0, width: cw2, color: pal.dim, anim: 'mask_wipe', t0: at(1.2) }) : null;
        const hh = 56 + tx.el.offsetHeight + (ep ? 30 + ep.el.offsetHeight : 0), y0 = (ch - hh) / 2;
        kl.el.style.top = y0 + 'px';
        tx.el.style.top = (y0 + 56) + 'px';
        if (ep) ep.el.style.top = (y0 + 56 + tx.el.offsetHeight + 30) + 'px';
        CR.focus = [W / 2, H / 2];
      } },
      stencil: { build() {
        // concrete: the chapter number stencilled big in off-white paint (worn), the title in condensed capitals beside it
        const L = CR.L.front, n = String(S.n || '1'), paint = CR.mix(pal.ink, '#CFCAC0', .25);
        const num = CR.text(CR.L.mid, n.padStart(2, '0'), { font: 'stamp', size: 500, x: M - 14, y: 0, lh: .86, nowrap: true, color: paint, anim: 'mask_wipe', t0: at(.1), dur: 1.0, glow: false,
          shadow: `0 0 22px ${CR.rgba(paint, .3)}` });
        num.el.style.webkitMaskImage = `url(${CR.wear()})`; num.el.style.webkitMaskSize = '100% 100%'; num.el.style.mixBlendMode = 'screen'; num.el.style.opacity = .9;
        const nh = num.el.offsetHeight; num.el.style.top = ((H - nh) / 2 - 10) + 'px';
        const colX = M - 14 + num.el.offsetWidth + 90, cw = W - colX - M;
        const t = String(S.title || '').toUpperCase();
        const size = Math.min(124, fitSize(t, 'cond', cw * 1.9, 124, 70, .01));
        const tx = CR.text(L, t, hero({ font: 'cond', size, weight: Math.max(600, CR.FW.cond), x: colX, y: 0, width: cw, ls: .01, lh: .98, t0: at(.5) }));
        const th = tx.el.offsetHeight, ty = (H - th) / 2 + 20; tx.el.style.top = ty + 'px';
        CR.text(L, S.kicker || `${CR.t('chapter')} ${n}`, { font: 'cond', size: 30, upper: true, ls: .3, x: colX + 2, y: ty - 66, width: cw, color: pal.dim, anim: 'mask_wipe', t0: at(.3) });
        CR.rule(L, { x: colX + 2, y: ty - 20, w: 90, h: 4, color: paint, glow: false, t0: at(.35) });
        if (S.episode) CR.text(L, S.episode, { font: 'mono', size: 30, x: colX + 2, y: ty + th + 34, width: cw, color: pal.dim, anim: 'typewriter', t0: at(1.2), cps: 30 });
        CR.focus = [W / 2, H / 2];
      } },
      slide: { build() {
        // light_table: a 35 mm slide mount lies on the lit table — its window glows with the moment's picture (or the
        // number), the mount's printed edge carries the chapter; the title beside it in dark ink
        const n = String(S.n || '1'), src = photoOf('still'), mw = 660, mh = 660, mx = 230, my = (H - mh) / 2, mc = '#ECE9E2';
        const mount = CR.el('div', `position:absolute;left:${mx}px;top:${my}px;width:${mw}px;height:${mh}px;border-radius:30px;background:${mc} url(${CR.paperURL(mw, mh, mc, 51, .12)}) center/100% 100%;` +
          'box-shadow:0 2px 2px rgba(0,0,0,.18), 0 24px 46px rgba(0,0,0,.22)', CR.L.mid);
        CR.enter(mount, { kind: 'land', t0: 0, rot: -1.6, dur: .55 });
        const ww = 510, wh = 340, wx = (mw - ww) / 2, wy = (mh - wh) / 2;
        const win = CR.el('div', `position:absolute;left:${wx}px;top:${wy}px;width:${ww}px;height:${wh}px;border-radius:8px;overflow:hidden;background:#FFFFFF;box-shadow:inset 0 0 0 2px rgba(0,0,0,.16)`, mount);
        const pr = CR.mix(pal.sink, mc, .32);
        CR.text(mount, (S.kicker || `${CR.t('chapter')} ${n}`).toUpperCase(), { font: 'mono', size: 22, ls: .16, x: 0, y: wy - 64, width: mw, align: 'center', color: pr, onLight: true, anim: 'none', t0: 0 });
        if (src) {
          CR.photo(win, src, { x: 0, y: 0, w: ww, h: wh, frame: 'none', treat: 'slide', focus: [.5, .45] });
          CR.text(mount, n.padStart(2, '0'), { font: 'mono', size: 26, weight: 700, x: 0, y: wy + wh + 32, width: mw, align: 'center', color: pr, onLight: true, anim: 'none', t0: 0 });
        } else CR.text(win, n.padStart(2, '0'), { font: 'head', size: 210, x: 0, y: (wh - 230) / 2, width: ww, align: 'center', lh: 1.05, color: pal.sink, onLight: true, anim: 'focus_pull', t0: at(.4) });
        const colX = mx + mw + 110, cw = W - colX - M;
        const t = String(S.title || '');
        const size = Math.min(100, fitSize(t, 'head', cw * 1.9, 100, 58));
        const tx = CR.text(CR.L.front, t, hero({ font: 'head', size, x: colX, y: 0, width: cw, lh: 1.04, color: pal.sink, onLight: true, t0: at(.55), anim: CR.anim.hero === 'tracking_open' ? 'focus_pull' : CR.anim.hero }));
        const th = tx.el.offsetHeight, ty = (H - th) / 2 - (S.episode ? 30 : 0); tx.el.style.top = ty + 'px';
        CR.rule(CR.L.front, { x: colX, y: ty - 34, w: 80, h: 3, color: pal.accent, glow: false, t0: at(.4) });
        if (S.episode) CR.text(CR.L.front, S.episode, { font: 'serif', italic: true, size: 32, x: colX, y: ty + th + 30, width: cw, color: CR.mix(pal.sink, pal.ground, .4), onLight: true, anim: 'mask_wipe', t0: at(1.2) });
        CR.focus = [mx + mw / 2 + 200, H / 2];
      } },
      numeral: { build() {
        const L = CR.L.front, n = String(S.n || '1');
        const conc = CR.W === 'concrete';
        const big = CR.el('div', `position:absolute;left:${M - 20}px;top:150px;font-family:${conc ? F.stamp : F.display};font-size:640px;font-weight:${conc ? 400 : CR.FW.display};line-height:.86;` +
          `color:${conc ? CR.rgba(pal.accent, .82) : 'transparent'};-webkit-text-stroke:${conc ? 0 : 2.5}px ${CR.rgba(pal.ink, .42)};overflow:hidden;padding-bottom:20px`, CR.L.mid);
        if (conc) { big.style.webkitMaskImage = `url(${CR.wear()})`; big.style.webkitMaskSize = '100% 100%'; big.style.mixBlendMode = 'screen'; }
        const inner = CR.el('span', 'display:inline-block', big, esc(n.padStart(2, '0')));
        CR.on(t => { const p = CR.sseg(t, at(.1), at(.1) + .9); inner.style.transform = `translateY(${((1 - p) * 104).toFixed(2)}%)`; });
        const colX = conc ? 980 : 900, cw = W - colX - M;
        CR.label(L, S.kicker || `${CR.t('chapter')} ${n}`, { x: colX, y: 400, size: 28, ls: .3, t0: at(.35), color: pal.accent });
        CR.rule(L, { x: colX, y: 446, w: 90, h: 3, t0: at(.45), color: pal.accent });
        const t = String(S.title || '');
        const size = Math.min(118, fitSize(t, 'head', cw * 1.9, 118, 66));
        const tx = CR.text(L, t, hero({ font: 'head', size, x: colX, y: 476, width: cw, lh: 1.02, t0: at(.55) }));
        if (S.episode) CR.text(L, S.episode, { font: 'serif', italic: true, size: 30, x: colX, y: 476 + tx.el.offsetHeight + 40, width: cw, color: pal.dim, anim: 'mask_wipe', t0: at(1.3) });
        CR.focus = [W * .45, 520];
      } },
      rule_centre: { build() {
        const B = block(CR.L.front, 'c', W - 360), cen = B.align === 'center';
        if (CR.foot) { CR.footLook(6, .42, .55); veil(CR.L.back, B.cls === 'c' ? 'all' : B.veil()); }
        const n = String(S.n || '1');
        CR.label(B.el, S.kicker || `${CR.t('chapter')} ${n}`, { x: 0, y: 0, width: B.w, align: B.align, size: 28, ls: .36, t0: at(.15), color: pal.accent });
        CR.rule(B.el, { x: cen ? B.w / 2 - 160 : 0, y: 52, w: 320, h: 2, from: cen ? 'center' : 'left', t0: at(.3), dur: .9, color: pal.accent });
        const t = String(S.title || ''), up = CR.case === 'upper';
        const size = Math.min(124, fitSize(up ? t.toUpperCase() : t, 'head', B.w, 124, 70, up ? .1 : 0));
        const tx = CR.text(B.el, t, hero({ font: 'head', size, x: 0, y: 86, width: B.w, align: B.align, upper: up, ls: up ? .1 : 0, t0: at(.45) }));
        let y = 86 + tx.el.offsetHeight;
        if (S.episode) { CR.text(B.el, S.episode, { font: 'serif', italic: true, size: 32, x: 0, y: y + 40, width: B.w, align: B.align, color: pal.dim, anim: 'mask_wipe', t0: at(1.2) }); y += 90; }
        const top = B.pin(y, 900, 150);
        CR.focus = [B.x + B.w / 2, top + y / 2];
      } },
      tab: { build() {
        const fw = 1520, fh = 860, fx = (W - fw) / 2, fy = 150;
        const kraft = '#C7A36A';
        const folder = CR.el('div', `position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;transform-origin:50% 50%`, CR.L.mid);
        const tab = CR.el('div', `position:absolute;left:60px;top:-62px;width:420px;height:80px;border-radius:14px 14px 0 0;background:${kraft} url(${CR.paperURL(420, 80, kraft, 41, .8)}) center/100% 100%`, folder);
        const body = CR.el('div', `position:absolute;inset:0;border-radius:4px 10px 10px 10px;background:${kraft} url(${CR.paperURL(fw, fh, kraft, 42, .8)}) center/100% 100%;box-shadow:0 30px 60px rgba(0,0,0,.5)`, folder);
        CR.enter(folder, { kind: 'land', t0: 0, rot: -1.4, dur: .6 });
        const n = String(S.n || '1');
        CR.text(tab, (S.kicker || `${CR.t('chapter')} ${n}`), { font: 'stamp', size: 40, upper: true, ls: .08, x: 0, y: 16, width: 420, align: 'center', color: CR.mix(pal.sink, kraft, .2), onLight: true, anim: 'none', t0: 0 });
        const lw = 1000, lh = 300;
        const label = CR.sheet(body, { x: (fw - lw) / 2, y: 250, w: lw, h: lh, color: '#F1ECDF', pad: 0, seed: 43, age: .25 });
        label.el.style.boxShadow = '0 2px 3px rgba(0,0,0,.25)';
        CR.el('div', `position:absolute;left:30px;right:30px;top:86px;height:2px;background:${CR.rgba(pal.accent, .55)}`, label.el);
        const t = String(S.title || '');
        CR.text(label.el, t, hero({ font: 'mono', size: Math.min(64, fitSize(t, 'mono', (lw - 80) * 1.9, 64, 38)), x: 40, y: 112, width: lw - 80, lh: 1.08, color: pal.sink, onLight: true, t0: at(.6), anim: 'typewriter', cps: 26 }));
        CR.text(label.el, (S.kicker || `${CR.t('chapter')} ${n}`).toUpperCase(), { font: 'cond', size: 30, ls: .2, x: 40, y: 34, color: CR.mix(pal.sink, '#F1ECDF', .35), onLight: true, anim: 'none', t0: 0 });
        if (S.episode) CR.text(body, S.episode, { font: 'hand', size: 54, x: (fw - lw) / 2 + 10, y: 610, width: lw, color: pal.accent, onLight: true, anim: 'mask_wipe', t0: at(1.6), dur: 1.1 });
        CR.focus = [W / 2, fy + 400];
      } },
      section: { build() {
        const L = CR.L.front, n = String(S.n || '1'), t = String(S.title || '');
        const ink = CR.light ? pal.sink : pal.ink, onL = CR.light;
        const kick = (S.kicker || `${CR.t('chapter')} ${n}`);
        CR.rule(L, { x: M, y: 210, w: W - 2 * M, h: CR.W === 'blueprint' ? 2 : 8, color: ink, t0: at(.1), dur: .8, glow: false });
        const box = CR.el('div', `position:absolute;left:${M}px;top:250px;width:150px;height:150px;background:${CR.W === 'blueprint' ? 'transparent' : ink};border:${CR.W === 'blueprint' ? '2px solid ' + ink : '0'};` +
          `display:flex;align-items:center;justify-content:center;font-family:${F.display};font-weight:${CR.FW.display};font-size:96px;color:${CR.W === 'blueprint' ? ink : pal.ground}`, L, esc(n));
        CR.enter(box, { kind: 'fade', t0: at(.25), dur: .5 });
        CR.text(L, kick, { font: 'cond', size: 40, upper: true, ls: .3, x: M + 190, y: 262, color: ink, onLight: onL, anim: 'mask_wipe', t0: at(.3) });
        if (S.episode) CR.text(L, S.episode, { font: 'serif', italic: true, size: 30, x: M + 190, y: 330, color: CR.light ? dimOn(true) : pal.dim, onLight: onL, anim: 'mask_wipe', t0: at(.5) });
        const size = Math.min(150, fitSize(t, 'head', (W - 2 * M) * 1.9, 156, 84));
        CR.text(L, t, hero({ font: 'head', size, weight: CR.W === 'newsprint' ? Math.max(CR.FW.head, 700) : CR.FW.head, x: M, y: 470, width: W - 2 * M, lh: 1.0, color: ink, onLight: onL, t0: at(.55),
          anim: ['typewriter', 'stamp'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
        CR.rule(L, { x: M, y: 980, w: W - 2 * M, h: 2, color: ink, t0: at(.9), dur: .8, glow: false });
        CR.focus = [W / 2, 560];
      } },
    },
  });

  // ══ PERSON ═════════════════════════════════════════════════════════════════════════════════════════════════════
  const personText = (L, x, yBottom, w, o = {}) => {
    const name = String(S.name || S.subject || ''), up = CR.case === 'upper';
    const size = Math.min(o.max || 112, fitSize(up ? name.toUpperCase() : name, 'head', w * 1.9, o.max || 112, 64, up ? .04 : 0));
    const tx = CR.text(L, name, hero({ font: 'head', size, x, y: 0, width: w, upper: up, ls: up ? .04 : -.005, lh: 1.0, t0: at(o.t0 || .45), color: o.color, onLight: o.onLight }));
    const h = tx.el.offsetHeight; tx.el.style.top = (yBottom - h) + 'px';
    if (S.role) CR.label(L, S.role, { x: x + 2, y: yBottom - h - 52, size: 28, ls: .2, t0: at((o.t0 || .45) - .15), color: o.roleColor || pal.accent, onLight: o.onLight });
    if (S.years) CR.text(L, S.years, { font: 'mono', size: 28, x: x + 2, y: yBottom + 24, color: o.dim || pal.dim, onLight: o.onLight, anim: CR.anim.label === 'typewriter' ? 'typewriter' : 'mask_wipe', t0: at((o.t0 || .45) + .7) });
    return tx;
  };
  // where a name can sit over a photograph: skin and edge energy scored in the lower left and the lower right of the
  // frame (the picture cropped as the page draws it). Both busy -> 'strip': the photo stays up, the name sits on a
  // dark strip below it — a name is never set across a face (review 10-03: the kicker ran through a face and a cigar)
  // fix round 2: the region scored is the block's own box (y0..y1 of the frame, bw wide at either side), mono archive
  // photos count edges only (no skin hue to find), and a side must be clearly quiet — else the strip
  const quietSide = (src, focus, y0 = .58, y1 = .94, bw = .54) => CR.img(src).then(im => {
    if (!im) return 'strip';
    const w = 192, h = 108, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    CR.drawCover(x, im, w, h, focus[0], focus[1]);
    const d = x.getImageData(0, 0, w, h).data;
    const score = (fx0, fx1, fy0, fy1) => {
      let skin = 0, edge = 0, n = 0;
      for (let yy = Math.floor(fy0 * h); yy < Math.min(h - 1, fy1 * h); yy++) for (let xx = Math.floor(fx0 * w); xx < Math.min(w - 1, fx1 * w); xx++) {
        const i = (yy * w + xx) * 4, r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (r > 95 && g > 40 && b > 20 && mx - mn > 15 && Math.abs(r - g) > 15 && r > g && r > b) skin++;
        const l = .3 * r + .59 * g + .11 * b, j = i + 4, k = i + w * 4;
        edge += Math.abs(l - (.3 * d[j] + .59 * d[j + 1] + .11 * d[j + 2])) + Math.abs(l - (.3 * d[k] + .59 * d[k + 1] + .11 * d[k + 2]));
        n++;
      }
      return { skin: skin / Math.max(1, n), edge: edge / Math.max(1, n) };
    };
    const busy = s => s.skin * 4 + s.edge / 18;
    const a = Math.max(0, y0 - .03), b = Math.min(1, y1 + .02);
    const sl = score(.03, Math.min(1, .03 + bw + .03), a, b), sr = score(Math.max(0, .97 - bw - .03), .97, a, b), bl = busy(sl), br = busy(sr);
    const ok = s => s.skin < .02 && busy(s) <= .75;
    CR.quiet = { left: +bl.toFixed(3), right: +br.toFixed(3), y: [+a.toFixed(3), +b.toFixed(3)] };
    if (!ok(sl) && !ok(sr)) return 'strip';
    if (ok(sl) && ok(sr)) return bl <= br ? 'll' : 'rp';
    return ok(sl) ? 'll' : 'rp';
  });
  // museum wall text beside a framed print (charcoal exhibit): small caps over the serif name, an italic line under
  const wallText = (L, x, yMid, w, kick, name, sub, t0) => {
    const up = CR.case === 'upper';
    const size = Math.min(92, fitSize(up ? String(name).toUpperCase() : name, 'head', w * 1.9, 92, 54));
    const k = kick ? CR.text(L, kick, { font: 'cond', size: 26, upper: true, ls: .3, x, y: 0, width: w, color: pal.dim, anim: 'mask_wipe', t0: at(t0) }) : null;
    const tx = CR.text(L, name, hero({ font: 'head', size, x, y: 0, width: w, upper: up, lh: 1.02, t0: at(t0 + .15) }));
    const sb = sub ? CR.text(L, sub, { font: 'serif', italic: true, size: 32, x, y: 0, width: w, lh: 1.3, color: pal.dim, anim: 'mask_wipe', t0: at(t0 + .7) }) : null;
    const hk = k ? k.el.offsetHeight + 26 : 0, hs = sb ? sb.el.offsetHeight + 54 : 0, hh = hk + tx.el.offsetHeight + hs;
    let y = yMid - hh / 2;
    if (k) { k.el.style.top = y + 'px'; y += hk; }
    tx.el.style.top = y + 'px'; y += tx.el.offsetHeight;
    if (sb) { CR.rule(L, { x, y: y + 26, w: 64, h: 2, color: pal.accent, t0: at(t0 + .55), glow: false }); sb.el.style.top = (y + 54) + 'px'; }
    return tx;
  };
  CR.scene('person', {
    s: 5.2,
    layout: { void_black: 'portrait_panel', navy_falloff: 'duotone', charcoal_light: 'exhibit', glass_dark: 'profile', paper_desk: 'file_card', newsprint: 'press',
              blueprint: 'portrait_panel', concrete: 'full_bleed', light_table: 'contact_strip', footage_sharp: 'full_bleed', footage_moving: 'full_bleed' },
    place: { full_bleed: 'full_bleed' },
    comps: {
      portrait_panel: { build() {
        const src = photoOf('photo');
        if (!src) {                                          // no photograph: the name carries the frame (never a plate)
          personText(CR.L.front, M, 640, W - 2 * M - 240, { max: 150 });
          CR.focus = [W * .4, H / 2];
          return;
        }
        const pw = 640, ph = 800, px = W - M - pw, py = (H - ph) / 2;
        const p = CR.photo(CR.L.mid, src, { x: px, y: py, w: pw, h: ph, frame: CR.W === 'blueprint' ? 'keyline' : 'glass', treat: CR.W === 'blueprint' ? 'cyan' : 'clean', focus: [.5, .3] });
        CR.halo(CR.L.back, px + pw / 2, py + ph / 2, pw, ph * .6);
        CR.enter(p.el, { kind: CR.W === 'blueprint' ? 'fade' : 'rise', t0: at(.05), dur: .9 });
        CR.rule(CR.L.front, { x: px - 70, y: py + 60, w: 2, h: ph - 120, color: CR.rgba(pal.ink, .25), t0: at(.3), dur: .9, glow: false }).el.style.transformOrigin = '50% 0';
        personText(CR.L.front, M, 690, px - M - 130, { max: 116 });
        CR.focus = [W * .55, H / 2];
      } },
      duotone: { build() {
        // navy: the person in the world's own duotone (deep navy -> cold white), full height on the right and feathered
        // into the ground; the name, role and years set large on the left
        const src = photoOf('photo');
        if (src) {
          const pw = 1060, p = CR.photo(CR.L.back, src, { x: W - pw, y: 0, w: pw, h: H, frame: 'none', treat: 'duo', focus: [.5, .28] });
          p.el.style.webkitMaskImage = 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.75) 30%, #000 56%)';
          CR.enter(p.el, { kind: 'fade', t0: 0, dur: 1.1 });
          CR.el('div', `position:absolute;left:0;right:0;bottom:0;height:260px;background:linear-gradient(0deg, ${CR.rgba(pal.ground, .7)}, ${CR.rgba(pal.ground, 0)})`, CR.L.back);
        }
        personText(CR.L.front, M, 690, src ? 820 : 1300, { max: src ? 124 : 150 });
        CR.rule(CR.L.front, { x: M, y: 790, w: src ? 760 : 1200, h: 1.5, color: CR.rgba(pal.ink, .35), glow: false, t0: at(.9), dur: 1.0 });
        CR.focus = [W * .5, H * .5];
      } },
      exhibit: { build() {
        // charcoal (the museum): the photograph framed and matted under a warm spot on the wall, its wall text beside
        // it — role in small capitals, the name in the head face, the years in italic
        const src = photoOf('photo'), name = String(S.name || S.subject || '');
        if (!src) { wallText(CR.L.front, M + 60, H / 2, 1300, S.role, name, S.years, .3); CR.focus = [W * .4, H / 2]; return; }
        const pw = 500, ph = 640, pad = Math.round(Math.min(pw, ph) * .11), fwid = pw + pad * 2 + 22, fx = 300, fy = (H - (ph + pad * 2 + 22)) / 2 - 8;
        CR.el('div', `position:absolute;left:${fx + fwid / 2 - 560}px;top:-160px;width:1120px;height:1240px;background:radial-gradient(ellipse at 50% 44%, ${CR.rgba('#FFE2B4', .17)} 0%, ${CR.rgba('#FFD49C', .06)} 42%, rgba(0,0,0,0) 68%);pointer-events:none`, CR.L.back);
        const p = CR.photo(CR.L.mid, src, { x: fx, y: fy, w: pw, h: ph, frame: 'museum', treat: 'clean', focus: [.5, .3], seed: 63 });
        CR.enter(p.el, { kind: 'fade', t0: 0, dur: .9 });
        CR.halo(CR.L.back, fx + fwid / 2, fy + ph / 2 + pad, fwid, ph * .7);
        const x = fx + fwid + 120;
        wallText(CR.L.front, x, fy + (ph + pad * 2) / 2, W - x - M, S.role, name, S.years, .45);
        CR.focus = [W * .45, H / 2];
      } },
      profile: { build() {
        // glass: a profile card of frosted glass — the portrait inset in its rounded corner; the role, the name and the
        // years set as the card's fields with a hairline between them
        const src = photoOf('photo'), cw = src ? 1360 : 1080, ch = 600, cx = (W - cw) / 2, cy = (H - ch) / 2;
        const card = CR.glass(CR.L.mid, { x: cx, y: cy, w: cw, h: ch, r: 28 });
        CR.enter(card.el, { kind: 'rise', t0: 0, dur: .9 });
        let X = 76;
        if (src) { const p = CR.photo(card.el, src, { x: 36, y: 36, w: 460, h: ch - 72, frame: 'card', treat: 'clean', focus: [.5, .3] }); CR.enter(p.el, { kind: 'fade', t0: at(.3), dur: .8 }); X = 568; }
        const fw = cw - X - 76, nm = String(S.name || S.subject || ''), up = CR.case === 'upper';
        const rl = S.role ? CR.label(card.el, S.role, { x: X, y: 0, width: fw, size: 24, ls: .26, t0: at(.45), color: pal.accent2 }) : null;
        const size = Math.min(100, fitSize(up ? nm.toUpperCase() : nm, 'head', fw * 1.9, 100, 56));
        const tx = CR.text(card.el, nm, hero({ font: 'head', size, x: X, y: 0, width: fw, upper: up, lh: 1.02, t0: at(.55) }));
        const yr = S.years ? CR.text(card.el, S.years, { font: 'mono', size: 30, x: X, y: 0, width: fw, color: pal.dim, anim: 'mask_wipe', t0: at(1.1) }) : null;
        const hh = (rl ? rl.el.offsetHeight + 24 : 0) + tx.el.offsetHeight + (yr ? 72 + yr.el.offsetHeight : 0);
        let y = (ch - hh) / 2;
        if (rl) { rl.el.style.top = y + 'px'; y += rl.el.offsetHeight + 24; }
        tx.el.style.top = y + 'px'; y += tx.el.offsetHeight;
        if (yr) { CR.rule(card.el, { x: X, y: y + 34, w: fw, h: 1, color: CR.rgba(pal.ink, .22), glow: false, t0: at(.9), dur: .8 }); yr.el.style.top = (y + 72) + 'px'; }
        CR.focus = [W / 2, H / 2];
      } },
      press: { build() {
        // newsprint: the person as a halftone press photograph with its cutline under it; the name is the page's headline
        const src = photoOf('photo'), ink = pal.sink, nm = String(S.name || S.subject || '');
        let colX = M;
        if (src) {
          const pw = 700, ph = 800, px = M + 30, py = 80;
          const p = CR.photo(CR.L.mid, src, { x: px, y: py, w: pw, h: ph, treat: 'halftone', focus: [.5, .3] });
          CR.enter(p.el, { kind: 'rise', t0: 0, dur: .7 });
          CR.rule(CR.L.front, { x: px, y: py + ph + 16, w: pw, h: 1.5, color: ink, glow: false, t0: at(.3) });
          const cn = CR.text(CR.L.front, nm.toUpperCase(), { font: 'cond', size: 26, weight: 700, ls: .06, x: px, y: py + ph + 30, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.5) });
          const cut = [S.role, S.years].filter(Boolean).join(', ');
          if (cut) CR.text(CR.L.front, cut + '.', { font: 'serif', size: 26, x: px + cn.el.offsetWidth + 12, y: py + ph + 28, width: pw - cn.el.offsetWidth - 12, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.65) });
          colX = px + pw + 90;
        }
        const cw = W - colX - M;
        CR.rule(CR.L.front, { x: colX, y: 280, w: cw, h: 7, color: ink, glow: false, t0: at(.25), from: 'left' });
        if (S.role) CR.text(CR.L.front, S.role, { font: 'cond', size: 30, upper: true, ls: .16, x: colX, y: 306, width: cw, color: pal.accent, onLight: true, anim: 'mask_wipe', t0: at(.4) });
        const size = Math.min(src ? 118 : 160, fitSize(nm, 'head', cw * 2.4, src ? 118 : 160, 64));
        const tx = CR.text(CR.L.front, nm, hero({ font: 'head', size, weight: Math.max(700, CR.FW.head), x: colX, y: 360, width: cw, lh: .98, color: ink, onLight: true, t0: at(.55),
          anim: ['typewriter', 'tracking_open'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
        const y = 360 + tx.el.offsetHeight + 30;
        CR.rule(CR.L.front, { x: colX, y, w: cw, h: 1.5, color: ink, glow: false, t0: at(.9) });
        if (S.years) CR.text(CR.L.front, S.years, { font: 'mono', size: 30, x: colX, y: y + 24, width: cw, color: CR.mix(ink, pal.ground, .35), onLight: true, anim: 'typewriter', t0: at(1.1) });
        CR.focus = [W / 2, H / 2];
      } },
      full_bleed: { build() {
        // the photograph fills the frame; the name goes where the picture is CLEARLY quiet (no skin, few edges), scored
        // over the block's own box once the photo is in (quietSide). Busy (a group, a portrait, any archive print — the
        // usual case): the photo rides up and a solid dark strip sized to the block carries the name on one line
        const src = photoOf('photo', 'still'), focus = [.5, .32];
        const B = block(CR.L.front, 'll', 860);
        if (B.cls !== 'll' && B.cls !== 'rp') { B.cls = 'll'; B.align = 'left'; B.x = M; B.el.style.left = M + 'px'; }
        let pic = null;
        if (src) { pic = CR.photo(CR.L.back, src, { x: 0, y: 0, w: W, h: H, frame: 'none', treat: CR.W === 'concrete' ? 'bleach' : 'clean', focus }); CR.enter(pic.el, { kind: 'fade', t0: 0, dur: .6 }); }
        else if (CR.foot) CR.footLook(0, .7, .9);
        const vL = veil(CR.L.back, 'bl'), vR = veil(CR.L.back, 'r'), vB = veil(CR.L.back, 'b');
        const deep = CR.mix(pal.ground, '#000000', .35);
        const strip = CR.el('div', `position:absolute;left:0;right:0;bottom:0;height:340px;opacity:0;background:linear-gradient(180deg, ${CR.rgba(deep, 0)} 0px, ${CR.rgba(deep, .95)} 72px, ${CR.rgba(deep, .97)} 100%)`, CR.L.back);
        const name = String(S.name || S.subject || ''), up = CR.case === 'upper';
        const fill = (bw, oneLine) => {                      // (re)sets the block at a width; returns its height
          B.el.innerHTML = ''; B.w = bw; B.el.style.width = bw + 'px';
          const size = Math.min(124, fitSize(up ? name.toUpperCase() : name, 'head', bw * (oneLine ? 1 : 1.9), 124, oneLine ? 72 : 64, up ? .04 : 0));
          let h = 0;
          if (S.role) { CR.label(B.el, S.role, { x: 2, y: 0, width: bw, size: 28, ls: .2, t0: at(.3), color: pal.ink }); h = 52; }
          const tx = CR.text(B.el, name, hero({ font: 'head', size, x: 0, y: h, width: bw, upper: up, ls: up ? .04 : -.005, lh: 1.0, t0: at(.45) }));
          h += tx.el.offsetHeight;
          if (S.years) { CR.text(B.el, S.years, { font: 'mono', size: 28, x: 2, y: h + 24, width: bw, color: pal.dim, anim: CR.anim.label === 'typewriter' ? 'typewriter' : 'mask_wipe', t0: at(1.15) }); h += 70; }
          return h;
        };
        let y = fill(B.w, false), wide = false;
        const place = side => {
          if (side === 'strip' && !wide) { y = fill(W - 2 * M, true); wide = true; }
          const right = side === 'rp', sh = Math.round(y + 150);
          B.cls = right ? 'rp' : 'll'; B.x = right ? W - M - B.w : M; B.el.style.left = B.x + 'px';
          vL.style.opacity = side === 'll' ? 1 : 0; vR.style.opacity = right ? 1 : 0; vB.style.opacity = side === 'strip' ? 0 : 1;
          strip.style.opacity = side === 'strip' ? 1 : 0; strip.style.height = sh + 'px';
          if (pic) pic.el.style.top = (side === 'strip' ? -Math.round(Math.min(140, sh * .35)) : 0) + 'px';
          B.pin(y, side === 'strip' ? H - 64 : 930, 140);
          CR.focus = side === 'strip' ? [W / 2, H * .34] : [W * (right ? .4 : .6), H * .4];
        };
        place(B.cls);
        if (src) CR.wait(quietSide(src, focus, (930 - y) / H, 930 / H, B.w / W).then(place));
      } },
      file_card: { build() {
        const src = photoOf('photo');
        const sw = 1060, sh = 900, sx = 300, sy = 110;
        const sheet = CR.sheet(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, pad: 0, seed: 61, age: .55 });
        CR.enter(sheet.el, { kind: 'land', t0: 0, rot: -1.3, dur: .55 });
        const ink = pal.sink, dimk = CR.mix(pal.sink, pal.paper, .45);
        CR.text(sheet.el, CR.t('file'), { font: 'cond', size: 30, upper: true, ls: .3, x: 70, y: 66, color: dimk, onLight: true, anim: 'none', t0: 0 });
        CR.el('div', `position:absolute;left:70px;right:70px;top:112px;height:2px;background:${CR.rgba(ink, .7)}`, sheet.el);
        const fwid = src ? 560 : 900;
        const field = (k, v, y, t0) => { if (!v) return t0; CR.text(sheet.el, k, { font: 'cond', size: 24, upper: true, ls: .2, x: 70, y, color: dimk, onLight: true, anim: 'none', t0: 0 });
          const tx = CR.text(sheet.el, v, { font: 'mono', size: 44, x: 70, y: y + 32, width: fwid, color: ink, onLight: true, anim: 'typewriter', t0, cps: 30 }); return tx.end + .15; };
        let t = at(.6);
        const nameY = 170;
        t = field(CR.t('name'), S.name || S.subject, nameY, t);
        CR.rule(sheet.el, { x: 66, y: nameY + 92, w: 520, h: 4, color: pal.accent, glow: false, t0: t, dur: .5 });
        t = field(CR.t('role'), S.role, nameY + 150, t);
        field(CR.t('years'), S.years, nameY + 300, t);
        if (src) {                                           // no photograph: the file carries its fields only
          const pw = 380, ph = 470;
          const p = CR.photo(sheet.el, src, { x: sw - pw - 90, y: 150, w: pw, h: ph, frame: 'print', treat: 'print', focus: [.5, .3], seed: 62 });
          CR.enter(p.el, { kind: 'land', t0: at(.3), rot: 2.2, dur: .5 });
          CR.clip(sheet.el, sw - pw / 2 - 110, 112, 4);
        }
        CR.focus = [sx + sw * .45, sy + 330];
      } },
      contact_strip: { build() {
        const src = photoOf('photo', 'still'), name = String(S.name || S.subject || '');
        if (!src) {                                          // no picture to print: the name on the lit table, nothing else
          const tx = CR.text(CR.L.front, name, hero({ font: 'head', size: Math.min(150, fitSize(name, 'head', (W - 2 * M) * 1.6, 150, 80)), x: M, y: 0, width: W - 2 * M, align: 'center', lh: 1.02, color: pal.sink, onLight: true, t0: at(.4) }));
          const h = tx.el.offsetHeight, top = (H - h) / 2 - 40; tx.el.style.top = top + 'px';
          if (S.role || S.years) CR.text(CR.L.front, [S.role, S.years].filter(Boolean).join(' · '), { font: 'mono', size: 32, x: 0, y: top + h + 40, width: W, align: 'center', color: CR.mix(pal.sink, pal.ground, .35), onLight: true, anim: 'typewriter', t0: at(1.1) });
          CR.focus = [W / 2, H / 2];
          return;
        }
        const sh = 520, fw = 470, gap = 40, sy = 190, n = 3;
        const sw = n * fw + (n + 1) * gap;
        const strip = CR.el('div', `position:absolute;left:${(W - sw) / 2}px;top:${sy}px;width:${sw}px;height:${sh + 120}px;background:#1B1A18;box-shadow:0 20px 40px rgba(0,0,0,.25)`, CR.L.mid);
        for (let i = 0; i < 22; i++) for (const yy of [18, sh + 82]) CR.el('div', `position:absolute;left:${16 + i * (sw - 40) / 21}px;top:${yy}px;width:22px;height:22px;border-radius:4px;background:${CR.mix(pal.ground, '#FFFFFF', .7)}`, strip);
        CR.enter(strip, { kind: 'land', t0: 0, rot: -.8, dur: .55 });
        const crops = [[.2, .3], [.5, .3], [.8, .3]];
        for (let i = 0; i < n; i++) {
          const x = gap + i * (fw + gap);
          const p = CR.photo(strip, src, { x, y: 60, w: fw, h: sh, frame: 'none', treat: i === 1 ? 'slide' : 'mono', focus: crops[i] });
          if (i !== 1) p.el.style.opacity = .55;
        }
        // grease pencil: a ring around the chosen frame, the name written under the strip
        const s = CR.svg(CR.L.front), cx = W / 2, cy = sy + 60 + sh / 2;
        const ring = CR.sv('ellipse', { cx, cy, rx: fw * .62, ry: sh * .62, fill: 'none', stroke: pal.accent, 'stroke-width': 9, 'stroke-linecap': 'round', opacity: .9 }, s);
        const Lr = 2 * Math.PI * Math.sqrt(((fw * .62) ** 2 + (sh * .62) ** 2) / 2); ring.style.strokeDasharray = `${Lr} ${Lr}`;
        CR.on(t => { ring.style.strokeDashoffset = (Lr * (1 - CR.sseg(t, at(.7), at(.7) + .8))).toFixed(1); });
        // the name is typeset in the head face (fix round 2: a red handwritten name read as a sticker); only the ring is pencil
        CR.text(CR.L.front, name, hero({ font: 'head', size: Math.min(84, fitSize(name, 'head', W - 2 * M, 84, 56)), x: 0, y: sy + sh + 156, width: W, align: 'center', lh: 1.02, color: pal.sink, onLight: true, t0: at(1.2),
          anim: ['typewriter', 'stamp', 'slam', 'split_flap'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
        if (S.role || S.years) CR.text(CR.L.front, [S.role, S.years].filter(Boolean).join(' · '), { font: 'mono', size: 30, x: 0, y: sy + sh + 284, width: W, align: 'center', color: pal.sink, onLight: true, anim: 'typewriter', t0: at(1.6) });
        CR.focus = [W / 2, cy];
      } },
    },
  });

  // ══ PLACE ══════════════════════════════════════════════════════════════════════════════════════════════════════
  const placeMeta = () => [S.region, S.year].filter(Boolean).join(' — ');
  // "29.559° N, 95.089° W" / "29.559, -95.089" -> [lat, lon] (null when it is not a coordinate pair)
  const parseLL = s => {
    const m = String(s || '').match(/(-?\d+(?:[.,]\d+)?)\s*°?\s*([NSns])?\s*[,;/ ]\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*([EWOewo])?/);
    if (!m) return null;
    let lat = parseFloat(m[1].replace(',', '.')), lon = parseFloat(m[3].replace(',', '.'));
    if (/[Ss]/.test(m[2] || '')) lat = -Math.abs(lat);
    if (/[Ww]/.test(m[4] || '')) lon = -Math.abs(lon);
    return (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) ? [lat, lon] : null;
  };
  CR.scene('place', {
    s: 4.8,
    layout: { void_black: 'coordinates', navy_falloff: 'globe', charcoal_light: 'exhibit', glass_dark: 'pin_card', paper_desk: 'postcard', newsprint: 'cutline',
              blueprint: 'coordinates', concrete: 'wall', light_table: 'postcard', footage_sharp: 'dateline', footage_moving: 'dateline' },
    place: { full_bleed: 'dateline' },
    comps: {
      dateline: { build() {
        const src = photoOf('photo');
        const B = block(CR.L.front, 'll', 1400);
        if (src && !CR.foot) { const p = CR.photo(CR.L.back, src, { x: 0, y: 0, w: W, h: H, treat: 'clean' }); CR.enter(p.el, { kind: 'fade', t0: 0, dur: .5 }); }
        if (CR.foot) CR.footLook(0, .86, 1);
        veil(CR.L.back, B.veil());
        const name = String(S.place || ''), up = CR.case === 'upper', cen = B.align === 'center';
        const size = Math.min(150, fitSize(up ? name.toUpperCase() : name, 'head', Math.min(1300, B.w), 150, 80, up ? .04 : 0));
        const meta = placeMeta();
        let y = 0;
        if (meta) { CR.rule(B.el, { x: cen ? B.w / 2 - 23 : 0, y: cen ? 0 : 16, w: 46, h: 3, color: pal.accent, t0: at(.15) });
          CR.text(B.el, meta, { font: 'mono', size: 28, upper: true, ls: .08, x: cen ? 0 : 64, y: cen ? 18 : 0, width: cen ? B.w : B.w - 64, align: B.align, color: pal.ink, anim: 'typewriter', t0: at(.2), cps: 34 }); y = cen ? 78 : 56; }
        const tx = CR.text(B.el, name, hero({ font: 'head', size, x: 0, y, width: B.w, align: B.align, upper: up, ls: up ? .04 : -.01, lh: 1, t0: at(.5) }));
        y += tx.el.offsetHeight;
        if (S.coords) { CR.text(B.el, S.coords, { font: 'mono', size: 26, x: 2, y: y + 22, width: B.w, align: B.align, color: pal.dim, anim: 'typewriter', t0: at(1.0), cps: 40 }); y += 62; }
        B.pin(y, 920, 130);
        CR.focus = [W * .55, H * .45];
      } },
      coordinates: { build() {
        const L = CR.L.front, rx = 1340, ry = 470;
        const src = photoOf('photo', 'still');
        if (src) {
          const lens = CR.el('div', `position:absolute;left:${rx - 230}px;top:${ry - 230}px;width:460px;height:460px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 1.5px ${CR.rgba(pal.ink, .4)}, 0 30px 80px rgba(0,0,0,.6)`, CR.L.mid);
          const p = CR.photo(lens, src, { x: 0, y: 0, w: 460, h: 460, treat: CR.W === 'blueprint' ? 'cyan' : 'clean' });
          void p; CR.enter(lens, { kind: 'fade', t0: at(.6), dur: .9 });
        }
        CR.reticle(CR.L.mid, rx, ry, { r: src ? 238 : 46, t0: at(.05), color: pal.ink });
        const name = String(S.place || ''), up = CR.case === 'upper';
        const size = Math.min(128, fitSize(up ? name.toUpperCase() : name, 'head', 940, 128, 66, up ? .06 : 0));
        const tx = CR.text(L, name, hero({ font: 'head', size, x: M, y: 0, width: 960, upper: up, ls: up ? .06 : -.01, lh: 1, t0: at(.45) }));
        const h = tx.el.offsetHeight, top = ry - h / 2 - 10; tx.el.style.top = top + 'px';
        const meta = placeMeta();
        if (meta) CR.label(L, meta, { x: M + 2, y: top - 52, size: 26, ls: .24, t0: at(.3), color: pal.accent });
        if (S.coords) CR.text(L, S.coords, { font: 'mono', size: 34, x: M + 2, y: top + h + 30, color: pal.dim, anim: 'typewriter', t0: at(.9), cps: 36 });
        if (S.note) CR.text(L, S.note, { font: 'serif', italic: true, size: 32, x: M + 2, y: top + h + 96, width: 900, color: pal.dim, anim: 'mask_wipe', t0: at(1.5) });
        CR.focus = [rx - 200, ry];
      } },
      globe: { build() {
        // navy: the planet turns (cruise) until the place faces the camera and a pin lands on its real coordinates —
        // real land (d3-geo + Natural Earth, prepended by creative.reskin for this composition only). No coordinates
        // (or no map data): the place takes the coordinates composition instead of a globe with nothing on it
        const ll = parseLL(S.coords);
        if (!ll || typeof d3 === 'undefined' || typeof HK_WORLD === 'undefined' || typeof topojson === 'undefined') return CR.SCENES.place.comps.coordinates.build();
        const [lat, lon] = ll, L = CR.L.front, R = 390, cx = 1330, cy = 548, sz = 2 * R + 160;
        const cv = CR.el('canvas', `position:absolute;left:${cx - sz / 2}px;top:${cy - sz / 2}px;width:${sz}px;height:${sz}px`, CR.L.mid);
        cv.width = sz; cv.height = sz; const x = cv.getContext('2d');
        const land = topojson.feature(HK_WORLD, HK_WORLD.objects.countries), grat = d3.geoGraticule10();
        const proj = d3.geoOrthographic().scale(R).translate([sz / 2, sz / 2]).clipAngle(90).precision(.6);
        const r0 = [-lon + 64, -lat * .45], r1 = [-lon, -lat * .82], a0 = at(.05), a1 = a0 + Math.min(2.8, D * .55);
        const sea = CR.mix(pal.ground, '#000000', .25), landC = CR.mix(pal.ground, pal.ink, .17), ink = pal.ink;
        const draw = t => {
          const p = CR.cruise(seg(t, a0, a1)), rot = [lerp(r0[0], r1[0], p), lerp(r0[1], r1[1], p)];
          proj.rotate(rot);
          const path = d3.geoPath(proj, x);
          x.clearRect(0, 0, sz, sz);
          const at_ = x.createRadialGradient(sz / 2, sz / 2, R * .96, sz / 2, sz / 2, R * 1.16);
          at_.addColorStop(0, CR.rgba(pal.glow, .2)); at_.addColorStop(1, CR.rgba(pal.glow, 0)); x.fillStyle = at_; x.fillRect(0, 0, sz, sz);
          const sh = x.createRadialGradient(sz / 2 - R * .35, sz / 2 - R * .4, R * .1, sz / 2, sz / 2, R);
          sh.addColorStop(0, CR.mix(sea, '#5D7DA6', .22)); sh.addColorStop(1, sea);
          x.beginPath(); path({ type: 'Sphere' }); x.fillStyle = sh; x.fill();
          x.beginPath(); path(grat); x.strokeStyle = CR.rgba(ink, .07); x.lineWidth = 1; x.stroke();
          x.beginPath(); path(land); x.fillStyle = landC; x.fill(); x.strokeStyle = CR.rgba(ink, .26); x.lineWidth = .8; x.stroke();
          x.beginPath(); path({ type: 'Sphere' }); x.strokeStyle = CR.rgba(ink, .42); x.lineWidth = 1.5; x.stroke();
          if (d3.geoDistance([lon, lat], [-rot[0], -rot[1]]) < Math.PI / 2 - .05) {
            const [px, py] = proj([lon, lat]), q = CR.sseg(t, a1 - .2, a1 + .3), ring = CR.sseg(t, a1, a1 + 1.0);
            if (ring > 0 && ring < 1) { x.beginPath(); x.arc(px, py, 9 + 30 * ring, 0, 6.2832); x.strokeStyle = CR.rgba(pal.accent, .8 * (1 - ring)); x.lineWidth = 2; x.stroke(); }
            x.save(); x.shadowColor = CR.glow.family === 'none' ? 'rgba(0,0,0,0)' : CR.rgba(pal.accent, .8 * CR.glow.strength); x.shadowBlur = 16;
            x.beginPath(); x.arc(px, py, 7.5 * q, 0, 6.2832); x.fillStyle = pal.accent; x.fill(); x.restore();
            if (q > 0) { x.beginPath(); x.arc(px, py, 2.6 * q, 0, 6.2832); x.fillStyle = '#FFFFFF'; x.fill(); }
          }
        };
        CR.on((tq, t) => draw(t == null ? tq : t));
        CR.beat = a1;
        const name = String(S.place || ''), up = CR.case === 'upper', tw = cx - R - 90 - M;
        const size = Math.min(118, fitSize(up ? name.toUpperCase() : name, 'head', tw * 1.9, 118, 64, up ? .04 : 0));
        const tx = CR.text(L, name, hero({ font: 'head', size, x: M, y: 0, width: tw, upper: up, ls: up ? .04 : -.01, lh: 1.02, t0: at(.5) }));
        const h = tx.el.offsetHeight, top = cy - h / 2 - 20; tx.el.style.top = top + 'px';
        const meta = placeMeta();
        if (meta) CR.label(L, meta, { x: M + 2, y: top - 54, width: tw, size: 26, ls: .24, t0: at(.35), color: pal.accent });
        if (S.coords) CR.text(L, S.coords, { font: 'mono', size: 30, x: M + 2, y: top + h + 30, width: tw, color: pal.dim, anim: 'typewriter', t0: a1 - .2, cps: 36 });
        if (S.note) CR.text(L, S.note, { font: 'serif', italic: true, size: 30, x: M + 2, y: top + h + 92, width: tw, color: pal.dim, anim: 'mask_wipe', t0: at(1.6) });
        CR.focus = [cx - 260, cy];
      } },
      exhibit: { build() {
        // charcoal (the museum): the place's photograph framed and matted under a warm spot, its wall text beside it
        const src = photoOf('photo', 'still'), name = String(S.place || '');
        const sub = [S.year, S.coords].filter(Boolean).join(' · ');
        if (!src) { wallText(CR.L.front, M + 60, H / 2, 1300, S.region, name, sub, .3); CR.focus = [W * .4, H / 2]; return; }
        const pw = 720, ph = 500, pad = Math.round(Math.min(pw, ph) * .11), fwid = pw + pad * 2 + 22, fx = 200, fy = (H - (ph + pad * 2 + 22)) / 2 - 8;
        CR.el('div', `position:absolute;left:${fx + fwid / 2 - 640}px;top:-180px;width:1280px;height:1220px;background:radial-gradient(ellipse at 50% 46%, ${CR.rgba('#FFE2B4', .16)} 0%, ${CR.rgba('#FFD49C', .055)} 42%, rgba(0,0,0,0) 68%);pointer-events:none`, CR.L.back);
        const p = CR.photo(CR.L.mid, src, { x: fx, y: fy, w: pw, h: ph, frame: 'museum', treat: 'clean', focus: [.5, .45], seed: 64 });
        CR.enter(p.el, { kind: 'fade', t0: 0, dur: .9 });
        CR.halo(CR.L.back, fx + fwid / 2, fy + ph / 2 + pad, fwid, ph * .8);
        const x = fx + fwid + 110;
        wallText(CR.L.front, x, fy + (ph + pad * 2) / 2, W - x - M, S.region, name, sub, .45);
        CR.focus = [W * .45, H / 2];
      } },
      pin_card: { build() {
        // glass: the place's picture in a large rounded card; a frosted label card overlaps its lower corner with a drawn
        // location pin, the region and year, the name and the coordinates
        const src = photoOf('photo', 'still'), name = String(S.place || ''), up = CR.case === 'upper';
        const gw = src ? 780 : 1000;
        let gx = (W - gw) / 2, gy = 0;
        if (src) { const p = CR.photo(CR.L.mid, src, { x: M, y: 100, w: 1180, h: 720, frame: 'card', treat: 'clean', focus: [.5, .45] }); CR.enter(p.el, { kind: 'rise', t0: 0, dur: .9 }); gx = W - M - gw; }
        const card = CR.glass(CR.L.front, { x: gx, y: 0, w: gw, h: 300, r: 24 });
        CR.enter(card.el, { kind: 'rise', t0: at(.35), dur: .8 });
        const s = CR.svg(card.el);
        const pin = CR.sv('path', { d: 'M70,118 C70,118 40,86 40,64 A30,30 0 1 1 100,64 C100,86 70,118 70,118 Z', fill: pal.accent }, s);
        CR.sv('circle', { cx: 70, cy: 64, r: 10.5, fill: CR.mix(pal.ground, '#1A2230', .5) }, s);
        pin.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
        const X = 134, tw = gw - X - 50, meta = placeMeta();
        const ml = meta ? CR.label(card.el, meta, { x: X, y: 48, width: tw, size: 24, ls: .24, t0: at(.6), color: pal.accent2 }) : null;
        const ny = meta ? 48 + ml.el.offsetHeight + 16 : 52;
        const size = Math.min(72, fitSize(up ? name.toUpperCase() : name, 'head', tw * 1.9, 72, 44));
        const tx = CR.text(card.el, name, hero({ font: 'head', size, x: X, y: ny, width: tw, upper: up, lh: 1.02, t0: at(.7) }));
        let hh = ny + tx.el.offsetHeight + 44;
        if (S.coords) { CR.text(card.el, S.coords, { font: 'mono', size: 26, x: X, y: hh - 18, width: tw, color: pal.dim, anim: 'typewriter', t0: at(1.2), cps: 40 }); hh += 44; }
        card.el.style.height = hh + 'px';
        gy = src ? Math.min(H - 70 - hh, 100 + 720 - hh * .55) : (H - hh) / 2;
        card.el.style.top = gy + 'px';
        CR.on(t => { const q = CR.sseg(t, at(.55), at(.55) + .5); pin.setAttribute('transform', `translate(0,${(-14 * (1 - q)).toFixed(2)})`); pin.style.opacity = q.toFixed(3); });
        CR.focus = [W / 2, H / 2];
      } },
      cutline: { build() {
        // newsprint: the place as the page's picture — a headline over a wide halftone press photograph, the cutline
        // beneath it (the name run in bold capitals, then the region and year; the coordinates set right)
        const src = photoOf('photo', 'still'), ink = pal.sink, name = String(S.place || ''), pw = W - 2 * M;
        CR.rule(CR.L.front, { x: M, y: 46, w: pw, h: 7, color: ink, glow: false, t0: at(.1), from: 'left' });
        const hz = Math.min(src ? 104 : 170, fitSize(name, 'head', pw, src ? 104 : 170, 64));
        const tx = CR.text(CR.L.front, name, hero({ font: 'head', size: hz, weight: Math.max(700, CR.FW.head), x: M, y: 66, width: pw, lh: 1.0, color: ink, onLight: true, t0: at(.3),
          anim: ['typewriter', 'tracking_open'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
        const py = 66 + tx.el.offsetHeight + 26, ph = H - 150 - py;
        const meta = [S.region, S.year].filter(Boolean).join(', ');
        if (src && ph >= 360) {
          const p = CR.photo(CR.L.mid, src, { x: M, y: py, w: pw, h: ph, treat: 'halftone', focus: [.5, .45] });
          CR.enter(p.el, { kind: 'fade', t0: at(.2), dur: .8 });
          const cy = py + ph + 22;
          CR.rule(CR.L.front, { x: M, y: cy - 8, w: pw, h: 1.5, color: ink, glow: false, t0: at(.6) });
          const cn = CR.text(CR.L.front, name.toUpperCase(), { font: 'cond', size: 28, weight: 700, ls: .06, x: M, y: cy + 4, nowrap: true, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.8) });
          if (meta) CR.text(CR.L.front, meta + '.', { font: 'serif', size: 28, x: M + cn.el.offsetWidth + 14, y: cy + 2, width: pw * .6, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.95) });
          if (S.coords) CR.text(CR.L.front, S.coords, { font: 'mono', size: 24, x: W - M - 700, y: cy + 6, width: 700, align: 'right', color: CR.mix(ink, pal.ground, .35), onLight: true, anim: 'typewriter', t0: at(1.1), cps: 40 });
        } else {
          CR.rule(CR.L.front, { x: M, y: py, w: pw, h: 2, color: ink, glow: false, t0: at(.6) });
          if (meta || S.coords) CR.text(CR.L.front, [meta, S.coords].filter(Boolean).join('   ·   '), { font: 'mono', size: 32, upper: true, ls: .06, x: M, y: py + 30, width: pw, color: ink, onLight: true, anim: 'typewriter', t0: at(.9) });
        }
        CR.focus = [W / 2, H / 2];
      } },
      postcard: { build() {
        const src = photoOf('photo', 'still'), w = CR.W;
        const frame = w === 'light_table' ? 'mount' : w === 'newsprint' ? 'none' : 'print';
        const pw = w === 'light_table' ? 820 : w === 'newsprint' ? 980 : 880, ph = w === 'light_table' ? 620 : 640, px = w === 'newsprint' ? M + 40 : 190, py = w === 'light_table' ? 160 : 170;
        if (!src) return CR.SCENES.place.comps.coordinates.build();
        const p = CR.photo(CR.L.mid, src, { x: px, y: py, w: pw, h: ph, frame, seed: 81 });
        CR.enter(p.el, { kind: enterKind(), t0: 0, rot: w === 'newsprint' ? 0 : -1.6, dur: .55 });
        if (w === 'paper_desk') { CR.tape(CR.L.front, px + 90, py + 10, 170, -8); CR.tape(CR.L.front, px + pw - 40, py + ph + 40, 170, 6); }
        const cx = px + (p.w || pw) + 80, cw = W - cx - M + 30;
        const onL = w !== 'paper_desk' ? CR.light : false;
        const ink = onL ? pal.sink : pal.ink;
        const name = String(S.place || ''), up = CR.case === 'upper';
        let y0 = 360;
        if (w === 'paper_desk') {                            // the caption is typed on a label strip laid beside it
          const lab = CR.sheet(CR.L.mid, { x: cx - 30, y: 330, w: cw + 10, h: 400, pad: 0, seed: 82, age: .3 });
          CR.enter(lab.el, { kind: 'land', t0: at(.35), rot: 1.2, dur: .45 });
          const t1 = CR.text(lab.el, name, hero({ font: 'head', size: Math.min(76, fitSize(name, 'head', (cw - 60) * 1.8, 76, 44)), weight: Math.max(600, CR.FW.head), x: 34, y: 70, width: cw - 60, color: pal.sink, onLight: true, t0: at(.8), anim: 'typewriter', cps: 24 }));
          const meta = placeMeta(); if (meta) CR.text(lab.el, meta, { font: 'mono', size: 28, upper: true, x: 34, y: 80 + t1.el.offsetHeight + 24, width: cw - 60, color: CR.mix(pal.sink, pal.paper, .35), onLight: true, anim: 'typewriter', t0: t1.end + .1 });
          if (S.coords) CR.text(lab.el, S.coords, { font: 'mono', size: 26, x: 34, y: 330, color: pal.accent, onLight: true, anim: 'typewriter', t0: t1.end + .6 });
          CR.focus = [W / 2, H / 2];
          return;
        }
        if (w === 'newsprint') { CR.rule(CR.L.front, { x: cx, y: y0 - 30, w: cw, h: 6, color: ink, glow: false, t0: at(.2) }); }
        const tx = CR.text(CR.L.front, name, hero({ font: 'head', size: Math.min(110, fitSize(up ? name.toUpperCase() : name, 'head', cw * 1.8, 110, 60)), weight: w === 'newsprint' ? Math.max(700, CR.FW.head) : CR.FW.head,
          x: cx, y: y0, width: cw, upper: up && w !== 'light_table', color: ink, onLight: onL, t0: at(.5), anim: w === 'light_table' ? 'focus_pull' : (CR.anim.hero === 'stamp' ? 'mask_wipe' : CR.anim.hero) }));
        const meta = placeMeta();
        if (meta) CR.text(CR.L.front, meta, { font: 'cond', size: 30, upper: true, ls: .2, x: cx, y: y0 + tx.el.offsetHeight + 28, width: cw, color: pal.accent, onLight: onL, anim: 'mask_wipe', t0: at(1.0) });
        if (S.coords) CR.text(CR.L.front, S.coords, { font: w === 'light_table' ? 'hand' : 'mono', size: w === 'light_table' ? 44 : 28, x: cx, y: y0 + tx.el.offsetHeight + 84, color: w === 'light_table' ? pal.accent : CR.mix(ink, pal.ground, .4), onLight: onL, anim: 'mask_wipe', t0: at(1.3) });
        CR.focus = [W / 2, H / 2];
      } },
      wall: { build() {
        // concrete: the place name on an enamel plate screwed to the wall (deep enamel, off-white capitals, a fine inner
        // keyline, four screws, a soft sheen), its region, year and coordinates typed on a notice taped beneath
        const L = CR.L.mid, name = String(S.place || '').toUpperCase();
        const enamel = CR.mix(pal.ground, '#0F2236', .7), letter = CR.mix(pal.ink, '#FFFFFF', .2);
        // sized at the weight it is set in (700), with slack in the text box so one measured line never wraps (fix round 2:
        // MISSION CONTROL broke onto a 2nd line below a 1-line plate)
        const maxW = W - 2 * M - 200;
        let size = 170; while (size > 84 && measure(name, 'cond', size, 700, .04) > maxW) size -= 4;
        const mw = measure(name, 'cond', size, 700, .04), tw = Math.min(maxW, mw), lines = mw > maxW ? 2 : 1;
        const pw = tw + 170, ph = Math.round(size * 1.08 * lines + 110), px = (W - pw) / 2, py = (H - ph) / 2 - 90;
        const plate = CR.el('div', `position:absolute;left:${px}px;top:${py}px;width:${pw}px;height:${ph}px;border-radius:14px;` +
          `background:linear-gradient(170deg, ${CR.mix(enamel, '#FFFFFF', .12)} 0%, ${enamel} 42%, ${CR.mix(enamel, '#000000', .25)} 100%);` +
          `box-shadow:inset 0 2px 0 rgba(255,255,255,.18), inset 0 -3px 0 rgba(0,0,0,.35), 0 18px 34px rgba(0,0,0,.55), 0 3px 6px rgba(0,0,0,.5)`, L);
        CR.el('div', `position:absolute;inset:16px;border:3px solid ${CR.rgba(letter, .85)};border-radius:8px`, plate);
        for (const [sx, sy] of [[34, 34], [pw - 34, 34], [34, ph - 34], [pw - 34, ph - 34]]) CR.el('div', `position:absolute;left:${sx - 7}px;top:${sy - 7}px;width:14px;height:14px;border-radius:50%;` +
          'background:radial-gradient(circle at 38% 34%, #E9E6E0 0 18%, #8E8B86 46%, #3B3936 100%);box-shadow:0 1px 1px rgba(0,0,0,.5)', plate);
        CR.enter(plate, { kind: 'fade', t0: 0, dur: .7 });
        CR.text(plate, name, { font: 'cond', size, weight: 700, ls: .04, x: 60, y: (ph - size * 1.08 * lines) / 2 - 2, width: pw - 120, align: 'center', lh: 1.08, nowrap: lines === 1, color: letter, anim: 'none', t0: 0, glow: false, shadow: '0 1px 0 rgba(0,0,0,.35)' });
        const meta = [S.region, S.year, S.coords].filter(Boolean).join('   ·   ');
        if (meta) {
          const nw = Math.min(W - 2 * M, measure(meta.toUpperCase(), 'mono', 30) + 140), no = CR.sheet(L, { x: (W - nw) / 2, y: py + ph + 70, w: nw, h: 104, pad: 0, seed: 83, age: .5 });
          CR.enter(no.el, { kind: 'land', t0: at(.6), rot: .8, dur: .45 });
          CR.tape(no.el, 26, 8, 100, -22); CR.tape(no.el, nw - 26, 8, 100, 20);
          CR.text(no.el, meta, { font: 'mono', size: 30, upper: true, x: 70, y: 32, width: nw - 110, color: pal.sink, onLight: true, anim: 'typewriter', t0: at(1.0), cps: 34 });
        }
        CR.focus = [W / 2, py + ph / 2];
      } },
    },
  });

  // ══ DATE ═══════════════════════════════════════════════════════════════════════════════════════════════════════
  CR.scene('date', {
    s: 4.0,
    layout: { void_black: 'calendar', navy_falloff: 'axis', charcoal_light: 'calendar', glass_dark: 'tiles', paper_desk: 'typed_dateline', newsprint: 'edition',
              blueprint: 'typed_dateline', concrete: 'stamp', light_table: 'typed_dateline', footage_sharp: 'band', footage_moving: 'band' },
    comps: {
      calendar: { build() {
        const L = CR.L.front, d = parseDate(S.date);
        const top = (d.day + ' ' + d.month).trim();
        if (top) CR.text(L, top, hero({ font: 'head', size: 96, x: M, y: 250, width: 1500, t0: at(.15), anim: CR.anim.hero === 'tracking_open' ? 'mask_wipe' : CR.anim.hero }));
        if (d.year) { const od = CR.odometer(L, d.year, { x: M - 10, y: 370, size: 330, t0: at(.3), dur: 1.25 }); CR.beat = od.end; }
        CR.rule(L, { x: M, y: 740, w: 520, h: 3, color: pal.accent, t0: at(1.1) });
        if (S.label) CR.text(L, S.label, { font: 'cond', size: 44, upper: CR.case === 'upper', ls: .08, x: M, y: 770, width: 1500, color: pal.ink, anim: CR.anim.label, t0: at(1.3) });
        if (S.place) CR.text(L, S.place, { font: 'mono', size: 28, x: M, y: 840, color: pal.dim, anim: 'typewriter', t0: at(1.7) });
        CR.focus = [W * .35, H / 2];
      } },
      axis: { build() {
        // navy: the date on a time scale — the axis of years glides (cruise) under a fixed accent marker until the year
        // lands on it while the year rolls in above; the day and month over it, what happened below
        const d = parseDate(S.date), yr = parseInt(d.year, 10);
        if (!yr) return CR.SCENES.date.comps.calendar.build();
        const L = CR.L.front, ay = 650, mx = W / 2, step = 92;
        const top = (d.day + ' ' + d.month).trim();
        if (top) CR.text(L, top, hero({ font: 'head', size: 72, x: 0, y: 170, width: W, align: 'center', t0: at(.15), anim: CR.anim.hero === 'tracking_open' ? 'mask_wipe' : CR.anim.hero }));
        const od = CR.odometer(L, String(yr), { x: mx, y: 268, size: 250, align: 'center', t0: at(.2), dur: 1.6 });
        const s = CR.svg(CR.L.mid);
        s.style.webkitMaskImage = 'linear-gradient(90deg, rgba(0,0,0,0) 4%, #000 26%, #000 74%, rgba(0,0,0,0) 96%)';
        CR.sv('line', { x1: 0, y1: ay, x2: W, y2: ay, stroke: CR.rgba(pal.ink, .4), 'stroke-width': 1.5 }, s);
        const g = CR.sv('g', {}, s);
        for (let y = yr - 30; y <= yr + 30; y++) {
          const x = (y - yr) * step, major = y % 5 === 0;
          CR.sv('line', { x1: x, y1: ay, x2: x, y2: ay + (major ? 22 : 11), stroke: CR.rgba(pal.ink, major ? .55 : .28), 'stroke-width': major ? 1.6 : 1 }, g);
          for (let k = 1; k < 4; k++) CR.sv('line', { x1: x + k * step / 4, y1: ay, x2: x + k * step / 4, y2: ay + 5, stroke: CR.rgba(pal.ink, .16), 'stroke-width': 1 }, g);
          if (major && y !== yr) { const tl = CR.sv('text', { x, y: ay + 50, 'text-anchor': 'middle', fill: CR.rgba(pal.ink, .42), 'font-family': F.mono, 'font-size': 20 }, g); tl.textContent = String(y); }
        }
        const mk = CR.sv('path', { d: `M${mx},${ay + 26} L${mx},${ay - 64} M${mx - 9},${ay - 76} L${mx},${ay - 62} L${mx + 9},${ay - 76} Z`, stroke: pal.accent, fill: pal.accent, 'stroke-width': 3 }, s);
        mk.style.filter = CR.glowFilter(pal.accent, 30) || 'none';
        const a0 = at(.15), a1 = a0 + Math.min(2.4, D * .55);
        CR.on((tq, t) => { const tt = t == null ? tq : t, p = CR.cruise(seg(tt, a0, a1)), cur = lerp(yr - 7, yr, p); g.setAttribute('transform', `translate(${(mx - (cur - yr) * step).toFixed(2)},0)`);
          mk.style.opacity = CR.sseg(tt, a0, a0 + .5).toFixed(3); });
        CR.beat = Math.max(a1, od.end);
        if (S.label) CR.text(L, S.label, { font: 'cond', size: 46, upper: CR.case === 'upper', ls: .08, x: M, y: ay + 100, width: W - 2 * M, align: 'center', color: pal.ink, anim: CR.anim.label, t0: a1 - .2 });
        if (S.place) CR.text(L, S.place, { font: 'mono', size: 28, x: M, y: ay + 172, width: W - 2 * M, align: 'center', color: pal.dim, anim: 'typewriter', t0: a1 + .2 });
        CR.focus = [mx, ay - 140];
      } },
      tiles: { build() {
        // glass: the date as frosted glass tiles — day, month, year — rising one after the other; what happened under them
        const d = parseDate(S.date), L = CR.L.front;
        const parts = [[d.day, 'num'], [d.month, 'word'], [d.year, 'num']].filter(p => p[0]);
        if (!parts.length) return CR.SCENES.date.comps.calendar.build();
        const th = 330, gap = 28;
        const ws = parts.map(([v, k]) => k === 'num' ? Math.max(300, measure(String(v), 'body', 200, 300) + 120) : Math.max(460, measure(String(v).toUpperCase(), 'cond', 120, 600, .04) + 130));
        const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1), y0 = 230;
        let x = (W - total) / 2;
        parts.forEach(([v, k], i) => {
          const t0 = at(.1 + i * .2);
          const card = CR.glass(CR.L.mid, { x, y: y0, w: ws[i], h: th, r: 26 });
          CR.enter(card.el, { kind: 'rise', t0, dur: .8 });
          const tx = k === 'num'
            ? CR.text(card.el, String(v), { font: 'body', size: 200, weight: 300, ls: -.03, x: 0, y: 0, width: ws[i], align: 'center', lh: 1, nowrap: true, anim: 'focus_pull', t0: t0 + .25 })
            : CR.text(card.el, String(v), { font: 'cond', size: 120, weight: 600, ls: .04, upper: true, x: 0, y: 0, width: ws[i], align: 'center', lh: 1, nowrap: true, anim: 'focus_pull', t0: t0 + .25 });
          tx.el.style.top = ((th - tx.el.offsetHeight) / 2) + 'px';
          x += ws[i] + gap;
        });
        CR.beat = at(.1 + parts.length * .2 + .5);
        if (S.label) CR.text(L, S.label, { font: 'head', size: 56, x: M, y: y0 + th + 76, width: W - 2 * M, align: 'center', color: pal.ink, anim: CR.anim.label === 'typewriter' ? 'mask_wipe' : CR.anim.label, t0: at(1.1) });
        if (S.place) CR.text(L, S.place, { font: 'mono', size: 28, x: M, y: y0 + th + 160, width: W - 2 * M, align: 'center', color: pal.dim, anim: 'typewriter', t0: at(1.5) });
        CR.focus = [W / 2, y0 + th / 2];
      } },
      edition: { build() {
        // newsprint: the date set as a front page's dateline — between heavy and hairline rules, the weekday (computed
        // from the date itself) and the place in small capitals, the date large; what happened as the headline under it
        const ink = pal.sink, dt = String(S.date || ''), pw = W - 2 * M, L = CR.L.front;
        let wd = '';
        try { const dd = new Date(dt + ' 12:00'); if (!isNaN(dd) && dd.getFullYear() > 1582) wd = dd.toLocaleDateString(CR.lang, { weekday: 'long' }); } catch (e) { wd = ''; }
        const y0 = 200;
        CR.rule(L, { x: M, y: y0, w: pw, h: 7, color: ink, glow: false, t0: at(.1), from: 'center' });
        CR.rule(L, { x: M, y: y0 + 13, w: pw, h: 2, color: ink, glow: false, t0: at(.15), from: 'center' });
        if (wd) CR.text(L, wd, { font: 'cond', size: 28, upper: true, ls: .24, x: M, y: y0 + 32, width: pw / 2, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.4) });
        if (S.place) CR.text(L, S.place, { font: 'cond', size: 28, upper: true, ls: .24, x: W / 2, y: y0 + 32, width: pw / 2, align: 'right', color: ink, onLight: true, anim: 'mask_wipe', t0: at(.4) });
        const dz = Math.min(170, fitSize(dt, 'head', pw, 170, 90));
        const tx = CR.text(L, dt, hero({ font: 'head', size: dz, weight: Math.max(700, CR.FW.head), x: M, y: y0 + 86, width: pw, align: 'center', lh: 1, color: ink, onLight: true, t0: at(.3),
          anim: ['typewriter', 'tracking_open', 'stamp'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
        const yb = y0 + 86 + tx.el.offsetHeight + 24;
        CR.rule(L, { x: M, y: yb, w: pw, h: 2, color: ink, glow: false, t0: at(.6), from: 'center' });
        CR.rule(L, { x: M, y: yb + 8, w: pw, h: 7, color: ink, glow: false, t0: at(.65), from: 'center' });
        CR.beat = tx.end;
        if (S.label) CR.text(L, S.label, { font: 'head', size: Math.min(78, fitSize(String(S.label), 'head', pw * .86 * 1.8, 78, 48)), weight: Math.max(600, CR.FW.head), x: M + pw * .07, y: yb + 64, width: pw * .86, align: 'center', lh: 1.06, color: ink, onLight: true, anim: 'mask_wipe', t0: at(1.0), key: S.key, keyColor: pal.accent });
        CR.focus = [W / 2, y0 + 200];
      } },
      typed_dateline: { build() {
        const w = CR.W, onSheet = w === 'paper_desk';
        let host = CR.L.mid, x0 = M, y0 = 360, width = W - 2 * M;
        if (onSheet) { const sh = CR.sheet(CR.L.mid, { x: 220, y: 280, w: 1480, h: 520, pad: 0, seed: 91, age: .45 }); CR.enter(sh.el, { kind: 'land', t0: 0, rot: -1, dur: .5 }); host = sh.el; x0 = 90; y0 = 90; width = 1300; }
        const ink = (onSheet || CR.light) ? pal.sink : pal.ink, onL = ink === pal.sink;
        if (w === 'blueprint') { CR.rule(CR.L.front, { x: M, y: 330, w: W - 2 * M, h: 2, color: pal.ink, glow: false, t0: at(.05) }); CR.rule(CR.L.front, { x: M, y: 640, w: W - 2 * M, h: 2, color: pal.ink, glow: false, t0: at(.1) }); }
        const dt = String(S.date || '');
        const size = Math.min(120, fitSize(dt, 'mono', width, 120, 64));
        const tx = CR.text(host, dt, { font: 'mono', size, weight: 700, x: x0, y: y0, width, color: ink, onLight: onL, anim: 'typewriter', t0: at(.35), cps: 16 });
        const r = tx.el.offsetHeight;
        const s = CR.svg(host); s.style.left = '0'; s.style.top = '0';
        const ux = x0 - 6, uy = y0 + r + 6, uw = Math.min(width, measure(dt, 'mono', size, 700) + 16);
        const p = CR.sv('path', { d: `M${ux},${uy} C${ux + uw * .3},${uy + 7} ${ux + uw * .7},${uy - 5} ${ux + uw},${uy + 3}`, fill: 'none', stroke: pal.accent, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .9 }, s);
        const Lp = uw * 1.02; p.style.strokeDasharray = `${Lp} ${Lp}`; CR.on(t => { p.style.strokeDashoffset = (Lp * (1 - CR.sseg(t, tx.end + .05, tx.end + .5))).toFixed(1); });
        if (S.label) CR.text(host, S.label, { font: 'body', size: 42, weight: 600, x: x0, y: y0 + r + 44, width, color: ink, onLight: onL, anim: CR.anim.label, t0: tx.end + .2 });
        if (S.place) CR.text(host, S.place, { font: 'mono', size: 28, upper: true, ls: .1, x: x0, y: y0 + r + 112, color: onL ? CR.mix(ink, onSheet ? pal.paper : pal.ground, .4) : pal.dim, onLight: onL, anim: 'typewriter', t0: tx.end + .6 });
        CR.focus = [W / 2, H / 2];
      } },
      stamp: { build() {
        const host = CR.L.mid, cx = W / 2, cy = 470;
        const dt = String(S.date || '').toUpperCase();
        const st = CR.text(host, dt, { font: 'stamp', size: 150, x: 0, y: 0, color: pal.accent, anim: 'stamp', t0: at(.55), rot: -3 });
        st.el.style.left = (cx - st.el.offsetWidth / 2) + 'px'; st.el.style.top = (cy - st.el.offsetHeight / 2) + 'px';
        CR.beat = st.end;
        if (S.label) CR.text(host, S.label, { font: 'cond', size: 48, upper: true, ls: .1, x: 0, y: cy + 160, width: W, align: 'center', color: pal.ink, anim: 'mask_wipe', t0: at(1.0) });
        if (S.place) CR.text(host, S.place, { font: 'mono', size: 28, upper: true, ls: .1, x: 0, y: cy + 236, width: W, align: 'center', color: pal.dim, anim: 'typewriter', t0: at(1.4) });
        CR.focus = [W / 2, H / 2];
      } },
      band: { build() {
        CR.footLook(0, .78, .95);
        const L = CR.L.front, bh = 230, by = 650;
        const band = CR.el('div', `position:absolute;left:0;top:${by}px;width:${W}px;height:${bh}px;background:linear-gradient(90deg, rgba(0,0,0,.86), rgba(0,0,0,.62) 60%, rgba(0,0,0,.2));transform-origin:0 50%`, CR.L.mid);
        CR.on(t => { band.style.transform = `scaleX(${CR.sseg(t, at(.05), at(.05) + .7).toFixed(4)})`; });
        const dt = String(S.date || ''), up = CR.case === 'upper';
        const size = Math.min(120, fitSize(up ? dt.toUpperCase() : dt, 'display', 1300, 120, 64));
        CR.text(L, dt, hero({ font: 'display', size, upper: up, ls: up ? .02 : 0, x: M, y: by + 26, width: 1500, nowrap: true, t0: at(.35), anim: CR.anim.hero === 'tracking_open' ? 'letter_rise' : CR.anim.hero }));
        if (S.label) CR.text(L, S.label, { font: 'cond', size: 38, upper: true, ls: .14, x: M + 4, y: by + 32 + size, width: 1500, color: pal.accent, anim: 'mask_wipe', t0: at(1.0) });
        if (S.place) CR.text(L, S.place, { font: 'mono', size: 26, x: W - M - 600, y: by + bh - 56, width: 600, align: 'right', color: pal.dim, anim: 'typewriter', t0: at(1.3) });
        CR.focus = [W / 2, by];
      } },
    },
  });

  // ══ QUOTE ══════════════════════════════════════════════════════════════════════════════════════════════════════
  const quoteSize = (s, w, big, small) => { const n = String(s || '').length; const z = n < 40 ? big * 1.4 : n < 70 ? big * 1.15 : n < 120 ? big : n < 180 ? big * .86 : big * .74; return Math.max(small, Math.round(Math.min(z, fitSize(s, 'serif', w * 3.2, big * 1.4, small)))); };
  const who = (L, x, y, w, o = {}) => {
    if (!S.who) return;
    CR.rule(L, { x, y: y + 18, w: 40, h: 2, color: o.color || pal.accent, glow: false, t0: o.t0 });
    CR.text(L, S.who, { font: 'cond', size: 34, upper: true, ls: .16, x: x + 58, y, color: o.ink || pal.ink, onLight: o.onLight, anim: 'mask_wipe', t0: o.t0 });
    const sub = [S.role, S.year].filter(Boolean).join(', ');
    if (sub) CR.text(L, sub, { font: 'serif', italic: true, size: 30, x: x + 58, y: y + 46, width: w - 58, color: o.dim || pal.dim, onLight: o.onLight, anim: 'mask_wipe', t0: (o.t0 || 0) + .25 });
  };
  const vRule = (parent, x, y, h, col, t0, dur = .9) => {         // a vertical rule that draws downwards (smoothstep)
    const el = CR.el('div', `position:absolute;left:${x}px;top:${y}px;width:3px;height:${h}px;background:${col};transform-origin:50% 0`, parent);
    if (!CR.light) el.style.filter = CR.glowFilter(col, 30);
    CR.on(t => { el.style.transform = `scaleY(${CR.sseg(t, t0, t0 + dur).toFixed(4)})`; });
    return el;
  };
  const quoteAnim = () => CR.anim.hero === 'highlighter' ? 'highlighter' : CR.anim.hero === 'focus_pull' ? 'focus_pull' : 'mask_wipe';
  CR.scene('quote', {
    s: 6.0,
    layout: { void_black: 'pull', navy_falloff: 'column', charcoal_light: 'portrait', glass_dark: 'pane', paper_desk: 'typed', newsprint: 'press_pull',
              blueprint: 'pull', concrete: 'typed', light_table: 'portrait', footage_sharp: 'portrait', footage_moving: 'portrait' },
    comps: {
      pull: { build() {
        const L = CR.L.front, text = String(S.text || '');
        const mk = CR.el('div', `position:absolute;left:${M - 20}px;top:40px;font-family:${F.head};font-size:420px;line-height:1;color:${pal.accent};opacity:0`, CR.L.mid, '“');
        mk.style.textShadow = CR.glowText(420 * .3, pal.accent);
        CR.on(t => { mk.style.opacity = (.9 * CR.sseg(t, at(.05), at(.05) + .8)).toFixed(3); });
        const w = 1360, size = quoteSize(text, w, 70, 40);
        const tx = CR.text(L, text, { font: 'serif', size, x: M + 150, y: 300, width: w, lh: 1.22, key: S.mark, anim: quoteAnim(), mark: S.mark, t0: at(.35), stagger: .22, dur: .9 });
        const hq = tx.el.offsetHeight, top = Math.max(250, (H - hq - 120) / 2);
        tx.el.style.top = top + 'px'; mk.style.top = (top - 250) + 'px';
        who(L, M + 150, top + hq + 52, w, { t0: tx.end + .1 });
        CR.focus = [W / 2, top + hq / 2];
      } },
      column: { build() {
        // navy: the speaker on the left (their photograph in the world's duotone, name and role under it), a tall
        // accent rule, the words in a reading column on the right
        const L = CR.L.front, text = String(S.text || ''), src = photoOf('photo');
        const rx = 700, x = rx + 64, w = W - x - M;
        const size = quoteSize(text, w, 60, 36);
        const tx = CR.text(L, `“${text}”`, { font: 'serif', size, x, y: 0, width: w, lh: 1.26, key: S.mark, mark: S.mark, anim: quoteAnim(), t0: at(.5), stagger: .22, dur: .9 });
        tx.el.style.textIndent = '-.42em';
        const h = tx.el.offsetHeight, top = Math.max(110, (H - h) / 2); tx.el.style.top = top + 'px';
        vRule(L, rx, Math.min(top - 14, (H - 560) / 2), Math.max(h + 28, src ? 560 : 0), pal.accent, at(.3));
        const cw = rx - 70 - M;
        if (src) {
          const ph = 520, py = (H - ph) / 2 - 50;
          const p = CR.photo(CR.L.mid, src, { x: M, y: py, w: cw, h: ph, frame: 'none', treat: 'duo', focus: [.5, .3] });
          CR.enter(p.el, { kind: 'fade', t0: 0, dur: .9 });
          if (S.who) CR.text(L, S.who, { font: 'cond', size: 32, upper: true, ls: .16, x: M, y: py + ph + 26, width: cw, color: pal.ink, anim: 'mask_wipe', t0: at(.8) });
          const sub = [S.role, S.year].filter(Boolean).join(', ');
          if (sub) CR.text(L, sub, { font: 'serif', italic: true, size: 28, x: M, y: py + ph + 70, width: cw, color: pal.dim, anim: 'mask_wipe', t0: at(1.0) });
        } else if (S.who) {
          const nz = Math.min(64, fitSize(String(S.who).toUpperCase(), 'cond', cw * 1.9, 64, 36, .08));
          const nm = CR.text(L, S.who, { font: 'cond', size: nz, upper: true, ls: .08, x: M, y: 0, width: cw, lh: 1.04, color: pal.ink, anim: 'mask_wipe', t0: at(.3) });
          const nh = nm.el.offsetHeight; nm.el.style.top = (H / 2 - nh / 2 - 20) + 'px';
          const sub = [S.role, S.year].filter(Boolean).join(', ');
          if (sub) CR.text(L, sub, { font: 'serif', italic: true, size: 30, x: M, y: H / 2 + nh / 2, width: cw, color: pal.dim, anim: 'mask_wipe', t0: at(.6) });
        }
        CR.focus = [x + w / 2, H / 2];
      } },
      pane: { build() {
        // glass: the words on a frosted glass card with a large, faint quotation mark in its corner; the speaker's photo
        // inset on the card's left when there is one, the speaker under the words
        const text = String(S.text || ''), src = photoOf('photo'), cw = 1460, cx = (W - cw) / 2;
        const card = CR.glass(CR.L.mid, { x: cx, y: 0, w: cw, h: 600, r: 28 });
        CR.enter(card.el, { kind: 'rise', t0: 0, dur: .9 });
        const X = src ? 540 : 150, w = cw - X - 110;
        CR.el('div', `position:absolute;left:${X - 96}px;top:10px;font-family:${F.head};font-size:300px;line-height:1;color:${CR.rgba(pal.accent2, .22)}`, card.el, '“');
        const size = quoteSize(text, w, 56, 34);
        const tx = CR.text(card.el, text, { font: 'serif', size, x: X, y: 110, width: w, lh: 1.26, key: S.mark, mark: S.mark, anim: quoteAnim(), t0: at(.45), stagger: .22, dur: .9 });
        const h = tx.el.offsetHeight, ch = Math.max(src ? 600 : 420, 110 + h + (S.who ? 150 : 90));
        card.el.style.height = ch + 'px'; card.el.style.top = ((H - ch) / 2) + 'px';
        if (src) { const p = CR.photo(card.el, src, { x: 40, y: 40, w: 420, h: ch - 80, frame: 'card', treat: 'clean', focus: [.5, .3] }); CR.enter(p.el, { kind: 'fade', t0: at(.25), dur: .8 }); }
        who(card.el, X, 110 + h + 48, w, { t0: tx.end + .1, color: pal.accent2 });
        CR.focus = [W / 2, H / 2];
      } },
      press_pull: { build() {
        // newsprint: a pull quote as the paper sets it — between two red rules, the words large in the italic serif, the
        // speaker in small capitals under a dash
        const ink = pal.sink, text = String(S.text || ''), w = 1440, x = (W - w) / 2, L = CR.L.front;
        const size = quoteSize(text, w, 78, 44);
        const tx = CR.text(L, `“${text}”`, { font: 'serif', italic: true, size, x, y: 0, width: w, align: 'center', lh: 1.18, color: ink, onLight: true, key: S.mark, keyColor: pal.accent, anim: 'mask_wipe', t0: at(.4), stagger: .22, dur: .9 });
        const h = tx.el.offsetHeight, wh = S.who ? 96 : 0, top = (H - h - wh) / 2; tx.el.style.top = top + 'px';
        CR.rule(L, { x: x + w * .2, y: top - 54, w: w * .6, h: 6, color: pal.accent, glow: false, t0: at(.15), from: 'center' });
        CR.rule(L, { x: x + w * .2, y: top + h + wh + 30, w: w * .6, h: 2, color: pal.accent, glow: false, t0: at(.25), from: 'center' });
        if (S.who) {
          const line = '— ' + S.who + ([S.role, S.year].filter(Boolean).length ? ', ' + [S.role, S.year].filter(Boolean).join(', ') : '');
          CR.text(L, line, { font: 'cond', size: 32, upper: true, ls: .16, x, y: top + h + 34, width: w, align: 'center', color: ink, onLight: true, anim: 'mask_wipe', t0: tx.end + .1 });
        }
        CR.focus = [W / 2, H / 2];
      } },
      typed: { build() {
        const w = CR.W, text = String(S.text || '');
        const sw = 1500, size = quoteSize(text, sw - 200, 52, 34);
        mc = mc || document.createElement('canvas').getContext('2d');
        const lines = Math.ceil(measure(text, 'mono', size) / (sw - 220)) + 1;
        const sh = Math.min(820, 160 + lines * size * 1.3 + 150);
        const sx = (W - sw) / 2, sy = (H - sh) / 2 - 20;
        const paperC = w === 'newsprint' ? CR.mix(pal.paper, '#FFFFFF', .3) : pal.paper;
        const strip = CR.sheet(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, color: paperC, pad: 0, seed: 111, age: .45 });
        CR.enter(strip.el, { kind: w === 'newsprint' ? 'rise' : 'land', t0: 0, rot: w === 'newsprint' ? 0 : -.9, dur: .5 });
        if (w === 'concrete') { CR.tape(strip.el, 40, 10, 150, -18); CR.tape(strip.el, sw - 40, 10, 150, 16); }
        CR.el('div', `position:absolute;left:92px;top:0;bottom:0;width:2px;background:${CR.rgba(pal.accent, .6)}`, strip.el);
        const budget = Math.max(1.4, D * .58);
        const tx = CR.text(strip.el, `“${text}”`, { font: 'mono', size, x: 130, y: 90, width: sw - 220, lh: 1.3, color: pal.sink, onLight: true, anim: 'typewriter', t0: at(.5), dur: Math.min(budget, Math.max(1.2, text.length / 30)), under: S.mark });
        const r = tx.el.offsetHeight;
        if (S.who) CR.text(strip.el, ('— ' + S.who + (S.role ? ', ' + S.role : '') + (S.year ? ', ' + S.year : '')), { font: 'mono', size: Math.round(size * .78), upper: false, x: 130, y: 90 + r + 30, width: sw - 220, color: CR.mix(pal.sink, paperC, .3), onLight: true, anim: 'typewriter', t0: tx.end + .15, cps: 40 });
        CR.focus = [W / 2, sy + sh / 2];
      } },
      portrait: { build() {
        const L = CR.L.front, text = String(S.text || '');
        const src = photoOf('photo');
        const lw = 860;
        if (src) { const p = CR.photo(CR.L.back, src, { x: 0, y: 0, w: lw, h: H, treat: 'mono', focus: [.5, .3] }); CR.enter(p.el, { kind: 'fade', t0: 0, dur: .9 });
          CR.el('div', `position:absolute;left:0;top:0;width:${lw + 2}px;height:${H}px;background:linear-gradient(90deg, rgba(0,0,0,0) 40%, ${CR.light ? pal.ground : CR.rgba(CR.mix(pal.ground, '#000', .2), 1)} 100%)`, CR.L.back); }
        else if (CR.foot) { CR.footLook(4, .4, .5); veil(CR.L.back, 'l'); }
        if (CR.foot && src) veil(CR.L.back, 'all');
        const x = src ? lw + 40 : M + 80, w = W - x - M, onL = CR.light && !CR.foot;
        const size = quoteSize(text, w, 62, 36);
        const tx = CR.text(L, `“${text}”`, { font: 'serif', size, x, y: 0, width: w, lh: 1.24, key: S.mark, color: onL ? pal.sink : pal.ink, onLight: onL, anim: 'mask_wipe', t0: at(.45), stagger: .24, dur: .9 });
        const h = tx.el.offsetHeight, top = Math.max(110, (H - h) / 2 - 60); tx.el.style.top = top + 'px';
        who(L, x, top + h + 50, w, { t0: tx.end + .1, ink: onL ? pal.sink : pal.ink, dim: onL ? CR.mix(pal.sink, pal.ground, .4) : pal.dim, onLight: onL });
        CR.focus = [x + w / 2, H / 2];
      } },
    },
  });

  // ══ STATEMENT ══════════════════════════════════════════════════════════════════════════════════════════════════
  CR.scene('statement', {
    s: 4.2,
    layout: { void_black: 'quiet', navy_falloff: 'stack', charcoal_light: 'stack', glass_dark: 'keynote', paper_desk: 'banner', newsprint: 'headline',
              blueprint: 'full_bleed', concrete: 'full_bleed', light_table: 'quiet', footage_sharp: 'quiet', footage_moving: 'full_bleed' },
    place: { full_bleed: 'full_bleed' },
    comps: {
      stack: { build() {
        const line = String(S.line || S.text || ''), up = CR.case === 'upper';
        const B = block(CR.L.front, 'll', 1500), cen = B.align === 'center';
        const size = Math.min(132, fitSize(up ? line.toUpperCase() : line, 'head', B.w * 2.4, 132, 72));
        CR.rule(B.el, { x: cen ? B.w / 2 - 35 : 0, y: 0, w: 70, h: 4, color: pal.accent, t0: at(.1), from: cen ? 'center' : 'left' });
        const tx = CR.text(B.el, line, hero({ font: 'head', size, x: 0, y: 40, width: B.w, align: B.align, upper: up, lh: 1.02, key: S.key, t0: at(.3) }));
        const h = 40 + tx.el.offsetHeight;
        // the statement sits in the middle band of the frame unless the placement asks for the top
        const top = (B.cls === 'tl' || B.cls === 'tc' || B.cls === 'vs') ? B.pin(h, 0, 150) : (B.el.style.top = ((H - h) / 2).toFixed(1) + 'px', (H - h) / 2);
        CR.beat = tx.end;
        CR.focus = [B.x + B.w / 2, top + h / 2];
      } },
      keynote: { build() {
        // glass: keynote type — a bold sans, centred, nothing else on the frame; words come into focus one by one and
        // the key words are lit with a gradient of the two accents
        const line = String(S.line || S.text || ''), w = 1560;
        const size = Math.min(128, fitSize(line, 'body', w * 2.2, 128, 64));
        const anim = ['focus_pull', 'mask_wipe', 'letter_rise'].includes(CR.anim.hero) ? CR.anim.hero : 'focus_pull';
        const tx = CR.text(CR.L.front, line, { font: 'body', size, weight: 700, ls: -.015, x: (W - w) / 2, y: 0, width: w, align: 'center', lh: 1.06, key: S.key, anim, t0: at(.3), stagger: .09 });
        const ki = CR.keyIdx(line.split(/\s+/).filter(Boolean), S.key);
        tx.el.querySelectorAll('[data-i]').forEach(sp => { if (!ki.has(+sp.dataset.i)) return;
          sp.style.backgroundImage = `linear-gradient(95deg, ${CR.mix(pal.accent, '#FFFFFF', .12)}, ${pal.accent2})`; sp.style.webkitBackgroundClip = 'text'; sp.style.backgroundClip = 'text';
          sp.style.color = 'transparent'; sp.style.textShadow = 'none'; });
        const h = tx.el.offsetHeight, top = (H - h) / 2 - 10; tx.el.style.top = top + 'px';
        CR.rule(CR.L.front, { x: W / 2 - 60, y: top + h + 54, w: 120, h: 2, color: CR.rgba(pal.accent2, .7), from: 'center', t0: tx.end, dur: .6 });
        CR.beat = tx.end;
        CR.focus = [W / 2, H / 2];
      } },
      headline: { build() {
        // newsprint: a banner headline across the page — heavy condensed capitals between a red rule and a hairline,
        // the key words in the paper's red
        const ink = pal.sink, line = String(S.line || S.text || '').toUpperCase(), pw = W - 2 * M, L = CR.L.front;
        const size = Math.min(196, fitSize(line, 'cond', pw * 2.3, 196, 90, .005));
        const tx = CR.text(L, line, hero({ font: 'cond', size, weight: 700, ls: .005, x: M, y: 0, width: pw, lh: .94, key: S.key, keyColor: pal.accent, color: ink, onLight: true, t0: at(.3),
          anim: ['typewriter', 'tracking_open', 'stamp', 'split_flap'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero }));
        const h = tx.el.offsetHeight, top = (H - h) / 2 + 10; tx.el.style.top = top + 'px';
        CR.rule(L, { x: M, y: top - 44, w: pw, h: 11, color: pal.accent, glow: false, t0: at(.1), from: 'left' });
        CR.rule(L, { x: M, y: top + h + 30, w: pw, h: 2, color: ink, glow: false, t0: at(.6), from: 'left' });
        CR.beat = tx.end;
        CR.focus = [W / 2, H / 2];
      } },
      quiet: { build() {
        if (CR.foot) { CR.footLook(5, .4, .7); }
        const L = CR.L.front, line = String(S.line || S.text || '');
        const onL = CR.light && !CR.foot;
        const w = 1240, size = Math.min(64, fitSize(line, 'serif', w * 2.2, 66, 44));
        const tx = CR.text(L, line, { font: 'serif', size, x: (W - w) / 2, y: 0, width: w, align: 'center', lh: 1.25, key: S.key, color: onL ? pal.sink : pal.ink, onLight: onL, anim: CR.anim.hero === 'typewriter' ? 'typewriter' : 'mask_wipe', t0: at(.4), dur: 1.0, stagger: .25 });
        const h = tx.el.offsetHeight; tx.el.style.top = ((H - h) / 2) + 'px';
        CR.focus = [W / 2, H / 2];
      } },
      banner: { build() {
        const w = CR.W, line = String(S.line || S.text || '');
        let host = CR.L.front, bw = W - 2 * M, bx = M, by = 330;
        if (w === 'paper_desk') { const cl = CR.sheet(CR.L.mid, { x: 150, y: 260, w: 1620, h: 560, color: '#E4DFD2', pad: 0, seed: 121, age: .7 }); CR.enter(cl.el, { kind: 'land', t0: 0, rot: -1.1, dur: .5 }); host = cl.el; bx = 70; by = 70; bw = 1480; }
        const ink = pal.sink;
        CR.rule(host, { x: bx, y: by, w: bw, h: 8, color: ink, glow: false, t0: at(.15), from: 'center' });
        const size = Math.min(140, fitSize(line, 'head', bw * 2.1, 140, 70));
        const tx = CR.text(host, line, hero({ font: 'head', size, weight: Math.max(700, CR.FW.head), x: bx, y: by + 34, width: bw, align: 'center', lh: 1.0, key: S.key, keyColor: pal.accent, color: ink, onLight: true, t0: at(.35),
          anim: ['typewriter', 'stamp', 'tracking_open'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero, cps: 30 }));
        CR.rule(host, { x: bx, y: by + 34 + tx.el.offsetHeight + 26, w: bw, h: 2, color: ink, glow: false, t0: at(.9), from: 'center' });
        if (host !== CR.L.front) {                           // the clipping is as tall as its headline
          const hh = by + 34 + tx.el.offsetHeight + 26 + by; host.style.height = hh + 'px'; host.style.top = ((H - hh) / 2) + 'px';
          host.style.backgroundSize = '100% 100%';
        }
        CR.beat = tx.end;
        CR.focus = [W / 2, H / 2];
      } },
      full_bleed: { build() {
        if (CR.foot) { CR.footLook(2, .38, .8); }
        const L = CR.L.front, line = String(S.line || S.text || '').toUpperCase();
        const bp = CR.W === 'blueprint';
        const role = CR.W === 'concrete' ? 'cond' : 'display';
        const w = W - 2 * M + 40, size = Math.min(230, fitSize(line, role, w * 2.6, 230, 96));
        const tx = CR.text(L, line, hero({ font: role, size, x: M - 20, y: 0, width: w, align: 'center', lh: .94, key: S.key, t0: at(.25), color: bp ? 'transparent' : pal.ink,
          anim: CR.anim.hero === 'tracking_open' || CR.anim.hero === 'typewriter' ? 'letter_rise' : CR.anim.hero }));
        if (bp) { tx.el.style.webkitTextStroke = `2.5px ${pal.ink}`; tx.el.style.textShadow = 'none'; }
        const h = tx.el.offsetHeight; tx.el.style.top = ((H - h) / 2) + 'px';
        CR.beat = tx.end;
        CR.focus = [W / 2, H / 2];
      } },
    },
  });

  // ══ DOCUMENT ═══════════════════════════════════════════════════════════════════════════════════════════════════
  const docLines = () => (Array.isArray(S.lines) ? S.lines : String(S.lines || S.text || '').split(/\n+/)).map(String).filter(s => s.trim()).slice(0, 7);
  const markOf = lines => lines.findIndex(l => S.mark && l.toLowerCase().includes(String(S.mark).toLowerCase().slice(0, 24)));
  const redOf = ln => (Array.isArray(S.redact) ? S.redact.filter(r => ln.toLowerCase().includes(String(r).toLowerCase())) : []);
  CR.scene('document', {
    s: 6.4,
    layout: { void_black: 'screen', navy_falloff: 'transcript', charcoal_light: 'sheet', glass_dark: 'screen', paper_desk: 'sheet', newsprint: 'facsimile',
              blueprint: 'microfilm', concrete: 'cable', light_table: 'transparency', footage_sharp: 'sheet', footage_moving: 'screen' },
    comps: {
      sheet: { build() {
        if (CR.foot) CR.footLook(8, .38, .5);
        const w = CR.W, lines = docLines(), sw = 1180, sh = 960, sx = (W - sw) / 2 + 20, sy = 70;
        const sheet = CR.sheet(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, pad: 0, seed: 131, age: .6 });
        CR.enter(sheet.el, { kind: 'land', t0: 0, rot: -1.1, dur: .55 });
        if (w === 'concrete') { CR.tape(sheet.el, 70, 10, 180, -14); CR.tape(sheet.el, sw - 70, 10, 180, 12); }
        if (w === 'paper_desk') CR.clip(sheet.el, 90, -30, -6);
        const ink = pal.sink, dimk = CR.mix(pal.sink, pal.paper, .42), X = 110, TW = sw - 220;
        let y = 96;
        const head = [S.from, S.date].filter(Boolean);
        if (head.length) { CR.text(sheet.el, head.join('      '), { font: 'mono', size: 26, upper: true, ls: .08, x: X, y, width: TW, color: dimk, onLight: true, anim: 'none', t0: 0 }); y += 56; }
        if (S.title) { const tt = CR.text(sheet.el, S.title, { font: 'mono', size: 40, weight: 700, upper: true, x: X, y, width: TW, color: ink, onLight: true, anim: 'typewriter', t0: at(.55), cps: 34 });
          CR.el('div', `position:absolute;left:${X}px;top:${y + tt.el.offsetHeight + 8}px;width:${Math.min(TW, measure(String(S.title).toUpperCase(), 'mono', 40, 700) + 6)}px;height:3px;background:${ink}`, sheet.el); y += tt.el.offsetHeight + 54; }
        const budget = Math.max(1.6, D * .55), total = lines.join(' ').length || 1;
        let t = at(.9);
        const mi = markOf(lines);
        lines.forEach((ln, i) => {
          const dur = Math.max(.35, budget * ln.length / total), red = redOf(ln);
          const tx = CR.text(sheet.el, ln, { font: 'mono', size: 32, x: X, y, width: TW, lh: 1.42, color: ink, onLight: true, anim: red.length ? 'redaction' : 'typewriter', redact: red, t0: t, dur: red.length ? undefined : dur });
          const hh = tx.el.offsetHeight;
          if (i === mi) {                                    // the key line: red pencil under it, and the camera leans in
            const s = CR.svg(sheet.el); const uw = Math.min(TW, measure(ln, 'mono', 32) + 10), uy = y + hh - 4;
            const p = CR.sv('path', { d: `M${X - 6},${uy} C${X + uw * .35},${uy + 6} ${X + uw * .7},${uy - 4} ${X + uw},${uy + 2}`, fill: 'none', stroke: pal.accent, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .9 }, s);
            const Lp = uw * 1.03; p.style.strokeDasharray = `${Lp} ${Lp}`; const a0 = tx.end + .1; CR.on(tt => { p.style.strokeDashoffset = (Lp * (1 - CR.sseg(tt, a0, a0 + .5))).toFixed(1); });
            CR.focus = [sx + X + uw / 2, sy + y + hh / 2]; CR.beat = a0;
          }
          y += hh + 16; t = tx.end + .12;
        });
        if (mi < 0) CR.focus = [W / 2, sy + 420];
        if (S.stamp) CR.text(sheet.el, String(S.stamp).toUpperCase(), { font: 'stamp', size: 76, x: sw - 560, y: 120, color: pal.accent, onLight: true, anim: 'stamp', t0: Math.min(t + .2, D - .9), rot: -7 });
      } },
      screen: { build() {
        if (CR.foot) { CR.footLook(10, .32, .5); }
        const lines = docLines(), pw = 1340, ph = 820, px = (W - pw) / 2, py = (H - ph) / 2;
        const pn = CR.panel(CR.L.mid, { x: px, y: py, w: pw, h: ph, r: 18 });
        CR.enter(pn.el, { kind: 'rise', t0: 0, dur: .8 });
        const host = pn.el, X = 80;
        CR.el('div', `position:absolute;left:0;right:0;top:0;height:64px;border-bottom:1px solid ${CR.rgba(pal.ink, .12)}`, host);
        const hd = [S.from, S.date].filter(Boolean).join('   ·   ');
        if (hd) CR.text(host, hd, { font: 'mono', size: 22, upper: true, ls: .12, x: X, y: 20, color: pal.dim, anim: 'none', t0: 0 });
        let y = 104;
        if (S.title) { const tt = CR.text(host, S.title, { font: 'body', size: 56, weight: 600, x: X, y, width: pw - 2 * X, color: pal.ink, anim: 'mask_wipe', t0: at(.35) }); y += tt.el.offsetHeight + 40; }
        const markIdx = markOf(lines);
        let t = at(.65);
        lines.forEach((ln, i) => {
          const red = redOf(ln), isMark = i === markIdx;
          const tx = CR.text(host, ln, { font: 'mono', size: 35, x: X + 24, y, width: pw - 2 * X - 24, lh: 1.4, color: isMark ? pal.ink : CR.mix(pal.ink, pal.ground, .25), anim: red.length ? 'redaction' : 'mask_wipe', redact: red, t0: t, dur: .55, glow: isMark });
          const hh = tx.el.offsetHeight;
          if (isMark) { const bar = CR.el('div', `position:absolute;left:${X}px;top:${y + 4}px;width:4px;height:${hh - 8}px;background:${pal.accent};transform-origin:50% 0`, host); bar.style.filter = CR.glowFilter(pal.accent, 30);
            const a0 = t + .4; CR.on(tt => { bar.style.transform = `scaleY(${CR.sseg(tt, a0, a0 + .4).toFixed(4)})`; }); CR.focus = [W / 2, py + y + hh / 2]; CR.beat = a0; }
          y += hh + 14; t += .32;
        });
        if (S.stamp) CR.text(host, String(S.stamp).toUpperCase(), { font: 'cond', size: 30, ls: .3, x: pw - 360, y: 18, width: 300, align: 'right', color: pal.accent, anim: 'mask_wipe', t0: at(.4) });
        const fitH = Math.min(H - 120, y + 60);                // the panel is as tall as its document
        pn.el.style.height = fitH + 'px'; pn.el.style.top = ((H - fitH) / 2) + 'px';
        if (markIdx < 0) CR.focus = [W / 2, H / 2];
        else CR.focus = [W / 2, CR.focus[1] - py + (H - fitH) / 2];
      } },
      transcript: { build() {
        // navy: a time-coded transcript set on the ground — timecode, speaker and words in three columns, rows revealed
        // in order; the line that matters full white behind an accent bar, the others a step quieter
        const lines = docLines(), rows = lines.map(ln => {
          const m = ln.match(/^\s*(\d{1,3}:\d{2}(?::\d{2})?)\s+(.*)$/), rest = m ? m[2] : ln, sp = rest.match(/^([^:]{1,26}):\s+(.*)$/);
          return { tc: m ? m[1] : '', who: sp ? sp[1] : '', txt: sp ? sp[2] : rest };
        });
        const hasTc = rows.some(r => r.tc), hasWho = rows.some(r => r.who);
        const X0 = M, X1 = M + (hasTc ? 210 : 0), X2 = X1 + (hasWho ? 250 : 0), TW = W - X2 - M;
        const box = CR.el('div', `position:absolute;left:0;top:0;width:${W}px`, CR.L.front);
        let y = 0;
        const hd = [S.from, S.date].filter(Boolean).join('   ·   ');
        if (hd) { CR.label(box, hd, { x: X0, y, size: 24, ls: .26, t0: at(.1), color: pal.accent }); y += 48; }
        if (S.title) { const tt = CR.text(box, S.title, hero({ font: 'head', size: 60, x: X0, y, width: W - 2 * M, lh: 1.05, t0: at(.25) })); y += tt.el.offsetHeight + 34; }
        CR.rule(box, { x: X0, y, w: W - 2 * M, h: 1.5, color: CR.rgba(pal.ink, .35), glow: false, t0: at(.3), dur: .9 }); y += 34;
        const mi = markOf(lines);
        let t = at(.75), markY = null;
        rows.forEach((r, i) => {
          const isMark = i === mi, col = isMark || mi < 0 ? pal.ink : CR.mix(pal.ink, pal.ground, .32);
          if (r.tc) CR.text(box, r.tc, { font: 'mono', size: 26, x: X0, y: y + 8, color: pal.dim, anim: 'none', t0: t });
          if (r.who) CR.text(box, r.who, { font: 'cond', size: 30, upper: true, ls: .12, x: X1, y: y + 6, width: X2 - X1 - 30, color: isMark ? pal.accent : CR.mix(pal.accent2, pal.ground, .2), anim: 'none', t0: t });
          const tx = CR.text(box, r.txt, { font: 'serif', size: 40, x: X2, y, width: TW, lh: 1.24, color: col, anim: 'mask_wipe', t0: t, dur: .55, glow: isMark });
          const hh = tx.el.offsetHeight;
          if (isMark) { markY = y + hh / 2; vRule(box, X2 - 26, y + 4, hh - 8, pal.accent, tx.end + .1, .45); CR.beat = tx.end + .1; }
          y += hh + 22; t = tx.end - .15;
          if (i < rows.length - 1) CR.rule(box, { x: X2, y: y - 12, w: TW, h: 1, color: CR.rgba(pal.ink, .1), glow: false, t0: t, dur: .5 });
        });
        if (S.stamp) CR.text(box, String(S.stamp).toUpperCase(), { font: 'cond', size: 30, ls: .3, x: W - M - 600, y: 0, width: 600, align: 'right', color: pal.accent, anim: 'mask_wipe', t0: at(.4) });
        const top = Math.max(70, (H - y) / 2); box.style.top = top + 'px';
        CR.focus = [W / 2, markY == null ? H / 2 : top + markY];
      } },
      cable: { build() {
        // concrete: a teletype cable taped to the wall — tractor-feed paper with its sprocket holes, the header fields,
        // every line typed in capitals; the line that matters underlined in red pencil, the cable's marking stamped
        const lines = docLines(), sw = 1180, sx = (W - sw) / 2, pc = '#EEEADB';
        const sheet = CR.sheet(CR.L.mid, { x: sx, y: 60, w: sw, h: 960, color: pc, pad: 0, seed: 133, age: .45 });
        CR.enter(sheet.el, { kind: 'land', t0: 0, rot: -.6, dur: .5 });
        const ink = '#1E1D1B', dimk = CR.mix(ink, pc, .45), X = 120, TW = sw - 240;
        let y = 70;
        const field = (k, v) => { if (!v) return; CR.text(sheet.el, `${k.toUpperCase()}:  ${String(v).toUpperCase()}`, { font: 'mono', size: 27, x: X, y, width: TW, color: dimk, onLight: true, anim: 'none', t0: 0 }); y += 44; };
        field(CR.t('from'), S.from); field(CR.t('date'), S.date);
        if (S.title) { y += 10; const tt = CR.text(sheet.el, String(S.title).toUpperCase(), { font: 'mono', size: 34, weight: 700, x: X, y, width: TW, color: ink, onLight: true, anim: 'typewriter', t0: at(.45), cps: 30 }); y += tt.el.offsetHeight + 8; }
        CR.el('div', `position:absolute;left:${X}px;top:${y + 12}px;width:${TW}px;height:0;border-top:2px dashed ${CR.rgba(ink, .55)}`, sheet.el); y += 44;
        const budget = Math.max(1.6, D * .5), total = lines.join(' ').length || 1, mi = markOf(lines);
        let t = at(.9), fy = null;
        lines.forEach((ln, i) => {
          const red = redOf(ln), dur = Math.max(.35, budget * ln.length / total);
          const tx = CR.text(sheet.el, ln.toUpperCase(), { font: 'mono', size: 30, x: X, y, width: TW, lh: 1.42, color: ink, onLight: true, anim: red.length ? 'redaction' : 'typewriter', redact: red.map(r => String(r).toUpperCase()), t0: t, dur: red.length ? undefined : dur });
          const hh = tx.el.offsetHeight;
          if (i === mi) {
            const s = CR.svg(sheet.el), uw = Math.min(TW, measure(ln.toUpperCase(), 'mono', 30) + 10), uy = y + hh - 4;
            const p = CR.sv('path', { d: `M${X - 6},${uy} C${X + uw * .35},${uy + 6} ${X + uw * .7},${uy - 4} ${X + uw},${uy + 2}`, fill: 'none', stroke: pal.accent, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .9 }, s);
            const Lp = uw * 1.03; p.style.strokeDasharray = `${Lp} ${Lp}`; const a0 = tx.end + .1; CR.on(tt => { p.style.strokeDashoffset = (Lp * (1 - CR.sseg(tt, a0, a0 + .5))).toFixed(1); });
            CR.beat = a0; fy = [sx + X + uw / 2, y + hh / 2];
          }
          y += hh + 12; t = tx.end + .1;
        });
        const sh = Math.min(980, Math.max(560, y + 80)), sy = (H - sh) / 2;
        sheet.el.style.height = sh + 'px'; sheet.el.style.top = sy + 'px'; sheet.el.style.backgroundSize = '100% 100%';
        CR.focus = fy ? [fy[0], sy + fy[1]] : [W / 2, H / 2];
        // tractor feed: sprocket holes down both edges and the perforation beside them
        for (let hy = 26; hy < sh - 16; hy += 46) for (const hx of [30, sw - 30]) CR.el('div', `position:absolute;left:${hx - 9}px;top:${hy - 9}px;width:18px;height:18px;border-radius:50%;background:${CR.mix(pal.ground, '#000', .2)};box-shadow:inset 0 2px 3px rgba(0,0,0,.6)`, sheet.el);
        for (const px of [62, sw - 64]) CR.el('div', `position:absolute;left:${px}px;top:0;bottom:0;width:0;border-left:2px dotted ${CR.rgba(ink, .22)}`, sheet.el);
        CR.tape(sheet.el, sw / 2 - 260, 6, 150, -6); CR.tape(sheet.el, sw / 2 + 260, 6, 150, 5);
        if (S.stamp) CR.text(sheet.el, String(S.stamp).toUpperCase(), { font: 'stamp', size: 64, x: sw - 470, y: 60, color: pal.accent, onLight: true, anim: 'stamp', t0: Math.min(t + .2, D - .9), rot: -5 });
      } },
      facsimile: { build() {
        // newsprint: the document reproduced in the page as a photostat — set into the column with a keyline, its toner
        // a touch soft; the key line bracketed in the margin in the editor's red; the cutline under it names it
        const lines = docLines(), ink = pal.sink, fw = 1180, fx = (W - fw) / 2, pc = '#F3F1EB', tone = '#232220';
        const box = CR.el('div', `position:absolute;left:${fx}px;top:0;width:${fw}px;height:400px;background:${pc};box-shadow:0 0 0 1.5px ${ink}`, CR.L.mid);
        const doc = CR.el('div', 'position:absolute;inset:0;filter:blur(.35px) contrast(1.08)', box);
        CR.enter(box, { kind: 'fade', t0: 0, dur: .6 });
        const X = 110, TW = fw - 2 * X, dimk = CR.mix(tone, pc, .42);
        let y = 74;
        const hd = [S.from, S.date].filter(Boolean).join('      ');
        if (hd) { CR.text(doc, hd, { font: 'mono', size: 25, upper: true, ls: .08, x: X, y, width: TW, color: dimk, onLight: true, anim: 'none', t0: 0 }); y += 52; }
        if (S.title) { const tt = CR.text(doc, S.title, { font: 'mono', size: 36, weight: 700, upper: true, x: X, y, width: TW, color: tone, onLight: true, anim: 'mask_wipe', t0: at(.3) });
          CR.el('div', `position:absolute;left:${X}px;top:${y + tt.el.offsetHeight + 6}px;width:${Math.min(TW, measure(String(S.title).toUpperCase(), 'mono', 36, 700) + 6)}px;height:3px;background:${tone}`, doc); y += tt.el.offsetHeight + 46; }
        const mi = markOf(lines);
        let t = at(.5), mk = null;
        lines.forEach((ln, i) => {
          const tx = CR.text(doc, ln, { font: 'mono', size: 30, x: X, y, width: TW, lh: 1.42, color: tone, onLight: true, anim: 'mask_wipe', blackout: redOf(ln), t0: t, dur: .5 });
          if (i === mi) mk = [y, tx.el.offsetHeight, tx.end];
          y += tx.el.offsetHeight + 14; t += .2;
        });
        if (S.stamp) CR.text(doc, String(S.stamp).toUpperCase(), { font: 'stamp', size: 60, x: fw - 480, y: 54, color: tone, onLight: true, anim: 'none', t0: 0, rot: -6 }).el.style.cssText += ';opacity:.82;transform:rotate(-6deg)';
        const bh = y + 60; box.style.height = bh + 'px';
        const cap = [S.title, S.from, S.date].filter(Boolean).join(', ');
        const top = Math.max(50, (H - bh - (cap ? 90 : 0)) / 2); box.style.top = top + 'px';
        if (mk) {                                            // the editor's red bracket in the margin
          const s = CR.svg(box), x0 = 62, y0 = mk[0] - 6, y1 = mk[0] + mk[1] + 4;
          const p = CR.sv('path', { d: `M${x0 + 18},${y0} L${x0},${y0} L${x0},${y1} L${x0 + 18},${y1}`, fill: 'none', stroke: pal.accent, 'stroke-width': 5, 'stroke-linejoin': 'miter' }, s);
          const Lp = (y1 - y0) + 36; p.style.strokeDasharray = `${Lp} ${Lp}`; const a0 = mk[2] + .1;
          CR.on(tt => { p.style.strokeDashoffset = (Lp * (1 - CR.sseg(tt, a0, a0 + .5))).toFixed(1); });
          CR.beat = a0; CR.focus = [W / 2, top + mk[0] + mk[1] / 2];
        } else CR.focus = [W / 2, H / 2];
        if (cap) {
          CR.rule(CR.L.front, { x: fx, y: top + bh + 22, w: fw, h: 1.5, color: ink, glow: false, t0: at(.4) });
          CR.text(CR.L.front, cap, { font: 'serif', italic: true, size: 28, x: fx, y: top + bh + 36, width: fw, color: ink, onLight: true, anim: 'mask_wipe', t0: at(.6) });
        }
      } },
      transparency: { build() {
        // light_table: an acetate transparency lying on the lit table — a faint cool film with bright cut edges and a
        // soft shadow, the lines printed in dark ink; the line that matters ringed in grease pencil
        const lines = docLines(), tw = 1320, tx0 = (W - tw) / 2, ink = pal.sink;
        const film = CR.el('div', `position:absolute;left:${tx0}px;top:0;width:${tw}px;height:500px;border-radius:6px;` +
          'background:linear-gradient(135deg, rgba(255,255,255,.42) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 70%, rgba(255,255,255,.22) 100%), rgba(200,222,242,.20);' +
          'box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.95), 0 0 0 1px rgba(60,80,100,.22), 12px 16px 26px rgba(40,52,64,.16)', CR.L.mid);
        CR.enter(film, { kind: 'land', t0: 0, rot: -.8, dur: .55 });
        const X = 100, TW = tw - 2 * X;
        let y = 70;
        const hd = [S.from, S.date].filter(Boolean).join('   ·   ');
        if (hd) { CR.text(film, hd, { font: 'mono', size: 24, upper: true, ls: .1, x: X, y, width: TW, color: CR.mix(ink, pal.ground, .45), onLight: true, anim: 'none', t0: 0 }); y += 50; }
        if (S.title) { const tt = CR.text(film, S.title, hero({ font: 'head', size: 56, weight: Math.max(600, CR.FW.head), x: X, y, width: TW, lh: 1.05, color: ink, onLight: true, t0: at(.3), anim: CR.anim.hero === 'tracking_open' ? 'focus_pull' : 'mask_wipe' })); y += tt.el.offsetHeight + 40; }
        const mi = markOf(lines);
        let t = at(.6), mk = null;
        lines.forEach((ln, i) => {
          const tx = CR.text(film, ln, { font: 'body', size: 36, x: X, y, width: TW, lh: 1.34, color: ink, onLight: true, anim: redOf(ln).length ? 'redaction' : 'mask_wipe', redact: redOf(ln), t0: t, dur: .5 });
          if (i === mi) mk = [y, tx.el.offsetHeight, tx.end, Math.min(TW, measure(ln, 'body', 36) + 10)];
          y += tx.el.offsetHeight + 18; t += .26;
        });
        const fh = y + 60, top = (H - fh) / 2; film.style.height = fh + 'px'; film.style.top = top + 'px';
        if (mk) {                                            // grease pencil: a rounded ring drawn round the key line
          const s = CR.svg(film), rx = X - 26, ry = mk[0] - 14, rw = Math.min(TW + 40, mk[3] + 52), rh = mk[1] + 24;
          const r = CR.sv('rect', { x: rx, y: ry, width: rw, height: rh, rx: 22, ry: 22, fill: 'none', stroke: pal.accent, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .88 }, s);
          const Lp = 2 * (rw + rh); r.style.strokeDasharray = `${Lp} ${Lp}`; const a0 = mk[2] + .1;
          CR.on(tt => { r.style.strokeDashoffset = (Lp * (1 - CR.sseg(tt, a0, a0 + .7))).toFixed(1); });
          CR.beat = a0; CR.focus = [tx0 + X + rw / 2, top + mk[0] + mk[1] / 2];
        } else CR.focus = [W / 2, H / 2];
      } },
      microfilm: { build() {
        // blueprint: a microfilm frame in the reader — the dark film sized to its document, the text in negative light;
        // the reader's lit band glides down to the line that matters and settles; that line steps up in size inside the
        // band (nothing else magnified), the other lines dim
        const lines = docLines(), fw = 1240, fx = (W - fw) / 2, X = 76, TW = fw - 2 * X, neg = pal.ink;
        const film = CR.el('div', `position:absolute;left:${fx}px;top:0;width:${fw}px;height:400px;background:${CR.mix(pal.ground, '#000', .45)};border-radius:3px;` +
          `box-shadow:0 20px 50px rgba(0,0,0,.5), 0 0 0 2px ${CR.rgba(pal.ink, .45)}`, CR.L.mid);
        CR.enter(film, { kind: 'fade', t0: 0, dur: .5 });
        const band = CR.el('div', `position:absolute;left:0;right:0;top:0;height:10px;opacity:0;background:${CR.rgba(pal.ink, .08)};border-top:1px solid ${CR.rgba(pal.accent, .7)};border-bottom:1px solid ${CR.rgba(pal.accent, .7)}`, film);
        let y = 58;
        if (S.from || S.date) { CR.text(film, [S.from, S.date].filter(Boolean).join('      '), { font: 'mono', size: 24, upper: true, ls: .08, x: X, y, color: CR.rgba(neg, .6), anim: 'none', t0: 0, glow: false }); y += 50; }
        if (S.title) { const tt = CR.text(film, S.title, { font: 'mono', size: 38, weight: 700, upper: true, x: X, y, width: TW, color: neg, anim: 'mask_wipe', t0: at(.3), glow: false }); y += tt.el.offsetHeight + 34; }
        const mi = markOf(lines), y0 = y, rows = [];
        let t = at(.5);
        lines.forEach((ln, i) => {
          const tx = CR.text(film, ln, { font: 'mono', size: 30, x: X, y, width: Math.round(TW / 1.14), lh: 1.42, color: CR.rgba(neg, .86), anim: 'mask_wipe', blackout: redOf(ln), t0: t, dur: .5, glow: false });
          rows.push([tx, y, tx.el.offsetHeight]); y += tx.el.offsetHeight + 16; t += .22;
        });
        const fh = y + 50, top = (H - fh) / 2; film.style.height = fh + 'px'; film.style.top = top + 'px';
        if (mi >= 0) {
          const [mtx, my, mh] = rows[mi], a0 = Math.max(t, at(1.4)), a1 = Math.min(D - .9, a0 + 1.1), z0 = a1, z1 = Math.min(D - .3, a1 + .7);
          mtx.el.style.transformOrigin = '0 50%';
          mtx.el.style.color = neg;
          CR.on(tt => {
            const p = CR.cruise(seg(tt, a0, a1)), q = CR.sseg(tt, z0, z1), by = lerp(y0 - 12, my - 12, p);
            band.style.top = by.toFixed(1) + 'px'; band.style.height = (lerp(rows[0][2], mh, p) + 24).toFixed(1) + 'px';
            band.style.opacity = CR.sseg(tt, a0 - .3, a0 + .1).toFixed(3);
            mtx.el.style.transform = `scale(${(1 + .12 * q).toFixed(4)})`;
            rows.forEach(([r], k) => { if (k !== mi) r.el.style.opacity = (1 - .5 * q).toFixed(3); });
          });
          CR.beat = z0; CR.focus = [fx + X + TW / 2, top + my + mh / 2];
        } else CR.focus = [W / 2, H / 2];
      } },
    },
  });

  // ══ EVIDENCE BOARD ═════════════════════════════════════════════════════════════════════════════════════════════
  const boardItems = () => (Array.isArray(S.items) ? S.items : []).filter(it => it && (it.label || it.name)).slice(0, 6);
  const boardLinks = (n) => { const l = Array.isArray(S.links) ? S.links.filter(p => Array.isArray(p) && p.length === 2 && p[0] < n && p[1] < n && p[0] !== p[1]) : [];
    if (l.length) return l; const out = []; for (let i = 1; i < n; i++) out.push([0, i]); return out; };
  const SPOTS = { 2: [[.3, .52], [.7, .5]], 3: [[.22, .55], [.5, .4], [.78, .58]], 4: [[.2, .38], [.47, .66], [.72, .36], [.84, .7]],
                  5: [[.17, .4], [.4, .68], [.52, .34], [.72, .64], [.86, .36]], 6: [[.15, .38], [.33, .7], [.48, .36], [.62, .7], [.78, .38], [.88, .72]] };
  // where a segment from a box centre leaves the box (half sizes hw, hh)
  const edgeOf = (A, B, hw, hh) => { const dx = B[0] - A[0], dy = B[1] - A[1], k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy))); return [A[0] + dx * k, A[1] + dy * k]; };
  CR.scene('evidence_board', {
    s: 7.0,
    layout: { void_black: 'constellation', navy_falloff: 'constellation', charcoal_light: 'network', glass_dark: 'network', paper_desk: 'cork', newsprint: 'schematic',
              blueprint: 'schematic', concrete: 'cork', light_table: 'schematic', footage_sharp: 'constellation', footage_moving: 'constellation' },
    comps: {
      cork: { build() {
        // paper_desk / concrete: prints and typed cards taped down, joined by red string that sags a little
        const its = boardItems(), n = Math.max(2, its.length), sp = SPOTS[Math.min(6, n)] || SPOTS[4], w = CR.W;
        const pts = [];
        if (S.title) { const c = CR.sheet(CR.L.mid, { x: M - 20, y: 60, w: 620, h: 130, pad: 0, seed: 141, age: .3 }); CR.enter(c.el, { kind: 'land', t0: 0, rot: -1.5, dur: .45 });
          CR.text(c.el, S.title, { font: 'mono', size: 46, weight: 700, upper: true, x: 36, y: 38, width: 560, color: pal.sink, onLight: true, anim: 'typewriter', t0: at(.3), cps: 30 });
          CR.tape(c.el, 310, 0, 140, 4); }
        // fix round 2: with a title card the items sit lower (the card touched the first print) and the string runs
        // UNDER the prints and cards (it crossed the faces in a print); kept clear of the bottom title-safe edge
        const yOff = S.title ? 56 : 0;
        its.forEach((it, i) => {
          const [fx, fy] = sp[i] || [.5, .5], pw = 300, ph = 340, x = fx * W - pw / 2, y = Math.min(H - 100 - ph, fy * H - ph / 2 - 40 + yOff), rot = (CR.hash(i, 151) - .5) * 7;
          const t0 = at(.25 + i * .22);
          let el;
          if (it.photo) el = CR.photo(CR.L.mid, it.photo, { x, y, w: pw, h: ph, frame: 'print', treat: w === 'concrete' ? 'bleach' : 'print', seed: 160 + i, focus: [.5, .3] }).el;
          else { const c = CR.sheet(CR.L.mid, { x: x - 20, y: y + 60, w: pw + 40, h: 220, pad: 0, ruled: 40, seed: 170 + i, age: .3 }); el = c.el;
            CR.text(c.el, it.label || it.name, { font: 'mono', size: 36, weight: 700, x: 26, y: 46, width: pw - 10, color: pal.sink, onLight: true, anim: 'none', t0: 0 }); }
          CR.enter(el, { kind: 'land', t0, rot, dur: .4 });
          const bx = parseFloat(el.style.left), by = parseFloat(el.style.top), bw = el.offsetWidth;
          CR.tape(el, bw / 2, 4, 120, (CR.hash(i, 153) - .5) * 10);
          if (it.photo || it.sub) CR.text(CR.L.front, [it.photo ? (it.label || it.name) : '', it.sub].filter(Boolean).join(' — '), { font: 'mono', size: 26, weight: 600,
            x: bx - 30, y: by + el.offsetHeight + 16, width: bw + 60, align: 'center', color: pal.ink, onLight: false, glow: false, anim: 'mask_wipe', t0: t0 + .5, shadow: '0 2px 4px rgba(0,0,0,.6)' });
          pts.push([bx + bw / 2, by + 14]);
        });
        const s = CR.svg(CR.L.mid), links = boardLinks(pts.length);
        CR.L.mid.insertBefore(s, CR.L.mid.firstChild);
        const tl = at(.3 + its.length * .22 + .2);
        links.forEach(([a, b], k) => { if (pts[a] && pts[b]) CR.string(s, pts[a], pts[b], { t0: tl + k * .28, dur: .6, color: CR.mix(pal.accent, '#000', .1), width: 4.5, sag: .03 }); });
        CR.focus = [W / 2, H / 2];
      } },
      constellation: { build() {
        // dark worlds: people as round photographs, everything else as typographic nodes (a point of light, its name
        // and a line under it — never an empty circle with an initial); links drawn as glowing lines with a comet head
        if (CR.foot) { CR.footLook(12, .3, .5); }
        const its = boardItems(), n = Math.max(2, its.length), sp = SPOTS[Math.min(6, n)] || SPOTS[4];
        if (S.title) { CR.label(CR.L.front, S.title, { x: M, y: 90, size: 30, ls: .3, t0: at(.1), color: pal.accent }); CR.rule(CR.L.front, { x: M, y: 136, w: 60, h: 2, color: pal.accent, t0: at(.2) }); }
        const pts = [], R = its.length > 4 ? 112 : 132;
        const s = CR.svg(CR.L.back);
        its.forEach((it, i) => {
          const [fx, fy] = sp[i] || [.5, .5], cx = fx * W, cy = fy * H - 20, t0 = at(.3 + i * .2);
          let r = 22, ly = cy + 34;
          if (it.photo) {
            const node = CR.el('div', `position:absolute;left:${cx - R}px;top:${cy - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;overflow:hidden;` +
              `background:${CR.mix(pal.ground, '#FFFFFF', .06)};box-shadow:0 0 0 2px ${CR.rgba(pal.ink, .55)}, 0 20px 50px rgba(0,0,0,.6)`, CR.L.mid);
            CR.photo(node, it.photo, { x: 0, y: 0, w: 2 * R, h: 2 * R, treat: 'mono', focus: [.5, .3] });
            node.style.filter = CR.glowFilter(pal.glow, 40) || 'none';
            CR.enter(node, { kind: 'fade', t0, dur: .7 });
            r = R + 8; ly = cy + R + 24;
          } else {
            const dot = CR.el('div', `position:absolute;left:${cx - 8}px;top:${cy - 8}px;width:16px;height:16px;border-radius:50%;background:${CR.mix(pal.accent, '#FFFFFF', .25)};box-shadow:0 0 0 6px ${CR.rgba(pal.accent, .14)}`, CR.L.mid);
            dot.style.filter = CR.glowFilter(pal.accent, 34) || 'none';
            CR.enter(dot, { kind: 'fade', t0, dur: .5 });
          }
          CR.text(CR.L.front, it.label || it.name, { font: it.photo ? 'cond' : 'head', size: it.photo ? 36 : 44, upper: !!it.photo, ls: it.photo ? .12 : 0, x: cx - 260, y: ly, width: 520, align: 'center', color: pal.ink, anim: 'mask_wipe', t0: t0 + .3 });
          if (it.sub) CR.text(CR.L.front, it.sub, { font: 'mono', size: 25, x: cx - 260, y: ly + (it.photo ? 48 : 62), width: 520, align: 'center', color: pal.dim, anim: 'mask_wipe', t0: t0 + .45 });
          pts.push([cx, cy, r]);
        });
        const tl = at(.4 + its.length * .2);
        boardLinks(pts.length).forEach(([a, b], k) => {
          const A = pts[a], B = pts[b]; if (!A || !B) return;
          const d = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / d, uy = (B[1] - A[1]) / d;
          CR.string(s, [A[0] + ux * A[2], A[1] + uy * A[2]], [B[0] - ux * B[2], B[1] - uy * B[2]], { t0: tl + k * .3, dur: .7, color: pal.accent, width: 2, sag: 0, shadow: false, glow: true, comet: true });
        });
        CR.focus = [W / 2, H / 2];
      } },
      network: { build() {
        // charcoal / glass: people and organisations as cards — a photograph card (a white-bordered print on charcoal,
        // a rounded glass card on glass) or a typographic card — joined by straight hairlines with end dots; a point of
        // light runs along each link once as it draws
        const its = boardItems(), n = Math.max(2, its.length), sp = SPOTS[Math.min(6, n)] || SPOTS[4], glass = CR.W === 'glass_dark';
        if (S.title) { CR.label(CR.L.front, S.title, { x: M, y: 86, size: 30, ls: .3, t0: at(.1), color: glass ? pal.accent2 : pal.accent }); CR.rule(CR.L.front, { x: M, y: 132, w: 60, h: 2, color: glass ? pal.accent2 : pal.accent, t0: at(.2) }); }
        const boxes = [], s = CR.svg(CR.L.back);
        its.forEach((it, i) => {
          const [fx, fy] = sp[i] || [.5, .5], cx = fx * W, cy = fy * H + 10, t0 = at(.3 + i * .2), lab = it.label || it.name;
          const bw = it.photo ? 250 : 320, ph = it.photo ? 250 : 0, bh = ph + (it.sub ? 128 : 92);
          const x = cx - bw / 2, y = cy - bh / 2;
          const card = glass ? CR.glass(CR.L.mid, { x, y, w: bw, h: bh, r: 20 }).el
            : CR.el('div', `position:absolute;left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;background:${CR.mix(pal.ground, '#FFFFFF', .05)};box-shadow:0 0 0 1px ${CR.rgba(pal.ink, .2)}, 0 24px 50px rgba(0,0,0,.55)`, CR.L.mid);
          CR.enter(card, { kind: 'rise', t0, dur: .7 });
          if (it.photo) CR.photo(card, it.photo, { x: glass ? 12 : 0, y: glass ? 12 : 0, w: glass ? bw - 24 : bw, h: glass ? ph - 12 : ph, frame: glass ? 'card' : 'none', treat: glass ? 'clean' : 'mono', focus: [.5, .3] });
          const lz = Math.min(30, fitSize(String(lab).toUpperCase(), 'cond', bw - 40, 30, 18, .1)), sz = Math.min(21, fitSize(String(it.sub || ''), 'mono', bw - 40, 21, 14));
          CR.text(card, lab, { font: 'cond', size: lz, weight: 600, upper: true, ls: .1, x: 20, y: ph + 22 + (30 - lz) / 2, width: bw - 40, nowrap: true, color: pal.ink, anim: 'none', t0: 0, glow: false });
          if (it.sub) CR.text(card, it.sub, { font: 'mono', size: sz, x: 20, y: ph + 66, width: bw - 40, nowrap: true, color: pal.dim, anim: 'none', t0: 0, glow: false });
          boxes.push([cx, cy, bw / 2, bh / 2]);
        });
        const tl = at(.45 + its.length * .2), col = glass ? pal.accent : CR.mix(pal.accent, pal.ink, .25);
        boardLinks(boxes.length).forEach(([a, b], k) => {
          const A = boxes[a], B = boxes[b]; if (!A || !B) return;
          const p0 = edgeOf(A, B, A[2] + 6, A[3] + 6), p1 = edgeOf(B, A, B[2] + 6, B[3] + 6);
          CR.string(s, p0, p1, { t0: tl + k * .3, dur: .7, color: col, width: 1.8, sag: 0, shadow: false, glow: glass, comet: true });
          for (const pp of [p0, p1]) { const dt = CR.sv('circle', { cx: pp[0], cy: pp[1], r: 4.5, fill: col, opacity: 0 }, s); const a0 = tl + k * .3 + (pp === p0 ? 0 : .7); CR.on(t => { dt.setAttribute('opacity', CR.sseg(t, a0 - .05, a0 + .15).toFixed(3)); }); }
        });
        CR.focus = [W / 2, H / 2];
      } },
      schematic: { build() {
        const its = boardItems(), n = Math.max(2, its.length), sp = SPOTS[Math.min(6, n)] || SPOTS[4];
        const lt = CR.W === 'light_table', ink = CR.light ? pal.sink : pal.ink, onL = CR.light;
        if (S.title) { CR.text(CR.L.front, S.title, { font: 'cond', size: 40, upper: true, ls: .2, x: M, y: 80, color: ink, onLight: onL, anim: 'mask_wipe', t0: at(.1) }); CR.rule(CR.L.front, { x: M, y: 136, w: W - 2 * M, h: 2, color: ink, glow: false, t0: at(.15) }); }
        const bw = 330, bh = 150, boxes = [];
        const s = CR.svg(CR.L.back);
        its.forEach((it, i) => {
          const [fx, fy] = sp[i] || [.5, .5], cx = fx * W, cy = fy * H + 30, t0 = at(.3 + i * .18);
          const b = CR.el('div', `position:absolute;left:${cx - bw / 2}px;top:${cy - bh / 2}px;width:${bw}px;height:${bh}px;border:2px solid ${ink};background:${lt ? CR.rgba('#FFFFFF', .55) : CR.light ? CR.rgba(pal.paper, .6) : CR.rgba(pal.ground, .55)}`, CR.L.mid);
          CR.enter(b, { kind: 'fade', t0, dur: .5 });
          let tx = 18;
          if (it.photo) { CR.photo(b, it.photo, { x: 10, y: 10, w: bh - 20, h: bh - 20, treat: CR.W === 'blueprint' ? 'cyan' : 'mono', focus: [.5, .3] }); tx = bh + 4; }
          CR.text(b, it.label || it.name, { font: 'cond', size: 32, weight: 600, upper: true, ls: .06, x: tx, y: 24, width: bw - tx - 14, lh: 1, color: ink, onLight: onL, anim: 'none', t0: 0, glow: false });
          if (it.sub) CR.text(b, it.sub, { font: 'mono', size: 20, x: tx, y: bh - 50, width: bw - tx - 14, color: onL ? CR.mix(ink, pal.ground, .4) : pal.dim, onLight: onL, anim: 'none', t0: 0, glow: false });
          boxes.push([cx, cy]);
        });
        const tl = at(.4 + its.length * .18);
        boardLinks(boxes.length).forEach(([a, b], k) => {
          const A = boxes[a], B = boxes[b]; if (!A || !B) return;
          const midx = (A[0] + B[0]) / 2;
          const d = `M${A[0]},${A[1]} L${midx},${A[1]} L${midx},${B[1]} L${B[0]},${B[1]}`;
          const p = CR.sv('path', { d, fill: 'none', stroke: lt ? pal.accent : ink, 'stroke-width': lt ? 5 : 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .9 }, s);
          const Lp = p.getTotalLength(); p.style.strokeDasharray = `${Lp} ${Lp}`;
          const dot = CR.sv('circle', { cx: midx, cy: A[1], r: 6, fill: lt ? pal.accent : ink, opacity: 0 }, s);
          const a0 = tl + k * .25; CR.on(t => { const q = CR.sseg(t, a0, a0 + .6); p.style.strokeDashoffset = (Lp * (1 - q)).toFixed(1); dot.setAttribute('opacity', q > .3 ? .9 : 0); });
        });
        CR.focus = [W / 2, H / 2];
      } },
    },
  });

  // ══ LIST ═══════════════════════════════════════════════════════════════════════════════════════════════════════
  const listItems = () => (Array.isArray(S.items) ? S.items : []).map(x => typeof x === 'object' && x ? String(x.text || x.label || x.name || '') : String(x)).filter(s => s.trim()).slice(0, 6);
  const struck = (i, s) => { const st = Array.isArray(S.strike) ? S.strike : []; return st.some(v => v === i || String(v).toLowerCase() === s.toLowerCase()); };
  const marked = (i, s) => S.mark != null && (S.mark === i || String(S.mark) === String(i) || String(S.mark).toLowerCase() === s.toLowerCase());
  CR.scene('list', {
    s: 5.6,
    layout: { void_black: 'index', navy_falloff: 'roll', charcoal_light: 'index', glass_dark: 'spec_table', paper_desk: 'ledger', newsprint: 'sidebar',
              blueprint: 'spec_table', concrete: 'ledger', light_table: 'spec_table', footage_sharp: 'roll', footage_moving: 'index' },
    comps: {
      ledger: { build() {
        const its = listItems(), w = CR.W;
        const sw = 1260, sh = Math.min(960, 280 + its.length * 110), sx = (W - sw) / 2, sy = (H - sh) / 2;
        const sheet = CR.sheet(CR.L.mid, { x: sx, y: sy, w: sw, h: sh, pad: 0, seed: 181, age: .5 }); CR.enter(sheet.el, { kind: 'land', t0: 0, rot: -.9, dur: .5 });
        if (w === 'concrete') { CR.tape(sheet.el, 60, 10, 160, -16); CR.tape(sheet.el, sw - 60, 10, 160, 14); }
        const host = sheet.el, X = 110, ink = pal.sink;
        let y = 80;
        if (S.title) { const tt = CR.text(host, S.title, { font: 'mono', size: 44, weight: 700, upper: true, x: X, y, width: sw - 220, color: ink, onLight: true, anim: 'typewriter', t0: at(.4), cps: 30 });
          CR.el('div', `position:absolute;left:${X}px;top:${y + tt.el.offsetHeight + 10}px;width:${sw - 220}px;height:3px;background:${ink}`, host); y += tt.el.offsetHeight + 56; }
        let t = at(.9);
        its.forEach((s, i) => {
          const tx = CR.text(host, `${String(i + 1).padStart(2, '0')}   ${s}`, { font: 'mono', size: 38, x: X, y, width: sw - 220, color: ink, onLight: true, anim: 'typewriter', t0: t, cps: 36 });
          const hh = tx.el.offsetHeight;
          if (struck(i, s)) { const ln = CR.el('div', `position:absolute;left:${X + 110}px;top:${y + hh * .52}px;width:${Math.min(sw - 330, measure(s, 'mono', 38) + 10)}px;height:4px;background:${pal.accent};transform-origin:0 50%`, host);
            const a0 = tx.end + .1; CR.on(tt => { ln.style.transform = `scaleX(${CR.sseg(tt, a0, a0 + .35).toFixed(4)})`; }); }
          if (marked(i, s)) {
            const sv = CR.svg(host); const ew = Math.min(sw - 200, measure(s, 'mono', 38) + 170), cx = X + ew / 2 - 20, cy = y + hh / 2;
            const e = CR.sv('ellipse', { cx, cy, rx: ew / 2 + 20, ry: hh * .75, fill: 'none', stroke: pal.accent, 'stroke-width': 5, opacity: .9 }, sv);
            const Le = Math.PI * (ew + hh * 1.5); e.style.strokeDasharray = `${Le} ${Le}`; const a0 = tx.end + .15; CR.on(tt => { e.style.strokeDashoffset = (Le * (1 - CR.sseg(tt, a0, a0 + .6))).toFixed(1); }); }
          y += hh + 30; t = tx.end + .18;
        });
        CR.focus = [W / 2, H / 2];
      } },
      index: { build() {
        if (CR.foot) CR.footLook(8, .34, .6);
        const its = listItems(), L = CR.L.front;
        const rowH = Math.min(150, 760 / Math.max(1, its.length)), size = Math.round(Math.min(68, rowH * .48));
        const top = (H - rowH * its.length) / 2 + (S.title ? 40 : 0);
        if (S.title) CR.label(L, S.title, { x: M, y: top - 92, size: 28, ls: .3, t0: at(.1), color: pal.accent });
        its.forEach((s, i) => {
          const y = top + i * rowH, t0 = at(.3 + i * .22);
          CR.rule(L, { x: M, y, w: W - 2 * M, h: 1, color: CR.rgba(pal.ink, .22), glow: false, t0: t0 - .1, dur: .6 });
          CR.text(L, String(i + 1).padStart(2, '0'), { font: 'display', size: Math.round(size * 1.3), x: M, y: y + (rowH - size * 1.3) / 2, color: 'transparent', anim: 'mask_wipe', t0, glow: false }).el.style.webkitTextStroke = `1.6px ${CR.rgba(pal.ink, .5)}`;
          const tx = CR.text(L, s, hero({ font: 'head', size, x: M + 260, y: y + (rowH - size * 1.1) / 2, width: W - 2 * M - 260, nowrap: true, t0: t0 + .05, anim: ['typewriter', 'stamp', 'tracking_open'].includes(CR.anim.hero) ? 'mask_wipe' : CR.anim.hero,
            color: struck(i, s) ? CR.mix(pal.ink, pal.ground, .5) : pal.ink }));
          if (struck(i, s)) { const ln = CR.el('div', `position:absolute;left:${M + 256}px;top:${y + rowH / 2}px;width:${Math.min(W - 2 * M - 260, measure(s, 'head', size) + 10)}px;height:4px;background:${pal.accent};transform-origin:0 50%`, L);
            const a0 = tx.end + .1; CR.on(tt => { ln.style.transform = `scaleX(${CR.sseg(tt, a0, a0 + .35).toFixed(4)})`; }); }
        });
        CR.rule(L, { x: M, y: top + its.length * rowH, w: W - 2 * M, h: 1, color: CR.rgba(pal.ink, .22), glow: false, t0: at(.3 + its.length * .22), dur: .6 });
        CR.focus = [W / 2, H / 2];
      } },
      roll: { build() {
        // navy / footage: the items roll up past a fixed reading line (cruise); the item on the line is full white with
        // its number in the accent, the others recede — the roll comes to rest on the item that matters (mark) or the last
        if (CR.foot) CR.footLook(8, .3, .55);
        const its = listItems(), L = CR.L.front, n = its.length;
        if (!n) return;
        const rowH = 136, ly = H / 2 + (S.title ? 34 : 0), X = M + 250;
        const size = Math.min(72, Math.min(...its.map(s => fitSize(s, 'head', W - X - M, 72, 40))));
        if (S.title) { CR.label(L, S.title, { x: M, y: 132, size: 28, ls: .3, t0: at(.1), color: pal.accent }); CR.rule(L, { x: M, y: 176, w: 60, h: 2, color: pal.accent, t0: at(.2) }); }
        CR.rule(L, { x: M, y: ly, w: 110, h: 2, color: pal.accent, t0: at(.2), dur: .6 });
        CR.rule(L, { x: X - 30, y: ly, w: W - X - M + 30, h: 1, color: CR.rgba(pal.ink, .14), glow: false, t0: at(.25), dur: .9 });
        const host = CR.el('div', 'position:absolute;inset:0;-webkit-mask-image:linear-gradient(180deg, rgba(0,0,0,0) 20%, #000 38%, #000 68%, rgba(0,0,0,0) 90%)', L);
        const col = CR.el('div', 'position:absolute;inset:0', host);
        const rows = its.map((s, i) => {
          const nm = CR.text(col, String(i + 1).padStart(2, '0'), { font: 'mono', size: 30, x: M + 130, y: ly + i * rowH - 20 - size * .5, color: pal.accent, anim: 'none', t0: 0, glow: false });
          const tx = CR.text(col, s, { font: 'head', size, x: X, y: ly + i * rowH - size * 1.08, nowrap: true, color: pal.ink, anim: 'none', t0: 0 });
          if (struck(i, s)) CR.el('div', `position:absolute;left:${X - 4}px;top:${ly + i * rowH - size * .5}px;width:${measure(s, 'head', size) + 8}px;height:4px;background:${pal.accent}`, col);
          return [nm.el, tx.el];
        });
        let k = its.findIndex((s, i) => marked(i, s)); if (k < 0) k = n - 1;
        const a0 = at(.35), a1 = Math.min(D - .7, a0 + 1.2 + k * .55);
        CR.on((tq, tt) => { const t = tt == null ? tq : tt, cur = lerp(-.7, k, CR.cruise(seg(t, a0, a1)));
          col.style.transform = `translate(0,${(-cur * rowH).toFixed(2)}px)`; col.style.opacity = CR.sseg(t, a0 - .3, a0 + .2).toFixed(3);
          rows.forEach(([a, b], i) => { const d = Math.abs(i - cur), o = (1 - Math.min(.74, d * .6)).toFixed(3); a.style.opacity = o; b.style.opacity = o; }); });
        CR.beat = a1;
        CR.focus = [W / 2, ly];
      } },
      sidebar: { build() {
        // newsprint: a sidebar box set into the page — a black heading bar with the title in white capitals, the items as
        // entries with square red bullets and hairlines between them; struck items crossed out, the one that matters in red
        const its = listItems(), ink = pal.sink, bw = 1180, bx = (W - bw) / 2, L = CR.L.mid;
        const box = CR.el('div', `position:absolute;left:${bx}px;top:0;width:${bw}px;height:400px;background:${CR.mix(pal.ground, ink, .07)};border-top:7px solid ${ink}`, L);
        CR.enter(box, { kind: 'rise', t0: 0, dur: .6 });
        let y = 0;
        if (S.title) { const bar = CR.el('div', `position:absolute;left:0;right:0;top:0;height:86px;background:${ink}`, box);
          CR.text(bar, S.title, { font: 'cond', size: 40, weight: 600, upper: true, ls: .16, x: 52, y: 20, width: bw - 104, nowrap: true, color: pal.ground, onLight: false, glow: false, anim: 'mask_wipe', t0: at(.25) }); y = 86; }
        y += 34;
        const size = Math.min(46, Math.min(...its.map(s => fitSize(s, 'serif', bw - 190, 46, 32))));
        let t = at(.5);
        its.forEach((s, i) => {
          const m = marked(i, s), col = m ? pal.accent : ink;
          const sq = CR.el('div', `position:absolute;left:52px;top:${y + size * .42}px;width:16px;height:16px;background:${pal.accent}`, box);
          CR.enter(sq, { kind: 'fade', t0: t, dur: .3 });
          const tx = CR.text(box, s, { font: 'serif', size, weight: m ? 700 : 500, x: 96, y, width: bw - 150, lh: 1.2, color: col, onLight: true, anim: 'mask_wipe', t0: t, dur: .5 });
          const hh = tx.el.offsetHeight;
          if (struck(i, s)) { const ln = CR.el('div', `position:absolute;left:92px;top:${y + hh * .55}px;width:${Math.min(bw - 150, measure(s, 'serif', size) + 10)}px;height:3px;background:${pal.accent};transform-origin:0 50%`, box);
            const a0 = tx.end + .1; CR.on(tt => { ln.style.transform = `scaleX(${CR.sseg(tt, a0, a0 + .35).toFixed(4)})`; }); }
          y += hh + 22;
          if (i < its.length - 1) CR.el('div', `position:absolute;left:52px;right:52px;top:${y - 11}px;height:1px;background:${CR.rgba(ink, .28)}`, box);
          t += .24;
        });
        const bh = y + 20; box.style.height = bh + 'px'; box.style.top = ((H - bh) / 2) + 'px';
        CR.focus = [W / 2, H / 2];
      } },
      spec_table: { build() {
        const its = listItems(), lt = CR.W === 'light_table';
        const tw = 1360, tx0 = (W - tw) / 2, onL = CR.light;
        const host = CR.L.front, ink = onL ? pal.sink : pal.ink;
        if (CR.W === 'glass_dark') { const pn = CR.glass(CR.L.mid, { x: tx0 - 70, y: 150, w: tw + 140, h: 800, r: 26 }); CR.enter(pn.el, { kind: 'rise', t0: 0, dur: .7 }); }
        if (lt) { const card = CR.el('div', `position:absolute;left:${tx0 - 70}px;top:140px;width:${tw + 140}px;height:820px;background:${CR.rgba('#FFFFFF', .7)};box-shadow:0 14px 30px rgba(0,0,0,.18)`, CR.L.mid); CR.enter(card, { kind: 'rise', t0: 0, dur: .6 }); }
        const rowH = Math.min(110, 560 / Math.max(1, its.length));
        let y = 220;
        if (S.title) { CR.text(host, S.title, { font: 'cond', size: 44, upper: true, ls: .18, x: tx0, y, color: ink, onLight: onL, anim: 'mask_wipe', t0: at(.2) }); y += 80;
          CR.rule(host, { x: tx0, y, w: tw, h: 3, color: CR.W === 'blueprint' ? pal.ink : pal.accent, t0: at(.3) }); y += 30; }
        its.forEach((s, i) => {
          const parts = s.split(/\s*[:—–]\s+|\s+[-—–]\s+/); const k = parts[0], v = parts.slice(1).join(' — ');
          const t0 = at(.5 + i * .2), yy = y + i * rowH;
          CR.text(host, k, { font: 'body', size: 40, weight: 600, x: tx0, y: yy + (rowH - 48) / 2, width: tw * .58, nowrap: true, color: ink, onLight: onL, anim: 'mask_wipe', t0 });
          if (v) CR.text(host, v, { font: 'mono', size: 36, x: tx0 + tw * .55, y: yy + (rowH - 44) / 2, width: tw * .45, align: 'right', nowrap: true, color: pal.accent, onLight: onL, anim: CR.W === 'blueprint' ? 'typewriter' : 'mask_wipe', t0: t0 + .2 });
          const dots = CR.el('div', `position:absolute;left:${tx0}px;top:${yy + rowH - 2}px;width:${tw}px;height:2px;background-image:radial-gradient(circle, ${CR.rgba(ink, .4)} 1px, rgba(0,0,0,0) 1.5px);background-size:10px 2px;transform-origin:0 50%`, host);
          CR.on(tt => { dots.style.transform = `scaleX(${CR.sseg(tt, t0 - .1, t0 + .5).toFixed(4)})`; });
        });
        CR.focus = [W / 2, H / 2];
      } },
    },
  });
})();

// the kit contract (kits.PAGE): build() lays the scene out once, frame(t) moves it (a promise while a clip seeks)
function build() { CR.run(); }
function frame(t) { return CR.frame(t); }
