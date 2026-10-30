// @piece prop/towel: a striped beach towel lying flat in perspective.
// usage: prop_towel(g, x, y, size, '#2B8BFF', '#FFFFFF')
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_towel = (g, x, y, s, c1, c2) => { const path = gg => { gg.beginPath(); gg.moveTo(x - s * 0.5, y); gg.lineTo(x + s * 0.42, y - s * 0.05); gg.lineTo(x + s * 0.5, y + s * 0.2); gg.lineTo(x - s * 0.42, y + s * 0.25); gg.closePath(); };
  g.fillStyle = c1; path(g); g.fill(); motif(g, path, 'stripes', { col: c2, step: s * 0.14, size: 0.45, rot: 1.45 }); };
