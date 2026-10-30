# Building one Toon Short (the procedure Legion's builder follows, every time)

You are building ONE finished vertical Short (1080x1920, 30 fps) as a three.js scene, in this folder, from the script
and voice timings in `BRIEF.md`. Nobody will help you; work through the steps in order. Free: no paid service is
used, no network, nothing outside this folder is changed.

After each step, append ONE short plain line to `progress.txt` (the creator sees it), e.g. `Read the style (4583 lines)`,
`Planned 31 shots`, `Stills checked, fixing 3`, `Critic 8/10`, `Rendering`.

## 0. Read the WHOLE style .md first (not optional)
The style's .md (path in `BRIEF.md`) is the law for every choice. Read EVERY line of it, start to end, in chunks of at
most 400 lines (Read with offset/limit), before you plan or write anything. Skimming, grepping or reading only parts is
how inconsistent Shorts happen: the .md files are not there for the air. Where sections disagree, the later
"overrides" or "corrections" sections win. Then write `Read the style (N lines)` to progress.txt.

## 1. Read the brief and the worked example
- `BRIEF.md`: the script, the beats, the length, the voice's word timings (also in `words.json` as [start, end, word]).
- `TASTE.md` (if present): the creator's own rules, learned from Shorts they rated. Never break one.
- `examples/sandwich.tpl` (a finished Short's template), `examples/sandwich_NOTES.md` (its plan), `examples/sandwich_script.txt`.
- `engine.html` is the shared engine (rig, outline and depth-of-field passes, shot system, effects). The example pulls it
  in with `@@ a-b` lines. Keep the SAME `@@` includes as the example; read the engine lines you include so you know the API
  (makeChar, pose, face, lip, wStart, place, card/pin/tape, FX, spark, hold, K shot keys, LOOKS/look).
- Learn the craft from the example, never its content: your Short gets its OWN world, motif, props, signs, hidden jokes,
  characters and names. Never copy the reference channel's or the example's scripts, characters, names or signs.

## 1b. The library (reuse first)
If `LIBRARY.md` exists, read it and Read the previews (`lib/<kind>/<name>.png`) of every piece that could fit your story:
sets, props, outfits (`wear`) and characters that already passed the critics in earlier Shorts. Pull a fitting piece in
with its `@lib kind/name` line (after the `@@` engine includes) and its usage call, changing only its options (colours,
words, sizes). APPROVED pieces come from Shorts the creator liked: prefer them. Build new only what the library lacks.
Never edit a piece file. List the pieces you reused in NOTES.md.

## 2. Plan (NOTES.md)
Write `NOTES.md` from the style .md and the script:
- the motif (one visual idea repeated across signs, props and dressing), the sets (built only as far as the camera looks,
  the "name wall" facing the main camera), the hidden jokes (a planted payoff visible from the first frame),
- the cast (one rig, colours and one accessory each; the lead has the darkest, most saturated outfit), dressed the
  approved way (see "The characters" under step 3),
- the shot list: EVERY camera move starts on a word start from `words.json` and lands on the noun; dissolves only for
  jumps in time or place; the hook packs moves in the first 3 seconds; the camera never stops,
- the camera grammar (creator 2026-10-30: "Legion has to know HOW to move the camera"): a CUT changes the setup, a MOVE stays
  with its subject. Write a `how: 'move'` only for one of these, and say which in NOTES.md: a push-in on a word the voice
  leans on (at most ~15 % closer), following a walk or a thrown thing, a reveal (a pan, tilt or pull-back that lands on the
  payoff), a turn from one character to the other inside the same setup. Getting from one side of the set to another is a
  cut, never a move (that is the spin that smears into blur). A move swings at most ~30 degrees round its subject, keeps the
  shot size (wide stays wide, a close-up stays close) and lasts
  0.5 s or more; Legion flies every move before rendering and turns one that is too big or too fast into a cut (camera.json
  `moves` lists each one with why: rewrite those shots yourself),
- who speaks: declare `window.SPEAK = [[t0, t1, char], ...]` for every quoted line (the times of its words in words.json) and
  give each makeChar a `name`. A speaker is in frame and faces the camera (within ~60 degrees: turn them toward the lens or a
  listener beside it, or frame them with camAt('close' / 'medium', { at: speaker })) for most of their line; a listener's
  reaction shot may take the rest. Every K entry lists who the shot is about: `who: [jan]` (Legion checks each is visible),
- variety (creator, 2026-10-27: "more scenes, more angles"): at least 2 places (3 when the Short runs over 35 s), each set
  seen from more than one side; plan every shot's SIZE and ANGLE in the list (wide / full / medium / close / insert; eye,
  low, high, top, over-the-shoulder, profile, POV) so the size changes on every cut, no setup repeats more than twice, at
  least 4 sizes appear and roughly one shot in four is off eye level (a low hero angle, a high look down, a top-down insert,
  an over-the-shoulder on a dialogue). Shots hold 1.4-2.5 s: calm, never a cut every second,
- the acting per beat (anticipation dip, the staggered shock, laughs, points, deadpan), lip sync on quoted lines,
- the light per place and time (day / night / an explanation board for the "You see" part).

## 3. Build (src/index.tpl, then `python assemble.py`)
Write `src/index.tpl` the way the example does: your header, the `@@` includes, then your own sets, props, cast, LOOKS
and look(), focus targets F, the shot list K, hold() and JOLTS, stage(t) with all acting, and at the end
`fetch('./words.json').then(r => r.json()).then(w => { WORDS = w; window.render(0); window.ready = true; });`
If the engine's stamp text or another engine line must change for your story, put it in `subs.json`
(`{"498": [["g.fillText('-80%', 0, 16)", "g.fillText('YOUR WORD', 0, 14)"]]}`), never edit engine.html.
**The characters (the approved look, not negotiable):** copy the example's cast code from `examples/sandwich.tpl`
(its `makeChar` calls with `res: 512`, its `cloth` painters, and its 3D hats and accessories: the peaked captain's hat,
the beanie with a pom, the cap brim, the fedora with a band, headphones, bandana knots, moustache, name tag) and change
only the colours, the words and which accessory each one wears. A new accessory is built the same way: separate 3D
pieces with outlines, hats sitting high with the brim just above the brows. Never a plain headband or a hair cap as the
only accessory on more than one character; no accessory on more than two characters. Heads stay PURE WHITE: no light
or LOOKS may turn a head beige or yellow (in the stills, a head's lit side must read near white). Crowds reuse the
example's customer designs in new colours, never one copy-pasted figure.
**Smooth acting and named angles (`@kit motion`, put it on its own line right after the acting include `@@ ...` that holds
   **Walks** use `walkPath()` (examples/motion_example.md): planted feet, eased starts and stops, never a character slid by
   place() while its legs cycle. **Depth**: build the far layer (8-20 m out) and a blurred edge foreground in ~60 % of shots; the
   engine's haze then makes the distance read. Faces stay lit at night (night colour goes into the set and rim, not the skin).
lip / wStart / place / REST / walk):** read `examples/motion_example.md` (the worked example: acting built from the move library
with `acting(move(...), ...)`, camera setups as `cam: ['low', { at: hero }]`) and `motion.js`'s header. The sandwich example
predates the kit: take its sets, cast, light and gags, never its if-branch acting or hand-placed cameras. Write each character's acting as a key-pose
timeline and call `perform(c, t, KEYS)` in stage(t) instead of if-branches that set a new pose: a branch switch makes the
pose jump on one frame, which is the stiffness viewers notice. perform() blends key to key with easing, lets the feet lead,
the head and hands trail and settle, adds anticipation (`ant: 1`) and weight (`heavy: 1`, `snap: 1` for a strike), and keeps
an idle running (breathing, a weight shift, a drifting head, floating hands) so nobody ever freezes. Story extras (a nod on a
word, a jolt on an impact, a prop in the hand) go on top after perform(). Build camera setups with
`...camAt('low', { at: hero })`, `camAt('ots', { at: listener, from: speaker })` and the other kinds: they frame by the
character and step around walls, counters and heads by themselves. Camera moves curve round what the camera
looks at by themselves (SPEC section 190) and are held to an operator's speed (governMoves in motion.js); write `path: 'line'` only for a move that must stay straight. Hand-placed `p`/`l` are fine for set-specific shots;
give those a `kind: 'insert'` (or the kind they are) so the check counts them right.
Run `python assemble.py`. Never put `//` followed by code on the same line. Watch geometry: a character faces +z,
its left is +x; BoxGeometry top-face texture top maps to -z (screen-up with TOPUP). Sets live far apart in world x.

## 4. Stills, then LOOK at every one
`python render.py --stills t1,t2,...` with one still per shot (a moment just after each move lands) plus the hook frame,
the last frame and one still halfway through each big camera move (moves curve round the subject by themselves and
step round anything in the way; if one still frames badly mid-move, give that shot `path: 'line'`). It prints page errors: fix every one. Then Read EVERY still yourself and fix, in one batch per round:
- the camera inside a head, a wall or a prop; a head or object blocking the subject; a face turned away from camera,
- mirrored or upside-down text, a hero prop out of frame, an empty or unfinished area, a prop floating or sinking,
- framing: heads no more than about a third of the frame height except on punchlines; vary shot sizes,
- hands touching what they hold or point at; the gag readable in one glance,
- no half-character cut by the frame edge in the foreground (unless it is a clear over-the-shoulder), no black or unlit
  blob blocking the view, at most 7 readable figures in a crowd shot on clear depth rows (scale the rest down or drop them),
- an insert fills most of the frame with its prop and the prop says something at a glance (big words, a clear picture),
- every close-up has a dressed, softly blurred background, never an empty wall; the whole head is in frame.
Re-render only the stills you changed. At most 3 rounds.
A style built from a study (not Punchline's approved cast): when a shot type is new to the engine, rebuild the real frame it
comes from on a study page first and check it with `python ../../../../stylelab/rebuild_check.py . study.html 1.0=<ref.png>`
(real | ours | where they differ). What the engine cannot make becomes a parameter or hook, never a one-off picture.

## 5. Numbers
`python check.py` prints colour, edge detail and depth of field per still against the style's targets. Fix what is
clearly off (brightness from the lights, not a global curve; darks stay coloured; detail by adding real dressing).
It also prints `variety` (from shots.json, written by the stills run): shots, setups, places, the size and angle mix. Fix
every FLAG before the critic: add or move setups with camAt(), change sizes between neighbours, take a scene to its second set.
And `camera` (from camera.json, also written by the stills run): which moves Legion slowed or turned into cuts, any smear,
every quoted line whose speaker is off screen, facing away or tiny, and every `who` missing from its shot. Fix every camera
FLAG before the critic: a cut it made means your move was really a cut (write it as one, or a smaller move); a speaker FLAG
means move the camera or turn the character, never cut the line short.

## 6. Critic (fresh eyes, not you)
Pick four stills: a medium character shot, a prop insert, a group shot, the biggest gag. Run three critics at once:
`python critic.py c1.json A B C D & python critic.py c2.json A B C D & python critic.py c3.json A B C D & wait`
(Bash timeout 600000). Take the median score. If below 8, a REAL fix round:
1. List every fix the critics agree on that is about THIS Short (framing, blocking, crowding, light, dressing,
   readability). Notes about the shared engine's character design are not yours to fix; ignore them. Every `story`
   entry with `shows_it: false` is a must-fix: the thing the voice names goes on screen, large and readable, in that
   shot (and in the other shots of the same line). The critics judge craft only; never move your story into the
   reference's place or copy its props.
2. Change `src/index.tpl` for each one, `python assemble.py`, and re-render THE SAME four stills (same times).
3. Read each new still and confirm every listed fix is visible. A fix you can't see didn't happen: do it again.
4. Run the three critics again on the new stills. Up to 2 fix rounds; stop early at a median of 8.
Write `Critic N/10` to progress.txt after each round (the creator sees the score climb).

## 7. Sound cues (cues.json), from the creator's own sound pack
Legion mixes the sound; you say where and which. Use ONLY files from the creator's pack: `sfx_catalog.txt` lists every
one as `Folder/File.mp3`, grouped by what it is for, with how long it rings (Legion measured each one). Write `cues.json` as `[[seconds, "Folder/File.mp3", volume], ...]`, the way the approved
restaurant Short did (`examples/sandwich_cues.json`, read it): about 0.7 per second (creator 2026-10-30: a buyer's 62 sounds in 34 s read as
glitches), each on the exact frame of its action: the story sounds and the gag first, a whoosh only on a real camera move or
something flying, never a sound on every cut or every word, and a breath of quiet just before the punchline; volume 0.15-0.25 for whooshes and small pops, 0.25-0.35 for story sounds, 0.4-0.45 for the big hit. Match the
sound to what the picture does: a swipe or swoosh on a camera whip, a pop when something appears, a cha-ching or
register on money, a ding or shine on a realisation, a bass impact plus a comedy sound on the gag, foley for real
objects (a stamp, a camera, paper, a pencil). Never the same file twice in a row. Legion trims each sound's silence,
cuts it at the next picture cut and fades it, and puts the style's own pluck bed under the voice.

## 8. Render
`python render.py --render` (Bash timeout 600000; it renders up to 8 parts at once and joins them into `toon.mp4`). Then `python sync_check.py --fix`: it finds where the picture really moves and snaps every sound cue that is 1-5 frames off onto its visual hit (sound lands on the exact frame, not near it); a cue it lists with no hit near it has no visual event: give it one or drop it. Then
grab a contact sheet (`ffmpeg -i toon.mp4 -vf "fps=1,scale=180:320,tile=10x3" -frames:v 1 sheet.jpg`), Read it, and make
sure nothing is broken. Finally write `result.json`:
`{"video": "toon.mp4", "shots": [every K t], "critic": median, "notes": "one line on what you made"}`.

Budget: aim to finish within about 50 minutes. Never stop with a half-built folder: if time runs short, render what passes. The critic round is never skipped: three critics, median 8, before the full render.
