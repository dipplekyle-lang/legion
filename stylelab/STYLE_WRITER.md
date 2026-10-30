# The style writer: turn a finished study into the style's SPEC.md (Legion runs this by itself)

This folder is a style study: the reference Shorts in `refs/`, and everything the stylelab tools measured next to them
(`measure/`, `deep/`, `scenes/`, `hooks/`, `why/`, `env/`, `audio_*.json`, `motion_*.json`, `camera_curves.json`, `timeline.md`,
`busy.json`, `dof*.json`, contact sheets and strips; `study_run.json` says which tools ran). Your job: write the style down so
precisely that a builder who never saw the references can make new Shorts in the same style. Free, offline.

## 1. Read everything the study measured
Start with `STUDY_REPORT.md`: which tools measured what, and which did NOT run (with the reason). A section whose tool did
not run is measured by you from real frames, or says 'not measured' with what to look for; it is never filled with a guess.
`deep4/motion_layers.json` (how many things move at once, at what speeds, which words get a hit), `deep4/density.json`
(shapes and small details per frame) and `deep4/rows.json` (how repeated things shrink with depth) are here when the
references are drawn: use them for motion layering, illustration density and depth.
If `WIN_EDGE.md` is here, read it next to STUDY_REPORT.md: it is what this style's breakouts do differently from the same
channels' ordinary Shorts (measured, both sides), plus the pace per part (hook / middle / ending). Every difference in it is a
MUST rule: write it into its SPEC section (pacing, hook, script formula, voice) marked "MUST (breakouts vs ordinary)", and in
section 14 say why it wins. Section 4 gives the pace per part, not one average for the whole Short.
If `EYE_NOTES.md` is here, read it FIRST and in full: it is a person's frame-by-frame pass with measured corrections, and where
it says a detector misread this style, its numbers replace that detector's. Then read every JSON and MD file the tools wrote, and LOOK at the contact sheets, hook strips and spectrogram sheets. Then look at
real frames yourself: `ffmpeg -ss <t> -i refs/<id>.mp4 -frames:v 1 look_<id>_<t>.jpg` at moments the numbers point to (the
hook, a fast move, a group shot, an insert, the punchline). Numbers are the truth; your eye explains them.

## 2. Write SPEC.md
Numbered sections, the format of the example SPEC (read only its first 400 lines and headings for the format). Cover, each
with MEASURED numbers and the WHY next to every rule:
1. what the style is in one paragraph; 2. the script formula (hook length, sentence lengths, where the turn lands, how it
ends, words per second); 3. voice and sound (narration pace, pauses, music bed level and tempo, sound effects per second, what
each sound is used for, where they land against cuts and words); 4. pacing (shot lengths median / p90, cuts in the first 3 s,
how often the camera moves, holds, dissolves vs cuts); 5. camera (move types, speed profiles, ease in/out, overshoot,
roll/zoom habits); 6. composition and framing (shot sizes, where the subject sits, foreground, depth of field); 7. the look
(palette with hex values, light per place and mood, outline, texture/detail density, how busy a frame is); 8. characters (construction,
proportions, faces, outfits, how they act); 9. sets and props (built how far, dressing density, recurring motifs, hidden jokes);
10. on-screen text and captions (size, position, colours, words per caption, timing); 11. the hook (first 2 s, frame by frame);
12. KEEP vs CHANGE (what a new Short must keep identical, what is the creator's own: topic, words, characters, brand);
13. DON'T (what this style never does, plus Legion's banned list unless the references do it: random gradients, everything
fading in, glow on text, particle bursts, fake UI, two things fighting for attention);
14. WHY (from `why/` and your own look at the frames): for each kind of move, place, colour and camera choice, the reason in the
words it serves (acts the word, stresses the key word or number, shows the mechanism, changes the idea, keeps a hold alive, a
joke), with shares; what a move with no reason looks like in this style, so a builder can cut it;
15. the small truths a builder gets wrong unless told (look for each in the frames and write what THIS style does): everything
that stands, stands on the floor or a surface with a contact shadow (nothing floats); arms bend in one piece, never split at the
shoulder; a sleeper lies in a bed under a blanket, never a standing figure turned sideways; anything that runs or works is drawn
mid-motion (a mouse in its wheel runs); one focal point per frame; text sits on a plain area, never over a face.
Never put the reference channel's name, a real person's name or a video title in SPEC.md: call them ref-A, ref-B, ...
Write `Wrote SPEC.md (N lines)` to progress.txt.

## 3. The critic's reference stills
Pick four frames that show the style at its best and save them with ffmpeg as `ref_stills/medium_00.png` (a medium character
shot), `ref_stills/insert_00.png` (a prop or text insert), `ref_stills/group_00.png` (a group or wide shot) and
`ref_stills/gag_00.png` (the biggest moment), each 1080x1920 (scale and pad if needed). They stay on this computer.
Then the critic's BOARD and its hidden CONTROLS (the critic is calibrated with them): `ref_stills/board_01.png` ... `board_08.png`,
eight more real frames covering every kind of shot (a person, an insert, a crowd, a number, a place, a close-up, a transition
mid-way, the hook), from at least three different references; and `ref_stills/control_01.png`, `control_02.png`, two real frames
that are NOT on the board (other moments, other references). All 1080x1920, no burned-in captions where you can avoid them
(pick moments between caption words, or crop to the frame above the caption band and pad).
Then `critic_style.md`, three lines the critic reads (plain words, measured, no names):
`people: <how this style's people look: height in heads, head shape, eyes, nose, mouth, shading, how they act>`
`devices: <this style's own signature pieces that must never be mistaken for AI tells: its labels, plates, bubbles, faces, effects>`
`giveaways: <what would give away a copy of this style: the details a builder gets wrong>`
In SPEC.md, end with a "Rebuild first" list: these four frames (and any shot type the engine has never made), with what each
one proves. The builder's first build of the style rebuilds them with `stylelab/rebuild_check.py` (README section 2b) and turns
anything the engine cannot make into a new parameter or hook, so the style can make any frame, not just a few templates.

## 4. The engine and the style card
Decide which Legion engine can make this style:
- `toon`: 3D cartoon characters in small built sets, made in code (the Punchline engine: one rig with round white heads,
  outlines, depth of field, a camera that never stops). Only if the references really look like that family.
- `flat`: 2D flat vector illustration made in code (the flatkit engine): flat colour shapes, few or no outlines, simple
  geometric people, illustrated places in planes, infographic devices (zoom bubbles, labels, counters, charts), explainer and
  story Shorts. Free, and the strongest engine Legion has for any illustrated look that is drawn, not painted or photographed.
  Pick it whenever the references are vector illustration (2D, flat or gently shaded), even if they also show text and charts.
- `kinetic`: motion design and kinetic type made in code (no characters, words and shapes moving to the beat).
- `scenes`: everything else (painted, photographic, 3D-rendered or footage looks): AI pictures per scene.
Write `style_update.json`: `{"engine": "...", "look": "one dense sentence", "character": "...", "scenes": "...", "text": "...",
"hook": "...", "hook_examples": ["patterns, not the real lines"], "script_rules": "...", "pacing": "measured", "voice": "...",
"dont": "...", "transition": "whip | blur | cut", "kind": "voiceover | visual", "motion": {"cam": "drift | off", "trans": [...]}}`.
Concrete and visual; no real names. `motion` is for the code engines (flat, toon) and comes from the measurements: `cam` "drift"
when the references' camera is almost never locked (camera_curves, idle_measure: a slow drift or push in most holds), else
"off"; `trans` the linked transitions the references actually use, in their measured shares (e.g. ["pan", "carry", "zoom",
"pan", "reveal"]; from transition_vision), or "cut" / "dissolve" when that is what they do. The flat engine gives every shot
without its own transition the next one in this list.
Legion checks your work when you finish (every section, measured numbers, the stills, no names, a usable card) and sends back
anything missing for one more round, so do it right the first time.
Write `Done` to progress.txt and reply with one line: done.
