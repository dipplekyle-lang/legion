// @piece tex/anchor_logo: a marker-drawn ship's anchor on a 2D canvas (ring, stock, curved arms, flukes). Options: size, colour, line width.
// usage: tex_anchor_logo(g, cx, cy, size, '#FFD75A', lineWidth);  (needs the engine's marker)
function tex_anchor_logo(g, cx, cy, s, col, lw = s * 0.13) {
  marker(g, col, lw); g.beginPath(); g.arc(cx, cy - s * 0.78, s * 0.17, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - s * 0.6); g.lineTo(cx, cy + s * 0.8); g.stroke();
  g.beginPath(); g.moveTo(cx - s * 0.36, cy - s * 0.36); g.lineTo(cx + s * 0.36, cy - s * 0.36); g.stroke();
  g.beginPath(); g.arc(cx, cy + s * 0.1, s * 0.7, 0.45, Math.PI - 0.45); g.stroke();
  g.fillStyle = col; for (const sd of [-1, 1]) { const a = sd > 0 ? 0.45 : Math.PI - 0.45, x = cx + s * 0.7 * Math.cos(a), y = cy + s * 0.1 + s * 0.7 * Math.sin(a);
    g.beginPath(); g.moveTo(x + sd * s * 0.02, y - s * 0.3); g.lineTo(x + sd * s * 0.2, y + s * 0.04); g.lineTo(x - sd * s * 0.16, y + s * 0.02); g.closePath(); g.fill(); }
}
