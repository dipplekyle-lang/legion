# Evidence  (style key: `dossier`)

> True crime told as a case file.

## What it is

True crime and internet mysteries as a case file on a black table: typed alerts, red crosshairs, real documents.

True crime and internet mysteries told as a case file on a black table: real footage lying on an aviation chart under a spotlight, real posts and documents as cards, notices and messages typed out like a teletype, a red crosshair on what was found, the main person's name in gold serif, a tracking box on the suspect, two-colour dialogue between police and suspect, and a typewriter caption in the corner. Web pages, real photos, maps in a chart skin.

## Use it when / avoid it when

- **Use it when:** your title fits this pitch: true crime told as a case file.
- **Avoid it when:** the topic is outside that pitch, or you need a style that has been tested end to end (Verity is the only one).

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is algrow (Michael C. Vincent Suspenseful Storyteller); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Internet access for YouTube footage (yt-dlp, no account needed) and the Internet Archive (free films, no key).
- Map scenes use the studio's own map data (no key).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.04 a minute with the Gemini free tier (voice + cutouts); about $0.30 a minute when footage is watched on paid credits.
- Render time is about 4.0x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: a look kit with vertical layouts (`dossier`).
- Its own caption mode (`typewriter`) is NOT used in Shorts: it was not made for a vertical frame. `SHORTS_KIT_CAPTIONS=1` brings it back.

## Status

- NOT tested in the beta work. It uses a look kit that has vertical layouts, but its own caption mode is not used in Shorts (see below).

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
