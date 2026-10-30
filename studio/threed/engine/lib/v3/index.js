// lib/v3 — Legion 3D v3 "fern grade" kinds (2026-10-04, V3_SPEC.md). One module per work package; each starts as a
// WP0 stub (empty CATALOG): the registry loads them like nature/human/fx and an empty CATALOG adds no kind, so a spec
// that uses none of them renders exactly as before. A module that fails to load is warned and skipped (registry.js).
//   archive.js       WP2  archive.photo / desk / wall / frame / projector / screen / tv / filmstrip / float / relief / paper_label
//   lights.js        WP3  light.spot (cookies, beams) / light.rig / light.practical
//   stage.js         WP3  stage.void / fog.volume
//   aircraft_ww2.js  WP4  aircraft.halifax (exterior + interior)
//   cloudsky.js      WP4  sky.cloud_layer (enterable volumetric clouds)
//   kit_ww2.js       WP5  kits para_soe / ss_officer / civil_coat_1940s (extends the human kits by mutation)
//   para.js          WP5  para.jumper / para.canopy / para.stick
//   bust.js          WP5  figure.bust
//   places_cz.js     WP6  town.bohemian_village / town.prague_1942 / landmark.prague_castle / vehicle.mercedes_320 / vehicle.tram_prague
export const MODULES = ['./archive.js', './lights.js', './stage.js', './aircraft_ww2.js', './cloudsky.js', './kit_ww2.js', './para.js', './bust.js', './places_cz.js'];
