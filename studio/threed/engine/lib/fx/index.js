// lib/fx — disaster FX for Legion 3D ("How Long You'd Last in Every Natural Disaster").
// Two artists share this index. APPEND your own entries to MODULES; never rewrite or reorder the other artist's.
//   D2a (weather & water): files prefixed w_   (fx.lightning, fx.avalanche, fx.tornado, fx.hurricane, fx.tsunami, fx.megatsunami)
//   D2b (fire, earth & space): files prefixed f_   (fx.wildfire, fx.quake, fx.eruption, fx.pyroclastic, fx.ashmap, fx.impact, fx.grb;
//                              f_common.js is shared machinery, not a module)
// Entries are paths relative to this file. The core registry imports each one on its own, so a missing or broken
// module never takes the others down (it is warned and skipped).
export const MODULES = [
  // ── D2a weather & water ──
  './w_lightning.js', './w_avalanche.js', './w_tornado.js', './w_hurricane.js', './w_tsunami.js', './w_megatsunami.js',
  // ── D2b fire, earth & space (append below) ──
  './f_wildfire.js', './f_quake.js', './f_volcano.js', './f_ashmap.js', './f_space.js',
  // ── E2 (v2) sea disaster: iceberg, distress rockets, people and wreckage in the water ──
  './e2_sea.js', './e2_wreck.js', './e2_under.js', './e2_deep.js',
  // ── E2 (asteroids, 29 Sep 2026): the rock at any size + scale comparison, entry, airburst, craters, defence, giants ──
  './a_asteroid.js', './a_entry.js', './a_airburst.js', './a_hud.js', './a_defence.js', './a_global.js', './a_giant.js', './a_crater.js',
  // ── E5 (explosions, 30 Sep 2026): nuclear, conventional by yield, shock front + heat flash, sets, scale devices, cosmic ──
  './x_nuke.js', './x_blast.js', './x_shock.js', './x_sets.js', './x_sites.js', './x_volcano.js', './x_cosmic.js', './x_devices.js', './x_gw.js', './x_phone.js', './x_street.js',
];
