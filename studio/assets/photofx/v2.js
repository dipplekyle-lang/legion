/* PHOTO FX v2 — autostyle v2's renderer: page.js plus a look per title.

   page.js is left exactly as it is (every style without the v2 keys keeps drawing with it). This file is a superset:
   a scene without v2 keys draws here exactly as there; a scene with "v": 2 may carry
     spotlight  cam (push | pull | pan | snap), ground (photofx.SPOT_GROUNDS, baked into dim/soft by photofx.py),
                rimUnder / rimOver (the title's glow family as light on the cut-out subject), subjShadow (paper ground)
     objects    item.enter (+ turntable, float, plinth_rise), item.glow (a light layer under the thing),
                item.plinth, label {style exhibit_card | leader_callout | stencil_tag, text, detail, kicker, n, at, box}
     textcut    style {font, weight, accent, ink, place, fx chroma | glow | none | stamp, flash, bright, sat, rule, glow}
   Fonts are embedded by photofx.py (@font-face). Every frame is drawn from t alone, in any order. Anything that moves
   the frame eases with smoothstep; springs are for objects only, never for type. */
(function () {
  const S = window.SCENE;
  const FW = window.PFX_W || 1920, FH = window.PFX_H || 1080;
  const cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const seg = (t, s, d) => cl((t - s) / Math.max(1e-6, d), 0, 1);
  const lerp = (a, b, p) => a + (b - a) * p;
  const eOut = p => 1 - Math.pow(1 - p, 3);
  const eInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const ss = p => p * p * (3 - 2 * p);
  const eBack = p => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  // a damped spring from 0 to 1: f = how many swings a second, z = how quickly they die (0..1)
  function spring(t, f, z) {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  const hex = (h, a) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(h || ''));
    const n = m ? parseInt(m[1], 16) : 0xffe7c2;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a == null ? 1 : a})`;
  };
  const mixHex = (h, w, p) => {           // a colour moved toward white by p (0..1), as #rrggbb
    const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); const n = m ? parseInt(m[1], 16) : 0xffe7c2;
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 * w - v) * p));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  };

  const root = document.getElementById('stage');
  const waits = [];
  function el(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    (parent || root).appendChild(e);
    return e;
  }
  function pic(src, cls, parent, w, h) {
    const i = el('img', cls, parent);
    waits.push(new Promise(res => { i.onload = i.onerror = res; }));
    i.src = src;
    if (w) { i.style.width = w + 'px'; i.style.height = h + 'px'; }
    return i;
  }
  const show = (e, on) => { const v = on ? 'visible' : 'hidden'; if (e.style.visibility !== v) e.style.visibility = v; };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  let frame = () => {};

  if (S.type === 'spotlight') {
    // two cameras with the same move: the picture (and, in v2, the light or shade under the subject), then the
    // vignette, then the subject above both — so the darkening at the edges never touches the subject
    const cam = el('div', 'cam');
    const plate = pic(S.plate, 'layer', cam, S.cw, S.ch);
    const dim = pic(S.dim, 'layer', cam, S.cw, S.ch);
    const soft = pic(S.soft, 'layer', cam, S.cw, S.ch);
    const origin = `${S.anchor[0]}px ${S.anchor[1]}px`;
    // paper ground: the subject's shadow on the paper; a glow family: its light round the subject — both in the
    // picture's camera so a light layer screens onto the photo itself
    const shadowL = S.subjShadow ? pic(S.subjShadow, 'layer', cam, S.cw, S.ch) : null;
    const rimU = S.rimUnder ? pic(S.rimUnder, 'layer', cam, S.cw, S.ch) : null;
    if (rimU && S.rimFamily !== 'soft') rimU.style.mixBlendMode = 'screen';
    const vig = el('div', 'vig');
    const cam2 = el('div', 'cam');
    let subj = null;
    if (S.subj) subj = pic(S.subj, 'layer', cam2, S.cw, S.ch);
    const rimO = S.rimOver ? pic(S.rimOver, 'layer', cam2, S.cw, S.ch) : null;
    if (rimO) rimO.style.mixBlendMode = 'screen';
    for (const e of [shadowL, rimU, subj, rimO]) if (e) e.style.transformOrigin = origin;
    const CAM = S.cam || 'push';

    // a wide camera (pull, pan) stays inside the part of the photo the background remover saw (S.win, canvas px):
    // beyond it nobody was cut out cleanly. Start and end are placed inside it; as the zoom moves linearly, a centre
    // moving linearly between two valid centres stays valid all the way (the bounds are convex in the zoom).
    const WIN = S.win && (CAM === 'pull' || CAM === 'pan') ? S.win : [0, 0, S.cw, S.ch];
    const zWin = Math.max(1, S.cw / Math.max(1, WIN[2] - WIN[0]), S.ch / Math.max(1, WIN[3] - WIN[1]));
    const inWin = (z, x, y) => {
      const hw = S.cw / (2 * z), hh = S.ch / (2 * z);
      return [cl(x, WIN[0] + hw, WIN[2] - hw), cl(y, WIN[1] + hh, WIN[3] - hh)];
    };
    // where the camera looks: {z, cx, cy} in canvas pixels
    function camAt(t) {
      const D = S.duration, hit = S.hit;
      if (CAM === 'pull') {
        // a reveal: it opens tight on the subject and pulls back to the photograph round them
        const p = ss(seg(t, 0.0, D - 0.15));
        const zEnd = Math.max(1.0 + S.creep, zWin);
        const a = inWin(S.zoom, S.focus[0], S.focus[1]), b = inWin(zEnd, (WIN[0] + WIN[2]) / 2, (WIN[1] + WIN[3]) / 2);
        return { z: lerp(S.zoom, zEnd, p), cx: lerp(a[0], b[0], p), cy: lerp(a[1], b[1], p) };
      }
      if (CAM === 'pan') {
        // a slow lateral travel from the far side of a wide photo onto the subject
        const p = ss(seg(t, 0.0, D));
        const z0 = Math.max(Math.min(1.15, S.zoom), zWin), z1 = Math.max(Math.min(S.zoom, 1.45), 1.15, zWin);
        const dir = S.focus[0] < S.cw / 2 ? 1 : -1;
        const a = inWin(z0, S.focus[0] + dir * S.cw * 0.42, S.ch / 2), b = inWin(z1, S.focus[0], lerp(S.ch / 2, S.focus[1], 0.6));
        return { z: lerp(z0, z1, p), cx: lerp(a[0], b[0], p), cy: lerp(a[1], b[1], p) };
      }
      if (CAM === 'snap') {
        // two quick steps in: half way on the word, the rest a beat later
        const z1 = 1 + (S.zoom - 1) * 0.5;
        const a = ss(seg(t, hit - 0.06, 0.16)), b = ss(seg(t, hit + 1.05, 0.16));
        const p = 0.55 * a + 0.45 * b;
        return { z: 1 + S.creep * seg(t, 0, D) + (z1 - 1) * a + (S.zoom - z1) * b,
                 cx: lerp(S.cw / 2, S.focus[0], p), cy: lerp(S.ch / 2, S.focus[1], p) };
      }
      // push (today's): a slow push from the first frame, then the real move toward the subject
      const move = eInOut(seg(t, 0.1, D - 0.1));
      const pan = eInOut(seg(t, 0, D * 0.85));
      return { z: 1 + S.creep * seg(t, 0, D) + (S.zoom - 1 - S.creep) * move,
               cx: lerp(S.cw / 2, S.focus[0], pan), cy: lerp(S.ch / 2, S.focus[1], pan) };
    }

    frame = t => {
      const hit = S.hit;
      const c = camAt(t);
      const s = (FW / S.cw) * c.z;
      const hw = FW / (2 * s), hh = FH / (2 * s);
      const cx = cl(c.cx, hw, S.cw - hw);
      const cy = cl(c.cy, hh, S.ch - hh);
      cam.style.transform = cam2.style.transform =
        `translate(${FW / 2}px,${FH / 2}px) scale(${s}) translate(${-cx}px,${-cy}px)`;
      const d = eInOut(seg(t, hit - 0.35, 1.1));
      const f = eInOut(seg(t, hit + 0.45, 1.6));
      dim.style.opacity = d;
      soft.style.opacity = f;
      // a layer fully covered by an opaque one above it is not drawn at all (without a cutout the
      // darker layers carry an oval of light, so the sharp picture must stay underneath)
      show(plate, !S.opaque || d < 0.999);
      show(dim, d > 0.001 && f < 0.999);
      show(soft, f > 0.001);
      const pop = `scale(${lerp(1, S.pop, eOut(seg(t, hit - 0.2, 2.4)))})`;
      if (subj) subj.style.transform = pop;
      const r = ss(seg(t, hit - 0.25, 1.0));
      for (const e of [rimU, rimO]) if (e) { e.style.transform = pop; e.style.opacity = r.toFixed(3); show(e, r > 0.001); }
      if (shadowL) { shadowL.style.transform = pop; shadowL.style.opacity = f.toFixed(3); show(shadowL, f > 0.001); }
      vig.style.opacity = S.vignette * d;
    };
  }

  if (S.type === 'objects') {
    const ground = el('div', 'ground');
    const bg = pic(S.bg, 'bg', ground, FW, FH);
    // the world (the things, their shadows, light and plinths) is scaled as a whole; in v2 that scale is folded into
    // every element's own transform, so a light layer can screen onto the ground (a scaled parent would isolate it)
    const OX = 0.5 * FW, OY = 0.56 * FH;
    const v2 = S.v === 2;
    const world = el('div', 'world');
    const plinths = S.items.filter(it => it.plinth);
    let spot = null, spotVig = null;
    if (plinths.length) {
      // a museum spot from above on every plinth, the rest of the room a little darker
      spotVig = el('div', 'layer', root);
      Object.assign(spotVig.style, { width: FW + 'px', height: FH + 'px', opacity: '0',
        background: 'radial-gradient(ellipse 62% 74% at 50% 42%, rgba(0,0,0,0) 34%, rgba(0,0,0,.62) 100%)' });
      spot = el('div', 'layer', root);
      Object.assign(spot.style, { width: FW + 'px', height: FH + 'px', opacity: '0', mixBlendMode: 'screen',
        background: plinths.map(it => `radial-gradient(ellipse ${Math.round(Math.max(it.plinth.w * 0.9, 260))}px ${Math.round(FH * 0.95)}px at ${it.x}px -6%, rgba(255,242,220,.46) 0%, rgba(255,236,205,.16) 46%, rgba(0,0,0,0) 72%)`).join(',') });
    }
    const layer = v2 ? root : world;
    const rows = S.items.map((it, i) => {
      const r = { it, phase: 0.9 + i * 1.7 };
      if (it.plinth) {
        // a dark satin plinth, its top face catching the spot, a contact shadow under the thing
        const p = el('div', 'thing', layer);
        r.pl = p;
        // matte warm charcoal, lit only from the spot above: the front face falls off into the dark room below (no
        // box bottom ever shows), its vertical edges catch a little of the light
        Object.assign(p.style, { width: it.plinth.w + 'px', height: (FH + 60 - it.plinth.top) + 'px', visibility: 'hidden', transformOrigin: '50% 0',
          background: 'linear-gradient(180deg, rgba(255,236,210,.13) 0%, rgba(255,236,210,.03) 9%, rgba(0,0,0,0) 20%, rgba(0,0,0,.42) 46%, rgba(0,0,0,.8) 72%, rgba(0,0,0,.94) 100%),' +
                      'linear-gradient(90deg,#121110 0%,#2a2826 7%,#2f2d2a 24%,#292724 62%,#1c1b19 90%,#0e0d0c 100%)',
          boxShadow: '0 -3px 26px rgba(0,0,0,.35)' });
        // the top face, seen a little from above, a pool of the spot's light on it; the thing stands in the middle
        const topF = el('div', '', p);
        Object.assign(topF.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '16px',
          background: 'radial-gradient(ellipse 46% 160% at 50% 40%, rgba(255,240,218,.32) 0%, rgba(255,240,218,0) 100%),' +
                      'linear-gradient(180deg,#5d5a55 0%,#46433f 60%,#363431 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,246,230,.3), 0 1px 0 rgba(0,0,0,.55)' });
        const contact = el('div', '', p);
        Object.assign(contact.style, { position: 'absolute', left: '18%', width: '64%', top: '2px', height: '13px',
          borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 72%)' });
      }
      r.sh = pic(it.shadow, 'thing', layer, it.sw, it.sh);
      if (it.glow) {
        r.gl = pic(it.glow, 'thing', layer, it.gw, it.gh);
        r.gl.style.mixBlendMode = it.gblend === 'screen' ? 'screen' : 'normal';
      }
      r.im = pic(it.src, 'thing', layer, it.w, it.h);
      if (it.glowOver) {
        // the rim family's light on the thing's own edge, screened over it
        r.go = pic(it.glowOver, 'thing', layer, it.w, it.h);
        r.go.style.mixBlendMode = 'screen';
      }
      if (it.enter === 'turntable') {
        // the light sliding across the thing as it turns: a soft band, masked by the thing itself
        r.sheen = el('div', 'thing', layer);
        Object.assign(r.sheen.style, { width: it.w + 'px', height: it.h + 'px', mixBlendMode: 'screen',
          background: 'linear-gradient(100deg, rgba(255,255,255,0) 44%, rgba(255,250,240,.36) 50%, rgba(255,255,255,0) 56%)',
          backgroundSize: '320% 100%', WebkitMaskImage: `url(${it.src})`, maskImage: `url(${it.src})`,
          WebkitMaskSize: '100% 100%', maskSize: '100% 100%' });
      }
      return r;
    });
    for (const r of rows) r.im.style.transformOrigin = r.it.enter === 'drop' ? '50% 100%' : '50% 50%';
    let label = null;
    if (S.label && S.label.text && !S.label.style) {
      label = el('div', 'label', root);
      label.textContent = S.label.text;
      label.style.left = S.label.x + 'px';
      label.style.top = S.label.y + 'px';
    }
    const L = S.label && S.label.style ? S.label : null;
    const labelLayer = L ? el('div', 'layer', root) : null;
    if (labelLayer) Object.assign(labelLayer.style, { width: FW + 'px', height: FH + 'px', transformOrigin: '0 0', pointerEvents: 'none' });

    // where a thing is `u` seconds after it starts to enter: {x, y, rot, sc, lift, ry, op, light}; lift 0 = at rest
    function move(it, u, phase) {
      let x = it.x, y = it.y, rot = 0, sc = 1, lift = 0, ry = 0, op = 1, light = 1;
      const E = it.enter;
      let idleK = 1, idleAt = 0.9;
      if (E === 'drop') {
        const fall = 0.4;
        if (u < fall) {
          const p = u / fall;
          y = lerp(-it.h * 0.75, it.y, p * p);
          rot = it.rot * (1 - 0.35 * p);
          lift = 1 - p * p;
        } else {
          const v = u - fall;
          const hop = Math.abs(Math.sin(v * 9.0)) * Math.exp(-v * 7.0);
          y = it.y - hop * it.h * 0.07;
          rot = it.rot * 0.65 * Math.exp(-v * 3.4) * Math.cos(v * 12.5);
          lift = hop * 0.35;
        }
      } else if (E === 'pop') {
        const p = seg(u, 0, 0.5);
        sc = Math.max(0.001, eBack(p));
        rot = it.rot * (1 - eOut(p));
        lift = 1 - p;
      } else if (E === 'turntable') {
        // a museum piece on a turntable: it rises a little while it turns to face the camera (never past 35 degrees:
        // the thing is a flat photograph), the light sliding across it
        const k = spring(u, 0.9, 0.7);
        const p = ss(seg(u, 0, 1.4));
        y = lerp(it.y + it.h * 0.14, it.y, k);
        op = ss(seg(u, 0, 0.35));
        ry = -34 * (1 - p);
        sc = lerp(0.94, 1, cl(k, 0, 1.2));
        lift = cl(1 - k, 0, 1) * 0.5;
        light = 1 - 0.3 * Math.abs(ry) / 34;
        idleAt = 1.4;
      } else if (E === 'float') {
        // weightless: it drifts in slowly, tilted, and keeps drifting; its shadow stays far and faint
        const p = ss(seg(u, 0, 1.3));
        x = lerp(it.x - FW * 0.05, it.x, p);
        y = lerp(it.y + FH * 0.16, it.y, p);
        op = ss(seg(u, 0, 0.5));
        rot = it.rot * (1.6 - 0.6 * p);
        sc = lerp(0.96, 1, p);
        lift = 0.65;
        idleK = 2.3; idleAt = 1.0;
      } else if (E === 'plinth_rise') {
        // a lift: the plinth and the thing on it rise from below the frame and stop, no bounce
        const p = ss(seg(u, 0, 1.2));
        y = it.y + (1 - p) * FH * 0.62;
        idleK = 0.25; idleAt = 1.2;
      } else {
        const k = spring(u, 1.05, 0.6);
        const r = spring(u, 0.85, 0.45);
        if (E === 'left' || E === 'right') {
          const from = E === 'left' ? -it.w * 0.7 : FW + it.w * 0.7;
          x = lerp(from, it.x, k);
          y = it.y + (1 - k) * it.h * 0.12;
        } else {
          y = lerp(FH + it.h * 0.65, it.y, k);
        }
        rot = it.rot * (1 - r);
        sc = lerp(0.9, 1, cl(k, 0, 1.3));
        lift = cl(1 - k, 0, 1);
      }
      // once it has settled, it keeps breathing a little
      const idle = seg(u, idleAt, 0.9) * idleK;
      y += idle * it.h * 0.006 * Math.sin(u * 2 * Math.PI / (E === 'float' ? 4.6 : 3.3) + phase);
      rot += idle * 0.6 * Math.sin(u * 2 * Math.PI / (E === 'float' ? 5.8 : 4.4) + phase);
      return { x, y, rot, sc, lift, ry, op, light };
    }

    // the label, laid out once the fonts are in (frame 0 runs after document.fonts.ready)
    let lab = null;
    function buildLabel() {
      const F = L.fonts || {}, acc = L.accent || '#B8862F';
      const [bx, by, bw, bh] = L.box;
      const dir = L.side === 'left' ? -1 : 1;
      const o = { kind: L.style };
      if (L.style === 'exhibit_card') {
        // a museum label: warm white card, number, the thing's name in the serif, one fact under it
        const card = el('div', '', labelLayer);
        Object.assign(card.style, { position: 'absolute', left: '0', top: '0', maxWidth: '470px', padding: '20px 28px 22px 26px',
          background: '#F1ECE2', color: '#1B1915', borderRadius: '2px', opacity: '0',
          boxShadow: '0 22px 50px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.35)' });
        const k = el('div', '', card);
        k.textContent = `${L.kicker} ${String(L.n).padStart(2, '0')}`;
        Object.assign(k.style, { font: `700 16px '${F.mono}', 'Courier New', monospace`, letterSpacing: '.24em', color: mixHex(acc, 0, 0.18) });
        const rule = el('div', '', card);
        Object.assign(rule.style, { height: '1px', background: 'rgba(27,25,21,.28)', margin: '11px 0 12px' });
        const tt = el('div', '', card);
        tt.textContent = L.text;
        Object.assign(tt.style, { font: `500 40px/1.08 '${F.serif}', Georgia, serif`, color: '#16130F' });
        if (L.detail) {
          const d = el('div', '', card);
          d.textContent = L.detail;
          Object.assign(d.style, { font: `600 20px/1.3 '${F.body}', 'Inter', Arial, sans-serif`, color: '#5B554B', marginTop: '9px', letterSpacing: '.02em' });
        }
        const cw = card.offsetWidth, ch = card.offsetHeight;
        let left = dir > 0 ? bx + bw + 52 : bx - 52 - cw;
        left = cl(left, 70, FW - 70 - cw);
        const top = cl(by + bh * 0.58 - ch / 2, 110, FH - 96 - ch);
        card.style.left = left + 'px'; card.style.top = top + 'px';
        o.card = card;
      } else if (L.style === 'leader_callout') {
        // a spec-sheet callout: a dot on the thing, a thin line out to its name, one fact under the line
        const svg = svgEl('svg', { width: FW, height: FH, viewBox: `0 0 ${FW} ${FH}` }, labelLayer);
        Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
        const name = el('div', '', labelLayer);
        name.textContent = L.text;
        Object.assign(name.style, { position: 'absolute', font: `500 42px/1 '${F.cond}', 'Oswald', sans-serif`, letterSpacing: '.06em',
          textTransform: 'uppercase', color: '#FFFFFF', whiteSpace: 'nowrap', textShadow: '0 2px 14px rgba(0,0,0,.55)' });
        let det = null;
        if (L.detail) {
          det = el('div', '', labelLayer);
          det.textContent = L.detail;
          Object.assign(det.style, { position: 'absolute', font: `400 20px/1 '${F.mono}', 'Courier New', monospace`, letterSpacing: '.08em',
            color: 'rgba(255,255,255,.78)', whiteSpace: 'nowrap', textShadow: '0 2px 10px rgba(0,0,0,.6)' });
        }
        // the dot sits ON the thing (L.pin: photofx found the opaque point nearest this spot of its box)
        const ax = L.pin ? L.pin[0] : bx + bw * (dir > 0 ? 0.7 : 0.3), ay = L.pin ? L.pin[1] : by + bh * 0.3;
        const ex = cl(ax + dir * 96, 80, FW - 80), ey = Math.max(150, ay - 92);
        // a long name never runs off the frame: smaller first (down to 28 px), then on two lines
        const room = (dir > 0 ? FW - 70 - (ex + 16) : ex - 16 - 70) - 34;
        if (name.offsetWidth > room) {
          const fs = Math.max(28, Math.floor(42 * room / name.offsetWidth));
          name.style.fontSize = fs + 'px';
          if (name.offsetWidth > room) Object.assign(name.style, { whiteSpace: 'normal', width: room + 'px', lineHeight: '1.08' });
        }
        const tw = Math.min(room, Math.max(name.offsetWidth, det ? det.offsetWidth : 0)) + 34;
        let xx = ex + dir * tw;
        if (xx > FW - 70) xx = FW - 70;
        if (xx < 70) xx = 70;
        const path = svgEl('path', { d: `M${ax},${ay} L${ex},${ey} L${xx},${ey}`, fill: 'none', stroke: 'rgba(255,255,255,.92)',
          'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
        path.style.filter = 'drop-shadow(0 1px 3px rgba(0,0,0,.6))';
        const len = Math.hypot(ex - ax, ey - ay) + Math.abs(xx - ex);
        path.setAttribute('stroke-dasharray', `${len} ${len}`);
        const ring = svgEl('circle', { cx: ax, cy: ay, r: 8, fill: 'none', stroke: acc, 'stroke-width': '3' }, svg);
        const dot = svgEl('circle', { cx: ax, cy: ay, r: 3.4, fill: '#FFFFFF' }, svg);
        const nl = dir > 0 ? ex + 16 : xx + 16;
        name.style.left = nl + 'px'; name.style.top = (ey - 12 - name.offsetHeight) + 'px';
        if (det) { det.style.left = nl + 'px'; det.style.top = (ey + 12) + 'px'; }
        Object.assign(o, { path, len, ring, dot, name, det, dir });
      } else if (L.style === 'stencil_tag') {
        // a kraft shipping tag on a string, the name stencilled on it, swinging to rest
        const hx = cl(dir > 0 ? bx + bw + 74 : bx - 74, 120, FW - 120), hy = cl(by + bh * 0.3, 140, FH - 260);
        // the string is tied ON the thing (L.pin), never to the empty corner of its box
        const ax = L.pin ? L.pin[0] : bx + bw * (dir > 0 ? 0.86 : 0.14), ay = L.pin ? L.pin[1] : by + bh * 0.14;
        const svg = svgEl('svg', { width: FW, height: FH, viewBox: `0 0 ${FW} ${FH}` }, labelLayer);
        Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
        const sag = Math.max(26, Math.abs(hx - ax) * 0.22);
        const str = svgEl('path', { d: `M${ax},${ay} Q${(ax + hx) / 2},${Math.max(ay, hy) + sag} ${hx},${hy}`, fill: 'none',
          stroke: '#EAE0CB', 'stroke-width': '2.4', 'stroke-linecap': 'round' }, svg);
        str.style.filter = 'drop-shadow(0 2px 3px rgba(0,0,0,.55))';
        const slen = Math.hypot(hx - ax, hy - ay) + sag * 1.4;
        str.setAttribute('stroke-dasharray', `${slen} ${slen}`);
        const tag = el('div', '', labelLayer);
        const TWD = 330;
        Object.assign(tag.style, { position: 'absolute', width: TWD + 'px', boxSizing: 'border-box', padding: '20px 26px 20px 74px', opacity: '0',
          background: 'linear-gradient(170deg,#D3B27A 0%,#C9A56A 55%,#BD9758 100%)', color: '#2A2016',
          clipPath: dir > 0 ? 'polygon(15% 0,100% 0,100% 100%,15% 100%,0 76%,0 24%)' : 'polygon(0 0,85% 0,100% 24%,100% 76%,85% 100%,0 100%)',
          filter: 'drop-shadow(0 14px 22px rgba(0,0,0,.45))', transformOrigin: dir > 0 ? '30px 50%' : `${TWD - 30}px 50%` });
        if (dir < 0) tag.style.padding = '20px 74px 20px 26px';
        // paper fibre: a few faint streaks, drawn once
        const fib = el('div', '', tag);
        Object.assign(fib.style, { position: 'absolute', inset: '0', opacity: '.35', mixBlendMode: 'multiply',
          background: 'repeating-linear-gradient(92deg, rgba(120,90,50,.0) 0px, rgba(120,90,50,.18) 1px, rgba(120,90,50,0) 3px, rgba(120,90,50,0) 11px)' });
        const ring = el('div', '', tag);
        Object.assign(ring.style, { position: 'absolute', top: '50%', width: '26px', height: '26px', marginTop: '-13px',
          borderRadius: '50%', background: 'radial-gradient(circle, #1a140d 0 6px, #EFE6D2 6.5px 11px, rgba(0,0,0,.25) 12px 13px)',
          left: dir > 0 ? '22px' : `${TWD - 48}px` });
        const k = el('div', '', tag);
        k.textContent = `${L.kicker} ${String(L.n).padStart(2, '0')}`;
        Object.assign(k.style, { position: 'relative', font: `700 15px '${F.mono}', 'Courier New', monospace`, letterSpacing: '.2em', opacity: '.78' });
        const tt = el('div', '', tag);
        tt.textContent = L.text;
        Object.assign(tt.style, { position: 'relative', font: `400 36px/1.05 '${F.stamp}', 'Saira Stencil One', sans-serif`,
          textTransform: 'uppercase', letterSpacing: '.03em', marginTop: '6px', color: '#241A10' });
        if (L.detail) {
          const d = el('div', '', tag);
          d.textContent = L.detail;
          Object.assign(d.style, { position: 'relative', font: `700 16px '${F.mono}', 'Courier New', monospace`, letterSpacing: '.12em', marginTop: '8px', opacity: '.82' });
        }
        // fit the stencil line in the tag
        const room = TWD - 100;
        if (tt.scrollWidth > room) tt.style.fontSize = Math.max(22, Math.floor(36 * room / tt.scrollWidth)) + 'px';
        const th = tag.offsetHeight;
        tag.style.left = (dir > 0 ? hx - 30 : hx - TWD + 30) + 'px';
        tag.style.top = (hy - th / 2) + 'px';
        Object.assign(o, { tag, str, slen });
      }
      return o;
    }
    function drawLabel(t) {
      if (!L) return;
      if (!lab) lab = buildLabel();
      const u = t - L.at;
      if (lab.kind === 'exhibit_card' && lab.card) {
        const p = ss(seg(u, 0, 0.55));
        lab.card.style.opacity = p.toFixed(3);
        lab.card.style.transform = `translateY(${((1 - p) * 14).toFixed(2)}px)`;
      } else if (lab.kind === 'leader_callout' && lab.path) {
        const pd = ss(seg(u, 0, 0.22)), pl = ss(seg(u, 0.12, 0.6)), pt = ss(seg(u, 0.55, 0.4));
        for (const c of [lab.ring, lab.dot]) { c.style.opacity = pd.toFixed(3); }
        lab.ring.setAttribute('r', (8 * (0.4 + 0.6 * pd)).toFixed(2));
        lab.path.setAttribute('stroke-dashoffset', (lab.len * (1 - pl)).toFixed(2));
        lab.path.style.opacity = pl > 0 ? '1' : '0';
        const clip = lab.dir > 0 ? `inset(-20% ${((1 - pt) * 100).toFixed(2)}% -20% 0)` : `inset(-20% 0 -20% ${((1 - pt) * 100).toFixed(2)}%)`;
        for (const e of [lab.name, lab.det]) if (e) { e.style.clipPath = clip; e.style.opacity = pt > 0 ? '1' : '0'; }
      } else if (lab.kind === 'stencil_tag' && lab.tag) {
        const ps = ss(seg(u, 0, 0.32));
        lab.str.setAttribute('stroke-dashoffset', (lab.slen * (1 - ps)).toFixed(2));
        lab.str.style.opacity = ps > 0 ? '1' : '0';
        const v = u - 0.22;
        const op = ss(seg(v, 0, 0.22));
        const ang = v <= 0 ? 18 : -3 + 21 * Math.exp(-v / 0.55) * Math.cos(2 * Math.PI * 0.8 * v);
        lab.tag.style.opacity = op.toFixed(3);
        lab.tag.style.transform = `rotate(${(ang * (L.side === 'left' ? -1 : 1)).toFixed(3)}deg)`;
      }
    }

    frame = t => {
      const D = S.duration;
      bg.style.transform = `scale(${lerp(1.12, 1.02, eOut(seg(t, 0, D)))})`;
      const ws = lerp(1.0, 1.045, eInOut(seg(t, 0, D)));
      // world(o) = the transform prefix that puts an element with transform-origin o into the scaled world
      // (the frame never jolts: slam_shake was retired on 10-03)
      const world_ = (ox, oy) => v2 ? `translate(${((1 - ws) * (OX - ox)).toFixed(3)}px,${((1 - ws) * (OY - oy)).toFixed(3)}px) scale(${ws.toFixed(5)}) ` : '';
      if (!v2) world.style.transform = `scale(${ws})`;
      let spotOn = 0;
      for (const r of rows) {
        const it = r.it, u = t - it.at;
        const on = u > 0;
        show(r.im, on);
        show(r.sh, on);
        if (r.gl) show(r.gl, on);
        if (r.go) show(r.go, on);
        if (r.pl) show(r.pl, on);
        if (r.sheen) show(r.sheen, on);
        if (!on) continue;
        const m = move(it, u, r.phase);
        const own = `translate(${m.x - it.w / 2}px,${m.y - it.h / 2}px)` + (m.ry ? ` perspective(1600px) rotateY(${m.ry.toFixed(3)}deg)` : '') +
                    ` rotate(${m.rot}deg) scale(${m.sc})`;
        const oy = it.enter === 'drop' ? it.h : it.h / 2;
        r.im.style.transform = world_(it.w / 2, oy) + own;
        r.im.style.opacity = m.op < 1 ? m.op.toFixed(3) : '';
        r.im.style.filter = m.light < 0.999 ? `brightness(${m.light.toFixed(3)})` : 'none';
        if (r.sheen) {
          const turning = Math.abs(m.ry) > 0.05;
          show(r.sheen, turning);
          if (turning) {
            r.sheen.style.transform = world_(it.w / 2, it.h / 2) + own;
            const p = 1 - Math.abs(m.ry) / 34;
            r.sheen.style.backgroundPosition = `${(100 - 100 * p).toFixed(2)}% 0`;
            // a narrow, faint band: a wide bright wash over the turning edge read as a smear (review 10-03)
            r.sheen.style.opacity = (0.75 * Math.sin(Math.PI * cl(p, 0, 1)) * m.op).toFixed(3);
          }
        }
        const lift = cl(m.lift, 0, 1);
        const sx = m.x + it.dx * (1 + 1.5 * lift), sy = m.y + it.dy + lift * it.h * 0.25;
        const sk = m.ry ? Math.cos(m.ry * Math.PI / 180) : 1;
        r.sh.style.transform = world_(it.sw / 2, it.sh / 2) + `translate(${sx - it.sw / 2}px,${sy - it.sh / 2}px) rotate(${m.rot}deg) scale(${m.sc * (1 + 0.3 * lift) * sk}, ${m.sc * (1 + 0.3 * lift)})`;
        r.sh.style.opacity = it.plinth ? 0 : m.op < 1 ? S.shadow * (1 - 0.75 * lift) * m.op : S.shadow * (1 - 0.75 * lift);
        if (r.gl) {
          // the glow lands with the thing and swells once as it settles
          const land = it.enter === 'turntable' ? 1.4 : it.enter === 'float' || it.enter === 'plinth_rise' ? 1.15 : 0.45;
          const swell = 1 + 0.35 * Math.sin(Math.PI * seg(u, land - 0.1, 0.7));
          r.gl.style.transform = world_(it.gw / 2, it.gh / 2) + `translate(${m.x - it.gw / 2}px,${m.y - it.gh / 2}px)` +
            (m.ry ? ` perspective(1600px) rotateY(${m.ry.toFixed(3)}deg)` : '') + ` rotate(${m.rot}deg) scale(${m.sc})`;
          r.gl.style.opacity = (cl(swell * ss(seg(u, 0.05, Math.max(0.3, land * 0.8))), 0, 1.35) / 1.35 * m.op).toFixed(3);
          if (r.go) {
            r.go.style.transform = r.im.style.transform;
            r.go.style.opacity = (ss(seg(u, land - 0.2, 0.6)) * m.op * (m.light < 1 ? m.light : 1)).toFixed(3);
          }
        }
        if (r.pl) {
          const pw = it.plinth.w, top = it.plinth.top + (m.y - it.y);
          r.pl.style.transform = world_(pw / 2, 0) + `translate(${it.x - pw / 2}px,${top}px)`;
          spotOn = Math.max(spotOn, ss(seg(u, 0.25, 1.1)));
        }
      }
      if (spot) { spot.style.opacity = spotOn.toFixed(3); spotVig.style.opacity = (0.85 * spotOn).toFixed(3); }
      if (labelLayer) {
        labelLayer.style.transform = `translate(${((1 - ws) * OX).toFixed(3)}px,${((1 - ws) * OY).toFixed(3)}px) scale(${ws.toFixed(5)})`;
        drawLabel(t);
      }
      if (label) {
        const p = eOut(seg(t, S.label.at, 0.45));
        label.style.clipPath = `inset(0 ${100 - 100 * p}% 0 0)`;
        show(label, p > 0);
      }
    };
  }

  if (S.type === 'strip') {
    // A strip of 35 mm film lying across the frame: the photo in the middle frame, its neighbours either side,
    // sprocket holes above and below, the edge print between them. The camera lands on the first photo with a
    // quick zoom-out (under a second, fast then soft) and a light leak; on every change the strip slides one
    // frame while the camera punches in and out again, another leak flashes and a click lands (strip_marks).
    // The whole scene moves at a low frame rate — the flicker of a projector — except the leaks.
    const FPS = S.fps || 15;
    const q = t => Math.floor(t * FPS + 1e-6) / FPS;
    const FRW = 1180, FRH = 787, GAP = 74, STEP = FRW + GAP, HOLE = 56, HOLEH = 40;
    const n = S.frames.length;
    const cam = el('div', 'cam');
    cam.style.transformOrigin = '0 0';
    const strip = el('div', '', cam);
    Object.assign(strip.style, { position: 'absolute', left: (-2 * STEP) + 'px', top: ((FH - FRH) / 2 - 150) + 'px', height: (FRH + 300) + 'px', width: (STEP * (n + 4)) + 'px', background: '#050505' });
    const x0 = (FW - FRW) / 2 + 2 * STEP;                    // the first photo's frame, centred on screen at slide 0
    // two blank exposures either side of the photos: a strip is never only three frames long
    for (let k = -2; k < n + 2; k++) {
      const fx = x0 + k * STEP, fy = 150;
      const f = el('div', '', strip);
      Object.assign(f.style, { position: 'absolute', left: fx + 'px', top: fy + 'px', width: FRW + 'px', height: FRH + 'px', background: '#111214', overflow: 'hidden' });
      if (k >= 0 && k < n) {
        const im = pic(S.frames[k], '', f, FRW, FRH);
        Object.assign(im.style, { position: 'absolute', left: '0', top: '0', filter: 'contrast(1.02) brightness(.98)' });
      } else {
        f.style.background = 'linear-gradient(135deg,#17181a 0%,#0e0f10 60%,#131416 100%)';
      }
      // the frame number under it and the edge print above, like a real contact print
      const num = S.start + k, sub = k % 2 ? 'A' : '';
      const lab = el('div', '', strip);
      lab.textContent = `${num}${sub}`;
      Object.assign(lab.style, { position: 'absolute', left: (fx + FRW - 8) + 'px', top: (fy + FRH + 62) + 'px', font: '600 26px "Inter", Arial, sans-serif', color: 'rgba(230,224,210,.78)', letterSpacing: '.08em', transform: 'translateX(-100%)' });
      const code = el('div', '', strip);
      code.textContent = k % 2 === 0 ? S.code : `${S.code.split(' ')[0]}  SAFETY  FILM`;
      Object.assign(code.style, { position: 'absolute', left: (fx + 26) + 'px', top: (fy - 96) + 'px', font: '700 26px "Inter", Arial, sans-serif', color: 'rgba(232,226,212,.82)', letterSpacing: '.12em' });
      const arrow = el('div', '', strip);
      arrow.textContent = '▶';
      Object.assign(arrow.style, { position: 'absolute', left: (fx + FRW / 2 - 8) + 'px', top: (fy + FRH + 64) + 'px', font: '22px Arial, sans-serif', color: 'rgba(230,224,210,.7)' });
    }
    // sprocket holes: a row above and below, evenly along the strip
    for (let x = 20; x < STEP * (n + 4); x += 96) {
      for (const y of [150 - HOLEH - 22, 150 + FRH + 22]) {
        const h = el('div', '', strip);
        Object.assign(h.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: HOLE + 'px', height: HOLEH + 'px', borderRadius: '9px', background: '#1b1c1e', boxShadow: 'inset 0 0 0 2px #000, inset 0 2px 6px rgba(255,255,255,.06)' });
      }
    }
    // the light leak: a warm blob that flashes over the picture on every change (screen blend, black = nothing)
    const leak = el('div', 'layer');
    Object.assign(leak.style, { width: FW + 'px', height: FH + 'px', mixBlendMode: 'screen', pointerEvents: 'none', opacity: '0',
      background: 'radial-gradient(ellipse 60% 90% at 78% 30%, rgba(255,150,40,.95) 0%, rgba(255,70,20,.55) 35%, rgba(120,20,0,0) 70%), radial-gradient(ellipse 45% 70% at 12% 80%, rgba(255,200,90,.6) 0%, rgba(0,0,0,0) 60%)' });
    const vig = el('div', 'vig');
    vig.style.opacity = '0.55';
    const eOutQ = p => 1 - Math.pow(1 - p, 5);
    frame = tt => {
      const t = q(tt), D = S.duration;
      // which photo is on, and the slide toward it (an eased 0.42 s move of one frame width)
      let slide = 0, punch = 0, leakA = 0;
      for (let k = 1; k < n; k++) {
        const a = S.at[k];
        slide += eInOut(seg(t, a, 0.42));
        const u = tt - a;
        if (u >= 0) { punch = Math.max(punch, 0.16 * Math.sin(Math.PI * cl(u / 0.5, 0, 1)) * (1 - 0.35 * cl(u / 0.5, 0, 1))); leakA = Math.max(leakA, 0.85 * (1 - eOut(cl(u / 0.55, 0, 1)))); }
      }
      // the landing: from 1.55x down to 1.0 in 0.7 s, fast then soft — the first leak flashes with it
      const land = eOutQ(seg(t, 0, 0.7));
      leakA = Math.max(leakA, 0.8 * (1 - eOut(cl(tt / 0.6, 0, 1))));
      const drift = 1 + 0.05 * seg(t, 0, D) + 0.004 * Math.sin(t * 1.7);
      const z = (1.55 - 0.55 * land) * (1 + punch) * drift;
      const cx = FW / 2 + Math.sin(t * 0.9) * 6, cy = FH / 2 + Math.cos(t * 0.7) * 4;
      cam.style.transform = `translate(${cx}px,${cy}px) scale(${z}) translate(${-FW / 2 - slide * STEP}px,${-FH / 2}px)`;
      leak.style.opacity = leakA.toFixed(3);
      // out: the picture fades in its last third of a second
      cam.style.opacity = vig.style.opacity = (1 - seg(tt, D - 0.3, 0.3)).toFixed(3);
    };
  }

  if (S.type === 'matchcut') {
    // A run of real photographs of one person, cut fast: every face lands on the same spot of the screen at the
    // same size (the picture scaled and moved so its face box meets the target), a white flash and a shutter on
    // every cut, each photo pushing in a little while it is up, the last one held with a slow push and a fade.
    const T = S.face || { cx: 0.5, cy: 0.44, h: 0.36 };
    const tx = T.cx * FW, ty = T.cy * FH, th = T.h * FH;
    const cam = el('div', 'cam');
    const layers = S.photos.map(p => {
      const lay = el('div', 'layer', cam);
      Object.assign(lay.style, { width: FW + 'px', height: FH + 'px', overflow: 'hidden', visibility: 'hidden', transformOrigin: `${tx}px ${ty}px`, background: '#000' });
      const bx = (p.box[0] + p.box[2]) / 2 * p.w, by = (p.box[1] + p.box[3]) / 2 * p.h, bh = (p.box[3] - p.box[1]) * p.h;
      const sc = th / bh;
      // a tight portrait scaled to the face leaves the frame's edges empty: the same photo, blown up and blurred,
      // sits behind it so the frame is never black
      const cover = Math.max(FW / p.w, FH / p.h) * 1.15;
      if (p.w * sc < FW || p.h * sc < FH) {
        const bg = pic(p.src, '', lay, p.w * cover, p.h * cover);
        Object.assign(bg.style, { position: 'absolute', left: ((FW - p.w * cover) / 2) + 'px', top: ((FH - p.h * cover) / 2) + 'px', width: (p.w * cover) + 'px', height: (p.h * cover) + 'px', filter: 'blur(28px) brightness(.55) saturate(.8)' });
      }
      const im = pic(p.src, '', lay, p.w * sc, p.h * sc);
      Object.assign(im.style, { position: 'absolute', left: (tx - bx * sc) + 'px', top: (ty - by * sc) + 'px', width: (p.w * sc) + 'px', height: (p.h * sc) + 'px', boxShadow: '0 0 60px rgba(0,0,0,.6)' });
      return lay;
    });
    const flash = el('div', 'layer');
    Object.assign(flash.style, { width: FW + 'px', height: FH + 'px', background: '#fff', opacity: '0', pointerEvents: 'none' });
    const vig = el('div', 'vig');
    // the landmark run (S.mode "landmark") has no flash, no vignette and ends on a hard cut (measured on STRATA's reference)
    const vigA = S.vignette != null ? +S.vignette : 0.5, flashA = S.flash === false ? 0 : 0.92;
    const fadeOut = S.fade_out != null ? +S.fade_out : 0.3;
    vig.style.opacity = String(vigA);
    const n = S.photos.length;
    frame = t => {
      const D = S.duration;
      let k = -1;
      for (let i = 0; i < n; i++) if (t >= S.at[i]) k = i;
      let fl = 0;
      layers.forEach((lay, i) => {
        const on = i === k;
        show(lay, on);
        if (on) {
          const since = t - S.at[i], last = i === n - 1;
          const hold = last ? Math.max(0.6, D - S.at[i]) : (S.at[i + 1] - S.at[i]);
          const push = last ? 1.0 + 0.07 * eOut(seg(since, 0, hold)) : 1.0 + 0.045 * (since / hold);
          lay.style.transform = `scale(${push})`;
          fl = Math.max(fl, flashA * (1 - eOut(seg(since, 0, 0.13))));   // the white flash of the cut
        }
      });
      if (k < 0) fl = 0;
      flash.style.opacity = fl.toFixed(3);
      const op = k < 0 ? 0 : (fadeOut > 0 ? 1 - seg(t, D - fadeOut, fadeOut) : 1);
      cam.style.opacity = op.toFixed(3);
      vig.style.opacity = (S.vignette != null ? vigA * op : op).toFixed(3);   // unchanged for the face run
    };
  }

  if (S.type === 'textcut') {
    // The text match cut: the words that hit, one line per hard cut, every line snapping onto the same spot of the
    // screen while the real photo behind it changes. Today's style: a white flash on the cut, a chroma split that
    // snaps shut, a slow push on every picture, the last line held. v2 (S.style): the look's face, accent, place and
    // effect — a quiet serif that fades up, a line of light in the title's glow family, or a word stamped in ink.
    const ST = S.style || { font: 'Inter Display', weight: 900, accent: '#F26D21', ink: '#FFFFFF', place: 'left', fx: 'chroma',
                            flash: 0.85, bright: 0.62, sat: 0.85, rule: true, track: -0.015, legacy: true };
    const FX = ST.fx || 'chroma', PLACE = ST.place || 'left';
    const cam = el('div', 'cam');
    const layers = S.photos.map(p => {
      const lay = el('div', 'layer', cam);
      Object.assign(lay.style, { width: FW + 'px', height: FH + 'px', overflow: 'hidden', visibility: 'hidden', transformOrigin: '50% 50%', background: '#000' });
      const cover = Math.max(FW / p.w, FH / p.h);
      const im = pic(p.src, '', lay, p.w * cover, p.h * cover);
      Object.assign(im.style, { position: 'absolute', left: ((FW - p.w * cover) / 2) + 'px', top: ((FH - p.h * cover) / 2) + 'px', width: (p.w * cover) + 'px', height: (p.h * cover) + 'px',
        // stamp: the photos become matte archive prints (warm grey, lifted blacks) that the ink is pressed onto
        filter: FX === 'stamp' ? `grayscale(1) sepia(.2) contrast(.76) brightness(${ST.bright})` : `brightness(${ST.bright}) saturate(${ST.sat})` });
      return lay;
    });
    const shade = el('div', 'layer');
    const SHADES = {
      left: 'linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.25) 55%, rgba(0,0,0,.05) 100%)',
      lower: 'linear-gradient(0deg, rgba(0,0,0,.66) 0%, rgba(0,0,0,.3) 42%, rgba(0,0,0,.04) 100%)',
      right: 'linear-gradient(270deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.25) 55%, rgba(0,0,0,.05) 100%)',
      center: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,0,0,.42) 0%, rgba(0,0,0,.2) 60%, rgba(0,0,0,.35) 100%)' };
    Object.assign(shade.style, { width: FW + 'px', height: FH + 'px', pointerEvents: 'none',
      background: FX === 'stamp' ? 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,.22) 100%)' : SHADES[PLACE] || SHADES.left });
    const box = el('div', 'layer');
    const BOXES = {
      left: { left: '132px', top: '0', height: FH + 'px', width: '1560px', justifyContent: 'center', alignItems: 'flex-start' },
      lower: { left: '132px', top: '0', height: (FH - 150) + 'px', width: '1560px', justifyContent: 'flex-end', alignItems: 'flex-start' },
      right: { left: (FW - 132 - 1560) + 'px', top: '0', height: FH + 'px', width: '1560px', justifyContent: 'center', alignItems: 'flex-end' },
      center: { left: '180px', top: '0', height: FH + 'px', width: (FW - 360) + 'px', justifyContent: 'center', alignItems: 'center' } };
    Object.assign(box.style, { display: 'flex', flexDirection: 'column', pointerEvents: 'none' }, BOXES[PLACE] || BOXES.left);
    const MAXW = PLACE === 'center' ? FW - 360 : 1560;
    const rule = el('div', '', box);
    const thin = ST.id === 'serif_quiet';
    Object.assign(rule.style, { height: (thin ? 2 : 5) + 'px', width: '0px', background: ST.accent, marginBottom: (thin ? 24 : 28) + 'px', display: ST.rule === false ? 'none' : 'block' });
    const wrap = el('div', '', box);
    Object.assign(wrap.style, { position: 'relative', textAlign: PLACE === 'center' ? 'center' : PLACE === 'right' ? 'right' : 'left' });
    // the glow family as layered light round the letters (FX "glow")
    const G = ST.glow || { family: 'neon', strength: 0.6, color: ST.accent };
    const gk = cl((G.strength == null ? 0.6 : G.strength) / 0.6, 0, 1.6);
    const gcol = G.color || ST.accent, glite = mixHex(gcol, 1, 0.25), gcore = mixHex(gcol, 1, 0.72);
    const GLOWS = {
      neon: `0 0 3px ${hex(gcore, 0.9 * gk)}, 0 0 10px ${hex(gcol, 0.75 * gk)}, 0 0 26px ${hex(gcol, 0.55 * gk)}, 0 0 60px ${hex(gcol, 0.35 * gk)}`,
      halo: `0 0 34px ${hex(glite, 0.55 * gk)}, 0 0 90px ${hex(glite, 0.3 * gk)}`,
      rim: `0 0 2px ${hex(glite, 0.9 * gk)}, 0 0 9px ${hex(gcol, 0.5 * gk)}`,
      bloom: `0 0 14px ${hex(glite, 0.7 * gk)}, 0 0 44px ${hex(gcol, 0.42 * gk)}`,
      halation: `0 0 3px ${hex('#FF5A1E', 0.6 * gk)}, 0 0 14px ${hex('#FF7A30', 0.35 * gk)}`,
      soft: `0 4px 30px rgba(0,0,0,${(0.6 * gk).toFixed(3)})`, none: '0 4px 30px rgba(0,0,0,.6)' };
    const fam = `'${ST.font}', 'Inter', Arial, sans-serif`;
    const color = FX === 'glow' ? gcore : (ST.ink || '#FFFFFF');
    const shadow = FX === 'glow' ? (GLOWS[G.family] || GLOWS.neon) : FX === 'stamp' ? 'none' : '0 4px 30px rgba(0,0,0,.6)';
    const mk = (c, blend) => { const d = el('div', '', wrap); Object.assign(d.style, { position: 'absolute', left: '0', top: '0', font: `${ST.weight} 150px ${fam}`, letterSpacing: `${ST.track}em`, lineHeight: '1', textTransform: 'uppercase', whiteSpace: 'nowrap', color: c, mixBlendMode: blend || 'normal', textShadow: shadow }); return d; };
    const chroma = FX === 'chroma';
    const gr = chroma ? mk('rgba(255,40,40,.75)', 'screen') : null, gc = chroma ? mk('rgba(40,220,255,.75)', 'screen') : null;
    const txt = mk(color);
    txt.style.position = 'relative';
    if (FX === 'stamp') {
      // an ink stamp: a ruled box round the word, the ink a little uneven (SVG turbulence)
      const svg = svgEl('svg', { width: 0, height: 0 }, root);
      Object.assign(svg.style, { position: 'absolute' });
      const f = svgEl('filter', { id: 'rough', x: '-5%', y: '-10%', width: '110%', height: '120%' }, svg);
      svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.85', numOctaves: '2', seed: '7', result: 'n' }, f);
      svgEl('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '3', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }, f);
      svgEl('feComponentTransfer', { in: 'n', result: 'm' }, f).appendChild(Object.assign(document.createElementNS(SVGNS, 'feFuncA'), {}));
      const fa = f.querySelector('feFuncA'); fa.setAttribute('type', 'discrete'); fa.setAttribute('tableValues', '1 1 0.62 1 0.88 1 0.75 1');
      svgEl('feComposite', { in: 'd', in2: 'm', operator: 'in' }, f);
      // a double rule like a real rubber stamp; the ink is MULTIPLIED onto the print, as ink on paper is
      Object.assign(txt.style, { border: `0.05em solid ${ST.accent}`, outline: `0.018em solid ${ST.accent}`, outlineOffset: '0.06em',
        padding: '0.08em 0.26em 0.03em', color: ST.accent, filter: 'url(#rough)', opacity: '0.96' });
      box.style.mixBlendMode = 'multiply';
    }
    const flash = el('div', 'layer');
    Object.assign(flash.style, { width: FW + 'px', height: FH + 'px', background: '#fff', opacity: '0', pointerEvents: 'none' });
    const vig = el('div', 'vig');
    vig.style.opacity = FX === 'glow' || ST.id === 'serif_quiet' ? '0.6' : FX === 'stamp' ? '0.3' : '0.45';
    const n = S.lines.length;
    const BASE = ST.id === 'serif_quiet' ? [118, 100, 84] : ST.id === 'glow_line' ? [128, 108, 88] : ST.id === 'stamp_word' ? [124, 106, 88] : [150, 124, 96];
    let lastLine = null, lastSize = 0;
    frame = t => {
      const D = S.duration;
      let k = -1;
      for (let i = 0; i < n; i++) if (t >= S.at[i]) k = i;
      const since = k >= 0 ? t - S.at[k] : 0;
      // (the picture never jolts — a stamp's knock was a nudge, retired 10-03)
      layers.forEach((lay, i) => {
        const on = k >= 0 && i === (k % layers.length);
        show(lay, on);
        if (on) lay.style.transform = `scale(${1.0 + 0.05 * Math.min(1, since / (k === n - 1 ? Math.max(0.6, D - S.at[k]) : 0.8))})`;
      });
      const line = k >= 0 ? S.lines[k] : '';
      if (line !== lastLine) {
        for (const d of [gr, gc, txt]) if (d) d.textContent = line;
        let size = line.length > 14 ? BASE[2] : line.length > 9 ? BASE[1] : BASE[0];
        for (const d of [gr, gc, txt]) if (d) d.style.fontSize = size + 'px';
        // a long line in a wide face is brought down to fit the frame
        if (!S.style || !S.style.legacy) {
          const w = txt.scrollWidth;
          if (w > MAXW) { size = Math.floor(size * MAXW / w); for (const d of [gr, gc, txt]) if (d) d.style.fontSize = size + 'px'; }
        }
        lastLine = line; lastSize = size;
      }
      const org = PLACE === 'center' ? '50% 50%' : PLACE === 'right' ? '100% 50%' : '0 50%';
      if (FX === 'chroma') {
        const pop = 1 + 0.16 * (1 - eOut(seg(since, 0, 0.18)));          // the line lands: a quick settle from 1.16
        const g = 1 - eOut(seg(since, 0, 0.22));                          // the chroma split snapping shut
        txt.style.transform = `scale(${pop})`; txt.style.transformOrigin = org;
        gr.style.transform = `translate(${-14 * g}px, 0) scale(${pop})`; gc.style.transform = `translate(${14 * g}px, 0) scale(${pop})`;
        gr.style.transformOrigin = gc.style.transformOrigin = org;
        gr.style.opacity = gc.style.opacity = (g > 0.02 ? g : 0).toFixed(3);
        txt.style.opacity = '1';
      } else if (FX === 'stamp') {
        // pressed, not punched: it comes down a hair larger and settles in under a tenth of a second
        const p = ss(seg(since, 0, 0.09));
        txt.style.transform = `rotate(-2deg) scale(${(1.08 - 0.08 * p).toFixed(4)})`; txt.style.transformOrigin = org;
        txt.style.opacity = (0.96 * cl(since / 0.05, 0, 1)).toFixed(3);
      } else if (FX === 'glow') {
        // a tube lighting: two quick flickers, then steady
        const fl = since < 0.035 ? 0.2 : since < 0.07 ? 0.95 : since < 0.1 ? 0.35 : 1;
        txt.style.opacity = (k >= 0 ? fl : 0).toFixed(3);
        txt.style.transform = ''; txt.style.transformOrigin = org;
      } else {
        // quiet: it fades up and settles a few pixels — read, not punched
        const p = ss(seg(since, 0, 0.32));
        txt.style.opacity = p.toFixed(3);
        txt.style.transform = `translateY(${((1 - p) * 10).toFixed(2)}px)`;
      }
      rule.style.width = ((thin ? 80 : 110) * eOut(seg(t, S.at[0] - 0.05, 0.4))) + 'px';
      flash.style.opacity = (k >= 0 ? ST.flash * (1 - eOut(seg(since, 0, 0.12))) : 0).toFixed(3);
      cam.style.opacity = vig.style.opacity = shade.style.opacity = (k < 0 ? 0 : 1 - seg(t, D - 0.3, 0.3)).toFixed(3);
      if (FX === 'glow' || ST.id === 'serif_quiet') vig.style.opacity = (0.6 * (k < 0 ? 0 : 1 - seg(t, D - 0.3, 0.3))).toFixed(3);
      else if (FX === 'stamp') vig.style.opacity = (0.35 * (k < 0 ? 0 : 1 - seg(t, D - 0.3, 0.3))).toFixed(3);
      box.style.opacity = (k < 0 ? 0 : 1 - seg(t, D - 0.3, 0.3)).toFixed(3);
    };
  }

  if (S.type === 'tilt') {
    // a tall real photo filling the width of the frame: the camera starts at the top and travels down to the
    // subject, with a slow push — a portrait read from the hair to the hands
    const cam = el('div', 'cam');
    const plate = pic(S.plate, 'layer', cam, S.cw, S.ch);
    const vig = el('div', 'vig');
    vig.style.opacity = '0.5';
    frame = t => {
      const D = S.duration;
      const s0 = FW / S.cw;                                 // fit the width
      const z = 1.02 + 0.07 * eInOut(seg(t, 0, D));
      const s = s0 * z;
      const hv = FH / s;                                     // the frame's height in plate pixels
      const yEnd = cl(S.focus_y * S.ch - hv * 0.5, 0, S.ch - hv);
      const y = lerp(0, yEnd, eInOut(seg(t, 0.15, D - 0.5)));
      const x = (S.cw - FW / s) / 2;
      cam.style.transform = `scale(${s}) translate(${-x}px,${-y}px)`;
      cam.style.opacity = (1 - seg(t, D - 0.3, 0.3)).toFixed(3);
    };
  }

  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all(waits.concat([fonts]))
    .then(() => Promise.all(Array.from(document.images).map(i => (i.decode ? i.decode().catch(() => null) : null))))
    .then(() => {
      window.renderFrame = t => frame(t);
      frame(0);
      window.__ready = true;
    });
})();
