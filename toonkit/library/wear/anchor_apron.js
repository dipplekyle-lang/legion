// @piece wear/anchor_apron: white apron bib with ties, a pocket and a navy anchor on the chest, as a clothTex painter. Options: apron, trim, anchor colour.
// usage: const own = makeChar({ shirt: '#1E2F86', ..., cloth: wear_anchor_apron({ anchor: '#1E2F86' }) });
function wear_anchor_apron(o = {}) { const ap = o.apron || '#F4F1EA', trim = o.trim || '#C9C2B4', anc = o.anchor || '#1E2F86';
  return (g, w, h, dk, lt) => { g.fillStyle = ap; g.beginPath(); g.moveTo(w * 0.43, h * 0.14); g.lineTo(w * 0.57, h * 0.14); g.lineTo(w * 0.6, h * 0.42); g.lineTo(w * 0.65, h); g.lineTo(w * 0.35, h); g.lineTo(w * 0.4, h * 0.42); g.closePath(); g.fill();
    g.strokeStyle = trim; g.lineWidth = 5; g.stroke(); specks(g, w, h, 1600, ['#E2DCCF', '#FFFFFF'], 1, 3, 77, (x, y) => x > w * 0.38 && x < w * 0.62 && y > h * 0.2);
    g.strokeStyle = ap; g.lineWidth = 16; g.beginPath(); g.moveTo(w * 0.435, h * 0.15); g.lineTo(w * 0.41, 0); g.moveTo(w * 0.565, h * 0.15); g.lineTo(w * 0.59, 0); g.stroke();
    g.strokeStyle = trim; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.36, h * 0.66); g.lineTo(w * 0.64, h * 0.66); g.stroke(); g.lineWidth = 9; g.strokeStyle = ap; g.beginPath(); g.moveTo(w * 0.36, h * 0.66); g.lineTo(w * 0.2, h * 0.68); g.moveTo(w * 0.64, h * 0.66); g.lineTo(w * 0.8, h * 0.68); g.stroke();
    pocket(g, w * 0.455, h * 0.72, w * 0.09, h * 0.16, '#B9B2A4', '#FFFFFF', false); drawAnchor(g, w * 0.5, h * 0.36, 26, anc, 6); }; }
