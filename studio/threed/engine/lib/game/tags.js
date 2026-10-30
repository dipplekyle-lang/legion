// tags.js — QUEST world-space game UI that rides on things in the 3D scene (the 2D HUD is drawn by Legion on top):
//   game.tag     a billboard over a target: name (dark plate, gold rim, Cinzel caps) | you ("YOU" + ▼, white) |
//                danger (red ⚠ + a red bar) | health (a bar, value 0..1) | quest (a gold "!" bobbing) | count (a number
//                that counts up from..to over [t0, t1]) | damage (a red number rising and fading) | label (plain caps)
//                on: 'ref:<cast>' | 'groups:N' | 'objects:N' (+ offset [dx, dy, dz]); or at [x, z] + elev
//   game.select  an RTS selection box on the ground round a group or a radius: a green outline with corner brackets
//                and a translucent fill, drawn in at t (optional count text over it)
import * as THREE from 'three';
import { clamp, smooth } from '../shared/util.js';

const FONTS = { done: false, p: null };
function loadFonts() {
  if (FONTS.p) return FONTS.p;
  const base = new URL('../../fonts/', import.meta.url).href;
  const list = [['Cinzel', 'Cinzel.ttf', '400 900'], ['Montserrat', 'Montserrat-ExtraBold.ttf', '800'], ['Montserrat', 'Montserrat-Black.ttf', '900']];
  FONTS.p = Promise.all(list.map(([fam, f, w]) => { try { const ff = new FontFace(fam, `url(${base}${f})`, { weight: w }); return ff.load().then((x) => { document.fonts.add(x); }).catch(() => null); } catch (e) { return null; } })).then(() => { FONTS.done = true; });
  return FONTS.p;
}
const ease = (x) => smooth(clamp(x));
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function drawTag(style, text, o = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const T = String(text || '').toUpperCase();
  if (style === 'you') {
    c.width = 360; c.height = 220;
    g.font = '900 104px "Montserrat", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
    g.fillStyle = '#FFFFFF'; g.fillText(T || 'YOU', 180, 82);
    g.beginPath(); g.moveTo(152, 158); g.lineTo(208, 158); g.lineTo(180, 196); g.closePath(); g.fill();
    return { c, aspect: 360 / 220 };
  }
  if (style === 'danger' || style === 'health') {
    c.width = 560; c.height = 120;
    const red = style === 'danger' ? '#E0383A' : (o.color || '#4CC85A');
    let x0 = 8;
    if (style === 'danger') { g.fillStyle = '#E0383A'; g.beginPath(); g.moveTo(58, 10); g.lineTo(108, 104); g.lineTo(8, 104); g.closePath(); g.fill(); g.fillStyle = '#FFFFFF'; g.font = '900 64px "Montserrat", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 58, 70); x0 = 130; }
    rr(g, x0, 34, 548 - x0, 54, 12); g.fillStyle = 'rgba(20,24,34,0.88)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#2A2E3A'; g.stroke();
    const v = clamp(o.value ?? 1);
    rr(g, x0 + 6, 40, (536 - x0) * v, 42, 9); g.fillStyle = red; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; rr(g, x0 + 10, 44, (528 - x0) * v, 12, 6); g.fill();
    return { c, aspect: 560 / 120 };
  }
  if (style === 'quest') {
    c.width = 200; c.height = 260; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 230px "Montserrat", sans-serif'; g.lineWidth = 14; g.strokeStyle = '#6A4A0E'; g.strokeText(T === '?' ? '?' : '!', 100, 140);
    const gr = g.createLinearGradient(0, 20, 0, 250); gr.addColorStop(0, '#FFE58A'); gr.addColorStop(1, '#E2A21E'); g.fillStyle = gr; g.fillText(T === '?' ? '?' : '!', 100, 140);
    return { c, aspect: 200 / 260 };
  }
  if (style === 'damage' || style === 'count' || style === 'label') {
    c.width = 640; c.height = 180; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${style === 'label' ? 96 : 120}px "Montserrat", sans-serif`;
    g.lineWidth = 16; g.strokeStyle = 'rgba(20,16,12,0.85)'; g.strokeText(T, 320, 96);
    g.fillStyle = style === 'damage' ? '#FF4A3A' : style === 'count' ? '#FFD45A' : '#FFFFFF'; g.fillText(T, 320, 96);
    return { c, aspect: 640 / 180 };
  }
  // name plate: a dark navy plate with a gold rim, Cinzel caps in warm white (the NPC tags of the reference)
  g.font = '700 84px "Cinzel", serif';
  const w = Math.ceil(g.measureText(T).width) + 120;
  c.width = Math.max(320, w); c.height = 150;
  g.font = '700 84px "Cinzel", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  rr(g, 6, 14, c.width - 12, 122, 14); g.fillStyle = 'rgba(26,30,46,0.9)'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#D2A853'; g.stroke();
  g.fillStyle = '#F6EBD2'; g.fillText(T, c.width / 2, 80);
  return { c, aspect: c.width / 150 };
}

const P = { style: 'name|you|danger|health|quest|count|damage|label', text: 'the words (caps)', on: "'ref:<cast>' | 'groups:N' | 'objects:N'", offset: '[dx, dy, dz] above the target top', at: '[x, z] when not on a thing', elev: 'm', t_in: 's', t_out: 's', size: 'height in m (default by style)', value: '0..1 bar fill (health / danger)', to: 'value at t_out (a draining bar)', from: 'count start', count_to: 'count end', unit: 'text after the number' };
export const CATALOG = {
  'game.tag': { desc: 'QUEST world-space game UI over a target: a name plate, YOU ▼, a red danger ⚠ + bar, a health bar, a quest "!", a counting number, a damage number', params: P, footprint: [1, 1], height: 1, tags: ['label', 'game', 'tag', 'ui'], look: 'game', section: 'labels' },
  'game.select': { desc: 'QUEST RTS selection box drawn on the ground round a group (on: groups:N) or a radius at [x, z]: green outline, corner brackets, translucent fill, drawn in at t_in', params: { on: 'groups:N | ref:<cast>', at: '[x, z]', size: '[w, d] m (default: the group)', t_in: 's', color: 'hex (#5CFF6A)' }, footprint: [10, 10], height: 0.1, tags: ['label', 'game', 'selection', 'rts'], look: 'game', section: 'labels' },
};

function targetOf(ctx, on) {
  if (!on || !ctx.S) return null;
  const it = ctx.S.byRef[on] || ctx.S.byRef['ref:' + on] || ctx.S.byRef[String(on).replace(/^ref:/, 'cast:')];
  return it || null;
}
const _v = new THREE.Vector3(), _b = new THREE.Box3();
function topOf(it, out) {
  const r = it.res, A = r.anchors || {};
  if (A.top && A.top.isObject3D) { A.top.getWorldPosition(out); return out; }
  if (typeof r.members === 'function' && it.section === 'groups') {
    const M = r.members(it._t ?? 0) || []; let x = 0, z = 0; for (const m of M) { x += m[0]; z += m[1]; }
    x /= M.length || 1; z /= M.length || 1; out.set(x, 0, z); out.y = (r.root.position.y || 0) + (r.height || 1.5) + 0.4; return out;
  }
  _b.setFromObject(r.root); if (_b.isEmpty()) { r.root.getWorldPosition(out); out.y += r.height || 2; return out; }
  _b.getCenter(out); out.y = _b.max.y + 0.2; return out;
}

export async function build(kind, item = {}, ctx = {}) {
  await loadFonts();
  const root = new THREE.Group(); root.name = kind;
  const t0 = item.t_in ?? 0, t1 = item.t_out ?? 1e9;
  if (kind === 'game.select') return select(root, item, ctx, t0);
  const style = item.style || 'name';
  const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const sp = new THREE.Sprite(mat); sp.renderOrder = 50; root.add(sp);
  const H = item.size ?? { name: 0.42, you: 0.6, danger: 0.34, health: 0.26, quest: 0.9, count: 0.7, damage: 0.6, label: 0.6 }[style] ?? 0.5;
  let last = null;
  const redraw = (txt, val) => {
    const key = txt + '|' + (val == null ? '' : val.toFixed(3));
    if (key === last) return; last = key;
    const d = drawTag(style, txt, { value: val, color: item.color });
    if (mat.map) mat.map.dispose();
    const tx = new THREE.CanvasTexture(d.c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; mat.map = tx; mat.needsUpdate = true;
    sp.scale.set(H * d.aspect, H, 1);
  };
  const off = Array.isArray(item.offset) ? item.offset : [0, style === 'you' ? 0.55 : 0.35, 0];
  const fixed = Array.isArray(item.at) ? [item.at[0], (ctx.ground ? ctx.ground.height(item.at[0], item.at[1]) : 0) + (item.elev ?? 2.2), item.at[1]] : null;
  const textAt = (t) => {
    if (style === 'count') { const u = ease((t - t0) / Math.max(0.2, (item.t_count ?? (t0 + 2)) - t0)); const v = Math.round((item.from ?? 0) + ((item.count_to ?? 100) - (item.from ?? 0)) * u); return v.toLocaleString('en-US') + (item.unit ? ' ' + item.unit : ''); }
    return item.text || (style === 'you' ? 'YOU' : '');
  };
  const valAt = (t) => (item.to != null ? (item.value ?? 1) + (item.to - (item.value ?? 1)) * ease((t - t0) / Math.max(0.3, (t1 < 1e8 ? t1 : t0 + 2) - t0)) : (item.value ?? 1));
  redraw(textAt(0), style === 'danger' || style === 'health' ? valAt(0) : null);
  // the tag keeps its size ON SCREEN (a fraction of the frame height), like a game's UI: item.screen, else by style
  const SCR = item.screen ?? { name: 0.042, you: 0.06, danger: 0.034, health: 0.026, quest: 0.075, count: 0.06, damage: 0.055, label: 0.05 }[style] ?? 0.045;
  let Hs = H;
  const update = (t, clock, camera) => {
    const tgt = targetOf(ctx, item.on);
    if (tgt) { tgt._t = t; topOf(tgt, _v); root.position.set(_v.x + off[0], _v.y + off[1], _v.z + off[2]); }
    else if (fixed) root.position.set(fixed[0], fixed[1], fixed[2]);
    const a = ease((t - t0) / 0.25) * (1 - ease((t - t1) / 0.25));
    let k = a, dy = 0;
    if (style === 'quest' || style === 'you') dy = Math.sin(t * 3.2) * 0.06;
    if (style === 'damage') { const u = clamp((t - t0) / 1.2); dy = u * 0.9; k = a * (1 - smooth(clamp((u - 0.6) / 0.4))); }
    if (camera && camera.isPerspectiveCamera && item.size == null) { const d = camera.position.distanceTo(root.position); Hs = Math.max(0.12, SCR * 2 * d * Math.tan(camera.fov * Math.PI / 360)); } else Hs = H;
    sp.position.y = Hs / 2 + dy * Hs / H; mat.opacity = k; sp.visible = k > 0.002;
    const pop = style === 'name' || style === 'you' ? 1 + 0.15 * Math.sin(Math.PI * clamp((t - t0) / 0.25)) : 1;
    sp.scale.y = Hs * pop; sp.scale.x = sp.scale.y * (mat.map ? mat.map.image.width / mat.map.image.height : 1);
    if (style === 'count') redraw(textAt(t));
    if ((style === 'danger' || style === 'health') && item.to != null) redraw(textAt(t), valAt(t));
  };
  update(0);
  return { root, radius: 0.5, height: H, update, contact: false, snapped: true };
}

function select(root, item, ctx, t0) {
  const col = new THREE.Color(item.color || '#5CFF6A');
  const fillM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const lineM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false });
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), fillM); root.add(fill);
  const edges = []; for (let k = 0; k < 4; k++) { const e = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), lineM); root.add(e); edges.push(e); }
  const corners = []; for (let k = 0; k < 8; k++) { const e = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), lineM); root.add(e); corners.push(e); }
  let w = 8, d = 8, cx = 0, cz = 0, measured = false;
  const measure = (t) => {
    const tgt = targetOf(ctx, item.on);
    if (tgt && typeof tgt.res.members === 'function') {
      const M = tgt.res.members(t) || []; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const m of M) { x0 = Math.min(x0, m[0]); x1 = Math.max(x1, m[0]); z0 = Math.min(z0, m[1]); z1 = Math.max(z1, m[1]); }
      if (M.length) { cx = (x0 + x1) / 2; cz = (z0 + z1) / 2; w = x1 - x0 + 2.4; d = z1 - z0 + 2.4; }
    } else if (tgt) { tgt.res.root.getWorldPosition(_v); cx = _v.x; cz = _v.z; w = d = 3; }
    else if (Array.isArray(item.at)) { cx = item.at[0]; cz = item.at[1]; }
    if (Array.isArray(item.size)) { w = item.size[0]; d = item.size[1]; }
    measured = true;
  };
  const update = (t) => {
    if (!measured || (item.on && targetOf(ctx, item.on)?.res?.members)) measure(t);
    const y = (ctx.ground ? ctx.ground.height(cx, cz) : 0) + 0.06;
    root.position.set(cx, y, cz);
    const u = ease((t - t0) / 0.35);
    const ww = w * (0.6 + 0.4 * u), dd = d * (0.6 + 0.4 * u), th = 0.14;
    fill.scale.set(ww, 1, dd); fillM.opacity = 0.16 * u; lineM.opacity = 0.95 * u;
    edges[0].scale.set(ww, 1, th); edges[0].position.set(0, 0, -dd / 2); edges[1].scale.set(ww, 1, th); edges[1].position.set(0, 0, dd / 2);
    edges[2].scale.set(th, 1, dd); edges[2].position.set(-ww / 2, 0, 0); edges[3].scale.set(th, 1, dd); edges[3].position.set(ww / 2, 0, 0);
    const cl = Math.min(ww, dd) * 0.18, ct = 0.32;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], k) => { corners[k * 2].scale.set(cl, 1, ct); corners[k * 2].position.set(sx * (ww / 2 - cl / 2), 0.01, sz * dd / 2); corners[k * 2 + 1].scale.set(ct, 1, cl); corners[k * 2 + 1].position.set(sx * ww / 2, 0.01, sz * (dd / 2 - cl / 2)); });
    root.visible = u > 0.002;
  };
  update(0);
  return { root, radius: 5, height: 0.1, update, contact: false, snapped: true };
}
