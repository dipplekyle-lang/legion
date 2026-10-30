"""Split every video into shots (between camera transitions/dissolves), measure each shot's asset density, and make one
numbered contact sheet per video for the vision pass. -> scenes/shots.json, scenes/<vid>_sheet.jpg"""
import json, math, pathlib, re, subprocess
import cv2
import numpy as np

import lab
HERE = lab.ROOT
OUT = HERE / "scenes"; OUT.mkdir(exist_ok=True)
VIDS = lab.IDS
src = (pathlib.Path(__file__).parent / "deep_measure.py").read_text(encoding="utf-8")   # the toolkit copy, not the study folder
W, H = 360, 640
exec(src[src.index("def heads(frame):"):src.index("def caption_box(frame):")])
try:                                   # the story labels only name each shot's sentence; without them the shots are still measured
    labels = json.loads((HERE / "why" / "labels.json").read_text(encoding="utf-8"))
except (OSError, ValueError):
    labels = []
why = json.loads((HERE / "why" / "data.json").read_text(encoding="utf-8"))
lab_by = {}
n = 0
for vid in VIDS:
    for i, s in enumerate(why[vid]["sentences"]):
        L = next((x for x in labels if int(x.get("n", -1)) == n), None)
        lab_by[(vid, i)] = (L or {}).get("label", "")
        n += 1


def grab(vid, t, w=540, h=960):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(HERE / "refs" / f"{vid}.mp4"), "-frames:v", "1",
                          "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).copy()


def density(img):
    """Asset density of a frame, from three signals: edge density in the sharp middle band, the number of distinct colour
    regions (objects/areas), and the number of dark-outlined shapes."""
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h = img.shape[0]
    band = slice(int(h * .2), int(h * .8))
    edges = cv2.Canny(g, 60, 140)[band].mean() / 255
    small = cv2.resize(img, (180, 320))
    Z = np.float32(small.reshape(-1, 3))
    _, lab, _ = cv2.kmeans(Z, 12, None, (3, 15, 1.0), 2, cv2.KMEANS_PP_CENTERS)
    lab = lab.reshape(320, 180).astype(np.uint8)
    regions = 0
    for k in range(12):
        m, _, st, _ = cv2.connectedComponentsWithStats((lab == k).astype(np.uint8), 8)
        regions += int((st[1:, 4] > 180 * 320 * 0.0015).sum())
    v = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[..., 2]
    dark = (v < 75).astype(np.uint8)
    cnt, _ = cv2.findContours(dark, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    outlined = sum(1 for c in cnt if cv2.contourArea(c) > 40)
    return round(float(edges), 4), regions, outlined


shots = []
for vid in VIDS:
    meas = json.loads((HERE / "measure" / f"{vid}.json").read_text(encoding="utf-8"))
    words = json.loads((HERE / "measure" / f"{vid}.words.json").read_text(encoding="utf-8"))
    dur = meas["seconds"]
    cuts = sorted([0.0] + [(a + b) / 2 for a, b, _ in meas["camera_transitions"]] + [dur])
    sents = why[vid]["sentences"]
    k = 0
    for a, b in zip(cuts, cuts[1:]):
        if b - a < 0.35:
            continue
        mid = (a + b) / 2
        img = grab(vid, mid)
        e, reg, outl = density(img)
        hs = heads(cv2.resize(img, (W, H)))
        hd = hs[0]["d"] if hs else 0
        scale = "none" if not hs else "extreme close" if hd > .55 else "close" if hd > .32 else "medium" if hd > .17 else "wide"
        si = next((i for i, s in enumerate(sents) if s["s"] - 0.1 <= mid <= s["e"] + 0.3), None)
        text = " ".join(w["w"] for w in words if a <= w["s"] < b)
        shots.append({"vid": vid, "n": k, "a": round(a, 2), "b": round(b, 2), "dur": round(b - a, 2), "pos": round(mid / dur, 2),
                      "edges": e, "regions": reg, "outlined": outl, "scale": scale, "heads": len(hs),
                      "role": lab_by.get((vid, si), "") if si is not None else "", "words": text})
        cv2.imwrite(str(OUT / f"{vid}_{k:02d}.jpg"), cv2.resize(img, (216, 384)))
        k += 1
    print(vid, k, "shots", flush=True)
# a combined density score: the mean of the three signals' ranks (0-1)
for key in ("edges", "regions", "outlined"):
    vals = sorted(s[key] for s in shots)
    for s in shots:
        s[key + "_rank"] = vals.index(s[key]) / max(1, len(vals) - 1)
for s in shots:
    s["density"] = round((s["edges_rank"] + s["regions_rank"] + s["outlined_rank"]) / 3, 3)
(OUT / "shots.json").write_text(json.dumps(shots, indent=1), encoding="utf-8")
# contact sheets, numbered, with the density score
for vid in VIDS:
    ss = [s for s in shots if s["vid"] == vid]
    tiles = []
    for s in ss:
        t = cv2.imread(str(OUT / f"{vid}_{s['n']:02d}.jpg"))
        cv2.rectangle(t, (0, 0), (216, 22), (0, 0, 0), -1)
        cv2.putText(t, f"#{s['n']} {s['a']:.1f}s", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        tiles.append(t)
    cols = 6
    while len(tiles) % cols:
        tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(str(OUT / f"{vid}_sheet.jpg"), np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]))
print(len(shots), "shots total")
