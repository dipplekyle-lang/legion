<!--needs:archive.desk-->
## 14. Archive kit (v3) — real photos and film INSIDE the 3D world (fern's dossier, the projector, the red slit)
Real people appear ONLY through their real archival photos (a print on the desk, a pinned photo, the relief portrait);
our mannequins never get a lit close-up face. Media come from the job's assets: `"src": "assets/<file>.jpg"`; a film is
an image sequence `"src": "assets/<dir>/"` + `"fps": 24` (frames 0001.jpg..., played by scene time). A sequence HOLDS
its last frame when the shot outlasts it (a warning names it): the clip must be at least as long as the shot; never
`loop: true` on real footage (repeated footage, H8). A missing file renders a dim grey print / "no signal" screen plus a
warning — use only the photo ids the job lists, never invent one.
Archive sets are closed and dark: `"world": {"biome": "interior"}`, `"look": {"time": "night", "dark": "pitch",
"grade": "warm"}`; the set brings its own motivated light and a black void round it (`void: false` when it stands in
a real room). `heading` turns a set about its centre (0 = the reader / the room at +z). Shots 4-8 s, `camera.strict`,
slow. The QA refuses a camera that is still at its start or end (< 0.08 m/s AND < 1 deg/s): on a desk, let the view
TURN instead of speeding up — tilt 84 -> 74 deg and swing the azimuth -6 -> +6 deg over 8 s (see the example).
<!--/needs-->
<!--needs:archive.desk-->
- **archive.desk** — fern's dossier: a dark plank desk under ONE warm lamp, real prints with white borders and typed
  labels, a map, typed documents / a folder / a telegram / an insignia patch overlapping at +-5-12 deg, clutter (pen,
  magnifier, ashtray with a smoking cigarette, coffee ring), dust in the lamp light. `items`: `[{src | kind:
  photo|map|doc|folder|telegram|insignia, at: [x, z] m from the desk centre (+z = toward the reader), rot deg, w m
  (hero print 0.22-0.24, other prints 0.16-0.22, map 0.5), label "Name" (typed), label2 "The Epithet" (bold),
  label2_t s (the epithet decodes in ~1 s BEFORE the narrator says it), enter_t s + enter_from left|right|top|bottom
  (slides in and settles in ~1.1 s; enter_dur), clip: true, title / text / stamp (documents)}]` — later items lie on
  top: list the hero and the late arrivals last. PAPERS SPEAK THE STORY'S LANGUAGE: give every doc / folder / telegram
  its own `title`, `stamp` and 2-4 short typed `text` lines (`|` = new line) in the language and the institutions of
  the file it is (a US Army file 1941: title "AIRCRAFT WARNING SERVICE", stamp "SECRET", text from the narration's
  facts and dates); <!--needs:!src:lib/v3/archive.js:papersLang-->left out, the engine types its German defaults (Akte, GEHEIM, Abschrift, Geheime Reichssache,
  TELEGRAMM, Protektorat filler) — right for a German file only<!--/needs--><!--needs:src:lib/v3/archive.js:papersLang-->left out, the engine types neutral English
  filler (FILE / CONFIDENTIAL / TELEGRAM); a German file (German texts or `lang: "de"`) gets Akte / GEHEIM<!--/needs-->. The insignia is a paratrooper's patch: airborne
  stories only. Give every item an `at` (without one it is auto-placed where it
  covers no face). ENTRANCES ARE FITTED TO THE CAMERA: the card waits, parked where this camera never sees it, and
  slides in along the desk; that needs desk outside the view on some side — the top-down framing below (the desk is
  larger than the frame) always has it. From a low oblique that sees the whole desk the card drops in from above the
  frame instead, and if even the air above is in view it simply lies there from the start (a warning says so). Never
  plan a beat on a slide-in from a wide oblique. `wood`
  walnut|oak|green_leather, `lamp` true|banker (a visible green lamp)|false, `clutter` 0..1, `dust` 0..1, `size`
  [2.0, 1.2]. The top is at y 0.76. Anchors `objects:N.item_K`, `.hero`. FRAMING (proven): lens 0.9-1.0 m from the
  hero, pitch 74-84 deg, fov 32, 7-9 items inside x +-0.45, z +-0.22 so paper fills the frame (fill the corners too:
  empty wood reads as a gap); focus the hero from t = 0 at f/8-11 (a rack across the desk draws the off-focus prints
  as stacked copies at draft sample counts). The clutter lies inside the pile round the hero (`clutter_at` {pen,
  magnifier, ashtray, coffee: [x, z]} to place it by hand: put the smoking ashtray in frame), the dust shows only over the
  lit desk.
```json
{"world":{"biome":"interior"},"look":{"time":"night","grade":"warm","dark":"pitch"},"objects":[{"kind":"archive.desk","at":[0,0],"wood":"walnut","clutter":0.8,"dust":0.6,"items":[{"kind":"map","src":"assets/map_protectorate.jpg","at":[0.16,-0.07],"rot":6,"w":0.52},{"kind":"doc","title":"Abschrift","at":[-0.02,0.21],"rot":-3,"w":0.21},{"src":"assets/mercedes_1942.jpg","at":[0.36,-0.17],"rot":9,"w":0.22},{"kind":"folder","title":"Akte H.","at":[-0.4,-0.19],"rot":-12,"w":0.32},{"src":"assets/heydrich_castle.jpg","at":[-0.34,0.11],"rot":-9,"w":0.16},{"kind":"insignia","at":[-0.2,0.205],"w":0.085},{"src":"assets/heydrich_portrait.jpg","at":[-0.06,-0.01],"rot":-4,"w":0.23,"label":"Reinhard Heydrich","label2":"The Butcher of Prague","label2_t":3.2,"clip":true},{"src":"assets/heydrich_frank.jpg","at":[0.27,0.15],"rot":7,"w":0.18,"enter_t":5,"enter_from":"right"}]}],"camera":{"move":"keys","strict":true,"limits":"macro","fov":32,"keys":[{"t":0,"pos":[-0.041,1.735,0.092],"look":[-0.03,0.76,-0.01]},{"t":8,"pos":[-0.024,1.635,0.269],"look":[-0.05,0.76,0.02]}],"focus":[{"t":0,"target":"objects:0.item_6","fstop":11}]}}
```
<!--/needs-->
<!--needs:archive.photo-->
- **archive.photo** — one print on its own (on a crate, a floor, a desk you built): `src`, `w` (0.18), `border`
  0..0.12, `curl`, `gloss`, `age` 0..1, `label`, `label2`, `label2_t`, `tilt` deg (0 = lying flat), `elev` (0.76 on a
  desk). For the dossier look use archive.desk.
<!--/needs-->
<!--needs:archive.wall-->
- **archive.wall** — the investigation wall: `board` cork|plaster|map (`map_src`), `size` [2.0, 1.2], `elev` 0.75,
  `items` [{src | kind, at: [x, y] m from the board centre, rot, w (prints 0.24-0.34), label, pin: red|white|blue}],
  RED STRING `strings` [[i, j] ...] drawn pin to pin from `strings_t` (one every 0.45 s), a warm lamp pool from the
  upper left (`lamp_angle` 27, `lamp_at`, `lamp_aim`). FRAMING: 1.5-1.8 m away at eye height (y 1.42), fov 40, a
  lateral truck ~1 m along the board while the strings draw; or 0.6-0.9 m, fov 30, following one string.
```json
{"world":{"biome":"interior"},"look":{"time":"night","grade":"warm","dark":"pitch"},"objects":[{"kind":"archive.wall","at":[0,0],"board":"cork","size":[2.0,1.2],"elev":0.75,"items":[{"src":"assets/heydrich_portrait.jpg","at":[-0.08,0.2],"w":0.3,"label":"Reinhard Heydrich"},{"src":"assets/gabcik.jpg","at":[-0.7,-0.08],"w":0.24,"label":"Jozef Gabčík","pin":"white"},{"src":"assets/kubis.jpg","at":[-0.38,-0.3],"w":0.24,"label":"Jan Kubiš","pin":"white"},{"kind":"map","src":"assets/map_protectorate.jpg","at":[0.52,0.22],"w":0.62}],"strings":[[1,0],[2,0],[0,3]],"strings_t":1}],"camera":{"move":"keys","strict":true,"limits":"eye","fov":40,"keys":[{"t":0,"pos":[-0.75,1.42,1.75],"look":[-0.25,1.33,0]},{"t":6,"pos":[0.35,1.42,1.5],"look":[0.12,1.33,0]}]}}
```
<!--/needs-->
<!--needs:archive.projector-->
- **archive.projector** — a 16 mm projector in a dark room playing a REAL newsreel (`src` sequence, `fps` 24) on a
  hanging sheet: reels turning, a visible BEAM with dust carrying the film's light, flicker, the screen's glow on walls
  and floor, `chairs` n empty bentwood chairs per row (`rows` 2) silhouetted against the picture. `screen_w` 2.6,
  `dist` 5.5, `elev` lens height 1.0, `rise` 0.45, `beam` 0..1, `dust` 0..1 (0.35), `flicker`, `screen`
  sheet|framed. Anchors `.lens`, `.screen`, `.projector`. FRAMING (proven): behind-left of the projector at y 1.3,
  0.9-1.4 m off the beam axis, fov 40, looking at the screen; push 0.9 m in 6 s so the projector slides out of frame.
  Cast may sit or stand IN the beam (`cast` with `action: "sit"` between the chairs and the screen): they catch the
  picture and throw their silhouette on the film. The camera never stands in the beam. Dim house sconces shape the room
  (`sconces: false`).
```json
{"world":{"biome":"interior"},"look":{"time":"night","grade":"neutral","dark":"pitch"},"objects":[{"kind":"archive.projector","at":[0,0],"src":"assets/newsreel_b/","fps":24,"screen_w":2.6,"dist":5.5,"elev":1.0,"rise":0.45,"beam":0.7,"dust":0.35,"flicker":0.5,"chairs":6}],"labels":[{"style":"strip","text":"Prague, June 1942","t_in":0.8}],"camera":{"move":"keys","strict":true,"limits":"eye","fov":40,"keys":[{"t":0,"pos":[-0.95,1.32,-1.4],"look":[0.35,1.28,5.5]},{"t":6,"pos":[-0.7,1.36,-0.55],"look":[0.3,1.3,5.5]}]}}
```
<!--/needs-->
<!--needs:archive.screen-->
- **archive.screen** — a screen / sheet glowing with a sequence (no projector) on the wall of a dark room (plank floor
  catching its light, `chairs` 4 per row x `rows` 2 empty chairs facing it, dim `sconces`; `room: false` = just the
  screen): `src`, `fps`, `w` 2.4, `elev`, `screen` sheet|framed, `flicker`; film it from 3-4 m, fov 40.
  **archive.tv** — a period CRT (`era` 1950s console | 1970s portable on a sideboard) playing a sequence (scanlines,
  curvature, glow, rolling bar) in a dark living room: papered wall, plank floor lit by the tube, a side table with a
  glowing table lamp (`lamp`, `lamp_side` left|right), a rug catching the tube's glow (`rug: false`), `glow` 1 (room
  light from the tube), `armchair: true` = an armchair from behind in the foreground (`armchair_x`, `armchair_dist` 1.3-1.7). `src`, `w` (screen 0.42), `elev`; from 2.1-2.6 m behind the armchair, a little
  above it (y 1.4-1.5, looking down at the set and the rug), fov 36, `limits: "macro"`, a slow push.
```json
{"world":{"biome":"interior"},"look":{"time":"night","grade":"neutral","dark":"pitch"},"objects":[{"kind":"archive.tv","at":[0,0],"src":"assets/newsreel_b/","fps":24,"start":24,"era":"1950s","w":0.44,"armchair":true,"armchair_x":0.32,"armchair_dist":1.25}],"camera":{"move":"keys","strict":true,"limits":"macro","fov":36,"keys":[{"t":0,"pos":[0.52,1.48,2.6],"look":[0.0,0.8,0.15]},{"t":5,"pos":[0.32,1.4,2.12],"look":[-0.06,0.8,0.15]}]}}
```
<!--/needs-->
<!--needs:archive.filmstrip-->
- **archive.filmstrip** — a 35 mm still-film strip (landscape frames, sprockets, amber base) snaking through the void,
  every frame a still of the sequence, scrolling: `src`, `length` 3, `scale` 8, `scroll` m/s, `path`
  wave|arc|[[x,y,z]...], `elev`. A chapter-break / memory device: 2-2.5 m away, fov 40, gliding along it.
<!--/needs-->
<!--needs:archive.float-->
- **archive.float** — a 2.5D parallax photo: one real photo cut into 2-4 depth layers floating in the void, edges
  feathered into the dark (`edge` feather|hard). ONLY WITH A DEPTH PNG: `depth` "src" = `<photo>.depth.png` next to
  it (white = near; + `<photo>.matte.png` for a clean cut). "auto" is a guess: on a busy photo (streets, rooms, trees,
  brick) it does not cut the content at all — two layers, a soft oval — so without a depth PNG prefer a desk print or
  the projector. In an open sky (no void) it becomes a lit print with a border. `src`, `w` 1.8, `elev` 1.5, `layers`, `sep` (w x 0.16),
  `drift`, `border`. FRAMING: the parallax IS the shot — 2-2.5 m away, fov 34, truck 1.2-1.5 m across it; stay within
  +-20 deg of its face (beyond that the layers read as cards).
```json
{"world":{"biome":"interior"},"look":{"time":"night","grade":"cold","dark":"pitch"},"objects":[{"kind":"archive.float","at":[0,0],"src":"assets/mercedes_1942.jpg","depth":"src","layers":2,"w":1.8,"elev":1.5,"drift":0.5}],"labels":[{"style":"strip","text":"May 27, 1942","t_in":0.8}],"camera":{"move":"keys","strict":true,"limits":"eye","fov":34,"keys":[{"t":0,"pos":[-0.85,1.56,2.45],"look":[-0.05,1.5,0]},{"t":6,"pos":[0.6,1.5,2.05],"look":[0.05,1.5,0]}]}}
```
<!--/needs-->
<!--needs:archive.relief-->
- **archive.relief** — NEVER for a historic B&W / sepia / faded photo (the founder's rule: no depth pop on old photos; use a flat archive.photo under the slit, or figure.bust). The real portrait as a low relief (the photo displaced by its depth) in a black void, a RED SLIT
  of light (deep-red glow, warm core) sliding across the face, dust glowing red where it crosses the band — fern's
  menace beat with the real likeness, no CG face. ONLY WITH A DEPTH PNG (`depth` "src": `<photo>.depth.png` +
  optional `<photo>.matte.png`); "auto" works only on a plain studio backdrop (a gentle bas-relief of the silhouette);
  on a busy photo it stays a flat print fading into the dark. The person fades into black at the outline (`rim_fade`
  0.1 of w) — no plane edge, no rim. `src`, `w` 0.7, `relief` 0.09, `elev` 1.55, `head` [u, v] face centre as image
  fractions (the slit crosses the face by default; `slit_sweep` [x0, x1] m, `slit_t` [t0, t1]), `key` slit|soft|none,
  `slit_color`, `slit_w`, `slit_soft`, `fill` 0.06, `haze` 0..1 (0.6), `soften`, `edge_dark`. It is meant to be
  pitch dark (the engine's too_dark flag is expected here).
  FRAMING: 1.5-1.6 m in front, the lens at the eyes' height, fov 30, a slow 10-20 deg arc; never closer than 1 m,
  never more than 25 deg off its face.
```json
{"world":{"biome":"interior"},"look":{"time":"night","grade":"neutral","dark":"pitch"},"objects":[{"kind":"archive.relief","at":[0,0],"src":"assets/heydrich_portrait.jpg","depth":"src","w":0.7,"relief":0.09,"elev":1.55,"slit_t":[0,6],"head":[0.57,0.245]}],"labels":[{"style":"strip","text":"Reinhard Heydrich","text2":"Deputy Reich Protector of Bohemia and Moravia","t_in":1.0}],"camera":{"move":"keys","strict":true,"limits":"eye","fov":30,"keys":[{"t":0,"pos":[-0.35,1.62,1.55],"look":[0.03,1.72,0]},{"t":6,"pos":[0.2,1.62,1.6],"look":[0.03,1.72,0]}]}}
```
<!--/needs-->
<!--needs:archive.frame-->
- **archive.frame** — a framed real photo (`frame` wood|gilt|steel, `mount` wall|desk, `w` 0.3, `elev`): on a wall it
  brings the papered wall and a brass picture light grazing it (`light`, `light_level`); on a desk give it `light:
  true` or keep the desk lamp in front of it (a lamp behind it leaves the photo in shadow). From 1.2-1.5 m, fov 36. **archive.paper_label** — a typed paper
  strip lying IN the set (`text`, `text2`, `h` cap height 0.012-0.016 m, `t_in` decode, `tilt`, `elev` 0.76): fern's
  dates on the desk.
<!--/needs-->
<!--needs:label.strip-->
- **label strip** (`"labels":[{"style":"strip", ...}]`) — fern's typewriter paper strip on screen: off-white torn paper,
  dark typed text that DECODES in (scrambled letters lock left to right in `decode` 0.45 s), a slight wobble. One line
  = the date stamp, centred low: `{"style":"strip","text":"December 29, 1941 | 2:24 AM","t_in":0.6}`. With `text2` =
  a lower third, lower left: `{"style":"strip","text":"Heinrich Himmler","text2":"Reichsführer-SS","t_in":0.4}`. Keys
  `t_in`, `t_out`, `screen` [x, y] fractions, `size` (cap height fraction 0.024), `font` courier (bold, default) |
  typewriter. A long `text2` wraps to <= 45 % of the frame width (keep it short anyway: a role, not a CV). Text lands
  ~1 s before the narrator says it; one strip per shot; never over a face, never over a print's own typed label (on a
  desk shot move it: `screen` [0.5, 0.12]); fact-check every date and title.
<!--/needs-->
<!--needs:archive.desk-->
DO: one motivated light per set (the lamp, the beam, the slit); slow pushes that turn; real photos named by the job;
label the hero print; slide a print in on the line that introduces it (top-down framing); the hero sharp from t = 0.
DON'T: show a print full screen (500-800 px scans: <= 40 % of the frame width); more than ~9 desk items; text over a
face; fast orbits or whips over a desk; wide apertures (f < 8) or racks across a desk; an evenly lit set (it reads as a
UI); a relief / float from a photo without a depth PNG; a film clip shorter than its shot.
<!--/needs-->
<!--needs:archive.desk+src:lib/human/crtscope.js:makeScopeFace-->
- **radar / oscilloscope screens** — `prop.build` with `preset: "radar_scope"` (an A-scope console: range scale, the
  transmitter's bang, grass and the TARGET SPIKE that grows in at `scope.blip_in` s and closes in by `scope.approach`
  per s — the SCR-270 screen) or `"radar_ppi"` (a round sweep with a phosphor trail, range rings, blips that flare as it
  passes: `scope.targets` [[range 0..1, bearing deg]], `scope.rpm`). The face is real moving graphics with a faint green
  spill on the operator; frame it 0.5-0.9 m from the lens so the trace reads. Never build a screen from `mat: "light"`
  parts (a light part glows in its own colour: a big one is a lamp, not a display).
<!--/needs-->
