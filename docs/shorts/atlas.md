# Timewarp  (style key: `atlas`)

> History as a bold cartoon.

## What it is

History in a thick-outline cartoon world: a time-machine bar, a flipchart, paint wipes, comic captions.

History explained in a thick-outline cartoon world: every picture drawn flat with bold black outlines and a yellowed-paper palette, a TIME MACHINE bar at the bottom when the story jumps in time, a flipchart of eras and dynasties, a wristwatch showing the year, a bouncy title card, paint-wave wipes between chapters, scoreboards of armies and gold, a signpost of where the story could go, cartoon maps with thick outlines and handwritten names, and comic captions. Playful narration, real facts.

## Use it when / avoid it when

- **Use it when:** your title fits this pitch: history as a bold cartoon.
- **Avoid it when:** the topic is outside that pitch, or you need a style that has been tested end to end (Verity is the only one).

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is algrow (Alex Upbeat, Energetic and Clear); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- AI images are ON by default for this style, which spends money on an image provider (fal, WaveSpeed, kie or Algrow) for the pictures it draws. Turn the AI images switch off to spend nothing; the style is then weaker.
- Map scenes use the studio's own map data (no key).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.15 a minute (voice + twelve drawn stills) plus about $0.50 once for four Seedance clips.
- Render time is about 3.5x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: a look kit with vertical layouts (`atlas`).
- Its own caption mode (`comic`) is NOT used in Shorts: it was not made for a vertical frame. `SHORTS_KIT_CAPTIONS=1` brings it back.

## Status

- NOT tested in the beta work. It uses a look kit that has vertical layouts, but its own caption mode is not used in Shorts (see below).

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
