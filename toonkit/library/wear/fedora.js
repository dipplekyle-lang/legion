// @piece wear/fedora: plum fedora with a wide brim and a red band, plus a turned-up collar on the body (stranger's trench). Options: color, band, collar.
// usage: wear_fedora(str, { collar: '#9A5220' });   (takes the character)
function wear_fedora(c, o = {}) { const hat = new THREE.Group(); hat.position.set(0, R * 0.64, 0); hat.rotation.set(0.1, 0, 0.06); c.head.add(hat);
  const brim = add(new THREE.CylinderGeometry(R * 1.45, R * 1.45, 0.012, 40), o.color || '#3A2F45', {}, hat); brim.scale.set(1, 1, 0.92); outline(brim, 0.006);
  const crown = add(new THREE.CylinderGeometry(R * 0.8, R * 0.95, 0.11, 40), o.color || '#3A2F45', {}, hat); crown.scale.set(HX, 1, 1); crown.position.y = 0.06; outline(crown, 0.006);
  const band = add(new THREE.CylinderGeometry(R * 0.955, R * 0.96, 0.026, 40), o.band || '#EB2715', {}, hat); band.scale.set(HX, 1, 1); band.position.y = 0.02;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.7, 0.08, 32, 1, true, Math.PI * 0.18, Math.PI * 1.64), lam(o.collar || '#9A5220', { side: THREE.DoubleSide })); col.position.y = TB + TH + 0.0; col.rotation.y = Math.PI; c.body.add(col); outline(col, 0.004); return hat; }
