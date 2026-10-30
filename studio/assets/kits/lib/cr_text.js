// CREATIVE kit — TEXT ANIMATIONS. One call lays a block of type out and animates it from t alone:
//   const tx = CR.text(parent, 'The Defector', {font:'head', size:120, anim:'letter_rise', t0:.3, key:'Defector'});
//   tx.el (the block), tx.end (second it is fully shown), tx.box() (its rect once laid out); its updater is registered.
// Options: font (CR.F role) size weight color ls (em) lh align width x y upper italic anim t0 dur stagger cps key
// keyColor glow (false = no light) onLight (dark ink on paper) redact [words] mark (highlighter phrase) th (highlight
// time) nowrap rot (stamp) cell (split-flap cell colour). Anims: mask_wipe typewriter slam letter_rise decode
// tracking_open focus_pull split_flap highlighter stamp redaction (+ 'none' = shown from t0).
(function () {
  const norm = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  CR.keyIdx = (words, key) => {                           // word indexes of a key phrase (words may hold a no-break pair)
    const out = new Set(); if (!key) return out;
    const ks = (Array.isArray(key) ? key.join(' ') : String(key)).split(/\s+/).map(norm).filter(Boolean); if (!ks.length) return out;
    const toks = []; words.forEach((w, i) => String(w).split('\u00A0').forEach(p => toks.push([norm(p), i])));
    for (let i = 0; i + ks.length <= toks.length; i++) { if (ks.every((k, j) => toks[i + j][0] === k)) { for (let j = 0; j < ks.length; j++) out.add(toks[i + j][1]); return out; } }
    toks.forEach(([w, i]) => { if (ks.includes(w)) out.add(i); });
    return out;
  };
  let mc = null;
  const kern = (spans, font) => {                          // per-letter boxes lose the font's kerning: put it back
    mc = mc || document.createElement('canvas').getContext('2d'); mc.font = font;
    for (let i = 0; i + 1 < spans.length; i++) {
      const a = spans[i].textContent, b = spans[i + 1].textContent; if (!a.trim() || !b.trim()) continue;
      const k = mc.measureText(a + b).width - mc.measureText(a).width - mc.measureText(b).width;
      if (Math.abs(k) > 0.25) spans[i].style.marginRight = k.toFixed(2) + 'px';
    }
  };
  const lineGroups = (spans) => { const rows = []; let top = null; for (const sp of spans) { const ot = sp.offsetTop; if (top === null || Math.abs(ot - top) > 4) { rows.push([]); top = ot; } rows[rows.length - 1].push(sp); } return rows; };
  let wearURL = null;
  CR.wear = () => {                                        // worn rubber-stamp ink: a speckle mask
    if (wearURL) return wearURL;
    const c = document.createElement('canvas'); c.width = 400; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 400, 160);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) { const r = Math.pow(CR.hash(i, 201), 4) * 3.0 + .3; x.globalAlpha = .3 + CR.hash(i, 202) * .7; x.beginPath(); x.arc(CR.hash(i, 203) * 400, CR.hash(i, 204) * 160, r, 0, 6.2832); x.fill(); }
    x.globalAlpha = .16; x.drawImage(CR.noise(400, 160, 26, 205, 1), 0, 0);
    wearURL = c.toDataURL(); return wearURL;
  };

  CR.text = (parent, str, o = {}) => {
    const role = o.font || 'head', size = o.size || 64;
    let anim = o.anim || 'mask_wipe';
    // tracking opens only on capitals (tracked lower case is a typographic mistake): lower-case lines rack focus instead
    if (anim === 'tracking_open' && !o.upper && /\p{Ll}/u.test(String(str || ''))) anim = 'focus_pull';
    const weight = o.weight || CR.FW[role] || 500, fam = CR.F[role] || CR.F.head;
    const onLight = o.onLight != null ? o.onLight : CR.light;
    const raw = String(str == null ? '' : str), s = o.upper ? raw.toUpperCase() : raw;
    const t0 = o.t0 || 0, ls = o.ls || 0;
    const base = o.color || (onLight ? CR.pal.sink : CR.pal.ink);
    const el = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;${o.width ? `width:${o.width}px;` : ''}font-family:${fam};font-size:${size}px;` +
      `font-weight:${weight};line-height:${o.lh || 1.08};letter-spacing:${ls}em;text-align:${o.align || 'left'};${o.italic ? 'font-style:italic;' : ''}` +
      `${o.nowrap ? 'white-space:nowrap;' : ''}${size >= 48 && !o.nowrap ? 'text-wrap:balance;' : ''}font-kerning:normal;font-feature-settings:'kern' 1,'liga' 1;`, parent);
    const glowOn = o.glow !== false;
    el.style.color = glowOn ? CR.glowFill(base, size, el) : base;
    el.style.textShadow = glowOn ? CR.glowText(size, o.glowColor, onLight) : (o.shadow || '');
    const words = s.split(/\s+/).filter(Boolean);
    // no widow: the last two words of a multi-word line stay together (a lone "two." on its own line reads as a slip)
    if (o.widow !== false && size < 48 && words.length >= 3 && !['split_flap', 'stamp', 'tracking_open'].includes(anim) && (words[words.length - 1] + words[words.length - 2]).length < 22) {
      words.splice(words.length - 2, 2, words[words.length - 2] + '\u00A0' + words[words.length - 1]);
    }
    const keys = CR.keyIdx(words, o.key);
    const kc = o.keyColor || CR.pal.accent;
    const kStyle = `color:${kc};${glowOn && !onLight ? `text-shadow:${CR.glowText(size, kc, onLight)}` : ''}`;
    const fontCSS = `${o.italic ? 'italic ' : ''}${weight} ${size}px ${fam}`;
    const obj = { el, t0, end: t0, words, box: () => el.getBoundingClientRect() };
    let upd = () => {};
    const wordSpans = (block) => { el.innerHTML = words.map((w, i) => `<span class="w" data-i="${i}" style="${block ? 'display:inline-block;' : ''}${keys.has(i) ? kStyle : ''}">${esc(w)}</span>`).join(' '); return [...el.querySelectorAll('.w')]; };
    const dur = o.dur, stag = o.stagger;

    if (anim === 'mask_wipe' || anim === 'none') {
      const sp = wordSpans(false);
      const bo = CR.keyIdx(words, o.blackout);             // redacted words blacked out for good (no lift)
      sp.forEach((x, i) => { if (bo.has(i)) x.style.cssText += ';background:#0D0C0B;color:transparent;text-shadow:none;box-shadow:0 0 0 .06em #0D0C0B'; });
      const rows = lineGroups(sp);
      el.innerHTML = rows.map(r => `<div class="ln" style="display:block">${r.map(x => x.outerHTML).join(' ')}</div>`).join('');
      const lns = [...el.querySelectorAll('.ln')], d = dur || .75, g = stag == null ? .14 : stag;
      obj.end = t0 + (lns.length - 1) * g + d;
      upd = t => lns.forEach((ln, j) => {
        if (anim === 'none') { ln.style.opacity = t >= t0 ? 1 : 0; return; }
        const p = CR.sseg(t, t0 + j * g, t0 + j * g + d);
        if (p >= 1) { ln.style.webkitMaskImage = 'none'; ln.style.opacity = 1; return; }
        const a = lerp(-18, 100, p);
        ln.style.opacity = p > 0 ? 1 : 0;
        ln.style.webkitMaskImage = `linear-gradient(90deg, #000 ${a.toFixed(2)}%, rgba(0,0,0,0) ${(a + 18).toFixed(2)}%)`;
      });
    } else if (anim === 'typewriter') {
      el.innerHTML = ''; const chars = [];
      words.forEach((w, i) => { const ws = CR.el('span', keys.has(i) ? kStyle : '', el); for (const ch of w) chars.push(CR.el('span', 'visibility:hidden', ws, esc(ch)));
        if (i < words.length - 1) chars.push(CR.el('span', 'visibility:hidden', el, ' ')); });
      // the caret: a block at reading sizes; at display sizes a thin bar in the ink (a full-height accent block on
      // 96 px type is a slab, not a caret)
      const big = size >= 72;
      const caret = CR.el('span', `display:inline-block;width:${big ? Math.max(3, size * .055).toFixed(1) + 'px' : '.52em'};height:${big ? '.78em' : '.86em'};vertical-align:${big ? '-.04em' : '-.08em'};margin-left:${big ? '.06em' : '.04em'};` +
        `background:${o.caret || (onLight ? CR.pal.sink : big ? base : CR.pal.accent)};opacity:0`, el);
      const cps = dur ? Math.max(8, chars.length / dur) : (o.cps || 30);
      obj.end = t0 + chars.length / cps;
      upd = t => {
        const n = Math.floor(Math.max(0, t - t0) * cps + 1e-6);
        chars.forEach((c, i) => { c.style.visibility = i < n ? 'visible' : 'hidden'; });
        const k = Math.min(n, chars.length);
        const after = k ? chars[k - 1] : null;
        if (after && caret.previousSibling !== after) after.after(caret); else if (!after && el.firstChild !== caret) el.insertBefore(caret, el.firstChild);
        const done = t - obj.end;
        caret.style.opacity = t < t0 - .2 ? 0 : done < 0 ? 1 : done < 1.2 ? (Math.floor(done * 4) % 2 ? 0 : 1) : 0;
      };
    } else if (anim === 'slam' || anim === 'focus_pull') {
      const sp = wordSpans(true); const g = stag == null ? (anim === 'slam' ? .11 : .07) : stag, d = dur || (anim === 'slam' ? .17 : .7);
      sp.forEach(x => { x.style.willChange = 'transform,filter,opacity'; x.style.transformOrigin = '50% 60%'; });
      obj.end = t0 + (sp.length - 1) * g + d;
      upd = t => sp.forEach((x, i) => {
        const p = CR.sseg(t, t0 + i * g, t0 + i * g + d);
        if (anim === 'slam') { x.style.opacity = clamp(p * 2.2).toFixed(3); x.style.transform = `scale(${(1.18 - .18 * p).toFixed(4)})`; x.style.filter = p < 1 ? `blur(${(6 * (1 - p)).toFixed(2)}px)` : 'none'; }
        else { x.style.opacity = p.toFixed(3); x.style.transform = `scale(${(1.03 - .03 * p).toFixed(4)})`; x.style.filter = p < 1 ? `blur(${(14 * (1 - p)).toFixed(2)}px)` : 'none'; }
      });
    } else if (anim === 'letter_rise' || anim === 'decode') {
      const sp = wordSpans(false); const rows = lineGroups(sp);
      el.innerHTML = '';
      const cs = [];
      rows.forEach((r, j) => {
        const ln = CR.el('div', `display:block;overflow:hidden;padding-bottom:.1em;margin-bottom:-.1em;${o.align === 'center' ? 'text-align:center' : o.align === 'right' ? 'text-align:right' : ''}`, el);
        r.forEach((wsp, wi) => { const i = +wsp.dataset.i; const wsSpan = CR.el('span', `display:inline-block;white-space:nowrap;${keys.has(i) ? kStyle : ''}`, ln);
          const line = [];
          for (const ch of words[i]) { const c = CR.el('span', 'display:inline-block;will-change:transform', wsSpan, esc(ch)); c._j = j; c._ch = ch; cs.push(c); line.push(c); }
          kern(line, fontCSS);
          if (wi < r.length - 1) ln.appendChild(document.createTextNode(' ')); });
      });
      const n = cs.length;
      if (anim === 'decode') {
        cs.forEach(c => { c.style.width = c.getBoundingClientRect().width.toFixed(2) + 'px'; c.style.textAlign = 'center'; });
        const d = dur || Math.min(1.6, .35 + n * .045);
        obj.end = t0 + d + .1;
        const pool = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%&*/+=<>';
        const dimc = onLight ? CR.mix(base, CR.pal.paper, .45) : CR.pal.accent;
        upd = t => cs.forEach((c, i) => {
          const ti = t0 + .1 + (i / Math.max(1, n - 1)) * d;
          if (t < ti - .38) { c.style.visibility = 'hidden'; return; }
          c.style.visibility = 'visible';
          if (t < ti && c._ch.trim()) { const f = Math.floor(t * 20); c.textContent = pool[Math.floor(CR.hash(i * 13 + f, 7) * pool.length)]; c.style.color = dimc; }
          else { c.textContent = c._ch; c.style.color = ''; }
        });
      } else {
        const g = stag == null ? Math.min(.032, .9 / Math.max(1, n)) : stag, d = dur || .6;
        let k = 0, lastJ = -1, idx = [];
        cs.forEach(c => { if (c._j !== lastJ) { k = 0; lastJ = c._j; } idx.push(k++); });
        obj.end = t0 + Math.max(...cs.map((c, i) => c._j * .12 + idx[i] * g)) + d;
        upd = t => cs.forEach((c, i) => { const ti = t0 + c._j * .12 + idx[i] * g; const p = CR.sseg(t, ti, ti + d); c.style.transform = p >= 1 ? 'none' : `translateY(${((1 - p) * 108).toFixed(2)}%)`; });
      }
    } else if (anim === 'tracking_open') {
      const l1 = Math.max(ls || 0, .12), l0 = l1 - .12, d = dur || 2.4;
      // lines are fixed at the FINAL spacing (explicit breaks, no wrap): opening the spacing never re-wraps a line
      el.style.letterSpacing = l1 + 'em';
      const sp = wordSpans(false), rows = lineGroups(sp);
      el.innerHTML = rows.map(r => r.map(x => x.outerHTML).join(' ')).join('<br>');
      el.style.whiteSpace = 'nowrap';
      obj.end = t0 + .9;
      upd = t => { const p = CR.cruise(seg(t, t0, t0 + d)), q = CR.sseg(t, t0, t0 + .9); el.style.letterSpacing = lerp(l0, l1, p).toFixed(4) + 'em'; el.style.opacity = q.toFixed(3);
        el.style.filter = q < 1 ? `blur(${(5 * (1 - CR.sseg(t, t0, t0 + 1.1))).toFixed(2)}px)` : 'none'; };
    } else if (anim === 'split_flap') {
      el.innerHTML = ''; el.style.textShadow = 'none'; el.style.whiteSpace = 'nowrap';
      const cell = o.cell || (onLight ? '#1E1E1E' : CR.mix(CR.pal.ground, '#000000', .35)), ink = o.color || '#F2EFE6';
      const flapFam = o.font === 'mono' ? CR.F.mono : CR.F.cond, chars = [...s.toUpperCase()];
      let fz = size;
      mc = mc || document.createElement('canvas').getContext('2d');
      const cwOf = z => { mc.font = `600 ${z}px ${flapFam}`; return Math.ceil(Math.max(...'MW0'.split('').map(c => mc.measureText(c).width)) * 1.12); };
      if (o.width) while (fz > 24 && chars.length * (cwOf(fz) + fz * .06) > o.width) fz -= 4;
      const cw = cwOf(fz), size_ = fz;
      el.style.fontFamily = flapFam; el.style.fontWeight = 600; el.style.fontSize = fz + 'px'; el.style.letterSpacing = '0';
      const cells = [];
      chars.forEach((ch, i) => {
        const c = CR.el('span', `display:inline-block;position:relative;width:${cw}px;height:${(size_ * 1.22).toFixed(0)}px;margin-right:${(size_ * .06).toFixed(1)}px;` +
          `background:${ch === ' ' ? CR.rgba(cell, .55) : cell};border-radius:${(size_ * .06).toFixed(1)}px;vertical-align:top;overflow:hidden;box-shadow:inset 0 -${(size_ * .04).toFixed(1)}px 0 rgba(0,0,0,.35)`, el);
        const half = css => CR.el('span', `position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;color:${keys.size && words.length ? ink : ink};${css}`, c);
        const top = half('clip-path:inset(0 0 50% 0)'), bot = half('clip-path:inset(50% 0 0 0)');
        CR.el('span', `position:absolute;left:0;right:0;top:50%;height:${Math.max(1, size_ * .02).toFixed(1)}px;background:rgba(0,0,0,.55)`, c);
        const shade = CR.el('span', 'position:absolute;left:0;right:0;top:0;height:50%;background:rgba(0,0,0,.28);opacity:0', c);
        cells.push({ ch, top, bot, shade, settle: t0 + .25 + i * .05 + CR.hash(i, 31) * .12 });
      });
      obj.end = Math.max(t0, ...cells.map(c => c.settle));
      const pool = ch => /\d/.test(ch) ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const at = (c, k, i) => (k < 0 || c.ch === ' ') ? c.ch : pool(c.ch)[Math.floor(CR.hash(i * 7 + k, 17) * pool(c.ch).length)];
      upd = t => cells.forEach((c, i) => {
        if (t < t0) { c.top.textContent = c.bot.textContent = ''; c.shade.style.opacity = 0; return; }
        if (t >= c.settle) { c.top.textContent = c.bot.textContent = c.ch; c.shade.style.opacity = 0; return; }
        const f = (t - t0) * 15, k = Math.floor(f), ph = f - k;
        c.top.textContent = at(c, k, i); c.bot.textContent = ph < .5 ? at(c, k - 1, i) : at(c, k, i); c.shade.style.opacity = ph < .5 ? 1 : 0;
      });
    } else if (anim === 'highlighter' && size >= 96) {
      // display sizes: a marker band over 100 px letters is a slab — the key words get a drawn marker underline instead
      const sp = wordSpans(false), d = dur || .75;
      obj.end = t0 + d;
      upd = t => { const p = CR.sseg(t, t0, t0 + d); el.style.opacity = p.toFixed(3); };
      o = Object.assign({}, o, { under: o.mark || o.key || words[words.length - 1], underAt: t0 + d * .7, underColor: o.hl || CR.pal.accent });
      void sp;
    } else if (anim === 'highlighter') {
      // a marker band along the LOWER part of the key words: feathered ends, no padding into the next glyph, the type
      // keeps its colour (dark: the accent at 55 % under light ink; paper: yellow marker multiplied into the sheet)
      const hk = CR.keyIdx(words, o.mark || o.key || words[words.length - 1]);
      let html = '', open = false;
      words.forEach((w, i) => { const k = hk.has(i);
        if (k && !open) { html += `<span class="hl" style="-webkit-box-decoration-break:clone;box-decoration-break:clone;background-repeat:no-repeat;background-position:0 92%">`; open = true; }
        if (!k && open) { html += '</span> '; open = false; } else if (i) html += ' ';
        html += `<span style="${keys.has(i) && !k ? kStyle : ''}">${esc(w)}</span>`; });
      if (open) html += '</span>';
      el.innerHTML = html;
      const hls = [...el.querySelectorAll('.hl')];
      const mark = o.hl || (onLight ? '#F2D64B' : CR.rgba(CR.pal.accent, .55));
      const band = onLight ? 52 : 34;
      hls.forEach(h => { h.style.backgroundImage = `linear-gradient(90deg, rgba(0,0,0,0) 0, ${mark} .14em, ${mark} calc(100% - .14em), rgba(0,0,0,0) 100%)`; if (onLight) h.style.mixBlendMode = 'multiply'; });
      const th = o.th == null ? t0 + .5 : o.th, d = dur || .5;
      obj.end = th + hls.length * .3 + d;
      const textIn = .45;
      upd = t => { el.style.opacity = CR.sseg(t, t0, t0 + textIn).toFixed(3);
        hls.forEach((h, k) => { const p = CR.sseg(t, th + k * .3, th + k * .3 + d); h.style.backgroundSize = `${(p * 100).toFixed(2)}% ${band}%`; }); };
    } else if (anim === 'stamp') {
      el.innerHTML = esc(s);
      const col = o.color || CR.pal.accent;
      el.style.cssText += `;color:${col};border:${(size * .085).toFixed(1)}px solid ${col};padding:${(size * .1).toFixed(1)}px ${(size * .34).toFixed(1)}px ${(size * .04).toFixed(1)}px;` +
        `border-radius:${(size * .08).toFixed(1)}px;text-shadow:none;white-space:nowrap;-webkit-mask-image:url(${CR.wear()});-webkit-mask-size:100% 100%;${onLight || CR.W === 'concrete' ? 'mix-blend-mode:multiply;' : ''}`;
      if (CR.W === 'concrete') el.style.mixBlendMode = 'screen';
      const rot = o.rot == null ? -4 : o.rot, d = dur || .13;
      el.style.transformOrigin = '50% 50%';
      if (o.width) {                                       // fix round 2: the stamp hugs its words (a block-wide box
        el.style.width = 'max-content';                    // left a third of it empty) and stays inside the block
        const w = el.offsetWidth;
        if (w > o.width) { const k = o.width / w; el.style.fontSize = (size * k).toFixed(1) + 'px'; el.style.borderWidth = (size * .085 * k).toFixed(1) + 'px';
          el.style.padding = `${(size * .1 * k).toFixed(1)}px ${(size * .34 * k).toFixed(1)}px ${(size * .04 * k).toFixed(1)}px`; }
        const w2 = el.offsetWidth, x0 = o.x || 0;
        if (o.align === 'center') el.style.left = (x0 + (o.width - w2) / 2).toFixed(1) + 'px';
        else if (o.align === 'right') el.style.left = (x0 + o.width - w2).toFixed(1) + 'px';
      }
      // how far the turned box reaches below its own layout box: a comp adds tx.pad before the next line (fix round 2:
      // a title stamp at -4 deg ran its corner through the sub under it)
      obj.pad = Math.ceil(Math.abs(Math.sin(rot * Math.PI / 180)) * el.offsetWidth / 2 + size * .04);
      obj.end = t0 + d;
      upd = t => { const p = CR.sseg(t, t0, t0 + d); el.style.opacity = clamp(p * 3).toFixed(3); el.style.transform = `rotate(${rot}deg) scale(${(1.14 - .14 * p).toFixed(4)})`; };
    } else if (anim === 'redaction') {
      const sp = wordSpans(true);
      const red = CR.keyIdx(words, o.redact);
      const barc = onLight ? '#0D0C0B' : '#000000';
      const bars = sp.map((x, i) => { x.style.position = 'relative'; return CR.el('span', `position:absolute;left:-.07em;right:-.07em;top:.1em;bottom:-.02em;background:${barc};transform-origin:100% 50%;` +
        `${red.has(i) ? 'box-shadow:0 0 0 1px rgba(0,0,0,.4)' : ''}`, x); });
      const g = stag == null ? .085 : stag, d = dur || .26;
      const lift = sp.map((_, i) => i).filter(i => !red.has(i));
      obj.end = t0 + .35 + lift.length * g + d;
      upd = t => { el.style.opacity = CR.sseg(t, t0, t0 + .15).toFixed(3);
        lift.forEach((i, k) => { const p = CR.sseg(t, t0 + .35 + k * g, t0 + .35 + k * g + d); bars[i].style.transform = `scaleX(${(1 - p).toFixed(4)})`; }); };
    }
    if (o.under && (['typewriter', 'mask_wipe', 'none', 'focus_pull', 'slam'].includes(anim) || (anim === 'highlighter' && size >= 96))) {
      const ui = CR.keyIdx(words, o.under), col = o.underColor || CR.pal.accent, lines_ = [];
      const spans = anim === 'typewriter' ? [...el.children].filter(c => c.tagName === 'SPAN' && c.children.length) : [...el.querySelectorAll('.w')];
      spans.forEach((sp, i) => { if (!ui.has(anim === 'typewriter' ? i : +sp.dataset.i)) return;
        sp.style.position = 'relative';
        const u = CR.el('span', `position:absolute;left:-.04em;right:-.04em;bottom:-.06em;height:.085em;border-radius:.05em;background:${col};opacity:.88;transform-origin:0 50%;transform:scaleX(0) rotate(-.6deg)`, sp);
        lines_.push(u); });
      const u0 = (o.underAt == null ? obj.end + .1 : o.underAt), base = upd;
      upd = t => { base(t); lines_.forEach((u, k) => { const p = CR.sseg(t, u0 + k * .12, u0 + k * .12 + .32); u.style.transform = `scaleX(${p.toFixed(4)}) rotate(-.6deg)`; }); };
      obj.end = u0 + lines_.length * .12 + .32;
    }
    if (CR.glow.family === 'halo' && !onLight && glowOn && size >= 90 && o.halo !== false) {
      const hx = el.offsetLeft + el.offsetWidth / 2, hy = el.offsetTop + el.offsetHeight / 2;
      const h = CR.halo(parent, hx, hy, el.offsetWidth * .8, el.offsetHeight);
      if (h) { parent.insertBefore(h, el); const base = upd; obj.haloEl = h;
        upd = t => { base(t); h.style.opacity = CR.sseg(t, t0, t0 + 1.2).toFixed(3); }; }
    }
    obj.upd = upd;
    CR.on(upd);
    upd(-1);
    return obj;
  };

  // a figure that rolls into place like an odometer, digits settling left to right (dates, years, counts)
  CR.odometer = (parent, str, o = {}) => {
    const size = o.size || 160, role = o.font || 'display', fam = CR.F[role], weight = o.weight || CR.FW[role];
    const el = CR.el('div', `position:absolute;left:${o.x || 0}px;top:${o.y || 0}px;font-family:${fam};font-size:${size}px;font-weight:${weight};line-height:1;` +
      `letter-spacing:${o.ls || 0}em;color:${o.color || CR.pal.ink};white-space:nowrap;font-variant-numeric:tabular-nums;${o.align === 'center' ? 'transform:translateX(-50%);' : ''}`, parent);
    el.style.textShadow = CR.glowText(size, o.glowColor, o.onLight);
    const cols = [];
    const mcx = document.createElement('canvas').getContext('2d'); mcx.font = `${weight} ${size}px ${fam}`;
    const dw = Math.max(...'0123456789'.split('').map(d => mcx.measureText(d).width)) + (o.ls || 0) * size;
    [...String(str)].forEach((ch, i) => {
      if (!/\d/.test(ch)) { CR.el('span', 'display:inline-block;vertical-align:top', el, esc(ch)); return; }
      const box = CR.el('span', `display:inline-block;overflow:hidden;height:1.02em;vertical-align:top;position:relative;text-align:center`, el);
      const strip = CR.el('span', 'display:block;will-change:transform', box, '0123456789'.split('').concat(['0']).map(d => `<span style="display:block;height:1.02em">${d}</span>`).join(''));
      box.style.width = (mcx.measureText(ch).width + (o.ls || 0) * size).toFixed(1) + 'px'; void dw;
      cols.push({ strip, d: +ch, i });
    });
    const t0 = o.t0 || 0, d = o.dur || 1.3;
    const upd = t => (el.style.opacity = CR.sseg(t, t0, t0 + .3).toFixed(3), cols).forEach((c, k) => {
      const a = t0 + k * .09, p = CR.sseg(t, a, a + d * (0.55 + 0.45 * (k + 1) / cols.length));
      const turns = cols.length - k;                                       // left digits travel less, settle first
      const v = p >= 1 ? c.d : (c.d + 10 * turns * (1 - p)) % 10;
      c.strip.style.transform = `translateY(${(-v * 1.02).toFixed(4)}em)`;
    });
    CR.on(upd); upd(-1);
    return { el, end: t0 + d + cols.length * .09 };
  };
})();
