// @piece prop/hero_sandwich: a triple-decker sandwich with a red flag pick, drawn on a canvas, optional tiny captain's hat (prop_cap_hat). Needs tex/anchor_logo.
// usage: prop_hero_sandwich(g, cx, cy, size, true);  // true = wears the hat
function prop_cap_hat(g, cx, cy, s) {                                   // the tiny captain's hat the sandwich wears in its portrait
  g.lineWidth = s * 0.06; g.strokeStyle = '#2A1D26'; g.fillStyle = '#F4F1EA'; g.beginPath(); g.ellipse(cx, cy - s * 0.18, s * 0.62, s * 0.26, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1D2340'; g.beginPath(); g.roundRect(cx - s * 0.48, cy - s * 0.12, s * 0.96, s * 0.22, s * 0.06); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(cx, cy + s * 0.12, s * 0.5, s * 0.1, 0, 0, Math.PI); g.fill(); g.stroke(); tex_anchor_logo(g, cx, cy - 0.01 * s, s * 0.09, '#F2B705', s * 0.035);
}
function prop_hero_sandwich(g, cx, cy, s, hat = false) {               // the hero prop: a triple-decker with a flag pick, our own drawing (145)
  const ink = '#2A1D26'; g.lineJoin = 'round'; g.lineCap = 'round';
  const L = [['bread', 0.17], ['lettuce', 0.07], ['tomato', 0.1], ['cheese', 0.08], ['bread', 0.15], ['lettuce', 0.07], ['ham', 0.1], ['top', 0.26]];
  let y = cy + s * 0.72;
  for (const [k, hh] of L) { const h = hh * s; y -= h; g.strokeStyle = ink; g.lineWidth = s * 0.035;
    if (k === 'bread') { g.fillStyle = '#F2C879'; g.beginPath(); g.roundRect(cx - s * 0.64, y, s * 1.28, h, h * 0.45); g.fill(); g.stroke(); g.fillStyle = '#C4761C'; g.fillRect(cx - s * 0.6, y + h * 0.62, s * 1.2, h * 0.2); }
    else if (k === 'top') { g.fillStyle = '#E3A24A'; g.beginPath(); g.moveTo(cx - s * 0.66, y + h); g.quadraticCurveTo(cx - s * 0.66, y - h * 0.3, cx, y - h * 0.3); g.quadraticCurveTo(cx + s * 0.66, y - h * 0.3, cx + s * 0.66, y + h); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#FFF1C9'; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(cx - s * 0.4 + i * s * 0.13, y + h * (0.25 + 0.2 * (i % 2)), s * 0.03, s * 0.016, 0.4, 0, 7); g.fill(); } }
    else if (k === 'lettuce') { g.fillStyle = '#2DC46E'; g.beginPath(); g.moveTo(cx - s * 0.74, y + h); for (let i = 0; i <= 16; i++) g.lineTo(cx - s * 0.74 + i * s * 0.0925, y + (i % 2 ? h * 1.1 : -h * 0.2)); g.lineTo(cx + s * 0.74, y + h); g.closePath(); g.fill(); g.stroke(); }
    else if (k === 'tomato') { g.fillStyle = '#EB2715'; g.beginPath(); g.roundRect(cx - s * 0.68, y, s * 1.36, h, h * 0.5); g.fill(); g.stroke(); g.fillStyle = '#FF7A5C'; g.fillRect(cx - s * 0.5, y + h * 0.25, s * 0.25, h * 0.2); }
    else if (k === 'cheese') { g.fillStyle = '#FFD21F'; g.beginPath(); g.moveTo(cx - s * 0.7, y); g.lineTo(cx + s * 0.7, y); g.lineTo(cx + s * 0.7, y + h); g.lineTo(cx + s * 0.38, y + h); g.lineTo(cx + s * 0.3, y + h * 2.2); g.lineTo(cx + s * 0.22, y + h); g.lineTo(cx - s * 0.3, y + h); g.lineTo(cx - s * 0.4, y + h * 1.9); g.lineTo(cx - s * 0.5, y + h); g.lineTo(cx - s * 0.7, y + h); g.closePath(); g.fill(); g.stroke(); }
    else if (k === 'ham') { g.fillStyle = '#F07C8C'; g.beginPath(); g.roundRect(cx - s * 0.7, y, s * 1.4, h, h * 0.3); g.fill(); g.stroke(); g.strokeStyle = '#FFC0C8'; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(cx - s * 0.5, y + h * 0.5); g.lineTo(cx + s * 0.4, y + h * 0.5); g.stroke(); }
  }
  marker(g, '#C4761C', s * 0.04); g.beginPath(); g.moveTo(cx + s * 0.1, y + s * 0.05); g.lineTo(cx + s * 0.16, y - s * 0.42); g.stroke();
  g.fillStyle = '#EB2715'; g.strokeStyle = ink; g.lineWidth = s * 0.025; g.beginPath(); g.moveTo(cx + s * 0.16, y - s * 0.42); g.lineTo(cx + s * 0.46, y - s * 0.34); g.lineTo(cx + s * 0.15, y - s * 0.24); g.closePath(); g.fill(); g.stroke();
  if (hat) prop_cap_hat(g, cx - s * 0.12, y - s * 0.2, s * 0.6);
}
