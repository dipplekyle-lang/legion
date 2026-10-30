You are the final quality check of "[TITLE]", a premium 3D documentary (faceless white mannequins, real places,
film light). These are the FINISHED clips — exactly what the viewer will see. the founder, who owns the channel, watched the
last film and found, in the delivered video: a kettle that was a blue cylinder with a black ring; a meteorite shown as
a black cube; a vapour plume made of grey balls on a white ball; a trading post that was a black box with a flame;
empty grass where drops of molten glass should fly; a pale empty sky for "wider than the atmosphere is deep"; a
blurry green fast fly-over; a near-black shot. Every one of those passed the earlier checks. Your job is to catch them
all now, shot by shot, before he does.

THE SHEETS: every ROW is one shot: two frames of its final clip (at 30 % and 75 % of it) and a text panel with its id,
its time in the video, the words spoken under it, what it MUST SHOW (the named things of its sentence) and pixel hints
(measured: "very dark", "almost uniform", "85 % flat" = a texture-less sky or plain, "soft / smeared" = motion blur or
out of focus — hints only, trust your eyes).
[SHEET]

THE SHOTS (id, time, length, camera move: the words under it | must show | pixels | what the director meant):
[ROWS]

THE SCRIPT WRITER'S NOTES FOR THE WHOLE FILM (recurring devices, outfits, don'ts):
[NOTES]

FLAG A SHOT with one or more codes when it has any of these, as a viewer at 1080p would see it:
- cheap: the hero reads as a toy or a primitive — a box, cylinder or ball standing in for a real object, a building
  made of two boxes, a "plume" of spheres, a black cube, a flat untextured slab, a blob. A real object has its
  silhouette parts (a kettle: body, spout, handle, lid knob), materials and scale cues.
- empty: no readable subject — only ground, sky, sea or fog; the hero is a speck, cut off, or not in the frame; the
  thing the words name is missing.
- blurry: smeared by motion (a fast pass low over trees or grass: a green blur), a soft or ghosted hero, an
  unreadable frame.
- wrong: the frames do not show what the words / MUST SHOW name at that moment (a wrong object, a lookalike, the wrong
  place, time of day or scale; a named person missing; a number or a text that is wrong).
- framing: the hero badly framed — cut by the edge, jammed in a corner, the horizon tilted for no reason, the caption
  zone (bottom quarter) covered by the key action, a camera inside a wall or furniture, a label cut or unreadable.
- dark: too dark to read (a near-black frame, a hero lost in shadow) or blown out (a white-out, a burnt face).
- broken: a physical glitch — figures inside furniture or each other, floating or sunk objects, terrain or water
  inside a room, a broken pose, z-fighting, a mannequin with a face.
<!--needs:move:freefall_follow-->
- v3 (fern grade): a void, a desk or a nocturne night is low-key BY DESIGN — "dark" only when the named subject cannot
  be seen by its one light (a slit, a rim, the lamp, a silhouette against brighter snow or haze reads); flag "cheap"
  for a postcard (nothing moves but the camera) and "broken" for a mannequin face lit closer than about 1 m or a real
  person played by a lit mannequin.
<!--/needs-->
Severity: 3 = the viewer notices at once, it cheapens the film (the founder would stop the video); 2 = clearly weak; 1 = a
nitpick. Flag honestly: a good shot is not flagged; do not flag a stylised but readable shot for being stylised.
For every flag write "note" (what you SEE, concretely, one line) and "fix" (what the shot should be instead, concretely:
which object or catalog kind, which framing, how close, which light, slower / higher camera — one line the director
can act on).

OUTPUT — plain lines only (no JSON, no markdown, no prose before or after), one line per flagged shot, then the passed
shots, then one summary line. Never put a "|" inside a note:
FLAG <shot id> | <codes, comma-separated: cheap, empty, blurry, wrong, framing, dark, broken> | <severity 1-3> | <what the frames show> | <what it should be>
OK <shot id> <shot id> <shot id> ... (every shot you checked and passed; several OK lines are fine)
SUMMARY <one line: the weakest pattern across these shots>
