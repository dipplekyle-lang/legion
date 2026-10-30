<!doctype html><meta charset="utf-8"><title>The Sandwich Nobody Buys</title>
<style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"./three.module.js"}}</script>
<script type="module">
// "The Sandwich Nobody Buys", 30 s, built from the whole SPEC.md (section numbers in comments). Rig, passes and timing are short30's.
@@ 6-50
@@ 63-81

// ---------- our own graphics: the anchor (the motif, 56), the hero sandwich, the gold box, the printed menu ----------
function drawAnchor(g, cx, cy, s, col, lw = s * 0.13) {
  marker(g, col, lw); g.beginPath(); g.arc(cx, cy - s * 0.78, s * 0.17, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - s * 0.6); g.lineTo(cx, cy + s * 0.8); g.stroke();
  g.beginPath(); g.moveTo(cx - s * 0.36, cy - s * 0.36); g.lineTo(cx + s * 0.36, cy - s * 0.36); g.stroke();
  g.beginPath(); g.arc(cx, cy + s * 0.1, s * 0.7, 0.45, Math.PI - 0.45); g.stroke();
  g.fillStyle = col; for (const sd of [-1, 1]) { const a = sd > 0 ? 0.45 : Math.PI - 0.45, x = cx + s * 0.7 * Math.cos(a), y = cy + s * 0.1 + s * 0.7 * Math.sin(a);
    g.beginPath(); g.moveTo(x + sd * s * 0.02, y - s * 0.3); g.lineTo(x + sd * s * 0.2, y + s * 0.04); g.lineTo(x - sd * s * 0.16, y + s * 0.02); g.closePath(); g.fill(); }
}
function star(g, x, y, r1, r0, n = 5) { g.beginPath(); for (let i = 0; i < 2 * n; i++) { const a = i / (2 * n) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r0 : r1; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } g.closePath(); g.fill(); }
function capHat(g, cx, cy, s) {                                   // the tiny captain's hat the sandwich wears in its portrait
  g.lineWidth = s * 0.06; g.strokeStyle = '#2A1D26'; g.fillStyle = '#F4F1EA'; g.beginPath(); g.ellipse(cx, cy - s * 0.18, s * 0.62, s * 0.26, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1D2340'; g.beginPath(); g.roundRect(cx - s * 0.48, cy - s * 0.12, s * 0.96, s * 0.22, s * 0.06); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(cx, cy + s * 0.12, s * 0.5, s * 0.1, 0, 0, Math.PI); g.fill(); g.stroke(); drawAnchor(g, cx, cy - 0.01 * s, s * 0.09, '#F2B705', s * 0.035);
}
function drawSandwich(g, cx, cy, s, hat = false) {               // the hero prop: a triple-decker with a flag pick, our own drawing (145)
  const ink = '#2A1D26'; g.lineJoin = 'round'; g.lineCap = 'round';
  const L = [['bread', 0.17], ['lettuce', 0.07], ['tomato', 0.1], ['cheese', 0.08], ['bread', 0.15], ['lettuce', 0.07], ['ham', 0.1], ['top', 0.26]];
  let y = cy + s * 0.72;
  for (const [k, hh] of L) { const h = hh * s; y -= h; g.strokeStyle = ink; g.lineWidth = s * 0.035;
    if (k === 'bread') { g.fillStyle = '#F2C879'; g.beginPath(); g.roundRect(cx - s * 0.64, y, s * 1.28, h, h * 0.45); g.fill(); g.stroke(); g.fillStyle = '#C4761C'; g.fillRect(cx - s * 0.6, y + h * 0.62, s * 1.2, h * 0.2); }
    else if (k === 'top') { g.fillStyle = '#E3A24A'; g.beginPath(); g.moveTo(cx - s * 0.66, y + h); g.quadraticCurveTo(cx - s * 0.66, y - h * 0.3, cx, y - h * 0.3); g.quadraticCurveTo(cx + s * 0.66, y - h * 0.3, cx + s * 0.66, y + h); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#FFF1C9'; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(cx - s * 0.4 + i * s * 0.13, y + h * (0.25 + 0.2 * (i % 2)), s * 0.03, s * 0.016, 0.4, 0, 7); g.fill(); } }
    else if (k === 'lettuce') { g.fillStyle = '#2DC46E'; g.beginPath(); g.moveTo(cx - s * 0.74, y + h); for (let i = 0; i <= 16; i++) g.lineTo(cx - s * 0.74 + i * s * 0.0925, y + (i % 2 ? h * 1.1 : -h * 0.2)); g.lineTo(cx + s * 0.74, y + h); g.closePath(); g.fill(); g.stroke(); }
    else if (k === 'tomato') { g.fillStyle = '#EB2715'; g.beginPath(); g.roundRect(cx - s * 0.68, y, s * 1.36, h, h * 0.5); g.fill(); g.stroke(); g.fillStyle = '#FF7A5C'; g.fillRect(cx - s * 0.5, y + h * 0.25, s * 0.25, h * 0.2); }
    else if (k === 'cheese') { g.fillStyle = '#FFD21F'; g.beginPath(); g.moveTo(cx - s * 0.7, y); g.lineTo(cx + s * 0.7, y); g.lineTo(cx + s * 0.7, y + h); g.lineTo(cx + s * 0.38, y + h); g.lineTo(cx + s * 0.3, y + h * 2.2); g.lineTo(cx + s * 0.22, y + h); g.lineTo(cx - s * 0.3, y + h); g.lineTo(cx - s * 0.4, y + h * 1.9); g.lineTo(cx - s * 0.5, y + h); g.lineTo(cx - s * 0.7, y + h); g.closePath(); g.fill(); g.stroke(); }
    else if (k === 'ham') { g.fillStyle = '#F07C8C'; g.beginPath(); g.roundRect(cx - s * 0.7, y, s * 1.4, h, h * 0.3); g.fill(); g.stroke(); g.strokeStyle = '#FFC0C8'; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(cx - s * 0.5, y + h * 0.5); g.lineTo(cx + s * 0.4, y + h * 0.5); g.stroke(); }
  }
  marker(g, '#C4761C', s * 0.04); g.beginPath(); g.moveTo(cx + s * 0.1, y + s * 0.05); g.lineTo(cx + s * 0.16, y - s * 0.42); g.stroke();
  g.fillStyle = '#EB2715'; g.strokeStyle = ink; g.lineWidth = s * 0.025; g.beginPath(); g.moveTo(cx + s * 0.16, y - s * 0.42); g.lineTo(cx + s * 0.46, y - s * 0.34); g.lineTo(cx + s * 0.15, y - s * 0.24); g.closePath(); g.fill(); g.stroke();
  if (hat) capHat(g, cx - s * 0.12, y - s * 0.2, s * 0.6);
}
function goldBox(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#F2B705'); gr.addColorStop(0.42, '#FFD75A'); gr.addColorStop(0.58, '#F6C531'); gr.addColorStop(1, '#E39A0C'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = '#8A5A00'; g.lineWidth = 10; g.strokeRect(x + 5, y + 5, w - 10, h - 10); g.strokeStyle = '#FFF1B0'; g.lineWidth = 3; g.strokeRect(x + 16, y + 16, w - 32, h - 32);
  g.fillStyle = '#FFF6C8'; for (const [sx, sy] of [[x + 17, y + 17], [x + w - 17, y + 17], [x + 17, y + h - 17], [x + w - 17, y + h - 17]]) star(g, sx, sy, 15, 6);
}
const ROWS = [['BURGER', '$18'], ['CLUB SANDWICH', '$16'], ['GRILLED CHEESE', '$9'], ['FRIES', '$6'], ['APPLE PIE', '$7'], ['COFFEE', '$3']];
function drawMenu(g, w, h) {                                      // the printed menu (paper, 145): the gold box on top, the burger right under it
  paper(g, w, h, 0, '#FBF6E9');
  g.fillStyle = '#1E2F86'; g.fillRect(0, 0, w, 86); drawAnchor(g, 44, 46, 24, '#FFD75A', 6); drawAnchor(g, w - 44, 46, 24, '#FFD75A', 6);
  txt(g, 'THE ANCHOR', w / 2, 36, '40px Lilita', '#FFFFFF'); txt(g, 'DINER  ·  EST. 1962', w / 2, 68, '20px Fredoka', '#BFD0FF');
  goldBox(g, 26, 104, w - 52, 232); drawSandwich(g, 128, 226, 66);
  txt(g, 'THE', 336, 150, '28px Lilita', '#6A4300'); txt(g, 'ADMIRAL', 336, 192, '50px Lucky', '#5A3A00'); sticker(g, '$90', 336, 270, 86, '#D2302A', '#FFF1B0', 'Lucky');
  ROWS.forEach(([a, b], i) => { const y = 384 + i * 50, big = i === 0, fa = `${big ? 34 : 28}px ${big ? 'Lilita' : 'Fredoka'}`, fb = `${big ? 36 : 30}px Lilita`;
    txt(g, a, 40, y, fa, '#2A2A2A', 'left'); const wa = g.measureText(a).width; txt(g, b, w - 40, y, fb, big ? '#1E2F86' : '#2A2A2A', 'right'); const wb = g.measureText(b).width;
    g.fillStyle = '#B9AE98'; for (let x = 52 + wa; x < w - 52 - wb; x += 11) g.fillRect(x, y + 8, 4, 4); });
  txt(g, 'ASK ABOUT OUR PIE OF THE DAY', w / 2, 692, '19px Fredoka', '#8A7E6C');
}
const menuTex = canvasTex(512, 720, drawMenu);
const menuBack = canvasTex(512, 720, (g, w, h) => { g.fillStyle = '#1E2F86'; g.fillRect(0, 0, w, h); specks(g, w, h, 2600, ['#2A3C9A', '#16246E'], 1, 3, 17);
  marker(g, '#C4761C', 10); g.setLineDash([18, 10]); g.strokeRect(24, 24, w - 48, h - 48); g.setLineDash([]);
  drawAnchor(g, w / 2, 300, 120, '#FFD75A', 26); txt(g, 'THE ANCHOR', w / 2, 520, '70px Lilita', '#FFFFFF'); txt(g, 'DINER', w / 2, 590, '46px Lilita', '#FFD75A'); });
function makeMenu(s = 0.2) { const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const f = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 1.406), lam('#ffffff', { map: menuTex })); g.add(f);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 1.406), lam('#ffffff', { map: menuBack })); b.rotation.y = Math.PI; b.position.z = -0.0008; g.add(b);
  scene.add(g); g.userData.s = s; return g; }

// ================= SET 1: the Anchor diner (origin) =================
// Built as far as the camera looks (42): the menu wall (name wall), counter and stools, back counter, the booth by the left window,
// the kitchen pass, the front wall for the night reverse. Butter-yellow paint is the one mid-chroma field (135.2); teal, red, yellow.
const WALL_Z = -0.75, CEIL = 2.1, LX = -1.5, RX = 1.5, FZ = 1.75, CTR_Y = 0.58, BC_Y = 0.5;
const PX0 = 0.6, PX1 = 1.25, PY0 = 0.6, PY1 = 1.12, PXC = (PX0 + PX1) / 2;   // the kitchen pass: a counter-high hole in the back wall
const chrome = new THREE.MeshPhongMaterial({ color: '#C3C8D0', shininess: 90, specular: '#FFFFFF' });
function wallTex(wm, hm, seed) { return canvasTex(1024, Math.round(1024 * hm / wm), (g, w, h) => {
  const px = w / wm, band = h - 0.88 * px; g.fillStyle = '#E6C65E'; g.fillRect(0, 0, w, band);
  specks(g, w, band, Math.round(w * band / 90), ['#D4B24A', '#F0D57A', '#CFAE47'], 1.5, 3.5, seed);   // 173.1: stipple on the paint
  const r = rng(seed + 3); for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * band, rr = 30 + r() * 90; const m = g.createRadialGradient(x, y, 0, x, y, rr); m.addColorStop(0, 'rgba(150,110,30,0.035)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
  const tp = 0.1 * px; g.fillStyle = '#1C9AAA'; g.fillRect(0, band, w, h - band);
  for (let y = h; y > band; y -= tp) for (let x = 0; x < w; x += tp) { g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.07 * r()})` : `rgba(5,50,60,${0.08 * r()})`; g.fillRect(x, y - tp, tp, tp); }
  g.save(); g.translate(0, band); specks(g, w, h - band, Math.round(w * (h - band) / 150), ['#168896', '#4CC0CE'], 1, 2.5, seed + 7); g.restore();
  g.strokeStyle = '#147A87'; g.lineWidth = 3; for (let x = 0; x <= w; x += tp) { g.beginPath(); g.moveTo(x, band); g.lineTo(x, h); g.stroke(); } for (let y = h; y >= band; y -= tp) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#EB2715'; g.fillRect(0, band - 0.045 * px, w, 0.016 * px); g.fillStyle = '#C3C8D0'; g.fillRect(0, band - 0.026 * px, w, 0.026 * px); g.fillStyle = '#8A909C'; g.fillRect(0, band - 0.004 * px, w, 0.004 * px);
  const st = g.createLinearGradient(0, h, 0, h - 0.25 * px); st.addColorStop(0, 'rgba(10,40,50,0.25)'); st.addColorStop(1, 'rgba(10,40,50,0)'); g.fillStyle = st; g.fillRect(0, h - 0.25 * px, w, 0.25 * px); }); }
function wallMesh(wm, hm, holes, tex) {                          // a wall with holes cut in it (windows, the pass), uv = metres
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(wm, 0); s.lineTo(wm, hm); s.lineTo(0, hm); s.closePath();
  for (const [x0, y0, x1, y1] of holes) { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath(); s.holes.push(p); }
  const geo = new THREE.ShapeGeometry(s), uv = geo.attributes.uv, pa = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / wm, pa.getY(i) / hm);
  const m = new THREE.Mesh(geo, lam('#ffffff', { map: tex })); scene.add(m); return m; }
function frameHole(cx, cy, w, h, depth, along, col = '#C3C8D0') {   // trim round a hole: along = 'x' (back/front wall) or 'z' (side walls)
  const parts = [[w + 0.04, 0.03, 0, h / 2 + 0.015], [w + 0.04, 0.03, 0, -h / 2 - 0.015], [0.03, h, -w / 2 - 0.015, 0], [0.03, h, w / 2 + 0.015, 0]];
  for (const [a, b, dx, dy] of parts) { const m = new THREE.Mesh(along === 'x' ? new THREE.BoxGeometry(a, b, depth) : new THREE.BoxGeometry(depth, b, a), chrome); m.position.set(along === 'x' ? cx[0] + dx : cx[0], cy + dy, along === 'x' ? cx[1] : cx[1] + dx); scene.add(m); outline(m, 0.003); } }
// floor: navy and cream checker (a pattern that shows perspective, 110.3), flecks on both (173.1); darks stay coloured (135.4)
const checkTex = canvasTex(512, 512, (g, w, h) => { const r = rng(3); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#1D2A5E' : '#EFE6D2'; g.fillRect(x * 64, y * 64, 64, 64); g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,30,20'},${0.06 * r()})`; g.fillRect(x * 64, y * 64, 64, 64); }
  for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(60,45,30,${0.05 + 0.08 * r()})`; g.lineWidth = 1 + 3 * r(); g.beginPath(); const x0 = r() * w, y0 = r() * h; g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 30 * r(), y0 + 20 * r(), x0 + 60 * (r() - 0.5), y0 + 40 * (r() - 0.5)); g.stroke(); }
  const odd = (x, y) => (Math.floor(x / 64) + Math.floor(y / 64)) % 2 === 1;
  specks(g, w, h, 5200, ['#CFC3AA', '#B9AE98', '#DCD2BC'], 1, 3, 31, (x, y) => !odd(x, y)); specks(g, w, h, 5200, ['#2E3C7A', '#141E48', '#3A4A8E'], 1, 3, 37, odd); });
checkTex.wrapS = checkTex.wrapT = THREE.RepeatWrapping; checkTex.repeat.set(1.5, 1.25);
{ const f = plane(3.0, 2.5, checkTex); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, 0.5); }
// walls: back (the name wall, with the pass), left (window over the booth), right (restroom door, jukebox), front (window + door)
const backWall = wallMesh(3.0, CEIL, [[PX0 - LX, PY0, PX1 - LX, PY1]], wallTex(3.0, CEIL, 51)); backWall.position.set(LX, 0, WALL_Z);
const leftWall = wallMesh(2.5, CEIL, [[FZ - 0.95, 0.82, FZ - 0.05, 1.62]], wallTex(2.5, CEIL, 53)); leftWall.rotation.y = Math.PI / 2; leftWall.position.set(LX, 0, FZ);
const rightWall = wallMesh(2.5, CEIL, [], wallTex(2.5, CEIL, 55)); rightWall.rotation.y = -Math.PI / 2; rightWall.position.set(RX, 0, WALL_Z);
const frontWall = wallMesh(3.0, CEIL, [[RX - 0.55, 0.72, RX + 1.2, 1.68], [RX - 1.3, 0.0, RX - 0.78, 1.55]], wallTex(3.0, CEIL, 57)); frontWall.rotation.y = Math.PI; frontWall.position.set(RX, 0, FZ);
frameHole([PXC, WALL_Z], (PY0 + PY1) / 2, PX1 - PX0, PY1 - PY0, 0.05, 'x');
frameHole([LX + 0.012, 0.5], 1.22, 0.9, 0.8, 0.04, 'z');
frameHole([-0.325, FZ - 0.012], 1.2, 1.75, 0.96, 0.04, 'x'); for (const x of [-0.9, -0.33, 0.25]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.96, 0.03), chrome); m.position.set(x, 1.2, FZ - 0.012); scene.add(m); outline(m, 0.003); }
frameHole([1.04, FZ - 0.012], 0.775, 0.52, 1.55, 0.05, 'x');
// drop ceiling: cream tiles with a grid (71, 135.3), like his diners and shops
const acoustic = (g, w, h, col, seed) => { const r = rng(seed); g.fillStyle = col; for (let y = 6; y < h; y += 11) for (let x = 6; x < w; x += 11) if (r() < 0.62) { g.beginPath(); g.arc(x + 4 * (r() - 0.5), y + 4 * (r() - 0.5), 1.2 + 1.4 * r(), 0, 7); g.fill(); } };
const ceilTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#EDE6D3'; g.fillRect(0, 0, w, h); acoustic(g, w, h, '#D3C9B1', 61); g.strokeStyle = '#BFB59C'; g.lineWidth = 8; for (let i = 0; i <= w; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } });
ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping; ceilTex.repeat.set(1.5, 1.25);
{ const c = plane(3.0, 2.5, ceilTex); c.rotation.x = Math.PI / 2; c.position.set(0, CEIL, 0.5); }
// the second depth layer (171): a painted harbour street behind the windows, people drawn in his style
function streetTex(night) { return canvasTex(1024, 640, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, night ? '#08258E' : '#3B91D9'); sky.addColorStop(1, night ? '#2B3ECC' : '#9ED4FF'); g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.5);
  if (night) { const r = rng(9); g.fillStyle = '#DCE4FF'; for (let i = 0; i < 50; i++) g.fillRect(r() * w, r() * h * 0.36, 3, 3); g.fillStyle = '#FFF6D8'; g.beginPath(); g.arc(150, 80, 36, 0, 7); g.fill(); }
  else { g.fillStyle = '#FFFFFF'; for (const [x, y] of [[150, 80], [560, 50]]) { g.beginPath(); g.ellipse(x, y, 70, 22, 0, 0, 7); g.ellipse(x + 40, y - 10, 50, 24, 0, 0, 7); g.fill(); } }
  g.fillStyle = night ? '#10307A' : '#1F7FD0'; g.fillRect(0, h * 0.4, 300, h * 0.14); g.fillStyle = night ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.4)'; for (let x = 10; x < 300; x += 50) g.fillRect(x, h * 0.46, 26, 3);
  g.fillStyle = '#F4F1EA'; g.beginPath(); g.moveTo(206, h * 0.42); g.lineTo(220, h * 0.18); g.lineTo(246, h * 0.18); g.lineTo(260, h * 0.42); g.fill(); g.fillStyle = '#E5302A'; g.fillRect(212, h * 0.24, 42, 16); g.fillRect(208, h * 0.33, 50, 16);
  g.fillStyle = night ? '#FFE7A0' : '#FFD21F'; g.fillRect(218, h * 0.14, 30, 16); g.fillStyle = '#2E3240'; g.fillRect(214, h * 0.12, 38, 6);
  if (night) { g.fillStyle = 'rgba(255,240,170,0.18)'; g.beginPath(); g.moveTo(233, h * 0.16); g.lineTo(0, h * 0.06); g.lineTo(0, h * 0.2); g.fill(); }
  for (const [x, c] of [[40, '#E5302A'], [120, '#F2B705']]) { g.fillStyle = c; g.beginPath(); g.moveTo(x, h * 0.46); g.lineTo(x + 60, h * 0.46); g.lineTo(x + 50, h * 0.5); g.lineTo(x + 8, h * 0.5); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x + 30, h * 0.36); g.lineTo(x + 30, h * 0.455); g.lineTo(x + 54, h * 0.455); g.fill(); }
  const fronts = [['#E5302A', 300, 160], ['#F2B705', 460, 150], ['#2DB37A', 610, 170], ['#7A3FD1', 780, 120], ['#1C9AAA', 900, 124]];
  for (const [c, x, ww] of fronts) { g.fillStyle = c; g.fillRect(x, h * 0.22, ww, h * 0.4); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, h * 0.22, ww, 10);
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) { g.fillStyle = night ? '#1C2150' : '#BFE3F7'; g.fillRect(x + 20 + j * (ww / 2 - 6), h * 0.27 + k * 70, ww / 2 - 34, 46); } }
  g.fillStyle = '#C9C2B4'; g.fillRect(0, h * 0.6, w, h * 0.08); g.fillStyle = '#5B6475'; g.fillRect(0, h * 0.68, w, h * 0.32); g.fillStyle = '#F2F2EE'; for (let x = 20; x < w; x += 120) g.fillRect(x, h * 0.84, 60, 8);
  g.fillStyle = '#235BDF'; g.beginPath(); g.roundRect(560, h * 0.6, 220, 60, 22); g.fill(); g.fillStyle = '#BFE3F7'; g.fillRect(600, h * 0.6 + 8, 60, 22); g.fillRect(670, h * 0.6 + 8, 60, 22); g.fillStyle = '#231914'; for (const x of [600, 740]) { g.beginPath(); g.arc(x, h * 0.6 + 62, 18, 0, 7); g.fill(); }
  const person = (x, y, s, shirt, hair) => { g.lineWidth = 6 * s; g.strokeStyle = '#231914'; g.fillStyle = shirt; g.beginPath(); g.ellipse(x, y + 70 * s, 34 * s, 46 * s, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 12 * s, y + 112 * s); g.lineTo(x - 14 * s, y + 160 * s); g.moveTo(x + 12 * s, y + 112 * s); g.lineTo(x + 14 * s, y + 160 * s); g.stroke();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x, y, 40 * s, 36 * s, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = hair; g.beginPath(); g.ellipse(x, y - 14 * s, 40 * s, 22 * s, 0, Math.PI, 0); g.fill(); g.stroke(); };
  if (!night) { person(380, h * 0.44, 0.8, '#2DB37A', '#3A2A20'); person(860, h * 0.45, 0.75, '#E5302A', '#A45915'); person(470, h * 0.47, 0.6, '#7A3FD1', '#1D2340'); }
  else person(860, h * 0.45, 0.75, '#3A3F78', '#1D2340');
  g.fillStyle = '#2E3240'; g.fillRect(520, h * 0.3, 8, h * 0.32); g.fillStyle = night ? '#FFE7A0' : '#E8E8EC'; g.beginPath(); g.arc(524, h * 0.3, 16, 0, 7); g.fill();
  if (night) { g.fillStyle = 'rgba(10,20,80,0.45)'; g.fillRect(0, h * 0.2, w, h * 0.8); for (const [c, x, ww] of fronts) for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) if ((x + k + j) % 3) { g.fillStyle = '#FFD98A'; g.fillRect(x + 20 + j * (ww / 2 - 6), h * 0.27 + k * 70, ww / 2 - 34, 46); } }
}); }
const streetDay = streetTex(false), streetNight = streetTex(true);
const streetF = plane(4.2, 2.6, streetDay, scene, true); streetF.rotation.y = Math.PI; streetF.position.set(-0.1, 1.15, FZ + 0.9);
const streetL = plane(3.0, 2.1, streetDay, scene, true); streetL.rotation.y = Math.PI / 2; streetL.position.set(LX - 0.8, 1.2, 0.5);
{ const sw = add(new THREE.PlaneGeometry(4.2, 0.9), '#C9C2B4'); sw.rotation.x = -Math.PI / 2; sw.position.set(-0.1, 0.0, FZ + 0.45); const sl = add(new THREE.PlaneGeometry(0.8, 3.0), '#C9C2B4'); sl.rotation.x = -Math.PI / 2; sl.position.set(LX - 0.4, 0.0, 0.5); }

// the name wall (42): the diner's sign over the letter-board menu, facing the main camera
const signTex = canvasTex(1024, 168, (g, w, h) => { g.fillStyle = '#FFF3D6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1E2F86'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
  drawAnchor(g, 92, 86, 46, '#1E2F86', 12); drawAnchor(g, w - 92, 86, 46, '#1E2F86', 12); sticker(g, 'THE ANCHOR', w / 2, 72, 92, '#D2302A', '#1E2F86', 'Lucky'); txt(g, 'DINER  ·  OPEN LATE', w / 2, 140, '34px Lilita', '#1E2F86'); });
{ const s = add(new THREE.BoxGeometry(1.0, 0.165, 0.03), '#FFF3D6', { map: signTex, hull: 0.003 }); s.position.set(-0.3, 1.93, WALL_Z + 0.02); }
const boardTex = canvasTex(1024, 560, (g, w, h) => {                // a felt letter board, real diner convention + the new top line
  g.fillStyle = '#1F2766'; g.fillRect(0, 0, w, h); for (let y = 10; y < h; y += 20) { g.fillStyle = '#34408A'; g.fillRect(0, y, w, 3); g.fillStyle = '#141A4A'; g.fillRect(0, y + 3, w, 2); } specks(g, w, h, 6000, ['#2C3680', '#151B50', '#3A4696'], 1, 2.5, 91);
  drawAnchor(g, 350, 52, 24, '#FFD75A', 6); drawAnchor(g, 674, 52, 24, '#FFD75A', 6); txt(g, 'MENU', w / 2, 56, '70px Osd', '#F4F1EA');
  g.save(); g.translate(130, 178); g.rotate(-0.05); g.fillStyle = '#FBFAF6'; g.fillRect(-88, -78, 176, 170); g.fillStyle = '#9FD3F2'; g.fillRect(-76, -66, 152, 128); drawSandwich(g, 0, -2, 50); g.restore();
  g.fillStyle = '#D2302A'; g.beginPath(); g.arc(128, 106, 9, 0, 7); g.fill();
  txt(g, 'THE ADMIRAL', 250, 160, '76px Osd', '#F4F1EA', 'left'); txt(g, '$90', 992, 160, '96px Osd', '#FF5A47', 'right'); txt(g, "TRIPLE DECKER · THE CHEF'S PRIDE", 252, 216, '30px Osd', '#C3CAF2', 'left');
  ROWS.forEach(([a, b], i) => { const y = 292 + i * 44; txt(g, a, 250, y, '38px Osd', '#F4F1EA', 'left'); txt(g, b, 992, y, '38px Osd', '#F4F1EA', 'right'); });
  txt(g, 'NO SUBSTITUTIONS', 130, 300, '26px Osd', '#A9B2E6'); txt(g, 'CASH OR CARD', 130, 336, '26px Osd', '#A9B2E6'); });
{ const fr = add(new THREE.BoxGeometry(1.1, 0.62, 0.04), '#6E4217', { hull: 0.004 }); fr.position.set(-0.3, 1.47, WALL_Z + 0.02);
  const b = plane(1.06, 0.58, boardTex); b.position.set(-0.3, 1.47, WALL_Z + 0.041);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), lam('#C4761C')); for (const [x, y] of [[-0.85, 1.78], [0.25, 1.78], [-0.85, 1.16], [0.25, 1.16]]) { const k = rope.clone(); k.position.set(x, y, WALL_Z + 0.045); scene.add(k); } }
// Employee of the Month: the sandwich in a captain's hat, there from the first frame (the planted payoff and rewatch joke, 55, 57)
const eomTex = canvasTex(384, 480, (g, w, h) => { paper(g, w, h, 0, '#FFF6D8'); sticker(g, 'EMPLOYEE', w / 2, 50, 44, '#C8242A', null, 'Lucky'); sticker(g, 'OF THE MONTH', w / 2, 96, 34, '#1D2340', null);
  g.fillStyle = '#9FD3F2'; g.fillRect(64, 124, 256, 250); goldBox(g, 92, 170, 200, 170); drawSandwich(g, 192, 270, 62, true);
  txt(g, 'THE ADMIRAL', w / 2, 414, '44px Lilita', '#1D2340'); g.fillStyle = '#F2B705'; star(g, 330, 136, 30, 13); });
{ const fr = add(new THREE.BoxGeometry(0.22, 0.28, 0.016), '#C9930A', { hull: 0.003 }); fr.position.set(0.45, 1.5, WALL_Z + 0.008); const p = plane(0.19, 0.24, eomTex); p.position.set(0.45, 1.5, WALL_Z + 0.017); p.rotation.z = -0.02; }
const soldTex = canvasTex(320, 220, (g, w, h) => { g.fillStyle = '#6E4217'; g.fillRect(0, 0, w, h); g.fillStyle = '#22302A'; g.fillRect(14, 14, w - 28, h - 28); specks(g, w, h, 900, ['rgba(255,255,255,0.08)'], 1, 4, 5);
  txt(g, 'ADMIRALS SOLD', w / 2, 58, '36px Marker', '#F4F1EA'); txt(g, '0', w / 2 - 30, 136, '86px Marker', '#FFD75A'); marker(g, '#F4F1EA', 5); g.beginPath(); g.arc(w / 2 + 50, 128, 26, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(w / 2 + 40, 116, 3, 0, 7); g.arc(w / 2 + 60, 116, 3, 0, 7); g.stroke(); });
{ const s = add(new THREE.BoxGeometry(0.17, 0.117, 0.012), '#6E4217', { map: soldTex, hull: 0.003 }); s.position.set(0.45, 1.22, WALL_Z + 0.006); s.rotation.z = 0.03; }
// a clock over the pass, the tear-off calendar beside it (time device, 44, 59): MON 14 -> FRI 18 on "Friday"
{ const clockT = canvasTex(256, 256, (g) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.fillStyle = '#1D2340'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(128 + 98 * Math.sin(a), 128 - 98 * Math.cos(a), i % 3 ? 5 : 9, 0, 7); g.fill(); }
    drawAnchor(g, 128, 168, 22, '#1C9AAA', 5); marker(g, '#1D2340', 12); g.beginPath(); g.moveTo(128, 128); g.lineTo(80, 100); g.stroke(); marker(g, '#1D2340', 8); g.beginPath(); g.moveTo(128, 128); g.lineTo(140, 40); g.stroke(); g.fillStyle = '#E5302A'; g.beginPath(); g.arc(128, 128, 10, 0, 7); g.fill(); });
  const ck = add(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 32), '#EB2715', { hull: 0.004 }); ck.rotation.x = Math.PI / 2; ck.position.set(PXC, 1.42, WALL_Z + 0.015); const cf = new THREE.Mesh(new THREE.CircleGeometry(0.078, 32), lam('#ffffff', { map: clockT })); cf.position.set(PXC, 1.42, WALL_Z + 0.031); scene.add(cf); }
const calCanvas = document.createElement('canvas'); calCanvas.width = 256; calCanvas.height = 300; const calTex = new THREE.CanvasTexture(calCanvas); calTex.colorSpace = THREE.SRGBColorSpace;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
let calKey = ''; function drawCal(n) { if (calKey === n) return; calKey = n; const g = calCanvas.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 256, 300); g.fillStyle = '#D2302A'; g.fillRect(0, 0, 256, 86);
  txt(g, DAYS[(n - 14 + 70) % 7], 128, 46, '58px Lilita', '#FFFFFF'); txt(g, String(n), 128, 196, '150px Lilita', '#1B1B1B'); g.fillStyle = '#B7BCC6'; g.fillRect(0, 280, 256, 20); calTex.needsUpdate = true; }
drawCal(14);
{ const b = add(new THREE.BoxGeometry(0.13, 0.17, 0.012), '#2B2E38', { hull: 0.003 }); b.position.set(1.38, 1.0, WALL_Z + 0.006); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.14), lam('#ffffff', { map: calTex })); p.position.set(1.38, 0.995, WALL_Z + 0.013); scene.add(p); }
// the life ring and the ship's wheel (round hard props get one specular dot, 137), small signs (173.2: 0.05-0.15 m things)
{ const lr = canvasTex(512, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#F4F1EA' : '#EB2715'; g.fillRect(i * w / 8, 0, w / 8, h); } });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 14, 40), new THREE.MeshPhongMaterial({ map: lr, shininess: 60, specular: '#FFFFFF' })); ring.position.set(-1.17, 1.5, WALL_Z + 0.04); scene.add(ring); outline(ring, 0.004);
  const rp = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 40), lam('#C4761C')); rp.position.copy(ring.position).add(V(0, 0, 0.03)); scene.add(rp);
  const wh = new THREE.Group(); wh.position.set(LX + 0.03, 1.38, 1.38); wh.rotation.y = Math.PI / 2; scene.add(wh); const wm = new THREE.MeshPhongMaterial({ color: '#C4761C', shininess: 50, specular: '#FFE0B0' });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 8, 36), wm); wh.add(rim); outline(rim, 0.004); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), wm); hub.rotation.x = Math.PI / 2; wh.add(hub); outline(hub, 0.003);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, sp = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.36, 8), wm); sp.rotation.z = a; wh.add(sp); outline(sp, 0.002); }
  const smallSign = (s1, s2, fill, ink, x, y, z, w2, h2, ry = 0, rz = 0) => { const t2 = canvasTex(256, 160, (g, w, h) => { g.fillStyle = fill; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 14); g.fill(); txt(g, s1, w / 2, s2 ? 56 : h / 2, '44px Lilita', ink); if (s2) txt(g, s2, w / 2, 112, '40px Lilita', ink); }); const p = plane(w2, h2, t2); p.position.set(x, y, z); p.rotation.set(0, ry, rz); return p; };
  smallSign('CASH', 'ONLY', '#FFFFFF', '#D2302A', -1.17, 1.22, WALL_Z + 0.004, 0.1, 0.062, 0, -0.04);
  smallSign('TRY OUR', 'PIE!', '#FFD21F', '#1D2340', 1.05, 1.68, WALL_Z + 0.004, 0.12, 0.075, 0, 0.05);
  smallSign('PLEASE WAIT', 'TO BE SEATED', '#1E2F86', '#FFFFFF', LX + 0.004, 1.12, 1.5, 0.14, 0.088, Math.PI / 2, 0); }

// the counter: red quilted vinyl front with chrome bands, a speckled formica top (Part 20: red #EB2715 hero, neutral top #B2A8A1)
const CX0 = -0.8, CX1 = 1.25, CW = CX1 - CX0, CCX = (CX0 + CX1) / 2;
const quiltTex = (w2, h2, col, dk, lt) => canvasTex(1024, Math.round(1024 * h2 / w2), (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); specks(g, w, h, 6000, [dk + '66', lt + '55'], 1, 3, w + h);
  const st = 0.12 * w / w2; marker(g, dk, 4); for (let k = -h; k < w + h; k += st) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
  g.fillStyle = lt; for (let x = 0; x < w + st; x += st) for (let y = 0; y < h + st; y += st) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } });
const formicaTex = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#B2A8A1'; g.fillRect(0, 0, w, h); specks(g, w, h, 9000, ['#9C918A', '#C8BFB8', '#8E8580'], 1, 3, 61);
  const r = rng(63); for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, a = r() * 6; g.strokeStyle = ['#1C9AAA', '#EB2715', '#F2B705'][i % 3] + '88'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14 * Math.cos(a), y + 14 * Math.sin(a), x + 24 * Math.cos(a + 1), y + 24 * Math.sin(a + 1)); g.stroke(); } });   // boomerang flecks, the diner convention
{ const front = add(new THREE.BoxGeometry(CW, CTR_Y - 0.1, 0.04), '#EB2715', { map: quiltTex(CW, CTR_Y - 0.1, '#EB2715', '#A8180A', '#FF6A4E') }); front.position.set(CCX, 0.07 + (CTR_Y - 0.1) / 2, 0.14); outline(front, 0.003);
  const body = add(new THREE.BoxGeometry(CW, CTR_Y - 0.04, 0.26), '#8A2416'); body.position.set(CCX, (CTR_Y - 0.04) / 2, 0.0);
  const kick = add(new THREE.BoxGeometry(CW, 0.07, 0.03), '#2E3240'); kick.position.set(CCX, 0.035, 0.13);
  const top = add(new THREE.BoxGeometry(CW + 0.04, 0.04, 0.36), '#B2A8A1', { map: formicaTex, hull: 0.003 }); top.position.set(CCX, CTR_Y - 0.02, 0.0);
  for (const [y, z, h2] of [[CTR_Y - 0.03, 0.184, 0.024], [0.07, 0.162, 0.014]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.05, h2, 0.012), chrome); b.position.set(CCX, y, z); scene.add(b); }
  blob(scene, CCX, 0.002, 0.18, CW + 0.2, 0.3, 0.8); }
const stools = [];
function stool(x, z) { const s = new THREE.Group(); s.position.set(x, 0, z); scene.add(s);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 0.055, 32), new THREE.MeshPhongMaterial({ color: '#EB2715', shininess: 50, specular: '#FFD0C8' })); seat.position.y = 0.37; s.add(seat); outline(seat, 0.004);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.097, 0.008, 8, 32), chrome); rim.rotation.x = Math.PI / 2; rim.position.y = 0.343; s.add(rim);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 14), chrome); post.position.y = 0.17; s.add(post); outline(post, 0.003);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.007, 8, 28), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 0.14; s.add(ring);
  const base = add(new THREE.CylinderGeometry(0.09, 0.1, 0.02, 28), '#2E3240', { hull: 0.003 }, s); base.position.y = 0.01;
  blob(s, 0, 0.002, 0, 0.32, 0.32, 0.85); stools.push(s); return s; }
for (const x of [-0.65, -0.25, 0.15, 0.55, 0.95]) stool(x, 0.42);
// counter-top things (planted, 40): napkins with the anchor, ketchup and mustard, sugar, salt and pepper, the pie case at the end
{ const napT = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#D9DDE3'; g.fillRect(0, 0, w, h); g.fillStyle = '#1E2F86'; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill(); drawAnchor(g, w / 2, h / 2 + 4, 34, '#FFD75A', 8); });
  const nap = add(new THREE.BoxGeometry(0.1, 0.09, 0.06), '#D9DDE3', { hull: 0.003 }); nap.position.set(-0.5, CTR_Y + 0.045, 0.05); const np = plane(0.07, 0.052, napT); np.position.set(-0.5, CTR_Y + 0.045, 0.081);
  const tiss = add(new THREE.BoxGeometry(0.07, 0.012, 0.03), '#FFFFFF'); tiss.position.set(-0.5, CTR_Y + 0.095, 0.05);
  const bottle = (x, z, col, cap) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.12, 16), new THREE.MeshPhongMaterial({ color: col, shininess: 70, specular: '#FFFFFF' })); b.position.set(x, CTR_Y + 0.06, z); scene.add(b); outline(b, 0.003);
    const c = add(new THREE.ConeGeometry(0.014, 0.04, 12), cap); c.position.set(x, CTR_Y + 0.14, z); blob(scene, x, CTR_Y + 0.001, z, 0.07, 0.07, 0.7); };
  bottle(-0.66, 0.06, '#EB2715', '#EB2715'); bottle(-0.61, 0.0, '#F2B705', '#F2B705'); bottle(0.8, 0.04, '#EB2715', '#EB2715');
  const sug = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.08, 16), new THREE.MeshPhongMaterial({ color: '#E8EEF4', shininess: 100, specular: '#FFFFFF', transparent: true, opacity: 0.85 })); sug.position.set(0.52, CTR_Y + 0.04, 0.05); scene.add(sug); outline(sug, 0.003);
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.03, 16), chrome); sc.position.set(0.52, CTR_Y + 0.095, 0.05); scene.add(sc);
  for (const [x, c] of [[0.6, '#F4F1EA'], [0.64, '#3A2F35']]) { const s2 = add(new THREE.CylinderGeometry(0.012, 0.014, 0.05, 12), c, { hull: 0.002 }); s2.position.set(x, CTR_Y + 0.025, 0.02); }
  const stand = add(new THREE.CylinderGeometry(0.11, 0.06, 0.06, 28), '#C3C8D0', { mat: chrome }); stand.position.set(1.07, CTR_Y + 0.03, -0.02); outline(stand, 0.003);
  const pie = add(new THREE.CylinderGeometry(0.095, 0.085, 0.04, 28), '#E3A24A', { hull: 0.003 }); pie.position.set(1.07, CTR_Y + 0.08, -0.02);
  const slice = add(new THREE.BoxGeometry(0.06, 0.041, 0.04), '#8E2A3A'); slice.position.set(1.1, CTR_Y + 0.08, 0.04); slice.rotation.y = 0.5;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#DDEBF5', shininess: 120, specular: '#FFFFFF', transparent: true, opacity: 0.32, depthWrite: false })); dome.position.set(1.07, CTR_Y + 0.06, -0.02); dome.userData.hull = true; scene.add(dome);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), chrome); knob.position.set(1.07, CTR_Y + 0.185, -0.02); scene.add(knob); }
// the back counter (behind the owner): printer, coffee (orange lid = decaf, the real convention), mugs, register; a shelf above
{ const bf = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#6E4217'; g.fillRect(0, 0, w, h); grain(g, w, h, 90, ['#5A3410', '#8A5A2B'], 7, 6); g.strokeStyle = '#4A2A0C'; g.lineWidth = 6; for (let x = 0; x < w; x += 170) g.strokeRect(x + 14, 22, 142, h - 44); });
  const b = add(new THREE.BoxGeometry(1.25, BC_Y - 0.03, 0.26), '#6E4217', { map: bf }); b.position.set(-0.175, (BC_Y - 0.03) / 2, -0.62);
  const t2 = add(new THREE.BoxGeometry(1.27, 0.03, 0.28), '#B2A8A1', { map: formicaTex, hull: 0.003 }); t2.position.set(-0.175, BC_Y - 0.015, -0.62);
  const cm = add(new THREE.BoxGeometry(0.2, 0.3, 0.16), '#2E3240', { hull: 0.003 }); cm.position.set(-0.12, BC_Y + 0.15, -0.67);
  for (const [x, lid] of [[-0.17, '#3A2F35'], [-0.07, '#F47A1C']]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.09, 16), new THREE.MeshPhongMaterial({ color: '#D8E6EE', shininess: 120, specular: '#FFFFFF', transparent: true, opacity: 0.55 })); pot.position.set(x, BC_Y + 0.05, -0.58); scene.add(pot); outline(pot, 0.003);
    const cof = add(new THREE.CylinderGeometry(0.033, 0.038, 0.05, 16), '#5A2E12'); cof.position.set(x, BC_Y + 0.03, -0.58); const l2 = add(new THREE.CylinderGeometry(0.03, 0.036, 0.02, 16), lid); l2.position.set(x, BC_Y + 0.1, -0.58); }
  const mugT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#F4F2EE'; g.fillRect(0, 0, w, h); drawAnchor(g, w / 2, h / 2 + 4, 34, '#1E2F86', 8); });
  for (let i = 0; i < 4; i++) { const m = add(new THREE.CylinderGeometry(0.03, 0.028, 0.06, 16), '#F4F2EE', { map: mugT, hull: 0.003 }); m.position.set(0.1 + (i % 2) * 0.065, BC_Y + 0.03 + Math.floor(i / 2) * 0.062, -0.6); m.rotation.y = -1.6; }
  const regT = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#2E3240'; g.fillRect(0, 0, w, h); g.fillStyle = '#7CF2A8'; g.fillRect(30, 20, 196, 46); txt(g, 'THANK YOU', w / 2, 44, '30px Osd', '#0B3A20'); for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 5; c++) { g.fillStyle = ['#F4F1EA', '#EB2715', '#F2B705'][(r2 + c) % 3]; g.fillRect(28 + c * 42, 86 + r2 * 34, 30, 24); } });
  const reg = add(new THREE.BoxGeometry(0.2, 0.13, 0.18), '#2E3240', { hull: 0.003 }); reg.position.set(0.33, BC_Y + 0.065, -0.62); const rp = plane(0.19, 0.12, regT); rp.position.set(0.33, BC_Y + 0.07, -0.529); rp.rotation.x = -0.25;
  const pd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#DDEBF5', shininess: 120, specular: '#FFFFFF', transparent: true, opacity: 0.3, depthWrite: false })); pd.position.set(-0.66, BC_Y + 0.02, -0.62); pd.userData.hull = true; scene.add(pd);
  const cake = add(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 24), '#FF9FB2', { hull: 0.003 }); cake.position.set(-0.66, BC_Y + 0.055, -0.62); const ic = add(new THREE.CylinderGeometry(0.071, 0.071, 0.012, 24), '#FFFFFF'); ic.position.set(-0.66, BC_Y + 0.09, -0.62);
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshPhongMaterial({ color: '#EB2715', shininess: 120, specular: '#FFFFFF' })); cherry.position.set(-0.66, BC_Y + 0.105, -0.62); scene.add(cherry);
  const shf = add(new THREE.BoxGeometry(1.1, 0.02, 0.13), '#C4761C', { hull: 0.003 }); shf.position.set(-0.3, 0.98, WALL_Z + 0.065);
  const jars = [['#F2B705', 0.1], ['#EB2715', 0.08], ['#2DC46E', 0.11], ['#C4761C', 0.13], ['#1C9AAA', 0.09], ['#F47A1C', 0.1]];
  jars.forEach(([c, hh], i) => { const x = -0.78 + i * 0.075; const j = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, hh, 14), new THREE.MeshPhongMaterial({ color: c, shininess: 80, specular: '#FFFFFF' })); j.position.set(x, 0.99 + hh / 2, WALL_Z + 0.06); scene.add(j); outline(j, 0.003);
    const lid = add(new THREE.CylinderGeometry(0.025, 0.025, 0.014, 14), '#F4F1EA'); lid.position.set(x, 0.99 + hh + 0.007, WALL_Z + 0.06); });
  const btl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 18), new THREE.MeshPhongMaterial({ color: '#BFE8DA', shininess: 120, specular: '#FFFFFF', transparent: true, opacity: 0.45, depthWrite: false })); btl.rotation.z = Math.PI / 2; btl.position.set(-0.22, 1.025, WALL_Z + 0.06); btl.userData.hull = true; scene.add(btl);   // a ship in a bottle
  const hull2 = add(new THREE.BoxGeometry(0.08, 0.016, 0.022), '#6E4217'); hull2.position.set(-0.22, 1.012, WALL_Z + 0.06); const sail = add(new THREE.PlaneGeometry(0.04, 0.04), '#FFFFFF', { side: THREE.DoubleSide }); sail.position.set(-0.22, 1.04, WALL_Z + 0.06);
  for (let i = 0; i < 3; i++) { const bx = add(new THREE.BoxGeometry(0.05, 0.11, 0.07), ['#EB2715', '#235BDF', '#F2B705'][i], { hull: 0.002 }); bx.position.set(-0.04 + i * 0.058, 1.045, WALL_Z + 0.06); if (i === 2) bx.rotation.z = -0.15; } }
// the printer (story prop, 40.2): the printed menu slides out of it on "prints"
const printer = new THREE.Group(); printer.position.set(-0.45, BC_Y, -0.65); scene.add(printer);
{ const ptT = canvasTex(512, 428, (g, w, h) => { g.fillStyle = '#E4E6EC'; g.fillRect(0, 0, w, h); specks(g, w, h, 2500, ['#D2D5DE', '#F2F3F7'], 1, 2.5, 21); g.fillStyle = '#2E3240'; g.fillRect(24, h - 120, w - 48, 96);
    g.fillStyle = '#7CF2A8'; g.fillRect(44, h - 102, 170, 60); txt(g, 'READY', 129, h - 72, '34px Osd', '#0B3A20'); for (let i = 0; i < 4; i++) { g.fillStyle = ['#EB2715', '#F2B705', '#1C9AAA', '#F4F1EA'][i]; g.beginPath(); g.arc(270 + i * 56, h - 72, 18, 0, 7); g.fill(); }
    g.strokeStyle = '#B9BDC8'; g.lineWidth = 6; for (let y = 40; y < h - 150; y += 34) { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); } g.fillStyle = '#1E2F86'; g.beginPath(); g.roundRect(150, 70, 212, 110, 16); g.fill(); drawAnchor(g, 206, 128, 30, '#FFD75A', 7); txt(g, 'PRINT', 296, 128, '38px Lilita', '#FFFFFF'); });
  const b = add(new THREE.BoxGeometry(0.24, 0.1, 0.2), '#ECECF0', { hull: 0.003 }, printer); b.position.y = 0.05; const bt = plane(0.236, 0.196, ptT); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.1006; printer.add(bt);
  const slot = add(new THREE.BoxGeometry(0.18, 0.012, 0.01), '#2E3240', {}, printer); slot.position.set(0, 0.035, 0.101);
  const tray = add(new THREE.BoxGeometry(0.19, 0.006, 0.12), '#C9CED8', { hull: 0.002 }, printer); tray.position.set(0, 0.022, 0.16); tray.rotation.x = 0.12;
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.006, 10), new THREE.MeshBasicMaterial({ color: '#2BE38A' })); led.position.set(0.09, 0.07, 0.1011); printer.add(led);
  const stack = add(new THREE.BoxGeometry(0.15, 0.03, 0.21), '#FBF6E9', { hull: 0.002 }); stack.position.set(-0.45 + 0.3, BC_Y + 0.015, -0.62); stack.visible = false;
  blob(printer, 0, 0.001, 0.02, 0.32, 0.3, 0.7); }
const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.21), lam('#ffffff', { map: menuTex })); sheet.rotation.x = -Math.PI / 2; scene.add(sheet);

// the booth by the left window: red quilted vinyl, teal piping, a speckled table with a tabletop jukebox (the genre, plus our motif)
{ const qt = quiltTex(0.62, 0.5, '#EB2715', '#A8180A', '#FF6A4E');
  const bench = (z, backZ) => { const seat = add(new THREE.BoxGeometry(0.62, 0.11, 0.3), '#EB2715', { map: qt, hull: 0.003 }); seat.position.set(-1.17, 0.255, z);
    const base = add(new THREE.BoxGeometry(0.6, 0.2, 0.28), '#6E4217'); base.position.set(-1.17, 0.1, z);
    const back = add(new THREE.BoxGeometry(0.62, 0.5, 0.1), '#EB2715', { map: qt, hull: 0.003 }); back.position.set(-1.17, 0.56, backZ);
    const pipe = add(new THREE.BoxGeometry(0.64, 0.025, 0.11), '#1C9AAA', { hull: 0.002 }); pipe.position.set(-1.17, 0.82, backZ); blob(scene, -1.17, 0.002, (z + backZ) / 2, 0.8, 0.5, 0.8); };
  bench(0.22, 0.02); bench(0.93, 1.13);
  const tt = add(new THREE.BoxGeometry(0.58, 0.03, 0.32), '#B2A8A1', { map: formicaTex, hull: 0.003 }); tt.position.set(-1.17, 0.485, 0.56);
  const te = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.016, 0.34), chrome); te.position.set(-1.17, 0.47, 0.56); scene.add(te);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 12), chrome); leg.position.set(-1.17, 0.23, 0.56); scene.add(leg); outline(leg, 0.003);
  const jbT = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#C3C8D0'; g.fillRect(0, 0, w, h); g.fillStyle = '#FFF3D6'; g.fillRect(20, 16, w - 40, 96); for (let i = 0; i < 6; i++) txt(g, ['A1  SEA SHANTY', 'A2  ROCK THE BOAT', 'A3  ANCHORS AWAY'][i % 3], 34, 32 + (i % 3) * 30, '20px Osd', '#1E2F86', 'left');
    for (let i = 0; i < 8; i++) { g.fillStyle = ['#EB2715', '#F2B705', '#1C9AAA', '#2DC46E'][i % 4]; g.beginPath(); g.arc(34 + i * 27, 150, 10, 0, 7); g.fill(); } });
  const jb = add(new THREE.BoxGeometry(0.1, 0.12, 0.08), '#C3C8D0', { hull: 0.003 }); jb.position.set(-1.42, 0.56, 0.47); const jp = plane(0.094, 0.07, jbT); jp.rotation.y = Math.PI / 2; jp.position.set(-1.369, 0.57, 0.47);
  const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.1, 14), new THREE.MeshPhongMaterial({ color: '#EB2715', shininess: 70, specular: '#FFFFFF' })); kb.position.set(-1.4, 0.55, 0.64); scene.add(kb); outline(kb, 0.003);
  const curT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(235,39,21,0.55)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 16, h); for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 16); });
  const cur = plane(0.9, 0.3, curT); cur.rotation.y = Math.PI / 2; cur.position.set(LX + 0.03, 0.98, 0.5); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.95, 8), chrome); rod.rotation.x = Math.PI / 2; rod.position.set(LX + 0.035, 1.13, 0.5); scene.add(rod); }
// the right wall: the restroom door (our hidden joke sign), a framed boat, the jukebox
{ const dT = panelTex('#1C9AAA', '#127684', '#5CC8D4', 256, 768, true); const d = add(new THREE.BoxGeometry(0.04, 1.45, 0.5), '#1C9AAA', { map: dT, hull: 0.004 }); d.position.set(RX - 0.02, 0.725, 0.45);
  const sgT = canvasTex(320, 160, (g, w, h) => { g.fillStyle = '#FFF3D6'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 16); g.fill(); txt(g, 'BUOYS', w / 2, 52, '50px Lilita', '#1E2F86'); txt(g, '& GULLS', w / 2, 112, '46px Lilita', '#D2302A'); });
  const sg = plane(0.16, 0.08, sgT); sg.rotation.y = -Math.PI / 2; sg.position.set(RX - 0.042, 1.12, 0.45); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), chrome); kn.position.set(RX - 0.05, 0.72, 0.26); scene.add(kn);
  const boatT = canvasTex(320, 256, (g, w, h) => { g.fillStyle = '#9ED4FF'; g.fillRect(0, 0, w, h); g.fillStyle = '#1F7FD0'; g.fillRect(0, 170, w, 86); g.fillStyle = '#EB2715'; g.beginPath(); g.moveTo(60, 170); g.lineTo(260, 170); g.lineTo(230, 205); g.lineTo(90, 205); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(160, 60); g.lineTo(160, 165); g.lineTo(240, 165); g.fill(); g.fillStyle = '#F2B705'; g.beginPath(); g.moveTo(150, 80); g.lineTo(150, 165); g.lineTo(90, 165); g.fill(); });
  const bf = add(new THREE.BoxGeometry(0.014, 0.22, 0.27), '#6E4217', { hull: 0.003 }); bf.position.set(RX - 0.007, 1.42, -0.2); const bp = plane(0.24, 0.19, boatT); bp.rotation.y = -Math.PI / 2; bp.position.set(RX - 0.015, 1.42, -0.2);
  const jbx = new THREE.Group(); jbx.position.set(RX - 0.18, 0, 1.3); jbx.rotation.y = -Math.PI / 2; scene.add(jbx);
  const jt = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#EB2715'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#F2B705'); gr.addColorStop(0.5, '#FFE27A'); gr.addColorStop(1, '#F2B705'); g.fillStyle = gr; g.fillRect(30, 40, w - 60, 200);
    g.fillStyle = '#1C9AAA'; for (let i = 0; i < 5; i++) g.fillRect(40 + i * 38, 270, 24, 120); g.fillStyle = '#C3C8D0'; g.fillRect(30, 410, w - 60, 70); g.fillStyle = '#2E3240'; for (let x = 40; x < w - 40; x += 14) g.fillRect(x, 420, 6, 50); });
  const jbody = add(new THREE.BoxGeometry(0.34, 0.5, 0.2), '#EB2715', { map: jt, hull: 0.004 }, jbx); jbody.position.y = 0.25; const jtop = add(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 24, 1, false, 0, Math.PI), '#F2B705', { hull: 0.004 }, jbx); jtop.rotation.set(Math.PI / 2, 0, Math.PI / 2); jtop.position.y = 0.5;
  blob(jbx, 0, 0.002, 0, 0.5, 0.36, 0.85); }
// the front wall (for the reverse at night): the glass door with its sign (inside face says CLOSED, so the street reads OPEN), gumballs, a plant, the neon anchor
{ const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.5), new THREE.MeshBasicMaterial({ color: '#BFE3F7', transparent: true, opacity: 0.12, depthWrite: false })); gl.rotation.y = Math.PI; gl.position.set(1.04, 0.78, FZ - 0.01); gl.userData.hull = true; scene.add(gl);
  const cT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 12); g.fill(); txt(g, "SORRY, WE'RE", w / 2, 40, '30px Lilita', '#1D2340'); txt(g, 'CLOSED', w / 2, 88, '54px Lilita', '#D2302A'); });
  const cs = plane(0.16, 0.08, cT); cs.rotation.y = Math.PI; cs.position.set(1.04, 1.2, FZ - 0.03); const str2 = add(new THREE.BoxGeometry(0.002, 0.08, 0.002), '#2E3240'); str2.position.set(1.04, 1.28, FZ - 0.03);
  const bell2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#F2B705', shininess: 120, specular: '#FFFFFF' })); bell2.position.set(1.04, 1.57, FZ - 0.04); scene.add(bell2); outline(bell2, 0.003);
  const gb = new THREE.Group(); gb.position.set(-1.25, 0, FZ - 0.22); scene.add(gb);
  const gbT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#DDEBF5'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 90; i++) { g.fillStyle = ['#EB2715', '#F2B705', '#2DC46E', '#1C9AAA', '#7A3FD1', '#FFFFFF'][i % 6]; g.beginPath(); g.arc(r() * w, r() * h, 7, 0, 7); g.fill(); } });
  const post = add(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 10), '#EB2715', { hull: 0.003 }, gb); post.position.y = 0.3; const base = add(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 20), '#EB2715', { hull: 0.003 }, gb); base.position.y = 0.015;
  const head2 = add(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 20), '#EB2715', { hull: 0.003 }, gb); head2.position.y = 0.65; const globe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshPhongMaterial({ map: gbT, shininess: 120, specular: '#FFFFFF' })); globe.position.y = 0.79; gb.add(globe); outline(globe, 0.004);
  const cap = add(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), '#EB2715', {}, gb); cap.position.y = 0.9; blob(gb, 0, 0.002, 0, 0.3, 0.3, 0.8);
  const pl = new THREE.Group(); pl.position.set(0.5, 0, FZ - 0.2); scene.add(pl); const pt = add(new THREE.CylinderGeometry(0.11, 0.08, 0.22, 20), '#C4561C', { hull: 0.004 }, pl); pt.position.y = 0.11;
  const r = rng(12); for (let i = 0; i < 9; i++) { const lf = add(new THREE.SphereGeometry(0.07, 12, 8), i % 2 ? '#1FA35B' : '#2DC46E', {}, pl); lf.scale.set(0.55, 1.6, 0.3); const a = i / 9 * Math.PI * 2; lf.position.set(0.07 * Math.cos(a), 0.34 + 0.14 * r(), 0.07 * Math.sin(a)); lf.rotation.set(0.6 * Math.sin(a), a, 0.6 * Math.cos(a)); } blob(pl, 0, 0.002, 0, 0.36, 0.36, 0.8); }
const neonTex = canvasTex(256, 256, (g, w, h) => { g.shadowColor = '#5CF2FF'; g.shadowBlur = 24; drawAnchor(g, w / 2, h / 2 + 10, 80, '#9AF6FF', 12); drawAnchor(g, w / 2, h / 2 + 10, 80, '#E8FDFF', 5); }); neonTex.colorSpace = THREE.NoColorSpace;
const neon = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); neon.rotation.y = Math.PI; neon.position.set(-0.6, 1.36, FZ - 0.05); neon.userData.hull = true; scene.add(neon);

// the kitchen behind the pass (seen only through it): tiled walls, the hood, pots, the heat lamp, the order bell and the ticket rail
const KX0 = 0.3, KX1 = 1.5, KZ = -1.6;
const kTile = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#ECE9E3'; g.fillRect(0, 0, w, h); const r = rng(41); for (let y = 0; y < h; y += 40) for (let x = ((y / 40) % 2) * 40; x < w; x += 80) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '120,110,100'},${0.08 * r()})`; g.fillRect(x, y, 80, 40); }
  g.strokeStyle = '#BDB8B0'; g.lineWidth = 3; for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = ((y / 40) % 2) * 40; x <= w; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke(); } } specks(g, w, h, 3000, ['#D2CEC6', '#F6F4F0'], 1, 2.5, 43); });
{ const b = plane(KX1 - KX0, CEIL, kTile); b.position.set((KX0 + KX1) / 2, CEIL / 2, KZ);
  const l = plane(WALL_Z - KZ, CEIL, kTile); l.rotation.y = Math.PI / 2; l.position.set(KX0, CEIL / 2, (KZ + WALL_Z) / 2);
  const r = plane(WALL_Z - KZ, CEIL, kTile); r.rotation.y = -Math.PI / 2; r.position.set(KX1, CEIL / 2, (KZ + WALL_Z) / 2);
  const kf = add(new THREE.PlaneGeometry(KX1 - KX0, WALL_Z - KZ), '#8E8A86'); kf.rotation.x = -Math.PI / 2; kf.position.set((KX0 + KX1) / 2, 0.001, (KZ + WALL_Z) / 2);
  const kc = add(new THREE.PlaneGeometry(KX1 - KX0, WALL_Z - KZ), '#DCD7CC'); kc.rotation.x = Math.PI / 2; kc.position.set((KX0 + KX1) / 2, CEIL, (KZ + WALL_Z) / 2);
  const hood = add(new THREE.BoxGeometry(0.9, 0.26, 0.38), '#B7BCC6', { hull: 0.004 }); hood.position.set(0.95, 1.62, KZ + 0.2);
  const ks = add(new THREE.BoxGeometry(0.9, 0.02, 0.16), '#9DA3AD', { hull: 0.003 }); ks.position.set(0.95, 1.2, KZ + 0.08);
  [['#9DA3AD', 0.62, 0.09], ['#C4761C', 0.82, 0.07], ['#EB2715', 1.02, 0.08], ['#9DA3AD', 1.2, 0.06]].forEach(([c, x, hh]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, hh, 18), new THREE.MeshPhongMaterial({ color: c, shininess: 80, specular: '#FFFFFF' })); p.position.set(x, 1.21 + hh / 2, KZ + 0.08); scene.add(p); outline(p, 0.003); });
  for (const x of [0.7, 0.85, 1.0]) { const hk = add(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 8), '#9DA3AD', { hull: 0.002 }); hk.position.set(x, 1.0, KZ + 0.03); const bowl = add(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#9DA3AD', { hull: 0.002 }); bowl.position.set(x, 0.9, KZ + 0.03); }
  const grill = add(new THREE.BoxGeometry(0.8, 0.5, 0.4), '#3A3E48', { hull: 0.004 }); grill.position.set(0.95, 0.25, KZ + 0.22); const gt = add(new THREE.BoxGeometry(0.8, 0.02, 0.4), '#2A2D38'); gt.position.set(0.95, 0.51, KZ + 0.22);
  for (const x of [0.75, 0.95, 1.15]) { const pat = add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), '#6E3A16', { hull: 0.002 }); pat.position.set(x, 0.53, KZ + 0.24); } }
const shelfPass = add(new THREE.BoxGeometry(PX1 - PX0 + 0.1, 0.025, 0.34), '#C3C8D0', { mat: chrome }); shelfPass.position.set(PXC, PY0, WALL_Z); outline(shelfPass, 0.003);
{ const hl = add(new THREE.BoxGeometry(PX1 - PX0 - 0.06, 0.04, 0.08), '#3A2F35', { hull: 0.003 }); hl.position.set(PXC, PY1 - 0.03, WALL_Z - 0.06);
  const glowStrip = new THREE.Mesh(new THREE.PlaneGeometry(PX1 - PX0 - 0.1, 0.05), new THREE.MeshBasicMaterial({ color: '#FFB070' })); glowStrip.rotation.x = Math.PI / 2; glowStrip.position.set(PXC, PY1 - 0.051, WALL_Z - 0.06); scene.add(glowStrip); }
const heatLight = new THREE.PointLight('#FFB070', 0, 1.2, 1.4); heatLight.position.set(PXC, 0.95, WALL_Z - 0.2); scene.add(heatLight);
const bell = new THREE.Group(); bell.position.set(1.12, PY0 + 0.0125, WALL_Z + 0.08); scene.add(bell);
{ const b = add(new THREE.CylinderGeometry(0.03, 0.032, 0.01, 20), '#2E3240', {}, bell); b.position.y = 0.005; const d = new THREE.Mesh(new THREE.SphereGeometry(0.028, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), chrome); d.position.y = 0.01; bell.add(d); outline(d, 0.003);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 8), chrome); p.position.y = 0.044; bell.add(p); }
{ const rail = new THREE.Mesh(new THREE.BoxGeometry(PX1 - PX0 - 0.04, 0.018, 0.018), chrome); rail.position.set(PXC, PY1 - 0.08, WALL_Z + 0.03); scene.add(rail); outline(rail, 0.002); }
const tickets = [];
{ const words = [['#21', 'BURGER'], ['#22', 'BURGER x2'], ['#23', 'BURGER'], ['#24', 'BURGER x3'], ['#25', 'BURGER'], ['#26', 'BURGER x2'], ['#27', 'BURGER + PIE'], ['#28', 'BURGER'], ['#29', 'BURGER x4'], ['#30', 'BURGER'], ['#31', 'BURGER x2'], ['#32', 'BURGER']];
  words.forEach(([a, b], i) => { const t2 = canvasTex(160, 256, (g, w, h) => { paper(g, w, h, 0, '#FFFDF6'); g.fillStyle = '#EB2715'; g.fillRect(0, 0, w, 10); txt(g, a, w / 2, 44, '34px Marker', '#1E2F86'); txt(g, b.split(' ')[0], w / 2, 116, '36px Marker', '#2A2A2A'); if (b.includes(' ')) txt(g, b.split(' ').slice(1).join(' '), w / 2, 168, '34px Marker', '#D2302A'); marker(g, '#9A9A9A', 2); wobLine(g, 20, 210, 140, 212, 3, i); g.stroke(); });
    const m = plane(0.042, 0.068, t2); m.position.set(PX0 + 0.05 + i * 0.05, PY1 - 0.123, WALL_Z + 0.042); m.rotation.z = ((i * 7) % 5 - 2) * 0.03; tickets.push(m); }); }
// a spatula for the cook
const spat = new THREE.Group(); scene.add(spat);
{ const h = add(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8), '#2E3240', {}, spat); h.position.y = 0.05; const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.06), chrome); bl.position.set(0, -0.005, 0.025); bl.rotation.x = 0.4; spat.add(bl); outline(bl, 0.002); }

// the pendant lamps (138, 139): hollow lathe shells with a lip, seen from below; lit by day, only the counter lamp at night
@@ 207-219
const innerOff = innerLit.clone(); innerOff.uniforms.on.value = 0;
for (const [x, z] of [[-0.62, 0.0], [0.15, 0.0], [-1.17, 0.56]]) {
  const L = new THREE.Group(); L.position.set(x, 1.66, z); L.scale.setScalar(1.25); scene.add(L);
  const shell = add(new THREE.LatheGeometry(lampProf, 48), '#1F9AA8', { mat: new THREE.MeshToonMaterial({ color: '#1C9AAA', gradientMap: toonRamp }) }, L); outline(shell, 0.004, '#0A2F38');
  const inner = new THREE.Mesh(new THREE.LatheGeometry(lampProf.map(v => new THREE.Vector2(v.x * 0.955, v.y - 0.002)), 48), innerLit); L.add(inner);
  const lip = add(new THREE.TorusGeometry(0.125, 0.0055, 8, 48), '#221526', { mat: new THREE.MeshBasicMaterial({ color: '#221526' }) }, L); lip.rotation.x = Math.PI / 2; lip.position.y = -0.099;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.5, 6), new THREE.MeshBasicMaterial({ color: '#1B0C08' })); cord.position.y = 0.25; L.add(cord);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glow.scale.set(0.2, 0.2, 1); glow.position.y = -0.055; L.add(glow);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshBasicMaterial({ color: '#D2CFE2', side: THREE.DoubleSide })); disc.rotation.x = Math.PI / 2; disc.position.y = -0.07; L.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.04, 24), new THREE.MeshBasicMaterial({ color: '#2A1B1C', side: THREE.DoubleSide })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.0705; L.add(ring);
  const pl = new THREE.PointLight('#FFE2B8', 0, 1.8, 1.6); pl.position.set(x, 1.6, z); scene.add(pl);
  lamps.push({ glow, disc, ring, pl, inner });
}
@@ 253-258
aoStrip(3.0, 0.32, 0, CEIL - 0.16, WALL_Z + 0.003, 0, 0, 0.35, true);
aoStrip(2.5, 0.3, LX + 0.003, CEIL - 0.15, 0.5, 0, Math.PI / 2, 0.35, true); aoStrip(2.5, 0.3, RX - 0.003, CEIL - 0.15, 0.5, 0, -Math.PI / 2, 0.35, true); aoStrip(3.0, 0.3, 0, CEIL - 0.15, FZ - 0.003, 0, Math.PI, 0.35, true);
aoStrip(2.5, 0.24, LX + 0.003, 0.12, 0.5, 0, Math.PI / 2); aoStrip(2.5, 0.32, LX + 0.16, 0.002, 0.5, -Math.PI / 2, Math.PI / 2, 0.45, true);
aoStrip(2.5, 0.24, RX - 0.003, 0.12, 0.5, 0, -Math.PI / 2); aoStrip(2.5, 0.32, RX - 0.16, 0.002, 0.5, -Math.PI / 2, -Math.PI / 2, 0.45, true);
aoStrip(3.0, 0.24, 0, 0.12, FZ - 0.003, 0, Math.PI); aoStrip(3.0, 0.32, 0, 0.002, FZ - 0.16, -Math.PI / 2, Math.PI, 0.45, true);
aoStrip(1.4, 0.24, -0.9 + 1.6, 0.12, WALL_Z + 0.003, 0, 0); aoStrip(1.27, 0.3, -0.175, BC_Y + 0.15, WALL_Z + 0.004, 0, 0, 0.3);
wallBlob(0.4, 0.3, -1.17, 1.5, WALL_Z + 0.004, 0, 0.45); wallBlob(1.2, 0.5, -0.3, 1.47, WALL_Z + 0.004, 0, 0.35);
@@ 359
lamps.forEach((l, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = Math.PI / 2; m.position.set(l.pl.position.x, CEIL - 0.003, l.pl.position.z); m.userData.hull = true; scene.add(m); l.pool = m; });

// the grilled cheese, its gold foil, the parcel and the bow (the payoff props, 40.2): on the counter at night
const plateG = new THREE.Group(); scene.add(plateG);
const foilTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#E9A916'; g.fillRect(0, 0, w, h); const r = rng(5);
  for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, s = 20 + r() * 60; g.fillStyle = ['#FFD75A', '#B87A08', '#F6C531', '#FFF1B0', '#C98A0A'][i % 5]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * (r() - 0.2), y + s * 0.3); g.lineTo(x + s * 0.4, y + s * (r() + 0.2)); g.closePath(); g.fill(); }
  marker(g, 'rgba(120,70,0,0.35)', 2); for (let i = 0; i < 40; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + 60 * (r() - 0.5), y + 60 * (r() - 0.5)); g.stroke(); } });
const foilMat = new THREE.MeshPhongMaterial({ map: foilTex, shininess: 45, specular: '#9A7A2A', side: THREE.DoubleSide });
{ const p = add(new THREE.CylinderGeometry(0.1, 0.085, 0.012, 36), '#F4F2EE', { hull: 0.003 }, plateG); p.position.y = 0.006; const st2 = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.003, 6, 36), lam('#1E2F86')); st2.rotation.x = Math.PI / 2; st2.position.y = 0.0125; plateG.add(st2);
  blob(plateG, 0, 0.001, 0, 0.26, 0.26, 0.6); }
const toastTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#E3A24A'; g.fillRect(0, 0, w, h); specks(g, w, h, 1400, ['#C4761C', '#F2C879'], 1, 3, 9); marker(g, '#8A4A12', 14); for (const x of [60, 128, 196]) { g.beginPath(); g.moveTo(x - 30, 20); g.lineTo(x + 30, 236); g.stroke(); } g.strokeStyle = '#B86A1C'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); });
const gc = new THREE.Group(); plateG.add(gc); gc.position.y = 0.0125;
{ for (const y of [0.007, 0.027]) { const b = add(new THREE.BoxGeometry(0.11, 0.014, 0.1), '#E3A24A', { map: toastTex, hull: 0.0025 }, gc); b.position.y = y; }
  const ch = add(new THREE.BoxGeometry(0.115, 0.006, 0.104), '#FFC21F', {}, gc); ch.position.y = 0.017;
  for (const [x, z] of [[0.03, 0.053], [-0.025, 0.053], [0.058, -0.01]]) { const d = add(new THREE.SphereGeometry(0.008, 10, 8), '#FFC21F', {}, gc); d.position.set(x, 0.012, z); d.scale.set(1, 1.6, 1); } }
const foilBase = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.14), foilMat); foilBase.rotation.x = -Math.PI / 2; foilBase.position.y = 0.0128; plateG.add(foilBase);
const flaps = [[0, 0.07, 0.15, 0.07, 0], [0, -0.07, 0.15, 0.07, Math.PI], [0.075, 0, 0.14, 0.07, -Math.PI / 2], [-0.075, 0, 0.14, 0.07, Math.PI / 2]].map(([x, z, w2, h2, ry]) => {
  const pv = new THREE.Group(); pv.position.set(x, 0.0128, z); pv.rotation.y = ry; plateG.add(pv);   // a hinge on each edge of the sheet; the flap lies outward and folds up over the top
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), foilMat); f.rotation.x = -Math.PI / 2; f.position.z = h2 / 2; pv.add(f); return pv; });
const parcel = new THREE.Group(); plateG.add(parcel); parcel.position.y = 0.0125;
{ const b = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.042, 0.12), new THREE.MeshPhongMaterial({ map: foilTex, shininess: 110, specular: '#FFF3C0' })); b.position.y = 0.021; parcel.add(b); outline(b, 0.003, disp('#7A4A00'));
  const rb = new THREE.Group(); rb.name = 'ribbon'; parcel.add(rb);
  for (const [w2, d2] of [[0.134, 0.018], [0.018, 0.124]]) { const r2 = add(new THREE.BoxGeometry(w2, 0.044, d2), '#EB2715', {}, rb); r2.position.y = 0.021; }
  for (const sd of [-1, 1]) { const loop = add(new THREE.TorusGeometry(0.018, 0.006, 8, 20), '#EB2715', {}, rb); loop.position.set(sd * 0.019, 0.05, 0); loop.rotation.set(0, Math.PI / 2, sd * 0.5); loop.scale.set(1, 0.7, 1); outline(loop, 0.003);
    const tail = add(new THREE.BoxGeometry(0.008, 0.002, 0.04), '#EB2715', {}, rb); tail.position.set(sd * 0.012, 0.043, 0.025); tail.rotation.y = sd * 0.5; }
  const knot = add(new THREE.SphereGeometry(0.009, 12, 8), '#C81A0C', { hull: 0.002 }, rb); knot.position.y = 0.047; }
// the stranger's menu lies on the counter; two customers read one in the booth; one more on the counter for the first customer
const menuA = makeMenu(0.2), menuC = makeMenu(0.2), menuS = makeMenu(0.2);

// ================= SET 3: the explanation board (x = 40), top-down, cold light with blind stripes (12, 38) =================
@@ 475-481
const bmCanvas = document.createElement('canvas'); bmCanvas.width = 512; bmCanvas.height = 720; const bmTex = new THREE.CanvasTexture(bmCanvas); bmTex.colorSpace = THREE.SRGBColorSpace; bmTex.anisotropy = 8;
@@ 495-501
let bmKey = ''; function drawBoardMenu(stamp) { const key = stamp ? 's' : 'n'; if (key === bmKey) return; bmKey = key; const g = bmCanvas.getContext('2d'); drawMenu(g, 512, 720);
  marker(g, '#D2302A', 9); wobEll(g, 336, 270, 96, 52, 5, 71, 1.12); g.stroke();                       // the marker circle round the crazy price
  marker(g, '#235BDF', 8); g.setLineDash([22, 16]); wob(g, [[452, 318], [478, 372], [484, 470], [476, 600]], false, 6, 73); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#235BDF'; g.beginPath(); g.moveTo(476, 626); g.lineTo(456, 590); g.lineTo(496, 592); g.fill();
  if (stamp) { g.save(); g.globalAlpha = 0.93; g.globalCompositeOperation = 'multiply'; g.translate(250, 446); g.scale(0.62, 0.62); g.drawImage(stampInk, -340, -170); g.restore(); }
  bmTex.needsUpdate = true; }
drawBoardMenu(false);
const graphTex = canvasTex(1024, 1024, (g, w, h) => { paper(g, w, h, 64); txt(g, 'SOLD THIS WEEK', w / 2, 110, '100px Marker', '#1D2340');
  const base = 820; marker(g, '#1D2340', 11); wobLine(g, 110, base, 930, base - 4, 6, 3); g.stroke(); wobLine(g, 140, base + 10, 146, 200, 6, 4); g.stroke();
  marker(g, '#C9930A', 12); wobLine(g, 210, base - 6, 420, base - 8, 5, 9); g.stroke(); txt(g, '0', 315, base - 70, '110px Marker', '#C9930A');
  hatch(g, 605, base - 560, 215, 560, '#E5302A', 28, 8); marker(g, '#1D2340', 10); wobRect(g, 600, base - 560, 222, 560, 8, 13); g.stroke();
  txt(g, 'ADMIRAL', 315, base + 74, '66px Marker', '#3A3F4C'); txt(g, 'BURGER', 712, base + 74, '66px Marker', '#3A3F4C'); });
const polTex = canvasTex(768, 900, (g, w, h) => { g.fillStyle = '#FBFAF6'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 40, 0, 660); gr.addColorStop(0, '#1B2A7A'); gr.addColorStop(1, '#3646B8'); g.fillStyle = gr; g.fillRect(40, 40, w - 80, 620);
  g.fillStyle = '#B2A8A1'; g.fillRect(40, 470, w - 80, 190); g.fillStyle = '#F4F2EE'; g.beginPath(); g.ellipse(384, 520, 210, 70, 0, 0, 7); g.fill(); g.strokeStyle = '#1E2F86'; g.lineWidth = 8; g.stroke();
  goldBox(g, 250, 380, 268, 150); g.fillStyle = '#EB2715'; g.fillRect(370, 380, 28, 150); g.fillRect(250, 442, 268, 26); g.beginPath(); g.ellipse(352, 372, 40, 26, -0.4, 0, 7); g.ellipse(416, 372, 40, 26, 0.4, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,214,150,0.35)'; g.beginPath(); g.arc(384, 80, 160, 0, 7); g.fill();
  txt(g, 'TABLE 3 · 2 AM', w / 2, 760, '62px Marker', '#2A2F3C'); txt(g, '(GRILLED CHEESE)', w / 2, 834, '50px Marker', '#D2302A'); });
const noteTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#FFE14D'; g.fillRect(0, 0, w, h); txt(g, 'NOT FOR', w / 2, 190, '84px Marker', '#2A2F3C'); txt(g, 'EATING!', w / 2, 300, '92px Marker', '#D2302A'); });
const MC = { x: 0.1, z: -0.3, w: 0.56, h: 0.79 };
const bmCard = card(MC.w, MC.h, bmTex, MC.x, MC.z, 0.02); pin(MC.x, MC.z - MC.h / 2 + 0.025);
card(0.5, 0.5, graphTex, -0.36, 0.5, -0.05); pin(-0.36, 0.28);
card(0.38, 0.445, polTex, 0.38, 0.55, 0.1); pin(0.38, 0.35);
card(0.22, 0.22, noteTex, -0.47, -0.42, 0.18); pin(-0.47, -0.5);
@@ 516
tape(-0.58, 0.27, 0.5); tape(-0.14, 0.27, -0.4); tape(-0.15, -0.69, 0.3); tape(0.35, -0.69, -0.35); tape(0.24, 0.33, 0.6, 0.09);
@@ 518-525

// ================= the characters (106-109, 116, 129-131): one rig, colours + one accessory each =================
@@ 527-688

// the cast: the owner SKIP (lead: navy shirt, white apron with the anchor, captain's hat, moustache; authority = darkest, most
// saturated outfit, 28.6), the cook (red tee, teal bandana), three customers (one accessory each, 17), the stranger (trench, fedora)
const own = makeChar({ shirt: '#1E2F86', hair: ['#5A3A24', '#3A2416', '#7E5638'], kind: 1, fr0: 0.5, frDip: 0.16, frPart: 0.0, moustache: '#5A3A24',
  cloth: (g, w, h, dk, lt) => { g.fillStyle = '#F4F1EA'; g.beginPath(); g.moveTo(w * 0.43, h * 0.14); g.lineTo(w * 0.57, h * 0.14); g.lineTo(w * 0.6, h * 0.42); g.lineTo(w * 0.65, h); g.lineTo(w * 0.35, h); g.lineTo(w * 0.4, h * 0.42); g.closePath(); g.fill();   // the apron bib on the front
    g.strokeStyle = '#C9C2B4'; g.lineWidth = 5; g.stroke(); specks(g, w, h, 1600, ['#E2DCCF', '#FFFFFF'], 1, 3, 77, (x, y) => x > w * 0.38 && x < w * 0.62 && y > h * 0.2);
    g.strokeStyle = '#F4F1EA'; g.lineWidth = 16; g.beginPath(); g.moveTo(w * 0.435, h * 0.15); g.lineTo(w * 0.41, 0); g.moveTo(w * 0.565, h * 0.15); g.lineTo(w * 0.59, 0); g.stroke();
    g.strokeStyle = '#C9C2B4'; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.36, h * 0.66); g.lineTo(w * 0.64, h * 0.66); g.stroke(); g.lineWidth = 9; g.strokeStyle = '#F4F1EA'; g.beginPath(); g.moveTo(w * 0.36, h * 0.66); g.lineTo(w * 0.2, h * 0.68); g.moveTo(w * 0.64, h * 0.66); g.lineTo(w * 0.8, h * 0.68); g.stroke();
    pocket(g, w * 0.455, h * 0.72, w * 0.09, h * 0.16, '#B9B2A4', '#FFFFFF', false); drawAnchor(g, w * 0.5, h * 0.36, 26, '#1E2F86', 6); } });
{ const tagT = canvasTex(256, 112, (g) => { g.fillStyle = '#F7F4EF'; g.fillRect(0, 0, 256, 112); txt(g, 'SKIP', 128, 60, '76px Lilita', '#1E2F86'); });
  const tag = add(new THREE.BoxGeometry(0.06, 0.028, 0.004), '#F7F4EF', { map: tagT }, own.body); tag.position.set(-0.075, 0.68, onTorso(-0.075, 0.68) + 0.003); tag.rotation.y = -0.5; outline(tag, 0.0028);
  const hat = new THREE.Group(); hat.position.set(0, R * 0.62, 0.0); hat.rotation.x = -0.12; own.head.add(hat);   // 182: hats sit high, the brim edge just above the brows
  const band = add(new THREE.CylinderGeometry(R * 0.92, R * 0.94, 0.04, 40), '#1D2340', {}, hat); band.scale.set(HX, 1, 1); band.position.y = 0.02; outline(band, 0.005);
  const crown = add(new THREE.CylinderGeometry(R * 1.12, R * 0.93, 0.055, 40), '#F4F1EA', {}, hat); crown.scale.set(HX, 1, 1.02); crown.position.y = 0.067; outline(crown, 0.006);
  const braid = new THREE.Mesh(new THREE.TorusGeometry(R * 0.935, 0.004, 6, 40), lam('#E9A916')); braid.rotation.x = Math.PI / 2; braid.scale.set(HX, 1, 1); braid.position.y = 0.04; hat.add(braid);
  const brim = add(new THREE.CylinderGeometry(R * 0.8, R * 0.85, 0.012, 32), '#1D2340', {}, hat); brim.scale.set(1.12, 1, 0.75); brim.position.set(0, -0.002, R * 0.42); brim.rotation.x = 0.1; outline(brim, 0.006);
  const bT = canvasTex(128, 128, (g) => { g.fillStyle = '#F2B705'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#8A5A00'; g.lineWidth = 6; g.stroke(); drawAnchor(g, 64, 66, 36, '#1D2340', 8); });
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), new THREE.MeshBasicMaterial({ map: bT, transparent: true })); badge.position.set(0, 0.022, R * 0.94 + 0.002); hat.add(badge); }
const cook = makeChar({ shirt: '#E5302A', hair: ['#1C9AAA', '#127684', '#5CC8D4'], kind: 1, fr0: 0.46, frDip: 0.1, frPart: 0.0, res: 512,
  cloth: (g, w, h, dk, lt) => { g.strokeStyle = dk; g.lineWidth = 6; g.beginPath(); g.ellipse(w * 0.5, 0, w * 0.06, h * 0.1, 0, 0, Math.PI); g.stroke(); g.beginPath(); g.moveTo(0, h * 0.16); g.lineTo(w * 0.25, h * 0.2); g.moveTo(w * 0.75, h * 0.2); g.lineTo(w, h * 0.16); g.stroke();
    g.fillStyle = '#F4F1EA'; g.beginPath(); g.ellipse(w * 0.44, h * 0.62, w * 0.012, h * 0.04, 0.3, 0, 7); g.fill(); } });
{ for (const sd of [-1, 1]) { const k = add(new THREE.SphereGeometry(0.025, 12, 8), '#1C9AAA', {}, cook.head); k.scale.set(0.6, 1, 1.4); k.position.set(sd * 0.03, R * 0.25, -R * 1.02); k.rotation.z = sd * 0.6; outline(k, 0.004); } }
const cA = makeChar({ shirt: '#22B25F', hair: ['#A45915', '#6B3510', '#D98A3A'], kind: 0, fr0: 0.6,
  cloth: (g, w, h, dk, lt) => { g.strokeStyle = dk; g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.86, 0); g.quadraticCurveTo(w * 0.93, h * 0.34, w * 1.0, h * 0.36); g.moveTo(w * 0.14, 0); g.quadraticCurveTo(w * 0.07, h * 0.34, 0, h * 0.36); g.stroke();
    g.beginPath(); g.moveTo(w * 0.4, h * 0.82); g.lineTo(w * 0.43, h * 0.58); g.lineTo(w * 0.57, h * 0.58); g.lineTo(w * 0.6, h * 0.82); g.stroke(); } });
{ const tuft = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, R * 0.98, 0.02), V(0.012, R * 1.22, 0.0), V(0.045, R * 1.3, -0.02), V(0.06, R * 1.18, -0.03)]), 16, 0.011, 8), lam('#A45915')); cA.head.add(tuft); outline(tuft, 0.006);
  const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.12, 0.011, 8, 40, Math.PI), lam('#2A2D3A')); cA.head.add(band);
  for (const s of [-1, 1]) { const cup = add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20), '#1C9AAA', {}, cA.head); cup.rotation.z = Math.PI / 2; cup.position.set(s * R * 1.12, -0.01, 0); outline(cup, 0.004); } }
const cB = makeChar({ shirt: '#7A3FD1', hair: ['#E5302A', '#A01F18', '#FF6A55'], kind: 2, fr0: 0.58, frDip: 0.1, frPart: 0.0, res: 512,
  cloth: (g, w, h, dk, lt) => { g.strokeStyle = dk; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.4, h * 0.82); g.lineTo(w * 0.43, h * 0.58); g.lineTo(w * 0.57, h * 0.58); g.lineTo(w * 0.6, h * 0.82); g.stroke();
    g.strokeStyle = '#F2F2EE'; g.lineWidth = 4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * (0.5 + s * 0.03), h * 0.04); g.lineTo(w * (0.5 + s * 0.035), h * 0.3); g.stroke(); } } });
{ const pom = add(new THREE.SphereGeometry(0.035, 16, 12), '#F2B705', {}, cB.head); pom.position.set(0, R * 1.12, 0); outline(pom, 0.005); }
const cC = makeChar({ shirt: '#F2B705', hair: ['#2A2030', '#16101C', '#4A3C52'], kind: 1, fr0: 0.55, frDip: 0.14, res: 512 });
{ const brim = add(new THREE.CylinderGeometry(R * 0.8, R * 0.85, 0.014, 32), '#EB2715', {}, cC.head); brim.scale.set(1.12, 1, 0.75); brim.position.set(0, R * 0.62, -R * 0.5); brim.rotation.x = -0.04; outline(brim, 0.006); }
const str = makeChar({ shirt: '#B8642A', hair: ['#2A2030', '#16101C', '#4A3C52'], kind: 1, fr0: 0.5, frDip: 0.12,
  cloth: (g, w, h, dk, lt) => { for (const s of [-1, 1]) { g.strokeStyle = dk; g.lineWidth = 7; g.beginPath(); g.moveTo(w * (0.5 + s * 0.09), 0); g.quadraticCurveTo(w * (0.5 + s * 0.07), h * 0.3, w * (0.5 - s * 0.02), h * 0.55); g.stroke(); }   // trench: lapels, double buttons, the belt
    g.fillStyle = dk; for (const y of [0.42, 0.56]) for (const s of [-1, 1]) { g.beginPath(); g.arc(w * (0.5 + s * 0.04), h * y, 7, 0, 7); g.fill(); }
    g.fillStyle = '#7A3E14'; g.fillRect(0, h * 0.66, w, h * 0.07); g.fillStyle = '#C9A26B'; g.fillRect(w * 0.47, h * 0.655, w * 0.06, h * 0.08); g.fillStyle = '#7A3E14'; g.fillRect(w * 0.485, h * 0.675, w * 0.03, h * 0.04); } });
{ const hat = new THREE.Group(); hat.position.set(0, R * 0.64, 0); hat.rotation.set(0.1, 0, 0.06); str.head.add(hat);
  const brim = add(new THREE.CylinderGeometry(R * 1.45, R * 1.45, 0.012, 40), '#3A2F45', {}, hat); brim.scale.set(1, 1, 0.92); outline(brim, 0.006);
  const crown = add(new THREE.CylinderGeometry(R * 0.8, R * 0.95, 0.11, 40), '#3A2F45', {}, hat); crown.scale.set(HX, 1, 1); crown.position.y = 0.06; outline(crown, 0.006);
  const band = add(new THREE.CylinderGeometry(R * 0.955, R * 0.96, 0.026, 40), '#EB2715', {}, hat); band.scale.set(HX, 1, 1); band.position.y = 0.02;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.7, 0.08, 32, 1, true, Math.PI * 0.18, Math.PI * 1.64), lam('#9A5220', { side: THREE.DoubleSide })); col.position.y = TB + TH + 0.0; col.rotation.y = Math.PI; str.body.add(col); outline(col, 0.004); }
@@ 715
@@ 731-732
@@ 733-752

// ---------- lights: one key chosen by place and time (113), set per look ----------
@@ 755-757
const LOOKS = {   // day = warm diner morning, lamps on; night = saturated blue wash, one warm lamp over the counter (113); board = cold truth
  day: { bg: '#E9EEF0', sky: '#FFFFFF', gnd: '#C2BEB8', hi: 2.6, key: '#FFFAF2', ki: 2.45, kp: [-1.6, 1.4, 2.0], fill: '#E0E8FF', fi: 0.45, tint: '#FFFFFF', lamps: [0.7, 0.7, 0.7], heat: 0.6 },
  night: { bg: '#1B2A7A', sky: '#6F86FF', gnd: '#24307A', hi: 2.55, key: '#AFC0FF', ki: 1.55, kp: [-1.0, 1.5, 1.8], fill: '#3646B8', fi: 0.3, tint: '#DDE3FF', lamps: [0, 3.2, 0], amb: '#E4E8FF', ai: 0.55, heat: 0 },
  board: { bg: '#3B3F7A', sky: '#FAFAFF', gnd: '#8A8CA8', hi: 1.9, key: '#FFFFFF', ki: 1.5, kp: [-1.0, 3.0, 0.6], fill: '#E8ECFF', fi: 0.3, tint: '#FFFFFF', lamps: [0, 0, 0], heat: 0 },
};
let curLook = '';
function look(name) {
  if (name === curLook) return; curLook = name; const L = LOOKS[name];
  scene.background = new THREE.Color(L.bg); hemi.color.set(L.sky); hemi.groundColor.set(L.gnd); hemi.intensity = L.hi;
  key.color.set(L.key); key.intensity = L.ki; key.position.set(...L.kp); fill.color.set(L.fill); fill.intensity = L.fi; fill.position.set(1.4, 0.6, 1.4);
  TINT.set(L.tint); amb.color.set(L.amb || '#ffffff'); amb.intensity = L.ai || 0; heatLight.intensity = L.heat || 0;
  lamps.forEach((l, i) => { const v = L.lamps[i] || 0, on = v > 0; l.pl.intensity = v; l.glow.visible = on; l.disc.visible = !on; l.ring.visible = !on; if (l.pool) l.pool.visible = on; l.inner.material = on ? innerLit : innerOff; });
  streetF.material.map = streetL.material.map = name === 'night' ? streetNight : streetDay;
}

// ---------- passes (92, 112): screen-space outline on depth + normals, then depth of field (no haze indoors, 136.4) ----------
@@ 776-821
@@ 823-835

// ---------- timing: the voice is the clock (36, 41, Appendix A) ----------
@@ 838-846
const headOf = (c) => () => c.head.getWorldPosition(V(0, 0, 0));
const F = {   // focus targets, resolved per frame
  owner: headOf(own), cook: headOf(cook), cA: headOf(cA), cB: headOf(cB), cC: headOf(cC), str: headOf(str),
  p90: () => V(0.14, 1.59, -0.73), photo: () => V(-0.7, 1.58, -0.73), board: () => V(-0.3, 1.45, -0.73), printer: () => V(-0.45, 0.56, -0.56),
  sheet: () => sheet.position.clone().add(V(0, 0, -0.041)), menuA: () => menuA.localToWorld(V(0, 0.389 * 0.1406, 0)), menuAb: () => menuA.localToWorld(V(0, -0.067 * 0.1406, 0)),
  cal: () => V(1.38, 1.0, -0.74), rail: () => V(PXC, 0.98, -0.8), plate: () => plateG.position.clone().add(V(0, 0.03, 0)),
  board3: () => V(BX, 0, 0), gold3: () => V(BX + MC.x, 0, -0.454), p903: () => V(BX + 0.18, 0, -0.4), list3: () => V(BX + MC.x, 0, -0.2),
};
// shots (13, 37, 111): every move starts and lands on a word start, on the noun; dissolves only for jumps in time or place (25, 83)
const ZUP = V(0, 0, 1);   // top-down inserts read from the far side: screen-up = +z
const K = [
  { t: 0.00, how: 'cut', p: V(0.34, 0.64, 1.02), l: V(-0.14, 1.12, -0.6), push: 0.08, coc: 9, f: 'owner', look: 'day' },
  { t: 0.84, how: 'move', dur: 0.5, ease: 'out', roll: 2.0, p: V(0.1, 1.48, -0.2), l: V(0.13, 1.6, -0.74), push: 0.04, coc: 14, f: 'p90' },
  { t: 1.51, how: 'move', dur: 0.45, ease: 'out', roll: -1.6, p: V(-0.64, 1.48, -0.22), l: V(-0.69, 1.58, -0.74), push: 0.04, coc: 14, f: 'photo' },
  { t: 2.40, how: 'move', dur: 0.55, ease: 'inout', roll: 1.0, p: V(-0.1, 1.0, 0.78), l: V(-0.22, 1.3, -0.74), push: 0.05, coc: 10, f: 'board' },
  { t: 3.12, how: 'move', dur: 0.4, ease: 'out', roll: -1.8, p: V(0.1, 0.98, 0.78), l: V(0.0, 0.9, -0.33), push: 0.04, coc: 13, f: 'owner' },
  { t: 4.15, how: 'move', dur: 0.42, ease: 'out', roll: 1.4, p: V(0.06, 0.98, 1.05), l: V(0.0, 0.86, -0.33), push: 0.03, coc: 11, f: 'owner' },
  { t: 5.22, how: 'move', dur: 0.45, ease: 'out', roll: -1.2, p: V(0.78, 1.0, 0.45), l: V(0.9, 0.88, -0.95), push: 0.04, coc: 11, f: 'cook' },
  { t: 6.50, how: 'move', dur: 0.4, ease: 'out', roll: 1.0, p: V(-0.22, 0.9, 0.88), l: V(0.36, 0.92, -0.62), push: 0.03, coc: 10, f: 'owner' },
  { t: 7.65, how: 'move', dur: 0.32, ease: 'out', roll: -0.8, p: V(0.13, 0.93, 0.45), l: V(0.04, 0.88, -0.33), push: 0.03, coc: 13, f: 'owner' },
  { t: 9.35, how: 'move', dur: 0.6, ease: 'late', roll: 1.2, p: V(-0.45, 1.06, -0.36), l: V(-0.45, BC_Y + 0.03, -0.5), up: TOPUP, push: 0.05, coc: 12, f: 'printer' },
  { t: 9.84, how: 'move', dur: 0.36, ease: 'out', roll: -1.0, p: V(-0.45, 0.82, -0.42), l: V(-0.45, BC_Y + 0.03, -0.47), up: TOPUP, push: 0.04, coc: 16, f: 'sheet' },
  { t: 10.27, how: 'move', dur: 0.32, ease: 'out', roll: 0.8, p: V(-0.44, 0.74, -0.45), l: V(-0.45, BC_Y + 0.03, -0.462), up: TOPUP, push: 0.03, coc: 18, f: 'sheet' },
  { t: 11.32, how: 'move', dur: 0.5, ease: 'out', roll: -2.0, p: V(-0.5, 0.86, 1.38), l: V(-1.16, 0.72, 0.3), push: 0.04, coc: 10, f: 'cA' },
  { t: 12.60, how: 'move', dur: 0.4, ease: 'out', roll: 1.5, p: V(-1.30, 0.92, 0.66), l: V(-1.30, 0.577, 0.60), up: ZUP, push: 0.03, coc: 14, f: 'menuA' },
  { t: 13.42, how: 'move', dur: 0.35, ease: 'out', roll: -1.0, p: V(-1.1, 0.9, 1.25), l: V(-1.24, 0.74, 0.3), push: 0.03, coc: 11, f: 'cA' },
  { t: 13.72, how: 'move', dur: 0.35, ease: 'out', roll: 1.2, p: V(-1.30, 0.86, 0.58), l: V(-1.30, 0.557, 0.545), up: ZUP, push: 0.03, coc: 14, f: 'menuAb' },
  { t: 15.21, how: 'move', dur: 0.4, ease: 'out', roll: -1.0, p: V(-1.26, 0.8, 0.7), l: V(-1.32, 0.76, 0.3), push: 0.02, coc: 16, f: 'cA' },
  { t: 16.50, how: 'dis', dur: 0.24, p: V(1.3, 1.08, -0.42), l: V(1.37, 1.0, -0.75), push: 0.035, coc: 14, f: 'cal' },
  { t: 17.52, how: 'move', dur: 0.6, ease: 'inout', roll: 0.6, p: V(0.92, 1.0, -0.18), l: V(PXC, 0.98, -0.95), push: 0.02, coc: 11, f: 'rail' },
  { t: 19.20, how: 'dis', dur: 0.24, p: V(-0.8, 0.72, 1.36), l: V(0.25, 0.88, -0.3), push: 0.05, coc: 9, f: 'owner', look: 'night' },
  { t: 19.59, how: 'move', dur: 0.45, ease: 'out', roll: 1.5, p: V(-0.32, 0.98, -0.3), l: V(0.17, 0.84, 0.48), push: 0.03, coc: 10, f: 'str' },
  { t: 20.44, how: 'move', dur: 0.3, ease: 'out', roll: -2.0, p: V(-0.24, 0.95, 0.5), l: V(0.0, 0.87, -0.33), push: 0.03, coc: 14, f: 'owner' },
  { t: 21.63, how: 'move', dur: 0.55, ease: 'late', roll: 1.0, p: V(-0.22, 1.0, 0.12), l: V(0.0, CTR_Y + 0.02, -0.02), up: TOPUP, push: 0.05, coc: 12, f: 'plate' },
  { t: 22.27, how: 'move', dur: 0.32, ease: 'out', roll: -0.8, p: V(-0.08, 0.9, 0.08), l: V(0.0, CTR_Y + 0.02, -0.02), up: TOPUP, push: 0.03, coc: 15, f: 'plate' },
  { t: 23.54, how: 'move', dur: 0.45, ease: 'out', roll: -1.5, p: V(1.0, 0.8, 0.7), l: V(0.1, 0.66, 0.0), push: 0.03, coc: 11, f: 'plate' },
  { t: 24.04, how: 'move', dur: 0.35, ease: 'out', roll: 1.2, p: V(0.36, 0.7, 0.36), l: V(0.08, 0.63, 0.06), push: 0.02, coc: 18, f: 'plate' },
  { t: 24.72, how: 'dis', dur: 0.22, p: V(BX, 1.62, 0.12), l: V(BX, 0, 0.02), up: TOPUP, push: 0.12, coc: 7, f: 'board3', look: 'board' },
  { t: 25.42, how: 'move', dur: 0.4, ease: 'out', roll: 0.8, p: V(BX + MC.x, 0.72, -0.4), l: V(BX + MC.x, 0, -0.45), up: TOPUP, push: 0.05, coc: 11, f: 'gold3' },
  { t: 26.01, how: 'move', dur: 0.35, ease: 'late', roll: -0.6, p: V(BX + 0.18, 0.4, -0.38), l: V(BX + 0.18, 0, -0.4), up: TOPUP, push: 0.03, coc: 13, f: 'p903' },
  { t: 26.64, how: 'move', dur: 0.4, ease: 'out', roll: 1.0, p: V(BX + MC.x, 0.64, -0.16), l: V(BX + MC.x, 0, -0.2), up: TOPUP, push: 0.04, coc: 11, f: 'list3' },
  { t: 27.94, how: 'dis', dur: 0.22, p: V(0.4, 0.9, 0.9), l: V(0.41, 1.1, -0.6), push: 0.02, coc: 12, f: 'owner', look: 'day' },
];
@@ 877-880
function hold(k, t) {        // the camera never stops (1, 20): a slow push along the view and a handheld float
  const dt = Math.max(0, t - k.t - k.dur); const dir = k.l.clone().sub(k.p).normalize();
  const p = k.p.clone().addScaledVector(dir, k.push * dt); if (k.drift) p.addScaledVector(k.drift, dt);
  return { p, l: k.l.clone(), up: k.up, coc: k.coc, f: F[k.f](), fc: ['owner', 'cook', 'cA', 'cB', 'cC', 'str'].includes(k.f), look: k.look, roll: 0, cctv: k.cctv };
}
K.forEach(k => { k.coc *= 0.8; });                 // a lighter background blur (critic)
const JOLTS = [[20.44, 1.0], [27.32, 1.3]];        // impact jolts on gags (18, 39)
@@ 887-900

// ---------- acting (35, 27, 103, 130): poses, faces on the key words, lip sync 2-4 shapes per second ----------
@@ 903-918
const SEAT = { lf: V(0.05, 0.15, 0.16), rf: V(-0.05, 0.15, 0.15) }, BOOTH = { lf: V(0.05, 0.11, 0.2), rf: V(-0.05, 0.11, 0.19) };
function reset(c, ph) { c.body.position.set(0, 0.002 * Math.sin(NOW * 2.2 + ph), 0); c.body.rotation.set(0, 0, 0); c.head.rotation.set(-0.04, 0, 0.02 * Math.sin(NOW * 1.7 + ph)); c.head.position.y = HEAD_Y; c.drop.visible = false; }
function holdMenu(m, c, y = 0.67, z = 0.2, tilt = -0.9) {   // flat props are held at the lower corners (173.6), the printed side to the reader
  c.g.updateMatrixWorld(true); m.position.copy(c.body.localToWorld(V(0, y, z))); m.rotation.set(tilt, c.g.rotation.y + Math.PI, 0); m.updateMatrixWorld(true);
  const s = m.userData.s, hs = s * 0.703, a = toBody(c, m.localToWorld(V(-s * 0.5, -hs, 0))), b = toBody(c, m.localToWorld(V(s * 0.5, -hs, 0)));
  return a.x > b.x ? [a, b] : [b, a]; }
function onMenu(m, u, v, lift = 0) { m.updateMatrixWorld(true); const s = m.userData.s, hs = s * 0.703; const p = m.localToWorld(V(s * u, hs * v, 0)); const n = m.localToWorld(V(s * u, hs * v, 1)).sub(p).normalize(); return { p, n, at: p.clone().addScaledVector(n, lift) }; }
function stage(t) {
  NOW = t;
  for (const k in FX) { FX[k].visible = false; FX[k].material.opacity = 1; } spark.visible = false;
  const GRIP = 0.4 * HAND_R;                                     // 170, 173.6: the grip point sits 0.4 ball radii behind the ball
  const imp = (t0, d = 0.32) => (t >= t0 && t < t0 + d) ? Math.sin((t - t0) / d * Math.PI) : 0;
  const dip = (t0, d = 0.17) => (t > t0 - d && t < t0) ? Math.sin(seg(t, t0 - d, t0) * Math.PI) : 0;   // 35: the anticipation dip, 4-6 frames
  const talkNods = (c, from, to, amp) => { let a = 0, z = 0, n = 0; for (const w of WORDS) if (w[0] >= from && w[0] < to) { const k = imp(w[0], 0.26); a += k; z += k * (n % 2 ? 1 : -1); n++; } c.head.rotation.x += amp * a; c.head.rotation.z += 0.6 * amp * z; };
  const sparkAt = (p, t0, s = 0.06) => { if (t >= t0 && t < t0 + 0.6) { const k = seg(t, t0, t0 + 0.6); spark.visible = true; spark.position.copy(p); spark.scale.setScalar(s * Math.sin(Math.PI * k)); spark.material.rotation = k * 2; } };   // 168: a sparkle on the realisation
  // ---------------- props ----------------
  const pr = wStart('prints', 9.2), sp = t < pr ? 0 : eOut(seg(t, pr, pr + 0.6));
  sheet.visible = t >= pr - 0.05; sheet.position.set(-0.45, BC_Y + 0.03 + 0.012 * sp, -0.66 + 0.24 * sp); sheet.rotation.set(-Math.PI / 2 + 0.1 * (1 - sp), 0, 0.03);
  sparkAt(sheet.position.clone().add(V(0.055, 0.01, -0.07)), wStart('box', 10.1), 0.05);
  drawCal(t >= 16.5 ? 18 : 14); tickets.forEach((m, i) => { m.visible = i < (t >= 16.5 ? 12 : 3); });
  const night = t >= 19.2 && t < 24.94, wr = wStart('wraps', 21.5), sv = wStart('serves', 23.4), gfl = wStart('gold', 22.5);
  plateG.visible = night;
  const slide = eOut(seg(t, sv, sv + 0.35)); plateG.position.set(t < wr ? -0.5 : 0.08 * slide, CTR_Y, t < wr ? -0.02 : -0.02 + 0.09 * slide);
  const fold = (i) => eOut(seg(t, gfl - 0.3 + 0.1 * i, gfl + 0.02 + 0.1 * i));
  flaps.forEach((f, i) => { f.visible = t >= wr && t < gfl + 0.42; f.rotation.x = -(Math.PI - 0.06 * i) * fold(i); f.position.y = 0.0128 + (0.037 + 0.002 * i) * Math.min(1, fold(i) * 1.6); });
  foilBase.visible = t >= wr && t < gfl + 0.42; gc.visible = t < gfl + 0.42; parcel.visible = t >= gfl + 0.42; parcel.getObjectByName('ribbon').visible = t >= sv - 0.12;
  sparkAt(plateG.position.clone().add(V(0.03, 0.09, 0.01)), wStart('bow', 23.9), 0.05);
  menuS.visible = night; menuS.position.set(0.33, CTR_Y + 0.0015, 0.05); menuS.rotation.set(-Math.PI / 2, 0.25, 0);
  menuA.visible = t >= 11 && t < 16.74; menuC.visible = t < 5.6;
  // ---------------- the owner ----------------
  reset(own, 0);
  if (t < 24.94) {
    place(own, 0, -0.36, 0);
    const onC = [V(0.15, 0.6, 0.21), V(-0.15, 0.6, 0.21)];       // hands resting on the counter's back edge
    let lh = onC[0].clone(), rh = onC[1].clone(), finger = null, fdir = null, st = { eyes: 'lid', brows: 'up', mouth: 'smile' };
    if (t < 2.95) {                                             // proud: a thumb over his shoulder at the new top line
      const k = eOut(seg(t, 0.05, 0.35)); lh = onC[0].clone().lerp(V(0.2, 0.7, -0.02), k); finger = 'L'; fdir = V(0.15, 0.7, -1); own.head.rotation.z += 0.06 * k;
    } else if (t < 4.15) {                                      // cheers: the dip, both arms up, the laugh face (167)
      const ch = wStart('cheers', 3.0), d = dip(ch), up = eOut(seg(t, ch, ch + 0.18)) * (1 - ease(seg(t, 3.85, 4.12)));
      own.body.position.y += -0.014 * d + 0.018 * up * Math.abs(Math.sin((t - ch) * 9)); lh = V(0.17 + 0.1 * up, 0.5 + 0.36 * up, 0.06); rh = V(-0.17 - 0.1 * up, 0.5 + 0.36 * up, 0.06);
      own.head.rotation.x -= 0.21 * up; st = t >= ch ? { eyes: 'happy', brows: 'up', mouth: 'grid', blush: true } : st;
    } else if (t < 5.16) {                                      // "nobody orders it": the fist pump on "orders"
      const o = wStart('orders', 4.0), k = eOut(seg(t, o, o + 0.12)) * (1 - ease(seg(t, 4.85, 5.1)));
      rh = onC[1].clone().lerp(V(-0.2, 0.88, 0.1), k); own.body.position.y -= 0.012 * dip(o, 0.13); own.head.rotation.x -= 0.12 * k;
      st = t >= o ? { eyes: 'happy', brows: 'up', mouth: 'grin', blush: true } : st;
    } else if (t < 7.65) {                                      // the cook asks: head turned to the pass, then back to us, deadpan
      const back = ease(seg(t, 6.5, 6.8)); own.head.rotation.y = 0.75 * ease(seg(t, 5.16, 5.4)) * (1 - back) + 0.06 * back;
      st = { eyes: 'lid', brows: 'flat', mouth: 'bar', look: back > 0.5 ? 0 : 1 };
    } else if (t < 9.35) {                                      // "nothing, it's not for eating": lip sync, a flat wave, the sly look on "eating"
      const n = wStart('nothing', 7.5), e = wStart('eating', 8.5), w = eOut(seg(t, n, n + 0.12)) * (1 - ease(seg(t, n + 0.5, n + 0.7)));
      rh = onC[1].clone().lerp(V(-0.27, 0.68 + 0.02 * Math.sin(t * 14), 0.16), w); own.head.rotation.y = 0.06 + 0.12 * Math.sin((t - n) * 16) * imp(n, 0.45);
      const base = t < e ? { eyes: 'lid', brows: 'flat', mouth: 'bar' } : { eyes: 'sly', brows: 'sly', mouth: 'smirk', look: 0.6 };
      st = t < 9.2 ? { ...base, mouth: lip(t, n, 9.2, base.mouth) } : base;
      talkNods(own, n, 9.2, 0.05);
    } else if (t < 19.2) { st = { eyes: 'lid', brows: 'up', mouth: 'smile' }; }   // pleased with himself (mostly off screen)
    else if (t < 20.44) {                                       // night: tired, wiping the counter in slow circles
      rh = V(-0.08 + 0.05 * Math.cos(t * 4), 0.6, 0.25 + 0.03 * Math.sin(t * 4)); own.body.rotation.x = 0.06; own.head.rotation.x += 0.1;
      st = { eyes: 'lid', brows: 'flat', mouth: 'bar' };
    } else if (t < wr) {                                        // 35, 167: the staggered shock, mouth, drop, shut, one ring, both; rings once in the video
      const r0 = wStart('orders', 20.2), d = dip(r0, 0.15), jolt = t > r0 ? Math.exp(-(t - r0) * 7) : 0;
      st = t < r0 ? { eyes: 'lid', brows: 'flat', mouth: 'bar' } : t < r0 + 0.1 ? { eyes: 'lid', brows: 'up', mouth: 'open' } : t < r0 + 0.2 ? { eyes: 'shut', brows: 'up', mouth: 'open' }
        : t < r0 + 0.27 ? { eyes: 'ring', eyeR: 'shut', brows: 'up', mouth: 'open' } : { eyes: 'ring', brows: 'up', mouth: 'open' };
      own.drop.visible = t >= r0 + 0.1;                         // 168: pops on one frame and never slides
      if (t >= r0 + 0.2 && t < r0 + 0.3) { FX.dash.visible = true; FX.dash.position.copy(own.head.getWorldPosition(V(0, 0, 0))); FX.dash.scale.set(0.5, 0.5, 1); }
      own.head.position.y = HEAD_Y - 0.01 * d + 0.016 * jolt; own.head.rotation.x = -0.04 - 0.05 * d - 0.12 * jolt; lh = V(0.17 + 0.03 * jolt, 0.6 + 0.08 * jolt, 0.2);
    } else if (t < sv - 0.15) {                                 // wraps the grilled cheese: the hands ride the foil edges as they fold
      own.body.rotation.x = 0.08; own.head.rotation.x = 0.22; const P = plateG.position, f = (fold(0) + fold(1) + fold(2) + fold(3)) / 4, sm = t < gfl - 0.3 ? 0.012 * Math.sin(t * 11) : 0;
      lh = toBody(own, P.clone().add(V(0.1 - 0.05 * f, 0.03 + 0.04 * Math.sin(Math.PI * f), -0.02 + sm))); rh = toBody(own, P.clone().add(V(-0.1 + 0.05 * f, 0.03 + 0.04 * Math.sin(Math.PI * f), -0.02 - sm)));
      st = { eyes: 'lid', brows: 'focus', mouth: 'smirk' };
    } else {                                                    // serves it: both hands behind the plate, the proud sly look
      own.body.rotation.x = 0.1 + 0.08 * slide; const P = plateG.position; lh = toBody(own, P.clone().add(V(0.075, 0.02, -0.08))); rh = toBody(own, P.clone().add(V(-0.075, 0.02, -0.08)));
      st = { eyes: 'sly', brows: 'sly', mouth: 'smirk', look: 0 };
    }
    pose(own, { lh, rh, lf: REST.lf, rf: REST.rf, finger, fdir }); face(own, st);
  } else if (t >= 27.94) {                                      // the loop: back to the morning, under his best salesman (60)
    place(own, 0.34, -0.42, 0.22);
    const sm = wStart('salesman', 28), nb = wStart('nobody', 29.3), k = eOut(seg(t, 28.05, 28.36));
    pose(own, { lh: V(0.15, 0.6, 0.27).lerp(V(0.21, 0.76, -0.05), k), rh: V(-0.15, 0.6, 0.27), lf: REST.lf, rf: REST.rf, finger: k > 0.5 ? 'L' : null, fdir: V(0.2, 0.6, -1) });
    const lf2 = t >= sm && t < nb ? eOut(seg(t, sm, sm + 0.2)) : 0; own.head.rotation.x -= 0.18 * lf2; own.body.position.y += 0.01 * lf2 * Math.abs(Math.sin(t * 9));
    face(own, t < sm ? { eyes: 'lid', brows: 'up', mouth: 'smile' } : t < nb ? { eyes: 'happy', brows: 'up', mouth: 'grin', blush: true } : { eyes: 'sly', brows: 'sly', mouth: 'smirk', look: 0.4 });
    sparkAt(V(0.52, 1.6, WALL_Z + 0.05), wStart('sandwich', 28.9), 0.07);
  } else place(own, 0, 0, 0, false);
  // ---------------- the cook, in the pass ----------------
  reset(cook, 1.3);
  if (t < 19.44) {
    place(cook, 0.9, -1.04, -0.12); cook.body.rotation.x = 0.16;
    let lh = V(0.17, 0.52, 0.12), rh = V(-0.17, 0.55, 0.14), st = { eyes: 'lid', brows: 'flat', mouth: 'bar' };
    if (t < 6.5) { const a = wStart('asks', 5.3), k = eOut(seg(t, a - 0.1, a + 0.12));      // asks: the palm-up shrug and a head tilt
      lh = V(0.17 + 0.09 * k, 0.52 + 0.16 * k, 0.12 + 0.08 * k); cook.head.rotation.z = 0.18 * k; cook.head.rotation.y = -0.15; cook.body.position.y -= 0.01 * dip(a - 0.1);
      st = t >= a - 0.1 ? { eyes: 'open', brows: 'worry', mouth: 'o' } : st; }
    else if (t < 9.35) { cook.head.rotation.y = -0.45; st = t < wStart('nothing', 7.5) ? { eyes: 'open', brows: 'worry', mouth: 'o', look: -1 } : { eyes: 'lid', brows: 'worry', mouth: 'frown', look: -1 }; }
    else if (t >= 16.5) {                                       // Friday: flipping burgers flat out, slaps the bell on "everything"
      const ev = wStart('everything', 18), h = 0.07 - 0.075 * imp(ev - 0.06, 0.18); rh = V(-0.17, 0.55 + 0.06 * Math.abs(Math.sin(t * 7)), 0.16);
      if (t > ev - 0.35 && t < ev + 0.4) lh = toBody(cook, bell.position.clone().add(V(0, 0.05 + h, 0)));
      st = { eyes: 'happy', brows: 'up', mouth: 'grin' }; cook.head.rotation.x += 0.04 * Math.sin(t * 7); }
    pose(cook, { lh, rh, lf: REST.lf, rf: REST.rf }); face(cook, st);
    spat.visible = true; spat.position.copy(cook.body.localToWorld(rh.clone().add(V(0, -0.02, -GRIP)))); spat.rotation.set(0.6, -0.12, 0.2);
  } else { place(cook, 0, 0, 0, false); spat.visible = false; }
  // ---------------- the first customer, at the counter (back to us) ----------------
  reset(cC, 2.1);
  if (t < 5.6) {
    place(cC, -0.25, 0.42, Math.PI); cC.body.position.y = -0.02;
    const no = wStart('nobody', 4.0), dn = eOut(seg(t, no, no + 0.3));
    const [a, b] = holdMenu(menuC, cC, 0.67, 0.2, -0.9);
    if (dn > 0) { const flat = V(-0.25, CTR_Y + 0.003, 0.06); menuC.position.lerp(flat, dn); menuC.rotation.x = -0.9 + (Math.PI / 2 + 0.9) * dn; menuC.updateMatrixWorld(true); }
    const lh = dn > 0 ? V(0.14, 0.6, 0.24) : a, rh = dn > 0 ? V(-0.14, 0.6, 0.24) : b;
    pose(cC, { lh, rh, lf: SEAT.lf, rf: SEAT.rf }); cC.head.rotation.y += 0.25 * Math.sin((t - no) * 18) * imp(no, 0.5); face(cC, { eyes: 'lid', brows: 'flat', mouth: 'bar' });
  } else place(cC, 0, 0, 0, false);
  // ---------------- the booth: two customers laugh at the gold box, then order the burger right under it ----------------
  reset(cA, 0.7); reset(cB, 2.9);
  if (t >= 11.0 && t < 16.74) {
    place(cA, -1.32, 0.27, 0.08); place(cB, -1.02, 0.27, -0.1); cA.body.position.y = -0.11; cB.body.position.y = -0.11;
    const la = wStart('laugh', 11.5), lb = la + 0.2, pt = wStart('point', 12.4), od = wStart('order', 13.3), eg = wStart('eighteendollar', 13.6);
    const laA = t >= la ? eOut(seg(t, la, la + 0.15)) * (1 - ease(seg(t, od - 0.4, od - 0.1))) : 0, low = eOut(seg(t, od - 0.1, od + 0.2));
    const dn = eOut(seg(t, pt - 0.35, pt - 0.05));               // lowers it flat over the table so the top-down insert can read it
    let [lhA, rhA] = holdMenu(menuA, cA, 0.67, 0.2 + 0.08 * dn, -0.9 - 0.35 * dn), fA = null, fdA = null;
    if (t >= eg - 0.15) { const k = eOut(seg(t, eg - 0.15, eg + 0.25)), m = onMenu(menuA, 0.18, 0.389 - 0.43 * k, HAND_R + 0.008), at = toBody(cA, m.at); fdA = toBody(cA, m.p).sub(at).normalize(); rhA = at; fA = 'R'; }
    cA.head.rotation.x -= 0.21 * laA; cA.body.position.y += 0.012 * laA * Math.abs(Math.sin((t - la) * 10));
    pose(cA, { lh: lhA, rh: rhA, lf: BOOTH.lf, rf: BOOTH.rf, finger: fA, fdir: fdA });
    face(cA, laA > 0.2 ? { eyes: 'happy', brows: 'up', mouth: 'grid', blush: true } : t >= od - 0.1 ? { eyes: 'open', brows: 'flat', mouth: 'bar', nb: true } : { eyes: 'lid', brows: 'flat', mouth: 'smile' });
    const laB = t >= lb ? eOut(seg(t, lb, lb + 0.15)) * (1 - ease(seg(t, od + 0.2, od + 0.5))) : 0;
    let lhB = V(0.15, 0.6, 0.16), rhB = V(-0.15, 0.6, 0.16), fB = null, fdB = null;
    if (t >= pt - 0.1 && t < od + 0.3) { const k = eOut(seg(t, pt - 0.1, pt + 0.1)) * (1 - ease(seg(t, od, od + 0.3))); cB.body.rotation.z = 0.12 * k;
      const m = onMenu(menuA, -0.05, 0.389, HAND_R + 0.02), at = toBody(cB, m.at); rhB = rhB.clone().lerp(at, k); fdB = toBody(cB, m.p).sub(at).normalize(); fB = k > 0.3 ? 'R' : null; }
    cB.head.rotation.x -= 0.21 * laB; cB.body.position.y += 0.012 * laB * Math.abs(Math.sin((t - lb) * 10));
    pose(cB, { lh: lhB, rh: rhB, lf: BOOTH.lf, rf: BOOTH.rf, finger: fB, fdir: fdB });
    face(cB, laB > 0.2 ? { eyes: 'happy', brows: 'up', mouth: 'grid', blush: true } : t >= od + 0.5 ? { eyes: 'lid', brows: 'up', mouth: 'smirk', look: -1 } : { eyes: 'lid', brows: 'up', mouth: 'smile', look: -0.6 });
  } else { place(cA, 0, 0, 0, false); place(cB, 0, 0, 0, false); }
  // ---------------- the stranger, at night ----------------
  reset(str, 1.9);
  if (night) {
    place(str, 0.15, 0.42, Math.PI); str.body.position.y = -0.02;
    const o = wStart('orders', 20.2), k = eOut(seg(t, o - 0.12, o + 0.02)) * (1 - ease(seg(t, o + 0.5, o + 0.8)));
    const m = onMenu(menuS, 0.0, 0.389, HAND_R + 0.012 + 0.02 * (1 - imp(o - 0.04, 0.12))), at = toBody(str, m.at);
    const rh = V(-0.13, 0.6, 0.24).lerp(at, k), fdir = toBody(str, m.p).sub(at).normalize();
    pose(str, { lh: V(0.13, 0.6, 0.24), rh, lf: SEAT.lf, rf: SEAT.rf, finger: k > 0.3 ? 'R' : null, fdir });
    str.head.rotation.x += t < 19.59 ? 0.2 : t >= sv ? 0.22 : 0.02;
    face(str, t < o ? { eyes: 'lid', brows: 'flat', mouth: 'bar' } : t < sv ? { eyes: 'lid', brows: 'sly', mouth: 'smirk' } : { eyes: 'lid', brows: 'up', mouth: 'bar', look: 0.3 });
  } else place(str, 0, 0, 0, false);
  // ---------------- the board: the stamp comes down hard on "cheap", rests, lifts (35) ----------------
  const chp = wStart('cheap', 27); drawBoardMenu(t >= chp);
  { const a = chp - 0.17, b = chp + 0.05, c = chp + 0.3, sx = BX + MC.x - 0.004, sz = MC.z - MC.h / 2 + MC.h * 446 / 720; stampObj.visible = t >= a && t < c;
    const y = t < chp ? 0.42 * (1 - Math.pow(seg(t, a, chp), 2)) : t < b ? 0.0 : 0.45 * eOut(seg(t, b, c)); stampObj.position.set(sx + (t > b ? 0.35 * eOut(seg(t, b, c)) : 0), 0.004 + y, sz);
    if (t >= chp && t < chp + 0.1) { FX.star.visible = true; FX.star.position.set(sx, 0.03, sz + 0.06); FX.star.scale.set(0.2, 0.2, 1); } }   // 168: impact star, 3 frames, with the jolt
}

// ---------- render one frame: subframes for directional motion blur on fast moves (6, 31), dissolves mixed (25) ----------
@@ 1059-1069
fetch('./voice_24.json').then(r => r.json()).then(w => { WORDS = w; window.render(0); window.ready = true; });
</script>
