# Collector  (style key: `almanac`)

> The history of people and things.

## What it is

Who someone was and what a thing changed, printed like an almanac: archive film, collector's cards, press proofs.

History told like an encyclopedia entry you cannot put down: who someone was, what a thing was, and how one led to the other. Real archive film and real photographs, printed in three inks mustard, ink black, paper white. Names rise out of dark bars beside each person's real photo, the objects the story turns on become collector's cards, the era's film runs through a 35 mm strip, every frame its own shot, that spins down onto one frame and dives into it, big figures ring up on cash-register drums, and the verdict is proofed on a printing press and stamped.

## Use it when / avoid it when

- **Use it when:** your title fits this pitch: the history of people and things.
- **Avoid it when:** the topic is outside that pitch, or you need a style that has been tested end to end (Verity is the only one).

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is ai33 (Jon Warm & Grounded Storyteller); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Internet access for YouTube footage (yt-dlp, no account needed) and the Internet Archive (free films, no key).
- Map scenes use the studio's own map data (no key).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.05 a minute with the Gemini free tier (voice + cut-outs); about $0.60 a minute when footage is watched on paid credits.
- Render time is about 4.5x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: a look kit with vertical layouts (`almanac`).
- It uses the default caption.

## Status

- NOT tested in the beta work. It uses a look kit that has vertical layouts, but its own caption mode is not used in Shorts (see below).

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
