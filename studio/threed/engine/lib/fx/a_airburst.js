// a_airburst.js — E2 (asteroid kit, 29 Sep 2026): a rock that explodes in the air.
//   fx.airburst      the burst over a place: a flash brighter than the Sun (hard shadows swinging from it, the sky
//                    whitening), then the shock front: a dome coming down from the burst, its foot racing across the
//                    ground as a wall of dust and snow that reaches the stage at `t_arrive` (screen time), rattling
//                    everything it crosses. flashAt() for the frame QA; res.cues: flash / shock / boom times.
//   fx.window_blast  a window wall that blows INWARD when the shock hits: frame + glass panes, the glass bursting into
//                    glinting shards that fly into the room and rain onto the floor, the blinds and dust thrown in
//                    (Chelyabinsk, 2013: ~7,200 buildings, most of the 1,500 injured by glass). Stand it in an
//                    interior.* room or on a façade; its OUTSIDE faces `heading`.
//   fx.tunguska      the flattened forest: tens of thousands of trees felled radially AWAY from the centre (they fall in
//                    a ring racing outward from `t_blast`, or lie there already), the "telegraph pole" trees still
//                    standing, stripped and scorched, at ground zero, scorched ground, a standing forest beyond `radius`.
//   structure.chum   an Evenki reindeer herder's conical tent of poles and bark / hide covers (can shudder in the blast).
import * as THREE from 'three';
import { makePuffs, syncEnv, hf, clamp, lerp, sstep } from './f_common.js';
import { glowSprite } from './a_entry.js';
import { explicitParams } from './a_asteroid.js';
import { coniferGeo, trunkGeo, mergeGeometries } from './w_common.js';
import { patchMaterial } from '../shared/env.js';

const DEG = Math.PI / 180;
const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
const stdM = (o) => patchMaterial(new THREE.MeshStandardMaterial(o));
const headingYaw = (h) => Math.PI - (h ?? 180) * DEG;                 // a +Z-facing model turned to face compass h

// ── fx.airburst ─────────────────────────────────────────────────────────────────────────────────────────────────
async function buildAirburst(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.airburst']);
  const at = item.at || [0, 0];
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  const root = new THREE.Group(); root.name = 'fx.airburst'; root.position.set(at[0], gy, at[1]);
  const alt = num(p.alt, 8500), tB = num(p.t_burst, 1.5), yieldMt = num(p.yield, 12);
  // the shock reaches the stage origin (where the camera / YOU usually are) at t_arrive: screen time, not real time
  const dStage = Math.hypot(at[0], at[1]);
  const tA = num(p.t_arrive, tB + Math.min(6, Math.hypot(dStage, alt) / 343));
  const Rmax = Math.max(dStage * 1.4, num(p.radius, 30000));
  const vFoot = Math.max(50, (dStage - 0) / Math.max(0.3, tA - tB));   // foot speed that makes it arrive on time
  const footR = (t) => (t < tB ? 0 : Math.min(Rmax, (t - tB) * vFoot * (0.55 + 0.45 * Math.min(1, (t - tB) / Math.max(0.3, tA - tB)))));
  // flash
  const flash = glowSprite([1.0, 0.95, 0.88], 26), halo = glowSprite([1.0, 0.85, 0.65], 17);
  flash.position.set(0, alt, 0); halo.position.set(0, alt, 0); root.add(flash, halo);
  const fireball = glowSprite([1.0, 0.55, 0.2], 25); fireball.position.set(0, alt, 0); root.add(fireball);
  const lum = (t) => (t < tB ? 0 : (1 - Math.exp(-(t - tB) / 0.04)) * (Math.exp(-(t - tB) / 0.6) * 1.0 + Math.exp(-(t - tB) / 4) * 0.12));
  const flashAt = (t) => clamp(lum(t) * 1.4 - 0.1);
  const L = new THREE.DirectionalLight(new THREE.Color(1.0, 0.95, 0.9), 0);
  L.castShadow = p.shadows !== false; if (L.castShadow) { L.shadow.mapSize.set(2048, 2048); const sc = L.shadow.camera; sc.left = sc.bottom = -70; sc.right = sc.top = 70; sc.near = 1; sc.far = 4000; L.shadow.bias = -0.0004; L.shadow.normalBias = 0.03; }
  root.add(L, L.target);
  // the shock: a faint refracting dome shell (a bright thin edge) coming down, and at its foot a racing dust/snow wall
  const shellMat = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
varying vec3 vN; varying vec3 vW; uniform float uI; void main(){
  #include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - abs(dot(normalize(vN), V)), 5.0);
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * (rim + 0.06) * uI, 1.0); }`,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), shellMat); shell.userData.noQA = true; shell.frustumCulled = false; shell.renderOrder = 16; root.add(shell);
  const dust = makePuffs(ctx, { count: 2600, tint: p.snow ? [0.92, 0.93, 0.96] : [0.62, 0.56, 0.48], near: 8, groundFade: 0.04, fog: 0.8, softK: 0.4 });
  root.add(dust.mesh);
  const cam = new THREE.Vector3(), fw = new THREE.Vector3(), tmp = new THREE.Vector3();
  const cues = [{ t: +tB.toFixed(2), sound: 'airburst_flash' }, { t: +tA.toFixed(2), sound: 'shock_wave_boom', gain: 1 }, { t: +(tA + 0.15).toFixed(2), sound: 'glass_shatter', gain: 0.9 }];
  function update(t, clock, camera) {
    syncEnv(ctx);
    if (camera) camera.getWorldPosition(cam);
    const I = lum(t);
    flash.material.uniforms.uS.value = 400; flash.material.uniforms.uMinPx.value = 50 + 320 * I; flash.material.uniforms.uI.value = I * 3.5;
    halo.material.uniforms.uS.value = 6000; halo.material.uniforms.uMinPx.value = 900 * Math.min(1.2, I); halo.material.uniforms.uI.value = I * 0.6;
    const fb = t < tB ? 0 : Math.exp(-(t - tB) / 5) * sstep(0, 0.3, t - tB);
    fireball.material.uniforms.uS.value = 300 + 900 * Math.sqrt(Math.max(0, t - tB)); fireball.material.uniforms.uMinPx.value = 40 * fb; fireball.material.uniforms.uI.value = fb * 0.9;
    L.intensity = I * num(p.light, 9); L.visible = L.intensity > 0.01;
    if (camera && L.visible) {
      camera.getWorldDirection(fw); fw.y = 0; if (fw.lengthSq() < 1e-6) fw.set(0, 0, -1); fw.normalize();
      L.target.position.copy(cam).addScaledVector(fw, 25).sub(root.position); L.target.position.y = cam.y - root.position.y - 2;
      tmp.set(0, alt, 0).sub(L.target.position).normalize(); L.position.copy(L.target.position).addScaledVector(tmp, 1500); L.target.updateMatrixWorld();
    }
    // the shock dome: radius grows from the burst; visible as a thin refracting edge only in its first seconds
    const rs = t < tB ? 0 : Math.hypot(footR(t), Math.max(0, alt * (1 - (t - tB) / Math.max(0.3, (tA - tB) * 0.35))) );
    shell.visible = t > tB && rs > 10; shell.position.set(0, alt, 0); shell.scale.setScalar(Math.max(1, (t - tB) * Math.max(vFoot, 340) * 0.9));
    const domeK = num(p.dome, 0.1);                                    // 0.1 a faint refraction .. 1 a clearly visible translucent dome
    shellMat.uniforms.uI.value = t > tB ? domeK * (domeK > 0.2 ? 1 : Math.exp(-(t - tB) / 1.5)) : 0;
    // the dust wall at the foot of the shock: a ring of billows racing outward, torn up from the ground
    dust.begin();
    const fr = footR(t);
    if (fr > 5) {
      const N = 2400, ringW = 60 + fr * 0.02;
      for (let i = 0; i < N; i++) {
        const aC = Math.atan2(cam.z - root.position.z, cam.x - root.position.x), a = hf(i, 13) < 0.8 ? aC + (hf(i, 1) - 0.5) * Math.min(Math.PI * 2, 2 * 6000 / Math.max(fr, 1)) : hf(i, 1) * Math.PI * 2;
        // only the part of the ring near the camera matters: place more billows toward the stage direction
        const k = hf(i, 2), r = fr - ringW * k * 3;
        if (r < 5) continue;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const dxC = x + root.position.x - cam.x, dzC = z + root.position.z - cam.z, dC = Math.hypot(dxC, dzC);
        if (dC > 12000) continue;                                   // too far to matter
        const age = k * 3 * ringW / vFoot;
        const h = (6 + 26 * hf(i, 3)) * (0.4 + age * 0.6) + ctx.ground.height(x + root.position.x, z + root.position.z) - gy;
        const size = (8 + 22 * hf(i, 4)) * (0.6 + age * 0.9) * (1 + dC / 1500);
        dust.push(x, h, z, size, hf(i, 5) * 6.28 + t * 0.2, 0.55 * (1 - k * 0.8) * sstep(0, 0.4, t - tB), i & 3, -1e9, 0.95, 0, 0, 0.1, clamp(0.3 + k), 0.8, hf(i, 6));
      }
    }
    dust.end(camera);
  }
  update(0, 0, null);
  return { root, radius: 500, height: alt, snapped: true, update, flashAt, cues, farNeed: Math.hypot(dStage, alt) + 60000, anchors: { burst: new THREE.Vector3(0, alt, 0) },
    shockAt: (x, z) => { const d = Math.hypot(x - at[0], z - at[1]); return tB + (tA - tB) * (d / Math.max(1, dStage)); } };
}

// ── fx.window_blast ─────────────────────────────────────────────────────────────────────────────────────────────
async function buildWindow(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.window_blast']);
  const at = item.at || [0, 0];
  const gy = ctx.ground ? ctx.ground.height(at[0], at[1]) : 0;
  const root = new THREE.Group(); root.name = 'fx.window_blast';
  root.position.set(at[0], p.y != null ? +p.y : gy + num(p.elev, 0), at[1]); root.rotation.y = headingYaw(item.heading ?? 180);
  const W = num(p.width, 4.8), H = num(p.height, 2.6), sill = num(p.sill, 0.85), cols = clamp(Math.round(num(p.panes, 4)), 1, 12), rows = 2;
  const tH = num(p.t_hit, 2.0), force = num(p.force, 1);
  // the wall (with the opening), the frame, the glass
  const wallM = stdM({ color: p.wall_color || 0xd9d4ca, roughness: 0.9 }), frameM = stdM({ color: p.frame_color || 0xeeeeea, roughness: 0.5 }), glassM = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, roughness: 0.04, metalness: 0.0, transmission: 0.0, transparent: true, opacity: 0.22, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  patchMaterial(glassM);
  const wallT = 0.3, WW = W + 3, HH = sill + H + 0.9;
  const addBox = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; root.add(b); return b; };
  addBox(WW, sill, wallT, wallM, 0, sill / 2, 0); addBox(WW, HH - sill - H, wallT, wallM, 0, sill + H + (HH - sill - H) / 2, 0);
  addBox(1.5, H, wallT, wallM, -(W / 2 + 0.75), sill + H / 2, 0); addBox(1.5, H, wallT, wallM, W / 2 + 0.75, sill + H / 2, 0);
  // room: (the hook) an office / classroom on the Nth floor of a block in the OUTSIDE world, so the window shows the real
  // sky, the city and the fireball, and the fireball's light throws the desks' shadows across the floor
  const RM = p.room ? (typeof p.room === 'object' ? p.room : {}) : null;
  const roomAnchors = {};
  let aptAnim = null;                                                  // E5: the apartment's own motion (curtains, lamp, books)
  if (RM) {
    const Wr = Math.max(WW, num(RM.width, 8)), Dr = num(RM.depth, 7), style = String(RM.style || 'office');
    if (Wr > WW) { const fw = (Wr - WW) / 2; addBox(fw, HH, wallT, wallM, -(WW / 2 + fw / 2), HH / 2, 0); addBox(fw, HH, wallT, wallM, WW / 2 + fw / 2, HH / 2, 0); }
    const floorM = style === 'apartment' ? stdM({ map: aptTiles(Wr, Dr), roughness: 0.6 }) : stdM({ color: style === 'classroom' ? 0x9c8f7a : 0x5d6168, roughness: 0.9 }), ceilM = stdM({ color: 0xe8e6e0, roughness: 0.95 });
    addBox(Wr, 0.25, Dr, floorM, 0, -0.125, -Dr / 2); addBox(Wr, 0.25, Dr, ceilM, 0, HH + 0.125, -Dr / 2);
    addBox(0.2, HH, Dr, wallM, -Wr / 2, HH / 2, -Dr / 2); addBox(0.2, HH, Dr, wallM, Wr / 2, HH / 2, -Dr / 2); addBox(Wr, HH, 0.2, wallM, 0, HH / 2, -Dr);
    const wood = stdM({ color: 0x8a6a4a, roughness: 0.7 }), metal = stdM({ color: 0x3a3d42, roughness: 0.5, metalness: 0.5 }), screen = stdM({ color: 0x0e1216, roughness: 0.3, metalness: 0.2 }), seat = stdM({ color: 0x2c3036, roughness: 0.8 });
    const desk = (x, z, w, d, h, rot = 0, kid = false) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; root.add(g); g.userData.d = d;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), wood); top.position.y = h; top.castShadow = top.receiveShadow = true; g.add(top);
      for (const [lx, lz] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, 0.04), metal); l.position.set(lx, h / 2, lz); l.castShadow = true; g.add(l); }
      if (!kid) { const mo = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.03), screen); mo.position.set(0, h + 0.28, d * 0.25); mo.castShadow = true; g.add(mo); const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), metal); st.position.set(0, h + 0.08, d * 0.25); g.add(st); }
      const ch = new THREE.Group(); ch.position.set(0, 0, kid ? d / 2 + 0.3 : -(d / 2 + 0.3)); if (!kid) ch.rotation.y = Math.PI; g.add(ch); g.userData.chair = ch;
      const sh = kid ? 0.36 : 0.46, sw = kid ? 0.36 : 0.46;
      const sb = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.05, sw), seat); sb.position.y = sh; sb.castShadow = true; ch.add(sb);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(sw, kid ? 0.32 : 0.45, 0.04), seat); bk.position.set(0, sh + (kid ? 0.18 : 0.26), sw / 2); bk.castShadow = true; ch.add(bk);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, sh, 6), metal); pl.position.y = sh / 2; ch.add(pl);
      return g;
    };
    const deskList = [];
    const _desk = desk; const desk2 = (...args) => { const g = _desk(...args); deskList.push({ g, kid: !!args[6] }); return g; };
    if (style === 'classroom') {                                         // rows of children's desks facing the side wall with the board
      const rows = Math.max(1, Math.round(num(RM.rows, 5))), cols = Math.max(1, Math.round(num(RM.cols, 3)));   // double desks (2 children each)
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) desk2(cols === 1 ? 0 : -Wr / 2 + 1.5 + c * (Wr - 3.0) / (cols - 1), -1.5 - r * Math.min(1.5, (Dr - 3.2) / Math.max(1, rows - 1)), 1.15, 0.5, 0.64, 0, true);
      desk2(Wr / 2 - 1.4, -Dr + 1.3, 1.4, 0.7, 0.75, Math.PI);
      const board = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.04), stdM({ color: 0x1f3a2c, roughness: 0.85 })); board.position.set(0, 1.5, -Dr + 0.13); root.add(board);
    } else if (style === 'apartment') {
      aptAnim = buildApartment(root, { Wr, Dr, HH, W, H, sill, tH, force, cal: RM.calendar, clock: RM.clock, shutters: RM.shutters !== false, sunlight: RM.sunlight, sun_side: RM.sun_side, stdM, addBox, wood });
    } else if (style !== 'empty') {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) desk2(-Wr / 4 + c * Wr / 2, -1.9 - r * 2.3, 1.5, 0.75, 0.74, 0);
    }
    // stand points for people (aboard.js: cast "at": "objects:N.window" | ".desk1" ...; offset [dx, dz] in the room)
    const stand = (name, x, z, face) => { const o = new THREE.Object3D(); o.name = name; o.position.set(x, 0, z); o.userData = { stand: true, floor: 0, face, offset: [0, 0] }; root.add(o); roomAnchors[name] = o; };
    stand('window', 0, -0.55, 'bow'); stand('window_l', -W / 4, -0.55, 'bow'); stand('window_r', W / 4, -0.55, 'bow'); stand('room', 0, -Dr / 2, 'bow'); stand('door', 0, -Dr + 0.6, 'bow');
    deskList.forEach((dk, i) => { const c = dk.g.userData.chair; const wp = new THREE.Vector3(); c.getWorldPosition(wp); root.worldToLocal(wp); stand('desk' + (i + 1), wp.x, wp.z, dk.kid ? 'stern' : 'bow'); });
    // the rest of the building: floors below and above (a plain block with a window façade)
    const lvl = root.position.y - gy, below = lvl > 0.5, above = num(RM.floors_above, 3) * 3.3;
    const fac = (w, h, d) => { const t = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#c7c1b5'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#2b3440'; g.fillRect(10, 30, 108, 60); return new THREE.CanvasTexture(c); })(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, w / 3.2), Math.max(1, h / 3.3)); t.colorSpace = THREE.SRGBColorSpace; return stdM({ map: t, roughness: 0.8 }); };
    if (below) { const lb = lvl - 0.26, b = addBox(Wr + 2, lb, Dr + 1.2, fac(Wr + 2, lb, Dr + 1.2), 0, -0.26 - lb / 2, -Dr / 2); b.receiveShadow = true; }   // E5: its top under the floor slab (was z-fighting the room's floor)
    if (above > 0) addBox(Wr + 2, above, Dr + 1.2, fac(Wr + 2, above, Dr + 1.2), 0, HH + 0.25 + above / 2, -Dr / 2);
  }
  const fT = 0.06;
  for (let i = 0; i <= cols; i++) addBox(fT, H, 0.1, frameM, -W / 2 + i * W / cols, sill + H / 2, 0);
  for (let j = 0; j <= rows; j++) addBox(W, fT, 0.1, frameM, 0, sill + j * H / rows, 0);
  const paneW = W / cols - fT, paneH = H / rows - fT;
  const panes = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(paneW, paneH), glassM); m.position.set(-W / 2 + (i + 0.5) * W / cols, sill + (j + 0.5) * H / rows, 0); m.userData.noQA = true; m.renderOrder = 5; root.add(m); panes.push(m);
  }
  // shards: instanced thin triangles, launched inward (+Z of the wall = into the room when heading faces the blast)
  const NS = clamp(Math.round(num(p.shards, 900)), 50, 3000);
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.4, 0, 0.5, -0.3, 0, 0.05, 0.55, 0], 3)); tri.computeVertexNormals();
  const shardM = new THREE.MeshPhysicalMaterial({ color: 0xe6f2f5, roughness: 0.05, metalness: 0.3, envMapIntensity: 2.2, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
  patchMaterial(shardM);
  const shards = new THREE.InstancedMesh(tri, shardM, NS); shards.frustumCulled = false; shards.userData.noQA = true; root.add(shards);
  const S = []; for (let i = 0; i < NS; i++) {
    const pi = Math.floor(hf(i, 1) * panes.length), pn = panes[pi];
    S.push({ x0: pn.position.x + (hf(i, 2) - 0.5) * paneW, y0: pn.position.y + (hf(i, 3) - 0.5) * paneH, vz: force * (4 + 11 * hf(i, 4)), vx: (hf(i, 5) - 0.5) * 3 * force, vy: (hf(i, 6) - 0.25) * 3 * force, size: 0.03 + 0.16 * Math.pow(hf(i, 7), 2), spin: 6 + 20 * hf(i, 8), ax: new THREE.Vector3(hf(i, 9) - 0.5, hf(i, 10) - 0.5, hf(i, 11) - 0.5).normalize(), dl: hf(i, 12) * 0.05 });
  }
  const dust = makePuffs(ctx, { count: 260, tint: [0.8, 0.79, 0.77], glow: [0, 0, 0], heat: [0, 0, 0], near: 0.4, groundFade: 0.1, softK: 0.3 }); root.add(dust.mesh);
  // blinds: slats that swing inward and flap
  const blinds = []; if (p.blinds === true || (p.blinds !== false && !p.room)) {   // a room's window is clear by default (the hook looks out through it)
    const bm = stdM({ color: 0xe9e6de, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < cols; i++) { const g = new THREE.Group(); g.position.set(-W / 2 + (i + 0.5) * W / cols, sill + H - 0.05, -0.12); root.add(g); const sl = []; for (let k = 0; k < 22; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(paneW * 0.98, 0.004, 0.05), bm); s.position.y = -k * H * 0.042; g.add(s); sl.push(s); } blinds.push({ g, sl, i }); }
  }
  // a room is filmed from inside (as interior.*): its walls, floors and furniture are not camera obstacles
  root.traverse((o) => { if (o.isMesh) o.userData.noQA = true; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const floorY = -(root.position.y - gy) + num(p.floor, 0);
  function update(t) {
    const dt = t - tH;
    if (aptAnim) aptAnim(t, dt);
    for (const pn of panes) pn.visible = dt < 0.02;
    for (let i = 0; i < NS; i++) {
      const s = S[i], d = dt - s.dl;
      if (d < 0) { m4.makeScale(0, 0, 0); shards.setMatrixAt(i, m4); continue; }
      let x = s.x0 + s.vx * d, z = -s.vz * d, y = s.y0 + s.vy * d - 4.9 * d * d;
      const yF = floorY + 0.01;
      if (y < yF) {                                                  // hit the floor: slide to a stop, lie flat
        const tl = (s.vy + Math.sqrt(Math.max(0, s.vy * s.vy + 19.6 * (s.y0 - yF)))) / 9.8, ts = Math.max(0, Math.min(d, tl));
        const xl = s.x0 + s.vx * ts, zl = -s.vz * ts, slide = Math.min(d - ts, 0.4);
        x = xl + s.vx * 0.3 * slide * (1 - slide / 0.8); z = zl - s.vz * 0.3 * slide * (1 - slide / 0.8); y = yF;
        q.setFromAxisAngle(v.set(1, 0, 0), -Math.PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(v.set(0, 0, 1), s.spin));
      } else q.setFromAxisAngle(s.ax, s.spin * d);
      sc.setScalar(s.size); m4.compose(v.set(x, y, z), q, sc); shards.setMatrixAt(i, m4);
    }
    shards.instanceMatrix.needsUpdate = true;
    for (const b of blinds) {
      const k = dt < 0 ? 0 : Math.min(1, dt / 0.15) * Math.exp(-Math.max(0, dt - 0.3) / 2.5);
      b.g.rotation.x = k * (1.1 + 0.25 * Math.sin(dt * 9 + b.i)) * force;
      b.sl.forEach((s, j) => { s.rotation.x = k * 0.9 * Math.sin(dt * 14 + j * 0.5 + b.i); });
    }
    dust.begin();
    if (dt > 0) for (let i = 0; i < 240; i++) {
      const life = 2.5, age = dt - hf(i, 21) * 0.2; if (age < 0 || age > life) continue;
      const x = (hf(i, 22) - 0.5) * W, y = sill + hf(i, 23) * H, z = -(0.3 + age * (2.5 + 3 * hf(i, 24)) * Math.exp(-age / 1.2) * force);
      dust.push(x, y - age * 0.2, z, 0.12 + age * 0.3, hf(i, 25) * 6.28, 0.08 * (1 - age / life), i & 3, floorY - 0.5, 0.9, 0, 0, 0, 0.8, 0.9, hf(i, 26));
    }
    dust.end();
  }
  update(0);
  return { root, radius: WW / 2, height: HH, snapped: true, update, anchors: { pane: new THREE.Vector3(0, sill + H / 2, 0), ...roomAnchors }, cues: [{ t: tH, sound: 'glass_shatter' }],
    flashAt: () => 0 };
}

// ── E5 (explosions, 30 Sep 2026): the Beirut apartment (room style 'apartment') ─────────────────────────────────────
// a high-ceilinged Beirut living room: patterned cement tiles, a rug, a sofa and a coffee table, a bookshelf whose books
// fall at the blast, a lamp hanging from the ceiling that swings, long curtains that stream into the room, green wooden
// shutters folded open outside the tall window, a wall calendar (RM.calendar text). The room's own motion runs off t_hit.
let APT_TILES = null;
function aptTiles(Wr, Dr) {
  if (!APT_TILES) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#d9cdb4'; g.fillRect(0, 0, 256, 256);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = i * 64, y = j * 64; g.fillStyle = (i + j) % 2 ? '#b9a07a' : '#cdbb97'; g.fillRect(x + 2, y + 2, 60, 60);
      g.fillStyle = '#7d5a3c'; g.beginPath(); g.moveTo(x + 32, y + 8); g.lineTo(x + 56, y + 32); g.lineTo(x + 32, y + 56); g.lineTo(x + 8, y + 32); g.closePath(); g.fill();
      g.fillStyle = '#3f5d5a'; g.beginPath(); g.arc(x + 32, y + 32, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8dcc2'; for (const [a, b] of [[0, 0], [64, 0], [0, 64], [64, 64]]) { g.beginPath(); g.arc(x + a, y + b, 10, 0, Math.PI * 2); g.fill(); }
    }
    APT_TILES = new THREE.CanvasTexture(c); APT_TILES.wrapS = APT_TILES.wrapT = THREE.RepeatWrapping; APT_TILES.colorSpace = THREE.SRGBColorSpace; APT_TILES.anisotropy = 8;
  }
  const t = APT_TILES.clone(); t.needsUpdate = true; t.repeat.set(Wr / 1.2, Dr / 1.2); return t;
}
function buildApartment(root, o) {
  const { Wr, Dr, HH, W, H, sill, tH, force, stdM, addBox, wood } = o;
  const fabric = stdM({ color: 0x5f6f62, roughness: 0.95 }), cream = stdM({ color: 0xe9e2d0, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
  // rug, sofa, coffee table, armchair
  const rc = document.createElement('canvas'); rc.width = rc.height = 256; const rg = rc.getContext('2d');
  rg.fillStyle = '#8a2f28'; rg.fillRect(0, 0, 256, 256);                                     // a red Persian-style rug: border bands, a medallion
  rg.strokeStyle = '#e2cfa0'; rg.lineWidth = 6; rg.strokeRect(10, 10, 236, 236); rg.strokeStyle = '#1f3048'; rg.lineWidth = 10; rg.strokeRect(24, 24, 208, 208); rg.strokeStyle = '#e2cfa0'; rg.lineWidth = 3; rg.strokeRect(36, 36, 184, 184);
  for (let i = 0; i < 40; i++) { rg.fillStyle = i % 2 ? '#c9a15a' : '#e2cfa0'; rg.fillRect(28 + (i % 10) * 20, i < 10 ? 26 : i < 20 ? 224 : 28, 6, 6); }
  rg.fillStyle = '#e2cfa0'; rg.beginPath(); rg.moveTo(128, 70); rg.lineTo(178, 128); rg.lineTo(128, 186); rg.lineTo(78, 128); rg.closePath(); rg.fill();
  rg.fillStyle = '#1f3048'; rg.beginPath(); rg.moveTo(128, 88); rg.lineTo(162, 128); rg.lineTo(128, 168); rg.lineTo(94, 128); rg.closePath(); rg.fill();
  rg.fillStyle = '#b8483a'; rg.beginPath(); rg.arc(128, 128, 16, 0, Math.PI * 2); rg.fill();
  const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.0).rotateX(-Math.PI / 2), stdM({ map: rt, roughness: 0.95 })); rug.position.set(-0.2, 0.006, -Dr * 0.45); rug.receiveShadow = true; root.add(rug);
  const sx = -0.2, sz = -Dr * 0.45 - 1.35;
  addBox(2.1, 0.42, 0.9, fabric, sx, 0.21, sz); addBox(2.1, 0.5, 0.22, fabric, sx, 0.62, sz - 0.34); addBox(0.2, 0.62, 0.9, fabric, sx - 1.05, 0.31, sz); addBox(0.2, 0.62, 0.9, fabric, sx + 1.05, 0.31, sz);
  addBox(1.0, 0.05, 0.55, wood, -0.2, 0.42, -Dr * 0.45 + 0.1); for (const [dx, dz] of [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]]) addBox(0.05, 0.4, 0.05, wood, -0.2 + dx, 0.2, -Dr * 0.45 + 0.1 + dz);
  // the bookshelf on the right wall; books (a few fall at the blast)
  const bx = Wr / 2 - 0.3, bz = -Dr * 0.55;
  addBox(0.34, 2.1, 1.1, wood, bx, 1.05, bz);
  const books = [], BC = [0x7a2a24, 0x2d3f5a, 0x3f5d3a, 0xc9a24a, 0x5a4a6a, 0x8a6a3a, 0xdad2c0];
  for (let sh = 0; sh < 4; sh++) {
    addBox(0.36, 0.03, 1.1, wood, bx - 0.01, 0.35 + sh * 0.45, bz);
    for (let k = 0; k < 16; k++) {
      const hgt = 0.22 + 0.08 * hf(k + sh * 16, 3), wdt = 0.035 + 0.02 * hf(k + sh * 16, 4);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, hgt, wdt), stdM({ color: BC[(k * 3 + sh) % BC.length], roughness: 0.8 }));
      m.position.set(bx - 0.08, 0.365 + sh * 0.45 + hgt / 2, bz - 0.5 + k * 0.064); m.castShadow = true; root.add(m);
      if (hf(k + sh * 16, 9) < 0.28) books.push({ m, p0: m.position.clone(), r0: m.rotation.clone(), d: 0.05 + 0.4 * hf(k, 11), v: 0.6 + 1.4 * hf(k, 12), s: hf(k, 13) });
    }
  }
  // the ceiling lamp on its cord (swings after the blast)
  const lampG = new THREE.Group(); lampG.position.set(-0.2, HH, -Dr * 0.45); root.add(lampG);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 6), stdM({ color: 0x222222, roughness: 0.6 })); cord.position.y = -0.45; lampG.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.24, 24, 1, true), stdM({ color: 0xd9c9a0, roughness: 0.7, side: THREE.DoubleSide })); shade.position.y = -0.98; lampG.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.4) })); bulb.position.y = -1.02; lampG.add(bulb);
  // curtains: two long panels inside the window, hanging in folds; at the blast they stream into the room
  const curt = [];
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(0.8, H + 0.35, 18, 24), P = g.attributes.position, base = P.array.slice();
    const m = new THREE.Mesh(g, cream); const piv = new THREE.Group(); piv.position.set(s * (W / 2 + 0.02), sill + H + 0.25, -0.18); root.add(piv); m.position.y = -(H + 0.35) / 2; piv.add(m);   // sheer: no shadow; gathered at the sides (the view stays open)
    curt.push({ piv, g, base, s });
  }
  addBox(W + 1.2, 0.04, 0.04, stdM({ color: 0x7a6a50, metalness: 0.6, roughness: 0.4 }), 0, sill + H + 0.27, -0.18);
  // the evening sun through the window (beat 001: warm low light across the tiled floor, the window bars' shadows on it),
  // whatever the scene's sun does; and a warm bounce so the room is not lit only by the blue sky outside
  const sunK = num(o.sunlight, 1);
  if (sunK > 0) {
    const az = num(o.sun_side, 0.3);
    const sl = new THREE.SpotLight(new THREE.Color(1.0, 0.7, 0.42), 2.2 * sunK, 0, 0.62, 0.3, 0);
    sl.position.set(Math.sin(az) * 9, sill + H + 3.4, Math.cos(az) * 9); sl.target.position.set(-Math.sin(az) * 1.4, 0, -2.4);
    sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048); sl.shadow.bias = -0.0003; sl.shadow.normalBias = 0.02; sl.shadow.camera.near = 2; sl.shadow.camera.far = 40;
    root.add(sl, sl.target);
    const fill = new THREE.PointLight(new THREE.Color(1.0, 0.8, 0.6), 0.5 * sunK, 0, 0); fill.position.set(0, HH * 0.75, -Dr * 0.45); root.add(fill);
  }
  // green wooden shutters folded open against the façade outside
  if (o.shutters) {
    const sm = stdM({ color: 0x4f6b52, roughness: 0.75 });
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      const pnl = new THREE.Group(); pnl.position.set(s * (W / 2 + 0.2 + k * 0.62), sill, 0.2); root.add(pnl);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.6, H, 0.04), sm); fr.position.y = H / 2; fr.castShadow = true; pnl.add(fr);
      for (let l = 0; l < 18; l++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.07), sm); sl.position.set(0, 0.12 + l * (H - 0.24) / 17, 0.02); sl.rotation.x = 0.5; pnl.add(sl); }
    }
  }
  // skirting board and cornice round the room, a wall clock at 6:05 (the hook), a framed picture on the window wall
  const trimM = stdM({ color: 0xd8cfbd, roughness: 0.7 });
  for (const [w, x, z, ry] of [[Wr, 0, -Dr + 0.11, 0], [Dr, -Wr / 2 + 0.11, -Dr / 2, Math.PI / 2], [Dr, Wr / 2 - 0.11, -Dr / 2, Math.PI / 2]]) {
    const sk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.03), stdM({ color: 0x6b4f35, roughness: 0.6 })); sk.position.set(x, 0.07, z); sk.rotation.y = ry; root.add(sk);
    const co = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.08), trimM); co.position.set(x, HH - 0.06, z); co.rotation.y = ry; root.add(co);
  }
  const clk = document.createElement('canvas'); clk.width = clk.height = 256; const kg = clk.getContext('2d');
  kg.fillStyle = '#f2ede2'; kg.beginPath(); kg.arc(128, 128, 120, 0, Math.PI * 2); kg.fill(); kg.lineWidth = 10; kg.strokeStyle = '#3a2a1c'; kg.stroke();
  kg.fillStyle = '#222'; for (let h = 0; h < 12; h++) { const a = h / 12 * Math.PI * 2; kg.fillRect(128 + Math.sin(a) * 100 - 3, 128 - Math.cos(a) * 100 - 8, 6, 16); }
  const hand = (a, len, wdt) => { kg.save(); kg.translate(128, 128); kg.rotate(a); kg.fillStyle = '#1a1a1a'; kg.fillRect(-wdt / 2, -len, wdt, len + 10); kg.restore(); };
  const [ch, cm2] = String(o.clock || '6:05').split(':').map(Number); hand(((ch % 12) + cm2 / 60) / 12 * Math.PI * 2, 60, 9); hand(cm2 / 60 * Math.PI * 2, 92, 6);
  const clkT = new THREE.CanvasTexture(clk); clkT.colorSpace = THREE.SRGBColorSpace;
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), stdM({ map: clkT, roughness: 0.5 })); clock.position.set(-Wr / 2 + 0.105, 2.35, -1.6); clock.rotation.y = Math.PI / 2; root.add(clock);
  const pic = document.createElement('canvas'); pic.width = 256; pic.height = 192; const pg = pic.getContext('2d');
  const sky = pg.createLinearGradient(0, 0, 0, 192); sky.addColorStop(0, '#9fb7c9'); sky.addColorStop(0.6, '#e8d9b8'); sky.addColorStop(1, '#6f8a5a'); pg.fillStyle = sky; pg.fillRect(0, 0, 256, 192);
  pg.fillStyle = '#51663f'; pg.beginPath(); pg.moveTo(0, 150); pg.bezierCurveTo(80, 100, 150, 140, 256, 110); pg.lineTo(256, 192); pg.lineTo(0, 192); pg.fill();
  pg.fillStyle = '#3d4c33'; for (let i = 0; i < 5; i++) { pg.fillRect(40 + i * 45, 105 + (i % 2) * 10, 6, 30); pg.beginPath(); pg.arc(43 + i * 45, 100 + (i % 2) * 10, 16, 0, Math.PI * 2); pg.fill(); }
  const picT = new THREE.CanvasTexture(pic); picT.colorSpace = THREE.SRGBColorSpace;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.76, 0.04), stdM({ color: 0x5a3d25, roughness: 0.5 })); frame.position.set(Wr / 2 - 1.3, 1.75, -Dr + 0.13); root.add(frame);
  const picM = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.64), stdM({ map: picT, roughness: 0.6 })); picM.position.set(Wr / 2 - 1.3, 1.75, -Dr + 0.155); root.add(picM);
  // the calendar on the wall beside the window
  if (o.cal !== false) {
    const cc = document.createElement('canvas'); cc.width = 256; cc.height = 360; const cg = cc.getContext('2d');
    cg.fillStyle = '#f4f0e6'; cg.fillRect(0, 0, 256, 360); cg.fillStyle = '#b3261e'; cg.fillRect(0, 0, 256, 70);
    const txt = String(o.cal || 'TUESDAY 4 AUGUST 2020').toUpperCase().split(' ');
    cg.fillStyle = '#f4f0e6'; cg.font = 'bold 34px Inter, sans-serif'; cg.textAlign = 'center'; cg.fillText(txt[0] || '', 128, 48);
    cg.fillStyle = '#1b1b1b'; cg.font = 'bold 150px Inter, sans-serif'; cg.fillText(txt[1] || '', 128, 225); cg.font = 'bold 36px Inter, sans-serif'; cg.fillText((txt[2] || '') + ' ' + (txt[3] || ''), 128, 300);
    const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace;
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.48), stdM({ map: ct, roughness: 0.9 })); cal.position.set(Wr / 2 - 0.105, 1.55, -0.9); cal.rotation.y = -Math.PI / 2; root.add(cal);
  }
  return (t, dt) => {
    // curtains: hang in soft folds, then blow in and stream horizontally, fluttering
    const blow = dt < 0 ? 0 : Math.min(1, dt / 0.25) * (0.85 + 0.15 * Math.sin(dt * 9)) * Math.exp(-Math.max(0, dt - 3) / 6) * Math.min(1.3, force);
    for (const c of curt) {
      const P = c.g.attributes.position, B = c.base;
      for (let i = 0; i < P.count; i++) {
        const x = B[i * 3], y = B[i * 3 + 1], v = (0.5 - y / (H + 0.35));   // 0 at the rail .. 1 at the hem
        const fold = 0.05 * Math.sin(x * 22 + c.s) * (1 - 0.6 * blow);
        const stream = blow * v * (H + 0.35) * 0.95, flutter = blow * 0.12 * Math.sin(dt * 14 + y * 5 + x * 7) * v;
        P.setXYZ(i, x, y + stream * 0.55 * v, fold - stream + flutter);
      }
      P.needsUpdate = true; c.g.computeVertexNormals();
    }
    // the lamp swings
    const sw = dt < 0 ? 0 : 0.55 * Math.min(1, force) * Math.exp(-dt / 3.5) * Math.sin(dt * 3.1);
    lampG.rotation.x = sw; lampG.rotation.z = 0.4 * sw * Math.sin(dt * 1.7);
    // books tumble off the shelf
    for (const b of books) {
      const x = dt - b.d; if (x <= 0) { b.m.position.copy(b.p0); b.m.rotation.copy(b.r0); continue; }
      const fall = Math.min(x, Math.sqrt(2 * b.p0.y / 9.81)), y = Math.max(0.02, b.p0.y - 4.9 * fall * fall);
      b.m.position.set(b.p0.x - b.v * Math.min(x, 0.6), y, b.p0.z + (b.s - 0.5) * 0.2 * x);
      b.m.rotation.set(b.r0.x + x * 3 * (b.s - 0.5), b.r0.y, b.r0.z + Math.min(Math.PI / 2, x * 4));
    }
  };
}

// ── fx.tunguska ─────────────────────────────────────────────────────────────────────────────────────────────────
async function buildTunguska(item, ctx) {
  const p = explicitParams(item, CATALOG['fx.tunguska']);
  const at = item.at || [0, 0];
  const G = ctx.ground;
  const root = new THREE.Group(); root.name = 'fx.tunguska'; root.position.set(at[0], 0, at[1]);
  const R = num(p.radius, 2500), Rpole = num(p.poles_radius, Math.min(450, R * 0.18)), n = clamp(Math.round(num(p.count, 26000)), 1000, 60000);
  const tBlast = p.t_blast != null ? +p.t_blast : null, vB = num(p.speed, 900), scorch = num(p.scorch, 1);
  const H0 = num(p.tree_height, 22);
  // trunks: bare stems with a few broken branch stubs (the needles were stripped by the blast)
  const stem = trunkGeo().clone(); const stubs = [];
  for (let k = 0; k < 7; k++) { const y = 0.45 + k * 0.07, a = k * 2.4; stubs.push(new THREE.CylinderGeometry(0.004, 0.007, 0.12, 4).rotateZ(Math.PI / 2 - 0.4).rotateY(a).translate(Math.cos(a) * 0.05, y, -Math.sin(a) * 0.05)); }
  const stemG = mergeGeometries([stem.toNonIndexed(), ...stubs.map((s) => { const g = s.toNonIndexed(); g.deleteAttribute('uv'); return g; })].map((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; }));
  const barkM = patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    { vec4 wo = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float dd = distance(wo.xyz, cameraPosition); transformed.xz *= clamp(dd / 260.0, 1.0, 9.0); }`);
  });
  barkM.userData.progKey = 'e2trunk';
  const trunks = new THREE.InstancedMesh(stemG, barkM, n); trunks.castShadow = true; trunks.receiveShadow = true; trunks.frustumCulled = false; trunks.userData.noQA = true;
  root.add(trunks);
  const col = new THREE.Color();
  const T = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(hf(i, 1)) * R * 1.02, a = hf(i, 2) * Math.PI * 2;
    const x = Math.cos(a) * r + (hf(i, 3) - 0.5) * 6, z = Math.sin(a) * r + (hf(i, 4) - 0.5) * 6;
    const h = H0 * (0.55 + 0.6 * hf(i, 5)), pole = r < Rpole && hf(i, 9) < 0.85;
    const dirA = Math.atan2(z, x) + (hf(i, 6) - 0.5) * 0.35;            // away from the centre, a little scatter
    T.push({ x, z, h, pole, dirA, r, broken: hf(i, 7) < 0.2 ? 0.35 + 0.4 * hf(i, 8) : 1 });
    const burnt = scorch * (1 - sstep(R * 0.35, R * 0.9, r)) * (0.6 + 0.4 * hf(i, 10));
    trunks.setColorAt(i, pole ? col.setRGB(lerp(0.3, 0.07, burnt), lerp(0.26, 0.06, burnt), lerp(0.22, 0.05, burnt)) : col.setRGB(lerp(0.4, 0.2, burnt), lerp(0.36, 0.18, burnt), lerp(0.31, 0.155, burnt)));
  }
  // the forest beyond the blast zone (and a patch near the centre left standing as poles): living conifers
  const nF = clamp(Math.round(num(p.edge_trees, 9000)), 0, 30000);
  const crownM = stdM({ vertexColors: true, roughness: 0.9 });
  const forest = new THREE.InstancedMesh(coniferGeo(), crownM, Math.max(1, nF)); forest.castShadow = true; forest.receiveShadow = true; forest.frustumCulled = false; forest.userData.noQA = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), ax = new THREE.Vector3();
  for (let i = 0; i < nF; i++) {
    const r = R * (1.02 + 0.9 * Math.sqrt(hf(i, 31))), a = hf(i, 32) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const gy = G.height(x + at[0], z + at[1]), h = H0 * (0.7 + 0.6 * hf(i, 33));
    m4.compose(v.set(x, gy, z), q.setFromAxisAngle(ax.set(0, 1, 0), hf(i, 34) * 6.28), sc.set(h * 0.9, h, h * 0.9)); forest.setMatrixAt(i, m4);
  }
  if (nF) root.add(forest);
  // scorched ground: a dark, radially streaked decal (burnt within ~0.6 R)
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g2 = cv.getContext('2d');
  const grd = g2.createRadialGradient(256, 256, 0, 256, 256, 256); grd.addColorStop(0, 'rgba(10,8,6,0.85)'); grd.addColorStop(0.45, 'rgba(25,18,12,0.6)'); grd.addColorStop(0.8, 'rgba(40,30,20,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g2.fillStyle = grd; g2.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 900; k++) { const a = hf(k, 41) * 6.28, r0 = 20 + hf(k, 42) * 200; g2.strokeStyle = `rgba(0,0,0,${0.08 + 0.1 * hf(k, 43)})`; g2.lineWidth = 1 + hf(k, 44) * 2; g2.beginPath(); g2.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g2.lineTo(256 + Math.cos(a) * (r0 + 30 + 40 * hf(k, 45)), 256 + Math.sin(a) * (r0 + 30 + 40 * hf(k, 45))); g2.stroke(); }
  const decalG = new THREE.PlaneGeometry(R * 2.1, R * 2.1, 96, 96).rotateX(-Math.PI / 2), DP = decalG.attributes.position;
  for (let i = 0; i < DP.count; i++) DP.setY(i, G.height(DP.getX(i) + at[0], DP.getZ(i) + at[1]) + 0.25);
  const decal = new THREE.Mesh(decalG, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.renderOrder = 1; decal.userData.noQA = true; if (scorch > 0) root.add(decal);
  const fallT = (d) => (tBlast == null ? -1e9 : tBlast + d / vB);       // when the front reaches distance d
  function place(t) {
    for (let i = 0; i < n; i++) {
      const s = T[i], gy = G.height(s.x + at[0], s.z + at[1]);
      let tilt = 0;
      if (!s.pole) { const tf = fallT(s.r); tilt = t < tf ? 0 : Math.min(1, ((t - tf) / 1.3) ** 2) * (Math.PI / 2 - 0.04); }
      // a pole: stripped, standing (slightly leaning); a felled tree: rotated about its base away from the centre
      ax.set(-Math.sin(s.dirA), 0, Math.cos(s.dirA));                  // horizontal axis perpendicular to the fall direction
      q.setFromAxisAngle(ax, -tilt);
      const hh = s.pole ? s.h * (0.55 + 0.3 * s.broken) : s.h * s.broken;
      m4.compose(v.set(s.x, gy - 0.1, s.z), q, sc.set(hh * 1.2, hh, hh * 1.2)); trunks.setMatrixAt(i, m4);
    }
    trunks.instanceMatrix.needsUpdate = true;
  }
  place(0);
  // the blast front as it sweeps the taiga: a dust wall (only when t_blast is set)
  const dust = tBlast != null ? makePuffs(ctx, { count: 1600, tint: [0.5, 0.45, 0.38], near: 10, groundFade: 0.05, fog: 0.8 }) : null;
  if (dust) root.add(dust.mesh);
  const cam = new THREE.Vector3();
  function update(t, clock, camera) {
    if (tBlast != null) place(t);
    if (!dust) return;
    syncEnv(ctx); if (camera) camera.getWorldPosition(cam);
    dust.begin();
    const fr = t < tBlast ? 0 : (t - tBlast) * vB;
    if (fr > 5 && fr < R * 1.6) for (let i = 0; i < 1500; i++) {
      const a = hf(i, 51) * 6.28, k = hf(i, 52), r = fr - 40 * k * 3; if (r < 5) continue;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x + at[0] - cam.x, z + at[1] - cam.z) > 7000) continue;
      const gy = G.height(x + at[0], z + at[1]);
      dust.push(x, gy + 8 + 22 * hf(i, 53) * (0.5 + k), z, (12 + 20 * hf(i, 54)) * (0.6 + k), hf(i, 55) * 6.28, 0.5 * (1 - k * 0.8), i & 3, -1e9, 0.9, 0, 0, 0.1, 0.4 + k * 0.4, 0.8, hf(i, 56));
    }
    dust.end(camera);
  }
  return { root, radius: R, height: H0, snapped: true, update, anchors: { center: new THREE.Vector3(0, 0, 0) }, contact: false,
    subjectAt: () => [at[0], G.height(at[0], at[1]) + H0 * 0.5, at[1]], subjectTop: H0 * 2, subjectCy: 0, footprint: [R * 2, R * 2] };
}

// ── structure.chum ──────────────────────────────────────────────────────────────────────────────────────────────
async function buildChum(item, ctx) {
  const p = explicitParams(item, CATALOG['structure.chum']);
  const at = item.at || [0, 0];
  const root = new THREE.Group(); root.name = 'structure.chum';
  root.position.set(at[0], ctx.ground ? ctx.ground.height(at[0], at[1]) : 0, at[1]);
  root.rotation.y = headingYaw(item.heading ?? 180);
  const Rb = num(p.radius, 3), Hh = num(p.height, 5.5);
  const poleM = stdM({ color: 0x6e5a44, roughness: 0.9 }), coverM = stdM({ color: p.cover === 'hide' ? 0x7a6450 : 0xb8a88c, roughness: 0.95, side: THREE.DoubleSide });
  for (let i = 0; i < 16; i++) {                                        // poles crossing at the top, sticking out
    const a = i / 16 * Math.PI * 2 + hf(i, 1) * 0.1, b = new THREE.Vector3(Math.cos(a) * Rb, 0, Math.sin(a) * Rb), top = new THREE.Vector3(-Math.cos(a) * 0.35, Hh + 0.9, -Math.sin(a) * 0.35);
    const L = b.distanceTo(top), c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, L, 5), poleM);
    c.position.copy(b).add(top).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(b).normalize()); c.castShadow = true; root.add(c);
  }
  // the cover: bark / hide panels on the cone, a smoke hole at the top, a door flap on the front
  const cg = new THREE.ConeGeometry(Rb * 1.02, Hh * 0.93, 24, 6, true, 0.35, Math.PI * 2 - 0.35), P = cg.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); const k = 1 + 0.03 * Math.sin(Math.atan2(P.getZ(i), P.getX(i)) * 24) + 0.02 * Math.sin(y * 7); P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k); }
  cg.computeVertexNormals(); cg.translate(0, Hh * 0.465, 0);
  const cover = new THREE.Mesh(cg, coverM); cover.castShadow = cover.receiveShadow = true; cover.rotation.y = Math.PI / 2 - 0.175; root.add(cover);
  const smoke = p.smoke !== false ? makePuffs(ctx, { count: 60, tint: [0.7, 0.7, 0.72], near: 1, groundFade: 0.1 }) : null;
  if (smoke) root.add(smoke.mesh);
  const tS = p.t_shake != null ? +p.t_shake : null;
  function update(t, clock, camera) {
    if (tS != null) { const d = t - tS; const k = d < 0 ? 0 : Math.exp(-d / 0.8) * Math.sin(d * 18); cover.rotation.z = 0.04 * k; cover.position.x = 0.06 * k; }
    if (smoke) { syncEnv(ctx); smoke.begin(); for (let i = 0; i < 40; i++) { const life = 6, age = (t + hf(i, 1) * life) % life; smoke.push(ctx.wind.x * age * 0.4 + (hf(i, 2) - 0.5) * 0.3, Hh + 0.8 + age * 0.9, ctx.wind.z * age * 0.4, 0.3 + age * 0.25, hf(i, 3) * 6.28, 0.25 * (1 - age / life), i & 3, -1e9, 0.9, 0, 0, 0.2, 0.6, 0.9, hf(i, 4)); } smoke.end(camera); }
  }
  update(0);
  return { root, radius: Rb * 1.1, height: Hh + 0.9, snapped: true, update, anchors: { door: new THREE.Vector3(0, 1, Rb) }, footprint: [Rb * 2, Rb * 2] };
}

export const CATALOG = {
  'fx.airburst': {
    desc: 'an asteroid exploding in the air over a place (Chelyabinsk, Tunguska): a flash brighter than the Sun with hard shadows swinging from it, the fireball, then the shock front coming down and racing across the ground as a dust/snow wall that reaches the stage (where YOU stand) at t_arrive; everything it crosses shakes (pair with fx.window_blast, cast struck_fall, camera shake at t_arrive). `at` = the ground point under the burst (km away); res.cues has the flash / shock / glass times',
    actions: ['burst'],
    params: { alt: 'burst altitude m', t_burst: 's', t_arrive: 's the shock reaches the stage', yield: 'Mt (info)', radius: 'm', snow: 'bool (white dust)', light: 'x', shadows: 'bool', dome: '0..1' },
    doc: { dome: '0..1 the shock dome: 0.1 a faint refraction (default), 0.6-1 a clearly visible translucent dome (with clock.freeze_at: the frozen blast wave between the explosion and the city)', alt: 'm (Chelyabinsk 29,700; Tunguska 8,500)', t_burst: 's: the flash', t_arrive: 's: the shock front passes the stage origin (screen time; default the real delay capped at 6 s)', radius: 'm the shock is drawn out to', snow: 'true = the dust wall is snow', light: 'x flash light (9)', shadows: 'false = no shadows from the flash' },
    footprint: [4000, 4000], height: 10000, snap: false, fly: true, tags: ['fx', 'airburst', 'asteroid', 'chelyabinsk', 'tunguska', 'flash', 'shock wave', 'blast'],
  },
  'fx.window_blast': {
    desc: 'a window wall that blows INWARD when the shock wave hits (t_hit): the panes burst into glinting shards flying into the room and raining onto the floor, the blinds and dust thrown in (Chelyabinsk). Its outside faces `heading`; stand it as the wall of an interior.* room or a façade, YOU / people inside react (shield_face, struck_fall)',
    actions: ['shatter'],
    params: { t_hit: 's', width: 'm (4.8)', height: 'm (2.6)', sill: 'm (0.85)', panes: 'int columns (4)', force: 'x', shards: 'int', blinds: 'bool', y: 'floor height m (absolute)', elev: 'floor height above the ground m (4th floor: 10)', floor: 'm (the floor under the window, relative)', room: 'true | {style: office|classroom|apartment|empty, width, depth, floors_above, rows, cols (classroom double desks: 5 x 3), calendar (apartment: the wall calendar text), clock (apartment: the wall clock time, 6:05), shutters (apartment: bool), sunlight (apartment: the warm evening sun shaft across the tiled floor 0..2, 1), sun_side (apartment: the shaft angle off the window normal, rad 0.3)}' },
    doc: { t_hit: 's the shock hits (put it past the shot for a window that only glows with the flash)', heading: 'compass deg the OUTSIDE faces (shards fly the other way, into the room)', force: 'x throw (1)', y: 'm: the floor level (default the ground; 4th floor = ground + 10)', room: 'THE HOOK: a whole room behind the window in the OUTSIDE world (floor, ceiling, walls, desks with monitors and chairs | classroom rows of children\'s desks + a board) on the floor `y` of an office block (floors below and floors_above): the window shows the real sky and city, the fireball light slides the desks\' shadows across the floor. Stand YOU / colleagues in it (cast at the room\'s local spots: the room extends `depth` m behind the window, inside = opposite `heading`)' },
    footprint: [6, 1], height: 4, tags: ['fx', 'window', 'glass', 'shatter', 'chelyabinsk', 'blast', 'office', 'classroom'],
  },
  'fx.tunguska': {
    desc: 'the Tunguska flattened forest: tens of thousands of trees felled radially AWAY from the centre (a ring of falling trees racing outward from t_blast, or already down), "telegraph pole" trees still standing stripped at ground zero, scorched ground, the living taiga beyond `radius`. Film it from the air (the radial pattern) or on the ground among the trunks; add structure.chum far away',
    actions: ['blast'],
    params: { radius: 'm (2500)', poles_radius: 'm', count: 'trees (26000)', t_blast: 's (null = already flattened)', speed: 'm/s of the front (900)', scorch: '0..1', tree_height: 'm (22)', edge_trees: 'int' },
    doc: { radius: 'm of the felled zone drawn (the real one was ~25 km; 2,500 m reads from the air)', t_blast: 's: the trees start falling at the centre then outward (omit: already down)', poles_radius: 'm of standing stripped poles at the centre', scorch: '0..1 burnt trunks and ground' },
    footprint: [5000, 5000], height: 25, tags: ['fx', 'tunguska', 'forest', 'flattened', 'taiga', 'airburst', 'trees', 'siberia', '1908'],
  },
  'structure.chum': {
    desc: 'an Evenki reindeer herder\'s chum: a conical tent of long poles crossing at the top, covered with birch bark / reindeer hide, a smoke wisp from the top (Tunguska 1908: herders 30-60 km away were thrown into the air)',
    actions: ['idle'],
    params: { radius: 'm (3)', height: 'm (5.5)', cover: 'bark|hide', smoke: 'bool', t_shake: 's: it shudders in the blast' },
    footprint: [6, 6], height: 6.5, tags: ['structure', 'tent', 'evenki', 'siberia', 'tunguska', 'nomad', 'chum', 'teepee'],
  },
};

export async function build(kind, item, ctx) {
  if (kind === 'fx.window_blast') return buildWindow(item, ctx);
  if (kind === 'fx.tunguska') return buildTunguska(item, ctx);
  if (kind === 'structure.chum') return buildChum(item, ctx);
  return buildAirburst(item, ctx);
}
