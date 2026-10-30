# The librarian (flat): turn a finished 2D Short into library pieces (Legion runs this after a Short is done)

You are in the folder of a finished flat Short (`src/index.tpl`, `NOTES.md`, its stills `s_*.png`, maybe critic notes
`c*.json`). Your job: save the things it drew that look GOOD as reusable 2D pieces, so the next Short that goes to a
similar place starts from approved work. Free, offline, nothing outside this folder changes.
Append one short plain line to `progress.txt` after each step.

## 1. Choose the pieces (quality over quantity)
Read `NOTES.md`, `src/index.tpl`, the critic notes, and LOOK at the stills. A piece is worth keeping when it reads clearly
in the stills, belongs to a PLACE or a THING other scripts will name again, and the critics did not flag it. Kinds:
- `prop`: an object or plant of a place (a palm, a cactus, a lab flask, a satellite, a hospital bed, a car),
- `char`: a recurring creature or character drawing (a crab, a cell with a face, a robot), never the reference's hosts,
- `device`: an explainer device (a thermometer, a gauge, a counter, a map pin, a bar),
- `set`: a whole place drawn as a backdrop (a beach with sea and sand, a lab wall, a city skyline), with its options,
- `fx`: a reusable effect or texture (sea glints, a sweat drop, sparks, rain).
Skip anything only this story can use (a planet with this Short's words baked in, a one-off joke). Usually 3-10 pieces.
Pieces the library already has (`lib/` or LIBRARY.md) are never saved twice.

## 2. Write each piece as a self-contained function
`lib/<kind>/<name>.js` (lowercase, underscores). It may use only the engine (engine.js: W, H, PAL, SKY, rng, lerp, clamp,
ease, rgba, shadeOf, lightOf, atmos, dk, flat, ell, rr, cap, noodle, face, person, critter, strew, dashes, motif, glow,
mark ...) and never this Short's own variables or helpers (copy a helper's body in if the piece needs it).
```js
// @piece prop/palm: a palm cut by the frame edge: segmented trunk, six drooping fronds; far ones small and hazed.
// usage: prop_palm(g, x, groundY, height, lean, '#14A85A', '#B0602E')
// From "<this Short's title>". Uses only engine helpers; never edit this file, pass options instead.
const prop_palm = (g, x, y, h, lean, col = '#14A85A', trunk = '#B0602E') => { ... };
```
- Always `const <kind>_<name> = (g, ...) => { ... };` drawing into `g` at the given place and size; colours, words and
  sizes a new story would change are options with this Short's values as defaults. Animated parts take `t` (seconds).
- Randomness is seeded per piece or per item index (`rng(seed)`), never from x, y or t (it flickers).
- A device or a hero marks itself for the composition check: `mark(g, 'device', x0, y0, x1, y1, '<name>')`.
Next to it write `lib/<kind>/<name>.json`:
`{"name", "kind", "desc": "one line", "tags": [...], "usage": "the one-line call", "demo": "one JS call", "from": "<title>"}`
- **tags decide when Legion offers the piece**: a later script sees it ONLY if its words or pictures name one of the tags.
  Use the concrete places and things it belongs to (beach, coast, island, palm, holiday), 4-10 of them, singular. Never a
  vague word that comes up everywhere (any, thing, big, horizon, water, light, world) or the piece shows up where it doesn't belong.
- `demo` draws it centred in a 1080x1080 tile on a light background, e.g. `"prop_palm(g, 420, 1000, 820, 140)"`.

## 3. Prove it (not optional)
- `python libsheet.py lib` draws every piece ALONE (only engine.js + the piece) and writes its preview `lib/<kind>/<name>.png`.
  It must say `0 broken`. LOOK at each preview: it must look like the piece in the stills.
- Copy `src/index.tpl` to `src/index_lib.tpl`. In the copy, replace each extracted block with a line `@lib kind/name`
  (inside the `<script>`, before first use) and, if the page called it by its old name, an alias right after
  (`const mPalm = prop_palm;`). Then `python libcheck.py T1,T2,T3` with three still times that show the pieces must print
  PASS (same frames, no page errors). If it fails, fix the pieces (not the original) and re-run. A piece you cannot make
  pass is deleted. Never change `src/index.tpl` itself.

## 4. Done
Write `lib/REPORT.json`: `{"pieces": ["kind/name", ...], "check": "PASS", "notes": "one line"}`. Reply with one line: done.
