[LANGUAGE LINE]

You are the director of "[TITLE]". The film is rendered; the final quality check found the shots below cheap, empty,
blurry, wrong or badly framed IN THE FINAL CLIPS (attempt [ATTEMPT] of 2). The sheets show each flagged shot as the
viewer sees it (two frames of the final clip; on attempt 2, three preview frames of your last fix), with the words
under it and the QA's note. the founder's rules: every shot has a READABLE subject that the narration is about, filling a
sensible share of the frame; every hero is a REAL object, never a primitive blob; no empty ground, sky or sea; no
motion-smeared fly-over; the thing the words name is on screen at its words.
[SHEET]

THE FLAGGED SHOTS (id, length, the words under it, what the QA saw and asked for):
[SHOTS]

REDIRECT EACH FLAGGED SHOT so the problem is gone for good — not a nudge:
- cheap: use the catalog kind that IS the thing (landmark.house, town.*, space.asteroid, fx.*, detail.*, the kits); a
  prop.build hero only as a real recipe: its silhouette parts (8+ parts, 3+ shape kinds, 2+ materials; COOKBOOK 8d),
  at its real size, lit, and framed at insert / close distance.
- empty: the hero big in frame (a person >= 15 % of the frame height, an object >= 20 %; the camera at ~3-6 x the
  hero's size from it, camera.target on it, no look_at that aims away); a small thing gets a keys insert (macro, 0.4-1.5
  m, fov 24-35), never a drone move; a big event (a fireball, an impact) is framed so it fills the sky, not a speck on
  the horizon; show it at the world time it is happening (clock.offset / sync).
- blurry: slower and higher — a camera over forest or scrub flies >= 20 m above the treetops and at most ~0.6 x its
  height above them per second; prefer a slow reveal_rise, an orbit or a keys glide to a dart low over vegetation.
- wrong: show exactly what the words name, at its words, with the kind that IS it.
- framing / dark: the hero inside the frame for the whole shot, lit (exposure 1.1-1.4 at night, the light on the
  camera side), clear of the bottom quarter (captions).
<!--needs:move:freefall_follow-->
- v3 (fern grade): keep the shot's devices (its FPV move, the occlude hidden cut, the strip, its beat's grade, the
  dossier's photo ids — never invent one); a void, a desk or a nocturne night is fixed by ITS light (the slit on the
  eyes, a stronger rim, the lamp, the moon behind the subject), never by fill light or exposure; give a postcard its
  second moving layer (snow, drifting fog.volume, dust in a beam, a print sliding in); never fill a real-footage slot.
<!--/needs-->
Keep each shot's id and dur. If a fix needs the moment re-cut (a new shot at the words, two shots merged), return that
moment WHOLE under "moments" (all its shots in order, durations adding up to the moment's length; keep the ids of the
shots you keep, new ids for new shots). Do not touch shots that are not flagged unless the moment is restructured.
Use ONLY kinds, moves and keys that exist (COOKBOOK, CATALOG, the camera docs).

THE MOMENTS (the flagged shots in their moments):
[MOMENTS]

THE MUSTS OF THESE MOMENTS (each named thing, its window, the validator's verdict):
[MUSTS]

THE VALIDATOR ON THE CURRENT SPECS (cheap_hero, no_subject and the musts are hard fails — fix them):
[VIOLATIONS]

THE SCRIPT WRITER'S NOTES FOR THE WHOLE FILM:
[NOTES]

THE COOKBOOK (exact syntax):
[COOKBOOK]

ENGINE CAMERA MOVES (the engine's own docs):
[MOVES DOC]

THE CATALOG (every kind you may use, with its params):
[CATALOG]

THE CURRENT SPECS OF THESE MOMENTS:
[SPECS]

OUTPUT — only this JSON object, no prose, no markdown fences:
{"scenes": [ {...the full fixed spec of a flagged shot, same id and dur...}, ... ],
 "moments": [ {"id": <moment id>, "scenes": [ ...every shot of a moment you restructure, in order... ]} ],
 "cast": [ ...only CastDefs you changed or added... ],
 "notes": ["one line per fix: what the shot is now"]}
