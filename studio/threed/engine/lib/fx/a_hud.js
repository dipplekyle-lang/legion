// a_hud.js — E2 (asteroid kit, 29 Sep 2026): live readouts through the label system.
//   label.readout   a screen-anchored number block in the ALMANAC look (off-white Inter numerals, a mustard rule, a small
//                   caps caption): "0:08 / SINCE IMPACT", "40 km / FROM GROUND ZERO", "1,000 Mt", ... that COUNTS with
//                   scene time (mode clock), eases between values (mode value) or holds a text (mode text). It sits in a
//                   top corner (never the caption band at the bottom), fades in/out, and stays crisp under motion blur
//                   and depth of field (it follows the lens every sub-frame; dofShift compensates the aperture).
import * as THREE from 'three';
import { loadFont } from '../shared/text3d.js';
import { explicitParams } from './a_asteroid.js';

const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const fontUrl = (f) => new URL('../../fonts/' + f, import.meta.url).href;

function fmtClock(s, fmt) {
  const neg = s < 0; s = Math.abs(s);
  let out;
  if (fmt === 's') out = `${Math.floor(s)} s`;
  else if (fmt === 'min') out = s < 60 ? `${Math.floor(s)} s` : `${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, '0')} s`;
  else if (fmt === 'hms') out = `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  else out = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return (neg ? '−' : '') + out;
}
function fmtNum(v, dec, sep = true) {
  const s = Math.abs(v).toFixed(dec); const [a, b] = s.split('.');
  const g = sep ? a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : a;
  return (v < 0 ? '−' : '') + g + (b ? '.' + b : '');
}

async function buildReadout(item, ctx) {
  const p = explicitParams(item, CATALOG['label.readout']);
  try { await loadFont('Inter', fontUrl('Inter-SemiBold.ttf')); } catch (e) { /* the canvas falls back to sans-serif */ }
  try { await loadFont('EB Garamond', fontUrl('EB-Garamond.ttf')); } catch (e) { /* */ }
  const mode = String(p.mode || (p.value != null || p.from != null ? 'value' : p.text != null && p.caption == null ? 'text' : 'clock'));
  const tIn = num(p.t_in, Array.isArray(p.t) ? +p.t[0] : 0.2), tOut = num(p.t_out, Array.isArray(p.t) ? +p.t[1] : Infinity);
  const t0 = num(p.t0, tIn), rate = num(p.rate, 1), start = num(p.start, 0), fmt = String(p.format || 'mmss');
  const from = num(p.from, num(p.value, 0)), to = num(p.to, from), dur = num(p.dur, 1.5), dec = Math.max(0, Math.round(num(p.decimals, 0)));
  const unit = p.unit != null ? String(p.unit) : '', prefix = p.prefix != null ? String(p.prefix) : '';
  const caption = p.caption != null ? String(p.caption) : (mode === 'clock' ? 'SINCE IMPACT' : '');
  const corner = String(p.corner || 'top_left');
  const capH = num(p.screen, 0.07);                                   // numeral cap height as a fraction of the frame height
  const ink = p.color || '#ECE6D8', accent = p.accent || '#D9A93F';
  const events = Array.isArray(p.events) ? p.events : [];             // [{t, text}]: a second caption line that swaps in at t
  // canvas texture: redrawn only when the string changes
  const CW = 1024, CH = 320, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const align = corner.endsWith('right') ? 'right' : corner === 'top' || corner === 'center' ? 'center' : 'left';
  let last = null;
  const draw = (valueStr, evText) => {
    const key = valueStr + '|' + evText; if (key === last) return; last = key;
    g.clearRect(0, 0, CW, CH);
    const x = align === 'left' ? 24 : align === 'right' ? CW - 24 : CW / 2;
    g.textAlign = align; g.textBaseline = 'alphabetic';
    // soft shadow plate for contrast on bright skies (the flash!)
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 18; g.shadowOffsetY = 2;
    g.fillStyle = ink; g.font = '600 150px "Inter", sans-serif';
    // the number and its small unit laid out as one line (measured first, so right / centre alignment never overlaps)
    const numStr = prefix + valueStr, bigF = '600 150px "Inter", sans-serif', smF = '600 70px "Inter", sans-serif';
    g.font = bigF; const wn = g.measureText(numStr).width; g.font = smF; const wu = unit ? g.measureText(unit).width + 18 : 0;
    let wv = wn + wu, x0 = align === 'left' ? x : align === 'right' ? x - wv : x - wv / 2;
    g.textAlign = 'left'; g.font = bigF; g.fillText(numStr, x0, 160);
    if (unit) { g.font = smF; g.fillText(unit, x0 + wn + 18, 160); }
    g.textAlign = align;
    g.shadowBlur = 0; g.shadowOffsetY = 0;
    const rl = Math.max(160, Math.min(wv, 560)), ry = 190;
    g.fillStyle = accent; g.fillRect(align === 'left' ? x : align === 'right' ? x - rl : x - rl / 2, ry, rl, 6);
    const cap = evText || caption;
    if (cap) { g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 12; g.fillStyle = ink; g.font = '500 54px "EB Garamond", serif'; if ('letterSpacing' in g) g.letterSpacing = '6px'; g.fillText(cap.toUpperCase(), x, 262); if ('letterSpacing' in g) g.letterSpacing = '0px'; g.shadowBlur = 0; }
    tex.needsUpdate = true;
  };
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, opacity: 0 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, CH / CW), mat); plane.renderOrder = 1e7; plane.frustumCulled = false; plane.userData.noQA = true;
  const root = new THREE.Group(); root.name = 'label.readout'; root.add(plane);
  const valueAt = (t) => {
    if (mode === 'text') return String(p.text ?? '');
    if (mode === 'value') { const u = sm((t - t0) / Math.max(0.01, dur)); const v = from + (to - from) * u; return fmtNum(v, dec, p.separator !== false); }
    return fmtClock(start + Math.max(p.negative ? -1e9 : 0, (t - t0) * rate), fmt);
  };
  const evAt = (t) => { let s = ''; for (const e of events) if (t >= +e.t) s = String(e.text || ''); return s; };
  const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), P0 = new THREE.Vector3();
  let D = 6;
  function update(t, clock, camera) {
    draw(valueAt(t), evAt(t));
    const a = sm((t - tIn) / 0.5) * (1 - sm((t - tOut) / 0.5));
    mat.opacity = a; plane.visible = a > 0.003;
    if (!camera || !camera.isPerspectiveCamera) return;
    camera.updateMatrixWorld(); camera.matrixWorld.extractBasis(_r, _u, _f); _f.negate();
    D = Math.max(1, num(p.depth, 6));
    const hh = D * Math.tan(camera.fov * Math.PI / 360), hw = hh * (camera.aspect || 16 / 9);
    const Wp = (2 * hh * capH) / 0.107;                               // plane width so the numerals' cap height (110 of the 320 px canvas rows) = capH of the frame
    const mx = hw * 0.07, my = hh * 0.1;                              // margins (the title-safe area)
    let x = 0, y = hh - my - Wp * (CH / CW) * 0.5;
    if (align === 'left') x = -hw + mx + Wp * 0.5; else if (align === 'right') x = hw - mx - Wp * 0.5;
    if (corner === 'center') y = hh * 0.25;
    P0.copy(camera.position).addScaledVector(_f, D).addScaledVector(_r, x).addScaledVector(_u, y);
    root.position.copy(P0); root.quaternion.copy(camera.quaternion); plane.scale.setScalar(Wp);
  }
  update(0);
  return {
    root, radius: 1, height: 1, snapped: true, contact: false, story: false, update,
    // depth of field: the lens moved by A in its plane and re-aimed at the focus (dist): keep the readout still on screen
    dofShift: (A, dist) => { root.position.copy(P0).addScaledVector(A, 1 - D / Math.max(0.5, dist)); },
    anchors: {}, readout: true,
  };
}

export const CATALOG = {
  'label.readout': {
    desc: 'a LIVE readout in a top corner of the frame (ALMANAC look: big off-white numerals, a mustard rule, a small caps caption): mode clock counts scene time as "0:08 / SINCE IMPACT" (start, rate, t0, format mmss|s|min|hms), mode value eases a number ("40 km / FROM GROUND ZERO", "1,000 Mt", "300 km/h"), mode text holds a word; events swap the caption at given times ("GROUND SHAKING" at 8 s). Stays crisp under motion blur and depth of field; never in the caption band',
    actions: ['count'],
    params: { mode: 'clock|value|text', t0: 's (clock zero / value start)', start: 'clock value at t0 (s)', rate: 'clock speed (1)', format: 'mmss|s|min|hms', from: 'value', to: 'value', dur: 's', decimals: 'int', unit: 'km', prefix: 'string', text: 'text mode', caption: 'small line', events: '[{t, text}]', corner: 'top_left|top_right|top|center', screen: 'numeral cap height fraction (0.07)', t_in: 's', t_out: 's' },
    doc: {
      mode: 'clock (default, counts from `start` at `t0` with `rate`) | value (from -> to over dur, eased) | text',
      t0: 's in the shot where the clock reads `start` (e.g. the impact); before it, it holds `start` (negative: true counts down to it)',
      start: 's shown at t0: a shot that begins "eight seconds" after the impact gets start 8', rate: 'world seconds per screen second (10 = a fast clock)',
      format: 'mmss "1:30" (default) | s "90 s" | min "1 min 30 s" | hms', caption: 'the small caps line (clock default "SINCE IMPACT"; "FROM GROUND ZERO" for a distance)',
      events: '[{t, text}]: the caption changes at t ("GROUND SHAKING", "FALLING ROCK", "BLAST WAVE")', corner: 'top_left | top_right | top | center', screen: 'numeral cap height as a fraction of the frame (0.07)',
      unit: 'small unit after the number (km, Mt, km/h, °C)', decimals: 'value mode', depth: 'm in front of the lens (6)',
    },
    footprint: [1, 1], height: 1, tags: ['label', 'readout', 'hud', 'counter', 'timer', 'clock', 'number', 'distance', 'seconds', 'story'],
  },
};

export async function build(kind, item, ctx) { return buildReadout(item, ctx); }
