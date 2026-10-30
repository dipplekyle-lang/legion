## 13. Explosions kit (E5) — "How Long You'd Last Against Every Explosion"
Every blast is sized by its YIELD (TNT equivalent) at TRUE scale; FX are time-compressed so they read in a shot. The
stage (the world origin) is where YOU stand: put the blast `at` 1000 m away (the video's rule: always 1 km) and the
kind sends its dust front past the stage at `t_arrive`. Sync the moment across kinds: the same `t` for the flash,
the same `t_arrive` for fx.shock_front, cast `struck_fall`, fx.window_blast `t_hit` and a camera `shake`. A lethal
moment = fx.heat_flash intensity 3 (the frame whites out) + label.blast_clock `killed`. FX roots carry mask proxies,
so target them directly (`objects:N`, `objects:N.cap` / `.cloud`) — never a bare sky.

<!--needs:fx.nuke-->
- **fx.nuke** — nuclear: flash, fireball, Wilson cloud, the toroidal mushroom (billows rolling up the middle and under the
  rim), stem, condensation collars, dust skirt. `preset` hiroshima (15 kt, air 580 m) | nagasaki | trinity (tower) |
  ivy_mike (10.4 Mt) | castle_bravo (15 Mt, water) | tsar_bomba (50 Mt, air 4 km) or `yield` "15 kt"/"50 Mt", `burst`
  air|surface|tower|water, `t` flash, `grow` s to the mature cloud (10; 5 = dramatic), `phase` 0..1.4 = already risen
  (no flash in the shot), `t_arrive`, `scale` (0.35: a whole 50 Mt cloud from the ground). Sizes: 15 kt top 16 km,
  1 Mt 22 km, 50 Mt 64 km. From 1 km at 15 kt, look UP (fov 70, look_h ~ 3-6 km); wide: camera ~1.5 x top away.
```json
{"objects":[{"kind":"fx.nuke","at":[0,-12000],"preset":"hiroshima","t":1,"grow":9}],"camera":{"move":"keys","fov":58,"target":"objects:0","keys":[{"t":0,"at":[0,0],"alt":40,"look_at":[0,-12000],"look_h":4000},{"t":10,"at":[400,150],"alt":55,"look_at":[0,-12000],"look_h":6500}]}}
```
<!--/needs-->
<!--needs:fx.explosion-->
- **fx.explosion** — any chemical blast, 1 kg .. kilotons: flash, sooty orange fireball, the white shock dome in humid
  air, the rising cloud (a small mushroom from tonnes up), dust ring, debris on arcs trailing smoke, scorch. `preset`
  moab (11 t thermobaric) | beirut (1.1 kt ammonium nitrate: `pre` s of grey smoke turning red-brown with white
  firework pops, then the white dome, black-orange fireball, red-orange mushroom) | halifax (2.9 kt ship: white pillar)
  | texas_city | tianjin | truck_bomb | bomb_500lb | tnt_1kg; or `yield` + `type` tnt|thermobaric|ammonium_nitrate|
  ship|industrial; `t`, `pre`, `height` (air burst), `wilson` 0..1.2, `debris` 0..2, `surface`, `t_arrive`, `grow`.
  Cloud tops: 1 t 170 m, MOAB ~600 m, Beirut ~1.8 km, Halifax ~3.4 km.
```json
{"world":{"biome":"ocean"},"structures":[{"kind":"landmark.beirut_port","at":[0,0],"heading":0}],"objects":[{"kind":"fx.explosion","at":[-150,58],"preset":"beirut","t":6}],"camera":{"move":"keys","fov":50,"target":"objects:0","keys":[{"t":0,"at":[300,-1100],"alt":60,"look_at":[-150,58],"look_h":120},{"t":12,"at":[360,-1060],"alt":64,"look_at":[-150,58],"look_h":300}]}}
```
<!--/needs-->
<!--needs:fx.firecracker-->
- **fx.firecracker** `variant` m80|cherry_bomb|firecracker|string, `t` fuse lit, `fuse` s: fizzing fuse, the bang (flash,
  sparks, red paper confetti, white smoke). **fx.dynamite** `sticks` 1..24, `t`, `fuse`: the red bundle, the fuse
  burning down with sparks, then the blast (rock and dirt). Film small things with `limits: "macro"`, the lens >= 0.4 m
  up and moving <= 0.1 m/s (lower or faster gets lifted by the safety pass), fov 25-35.
```json
{"objects":[{"kind":"fx.firecracker","at":[0,0],"variant":"m80","t":0.3,"fuse":1.5}],"camera":{"move":"keys","fov":28,"target":"objects:0","limits":"macro","keys":[{"t":0,"pos":[0.7,0.45,0.75],"look":[0,0.03,0]},{"t":6,"pos":[0.45,0.4,0.85],"look":[0,0.05,0]}]}}
```
<!--/needs-->
<!--needs:fx.frag_burst-->
- **fx.frag_burst** — the grenade shell splitting (close-up, slow motion): an olive M67 that glows and breaks into
  hundreds of dark steel fragments flying out, a small flash, a faint air-blast shell; `t`, `slow` = real seconds per
  screen second (default 0.002: a 500x camera, they cross ~2 m in a second; 1 = real time; freeze them with spec.clock
  freeze_at), `count`, `elev`. fx.firecracker
  `cutaway: true` shows the black powder in the cut tube (and it swells just before it splits).
```json
{"objects":[{"kind":"fx.frag_burst","at":[0,0],"t":1}],"camera":{"move":"keys","fov":30,"target":"objects:0","limits":"macro","keys":[{"t":0,"pos":[0.9,0.5,0.9],"look":[0,0.05,0]},{"t":6,"pos":[0.75,0.45,1.05],"look":[0,0.05,0]}]}}
```
<!--/needs-->
<!--needs:fx.shock_front-->
- **fx.shock_front** (at the stage) — the wave reaching YOU: a dust wall sweeping in from `from` (compass deg towards
  ground zero) at `t_arrive`, `trees` on the stage bending away (strength >= 1.3 snaps some), leaves / paper / grit
  flying, dust hanging after. `strength` 0.2..2.5. **fx.heat_flash** (at the stage) — `from`, `el`, `t`, `dur`,
  `intensity` (3 = white-out): blinding light, long shadows, the ground smoking, dry grass catching; cast
  `shield_face` or `look_up` shade: true at t.
```json
{"objects":[{"kind":"fx.nuke","at":[0,-1000],"preset":"hiroshima","t":1,"t_arrive":3.2},{"kind":"fx.heat_flash","at":[0,0],"from":0,"el":30,"t":1,"dur":2},{"kind":"fx.shock_front","at":[0,0],"from":0,"t_arrive":3.2,"strength":1.4,"trees":10}],"cast":[{"ref":"witness","at":[0,0],"heading":0,"actions":[{"t":0,"action":"watch"},{"t":1.05,"action":"shield_face"},{"t":3.2,"action":"struck_fall","fall":"back"}]}],"camera":{"move":"keys","fov":60,"target":"cast:0","shake":[{"t":3.2,"amp":1.4,"dur":1.4,"freq":8}],"keys":[{"t":0,"at":[-4,7],"alt":1.7,"look_at":[0,-60],"look_h":18},{"t":6,"at":[-3.4,6.2],"alt":1.8,"look_at":[0,-60],"look_h":16}]}}
```
<!--/needs-->
<!--needs:map.blast_ring-->
- **map.blast_ring** — THE 1 KM RING: a top-down map disc (`style` field|village|city|harbour|island|atoll|ocean|quarry|
  arctic|desert|mountains), mustard crosshair, the dashed ring "1 km · 0.6 mi", the tiny Witness on it, `zones`
  [{r_m, color red|orange|pale|fire, label, ring}] (only sourced radii), `fireball_km` (Bravo 7), `markers`
  [{km, az, label}], and the moment: `t_flash` (pulse to the Witness), `heat`, `t_arrive` (the shock ring reaches
  the Witness), `shrink` {t, dur, to_km} (to "0 m"). Camera straight down from ~1.5 x size.
```json
{"world":{"biome":"plains","vegetation":0},"objects":[{"kind":"map.blast_ring","at":[0,0],"size":40,"style":"field","zones":[{"r_m":230,"color":"pale","label":"230 m","ring":true},{"r_m":15,"color":"orange","label":"15 m"},{"r_m":5,"color":"red","label":"5 m"}],"t_flash":1,"t_arrive":3.9}],"camera":{"move":"keys","fov":50,"target":"objects:0","keys":[{"t":0,"pos":[0,62,6],"look":[0,0,0]},{"t":6,"pos":[0,56,4],"look":[0,0,0]}]}}
```
<!--/needs-->
<!--needs:label.blast_clock-->
- **label.blast_clock** (labels) — THE BLAST CLOCK HUD: track + LIGHT HEAT BLAST WIND DEBRIS icons + SURVIVED 00:00.0.
  `t0` flash, `icons` {light: 0, heat: 0.05, blast: 2.2, wind: 2.3, debris: 2.4} (clock s; omit = grey), `killed` clock s
  (freezes red), `lifetime` scene s (fast-forwards green: A LIFETIME), `paused` (00:00.0 blinking), `mode` safe
  (SAFE DISTANCE `from`->`to` light-years). One per shot, with the moment's times.
```json
{"labels":[{"kind":"label.blast_clock","t0":1,"icons":{"light":0,"heat":0.05,"blast":2.2,"wind":2.3,"debris":2.4},"killed":2.2}]}
```
<!--/needs-->
<!--needs:label.verdict_board-->
- **label.verdict_board** (labels, full frame) — THE VERDICT BOARD: rows NOWHERE ON EARTH / LESS THAN A BLINK / SECONDS /
  IT DEPENDS / A LIFETIME, `placed` [{card, row}] (cards: firecracker, dynamite, grenade, moab, beirut, halifax,
  hiroshima, castle_bravo, tsar_bomba, krakatoa, supernova, grb, black_holes; rows: nowhere|blink|seconds|depends|
  lifetime), the tray of the rest, `move` {card, row, t, dur}: a cursor drags it in with its personality (sparks,
  fizz, heavy thud, glass crack, telegraph tap, quiet, white flakes, oversized, a ring, glow, ripple); `slide_in`.
```json
{"labels":[{"kind":"label.verdict_board","placed":[{"card":"firecracker","row":"lifetime"}],"move":{"card":"dynamite","row":"lifetime","t":0.8,"dur":1.4}}]}
```
<!--/needs-->
<!--needs:label.log_scale-->
- **label.log_scale** (labels) — a log-scale ruler on the lens: the yield scale (`unit` t: g..Mt), the SAFE DISTANCE ruler
  (`unit` ly: a red `zones` band to 50 ly, Earth, Betelgeuse 548 ly), the sound-level bar (`unit` dB); `markers` [{v, label,
  t_in}], a sliding `pointer` {from, to, t, dur, label}, `zoom` {max, t, dur} (the top jumping up), `orient`, `title`.
```json
{"labels":[{"kind":"label.log_scale","unit":"ly","min":1,"max":1000,"title":"safe distance","zones":[{"from":1,"to":50,"color":"rgba(216,68,43,0.55)","label":"DANGER"}],"markers":[{"v":1,"label":"EARTH"},{"v":548,"label":"BETELGEUSE"}]}]}
```
<!--/needs-->
<!--needs:scale.tnt-->
- **scale.tnt** — THE TNT CUBE: one orange-red block of the yield's TNT at true volume, stencilled TNT + the yield stamp,
  beside `ref` apple (on a kitchen scale reading the grams) | witness | house | building7 | eiffel (auto by size):
  grenade 180 g = 4.8 cm, MOAB 11 t = 1.9 m, Beirut 1 kt = 8 m, Hiroshima 15 kt = 21 m, Tsar 50 Mt = 312 m.
  The cube stands at `at`, the reference to its +x. For "beside the Witness" leave ref out and put cast witness at
  [x + 1.9, z].
```json
{"world":{"biome":"desert","relief":0.03},"objects":[{"kind":"scale.tnt","at":[0,-40],"yield":"15 kt","heading":180}],"camera":{"move":"keys","fov":50,"target":"objects:0","keys":[{"t":0,"at":[-30,30],"alt":3,"look_at":[8,-40],"look_h":10},{"t":6,"at":[-22,34],"alt":4,"look_at":[8,-40],"look_h":10}]}}
```
<!--/needs-->
<!--needs:landmark.beirut_port-->
- **Places** (own land: use biome ocean): **landmark.beirut_port** (grain silos, Hangar 12 = anchor hangar12, cranes,
  containers, the city of beige blocks up the hill; `damaged`), **landmark.harbour_1917** (Halifax: the Narrows, Piers
  6-9, the railway, the Richmond station = anchor station, the sugar refinery, ~300 wooden houses and steeples on the hill;
  anchor pier6), **landmark.atoll** (Bikini: islets with palms round a turquoise lagoon; anchors reef_west, outside),
  **landmark.test_tower** (style trinity | cab), **interior.hangar12** (inside Hangar 12: white NH4NO3 bulk bags stacked
  to the roof, fireworks near the door, `t_spark` pops, `t_fire` flames; film at eye level, limits eye). Things: **ship.cargo** (era 1917 Mont-Blanc with drums on deck | 1947
  Liberty | modern; `fire` 0..1.5; `name`), **ship.fishing_boat** (the Lucky Dragon No. 5; `ash` 0..1 white flakes),
  **aircraft.tu95** (white Tu-95V, contra-rotating props, `bomb`, `drop`), **prop.bomb** (variant tsar with its huge
  striped parachute | little_boy | fat_man | moab with grid fins | mk82; `y`, `speed`; `parachute: false, trolley: true` =
  on a wheeled trolley in a hangar), **detail.barograph** (insert: the
  pen draws the pressure spike at `t_spike`, `passes`).
```json
{"world":{"biome":"ocean"},"look":{"time":"morning","sun":{"az":120,"el":15},"grade":"cold"},"structures":[{"kind":"landmark.harbour_1917","at":[0,0],"heading":0}],"objects":[{"kind":"ship.cargo","at":[0,440],"era":"1917","name":"MONT-BLANC","fire":1,"heading":250}],"camera":{"move":"keys","fov":50,"target":"objects:0","keys":[{"t":0,"at":[300,1100],"alt":60,"look_at":[-150,380],"look_h":20},{"t":8,"at":[260,980],"alt":64,"look_at":[-150,380],"look_h":24}]}}
```
<!--/needs-->
<!--needs:aircraft.c130-->
- **The hook room**: fx.window_blast `room: {style: "apartment", width: 7, depth: 7, calendar: "TUESDAY 4 AUGUST 2020"}`
  (tiles, rug, sofa, bookshelf whose books fall at t_hit, a swinging ceiling lamp, curtains streaming in, green shutters
  outside, a wall clock at `clock` "6:05", a framed picture, skirting and cornice), window `width` 2.4 `height` 2.7 `sill` 0.35 `panes` 2, `elev` 16, heading 0, at [-150, 1058] with
  landmark.beirut_port `clear: [-150, 1058, 40]` and `t_blast` = the explosion's t (rooftop tanks jolt as the front
  passes). **aircraft.c130** — the MC-130 with the rear ramp open, the MOAB on its cradle in the hold, `extract` s: the
  drogue pulls the cradle out and it drops away (never a bomber bay).
```json
{"world":{"biome":"ocean"},"look":{"time":"dusk","sun":{"az":285,"el":9}},"structures":[{"kind":"landmark.beirut_port","at":[0,0],"heading":0,"t_blast":5,"clear":[-150,1058,40]}],"objects":[{"kind":"fx.window_blast","at":[-150,1058],"heading":0,"elev":16,"t_hit":8.2,"width":2.4,"height":2.7,"sill":0.35,"panes":2,"room":{"style":"apartment","width":7,"depth":7}},{"kind":"fx.explosion","at":[-150,58],"preset":"beirut","t":5,"pre":4,"t_arrive":8.2}],"cast":[{"ref":"witness","at":"objects:0.window","offset":[0.3,-0.4],"action":"watch"}],"camera":{"move":"keys","fov":55,"target":"objects:0","keys":[{"t":0,"at":[-148.6,1062.5],"alt":17.6,"look_at":[-150,1040],"look_h":18},{"t":10,"at":[-149,1061.3],"alt":17.65,"look_at":[-150,1040],"look_h":18.4}]}}
```
<!--/needs-->
<!--needs:detail.phone-->
- **The phone (hook beats 008-012)**: **detail.phone** — a smartphone in the Witness's white mannequin hand (portrait,
  light-blue sleeve); its screen shows the LIVE view out of its back camera (the smoke over the port, the fireball),
  the red REC dot and the running timer from `t_rec` (`rec_start` s shown then), the shutter button; `t_flash` = the
  screen blows out orange-white, then the live view comes back. Aim it with `heading` (where the back camera looks) +
  `tilt`, or `look_at` [x, z] + `look_h`. EYE POV: NO cast figure in these shots (the lens is the Witness's eyes): put
  the phone 0.3-0.7 m in front of the lens, `elev` = floor elev + 1.45, camera `limits: "macro"`, pushing in at >= 0.09
  m/s (a slower lens is "still" and falls back to a flyover). Several phones at windows across the street = the
  neighbours filming. The port's old quarters are a street grid of low blocks, so the window looks over rooftops; the
  apartment has warm evening sun across its tiled floor (`room.sunlight` 0..2).
```json
{"world":{"biome":"ocean"},"look":{"time":"dusk","sun":{"az":285,"el":9},"sky":"scattered","haze":0.3},"structures":[{"kind":"landmark.beirut_port","at":[0,0],"heading":0,"t_blast":5,"clear":[-150,1058,40]}],"objects":[{"kind":"fx.window_blast","at":[-150,1058],"heading":0,"elev":16,"t_hit":7.6,"width":2.4,"height":2.7,"sill":0.35,"panes":2,"room":{"style":"apartment","width":7,"depth":7}},{"kind":"fx.explosion","at":[-150,58],"preset":"beirut","t":5,"pre":4,"t_arrive":7.6},{"kind":"detail.phone","at":[-150.18,1058.6],"elev":17.45,"heading":0,"tilt":3,"t_rec":0,"rec_start":41,"t_flash":5}],"camera":{"move":"keys","fov":42,"target":"objects:2","limits":"macro","keys":[{"t":0,"at":[-150.12,1059.62],"alt":17.64,"look_at":[-150.2,1040],"look_h":17.3},{"t":8,"at":[-150.16,1058.92],"alt":17.6,"look_at":[-150.22,1040],"look_h":17.35}]}}
```
<!--/needs-->
<!--needs:landmark.balconies-->
- **The neighbours (hook beat 007)**: **landmark.balconies** — the apartment block across the street: balconies on
  every floor (steel rails, dark balcony doors, awnings) with faceless white mannequin neighbours in coloured shirts,
  most holding a phone up, all turned to `look_at` [x, z] (the port); the façade faces `heading`; `floors`, `bays`,
  `people` 0..1, `phones` 0..1. Put it where the lens looks at its face (15-40 m away); in the Beirut port set enlarge
  `clear` so no city block stands in it. Close raised phones (beat 008): a row of detail.phone at the windows.
```json
{"look":{"time":"dusk","sun":{"az":285,"el":9}},"world":{"biome":"plains"},"structures":[{"kind":"landmark.balconies","at":[0,0],"heading":0,"look_at":[-300,-1000]}],"camera":{"move":"keys","fov":50,"target":"structures:0","keys":[{"t":0,"at":[-6,-26],"alt":9,"look_at":[0,0],"look_h":9},{"t":6,"at":[4,-25],"alt":9.5,"look_at":[0,0],"look_h":9}]}}
```
<!--/needs-->
<!--needs:town.hiroshima_1945-->
- **town.hiroshima_1945** (structures) — the river delta, bridges (the Aioi T bridge), thousands of low wooden houses with
  dark tiled roofs, the Industrial Promotion Hall with its green dome (anchor dome), concrete shells; `t_blast` flattens
  the wooden city in a wave outward from ground zero (the town centre; the dome stripped to its ribs), fires from
  `t_fire` (t_blast + 6); `after: true` = flattened and burning. No people. Put fx.nuke preset hiroshima at the centre.
  landmark.harbour_1917 `t_blast` razes its houses from Pier 6 the same way; ship.cargo `vanish` = gone in the flash;
  landmark.beirut_port `t_blast` = Hangar 12 vanishes in the burst; landmark.atoll `crater: true` = the Bravo crater.
```json
{"world":{"biome":"plains","relief":0.05},"look":{"time":"morning","sky":"clear"},"structures":[{"kind":"town.hiroshima_1945","at":[0,0],"t_blast":1}],"objects":[{"kind":"fx.nuke","at":[0,0],"preset":"hiroshima","t":1,"grow":8}],"camera":{"move":"keys","fov":50,"target":"structures:0","keys":[{"t":0,"at":[-1800,2600],"alt":1500,"look_at":[0,0],"look_h":0},{"t":9,"at":[-1500,2700],"alt":1600,"look_at":[0,0],"look_h":300}]}}
```
<!--/needs-->
<!--needs:fx.krakatoa-->
- **fx.krakatoa** (biome ocean) — the jungle island, an ash plume already rising, the paroxysm at `t`: a white shock dome
  over the water, the island sinking, a colossal grey column, pyroclastic surges racing out across the sea, the tsunami
  ring. **fx.global_wave** (space) — the pressure ring circling the Earth `passes` times from `site_lat/lon`.
```json
{"world":{"biome":"ocean"},"look":{"time":"morning","sun":{"az":100,"el":25},"haze":0.3},"objects":[{"kind":"fx.krakatoa","at":[0,-25000],"t":2}],"camera":{"move":"keys","fov":55,"target":"objects:0","keys":[{"t":0,"at":[0,0],"alt":14,"look_at":[0,-25000],"look_h":3000},{"t":12,"at":[300,120],"alt":16,"look_at":[0,-25000],"look_h":9000}]}}
```
<!--/needs-->
<!--needs:space.supernova-->
- **space.supernova** (space) — the red supergiant, `t_collapse`, the breakout flash, the expanding filament shell,
  `pulsar`; `phase` 1 = the remnant (Crab look). **fx.supernova_sky** (night, at the stage) — the new star by distance
  `ly` (50 ly: ~25 x the full Moon, casts shadows), the Moon beside it (`moon`). **space.kill_radius** (space) — the
  red 50-light-year sphere, the Sun marked at `sun_ly`. fx.grb (existing: the beam, the ozone stripped) for the burst;
  space.supernova `jets: true` = a collapsar firing two narrow white-violet jets from its poles (slide the camera into one).
  **space.black_holes** (space) — two black holes with photon rings spiralling in and merging at `t_merge` (silent, no
  flash) over a glowing spacetime grid with spiral ripples then rings. **fx.gw_ripple** (at the stage, night) — rings
  over the field, the `target` figure stretching and squeezing. **landmark.ligo** — the 4 km L. **space.vela** — the
  1960s solar-cell satellites (`count` 2). **space.galaxy** — the Milky Way from above (`tilt`), the Sun marked, `burst`
  [x, z] + `t_burst` a point as bright as the galaxy with its `jet` to the Sun, `t_red` = the whole galaxy shaded red.
```json
{"world":{"biome":"space"},"objects":[{"kind":"space.supernova","at":[0,0],"t_collapse":1.5,"grow":8,"pulsar":true}],"camera":{"move":"orbit_planet","target":"objects:0","dist":3.2,"arc":25,"el":12}}
```
<!--/needs-->
