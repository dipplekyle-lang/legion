"""Every shot of all six videos: camera, lens, layering, lighting and character construction, judged by Legion's brain from
the numbered contact sheets. -> scenes/cam_<vid>.json"""
import json, os, pathlib, sys

import lab
HERE = lab.ROOT
LEGION = lab.LEGION
sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
import app                                                           # noqa: E402

shots = json.loads((HERE / "scenes" / "shots.json").read_text(encoding="utf-8"))
PROMPT = """The image is a contact sheet of every shot of one animated YouTube Short, labelled #n with the start time. First decide
from the pictures alone whether it is 3D-rendered, flat 2D, or mixed, and judge in those terms (a flat 2D shot has no real lens
or lighting: say "flat" and describe the painted light instead). Judge EVERY shot as a cinematographer and lighting artist. Be
concrete; if something isn't visible use null. Never assume a look the pictures don't show.
Shots: {ids}

For each shot return:
- "cam_height": "floor" | "low" | "chest" | "eye" | "high" | "top-down"
- "tilt": "down-steep" | "down" | "level" | "up"
- "render": "3d" | "flat 2d" | "mixed"
- "lens": "wide" (strong perspective, near objects big) | "normal" | "long" (compressed) | "flat" (2D, no perspective)
- "layers": number of distinct depth planes (foreground object / subject / midground / background)
- "foreground": the object in front of the subject that overlaps it or the frame edge, or null
- "subject_dist": "extreme close" | "close" | "medium" | "wide"
- "bg_blur": "strong" | "medium" | "none"
- "near_far_value": "near darker" | "near lighter" | "even"
- "key_light": where the main light comes from relative to the frame ("left", "right", "top", "front", "back"), and what it is
  ("window", "lamp", "sun", "sky", "practical glow", "ambient", "painted glow", "none (flat colour)")
- "practicals": light sources visible in frame (list) or []
- "rim": true if a rim/back light outlines the subject
- "shadows": list of shadow types visible: "contact", "cast", "blind stripes", "occlusion", "none"
- "char": if a character is visible: {{"head_overlaps_torso": true/false, "torso": "barrel" | "bean" | "bell" | "robe" |
  "rounded rectangle" | "object with limbs" | "other",
  "hair": short description, "pose": short description}} else null
Return ONLY JSON: [{{"n": 0, ...}}, ...]"""

for vid in lab.IDS:
    out = HERE / "scenes" / f"cam_{vid}.json"
    if out.exists():
        continue
    ids = ", ".join(f"#{s['n']}" for s in shots if s["vid"] == vid)
    got = app.claude_json(PROMPT.format(ids=ids), images=[HERE / "scenes" / f"{vid}_sheet.jpg"], want=list)
    out.write_text(json.dumps(got, indent=1), encoding="utf-8")
    print(vid, len(got), flush=True)
