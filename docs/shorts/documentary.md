# Verity  (style key: `documentary`)

> Real footage, told like a documentary.

## What it is

Real events in real footage, with maps, headlines and photos landing on the exact words. Cut for a Short.

Real stories told like a streaming documentary: real YouTube footage of the actual events, map animations, real newspaper headlines, real photos and objects, Vox-style collage scenes and quiet, premium graphics. No stock footage, no AI pictures.

## Use it when / avoid it when

- **Use it when:** A true story with real footage online: a disaster, a scandal, a historical event, a company. Titles where the footage is famous (a collapse, a launch, a crash) work best.
- **Avoid it when:** Obscure topics with little footage online (the Short then leans on cards and photos), anything needing a person on camera, and fast comedy.

## What it needs

- A text model: Claude Code (your plan) writes the script and plans the edit. When its limit is reached the engine stops cleanly and says so.
- A voice service. The style's own is algrow (Jon Warm & Grounded Storyteller); if it fails, WaveSpeed is tried next, then ai33, then the computer's own voice (free, robotic).
- Internet access for YouTube footage (yt-dlp, no account needed) and the Internet Archive (free films, no key).
- Map scenes use the studio's own map data (no key).
- Chromium (Playwright) and ffmpeg on the machine; both are installed by Legion's setup.

## What it costs

- Style's own estimate: about $0.08 a minute with the Gemini free tier (voice + collage pictures + cutouts); about $0.50 a minute when footage is watched on paid credits.
- Render time is about 3.5x the length of the video.
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

- The title picks a format (news thriller, evidence board, levels, creator drama, map countdown) from its words; see ENGINE.md.
- With little real footage it builds designed cards over real photos and code-drawn animations. It never draws AI pictures unless AI images are on.
- Maps: the planner is told to show places in the order the narration names them (a story about America and Germany should open on America). This rule is new; confirm it on your first story with two places.

## Status

- Tested on real runs (Petrov, Apollo 13, Challenger, Hindenburg, Tacoma Narrows, Chernobyl). Every fix was checked on this style, but the last ones (map order, key-word captions, no AI drawing, moving stills, lowercase captions) were each checked on samples, and not all of them yet on one complete run.

## If something goes wrong

See ENGINE.md, section 'Failures and what they mean'. The most common: Algrow paused (voice falls back), no real footage (cards carry the Short), the Claude limit reached (the run stops with a clear message).
