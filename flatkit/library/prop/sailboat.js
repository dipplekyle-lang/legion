// @piece prop/sailboat: a small far sailboat sitting on the horizon (two sails, hull).
// usage: prop_sailboat(g, x, horizonY, size, colour)  // far ones small and hazed: atmos(colour, sky, 0.35)
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_sailboat = (g, x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x + s * 0.5, y); g.lineTo(x + s * 0.35, y + s * 0.18); g.lineTo(x - s * 0.35, y + s * 0.18); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x, y - s * 1.1); g.lineTo(x, y - s * 0.05); g.lineTo(x + s * 0.55, y - s * 0.05); g.closePath(); g.fill(); g.fillStyle = lightOf(col, 0.6); g.beginPath(); g.moveTo(x - s * 0.06, y - s * 0.9); g.lineTo(x - s * 0.06, y - s * 0.05); g.lineTo(x - s * 0.42, y - s * 0.05); g.closePath(); g.fill(); };
