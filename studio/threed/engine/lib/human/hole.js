// hole.js — a real HOLE in any world's ground (E1 specificity kit, 2026-09-29), with no change to the terrain.
// How: things below the opening (the pit's walls, floor, stakes, a figure climbing down) draw FIRST (renderOrder -3);
// then an invisible cover just above the opening writes depth only (renderOrder -2); then the terrain draws as usual and
// fails the depth test inside the opening, so the pit stays visible there, while everything above the ground (a figure
// standing over the hole) still draws in front of it. Outside the opening the terrain covers the pit as always.
// No stencil buffer needed (the renderer has none); it works with the logarithmic depth buffer and in every sub-frame.
import * as THREE from 'three';

export const UNDER = -3, MASK = -2;
// the invisible cover: a flat polygon (XZ outline in the hole's frame) at height y (just above the terrain)
export function holeMask(outline, y) {
  const sh = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, depthTest: true, side: THREE.DoubleSide });
  const me = new THREE.Mesh(g, m); me.renderOrder = MASK; me.name = 'hole_mask'; me.userData.noQA = true; me.frustumCulled = false;
  me.castShadow = false; me.receiveShadow = false;
  return me;
}
// everything that lives below the opening
export function drawUnder(obj) { obj.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine) o.renderOrder = UNDER; }); return obj; }
// the terrain height under an outline (the cover sits 1.5 cm above the highest point)
export function maskY(G, pts, toWorld) { let m = -Infinity; for (const [x, z] of pts) { const w = toWorld(x, z); m = Math.max(m, G.h(w[0], w[1])); } return m; }

// a pit: earth walls, floor; w x d (m), depth; outline rectangle. Returns { group, mask, floorY }
export function pitShell(o = {}) {
  const w = o.w ?? 1, d = o.d ?? 1.4, depth = o.depth ?? 1.2, mat = o.mat;
  const G = new THREE.Group(); G.name = 'pit';
  const wallG = (len) => { const g = new THREE.PlaneGeometry(len, depth + 0.1, Math.max(4, Math.round(len * 8)), Math.max(4, Math.round(depth * 8))); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, 0.025 * Math.sin(x * 9.1 + y * 5.3) + 0.015 * Math.sin(x * 23 + y * 17)); } g.computeVertexNormals(); return g; };
  const walls = [[w + 0.08, 0, -d / 2, 0], [w + 0.08, 0, d / 2, Math.PI], [d + 0.08, -w / 2, 0, Math.PI / 2], [d + 0.08, w / 2, 0, -Math.PI / 2]];   // corners overlap: no light leaks
  for (const [len, x, z, ry] of walls) { const m = new THREE.Mesh(wallG(len), mat); m.position.set(x, -depth / 2 + 0.05, z); m.rotation.y = ry; m.receiveShadow = true; G.add(m); }
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat); fl.position.y = -depth; fl.receiveShadow = true; G.add(fl);
  drawUnder(G);
  return { group: G, outline: [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], floorY: -depth };
}
