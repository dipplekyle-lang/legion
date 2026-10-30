# Motion craft

How to make any motion piece feel high-end: Shorts, hype edits, trailers, promos and product videos, for any
creator, channel or brand. These are general principles, not a template. Every piece gets its own story, words and
order; the craft underneath stays the same. They build on the rules `kinetic.py` learned from studied promos and are
checked by `motion_qa.py`.

## Story and pace

- **One idea per shot, about one idea per second.** A shot shows one thing (a number, a button, a line) big enough to
  get without reading small text.
- **Something always moves inside a shot.** A wipe, a count, a cursor, a slow push or a light sweep. A still picture
  that only slides in and out reads as slow even when the cuts are fast.
- **Calm beats are short and deliberate.** An end card keeps a slow push, drift or glow; nothing freezes for a second
  or more.
- **Captions are small and confident** (about 60 px on 1080p): the picture carries the shot, the line names it.
- **Words don't repeat across the closing lines.** If the last line is the payoff word, the line before it uses a
  different one.

## Depth

- **The camera is always in 3D:** a slow orbit (a few degrees of tilt and sway), never a flat front-on view.
- **Layers at different depths:** the main piece in front, one or two soft copies just behind it, and blurred
  material far back that drifts slowly. Parallax from the camera orbit does the rest.
- **Light pieces on a dark ground** (or the reverse) with a soft coloured glow; a film grain and a gentle vignette
  over every frame tie it together.

## Movement

- **Entrances vary:** in from depth, a flip, a whip. Exits are quick (about 0.15 s), entrances land in about 0.2 s
  with an ease-out.
- **Inside-shot animation:** text and bars wipe on, a light sweep crosses a card, pictures push slowly towards the
  subject (a face), lists stagger in a few frames apart.
- **Hand marks** (a pen circle round the key number, an underline under the key word) draw themselves in about a
  quarter second. Use one or two per piece, on the thing that matters most.
- **A cursor is attached to its target** and clicks on a hit, with a ripple where it clicks.
- **No whole-frame pulsing.** The frame does not throb on the beat; sync comes from things on screen happening on
  the hits.

## Sound

- **Every event has a sound:** a whoosh on whips, a soft thump on slams, a pop when cards land, a real mouse click on
  clicks, ticks for words and small parts, a riser into the drop, a deeper thud on the final line.
- **Typed text ticks per letter** (slightly varied pitch and position, a deeper sound on spaces).
- **Sounds are made in code** from the piece's own event list, so they line up to the frame, cost nothing and carry no
  rights.
- **Music:** measure the song first and put events on its real hits (not a round-number grid). A track change goes
  in a silent break, never over a beat. Mix to about -14 LUFS with peaks under -1 dBFS.

## Real material

- **Show the real thing:** real product screens captured from the app, cropped to small pieces (a card, a row, a
  button), never whole screenshots.
- **Keep it clean:** hide help hints, other people's names and anything that only makes sense inside the app.
- **Variety:** the same picture shouldn't appear over and over; one hero picture, plus other real material
  around it.

## Quality and checks

- **60 fps with motion blur** (two sub-frames blended per frame) for the final render; render slices in parallel to
  keep it to minutes.
- **Look at stills of every key moment before the full render.**
- **Check the finished file, not the plan:**
  - run `python motion_qa.py video.mp4`: under 15% still, no still stretch of a second or more, at most 3 flashes
    a second;
  - check that visual hits line up with the audio hits at 0 frames;
  - measure loudness.
- **Measure the render speed** on the first frames before promising a finish time.
