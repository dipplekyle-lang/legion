// @piece wear/cook_tee: kitchen tee clothTex painter: collar curve, sleeve hems and a flour dab.
// usage: const cook = makeChar({ shirt: '#E5302A', ..., cloth: wear_cook_tee() });
function wear_cook_tee() { return (g, w, h, dk, lt) => { g.strokeStyle = dk; g.lineWidth = 6; g.beginPath(); g.ellipse(w * 0.5, 0, w * 0.06, h * 0.1, 0, 0, Math.PI); g.stroke(); g.beginPath(); g.moveTo(0, h * 0.16); g.lineTo(w * 0.25, h * 0.2); g.moveTo(w * 0.75, h * 0.2); g.lineTo(w, h * 0.16); g.stroke();
    g.fillStyle = '#F4F1EA'; g.beginPath(); g.ellipse(w * 0.44, h * 0.62, w * 0.012, h * 0.04, 0.3, 0, 7); g.fill(); }; }
