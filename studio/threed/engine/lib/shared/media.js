// media.js — Legion 3D v3 real imagery inside 3D (WP2, V3_SPEC 2.2). render.py serves the job's assets directory
// (--assets DIR or video.json "assets") at /assets/; a spec names "src": "assets/<file>" (or "assets/<dir>/" + fps for an
// image sequence: files 0001.jpg...; GET /assets/<dir>/?list returns {"files": [...]}). Deterministic: everything is
// decoded during build (async build, before frame 0); a sequence frame is floor((t - t0) x fps), clamped (the last frame
// holds; `loop: true` loops);
// never a VideoTexture. A missing asset -> null + a warning (the caller draws a neutral card), never a crash.
//   assetUrl(src)                                   'assets/x.jpg' | 'x.jpg' | data:/http(s): -> absolute URL
//   loadImage(src, ctx) -> Texture | null           (texture.image = the decoded <img>, also drawable on a canvas)
//   loadSequence({src, fps, loop, start, t0, files, max}, ctx) -> {texture, n, fps, frameAt(t), update(t), luma[], frames} | null
//   archivalMaterial({map, emissive, mono, tone, contrast, age, grain, scratch, dust, flicker, vignette, gloss, ...})
//                                                  lit MeshStandard/Physical with an archival print / projection stage
//   paperSheet(w, h, curl, seed, thick)             a card / sheet lying flat (XZ, top +Y), bent by a smooth curl
//   printCanvas(img, o) / missingPrint(w, h)        an archival photo as a print (mono, tone, contrast, grain, age)
//   typeLine(g, text, x, y, o) / decodeGlyphs()     typewriter text on a canvas with the fern decode (scramble -> lock)
//   makeStrip(o)                                     a torn off-white paper strip with typed text (+ a second line)
// Fonts: the page loads Courier Prime (400/700) and Special Elite at boot (main.js); both cover Czech (č š ž ř ě ů ý í).
import * as THREE from 'three';
import { patchMaterial, computeEnv } from './env.js';

const MEM = new Map();                       // url -> Promise of decoded media (kept for the whole job: one decode)
const IMG = /\.(jpe?g|png|webp|gif|bmp)$/i;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
function rng(seed) { let s = (Math.floor(seed * 9301 + 49297) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const warn = (ctx, m) => { try { (ctx && (ctx.warn ? ctx.warn(m) : ctx.warnings && ctx.warnings.push(m))); } catch (e) { /* */ } console.warn('[f3d media]', m); };

export function assetUrl(src) {
  if (src == null) return null;
  let s = String(src).trim();
  if (!s) return null;
  if (/^(data:|blob:|https?:)/i.test(s)) return s;
  s = s.replace(/^\.?\/+/, '');
  if (!/^assets\//.test(s)) s = 'assets/' + s;
  return new URL('/' + s.split('/').map((p) => encodeURIComponent(decodeURIComponent(p))).join('/'), location.origin).href;
}

// ── images ──────────────────────────────────────────────────────────────────────────────────────────────────────
export async function loadImage(src, ctx = {}) {
  const url = assetUrl(src);
  if (!url) return null;
  const key = 'media:img:' + url;
  if (ctx.cache && ctx.cache.has(key)) return ctx.cache.get(key);
  let p = MEM.get(key);
  if (!p) {
    p = (async () => { const img = new Image(); img.src = url; await img.decode(); if (!img.naturalWidth) throw new Error('empty image'); return img; })();
    MEM.set(key, p);
  }
  let img;
  try { img = await p; } catch (e) { MEM.delete(key); warn(ctx, `media: '${src}' could not be loaded (${String(e && e.message || e).slice(0, 80)}); a neutral card is drawn instead`); return null; }
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true; tex.userData.keep = true;
  tex.userData.media = { src: String(src), w: img.naturalWidth, h: img.naturalHeight };
  if (ctx.cache) ctx.cache.set(key, tex);
  return tex;
}

// ── image sequences (archival film as frames): every frame an ImageBitmap decoded at build, one GPU texture per user ─
async function listFrames(url) {
  const r = await fetch(url + '?list');
  if (!r.ok) throw new Error('no frame list (' + r.status + ')');
  const j = await r.json();
  return (j.files || []).filter((f) => IMG.test(f));
}
export async function loadSequence(o = {}, ctx = {}) {
  if (typeof o === 'string') o = { src: o };
  let url = assetUrl(o.src);
  if (!url) return null;
  if (!url.endsWith('/')) url += '/';
  const maxN = clamp(Math.round(+o.max || 600), 1, 2000);
  const key = 'media:seq:' + url + '|' + maxN;
  let p = MEM.get(key);
  if (!p) {
    p = (async () => {
      let files = Array.isArray(o.files) && o.files.length ? o.files.map(String) : await listFrames(url);
      if (!files.length) throw new Error('no frames in ' + o.src);
      files = files.slice(0, maxN);
      // decoded at most 960 px wide, and smaller when the whole clip would pass a pixel budget (review 1: 1080p frames at
      // full size = ~5 GB of ImageBitmaps for 600 frames); the first frame tells the source size
      const blobs = await Promise.all(files.map(async (f) => { const r = await fetch(url + encodeURIComponent(f)); if (!r.ok) throw new Error(f + ' ' + r.status); return r.blob(); }));
      const probe = await createImageBitmap(blobs[0]);
      const sw = probe.width, sh = probe.height; probe.close && probe.close();
      const budget = clamp(+o.budget || 160e6, 8e6, 600e6);                     // pixels for the whole clip (~640 MB RGBA)
      let tw = Math.min(sw, clamp(+o.maxw || 960, 160, 1920));
      const per = budget / blobs.length; if (tw * tw * sh / sw > per) tw = Math.max(160, Math.floor(Math.sqrt(per * sw / sh)));
      const th = Math.max(1, Math.round(tw * sh / sw));
      const opt = { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
      if (tw < sw) Object.assign(opt, { resizeWidth: tw, resizeHeight: th, resizeQuality: 'high' });
      const frames = await Promise.all(blobs.map((b) => createImageBitmap(b, opt)));
      // per-frame mean luminance (linear): the room light a screen throws, the beam's strength
      const c = document.createElement('canvas'); c.width = 8; c.height = 6; const g = c.getContext('2d', { willReadFrequently: true });
      const luma = frames.map((bm) => {
        g.drawImage(bm, 0, 0, 8, 6); const d = g.getImageData(0, 0, 8, 6).data; let s = 0;
        for (let i = 0; i < d.length; i += 4) { const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; s += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]); }
        return s / 48;
      });
      return { frames, luma, w: frames[0].width, h: frames[0].height, files };
    })();
    MEM.set(key, p);
  }
  let S;
  try { S = await p; } catch (e) { MEM.delete(key); warn(ctx, `media: sequence '${o.src}' could not be loaded (${String(e && e.message || e).slice(0, 80)}); a neutral screen is drawn instead`); return null; }
  const n = S.frames.length, fps = clamp(+o.fps || 24, 1, 60), loop = o.loop === true, start = Math.round(+o.start || 0), t0 = +o.t0 || 0;   // holds the last frame unless loop: true (review 1: a loop repeats footage, H8)
  const tex = new THREE.Texture(S.frames[((start % n) + n) % n]);
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  tex.userData.media = { src: String(o.src), n, fps, w: S.w, h: S.h };
  let cur = -1;
  const frameAt = (t) => {
    let i = Math.floor((t - t0) * fps + 1e-6) + start;
    return loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
  };
  const update = (t) => { const i = frameAt(t); if (i !== cur) { tex.image = S.frames[i]; tex.needsUpdate = true; cur = i; } return i; };
  update(0);
  return { texture: tex, n, fps, w: S.w, h: S.h, aspect: S.w / S.h, frameAt, update, luma: S.luma, lumaAt: (t) => S.luma[frameAt(t)], frames: S.frames, src: String(o.src) };
}
// draw a sequence frame (decoded flipped for WebGL) upright onto a 2D canvas
export function drawFrame(g, bm, x, y, w, h) { g.save(); g.translate(x, y + h); g.scale(1, -1); g.drawImage(bm, 0, 0, w, h); g.restore(); }

// ── archival material: a lit print (map) or a projected / emitted image (emissive), with the archival stage in GLSL ──
const ARC_GLSL = /* glsl */`
uniform float uArcMono; uniform vec3 uArcTone; uniform float uArcContrast; uniform float uArcBright; uniform float uArcAge;
uniform float uArcGrain; uniform float uArcScratch; uniform float uArcDust; uniform float uArcFlicker; uniform float uArcVig;
uniform float uArcFrame; uniform float uArcSeed; uniform float uArcEmis; uniform vec2 uArcWeave; uniform float uArcHot;
float arcH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float arcN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(arcH(i), arcH(i + vec2(1.0, 0.0)), f.x), mix(arcH(i + vec2(0.0, 1.0)), arcH(i + vec2(1.0, 1.0)), f.x), f.y); }
vec3 arcStage(vec3 c, vec2 uv){
  float fr = floor(uArcFrame + 0.5);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float g = pow(max(l, 0.0), 1.0 / 2.2);
  g = clamp((g - 0.5) * uArcContrast + 0.5 + uArcBright, 0.0, 1.0);
  g = mix(g, g * 0.82 + 0.09, uArcAge * 0.7);                                  // an old print: lifted blacks, softer whites
  vec3 m = pow(vec3(g), vec3(2.2)) * uArcTone;
  c = mix(c, m, uArcMono);
  if (uArcGrain > 0.0) { float n = arcH(floor(uv * vec2(900.0, 700.0)) + uArcSeed + fr * 17.13) - 0.5; c *= 1.0 + n * uArcGrain * 0.5; }
  if (uArcScratch > 0.0) {                                                      // film: a few thin vertical scratches per frame
    for (int k = 0; k < 3; k++) {
      float fk = float(k); float on = step(1.0 - uArcScratch * 0.55, arcH(vec2(fr * 3.1 + fk, uArcSeed)));
      float x = arcH(vec2(fr + fk * 7.7, 2.0 + uArcSeed)); float w = 0.0007 + 0.0012 * arcH(vec2(fk, fr));
      float s = (1.0 - smoothstep(0.0, w, abs(uv.x - x))) * on * (0.6 + 0.4 * arcN(vec2(uv.y * 40.0, fr)));
      c = mix(c, vec3(arcH(vec2(fk, fr + 1.0)) > 0.5 ? 0.92 : 0.05) * uArcTone, s * 0.6);
    }
  }
  if (uArcDust > 0.0) {                                                         // dust specks and hairs (per frame on film, fixed on a print)
    vec2 q = uv * vec2(38.0, 28.0) + vec2(fr * 1.37, fr * 2.11) * step(0.5, uArcFlicker + uArcScratch);
    vec2 ci = floor(q); float h = arcH(ci + uArcSeed * 3.0);
    if (h > 1.0 - uArcDust * 0.08) { vec2 d = fract(q) - vec2(arcH(ci + 1.3), arcH(ci + 2.7)); float r = 0.04 + 0.08 * arcH(ci + 5.1);
      c = mix(c, vec3(h > 1.0 - uArcDust * 0.04 ? 0.94 : 0.03) * uArcTone, (1.0 - smoothstep(r * 0.5, r, length(d))) * 0.85); }
  }
  if (uArcVig > 0.0) { vec2 d = uv - 0.5; c *= mix(1.0, smoothstep(0.85, 0.22, length(d * vec2(1.15, 1.0))), uArcVig); }
  if (uArcHot > 0.0) { vec2 d = uv - 0.5; c *= 1.0 + uArcHot * (0.5 - dot(d, d) * 2.2); }  // a projector's hot centre
  if (uArcFlicker > 0.0) c *= 1.0 + (arcH(vec2(fr, uArcSeed + 9.0)) - 0.5) * uArcFlicker * 0.22;
  return max(c, vec3(0.0));
}`;
export function archivalMaterial(o = {}) {
  const gloss = clamp(+o.gloss || 0);
  const emis = !!o.emissive;
  const base = {
    color: emis ? new THREE.Color(o.base ?? 0x151413) : new THREE.Color(o.color ?? 0xffffff),
    roughness: o.roughness ?? (0.88 - gloss * 0.5), metalness: 0, envMapIntensity: o.env ?? 0.25,
    side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, alphaTest: o.alphaTest ?? 0,
  };
  if (emis) { base.emissive = new THREE.Color(0xffffff); base.emissiveMap = o.map || null; base.emissiveIntensity = +o.intensity || 1; }
  else base.map = o.map || null;
  if (o.alphaMap) base.alphaMap = o.alphaMap;
  const m = gloss > 0 ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: gloss, clearcoatRoughness: 0.18 + (1 - gloss) * 0.3 }) : new THREE.MeshStandardMaterial(base);
  const U = {
    uArcMono: { value: o.mono ?? 1 }, uArcTone: { value: new THREE.Vector3(...(o.tone || [1.0, 0.96, 0.88])) },
    uArcContrast: { value: o.contrast ?? 1.12 }, uArcBright: { value: o.bright ?? 0 }, uArcAge: { value: clamp(o.age ?? 0.3) },
    uArcGrain: { value: o.grain ?? 0.35 }, uArcScratch: { value: o.scratch ?? 0 }, uArcDust: { value: o.dust ?? 0 },
    uArcFlicker: { value: o.flicker ?? 0 }, uArcVig: { value: o.vignette ?? 0 }, uArcFrame: { value: 0 }, uArcSeed: { value: (+o.seed || 1) % 97 },
    uArcEmis: { value: emis ? 1 : 0 }, uArcWeave: { value: new THREE.Vector2() }, uArcHot: { value: o.hot ?? 0 },
  };
  m.userData.arc = U;
  m.userData.progKey = 'f3dArc' + (emis ? 'E' : 'A') + (gloss > 0 ? 'g' : '');
  return patchMaterial(m, (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + ARC_GLSL);
    if (emis) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
      { vec2 euv = vEmissiveMapUv + uArcWeave; vec4 et = texture2D(emissiveMap, euv);
        float edge = step(0.0, euv.x) * step(euv.x, 1.0) * step(0.0, euv.y) * step(euv.y, 1.0);
        totalEmissiveRadiance *= arcStage(et.rgb, euv) * edge; }
      #endif`);
    else sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
      { vec4 mt = texture2D(map, vMapUv); diffuseColor *= vec4(arcStage(mt.rgb, vMapUv), mt.a); }
      #endif`);
  });
}
// per frame: the film's frame number (grain, scratches, flicker), and an optional gate weave in UV
export function setArchivalFrame(m, frame, weave) {
  const U = m && m.userData && m.userData.arc; if (!U) return;
  U.uArcFrame.value = frame;
  if (weave) U.uArcWeave.value.set(weave[0], weave[1]);
}

// ── paper ────────────────────────────────────────────────────────────────────────────────────────────────────────
// a card / sheet lying flat in XZ (top +Y, canvas top = -Z), subdivided and bent: `curl` m lifts the corners and one
// edge softly (a print that dried unevenly), never a wave. thick > 0 = a thin box (top, bottom, edges as groups 0..2).
export function paperSheet(w, h, curl = 0, seed = 1, thick = 0) {
  const R = rng(seed), k = [0.4 + R() * 0.6, 0.4 + R() * 0.6, 0.4 + R() * 0.6, 0.4 + R() * 0.6], edge = R() < 0.5 ? 1 : -1, ph = R() * 6.28;
  const lift = (x, z) => {           // x, z in -1..1
    const c = Math.pow(Math.abs(x * z), 2.2) * (x > 0 ? (z > 0 ? k[0] : k[1]) : (z > 0 ? k[2] : k[3]));
    const e = Math.pow(clamp((edge * z + 1) / 2), 3) * 0.35;
    return curl * (c * 0.9 + e + 0.08 * (0.5 + 0.5 * Math.sin(x * 2.1 + ph) * Math.cos(z * 1.6)));
  };
  const nx = 20, nz = Math.max(6, Math.round(20 * h / Math.max(w, 1e-3)));
  const g = thick > 0 ? new THREE.BoxGeometry(w, thick, h, nx, 1, nz) : new THREE.PlaneGeometry(w, h, nx, nz).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + (thick > 0 ? thick / 2 : 0) + lift(x / (w / 2), z / (h / 2))); }
  if (thick > 0) {                    // groups: +x -x +y -y +z -z -> materials [edge, edge, top, bottom, edge, edge]
    g.groups.forEach((gr, i) => { gr.materialIndex = i === 2 ? 0 : i === 3 ? 1 : 2; });
  }
  g.computeVertexNormals();
  g.userData.lift = lift;
  return g;
}

// ── a photo as an archival print (canvas): mono + tone + contrast + grain + age, optional white border ─────────
// o: { w px (1024), border 0..0.12 (of the short side; bottom border wider when there is a label), bottom (extra
// bottom border fraction for a typed label), tone '#..' paper white, mono 0..1, contrast, age 0..1, grain 0..1,
// seed, deckle } -> { canvas, photo: {x, y, w, h} (px), W, H }
export function printCanvas(img, o = {}) {
  const iw = img ? (img.naturalWidth || img.width) : 4, ih = img ? (img.naturalHeight || img.height) : 3;
  const aspect = o.aspect || iw / ih;
  const W = Math.round(o.w || 1024), bord = clamp(o.border ?? 0.07, 0, 0.2), bot = clamp(o.bottom ?? 0, 0, 0.5);
  const pw = Math.round(W * (1 - 2 * bord)), ph = Math.round(pw / aspect);
  const bpx = Math.round(W * bord), H = Math.round(ph + bpx * 2 + W * bot);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const R = rng(o.seed || 7), age = clamp(o.age ?? 0.35);
  // paper
  g.fillStyle = o.tone || '#F1ECE1'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 700; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '110,95,70' : '255,253,245'},${0.02 + R() * 0.04})`; const x = R() * W, y = R() * H; g.fillRect(x, y, 1 + R() * 3, 1); }
  // the photo: drawn, then toned in one pass of pixels (mono, contrast, tone, grain, a little fade toward the edges)
  const px = bpx, py = bpx;
  if (img) {
    const sa = iw / ih;                // cover-crop into the photo window
    let sw = iw, sh = ih, sx = 0, sy = 0;
    if (sa > aspect) { sw = ih * aspect; sx = (iw - sw) / 2; } else { sh = iw / aspect; sy = (ih - sh) * clamp(o.crop_y ?? 0.35); }
    g.drawImage(img, sx, sy, sw, sh, px, py, pw, ph);
    const id = g.getImageData(px, py, pw, ph), d = id.data;
    const mono = clamp(o.mono ?? 1), con = o.contrast ?? 1.12, br = o.bright ?? 0, gr = clamp(o.grain ?? 0.3);
    const tone = new THREE.Color(o.ink_tone || '#FFF6E6');   // warm-neutral silver print
    const tr = tone.r, tg = tone.g, tb = tone.b;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      let l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      l = clamp((l - 0.5) * con + 0.5 + br);
      l = l * (1 - age * 0.16) + age * 0.07;
      const ex = Math.min(x, pw - 1 - x) / pw, ey = Math.min(y, ph - 1 - y) / ph, e = Math.min(ex, ey);
      l *= 1 - (1 - smooth(e / 0.06)) * 0.1 * age;                               // a slight darkening at the print's edge
      if (gr > 0) l = clamp(l + (hash(x * 0.37 + (o.seed || 7), y * 0.53) - 0.5) * 0.09 * gr);
      const m0 = [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
      d[i] = 255 * (m0[0] * (1 - mono) + l * tr * mono); d[i + 1] = 255 * (m0[1] * (1 - mono) + l * tg * mono); d[i + 2] = 255 * (m0[2] * (1 - mono) + l * tb * mono);
    }
    g.putImageData(id, px, py);
  } else {
    const gr = g.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, '#77736C'); gr.addColorStop(1, '#5E5A54');
    g.fillStyle = gr; g.fillRect(px, py, pw, ph);
  }
  // age: foxing spots and a yellowed rim on the paper
  const ed = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  ed.addColorStop(0, 'rgba(150,110,50,0)'); ed.addColorStop(1, `rgba(150,110,50,${0.22 * age})`); g.fillStyle = ed; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 10 * age; i++) { const x = R() * W, y = R() * H, r = 3 + R() * 16, q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(140,100,50,${0.08 + R() * 0.1})`); q.addColorStop(1, 'rgba(140,100,50,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); }
  return { canvas: c, photo: { x: px, y: py, w: pw, h: ph }, W, H };
}

// ── typewriter text with the fern decode ────────────────────────────────────────────────────────────────────────
export const TYPE_FONTS = { typewriter: 'Special Elite', elite: 'Special Elite', courier: 'Courier Prime', hand: 'EB Garamond' };
export function typeFont(name, px, bold = false) {
  const fam = TYPE_FONTS[name] || TYPE_FONTS.typewriter;
  if (fam === 'EB Garamond') return `italic ${bold ? 600 : 450} ${px.toFixed(1)}px "EB Garamond", Georgia, serif`;
  if (fam === 'Courier Prime') return `${bold ? 700 : 400} ${px.toFixed(1)}px "Courier Prime", "Courier New", monospace`;
  return `400 ${px.toFixed(1)}px "Special Elite", "Courier Prime", monospace`;
}
const SCRAMBLE = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%&@$?';
// the state of every glyph at t: hidden before its start, cycling 2-3 random glyphs (blurred) then locked (sharp).
// t0 = start of the decode, dur = the whole line's decode (0.35-0.5 s in fern). No t0 = everything locked.
export function decodeGlyphs(text, t, t0, dur = 0.45) {
  const s = [...String(text)], n = Math.max(1, s.length);
  if (t0 == null || !Number.isFinite(t0)) return s.map((ch) => ({ ch, k: 1, on: true, blur: 0 }));
  const D = Math.max(0.05, dur), cyc = Math.min(0.2, D * 0.4);
  return s.map((ch, i) => {
    const a = t0 + (i / n) * (D - cyc), b = a + cyc;
    if (t < a) return { ch, k: 0, on: false, blur: 0 };
    if (t >= b || /\s/.test(ch)) return { ch, k: 1, on: true, blur: 0 };
    const u = (t - a) / cyc, q = Math.floor(t * 15 + 1e-6);                     // a new glyph every 2 frames at 30 fps
    return { ch: SCRAMBLE[Math.floor(hash(i + 1, q) * SCRAMBLE.length)], k: u, on: true, blur: 6 * (1 - u), scr: true };
  });
}
// draw one typed line. o: { font name, px, bold, color, align left|center|right, seed, jitter 0..1, strike (double
// strike = bold typewriter), decode: {t, t0, dur}, alpha, letter (extra spacing px), blurK (px per decode blur unit) }
// -> width in px
export function typeLine(g, text, x, y, o = {}) {
  const px = o.px || 48, f = typeFont(o.font || 'typewriter', px, !!o.bold);
  g.save(); g.font = f; g.textBaseline = 'alphabetic';
  const chars = [...String(text ?? '')];
  const ls = o.letter ?? 0;
  const widths = chars.map((ch) => g.measureText(ch).width + ls);
  const W = widths.reduce((a, b) => a + b, 0) - ls;
  let cx = o.align === 'center' ? x - W / 2 : o.align === 'right' ? x - W : x;
  const st = o.decode ? decodeGlyphs(text, o.decode.t, o.decode.t0, o.decode.dur) : null;
  const J = o.jitter ?? 0.6, seed = o.seed || 3, col = o.color || '#17140F', blurK = o.blurK ?? 1;
  for (let i = 0; i < chars.length; i++) {
    const s = st ? st[i] : { ch: chars[i], on: true, blur: 0, k: 1 };
    if (s.on && !/\s/.test(s.ch)) {
      const hj = hash(i + 0.5, seed);
      g.save();
      g.translate(cx + widths[i] / 2, y + (hash(i, seed + 1) - 0.5) * px * 0.05 * J);
      g.rotate((hash(i, seed + 2) - 0.5) * 0.02 * J);
      g.globalAlpha = (o.alpha ?? 1) * (0.84 + 0.16 * hj) * (s.scr ? 0.85 : 1);
      if (s.blur > 0.05) g.filter = `blur(${(s.blur * blurK * px / 48).toFixed(2)}px)`;
      g.fillStyle = col; g.textAlign = 'center';
      g.fillText(s.ch, 0, 0);
      if (o.strike) { g.globalAlpha *= 0.55; g.fillText(s.ch, px * 0.022, px * 0.006); }
      g.restore();
    }
    cx += widths[i];
  }
  g.restore();
  return W;
}
export function measureType(g, text, o = {}) {
  const px = o.px || 48; g.save(); g.font = typeFont(o.font || 'typewriter', px, !!o.bold);
  const ls = o.letter ?? 0; let W = 0; for (const ch of String(text ?? '')) W += g.measureText(ch).width + ls; g.restore(); return Math.max(0, W - ls);
}

// ── the torn paper strip (fern Y1 / Y3): off-white strip, dark typed text, decode type-on ────────────────────────
// o: { text, text2, font typewriter|courier, px (canvas em, 96), sub (line 2 size factor 0.68), align, tone, ink,
//      bold (double strike, default on for line 1), seed, t_in, decode (s), t2_delay (s), shadow (0..1), maxW (px: line 2
//      wraps to it, up to 3 lines, then shrinks), font2 }
// -> { canvas, texture, W, H, textH (px of line 1 cap), paint(t) -> bool (repainted), done(t) }
export function makeStrip(o = {}) {
  // line 1: Courier Prime 700, double-struck, near-black (review 1 / fern Y1, Y3: bold and dark; Special Elite read thin
  // mid-grey); `font: 'typewriter'` keeps Special Elite. Line 2 wraps (up to 3 lines) to o.maxW px, then shrinks.
  const px = o.px || 96, font = o.font || 'courier', font2 = o.font2 || font;
  let sub = o.sub ?? 0.66;
  const pad = px * 0.42, padX = px * 0.62, lines = [String(o.text ?? '')];
  const mc = document.createElement('canvas').getContext('2d');
  const w1 = measureType(mc, lines[0], { px, font, bold: o.bold !== false });
  const maxW = Math.max(px * 6, +o.maxW || Infinity);
  if (o.text2) {
    const words = String(o.text2).split(/\s+/).filter(Boolean), sub2 = [];
    for (let tries = 0; tries < 6; tries++) {
      sub2.length = 0; let cur = '';
      for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (cur && measureType(mc, t, { px: px * sub, font: font2 }) > maxW) { sub2.push(cur); cur = wd; } else cur = t; }
      if (cur) sub2.push(cur);
      const wMax = Math.max(...sub2.map((l) => measureType(mc, l, { px: px * sub, font: font2 })));
      if (sub2.length <= 3 && wMax <= maxW * 1.02) break;
      sub *= 0.9;
    }
    lines.push(...sub2);
  }
  const ws = lines.slice(1).map((l) => measureType(mc, l, { px: px * sub, font: font2 }));
  const lh1 = px * 0.95, lh2 = px * sub * 1.05, n2 = lines.length - 1;
  const iw = Math.max(w1, ...ws, 0) + padX * 2, ih = pad * 2 + lh1 + n2 * lh2 - px * 0.12;
  const M = Math.round(px * 0.35);                       // margin for the torn edges and the shadow
  const W = Math.ceil(iw + M * 2), H = Math.ceil(ih + M * 2);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const bg = base.getContext('2d'), R = rng(o.seed || 5);
  // the strip outline: straight-ish long edges with fine tear noise, torn short ends
  const path = (ctx2, dx = 0, dy = 0) => {
    const x0 = M + dx, y0 = M + dy, x1 = M + iw + dx, y1 = M + ih + dy, N = 60;
    const jag = (k, amp) => (hash(k, (o.seed || 5) + amp) - 0.5) * amp;
    ctx2.beginPath(); ctx2.moveTo(x0 + jag(0, 3), y0 + jag(1, 2));
    for (let i = 1; i <= N; i++) ctx2.lineTo(x0 + (x1 - x0) * i / N, y0 + jag(i * 3.1, 2.4) + Math.sin(i * 0.4) * 0.6);
    for (let i = 1; i <= 10; i++) ctx2.lineTo(x1 + jag(i * 7.3, px * 0.09) + px * 0.03, y0 + (y1 - y0) * i / 10);
    for (let i = N - 1; i >= 0; i--) ctx2.lineTo(x0 + (x1 - x0) * i / N, y1 + jag(i * 5.7, 2.4));
    for (let i = 9; i >= 1; i--) ctx2.lineTo(x0 + jag(i * 9.1, px * 0.09) - px * 0.03, y0 + (y1 - y0) * i / 10);
    ctx2.closePath();
  };
  const sh = clamp(o.shadow ?? 0.35);
  if (sh > 0) { bg.save(); bg.filter = `blur(${(px * 0.07).toFixed(1)}px)`; bg.fillStyle = `rgba(0,0,0,${sh})`; path(bg, px * 0.03, px * 0.05); bg.fill(); bg.restore(); }
  bg.save(); path(bg); bg.clip();
  bg.fillStyle = o.tone || '#EFEAE0'; bg.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 260; i++) { bg.fillStyle = `rgba(${R() < 0.5 ? '120,105,80' : '255,255,250'},${0.025 + R() * 0.05})`; bg.fillRect(R() * W, R() * H, 1 + R() * 4, 1); }
  const vg = bg.createLinearGradient(0, M, 0, M + ih); vg.addColorStop(0, 'rgba(90,70,40,0.10)'); vg.addColorStop(0.18, 'rgba(90,70,40,0)'); vg.addColorStop(0.85, 'rgba(90,70,40,0)'); vg.addColorStop(1, 'rgba(90,70,40,0.12)');
  bg.fillStyle = vg; bg.fillRect(0, 0, W, H);
  bg.restore();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const tIn = Number.isFinite(+o.t_in) ? +o.t_in : null, D = clamp(+o.decode || 0.45, 0.05, 3), d2 = o.t2_delay ?? 0.22;
  const align = o.align || 'center';
  const tx = align === 'left' ? M + padX : align === 'right' ? M + iw - padX : M + iw / 2;
  let last = null;
  const doneAt = tIn == null ? -Infinity : tIn + (n2 ? d2 * n2 + D * 1.1 : D) + 0.05;
  function paint(t) {
    const key = tIn == null || t >= doneAt ? 'final' : t < tIn ? 'before' : String(Math.floor(t * 60));
    if (key === last) return false;
    last = key;
    g.clearRect(0, 0, W, H); g.drawImage(base, 0, 0);
    const dec = (t0, dur) => (tIn == null || t >= doneAt ? null : { t, t0, dur });
    typeLine(g, lines[0], tx, M + pad + px * 0.7, { px, font, bold: o.bold !== false, strike: o.bold !== false, color: o.ink || '#0F0D0A', align, seed: (o.seed || 5) + 1, jitter: 0.5, decode: dec(tIn, D) });
    for (let k = 1; k <= n2; k++) typeLine(g, lines[k], tx, M + pad + lh1 + (k - 1) * lh2 + px * sub * 0.72, { px: px * sub, font: font2, strike: o.strike2 !== false, color: o.ink || '#15120E', align, seed: (o.seed || 5) + 1 + k, jitter: 0.5, decode: dec(tIn + d2 * k, D * 1.1) });   // double-struck too: thin strokes read grey at 1.5 % of the frame (j1)
    tex.needsUpdate = true;
    return true;
  }
  paint(tIn ?? 0);
  return { canvas: c, texture: tex, W, H, M, iw, ih, px, capPx: px * 0.62, paint, doneAt };
}

// the scene's exposure as look.js grade() sets it (env row by the time's sun elevation, the interior cap 1.45, the
// lid-sky lift, look.exposure; presets and the meters' small corrections ignored): graphics that must read at a fixed
// display brightness (the typed strip's paper, a screen's white) divide by it
const TIME_EL = { dawn: 3.5, morning: 22, noon: 62, afternoon: 34, golden: 7, dusk: -2.5, night: -22, overcast: 36 };
export function exposureOf(ctx = {}) {
  const L = ctx.lookSpec || (ctx.spec && ctx.spec.look) || {};
  const el = L.sun && Number.isFinite(+L.sun.el) ? +L.sun.el : TIME_EL[L.time] ?? TIME_EL.afternoon;
  let e = 1;
  try { e = computeEnv({ sunEl: el, sunAz: 200 }).exposure; } catch (err) { e = 1; }
  const sp = ctx.spec || {}, world = sp.world || {};
  const interior = world.biome === 'interior' || world.kind === 'interior' || [...(sp.structures || []), ...(sp.objects || [])].some((x) => /^interior\./.test(String(x && x.kind)));
  if (interior) e = Math.min(e, 1.45);
  if (/^(overcast|storm|storm_green|smoke)$/.test(String(L.sky || ''))) e *= 1.12;
  return e * (Number.isFinite(+L.exposure) ? +L.exposure : 1);
}

// the exposure the page really grades this scene with (look.js grade + the exposure floor/ceiling), once the scene is
// loaded (render / meter time); during the build the estimate above
export function liveExposure(ctx = {}) {
  try {
    const F = typeof window !== 'undefined' ? window.__f3d : null, cur = F && F.cur;
    if (cur && cur.ctx === ctx && F.look) {
      const g = F.look().grade(cur.spec.look, { dark: /^(space|interior)$/.test((cur.S && cur.S.world && cur.S.world.hints && cur.S.world.hints.sky) || '') });
      if (Number.isFinite(g.exposure) && g.exposure > 0) return g.exposure * (cur.expK ?? 1);
    }
  } catch (e) { /* the estimate */ }
  return exposureOf(ctx);
}

// ── spot-light shadows under the logarithmic depth buffer ───────────────────────────────────────────────────────
// three r186 writes gl_FragDepth = LOG depth in the shadow pass but compares the spot's PERSPECTIVE depth, so a shadowed
// SpotLight puts every caster that also receives into its own shadow (the j1 desk and wall rendered black; hq.js avoids
// spot shadows for the same reason; WP3's lights.js patches it the same way). Shadow casters get a depth material
// without the log write; the orthographic key writes gl_FragCoord.z either way and point lights use the distance
// material, so nothing else changes. Called on the first update of a set that owns a shadowed spot (so every builder's
// casters exist by then); a scene without one never runs it (the default path stays untouched).
const NOLOG = { plain: null, at: new Map() };
function noLogDepth(src) {
  const mk = (o, key) => { const m = new THREE.MeshDepthMaterial(o); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <logdepthbuf_fragment>', ''); }; m.customProgramCacheKey = () => key; m.userData.keep = true; return m; };
  if (src && src.alphaTest > 0 && (src.map || src.alphaMap)) {
    if (!NOLOG.at.has(src.uuid)) NOLOG.at.set(src.uuid, mk({ map: src.map, alphaMap: src.alphaMap, alphaTest: src.alphaTest, side: src.side }, 'f3d-nolog-depth-at'));
    return NOLOG.at.get(src.uuid);
  }
  return NOLOG.plain || (NOLOG.plain = mk({}, 'f3d-nolog-depth'));
}
export function noLogShadows(stage) {
  if (!stage || stage.userData.noLogShadows) return;
  stage.userData.noLogShadows = true;
  stage.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) || !o.castShadow || o.customDepthMaterial) return;
    o.customDepthMaterial = noLogDepth(Array.isArray(o.material) ? o.material[0] : o.material);
  });
}

// a neutral placeholder print (a missing photo): an empty grey photo window on aged paper, no text
export function missingPrint(w = 1024, aspect = 0.75) { return printCanvas(null, { w, aspect, mono: 1 }); }
