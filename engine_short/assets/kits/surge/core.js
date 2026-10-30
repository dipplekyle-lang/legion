/* surge/core.js — SURGE (FAST) kit core: frame clock, the stepped law, flat grounds, the picture pool, glow cards.
   Every device counts in FRAMES @30 fps (f = round(t*30)); graphics move only every STEP frames (10 fps GLOW,
   7.5 fps PAPER) while elements LAND in one frame — the refs' hand-made look (bible §2.8). */
const FR = 30, NF = Math.max(1, Math.round(D * FR));
const SK = String(S.skin || 'glow').toLowerCase() === 'paper' ? 'paper' : 'glow';
const STEP = Math.max(1, Math.round(S.step || (SK === 'paper' ? 4 : 3)));
const fr = t => Math.max(0, Math.min(NF - 1, Math.round(t * FR)));
const stp = (f, k = STEP) => Math.floor(f / k) * k;
const G = {white: '#FEFEFE', paper: '#FDFDFD', plum: '#120C10', black: '#000000', beat: '#0A0C0C',
           navy: '#0D111E', cream: '#F8F6EE', dark: '#030404'};
const ACC = S.accent || (P.accent) || '#CC510F';
const WAIT = [];
let _h = 0; for (const ch of String(S.type || '') + String(S.seed || 7)) _h = (_h * 31 + ch.charCodeAt(0)) >>> 0;
const hrnd = i => { let x = (_h ^ (i * 2654435761)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };

function plane(kind) {                       // a flat canvas that IS the shot (bible §8a); drawn once
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'full';
  const x = c.getContext('2d'); kind = kind || 'plum';
  if (kind === 'hero') {
    const g = x.createRadialGradient(960, 400, 40, 960, 470, 1150);
    g.addColorStop(0, '#2E2B33'); g.addColorStop(1, '#1B181F'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  } else if (kind === 'disc') {               // dead projector spot: #FDFDFD page, r 480 disc, 4 px scanlines inside
    const im = x.createImageData(W, H), d = im.data, rows = [255, 241, 222, 238];
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) {
      const r = Math.hypot(X - 960, y - 540), m = Math.max(0, Math.min(1, (511 - r) / 63));
      const v = Math.round(253 * (1 - m) + rows[y & 3] * m), i = (y * W + X) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
  } else if (kind === 'dotgrid') {            // paper #FEFEFE, black dot every 8 px (mean ~#ECECEC)
    x.fillStyle = '#FEFEFE'; x.fillRect(0, 0, W, H);
    for (let y = 3; y < H; y += 8) for (let X = 3; X < W; X += 8) {
      x.fillStyle = '#C8C8C8'; x.fillRect(X - 1, y - 1, 4, 4); x.fillStyle = '#3C3C3C'; x.fillRect(X, y, 2, 2);
    }
  } else { x.fillStyle = G[kind] || kind; x.fillRect(0, 0, W, H); }
  return c;
}
function setGround(kind) { const c = plane(kind); c.id = 'gnd'; scene.appendChild(c); return c; }

function placeholder(i) {                      // a neutral tone picture when the scene carries none (preview/check)
  const c = document.createElement('canvas'); c.width = 960; c.height = 600; const x = c.getContext('2d');
  const h = (i * 47) % 360, g = x.createLinearGradient(0, 0, 960, 600);
  g.addColorStop(0, `hsl(${h},28%,${30 + (i % 3) * 12}%)`); g.addColorStop(1, `hsl(${(h + 40) % 360},20%,12%)`);
  x.fillStyle = g; x.fillRect(0, 0, 960, 600);
  x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(480 + (i % 5 - 2) * 60, 280, 150, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '700 120px sans-serif'; x.textAlign = 'center'; x.fillText(String(i + 1), 480, 330);
  return c.toDataURL('image/jpeg', 0.85);
}
function pics(list, n) {
  const a = (Array.isArray(list) ? list : (list ? [list] : [])).filter(s => typeof s === 'string' && s.length > 8);
  if (a.length) return a;
  return Array.from({length: n || 8}, (_, i) => placeholder(i));
}
function img(src, css) {                       // decoded before the first frame (window.__wait)
  const im = new Image(); im.src = src; im.draggable = false;
  im.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;visibility:hidden;' + (css || '');
  WAIT.push(im.decode().catch(() => null)); return im;
}
// a card: a box holding a stack of pictures, one visible at a time; glow = the picture itself blurred behind it
function card(list, opt = {}) {
  const el = document.createElement('div'); el.className = 'scard';
  const glow = document.createElement('div'); glow.className = 'sglow';
  const box = document.createElement('div'); box.className = 'sbox';
  const op = opt.pos ? `object-position:${opt.pos};` : '';
  const ims = list.map(s => { const i = img(s, op); box.appendChild(i); return i; });
  const gls = opt.glow ? list.map(s => { const i = img(s, op + 'filter:blur(30px) saturate(.45) brightness(1.15);'); glow.appendChild(i); return i; }) : [];
  if (opt.glow) { el.appendChild(glow); el.classList.add('glow'); }
  el.appendChild(box); (opt.parent || scene).appendChild(el);
  let cur = -1;
  return {el, box, glow, n: list.length,
    show(i) { i = ((i % list.length) + list.length) % list.length; if (i === cur) return;
      if (cur >= 0) { ims[cur].style.visibility = 'hidden'; if (gls[cur]) gls[cur].style.visibility = 'hidden'; }
      ims[i].style.visibility = 'visible'; if (gls[i]) gls[i].style.visibility = 'visible'; cur = i; },
    place(cx, cy, w, h) { el.style.left = (cx - w / 2) + 'px'; el.style.top = (cy - h / 2) + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px'; }};
}
// a frame schedule: which entry of `lens` (frames each) frame f falls in
function sched(lens) { const st = []; let a = 0; for (const l of lens) { st.push(a); a += l; } return {st, total: a,
  at(f) { let k = 0; while (k + 1 < st.length && st[k + 1] <= f) k++; return k; }}; }
function cadence(n, pat) { pat = pat || [3, 2]; return Array.from({length: n}, (_, i) => pat[i % pat.length]); }
function vis(el, on) { el.style.display = on ? '' : 'none'; }   // containers: a visible child would show through visibility:hidden
function txt(cls, html, css) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.cssText = css || ''; scene.appendChild(d); return d; }
