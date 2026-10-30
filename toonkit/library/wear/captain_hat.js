// @piece wear/captain_hat: white-topped captain's cap with a navy band, gold braid, visor and a round gold anchor badge; sits high on the head. Options: crown, band, braid, badge colours.
// usage: wear_captain_hat(own.head);   (needs drawAnchor)
function wear_captain_hat(head, o = {}) { const hat = new THREE.Group(); hat.position.set(0, R * 0.62, 0.0); hat.rotation.x = -0.12; head.add(hat);
  const navy = o.band || '#1D2340';
  const band = add(new THREE.CylinderGeometry(R * 0.92, R * 0.94, 0.04, 40), navy, {}, hat); band.scale.set(HX, 1, 1); band.position.y = 0.02; outline(band, 0.005);
  const crown = add(new THREE.CylinderGeometry(R * 1.12, R * 0.93, 0.055, 40), o.crown || '#F4F1EA', {}, hat); crown.scale.set(HX, 1, 1.02); crown.position.y = 0.067; outline(crown, 0.006);
  const braid = new THREE.Mesh(new THREE.TorusGeometry(R * 0.935, 0.004, 6, 40), lam(o.braid || '#E9A916')); braid.rotation.x = Math.PI / 2; braid.scale.set(HX, 1, 1); braid.position.y = 0.04; hat.add(braid);
  const brim = add(new THREE.CylinderGeometry(R * 0.8, R * 0.85, 0.012, 32), navy, {}, hat); brim.scale.set(1.12, 1, 0.75); brim.position.set(0, -0.002, R * 0.42); brim.rotation.x = 0.1; outline(brim, 0.006);
  const bT = canvasTex(128, 128, (g) => { g.fillStyle = o.badge || '#F2B705'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#8A5A00'; g.lineWidth = 6; g.stroke(); drawAnchor(g, 64, 66, 36, navy, 8); });
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), new THREE.MeshBasicMaterial({ map: bT, transparent: true })); badge.position.set(0, 0.022, R * 0.94 + 0.002); hat.add(badge); return hat; }
