/* premium.js — the PREMIUM kit: a near-black table, one red accent, a Didone number the
   size of the screen, and small pieces of interface (pills, a slider, ticks) that move like
   a product film. Built from a reference ad: the presenter talks, and every claim he makes
   is restated as one clean object on screen.
   Fonts: Pm Serif (Playfair Display), Pm Sans (Inter), Pm Sans Black (Inter Black). */
const V = W < H;                          // Shorts: laid out natively 1080x1920 (the 16:9 layouts are the else-branches)
const INK = P.ink || '#F3F4F6', DIM = P.dim || '#8A8F98', RED = P.red || '#E0271C',
      LINE = P.line || '#262A31', NAVY = P.navy || '#0E1A33';
const CSS = `
.ser{font-family:'Pm Serif',Georgia,serif}
.san{font-family:'Pm Sans',Helvetica,Arial,sans-serif;font-weight:600}
.blk{font-family:'Pm Sans Black','Pm Sans',Helvetica,sans-serif;font-weight:900}
.kick{font-size:30px;letter-spacing:.34em;text-transform:uppercase;color:${DIM}}
.rule{height:3px;background:${RED};width:0}
.pill{display:inline-block;border:2px solid rgba(255,255,255,.16);border-radius:999px;padding:20px 46px;font-size:40px;color:${INK};margin-right:22px;opacity:0;white-space:nowrap;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02));box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
.pill.on{border-color:${RED};color:#fff;box-shadow:0 0 28px rgba(224,39,28,.35),inset 0 1px 0 rgba(255,255,255,.2)}
.dotrack{position:relative;height:6px;background:rgba(255,255,255,.12);border-radius:3px}
.knob{position:absolute;top:50%;width:44px;height:44px;margin-top:-22px;border-radius:50%;background:#EDEFF2;box-shadow:0 0 0 10px rgba(237,239,242,.08),0 0 30px rgba(255,255,255,.35)}
.tick{font-size:38px;color:${DIM};opacity:0}
.tick b{color:${INK};font-weight:600}
.cardimg{position:absolute;border-radius:26px;overflow:hidden;box-shadow:0 50px 120px rgba(0,0,0,.6);background:#15171B}
.cardimg img{width:100%;height:100%;object-fit:cover;display:block}
.node{position:absolute;text-align:center;width:600px}
.node .d{width:34px;height:34px;border-radius:50%;background:#EDEFF2;margin:0 auto 26px;box-shadow:0 0 0 10px rgba(237,239,242,.07)}
.node .n{font-size:68px;color:${INK};font-weight:700}
.node .s{font-size:34px;color:${DIM};margin-top:16px;line-height:1.35}
.coin{position:absolute;border-radius:50%;border:2px solid rgba(237,239,242,.30);background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.03))}
.row{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(255,255,255,.12);padding:30px 0;opacity:0}
.row .k{font-size:46px;color:${INK}}
.row .v{font-size:52px;color:${INK};font-family:'Pm Serif',Georgia,serif}
.row.tot .k,.row.tot .v{color:#fff}
`;
function camera(t){                       // one slow, even push on everything, the ground a little behind it
  const c = (x => x * x * (3 - 2 * x))(clamp(t / D));
  scene.style.transform = `scale(${(1 + .03 * c).toFixed(4)})`;
  ground.style.transform = `scale(${(1.04 + .05 * c).toFixed(4)})`;
}
function build(){
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.body.style.background = '#0B0C0E';
  // the presenter's own room (the still of those seconds) far behind, out of focus and nearly black: the graphics
  // sit in his world instead of on a void; a soft light from above keeps the centre lifted
  if (S.ground) ground.style.opacity = '.9';
  scene.insertAdjacentHTML('beforebegin', '<div class="abs" style="inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(255,255,255,.07),rgba(0,0,0,0) 55%),linear-gradient(180deg,rgba(11,12,14,.18),rgba(11,12,14,.55))"></div>');
  vig.style.background = 'radial-gradient(ellipse at 50% 42%,rgba(255,255,255,.05) 0%,rgba(0,0,0,0) 46%,rgba(0,0,0,.55) 100%)';
  grain(0.05);
  const t = S.type;

  if (t === 'stat') {
    scene.innerHTML = `<div class="abs" style="left:0;top:0;width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div id="kick" class="san kick" style="opacity:0">${esc(S.kicker || '')}</div>
      <div id="big" class="ser" style="font-size:380px;line-height:1;color:${INK};margin:28px 0 0;letter-spacing:-.02em;text-shadow:0 30px 80px rgba(0,0,0,.6)"></div>
      <div id="rule" class="rule" style="margin:34px 0 0"></div>
      <div id="sub" class="ser" style="font-size:${V ? 58 : 66}px;color:${INK};margin-top:30px;opacity:0;text-align:center;padding:0 60px">${esc(S.sub || '')}</div>
      <div id="note" class="san" style="font-size:32px;color:${DIM};margin-top:22px;opacity:0;letter-spacing:.04em">${esc(S.note || '')}</div></div>`;
    const raw = String(S.value == null ? '' : S.value);
    const num = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
    parts = {kick: document.getElementById('kick'), big: document.getElementById('big'),
             rule: document.getElementById('rule'), sub: document.getElementById('sub'),
             note: document.getElementById('note'), raw, num,
             pre: (raw.match(/^[^0-9]*/) || [''])[0], post: (raw.match(/[^0-9]*$/) || [''])[0],
             dec: ((raw.split('.')[1] || '').match(/\d+/) || [''])[0].length};
    parts.big.textContent = raw;
    fit(parts.big, V ? W - 140 : 1640, V ? 330 : 380, V ? 110 : 140);
  }

  if (t === 'panel') {
    const pills = (S.pills || []).slice(0, 3);
    const ticks = (S.ticks || []).slice(0, 3);
    scene.innerHTML = `<div class="abs" style="left:${V ? 70 : 300}px;top:${V ? 430 : 220}px;width:${V ? 940 : 1320}px">
      <div id="kick" class="san kick" style="opacity:0">${esc(S.kicker || '')}</div>
      <div id="head" class="san" style="font-size:${V ? 86 : 100}px;line-height:1.12;color:${INK};margin-top:26px;font-weight:700"></div>
      <div id="pills" style="margin-top:56px">${pills.map(p => `<span class="pill san${p && p.on ? ' on' : ''}">${esc(p && p.label != null ? p.label : p)}</span>`).join('')}</div>
      <div id="track" class="dotrack" style="width:${V ? 940 : 1180}px;margin-top:70px;opacity:0"><div id="knob" class="knob" style="left:0"></div></div>
      <div id="ticks" style="margin-top:64px">${ticks.map(x => `<div class="tick san" style="margin-bottom:22px"><span style="color:${RED};margin-right:18px">✓</span>${esc(x)}</div>`).join('')}</div></div>`;
    const head = document.getElementById('head'); head.textContent = S.head || '';
    parts = {kick: document.getElementById('kick'), lines: lines(head),
             pills: [...document.querySelectorAll('.pill')], track: document.getElementById('track'),
             knob: document.getElementById('knob'), ticks: [...document.querySelectorAll('.tick')],
             to: Math.max(0, Math.min(1, Number(S.level == null ? 0.72 : S.level)))};
  }

  if (t === 'compare') {
    const L = S.left || {}, R = S.right || {};
    scene.innerHTML = `<div id="head" class="san" style="position:absolute;left:0;top:${V ? 330 : 210}px;width:${W}px;text-align:center;font-size:${V ? 84 : 96}px;color:${INK};font-weight:700;opacity:0;padding:0 ${V ? 60 : 0}px;box-sizing:border-box">${esc(S.head || '')}</div>
      <div id="line" class="abs" style="${V ? `left:${W / 2 - 2}px;top:790px;width:4px;height:0;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(224,39,28,.9),rgba(255,255,255,.12))` : 'left:560px;top:556px;height:4px;width:0;background:linear-gradient(90deg,rgba(255,255,255,.12),rgba(224,39,28,.9),rgba(255,255,255,.12))'};border-radius:2px"></div>
      <div class="node" id="nl" style="left:${V ? (W - 600) / 2 : 260}px;top:${V ? 620 : 540}px;opacity:0"><div class="d"></div><div class="n san">${esc(L.name || '')}</div><div class="s san">${esc(L.sub || '')}</div></div>
      <div class="node" id="nr" style="left:${V ? (W - 600) / 2 : 1060}px;top:${V ? 1140 : 540}px;opacity:0"><div class="d"></div><div class="n san">${esc(R.name || '')}</div><div class="s san">${esc(R.sub || '')}</div></div>
      <div id="foot" class="san" style="position:absolute;left:0;top:${V ? 1640 : 900}px;width:${W}px;text-align:center;font-size:36px;color:${DIM};opacity:0;letter-spacing:.05em;padding:0 ${V ? 60 : 0}px;box-sizing:border-box">${esc(S.foot || '')}</div>`;
    parts = {head: document.getElementById('head'), line: document.getElementById('line'),
             nl: document.getElementById('nl'), nr: document.getElementById('nr'), foot: document.getElementById('foot')};
  }

  if (t === 'card') {
    const src = S.photo || S.image || '';
    scene.innerHTML = `<div class="abs" style="left:0;top:0;width:1920px;height:1080px;background:linear-gradient(135deg,${NAVY} 0%,#070B14 72%)"></div>
      <div id="img" class="cardimg" style="left:${V ? 90 : 110}px;top:${V ? 250 : 140}px;width:${V ? 900 : 880}px;height:${V ? 780 : 800}px;opacity:0">${src ? `<img src="${src}">` : ''}</div>
      <div class="abs" style="left:${V ? 90 : 1010}px;top:${V ? 1110 : 300}px;width:${V ? 900 : 760}px">
        <div id="kick" class="san kick" style="opacity:0">${esc(S.kicker || '')}</div>
        <div id="head" class="san" style="font-size:${V ? 78 : 92}px;line-height:1.14;color:#fff;margin-top:24px;font-weight:700"></div>
        <div id="rule" class="rule" style="margin-top:38px"></div>
        <div id="sub" class="san" style="font-size:38px;color:#AEB7C6;margin-top:34px;line-height:1.5;opacity:0">${esc(S.sub || '')}</div></div>`;
    const head = document.getElementById('head'); head.textContent = S.head || '';
    parts = {img: document.getElementById('img'), kick: document.getElementById('kick'),
             lines: lines(head), rule: document.getElementById('rule'), sub: document.getElementById('sub')};
  }

  if (t === 'statement') {
    const words = String(S.line || '').split(/\s+/).filter(Boolean);
    const key = String(S.key || '').toLowerCase();
    scene.innerHTML = `<div id="wrap" class="ser" style="position:absolute;left:${V ? 60 : 260}px;top:0;width:${V ? W - 120 : 1400}px;height:${V ? H : 1080}px;display:flex;${V ? 'flex-wrap:wrap;align-content:center;' : ''}align-items:center;justify-content:center;text-align:center;font-size:${V ? 140 : 150}px;line-height:1.18;color:${INK}">
      ${words.map(w => `<span class="w" style="opacity:0;display:inline-block;margin:0 .16em${key && w.toLowerCase().replace(/[^a-z']/g, '') === key ? `;color:${RED}` : ''}">${esc(w)}</span>`).join('')}</div>`;
    const wrap = document.getElementById('wrap');
    fit(wrap, V ? W - 120 : 1400, V ? 140 : 150, 64);
    parts = {words: [...document.querySelectorAll('.w')]};
  }

  if (t === 'rows') {
    const rows = (S.rows || []).slice(0, 4);
    scene.innerHTML = `<div class="abs" style="left:${V ? 70 : 330}px;top:${V ? 520 : 250}px;width:${V ? 940 : 1260}px">
      <div id="kick" class="san kick" style="opacity:0">${esc(S.kicker || '')}</div>
      <div id="head" class="san" style="font-size:${V ? 76 : 88}px;color:${INK};margin:24px 0 46px;font-weight:700;opacity:0">${esc(S.head || '')}</div>
      ${rows.map(r => `<div class="row san${r && r.total ? ' tot' : ''}"><span class="k">${esc(r && r.k != null ? r.k : r)}</span><span class="v">${esc(r && r.v != null ? r.v : '')}</span></div>`).join('')}
      <div id="foot" class="san" style="font-size:28px;color:${DIM};margin-top:40px;opacity:0;letter-spacing:.05em">${esc(S.foot || '')}</div></div>`;
    parts = {kick: document.getElementById('kick'), head: document.getElementById('head'),
             rows: [...document.querySelectorAll('.row')], foot: document.getElementById('foot')};
  }

  if (t === 'coins') {
    const n = Math.max(2, Math.min(5, Number(S.stacks || 3)));
    let html = '';
    // a stack of discs seen slightly from above: flat ellipses, the top one carrying the mark
    for (let i = 0; i < n; i++) html += `<div class="coin c" style="left:0;top:${250 - i * 52}px;width:340px;height:112px;border-radius:50%;opacity:0">
      ${i === n - 1 ? `<div class="ser" style="position:absolute;left:0;top:0;width:340px;height:112px;line-height:112px;text-align:center;font-size:62px;color:rgba(243,244,246,.42)">$</div>` : ''}</div>`;
    scene.innerHTML = `<div class="abs" id="stack" style="left:${V ? (W - 340) / 2 : 300}px;top:${V ? 560 : 420}px;width:${V ? 340 : 700}px;height:300px">${html}</div>
      <div class="abs" style="left:${V ? 90 : 1040}px;top:${V ? 930 : 400}px;width:${V ? 900 : 620}px;${V ? 'text-align:center' : ''}">
        <div id="head" class="san" style="font-size:${V ? 88 : 100}px;line-height:1.12;color:${INK};font-weight:700"></div>
        <div id="sub" class="san" style="font-size:30px;color:${DIM};margin-top:28px;opacity:0;line-height:1.5">${esc(S.sub || '')}</div></div>`;
    const head = document.getElementById('head'); head.textContent = S.head || '';
    parts = {coins: [...document.querySelectorAll('.coin')], lines: lines(head), sub: document.getElementById('sub')};
  }
}

function frame(t){
  const out = 1;                         // no dip to black before the cut: the edit cuts, a fade reads cheap
  const ty = S.type;
  camera(t);

  if (ty === 'stat') {
    parts.kick.style.opacity = eo3(seg(t, .1, .7)) * out;
    const p = eo3(seg(t, .25, 1.9));
    if (!isNaN(parts.num)) parts.big.textContent = parts.pre + fmt(parts.num * p, parts.dec) + parts.post;
    parts.big.style.opacity = out;
    parts.big.style.transform = `translateY(${(1 - eo5(seg(t, .2, 1.0))) * 26}px)`;
    parts.rule.style.width = (260 * eo5(seg(t, 1.0, 1.8))) + 'px';
    parts.rule.style.opacity = out;
    parts.sub.style.opacity = eo3(seg(t, 1.2, 1.9)) * out;
    parts.note.style.opacity = eo3(seg(t, 1.7, 2.4)) * .9 * out;
  }

  if (ty === 'panel') {
    parts.kick.style.opacity = eo3(seg(t, .05, .6)) * out;
    parts.lines.forEach((l, i) => {
      const p = eo5(seg(t, .25 + i * .14, .95 + i * .14));
      l.style.transform = `translateY(${(1 - p) * 104}%)`; l.style.opacity = out;
    });
    parts.pills.forEach((el, i) => {
      const p = eo5(seg(t, .9 + i * .18, 1.45 + i * .18));
      el.style.opacity = p * out; el.style.transform = `translateY(${(1 - p) * 16}px)`;
    });
    parts.track.style.opacity = eo3(seg(t, 1.3, 1.8)) * out;
    parts.knob.style.left = ((V ? 940 : 1180) * parts.to * eio3(seg(t, 1.45, 2.5)) - 17) + 'px';
    parts.ticks.forEach((el, i) => {
      const p = eo5(seg(t, 2.0 + i * .3, 2.5 + i * .3));
      el.style.opacity = p * out; el.style.transform = `translateX(${(1 - p) * 18}px)`;
    });
  }

  if (ty === 'compare') {
    parts.head.style.opacity = eo3(seg(t, .1, .8)) * out;
    [parts.nl, parts.nr].forEach((el, i) => {
      const p = eo5(seg(t, .6 + i * .35, 1.3 + i * .35));
      el.style.opacity = p * out; el.style.transform = `translateY(${(1 - p) * 22}px)`;
    });
    if (V) parts.line.style.height = (320 * eio3(seg(t, 1.2, 2.3))) + 'px'; else parts.line.style.width = (800 * eio3(seg(t, 1.2, 2.3))) + 'px';
    parts.line.style.opacity = out;
    parts.foot.style.opacity = eo3(seg(t, 2.1, 2.8)) * .9 * out;
  }

  if (ty === 'card') {
    const p = eo5(seg(t, .05, 1.1));
    parts.img.style.opacity = p * out;
    parts.img.style.transform = `translate${V ? 'Y' : 'X'}(${(1 - p) * -40}px) scale(${1 + .03 * (1 - eio3(seg(t, 0, D)))})`;
    parts.kick.style.opacity = eo3(seg(t, .5, 1.1)) * out;
    parts.lines.forEach((l, i) => {
      const q = eo5(seg(t, .7 + i * .14, 1.4 + i * .14));
      l.style.transform = `translateY(${(1 - q) * 104}%)`; l.style.opacity = out;
    });
    parts.rule.style.width = (180 * eo5(seg(t, 1.4, 2.1))) + 'px';
    parts.rule.style.opacity = out;
    parts.sub.style.opacity = eo3(seg(t, 1.7, 2.4)) * out;
  }

  if (ty === 'statement') {
    const n = parts.words.length, span = Math.min(2.4, Math.max(1.0, n * .18));
    parts.words.forEach((w, i) => {
      const a = .2 + span * i / Math.max(1, n);
      const p = eo5(seg(t, a, a + .5));
      w.style.opacity = p * out;
      w.style.transform = `translateY(${(1 - p) * 22}px)`;
    });
  }

  if (ty === 'rows') {
    parts.kick.style.opacity = eo3(seg(t, .05, .6)) * out;
    parts.head.style.opacity = eo3(seg(t, .25, .9)) * out;
    parts.rows.forEach((el, i) => {
      const p = eo5(seg(t, .8 + i * .32, 1.35 + i * .32));
      el.style.opacity = p * out; el.style.transform = `translateX(${(1 - p) * 22}px)`;
    });
    parts.foot.style.opacity = eo3(seg(t, 1.0 + parts.rows.length * .32, 1.7 + parts.rows.length * .32)) * .9 * out;
  }

  if (ty === 'coins') {
    parts.coins.forEach((el, i) => {
      const p = ebounce(clamp(seg(t, .15 + i * .22, .95 + i * .22)));
      el.style.opacity = clamp(seg(t, .15 + i * .22, .45 + i * .22)) * out;
      el.style.transform = `translateY(${(1 - p) * -60}px)`;
    });
    parts.lines.forEach((l, i) => {
      const q = eo5(seg(t, .9 + i * .14, 1.6 + i * .14));
      l.style.transform = `translateY(${(1 - q) * 104}%)`; l.style.opacity = out;
    });
    parts.sub.style.opacity = eo3(seg(t, 1.8, 2.5)) * out;
  }
}
