// x_phone.js — E5 (explosions, 30 Sep 2026): the smartphone of the hook (beats 008-012)
//   detail.phone   a phone filming, held in a white mannequin hand (portrait): its screen shows the LIVE view out of
//                  its back camera (the scene rendered from the phone, like a Reflector), the camera app's red REC
//                  timer running from t_rec, the shutter button; t_flash = the screen blows out orange-white
import * as THREE from 'three';
import { num, clamp, sstep, headingYaw, DEG } from './x_common.js';
import { patchMaterial } from '../shared/env.js';
import { explicitParams } from './a_asteroid.js';

const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));
const PW = 0.0715, PH = 0.147, PD = 0.0078, SW = 0.066, SH = 0.1405;

function limb(parent, a, b, r, m) {                                  // a capsule from a to b (local metres)
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, L), 4, 12), m);
  c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  c.castShadow = c.receiveShadow = true; parent.add(c); return c;
}

async function buildPhone(item, ctx) {
  const p = explicitParams(item, CATALOG['detail.phone']);
  const at = item.at || [0, 0], G = ctx.ground;
  const gy = G ? G.height(at[0], at[1]) : 0;
  const root = new THREE.Group(); root.name = 'detail.phone'; root.userData.noQA = true;   // hand-held: never a camera obstacle (the lens may come to 0.25 m)
  root.position.set(at[0], p.y != null ? +p.y : gy + num(p.elev, 1.5), at[1]);
  if (Array.isArray(p.look_at)) {                                    // the back camera (+Z) aimed at a point
    const la = p.look_at.map(Number), ly = p.look_h != null ? +p.look_h : root.position.y;
    root.lookAt(new THREE.Vector3(la[0], ly, la[1])); root.rotateZ(num(p.roll, 3) * DEG);
  } else { root.rotation.order = 'YXZ'; root.rotation.set(-num(p.tilt, 0) * DEG, headingYaw(item.heading ?? p.heading ?? 0), num(p.roll, 3) * DEG); }
  // the phone: graphite frame, the back glass with the camera bump (top left seen from behind), the screen facing -Z
  const body = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), stdM({ color: 0x2a2c30, metalness: 0.65, roughness: 0.32 }));
  body.castShadow = body.receiveShadow = true; root.add(body);
  const bez = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.002, PH - 0.002).rotateY(Math.PI), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.2 }));
  bez.position.z = -PD / 2 - 0.0001; root.add(bez);
  const bump = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.0026), stdM({ color: 0x33363b, metalness: 0.5, roughness: 0.3 })); bump.position.set(-0.017, 0.054, PD / 2 + 0.0013); root.add(bump);
  const glassL = stdM({ color: 0x07080a, roughness: 0.05, metalness: 0.3 });
  for (const [x, y] of [[-0.024, 0.061], [-0.024, 0.047], [-0.01, 0.054]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.0016, 20).rotateX(Math.PI / 2), glassL); l.position.set(x, y, PD / 2 + 0.0034); root.add(l); }
  const lens = new THREE.Object3D(); lens.position.set(-0.024, 0.061, PD / 2 + 0.005); root.add(lens);
  // the live view: the scene rendered from the lens into a portrait target, shown on the screen (Reflector-style,
  // in the screen's onBeforeRender, so every other item has already updated for this frame)
  const live = p.live !== false, resH = Math.round(clamp(num(p.res, 720), 240, 1280));
  const RT = live ? new THREE.WebGLRenderTarget(Math.round(resH * SW / SH), resH, { type: THREE.HalfFloatType, samples: 2 }) : null;
  const pcam = new THREE.PerspectiveCamera(num(p.fov, 60), SW / SH, 0.05, 2e6);
  const scrM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.9, 0.9), map: RT ? RT.texture : null });
  if (!RT) scrM.color.setRGB(0.05, 0.06, 0.07);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH).rotateY(Math.PI), scrM); screen.position.z = -PD / 2 - 0.0003; screen.userData.noQA = true; root.add(screen);
  const _q = new THREE.Quaternion(), _flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  screen.onBeforeRender = (renderer, scene, camera) => {
    if (!RT || scene.overrideMaterial || renderer.__phoneBusy) return;
    root.updateMatrixWorld(true);
    lens.getWorldPosition(pcam.position); root.getWorldQuaternion(_q); pcam.quaternion.copy(_q).multiply(_flip);
    pcam.far = camera && camera.far ? camera.far : 2e6; pcam.updateProjectionMatrix(); pcam.updateMatrixWorld(true);
    const cur = renderer.getRenderTarget(), sAU = renderer.shadowMap.autoUpdate, xr = renderer.xr.enabled;
    renderer.__phoneBusy = true; root.visible = false; renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(RT); renderer.state.buffers.depth.setMask(true); renderer.clear(true, true, true);
    renderer.render(scene, pcam);
    renderer.setRenderTarget(cur); renderer.shadowMap.autoUpdate = sAU; renderer.xr.enabled = xr; root.visible = true; renderer.__phoneBusy = false;
    if (camera && camera.viewport !== undefined) renderer.state.viewport(camera.viewport);
  };
  // the camera app on top: REC dot, the running timer, the shutter button (a canvas redrawn when the second changes)
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * SH / SW); const g = cv.getContext('2d');
  const uiT = new THREE.CanvasTexture(cv); uiT.colorSpace = THREE.SRGBColorSpace;
  const ui = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH).rotateY(Math.PI), new THREE.MeshBasicMaterial({ map: uiT, transparent: true, depthWrite: false }));
  ui.position.z = -PD / 2 - 0.0005; ui.renderOrder = 30; ui.userData.noQA = true; root.add(ui);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH).rotateY(Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.9), transparent: true, opacity: 0, depthWrite: false }));
  flash.position.z = -PD / 2 - 0.0007; flash.renderOrder = 31; flash.userData.noQA = true; root.add(flash);
  const tRec = num(p.t_rec, 0), rec0 = num(p.rec_start, 3), tFl = p.t_flash != null ? +p.t_flash : null;
  let shown = null;
  function drawUI(sec, recOn) {
    const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    const top = g.createLinearGradient(0, 0, 0, 70); top.addColorStop(0, 'rgba(0,0,0,0.55)'); top.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = top; g.fillRect(0, 0, W, 70);
    const bot = g.createLinearGradient(0, H - 110, 0, H); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = bot; g.fillRect(0, H - 110, W, 110);
    const s = Math.max(0, Math.floor(sec)), txt = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    g.font = '600 21px Inter, Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
    const tw = g.measureText(txt).width, px = (W - tw) / 2 - 12;
    g.fillStyle = recOn ? '#e5322b' : 'rgba(40,40,40,0.6)'; g.beginPath(); g.roundRect(px, 20, tw + 24, 30, 8); g.fill();
    g.fillStyle = '#fff'; g.fillText(txt, px + 12, 36);
    if (recOn) { g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(24, 35, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = '700 16px Inter, Helvetica, Arial, sans-serif'; g.fillText('REC', 38, 36); }
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 5; g.beginPath(); g.arc(W / 2, H - 52, 30, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff3b30'; g.beginPath(); if (recOn) g.roundRect(W / 2 - 12, H - 64, 24, 24, 5); else g.arc(W / 2, H - 52, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,214,10,0.9)'; g.lineWidth = 2; const fx0 = W / 2 - 34, fy0 = H * 0.45 - 34;   // the focus square
    for (const [x, y, dx, dy] of [[fx0, fy0, 1, 1], [fx0 + 68, fy0, -1, 1], [fx0, fy0 + 68, 1, -1], [fx0 + 68, fy0 + 68, -1, -1]]) { g.beginPath(); g.moveTo(x + dx * 12, y); g.lineTo(x, y); g.lineTo(x, y + dy * 12); g.stroke(); }
    uiT.needsUpdate = true;
  }
  // the hand: a white mannequin right hand, fingers round the left edge, thumb on the right edge, the wrist low right
  if (p.hand !== false) {
    const skin = stdM({ color: 0xcfc9bf, roughness: 0.55 }), shirt = stdM({ color: 0x9fb6cf, roughness: 0.85 });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin); palm.scale.set(0.04, 0.05, 0.017); palm.position.set(-0.01, -0.043, PD / 2 + 0.014); palm.castShadow = palm.receiveShadow = true; root.add(palm);
    for (let i = 0; i < 4; i++) {
      const y = -0.074 + i * 0.0185, r = i === 3 ? 0.0074 : 0.0082, zb = PD / 2 + 0.009;
      limb(root, [-0.004, y, zb + 0.004], [0.03, y + 0.002, zb], r, skin);                 // along the back
      limb(root, [0.03, y + 0.002, zb], [0.0445, y + 0.003, 0], r * 0.95, skin);          // round the edge
      limb(root, [0.0445, y + 0.003, 0], [0.034, y + 0.004, -PD / 2 - 0.004], r * 0.9, skin);   // the tip on the glass rim
    }
    limb(root, [-0.036, -0.086, PD / 2 + 0.01], [-0.043, -0.05, 0.0], 0.0105, skin);      // the thumb up the right edge
    limb(root, [-0.043, -0.05, 0.0], [-0.036, -0.022, -PD / 2 - 0.0045], 0.0095, skin);
    limb(root, [-0.02, -0.08, PD / 2 + 0.02], [-0.06, -0.2, 0.09], 0.025, skin);          // the wrist
    limb(root, [-0.06, -0.2, 0.09], [-0.1, -0.33, 0.2], 0.032, skin);                     // the forearm
    limb(root, [-0.085, -0.28, 0.16], [-0.13, -0.42, 0.3], 0.042, shirt);                 // the light-blue sleeve
  }
  function update(t) {
    const recOn = t >= tRec, sec = recOn ? rec0 + (t - tRec) : 0, key = (recOn ? 1 : 0) + ':' + Math.floor(sec);
    if (key !== shown) { shown = key; drawUI(sec, recOn); }
    const x = tFl == null ? -1 : t - tFl;
    flash.material.opacity = x < 0 ? 0 : clamp(Math.min(1, x / 0.06) * Math.exp(-x / 1.3), 0, 1);   // blown out, then the live view (the fireball) comes back
  }
  update(0);
  const cues = tFl != null ? [{ t: tFl, sound: 'explosion_big', gain: 0.4 }] : [];
  return { root, radius: 0.12, height: 0.2, snapped: false, update, contact: false, cues,
    anchors: { screen: new THREE.Vector3(0, 0, -PD / 2), lens: lens.position.clone() } };
}

export const CATALOG = {
  'detail.phone': {
    desc: "INSERT: a SMARTPHONE FILMING, held in a white mannequin hand in portrait (light-blue sleeve): its screen shows the LIVE view out of its back camera (the scene itself, rendered from the phone: the smoke over the port, the fireball), the camera app's red REC dot and running timer from t_rec, the shutter button; t_flash = the screen blows out orange-white. Aim it with heading (compass deg the back camera looks) + tilt, or look_at [x, z] + look_h. Put it where the Witness's hand is (1.4-1.6 m up, 0.3-0.5 m in front of the face, at a window) and film over the shoulder from 0.3-0.6 m (limits macro, fov 30-45); several at windows = the neighbours filming",
    actions: ['record'], snap: false,
    params: { elev: 'm above the ground (1.5)', y: 'm (absolute)', heading: 'deg the back camera looks', tilt: 'deg up', roll: 'deg (3)', look_at: '[x, z]', look_h: 'm', t_rec: 's the timer starts (0)', rec_start: 's shown at t_rec (3)', t_flash: 's: the screen blows out', hand: 'bool (true)', fov: 'deg of the phone camera (60)', live: 'bool (true)', res: 'px (720)' },
    footprint: [0.08, 0.16], height: 0.16, tags: ['detail', 'insert', 'phone', 'smartphone', 'filming', 'recording', 'rec', 'screen', 'hand', 'beirut', 'video'],
    examples: [{ note: 'over the shoulder: the phone filming the smoke 1 km away, then the flash on its screen', spec: { look: { time: 'dusk' }, world: { biome: 'plains' }, objects: [{ kind: 'fx.explosion', at: [0, -1000], preset: 'beirut', t: 4, pre: 4 }, { kind: 'detail.phone', at: [0, 0], elev: 1.5, heading: 0, tilt: 4, t_rec: 0, t_flash: 4 }], camera: { move: 'keys', fov: 38, target: 'objects:1', limits: 'macro', keys: [{ t: 0, pos: [-0.1, 1.6, 0.42], look: [0.02, 1.5, -1] }, { t: 7, pos: [-0.06, 1.59, 0.36], look: [0.02, 1.5, -1] }] } } }],
  },
};

export async function build(kind, item, ctx) {
  return buildPhone(item, ctx);
}
