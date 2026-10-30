# Datapoint  (style key: `horizon`)

> Real numbers, drawn big.

## What it is

Big questions answered with real numbers: lines drawn by a pen, population pyramids, odometer figures, documents.

Big questions answered with real numbers: why a country stopped having children, how a currency collapsed, what an ageing world will look like. Real news footage full frame, and between it the numbers drawn big and calm on a near-black navy the line a country draws while the camera follows its pen, a population pyramid turning over from 1960 to 2100, a hundred people shrinking to five across four generations, a figure that rolls like an odometer, countries side by side, a real document on the table with its translation, a real person's words typed as the narrator reads them. Every figure comes

## Use it when / avoid it when

- **Use it when:** your title fits this pitch: real numbers, drawn big.
- **Avoid it when:** the topic is outside that pitch, or you need a style that has been tested end to end (Verity is the only one).

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is ai33 (Liam clear, curious documentary narrator); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Internet access for YouTube footage (yt-dlp, no account needed) and the Internet Archive (free films, no key).
- Map scenes use the studio's own map data (no key).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.05 a minute with the Gemini free tier (voice + photo cut-outs); the World Bank and UN data is free; about $0.30 a minute when footage is watched on paid credits.
- Render time is about 3.5x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: a look kit with vertical layouts (`horizon`).
- It uses the default caption.

## Status

- NOT tested in the beta work. It uses a look kit that has vertical layouts, but its own caption mode is not used in Shorts (see below).

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
