# NOCTURNE — 3D + archive

True stories of war, spies and assassinations, told the way the best 3D history channels tell them: the moments
nobody filmed are rebuilt in real-time 3D at night, and the moments the world did film are shown in the real
black-and-white newsreel. The two are cut together hard, with a negative flash where they meet. Sample:
`samples/nocturne.mp4` (the 34-second cold open of "Operation Anthropoid").

## What a video looks like

- **A dated cold open in 3D.** One moment, one night: a typewriter strip types the date and the hour ("29 December
  1941 | 02:24") while an FPV drone shot flies through the clouds, under a bomber's tail and into its hold.
- **Night reconstructions.** About two thirds of the film is real-time 3D in a blue-night monochrome: moonlight,
  haze and silhouettes, with one light you can explain (a lamp, a searchlight, a jump light). Red is kept for danger.
  The people are faceless figures in period uniforms and coats; there is never a 3D face.
- **FPV drone one-takes.** The camera falls with the parachutists, chases a car down a dark road, passes a spire,
  orbits a figure and pushes into the detail. Shots are 2-5 s long and cut like a trailer.
- **The real archive.** The sentences that name real people, institutions and events get real black-and-white
  newsreel and archive.org film, full frame, graded silver with a film-gate weave, in short bursts of 1-2 s shots.
  Each film's source sits in small light capitals at the bottom left while it is on screen.
- **The dossier desk.** The real photographs of the people the script names lie on a desk under a lamp, with typed
  name labels, a map, documents and a telegram; a print can slide in on the word that names it.
- **The void.** A real portrait in a black void, lit by a red slit of light, with blue-rimmed silhouettes rising
  behind it: the turn of the story.
- **Negative-flash cuts.** Where the 3D meets the archive, Legion cuts with one punched-in frame and one negative
  frame, so the switch between rebuilt and real always lands as a beat.
- Calm, grounded narration (Jon), captions at the bottom, dark cinematic music by chapter and sound design.

## When to use it

Stories that have both private moments nobody filmed and public events the newsreels did film: WW2 operations,
espionage, assassinations, resistance, the Cold War, coups and defections, true crime with archival coverage.
"The Night They Came for Heydrich", "The Spy Who Fooled Hitler", "Operation Mincemeat", "The Man Who Defected in a
MiG". For a story before film existed, or one that is all daylight, the **3D** channel suits it better; for a story
with no 3D-worthy scenes, **Documentary**.

## What it needs

- **A graphics card.** The 3D renders on this computer, about 10-15 minutes per minute of video (the render farm
  cannot render 3D). Check it with `python threed.py check`.
- **YouTube footage switched on** in Options (it is, by default). It brings the archive.org films too (free, public
  domain and free-licence). With footage off, the whole video is 3D (`look.threed.fill: "auto"`): no AI pictures fill the gaps.
- **Claude Code** for the directing: a 10-minute video uses about 5 % of a Claude Max 5x week.
- The footage watcher: the Gemini free tier watches it at no cost (see the cost table in README.md).

## How it is made

1. The script is written for two kinds of pictures: the private moments for the 3D, and the documented people and
   events for the archive (the channel's own outline and script prompts).
2. Real footage is found and watched for the sentences that name people and events (`look.youtube.brief`: B&W
   newsreel of the story's era, no colourised or upscaled copies, no burned-in text).
3. Legion keeps about 30 % of the picture for that archive on those sentences (`archive_share`); the first 8
   seconds of the cold open stay 3D, and one archive burst is at most 14 seconds.
4. Up to five real photographs of the people the script names twice are found (PHOTO FX, else Wikimedia Commons)
   and handed to the 3D director for the dossier desk and the void.
5. Claude directs the 3D shots in the **nocturne** look, checks preview frames of every shot, fixes the ones that
   fail, and the graphics card renders the final; the negative-flash cuts are added where the 3D meets footage.

## Settings (styles/nocturne.json)

| key | value | what it does |
|---|---|---|
| `look.threed.share` | 0.65 (0.55-0.72) | the 3D's share of the picture |
| `look.threed.archive_share` | 0.3 | the picture kept for real archive on named people and events (0-0.6) |
| `look.threed.archive_after_s` / `archive_burst_s` | 8 / 14 | the cold open's 3D-only seconds / the longest archive burst |
| `look.threed.edge_fx` | true | the negative-flash cut at every 3D-footage join (`false`: plain cuts) |
| `look.threed.photos` / `photos_max` | true / 5 | real photographs for the desk and the void (`false`: none) |
| `look.threed.preset` | nocturne | the 3D look: blue-night monochrome, crushed blacks, one motivated light |
| `look.youtube` | sources archive + youtube, `min_height`, `strict_text`, `brief`, `pick_taste` | what the archive should show and how sharp it must be |
| `look.fx` | full frame, silver grade, slow push, 35 mm grain, gate weave | how the real footage is framed and finished |

## Making it yours

- Another narrator: the Voice step in the app, or `voice.voice_id`. A calm, low documentary voice suits it.
- Music: with your Epidemic Sound key set, a dark cinematic track per chapter is found by its mood; otherwise put
  your own tracks in `assets/music/nocturne/` (it also plays from `assets/music/3d/` when you have filled that one).
- More archive: raise `archive_share` (up to 0.6) and lower `share`. Less: the other way round.
- Paste your own fact-checked script for the tightest result: name each real person in full the first time
  ("Reinhard Heydrich, the head of the Reich Security Main Office") — those sentences carry the archive.

## Licences — check before you publish

- archive.org films are public domain or free-licence; Legion names the films it used in the description
  (FOOTAGE). YouTube excerpts belong to whoever filmed them, as in every documentary channel.
- The desk photographs come from a photo search or Wikimedia Commons, and their licences differ (many Bundesarchiv
  photos on Commons are CC BY-SA 3.0 and must be credited). Each photo's source is listed in
  `<job>/threed/assets/photos.json` — credit the ones that ask for it in your description.
- German newsreels of the 1940s are treated as public domain in the US; a German rights holder may see it otherwise.
  You decide what you publish.

## Credits for the sample (`samples/nocturne.mp4`)

Film: *Deutsche Wochenschau* newsreel of 17 June 1942 and *Why We Fight: The Nazis Strike* (U.S. War Department,
1943), via the Internet Archive. Photographs (Wikimedia Commons): Bundesarchiv, Bild 146-1969-054-16 / Heinrich
Hoffmann / CC-BY-SA 3.0 (Reinhard Heydrich, the portrait on the desk and in the void); Bundesarchiv, Bild
146-1972-039-26 / CC-BY-SA 3.0 (Heydrich at Prague Castle); Bundesarchiv, Bild 146-1972-039-28 / CC-BY-SA 3.0
(Heydrich and Karl Hermann Frank in Prague); Bundesarchiv, Bild 146-1972-039-44 (the car after the attack, public
domain on Commons); a 1939-40 German map of the Protectorate of Bohemia and Moravia (public domain).
CC-BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/de/deed.en
