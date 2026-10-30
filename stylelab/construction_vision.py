"""How every recurring element is BUILT, in numbers a code engine can draw from: Legion's brain picks the best shot for each kind
of element from the shot sheets, the full-resolution frames are pulled, their exact colours sampled (k-means), and the brain writes
a construction sheet per element: proportions, corner radii, stroke widths, shading recipe, type, which sampled colour is which part.
-> deep4/construction.json, deep4/construct/<kind>.png"""
import json, os, subprocess, sys
import cv2
import numpy as np

import lab
HERE = lab.sub("deep4")
OUT = HERE / "construct"; OUT.mkdir(exist_ok=True)
LEGION = lab.LEGION
KINDS = ["title_card", "face_close", "person_medium", "person_full", "talking_object", "creature_or_mascot", "crowd_grid",
         "fact_pills", "name_banner", "caveat_box", "big_number", "zoom_bubble", "body_diagram", "map_or_globe", "chart_or_meter",
         "place_scene", "dark_glow_scene", "metaphor_scene"]

PICK = """These images are numbered shot sheets of {n} videos from one animated channel (one image per video, in this order: {vids}).
Shots per video (#n: start-end s: narration):
{shots}
For each element kind below, pick the ONE shot that shows it best, biggest and clearest (or null if no shot has it):
{kinds}
Return ONLY JSON: {{"<kind>": {{"vid": "<video id>", "n": <shot number>}} or null, ...}}"""

BUILD = """Each image is one full-resolution 1080x1920 frame from one animated channel; its file name says which element kind to
study in it. Under each, the exact colours sampled from that frame (hex, share of pixels):
{pal}
I will rebuild these elements in CODE (2D vector shapes, or 3D if the pictures are 3D). For EACH kind write a construction sheet
with NUMBERS, measured from the pixels as well as you can (x/y/sizes as fractions of frame width W=1080 unless said):
- "parts": every shape it is made of, in draw order, each {{"part", "shape" (circle, ellipse, rounded rect r=..% of height, capsule,
  path: describe), "size" (w,h in W), "pos" (relative to the element), "fill" (a sampled hex), "shadow" (how the darker same-hue
  shape sits: side, size, hex), "highlight" (if any), "outline" (none or px at 1080 + hex)}}
- "proportions": the key ratios (e.g. head height / body height, eye size / head, limb thickness / head, text cap height / box height)
- "text": font look (rounded/geometric/heavy, case, tracking), cap height in px at 1920, colour, outline/shadow, tilt in degrees
- "placement": where in the frame it usually sits and how big (share of frame width), what stays clear
- "motion_hint": how it most likely enters and idles (scale-pop, slide from where, bob, blink), from the pose and any smear
- "rebuild": 2-4 sentences: how to draw it in code so it is indistinguishable in KIND (original design, not a copy)
Never name the channel or real people. Return ONLY JSON: {{"<kind>": {{...}}, ...}}"""


def frame(vid, t, dest):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(lab.REFS / f"{vid}.mp4"), "-frames:v", "1", str(dest)],
                   capture_output=True)


def palette(p, k=8):
    im = cv2.imread(str(p))
    if im is None:
        return []
    px = cv2.resize(im, (180, 320), interpolation=cv2.INTER_AREA).reshape(-1, 3).astype(np.float32)
    _, lab_, cen = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    share = np.bincount(lab_.ravel(), minlength=k) / len(lab_)
    return [("#%02X%02X%02X" % (int(c[2]), int(c[1]), int(c[0])), round(float(s), 3)) for c, s in sorted(zip(cen, share), key=lambda x: -x[1])]


def main():
    sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
    import app                                                       # noqa: E402
    shots = json.loads((lab.ROOT / "scenes" / "shots.json").read_text(encoding="utf-8"))
    pick_f = HERE / "construct_pick.json"
    if pick_f.exists():
        pick = json.loads(pick_f.read_text(encoding="utf-8"))
    else:
        lines = "\n".join(f"{s['vid']} #{s['n']}: {s['a']:.1f}-{s['b']:.1f}: {s.get('words', '')[:70]}" for s in shots)
        pick = app.claude_json(PICK.format(n=len(lab.IDS), vids=", ".join(lab.IDS), shots=lines, kinds=", ".join(KINDS)),
                               images=[lab.ROOT / "scenes" / f"{v}_sheet.jpg" for v in lab.IDS], want=dict)
        pick_f.write_text(json.dumps(pick, indent=1), encoding="utf-8")
    imgs, pal = [], []
    for kind in KINDS:
        p = pick.get(kind)
        s = p and next((s for s in shots if s["vid"] == p.get("vid") and int(s["n"]) == int(p.get("n", -1))), None)
        if not s:
            continue
        dest = OUT / f"{kind}.png"
        frame(s["vid"], (s["a"] + s["b"]) / 2, dest)
        if dest.exists():
            imgs.append(dest); pal.append(f"{kind}.png: " + ", ".join(f"{h} {sh}" for h, sh in palette(dest)))
    got = {}
    for i in range(0, len(imgs), 6):                                  # six frames per look, so each gets a real look
        try:
            got.update(app.claude_json(BUILD.format(pal="\n".join(pal[i:i + 6])), images=imgs[i:i + 6], want=dict))
        except Exception as e:
            got[f"error_{i}"] = str(e)[:200]
        print("built", min(len(imgs), i + 6), "of", len(imgs), flush=True)
    got["_palettes"] = pal
    (HERE / "construction.json").write_text(json.dumps(got, indent=1), encoding="utf-8")
    print(", ".join(k for k in got if not k.startswith("_")))


if __name__ == "__main__":
    main()
