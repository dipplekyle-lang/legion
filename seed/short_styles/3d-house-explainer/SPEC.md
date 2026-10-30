# Style study: "If you [do a home thing] in your yard, you have a [big thing]" 3D diorama explainers (6 references, measured)

References are called ref-A .. ref-F (ref-A 65.4 s, ref-B 91.0 s, ref-C 83.6 s, ref-D 100.0 s, ref-E 91.6 s, ref-F 91.2 s; all 1080x1920, 30 fps).
Everything below is MEASURED by the study tools or read off real frames. Where a detector found nothing it says so.
`measure/`, `deep*/`, `scenes/`, `hooks/`, `why/`, `env/`, `nature/` hold the raw numbers.

## 1. What the style is (one paragraph) and the numbers that define it

A narrated Short that turns a huge thing (a reactor, an oil well, a drive-thru, a levee, a White House, an armored truck) into
a home project: the viewer starts in an ordinary suburban backyard, a hole is dug, and the thing is "built" layer by layer
inside a soil CUTAWAY (a diorama block: grass on top, cross-section of brown ground below, the neighbour house behind). Every
noun the voice says appears as a small 3D rendered object on that block; a camera that almost never stops whips, pushes and
zooms from beat to beat. One word of caption at a time, dead centre. A blunt male narrator at ~3 words/s with no gaps, a low
sound-effect layer (boom / thump / click) hitting inside words, and a closing line "Congratulations, you have built a ___."
It is a 3D rendered look (soft sun, baked textures, no outlines, glossy plastic props), NOT a flat-vector or cartoon-rig look.

| Measure | Value (6 refs) | Why it matters |
|---|---|---|
| Length | 65.4 - 100.0 s (median 91) | 180-220 narrated words; one idea chain per Short |
| Words per second | 2.83, 3.27, 2.93, 3.12, 3.03, 3.26 (mean 3.07) | fast, never rushed; the picture changes every 1-2 s to keep up |
| Shot length (223 shots, scene detector) | median 1.70 s, p90 4.42 s, mean 2.33 s | a new picture roughly every 2nd phrase |
| Hard cuts per video | 3, 3, 7, 0, 2, 40 (ref-F is the odd one: 40 short cuts, 0.55 fast camera moves per 10 s) | the style is continuous camera moves, not cuts |
| Camera transitions per video | 25, 55, 61, 38, 28, 23 | movement IS the edit |
| Frames with NO mover at all | 52%, 53%, 48%, 48% (ref-A..D) | half the time only the idle life + camera drift move: calm between hits |
| Things starting to move per second | 1.9, 5.0, 6.3, 2.4 (ref-A..D) | bursts on beats, quiet between |
| Captions | one word, ~3 per s (one per spoken word) | see section 10 |
| Sound effects per second | 1.28, 1.34, 1.58, 1.30, 1.43, 2.04 | steady low layer, see section 3 |
| Loudness | -14.1 LUFS integrated on all six, LRA 2.8-3.4 LU | loud, flat, ready for feeds |

### Per-video numbers (measured; `measure/`, `scenes/shots.json`)

| ref | seconds | words | words/s | first word | last word end | long pauses >0.3 s | hard cuts | camera transitions | median motion | near-still share |
|---|---|---|---|---|---|---|---|---|---|---|
| ref-A | 65.4 | 185 | 2.83 | 0.0 s | 64.08 s | 5 | 3 | 25 | 3.71 | 0.226 |
| ref-B | 91.0 | 298 | 3.27 | 0.0 s | 89.74 s | 3 | 3 | 55 | 3.35 | 0.132 |
| ref-C | 83.6 | 245 | 2.93 | 0.0 s | 82.16 s | 7 | 7 | 61 | 3.74 | 0.203 |
| ref-D | 100.0 | 312 | 3.12 | 0.0 s | 99.06 s | 3 | 0 | 38 | 3.98 | 0.137 |
| ref-E | 91.6 | 278 | 3.03 | 0.0 s | 90.62 s | 4 | 2 | 28 | 5.89 | 0.168 |
| ref-F | 91.2 | 297 | 3.26 | 0.0 s | 90.76 s | 4 | 40 | 23 | 1.85 | 0.304 |

Reading: every ref starts speaking at 0.0 s (no pre-roll) and stops speaking a little before the last frame; the near-still share (frames whose frame-to-frame change is near zero) is the lowest-motion measure per video, so even the calmest Short is moving most of the time.

## 2. Script formula

- **Hook = one long conditional sentence**, 17, 46, 31, 17, 22, 16 words (median 19.5; 3.8 to 11.4 s), 12-16 words inside the first 3 s.
  The template (from `hooks/analysis.json`): `If you [dig / grill / put / lock / do ordinary thing] in your [yard / house / pickup], [and it does a dangerous or absurd thing / you have BIG THING].`
  Examples as patterns: "If you dig a hole in your yard, fill it with X, and it blows up." / "If a flood is coming and you dig a ditch around your house, you have a moat." / "If robbers want your cash and you lock it in your pickup, you have an armored truck."
  Why: a normal chore turns into a catastrophe or an industry inside 4 s; the viewer wants the missing steps. The hook is understood by 1.0-2.5 s (the picture shows each noun as it is said).
- **Body = a chain of "but / so / and" problems.** Each problem is one fact that is shown as an object ("the meter maxed out" = a gauge; "the core melts into lava" = a lava slab; "steel arch taller than the Statue of Liberty" = an arch over the house). Sentence length median per video: 8, 16, 15.5, 10.5, 12, 10 words (131 sentences labelled; longest 46 words is the hook of ref-B). Questions are rare: 3 of ~131 sentences.
- **Story roles of the 223 shots**: explanation 37%, consequence/shock 30%, scheme/secret 11%, hook 10%, comedy beat 4%, punchline 2%, hope 2%, temptation 2%, waiting/tension 1%.
- **Myth-bust beat** ("Most people think it was painted white to hide fire damage. It wasn't. ...") seen in ref-A and ref-E (2 of 6): a short wrong belief, a 2-word denial, the true reason.
- **Ending, 6 of 6 identical in shape:** "Add [A], [B], and [C]." then **"Congratulations, you have built [the big thing]."** Last sentence 6-8 words. The payoff is the last word, the name of the thing. Ref-A ends on a dry joke before it ("a lot of very happy wolves").
- Numbers are spoken as exact figures and shown as a prop, not as a text overlay (a "3.6 R/h" gauge, "2000" on the screen only as a one-word caption).
- Why this works: the whole Short is one "if X then Y" question answered step by step; every sentence adds a part to the build, so the viewer never waits for the point.

## 3. Voice and sound

- **Narrator:** one male voice, fundamental 140-147 Hz, flat and confident, no music-bed voice, delivered continuously: median gap between words 0.0 s, 84% of gaps under 60 ms (ref-A), p90 gap 0.26 s. Pauses over 0.3 s: 3 to 7 per video (measure/), only at a sentence end before a turn ("...for 10 days." "...into the sky."). Pace per tenth of the video swings 2.0 to 3.8 words/s: slower on a heavy fact, faster on the run of consequences.
- **Voice level** about -14 dB RMS in the mix; **music bed** ~15 dB under the voice (ref-A 15.4, ref-B 13.7, ref-F 17.0); `voice_minus_gap` 9-14 dB. The bed is low, dark, near-steady drone: centroid 540-1200 Hz, 27-74% of its energy under 250 Hz. Tempo estimates are unreliable here (tempo confidence 0.06): NOT MEASURED; do not cut to a beat grid, cut to words.
- **Sound effects:** 84, 122, 132, 130, 131, 186 events = 1.28 / 1.34 / 1.58 / 1.30 / 1.43 / 2.04 per s. Kinds (counts, all refs): boom 255, thump 261, click 230, impact 20, mixed 19. **86-96% land INSIDE a spoken word, only 1-14% land on a picture cut (within 80 ms).** So sounds are tied to what a word shows (a click for a part snapping on, a thump for a block landing, a boom for a blast or a heavy reveal), never to the cut itself. SFX bed sits 8.6 to 14.6 dB under the voice.
- A flash / explosion is the only place the whole mix jumps: white-orange flash at "blows up" (ref-A 55.6 s, 49.0 s) with a boom and a muffled beat after.
- Why: the sound is the "this is real" layer under a plain voice; hits in words make the object feel placed by the narrator's sentence.

### Per-video audio (measured; `deep3/audio_*.json`, `deep3/sfx_*.json`)

| ref | LUFS | LRA | true peak dBFS | gap median | gap p90 | gaps <60 ms | voice minus gap dB | bed centroid Hz | bed <250 Hz | SFX | SFX/s | inside a word | on a cut | SFX bed vs voice dB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ref-A | -14.1 | 3.4 | -0.7 | 0.0 | 0.26 | 0.84 | 10.8 | 832 | 0.41 | 84 | 1.28 | 0.86 | 0.08 | -9.7 |
| ref-B | -14.1 | 3.0 | -2.0 | 0.0 | 0.04 | 0.9 | 10.7 | 630 | 0.66 | 122 | 1.34 | 0.91 | 0.02 | -11.0 |
| ref-C | -14.1 | 2.8 | -0.6 | 0.0 | 0.22 | 0.88 | 12.0 | 1199 | 0.27 | 132 | 1.58 | 0.87 | 0.14 | -11.4 |
| ref-D | -14.1 | 2.8 | -1.8 | 0.0 | 0.22 | 0.87 | 13.8 | 785 | 0.47 | 130 | 1.3 | 0.96 | 0.01 | -14.6 |
| ref-E | -14.1 | 3.1 | -1.7 | 0.0 | 0.128 | 0.9 | 9.2 | 537 | 0.74 | 131 | 1.43 | 0.94 | 0.02 | -8.6 |
| ref-F | -14.1 | 3.0 | 0.8 | 0.0 | 0.2 | 0.89 | 13.1 | 661 | 0.48 | 186 | 2.04 | 0.94 | 0.05 | -14.5 |

Sound-effect kinds per video:

| ref | boom | thump | click | impact | mixed | audio tail after last word (s) | stereo side vs mid dB |
|---|---|---|---|---|---|---|---|
| ref-A | 20 | 31 | 28 | 4 | 1 | 1.28 | -17.5 |
| ref-B | 29 | 42 | 46 | 1 | 4 | 1.27 | -18.1 |
| ref-C | 51 | 44 | 34 | 1 | 2 | 0.38 | -19.2 |
| ref-D | 46 | 46 | 32 | 3 | 3 | 0.82 | -21.7 |
| ref-E | 30 | 50 | 44 | 3 | 4 | 0.73 | -17.1 |
| ref-F | 79 | 48 | 46 | 8 | 5 | 0.46 | -20.4 |

Voice pace per tenth of the video (words per second):

| ref | 0-10% | 10-20% | 20-30% | 30-40% | 40-50% | 50-60% | 60-70% | 70-80% | 80-90% | 90-100% |
|---|---|---|---|---|---|---|---|---|---|---|
| ref-A | 3.7 | 2.3 | 2.8 | 3.2 | 2.6 | 3.8 | 2.8 | 2.3 | 2.9 | 2.0 |
| ref-B | 4.3 | 3.2 | 3.5 | 3.3 | 2.8 | 3.4 | 3.2 | 3.6 | 3.1 | 2.4 |
| ref-C | 3.6 | 3.0 | 2.3 | 3.1 | 2.6 | 2.8 | 3.5 | 3.2 | 3.2 | 2.0 |
| ref-D | 3.7 | 3.2 | 3.3 | 3.1 | 3.3 | 3.1 | 3.2 | 3.0 | 3.3 | 2.0 |
| ref-E | 3.9 | 3.3 | 3.0 | 3.2 | 3.1 | 2.8 | 3.0 | 3.3 | 2.8 | 2.1 |
| ref-F | 3.6 | 2.3 | 3.3 | 3.3 | 3.5 | 3.3 | 3.7 | 3.4 | 3.4 | 2.7 |

Rules from the tables: (1) the mix is -14 LUFS with a roughly 3 LU range, so do not duck the voice for effects; (2) the effect bed stays well under the voice and never competes with it; (3) effects belong inside a word, not on a cut; (4) the audio tail after the last word is short, so end the Short soon after the last word.

## 4. Pacing

- Shot length median 1.70 s, p90 4.42 s (mean 2.33 s); the shot is a camera path, not a still, so one shot often holds 2-3 beats (ref-A shot 1 lasts 13.3 s as the camera moves down the cutaway while 5 sentences go by).
- **First 3 s: 12-16 words, 0-4 camera moves** (ref-A 1, ref-B 1, ref-C 3, ref-D 4, ref-E 1, ref-F 0); first shot 1.7, 2.6, 1.3, 1.2, 0.7, 6.6 s. First-shot density is 1.06-1.62 times the video average: the hook picture is the busiest.
- Transition types (143 named frame by frame, `deep4/transitions.json`): whip 27% (median 0.9 s), element-move 26% (0.33 s: the camera stays, content changes), zoom-into 10% (0.84 s), push 10% (0.67 s), carry 8% (0.18 s: something leads the eye into the next shot), dissolve 5% (0.33 s), zoom-in 4%, flash 4% (0.52 s), zoom-out 2%, morph 1%. **Blur on 55% of them.** Directions: down 26, left 23, in 20, right 15, up 15, out 5, none 39.
- Dissolves per video: 5, 9, 11, 2, 2, 6; they are 2-5 frames (0.13-0.5 s), used only at a time jump ("years later", "one day"), never between neighbouring beats.
- Why: the viewer always has something moving into place; a hard cut would break the "same backyard" feeling. Cuts are used for the odd one out (ref-F: 40 hard cuts between locked-off views, 6.58 s first shot).

### Shot lengths per video (scene detector, `scenes/shots.json`, 223 shots)

| ref | shots | min | median | mean | p90 | max | shots under 1 s | shots over 4 s |
|---|---|---|---|---|---|---|---|---|
| ref-A | 22 | 0.36 | 2.28 | 2.93 | 4.09 | 13.33 | 3 | 4 |
| ref-B | 53 | 0.38 | 1.58 | 1.70 | 3.05 | 4.42 | 15 | 2 |
| ref-C | 60 | 0.35 | 1.29 | 1.38 | 2.03 | 4.30 | 15 | 1 |
| ref-D | 37 | 0.52 | 2.45 | 2.69 | 4.42 | 7.95 | 2 | 6 |
| ref-E | 29 | 0.55 | 2.00 | 3.16 | 5.65 | 12.01 | 7 | 9 |
| ref-F | 22 | 0.43 | 3.16 | 4.12 | 9.11 | 18.14 | 3 | 9 |
| all | 223 | 0.35 | 1.70 | 2.33 | 4.42 | 18.14 | 45 | 31 |

Shot length by position in the video (10 buckets; median seconds):

| bucket | median shot (s) | shots |
|---|---|---|
| 0-10% | 1.32 | 23 |
| 10-20% | 1.55 | 26 |
| 20-30% | 1.36 | 27 |
| 30-40% | 1.73 | 23 |
| 40-50% | 2.25 | 21 |
| 50-60% | 1.74 | 19 |
| 60-70% | 1.60 | 22 |
| 70-80% | 1.73 | 22 |
| 80-90% | 1.28 | 21 |
| 90-100% | 2.04 | 19 |

Why: the table shows where the picture is held longer and where it speeds up; a builder paces a new Short by the same curve, not by a flat average.

### Camera transitions per video (named frame by frame, `deep4/transitions.json`)

| ref | named | types (count) | with blur | median duration (s) | directions |
|---|---|---|---|---|---|
| ref-A | 24 | whip 8, carry 7, element-move 3, flash 3, push 1, zoom-in 1, zoom-into 1 | 11 | 0.77 | none 12, down 3, left 3, up 2, right 2, in 2 |
| ref-B | 24 | whip 11, carry 4, zoom-in 2, zoom-into 2, zoom-out 1, dissolve 1, morph 1, push 1, element-move 1 | 20 | 0.55 | down 10, up 5, in 4, none 3, out 1, left 1 |
| ref-C | 24 | element-move 10, whip 7, flash 3, zoom-out 1, zoom-into 1, zoom-in 1, dissolve 1 | 17 | 0.40 | left 6, in 5, none 5, up 3, down 3, right 1, out 1 |
| ref-D | 24 | whip 7, zoom-into 7, element-move 5, push 4, zoom-out 1 | 14 | 0.79 | none 5, left 5, in 4, right 3, down 3, out 3, up 1 |
| ref-E | 24 | element-move 6, push 6, whip 5, zoom-in 2, zoom-into 2, dissolve 2, other 1 | 9 | 0.76 | right 6, none 5, left 4, down 4, in 3, up 2 |
| ref-F | 23 | element-move 12, dissolve 3, other 3, zoom-into 2, push 2, carry 1 | 7 | 0.23 | none 9, left 4, right 3, down 3, in 2, up 2 |

### Motion rhythm per video (half-second timeline, `timeline.md`)

| ref | half-seconds | with a camera move (M) | with a dissolve (D) | holds (.) | motion median | motion p90 | calm half-seconds (motion < 20) | half-seconds with a pause after a word |
|---|---|---|---|---|---|---|---|---|
| ref-A | 131 | 49 | 5 | 77 | 45 | 175 | 38 (29%) | 17 |
| ref-B | 182 | 85 | 13 | 84 | 52 | 185 | 37 (20%) | 11 |
| ref-C | 167 | 81 | 17 | 69 | 59 | 219 | 35 (21%) | 15 |
| ref-D | 200 | 99 | 2 | 99 | 50 | 173 | 49 (24%) | 18 |
| ref-E | 183 | 66 | 2 | 115 | 64 | 198 | 44 (24%) | 12 |
| ref-F | 182 | 28 | 8 | 146 | 30 | 81 | 63 (35%) | 11 |

Reading: motion is bursty. Motion above 100 means a whip or a blast, below 20 means the picture is settled and the narrator carries it.

## 5. Camera

- Camera is a real 3D camera in a built diorama (perspective, parallax, depth of field), tracked 100% of frames (ref-A).
- **Calm drift, always on:** median 0.05 - 0.09 % of frame width per frame; 40-48% of calm frames under 0.05 %, 60-89% under 0.15 %. Zoom while calm: 60%, 86%, 93%, 60%, 41%, 68% of holds drift IN (ref-E is the exception: 41% in / 39% out). Roll in calm: 0.005-0.023 deg per frame (almost level). Nothing is ever a locked frame.
- **Fast moves:** 24, 51, 54, 44, 26, 5 per video = 3.7, 5.6, 6.5, 4.4, 2.8, 0.55 per 10 s (typical 4-6). Camera speed p50 0.01-0.02, p90 0.16-3.4, p99 2.0-34.7 % of width per frame. A move is a 0.5-1.5 s event (ref-A: 0.5, 0.63, 0.77, 1.03, 1.16, 1.17, 1.2, 1.5 s).
- Speed profiles are not smooth S-curves: **"snap then settle, repeated"** (fast, slow, fast, slow) on whips; a single quick ease-out (peak at frame 1-10, then 20-40 frames of settling) on a drop-in; a slow ease-in ending in a fast end on a "carry" (ref-A 13.9 s). Overshoot on a settle is tiny (0.25 %); zoom per move 14-31 % in total.
- Moves seen: **tilt down into the ground** (the "dig" reveal, 2.5 s in ref-B), **whip pan** with directional blur, **push-in on the word**, **zoom-into a prop** (gauge, lava slab, a window), **pull back to a high aerial** (ref-D moat at 2.75-3.75 s), handheld-looking jitter at the opening of ref-C (3 camera moves in the first 3 s).
- Heights: low and close to the grass for hooks (the lawn fills the bottom third), eye-level on the cutaway for explanations, high and top-down only for a "whole property" overview (moat, levee).
- Why: the camera follows the word: down for "dig / underground", up for "taller / sky", in for the fact that matters, out for the scale joke.

### Camera per shot (`deep3/motion_*.json`, tracked shots only)

| ref | tracked shots | zoom per shot median % | zoom max % | idle drift median %/frame | still frames median | roll per shot median deg | moves | peak speed median %/frame | time to peak median | settle frames median | overshoot median % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ref-A | 11/11 | 5.6 | 87.8 | 0.067 | 0.71 | 2.08 | 26 | 4.21 | 0.51 | 1 | 0.00 |
| ref-B | 30/49 | 0.9 | 104.5 | 0.062 | 0.81 | 0.72 | 39 | 8.28 | 0.50 | 0 | -0.00 |
| ref-C | 49/51 | 2.4 | 66.4 | 0.075 | 0.83 | 0.55 | 59 | 5.93 | 0.58 | 0 | -0.00 |
| ref-D | 13/16 | -9.6 | 191.8 | 0.079 | 0.67 | 3.51 | 45 | 4.72 | 0.38 | 2 | 0.00 |
| ref-E | 6/6 | 63.8 | 102.7 | 0.080 | 0.47 | 6.84 | 30 | 3.54 | 0.43 | 8 | -0.00 |
| ref-F | 43/45 | 6.1 | 12.4 | 0.074 | 1.00 | 0.78 | 10 | 1.06 | 0.46 | 6 | 0.00 |

Camera set-ups named from frames (`scenes/cam_*.json`):

| ref | height | tilt | lens | subject distance | render |
|---|---|---|---|---|---|
| ref-A | low 15, high 6, eye 1 | level 12, down 6, up 4 | wide 21, normal 1 | medium 16, close 5, wide 1 | 3d 22 |
| ref-B | eye 28, low 22, high 2, floor 1 | level 42, up 6, down 5 | normal 29, long 16, wide 8 | medium 21, close 21, wide 9, extreme close 2 | 3d 53 |
| ref-C | low 28, eye 16, high 16 | level 39, down 16, up 5 | wide 50, normal 10 | close 30, medium 23, wide 6, extreme close 1 | 3d 60 |
| ref-D | low 11, eye 9, high 7, top-down 7, chest 3 | level 19, down 7, down-steep 7, up 4 | wide 22, normal 15 | medium 21, wide 7, close 7, extreme close 2 | 3d 37 |
| ref-E | low 16, chest 8, eye 5 | level 23, up 6 | wide 20, normal 9 | medium 12, wide 8, close 8, extreme close 1 | 3d 29 |
| ref-F | low 17, chest 5 | level 21, up 1 | wide 14, normal 8 | close 12, medium 4, wide 3, extreme close 3 | 3d 22 |

Transition speed (`deep4/transitions.json`):

| ref | moves | median peak speed % per frame | fastest % per frame | median dx / dy |
|---|---|---|---|---|
| ref-A | 24 | 7.1 | 63.2 | 0.0 / 0.0 |
| ref-B | 24 | 11.1 | 87.8 | 0.0 / 0.1 |
| ref-C | 24 | 5.5 | 33.9 | -0.1 / -0.2 |
| ref-D | 24 | 5.1 | 53.7 | 0.1 / 0.1 |
| ref-E | 24 | 9.5 | 248.7 | -0.2 / -0.2 |
| ref-F | 23 | 0.7 | 15.3 | 0.0 / 0.0 |

Why: the speed profile is what makes the world feel like a filmed miniature; copy "snap, then settle" and the tiny overshoot, not a smooth S-curve.

## 6. Composition and framing

- Vertical 9:16. The **ground line (cut edge of the soil block) sits in the lower half**, typically y 0.60 - 0.75 of the frame; soil texture fills the bottom 25-35%; sky + house fill the top. Brightness by quarter, top to bottom: ref-A .61/.51/.52/.52, ref-B .60/.53/.49/.48, ref-C .67/.62/.60/.55, ref-D .54/.47/.47/.40, ref-E .67/.62/.59/.53, ref-F .69/.68/.58/.50. The frame is lighter on top and darker toward the soil.
- Shot size by what the shot is: establishing wide (house + cutaway) ~30%, insert / big prop close-up (gauge, beam, lava slab) ~25%, diagram-like cutaway of one object ~25%, aerial / whole place ~10%, character beat (gnome, car, truck) ~10%.
- **The subject sits at the cut edge, centred or one third in, and fills 0.27 - 0.87 of the frame** (obj share in `deep4/density.json`). Inserts leave the background empty on purpose (the red beam shot has 69% plain sky, "thousands of times higher").
- Centre band sharper than top and bottom bands: sharpness centre vs edges about 3.7x (ref-A 1013 / 272, ref-B 1160 / 474, ref-F 1448 / 350): gentle depth of field and edge blur, strongest on whips.
- A busy frame has a median of 270 colours, edge density 0.069 (p25 0.038, p75 0.112), detail 3.75; shot density median 0.52 (0.34 on calm shots, 0.79 on the hook shot).
- Shot types (study-wide, `deep4/construct_pick.json`): creature/mascot, crowd/grid, person full / medium / close, name banner, big number, zoom bubble, body diagram, map or globe, place scene, dark-glow scene, metaphor scene. Most videos use 3-6 of these, not all.

### Frame density per video (`deep4/density.json`)

| ref | frames | shapes median | small details median | edge density | empty share | colours median | subject share median | border share median |
|---|---|---|---|---|---|---|---|---|
| ref-A | 30 | 34 | 21 | 0.073 | 0.229 | 34 | 0.51 | 0.49 |
| ref-B | 30 | 40 | 32 | 0.147 | 0.104 | 26 | 0.72 | 0.69 |
| ref-C | 30 | 36 | 15 | 0.065 | 0.271 | 30 | 0.50 | 0.58 |
| ref-D | 30 | 40 | 27 | 0.105 | 0.125 | 34 | 0.45 | 0.60 |
| ref-E | 30 | 44 | 28 | 0.092 | 0.261 | 33 | 0.54 | 0.57 |
| ref-F | 30 | 41 | 26 | 0.079 | 0.208 | 36 | 0.69 | 0.66 |

Shots by story role (`scenes/shots.json`):

| role | shots | median s | mean position in video | median regions |
|---|---|---|---|---|
| explanation | 82 | 1.49 | 0.58 | 52 |
| consequence/shock | 67 | 1.73 | 0.37 | 59 |
| scheme/secret | 24 | 2.66 | 0.37 | 58 |
| hook | 22 | 1.33 | 0.05 | 62 |
| comedy beat | 9 | 1.78 | 0.83 | 53 |
| punchline | 5 | 3.30 | 0.92 | 50 |
| hope/excitement | 4 | 3.73 | 0.76 | 61 |
| temptation | 4 | 2.04 | 0.90 | 52 |
| waiting/tension | 3 | 1.40 | 0.68 | 105 |
|  | 3 | 1.87 | 0.80 | 122 |

## 7. The look

- **Palette (top shares across refs):** soil brown `#71411D` / `#724826` / `#593418` (13-18%), sky blue `#6F88B4` / `#748DB7` / `#7389B8` / `#8997B4` (9-15%), house siding grey `#A9A69D` / `#9F9CA0` / `#8C8985` (12-18%), off-white `#E0D1C8` / `#DDD8CF` / `#F3EBDE` (9-17%), grass green `#579548` / `#7D7954` (9-12%), roof orange `#C28C65` / `#CD8653` (6-9%), deep shadow `#120D0F` / `#171116` (9-11% in dark shots), accent per topic: uranium green, lava orange (sampled in the lava slab frames), car blue (ref-C).
- Colour families: 2-3 hues cover 80% of a frame. Saturation 0.31 - 0.44, value 0.54 - 0.63, grain 6-8 (a light film grain), vignette about 1.0 (none).
- Light: one soft sun, hard-ish cast shadows on grass and siding, sky dome with real-looking volumetric clouds (blue top to pale horizon, grey-blue cloud undersides), unlit and almost still. Cutaway interiors are lit from the front, glowing parts (lava, uranium, fire) carry their own bloom. Dark-glow scenes exist (ref-C 43 samples) for fire and night; day is the default.
- Light and colour do **not** follow the mood: correlation of brightness / warmth / saturation / motion with story valence is -0.04 / -0.09 / -0.11 / -0.07 (`why/by_label.json`, 131 sentences). A bad moment is not darker; the object tells the mood.
- No outlines (outlined shapes 55-61 per frame in the hook but they are material edges, not line art). Texture: tiling brown rock for soil, mowing-stripe grass, clapboard siding, orange tile roofs, brick; plastic-shiny props (gnome, car); soft cloud sky.
- Flat-looking tell: the grass and soil are baked textures; the sky is a backdrop plane (see `nature/paint.json`), not geometry.

### Palette per video (top colours, `measure/*.json`)

| ref | top 6 colours (share) |
|---|---|
| ref-A | `#71411D` 16%, `#A9A69D` 12%, `#7D7954` 12%, `#6F88B4` 11%, `#120D0F` 11%, `#E0D1C8` 9% |
| ref-B | `#777681` 17%, `#425161` 15%, `#8997B4` 14%, `#724826` 13%, `#C28C65` 9%, `#92633F` 9% |
| ref-C | `#9F9CA0` 18%, `#787274` 15%, `#DCC0A6` 13%, `#4F5055` 11%, `#E8DFD8` 10%, `#171116` 9% |
| ref-D | `#593418` 18%, `#261A17` 15%, `#7B8294` 14%, `#764B2D` 11%, `#464A57` 8%, `#B3AEB2` 8% |
| ref-E | `#DDD8CF` 17%, `#7389B8` 15%, `#5D3919` 13%, `#B7ABA0` 13%, `#938B81` 10%, `#90623A` 7% |
| ref-F | `#584E41` 15%, `#F3EBDE` 14%, `#8C8985` 13%, `#748DB7` 9%, `#579548` 9%, `#A3A9B3` 9% |

Brightness, warmth and saturation per video (half-second means, `timeline.md`; warm = (R-B)/(R+B) x100):

| ref | brightness mean | range | warmth mean | range | saturation mean | range |
|---|---|---|---|---|---|---|
| ref-A | 53 | 20-97 | +7 | -15 to 44 | 44 | 13-67 |
| ref-B | 52 | 17-74 | +9 | -67 to 52 | 43 | 8-93 |
| ref-C | 61 | 16-96 | +10 | -22 to 43 | 34 | 7-66 |
| ref-D | 47 | 22-68 | +20 | -15 to 54 | 49 | 26-73 |
| ref-E | 60 | 23-84 | +5 | -15 to 34 | 37 | 10-63 |
| ref-F | 61 | 19-76 | +2 | -12 to 34 | 31 | 11-86 |

Why: brightness peaks only at flashes and white-out moments; the darkest values are underground or night shots; warm positive values are daylight on soil and roof, cool negative values are underground concrete and sky inserts.

## 8. Characters

- There are almost no people. `characters.frames_with_a_head = 0.0` in ref-A: the **hero is the object**.
- **The recurring mascot is a garden gnome** (ref-A shots 5 and 15, ref-C hook, ref-F, `deep4/construct_pick.json`): about 0.4-0.5 of frame height when featured, tall pointed hat (hat height ~0.4 of figure, hat ~0.8 of coat width), white beard (~0.13 of figure), short legs (~0.15), coat bell-shaped, small prop in hand (lantern, burger, tool). Ref-C gnome: red cone hat, white beard, lime-green jacket, blue jeans; ref-F gnome: black hat and coat, jeans `#135393`, boots `#7A85A0`, belt `#3A2A55`, lantern. Glossy plastic, no outline, no face seen (usually viewed from behind or three-quarter back).
- The gnome stands on a **crate, blue block, or hazard-striped post** next to the action, small relative to the object; he never speaks, never reacts with face; he marks the human scale and the joke.
- Crowds are rows of identical small figures (ref-A wolves at 59.9 s: 6-8 grey wolf models in a field), repeated copies with slight position shifts; they shrink with depth (`deep4/rows.json`).
- Vehicles (blue hatchback in ref-C, cream truck in ref-F) are fully modelled, glossy, and arrive by sliding into frame from one side with motion blur.

### Character presence (`scenes/shots.json`)

| ref | shots | shots with a head | scale tags |
|---|---|---|---|
| ref-A | 22 | 0 | none 22 |
| ref-B | 53 | 0 | none 53 |
| ref-C | 60 | 3 | none 57, wide 2, close 1 |
| ref-D | 37 | 0 | none 37 |
| ref-E | 29 | 0 | none 29 |
| ref-F | 22 | 6 | none 16, medium 3, wide 2, close 1 |

Rule: heads on screen are rare (see the table); a builder who adds a face or a presenter has left the style.

## 9. Sets and props

- **The diorama is the set.** Every shot is on the same kind of ground block: grass top, brown rock cross-section, a vault / pit / shaft cut into it. Repeated assets within a Short: neighbour house (white/grey clapboard, orange-tile roof, blue shutters, paned windows: shots 0, 1, 2, 10-12, 15-16, 18-21 of ref-A), soil block (nearly every shot), sky dome (11+ shots), underground vault with shelf (6 shots), a bare gnarled tree (4), the topic's hero object seen from new angles (the arch appears in shots 6-9, 13, 14, 21).
- **Built how far:** only what the shot needs. A "place" is a house front + lawn + fence in 3 layers; the underground is a box with one rich surface (lava slab with dark cracks, black fuel rods with green tops). Props are medium-poly, lit, texture-mapped. Density: medium on establishing shots, sparse on inserts (one big prop, empty sky or lawn).
- **Dressing density:** 14-40 flying specks / particles per frame in holds (`deep4/idle.json`: dirt clumps, sparks, dust, smoke), 1-6 small lawn items (sprinkler, marker post, red button on a hazard post, mailbox, chain-link fence, hazard sign, mounds of dirt).
- **Recurring motifs:** the "cutaway block" itself, the hazard-striped post with a red button (ref-A shot 15), warning signs on pit lids, the gnome, the red-orange tile roof in the background of nearly every wide, the white concrete box for a hidden thing.
- **Hidden jokes:** a tiny gnome next to a huge lava lump for scale; the "meter maxed out" gauge drawn at 3.6 with the needle in the red; wolves in the exclusion-zone fence line.
- Text on props, not on screen: "R/h" on the gauge dial, a radiation trefoil on a lid, yellow-black hazard stripes. No fake UI.

### Set and prop inventory per video (`scenes/vision_*.json`)

| ref | shots described | density labels | kinds of shot | most common assets |
|---|---|---|---|---|
| ref-A | 22 | medium 12, sparse 6, dense 4 | insert/close-up 6, establishing wide 5, real place 5, cutaway 3 | soil cutaway 6, clouds 4, steel arch 4, bare tree 4, house 4 |
| ref-B | 53 | medium 25, sparse 24, dense 4 | insert/close-up 14, cutaway 13, establishing wide 10, real place 10 | clouds 12, house 9, grass 7, pipe 6, borehole line 5 |
| ref-C | 60 | sparse 33, medium 24, dense 3 | insert/close-up 21, real place 18, establishing wide 8, diagram/board 8 | brick wall 13, gnome 10, grill 8, checkered floor 8, blue car 7 |
| ref-D | 37 | medium 21, sparse 13, dense 3 | real place 11, establishing wide 8, cutaway 8, insert/close-up 6 | soil cross-section 10, excavator 7, trees 6, house 5, flood water 4 |
| ref-E | 29 | medium 18, sparse 9, dense 2 | establishing wide 8, real place 6, insert/close-up 6, cutaway 5 | soil cross-section 7, clouds 6, american flag 3, tree 3, balcony railing 3 |
| ref-F | 22 | medium 14, sparse 7, dense 1 | insert/close-up 11, establishing wide 5, cutaway 2, diagram/board 2 | striped lawn 4, green stripe 4, fuel tank 3, gnome driver 3, dollar logo 3 |

## 10. On-screen text and captions

- **One word at a time**, centre of frame: **x = 0.50, y ~= 0.52 - 0.53 of height** (read off frames: ref-A 0.0 s "If", row of strip at y~0.53; ref-C "To" at 1010 px of 1920; ref-A "Explosion" at 1010 px). The detector's caption-box tool found 0 boxes (`captions.on_screen_share 0.0`, it misreads this heavy outlined type), so these numbers are from frames, not the tool.
- Type: heavy rounded geometric sans, Title case (first letter capital, rest lower: "Explosion", "To", "Yard"), white `#FFFFFF`, **thick black stroke about 8 px at 1080 wide plus a soft shadow**, slight pop/bounce on entry; cap height roughly 60-75 px at 1920 (word "Explosion" is ~350 px wide).
- A new word per spoken word (about 3 per s, changes at the word start; 25-50% of moves also land on a word: `words_hit_share` 0.25, 0.40, 0.50, 0.26 for ref-A..D). Numbers are one word ("2000", "5,000" may be two). Long words stay as one caption.
- Captions sit over the scene, not in a separate band; they cross props and house but never faces (there are none). They are always on: from 0.0 s ("If") to the last word.
- Why: a single huge word is read in under 0.3 s, so the eye stays on the picture; it also stresses each word like the narrator does.

### Caption events per video (`deep3/motion_*.json` caption tracker)

| ref | events tracked | median width px | median height px | median x | median y | grow on entry median % |
|---|---|---|---|---|---|---|
| ref-A | 7 | 54 | 317 | 360 | 0 | 9 |
| ref-B | 0 | not measured | | | | |
| ref-C | 100 | 220 | 58 | 474 | 198 | 20 |
| ref-D | 6 | 30 | 30 | 634 | 113 | 5 |
| ref-E | 25 | 116 | 41 | 692 | 131 | 11 |
| ref-F | 213 | 215 | 114 | 573 | 90 | 8 |

The tracker locks onto only a few of the one-word captions (heavy outlined type), so position and size in the rules above come from frames; these rows are what it did lock onto.

## 11. The hook (first 2 s, frame by frame; from `hooks/` and the strip)

| t (s) | picture | words |
|---|---|---|
| 0.00 | Wide, calm, slightly low view: suburban house with orange roof, lawn, soil cutaway in front; dirt specks already flying (ref-A, ref-B) or a close handheld-looking view of a house wall / grill (ref-C) | "If you dig a hole" (first word on 0.0 s, no pre-roll) |
| 0.25 - 1.25 | camera nearly static for 1.25 s (ref-A) so the eye goes to the hole; a rectangular hole is already cut into the ground | "in your yard" |
| ~1.3 | the "ordinary yard" gets the first layer: a box and then glowing green rods fill in (ref-A 1.25-3.0 s), a blue car whips in (ref-C ~1.5-3.0 s) | "fill it with uranium" |
| ~2.5 | the picture lands on the strange part (a black oil layer under the grass, a flaming grill beside a house, the box of rods) | "and it blows up" lands on the flash at ~3.5 s |

- First sentence 16 - 46 words (3.8 - 11.4 s); first shot 0.7 - 6.6 s; 12-16 words in 3 s; 0-4 camera moves in the first 3 s. The strange element is on screen by ~1.0-2.5 s. Opening motion is 0.45-1.36 of the video average (ref-F calm 0.45, ref-E 1.36).
- Open questions it creates: "How does a backyard hole turn into a reactor / well?" "Will the house burn down?" The answer is promised by the "you have a ___" noun.
- Hook types seen: strange act in progress, counter-intuitive claim, danger set up.

### Hook per video (`hooks/analysis.json`, read frame by frame)

| ref | type | understood by (s) | template |
|---|---|---|---|
| ref-A | strange act in progress | 1.0 | If you [dig/make ordinary thing] in your [familiar place], [fill/load it with dangerous thing], and it [extreme result]. |
| ref-B | counter-intuitive claim | 2.5 | If you [do basic home activity] until you hit [valuable resource], you have a [big industry thing]. |
| ref-C | strange act in progress | 2.0 | If you [cook/make product] in your [home space] and [sell it to passing customers], you have a [business], but [hazard]. |
| ref-D | strange act in progress | 2.0 | If [looming threat] is coming and you [build defence with machine] around your [home], you have a [castle-like thing]. |
| ref-E | forbidden deal | 3.0 | If you put [powerful/important person] inside your [home], you have a [famous building], but now [danger]. |
| ref-F | other: problem-to-invention chain | 2.5 | If [bad actor] wants your [valuable thing] and you [store it in ordinary object], you have a [professional version of it]. |

First shot of each video (`scenes/shots.json`):

| ref | first shot length | regions | role | words in it |
|---|---|---|---|---|
| ref-A | 1.69 s | 67 | hook | 8 |
| ref-B | 2.58 s | 57 | hook | 13 |
| ref-C | 1.27 s | 54 | hook | 5 |
| ref-D | 1.23 s | 58 | hook | 5 |
| ref-E | 0.73 s | 64 | hook | 5 |
| ref-F | 6.58 s | 60 | hook | 26 |

## 12. KEEP vs CHANGE

KEEP (identical in every Short of this style):
- The "If you ... in your yard, ... you have a ___" first sentence and the "Add A, B and C. Congratulations, you have built ___." ending.
- The cutaway diorama: grass top, soil cross-section with the subject built inside it, a suburban house backdrop, cloud-sky dome.
- One-word, centred, white-with-thick-black-stroke captions, a word per word, no band.
- Continuous 3D camera: calm slow zoom-in drift in holds; fast whip / tilt / push moves of 0.5-1.5 s with directional blur on about half; 4-6 fast moves per 10 s.
- Male flat narrator at ~3 words/s, near-zero gaps; low dark bed 14-15 dB under; boom/thump/click effects 1.3-2.0 per s inside words; -14 LUFS.
- Glossy plastic gnome as the human-scale marker, viewed from behind; props shown as the fact (gauge, beam, slab, sign), not text overlays.
- Palette: soil brown, sky blue, siding grey, off-white, grass green; saturation 0.3-0.45; light grain.

CHANGE (the creator's own):
- Topic and the big thing being built; every spoken fact and number; the exact words.
- The hero object and its look (their own reactor, truck, tower); topic accent colour.
- The gnome's colours, a brand mascot instead of the gnome if wanted; the house design; the neighbourhood.
- Voice (their own or the free voice) as long as it is flat, confident, male or female with no gaps.
- Title, description, cover.

### What to keep, with the measured range to hold it to

| property | range across the 6 refs | where measured |
|---|---|---|
| words per second | 2.83 - 3.27 | `measure/` |
| loudness | -14.1 LUFS, LRA 2.8 - 3.4 | `deep3/audio_*` |
| sound effects per second | 1.28 - 2.04, 86 - 96% inside words | `deep3/sfx_*` |
| shot length median | 1.70 s (p90 4.42 s) | `scenes/shots.json` |
| fast camera moves per 10 s | 2.8 - 6.5 (ref-F 0.55) | `deep3/motion_*` |
| hold drift | 0.05 - 0.09 % of width per frame, mostly zoom in | `deep3/motion_*` |
| caption | 1 word, 3 per s, centre, y 0.52 - 0.53 | frames |
| saturation | 0.31 - 0.44 | `measure/` |

## 13. DON'T

- No real people, faces, or close-ups of faces; no screenshots or fake app UI; no logos of real brands.
- No random gradients as backgrounds; no everything-fades-in; no glow on text; no particle bursts except the one blast / smoke the story calls for; no two things fighting for attention.
- No flat-vector or cartoon-line look: no outlines on objects, no hand-drawn wobble.
- No locked-off frame: even a "hold" drifts; never a dead stop after a fast move (settles 20-40 frames).
- No beat-grid music edit: cuts follow words (only 1-14% of SFX sit on a cut).
- No more than one caption word on screen, no caption band, no caption on the top or bottom third.
- No text overlays for facts a prop can show; no title cards between beats (title card: none seen in 6).
- No darkening the whole frame for "bad" news (valence correlation is about zero): the object carries the mood.
- No hard-cut flurries (ref-F is the exception, 40 cuts, and still no dissolves between neighbouring beats).
- Never put a real channel, person, or video title in the style text.

### Measured limits behind the DON'T list

- Dissolves: 2 - 11 per video, each 0.13 - 0.5 s, only at a time jump; 0 seen between neighbouring beats.
- Hard cuts: 0 - 7 in five refs, 40 in ref-F; more than 8 hard cuts without ref-F-like locked views is off.
- Brightness above 90 happens only on a flash of half a second or less; a whole scene dimmed for bad news is off (valence correlation -0.04 to -0.11).
- Dead air: median gap between words 0.0 s and 3 - 7 long pauses per video; more is off.
- Caption: 1 word at a time, a new word per spoken word; two words together is off.

## 14. WHY (from `why/` and frames)

Moves per sentence and motion by story role (131 sentences):

| role | n | moves / sentence | motion | note |
|---|---|---|---|---|
| hook | 6 | 3.67 | 7.66 | busiest: shows each noun as it is said |
| comedy beat | 5 | 1.80 | 7.38 | a quick visual gag |
| consequence / shock | 32 | 1.78 | 7.52 | bigger, faster moves on a disaster |
| explanation | 45 | 1.58 | 6.34 | camera follows the part being explained |
| scheme / secret | 21 | 1.43 | 7.01 | reveal a hidden mechanism |
| punchline | 10 | 0.30 | 5.10 | **almost still**: the word is the move |
| waiting / tension | 6 | 0.50 | 5.67 | still, a held look |
| hope / excitement | 4 | 0.75 | 5.54 | |

- Camera whip (27% of moves) = change of place or idea; zoom-into (10%) = "this is the number / part that matters" (the gauge at 3.6); push (10%) = emphasis on the key word; carry (8%) = a thing hands the eye to the next shot; element-move (26%) = new object added in the same view (the build); dissolve (5%) = time jump; flash (4%) = the blast or "it blows up". A move with no reason in this style (cut it): a whip that lands on the same view; a zoom on a plain wall; a push with no word to land on; a sound with no object.
- Held, calm shots (48-53% of frames have 0 movers) exist to let a heavy fact register and for the narrator's longest sentences; a hold keeps life with a 2 s bob / sway / pulse (99-100% of holds, size 61-84 px) and 14-40 particles per frame.
- Sound inside words (86-96%) = the object appears as it is named; sound on cuts (1-14%) is the odd blast.
- Colour is fixed by place, not by emotion (valence correlation -0.04 to -0.11): soil brown, sky blue, siding grey; only a glowing part (green rods, lava, fire) changes the key colour.
- The punchline word sits on a still frame (0.30 moves per sentence) so the last noun is read, not seen move.
- The gnome is the only "actor": a scale marker (a gnome next to a lava lump says "huge") and a joke.

### Every story role, with the picture measures (`why/by_label.json`)

| role | sentences | brightness | warmth | saturation | motion | position in video | moves per sentence |
|---|---|---|---|---|---|---|---|
| explanation | 45 | 0.541 | 0.091 | 0.381 | 6.343 | 0.555 | 1.58 |
| consequence/shock | 32 | 0.592 | 0.111 | 0.412 | 7.52 | 0.362 | 1.78 |
| scheme/secret | 21 | 0.552 | 0.072 | 0.383 | 7.01 | 0.417 | 1.43 |
| punchline | 10 | 0.548 | 0.087 | 0.414 | 5.098 | 0.935 | 0.3 |
| hook | 6 | 0.579 | 0.127 | 0.441 | 7.663 | 0.0 | 3.67 |
| waiting/tension | 6 | 0.505 | 0.0 | 0.362 | 5.665 | 0.71 | 0.5 |
| comedy beat | 5 | 0.556 | 0.042 | 0.379 | 7.382 | 0.83 | 1.8 |
| hope/excitement | 4 | 0.589 | 0.118 | 0.405 | 5.537 | 0.812 | 0.75 |
| temptation | 2 | 0.598 | 0.083 | 0.341 | 6.46 | 0.875 | 1.5 |

Rule of thumb: a move is kept only if its reason fits one phrase (acts the word, adds a layer on the word, changes place or idea, shows the key number, hands the eye on with a thing). A move whose reason cannot be said in one phrase is a move to cut.

## 15. The small truths (what a builder gets wrong unless told)

- **Everything stands on the ground or a surface with a contact shadow.** Nothing floats (the gnome stands on a crate, the car on grass, the post in the lawn). Particles and flying dirt are the only airborne things.
- **The cutaway is a clean slice**: the soil block has a straight vertical cut edge facing the camera, a lighter concrete rim around vaults, and the hole interior is lit. The hole is dug *before* the thing appears.
- **One focal point per frame:** the subject is large and centred on the cut edge; the house backdrop is soft and at 60-70% of the contrast.
- **Each noun appears on the word.** A part snaps in or slides in within +/-0.15 s of its word (median word lag 0.03 s, -0.10 s, -0.13 s: movers often start slightly BEFORE the word); never a prop that is named before it is built.
- **Everything that works is drawn mid-motion:** a drill bit is turning, the excavator arm is mid-swing, the grill has flames, a car slides in with blur; nothing is shown in a rest pose.
- Scale: the house stays the same size shot to shot; big objects (arch, tower) are bigger than the house, small objects are placed next to the gnome.
- Text sits on a plain area: the caption is centred and uses a stroke so it reads on grass, siding, soil and sky; never put it over an object's key detail.
- Arrivals are fast and land soft: pop move length median 0.25-0.38 s (p25 0.12-0.22, p75 0.45-0.98), 5-7 frames to peak, speed p50 20-39 then p90 58-118 px per frame; staggered groups 0-6 frames apart (p75 2-6).
- A blast is white-orange with a few flat horizontal scanline bars across the frame during the flash (see `ref_stills/gag_00.png`): that is the style's own glitch device, not an AI tell.
- A transition from one place to another carries a thing: a car, a beam, a gauge handle.

### Measured values behind the small truths

- Pop arrivals (`deep4/pops.json`, 213 events, 24.4 per minute): ref-A 43, ref-B 22, ref-C 23, ref-D 34, ref-E 33, ref-F 58; the first frame of motion sits 0 - 6 frames from the word.
- Idle life: 99 - 100% of holds carry a 2 s bob / sway / pulse; 14 - 40 specks per frame.
- Contact shadows: every standing object (gnome, car, post, house) has a shadow edge on grass or crate in the frames read; nothing floats except specks and the blast.
- Subject share of the frame across 180 sampled frames: median 0.58 (p25 0.33, p75 0.74); border share median 0.61.

## Rebuild first

Rebuild these four frames (and any shot type the engine has never made) before a real Short, with `stylelab/rebuild_check.py`:
1. `ref_stills/medium_00.png` (ref-C ~2.6 s): a gnome on a crate beside a house wall and a blue car sliding in, centred word caption. Proves: close low camera, ground contact shadows, plastic gnome, one-word caption position.
2. `ref_stills/insert_00.png` (ref-A ~15.0 s): the big gauge on a plain sky, needle in red, "R/h" dial. Proves: single prop insert, empty background, number shown as a prop.
3. `ref_stills/group_00.png` (ref-D ~3.4 s): high aerial of a house with a moat dug round it, lawn and soil edge. Proves: whole-property overview, ground line, camera height.
4. `ref_stills/gag_00.png` (ref-A ~49.0 s): the cutaway with the fuel box under the blast, smoke column and flash scanlines. Proves: the effect device, the cutaway block, smoke / flash.
Also never made by the engine yet: a tilt-down whip into the soil reveal (ref-B 2.5 s), a camera pull-back from a closeup to a wide, a crowd of identical models (wolves), the "Add A, B and C" ending montage.

## 25. Corrections from viewers of the first Short (2026-10-28) — these override anything above

Viewers said the first Short looked "lowkey saturated" and "like a cartoon", while the video quality, editing and voice were good.
Measured (median of every frame, `grade_check.py`): the references are sat 0.38, vivid pixels 0.20, colourfulness 54,
brightness 0.57, contrast (L sd) 49. Ours was 0.51 / 0.39 / 89 / 0.65 / 66: a third more saturated, twice the vivid pixels,
brighter and harder. The references are a REALISTIC 3D render, not a toy cartoon:
- Materials look like the real thing: wood grain on a crate, painted clapboard siding, brick with mortar, real lawn grass, a
  real excavator with decals and dirt, galvanised metal, concrete with stains. Colours are the real-world colours of those
  materials (muted greens, grey siding, brown soil, dull yellows), never toy primaries.
- Shapes and proportions are real-world: a house is a house, a machine is built like the real machine with its real parts;
  no chunky simplified toy shapes. The gnome is a realistic ceramic garden gnome (painted, slightly glossy, realistic
  proportions and face), the only stylised thing in frame.
- Light is soft daylight with a natural sky (soft clouds, slight haze), gentle shadows, mild contrast; no hard bright
  colour, no neon, no glow.
- Grade to the numbers: run `python grade_check.py s_*.png --sat 0.38 --vivid 0.20 --colourful 54 --bright 0.57 --contrast 49`
  after every stills round and fix every OFF through materials and light (desaturate the albedo colours, soften the key,
  raise the fill), plus at most a gentle final saturation/contrast trim. A Short does not go to the critics with an OFF.
- Captions are Legion's job (small rounded white Title Case word, dead centre at y 0.52); never draw text overlays in the scene.
- No out-of-focus foreground objects (blurred lamps or bulbs at the top, pillar or post edges at the sides, plants in the
  corners): the references have none. Depth comes from the set, the light and the haze. (Viewers flagged a floating
  blurred bulb and blurred side bands in the first Short.)
- USE THE REAL KIT (not optional for this style): put `@kit real` after the engine includes and read real.js's header.
  REAL.setup(renderer); REAL.sky(renderer, scene, { intensity: 1 }) for real image-based light and reflections; keep one
  sun as the key with shadows (shadow.radius 3-5); turn old hemisphere/ambient fill way down. Build surfaces with
  REAL.mat(): grass for the lawn, soil + rock + gravel for the cutaway strata (vary them, irregular bands), siding (tinted
  to the house colour) for the house, planks for the shed and crates, stone_blocks for granite buildings, concrete for
  walls and floors, brick, steel (or plain MeshStandardMaterial metalness 1, roughness 0.25-0.45) for doors and machines.
  Scale o.rep so a stone block, plank or brick is its real size. Gold is MeshStandardMaterial color #E5B94E, metalness 1,
  roughness 0.2-0.3. Render only after REAL.wait() (see the header). Then grade_check.py.
