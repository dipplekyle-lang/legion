# Seven look kits — seven channels that look nothing like each other

Every style below is a complete design system: its own fonts, palette, caption style and placement, its own way of
framing footage, its own graphics language, its own maps and sounds. Pick one in the app, type a title, press
Create. Each ships with a one-minute sample in `samples/`.

| Style | For | Captions | Footage sits… | Signature graphics |
|---|---|---|---|---|
| **DOSSIER** | true crime, internet mysteries | typewriter, bottom-left, a black bar that fills in | as a tilted print on an aviation chart, EVIDENCE-stamped with a case number, a torch beam sweeping over it | typed CODE RED alerts, red crosshair on the evidence, gold serif name, tracking box + mugshot, two-colour police/suspect dialogue, document stacks, big typed years; yellow typed labels top-right |
| **KINETIC** | essays: psychology, business, dating, culture | kinetic typography: 3–6 words build word by word beside the picture, left then right, the key word bigger and yellow, a negative word red, a sentence's last word in serif italic | pinned to a chalkboard inside a chalk-drawn frame, the line written under it in chalk; stills drawn in the style of the sketched lightbulb, revealed by a sweep and boiling like traced animation | one huge word on each spoken word, chalk icons that draw themselves, the board with a clip, phone cards, a comment with phrases highlighted, headlines scrolling, sources typed; yellow-boxed labels top-centre |
| **ATLAS** | history explainers | comic bold with a dark outline, pops in | as a sheet of paper taped to a cartoon wall; every other drawn still set in motion (Seedance) | a sunburst title card with the story in a badge, TIME MACHINE bar mid-frame, a flipchart of eras with an icon per page, wristwatch with the year, paint-wave wipes that reveal the next picture, scoreboards, signposts; cartoon maps; comic labels top-left; few, quiet sounds |
| **DEEP** | submarines, spy missions, aircraft, rockets | small condensed caps, bottom | real YouTube footage only (no AI stills), inside a dark teal monitor with a timecode, black bars cropped away | stencil datelines, abstract route charts, cutaways with glowing crew, sonar contacts, classified readouts, the map room; two-tone maps with a white route; stencil labels top-left |
| **NEWS** | wars, crises, elections, geopolitics | clean lines on a dark band, never over the news band | opens on three seconds of the channel's presenter at his newsroom desk; footage in a navy broadcast band: red BREAKING tab, the headline strip, a LATEST crawl | broadcast lower thirds (red tag, white headline band, black source band), heat maps, arrows between named places, boxed place labels, a dated timeline of events, tickers, figures with a sparkline; black-boxed labels bottom-right |
| **LEGEND** | "X reveals the 5 …" — the story in the star's own voice | serif lines, bottom (the opening interview has its own) | centred over a blurred copy with a cream keyline; a yellow-bordered close-up inset slides in | opens on a REAL interview clip; the voice is cloned from it and the script continues in the first person; numbered chapter cards, lower thirds, scorecards, the narrator's own line, dated years; a real photo of every person named; serif labels bottom-centre with a gold rule |
| **HUSTLE** | side hustles, online business, money | 2–4 big words popping at the bottom with a glow, key word red | on a flat blueprint grid with a drop shadow; real objects on a cork board | one 2D character, one thing per picture, real platform pages as headlines, DIFFICULTY LEVEL bars, real 3D-rendered icons, real bills raining, counters, versus, checklists; a hissy voice is denoised automatically |
| **HORIZON** | data documentaries: demographics, economies, how a country changes | none | full frame, real news footage of the actual places and people | numbers from World Bank and UN data drawn on navy: a line chart the camera follows as it is drawn, population pyramids turning over to 2100, generations shrinking row by row, odometer figures, country bars, a budget typed digit by digit, real documents with their translation, quotes typed as they are read, chapter tabs; real headlines with a maroon marker; `README-HORIZON.md` |
| **FOLIO** | explainers: how an invention, a discovery or an idea came to be | none | no footage at all — every shot is an illustration Claude draws in code, with parallax, depth of field and one warm light you can see | the same characters all film, places and years in serif labels on the spoken word, numbers that count up, cream-paper diagrams ("Fig. 1") for every "how", whiteouts, pushes into objects, whip pans and paper sheets as transitions, a score written to the edit; `README-FOLIO.md` |
| **HACKER** | hackers, cyber attacks, ransomware, online wars | none | only inside a dark monitor turned in 3D that powers on with a glitch, desaturated and cooled — about one shot in five | neon line characters on pure black, colour = side (a green hooded hacker, a red masked operative, a blue suited agent), alive with a current running round their outlines; eye-laser duels; a dark globe whip-spinning to each named country; networks that grow and change colour; every date and figure decoding in pixel digits; links to a glass police badge; rebuilt posts, chats and taped case files with red stamps; a hidden speaker typed beside a line mask; chapter cards in dripping red caps; `README-HACKER.md` |
| **QUEST** | "every level of …": ranks of an army or an order, stages of a career or a life, eras of a place — played as a video game | none (the HUD is the on-screen text) | no footage at all — the whole film is 3D on your graphics card | the viewer's chibi hero (a face, a richer outfit at every rank) in a bright low-poly toy world; a game HUD on every frame: level badge, rank and XP bar, three stat bars, quests that count up, a six-slot item hotbar; level-up cards with a golden sunburst on the words; item pickups, unlocks, a boss bar with a counter, achievements; in the world: YOU ▼, name plates, danger bars, RTS selection boxes, armies of thousands, camps that build themselves, treasure chests, the golden gate of the final level; the level map opens and closes the video; `README-QUEST.md` |
| **NOCTURNE** | true stories of war, espionage, assassinations, resistance and the Cold War; true crime with archival coverage | quiet condensed lines, bottom | full frame: real black-and-white newsreel and archive.org film, graded silver with a film-gate weave, on the sentences that name real people and events (about a third of the film); everything else is real-time 3D at night on your graphics card | 3D night reconstructions (blue moonlight, haze, silhouettes, one motivated light, red for danger); FPV drone one-takes through the clouds and into the scene; a dossier desk under a lamp with the real photographs and typed name labels; a real portrait lit by a red slit in a black void; negative-flash cuts where the 3D meets the archive; typewriter date strips; each film's source in small light capitals at the bottom left; `README-NOCTURNE.md` |
| **HISTORY** | the history of a city, an empire or a dynasty, told in order from its founding legend | none | no footage at all — every picture is a sepia oil painting on a slow camera move (push, drift, pull-out, pan), dissolving into the next in 0.7 s; the longest-held ones come alive (water, smoke, flags, crowds) | a title in spaced Roman capitals with the year in italic and a glint passing over it; a round gold-rimmed medallion for every ruler; an embossed parchment map with relief and drifting cloud shadows, tilting slightly, where realms spread, routes march with arrowheads, battles get roundels and seas their names; a soldier cut out in front of the painting; counters; the paper burning through at the great turning points; `README-HISTORY.md` |

## Try a style's pieces without a video

```bash
python kits.py preview dossier            # every scene of the kit -> preview/kits/dossier_*.mp4 + .png
python kits.py preview all
python frames.py crt some_clip.mp4        # one footage treatment -> preview/frame_crt.mp4
python maps.py show "Ukraine" --skin heat # a map in the FRONTLINE skin
python sfx.py preview                     # every sound, the new ones included
```

## ✨ Let AI create the style for you (Documentary)

With the **✨ AI Style** card picked (the default; step 1 → Change style → the style library — the plain Documentary
tile switches it off), every Documentary video gets its
own look. Before the script is written, Claude reads the title and designs that film's look from the styles in
this folder:

- **a base look**: the documentary graphics, or a look kit that belongs to the story's world (DOSSIER for a case
  file, COURTSIDE for sport, HORIZON for data, DEEP for war and tech mysteries, HACKER for cyber, HISTORY for an
  ancient era...);
- **optionally a few settings borrowed** from a second look: its captions, palette, title font or footage grade;
- **this film's own** palette, title font, captions, footage grade, map skin, music mood and pace;
- **notes for the writer** (genre, tone, the cold-open scene, the turn, the ending) and **for the editor** (what to
  show for each name, place and number, where to hold a picture).

The narrator stays your Documentary voice and language. Everything is checked before it is used: colours must be
hex, fonts must be files in `assets\fonts`, every other choice comes from a fixed list and every number is clamped.
A value that fails keeps the base look's value; if the design fails altogether, the video is made in plain
Documentary. No 3D: the 3D styles, presenter (AI avatar) channels, teaching channels and styles you made yourself
are never used.

The design is saved in the video's working folder as `auto_style.json` (and `style.txt` names it), so a re-render
of the same title keeps the same look. The run log shows the look's name, its base and why it fits, for example
`look: ✨ Cold War Dossier — created for this title from dossier ...`.

Turn it off with the checkbox under the title, per run with `auto_style=False` (`run_custom`), or for every run
that does not say with `AUTO_STYLE=0` in `.env`. A channel of your own can offer it too: add `"auto_style": true`
to its style file. To see designs without making a video:

```bash
python autostyle.py "The Spy Who Sold America's Secrets to the KGB"
```

## Making one yours

A style is one file, `styles/<name>.json`. The parts you are most likely to touch:

- `voice.voice_id` — pick another narrator (`make_video.algrow_voices(search="deep")` lists them).
- `look.captions` — `mode` (`cluster | typewriter | shout | pop | comic | pill | stack`), `font`, `size`, `accent`, `box_colour`,
  `words` (how many words a shout or a pop shows), `left_x / right_x / top` (where clusters sit), or `"off": true`.
- `look.cinema.frame` — how footage sits in the frame (`blurfill | print | page | stage | crt | monitor | news |
  paper | player | board`) and `frame_every` (every n-th shot; 1 = all); `cinema.ground` swaps the generated ground under `stage`.
- `look.labels` — where and how the director's text labels sit (`pos`, `font`, `size`, `colour`, `box`, `rule`, `enter`, `upper`):
  every style has its own corner and face, so no two channels share one.
- `look.animate` — set every n-th still in motion with Seedance (`every`, `seconds`, `max`, `prompt`; ~$0.12 a clip).
- `look.avatar` — the channel's own presenter opens every video (`id` from `assets/avatars/avatars.json`, `seconds`,
  `provider`); NEWS ships `anchor`, a man at his newsroom desk, for three seconds.
- `look.style_image` — a drawing the image model copies the STYLE of on every still (KINETIC: the sketched lightbulb).
- `look.footage_taste` — one line on the look of the stock footage this channel wants (KINETIC: aesthetic, moody, slow).
- `look.captions.mute_under_frames` — no captions over framed shots that already write the line (the NEWS band).
- `look.maps.skin` — `chart | twotone | heat | cartoon` (or the documentary skins `midnight | paper | clean | film`).
- `look.footage_grade` — the colour grade of every shot (an ffmpeg filter string).
- `youtube_blocklist.json` (all styles) — channels and video ids never used as footage (AI "archive", other creators' collages and composites, satire); add a channel by name, a video by id.
- `pacing.hook_notes` / `pacing.body_notes` — what the director should use when: the rhythm of the edit.
- `prompts.outline` / `prompts.script` — the voice of the channel.

The scene designs themselves live in `assets/kits/<kit>.js` (one `build()` and one `frame(t)` per scene type, every
frame computed from `t` alone) and the list of what a kit offers in `kits.py` (`KITS[...]["prompt"]`, which is what
the director reads). Add a scene there, run `python kits.py check`, then `python kits.py preview <kit> <type>`.

## LEGEND — how the cloned voice works

1. Claude reads the title and names the person speaking in it ("Michael Jordan Reveals the 5 Toughest Defenders").
2. `soundbites.py` finds their interviews on YouTube that have word-timed captions (free).
3. Claude picks 12–28 seconds where THEY speak, on camera, about the theme — clean speech, complete sentences.
4. The clip is cut with its sound. Its audio is cloned on Algrow (`POST /api/voices/clone`, up to 30 s of audio;
   the Professional plan allows 15 clones). The clone is remembered in `assets/legend/voices.json`, so the same
   person is never cloned twice.
5. The script is written in the first person, continuing straight from the words of the clip; the clone speaks it.
6. The clip plays at the very start with its own sound; the narration follows. The person is never shown again.

Without an interview with captions, the style's stand-in narrator speaks and the video is still made.

## The look under the hood (what makes it not cheap)

- **Motion blur on every kit scene**: each frame is the average of three sub-frames across a 180° shutter
  (`kits.SHUTTER`), so fast entries read like After Effects, not like slides.
- **Big text arrives with a blur-in and an overshoot**, then settles; icons fly in from far away and float; a light
  sweeps across the 3D props once.
- **Grounds are generated once by the image model** (`assets/kits/frames/gen_*.jpg`): the chart on a lit desk, the
  glossy studio floor, the blue grid, the submarine console with a blank screen (the footage is placed inside the
  detected screen), the cartoon wall, the cork board, the chalkboard, the dark creator studio, the sunburst title wall.
  Regenerate one by deleting it and running any frame treatment.
- **Captions never fight the footage**: every style's captions sit at the bottom in their own face; KINETIC's pop turns the key word yellow, DOSSIER types into a black bar.
- **HUSTLE props** (`assets/kits/hustle/*.png`) are 3D renders drawn once and cut out — add an icon by adding a
  prompt to the PROPS table in the setup script and a `case` in `hustle.js`.
