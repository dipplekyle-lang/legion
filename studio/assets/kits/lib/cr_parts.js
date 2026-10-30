// CREATIVE kit — PARTS: the physical things scenes are built from. Real photographs with a world treatment and frame,
// paper sheets / index cards / glass panels with procedural surfaces, rules that draw, pins, red string with sag,
// tape, a paper clip, a reticle, and entrances (objects land / rise / fade — smoothstep, no bounce, no shake).
(function () {
  const pal = CR.pal;
  // ── entrances: one updater per element; stepped_12 quantises them through CR.tq like every graphic layer ───────
  CR.enter = (el, o = {}) => {
    const kind = o.kind || 'fade', t0 = o.t0 || 0, d = o.dur || (kind === 'land' ? .55 : .7), rot = o.rot || 0;
    const base = o.base || '';
    const upd = t => {
      const p = CR.sseg(t, t0, t0 + d);
      let tr = '';
      if (kind === 'land') tr = `translate(${(o.dx || 0) * (1 - p)}px,${((o.dy == null ? -36 : o.dy) * (1 - p)).toFixed(2)}px) scale(${(1 + .045 * (1 - p)).toFixed(4)}) rotate(${(rot + (o.drot || 1.6) * (1 - p)).toFixed(3)}deg)`;
      else if (kind === 'rise') tr = `translate(0,${(46 * (1 - p)).toFixed(2)}px) rotate(${rot}deg)`;
      else if (kind === 'slide') tr = `translate(${((o.dx || -80) * (1 - p)).toFixed(2)}px,0) rotate(${rot}deg)`;
      else tr = `scale(${(1.02 - .02 * p).toFixed(4)}) rotate(${rot}deg)`;
      el.style.transform = base + tr;
      el.style.opacity = (kind === 'land' ? clamp(p * 4) : p).toFixed(3);
      if (o.shadow && kind === 'land') el.style.boxShadow = o.shadow(p);
    };
    CR.on(upd); upd(-1);
    return { end: t0 + d };
  };
  CR.defaultEnter = () => (['sheet', 'card', 'notice', 'print'].includes(CR.wd.surface) && !CR.foot) ? 'land' : CR.light ? 'rise' : 'fade';

  // ── procedural paper (zimnawojna paperTex lineage): base, fibre, age clouds, foxing, darker edges ───────────────
  const paperCache = {};
  CR.paperURL = (w, h, col, seed = 3, age = .5, ruled = 0) => {
    const key = [w, h, col, seed, age, ruled].join('|'); if (paperCache[key]) return paperCache[key];
    const sc = .5, cw = Math.max(8, Math.round(w * sc)), ch = Math.max(8, Math.round(h * sc));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    x.fillStyle = col; x.fillRect(0, 0, cw, ch);
    x.globalCompositeOperation = 'multiply';
    x.drawImage(CR.noise(cw, ch, 10, seed, .10 * age + .04), 0, 0); x.drawImage(CR.noise(cw, ch, 60, seed + 1, .08), 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.drawImage(CR.grainCanvas(cw, ch, .10, seed + 2, '#5A4A34'), 0, 0);
    for (let i = 0; i < Math.round(14 * age); i++) { const px = CR.hash(i, seed + 4) * cw, py = CR.hash(i, seed + 5) * ch, r = 1 + CR.hash(i, seed + 6) * 5;
      const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, CR.rgba('#8A5A2A', .16 * age)); g.addColorStop(1, CR.rgba('#8A5A2A', 0)); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
    if (ruled) { x.strokeStyle = CR.rgba('#5B86B8', .35); x.lineWidth = 1; for (let yy = ruled * sc * 1.6; yy < ch - 4; yy += ruled * sc) { x.beginPath(); x.moveTo(0, yy + .5); x.lineTo(cw, yy + .5); x.stroke(); }
      x.strokeStyle = CR.rgba('#C0413A', .45); x.beginPath(); x.moveTo(0, ruled * sc * .9); x.lineTo(cw, ruled * sc * .9); x.stroke(); }
    const e = x.createLinearGradient(0, 0, cw, 0); e.addColorStop(0, CR.rgba('#6B5030', .10 * age + .04)); e.addColorStop(.06, 'rgba(0,0,0,0)'); e.addColorStop(.94, 'rgba(0,0,0,0)'); e.addColorStop(1, CR.rgba('#6B5030', .10 * age + .04));
    x.fillStyle = e; x.fillRect(0, 0, cw, ch);
    const f = x.createLinearGradient(0, 0, 0, ch); f.addColorStop(0, CR.rgba('#6B5030', .08 * age + .03)); f.addColorStop(.08, 'rgba(0,0,0,0)'); f.addColorStop(.92, 'rgba(0,0,0,0)'); f.addColorStop(1, CR.rgba('#6B5030', .1 * age + .04));
    x.fillStyle = f; x.fillRect(0, 0, cw, ch);
    return (paperCache[key] = c.toDataURL('image/jpeg', .9));
  };
  CR.sheet = (parent, o = {}) => {
    const w = o.w || 900, h = o.h || 1100, col = o.color || pal.paper;
    const el = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;background:${col} url(${CR.paperURL(w, h, col, o.seed || 3, o.age == null ? .5 : o.age, o.ruled || 0)}) center/100% 100%;` +
      `box-shadow:0 ${(h * .012).toFixed(0)}px ${(h * .03).toFixed(0)}px rgba(0,0,0,.42), 0 ${(h * .002).toFixed(0)}px 2px rgba(0,0,0,.3);transform-origin:50% 50%`, parent);
    const inner = CR.el('div', `position:absolute;inset:${o.pad == null ? 70 : o.pad}px;color:${pal.sink}`, el);
    return { el, inner, w, h };
  };
  // a frosted glass CARD (glass_dark): rounded, a bright top edge, a faint inner light, a deep soft shadow
  CR.glass = (parent, o = {}) => {
    const w = o.w || 800, h = o.h || 500, r = o.r == null ? 22 : o.r;
    const el = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;border-radius:${r}px;overflow:hidden;` +
      `background:linear-gradient(165deg, ${CR.rgba(CR.mix(pal.ground, '#B9C8DC', .16), .78)} 0%, ${CR.rgba(CR.mix(pal.ground, '#8EA2BC', .07), .74)} 46%, ${CR.rgba(CR.mix(pal.ground, '#000000', .25), .82)} 100%);` +
      `box-shadow:inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(255,255,255,.07), inset 0 -40px 80px rgba(0,0,0,.25), 0 50px 110px rgba(0,0,0,.62), 0 10px 26px rgba(0,0,0,.4)`, parent);
    // a soft sheen across the top-left of the glass
    CR.el('div', `position:absolute;left:-10%;top:-60%;width:80%;height:120%;transform:rotate(-18deg);background:radial-gradient(ellipse at 50% 60%, rgba(255,255,255,.07), rgba(255,255,255,0) 62%);pointer-events:none`, el);
    return { el, w, h };
  };
  // glass panel (dark worlds): thin highlight edge, deep soft shadow, frosted fill
  CR.panel = (parent, o = {}) => {
    const w = o.w || 800, h = o.h || 500;
    const el = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;border-radius:${o.r == null ? 14 : o.r}px;` +
      `background:linear-gradient(160deg, ${CR.rgba(CR.mix(pal.ground, '#FFFFFF', .10), .82)}, ${CR.rgba(CR.mix(pal.ground, '#000000', .2), .86)});` +
      `box-shadow:inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(255,255,255,.06), 0 40px 90px rgba(0,0,0,.55)`, parent);
    return { el, w, h };
  };
  CR.rule = (parent, o = {}) => {
    const el = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${o.w || 200}px;height:${o.h || 2}px;background:${o.color || pal.accent};transform-origin:${o.from === 'center' ? '50%' : o.from === 'right' ? '100%' : '0%'} 50%`, parent);
    if (o.glow !== false && !CR.light) el.style.filter = CR.glowFilter(o.color || pal.accent, 30);
    const t0 = o.t0 || 0, d = o.dur || .7;
    const upd = t => { const p = CR.sseg(t, t0, t0 + d); el.style.transform = `scaleX(${p.toFixed(4)})`; };
    CR.on(upd); upd(-1);
    return { el, end: t0 + d };
  };
  CR.pushpin = (parent, x, y, col) => {
    const c = col || pal.accent;
    const el = CR.el('div', `position:absolute;left:${x - 13}px;top:${y - 13}px;width:26px;height:26px;border-radius:50%;` +
      `background:radial-gradient(circle at 36% 32%, ${CR.mix(c, '#FFFFFF', .55)} 0 12%, ${c} 38%, ${CR.mix(c, '#000000', .45)} 100%);box-shadow:3px 6px 6px rgba(0,0,0,.45)`, parent);
    return el;
  };
  CR.tape = (parent, x, y, w, rot) => CR.el('div', `position:absolute;left:${x - w / 2}px;top:${y - 18}px;width:${w}px;height:36px;transform:rotate(${rot || 0}deg);` +
    `background:linear-gradient(180deg, rgba(240,232,205,.62), rgba(225,214,180,.55));box-shadow:0 1px 2px rgba(0,0,0,.18);` +
    `clip-path:polygon(0 8%, 4% 0, 9% 10%, 14% 2%, 100% 0, 97% 92%, 92% 100%, 86% 90%, 0 100%)`, parent);
  CR.clip = (parent, x, y, rot) => {
    const s = CR.svg(parent, `left:${x}px;top:${y}px;width:46px;height:120px;transform:rotate(${rot || 0}deg);overflow:visible`);
    s.setAttribute('width', 46); s.setAttribute('height', 120); s.setAttribute('viewBox', '0 0 46 120');
    CR.sv('path', { d: 'M14 104 V22 a9 9 0 0 1 18 0 V92 a14 14 0 0 1 -28 0 V30', fill: 'none', stroke: '#8E959A', 'stroke-width': 4.2, 'stroke-linecap': 'round' }, s);
    CR.sv('path', { d: 'M14 104 V22 a9 9 0 0 1 18 0 V92 a14 14 0 0 1 -28 0 V30', fill: 'none', stroke: '#E6EAEC', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: .8 }, s);
    s.style.filter = 'drop-shadow(2px 4px 3px rgba(0,0,0,.4))';
    return s;
  };

  // ── photographs: drawn once into a canvas with the world's treatment, then framed ─────────────────────────────
  const TREAT = { paper_desk: 'print', newsprint: 'halftone', cork_board: 'warm', blueprint: 'cyan', concrete: 'bleach', light_table: 'slide',
                  void_black: 'clean', navy_falloff: 'clean', charcoal_light: 'clean', glass_dark: 'clean', footage_sharp: 'clean', footage_moving: 'clean' };
  CR.treatOf = () => (CR.texture === 'halftone' ? 'halftone' : TREAT[CR.W] || 'clean');
  const treatPixels = (x, w, h, kind) => {
    if (kind === 'clean' || kind === 'slide') return;
    const im = x.getImageData(0, 0, w, h), d = im.data;
    // duo: the world's own duotone (its ground darkened -> its ink), e.g. navy -> cold white on navy_falloff
    const dark = CR.rgb(kind === 'cyan' ? '#08243F' : kind === 'duo' ? CR.mix(pal.ground, '#000000', .35) : CR.light ? '#1A1714' : CR.mix(pal.ground, '#000000', .3));
    const lite = CR.rgb(kind === 'cyan' ? '#D8EEFF' : kind === 'duo' ? CR.mix(pal.ink, '#FFFFFF', .15) : kind === 'warm' ? '#F6E7C8' : '#F1EADC');
    for (let i = 0; i < d.length; i += 4) {
      let l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      if (kind === 'bleach') { l = clamp((l - .5) * 1.25 + .5); const s = .35; d[i] = d[i] * s + l * 255 * (1 - s); d[i + 1] = d[i + 1] * s + l * 255 * (1 - s); d[i + 2] = d[i + 2] * s + l * 255 * (1 - s); continue; }
      if (kind === 'warm') { const fade = .08; d[i] = clamp(d[i] / 255 * .9 + .1 + fade) * 255; d[i + 1] = clamp(d[i + 1] / 255 * .86 + .08 + fade * .8) * 255; d[i + 2] = clamp(d[i + 2] / 255 * .72 + .06) * 255; continue; }
      if (kind === 'print') { const s = .55; l = clamp((l - .5) * 1.08 + .52); d[i] = (d[i] / 255 * s + l * (1 - s)) * 255 * .97 + 6; d[i + 1] = (d[i + 1] / 255 * s + l * (1 - s)) * 255 * .95 + 4; d[i + 2] = (d[i + 2] / 255 * s + l * (1 - s)) * 255 * .88; continue; }
      if (kind === 'mono') { l = clamp((l - .5) * 1.15 + .5); d[i] = d[i + 1] = d[i + 2] = l * 255; continue; }
      // duotone / cyan / halftone base: dark -> light by luminance
      l = clamp((l - .5) * 1.12 + .5);
      d[i] = dark[0] + (lite[0] - dark[0]) * l; d[i + 1] = dark[1] + (lite[1] - dark[1]) * l; d[i + 2] = dark[2] + (lite[2] - dark[2]) * l;
    }
    x.putImageData(im, 0, 0);
    if (kind === 'halftone') {
      const src = document.createElement('canvas'); src.width = w; src.height = h; src.getContext('2d').drawImage(x.canvas, 0, 0);
      const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
      x.fillStyle = CR.light ? pal.ground : pal.paper; x.fillRect(0, 0, w, h);
      x.fillStyle = CR.light ? pal.sink : '#1A1714';
      const cell = Math.max(4, Math.round(Math.min(w, h) / 150));
      const ang = .26, ca = Math.cos(ang), sa = Math.sin(ang);
      for (let gy = -h; gy < h * 2; gy += cell) for (let gx = -w; gx < w * 2; gx += cell) {
        const px = gx * ca - gy * sa, py = gx * sa + gy * ca; if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const k = ((py | 0) * w + (px | 0)) * 4, l2 = (sd[k] * .3 + sd[k + 1] * .59 + sd[k + 2] * .11) / 255;
        const r = (1 - l2) * cell * .62; if (r < .25) continue;
        x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
      }
    }
  };
  CR.treat = treatPixels;
  CR.photo = (parent, src, o = {}) => {
    const w = Math.round(o.w || 600), h = Math.round(o.h || 750), frame = o.frame || 'none', kind = o.treat || CR.treatOf();
    const pad = { none: 0, keyline: 0, print: Math.round(w * .045), polaroid: Math.round(w * .055), glass: 0, mount: Math.round(w * .12), negative: 0, museum: Math.round(Math.min(w, h) * .11), card: 0 }[frame] || 0;
    const padB = frame === 'polaroid' ? Math.round(w * .2) : pad;
    const box = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${w + pad * 2}px;height:${h + pad + padB}px;transform-origin:50% 50%`, parent);
    if (frame === 'museum') {                              // a gallery frame: thin black moulding, a warm-white mat
      box.style.background = `#EFEBE3 url(${CR.paperURL(w + pad * 2, h + pad * 2, '#EFEBE3', o.seed || 13, .08)}) center/100% 100%`;
      box.style.border = `${Math.max(10, Math.round(Math.min(w, h) * .022))}px solid #141312`;
      box.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,.08), 0 34px 70px rgba(0,0,0,.62), 0 6px 14px rgba(0,0,0,.45)';
    }
    if (frame === 'card') { box.style.borderRadius = '18px'; box.style.overflow = 'hidden'; }
    if (frame === 'print' || frame === 'polaroid' || frame === 'mount') {
      const pc = frame === 'mount' ? '#E9E7E1' : frame === 'polaroid' ? '#F4F1EA' : '#F2EDE2';
      box.style.background = `${pc} url(${CR.paperURL(w + pad * 2, h + pad + padB, pc, o.seed || 9, .25)}) center/100% 100%`;
      box.style.boxShadow = '0 18px 34px rgba(0,0,0,.42), 0 2px 3px rgba(0,0,0,.35)';
      if (frame === 'mount') box.style.borderRadius = '10px';
    }
    if (frame === 'glass') { box.style.borderRadius = '16px'; box.style.overflow = 'hidden'; box.style.boxShadow = '0 40px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.10)'; }
    if (frame === 'keyline') box.style.boxShadow = `0 0 0 1.5px ${CR.rgba(pal.ink, .55)}, 0 0 0 12px ${CR.rgba(pal.ground, .0)}, 0 30px 70px rgba(0,0,0,.5)`;
    const cv = CR.el('canvas', `position:absolute;left:${pad}px;top:${pad}px;width:${w}px;height:${h}px;${frame === 'mount' ? 'border-radius:6px;' : ''}${frame === 'museum' ? 'box-shadow:0 0 0 1px rgba(0,0,0,.28), 0 0 0 5px rgba(0,0,0,.035);' : ''}`, box);
    cv.width = w; cv.height = h; const x = cv.getContext('2d');
    x.fillStyle = CR.light ? '#C9C6BE' : '#1A1A1A'; x.fillRect(0, 0, w, h);
    const ready = CR.wait(CR.img(src).then(im => {
      if (!im) return;
      const f = kind === 'clean' ? CR.gradeFilter() : kind === 'slide' ? 'saturate(1.18) contrast(1.06) brightness(1.04)' : '';
      CR.drawCover(x, im, w, h, (o.focus || [.5, .38])[0], (o.focus || [.5, .38])[1], f);
      treatPixels(x, w, h, kind);
      if (frame === 'glass') { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(.4, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
      if (frame === 'print' || frame === 'polaroid') { x.globalCompositeOperation = 'multiply'; x.drawImage(CR.noise(w, h, 40, 19, .08), 0, 0); x.globalCompositeOperation = 'source-over'; }
    }));
    if (o.caption && frame === 'polaroid') CR.el('div', `position:absolute;left:${pad}px;right:${pad}px;bottom:${Math.round(padB * .18)}px;font-family:${CR.F.hand};font-size:${Math.round(w * .085)}px;font-weight:600;color:#23201B;text-align:center;line-height:1.05`, box, esc(o.caption));
    return { el: box, cv, ready, w: w + pad * 2, h: h + pad + padB, pad };
  };
  CR.noPhoto = (parent, o = {}) => {                      // no real photo: a quiet name plate instead of a stranger's face
    const w = o.w || 600, h = o.h || 750;
    const el = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;background:${CR.light ? CR.mix(pal.ground, '#000', .08) : CR.mix(pal.ground, '#FFFFFF', .05)};` +
      `box-shadow:inset 0 0 0 1.5px ${CR.rgba(CR.light ? pal.sink : pal.ink, .18)};display:flex;align-items:center;justify-content:center`, parent);
    CR.el('div', `font-family:${CR.F.head};font-size:${Math.round(w * .32)}px;color:${CR.rgba(CR.light ? pal.sink : pal.ink, .22)}`, el, esc(String(o.initials || '').slice(0, 2)));
    return { el, w, h, ready: Promise.resolve() };
  };

  // ── lines: red string with sag, glowing links, a reticle ────────────────────────────────────────────────────
  CR.string = (svg, a, b, o = {}) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = (o.sag == null ? .055 : o.sag) * len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
    const d = `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
    const col = o.color || pal.accent, wdt = o.width || 3.2;
    const sh = o.shadow === false ? null : CR.sv('path', { d, fill: 'none', stroke: 'rgba(0,0,0,.35)', 'stroke-width': wdt, 'stroke-linecap': 'round', transform: 'translate(3,7)' }, svg);
    const p = CR.sv('path', { d, fill: 'none', stroke: col, 'stroke-width': wdt, 'stroke-linecap': 'round' }, svg);
    if (o.glow) p.style.filter = CR.glowFilter(col, 26);
    const L = p.getTotalLength(); [p, sh].forEach(e => { if (e) { e.style.strokeDasharray = `${L} ${L}`; e.style.strokeDashoffset = L; } });
    const t0 = o.t0 || 0, du = o.dur || .8;
    let head = null;
    if (o.comet) head = CR.sv('circle', { r: 5, fill: CR.mix(col, '#FFFFFF', .6) }, svg);
    const upd = t => { const q = CR.sseg(t, t0, t0 + du); [p, sh].forEach(e => { if (e) e.style.strokeDashoffset = (L * (1 - q)).toFixed(2); });
      if (head) { const pt = p.getPointAtLength(L * q); head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y); head.style.opacity = q > 0 && q < 1 ? 1 : 0; if (o.glow) head.style.filter = CR.glowFilter(col, 30); } };
    CR.on(upd); upd(-1);
    return { el: p, end: t0 + du };
  };
  CR.reticle = (parent, x, y, o = {}) => {
    const s = CR.svg(parent), col = o.color || pal.ink, t0 = o.t0 || 0;
    const ln = (x1, y1, x2, y2, w, op) => CR.sv('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': w || 1, opacity: op == null ? .35 : op }, s);
    const h1 = ln(0, y, W, y), v1 = ln(x, 0, x, H);
    const ring = CR.sv('circle', { cx: x, cy: y, r: o.r || 46, fill: 'none', stroke: o.accent || pal.accent, 'stroke-width': 2 }, s);
    if (!CR.light) ring.style.filter = CR.glowFilter(o.accent || pal.accent, 30);
    const ticks = []; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, r0 = (o.r || 46) + 10, r1 = r0 + 22; ticks.push(ln(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, 2, .9)); }
    const upd = t => { const p = CR.sseg(t, t0, t0 + 1.0), q = CR.sseg(t, t0 + .35, t0 + .9);
      h1.setAttribute('x1', x - x * p); h1.setAttribute('x2', x + (W - x) * p); v1.setAttribute('y1', y - y * p); v1.setAttribute('y2', y + (H - y) * p);
      ring.setAttribute('r', ((o.r || 46) * (1.6 - .6 * q)).toFixed(2)); ring.style.opacity = q.toFixed(3); ticks.forEach(k => { k.style.opacity = (q * .9).toFixed(3); }); };
    CR.on(upd); upd(-1);
    return s;
  };
  // a label set in the condensed caps with tracking (kickers, roles, sources)
  CR.label = (parent, str, o = {}) => CR.text(parent, str, Object.assign({ font: 'cond', size: 30, ls: .16, upper: true, anim: CR.anim.label, color: o.color || (o.onLight ?? CR.light ? CR.pal.sink : CR.pal.dim) }, o));
})();
