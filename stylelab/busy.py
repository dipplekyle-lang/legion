"""How busy is a frame? The reference videos (1 frame/s) vs our stills (folder given, else <study>/ours): edge density overall and per region,
distinct colours, small-detail energy. Writes busy.json.  usage: python busy.py"""
import glob, json, pathlib, subprocess, sys
import numpy as np
import cv2

import lab
HERE = lab.sub("deep3")
REFS = HERE.parent / "refs"; OURS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else lab.ROOT / "ours"
IDS = lab.IDS
w, h = 540, 960


def stats(bgr):
    bgr = cv2.resize(bgr, (w, h), interpolation=cv2.INTER_AREA)
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    e = cv2.Canny(g, 60, 150) > 0
    keep = np.ones((h, w), bool); keep[int(0.64 * h):int(0.81 * h), int(0.2 * w):int(0.8 * w)] = False   # caption (low or mid caption lines)
    rows = [(0, 0.25), (0.25, 0.5), (0.5, 0.75), (0.75, 1.0)]
    reg = [float(e[int(a * h):int(b * h)][keep[int(a * h):int(b * h)]].mean()) for a, b in rows]
    q = (bgr[keep] // 24).astype(np.int32); cols = np.unique(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2])
    lap = cv2.Laplacian(cv2.GaussianBlur(g, (0, 0), 0.8), cv2.CV_32F)
    # how many separate things: connected regions of similar colour bigger than 40 px
    lab = cv2.cvtColor(cv2.pyrMeanShiftFiltering(cv2.resize(bgr, (270, 480)), 6, 18), cv2.COLOR_BGR2GRAY)
    n_reg = cv2.connectedComponentsWithStats((cv2.Canny(lab, 20, 50) == 0).astype(np.uint8))[2]
    blobs = int((n_reg[1:, cv2.CC_STAT_AREA] > 40).sum())
    return {"edge": float(e[keep].mean()), "edge_rows": reg, "colours": int(len(cols)), "detail": float(np.mean(np.abs(lap[keep]))), "regions": blobs}


def frames_of(vid):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(REFS / f"{vid}.mp4"), "-vf", f"fps=1,scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def summ(L):
    k = lambda key: [round(float(np.percentile([s[key] for s in L], p)), 4) for p in (25, 50, 75)]
    return {"n": len(L), "edge_p25_50_75": k("edge"), "colours_p25_50_75": k("colours"), "detail_p25_50_75": k("detail"), "regions_p25_50_75": k("regions"),
            "edge_by_row_top_to_bottom_median": [round(float(np.median([s["edge_rows"][i] for s in L])), 4) for i in range(4)]}


his = []
for v in IDS: his += [stats(f) for f in frames_of(v)]
ours = [stats(cv2.imread(f)) for f in sorted(glob.glob(str(OURS / "s_*.png")))]
out = {"his": summ(his), "ours": summ(ours) if ours else None}   # no stills of ours yet on a first study
(HERE / "busy.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(json.dumps(out, indent=1))
