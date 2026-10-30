# Legion's Shorts engine: how it works and what to do when it doesn't

This file is the shared part. Each style has its own file in this folder; they only describe what is different.

## 1. What it is

Legion (the app on port 7870) starts the **Shorts engine** (the `studio/` folder, port 7871) when you make a Short. The engine runs on your computer and turns a title into a finished 1080x1920 video of 5 to 180 seconds: script, voice, real footage, a planned edit, graphics drawn in code, sound, captions, and a final review of its own result.

The engine is derived from Frontier's long-video engine by Primal Robin, used with his permission for Shorts only and converted to vertical. Long videos and the AI-ads generator stay with Frontier. If you share anything about how it works, share this description, not the code.

## 2. What happens for one Short

1. **Format.** The title picks a format from its words (news thriller, evidence board, levels, creator drama, map countdown). It sets the story shape and how the script is built. `FORMATS_OFF=1` turns it off.
2. **Script.** One Claude call, sized for the length you chose from how fast the voice that will speak really reads (learned from earlier Shorts, stored in `~/.legion-studio/voice_pace.json`). A check then finds machine-sounding patterns (staccato fragments, "Not X. Just Y.", a date as the opening, stock phrases) and one small rewrite fixes them.
3. **Voice.** Order: the style's own service (Algrow), then WaveSpeed (ElevenLabs v3), then ai33, then the computer's own voice (free, robotic). Silences over 0.45 s are trimmed. A speech model times every word.
4. **Footage.** Claude writes a search per sentence. Legion searches YouTube (yt-dlp) and the Internet Archive, watches the videos, picks shots per sentence, cuts them, and a judge rejects clips that do not match their words.
5. **Director.** One Claude call plans scenes per sentence (maps, photo spotlights, headline pages, cards). A truth check compares every on-screen word with the script.
6. **Graphics.** Chromium draws them frame by frame, ffmpeg assembles them: maps with real borders, photo scenes, cards, 22 code-drawn action animations (placed so their peak lands on the spoken verb).
7. **Timeline.** Slots are built; holds and gaps are fixed with designed cards and animations; footage is reframed to 9:16 (follows a face or clear motion, else the centre); frozen cards get a designed move; sound is mixed.
8. **Self-review.** The finished Short is looked at for black frames, flashes, wrong pictures and clipped text, and the safe problems are repaired.

## 3. Services and their fallbacks

| Need | Order tried |
|---|---|
| Text (script, plan) | Claude Code on your plan. When the limit is reached the engine stops cleanly and says when it resets. An optional backup (OpenRouter or Anthropic key) takes over by itself. |
| Voice | Algrow, then WaveSpeed, then ai33, then the computer's own voice. ElevenLabs directly if `ELEVENLABS_API_KEY` is set. |
| Photos (search) | Brave (optional key), Algrow, Wikimedia Commons, the Internet Archive (free licence / public-photo collections), Bing Images. No single service is required. |
| Footage | YouTube via yt-dlp and the Internet Archive's free films. The watcher uses captions and scene cuts; Gemini, Algrow, WaveSpeed or kie only add picture understanding. |
| Cutting an object out of a photo | WaveSpeed's background remover (about $0.004) or kie. Without either, object scenes are skipped. |
| Anything missing | A bold card over a real photo, or a code-drawn animation. Never an AI picture unless AI images are switched on. |

## 4. What costs money

Only these, and each one is written in the log with its price:

- The voice service (cents per Short).
- Object cutouts (a fraction of a cent each).
- AI pictures, **only when the AI images switch is on**. In a Short with AI images off, nothing is drawn, even when there is no footage (`SHORTS_DRAW_FALLBACK=1` overrides this; do not use it unless you want drawings).

Claude is used from your plan, not billed separately.

## 5. Rules every Short follows today

- Captions: all lowercase, heavy type, a warm yellow on the word being said, one key word in every other caption bigger or coloured.
- No corner labels (name / place / date tags) on the footage.
- A still photo stays at most 3.4 seconds and moves (a slow pan across a wide photo, or a push).
- The script never opens on a date or a place; it opens mid-action. It uses no invented comparisons or dramatic adjectives, and no "meanwhile" or "fast forward to".
- Sentences are about 10 to 18 words, joining facts; never strings of 2 to 4 word fragments.
- Cards use bold sans layouts (three, picked per line); the date card has three layouts. The serif card with a gold hairline is not used in Shorts.
- Maps show places in the order the narration names them (a rule added late: confirm it on a story with two places).
- Wide footage is cropped to 9:16 around a face or clear motion, or the centre. Re-cropping one shot into several arbitrary zooms is off.

## 6. Switches (environment variables, all optional)

| Switch | Effect |
|---|---|
| `SHORTS_LABELS=1` | brings back the corner labels |
| `SHORTS_DRAW_FALLBACK=1` | lets a Short with no footage draw AI pictures (spends money) |
| `SHORTS_KIT_CAPTIONS=1` | uses a style's own kit caption mode (not made for vertical) |
| `SHORTS_STILL_PAN=0` | still photos get no pan |
| `SHORTS_GAP_CARDS=0` / `SHORTS_GAP_ACTIONS=0` | a stretched clip stays stretched / no animation in the gap |
| `SHORTS_ACTION_BEATS=0` | no animations placed on spoken verbs |
| `SHORTS_AI_TELLS=0` | skips the machine-sounding rewrite |
| `SHORTS_FACTCHECK=1` | turns the fact check on (it uses web search and much of the Claude limit) |
| `SHORTS_DOCTOR=1` | turns the script doctor on |
| `SHORTS_TRUTH_GATE=0` | skips the on-screen text check |
| `SHORTS_SHAPE=0` | no story-shape hint in the script prompt |
| `FORMATS_OFF=1` | no format picker |
| `SHORTS_JUMP_CUT_S=<s>` | forces re-crop cuts of that length (testing; off by default) |
| `SHORTS_REFRAME=0` | the centred crop only |
| `PHOTOFX_ARCHIVE=0` / `PHOTOFX_BING=0` | removes that photo source |

## 7. Where things live

- Legion's log: `output/legion_run.log`. The engine's log: `output/studio.log`.
- Each Short's working folder: `studio/output/<style>/_work/<title-slug>/` (script, voice, footage, plan, scenes). Finished videos are in `studio/output/<style>/<Title>/`.
- Pressing Make again on the same title **reuses** what is cached (script, voice, footage). Tick "Redo everything" to rebuild; or delete only the file you want rebuilt (for example `plan.json` and `plan_meta.json` rebuild the plan only).
- `~/.legion-studio/` holds the learned voice pace, the downloaded face model and the Claude-limit note.

## 8. Failures and what they mean

| What you see | What it means | What to do |
|---|---|---|
| "Your image provider is out of credit" | The interface turns any error containing 402, credit or balance into this sentence. The real cause may be another service (a paused voice or search subscription). | Open `output/studio.log` and read the lines just above the failure. |
| `HTTP 402 subscription_inactive` in the log | That vendor's subscription is paused (Algrow). | Nothing breaks: the voice falls back, photos come from other sources. Renew it to get its quality back. |
| "Couldn't make this Short ... has an empty name" | An old crash on a slot with no picture. Fixed: such a slot now becomes a card. | Update; clear `plan.json` in that job and press Make. |
| "NO REAL FOOTAGE for this video" | Nothing usable was found or downloaded. | Normal on obscure topics. Cards and animations carry the Short. Nothing is drawn unless AI images are on. |
| "Claude limit reached" | Your text model's limit. | Wait for the reset time it prints, or add a backup text model. |
| A Short is shorter than you asked | The silence trim removed pauses (the computer's voice has many). | The next script is sized from the voice that actually spoke. |
| The same card look every time | Layouts are picked from the line itself. | Expected to vary between stories, not within one. |
| After restarting Legion the style is wrong | A restart resets the Shorts tab to its default card. | Select the style again before pressing Make. |

## 9. Things to know when someone else tries it

- The first Short after a voice change is sized from a default pace; the engine learns the real pace from that Short, so the next one lands closer to the length asked.
- A Short is slow where it watches footage (often 5 to 10 minutes). Short footage budgets scale with the Short's length.
- Real footage is searched online; a title with little footage gets a more designed, less footage-led Short.
- Caption lowercase is deliberate; set `captions.keep_case` in a style to turn it off.

## 10. Known limits (be honest with users)

- Wide archival footage cropped to 9:16 can lose what the shot is about. A stacked layout for it is designed but not built.
- The footage judge can let a wrong clip through, and rejects clips with burned-in captions or logos, which thins the footage on news topics.
- The kit caption modes (pop, pill and others) are not used in Shorts because they were not made for vertical.
- Only the Verity style has been tested on full runs. Other styles share the engine rules above, but were not checked in the beta work.
- No tool can promise that nobody will think an AI made a video. The engine removes the tells people notice, and that is the goal.
