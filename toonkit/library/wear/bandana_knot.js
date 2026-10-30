// @piece wear/bandana_knot: two small bandana tails tied at the back of the head. Options: color.
// usage: wear_bandana_knot(cook.head, { color: '#1C9AAA' });
function wear_bandana_knot(head, o = {}) { const g2 = new THREE.Group(); head.add(g2);
  for (const sd of [-1, 1]) { const k = add(new THREE.SphereGeometry(0.025, 12, 8), o.color || '#1C9AAA', {}, head); k.scale.set(0.6, 1, 1.4); k.position.set(sd * 0.03, R * 0.25, -R * 1.02); k.rotation.z = sd * 0.6; outline(k, 0.004); } return g2; }
