// @piece wear/hoodie: hoodie clothTex painter: hood strings down the sides and a kangaroo pocket.
// usage: const cA = makeChar({ shirt: '#22B25F', ..., cloth: wear_hoodie() });
function wear_hoodie() { return (g, w, h, dk, lt) => { g.strokeStyle = dk; g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.86, 0); g.quadraticCurveTo(w * 0.93, h * 0.34, w * 1.0, h * 0.36); g.moveTo(w * 0.14, 0); g.quadraticCurveTo(w * 0.07, h * 0.34, 0, h * 0.36); g.stroke();
    g.beginPath(); g.moveTo(w * 0.4, h * 0.82); g.lineTo(w * 0.43, h * 0.58); g.lineTo(w * 0.57, h * 0.58); g.lineTo(w * 0.6, h * 0.82); g.stroke(); }; }
