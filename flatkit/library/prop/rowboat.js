// @piece prop/rowboat: a little rowboat lying on its keel on the sand: flat hull, light rim, shade side, mast stub.
// usage: prop_rowboat(g, x, groundY, width)
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_rowboat = (g, x, y, w) => { g.fillStyle = rgba('#7A3A10', 0.3); ell(g, x + 14, y + w * 0.06, w * 0.55, w * 0.07); g.fill();
  flat(g, gg => { gg.beginPath(); gg.moveTo(x - w / 2, y - w * 0.2); gg.quadraticCurveTo(x - w * 0.4, y + w * 0.02, x - w * 0.1, y + w * 0.04); gg.lineTo(x + w * 0.2, y + w * 0.04); gg.quadraticCurveTo(x + w * 0.45, y, x + w / 2, y - w * 0.2); gg.closePath(); }, '#FF3CAC', w, { sx: 0.05, sy: 0.04, k: 0.1 });
  specks(g, x - w * 0.3, y - w * 0.05, w * 0.03); g.fillStyle = '#FFFFFF'; rr(g, x - w * 0.5, y - w * 0.24, w, w * 0.06, w * 0.03); g.fill(); g.fillStyle = '#FFD23F'; rr(g, x - w * 0.34, y - w * 0.15, w * 0.68, w * 0.045, w * 0.02); g.fill(); cap(g, x + w * 0.05, y - w * 0.22, x + w * 0.1, y - w * 0.62, w * 0.03, '#7A3A10'); };
