// @piece char/crab: a tiny crab with eye stalks and raised, waving claws.
// usage: char_crab(g, x, y, size, t, '#FF4D3A')
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const char_crab = (g, x, y, s, t, col = '#FF4D3A') => {
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) cap(g, x + sd * s * 0.22, y + i * s * 0.07, x + sd * s * (0.55 + i * 0.05), y + s * 0.14 + i * s * 0.08, s * 0.05, shadeOf(col));
  for (const sd of [-1, 1]) { const wv = Math.sin(t * 5 + sd) * 0.1; cap(g, x + sd * s * 0.4, y - s * 0.08, x + sd * s * 0.68, y - s * (0.36 + wv), s * 0.07, col); g.fillStyle = col; ell(g, x + sd * s * 0.7, y - s * (0.44 + wv), s * 0.17, s * 0.14); g.fill(); g.fillStyle = shadeOf(col); ell(g, x + sd * s * 0.78, y - s * (0.44 + wv), s * 0.06, s * 0.05); g.fill(); }
  flat(g, gg => ell(gg, x, y, s * 0.5, s * 0.34), col, s);
  for (const sd of [-1, 1]) { cap(g, x + sd * s * 0.15, y - s * 0.2, x + sd * s * 0.17, y - s * 0.4, s * 0.04, shadeOf(col)); g.fillStyle = '#fff'; ell(g, x + sd * s * 0.17, y - s * 0.46, s * 0.1, s * 0.1); g.fill(); g.fillStyle = PAL.ink; ell(g, x + sd * s * 0.18, y - s * 0.45, s * 0.05, s * 0.056); g.fill(); }
};
