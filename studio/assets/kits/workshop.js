/* workshop.js — the WORKSHOP kit, as the pitmaster reference does it: a man who has done the job for forty
   years explains it on paper. Sheets that fill the frame over his own place, blurred; hand-tinted ink engravings
   with thin leader lines to red labels; torn paper strips laid over the footage with a red strike or a green
   tick; taped photographs with a strip label; a spiral notepad with one big red number.
   Nothing falls, bounces or pops. Paper is laid down, ink comes in, lines are drawn on, and the camera keeps one
   slow, even push for the whole scene.
   Two corners are left alone: the top right belongs to the chapter row, laid over the whole film afterwards
   (workshop.hud_pass), and the bottom right to the presenter's disc, which avatar.relayout() puts there when he
   speaks over a sheet.
   Fonts: Wk Head (Oswald Bold), Wk Cond (Barlow Condensed), Wk Hand (Caveat). */
// S.skin = "cocina": the same kit for a grandmother's Mexican kitchen (the founder, 2026-10-04, the Rosa video) — her
// recipe notebook instead of a pitmaster's sheet, watercolours instead of engravings, her handwriting on masking tape,
// terracotta, talavera cobalt and the mustard of her cardigan instead of the barn's red and black
const COC = S.skin === 'cocina';
const PAPER = COC ? '#F3E8D3' : (P.paper || '#EFE4CE'), INK = COC ? '#3A2518' : (P.ink || '#2E2118'),
      RED = COC ? '#C0532C' : (P.red || '#B3301F'), GREEN = COC ? '#3F7F3A' : (P.green || '#2E7D32'),
      BLUE = '#1F4E9C', MUSTARD = '#D9A23A';
const ss = x => x * x * (3 - 2 * x);                     // smoothstep: anything that moves the whole frame
const SX = 80, SY = 50, SW = 1760, SH = 980;             // the sheet, in frame pixels
const FREE_X = 1250, FREE_Y = 500;                       // sheet coords: from here right and down is the disc's
const CSS = `
.hd{font-family:'Wk Head',Impact,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.01em;color:${INK};line-height:1.04}
.cd{font-family:'Wk Cond','Arial Narrow',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.hw{font-family:'Wk Hand',cursive;font-weight:700}
.sheet{position:absolute;background-color:${PAPER};background-size:cover;background-position:center;
  box-shadow:0 38px 96px rgba(0,0,0,.62),0 6px 16px rgba(0,0,0,.34)}
.age{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 44%,rgba(255,248,232,0) 54%,rgba(118,84,42,.22) 100%)}
.ink{position:absolute;mix-blend-mode:multiply}
.ink img{width:100%;height:100%;object-fit:contain;display:block}
.note{position:absolute;white-space:nowrap;line-height:1.08}
.note b{display:block;font-size:36px;color:${RED}}
.note span{display:block;font-size:27px;color:${INK};letter-spacing:.045em}
.wrap{position:absolute;filter:drop-shadow(0 12px 16px rgba(0,0,0,.5)) drop-shadow(0 2px 3px rgba(0,0,0,.3))}
.strip{position:relative;background-color:#E6D6B4;background-size:1400px auto;background-position:30% 40%;white-space:nowrap}
.tape{position:absolute;background-color:rgba(228,214,178,.88);
  background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.10) 0 3px,rgba(90,70,30,.05) 3px 8px);
  filter:drop-shadow(0 3px 4px rgba(0,0,0,.28))}
.print{position:absolute;background:#F6F1E4;box-shadow:0 36px 84px rgba(0,0,0,.62),0 5px 12px rgba(0,0,0,.3)}
.print .ph{position:absolute;left:22px;top:22px;right:22px;bottom:30px;background:#2A2118;overflow:hidden}
.print .ph img{width:100%;height:100%;object-fit:cover;display:block}
.ribbon{position:relative;display:inline-block;background:${RED};color:#FBF1E0;text-align:center;font-size:42px;padding:8px 34px 6px;
  white-space:nowrap;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 50%,100% 100%,0 100%,14px 50%)}
.tag{position:absolute;background:${RED};color:#FBF1E0;font-size:32px;padding:11px 24px 8px;white-space:nowrap}
svg.draw{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
body.cocina .hd{font-family:'Wk Serif',Georgia,serif;text-transform:none;letter-spacing:0;line-height:1.08}
body.cocina .cd{font-family:'Wk Hand',cursive;text-transform:none;letter-spacing:.01em}
body.cocina .note b{font-size:50px;line-height:1}
body.cocina .note span{font-size:36px;letter-spacing:0}
body.cocina .ribbon{font-size:50px;padding:4px 36px 2px;background:${RED}}
body.cocina .tag{font-size:40px;padding:6px 26px 4px;background:${BLUE};border-radius:6px}
body.cocina #ls,body.cocina #rs{font-size:40px !important}
body.cocina #cap{font-family:'Wk Hand',cursive !important;font-size:60px !important;letter-spacing:0 !important}
body.cocina .strip{background-color:rgba(238,226,198,.95);
  background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.12) 0 3px,rgba(120,90,40,.06) 3px 9px) !important}
body.cocina .tape{background-color:rgba(238,226,198,.9)}
`;

// ── drawing helpers ────────────────────────────────────────────────────────────────────────────────────────────
function torn(w, h, amp, step) {            // a torn-paper outline as a clip-path polygon (px)
  const p = [];
  for (let x = 0; x < w; x += step) p.push([x, rnd() * amp]);
  p.push([w, rnd() * amp * .5]);
  for (let y = step; y < h; y += step) p.push([w - rnd() * amp * .55, y]);
  for (let x = w; x > 0; x -= step) p.push([x, h - rnd() * amp]);
  p.push([0, h - rnd() * amp * .5]);
  for (let y = h - step; y > 0; y -= step) p.push([rnd() * amp * .55, y]);
  return 'polygon(' + p.map(q => q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px').join(',') + ')';
}
function tornEnds(w, h, amp) {              // masking tape: straight sides, torn across both ends (px polygon)
  const p = [];
  for (let y = 0; y <= h; y += 8) p.push([rnd() * amp, y]);
  for (let y = h; y >= 0; y -= 8) p.push([w - rnd() * amp, y]);
  return 'polygon(' + p.map(q => q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px').join(',') + ')';
}
function stroke(x0, y0, x1, y1, bow, wob) { // a grease-pencil line: nearly straight, a little bow, a little wobble
  const n = 7, pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    pts.push([lerp(x0, x1, f), lerp(y0, y1, f) + Math.sin(f * Math.PI) * bow + (i && i < n ? (rnd() - .5) * wob : 0)]);
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  return d + ` L${pts[n][0].toFixed(1)},${pts[n][1].toFixed(1)}`;
}
function tickD(x, y, s) {                   // a tick written by hand: a short stroke down, a long one up
  return `M${x},${y + s * .46} Q${x + s * .13},${y + s * .6} ${x + s * .3},${y + s * .9} ` +
         `Q${x + s * .55},${y + s * .42} ${x + s * 1.06},${y - s * .06}`;
}
function path(d, color, width, op) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ` +
         `stroke-linejoin="round" opacity="${op == null ? 1 : op}"/>`;
}
function armLines(svg) {                     // every path in an svg, ready to be drawn on
  return [...svg.querySelectorAll('path')].map(el => {
    const L = el.getTotalLength();
    el.style.strokeDasharray = `${L} ${L + 4}`;
    el.style.strokeDashoffset = String(L);
    el._L = L;
    el._op = el.getAttribute('opacity') || '1';
    el.setAttribute('opacity', '0');
    return el;
  });
}
function drawOn(el, p) {
  if (!el) return;
  p = clamp(p);
  el.style.strokeDashoffset = String(el._L * (1 - p));
  el.setAttribute('opacity', p > 0 ? el._op : '0');
}
function laid(el, t, t0, dur, rot, dy) {     // a sheet laid down: it comes up into place and settles, no drop
  const p = eo3(seg(t, t0, t0 + dur));
  // on screen from the first frame: a sheet that faded up from nothing showed 0.3 s of the dark blurred ground
  // first, which read as a blink at every cut into a sheet (v2 sample, 1:32)
  el.style.opacity = 1;
  el.style.transform = `translateY(${(1 - p) * (dy == null ? 28 : dy)}px) scale(${.985 + .015 * p}) rotate(${rot || 0}deg)`;
}
function inkIn(el, t, t0, dur) {             // the darkest lines first, then the shading and the tint
  if (!el) return;
  const p = seg(t, t0, t0 + dur), q = eo3(p);
  el.style.opacity = clamp(p * 2.4);
  el.style.filter = `brightness(${(1 + .95 * (1 - q)).toFixed(3)}) contrast(${(1 + .3 * (1 - q)).toFixed(3)}) saturate(${(.4 + .6 * q).toFixed(3)})`;
}
function wipe(el, t, t0, dur) {              // written on from left to right
  if (!el) return;
  const p = eo3(seg(t, t0, t0 + dur));
  // the right edge opens 40px past the box at the end: a handwriting face draws its last letter beyond its advance
  // width, and a clip that stopped at 0% cut every row's final T into a 1 ("THE COPPER PO1", cocina preview)
  el.style.clipPath = `inset(-40px calc(${((1 - p) * 100).toFixed(2)}% - ${(p * 40).toFixed(1)}px) -40px -40px)`;
  el.style.opacity = p > 0 ? 1 : 0;
}
function fadeUp(el, t, t0, dur, dy) {
  if (!el) return;
  const p = eo3(seg(t, t0, t0 + dur));
  el.style.opacity = p;
  el.style.transform = `translateY(${(1 - p) * (dy == null ? 10 : dy)}px)`;
}
function splitLabel(s) {                      // "crisp — dry skin, hotter pit" -> ["crisp", "dry skin, hotter pit"]
  const m = String(s || '').split(/\s+[—–-]\s+/);
  return [m[0] || '', m.slice(1).join(' — ')];
}
function inkBox(img) {                        // where the drawing really is inside its box: [x0, y0, x1, y1], 0-1
  try {
    const w = 220, h = Math.max(1, Math.round(220 * img.naturalHeight / Math.max(1, img.naturalWidth)));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11 < 205) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    }
    if (x1 <= x0 || y1 <= y0) return null;
    return [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h];
  } catch (e) { return null; }
}
function shown(box, img) {                    // the drawn picture's rect inside an object-fit:contain box, sheet px
  const bw = box.w, bh = box.h, r = img.naturalWidth / Math.max(1, img.naturalHeight);
  let w = bw, h = bw / r;
  if (h > bh) { h = bh; w = bh * r; }
  return {x: box.x + (bw - w) / 2, y: box.y + (bh - h) / 2, w, h};
}
function zoomInk(img, box, pad) {             // the drawing scaled so its INK fills the box, not its white margin
  const b = img && img.naturalWidth ? inkBox(img) : null;
  if (!b) return img && img.naturalWidth ? shown(box, img) : null;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const bw = (b[2] - b[0]) * iw, bh = (b[3] - b[1]) * ih;
  const s = Math.min(box.w * (1 - pad) / bw, box.h * (1 - pad) / bh);
  const cx = (b[0] + b[2]) / 2 * iw * s, cy = (b[1] + b[3]) / 2 * ih * s;
  Object.assign(img.style, {position: 'absolute', width: iw * s + 'px', height: ih * s + 'px', maxWidth: 'none',
                            objectFit: 'fill', left: (box.w / 2 - cx) + 'px', top: (box.h / 2 - cy) + 'px'});
  return {x: box.x + box.w / 2 - bw * s / 2, y: box.y + box.h / 2 - bh * s / 2, w: bw * s, h: bh * s};
}
const loaded = img => new Promise(res => { if (!img || img.complete) return res(); img.onload = img.onerror = () => res(); });

// ── the scenes ────────────────────────────────────────────────────────────────────────────────────────────────
function sheetHtml(inner, extra) {
  return `<div id="sheet" class="sheet" style="left:${SX}px;top:${SY}px;width:${SW}px;height:${SH}px;` +
         `${S.paper ? `background-image:url(${S.paper});` : ''}${extra || ''}">${inner}<div class="age"></div></div>`;
}

function build() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.body.style.background = '#17110C';
  grain(0.07);
  vig.style.background = 'radial-gradient(ellipse at 50% 48%,rgba(0,0,0,0) 48%,rgba(0,0,0,.5) 100%)';
  if (COC) document.body.classList.add('cocina');
  if (!S.ground && S.bench) {                  // no still for these seconds: his bench, out of focus
    ground.style.backgroundImage = `url(${S.bench})`;
    ground.style.filter = 'blur(7px) brightness(.6)';
  }
  const t = S.type === 'sign' ? 'strip' : S.type;
  parts = {type: t};

  if (t === 'illustration') {
    const src = S.art || S.image || '';
    const notes = (S.notes || []).slice(0, 3);
    scene.innerHTML = sheetHtml(`
      <div id="head" class="hd" style="position:absolute;left:0;top:46px;width:${SW}px;text-align:center;font-size:84px"></div>
      <div id="art" class="ink" style="left:250px;top:172px;width:1000px;height:640px">${src ? `<img src="${src}">` : ''}</div>
      <svg id="lines" class="draw" width="${SW}" height="${SH}"></svg>
      ${notes.map((o, i) => `<div class="note cd n${i}" style="opacity:0"><b>${esc(o.label || '')}</b><span>${esc(o.sub || '')}</span></div>`).join('')}
      <div id="cap" class="hd" style="position:absolute;left:150px;top:856px;width:1200px;text-align:center;font-size:42px;color:${RED};letter-spacing:.035em">${esc(S.caption || '')}</div>`);
    const head = document.getElementById('head'); head.textContent = S.head || '';
    fit(head, 1080, 84, 46);
    fit(document.getElementById('cap'), 1180, 42, 28);
    parts.sheet = document.getElementById('sheet'); parts.head = head; parts.art = document.getElementById('art');
    parts.cap = document.getElementById('cap');
    parts.notes = notes.map((_, i) => document.querySelector('.n' + i));
    parts.lines = [];
    const img = parts.art.querySelector('img');
    // the labels go where the drawing is not, and their lines end ON the drawing — so the drawing is measured first
    window.__wait = loaded(img).then(() => {
      const box = {x: 250, y: 172, w: 1000, h: 640};
      const r = zoomInk(img, box, .06) || {x: box.x + 160, y: box.y + 60, w: box.w - 320, h: box.h - 120};
      const svg = document.getElementById('lines');
      let html = '';
      const left = [], right = [], order = [];
      notes.forEach((o, i) => ((Number(o.x) || 0) < 810 ? left : right).push(i));
      const place = (ids, side) => {
        // each label beside the drawing, at the height the director asked for (kept within the drawing), then
        // pushed apart so two labels never sit on each other
        const rows = ids.map((i, k) => {
          const el = parts.notes[i], o = notes[i], w = el.offsetWidth, h = el.offsetHeight;
          const want = Number(o.y) ? Number(o.y) * SH / 860 : r.y + r.h * (k + 1) / (ids.length + 1);
          let x = side < 0 ? Math.max(36, r.x - 70 - w) : Math.min(SW - 40 - w, r.x + r.w + 70);
          return {i, el, w, h, x, y: clamp(clamp(want, r.y + h * .3, r.y + r.h - h * .3) - h / 2, 150, SH - 190)};
        }).sort((a, b) => a.y - b.y);
        rows.forEach((q, k) => { if (k && q.y < rows[k - 1].y + rows[k - 1].h + 18) q.y = rows[k - 1].y + rows[k - 1].h + 18; });
        rows.forEach(q => {
          if (side > 0 && q.x + q.w > FREE_X && q.y + q.h > FREE_Y) q.y = Math.min(q.y, FREE_Y - q.h - 20);
          const {i, el, w, h, x, y} = q;
          el.style.left = x + 'px'; el.style.top = y + 'px';
          if (side < 0) el.style.textAlign = 'right';
          const ax = side < 0 ? r.x + r.w * .2 : r.x + r.w * .8;
          const ay = clamp(y + h * .5, r.y + r.h * .18, r.y + r.h * .82);
          const lx = side < 0 ? x + w + 14 : x - 14, ly = y + h * .5;
          html += path(stroke(lx, ly, ax, ay, 0, 0), INK, 2.4, .9) +
                  `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="7" fill="${INK}" class="d${i}" opacity="0"/>`;
          order.push(i);
        });
      };
      place(left, -1); place(right, 1);
      svg.innerHTML = html;
      const drawn = armLines(svg);
      parts.lines = []; parts.dots = [];
      order.forEach((i, k) => { parts.lines[i] = drawn[k]; parts.dots[i] = svg.querySelector('.d' + i); });
    });
  }

  if (t === 'versus') {
    const L = S.left || {}, R = S.right || {};
    const [ln, ls] = splitLabel(L.label), [rn, rs] = splitLabel(R.label);
    const steps = (S.steps || []).slice(0, 3);
    // two drawings across the sheet, their names in red ribbons under them, and the method down the right-hand
    // column — which stops above the corner the presenter's disc may take
    const cols = steps.length ? [[100, 590], [700, 590]] : [[150, 690], [910, 690]];
    scene.innerHTML = sheetHtml(`
      <div id="head" class="hd" style="position:absolute;left:0;top:46px;width:${SW}px;text-align:center;font-size:82px"></div>
      <div id="la" class="ink" style="left:${cols[0][0]}px;top:170px;width:${cols[0][1]}px;height:470px">${L.art ? `<img src="${L.art}">` : ''}</div>
      <div id="ra" class="ink" style="left:${cols[1][0]}px;top:170px;width:${cols[1][1]}px;height:470px">${R.art ? `<img src="${R.art}">` : ''}</div>
      <div id="lr" class="abs" style="opacity:0"><div class="ribbon hd">${esc(ln)}</div></div>
      <div id="rr" class="abs" style="opacity:0"><div class="ribbon hd">${esc(rn)}</div></div>
      <div id="ls" class="cd" style="position:absolute;left:${cols[0][0]}px;top:748px;width:${cols[0][1]}px;text-align:center;font-size:30px;color:${INK};opacity:0">${esc(ls)}</div>
      <div id="rs" class="cd" style="position:absolute;left:${cols[1][0]}px;top:748px;width:${cols[1][1]}px;text-align:center;font-size:30px;color:${INK};opacity:0">${esc(rs)}</div>
      <svg id="arrows" class="draw" width="${SW}" height="${SH}"></svg>
      ${steps.map((s, i) => `<div class="tag cd st${i}" style="opacity:0">${esc(s)}</div>`).join('')}`);
    const head = document.getElementById('head'); head.textContent = S.head || '';
    fit(head, 1080, 82, 44);
    const lr = document.getElementById('lr'), rr = document.getElementById('rr');
    [[lr, cols[0]], [rr, cols[1]]].forEach(([el, c]) => {
      fit(el.firstChild, c[1] - 40, 42, 26);
      el.style.left = (c[0] + c[1] / 2 - el.offsetWidth / 2) + 'px'; el.style.top = '664px';
    });
    // the method: red tags joined by drawn arrows, top of the right-hand column
    const tags = steps.map((_, i) => document.querySelector('.st' + i));
    let arrows = '';
    const cx = 1490, gap = 118;
    tags.forEach((el, i) => {
      fit(el, 420, 32, 22);
      el.style.left = (cx - el.offsetWidth / 2) + 'px'; el.style.top = (190 + i * gap) + 'px';
      if (i) {
        const y0 = 190 + (i - 1) * gap + tags[i - 1].offsetHeight + 10, y1 = 190 + i * gap - 10;
        arrows += path(`M${cx},${y0} L${cx},${y1}`, RED, 5) + path(`M${cx - 13},${y1 - 14} L${cx},${y1} L${cx + 13},${y1 - 14}`, RED, 5);
      }
    });
    const svg = document.getElementById('arrows'); svg.innerHTML = arrows;
    Object.assign(parts, {sheet: document.getElementById('sheet'), head, la: document.getElementById('la'),
                          ra: document.getElementById('ra'), lr, rr, ls: document.getElementById('ls'),
                          rs: document.getElementById('rs'), tags, arrows: armLines(svg)});
    const li = parts.la.querySelector('img'), ri = parts.ra.querySelector('img');
    window.__wait = Promise.all([loaded(li), loaded(ri)]).then(() => {
      zoomInk(li, {x: cols[0][0], y: 170, w: cols[0][1], h: 470}, .08);
      zoomInk(ri, {x: cols[1][0], y: 170, w: cols[1][1], h: 470}, .08);
    });
  }

  if (t === 'strip') {
    const src = S.photo || '';
    scene.innerHTML = `
      <div id="ph" class="abs" style="left:-48px;top:-27px;width:2016px;height:1134px;background:#1d1610">${src ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block">` : ''}</div>
      <div id="sw" class="wrap" style="left:58px;top:790px">
        <div id="strip" class="strip" style="height:158px;padding:0 70px;${S.paper ? `background-image:url(${S.paper});` : ''}">
          <span id="tx" class="hd" style="display:inline-block;font-size:94px;line-height:166px;color:#21170F"></span></div>
        <svg id="marks" class="draw" width="1700" height="220"></svg>
      </div>`;
    if (!src && S.ground) document.getElementById('ph').style.display = 'none';
    const tx = document.getElementById('tx'); tx.textContent = S.text || '';
    if (COC) { tx.className = 'hw'; tx.style.color = INK; }        // her handwriting on a strip of masking tape
    fit(tx, 1120, COC ? 124 : 94, 48);
    const strip = document.getElementById('strip');
    if (S.ok) strip.style.paddingRight = '178px';
    const w = strip.offsetWidth, h = strip.offsetHeight;
    strip.style.clipPath = COC ? tornEnds(w, h, 12) : torn(w, h, 10, 14);
    const tl = tx.offsetLeft, tw = tx.offsetWidth, mid = h * .53;
    let marks = '';
    if (S.cross) {                              // the belief he kills: struck through in red grease pencil, twice over
      marks += path(stroke(tl - 22, mid + 7, tl + tw + 22, mid - 8, -6, 6), RED, 15, .93);
      marks += path(stroke(tl - 8, mid + 1, tl + tw + 12, mid - 4, -4, 5), RED, 7, .7);
    }
    if (S.ok) marks += path(tickD(tl + tw + 44, 30, 92), GREEN, 15);
    const svg = document.getElementById('marks'); svg.innerHTML = marks;
    Object.assign(parts, {ph: document.getElementById('ph'), sw: document.getElementById('sw'), marks: armLines(svg)});
  }

  if (t === 'photocard') {
    const src = S.photo || S.image || '';
    const grade = S.old ? 'filter:sepia(.55) saturate(.8) contrast(1.06) brightness(1.04)' : 'filter:saturate(.92) contrast(1.03)';
    scene.innerHTML = `
      <div id="card" class="print" style="left:170px;top:92px;width:1210px;height:806px">
        <div class="ph">${src ? `<img src="${src}" style="${grade}">` : ''}</div></div>
      <div id="t1" class="tape" style="left:118px;top:70px;width:212px;height:58px;opacity:0"></div>
      <div id="t2" class="tape" style="left:1262px;top:66px;width:190px;height:54px;opacity:0"></div>
      <div id="lw" class="wrap" style="left:118px;top:846px;opacity:0">
        <div id="lab" class="strip" style="height:112px;padding:0 50px;${S.paper ? `background-image:url(${S.paper});` : ''}">
          <span id="lt" class="hd" style="display:inline-block;font-size:62px;line-height:118px;color:#21170F">${esc(S.label || '')}</span></div></div>`;
    const t1 = document.getElementById('t1'), t2 = document.getElementById('t2');
    t1.style.clipPath = torn(212, 58, 5, 8); t2.style.clipPath = torn(190, 54, 5, 8);
    if (COC) { const lt = document.getElementById('lt'); lt.className = 'hw'; lt.style.fontSize = '78px'; }
    fit(document.getElementById('lt'), 820, COC ? 78 : 62, 34);
    const lab = document.getElementById('lab');
    lab.style.clipPath = torn(lab.offsetWidth, lab.offsetHeight, 7, 12);
    if (!String(S.label || '').trim()) document.getElementById('lw').style.display = 'none';
    Object.assign(parts, {card: document.getElementById('card'), t1, t2, lw: document.getElementById('lw')});
  }

  if (t === 'notepad') {
    const rows = (S.rows || []).slice(0, 8);
    let rings = '';
    for (let i = 0; i < 13; i++) {
      const y = 46 + i * 68;
      rings += `<div class="abs" style="left:34px;top:${y + 8}px;width:22px;height:22px;border-radius:50%;background:#2a221a;box-shadow:inset 0 2px 3px rgba(0,0,0,.6)"></div>` +
               `<div class="abs" style="left:-26px;top:${y}px;width:74px;height:20px;border-radius:10px;` +
               `background:linear-gradient(180deg,#d8d4cb,#8f8a80 60%,#5e5a52);box-shadow:0 3px 4px rgba(0,0,0,.45)"></div>`;
    }
    scene.innerHTML = `
      <div id="pad" class="sheet" style="left:250px;top:58px;width:1280px;height:962px;background-color:#F3EDDC;${S.paper ? `background-image:url(${S.paper});` : ''}">
        <div class="abs" style="left:0;right:0;bottom:0;top:96px;background:repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 78px,rgba(74,108,160,.30) 78px 80px)"></div>
        <div class="abs" style="left:150px;top:0;bottom:0;width:2px;background:rgba(190,60,50,.45)"></div>
        ${rings}
        <div id="title" class="hw" style="position:absolute;left:190px;top:84px;font-size:${COC ? 74 : 68}px;line-height:80px;color:#2B2A33;text-transform:${COC ? 'none' : 'uppercase'};white-space:nowrap;opacity:0">${esc(S.head || '')}</div>
        ${rows.map((r, i) => `<div class="hw r" style="position:absolute;left:190px;top:${178 + i * 80}px;font-size:${COC ? 66 : 60}px;line-height:76px;color:#2B2A33;text-transform:${COC ? 'none' : 'uppercase'};white-space:nowrap;opacity:0">${esc(r)}</div>`).join('')}
        <div id="big" class="hd" style="position:absolute;left:790px;top:130px;width:450px;text-align:center;font-size:300px;line-height:.9;color:${RED};opacity:0">${esc(S.value || '')}</div>
        <div id="unit" class="hd" style="position:absolute;left:790px;top:410px;width:450px;text-align:center;font-size:84px;color:${INK};opacity:0">${esc(S.unit || '')}</div>
        <div class="age"></div>
      </div>`;
    fit(document.getElementById('big'), 450, 300, 120);
    fit(document.getElementById('unit'), 450, 84, 40);
    fit(document.getElementById('title'), 1000, COC ? 74 : 68, 40);
    [...document.querySelectorAll('.r')].forEach(el => fit(el, 580, COC ? 66 : 60, 32));
    Object.assign(parts, {pad: document.getElementById('pad'), title: document.getElementById('title'),
                          rows: [...document.querySelectorAll('.r')], big: document.getElementById('big'),
                          unit: document.getElementById('unit')});
  }
}

function frame(t) {
  const ty = parts.type;
  const c = ss(clamp(t / D));
  // one slow, even push for the whole scene: the ground a little more than the paper, so the paper floats
  if (ty === 'strip') {
    if (parts.ph) parts.ph.style.transform = `scale(${(1.0 + .06 * c).toFixed(4)}) translateX(${(-16 * c).toFixed(2)}px)`;
  } else {
    ground.style.transform = `scale(${(1.03 + .05 * c).toFixed(4)})`;
    scene.style.transform = `scale(${(1 + .024 * c).toFixed(4)})`;
  }

  if (ty === 'illustration') {
    laid(parts.sheet, t, 0, .7, -.25);
    wipe(parts.head, t, .35, .6);
    inkIn(parts.art, t, .55, 1.15);
    const lines = parts.lines || [], dots = parts.dots || [];
    parts.notes.forEach((el, i) => {
      const a = 1.55 + i * .38;
      drawOn(lines[i], ss(seg(t, a, a + .42)));
      if (dots[i]) dots[i].setAttribute('opacity', seg(t, a + .36, a + .5) > 0 ? String(eo3(seg(t, a + .36, a + .5))) : '0');
      fadeUp(el, t, a + .05, .35, 8);
    });
    wipe(parts.cap, t, 1.75 + parts.notes.length * .38, .6);
  }

  if (ty === 'versus') {
    laid(parts.sheet, t, 0, .7, .2);
    wipe(parts.head, t, .32, .6);
    inkIn(parts.la, t, .55, 1.05);
    inkIn(parts.ra, t, .9, 1.05);
    [parts.lr, parts.rr].forEach((el, i) => wipe(el, t, 1.65 + i * .3, .45));
    fadeUp(parts.ls, t, 1.85, .35, 6); fadeUp(parts.rs, t, 2.15, .35, 6);
    parts.tags.forEach((el, i) => {
      const a = 2.45 + i * .42;
      if (i) parts.arrows.slice((i - 1) * 2, i * 2).forEach(p => drawOn(p, ss(seg(t, a - .2, a + .05))));
      fadeUp(el, t, a, .32, 10);
    });
  }

  if (ty === 'strip') {
    const p = eo3(seg(t, .12, .62));
    parts.sw.style.opacity = clamp(seg(t, .12, .42));
    parts.sw.style.transform = `translateX(${((1 - p) * -80).toFixed(2)}px) rotate(${(-1.3 - (1 - p) * 1.2).toFixed(3)}deg)`;
    parts.marks.forEach((el, i) => drawOn(el, ss(seg(t, .78 + i * .1, 1.18 + i * .1))));
  }

  if (ty === 'photocard') {
    const p = eo3(seg(t, 0, .75));
    parts.card.style.opacity = 1;
    parts.card.style.transform = `translate(${((1 - p) * -26).toFixed(2)}px,${((1 - p) * 34).toFixed(2)}px) rotate(${(-1.7 - (1 - p) * 2.2).toFixed(3)}deg)`;
    [[parts.t1, .62, -31], [parts.t2, .78, 27]].forEach(([el, a, r]) => {
      const q = eo3(seg(t, a, a + .2));
      el.style.opacity = q * .96;
      el.style.transform = `rotate(${r}deg) scale(${(1.07 - .07 * q).toFixed(3)})`;
    });
    const q = eo3(seg(t, 1.0, 1.45));
    parts.lw.style.opacity = parts.lw.style.display === 'none' ? 0 : clamp(seg(t, 1.0, 1.25));
    parts.lw.style.transform = `translateX(${((1 - q) * -60).toFixed(2)}px) rotate(-2deg)`;
  }

  if (ty === 'notepad') {
    laid(parts.pad, t, 0, .7, -.6);
    wipe(parts.title, t, .45, .55);
    let a = .95;
    parts.rows.forEach(el => {
      const len = Math.max(4, el.textContent.length);
      const d = .22 + .016 * len;
      wipe(el, t, a, d);
      a += d + .1;
    });
    wipe(parts.big, t, a + .1, .5);
    fadeUp(parts.unit, t, a + .5, .4, 8);
  }
}
