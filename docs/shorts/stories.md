# Storyline  (style key: `stories`)

> One decision, years later, in flat 2D.

## What it is

Second-person money stories over the years, drawn as flat 2D pictures with one recurring character.

Second-person money stories told over years, drawn as flat 2D cartoons with one recurring main character, the same face and clothes in every frame. Replace the cast and the art direction with your own.

## Use it when / avoid it when

- **Use it when:** Second-person money stories ('you did X, years later Y') told with one recurring cartoon character.
- **Avoid it when:** Real-event documentaries. It needs an image provider: with AI images off it cannot draw its pictures.

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is algrow (Jon Warm & Grounded Storyteller); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.15 per minute of video.
- Render time: not stated.
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

- It draws its pictures with the image provider (about $0.15 a minute): turning AI images off stops it.

## Status

- NOT tested in the beta work.

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
