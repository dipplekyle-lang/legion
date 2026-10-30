// @piece wear/name_tag: small white name tag pinned on the chest, 0.06 wide, with the name in Lilita. Options: text, color, x, y.
// usage: wear_name_tag(own.body, { text: 'SKIP' });
function wear_name_tag(body, o = {}) { const x = o.x === undefined ? -0.075 : o.x, y = o.y || 0.68, col = o.color || '#1E2F86';
  const tagT = canvasTex(256, 112, (g) => { g.fillStyle = '#F7F4EF'; g.fillRect(0, 0, 256, 112); txt(g, o.text || 'SKIP', 128, 60, '76px Lilita', col); });
  const tag = add(new THREE.BoxGeometry(0.06, 0.028, 0.004), '#F7F4EF', { map: tagT }, body); tag.position.set(x, y, onTorso(x, y) + 0.003); tag.rotation.y = -0.5; outline(tag, 0.0028); return tag; }
