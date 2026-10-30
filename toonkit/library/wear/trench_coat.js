// @piece wear/trench_coat: trench coat clothTex painter: lapels, double buttons and a buckled belt. Options: belt, buckle colours.
// usage: const str = makeChar({ shirt: '#B8642A', ..., cloth: wear_trench_coat() });
function wear_trench_coat(o = {}) { const belt = o.belt || '#7A3E14', buckle = o.buckle || '#C9A26B';
  return (g, w, h, dk, lt) => { for (const s of [-1, 1]) { g.strokeStyle = dk; g.lineWidth = 7; g.beginPath(); g.moveTo(w * (0.5 + s * 0.09), 0); g.quadraticCurveTo(w * (0.5 + s * 0.07), h * 0.3, w * (0.5 - s * 0.02), h * 0.55); g.stroke(); }
    g.fillStyle = dk; for (const y of [0.42, 0.56]) for (const s of [-1, 1]) { g.beginPath(); g.arc(w * (0.5 + s * 0.04), h * y, 7, 0, 7); g.fill(); }
    g.fillStyle = belt; g.fillRect(0, h * 0.66, w, h * 0.07); g.fillStyle = buckle; g.fillRect(w * 0.47, h * 0.655, w * 0.06, h * 0.08); g.fillStyle = belt; g.fillRect(w * 0.485, h * 0.675, w * 0.03, h * 0.04); }; }
