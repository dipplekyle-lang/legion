// @piece prop/diner_stool: red-topped chrome diner stool (seat, chrome rim, post, foot ring, dark base, contact shadow); ~0.38 tall. Options: x, z, color, chrome material.
// usage: const st = prop_diner_stool({ x: -0.65, z: 0.42 });
function prop_diner_stool(o = {}) { const x = o.x || 0, z = o.z || 0, seatCol = o.color || '#EB2715', chrome = o.chrome || new THREE.MeshPhongMaterial({ color: '#C3C8D0', shininess: 90, specular: '#FFFFFF' }); const s = new THREE.Group(); s.position.set(x, 0, z); scene.add(s);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 0.055, 32), new THREE.MeshPhongMaterial({ color: seatCol, shininess: 50, specular: '#FFD0C8' })); seat.position.y = 0.37; s.add(seat); outline(seat, 0.004);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.097, 0.008, 8, 32), chrome); rim.rotation.x = Math.PI / 2; rim.position.y = 0.343; s.add(rim);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 14), chrome); post.position.y = 0.17; s.add(post); outline(post, 0.003);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.007, 8, 28), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 0.14; s.add(ring);
  const base = add(new THREE.CylinderGeometry(0.09, 0.1, 0.02, 28), '#2E3240', { hull: 0.003 }, s); base.position.y = 0.01;
  blob(s, 0, 0.002, 0, 0.32, 0.32, 0.85); return s; }
