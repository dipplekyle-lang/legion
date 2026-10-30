// CREATIVE kit — WORLDS (grounds) and TEXTURES. Every ground is drawn ONCE in build() into a 2040x1148 canvas inside
// #ground (the camera breathes it); footage_moving draws the real clip into it every frame (seeked, history.js
// pattern). Procedural surfaces are seeded from S.seed so a re-render is identical.
(function () {
  const GW = 2040, GH = 1148, pal = CR.pal;
  let gc = null, gx = null, vid = null, still = null, vfilter = '';
  // a tiny random canvas scaled up with smoothing = soft value noise; octaves summed with alpha = cheap fbm
  CR.noise = (w, h, cells, seed, alpha, mode, tint) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const n = document.createElement('canvas'); n.width = Math.max(2, cells | 0); n.height = Math.max(2, Math.round(cells * h / w)); const nx = n.getContext('2d');
    const im = nx.createImageData(n.width, n.height);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.floor(CR.hash(i * 0.37 + seed, seed) * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    nx.putImageData(im, 0, 0);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.globalAlpha = alpha == null ? 1 : alpha;
    if (mode) x.globalCompositeOperation = mode;
    x.drawImage(n, 0, 0, w, h);
    return c;
  };
  CR.streaks = (w, h, cx, cy, seed, alpha) => {           // anisotropic noise: cx cells across, cy down (wood, brushed)
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const n = document.createElement('canvas'); n.width = Math.max(2, cx | 0); n.height = Math.max(2, cy | 0); const nx = n.getContext('2d');
    const im = nx.createImageData(n.width, n.height);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.floor(CR.hash(i * 0.53 + seed, seed + 1) * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    nx.putImageData(im, 0, 0); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.globalAlpha = alpha == null ? 1 : alpha;
    x.drawImage(n, 0, 0, w, h);
    return c;
  };
  CR.grainCanvas = (w, h, amp, seed, tone) => {          // per-pixel fibre / tooth, transparent where flat
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const im = x.createImageData(w, h); let s = (seed * 2654435761) >>> 0 || 7;
    const t = CR.rgb(tone || '#000000');
    for (let i = 0; i < im.data.length; i += 4) { s = (s * 1664525 + 1013904223) >>> 0; const v = s / 4294967296;
      im.data[i] = t[0]; im.data[i + 1] = t[1]; im.data[i + 2] = t[2]; im.data[i + 3] = Math.floor(Math.pow(v, 3) * 255 * amp); }
    x.putImageData(im, 0, 0);
    return c;
  };
  const radial = (x, cx, cy, r, c0, c1, op) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c0); g.addColorStop(1, c1); x.globalCompositeOperation = op || 'source-over'; x.fillStyle = g; x.fillRect(0, 0, GW, GH); x.globalCompositeOperation = 'source-over'; };
  const fbm = (x, seed, alpha, mode, oct = [[18, 1], [48, .55], [140, .3]]) => { for (const [cells, a] of oct) x.drawImage(CR.noise(GW, GH, cells, seed + cells, alpha * a, null), 0, 0); };
  const motes = (x, n, seed, col, amax) => { for (let i = 0; i < n; i++) { const px = CR.hash(i, seed) * GW, py = CR.hash(i, seed + 1) * GH, r = 0.6 + CR.hash(i, seed + 2) * 2.2, a = 0.02 + CR.hash(i, seed + 3) * amax;
    const g = x.createRadialGradient(px, py, 0, px, py, r * 2.5); g.addColorStop(0, CR.rgba(col, a)); g.addColorStop(1, CR.rgba(col, 0)); x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 2.5, 0, 6.2832); x.fill(); } };

  const DRAW = {
    void_black(x) { x.fillStyle = pal.ground; x.fillRect(0, 0, GW, GH);
      radial(x, GW * .5, GH * .46, GW * .62, CR.rgba(CR.mix(pal.ground, '#3A3A3A', .62), 1), CR.rgba(pal.ground, 0));
      x.globalCompositeOperation = 'overlay'; fbm(x, 11, .10); x.globalCompositeOperation = 'source-over';
      motes(x, 46, 5, '#FFFFFF', .10); },
    navy_falloff(x) { x.fillStyle = pal.ground; x.fillRect(0, 0, GW, GH);
      radial(x, GW * .5, -GH * .18, GW * .95, CR.rgba(CR.mix(pal.ground, '#4C6E96', .5), 1), CR.rgba(pal.ground, 0));
      radial(x, GW * .5, GH * 1.25, GW * .7, CR.rgba('#000000', .55), CR.rgba('#000000', 0));
      x.globalCompositeOperation = 'overlay'; fbm(x, 21, .12); x.globalCompositeOperation = 'source-over'; },
    charcoal_light(x) { x.fillStyle = pal.ground; x.fillRect(0, 0, GW, GH);
      radial(x, GW * .42, GH * .55, GW * .7, CR.rgba(CR.mix(pal.ground, '#504A44', .55), 1), CR.rgba(pal.ground, 0));
      const leak = CR.mix(pal.accent, '#FF8A3D', .5);
      const g = x.createLinearGradient(GW, 0, GW * .62, GH * .35); g.addColorStop(0, CR.rgba(leak, .30)); g.addColorStop(.45, CR.rgba(leak, .08)); g.addColorStop(1, CR.rgba(leak, 0));
      x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(0, 0, GW, GH);
      radial(x, GW * 1.02, GH * .08, GW * .32, CR.rgba(CR.mix(leak, '#FFE2B8', .5), .22), CR.rgba(leak, 0), 'screen');
      x.globalCompositeOperation = 'overlay'; fbm(x, 31, .14); x.globalCompositeOperation = 'source-over'; },
    glass_dark(x) { x.fillStyle = pal.ground; x.fillRect(0, 0, GW, GH);
      // night glass of a tower: a cool lift top-right, the city far behind as big out-of-focus discs, two long
      // reflections raking across the glass (no boxes: the glass cards are the compositions' own)
      radial(x, GW * .72, GH * .1, GW * .78, CR.rgba(CR.mix(pal.ground, '#1E2C44', .72), 1), CR.rgba(pal.ground, 0));
      const discs = [[.1, .2, .11, 'glow', .075], [.86, .3, .14, 'accent2', .06], [.7, .8, .09, '#FFD9A6', .055], [.27, .86, .13, 'glow', .05],
                     [.5, .07, .07, '#FFFFFF', .04], [.95, .7, .06, 'accent', .07], [.04, .6, .08, '#FFD9A6', .045], [.62, .42, .05, 'glow', .035]];
      for (const [fx, fy, fr, c, a] of discs) { const col = c === 'glow' ? pal.glow : c === 'accent' ? pal.accent : c === 'accent2' ? pal.accent2 : c;
        radial(x, GW * fx, GH * fy, GW * fr, CR.rgba(col, a), CR.rgba(col, a * .35), 'screen');
        radial(x, GW * fx, GH * fy, GW * fr * 1.05, CR.rgba(col, 0), CR.rgba(col, 0), 'screen'); }
      x.save(); x.globalCompositeOperation = 'screen'; x.setTransform(1, 0, -.38, 1, 0, 0);
      for (const [x0, a, w] of [[.2, .05, 260], [.27, .025, 70], [.66, .035, 150]]) { const g = x.createLinearGradient(GW * x0, 0, GW * x0 + w, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, CR.rgba('#DCE8FF', a)); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(GW * x0, 0, w, GH); }
      x.restore();
      x.globalCompositeOperation = 'overlay'; fbm(x, 101, .05); x.globalCompositeOperation = 'source-over';
      radial(x, GW * .5, GH * .5, GW * .76, CR.rgba('#000000', 0), CR.rgba('#000000', .58)); },
    paper_desk(x) { x.fillStyle = pal.ground; x.fillRect(0, 0, GW, GH);
      // walnut: long grain = noise with few cells along x and many along y (streaks), then fine dark grain lines
      x.globalCompositeOperation = 'overlay';
      for (let i = 0; i < 3; i++) x.drawImage(CR.streaks(GW, GH, 3 + i * 2, 90 + i * 110, 43 + i, .5 - i * .12), 0, 0);
      x.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 70; i++) { const yy = CR.hash(i, 47) * GH, a = .03 + CR.hash(i, 48) * .06; x.strokeStyle = CR.rgba('#000000', a); x.lineWidth = .6 + CR.hash(i, 49) * 2.2;
        x.beginPath(); for (let xx = 0; xx <= GW; xx += 40) { const yv = yy + Math.sin(xx * .0021 + i) * 9 + Math.sin(xx * .0067 + i * 2) * 3; xx ? x.lineTo(xx, yv) : x.moveTo(xx, yv); } x.stroke(); }
      radial(x, GW * .36, GH * .26, GW * .62, CR.rgba('#FFC27A', .30), CR.rgba('#FFC27A', 0), 'screen');
      radial(x, GW * .5, GH * .55, GW * .85, CR.rgba('#000000', 0), CR.rgba('#000000', .62)); },
    newsprint(x) { x.fillStyle = pal.ground; x.fillRect(0, 0, GW, GH);
      // newsprint is flat, not cloudy: a faint broad unevenness, then its fibre (short dark and light hairs), its tooth,
      // and the faint show-through of the other side's columns (the paper is thin)
      x.globalCompositeOperation = 'multiply'; fbm(x, 51, .035, null, [[12, .6], [60, .4]]); x.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 5200; i++) { const px = CR.hash(i, 53) * GW, py = CR.hash(i, 54) * GH, L = 3 + CR.hash(i, 55) * 11, an = CR.hash(i, 56) * 6.2832, d = CR.hash(i, 57);
        x.strokeStyle = d < .62 ? CR.rgba('#4A4236', .05 + d * .08) : CR.rgba('#FFFFFF', .10 + (d - .62) * .2); x.lineWidth = .5 + CR.hash(i, 58) * .7;
        x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(an) * L * .5 + (CR.hash(i, 59) - .5) * 3, py + Math.sin(an) * L * .5, px + Math.cos(an) * L, py + Math.sin(an) * L); x.stroke(); }
      x.drawImage(CR.grainCanvas(GW, GH, .14, 52, '#3A352C'), 0, 0);
      const cw = (GW - 180) / 6;
      for (let c = 0; c < 6; c++) { x.fillStyle = CR.rgba('#6B6252', .02); for (let yy = 150, k = 0; yy < GH - 130; yy += 23, k++) x.fillRect(90 + c * cw + 16, yy, cw - 44 - CR.hash(c * 97 + k, 61) * (k % 7 === 6 ? cw * .6 : 40), 7); }
      radial(x, GW * .5, GH * .5, GW * .78, CR.rgba('#8A7A55', 0), CR.rgba('#8A7A55', .14), 'multiply'); },
    blueprint(x) { const g = x.createLinearGradient(0, 0, 0, GH); g.addColorStop(0, CR.mix(pal.ground, '#2A6AA0', .18)); g.addColorStop(1, CR.mix(pal.ground, '#000000', .18)); x.fillStyle = g; x.fillRect(0, 0, GW, GH);
      x.globalCompositeOperation = 'overlay'; fbm(x, 71, .12); x.globalCompositeOperation = 'source-over';
      x.strokeStyle = CR.rgba(pal.ink, .055); x.lineWidth = 1; x.beginPath();
      for (let gx2 = 60 % 24; gx2 < GW; gx2 += 24) { x.moveTo(gx2 + .5, 0); x.lineTo(gx2 + .5, GH); }
      for (let gy = 34 % 24; gy < GH; gy += 24) { x.moveTo(0, gy + .5); x.lineTo(GW, gy + .5); } x.stroke();
      x.strokeStyle = CR.rgba(pal.ink, .12); x.lineWidth = 1.2; x.beginPath();
      for (let gx2 = 60; gx2 < GW; gx2 += 120) { x.moveTo(gx2 + .5, 0); x.lineTo(gx2 + .5, GH); }
      for (let gy = 34; gy < GH; gy += 120) { x.moveTo(0, gy + .5); x.lineTo(GW, gy + .5); } x.stroke();
      x.drawImage(CR.grainCanvas(GW, GH, .07, 72, '#FFFFFF'), 0, 0);
      radial(x, GW * .5, GH * .5, GW * .8, CR.rgba('#000000', 0), CR.rgba('#000814', .45)); },
    concrete(x) { x.fillStyle = pal.ground; x.fillRect(0, 0, GW, GH);
      // board-marked concrete: mostly fine aggregate and pores, the broad tone kept low (smoke is not concrete)
      x.globalCompositeOperation = 'overlay'; fbm(x, 81, .32, null, [[10, .35], [36, .45], [140, .8], [480, 1], [960, .8]]); x.globalCompositeOperation = 'source-over';
      for (let b = 0; b < 8; b++) { const yy = 34 + b * 150 + (CR.hash(b, 82) - .5) * 10; x.fillStyle = CR.rgba('#000000', .18); x.fillRect(0, yy, GW, 2); x.fillStyle = CR.rgba('#FFFFFF', .04); x.fillRect(0, yy + 2, GW, 1.5); }
      for (let i = 0; i < 1400; i++) { const px = CR.hash(i, 83) * GW, py = CR.hash(i, 84) * GH, r = .5 + Math.pow(CR.hash(i, 85), 3) * 4.2;
        x.fillStyle = CR.rgba('#000000', .26 + CR.hash(i, 86) * .3); x.beginPath(); x.ellipse(px, py, r, r * .8, 0, 0, 6.2832); x.fill();
        x.fillStyle = CR.rgba('#FFFFFF', .05); x.beginPath(); x.ellipse(px + r * .4, py + r * .5, r * .7, r * .4, 0, 0, 6.2832); x.fill(); }
      x.drawImage(CR.grainCanvas(GW, GH, .18, 87, '#000000'), 0, 0); x.drawImage(CR.grainCanvas(GW, GH, .06, 88, '#FFFFFF'), 0, 0);
      radial(x, GW * .5, -GH * .1, GW * .8, CR.rgba('#DCE6EA', .14), CR.rgba('#DCE6EA', 0), 'screen');
      radial(x, GW * .5, GH * .5, GW * .8, CR.rgba('#000000', 0), CR.rgba('#000000', .55)); },
    light_table(x) { // a backlit diffuser: white-hot centre, cool falloff to the frame, a few specks of dust
      const g = x.createRadialGradient(GW * .5, GH * .5, 0, GW * .5, GH * .5, GW * .62); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.6, CR.mix(pal.ground, '#FFFFFF', .55)); g.addColorStop(1, CR.mix(pal.ground, '#A9B3B4', .35));
      x.fillStyle = g; x.fillRect(0, 0, GW, GH);
      x.globalCompositeOperation = 'multiply'; fbm(x, 91, .018); x.globalCompositeOperation = 'source-over';
      x.drawImage(CR.grainCanvas(GW, GH, .03, 93, '#5C6466'), 0, 0);
      motes(x, 60, 92, '#2A2E30', .12); },
    footage_sharp(x) { x.fillStyle = '#000'; x.fillRect(0, 0, GW, GH); },
    footage_moving(x) { x.fillStyle = '#000'; x.fillRect(0, 0, GW, GH); },
  };
  CR.drawCover = (x, im, w, h, fx = .5, fy = .5, filter) => {
    const iw = im.videoWidth || im.naturalWidth || im.width, ih = im.videoHeight || im.naturalHeight || im.height; if (!iw || !ih) return;
    const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
    x.save(); if (filter) x.filter = filter; x.drawImage(im, (w - dw) * fx, (h - dh) * fy, dw, dh); x.restore();
  };
  // the footage grade of the title (look.fx.grade) approximated on the stills the kit shows, so a cut from the graded
  // shot into the graphic does not jump in colour
  const GRADES = { clean709: '', natural: '', bleach_bypass: 'saturate(.55) contrast(1.18)', kodachrome_warm: 'saturate(1.15) sepia(.12) contrast(1.06)',
    cold_steel: 'saturate(.7) hue-rotate(-8deg) brightness(.96) contrast(1.08)', tungsten_night: 'saturate(.85) hue-rotate(-14deg) brightness(.9)',
    teal_steel: 'saturate(.8) hue-rotate(-10deg) contrast(1.1)', golden_hour: 'sepia(.22) saturate(1.1) brightness(1.03)',
    mono_silver: 'grayscale(1) contrast(1.12)', archive_sepia: 'grayscale(1) sepia(.45) contrast(1.05)' };
  CR.gradeFilter = () => GRADES[CR.grade] || '';
  // set how the footage ground sits under this composition: blur px, brightness, saturation
  CR.groundLook = (blur, bright, sat) => { vfilter = `${CR.gradeFilter()} blur(${blur || 0}px) brightness(${bright == null ? .55 : bright}) saturate(${sat == null ? .9 : sat})`.trim(); if (still && gx) { gx.fillStyle = '#000'; gx.fillRect(0, 0, GW, GH); CR.drawCover(gx, still, GW, GH, .5, .5, vfilter); } };
  CR.still = null;                                          // the sharp footage still (Image) for compositions that frame it
  CR.groundBuild = () => {
    ground.style.backgroundImage = 'none';
    ground.innerHTML = '';
    gc = document.createElement('canvas'); gc.width = GW; gc.height = GH; gc.style.cssText = 'position:absolute;left:0;top:0;width:2040px;height:1148px';
    ground.appendChild(gc); gx = gc.getContext('2d');
    (DRAW[CR.W] || DRAW.void_black)(gx);
    const src = S.still || S.ground || '';
    if (CR.foot || src) {
      CR.wait(CR.img(src).then(im => { still = im; CR.still = im; if (CR.foot && im) CR.groundLook(CR._gl ? CR._gl[0] : 0, CR._gl ? CR._gl[1] : .55, CR._gl ? CR._gl[2] : .9); }));
    }
    if (CR.W === 'footage_moving' && S.clip) {
      const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true;
      CR.wait(fetch(S.clip).then(r => r.blob()).then(b => { v.src = URL.createObjectURL(b); return new Promise(res => {
        v.addEventListener('loadeddata', () => { vid = v; res(); }, { once: true }); v.addEventListener('error', () => res(), { once: true }); setTimeout(res, 8000); }); }).catch(() => null));
    }
    // vignette per world
    const vg = { void_black: .55, navy_falloff: .5, charcoal_light: .5, glass_dark: .5, paper_desk: .25, newsprint: .18, blueprint: .3, concrete: .35, light_table: .08, footage_sharp: .45, footage_moving: .45 }[CR.W] || .4;
    vig.style.background = `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 52%, rgba(0,0,0,${vg}) 100%)`;
  };
  // compositions call this before they lay out (e.g. a full-bleed photo comp wants the footage sharp, a quote comp dim)
  CR.footLook = (blur, bright, sat) => { CR._gl = [blur, bright, sat]; if (still) CR.groundLook(blur, bright, sat); };
  CR.groundFrame = t => {
    if (!vid || !vid.duration || !gx) return null;
    const want = clamp((S.clip_t0 || 0) + t, 0, Math.max(0, vid.duration - 0.04));
    const draw = () => { gx.fillStyle = '#000'; gx.fillRect(0, 0, GW, GH); CR.drawCover(gx, vid, GW, GH, .5, .5, vfilter || `${CR.gradeFilter()} brightness(.55) saturate(.9)`); };
    if (Math.abs(vid.currentTime - want) < 0.004 && vid.readyState >= 2) { draw(); return null; }
    // wait for the seek itself (a loaded machine can take seconds): a 1.5 s fallback drew the previous frame under load
    // (review 10-03) — the long guard only keeps a broken clip from hanging the render
    return new Promise(res => { let fin = false; const done = () => { if (fin) return; fin = true; draw(); res(); };
      vid.addEventListener('seeked', done, { once: true }); setTimeout(done, 12000); vid.currentTime = want; });
  };

  // ── TEXTURES (one per title): grain | paper | film_gate | halftone | vhs | none ─────────────────────────────────
  let tex = null, gate = null, vhsBand = null;
  const grainEl = document.getElementById('grain');
  CR.textureBuild = () => {
    const t = CR.texture;
    const amt = { none: 0, grain: CR.light ? .05 : .06, paper: .035, film_gate: .055, halftone: .03, vhs: .07 }[t];
    grainEl.style.opacity = (amt == null ? .04 : amt).toFixed(3);
    if (CR.light) grainEl.style.mixBlendMode = 'multiply';
    const stage = document.getElementById('stage');
    if (t === 'paper') {
      tex = CR.el('canvas', 'position:absolute;inset:0;width:1920px;height:1080px;pointer-events:none;mix-blend-mode:multiply;opacity:.55', stage);
      tex.width = 960; tex.height = 540; const x = tex.getContext('2d');
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 960, 540); x.drawImage(CR.noise(960, 540, 90, 101, .18, 'multiply'), 0, 0); x.drawImage(CR.grainCanvas(960, 540, .12, 102, '#6B5A40'), 0, 0);
    }
    if (t === 'halftone') {
      tex = CR.el('div', `position:absolute;inset:0;pointer-events:none;opacity:${CR.light ? .10 : .06};mix-blend-mode:${CR.light ? 'multiply' : 'overlay'};` +
        `background-image:radial-gradient(circle, ${CR.light ? '#000' : '#fff'} 0.9px, rgba(0,0,0,0) 1.4px);background-size:5px 5px;transform:rotate(15deg) scale(1.3)`, stage);
    }
    if (t === 'film_gate') {
      gate = CR.el('div', 'position:absolute;inset:0;pointer-events:none;border-radius:44px;box-shadow:inset 0 0 0 26px #000, inset 0 0 60px 34px rgba(0,0,0,.85)', stage);
      tex = CR.el('div', 'position:absolute;inset:0;pointer-events:none;background:#FFF7E8;mix-blend-mode:soft-light;opacity:0', stage);
    }
    if (t === 'vhs') {
      tex = CR.el('div', 'position:absolute;inset:0;pointer-events:none;opacity:.10;background:repeating-linear-gradient(0deg, rgba(0,0,0,.9) 0 1px, rgba(0,0,0,0) 1px 3px)', stage);
      vhsBand = CR.el('div', 'position:absolute;left:0;right:0;bottom:6px;height:14px;pointer-events:none;opacity:.55;mix-blend-mode:screen;filter:blur(.6px)', stage);
      scene.style.filter = 'blur(.55px) saturate(1.12)';
    }
  };
  CR.textureFrame = t => {
    const f = Math.floor((CR.stepped ? CR.tq(t) : t) * 24 + 1e-6);
    if (CR.texture !== 'none') grainEl.style.backgroundPosition = `${Math.floor(CR.hash(f, 3) * 512)}px ${Math.floor(CR.hash(f, 4) * 512)}px`;
    if (CR.texture === 'film_gate' && tex) {
      tex.style.opacity = (0.05 + 0.03 * Math.sin(t * 9.1) + 0.02 * Math.sin(t * 23.7)).toFixed(3);
      const st = document.getElementById('stage');
      st.style.transform = `translate(${(0.5 * Math.sin(t * 4.3)).toFixed(2)}px,${(0.45 * Math.sin(t * 3.1 + 1)).toFixed(2)}px)`;
    }
    if (CR.texture === 'vhs' && vhsBand) {
      const fr = Math.floor(t * 30);
      vhsBand.style.background = `linear-gradient(90deg, rgba(255,255,255,${(.15 + CR.hash(fr, 9) * .2).toFixed(2)}) ${Math.floor(CR.hash(fr, 10) * 40)}%, rgba(120,140,255,.25) ${40 + Math.floor(CR.hash(fr, 11) * 40)}%, rgba(255,255,255,.1))`;
      vhsBand.style.transform = `translateX(${Math.floor((CR.hash(fr, 12) - .5) * 16)}px)`;
    }
  };
})();
