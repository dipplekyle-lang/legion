// @piece tex/formica_speckle: speckled grey formica with teal/red/yellow boomerang flecks (diner counter and table tops). Option: base colour.
// usage: const formicaTex = tex_formica_speckle();
function tex_formica_speckle(base = '#B2A8A1') { return canvasTex(1024, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); specks(g, w, h, 9000, ['#9C918A', '#C8BFB8', '#8E8580'], 1, 3, 61);
  const r = rng(63); for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, a = r() * 6; g.strokeStyle = ['#1C9AAA', '#EB2715', '#F2B705'][i % 3] + '88'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14 * Math.cos(a), y + 14 * Math.sin(a), x + 24 * Math.cos(a + 1), y + 24 * Math.sin(a + 1)); g.stroke(); } }); }
