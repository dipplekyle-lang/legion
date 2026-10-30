"""People, measured: proportions and details of every sizeable person in a style's frames (feeds the SPEC's character section and
the engine's person() rig). Each crop gets a faint labelled 10 % grid; Legion's brain reads ratios off it in a fixed vocabulary.

usage: py -3.12 stylelab/people_vision.py --name DIR        crops in DIR/*.jpg -> DIR/named/<crop>.json (resume-safe, 4 at a time)
       py -3.12 stylelab/people_vision.py --agg DIR [DIR2]  the numbers (DIR2: a build's crops, printed side by side)
"""
import glob
import json
import os
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

LEGION = pathlib.Path(__file__).resolve().parent.parent
PROMPT = """Each image is a crop around a PERSON from a 2D flat vector explainer animation ({n} images; labels: {labels}). A faint grid
every 10 % of the crop (labelled) helps you measure. Measure the MAIN person in each crop (the biggest, most frontal one).
Ratios are numbers (e.g. 0.42); use null when that part is not visible.
- "kind": child, teen, man, woman, old man, old woman, or other; "framing": head, bust, waist-up, knees-up, full-body, or group
- "heads_tall": full figure height in head heights (top of skull to soles; full-body only)
- "head_w_h": head width / head height (skull without hair, ears excluded)
- "eye_w": one eye's width / head width;  "eye_gap": distance between the two eye centres / head width
- "eye_y": eye line measured from the top of the skull / head height;  "mouth_w": mouth width / head width
- "neck_w": neck width / head width;  "shoulder_w": shoulder width / head width;  "arm_w": upper-arm thickness / head width
- "hand_l": hand length (wrist to fingertip) / head height;  "leg_share": legs (crotch to soles) / full height (full-body only)
- "torso_shape": one of [rectangle, trapezoid-wide-shoulders, pear, round, tube]
- "head_shape": one of [round, U-flat-top, egg, square, bean, oval-wide]
- "eyes": one of [dot, white-with-big-iris, white-with-iris-and-pupil, closed-capsule, lidded-dot, lidded-white]
- "nose": one of [none, bean, dot, short-line, triangle, round-tip];  "mouth": one of [none, line, small-o, smile-curve, open-smile, teeth]
- "ears": one of [none, half-circle, small-round, big];  "brows": one of [none, thin-arc, thick-bar, angled, short-dash]
- "hair": a few words on its shape (e.g. "bowl with a side swoop", "bun on top", "spiky crown");  "hair_vol": hair height above the skull / head height
- "shading": one of [none, one-crescent, side-two-tone, rim-light, gradient];  "outline": true if shapes have outlines
- "details": the small details present, from [blush, eye-bags, lid-line, lashes, hair-shine-band, hair-strands, freckles, wrinkles,
  ear-inner, chin-line, neck-shadow, collar, seams, pockets, pattern, buttons, belt, shoe-soles, laces, fingers, fingernails,
  knuckle-lines, cuffs, jewellery, glasses, beard-stubble, teeth, tongue, cheek-line, dimples]
- "palette": skin, hair, top colours (three words)
- "pose": a few words (e.g. "arms up, head tilted, mid-step")
Return ONLY JSON: {{"people": [{{"label": "...", "kind": "...", "framing": "...", "heads_tall": null, "head_w_h": 0, "eye_w": 0,
"eye_gap": 0, "eye_y": 0, "mouth_w": 0, "neck_w": 0, "shoulder_w": 0, "arm_w": 0, "hand_l": null, "leg_share": null, "torso_shape": "...",
"head_shape": "...", "eyes": "...", "nose": "...", "mouth": "...", "ears": "...", "brows": "...", "hair": "...", "hair_vol": 0,
"shading": "...", "outline": false, "details": [], "palette": "...", "pose": "..."}}]}}"""


def gridded(src, dst):
    im = cv2.imread(str(src)); h, w = im.shape[:2]
    ov = im.copy()
    for k in range(1, 10):
        cv2.line(ov, (k * w // 10, 0), (k * w // 10, h), (255, 255, 255), 1); cv2.line(ov, (0, k * h // 10), (w, k * h // 10), (255, 255, 255), 1)
    im = cv2.addWeighted(ov, 0.3, im, 0.7, 0)
    for k in range(1, 10):
        for px, py in ((k * w // 10 + 2, 14), (2, k * h // 10 - 3)):
            cv2.putText(im, str(k * 10), (px, py), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 3, cv2.LINE_AA)
            cv2.putText(im, str(k * 10), (px, py), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(str(dst), im, [cv2.IMWRITE_JPEG_QUALITY, 88])


def name(d):
    sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
    import app  # noqa: E402
    d = pathlib.Path(d).resolve(); (d / "named").mkdir(exist_ok=True); (d / "grid").mkdir(exist_ok=True)
    todo = [p for p in sorted(d.glob("*.jpg")) if not (d / "named" / f"{p.stem}.json").exists()]
    batches = [todo[k:k + 6] for k in range(0, len(todo), 6)]
    print(f"{len(todo)} crops in {len(batches)} calls", flush=True)

    def one(b):
        labels = [p.stem for p in b]
        imgs = []
        for p in b:
            gridded(p, d / "grid" / p.name); imgs.append(str(d / "grid" / p.name))
        for _ in range(2):
            try:
                got = app.claude_json(PROMPT.format(n=len(b), labels=", ".join(f"image {i + 1} = {l}" for i, l in enumerate(labels))), images=imgs, want=dict)
                for i, s in enumerate((got.get("people") or [])[:len(b)]):
                    lab = s.get("label") if s.get("label") in labels else labels[i]
                    (d / "named" / f"{lab}.json").write_text(json.dumps(s, indent=1), encoding="utf-8")
                return f"{labels[0]}.. ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:120]
        return f"{labels[0]}.. FAILED {err}"
    with ThreadPoolExecutor(4) as ex:
        for k, r in enumerate(ex.map(one, batches)):
            print(f"[{k + 1}/{len(batches)}] {r}", flush=True)


NUM = ("heads_tall", "head_w_h", "eye_w", "eye_gap", "eye_y", "mouth_w", "neck_w", "shoulder_w", "arm_w", "hand_l", "leg_share", "hair_vol")
CAT = ("kind", "framing", "torso_shape", "head_shape", "eyes", "nose", "mouth", "ears", "brows", "shading")


def stats(d):
    rows = [json.loads(f.read_text(encoding="utf-8")) for f in sorted(pathlib.Path(d, "named").glob("*.json"))]
    out = {"n": len(rows)}
    for k in NUM:
        v = [float(r[k]) for r in rows if isinstance(r.get(k), (int, float)) and r[k] > 0]
        out[k] = [round(float(np.percentile(v, q)), 2) for q in (25, 50, 75)] + [len(v)] if v else None
    for k in CAT:
        v = [str(r.get(k)) for r in rows if r.get(k)]
        out[k] = {x: round(v.count(x) / len(v), 2) for x in sorted(set(v), key=lambda x: -v.count(x))[:6]} if v else {}
    det = [x for r in rows for x in (r.get("details") or [])]
    out["details"] = {x: round(sum(1 for r in rows if x in (r.get("details") or [])) / max(1, len(rows)), 2)
                      for x in sorted(set(det), key=lambda x: -det.count(x))[:24]}
    out["outline"] = round(sum(1 for r in rows if r.get("outline")) / max(1, len(rows)), 2)
    out["details_per_person"] = round(len(det) / max(1, len(rows)), 1)
    return out


def agg(d, d2=None):
    a = stats(d)
    (pathlib.Path(d) / "summary.json").write_text(json.dumps(a, indent=1), encoding="utf-8")
    b = stats(d2) if d2 else None
    for k in a:
        print(f"{k}: {a[k]}" + (f"   | ours: {b.get(k)}" if b else ""))


if __name__ == "__main__":
    x = sys.argv[1:]
    if x[0] == "--name":
        name(x[1])
    else:
        agg(x[1], x[2] if len(x) > 2 else None)
