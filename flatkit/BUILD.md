# Building one Flat Short (the procedure Legion's builder follows, every time)

You are building ONE finished vertical Short (1080x1920, rendered at 60 fps; timings are in seconds) as 2D vector motion design drawn in code on a canvas,
in this folder, from the script and voice timings in `BRIEF.md`. Nobody will help you; work through the steps in order.
Free: no paid service is used, no network, nothing outside this folder is changed.

After each step, append ONE short plain line to `progress.txt` (the creator sees it), e.g. `Read the style (154 lines)`,
`Planned 9 shots`, `Stills checked, fixing 3`, `Critic 8/10`, `Rendering`.

## 0. Read the WHOLE style .md first (not optional)
The style's .md (path in `BRIEF.md`) is the law for every choice. Read EVERY line of it, start to end, in chunks of at
most 400 lines (Read with offset/limit), before you plan or write anything. Skimming, grepping or reading only parts is
how inconsistent Shorts happen: the .md files are not there for the air. Where sections disagree, the later
"overrides", "corrections" or "deep study" sections win. Then write `Read the style (N lines)` to progress.txt.
Section numbers quoted below ("the .md's section 24") are those of the first style built on this engine; any other style's .md
has its own numbering: find the section on the same topic (people, density, placement, motion, WHY, small truths). Where THIS
style's .md describes its people, palette, devices or pacing differently from the examples here, its .md wins.

## 1. Read the brief, the engine and the worked example
- `BRIEF.md`: the script, the beats, the length, the voice's word timings (also in `words.json` as [start, end, word]).
- `TASTE.md` (if present): the creator's own rules, learned from Shorts they rated. Never break one.
- `LIBRARY.md` (if present): approved 2D pieces that fit THIS script's places (Legion picked them by topic; the rest of the
  library was left out on purpose). Look at each preview. Use a piece only where a beat's place needs it (`@lib kind/name` inside
  your <script>, then its usage call); never add one because it is listed, and never edit the piece file.
- `engine.js`: the shared flat engine. Read ALL of it: its header lists the measured rules, and every helper says what it
  is for (shot/ENTER/enter, people: person/head, talking objects: obj, devices: bubble/crowd/pie/meter/molecule/cells/
  body/organ/tube, text: pills/banner/caveat/numBox/title/counter/speech/arrow, depth: depth/haze/fgCrowd/beams/backdrop/
  lensBokeh/shadowed/specks, places: landscape/hills/bush/cloud, life: alive, timing: hit / s.hit / s.at, in-shot changes:
  rebuild/morph, transitions: carry/pan/bars/reveal/into/match/push/whip/zoom/iris/dissolve/flash, people: POSE / FORMS).
- `map.js` (when the style or the script is about places): real maps inside the same engine. Read ALL of its header. A
  satellite world (NASA, public domain) and every country, state, city, lake and river (Natural Earth), a camera that flies like
  a map app (`MAP.cam` keyframes by place name: `{ t, at: 'Egypt', pad, d }`), and the map devices: `region` (light up a
  country/continent, lift, glow, dim the rest), `flagFill` (a country in its waving flag), `route` (draws itself, dashed,
  arrow head, great circle), `pin` / `marker` / `ring` / `meridian`, `label` / `along` (place names ON the map), `sticker` +
  `icon` (hex badges), `scatter` (icons spread inside a region, popping in turn), `shield` (highway signs), `mesh` (glowing
  networks), `react` (reaction faces), `dark` (the dark vector map for data moments), `sheet` (the map pulled back as a card on
  a blue grid desk) and `tint` (the teal sea). From the whole-channel study: `cutout` (a flat icon with the white sticker
  outline, the commonest overlay; 37 icons, never the same one twice in a Short), `hand` (a flat hand from the frame edge holding
  a thing), `political` (the flat colour map for many countries at once), `globe`, `tag` (a name with an underline leader),
  `pulse` (arrival ring), `vehicle` (a plane, ship or car riding the route), `band` (wide flow arrow), `callout`, `chart`,
  `timeline`, region `pattern: 'hatch' | 'dots'`, and `grade` (the one finish, drawn last in every shot). Load it after the engine: `<script src="engine.js"></script><script src="map.js"></script>`.
  Pins, labels and icons sit ON their place (pass the place, not screen numbers) so the flying camera carries them. Never
  draw a map by hand when map.js has the place.
- `examples/demo.tpl` (a finished template) and `examples/demo_NOTES.md` (its plan). Learn the CRAFT from them, never
  their content: your Short gets its OWN subject, characters, objects, colours and words. Never copy the reference
  channel's or the example's scripts, characters, names, logos or signs. No real people's faces, no brand logos.

## 2. Plan (NOTES.md)
Write `NOTES.md` from the style .md and the script:
- the shot list, on the MEASURED pace (.md section 16): hard cuts are far apart (about every 4-8 s, ~16 words a shot, most
  just after a sentence ends); a shot EVOLVES instead of cutting (new elements arrive, a pan to the next subject in the same set,
  a `lineWipe` of a diagram to its next state, a push or a zoom dive); inside a shot something new starts moving every 0.5-1.1 s
  (about every two words), each motion's FASTEST frame ON the word that names it: start it at `s.hit('word', kind)` (it then
  starts ~0.1 s before the word); never add or subtract a lead of your own (`w('x') - 0.2` made the Moon's moves fire early);
  when the style card has `motion.syllable`, hit() lands on the word's STRESSED syllable (measured from the voice) and
  `stressed(from, to)` lists the words the voice leans on, loudest first: the shot's biggest move goes on the top one;
  weight: `mass: 2` on heavy moves (`MOVE`, `s.hit(word, 'move', { d, mass })`), `mass: 0.5` on light ones; with `motion.weight`
  `alive()` takes weight from `size` by itself;
- **Acting is key poses, never switches** (creator 2026-10-27: "moves feel on/off", "the character is frozen while the text
  moves"): write each character's key poses ONCE as a list and pass `...act(t, KEYS)` into `person()` / `bust()`:
  `const DK = [{ t: 0, armR: 10, elbowR: 6, mood: 'calm' }, { t: s.at('drunk'), armR: 40, elbowR: -50, tilt: 6, mood: 'worried', heavy: 1 },
  { t: s.at('hallucinating'), armL: 70, handL: 'open', mood: 'shock', snap: 1, ant: 1 }]` then `person(g, { ...DARA, x, y, s, t, ...act(t, DK) })`.
  The body leads, shoulders follow 2 frames later, elbows 5, wrists 7, the head 4; elbows, wrists and head overshoot and settle.
  NEVER `handL: t > an ? 'fist' : 'relax'` or `mood: t > x ? ...` (check.py flags it). Every character on screen changes pose at
  least every ~2 s while it is the subject (a gesture on the stressed word, a look, a shift of weight).
- **Life is automatic, add to it** (card `motion.life`): every person and bust breathes, rocks, sways and trails its arms; `depth()`
  planes drift on their own; every shot gets a quiet layer of floating motes (shot opts `ambient: false` for a clean diagram,
  `'snow' | 'spark' | n`, `moteCol`). On top of that every shot still needs its own environmental motion: steam, a ticking hand,
  blinking lights, leaves, clouds, birds (`alive()` on the hero and big props, seeds staggered).
- **Never a template** (creator 2026-10-27): BRIEF.md lists what this style's last Shorts looked like. New cast (never the same named
  character), new places, new devices. The scene IDEA changes almost every shot; a person is one idea among many (check.py
  `variety` flags a person filling over half the stills, or 3 look-alike stills in a row).
- **Changes lead the eye** (creator: "transitions not continuous or motivated"): at most 3 in 10 changes may be slides (pan / whip
  / push; check.py flags more). Prefer `into` / `zoom` through the old shot's hero (give no x, y: the engine finds the hero itself),
  `carry` (the thing that stays), `reveal`, `bars`, and changes INSIDE a shot (`rebuild()`, `morph()`, a pan to the next subject).
  the first motion within 0.1 s of the cut; things keep moving right up to the next cut;
- how each idea becomes the next (the .md's section 23, measured on 205 changes): about 1 in 4 a plain cut (or a match cut:
  the same shape in the same place), the rest LINKED: rebuild in place 14 % (`rebuild()`), carry 13 %, pan 11 %, bars 7 %, zoom-out
  reveal 7 %, zoom-through 5 %, dissolve 4 %, push 3 %, whip 2 %. Write the plan's change type next to every idea change;
- WHY (the .md's section 24, 1,027 moves measured): every planned move carries its reason tag: acts-the-word 15 %,
  stresses a key word or number 16 %, mechanism 12 %, alive 19 %, changes-the-idea 12 %, points 8 %, scale 8 %, feeling 7 %,
  joke 3 %; every shot its place reason (where it happens, abstract field for a number, metaphor, inside, contrast), colour
  reason (palette, contrast with the last shot, mood, real colour, danger) and camera reason (still for reading 42 %, push-in
  for emphasis, dive for scale). A move with no reason is cut. Each sentence's key word gets ONE distinct beat while the rest
  holds; each new idea changes the set or the colour on its first word; a number goes on a plain field;
- per shot: the device from the .md's scene catalogue (talking object, person, zoom bubble, crowd as a statistic, body
  diagram, place, dark glow scene, chart...), its ground colour, its THREE planes (far ground / subject / near-lens
  shapes) and what moves inside it while the camera holds still;
- which words each text piece lands on (pills, banners, plates, numbers) and where it sits; the hook claim on screen at
  frame 0; the bookend (the hook's picture returns at the end) if the .md asks for it;
- the cast: PEOPLE carry the Short (the "you" of the script is a person). An object, organ or molecule gets a face only where
  the script personifies it, for a shot or two, never as the star of every shot. One look each, identical in every shot.
- the giveaways to avoid (.md section 16): no mascot with gloves and sneakers carrying the Short, no sticker or meme text
  ("WHAT HAPPENS NEXT?", "X WINS", signs, one-word caps boxes that comment or count), no gag props added for a joke, no "winner"
  bookend. (The yellow caps NAME label on a bubble's rim, the indigo caveat plate, sparks round a hero that just landed and two
  dancers sharing a club scene are the style's own: .md section 17.)

## 3. Build (src/index.tpl, then `python assemble.py`)
Write `src/index.tpl` the way the example does: `<script src="engine.js"></script>`, your own helpers (your objects
and characters as small draw functions), `SHOTS = [shot(t0, t1, (g, s) => { ... }, { trans: {...} }), ...]` and `start();`
at the end. Time things inside a shot with `s.t` (shot seconds); land an entrance on a word with
`wordAt('word', after) - shot.t0`. `python assemble.py` writes index.html. The approved look, not negotiable:
- **Depth in every shot**, as the .md describes: a far plane (gradient ground, hazed shapes, `depth(g, z>1, ...)`), the
  crisp subject, and near-lens shapes (`fgCrowd`, `lensBokeh`) where the scene allows; heroes on a backdrop cast their
  WHOLE silhouette onto it with `shadowed(...)` in the ground's dark colour; dark scenes glow (`glow`, `rays`, bokeh).
  Section 19 of the .md wins on HOW: depth comes first from atmospheric planes (far = pastel, near the sky's lightness at half
  the chroma; each step nearer 5-8 L darker and more saturated), big near shapes cut by the frame edge with real thickness
  (`extrude`), fog banks between rows (`fog`), light from ONE source (`srcSky` + `godRays` + `motes`), perspective floors
  (`perspGrid`). Defocus blur is rare (about 1 shot in 8, soft near props only); never blur by default.
- **Shapes**: flat fills, no outlines on characters and props, a darker same-hue crescent (`flat`), lighter lobes and
  tiny white `specks` on glossy forms; bodies in diagrams get the thick deeper edge; gradients on grounds and discs.
- **The hook** (measured on 26 hooks): the title on screen IS the first spoken line, word for word (BRIEF.md's first sentence),
  and frame 0 holds only that lockup, ONE hero and the ground: no sticker, no second character, no furniture. The title is a designed `lockup` (key words huge, filler words a third of that,
  2-3 colours, a dark ring plus a light outer ring, usually an `extrude`, the key word in a gradient; sometimes on a
  puffy `plate`, or printed onto the hero object itself), upper third, the hero overlapping it and ALREADY acting at frame 0
  (a hand pressing, a mouth chewing, a lifter lifting). At ~2.4-2.8 s the title leaves as the nearest plane with
  `lockOut` ('drop', 'zoom', 'up' or 'fade') while the hero stays and the camera moves on into shot 2: no hard cut out
  of the hook. Never a plain two-line title in one size.
- **Text is small and attached**: labels name a thing ("Stomach Acid", "Gum Base") or carry a data point ("~1-3 Days",
  "+10 %"), in title case, never sticker phrases or caps shouts; they are small `tag`s (pill, chevron, pennant pointing at the thing, hexagon for a
  heading) next to or on what they name, leader lines when they point; big type only for the hook and a key number.
  At most one tape `banner` in a Short. Numbers sit on tags or plates and count (`counter`).
- **Organs come from `organ()`** (lungs, heart, stomach, liver, gut, brain), never your own blob: even when one organ is the
  hero of a shot, draw it with `organ(g, kind, x, y, big size)` so it keeps the measured construction (edge band, lighter
  inset). A self-drawn stomach reads as a balloon or an onion.
- **A field of many copies** (a crowd of objects, a grid of sticks) is never wallpaper: far rows smaller and hazed in
  `depth()`, a hero copy big and crisp in front with a face or an act, near-lens copies blurred at the bottom edge.
- **No empty frames**: every shot has its hero from its first word (a label alone on a dark ground is not a shot), props
  are opaque (no see-through calendars), and characters are never cropped at the arms or hands in a medium shot.
- **Framing is big**: heroes fill 45-80 % of the width, medium shots cropped by the bottom edge, close-up faces fill the
  width, body diagrams overflow the sides. One focal point per frame.
- **People are built, not picked** (the .md's sections 23 and 18): `person()` is a rig, not a template. Its default build 'kz' IS
  the measured figure (3.9 heads tall, legs 40 %, round head, dot eyes wide-set at mid-face, no nose, brows and a mouth only when
  they feel or speak, side two-tone shading, cuffs and shoe soles, a hair cap with a swoop and a tuft): keep it, pick a torso
  `form` ('trap' | 'pear' | 'round' | 'tube': mix them, never all the same) and START FROM AN ACTING POSE (`...POSE.present` |
  point | wide | shrug | cheer | belly | think | worry | wave | hold | walk): the reference's people hold, lean, sit, point and
  open their arms; a figure standing with its arms down is the exception. 'story' / 'slim' only to rebuild one measured frame.
  Then pose and dress THIS person for THIS line: per-arm and per-leg angles
  and joints, hands, small `body` tweaks (the engine keeps legs and torso within the measured range, never stubby; `kid: true` for a child), `headX` / `headTilt` / `turn`, hair cut, clothes, ears (`earL` / `earR`), eyes and mouth
  sizes. Anything the presets lack (a hat, a hairdo, a prop in the hand, a garment) is drawn with the hooks in the same space and by
  the same rules (flat, no outlines, even round tubes, deep() skin): `backFn` / `topFn` / `drawFn` (body space, P = the joints),
  `hairFn` / `hairBackFn` (head space). Two people in one Short never share the same body, hair and clothes.
- **The person look is locked** (every critic flags a drift from it as a giveaway): the resting face is dot eyes and NO mouth
  (POSE presets set no mood: give `mood` only on the word that carries the feeling, and let it go after ~1.5 s); a smile is a
  small curve, never held through a whole shot; the hair has volume and a shape (bun, swoop, curls, side locks), never a thin
  cap; ears or hair cover the sides of the head; at least 3 small details on every hero (a collar or neckline, the neck
  shadow, cuffs, shoe soles, a belt, a pocket, a bag strap); a torso `form` that fits the person (not 'pear' with short legs
  and puff sleeves: that reads as a box), and the figure big enough to read the face (a host at least 30 % of the frame's height).
- **Measured people (to rebuild a real frame to the pixel)**: give each person `probe: 'name'`; after a still, `window.PROBE`
  holds the head's and each hand's transform, so a real frame's outlines map straight into head or hand space (measure with code,
  never by eye). Then every part takes measured numbers instead of a preset: point lists through `spline()` (hair like `HAIR`,
  `tailPts`), hands as outlines `handL` / `handR: {pts, under, over}`, per side `earL/R {s, x, y, w, r, back}`,
  `browL/R {x, y, r, s, a, w}`, `eyeL/R {x, y, w, h, ix, iy, nb}` (`eyeNB` a flat lower lid), `jawL/R`, `featX/Y`, `mouthR`,
  `irisS/Y`, `faceFn` (head space); arms `jointL/R`, `armLenL/R [upper, fore]`, `armWL/R [shoulder, (elbow,) wrist]`,
  `sleeveLenL/R`, `foreOverL/R`, `frontL/R: 'fore'` (only the forearm and hand over the head); torso `shW`, `hemW`, `hem`,
  `rS` / `rSY` / `shCut` (sloped or cut shoulders), `midW` / `midX`, `beltW` / `beltH` / `beltX`, `hipSplit`; bra `braV` /
  `braStraps` / `bandH`; necklines `scoop` + `scoopR` / `scoopRY` / `scoopRot` / `scoopTrim` / `scoopT`; `strapPts` (a 3rd
  element = a corner) and `pieces [[col, pts, front]]` (a measured shape in body space, e.g. a bag); belt `beltY` / `beltR` /
  `beltTilt`; legs `legJointL/R`, `legLenL/R [thigh, shin]` (a shin near 0 = foreshortened, no shoe), `legWL/R`, `legEndL/R`,
  `creaseL/R [[t, len, depth]]` (fold steps cut into a trouser edge), `shoeL/R: false`, `legSkinDark`; the seat
  `hipBlock [w, h, r, dx]`; shorts `shortsR` / `shortsTop` / `hemFlat` below 0 (hems steeper than square); socks `sockH` past the
  knee (over-the-knee), `sockW [ankle, top]`, `sockTop: 'flat'`, `socksDark`, `sockBandY` / `sockBandH`. Foreground crowd blobs
  get their own `depth()` group when their edge is sharper (measure the 10-90 % ramp: blur ≈ ramp / 2.56). A shape the rig
  still lacks becomes a new parameter like these, never a one-off picture.
- **People** follow `person()` / `head()` as built (the .md's characters, sections 23, 18 and 17): faces round and simple (the
  'kz' default: dot eyes, no nose, `brows: 'auto'` and `mouth: 'auto'` = only when a feeling or speech needs them), ears and necks
  in `deep()` skin; white eyes (`eyes: 'white'`) only for close-ups and big smiling medium shots, with `brows: 'arc'`; worried or ill close-ups `brows: 'thick'`, `eyes: 'shut'` or dot eyes, `nose: 'bean'`, `mouth: 'o'`,
  `drops` popping in from `dropsAt`, `wash` for skin that turns; three-quarter faces with `turn`; hair `bowl` | `swept` (+ `tail`) |
  `long` (+ `strand`); the mood also lives in the LIDS (`mood: 'worried'|'sad'|'angry'`, `lid`); real fingers when a hand gestures.
  A CLOSE-UP is `bust()` (round shoulders ~2.4 heads wide under the chin, collar, buttons) with a pink-lavender `haze` over the bottom
  fifth. Heroes stand in the middle with headroom, never crammed against the bottom edge.
- **Pieces** (section 17): skies `bg(g, ...SKY.violet|royal|ember)` (the gradient ends at 55 % of the height); glossy round heroes
  `gloss()` with `rim: true` on bright skies; jars, bottles, cans `jar()` / `cyl()` (hard split shading, highlight strokes, the cast
  floor shadow); molecules `molecule()`; zoom views `bubble()` entering with `popOut()` (pointer 7 frames, then the bubble 8) and
  the yellow `banner()` name label on its rim; source notes `caveat()`; a hero that lands fires `sparks()` once; a club is `stage()`
  + dancers + `fgCrowd({size: 1.45, hands: true, cols: [...]})`; scene changes that keep the hero `xfade()` / `iris()`; rows leave
  with `cascade()`. No outlines anywhere.
- **Pieces from the seventh study** (the .md's section 19; read it for WHEN each one is right, every piece is tied to a line of
  the script):
  - the cast: in space, what-if and animal topics personified things carry the Short: `planet(g, x, y, r, {kind: 'rock'|'moon'|
    'gas'|'earth'|'star', light, glow, rim, ring, face: {mood, whites, look}})`, `shard()` for grains and debris, `face()` on
    anything else the script turns into a character (lids and brows carry the mood: happy, sad, worried, angry, shocked, sleepy,
    smug, scream). An original recurring host may bookend (3-6 shots). Serious medical, social and war topics stay with people.
  - speech: `speech()` bubbles of 1-4 words from a personified thing, one at a time.
  - data: `tag()` with a leader line, `skullTag()` / `skull()` grids for deaths, `gauge()` for a speed or level, `bubble()` zooms,
    `split()` for two worlds or "meanwhile", `fineprint('Not to scale')` whenever sizes or distances are faked.
  - a starfield is `bg` navy-to-purple + `dots` + a few `twinkles`; metaphor cutaways jump to a full-bleed bright field and back.
  - time skips: `ffwd(g, s.t, t0, t1)` over a shot drawn on `FFT(s.t, t0, t1)`; forming / evolving: `pixelIn(g, p, ...)`; travel at
    speed: `speedLines()`.
  - a gag only when it ENCODES the fact (a walker on the slowest planet, with its number); 3-6 metaphor props per Short, each for
    one sentence.
  - between two scenes of one argument: `{ trans: { type: 'diag' } }` (the new shot slides in from the top behind an edge tilted
    16 degrees, higher on the right; `dir: 'up'` from the bottom).
  - LINKED changes (the .md's section 23): `{ type: 'carry', x, y }` (the thing at x, y stays: draw it identically in both shots,
    or pass `over(g, s)`; the new world opens round it), `{ type: 'pan', dir }` (the camera slides on to the next part of the same
    world), `{ type: 'bars', col, dir, from }` (bars run up their columns 2 frames apart, the new picture behind), `{ type: 'reveal',
    x, y, r, shape: 'circle'|'round'|'photo', ring, glow, keep }` (the camera pulls back: the old picture sits in a bubble, panel or
    photo of the new one, stays `keep` s, pops away), `{ type: 'into', x, y, r, peek }` (a bubble in the old picture shows the new
    one for `peek` s, then the camera dives through it), `{ type: 'match' }` (a hard cut: put the same shape in the same place).
    Inside one shot: `rebuild(s.t, t0, i, n)` (old pieces shrink out, new ones pop in, staggered, the background stays) and `morph`.
- **Density: fill the frame like the reference** (the .md's section 21, measured on all 3,868 frames; it wins over everything): the
  reference is busy in 4 frames of 10 (30+ flat shapes) and very busy in 1 of 6 (50+); every Short peaks near 85 shapes and dips near 5.
  A build that sits around "one hero on a gradient" all the way through reads BALD. Plan a density per shot from its job: the hook
  frame 40+ (the lockup over a FULL scene), places / people / examples / solutions / the bookend 30-60, a number, mechanism, scale or
  turn may be sparse (10-25) with one big hero. Fill with things that belong to the place: `strew(g, seed, fn, {box, rows, s0, s1,
  per, near})` (flocks, crowds, crops, corals, umbrellas in perspective rows), `tangle(g, seed, {top, stem, leaf, pods})` (a dense
  near-plane thicket from the bottom edge; stems 15+ L from the leaves), `dashes(g, seed, box, col)` (tonal texture strokes on every
  ground), `strands(g, x, y)` / `radial(g, x, y, n, fn)` (radiating ribbons, a radial repeat), `motif(g, pathFn, 'hearts'|'dots'|
  'stripes'|'checks'|'stars')` (patterns on clothes, towels, walls), `edgeStack(g, items)` (a device column on one edge), `rafters(g)`
  (an interior's back plane), plus `motes`, `twinkles`, `cloud`, far boats and planes in the sky. Heroes get inner detail (shading,
  panels, windows, patterns); the top quarter is never a bare gradient on a busy shot; fillers stay in the far plane (small, toward
  the sky colour) or the near plane (cut by the frame), never on the hero's silhouette or in the caption band. `check.py` prints
  shapes / small / inner / bald per still and the Short-wide counts (4 in 10 at 30+, one at 60+, at most 2 in 10 under 12, the hook
  40+): fix the stills that miss before rendering.
- **Placement: where things sit** (the .md's section 22, 535 frames boxed element by element; it wins over everything): ONE hero
  on the middle line at 43-56 % of the height, sized by the shot's job (`const S = slot('hook' | 'mechanism' | 'number' | ...)`
  gives {x, y, r, w}; median 56 % of the width, the number shot smaller and whole); cut a big hero by a side or the bottom edge in
  ~1 shot in 3 (`slot(job, { cut: 'right' })`). The title's centre at ~25 % of the height, ~2/3 of the width, the hero under it. A
  device sits ON or right against what it explains (`against(box or S, 'on' | 'above' | 'side' | 'below', size)`, gap ~2 %), about a
  third of its size: never floating far from it. Three planes, about 7 separate things a frame: fullness comes from COPIES of a
  few kinds (strew rows grow ~25 % per 10 % of height by default) and inner detail, not from more kinds of things. A big near shape
  cut by the frame in ~1 shot in 3 (bottom or a bottom corner), not every shot. Near dressing may cross the hero's lower edge;
  people, hands and devices never sit on its middle. Dress each place from the .md's atlas (its far / mid / near things at their
  heights). `check.py` prints `placement`: fix every FLAG.
- **Composition: nothing covers the hero or a device** (the reference never does it): the hero (a planet, the subject), a device
  (a gauge, a thermometer, a number box, a zoom bubble, a plate) and the title stay fully readable. The cast stands BESIDE them, in
  front only below their lower third, and a hand may touch an edge, never sit on the middle. A host pointing at a device stands to
  its side with the arm reaching toward it. The engine records where these sit (`planet` r 110+, `gauge`, `bubble`, `numBox`,
  `plate`, `lockup`, `person`, `critter`); a hero or device you draw yourself must say so: `mark(g, 'hero' | 'device', x0, y0,
  x1, y1, 'name', 'ell')` (in the shot's own coordinates, after you draw it; `'ell'` for round things). `check.py` prints
  `composition` per still: fix every flag before the critic.
- **Everything that stands, stands ON something** (the .md's section 24): in a room, furniture, people and animals have their
  bottom ON or below the floor line (`room({seam})`; lower the seam when a big piece needs floor), with a floor shadow; a bed is
  never a slab hanging on the wall. Something standing on a desk, a shelf or a wheel says so with `on: true` (furn, person,
  critter). `check.py` prints `grounding`: every FLAG is something floating.
- **Arms reach in one piece**: a hand that touches, holds or follows something gets `reachR: [x, y]` (or `reachL`) on `person()`:
  the wrist lands on the target, the elbow bends naturally. Never draw a separate arm or hand by hand next to a person (it splits
  at the shoulder). An arm that must pass IN FRONT of a desk or prop: `hideR: true` on the person, then after the prop the same
  options again with `only: 'R'` (that arm and its sleeve alone).
- **Sleep is never a standing figure turned on its side**: `isoBed(g, x, y, s, { sleeper: {...cast look}, blanket, t })` (a small
  bed in the 30-degree view standing on the floor, the sleeper tucked in, head on the pillow, 'z's; `sleeper.lift` 0-1 sits them
  up awake) or `bedTop(g, { ...cast look, x, y, s, blanket, t })` (the close-up from above: pillow, head, blanket to the chin,
  both hands over the fold).
- **Anything that runs, runs**: an animal on a wheel, a treadmill or a road gets `pose: 'run'` with `phase` driven by the wheel's
  turn or the ground's travel (the feet never slide); something that pushes, carries or works moves its body while it does.
- **No flicker**: anything drawn with randomness is seeded per OBJECT (`rng(seed + i)` with the item's index), never from its
  x, y or the time: a colour or kind picked from a moving position jumps every frame. Things that drift or swim in a loop wrap
  while OFF screen (wrap width = the frame plus the object's size), never pop in or out inside the frame. After rendering,
  `python flicker_check.py toon.mp4` lists the cells that toggle (A -> B -> A); anything it lists that is not a deliberate
  flash or blink is fixed and re-rendered.
- **Library pieces you make**: something of a place other scripts will name again (a palm, a lab flask, a satellite) is
  written as one function `const prop_<name> = (g, x, y, size, ...) => {...}` that uses only the engine, so the librarian can
  save it after the Short for the next one.
- **Pieces from the whole-channel study** (the .md's section 20, measured on all 141 Shorts; it wins over every earlier section):
  - colour and depth: shade and light every flat shape with `shadeOf(col)` / `lightOf(col)` (the measured per-hue turn, never a plain
    darken), move a colour with `tone(col, dL, dh, kC)`, haze planes with `planesOf(sky, near, n)` / `atmos(col, sky, d)`, glow with
    `bloom()` (tight rim + faint wide halo) after the glowing disc, night skies with `starfield(g, seed, t)` (tinted lavender specks).
  - where the Short happens: a hero alone on a colour field is the most used setting: `heroField(g, col, {to | dl, dh, floor, burst,
    streaks})`. Rooms: `room(g, {wall, floor, seam, lamp, decor, rug})` (one saturated wall, the floor a little lighter at 0.73 H, wall decor
    TONAL), furniture `furn(g, 'sofa'|'armchair'|'table'|'desk'|'bed'|'drawers'|'bookshelf'|'plant'|'lamp'|'monitor'|'console'|
    'pedestal', x, y, s, o)`, wall pieces through `decor` ('frame', 'poster', 'window' + blinds, 'arch', 'shelf', 'clock', 'rail',
    'board' = chalkboard, 'door'). Outside: `city()`, `building()`, `ocean()`, `canopy()`, `landscape()`.
  - space: `planet()` (+ `half` for the big half-lit moons), `galaxy()`, `blackHole()`, `flare()`, `orbit()` / `zone()` / `marker()`
    for diagrams. Maps: `worldMap(g, x, y, w, {frame, ice, pixel, bands})` and `globe(g, x, y, r, {lon, t, bands})`.
  - biology: `neurons()`, `virus()`, `chromo()`, `cells()`, `organ()`, `xray(g, clip, inside)` for see-through bodies, `heat()` for a
    thermal view.
  - data: `paper()` (studies, patents, `blue: true` blueprints), `slider()` (a year or setting), `dotGrid()` ("1 in N"), `metro()`
    (routes, pathways), `plate()` (TODAY-style gradient label), `phone()` (news, apps), with `pie()`, `meter()`, `gauge()`, `counter()`.
  - animals: `critter(g, {kind: 'cat'|'dog'|'rat'|'mouse'|'rabbit'|'bear'|'fox'|'pig', pose: 'sit'|'stand'|'run', phase, mood, look, on})`
    (rat / mouse: snout, big pink ears, long tail, as the reference's lab mouse), `fish()`, `worm()`; sleepers: `isoBed()`, `bedTop()`.
    Never the reference channel's bird hosts or mascots.
- **Motion**: rendered at 60 fps, so every move must be a curve, never a jump: entrances with the measured kinds and timings
  (`s.k(t0, 'slide'|'grow'|'pop'|'snap')`: slides and grows ride the measured `glide` S-curve, pops `popc`, 'snap' only for the
  quick third), travel with `MOVE`/`along` (glide too), never a hand-written linear lerp for a move. Measured shares: about 1
  travel in 4 and 1 pop in 3 overshoot (`over: true`, settles once), about 1 travel in 5 winds up (`windup: true`); cards and
  panels fly in turning and land tilted (`rot: -30, tilt: -12`); tags open in two stages (`stretch`); fast limb swings leave
  ghosts (`trail`); a reaction starts 4-8 frames (0.13-0.27 s) after its cause; anything else
  groups staggered; the camera is LOCKED in holds. Every hold has ONE act and a LIVING idle (measured v2 on 16 Shorts at 60 fps:
  ~12 % of the frame moving at any moment at ~120 px/s, in 94 % of frames, WHOLE shapes: the Moon build moved 4 % and stood dead in
  1 frame of 4). One clear move per idea, about 2.3 moves a second at most (the Moon fired 3.2, short snaps out of dead stillness:
  it read twitchy, not punchy); moves ~0.3 s (pops) to 0.45 s+ (travel) with long soft landings; the background never moves:
  - the act, on the word that says it: a thing travelling in (`along` on an arc, ~0.5-1 s; `MOVE` from off-frame,
    0.4-0.5 s), a drop under gravity (`fall`), an arm reaching (`armL/armR` through `MOVE`, 0.5-0.7 s), a heart beating
    (`beat`), a needle twitching (`twitch`), an element changing (`morph`), a ring drawing on (`ringOn`), a tag
    opening (`stretch`), a number plate wiping on (`wipe`) 4 frames after its tag, a title typing (`typeOn`), sweat
    drops thrown off on an entrance (`burst`), an element thrown out (`fling`);
  - the life loop on every hero, cast member and big prop: `alive(g, s.t, px, py, () => draw(), { kind, size, seed })` ('bounce'
    for standing things, 'bob' for floating ones, 'sway', 'breathe', 'spin' for planets and wheels, 'drift' for clouds and debris);
    a drifting layer behind (clouds, dust, motes, fish) on most shots; different seeds so neighbours never move in step;
  - the idle: people breathe, rock on their feet and swing their free arms by themselves (`person`/`head` with `t: s.t`; `dart: true` while they look around,
    `talk: true` only while THEY speak; blinks are built in); a table or row of many items gives each item its own
    `bobOf(s.t, i)`; talking objects dance/bob on their pose. Never a slow camera push in a hold, never a wobble on
    everything at once. A built-up diagram may hold still once its parts have landed.
  - pulses land on beats (`pulse`), loops are the only linear motion (`loopRow`), everything else snaps then settles.
- **Captions**: Legion burns its captions on top (the .md gives their height). Keep that band free of key text and faces.
  So on-screen text NEVER repeats the narration: no typed sentences, no headline per line (two lines of the same words on
  screen is the first thing viewers call out). Text on screen only names a thing or carries a number the voice doesn't spell out.
- **Calm overlays** (every style): at most 2 overlays on screen at once besides the subject; each lives at least 2 s, comes in
  and leaves eased (`MAP.life` on map shots: fade + small scale, never a pop or a bounce) and moves by the same easing as
  everything else. One camera move per idea.
- **Motion defaults come from the style card** (job.json `motion`): when it says `cam: 'drift'` every shot drifts and pushes
  a little by itself (give a built-up diagram `lock: true`, a calmer shot `drift: 0.5`), and shots without a `trans` get the
  card's linked transitions in turn. Only write a `trans` when the moment has its own motivated link (an object the camera
  pushes through, a shape that becomes the next scene, a match cut). A hard `cut` is a choice, never the default.
Never put `//` followed by code on the same line. Never declare your own `const`/`let` with a name the engine already uses
(`planet`, `face`, `fog`, `split`, `SKY`, ...): the page stops with "already been declared". Give your helpers their own names.

## 4. Stills, then LOOK at every one
`python render.py --stills t1,t2,...` with one still per shot (a moment just after its entrances land), the hook frame,
one mid-transition frame of each push/whip/zoom/reveal/into/bars, and the last frame. Then the LIFE probe: the same times + 0.1 s with
the prefix l_ (`python render.py --stills t1+0.1,t2+0.1,... l_`), so `check.py` can measure how much keeps moving. It prints page errors: fix every one. Then Read
EVERY still yourself and fix, in one batch per round:
- anything cut off that should not be (text, a face, a hand), text touching an edge, pills not reading at a glance,
- overlaps: text over a face, the caption band blocked, two things fighting for attention, an empty or unfinished area,
- missing depth: a shot with no far plane or no shading layers, a hero on a backdrop without its cast shadow,
- scale: small, timid framing; a hero smaller than the .md's measured share of the frame,
- colour: greys, beige, pastel-dull, a ground that matches the subject so it disappears,
- a character that changed look between shots; eyes, brows and mouth that don't say the beat's emotion,
- a dead hold: a shot with no act in it (look at two stills 0.5 s apart in the longest shot; something must have moved).
Re-render only the stills you changed. At most 3 rounds.
A shot type, person or prop the engine has never made: rebuild the real frame it comes from on a study page first and check it
with `python ../../../../stylelab/rebuild_check.py . study.html 1.0=<ref.png>` (real | ours | where they differ, worst cells
first). What the engine cannot make becomes a parameter or hook (section 18 shows how people were done), never a one-off picture.

## 5. Numbers
`python check.py` prints colour, edge detail and depth per still next to the same numbers measured on the style's
reference stills. Fix what is clearly off (more saturation, darker or brighter grounds, more detail where it is empty).
It also prints density (fix by section 21) and `composition`: every flag (the cast or a hand over a hero or device, a hero cut
under another hero) is fixed before the critic. And (section 23) `life` (median share of the frame moving, nearly dead holds) and
`timing and transitions` (hand-guessed leads, the share of hard cuts among the idea changes): fix every FLAG. And (section 24)
`grounding` (anything floating above the floor line).

## 6. Critic (fresh eyes, not you)
Pick four stills: a medium character shot, an insert (an object or a device close up), a group or crowd shot, the
biggest gag or reveal. The critic is calibrated: two real frames of the style are hidden among yours, it scores every frame and must
name which ones are real. Your score is how close you come to the real frames, capped when it picks them out (both found:
at most 6.5). Real frames score about 8-9; a giveaway from the list above sinks you. Run three critics at once:
`python critic.py c1.json A B C D & python critic.py c2.json A B C D & python critic.py c3.json A B C D & wait`
(Bash timeout 600000). Take the median score. If below 8, a REAL fix round:
1. List every fix the critics agree on that is about THIS Short (framing, scale, depth, shading, text, colour, clarity).
2. Change `src/index.tpl` for each one (or add a helper in it; never edit engine.js), `python assemble.py`, and
   re-render THE SAME four stills (same times).
3. Read each new still and confirm every listed fix is visible. A fix you can't see didn't happen: do it again.
4. Run the three critics again on the new stills. Up to 2 fix rounds; stop early only at a median of 8 AND nothing two or more
   critics still list as a giveaway (the person look, something floating, a hero crushed at an edge, a bubble over a face): a
   fix that two critics agree on is never left for the render, even at 8.
Write `Critic N/10` to progress.txt after each round (the creator sees the score climb).

## 7. Sound cues (cues.json), from `sfx_catalog.txt`
Legion mixes the sound; you say where and which. Use ONLY files listed in `sfx_catalog.txt` (`Folder/File.wav`, grouped by what it is
for, with how long it rings). Write `cues.json` as `[[seconds, "Folder/File.wav", volume], ...]` (format: `examples/cues_example.json`).
Follow the .md's sound section. For this kind of style it is measured: effects are RARE, **3-6 in a 40 s Short** (about one every 7-15 s),
each on the exact frame of its picture partner:
- a falling **blip** or a round **pop** when a KEY thing appears (the hero's entrance, the pill with the answer, a counter landing),
- a short mallet **chime** on THE reveal (one per Short, two at most),
- a soft **whoosh** (a dry thump) on the biggest push or zoom, not on every cut,
- a **knock** for a tick per step only if a counter or list steps on screen.
Volume 0.5-0.7 (the files are soft; Legion evens their loudness). Never the same file twice in a row, never two within 1.5 s. Silence
between effects is part of the style: the voice and the bed carry it. If `sfx_catalog.txt` is missing, write `[]`.

## 8. Render
`python render.py --render` (Bash timeout 600000; it renders several parts at once at the job's frame rate, 60 fps for this kit, and joins them into `toon.mp4`). Then `python sync_check.py --fix`: it finds where the picture really moves and snaps every sound cue that is 1-5 frames off onto its visual hit (sound lands on the exact frame, not near it); a cue it lists with no hit near it has no visual event: give it one or drop it. Then
grab a contact sheet (`ffmpeg -i toon.mp4 -vf "fps=1,scale=180:320,tile=10x3" -frames:v 1 sheet.jpg`), Read it, and make
sure nothing is broken. Run `python flicker_check.py toon.mp4`: a cell that toggles 3+ times and is not a deliberate blink,
twinkle or flash is a bug (see No flicker): fix it, re-render. Finally write `result.json`:
`{"video": "toon.mp4", "shots": [every shot t0], "critic": median, "notes": "one line on what you made"}`.

Budget: aim to finish within about 40 minutes. Never stop with a half-built folder: if time runs short, render what passes.
