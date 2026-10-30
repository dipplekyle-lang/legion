// @piece prop/gold_box: a shiny gold promo plate (gradient, brown frame, cream inner line, four corner stars) drawn on a canvas; also defines tex_gold_star.
// usage: prop_gold_box(g, x, y, w, h);
function tex_gold_star(g, x, y, r1, r0, n = 5) { g.beginPath(); for (let i = 0; i < 2 * n; i++) { const a = i / (2 * n) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r0 : r1; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } g.closePath(); g.fill(); }
function prop_gold_box(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#F2B705'); gr.addColorStop(0.42, '#FFD75A'); gr.addColorStop(0.58, '#F6C531'); gr.addColorStop(1, '#E39A0C'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = '#8A5A00'; g.lineWidth = 10; g.strokeRect(x + 5, y + 5, w - 10, h - 10); g.strokeStyle = '#FFF1B0'; g.lineWidth = 3; g.strokeRect(x + 16, y + 16, w - 32, h - 32);
  g.fillStyle = '#FFF6C8'; for (const [sx, sy] of [[x + 17, y + 17], [x + w - 17, y + 17], [x + 17, y + h - 17], [x + w - 17, y + h - 17]]) tex_gold_star(g, sx, sy, 15, 6);
}
