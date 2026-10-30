// @piece wear/pom_beanie: a round yellow pom-pom on top of the head. Options: color.
// usage: wear_pom_beanie(cB.head, { color: '#F2B705' });
function wear_pom_beanie(head, o = {}) { const pom = add(new THREE.SphereGeometry(0.035, 16, 12), o.color || '#F2B705', {}, head); pom.position.set(0, R * 1.12, 0); outline(pom, 0.005); return pom; }
