<!--needs:aircraft.halifax-->
## 19. Sky kit (v3) — the Halifax bomber and the enterable cloud deck (fern's cold open)
**The airframe frame (always):** keep the bomber STILL (`speed: 0`, `y` ~1300, `heading` 180 = nose +Z, +X = port)
and give `sky.cloud_layer` the airspeed as wind (`wind: [0, -62]`): the deck streams past at 62 m/s and camera keys
are plain metres around the aircraft — nothing slips out of frame. Night look: `time: night`, `moon: {az: 195, el:
24}` = ahead of the nose, so the deck is BACKLIT (silver edges, moon-blue body, the bomber a dark silhouette);
`grade: nocturne` (or `cold`). Target an ANCHOR (`objects:0.body`, `.tail`, `.wing_r`, `.hatch`, `.hatch_edge`): a
bare `objects:0` is measured from the ground 1.3 km below and QA calls it off-screen.
- **aircraft.halifax** — Handley Page Halifax Mk II (SOE special duties 1941-42): twin D-fins, four Merlin nacelles with
  flame-damper glow (`exhaust` 0..1.5) and faint prop blur discs (`props: spin|still`), nose turret dome + framed
  bomb-aimer panel, mid-upper and tail turrets, slab-sided fuselage, matt black night finish with dark green / earth
  upper camo; `livery: day` = brighter camo, lighter undersides (a daylight raid). `keys` [{t, roll (+ = starboard wing
  down), pitch, yaw, dy}] eased attitude (banked 12 -> level: `[{t:0,roll:12},{t:1.4,roll:0}]`), `life` 0..1 bob.
  `interior: true` opens the hold: ribs (deep main frames + light formers), plank floor, the floor "Joe hole"
  (`hatch_open` true|false|t: the moonlight comes up ONLY through the open doors; shut = a hair line at the seam, so
  "the hatch opens" is a beat), benches, `static_lines` [seat indices] (they swing), `jump_light {red: 0, green: t}`
  (a small practical, eased switch), moon-blue light up through the hole that breathes as the deck streams past
  (`hatch_light` 0..2). Light from below reaches the hold only through the hole; inside the hold the moon / sky are
  dimmed and the deck draws no cloud (no fog in the fuselage): figures aboard read as silhouettes / under-lit shapes.
  Anchors: body, nose, cockpit, tail, wing_l (port, +X), wing_r (starboard), engine_1..4 (port outer .. starboard
  outer), hatch_below; interior: hatch, hatch_edge (stand point on the forward rim facing aft), seat_0..3 (0/1 starboard,
  2/3 port), hold, jump_light. Size: span 31.6 m, length 21.4 m; hold floor at y - 0.95, hatch at z -5.6 (r 0.5).
  People aboard: `on: "objects:0.seat_3"` + `sit_bench` (`seat: "bench"`, params seat_h 0.46); `on:
  "objects:0.hatch_edge"` + `hatch_sit` (legs in the hole) -> `hatch_jump`.
  Good distances: reveal from 50 m behind / 14 m below -> 17.5 m behind / 0.8 m below, fov 40, ONE smooth move with
  the middle key at half the distance (peak speed ~1.3x the mean; never most of the distance in the first second and a
  crawl after it); with `fog_in` on the deck the bomber emerges at 0.4-0.7 s and the twin fins fill the frame at the end
  (= fern 0:00-0:02). Keys at t = 0 / dur sit on the -0.25 / dur + 0.25 s handles: the last key is reached AFTER the
  cut, so put it ~1 m beyond the framing you want at the end.
  Engines 6-8 m off the outer nacelle, fov 46; wing pass 1.5-2.5 m under / behind the trailing edge; under the hatch
  3-4.5 m below (the hull no more than half the frame); hold from AFT: lens ~1.1 m above the floor at z -7.7 pushing
  to -6.5 (~0.8 m/s) on the agent at the hatch (three-quarter front, under-lit), fov 52, >= 1.3 m from every figure.
  Don't: a speed > 0 with keys cameras (the bomber leaves the frame at 62 m/s; moving bombers only with WP1's
  `chase`); the lens < 0.6 m from the hull (the probe is the real hull; only the hold and the hatch well are hollow);
  a lit close-up of a mannequin face in the hold; the moon behind the camera (flat grey, no silhouette); a locked-off
  hold (push, drift or let the lines swing).
```json
{"look":{"time":"night","sky":"clear","moon":{"az":195,"el":24},"grade":"nocturne"},"objects":[{"kind":"aircraft.halifax","at":[0,0],"heading":180,"speed":0,"y":1300,"keys":[{"t":0,"roll":12},{"t":1.4,"roll":0}]},{"kind":"sky.cloud_layer","base":850,"top":2600,"coverage":0.95,"density":1.3,"gaps":0,"scale":420,"fill":0.85,"inner":0.25,"near":8,"scatter":1.3,"tunnel":{"follow":"objects:0","radius":55,"fog":0.3,"t":[-2,8]},"wind":[0,-62],"streaks":0.35,"fog_in":{"t0":0.12,"t1":0.95,"depth":110}}],"camera":{"move":"keys","target":"objects:0.body","keys":[{"t":0,"pos":[-4.5,1286,-50],"look":[0,1300,0],"fov":40},{"t":1.05,"pos":[-3.25,1292.6,-33.75],"look":[0,1300.3,-3],"fov":40},{"t":2.1,"pos":[0,1299.2,-17.5],"look":[0,1300.7,-8],"fov":40}]}}
```
```json
{"cast":[{"ref":"agent1","on":"objects:0.hatch_edge","action":"hatch_sit"},{"ref":"agent2","on":"objects:0.seat_3","action":"sit_bench","seat":"bench","params":{"seat_h":0.46}}],"objects":[{"kind":"aircraft.halifax","at":[0,0],"heading":180,"speed":0,"y":1300,"interior":true,"hatch_open":true,"static_lines":[3],"jump_light":{"red":0,"green":1.05}},{"kind":"sky.cloud_layer","base":850,"top":2600,"coverage":0.95,"density":1.3,"tunnel":{"follow":"objects:0","radius":55,"t":[-4,8]},"wind":[0,-62]}],"camera":{"move":"keys","target":"objects:0.hatch_edge","handheld":0.4,"keys":[{"t":0,"pos":[-0.42,1300.27,-7.75],"look":[0.05,1299.67,-4.9],"fov":52},{"t":1.5,"pos":[-0.12,1300.07,-6.55],"look":[0,1299.65,-4.7],"fov":52}]}}
```
<!--/needs-->
<!--needs:sky.cloud_layer-->
- **sky.cloud_layer** — a real volumetric cloud deck over any world (raymarched, composited to the scene depth): fly
  into it (whiteout), through it, out over the moonlit tops; no seams anywhere; the bomber fades into it and emerges;
  the deck runs out to the horizon (analytic far deck to `far`, a haze glow over the horizon); the ground seen through
  a gap is hazed by the air below the deck. Night tops are moon-blue (dimmer away from the moon), day decks are soft
  white-gold without blowing out.
  `base` / `top` m above the ground, `coverage` 0..1, `density` 0.5..2 (1.3), `scale` billow size m (300-450),
  `fill` 0.85, `inner` patchy fog between the billows (0.1; 0.25 inside a bomber deck), `near` 5-8, `scatter` 1-1.3,
  `gaps` 0..1 (a few big feathered holes to the ground), `wind` [x, z] m/s, `streaks` 0..1 speed streaks round a fast
  lens, `brightness`, `haze`, `moon {az, el}` (default: the scene key).
  `fog_in: {t0, t1, depth}` (or `true` = 0 / 0.9 s / 120 m): the lens starts INSIDE a cloud bank (fern C1's blue
  whiteout, frame luma >= 0.6) whose density falls on an even transmittance ramp: the aircraft is hidden until ~t0 +
  0.3 s, faint at the middle, clear at t1 (exhaust glows and prop discs fade with it). Use it for every "out of the
  cloud" opening; t0 0.1-0.2, t1 0.8-1.0, depth > the distance to the aircraft.
  `tunnel {follow: "objects:0", t: [t0, t1], radius 55, fog 0.3}` carves a corridor along the bomber's track in the
  moving deck (t0 -2 = the corridor reaches behind the lens; the walls wander, no circular section); `via:
  [[x,y,z]...]` for any other corridor. A deck round a bomber: thick (top >= 1200 m above it) so the corridor never
  opens to a black sky.
  Don't: `near` < 3 m (noise on the lens), density > 2 (hard edges), the deck top within 300 m above the bomber (the
  corridor opens to a black sky), a cloud deck in a daylight scene with `grade: nocturne`, a fog_in shorter than
  0.6 s (the clearing reads as a flash).
```json
{"objects":[{"kind":"sky.cloud_layer","base":950,"top":1450,"coverage":0.8,"density":1.4,"gaps":0.35,"scale":380,"wind":[6,0],"streaks":0.3}],"camera":{"move":"keys","keys":[{"t":0,"pos":[0,880,0],"look":[0,1080,-260],"fov":55},{"t":2,"pos":[0,1200,-150],"look":[0,1300,-420],"fov":55},{"t":4,"pos":[0,1540,-300],"look":[0,1380,-620],"fov":55}]}}
```
<!--/needs-->
