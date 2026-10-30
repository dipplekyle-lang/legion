// crtscope.js — a period radar / oscilloscope CRT face drawn as real, readable graphics (not a module: no CATALOG).
// Used by the prop.build presets radar_scope (an A-scope: the SCR-270 kind of screen — a horizontal range trace with
// grass noise and a target spike) and radar_ppi (a round plan-position indicator: a rotating sweep with phosphor
// persistence, range rings, bearing ticks, blips that flare when the sweep passes and fade after it).
// The face is a canvas texture redrawn per frame as a pure function of t (deterministic for previews, clips and every
// sub-frame). The screen itself stays dark; only the trace is bright (no blown-out disc), and a weak coloured point
// light spills onto whoever sits in front of it.
import * as THREE from 'three';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const num = (v, d) => (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(+v) ? +v : d);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

function rgb(hex, d) { try { return new THREE.Color(hex ?? d); } catch (e) { return new THREE.Color(d); } }

// o: {mode 'a'|'ppi', r m (face radius), trace '#hex', target 0..1, approach /s, blip 0..1, targets [[range, bearing]],
//     rpm, rings, glow, spill, seed, labels true}
export function makeScopeFace(o = {}) {
  const ppi = o.mode === 'ppi';
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const tc = rgb(o.trace, '#7CFF8A'), seed = num(o.seed, 3);
  const T = (a) => `rgba(${Math.round(tc.r * 255)},${Math.round(tc.g * 255)},${Math.round(tc.b * 255)},${a})`;
  const hot = (a) => `rgba(${Math.round(150 + tc.r * 105)},${Math.round(150 + tc.g * 105)},${Math.round(150 + tc.b * 105)},${a})`;
  const cx = N / 2, R = N * 0.47;
  // the static layer: dark phosphor glass, graticule, scale, labels
  const base = document.createElement('canvas'); base.width = base.height = N;
  { const b = base.getContext('2d');
    const bg = b.createRadialGradient(cx, cx, 0, cx, cx, N / 2); bg.addColorStop(0, '#0b1a10'); bg.addColorStop(0.75, '#07120a'); bg.addColorStop(1, '#020503');
    b.fillStyle = bg; b.fillRect(0, 0, N, N);
    b.save(); b.beginPath(); b.arc(cx, cx, R, 0, TAU); b.clip();
    if (ppi) {
      const rings = Math.max(2, Math.min(8, Math.round(num(o.rings, 5))));
      b.strokeStyle = T(0.22); b.lineWidth = 1.6;
      for (let k = 1; k <= rings; k++) { b.beginPath(); b.arc(cx, cx, R * k / rings, 0, TAU); b.stroke(); }
      for (let a = 0; a < 360; a += 30) { b.beginPath(); b.moveTo(cx, cx); b.lineTo(cx + Math.sin(a * DEG) * R, cx - Math.cos(a * DEG) * R); b.stroke(); }
      b.strokeStyle = T(0.4); b.lineWidth = 2;
      for (let a = 0; a < 360; a += 5) { const L = a % 30 ? 0.035 : 0.07; b.beginPath(); b.moveTo(cx + Math.sin(a * DEG) * R * (1 - L), cx - Math.cos(a * DEG) * R * (1 - L)); b.lineTo(cx + Math.sin(a * DEG) * R, cx - Math.cos(a * DEG) * R); b.stroke(); }
      if (o.labels !== false) { b.fillStyle = T(0.55); b.font = `600 ${N * 0.04}px "Courier Prime", monospace`; b.textAlign = 'center'; b.textBaseline = 'middle';
        for (let a = 0; a < 360; a += 30) b.fillText(String(a).padStart(3, '0'), cx + Math.sin(a * DEG) * R * 0.86, cx - Math.cos(a * DEG) * R * 0.86); }
    } else {
      // A-scope: a range scale along the bottom, vertical range marks, the baseline position
      b.strokeStyle = T(0.2); b.lineWidth = 1.4;
      for (let k = 0; k <= 10; k++) { const x = cx - R * 0.86 + R * 1.72 * k / 10; b.beginPath(); b.moveTo(x, cx - R * 0.62); b.lineTo(x, cx + R * 0.42); b.stroke(); }
      for (let k = 0; k <= 4; k++) { const y = cx + R * 0.32 - R * 0.86 * k / 4; b.beginPath(); b.moveTo(cx - R * 0.9, y); b.lineTo(cx + R * 0.9, y); b.stroke(); }
      if (o.labels !== false) { b.fillStyle = T(0.6); b.font = `600 ${N * 0.04}px "Courier Prime", monospace`; b.textAlign = 'center'; b.textBaseline = 'top';
        const mx = num(o.range, 150);
        for (let k = 0; k <= 10; k += 2) b.fillText(String(Math.round(mx * k / 10)), cx - R * 0.8 + R * 1.6 * k / 10, cx + R * 0.38);
        b.font = `600 ${N * 0.03}px "Courier Prime", monospace`; b.fillText(String(o.unit || 'MILES'), cx, cx + R * 0.52); }
    }
    b.restore();
    // the tube's dark edge
    const ed = b.createRadialGradient(cx, cx, R * 0.82, cx, cx, N / 2); ed.addColorStop(0, 'rgba(0,0,0,0)'); ed.addColorStop(1, 'rgba(0,0,0,0.85)'); b.fillStyle = ed; b.fillRect(0, 0, N, N);
  }
  const rpm = num(o.rpm, 6), rings = 1;
  void rings;
  const targets = Array.isArray(o.targets) && o.targets.length ? o.targets.map((q) => [clamp(num(q[0], 0.7), 0.05, 0.98), num(q[1], 0)])
    : [[0.74, 2], [0.77, 5], [0.72, 7], [0.79, 9], [0.75, 11]];             // a formation to the north
  const tgt0 = clamp(num(o.target, 0.72), 0.05, 0.97), appr = num(o.approach, 0.004), blip = clamp(num(o.blip, 0.85), 0, 1.2);
  let last = null;
  function paint(t) {
    const key = Math.round(t * 60);
    if (key === last) return; last = key;
    g.globalCompositeOperation = 'source-over'; g.drawImage(base, 0, 0);
    g.save(); g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.clip();
    g.globalCompositeOperation = 'lighter';
    if (ppi) {
      const ang = ((t * rpm * 6) % 360 + 360) % 360;                // the sweep's bearing (deg, clockwise from north)
      // phosphor persistence: a wedge behind the sweep fading over ~120 deg
      for (let k = 0; k < 48; k++) {
        const a1 = (ang - k * 2.5) * DEG, a0 = (ang - (k + 1) * 2.5) * DEG, al = 0.16 * Math.exp(-k / 14);
        g.fillStyle = T(al); g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, R, a0 - Math.PI / 2, a1 - Math.PI / 2); g.closePath(); g.fill();
      }
      // ground clutter near the centre (the island's own returns), stable speckle that brightens behind the sweep
      for (let i = 0; i < 260; i++) {
        const rr = R * 0.2 * Math.sqrt(hash(i, seed)), aa = hash(i, seed + 1) * 360;
        const lag = ((ang - aa) % 360 + 360) % 360, a = 0.25 + 0.6 * Math.exp(-lag / 70);
        g.fillStyle = T(a * (0.4 + 0.6 * hash(i, seed + 2))); g.fillRect(cx + Math.sin(aa * DEG) * rr - 1.5, cx - Math.cos(aa * DEG) * rr - 1.5, 3, 3);
      }
      // blips: flare when swept, decay after (the formation moves inward by `approach`)
      for (const [r0, b0] of targets) {
        const rr = R * clamp(r0 - appr * t, 0.06, 0.98), lag = ((ang - b0) % 360 + 360) % 360;
        const a = 0.18 + 0.95 * Math.exp(-lag / 55);
        const x = cx + Math.sin(b0 * DEG) * rr, y = cx - Math.cos(b0 * DEG) * rr;
        const gr = g.createRadialGradient(x, y, 0, x, y, N * 0.022); gr.addColorStop(0, hot(a)); gr.addColorStop(0.35, T(a * 0.8)); gr.addColorStop(1, T(0));
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, N * 0.026, N * 0.014, b0 * DEG, 0, TAU); g.fill();
      }
      // the sweep line itself
      const sx = Math.sin(ang * DEG), sy = -Math.cos(ang * DEG);
      g.strokeStyle = hot(0.95); g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cx); g.lineTo(cx + sx * R, cx + sy * R); g.stroke();
      g.strokeStyle = T(0.35); g.lineWidth = 9; g.beginPath(); g.moveTo(cx, cx); g.lineTo(cx + sx * R, cx + sy * R); g.stroke();
    } else {
      // A-scope: the baseline with grass, the target spike (growing in, drifting toward 0 as the formation closes)
      const y0 = cx + R * 0.32, x0 = cx - R * 0.86, x1 = cx + R * 0.86, fr = Math.floor(t * 30);
      const tg = clamp(tgt0 - appr * t, 0.05, 0.97), xs = x0 + (x1 - x0) * tg;
      const grow = smooth(num(o.blip_in, -1) < 0 ? 1 : (t - num(o.blip_in, 0)) / 0.6);
      const pts = [];
      for (let i = 0; i <= 220; i++) {
        const u = i / 220, x = x0 + (x1 - x0) * u;
        let h = (hash(i, fr + seed) - 0.5) * 0.06 + (hash(i * 3.7, fr * 1.3 + seed) > 0.93 ? hash(i, fr + 7) * 0.12 : 0);
        if (u < 0.05) h += 0.9 * Math.exp(-u / 0.012);                // the transmitter's main bang at zero range
        const d = (x - xs) / (R * 0.03); h += blip * grow * Math.exp(-d * d) * (0.92 + 0.08 * Math.sin(t * 9));
        const d2 = (x - xs - R * 0.05) / (R * 0.02); h += 0.35 * blip * grow * Math.exp(-d2 * d2);
        pts.push([x, y0 - h * R * 0.62]);
      }
      for (const [lw, a] of [[10, 0.22], [5, 0.45], [2.2, 1.0]]) {
        g.strokeStyle = lw < 3 ? hot(a) : T(a); g.lineWidth = lw; g.lineJoin = 'round';
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      }
    }
    g.restore();
    g.globalCompositeOperation = 'source-over';
    tex.needsUpdate = true;
  }
  // the screen: the canvas as light (MeshBasicMaterial, toneMapped), the dark glass stays dark, the trace glows
  const k = clamp(num(o.glow, 1), 0, 3);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25 * k, 1.25 * k, 1.25 * k), toneMapped: true });
  const r = num(o.r, 0.115);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat); face.name = 'crt_face';
  const grp = new THREE.Group(); grp.name = 'crt_scope'; grp.add(face);
  // a faint green spill on whoever sits in front (0.45 m out, so it never hot-spots the console's own panel)
  const spill = clamp(num(o.spill, 0.25), 0, 4);
  let light = null;
  if (spill > 0) { light = new THREE.PointLight(tc.clone(), spill * 0.6, 2.5, 2); light.position.set(0, 0.05, 0.45); light.castShadow = false; light.name = 'crt_spill'; grp.add(light); }
  paint(0);
  return { group: grp, face, update(t) { paint(t); if (light) light.intensity = spill * 0.6 * (0.92 + 0.08 * Math.sin(t * 50 + seed)); } };
}
