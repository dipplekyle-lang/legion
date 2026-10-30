<!--needs:town.bohemian_village|landmark.prague_castle|town.prague_1942|vehicle.mercedes_320|vehicle.tram_prague-->
## 18. Places of the Protectorate 1942 (v3 WP6): the Bohemian village, Prague, the staff car
Real places at TRUE scale, lit by what was really there: the moon on snow, a few blackout windows, a gas lamp, the
low sun down a street. Fern's trick is the light, not the polygon count: night + one motivated light + haze. Film a
place as a PLACE first (wide, slow, something moving: smoke, snowfall, a tram, the car, birds), then go in. Never fly
the lens into a facade, through a roof or into a tree crown; keep 2 m+ off walls (`limits: "eye"` allows 1.3 m eye
height for street-level keys; every keys camera must move >= 0.1 m/s at both ends or QA calls it still).
<!--/needs-->
<!--needs:town.bohemian_village-->
- **town.bohemian_village** — a Czech village round its long green: gable-fronted farmhouses with yard walls and
  arched gates, barns behind, a white baroque church on the green (west tower, clock, belfry openings that glow warm
  behind louvres at night, an onion helmet with a lit lantern), a frozen pond with drifted snow, bare lindens holding
  snow on their twigs, rutted snow roads, chimney smoke. `at` (centre of the green), `heading` (green's long axis,
  default 90), `size` tiny|small|medium|large (green half-length 40|60|85|110 m), `snow` 0..1.2 (roofs), `lit` warm
  windows (blackout, default 5; keep <= 8), `tower_glow` 0..1 (0.6), `smoke` 0..1, `church_side` east|west,
  `trees`, `pond`, `seed`. Targets `structures:N.belfry` (the lit bell chamber), `.church_top`, `.onion`, `.door`,
  `.church`, `.green`, `.pond`. For `heading` 90 and size small the tower stands at ~[12, 0] (belfry 18.6 m, cross
  37 m). Night: `look.time "night"`, `moon` el 20-30, `weather.snow` 0.2-0.4 (falling snow = a moving layer),
  `exposure` ~0.7 (snow at night is not daylight), grade `nocturne` (fern blue; `cold` before the v3 merge).
  Camera: establish 150-200 m out, 50-60 m up; the glide ends 45-55 m from the tower at 20 m, looking at y 24 so the
  helmet and cross stay in frame (fov 40); 10 s for ~140 m (13 m/s peak).
```json
{"look":{"time":"night","sky":"clear","moon":{"az":215,"el":24},"haze":0.35,"fog":0.12,"grade":"nocturne","exposure":0.72},"weather":{"snow":0.3,"wind":0.2},"world":{"biome":"snowfield","relief":0.25,"clear":[[0,0,150]]},"structures":[{"kind":"town.bohemian_village","at":[0,0],"heading":90,"size":"small","lit":7,"seed":3}],"camera":{"move":"keys","target":"structures:0.belfry","fov":40,"keys":[{"t":0,"pos":[-150,58,96],"look":[0,8,0]},{"t":10,"pos":[-36,20,29],"look":[12,24,0]}]}}
```
<!--/needs-->
<!--needs:landmark.prague_castle-->
- **landmark.prague_castle** — Hradcany on its ridge across the Vltava: the long palace front, St Vitus behind it
  (the great south tower with its copper helmet ~99 m, the west spires, verdigris roofs, flying buttresses), the
  Old Royal Palace roof, St George's towers, the Black Tower, garden trees on the slope, the Lesser Town (houses with
  window rows, a few lit at dusk) and St Nicholas' dome + bell tower below. TRUE scale (~680 m wide, 150 m to the
  spire tip). `at` (top of the ridge, palace front), `heading` (the way the front faces = toward the river and the
  camera, default 180 = +z), `hill` 52, `lit` 0..1 windows at dusk/night (1942 blackout 0.05-0.08), `floodlight`
  (modern Prague only), `lesser_town`, `snow`, `scale`. Targets `.south_tower`, `.cathedral`, `.spires`, `.palace`,
  `.front`, `.st_nicholas`, `.hill_foot`. Put a river `world.features` ~430 m in front and the camera on the far bank
  (z 620-660 for heading 180): dusk across the water with the reflections, fov 24-30 on the south tower, a 5-6 %
  push-in or a slow drift (QA wants >= 4 deg turn or >= 5 % distance change), birds (`creature.bird_flock`) as the
  moving layer. Keep 550 m+ away: nearer than ~450 m the Lesser Town reads as blocks. Never fly into it.
```json
{"look":{"time":"dusk","sky":"scattered","haze":0.45,"fog":0.15},"world":{"biome":"plains","relief":0.08,"clear":[[0,0,360],[0,640,120]],"features":[{"type":"river","points":[[-2600,440],[0,430],[2600,430]],"width":230,"depth":3}]},"structures":[{"kind":"landmark.prague_castle","at":[0,0],"heading":180,"lit":0.07}],"objects":[{"kind":"creature.bird_flock","at":[-40,330],"action":"circle","count":30,"altitude":60,"radius":60}],"camera":{"move":"keys","target":"structures:0.south_tower","fov":26,"keys":[{"t":0,"pos":[-75,15,660],"look":[-6,66,0]},{"t":8,"pos":[-48,16,624],"look":[0,68,0]}]}}
```
<!--/needs-->
<!--needs:town.prague_1942-->
- **town.prague_1942** — a Prague street c.1900-45: a canyon of 4-6 storey baroque / neo-renaissance / art-nouveau
  houses (stucco in ochre, cream, grey, salmon; window surrounds, pediments, cornices, mansards, shop fronts with
  sign boards), granite setts, slab pavements on kerbs, a double tram track with overhead wires on span wires, gas
  lamps (lit at dusk: light pools + `lamp_lights` real lights), cross streets, and both ends CLOSED by a cross street
  and a row of houses (a shot down the street ends in facades; `close: false` opts out). `at` (middle), `heading`
  (90), `length` (200), `bend` deg or `preset: "holesovice"` (the attack curve: sharp bend, iron railing on stone
  posts, trees inside), `storeys`, `tram`, `trams` 0..3 (background trams), `lamps` true|false|dim, `lit` (0.15),
  `shops_lit`, `wet`, `snow`, `cross`, `seed`. Geometry for heading 90 at [0, 0]: the street runs along x from
  -length/2, the right lane (eastbound) is z +3.85, the tracks z +-1.55, pavements z +-6.0..9.9 (facades at +-9.9).
  Targets `.street`, `.start`, `.end`, `.bend`, `.lamp_N`. Eye level on the pavement 1.6 m with `limits: "eye"`,
  fov 40-46. Night: `exposure` ~0.6, `lamps: "dim"`, `lit` 0.1, `wet` 0.6 (blackout 1942; the default exposure
  makes the pale stucco glow).
```json
{"look":{"time":"night","sky":"overcast","haze":0.4,"fog":0.12,"grade":"nocturne","exposure":0.6},"structures":[{"kind":"town.prague_1942","id":"prg","at":[0,0],"heading":90,"length":200,"wet":0.6,"lit":0.1,"lamps":"dim","seed":7}],"objects":[{"kind":"vehicle.tram_prague","road":"prg","action":"drive","speed":6,"track":1,"dir":-1,"from":130}],"camera":{"move":"keys","target":"structures:0","limits":"eye","fov":44,"keys":[{"t":0,"pos":[-40,1.7,-6.5],"look":[10,3,-1]},{"t":5,"pos":[-36,1.7,-6.5],"look":[14,3,-1]}]}}
```
<!--/needs-->
<!--needs:vehicle.mercedes_320-->
- **vehicle.mercedes_320** — the open staff car (Mercedes 320 Cabriolet B, Heydrich's car): long louvred bonnet,
  upright chrome radiator with the star, deep sweeping wings into running boards, chrome bowl headlamps on the wings
  with blackout slits, red leather, folded top, whitewall tyres with chrome hubs, spare on the sloping tail, two small
  fender flags (flutter with speed), faceless riders in peaked caps (`riders` 0..4, default 2: driver + officer; or
  `[{ref}]` cast defs). `action` idle|drive, `speed` m/s (9-14 in town), `road: "<town.prague_1942 id>"` + `lane`
  right|left, `dir` 1|-1, `from`/`to` m along the street (idle + road = parked at `from`), `start` (s, from rest),
  `stop: true`; or a `path`. `color` (#101814 very dark green; #0c0c0d black), `interior`, `top` down|up, `flags`.
  Targets `objects:N` (body), `.driver`, `.passenger`, `.rear`, `.star`, `.bonnet`, `.flag_l`. 5.1 m long, 1.48 m
  high. Framings that work: a parked low 3/4 front at eye 1.35 m, 5-6 m off (`limits: "eye"`, a 1 m arc); the
  pavement pass (camera on the pavement 1.6 m, looking down the street, the car grows and rushes past 3.7 m from
  the lens: real motion, not a cut); `follow` side "left", altitude [2.4, 2.6], fov 36-40 (the car rides 7-8 % of the
  frame). Avoid `tracking_low` on a straight street (it plans 'still at start' and falls back to a 112 m flyover).
  Never a lit close-up of a rider's face (< 1 m) - riders read by cap and silhouette.
```json
{"structures":[{"kind":"town.prague_1942","id":"prg","at":[0,0],"heading":90,"length":220,"trams":1,"seed":7}],"objects":[{"kind":"vehicle.mercedes_320","road":"prg","action":"drive","speed":11,"from":20}],"camera":{"move":"keys","target":"objects:0","limits":"eye","fov":42,"keys":[{"t":0,"pos":[-29,1.6,7.1],"look":[-90,1.8,2.4]},{"t":5,"pos":[-31,1.6,6.9],"look":[-70,1.3,1.8]}]}}
```
<!--/needs-->
<!--needs:vehicle.tram_prague-->
- **vehicle.tram_prague** — a 1930s Prague two-axle tram, dark red + cream, clerestory roof, trolley pole on the
  5.65 m wire, saloon lit warm at dusk, a blue spark at the trolley wheel now and then. `road: "<town id>"` + `track`
  0|1 (it never leaves the rails), `dir`, `from`, `speed` 5-8, `sparks` 0..1, or a `path`. The moving layer behind a
  street shot, 15-80 m from the camera; a passing tram at 6 m (eye level) fills the frame for ~2 s.
```json
{"look":{"time":"dusk","sky":"scattered","haze":0.4},"structures":[{"kind":"town.prague_1942","id":"prg","at":[0,0],"heading":90,"length":200,"seed":9}],"objects":[{"kind":"vehicle.tram_prague","road":"prg","action":"drive","speed":5,"track":0,"from":60}],"camera":{"move":"keys","target":"objects:0","limits":"eye","fov":44,"keys":[{"t":0,"pos":[-22,1.7,-4.5],"look":[-34,2.2,1.5]},{"t":5,"pos":[-20,1.7,-4.8],"look":[-14,2.2,1.5]}]}}
```
<!--/needs-->
<!--needs:town.prague_1942|town.bohemian_village|landmark.prague_castle-->
- Do: dusk/night with one motivated light (moon on snow, a gas lamp, the belfry lamp); something moving in every shot
  (snowfall, smoke, a tram, the car, flags, birds); the car always on a `road` or a smoothed path; eye-level street
  shots with 40-46 deg lenses so the canyon stacks up; the castle on a long lens across the water. Don't: daylight
  postcards of the village; a lens inside a house, a roof, a tree or the castle hill; the Mercedes parked on open
  grass; more than ~8 lit windows in a blackout village; a night street at the default exposure.
<!--/needs-->
