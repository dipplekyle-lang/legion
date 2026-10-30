/* mentor.js — the MENTOR kit, from the founder's reference (an AI-mastery course intro): a real presenter in a dim
   boardroom, and the graphics live IN his shot — glossy blue glass cards sliding past at table height, a huge neon
   countdown, a glass badge filling and draining with a percentage, a chat bar typing his example prompt, the path
   through a settings menu. Between his shots: full-screen glass objects on a dark horizon, three tier cards, real
   objects that float and turn, and a 2D cartoon of him (toon shots, drawn by folio's people rig — mentor.py).
   OVERLAY types (cards, timer, meter, prompt, path, object with over) render with a transparent background
   (sc.alpha) and are laid over the finished film after the presenter splice (kits.after_splice), so they sit
   over him the way the reference's do. The rest are ordinary full-frame scenes.
   Fonts: Mn Sans (Poppins), Mn Black (Montserrat Black), Mn Num (Inter Display Black). */
const BLUE = P.blue || '#3D6BFF', NEON = P.neon || '#FF2A55', GREEN = P.green || '#33F28A', INK = P.ink || '#F5F7FF',
      NAVY = P.navy || '#060B1C';
const ss = x => x * x * (3 - 2 * x);
const OVER = ['cards', 'timer', 'meter', 'prompt', 'path'];
const ICONS = {
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  sleep: '<circle cx="11" cy="13" r="8"/><path d="M7.5 13h2M12.5 13h2M9 16.6h4"/><path d="M16 2.5h4.5l-4.5 4.5h4.5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/><path d="M3.5 12h4l2-3 3 6 2-3h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 2 2 0 0 0 3-1.7V5.7A2 2 0 0 0 9 4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3 2 2 0 0 1-3-1.7"/>',
};
const iconG = (name, color, sw) => `<g fill="none" stroke="${color || '#fff'}" stroke-width="${sw || 1.4}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.spark}</g>`;
const icon = (name, size, stroke, color) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color || '#fff'}" stroke-width="${stroke || 1.9}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.spark}</svg>`;
const CSS = `
html,body{background:transparent !important}
.sa{font-family:'Mn Sans',Helvetica,Arial,sans-serif}
.bk{font-family:'Mn Black','Mn Sans',Helvetica,sans-serif;font-weight:900}
.nm{font-family:'Mn Num','Mn Black',Helvetica,sans-serif;font-weight:900}
.gcard{position:absolute;width:236px;height:286px;border-radius:38px;
  background:linear-gradient(158deg,rgba(116,160,255,.97) 0%,rgba(52,96,240,.95) 42%,rgba(24,52,182,.96) 100%);
  border:2px solid rgba(190,214,255,.75);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.65),inset 0 -14px 34px rgba(4,10,70,.45),inset 0 0 0 1px rgba(255,255,255,.12),
             0 28px 60px rgba(2,8,48,.55),0 0 36px rgba(70,120,255,.45);
  overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.gcard:before{content:'';position:absolute;left:-30%;top:-40%;width:120%;height:85%;border-radius:50%;
  background:radial-gradient(ellipse at 40% 60%,rgba(255,255,255,.42),rgba(255,255,255,0) 62%);transform:rotate(-12deg)}
.gcard .lab{position:relative;color:#fff;font-size:31px;letter-spacing:.06em;text-transform:uppercase;text-align:center;
  line-height:1.02;padding:0 14px;text-shadow:0 0 14px rgba(160,200,255,.9)}
.gcard svg{position:relative;filter:drop-shadow(0 0 10px rgba(190,220,255,.95))}
.glassd{position:absolute;border-radius:28px;background:linear-gradient(180deg,rgba(34,40,58,.86),rgba(16,19,30,.86));
  border:1.5px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 26px 60px rgba(0,0,0,.5)}
.chip{position:absolute;display:flex;align-items:center;gap:16px;padding:20px 30px;border-radius:999px;color:${INK};font-size:36px;
  white-space:nowrap;background:linear-gradient(180deg,rgba(40,48,70,.9),rgba(18,22,34,.9));border:1.5px solid rgba(255,255,255,.2);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 20px 46px rgba(0,0,0,.5)}
.chip.on{border-color:rgba(120,170,255,.9);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 0 0 6px rgba(80,130,255,.18),0 20px 46px rgba(0,0,0,.5)}
.tier{position:absolute;width:520px;height:700px;border-radius:44px;overflow:hidden;
  background:linear-gradient(170deg,rgba(255,255,255,.16),rgba(255,255,255,.04));border:2px solid rgba(255,255,255,.22);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.35),0 40px 90px rgba(0,0,0,.6)}
.tier .fill{position:absolute;left:0;right:0;bottom:0}
.tier .nm2{position:absolute;left:0;right:0;top:300px;text-align:center;color:#fff;font-size:58px}
.tier .dif{position:absolute;left:44px;right:44px;top:398px;display:flex;justify-content:space-between;color:rgba(255,255,255,.75);font-size:28px}
.tier .row{position:absolute;left:44px;right:44px;height:54px;border-radius:14px;background:rgba(255,255,255,.12);color:#fff;
  font-size:26px;line-height:54px;padding:0 20px;white-space:nowrap;overflow:hidden}
`;

// ── neon seven-segment digits ─────────────────────────────────────────────────────────────────────────────────
const SEG = {0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg'};
function digitSvg(ch, x, h, color) {           // one digit, h tall, at x; segments as bevelled bars, the off ones faint
  const w = h * .52, t = h * .105, g = t * .18, s = .08;
  const hor = (y) => `M${t * .5 + g},${y} L${t + g},${y - t / 2} L${w - t - g},${y - t / 2} L${w - t * .5 - g},${y} L${w - t - g},${y + t / 2} L${t + g},${y + t / 2}Z`;
  const ver = (xx, y0, y1) => `M${xx},${y0 + g} L${xx + t / 2},${y0 + t * .5 + g} L${xx + t / 2},${y1 - t * .5 - g} L${xx},${y1 - g} L${xx - t / 2},${y1 - t * .5 - g} L${xx - t / 2},${y0 + t * .5 + g}Z`;
  const P_ = {a: hor(t / 2), g: hor(h / 2), d: hor(h - t / 2), f: ver(t / 2, t / 2, h / 2), b: ver(w - t / 2, t / 2, h / 2),
              e: ver(t / 2, h / 2, h - t / 2), c: ver(w - t / 2, h / 2, h - t / 2)};
  const on = SEG[ch] || '';
  let out = `<g transform="translate(${x},0) skewX(${-s * 60})">`;
  for (const k of 'abcdefg') out += `<path d="${P_[k]}" fill="${color}" opacity="${on.includes(k) ? 1 : .07}"/>`;
  return out + '</g>';
}
function clockSvg(text, h, color) {            // "02:00" as neon digits; returns [svg inner, width]
  let x = 0, out = '';
  for (const ch of String(text)) {
    if (ch === ':') { out += `<circle cx="${x + h * .09}" cy="${h * .32}" r="${h * .045}" fill="${color}"/><circle cx="${x + h * .06}" cy="${h * .7}" r="${h * .045}" fill="${color}"/>`; x += h * .2; continue; }
    out += digitSvg(ch, x, h, color); x += h * .6;
  }
  return [out, x];
}
const mmss = s => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const secs = v => { const m = String(v || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : (parseFloat(v) || 0); };

function bokeh(n, seed) {                       // soft out-of-focus lights for the full-screen grounds
  let h = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * 1920, y = rnd() * 1080, r = 30 + rnd() * 110, a = .05 + rnd() * .14;
    const c = rnd() > .5 ? '120,160,255' : '255,180,110';
    h += `<div class="abs" style="left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:radial-gradient(circle,rgba(${c},${a}) 0%,rgba(${c},0) 70%)"></div>`;
  }
  return h;
}
function horizon() {                            // the reference's dark ground with a planet's blue edge glowing in the corner
  return `<div class="abs" style="inset:0;background:radial-gradient(ellipse at 50% 40%,#0C1430 0%,${NAVY} 60%,#02040C 100%)"></div>
    <div class="abs" style="left:900px;top:760px;width:2200px;height:2200px;border-radius:50%;
      background:radial-gradient(circle at 30% 30%,#0A1230 0%,#04070F 60%);box-shadow:0 0 120px 30px rgba(70,130,255,.55),inset 30px 30px 80px rgba(110,170,255,.35)"></div>`;
}

function glassBadge(px, icon) {             // a thick glass rounded square with liquid inside — viewBox 0..1000
  const R = 'x="80" y="80" width="840" height="840" rx="280"', Ri = 'x="104" y="104" width="792" height="792" rx="258"';
  let bub = '';
  for (let i = 0; i < 12; i++) bub += `<circle class="${px}b" r="${(5 + rnd() * 11).toFixed(1)}" cx="${(200 + rnd() * 600).toFixed(0)}" cy="900" fill="rgba(255,255,255,.55)" data-s="${(.35 + rnd() * .5).toFixed(2)}" data-o="${rnd().toFixed(3)}"/>`;
  return `<svg width="100%" height="100%" viewBox="0 0 1000 1000" style="overflow:visible">
    <defs>
      <clipPath id="${px}clip"><rect ${Ri}/></clipPath>
      <radialGradient id="${px}body" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="rgba(220,232,255,.05)"/><stop offset=".7" stop-color="rgba(170,195,255,.10)"/><stop offset="1" stop-color="rgba(200,220,255,.26)"/></radialGradient>
      <linearGradient id="${px}shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.35)"/><stop offset=".12" stop-color="rgba(255,255,255,0)"/><stop offset=".85" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,.28)"/></linearGradient>
      <filter id="${px}blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="${px}blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
      <filter id="${px}glowi" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse id="${px}glow" cx="500" cy="760" rx="430" ry="230" fill="rgba(60,235,130,.5)" filter="url(#${px}blur2)"/>
    <rect ${R} fill="url(#${px}body)"/>
    <g clip-path="url(#${px}clip)">
      <path id="${px}liq" d=""/>
      <path id="${px}men" d="" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="7" filter="url(#${px}blur)" opacity=".8"/>
      ${bub}
      <rect ${Ri} fill="url(#${px}shade)"/>
    </g>
    <g transform="translate(260,250) scale(20)" filter="url(#${px}glowi)" opacity=".96">${iconG(icon || 'chat', '#FFFFFF', 1.05)}</g>
    <rect ${Ri} fill="none" stroke="rgba(255,255,255,.28)" stroke-width="26" filter="url(#${px}blur)"/>
    <rect ${R} fill="none" stroke="rgba(255,255,255,.92)" stroke-width="9"/>
    <path d="M230 150 Q500 92 790 160" stroke="rgba(255,255,255,.95)" stroke-width="30" fill="none" stroke-linecap="round" filter="url(#${px}blur)"/>
    <path d="M150 360 Q132 520 170 690" stroke="rgba(255,255,255,.55)" stroke-width="18" fill="none" stroke-linecap="round" filter="url(#${px}blur)"/>
    <path d="M300 880 Q500 915 720 878" stroke="rgba(255,255,255,.6)" stroke-width="10" fill="none" stroke-linecap="round" filter="url(#${px}blur)"/>
    <circle cx="745" cy="205" r="14" fill="#fff" opacity=".9"/>
  </svg>`;
}
function glassFrame(px, t, level) {            // the liquid at `level` (0-1): surface wave, meniscus, colour, glow, bubbles
  const liq = document.getElementById(px + 'liq'), men = document.getElementById(px + 'men');
  const top = 104 + 792 * (1 - level);
  let d = `M104,${896} L104,${top}`, m = '';
  for (let x = 0; x <= 792; x += 24) {
    const y = top + Math.sin(x / 95 + t * 2.3) * 12 + Math.sin(x / 41 - t * 1.6) * 5;
    d += ` L${104 + x},${y.toFixed(1)}`;
    m += (x ? ' L' : 'M') + `${104 + x},${(y + 4).toFixed(1)}`;
  }
  liq.setAttribute('d', d + ' L896,896 Z');
  men.setAttribute('d', m);
  const c = liqColor(level);
  liq.setAttribute('fill', c);
  const g = document.getElementById(px + 'glow');
  g.setAttribute('fill', c.replace(/,\s*[\d.]+\)$/, ',.55)'));
  g.setAttribute('opacity', (.25 + .75 * level).toFixed(3));
  document.querySelectorAll('.' + px + 'b').forEach(b => {
    const sp = Number(b.dataset.s), o = Number(b.dataset.o);
    const y = 880 - ((t * sp + o) % 1) * 760;
    b.setAttribute('cy', y.toFixed(1));
    b.setAttribute('opacity', y > top + 18 ? '.6' : '0');
  });
}

function build() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const t = S.type, over = OVER.includes(t) || (t === 'object' && S.over);
  parts = {type: t, over};
  if (over) {                                   // an overlay: nothing but the graphic in the frame
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    vig.style.background = 'none';
  } else {
    document.body.style.background = NAVY;
    vig.style.background = 'radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 46%,rgba(0,0,0,.55) 100%)';
    grain(0.05);
  }

  if (t === 'cards') {
    // the words of the sentence on glossy blue glass, a conveyor across the lower half of his shot
    const words = (S.words_on_cards || S.items || []).slice(0, 7), icons = S.icons || [];
    const y = Number(S.y || 600);
    scene.innerHTML = words.map((w, i) => `<div class="gcard c${i}" style="top:${y}px;left:0">${icon(icons[i] || 'spark', 104, 1.7)}
      <div class="lab bk">${esc(w)}</div></div>`).join('');
    parts.cards = words.map((_, i) => document.querySelector('.c' + i));
    parts.cards.forEach(el => { const lab = el.querySelector('.lab'); fit(lab, 210, 31, 18); });
    parts.speed = Number(S.speed || 300); parts.gap = 270; parts.y = y;
  }

  if (t === 'timer') {
    const h = Number(S.size || 330), color = S.color === 'blue' ? '#41D9FF' : (S.color === 'green' ? GREEN : NEON);
    const [, w] = clockSvg(S.from || '02:00', h, color);
    scene.innerHTML = `<svg id="clk" class="abs" width="${w + 40}" height="${h + 40}" viewBox="-20 -20 ${w + 40} ${h + 40}"
      style="left:${(1920 - w) / 2}px;top:${Number(S.y || 640) - 20}px;overflow:visible;
      filter:drop-shadow(0 0 10px ${color}) drop-shadow(0 0 34px ${color})"></svg>`;
    Object.assign(parts, {clk: document.getElementById('clk'), h, color, from: secs(S.from || '02:00'),
                          to: S.to != null ? secs(S.to) : null});
  }

  if (t === 'meter') {
    // a thick glass badge beside his head: the liquid inside drains (or fills), the number counts with it
    const side = S.side === 'left' ? 'left' : 'right';
    const x = side === 'right' ? 1350 : 230, y = Number(S.y || 150);
    scene.innerHTML = `
      <div id="badge" class="abs" style="left:${x}px;top:${y}px;width:340px;height:340px;perspective:900px">
        <div id="tilt" style="position:absolute;inset:0">${glassBadge('m', S.icon || 'chat')}</div>
        <div id="pct" class="nm" style="position:absolute;left:${side === 'right' ? 175 : -70}px;top:-86px;font-size:100px;color:#fff;font-style:italic;
          text-shadow:0 0 22px rgba(255,255,255,.55)"></div>
      </div>`;
    Object.assign(parts, {badge: document.getElementById('badge'), tilt: document.getElementById('tilt'),
                          pct: document.getElementById('pct'), from: Number(S.from != null ? S.from : 87), to: Number(S.to != null ? S.to : 2)});
  }

  if (t === 'prompt') {
    // the example he reads out, typed into a chat bar along the bottom of his shot
    scene.innerHTML = `
      <div id="bar" class="glassd" style="left:300px;top:${Number(S.y || 760)}px;width:1320px;min-height:132px;padding:34px 120px 34px 96px">
        <div class="abs" style="left:34px;top:40px;width:40px;height:40px;opacity:.7">${icon('spark', 40, 2)}</div>
        <div id="ph" class="sa" style="position:absolute;left:96px;top:42px;font-size:38px;color:rgba(255,255,255,.4)">${esc(S.placeholder || 'Ask anything')}</div>
        <div id="txt" class="sa" style="position:relative;font-size:38px;line-height:52px;color:#fff;font-weight:500;min-height:52px"></div>
        <div id="send" class="abs" style="right:28px;bottom:28px;width:72px;height:72px;border-radius:50%;background:#fff;
          display:flex;align-items:center;justify-content:center">${icon('bolt', 34, 2.4, '#0B0F1A')}</div>
      </div>`;
    Object.assign(parts, {bar: document.getElementById('bar'), ph: document.getElementById('ph'), txt: document.getElementById('txt'),
                          send: document.getElementById('send'), text: String(S.text || '')});
    // the bar is as tall as the whole prompt from the start, so it never jumps while the words come in
    parts.txt.textContent = parts.text;
    const full = parts.bar.offsetHeight;
    parts.bar.style.height = full + 'px';
    parts.bar.style.top = (Number(S.y || 760) + 132 - full) + 'px';
    parts.txt.textContent = '';
  }

  if (t === 'path') {
    // Settings › Personalization › Custom instructions: chips that light up in turn under a pointer that clicks them
    const steps = (S.steps || []).slice(0, 4), icons = S.icons || ['gear', 'user', 'pen', 'check'];
    scene.innerHTML = steps.map((s, i) => `<div class="chip sa p${i}" style="opacity:0">${icon(icons[i] || 'spark', 40, 2)}<span>${esc(s)}</span></div>`).join('') +
      `<svg id="chev" class="abs" width="1920" height="1080" style="left:0;top:0;overflow:visible"></svg>
       <svg id="ptr" class="abs" width="70" height="70" viewBox="0 0 24 24" style="left:0;top:0;opacity:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))">
         <path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>
       <div id="ring" class="abs" style="width:80px;height:80px;border-radius:50%;border:4px solid rgba(255,255,255,.9);opacity:0"></div>`;
    const chips = steps.map((_, i) => document.querySelector('.p' + i));
    const y = Number(S.y || 830), gap = 70;
    const total = chips.reduce((a, el) => a + el.offsetWidth, 0) + gap * (chips.length - 1);
    let x = Math.max(60, (1920 - total) / 2), chev = '';
    chips.forEach((el, i) => {
      el.style.left = x + 'px'; el.style.top = y + 'px';
      if (i) chev += `<path d="M${x - gap * .62},${y + 30} l14,14 l-14,14" stroke="rgba(255,255,255,.8)" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" class="cv${i}" opacity="0"/>`;
      x += el.offsetWidth + gap;
    });
    document.getElementById('chev').innerHTML = chev;
    Object.assign(parts, {chips, ptr: document.getElementById('ptr'), ring: document.getElementById('ring'),
                          chev: chips.map((_, i) => document.querySelector('.cv' + i)), y});
  }

  if (t === 'object') {
    // a real thing (its photo, cut out) turning slowly in the light, with a soft shadow under it
    const src = S.photo || S.image || '';
    const cx = S.over ? (S.side === 'left' ? 420 : 1480) : 960, size = S.over ? 520 : 760;
    scene.innerHTML = (S.over ? '' : horizon() + bokeh(14, S.seed)) + `
      <div id="shadow" class="abs" style="left:${cx - size * .38}px;top:${(S.over ? 560 : 560) + size * .44}px;width:${size * .76}px;height:${size * .12}px;
        border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.55),rgba(0,0,0,0) 70%)"></div>
      <div id="obj" class="abs" style="left:${cx - size / 2}px;top:${(S.over ? 560 : 560) - size / 2}px;width:${size}px;height:${size}px;perspective:1400px">
        <div id="spin" style="position:absolute;inset:0;transform-style:preserve-3d">
          ${src ? `<img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 30px 40px rgba(0,0,0,.45))">` : ''}
          ${src ? `<div id="spec" style="position:absolute;inset:0;-webkit-mask:url(${src}) center/contain no-repeat;mask:url(${src}) center/contain no-repeat;
            background:linear-gradient(105deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 65%);background-size:300% 100%;mix-blend-mode:screen"></div>` : ''}
        </div></div>
      ${S.label ? `<div id="olab" class="chip sa" style="left:${cx - 200}px;top:${(S.over ? 560 : 560) + size * .56}px;opacity:0">${esc(S.label)}</div>` : ''}`;
    Object.assign(parts, {obj: document.getElementById('obj'), spin: document.getElementById('spin'), spec: document.getElementById('spec'),
                          shadow: document.getElementById('shadow'), olab: document.getElementById('olab')});
    if (parts.olab) parts.olab.style.left = (cx - parts.olab.offsetWidth / 2) + 'px';
  }

  if (t === 'glass') {
    // full screen: one big glass object on the dark horizon, turning a little in the light, filling or draining,
    // its percentage above it and its reflection under it
    scene.innerHTML = horizon() + bokeh(12, S.seed) + `
      <div id="world" class="abs" style="inset:0">
        <div id="gl" class="abs" style="left:600px;top:150px;width:720px;height:720px;perspective:1600px;
             -webkit-box-reflect:below 6px linear-gradient(transparent 62%,rgba(255,255,255,.22))">
          <div id="gtilt" style="position:absolute;inset:0">${glassBadge('g', S.icon || 'chat')}</div>
        </div>
        <div id="gpct" class="nm" style="position:absolute;left:1230px;top:90px;font-size:160px;color:#fff;font-style:italic;text-shadow:0 0 34px rgba(255,255,255,.5)"></div>
        ${S.label ? `<div id="glab" class="bk" style="position:absolute;left:0;right:0;top:948px;text-align:center;font-size:70px;color:#fff;letter-spacing:.04em;opacity:0;text-shadow:0 0 30px rgba(120,160,255,.6)">${esc(S.label)}</div>` : ''}
      </div>`;
    Object.assign(parts, {world: document.getElementById('world'), gl: document.getElementById('gl'), gtilt: document.getElementById('gtilt'),
                          gpct: document.getElementById('gpct'), glab: document.getElementById('glab'),
                          from: Number(S.from != null ? S.from : 0), to: Number(S.to != null ? S.to : 98)});
  }

  if (t === 'tiers') {
    // full screen: the three levels of the video as glass cards on the dark horizon, the camera gliding past them
    const items = (S.items || []).slice(0, 3);
    const tint = ['#2F7BFF', '#28D27A', '#FF2A55'];
    scene.innerHTML = horizon() + bokeh(12, S.seed) + `<div id="world" class="abs" style="inset:0">` +
      items.map((it, i) => `<div class="tier td${i}" style="left:${170 + i * 560}px;top:190px;opacity:0">
        <svg class="fill" width="520" height="700" viewBox="0 0 520 700" style="top:0;height:700px">
          <defs><linearGradient id="tf${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint[i]}" stop-opacity=".75"/><stop offset="1" stop-color="${tint[i]}" stop-opacity=".98"/></linearGradient></defs>
          <path class="tw${i}" d="" fill="url(#tf${i})"/><path class="tm${i}" d="" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="4"/></svg>
        <div class="abs" style="left:150px;top:60px;width:220px;height:220px;opacity:.95">${icon(it.icon || ['spark', 'bolt', 'brain'][i], 220, 1.1)}</div>
        <div class="nm2 bk">${esc(it.name || '')}</div>
        <div class="dif sa"><span>${esc(S.difficulty || 'Difficulty')}</span><span>${[0, 1, 2].map(k => `<i style="display:inline-block;width:18px;height:18px;margin-left:8px;border-radius:50%;${k <= i ? 'background:#fff' : 'border:2px solid rgba(255,255,255,.6)'}"></i>`).join('')}</span></div>
        ${(it.rows || []).slice(0, 3).map((r, k) => `<div class="row sa" style="top:${470 + k * 70}px">${esc(r)}</div>`).join('')}
      </div>`).join('') + `</div>`;
    Object.assign(parts, {world: document.getElementById('world'), tiers: items.map((_, i) => document.querySelector('.td' + i)),
                          waves: items.map((_, i) => [document.querySelector('.tw' + i), document.querySelector('.tm' + i)])});
    parts.tiers.forEach(el => { el.style.webkitBoxReflect = 'below 10px linear-gradient(transparent 70%,rgba(255,255,255,.18))'; });
  }
}

function liquid(level, t, w, x0, y0, h, amp) {  // a liquid surface at `level` (0-1) of a box, its top a slow travelling wave
  const top = y0 + h * (1 - level);
  let d = `M${x0},${y0 + h} L${x0},${top}`;
  for (let x = 0; x <= w; x += 20) d += ` L${x0 + x},${(top + Math.sin(x / 70 + t * 2.4) * amp + Math.sin(x / 31 - t * 1.7) * amp * .4).toFixed(1)}`;
  return d + ` L${x0 + w},${y0 + h} Z`;
}
function liqColor(p) {                           // full = green, half = amber, empty = red: the reference's traffic light
  const c = p > .5 ? [[255, 190, 60], [60, 235, 130], (p - .5) / .5] : [[255, 40, 80], [255, 190, 60], p / .5];
  const m = c[0].map((v, i) => Math.round(v + (c[1][i] - v) * c[2]));
  return `rgba(${m[0]},${m[1]},${m[2]},.88)`;
}

function frame(t) {
  const ty = parts.type;
  const inP = eo3(seg(t, 0, .45)), outP = 1 - eo3(seg(t, D - .4, D));

  if (ty === 'cards') {
    const n = parts.cards.length, span = (n - 1) * parts.gap;
    parts.cards.forEach((el, i) => {
      // the row enters from the right, crosses at a steady speed, and leaves on the left
      const x = 1300 + i * parts.gap - t * parts.speed;
      const rel = (x + 118 - 960) / 960;                 // -1 left edge … +1 right edge
      const s = 1 - Math.min(.22, Math.abs(rel) * .16);
      const op = clamp((1 - Math.abs(rel)) * 2.2) * outP * inP;
      el.style.opacity = op;
      el.style.transform = `translateX(${x.toFixed(1)}px) perspective(1300px) rotateY(${(rel * -28).toFixed(2)}deg) scale(${s.toFixed(3)}) translateY(${(Math.abs(rel) * 40).toFixed(1)}px)`;
    });
  }

  if (ty === 'timer') {
    const tick = parts.to != null ? Math.max(parts.to, parts.from - Math.floor(t)) : parts.from - Math.floor(t);
    const [svg] = clockSvg(mmss(tick), parts.h, parts.color);
    parts.clk.innerHTML = svg;
    // it flickers on like a tube, then holds
    const fl = t < .5 ? ((Math.sin(t * 90) > -.2 ? 1 : .25) * eo3(seg(t, 0, .5))) : 1;
    parts.clk.style.opacity = fl * outP;
  }

  if (ty === 'meter') {
    const p = eo3(seg(t, .5, D - .7));
    const v = parts.from + (parts.to - parts.from) * p;
    glassFrame('m', t, clamp(v / 100));
    parts.pct.textContent = Math.round(v) + '%';
    parts.badge.style.opacity = inP * outP;
    parts.badge.style.transform = `translateY(${((1 - inP) * 30).toFixed(1)}px) scale(${(.9 + .1 * inP).toFixed(3)})`;
    parts.tilt.style.transform = `rotateY(${(-14 + Math.sin(t * .9) * 6).toFixed(2)}deg) rotateX(${(5 + Math.sin(t * .7) * 3).toFixed(2)}deg)`;
  }

  if (ty === 'prompt') {
    parts.bar.style.opacity = inP * outP;
    parts.bar.style.transform = `translateY(${((1 - inP) * 40).toFixed(1)}px)`;
    const per = Math.min(.055, (D - 1.6) / Math.max(1, parts.text.length));
    const n = Math.floor(Math.max(0, t - .45) / per);
    parts.txt.innerHTML = esc(parts.text.slice(0, n)) + (n < parts.text.length || Math.floor(t * 2) % 2 ? '<span style="color:#7FA8FF">▍</span>' : '');
    parts.ph.style.opacity = n > 0 ? 0 : 1;
    const done = .45 + parts.text.length * per;
    const pulse = seg(t, done + .2, done + .5);
    parts.send.style.transform = `scale(${(1 + Math.sin(pulse * Math.PI) * .18).toFixed(3)})`;
  }

  if (ty === 'path') {
    const k = parts.chips.length, each = Math.min(1.1, (D - 1.2) / Math.max(1, k));
    parts.chips.forEach((el, i) => {
      const a = .3 + i * each;
      fadeIn(el, t, a, .35, 16);
      el.classList.toggle('on', t >= a + each * .55 && t < a + each + .3 || (i === k - 1 && t >= a + each * .55));
      if (parts.chev[i]) parts.chev[i].setAttribute('opacity', String(eo3(seg(t, a - .1, a + .2))));
    });
    // the pointer glides (smoothstep) to each chip in turn and clicks it
    const i = clamp(Math.floor((t - .3) / each), 0, k - 1), local = (t - .3 - i * each) / each;
    const el = parts.chips[i], prev = parts.chips[Math.max(0, i - 1)];
    const tx = el.offsetLeft + el.offsetWidth * .55, ty_ = parts.y + 70;
    const fx = i ? prev.offsetLeft + prev.offsetWidth * .55 : tx - 160, fy = i ? ty_ : ty_ + 120;
    const m = ss(clamp(local / .5));
    parts.ptr.style.opacity = clamp(seg(t, .3, .6)) * outP;
    parts.ptr.style.transform = `translate(${(fx + (tx - fx) * m).toFixed(1)}px,${(fy + (ty_ - fy) * m).toFixed(1)}px)`;
    const click = seg(local, .55, .85);
    parts.ring.style.opacity = click > 0 && click < 1 ? (1 - click) * .9 : 0;
    parts.ring.style.transform = `translate(${(tx - 40).toFixed(1)}px,${(ty_ - 40).toFixed(1)}px) scale(${(.3 + click * .9).toFixed(3)})`;
  }

  if (ty === 'object') {
    const c = ss(clamp(t / D));
    parts.obj.style.opacity = inP * outP;
    parts.obj.style.transform = `translateY(${(Math.sin(t * 1.6) * 10 + (1 - inP) * 60).toFixed(1)}px) scale(${(.9 + .1 * inP + .04 * c).toFixed(3)})`;
    parts.spin.style.transform = `rotateY(${(26 - 40 * c).toFixed(2)}deg) rotateX(${(6 - 4 * c).toFixed(2)}deg) rotateZ(${(Math.sin(t * .9) * 2).toFixed(2)}deg)`;
    if (parts.spec) parts.spec.style.backgroundPosition = `${(140 - 180 * c).toFixed(1)}% 0`;
    parts.shadow.style.opacity = (.7 + Math.sin(t * 1.6) * .15) * inP * outP;
    if (parts.olab) fadeIn(parts.olab, t, .7, .4, 14);
    if (!parts.over) { ground.style.transform = `scale(${(1.02 + .04 * c).toFixed(4)})`; }
  }

  if (ty === 'glass') {
    const c = ss(clamp(t / D));
    parts.world.style.transform = `scale(${(1.0 + .07 * c).toFixed(4)}) translateY(${(-12 * c).toFixed(1)}px)`;
    const p = eo3(seg(t, .5, D - .8)), v = parts.from + (parts.to - parts.from) * p;
    glassFrame('g', t, clamp(v / 100));
    parts.gpct.textContent = Math.round(v) + '%';
    parts.gl.style.opacity = inP;
    parts.gtilt.style.transform = `rotateY(${(18 - 30 * c).toFixed(2)}deg) rotateX(${(8 - 5 * c).toFixed(2)}deg) scale(${(.92 + .08 * inP).toFixed(3)})`;
    if (parts.glab) fadeIn(parts.glab, t, .8, .5, 18);
  }

  if (ty === 'tiers') {
    // the camera glides along the three cards (smoothstep: no rush in the middle), each card rising in turn
    const c = ss(clamp(t / D));
    parts.world.style.transform = `translateX(${(120 - 240 * c).toFixed(1)}px) scale(${(1.05 - .05 * c).toFixed(4)})`;
    parts.tiers.forEach((el, i) => {
      const p = eo3(seg(t, .25 + i * .35, .8 + i * .35));
      el.style.opacity = p;
      const rel = (170 + i * 560 + 260 + (120 - 240 * c) - 960) / 960;      // where the card sits on screen, -1…1
      el.style.transform = `translateY(${((1 - p) * 60).toFixed(1)}px) perspective(1600px) rotateY(${(-rel * 16).toFixed(2)}deg)`;
      // the liquid rises to the tier's level and keeps moving
      const lvl = (.32 + i * .2) * eo3(seg(t, .45 + i * .35, 1.6 + i * .35));
      const top = 700 * (1 - lvl);
      let d = `M0,700 L0,${top}`, m = '';
      for (let x = 0; x <= 520; x += 20) {
        const y = top + Math.sin(x / 60 + t * 2.2 + i) * 7 + Math.sin(x / 27 - t * 1.5) * 3;
        d += ` L${x},${y.toFixed(1)}`; m += (x ? ' L' : 'M') + `${x},${y.toFixed(1)}`;
      }
      parts.waves[i][0].setAttribute('d', d + ' L520,700 Z');
      parts.waves[i][1].setAttribute('d', m);
    });
  }
}

function fadeIn(el, t, t0, dur, dy) {
  if (!el) return;
  const p = eo3(seg(t, t0, t0 + dur));
  el.style.opacity = p;
  const base = el.dataset.base || '';
  el.style.transform = `translateY(${((1 - p) * (dy || 12)).toFixed(1)}px)`;
}
