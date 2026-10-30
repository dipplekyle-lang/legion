// @piece prop/umbrella: a beach umbrella with a striped canopy and a soft shadow (use with strew for rows).
// usage: prop_umbrella(g, x, groundY, size, '#FF3C6E', '#FFF4E0')
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_umbrella = (g, x, y, s, c1, c2) => { cap(g, x, y, x + s * 0.06, y - s, s * 0.035, '#F4F0FF');
  const path = gg => { gg.beginPath(); gg.ellipse(x + s * 0.06, y - s, s * 0.62, s * 0.36, -0.12, Math.PI, 0); gg.closePath(); };
  g.fillStyle = c1; path(g); g.fill(); motif(g, path, 'stripes', { col: c2, step: s * 0.26, size: 0.5, rot: 1.25 });
  g.fillStyle = rgba('#000000', 0.15); ell(g, x + s * 0.2, y + s * 0.03, s * 0.5, s * 0.08); g.fill(); };
