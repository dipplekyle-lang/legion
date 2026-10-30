// @piece prop/cactus: a saguaro cactus with two arms, a shade side and a light line.
// usage: prop_cactus(g, x, groundY, size, '#2E9A4A')
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_cactus = (g, x, y, s, col) => { const sh = shadeOf(col, 1.1), li = lightOf(col, 0.8);
  for (const [dx, y0, h, side] of [[0, 0, 1, 0], [-0.32, -0.42, 0.34, -1], [0.3, -0.58, 0.3, 1]]) { const w = s * (side ? 0.15 : 0.22), bx = x + dx * s;
    if (side) { g.fillStyle = col; rr(g, Math.min(bx, x) - w / 2, y + y0 * s - w / 2, Math.abs(dx * s) + w / 2, w, w / 2); g.fill(); }
    g.fillStyle = col; rr(g, bx - w / 2, y + y0 * s - h * s, w, h * s + (side ? w / 2 : 0), w / 2); g.fill(); g.fillStyle = sh; rr(g, bx + w * 0.12, y + y0 * s - h * s, w * 0.38, h * s, w * 0.19); g.fill();
    g.strokeStyle = li; g.lineWidth = Math.max(2, w * 0.08); g.beginPath(); g.moveTo(bx - w * 0.18, y + y0 * s - h * s + w * 0.4); g.lineTo(bx - w * 0.18, y + y0 * s - w * 0.2); g.stroke(); } };
