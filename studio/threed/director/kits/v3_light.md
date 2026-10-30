<!--needs:stage.void|light.spot|light.rig|light.practical|fog.volume-->
## 16. Light, void and film (v3, fern grade)
fern's look is ONE motivated light in the dark: a red slit across the antagonist in a black void, blue rims on the
heroes, blinds stripes over a desk, a moon behind the paratrooper in the snow. Most of the frame is near black; the
subject reads by its light (a slit, a rim, a silhouette against brighter haze or snow). Colour script PER SHOT with
`look.grade`: `nocturne` (blue night: snow, sky, free fall; navy blacks, moon-blue snow), `dossier` (warm sepia desk),
`void_blue` (black stage, blue duotone; a `keep_hue` light keeps its own colour: the red slit), `void_red` (black stage,
full colour, deep blacks), `interior_warm` (dark brown rooms, a cool window stays cool), `archive_bw` (a 3D shot that
imitates newsreel). Colour code: red = the perpetrator / death, blue = the heroes / night, amber = home. Colours by
name: slit red blue amber moon tungsten neutral green cyan (or #hex). Intensities are candela at exposure 1 (the engine
compensates night/day: the same number looks the same in any scene). Every v3 light is held off the face governor.
Faces: NEVER a lit mannequin face closer than 1 m; frame a bust from 2.4-2.8 m with fov 24-28 (chest-up).
<!--/needs-->

<!--needs:stage.void-->
- **stage.void** (objects) — the empty black stage: no terrain, sky or ambient; only your lights exist. `floor`
  none|gloss|matte, `haze` 0..1 (air for beams, 0.3-0.5), `glow` {color "#0C1C52", r, intensity, at [x, z], y,
  backdrop: true, `keys` [{t, i}], `fade` [t0, dur]} or a LIST of glows = soft haze discs standing behind the figures,
  facing the lens (dark figures read against them; without backdrop a glow lies on the floor). The fern recipe is TWO:
  a small halo (r 1.4-1.5, intensity 0.6-0.8, at [0, -1.1], y 1.6) between the hero and the figures behind, present
  from frame 1 (the cap and shoulders read as a silhouette at once, and it hides the figures behind until their own
  light comes up), plus the wide backdrop (r 3.4, intensity 2-2.2, at [0, -4.6], y 1.25) keyed 0 -> 1 on the beat.
  With a floor the backdrop fades out toward it (no horizon line). `rise` [{ref, t, dur 1.4-1.6, depth 0.3}] = figures
  come up out of the dark: floor "none" only (with a floor they fade up by their rig `fade`, no lift). Always add a
  MOVING layer: a self-glowing drifting `fog.volume` box right behind the hero (drift [0.15, 0.03, 0], glow 0.3) and
  `dust` 0.7 in the slit beam - never a frozen black postcard. Do: one subject, 1-3 lights, a push 0.5-2.5 %/s or an
  orbit <= 15 deg, camera.limits "eye". Don't: daylight, crowds, floor fog layers (their top edge draws a line), a
  camera closer than 2.4 m to a face, figures pointing a pistol at the lens (heading 128 / 232 for the two behind:
  the guns read in profile, aimed at the hero).
```json
{"look":{"time":"night","grade":"void_blue"},"cast":[{"ref":"heydrich","at":[0,0],"heading":180,"action":"attention"},{"ref":"gabcik","at":[-1.35,-2.4],"heading":128,"action":"aim_pistol"},{"ref":"kubis","at":[1.35,-2.4],"heading":232,"action":"aim_pistol"}],"objects":[{"kind":"stage.void","floor":"none","haze":0.4,"glow":[{"color":"#0C1C52","r":1.5,"intensity":0.75,"at":[0,-1.15],"backdrop":true,"y":1.6,"keys":[{"t":0,"i":1},{"t":2.3,"i":1},{"t":3.6,"i":0.55}]},{"color":"#0C1C52","r":3.4,"intensity":2.2,"at":[0,-4.6],"backdrop":true,"y":1.25,"keys":[{"t":0,"i":0.0},{"t":2.3,"i":0.0},{"t":3.7,"i":1}]}],"rise":[{"ref":"ref:gabcik","t":2.3,"dur":1.6,"depth":0.3},{"ref":"ref:kubis","t":2.55,"dur":1.6,"depth":0.3}]},{"kind":"fog.volume","shape":"box","at":[0,-0.95],"y":1.55,"size":[3.4,2.4,1.1],"density":0.26,"noise":1.0,"color":"blue","glow":0.55,"drift":[0.17,0.035,0.0],"scale":1.1},{"kind":"fog.volume","shape":"box","at":[0,-4.4],"size":[9,4,2.2],"density":0.3,"noise":0.9,"color":"blue","glow":0.18,"fade":[2.2,1.6],"drift":[-0.12,0.03,0],"scale":1.1},{"kind":"light.spot","target":"ref:heydrich","aim":"head","from":[-15,4,3.0],"color":"slit","intensity":80,"angle":7.5,"penumbra":0.08,"cookie":"slit","cookie_opts":{"w":0.042,"len":0.95,"feather":0.016,"band":0.22,"band_w":1.9},"spill":0.28,"keep_hue":true,"beam":0.32,"haze":0.4,"dust":0.75,"spill_drop":0.65,"range":4.2,"spill_angle":9.5},{"kind":"light.rig","key":false,"fill":false,"rim":{"color":"red","intensity":55,"az":125,"el":12,"dist":1.8,"angle":10,"aim":"chest","range":3.0},"subject":"ref:heydrich"},{"kind":"light.rig","key":{"color":"blue","intensity":10,"az":-42,"el":35,"dist":2.4,"angle":22},"fill":false,"rim":{"color":"blue","intensity":100,"az":140,"el":30,"dist":1.8,"angle":18},"rim_side":"both","fade":[2.3,1.1],"subject":"ref:gabcik"},{"kind":"light.rig","key":{"color":"blue","intensity":10,"az":42,"el":35,"dist":2.4,"angle":22},"fill":false,"rim":{"color":"blue","intensity":100,"az":140,"el":30,"dist":1.8,"angle":18},"rim_side":"both","fade":[2.55,1.1],"subject":"ref:kubis"}],"camera":{"move":"keys","limits":"eye","target":"ref:heydrich","keys":[{"t":0,"pos":[-0.34,1.68,2.78],"look":[0,1.6,0],"fov":21},{"t":3,"pos":[-0.05,1.68,2.68],"look":[0,1.6,0],"fov":21},{"t":6,"pos":[0.21,1.67,2.41],"look":[0,1.6,0],"fov":21}]}}
```
<!--/needs-->
<!--needs:light.spot-->
- **light.spot** (objects) — one spotlight with a projected `cookie`: slit (a vertical bar of light across the face) |
  blinds (venetian stripes) | window (mullion cross) | bars | foliage (moving leaf dapple) | gate (projector frame) |
  none. Place it `at` [x, z] + `y` (m above the ground), or `from` [az, el, dist] around the target (az + = toward the
  subject's right hand; -15 = just right of a lens that faces him). `target` 'ref:<castId>' (+ `aim` head|chest|waist|
  feet) or [x, y, z] (it follows a moving target). `angle` half-angle (slit 6-8, blinds / window 20-26), `beam` 0..1
  visible shaft in smoky air with dust motes (0.1-0.3 subtle, 0.6-0.8 strong; needs air: stage.void haze or a
  fog.volume), `spill` 0.25-0.3 (+ `spill_angle` 9-10, `spill_drop` 0.65 m: aimed at the chest, OFF the face) = a soft same-colour bounce so the
  body around a slit reads dark red instead of black, `range` m (the light dies out: keep a slit off the figures
  behind), `keep_hue` true, `fade` [t0, dur], `t_off`, `keys` [{t, i}], `flicker` 0..1, `sweep` {m, t: [t0,
  t1]} = the light slides across its target, in METRES AT THE TARGET: m 0.08-0.12 = the slit slides across the face
  (from_m / to_m for an offset slide; a slit is clamped to +-0.09 m); a headlight raking a wall 2-5 m, `cookie_rot` deg, `cookie_opts` (slit {w 0.042, len 0.95, band 0.22}; blinds {n 12,
  duty 0.5}). The slit has a hot core and a dimmer glow band (cookie_opts band 0.22, band_w 1.9): fern's deep-red edges
  and orange core; for a 2.4-2.8 m bust w 0.042 = a stripe about 1/4 of the face wide. Real shadows. Colour `slit` (#FF4A1E, fern's hot red-orange) at 70-90 with `spill` 0.25-0.3: a hot core over the
  face, the uniform a dark maroon form (fern T07 levels); `red` stays for rims. Window/blinds 60-90.
  Blinds interior: the window light 3-4 m away at the FRONT-side of the subject (the side the lens sees), y 2.4,
  aimed at the chest, so the stripes cross the figure and the wall behind; the camera at the other front corner
  looking across the shafts from 2.6-3.4 m, slightly high (y 1.7) so the desk top reads. A desk lamp 2-3, not more.
  A second, low tungsten blinds spot with `sweep` + `keys` = a passing car's headlights raking the stripes across the
  wall and the figure's shadow: the moving layer of a still interior.
```json
{"look":{"time":"night","grade":"interior_warm"},"cast":[{"ref":"clerk","at":[0,0.35],"heading":180,"action":"sit"}],"objects":[{"kind":"stage.void","floor":"matte","floor_color":"#1A140F","haze":0.6},{"kind":"light.spot","at":[-2.3,2.9],"y":2.45,"target":[0,0.95,0.3],"color":"moon","intensity":62,"angle":24,"penumbra":0.1,"cookie":"blinds","cookie_opts":{"n":9,"duty":0.5},"spill":0.04,"beam":0.85,"haze":0.6,"dust":0.7},{"kind":"light.spot","at":[-2.6,3.2],"y":1.25,"target":[0,1.2,-1.1],"color":"tungsten","intensity":34,"angle":20,"cookie":"blinds","beam":0.35,"dust":0,"sweep":{"from_m":-2.6,"to_m":2.2,"t":[0.8,4.4]},"keys":[{"t":0,"i":0},{"t":0.8,"i":0},{"t":1.7,"i":1},{"t":3.5,"i":1},{"t":4.4,"i":0}]},{"kind":"light.practical","practical":"lamp","at":[0.62,1.18],"y":1.15,"intensity":2.5,"flicker":0.06}],"camera":{"move":"keys","limits":"eye","target":"ref:clerk","keys":[{"t":0,"pos":[1.75,1.74,3.35],"look":[-0.05,1.02,0.4],"fov":36},{"t":5,"pos":[1.2,1.66,2.85],"look":[-0.05,1.04,0.4],"fov":36}]}}
```
<!--/needs-->
<!--needs:light.rig-->
- **light.rig** (objects) — key / rim / fill spots riding a cast member (they follow it): `subject` 'ref:<castId>'
  (not `on`: the engine reads `on` as 'stands aboard' and warns), `key` /
  `rim` / `fill` = a colour or {color, intensity, az, el, dist, angle, aim: head|chest, range}, false = off;
  `rim_side` both|left|right (rim `az` 125-150 = behind a shoulder, mirrored for the other side; left = camera-left for
  a subject facing the lens), `fade` [t0, dur] (the assassins appear 1-1.5 s after the line). A dark figure in a void
  reads by its RIM: rim 60-100 from behind, key 0-10 from high (el 35: the hat brim keeps the face dark). In a night
  exterior (nocturne, `look.dark` "low" drops the sky fill) the moon sits BEHIND the subject (moon az = the view
  direction +- 20) so the figure is a dark silhouette on pale snow; one moon rim (rim_side left, az ~100 = the side away
  from the lens) outlines helmet and shoulders; a tracking camera 4-4.5 m off at eye height (1.4 m).
```json
{"look":{"time":"night","grade":"nocturne","moon":{"az":342,"el":24},"haze":0.55,"fog":0.18,"dark":"low"},"weather":{"snow":0.5,"wind":0.25},"world":{"biome":"snowfield","relief":0.35},"cast":[{"ref":"para","at":[3.2,0.2],"heading":270,"action":"walk","path":[[-3.4,-0.4]],"speed":0.95}],"objects":[{"kind":"light.rig","subject":"ref:para","key":false,"fill":{"color":"moon","intensity":2,"az":60,"el":10,"dist":4},"rim":{"color":"moon","intensity":50,"az":100,"el":26,"dist":2.4,"angle":22,"aim":"chest"},"rim_side":"left"}],"camera":{"move":"keys","limits":"eye","track":true,"target":"ref:para","keys":[{"t":0,"at":[3.9,4.6],"alt":1.45,"fov":34},{"t":5,"at":[-0.9,4.25],"alt":1.4,"fov":34}]}}
```
<!--/needs-->
<!--needs:light.practical-->
- **light.practical** (objects) — a light you SEE: `practical` bulb (bare bulb on a cord) | lamp (green desk lamp,
  a warm pool on the desk; `y` = the shade height, desk top + 0.36) | jump (the paratroop jump light: red, then green at
  `t_switch`: red goes out, a beat of dark, green comes on), `at` [x, z], `y`, `intensity` (bulb 3-6, lamp 2-3, jump 4-5), `flicker` 0..1 (failing bulb 0.3,
  lamp 0-0.08), `color`, `color2`, `keep_hue` (the red jump light in a blue shot). A lamp throws its own shadowed pool
  on its own (no other spot needed). Keep it out of a beam (haze in front of it hides it), on the lens side of the
  subject, and keep the bulb BEHIND or beside a mannequin head (a white egg head must not be the brightest thing).
```json
{"objects":[{"kind":"light.practical","practical":"jump","at":[0.4,-2.1],"y":1.9,"t_switch":3.2,"keep_hue":true}]}
```
<!--/needs-->
<!--needs:fog.volume-->
- **fog.volume** (objects) — local smoke: `shape` box (`size` [w, h, d]) | sphere (`r`) | layer (`h`: a ground mist,
  for exteriors), `at`, `y`, `density` 0.1-0.4, `noise` 0.6-1, `drift` [vx, vy, vz] m/s (wind: [0.15, 0.03, 0] = smoke
  crossing the frame, the moving layer of a still shot), `scale` 0.8-1.5 (finer wisps), `glow` 0.05-0.35 (reads
  without a beam), `color`, `fade` [t0, dur], `keys` [{t, i}]. A beam passing through it turns solid; it hides what is behind it. A box
  behind the figures in a void = drifting smoke they stand against.
<!--needs:src:lib/fx/plume.js:makePlume-->
  SMOKE COLUMNS outdoors (a burning ship, a burning city, an oil fire): `shape` plume (`h` m tall, `r` base radius,
  `spread` top radius, `fire` 0..1 flames + an orange glow at the base, `color` '#1d1a17' oil smoke | '#8a8680' grey,
  `drift` [vx, vy, vz] = wind + rise) = lit billowing smoke that rises, widens and leans downwind. A burning
  `ship.warship` takes `fire` 1 (+ `fire_at` 0 stern..1 bow, `wind` [vx, vz]) itself. Never stack spheres into a plume.
<!--/needs-->
```json
{"objects":[{"kind":"fog.volume","shape":"box","at":[0,-0.95],"y":1.55,"size":[3.4,2.4,1.1],"density":0.22,"noise":1,"color":"blue","glow":0.32,"drift":[0.17,0.035,0],"scale":1.5}]}
```
<!--/needs-->
<!--needs:light.spot-->
- **Film + transitions** (any scene): `look.film` {grain_px 1..3, weave 0..1 (gate weave), flicker 0..1, halation
  0..1 (red glow round bright lights), dirt 0..1 (dust specks, hairs, scratches), vig_pow 1.3-1.7, matte 2.0 | 2.39
  (letterbox)}; the video presets `fern` (film texture only: you grade each shot) and `nocturne` (every shot blue)
  already carry it: do not repeat it per shot except to push a newsreel shot (archive_bw + dirt 0.5, flicker 0.6,
  weave 0.9). Dust, hairs, grain and the burn / leak edge are seeded per shot; `look.film.seed` N on both shots of a
  burn / leak cut makes the burn continue across it. `look.keep_hue` "red" keeps a colour through a mono grade without a light. Engine transitions
  (`transition.in/out`, a string or {kind, dur}): negative (0.12-0.2 s film negative on ONE side: a hard pivot, a
  name, a death; fern's signature at 3D <-> archival joins), flash (white, 0.2 per side), burn (film burn, 0.4-0.5
  per side: the end of an era, fire), leak (warm light leak, 0.4-0.5 per side: a memory), iris (0.5 per side, closes
  on the frame centre). Put the same kind on both sides of a cut (out of A + in of B) except negative. At most one per
  20 s.
<!--/needs-->
