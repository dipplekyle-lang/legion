<!--needs:move:freefall_follow-->
## 15. FPV camera (v3) — one-take FPV, fern grade
Six moves fly a real FPV drone: C2 paths (no micro-jerks at speed), eased speed (peak <= 1.5 x mean), and a roll that
comes ONLY from the lateral acceleration of the real path (a coordinated turn), clamped by `camera.bank_max` (18 default,
30 max). They run under FPV limits (roll <= 30, roll rate <= 75 deg/s, turn <= 140 deg/s, eased turns, clearance >= 1 m,
>= 2.5 m above 15 m/s, figures >= 0.8 m, speed <= 1.6 x clearance below 60 m) and are never lifted or slowed into a
crawl: an illegal FPV path is relaxed wider or reported (fix the spec). Riding a moving subject, speed is measured
RELATIVE to it (a 50 m/s fall reads 1-5 m/s). Moving targets (aircraft, a falling bomb) are tested as their real mesh
boxes, so 2-3 m passes are legal. `camera.profile: "fpv"` gives any older move (keys, fpv_flythrough, fpv_dive) these
limits + the physical bank; on `keys` the key POSITIONS are kept and joined C2, and the line is RE-TIMED on an even
arc-length speed under the 1.6 x clearance cap (the new key times are in the notes). It is never lifted and never
replaced by a flyover: a line too long for its time ends before its last keys (a warning names the duration it needs);
`camera.reshape: true` lifts its low stretches instead. QA also refuses an FPV shot whose subject is out of frame for
> 25 % of it (`subject_offscreen`) or whose designed speed peaks above 1.5 x its mean (`speed_profile`).
Taste (the founder + fern): at most ONE wow move (whip, crash zoom, pass-through) per 20-30 s; emotional lines get a held slow
shot instead; typical banks 8-18 deg (20-25 only in a real hard turn); FPV one-takes for the cold open; >= 2 moving
layers (the subject + clouds / snow / ground rushing / a second craft); never a lit close-up of a mannequin face (< 1 m).

Good camera distances (hero framing):
| subject | move | distance / offset | fov |
|---|---|---|---|
| one falling figure | freefall_follow | rel [2, -1.5, 5] (below, sky behind: fern T02); drift_in 1 + occlude frames 10 | 40-45 |
| two figures falling | freefall_follow | rel [3, -2, 10] | 42 |
| a falling figure over land | freefall_follow | rel [4, -1, 5], look_up -2 (beside, a touch below: horizon + rushing ground; entered at its chest) | 46 |
| bomber (22-32 m span) | chase | no offset, fill 0.6 -> ~32 m (the TRUE distance; the wings span 60 % of the width) | 45-50 |
| fighter (11 m span) | chase | offset [0, 2, 10] (10 m really) or fill 0.5 -> ~13 m | 50-55 |
| car / jeep at 15-25 m/s | chase | offset [0.6, 2.2, 7.5] (7.5 m behind on its road, ~3 m over it) | 55 |
| bomber overtaking the lens | proximity_pass | clearance 2-3 (auto: over / under the wing beside the fuselage), 8 m/s relative | 70-75 |
| tower / spire / church | proximity_pass | clearance 2-4 at 15-20 m/s (auto: beside the tower at 40-70 % of its height) | 70 |
| landmark 20-40 m | orbit_reveal | r 40 -> 24, 140-160 deg, rise 10-14, no az (it picks a clear arc ending on the town) | 45 |
| a figure in a hall | orbit_reveal | r 5 -> 2.4, 120-200 deg, rise 1.2 (dips round columns; relax tightens indoors) | 40 |
| bust / object in a void | orbit_reveal | r 3-5, deg 20-40 over 6 s, h0 0.3 (>= 1 m from any face) | 35-40 |
| village / church | fpv_line | 15-24 m up, >= 8 m from walls AND treetops, ~18 m/s (a 5 s line ~85-95 m) | 72-78 |
| aircraft cold open | cloud_tunnel | default (1.4 x its length behind, 0.42 of that below) | 42 |

- **freefall_follow** — falls WITH a falling target (para.jumper, a space.astronaut `float` with `drift: [0, -48, 0]`,
  prop.bomb, any flying item) at its world speed; the clouds / ground stream past (the parallax layer: give it a
  sky.cloud_layer, or fall low over land). It rides the subject's smoothed fall (a jumper's wobble shows in frame, it
  does not shake or bank the lens). `rel` [side, up, back] m in its frame (default [3, 1.5, 7]; up < 0 = below, looking
  up at it against the sky), `orbit` deg over the shot (<= 40), `drift_in` 0..1 (an EVEN approach, never a late lunge;
  **1 + transition.out {kind:"occlude", by:<target>, frames: 10} = it fills the lens on the last frames — the lens stops
  0.15 m from its real skin: the hidden cut**; with fewer frames the lens has to start farther away), `wobble` 0..1
  (0.35: slow life, +-3 deg roll), `aim` [x, y] (its screen spot in half-frame units), `look_up` deg (negative = down),
  `fov`. GROUND: if the fall reaches the ground inside the shot the camera FLARES (stops >= 30 m up, the subject drops
  away out of the bottom of the frame, fern C4); the notes print the impact time. prop.bomb currently falls TAIL-first
  (engine bug, lead) — prefer a jumper / astronaut as the hero until it is fixed.
<!--needs:para.jumper-->
```json
{"look":{"time":"night","moon":{"az":205,"el":34},"grade":"cold","exposure":1.25},"objects":[{"kind":"para.jumper","kit":"para_soe","at":[0,0],"y":1000,"phases":["freefall"],"exit_speed":42,"t_exit":-1.0,"wobble":1.0,"silhouette":0.7},{"kind":"para.jumper","kit":"para_soe","at":[3.5,-5.5],"y":1003,"phases":["freefall"],"exit_speed":42,"t_exit":-1.0,"silhouette":0.7,"seed":2}],"camera":{"move":"freefall_follow","target":"objects:0","rel":[1.8,-2.2,6.5],"orbit":15,"drift_in":1,"wobble":0.5,"look_up":10,"aim":[-0.2,0.12],"fov":42},"transition":{"out":{"kind":"occlude","by":"objects:0","frames":6}},"dur":4}
```
<!--/needs-->
<!--needs:!para.jumper-->
```json
{"objects":[{"kind":"space.astronaut","at":[0,0],"y":360,"action":"float","drift":[0.6,-48,0.3],"tumble":0,"heading":30,"visor":"dark"}],"structures":[{"kind":"town.village_europe_1940","at":[-380,-220],"size":"medium"}],"camera":{"move":"freefall_follow","target":"objects:0","rel":[4,-1,5],"orbit":25,"drift_in":1,"wobble":0.4,"look_up":-2,"fov":46},"transition":{"out":{"kind":"occlude","by":"objects:0","frames":10}},"dur":4}
```
<!--/needs-->
<!--/needs-->
<!--needs:move:chase-->
- **chase** — rides the target's own PAST TRACK: the camera is where the subject was `back` metres ago (by arc length
  on its low-passed track), so it drives the same road / flies the same line and takes the same corners a beat later,
  banking with them. `offset` [side, up, back] m — **back is the TRUE camera-subject distance**; without offset it is
  fitted so the subject spans `fill` (0.5) of the frame width (bomber ~32-40 m, fighter ~13 m, car >= 6 m). `lag_s` is
  only reported (back / speed). A car at speed keeps the lens >= 2.9 m over its road. `weave` m (slow sideways drift),
  `close` 0.12 (fraction of back closed over the shot), `lead` m, `look_h`, `bank_max` (16-20 car, 20-25 aircraft turn),
  `track_sigma` (0.5 s; relax raises it and lowers the bank, it never lengthens the chase), `fov` 50. Give the target a
  curved `path` so the bank shows. 3-8 s.
```json
{"objects":[{"kind":"aircraft.bomber_ww2","at":[0,60],"action":"fly","alt":140,"speed":65,"path":[[0,60],[0,-120],[80,-300],[260,-420]]}],"camera":{"move":"chase","target":"objects:0","fill":0.62,"bank_max":24,"fov":48,"zoom":[{"t":2.8,"fov":38,"dur":0.35,"ease":"snap"}]},"dur":4}
```
```json
{"world":{"biome":"farmland","features":[{"type":"road","points":[[0,40],[0,10],[12,-25],[45,-55],[95,-75],[170,-85]],"width":6,"surface":"paved"}]},"objects":[{"kind":"vehicle.car_1960","at":[0,40],"action":"drive","speed":20,"path":[[0,40],[0,10],[12,-25],[45,-55],[95,-75],[170,-85]]}],"camera":{"move":"chase","target":"objects:0","offset":[0.6,2.2,7.5],"bank_max":16,"fov":55},"dur":5}
```
<!--/needs-->
<!--needs:move:proximity_pass-->
- **proximity_pass** — skims a target's real mesh boxes at `clearance` m (2.5; 1.5-4 reads fast and safe). A MOVING
  target overtakes the drone (default `dir` back, 8 m/s relative): the camera starts beside its middle looking down at
  the wing, the tail passes ~1 s in, it pulls away AHEAD of the lens, in frame to the end. A still target (tower, spire,
  hull at anchor) or `dir: "forward"` is passed with the closest point late (pass_at 0.8: it is ahead, in frame, for most
  of the shot). The lens keeps the subject in frame (turns toward its bulk, up to `keep_dev` 75 deg off the flight). A
  tower or spire (also a tower on a church) is passed BESIDE it at 40-70 % of its height, the closest point at the tower.
  `along` length (nose axis for craft) | span, `side` left | right (the item's own) | over | under, `height` m above its
  base, `bulge` m (the U carve: one bank direction), `glance` 0..1, `fov` 70. 2.5-4 s.
```json
{"objects":[{"kind":"aircraft.bomber_ww2","at":[0,0],"action":"fly","alt":300,"heading":0,"speed":65}],"camera":{"move":"proximity_pass","target":"objects:0","side":"left","clearance":2.5,"fov":72},"dur":4}
```
<!--/needs-->
<!--needs:move:orbit_reveal-->
- **orbit_reveal** — spiral orbit: `r0` -> `r1` m (default 2.2 x size + 2 -> 0.62 x r0), `deg` (120, <= 300; side left =
  the other way), `rise` m (0.3 x r0), `h0` m above its centre, `look_h`, `aim`, `fov` 45. Leave `az` out: it is chosen
  among 24 so the arc stays clear of columns / walls / trees and ENDS facing the structure behind the target (a town,
  not empty snow). The radius dips smoothly toward free space near a solid; inside an interior.* room relax tightens
  (never widens). The lean is <= 3 deg (bank_max asks more); a path too fast for its height is raised as a whole.
```json
{"structures":[{"kind":"landmark.church","at":[0,0],"heading":20},{"kind":"town.village_europe_1940","at":[0,130],"size":"small","snow":0.9}],"camera":{"move":"orbit_reveal","target":"structures:0","r0":40,"r1":24,"deg":140,"rise":8,"look_h":5,"fov":45},"dur":5.5}
```
<!--/needs-->
<!--needs:move:fpv_line-->
- **fpv_line** — the director's flown line through `via` waypoints (C2): [x, y, z] | [x, z] (+`alt` m, default 3) |
  "<ref>" (its centre when the camera passes) | {target, offset: [right, up, forward]}. `frame: "<ref>"` = the line rides
  that moving item: via are [right, up, forward] in its frame or its anchor names ("hatch", "tail", "nose") — under the
  tail, into the hatch, out with the jumpers. `speed` m/s (cruise; default fits the line to the shot at an even speed
  <= 1.45 x its mean and <= 1.6 x clearance over roofs AND treetops), `reshape` (default: a line that cannot be flown in
  its time at its heights gets its LOW stretches lifted as one smooth field so every waypoint is reached — reported;
  `false` keeps the heights and ends early with a warning), `ease_in` 0.7, `look_ahead` s (0.35: looks into its turns),
  `look_at` "<ref>" + `look_w` 0..1, `tilt` deg (-4), `bank_max`, `fov` 72. Design it for its speed: 5 s at ~18 m/s is
  ~90 m; >= 15 m up, >= 8 m from walls and treetops (a line through a conifer crown is legal only at 2-5 m/s). 3-8 s.
```json
{"structures":[{"kind":"landmark.church","at":[0,0],"heading":20},{"kind":"town.village_europe_1940","at":[0,130],"size":"small"}],"camera":{"move":"fpv_line","via":[[-62,16,-14],[-38,15,-12],[-20,15.5,-11],[-4,18,-20],[14,23,-34]],"look_at":"structures:0","look_w":0.4,"bank_max":18,"fov":74,"whip":[{"t":3.6,"to":"structures:1","dur":0.35}]},"dur":4.5}
```
<!--/needs-->
<!--needs:move:cloud_tunnel-->
- **cloud_tunnel** — fern's cold-open reveal on an aircraft: starts `length` m behind it (1.4 x its nose-tail length,
  >= 35) and `below` m under it, swings in from the `side` (banks ~10-15 deg, levels), emerges under the tail and closes
  on it, levelling the horizon over the last 30 %; with transition.out {kind:"occlude", by:<target>} it flies UP INTO THE
  REAR BELLY (the dark underside fills the lens on the last frames, 0.08-0.15 m from the real skin, at the first station
  10-50 % of the length from the tail where the skin is closed AND every frustum ray of the last frame meets skin: the
  hidden cut to the hold interior). A Halifax at speed 0 with the deck's wind = -airspeed works too. With a sky.cloud_layer in the
  scene the start drops inside the deck; pair it with the layer's `tunnel: {follow: "<target>", t: [0, 1.5]}` (the notes
  print the exact one). `fov` 42. 2.5-3.5 s; the date strip enters at ~0.5 s.
<!--needs:aircraft.halifax+sky.cloud_layer-->
```json
{"look":{"time":"night","moon":{"az":195,"el":24},"grade":"cold"},"objects":[{"kind":"aircraft.halifax","at":[0,0],"heading":180,"speed":0,"y":1300,"exhaust":1},{"kind":"sky.cloud_layer","base":850,"top":1950,"coverage":0.85,"density":1.3,"gaps":0.2,"tunnel":{"follow":"objects:0","radius":55,"fog":0.4,"t":[0.6,8]},"wind":[0,-62]}],"camera":{"move":"cloud_tunnel","target":"objects:0"},"transition":{"out":{"kind":"occlude","by":"objects:0","frames":5}},"dur":3}
```
<!--/needs-->
<!--needs:!aircraft.halifax-->
```json
{"objects":[{"kind":"aircraft.bomber_ww2","at":[0,0],"action":"fly","alt":600,"heading":0,"speed":65}],"camera":{"move":"cloud_tunnel","target":"objects:0"},"transition":{"out":{"kind":"occlude","by":"objects:0","frames":5}},"dur":3.5}
```
<!--/needs-->
<!--/needs-->
<!--needs:move:freefall_follow-->
- **camera.whip** [{t, yaw: +-60..180 deg (+ = right) | **to: "<ref>"** (the yaw and pitch that LAND the view on that
  item at the end of the whip — use it, a hand-guessed yaw lands on empty snow), dur 0.15-0.35 s (0.35 for > 120 deg:
  shorter smears into ghost copies; a big whip renders 12 sub-frames), back: false, pitch}] (any move, max 2): a smear
  pan used as an in-shot cut (t = its start; the view stays turned unless back), a 4-8 deg lean into it. Aim it at
  something (a whip onto empty snow is a dead frame). **camera.zoom** [{t, fov, dur 0.12-1 s, ease: smooth | snap,
  land 0..1}]: a crash / snap zoom held after (snap = most of it in the first third, a tiny settle on landing). Both are
  declared: QA measures the base path and the frame check skips their windows. One per shot, rare.
- **transition.out {kind: "occlude", by: "<ref|objects:N>", frames 3..10}**: the lens may enter THAT object's margin in
  the last `frames` frames only (QA exception scoped to it); the FPV moves end 0.15 m from its real skin (a ray-cast), so
  the last frame is the subject filling the lens, never its see-through inside. Use it with freefall_follow drift_in 1,
  cloud_tunnel, or keys / fpv_line ending at a hull, a helmet, a tree trunk. The next shot starts at matching brightness.
Do: fly FPV over / past something with depth (trees, roofs, a wing, clouds); keep the subject in frame (overtaken passes,
chase 0.3-0.6 s behind on its track); vary the side; 3-5 s per FPV shot. Don't: a constant roll on a straight line; bank_max above 25
outside a hard turn; FPV moves under 2.5 s; two wow moves in one shot; a proximity pass at clearance < 1.2 m; fpv_line
waypoints inside buildings (QA reports `inside`); a falling camera over an empty sky (nothing streams past = no speed).
<!--/needs-->
