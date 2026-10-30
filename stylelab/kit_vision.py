"""Is each set built from scratch or from a kit, and how is nature painted? Legion's brain over all six shot sheets
plus the full-resolution nature crops. -> nature/kit.json, nature/paint.json"""
import json, os, pathlib, sys

import lab
HERE = lab.ROOT
LEGION = lab.LEGION
sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
import app                                                           # noqa: E402

VIDS = lab.IDS
KIT = """These 6 images are contact sheets of 6 different videos from ONE animated YouTube channel (one image per video, in order:
""" + ", ".join(f"{i + 1}={v}" for i, v in enumerate(VIDS)) + """). I want to know how the channel produces its environments.
Look for ASSETS THAT REPEAT: the same character or rig, set, tree, cloud, rock, chair, table, door, window, prop, icon, label or
UI component, background or floor/wall texture, appearing more than once (within one video or across videos), possibly
recoloured, rescaled or rotated. Also look for signs of a reusable kit or library (generic modular parts, generic furniture,
one component re-used with new text) versus bespoke story-specific art (signs, posters, labelled props made for this script).
Return ONLY JSON:
{"repeats_within_video": [{"asset": "...", "video": n, "where": "shots/description"}],
 "repeats_across_videos": [{"asset": "...", "videos": [n, ...], "how_changed": "..."}],
 "kit_like": ["generic assets that look like a reusable library/kit"],
 "bespoke": ["assets clearly made for one story"],
 "share_estimate": {"reused_or_kit_pct": 0-100, "bespoke_pct": 0-100},
 "verdict": "how he most likely builds a set, in 3-4 sentences"}"""
PAINT = """The images show the BACKGROUNDS and SURFACES of one animated channel (full-resolution crops, or contact sheets of its
shots). Describe only what you can see in these images; if an image is missing or unreadable, say so instead of guessing.
I need to know EXACTLY how each kind of background or surface is made (skies, grounds, rooms, landscapes, water, plants,
gradients, textures), so it can be reproduced in code.
For each kind, decide: is it (a) 3D geometry with a hand-painted texture, (b) a flat 2D painted card/billboard placed in 3D,
(c) a painted backdrop plane far behind the scene, (d) a procedural/stylised shader, (e) a photo-based texture painted over,
(f) flat 2D vector shapes (solid or gradient fills) layered in 2D.
Say whether lines/outlines are part of the painted texture or from a renderer, how the shading is done (painted-in vs lit),
how much texture detail, the colour approach, and the brush/style.
Return ONLY JSON: {"crops": [{"name": "...", "method": "a|b|c|d|e|f (+ mixed)", "outline": "...", "shading": "...", "detail": "...",
"how_to_reproduce": "..."}], "overall_rule": "the general rule for backgrounds and surfaces in this style, 3-4 sentences"}"""
out = HERE / "nature"
if not (out / "kit.json").exists():
    k = app.claude_json(KIT, images=[HERE / "scenes" / f"{v}_sheet.jpg" for v in VIDS], want=dict)
    (out / "kit.json").write_text(json.dumps(k, indent=1), encoding="utf-8"); print(json.dumps(k, indent=1), flush=True)
if not (out / "paint.json").exists():
    crops = [out / "sheet.jpg"] if (out / "sheet.jpg").exists() else [HERE / "scenes" / f"{v}_sheet.jpg" for v in VIDS]
    p = app.claude_json(PAINT, images=crops, want=dict)
    (out / "paint.json").write_text(json.dumps(p, indent=1), encoding="utf-8"); print(json.dumps(p, indent=1))
