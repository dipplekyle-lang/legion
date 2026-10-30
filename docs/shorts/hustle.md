# Cashflow  (style key: `hustle`)

> Money and side hustles, with energy.

## What it is

Side hustles and money explainers: glossy black, glow, difficulty bars, counters and real props.

Side hustles, online business and money explainers with the energy of the best young creators: footage on a dark glossy stage with a glow and a drop shadow, big two-to-four-word captions popping in the middle with the key word in red, DIFFICULTY LEVEL bars filling segment by segment, glossy 3D icons with one word, money raining over the footage, corner titles with a glossy blob logo, counters rolling up to the figure, one option versus another on scored bars, checklists ticked one by one. Fast cuts, punchy grade.

## Use it when / avoid it when

- **Use it when:** your title fits this pitch: money and side hustles, with energy.
- **Avoid it when:** the topic is outside that pitch, or you need a style that has been tested end to end (Verity is the only one).

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is algrow (Liam Viral Short-Form Storyteller); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Internet access for YouTube footage (yt-dlp, no account needed) and the Internet Archive (free films, no key).
- AI images are ON by default for this style, which spends money on an image provider (fal, WaveSpeed, kie or Algrow) for the pictures it draws. Turn the AI images switch off to spend nothing; the style is then weaker.
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.15 a minute (voice + a drawn picture every 7 s + cutouts); YouTube watching is free on the Gemini tier.
- Render time is about 3.2x the length of the video.
- Every paid step is written in the log with its price. With AI images off, nothing is drawn and no image provider is charged.

## How it looks in a Short (rules that apply to every style)

- 1080x1920, 5 to 180 seconds.
- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption emphasised. (`captions.keep_case` / `captions.keep_font` in the style turn these off.)
- No corner labels (name / place / date tags) on the footage.
- A still photo stays on screen at most 3.4 seconds and moves (a slow pan or push).
- When a stretch has no real footage: a bold card over a real photo, or a code-drawn animation placed on the spoken verb.
- Graphics: a look kit with vertical layouts (`hustle`).
- Its own caption mode (`pop`) is NOT used in Shorts: it was not made for a vertical frame. `SHORTS_KIT_CAPTIONS=1` brings it back.

## Status

- NOT tested in the beta work. It uses a look kit that has vertical layouts, but its own caption mode is not used in Shorts (see below).

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
