/* =====================================================================
   ARCHIVE TIMESTAMP CUT (learned) — graphics kit
   Film: "The Man Who Survived Both Atomic Bombs" (Hiroshima / Nagasaki 1945)
   Language: cold silver archive, small plain white facts, rose duotone
   warning shots, black silence beats, a slow target-scope plate laid on a
   real period map. No boxes, no bounce, no ornament, no logos.
   Every animated property is a pure function of t.
   ===================================================================== */

var AK = (typeof parts === 'object' && parts) ? parts : {};
var AK_PAL = (typeof S === 'object' && S && S.palette && typeof S.palette === 'object') ? S.palette
           : ((typeof P === 'object' && P) ? P : {});

function akCol(k, d) {
  var v = AK_PAL ? AK_PAL[k] : null;
  return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : d;
}
var C_INK = akCol('ink', '#F2F0EE');
var C_GRD = akCol('ground', '#101012');
var C_ACC = akCol('accent', '#E8788A');
var C_AC2 = akCol('accent2', '#6FA3C0');
var C_MUT = akCol('muted', '#827F7F');
var C_MAP = akCol('map', '#5B6369');
var C_RDO = akCol('readout', '#AEA5A6');

/* ---------- small helpers ---------------------------------------------- */

function akRgb(h) {
  var s = (typeof h === 'string' ? h : '#000000').replace('#', '');
  if (s.length !== 6) s = '000000';
  return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0];
}
function akRgba(h, a) { var c = akRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

var AK_SHADOW = '0 2px 20px ' + akRgba(C_GRD, 0.6) + ', 0 1px 3px ' + akRgba(C_GRD, 0.6);

function akStr(v, d) {
  if (typeof v === 'string') { var s = v.replace(/\s+/g, ' ').trim(); return s.length ? s : (d || ''); }
  if (typeof v === 'number' && isFinite(v)) return String(v);
  return d || '';
}
function akArr(v) {
  if (!Array.isArray(v)) return [];
  var o = [];
  for (var i = 0; i < v.length; i++) { var s = akStr(v[i]); if (s) o.push(s); }
  return o;
}
function akBool(v) {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') return /^(true|yes|1|colou?r)$/i.test(v.trim());
  return false;
}
function akSS(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }           /* smoothstep: peak speed 1.5x avg */
function akSeg(t, a, b) { if (b <= a) return t >= a ? 1 : 0; return clamp((t - a) / (b - a), 0, 1); }

var AK_D = (typeof D === 'number' && D > 0) ? D : 3;
var AK_OUT = (typeof OUT === 'number' && OUT > 0) ? OUT : Math.max(0, AK_D - 0.45);

function akExit(t) { return 1 - akSS(akSeg(t, AK_OUT, AK_D)); }
function akOp(el, v) { if (el) el.style.opacity = String(Math.round(clamp(v, 0, 1) * 1000) / 1000); }

function akEl(tag, css, parent) {
  var e = document.createElement(tag);
  if (css) { for (var k in css) { if (Object.prototype.hasOwnProperty.call(css, k)) e.style[k] = css[k]; } }
  (parent || scene).appendChild(e);
  return e;
}
function akFull(css, parent) {
  var base = { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px' };
  if (css) { for (var k in css) { if (Object.prototype.hasOwnProperty.call(css, k)) base[k] = css[k]; } }
  return akEl('div', base, parent);
}

/* Estimate one-line width without waiting for font metrics (deterministic). */
function akFit(s, size, maxW, small, k) {
  var n = Math.max(1, (s || '').length);
  k = k || 0.74;
  if (n * size * k <= maxW) return size;
  var f = Math.floor(maxW / (n * k));
  var floor = Math.max(18, small || Math.round(size * 0.45));
  return Math.max(floor, f);
}

/* One line of fact text. o: y, size, weight, color, track, maxW, small, align, x, mono */
function akText(s, o) {
  o = o || {};
  var size = o.size || 34;
  var track = (typeof o.track === 'number') ? o.track : 0.06;
  var k = o.mono ? (0.62 + track) : (0.68 + track);
  if (o.maxW) size = akFit(s, size, o.maxW, o.small, k);
  var css = {
    position: 'absolute',
    top: Math.round((o.y || 540) - size * 0.52) + 'px',
    fontFamily: o.mono ? "'Space Mono', monospace" : "'Inter', sans-serif",
    fontWeight: String(o.weight || 700),
    fontSize: size + 'px',
    lineHeight: '1',
    letterSpacing: track + 'em',
    textTransform: 'uppercase',
    color: o.color || C_INK,
    whiteSpace: 'nowrap',
    textShadow: o.shadow === false ? 'none' : AK_SHADOW,
    opacity: '0',
    boxSizing: 'border-box'
  };
  if (o.align === 'left') {
    css.left = Math.round(o.x || 0) + 'px';
    css.textAlign = 'left';
  } else {
    css.left = '0px';
    css.width = W + 'px';
    css.textAlign = 'center';
    css.paddingLeft = track + 'em';   /* balance the trailing tracking so the fact sits on x=960 */
  }
  var e = akEl('div', css, o.parent);
  e.textContent = s;
  e._size = size;
  e._k = k;
  return e;
}

function akLoad(src) {
  return new Promise(function (res) {
    if (!src) { res(null); return; }
    var im = new Image();
    im.onload = function () {
      if (im.decode) { im.decode().then(function () { res(im); }, function () { res(im); }); }
      else res(im);
    };
    im.onerror = function () { res(null); };
    im.src = src;
  });
}

function akGrain(o) {
  try {
    if (typeof grain === 'function') {
      var g = grain(o);
      if (g && g.nodeType === 1 && !g.parentNode) scene.appendChild(g);
    }
  } catch (e) { /* grain is optional */ }
}

function akPush(el, s, dx, dy) {
  if (!el) return;
  el.style.transform = 'translate3d(' + (dx || 0).toFixed(2) + 'px,' + (dy || 0).toFixed(2) + 'px,0) scale(' + s.toFixed(5) + ')';
}

/* Projector exposure flicker: brightness only, no frame movement. */
function akMakeFlicker() {
  AK.flick = [];
  var r = (typeof rnd === 'function') ? rnd : (function () { var x = 0.37; return function () { x = (x * 9301 + 49297) % 233280 / 233280; return x; }; })();
  for (var i = 0; i < 96; i++) AK.flick.push(0.975 + r() * 0.05);
}
function akFlicker(t) {
  if (!AK.flick || !AK.flick.length) return 1;
  var f = Math.max(0, t) * 11, i = Math.floor(f), fr = f - i, n = AK.flick.length;
  return lerp(AK.flick[i % n], AK.flick[(i + 1) % n], fr);
}

/* Archive footage layer. Uses the sharp frame; falls back to the engine ground. */
function akFootage(src, colour) {
  var el;
  if (src) {
    el = akFull({
      backgroundImage: 'url("' + src + '")', backgroundSize: 'cover', backgroundPosition: 'center',
      transformOrigin: '50% 50%', willChange: 'transform'
    });
    AK.waits.push(akLoad(src));
  } else {
    el = ground;
    el.style.transformOrigin = '50% 50%';
  }
  AK.grade = colour ? 'saturate(0.9) contrast(1.06)' : 'grayscale(1) contrast(1.22)';
  AK.baseBright = colour ? 0.97 : 0.9;
  el.style.filter = AK.grade + ' brightness(' + AK.baseBright + ')';
  return el;
}
function akFootFilter(t) {
  if (!AK.foot || !AK.grade) return;
  AK.foot.style.filter = AK.grade + ' brightness(' + (AK.baseBright * akFlicker(t)).toFixed(4) + ')';
}

/* Very faint cold cast over the grey, like a cold silver print. */
function akCold() {
  akFull({ background: akRgba(C_AC2, 0.07), mixBlendMode: 'soft-light', pointerEvents: 'none' });
}
function akEdge(strength) {
  akFull({
    background: 'radial-gradient(ellipse 75% 70% at 50% 46%, rgba(0,0,0,0) 55%, ' + akRgba(C_GRD, strength) + ' 100%)',
    pointerEvents: 'none'
  });
}

function akCover(ctx, img, w, h, fx, fy) {
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  var s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
  var x = (w - dw) * (typeof fx === 'number' ? fx : 0.5), y = (h - dh) * (typeof fy === 'number' ? fy : 0.5);
  ctx.drawImage(img, x, y, dw, dh);
}

/* Flat two-colour duotone with auto levels (2% / 98% luminance). */
function akDuotone(ctx, w, h, dark, light) {
  var id = ctx.getImageData(0, 0, w, h), d = id.data, i, p;
  var hist = new Uint32Array(256), cnt = 0;
  for (p = 0; p < d.length; p += 16) {
    hist[(d[p] * 77 + d[p + 1] * 150 + d[p + 2] * 29) >> 8]++; cnt++;
  }
  var lo = 0, hi = 255, acc = 0;
  for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= cnt * 0.02) { lo = i; break; } }
  acc = 0;
  for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= cnt * 0.02) { hi = i; break; } }
  if (hi - lo < 64) { var mid = (hi + lo) / 2; lo = Math.max(0, mid - 32); hi = Math.min(255, mid + 32); }
  var a = akRgb(dark), b = akRgb(light), lut = new Uint8ClampedArray(768);
  for (i = 0; i < 256; i++) {
    var l = clamp((i - lo) / (hi - lo), 0, 1);
    l = l * l * (3 - 2 * l);
    lut[i * 3] = a[0] + (b[0] - a[0]) * l;
    lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * l;
    lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * l;
  }
  for (p = 0; p < d.length; p += 4) {
    var y = ((d[p] * 77 + d[p + 1] * 150 + d[p + 2] * 29) >> 8) * 3;
    d[p] = lut[y]; d[p + 1] = lut[y + 1]; d[p + 2] = lut[y + 2];
  }
  ctx.putImageData(id, 0, 0);
}

/* =====================================================================
   BUILD
   ===================================================================== */

function build() {
  AK.type = akStr(S && S.type, 'longhold').toLowerCase();
  AK.waits = [];
  scene.style.position = scene.style.position || 'absolute';
  scene.style.width = W + 'px';
  scene.style.height = H + 'px';
  scene.style.overflow = 'hidden';
  ground.style.backgroundColor = C_GRD;
  if (vig) vig.style.opacity = '0.55';
  akMakeFlicker();

  switch (AK.type) {
    case 'title':      bTitle(); break;
    case 'datestack':  bDatestack(); break;
    case 'rosetint':   bRosetint(); break;
    case 'blackbeat':  bBlackbeat(); break;
    case 'scopeplate': bScope(); break;
    case 'personcut':  bPerson(); break;
    case 'countline':  bCount(); break;
    case 'placeflash': bPlace(); break;
    case 'longhold':
    default:           AK.type = 'longhold'; bLonghold(); break;
  }
  window.__wait = Promise.all(AK.waits);
}

/* ---- title: the film's name arrives one word at a time over dim archive */
function bTitle() {
  ground.style.filter = 'grayscale(1) contrast(1.1)';
  ground.style.transformOrigin = '50% 50%';
  akCold();
  akEdge(0.7);
  akGrain(0.05);

  var title = akStr(S.title, akStr(S.text, ''));
  var words = title ? title.split(' ') : [];
  var n = Math.max(1, title.length);
  var size = 88;
  if (n * size * 0.74 > 1600 * 2) size = Math.max(40, Math.floor(3200 / (n * 0.74)));
  var longest = 0;
  for (var i = 0; i < words.length; i++) longest = Math.max(longest, words[i].length);
  if (longest * size * 0.74 > 1600) size = Math.max(36, Math.floor(1600 / (longest * 0.74)));

  var block = akEl('div', {
    position: 'absolute', left: '160px', width: '1600px', bottom: (H - 506) + 'px',
    textAlign: 'center', fontFamily: "'Inter', sans-serif", fontWeight: '700',
    fontSize: size + 'px', lineHeight: '1.14', letterSpacing: '0.06em',
    textTransform: 'uppercase', color: C_INK, textShadow: AK_SHADOW, whiteSpace: 'normal', textWrap: 'balance'
  });
  AK.words = [];
  for (var j = 0; j < words.length; j++) {
    var sp = document.createElement('span');
    sp.textContent = words[j];
    sp.style.opacity = '0';
    block.appendChild(sp);
    if (j < words.length - 1) block.appendChild(document.createTextNode(' '));
    AK.words.push(sp);
  }
  var span = Math.max(1.0, Math.min(2.0, AK_D * 0.5));
  AK.wStep = words.length > 1 ? Math.min(0.28, span / (words.length - 1)) : 0;
  AK.wStart = 0.35;
  AK.wEnd = AK.wStart + Math.max(0, words.length - 1) * AK.wStep + 0.25;

  AK.rule = akEl('div', {
    position: 'absolute', top: '522px', left: '960px', width: '0px', height: '1px',
    background: akRgba(C_INK, 0.55)
  });
  var sub = akStr(S.sub, '');
  AK.sub = sub ? akText(sub, { y: 575, size: 36, weight: 600, track: 0.2, color: akRgba(C_INK, 0.72), maxW: 1500 }) : null;
}
function fTitle(t) {
  var p = akSS(t / AK_D);
  akPush(ground, 1 + 0.03 * p, 0, 0);
  var ex = akExit(t);
  for (var i = 0; i < AK.words.length; i++) {
    var a = AK.wStart + i * AK.wStep;
    akOp(AK.words[i], akSS(akSeg(t, a, a + 0.25)) * ex);
  }
  var r = akSS(akSeg(t, AK.wEnd, AK.wEnd + 0.7));
  var w = 220 * r;
  AK.rule.style.width = w.toFixed(1) + 'px';
  AK.rule.style.left = (960 - w / 2).toFixed(1) + 'px';
  akOp(AK.rule, r * ex);
  if (AK.sub) akOp(AK.sub, akSS(akSeg(t, AK.wEnd + 0.3, AK.wEnd + 0.7)) * ex);
}

/* ---- datestack: date, then time, then place, each replacing the last */
function bDatestack() {
  AK.foot = akFootage(S.frame, false);
  akCold();
  akGrain(0.05);
  var beats = akArr(S.beats);
  if (!beats.length) {
    var tryF = [akStr(S.date), akStr(S.time), akStr(S.place)];
    for (var i = 0; i < tryF.length; i++) if (tryF[i]) beats.push(tryF[i]);
  }
  if (beats.length > 4) beats = beats.slice(0, 4);
  var n = beats.length;
  var step = n > 1 ? Math.min(1.4, Math.max(0.4, (AK_OUT - 0.8) / (n - 1))) : 0;
  AK.beats = [];
  for (var j = 0; j < n; j++) {
    AK.beats.push({ el: akText(beats[j], { y: 500, size: 88, weight: 700, track: 0.05, maxW: 1640, small: 44 }), at: j * step });
  }
}
function fDatestack(t) {
  akPush(AK.foot, 1 + 0.025 * akSS(t / AK_D), 0, 0);
  akFootFilter(t);
  var ex = akExit(t);
  for (var i = 0; i < AK.beats.length; i++) {
    var b = AK.beats[i];
    var next = (i + 1 < AK.beats.length) ? AK.beats[i + 1].at : Infinity;
    var o = (t >= b.at && t < next) ? akSS(akSeg(t, b.at, b.at + 0.2)) : 0;
    if (i === AK.beats.length - 1) o *= ex;
    akOp(b.el, o);
  }
}

/* ---- rosetint: flat rose duotone warning on a harrowing real shot */
function bRosetint() {
  var src = S.frame || S.ground || '';
  ground.style.opacity = '0';
  if (vig) vig.style.opacity = '0.35';
  var cv = akEl('canvas', {
    position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px',
    transformOrigin: '50% 50%', willChange: 'transform'
  });
  cv.width = W; cv.height = H;
  AK.foot = cv;
  var ctx = cv.getContext('2d');
  if (ctx) { ctx.fillStyle = C_GRD; ctx.fillRect(0, 0, W, H); }
  AK.waits.push(akLoad(src).then(function (img) {
    if (!img || !ctx) return;
    try {
      akCover(ctx, img, W, H, 0.5, 0.5);
      akDuotone(ctx, W, H, C_GRD, C_ACC);
    } catch (e) {
      /* canvas refused: CSS duotone fallback on the plain footage */
      cv.style.display = 'none';
      var lay = akFull({
        backgroundImage: 'url("' + src + '")', backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'grayscale(1) contrast(1.3)', transformOrigin: '50% 50%'
      });
      lay.parentNode.insertBefore(lay, lay.parentNode.firstChild);
      akFull({ background: C_ACC, mixBlendMode: 'multiply' });
      akFull({ background: C_GRD, mixBlendMode: 'lighten' });
      AK.foot = lay;
    }
  }));
  akGrain(0.06);
  var label = akStr(S.label, '');
  AK.label = label ? akText(label, { align: 'left', x: 140, y: 870, size: 52, weight: 700, track: 0.1, maxW: 1300 }) : null;
}
function fRosetint(t) {
  akPush(AK.foot, 1 + 0.05 * akSS(t / AK_D), 0, 0);
  if (AK.label) akOp(AK.label, akSS(akSeg(t, 0.15, 0.4)) * akExit(t));
}

/* ---- blackbeat: pure black silence, optional clock time */
function bBlackbeat() {
  ground.style.backgroundImage = 'none';
  ground.style.background = '#000000';
  ground.style.filter = 'none';
  if (vig) vig.style.opacity = '0';
  akFull({ background: '#000000' });
  akGrain(0.045);
  var tm = akStr(S.time, akStr(S.label, ''));
  AK.time = tm ? akText(tm, { y: 540, size: 56, weight: 600, track: 0.12, maxW: 1400, shadow: false }) : null;
}
function fBlackbeat(t) {
  if (!AK.time) return;
  var a = Math.min(0.35, AK_D * 0.2);
  akOp(AK.time, akSS(akSeg(t, a, a + 0.3)) * akExit(t));
}

/* ---- scopeplate: real period map, thin scope ring, slow drift */
function bScope() {
  if (vig) vig.style.opacity = '0.7';
  var mw = Math.round(W * 1.08), mh = Math.round(H * 1.08);
  AK.map = akEl('div', {
    position: 'absolute', left: Math.round(-W * 0.04) + 'px', top: Math.round(-H * 0.04) + 'px',
    width: mw + 'px', height: mh + 'px', transformOrigin: '50% 50%', willChange: 'transform'
  });
  if (S.photo) {
    AK.map.style.backgroundImage = 'url("' + S.photo + '")';
    AK.map.style.backgroundSize = 'cover';
    AK.map.style.backgroundPosition = 'center';
    AK.map.style.filter = 'grayscale(1) contrast(1.15) brightness(0.62)';
    AK.waits.push(akLoad(S.photo));
    ground.style.opacity = '0';
    akFull({ background: C_MAP, mixBlendMode: 'color', opacity: '0.85' });
    akFull({ background: akRgba(C_GRD, 0.28) });
  } else {
    /* no real map: plain ops grid over the dimmed footage, nothing geographic invented */
    ground.style.filter = 'grayscale(1)';
    var cv = akEl('canvas', { position: 'absolute', left: '0px', top: '0px', width: mw + 'px', height: mh + 'px' }, AK.map);
    cv.width = mw; cv.height = mh;
    var c = cv.getContext('2d');
    if (c) {
      c.fillStyle = akRgba(C_GRD, 0.55); c.fillRect(0, 0, mw, mh);
      var x, y;
      c.strokeStyle = akRgba(C_MAP, 0.22); c.lineWidth = 1;
      for (x = 0.5; x < mw; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, mh); c.stroke(); }
      for (y = 0.5; y < mh; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(mw, y); c.stroke(); }
      c.strokeStyle = akRgba(C_MAP, 0.55);
      for (x = 0.5; x < mw; x += 160) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, mh); c.stroke(); }
      for (y = 0.5; y < mh; y += 160) { c.beginPath(); c.moveTo(0, y); c.lineTo(mw, y); c.stroke(); }
    }
  }
  akEdge(0.75);
  akGrain(0.05);

  /* reticle, 640px ring centred on 960,500 */
  var R = 320, C = 360, svg = [];
  svg.push('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">');
  svg.push('<g fill="none" stroke="' + C_INK + '" stroke-linecap="butt">');
  svg.push('<circle cx="' + C + '" cy="' + C + '" r="' + R + '" stroke-width="1.6" stroke-opacity="0.8"/>');
  svg.push('<circle cx="' + C + '" cy="' + C + '" r="10" stroke-width="1.2" stroke-opacity="0.8"/>');
  for (var a = 0; a < 360; a += 5) {
    var rad = a * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad), r0, r1, op, sw;
    if (a % 90 === 0) { r0 = R; r1 = R + 30; op = 0.8; sw = 1.6; }
    else if (a % 30 === 0) { r0 = R - 14; r1 = R; op = 0.7; sw = 1.2; }
    else { r0 = R - 6; r1 = R; op = 0.4; sw = 1; }
    svg.push('<line x1="' + (C + cs * r0).toFixed(1) + '" y1="' + (C + sn * r0).toFixed(1) +
             '" x2="' + (C + cs * r1).toFixed(1) + '" y2="' + (C + sn * r1).toFixed(1) +
             '" stroke-width="' + sw + '" stroke-opacity="' + op + '"/>');
  }
  /* crosshair with a centre gap; upper arm stops short of the city label */
  svg.push('<line x1="' + (C - 290) + '" y1="' + C + '" x2="' + (C - 60) + '" y2="' + C + '" stroke-width="1" stroke-opacity="0.6"/>');
  svg.push('<line x1="' + (C + 60) + '" y1="' + C + '" x2="' + (C + 290) + '" y2="' + C + '" stroke-width="1" stroke-opacity="0.6"/>');
  svg.push('<line x1="' + C + '" y1="' + (C + 60) + '" x2="' + C + '" y2="' + (C + 290) + '" stroke-width="1" stroke-opacity="0.6"/>');
  svg.push('<line x1="' + C + '" y1="' + (C - 60) + '" x2="' + C + '" y2="' + (C - 190) + '" stroke-width="1" stroke-opacity="0.6"/>');
  for (var m = 100; m <= 260; m += 40) {
    svg.push('<line x1="' + (C - m) + '" y1="' + (C - 5) + '" x2="' + (C - m) + '" y2="' + (C + 5) + '" stroke-width="1" stroke-opacity="0.5"/>');
    svg.push('<line x1="' + (C + m) + '" y1="' + (C - 5) + '" x2="' + (C + m) + '" y2="' + (C + 5) + '" stroke-width="1" stroke-opacity="0.5"/>');
    svg.push('<line x1="' + (C - 5) + '" y1="' + (C + m) + '" x2="' + (C + 5) + '" y2="' + (C + m) + '" stroke-width="1" stroke-opacity="0.5"/>');
  }
  svg.push('</g></svg>');
  AK.ring = akEl('div', {
    position: 'absolute', left: (960 - 360) + 'px', top: (500 - 360) + 'px', width: '720px', height: '720px',
    transformOrigin: '50% 50%', opacity: '0'
  });
  AK.ring.innerHTML = svg.join('');

  var city = akStr(S.city, akStr(S.subject, ''));
  AK.city = city ? akText(city, { y: 190, size: 46, weight: 700, track: 0.16, maxW: 700, small: 28 }) : null;
  var coords = akStr(S.coords, '');
  AK.coords = coords ? akText(coords, { y: 240, size: 28, mono: true, track: 0.08, color: C_RDO, maxW: 640 }) : null;

  AK.readTxt = akStr(S.readout, '');
  if (AK.readTxt) {
    var rs = akFit(AK.readTxt, 34, 1600, 20, 0.7);
    var est = AK.readTxt.length * rs * 0.7;
    AK.read = akText('', { align: 'left', x: Math.max(60, 960 - est / 2), y: 864, size: rs, mono: true, track: 0.08, color: C_RDO });
  } else {
    AK.read = null;
  }
}
function fScope(t) {
  var p = akSS(t / AK_D);
  akPush(AK.map, 1 + 0.02 * p, lerp(W * 0.02, -W * 0.02, p), lerp(H * 0.012, -H * 0.012, p));
  var ex = akExit(t);
  var rin = akSS(akSeg(t, 1.0, 1.8));
  var c0 = Math.max(2.2, AK_D * 0.62), c1 = Math.max(c0 + 0.6, AK_OUT);
  var contract = 1 - 0.1 * akSS(akSeg(t, c0, c1));
  akPush(AK.ring, lerp(1.03, 1, rin) * contract, 0, 0);
  akOp(AK.ring, rin * ex);
  if (AK.city) akOp(AK.city, akSS(akSeg(t, 2.0, 2.5)) * ex);
  if (AK.coords) akOp(AK.coords, akSS(akSeg(t, 2.3, 2.8)) * ex);
  if (AK.read) {
    var n = Math.floor(AK.readTxt.length * akSeg(t, 2.6, 2.6 + Math.min(1.2, 0.035 * AK.readTxt.length)) + 1e-6);
    AK.read.textContent = AK.readTxt.slice(0, n);
    akOp(AK.read, (t >= 2.6 ? 1 : 0) * ex);
  }
}

/* ---- longhold: one reel uncut, very slow push, one fact on the first beat */
function bLonghold() {
  var colour = akBool(S.colour) || akBool(S.color);
  AK.foot = akFootage(S.frame, colour);
  if (!colour) akCold();
  akGrain(0.05);
  var label = akStr(S.label, '');
  AK.label = label ? akText(label, { y: 540, size: 50, weight: 600, track: 0.12, maxW: 1500 }) : null;
}
function fLonghold(t) {
  akPush(AK.foot, 1 + 0.045 * akSS(t / AK_D), 0, 0);
  akFootFilter(t);
  if (AK.label) {
    var a = Math.min(0.5, AK_D * 0.1);
    var b = Math.min(3.1, Math.max(a + 1.0, AK_OUT - 0.4));
    akOp(AK.label, akSS(akSeg(t, a, a + 0.4)) * (1 - akSS(akSeg(t, b, b + 0.4))) * akExit(t));
  }
}

/* ---- personcut: named portrait flash, name lower left */
function bPerson() {
  var name = akStr(S.name, akStr(S.subject, ''));
  var meta = akStr(S.meta, '');
  if (S.photo) {
    ground.style.opacity = '0';
    AK.photo = akFull({
      backgroundImage: 'url("' + S.photo + '")', backgroundSize: 'cover', backgroundPosition: '50% 30%',
      filter: 'grayscale(1) contrast(1.14) brightness(0.88)', transformOrigin: '50% 38%', willChange: 'transform'
    });
    AK.waits.push(akLoad(S.photo));
    akCold();
    akFull({ background: 'linear-gradient(to top, ' + akRgba(C_GRD, 0.78) + ' 0%, ' + akRgba(C_GRD, 0.35) + ' 30%, rgba(0,0,0,0) 55%)' });
    akGrain(0.05);
    AK.name = name ? akText(name, { align: 'left', x: 140, y: 785, size: 58, weight: 700, track: 0.05, maxW: 1400, small: 32 }) : null;
    AK.meta = meta ? akText(meta, { align: 'left', x: 140, y: 858, size: 34, weight: 600, track: 0.08, color: C_RDO, maxW: 1400, small: 22 }) : null;
  } else {
    /* no photo: the name carries the frame in type over the dim reel */
    AK.photo = null;
    ground.style.filter = 'grayscale(1)';
    ground.style.transformOrigin = '50% 50%';
    akEdge(0.7);
    akGrain(0.05);
    AK.name = name ? akText(name, { y: 478, size: 72, weight: 700, track: 0.06, maxW: 1600, small: 36 }) : null;
    AK.meta = meta ? akText(meta, { y: 552, size: 30, weight: 600, track: 0.12, color: C_MUT, maxW: 1500, small: 18 }) : null;
  }
}
function fPerson(t) {
  var p = akSS(t / AK_D);
  if (AK.photo) akPush(AK.photo, 1 + 0.035 * p, 0, 0);
  else akPush(ground, 1 + 0.02 * p, 0, 0);
  var ex = akExit(t);
  if (AK.name) akOp(AK.name, akSS(akSeg(t, 0.4, 0.7)) * ex);
  if (AK.meta) akOp(AK.meta, akSS(akSeg(t, 0.6, 0.9)) * ex);
}

/* ---- countline: a single span, cut in whole, never rolled */
function bCount() {
  AK.foot = akFootage(S.frame, false);
  akCold();
  akFull({ background: 'rgba(0,0,0,0.25)' });
  akGrain(0.05);
  var fig = akStr(S.figure, akStr(S.value, ''));
  var label = akStr(S.label, '');
  AK.fig = fig ? akText(fig, { y: 490, size: 128, weight: 700, track: 0.04, maxW: 1640, small: 64 }) : null;
  AK.lab = label ? akText(label, { y: 604, size: 44, weight: 600, track: 0.12, maxW: 1500, small: 26 }) : null;
  AK.fadeAt = Math.min(2.0, Math.max(0.6, AK_OUT - 0.35));
}
function fCount(t) {
  akPush(AK.foot, 1 + 0.015 * akSS(t / AK_D), 0, 0);
  akFootFilter(t);
  var o = 1 - akSS(akSeg(t, AK.fadeAt, AK.fadeAt + 0.35));
  if (AK.fig) akOp(AK.fig, o);
  if (AK.lab) akOp(AK.lab, o * 0.92);
}

/* ---- placeflash: new place on the first frame of the new shot */
function bPlace() {
  AK.foot = akFootage(S.frame, false);
  akCold();
  akGrain(0.05);
  var place = akStr(S.place, akStr(S.city, ''));
  var date = akStr(S.date, '');
  AK.place = place ? akText(place, { y: 490, size: 84, weight: 700, track: 0.07, maxW: 1640, small: 44 }) : null;
  AK.date = date ? akText(date, { y: 565, size: 44, weight: 600, track: 0.12, maxW: 1500, small: 26 }) : null;
  AK.hold = Math.min(2.0, Math.max(0.8, AK_OUT - 0.3));
}
function fPlace(t) {
  akPush(AK.foot, 1 + 0.02 * akSS(t / AK_D), 0, 0);
  akFootFilter(t);
  var o = 1 - akSS(akSeg(t, AK.hold, AK.hold + 0.3));
  if (AK.place) akOp(AK.place, o);
  if (AK.date) akOp(AK.date, o);
}

/* =====================================================================
   FRAME
   ===================================================================== */

function frame(t) {
  t = clamp(typeof t === 'number' ? t : 0, 0, AK_D);
  switch (AK.type) {
    case 'title':      fTitle(t); break;
    case 'datestack':  fDatestack(t); break;
    case 'rosetint':   fRosetint(t); break;
    case 'blackbeat':  fBlackbeat(t); break;
    case 'scopeplate': fScope(t); break;
    case 'personcut':  fPerson(t); break;
    case 'countline':  fCount(t); break;
    case 'placeflash': fPlace(t); break;
    default:           fLonghold(t); break;
  }
}
