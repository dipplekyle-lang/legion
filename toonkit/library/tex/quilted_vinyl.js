// @piece tex/quilted_vinyl: diamond-quilted vinyl with button dots (diner booths, stools, counter fronts). Args: surface width m, height m, base colour, dark seam colour, light button colour.
// usage: const tex = tex_quilted_vinyl(0.62, 0.5, '#EB2715', '#A8180A', '#FF6A4E');
function tex_quilted_vinyl(w2, h2, col, dk, lt) { return canvasTex(1024, Math.round(1024 * h2 / w2), (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); specks(g, w, h, 6000, [dk + '66', lt + '55'], 1, 3, w + h);
  const st = 0.12 * w / w2; marker(g, dk, 4); for (let k = -h; k < w + h; k += st) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
  g.fillStyle = lt; for (let x = 0; x < w + st; x += st) for (let y = 0; y < h + st; y += st) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }); }
