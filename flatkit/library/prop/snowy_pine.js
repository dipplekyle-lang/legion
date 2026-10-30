// @piece prop/snowy_pine: a three-tier pine with a shade half and snow caps.
// usage: prop_snowy_pine(g, x, groundY, size, '#1E6A7A')
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_snowy_pine = (g, x, y, s, col) => { for (let k = 0; k < 3; k++) { const yy = y - s * (0.25 + k * 0.28), w = s * (0.42 - k * 0.1);
  g.fillStyle = col; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - s * 0.42); g.lineTo(x + w, yy); g.closePath(); g.fill(); g.fillStyle = shadeOf(col, 1); g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy - s * 0.42); g.lineTo(x + w, yy); g.closePath(); g.fill();
  g.fillStyle = '#F4FCFF'; g.beginPath(); g.moveTo(x - w * 0.45, yy - s * 0.23); g.lineTo(x, yy - s * 0.42); g.lineTo(x + w * 0.45, yy - s * 0.23); g.lineTo(x, yy - s * 0.3); g.closePath(); g.fill(); }
  g.fillStyle = '#6A3A2A'; g.fillRect(x - s * 0.04, y - s * 0.26, s * 0.08, s * 0.26); };
