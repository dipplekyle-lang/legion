// @piece wear/puffer_vest: sporty jacket clothTex painter: front pocket outline and two white zip stripes. Options: stripe colour.
// usage: const cB = makeChar({ shirt: '#7A3FD1', ..., cloth: wear_puffer_vest() });
function wear_puffer_vest(o = {}) { return (g, w, h, dk, lt) => { g.strokeStyle = dk; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.4, h * 0.82); g.lineTo(w * 0.43, h * 0.58); g.lineTo(w * 0.57, h * 0.58); g.lineTo(w * 0.6, h * 0.82); g.stroke();
    g.strokeStyle = o.stripe || '#F2F2EE'; g.lineWidth = 4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * (0.5 + s * 0.03), h * 0.04); g.lineTo(w * (0.5 + s * 0.035), h * 0.3); g.stroke(); } }; }
