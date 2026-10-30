// @piece fx/sweat_drop: a sweat drop (pale top, bright cyan below) for a worried face.
// usage: fx_sweat_drop(g, x, y, size)
// From "What if the Moon vanished?" (approved). Uses only engine helpers; never edit this file, pass options instead.
const fx_sweat_drop = (g, x, y, s) => { const gr = g.createLinearGradient(0, y - s, 0, y + s * 0.6); gr.addColorStop(0, 'rgba(190,235,255,0.95)'); gr.addColorStop(1, '#00C8FF'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x + s * 0.8, y + s * 0.1, x, y + s * 0.62); g.quadraticCurveTo(x - s * 0.8, y + s * 0.1, x, y - s); g.fill(); };
