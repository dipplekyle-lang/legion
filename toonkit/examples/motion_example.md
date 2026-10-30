# Worked example: smooth acting and named angles (`@kit motion`)

The finished example Short (`sandwich.tpl`) was built before the motion kit and still sets poses inside if-branches and places
every camera by hand. Learn its sets, cast, light and gags from it; learn the acting and the camera from THIS page. Every new Short
does it this way (SPEC section 190, BUILD.md step 3).

## 1. Include the kit
Right after the acting include (the `@@ a-b` line that holds lip / wStart / place / REST / walk), on its own line:

```
@@ 903-918
@kit motion
```

## 2. Acting: one key-pose timeline per character, built from the library
Write the timelines once, after WORDS is loaded (wStart needs the words), and call perform() in stage(t). Each move starts ON the
word it acts. Chain moves freely: each one takes over from wherever the last one had got to, so nothing ever pops.

```js
let OWNER, COOK;
function castActing() {
  OWNER = acting(
    move('rest', 0),
    move('talk', 0.4, { to: 2.3 }),                 // beat gestures on the long (stressed) words between 0.4 s and 2.3 s
    move('point', wStart('printer', 2)),            // the point lands on the noun
    move('shrug', wStart('maybe', 4), { left: true }),
    { t: wStart('ninety', 5), rh: V(-0.2, 0.74, 0.16), snap: 1, head: [-0.1, -0.15, 0] },   // a custom key: any field, any time
    move('cheer', wStart('sold', 7)),
    move('rest', 8.4));
  COOK = acting(move('arms', 0), move('listen', 1.2), move('no', wStart('never', 3)), move('think', 4.6), move('slump', wStart('closed', 9)));
}
// in stage(t), per character, then the story extras ON TOP:
place(own, 0.0, -0.33, 0.1);
perform(own, t, OWNER);                              // body, head, hands, feet, idle
own.head.rotation.x += 0.07 * imp(wStart('ninety', 5), 0.3);   // a nod on the stressed word, added after perform()
holdMenu(menuA, own);                                // props in the hand still use the character's hands as before
face(own, { eyes: 'open', brows: 'up', mouth: lip(t, 0.4, 2.3, 'smile') });
// in the words fetch at the end:  .then(w => { WORDS = w; castActing(); window.render(0); window.ready = true; })
```

Stress: Legion measures the voice, so each word in WORDS is `[start, end, word, stress 0..1, beat]` (beat = when its loudest
syllable starts). 'talk' gestures only on the stressed words, sized by the stress, the hand arriving on the syllable. For the
story's big actions use `wBeat('word', after)` instead of wStart (a punch, a slam, a head snap land on the syllable), and
`stressed(from, to)` lists the stressed words of a stretch, loudest first, for placing camera punch-ins and big hits.

The library: `rest talk point shrug laugh shock think wave nod no arms hips cheer slump reach give listen` (motion.js lists
each pose). `{ left: true }` mirrors a move to the other hand. Key fields: `lh rh lf rf` (hand / foot targets in body space),
`lean turn tilt dip bx bz`, `head: [x, y, z]`, `blend` (seconds, at least 0.18), `ant: 1` (wind-up before), `heavy: 1` (slow
out and in), `snap: 1` (fast arrival), `calm` (idle amount from here on), `finger: 'R'` + `fdir` (pointing).
Walking: ALWAYS `walkPath()` (never the old `walk()` sine, never sliding a character with `place()` while its feet cycle):
```js
const W = walkPath(own, t, [[0.0, 1.2], [0.35, 0.5], [0.4, -0.1]], wStart('walks', 3), wStart('counter', 5));
perform(own, t, OWNER, { walk: W });   // after the place() it replaces: walkPath places the character itself from the walk's start
```
The feet stay planted (the step is fitted to the path), the start and stop ease, the body bobs and sways, the arms swing, corners
are walked round. `o.until` hands the character back to your own place() later; `o.bounce` 1.5 jaunty / 0.6 trudge. Exits go
INTO depth (toward a door, away from the camera), not sideways out of a 9:16 frame.

## 3. Camera: named setups, curved moves
```js
const K = [
  { t: 0.00, how: 'cut', cam: ['low', { at: own }], push: 0.06, coc: 9, f: 'owner', look: 'day' },
  { t: 1.20, how: 'move', dur: 0.5, ease: 'inout', roll: 1.0, cam: ['ots', { at: cook, from: own }], push: 0.03, coc: 12, f: 'cook' },
  { t: 2.40, how: 'move', dur: 0.45, ease: 'out', roll: -1.2, cam: ['close', { at: own }], push: 0.03, coc: 13, f: 'owner' },
  { t: 3.10, how: 'move', dur: 0.4, ease: 'out', p: V(-0.45, 1.06, -0.36), l: V(-0.45, 0.6, -0.5), up: TOPUP, kind: 'top', push: 0.04, coc: 12, f: 'printer' },
  { t: 4.30, how: 'move', dur: 0.55, ease: 'inout', roll: 0.8, cam: ['wide', { at: own, side: -1 }], push: 0.04, coc: 9, f: 'owner' },
  { t: 5.60, how: 'move', dur: 0.3, ease: 'out', cam: ['insert', { at: V(0.0, 0, -0.02), h: 0.62 }], path: 'line', push: 0.02, coc: 16, f: 'plate' },
];
```
- `cam: [kind, options]` is resolved by the engine just before the first frame, with the cast placed where it stands when that shot
  lands (it runs stage() at that moment), so setups follow characters that move around. Kinds: wide, full, medium, close, low,
  high, top, profile, ots (`from`: the near character), pov (`from`), insert (`at` a point, `h` its height). `side: 1 | -1`
  picks the side of the face, `dist` / `lift` scale the distance and height. Setups are sized to the character's real height.
- Moves curve round what the camera looks at by themselves and step round anything in the way (decided once before the first
  frame, the same in every render part). `path: 'line'` keeps one straight (a push, an insert, a slide that must read straight).
- Hand-placed setups (`p`, `l`) are fine for set-specific shots: give them `kind` (`'top'`, `'insert'`, `'wide'`...) so check.py counts them.
- Plan sizes so they change every cut, and roughly one shot in four is off eye level; check.py's `variety` prints the mix.
