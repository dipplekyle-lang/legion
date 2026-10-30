// The book inside a video — four overlays rendered frame by frame (window.renderFrame(t), t in seconds).
// S = {scene: "hold" | "pile" | "card" | "end", dur, ...} is set by offer_cta.py before the page loads.
//   hold  the host holding his book in a taped photograph, then the lesson number burned into a plank
//   pile  the lesson pages landing on the table one by one while a counter runs up to the whole book
//   card  the product card over the host's shoulder: cover, what it is, price, QR, "scan or type domain/007"
//   end   the same card for the closing line
// Everything on screen is computed from t alone, so any frame can be rendered in any order.
(function () {
  const S = window.S || {};
  const P = S.palette || {};
  const PAPER = P.paper || '#F3EADB', INK = P.ink || '#241C15', ACC = P.accent || '#A3381F';
  const W = 1920, H = 1080;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };          // moves of the frame: smoothstep
  const outCubic = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  const outBack = (x) => { x = clamp(x); const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const seeded = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html; (parent || document.body).appendChild(e); return e; };

  const css = `
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent}
  *{box-sizing:border-box}
  .paperbg{position:absolute;inset:0;background:
    radial-gradient(ellipse at 50% 42%,rgba(255,250,236,.65),rgba(255,250,236,0) 62%),
    radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 50%,rgba(92,52,18,.42) 100%),${PAPER}}
  .paperbg:before{content:"";position:absolute;inset:0;mix-blend-mode:multiply;opacity:.9;background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .1 0'/></filter><rect width='400' height='400' filter='url(%23n)'/></svg>")}
  .photo{position:absolute;left:0;top:0;width:1240px;padding:22px 22px 26px;background:#FBF8F1;
    box-shadow:0 30px 60px rgba(0,0,0,.4),0 3px 8px rgba(0,0,0,.28);transform-origin:50% 50%}
  .photo img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
  .photo.tall{width:560px}
  .photo.tall img{aspect-ratio:2/3}
  .tape{position:absolute;width:190px;height:52px;background:rgba(222,205,160,.82);top:-20px;
    box-shadow:0 1px 2px rgba(0,0,0,.15)}
  .label{position:absolute;left:44px;bottom:-34px;background:${PAPER};color:${INK};font-family:Display;font-size:58px;
    padding:10px 30px 8px;text-transform:uppercase;box-shadow:0 8px 18px rgba(0,0,0,.35);white-space:nowrap}
  .plank{position:absolute;left:0;top:0;height:132px;padding:0 70px 0 56px;display:flex;align-items:center;
    font-family:Display;font-size:78px;color:#2b1608;text-transform:uppercase;white-space:nowrap;
    background:linear-gradient(180deg,#d9b382 0%,#c89a63 45%,#b98652 100%);
    clip-path:polygon(0 8%,3% 0,97% 4%,100% 18%,98% 92%,94% 100%,4% 96%,0 84%);
    box-shadow:inset 0 0 38px rgba(70,30,5,.75);text-shadow:0 1px 0 rgba(255,220,170,.35)}
  .plank:before{content:"";position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply;
    background:repeating-linear-gradient(176deg,rgba(90,50,20,.0) 0 9px,rgba(90,50,20,.55) 10px 11px,rgba(90,50,20,0) 12px 23px)}
  .plank span{position:relative}
  .table{position:absolute;inset:0;background:
    radial-gradient(ellipse at 50% 45%,rgba(255,235,200,.10),rgba(0,0,0,0) 60%),
    radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,.5) 100%),#5a4a3c}
  .table:before{content:"";position:absolute;inset:0;opacity:.55;mix-blend-mode:multiply;background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.012 .2' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 .2 0 0 0 0 .14 0 0 0 0 .08 0 0 0 .9 0'/></filter><rect width='600' height='600' filter='url(%23n)'/></svg>")}
  .stage{position:absolute;inset:0;transform-origin:50% 50%}
  .sheet{position:absolute;width:640px;border:1px solid rgba(0,0,0,.15);box-shadow:0 18px 36px rgba(0,0,0,.45)}
  .sheet img{display:block;width:100%}
  .count{position:absolute;left:50%;top:812px;transform:translateX(-50%);background:${PAPER};padding:16px 44px 10px;
    font-family:Display;font-size:110px;line-height:1;color:${INK};text-transform:uppercase;white-space:nowrap;
    box-shadow:0 18px 40px rgba(0,0,0,.5)}
  .count b{color:${ACC};font-weight:400}
  .count small{font-size:74px}
  .card{position:absolute;right:72px;top:122px;width:610px;padding:28px;border-radius:12px;color:${INK};
    background:radial-gradient(ellipse at 40% 30%,#fffaf0,${PAPER});border:1.5px solid rgba(0,0,0,.12);
    box-shadow:0 26px 60px rgba(0,0,0,.42),0 2px 6px rgba(0,0,0,.25);transform-origin:100% 0}
  .card .top{display:flex;gap:26px}
  .card .cv{width:196px;flex:none;box-shadow:0 8px 18px rgba(0,0,0,.35)}
  .card .cv img{display:block;width:100%}
  .card h1{font-family:Slab;font-weight:800;font-size:44px;line-height:1.02;margin:6px 0 14px;text-transform:uppercase}
  .card .what{font-family:Book;font-size:24px;line-height:1.35;color:#5d4f41}
  .card .pr{font-family:Slab;font-weight:800;font-size:40px;color:${ACC};margin-top:12px}
  .card .bot{display:flex;align-items:center;gap:26px;margin-top:22px}
  .card .qr{width:196px;height:196px;flex:none;background:#fff;border-radius:10px;padding:10px;
    box-shadow:0 2px 8px rgba(0,0,0,.18)}
  .card .qr svg{display:block;width:100%;height:100%}
  .card .scan{font-family:Cond;font-weight:700;font-size:24px;letter-spacing:3px;color:${ACC};text-transform:uppercase}
  .card .url{font-family:Slab;font-weight:800;font-size:38px;line-height:1.1;word-break:break-all;margin-top:4px}
  .ptag{position:absolute;left:72px;top:96px;display:flex;align-items:center;gap:22px;padding:16px 28px 16px 16px;
    border-radius:12px;color:${INK};background:radial-gradient(ellipse at 40% 30%,#fffaf0,${PAPER});
    border:1.5px solid rgba(0,0,0,.12);box-shadow:0 22px 50px rgba(0,0,0,.4),0 2px 6px rgba(0,0,0,.25)}
  .ptag .im{width:250px;flex:none;box-shadow:0 6px 14px rgba(0,0,0,.3);transform:rotate(-1.5deg)}
  .ptag.tall .im{width:118px}
  .ptag .im img{display:block;width:100%}
  .ptag .k{font-family:Cond;font-weight:700;font-size:22px;letter-spacing:3px;color:${ACC};text-transform:uppercase}
  .ptag .b{font-family:Display;font-size:66px;line-height:1.02;text-transform:uppercase;white-space:nowrap}
  .ptag .t{font-family:Slab;font-weight:700;font-size:28px;line-height:1.15;max-width:520px;margin-top:6px}
  .spark{position:absolute;width:7px;height:7px;border-radius:50%;
    background:radial-gradient(circle,#fff3c4 0%,#ffb347 45%,rgba(255,90,20,0) 70%)}
  `;
  el('style', '', document.head, css);

  const R = {};
  function buildHold() {
    el('div', 'paperbg');
    const ph = el('div', S.tall ? 'photo tall' : 'photo');
    el('img', '', ph).src = S.photo;
    el('div', 'tape', ph).style.cssText = 'left:70px;transform:rotate(-6deg)';
    el('div', 'tape', ph).style.cssText = 'right:70px;transform:rotate(5deg)';
    if (S.label) el('div', 'label', ph, S.label);
    const pl = el('div', 'plank', null, `<span>${S.plank || ''}</span>`);
    R.photo = ph; R.plank = pl;
  }
  function frameHold(t) {
    const D = S.dur;
    const a = outCubic(t / 0.5);                                        // dropped onto the sheet
    const pw = S.tall ? 560 : 1240, ph = S.tall ? 22 + 26 + 560 * 1.5 : 22 + 26 + 1240 * 9 / 16;
    const x = (W - pw) / 2 + (S.tall ? 120 : 60), y = (S.tall ? 70 : 64);
    const drift = 0.025 * smooth(t / D);                                // a slow push while he talks
    R.photo.style.transform = `translate(${x}px,${y}px) rotate(${-1.4 - 1.2 * (1 - a)}deg) scale(${(1.08 - 0.08 * a + drift) * (S.tall ? 0.96 : 1)})`;
    R.photo.style.opacity = String(clamp(t / 0.16));
    R.photo.style.boxShadow = `0 ${10 + 22 * a}px ${24 + 36 * a}px rgba(0,0,0,${0.18 + 0.22 * a})`;
    const pt = t - (S.plank_at || 1.15);
    const pa = outBack(pt / 0.45), pout = smooth((t - (D - 0.38)) / 0.38);
    R.plank.style.transform = `translate(${-760 + 860 * pa - 900 * pout}px, 880px) rotate(-1.2deg)`;
    R.plank.style.opacity = pt > 0 ? '1' : '0';
  }

  function buildPile() {
    el('div', 'table');
    const st = el('div', 'stage');
    R.sheets = (S.sheets || []).map((src, i) => {
      const sh = el('div', 'sheet', st); el('img', '', sh).src = src; return sh;
    });
    R.stage = st;
    R.count = el('div', 'count', null, '');
  }
  function framePile(t) {
    const D = S.dur, n = R.sheets.length || 1;
    const land = Math.min(0.62 * D, 5.2), step = land / n;
    const cols = 4, rows = Math.ceil(n / cols);
    R.stage.style.transform = `scale(${1 + 0.06 * smooth(t / D)})`;
    let landed = 0;
    R.sheets.forEach((sh, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const bx = 140 + c * 430 + (seeded(i) - 0.5) * 90 + (r % 2) * 60;
      const by = 60 + r * (680 / Math.max(1, rows - 0.4)) + (seeded(i + 9) - 0.5) * 60;
      const rot = (seeded(i + 3) - 0.5) * 14;
      const k = (t - i * step) / 0.42;
      const a = outCubic(k);
      if (k >= 1) landed++;
      sh.style.opacity = String(clamp(k * 3));
      sh.style.transform = `translate(${bx}px,${by - 70 * (1 - a)}px) rotate(${rot + 6 * (1 - a)}deg) scale(${1.22 - 0.22 * a})`;
      sh.style.zIndex = String(i);
      sh.style.boxShadow = `0 ${18 + 30 * (1 - a)}px ${36 + 30 * (1 - a)}px rgba(0,0,0,${0.45 - 0.15 * (1 - a)})`;
    });
    const total = S.total || n;
    const prog = clamp(t / (land + 0.4));
    const v = Math.max(1, Math.round(total * (0.35 + 0.65 * outCubic(prog))));
    R.count.innerHTML = `<b>${v}</b> <small>${S.unit || 'LESSONS'}</small>`;
    const ca = outBack((t - 0.25) / 0.5);
    R.count.style.transform = `translateX(-50%) translateY(${(1 - ca) * 260}px)`;
  }

  function buildCard() {
    const c = el('div', 'card');
    c.innerHTML = `<div class="top"><div class="cv"><img src="${S.cover}"></div><div><h1>${S.title}</h1>
      <div class="what">${S.what}</div><div class="pr">${S.price}</div></div></div>
      <div class="bot"><div class="qr">${S.qr}</div><div><div class="scan">Scan or type</div>
      <div class="url">${S.short}</div></div></div>`;
    R.card = c;
    R.sparks = [];
    if (S.fire) for (let i = 0; i < 14; i++) R.sparks.push(el('div', 'spark'));
  }
  function frameCard(t) {
    const D = S.dur;
    const a = smooth(t / 0.55), out = smooth((t - (D - 0.45)) / 0.45);
    const s = S.scene === 'end' ? 0.84 : 1;
    R.card.style.transform = `translateY(${-46 * (1 - a) - 30 * out}px) scale(${s * (0.96 + 0.04 * a)})`;
    R.card.style.opacity = String(a * (1 - out));
    if (S.fire) {
      const g = clamp(1 - t / 1.4);                                     // the card arrives warm, like paper by a fire
      R.card.style.boxShadow = `0 26px 60px rgba(0,0,0,.42),0 2px 6px rgba(0,0,0,.25),0 0 ${70 * g}px rgba(255,130,40,${0.55 * g})`;
      const r = R.card.getBoundingClientRect();
      R.sparks.forEach((sp, i) => {
        const life = 1.3 + seeded(i) * 0.9, st = 0.15 + seeded(i + 5) * 0.7, k = (t - st) / life;
        const vis = k > 0 && k < 1;
        sp.style.opacity = vis ? String((1 - k) * 0.95) : '0';
        const x = r.left + 30 + seeded(i + 11) * (r.width - 60) + Math.sin(k * 6 + i) * 14;
        const y = r.bottom - 6 - k * (90 + seeded(i + 2) * 120);
        sp.style.transform = `translate(${x}px,${y}px) scale(${1 - 0.5 * k})`;
      });
    }
  }

  function buildTag() {                         // "page 259 of my book": the page, small, over the shot
    const g = el('div', 'ptag' + (S.tall ? ' tall' : ''));
    g.innerHTML = `<div class="im"><img src="${S.img}"></div><div><div class="k">${S.kicker || ''}</div>
      <div class="b">${S.big || ''}</div>${S.title ? `<div class="t">${S.title}</div>` : ''}</div>`;
    R.tag = g;
  }
  function frameTag(t) {
    const D = S.dur;
    const a = smooth(t / 0.45), out = smooth((t - (D - 0.4)) / 0.4);
    R.tag.style.transform = `translateX(${-70 * (1 - a) - 50 * out}px)`;
    R.tag.style.opacity = String(a * (1 - out));
  }

  const scene = S.scene;
  if (scene === 'hold') buildHold(); else if (scene === 'pile') buildPile();
  else if (scene === 'tag') buildTag(); else buildCard();
  window.renderFrame = function (t) {
    if (scene === 'hold') frameHold(t); else if (scene === 'pile') framePile(t);
    else if (scene === 'tag') frameTag(t); else frameCard(t);
  };
  const imgs = Array.from(document.images);
  Promise.all([document.fonts.ready, ...imgs.map((im) => im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; }))])
    .then(() => { window.renderFrame(0); window.__ready = true; });
})();
