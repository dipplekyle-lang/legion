# stylelab: study a reference channel down to the pixel, then build its style

This is the method behind Legion's Punchline style (its study is `toonkit/styles/toon/SPEC.md`, 4,589 lines). Use it
to study ANY channel a creator wants to learn from. The rule that makes it work: never invent from a blank page,
measure everything with code, and write every number down in one `SPEC.md` that the builder reads in full every time.

## 0. The study folder
Make `output/short_styles/<style>/` with the reference Shorts in `refs/<id>.mp4` (yt-dlp, 4-10 Shorts that nail the
style) and optionally `titles.json` (`{"<id>": "what it is about"}`). Point the tools at it:

    set STYLELAB=output\short_styles\<style>

Every tool reads `refs/` and writes its measurements next to it. Legion's brain is used by the `*_vision` and
`why_label` tools (free on the creator's Claude plan).

## 1. Measure (automatic, any channel)
| Tool | What it measures | SPEC part it feeds |
|---|---|---|
| `measure_all.py` | words + timings, words/s, motion per frame, near-still share, cuts vs camera moves, palette, audio hits | 1, 20 |
| `deep_measure.py` | per video, deep: shots, layering, colour, sharpness, crops for the eye pass | 12-14, 20 |
| `scene_measure.py` | shots between transitions, asset density per shot, contact sheets | 12-14, 42 |
| `scene_vision.py` | the brain names every shot's type, set and purpose from the sheets + narration | 13, 40 |
| `kit_vision.py` | sets built from scratch or from a kit; how nature is painted | 42-48 |
| `camera_light_vision.py` | camera, lens, layering, lighting and character construction per shot | 37-38 |
| `timeline.py` | half-second timeline: speech, camera, colour, sharpness | 30, 36 |
| `script_stats.py` | sentence lengths, hook length, where the turn lands, connectives | 2, 9 |
| `hook_study.py` | the first seconds of every video as one strip + the brain's read | 2, 60 |
| `why_measure.py` + `why_label.py` | the WHY: light/colour/motion per sentence vs its story role and emotion | 21, 27, 30 |
| `dissolve_check.py` | which transitions are cross-dissolves | 18, 25, 32 |
| `env_measure.py` | environment materials, clutter, colour structure (1 frame/s) | 71+ |
| `motion_study.py` + `camera_curves.py` | camera moves frame by frame: speed profile, ease, overshoot, roll | 6, 35 |
| `audio_study.py` + `sfx_study.py` | voice pace/pauses, music bed level/tempo, sound-hit onsets by band | 3, 163 |
| `density_measure.py` | how FULL each frame is (flat shapes, small details, inner detail, bald cells, corners) over every sampled frame; join it with the shot inventory to learn WHEN a style goes busy or sparse (`python density_measure.py out.json <frames dir>`) | density section (cosmic-explainer 21) |
| `busy.py`, `dof_ratio.py` | edge density per region and depth of field, theirs vs ours (`python busy.py <our stills>`) | 112, 173 |

## 2. Probe (by hand, at points you choose)
`probes/` holds the point-by-point tools: outline thickness and line colour (`edge_measure`), materials (`env_crops`),
face construction (`face_measure`, `char_vision`), light direction on heads (`light_measure`), frame-by-frame effect
sheets (`fx_sheets`, `fx_extra`), measuring grids (`grid`, `body_grid`). Their lists of (video, second, point) are the
worked examples from the Punchline study (videos ref-A..F): replace them with moments from your own references.

## 2b. Rebuild real frames (the proof it is not a template)
A style is learned when its engine can rebuild ANY of its frames, not when it has a few pieces that look alike. Pick 3-4 real
frames that matter (a person, a prop insert, a wide or crowd shot, the biggest moment), rebuild each on a study page with the
engine's own pieces (parameters and draw hooks, never a traced or pasted picture), and check them:

    python stylelab/rebuild_check.py <build dir> <page.html> 1.0=<ref1.png> 3.0=<ref2.png> --out <study>/rebuild

It renders the page's stills and gives, per frame, real | ours | a heat map of where they still differ, a colour score
(mean delta E), a shape score (edges that line up) and the worst cells to fix first. Fix the worst cell, run it again, and
zoom 2x on faces and hands. Whatever the engine could not make becomes a new parameter or hook in the engine (so every later
Short can make it), and the measured rule goes into the SPEC. The scores are a guide, your eyes at full size decide.

## 3. Write the SPEC.md
One file, numbered sections, every claim a number or a measured rule, and the WHY next to it. Corrections go in later
sections that say they override earlier ones. Keep a KEEP (identical) vs CHANGE (ours) list. Never put the reference
channel's name or a real person's name in the style text that ships.

## 4. Build and judge
Build on `toonkit/` (engine, BUILD.md procedure, check.py numbers, critic.py fresh-eyes critic) or another engine,
stills first, numbers and a critic that didn't build it, 8/10 before a full render. Sound cues are cut at the next
picture cut by `sfx.render` (sound intelligence) for every style.
