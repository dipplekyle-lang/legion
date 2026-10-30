// @piece device/thermometer: a thermometer: glass tube, bulb, liquid up to p (0..1), ticks; mark it as a device.
// usage: device_thermometer(g, x, centreY, height, level /* 0..1 */, '#E5262B')  // marks itself as a device
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const device_thermometer = (g, x, y, h, p, col) => {
  const w = h * 0.15; g.save();
  g.fillStyle = rgba('#000000', 0.18); rr(g, x - w / 2 + 8, y - h / 2 + 10, w, h, w / 2); g.fill(); ell(g, x + 8, y + h / 2 + 10, w * 1.05, w * 1.05); g.fill();
  g.fillStyle = '#F4FAFF'; rr(g, x - w / 2, y - h / 2, w, h, w / 2); g.fill(); ell(g, x, y + h / 2, w * 1.05, w * 1.05); g.fill();
  g.fillStyle = '#C9DCF2'; rr(g, x + w * 0.1, y - h / 2 + w * 0.2, w * 0.3, h - w * 0.4, w * 0.15); g.fill();
  g.fillStyle = col; ell(g, x, y + h / 2, w * 0.82, w * 0.82); g.fill(); const ly = y + h / 2 - (h - w * 0.6) * clamp(p); rr(g, x - w * 0.22, ly, w * 0.44, y + h / 2 - ly, w * 0.2); g.fill();
  g.fillStyle = '#9FB7D6'; for (let i = 0; i < 6; i++) g.fillRect(x + w * 0.55, y - h / 2 + w * 0.5 + i * (h - w * 1.6) / 5, w * (i % 2 ? 0.28 : 0.45), 5);
  g.restore(); mark(g, 'device', x - w * 0.6, y - h / 2, x + w * 0.6, y + h / 2 + w * 0.6, 'thermometer');
};
