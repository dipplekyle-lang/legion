# Sonar  (style key: `deep`)

> Military and tech mysteries.

## What it is

Submarines, spy missions and lost aircraft in teal and orange: stencil dates, sonar, cutaways, the map room.

Submarines, spy missions, lost aircraft, rockets and the machines behind them, told in teal and orange: real archive footage in a dark monitor with a timecode, stencilled datelines over the picture, an abstract route chart of the journey, a cutaway of the vessel with the crew as glowing figures and the ones the story follows in red, a sonar screen of contacts, a classified readout of the facts, the wall map of a headquarters the camera pushes into, two-tone maps with a white route, and pictures drawn as matte 3D renders where no footage exists. No captions.

## Use it when / avoid it when

- **Use it when:** your title fits this pitch: military and tech mysteries.
- **Avoid it when:** the topic is outside that pitch, or you need a style that has been tested end to end (Verity is the only one).

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is algrow (Connery Deep & Immersive Documentary); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Internet access for YouTube footage (yt-dlp, no account needed) and the Internet Archive (free films, no key).
- Map scenes use the studio's own map data (no key).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.03 a minute with the Gemini free tier (voice + cutouts); about $0.30 a minute when footage is watched on paid credits.
- Render time is about 4.0x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: a look kit with vertical layouts (`deep`).
- It uses the default caption.

## Status

- NOT tested in the beta work. It uses a look kit that has vertical layouts, but its own caption mode is not used in Shorts (see below).

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
