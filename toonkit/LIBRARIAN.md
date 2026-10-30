# The librarian: turn a finished Short into library pieces (Legion runs this after a Short is done)

You are in the folder of a finished Toon Short (`src/index.tpl`, `NOTES.md`, its stills `s_*.png`, maybe critic notes
`c*.json`). Your job: save the parts of it that look GOOD as reusable library pieces, so the next Short in a similar place
starts from approved work instead of a blank page. Free, offline, nothing outside this folder changes.
Append one short plain line to `progress.txt` after each step.

## 1. Choose the pieces (quality over quantity)
Read `NOTES.md`, `src/index.tpl`, the critic notes, and LOOK at the stills. A piece is worth keeping when it reads clearly
in the stills and the critics did not flag it. Kinds:
- `wear`: an accessory or outfit part (a hat, headphones, an apron's cloth painter, a moustache, a name tag),
- `char`: a full character preset (its makeChar options + its wear), e.g. a diner owner, a gym coach,
- `prop`: a hero prop or dressing object (a piggy bank, a rubber stamp, a treadmill, a menu board, a till),
- `set`: a whole place built as far as the camera looks (a diner counter wall, a gym floor), with its focus points,
- `fx` or `tex`: a reusable canvas texture or effect (a speckled floor, a cork board, a sign painter).
**Characters first:** every character that reads well in the stills is saved as a `char` preset, and every hat,
accessory and outfit painter as a `wear` piece. They matter most: they are what makes the next Short look like this
style. Then props, sets and textures.
Skip anything story-specific that can't be reused (a sign with this Short's joke can be kept only if its words are options).
Usually 4-12 pieces. Never keep anything the critics called broken.

## 2. Write each piece as a self-contained function
`lib/<kind>/<name>.js` (lowercase, underscores). It may use only the engine helpers that every Short includes (add,
outline, lam, canvasTex, rng, txt, specks, grain, paper, panelTex, card, pin, tape, aoStrip, wallBlob, blob, plane, makeChar,
clothTex, pocket, R, HX, TB, TH, onTorso, V, THREE, scene...) and must not depend on this Short's own variables.
Its first lines say what it is and how to call it:
```js
// @piece prop/piggy_bank: pink ceramic piggy bank with a coin slot and a pig logo; ~0.12 tall. Options: color, logo.
// usage: const pig = prop_piggy_bank({ color: '#F28BB0' }); pig.position.set(x, y, z);
function prop_piggy_bank(o = {}) { const g = new THREE.Group(); scene.add(g); ...; return g; }
```
- wear: `function wear_<name>(c, o = {})` adds to character `c` (its head or body) and returns the group.
- char: `function char_<name>(o = {})` returns the character from makeChar, dressed.
- set: `function set_<name>(o = {})` builds at `o.x || 0` and returns `{ g, F }` (F = named focus points for shots).
- Colours, words and sizes that a new story would change are options with this Short's values as defaults.
Next to it write `lib/<kind>/<name>.json`: `{"name", "kind", "desc": "one line", "tags": ["diner", "hat", ...],
"usage": "the one-line call", "from": "<this Short's title>"}` and a preview `lib/<kind>/<name>.png`: a crop of the still
that shows it best (`python crop.py s_10.60.png x y w h lib/prop/piggy_bank.png`, pixel box in the 1080x1920 still).

## 3. Prove it (not optional)
Copy `src/index.tpl` to `src/index_lib.tpl` and in the copy replace each extracted block with its `@lib kind/name` line
(put the `@lib` lines right after the engine includes the block needs, before first use) plus the call that rebuilds it with
this Short's options. Then run `python libcheck.py T1,T2,T3` with three still times that show the pieces. It must print
PASS (the rebuilt page looks the same and has no page errors). If it fails, fix the pieces (not the original) and re-run.
A piece you cannot make pass is deleted. Never change `src/index.tpl` itself.

## 4. Done
Write `lib/REPORT.json`: `{"pieces": ["kind/name", ...], "check": "PASS", "notes": "one line"}`. Reply with one line: done.
