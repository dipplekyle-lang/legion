## FILM. THE NOCTURNE FILMMAKER'S COOKBOOK — 41 devices this engine renders (use them by id: "device": "D7")
Taken from the hand-made Anthropoid sample (sample/board.json, the founder: "extremely good") and fern's technique catalogue.
[tested] = rendered as written in the sample or a kit; [compose] = tested parts combined (keep the numbers). Every
recipe is a fragment of a scene spec: add id, dur, scale, beat, shows, layers, device; adapt positions to your words.
Sets change every <= 2 shots (R5); a device is a WAY OF SHOWING, the subject still comes from the words.

### A. Openings and one-takes (the cold open is ONE dated moment in action)
<!--needs:sky.cloud_layer+move:cloud_tunnel-->
- D1 DATED FPV COLD OPEN [tested kit + s1] — the first shot: the craft out of the cloud, the date typed in at 0.5 s, the
  lens flies INTO it (hidden cut). 2.6-3.5 s. `{"look":{"time":"night","sky":"clear","moon":{"az":195,"el":24},"haze":0.3,"grade":"nocturne"},"world":{"biome":"ocean"},"objects":[{"kind":"aircraft.bomber_ww2","at":[0,0],"action":"fly","alt":600,"heading":0,"speed":65}],"labels":[{"style":"strip","text":"<Month D, YYYY | H:MM AM>","t_in":0.5,"t_out":2.6,"screen":[0.5,0.14]}],"camera":{"move":"cloud_tunnel","target":"objects:0"},"transition":{"out":{"kind":"occlude","by":"objects:0","frames":5}}}`
  — the whiteout opening and the streaming deck come from section 19's Halifax frame (the craft still at y 1300, the
  deck's `wind` = the airspeed, `fog_in` 0.12 -> 0.95 s, `tunnel` following it, deck top >= 1200 m above it), the most
  exact cold open this engine has (sample s1). Any craft, any era; a ship or a car opens with D3 / D36 instead.
<!--/needs-->
- D2 THE HIDDEN CUT [tested s1->s2, s3] — a shot ends on its subject filling the lens, the next starts on the other side
  at matching brightness (inside the hull, in the fall, behind the helmet): `"transition":{"out":{"kind":"occlude","by":"objects:0","frames":5}}`
  (freefall_follow with `drift_in` 1 and frames 8-10; keys ending 0.15 m from a hull / helmet / trunk). Joins 2-3 shots
  into ONE TAKE ("power": "one_take"). A hidden cut still counts as a cut.
<!--needs:move:chase-->
- D3 THE CHASE OVER THE DECK [tested 4 Oct, film/devtest prev1] — the attackers / the car / the boat seen from behind on their own track, the
  bank from the turn: `{"objects":[{"kind":"aircraft.fighter_ww2","at":[0,60],"action":"fly","alt":160,"speed":75,"path":[[0,60],[0,-140],[90,-320],[260,-430]]},{"kind":"aircraft.fighter_ww2","at":[-35,95],"action":"fly","alt":175,"speed":75,"path":[[-35,95],[-35,-105],[55,-285],[225,-395]]},{"kind":"sky.cloud_layer","base":40,"top":120,"coverage":0.7,"density":1.0,"gaps":0.35,"scale":260,"streaks":0.3}],"camera":{"move":"chase","target":"objects:0","offset":[0,2,12],"bank_max":22,"fov":52}}`
  3-4 s; a formation = 3-5 craft 30-60 m apart on parallel paths; over the sea at dawn: `world` ocean, `time` dawn.
<!--/needs-->
<!--needs:move:proximity_pass-->
- D4 THE OVERTAKING PASS [tested kit] — the machine roars past the lens 2.5 m off and pulls away ahead (a wow):
  `{"objects":[{"kind":"aircraft.bomber_ww2","at":[0,0],"action":"fly","alt":300,"heading":0,"speed":65}],"camera":{"move":"proximity_pass","target":"objects:0","side":"left","clearance":2.5,"fov":72}}` 2.5-3.5 s;
  a tower or a mast is passed beside it at 40-70 % of its height.
<!--/needs-->
<!--needs:move:freefall_follow+para.stick-->
- D5 FALL WITH THEM [tested s3] — `para.stick` n 2 at y 1046, phases ["freefall"], `t_exit` -1.0 / -1.35, silhouette
  0.75 + a thin deck under them + the craft flying on above; `"camera":{"move":"freefall_follow","target":"objects:0.jumper_0","rel":[2.0,1.4,6.5],"orbit":8,"drift_in":0.4,"wobble":0.45,"look_up":13,"aim":[-0.2,0],"fov":46,"bank_max":5}` 2.5 s.
- D6 CANOPIES BLOOM [tested s5] — phases ["freefall","deploy","descent"], t_deploy 0.35 / 0.7, the camera falling past
  them (keys whose y drops ~10 m per 0.27 s, braking) or `freefall_follow` on `objects:0.rig_0` rel [3,-2.5,10],
  look_up 10, fov 46. 1.7-2.8 s. A landing / "below them their homeland": D5 over land with the village 300 m ahead.
<!--/needs-->
<!--needs:move:fpv_line-->
- D7 THE PLACE FROM THE AIR, ONE LINE [tested kit] — FPV over the town / harbour / camp at 15-24 m, >= 8 m off roofs and
  treetops, ~18 m/s, the line ending on the landmark with a whip onto it (the wow): `"camera":{"move":"fpv_line","via":[[-62,16,-14],[-38,15,-12],[-20,15.5,-11],[-4,18,-20],[14,23,-34]],"look_at":"structures:0","look_w":0.4,"bank_max":18,"fov":74,"whip":[{"t":3.6,"to":"structures:1","dur":0.35}]}` 4-4.5 s.
<!--/needs-->
<!--needs:move:orbit_reveal-->
- D8 ORBIT REVEAL [tested kit] — a spiral round the landmark / the lone figure / the parked vehicle that ENDS facing
  the place behind it: `"camera":{"move":"orbit_reveal","target":"structures:0","r0":40,"r1":24,"deg":140,"rise":8,"look_h":5,"fov":45}`
  (a figure: r0 5 -> 2.4, deg 120-200, rise 1.2, fov 40). 3-5 s.
<!--/needs-->

### B. Light and staging (one motivated light in the dark)
- D9 SILHOUETTES AGAINST THE SKY [tested 4 Oct, film/devtest prev5] — the named people as dark cut-outs against a bright
  dawn / dusk sky: the sun BEHIND them just over the horizon, flat ground, and a LOW lens (0.5 m, `limits` "macro" — "eye"
  lifts the camera to 1.3 m and the figures drop below the horizon onto dark ground) looking up past them:
  `{"look":{"time":"dawn","sun":{"az":180,"el":4},"grade":"nocturne","haze":0.6,"fog":0.08,"exposure":0.95},"world":{"biome":"plains","relief":0.05,"vegetation":0.2},"cast":[{"ref":"a","at":[0,0],"heading":180,"action":"watch"},{"ref":"b","at":[1.1,0.4],"heading":190,"action":"point"}],"objects":[{"kind":"light.rig","subject":"ref:a","key":false,"rim":{"color":"moon","intensity":50,"az":150,"el":26,"dist":2.4,"angle":22,"aim":"chest"},"rim_side":"left"},{"kind":"fog.volume","shape":"layer","at":[0,-20],"h":2.2,"density":0.2,"noise":0.9,"drift":[0.35,0.02,0],"scale":1.3,"glow":0.06}],"camera":{"move":"keys","limits":"macro","target":"ref:a","keys":[{"t":0,"pos":[1.3,0.5,4.4],"look":[0.4,1.35,0],"fov":38},{"t":3,"pos":[0.5,0.55,3.8],"look":[0.4,1.4,0],"fov":38}]}}`
  (the sun's az = the direction the lens looks; clouds glowing behind them). At NIGHT a silhouette needs snow / haze / a
  glow BEHIND it in frame — against a night sky the figures are lost (tested: too_dark).
- D10 THE PASSING LIGHT [tested kit] — a still room comes alive: venetian stripes from a window + a passing car's
  headlights raking the wall and the seated man's shadow (`light.spot` cookie blinds + a second tungsten blinds spot
  with `sweep` {"from_m":-2.6,"to_m":2.2,"t":[0.8,3.0]} and keys 0 -> 1 -> 0). The decision-maker at his desk, the
  officer on the phone, the clerk at night. interior.office (or stage.void floor matte as a dark room) + a lamp. 3 s.
- D11 THE PRACTICAL ON THE WORD [tested s2] — a light that changes AT the word: `light.practical` jump red -> green
  (`t_switch`), a bulb `flicker` 0.3 for doubt, a lamp or a window going dark (`keys` [{t, i}] 1 -> 0) for a death,
  a lit window coming on for "they knew".
- D12 THE SEARCHLIGHT IN THE SNOW [tested s7] — restraint for death and loss: an empty place (rails, a fence, a quay, a
  field), one beam sweeping slowly through falling snow / ash, mist layer drifting, NO people, eye-level push down
  the lines: `{"kind":"light.spot","at":[-13.5,-52],"y":9.2,"target":[0,0.3,-18],"color":"moon","intensity":600,"angle":5,"penumbra":0.3,"cookie":"none","beam":1.0,"dust":0.6,"haze":0.9,"range":95,"sweep":{"from_m":-9,"to_m":7,"t":[0,3.6]}}`
  + `"weather":{"snow":0.8,"wind":0.15}` (ash or rain where it never snowed). 3-3.6 s.
- D13 LIGHT CARRIES THE CUT [tested s2->s3] — the shot ends as its light blows out (the hatch, the flash of a gun, the
  void's glow keyed to full) and the next opens from that brightness: `"transition":{"out":{"kind":"flash","dur":0.2}}`
  + the next shot's `{"in":{"kind":"flash","dur":0.2}}`. Or a burn at the end of an era (both sides 0.4 s).
- D14 THE WEATHER LAYER [tested s4, s7] — every exterior has its moving air: `weather` snow 0.2-0.4 / rain / ash /
  dust where the story had it, else a drifting `fog.volume` layer or haze; NEVER snow where it did not snow (Hawaii,
  the desert, summer). Cloud decks stream (`wind`), the sea moves (`weather.wind` 0.35).

### C. Evidence: the real world inside the 3D (real photos only from PHOTOS, never invented)
<!--needs:archive.desk-->
- D15 THE DOSSIER, ONCE [tested s6] — 3-3.5 s, top-down macro push, the hero print labelled, the epithet decoding ~1 s
  before it is said, the next fact's print sliding in, a smoking ashtray, dust in the lamp; papers with their own text
  (R8): `{"world":{"biome":"interior"},"look":{"time":"night","grade":"dossier","dark":"pitch"},"objects":[{"kind":"archive.desk","at":[0,0],"wood":"walnut","lamp":true,"clutter":0.8,"dust":0.6,"items":[{"kind":"folder","title":"<FILE OF ...>","stamp":"<SECRET>","at":[-0.4,-0.19],"rot":-12,"w":0.32},{"kind":"doc","title":"<the institution>","stamp":"<CONFIDENTIAL>","text":"<fact 1>|<fact 2>|<date>","at":[-0.02,0.21],"rot":-3,"w":0.21},{"kind":"telegram","title":"<TELEGRAM>","text":"<WORDS STOP>|<WORDS STOP>","at":[0.45,0.1],"rot":11,"w":0.18},{"photo":"<id>","at":[0.36,-0.17],"rot":9,"w":0.22},{"photo":"<hero id>","at":[-0.06,-0.01],"rot":-4,"w":0.23,"label":"<Name>","label2":"<The Epithet>","label2_t":1.1,"clip":true},{"photo":"<id>","at":[0.27,0.15],"rot":7,"w":0.18,"enter_t":1.6,"enter_from":"right"}],"clutter_at":{"ashtray":[0.15,-0.2]}}],"camera":{"move":"keys","strict":true,"limits":"macro","fov":32,"keys":[{"t":0,"pos":[-0.046,1.742,0.08],"look":[-0.03,0.76,-0.012]},{"t":3.3,"pos":[-0.03,1.66,0.19],"look":[-0.046,0.76,0.012]}],"focus":[{"t":0,"target":"objects:0.item_4","fstop":11}]}}`
- D16 THE DESK FLY-OVER, a chapter intro, once a film [tested 4 Oct, film/devtest prev1: the map item dominates — keep
  it small] — a grazing line 0.18-0.25 m over the papers (never
  lower: the macro limit is 0.15 m), across the map's edge and between the prints, rising to 1.6 m to reveal the whole
  dossier: keys y 0.95 -> 1.0 -> 1.6, pitch -25 -> -80 deg, fov 40 -> 32, `limits` macro, 3 s.
<!--/needs-->
<!--needs:archive.wall-->
- D17 THE INVESTIGATION WALL [tested kit] — who knew whom, the chain of command, the warning passed up and dropped:
  real prints pinned, RED STRINGS drawing pin to pin (`strings` [[1,0],[2,0]], `strings_t` 0.6), a lateral truck of 1 m
  at eye height (y 1.42, fov 40). 3-3.5 s. Papers on it follow R8.
<!--/needs-->
<!--needs:archive.frame-->
- D18 THE PORTRAIT IN HIS OWN ROOM [compose kit] — the real photo framed on the wall of a dark office / hall with a brass
  picture light grazing it (`archive.frame` frame wood, mount wall, light true), the camera pushing in from 1.5 m, fov
  36; a figure's silhouette may pass in front (the moving layer). 2.5-3 s.
<!--/needs-->
<!--needs:archive.relief-->
- D19 THE RED SLIT ON THE REAL FACE [tested s8] — ONLY for a modern colour portrait (HISTORIC PHOTOS ARE FLAT (the founder's rule): a B&W / sepia / faded / pre-1990 photo is NEVER an archive.relief or archive.float (no depth pop on old photos) — show it as a flat print (archive.photo / desk / wall / frame) under the slit or the lamp; the red-slit void face is figure.bust (the sample's way).) — menace only, 4-6 s: `archive.relief` from a PHOTOS print marked for depth,
  `slit_t` over the shot, red dust; the people coming for him rise behind in blue rims on the silence after the line
  (stage.void `rise` + `light.rig` fade); keys at 1.5-1.7 m, fov 30, a 10-20 deg arc. No depth print: D20.
<!--/needs-->
<!--needs:figure.bust+stage.void-->
- D20 THE BUST IN THE SLIT [tested COOKBOOK 12 D] — the faceless bust by his kit, the slit `light.spot` across the face,
  fog drifting, the heroes rising — the full recipe is section 12 D. Menace only.
<!--/needs-->
<!--needs:archive.projector-->
- D41 THE NEWSREEL INSIDE THE 3D [tested 5 Oct, film/f2eng j5] — when FILMS lists a real newsreel shot of the line's
  OWN person or event, the 3D PLAYS IT in a world (the real film is the proof, R9 — it beats any lit mannequin or a desk):
  (a) THE WORLD WATCHING: `{"kind":"archive.tv","at":[0,0],"newsreel":"<id>","era":"1950s","w":0.44,"lamp":true,
  "armchair":true,"armchair_x":0.32,"armchair_dist":1.25}` in `"world":{"biome":"interior"}`, `"look":{"time":"night",
  "dark":"pitch"}` + grade nocturne (a cold blue room, the B&W picture glowing) or interior_warm (the lamp-lit 1950s living
  room), camera keys [0.52, 1.48, 2.6] -> [0.32, 1.4, 2.12], look [0, 0.8, 0.15], fov 36, limits macro, strict;
  (b) THE SCREENING: `{"kind":"archive.projector","at":[0,0],"newsreel":"<id>","screen_w":2.6,"dist":5.5,"elev":1.0,
  "rise":0.45,"beam":0.7,"dust":0.35,"flicker":0.5,"chairs":6}`, keys [-0.95, 1.32, -1.4] -> [-0.75, 1.35, -0.8], look
  [0.35, 1.28, 5.5], fov 40, limits eye: the beam with dust, the real film on the sheet, the empty chairs;
  (c) the screen glowing in a dark hall (`archive.screen`). Only `"newsreel": "<id>"` from FILMS (never a src you write);
  the shot no longer than the newsreel's seconds (longer holds its last frame); each newsreel ONCE in the film.
  Without FILMS never (a missing sequence renders a grey "no signal" card).
- D46 THE NEWSREEL BURST [tested 5 Oct, film/f2eng j11] — the sample's archival burst, made from a FILMS newsreel when
  the video has no real clip of its own for the line: the real film FULL FRAME for 1.5-2 s (the shortest shot; scratches, dust, the
  gate's flicker) on the named person / event, a negative flash on each side (D30). Recipe:
  `{"world":{"biome":"interior"},"look":{"time":"night","grade":"archive_bw","dark":"pitch"},"objects":[{"kind":
  "archive.screen","at":[0,0],"newsreel":"<id>","w":2.4,"elev":0.8,"screen":"sheet","flicker":0.4}],"camera":{"move":
  "keys","strict":true,"limits":"macro","fov":40,"keys":[{"t":0,"pos":[0,1.47,1.75],"look":[0,1.47,0]},{"t":1.6,
  "pos":[0,1.47,1.62],"look":[0,1.47,0]}]},"transition":{"in":{"kind":"negative","dur":0.15}}}` (the screen faces +z:
  the lens on the +z side; the slow push is the projector's breath). Grade archive_bw (never nocturne: a blue
  newsreel reads as 3D). Two bursts back to back on one line = the sample's stutter. Each newsreel once: as a burst
  (D46) OR in a world (D41).
<!--/needs-->

### D. Data made physical (a number is never a desk)
<!--needs:label.strip-->
- D21 THE NUMBER THAT HURTS, TYPED OVER A QUIET IMAGE [tested 4 Oct, film/devtest prev2] — never a desk: the 3D holds a
  restrained image (D12 the empty place, D22 the ranks, the far silhouette of the burning ship) and ONE strip decodes the
  number ~1 s before it is said, HIGH in the frame (the captions own the bottom): `"labels":[{"style":"strip","text":"2,403 AMERICANS KILLED","t_in":0.6,"screen":[0.5,0.14]}]`. 2.5-3.5 s. Once a film.
<!--/needs-->
- D22 THE COUNT AS RANKS [tested 4 Oct, film/devtest prev1: reads as a dark block; keep the crane low] — "1,177 men", "2,400 dead", "six of them": figures in ranks at a
  true fraction of the count (`"groups":[{"kind":"figure.<era kit>","count":160,"formation":"square","ranks":8,"size":[40,18],"action":"stand","heading":180}]`,
  standing still in mist, faceless silhouettes), a slow crane up from eye level until the ranks fill the frame; a strip with the number. For the dead
  the ranks stand in snow / ash at night, grade nocturne — restraint, no bodies. 3-3.5 s.
<!--needs:label.strip-->
- D23 THE TIME THAT PASSES [tested strip] — NOT a clock insert in this look (detail.wall_clock / watch under the nocturne
  grade: the dial washes out soft, three tries, film/devtest): the same place twice with the time typed on each —
  `"labels":[{"style":"strip","text":"7:02 AM","t_in":0.4,"screen":[0.5,0.14]}]` on the first image, "7:48 AM" on the
  return (D28 / D38), or the light moving across the place (D27 time compression with the moon / the sun's shadow).
<!--/needs-->
<!--needs:marker.route-->
- D24 THE ROUTE ON THE LAND, a map you fly into [tested 4 Oct, film/devtest prev2] — the real terrain from 300-600 m (the island, the coast, the
  border), `marker.route` / `marker.arrow` drawing itself in red (`color` "#C8322A", `t` [0.2, 1.6], and `"look":{"keep_hue":"red"}` — without it the nocturne
  grade turns the line white; tested 4 Oct) and a `marker.pin` on the
  target (`t` [0.8, 9]), a `crane_down` or `flyover_high` that dives toward the pin; <= 3 s (R3), then cut INTO the place (D7 / D8).
<!--/needs-->

### E. Time (once a minute, never decoration)
- D25 FREEZE-AND-ORBIT [tested COOKBOOK 10] — the instant stops while the camera keeps moving: `"clock":{"offset":<world s>,"freeze_at":0.9}`
  + an `orbit_reveal` (deg 30-40) or a keys arc round the frozen event (the bomb under the wing, the canopy half open,
  the blast front). 2.5-3.5 s. Once a film (a wow).
- D26 THE SPEED RAMP INTO THE IMPACT [compose] — `"clock":{"keys":[{"t":0,"rate":1},{"t":1.0,"rate":0.2},{"t":2.0,"rate":0.2},{"t":2.6,"rate":1}]}`
  round an fx.explosion `t` (slow motion into it, back to speed after). 2.6-3 s.
- D27 TIME COMPRESSION [tested COOKBOOK 10] — `"clock":{"rate":30}` with a locked-off wide and a 5 % lens creep: the
  fleet crossing the ocean, the night wheeling over the waiting place, the queue moving; a strip with the time span.
- D28 THEN / NOW [tested COOKBOOK 10] — the same camera on the same place at two times joined by a dissolve (out of the
  first, in of the second) or a hard match cut: the harbour at rest -> the harbour burning. Once a film.

### F. Cuts and camera tools (the editor's devices)
- D29 MATCH CUT 3D <-> ARCHIVE [compose] — the 3D shot next to a real burst ENDS on the motion, direction or shape of
  the real clip's first frame (the 3D canopy falling -> real parachutes; aircraft banking left -> real aircraft banking
  left; marching boots -> the real march; the scope's glow -> the real scope); write "match": "<the real image>" in its
  beat. The opposite side too: the 3D after the burst starts on the same shape.
- D30 THE NEGATIVE PIVOT [tested] — `"transition":{"in":{"kind":"negative","dur":0.15}}` on ONE side of a hard turn (the
  heroes -> the antagonist, a name, a death); <= 1 per 20 s; never where a moment meets real footage (Legion flashes
  those joins itself).
- D31 WHIP ONTO THE TRUTH [tested kit] — `"whip":[{"t":1.6,"to":"objects:2","dur":0.3}]` in the camera: from the calm
  harbour onto the incoming formation, from the operators onto the scope. A wow: <= 1 per 20-30 s.
- D32 CRASH ZOOM ON THE WORD [tested kit] — `"zoom":[{"t":1.2,"fov":28,"dur":0.3,"ease":"snap","land":0.3}]` at the
  stressed word ("It is not American"). A wow.
- D33 RACK-FOCUS REVEAL [tested COOKBOOK 8b] — `"focus":[{"t":0,"target":"<near thing>","fstop":2},{"t":1.0,"target":"<the person / the far thing>","fstop":2,"pull":0.6}]`:
  the phone -> the officer; the window -> the ships beyond. Never across a desk (stacked copies).
- D34 THE REALIZATION (dolly zoom) [tested COOKBOOK 6] — `"dolly_zoom":{"t":[0.3,2.6],"fov":24,"target":"<the person>"}`
  on the line where someone understands too late. Once a film.
- D35 WIPE BY A FOREGROUND [tested s1-s3] — a wing, a helmet, a truck, a tree trunk crosses the lens at the end (keys ending
  at it + occlude by it): the hidden cut between two places.
- D36 THE LOW SKIM [tested 4 Oct, film/devtest prev3] — low over the water toward a CLOSE subject (speed comes from
  passing near something big, never from a far horizon): the ship 110-150 m ahead, the lens 7 m over the sea at <= 0.8 x
  its height per second, the hull a black silhouette against the dawn: `{"look":{"time":"dawn","sky":"clear","haze":0.45,"grade":"nocturne"},"world":{"biome":"ocean"},"weather":{"wind":0.35},"objects":[{"kind":"ship.warship","at":[-30,-150],"heading":90}],"camera":{"move":"keys","target":"objects:0","keys":[{"t":0,"pos":[-60,7,-40],"look":[-30,9,-150],"fov":45},{"t":3,"pos":[-52,7.5,-58],"look":[-30,10,-150],"fov":45}]}}`
  (a far ship 400 m+ away does not move in the frame: tested static). 3 s.

### G. Endings and titles
<!--needs:stage.void-->
- D37 THE TYPED TITLE IN THE RED VOID [tested s9] — the last image or the title card: `{"world":{"biome":"interior"},"look":{"time":"night","grade":"void_red","dark":"pitch"},"objects":[{"kind":"stage.void","floor":"none","haze":0.2,"glow":[{"color":"#3a0806","r":2.2,"intensity":0.35,"at":[0,-3],"backdrop":true,"y":1.5,"keys":[{"t":0,"i":0},{"t":0.4,"i":1},{"t":2.2,"i":0.6}]}]}],"labels":[{"style":"strip","text":"<OPERATION / THE NAME>","t_in":0.3,"decode":0.9,"screen":[0.5,0.5],"size":0.05}],"camera":{"move":"keys","strict":true,"limits":"eye","fov":35,"keys":[{"t":0,"pos":[0,1.5,3.0],"look":[0,1.5,0]},{"t":2.2,"pos":[0,1.5,2.6],"look":[0,1.5,0]}]}}` 2-2.5 s.
<!--/needs-->
- D38 THE RETURN — the ending answers the opening: the same place, the same camera line or the same motif, changed (the
  blip on the scope now over a burning harbour; the bomber's cloud now empty at dawn). Plan it in the treatment.
- D39 THE MOTIF — 1 image planted early, returning 2-3 times changed (the blip, the clock, the empty chair, a light in a
  window): name it in the treatment's motifs and in each shot's beat.
- D40 THE BREATH — after the hardest line one held, moving image of 3-4 s with no new information (the empty sea at
  dawn, snow on the rails, the cloud deck streaming) before the next act.

### H. Worlds to cut between (R5: never 3 in a row in one set)
Sky (craft in a cloud deck, the formation over the sea), sea (ships as dawn silhouettes, the low skim), the land from
the air (fpv_line, orbit_reveal, the route), the hill / the shore / the street at eye level (silhouettes, D9), a real
room (interior.* with its window and lamp, D10), the hold / the cockpit / the van seen from inside, the desk (once),
the wall, the frame, the void (menace only), the title. Real film between them. A story with no aircraft still flies:
the drone line over the town, the chase behind the car, the skim over the water, the crane down the facade.

### I. The story's machines (the catalog's own kind — never a ship, an aircraft or a vehicle built from prop.build)
A carrier, a bomber, a battleship, a tank built from prop.build boxes reads as a toy (the rejected Doolittle round 1:
a box island on a slab, cylinder-and-disc B-25s). When the catalog has the machine, the machine is that kind.
<!--needs:ship.carrier-->
- D42 THE CARRIER AND HER DECK [tested 5 Oct, film/f1eng j1-j3] — `ship.carrier` (USS Hornet CV-8, April 1942) at
  [0, 0] with `"heading": 180` = its own frame IS the world: the flight deck at y 16.8, the two white guide lines at
  x 2.7 (nose wheel) and 5.8, the lead B-25's main wheels at z -24, the bow end at z 123, the stern at -119, the island on
  the starboard edge x -13.7..-7.6, z -6..30. `deck_load` 15 + the lead = the sixteen. Target an anchor
  ("objects:0.lead", "objects:0.bow", "objects:0.island", "objects:0.deck_bow") so the QA measures what you frame.
  Cameras on the deck: `pitch` <= 0.5 and the lens >= 1.6 m above the planks (the deck rises with the pitch); `pitch`
  2-3 (the gale) only for cameras >= 30 m away. Tested frames:
  (a) BEHIND THE LEAD, down the white lines to the bow and the grey sea, the island on the right, insignia on the wings:
  `{"objects":[{"kind":"ship.carrier","at":[0,0],"heading":180,"deck_load":15,"pitch":0.5,"crew":8}],"camera":{"move":"keys","target":"objects:0.lead","keys":[{"t":0,"pos":[7.7,20.6,-39],"look":[2.7,19.3,16],"fov":46},{"t":3,"pos":[7.2,20.5,-36.5],"look":[2.7,19.3,16],"fov":46}]}}`
  (b) THE LAUNCH (a wow): the lead rolls away down the deck and lifts off over the bow — `"launch": 0.3, "launch_dur": 6`
  on the carrier, the lens low behind it: keys [3.7, 20.4, -40] -> [3.5, 20.6, -35], look [2.7, 19.4, 6] -> [2.7, 20, 46],
  fov 44, 4 s (seen from the island: keys at [-11.5, 27.8, 34], look ahead down the deck, launch -3).
  (c) THE LEAD BOMBER CLOSE (who climbs in): `"hatch": true, "crew": 4` — keys [-5.8, 18.7, -12] -> [-4.8, 18.7, -13.5],
  look [2.7, 19.4, -22], fov 44: the glazed nose, the canopy, a spinning prop disc, the ladder under the hatch.
  (d) THE WHOLE DECK LOAD from the bow end looking aft: keys [6, 22.3, 95] -> [5, 23.3, 88], look [0, 18.8, -40], fov 42.
  (e) FROM THE SEA: `"action":"sail","speed":11,"pitch":2.5` — the low skim abeam (keys [40, 9, -60] -> [38, 9, 10],
  look [0, 12, 60] -> [0, 13, 150], fov 48) or the aerial from the stern quarter ([90, 95, -200] -> [75, 85, -160]).
  (f) THE EMPTY DECK (the ending): `"deck_load": 0, "lead": false`, the sun breaking through: `"time":"morning","sky":"scattered","sun":{"az":170,"el":18}`, the lens on
  the white lines: keys [2.7, 20, -30] -> [2.7, 20.2, -26], look [2.7, 18.8, 120].
  STORM LIGHT THAT READS [tested 5 Oct, film/f1eng j8]: `"look":{"time":"dawn","sky":"scattered","sun":{"az":180,"el":5},
  "haze":0.4,"grade":"nocturne"}` + `"weather":{"rain":0.15,"wind":0.55}` with the lens looking toward +Z (the bow):
  the sun low AHEAD of the lens = the B-25 tails, the island, the deck crew and the lifting bomber black against a
  torn bright sky, the white lines catching it. (The sun's az ~ the direction the lens looks: 180 = toward +Z,
  0 = toward -Z; keep the disc 20-30 deg off the lens axis or behind the island / a hull — in frame it blooms into a
  white blob, tested j9.) Flat `"sky":"overcast"` = a grey wash where the hull and the bombers are lost (run 2) — never;
  never moonlight at 8:20 AM. The ending (f) is the same light higher: `"time":"morning","sun":{"az":170,"el":18}`.
  THE COLD OPEN on her [tested j9]: a LOW aerial from her stern quarter into that light — keys [60, 45, -270] ->
  [42, 30, -200], look [0, 18, 40], fov 42, `pitch` 2.5, sun az 205 el 5, the date strip typing in at 0.5 s: the
  carrier with her deck load against the bright sea — or (a) on the deck.
  TRAPS seen in the Doolittle run (5 Oct): `"action":"sail"` moves her 11 m/s along +Z — keys written for the bow
  within ~60 m of her end inside the hull (a black wall): close shots keep her `idle` (her swell and `pitch` keep her
  alive); `sail` only from >= 150 m away or with keys that travel with her (+11 m per second in z). The storm opening
  is never inside the cloud for more than 0.5 s (a grey frame, the carrier a ghost): the lens UNDER a cloud base at
  260 m (`sky.cloud_layer` base 260, top 700, coverage 0.8), dropping toward her stern quarter — keys [90, 140, -230]
  -> [70, 70, -160], look [0, 14, 20], fov 44 (tested: hazy — the LOW aerial above reads better). A dolly zoom / push down the deck keeps the
  lens 3.5 m above the planks and >= 6 m clear of the lead's tail fins (x -0.7..6.1, z -29.6..-31.3) — the camera
  QA refuses a lens inside a fin. PEOPLE ON THE DECK stand on her deck points and ride with her: cast / groups
  `"on": "objects:0.deck_hatch"` (the man who climbs in: beside the hatch ladder), deck_lead, deck_island, deck_officer
  (the launch officer near the bow), deck_port, deck_aft, bridge_wing — never a cast `at` on the deck (it stays on the sea).
<!--/needs-->
<!--needs:aircraft.b25-->
- D43 THE B-25 IN FLIGHT AND ON THE GROUND [tested 5 Oct, film/f1eng j1-j2] — `aircraft.b25` (B-25B Mitchell: gull
  wing, twin fins, glazed nose, the 1942 star-with-red-dot): the CHASE low over the sea
  `{"objects":[{"kind":"aircraft.b25","at":[0,0],"heading":180,"action":"fly","alt":25,"speed":70,"path":[[0,0],[0,400],[60,800]]},{"kind":"aircraft.b25","at":[30,-40],"heading":180,"action":"fly","alt":32,"speed":70,"path":[[30,-40],[30,360],[90,760]]}],"camera":{"move":"chase","target":"objects:0","offset":[-4,3,18],"bank_max":15,"fov":52}}`
  (the formation: 2-3 on parallel paths 30 m apart); AT NIGHT over a cloud deck: alt 420 over `sky.cloud_layer` base
  300 / top 380, the moon behind, offset [-6, 3, 20]; the bailout (D5) beside a b25 flying on above the jumpers;
  PARKED on its wheels: `"action":"idle","alt":0,"hatch":true,"props":"still"` (a lone bomber on a dark airfield — the
  one that landed near Vladivostok). The lens may come to ~2.5 m of the airframe (it is its own solid). A bomber
  "alone over the ocean" is still a subject: <= 120 m behind it with fov 35 (3.5 % of the frame reads as a speck);
  a crash on a ridge is the b25 `idle` on the slope (alt 0) with fx.explosion 300 kg at its nose, never a bare ridge.
<!--/needs-->
<!--needs:aircraft.u2-->
- D44 THE U-2 AT 70,000 FEET AND THE SHOOT-DOWN [tested 5 Oct, film/f2eng j2-j6] — `aircraft.u2` (Lockheed U-2C, CIA,
  Powers, 1 May 1960: long slim unmarked fuselage, bubble canopy with the pressure helmet, glider wing, swept fin). The
  altitude world: `"world":{"biome":"snowfield","relief":0}` + `{"kind":"sky.cloud_layer","base":900,"top":1600,
  "coverage":0.75,"gaps":0.25}` (the deck far below = the height), the plane `"alt":21000,"heading":90,"speed":210`
  (relief 0: the plane's height IS 21000 + 1.35). Fly WITH her — never 2-key `keys` on a 210 m/s plane (the eased
  glide lags it and she leaves the frame):
  (a) THE CHASE (the long wings over the cloud deck): `"camera":{"move":"chase","target":"objects:0","offset":[-7,2.5,30],
  "fov":40}`, sun low ahead (dawn, sun az ~ the heading + 15, el 4);
  (b) THE PASS UNDER THE WING (a wow): `{"move":"proximity_pass","target":"objects:0","side":"under","clearance":3,
  "fov":52}` (or side left, clearance 4: the wing sweeps over the lens and she slides away);
  (c) THE SHOOT-DOWN: `"hit":1.5` on the u2 (the SA-2 climbs on its white trail from 2.6 s before, bursts ~12 m aft of
  the tail: flash, a dark flak cloud, debris; the tail goes, the nose drops, the outer wings fold up and tear off, she
  tumbles) filmed riding with her — chase offset [-30, 4, 45] (behind-beside) or [-60, -10, 14] (beside-below), fov 42-44,
  4 s; a world-fixed camera loses her in 0.5 s;
  (d) THE COCKPIT: the plane `"action":"idle"` at alt 21000 (gear up by itself), keys ~3.5 m off the canopy
  ([8.3, 21002.55, -2.9] -> [7.2, 21002.45, -2.5], look [4.7, 21002.1, 0], fov 38 for heading 90): the helmet in the
  bubble, the intake, the wing running out of frame;
  (e) PARKED (Peshawar / Badaber at dawn): `"alt":0,"action":"idle"` on `"world":{"biome":"desert","relief":0}` — the
  pogo wheels under the long wings, the lens low at 3/4 front ~24 m off.
  `contrail: true` reads from below (the white line across the dark sky), never in a chase (the lens inside the trail).
<!--/needs-->
<!--needs:landmark.glienicke-->
- D45 THE BRIDGE AND THE LINE [tested 5 Oct, film/f2eng j7] — `landmark.glienicke` (the Glienicke Bridge, 10 Feb 1962)
  FIRST in objects at [0, 0], heading 0: the bridge runs along z (-64..64), the road x -8..8, the deck at y 7, the white
  line at z 0 (`line_at`); everything after it stands on the deck by its `at` (cars, people). World
  `{"biome":"open_sea","relief":0}` = the Havel; dawn + fog 0.25-0.3. Tested frames:
  (a) THE SILHOUETTE from the river (the camel-back trusses against the dawn): keys [-110, 11, -30] -> [-104, 11.5, -24],
  look [0, 10, 0], fov 40, the sun ahead of the lens but off-axis (az ~ 60-70 for this line, el 3);
  (b) THE WALK TO THE LINE on the deck between the trusses and the lanterns: keys [2.2, 8.5, -40] -> [2.0, 8.6, -36],
  look [0, 8, 10], fov 42; the men: one figure each side (`figure.1950s_casual` count 1, `action` walk, speed 1.2,
  `path` from z -34 / +34 to z -2 / +2) or cast walking toward the line; cars (`vehicle.car_1960` idle) at z -56 and +56;
  (c) THE AERIAL down onto the line: keys [40, 48, -95] -> [16, 26, -40], look [0, 7, 0], fov 44.
  Never a camera under the deck (the deck is ground: the lens below it reads as underground), never the bridge from
  prop.build trusses.
<!--/needs-->
