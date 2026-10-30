// @piece fx/sea_glints: sea glints: short horizontal capsules, small and dense near the horizon, shimmering.
// usage: fx_sea_glints(g, seed, horizonY, waterlineY, t)
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const fx_sea_glints = (g, seed, y0, y1, t) => { const R = rng(seed); for (let i = 0; i < 46; i++) { const k = Math.pow(R(), 1.5), y = lerp(y0 + 12, y1 - 10, k), len = lerp(16, 64, k), th = lerp(4, 8, k), x = R() * W + Math.sin(t * 1.4 + i) * 6;
  g.fillStyle = rgba(['#FFFFFF', '#F4C6F0', '#BFE9FF'][i % 3], lerp(0.45, 0.9, R()) * (0.75 + 0.25 * Math.sin(t * 3 + i))); rr(g, x - len / 2, y - th / 2, len, th, th / 2); g.fill(); } };
