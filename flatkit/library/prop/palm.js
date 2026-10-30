// @piece prop/palm: a palm cut by the frame edge: segmented trunk, six drooping fronds with a lighter midrib; far ones small and hazed with atmos().
// usage: prop_palm(g, x, groundY, height, lean, '#14A85A', '#B0602E')
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_palm = (g, x, y, h, lean, col = '#14A85A', trunk = '#B0602E') => {
  const tx = x + lean, ty = y - h; noodle(g, [[x, y], [x + lean * 0.35, y - h * 0.55], [tx, ty]], h * 0.07, trunk);
  g.strokeStyle = lightOf(trunk, 0.8); g.lineWidth = h * 0.012; for (let k = 1; k < 9; k++) { const u = k / 9, px = lerp(x, tx, u) + lean * 0.12 * Math.sin(u * 3), py = lerp(y, ty, u); g.beginPath(); g.moveTo(px - h * 0.035, py); g.lineTo(px + h * 0.035, py + h * 0.01); g.stroke(); }
  for (const [a, L] of [[-2.9, 0.62], [-2.3, 0.55], [-1.75, 0.5], [-1.2, 0.55], [-0.6, 0.6], [0.05, 0.55]]) { const ex = tx + Math.cos(a) * h * L, ey = ty + Math.sin(a) * h * L * 0.55 + h * 0.18, nx = -Math.sin(a), ny = Math.cos(a), w = h * 0.08;
    g.fillStyle = col; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + ex) / 2 + nx * w, (ty + ey) / 2 - h * 0.12 + ny * w, ex, ey); g.quadraticCurveTo((tx + ex) / 2 - nx * w, (ty + ey) / 2 - h * 0.08 - ny * w, tx, ty); g.fill();
    g.strokeStyle = lightOf(col, 0.9); g.lineWidth = h * 0.01; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + ex) / 2, (ty + ey) / 2 - h * 0.1, ex, ey); g.stroke(); }
  g.fillStyle = shadeOf(trunk, 1.2); for (const [dx, dy] of [[-0.03, 0.02], [0.03, 0.03], [0, 0.05]]) { ell(g, tx + dx * h, ty + dy * h, h * 0.032, h * 0.032); g.fill(); } };
