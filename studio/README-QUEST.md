# QUEST — history played as a 3D video game

"Level one. You're a recruit…" Real history, real careers and real lives told as a bright 3D video game the viewer
plays: a chibi hero levels up through every rank, stage or era while a game HUD tracks it all. Learned from an
"every level of the Roman army" reference shot by shot (the HUD measured to the pixel, the level-up timing to the
frame), then made to work for any progression.

## What a video looks like

- **The viewer is the hero.** A chibi toy figure with a face — a big round head, dot eyes with a catch-light, short
  brows, pink blush — who keeps the same face all video and gets a visibly richer outfit at every level: a tunic,
  then segmented armour, then a crested helmet, a cape and medals. Everyone else is a chibi too: squads, centuries
  and armies of thousands marching in step, crowds, named characters with their own look.
- **A low-poly toy world.** Faceted green hills, cypresses and umbrella pines, puffy cartoon clouds, pale stone roads
  with milestones, tents, columns and temples, castles and towers, in bright daylight with soft shadows. Biomes for
  meadow, autumn, desert, snow, beach, volcano and the Moon.
- **A game HUD on every frame:** the gold laurel level badge with the rank and an XP bar that fills through the
  level (top left), three stat bars that fit the story — PAY / DANGER / PRESTIGE for an army (top right), quest cards
  that count up ("MARCH 20 ROMAN MILES 17/20", a pie timer) and tick off, and a six-slot item hotbar (bottom).
- **Level-up cards** on the very words: a gold "LEVEL" and a huge white number over a rotating golden sunburst, the
  hero spinning in a column of light behind it; the card flies into the badge and the new rank appears in gold caps.
- **Game devices for the facts:** an item pickup toast, an unlock plate with a padlock, a boss bar with a counter
  ("5,000 SOLDIERS"), achievements, place banners; in the 3D world: "YOU ▼" over the hero in a crowd, name plates over
  the others, a red danger bar over whoever is at risk, an RTS selection box round a unit, a treasure chest that
  bursts with coins, a golden ring turning in the air, a camp that builds itself, the golden gate of the final level.
- **The level map** opens and closes the video: pads joined by paths, the hero's light moving along them — and, for a
  twist, the first pad struck out in red.
- Fast game-camera edit (2-5 s shots: follow, orbit, push-in, crane, top-down), no captions (the HUD is the text),
  bright adventure music and game sounds on every HUD event.

## How it is made

1. The script is written as levels ("Level one. Page." … "And the final level. King." … the twist).
2. `quest.py` (a scene module that runs before the 3D): one Claude call reads the timed narration and designs the
   **playthrough** — the levels and ranks, the hero's outfit at each level, three stats and their values, the items,
   quests, unlocks, the boss and the achievements, each on its words — and writes the HUD timeline
   (`<job>/quest/game.json`), the 3D director's notes with the hero's look per level (`<job>/beats.md`) and the HUD's
   sounds for the mix.
3. Legion 3D directs and renders the whole film under the engine's **game** look (`threed/engine/lib/game`: the
   chibi figures, the toy world, the game set pieces and tags), with the usual previews, review and repair.
4. `quest_hud.py` lays the HUD over the finished film (frames rendered only where the HUD changes).

## Files

| file | what it is |
|---|---|
| `styles/quest.json` | the channel: voice, the level-by-level script prompts, `look.threed.preset: "game"`, `look.quest` |
| `quest.py` | the playthrough (Claude), `game.json`, `beats.md`, the HUD sounds, `hud_pass` |
| `quest_hud.py`, `assets/kits/quest_hud.js` | the HUD renderer and the overlay pass; `assets/sfx/quest/` its synthesised sounds |
| `threed/engine/lib/game/` | chibi.js (the people), crowd.js (squads to armies), world.js (the toy world), props.js (set pieces), tags.js (world-space game UI) |
| `threed/director/looks.json` → `game` | how the 3D director stages the game look |

## Try the pieces

```bash
python quest.py plan "<job folder>"            # (re)design the playthrough of a job whose voice is done
python quest.py hud "<job folder>" video.mp4   # lay the HUD over a finished film
python quest_hud.py demo                       # the HUD over a test picture
```

## Making it yours

- Titles that work: a progression — "Every Rank of the Roman Army", "Level 1 to Level 10 Pharaoh's Builder", "Every
  Stage of a Medieval Knight's Life", "Every Level of a Pirate Crew".
- Another narrator: `voice.voice_id`. A bright, friendly voice suits the format.
- Music: Epidemic Sound finds it when your key is set; otherwise put adventure / orchestral tracks in
  `assets/music/quest/`.
- The HUD's words follow the channel's language (English, Czech, Polish and German built in).
- Rendering needs this computer's graphics card (the render farm cannot render 3D), about 15-20 minutes per minute.
