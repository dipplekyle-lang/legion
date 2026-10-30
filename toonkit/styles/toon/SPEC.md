# Style study: animated "story with a twist" Shorts (a reference channel, measured)

> Shipped with Legion. Every number and rule here was measured from six reference Shorts (ref-A to ref-F); the study's
> working files it mentions (refs/, sheets/, scenes/, deep3/, short30/) are not included and not needed: build from the
> numbers and rules. Learn the craft only; never copy any channel's scripts, characters, names or signs.


> **Read this first:** Parts 1-2 describe the style, Part 3 measures it and explains why, Part 4 is construction-level
> detail and **overrides earlier sections where they differ** (section 25: the characters are 3D toon figures, 13 % of
> transitions are quick dissolves, the grain is compression). Part 5 is animation and direction (section 41 = rules for
> Legion's 3D director). Part 6 is backgrounds and scenes (section 48 = the per-place recipe). Part 7 breaks down every video moment
> by moment and catalogues every designed detail; Appendix A is the measured half-second timeline of all six videos.
> Part 8 is pixel-level lines, edges, face parts and colour, and overrides earlier sections where they differ (section 70 = renderer settings).
> Part 9 is the environment in depth (materials, scale, perspective, shadows, clutter, colour); section 79 = the environment checklist.
> Part 10 tests the "why" claims with data: light is chosen by setting and time of day (not graded by emotion); the camera follows the story role.
> Part 11: why scenes are full or empty (a shot is as full as what its sentence is about), the scene anchor, and the six hooks (section 90 = build rules).
> Part 12: measured body proportions (legs 40-45 % in ordinary clothes, wide-oval heads, bell torsos) and the outline pipeline that works. The build path is section 33; the checklist is section 22.
> Parts 13-15: why his characters have depth and ours look flat (light on characters, the side-by-side grid).
> **Part 16 is the final word on the character, camera, environment and light. It overrides every earlier section where they differ.** Section 116 is the build sheet and section 117 is what is still uncertain.
> **Part 17: how nature is painted and how sets are sourced (refines 110.2 and 117).** Section 123 is the build recipe.
> **Part 18: the post-mortem of test 5 and the rules for every future test. Read it before building anything.** Section 127 is the pre-render checklist; section 128 is the workflow.
> **Part 19: test 6 corrections (2026-10-24). Overrides 66, 103 and 108 where they differ.** Section 133 is why the critic alone can't gate a test.
> **Part 20: saturation and practical lights (2026-10-24). Overrides every earlier grade/saturation rule.** Section 135 = the colour targets, 139 = how a lamp is built.
> Parts 21-25: lessons from the first 30 s Short ("The Fly") and polish rounds 1-3 (code recipes for characters, depth, props, acting).
> **Part 26: the bedrock study (2026-10-25): sound, captions, camera curves, expression swaps, every effect's construction,
> transitions, hands, inserts and frame busyness, all measured. Overrides earlier sections where they differ.** Section 173 = what to change next.

Studied 2026-10-23 from his 6 most recent Shorts (all 1080x1920, 30 fps):

| id | title | length | words | words/s | camera transitions | near-still frames |
|---|---|---|---|---|---|---|
| ref-A | Why Cashiers Keep Winning The Lottery | 57.7 s | 199 | 3.45 | 29 | 7.5 % |
| ref-B | The Job Nobody Wants in Japan | 60.5 s | 224 | 3.70 | 18 | 1.5 % |
| ref-C | The Burglar Who Only Moved Furniture | 58.4 s | 238 | 4.08 | 15 | 5.9 % |
| ref-D | The Ancient Jar That Warned an Empire | 64.8 s | ~235 | 3.62 | 16 | 5.8 % |
| ref-E | Levels of Pirate Cannonballs | 63.5 s | 220 | 3.46 | 22 | 6.0 % |
| ref-F | This Knight Found the Ultimate Loophole | 40.6 s | 158 | 3.89 | 12 | 4.2 % |

Measured with code (`measure_all.py`, results in `measure/`), then checked by eye on contact sheets (`sheets/`):
overviews at 1 frame / 1.5 s, face close-ups at 10 fps, transitions at the full 30 fps.

This file is the KEEP list. We learn the craft, never his characters, names, sets, stories or words.

---

## 1. The numbers that define it

- **Length 40-65 s**, almost always ~58-64 s.
- **Narration starts at 0.0 s in every video.** No intro, no music lead-in, no title card.
- **3.5-4.1 spoken words per second** (fast, but clear). Almost no pauses: 0-2 pauses over 0.45 s per video.
- **The camera never stops.** Only 1.5-7.5 % of frames are near-still (our launch video rule was "under 35 %"; this
  is 5x stricter). Median frame-to-frame motion 4.6-9.8 (0-255 scale), every frame.
- **No hard cuts.** 0-1 detected per video. Every scene change is a camera move.
- **12-29 camera transitions per video**, each **0.3-0.5 s** long. In the hook they are packed: the Japan Short has
  **5 transitions in the first 3 seconds**, then one about every **0.6-2 s**.
- **No fades to black or white**, ever (13 % of transitions are quick cross-dissolves, see section 25).
- **Sound hits about 1.2-2.0 per second** (sharp audio onsets on top of voice and music).

## 2. Script formula

Every video follows the same five-part shape:

1. **Cold open IN the action (sentence 1).** The strangest or most tempting moment, stated as if mid-story:
   - "He scanned a customer's lottery ticket. It had won a million dollars and said, sorry man, not a winner."
   - "A man snuck into a family's house every night and moved every single thing one inch to the left."
   - "A knight paid a priest to forgive a crime he hadn't committed yet."
   - "He put a bronze ball in a dragon's mouth and told the emperor, if this ever falls out, run!"
   - Or a bold claim: "It's impossible to get fired in Japan, but companies found something way worse." /
     "If your ship got hit by a cannonball, you'd actually be one of the lucky ones."
   No names of famous people up front, no dates first, no "did you know".
2. **Escalation in quick, concrete beats** (each beat = one picture): the greed, the plan, the consequence.
   Concrete, funny specifics ("bought a boat, a mansion, and a whole new set of friends, at least in his head",
   "who measures their couch?").
3. **The turn / reveal** (around 60-75 % in): the thing the viewer didn't see coming (the customer was an undercover
   agent; the burglar was the man who sold them the house).
4. **"You see, …" explanation** (the real-world mechanism): "You see, in real life, lotteries noticed…" /
   "You see, Japanese law makes it almost impossible to fire someone, but…". The phrase "You see," appears in 5 of 6.
5. **Final line = the punchline fact**, short, ends the video. No outro, no "subscribe", no question to comments.

Tone: deadpan narrator, dry humour, short sentences, present tense in the story ("The guy just shrugs, says…").
Quoted dialogue is spoken by the narrator inline ("says, story of my life").

## 3. Voice and sound

- One male narrator, conversational, slightly fast, dry. Close-miked, no reverb.
- Music bed: light, playful, low under the voice (quiet; measured loudness is dominated by speech).
- **Sound effects on actions**, about 1.2-2 per second: scanner beep, trash rummage, door, cash, pops on reveals,
  whooshes on camera transitions, small "ding"/sparkle on realisations.
- Characters' quoted lines are mouthed (lip sync) while the narrator says them.

## 4. Captions

- **One word at a time** (occasionally 2 short words: "The guy", "a door", "on his"), changing exactly with speech.
- **Position: centred horizontally, ~70 % down the frame** (y ≈ 1340-1360 of 1920), the same spot in every shot.
- **Small**: cap height ≈ 50-60 px on 1920 (about 3 % of frame height). Clean, not "viral subtitle" huge.
- **Bold geometric sans, white, thin dark outline + soft drop shadow.** Sentence punctuation kept ("winner.", "shrugs,").
- No colour highlights, no pop or scale animation on captions: they just switch.

## 5. Characters (the most recognisable part)

**Design grammar (every person is built from these):**
- **Head:** a big near-perfect circle, **pure white with soft grey shading** on the lower/shadow side, **thick black
  outline (~10-12 px at 1080 wide)**. Head ≈ 35-40 % of total body height (very top-heavy).
- **Eyes:** two **grey-filled ovals** (no white sclera by default), set wide, roughly at the head's middle.
  - Neutral = half-lidded (a straight lid line cuts the top third), giving the signature bored/deadpan look.
  - Surprised = eyes become **open rings** (white with grey outline, tiny pupil), mouth opens.
  - Happy = closed upward arcs ("^ ^"). Angry/annoyed = lids slant down inward.
- **Eyebrows:** soft, slightly **blurred grey strokes** (not black lines), very expressive: they carry most emotion.
- **Mouth:** a **dark grey rounded shape with soft blur edges**, no lips. Shapes seen in lip sync:
  closed short line / small "o" / wide open oval with a **pink tongue** / wide **rectangle showing a row of teeth**
  (grin or grimace). Changes every ~0.1-0.2 s while the character "speaks".
- **Hair:** a solid cap shape with a **two-tone gradient and glossy highlight strokes**, black outline, often one
  signature curl or tuft. Hair/hats are the main way characters differ.
- **Body:** a simple rounded torso in a solid **clothing colour with soft shading** (red polo, yellow raincoat, blue
  suit), small details (name tag, pocket, logo, badge, stripes).
- **Limbs:** **thin black lines (~12-16 px)** with **small black ball hands**, no fingers; legs are thin black
  lines with small dark feet. Elbows/knees bend as smooth curves (rubber-hose style).
- **No nose, no ears.** Sweat drops, blush circles and motion lines are added as emotes.
- **Shading:** characters are NOT flat: soft gradient shading and gentle rim light, so they sit in the 3D lighting.

**Cast per video:** one main character (consistent outfit for the whole Short) plus 1-4 side characters
(customer, officer, boss, emperor), each identified by one strong prop: bucket hat with fishing lures, police cap,
suit + badge, crown.

**Acting (body movement):**
- Always in motion: idle breathing/sway, small head tilts, blinks.
- Big clear poses on key words: shrug (both arms up), arms raised in celebration, pointing, digging in a bin with
  only legs sticking out, sitting with feet up, leaning in, clutching an object to the chest.
- Gag physics: springing up out of a chair (ejection), being pulled off-frame, objects flying, splinters.
- Holds a pose briefly (5-10 frames) on the strongest frame, then continues.

## 6. Camera (the second most recognisable part)

- **One continuous, always-moving camera** through **3D spaces**. It drifts even during dialogue (slow push-in,
  slight orbit).
- **Transition vocabulary** (0.3-0.5 s each, with directional motion blur):
  - **Dolly push / rack focus**: the camera flies from a character down to an object (the lottery ticket, the
    FIRE button); the background goes soft as focus moves to the foreground object.
  - **Whip pan** sideways or vertical to the next character, heavy motion blur, lands soft.
  - **Tilt down from the ceiling** into a new room (ceiling tiles, lamps in frame first).
  - **Top-down flyover**: camera rises to look straight down at a floor plan or table, then dives into the next scene.
  - **Through an object / match move**: through a window, a magnifying glass circle, a lens-like round "iris" view.
  - **Impact jolt**: on a gag (button pressed, cannonball hits) the frame shakes and snaps to a wider shot.
- **Extreme close-ups** of faces and props are common (face fills frame, ticket fills frame), then pull back.
- **Depth of field everywhere**: background soft when the subject is close. Gives the "expensive" feel.
- Framing: subject usually centred or slightly off-centre, eyes in the top third; the caption zone (~70 % down) is
  left readable.

## 7. Worlds / backgrounds

- **3D environments with a toon look**: real perspective and depth (store interiors, offices, castle halls, ship
  decks, streets), rendered with **flat-ish colour, soft shading, outlines on big shapes**, lots of small props
  (posters, shelves, lottery tickets, clocks, lamps).
- Characters are **3D toon-shaded figures made to read as 2D** (see section 25; corrected).
- **Lighting tells time and mood**: warm pendant lamps indoors, golden-hour exteriors, deep blue/purple nights with a
  big moon, a single warm practical light (desk lamp, lantern) in dark scenes.
- **Palette**: saturated but soft. Recurring families: warm cream walls (#E6E0DD, #EEE4DD), sage green (#98A48A),
  cobalt/royal blue accents (#235BDF, #365DD6, #15319E), wood browns (#7D4639, #844D3D), night indigo (#25335A,
  #291F34), sunset orange-peach (#CA8A5A, #EEB282). Every video has one dominant temperature per scene.
- Signs and props carry readable words that support the story ("REEL BIG CASH", "FIRE EMPLOYEE", "CAREER DEVELOPMENT
  ROOM", "OUR WINNERS", "PRIZE CLAIMS").

## 8. Finish / post

- Soft **depth of field**, light **bloom** on lights, gentle **vignette**; surfaces carry a painted texture (the apparent grain is mostly YouTube compression, see section 25).
- Directional **motion blur** on every fast move.
- Colour: slightly lifted shadows, warm highlights.

## 9. Story structure in time (typical 60 s)

| time | what happens | camera |
|---|---|---|
| 0-3 s | cold open: the strange act | 3-5 transitions, extreme close-ups |
| 3-20 s | escalation, the plan, the greed | a move every ~1 s, gags |
| 20-40 s | it goes wrong / the trap closes | location change (drive, new building) |
| 40-50 s | reveal (who the other person really was) | push-in on faces, reaction close-ups |
| 50-60 s | "You see, …" real mechanism + punchline | diagrams, top-down, wide establishing |

---

## 10. KEEP (identical) vs CHANGE (ours)

**KEEP:** 58-62 s, words from 0.0 s at ~3.6 words/s, five-part script shape ("You see," turn), one-word captions at
70 % height, round white heads with grey eyes / soft brows / blurred mouths / thick outlines / stick limbs, lip sync,
constant camera motion (<8 % still), 0.3-0.5 s motion-blurred transitions, dense hook (4-5 moves in 3 s), depth of
field, warm/blue lighting moods, SFX on actions about 1.5/s.

**CHANGE (ours, so it's never a copy):** our own story and topic, our own character designs (hairstyles, outfits,
colours, props), our own names, our own sets, our own sign texts, our own palette accent, our own narrator voice.
YouTube now pushes down lookalikes: the craft is the same, the identity is ours.

## 11. How Legion can build this (honest)

- **Script + voice + captions + sound timing:** Legion already does all of it. Add this style's rules (section 2-4).
- **Characters:** FOLIO (code-drawn 2D animation, `studio/folio.py`) has a people rig with poses, expressions, talking
  mouth, eye direction and walking. Needed: a new **look pack** with this grammar: round white heads, grey oval eyes
  with lids, blurred brows and mouths, mouth shapes for lip sync, thick black outlines, stick limbs with ball hands,
  soft shading. Free to render (no image credits).
- **Worlds:** his sets are 3D. Two options:
  1. FOLIO's 2D parallax sets drawn in this toon style (fast to build, looks good, less true depth), or
  2. 3D sets (the engine has a 3D path, `threed.py` / Prism) with the 2D characters composited in, for the real
     fly-through camera. Much closer to him, much more work.
- **Camera:** continuous path with push / whip / tilt / top-down moves and directional motion blur. FOLIO already has
  a camera, parallax and motion blur; the transition vocabulary in section 6 needs to be added.
- **Checks before a full render:** stills at the hook frame, a lip-sync frame, a mid-transition frame, a caption frame
  and the reveal; motion share must stay under 8 % near-still.

Not verifiable from video alone: the exact caption font (looks like a bold geometric sans, e.g. Montserrat/Proxima
Bold class) and the exact music tracks.

---

# PART 2: scene by scene, and the assets

## 12. Full shot list: "Why Cashiers Keep Winning The Lottery" (ref-A, 57.7 s)

Camera transitions measured by code (start-end, matched to the word being spoken); everything else read frame by frame
at 2 fps (`sheets/VK_shots_0.jpg`, `VK_shots_1.jpg`).

| # | time | words | set | camera | characters / acting |
|---|---|---|---|---|---|
| 1 | 0.0-1.0 | "He scanned a customer's lottery" | bait-and-lottery shop, behind the counter | slow push-in from a medium shot, pendant lamp in the top of frame, foreground counter blurred | cashier (red polo, name tag, brown curl), half-lidded, holding a scanner |
| 2 | 1.0-1.7 | "ticket," | same | **fast dolly DOWN onto the ticket** on the counter (transition 1.03-1.70) | scanner head enters frame, red scan beam |
| 3 | 1.7-2.3 | "had won" | ticket close-up | slow push on the ticket, label fully readable | the prop is the star |
| 4 | 2.3-2.9 | "a million dollars," | back to the cashier | **whip up** to the face (2.30-2.93) | eyes become rings, mouth open, **sweat drop**; register screen reads "WINNER! $1,000,000" |
| 5 | 2.9-4.0 | "and said, sorry" | same | push-in to a big close-up | shock turns into a sly half-lid, scanner held up |
| 6 | 4.0-6.0 | "man. Not a winner. The guy" | same, extreme close-up | slight orbit (3.90-4.37), the ticket raised next to his face | lip-syncs "Sorry, man", waves the ticket |
| 7 | 6.0-9.5 | "just shrugs, says, story of my life, and walks" | over the shoulder: the cashier's head huge and blurred in front, the customer behind the counter | slow drift, **rack focus** on the customer | customer: yellow raincoat, bucket hat covered in fishing lures, moustache; shrugs, lip-syncs "story of my life", turns to the door |
| 8 | 9.5-10.5 | "The second the door closes," | same | holds on the door through the blurred foreground | customer leaves through the glass door |
| 9 | 10.5-12.5 | "the cashier is elbow deep in the trash can" | shop floor, checkered tiles, black rubber mat | **dolly/tilt down** to the bin (11.57-12.43) | only the cashier's legs stick out of the bin; trash (banana peel, paper balls) flies out |
| 10 | 12.5-14.0 | "fishing the ticket back out" | **circle iris**: his face in a round spotlight, black around it | iris close-up (a dramatic "secret" moment) | sly grin, then a toothy grin, ticket held up |
| 11 | 14.0-15.9 | "and tucking it into his wallet" | top-down on the counter | **tilt to top-down** (13.93-14.40) | ball hands slide the ticket into a wallet beside his driver's licence |
| 12 | 15.9-17.0 | "like it's been his all along." | back to the counter | **whip** (15.90-16.57) | happy closed-eye smile, holding the wallet |
| 13 | 17.0-21.5 | "By midnight, he's already bought a boat, a mansion, and a whole new set of friends" | **dream**: night lake, giant pink moon, castle on a cliff, lily pads | slow continuous push around the boat; **the look changes**: flatter, purple-pink, the character tinted blue | at the wheel of a yacht "FINDERS KEEPERS" with string lights; new friends pop into the boat; fireworks over the castle |
| 14 | 21.5-22.2 | "at least in his head." | the camera pulls back: the dream is **inside a frame** | pull-out reveal (21.60-22.20) | the dream shrinks into a picture |
| 15 | 22.2-23.0 | "So" | his bedroom at night, top-down | top-down on the bed | asleep and smiling, lamp glow, a pizza box |
| 16 | 23.0-23.5 | "the next morning," | same room, morning light floods in | the light changes from blue night to warm pink morning inside one shot | |
| 17 | 23.5-25.5 | "he drives two hours to the lottery office," | country road at sunrise | follows a tiny red car, then **pushes in** to a close shot of him driving | the car is a chunky, toy-like 3D model |
| 18 | 25.5-28.3 | "slides the ticket under the glass, and the lady at the counter smiles" | lottery office "PRIZE CLAIMS" window, teal | slow push through the glass, his blurred head in front | clerk: curly orange hair, glasses on a bead chain, teal blouse; smiles |
| 19 | 28.3-32.0 | "and says, wow, congratulations, just wait right here." | same, closer | push-in (27.60-28.30) | the clerk lip-syncs with a toothy grin, waves, presses a red button |
| 20 | 32.0-35.0 | "So he waits. Five minutes go by," | waiting room "OUR WINNERS": yellow wall, winner posters, aquarium, terrazzo floor | slow drift | he sits on a bench in a brown suit, smiles, taps his feet, raises his arms happily |
| 21 | 35.0-41.8 | "then ten, until finally a door opens behind him. In walks the guy from the store, except now he's wearing a suit with a badge on his belt," | same | very slow push; the door behind him in focus, him in front | a silhouette in the doorway, then the customer walks in (same moustache, now in a suit, holding the lure hat) |
| 22 | 41.8-43.5 | "followed by two police officers." | same | push-in on his face | two police officers appear; his face drops (sad brows, small mouth) |
| 23 | 43.5-45.8 | "You see, in real life," | the camera pulls out to a **poster on the wall** ("OUR WINNERS - KYLE - LAKE RD") | fast pull-out (43.53-45.77) | the whole scene becomes a pinned photo |
| 24 | 45.8-50.2 | "lotteries noticed that store clerks were winning way more often than everyone else, which is statistically a little suspicious." | **top-down evidence board** in a sunlit office (window-blind shadow stripes) | top-down moves between two columns of winner photos, "CLERKS" and "EVERYONE ELSE"; slow zoom on the single photo under "EVERYONE ELSE" | photos pinned in columns |
| 25 | 50.2-52.5 | "So they started printing" | a tall stack of photos, then a printer on a wooden desk | tilts up the stack, then down to the printer | |
| 26 | 52.5-54.2 | "winning tickets as bait and" | a ticket rack seen from above | **top-down, the rack doors swing open** | the rack is full of "REEL BIG CASH" tickets, a tag "GONE FISHIN'" |
| 27 | 54.2-56.0 | "sending undercover agents into stores" | over the agent's hat, then a "BAIT - GAS" shop front at night | follows the agent from behind to the door | the agent with the lure hat and a tackle box |
| 28 | 56.0-57.7 | "pretending to be regular customers." | back inside the first shop | push-in over the agent's hat to the counter | a **new** cashier with a "TRAINEE" tag, smiling. **Loop: the last shot is the first set.** |

**What this shows about scene depth:**
- 28 visual moments in 58 s (one every ~2 s), across **9 sets** (shop, ticket close-up, bin, dream lake, bedroom, road,
  prize office, waiting room, evidence board) plus 3 inserts (wallet, poster, ticket rack).
- Sets are **reused**: the shop appears 3 times and opens and closes the video (a loop). The prize office and the
  waiting room are each one long continuous shot. A Short needs about 6-9 real sets, not 28.
- Every new idea in the narration gets a **new framing**, not always a new set (close-up, top-down, over the shoulder,
  iris, insert).
- The **dream / imagination** beat gets its own look (flatter, neon purple-pink, blue-tinted character) so viewers read
  "this isn't real" instantly.
- **The explanation part is a top-down "evidence board"**: photos, labels, columns, shadows from window blinds. The world
  becomes an infographic without leaving the art style.

## 13. Recurring shot types (all 6 videos)

| shot | how it's built | used for |
|---|---|---|
| Medium on the main character | waist up, centred, the set around him | narration about him |
| Extreme face close-up | the face fills 60-90 % of the frame, background soft | reactions, lip-synced lines |
| Over the shoulder | a huge blurred head or hat in front (30-40 % of the frame), the other character sharp | conversations |
| Prop insert | the object fills the frame, label perfectly readable | the key object (ticket, FIRE button, jar, cannonball) |
| Top-down | camera straight down on a desk, floor plan or board | plans, evidence, the explanation, transitions |
| Iris / spotlight | a circle of the scene, black around it | a dramatic secret moment |
| Wide establishing | building, castle, ship, street, tiny characters | new location, time jumps |
| Cutaway / cross-section | a 3D object cut open to show how it works | mechanisms (the jar's pendulum) |
| Imagination | flatter, neon colours | dreams, plans, "what if" |
| Night window | the building at night, one warm lit window | passing time |

## 14. Depth and layering of every shot

Each frame is built in **3 planes**:
1. **Foreground, often blurred:** a counter edge, a head, a hat, a banner, a bin, a lamp. In about 60 % of shots. It
   gives scale and strong parallax, which is what makes the camera moves feel real.
2. **Subject plane, sharp:** the character(s) and the key prop, about 40-65 % of the frame height.
3. **Background, soft to medium blur:** walls with posters and shelves, windows, skies, distant buildings. Exteriors
   add **atmospheric haze** (the castle and city get lighter and bluer with distance).

- Depth of field is strong: the background blurs whenever the subject is closer than a medium shot.
- Lens: wide-ish, a slight perspective stretch at the edges in rooms; ceilings are often visible (tiles, lamps). The
  camera sits at the characters' eye level or a bit below.
- Characters are 3D and turn in space; their faces are flat decals on the sphere (see section 25; corrected).

## 15. Assets: environments

**Interiors (most videos):** a bait shop with a lottery corner, an office cubicle, a "career development room", a lottery
claims office, a waiting room, a kitchen, a living room, a bedroom, a castle throne room, a ship's deck, a prison cell.
**Exteriors:** a country road at sunrise, a suburban street, a castle courtyard and city, a sea with stone arches, a
harbour fort, a night city with lit office windows.

**Materials and surface detail** (painted into textures, not realistic materials):
- Drop ceilings with outlined tiles; recessed or **pendant lamps that glow** (bloom on the bulb, a soft cone of light).
- Walls: flat painted colour (sage green, warm yellow, cream) with **wood wainscoting** (vertical planks, outlined).
- Floors: **checkered tiles**, **terrazzo with coloured speckles**, wood planks, patterned carpet.
- Counters: speckled laminate (scattered dark flecks), metal edges.
- Every surface has a light **hand-drawn texture**: specks, grain, scuffs. Nothing is perfectly clean.
- **Outlines on set objects** (dark brown or black, thinner than the characters'), plus soft ambient occlusion in corners
  and under objects.
- Glass (shop door, claims window, aquarium): a light blue tint with a few white highlight streaks.

**Lighting setups:**
- Warm interior: 1-3 practical lamps in frame, warm key, cool fill, soft shadows.
- Daylight interior: bright and even, window light, a slight warm bounce.
- Evidence board: sunlight through **window blinds, diagonal stripe shadows** across the board.
- Night: deep indigo/purple ambient, **one warm practical light** (lamp, lantern, lit window), a big moon.
- Golden hour exterior: low sun, long shadows, peach-orange sky, bloom.
- One light temperature per scene; time of day changes by **animating the light inside a shot** (night to morning),
  never by a cut.

## 16. Assets: props

- **Hero props with readable invented labels** that pun on the story: a scratch-off ticket "REEL BIG CASH - WIN UP TO
  $1,000,000!", a "FIRE EMPLOYEE" button, a register display "WINNER! $1,000,000", "PRIZE CLAIMS", "OUR WINNERS",
  "CAREER DEVELOPMENT ROOM", "PLEASE DON'T TAP THE GLASS", a boat called "FINDERS KEEPERS", a tag "GONE FISHIN'".
  For us: always our own text, never real brands.
- Set dressing: posters, corkboards with pinned paper, shelves of colourful products, clocks, calendars ("NOV FRI 18"),
  fish tanks, plants, filing cabinets, lamps, mugs, cardboard boxes.
- Props are chunky and slightly toy-like: thick edges, rounded corners, bold colours, simple shapes, the same outlines
  and soft shading as the sets.
- Vehicles and big objects (car, yacht, cannon, bronze jar) are simple 3D models with the same toon finish.

## 17. Assets: characters (the rig to build)

**Parts (every character):** circle head (white, grey shading, black outline), hair cap or hat, 2 eye ovals with a lid
line, 2 brow strokes, a mouth shape, a torso in the outfit colour, 2 arms and 2 legs as black strokes, 2 ball hands,
2 small feet, outfit details (name tag, badge, tie, stripes, buttons, belt).

**Expressions seen:** neutral half-lid, sly half-lid with one brow up, surprised rings, happy closed arcs, toothy grin,
grimace (teeth, brows down), sad (small mouth, brows tilted up), annoyed (lids slanting down inward), nervous (sweat
drop), asleep (closed lines).

**Mouth chart for lip sync:** rest line, small "o", medium open (dark oval), wide open with a pink tongue, row of teeth
("ee" sounds and grins), wide rectangle (shouting).

**Emotes and FX:** sweat drop, blush circles, motion lines, a sparkle on realisation, "Z z z" when asleep, tear streams,
small impact stars.

**Side characters = one bold accessory each:** a bucket hat with fishing lures, a police cap with a star, glasses on a
bead chain, a crown, a bandana, a balaclava. The body grammar stays the same, so a new character costs one accessory
and one outfit colour.

## 18. Transitions in detail (30 fps, `sheets/T_0m6_*.jpg`)

- **Rack focus with dolly:** over 6-10 frames the camera moves toward a foreground object while the background goes from
  sharp to blurred (~0.25 s). Captions keep switching normally.
- **Gag snap:** on an impact word ("fired") the frame shakes for 2-3 frames, then snaps to a wider framing where the
  result plays (the employee shoots up out of his chair).
- **Tilt from above:** the shot starts on the ceiling (tiles, lamps) and tilts down into the room in ~0.3 s.
- **Whip:** 4-8 frames of heavy directional blur, then the new framing settles with a soft ease-out.
- **Pull-out into a frame:** the camera pulls back until the scene is a poster, a photo or a thought, then continues in
  the new space.
- No fades to black/white and no transition packs; 13 % of transitions are quick 0.13-0.27 s cross-dissolves for jumps in time or place (see section 25; corrected).

## 19. What this means for building it

- A Short needs **6-9 sets** at this finish (three planes, practical lights, outlined props, textured surfaces), each
  used for several framings.
- The **character rig** is the most important asset: one parts system, the expression set, the mouth chart for lip
  sync, poses (sit, stand, walk, shrug, arms up, point, dig), emotes. Side characters are one accessory each.
- The **camera language** (sections 6 and 18) and the **3-plane depth** (section 14) are what make it look expensive.
  Without them, the same drawings look cheap.
- **Signs and labels are part of the writing**: each set gets 1-3 pun signs written from the script.

---

# PART 3: precise measurements, and WHY every element is there

Everything below was measured with computer vision (`deep_measure.py` -> `deep/<id>.json`, `script_stats.py`) on 5-6
of the 6 videos, then checked on full-resolution crops (`sheets/expressions.jpg`, `sheets/textures.jpg`). Where a
number is an estimate, it says so.

## 20. The exact numbers to build to

**Captions (identical in every video, the most precise rule in the style):**
- Glyph height **48-51 px** at 1080x1920 (51 px in 5 of 6 videos), every word.
- Centre **70.2-70.5 % down** the frame, horizontally **50.0 %** (dead centre).
- Width: median **22-27 %** of the frame width, up to ~60 % for two longer words.
- Switches **within 0.00-0.02 s of the word's start**: frame-accurate to the voice. No lead, no lag, no animation.
- On screen **100 %** of the time while words are spoken.

**Camera:**
- During holds the camera keeps drifting: median **0.02-0.64 % of the frame width per frame** (varies per video), and
  **pushes in far more often than it pulls out** (zoom-in in 28-58 % of hold frames vs zoom-out 12-36 %).
- Peak transition speed: p99 **10-15 % of the frame width per frame** (a whip crosses the whole frame in ~7-10 frames).
- **Camera roll**: up to ~0.4-1.2 degrees per frame (p95) during moves: transitions bank like a real handheld or
  drone camera; it is never perfectly level while moving.
- Fine jitter in holds: ~0.7-1.1 % of the width: a subtle handheld float, so even a "still" shot breathes.
- Easing: no single curve. Some transitions peak early (whip-in, then a long soft settle, time-to-peak ~0.3), some peak
  late (a slow wind-up into a fast arrival, ~0.7-0.9). The variety itself is part of the feel: no two moves feel the
  same.

**Energy across the video** (motion per tenth of the runtime, 1.0 = the video's average, mean of 6):

| 0-10 % | 10-20 % | 20-30 % | 30-40 % | 40-50 % | 50-60 % | 60-70 % | 70-80 % | 80-90 % | 90-100 % |
|---|---|---|---|---|---|---|---|---|---|
| **1.37** | 1.09 | 1.02 | 1.09 | 0.89 | **0.60** | 0.89 | 0.96 | 1.10 | 0.98 |

The hook is the most energetic tenth (the Japan Short: 14 -> 17 -> 23 in its first 3 seconds against a video average of
10). The quietest moment sits just past the middle, right before the turn. Then it builds again for the payoff.

**Characters:**
- Head outline **6-10 px** at 1080 wide (median 9 in close shots), always darker and thicker than any set outline.
- Main-character head diameter, median **18-28 % of the frame width** (a medium shot dominates); extreme close-ups
  (head over 55 % of the width) are short accents, a few % of the runtime.
- Faces sit **in the middle of the frame, not on the upper third**: centre x median 0.39-0.56, centre y median
  0.39-0.55 of the height. With the caption at 0.70, the eye travels only ~15-30 % of the screen between the face and
  the word.
- Mouth shape changes **~2-4 per second** while a character talks (limited animation: the mouth holds a shape for 3-15
  frames, it does not change on every syllable).
- Head tint follows the scene light (warm in lamplight, cool in offices, blue at night); never a pasted pure white.
- No neck: the round head overlaps a bean/egg-shaped torso.

**Look / finish:**
- Saturation (mean) **0.41-0.49**: colourful but not candy. Brightness (mean) **0.59-0.74**: mostly bright scenes.
- Vignette: corners at **80-96 %** of the centre's brightness (soft, always there).
- Measured high-frequency noise ~8-10 in flat areas, but magnified it is mostly YouTube compression: the real texture is painted into the surfaces (section 25).
- Sharpness: the frame centre is **6-10x sharper than the top and bottom edges** (depth of field + a soft edge falloff).

**Audio:**
- Music bed **13.6-16.9 dB under the voice**, in every video (the voice always wins).
- Narrator pitch roughly 170-190 Hz by a rough autocorrelation estimate: a light, young-sounding voice.
- Only **17-40 % of camera transitions carry their own sound hit**: sound effects are spent on actions in the story
  (scanner beep, rummaging, door, cash), not on every camera move.

**Script (6 videos):**
- Two structures:
  - **A, mystery first:** the story plays, "You see," lands at **76-88 %** of the runtime and explains it
    (cashier, Japan, burglar).
  - **B, riddle hook:** "You see," at **8-11 %**: the hook is a riddle, the story is the explanation, and the last line
    is the final reveal (knight, jar).
  - The cannonball video is a third shape, a "levels" list (each level worse than the last), with no "You see".
- Sentences are **long** (median 10-27 words, up to 40), chained with commas, "and", "so", "but". Captions are one
  word, but the speech never stops at a full stop long enough to swipe.
- **4 of 6 final sentences start with "So"**: the last line is always a consequence, the click of the puzzle.
- Hooks are 6-19 words, one sentence, concrete nouns, a person doing a strange thing.
- Second-person "you" is used heavily only in the "imagine" video (Japan: 20 times), otherwise third person.

## 21. Why every element is there

### Sound and words
- **Speech starts at 0.0 s.** On Shorts the first frame autoplays; one silent second reads as "nothing here" and the
  thumb moves. A voice mid-sentence is the strongest "stay" signal there is.
- **Long chained sentences.** A full stop is a natural place to leave. Run-on narration ("…and walks out. The second the
  door closes, the cashier is elbow deep…") never offers one.
- **"You see,"** is a gear change: it tells the viewer "the payoff starts now", which holds people through the last 20 %.
- **Ending on "So …"** makes the last line feel like the answer clicking, and ending exactly there (no outro, no
  "follow for more") sends the viewer straight into the loop, so replays count as watch time.
- **Music 15 dB under the voice.** The words carry the story; music only gives energy. If it competed, comprehension
  (and retention) would drop.
- **Sound effects on story actions, not on camera moves.** A whoosh on every move would turn into noise and feel like a
  template; a beep, a rummage or a door makes the world feel real and lands the joke.

### Captions
- **One word at a time** means the viewer can never read ahead and leave; their eyes are pulled back to the centre on
  every word.
- **Frame-accurate to the voice** so muted viewers get the same rhythm and the sound-on viewers get reinforcement.
- **At 70 % height, centre**: below the face (eye path face -> word is short), above YouTube's bottom UI (title,
  channel name, music line sit in the bottom ~18 %), and away from the like/comment/share column on the right edge.
- **Small (51 px)** because the art is the product. Big viral subtitles would cover the drawings people came for.

### Characters
- **Big white round heads with thick outlines** are the brightest, highest-contrast shapes on screen, so the eye lands
  on a face first in every shot (figure-ground). Thicker outlines than the sets keep characters "on top" of busy rooms.
- **The deadpan half-lidded default** is a blank canvas. Because the resting face is so flat, every change (eyes to
  rings, a toothy grin) reads as a big event at phone size, and the dry face matches the dry narration (comedy by
  contrast).
- **Grey filled eyes, no sclera, no nose, no ears**: fewer parts = cleaner at small sizes and cheaper to animate, and it
  is a strong, recognisable identity.
- **Brows and mouths carry the emotion** (soft blurred shapes) because they are the parts that read from far away.
- **Emotes (sweat drop, sparkle, blush)** explain the feeling in one icon, for viewers who watch muted.
- **Mouths at 2-4 changes per second**: enough to sell "he's talking", cheap enough to make a Short in a day. Full
  lip sync would cost a lot for little extra retention.
- **Heads tinted by the light**: they belong to the room instead of looking like stickers, which is what makes 2D
  characters in 3D sets believable.
- **One accessory per side character** lets the viewer recognise someone instantly when they come back. In the cashier
  video the customer's lure hat is planted in scene 7 and is the clue in the reveal (he carries it in his hand, now in a
  suit). Visual setup and payoff.

### Camera
- **It never stops.** A still frame on Shorts reads as a slideshow. Constant drift tells the brain "this is a film",
  keeps the eye active, and hides that sets are reused.
- **The camera moves TO the thing being said** (on "ticket" it dives onto the ticket; on "trash can" it tilts to the
  bin). The picture confirms each noun the instant it is spoken: the brain gets the word and the image together, which
  makes fast narration easy to follow.
- **The hook is the busiest tenth (1.37x)**: the first seconds decide everything, so they get the most moves and the
  closest shots.
- **The quiet dip at 50-60 % (0.60x)**: suspense needs stillness. The long waiting-room hold makes the viewer watch the
  door; the slowness is what makes the reveal hit.
- **Push-ins far more than pull-outs**: pushing in = getting closer to the secret. Pull-outs are kept for "zooming out
  to the bigger truth" moments (into the poster, the evidence board).
- **Roll and handheld float**: a perfectly level, perfectly smooth camera feels computer-made; slight banking and
  float feel filmed.
- **Real-camera transitions only (no crossfades)**: every scene change is a move through space, so the 60 s feel like
  one continuous trip rather than a slideshow of scenes.

### Depth and placement
- **Three planes with a blurred foreground** in most shots give parallax when the camera moves (that's what sells
  depth) and put the viewer "in the room", peeking past a counter or a head.
- **Centre 6-10x sharper than the edges** steers the eye to the subject and makes simple sets look cinematic. The
  background detail is there for the pause-and-look crowd, but it never competes.
- **Faces near the centre, key props just above the caption line** (the ticket, the wallet, the FIRE button sit low in
  the frame): face, prop and word are read in one glance.
- **The door in focus behind the waiting character** tells the viewer where the next thing will come from. The camera
  holds, the audience watches the door, and the reveal walks in exactly there.
- **Lamps at the top of the frame** close the composition, motivate the light and add a foreground layer.
- **The winners' posters on the wall** early in the waiting room foreshadow the ending (the scene becomes one of those
  posters).

### Worlds, colour and light
- **One light temperature per scene** makes each scene identifiable in a fraction of a second. Changes in temperature
  carry the emotional arc. In the cashier video: warm shop (greed), purple-pink night dream (fantasy), pink morning
  (hope), yellow waiting room (excitement), cold blue evidence board (the truth, the consequence).
- **The dream gets its own flat neon look** so nobody confuses imagination with what really happened.
- **The explanation becomes a top-down evidence board** because statistics are abstract. Photos in two columns
  ("CLERKS" vs "EVERYONE ELSE") turn a number into a picture, and top-down is the universal "investigation" view.
- **Moderate saturation and bright scenes**: rich enough to stop the scroll, calm enough to watch for 60 s without
  fatigue.
- **Painted surfaces, vignette, soft edges**: a filmic finish that hides the "clean CG" look and glues 2D characters and 3D sets
  together.

### Writing on props
- **Pun labels and hidden jokes** ("REEL BIG CASH" at a bait shop, "FINDERS KEEPERS" on his dream yacht, "DALE · AGAIN"
  on a winner polaroid, "GONE FISHIN'" on the agent's rack) reward pausing and rewatching. People who rewatch push the
  watch time over 100 %, and comment about what they spotted.
- **The ending returns to the first set** (a new trainee at the same counter): the loop is seamless, so an autoplay
  replay doesn't feel like a restart.

## 22. Replication checklist (what Legion must produce for each Short)

Script
- [ ] 155-240 words for 40-65 s, read at 3.5-4.0 words per second, starting at 0.0 s.
- [ ] Structure A (mystery, "You see," at ~75-88 %), B (riddle hook, "You see," at ~10 %) or C (levels list).
- [ ] Hook: one sentence, 6-19 words, a person doing a strange or tempting thing, no names, no dates.
- [ ] Long chained sentences, few full stops; quoted lines spoken by the narrator.
- [ ] Last sentence starts with "So …" (or lands the final reveal), no outro.
- [ ] 1-3 pun signs per set and at least one hidden rewatch joke, all our own text.

Picture
- [ ] 6-9 sets, each reused for several framings; the last shot returns to the first set.
- [ ] Three planes, foreground blurred in most shots; centre clearly sharper than the edges.
- [ ] One light temperature per scene; the temperature changes follow the emotional arc.
- [ ] A different, flatter look for any imagined or "what if" moment.
- [ ] A top-down or diagram-like board for the explanation.

Characters
- [ ] Round white head (tinted by the light), 6-10 px outline at 1080 wide, grey oval eyes with lids, soft brows,
      blurred mouth shapes, two-tone glossy hair with highlight strokes, no nose, ears or neck, bean torso,
      rubber-hose black limbs, ball hands.
- [ ] Deadpan default; big contrasting expression changes on key words; emotes for feelings.
- [ ] Mouth changes ~2-4 per second while talking.
- [ ] Each side character has one bold accessory; plant it early if it matters later.

Camera
- [ ] Never still: under 8 % near-still frames; holds keep a slow push-in or drift with a slight handheld float.
- [ ] Transitions 0.15-0.7 s, real-camera moves only (dolly, whip, tilt, top-down, pull-out, iris), directional blur,
      slight roll while moving.
- [ ] The camera moves to the noun being spoken.
- [ ] Energy: hook busiest (~1.4x), a calm dip just past the middle (~0.6x), build to the payoff.

Captions and sound
- [ ] One word, 48-51 px, white with a thin dark outline and soft shadow, centred at 70 % height, switching on the exact
      frame of the word.
- [ ] Music 14-17 dB under the voice; sound effects on in-story actions (not on every move); no fades.

## 23. Building it with Legion (the parts that map onto existing pieces)

| need | where in Legion | status |
|---|---|---|
| Script in structure A/B/C, word budget, "So …" endings, pun signs | Shorts planner (`SHORT_PLAN_PROMPT` + `hookcraft.RULES`) as a style's `script_rules` | rules to add |
| Voice at 3.5-4 words/s, music 15 dB under | voice + `shortsound` mix | settings to add |
| One-word captions, 51 px at 70 %, frame-accurate | captions in the renderer (word timings exist) | style settings to add |
| Character rig: parts, expressions, mouth chart, poses, emotes, light tint | FOLIO people rig (`studio/assets/folio/people.js`) as a new look pack | to build |
| Sets with three planes, practical lights, textures, outlines, pun signs | FOLIO sets/props (2D parallax) or the 3D path (`threed.py`) | decision: 2D parallax or 3D |
| Camera language, roll, float, motion blur, energy curve | FOLIO camera + shutter (motion blur exists) | moves to add |
| Grain, vignette, edge softness, DOF | FOLIO fx (`fx.js`) | settings to add |
| Checks: still share < 8 %, caption timing, energy curve, stills of 5 key frames | `shortqa` + `motion_qa` | thresholds to add |

## 24. Limits of this study (honest)

- Head detection finds a clear round head in only 12-37 % of sampled frames (shading, hats, partial faces and close
  crops break the shape test). The head-size and face-position numbers describe the frames where a full head was found.
- Mouth-rate, narrator pitch and grain are estimates from simple signal measures; the order of magnitude is reliable,
  the second decimal is not.
- The exact caption font and the music tracks can't be identified from the video; the caption is a bold geometric sans
  (Montserrat/Proxima class).
- Our version must keep the craft, never his characters, sets, names, stories or sign texts.

---

# PART 4: construction-level detail (characters, wardrobe, sets, light, lens), and three corrections

Sources: full-resolution grids (`deep2/grid_*.png`), a 15 fps turn (`deep2/turn.jpg`), top-down frames
(`deep2/top_bench.jpg`), pixel colour samples, a dissolve test on all 112 transitions (`dissolve_check.py`,
`deep2/dissolves.json`), a sharpness map of every second of all 6 videos, and a second-by-second colour log.

## 25. Three corrections to Parts 1-3

1. **The characters are 3D, not 2D cut-outs.** Evidence: the customer turns from front to back through a real
   three-quarter view (the face features slide across the round head, the back of the head shows glossy hair with a
   sphere-like highlight) and walks away into depth (`deep2/turn.jpg`); the cashier lies on his bed in true top-down
   perspective with foreshortened tube limbs, and his hands are seen from above on the counter (`deep2/top_bench.jpg`).
   They are **3D characters rendered with a toon look designed to read as 2D**: sphere head, bean torso, tube limbs,
   outlines, and a face made of flat 2D shapes (eyes, lids, brows, mouth) that sit on the sphere and are swapped per
   expression. Sections 7 and 14 ("2D cut-outs that face the camera") are wrong; this section replaces them.
2. **There ARE cross-dissolves, but only for jumps in time or place.** 15 of 112 transitions (13 %) are dissolves, each
   only **0.13-0.27 s** (usually ~0.15 s): into the dream, night to morning, the road to the office, into a top-down
   board. The other 87 % are camera moves through continuous space. Rule: **move through space, dissolve through time.**
   There are still no fades to black or white. (Corrects sections 6 and 18.)
3. **The "grain" is mostly YouTube compression.** Magnified 4x, large surfaces are smooth painted gradients with soft,
   low-frequency mottling (like a hand-painted texture), not film grain. Add a very light noise at most; the texture
   belongs in the surfaces. (Corrects sections 8, 20 and 22.)

## 26. Character construction sheet (build to these numbers)

Measured on the cashier's neutral close-up (head ~720 px wide) and checked on the surprised, happy, customer, boss,
police and priest frames. Positions are relative to the head: x/y from the centre in head DIAMETERS (D), + = right/down.

**Body (standing, priest, `deep2/grid_bodies.png`):**
- Head ≈ **30 % of total height**; torso/robe ≈ **50 %**; legs ≈ **20 %**.
- Torso: a bean/egg capsule, **slightly narrower than the head** (~0.75-0.85 D wide), no neck: the head overlaps the
  top of the torso.
- Limbs: tubes in warm near-black, thickness ≈ **0.035-0.05 D**; elbows and knees bend in smooth arcs (rubber hose).
- Hands: black balls ≈ **0.09-0.11 D**. Feet: small dark ovals/shoes.
- Silhouette rule: the head is always the biggest, brightest shape.

**Head and face:**
| part | position (x, y in D) | size (in D) | colour | notes |
|---|---|---|---|---|
| head | centre | 1.0 | centre #FEFCFA -> edge #F2E7E5 | radial shading: brightest in the middle, evenly darker toward every edge (left/right/bottom within 2 %); no directional key light on faces |
| outline | around everything | ~2 % of D in extreme close-ups, ~9 px at 1080 in medium shots | **#211715** (warm near-black, never #000) | thicker relative to the head in wide shots: mostly screen-space width |
| hair cap | covers the top ~40 % | wavy lower edge, sideburns down to ~0.1 below centre at the sides | base #824418, shadow #361E1B, light streaks lighter tan | 3-5 long curved highlight streaks following the head's curve, a parting flap, and the signature tuft (the cashier: a hooked curl at x ≈ +0.2) |
| brows | ±0.13, -0.08 | ~0.18 long, ~0.025 thick | #756768 (warm grey), soft blurred edges | slight arch; they carry most of the emotion |
| eye lids | ±0.12, +0.06 | lid stroke ~0.20 wide (wider than the eye) | #817674 | the lid line cuts across the top of the eye: the deadpan look |
| eyes | ±0.12 (spacing 0.27), +0.11 | oval ~0.09 x 0.08 | #7E706F (warm grey), filled, no white | pupils = the whole oval; no highlight dot |
| mouth (rest) | -0.06 (offset to one side), +0.36 | ~0.27 x 0.055 rounded bar | #685A59, soft blurred edges | the offset is part of the smirk |
| nose, ears, neck | none | | | |

All face parts sit **below the head's centre** (eyes +0.11, mouth +0.36): the hair cap owns the top of the head, the
face owns the bottom. This low face is what makes the heads read as round and "baby-like".

**Expression set (shapes to build as swappable face decals):**
| expression | lids | eyes | brows | mouth | extras |
|---|---|---|---|---|---|
| deadpan (default) | straight lid across the top third | grey ovals | level, slightly low | short bar, offset | |
| sly / scheming | lids lower, slight tilt | ovals looking sideways | one raised | small closed smirk | |
| surprised | none | smaller ovals, raised | high and flat | small round "o", dark inside, **pink tongue** | **blue sweat drop** at the hairline (pale #CFDBE8 highlight) |
| shocked / caught | none | open **rings** with tiny pupils | raised | small or flat | sweat drop, arms frozen up |
| happy | closed upward arcs (^ ^) | | relaxed | thin smile curve | |
| toothy grin | half-lids or closed arcs | | | wide bar with a **row of teeth** | often in shadow (a "villain" moment) |
| sad | soft | small | tilted up in the middle | small down-curve | |
| annoyed / grumpy | lids slanting down to the middle | | low | down-curve or flat | moustache characters frown with the moustache |
| bored / waiting | half-lids | **looking up** | one raised | small pucker | |
| laughing | closed arcs | | | big open D-shape | |
| angry (big) | slanted | | V-shaped | gritted | **the whole head turns red** |
| asleep | closed lines | | | content smile | "Z z" |

**Mouth chart for talking (changes 2-4 times per second):** rest bar, small "o", medium open dark oval, wide open with
a pink tongue, teeth row, wide shout rectangle.

**Rendering rules for characters:**
- Face shapes are **flat 2D decals on the 3D sphere**: when the head turns they slide across it and squash at the edge.
- The skin takes on the **colour of the scene's light** (warm in lamplight, cool in offices, blue at night) but keeps its
  radial falloff, so expressions read the same in every scene.
- Outline colour is warm near-black on characters; on sets it is a lighter warm dark brown and thinner.
- Animals break one rule on purpose: **coloured irises with pupils** (the orange cat has yellow-green eyes).

## 27. Why the expressions change exactly where they do

The face changes on the **one word that carries the emotional turn**, never between words:
- cashier, "a **million** dollars" -> surprised + sweat drop (discovery);
- "and said, **sorry** man" -> sly half-lid (the decision to lie);
- "fishing it back out" -> toothy grin **in a dark iris** (villainy = darkness + teeth);
- "like it's been his **all along**" -> happy closed eyes (self-satisfaction);
- "five minutes **go by**" -> bored, looking up (time passing);
- "**followed by two police officers**" -> shock rings, arms frozen up (consequence).

Why: viewers decode a face faster than words. When the face flips on the key word, the emotion lands twice (sound +
image) at the same instant. The deadpan default is the reference point that makes every flip read as big.

## 28. Wardrobe (all 6 videos) and why people wear what they wear

| video | character | wears | why |
|---|---|---|---|
| cashier | cashier "Kyle" | red polo, white name tag "KYLE", round fish logo | **the name tag does the exposition** (no "his name was Kyle" needed); red pops against the green wall (complementary) |
| cashier | customer / agent | yellow raincoat, olive bucket hat covered in fishing lures, moustache; later a grey suit and a badge, **still holding the lure hat** | a fisherman at a bait shop = instantly believable; the hat is planted early and is the clue in the reveal; the costume change IS the plot twist |
| cashier | prize clerk | curly orange hair, glasses on a bead chain, teal blouse | "office lady" in one look; teal ties her into the teal office |
| cashier | police | blue uniform, cap with a star | authority, readable at any size |
| cashier | the new cashier | the same red polo, tag "TRAINEE" | the loop: same uniform, new person = the trap is set again |
| Japan | boss | grey hair, navy suit, red tie, closed smiling eyes | corporate power + fake friendliness (always smiling while doing something cruel) |
| Japan | employee | black hair, glasses, light-blue shirt | the ordinary office worker the viewer identifies with |
| Japan | the guy with his feet up | green jacket, relaxed pose | the future version of the hero (same room, given up) |
| burglar | burglar | black balaclava/beanie, dark clothes | "burglar" in one silhouette |
| burglar | dad | green sweater, glasses, blue slippers, later a baseball bat | home, comfort, then defence |
| burglar | the buyer | yellow coat, beanie, beard | (the same man as the burglar, unmasked: costume = identity reveal) |
| jar | inventor / scholar | blue robe, official's black hat with ornaments, round glasses | ancient official + "smart" (glasses) |
| jar | emperor | black-and-red robe, tall hat | the most powerful person = the darkest, richest colours |
| jar | guards | red armour, helmets | an army as a colour block |
| cannonballs | pirates | red-and-white or blue-and-white striped shirts, bandanas, one tricorn captain | "pirate" in one pattern; stripes read at tiny sizes |
| cannonballs | navy | blue uniforms, caps | the opposing side as a colour |
| knight | knight | full silver plate armour, face visible in the helmet opening | the face must always stay visible |
| knight | priest | red robe with gold trim and a stole | money + religion; red = the one who gets angry (his head turns red later) |

**Wardrobe rules derived from this:**
1. **One costume = one role, readable in a fraction of a second** (uniform, robe, armour, apron, balaclava).
2. **Text on clothing does exposition** (name tags, "TRAINEE"): it saves narration time.
3. **The protagonist's colour contrasts with the main set** (red on green, blue on yellow, silver on red-and-white).
4. **One signature accessory per recurring character**, planted early if it pays off later.
5. **A costume change is a plot beat** (fisherman -> agent, burglar -> buyer, cashier -> trainee). The same face with a
   new costume = "it was him all along".
6. **Authority and power get the darkest, most saturated outfits** (navy suits, black-red robes, police blue);
   ordinary people get lighter, softer colours.
7. **The face always stays visible** (helmets with open faces, hats above the eyes, never covered faces except the
   burglar's mask, which is the point).

## 29. Sets: how to build them

- **3D geometry with a toon finish**: flat-ish colour fields with soft gradients, a warm dark-brown outline on object
  edges (thinner and lighter than the characters'), soft ambient occlusion in corners and under objects, soft contact
  shadows under furniture.
- **Big surfaces are painted, not photo-textured**: low-frequency mottling and gentle gradients on walls; small specks
  or flecks on counters and terrazzo; vertical plank lines on wainscoting; outlined ceiling tiles.
- **Nothing is pure black, white or neutral grey**: every colour is warm-tinted (the counter is #BAB3B0, not grey).
- **Practical lights in frame** (pendants, bare bulbs, desk lamps, lanterns) with bloom and a soft cone, plus window
  light: sun patches on floors, **window-blind stripe shadows** on boards.
- **Density gradient**: the background is busy (posters, shelves, product walls, pinned papers), the space right
  around the subject is clean, so the character never fights the set.
- **Sets are rendered into props**: the board's polaroid is a re-render of the earlier waiting-room shot, so "the scene
  becomes a photo" transitions are seamless.
- **Hidden joke props in every main set**: "$$$ SOON!" on the bedroom wall, a fishbowl holding a tiny yacht and castle
  (his dream), "SUBS" punch card in the wallet, "DALE · AGAIN" on a winner photo, "PLEASE DON'T TAP THE GLASS".
- **Information lives on diegetic signs and documents** when the story needs facts: the "Pardon" scroll ("One Crime /
  Next Week / Forgiven", "Fee paid 40 coins" crossed out), the "Price of Sins" menu board, "CLERKS" vs "EVERYONE ELSE".
- **Imagination sets are simpler**: fewer textures, flatter shading, neon purple-pink light, the character tinted blue.
- **Endings**: either back in the first set (loop) or a sunset with figures walking away down a road.

## 30. Light and colour arc (measured, cashier video, second by second)

Warmth = (R-B)/(R+B) of the whole frame; brightness 0-1.

| seconds | scene | warmth | brightness | meaning |
|---|---|---|---|---|
| 0-11 | the shop, the temptation | +0.11 to +0.28 | 0.58-0.71 | everyday warmth |
| 12-13 | digging in the bin, the iris secret | ~0.00 | **0.32 (darkest)** | the secret / the crime |
| 14-16 | the wallet, "all along" | +0.17 to +0.27 | 0.60 | smug |
| 17-22 | the dream | **-0.16 to -0.52 (coldest)** | 0.68-0.76 | fantasy, not real |
| 23-25 | next morning, the drive | +0.08 to +0.17 | **0.83 (brightest)** | false hope |
| 26-32 | prize office | -0.12 to -0.26 | 0.61-0.74 | officialdom, cool |
| 33-43 | waiting room | +0.07 to +0.11 | 0.74-0.80 | hopeful, bright, then the trap |
| 44-50 | evidence board, the truth | -0.20 to -0.42 | 0.62-0.87 | cold facts |
| 51-55 | printing, the agent at night | -0.34 to +0.24 | 0.42-0.63 | the sting operation |
| 56-57 | back in the shop | **+0.29 to +0.38** | 0.60 | the loop: the same warmth as the start |

Rules: one temperature per scene; **darkness marks secrets**, **peak brightness marks false hope**, **cold marks
fantasy and truth**, and the ending returns to the opening temperature so the loop matches in colour too.

## 31. Lens and finish (measured on every second of all 6 videos)

**Sharpness map** (relative to the sharpest band = 1.0):
- By height, top to bottom (12 bands): about **0.1-0.2 | 0.2-0.35 | 0.3-0.5 | 0.4-0.7 | 0.6-0.9 | 0.7-1.0 | 0.7-0.9 |
  0.5-0.8 | 1.0 (caption band) | 0.2-0.4 | 0.1-0.2 | 0.03-0.11**.
- By width (6 bands): **0.4-0.7 | 0.65-0.8 | 1.0 | 0.9-1.0 | 0.65-0.9 | 0.4-0.7**.
- So on top of normal depth of field there is a **constant lens-style falloff toward the edges, much stronger toward
  the top and bottom than the sides**: an elliptical "sweet spot" covering roughly 30-75 % of the height and the middle
  half of the width. It is present in wide shots too, so it is a post effect, not focus.
- Depth of field on top of that: strong whenever the subject is closer than a medium shot.
- Vignette: corners at 80-96 % of the centre brightness.
- Bloom on practical lights and bright windows.
- Motion blur: moderate and directional on fast moves (not smeared).
- **No chromatic aberration** worth measuring.
- Grain: see correction 3 (painted surfaces, at most a whisper of noise).

**Why:** the sweet spot keeps the eye in the band where faces (35-55 % height), props and the caption (70 %) live;
the soft edges hide where the set ends and make a real-time render feel like it was shot through a real lens.

## 32. Transitions, final rule set

- **87 % camera moves** through continuous 3D space (dolly push with rack focus, whip with directional blur and roll,
  tilt from the ceiling, rise to top-down, pull-out into a photo or poster), 0.15-0.7 s.
- **13 % quick cross-dissolves** (0.13-0.27 s) for jumps in time or place, often combined with a move.
- **Foreground wipes**: a character's arm or a head sweeps across the lens to hide a change.
- **Scene-to-prop**: pull out until the scene is a photo, poster or frame, then continue in the new room.
- No fades to black/white, no transition packs, no hard cuts.

## 33. Building it in Legion (corrected: the 3D path)

Legion's 3D engine (`studio/threed.py` + `studio/threed/render.py`: three.js in Chromium on the GPU, with a director, a
cast system, camera-path checks for speed and roll, preview and review rounds, and frame checks) is the right base,
because the reference itself is 3D. What to add:

1. **A toon cast** replacing the faceless mannequins: sphere head (radius = 0.3 of height), bean torso, tube limbs,
   ball hands; an outline pass (inverted hull) in #211715; a toon material with the radial head shading and a
   scene-light tint; hair caps as separate meshes with highlight streaks; accessories as small meshes.
2. **Face decals**: a canvas texture per face (eyes, lids, brows, mouth) drawn from the expression table (section 26)
   and the mouth chart, projected onto the front of the sphere and swapped per word from the word timings.
3. **A toon set kit**: rooms with outlined edges, painted textures, practical lights with bloom, blind shadows, AO and
   contact shadows, sign and label meshes whose text the script writes (pun signs, documents, name tags).
4. **The lens finish**: depth of field, the elliptical edge softness (section 31), vignette, bloom, a warm grade,
   moderate directional motion blur.
5. **Camera grammar** from sections 6, 18 and 32 in the director prompt (the engine already plans and checks paths):
   move to the spoken noun, energy curve (1.4x hook, 0.6x dip, build), push-ins over pull-outs, slight roll and float,
   dissolves only for time/place jumps.
6. **Script, voice, captions, sound** from Legion's Shorts planner with this style's rules (sections 2-4, 20-22,
   hookcraft), captions 48-51 px at 70 %, music 14-17 dB under the voice.
7. **Checks**: near-still frames under 8 %, caption timing within 1 frame, face visible in most shots, the colour arc
   returns to the start, 5 stills (hook, lip-sync close-up, mid-transition, caption, reveal) reviewed before the full
   render.

## 34. Still unknown

- The exact caption font, the music tracks, and the exact 3D software (the look is consistent with a real-time or
  toon-shaded renderer; Legion's three.js path can reach it).
- Exact hair/hat meshes per character (each is designed per story; we design our own).
- Whether eyes blink on a schedule (blinks were not clearly visible at 10 fps; add a natural blink every 3-5 s).

---

# PART 5: animation and direction, and WHY everything is the way it is

Sources: full-frame-rate strips of acting moments and effects (`anim/shrug.jpg`, `wave.jpg`, `waiting.jpg`, `bubble.jpg`,
`dreamframe.jpg`, `whipup.jpg`, `jar_end.jpg`, `cannon_end.jpg`), the 28-moment shot list (section 12), and a sync test
of all 112 camera moves against the word timings.

## 35. How the characters move (animation principles, observed)

| principle | what they do | measured / seen |
|---|---|---|
| Frame rate | bodies and cameras move on every frame (3D); **mouths hold a shape for 2-4 frames** (limited, 2D-style) | `wave.jpg`: arm and head change every frame, mouth every 2-4 frames |
| Blinks | **2-frame blinks** (eyes become lines), and blinks used as **accents on actions** (a squint on the ticket toss) | `shrug.jpg` row 3, `wave.jpg` row 3 |
| Anticipation | before every big emotional change the body **dips or leans back for ~4-6 frames**, then pops into the new pose | `waiting.jpg`: bored slump -> dip -> arms up with a toothy grin |
| Staggered reactions | a realisation builds in **three steps over ~10 frames**: mouth opens -> emote (sweat drop) -> eyes snap to rings | `whipup.jpg`, "a million" |
| Never frozen | idle motion in every hold: a slow head bob, breathing, small weight shifts; happy characters loop a ~0.5 s cheering cycle | `waiting.jpg` |
| Holds | the face holds one expression through the narration, then flips on the key word (section 27) | |
| Arcs | arms swing in arcs (rubber-hose limbs bend smoothly), heads tilt on arcs | `wave.jpg` |
| Walks | small, bobbing steps; characters **exit into depth** (toward a door, away from the camera) rather than sideways | `bubble.jpg` |
| Presenting props | an object that matters is **lifted into frame next to the face** (the ticket rises from below to the shoulder) | `wave.jpg` |
| Gag physics | exaggerated, fast, with speed lines: ejection out of a chair, splinter storms, smash impacts | 0m6, cannonball |
| Props act too | register digits **roll like a slot machine** and settle on "$1,000,000"; doors swing; rack doors open; stamps land | `whipup.jpg`, section 12 |

**Why:**
- Every-frame body motion + held mouth shapes = the smoothness of 3D with the charm (and cost) of 2D.
- Anticipation makes a change readable at speed: the dip tells the eye "something is about to happen", so the pop
  isn't missed in a fast scroll.
- Staggered reactions read as thinking: mouth (shock), sweat (fear), eyes (realisation). A single-frame swap would read
  as a glitch.
- Exits into depth keep the subject centred in a vertical frame (sideways exits leave a 9:16 frame in 0.3 s).
- Presenting the prop next to the face puts the two most important things in one glance and tells the viewer "this
  object is the story".

## 36. Everything is locked to the voice, word by word (measured)

- Camera moves **start on a word's first syllable**: median **0.00 s** from the nearest word start (middle half within
  ±0.07 s, about ±2 frames).
- They also **land on a word**: median **-0.01 s**; **82 %** of landings are within 0.15 s of a word start.
- **73 %** of landings fall on a content word (noun, verb, number), not on "the / and / a".
- Captions switch on the exact frame of each word (section 20); faces flip on the key word (section 27).

**Why:** the voice is the clock of the whole video. When the camera, the caption and the face all hit the same
syllable, the viewer receives the word three times at once (hear, read, see). That's what lets him narrate at 3.5-4
words per second without anyone getting lost, and it's why the video feels "tight" even though nothing is cut.

## 37. Camera angles, heights and lenses, and why

Shot mix in the cashier video (28 moments): medium eye-level ~40 %, extreme close-ups ~15 %, top-down ~18 %,
over-the-shoulder ~11 %, wide establishing ~11 %, iris/spotlight ~4 %.

| angle | when he uses it | why |
|---|---|---|
| **Eye level, character height** (default) | narration about a character | the viewer is a peer in the room; faces read straight on |
| **Slightly low, looking up** | authority and reveals: police, the boss, the agent in the doorway, big objects (the jar, the cannon) | looking up = power and threat; big objects feel heavy |
| **Top-down** | plans, evidence boards, wallets and hands, beds, ticket racks, floor plans | the god's-eye view = understanding; it turns a scene into a diagram |
| **Over the shoulder** (blurred head in front) | conversations, the customer at the counter, the clerk behind the glass | puts the viewer behind the protagonist: it's his story, seen from his side |
| **Extreme close-up** | decisions and reactions (sorry man, the toothy grin, the shock) | the face fills the phone; the emotion can't be missed |
| **High wide** | new locations, time jumps (road, castle, ship, city) | orientation in one glance before diving in |
| **Iris / spotlight** | the secret, the crime | theatre convention: the world goes dark, only the guilty face is lit |
| **Underground / cutaway** | the hidden cause (fault line, pendulum inside the jar) | the camera physically goes where the explanation is |

**Lens and framing:**
- Rooms are shot **wide** (slight stretch at the edges) with the **ceiling and the floor both in frame**: a 9:16 frame
  has height to fill, and ceilings with lamps (top) and counters/floors (bottom, blurred) frame the face in the middle.
- Close-ups use a **longer lens feel**: the background compresses and blurs strongly.
- The vertical frame is used in **bands**: top 0-25 % ceiling/lamps/sky; 30-60 % faces; 60-75 % the key prop and the
  caption; bottom 75-100 % foreground counter/floor (soft, safe under YouTube's UI). This is why faces measure at 39-55 %
  height and the caption sits at 70 %.
- The camera is slightly below a standing character's eye line in many interiors: it makes small round characters feel
  bigger and the room feel like a cosy diorama.

## 38. Lighting setups, and why each is lit that way

| setup | how | used for | why |
|---|---|---|---|
| Warm practical interior | 1-3 lamps in frame (pendants, bare bulbs), warm key, cool soft fill, bloom on bulbs | everyday places: shop, office, living room | lamps in frame justify the light and add a top layer; warmth = ordinary, safe |
| Bright daylight interior | even window light, warm bounce, sun patches on the floor | hope, waiting, "good news" | brightness is optimism; the waiting room is the brightest place right before the trap |
| Cool official | teal/blue ambient, flat | offices, claims windows | institutions feel cold |
| Night with one warm source | deep indigo ambient + one lamp, lantern or lit window, a big moon | scheming, sleeping, agents, burglars | the warm island in the dark points the eye at the one thing that matters |
| Neon dream | purple-pink sky, glowing moon, simplified shading, blue-tinted character | imagination, "what if" | unreal colours = not real, instantly |
| Blind-stripe sunlight | hard diagonal shadows across a board | evidence, investigation, the explanation | the detective-film convention: "now we find out" |
| Iris glow | black surround, a light ring and soft rays around the face | the secret moment | a spotlight on guilt |
| Golden hour | low sun, long shadows, peach sky, bloom | journeys, endings, consequences | resolution and the end of the day |
| Molten glow | gold-orange emissive cracks | disasters, the big reveal | the energy of the event; it also lights the cutaway |

On faces the shading stays **radial** (section 26) whatever the setup: the scene changes the colour of the light, never
the readability of the expression.

## 39. Effects and transitions: why they break the way they do

- **The fishbowl dream (cashier):** the dream world (yacht, castle, moon, lily pads) is shot as if it were real; on "at
  least in his head" the camera pulls back and the whole dream is **inside the fishbowl on his nightstand**, next to him
  asleep. Why: no cut is needed (the camera simply travels out of the dream), and putting a fantasy in a little glass
  bowl makes it small, fragile and private. The bowl is then a prop in the real room.
- **Scene into photo (cashier):** the camera pulls back from the waiting room until it is a polaroid pinned on the
  evidence board. Why: "here's the real-life explanation" becomes a literal zoom out from the story to the bigger picture.
- **The molten crack and the dive underground (jar):** on "earthquake" the ground splits with a glowing gold crack, and
  the camera follows it down into a geological cross-section with a glowing fault line while the city crumbles above.
  The last words are "right underneath them". Why: the final camera move acts out the final words; the gold glow rhymes
  with the bronze-and-gold dragons that predicted it.
- **Cutaways (jar pendulum):** the jar is shown cut open to reveal the pendulum and rods. Why: mechanisms are invisible;
  a cutaway makes the "how" a picture.
- **Impact sequence (cannon):** sparks and white radial cracks at the moment of impact -> a big, flat, cel-shaded orange
  explosion with radiating speed lines and flying debris -> a dark mushroom of smoke -> a **comic button** (tiny pirates
  bobbing in a barrel). Why: the cracks show force, the explosion is the peak, and the tiny gag releases the tension so
  the video ends on a laugh, not on noise.
- **Smoke-puff wipe (cannon):** the cannon's own smoke fills the frame and hides the change of scene. Why: the transition
  comes from inside the story, so it never feels like an editing trick.
- **Quick dissolves (13 %)** for jumps in time or place (night to morning, road to office). Why: a move would imply a
  continuous space; a dissolve says "later" or "elsewhere".
- **Speed lines, motion lines, impact stars** only on gags and impacts. Why: they mark comedy beats; using them
  everywhere would kill the joke.
- **The neon imagination look** and the **iris** are the only times the "rules of the world" change, and both mean
  something (unreal / secret).

## 40. Scene design: why every element is in the scene

Every object in a set has **one of four jobs**:
1. **Place**: tells you where you are in one glance (ceiling tiles + lottery boards = a convenience store).
2. **Foreshadow**: shows what matters before it matters.
3. **Joke**: rewards a pause or a rewatch.
4. **Inform**: carries a fact the narration doesn't have to say.

**The motif system.** Each video's props and costumes follow one metaphor that secretly tells the twist. In the cashier
video that metaphor is **fishing = bait**:
- the shop is a **bait** shop ("LIVE BAIT"), the cashier's polo has a **fish** logo;
- the ticket is called **"REEL BIG CASH"** with a fish on it;
- the customer is a fisherman with a hat full of **lures**;
- the dream yacht is named **"FINDERS KEEPERS"** and floats in a **fishbowl**;
- the ticket rack is tagged **"GONE FISHIN'"**, the agent walks into a **"BAIT · GAS"** shop.
The narration only says "printing winning tickets as **bait**" in the last ten seconds; the picture has been saying
it from the first frame. Why: rewatchers spot it (comments), first-time viewers feel the ending "clicks".

Other videos follow the same rule: the burglar video plants a **ruler/tape measure** (one inch), a **"DON'T MOVE"** note
on the fridge and the **FOR SALE / SOLD** sign (the resale twist) and **keys** (he kept a key); the Japan video uses a
**"CAREER DEVELOPMENT ROOM"** sign (a corporate euphemism), a ticking clock, an empty inbox and feet on the desk
(boredom as punishment); the knight video's **"Pardon" document literally lists the crime to be committed next week**.

**Placement logic:**
- **What matters next is already in view**: the door is in focus behind the waiting hero before the agent walks
  through it; the lure hat is in the agent's hand at the reveal; the key, the ruler, the "SOLD" sign appear before
  they're explained.
- **Foreground objects** (lamps, counters, heads, hats) sit at the frame edges to add depth and parallax and to frame
  the subject.
- **Exposition at eye level**: posters, signs and documents are placed where the eye already is (around the face and
  the caption band), never at the very top or bottom.
- **Clean space around the subject**: busy backgrounds, but nothing high-contrast directly behind the head.

## 41. Direction rules for Legion's 3D director (to paste into the style)

1. The voice is the clock: start and land every camera move on a word start (±2 frames), preferably the spoken noun,
   number or verb; the face flips on the key word; the caption switches on the exact frame.
2. Move to the thing being said (dive to the ticket on "ticket", tilt to the bin on "trash can").
3. Energy curve: the busiest moves in the first 10 % (about 1.4x), a slow hold just past the middle (about 0.6x)
   before the turn, then build to the payoff.
4. Move through space, dissolve (0.13-0.27 s) through time or place; never fade to black.
5. Angles by meaning: eye level by default, low for authority and reveals, top-down for plans/evidence/hands/sleep,
   over the shoulder for conversations, extreme close-ups for decisions, an iris for the secret, a cutaway for the cause.
6. Frame in bands: lamps/ceiling on top, the face at 35-55 %, the key prop just above the caption at 70 %, a soft
   foreground at the bottom.
7. Light by meaning: warm everyday, bright for false hope, cool for institutions, night with one warm source for
   scheming, neon for imagination, blind stripes for the explanation, golden hour for endings; faces always radially
   lit; return to the opening temperature at the end.
8. Characters never freeze; anticipate big changes (4-6 frame dip); stagger reactions (mouth -> emote -> eyes over ~10
   frames); exit into depth; present important props beside the face; mouths change 2-4 times per second, bodies on
   every frame; blink every few seconds and on actions.
9. Effects only with a meaning: cracks for force, cutaways for mechanisms, explosions for peaks followed by a small
   comic button, smoke or foreground wipes from inside the story, speed lines only on gags.
10. Design one motif per video that secretly tells the twist, and plant every payoff object on screen before it's
    explained; every prop has a job (place, foreshadow, joke, inform).
11. End on the punchline, ideally back in the first set (loop) or on a visual gag; never on an outro.

---

# PART 6: backgrounds and scenes, how much is built, and why

Sources: every camera angle used inside each place of the cashier video (`bg/coverage.jpg`), distant backdrops and
special sets from the other videos (`bg/far.jpg`, `bg/castle_top.png`), recurring set dressing across videos
(`bg/reuse.jpg`), and colour clustering of lit vs shadow areas in four lighting setups.

## 42. How much of each place is actually built

| place (cashier video) | angles the camera ever takes | what had to exist |
|---|---|---|
| bait-and-lottery shop | forward (counter, back wall with lottery boards, pendant lamp), reverse over the shoulder (front windows, glass door), down to the floor (bin, checkered mat) | **the whole room**: it hosts a conversation, which needs shot AND reverse shot |
| prize-claims office | only through the glass, toward the clerk's booth | **one booth front** (window, counter, posters behind the clerk) |
| waiting room | always the same direction: back wall ("OUR WINNERS", posters, the door), benches, fish tank, floor | **one wall + floor**: a theatre stage |
| road | a strip of road with fields and the horizon | **a strip** |
| bedroom | top-down on the bed and nightstand | **a floor patch** with the bed, nightstand, pizza box |
| evidence board | top-down on the board | **a board** |
| dream lake | the yacht, the moon, a castle on a cliff | **a miniature inside a fishbowl** |

**The rule:** a place is built only as far as the camera looks. Rooms with a conversation get every wall; every other
place is one wall, one booth, one strip or one surface.

**Why only parts of a scene, not full scenes:**
1. **The camera path comes first, the set second.** Each place is designed for the 2-4 shots it must deliver (the
   way film and theatre sets are built), so nothing is modelled that the camera never sees.
2. **More places beat complete places.** 9 sets in 58 seconds keeps the eye fed with new pictures; building 9 complete
   rooms would cost the same as 30 partial ones. The budget goes into the number of places and their finish, not into
   walls behind the camera.
3. **Every place is identified by one "name wall".** The camera faces the wall that carries the place's name or
   function ("OUR WINNERS", "PRIZE CLAIMS", "LOTTERY", "CAREER DEVELOPMENT ROOM", "Pardons"), so the location reads in
   a fraction of a second and the other walls never need to exist.
4. **The vertical frame only ever shows a slice.** A 9:16 frame sees a narrow wedge of a room; most of any room is
   always off screen anyway. The viewer's brain completes the rest.
5. **Nothing behind the camera can distract.** A partial set is also a focused set: every visible thing was chosen.
6. **Where the set ends is always hidden**: by the depth of field, by the elliptical edge softness (section 31), by the
   vignette, by a foreground object (lamp, counter, head) at the frame edge, and by framing the name wall straight on.

## 43. Micro-sets: one object as a whole scene

Some "scenes" are a single surface or object, filmed so close that it fills the frame:
- the **ticket** on the counter, the **wallet** with the driver's licence, the **ticket rack** from above;
- the **evidence board** (top-down, blind-stripe light);
- the **sword blade** with the knight's face reflected in it and blurred awning stripes behind (knight video);
- the **fishbowl**, which holds the whole dream world (yacht, castle, moon, lily pads).

**Why:** a micro-set is the cheapest way to show the one thing the narration names (the camera dives to the noun), it
makes small objects feel like events, and it's the natural bridge between big places (the camera can travel from a room
into an object and out into another room). It's also how the explanation gets told without leaving the world: the
board, the document, the menu of sins are props, not infographics.

## 44. The asset kit (recurring set dressing across videos)

Few objects are literally copied between videos (each story gets its own world), but the same **kinds** of objects and
the same construction come back every time:
- **Ceilings:** a grid of outlined tiles, with **pendant lamps** or round ceiling lights hanging into frame.
- **Time devices:** **wall clocks** and **tear-off calendars** with a readable date ("NOV FRI 18", "APR MON 28"): time
  passing is shown, not said.
- **Doors** with a small window and a sign ("STAFF ONLY"), often half open, often in focus behind a character.
- **Framed pictures** that are tiny drawings of characters in the same style (winner portraits, family photos, kids'
  drawings of a house or a boat).
- **Walls:** painted plaster with a wood wainscot, cinder block (offices, the "punishment" room), patterned wallpaper
  (homes), brick (kitchens, ovens, castles).
- **Floors:** checkered tiles, speckled terrazzo, planks, patterned or shaggy carpet drawn as strokes.
- **Living details:** fish tanks, potted plants, a lucky-cat figure, mugs with a name ("KEN"), stacked boxes.
- **Crowds:** many copies of the same simple figure (the emperor's army), arranged in blocks.

**Why a kit:** a consistent library of object types keeps every video recognisably "this channel" while each story still
gets its own place; it's also what makes 6-9 finished sets per Short affordable.

## 45. Exteriors: layered backdrops

Big outdoor views are built in 4 layers (`bg/castle_top.png`):
1. **Near:** the hero set (castle walls with drawn brick lines, banners), the most saturated and contrasted layer.
2. **Middle:** **repeated small elements** forming a mass (a hill of near-identical houses, a block of soldiers, a forest
   of round trees), lower contrast.
3. **Far:** **flat painted shapes** with outlines (mountains with snow caps, rock arches), pale and blue.
4. **Sky:** a gradient from near-white at the horizon to blue (or peach/purple) at the top, with a few puffy, softly
   outlined clouds.

Outlines persist at every depth but fade in contrast; colour desaturates toward blue with distance (atmospheric
perspective). **Why:** layers give strong parallax when the camera moves (depth for free), the distance haze keeps the
backdrop from competing with the characters, and painted far layers cost nothing compared to modelling a world.

## 46. Light and colour inside the sets (measured)

| setup | lit areas | shadows | note |
|---|---|---|---|
| bright waiting room | warm off-white #E4DDD6 | dark teal #193042 | the warm floor makes the space feel hopeful |
| evidence board (blue light) | periwinkle #8EA3F2 | navy-indigo #222142 | cold light for the truth; shadows still coloured |
| night interior (burglar) | periwinkle #6369CF | deep indigo #171F58 (53 % of the frame) | one warm accent #CF654D on the hero object (the red couch under the lamp) |
| golden hour exterior | peach #DFAE79 / #FCDAB0 | warm brown #4F4235 | the whole frame in one warm hue family (hue 30-34) |

**Rules:**
- **Shadows are never black or neutral grey**: they take the colour of the ambient light (indigo at night, teal in a
  bright room, warm brown at sunset).
- **Warm light, cool shadows** in mixed setups (complementary contrast): depth and richness without cranking saturation.
- **One warm accent in dark scenes**, placed on the object that matters.
- **Value structure:** backgrounds sit in the bright mid-values; the white heads are the brightest shapes and their
  warm near-black outlines the darkest, so the strongest contrast in every frame is the face.

**Why:** coloured shadows keep the cosy, painted feel (black shadows would look like a game engine); the
warm/cool split separates the planes; the single warm accent tells the eye where to look in the dark.

## 47. Why scenes are shown as fragments

Each shot shows the **20 % of a place that tells the story**; the rest is implied:
- the prize office never shows its door or ceiling, only the window and the clerk;
- the road never shows where it goes, only that he's driving;
- the dream never shows the whole lake, only the yacht, the moon and a castle silhouette;
- the waiting room never shows the wall behind the hero, only the door the trap walks through.

**Why:**
- Fragments are faster to read: one wall, one action, one sign.
- The brain fills in the rest, which feels more real than a fully shown generic room.
- A fragment can be dressed perfectly; a full room would dilute the dressing.
- Fragments chain naturally: the camera moves from one fragment to the next (counter -> ticket -> face -> door), which
  is exactly how the camera language works (section 6).

## 48. Scene recipe for Legion (per place)

1. Decide the 2-4 shots first (from the script beats), then build only what they see; add the reverse side only if
   two characters talk across it.
2. Give the place a **name wall** with its sign, facing the main camera.
3. Build in **three planes**: a foreground occluder (lamp, counter edge, plant, head), the subject zone (clean around
   the face), a busy but softer background.
4. **1-2 practical lights** in frame + window or ambient light; coloured shadows; one warm accent at night.
5. **1-3 story props** placed in view before they matter, **one hidden joke**, and a floor material from the kit.
6. Time devices (clock, calendar, window light) if time passes in the scene.
7. Exteriors: the 4-layer backdrop with haze and repeated mid-layer elements.
8. Micro-sets for every noun the camera dives to (ticket, document, wallet), built as one surface that fills the frame.
9. Hide every set edge with depth of field, the edge softness, the vignette or a foreground object.

---

# PART 7: every video, moment by moment, and every designed detail

How this part was made: every frame of all six videos was measured by code (Appendix A has the half-second timelines:
speech, camera moves, dissolves, warmth, brightness, saturation, sharpness), and every video was studied by eye at
2 frames per second (`full/*.jpg`, about 700 frames), plus native-resolution crops of the designed props (`props/`).
Narration is **paraphrased** (beats, not his words): we learn the craft, never the scripts. Short quoted words are
on-screen labels, which are part of the design.

Column guide for the breakdowns: **time** | **beat** (what the narration does) | **frame** (set, what's visible) |
**camera** | **acting / FX** | **why**.

## 49. Japan / "career development room" (ref-B, 60.5 s)

Motif: **FIRE** (the "FIRE EMPLOYEE" button at the start, a fire-alarm pull locked by "LABOR LAW" at the end) and
**boredom as punishment** (clock, empty desk, empty inbox, cobwebs).

| time | beat | frame | camera | acting / FX | why |
|---|---|---|---|---|---|
| 0.0-1.0 | claim: you basically can't be fired there | the boss's desk: a big red **"FIRE EMPLOYEE"** button box on a green desk mat; the blurred employee in a chair behind it | slow push toward the button, the boss's hand/arm reaches in from the foreground | | the first frame is the strangest object in the story; the label explains the whole premise without a word |
| 1.0-1.5 | on "fired" | the button pressed | **impact jolt + snap up** to the ceiling | the employee is **ejected out of his chair through a square hole in the ceiling** (speed lines) | the gag literalises "fired"; an instant visual laugh in second 1 |
| 1.5-2.5 | "but" companies found something worse | the employee back in the chair; the button; the boss's torso | snap back, rack focus to the button | sweat drop, nervous face | the reset tells us the ejection was imaginary; the "but" turns the claim |
| 3.0-4.5 | the boss smiles | the boss's office: wood wall, a hanging scroll with the kanji **誠 ("sincerity")**, a bonsai, the boss holding keys on a red **"STORAGE"** tag | slow push on the boss | closed-eye grin, toothy grin | irony (sincerity sign behind a cruel smile); the STORAGE key plants the twist (the "career room" is the old storage room) |
| 4.5-5.0 | "imagine" | dissolve to the open-plan office | 0.15 s dissolve + move | | a dissolve = a jump into "imagine" |
| 5.0-6.5 | your boss walks you past your desk | white office, **blue carpet**, grey desks, bookcases, a **lucky cat (maneki-neko)** on a cabinet, a mug labelled **"KEN"** | tracking with the two walking | boss smiling, employee worried | Japanese office cues (lucky cat, name mug) set the place; walking = being led somewhere |
| 6.5-7.5 | to a tiny room | a door with a printed sign **"CAREER DEVELOPMENT ROOM"** taped over an older sign (the edges of "S...E" show behind it) | push to the door | | a corporate euphemism; the taped-over sign is a rewatch joke (it says STORAGE underneath) |
| 7.5-9.5 | no computer, no work | inside: green cinder-block walls; a desk with **yellow tape outlining where a computer, keyboard and monitor used to be**; a **"TO DO" tray with a cobweb**; an empty printer stand | push across the desk (high angle) | | the tape outline reads like a crime scene: the work was "removed"; the cobweb says nobody has had work here for ages |
| 9.5-10.5 | just a ticking clock | the wall clock in close-up, red second hand | push on the clock, then pull to the room | | time is the punishment; the clock returns all video long |
| 10.5-13.5 | and a guy with his feet up, scrolling his phone, "on vacation" | the corner desk: a man in a **green hoodie**, feet up, phone; a yellow **sun patch** on the wall | slow drift; the employee leans in | relaxed half-lids; the employee curious | the future version of the hero; the sun patch is warm and lazy |
| 13.5-15.5 | "your new job is nothing" | dissolve; the boss in the doorway holding a **red gift box with a gold bow** | push on the boss | the box opens: **empty** | a gift of nothing: the line becomes a prop |
| 16.0-17.0 | you sit until six | a tear-off calendar **"APR MON 7"**, the employee's head (back) in the foreground | over-the-shoulder | | the date plants the time jump that comes later |
| 17.5-19.5 | thinking: wait, you still get paid | top-down on the desk: the phone shows **"+$4,000"** | top-down, then a dissolve to his face | grin through the phone | the top-down = "he works it out"; the number is the temptation |
| 20.0-21.0 | at first it's paradise | top-down: both men lying back in chairs with **sunglasses** in the sun patch, a pink drink | top-down drift | beach poses | an office as a beach: the sun patch becomes a sunbed |
| 21.5-24.0 | then your coworkers start staring when you walk past | high angle over the open office: rows of coworkers turning to stare | slow push along the row | many heads turning together | the crowd turn is the social pressure, shown not said |
| 24.0-25.5 | your emails stop | a phone screen: **"Inbox (0)"**, a mailbox icon **full of cobwebs**, "No new mail / Your inbox is empty" | push into the phone | | a familiar UI = instant recognition; the cobweb rhymes with the TO DO tray |
| 25.5-28.0 | your old desk already has someone else's photos on it | his old desk: a frame with **another family's photo**; someone else sitting there | push, then wide | | replacement shown with one object |
| 28.5-29.5 | on Friday | the calendar now reads **"NOV FRI 18"** | dissolve on the calendar | | the dissolve + date = seven months later |
| 29.5-33.0 | your boss pops his head in with a big smile, asking how you're enjoying your role | the boss's head in the doorway, huge in frame | push into an extreme close-up | toothy grin, laughing mouth | the friendliest face does the cruelest thing (comedy by contrast) |
| 33.5-36.0 | the guy in the corner, three years in, looks happier than anyone | the corner man, feet up, smiling | slow drift | content smile | the twist inside the twist: some people win at "nothing" |
| 36.5-39.0 | (time passes) the building at night | an office tower at dusk/night: **one warm lit window** (the career room) among dark ones, a pink-purple skyline | slow rise/push | | the lonely lit window = the two of them still there, after everyone else |
| 39.5-42.0 | so if you can't beat it... feet up, it's fine | both men, feet up, drinking from **juice boxes with straws** and a tiny umbrella | push in | relaxed smiles | the hero gives in; childish juice boxes make it funny |
| 42.5-44.5 | one Monday, he walks in and the guy is gone | the calendar **"APR MON 28"**; the room; the employee entering | drift | the employee's face drops | the empty spot is the second turn |
| 45.0-47.0 | his chair pushed in, his desk cleared | the corner desk empty: **two bolt holes** where things were fixed, the chair pushed in | push on the empty desk | | absence shown by detail (holes), not by narration |
| 47.5-48.5 | nobody tells you where he went | the hallway: coworkers watching through the door | over-the-shoulder | | the coworkers as a silent chorus |
| 49.0-49.5 | you see (the explanation starts) | the door sign close-up: "CAREER DEVELOPMENT ROOM" over "STORAGE" | push | | the "you see" lands on the sign that sums it up |
| 49.5-51.5 | the law makes firing almost impossible | a dark blue hallway: a red **"FIRE / PULL DOWN"** alarm locked with a padlock **"LABOR LAW 労働法"** | push on the alarm | | the whole premise in one pun prop; bilingual label anchors Japan |
| 51.5-55.0 | but no law against making them miserable | the boss in the dark hallway under one warm wall lamp, smiling | push in | toothy grin, blush | the villain in the dark with one warm light (scheming) |
| 55.0-58.5 | so they take your work and your friends and wait | the boss, a lucky cat on a cabinet, pigeonholes | drift; the boss's face | the grin becomes **shock rings** for a beat (an alarm light glows) | a last beat of comedy before the end |
| 59.0-60.5 | nobody can do nothing forever | the door sign with the employee visible through the door window, alone | slow push on the door | | ends on the room itself: the door is the prison |

Light arc: warm wood office (the boss) -> cool white office -> green room with warm sun patch (lazy, "paradise") ->
night tower with one warm window (loneliness) -> dark blue hallway with one warm lamp (the villain's world).

## 50. Burglar / furniture (ref-C, 58.4 s)

Motif: **one inch** (a ruler/tape measure on the floor, chair and couch legs, dents in the carpet), **keys** and
**FOR SALE / SOLD** (he kept a key; he sold them the house).

| time | beat | frame | camera | acting / FX | why |
|---|---|---|---|---|---|
| 0.0-1.5 | a man sneaks into a family's house every night | night exterior: blue clapboard siding, an AC unit, bushes, a **pumpkin** on the path; a burglar in a black balaclava climbing in at the window | slow push | sneaking walk, climbing | the first frame shows the crime in progress; the pumpkin = autumn (time of year), a small warm accent in blue |
| 2.0-2.5 | every night | inside the window, the moon behind him | dissolve | | "every night" = a dissolve (repetition in time) |
| 3.0-5.5 | and moves everything one inch left | the living room at night: he pushes a **red armchair**; close-up of the chair leg sliding along a **yellow ruler/tape measure** on the carpet, warm torch light | dive to the floor, top-ish close-up | effort pose | the ruler makes "one inch" visible and measurable |
| 5.5-8.5 | at first nobody notices, who measures their couch? | daytime living room: patterned wallpaper with framed kids' drawings, a lamp, yellow curtains, the dad (glasses, green sweater) on the red couch, an **orange tabby cat** | slow push; then the cat in close-up | the dad oblivious; the cat looking suspicious | the cat is the only witness (and a gag); "who measures" becomes the cat's face |
| 9.0-13.5 | by the end of the week the fridge blocks the back door and the dad is losing it | the kitchen: teal-and-white checkered floor, yellow walls, teal cabinets, a fridge with **"DON'T MOVE!"** sticky notes, a red wall phone, a pumpkin on the counter | slow push | the dad **pours coffee onto the counter** (the machine moved), stressed | the sticky notes are the dad's desperation as a prop; the coffee gag shows the moving without saying it |
| 14.0-15.5 | so they call the police | the dad on the red wall phone | push | worried | |
| 15.5-17.5 | the officer looks at the couch | low angle on the carpet: the officer crouching, looking at the couch | low angle, floor level | skeptical half-lids | floor level = we look at the evidence with him |
| 17.5-21.5 | and asks: so someone breaks in to move your furniture one inch? | the officer standing, extreme close-up from slightly below | low angle | deadpan, then a laughing closed-eye grin | authority from below; his laugh dismisses the family |
| 22.0-23.0 | and laughs all the way to his car | a **round peephole/binocular view** of the street at sunset: the police car, the officer | iris (round) view | | the family watching him leave through the peephole: we're inside, helpless |
| 23.5-25.0 | they start locking every door and window | the family at night: mom (pink), dad, the doors | drift | | |
| 25.5-30.5 | every night everything creeps further: the bed is pressed against the wall | top-down on the parents in bed, night-blue; the bed slides closer to the wall over several beats | top-down, the bed moves under a fixed camera | the dad wide-eyed, the mom asleep | top-down shows the movement as a diagram |
| 31.0-33.5 | the daughter swears she hears sliding across the floor | the daughter in bed with a **bunny night-light**, a crack of warm light under the door, sliding shadows | slow push to the door gap | eyes peeking over the blanket | the warm light under the door = something out there |
| 34.0-34.5 | at 3 a.m. | the hallway floor at night, a warm streak; the cat on the stairs | low drift | | the cat again (it knows) |
| 35.0-39.0 | so the dad waits on the couch with a baseball bat | the dad on the couch at night: a **headlamp**, a **lantern**, a **baseball bat**, **blue slippers** | slow push | determined, then nodding off | the props tell the plan (bat = fight, lantern = all night) |
| 39.0-40.0 | he wakes up in the morning | the same shot, morning light | light change in one shot | wakes | time by light, no cut |
| 40.5-43.0 | and the couch is one inch left, with him still on it | floor-level: the couch legs moved past their dents; **his slippers left behind** on the old spot | dive to the floor | | the slippers are the proof (and the joke) |
| 43.0-47.5 | by the month the couch is halfway across the room; the family can't take it | a wide of the living room: the couch mid-room, boxes, the family packing | high wide | defeated | the absurd escalation shown in one wide |
| 48.0-49.5 | they sell the house for half | the front yard: a **FOR SALE** sign with a **"50% OFF"** starburst | push | the dad sweating | the sticker is the half-price joke |
| 49.5-51.5 | to a buyer | the buyer: yellow coat, beanie, **a beard** | push to a close-up | smug | the beard = a disguise (he's the burglar) |
| 52.0-52.5 | you see, he'd sold them the house a year earlier | a **polaroid "SOLD! Welcome home"** of the family with the seller, in front of the house | pull out to the photo | | the reveal as an old photo: proof from the past |
| 53.0-54.5 | and kept one key | the buyer winks, holds up **a key**; close-up of the key | push to the key | wink | the key = the method |
| 55.0-58.4 | all it took was a month of moving furniture to buy it back at half price | inside the house: the burglar (balaclava back on) sitting on the red couch **with the cat**, a "SOLD" sign in the window | slow push | smug, the cat beside him | loop: the same couch and cat, new owner |

Light arc: night blue with warm accents (pumpkin, torch, lamp) -> bright day (living room, kitchen) -> nights getting
longer (bedroom, hallway) -> bright suburban exterior (sale) -> evening interior (the burglar's victory).

## 51. Jar / earthquake (ref-D, 64.8 s)

Motif: **gold and bronze** (the dragons, the balls, the pendulum, the molten crack at the end) and **ripples** (the
wine, the mountain, the fault).

| time | beat | frame | camera | acting / FX | why |
|---|---|---|---|---|---|
| 0.0-1.0 | he put a bronze ball in a dragon's mouth | a stone throne hall (columns, rose window, red curtains, candles); a scholar in a blue robe and official's hat with glasses beside a grey jar with gold dragons | medium | determined face | the strangest action first |
| 1.0-2.0 | (the dragon) | an extreme close-up of a **gold dragon head** holding a ball in tongs, warm candle glow | dive onto the dragon | | the hero prop is the most detailed asset in the video (sculpted gold) |
| 2.0-2.5 | and told the emperor | the throne room wide: the emperor between two guards | pull out, rise | | establishes the power in the room |
| 3.0-4.5 | if this ever falls out, run | the scholar, close | push | serious, a sweat drop on "run" | |
| 5.0-7.0 | the whole court laughs | the scholar sweating; the emperor and guards laughing (tears) | push/whip between faces | grins, tears | the court's laugh sets up the payoff |
| 7.5-13.0 | eight dragons around a giant jar, each holding a ball over a frog's open mouth | orbit around the jar: dragons, **bronze frogs with open mouths** below | **orbit**, then down to the frog's mouth | | the orbit explains the device geometrically, in one move |
| 13.5-17.5 | the emperor had the biggest army and wasn't going to run from a jar | the emperor on a balcony over a courtyard of **hundreds of identical soldiers**, a city and mountains behind | pull out to the high wide | the emperor unimpressed | scale = the army (copied figures) vs one little jar |
| 18.0-19.5 | weeks later a ball drops, but nothing happens | the scholar by the jar, a ball dropping | medium | | the setup for doubt |
| 20.0 | (the ball in the frog) | a frog with a **gold ball** in its mouth | close | glowing ball | |
| 20.5 | (a ripple) | the emperor's reflection in a **gold goblet of wine, rippling** | top-down into the goblet | | the classic tension device (a ripple in a drink): the quake is real, far away |
| 21.0-22.0 | in the emperor's (court) | the emperor on the throne holding the goblet | push | grim | |
| 22.5-23.5 | they laugh even harder | a feast table, the court laughing | drift | | |
| 24.0-26.5 | the emperor calls it the world's most expensive (toy) | the emperor on the throne | push | eye-roll | |
| 27.0-29.0 | the jar is dragged out of the city | the castle gate, market stalls, townspeople watching, the jar on a cart | drift through the gate | | public humiliation |
| 29.5-31.5 | he drags it outside the walls | a **sunset silhouette**: the scholar pulling the jar uphill, huge sun rays | wide | | exile in golden light |
| 32.0-32.5 | there | a camp: the jar, a cooking pot, a garden outside the walls | drift | | his new life |
| 33.0-36.5 | then one night, a ball drops, then another, then all eight at once | night blue: the jar with **"Z Z" (the jar is asleep)**, the scholar asleep; dragons drop balls one by one; the frogs' eyes glow | push; the frogs in a row | the scholar wakes, eyes go to rings | the personified sleeping jar makes "night" funny; the escalation 1-2-8 is counted |
| 37.0-40.0 | he runs to the city screaming everyone get out | the city gate's **portcullis bars**, the scholar's face pressed between them, torches | push to the bars | screaming, open mouth | bars = he's shut out |
| 40.5-43.0 | a guard: hey, toy guy, your frogs hungry again? | the city wall at night, a guard leaning on the parapet | low-ish angle on the guard | mocking grin | the mockery peaks right before the disaster |
| 43.5-45.5 | the guards send him back | the scholar walking away with a **lantern**, night | follow | defeated | |
| 46.0-48.0 | the next morning, the palace is a pile of rubble | morning: the camp; in the distance the city with **smoke columns** and collapsed walls | push past the jar to the city | | the payoff is seen from his camp (he was right, and safe) |
| 48.5-55.0 | (you see) inside the jar a heavy pendulum, a rod pointing at each dragon, the slightest nudge | **a cutaway inside the jar**: a gold pendulum with eight rods in a circle | flying inside, top-down, around | | the mechanism made visible (a real historical seismoscope) |
| 55.0-58.0 | the pendulum swung, the rod snapped, the dragon opened, the ball dropped | the rod snapping; a dragon's jaw opening; the ball falling into a frog | follow each part of the chain | | cause and effect in a chain of close-ups |
| 58.5-59.0 | one ball = a nudge | a far mountain, a tiny landslide | wide | | a small quake far away |
| 59.5-62.0 | all eight = the biggest quake | the jar at sunset; the camera **dives into the ground**: a **glowing gold crack** | dive down | | the crack leads the camera |
| 62.0-64.8 | right underneath them | a **geological cross-section**: coloured rock layers, a glowing fault, the city crumbling above | holds on the cross-section | | the last move acts out the last words |

Light arc: warm candlelit hall (court) -> bright daylight courtyard (the army) -> golden sunset (exile) -> night blue
(the drops, the gate) -> morning haze with smoke (the payoff) -> gold interior (the mechanism) -> molten gold glow
(the cause).

## 52. Cannonballs / "levels" (ref-E, 63.5 s)

Motif: **labels on barrels and crates** (each level of ammunition has its own label: SHOT, LANGRAGE -> GARBAGE,
HOT SHOT, CARCASS / KEEP FROM FLAME), escalating from "lucky" to "sunk in one shot".

| time | beat | frame | camera | acting / FX | why |
|---|---|---|---|---|---|
| 0.0-1.5 | if a cannonball hits your ship, you're one of the lucky ones | a ship's deck: a navy officer (blue coat, black hat) by a cannon, a US flag; a pirate (red-white stripes, red bandana) | push; the shot flies to a pirate ship (orange impact puff) | | a counter-intuitive claim + the action at once |
| 2.0 | (the hit) | the cannonball **stuck in the hull** with radial cracks | close | | "lucky": it just sits there |
| 2.5-4.0 | lucky ones | a pirate holding a tankard on a barrel; the **tankard flies** off | medium | happy, then surprised | a small comic beat |
| 4.5-6.0 | in the 1700s the navy's round shot | the navy ship firing between **stone arches with waterfalls** (puffy white smoke, muzzle flash) | wide | | the exotic location makes history look like an adventure |
| 6.5-11.5 | would smash through and turn the wall into a storm of splinters that tore through half the crew | the hull bursting toward the camera; a **storm of wooden splinters** across the deck; pirates hit (X eyes, splinters sticking out), one flying | push through the burst, then wide | gag physics, speed lines | violence made cartoon (no blood, splinters and X eyes) |
| 12.0-13.5 | the pirates couldn't afford ammo | the quartermaster opens a crate labelled **"SHOT"**: empty | push | annoyed | a label tells the punchline |
| 14.0-17.5 | so they fired langrage, a fancy word for garbage | barrels with a brass plate **"LANGRAGE"**; then the same barrel style labelled **"GARBAGE"** | push to the plate, then reframe | | the label swap is the joke |
| 18.0 | (fired) | a **smoke-puff frame**, an old **boot** flying over the water | smoke wipe | | the in-world wipe; the boot = garbage |
| 18.5-19.0 | the navy had a nastier idea | the navy ship | wide | | |
| 19.5-22.0 | hot shot: cannonballs shovelled into a furnace | a beach with palms: a brick furnace hut with a sign **"HOT SHOT"**, soldiers shovelling balls | push | | the sign names the level |
| 22.5-24.0 | until they glowed red | **inside the furnace**: balls rolling over glowing coals | dive inside | | the camera goes where the heat is |
| 24.5-26.5 | carried over with giant tongs, dropped behind (a wet plug) | soldiers carrying a glowing ball in tongs; POV over the cannon barrel; the barrel number **"12"** | over-the-barrel POV | effort | the POV puts us at the gun |
| 27.0-28.0 | (a soaking wet plug, so the powder wouldn't go off early) | a macro of the wet wad with droplets, then the plug ring glowing | macro | | |
| 28.5-30.0 | the gunpowder | a **powder sack with a face ("POWDER")**: worried eyes, sweat drop, then a relieved smile | close | personified | the powder must feel the danger, so it gets a face |
| 30.5-31.5 | the ball buried deep in the hull | the glowing ball embedded in planks, sparks | close | | |
| 32.0-36.5 | minutes later the whole ship lit up like a giant lantern | the pirate ship at sunset; **the sails glow from inside** | slow push | | light from within = fire inside, before the flames show |
| 37.0-39.5 | not to be outdone, the pirates fired back | a crate **"CARCASS / KEEP FROM FLAME"**; the captain holding a **hollow ball with holes** | push | smug | the label's warning is the joke |
| 40.0-43.0 | a hollow ball packed with burning tar, punched with holes | a pot of glowing tar, the carcass ball | close | grins | |
| 43.5-46.5 | it spat fire the whole way | the cannon firing, a streak of fire over the water | wide | | |
| 47.0-48.5 | turning the entire ship into a torch | the navy ship in big cartoon flames, black smoke, sunset | wide | | |
| 49.0-50.5 | eventually ships advanced to iron | the wooden hull; **iron plates slide over the planks** | push on the hull | | the change of material happens on screen |
| 51.0-53.0 | fireballs just bounced off | an ironclad (grey rivets, a funnel with a red band); balls bounce with sparks, splash | wide | | |
| 53.5-55.0 | so America built the Rodman gun | a soldier (blue cap, moustache), a US flag, stacked balls, a huge cannon | push | proud | |
| 55.5-59.0 | firing a single ball over 1000 lbs | a **tripod crane** lifting the ball, caption "1000 lbs"; the soldier **lifted off the ground** hanging on the rope | push | gag: the weight lifts him | the gag shows the weight better than the number |
| 59.5-60.5 | made to punch | a **smoke-puff wipe** into an underwater-looking frame | wipe | | |
| 60.5-62.0 | a hole in an iron warship | the ball through the water, hitting the hull: **sparks and white cracks** | follow the ball | | |
| 62.0-63.5 | big enough to sink it in one shot | a big **cel-shaded explosion**, debris, a mushroom of smoke; then **tiny pirates bobbing in a barrel** | wide | | the peak, then a comic button |

Light arc: bright daylight (levels 1-3) -> sunset and fire (levels 4-5) -> bright again (the modern gun) -> explosion.

## 53. Knight / pardon (ref-F, 40.6 s)

Motif: **the paper** (the Pardon document is the setup, the evidence and the punchline) and **money in chests**.

| time | beat | frame | camera | acting / FX | why |
|---|---|---|---|---|---|
| 0.0-3.0 | a knight pays a priest to forgive a crime he hasn't committed yet | a medieval market stall: a carved wooden sign **"Pardons"** with keys, a red-white awning, a green cloth with a crossed-keys banner; the knight in silver armour, the priest in a red robe with a gold stole | slow push | the knight smug, the priest greedy; coins change hands | the stall is designed like a shop (sign, awning, banner): selling forgiveness as retail |
| 3.5 | you see | the **Pardon document**: illuminated "P", "One Crime", "to be committed Next Week", a "Forgiven" stamp, the fee crossed out | push into the paper | | the document is the whole premise, readable |
| 4.0-5.5 | the priest travelled from town to town | a donkey cart with a chest of coins over a bridge, villages | follow | | |
| 6.0-7.0 | selling forgiveness for coins | the cart in a **snowy village at night** | dissolve | | seasons pass = he's been at it a long time |
| 7.5-11.0 | lying had a price, stealing had a price | a tall **"Price of Sins"** board: sin cards with pictures and price medallions (2, 5, 12...) | the camera tilts up the board as it gets taller | the priest points with a stick | the tilt up = the prices escalate |
| 11.0-12.0 | the worse the sin, the more you paid | the top of the board: a gold medallion **"1000"** | tilt to the top | | the top is the punchline number |
| 12.5-14.0 | people lined up for hours | a crowd queueing at the stall | wide | | |
| 14.0-16.0 | to drop their money into a huge iron chest | the priest with an **overflowing chest** | push | greedy grin | |
| 16.5-18.5 | so the knight asked forgiveness for... | the knight at the stall | push | | |
| 19.0-20.5 | what he was going to do next week | an extreme close-up of the document; the quill pointer on "Next Week" | macro on the paper | | |
| 21.0-21.5 | the priest hesitated, (then) charged extra | the knight's face **reflected in a sword blade**, awning stripes blurred behind | macro on the blade | worried | the sword = the threat behind the deal |
| 22.0-24.0 | and wrote the paper anyway | the stall: stamping | medium | | |
| 24.5-26.5 | days later the priest left town through the forest | **aerial**: walled town, then the forest from above | drone move | | |
| 27.0-29.5 | the chest so full it took two men to carry | a sunlit forest with **god rays**; two hooded porters carrying the chest | drift | straining | |
| 29.5-31.0 | the knight was waiting | the knight close-up | push to an extreme close-up | **wink** | |
| 31.5-33.0 | he took every last coin | the porters knocked out (stars, X eyes), the chest emptied, a coin flying | wide | | |
| 33.0-33.5 | the priest screamed | the priest close-up; **his whole head turns red** | push | rage | |
| 34.0-35.5 | that he'd go to hell for it | **little red devils** around a lava crack in the ground; the knight holds up the paper | wide | the devils bounce | hell shown literally (and cute) |
| 36.0-38.0 | the crime he was forgiven for | the Pardon zooms up: "One Crime / Next Week / Forgiven" | push to the paper | | the paper returns as the punchline |
| 38.5-40.6 | robbing the man who sold it to him | sunset road: the priest sitting in an empty chest, the knight walking away with a **wheelbarrow of gold** toward a castle, a windmill, long shadows | slow drift | the priest dejected | the classic walking-away ending, golden hour |

Light arc: bright market day -> snowy night (time) -> bright market -> sunlit forest with god rays -> golden sunset.

## 54. Cashier / lottery (ref-A): the why behind each scene

The full shot list is section 12. The reasons behind each scene, in order:
1. **Counter + pendant lamp:** a convenience-store counter is recognisable worldwide in one frame; the lamp frames the
   top of the 9:16 frame.
2. **The dive onto the ticket on "ticket":** the camera goes to the noun; the ticket design (section 56) makes it
   instantly a real lottery ticket.
3. **The register's slot-machine digits:** turns "it had won a million" into a spectacle on screen.
4. **The sly face on "sorry man":** the moment of the decision, on the word.
5. **The over-the-shoulder customer:** we're with the cashier (it's his story); the lure hat is planted.
6. **Legs out of the bin:** the most undignified pose possible = comedy and character in one image.
7. **The iris secret:** the darkest moment = the crime.
8. **The wallet from above:** the driver's licence names him (KYLE) without narration, and the wallet is where the
   stolen ticket "becomes his".
9. **The dream in the fishbowl:** fantasy contained in a small fragile object; no cut.
10. **The morning light flood:** false hope = the brightest frame.
11. **The toy-like car on an empty road:** the journey compressed into one image.
12. **The prize office through glass:** the glass separates him from the money (and the truth).
13. **The waiting room door in focus:** the trap's entrance is in view before it opens.
14. **The scene becoming a polaroid:** from the story to the real-world explanation.
15. **The evidence board (CLERKS vs EVERYONE ELSE):** statistics as photos.
16. **The ticket rack "GONE FISHIN'":** the bait, literally.
17. **The new TRAINEE at the same counter:** the loop.

## 55. Designed props: anatomy, and why each detail is there

Native crops in `props/`. Every designed prop copies the **real-world genre conventions** of that object exactly, then
adds **one joke**.

**The scratch-off lottery ticket ("REEL BIG CASH")**
- Top: a small "STATE LOTTERY" header in caps -> real tickets carry their issuer; it says "official".
- Game name: chunky yellow display letters with a dark outline and drop shadow -> scratch cards always shout their
  game name; the pun ("reel" = fishing) is the bait motif.
- Art: a marlin leaping over a wave pattern of scalloped arcs, a tiny house and boat -> big-fish imagery = big win.
- A red starburst **"$20"** -> the price starburst is how every scratch card shows its price.
- A red ribbon banner **"WIN UP TO $1,000,000!"** -> the top-prize banner is the most recognisable scratch-card element.
- Play area: rows of numbers inside **little fish shapes** with prize amounts ("7 $5", "12 $10", "3 $1M") -> real play
  symbols, themed.
- A **barcode** along the bottom -> (1) realism: every real ticket has one, so the brain accepts the fake as real;
  (2) story: the barcode is what the scanner reads, so the scan scene works physically.
- Why the whole design: the viewer must recognise "a winning lottery ticket" in a fraction of a second at phone size,
  so it uses only the conventions everyone knows; the joke is in the name and the fish.

**The fire alarm with the padlock (Japan)**
- A real-looking red pull station: "FIRE" in white, "PULL DOWN" on the handle -> instantly a fire alarm.
- A brass padlock through the handle labelled **"LABOR LAW"** with **労働法** (Japanese for "labour law") -> the pun
  (you can't "fire") and the bilingual label to anchor the setting.
- Placed in a dark corridor under the boss's lamp at the "explanation" -> the premise summed up in one object at the
  moment the narration explains it.

**The Pardon document (knight)**
- A parchment with a red-and-gold decorative border -> an official medieval document.
- An **illuminated drop cap "P"** in a blue box with gold -> manuscript convention = old and church-made.
- "ardon" in red blackletter -> period lettering.
- A body line in a book serif, the filled-in parts ("One Crime", "Next Week") in a handwritten blackletter on lines ->
  **a form with blanks filled in by hand**: bureaucracy, which makes selling forgiveness funny.
- A red rubber-stamp **"Forgiven"** -> an anachronistic office stamp = comedy.
- "Fee paid: 40 coins" crossed out and rewritten higher -> the priest charged extra (the plot, as a correction).
- A signature -> "official".

**The FOR SALE sign (burglar)**
- Red-white-blue realtor sign, "FOR SALE BY OWNER", a phone number **555-0142** -> the 555 prefix is the film convention
  for fictional numbers (never a real person's number).
- A yellow starburst sticker **"50% OFF"** slapped on -> half price, the plot as a sticker.
- Later a **"SOLD"** rider in the window -> the ending.

**Labelled barrels and crates (cannonballs)**
- A brass engraved nameplate **"LANGRAGE"** in a serif on a hooped barrel -> fancy = expensive-sounding; the next shot
  uses the same plate style reading **"GARBAGE"**: the label swap is the joke.
- A wooden crate stencilled **"SHOT"** (empty) -> they can't afford ammo.
- A wooden crate **"CARCASS / KEEP FROM FLAME"** -> a warning label on the fire weapon = irony.
- A brick hut sign **"HOT SHOT"** -> names the level.

**The Price of Sins board (knight)**
- A tower of framed cards, each with a ribbon banner title ("Stealing", "Lying", "Gambling"...), an illustrated
  vignette and a red price medallion with a number and a coin -> a shop menu board.
- Each vignette is a mini-gag: "Stealing" = a figure taking a steaming pie from a window; "Lying" = a fisherman holding
  his arms wide with a tiny fish behind his back.
- A big gold-on-red **"Price of Sins"** sign at the base; a **"1000"** gold medal at the very top.
- Why tall: the camera tilts up it; height = escalating prices.

**Screens and devices**
- A cash-register display: green dot-matrix text "WINNER!" and digits that **roll like a slot machine** before
  settling on "$1,000,000" -> turns a number into suspense.
- A phone mail app: "Inbox (0)", a mailbox icon **full of cobwebs**, "No new mail / Your inbox is empty" -> a real
  phone UI (instant recognition) plus one gag (cobwebs).
- A phone showing "+$4,000" -> money as a notification.

**Time devices**
- Tear-off calendars with a big readable date ("APR MON 7" -> "NOV FRI 18" -> "APR MON 28") -> exact time jumps
  without narration.
- Wall clocks with a red second hand -> waiting, boredom.

**Name and identity props**
- Polo name tags "KYLE" and later "TRAINEE"; a mug "KEN"; a driver's licence "KYLE" with a mini portrait -> names and
  roles without narration.
- Door signs ("STAFF ONLY", "CAREER DEVELOPMENT ROOM" taped over "STORAGE") -> place and irony.
- Winner polaroids with handwritten captions ("KYLE · LAKE RD", "DALE · AGAIN") -> the evidence (and a hidden joke).

**Rules for designing a prop in this style:**
1. Copy the real object's genre conventions exactly (issuer line, price starburst, banner, barcode, stamp, 555 number).
2. Add exactly one joke or story clue (a pun name, a padlock, a crossed-out fee, a sticker, a cobweb).
3. Make the key text readable in the close-up at phone size (chunky, outlined, high contrast); the rest is texture.
4. Use the era's lettering (blackletter for medieval, engraved serif for nautical/brass, chunky display for modern
   retail, dot-matrix for registers, system UI for phones).
5. Use local script when the place matters (Japanese on the padlock).
6. Never use real brands, real people's numbers or real logos.
7. Let the camera dive to the prop on the word that names it.

## 56. The motif system of each video

| video | motif | where it appears | what it secretly tells |
|---|---|---|---|
| cashier | fishing = bait | LIVE BAIT shop, fish logo on the polo, REEL BIG CASH fish ticket, the lure hat, the yacht "FINDERS KEEPERS", the fishbowl dream, "GONE FISHIN'" rack tag, "BAIT · GAS" | the ticket was bait, the customer a fisherman of thieves |
| Japan | FIRE + boredom | the FIRE EMPLOYEE button, the FIRE alarm locked by LABOR LAW; the clock, the tape outline, the cobwebbed TO DO tray and inbox | you can't fire, so they bore you out |
| burglar | one inch + keys + for sale | the ruler on the carpet, chair/couch legs, dents, the slippers left behind; the key; FOR SALE / 50% OFF / SOLD | he's buying the house back cheap |
| jar | gold + ripples | the gold dragons and balls, the gold goblet's ripple, the pendulum, the molten crack | the shaking is real and it's underneath them |
| cannonballs | labels | SHOT (empty), LANGRAGE -> GARBAGE, HOT SHOT, CARCASS / KEEP FROM FLAME, "1000 lbs" | each level is worse than the last |
| knight | the paper + chests | the Pardon (setup, evidence, punchline), the Price of Sins board, the overflowing chest, the empty chest at the end | the deal is the crime |

**Rule:** pick one motif per story that encodes the twist, then put it on every surface: signs, clothes, props,
vehicle names, labels. Narration names it only at the end.

## 57. Recurring gag types (catalogue)

| gag | examples | why it works |
|---|---|---|
| Literal visual pun | ejected through the ceiling on "fired"; little devils on "hell"; the weight lifting the soldier on "1000 lbs" | the word becomes a picture: a laugh and comprehension at once |
| Label swap | LANGRAGE -> GARBAGE; CAREER DEVELOPMENT ROOM over STORAGE | the truth under the euphemism |
| Undignified pose | legs sticking out of the bin; lying in sunglasses in an office sun patch | character + comedy in one image |
| Empty container | the SHOT crate, the gift box, the inbox, the chest at the end | absence as a punchline |
| Physical consequence | coffee poured onto the counter; slippers left behind; a tankard flying | shows an invisible cause (the furniture moved) through its effect |
| Silent witness | the orange cat (burglar), coworkers staring (Japan) | a second reaction without dialogue |
| Personified object | the sleeping jar ("Z Z"), the worried POWDER sack | lets an object feel the danger |
| Knock-out marks | X eyes, stars, splinters sticking out | cartoon violence, never gore |
| Comic button | pirates bobbing in a barrel after the explosion | releases the tension at the end |
| Fake reassurance | the boss's friendly grin while doing harm; the officer laughing | comedy from contrast |

## 58. When objects get faces

Objects get faces **only when the story needs them to feel something**: the POWDER sack (worried -> relieved: it must
not go off early), the jar (asleep, "Z Z": night, before the drops), the frogs (glowing eyes when the balls drop). The
face uses the same grammar as the people (grey oval eyes, sweat drop, small mouth) so it belongs to the same world.
Everything else stays an object.

## 59. Time, season and place devices

- **Calendars** with readable dates for exact jumps (Japan).
- **Clocks** for waiting and boredom (Japan).
- **Light inside one shot**: night to morning (cashier, burglar), sun patches and window light.
- **Seasons by props**: pumpkins (autumn, burglar), snow on a village at night (the priest travelling for a long time).
- **Sunsets** for journeys and endings (the jar's exile, the knight's ending).
- **One lit window at night** for "still there after everyone left" (Japan).
- **Place by one object**: a lucky cat and a kanji scroll (Japan), a scratch-card wall (store), a portcullis (castle),
  palm trees and stone arches (Caribbean), a donkey cart (medieval travel).

## 60. Opening and closing frames (all six)

| video | first frame | why | last frame | why |
|---|---|---|---|---|
| cashier | the cashier at the counter scanning, the ticket in view | the act in progress | a new TRAINEE at the same counter | loop |
| Japan | the FIRE EMPLOYEE button | the premise as an object | the career-room door with him inside | the prison |
| burglar | the burglar climbing in at night | the crime in progress | the burglar on the couch with the cat | loop + victory |
| jar | the scholar putting the ball in the dragon | the strange act | the glowing fault under the city | the cause |
| cannonballs | the officer at the cannon, the shot about to fly | the claim in action | pirates bobbing in a barrel | comic button |
| knight | the knight paying at the Pardons stall | the strange deal | the priest in the empty chest, the knight walking away at sunset | the walk-away ending |

**Rules:** frame 1 shows the strangest action or object already happening (no establishing shot, no title); the
last frame is either the first set again (a loop), the visual cause, or a small comic button. Never an end card.

## 61. Sets per video (coverage)

| video | sets (in order) | count |
|---|---|---|
| cashier | shop counter, ticket (micro), shop floor/bin, wallet (micro), fishbowl dream, bedroom, road, prize office, waiting room, evidence board, printer, ticket rack (micro), shop exterior, shop counter | 9 main + inserts |
| Japan | boss's desk (FIRE button), boss's office, open office, corridor door, career room, phone (micro), calendar (micro), night tower exterior, dark corridor | 8 + inserts |
| burglar | house exterior at night, living room, kitchen, living room floor (micro), street through a peephole, parents' bedroom (top-down), daughter's room, hallway, front yard, living room again | 8 + inserts |
| jar | throne hall, dragon (micro), balcony over the courtyard, feast table, city gate, sunset hill, camp, night camp, city gate bars, city wall, jar interior (cutaway), mountain, ground cross-section | 11 |
| cannonballs | navy deck, pirate deck, sea with arches, hot-shot furnace hut, furnace interior, cannon POV, powder sack (micro), burning ship at sunset, ironclad, fort with the Rodman gun, underwater | 10 |
| knight | Pardons stall, Pardon (micro), road/bridge, snowy village, Price of Sins board, sword reflection (micro), aerial town/forest, forest, sunset road | 7 + inserts |

Average: **8-11 places per Short**, each reused for 2-6 framings, plus 2-4 micro-sets.

## 62. Lighting arc per video (summary)

| video | arc | meaning |
|---|---|---|
| cashier | warm -> dark secret -> cold neon dream -> brightest morning -> cool office -> bright waiting -> cold truth -> night sting -> warm again | temptation, crime, fantasy, false hope, truth, loop |
| Japan | warm office -> cool open office -> green room + warm sun patch -> night tower, one warm window -> dark corridor, one warm lamp | power, isolation, comfort, loneliness, villainy |
| burglar | night blue + warm accents -> bright day -> long nights -> bright exterior -> evening interior | threat, normal life, fear, defeat, his victory |
| jar | candlelit hall -> daylight courtyard -> golden exile -> night drops -> smoky morning -> gold interior -> molten fault | power, scale, exile, warning, payoff, mechanism, cause |
| cannonballs | daylight -> sunset fire -> daylight -> explosion | escalation, peak, modern era, finale |
| knight | market day -> snowy night -> market day -> god-ray forest -> golden sunset | business, time, greed, the trap, the ending |


---

# PART 8: lines, edges, face parts and colour at pixel level (overrides earlier sections where they differ)

Sources: native-resolution 96x96 crops of 24 points (characters, props, set pieces, far backgrounds) zoomed 4x with a
grid line every 8 real pixels (`edge/zoom_0-3.png`, numbers in `edge/edges.json`), gridded full frames
(`edge/grid3.png`), line-vs-fill colour clustering, and a comparison with our own 2-second test (`test2s/`).
Widths below were read off the 8-px grid; the automatic stroke detector was unreliable on some points and is not
used for the conclusions.

## 63. The outline system (measured)

**Line width scales with the object (world space), not with the screen:**

| shot | head diameter | head outline | outline / head diameter |
|---|---|---|---|
| extreme close-up (cashier) | ~924 px | 28-30 px | ~3.0 % |
| medium (waiting room) | ~270 px | 8-10 px | ~3.3 % |
| wide (emperor on the balcony) | ~184 px | ~5 px | ~2.7 % |

So the line is **about 3 % of the head's diameter in every shot**: lines get thicker when the camera gets closer, like
real geometry. (Corrects section 26, which said "mostly screen-space".) Lines never go below ~2-3 px on anything in
the subject plane.

**The line hierarchy (medium shot, 1080 wide):**

| element | line width | notes |
|---|---|---|
| character silhouettes | 8-12 px | the strongest lines in the frame |
| limbs (drawn as lines) | ~9-13 px | thickness ≈ 0.035-0.05 of the head diameter |
| near furniture / big props silhouettes (bench, aquarium, register, counter) | 10-16 px | as strong as the characters: they're at the same depth |
| interior creases on props (bench inner edges, door panel, lamp rim) | 4-6 px | about 1/3 to 1/2 of the silhouette |
| small set dressing (poster frames, drawings inside posters, pegboard items) | 2-3 px | still present, never dropped |
| distant exteriors (castle, houses, balustrade far away) | 1-2 px | lighter and lower contrast, often lost in the blur |
| ceiling tile grid | ~3-4 px | thin, warm grey-brown |

**What never gets a line:** sky, clouds (soft painted edges, a slightly darker underside), light glows and bloom,
painted surface texture (speckles, mottling, wood grain), atmospheric haze. Cartoon effects that are "objects"
(smoke puffs, explosions, splinters) do get thin lines.

**Text:** light letters on a coloured ground (the ticket's yellow "REEL BIG CASH") get a dark outline and a drop
shadow; dark letters on a light ground ("OUR WINNERS" in navy on yellow, door signs) don't.

**Why the line hierarchy:** silhouettes carry readability at phone size, so they're the heaviest; interior lines only
describe form, so they're lighter; far objects get thinner, paler lines so depth reads even before the blur. Lines on
everything near (including the set) are what make the whole world feel drawn, not just the characters.

## 64. Line colour (measured: line value vs fill value)

| object | fill | line | line value / fill value |
|---|---|---|---|
| red bench | #E76E53 | #31191C (dark wine) | 0.21 |
| blue door frame | #5487AE | #0F182B (navy) | 0.25 |
| gold poster frame | #E7C73C | #3B3634 (warm dark grey) | 0.26 |
| register | (orange-lit) | #2C1F1C | ~0.20 |
| head in daylight | #F2F0F4 | #3B3237 | 0.24 |
| head, close-up | (white) | #2A1B1C | ~0.27 |

**Rules:**
- A line's brightness is about **17-25 % of the brightness of the fill next to it** (value 43-59 out of 255).
- **Characters:** warm near-black (#2A1B1C / #2B1B1F), which picks up a little of the scene light (#3B3237 in cool
  daylight, warmer brown in lamplight).
- **Props and set pieces:** either the same warm near-black or **a very dark version of the object's own hue** (blue door
  -> navy, red bench -> dark wine).
- Never pure #000, never a neutral grey: lines carry moderate saturation (S 90-170 of 255).

**Why:** coloured, warm lines keep the painted, cosy feel; pure black lines look like a colouring book or cheap vector
art, and hue-tinted lines make each object sit inside its own colour.

## 65. Edge hardness

- **Every in-focus edge is crisp:** a 10-90 % transition of **1.5-2.25 px** at 1080 (normal anti-aliasing). That's true for
  line-to-fill and fill-to-fill edges, on characters and on props.
- **All softness is depth of field:** 5-9 px transitions on out-of-focus objects, 12+ px on distant ones.
- So the rule is: **draw everything crisp, then blur by depth only.** Never soften lines or the frame globally.

## 66. Face parts at native resolution (corrections)

- **Brows:** crisp-edged, tapered shapes (not blurred strokes), filled with a **soft gradient** along their length;
  warm grey #756768 to #49393D. (Corrects sections 5, 17 and 26: "soft blurred strokes".)
- **Mouth in close-ups:** a crisp-edged rounded bar in warm grey with a soft gradient (lighter in the middle) and **1-2
  thin white highlight streaks** running along it (a wet sheen). **In medium shots** the mouth reads as a solid, dark,
  warm shape (#3A2417 in lamplight) with crisp edges.
- **Eyes have two modes:**
  - deadpan / half-lidded: warm grey ovals (#7E706F), no highlight;
  - open / alert / interested: **near-black warm ovals (#30252F) with a white catchlight dot** at the upper left, about a
    quarter of the eye's width. (Corrects section 26: "no highlight dot".)
- **Lids:** a crisp line, slightly lighter than the eye.
- **Nothing on the face is blurred.** The softness seen at small sizes was compression and depth of field.

**Why:** crisp face parts read at phone size; the gradient fills and the mouth sheen add the "rendered" richness that
separates this look from flat vector cartoons; the catchlight makes an open-eyed character look alive and interested,
while the matte grey half-lid eye reads as bored.

## 67. Shading inside characters and props

- **Hair:** hard-edged cel bands: a base colour, a darker shadow band, and 1-3 lighter highlight streaks with **crisp
  edges** following the curve of the head; dark crease lines between the locks.
- **Clothes:** a base colour with one soft shadow side; details (name tags, badges, buttons) each have their own outline.
- **Props and furniture:** a flat base colour, a **lighter bevel highlight along the top edges** (the bench has a
  pink-white strip on its top edge), a darker side face, and ambient occlusion in corners.
- **Heads:** the radial gradient from section 26, no cel steps.
- **Walls and large surfaces:** smooth gradients with painted mottling.

So the style deliberately mixes hard cel steps (hair), bevel highlights (props), and smooth gradients (skin, walls).

## 68. Colour: why our test looked muted when the numbers matched

- Our 2-second test's average saturation (0.42-0.43) and brightness (0.65-0.66) are **inside his range** (0.41-0.49 and
  0.59-0.74).
- The difference is **local contrast**: he puts pure-white heads and flat saturated colours **right against dark lines
  at 17-25 % value, with crisp edges**. Our test had thin or missing lines, blurred face parts and a global edge blur,
  which flattens the contrast even when the averages match.
- Fix: thick coloured lines on everything near, crisp edges, blur by depth only, flat saturated base colours with bevel
  highlights.

## 69. Environment borders: which edges get lines

- **Lined:** every object's silhouette (furniture, frames, doors, lamps, signs, props), panel and crease edges on
  props, ceiling-tile grids, the edges of posters and the drawings inside them.
- **Mostly shading, at most a thin line:** where big architectural planes meet (wall-wall, wall-ceiling, wall-floor).
- **Never lined:** sky, clouds, glows, painted textures, haze.
- **Distance:** lines get thinner and paler with depth on top of the blur, so the far background stays quiet.

## 70. Build settings for Legion's renderer (from Part 8)

1. Outline width in world units: **about 3 % of the object's size class** (head = 3 % of its diameter); near furniture
   silhouettes about as wide as nearby characters' lines; interior creases at **40 %** of the silhouette width; minimum
   2 px at 1080; thinner and lighter beyond the subject plane.
2. Line colour: **the object's fill at ~20 % value, keeping its hue, saturation 0.4-0.7**; characters fixed at
   #2A1B1C (lit slightly by the scene).
3. Render crisp (multisampling), then depth-of-field by depth; **no global blur or edge softness on the subject plane**.
4. Face decals: crisp shapes with gradient fills; catchlights on open eyes; 1-2 sheen streaks on close-up mouths.
5. Hair as cel bands with crisp highlight streaks; props with bevel highlights on top edges.
6. Light letters on colour get an outline and a drop shadow; dark letters don't.

**What this means for our 2-second test (the fixes):** thicken all outlines to 3 % of the head and add lines to the
set; remove the blur from the face parts and the global edge blur; add catchlights to open eyes and sheen to mouths;
switch line colours to hue-tinted darks; cel-band the hair; add bevel highlights to the counter and props.


---

# PART 9: the environment, deep (materials, scale, perspective, shadows, clutter, colour structure)

Sources: a library of 24 native-pixel material crops (`env/materials.png`), 12 shadow and light-pool crops
(`env/shadows.png`), 6 contact-shadow crops (`env/feet.png`), gridded scale frames (`env/scale_grid.png`), and code
over 1 frame per second of all six videos (`env_measure.py` -> `env/env_measure.json`). Two findings below correct
earlier sections (76, 77).

## 71. Material library (how each surface is built)

| material | how it's built (native pixels at 1080 wide) |
|---|---|
| painted plaster wall (yellow, green, cream) | one flat saturated colour with a gentle lighting gradient; no visible texture up close; a trim band or wainscot line breaks it |
| terrazzo floor | off-white base with **sparse, flat, irregular coloured flecks** (teal, pink, near-black), 4-14 px, no outlines; a thin gold inlay strip |
| ceiling tiles | pale lavender-grey squares, **grid lines 4-6 px** in a darker grey, no texture |
| laminate counter | warm grey with **light curved scratch marks** (short arcs), a dark outline and a lighter bevel on the edge |
| wood wainscot / panels | orange-tan or warm brown planks, **plank lines ~3 px** in darker brown, the odd **knot** (a darker dot), very subtle vertical grain |
| pegboard | tan with a **regular grid of small dark holes**; hanging product cards (white, a coloured header tab, a coloured fish icon), each outlined |
| checkered tiles | teal and white squares with **no grout lines** (colour edges only), a smooth lighting gradient and a soft sheen |
| shaggy carpet | cream with soft stroke mottling (almost always out of focus) |
| wallpaper | cream with thin pale vertical stripes and a small repeating sprig motif; framed kids' drawings on it |
| cinder block | flat green blocks, **mortar lines 4-6 px** in a darker green |
| office carpet | **flat saturated royal blue with no texture at all** |
| ship deck / planks | tan planks with soft shading and ambient occlusion where they meet objects |
| brick | orange-red bricks with soft colour variation and a few darker **weathering spots**; **thick cream mortar ~8-10 px**; no dark outline per brick (the mortar separates them) |
| castle stone | pale grey-beige blocks, thin darker mortar lines, the occasional thin **crack line**; low contrast |
| stone walkway (night) | flat lit colour with dark navy joint lines |
| forest floor / dirt | tan with **small outlined pebbles** (lighter grey ovals) and scattered fallen coins/leaves |
| lawn | flat green with faint brush-stroke texture and scattered orange leaves (season) |
| sea water | flat cyan-teal with **short horizontal lighter dashes** (ripples), 15-40 px long |
| glass (aquarium, windows, doors) | a light blue tint plus **1-2 diagonal white highlight streaks**; what's behind stays visible |
| sky | a smooth gradient (pale at the horizon, saturated at the top), a few puffy **unoutlined** clouds with soft shading and a darker underside |
| roof tiles | salmon tiles in a simple grid with darker joint lines |
| tufted velvet (throne) | a diamond quilting pattern with gold studs at every crossing, each diamond shaded lighter in the middle: the most detailed surface in its video |

## 72. Material rules

1. **Big surfaces = flat colour + a lighting gradient.** Texture is never noisy; it's a few deliberate marks.
2. **Texture as sparse marks with a story:** flecks (terrazzo), scratches (counter), knots (wood), weathering spots (brick),
   cracks (stone), ripple dashes (water), fallen leaves (lawn). Each mark says "used, real, lived in".
3. **Repeating patterns are clean geometry:** tiles, bricks, blocks, planks, pegboard holes, wallpaper motifs, drawn
   evenly, with joint lines in a **darker version of the base colour** (never black), 3-10 px wide.
4. **Detail scales with importance:** the hero object of a scene gets the richest surface (tufted velvet throne, sculpted
   gold dragons, the ticket); background walls stay plain.
5. **Glass and water are drawn, not simulated:** tint + streaks; flat colour + dashes.
6. **Distance removes texture:** far surfaces become flat colour (and blur); textures live in the subject plane and the
   foreground.

**Why:** flat surfaces with a few marks read instantly at phone size and keep attention on the characters; noisy
photo textures would fight the clean characters and turn to mush in compression. The marks make the world feel
inhabited without adding clutter.

## 73. Scale and proportions of the world (gridded frames)

| relation | measured | note |
|---|---|---|
| character height vs door | **about 2/3 of the door** (an employee standing in a doorway: 23 % vs 35 % of frame height) | doors are big |
| counter / work surface | **at mid-torso, ~0.6 of the character's height** from the floor | the counter frames the body; hands rest on it naturally |
| wall items (calendars, phones, posters, clocks) | **at or just above head height** | they sit next to faces in medium shots |
| fridge | taller than the character | normal-to-large furniture |
| ceiling | far above, roughly **2x the character's height or more** | ceilings with lamps are often in frame |

**Why:** small, round characters in a slightly oversized, chunky world feel cute and cosy (a toy diorama), make
props read big and important, and leave room in the tall 9:16 frame for lamps above and counters below. Putting wall
information at head height means faces and signs share every medium shot.

## 74. Perspective and lens

- **Wide lens in interiors:** floors and ceilings converge strongly (checkered floors, ceiling grids), and ceilings are
  often visible; close-ups compress with a longer lens feel.
- **Camera height:** around the characters' chest, a little below their eyes (the counter top sits near the horizon
  line), so characters are seen very slightly from below.
- **Verticals (measured on long near-vertical lines, 1 fps):** in frontal, staged shots (the knight's stall, the jar's
  hall) **81-91 %** of verticals are upright; in interiors overall only **30-54 %** are, because of low and high angles,
  top-downs and the constant slight roll. So three-point perspective is used and **not corrected**; straight-on staging is
  the only time verticals are kept perfectly upright.

## 75. Shadows, light pools and rim light

- **Shading is soft and low-contrast.** Shadows are coloured (Part 6, section 46), never black.
- **Contact shadows:** a soft, darker blob under feet and furniture, clearest on dirt and outdoor ground (the knight and
  priest at the stall); often very subtle indoors.
- **Cast shadows:** long and soft in low sun (diagonal shadows on a dirt road); no hard-edged cast shadows from
  characters indoors.
- **Light pools are painted as hue shifts, not just brighter patches:** a sun patch turns a green cinder-block wall
  **yellow**; window light becomes soft diagonal bands across checkered tiles, raising their saturation; edges are soft
  (about 20-40 px).
- **Blind stripes:** diagonal shadow bands with ~15 px soft edges, tinted to the surface (warm brown on cork).
- **God rays:** hazy vertical light shafts with bright mist in forests; huge sun rays at sunsets.
- **Rim light on dark limbs:** in some scenes the near-black limbs get a **thin light line along one side** (the priest's
  legs at the stall), so dark lines don't disappear against a dark ground.

## 76. Clutter around the face (correction)

Measured on every frame where a clear head was found: the edge density **directly above and beside the head** (body
excluded) is **0.95-2.1x** the edge density of the rest of the frame, in every video.

So the area behind a character's head is **not kept empty**. (Corrects sections 29, 40 and 48: "clean space around
the subject".) The head still reads instantly because of:
1. **value**: the white head with a thick dark outline against mid-value surroundings;
2. **focus**: the subject sits in the sharp band, while the frame's top and bottom are soft (section 31);
3. **saturation**: flat colour fields behind, not high-contrast patterns right behind the face.

The real rule is **nothing high-contrast directly behind the head**, not "nothing at all".

## 77. Colour structure of a frame (correction)

- **Each frame is built from about 3 hue families** that cover 80 % of the coloured pixels (median 3 in five videos, 4
  in the burglar video).
- **The outfit vs set hue gap is not a rule:** median gaps per video range from **7° to 137°** (cashier 19°, jar 7°,
  knight 26°, Japan 37°, cannonballs 59°, burglar 137°). Complementary pairs (red on green, a green sweater in a yellow
  kitchen) happen, but separation mostly comes from **value and line**, not hue. (Corrects section 28, wardrobe rule 3.)

## 78. Where the light sits in the frame

Mean brightness by quarter of the frame, top to bottom, in all six videos:

| video | top | 2nd | 3rd | bottom |
|---|---|---|---|---|
| burglar | 0.77 | 0.76 | 0.70 | 0.67 |
| knight | 0.75 | 0.75 | 0.68 | 0.56 |
| Japan | 0.73 | 0.72 | 0.66 | 0.63 |
| cashier | 0.72 | 0.73 | 0.65 | 0.60 |
| cannonballs | 0.69 | 0.71 | 0.61 | 0.55 |
| jar | 0.63 | 0.65 | 0.57 | 0.46 |

**Always brighter at the top, darker at the bottom:** the light comes from above (lamps, ceilings, sky), and the
foreground (counters, floors) plus the vignette ground the image. The caption band (70 %) sits in the third quarter on
mid values, which is exactly where white text with a dark outline reads best.

## 79. Environment build checklist (updated with Parts 8-9)

1. Scale: characters ~2/3 of a door; counters at ~0.6 of character height; wall info at head height; high ceilings with
   lamps in frame.
2. Surfaces from the material library: flat colour + gradient + a few story marks; clean patterns with darker-base joint
   lines (3-10 px); the hero object gets the richest surface; far surfaces go flat.
3. Lines on every near object (Part 8): ~3 % of size, hue-tinted darks, thinner and paler with distance; no lines on
   sky, clouds, glows, textures.
4. Light from above; top of the frame brighter than the bottom; coloured soft shadows; light pools as hue shifts; soft
   contact shadows; rim light on dark limbs over dark grounds.
5. Wide lens at chest height; three-point perspective allowed except in frontal staging.
6. Three hue families per frame; separate the character by value and line first.
7. Busy but de-emphasised background: nothing high-contrast directly behind the head; depth of field and the soft frame
   edges do the calming.


---

# PART 10: testing the "why" with data (some earlier claims hold, some don't)

Method: every sentence of all six videos (81 sentences) was labelled with a story role and an emotional valence by
Legion's text brain **without seeing any colour data** (`why_label.py`, `why/labels.json`). Then the light, colour,
motion and camera moves measured on each sentence's frames (4 fps) were averaged per label (`why_measure.py`,
`why/data.json`, `why/by_label.json`). Further tests: whether characters stand in brighter areas, whether dissolves sit
near time words, whether camera moves start at sentence starts, and what's being said in the darkest and brightest
seconds. Each result is compared with chance where possible.

## 80. Does the light follow the emotion? Mostly no (as a frame-wide rule)

| story role | sentences | brightness | warmth | saturation | motion | camera moves per sentence | position in video |
|---|---|---|---|---|---|---|---|
| hook | 6 | 0.62 | +0.05 | 0.50 | **12.7** | **3.0** | 0.00 |
| explanation | 14 | 0.63 | +0.07 | 0.45 | **11.4** | **2.36** | 0.55 |
| waiting / tension | 13 | 0.68 | -0.07 | 0.47 | 9.6 | 0.92 | 0.50 |
| scheme / secret | 5 | 0.69 | +0.09 | **0.40** (lowest) | 9.3 | 1.6 | 0.25 |
| comedy beat | 14 | 0.61 | +0.04 | 0.43 | 8.6 | 0.71 | 0.36 |
| consequence / shock | 16 | 0.68 | +0.02 | 0.43 | 8.1 | 0.88 | 0.54 |
| punchline | 5 | 0.68 | -0.01 | 0.47 | 8.1 | **0.2** (lowest) | 0.90 |
| temptation | 3 | 0.67 | -0.09 | 0.44 | 8.0 | 0.67 | 0.32 |
| hope / excitement | 4 | 0.71 | -0.07 | 0.46 | 7.1 | 1.75 | 0.39 |
| fantasy | 1 | 0.74 | **-0.29** (coldest) | **0.63** (most saturated) | 8.0 | 3.0 | 0.30 |

- Brightness barely changes with the role (0.61-0.74). The correlation between the character's emotional valence and the
  frame's brightness is **-0.04**, warmth **+0.12**, saturation **-0.13**: **no frame-wide link** between "good/bad for
  the character" and how bright or warm the frame is.
- So the light is **not** a formula like "sad = dark, happy = bright" applied to the whole frame. It comes from **where
  and when** each scene takes place (a lamp-lit shop, a night street, a sunny office), and the writer chooses the place
  and time to suit the beat. (This qualifies sections 30, 38 and 62: those arcs describe the settings he picked, not a
  rule that brightness tracks emotion.)

**What does hold (signals that stand out):**
1. **Fantasy has its own light:** the coldest and most saturated sentence of all six videos (and the dream looks seen
   in section 12). Imagination is the one emotion with a fixed colour treatment.
2. **Secrets and schemes are the least saturated** (0.40) and slightly warm: hushed, lamp-lit.
3. **The darkest seconds are secrets, schemes and night.** The words spoken in the darkest 10 % of each video: fishing
   the ticket out of the trash, printing tickets as bait and sending undercover agents (cashier); "something way worse"
   (Japan); the officer laughing his way back to the car, seen through the night peephole (burglar); the frogs and
   dragons in the candlelit hall (jar); the pirates firing back at sunset (cannonballs); the priest leaving through the
   forest (knight).
4. **The brightest seconds are public moments of exposure:** the agent walking in wearing a badge (cashier), coworkers
   staring (Japan), the officer inspecting the couch (burglar), the palace in rubble in the morning (jar). Darkness hides,
   light exposes.

## 81. The camera follows the story role (strongly)

From the same table:
- **The hook is the busiest:** 3 camera moves per sentence and the most motion (matches the energy curve, section 20).
- **The explanation is almost as busy** (2.36 moves per sentence): the camera flies through boards, cutaways and
  top-downs while the narrator explains.
- **The punchline is held almost still:** 0.2 moves per sentence. The last line lands on a steady frame.
- Consequence, comedy and waiting beats sit at about 0.7-0.9 moves per sentence: a calmer camera so the acting reads.

**Rule:** the camera, not the light, is what changes most with the story role. Move a lot on the hook and the
explanation, hold for the punchline.

## 82. Are characters placed in the light? No

Background brightness right around a character's head vs the rest of the frame (1 fps, frames with a clear head):
**0.93-1.04** (median about 1.0) in all six videos. Characters are **not** spotlighted by the set lighting; the light is
environmental. (The iris and night scenes with one warm source are the exceptions.) Separation comes from the white head
and its thick dark outline (sections 63, 76), not from a light pool.

## 83. Dissolves and time (holds, partly)

- **7 of 15 dissolves (47 %)** happen within about a second of a time word ("later", "next morning", "every night",
  "by midnight", "weeks", "Friday"...); only **18 of 97 camera moves (19 %)** do; chance is about 25 %.
- So a dissolve is about **2.5x more likely** than a camera move to sit on a time jump. The other half of the dissolves
  are **place jumps** (into a board, a phone screen, a different building).
- Rule confirmed: **move through space, dissolve through time or place.**

## 84. Do scene changes wait for the end of a sentence? No

- Only **16 %** of camera transitions start within 0.25 s of a sentence start, against **11.5 %** by chance (about 1.4x).
- Combined with section 36 (82 % of moves land on a word start, mostly content words): **the camera changes the picture
  on the noun being spoken, in the middle of the sentence**, not at full stops.
- Why: a cut at every full stop would create a rhythm of pauses (and a place to swipe); changing on the noun keeps the
  picture tied to the meaning and the flow unbroken.

## 85. What this means for building the style

1. Choose **settings and times of day** that fit each beat (a secret = a dark interior or night; an exposure = a bright,
   public place; a fantasy = a cold, saturated dream look). Don't grade the whole frame by emotion.
2. Light the world **environmentally**; don't spotlight characters (except iris / night scenes).
3. Let the **camera** carry the story role: busiest on the hook and the explanation, still on the punchline.
4. Dissolve on time or place jumps; move through space everywhere else.
5. Change the picture **on the spoken noun**, mid-sentence.

**Limits:** 81 sentences is a small sample (some roles have only 1-5 sentences); the labels come from an AI reading
the transcript; whole-frame averages mix the character and the set. Treat the small-sample rows (fantasy, temptation,
hope) as indications, not proof.


---

# PART 11: why some scenes are full and others empty, what makes a scene a scene, and why the hooks work

Method: all six videos split into **110 shots** (between camera transitions; `scene_measure.py`). For every shot, code
measured asset density (edge density in the sharp band, the number of distinct colour regions, the number of outlined
shapes, combined into a 0-1 score). Then **Legion's brain looked at every shot** on numbered contact sheets with the
narration under each shot and named, for each one, the visible environmental assets and their job, the one element that
defines the scene (its "anchor"), whether it's sparse, medium or dense, and why (`scene_vision.py`,
`scenes/vision_*.json`). The hooks were measured and analysed the same way from a 4 fps strip of the first 4 seconds of
every video (`hook_study.py`, `hooks/`). Code and vision agree on density moderately (correlation 0.43), as expected
from two different methods.

## 86. How full each kind of shot is

| kind of shot (vision) | shots | sparse | medium | dense |
|---|---|---|---|---|
| real place | 38 | 2 | **27** | 9 |
| insert / close-up | 31 | **23** | 6 | 2 |
| establishing wide | 17 | 4 | **10** | 3 |
| cutaway | 10 | 5 | 5 | 0 |
| diagram / board | 8 | 3 | 3 | 2 |
| imagination | 6 | 1 | 2 | **3** |

By story role (code density 0-1): explanation **0.57** (densest), hook 0.55, comedy 0.52, punchline 0.48, waiting 0.47,
consequence 0.46, scheme 0.43, hope 0.41, temptation 0.36, fantasy **0.20** (lowest by edges). Shot length does **not**
predict density (correlation 0.06), and nor does the position in the video (0.03).

**Imagination is dense with objects but light on edges.** Vision calls the dream shots dense (a yacht, a pool, a castle,
fireworks, a crowd of friends), while code measures them as the lowest edge density of all. The imagination look puts
**many objects in a flatter, softer, less textured rendering**: lavish content, simplified drawing.

## 87. What makes a scene the scene: the anchor

Every shot has **one anchor**, the element a viewer recognises the place by at a glance. Across 110 shots, anchors come
in four kinds:
1. **A readable sign or label (26 % of shots):** "CAREER DEVELOPMENT ROOM", "PRIZE CLAIMS", "OUR WINNERS", "Pardons",
   "HOT SHOT", "FOR SALE", "GONE FISHIN'", "BAIT · GAS", a register reading $1,000,000, an inbox reading (0).
2. **A hero object:** the FIRE button, the jar with dragons, the ticket, the chest, the pardon parchment, the couch, the
   cannon.
3. **A signature architectural element:** a checkered kitchen floor, a portcullis and a city gate, a green cinder-block
   room, a Pardons stall awning, a ship's deck with a flag.
4. **A signature light or time:** one lit window in a night office tower, a sunset road, a moonlit city wall.

**Rules:**
- **One anchor per shot**, placed where the eye lands (the sharp middle band, near the face).
- **A new place opens on its anchor:** the first framing of every new location shows its sign or hero object.
- **Re-entering a place re-shows the anchor** (the counter and the register when the cashier video loops back).
- The anchor is often **also the plot object** (the FIRE button, the pardon, the ticket rack): the place is named by the
  thing the story is about.

## 88. Why some scenes have many assets and others few

Legion's brain gave a reason for every shot. Grouped, they show one principle: **a shot is as full as what its sentence
is about.**

**Sparse (38 shots), when the sentence is about:**
- **one object:** "the button is the whole joke, so almost nothing competes"; "the line says 'room', so the sign fills the
  frame"; the ticket, the dragon head, the pardon, the key;
- **absence:** "emptiness is the message: a bare desk with only traces of the person"; the empty inbox; the empty
  TO DO tray with a cobweb;
- **a face or reaction:** "a quick reaction beat, so the focus stays on the face"; the guilty grin in the dark iris;
- **distance or travel:** "the empty landscape conveys the two-hour distance";
- **a single moment of contact:** the pendulum hitting the rod.

**Dense (19 shots), when the sentence is about:**
- **quantity or scale:** "the line is about the biggest army in the world, so the shot is packed with soldiers"; the
  storm of splinters; the board full of clerk photos; the rack of bait tickets; the coworkers all staring;
- **a new location being introduced:** "a new official location, so it is set up fully, with the winners board planted
  for later"; the Pardons stall; the HOT SHOT furnace;
- **abundance or wealth:** the dream yacht, the overflowing chest;
- **a lived-in space that carries a gag:** the kitchen with the fridge blocking the door;
- **chaos:** "the half-crew chaos needs many characters and props".

**Medium (53 shots):** real places with **"just enough props to name them without crowding the character"** (27 of 38
real-place shots).

**What the assets are for (602 assets named across 110 shots):** dressing 29 %, inform 24 %, place 22 %, frame
(foreground depth) 13 %, foreshadow 8 %, joke 4 %.
- Sparse shots lean on **inform** (29 %) and **frame** (17 %): the one fact, plus a foreground object for depth.
- Dense shots carry the most **dressing** (32 %) and **foreshadow** (10 %): the full setup of a new place is where clues
  are planted.

**Density does not follow a fixed rhythm:** the density label changes between consecutive shots 66 % of the time, about
the same as chance (62 %). It follows the sentences, not an alternation pattern.

## 89. The hooks (measured + analysed)

| video | first sentence | words in first 3 s | camera moves in first 3 s | motion vs video | first shot length | premise understood by |
|---|---|---|---|---|---|---|
| cashier | 6 words, 1.8 s | 11 | 3 | **2.16x** | 1.4 s | ~2.0 s |
| Japan | 13 words, 4.2 s | 10 | **5** | 1.82x | 0.9 s | ~2.0 s |
| burglar | 19 words, 5.2 s | 12 | 1 | 0.92x | 2.7 s | ~2.5 s |
| jar | 19 words, 4.9 s | 13 | 2 | 1.25x | 0.8 s | ~2.5 s |
| cannonballs | 16 words, 3.7 s | 13 | **5** | 1.83x | 0.6 s | ~2.0 s |
| knight | 13 words, 3.3 s | 13 | **0** | 1.06x | 3.3 s | ~2.0 s |

**Hook types and templates** (reusable patterns, never his words):

| video | type | template |
|---|---|---|
| cashier | strange act in progress | "A [ordinary worker] [did a routine action] to a [customer's valuable object]." |
| Japan | impossible claim | "It's impossible to [common outcome] in [place], but [group] found something way worse." |
| burglar | strange act in progress | "A [person] snuck into [place] every [time] and [did a tiny, bizarre act] to every [thing]." |
| jar | mystery object | "He put a [odd object] in a [creature]'s [part] and told the [authority]: if this ever [happens], [dire action]." |
| cannonballs | counter-intuitive claim | "If your [situation] got [bad event], you'd actually be one of the lucky ones." |
| knight | forbidden deal | "A [person with status] paid a [authority figure] to [forgive/allow] a [wrong] he hadn't [done] yet." |

**Two hook camera modes (measured):**
- **Montage hooks** (cashier, Japan, cannonballs): 3-5 camera moves in the first 3 seconds, ~1.8-2.2x the video's
  motion, first shots of 0.6-1.4 s. Used when the premise is **a chain of nouns** (ticket -> a million dollars; FIRE
  button -> Japan -> companies -> boss; cannon -> ball -> ship -> lucky pirate). Each noun gets its own picture.
- **Readable hooks** (knight, burglar): 0-1 moves, normal motion, a first shot of 2.7-3.3 s. Used when the premise can be
  **read in one picture** (the "Pardons" stall sign, then the paper reading "One Crime, to be committed Next Week") or
  when the hook is a **mood** (a slow, creepy push on a night house). The camera holds so the viewer can read.

**Why the hooks work (Legion's analysis, all six):**
1. **The scene itself at 0.0 s:** the main character and the key prop are already on screen; no title card, no logo,
   no fade-in.
2. **One strange element in the first sentence:** a contradiction, a taboo, an absurd specific or an impossible claim,
   stated and not explained.
3. **The picture shows each key noun as it's said** (a push or a move to it), so the hook also works with the sound off.
4. **The premise is clear by about 2-2.5 seconds**, and the first sentence ends on an unresolved piece ("way worse",
   "yet", "run!", "lucky ones"), which becomes the question the viewer stays for.
5. **Specifics, not generalities:** a bronze ball, one inch, a million dollars, next week, every night.
6. **Stakes or a moral question:** money, being fired, danger, forgiveness.
7. **The camera follows the hook type:** montage for a chain of nouns, a hold for something to read.
8. **One clear focal point per frame:** the red button, the gold dragon, the glowing ticket.

(Two corrections to the AI's analysis, from our measurements: there are no hard cuts, the "cuts" are fast camera moves
(section 32); and the captions are small, about 50 px at 70 % height (section 20), not "big captions at the bottom".)

## 90. Build rules (from Part 11)

1. **Size each shot to its sentence:** one object, an absence, a face or a journey -> sparse; quantity, scale, wealth, chaos
   or a brand-new location -> dense; an ordinary place -> medium, with just enough props to name it.
2. **Give every shot one anchor** (a sign, a hero object, a signature architectural element or a signature light), and
   open every new place on it.
3. **Plant clues in the dense setup shot** of each new location; use sparse inserts for the facts.
4. **Use the imagination look** for dreams: many lavish objects, flatter and softer rendering, cold saturated light.
5. **Write the hook from one of the six templates**, put the main character and key prop on screen at 0.0 s, make the
   premise clear by 2-2.5 s, end the first sentence on an open piece.
6. **Pick the hook camera mode:** montage (3-5 moves in 3 s) for a chain of nouns; hold (0-1 moves) for a premise that's
   read from a sign or a document, or for a mood.

**Limits:** shots were split at measured transitions, so a few long stretches with gentle moves merged into one shot (in
the cannonball video one "shot" covers 32-63 s); densities and reasons for those are rough. The asset lists come from an
AI looking at small contact-sheet tiles, so tiny background props may be missed.


---

# PART 12: body proportions and the outline pipeline (measured; overrides sections 17 and 26 where they differ)

Sources: 10 full-body characters across the six videos on 5 %-grids (`body/set1.png`, `body/set2.png`), and pixel
scans of our own test renders against his (`edge/ours_zoom.png`, `test2s/compare.jpg`).

## 91. Body proportions (measured)

| character | head | torso | legs | note |
|---|---|---|---|---|
| dad in the kitchen (trousers) | ~25 % | ~33 % | **~44 %** | long thin stick legs |
| the agent at the door (suit) | ~20 % (+ hat) | ~35 % | **~45 %** | |
| buyer, officer (coats, uniform) | ~25-30 % | ~30-35 % | ~40 % | |
| priest (long robe) | ~26 % | ~56 % | ~19 % | the robe covers the legs |
| knight (armour) | ~30 % | ~42 % | ~28 % | |

**Corrections:** a standing character in ordinary clothes is about **head 25-30 %, torso 30-35 %, legs 40-45 %**. The
"legs 20 %" in section 26 is only true for robes and long coats.

- **The head is a slightly wide oval: about 1.07-1.10 times wider than tall** (not a perfect circle).
- **The torso is a pear or bell:** narrow right under the head (the head overlaps it), widest at the hips, rounded at the
  bottom. Widest point ≈ **0.75-0.85 of the head's width**.
- **Legs:** two thin dark lines, the same thickness as the arms (~0.04 of the head width), starting close together under
  the torso (gap ≈ 0.15 of the head width), slightly bent, ending in small rounded dark shoes.
- **Arms:** attach at the top sides of the torso right under the head; ball hands ≈ 2.5x the arm thickness.
- **Clothes add shape, not bulk:** collars, plackets with buttons, belts, badges, stripes and name tags are drawn as flat
  shapes with their own outlines on the bell torso.

## 92. Outline pipeline (what works in Legion's renderer)

Measured on our test vs his frames:
- **Characters:** an inverted hull at ~3 % of the head diameter gives **11-12 px in a medium shot and 27-28 px in a
  close-up** (his: 8-10 px and 28-30 px). Correct.
- **Sets with per-object hulls failed:** flat planes (walls, wainscot, ceiling) get no line at all and thin boxes get
  under 2 px, against his 10-16 px on near furniture.
- **The fix that works: a screen-space outline pass** on depth + surface normals: a line wherever the depth jumps by
  more than ~3.5 % or the surface direction turns by more than ~45°; the line's width in pixels = **a fixed world width
  (~0.0085 units ≈ 3 % of a head) × focal length ÷ distance**, so lines thin naturally with distance; the line colour =
  **the nearer object's own colour at ~24 % value with a saturation boost**, so every object gets its own dark hue
  (wood -> dark brown, lamp -> dark green); far lines (beyond ~3 m) fade toward the surface colour. Characters keep their
  hull on top. The pass must convert back to sRGB at the end, or colours come out too dark and saturated.

## 93. What still separates our test from his (after Parts 8-12)

1. **His opening framing is wider and slightly higher:** more of the shop in frame (counter top, register, the full
   board, the pegboard), the character smaller. Ours is too tight and too low.
2. **His hair covers more of the head** (a fuller cap down the sides), so the white face area is smaller; ours shows too
   much white.
3. **His set is denser:** a pegboard of products, a lottery board, a second counter, a register with a stand; ours has a
   few props on a large empty wall.
4. **His reaction shot keeps the register, scanner and ticket in view;** ours fills the frame with the face.
5. **His foreground counter is darker and blurred (depth of field);** ours is evenly lit and sharp.


---

# PART 13: why his characters have depth and ours look flat (from his reaction frame, ref-A at 2.7 s)

1. **Smooth 3D lighting on the body, not flat colour.** The polo is top-lit: the top of the torso is about **30 % brighter
   than the bottom** (value ~220 vs ~150), and the side away from the key light falls into a deeper, more saturated red.
   Our torso is one flat orange from top to bottom. Use a soft key from the upper side with a smooth falloff (not hard
   cel steps) on clothes.
2. **The head is shaded like a sphere:** brightest at the upper middle, falling off evenly toward the edges, with the
   **shadow side and the lower face noticeably darker**, plus a soft darker band where the hair meets the forehead.
3. **The hair has volume:** a base colour, a darker underside where it meets the face, strand-separation lines and long
   glossy highlight streaks along the curve.
4. **Clothes have relief:** collar, a placket with two white buttons, a round badge and a name tag, each a separate shape
   with its own outline and a little shading, so the torso reads as a real garment.
5. **Overlap and foreshortening:** one arm comes **forward toward the camera** to the scanner and the other rests on the
   counter in front of the body; the scanner and the register **overlap the body**; the counter edge cuts across the
   torso. Several layers in front of and behind the character = depth.
6. **Contact shadows:** under the register stand, the hand and the ticket on the counter.
7. **Strong depth of field:** the background wall is about **190x less sharp** than the torso (Laplacian variance 2.9 vs
   545); posters behind become soft colour blobs, while the foreground register stays sharp. The subject plane is the
   only crisp plane.
8. **A wide value range inside the character:** near-black outlines, mid-dark shadow sides, bright highlights (buttons,
   tag, the white head). Ours sits in a narrow band of mid values.

**To add in Legion's renderer:** a soft (not stepped) toon ramp with a stronger key/fill difference for clothes; head
shading with a darker shadow side; a hair mesh with an underside shadow and highlight streaks; collar, placket, buttons and
badge as separate outlined shapes; poses with an arm toward the camera and props overlapping the body; soft contact
shadows; and a real depth-of-field pass (blur by distance from the focus plane), not a fixed band blur.


---

# PART 14: how the light hits the characters, and the exact character look (measured; overrides earlier sections)

Sources: 25 frames across all six videos measured by code (`light_measure.py` -> `deep2/light.json`): per head, the
brightness in 8 directions (light direction and contrast), the skin colour against the scene, the clothes' lit and shadow
colours and their left/right/top/bottom brightness; plus a side-by-side of his character and ours
(`deep2/char_compare.png`).

## 94. Heads are almost unlit (correction)

- Across 8 heads in 6 videos, the brightness difference between the brightest and darkest side of the face is only
  **1-5 %** (median **2 %**), and the direction of that tiny difference changes from shot to shot (62°-286°).
- So the white heads are **not shaded by the scene's key light**. They're near-flat white (#F0E9EC to #FBF5F5), with a
  darker falloff **only in the last ~10 % next to the outline**.
- The scene only **tints** the head a little: cool blue in the blue office (#CACDDE), pinkish in the purple night
  (#F8DCF5), neutral in daylight. Skin warmth stays ≈ 0 (it never turns orange).
- **Why:** the face is the one constant on screen; keeping it flat white makes every expression read the same in any
  light, and keeps it the brightest shape in the frame. (This overrides the "darker shadow side" in section 66/Part 13
  and the head shading in our test 4, which made the head too grey.)

## 95. Clothes ARE lit (strongly)

| scene | lit colour | shadow colour | lit side vs shadow side brightness |
|---|---|---|---|
| teal kitchen sweater | #34AEAF | #076A6F | 184 vs 121 (-34 %) |
| pink living-room top | #F1AFA7 | #092A2A (deep) | 201 vs 164 (-18 %) |
| police blue | #1A4BA8 | #092A69 | 174 vs 111 (-36 %) |
| office shirt blue | #72AAFA | #123D82 | 228 vs 196 |
| emperor red | #E17262 | #402722 | |
| night purple | #6559CC | #1E265E | 186 vs 133 (-28 %) |

- The **lit side is usually camera-left** (in 5 of 7 cases), and the shadow side is **~20-36 % darker**.
- The shadow colour is a **deeper, more saturated version of the same hue** (teal -> dark teal, blue -> navy), never grey.
- Top-vs-bottom differences are small and inconsistent: the light reads as **soft, from the front-left**, not from overhead.
- **So:** characters get a two-part look: **flat white heads + richly lit, saturated clothes**.

## 96. Frame exposure and colour: his vs our test 4

| | brightness | saturation | warmth |
|---|---|---|---|
| his frames (median of 25) | **0.665** | **0.416** | ~0.10 (shop shots 0.11-0.28) |
| our test 4 (medium / close-up) | 0.495 / 0.542 | **0.679 / 0.587** | **0.417 / 0.316** |

Our frames are **~25 % too dark, ~50 % too saturated and much too warm.** That's why test 4 looks heavy. Targets:
brightness ≈ 0.66, saturation ≈ 0.42, warmth ≈ 0.1-0.2 for a warm shop.

## 97. The character, exactly (his Kyle vs our Milo)

| part | his | ours (test 4) | fix |
|---|---|---|---|
| head | near-flat white, wide, the lower half slightly fuller; darker only at the very edge | grey-shaded sphere | flat white, edge falloff only |
| hair | a mid brown cap (#824418 base, lighter tan streaks, dark #361E1B creases) sitting on top like a helmet, **a clean fringe line across the forehead at about 40 % of the head's height**, a **parting crease**, short **sideburn flaps** down the sides, a thick curl at the crown | too dark, almost black-red, irregular edge | his brown values, a clean fringe edge, a parting, sideburn flaps |
| face placement | eyes and mouth low and wide; the fringe line sits just above the brows | similar | keep |
| brows | thick, soft warm grey, slightly arched, close under the fringe | thinner | thicker |
| torso | bean / egg, round belly, narrow top where the head sits | bell (ok) | rounder belly |
| clothes | bright, clean colour (polo red #E12C23) with a darker shadow side on the right | dark orange-red | brighter base, shadow on the far side only |
| limbs | thin near-black lines, legs long, small rounded feet | ok | keep |
| outline | thick warm near-black around head, hair and body | ok | keep |

## 98. Calibration recipe for Legion's renderer

1. Heads: unlit white shader, edge falloff only (last 10 %), plus a 5-10 % tint toward the scene's ambient colour.
2. Clothes and props: soft key from the front-left, shadow side 20-35 % darker, shadow = deeper saturated same hue.
3. Exposure: brightness ≈ 0.66 for interiors; saturation ≈ 0.42 as a frame MEAN only, **never by desaturating set colours** (wrong; see Part 20); warmth 0.1-0.2 in warm
   scenes, near 0 in daylight, negative in blue/night scenes.
4. Hair: his brown palette, a clean fringe line at ~40 % of the head height, a parting crease, sideburn flaps.


---

# PART 15: why ours still looks flat, side by side (his reaction frame vs our test 5, both on a 5 % grid)

Source: `deep2/react_grid_compare.png` (his frame at 2.7 s on the left, ours on the right, same 5 % grid). All
positions are in % of the frame. Nothing was re-rendered for this part: it's a study of what's different and why.

## 99. The biggest cause of flatness: the lens and the camera

| | his | ours |
|---|---|---|
| camera height | high, **looking down onto the counter at roughly 20-30°** | nearly level |
| lens | **wide and close**: the counter surface recedes strongly, its near edge stretches at the bottom of the frame | long and far: everything compressed to one scale |
| foreground | the register fills **x 0-33 %, y 46-70 %** and runs off the frame edge; the scanner is big at the right; the ticket sits low and close | a small scanner and a small blurred ticket, no register |
| counter surface | takes the **bottom ~45 %** of the frame, a receding plane | a thin band at the bottom |

**Why it matters:** with a wide lens close to the subject, near objects are drawn much bigger than far ones, and that size
difference is what the eye reads as depth. A long lens from far away makes the near register and the far wall the same
scale, which reads as flat no matter how good the shading is.

## 100. Layering: 4 planes vs our 2

His frame has **four depth planes**: (1) the foreground register and scanner, overlapping the frame edge and the
character; (2) the counter surface with the ticket, receding; (3) the character; (4) the blurred wall and posters. Ours has
the character and the wall. **Every one of his reaction shots puts at least one big, sharp, story object in front of the
character.**

## 101. The character, measured on the grid

| part | his | ours | what it does |
|---|---|---|---|
| head size in this framing | 66 % of the frame width | **90 %** (too close) | his leaves room for the foreground props |
| head shape | 1.09 wider than tall | ok | |
| **face features** | eyes **at the head's centre line** (y ≈ 19 % with the centre at ≈ 18.5 %), spaced 0.27 of the head width; mouth only **~0.17 of the head height below the centre**; a big white area from the mouth down to the chin | eyes below centre, mouth ~0.4 below: features spread down the face | his compact, central features are what make the face look like *him* (corrects the face positions in section 26, which were measured with the hair hiding the top of the skull) |
| **head-to-body join** | the head **overlaps the top of the torso**: no neck, no collar gap; the chin covers the collar | the head sits on top, with a pointed collar showing between head and torso | his reads as one solid character; ours looks like a ball on a cone |
| **torso shape** | a **rounded barrel**: near-vertical sides, broad rounded shoulders ≈ **0.82 of the head width** at shoulder height | a cone/bell, only ≈ 0.27 of the head width at the top | his shoulders give the arms somewhere to attach and the body weight |
| arms | thick dark lines (≈ 0.038 of the head width) from the outer shoulder corners; the near arm reaches toward the camera to the scanner, the other rests on the counter | thinner, hanging | the reaching arm adds a depth axis |
| name tag / badge | **big and bold**: the tag ≈ 0.2 of the head width, the badge ≈ 0.08, thick outlines, high contrast | small, thin | readable story labels at phone size |

## 102. The hair, side by side

- **His:** a **thick, volumetric cap that's bigger than the skull at the top** (like a helmet sitting on the head), with a
  **thick outline around its silhouette**; the **fringe line follows the sphere**: it arcs across the forehead and **dips
  lower at the sides** (y ≈ 14 % at the centre, ≈ 22-24 % at the sides); a **parting crease** splits it into two lobes; a
  few long curved dark strand lines and one lighter streak; warm medium brown, lighter on top.
- **Ours:** a thin band hugging the skull with a **straight horizontal bottom edge**, no parting, a tuft that's too tall
  and thick.
- **Why his works:** the volume and the curved fringe tell the eye the head is round; a straight edge reads as a flat
  sticker.

## 103. Expression detail at this beat

At "a million" his eyes **stay small grey ovals** (the lids go, the brows lift), the mouth is a small open oval with a pink
tongue, and the sweat drop sits **on the hair**. The big **ring eyes come later**, for the bigger shock (the police
arriving). Escalating the expression across the video keeps the biggest face for the biggest moment. (Our test jumped to
rings on the first shock.)

## 104. Tonal depth

His foreground objects are **darker and more saturated** (the black register with green digits, the orange scanner), the
character is mid-to-bright, and the background is **lighter, desaturated and blurred**. That near-dark / far-light
progression is aerial perspective; ours has similar tones on every plane.

## 105. What to change (when we build again)

1. A wide lens close to the subject, camera **high and looking down 20-30°** in counter scenes.
2. At least one big, sharp story object in the foreground of every character shot, overlapping the frame edge.
3. Character: head overlapping the torso (no neck/collar gap), a barrel torso with shoulders ≈ 0.82 of the head width,
   face features compact around the head's centre (eyes on the centre line, mouth ~0.17 below), thick arms from the
   shoulder corners with one reaching toward the camera.
4. Hair: a volumetric cap larger than the skull, a fringe that follows the sphere and dips at the sides, a parting crease,
   strand lines, a thick silhouette outline, a smaller tuft.
5. Expressions escalate: grey ovals + lifted brows for the first surprise, rings only for the biggest shock.
6. Near objects darker and more saturated, the background lighter, desaturated and blurred.


---

# PART 16: the final study of the character, camera, environment and light (all 110 shots; overrides earlier parts)

Method. Every one of the 110 shots in the six videos was judged by Legion's brain from the numbered contact sheets
(`scenes/cam_<vid>.json`: camera height, tilt, lens, depth layers, foreground, distance, blur, near/far value, key light,
practicals, rim, shadow types, and the character's construction). The judgements were then checked in two ways: with code
(blur, brightness) and by eye on two new sheets, 12 characters at close/medium scale (`deep2/char_sheet.jpg`) and 12 wide
environments (`deep2/env_sheet.jpg`). A vision read of the character sheet is in `deep2/char_system.json`. **Where the
vision read and my own reading disagreed, I went back to the pixels; those corrections are marked.**

## 106. The character system (one construction for everyone)

His whole cast is **one rig with swapped colours and one accessory each**. Close-up characters in the sheet: cashier
(3 shots), customer, prize clerk, boss, worker, officer, buyer, dad, knight, emperor.

| part | rule | measured / seen |
|---|---|---|
| head | a white sphere, very slightly squashed: **~1.07-1.10 wider than tall**, widest just below the middle | all 12; never deforms with expression |
| head size | **~30 % of standing height** in ordinary clothes (25 % in long robes) | Part 12 table holds |
| neck | **none**. The head **overlaps the top of the torso by ~0.10-0.15 of the head height** | head overlaps torso in **69 / 74** character shots |
| torso | an **egg / bean**: rounded top, **widest at the belly, not the shoulders**, round bottom. Width ≈ **0.75-1.0 of the head width**, height ≈ 1.0-1.2 head heights. It *is* the clothing: vest, suit, coat, uniform, robe | bean 36, other 17, bell 11, robe 8, barrel 2 of 74 |
| arms | **near-black ink tubes**, the same thickness as the outline (~0.035-0.05 of the head width), attached **just inside the torso silhouette ~20 % down**, bending in smooth rubber-hose arcs. No sleeves on the arm itself: the sleeve ends at the torso. Hands are **small black balls** (~0.10-0.13 of the head width), no fingers, they curl around props | tiles 1, 4, 6, 7, 9, 10 |
| legs | the **same black tubes**, long: **~40-45 % of height** in ordinary clothes, starting close together under the torso, ~0.3-0.4 of the head width apart. They end in **small rounded shoes** (black, or coloured 3D slippers/boots when the story needs them, e.g. the dad's blue slippers) | tiles 4, 7, 8, 9, 10 |
| outline | near-black, **~3 % of the head width** on head and torso, uniform weight, rounded; props ~1.5-2 %; man-made set pieces thinner still; **nature has none** (see 110) | Part 8 holds |

**Correction to section 101 / 105 item 3.** The torso is **not a barrel with broad shoulders**. 36 of 74 character shots are
bean/egg-shaped and only 2 are barrels; the boss is a narrow egg, the officer and dad are eggs widest at the belly. The
"0.82 shoulder width" measured on the cashier is the top of his apron bib, not the shoulders. Build the torso as an egg
(a sphere scaled ~0.85 x 1.15 x 0.75, the widest point ~40 % up from the bottom) and let the head sink into its top.

**Correction to section 101 "thick arms from the shoulder corners".** Arms are ink tubes, not clothed limbs; they start
slightly inside the silhouette, not at a corner, because an egg has no corner.

## 107. The head and face, at full detail

- **Skin**: near-white (#F4F2F0 to #FFFFFF in daylight), unlit in the middle. The only shading is a **soft cool-grey band
  along the lower edge and one side** (5-8 % darker), a **soft occlusion shadow under the hair fringe** (~0.08-0.12 of the
  head height), and the **colour of the scene light** (warm in sun patches, deep blue at night: the dad's head at night is
  blue-white, not white). Edges are crisp; softness only inside. This matches Part 14 (heads 1-5 % contrast).
- **Feature block**: compact and centred. The eyes are **on the head's centre line or just below** (45-55 % down the visible
  head; the hair hides the top), centres **~0.27-0.32 of the head width apart**. The mouth is **~0.15-0.2 of the head height
  below the eyes**, so a large white chin area remains. Section 101 holds; the vision read's "eyes at 55-60 %, mouth at
  75-80 %" came from heads whose hair adds height, and was rejected.
- **Eyes**: small **grey (not black) ovals** with a darker pupil and a **flat or slanted upper lid line** (the half-lidded deadpan
  is the default look of this channel: cashier, customer, officer, emperor all wear it). Happy = upward arcs `^ ^`; big shock =
  rings with tiny pupils (saved for the biggest moment, section 103); glasses = thin round rings with the eye inside.
- **Brows**: short, thick, soft-edged strokes in the hair colour (or dark grey), ~0.12-0.18 of the head width long,
  ~0.08 of the head height above the eyes. Angled for a smirk, lifted for surprise, sometimes absent.
- **Mouth**: small. A dark-grey flat bar (deadpan), a small curve (smile), an open oval with a pink tongue (surprise), a
  **wide grin with a white rectangular tooth grid** (laughing / scheming: the clerk, the boss, the emperor's court). No lips.
- **No nose, no ears.** Moustaches and beards are solid shapes on top (the customer's thick brown bar; the buyer's beard is one
  mass with his hair, with vertical strand lines).
- Extras: a sweat drop sitting on the hair; cheek blush; nothing else.

## 108. Hair, at full detail

- A **solid shell that sits on the skull and stands proud of it** by ~0.04-0.08 of the head height on top and at the sides,
  with the same heavy outline as the head.
- The fringe is a **soft wave**, lower at the sides than the middle (it follows the sphere, section 102), at ~25-35 % down the
  head. At the temples the shell's lower edge **flips outward slightly** (visible on the cashier as a little lip of outline).
- **One signature tuft**: a single curled spike on top (~0.15-0.2 of the head height) on the young male lead, rendered as
  a 3D curl that catches the light.
- Surface: 2-4 darker strand lines that radiate from the crown and **one lighter streak band** on the lit side. Never
  individual strands.
- Types in the sheet: bowl cut with tuft (lead), tight round curls built from bumps (clerk), short grey side-part with a
  receding line (boss), beard-and-hair mass (buyer), and hidden under a hat or helmet (customer, officer, dad, knight,
  emperor). **Hats are the most common hair**: 5 of 12.

## 109. Clothes and accessories

- Clothes are the torso, coloured in **one strong job colour** (red vest, navy suit, police blue, mustard coat, green quilt).
- They are **lit 3D surfaces** (Part 14: shadow side 20-36 % darker, from the front-left key), with folds and seams as a few
  short ink lines, quilting/stripes as geometry or texture.
- Story labels are **big**: the name tag ≈ 0.2 of the head width, the badge/star ≈ 0.08, the tie a saturated blade.
- Hats sit 0.2-0.3 head heights over the skull, brims with a dark underside; accessories carry the joke (the bucket hat
  full of fishing lures, the headlamp, the imperial hat with tassels).

## 110. The environment, final (what I see on the 12 wide shots)

1. **Real 3D sets, built and lit**: rooms with walls, ceilings, floors and furniture placed in space; the camera moves through
   them (tile 6: a high wide view of a living room; tile 1: a low wide angle with a strongly foreshortened desk).
2. **Two surface languages, split by what the thing is.**
   - **Man-made hard surfaces** (furniture, buildings, cars, ships, fridges, counters) get **thin dark outlines on silhouette
     and crease edges** and clean flat-ish shading with soft occlusion in the corners.
   - **Nature** (sky, clouds, water, trees, grass, foliage, rock faces, sand, smoke, fire) has **no outline** and is
     **painterly**: soft gradients, hand-painted texture, god rays through trees, foam and caustics on water.
   This split is the single biggest environmental rule I had missed. It is why his frames read as "toon characters in a
   rich world" rather than "everything is a cartoon".
3. **The floor is a big readable plane**: 30-50 % of the frame in high and top-down shots, always textured with a pattern
   that shows perspective (checker tiles, planks, cobbles, paving, terrazzo, carpet borders).
4. **Light shapes on surfaces**: sun patches through windows as hard-edged trapezoids on floors and walls (tiles 1, 6), blind
   stripes (6 shots), pools under lamps (tile 8). They make the set feel lit by a real source.
5. **Aerial perspective**: far things get lighter, bluer/warmer-hazier and less saturated (tile 10's mountains and city, tile 12's
   ruined town in the sunset haze). Near objects are darker and more saturated (section 104 holds).
6. **One dominant colour per scene**, set by the place and the time of day (Part 10 holds): warm day interiors with
   saturated walls (yellow kitchen, teal cabinets, green office tiles); **night = the whole frame washed in saturated blue**
   with one warm practical pool; **sunset = magenta-to-orange gradient sky** that tints the scene; fire/lava = orange glow
   from below.
7. **Glow and bloom** on every light source (lamp bulbs, the sun, lava, fire, screens).
8. Wide establishing shots are **dense and orderly** (the army in rows, the palace, the city), never random clutter.

## 111. The camera, over all 110 shots

| measure | result |
|---|---|
| camera height | eye 33 %, **low 30 %**, top-down 13 %, high 12 %, chest 11 %, floor 2 % |
| tilt | level 60 %, down-steep 16 %, up 15 %, down 9 % |
| lens | **wide 54 %**, normal 43 %, long 4 % |
| distance | medium 44 %, close 34 %, wide 15 %, extreme close 7 % |
| depth layers | **a foreground object in every shot** (100 %): desk edges, counters, chair backs, a head or arm at the frame edge, awnings, grass; **3.45 layers on average, 4 layers in 52 %** |

**Correction to section 105 item 1.** "Camera high, looking down 20-30°" is right **for counter/desk scenes only**. Over the
whole channel the camera is at eye height or **low** (looking up at the character) about as often, and top-down views are
used for maps, beds, tables and floors. The rule is: **wide lens, close to the subject, a foreground object always, and the
height chosen by what the shot is about**: low for power and reveal (the emperor, the knight), high/top-down for "look at
this thing on the table/floor", eye level for dialogue and deadpan.

## 112. Depth of field, settled with code

Vision said "no background blur" in 71 % of shots. Code disagrees: the sharpness of the sharpest image cell divided by the
median cell is **5.2 on average, above 4 in 64 % of shots** (medium 4.3, close 5.9, extreme close 7.9, wide 7.6). A
sharp subject band with softer areas around it is the norm. Vision misses it because the blur is **moderate** (the
background stays readable) and the tiles are small. Rule: **always a focus plane on the subject; background softened enough
to drop it back but never so much that the place stops reading; foreground objects at the frame edge can blur more.**

## 113. The light, over all 110 shots

| measure | result |
|---|---|
| key light | mostly **top** (sun or ambient sky), then front ambient, side window (often with blind stripes), a top practical glow (lamp, candles), and back light from the moon or a sunset |
| practicals visible in frame | **50 % of shots** (windows, ceiling lights, hanging lamps, furnace, headlamp, register screen, moon, sconces, candles) |
| rim light on the subject | 16 % (mostly night and back-lit sunset shots; also on dark limbs over dark ground) |
| shadows | **contact shadows in 90 / 110**, cast 50, ambient occlusion 32, blind stripes 6, none 12 |
| near / far value | even 54 %, near darker 35 %, near lighter 12 % |
| frame brightness / saturation (Part 14) | ≈ 0.665 / 0.416: bright and moderately saturated, never dark-moody even at night (night is *saturated blue*, not black) |

What this means:
- **A visible source in half the shots.** The light is shown, not implied, so every scene feels lit by something in it.
- **Contact shadows are nearly universal**: every character and object touches the ground with a soft dark pad. A floating
  object is the fastest way to look cheap.
- The **characters are lit almost flat** (heads 1-5 % contrast) while **sets and clothes get real directional light**. The
  head stays readable in every light; the world carries the mood.
- **Night**: overall blue wash on everything including the white heads, one warm pool from a practical, bloom on the source,
  rim on dark shapes. **Sunset**: a gradient sky, warm low key from behind, haze. **Day interior**: soft top/window key, a
  hard sun patch on the floor or wall, saturated walls.

## 114. Why it all looks deep (the stack, in order of impact)

1. **Wide lens, close, with a foreground object** (every shot) -> strong perspective and overlap.
2. **A real 3D set with a textured floor plane** -> the eye reads the space.
3. **Moderate depth of field** on the subject.
4. **Aerial perspective**: near dark and saturated, far light and hazy.
5. **Light shapes and practicals in the frame**, plus contact shadows on everything.
6. **Two surface languages**: outlined man-made things against painterly, unlined nature.
7. **Characters with overlap and volume**: the head sunk into an egg torso, hair standing proud of the skull, tubes bending
   in arcs, and a heavy outline that keeps them in front of everything.

## 115. What our test got wrong, mapped to these rules

| our test 5 | rule broken | section |
|---|---|---|
| cone/bell torso, collar gap | egg torso, head sunk in, no neck | 106 |
| polo with sleeves on thick arms | black ink-tube arms, ball hands | 106 |
| features spread down the face | compact feature block on the centre line | 107 |
| thin hair band, straight edge | proud shell, wave fringe, flip at the temples | 108 |
| outline on everything at one weight | heavy on characters, thin on man-made, none on nature | 106, 110 |
| plain floor | textured floor with perspective | 110 |
| no light shape on any surface | sun patch / blind stripes / lamp pool | 110, 113 |
| framing too close, no foreground | wide, close, a foreground object always | 111 |
| same tone on every plane | near dark, far light and hazy | 110 |

## 116. Build sheet (for the renderer)

**Character rig (one for everyone)**
- Head: sphere r = 1, scaled (1.08, 1.0, 1.0). Unlit white shader; a soft grey band at the lower edge and one side (5-8 %);
  an occlusion band under the fringe; multiply by the scene light colour.
- Torso: egg (sphere scaled 0.85 x 1.15 x 0.75 of the head radius, widest ~40 % up). The head centre sits so the head overlaps
  the torso top by 0.10-0.15 of the head height.
- Arms/legs: tube curves, radius ≈ 0.02 of the head width (so the drawn width with the outline ≈ 0.04-0.05), near-black
  (#1A1416); 2-bone soft bends; ball hands r ≈ 0.06; legs ≈ 1.3-1.5 x the head height, rounded shoes.
- Face decal: grey eye ovals with a lid line on the centre line, spacing 0.3; brows 0.08 above; mouth 0.17 below. Expression
  sets: deadpan (default), smile, smirk, surprise, laugh-teeth, ring shock (once per video, the biggest moment).
- Hair: a shell 1.06 x the skull, fringe as a wave dipping at the sides, a slight outward flip at the temples, 2-4 strand lines,
  one light streak, optional curl tuft; or a hat.
- Outline: ~3 % of the head width on characters.

**Set**
- Man-made meshes: outline ~1-1.5 % of a head width, Lambert/soft shading, occlusion in the corners.
- Nature: no outline, painted textures, soft gradients, god rays, water with foam.
- Floor: always a patterned texture.
- Lights: one key chosen by place and time (top sun / window / practical / moon), a hemisphere fill, one visible practical in
  half the shots with bloom, a hard light shape on a floor or wall, contact shadow pads under everything.
- Atmosphere: depth-based haze toward the sky colour; DOF focused on the subject, moderate.

**Camera**
- Wide lens (≈ 18-24 mm equivalent), close to the subject, one foreground object overlapping the frame edge in every shot.
- Height by purpose: eye (dialogue/deadpan), low (power/reveal), high/top-down (things on tables and floors, maps).

**Grade**: brightness ≈ 0.66, saturation ≈ 0.42 as a mean (the distribution in Part 20 is what counts); night = saturated blue, not dark.

## 117. Confidence, and what is still uncertain

- **High confidence** (measured with code and confirmed by eye): the character construction (106-109), the camera numbers
  (111), the DOF finding (112), the light statistics (113), the outlined-vs-painterly environment split (110.2).
- **Medium**: exact numbers that come from vision judging small tiles (layers, near/far value, rim). Direction is right; the
  percentages could be off by ±10 points.
- **Still open**: the exact painterly texture method for nature (painted textures vs a stylised shader) and how his
  environments are sourced (built per video vs a kit). Neither changes the rules above; both affect how cheaply Legion can
  make them.
- The remaining gap is **execution, not knowledge**: the earlier tests broke rules that are now written down (section 115).


---

# PART 17: how he paints nature, and whether sets are built per video or from a kit

Method. (1) Eight full-resolution crops of nature and surfaces (`nature/*.png`, `nature/sheet.jpg`), read by me and by
Legion's brain (`nature/paint.json`). (2) **Parallax measured with code** during five camera moves: features tracked over
5 frames, a single-plane (homography) fit with RANSAC, and the spread of motion inside each region (`nature/mv_*.jpg`). A flat
painted card moves as one plane; real depth shows motion that varies with distance. (3) All six shot sheets compared for
repeated assets by Legion's brain (`nature/kit.json`), checked against Part 6 section 44.

## 118. Parallax: what is flat and what is deep (measured)

| camera move | single-plane fit | motion spread (p10 / p50 / p90 px over 5 frames) | reading |
|---|---|---|---|
| forest, trunks band (jpFJ 29.0 s) | 60 % | 9 / 17 / 21 | **several depth layers** (near trunks move ~2x the far ones) |
| ship, cliffs band (lnYL 5.6 s) | 65 % | 8 / 18 / 33 | **layered**: the pillars, the ship and the far cliffs move at different speeds (4x spread) |
| village (jpFJ 4.2 s) | 29 % | 0.5 / 43 / 69 | **full depth**: clouds almost still, the village mid-speed, the foreground tree trunk fast |
| army (VS1Z 15.0 s) | 77 % | 16 / 44 / 45 | mostly one plane: a big crowd seen from far away |

**Result:** nature is **not one painted backdrop**. It is a **multiplane**: 3-5 depth layers that the 3D camera moves
through, so near things slide faster than far things. Only the very farthest layer (sky, the far forest haze, the far
mountains) behaves like a flat backdrop. This is why his camera moves through nature feel deep even though each layer is
simply painted.

## 119. How each kind of nature is made

| element | construction | lines | shading |
|---|---|---|---|
| **sky** | a gradient plane / skybox: deep blue at the top to light blue at the horizon; sunset = magenta to orange; night = saturated blue | none | painted gradient |
| **clouds** | 3-4-lobed white shapes with a pale blue-grey underside: cards or simple puffy meshes at different depths, drifting slowly | none | 2-3 painted tone steps, crisp but slightly feathered edges |
| **far forest / haze** | a painted plate: pale trunks, leaf blobs, strong haze, **god rays as soft additive streaks** | none | painted; light grows toward the depth |
| **near trunks** | separate trunk shapes (cards or simple cylinders) at 2-3 depths in front of the plate | none or very soft | painted bark, darker near the ground |
| **ground / forest floor** | a big ground plane with a **painted texture**: dirt, leaf litter, dappled light patches baked in | none | baked into the texture, plus blob contact shadows under characters |
| **grass and flowers** | **alpha-cutout cards** in 2-3 rows at the frame edge, clumps of 3-4 greens with simple disc flowers | soft darker edge, no ink | painted gradient per blade |
| **bushes and tree crowns** | one painted mass per bush: lobes with lighter tops and darker undersides (gouache look) | none on the mass | 3-4 painted values |
| **palm fronds, ivy leaves, vines** | cards with **hand-drawn dark contours and vein lines painted into the texture** | **yes, painted in** (not from the renderer) | flat two-tone |
| **water** | a flat plane with a gradient (lighter at the horizon, deeper near the camera) and **sparse painted ripple dashes** at one angle, bigger toward the camera, scrolling slowly; a sun-glint sprite | none | unlit gradient |
| **cliffs and rocks** | big simple slabs with 2-3 flat tones per face and a few thin vertical crack lines; vegetation ledges as separate cards | very light (cracks only); the ledges have thin contours | painted flat tones |
| **fire, smoke, explosions** | soft painted puffs (white smoke balls like the cannon smoke), glowing orange with bloom | none | painted + additive glow |

**Refinement of section 110.2.** "Nature has no outline" holds for skies, clouds, water, haze, bush masses, ground and
rocks. **Small, graphic vegetation (palm fronds, ivy, vine leaves) does have contour lines, but they are painted into the
texture**: hand-drawn, slightly uneven and darker green, never the renderer's near-black character line. So the rule is:
**the renderer outline belongs only to characters and man-made props; any line on nature is drawn into its painting.**

## 120. Why he paints nature instead of modelling it

1. **Nature as 3D meshes with an outline looks like plastic toys.** Painted, unlined nature reads as a rich illustrated
   world, and the outlined characters and props sit in front of it as the "actors". The split creates figure/ground
   separation for free.
2. **It's cheap.** A painted plate and a handful of cards replace thousands of leaves and blades. A gradient plane with
   ripple dashes replaces a water simulation.
3. **It hides the 3D.** The painted layers carry the "drawn" feel of a 2D cartoon while the camera keeps real 3D parallax.
   That mix (a 2D look with 3D camera depth) is the core of the channel's look.
4. **Light is painted in.** God rays, dappled patches and haze are part of the painting, so outdoor scenes look beautifully
   lit without any real-time lighting setup.

## 121. Built per video, or from a kit?

**Answer: both, about 70 % reused families / 30 % bespoke** (Legion's brain over all six sheets; consistent with section 44).

- **Reused as-is across all videos:** the character rig (one body, re-coloured, one accessory each), the caption treatment,
  the cloud style, crowd copies (the army, pirates), the lighting recipe (window stripes, lamp pools, bloom).
- **Reused as families (same construction, recoloured, rearranged):** office furniture (desks, partitions, cork boards,
  ceiling tiles), home furniture (sofa, lamp, fridge, checkered floor, curtains), house facades, crates, barrels, chests,
  cannons and ship parts, castle pieces (columns, banners, battlements), thatched cottages and stalls, palms, rocks, grass,
  flowers, bushes, stone and brick textures.
- **Bespoke per story (the 30 % that sells the script):** every sign, poster, screen and labelled prop: the scratch ticket, the
  "OUR WINNERS" wall, the prize-claims booth, the FIRE EMPLOYEE button, the "Don't Move" fridge note, the FOR SALE sign, the
  dragon jar, the "Hot Shot" furnace sign, the "Price of Sins" board, the pardon scroll.
- **Within one video, each place is built once and shot 2-6 times** (section 42), often opening and closing on the same set.

**Why this split matters:** the generic kit gives the volume of places (8-11 per Short) and a consistent look; the bespoke
pieces carry the jokes and the story. Viewers remember the labelled props, not the furniture, so the money goes there.

Literal copies of the same furniture model between videos are hard to prove from contact sheets: the families clearly repeat,
and exact identity can't be confirmed at this resolution. That changes nothing for Legion: **a kit of families plus
generated story props is exactly the production model.**

## 122. What this means for Legion (cost and method)

- **Characters:** one parametric rig (section 116) with colour, hair/hat and one accessory as parameters. Zero cost per Short.
- **Man-made sets:** a library of outlined prop families in code (desk, counter, shelf, sofa, fridge, door, window, lamp,
  crate, barrel, chest, cannon, stall, cottage, wall/floor materials), recoloured and arranged per place. Built once.
- **Nature:** a multiplane kit: sky gradients (day / sunset / night), cloud cards, 2-3 painted forest/cliff/sea/city plates,
  grass/flower/bush/palm/ivy cards, a ground-texture set, a water shader with ripple dashes, god-ray and glow sprites. Built
  once; layers placed at 3-5 depths per shot.
- **Story props (the 30 %):** generated per Short as flat painted textures on simple shapes (sign boards, posters, screens,
  tickets, labels), with the readable text drawn in code so the words are exact. The only per-Short cost, and it can be zero
  if painted in code.

## 123. Build recipe for nature (renderer)

1. Sky: a gradient sphere, colours sampled from his frames (top -> horizon): day `#3B91D9 -> #65B3F6 -> #74B6FE`;
   sunset `#6550D0 -> #D37DEF -> #FFBFDB` (purple to magenta to pink, **not orange**; orange only appears right at a low sun);
   night `#2B3ECC -> #3250E8` (saturated royal blue, never near-black; the deepest night interior goes to `#08258E`).
2. Far plate: a painted card at depth 1.0 (forest / cliffs / city / sea horizon), hazed toward the sky colour, no outline.
3. Mid layers: 1-3 rows of cards (trunks, cliffs, cottages, palms) at depths 0.4-0.7, slightly hazed.
4. Near layer: grass/flower/bush cards and one foreground object at the frame edge at depth 0.05-0.2, sharp or blurred by DOF.
5. Ground: a large plane with a painted texture (dirt + leaves + light patches), blob contact shadows under every character and
   prop.
6. Water: gradient plane + scrolling ripple-dash texture scaled by distance + a glint sprite + a thin bright horizon line.
7. Light: god rays as additive soft streaks, bloom on the sun/fire/lamps, and a colour wash matching the time of day on
   everything including the heads.
8. Outlines: the renderer's outline pass masks out every nature layer; only characters and man-made props get it.
9. Motion: clouds drift, grass cards sway (vertex bend), ripples scroll; the camera always moves so the parallax shows.

**Confidence:** the multiplane construction (measured parallax), the painted-in contour rule, and the no-renderer-line rule
for nature are **high**. The exact 70/30 kit split is an **estimate** (±15 points). Whether he paints the plates by hand
or uses bought stylised assets cannot be seen in the frames, and it doesn't matter for reproduction.


---

# PART 18: post-mortem of test 5, and how every future test is made

The side-by-side that this part is about is `test2s/compare.jpg`. Panels 1 and 3 are his frames (ref-A), and
panels 2 and 4 are our test 5 at the same moments. Our test scored **3 / 10** from Legion's critic (`deep2/critic_test5.json`,
made with `critic.py`).

## 124. Why test 5 failed, when the knowledge was already here

Almost everything wrong with test 5 was **already written in this file** (Parts 8, 12, 14, 15). The failure was process,
not knowledge:
1. **Each test was built from memory of the md, not checked against it.** Rules were read and then "interpreted" while
   coding. Nothing verified the scene against the rules before rendering.
2. **Nobody but the builder judged the result.** The person who built it judged it, so they saw what they meant to make,
   not what was on screen.
3. **The tests chased one fix at a time** (outline, then light, then colour) instead of matching the whole frame.
4. **Renders were made without being asked.** Each one cost time and attention instead of study.

## 125. Exactly what is wrong in test 5 (our panels 2 and 4 vs his 1 and 3)

| element | his | ours (test 5) | rule (where it already was) |
|---|---|---|---|
| **body** | an **egg**, widest at the belly; the head **sinks into its top**, no neck, no collar gap | a red **cone / bowling pin**, a collar lump between head and body | 106 (and 101) |
| **face** | eyes and mouth **together around the middle** of the head; the mouth ~0.17 head heights below the eyes; a big white chin | features **spread down the face**, mouth far below | 101, 107 |
| **expression on "a million"** | small grey eyes stay, **brows lift**, small open mouth (the rings are saved for the bigger shock later) | **jumps straight to big ring eyes** | 103, 107 |
| **hair** | a **thick helmet shell standing proud of the skull**, fringe as a wave that **dips at the sides**, a small flip at the temples, strand lines, one light streak | a **thin band** with a straight edge and a **tuft that is too big** | 102, 108 |
| **framing** | **wide lens, close, with strong perspective**; there is **always something close to the camera** (in his panel 3, the register display and the counter edge); the character is in a place | **too close and flat**, nothing in front, a floating head on a wall | 105, 111 |
| **lighting** | a **visible lamp with a warm pool** on the counter; **light shapes on surfaces**; **dark foreground against a lighter background**; the back wall **softly** blurred | **the same light everywhere**, no pool, no light shapes, every plane the same tone | 104, 110, 113 |
| **set** | ceiling with tiles, signs, boards, posters, a register with a story screen, real depth | **a plain wall** with a few squares | 42, 110 |
| **grounding** | **contact shadows** under every object | the ticket and the scanner **float** | 113 |
| **action** | the hand **grips** the scanner and points it at the ticket | the scanner sits next to the hand | 106 (hands curl around props) |
| **outline** | heavy on the character; **thinner but present on every man-made prop**, counter edge included | thick on the head, thin or missing on the counter and props | 106, 110 |
| **depth of field** | **moderate**: the place stays readable | **too strong** in the close shot (calendar and wall turn to mush) | 112 |
| **captions** | heavy rounded white with a thick dark stroke | thinner weight and stroke, gets lost on the counter | 21 / caption section |
| **continuity** | the character keeps his size and place; only the camera moves | the scale jumps between shots | 41 |

## 126. Legion's critic: what it got right and what the measurements overrule

Legion's critic is used as a **second pair of eyes, not as the authority**. Where it disagrees with something this file
**measured with code**, the measurement wins. From its review of test 5:

**Accepted** (it agrees with the md, or adds something new and true):
- Props float with no contact shadows; the scanner must be **held** with a gripping hand, pointed at the ticket.
- The set is sparse: the ceiling, signs, ticket boards and register screen belong in every angle of this place.
- Outlines must be on **every** man-made object at a steady weight, and must not get blurred away.
- The lamp needs a warm pool of light on the counter; add a gentle vignette.
- The counter front is a dead zone: put a sign on it.
- The head is **the brightest thing in the frame**: bring the white down (~0.92) and let the scene light tint it, so the red
  uniform is the strongest colour.
- The captions are too thin.
- Lock the character's size and position; move the camera only.

**Overruled by measurements** (do NOT follow these):
- "Make the head smaller and taller than wide": measured **1.07-1.10 wider than tall**, ~30 % of the height (Part 12, 106). The
  close-up head looked huge because of our framing, not the model.
- "Features in the lower 60 % of the head": measured **on the centre line** (101, 107).
- "Torso with shoulders and a pointed collar": measured **egg**, 36 of 74 shots; 2 barrels (106).
- "No depth of field": measured a sharp subject with a **moderately** soft background in 64 % of shots (112). Ours was too
  strong, not wrong to exist.
- "Use the name KYLE": **never copy his names, signs or scripts**. Our own name is right.
- "Narrow 35-40 mm lens": measured **wide in 54 %** of shots (111).

**Lesson:** a vision model judging small panels misreads proportions and blur. Use it for "what is missing / what looks off",
and check every number it gives against this file.

## 127. Pre-render checklist (every item checked before a frame is rendered)

Each item is checked in the scene code or with a measurement. Any "no" means the build isn't ready.

**Character**
- [ ] Torso is an egg (widest ~40 % up, width 0.75-1.0 of the head width); no cone, no collar gap. (106)
- [ ] Head 1.08 wider than tall, overlapping the torso top by 0.10-0.15 head heights; no neck. (106)
- [ ] Arms and legs are near-black tubes ~0.04-0.05 of the head width, ball hands; **hands grip their props**. (106)
- [ ] Eyes on the head's centre line, ~0.3 head widths apart; mouth ~0.17 head heights below; brows ~0.08 above. (107)
- [ ] Expression ladder: deadpan -> lifted brows + small mouth -> rings only for the biggest shock of the video. (103)
- [ ] Hair: a shell standing proud of the skull, wave fringe dipping at the sides, flip at the temples, strand lines, one streak,
      a small tuft. (108)
- [ ] Head white ~0.92, tinted by the scene light; soft grey band at the lower edge; occlusion under the fringe. (107)
- [ ] Outline ~3 % of the head width, near-black, on the whole character. (106)

**Camera**
- [ ] Wide lens, close, with **one sharp-or-blurred object in the foreground overlapping the frame edge**. (111)
- [ ] Height chosen by what the shot is about (eye / low / high / top-down). (111)
- [ ] The character keeps the same size and place across shots; only the camera moves. (41)
- [ ] The place reads in every shot (ceiling, name wall, story props in view). (42)

**Light**
- [ ] One key chosen by place and time; one visible practical with bloom; a **warm pool** under it. (113)
- [ ] A hard light shape on a floor or wall (sun patch, blind stripes, lamp pool). (110)
- [ ] Contact shadows under **every** character and object. (113)
- [ ] Near planes darker and more saturated, far planes lighter and hazier. (104, 110)
- [ ] Frame brightness ~0.66; saturation checked as a DISTRIBUTION (Part 20, section 135), not just the ~0.42 mean. (113, 135)

**Set**
- [ ] Man-made props outlined (~1-1.5 % of a head width); nature unlined (painted lines only). (110, 119)
- [ ] Floor or counter textured with a pattern that shows perspective; no dead flat zones (signs on fronts). (110)
- [ ] The name wall, the story props, and one hidden joke are in view. (42, 44)

**Finish**
- [ ] DOF moderate: subject sharp, background soft but readable. (112)
- [ ] Captions: heavy rounded white, thick dark stroke, ~70 % down. (caption section)

## 128. Workflow for every future test or video (fixed)

1. **Nothing is rendered unless the creator asks for it.** Tests and videos are made only on their call.
2. Build the scene **only from this file**: walk the checklist in 127 item by item, quoting the section for each choice.
   No guessing; if the md doesn't cover something, study the references first and write it here before building.
3. When a render is asked for, make **one still first** at the matching moment of his video, and put the two side by side.
4. **Legion's critic** (`critic.py <side-by-side> <out.json>`) judges it as a harsh director who didn't build it. Check its notes
   against the measurements (126); fix what holds.
5. Re-measure the still with code (proportions, brightness, saturation, outline width) against the numbers here.
6. Only when the still scores **8 / 10 or more** and passes the checklist does the full clip get rendered, and it is shown to
   the creator together with the score and the notes.
7. Every new lesson from a test goes into this file the same day.

---

# PART 19: test 6, what his frames corrected (2026-10-24; overrides 66, 103 and 108 where they differ)

## 129. Face parts are dark and big (corrects 66)
- At medium and close sizes the eyes, brows and mouth read as **near-black warm ink (#33262A)**, not warm grey. The grey in
  66 was measured on small, far faces where compression and blur lighten them.
- Deadpan eyes are dark ovals ~0.125 x 0.112 of the head width, centres ~0.145 HW off the centre line, **cut flat by a lid
  line** across the top ~12 %. The brows are thick, dark and tapered, ~0.14 HW off the centre, ~0.08 HW above the eye line.
- **Lifted brows raise their inner ends** (surprise or worry). An inner end lower than the outer end reads as angry, never
  use it for a shock beat.

## 130. The shock beat ("a million") (corrects 103)
- His frame at 2.75 s: **eyes shut as short, slightly arched dashes** (~0.12 HW long), a **big open oval mouth** (~0.12 x 0.13
  HW) with a pink tongue in its lower half, and the sweat drop on the hair at the temple. The "small grey oval eyes" in 103 are
  wrong for this beat.
- The reaction shot is close and high: the head fills ~40 % of the frame width and sits in the **upper third**; the counter
  and the display stay in the lower half.

## 131. Hair (refines 108)
- The cap covers only the **top ~30-35 %** of the head at the centre line. At the sides the fringe drops only a little (about
  0.24 of the head radius lower than the centre), so the hair never frames the face like a mask.
- The fringe line is **thin and crisp** (the same weight as the head outline), with a narrow shadow band under it. A thick
  dark fringe band makes the hair read as a helmet.
- The face stays **one clean white** right to the outline: no grey band at the sides (an edge falloff wider than ~0.18 of
  the facing ratio shows up as a grey ring).

## 132. Set and camera details that test 6 confirmed
- **Counter colour:** his counter measures **#908683 / #837E80** in frame (raw #BAB3B0, section 67). Warm lamp light on it
  must stay weak (our pool at full strength turned it peach #D1B19F, a clear mismatch).
- **Scratch arcs** on laminate are faint (~35 % alpha). Bright arcs show as big white rings in macro inserts.
- **Wide opening:** the camera is near **eye level** (not looking down), so the ceiling tiles and the lamp show above and the
  counter front stays a thin strip at the bottom. The pendant lamp hangs **straight above the character**, not over the sign.
- **Depth of field by shot:** wide shots keep the set readable (about half the blur of the close-ups); macro inserts and
  close reactions go shallow (112).
- **Props in hand:** the scanner is a readable gun shape (dark body, a bright nose band, a red window) and the hand balls sit
  on its grip. The scan beam, if any, is faint; his inserts show no beam at all.

## 133. The critic alone can't gate a test
Across six critic runs on test 6 (6.5, 6, 6, 6, 6, 6), it repeatedly:
- **judged his panel as ours** (his orange box in the insert, his captions over the ticket);
- **reversed itself** between runs (counter "cool grey" then "warm beige"; camera "pull back" then "push in"; scanner "dark"
  then "orange");
- **asked for things the measurements forbid** (thicker outlines than 3 %, more saturation than Appendix A, a smaller head).

So the score sits near 6 whatever changes, and chasing it means guessing. **From now on a test passes on:**
1. the per-element checklist (127) measured with code against this file (proportions, colours, outline width, framing,
   brightness, saturation);
2. a critic run that labels every panel **REFERENCE** or **OURS** inside the image, scores **each element separately**, and
   is run **3 times with the median taken**. A note only counts if it appears in at least 2 of the 3 runs and doesn't
   contradict a measurement here.

---

# PART 20: saturation and practical lights (2026-10-24; overrides every earlier grade and saturation rule)

Why: test 6 looked like a cheap knock-off next to his frames, although its frame-mean saturation "matched" (0.36 vs his 0.42-0.46).
Measured with `colour/sat_study.py` (all 6 videos, 1 frame/s, caption band removed; results in `colour/sat_study.json`) and
with element samples from his lottery wide (0.5 s) vs our test 6 (0.3 s).

## 134. The finding: his colour is two-sided, ours sat in a muddy middle
| | his, all 6 videos | his, lottery shop 0-3 s | ours, test 6 |
|---|---|---|---|
| mean / median S | 0.46 / 0.45 | 0.42 / 0.36 | 0.36 / 0.31 |
| p75 / p90 / p97 S | 0.67 / 0.83 / 0.94 | 0.77 / 0.86 / 0.92 | 0.55 / 0.66 / **0.71** |
| share of pixels S > 0.7 | 0.22 | **0.30** | **0.055** |
| share of pixels S < 0.15 (true neutrals) | 0.17 | **0.32** | 0.12 |
| colourfulness (Hasler-Suesstrunk) | 79 | **91** | 65 |
| mean V | 0.66 | 0.65 | 0.63 |

- He has **more near-neutral pixels AND far more fully saturated pixels** than we do. Ours sits in the middle: every colour is
  half-saturated and every neutral is half-tinted. The mean hides this; **the distribution is the style.**
- By hue (share / S / V of pixels with S > 0.25):
  - His red is S 0.74 at V 0.86; ours is 0.61 / 0.69.
  - His orange-amber is S 0.63; ours is 0.41.
  - Our "yellow" share was 0.14 vs his 0.04: a yellow-beige wash over walls and counter that he doesn't have.

## 135. Colour targets (build and check against these)
1. **Hero material colours are near full chroma**: S **0.80-0.92**, V 0.6-0.95. Measured in his shop:
   - shirt red **#EB2715** (h5 S0.91 V0.92)
   - hair **#A45915** (h28 S0.87)
   - wainscot wood **#C4761C** (h32 S0.86)
   - cork board **#D88921** (h34 S0.85)
   - counter front wood **#6E4217** (S0.79)
   - lamp shade emerald **#0B3E2A** (h156 S0.82 V0.24)

   In the kitchen (nzbk): wall yellow **#FCD95F** (S0.62 V0.99), lamp teal **#32A1AD** (S0.71).
2. **Walls are the one mid-chroma field**: S **0.55-0.62**. His shop wall is **#9FA94C** (h66, olive-lime, S0.55 V0.66), not
   a grey sage (ours was **#989467**, S0.32).
3. **Neutrals are truly neutral**: counter **#B2A8A1** (S0.10); white heads S **0.02-0.05** in daylight.
   - A neutral only takes colour from a light. Under a warm lamp the head goes cream **#FFEBD1** (S0.18) and the ceiling
     **#D5B88D** (S0.34), in the light's hue (h33-35), never a beige-grey of its own.
   - Daylight ceilings are cool lavender-white **#D5D2E3** (h250 S0.07).
4. **Hues lean warm-orange for warm materials**: wood, hair and cork sit at **h28-34**; reds at **h5** (orange-red, not
   pink-red; our #F04646 at h0 S0.71 reads as salmon).
5. **Darks stay coloured**: the lamp shade is S0.82 at V0.24. On the teal lamp, the shaded inside shifts toward blue AND gets
   more saturated (lit h185 S0.71 -> inside h198 S0.81). A shadow is a deeper, more saturated, slightly cooler version of
   the same colour, never grey.
6. Check these numbers on a still (caption band removed):
   - p90 S ≥ 0.80
   - share of pixels with S > 0.7 ≥ 0.20
   - share of pixels with S < 0.15 ≥ 0.15
   - colourfulness ≥ 78
   - mean V 0.63-0.68

## 136. What made ours muddy (each one measured or read from our code)
1. `grade()` multiplied **every pixel's S by 0.72**, so a 0.9 colour became 0.65. Our p97 S (0.71) ≈ 0.98 × 0.72 confirms it.
   **Never scale saturation globally.** If the frame mean is too high, cut the area of the saturated colour, not its chroma.
2. `grade()` lifted values with gamma 0.74, which raised dark saturated colours (lamp shade, lines, wood shadow) toward
   grey. **Darks stay dark**: no global lift; brightness comes from bright materials and light, not from a curve.
3. The warm hemisphere and point lights plus the additive pools **tinted the neutrals** (counter S0.23, ceiling S0.39 brown),
   so the share of true neutrals fell to 0.12. Light tints neutrals only near a lamp, and only in the lamp's hue.
4. The DOF pass mixed a **beige haze (#EDE6DA, up to 16 %)** into everything behind focus, which dropped the wall to S0.32. His
   distance haze is only in big exteriors (aerial perspective, 110); interiors keep full colour behind the subject.
5. The base materials were picked to look "tasteful": sage wall, salmon red, light brown hair. Start from the swatches in 135.

## 137. Specular dots on round objects
Round, hard props (cannonballs, bombs, helmet lamps, metal pans, glasses) carry **one crisp white specular dot or streak**
(lnYL 57.2, 60.2; nzbk 33-39). It is a clean shape with a hard edge, not a soft glow. Heads, cloth and wood get none.

## 138. The pendant lamp: two of his compared with ours
His shop lamp (ref-A 0-0.8 s) and his kitchen lamp (ref-C 13.6-15.2 s):
- **Hollow, with wall thickness.**
  - The shade is a thin shell: a small rounded cap on top, a shallow upper cone, a seam line, then a wider skirt flaring to
    the rim.
  - The **rim lip reads as a thick dark band** (~4-6 % of the shade width; shop lip #60422F, kitchen lip #221526), because
    the shell edge is seen with its thickness.
- **The camera is below the rim, so we look into it.**
  - The opening is an ellipse, minor/major about 0.47 at 0.0 s and 0.42 at 0.8 s in the shop. It changes with the camera, so
    it is real geometry, not a sprite.
  - In the shop we see **two ellipses**: the outer rim and the smaller inner top of the cavity.
- **Lit lamp (shop):**
  - The inner surface glows warm cream **#E4C696** (S0.34 V0.89), close to the lamp-lit ceiling.
  - The bulb is only a **soft white glow #F1ECEE with no outline**, sitting inside the cavity.
  - A dark maroon band **#4A312A** sits where the inner wall turns away.
- **Unlit or daylight lamp (kitchen):**
  - The bulb is a **flat pale disc #D2CFE2 with a thin dark outline, cut by the rim** (only the lower half shows).
  - The inside is the shade colour, darker and bluer.
- **Outside:** saturated cel bands with hard edges (kitchen teal: light band, mid band, dark inside), one dark outline around
  the silhouette and along both rim edges, and a thin dark cord (#1B0C08).
- **The bulb is never below the shade.** Ours was a closed side-view cone with an outlined bulb hanging out under it, no
  thickness, no interior, and a soft green halo on the wall. It read as a flat sticker.
- **Depth:**
  - The lamp hangs near the ceiling and near the camera, so it is a foreground layer above the subject.
  - The ceiling grid behind it converges strongly (a wide lens looking slightly up) and is lit warm around the lamp.
  - What makes the frame feel deep is the lamp's ellipse changing while the ceiling lines slide past.

## 139. How to build a lamp like his (three.js)
1. **Shell:** a lathe profile: cap knob -> upper cone -> seam step -> skirt -> rim. Use `LatheGeometry` with **DoubleSide**,
   and a second, slightly smaller lathe (offset ~4 % of the radius inward) so the rim shows a real lip. Put a ring (a torus or
   a thin lathe band) on the rim in the lip colour.
2. **Materials:**
   - Outside: the shade colour in 2-3 hard toon bands (a ramp texture), S ≥ 0.7.
   - Inside (BackSide), lit lamp: an unlit gradient from cream at the bulb to the lip colour at the rim.
   - Inside, unlit lamp: the shade colour darker, h +10-15 toward blue, S +0.1.
3. **Bulb:** lit = an additive soft sprite inside the cavity, with no outline. Unlit = a flat pale disc with a thin outline,
   placed so the rim hides its upper half.
4. **Outline:** a hull on the outer shell only; the screen-space line pass catches both rim edges.
5. **Placement and light:**
   - Place the lamp so the camera sees **up into it**: the rim plane above the camera, an ellipse ratio of 0.4-0.5 in the
     wide, near the ceiling and close to the lens, with the ceiling tiles behind it.
   - The lamp's light colours the ceiling around it (warm cream, S ~0.3) and its own inside. It does not tint the counter or
     the wall beyond a faint pool.

---

# Appendix A: half-second timelines (measured)

Generated by `timeline.py` from every frame of all six videos. Use these to match pacing exactly: where the camera
moves (`M`), where a dissolve happens (`D`), how fast the speech runs, and how warmth, brightness and saturation travel
through each video.

Columns: `t` start of the half second; `words` spoken words starting in it (`p` = a pause over 0.3 s after a word); `motion` mean frame-to-frame change (0-255, x10); `cam` = `M` a camera move is happening, `D` a dissolve, `.` hold/drift; `warm` (R-B)/(R+B) x100; `bright` mean value x100; `sat` mean saturation x100; `c/e` sharpness of the centre band vs the top+bottom bands.

## cashier / lottery (ref-A, 57.73 s)

| t | words | motion | cam | warm | bright | sat | c/e |
|---|---|---|---|---|---|---|---|
|  0.0 | 3 |    37 | . |  +28 |  58 |  49 | 10.3 |
|  0.5 | 1 |    40 | . |  +26 |  57 |  47 | 12.1 |
|  1.0 | 2 |   322 | M |  +17 |  55 |  37 |  4.0 |
|  1.5 | 0 |   185 | M |  +12 |  74 |  34 | 11.1 |
|  2.0 | 3 |   198 | M |  +13 |  81 |  40 |  5.4 |
|  2.5 | 2 |   267 | M |  +12 |  60 |  32 |  3.8 |
|  3.0 | 1 |    37 | . |  +15 |  60 |  33 |  4.9 |
|  3.5 | 2 |    60 | M |  +16 |  63 |  33 |  7.2 |
|  4.0 | 1 |   137 | M |  +20 |  65 |  38 |  2.9 |
|  4.5 | 1 |    56 | . |  +20 |  66 |  40 |  1.6 |
|  5.0 | 3 |    54 | . |  +20 |  67 |  39 |  3.2 |
|  5.5 | 2 |    43 | . |  +21 |  67 |  40 |  2.9 |
|  6.0 | 2 |    53 | . |  +22 |  61 |  45 |  3.7 |
|  6.5 | 1 |    22 | . |  +21 |  61 |  44 |  4.8 |
|  7.0 | 1p |    24 | . |  +21 |  62 |  44 |  4.7 |
|  7.5 | 3 |    15 | . |  +21 |  61 |  45 |  4.4 |
|  8.0 | 1 |    12 | . |  +21 |  61 |  45 |  4.6 |
|  8.5 | 2 |    53 | . |  +21 |  62 |  45 |  4.0 |
|  9.0 | 2 |    45 | . |  +19 |  61 |  44 |  2.0 |
|  9.5 | 2 |    19 | . |  +15 |  62 |  43 |  0.9 |
| 10.0 | 1 |    35 | . |  +15 |  62 |  41 |  0.7 |
| 10.5 | 2 |    66 | . |  +23 |  53 |  44 |  1.1 |
| 11.0 | 2 |    71 | . |  +23 |  53 |  46 |  1.8 |
| 11.5 | 1 |   133 | M |  +25 |  52 |  47 |  2.5 |
| 12.0 | 3 |   155 | M |  +31 |  50 |  48 |  2.3 |
| 12.5 | 1 |    12 | . |   -0 |  32 |  41 | 83.1 |
| 13.0 | 3 |    27 | . |   +0 |  31 |  41 | 111.3 |
| 13.5 | 2 |    43 | D |   -1 |  32 |  40 | 185.0 |
| 14.0 | 2 |   160 | D |   +9 |  49 |  32 |  2.8 |
| 14.5 | 2 |    23 | . |  +17 |  59 |  37 |  4.4 |
| 15.0 | 2 |    51 | . |  +18 |  60 |  38 |  4.5 |
| 15.5 | 3 |    73 | M |  +19 |  62 |  37 |  3.0 |
| 16.0 | 2 |   318 | M |  +19 |  61 |  39 |  2.5 |
| 16.5 | 1 |    50 | M |  +28 |  63 |  49 |  2.3 |
| 17.0 | 2 |    77 | D |  -28 |  65 |  62 |  8.3 |
| 17.5 | 1 |    70 | . |  -36 |  68 |  70 | 116.1 |
| 18.0 | 2 |    58 | . |  -38 |  69 |  70 | 56.2 |
| 18.5 | 2 |    83 | M |  -35 |  71 |  68 | 10.5 |
| 19.0 | 2 |   110 | M |  -21 |  73 |  57 |  4.1 |
| 19.5 | 1 |    58 | . |  -20 |  76 |  57 |  5.8 |
| 20.0 | 3 |    30 | . |  -18 |  76 |  56 | 10.6 |
| 20.5 | 3 |    57 | M |  -14 |  76 |  53 | 20.5 |
| 21.0 | 0 |    85 | M |  -26 |  75 |  65 |  2.8 |
| 21.5 | 3 |   163 | M |  -29 |  74 |  64 | 11.8 |
| 22.0 | 2 |    79 | M |  -49 |  75 |  69 | 106.5 |
| 22.5 | 2 |    39 | D |  -52 |  75 |  70 | 146.5 |
| 23.0 | 2 |   160 | D |  +14 |  76 |  33 |  1.5 |
| 23.5 | 2 |   102 | D |   +5 |  75 |  37 |  2.1 |
| 24.0 | 2 |   110 | M |   +7 |  70 |  51 |  4.0 |
| 24.5 | 2 |    29 | . |   +6 |  67 |  42 |  4.7 |
| 25.0 | 2 |   116 | M |  +13 |  70 |  46 |  8.9 |
| 25.5 | 1 |    76 | D |  -13 |  60 |  48 |  3.2 |
| 26.0 | 2 |    26 | . |  -26 |  61 |  62 |  2.8 |
| 26.5 | 3 |    15 | . |  -26 |  61 |  62 |  3.0 |
| 27.0 | 0 |     9 | . |  -25 |  61 |  61 |  2.9 |
| 27.5 | 4 |   177 | M |  -25 |  63 |  60 |  3.5 |
| 28.0 | 3 |   141 | M |  -15 |  74 |  41 |  6.2 |
| 28.5 | 1 |    10 | . |  -16 |  74 |  40 |  6.1 |
| 29.0 | 2 |     5 | . |  -15 |  74 |  40 |  6.1 |
| 29.5 | 0p |    21 | . |  -16 |  74 |  40 |  5.5 |
| 30.0 | 1 |    34 | . |  -16 |  74 |  40 |  5.2 |
| 30.5 | 0p |    32 | . |  -16 |  73 |  41 |  4.5 |
| 31.0 | 1 |    20 | . |  -16 |  73 |  41 |  4.0 |
| 31.5 | 3 |    12 | . |  -16 |  73 |  42 |  4.0 |
| 32.0 | 1 |    16 | . |  -15 |  73 |  41 |  4.0 |
| 32.5 | 2 |    70 | . |   +4 |  73 |  38 |  2.8 |
| 33.0 | 1 |    53 | . |   +7 |  73 |  42 |  1.9 |
| 33.5 | 2 |    51 | . |   +9 |  74 |  44 |  1.5 |
| 34.0 | 1 |    44 | . |   +9 |  75 |  43 |  1.7 |
| 34.5 | 2 |    70 | . |   +9 |  75 |  42 |  2.5 |
| 35.0 | 2 |    50 | . |  +10 |  76 |  41 |  2.8 |
| 35.5 | 0 |    57 | . |  +11 |  77 |  41 |  2.8 |
| 36.0 | 2 |    61 | . |  +11 |  79 |  40 |  2.5 |
| 36.5 | 2 |    53 | . |  +11 |  80 |  37 |  2.6 |
| 37.0 | 1 |    37 | . |  +11 |  80 |  36 |  2.7 |
| 37.5 | 3 |    23 | . |  +11 |  80 |  36 |  2.6 |
| 38.0 | 3 |    18 | . |  +11 |  80 |  36 |  3.0 |
| 38.5 | 1 |    15 | . |  +11 |  80 |  36 |  3.1 |
| 39.0 | 2 |    19 | . |  +11 |  80 |  36 |  3.3 |
| 39.5 | 2 |    27 | . |  +11 |  80 |  35 |  3.4 |
| 40.0 | 2 |    18 | . |  +10 |  79 |  35 |  3.8 |
| 40.5 | 3 |    10 | . |  +10 |  79 |  35 |  4.0 |
| 41.0 | 3 |    11 | . |  +10 |  79 |  35 |  4.2 |
| 41.5 | 1 |    14 | . |   +9 |  78 |  34 |  4.5 |
| 42.0 | 2 |    15 | . |   +9 |  78 |  34 |  4.6 |
| 42.5 | 2 |    16 | . |   +9 |  78 |  34 |  4.5 |
| 43.0 | 0p |    15 | . |   +9 |  77 |  34 |  5.0 |
| 43.5 | 2 |   205 | M |   +3 |  73 |  35 |  4.9 |
| 44.0 | 3 |   127 | M |   -0 |  62 |  35 |  3.3 |
| 44.5 | 0 |   159 | M |   +4 |  64 |  33 |  2.6 |
| 45.0 | 2 |   335 | M |   -9 |  66 |  38 |  1.4 |
| 45.5 | 2 |   109 | M |  -26 |  74 |  47 |  3.0 |
| 46.0 | 1 |    11 | . |  -26 |  75 |  48 |  2.3 |
| 46.5 | 3 |    13 | . |  -26 |  75 |  48 |  2.4 |
| 47.0 | 1 |   118 | M |  -26 |  76 |  48 |  2.7 |
| 47.5 | 2 |   206 | M |  -10 |  68 |  37 |  2.4 |
| 48.0 | 2 |    15 | . |  -11 |  67 |  37 |  5.7 |
| 48.5 | 2 |   233 | M |  -10 |  66 |  37 |  2.0 |
| 49.0 | 1 |   334 | M |  -19 |  67 |  42 |  1.6 |
| 49.5 | 1 |   280 | M |  -39 |  81 |  56 |  1.4 |
| 50.0 | 2 |   100 | M |  -42 |  87 |  60 |  4.4 |
| 50.5 | 0p |    40 | . |  -41 |  86 |  59 |  3.7 |
| 51.0 | 2 |    67 | . |  -31 |  72 |  49 |  3.2 |
| 51.5 | 1 |     9 | . |  +26 |  44 |  51 |  1.2 |
| 52.0 | 2 |    41 | . |  +27 |  44 |  51 |  1.3 |
| 52.5 | 1 |   113 | M |   +8 |  40 |  48 |  3.5 |
| 53.0 | 2 |   209 | M |   -2 |  42 |  43 |  3.4 |
| 53.5 | 2 |   214 | M |   -5 |  42 |  42 |  3.0 |
| 54.0 | 1 |   108 | M |   -2 |  40 |  44 |  2.2 |
| 54.5 | 1 |   245 | M |  -21 |  63 |  55 |  2.0 |
| 55.0 | 2 |    72 | M |  -33 |  63 |  64 | 19.3 |
| 55.5 | 1 |    74 | D |  -15 |  57 |  45 | 10.8 |
| 56.0 | 1 |    42 | . |  +37 |  59 |  60 |  3.7 |
| 56.5 | 3 |    91 | M |  +37 |  59 |  59 |  4.4 |
| 57.0 | 0 |   112 | M |  +35 |  55 |  58 |  5.1 |

## Japan / career room (ref-B, 60.5 s)

| t | words | motion | cam | warm | bright | sat | c/e |
|---|---|---|---|---|---|---|---|
|  0.0 | 2 |   175 | M |  -15 |  51 |  58 | 20.5 |
|  0.5 | 1 |   104 | M |   -7 |  51 |  58 |  5.9 |
|  1.0 | 3 |   273 | M |  -35 |  73 |  66 |  0.2 |
|  1.5 | 1 |    75 | . |  -39 |  77 |  65 |  7.2 |
|  2.0 | 2 |   273 | M |  -19 |  62 |  61 |  0.5 |
|  2.5 | 1 |   178 | M |  +15 |  44 |  52 |  2.9 |
|  3.0 | 2 |    92 | M |  +25 |  50 |  56 |  9.0 |
|  3.5 | 1 |    75 | . |  +31 |  49 |  59 |  7.8 |
|  4.0 | 1 |    79 | . |  +33 |  50 |  60 |  4.7 |
|  4.5 | 2 |   201 | D |   -9 |  74 |  27 |  6.7 |
|  5.0 | 1 |   170 | . |  -11 |  81 |  29 | 11.3 |
|  5.5 | 3 |   168 | . |   -7 |  83 |  20 |  3.2 |
|  6.0 | 2 |   196 | M |  -12 |  86 |  28 |  7.8 |
|  6.5 | 2 |   186 | M |  -18 |  84 |  32 | 138.6 |
|  7.0 | 2 |   181 | M |  -14 |  84 |  27 |  2.7 |
|  7.5 | 2 |   118 | . |  -14 |  81 |  33 |  3.0 |
|  8.0 | 1 |   147 | . |   -9 |  69 |  35 | 35.5 |
|  8.5 | 2 |   139 | . |   -5 |  69 |  33 |  4.1 |
|  9.0 | 2 |   103 | . |   -3 |  68 |  32 |  1.4 |
|  9.5 | 2 |   109 | . |   +0 |  70 |  29 | 201.6 |
| 10.0 | 2 |   216 | M |  +12 |  67 |  43 |  1.8 |
| 10.5 | 4 |   173 | M |  +12 |  67 |  44 |  0.9 |
| 11.0 | 1 |   102 | . |   +3 |  68 |  39 |  1.2 |
| 11.5 | 2 |    53 | . |   -1 |  68 |  40 |  2.3 |
| 12.0 | 3 |    69 | . |   -2 |  68 |  40 |  3.7 |
| 12.5 | 3 |    93 | . |   -3 |  68 |  40 |  4.2 |
| 13.0 | 0p |    55 | . |   -4 |  67 |  39 |  4.5 |
| 13.5 | 3 |    60 | . |   -9 |  66 |  36 |  6.3 |
| 14.0 | 1 |    28 | . |  -16 |  71 |  40 | 10.0 |
| 14.5 | 2 |    54 | . |  -16 |  72 |  40 | 10.2 |
| 15.0 | 2 |    99 | . |  -15 |  73 |  40 |  6.4 |
| 15.5 | 0 |    43 | . |  -12 |  69 |  40 |  6.7 |
| 16.0 | 3 |    92 | . |  -11 |  65 |  30 |  2.9 |
| 16.5 | 2 |    40 | . |  -10 |  65 |  32 |  2.3 |
| 17.0 | 2 |    52 | . |  -10 |  64 |  32 |  3.4 |
| 17.5 | 1p |    38 | . |  -16 |  70 |  37 | 10.8 |
| 18.0 | 1 |    78 | . |  -15 |  70 |  35 |  7.0 |
| 18.5 | 3 |    98 | . |   -8 |  74 |  32 |  4.5 |
| 19.0 | 2 |    91 | . |   -5 |  68 |  28 |  3.9 |
| 19.5 | 1 |    35 | . |   -5 |  63 |  34 |  3.8 |
| 20.0 | 1p |    69 | . |  -13 |  72 |  39 |  9.1 |
| 20.5 | 2 |    54 | . |  -13 |  73 |  40 |  7.3 |
| 21.0 | 0p |    78 | . |  -11 |  72 |  40 |  3.7 |
| 21.5 | 2 |    84 | . |  -17 |  84 |  35 | 50.8 |
| 22.0 | 1 |    83 | . |  -13 |  82 |  28 |  6.0 |
| 22.5 | 2 |   107 | . |  -16 |  83 |  33 |  9.4 |
| 23.0 | 1 |    98 | . |  -17 |  82 |  36 | 22.6 |
| 23.5 | 3 |   144 | M |  -14 |  81 |  34 | 13.1 |
| 24.0 | 0 |   229 | M |  -13 |  78 |  34 |  7.3 |
| 24.5 | 3 |   146 | M |   -1 |  78 |  11 |  1.9 |
| 25.0 | 1 |   185 | M |   -2 |  93 |   5 |  1.9 |
| 25.5 | 3 |   154 | M |   +2 |  77 |  30 |  3.4 |
| 26.0 | 2 |   239 | M |   +2 |  73 |  34 |  6.5 |
| 26.5 | 2 |   211 | M |  -10 |  81 |  37 | 58.2 |
| 27.0 | 1 |    61 | . |  -14 |  85 |  36 | 46.6 |
| 27.5 | 2 |    17 | . |  -14 |  85 |  36 | 39.7 |
| 28.0 | 2 |    14 | . |  -14 |  85 |  36 | 39.4 |
| 28.5 | 1 |   108 | D |   +6 |  70 |  31 | 41.0 |
| 29.0 | 2 |   176 | M |  +30 |  66 |  50 | 43.8 |
| 29.5 | 2 |   179 | M |  +13 |  66 |  53 |  8.7 |
| 30.0 | 3 |    55 | . |  +11 |  66 |  44 |  7.3 |
| 30.5 | 3 |    75 | . |   +9 |  67 |  44 |  9.9 |
| 31.0 | 2 |    71 | . |   +9 |  69 |  40 |  7.5 |
| 31.5 | 2 |    51 | . |   +8 |  72 |  38 |  6.1 |
| 32.0 | 2 |    43 | . |   +8 |  74 |  36 |  5.1 |
| 32.5 | 2 |    49 | . |   +8 |  74 |  35 |  5.2 |
| 33.0 | 1 |    65 | . |   +8 |  73 |  35 |  5.2 |
| 33.5 | 3 |    31 | . |  +26 |  61 |  46 |  9.1 |
| 34.0 | 3 |    48 | . |  +26 |  60 |  46 |  6.6 |
| 34.5 | 3 |    82 | . |  +25 |  61 |  46 |  4.2 |
| 35.0 | 2 |    56 | . |  +25 |  62 |  45 |  6.6 |
| 35.5 | 1 |    93 | . |  +24 |  61 |  45 |  9.1 |
| 36.0 | 3 |   145 | . |  +22 |  62 |  41 |  6.8 |
| 36.5 | 2 |   147 | . |  -36 |  56 |  68 |  8.1 |
| 37.0 | 1 |   139 | . |  -62 |  60 |  80 |  1.1 |
| 37.5 | 2 |    30 | . |  -63 |  63 |  81 |  1.3 |
| 38.0 | 2 |    23 | . |  -65 |  63 |  82 |  1.3 |
| 38.5 | 3 |    57 | . |  -64 |  62 |  81 |  1.3 |
| 39.0 | 4 |    82 | . |  -60 |  61 |  79 |  1.0 |
| 39.5 | 1 |    50 | . |  -12 |  66 |  41 | 14.1 |
| 40.0 | 1 |    26 | . |   -8 |  67 |  41 | 15.3 |
| 40.5 | 3 |    85 | . |   -0 |  64 |  38 |  9.9 |
| 41.0 | 3 |   116 | . |   +9 |  59 |  35 |  4.5 |
| 41.5 | 2 |    56 | . |   -4 |  55 |  33 |  2.7 |
| 42.0 | 2 |    18 | . |   -7 |  54 |  34 |  2.8 |
| 42.5 | 2 |    47 | . |  -26 |  73 |  43 |  3.2 |
| 43.0 | 0p |    29 | . |  -27 |  75 |  45 |  5.0 |
| 43.5 | 3 |    62 | . |  -27 |  74 |  46 |  6.7 |
| 44.0 | 2 |   172 | M |  -28 |  75 |  47 |  5.0 |
| 44.5 | 1 |   154 | M |  -33 |  67 |  52 | 22.8 |
| 45.0 | 2 |    57 | . |  -33 |  65 |  50 |  1.8 |
| 45.5 | 3 |    87 | . |  -34 |  62 |  54 |  1.7 |
| 46.0 | 2 |    84 | . |  -31 |  62 |  51 |  1.9 |
| 46.5 | 2 |    46 | . |  -30 |  63 |  50 |  1.7 |
| 47.0 | 0 |    51 | . |  -29 |  64 |  49 |  1.4 |
| 47.5 | 2 |   148 | . |  -15 |  82 |  35 | 111.7 |
| 48.0 | 3 |   138 | . |  -13 |  82 |  30 | 32.6 |
| 48.5 | 3 |   160 | . |  -11 |  84 |  24 |  3.8 |
| 49.0 | 2 |   133 | D |   -8 |  85 |  18 |  1.8 |
| 49.5 | 1 |   106 | D |  -46 |  67 |  69 | 244.0 |
| 50.0 | 2 |    91 | . |  -35 |  64 |  64 | 150.9 |
| 50.5 | 2 |   113 | . |   -8 |  66 |  47 | 24.7 |
| 51.0 | 1 |    82 | . |   +4 |  70 |  34 |  2.0 |
| 51.5 | 1 |   125 | . |   -1 |  56 |  46 |  1.8 |
| 52.0 | 2 |   157 | . |   -8 |  58 |  53 |  9.7 |
| 52.5 | 2 |    70 | . |  -29 |  62 |  61 | 51.5 |
| 53.0 | 2 |    68 | . |  -27 |  63 |  59 | 82.1 |
| 53.5 | 2 |    71 | . |  -21 |  62 |  56 | 26.3 |
| 54.0 | 2 |    74 | . |   -6 |  63 |  43 | 13.0 |
| 54.5 | 1 |    27 | . |   -3 |  63 |  40 |  8.8 |
| 55.0 | 1 |    95 | . |  -11 |  62 |  47 | 13.7 |
| 55.5 | 2 |    62 | . |  -32 |  62 |  62 | 257.8 |
| 56.0 | 3 |    23 | . |  -39 |  63 |  67 | 286.0 |
| 56.5 | 2 |    28 | . |  -38 |  62 |  66 | 252.6 |
| 57.0 | 0 |   108 | . |  -33 |  62 |  62 | 297.5 |
| 57.5 | 3 |   112 | . |  -34 |  63 |  64 | 471.3 |
| 58.0 | 2 |    60 | . |  -36 |  63 |  66 | 38.7 |
| 58.5 | 1 |   124 | . |  -27 |  60 |  57 | 48.6 |
| 59.0 | 2 |   126 | . |  -33 |  63 |  53 |  5.3 |
| 59.5 | 1 |    74 | . |  -36 |  62 |  56 |  6.2 |
| 60.0 | 0 |    26 | . |  -30 |  61 |  52 |  2.6 |

## burglar / furniture (ref-C, 58.37 s)

| t | words | motion | cam | warm | bright | sat | c/e |
|---|---|---|---|---|---|---|---|
|  0.0 | 3 |    67 | . |  -48 |  60 |  70 | 23.8 |
|  0.5 | 2 |    80 | . |  -49 |  57 |  72 | 30.3 |
|  1.0 | 2 |    62 | . |  -51 |  53 |  74 | 59.6 |
|  1.5 | 1 |    86 | . |  -45 |  61 |  61 | 40.5 |
|  2.0 | 2 |    74 | . |  -34 |  71 |  55 | 10.4 |
|  2.5 | 2 |   112 | D |  -27 |  57 |  51 |  3.5 |
|  3.0 | 1 |    38 | . |  -24 |  59 |  64 |  5.7 |
|  3.5 | 2 |    65 | . |  -24 |  59 |  64 | 11.2 |
|  4.0 | 1 |   190 | M |  -29 |  53 |  66 |  1.3 |
|  4.5 | 3 |    90 | M |   -4 |  61 |  53 | 32.8 |
|  5.0 | 2 |    25 | . |   +5 |  63 |  48 | 19.2 |
|  5.5 | 1 |    60 | . |   +5 |  71 |  27 |  8.6 |
|  6.0 | 2 |    34 | . |   +6 |  76 |  27 |  8.4 |
|  6.5 | 1 |    71 | . |   +7 |  76 |  27 |  8.3 |
|  7.0 | 1 |   119 | . |  +10 |  75 |  30 |  6.6 |
|  7.5 | 2 |   137 | . |  +11 |  73 |  34 |  1.9 |
|  8.0 | 1 |    78 | . |  +13 |  72 |  34 |  4.4 |
|  8.5 | 4 |    38 | . |  +13 |  72 |  34 |  5.3 |
|  9.0 | 3 |    53 | . |   -9 |  78 |  38 |  6.0 |
|  9.5 | 2 |    45 | . |   -9 |  79 |  38 |  5.8 |
| 10.0 | 2 |    39 | . |   -9 |  79 |  38 |  5.7 |
| 10.5 | 2 |    40 | . |   -8 |  79 |  37 |  6.4 |
| 11.0 | 2 |    95 | . |   -5 |  81 |  35 |  5.3 |
| 11.5 | 3 |   125 | . |   -2 |  81 |  36 |  3.5 |
| 12.0 | 2 |   108 | . |   +0 |  82 |  38 |  2.3 |
| 12.5 | 2 |    76 | . |   +3 |  82 |  40 |  2.7 |
| 13.0 | 2 |    40 | . |   +4 |  81 |  40 |  2.8 |
| 13.5 | 1 |    22 | . |   +4 |  82 |  41 |  2.8 |
| 14.0 | 2 |   103 | . |   +4 |  82 |  41 |  2.5 |
| 14.5 | 2 |    72 | . |   +5 |  81 |  40 |  3.1 |
| 15.0 | 3 |    71 | . |   +2 |  80 |  42 |  2.8 |
| 15.5 | 2 |    26 | . |  +11 |  87 |  24 |  7.5 |
| 16.0 | 2 |    28 | . |  +11 |  86 |  24 |  7.3 |
| 16.5 | 3 |    27 | . |  +11 |  86 |  24 |  6.8 |
| 17.0 | 2 |   137 | M |  +10 |  86 |  24 |  7.2 |
| 17.5 | 0p |   205 | M |   +9 |  80 |  29 | 11.2 |
| 18.0 | 2 |    87 | . |   +3 |  77 |  29 | 12.1 |
| 18.5 | 1 |    27 | . |   +3 |  77 |  29 |  9.5 |
| 19.0 | 3 |    40 | . |   +2 |  76 |  30 | 10.3 |
| 19.5 | 2 |    39 | . |   +3 |  77 |  30 |  7.4 |
| 20.0 | 1 |    34 | . |   +3 |  77 |  29 |  6.0 |
| 20.5 | 1 |    10 | . |   +3 |  76 |  30 |  5.6 |
| 21.0 | 2 |    79 | . |   +3 |  75 |  30 |  5.8 |
| 21.5 | 1 |   109 | . |   +3 |  74 |  29 | 10.7 |
| 22.0 | 4 |    28 | . |  +20 |  40 |  49 |  3.2 |
| 22.5 | 2 |    17 | . |  +21 |  40 |  49 |  4.5 |
| 23.0 | 2 |    61 | . |  +19 |  42 |  40 |  8.5 |
| 23.5 | 2 |    15 | . |  +13 |  72 |  47 | 65.2 |
| 24.0 | 1 |    13 | . |  +13 |  72 |  47 | 62.7 |
| 24.5 | 4 |    17 | . |   +8 |  69 |  47 | 76.4 |
| 25.0 | 2 |    63 | . |  -51 |  59 |  70 | 134.2 |
| 25.5 | 1 |    78 | . |   -3 |  76 |  36 |  2.2 |
| 26.0 | 1 |     7 | . |   -0 |  80 |  38 |  1.9 |
| 26.5 | 2 |    17 | . |   -0 |  80 |  38 |  1.8 |
| 27.0 | 2 |    54 | . |   +2 |  80 |  36 |  1.8 |
| 27.5 | 2 |     8 | . |   +2 |  81 |  38 |  1.8 |
| 28.0 | 1 |    11 | . |   +2 |  81 |  38 |  1.8 |
| 28.5 | 2 |    73 | . |   +8 |  80 |  32 |  1.9 |
| 29.0 | 3 |   104 | . |   +4 |  82 |  37 |  2.3 |
| 29.5 | 2 |   139 | . |   +5 |  79 |  44 |  3.5 |
| 30.0 | 2 |    45 | . |   +9 |  77 |  50 |  5.4 |
| 30.5 | 2 |    79 | . |  -28 |  71 |  49 | 15.0 |
| 31.0 | 2 |    22 | . |  -66 |  79 |  80 | 37.2 |
| 31.5 | 1 |    16 | . |  -66 |  79 |  79 | 58.9 |
| 32.0 | 3 |    63 | . |  -64 |  79 |  79 | 35.4 |
| 32.5 | 1 |    87 | . |  -50 |  87 |  79 | 32.9 |
| 33.0 | 2 |    44 | . |  -43 |  82 |  76 | 12.4 |
| 33.5 | 2 |    75 | . |  -41 |  83 |  75 | 15.4 |
| 34.0 | 2 |   115 | . |   -1 |  83 |  79 |  6.5 |
| 34.5 | 2 |   103 | . |  +32 |  83 |  77 | 16.2 |
| 35.0 | 2 |   217 | M |   +9 |  59 |  50 |  1.1 |
| 35.5 | 4 |   177 | M |   -0 |  57 |  60 |  0.9 |
| 36.0 | 3 |    91 | . |  -11 |  61 |  57 |  5.0 |
| 36.5 | 1 |    40 | . |  -16 |  60 |  58 | 10.2 |
| 37.0 | 2 |    35 | . |  -18 |  59 |  58 |  6.4 |
| 37.5 | 2 |    35 | . |  -20 |  58 |  58 |  5.4 |
| 38.0 | 1 |    53 | . |  -19 |  59 |  58 |  5.2 |
| 38.5 | 2 |    46 | . |  -20 |  58 |  58 |  5.0 |
| 39.0 | 3 |   119 | D |   -1 |  67 |  47 |  3.0 |
| 39.5 | 3 |   157 | M |   +5 |  70 |  47 |  1.5 |
| 40.0 | 2 |   288 | M |   +4 |  66 |  54 |  0.4 |
| 40.5 | 2 |   175 | M |  +18 |  66 |  55 |  0.4 |
| 41.0 | 2 |    28 | . |  +18 |  71 |  43 |  3.9 |
| 41.5 | 2 |    71 | . |  +18 |  70 |  44 |  6.2 |
| 42.0 | 3 |   133 | M |  +13 |  68 |  41 | 11.8 |
| 42.5 | 2 |    69 | . |   +9 |  67 |  39 | 11.1 |
| 43.0 | 3 |   190 | M |  +12 |  69 |  49 |  7.8 |
| 43.5 | 3 |   222 | M |  +14 |  79 |  41 |  0.7 |
| 44.0 | 3 |   160 | M |  +13 |  79 |  33 |  3.8 |
| 44.5 | 2 |    54 | . |  +12 |  77 |  32 |  5.7 |
| 45.0 | 1 |    69 | . |  +13 |  78 |  32 |  5.2 |
| 45.5 | 2 |   135 | . |  +16 |  79 |  34 |  4.7 |
| 46.0 | 3 |   136 | . |  +15 |  81 |  35 | 10.6 |
| 46.5 | 1 |    98 | . |  +14 |  81 |  35 | 27.3 |
| 47.0 | 3 |    76 | . |  +11 |  82 |  31 | 49.5 |
| 47.5 | 2 |    59 | . |  +11 |  82 |  32 | 30.8 |
| 48.0 | 3 |    71 | . |   +8 |  71 |  27 |  5.5 |
| 48.5 | 2 |   102 | . |   +6 |  68 |  36 |  4.3 |
| 49.0 | 3 |   164 | M |   +8 |  68 |  39 |  6.7 |
| 49.5 | 2 |   179 | M |  +13 |  71 |  41 |  5.1 |
| 50.0 | 2 |   120 | . |  +18 |  75 |  41 |  3.6 |
| 50.5 | 1 |    59 | . |  +20 |  74 |  42 |  3.1 |
| 51.0 | 2 |    44 | . |  +22 |  74 |  43 |  3.6 |
| 51.5 | 2 |   153 | M |  +20 |  73 |  42 |  3.5 |
| 52.0 | 3 |   293 | M |   +7 |  78 |  32 |  1.0 |
| 52.5 | 2 |   120 | M |   +5 |  75 |  41 |  7.4 |
| 53.0 | 2 |   261 | M |  -10 |  69 |  47 |  6.4 |
| 53.5 | 2 |   174 | M |   -3 |  71 |  42 |  2.9 |
| 54.0 | 1 |   102 | M |   -2 |  71 |  39 |  6.5 |
| 54.5 | 3 |    74 | M |  -11 |  66 |  34 |  8.6 |
| 55.0 | 3 |   273 | M |   -6 |  68 |  42 |  3.3 |
| 55.5 | 2 |   150 | M |  -17 |  65 |  48 | 24.6 |
| 56.0 | 1 |   132 | . |  -20 |  67 |  50 | 20.3 |
| 56.5 | 3 |   137 | . |  -12 |  60 |  51 | 13.5 |
| 57.0 | 3 |    66 | . |   -2 |  52 |  54 |  8.4 |
| 57.5 | 2 |    19 | . |   +1 |  50 |  55 |  6.1 |
| 58.0 | 0 |    31 | . |   +1 |  50 |  55 |  5.5 |

## jar / earthquake (ref-D, 64.83 s)

| t | words | motion | cam | warm | bright | sat | c/e |
|---|---|---|---|---|---|---|---|
|  0.0 | 4 |    26 | . |   +5 |  51 |  29 |  5.3 |
|  0.5 | 1 |   165 | M |   +5 |  52 |  29 | 18.6 |
|  1.0 | 3 |    12 | . |  +19 |  59 |  33 |  4.5 |
|  1.5 | 1 |    85 | M |  +21 |  61 |  35 |  4.3 |
|  2.0 | 2 |   263 | M |  +15 |  48 |  33 |  0.9 |
|  2.5 | 2 |    43 | M |  +15 |  51 |  34 |  8.8 |
|  3.0 | 2 |    57 | . |   +2 |  47 |  27 |  5.8 |
|  3.5 | 2 |    42 | . |   -0 |  38 |  27 | 10.5 |
|  4.0 | 1 |    35 | . |   +3 |  50 |  27 |  5.5 |
|  4.5 | 1p |   172 | M |   +3 |  51 |  27 |  6.0 |
|  5.0 | 2 |   220 | M |   +4 |  47 |  26 | 11.8 |
|  5.5 | 1 |   143 | M |  +25 |  48 |  53 |  2.1 |
|  6.0 | 2 |   223 | M |  +24 |  48 |  54 |  2.4 |
|  6.5 | 1 |   113 | M |  +19 |  49 |  48 |  2.5 |
|  7.0 | 2 |    40 | . |  +18 |  49 |  46 |  2.4 |
|  7.5 | 3 |    66 | . |  +11 |  39 |  32 |  3.7 |
|  8.0 | 1 |    74 | . |  +14 |  38 |  35 |  3.7 |
|  8.5 | 1 |    96 | . |  +15 |  38 |  37 |  4.4 |
|  9.0 | 2 |   106 | . |  +13 |  37 |  37 |  6.7 |
|  9.5 | 1 |    98 | . |  +15 |  38 |  38 |  6.7 |
| 10.0 | 2 |    63 | . |  +16 |  38 |  37 |  6.6 |
| 10.5 | 1 |    37 | . |  +16 |  38 |  36 |  6.2 |
| 11.0 | 2 |    95 | . |  +14 |  39 |  35 |  4.0 |
| 11.5 | 2 |    94 | . |  +10 |  39 |  31 |  1.4 |
| 12.0 | 2 |    81 | . |   +7 |  38 |  30 |  1.3 |
| 12.5 | 2 |   114 | . |   +4 |  35 |  33 |  0.5 |
| 13.0 | 1 |    60 | D |   -1 |  31 |  36 |  1.8 |
| 13.5 | 3 |   144 | D |   -4 |  70 |  30 |  3.3 |
| 14.0 | 2 |   160 | M |   -4 |  73 |  25 |  1.9 |
| 14.5 | 2 |   147 | M |   +0 |  70 |  20 |  1.7 |
| 15.0 | 2 |    66 | . |   +3 |  67 |  18 |  2.2 |
| 15.5 | 3 |    94 | . |   +2 |  68 |  18 |  2.0 |
| 16.0 | 1 |   144 | M |   -0 |  70 |  19 |  1.8 |
| 16.5 | 3 |   140 | M |   -3 |  73 |  25 |  2.4 |
| 17.0 | 2 |    79 | . |   -3 |  74 |  28 |  3.2 |
| 17.5 | 1 |    76 | . |   -4 |  73 |  28 |  3.1 |
| 18.0 | 1 |    62 | . |   +4 |  47 |  30 |  3.0 |
| 18.5 | 3 |    43 | . |   +2 |  44 |  30 |  3.9 |
| 19.0 | 2 |    36 | . |   +3 |  47 |  30 |  3.8 |
| 19.5 | 1 |   182 | M |   +4 |  47 |  30 |  4.1 |
| 20.0 | 2 |   182 | M |   -6 |  35 |  26 |  3.9 |
| 20.5 | 2 |   110 | M |  +25 |  41 |  48 | 14.3 |
| 21.0 | 3 |   258 | M |  +19 |  54 |  43 |  1.5 |
| 21.5 | 1 |    84 | M |  +36 |  50 |  59 |  1.8 |
| 22.0 | 1p |    70 | . |  +37 |  50 |  59 |  1.8 |
| 22.5 | 2 |    62 | . |  +21 |  47 |  38 |  5.9 |
| 23.0 | 2 |    71 | . |  +20 |  46 |  37 |  7.0 |
| 23.5 | 0 |    46 | . |  +19 |  44 |  36 |  9.2 |
| 24.0 | 2 |    91 | . |  +31 |  41 |  57 |  3.7 |
| 24.5 | 3 |    82 | . |  +33 |  42 |  59 |  2.4 |
| 25.0 | 2 |    40 | . |  +33 |  45 |  58 |  2.1 |
| 25.5 | 1 |    15 | . |  +33 |  45 |  58 |  2.0 |
| 26.0 | 1 |    16 | . |  +33 |  45 |  58 |  2.0 |
| 26.5 | 2 |    68 | . |  +33 |  45 |  58 |  2.0 |
| 27.0 | 2 |   107 | . |  +17 |  68 |  33 |  2.6 |
| 27.5 | 2 |    60 | . |  +15 |  69 |  34 |  2.5 |
| 28.0 | 3 |    58 | . |  +15 |  70 |  34 |  2.7 |
| 28.5 | 1 |    59 | . |  +16 |  71 |  33 |  1.9 |
| 29.0 | 2 |    47 | . |  +17 |  70 |  34 |  2.1 |
| 29.5 | 2 |    62 | . |  +25 |  68 |  40 |  5.8 |
| 30.0 | 3 |    27 | . |  +24 |  66 |  49 | 57.5 |
| 30.5 | 2 |    31 | . |  +24 |  68 |  49 | 40.0 |
| 31.0 | 2 |    27 | . |  +24 |  72 |  47 | 22.3 |
| 31.5 | 2 |    51 | . |  +26 |  76 |  46 | 10.7 |
| 32.0 | 2 |    25 | . |  +34 |  67 |  52 |  2.7 |
| 32.5 | 1 |    30 | . |  +34 |  67 |  52 |  2.7 |
| 33.0 | 2 |    70 | . |  -35 |  63 |  55 |  3.2 |
| 33.5 | 1 |   134 | M |  -35 |  62 |  56 |  3.3 |
| 34.0 | 2 |   149 | M |  -36 |  57 |  58 |  3.9 |
| 34.5 | 2 |    86 | . |  -38 |  57 |  59 |  5.3 |
| 35.0 | 0 |    93 | . |  -42 |  59 |  62 |  5.9 |
| 35.5 | 3 |   112 | . |  -49 |  61 |  68 |  5.5 |
| 36.0 | 2 |    57 | . |  -49 |  59 |  69 |  4.3 |
| 36.5 | 0p |    13 | . |  -50 |  59 |  69 |  3.6 |
| 37.0 | 3 |    56 | . |  -32 |  52 |  51 |  2.1 |
| 37.5 | 3 |    58 | . |  -14 |  48 |  43 |  1.4 |
| 38.0 | 1 |    70 | . |  -13 |  49 |  41 |  1.5 |
| 38.5 | 1 |    90 | . |   -6 |  51 |  39 |  2.4 |
| 39.0 | 2 |    77 | . |  -13 |  49 |  40 |  2.4 |
| 39.5 | 2 |    45 | . |  -14 |  49 |  40 |  2.4 |
| 40.0 | 1 |    29 | . |  -14 |  49 |  40 |  2.3 |
| 40.5 | 2 |    21 | . |  -34 |  61 |  57 |  7.8 |
| 41.0 | 2 |    90 | . |  -32 |  61 |  56 |  7.9 |
| 41.5 | 2 |   108 | . |  -19 |  62 |  47 |  4.3 |
| 42.0 | 2 |    40 | . |  -32 |  61 |  55 |  5.4 |
| 42.5 | 2 |    20 | . |  -32 |  61 |  55 |  5.2 |
| 43.0 | 1 |    16 | . |  -31 |  61 |  55 |  5.9 |
| 43.5 | 2 |    36 | . |  -29 |  58 |  52 |  8.2 |
| 44.0 | 2 |    17 | . |  -27 |  59 |  52 |  8.3 |
| 44.5 | 3 |    16 | . |  -26 |  59 |  52 |  9.0 |
| 45.0 | 3 |    17 | . |  -25 |  59 |  51 |  8.9 |
| 45.5 | 2 |    40 | . |  -24 |  59 |  50 |  8.3 |
| 46.0 | 1 |    57 | . |  +26 |  70 |  42 |  1.9 |
| 46.5 | 2 |    66 | . |  +26 |  70 |  43 |  2.2 |
| 47.0 | 3 |   163 | M |  +26 |  73 |  42 |  1.9 |
| 47.5 | 1 |    59 | . |  +28 |  89 |  43 |  1.9 |
| 48.0 | 1 |    75 | . |  +28 |  91 |  44 |  1.2 |
| 48.5 | 2 |    68 | . |  +30 |  76 |  46 |  2.1 |
| 49.0 | 2 |   101 | . |  +26 |  61 |  40 |  1.5 |
| 49.5 | 3 |    43 | . |  +25 |  58 |  40 |  1.5 |
| 50.0 | 0 |   164 | M |  +18 |  50 |  38 |  2.9 |
| 50.5 | 3 |   115 | M |  +15 |  48 |  32 |  7.4 |
| 51.0 | 2 |    32 | . |  +16 |  49 |  31 | 12.8 |
| 51.5 | 2 |    87 | . |  +17 |  52 |  31 |  9.5 |
| 52.0 | 1 |    36 | . |  +16 |  49 |  31 |  4.1 |
| 52.5 | 2 |   170 | M |  +16 |  48 |  33 |  4.1 |
| 53.0 | 1 |    81 | M |  +26 |  55 |  38 |  3.1 |
| 53.5 | 2 |    58 | . |  +26 |  54 |  38 |  2.4 |
| 54.0 | 2 |    94 | . |  +25 |  54 |  38 |  1.7 |
| 54.5 | 2 |   108 | M |  +21 |  52 |  35 |  0.9 |
| 55.0 | 3 |   130 | M |   -2 |  33 |  18 |  0.5 |
| 55.5 | 1 |    33 | . |  +29 |  62 |  45 |  1.5 |
| 56.0 | 2 |    22 | . |  +29 |  62 |  45 |  1.8 |
| 56.5 | 2 |    57 | . |  +28 |  62 |  44 |  1.1 |
| 57.0 | 2 |    70 | . |  +26 |  60 |  41 |  0.5 |
| 57.5 | 1 |    45 | . |  +25 |  58 |  41 |  0.4 |
| 58.0 | 2 |    48 | . |  +27 |  58 |  43 |  0.5 |
| 58.5 | 2 |     5 | . |  +25 |  88 |  41 | 14.1 |
| 59.0 | 2 |    67 | M |  +26 |  88 |  41 |  6.7 |
| 59.5 | 2 |   215 | M |  +26 |  79 |  42 |  1.7 |
| 60.0 | 1 |    87 | M |  +28 |  63 |  45 |  1.6 |
| 60.5 | 2 |   127 | . |  +27 |  63 |  44 |  2.0 |
| 61.0 | 2 |    77 | . |  +25 |  59 |  42 |  2.5 |
| 61.5 | 1 |   103 | . |  +25 |  69 |  40 |  3.8 |
| 62.0 | 2 |   103 | . |  +20 |  78 |  42 | 17.0 |
| 62.5 | 2 |    84 | . |  +19 |  75 |  45 | 21.5 |
| 63.0 | 1 |    46 | . |  +19 |  73 |  46 | 26.1 |
| 63.5 | 2 |    20 | . |  +19 |  71 |  47 | 29.9 |
| 64.0 | 1 |     8 | . |  +19 |  70 |  48 | 26.0 |
| 64.5 | 1 |     4 | . |  +19 |  70 |  48 | 24.8 |

## cannonballs / levels (ref-E, 63.5 s)

| t | words | motion | cam | warm | bright | sat | c/e |
|---|---|---|---|---|---|---|---|
|  0.0 | 3 |   172 | M |   +9 |  74 |  44 |  3.2 |
|  0.5 | 3 |   216 | M |   +7 |  74 |  47 |  1.6 |
|  1.0 | 2 |   185 | M |   +5 |  74 |  48 |  3.4 |
|  1.5 | 0 |   220 | M |   -6 |  78 |  58 |  2.9 |
|  2.0 | 2 |   278 | M |  +22 |  51 |  61 |  1.4 |
|  2.5 | 3 |   226 | M |  +41 |  58 |  60 |  6.8 |
|  3.0 | 3 |    85 | . |  +37 |  62 |  57 |  4.9 |
|  3.5 | 1 |    57 | M |  +39 |  61 |  58 |  5.1 |
|  4.0 | 2 |   257 | M |  +17 |  61 |  57 |  1.0 |
|  4.5 | 0 |   331 | M |  -12 |  76 |  47 |  0.6 |
|  5.0 | 2 |   124 | M |  -37 |  70 |  63 |  5.6 |
|  5.5 | 2 |    54 | . |  -14 |  74 |  49 |  2.1 |
|  6.0 | 2 |    91 | M |  -19 |  74 |  52 |  2.2 |
|  6.5 | 1 |   342 | M |   +4 |  66 |  55 |  1.5 |
|  7.0 | 2 |   193 | M |  +12 |  69 |  49 |  8.6 |
|  7.5 | 2 |   181 | M |   +9 |  70 |  48 | 11.5 |
|  8.0 | 2 |   304 | M |  +13 |  70 |  46 |  5.7 |
|  8.5 | 3 |   204 | M |  +15 |  72 |  43 |  5.5 |
|  9.0 | 2 |   165 | . |  +11 |  72 |  45 |  7.4 |
|  9.5 | 1 |   245 | M |  +15 |  70 |  47 |  2.9 |
| 10.0 | 2 |   258 | M |  +10 |  71 |  47 |  5.2 |
| 10.5 | 2 |   107 | . |   +6 |  73 |  43 |  6.2 |
| 11.0 | 2 |    24 | . |   +6 |  73 |  43 |  6.6 |
| 11.5 | 2 |   120 | M |   +6 |  72 |  44 |  6.4 |
| 12.0 | 1 |   261 | M |  +12 |  71 |  46 |  6.2 |
| 12.5 | 2 |   129 | . |  +17 |  73 |  48 |  1.3 |
| 13.0 | 1 |   148 | . |  +19 |  71 |  49 |  1.1 |
| 13.5 | 2 |   191 | . |  +16 |  70 |  47 |  2.5 |
| 14.0 | 2 |   126 | . |  +13 |  71 |  46 |  4.2 |
| 14.5 | 2 |    42 | . |  +14 |  71 |  47 |  4.4 |
| 15.0 | 0p |    60 | . |  +14 |  71 |  46 |  4.7 |
| 15.5 | 3 |   145 | . |  +14 |  70 |  48 |  3.0 |
| 16.0 | 2 |   104 | . |  +14 |  67 |  52 |  2.4 |
| 16.5 | 2 |    51 | . |  +17 |  66 |  55 |  1.8 |
| 17.0 | 1 |   171 | . |  +14 |  67 |  51 |  2.6 |
| 17.5 | 0 |   118 | . |   +9 |  72 |  46 |  3.2 |
| 18.0 | 3 |   227 | D |  -25 |  72 |  50 |  0.5 |
| 18.5 | 3 |   158 | M |  -36 |  66 |  64 |  5.0 |
| 19.0 | 1 |   250 | M |  -44 |  73 |  68 | 10.6 |
| 19.5 | 1 |   213 | M |  +11 |  73 |  39 |  3.5 |
| 20.0 | 1 |   229 | M |  +11 |  75 |  45 |  6.8 |
| 20.5 | 0 |   121 | . |  +11 |  77 |  51 |  5.5 |
| 21.0 | 2 |   282 | M |  +20 |  75 |  50 |  6.0 |
| 21.5 | 1 |   154 | . |  +20 |  75 |  43 |  7.7 |
| 22.0 | 3 |   218 | M |  +23 |  76 |  47 | 10.0 |
| 22.5 | 1 |   325 | M |  +37 |  76 |  54 |  2.8 |
| 23.0 | 2 |   208 | M |  +56 |  61 |  74 |  3.7 |
| 23.5 | 1 |   151 | . |  +61 |  62 |  77 |  2.2 |
| 24.0 | 2 |   329 | M |  +44 |  73 |  60 |  3.7 |
| 24.5 | 2 |   295 | M |   +7 |  79 |  35 | 12.4 |
| 25.0 | 2 |   119 | . |   -1 |  79 |  33 | 15.7 |
| 25.5 | 1 |   142 | . |   +3 |  77 |  29 | 11.0 |
| 26.0 | 2 |    82 | . |   +6 |  75 |  27 |  8.1 |
| 26.5 | 2 |   313 | M |  +27 |  70 |  48 |  0.7 |
| 27.0 | 2 |    80 | . |   +6 |  42 |  43 |  2.7 |
| 27.5 | 2 |    65 | . |  +10 |  59 |  37 |  2.7 |
| 28.0 | 2 |   141 | . |  +30 |  67 |  48 |  6.3 |
| 28.5 | 1 |    81 | . |  +21 |  62 |  36 |  2.2 |
| 29.0 | 3 |    34 | . |  +12 |  54 |  30 | 13.2 |
| 29.5 | 1 |    44 | . |  +17 |  58 |  32 |  6.2 |
| 30.0 | 3 |   133 | . |  +30 |  87 |  46 | 35.2 |
| 30.5 | 1 |   132 | . |   -1 |  45 |  61 |  0.4 |
| 31.0 | 1 |     6 | . |  +55 |  44 |  68 |  0.7 |
| 31.5 | 3 |   166 | M |  +39 |  42 |  57 |  0.2 |
| 32.0 | 1 |   134 | M |  -28 |  69 |  59 |  7.1 |
| 32.5 | 3 |     8 | . |  -34 |  72 |  62 | 28.3 |
| 33.0 | 3 |    22 | . |  -29 |  68 |  60 | 28.0 |
| 33.5 | 2 |    29 | . |   -8 |  54 |  52 | 31.9 |
| 34.0 | 1 |    14 | . |   +5 |  43 |  60 | 60.5 |
| 34.5 | 2 |    18 | . |   +9 |  46 |  55 | 59.6 |
| 35.0 | 3 |    19 | . |  +17 |  50 |  56 | 34.3 |
| 35.5 | 2 |    13 | . |  +21 |  54 |  54 | 21.9 |
| 36.0 | 2 |     8 | . |  +23 |  57 |  53 | 17.4 |
| 36.5 | 0 |     4 | . |  +22 |  56 |  54 | 15.0 |
| 37.0 | 3 |    55 | . |  +33 |  53 |  56 |  3.7 |
| 37.5 | 1 |    51 | . |  +37 |  51 |  62 |  4.6 |
| 38.0 | 2 |    54 | . |  +35 |  52 |  62 |  7.7 |
| 38.5 | 2 |   154 | . |  +34 |  49 |  61 |  3.8 |
| 39.0 | 1 |   129 | . |  +29 |  49 |  59 |  1.2 |
| 39.5 | 2 |    93 | . |  +28 |  52 |  55 |  2.2 |
| 40.0 | 0 |    89 | . |  +28 |  51 |  54 |  1.4 |
| 40.5 | 3 |   135 | . |  +31 |  56 |  53 |  6.2 |
| 41.0 | 0 |    89 | . |  +29 |  55 |  50 |  5.4 |
| 41.5 | 2 |    72 | . |  +29 |  54 |  51 |  4.6 |
| 42.0 | 2 |    51 | . |  +30 |  54 |  52 |  6.7 |
| 42.5 | 2 |   111 | . |  +32 |  56 |  52 |  3.9 |
| 43.0 | 1 |    94 | . |  +28 |  54 |  48 |  4.9 |
| 43.5 | 2 |    56 | . |  +28 |  52 |  47 |  3.6 |
| 44.0 | 2 |    25 | . |  +26 |  52 |  47 |  3.1 |
| 44.5 | 2 |   139 | . |  +24 |  53 |  46 |  3.1 |
| 45.0 | 2 |    80 | . |  +16 |  52 |  45 |  4.8 |
| 45.5 | 2 |    15 | . |  +15 |  50 |  46 |  4.9 |
| 46.0 | 2 |     6 | . |  +16 |  50 |  46 |  5.4 |
| 46.5 | 2 |   115 | . |  +14 |  50 |  47 |  2.3 |
| 47.0 | 1 |    78 | . |  +25 |  54 |  55 |  4.5 |
| 47.5 | 2 |    14 | . |  +35 |  58 |  58 |  5.1 |
| 48.0 | 2 |    25 | . |  +37 |  60 |  59 |  3.7 |
| 48.5 | 1p |    17 | . |  +41 |  62 |  61 |  4.0 |
| 49.0 | 0p |    48 | . |  +18 |  39 |  59 |  0.1 |
| 49.5 | 2 |    17 | . |  +18 |  38 |  56 |  0.2 |
| 50.0 | 2 |    15 | . |  +21 |  38 |  54 |  0.2 |
| 50.5 | 2 |   100 | . |  +16 |  39 |  51 |  0.3 |
| 51.0 | 1 |   102 | . |  -23 |  50 |  42 |  0.4 |
| 51.5 | 2 |    46 | . |  -20 |  55 |  45 |  1.3 |
| 52.0 | 2 |    15 | . |  -19 |  56 |  46 |  1.4 |
| 52.5 | 1 |    16 | . |  -19 |  56 |  46 |  1.3 |
| 53.0 | 1 |    19 | . |  -18 |  56 |  44 |  1.3 |
| 53.5 | 1 |    84 | . |  -13 |  63 |  30 |  3.5 |
| 54.0 | 1 |   159 | . |  -11 |  65 |  31 |  2.6 |
| 54.5 | 2 |   122 | . |  -10 |  72 |  27 |  4.9 |
| 55.0 | 2 |    89 | . |   -8 |  76 |  26 |  6.9 |
| 55.5 | 1 |    82 | . |   -8 |  76 |  26 |  6.7 |
| 56.0 | 2 |   128 | . |   -9 |  75 |  29 |  4.6 |
| 56.5 | 2 |   178 | . |   -7 |  75 |  37 |  3.9 |
| 57.0 | 2 |   115 | . |   -6 |  74 |  46 |  4.5 |
| 57.5 | 2 |    62 | . |   -7 |  74 |  47 |  3.2 |
| 58.0 | 1 |    92 | . |   -6 |  73 |  47 |  5.6 |
| 58.5 | 1p |   104 | . |   -5 |  75 |  42 |  3.3 |
| 59.0 | 2 |    70 | . |   -5 |  74 |  35 |  2.6 |
| 59.5 | 2 |   175 | . |   +3 |  84 |  27 |  1.5 |
| 60.0 | 3 |   105 | . |  -40 |  64 |  62 |  1.6 |
| 60.5 | 2 |   152 | . |  -29 |  69 |  55 |  8.5 |
| 61.0 | 1 |    79 | . |  +23 |  71 |  42 | 11.3 |
| 61.5 | 3 |    85 | . |   -0 |  63 |  46 | 26.0 |
| 62.0 | 2 |    49 | . |  -25 |  61 |  54 | 25.2 |
| 62.5 | 2 |    19 | . |  -25 |  60 |  53 |  8.4 |
| 63.0 | 0 |     8 | . |  -25 |  59 |  53 |  5.2 |

## knight / pardon (ref-F, 40.63 s)

| t | words | motion | cam | warm | bright | sat | c/e |
|---|---|---|---|---|---|---|---|
|  0.0 | 3 |    80 | . |  +10 |  67 |  51 | 19.5 |
|  0.5 | 2 |    91 | . |  +12 |  67 |  50 |  6.9 |
|  1.0 | 2 |    58 | . |  +14 |  67 |  52 |  4.3 |
|  1.5 | 2 |    88 | . |  +15 |  66 |  53 |  3.5 |
|  2.0 | 2 |   159 | . |  +16 |  64 |  56 |  3.1 |
|  2.5 | 2 |   123 | . |  +11 |  62 |  51 |  3.9 |
|  3.0 | 1 |   227 | M |  +13 |  63 |  50 |  3.9 |
|  3.5 | 2 |   150 | D |  +11 |  74 |  38 | 10.5 |
|  4.0 | 3 |    84 | . |   -2 |  76 |  51 |  6.0 |
|  4.5 | 1 |   172 | M |   -1 |  76 |  51 |  5.9 |
|  5.0 | 2 |   153 | M |  -24 |  81 |  49 | 12.2 |
|  5.5 | 2 |   159 | M |  -14 |  77 |  50 |  4.4 |
|  6.0 | 1 |   101 | M |  -11 |  59 |  47 |  8.0 |
|  6.5 | 1 |    36 | . |  -17 |  60 |  44 | 45.8 |
|  7.0 | 1p |    37 | . |  -16 |  60 |  45 | 66.9 |
|  7.5 | 1 |   100 | . |  +20 |  69 |  53 |  2.0 |
|  8.0 | 3p |    86 | . |  +22 |  69 |  54 |  2.4 |
|  8.5 | 1 |    52 | . |  +22 |  69 |  54 |  2.5 |
|  9.0 | 2 |    90 | . |  +22 |  69 |  54 |  2.4 |
|  9.5 | 1 |   178 | M |  +20 |  69 |  54 |  2.0 |
| 10.0 | 4 |   221 | M |  +12 |  70 |  50 |  2.7 |
| 10.5 | 1 |   186 | M |   +5 |  71 |  48 |  1.6 |
| 11.0 | 3 |   107 | . |   -0 |  73 |  46 |  2.2 |
| 11.5 | 1 |    52 | . |   -1 |  74 |  46 |  2.0 |
| 12.0 | 2 |    59 | . |   -2 |  74 |  43 |  2.3 |
| 12.5 | 3 |    48 | . |   +6 |  71 |  48 | 30.0 |
| 13.0 | 1 |    75 | . |   +9 |  70 |  58 | 24.6 |
| 13.5 | 2 |   123 | . |   +7 |  70 |  59 | 19.5 |
| 14.0 | 2 |   155 | . |  +13 |  66 |  59 |  8.0 |
| 14.5 | 2 |   122 | . |  +14 |  66 |  54 |  5.7 |
| 15.0 | 2 |    50 | . |  +15 |  67 |  50 |  5.3 |
| 15.5 | 0p |    19 | . |  +15 |  68 |  48 |  3.5 |
| 16.0 | 2 |    70 | . |  +15 |  68 |  49 |  3.8 |
| 16.5 | 2 |    92 | . |   +9 |  68 |  51 | 13.4 |
| 17.0 | 2 |    86 | . |  +11 |  67 |  50 |  7.7 |
| 17.5 | 2 |   103 | . |  +15 |  65 |  52 |  4.6 |
| 18.0 | 2 |   124 | . |  +19 |  61 |  57 |  2.8 |
| 18.5 | 2 |   133 | D |  +16 |  59 |  57 |  6.6 |
| 19.0 | 3 |   108 | D |  +20 |  82 |  35 | 74.2 |
| 19.5 | 3 |    48 | . |  +20 |  84 |  34 | 154.0 |
| 20.0 | 1 |    50 | . |  +19 |  83 |  35 | 63.4 |
| 20.5 | 2 |    79 | . |  +19 |  84 |  34 | 22.0 |
| 21.0 | 1 |    28 | . |  +15 |  75 |  50 | 13.7 |
| 21.5 | 1 |    36 | . |  +15 |  74 |  50 | 13.8 |
| 22.0 | 2 |    73 | . |  +17 |  63 |  54 |  3.0 |
| 22.5 | 2 |    43 | . |  +16 |  64 |  53 |  3.4 |
| 23.0 | 2 |    20 | . |  +15 |  64 |  52 |  4.1 |
| 23.5 | 1p |     9 | . |  +15 |  65 |  52 |  4.0 |
| 24.0 | 3 |    65 | . |  +15 |  65 |  52 |  4.0 |
| 24.5 | 1 |   145 | . |  +34 |  59 |  56 |  3.3 |
| 25.0 | 3 |   131 | . |  +34 |  55 |  57 |  2.4 |
| 25.5 | 2 |   114 | . |  +39 |  56 |  59 |  2.9 |
| 26.0 | 2 |   130 | . |  +32 |  51 |  56 |  2.1 |
| 26.5 | 2 |   194 | M |  +22 |  57 |  48 |  6.1 |
| 27.0 | 2 |    65 | . |  +22 |  67 |  38 |  2.4 |
| 27.5 | 1 |   143 | M |  +20 |  68 |  36 |  4.1 |
| 28.0 | 3 |   161 | M |  +16 |  62 |  32 |  4.7 |
| 28.5 | 2 |    68 | . |  +14 |  63 |  30 |  3.0 |
| 29.0 | 2 |    49 | . |  +14 |  64 |  30 |  2.9 |
| 29.5 | 1 |    65 | . |  +16 |  68 |  30 |  6.1 |
| 30.0 | 3 |   114 | M |  +16 |  69 |  30 |  8.8 |
| 30.5 | 2 |   236 | M |   +3 |  74 |  15 |  3.9 |
| 31.0 | 2 |    91 | . |   +0 |  73 |  13 |  7.2 |
| 31.5 | 2 |    87 | . |  +16 |  61 |  34 |  5.1 |
| 32.0 | 1 |    81 | . |  +16 |  63 |  34 |  4.6 |
| 32.5 | 2 |    36 | . |  +18 |  64 |  35 |  5.7 |
| 33.0 | 3 |    67 | . |  +19 |  68 |  34 |  4.0 |
| 33.5 | 1 |   130 | . |  +29 |  69 |  48 |  2.3 |
| 34.0 | 4 |   175 | M |  +27 |  69 |  43 |  2.6 |
| 34.5 | 2 |   101 | . |  +25 |  67 |  42 |  4.1 |
| 35.0 | 2 |    59 | . |  +24 |  68 |  41 |  4.4 |
| 35.5 | 3 |    55 | . |  +24 |  68 |  40 |  5.5 |
| 36.0 | 2 |   106 | M |  +18 |  66 |  34 |  5.9 |
| 36.5 | 2 |   138 | M |  +18 |  63 |  35 |  5.9 |
| 37.0 | 3 |    68 | . |  +19 |  64 |  37 |  5.0 |
| 37.5 | 2 |    76 | . |  +19 |  67 |  36 |  5.8 |
| 38.0 | 2 |    19 | . |  +19 |  70 |  35 |  5.4 |
| 38.5 | 1 |    78 | . |  +26 |  77 |  43 |  1.5 |
| 39.0 | 2 |    47 | . |  +27 |  77 |  46 |  5.4 |
| 39.5 | 2 |    13 | . |  +27 |  78 |  46 |  7.6 |
| 40.0 | 3 |    12 | . |  +27 |  79 |  46 |  7.5 |

# PART 21: lessons from the first full 30 s Short ("The Fly", short30/, 2026-10-24; the user loved it)

## 140. What worked (keep)
- One scene file, three sets far apart in world space (x = 0, 20, 40), with one `look()` per shot (night / day / ops / board). Dissolves render both shots and mix them.
- A live CCTV feed: render the restroom from a second camera into a 512x288 target and show it on a monitor. It ties two places together for free.
- Props that act on the word: a calendar flips on "a week later", bars drop and the total rolls on "mess... vanished", a stamp slams on "eighty".
- The staggered shock (mouth, then sweat drop, then ring eyes), used once. The punchline closes on the first set, now by day.

## 141. Mistakes caught on stills (check these first next time)
- **Characters must face the camera.** Work out the body angle from the camera position. A head yaw with the wrong sign turns the face away (as on "decorating" and in the painting shots).
- **Hero-prop close-ups:** check that nothing sits between the lens and the prop (urinal lip, the painter's hand, the brush). The hand moves away the moment the prop is finished.
- **Night light:** a blue hemisphere alone turns orange clothes black. Add a cool ambient light (~0.9) so hero colours stay readable.
- **Brightness** comes from the lights (day hemisphere ~2.35, key ~2.2), never from a grade. The evidence board needs neutral white light, or the cards stop being neutral.
- **Over-the-shoulder:** offset the camera so the near head sits on the frame edge, not on the line to the subject.

## 142. Rendering fast
- One process renders about 25 frames a minute (30 s takes ~35 min). Split the frames into parts (`render.py --part k n`), then `--join n` concatenates them and mixes the sound. Six parts on a 16-thread laptop finished in ~6 min.
- Six at once can run out of RAM (numpy MemoryError). Re-run only the failed parts, or use 4 parts.
- Grab frames as JPEG (q95) instead of PNG. Three motion-blur subframes is enough, but a 0.28 s whip shows separate copies; use 5 there if time allows.

# PART 22: "looks generated" vs his look (2026-10-25, side by side: ref-A 0.5/4.1/33/46.3 s vs short30 4.0/12.9/27/29.2 s)

The user's verdict on short30: it lacks his depth and his effects, the heads are "too perfect", and trained eyes can tell the
graphics (the "-80%" stamp) were generated. Overrides earlier rules where they clash.

## 143. Characters: imperfect, thicker, softer
- **Outline:** his head line is about 2-3x thicker than ours relative to the head (estimated from the crop, to be measured).
  His line also varies a little in thickness around the head, thicker at the bottom and sides. Ours is a uniform thin hull.
- **Head shape:** his heads are not perfect spheres. They are slightly flattened, wider low (a soft "bean"), and a little
  asymmetric. Ours read as a clean CG ball.
- **Face ink is soft grey, not black.** His eyes, brows and mouth are a mid-to-dark warm grey with soft edges (Kyle 4.1 s).
  Ours are crisp near-black shapes. Black-ink faces are a giveaway.
- **Face shading:** a soft darkening toward the head's edge and under the hair. Ours is flat white.
- **Hair:** a warm gradient (light on top, darker at the fringe), a few soft highlight strands, a thick dark outline and a
  tuft. Ours had flat bands with hard lines.
- **Clothes carry details:** collar, buttons, name badge, pocket.

## 144. Depth: layers, clutter, light
- Every set is **full**: posters, shelves, boxes, frames, plants, cables. Ours had large empty tiled walls.
- **Strong depth of field** on close-ups: the background goes clearly soft. Ours stayed nearly sharp.
- **Ambient occlusion:** soft dark in corners, under counters and where objects meet. Ours had none, so objects float.
- **Textured surfaces:** wood grain, worn floors, slightly dirty paint, paper texture. Ours were clean flat colours.
- **Light that shows:** lamp pools on ceilings, rim light on characters, window light, glow around practical lights.

## 145. BANNED: things that make it look generated
1. **Default fonts** (Arial, Arial Black, Courier, Georgia, Comic Sans) anywhere on screen. Use a rounded cartoon display font
   with an outline and a small shadow for signs, and a marker/handwritten font for notes.
2. **Flat vector graphics laid over the scene:** perfect stamps, flat bar charts, rounded-rect badges, big floating
   percentages. Every graphic is a **physical object in the set**: a printed photo with a white border, a note with tape, a
   pinned paper, a sign with thickness, lit and shadowed like everything else.
3. **Perfect geometry:** concentric rings with perfect spacing, perfect symmetry, centred layouts, pixel-straight edges. Give
   them a slight tilt, wear, uneven print and paper curl.
4. **Slot-machine counting numbers and UI-style motion.** He shows the result on a prop, not a counter animation.
5. **Pure black lines or black face features.** Lines are warm near-black and faces are soft grey (143).
6. **Empty walls and clean floors** (144).

## 146. Fixes queued for short30 (not built yet; stills first, render only on the user's call)
- Characters: thicker, slightly uneven outline; bean-shaped asymmetric heads; soft grey face ink; edge shading; gradient hair.
- Sets: posters, shelves and clutter on every wall; AO; stronger DOF on close-ups; textured surfaces; visible light pools.
- Graphics: rebuild the "-80%", the chart, "AIM HERE" and the bill as physical printed props with cartoon fonts.

# PART 23: polish round 1, measured and built (2026-10-25; short30/index.html, backup of the posted version: short30/index_v1.html)

Everything below was measured on his frames, then built and checked on stills. Each rule gives the number, how to build it in
three.js/canvas, and how to check it. Video renders only on the user's call; stills are always fine.

## 147. Measurements on his character (ref-A 4.1 s, Kyle, head ~606 px wide)
| element | his value | ours before | how measured |
|---|---|---|---|
| head outline, sides | **4.6-5.1 % of head width** (24-34 px on a 606 px head) | ~2.8 % | rays out from the white head blob, count pixels with grey < 90 |
| outline colour | **#211912** (warm near-black) | #2A1B1C | darkest 5 % of the outline band |
| brow | **#4C3B40** (dark warm mauve-grey), thick rounded stroke, soft edge | #33262A near-black | darkest 5 % in the brow box |
| eye body | grey oval, **#7E7374 top -> #978C8B middle -> #B9B0B0 bottom** | flat near-black | samples at the top, middle and bottom of the eye |
| eye lid | a thick dark line on top, a little wider than the eye, rounded caps (~#45383C) | thin black line | |
| closed mouth | a small soft blob, **#D7D3D1 / #C4BCBB**, lighter than the eyes | black bar | |
| face | **#FFFFFF** in the centre; a soft lavender-pink rim **#EDE1E7** toward the outline | flat #EEECEC | samples at the centre vs 30 px inside the outline |
| hair | **#965623** base, highlight **#BB7645** in soft streaks, darker at the fringe, one tuft | flat bands | |
| head shape | not a sphere: h/w of the white face area ~0.72; wider low, flatter top, a little lopsided | clean ball | blob bounding box |

**The lesson that cost a round:** a canvas texture of measured hex colours must be `SRGBColorSpace`. With `NoColorSpace` the
greys are treated as linear and come out much lighter: our #5F5357 eyes showed as about #A49A9C. For any hand-picked palette on
a canvas texture, set SRGB; then the measured hex is what appears on screen.

## 148. How the characters are built now (code recipes)
1. **Outline:** an inverted hull.
   - Widths in world units, on a head of R = 0.15:

     | part | value |
     |---|---|
     | head hull | **0.0158** (≈ 5 % of the 0.32 head width) |
     | torso hull | 0.0135 |
     | hair hull | 0.0148 |
     | limb tubes | radius 0.0092 |
     | hands | radius 0.02 |

   - The hull vertex shader varies the width (vary = 1):
     `k = 1 + 0.16·sin(p·(41,29,17))·sin(p·(-13,37,23)) + 0.35·max(0, -n.y) + 0.18·|n.x|`.
     The line is thicker low and at the sides and never even, the way an artist's brush line is.
2. **Head (bean):** start from a sphere of radius R, then per vertex:
   - wide low: `k = 1 + 0.10·exp(-((y+0.3)/0.55)²)` on x and z
   - lopsided: `x *= 1 + 0.035·y·sign(x)`
   - flatter top: `y *= 0.95` for y > 0
   - then scale x by 1.08.
3. **Face shading:**
   - `c = mix(vec3(0.86,0.79,0.83), white, smoothstep(0.03, 0.62, n_view.z))`
   - 5 % darker under the fringe, 6 % darker on the underside.
4. **Face decal:**
   - Canvas 1024 px (512 for extras), SRGB.
   - Drawn with `ctx.filter = blur(0.0011·D px)`, so edges are soft but readable.
   - Colours from 147.
   - Eyes: lidded ovals 0.125 × 0.112 D at ±0.145 D, with the vertical gradient and a lid line of 0.024 D.
   - Open mouths: interior #5C4E52 with a #E98C93 tongue. Mouth lines #7C6F72. Closed mouth #C4BCBB.
5. **Hair:** `mix(shadow, base, smoothstep(0.2, 0.7, n.y))`, then highlight streaks and crease lines (Part 19).
   - Extras get one accessory.
   - A brown-haired kid or teen also gets the tuft: a 16-segment tube, r 0.011, outlined 0.006.
6. **Colours:** the lead's outfit sits at **h 28-34, S ≥ 0.85** (janitor coverall #F47A1C). A red-orange like #E8601A reads red
   on screen under daylight.

## 149. Depth and dressing (code recipes)
- **Contact darkness (fake AO):**
  - Transparent gradient strips (`aoStrip`): rgba(25,15,45, 0.35-0.45) fading to 0, about 0.24 m tall, flagged as hulls so the
    outline pass ignores them.
  - Put them on every wall-floor, wall-ceiling and wall-wall line.
  - Put soft blobs on the wall behind and below wall-hung objects (urinals: 0.36 × 0.3 at y 0.24, opacity 0.6).
  - Every free-standing prop gets a floor blob of 1.2-1.4 × its footprint.
- **Clutter quota** (from his shop, kitchen and waiting-room frames): every visible wall section of about 1 m carries **3-5
  objects**:
  - a poster or sign
  - a fixture (dispenser, dryer, extinguisher, clock)
  - something hanging (pipe, cable, lamp)
  - something on the floor (bin, bucket, wet-floor sign, plant)

  An empty wall section larger than about 0.6 m in a hold shot is a fault.
- **Restroom kit used:**
  - paper-towel dispenser, plus a bin with paper balls
  - hand dryer with a PUSH sticker
  - airline ad poster
  - a "SMILE! YOU'RE ON CAMERA" poster, a rewatch joke for the CCTV beat
  - chrome pipe along the wall top, vent grille, smoke detector
  - EXIT sign over the door
  - fire extinguisher (Phong specular, 137)
  - wet-floor A-frame, mop bucket, cleaning log
- **Ops room kit used:**
  - window with blinds and a runway view
  - wall clock
  - cork board with five handwritten notes
  - filing cabinet and coffee machine
  - potted plant (saturated greens)
  - office chair, three binders, desk phone
  - radar, mug, nameplate
- **Textured surfaces:**
  - Wall tiles: each gets ±6-7 % random light/dark, and a brown grime gradient covers the bottom 0.25 m.
  - Floor tiles: ±6 %, plus 20-30 faint scuff curves.
  - Paper props: grain (1800 specks at ≤ 3.5 % alpha) and an edge vignette.
- **Light pools:** each lit pendant puts a warm additive radial on the ceiling (0.9 m, rgba(255,214,150,0.55) fading to 0), by
  day only.
- **Depth of field:** ~~every shot's circle-of-confusion factor is × 1.5 versus Part 20~~ **withdrawn in round 4 (section
  187):** a comment swallowed the line that applies it, so it never ran, and measured against his frames our backgrounds were
  already 2-20× too soft. The per-shot factor is now × 0.4 of the shot list values.

## 150. Graphics as physical props (code recipes)
- **Fonts** (shipped with Legion, copied into short30/fonts):

  | use | font |
  |---|---|
  | signs and print | **Lilita One** |
  | loud display (posters, stamps) | **Luckiest Guy** |
  | body text on print | **Fredoka** |
  | handwriting and marker | **Chewy** |
  | camera on-screen display | **Staatliches** |

  Load them with `FontFace` and `await` them before any canvas is drawn. Arial, Courier, Georgia and Comic Sans are banned.
- **Hand-drawn means wobbly:**
  - Marker lines are polylines with 6-10 px jitter (`wob`, `wobLine`, `wobRect`), with round caps.
  - Ellipses (`wobEll`) overlap at the end: turns 1.08-1.15.
  - Fills are **hatching**: 45° marker strokes 28 px apart, each 0.75 × the step wide.
  - Draw them on grid paper (64 px grid, rgba(80,130,205,0.2)).
  - Concentric target rings: offset each ring 3-5 px from the last, radii ±4 %.
- **Stamps** are an ink impression, not a badge:
  - a double wobbly border (20 px and 7 px)
  - Luckiest Guy text, rotated −0.2 rad
  - 1400 speckles and 30 streaks knocked out (`destination-out`), plus a side-to-side ink fade
  - drawn with `multiply` at 0.93.

  A **real rubber stamp** makes the impression: dark base, red rubber, wooden neck, shiny knob.
  - It comes down in 0.17 s, accelerating.
  - It rests 0.05 s.
  - It lifts and slides out in 0.25 s.
  - The impression appears on contact, together with the impact jolt.
- **Documents:**
  - Printed design: a header band with the logo, rows with rules, a total box.
  - Paper grain, and a faint coffee ring on the old one.
  - **The change is shown by props, never by counting numbers.** The old invoice is lifted off: it pivots on its top edge and
    flips π − 0.05 in 0.34 s. Its back is plain paper #F1EDE3, never mirrored text.
  - The new invoice underneath shows $940 circled in wobbly red marker with "?!".
- **Tape:** cream #EFE6C8 strips, 0.035 × 0.08-0.12 m, 78 % opaque, at angles on card corners. Mix tape and pins on a board.

## 151. Check before showing stills (adds to 127)
1. Zoom on a face. It needs:
   - grey eyes with a darker lid
   - warm grey brows
   - a light closed mouth
   - a pink-lavender rim
   - a thick, uneven line.
2. Search the frame for any default-font text, flat vector badge or perfectly regular shape (145).
3. Count objects per metre of visible wall in hold shots (149).
4. Check every flipped or lifted paper from the camera side: no mirrored text.
5. Moving foreground props (stamp, hands) must leave the frame, not hang as a dark blob over the subject.
6. Run the colour numbers of Part 20 again: the new greys and AO must not drop mean V below 0.6 in day shots.

## 152. Still open after round 1 (next round)
- **Wide shots:** sets still read emptier than his. Add shelves, more small props and a second depth layer behind doors.
- **Close-up sharpness:** his close-ups keep the subject crisp. Our lens-softness band plus DOF makes some faces slightly soft;
  narrow the soft band.
- **Hair fringe:** his fringe edge is one clean thick line; ours is wavy with light gaps. Smooth the fringe function and close
  the gap.
- **Not done yet:** lip sync, and mitten hands instead of balls.

# PART 24: polish round 2 (2026-10-25; backups of round 1: short30/index_r1.html, render_r1.py)

## 153. Soft faces had three causes (all fixed; check all three on every new scene)
1. **Focus on the head centre.** The DOF focus distance was the head's centre, so the face surface sat about one head radius
   (0.14 m) in front of the focus plane. On a close-up at 0.6-0.8 m with coc 18-36 that blurs the face by 4-5 px.
   - **Rule:** when the focus target is a character, focus on the face surface: `focus = distance(camera, head) - 0.14`
     (R 0.15 minus a little). Props, cards and boards keep their own distance.
2. **Stale positions.** `render(t)` computed the shot (focus target, framing) before `stage(t)` placed the characters. So focus
   read the previous frame's positions, and on a still or the first frame of a render part that could be a hidden character
   at y = −50.
   - **Rule:** call `stage(t)` before anything reads a character's position.
3. **Too much softness in the finish.** The lens-softness band in `finish()` reached into the middle of the frame where faces
   sit.
   - **Rule:** softness only near the top and bottom edges:
     `m = clip(((y/H - 0.5)/0.50)² + ((x/W - 0.5)/1.3)², 0, 1)³`, Gaussian σ 1.5.
   - The face decal's own blur is 0.0007·D (soft edge, not soft face).

**Also:** a `//` comment inside a one-line JavaScript statement swallows the rest of the line. The page then never becomes
ready and the stills time out. Use `/* */` inside lines.

## 154. Clean hair line
- **Fringe:** `f = fr0 − frPart·x − frDip·pow(|x|/0.95, 1.6) + 0.004·cos(7x)`. That is almost no wave; his fringe is one smooth
  curve.
- **Line band:** `dy < 0.05`, about 1.7× the old band, in the outline colour (0.137, 0.098, 0.078 = #231914).
- **Hair hull:** discards below `fringe − 0.035`, so the hull closes the gap between the hair shell and the face. There is no
  light sliver under the fringe.

## 155. Mitten hands
- **Shape:** a group of two pieces in the line colour:
  - a palm sphere, r 0.021, scaled (1.0, 1.18, 0.72)
  - a thumb sphere, r 0.009, scaled (1, 1.5, 1), offset 0.018 sideways and 0.006 forward, rotated ±0.6.
- **Orientation:** the hand follows the arm: `rot.z = side·0.25 + 0.6·atan2(hand.x − shoulder.x, −(hand.y − shoulder.y))`.
- **Pointing pose:** a capsule finger above the mitten ("one").

## 156. Lip sync from letters
- The word under the playhead is split into slots of at least 0.1 s (3 frames, the hold minimum of 26). Each slot takes the
  letter at that position in the word.
- **Letter → mouth:**

  | letters | mouth |
  |---|---|
  | m b p | closed (bar) |
  | o u w | round (o) |
  | e i f v l n t d s z | teeth |
  | a | open |
  | other | wide |

- Only characters who speak a quoted line move their mouths. The narrator is off screen, and everyone else holds an expression.

## 157. Dressing that the wide shots actually see
- **Check first which walls each wide shot sees,** then dress those. Round 1 put most props on walls that only the close-ups
  saw.
- **Restroom left wall** (the row reveal and the shrug shot):
  - a sink counter (#B2A8A1 top, saturated wood apron) with two basins, chrome taps and green soap pumps
  - a framed mirror: blue-grey gradient with two white diagonal streaks.
- **Door wall:**
  - hand sanitizer with a blue drop
  - light switch
  - EXIT sign above the door.
- **Above the dryer:** a wood shelf with three spare rolls and a blue spray bottle with a red trigger.
- **Ceiling:** a speaker. **Floor:** a drain.
- **A background story** (57): a handwritten "OUT OF ORDER" note taped over urinal 1, in Chewy marker red, slightly rotated.
- **Second depth layer behind every open door.** The concourse behind the restroom door is a painted strip:
  - a departures board in Staatliches with SUNNY BAY / NORTHPORT / LAKE CITY / RIVERTON and green/red statuses
  - a row of cobalt seats, a plant and a purple suitcase
  - two travellers drawn in his style: white outlined heads, coloured shirts
  - a night version darkened with a blue wash.
- **Tried and removed:** pipes under the urinals and pink urinal cakes. From low angles the pipes read as hooks and the cakes as
  lips. In the inside-the-urinal shot a cake sat in front of the lens and filled the frame in pink.
  - **Rule:** before adding any prop near a camera position, check that shot's stills for it.

## 158. Still open after round 2
- His frames are still busier in the far background: shelves full of products, many small posters. Ours are getting closer but
  remain cleaner.
- Expressions: his characters change pose and expression more often within a shot (eyebrow raises, small head turns on words).
- The over-the-shoulder shot shows the back of the manager's head as a large dark-grey shape. Move the camera so less of it
  fills the frame, or lighten the back of the hair.

# PART 25: polish round 3 (2026-10-25; backup of round 2: short30/index_r2.html)

## 159. Dress what stands behind the close-ups, busiest of all
- **The wall behind a speaking character's close-up is the most-watched wall in the video.** In short30 the manager's
  close-ups (7.66 s, 12.12 s) look at the door wall right of the door, so that section carries the most:
  - "EMPLOYEE OF THE MONTH" with a drawn portrait of the janitor. It's a rewatch joke and foreshadows the promotion; the
    best background props belong to the story.
  - a no-smoking sign and a FREE WIFI sticker
  - a wall clock, two coat hooks with a red jacket
  - a mop rack with three coloured handles
  - AO under the ceiling.
- **Small things everywhere at the 0.05-0.15 m scale:** a smiley sticker on each divider, a "PLEASE FLUSH ♥" card over a urinal.
  These are what make his frames read "lived in".
- **Ops room:** a shelf of eight coloured binders (one leaning) and a box above the cork board, a "SAFETY FIRST / 0 DAYS"
  poster beside the window, a printer with a page on the cabinet.
- **The far layer (concourse strip):** a cafe front with a red-and-white awning and cups, a NEWS kiosk, four travellers at
  three sizes (near, mid, far), the departures board, seats, a plant and a suitcase.
- **Quota check (149):** in every hold shot, every 0.6 m of visible wall shows at least one object, and the frame has at least
  one background story element (a note, a sign, a portrait).

## 160. Acting beats (code)
- **Blinks:** every character blinks for 3 frames (0.1 s) every 2.6-3.4 s, offset per character so they never blink
  together. Never during ring, happy, shut or squint eyes. (A face that never blinks reads as a render.)
- **Talk nods:** on each word start inside a spoken line, the head gets a 0.26 s sine impulse:
  - rotation.x +0.05 to 0.07 rad
  - a side tilt of ±0.6 × that, alternating left and right per word.
- **Key-word reactions,** each a short sine impulse (0.3-0.5 s):
  - a head shake (y ±0.18 at 18 rad/s) on the question word ("toilets?")
  - a body lean (x +0.14) and head dip on the threat ("fired")
  - a knowing head tilt (z +0.14) on the punch of a sly line ("bill"), with brows up
  - a double take (y ±0.22 at 22 rad/s) 0.12 s before a squint
  - a hop (+0.012 m) on a happy beat ("promotes")
  - a slow head sway while a character waits or reads (z ±0.06 at 1.6 rad/s).
- **Rule:** at least one visible change on a character every 0.5-0.8 s of screen time: a blink, nod, tilt, expression change
  or gesture. Holding still is only for the deadpan beat before a punchline (Part 19).

## 161. Over-the-shoulder framing
- **The foreground head may cover at most about 25 % of the frame width,** at the edge, never between the lens and the subject.
  Solve on the floor plan: draw the line from the camera to the subject's head. Where it passes the foreground character,
  their head centre must be at least 0.28 m (about 2 head radii) off that line.
- **Always check that the camera is inside the room.** Moving a camera past a wall (x > the door wall) gives a frame that is
  only the wall's colour.
- **Back of the hair:** only 45 % toward the shadow colour, so the back of a head stays readable as hair and doesn't become a
  black blob.

## 162. Still open after round 3
- Hands do not hold props with a visible grip yet (the mitten sits next to the brush and the can).
- His camera sometimes cuts to a quick insert (a hand, a prop) of 0.4-0.7 s inside a dialogue beat. short30 has inserts only
  for the fly and the bill.

# PART 26: the bedrock study (2026-10-25; all 6 videos, every frame and every audio sample; overrides earlier sections where they differ)

Everything here was measured with code, or read off numbered frame-by-frame sheets, in `deep3/`:

| script | what it measures | output |
|---|---|---|
| `audio_study.py` | word timings (whisper small, word level), loudness (EBU R128), stereo width, voice pace, pauses | `audio_<id>.json`, `audio_all.json` |
| `sfx_study.py` | log-frequency spectrograms with words and cuts marked, onsets per band, music bed inside real pauses | `spec2_<id>_<n>.png`, `sfx_<id>.json` |
| `motion_study.py` | per frame: camera zoom, roll and pan from tracked points (captions masked), motion left after undoing the camera, repeat frames, caption box | `motion_<id>.json` |
| `camera_curves.py` | every fast move's speed curve, ease lengths, overshoot; slow-move speeds; zoom habits | `camera_curves.json`, `camera_plot_*.png` |
| `fx_sheets.py` | every frame (or every 2nd/3rd) around 16 effect moments, numbered by time | `fx/*.jpg` |
| `busy.py` | how busy a frame is (edge density by row, fine detail, colour count), his vs ours | `busy.json` |

Hand frames: `hands_sheet.jpg`. Read the sheets in `fx/` before building any effect.

## 163. Sound, measured (overrides section 3 where it differs)

| video | LUFS | loudness range | true peak | stereo (side vs mid) | words/s | gaps under 60 ms | pauses ≥ 0.28 s | audio after the last word |
|---|---|---|---|---|---|---|---|---|
| cashier VKsam | −15.1 | 2.0 LU | −3.3 dB | −29 dB | 3.47 | 84 % | 9 | 0.37 s |
| Japan 0m6G | −14.0 | 1.8 | −1.6 | −29 | 3.73 | 84 % | 12 | 0.37 |
| burglar nzbk | −14.1 | 1.6 | −1.7 | −24 | 4.09 | 89 % | 2 | 0.22 |
| jar VS1Z | −14.0 | 2.2 | −1.9 | −30 | 3.63 | 87 % | 9 | 0.10 |
| cannon lnYL | −14.0 | 2.1 | −1.8 | −31 | 3.48 | 90 % | 7 | 0.25 |
| knight jpFJ | −15.0 | 2.4 | −2.8 | −27 | 3.90 | 89 % | 6 | 0.11 |

What the numbers mean, and how to build it:
- **Loud and flat.** About −14 LUFS with a loudness range of only 1.6-2.4 LU: the mix is compressed so hard that no
  moment is much louder or quieter than another. Viewers scroll with the sound low, so nothing may dip.
  - **Build:** after mixing, `loudnorm=I=-14:LRA=2:TP=-1.5`, or a compressor plus limiter that lands there.
- **Mono.** The side channel sits 24-31 dB under the middle, so it's effectively mono. A phone speaker is mono anyway,
  and stereo effects can cancel out on it.
  - **Build:** pan everything centre and render mono or dual-mono (`-ac 1`, then back to 2 channels).
- **The voice is edited tight.** 84-90 % of the gaps between words are under 60 ms (median 0.0 s). Breaths and gaps
  are cut out, and sentences run straight into each other.
  - **Build:** after TTS, trim every silence over 0.06 s down to 0.03 s, except the planned pauses below.
- **Pauses are rare and placed on purpose:** 2-12 per video, each 0.28-0.62 s. Every one sits in one of four places:
  1. **After a sentence that ends a beat:** "winner." "vacation." "paradise." "chest." "torch."
  2. **Around a quoted line:** "shrugs, (0.30) says, (0.32) story of my life."
  3. **On the comic beat:** "wow, (0.38) congratulations, (0.62) just…". The longest pause measured anywhere is
     0.62 s, right after the joke line.
  4. **As a counting rhythm in suspense:** "a ball dropped. (0.30) Then another. (0.28) Then all eight at once.
     (0.32)" (jar 34.6-36.7 s).
  - The fastest video (burglar, 4.09 words/s) has only 2 pauses. Speed comes from removing pauses, not from reading
    faster.
- **Pace across the video** (words/s per tenth):
  - cashier: 3.29, 3.64, 4.16, 3.81, 3.98, **2.42**, 3.81, 3.64, 2.94, 2.77
  - Japan: 3.31, 4.13, 3.47, 3.14, 3.64, 4.63, 4.46, 3.64, 3.64, 2.97
  - No steady speed-up anywhere. The cashier's dip in the 6th tenth is the sad middle beat, matching the energy dip
    in section 20.
  - **The last tenth is read slower in 3 of 6 videos.** The payoff gets room.
- **The video ends on the last word.** Audio stops 0.1-0.37 s after it: no outro, no music tail, no fade. This feeds
  the loop (section 21).
  - **Build:** cut video and audio 0.2 s after the last word ends. The music stops dead with it.
- **Music bed inside real pauses:**
  - **Level:** 7-17 dB under the voice, median 10.6 dB.
  - **Spectrum:** ~39 % of the bed's energy sits below 250 Hz, with the centre around 2 kHz. That is a soft bass line
    plus light plucked or keyed mids.
  - **No beat code can find:** the tempo detector found no steady pulse (confidence ≤ 0.1 on all six). The
    spectrograms show a steady low tone (100-150 Hz) under the whole cashier video, and almost black gaps between
    words above it.
  - **Build:** a bed with a soft bass and plucks, no hard kick or snare. Our bongo bed is drum-led; next time pick a
    bass/pluck track at the same level (volume ~0.11).
- **Sound effects land on the action frame, 0 to +1 frame late**, measured at five known actions:
  - hand hits the button: picture 1.20 s, boom 1.219 s
  - employee lands back in the chair: 1.67 s, boom 1.689 s
  - eyes snap to rings: 2.80 s, boom 2.827 s
  - barrel pops up: 62.33 s, thump 62.311 s
  - whip-up starts: 2.43 s, boom 2.461 s
- **Action scenes get a continuous effects layer, not single hits:**
  - **Cannon broadside:** a low rumble (50-150 Hz) under the voice from 5.25 to 6.3 s. The first flash is 5.27 s.
  - **Splinter impact:** a crash across all bands up to 10 kHz at ~6.6 s (impact frame 6.67 s). Then a wood crackle
    runs for ~4 s while splinters are on screen.
  - **Explosion:** broadband from 61.6 to 62.2 s, a low rumble tail to 62.5 s, then a high hiss splash (62.6-63.2 s)
    for the barrel bobbing up.
  - **Rule:** as long as an effect is visible, its sound keeps going. Quiet story scenes get single soft hits.

## 164. Captions (confirms section 4, adds two facts)
- **On screen in 100 % of frames,** from the first frame to the last, in all six videos. A word stays until the next
  word starts, pauses included. There is never a frame without a caption.
- **Zero animation, measured on ~1,850 word changes:** the box width, height and centre height are identical over each word's
  first 4 frames (median change 0 px).
- Centre height 70.3-70.6 % of the frame, horizontally centred (x = 540). short30 already does all of this; keep it.

## 165. Camera, measured frame by frame (adds to sections 20 and 111)
- **Between fast moves the camera keeps moving.**
  - **Speed:** median 0.13-0.33 % of the width per frame. Only 5-19 % of calm frames move less than 0.05 %/frame.
  - **Push-in default:** 46-85 % of calm frames zoom IN (median 0.08-0.45 % per frame) and only 10-48 % zoom out.
  - **Build:** the default slow move is a push-in. short30's `hold()` already pushes along the view; keep `push` > 0
    on every key unless the shot is a pull-back reveal.
- **Fast moves:** 3.3-6.5 per 10 s (19-41 per video). Each is ~42 frames long including the ramps, with a fast core of
  ~14 frames.
- **Three speed shapes,** measured from the per-frame speed curves (see `camera_curves.json`):
  1. **Snap.** Full speed within 3-5 frames, then a long settle of 10-15 frames.
     - Cashier whip-up to the face (2.33 s): 1.8 → 11.4 % of width per frame in 5 frames, then 14 frames down to 0.75.
       Zoom −139 % and roll −12.9° inside the move.
     - **Build:** `eOut` (cubic out) over 0.5-0.65 s.
  2. **Dive.** Speeds up steadily for the first two-thirds, then brakes hard in the last third.
     - Dolly down onto the ticket (1.03 s): 0.5 → 13.3 %/frame over 14 frames, almost linear, then 13 → 1.4 in 6
       frames. Zoom +171 % and roll 9.3°.
     - **Build:** `eLate` over 0.6-0.7 s.
  3. **Bell.** Symmetric ease in and out.
     - Knight (3.17 s): 11 frames, peak at frame 5.
     - Cashier pull-back (44.73 s): 38 frames, peak at frame 12, long tail.
     - **Build:** `ease` (smoothstep).
  - **Mix:** the peak falls in the first 40 % of the move 39 % of the time, the middle 34 %, the last 40 % 27 %.
    Snaps are the most common shape.
- **Overshoot:** 43 % of fast moves drift back after landing, median 2 % of the width.
  - Examples: Japan's snap down to the button (2.0 s) springs back 6 %; the cannon dive (26.37 s) springs back 7 %.
  - short30 has no overshoot.
  - **Build:** on snaps, overshoot 1.5-2.5 % of the width past the target, then settle back over 6-10 frames:
    `x = eOut(u) + 0.02·sin(πu)·u` at the end of the move.
- **Roll per fast move:** median 2.1°, p90 8.4°, largest 12.9°. In calm frames, roll is only 0.013-0.026° per frame.
- **Direction counts over 157 fast moves:**
  - content moves down (the camera tilts up): 30; up: 16
  - zoom in: 39; zoom out: 22
  - left: 24; right: 26
  - Tilting up to a face and pushing in are his two favourites.

## 166. Animation timing (confirms section 35, sharpens it)
- **Everything is on ones.** Exact repeat frames are 0.1-1 % of all frames. No every-other-frame pattern anywhere: the
  share of frames that dip below both neighbours is ≤ 1 %.
- **The only freezes are deliberate holds on the last word of a sentence:**
  - 8 frames: the claims lady holds a forced toothy smile before "Wow" (cashier 29.13-29.40).
  - 4 frames: the glowing ship holds on "lantern." before a dissolve (cannon 36.83-36.97).
  - The only other freezes are 3-4 frames long: the jar video's last frames (64.44-64.57) and two short holds in the
    cannon video (32.83 and 46.30 s). Nothing in 346 seconds of video freezes longer.

## 167. Expression rules found frame by frame (new)
- **A big expression change passes through a closed-eye frame.** Seen twice:
  - **Cashier:**
    - open mouth with dot eyes (2.60)
    - the sweat drop pops (2.63)
    - the eyes shut to flat lines for 3 frames (2.70-2.77)
    - the eyes open as rings on the boom (2.80); see `fx/sweat_rings.jpg`
  - **Powder sack:** ring eyes → flat lines for 3 frames (29.60) → happy arcs (29.70); see `fx/powder_sweat.jpg`.
  - It reads as a blink and hides the swap, so the new face "pops" without a morph.
  - **Build:** every change between two different eye shapes goes `old → closed (2-3 frames) → new`.
- **Brows disappear while the eyes are rings** (cashier 2.80-3.07). Rings plus brows looks busy and less shocked.
- **One eye first** when waking or realising (jar):
  - one eye opens while the other stays shut (34.60)
  - one ring eye (35.13)
  - both rings, brows up (35.27): ~0.7 s in three steps
- **Laugh** (jar, the emperor and guards, 5.93-6.93):
  - **Face:** eyes become ^ ^ arcs, a pink oval blush sits on each cheek, and the mouth opens with a top and a bottom
    row of teeth.
  - **Head:** tips back ~10-15° and the hat follows.
  - **Stagger:** the emperor 5.93-6.00, the right guard 6.13, the left guard 6.33 (4-10 frames apart).
  - **Timing:** the laugh lands on the word "burst" (6.00).
- **Smug** (knight): neutral → half-lidded eyes with a small smile (34.8) → toothy grin (35.5). Two steps over 0.7 s.
- **Fear** (pirates): ring eyes, a rectangle mouth with a two-row teeth grid, hands on the head. The face holds for the
  whole shot while the body shakes and characters in the back jump (8.07-8.33).
- **Forced smile:** a toothy grin held still for 8 frames before the real reaction (claims lady, 29.13-29.40).
- **Anger** (the priest, knight video 33.9 s): the whole head is red, with V brows, teeth, a sweat drop, and 2-3 small white steam
  wisps beside the head.
- **Hair follows through:** the cashier's hair tuft keeps swinging for 3-5 frames after the head stops (left, centre,
  right, settle; 16.28-16.48).
  - **Build (suggested, not measured):** tuft rotation = a damped spring driven by the head's angular speed, ~5 Hz,
    damping 0.25, so it swings once each way in ~6 frames.

## 168. How each effect is built (frame counts, shapes, colours; read the matching `fx/` sheet)

| effect | where (sheet) | timing | construction |
|---|---|---|---|
| **sweat drop** | cashier 2.63 s, sack 28.90 s | pops on 1 frame (no grow), then stays still for the whole beat | blue teardrop with a dark outline and a pale highlight, ~10 % of the face width, at the upper right of the face on the hairline or brow line. It never slides down. |
| **impact star** | Japan 1.20 s (`eject`) | 3 frames, then gone | 8-10 short black strokes radiating from the contact point (each ~6-8 % of the width) plus a small yellow spark on the contact. The frame jolts down on the same frame. |
| **focus lines** | jar 5.00 s (`laugh_tears`) | 2-3 frames on a shout ("run!") | thin white lines radiating from behind the head out to the frame edge |
| **shock dashes** | jar 36.20 s, Japan 1.47-1.53 s | 1-3 frames | 5-8 short dark dashes around the head |
| **speed streaks** | Japan 1.27-1.37 s (going up), 1.60-1.63 s (falling) | while moving | 4-8 thin white straight lines trailing the body, each 10-15 % of the frame height |
| **launch smoke** | Japan 1.37 s on | appears with the launch and stays | a white lumpy cloud of 6-10 overlapping balls, blue-grey shading on the underside, no outline, sitting on the floor at the bottom of the frame |
| **broadside** | cannon 5.27-6.53 s (`muzzle`) | flashes ripple left to right ~2 frames apart, each 3-4 frames, ~0.3 s in all; then smoke blooms in the same order | each port: a yellow-white star with soft bloom and one short orange flare ray. Smoke: white balls that merge into one low cloud bank along the hull. Tiny dark cannonballs fly out of the smoke toward the lens. |
| **splinter storm** | cannon 6.67-8.9 s (`splinters`) | hit 0.3 s, storm 2+ s | **hit:** a jagged hole (dark outline, light inside) and a spiky brown "sea-urchin" burst of sticks around the ball. **storm:** hundreds of thin pale-tan and brown slivers (long diamonds, 2-4 % of the width; a few big ones near the lens) flying outward and spinning, white smoke puffs behind. It spreads along the deck as the camera pans. |
| **cel explosion** | cannon 61.8-63.5 s (`explosion`) | fireball ~6 frames; mushroom forms in ~10; holds 1+ s | **fireball:** a flat orange disc with a lighter inner ring, fading out. **cloud:** 6-8 big dark chocolate-brown puffs (not black), each with a lighter brown crescent on the upper left, forming a cap and a stem of stacked, shrinking puffs. **base:** a ring of white and orange puffs on the water. **debris:** planks, some trailing a white smoke line. **comic button:** a barrel with 2 tiny survivors bobs up at the stem 0.5 s later, with white droplets. |
| **ground crack** | knight 34.30-34.60 s, jar 61.40-61.90 s | one stroke across the ground, then widens over ~10 frames | a black jagged outline on both sides of a bright orange-yellow core. Zigzag segments ~5-8 % of the width, widening toward the lens. It opens into a hole with small flames and sparks; dark pebbles hop up. |
| **Z's** | jar 33.27 s (`zz_night`) | drift up ~1 % of the height per second | three dark navy Z's, the biggest at the top, rising diagonally from the head |
| **birds** | jar 36.07-36.33 s | lift off over ~8 frames | 6-10 tiny black birds leave the trees in the background when something big happens: the world reacts too |
| **LED counter** | cashier 2.60-2.80 s | rolls ~6 frames and lands on the reaction frame | half-drawn, blurred green LED digits on the register's screen, landing on $1,000,000 exactly when the eyes snap to rings |
| **scanner beam** | cashier 2.20-2.27 s | 3 frames | a red see-through fan of light sweeping across the ticket |
| **sun glints** | jar 60.8-61.5 s | while lit | soft white-yellow bloom spots where the low sun catches an edge |

- **The rolling counter refines the ban in section 145.** Flat UI counters, stamps and percent badges still look
  generated. A physical screen in the world whose digits roll for ≤ 0.3 s and land on the reaction is his.
- **Common rule:** emotes and marks are on screen for 1-3 frames (stars, dashes, focus lines) or for the whole beat
  without moving (sweat drop, Z's). Nothing grows in with a scale animation.

## 169. Transitions found frame by frame (adds to sections 18 and 32)
- **Anchor dissolve** (Japan 2.30-2.57 s, ~5 frames of overlap, `fx/sweat_boss.jpg`): the foreground prop (the button)
  stays sharp and still while the blurred room behind it dissolves into a different room and person. The story moves
  to someone else and the camera doesn't move.
- **Foreground wipe** (jar 5.27-5.47 s): the camera slides behind a big foreground object (the jar), and the new view
  is there when it clears.
- **Travelling reveal** (cannon 4.40-5.00 s): one continuous 0.6 s move links three places with no cut: the sky and
  sails → the deck crowd → the enemy ship far away.
- **Whip into a cut** (Japan 1.23-1.30 s): the cut happens while the whip is still at full speed, and the blur hides it.
- **Hold, then dissolve** (cannon 36.5-37.23 s): the shot holds ~0.5 s on the sentence's last word, then dissolves in
  5-6 frames. This fits section 83: dissolves mark time.
- **Ghost dissolve during a dive** (jar 61.60-61.80 s): the old shot stays as a ghost over the new place for ~6 frames
  while the camera dives.

## 170. Hands and props (closes the first point of section 162)
- **The ball hand sits in front of the prop,** at its edge, corner or handle. The prop's grip point is hidden behind
  the ball. No fingers ever wrap around anything (`hands_sheet.jpg`).
- **By prop shape:**
  - **Flat (ticket, paper):** one ball at the lower corner. The prop is held upright facing the camera, tilted 5-15°
    with the forearm (claims lady 29.63 s).
  - **Wide (wallet):** one ball on each top corner (cashier 15.88 s).
  - **Long (scroll, staff, pitchfork):** the ball in front of the middle, with the prop passing behind it (knight 34.9 s).
  - **Mug:** the ball in front of the mug's body, handle hidden (burglar dad 10.0 s).
  - **Pressing:** the ball comes down from above onto the object, with a sleeve-coloured cuff ring at the wrist (the
    boss's hand on the button, 0.90-1.20 s).
- **Size:** the ball is ~0.17-0.2 of the head width.
- **Build:** parent the prop to the hand. Put the prop's grip point 0.4 × the ball radius behind the ball's centre (away
  from the camera), so the ball always covers it. Tilt the prop with the forearm.

## 171. Quick prop shots (closes the second point of section 162)
- **Short shots come in chains.** In the cashier's shot list (section 12), 6 of 28 shots are under 1 s. They come in
  chains of 2-3, never alone:
  - **The hook:** ticket 0.7 s → label 0.6 s → face 0.6 s (1.0-2.9 s).
  - **The night-to-morning jump:** pull-out 0.6 s → top-down bed 0.8 s → the light changes 0.5 s (21.5-23.5 s).
- **Each lands on the word that names the thing** ("ticket," "had won," "a million"), and each is reached by a camera
  move (a dive onto the ticket), not a hard cut.
- **Rule:** an insert shows the noun being said, in a chain of 2-3, on the hook or on a time jump. Don't drop single
  inserts into dialogue.

## 172. How busy a frame is: his vs our round 3 (measured with `busy.py`)

| measure (median; caption band excluded) | his (346 frames, 1/s) | ours (14 short30 stills) |
|---|---|---|
| edge density, whole frame | **0.058** (p25 0.042, p75 0.081) | **0.028** (0.020, 0.036) |
| edge density by row, top → bottom | 0.034, **0.082, 0.089**, 0.033 | 0.021, 0.037, 0.024, 0.023 |
| fine detail (mean Laplacian) | **4.32** | **1.96** |
| distinct colours (24 levels) | 382 | 314 |

- **Even after round 3, his frames carry 2× the edges and 2.2× the fine detail of ours.** The gap is biggest in the
  middle half of the frame (rows 25-75 %), where his density is 2.2-3.7× ours. Our stills are clean PNGs and his are
  compressed video, so the real gap is a bit larger still.
- **Where his detail comes from:**
  - **A pattern on every large surface:**
    - speckles on counters
    - grain lines on wood
    - mortar lines on brick
    - blades on grass
    - carpet borders and diamonds
    - the weave on the powder sack
    - roof tiles and plank seams
  - **Small props in the middle layer:** posters, binders, bottles.
  - **Thin dark lines** where any two surfaces meet.
- **Check number for every still:** edge density ≥ 0.05 for the whole frame and ≥ 0.07 in the two middle rows. Run
  `busy.py` on the stills before showing them.

## 173. What to change next, in order of measured gap
1. **Surface pattern pass:** the biggest gap measured. Give every surface over ~5 % of the frame a fine pattern at the
   1-3 px scale. Then re-run `busy.py` until it passes 172.
2. **Expressions:** swaps go through a 2-3 frame closed-eye frame. Brows go off on ring eyes. One eye opens first.
   Laugh = arcs, blush, two teeth rows and a head tip, staggered 4-10 frames between characters.
3. **Camera:** a push-in in every hold (already there). Snaps get a 1.5-2.5 % overshoot and a 6-10 frame settle. Use
   the dive shape for arrivals.
4. **Effects library in code**, built to the table in 168: impact star, shock dashes, focus lines, speed streaks,
   sweat drop, smoke balls, splinters, cel explosion, ground crack, Z's, birds.
5. **Sound:**
   - Mix in mono at −14 LUFS with an LRA of ~2.
   - Trim the voice's gaps to under 60 ms, except the planned pauses (163).
   - Give effects a continuous layer while they are on screen.
   - Use a bass/pluck bed with no hard drums.
   - End 0.2 s after the last word.
6. **Hands:** the prop's grip point goes behind the ball (170).
7. **Inserts** come in chains of 2-3 on the noun being said (171).

# PART 27: the characters, closer (2026-10-25; every 0.5 s of all 6 videos; overrides earlier sections where they differ) and round 4

Measured by code, not by eye. 568 front-facing heads were found in his 6 videos (one look every 0.5 s); 249 passed the
"clean" filter (white face 0.45-0.95 of the head width tall, an ellipse fit residual under 0.025, at least 90 px wide, at
least 2 face parts found). Our heads were measured with the same code on the short30 stills. **W = the head's width in
pixels at its widest row**; every size below is a share of W unless it says px.

## 174. How it was measured (all in `deep3/chars/`)
- **`head_study.py`**: finds the white face (V > 170, S < 48), fills its holes, keeps shapes with solidity ≥ 0.90, then
  fits an ellipse to the lower contour (aspect ≤ 2.3). It writes `heads.json` and a crop of every head into `heads/`.
  - **Outline width:** a ray leaves the filled face every 5°, skips the anti-aliased edge (V > 110, at most 12 px), then
    counts the dark run (V below min(110, darkest + 22), capped at 0.16 W).
  - **Edge crispness:** how many px the face edge takes to fall from V 200 to V 80.
  - **Face parts:** the holes inside the face mask, with their position, size and median colour.
  - **Also measured:** the fringe line (a polynomial fit), the skin falloff toward the rim (85th percentile in a window), and the torso (a Lab flood fill under the head).
- **`ours_heads.py`**: the same measure on our stills, started from a seed point inside each head.
- **`summarize.py`**: prints his numbers (p25 / median / p75) next to ours.
- **`limb_study.py`**: measures limb thickness from the ridge width of a distance transform on the ink mask (`limbs.json`). Clear hands were measured by hand from the sheets.
- **Sheets for the eye:**
  - `head_cmp.jpg`, `face_cmp.jpg`: his heads and faces next to ours
  - `bodies_a/b/c.jpg`, `zb1.jpg`: bodies
  - `zh1.jpg`: hands
  - `zf1.jpg`, `zf2.jpg`: feet
  - `hair_hats.jpg`: hair and hats
  - `ours_sheet.jpg`: our characters
- **`deep3/dof_ratio.py`**: depth of field as a number (section 187).

## 175. The head shape

| measure | his (p25 / median / p75) | ours, round 3 | ours, round 4 |
|---|---|---|---|
| edge crispness (V 200 → 80) | **1-2 px** | 3-4 px (soft) | **2 px** |
| white face height | **0.77 W** (0.69 / 0.77 / 0.82) | 0.54-0.65 W | **0.76 W** |
| widest row, down the white face | 36 % | 25-36 % | 45 % |
| ellipse residual (how far from a perfect ellipse) | **0.0072** (0.0068 / 0.0072 / 0.0083) | 0.001-0.006 (too perfect) | **0.0057** |
| lopsided (left vs right) | 0.019 | 0.016 | 0.020 |
| bottom ellipse aspect | **1.11** (1.08 / 1.11 / 1.15) | 1.14 | 1.19 (close-ups seen from below read wider) |
| flat bottom share | 0.43 | 0.41 | 0.37 |

- **The white face is tall.** Hair or a hat covers only the top 11-25 % of the skull; the fringe line sits at n.y ≈
  0.5-0.77 of the sphere.
- **The fringe follows the sphere:** at x = ±0.8 of the half-width the fringe is 0.079 W lower than at the centre, so it
  drops at the sides. It wiggles slightly (RMS 0.012 W). Our janitor's round 3 cap edge curved UP at the sides (−0.12), the opposite of his.
- **Never a perfect ellipse.** His outline wobbles a little (residual 0.0072). A clean math sphere reads as computer-made.
- **Build (our rig):**
  - head x-scale `HX = 1.04` (was 1.08)
  - the bean bulge centred at y = −0.18 R (was −0.3 R)
  - a silhouette wobble `1 + rho⁴·(0.016·sin(3a + 0.7) + 0.009·sin(5a + 2.1))`, where a = atan2(y, x) and rho = the distance from the z axis. The rho⁴ keeps the wobble out of the face centre (section 186.4).
  - the face decal and the fringe read the *round* sphere normal (`n0` attribute), never the wobbled one

## 176. The outline (the single biggest difference from round 3)

| where on the head | his | ours round 3 |
|---|---|---|
| sides | **3.4 %** of W (2.65 / 3.4 / 5.0) | 7.6-10.6 % |
| lower sides | **6.0 %** | |
| chin | **7.2 %** (the head line and the torso line merge into one thick dark band) | 0.5-1.2 % (the torso hid the head's line) |
| top | 5.2 % | |
| left vs right difference (share of heads with a clear difference) | **0.62** (hand-drawn: one side thicker) | 0.12 |
| variation along one head (std / mean) | 0.50 | 0.32 |

- **By head size:** 90-200 px heads 3.2 %, 200-400 px 3.1 %, 400 px and up **4.9 %**. Lines get relatively thicker only
  on big close-ups.
- **Colour:** the line core (43 big heads, 211 samples) is **#2E202A** (p25 #261A22, p75 #3B2B33), a dark plum/mauve.
  R > B > G, never brown, never black. Measured with the ray method the whole run reads #33252F. Our round 3 line showed as
  ~#070908 (pure black), caused by section 186.1.
- **Build:**
  - head hull 0.0084, `vary` 1 with:
    - noise 0.2
    - a low-frequency left/right term `0.22·sin(dot(p, (9, 5, 3)) + 1.3)`
    - lower-side term `1.4·max(0, −n.y)^1.5`
    - sides 0.18·|n.x|
  - torso hull 0.0095, hair hull 0.0096
  - colour `disp('#322530')`
- **Line weight per shot** (`c.lineK`, set in `drawShot`): `(1 + 0.55·smoothstep(px, 380, 540)) · (1 − 0.029 / d²)`, where
  px = the head's width on screen and d = the camera-to-head distance. The second factor removes perspective. A close
  camera sees the inflated shell wider by d² / (d² − R²): 1.3× at 0.35 m.
- **Chin band:** the head hull's lower half is pulled 0.10 m toward the camera in depth only
  (`pull · smoothstep(0.35, 0.8, −n.y)`, vertex shader). The line then wins over the torso, collar and tie, like his merged
  band. The head also sits 0.03 m forward (`HEAD_Z`) so the torso top never pokes through the chin.
- **Edge pass:** a depth line is drawn only on the **far side** of an edge (the nearer surface keeps a crisp rim) and with
  `min()`, so it can never lighten a line. Round 3 drew it on both sides, which put a grey band inside every face rim (the
  soft 3-4 px edges). Pure-ink objects (limbs, ball hands) get no outline at all (section 184).

## 177. Skin
- **His:** V 253 out to 0.6 of the radius, 249 at 0.8, 240 at 0.95; the rim colour is **#EFE2E8** (pinkish lavender).
- **Ours, round 3:** 243 / 238 / 229 with a #E5E0E5 rim. It darkened too early and too grey.
- **Build:** `mix(rim (0.93, 0.86, 0.90), white, smoothstep(0.05, 0.55, facing))`, underside darkening 3 % (was 6 %).
- **Round 4 reads:** 246 / 243 / 238. Most of the remaining gap is the scene tint: the ops and day looks tint the heads by
  design (section 113).

## 178. Face layout (his, in W, measured from the widest row)

| part | his median (p25-p75) | ours round 3 |
|---|---|---|
| eye separation (centre to centre) | **0.275** (0.256-0.283) | 0.31 |
| eye height on the face | **on the widest row** (±0.05) | 0.08 above it |
| eye width including the lid bar | **0.187** (0.18-0.20) | |
| eye height | **0.10** (0.074-0.134) | 0.05 (the sly sliver) |
| mouth, below the eyes | **0.20** (0.19-0.22) | 0.13 |
| mouth width | **0.27** (0.17-0.41) | 0.12-0.17 |
| mouth height | 0.14 (0.08-0.18) | |
| mouth x offset | centred (±0.02) | −0.02 |
| brows, above the eyes (centre to centre) | **0.19** (0.15-0.22) | 0.05 |
| brow width × height | 0.185 × 0.067 | |
| brow x from the centre | ±0.12 | ±0.14 |

- **The face is spread out.** Brows high, eyes on the widest row, the mouth well below. Round 3 packed everything into a
  short band.
- **Mapping onto our face canvas** (the decal is an orthographic front projection, u = n.x/2 + 0.5): 1 W ≈ **1.02 D**
  across, **1.14 D** down below the centre and **1.20 D** above it (the head top is squashed 0.95). D = the canvas size.
  The decal layout in canvas units:
  - **eyes:** x = centre ± 0.13 D (perspective spreads the middle of a close face, so this lands at ~0.29 W); y = the centre
  - **brows:** y = centre − 0.225 D, x = ± 0.123 D, length 0.184 D
  - **mouth:** y = centre + 0.229 D, or + 0.255 D under a moustache
  - **blush:** x = ± 0.215 D, y = + 0.11 D, ovals 0.12 × 0.06 D
  - **moustache:** between + 0.095 and + 0.215 D

## 179. Eyes
- **Two kinds of characters, by eye ink:**
  - **Dark eyes, 70 %:** #41363F (darkest #3A3037).
  - **Grey eyes, 26 %:** a #7E7374 → #978C8B gradient, for the soft, ordinary characters (the office workers, the Kyle
    type).
  - In our cast, the janitor has grey eyes (`eyeInk: 'grey'`); the manager and the travellers have dark eyes.
- **The tombstone eye** (his default open eye, measured on the officer):
  - a tall dark oval **0.098 W wide × 0.133 W tall** hanging under a thick flat **lid bar 0.20 W × 0.03 W** with round caps
  - the bar covers the top of the oval
  - no highlight dot
  - Build: oval rx 0.05 D, ry 0.078 D (grey: 0.048 × 0.07); lid bar 0.16 D long (plus round caps = 0.196 D), 0.036 D thick.
- **The lid does the acting.** The bar sits where the type puts it, and the oval is clipped under it:

  | type | lid line (oval radii above the oval centre) |
  |---|---|
  | `lid` | 0.6 |
  | `open` | 0.9 |
  | `sly` | 0.12 (the bottom half shows) |
  | `angry` | inner end 0.15, outer end 0.85 (slants down to the nose) |

- **Other shapes:**
  - happy = thick ∩ arcs 0.124 D wide, 0.034 D thick, in the eye ink (grey characters keep grey arcs)
  - squint and deadpan = short flat bars 0.128 D, 0.036 D thick
  - shut = a near-flat line with a slight ∪
  - ring = a white disc r 0.076 D, outline 0.018 D, pupil dot r 0.019 D
- **Rules (167):** a new eye shape arrives through 2-3 closed frames. Brows are off on ring eyes. One eye opens first when
  realising.
- **Build (167):** every frame, `stageAt()` runs the stage 0.085 s earlier in probe mode. If a character's eye shape then
  differs from now, this frame draws `shut`. The shock is scripted step by step:

  | from | face |
  |---|---|
  | r0 | the mouth opens |
  | +0.1 s | the sweat drop pops; the eyes close |
  | +0.2 s | the left eye is a ring, the right still shut |
  | +0.27 s | both rings |

## 180. Brows
- **His:** arched, round-capped bars **0.185 W long × 0.035 W thick**, a gap of ~0.12 W above the lid, ink #43373E.
- **Build:** a stroked quadratic with round caps, line 0.042 D. Each shape is [lift, inner drop, outer drop, arch] in D:

  | shape | lift | inner drop | outer drop | arch |
  |---|---|---|---|---|
  | flat | 0 | 0.006 | 0.01 | 0.009 |
  | up | 0.03 | −0.004 | 0.012 | 0.016 |
  | angry | −0.024 | 0.05 | −0.022 | 0 |
  | focus | −0.014 | 0.032 | −0.004 | 0.006 |
  | worry | 0.022 | −0.03 | 0.03 | 0.012 |

  Brows sit just under a hat brim or fringe, and may touch it (his VKsa 6.5).

## 181. Mouths
- **Ink:** #44353A.
- **Open:** a dark **almond/lens 0.25 × 0.10 W**, the inside a dark-red gradient (#3E2C33 → #4E2A33 → #8A3442). No pink
  tongue blob.
- **Grin and fear:** a **white rounded rectangle with a thick dark outline and a 2 × 4 tooth grid** (two rows).
- **Neutral:** a small dark pill. Grey-eyed characters get a grey one (#6E6366).
- **Smile / smirk / frown:** strokes 0.03 D thick, 0.16 D wide.
- **Talking (letters → shapes, section 156):**
  - `o` = a small dark oval
  - `open` = the lens
  - `teeth` / `wide` = a lens with a white strip of top teeth
  - `bar` = the pill (m, b, p)
- **Round 4 build sizes:** open lens 0.2 × 0.11 D (top arch 0.035, bottom 0.075). The first version (0.23 × 0.11 with a flat
  top) read as a grin, so keep the top arched for surprise.

## 182. Moustache, hair, hats, glasses
- **His moustache** (VKsa 6.5):
  - one solid shape (brown) with a thick dark outline and a **centre notch**
  - drooping at both ends like an arch
  - the mouth is a small dark lens under it
- **Ours (our own shape):** a drooping two-lobe shape joined at a notch, grey #A3A1AE, outline 0.018 D. Never his exact
  horseshoe.
- **Hair** (Kyle type):
  - a brown shell with a parting line and tan highlight streaks
  - darker at the fringe
  - a hooked tuft with its own highlight
  - messy spiky hair after an ordeal
- **Hats sit high:**
  - the officer cap covers about the top 20 % of the head and overhangs
  - a bandana edge sits at ~30 % with a gloss band
  - Build: the janitor's brim is at R × 0.6, tilted only 0.04 (a steeper tilt drops the front edge over the brows); the crown's fringe is 0.5, hidden under the brim.
- **Glasses:** thin rings with temple lines.
- **Round 3 artifact:** a white band showed under the hair (the manager) or between the brim and the crown (the janitor). It
  happens whenever the fringe sits above the hat or brim edge.

## 183. Torso and clothes
- **His torso:**
  - max width **0.72 W** (0.61-0.82), widest **58 %** down, visible height ~0.93 W
  - width profile top → bottom: 0.02, 0.33, 0.41, 0.53, 0.54, 0.56, 0.53, 0.59, 0.59, 0.44, 0.11
  - a tall bean, narrow at the top under the head
  - **Ours, round 3:** 0.79-0.94 W wide, 0.71-0.82 tall (too wide and squat).
- **Build:** `TW = 0.78·HW/2` (≈ 0.74 W).
- **Clothes carry lines** (seen on every one of his characters):
  - lapels, pockets with flaps, stitching, seams, buttons, ID badges, fold creases
- **Build:** `clothTex(o)` puts a canvas map on the torso lathe. Canvas x 0.5 = the front, 0.25 / 0.75 = the sides, the top
  = the collar.
  - **Every shirt:** a fabric fleck, two side seams, a dashed hem stitch and fold strokes.
  - **Per character (`o.cloth`):**
    - coverall: two chest pockets with flaps, hip slits
    - suit: lapels with a light edge, two buttons, a breast pocket and hip flaps
    - tee: back yoke and a pocket
    - hoodie: a hood on the back, a kangaroo pocket, drawstrings

## 184. Limbs, hands, feet
- **Limbs:**
  - thickness **0.035 W** (0.030-0.0425): 0.037 W on 140-250 px heads, 0.032 W on larger ones
  - ink **#2C212D**
  - **no outline on limbs** (they are the line)
  - Build: `LIMB_R = 0.0062`.
- **Hands:**
  - **glossy dark balls** ~3× the limb thickness
  - one small light-grey **shine dot** (a teardrop) at the upper middle, about 0.24 of the ball's diameter
  - no thumb, no fingers
  - Build: `HAND_R = 0.021` with a flattened light sphere (#CFC8CE) on the front-top. It is hidden from the depth pass so it draws no lines.
- **Feet:**
  - the leg line bends **forward or outward into an L stub**, the same thickness as the leg, with a rounded end
  - real coloured shoes or slippers only when the feet matter to the story
  - Build: the leg tube runs hip → knee → ankle → heel → toe (toe 0.03 forward, 0.01 out), with a sphere cap at the toe; the shoes are gone.
- **Legs** start inside the torso hem, close together, slightly bowed or knock-kneed. Arms enter from the torso sides.
- **Edge pass rule:** a pixel whose nearest neighbour is limb ink (within 0.012 of the ink value) gets no line. Round 4's
  first stills had grey "hollow" legs with dark borders: the far-side line was darker than the limb itself.

## 185. Light on characters, and other things seen
- **Heads take the scene light:** the boss's head goes pink-beige under a warm lamp. In our build the `TINT` follows the look.
- **Back views:** the back of the head is hair, a balaclava or the hat's colour, never a white skull.
- **Grey-eyed characters:** they also get grey happy arcs and grey mouths; the whole face is softer.
- **Props in hand (170):** the grip point sits 0.4 ball radii behind the ball. Build:
  - the lantern hangs from its handle top (0.148 below the ball)
  - the can hangs from its handle (0.124 below)
  - the brush's grip point (local y 0.085) is placed behind the painting hand

## 186. Renderer bugs found this round (check for all of them in every new scene)
1. **The pipeline shows raw values.**
   - **What happens:** the render targets keep linear numbers and the last copy pass has no colour-space step, so the
     screen shows them raw. Any ink given as an sRGB hex (a `THREE.Color` or an sRGB canvas texture on an unlit element)
     comes out as linear(hex), far too dark: the face ink #4C3B40 showed as #110B0C, and the line #231914 as ~#040302.
   - **What doesn't change:** the lit scene materials were tuned by eye under this pipeline, so leave them.
   - **Fix (inks only):** `disp(hex)` makes a colour whose stored numbers are the hex /255
     (`setRGB(…, LinearSRGBColorSpace)`). Ink canvas textures (faces, effects, the sweat drop) use `NoColorSpace`. Literal
     GLSL colours such as the hair lines are already raw and are written as display values.
2. **A comment swallowed code (twice).**
   - **The cocK line:** `dofMat.uniforms.cocK.value = shot.coc;` sat at the end of a `//` comment, so per-shot depth of
     field never ran and every shot used the default 14. The × 1.5 of section 149 therefore never existed.
   - **The texture line:** `c.ft.anisotropy = 8;` was swallowed the same way.
   - **Rule:** after every edit, scan for `//` followed by code on the same line. This bug class also caused section 153.
3. **The two-sided edge line.** Fixed in section 176.
4. **Made and fixed this round: never key a deformation on an undefined angle.** The first head wobble used
   atan2(y, x), which jumps at the face centre (x = y = 0). The normals there scrambled, and the decal, mapped by normal,
   shredded into strokes. Fixes:
   - fade the wobble with rho⁴
   - map the decal with the original normal (`n0`)
   - drop `n0` in `outline()` before `mergeVertices`
5. **The same comment bug, again this round:** an inline `// 175: …` added in the middle of the head line commented out the
   rest of the loop, and the page failed with "Unexpected end of input". Comments go on their own line above dense one-line
   code.

## 187. Depth of field, measured against his frames (a new check number)
- **The number:** split the frame into a 6 × 10 grid (caption cells left out), take the Laplacian variance of each cell,
  and divide the sharpest cell by the median cell (`deep3/dof_ratio.py`).
  - **His:** **10.4** (p25 5.5, p75 25.9). The median cell's sharpness is 484.
  - **Ours, round 3 (everything at cocK 14):** 65-440.
  - **Ours, round 4 with the shot list's own values:** 21-240.
- **So his backgrounds are far sharper than ours were.** The blur erased every surface pattern, and that is most of the
  busyness gap in section 172.
- **Build:** the per-shot factor is now the shot list's value × 0.4. Far lines stay darker (`fade · 0.35`, was 0.65).
- **Round 4 reads:** ratio 6-24 on 12 of 14 stills (median ~16). The outliers are 16.75 (75, a blurred foreground urinal)
  and 07.95 (44, mid-move).
- **Check number:** the ratio ≤ 26 on every still that isn't a deliberate macro insert.

## 188. How busy, by shot size (refines section 172's check numbers)
His frames split by head size (`heads.json`):

| his shots | edge density | by row, top → bottom |
|---|---|---|
| close-ups (head ≥ 420 px) | **0.039** | 0.009, **0.055, 0.047**, 0.024 |
| medium (head 200-300 px) | **0.058** | 0.036, **0.086, 0.096**, 0.034 |

- **Check numbers:**
  - close-ups ≥ 0.035 overall (middle rows ≥ 0.045)
  - medium and wide shots ≥ 0.055 (middle rows ≥ 0.08)
  - section 172's single number mixed the two.
- **Round 4 results** (`busy.py` method on the 14 stills):

  | shot | round 3 | round 4 |
  |---|---|---|
  | medium and wide stills (09.90, 10.30, 11.60, 14.80, 24.20, 29.00) | 0.032-0.057 | **0.055-0.062**: pass overall; middle rows 0.04-0.08, still under his 0.086 |
  | close-ups (07.95, 12.90, 13.70) | 0.020-0.023 | **0.022-0.029**: still under 0.035 |
  | 16.75 | 0.012 | 0.022 |
  | 00.60 | 0.016 | 0.031 |
  | median of all 14 | **0.028** | **0.040** |

- **What did it:**
  - **The surface pass:**
    - confetti flecks on the floor
    - stipple on the wall paint and flecks on the tiles
    - acoustic dots on the ceilings
    - panel lines and kick plates on the doors and dividers
    - carpet flecks with a diamond lattice
    - wood grain on the desk, a denser cork
    - seams and pockets on the clothes
  - **The depth-of-field fix**, which was worth more than the patterns.
- **Still open:**
  - **Close-ups:** his have busier backgrounds right behind the head; ours show tiles and a poster.
  - **The middle rows of medium shots:** he has props at mid height (chairs, counters, shelves, bottles). Next lever: props
    in the middle layer, not more pattern.

## 189. Round 4 build map (short30/index.html; backup of round 3: `index_r3.html`, `render_r3.py`, stills in `r3_stills/`)
- **Inks:** `disp()`, CHAR_LINE #322530, face and effect textures `NoColorSpace`, hair line (0.165, 0.114, 0.149).
- **Lines:**
  - `hullMat(width, colour, vary, lk, pull, low)` with the per-character `lineK` uniform
  - the head hull's depth pull for the chin band
  - far-side edges with `min()` and no lines on ink
- **Characters:** the head shape (section 175), the face (178-181), torso width (183), clothes, limbs, ball hands with a shine
  dot, L feet (184), the janitor's cap (182).
- **Expressions (167):**
  - `stageAt()` probe and the blink-through rule in `face()`
  - one eye first and the closed frames in the manager's shock
  - the laugh at the end: the janitor on "promotes" (arcs, blush, two teeth rows, head back ~12°), the manager 6 frames later
- **Camera (165):**
  - snaps (`ease: 'out'` with room after them) overshoot by 3.5 % of the move and settle over 8 frames (`k.os`, `k.settle`)
  - `late` moves now use the dive curve (`eDive`: speed rises steadily to 2/3, then brakes hard)
  - the depth of field fix (187)
- **Effects library (168), `FXT` / `FX` sprites:**

  | effect | how it's built | where it's used |
  |---|---|---|
  | impact star | 9 strokes + a yellow spark | the stamp on "eighty", 3 frames |
  | shock dashes | 7 strokes round the top of the head | the manager's ring frames, 3 frames |
  | focus lines | 46 white wedges | behind the manager on "fired", 3 frames |
  | speed streaks | 6 white lines | the manager storming in |
  | smoke | 8 balls with blue-grey undersides, no outline | the dust puff where he stops |
  | Z's | three navy Z's | built, not used |

  - The sweat drop now pops on one frame and never slides.
  - Not built (not in this story): splinters, the cel explosion, ground cracks, birds.
- **Props (170):** grip points behind the ball for the lantern, can and brush.
- **Sound (163, 173.5; `render.py` + `bed.py`):**
  - `bed.py` makes our own bass + pluck bed in code (C-Am-F-G at 104 bpm, root on 1, fifth on 3, plucks on the off-beats, no drums) and replaces the bongo track.
  - The mix is downmixed to mono, `loudnorm I=-14:LRA=2:TP=-1.5`, and ends 0.2 s after the last word (29.65 s).
  - **Not done:** trimming the voice's gaps would move every word away from the shots, so it waits for a re-timed edit.
- **Not built this round:** inserts in chains of 2-3 (171). That is a shot-list change; do it with the next re-timed edit.

## 190. The creator's motion and variety bar (2026-10-27: "more scenes, more angles, it's a bit stiff"; wins over earlier sections where they differ)
The engine now carries this; the builder uses it on every Short (BUILD.md step 3, `@kit motion`).
**Acting is key poses, never pose branches.** A pose set inside an `if (t < x)` branch jumps on the frame the branch changes: measured on
a finished Short, hands jumped up to 17 cm in one frame and stood frozen 80 % of the time. `perform(c, t, KEYS)` blends key to key:
- each move starts on its word and blends over 0.18-0.4 s (default 0.28 s), smootherstep, never linear, never a dead start;
- overlap: the feet lead by 1 frame, the body follows, the head trails 2 frames, the hands trail 1.5 frames, pass the target by ~5 %
  around 80 % of the move and settle back (follow-through);
- anticipation (`ant: 1`): 0.15 s before a big move the body dips ~1.4 cm and leans back ~3 degrees;
- weight: `heavy: 1` stretches the move by 35 % with slow out and slow in (a big body, a heavy prop); `snap: 1` arrives in 70 % of
  the time with an eased first frame (a strike, a shock); the hands overshoot 2 % on heavy, 8 % on snap;
- the idle never stops: breathing ~0.25 Hz (4 mm), a weight shift from foot to foot every ~11 s (8 mm, the feet stay planted), a
  head drift (1.4 degrees), floating hands (6-8 mm); seeded per character so neighbours never move in step; `calm` 0.4 for a still
  listener, 0 only for a frozen gag beat (rare, deliberate).
Story extras (a nod on a stressed word, a jolt on an impact, a prop in the hand) are added on top after perform().
**The camera curves.** A move between two setups swings round what the camera looks at (the midpoint of both look targets): the angle,
the distance and the height each ease from start to end, so the subject turns in front of the lens instead of the lens sliding past
it. Straight on purpose: pushes and small shifts (under ~14 degrees), swings over ~140 degrees, top-down shots, two setups looking at
different places, or `path: 'line'`. Before the first frame every curve is flown once on its middle moment; a curve that would pass
through a character, a wall or a prop takes the other side, and if both sides are blocked the move stays straight. Roll on moves and
the handheld float stay as measured (sections 1, 20).
**Angles by name.** `camAt(kind, { at, from })`: wide (2.1 m), full (1.3 m), medium (0.88 m, waist up), close (0.62 m, head about a
third of the frame), low (camera at knee height looking up: the hero shot), high (1.95 m up looking down), top (straight down),
profile (side on), over-the-shoulder (behind the near character's shoulder onto the other), POV, insert (a prop at 0.34 m). Each
frames by the character, alternates the side of the face per call, and steps round walls, counters and heads by itself.
**Variety, measured by check.py on shots.json:**
- at least 2 places (3 when the Short runs over 35 s), each seen from more than one side;
- the shot size changes on every cut; at least 4 sizes appear; no setup repeats more than twice (setups >= 60 % of shots);
- about one shot in four off eye level (low, high, top, over-the-shoulder, POV, profile), at least one per ~12 s;
- shots hold 1.4-2.5 s on average: calm, never a cut every second, never dragging.
**Why:** viewers read a frozen hand or a pose that pops as cheap animation long before they notice a texture; and a Short shot from
one height at one distance feels like a single stage even when the story moves. Curved moves, layered acting and changing sizes are
what make the 3D Cartoon read as directed.
**Hits on the stressed syllable.** Legion measures the voice: every word carries its stress (0..1) and when its loudest syllable
starts. Big actions and camera punch-ins use `wBeat('word')` (the syllable), not `wStart` (the first sound); 'talk' gestures only
on the stressed words, bigger on the harder ones. `stressed(from, to)` picks the words a stretch should hit, loudest first.
**Walking and depth (creator, 2026-10-27, after the Circle test: "it lacks depth and consistent clean smooth walking").**
- Walks: `walkPath()` only. Feet planted (measured on the test walk: under 1 mm of slide per frame while the body moves 20 mm),
  a whole number of steps fitted to the path, eased start and stop, a bob lowest on each contact, a sway over the standing foot,
  arms swinging opposite the legs a few frames behind, the head level, corners walked round. A walking character is never slid.
- Depth: the engine adds atmospheric haze by itself (far things fade toward the look's sky colour from ~2.6 m, full by ~13 m;
  the sky and the near set stay clean, so rooms are untouched). It shows depth only if there IS depth: every outdoor set needs a
  far layer (buildings, trees, hills, a skyline 8-20 m out), a mid layer and, in about 60 % of shots, a blurred foreground object
  at the frame edge (section 14). A set that ends 3 m behind the characters looks like a stage flat, haze or not. Night looks
  keep a lit key on the faces (white heads stay white, never lavender: night colour goes into the set and the rim, not the skin).

