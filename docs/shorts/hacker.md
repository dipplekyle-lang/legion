# Breach  (style key: `hacker`)

> Cyber-war stories in neon.

## What it is

Hackers, cyber attacks and the people who stop them: neon figures on black, globes, pixel decodes, rebuilt posts.

True stories of hackers, hacker groups, cyber attacks and the people who stop them, told as a fast documentary made almost entirely of motion graphics on pure black. Colour is the side: the hackers are green neon line figures, the enemy is red, police, agencies and platforms are blue, neutral facts are white. Every date decodes out of pixel noise, every number rolls up in pixel digits, every place is found on a dark globe that whip-spins to it or a flat dark map that fills it, every person or institution the hackers deal with is a glass badge at the end of a dotted line. Posts, intercepted mes

## Use it when / avoid it when

- **Use it when:** your title fits this pitch: cyber-war stories in neon.
- **Avoid it when:** the topic is outside that pitch, or you need a style that has been tested end to end (Verity is the only one).

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is ai33 (Alex Upbeat, Energetic and Clear); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Internet access for YouTube footage (yt-dlp, no account needed) and the Internet Archive (free films, no key).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.05 a minute with the Gemini free tier (the voice); the graphics are drawn on your computer, no image models.
- Render time is about 3.0x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: a look kit with vertical layouts (`hacker`).
- It uses the default caption.

## Status

- NOT tested in the beta work. It uses a look kit that has vertical layouts, but its own caption mode is not used in Shorts (see below).

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
