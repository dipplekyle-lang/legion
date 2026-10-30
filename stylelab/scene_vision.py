"""Legion's brain looks at every shot (numbered contact sheets) with the narration under each shot and names the assets,
their job, the scene's anchor, and why the shot is dense or sparse. -> scenes/vision_<vid>.json"""
import json, os, pathlib, sys

import lab
HERE = lab.ROOT
LEGION = lab.LEGION
sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
import app                                                           # noqa: E402

shots = json.loads((HERE / "scenes" / "shots.json").read_text(encoding="utf-8"))
TITLES = lab.titles()
PROMPT = """The image is a contact sheet of every shot of a ~60 s animated YouTube Short about {title}, in order. Each tile is
labelled #n and its start time. Under each shot number below is what the narrator says during that shot.
{rows}

For EVERY shot, study the environment and return:
- "anchor": the ONE element that makes this place/scene identifiable at a glance (the 'name' of the scene)
- "assets": up to 8 visible environmental assets/props (not the main characters), each with its job:
  "place" (tells where we are), "foreshadow" (sets up something later), "joke" (a gag or hidden joke), "inform" (carries a
  fact or label the narration needs), "frame" (foreground/edge object that frames or adds depth), "dressing" (just
  fills the world)
- "density": "sparse", "medium" or "dense" (how many environmental assets are visible)
- "why_density": one short sentence: why this shot has that many (or that few) assets
- "kind": "real place", "insert/close-up", "diagram/board", "imagination", "establishing wide", "cutaway"
Return ONLY JSON: [{{"n": 0, "anchor": "...", "assets": [{{"name": "...", "job": "..."}}], "density": "...", "why_density": "...", "kind": "..."}}, ...]"""

for vid, title in TITLES.items():
    out = HERE / "scenes" / f"vision_{vid}.json"
    if out.exists():
        continue
    ss = [s for s in shots if s["vid"] == vid]
    rows = "\n".join(f"#{s['n']} ({s['a']:.1f}-{s['b']:.1f}s): {s['words'] or '(no words)'}" for s in ss)
    got = app.claude_json(PROMPT.format(title=title, rows=rows), images=[HERE / "scenes" / f"{vid}_sheet.jpg"], want=list)
    out.write_text(json.dumps(got, indent=1), encoding="utf-8")
    print(vid, len(got), "shots described", flush=True)
