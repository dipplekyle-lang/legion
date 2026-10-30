# Inkwell  (style key: `folio`)

> A picture book drawn in code.

## What it is

An explainer that looks like a picture book coming to life: every shot drawn, every number on screen, characters that move.

An animated history-and-science explainer that looks like a picture book coming to life. Every frame is an illustration drawn in code: flat shapes with soft gradients, one warm light you can see, depth of field, cartoon people with big eyes who look the same all film, small serif labels for places, years and names, and engineering diagrams on cream paper ('Fig. 1') whenever the story explains how something works. A calm narrator, a soft score, no footage and no captions.

## Use it when / avoid it when

- **Use it when:** Explainers that work as a picture book: science and history ideas with numbers on screen.
- **Avoid it when:** Topics that need real footage or real people.

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is ai33 (Amy Warm, Mature, Audiobook Narrator (American female)); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: the voice costs cents; Claude draws every shot on your Claude Code plan about $7 of Opus a minute at API prices (a 10-minute video is roughly 2 % of a Claude Max 20x week); rendering runs on this computer, about 20 minutes per minute of video in all.
- Render time is about 20.0x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: the documentary graphics, drawn for 9:16.
- It uses the default caption.

## Specific to this style

- Every shot is drawn in code by Claude, so it uses a large share of the Claude limit and is the slowest style (render about 20x the video length).

## Status

- NOT tested in the beta work.

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
