<!doctype html>
<html><head><meta charset="utf-8"><title>flat demo</title>
<style>html,body{margin:0;background:#000}canvas{display:block}</style></head>
<body><canvas id="c" width="1080" height="1920"></canvas>
<script src="engine.js"></script>
<script>
// ── Worked example: "Why do onions make you cry?" (16 s). Learn the CRAFT, never the content. ─────────────────────────
// One idea per shot; a new picture every 2-3 s; camera locked in holds; entrances by the measured curves; one LINK per change
// (reveal, zoom-through, bars: the old picture flows into the new one through something on screen).
// Every shot is built in PLANES (far ground, subject, near-lens shapes): that is where the depth comes from, and the camera
// moves in pushes and whips turn the planes into parallax. Framing is BIG: heroes fill 45-80 % of the width, medium shots
// are cropped at the bottom edge, close-up faces fill the width, bodies overflow the sides.
const ONION = (g, w, h) => {                                       // our own talking object: an onion bulb with a sprout
  const top = -h * 0.95;
  flat(g, gg => { gg.beginPath(); gg.moveTo(0, top); gg.bezierCurveTo(w * 0.18, top + h * 0.18, w * 0.62, top + h * 0.38, w * 0.5, top + h * 0.66);
    gg.bezierCurveTo(w * 0.42, top + h * 0.86, w * 0.18, top + h * 0.9, 0, top + h * 0.9); gg.bezierCurveTo(-w * 0.18, top + h * 0.9, -w * 0.42, top + h * 0.86, -w * 0.5, top + h * 0.66);
    gg.bezierCurveTo(-w * 0.62, top + h * 0.38, -w * 0.18, top + h * 0.18, 0, top); gg.closePath(); }, '#C04FD8', w, { hl: true });
  g.save(); g.strokeStyle = rgba('#FFFFFF', 0.22); g.lineWidth = w * 0.025; g.lineCap = 'round';
  for (const k of [-0.28, 0, 0.28]) { g.beginPath(); g.moveTo(k * w * 0.4, top + h * 0.12); g.quadraticCurveTo(k * w * 1.25, top + h * 0.5, k * w * 0.5, top + h * 0.86); g.stroke(); } g.restore();
  noodle(g, [[0, top + 6], [w * 0.06, top - h * 0.12], [w * 0.16, top - h * 0.2]], w * 0.06, '#3DBE5A');
  specks(g, -w * 0.28, top + h * 0.42, w * 0.05);
};
// our own sun character: capsule rays, a face (white eyes, purple pupils, tiny smile)
const SUN = (g, x, y, r, t) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; cap(g, x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6, r * 0.14, PAL.yellow); }
  flat(g, gg => ell(gg, x, y, r, r), '#FFE23A', r * 2, { sx: 0.08, sy: 0.06, k: 0.05 }); for (const sd of [-1, 1]) { g.fillStyle = '#fff'; ell(g, x + sd * r * 0.38, y - r * 0.05, r * 0.24, r * 0.21); g.fill(); g.fillStyle = '#6A1470'; ell(g, x + sd * r * 0.38 + r * 0.06, y - r * 0.03, r * 0.11, r * 0.12); g.fill(); }
  g.save(); g.strokeStyle = '#E8601A'; g.lineWidth = r * 0.06; g.lineCap = 'round'; g.beginPath(); g.arc(x, y + r * 0.18, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.restore(); };

SHOTS = [
  // 1 HOOK (0-2.2): the claim on screen at frame 0, over its outcome: a crying face filling the width. Banner + title, no fade.
  shot(0, 2.2, (g, s) => {
    bg(g, PAL.orange, PAL.yellow); glow(g, W / 2, H * 0.64, 900, '#FFFFFF', 0.4);
    lensBokeh(g, 11, 10, ['#FFFFFF', PAL.yellow], s.t, { a: 0.35, centre: 0 });
    head(g, W / 2, H * 0.64, 760, { t: s.t, mood: 'sad', close: true, skin: '#F07A3A', hair: '#24163A', hairStyle: 'short' });
    for (const side of [-1, 1]) { const y = H * 0.67 + ((s.t * 300 + side * 110) % 300); g.fillStyle = '#6FD6FF'; ell(g, W / 2 + side * 190, y, 26, 38); g.fill(); }
    // the title LOCKUP: key words huge, filler small, two colours, ring + outer ring + extrusion; it leaves as the nearest
    // plane (lockOut) before the whip while the face stays
    enter(g, lockOut(s.t, 1.6, 'zoom'), W / 2, 330, () => lockup(g, [['Why Do', 58, '#FFFFFF'], ['ONIONS', 168, ['#FFE94A', '#FF8A1A']], ['Make You', 58, '#FFFFFF'], ['CRY?', 176, ['#7FE8FF', '#2B8BFF']]],
      W / 2, 150, { ring: '#3A0A3A', halo: '#FFFFFF', extrude: '#3A0A3A', tilt: -3 }));
  }),
  // 2 (2.2-5.0, whip up): the culprit as a talking object on a huge glowing backdrop disc, stage beams from above, dark
  // audience silhouettes close to the lens at the bottom (near plane, blurred). Its name lands on a tape banner.
  shot(2.2, 5.0, (g, s) => {
    bg(g, '#3A0858', '#B0055E', { mid: '#5A0860' });
    depth(g, 2.2, () => { beams(g, W / 2, -60, 5, '#FF9BE0', { t: s.t, a: 0.16, w: 190 }); lensBokeh(g, 5, 8, [PAL.magenta, PAL.violet], s.t, { a: 0.4, soft: 0.6 }); });
    depth(g, 1.25, () => backdrop(g, W / 2, H * 0.46, 560, 640, '#F25A0A', { col2: '#FFC21A', ground: '#3A0858' }));
    enter(g, s.k(0.1, 'pop', { over: 0.08 }), W / 2, H * 0.6, () => shadowed(g, gg => { gg.save(); gg.translate(W / 2, H * 0.7); gg.rotate(-0.08); obj(gg, { x: 0, y: 0, w: 560, h: 840, body: ONION, col: '#C04FD8', lidCol: '#FF7466', pose: 'dance', t: s.t, mood: 'sly', limb: '#7A1FA8' }); gg.restore(); }, { col: '#3A0858', dx: 70, dy: -40 }));
    fgCrowd(g, 21, '#0E0430', { n: 5, z: 0.4, lift: -40 });
    enter(g, s.k(0.55, 'grow'), W / 2, H * 0.745, () => banner(g, 'Onion', W / 2, H * 0.745, { tilt: 4, size: 86 }));
  }, { trans: { type: 'whip', dir: 'up' } }),
  // 3 (5.0-8.0, zoom-out reveal): the camera pulls back and the dancing onion turns out to sit in the inset circle above this
  // person's head (the window hands over to the bubble). A person, medium shot cropped at the bottom edge; the circle shows the part
  // we talk about; fact pills slide in from the left edge, 4 frames apart, on the words that name them.
  shot(5.0, 8.0, (g, s) => {
    bg(g, '#4FD0FF', '#9BF0A8');
    depth(g, 2.6, () => { g.fillStyle = rgba('#FFFFFF', 0.18); ell(g, W * 0.2, H * 0.3, 260, 260); g.fill(); ell(g, W * 0.9, H * 0.55, 180, 180); g.fill(); });
    person(g, { x: W * 0.6, y: 2190, s: 400, t: s.t, form: 'pear', mood: 'worried', skin: '#E8501E', hair: '#2E0A26', hairStyle: 'long', top: '#1FA36A', topStyle: 'crop', bottom: '#1B2A8A', shorts: true, belt: '#5B2A9A', armL: 14, armR: 14, dart: true });
    burst(g, s.t, 0.1, W * 0.6 + 190, 760, { n: 3, r: 30, dir: -Math.PI / 3, spread: 1.2 });   // worry drops thrown off on the entrance
    bubble(g, W * 0.6, 270, 130, ease(s.t, 0.25, 0.3), (gg, cx, cy, r) => { gg.fillStyle = '#3A1470'; gg.fillRect(cx - r, cy - r, 2 * r, 2 * r); obj(gg, { x: cx, y: cy + r * 0.75, w: r * 0.9, h: r * 1.35, body: ONION, col: '#C04FD8', t: s.t, mood: 'sly', limb: PAL.limb }); }, { ring: '#FFFFFF', w: 14, cone: false });
    pills(g, s, [['Sulfur', PAL.magenta, 0.9], ['An enzyme', PAL.violet, 1.4], ['A gas', PAL.orange, 1.9]], 660, { size: 56 });
  }, { trans: { type: 'reveal', x: 0.6, y: 0.14, r: 0.12, keep: 0.15 } }),
  // 4 (8.0-11.0, zoom-through the bubble into the onion): the micro world. A glowing molecule with rays, bright bokeh discs close to the lens,
  // a caveat plate at the top. Dark, glowing scene = science.
  shot(8.0, 11.0, (g, s) => {
    bg(g, '#1A0B52', '#07061F', { vig: 0.35 });
    lensBokeh(g, 3, 26, [PAL.magenta, PAL.cyan, PAL.yellow, '#3DFF8A', PAL.violet], s.t, { centre: 0.15 });
    const cx = W / 2, cy = H * 0.44;
    rays(g, cx, cy, 16, 760, '#BFF4FF', 0.22, s.t * 0.12, 0.35); glow(g, cx, cy, 520, PAL.cyan, 0.55); glow(g, cx, cy, 260, '#FFFFFF', 0.7);
    enter(g, s.k(0.15, 'pop'), cx, cy, () => molecule(g, cx, cy, 170, 5, { rot: s.t * 0.3, colA: PAL.magenta, colB: PAL.yellow }));
    enter(g, s.k(0.7, 'grow'), W / 2, H * 0.7, () => banner(g, 'Tear gas', W / 2, H * 0.7, { tilt: -6, size: 80 }));
    enter(g, s.k(1.4, 'pop'), W / 2, 170, () => caveat(g, ['Tiny amounts - harmless,', 'just very annoying!'], W / 2, 170));
  }, { trans: { type: 'into', x: 0.6, y: 0.14, r: 0.12, peek: 0 } }),
  // 5 (11.0-13.5, bars): a crowd as a statistic, filling in row by row, a share in a second colour, the number on a plate.
  shot(11.0, 13.5, (g, s) => {
    bg(g, PAL.yellow, '#FFC21F');
    crowd(g, { p: ease(s.t, 0.1, 0.8), share: 0.34, colA: '#4B23C8', colB: PAL.magenta, cols: 10, rows: 12, y: 380, h: H * 0.62, w: W + 80, x: -40 });
    stretch(g, s.t, 0.5, W / 2, 130, () => pill(g, 'Most kitchens', W / 2, 130, { col: PAL.violet, size: 46 }));   // the tag opens sideways
    wipe(g, s.t, 0.65, W / 2 - 260, 195, 520, 150, () => numBox(g, '1 in 3', W / 2, 270, { size: 92, col: PAL.navy }));   // the plate wipes on, 4 frames later
  }, { trans: { type: 'bars', col: PAL.violet } }),
  // 6 (13.5-16, dissolve): inside the body. The silhouette overflows the frame sides with a lighter rim and an inner glow, a
  // the food path runs from the mouth into a tract ringed in yellow; layered organs in one hue family; a counter rolls up.
  shot(13.5, 16, (g, s) => {
    bg(g, '#1C0D5A', '#07061F'); lensBokeh(g, 9, 10, [PAL.cyan, PAL.violet], s.t, { a: 0.35, soft: 0.8 });
    const P = body(g, W / 2, H * 0.34, 470, '#1E6FD6', { profile: true });          // head cropped by the top edge, shoulders past the sides
    const tract = [['stomach', P.stomach[0] + 50, P.stomach[1] + 30, 330], ['gut', P.gut[0], P.gut[1] + 90, 480]];   // the path the food takes: ringed in yellow
    organ(g, 'lungs', P.lungs[0], P.lungs[1] - 40, 560, {});
    for (const [k, x, y, z] of tract) organ(g, k, x, y, z, { edge: PAL.yellow, edgeW: 16, pass: 'edge' });
    tube(g, [P.mouth, [P.throat[0] + 30, P.mouth[1]], [P.throat[0] + 30, P.stomach[1] - 60]], s.t, { p: ease(s.t, 0.2, 0.6), w: 40, core: '#5A1FA0' });
    organ(g, 'liver', P.stomach[0] - 190, P.stomach[1] + 10, 380, { col: '#C94FD0' });
    for (const [k, x, y, z] of tract) organ(g, k, x, y, z, { pass: 'fill', food: s.t });
    organ(g, 'heart', W * 0.53, P.lungs[1] - 60, 360 * (1 + 0.05 * beat(s.t)), {});   // the heart keeps beating: the hold's one act
    counter(g, s, 0, 30, 0.3, 1.2, W / 2, H * 0.89, { post: ' seconds', size: 112 });
  }, { trans: { type: 'dissolve' } }),
  // 7 (16-19, cut): a place, built in planes: far mountains pale and close to the sky colour, nearer hills darker, the ground
  // darkest; sad rain clouds drift in front of the far planes, our sun up left, a pond with reeds in the foreground.
  shot(16, 19, (g, s) => {
    landscape(g, '#00C2F0', '#5FF0F0', '#0E9A4E', [[H * 0.36, 110, 2.8, { peaks: true, freq: 0.7 }], [H * 0.43, 60, 1.9, { bushes: 4, bushScale: 0.8 }], [H * 0.5, 40, 1.2, { bushes: 3 }], [H * 0.56, 18, 1, { col: '#0E9A4E' }]]);
    depth(g, 1, () => { const gr = g.createLinearGradient(0, H * 0.56, 0, H); gr.addColorStop(0, rgba('#0E9A4E', 0)); gr.addColorStop(1, rgba('#0A5A3A', 0.9)); g.fillStyle = gr; g.fillRect(-W, H * 0.56, 3 * W, H); });
    SUN(g, W * 0.22, H * 0.1, 95, s.t);
    depth(g, 2.2, () => cloud(g, W * 0.86 - s.t * 12, H * 0.17, 470, '#A9B8FF', { face: true, mood: 'sad', rain: 7, t: s.t, seed: 2 }));
    enter(g, s.k(0.3, 'slide', { dir: 'right', dist: 0.1 }), 0, 0, () => cloud(g, W * 0.42 + s.t * 10, H * 0.25, 560, '#B4C2FF', { face: true, mood: 'sad', rain: 8, t: s.t, seed: 5 }));
    const px = W / 2, py = H * 0.66; g.fillStyle = '#0A6A44'; ell(g, px, py + 18, 470, 140); g.fill(); g.fillStyle = '#1FB6E8'; ell(g, px, py, 440, 120); g.fill(); g.fillStyle = '#5ADCFF'; ell(g, px + 10, py + 8, 400, 96); g.fill();
    for (const [rx, ry, hh] of [[0.12, 0.64, 120], [0.17, 0.62, 160], [0.84, 0.61, 140], [0.88, 0.63, 110]]) { cap(g, W * rx, H * ry, W * rx + 6, H * ry - hh, 9, '#0A5A3A'); g.fillStyle = '#4A2A1A'; rr(g, W * rx - 9 + 6, H * ry - hh - 40, 18, 52, 9); g.fill(); }
    enter(g, s.k(0.9, 'pop'), W / 2, H * 0.12, () => title(g, ['Running Dry'], W * 0.55, H * 0.4, { size: 120, tilt: -6, oc: '#3A1AA8', ow: 12 }));
  }),
];
start();
</script></body></html>
