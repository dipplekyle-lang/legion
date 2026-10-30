// @piece prop/printed_menu: a printed paper menu you can hold: gold deal box on top, price rows below, navy back with the diner name. Options: rows, name, sub, deal, price, back. Needs tex/anchor_logo, prop/gold_box, prop/hero_sandwich and the engine's paper/txt/sticker.
// usage: const pm = prop_printed_menu({ rows: ROWS }); const menu = pm.make(0.2);  // pm.front / pm.back are the canvas textures
function prop_printed_menu(o = {}) {
  const ROWS = o.rows || [['BURGER', '$18'], ['CLUB SANDWICH', '$16'], ['GRILLED CHEESE', '$9'], ['FRIES', '$6'], ['APPLE PIE', '$7'], ['COFFEE', '$3']];
  const name = o.name || 'THE ANCHOR', sub = o.sub || 'DINER  ·  EST. 1962', deal = o.deal || 'ADMIRAL', price = o.price || '$90';
  const drawMenu = (g, w, h) => {                                      // the printed menu (paper, 145): the gold box on top, the burger right under it
    paper(g, w, h, 0, '#FBF6E9');
    g.fillStyle = '#1E2F86'; g.fillRect(0, 0, w, 86); tex_anchor_logo(g, 44, 46, 24, '#FFD75A', 6); tex_anchor_logo(g, w - 44, 46, 24, '#FFD75A', 6);
    txt(g, name, w / 2, 36, '40px Lilita', '#FFFFFF'); txt(g, sub, w / 2, 68, '20px Fredoka', '#BFD0FF');
    prop_gold_box(g, 26, 104, w - 52, 232); prop_hero_sandwich(g, 128, 226, 66);
    txt(g, 'THE', 336, 150, '28px Lilita', '#6A4300'); txt(g, deal, 336, 192, '50px Lucky', '#5A3A00'); sticker(g, price, 336, 270, 86, '#D2302A', '#FFF1B0', 'Lucky');
    ROWS.forEach(([a, b], i) => { const y = 384 + i * 50, big = i === 0, fa = `${big ? 34 : 28}px ${big ? 'Lilita' : 'Fredoka'}`, fb = `${big ? 36 : 30}px Lilita`;
      txt(g, a, 40, y, fa, '#2A2A2A', 'left'); const wa = g.measureText(a).width; txt(g, b, w - 40, y, fb, big ? '#1E2F86' : '#2A2A2A', 'right'); const wb = g.measureText(b).width;
      g.fillStyle = '#B9AE98'; for (let x = 52 + wa; x < w - 52 - wb; x += 11) g.fillRect(x, y + 8, 4, 4); });
    txt(g, 'ASK ABOUT OUR PIE OF THE DAY', w / 2, 692, '19px Fredoka', '#8A7E6C');
  }
  const menuTex = canvasTex(512, 720, drawMenu);
  const menuBack = canvasTex(512, 720, (g, w, h) => { g.fillStyle = '#1E2F86'; g.fillRect(0, 0, w, h); specks(g, w, h, 2600, ['#2A3C9A', '#16246E'], 1, 3, 17);
    marker(g, '#C4761C', 10); g.setLineDash([18, 10]); g.strokeRect(24, 24, w - 48, h - 48); g.setLineDash([]);
    tex_anchor_logo(g, w / 2, 300, 120, '#FFD75A', 26); txt(g, name, w / 2, 520, '70px Lilita', '#FFFFFF'); txt(g, o.back || 'DINER', w / 2, 590, '46px Lilita', '#FFD75A'); });
  function makeMenu(s = 0.2) { const g = new THREE.Group(); g.rotation.order = 'YXZ';
    const f = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 1.406), lam('#ffffff', { map: menuTex })); g.add(f);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 1.406), lam('#ffffff', { map: menuBack })); b.rotation.y = Math.PI; b.position.z = -0.0008; g.add(b);
    scene.add(g); g.userData.s = s; return g; }
  return { front: menuTex, back: menuBack, make: makeMenu, draw: drawMenu };
}
