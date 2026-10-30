/* quest_hud.js — the QUEST style's game HUD ("history played as a video game"), canvas 2D.

   drawHUD(ctx, game, t, W, H)   draws the HUD of second t on a transparent W×H canvas (layout is 1920×1080, scaled)
   hudSig(game, t, W, H)         a string of everything that changes the picture at t — equal strings = equal frames
   QuestHUD.drawIcon(ctx, name, cx, cy, size)   one of the flat item icons (QuestHUD.ICON_NAMES)

   Fonts (registered by the page): QCinzel (variable 400–900), QMont 800 (ExtraBold), 900 (Black), 400 (Book).
   The game timeline (job/quest/game.json) is documented in learned/quest/HUD.md and game_example.json.
   Both functions go through one state builder (state()) whose numbers are quantised, and the painter (paint())
   reads only that state — so the signature can never miss a change in the picture. */
(function (root) {
  'use strict';
  const BW = 1920, BH = 1080;
  const SERIF = 'QCinzel', SANS = 'QMont';
  const GOLD = '#C9A052', OUT = '#151A26';
  const UI_DEFAULT = {
    level: 'LEVEL', xp: 'XP', final: 'FINAL LEVEL', new_item: 'NEW ITEM', unlocked: 'UNLOCKED', locked: 'LOCKED',
    quest_done: 'COMPLETE', achievement: 'ACHIEVEMENT', new_area: ''
  };

  // ── math ──────────────────────────────────────────────────────────────────────────────────────────────
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp01((t - a) / (b - a)));
  const smooth = x => x * x * (3 - 2 * x);
  const outCubic = x => 1 - Math.pow(1 - x, 3);
  const inCubic = x => x * x * x;
  const outQuad = x => 1 - (1 - x) * (1 - x);
  const outBack = (x, s) => { s = s == null ? 1.70158 : s; const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const q = (x, st) => Math.round(x / st) * st;
  const r2 = x => Math.round(x * 100) / 100;
  const r3 = x => Math.round(x * 1000) / 1000;
  const num = v => (typeof v === 'number' ? v : (v != null && v !== '' && !isNaN(+v) ? +v : null));

  // ── text ──────────────────────────────────────────────────────────────────────────────────────────────
  let MC = null;
  function mctx() {
    if (!MC) MC = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(8, 8) : document.createElement('canvas')).getContext('2d');
    return MC;
  }
  const fontStr = (fam, wt, px) => `${wt} ${px}px ${fam}`;
  function textW(s, fam, wt, px, track) {
    const c = mctx();
    c.font = fontStr(fam, wt, px);
    c.letterSpacing = '0px';
    const n = Array.from(s).length;
    return c.measureText(s).width + (track || 0) * Math.max(0, n - 1);
  }
  function fitPx(s, fam, wt, px, trackEm, maxW, minPx) {
    let p = px;
    while (p > (minPx || 10) && textW(s, fam, wt, p, p * trackEm) > maxW) p -= 1;
    return p;
  }
  // draws s with its left edge at x (align 'left'), centre ('center') or right edge ('right') — tracking excluded
  // from the trailing glyph, so centred tracked words sit truly centred
  function drawText(ctx, s, x, y, o) {
    const track = o.track || 0;
    ctx.font = fontStr(o.fam, o.wt, o.px);
    const w = textW(s, o.fam, o.wt, o.px, track);
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.letterSpacing = track + 'px';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeW || 4;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(s, x0, y);
    }
    ctx.fillStyle = o.fill;
    ctx.fillText(s, x0, y);
    ctx.letterSpacing = '0px';
    return w;
  }
  function goldGrad(ctx, y0, y1, light) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    if (light) { g.addColorStop(0, '#FFF7DC'); g.addColorStop(0.55, '#F6DE9C'); g.addColorStop(1, '#D9AE58'); }
    else { g.addColorStop(0, '#FFF0B6'); g.addColorStop(0.45, '#F5CC5E'); g.addColorStop(1, '#C3861F'); }
    return g;
  }
  function shadow(ctx, col, blur, dx, dy) { ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.shadowOffsetX = dx || 0; ctx.shadowOffsetY = dy || 0; }
  function noShadow(ctx) { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function fmtInt(n, sep) {
    const s = String(Math.abs(Math.round(n)));
    let out = '';
    for (let i = 0; i < s.length; i++) { if (i && (s.length - i) % 3 === 0) out += sep; out += s[i]; }
    return (n < 0 ? '-' : '') + out;
  }

  // ── icons: flat game icons in a 100×100 box, a thick dark silhouette outline + thin inner lines ─────────
  const C = {
    steel: '#D6DDE5', steelD: '#8D99A8', gold: '#F2C14E', goldD: '#C48A22', goldL: '#FFE38F', wood: '#BA7A42',
    woodD: '#7C4D27', red: '#D9443B', blue: '#3F7FD0', blueL: '#9CCBF2', green: '#5DB85C', white: '#F6F4EE',
    dark: '#2B303B', leather: '#9C6A3C', purple: '#9B5DD6', orange: '#F28C28', yellow: '#FFD54A', cream: '#F2E4C0',
    creamD: '#D4BC86', glass: 'rgba(206,234,246,0.92)', skin: '#F0CDA8', bone: '#EEE8D8'
  };
  function starPath(cx, cy, ro, ri, n) {
    n = n || 5;
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? ri : ro;
      d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2) + ' ';
    }
    return d + 'Z';
  }
  function gearPath(cx, cy, ro, ri, n) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI, w = Math.PI / n;
      const pts = [[ri, a0 - w * 0.55], [ro, a0 - w * 0.32], [ro, a0 + w * 0.32], [ri, a0 + w * 0.55]];
      pts.forEach((p, j) => { d += (i === 0 && j === 0 ? 'M' : 'L') + (cx + p[0] * Math.cos(p[1])).toFixed(2) + ' ' + (cy + p[0] * Math.sin(p[1])).toFixed(2) + ' '; });
    }
    return d + 'Z';
  }
  // part kinds: f fill+inner line · F fill only · s stroke (outlined) · S stroke only · c circle · C circle only
  //             r ring (cx cy r width) · t text (str x y px)
  const ICONS = {
    sword: { p: [['f', C.steel, 'M50 5 L58 16 L58 63 L42 63 L42 16 Z'], ['S', C.steelD, 3, 'M50 15 L50 60'],
      ['f', C.gold, 'M28 62 H72 A4 4 0 0 1 72 70 H28 A4 4 0 0 1 28 62 Z'], ['f', C.woodD, 'M45 70 H55 V85 H45 Z'], ['c', C.gold, 50, 90, 6]] },
    shield: { p: [['f', C.red, 'M30 8 H70 Q78 8 78 16 V84 Q78 92 70 92 H30 Q22 92 22 84 V16 Q22 8 30 8 Z'],
      ['S', C.gold, 3.5, 'M31 16 H69 V84 H31 Z'], ['f', C.gold, 'M22 46 H78 V54 H22 Z'], ['c', C.gold, 50, 50, 11], ['C', C.goldD, 50, 50, 4.5]] },
    round_shield: { p: [['c', '#D9B676', 50, 50, 42], ['r', '#A27C40', 50, 50, 33, 3.5], ['c', C.gold, 50, 50, 11], ['C', '#A27C40', 50, 50, 4]] },
    spear: { r: 35, p: [['f', C.wood, 'M47 30 H53 V97 H47 Z'], ['f', C.steel, 'M50 3 C58 13 60 24 50 36 C40 24 42 13 50 3 Z'],
      ['S', C.steelD, 2.5, 'M50 10 V30'], ['f', C.gold, 'M44 33 H56 V39 H44 Z']] },
    bow: { p: [['s', C.wood, 8, 'M36 8 C84 22 84 78 36 92'], ['S', '#EDEDED', 2.2, 'M36 8 V92'], ['s', C.woodD, 4, 'M14 50 H74'],
      ['f', C.steel, 'M88 50 L72 41 V59 Z'], ['f', C.red, 'M8 42 L22 50 L8 58 L14 50 Z']] },
    axe: { r: 25, p: [['f', C.wood, 'M46 12 H54 V95 H46 Z'], ['f', C.steel, 'M54 14 H62 C80 10 92 26 90 48 C80 40 70 40 62 44 H54 Z'],
      ['S', 'rgba(255,255,255,0.8)', 2.5, 'M68 17 C80 16 87 26 87 40']] },
    hammer: { r: 30, p: [['f', C.wood, 'M46 30 H54 V95 H46 Z'], ['f', C.steelD, 'M44 34 H56 V42 H44 Z'],
      ['f', C.steel, 'M22 12 H78 Q82 12 82 16 V32 Q82 36 78 36 H22 Q18 36 18 32 V16 Q18 12 22 12 Z'], ['F', 'rgba(255,255,255,0.55)', 'M24 16 H76 V20 H24 Z']] },
    pickaxe: { r: 25, p: [['f', C.wood, 'M46 16 H54 V96 H46 Z'], ['f', C.steel, 'M8 34 C26 8 74 8 92 34 L86 38 C68 22 32 22 14 38 Z'], ['f', C.steelD, 'M42 14 H58 V26 H42 Z']] },
    shovel: { r: 30, p: [['f', C.wood, 'M47 4 H53 V58 H47 Z'], ['f', C.woodD, 'M38 4 H62 V12 H38 Z'],
      ['f', C.steel, 'M34 56 H66 V74 C66 86 50 96 50 96 C50 96 34 86 34 74 Z'], ['S', C.steelD, 2.5, 'M50 62 V86']] },
    stick: { r: 28, p: [['f', C.wood, 'M53 4 C59 18 47 32 55 48 C61 62 49 78 55 96 L45 96 C41 80 52 64 45 50 C37 34 49 20 43 4 Z'],
      ['S', C.woodD, 3, 'M47 22 L55 26 M46 46 L54 50 M47 70 L55 74'], ['C', '#FFFFFF', 48, 7, 3]] },
    staff: { r: 28, p: [['f', C.wood, 'M47 22 H53 V97 H47 Z'], ['c', '#DDE3EA', 50, 13, 10], ['C', 'rgba(255,255,255,0.8)', 46, 9, 3.5], ['f', C.gold, 'M44 22 H56 V28 H44 Z']] },
    torch: { p: [['f', C.wood, 'M43 50 H57 L53 96 H47 Z'], ['f', '#5A4A3A', 'M36 42 H64 L60 54 H40 Z'],
      ['f', C.orange, 'M50 3 C64 16 70 28 64 40 C59 47 41 47 36 40 C30 28 40 20 45 11 C47 19 51 21 50 3 Z'],
      ['F', C.yellow, 'M50 18 C58 26 60 34 56 40 C53 43 47 43 44 40 C41 34 45 28 50 18 Z']] },
    scroll: { p: [['f', C.cream, 'M24 20 H76 V80 H24 Z'], ['f', C.creamD, 'M16 12 H84 A8 8 0 0 1 84 28 H16 A8 8 0 0 1 16 12 Z'],
      ['f', C.creamD, 'M16 72 H84 A8 8 0 0 1 84 88 H16 A8 8 0 0 1 16 72 Z'], ['S', '#9C8A64', 3, 'M32 40 H68 M32 50 H68 M32 60 H56'], ['c', C.red, 66, 80, 7]] },
    book: { p: [['f', C.cream, 'M24 18 H82 V88 H24 Z'], ['S', '#B9A57C', 2, 'M28 85 H80'], ['f', C.blue, 'M16 12 H74 Q80 12 80 18 V76 Q80 82 74 82 H16 Z'],
      ['f', '#2E5E9E', 'M16 12 H25 V82 H16 Z'], ['f', C.gold, 'M52 32 L60 47 L52 62 L44 47 Z']] },
    quill: { p: [['f', C.white, 'M86 6 C62 12 36 38 28 70 L34 74 C52 54 78 36 86 6 Z'], ['S', '#B8B2A6', 2.5, 'M84 9 C66 26 46 48 31 72'], ['f', C.dark, 'M28 70 L20 93 L34 74 Z']] },
    coin: { p: [['c', C.gold, 50, 50, 40], ['r', C.goldD, 50, 50, 30, 3], ['F', C.goldD, 'M45 33 H55 V67 H45 Z'], ['S', 'rgba(255,255,255,0.6)', 4, 'M25 40 A27 27 0 0 1 42 24']] },
    coins: { p: [['c', C.gold, 32, 64, 22], ['r', C.goldD, 32, 64, 15, 2.5], ['c', C.gold, 68, 64, 22], ['r', C.goldD, 68, 64, 15, 2.5],
      ['c', C.gold, 50, 36, 22], ['r', C.goldD, 50, 36, 15, 2.5], ['S', 'rgba(255,255,255,0.6)', 3, 'M36 28 A15 15 0 0 1 46 22']] },
    bag: { p: [['f', C.leather, 'M32 34 C12 50 14 92 50 92 C86 92 88 50 68 34 Z'], ['f', '#B98552', 'M30 12 C40 20 60 20 70 12 L62 32 H38 Z'],
      ['f', C.woodD, 'M34 30 H66 V38 H34 Z'], ['c', C.gold, 50, 64, 10]] },
    chest: { p: [['f', C.wood, 'M10 44 H90 V88 H10 Z'], ['f', '#A0622F', 'M10 44 V34 C10 18 90 18 90 34 V44 Z'], ['f', C.gold, 'M22 22 H30 V88 H22 Z'],
      ['f', C.gold, 'M70 22 H78 V88 H70 Z'], ['f', C.gold, 'M10 41 H90 V49 H10 Z'], ['f', C.gold, 'M42 44 H58 V62 H42 Z'], ['C', C.dark, 50, 52, 3]] },
    key: { r: -45, p: [['r', C.gold, 50, 22, 13, 8], ['f', C.gold, 'M46 34 H54 V93 H46 Z'], ['f', C.gold, 'M54 70 H66 V77 H54 Z'], ['f', C.gold, 'M54 83 H70 V91 H54 Z']] },
    crown: { p: [['f', C.gold, 'M12 76 L16 30 L35 52 L50 20 L65 52 L84 30 L88 76 Z'], ['f', C.goldD, 'M12 74 H88 V88 H12 Z'], ['C', C.red, 50, 81, 4.5],
      ['C', C.blue, 30, 81, 3.5], ['C', C.blue, 70, 81, 3.5], ['c', C.goldL, 16, 27, 5], ['c', C.goldL, 50, 17, 5], ['c', C.goldL, 84, 27, 5]] },
    ring: { p: [['r', C.gold, 50, 64, 25, 9], ['f', C.goldD, 'M40 32 H60 L56 42 H44 Z'], ['f', '#62C8EE', 'M38 18 L44 9 H56 L62 18 L50 34 Z'], ['S', 'rgba(255,255,255,0.7)', 2, 'M44 12 L41 18']] },
    gem: { p: [['f', '#86DBF7', 'M28 14 H72 L90 36 H10 Z'], ['f', '#3FA9D9', 'M10 36 H90 L50 92 Z'],
      ['S', 'rgba(255,255,255,0.6)', 2, 'M30 36 L50 92 L70 36 M38 14 L30 36 M62 14 L70 36 M10 36 H90']] },
    helmet: { p: [['f', C.red, 'M26 36 C28 4 72 4 74 36 L66 38 C62 20 38 20 34 38 Z'], ['f', C.steel, 'M18 64 C18 30 82 30 82 64 Z'], ['f', C.gold, 'M12 60 H88 V69 H12 Z'],
      ['f', C.steel, 'M22 69 H36 V88 L26 84 Z'], ['f', C.steel, 'M64 69 H78 L74 84 L64 88 Z'], ['F', 'rgba(255,255,255,0.6)', 'M28 52 C30 42 40 37 48 37 C40 41 34 47 33 55 Z']] },
    armor: { p: [['f', C.steel, 'M28 26 C36 30 64 30 72 26 V86 H28 Z'], ['S', C.steelD, 3, 'M28 44 H72 M28 56 H72 M28 68 H72'], ['S', C.steelD, 2.5, 'M50 30 V78'],
      ['f', C.steel, 'M12 34 C12 20 26 12 40 16 L42 32 L18 44 Z'], ['f', C.steel, 'M88 34 C88 20 74 12 60 16 L58 32 L82 44 Z'],
      ['S', C.gold, 3, 'M16 32 C18 22 28 18 38 19 M84 32 C82 22 72 18 62 19'], ['f', C.gold, 'M26 78 H74 V88 H26 Z'], ['C', C.goldD, 50, 83, 3]] },
    boots: { p: [['f', C.leather, 'M28 8 H52 V60 L76 70 C84 73 88 78 88 86 V90 H28 Z'], ['f', C.woodD, 'M28 86 H88 V94 H28 Z'], ['S', '#6E4826', 3, 'M28 22 H52']] },
    horse: { p: [['f', '#A86B3C', 'M66 8 L58 20 C44 22 28 34 20 52 L12 66 C10 72 16 76 22 74 L36 66 C42 66 46 70 46 78 V94 H86 C86 70 82 44 74 30 L74 12 Z'],
      ['f', '#5B3A22', 'M66 8 C84 20 90 50 86 94 H80 C80 62 76 38 64 22 Z'], ['C', C.dark, 44, 38, 3.5], ['C', C.dark, 17, 67, 2]] },
    flag: { p: [['f', C.wood, 'M22 10 H28 V95 H22 Z'], ['f', C.red, 'M28 12 C44 4 60 22 84 12 V52 C60 62 44 44 28 52 Z'], ['c', C.gold, 25, 9, 5]] },
    eagle: { p: [['f', C.gold, 'M44 40 C30 34 18 24 8 10 C10 30 18 44 30 52 L44 56 Z'], ['f', C.gold, 'M56 40 C70 34 82 24 92 10 C90 30 82 44 70 52 L56 56 Z'],
      ['f', C.gold, 'M43 34 C43 26 57 26 57 34 L59 62 L50 72 L41 62 Z'], ['c', C.gold, 50, 25, 8], ['f', C.goldD, 'M44 68 L50 82 L56 68 Z'],
      ['f', C.goldD, 'M28 80 H72 V87 H28 Z'], ['S', C.goldD, 2.5, 'M18 26 L32 40 M24 20 L38 38']] },
    laurel: { fn: drawLaurel },
    star: { p: [['f', C.gold, starPath(50, 54, 46, 20)], ['F', 'rgba(255,255,255,0.45)', 'M50 18 L56 40 L50 46 Z']] },
    heart: { p: [['f', C.red, 'M50 88 C20 66 8 48 14 32 C20 16 42 14 50 30 C58 14 80 16 86 32 C92 48 80 66 50 88 Z'], ['F', 'rgba(255,255,255,0.5)', 'M22 36 C24 26 32 22 38 24 C30 28 26 34 26 42 Z']] },
    skull: { p: [['f', C.bone, 'M50 10 C26 10 14 28 16 48 C17 58 22 62 28 64 V78 H72 V64 C78 62 83 58 84 48 C86 28 74 10 50 10 Z'],
      ['c', C.dark, 37, 45, 9], ['c', C.dark, 63, 45, 9], ['f', C.dark, 'M50 54 L45 64 H55 Z'], ['f', C.bone, 'M32 78 H68 V90 H32 Z'], ['S', C.dark, 2.5, 'M41 78 V90 M50 78 V90 M59 78 V90']] },
    potion: { p: [['f', C.glass, 'M40 14 H60 V36 C74 42 80 52 80 64 C80 80 66 92 50 92 C34 92 20 80 20 64 C20 52 26 42 40 36 Z'],
      ['F', C.purple, 'M22 62 C34 56 44 66 56 60 C66 56 74 58 78 62 C78 80 66 90 50 90 C34 90 22 80 22 62 Z'], ['f', C.wood, 'M38 5 H62 V16 H38 Z'],
      ['S', 'rgba(255,255,255,0.75)', 3, 'M30 60 C30 52 34 48 38 46']] },
    map: { p: [['f', C.cream, 'M8 22 L36 12 L64 22 L92 12 V78 L64 88 L36 78 L8 88 Z'], ['F', '#DCC894', 'M36 12 L64 22 V88 L36 78 Z'],
      ['S', C.red, 3, 'M18 72 C28 58 42 64 50 50 C56 40 62 40 68 36', [5, 5]], ['S', C.red, 4, 'M68 24 L80 36 M80 24 L68 36']] },
    compass: { p: [['c', C.gold, 50, 50, 42], ['c', C.cream, 50, 50, 33], ['f', C.red, 'M50 17 L58 50 H42 Z'], ['f', '#9AA6B4', 'M50 83 L42 50 H58 Z'], ['C', C.dark, 50, 50, 4]] },
    anchor: { p: [['r', '#6B87A5', 50, 15, 8, 6], ['f', '#6B87A5', 'M46 22 H54 V86 H46 Z'], ['f', '#6B87A5', 'M30 32 H70 V40 H30 Z'],
      ['s', '#6B87A5', 8, 'M18 62 C20 80 36 88 50 88 C64 88 80 80 82 62'], ['f', '#6B87A5', 'M10 66 L18 50 L27 66 Z'], ['f', '#6B87A5', 'M73 66 L82 50 L90 66 Z']] },
    wheel: { p: [['s', C.wood, 6, 'M50 14 V86 M14 50 H86 M24.5 24.5 L75.5 75.5 M75.5 24.5 L24.5 75.5'], ['r', C.wood, 50, 50, 37, 10], ['c', C.woodD, 50, 50, 11], ['C', C.gold, 50, 50, 4.5]] },
    gear: { p: [['f', C.steel, gearPath(50, 50, 46, 36, 9)], ['r', C.steelD, 50, 50, 24, 4], ['c', C.dark, 50, 50, 12]] },
    wrench: { p: [['f', C.steel, 'M70 8 C82 8 92 18 90 30 L80 24 L72 30 L74 40 L84 44 C78 54 66 56 58 50 L24 88 C20 92 12 90 10 84 C8 80 10 76 14 72 L50 38 C44 28 52 10 70 8 Z'], ['C', C.steelD, 18, 82, 3]] },
    rifle: { r: -30, p: [['f', C.steel, 'M3 42 H64 V48 H3 Z'], ['f', C.wood, 'M22 47 H50 V54 H22 Z'], ['f', C.dark, 'M44 39 H72 V54 H44 Z'],
      ['f', C.wood, 'M66 41 L97 46 V63 L82 63 L68 54 Z'], ['S', C.dark, 3, 'M54 54 C54 62 62 62 62 56']] },
    pistol: { p: [['f', C.wood, 'M58 44 H80 L88 88 H66 Z'], ['f', C.steel, 'M12 30 H84 V46 H12 Z'], ['S', C.steelD, 2.5, 'M18 36 H70'],
      ['S', C.dark, 3.5, 'M50 46 V54 C50 60 56 62 60 60'], ['f', C.dark, 'M12 30 H18 V38 H12 Z']] },
    bomb: { p: [['c', '#353B48', 44, 60, 32], ['f', '#6B7280', 'M54 24 L70 30 L64 44 L50 38 Z'], ['s', '#C9A36A', 4, 'M64 28 C70 18 78 14 84 18'],
      ['F', C.yellow, starPath(86, 16, 12, 5, 6)], ['F', 'rgba(255,255,255,0.35)', 'M24 52 C26 42 34 36 42 34 C34 40 30 46 29 56 Z']] },
    rocket: { r: 45, p: [['f', C.orange, 'M40 76 H60 L50 99 Z'], ['F', C.yellow, 'M44 76 H56 L50 90 Z'], ['f', C.red, 'M34 48 L16 74 L34 70 Z'], ['f', C.red, 'M66 48 L84 74 L66 70 Z'],
      ['f', C.white, 'M50 4 C66 16 70 42 66 70 H34 C30 42 34 16 50 4 Z'], ['f', C.red, 'M50 4 C56 8 60 14 62 21 H38 C40 14 44 8 50 4 Z'],
      ['c', C.blueL, 50, 38, 9], ['f', C.steelD, 'M38 68 H62 V77 H38 Z']] },
    plane: { r: 45, p: [['f', C.steel, 'M10 52 L45 34 L55 34 L90 52 V60 L55 52 L45 52 L10 60 Z'], ['f', C.steel, 'M34 88 L45 78 L55 78 L66 88 V93 H34 Z'],
      ['f', C.white, 'M45 12 C45 3 55 3 55 12 V86 C55 92 45 92 45 86 Z'], ['F', C.blueL, 'M47 14 H53 V22 H47 Z']] },
    ship: { p: [['f', C.woodD, 'M48 8 H53 V64 H48 Z'], ['f', C.white, 'M55 12 C73 22 75 44 55 56 Z'], ['f', C.white, 'M46 16 C31 26 29 44 46 54 Z'],
      ['f', C.red, 'M53 8 L66 12 L53 16 Z'], ['f', C.wood, 'M8 62 H92 L80 86 H20 Z'], ['F', C.woodD, 'M10 62 H90 V67 H10 Z']] },
    tent: { p: [['f', C.cream, 'M50 12 L90 84 H10 Z'], ['f', '#C9B07A', 'M50 40 L64 84 H36 Z'], ['S', C.woodD, 3, 'M50 12 V4']] },
    house: { p: [['f', C.cream, 'M20 46 H80 V88 H20 Z'], ['f', C.red, 'M8 50 L50 12 L92 50 Z'], ['f', C.wood, 'M42 62 H58 V88 H42 Z'],
      ['f', C.blueL, 'M26 56 H38 V68 H26 Z'], ['f', C.blueL, 'M62 56 H74 V68 H62 Z']] },
    castle: { p: [['f', '#C9C2B4', 'M36 40 H42 V46 H48 V40 H52 V46 H58 V40 H64 V90 H36 Z'], ['f', '#B9B2A4', 'M8 20 H14 V26 H20 V20 H26 V26 H32 V20 H38 V90 H8 Z'],
      ['f', '#B9B2A4', 'M62 20 H68 V26 H74 V20 H80 V26 H86 V20 H92 V90 H62 Z'], ['f', C.dark, 'M42 90 V72 C42 62 58 62 58 72 V90 Z'],
      ['F', C.dark, 'M20 40 H26 V50 H20 Z'], ['F', C.dark, 'M74 40 H80 V50 H74 Z'], ['S', C.woodD, 2.5, 'M23 20 V5'], ['f', C.red, 'M23 5 L35 9 L23 13 Z']] },
    clock: { p: [['c', C.gold, 50, 50, 42], ['c', C.white, 50, 50, 34], ['S', C.dark, 3, 'M50 20 V26 M80 50 H74 M50 80 V74 M20 50 H26'],
      ['S', C.dark, 5, 'M50 50 V30'], ['S', C.dark, 5, 'M50 50 L64 58'], ['C', C.red, 50, 50, 4]] },
    hourglass: { p: [['f', C.glass, 'M26 16 H74 C74 38 56 44 56 50 C56 56 74 62 74 84 H26 C26 62 44 56 44 50 C44 44 26 38 26 16 Z'],
      ['F', C.gold, 'M34 30 H66 C62 38 54 42 52 48 H48 C46 42 38 38 34 30 Z'], ['F', C.gold, 'M30 82 C34 70 44 66 50 64 C56 66 66 70 70 82 Z'],
      ['S', C.gold, 2, 'M50 50 V64'], ['f', C.wood, 'M18 6 H82 V16 H18 Z'], ['f', C.wood, 'M18 84 H82 V94 H18 Z']] },
    warning: { p: [['f', '#E0383A', 'M50 8 L94 86 Q96 92 90 92 H10 Q4 92 6 86 Z'], ['F', C.white, 'M45 34 H55 L53 66 H47 Z'], ['C', C.white, 50, 78, 5.5]] },
    check: { p: [['c', '#4CB860', 50, 50, 42], ['S', C.white, 10, 'M28 52 L44 68 L74 36']] },
    lock: { fn: (ctx) => drawLock(ctx, 0) },
    unlock: { fn: (ctx) => drawLock(ctx, 1) },
    medal: { p: [['f', C.red, 'M28 4 H46 L58 40 H40 Z'], ['f', C.blue, 'M72 4 H54 L42 40 H60 Z'], ['c', C.gold, 50, 64, 27], ['r', C.goldD, 50, 64, 20, 2.5],
      ['F', C.goldD, starPath(50, 65, 12, 5)]] },
    trophy: { p: [['s', C.gold, 6, 'M28 20 C10 20 12 46 32 46'], ['s', C.gold, 6, 'M72 20 C90 20 88 46 68 46'],
      ['f', C.gold, 'M26 10 H74 V28 C74 48 62 58 50 58 C38 58 26 48 26 28 Z'], ['f', C.goldD, 'M44 58 H56 V72 H44 Z'], ['f', C.goldD, 'M32 72 H68 V80 H32 Z'],
      ['f', C.wood, 'M24 80 H76 V93 H24 Z'], ['F', 'rgba(255,255,255,0.45)', 'M32 16 H40 V32 C40 40 42 44 44 48 C36 44 32 38 32 30 Z']] },
    person: { p: [['f', C.blue, 'M18 93 C18 64 32 54 50 54 C68 54 82 64 82 93 Z'], ['c', C.skin, 50, 30, 17]] },
    people: { p: [['f', '#7D8FA8', 'M4 88 C4 66 14 58 28 58 C42 58 52 66 52 88 Z'], ['c', '#E3C29F', 28, 40, 12], ['f', '#7D8FA8', 'M48 88 C48 66 58 58 72 58 C86 58 96 66 96 88 Z'],
      ['c', '#E3C29F', 72, 40, 12], ['f', C.blue, 'M24 95 C24 72 36 64 50 64 C64 64 76 72 76 95 Z'], ['c', C.skin, 50, 45, 14]] },
    dollar: { p: [['f', '#7CC46A', 'M6 24 H94 V76 H6 Z'], ['S', '#3E7F35', 3, 'M14 32 H86 V68 H14 Z'], ['c', '#A6DB95', 50, 50, 15], ['t', '#2F6B2A', '$', 50, 60, 28]] },
    briefcase: { p: [['s', C.woodD, 6, 'M36 30 V20 Q36 16 40 16 H60 Q64 16 64 20 V30'], ['f', '#8B5A2B', 'M8 30 H92 V88 H8 Z'], ['f', '#6E4520', 'M8 48 H92 V54 H8 Z'], ['f', C.gold, 'M43 45 H57 V58 H43 Z']] },
    phone: { p: [['f', C.dark, 'M30 4 H70 Q78 4 78 12 V88 Q78 96 70 96 H30 Q22 96 22 88 V12 Q22 4 30 4 Z'], ['F', '#3D8FE0', 'M28 14 H72 V80 H28 Z'],
      ['C', '#9AA6B4', 50, 88, 3.5], ['F', 'rgba(255,255,255,0.3)', 'M28 14 H52 L28 50 Z']] },
    laptop: { p: [['f', C.dark, 'M16 16 H84 V66 H16 Z'], ['F', '#3D8FE0', 'M22 22 H78 V60 H22 Z'], ['f', '#BFC7D1', 'M4 68 H96 L88 82 H12 Z'], ['F', '#8E9AA8', 'M42 70 H58 V74 H42 Z']] },
    flask: { p: [['f', C.glass, 'M40 6 H60 V14 H57 V36 L84 82 Q88 92 78 92 H22 Q12 92 16 82 L43 36 V14 H40 Z'], ['F', '#5CC36A', 'M30 60 H70 L82 82 Q85 89 77 89 H23 Q15 89 18 82 Z'],
      ['C', 'rgba(255,255,255,0.75)', 40, 74, 3], ['C', 'rgba(255,255,255,0.75)', 56, 68, 2.5]] },
    camera: { p: [['f', C.dark, 'M32 30 L38 18 H62 L68 30 Z'], ['f', '#3A404C', 'M8 30 H92 V86 H8 Z'], ['c', '#9AA6B4', 50, 58, 20], ['c', '#2D6CB5', 50, 58, 12],
      ['C', 'rgba(255,255,255,0.65)', 45, 53, 4], ['F', C.red, 'M76 36 H86 V44 H76 Z']] },
    microphone: { p: [['s', '#9AA6B4', 5, 'M28 42 C28 64 72 64 72 42'], ['f', '#9AA6B4', 'M47 62 H53 V82 H47 Z'], ['f', '#9AA6B4', 'M32 82 H68 V90 H32 Z'],
      ['f', '#5B6575', 'M36 8 H64 V44 Q64 58 50 58 Q36 58 36 44 Z'], ['S', '#9AA6B4', 2.5, 'M38 20 H62 M38 30 H62 M38 40 H62']] },
    globe: { p: [['c', '#3E8ED0', 50, 50, 41], ['F', C.green, 'M28 26 C38 22 46 28 42 38 C38 46 30 44 26 52 C22 44 22 32 28 26 Z'],
      ['F', C.green, 'M58 44 C66 40 76 46 74 58 C72 70 62 76 56 70 C52 62 54 50 58 44 Z'], ['F', C.green, 'M54 16 C60 14 68 18 66 24 C62 26 56 24 54 16 Z'],
      ['S', 'rgba(255,255,255,0.4)', 2, 'M10 50 H90 M50 9 C30 30 30 70 50 91 M50 9 C70 30 70 70 50 91']] },
    food: { p: [['f', '#D99A4E', 'M10 62 C10 38 30 28 50 28 C70 28 90 38 90 62 V78 Q90 84 84 84 H16 Q10 84 10 78 Z'], ['S', '#A8692B', 3.5, 'M32 40 L26 56 M50 36 L44 54 M68 40 L62 56'],
      ['F', 'rgba(255,255,255,0.25)', 'M20 48 C24 38 34 34 42 33 C32 38 26 44 24 52 Z']] },
    fire: { p: [['f', C.orange, 'M50 4 C60 24 80 34 80 60 C80 80 66 94 50 94 C34 94 20 80 20 60 C20 46 28 38 34 28 C36 40 42 46 46 46 C42 30 44 18 50 4 Z'],
      ['F', C.yellow, 'M50 44 C56 54 66 60 66 72 C66 84 58 90 50 90 C42 90 34 84 34 72 C34 62 44 56 50 44 Z']] },
    water: { p: [['f', '#3E9BE0', 'M50 6 C62 30 80 46 80 64 C80 82 66 94 50 94 C34 94 20 82 20 64 C20 46 38 30 50 6 Z'], ['F', 'rgba(255,255,255,0.55)', 'M34 62 C34 52 40 44 44 40 C42 50 40 58 40 66 Z']] },
    swords: { p: [['f', C.steel, 'M14 8 L24 10 L66 52 L60 58 L18 16 Z'], ['f', C.steel, 'M86 8 L76 10 L34 52 L40 58 L82 16 Z'],
      ['f', C.gold, 'M54 50 L68 64 L64 68 L50 54 Z'], ['f', C.gold, 'M46 50 L32 64 L36 68 L50 54 Z'], ['f', C.woodD, 'M66 64 L80 78 L76 82 L62 68 Z'],
      ['f', C.woodD, 'M34 64 L20 78 L24 82 L38 68 Z'], ['c', C.gold, 82, 84, 5], ['c', C.gold, 18, 84, 5]] }
  };
  const ALIAS = {
    gladius: 'sword', blade: 'sword', scutum: 'shield', parma: 'round_shield', shield_round: 'round_shield', buckler: 'round_shield',
    pilum: 'spear', javelin: 'spear', lance: 'spear', pike: 'spear', arrow: 'bow', money: 'coins', gold: 'coins', treasure: 'chest',
    cash: 'dollar', pay: 'coin', salary: 'coin', danger: 'warning', alert: 'warning', prestige: 'laurel', wreath: 'laurel', army: 'people',
    crowd: 'people', soldiers: 'people', soldier: 'helmet', time: 'clock', timer: 'clock', padlock: 'lock', pack: 'bag', sack: 'bag',
    aquila: 'eagle', standard: 'flag', banner: 'flag', letter: 'scroll', document: 'scroll', paper: 'scroll', bread: 'food', meal: 'food',
    flame: 'fire', drop: 'water', boat: 'ship', fort: 'castle', camp: 'tent', home: 'house', diamond: 'gem', jewel: 'gem', health: 'heart',
    life: 'heart', death: 'skull', poison: 'potion', science: 'flask', lab: 'flask', computer: 'laptop', mic: 'microphone', world: 'globe',
    earth: 'globe', vine_stick: 'stick', rod: 'stick', club: 'stick', cane: 'stick', gun: 'rifle', musket: 'rifle', revolver: 'pistol',
    award: 'medal', cup: 'trophy', king: 'crown', queen: 'crown', tool: 'wrench', tools: 'wrench', settings: 'gear', cog: 'gear',
    shovel_tool: 'shovel', spade: 'shovel', mining: 'pickaxe', hat: 'helmet', galea: 'helmet', lorica: 'armor', chainmail: 'armor'
  };
  function iconDef(name) {
    const n = String(name || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    return ICONS[n] || ICONS[ALIAS[n]] || ICONS.gem;
  }
  const PCACHE = new Map();
  const P2 = d => { let p = PCACHE.get(d); if (!p) { p = new Path2D(d); PCACHE.set(d, p); } return p; };
  function partPath(pt) {
    if (pt[0] === 'c' || pt[0] === 'C') { const p = new Path2D(); p.arc(pt[2], pt[3], pt[4], 0, Math.PI * 2); return p; }
    if (pt[0] === 'r') { const p = new Path2D(); p.arc(pt[2], pt[3], pt[4], 0, Math.PI * 2); return p; }
    if (pt[0] === 's' || pt[0] === 'S') return P2(pt[3]);
    if (pt[0] === 't') return null;
    return P2(pt[2]);
  }
  function paintParts(ctx, parts) {
    const OL = 9, IL = 2.6;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 1 — the silhouette: every outlined part stroked fat in the outline colour
    ctx.strokeStyle = OUT;
    for (const pt of parts) {
      const k = pt[0];
      if (k === 'F' || k === 'S' || k === 'C' || k === 't') continue;
      const p = partPath(pt);
      if (k === 's') { ctx.lineWidth = pt[2] + OL; ctx.setLineDash([]); ctx.stroke(p); }
      else if (k === 'r') { ctx.lineWidth = pt[5] + OL; ctx.stroke(p); }
      else { ctx.lineWidth = OL; ctx.stroke(p); ctx.fillStyle = OUT; ctx.fill(p); }
    }
    // 2 — the parts in order, each with a thin inner line
    for (const pt of parts) {
      const k = pt[0];
      const p = partPath(pt);
      if (k === 'f' || k === 'c') {
        ctx.fillStyle = pt[1]; ctx.fill(p);
        ctx.lineWidth = IL; ctx.strokeStyle = 'rgba(21,26,38,0.75)'; ctx.stroke(p);
      } else if (k === 'F' || k === 'C') {
        ctx.fillStyle = pt[1]; ctx.fill(p);
      } else if (k === 's' || k === 'S') {
        ctx.strokeStyle = pt[1]; ctx.lineWidth = pt[2]; ctx.setLineDash(pt[4] || []); ctx.stroke(p); ctx.setLineDash([]);
      } else if (k === 'r') {
        ctx.strokeStyle = pt[1]; ctx.lineWidth = pt[5]; ctx.stroke(p);
      } else if (k === 't') {
        ctx.fillStyle = pt[1]; ctx.font = fontStr(SANS, 900, pt[5]); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(pt[2], pt[3], pt[4] + pt[5] * 0.0); ctx.textAlign = 'left';
      }
    }
  }
  function drawLaurel(ctx) {
    const leaves = [];
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + side * (0.42 + i * 0.4);
      leaves.push([50 + 34 * Math.cos(a), 52 + 34 * Math.sin(a), a + side * Math.PI / 2 + side * 0.35]);
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const stem = new Path2D('M50 86 C26 84 14 66 16 48 C17 34 24 24 32 18 M50 86 C74 84 86 66 84 48 C83 34 76 24 68 18');
    ctx.strokeStyle = OUT; ctx.lineWidth = 12; ctx.stroke(stem);
    for (const [x, y, a] of leaves) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2); ctx.lineWidth = 8; ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = '#5E8F2E'; ctx.lineWidth = 4; ctx.stroke(stem);
    for (const [x, y, a] of leaves) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#86C04E'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(21,26,38,0.7)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
  }
  function drawLock(ctx, open) {
    const lift = 13 * open;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const sh = new Path2D(`M32 ${48 - lift} V${34 - lift} C32 ${10 - lift} 68 ${10 - lift} 68 ${34 - lift} V${(open > 0 ? 40 : 48) - lift}`);
    const body = new Path2D('M22 44 H78 Q84 44 84 50 V84 Q84 90 78 90 H22 Q16 90 16 84 V50 Q16 44 22 44 Z');
    ctx.strokeStyle = OUT; ctx.lineWidth = 18; ctx.stroke(sh); ctx.lineWidth = 9; ctx.stroke(body); ctx.fillStyle = OUT; ctx.fill(body);
    ctx.strokeStyle = '#C9D1DB'; ctx.lineWidth = 9; ctx.stroke(sh);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2.5; ctx.stroke(new Path2D(`M29.5 ${38 - lift} C30 ${18 - lift} 40 ${12 - lift} 50 ${12 - lift}`));
    const g = ctx.createLinearGradient(0, 44, 0, 90); g.addColorStop(0, '#FFD866'); g.addColorStop(1, '#D99A22');
    ctx.fillStyle = g; ctx.fill(body); ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(21,26,38,0.75)'; ctx.stroke(body);
    ctx.fillStyle = C.dark; ctx.beginPath(); ctx.arc(50, 62, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(47, 64); ctx.lineTo(53, 64); ctx.lineTo(55, 78); ctx.lineTo(45, 78); ctx.closePath(); ctx.fill();
  }
  function drawIcon(ctx, name, cx, cy, size, opt) {
    const def = (opt && opt.def) || iconDef(name);
    const s = size / 100;
    ctx.save();
    ctx.translate(cx, cy);
    if (opt && opt.rot) ctx.rotate(opt.rot);
    ctx.scale(s, s);
    if (def.r) ctx.rotate(def.r * Math.PI / 180);
    ctx.translate(-50, -50);
    if (def.fn) def.fn(ctx, opt || {}); else paintParts(ctx, def.p);
    ctx.restore();
  }

  // ── the timeline, prepared once per game object ──────────────────────────────────────────────────────
  const LV = { pop: 0.22, flyA: 1.3, land: 1.62, titleIn: 1.35, titleHold: 1.75, titleFly: 0.42 };
  const CACHE = new WeakMap();
  const SEP = { cs: ' ', sk: ' ', pl: ' ', fr: ' ', ru: ' ', uk: ' ', hu: ' ', de: '.', es: '.', it: '.', nl: '.', pt: '.', da: '.', en: ',' };
  function prep(game) {
    let P = CACHE.get(game);
    if (P) return P;
    P = {};
    P.ui = Object.assign({}, UI_DEFAULT, game.ui || {});
    const lang = String(game.lang || 'en').toLowerCase().slice(0, 2);
    P.sep = P.ui.thousands != null ? String(P.ui.thousands) : (SEP[lang] != null ? SEP[lang] : ',');
    P.dur = +game.dur || 0;
    P.stats = (game.stats || []).slice(0, 5).map((s, i) => ({
      id: String(s.id != null ? s.id : 'stat' + i), label: String(s.label || s.id || '').toUpperCase(),
      icon: s.icon || 'gem', color: s.color || ['#E9B44C', '#E0383A', '#8B6CF0', '#4CB8E9', '#5DB85C'][i % 5], max: +s.max || 10,
      danger: !!s.danger
    }));
    const dIdx = P.stats.findIndex(s => s.danger);
    P.dangerId = dIdx >= 0 ? P.stats[dIdx].id : ((P.stats.find(s => /danger|risk|nebezp|gefahr|niebezp|zagro|riziko|hazard/i.test(s.id + ' ' + s.label)) ||
      P.stats.find(s => /^#?e0383a$/i.test(s.color)) || P.stats[1] || P.stats[0] || {}).id);
    P.nSlots = Math.max(1, Math.min(10, +game.slots || 6));
    const ev = (game.events || []).map((e, i) => Object.assign({ _i: i }, e)).filter(e => e && e.type != null && num(e.t) != null);
    ev.forEach(e => { e.t = +e.t; if (e.t_end != null) e.t_end = +e.t_end; });
    ev.sort((a, b) => a.t - b.t || a._i - b._i);
    P.ev = ev;
    const by = type => ev.filter(e => e.type === type);
    P.hides = by('hide').map(e => ({ a: e.t, b: e.t_end != null ? e.t_end : e.t + 1 }));
    const bosses = by('boss');
    // levels
    const lv = (game.levels || []).map((L, i) => ({
      i, n: L.n, rank: String(L.rank || '').toUpperCase(), T: +L.t || 0, stats: L.stats || null,
      final: !!L.final || String(L.n).toUpperCase() === 'FINAL'
    })).sort((a, b) => a.T - b.T);
    lv.forEach((L, i) => {
      L.next = i + 1 < lv.length ? lv[i + 1].T : Infinity;
      L.numStr = L.final ? (num(L.n) != null ? String(L.n) : null) : String(L.n != null ? L.n : i + 1);
      L.land = L.numStr != null ? L.T + (L.final ? 2.4 : LV.land) : null;
      const bossNear = L.final && bosses.some(b => b.t >= L.T - 0.5 && b.t <= L.T + 6);
      L.hasTitle = !!L.rank && !bossNear;
      L.ti = L.T + (L.final ? 2.35 : LV.titleIn);
      L.tf = Math.max(L.ti + 0.8, Math.min(L.ti + 0.32 + LV.titleHold, L.next - 0.55));
      L.tl = L.tf + LV.titleFly;
      L.cardEnd = L.T + (L.final ? 2.85 : LV.land);
    });
    P.levels = lv;
    // stats: per segment, the times it switches on / off
    const changes = [];
    lv.forEach(L => { if (L.stats) changes.push({ t: (L.land != null ? L.land : L.T + 0.6) + 0.12, vals: L.stats }); });
    by('stats').forEach(e => changes.push({ t: e.t, vals: e.values || e.stats || {} }));
    changes.sort((a, b) => a.t - b.t);
    P.seg = {}; P.arrows = {}; P.flashes = [];
    P.stats.forEach(s => {
      P.seg[s.id] = Array.from({ length: s.max }, () => []);
      P.arrows[s.id] = [];
      let cur = 0;
      for (const c of changes) {
        if (c.vals[s.id] == null) continue;
        const v = Math.max(0, Math.min(s.max, Math.round(+c.vals[s.id])));
        if (v > cur) { for (let k = cur; k < v; k++) P.seg[s.id][k].push([c.t + (k - cur) * 0.085, 1]); P.arrows[s.id].push([c.t, 1]); }
        else if (v < cur) { for (let k = cur - 1; k >= v; k--) P.seg[s.id][k].push([c.t + (cur - 1 - k) * 0.06, 0]); P.arrows[s.id].push([c.t, -1]); }
        if (s.id === P.dangerId && v >= s.max && cur < s.max) P.flashes.push({ id: s.id, a: c.t + (v - cur) * 0.085, b: c.t + (v - cur) * 0.085 + 2.2 });
        cur = v;
      }
    });
    by('danger').forEach(e => P.flashes.push({ id: e.stat || P.dangerId, a: e.t, b: e.t_end != null ? e.t_end : e.t + 2.4 }));
    // hotbar: arrivals per slot (items, and toasts that put the item in a slot)
    const arr = [];
    by('item').forEach(e => arr.push({ t: e.t, slot: num(e.slot), icon: e.icon || e.name, name: String(e.name || '').toUpperCase() }));
    P.toasts = by('toast').map(e => {
      const o = { t: e.t, end: e.t_end != null ? e.t_end : e.t + 3.2, name: String(e.name || '').toUpperCase(), icon: e.icon || e.name, label: e.label };
      if (e.slot !== false) arr.push({ t: e.t + 0.3, slot: num(e.slot), icon: o.icon, name: o.name, fromToast: true });
      return o;
    });
    arr.sort((a, b) => a.t - b.t);
    const filled = new Array(P.nSlots).fill(false);
    P.slots = Array.from({ length: P.nSlots }, () => []);
    P.arrivals = [];
    for (const a of arr) {
      let s = a.slot;
      if (s == null || s < 0 || s >= P.nSlots) { s = filled.indexOf(false); if (s < 0) s = P.nSlots - 1; }
      filled[s] = true;
      P.slots[s].push(a); a.s = s; P.arrivals.push(a);
    }
    // quests
    const done = {};
    by('quest_done').forEach(e => { if (e.id != null && done[e.id] == null) done[e.id] = e.t; });
    P.quests = by('quest').map(e => {
      const d = e.id != null ? done[e.id] : undefined;
      const tEnd = e.t_end != null ? e.t_end : (d != null ? d : e.t + 6);
      const o = {
        id: e.id, text: String(e.text || '').toUpperCase(), tin: e.t, tEnd, done: d != null ? d : null,
        count: Array.isArray(e.count) ? [+e.count[0] || 0, +e.count[1] || 0] : (num(e.count) != null ? [0, +e.count] : null),
        timer: !!e.timer
      };
      o.tout = o.done != null ? o.done + 1.35 : tEnd;
      o.progEnd = o.done != null ? Math.min(tEnd, o.done) : tEnd;
      return o;
    });
    P.unlocks = by('unlock').map(e => ({ t: e.t, end: e.t_end != null ? e.t_end : e.t + 2.6, text: String(e.text || e.name || '').toUpperCase(), locked: !!e.locked, icon: e.icon, label: e.label }));
    P.bosses = bosses.map(e => {
      const c = e.counter || null;
      return {
        t: e.t, end: e.t_end != null ? e.t_end : e.t + 4, name: String(e.name || '').toUpperCase(),
        counter: c ? { from: +c.from || 0, to: +c.to || 0, unit: String(c.unit || '').toUpperCase(), tEnd: c.t_end != null ? +c.t_end : e.t + 2.5 } : null,
        drain: Array.isArray(e.drain) ? [+e.drain[0], +e.drain[1]] : null, drainTo: num(e.drain_to) != null ? +e.drain_to : 0
      };
    });
    P.achievements = by('achievement').map(e => ({ t: e.t, end: e.t_end != null ? e.t_end : e.t + 3.2, text: String(e.text || '').toUpperCase(), sub: String(e.sub || ''), icon: e.icon || 'trophy', label: e.label }));
    P.banners = by('banner').map(e => ({ t: e.t, end: e.t_end != null ? e.t_end : e.t + 3.4, text: String(e.text || '').toUpperCase(), sub: String(e.sub || '').toUpperCase(), label: e.label != null ? String(e.label).toUpperCase() : String(P.ui.new_area || '').toUpperCase() }));
    P.xp = by('xp').map(e => ({ t: e.t, v: clamp01(+(e.value != null ? e.value : e.fill != null ? e.fill : e.to != null ? e.to : 0)) }));
    CACHE.set(game, P);
    return P;
  }

  // ── state at t (quantised) ────────────────────────────────────────────────────────────────────────────
  const BADGE = { x: 118, y: 113, r: 56 };
  const NUM_BADGE = { cx: 118, cy: 121, px: 70 };
  const CARD = { cx: 960, numCy: 486, numPx: 300, wordY: 350, wordPx: 82, burstY: 470 };
  const RANK = { x: 219, y: 100, px: 43 };
  const TITLE = { cx: 960, y: 927, px: 80, maxW: 1150 };
  const PANEL = { x: 1449, y: 35, w: 429 };
  const HOT = { y: 963, s: 75, pitch: 88 };

  function hudVis(P, t) {
    let a = 1, k = 1;
    for (const h of P.hides) {
      if (t >= h.a && t < h.b) { const f = h.a <= 0.001 ? 0 : 1 - smooth(seg(t, h.a, h.a + 0.25)); a = Math.min(a, f); k = Math.min(k, f); }
      else if (t >= h.b && t < h.b + 0.5) { a = Math.min(a, smooth(seg(t, h.b, h.b + 0.3))); k = Math.min(k, outCubic(seg(t, h.b, h.b + 0.5))); }
    }
    return { a: r3(a), dl: r2(-60 * (1 - k)), dr: r2(60 * (1 - k)), db: r2(40 * (1 - k)) };
  }
  function curLevelIdx(P, t) {
    let idx = -1;
    for (let i = 0; i < P.levels.length; i++) if (P.levels[i].T <= t) idx = i;
    return idx;
  }

  function state(game, t, W, H) {
    const P = prep(game);
    W = W || BW; H = H || BH;
    const sc = Math.min(W / BW, H / BH);
    const px = 1 / sc;                                           // one output pixel in layout units
    const S = { W, H };
    S.hud = hudVis(P, t);
    const li = curLevelIdx(P, t);
    // badge number + landing pulse
    let bn = null, bk = 1;
    for (const L of P.levels) if (L.land != null && L.land <= t) { bn = L.numStr; bk = seg(t, L.land, L.land + 0.45); }
    S.badge = { n: bn, k: r2(bk) };
    // rank (top-left) — the old one fades as the new title arrives
    let rk = '', rkA = 1, rkK = 1;
    for (const L of P.levels) {
      if (!L.hasTitle) continue;
      if (L.tl <= t) { rk = L.rank; rkK = seg(t, L.tl, L.tl + 0.4); rkA = 1; }
      else if (t >= L.tf) rkA = 1 - smooth(seg(t, L.tf + 0.12, L.tf + 0.34));
    }
    S.rank = { s: rk, a: r2(rkA), k: r2(rkK) };
    // XP
    let xp = 0, xpGlow = 0;
    if (li >= 0) {
      const L = P.levels[li];
      const start = L.land != null && !L.final ? L.land : L.T, end = Math.min(L.next, P.dur || L.next);
      if (L.final) { xp = 1; xpGlow = 0.6; }
      else if (t < start) { xp = li > 0 ? 1 : 0; xpGlow = li > 0 ? 1 - seg(t, start - 0.2, start) : 0; }
      else {
        const keys = P.xp.filter(x => x.t >= start - 0.01 && x.t < end);   // "xp" events: keyframes, eased in 0.6 s
        if (keys.length) {
          const prev = keys.filter(kf => kf.t <= t);
          if (prev.length) {
            const last = prev[prev.length - 1], before = prev.length > 1 ? prev[prev.length - 2].v : 0;
            xp = lerp(before, last.v, smooth(seg(t, last.t, last.t + 0.6)));
          } else xp = 0;
        } else xp = isFinite(end) ? seg(t, start, end) : 0;
      }
    }
    const xpW = 340 / px;                                        // the bar in output pixels
    S.xp = { f: Math.round(xp * xpW) / xpW, g: r2(xpGlow) };
    // stats
    S.stats = P.stats.map(st => {
      const segs = P.seg[st.id].map(list => {
        let on = 0, at = -1e9;
        for (const [tt, v] of list) if (tt <= t) { on = v; at = tt; }
        const ph = t - at;
        if (on && ph < 0.32) { const k = ph / 0.32; return [1, r2(1 - k), r2(0.35 * (1 - outCubic(k)))]; }
        if (!on && ph < 0.28) { return [r2(1 - ph / 0.28), 0, 0]; }
        return [on, 0, 0];
      });
      let arrow = 0, arrowA = 0;
      for (const [tt, d] of P.arrows[st.id]) if (tt <= t && t < tt + 3.2) { arrow = d; arrowA = smooth(seg(t, tt, tt + 0.25)) * (1 - smooth(seg(t, tt + 2.7, tt + 3.2))); }
      let fl = 0;
      for (const f of P.flashes) if (f.id === st.id && t >= f.a && t < f.b) {
        const env = smooth(seg(t, f.a, f.a + 0.15)) * (1 - smooth(seg(t, f.b - 0.3, f.b)));
        fl = Math.max(fl, env * (0.55 + 0.45 * Math.cos(2 * Math.PI * 2.4 * (t - f.a))));
      }
      return { segs, ar: arrow, arA: r2(arrowA), fl: r2(fl) };
    });
    // quests — stacked under the stats panel; a leaving card's gap closes after it has slid out
    const panelH = P.stats.length * 46 + 18;
    const qTop = PANEL.y + panelH + 14;
    let stack = 0;
    S.quests = [];
    for (const qd of P.quests) {
      if (t < qd.tin || t >= qd.tout + 0.65) continue;
      const kin = outCubic(seg(t, qd.tin, qd.tin + 0.42)), kout = inCubic(seg(t, qd.tout, qd.tout + 0.35));
      const y = qTop + stack * 74;
      const w = 1 - smooth(seg(t, qd.tout + 0.25, qd.tout + 0.6));
      stack += w;
      if (t >= qd.tout + 0.35) continue;
      const o = { tx: qd.text, x: r2(480 * (1 - kin) + 480 * kout), y: r2(y), a: r2(smooth(seg(t, qd.tin, qd.tin + 0.25)) * (1 - kout * 0.6)) };
      const t0 = qd.tin + 0.35;
      if (qd.count) {
        const k = seg(t, t0, Math.max(t0 + 0.1, qd.progEnd));
        const v = Math.floor(lerp(qd.count[0], qd.count[1], k) + 1e-6);
        o.c = [v, qd.count[1]];
        o.cb = 0;                                               // tick bump on each new value
        const span = qd.progEnd - t0, n = qd.count[1] - qd.count[0];
        if (n > 0 && span > 0 && k > 0 && k < 1) { const tv = t0 + span * ((v - qd.count[0]) / n); o.cb = r2(1 - seg(t, tv, tv + 0.18)); }
      } else if (qd.timer) o.pie = q(seg(t, t0, qd.progEnd), 1 / 180);
      else o.bar = Math.round(seg(t, t0, qd.progEnd) * 337 / px) / (337 / px);
      if (qd.done != null && t >= qd.done) { const k = seg(t, qd.done, qd.done + 0.35); o.d = r2(k); o.dg = r2(1 - seg(t, qd.done, qd.done + 0.8)); }
      S.quests.push(o);
    }
    // hotbar
    let selSlot = -1, selA = 0;
    for (const a of P.arrivals) if (a.t <= t && t < a.t + 3.9) { selSlot = a.s; selA = smooth(seg(t, a.t, a.t + 0.2)) * (1 - smooth(seg(t, a.t + 3.5, a.t + 3.9))); }
    const titleOn = P.levels.some(L => L.hasTitle && t >= L.ti - 0.2 && t < L.tf + 0.2) || P.unlocks.some(u => t >= u.t - 0.2 && t < u.end + 0.3);
    S.slots = P.slots.map((list, s) => {
      let cur = null;
      for (const a of list) if (a.t <= t) cur = a;
      if (!cur) return { ic: '', sel: s === selSlot ? r2(selA) : 0 };
      const k = seg(t, cur.t, cur.t + 0.34);
      const o = { ic: cur.icon, sel: s === selSlot ? r2(selA) : 0 };
      if (k < 1) { o.pop = r2(outBack(k, 2.4)); o.fl = r2(Math.pow(1 - seg(t, cur.t, cur.t + 0.4), 1.5)); }
      if (!titleOn && !cur.fromToast && cur.name && t < cur.t + 1.9) {
        o.lab = cur.name; o.labA = r2(smooth(seg(t, cur.t + 0.05, cur.t + 0.3)) * (1 - smooth(seg(t, cur.t + 1.5, cur.t + 1.9))));
        if (o.labA <= 0) { delete o.lab; delete o.labA; }
      }
      return o;
    });
    // level-up card / final card
    S.card = null;
    for (const L of P.levels) {
      if (t < L.T || t >= L.cardEnd) continue;
      if (L.final) {
        const kin = seg(t, L.T, L.T + 0.35), kout = seg(t, L.T + 2.4, L.T + 2.85);
        S.card = {
          fin: 1, a: r3(smooth(kin) * (1 - smooth(kout))), s: r3(lerp(1.22, 1, outCubic(kin)) * lerp(1, 1.06, kout)),
          b: r3(smooth(seg(t, L.T, L.T + 0.3)) * (1 - smooth(kout))), bs: r3(0.7 + 0.3 * outCubic(seg(t, L.T, L.T + 0.5))), rot: r3((t - L.T) * 0.2)
        };
      } else {
        const k1 = seg(t, L.T, L.T + LV.pop), kf = smooth(seg(t, L.T + LV.flyA, L.T + LV.land));
        const s0 = 0.35 + 0.65 * outBack(k1, 2.2);
        S.card = {
          n: L.numStr, a: r3(smooth(seg(t, L.T, L.T + 0.12))), s: r3(s0),
          cx: r2(lerp(CARD.cx, NUM_BADGE.cx, kf)), cy: r2(lerp(CARD.numCy, NUM_BADGE.cy, kf)),
          np: r2(CARD.numPx * s0 * lerp(1, NUM_BADGE.px / CARD.numPx, kf)),
          wa: r3(smooth(seg(t, L.T, L.T + 0.12)) * (1 - seg(t, L.T + LV.flyA, L.T + LV.flyA + 0.12))),
          b: r3(smooth(seg(t, L.T, L.T + 0.25)) * (1 - smooth(seg(t, L.T + 1.22, L.T + 1.45)))),
          bs: r3(0.6 + 0.4 * outCubic(seg(t, L.T, L.T + 0.45))), rot: r3((t - L.T) * 0.22)
        };
      }
    }
    // rank title (bottom → top-left)
    S.title = null;
    for (const L of P.levels) {
      if (!L.hasTitle || t < L.ti || t >= L.tl) continue;
      const kin = seg(t, L.ti, L.ti + 0.32), kf = smooth(seg(t, L.tf, L.tl));
      const big = fitPx(L.rank, SERIF, 700, TITLE.px, 0.06, TITLE.maxW, 30);
      const small = fitPx(L.rank, SERIF, 700, RANK.px, 0.05, 1000, 22);
      const trackEm = lerp(0.28, 0.06, outCubic(kin));
      const size = lerp(big, small, kf);
      const wBig = textW(L.rank, SERIF, 700, big, big * 0.06);
      const xCentre = TITLE.cx - textW(L.rank, SERIF, 700, big, big * trackEm) / 2;
      S.title = {
        s: L.rank, px: r2(size), tr: r3(lerp(trackEm, 0.05, kf)),
        x: r2(kf > 0 ? lerp(TITLE.cx - wBig / 2, RANK.x, kf) : xCentre), y: r2(lerp(TITLE.y, RANK.y, kf) - Math.sin(Math.PI * kf) * 26),
        a: r3(smooth(kin)), w: r3(kf), rule: r3(outCubic(seg(t, L.ti + 0.08, L.ti + 0.5)) * (1 - smooth(seg(t, L.tf, L.tf + 0.16)))), ruleW: r2(textW(L.rank, SERIF, 700, big, big * 0.06))
      };
    }
    // toast
    S.toast = null;
    for (const o of P.toasts) {
      if (t < o.t || t >= o.end + 0.32) continue;
      const kin = outCubic(seg(t, o.t, o.t + 0.36)), kout = inCubic(seg(t, o.end, o.end + 0.32));
      S.toast = { nm: o.name, ic: o.icon, lb: o.label != null ? String(o.label).toUpperCase() : String(P.ui.new_item).toUpperCase(), dx: r2(500 * (1 - kin) + 500 * kout), sh: r3(seg(t, o.t + 0.3, o.t + 0.95)) };
    }
    // unlock plate
    S.unlock = null;
    for (const u of P.unlocks) {
      if (t < u.t || t >= u.end + 0.3) continue;
      const kin = seg(t, u.t, u.t + 0.3), kout = seg(t, u.end, u.end + 0.3);
      const shake = t >= u.t + 0.32 && t < u.t + 0.66 ? Math.sin((t - u.t - 0.32) * 2 * Math.PI * 9) * (1 - seg(t, u.t + 0.32, u.t + 0.66)) : 0;
      const open = u.locked ? 0 : outBack(seg(t, u.t + 0.7, u.t + 0.92), 2);
      S.unlock = {
        tx: u.text, lk: u.locked ? 1 : 0, ic: u.icon || '', a: r3(smooth(kin) * (1 - smooth(kout))), s: r3(lerp(0.86, 1, outBack(kin, 1.6)) * lerp(1, 0.97, kout)),
        sk: r3(shake), op: r3(open), fl: r3(u.locked ? 0 : (t >= u.t + 0.7 ? 1 - seg(t, u.t + 0.7, u.t + 1.25) : 0)),
        lb: u.label != null ? String(u.label).toUpperCase() : String(u.locked ? P.ui.locked : P.ui.unlocked).toUpperCase(), la: r3(smooth(seg(t, u.t + (u.locked ? 0.3 : 0.75), u.t + (u.locked ? 0.55 : 1.0)))),
        sh: r3(seg(t, u.t + 0.75, u.t + 1.45))
      };
    }
    // boss bar
    S.boss = null;
    for (const b of P.bosses) {
      if (t < b.t || t >= b.end + 0.4) continue;
      const kout = seg(t, b.end, b.end + 0.4);
      const fillK = outCubic(seg(t, b.t + 0.25, b.t + 0.85));
      let frac = 1, trail = 1;
      if (b.drain) {
        const f = tt => 1 - (1 - b.drainTo) * seg(tt, b.drain[0], b.drain[1]);
        frac = f(t); trail = f(t - 0.35);
      }
      const bw = 568 / px;
      const o = {
        nm: b.name, a: r3(smooth(seg(t, b.t, b.t + 0.3)) * (1 - smooth(kout))), tr: r3(lerp(0.55, 0.3, outCubic(seg(t, b.t, b.t + 0.45)))),
        dy: r2(-12 * kout), f: Math.round(frac * fillK * bw) / bw, tf: Math.round(trail * fillK * bw) / bw, bf: r3(1 - seg(t, b.t + 0.85, b.t + 1.2))
      };
      if (b.counter) {
        const c = b.counter, k = outQuad(seg(t, b.t + 0.6, Math.max(b.t + 0.7, c.tEnd)));
        o.c = Math.floor(lerp(c.from, c.to, k) + 1e-6); o.cu = c.unit; o.cmax = Math.max(Math.abs(c.from), Math.abs(c.to));
        o.ca = r3(smooth(seg(t, b.t + 0.4, b.t + 0.75))); o.cy = r2(-14 * (1 - outCubic(seg(t, b.t + 0.4, b.t + 0.8))));
        o.cd = r3(t >= c.tEnd ? 1 - seg(t, c.tEnd, c.tEnd + 0.4) : 0);
      }
      S.boss = o;
    }
    // achievement
    S.ach = null;
    for (const e of P.achievements) {
      if (t < e.t || t >= e.end + 0.4) continue;
      const kin = seg(t, e.t, e.t + 0.5), kout = inCubic(seg(t, e.end, e.end + 0.4));
      S.ach = {
        tx: e.text, sb: e.sub, ic: e.icon, lb: e.label != null ? String(e.label).toUpperCase() : String(P.ui.achievement).toUpperCase(),
        dy: r2(-190 * (1 - outBack(kin, 1.3)) - 190 * kout + (S.boss ? 240 : 0)), a: r3(smooth(seg(t, e.t, e.t + 0.2))),
        m: r3(outBack(seg(t, e.t + 0.22, e.t + 0.55), 2.4)), sh: r3(seg(t, e.t + 0.45, e.t + 1.2)), gl: r3(1 - seg(t, e.t + 0.4, e.t + 1.6))
      };
    }
    // banner
    S.banner = null;
    for (const e of P.banners) {
      if (t < e.t || t >= e.end + 0.5) continue;
      const kin = seg(t, e.t, e.t + 0.6), kout = seg(t, e.end, e.end + 0.5);
      S.banner = {
        tx: e.text, sb: e.sub, lb: e.label, a: r3(smooth(seg(t, e.t, e.t + 0.4)) * (1 - smooth(kout))), tr: r3(lerp(0.3, 0.1, outCubic(kin))),
        rl: r3(outCubic(seg(t, e.t + 0.1, e.t + 0.7))), sa: r3(smooth(seg(t, e.t + 0.35, e.t + 0.75)) * (1 - smooth(kout)))
      };
    }
    S.ui = { level: String(P.ui.level).toUpperCase(), xp: String(P.ui.xp).toUpperCase(), final: String(P.ui.final).toUpperCase(), done: String(P.ui.quest_done).toUpperCase() };
    S.sep = P.sep;
    return S;
  }

  // ── painting ──────────────────────────────────────────────────────────────────────────────────────────
  function panel(ctx, x, y, w, h, r, o) {
    o = o || {};
    ctx.save();
    shadow(ctx, 'rgba(5,8,16,0.38)', 14, 0, 4);
    rrect(ctx, x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.top || 'rgba(38,44,64,0.88)'); g.addColorStop(1, o.bot || 'rgba(24,28,43,0.88)');
    ctx.fillStyle = g; ctx.fill();
    noShadow(ctx);
    if (o.glow) { shadow(ctx, o.glow, o.glowB || 16, 0, 0); }
    ctx.lineWidth = o.bw || 2; ctx.strokeStyle = o.border || GOLD; ctx.stroke();
    noShadow(ctx);
    rrect(ctx, x + 2.5, y + 2.5, w - 5, h - 5, Math.max(1, r - 2));
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
    ctx.restore();
  }
  function shine(ctx, x, y, w, h, r, k, alpha) {
    if (k <= 0 || k >= 1) return;
    ctx.save();
    rrect(ctx, x, y, w, h, r); ctx.clip();
    const cx = lerp(x - 160, x + w + 160, k);
    const g = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
    g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.5, `rgba(255,240,200,${alpha || 0.22})`); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - 60, y - 10); ctx.lineTo(cx + 120, y - 10); ctx.lineTo(cx + 60, y + h + 10); ctx.lineTo(cx - 120, y + h + 10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function sunburst(ctx, cx, cy, a, sc, rot, o) {
    if (a <= 0) return;
    o = o || {};
    const n = o.n || 22, R0 = (o.R0 || 70) * sc, R1 = (o.R || 640) * sc;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(cx, cy); ctx.rotate(rot);
    const g = ctx.createRadialGradient(0, 0, R0, 0, 0, R1);
    const c1 = o.c1 || '255,214,110', c2 = o.c2 || c1;
    g.addColorStop(0, `rgba(${c1},${o.a0 || 0.6})`); g.addColorStop(0.3, `rgba(${c2},${o.a1 || 0.3})`); g.addColorStop(0.85, `rgba(${c2},0.04)`); g.addColorStop(1, `rgba(${c2},0)`);
    ctx.fillStyle = g;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2, hw = (o.hw || 0.075) * (i % 2 ? 0.7 : 1);
      ctx.beginPath();
      ctx.moveTo(R0 * Math.cos(th - hw * 0.4), R0 * Math.sin(th - hw * 0.4));
      ctx.lineTo(R1 * Math.cos(th - hw), R1 * Math.sin(th - hw));
      ctx.lineTo(R1 * Math.cos(th + hw), R1 * Math.sin(th + hw));
      ctx.lineTo(R0 * Math.cos(th + hw * 0.4), R0 * Math.sin(th + hw * 0.4));
      ctx.closePath(); ctx.fill();
    }
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, (o.glowR || 230) * sc);
    gl.addColorStop(0, `rgba(${o.gc || '255,226,150'},0.75)`); gl.addColorStop(0.5, `rgba(${o.gc || '255,226,150'},0.28)`); gl.addColorStop(1, `rgba(${o.gc || '255,226,150'},0)`);
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, (o.glowR || 230) * sc, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function wreath(ctx, cx, cy) {
    // two laurel branches from the bottom up round the disc: almond leaves in an outer and an inner row, tips pointing
    // up the branch and tilted outwards, on a thin gold stem
    const R = 63, oy = cy + 4;
    const leaf = (x, y, ang, L, W, light) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.42, -W, L, 0); ctx.quadraticCurveTo(L * 0.42, W, 0, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, -W, 0, W);
      g.addColorStop(0, light ? '#FFE48A' : '#F6CB55'); g.addColorStop(1, light ? '#E2A63A' : '#C98A1C');
      shadow(ctx, 'rgba(10,12,20,0.35)', 3, 0, 1.5);
      ctx.fillStyle = g; ctx.fill(); noShadow(ctx);
      ctx.lineWidth = 1.3; ctx.strokeStyle = '#7E520E'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L * 0.12, 0); ctx.lineTo(L * 0.8, 0); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(126,82,14,0.55)'; ctx.stroke();
      ctx.restore();
    };
    for (const side of [-1, 1]) {
      // the stem
      ctx.beginPath();
      const a0 = Math.PI / 2 + side * 0.16, a1 = Math.PI / 2 + side * 2.5;
      ctx.arc(cx, oy, R - 2, a0, a1, side < 0 ? false : true);
      ctx.lineWidth = 3; ctx.strokeStyle = '#B07A18'; ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 2 + side * (0.24 + i * 0.3);
        const px = cx + (R - 2) * Math.cos(a), py = oy + (R - 2) * Math.sin(a);
        const tx = side < 0 ? -Math.sin(a) : Math.sin(a), ty = side < 0 ? Math.cos(a) : -Math.cos(a);   // up the branch
        const nx = Math.cos(a), ny = Math.sin(a);                                                         // outwards
        const L = 25 - i * 0.9, W = 7.4 - i * 0.25;
        if (i < 7) { const th = -0.5; leaf(px, py, Math.atan2(ty * Math.cos(th) + ny * Math.sin(th), tx * Math.cos(th) + nx * Math.sin(th)), L * 0.8, W * 0.85, false); }
        const th = 0.62;
        leaf(px, py, Math.atan2(ty * Math.cos(th) + ny * Math.sin(th), tx * Math.cos(th) + nx * Math.sin(th)), L, W, true);
      }
    }
  }
  function paintBadge(ctx, S) {
    const { x, y, r } = BADGE;
    wreath(ctx, x, y);
    ctx.save();
    shadow(ctx, 'rgba(5,8,16,0.45)', 10, 0, 3);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x, y - 18, 6, x, y, r);
    g.addColorStop(0, '#2C3453'); g.addColorStop(1, '#151A2B');
    ctx.fillStyle = g; ctx.fill(); noShadow(ctx);
    ctx.lineWidth = 3.4; ctx.strokeStyle = '#E2B451'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r - 8, 0, Math.PI * 2); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(233,196,106,0.55)'; ctx.stroke();
    drawText(ctx, S.ui.level, x, 86, { fam: SANS, wt: 800, px: fitPx(S.ui.level, SANS, 800, 14, 0.2, 70, 9), track: 2.8, fill: '#EBC66C', align: 'center' });
    if (S.badge.n != null) {
      const k = S.badge.k, s = 1 + 0.35 * (1 - outCubic(k));
      const npx = fitPx(S.badge.n, SANS, 900, NUM_BADGE.px, 0, 78, 30);
      ctx.save(); ctx.translate(NUM_BADGE.cx, NUM_BADGE.cy); ctx.scale(s, s);
      shadow(ctx, 'rgba(0,0,0,0.4)', 4, 0, 2);
      drawText(ctx, S.badge.n, 0, npx * 0.35, { fam: SANS, wt: 900, px: npx, fill: '#FFFFFF', align: 'center' });
      ctx.restore();
      if (k < 1) {
        ctx.beginPath(); ctx.arc(x, y, r + 34 * outCubic(k), 0, Math.PI * 2);
        ctx.lineWidth = 6 * (1 - k) + 1; ctx.strokeStyle = `rgba(255,236,170,${0.9 * (1 - k)})`; ctx.stroke();
        const gl = ctx.createRadialGradient(x, y, 0, x, y, r + 30);
        gl.addColorStop(0, `rgba(255,240,190,${0.55 * (1 - k)})`); gl.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r + 30, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  function paintRankXP(ctx, S) {
    if (S.rank.s && S.rank.a > 0) {
      const px = fitPx(S.rank.s, SERIF, 700, RANK.px, 0.05, 1000, 22);
      ctx.save(); ctx.globalAlpha *= S.rank.a;
      shadow(ctx, 'rgba(8,12,22,0.55)', 7, 0, 2);
      drawText(ctx, S.rank.s, RANK.x, RANK.y, { fam: SERIF, wt: 700, px, track: px * 0.05, fill: '#F8F4EA' });
      noShadow(ctx);
      if (S.rank.k < 1) {
        ctx.globalAlpha *= 1 - S.rank.k;
        shadow(ctx, 'rgba(255,220,130,0.9)', 18, 0, 0);
        drawText(ctx, S.rank.s, RANK.x, RANK.y, { fam: SERIF, wt: 700, px, track: px * 0.05, fill: 'rgba(255,236,180,0.8)' });
      }
      ctx.restore();
    }
    // XP
    drawText(ctx, S.ui.xp, 215, 145, { fam: SANS, wt: 800, px: 13, track: 2, fill: '#E9B44C' });
    const x0 = 250, y0 = 134, w = 340, h = 12;
    ctx.save();
    shadow(ctx, 'rgba(5,8,16,0.4)', 6, 0, 2);
    rrect(ctx, x0, y0, w, h, 6); ctx.fillStyle = 'rgba(26,31,47,0.9)'; ctx.fill(); noShadow(ctx);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
    const fw = w * S.xp.f;
    if (fw > 0.5) {
      ctx.save(); rrect(ctx, x0, y0, w, h, 6); ctx.clip();
      const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, '#FFE08A'); g.addColorStop(0.5, '#F2BE4E'); g.addColorStop(1, '#D3952C');
      rrect(ctx, x0, y0, Math.max(fw, 6), h, 6); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0 + 3, y0 + 2, Math.max(0, fw - 6), 2);
      ctx.restore();
      if (S.xp.f < 1) {                                          // a bright tip on the growing edge
        const gl = ctx.createRadialGradient(x0 + fw, y0 + h / 2, 0, x0 + fw, y0 + h / 2, 14);
        gl.addColorStop(0, 'rgba(255,246,210,0.7)'); gl.addColorStop(1, 'rgba(255,246,210,0)');
        ctx.fillStyle = gl; ctx.fillRect(x0 + fw - 14, y0 - 8, 28, h + 16);
      }
      if (S.xp.g > 0) {
        shadow(ctx, `rgba(255,214,110,${0.9 * S.xp.g})`, 16, 0, 0);
        rrect(ctx, x0, y0, w, h, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,236,170,${S.xp.g})`; ctx.stroke(); noShadow(ctx);
      }
    }
    ctx.restore();
  }
  function lighten(hex, k) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    const v = parseInt(m[1], 16); let r = v >> 16, g = (v >> 8) & 255, b = v & 255;
    r = Math.round(r + (255 - r) * k); g = Math.round(g + (255 - g) * k); b = Math.round(b + (255 - b) * k);
    return `rgb(${r},${g},${b})`;
  }
  function paintStats(ctx, S, P) {
    const n = P.stats.length;
    if (!n) return;
    const h = n * 46 + 18;
    panel(ctx, PANEL.x, PANEL.y, PANEL.w, h, 9);
    P.stats.forEach((st, i) => {
      const cy = PANEL.y + 32 + i * 46, s = S.stats[i];
      if (s.fl > 0) {
        ctx.save();
        rrect(ctx, PANEL.x + 8, cy - 19, PANEL.w - 16, 38, 7);
        ctx.fillStyle = `rgba(224,56,58,${0.42 * s.fl})`; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,110,100,${0.85 * s.fl})`; ctx.stroke();
        ctx.restore();
      }
      const isz = 25 * (1 + 0.18 * s.fl);
      drawIcon(ctx, st.icon, PANEL.x + 30, cy, isz);
      const lpx = fitPx(st.label, SANS, 800, 16, 0.16, 172, 11);
      drawText(ctx, st.label, PANEL.x + 54, cy + lpx * 0.35, { fam: SANS, wt: 800, px: lpx, track: lpx * 0.16, fill: '#F1F2F6' });
      const segW = 14, gap = 4, nS = st.max, totW = nS * segW + (nS - 1) * gap, x0 = 1860 - totW;
      const top = lighten(st.color, 0.3);
      s.segs.forEach((sg, k) => {
        const [f, flash, pop] = sg;
        const x = x0 + k * (segW + gap), y = cy - 8.5;
        ctx.save();
        rrect(ctx, x, y, segW, 17, 2.5); ctx.fillStyle = 'rgba(18,22,34,0.95)'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
        if (f > 0) {
          const sc = 1 + pop;
          ctx.translate(x + segW / 2, cy); ctx.scale(sc, sc); ctx.translate(-(x + segW / 2), -cy);
          ctx.globalAlpha *= f;
          if (s.fl > 0) shadow(ctx, `rgba(255,70,60,${s.fl})`, 10, 0, 0);
          const g = ctx.createLinearGradient(0, y, 0, y + 17); g.addColorStop(0, top); g.addColorStop(1, st.color);
          rrect(ctx, x, y, segW, 17, 2.5); ctx.fillStyle = g; ctx.fill(); noShadow(ctx);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 2, y + 2, segW - 4, 2);
          if (flash > 0) { rrect(ctx, x, y, segW, 17, 2.5); ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fill(); }
          if (s.fl > 0) { rrect(ctx, x, y, segW, 17, 2.5); ctx.fillStyle = `rgba(255,200,190,${0.35 * s.fl})`; ctx.fill(); }
        }
        ctx.restore();
      });
      if (s.ar && s.arA > 0) {
        const ax = x0 - 14, up = s.ar > 0;
        ctx.save(); ctx.globalAlpha *= s.arA;
        ctx.beginPath();
        if (up) { ctx.moveTo(ax, cy - 7); ctx.lineTo(ax + 7.5, cy + 6); ctx.lineTo(ax - 7.5, cy + 6); }
        else { ctx.moveTo(ax, cy + 7); ctx.lineTo(ax + 7.5, cy - 6); ctx.lineTo(ax - 7.5, cy - 6); }
        ctx.closePath();
        shadow(ctx, 'rgba(0,0,0,0.4)', 3, 0, 1);
        ctx.fillStyle = up ? '#55D46A' : '#F0544B'; ctx.fill();
        ctx.restore();
      }
    });
  }
  function checkMark(ctx, cx, cy, s, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-3, 7.5); ctx.lineTo(11, -8);
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(10,30,14,0.55)'; ctx.stroke();
    ctx.lineWidth = 4.2; ctx.strokeStyle = col || '#6BE07C'; ctx.stroke();
    ctx.restore();
  }
  function paintQuests(ctx, S) {
    for (const o of S.quests) {
      const x = PANEL.x + o.x, y = o.y, w = PANEL.w, h = 61, cy = y + h / 2;
      ctx.save(); ctx.globalAlpha *= o.a;
      const dg = o.dg || 0;
      panel(ctx, x, y, w, h, 9, dg > 0 ? { border: `rgb(${Math.round(lerp(201, 110, dg))},${Math.round(lerp(160, 220, dg))},${Math.round(lerp(82, 120, dg))})`, glow: `rgba(110,220,120,${0.8 * dg})` } : null);
      let right = 0;
      if (o.c) right = 20 + textW('/' + fmtInt(o.c[1], S.sep), SANS, 800, 21, 0) + 7 + textW(fmtInt(o.c[1], S.sep), SANS, 800, 21, 0) + 34 + 6;
      else if (o.pie != null || o.d != null) right = 44;
      const hasBar = o.bar != null;
      const maxW = w - 40 - right;
      const qpx = fitPx(o.tx, SANS, 800, 19, 0.06, maxW, 12);
      const ty = hasBar ? cy + 2 : cy + qpx * 0.35;
      drawText(ctx, o.tx, x + 20, ty, { fam: SANS, wt: 800, px: qpx, track: qpx * 0.06, fill: '#F4F5F8' });
      const done = o.d != null;
      if (o.c) {
        const tot = '/' + fmtInt(o.c[1], S.sep), cur = fmtInt(done ? o.c[1] : o.c[0], S.sep);
        const rx = x + w - 20 - 34 * outCubic(clamp01(o.d || 0));     // a done counter steps left for the check
        const tw = drawText(ctx, tot, rx, cy + 7.5, { fam: SANS, wt: 800, px: 21, fill: done ? '#9BE8A6' : '#E2E4EC', align: 'right' });
        const bump = 1 + 0.22 * (o.cb || 0);
        ctx.save(); ctx.translate(rx - tw - 7, cy + 7.5); ctx.scale(bump, bump);
        drawText(ctx, cur, 0, 0, { fam: SANS, wt: 800, px: 21, fill: done ? '#6BE07C' : goldGrad(ctx, -15, 0), align: 'right' });
        ctx.restore();
      } else if (o.pie != null && !done) {
        const px0 = x + w - 32, r = 13;
        ctx.save();
        shadow(ctx, 'rgba(0,0,0,0.4)', 3, 0, 1);
        ctx.beginPath(); ctx.arc(px0, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#F7F7F4'; ctx.fill(); noShadow(ctx);
        if (o.pie > 0) { ctx.beginPath(); ctx.moveTo(px0, cy); ctx.arc(px0, cy, r - 1.5, -Math.PI / 2, -Math.PI / 2 + o.pie * Math.PI * 2); ctx.closePath(); ctx.fillStyle = '#E0383A'; ctx.fill(); }
        ctx.beginPath(); ctx.arc(px0, cy, r, 0, Math.PI * 2); ctx.lineWidth = 1.6; ctx.strokeStyle = '#1B1F2A'; ctx.stroke();
        const a = -Math.PI / 2 + o.pie * Math.PI * 2;
        ctx.lineCap = 'round'; ctx.strokeStyle = '#151820'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(px0, cy); ctx.lineTo(px0, cy - r + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px0, cy); ctx.lineTo(px0 + (r - 3) * Math.cos(a), cy + (r - 3) * Math.sin(a)); ctx.stroke();
        ctx.beginPath(); ctx.arc(px0, cy, 2, 0, Math.PI * 2); ctx.fillStyle = '#151820'; ctx.fill();
        ctx.restore();
      }
      if (hasBar) {
        const bx = x + 20, by = cy + 13, bw = 337;
        rrect(ctx, bx, by, bw, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fill();
        if (o.bar > 0) {
          rrect(ctx, bx, by, Math.max(5, bw * o.bar), 5, 2.5);
          ctx.fillStyle = done ? '#5FD372' : goldGrad(ctx, by, by + 5); ctx.fill();
        }
      }
      if (done) {
        const k = o.d, s = outBack(clamp01(k), 2.6);
        if (s > 0.01) checkMark(ctx, x + w - 30, cy, s * 1.15, '#6BE07C');
      }
      ctx.restore();
    }
  }
  function slotX(i, n) { const tot = n * HOT.s + (n - 1) * (HOT.pitch - HOT.s); return BW / 2 - tot / 2 + i * HOT.pitch; }
  function paintHotbar(ctx, S) {
    const n = S.slots.length;
    S.slots.forEach((o, i) => {
      const x = slotX(i, n), y = HOT.y, s = HOT.s;
      ctx.save();
      shadow(ctx, 'rgba(5,8,16,0.35)', 8, 0, 3);
      rrect(ctx, x, y, s, s, 9);
      const g = ctx.createLinearGradient(0, y, 0, y + s);
      g.addColorStop(0, o.sel > 0 ? `rgba(${Math.round(lerp(52, 78, o.sel))},${Math.round(lerp(60, 86, o.sel))},${Math.round(lerp(74, 104, o.sel))},0.66)` : 'rgba(52,60,74,0.6)');
      g.addColorStop(1, 'rgba(32,38,50,0.66)');
      ctx.fillStyle = g; ctx.fill(); noShadow(ctx);
      if (o.sel > 0) shadow(ctx, `rgba(255,214,120,${0.7 * o.sel})`, 14, 0, 0);
      ctx.lineWidth = 1.7 + 1.1 * o.sel;
      ctx.strokeStyle = o.sel > 0 ? `rgba(${Math.round(lerp(201, 248, o.sel))},${Math.round(lerp(160, 222, o.sel))},${Math.round(lerp(82, 150, o.sel))},1)` : 'rgba(201,160,82,0.95)';
      ctx.stroke(); noShadow(ctx);
      if (o.ic) {
        const sc = o.pop != null ? o.pop : 1;
        if (sc > 0.01) drawIcon(ctx, o.ic, x + s / 2, y + s / 2, 50 * sc);
      }
      if (o.fl > 0) {
        rrect(ctx, x, y, s, s, 9); ctx.fillStyle = `rgba(255,255,255,${0.85 * o.fl})`; ctx.fill();
        const e = 1 - o.fl;
        rrect(ctx, x - 14 * e, y - 14 * e, s + 28 * e, s + 28 * e, 9 + 10 * e);
        ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,236,170,${0.8 * o.fl})`; ctx.stroke();
      }
      if (o.lab && o.labA > 0) {
        ctx.globalAlpha *= o.labA;
        const lpx = 14, tw = textW(o.lab, SANS, 800, lpx, 1.6);
        const cx = x + s / 2, ly = y - 16 - 6 * (1 - o.labA);
        rrect(ctx, cx - tw / 2 - 11, ly - 15, tw + 22, 24, 12);
        ctx.fillStyle = 'rgba(22,26,40,0.88)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(201,160,82,0.9)'; ctx.stroke();
        drawText(ctx, o.lab, cx, ly + 2, { fam: SANS, wt: 800, px: lpx, track: 1.6, fill: '#F6E3B0', align: 'center' });
      }
      ctx.restore();
    });
  }
  function paintCard(ctx, c, S) {
    if (!c) return;
    if (c.fin) {
      sunburst(ctx, CARD.cx, 464, c.b * 0.85, c.bs, c.rot, { n: 24, R: 820, R0: 110, c1: '255,214,120', c2: '255,170,70', hw: 0.055, a0: 0.5, a1: 0.24, glowR: 360, gc: '255,214,140' });
      return;
    }
    sunburst(ctx, CARD.cx, CARD.burstY, c.b, c.bs, c.rot);
  }
  function paintCardText(ctx, c, S) {
    if (!c) return;
    if (c.fin) {
      const px = fitPx(S.ui.final, SERIF, 700, 116, 0.1, 1500, 40);
      ctx.save(); ctx.globalAlpha *= c.a;
      ctx.translate(CARD.cx, 464); ctx.scale(c.s, c.s);
      shadow(ctx, 'rgba(255,186,70,0.95)', 34, 0, 0);
      drawText(ctx, S.ui.final, 0, px * 0.35, { fam: SERIF, wt: 700, px, track: px * 0.1, fill: '#FFF6E6', align: 'center' });
      shadow(ctx, 'rgba(70,30,0,0.45)', 8, 0, 4);
      drawText(ctx, S.ui.final, 0, px * 0.35, { fam: SERIF, wt: 700, px, track: px * 0.1, fill: '#FFF8EC', align: 'center' });
      ctx.restore();
      return;
    }
    ctx.save(); ctx.globalAlpha *= c.a;
    if (c.wa > 0) {
      const wpx = fitPx(S.ui.level, SERIF, 700, CARD.wordPx, 0.32, 900, 30) * c.s;
      ctx.save(); ctx.globalAlpha *= c.wa;
      shadow(ctx, 'rgba(60,30,0,0.5)', 10, 0, 3);
      drawText(ctx, S.ui.level, CARD.cx, CARD.numCy - (CARD.numCy - CARD.wordY) * c.s, { fam: SERIF, wt: 700, px: wpx, track: wpx * 0.32, fill: goldGrad(ctx, CARD.numCy - (CARD.numCy - CARD.wordY) * c.s - wpx * 0.7, CARD.numCy - (CARD.numCy - CARD.wordY) * c.s), align: 'center' });
      ctx.restore();
    }
    const np = c.np;
    ctx.save();
    shadow(ctx, 'rgba(255,200,90,0.85)', Math.max(4, 40 * np / CARD.numPx), 0, 0);
    drawText(ctx, c.n, c.cx, c.cy + np * 0.35, { fam: SANS, wt: 900, px: np, fill: '#FFFFFF', align: 'center' });
    shadow(ctx, 'rgba(40,20,0,0.35)', Math.max(2, 10 * np / CARD.numPx), 0, Math.max(1, 5 * np / CARD.numPx));
    drawText(ctx, c.n, c.cx, c.cy + np * 0.35, { fam: SANS, wt: 900, px: np, fill: '#FFFFFF', align: 'center' });
    ctx.restore();
    ctx.restore();
  }
  function paintTitle(ctx, o) {
    if (!o) return;
    ctx.save(); ctx.globalAlpha *= o.a;
    if (o.rule > 0) {
      const w = Math.min(o.ruleW * 0.75, 420) * o.rule, y = TITLE.y + 22;
      const g = ctx.createLinearGradient(TITLE.cx - w / 2, 0, TITLE.cx + w / 2, 0);
      g.addColorStop(0, 'rgba(233,190,95,0)'); g.addColorStop(0.5, 'rgba(240,200,110,1)'); g.addColorStop(1, 'rgba(233,190,95,0)');
      ctx.fillStyle = g; ctx.fillRect(TITLE.cx - w / 2, y, w, 2.5);
    }
    const track = o.px * o.tr;
    const yTop = o.y - o.px * 0.72;
    shadow(ctx, 'rgba(25,14,0,0.6)', 10, 0, 3);
    if (o.w < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - o.w;
      drawText(ctx, o.s, o.x, o.y, { fam: SERIF, wt: 700, px: o.px, track, fill: goldGrad(ctx, yTop, o.y + o.px * 0.05) });
      ctx.restore();
    }
    if (o.w > 0) {
      ctx.save(); ctx.globalAlpha *= o.w;
      drawText(ctx, o.s, o.x, o.y, { fam: SERIF, wt: 700, px: o.px, track, fill: '#F8F4EA' });
      ctx.restore();
    }
    ctx.restore();
  }
  function paintToast(ctx, o) {
    if (!o) return;
    const x = 1452 + o.dx, y = 702, w = 426, h = 101;
    panel(ctx, x, y, w, h, 10);
    shine(ctx, x, y, w, h, 10, o.sh, 0.2);
    drawIcon(ctx, o.ic, x + 52, y + h / 2, 60);
    const tx = x + 104, maxW = w - 104 - 22;
    if (o.lb) drawText(ctx, o.lb, tx, y + 37, { fam: SANS, wt: 800, px: fitPx(o.lb, SANS, 800, 13, 0.24, maxW, 9), track: 3, fill: '#E9B44C' });
    const px = fitPx(o.nm, SERIF, 700, 35, 0.04, maxW, 18);
    ctx.save(); shadow(ctx, 'rgba(0,0,0,0.5)', 6, 0, 2);
    drawText(ctx, o.nm, tx, y + (o.lb ? 80 : 63), { fam: SERIF, wt: 700, px, track: px * 0.04, fill: goldGrad(ctx, y + (o.lb ? 80 : 63) - px * 0.72, y + (o.lb ? 80 : 63), true) });
    ctx.restore();
  }
  function paintUnlock(ctx, o) {
    if (!o || o.a <= 0) return;
    const px = fitPx(o.tx, SERIF, 700, 52, 0.04, 1100, 24);
    const tw = textW(o.tx, SERIF, 700, px, px * 0.04);
    const lockS = 66, gap = 24, cw = lockS + gap + tw, w = Math.max(556, cw + 130), h = 149;
    const cx = BW / 2, y = 747, x = cx - w / 2;
    ctx.save(); ctx.globalAlpha *= o.a;
    ctx.translate(cx, y + h / 2); ctx.scale(o.s, o.s); ctx.translate(-cx, -(y + h / 2));
    panel(ctx, x, y, w, h, 12, { top: 'rgba(30,34,50,0.9)', bot: 'rgba(18,21,32,0.9)', glow: 'rgba(255,200,100,0.35)', glowB: 18 });
    shine(ctx, x, y, w, h, 12, o.sh, 0.24);
    const lx = cx - cw / 2 + lockS / 2, ly = y + h / 2 + 4;
    if (o.fl > 0) {
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 120);
      g.addColorStop(0, `rgba(255,226,140,${0.85 * o.fl})`); g.addColorStop(1, 'rgba(255,226,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 120, 0, Math.PI * 2); ctx.fill();
    }
    if (o.ic) drawIcon(ctx, o.ic, lx, ly, lockS, { rot: o.sk * 0.14 });
    else drawIcon(ctx, 'lock', lx, ly, lockS, { rot: o.sk * 0.14, def: { fn: (c) => drawLock(c, o.op) } });
    const tx = cx - cw / 2 + lockS + gap;
    if (o.lb && o.la > 0) {
      ctx.save(); ctx.globalAlpha *= o.la;
      drawText(ctx, o.lb, tx, y + 50, { fam: SANS, wt: 800, px: 15, track: 4.5, fill: o.lk ? '#E9776E' : '#E9B44C' });
      ctx.restore();
    }
    shadow(ctx, 'rgba(0,0,0,0.55)', 8, 0, 3);
    const by = o.lb ? y + 108 : y + h / 2 + px * 0.35;
    drawText(ctx, o.tx, tx, by, { fam: SERIF, wt: 700, px, track: px * 0.04, fill: goldGrad(ctx, by - px * 0.72, by, true) });
    ctx.restore();
  }
  function paintBoss(ctx, o, S) {
    if (!o || o.a <= 0) return;
    ctx.save(); ctx.globalAlpha *= o.a; ctx.translate(0, o.dy);
    const px = fitPx(o.nm, SERIF, 700, 42, o.tr, 1100, 20);
    shadow(ctx, 'rgba(110,16,10,0.85)', 10, 0, 2);
    drawText(ctx, o.nm, BW / 2, 72, { fam: SERIF, wt: 700, px, track: px * o.tr, fill: '#F8ECD6', align: 'center' });
    noShadow(ctx);
    const x = 672, y = 95, w = 576, h = 26;
    shadow(ctx, 'rgba(0,0,0,0.5)', 10, 0, 3);
    rrect(ctx, x, y, w, h, 7); ctx.fillStyle = '#140B0C'; ctx.fill(); noShadow(ctx);
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#D9BC80'; ctx.stroke();
    const ix = x + 4, iy = y + 4, iw = 568, ih = 18;
    if (o.tf > o.f) { rrect(ctx, ix, iy, iw * o.tf, ih, 4); ctx.fillStyle = 'rgba(255,232,160,0.9)'; ctx.fill(); }
    if (o.f > 0) {
      const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, '#F5483C'); g.addColorStop(0.55, '#D82A26'); g.addColorStop(1, '#A8131A');
      rrect(ctx, ix, iy, Math.max(6, iw * o.f), ih, 4); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fillRect(ix + 3, iy + 2, Math.max(0, iw * o.f - 6), 3);
      if (o.bf > 0) { rrect(ctx, ix, iy, iw * o.f, ih, 4); ctx.fillStyle = `rgba(255,255,255,${0.5 * o.bf})`; ctx.fill(); }
    }
    if (o.c != null) {
      ctx.save(); ctx.globalAlpha *= o.ca; ctx.translate(0, o.cy);
      const npx = 34, upx = 17, utrack = 3.4;
      const maxNum = textW(fmtInt(o.cmax, S.sep), SANS, 900, npx, 0), uw = o.cu ? textW(o.cu, SANS, 800, upx, utrack) : 0;
      const tot = maxNum + (o.cu ? 24 + uw : 0), pw = Math.max(360, tot + 70), py = 141, ph = 62;
      panel(ctx, BW / 2 - pw / 2, py, pw, ph, 10, { top: 'rgba(34,36,44,0.92)', bot: 'rgba(18,20,26,0.92)', bw: 1.6 });
      const nr = BW / 2 - tot / 2 + maxNum;
      const s = fmtInt(o.c, S.sep);
      shadow(ctx, 'rgba(0,0,0,0.45)', 4, 0, 2);
      drawText(ctx, s, nr, py + 44, { fam: SANS, wt: 900, px: npx, fill: o.cd > 0 ? `rgb(255,${Math.round(lerp(255, 225, o.cd))},${Math.round(lerp(255, 150, o.cd))})` : '#FFFFFF', align: 'right', stroke: '#3A2416', strokeW: 5 });
      noShadow(ctx);
      if (o.cu) drawText(ctx, o.cu, nr + 24, py + 39, { fam: SANS, wt: 800, px: upx, track: utrack, fill: '#F1F1F3' });
      ctx.restore();
    }
    ctx.restore();
  }
  function paintAch(ctx, o) {
    if (!o) return;
    const lpx = 14, ltr = 4.2;
    const tpx = fitPx(o.tx, SERIF, 700, 36, 0.04, 820, 18), spx = 19;
    const tw = Math.max(textW(o.lb, SANS, 800, lpx, ltr), textW(o.tx, SERIF, 700, tpx, tpx * 0.04), o.sb ? textW(o.sb, SANS, 400, spx, 0.3) : 0);
    const w = Math.max(600, 150 + tw + 50), h = o.sb ? 128 : 112, x = BW / 2 - w / 2, y = 38 + o.dy;
    ctx.save(); ctx.globalAlpha *= o.a;
    panel(ctx, x, y, w, h, 14, { top: 'rgba(36,40,60,0.93)', bot: 'rgba(20,23,36,0.93)', border: '#E4BC5E', bw: 2.5, glow: `rgba(255,200,90,${0.45 + 0.4 * o.gl})`, glowB: 20 + 14 * o.gl });
    rrect(ctx, x + 6, y + 6, w - 12, h - 12, 10); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(228,188,94,0.35)'; ctx.stroke();
    shine(ctx, x, y, w, h, 14, o.sh, 0.26);
    const mx = x + 72, my = y + h / 2;
    if (o.m > 0.01) {
      ctx.save(); ctx.translate(mx, my); ctx.scale(o.m, o.m);
      if (o.gl > 0) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 80); g.addColorStop(0, `rgba(255,222,140,${0.6 * o.gl})`); g.addColorStop(1, 'rgba(255,222,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2);
      const g2 = ctx.createRadialGradient(0, -14, 4, 0, 0, 42); g2.addColorStop(0, '#2E3656'); g2.addColorStop(1, '#141828');
      ctx.fillStyle = g2; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#E8BE58'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(233,196,106,0.55)'; ctx.stroke();
      drawIcon(ctx, o.ic, 0, 0, 50);
      ctx.restore();
    }
    const tx = x + 140;
    drawText(ctx, o.lb, tx, y + (o.sb ? 38 : 40), { fam: SANS, wt: 800, px: lpx, track: ltr, fill: '#E9B44C' });
    ctx.save(); shadow(ctx, 'rgba(0,0,0,0.5)', 6, 0, 2);
    drawText(ctx, o.tx, tx, y + (o.sb ? 80 : 84), { fam: SERIF, wt: 700, px: tpx, track: tpx * 0.04, fill: '#FBF7EE' });
    ctx.restore();
    if (o.sb) drawText(ctx, o.sb, tx, y + 109, { fam: SANS, wt: 400, px: spx, track: 0.3, fill: '#C9CEDA' });
    ctx.restore();
  }
  function paintBanner(ctx, o) {
    if (!o || o.a <= 0) return;
    const px = fitPx(o.tx, SERIF, 700, 66, o.tr, 1300, 26);
    const tw = textW(o.tx, SERIF, 700, px, px * o.tr);
    const cx = BW / 2, by = 176;
    ctx.save(); ctx.globalAlpha *= o.a;
    if (o.rl > 0) {
      const len = 170 * o.rl, gapX = tw / 2 + 34, ry = by - px * 0.36;
      for (const sd of [-1, 1]) {
        const x0 = cx + sd * gapX, x1 = x0 + sd * len;
        const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(240,200,110,1)'); g.addColorStop(1, 'rgba(240,200,110,0)');
        ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), ry - 1.25, Math.abs(x1 - x0), 2.5);
        ctx.save(); ctx.translate(x0, ry); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#F0C86E'; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
      }
    }
    if (o.lb) {
      ctx.save(); ctx.globalAlpha *= o.sa; shadow(ctx, 'rgba(0,0,0,0.6)', 6, 0, 2);
      drawText(ctx, o.lb, cx, by - px * 0.72 - 22, { fam: SANS, wt: 800, px: 16, track: 6, fill: '#F0C86E', align: 'center' });
      ctx.restore();
    }
    shadow(ctx, 'rgba(255,190,80,0.55)', 26, 0, 0);
    drawText(ctx, o.tx, cx, by, { fam: SERIF, wt: 700, px, track: px * o.tr, fill: '#FFF7E8', align: 'center' });
    shadow(ctx, 'rgba(0,0,0,0.6)', 8, 0, 3);
    drawText(ctx, o.tx, cx, by, { fam: SERIF, wt: 700, px, track: px * o.tr, fill: '#FFF8EE', align: 'center' });
    noShadow(ctx);
    if (o.sb) {
      ctx.save(); ctx.globalAlpha *= o.sa; shadow(ctx, 'rgba(0,0,0,0.65)', 6, 0, 2);
      drawText(ctx, o.sb, cx, by + 42, { fam: SANS, wt: 800, px: 21, track: 5, fill: '#EEDDB4', align: 'center' });
      ctx.restore();
    }
    ctx.restore();
  }

  function paint(ctx, S, game) {
    const P = prep(game);
    const sc = Math.min(S.W / BW, S.H / BH);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, S.W, S.H);
    ctx.setTransform(sc, 0, 0, sc, (S.W - BW * sc) / 2, (S.H - BH * sc) / 2);
    ctx.imageSmoothingQuality = 'high';
    paintCard(ctx, S.card, S);                                  // the sunburst sits behind the HUD
    if (S.hud.a > 0) {
      ctx.save(); ctx.globalAlpha = S.hud.a; ctx.translate(S.hud.dl, 0);
      paintBadge(ctx, S); paintRankXP(ctx, S);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = S.hud.a; ctx.translate(S.hud.dr, 0);
      paintStats(ctx, S, P); paintQuests(ctx, S);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = S.hud.a; ctx.translate(0, S.hud.db);
      paintHotbar(ctx, S);
      ctx.restore();
    }
    paintTitle(ctx, S.title);
    paintToast(ctx, S.toast);
    paintUnlock(ctx, S.unlock);
    paintBoss(ctx, S.boss, S);
    paintBanner(ctx, S.banner);
    paintAch(ctx, S.ach);
    paintCardText(ctx, S.card, S);                              // the level number flies over everything into the badge
    ctx.restore();
  }

  function drawHUD(ctx, game, t, W, H) {
    W = W || ctx.canvas.width; H = H || ctx.canvas.height;
    paint(ctx, state(game, t, W, H), game);
  }
  function hudSig(game, t, W, H) { return JSON.stringify(state(game, t, W || BW, H || BH)); }
  function fnv(s) {                                             // 53-bit FNV-1a-ish hash of a signature, as hex
    let h1 = 0x811c9dc5 ^ 0, h2 = 0x1b873593;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 0x01000193); h2 = Math.imul(h2 ^ c, 0x5bd1e995); }
    return ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16)) + ':' + s.length;
  }
  function sigs(game, fps, n, W, H) { const out = new Array(n); for (let i = 0; i < n; i++) out[i] = fnv(hudSig(game, i / fps, W, H)); return out; }
  // a sheet of every icon (for checking the library by eye)
  function iconSheet(ctx, W) {
    const names = Object.keys(ICONS), cols = 12, cell = W / cols;
    ctx.fillStyle = '#3B4A3A'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    names.forEach((n, i) => {
      const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 18);
      ctx.fillStyle = 'rgba(48,56,70,0.8)'; ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16);
      drawIcon(ctx, n, x + cell / 2, y + cell / 2, cell * 0.62);
      ctx.fillStyle = '#fff'; ctx.font = '600 13px QMont'; ctx.textAlign = 'center'; ctx.fillText(n, x + cell / 2, y + cell + 6); ctx.textAlign = 'left';
    });
    return names.length;
  }

  const api = { drawHUD, hudSig, sigs, state, drawIcon, iconSheet, ICON_NAMES: Object.keys(ICONS), ALIAS, UI_DEFAULT };
  root.QuestHUD = api;
  root.drawHUD = drawHUD;
  root.hudSig = hudSig;
})(typeof window !== 'undefined' ? window : globalThis);
