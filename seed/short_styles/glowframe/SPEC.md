# GLOWFRAME (working name): style spec, measured from two reference explainers (A: 21:44, B: 15:13)

Everything below is measured from the two reference videos (both 1280x720, 60 fps). Nothing here copies its words, mascot,
logo or art: only the grammar. Adapted for Legion: vertical 9:16 Shorts, 15-180 s.

## 1. What it is
A narration-led explainer drawn as **flat vector illustration on near-black**, lit by neon glows. One idea per sentence,
shown as a small self-contained picture that moves continuously. The narrator is dry and funny; the pictures are
dead serious. No presenter, no footage, no burned-in subtitles.

## 2. Measured numbers
| What | A | B |
|---|---|---|
| Narration pace | 144 words a minute | about the same (calm, even) |
| Loudness | -16.4 LUFS, range 2.3 LU, peak -3.0 dBFS | -15.5 LUFS, range 2.2 LU, peak -2.7 dBFS |
| Hard cuts (scene detector) | 93: median shot 8.9 s, mean 13.8 s, longest 81 s | 73: median 8.6 s, mean 12.2 s, longest 75 s |
| Big visual changes (cut, morph, flash, zoom-through) | about 11 a minute, median gap 3.8 s | about 15 a minute |
| Picture in motion | 60% of the time, 13% nearly still | 65%, 12% nearly still |

Two videos, the same machine: flat loudness around -16 LUFS, a shot of 8-9 s, constant motion. That is the rule, not luck.
| Link to the narration | about half of the big changes land within 0.5 s of the start of a sentence |
| Link to music hits | none worth building on (24%, chance level): music is a bed, not a metronome |
| Brightness | A: mean 45 of 255 (a dark film). B: mean 117 (a bright film). TWO MODES, see section 3 |

## 3. Palette: two modes (k-means over each whole film)
**NIGHT mode** (video A, and every micro-scale scene of B): near-black or deep indigo ground. Grounds (about 62% of pixels): #000002, #030A17, #041B2A, #0F1E4E, #230A1E.
Mid tones: #0F4E3A (deep green), #177982 (teal), #4C2B81 (violet), #761634 (crimson).
Accents: #C2E0E5 (pale cyan, text on dark), #477FD4 (blue), #DB7443 (orange). Plus neon pink/magenta, mint green
(#4FE3A0 area), yellow (#F5C518 area) for glows and labels. Rule: ONE dominant neon per scene (green, magenta, blue
or orange), never all at once; the rest stays dark.
**DAY mode** (video B's human, lab and concept scenes): a flat pastel gradient ground, vertical or diagonal: pale cyan
#C1E5EB (21% of the film), mint, butter yellow, peach, lilac, plus the deep indigo/violet #190D48 / #41085F / #37209B
(35% of pixels) for the cell world. Accents: saturated blue #3F9DE4, violet #9846E9, magenta #A31B74, orange #D66328,
yellow #F0CB2E, green #3F8F53, warm skin tones #D6B99A. Rule: ONE mode per scene; the mode CHANGES at a topic change
(micro-world = night, people and ideas = day), never mid-shot.

## 4. Picture grammar
- Subjects are simple geometric characters ("pods": a rounded shape with one big glowing eye), OR flat vector people with
  big simple heads, glasses and one clothing colour (day mode). Never realistic. Expert and patient shown as a flat person.
- Cell / micro worlds: rounded blobs with a thick bright outline and a glowing nucleus, packed in tissue-like rafts.
- A story's hypothetical or flashback is shown as a flat violet monochrome silhouette (everything one hue).
- Soft radial halo behind the subject; a thin rim light with a slight red/green split on the dark scenes.
- Isometric cut-away rooms and cities with a magenta or amber halo (the "diorama").
- Crowds as a repeating grid of tiny characters that change one at a time (many = scale).
- Diagrams drawn as the scene itself: mazes, a line with two labelled ends, networks of glowing nodes, a ladder, folders,
  a server hall, circuit traces, a globe wrapped in lightning.
- UI as a prop: chat windows, a terminal box, headline cards, isometric stacks of documents.
- Hard beats: a pure black frame with one red glowing dot.

## 5. Camera and motion
- Never a locked frame. Slow push-in, slow orbit or tilt inside every scene (about 0.25% a frame), easing in and out.
- Emphasis = zoom into the eye until it fills the frame.
- Transitions: grid zoom-through, ink-blob / smoke morph, glitch flash, whip, cut to black. Never a plain crossfade.
- Elements arrive in 2-4 frame staggers with a small overshoot, then settle; text never moves while it is being read.

## 6. Text system (all drawn in code, ten pieces)
1. **Chapter card**: dark gradient with faint green "digital rain" glowing from the bottom. A small kicker in wide-tracked
   capitals types out letter by letter (about 13 characters a second, mint green); then ONE big title line appears
   whole (sentence case, rounded monospace, pale mint with a soft glow, about twice the kicker size). Holds about 2 s.
2. **Chip label**: rounded pill, solid colour (green, magenta, blue or teal), bold white sans text, pops in with a tail
   pointing at what it names. Also used on a dotted timeline (year chips).
3. **Speech / quote bubble**: white rounded rectangle, dark text, curved tail, text types in; attribution in italics.
4. **Quote screen**: tiny muted monospace line at the top ("Direct quote: ..."), the quote typed in the middle in
   small white monospace, framed left and right by glowing "lightning arm" shapes.
5. **Terminal box**: black rounded rectangle, white monospace, a diamond avatar and a tracked-capitals name plate.
6. **Expert lower-third**: a solid green tag pops over the picture with the person's name in bold, then two small lines
   (role, institution) in lighter text. Shown once, the first time that person appears.
7. **Chart scene**: a glowing line chart drawn point by point over a table (weeks as columns, icon per event); question
   marks on points not yet known; the axis label rotated on the left.
8. **UI as a metaphor**: a rounded dialog button with a question ("Why is this so hard?"), chip + radio-list cards
   (Hard / Slow / Expensive), a two-ended slider between two pill labels, stage tabs (0 to IV), a media-player scrubber
   with a pause icon over the scene, a hand cursor clicking.
9. **Comparison cards**: two or three framed cards, each with a picture, a coloured label and a tick or cross (WEAK vs
   DEADLY); a label pops above each.
10. **Big onomatopoeia**: one huge hand-lettered word ("Nooo...") tilted and wobbling, white with a thick dark outline,
    filling the frame for under 2 seconds.
Also: a typed bullet list in green monospace ("UPDATE:"), a wide-tracked capitals title over a diagram.
No subtitles under the narration. No sponsor reads, no "Advertisement" bar, no shop or badge segments.

**Cinema moves** (about one in ten scenes): letterbox bars (2.35:1) for an action scene; a scanline glitch with a rewind
icon for "going back"; a hard cut to pure black with one dot of light; a zoom through a hole into the next scale.

## 7. Structure (the reference, 21 minutes; a Short keeps the order, compressed)
0:00 date card, then the whole premise as 8 short true-sounding sentences (the hook), then the promise to the viewer.
0:51 "set the stage": what the thing is vs what people think it is, one scale (rock ... us) to place it.
2:44 chapter card = the central question, answered with a famous analogy and a known failure.
6:25 the real story begins ("a secret ... is born"): events in order with dates.
10:28 chapter card (the turn), 13:19 chapter card (the escalation), 16:15 "it gets worse" (aftermath, update, opinion).
20:44 close: stakes, not panic, one call to action. (The sponsor / shop / patron reads are NOT copied.)

## 7b. Structure of video B (15 min, a person's story)
0:00 an in-the-moment image told in the present tense (a needle, viruses invading), 0:16 who the story is about and her
expert credit ("thanks to her help we can tell it accurately"), 0:28 her story in order, with the hard parts said plainly,
1:54 a question as the chapter title ("Why do X love Y?"), then the answer as three reasons (first, then, lastly), then the
catch ("it turned out to be way harder"), a chart of the real results, a "why is this so hard" explainer with the
stages, a human close. Same craft as A: question headers, one analogy per idea, dry asides, honest limits.

## 8. Voice of the script
Short declarative sentences. One analogy per hard idea. A dry aside every 60-90 seconds ("and, hmm, Reddit";
"if the maths is mathing"). Honest caveats said out loud ("we have to be careful not to ..."). A direct address pivot
("What should we make of this?"). Real dates and numbers. Ends on a position, not a summary.

## 9. KEEP (identical) / CHANGE (theirs)
KEEP: dark ground + one neon per scene; geometric one-eyed characters (our own shapes); continuous camera on every shot;
about 11 big changes a minute; the five text pieces and their timing; 144 wpm; flat loudness at -16 LUFS; no subtitles;
sentence-start landing of changes; the story shape in section 7.
CHANGE: the topic and every word; the mascot, logo, channel name and any shop / patron / sponsor segment; the exact
character shapes (we draw our own); the narrator's voice (the creator's chosen voice).

## 10. Not decided yet (needs the creator)
How the pictures are made: AI pictures prompted in this look + code overlays (recommended), or drawn fully in code.
