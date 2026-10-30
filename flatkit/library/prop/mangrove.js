// @piece prop/mangrove: a mangrove: arching stilt roots under a round canopy; grow 0..1 lets it grow on a word.
// usage: prop_mangrove(g, x, groundY, size, '#1FBF4A', grow /* 0..1, grows on a word */, rootColour)
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const prop_mangrove = (g, x, y, s, col, grow = 1, root = null) => {
  const rc = root || shadeOf(col, 1.3);
  for (const r of [-0.55, -0.28, 0, 0.28, 0.55]) noodle(g, [[x + r * s * 1.0, y], [x + r * s * 0.55, y - s * 0.5 * grow], [x + r * s * 0.18, y - s * 0.98 * grow]], s * 0.075, rc);
  flat(g, gg => { gg.beginPath(); for (const [bx, by, br] of [[-0.38, -1.08, 0.34], [0, -1.3, 0.44], [0.38, -1.08, 0.34], [0, -1.02, 0.4]]) { gg.moveTo(x + bx * s + br * s, y + by * s * grow); gg.arc(x + bx * s, y + by * s * grow, br * s, 0, 6.283); } }, col, s, { hl: true });
};
