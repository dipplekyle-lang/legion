# HACKER — the cyber-war documentary style

True stories of hackers, hacker groups, cyber attacks and the people who stop them, told fast and made almost
entirely of motion graphics on pure black. Learned from a reference channel shot by shot (pacing, the footage logic,
every graphic measured to the frame, the sound levels), then made a little livelier.

## What a video looks like

- **Colour is the side.** The hackers are green neon line figures, the enemy is red, police, agencies and platforms
  are blue, neutral facts white, everyone else yellow. It holds for every graphic, map fill and network node.
- **Every named fact gets its own graphic, on the word:** a date or a time decodes out of pixel noise; a number
  scrambles into place under a boxed pixel label; a country fills on a flat dark map with a pixel city label; a list of
  countries is one dark globe whip-spinning to each as it is named; a person or an institution the hackers deal with
  is a glass badge at the end of a dotted green line.
- **The cast is alive**: thick neon tubes (1.75× the reference's line weight), a pulse of current running round
  each outline, a slow breath, a neon flicker now and then, the tube lighting up in a few flickers as it fades in,
  and faint dust drifting through the glow. The agent is a suited figure in dark glasses with an earpiece.
- **Anything abstract** goes to the recurring cast (the green hacker, the red operative, a crowd, a terminal beside
  the hacker restating the action as a command) or to a network that grows and changes colour.
- **Other people's words** are rebuilt: posts as dark tilted cards with a yellow highlight and stamps, intercepted
  chats as messenger cards, findings as taped paper notes with a red CONFIDENTIAL stamp, a hidden group's statement
  typed in green pixel caps beside a line mask in a monitor.
- **Real footage only inside a dark monitor turned in 3D** (the `tilt` footage frame): desaturated, cooled, powering
  on out of the middle with a glitch. About one shot in eight.
- **Cuts go through black or through a glitch** (RGB split, scanline bars, torn slices), every graphic pushes in
  slowly, every cut and element has a sound, the music (dark electronic) never stops and rises on the chapter cards.
- **The hook closes on the video's title**: two lines of dripping caps, the hackers' line green and the other side's
  red, popping in out of a blur on "this is the story of…" (`title` with `font: "drip"`); a group or malware name
  is a pixel wordmark with a line icon instead.
- **Chapter cards**: "CHAPTER I" in white pixel caps and the chapter's title typed in dripping red caps, 8 s, the
  first 6 s with no voice. They come from `## Title | mood` lines in the script; the cold open before the first one
  is not a chapter, so CHAPTER I follows the hook. Legion cuts the pauses into the voice; the kit draws every card
  itself (`hacker.arrange`), so `look.cinema.chapter_cards` stays `false` in the style.
- **The edit** (`hacker.arrange`, on top of the director's plan): graphic cuts to graphic — a gap of up to 2.2 s
  between two graphics is held by the first, so footage only gets real shots (2-6 s); the hook cuts every ~2.4 s
  (scenes the director dropped for room come back, none longer than 4.1 s); the first graphic opens the video at 0:00.
- No captions, no text labels on footage, no photos of people, no presenter.

## Files

| file | what it is |
|---|---|
| `styles/hacker.json` | the channel: voice (fast energetic male, ~190-200 wpm), pacing (87 % graphics, ~3.7 s a picture), director notes, prompts |
| `assets/kits/hacker.js` | 16 scene types: neon, duel, link, network, globe, map, monitor, decode, chapter, post, mask, terminal, note, words, timeline, title |
| `kits.py` → `KITS["hacker"]` | the director's menu (one JSON example per type), durations, fonts |
| `hacker.py` | the scenes' sound marks, the world data for the globe and the map (d3-geo + `assets/maps/geo_lo.json`), the `tilt` footage frame, the edit (`arrange`: chapter cards, hook pace, held gaps) |
| `assets/kits/fonts/PressStart2P-Regular.ttf`, `HKDrip-Regular.ttf` | pixel caps and the dripping chapter caps (HK Drip = Creepster with Czech ěčřůťďň added, renamed as the OFL asks) |

## Try the pieces

```bash
python kits.py preview hacker            # every scene type -> preview/kits/hacker_*.mp4
python kits.py preview hacker globe      # one type
python hacker.py tilt some_clip.mp4      # the footage frame on any clip -> preview/frame_tilt.mp4
```

## Making it yours

- Another narrator: `voice.voice_id` (any ElevenLabs voice); `voice.speed` sets the pace.
- Music: Epidemic Sound finds it when your key is set; otherwise put dark electronic tracks in `assets/music/hacker/`
  (mood folders `dramatic/`, `quiet/`, `inspiring/` work) — Legion rotates them per video.
- The chapter card's length: `chapters.pause_s` (the voiceless part; the card adds ~2 s).
- The side colours live in `SIDE` at the top of `assets/kits/hacker.js`.
