<!--needs:para.jumper|figure.bust|action:cast:freefall-->
## 17. People of 1941-42 (v3 WP5): paratroopers, the SS officer, the coats, the bust
Mannequins stay faceless: who a figure is reads from its SILHOUETTE (helmet, peaked cap, fedora, pack, coat) and from
real archival photos (archive.*), never from a face. Never a lit close-up of a mannequin head under 1 m; at 1-3 m keep
the head in a rim light, under a brim or in a slit. Night, one motivated light and haze carry the realism (fern).
<!--/needs-->
<!--needs:action:cast:freefall-->
- **Kits** (cast def `kit`): `para_soe` (SOE / Czechoslovak paratrooper 1941: rimless para helmet, Denison camouflage
  smock, X-type harness + canvas pack with the static line; `pack: false` drops it; accessories `reserve`, `sten`,
  `pistol`), `ss_officer` (high-fronted peaked cap, open-collar black tunic, collar tabs, white shirt + tie, silver
  shoulder boards, Sam Browne + holster, breeches, riding boots; no symbols; field grey with `colors: {coat: "#5E6154",
  trousers: "#5A5D52"}`), `civil_coat_1940s` (double-breasted overcoat + a 1940s fedora with a pinched crown and snap
  brim; `variant: "collar_up"` = the assassins, `"belted"`; `gloves: true`). One cast def per person, every scene.
- **Actions** (eye level 3-5 m, `camera.limits: "eye"`): `freefall` (static-line fall: upright, feet first, legs
  together, hands on the harness), `tumble` (`spin` rev/s), `hang` (hands up on the risers, `look` down|up|ahead),
  `sit_bench` (`seat_h` m; `back` m = the seat is that far BEHIND `at`: use 0.3 with a prop bench, or the placement
  check moves him off it), `hatch_sit` (on the rim, legs down the hole: `at` 7 cm back from the rim on the floor, facing the hole),
  `hatch_jump` (pushes off, slides over the hole, straightens DOWN through it, hidden after `drop` m),
  `aim_pistol_2h` (the pistol out in both hands at eye height, `fire: [t]` = recoil + flash; give him `pistol`).
  `elev` m lifts any of them above the surface he stands on (0 on a prop floor or deck: the engine already stands
  him on it; elev is for a floor that is not a solid). In the air use para.jumper, not a cast action.
```json
{"cast":[{"ref":"gabcik","at":[0,0],"heading":180,"action":"sit_bench","params":{"seat_h":0.425,"back":0.3}},{"ref":"kubis_civ","at":[1.7,-1.6],"heading":233,"action":"aim_pistol_2h","params":{"fire":[1.6]}}],"objects":[{"kind":"prop.build","at":[0,-0.3],"parts":[{"shape":"box","size":[1.6,0.05,0.38],"pos":[0,0.4,0],"mat":"wood"},{"shape":"box","size":[0.05,0.38,0.34],"pos":[-0.7,0.19,0],"mat":"wood"},{"shape":"box","size":[0.05,0.38,0.34],"pos":[0.7,0.19,0],"mat":"wood"}]}],"camera":{"move":"keys","limits":"eye","strict":true,"keys":[{"t":0,"pos":[2.7,1.45,3.4],"look":[0.6,0.9,-0.6],"fov":40},{"t":4,"pos":[2.3,1.45,3.6],"look":[0.6,0.9,-0.6],"fov":40}]}}
```
<!--/needs-->
<!--needs:para.jumper-->
- **para.jumper** — one paratrooper through `phases` exit -> freefall -> deploy -> descent -> landing (the FIRST
  phase listed is where the shot starts: `["descent"]` = under the open canopy at t 0). `ref` or `kit`, `at` [x, z] +
  `y` (absolute height; a 3-element `at` loses its y in the registry) or `alt`, `heading` (the aircraft's), `exit_speed`
  45, `t_exit`, `t_deploy` (line stretch: static line ~1 s after the exit; fern holds 3-4 s of free fall), `open`
  0.6-0.9 s (eased: bag -> streamer -> the crown fills -> the dome, 1.05 overshoot; never cut on a half-open canopy),
  `fall_speed` 53, `descent` 5.5, `drift` [vx, vz] (the canopy lies down downwind after the landing), `sway`,
  `silhouette` 0..1 (0.7 = fern's dark cut-outs on a night sky; the faceless head goes dark too), `canopy` {color
  olive|white|khaki, diameter 8.5}. Landing: the knees give, the hands come down the risers, the empty canopy sinks
  (apex first), tips over DOWNWIND in ~1.5 s and lies on the terrain behind him (set `drift` AWAY from the lens).
  Targets: `objects:N` (free fall: his chest; under the canopy: the middle of the rig), `objects:N.canopy`,
  `objects:N.rig` (his chest, sliding up to the rig middle once the canopy opens).
- **Follow cameras (WP1)**: FREE FALL = `{"move":"freefall_follow","target":"objects:N","rel":[3,-2,10],"orbit":15,
  "drift_in":0.5,"wobble":0.5,"look_up":12,"fov":42}` + `sky.cloud_layer` + `look.grade: nocturne` = fern 0:06.
  A DEPLOY INSIDE A FOLLOW SHOT: `target: "objects:N.rig"`, `rel: [4, -3, 16]` (back >= 16 m: the opened rig is 10 m tall), `look_up` 4-6.
  ON A para.stick ALWAYS NAME THE JUMPER: `target: "objects:N.jumper_0"` (or `rig_0`); `objects:N` alone frames the
  whole stick as one box and the lead leaves the frame.
- **para.stick** — `n` jumpers `spacing` s apart (each its own canopy), `jumpers: [{ref, t_exit, t_deploy, descent,
  at, y}]` (give t_deploy + descent per jumper for exact tracks), anchors `jumper_N` / `canopy_N` / `rig_N`.
  **para.canopy** — a canopy alone: `state` open | streamer | deploy | collapsed, `load` container (a supply drop).
  `collapsed` LIES ON THE GROUND (they buried the parachutes): the riser links at `at`, the crumpled cloth 5-10 m
  downwind (`drift`, else `heading`) following the terrain, the lines over the snow, the wind lifting it slowly; frame
  it 6-12 m away at eye level (a figure kneeling by the links) or from above. Templates (orbit, ...) frame the canopy.
- Fall from the exit (exit_speed 42): 1 s 5 m down / 28 m forward, 2 s 19 / 39, 3 s 42 / 43, 4 s 72 / 45, 5 s 108 / 46
  (then +45 m per s down, no forward). After a static-line deploy at 1 s: 2 s 17 m, 3 s 24 m, then 5.5 m/s.
- Cameras (keys whose y follows the fall, or WP1 freefall_follow): FREE FALL 6-8 m from the lead drifting in to 4 m,
  below and beside him (looking up 15-25 deg), fov 40, the 2nd jumper 15-20 m off. DEPLOY FROM BELOW 20-30 m out, the
  camera falling 38 -> 14 m/s while they brake, the view tilting 27 -> 47 deg up: the canopies rise through the frame
  (3 s). DESCENT 20-25 m out, 7 m below, sinking at `descent`, a 20-30 deg orbit (the parallax layer), fov 46. LANDING at eye level 14 m out, fov 46: the whole rig first, tilt down with him (look height 10.5 -> 5 by 1.8 s), hold man + canopy while it goes down behind him. FROM ABOVE (fern 0:15) 15 m
  out and 15 m over the apex, sinking with them, the domes over a dark forest. Never closer than 3 m. Looks: the air
  in day-for-night (`time: overcast, grade: cold, exposure: 0.6`) + silhouette 0.7; the land and the from-above shot
  at night (moon). Two moving layers come free: the snow streaks past the falling lens; add a cloud layer (sky.*).
```json
{"look":{"time":"overcast","sky":"overcast","grade":"cold","exposure":0.6,"haze":0.4},"weather":{"snow":0.35},"world":{"biome":"snowfield"},"objects":[{"kind":"para.stick","at":[0,0],"y":300,"heading":0,"phases":["descent","landing"],"drift":[0.8,0.3],"sway":0.9,"silhouette":0.7,"jumpers":[{"ref":"gabcik","descent":5.4,"at":[0,0],"y":300},{"ref":"kubis","descent":5.6,"at":[8,-13],"y":305}]}],"camera":{"move":"keys","strict":true,"target":"objects:0","keys":[{"t":0,"pos":[18.6,292.5,9.9],"look":[2.0,305.4,-3.25],"fov":46},{"t":2,"pos":[21.2,281.8,8.1],"look":[3.6,294.7,-2.65],"fov":46},{"t":4,"pos":[23.6,270.9,6.3],"look":[5.2,283.6,-2.05],"fov":46}]}}
```
<!--/needs-->
<!--needs:figure.bust-->
- **figure.bust** — a faceless portrait bust cut from a dressed figure: `kit` ss_officer | `ref`, `material`
  plaster | bronze | marble | painted | dark, `mount` plinth (`plinth_h`) | floating (`float_h` = the cut height),
  `cut` chest | waist | m, `turn`, `chin`; `light` {slit: colour, slit_w 0.055, slit_x 0.034 (over one eye), slit_i,
  rim: colour, rim_i, rim_h (0.25 shoulders | 0.78 cap + head outline), key}; `void: true` = black void, pitch dark;
  `flank` {refs | kit civil_coat_1940s, t_in, fade 0.8, dist 2.4, spread 1-1.45, rim_i 30} = the assassins fading up
  behind him in blue rims with a dark-blue floor glow. (For the cold open's judgement beat use COOKBOOK 12 D — the bust on a stage.void with a light.spot slit: render-tested brighter than this built-in light at 2.4-2.7 m.) THE FERN VOID BEAT (0:34): painted + slit + faint red rim +
  flank at the beat after the line; eye-level camera 1.8 -> 1.55 m (>= 1.2 m from the bust), fov 27, a slow push on a
  slight arc (>= 0.08 m/s: the QA wants motion at both ends) that quickens once they appear. Under a mono grade
  (WP3 `void_blue`, `nocturne`, `archive_bw`) the slit stays red by itself (it registers as a keep_hue light); any other
  red in the frame needs `look.keep_hue: "#ff2a14"`. `headwear: "none"` = bare-headed like the fern bust; the SS cap's
  badge is a plain oval (`variant: "eagle"` for the eagle). Museum / dossier busts: `void: true` + `light.key` with
  `key_sweep` deg (the key travels round the bust) + a cold `rim` at `rim_h` 0.75 + `dust` 0.4-0.6 (motes in the key's
  beam); never on an empty daylight plain.
```json
{"look":{"time":"night","sky":"clear","dark":"pitch"},"objects":[{"kind":"figure.bust","at":[0,0],"heading":180,"ref":"heydrich","material":"painted","mount":"floating","float_h":0.95,"cut":"chest","chin":5,"light":{"slit":"#ff2a14","rim":"#ff3010","rim_i":2},"void":true,"flank":{"refs":["gabcik_civ","kubis_civ"],"t_in":1.6,"fade":0.8,"dist":2.6,"spread":1.05}}],"camera":{"move":"keys","limits":"eye","strict":true,"target":"objects:0","keys":[{"t":0,"pos":[0.2,1.63,1.8],"look":[0,1.6,-0.4],"fov":27},{"t":1.6,"pos":[0.07,1.63,1.71],"look":[0,1.6,-0.4],"fov":27},{"t":4,"pos":[-0.16,1.63,1.55],"look":[0,1.6,-0.4],"fov":27}]}}
```
- Do: low key, one motivated light, the silhouette (cap peak, collar, shoulders, the fedora brim) against a rim; air
  shots with the camera falling WITH them; bust shots static or a slow push. Don't: light a blank face frontally, push
  closer than 1.5 m, put a bust in daylight next to living figures (it reads as a statue), let a canopy pop open on a
  cut, fly a free-fall camera that does not fall (the jumper drops out of frame in a second), target a whole
  para.stick with a follow camera, let the landing drift blow the canopy toward the lens.
<!--/needs-->
