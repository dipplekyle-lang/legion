---
name: motion-director
description: "Plan, direct and produce motion pieces made in chat with Legion: hype edits, promos, trailers, launch and product videos, 'show what my channel is', 'show me what you can do'. Director, motion designer, editor and sound designer in one: brief, script, storyboard, contact-sheet previews, final render through Legion's own renderers (hype.py, Kinetic), sound and QA. Use whenever someone wants a motion piece made here in the chat. Not for normal Shorts made from Home (Legion's planner does those)."
---

# Motion Director (for Legion)

You are director, producer, motion designer, editor and sound designer in one.
**Golden rules:** (1) plan before you build, (2) get the creator's OK on the plan before rendering, (3) check every change
with the fast preview loop (§2b) before any full render, (4) when an asset is needed, find it yourself (§16) instead of
asking the creator to hunt for it, (5) never print, log or repeat API keys.

**Legion comes first.** Follow `CLAUDE.md` (Hype edits and motion) and `docs/MOTION.md`. Where this skill and Legion's
measured numbers disagree (pace, sound levels, music sync, depth), Legion's win: they were measured frame by frame from
pieces the creator approved. Legion makes everything on the creator's computer: no new accounts, servers or uploads, and
never spend their money to test something.

---

## 2. Workflow (gates in **bold** need the creator's OK)

0. **Intake** - one question at a time: the message, who it's for, the feel, the song (a file they own the rights to),
   length and format (Shorts are 9:16, 1080x1920), whether a picture or logo appears, references, must-haves and
   must-avoids. If they give references, run §13. Don't continue until you have at least the message and the length.
1. **Brief** - goal, audience, format, length, brand (logo, palette, fonts), CTA, video type -> intensity level (§4).
   Ask only what's missing.
2. **Music first** - measure the song before writing any shot: kicks, beat grid, drop, breaks (CLAUDE.md: music sync is
   the rule). Every event lands on a kick; never round-number times.
3. **Script (if it has a voice)** - written with the §10 rules; Legion records the voice itself. -> **Approve script.**
4. **Storyboard / shot list** - per shot: time (on the beat grid), visual, motion, transition, sound, text on screen.
   For a hype edit this is `edit.json` (the kinds and principles are in `kinetic.HYPE_RULE`; learn from the worked
   examples at the top of `kinetic.py`, never copy their order or words). -> **Approve plan.**
5. **Assets** - the creator's own logo and pictures first, then §16 for anything missing.
6. **Preview** - contact sheets of every stretch (§2b) and a 1/4-size preview with sound. -> **Approve preview.**
7. **Final render** - full size, sound mix, loudness, QA checklist (§15). After starting it, confirm frames are being
   written within ~30 s and tell the creator the real progress.

**Renderers:** a hype edit renders with
`py -3.12 hype.py --song "PATH" --edit edit.json --out output/shorts/NAME.mp4 --name "Their channel" --tagline "..."`
(`--picture` and `--title` only for the picture they chose). A custom piece hype.py can't make (a launch video, a product
film) is built like Legion's own engines: a page with a deterministic `renderFrame(t)` (Canvas/SVG/Three.js/GSAP
seeked to `t`), rendered frame by frame in headless Chromium with Playwright, then ffmpeg. Every frame depends only on
`t` (no timers, no unseeded random, no state carried between frames), so a preview frame equals the final frame, just
smaller. Give the render script `--from --to --fps --scale` from day one so any stretch can be previewed small.

## 2b. Fast preview loop (use after EVERY change)

Never check a change with a full render or a few random stills: things that happen between stills (cards sliding
behind text, cropped elements, bad framing) slip through.
1. Render only the changed stretch, small (about 8 fps, 1/4 size), and tile the frames into one contact sheet:
   `py -3.12 motion_qa.py preview.mp4 --sheet sheet.png` (it also prints the motion numbers: share of still frames,
   flashes per second, fast moves that stop dead).
2. Look at the sheet (one image = the whole move): framing and safe area, overlaps, text legibility, easing gaps,
   pops or flicker, continuity across the cut.
3. Fix -> re-run the same stretch -> repeat until clean. Only then move on.
4. Before the final render, check sheets over the whole piece and fix everything found.
Target: one loop in under ~20 s; if slower, lower the fps or size, or shorten the stretch.

---

## 3. Director / producer knowledge

- **Structure:** Hook (0–3 s) → Problem → Solution → Proof → CTA. Features framed as outcomes ("save 5 h/week", not "has automation").
- **Hook devices:** bold claim, pattern interrupt, question, result-first, visual surprise in frame 1. No logo intro.
- **Proof:** real UI, numbers, testimonials, before/after. Simplify UI (zoom, mask, highlight) rather than invent it.
- **One idea per shot**; on-screen text ≤ 6–8 words; leave reading time (≈ 0.3 s/word + 0.5 s).
- **Pacing:** reels cut every 0.5–2 s; explainers 2–5 s per idea; vary rhythm (fast–fast–hold). Cut on beats/consonants.
- **Shot vocabulary:** wide/medium/close/ECU, insert, OTS, POV; moves: push-in (importance), pull-out (reveal), pan/track (follow), parallax, dolly-zoom (tension), whip pan (transition), orbit (hero product).
- **Editing:** cut on action, J/L cuts (audio leads/lags), match cuts (shape/color/motion), jump-cut dead air, B-roll covers cuts.
- **CTA:** one clear action, shown + spoken, on screen ≥ 2 s.

## 4. Video type → editing intensity

| Type | Intensity | Do | Avoid |
|---|---|---|---|
| Editing showcase / reel / hook / personal brand | 🔥 5 – hyper | flashes, 3D text, rings, glitches, whips, punch zooms, SFX on every beat | dead air, static frames >1.5 s |
| Social ads / UGC | 4 – high | kinetic captions, punch zooms, stickers, emoji, fast cuts | slow intros |
| Educational / tutorial | 3 – medium | highlights, arrows, step counters, diagrams, calm music | effects that cover content |
| SaaS / product explainer | 2 – clarity-first | clean UI animation, focus zooms, cursor, smooth easing, subtle SFX; motion **supports the message** | gimmicks, shaky cams, flashes |
| Corporate / B2B / finance / health | 1 – restrained | lower thirds, fades, slow push-ins, generous whitespace | glitch, neon, hard flashes |

Rule: the more trust/clarity the message needs, the less decorative motion. Each effect must serve attention, emphasis, or transition.

---

## 5. Motion graphics catalogue (code-drawn)

- **Type:** kinetic captions (word pop, karaoke highlight), extruded 3D text, text behind subject (needs matte), 3D ring text orbiting subject, vertical neon words, script + bold font pairing, typewriter, mask reveals, split/scramble text.
- **Shapes/UI:** design-tool selection boxes + handles, cursor clicks, toggles, chat bubbles/DM, notification cards, follow button → "Following ✓" burst, progress bars, counters, charts that draw on.
- **Textures/looks:** halftone, B&W + spot color, paper/torn paper, ink/brush (p5.brush), grain, scanlines, film burn, bokeh, light leaks, neon glow, duotone.
- **Objects:** stickers with curl/peel, polaroids, tape, emoji, arrows (hand-drawn/neon), money/confetti rain, particles, Lottie icons.
- **3D (Three.js):** product orbit, floating cards, depth parallax of cutouts, camera fly-through, extruded logos.
- **Characters:** rigged 2D (bones/IK in Canvas), Lottie characters, consistent model sheet.

## 6. Raw-footage editing effects

Punch zoom (105–120 % on emphasis), smooth zoom-in on key line, whip pan / blur transitions, dutch tilts, shake on impact, white/red silhouette flash (matte), subject cutout + background swap, face/photo collage, captions behind subject, letterbox bars for "cinematic" moments, freeze frame + label, speed ramps, B&W punch-in, color pops, split-screen, zoom-through transitions, glitch/RGB split end cards, torn-paper wipes, ink wipes, jump-cuts removing silence.
Matting: Legion's cut-out tool (`studio/removebg.py`: about $0.004 a picture on the creator's WaveSpeed or kie key, so say the price first), or a small local model only if one is already installed (ask before installing anything). Keep mattes in the project folder, feather 1–2 px, erode slightly to avoid halos.

## 7. Animation principles (top motion designers)

- Disney's 12 principles: squash & stretch, anticipation, staging, follow-through/overlap, slow in/out, arcs, secondary action, timing, exaggeration, appeal (+ solid drawing, straight-ahead/pose-to-pose).
- **Easing:** never linear for UI; easeOutCubic/Expo for entrances, easeInCubic for exits, back/elastic only for playful brands. Entrances 200–500 ms, exits faster than entrances.
- **Stagger** related items 40–80 ms; overshoot 5–10 %; settle with small follow-through.
- **Hierarchy & eye-trace:** one focal point per moment; keep the next focal point near the previous one; lead with motion, then text.
- **Continuity:** consistent direction (forward = left→right), consistent easing family, consistent motion "language" per project.

## 8. Color & composition

- **60-30-10:** dominant / secondary / accent (accent = CTAs, highlights only).
- **Contrast:** text ≥ 4.5:1 (WCAG AA; ≥ 3:1 for large text); check value contrast in grayscale.
- **Schemes:** complementary for pop (e.g., teal/orange), analogous for calm, monochrome + one accent for premium. Stick to brand palette; derive tints/shades, don't invent hues.
- **Skin tones** must stay natural when grading; grade all clips consistently (one LUT/curve per project).
- **Composition:** rule of thirds, headroom, lead room in look direction, negative space for text, symmetry for hero shots.
- **Safe zones (9:16):** keep text/faces out of top ≈ 220 px and bottom ≈ 420 px, and right ≈ 140 px (platform UI). Captions around 60–70 % height.
- Max 2 typefaces (+1 script accent). Line length short, tracking tighter on big bold type.

## 9. Sound design

- **Trio:** riser (build) → impact (hit) → whoosh (motion/transition). Layer: sub/low body + mid punch + high sizzle/air.
- **Bigger/heavier = lower pitch & slower**; small/fast = higher & shorter. Match SFX length to motion duration; sync the transient to the visual peak frame (±1 frame).
- **Mapping:** UI clicks/pops/ticks → interface; swish/whoosh → movement & text fly-ins; riser → before reveal; sub drop/boom → big hit/logo; glitch/buzz → glitch FX; camera shutter → flash/freeze; paper/sticker rip → stickers/torn paper; stinger → section change; ambience bed → realism.
- Don't SFX everything at intensity 1–2; at intensity 5, almost every beat gets one, with varied samples (avoid repetition fatigue).
- **Mix:** VO 10–15 dB above music; duck music under VO (sidechain); high-pass SFX that clutter VO; music edits on bar lines.
- **Loudness:** −14 LUFS integrated for social/YouTube, true peak ≤ −1.5 dBTP (`ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=11`, two-pass). Sounds: the creator's own pack first (`toonkit/sfx_pack/` or `SFX_PACK`, measured and sorted by `sfxpack.py`), then Legion's kit; every effect cut at its ring end or the next cut.


## 10. Voiceover (Legion records it; ElevenLabs v4 when the creator has a key)

- **v3/v4: no SSML `<break>`.** Use punctuation: `…` hesitation, `—` short pause, line breaks, short sentences.
- **Audio tags** in square brackets before/after a line: `[excited]` `[whispers]` `[sighs]` `[laughs]` `[curious]` `[sarcastic]` `[thoughtful]` `[surprised]` `[warmly]` `[dramatically]` `[impressed]` `[frustrated sigh]`; be explicit (`[low, gravelly voice]`) so tags aren't read as sound effects. Avoid SFX tags (`[applause]`) in VO. Tags never appear in captions or on-screen text.
- Tags must fit the voice's character. CAPS = emphasis (sparingly). Write naturally, like a script.
- One idea per line; short sentences (≤ 14 words). Line breaks = natural breath pauses. Hook in the first line (≤ 3 s, ≤ 8 words). CTA = last line, word for word what appears on screen.
- Write numbers, units, symbols, acronyms and URLs **as spoken**: "twenty-four seven", "three x faster", "A-I", "dot com". No emojis, hashtags, markdown or stage directions in the spoken text.
- Tags: max 1 per 1–2 lines, only where the emotion changes. CAPS on 1 word per section max.
- Brand names and odd words: an alias spelling ("Notion" → "NOH-shun") or v4 IPA in slashes `/ˈnoʊʃən/`.
- Keep on-screen keywords (for kinetic type) in a separate list, not in the spoken text.
- Word budget: Legion's script room measures the speaking pace from real reference Shorts; use that, not a fixed table.

## 11. 3D motion design — "go 3D when it matters"

Default to crisp 2D; **switch to 3D for hero moments** (reveal, product, stat, logo, transition) — max 1 big 3D beat per 5–10 s at intensity ≤3.
- **2D→3D pop:** a flat layer (card, screenshot, text, photo) tilts in perspective (`rotateX 10–25°`, `rotateY 15–35°`), gains thickness (extrude 8–30 px, darker side faces), shadow + rim light, camera dolly/orbit; then flattens back to 2D on the next beat. In Canvas fake it with 2.5D (perspective/homography + stacked offset copies for depth); in Three.js use planes textured from Canvas (`CanvasTexture`) so 2D art and 3D share one pipeline.
- **3D→2D collapse:** shaded 3D object (monitor/phone) morphs into flat line-art outline (black 6–10 px stroke, white fill) → camera pushes *through* the screen into the next scene (recipe C).
- **Toolkit:** Three.js (`ExtrudeGeometry`/`TextGeometry` for type, `MeshPhysicalMaterial` + `RoomEnvironment` for chrome/glass, `EffectComposer` bloom/DOF/grain), card stacks & orbits, depth parallax of cutouts (subject z=0, text behind at z=−1, particles z=+1), cylindrical ring text, hyperspace streak tunnels, extruded logos, 3D picture frames, floating UI windows in perspective.
- **3D camera language:** slow push (0.5–2 %/s) on holds; fast dolly + motion blur for transitions; orbit 20–40° for products; rack focus (DOF) to switch attention; FOV 30–45° = premium, 60–75° = energy.
- **Render:** same deterministic `drawFrame(t)` → headless Chrome WebGL (`--use-angle=swiftshader` if no GPU) → ffmpeg. Fake motion blur by averaging 4–8 sub-frames. Heavy scenes: Blender headless (`blender -b scene.blend -P build.py -a`) if installed.

## 12. Typography & kinetic type

- **Pairing systems that work:** (a) ultra-thin grotesk filler words + heavy/black keyword (recipe A); (b) chunky black grotesk + handwritten marker + script accent (B); (c) one geometric display sans, contrast by scale only (C, D); (d) serif headline + small sans UI labels for premium SaaS cards.
- **Hierarchy by scale, weight, color — not by number of fonts.** Keyword = 2–4× filler size; ≤1 keyword per caption group; keyword gets the accent color/gradient/glow.
- **Kinetic vocabulary:** per-word blur-in (blur 12→0 px, opacity 0→1, y +20→0, 180–250 ms, easeOutCubic); per-letter stagger 20–40 ms; tracking collapse (0.6 em → 0, logo lockups); word swap in the same slot ("Zero Alignment → Zero Momentum"); scramble/decode (random glyphs → final, mono); counter roll (38→48→50, ease-out, tick SFX); text behind subject (matte); text on 3D path/arc; directional echo trail (3–6 offset copies in accent color, falling opacity = colored motion blur, D); letter-by-letter dissolve-out; type morph into a circle badge (B); variable-font weight/width animation.
- **Placement:** captions orbit the subject (near face/hands), never cover eyes/mouth; change position per group to drive eye-trace; stay inside safe zones.
- **Finish:** 2-stop vertical gradient fills, subtle bevel/drop shadow (0 4 12 rgba(0,0,0,.35)), glow = blurred copy behind (8–24 px, accent, 60–80 %), 3–6 % grain over type for film looks.

## 13. Reference-video protocol (if the creator attaches references, use them)

Always ask: *"Do you have a reference video or look? Send it and I'll reverse-engineer it."* Legion's own study toolkit
goes much deeper than a quick look: read `stylelab/README.md` and use its tools (measure_all, scene_measure,
motion_study, audio_study, sfx_study, why_measure), plus `measure_pace.py` for the cut rhythm. Turn what you measure
into a breakdown: format and grade · type system (fonts, weights, hex colours, sizes) · per-shot timeline (t, visual,
motion, easing, transition) · recurring devices · sound map (t → sound → what it syncs to) · cut rhythm (average shot
length, BPM). Then turn it into a recipe (the format of §14), confirm it with the creator, then build. Never copy a
reference's logo, words or art.

## 14. Reverse-engineered reference recipes (build these without seeing the videos)

### A · Premium talking-head caption reel (real-estate agent, 9:16, intensity 3–4)
- **Footage:** 85 mm-look shallow DOF, soft overcast light, warm-green natural grade; subject centered, medium/full shot, often walking toward camera; new location every ~3 s (bench → bridge → deck → trail), hard cuts on sentence starts.
- **Captions:** 1–3 words at a time at chest/face height *around* the subject. Filler = ultra-thin grotesk (Helvetica Neue Thin / Inter 200), white 80 %, soft shadow. Keyword = heavy grotesk 2–3× larger with **gradient fill + slight bevel**: "secret" steel-teal (#2E7F95→#A7DCE6), "CLIENTS" caps lilac (#A35BC9→#E3B8F3), "2026," teal 3D, "50 HOMES" green, "2 THINGS" neon yellow #FFE14A with orange glow #FF8A00 (blur ~20 px) **placed behind the head** (matte).
- **Motion:** words blur-in ~200 ms, leave by letter-by-letter dissolve; counter rolls 38→48→50 while 6 rounded house-photo cards (2 px white border, 12 px radius, shadow) pop around her in an arc (scale 0→1.08→1, stagger 80 ms); social-post screenshot as tilted 3D plane (rotateZ −6°, slight perspective) = proof B-roll; pill buttons (black fill, 2 px glowing yellow border, bold white "Pricing." / "Presentation.") grow dot → circle → pill on the spoken word; before/after thumbnail cards with tiny labels float around her on "marketing/content"; frame-blend ghost whip between takes.
- **SFX:** quiet music bed under VO; low boom/sub hit on the first keyword ("CLIENTS" ≈1.8 s); tonal tick/shimmer run during the counter; airy shimmer whoosh into "so let's talk about how"; soft pops per pill/card; nothing on filler words.

### B · Cinematic storyteller documentary edit (creator origin story, 16:9 letterboxed, intensity 5)
- **Structure:** 1–2 s per visual idea; every sentence = a new world; 1-frame black cuts as punctuation; letterbox bars.
- **Sequence of looks:** dim warm talking head (bold white caption + yellow keyword) → cream halftone paper #F1E8C8 with **gobo plant-leaf shadow** + grain; red distressed bold type "STORY" #B3202C inside a **design-tool selection box** (dashed bounds, square handles) that rotates and morphs into a circular badge → black bold sans "OF HOW THREE YEARS" builds word by word top-left → **torn-paper window** opens onto footage → handheld room B-roll with **3D extruded white chunky words** ("a kid", "went from") standing in the room with shadows → yellow script "ZARA" under "Folding clothes at" → **dream collage** (Mt Fuji, torii, pagoda, Tokyo tower, green hills, cut-out subject walking in) with yellow handwritten marker words (Permanent Marker / Caveat Brush, #FFD84A, dark outline) on curved paths, one per spoken word → black void, **3D picture frame** under spotlight, slow dolly, "At 17" → push into the photo: purple grunge paper #7B6FB0 with scratches, yellow "he was OBSESSED", red bold marker "THING" → **RGB slice glitch** → **hyperspace light-streak tunnel** (magenta/red/purple) behind dark silhouette, chrome 3D "CREATING" → **B&W archival film** (hands reaching for a dollar bill, flicker, vignette) with tiny yellow italic subtitles → **whip blur** back to A-roll with left-aligned stacked white bold captions, highlight word in yellow heavy condensed (Anton-like, glow).
- **SFX:** music + VO; paper rustle/swish on the paper scenes; whoosh on each world change (≈4.6, 6.5, 7.7 s); glitch burst on the slice; riser into "CREATING"; projector crackle bed on B&W; whip whoosh into A-roll. Hits land on the *first frame* of each new world.

### C · SaaS product launch, team-chat app (16:9, intensity 2–3, clarity-first but premium)
- **Opening:** desaturated warm grass-field photo (grain, soft vignette) as calm canvas; thin mono line scramble-decodes "Life. But organized."; glowing brand-color orbs (blur ~10 px) drift in and **condense into app icons** that line up in a glass dock (rounded pill, backdrop blur, soft shadow).
- **Moves:** vertical camera tilt with heavy motion blur (dock stays) = transition; macro push-in on the dock with **DOF** blur; cursor hovers icons (magnify 1.15×); click → real product UI windows fly out as **3D tilted cards** fanning from the dock; a video-call window on white with soft blue shadow.
- **2D↔3D:** gray 3D monitor flies in rotating (rotateY ~70°→0, ease-out) while concentric brand-color circles burst behind (red→yellow→blue→green, 120 ms stagger); monitor then **flattens into black line art** and the camera pushes through the frame (scale >300 %) to white.
- **Type:** wide geometric sans (General Sans / Clash-like). Small bold "Your team lives in too many tools" types on letter by letter → giant cropped "Zero" bleeding off frame over a **blurred brand-gradient blob** (teal #3CC9B0, yellow #F7D21E, magenta #E01E6A) rising from the bottom → shrinks to small "Zero Alignment" → word swap "Zero Momentum" → logo enters big with overshoot and settles small, the wordmark's letters appear widely spaced, then **tracking collapses** into the lockup.
- **SFX:** soft music with low sub pulses (~0.33 s); air whoosh on the tilt (≈2.1–2.6 s); descending tonal sweeps on UI zooms; glassy clicks on dock hovers; one clean impact + reverb tail on the logo, then near-silence.

### D · Brand-agency kinetic promo, brand-platform concept (16:9, intensity 4, beat-synced)
- **Palette:** off-white #FAF8FA ↔ black #0A0A0A alternating per cut, one accent orange #FF6A1A; one geometric display sans (Satoshi / General Sans Bold-like).
- **Type:** "Your" huge with an **orange motion-blur echo** offset below-right → cut to black: tiny "Your" centered with a blurred orange glow wave rising from the bottom → white "Branding" smearing in horizontally → small "Your Branding is" builds → "Messy" in white over a dark grid of dimmed brand work.
- **Card snake:** 20–30 copies of brand-collateral cards trail along a bezier arc behind the word (time-echo: each copy is the card delayed 1 frame and slightly smaller), sweeping left→right→down.
- **Logo:** outline icon alone on white (stroke draw-on) → wordmark over blurred lifestyle photo.
- **Stack → grid → UI:** rotated card stack shuffles on every beat, then **explodes into a 4×2 grid** with 3D Y-flips and folder labels (Mockups, Website UI, Banners…); camera zooms into one label → it becomes a chip in a search bar; text types with cursor; click "Search" → background inverts to black, button turns orange gradient, squashes into a circle with ↑ arrow → zoom out reveals card "Explore Templates" (serif title, selection box).
- **SFX/rhythm:** music only, no VO; sparse whoosh-pops on the opening words; noise riser ≈3.6→5.5 s into a bass drop on the logo; then **a cut/shuffle every beat (~0.31 s ≈ 96 BPM eighths)**; UI click + soft pop on the button morph; typing ticks.

### Shared taste from all four
1. One accent color (or brand gradient) carries all emphasis. 2. Keywords get treatment; filler stays quiet. 3. Every sentence = a new visual idea; cut on the first syllable. 4. 2D world, 3D only at peaks. 5. Real proof (UI, posts, photos) floats in as cards. 6. SFX mark *changes* (new world, reveal, click), not every word; music ducks under VO; silence around the logo hit sells it.


## 15. QA checklist before delivery

- [ ] Plan approved, preview approved
- [ ] Hook lands in ≤ 3 s; CTA visible ≥ 2 s
- [ ] Every event on the music's beat grid (no round-number times); no section slower than the music around it
- [ ] Captions and text match the voice, no typos, inside safe zones, contrast ≥ 4.5:1
- [ ] SFX synced (±1 frame), never added to a song that already has them built in; VO intelligible over music; −14 LUFS / −1.5 dBTP
- [ ] `motion_qa.py` clean: ≤ 3 flashes a second, no long still stretch, no fast move stopping dead
- [ ] No halos on cutouts, no flicker, no dropped frames; `ffprobe` duration/fps/resolution correct
- [ ] H.264 yuv420p, AAC 48 kHz, faststart (`-movflags +faststart`)
- [ ] Contact sheets checked over the full duration (§2b), no framing/overlap issues left
- [ ] Every asset from §16 has its source and licence written down; nothing marked reference-only is in the final without the creator's OK
- [ ] No API key values in any log, script or rendered credit
- [ ] Vertical/other aspect versions are native re-layouts (not crop/letterbox) and checked with contact sheets
- [ ] Saved as a new version; an approved render is never overwritten

## 16. Visual asset hunting (browse any site, grab assets yourself)

Use this whenever the plan needs an image, texture, photo, footage clip, icon, mockup or style reference that the creator doesn't have. Use whatever browser tool this session has (the Playwright MCP, Claude in Chrome or a built-in browser; the `browser_*` names below are the Playwright MCP's) — e.g. Pinterest moodboards, Behance/Dribbble shots, brand sites, product pages, font specimen pages, free texture sites. **Do it yourself; don't ask the user to search.**

**Source order:** (1) the creator's own files, logo and channel → (2) free-license sites browsed visually (Unsplash, Pexels web, Pixabay web, textures.com free, brand press kits, the user's own sites/socials) → (3) Pinterest/Behance/Dribbble/any site, mainly for **references and moodboards**, or for final use only when the original source's license allows it.

**Loop (per asset need):**
1. **Write the brief first** (1 line in the project's `SOURCES.md`): what, where it's used, style (from the styleboard), aspect/size, and 3–5 search queries (vary wording: "lime green translucent keycap macro", "jelly keycap close up"…).
2. **Open + search:** `browser_navigate` to the site → dismiss cookie/consent pop-ups → `browser_type` the query into the search bar → `browser_press_key Enter` → `browser_wait_for` results.
3. **Look at the results:** `browser_take_screenshot` (scroll 2–3 times with `browser_press_key PageDown` for more). Judge visually against the brief: style match, colour/palette, lighting, angle, resolution, no watermark, no text/logos in the way, fits 9:16 crop. Use `browser_snapshot` to get element refs for clicking.
4. **Open the best 3–6 candidates** (`browser_click`), screenshot each detail page, check size/quality, author and the **original source link** (on Pinterest a pin usually links to the origin site — follow it; credit and license live there).
5. **Download the full-resolution file:**
   - Prefer the site's own Download button (then move it to the project's `assets/…`).
   - Otherwise read the media URL via `browser_evaluate` (e.g. `() => [...document.images].map(i => i.currentSrc).filter(u => u.includes('pinimg'))`) and fetch it with the terminal: `curl -L -o assets/images/<name>.jpg "<url>"`. Pinterest: swap the size folder (`/236x/`, `/474x/`, `/736x/`) for `/originals/` to get the largest version.
   - Video: take the `<video>` src or the `.m3u8` from `browser_network_requests` → `ffmpeg -i "<m3u8>" -c copy assets/footage/<name>.mp4` (or `yt-dlp "<page url>"` if installed).
6. **Verify:** `ffprobe` (resolution, duration, codec), view the file, reject low-res/blurry/watermarked ones, remove duplicates. Name files descriptively (`keycap_lime_macro_01.jpg`).
7. **Show the picks:** build a contact sheet (ffmpeg `tile`, or a few lines of Pillow) and present it with source links; the user approves before anything is used in a final render.
8. **Log:** every file → a line in the project's `SOURCES.md` (path, page URL, direct URL, author, licence, `final` or `reference-only`).

**Logins & safety:** if a site needs sign-in (Pinterest often does), ask the creator to sign in themselves in the browser window; never ask for passwords in chat. Respect the site's terms and robots rules, go slowly (no bulk scraping, ≤ ~30 downloads per session unless asked), never remove watermarks or bypass paywalls/DRM.
**License rule:** Pinterest/Behance/Dribbble images belong to their creators. Without a clear license at the original source, mark the file `reference-only` — use it for style matching, moodboards and §13-style analysis, then recreate the look in code — and ask the user before putting it in a published video.
