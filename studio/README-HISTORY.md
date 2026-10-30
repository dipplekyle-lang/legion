# HISTORY — the story of a place, in paintings

Long-form history told calmly and in order: how a city, an empire or a dynasty rose and changed. Every picture is a
sepia oil painting that moves and dissolves into the next, and the maps are embossed parchment where realms spread
and armies march. Learned from a reference channel shot by shot (pacing, the picture-to-script logic, every graphic
measured to the frame, the sound levels), then given more motion.

## What a video looks like

- **Paint everything, film nothing.** Every picture is an oil painting in one sepia look (`look.still_suffix` is
  added to every prompt, `GRADE` in `history_kit.py` evens out the colour). There is no footage, no stock and there
  are no captions.
- **The picture shows exactly the sentence.** The art director paints about one picture per ten seconds of narration
  and keeps three in four of them literal: the place at that moment, the event at its most visual instant, or the
  ruler doing what the sentence says. When there is nothing to paint, it shows the same time and place happening to
  people, never a symbol.
- **The camera never stops.** Each painting moves on one of seven slow, eased camera moves: a push drifting up, a
  drift up or down, a pull-out, or a pan. A new picture dissolves in over 0.7 s where a sentence starts. A painting
  held longer than about 9 s gets a second crop about 10 % closer, dissolved in over 0.6 s in the middle of a
  sentence.
- **The paintings come alive.** In each video up to ten paintings, the ones held longest, are set in motion with
  Seedance on kie.ai: water, smoke, flags, sails and crowds move while the camera move carries on. Clips shorter than the hold
  are slowed down (never below half speed) and played back and forth. Without a `KIE_API_KEY` the paintings stay
  still and only the camera moves.
- **Titles name things before the narrator does.** The place, event or dynasty goes up in spaced Roman capitals
  (Cinzel) with the year in italic (EB Garamond), with its picture, about 3 s before the name is spoken. A glint
  passes over the letters. A title is the only thing a hard cut goes into, and only in a pause.
- **Every ruler who acts gets a medallion.** It is a round, gold-rimmed portrait painted in the same look. It springs
  in at the lower left, or on the map at the ruler's city.
- **The maps.** Parchment with relief shading, water lines along the coasts, cloud shadows drifting across and a few
  degrees of tilt. Realms spread from their seat on the word that names them. Army, trade and voyage routes draw
  themselves with arrowheads. Battles get roundels; places, seas and the year are labelled. The camera can zoom from
  a whole sea down to a region. Each map dissolves in from the painting before it, and can fly into the place the
  next painting shows.
- **The paper burns at the great turning points**, at most twice a video and never in the last 20 s. Once or twice a
  video a soldier stands cut out in front of the painting. When the narration gives a population, a counter shows it.
- **Sound.** One orchestral score plays under the whole video, about 9 dB under the voice. The narrator is a deep,
  even male voice at about 144 words a minute. Effects are quiet and sit only on maps, titles, medallions,
  counters and burns; painting dissolves have none.
- **The script** runs in chronological order. It opens on the founding legend, gives each ruler a beat and ends on
  the great change.
- There are no captions, lower thirds, boxes, logos, charts or retyped quotes.

## Files

| file | what it is |
|---|---|
| `styles/history.json` | the channel: voice (Connery, a deep documentary narrator), pacing (a painting every ~9.7 s, maps first), the art director's painting prompt and the painted look, director notes, the motion pass (`look.history_motion`), sound |
| `assets/kits/history.js` | 10 scene types: title, medallion, counter, cutout, reframe, burn, realm, route, battle, mapzoom, plus the moving painting itself |
| `kits.py` → `KITS["history"]` | the director's menu (one JSON example per type), durations, fonts |
| `history_kit.py` | the timeline pass that turns every still into moving paint (camera moves, re-crops, dissolves, burns, all timed on the words); the map geometry (Natural Earth coasts, relief, realms, routes); portraits and cut-out figures; the motion pass |
| `assets/kits/history/` | the stills `kits.py preview history` draws on |
| `assets/styles/history.jpg`, `samples/history.mp4` | the card and a 2-minute sample (The History of Alexandria) |

## Try the pieces

```bash
python kits.py preview history            # every scene type -> preview/kits/history_*.mp4
python kits.py preview history realm      # one type
```

## Making it yours

- **Another narrator:** change `voice.voice_id`. Any deep ElevenLabs voice works.
- **The painted look:** `look.still_suffix` is the style sentence added to every picture prompt. The grade is
  `GRADE` at the top of `history_kit.py`.
- **Moving paintings:** these settings live in `look.history_motion`.
  - `max`: how many paintings a video sets in motion; `0` keeps them all still.
  - `min_s`: the shortest hold that gets a clip.
  - `resolution`: `"720p"`, or `"1080p"` at about 2.3 times the price.
- **Music:** put your own orchestral tracks in `assets/music/history/`, or name one in `look.sound.track`. With an
  Epidemic Sound key in `.env`, every chapter gets its own orchestral track chosen by mood (`look.sound.epidemic`).
- **Pace:** `pacing.photo_every_s` is the number of seconds per painting.

## Cost

- **Pictures and voice:** about $0.10 a minute. That is about seven paintings a minute, counting portraits, at about
  $0.011 each on Algrow top-up credits, plus the voice.
- **Moving paintings:** $0.15 for a 5-second clip and $0.30 for a 10-second clip at 720p on kie.ai. At most ten a
  video, so $1.50–3 a video.
- **Claude:** there is no footage to watch. Claude Code writes, directs and fact-checks on your Claude plan.
- **Render time:** about 8–10 minutes per minute of video, because every painting and map is drawn frame by frame
  in the browser.

## Limits

- **No closer than 350 km.** Maps can't show a single city's streets.
- **Today's coastlines.** The coasts come from Natural Earth, so a harbour that has since silted up appears as it is
  today.
- **Imagined faces.** Rulers' faces are imagined portraits in the period's look.
- **Seedance sometimes moves too much.** The prompt locks the camera and the composition. A clip that fails to
  prepare stays a still painting.
