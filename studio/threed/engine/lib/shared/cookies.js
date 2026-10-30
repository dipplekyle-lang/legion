// cookies.js — Legion 3D v3 projected-texture light cookies (gobos) for SpotLight.map (WP3; V3_SPEC 2.3).
// White = light, black = blocked. In three r186 a spot's map needs no castShadow: the cookie is projected through the
// spot's shadow camera (fov = 2 x angle, square), so the drawing must sit inside the inscribed circle (the cone); the
// corners never show. Canvas 2D with ctx.filter blur for the feathers; deterministic (no Math.random). Cached per
// name + options for the whole job (the texture is shared, never disposed by a scene).
//   slit     a vertical slit (fern's red slit across the face): w (fraction of the cone width, 0.07), feather, len,
//            band (0.25: a dimmer glow band round the hot core), band_w (2.0 x w)
//   blinds   venetian blinds in a window: n slats (11), duty (light share 0.55), w / h of the window, frame, sag
//   window   a window with mullions: cols x rows panes (2 x 3), bar (mullion width), w / h
//   bars     prison / grille bars: n (7) vertical bars, bar width, w / h, cross (a horizontal tie bar)
//   foliage  leaf dapple: scale, cover (0.5), seed
//   gate     a projector film gate (4:3 rounded rectangle, soft edge, hot centre): aspect
import * as THREE from 'three';

const CACHE = new Map();
function hash(i, j, s) { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }
function vnoise(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
let S = 512;
function canvas() { const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S); return [cv, g]; }
const px = (f) => f * S;

export const COOKIES = {
  slit(g, o) {
    const w = px(o.w ?? 0.07), len = px(o.len ?? 0.86), fe = Math.max(1, px(o.feather ?? 0.018));
    g.filter = `blur(${fe}px)`;
    const grd = g.createLinearGradient(0, S / 2 - len / 2, 0, S / 2 + len / 2);   // the ends fade (a slit in a flag, not a laser)
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.16, '#fff'); grd.addColorStop(0.84, '#fff'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    // the glow band (fern 0:34): a soft dimmer band round the hot core, so the slit reads deep red at its edges and
    // orange-hot in the middle once tone-mapped (band 0 = a plain bar)
    const band = Math.max(0, Math.min(0.9, o.band ?? 0.25)), bw = w * (o.band_w ?? 2.0);
    if (band > 0) {
      g.filter = `blur(${Math.max(fe, px(0.012))}px)`;
      const gb = g.createLinearGradient(0, S / 2 - len / 2, 0, S / 2 + len / 2);
      gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(0.16, `rgba(255,255,255,${band})`); gb.addColorStop(0.84, `rgba(255,255,255,${band})`); gb.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gb; g.fillRect(S / 2 - bw / 2, S / 2 - len / 2, bw, len);
      g.filter = `blur(${fe}px)`;
    }
    g.fillStyle = grd; g.fillRect(S / 2 - w / 2, S / 2 - len / 2, w, len);
  },
  blinds(g, o) {
    const n = Math.max(3, Math.round(o.n ?? 11)), duty = o.duty ?? 0.55, W = px(o.w ?? 0.6), H = px(o.h ?? 0.66), fe = Math.max(1, px(o.feather ?? 0.006));
    const x0 = S / 2 - W / 2, y0 = S / 2 - H / 2, pitch = H / n, sag = o.sag ?? 0.012;
    g.filter = `blur(${fe}px)`;
    g.fillStyle = '#fff';
    for (let k = 0; k < n; k++) {
      // every slat a little different (a real blind is never perfect): band width, a slight sag in the middle
      const bw = pitch * duty * (0.9 + 0.2 * hash(k, 3, 7)), y = y0 + k * pitch + (pitch - bw) / 2, sg = px(sag) * (0.5 + hash(k, 5, 2));
      g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(S / 2, y + sg * 2, x0 + W, y); g.lineTo(x0 + W, y + bw); g.quadraticCurveTo(S / 2, y + bw + sg * 2, x0, y + bw); g.closePath(); g.fill();
    }
    if (o.frame !== false) { g.filter = 'none'; g.fillStyle = '#000'; const fr = px(o.frame_w ?? 0.018); g.fillRect(S / 2 - fr / 2, y0, fr, H); }   // the window's middle post
  },
  window(g, o) {
    const cols = Math.max(1, Math.round(o.cols ?? 2)), rows = Math.max(1, Math.round(o.rows ?? 3)), W = px(o.w ?? 0.52), H = px(o.h ?? 0.7);
    const bar = px(o.bar ?? 0.022), fe = Math.max(1, px(o.feather ?? 0.008)), x0 = S / 2 - W / 2, y0 = S / 2 - H / 2;
    g.filter = `blur(${fe}px)`; g.fillStyle = '#fff'; g.fillRect(x0, y0, W, H);
    g.fillStyle = '#000';
    for (let i = 1; i < cols; i++) g.fillRect(x0 + (W * i) / cols - bar / 2, y0, bar, H);
    for (let j = 1; j < rows; j++) g.fillRect(x0, y0 + (H * j) / rows - bar * 0.4, W, bar * 0.8);
  },
  bars(g, o) {
    const n = Math.max(2, Math.round(o.n ?? 7)), W = px(o.w ?? 0.6), H = px(o.h ?? 0.66), bw = (W / n) * (o.bar ?? 0.32), fe = Math.max(1, px(o.feather ?? 0.008));
    const x0 = S / 2 - W / 2, y0 = S / 2 - H / 2;
    g.filter = `blur(${fe}px)`; g.fillStyle = '#fff'; g.fillRect(x0, y0, W, H);
    g.fillStyle = '#000';
    for (let k = 0; k <= n; k++) g.fillRect(x0 + (W * k) / n - bw / 2, y0, bw, H);
    if (o.cross !== false) g.fillRect(x0, y0 + H * 0.3, W, bw * 0.7);
  },
  foliage(g, o) {
    const sc = o.scale ?? 7, cover = o.cover ?? 0.5, seed = o.seed ?? 3, N = 128;
    const img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i / N) * sc, y = (j / N) * sc;
      let v = 0.55 * vnoise(x, y, seed) + 0.3 * vnoise(x * 2.1 + 3.3, y * 2.1 + 1.7, seed + 1) + 0.15 * vnoise(x * 4.3, y * 4.3, seed + 2);
      const r = Math.hypot(i / N - 0.5, j / N - 0.5) / 0.5;
      v = Math.min(1, Math.max(0, (v - (1 - cover) + 0.08) / 0.16)) * Math.min(1, Math.max(0, (0.98 - r) / 0.2));
      const k = (j * N + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(v * 255); img.data[k + 3] = 255;
    }
    const c2 = document.createElement("canvas"); c2.width = c2.height = N; c2.getContext('2d').putImageData(img, 0, 0);
    g.filter = `blur(${px(0.006)}px)`; g.imageSmoothingEnabled = true; g.drawImage(c2, 0, 0, S, S);
  },
  gate(g, o) {
    const asp = o.aspect ?? 4 / 3, W = px(o.w ?? 0.62), H = W / asp, r = px(0.03), fe = Math.max(1, px(o.feather ?? 0.012));
    g.filter = `blur(${fe}px)`;
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, W * 0.62);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.75, '#e4e4e4'); grd.addColorStop(1, '#a8a8a8');
    g.fillStyle = grd;
    const x0 = S / 2 - W / 2, y0 = S / 2 - H / 2;
    g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + W, y0, x0 + W, y0 + H, r); g.arcTo(x0 + W, y0 + H, x0, y0 + H, r); g.arcTo(x0, y0 + H, x0, y0, r); g.arcTo(x0, y0, x0 + W, y0, r); g.closePath(); g.fill();
  },
};
export const COOKIE_NAMES = Object.keys(COOKIES);

// cookie(name, opts) -> THREE.CanvasTexture | null ('none' or an unknown name: null, the plain spot)
export function cookie(name, o = {}) {
  if (!name || name === 'none' || !COOKIES[name]) return null;
  const key = name + JSON.stringify(o);
  if (CACHE.has(key)) return CACHE.get(key);
  S = ['blinds', 'window', 'bars'].includes(name) ? 1024 : 512;            // hard-edged patterns: a finer canvas
  const [cv, g] = canvas();
  COOKIES[name](g, o);
  g.filter = 'none';
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.NoColorSpace; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter; tx.magFilter = THREE.LinearFilter;
  tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; tx.anisotropy = 4;
  tx.userData.cookie = name;
  CACHE.set(key, tx);
  return tx;
}
