// CREATIVE kit — framework core (autostyle v2). Loaded by kits.build_html ahead of the other lib/cr_*.js, the optional
// creative_data.js (kitdata) and creative.js. Everything a scene needs comes from the title's TOKENS (S.tok, written by
// lookreg.creative.adapt and validated by creative.py) with a default for every key, so a page without tokens still
// renders a complete, quiet, premium scene. Page globals used (kits.PAGE): S, P, W, H, D, clamp, seg, lerp, esc, fmt,
// scene, ground, vig. Deterministic: every frame is a function of t alone; randomness is hashed from S.seed.
//
// API (documented for scene authors in build/kit/FRAMEWORK.md):
//   CR.tok CR.W (world id) CR.wd (world def) CR.pal (palette roles) CR.F (font stacks) CR.FW (weights)
//   CR.ss CR.sseg CR.cruise CR.hash CR.el CR.rgba CR.mix CR.lum CR.up (case)
//   CR.L.back / CR.L.mid / CR.L.front (layers), CR.focus = [x, y], CR.beat (reveal second for snap_punch)
//   CR.scene(type, def), CR.on(fn) per-frame updater, CR.wait(promise), CR.tq(t) (stepped time), CR.ts (time scale)
//   CR.glowText(size, colour) CR.glowFilter(colour, size) CR.anchor(placement)
const CR = {};
(function () {
  const T = S.tok || {};
  CR.tok = T;
  // ── worlds: default palette roles + grammar (kept in step with lookreg/creative.py GROUNDS) ─────────────────────
  const WD = {
    void_black: { pal: ['#060606', '#F1EDE4', '#8C877D', '#EDE7DA', '#1C1915', '#C9A45C', '#8FA3B8', '#E8CF95'], light: false, surface: 'glass', motion: 'smooth_drift', texture: 'grain', hero: 'tracking_open', label: 'mask_wipe', cap: 1 },
    navy_falloff: { pal: ['#08111C', '#EEF2F5', '#7E8FA2', '#E9EDF1', '#121A24', '#E25A4F', '#F2B84B', '#FF9A8F'], light: false, surface: 'glass', motion: 'parallax_push', texture: 'grain', hero: 'letter_rise', label: 'mask_wipe', cap: 1 },
    charcoal_light: { pal: ['#19191A', '#F3EFE7', '#8F8B84', '#ECE6DA', '#1A1816', '#E39A3B', '#9FB4C7', '#F6C27F'], light: false, surface: 'print', motion: 'smooth_drift', texture: 'grain', hero: 'focus_pull', label: 'mask_wipe', cap: 1 },
    glass_dark: { pal: ['#070A10', '#F4F7FA', '#7D8794', '#E8EDF2', '#0E131A', '#3E8EF7', '#9BE1FF', '#8FC1FF'], light: false, surface: 'glass', motion: 'slow_orbit', texture: 'none', hero: 'mask_wipe', label: 'mask_wipe', cap: 1 },
    paper_desk: { pal: ['#17110C', '#F0E8D8', '#A49884', '#ECE3CF', '#231B13', '#B0261C', '#2B4C7E', '#E07A5F'], light: false, surface: 'sheet', motion: 'parallax_push', texture: 'paper', hero: 'typewriter', label: 'typewriter', cap: 0.3 },
    newsprint: { pal: ['#E2DED3', '#171614', '#6B675F', '#EDE9DF', '#171614', '#B3261E', '#1F3A5F', '#D9574E'], light: true, surface: 'print', motion: 'locked', texture: 'halftone', hero: 'mask_wipe', label: 'typewriter', cap: 0.3 },
    blueprint: { pal: ['#0E3A63', '#EAF3FB', '#8FB3D4', '#DCE9F5', '#0C2E50', '#FFD25A', '#9FE0FF', '#CDEBFF'], light: false, surface: 'line', motion: 'locked', texture: 'grain', hero: 'mask_wipe', label: 'typewriter', cap: 0.7 },
    concrete: { pal: ['#2B2B2A', '#EEEBE5', '#9A968F', '#E6E1D6', '#1D1C1A', '#C8352E', '#D9B44A', '#F07A6E'], light: false, surface: 'notice', motion: 'locked', texture: 'grain', hero: 'letter_rise', label: 'mask_wipe', cap: 0.5 },
    light_table: { pal: ['#EEF1EE', '#141516', '#6E7276', '#FAFBF8', '#141516', '#D4442F', '#2C5DA8', '#FF8A6E'], light: true, surface: 'film', motion: 'smooth_drift', texture: 'none', hero: 'focus_pull', label: 'typewriter', cap: 0.3 },
    footage_sharp: { pal: ['#0B0B0B', '#F7F4EE', '#C9C4BA', '#EEE8DC', '#1A1815', '#E2B04A', '#9FB9CF', '#F5D58C'], light: false, surface: 'photo', motion: 'smooth_drift', texture: 'grain', hero: 'letter_rise', label: 'mask_wipe', cap: 0.8 },
    footage_moving: { pal: ['#0B0B0B', '#F7F4EE', '#C9C4BA', '#EEE8DC', '#1A1815', '#E85C4A', '#9FB9CF', '#FFB09F'], light: false, surface: 'photo', motion: 'locked', texture: 'grain', hero: 'mask_wipe', label: 'mask_wipe', cap: 0.8 },
  };
  const ROLES = ['ground', 'ink', 'dim', 'paper', 'sink', 'accent', 'accent2', 'glow'];
  CR.WORLDS = WD;
  const RETIRED = { cork_board: 'paper_desk' };              // lookreg.creative.RETIRED
  const want = RETIRED[T.ground] || T.ground, wantS = RETIRED[S.world] || S.world;
  CR.W = WD[want] ? want : (WD[wantS] ? wantS : 'void_black');
  CR.wd = WD[CR.W];
  const pal = {};
  ROLES.forEach((k, i) => { pal[k] = CR.wd.pal[i]; });
  const given = T.palette || {};
  for (const k of ROLES) if (typeof given[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(given[k])) pal[k] = given[k];
  CR.pal = pal;
  CR.light = !!CR.wd.light;                                  // the ground itself is bright
  CR.foot = CR.W === 'footage_sharp' || CR.W === 'footage_moving';
  CR.motion = T.motion || CR.wd.motion;
  CR.texture = T.texture || CR.wd.texture;
  const gl = T.glow || {};
  CR.glow = { family: gl.family || 'none', strength: clamp(gl.strength == null ? 0.6 : +gl.strength, 0, Math.min(1, CR.wd.cap)) };
  CR.anim = { hero: (T.text_anim || {}).hero || CR.wd.hero, label: (T.text_anim || {}).label || CR.wd.label };
  CR.placement = T.placement || 'lower_left';
  CR.case = T.case || 'upper';
  CR.hero = !!(T.hero && T.hero === S.type);
  CR.grade = T.grade || '';
  // the few words the kit prints itself (form labels, the default chapter kicker) in the film's language
  CR.lang = ['en', 'cs', 'pl', 'de'].includes(T.lang) ? T.lang : 'en';
  const WORDS = {
    chapter: { en: 'Chapter', cs: 'Kapitola', pl: 'Rozdział', de: 'Kapitel' },
    file: { en: 'Personal file', cs: 'Osobní spis', pl: 'Akta osobowe', de: 'Personalakte' },
    name: { en: 'Name', cs: 'Jméno', pl: 'Nazwisko', de: 'Name' },
    role: { en: 'Role', cs: 'Funkce', pl: 'Funkcja', de: 'Funktion' },
    years: { en: 'Years', cs: 'Roky', pl: 'Lata', de: 'Jahre' },
    project: { en: 'Project', cs: 'Projekt', pl: 'Projekt', de: 'Projekt' },
    title: { en: 'Title', cs: 'Název', pl: 'Tytuł', de: 'Titel' },
    date: { en: 'Date', cs: 'Datum', pl: 'Data', de: 'Datum' },
    sheet: { en: 'Sheet', cs: 'List', pl: 'Arkusz', de: 'Blatt' },
    from: { en: 'From', cs: 'Od', pl: 'Od', de: 'Von' },
  };
  CR.t = k => ((WORDS[k] || {})[CR.lang]) || ((WORDS[k] || {}).en) || k;
  const st = (fam, fb) => `'${fam}', ${fb}`;
  CR.F = { head: st('Cr Head', 'Georgia, serif'), body: st('Cr Body', 'Arial, sans-serif'), cond: st('Cr Cond', "'Arial Narrow', sans-serif"),
           serif: st('Cr Serif', 'Georgia, serif'), mono: st('Cr Mono', "'Courier New', monospace"), display: st('Cr Display', 'Arial Black, sans-serif'),
           stamp: st('Cr Stamp', 'Impact, sans-serif'), hand: st('Cr Hand', 'cursive') };
  CR.FW = Object.assign({ head: 500, body: 500, cond: 500, serif: 450, mono: 400, display: 800, stamp: 400, hand: 500 }, T.fw || {});

  // ── maths ────────────────────────────────────────────────────────────────────────────────────────────────────
  CR.ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };       // smoothstep: peak speed 1.5x the average
  CR.sseg = (t, a, b) => CR.ss(seg(t, a, b));
  // cruise: accelerate over r, glide, decelerate over r — peak speed 1/(1-r) of the average (r .3 -> 1.43x)
  CR.cruise = (x, r = 0.3) => {
    x = clamp(x); const v = 1 / (1 - r);
    if (x < r) return v * x * x / (2 * r);
    if (x > 1 - r) return 1 - v * (1 - x) * (1 - x) / (2 * r);
    return v * (x - r / 2);
  };
  CR.hash = (n, m = 0) => { const x = Math.sin(n * 127.1 + m * 57.3 + (S.seed || 7) * 311.7) * 43758.5453; return x - Math.floor(x); };
  CR.stepped = CR.motion === 'stepped_12';
  CR.tq = t => CR.stepped ? Math.floor(t * 12 + 1e-6) / 12 : t;
  CR.D0 = S.d0 || D;                                          // the type's own length: timings compress when cut short
  CR.ts = clamp(D / Math.max(0.1, CR.D0), 0.62, 1);
  CR.at = s => s * CR.ts;                                     // a beat at s seconds of the full-length scene

  // ── colour ───────────────────────────────────────────────────────────────────────────────────────────────────
  const rgb = h => { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  CR.rgb = rgb;
  CR.rgba = (h, a) => { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${(+a).toFixed(3)})`; };
  CR.mix = (a, b, p) => { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * p).toString(16).padStart(2, '0')).join(''); };
  CR.lum = h => { const c = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  // the same hue fully saturated at a mid lightness (a neon tube's colour)
  CR.sat = h => { const [r, g, b] = rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 1e-4) return '#' + rgb(h).map(v => v.toString(16).padStart(2, '0')).join('');
    let hu = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hu *= 60; if (hu < 0) hu += 360;
    const s = 1, l = 0.56, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hu / 60) % 2 - 1)), m = l - c / 2;
    const [a, bb, cc] = hu < 60 ? [c, x, 0] : hu < 120 ? [x, c, 0] : hu < 180 ? [0, c, x] : hu < 240 ? [0, x, c] : hu < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [a, bb, cc].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join(''); };
  CR.up = (s, force) => (force || CR.case === 'upper') ? String(s).toUpperCase() : String(s);

  // ── DOM ──────────────────────────────────────────────────────────────────────────────────────────────────────
  CR.el = (tag, css, parent, html) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; (parent || scene).appendChild(e); return e; };
  CR.svgNS = 'http://www.w3.org/2000/svg';
  CR.svg = (parent, css) => { const s = document.createElementNS(CR.svgNS, 'svg'); s.setAttribute('width', W); s.setAttribute('height', H); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;' + (css || ''); parent.appendChild(s); return s; };
  CR.sv = (tag, attrs, parent) => { const e = document.createElementNS(CR.svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  CR._upd = []; CR.on = fn => { CR._upd.push(fn); return fn; };
  CR._wait = []; CR.wait = p => { if (p) CR._wait.push(Promise.resolve(p).catch(() => null)); return p; };
  CR.img = src => { if (!src) return Promise.resolve(null); return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); };

  // ── glow: ONE family per title (lookreg.common.GLOW_FAMILIES), strength-aware, only on light type over dark ──────
  CR.glowText = (size, colour, onLight) => {
    const f = CR.glow.family, k = CR.glow.strength / 0.6, g = colour || pal.glow;
    if (onLight === undefined) onLight = CR.light;
    if (onLight) return '';                                   // dark ink on paper takes no light
    const px = v => (v * size).toFixed(1) + 'px';
    if (f === 'soft') return `0 0 ${px(0.32)} ${CR.rgba('#000000', 0.34 * k)}`;
    if (f === 'bloom') return `0 0 ${px(0.12)} ${CR.rgba(CR.mix(g, '#FFFFFF', 0.35), 0.42 * k)}, 0 0 ${px(0.42)} ${CR.rgba(g, 0.24 * k)}`;
    // neon: a saturated tube (tight, then mid, then a wide haze) around a white-hot core (glowFill) — not a bloom
    if (f === 'neon') { const sat = CR.mix(g, CR.sat(g), 0.6);
      return `0 0 ${px(0.02)} ${CR.rgba(CR.mix(sat, '#FFFFFF', 0.25), 0.95 * k)}, 0 0 ${px(0.06)} ${CR.rgba(sat, 0.85 * k)}, 0 0 ${px(0.16)} ${CR.rgba(sat, 0.55 * k)}, 0 0 ${px(0.42)} ${CR.rgba(sat, 0.3 * k)}`; }
    // rim: a thin bright light on the TOP edge of the letters (a key light from above), a dark falloff below
    if (f === 'rim') return `0 ${px(-0.016)} 0 ${CR.rgba(CR.mix(g, '#FFFFFF', 0.55), 0.85 * Math.min(1, k))}, 0 ${px(-0.03)} ${px(0.06)} ${CR.rgba(g, 0.32 * k)}, 0 ${px(0.035)} ${px(0.12)} ${CR.rgba('#000000', 0.5 * k)}`;
    if (f === 'halation') return `0 0 ${px(0.08)} ${CR.rgba('#FF5A1E', 0.42 * k)}, 0 0 ${px(0.3)} ${CR.rgba('#FF7A30', 0.2 * k)}`;
    if (CR.foot) return `0 ${px(0.02)} ${px(0.05)} rgba(0,0,0,.42)`;      // none: a crisp lift off the footage
    return '';
  };
  // the fill a glow family wants on light type (neon: a white-hot core; halation: warmed whites; rim: an outline)
  CR.glowFill = (colour, size, el) => {
    const f = CR.glow.family, k = CR.glow.strength / 0.6;
    if (CR.light) return colour;
    if (f === 'neon') return CR.mix(pal.glow, '#FFFFFF', 0.86);
    if (f === 'halation') return CR.mix(colour, '#FFE7CC', 0.35 * Math.min(1, k));
    if (f === 'rim') return CR.mix(colour, pal.ground, 0.16);     // a little below white, so the lit edge reads
    void size; void el;
    return colour;
  };
  CR.glowFilter = (colour, size = 40) => {
    const f = CR.glow.family, k = CR.glow.strength / 0.6, g = colour || pal.glow;
    if (CR.light || f === 'none' || f === 'soft') return f === 'soft' && !CR.light ? `drop-shadow(0 0 ${(size * .2).toFixed(1)}px ${CR.rgba('#000', .3 * k)})` : '';
    if (f === 'rim') return `drop-shadow(0 -${Math.max(1, size * .04).toFixed(1)}px 0 ${CR.rgba(CR.mix(g, '#FFFFFF', .55), .75 * Math.min(1, k))}) drop-shadow(0 ${(size * .1).toFixed(1)}px ${(size * .25).toFixed(1)}px ${CR.rgba('#000', .4 * k)})`;
    if (f === 'neon') { const sat = CR.mix(g, CR.sat(g), .6); return `drop-shadow(0 0 ${(size * .04).toFixed(1)}px ${CR.rgba(sat, .9 * k)}) drop-shadow(0 0 ${(size * .14).toFixed(1)}px ${CR.rgba(sat, .55 * k)}) drop-shadow(0 0 ${(size * .36).toFixed(1)}px ${CR.rgba(sat, .3 * k)})`; }
    if (f === 'bloom') return `drop-shadow(0 0 ${(size * .14).toFixed(1)}px ${CR.rgba(CR.mix(g, '#fff', .35), .45 * k)}) drop-shadow(0 0 ${(size * .4).toFixed(1)}px ${CR.rgba(g, .25 * k)})`;
    if (f === 'halation') return `drop-shadow(0 0 ${(size * .1).toFixed(1)}px ${CR.rgba('#FF5A1E', .4 * k)})`;
    if (f === 'halo') return `drop-shadow(0 0 ${(size * .3).toFixed(1)}px ${CR.rgba(CR.mix(g, '#fff', .25), .28 * k)})`;
    return '';
  };
  // halo family: a soft round light behind a block (a museum spot), drawn as an element under it
  CR.halo = (parent, x, y, w, h) => {
    if (CR.glow.family !== 'halo' || CR.light) return null;
    const k = CR.glow.strength / 0.6;
    return CR.el('div', `position:absolute;left:${x - w * .62}px;top:${y - h * .95}px;width:${w * 1.24}px;height:${h * 1.9}px;border-radius:50%;` +
      `background:radial-gradient(ellipse at center, ${CR.rgba(CR.mix(pal.glow, '#FFFFFF', .25), .32 * k)} 0%, ${CR.rgba(pal.glow, .12 * k)} 38%, rgba(0,0,0,0) 70%);pointer-events:none`, parent);
  };

  // ── placement anchors (lookreg.creative.PLACEMENT_ANCHORS, fractions of the frame, 5 % title-safe) ─────────────
  const PA = { lower_left: [0.075, 0.80, 0.60, 'left', 'bottom'], centre_small: [0.5, 0.5, 0.56, 'center', 'middle'],
    dateline_credit: [0.075, 0.12, 0.55, 'left', 'top'], right_panel: [0.60, 0.5, 0.33, 'left', 'middle'],
    full_bleed: [0.5, 0.5, 0.86, 'center', 'middle'], vertical_side: [0.075, 0.80, 0.55, 'left', 'bottom'],
    letterbox_bar: [0.5, 0.92, 0.80, 'center', 'bottom'], hud_corners: [0.075, 0.12, 0.40, 'left', 'top'],
    top_centre: [0.5, 0.14, 0.70, 'center', 'top'] };
  CR.anchor = id => { const a = PA[id] || PA.lower_left; return { x: a[0] * W, y: a[1] * H, w: a[2] * W, align: a[3], v: a[4] }; };
  // place an absolutely positioned block at an anchor (after its size is known)
  CR.pin = (el, a) => {
    const r = el.getBoundingClientRect();
    const x = a.align === 'center' ? a.x - r.width / 2 : a.align === 'right' ? a.x - r.width : a.x;
    const y = a.v === 'middle' ? a.y - r.height / 2 : a.v === 'bottom' ? a.y - r.height : a.y;
    el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
    return { x, y, w: r.width, h: r.height };
  };

  // ── layers + camera (motion grammar) ─────────────────────────────────────────────────────────────────────────
  CR.L = {};
  CR.focus = [W / 2, H / 2];
  CR.beat = null;
  CR.layers = () => {
    scene.innerHTML = '';
    for (const k of ['back', 'mid', 'front']) CR.L[k] = CR.el('div', 'position:absolute;inset:0;transform-origin:50% 50%', scene);
  };
  const tf = (el, s, x, y, extra) => { if (el) el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${s.toFixed(5)})${extra || ''}`; };
  CR.camera = t => {
    const m = CR.motion, ox = CR.focus[0], oy = CR.focus[1];
    for (const k of ['back', 'mid', 'front']) if (CR.L[k]) CR.L[k].style.transformOrigin = `${ox}px ${oy}px`;
    ground.style.transformOrigin = `${ox + 60}px ${oy + 34}px`;
    // the camera is ALWAYS smooth: stepped_12 moves the elements on twelves (CR.frame), never the whole frame —
    // a frame that moves on twelves reads as judder (measured 3.6x peak / average)
    const p = CR.cruise(t / Math.max(0.5, D));
    if (m === 'locked') { tf(ground, 1, 0, 0); for (const k in CR.L) tf(CR.L[k], 1, 0, 0); return; }
    if (m === 'parallax_push') {
      tf(ground, 1 + 0.06 * p, 0, 0); tf(CR.L.back, 1 + 0.045 * p, 0, 0); tf(CR.L.mid, 1 + 0.035 * p, 0, 0); tf(CR.L.front, 1 + 0.015 * p, 0, 0); return;
    }
    if (m === 'slow_orbit') {
      const q = p - 0.5, yaw = 3.0 * q;
      tf(ground, 1.04, 34 * q, 0);
      for (const k in CR.L) tf(CR.L[k], 1, -16 * q * (k === 'front' ? 1.4 : k === 'mid' ? 1 : 0.6), 0, ` perspective(1900px) rotateY(${yaw.toFixed(3)}deg)`);
      return;
    }
    if (m === 'snap_punch') {
      // locked, then ONE motivated push-in to 105 % over 1 s (smoothstep: peak 1.5x the move's average) on the reveal,
      // held — a camera move, never a nudge
      const b = Math.min(Math.max(0, D - 1.2), CR.beat == null ? CR.at(1.1) : CR.beat);
      const k = 1 + 0.05 * CR.sseg(t, b, b + 1.0);
      tf(ground, k, 0, 0); for (const kk in CR.L) tf(CR.L[kk], k, 0, 0); return;
    }
    // smooth_drift (and stepped_12: its camera drifts smoothly, its elements step)
    const s = 1 + 0.03 * p, dx = -14 * p;
    tf(ground, s, dx, 0); for (const k in CR.L) tf(CR.L[k], s, dx, 0);
  };

  // ── the scene registry + the kit contract (build / frame) ────────────────────────────────────────────────────
  CR.SCENES = {};
  CR.scene = (type, def) => { CR.SCENES[type] = def; return def; };
  CR.compOf = type => {
    const d = CR.SCENES[type]; if (!d) return '';
    const names = Object.keys(d.comps || {});
    for (const c of [S.comp, (d.place || {})[CR.placement], (d.layout || {})[CR.W], d.default, names[0]]) if (c && d.comps[c]) return c;
    return '';
  };
  CR.boot = () => {
    CR.layers();
    if (CR.groundBuild) CR.groundBuild();
    if (CR.textureBuild) CR.textureBuild();
  };
  CR.run = () => {
    const d = CR.SCENES[S.type];
    if (!d) throw new Error(`creative: no scene type ${S.type}`);
    CR.comp = CR.compOf(S.type);
    CR.boot();
    CR.ctx = {};
    d.comps[CR.comp].build(CR.ctx);
    window.__wait = Promise.all(CR._wait);
  };
  CR.frame = t => {
    const tq = CR.tq(t);
    CR.camera(t);
    const p = CR.groundFrame ? CR.groundFrame(t) : null;
    const d = CR.SCENES[S.type], c = d && d.comps[CR.comp];
    if (c && c.frame) c.frame(tq, CR.ctx);
    for (const fn of CR._upd) fn(tq, t);
    if (CR.textureFrame) CR.textureFrame(t);
    return p;
  };
})();
