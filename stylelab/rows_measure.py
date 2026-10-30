"""Perspective rows, measured: how repeated things (trees, corals, umbrellas, heads in a crowd, windows) change size and
colour with their height in the frame. Feeds the SPEC's depth / placement section and strew()'s defaults.

Per frame: flat regions (the same colour-edge segmentation as density_measure.py), grouped into families of copies (similar
Lab colour after removing the height trend, similar aspect and solidity). A family of 4+ copies spread over 12 %+ of the frame
height is a ROW SET; per set: how much a copy grows per 10 % of height toward the bottom (linear size ratio), how its lightness
and chroma move, how many copies per band, and whether one giant near copy is cut by the frame.

usage: py -3.12 stylelab/rows_measure.py OUT.json <frames dir|glob> [--every 2]
"""
import glob
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

W, H = 540, 960
CAP = (0.70, 0.84)
EDGE_T = 14.0


def regions(im):
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[..., 0] *= 100 / 255
    lab[..., 1:] -= 128
    mag = np.zeros((H, W), np.float32)
    for c in range(3):
        mag = np.maximum(mag, np.hypot(cv2.Scharr(lab[..., c], cv2.CV_32F, 1, 0) / 16, cv2.Scharr(lab[..., c], cv2.CV_32F, 0, 1) / 16))
    keep = np.ones((H, W), bool); keep[int(CAP[0] * H):int(CAP[1] * H)] = False
    inner = ~cv2.dilate((mag > EDGE_T).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & keep
    n, lbl, st, cen = cv2.connectedComponentsWithStats(inner.astype(np.uint8), connectivity=4)
    out = []
    for k in range(1, n):
        a = st[k, cv2.CC_STAT_AREA]
        if a < 40 or a > 0.08 * W * H:              # specks and backgrounds are not copies
            continue
        x, y, w, h = st[k, :4]
        m = lbl[y:y + h, x:x + w] == k
        col = lab[y:y + h, x:x + w][m].mean(0)
        out.append({"a": a, "cy": cen[k][1] / H, "cx": cen[k][0] / W, "L": col[0], "A": col[1], "B": col[2],
                    "asp": w / max(1, h), "sol": a / max(1, w * h), "cut": bool(x <= 0 or y <= 0 or x + w >= W or y + h >= H)})
    return out


def families(rs):
    """Greedy grouping: copies share shape (aspect, solidity) and hue; lightness may drift with depth (haze), so L is loose."""
    rs = sorted(rs, key=lambda r: -r["a"])
    fams = []
    for r in rs:
        hue = np.arctan2(r["B"], r["A"]); chroma = np.hypot(r["A"], r["B"])
        for f in fams:
            g = f[0]
            gh, gc = np.arctan2(g["B"], g["A"]), np.hypot(g["A"], g["B"])
            dh = abs((hue - gh + np.pi) % (2 * np.pi) - np.pi) * min(chroma, gc)
            if (abs(np.log(r["asp"] / g["asp"])) < 0.35 and abs(r["sol"] - g["sol"]) < 0.12 and dh < 10 and abs(chroma - gc) < 18
                    and abs(r["L"] - g["L"]) < 22):
                f.append(r); break
        else:
            fams.append([r])
    return fams


def measure(path):
    im = cv2.imread(path)
    if im is None:
        return None
    im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    sets = []
    for f in families(regions(im)):
        if len(f) < 4:
            continue
        ys = np.array([r["cy"] for r in f]); s = np.sqrt([r["a"] for r in f])
        if ys.max() - ys.min() < 0.12 or s.max() / s.min() > 40:
            continue
        slope = np.polyfit(ys, np.log(s), 1)[0]           # log linear size per unit of frame height
        Ls = np.array([r["L"] for r in f]); Cs = np.hypot([r["A"] for r in f], [r["B"] for r in f])
        sets.append({"n": len(f), "span": float(ys.max() - ys.min()), "y0": float(ys.min()), "y1": float(ys.max()),
                     "grow10": float(np.exp(slope * 0.1)),                     # size ratio per 10 % of height downward
                     "near_far": float(s[ys.argmax()] / s[ys.argmin()]),
                     "dL10": float(np.polyfit(ys, Ls, 1)[0] * 0.1), "dC10": float(np.polyfit(ys, Cs, 1)[0] * 0.1),
                     "cut_near": bool(f[int(ys.argmax())]["cut"]), "area_max": float(s.max() ** 2 / (W * H))})
    return {"f": os.path.basename(path), "sets": sets}


def main():
    out, src = sys.argv[1], sys.argv[2]
    every = int(sys.argv[sys.argv.index("--every") + 1]) if "--every" in sys.argv else 1
    files = sorted(glob.glob(os.path.join(src, "*.jpg")) + glob.glob(os.path.join(src, "*.png"))) if os.path.isdir(src) else sorted(glob.glob(src))
    files = files[::every]
    with ProcessPoolExecutor(int(os.environ.get("DENSITY_WORKERS", "4"))) as ex:
        rows = [r for r in ex.map(measure, files, chunksize=8) if r]
    json.dump(rows, open(out, "w"), indent=0)
    S = [s for r in rows for s in r["sets"] if s["grow10"] > 1.0]          # true perspective rows grow toward the viewer
    P = lambda k, q: round(float(np.percentile([s[k] for s in S], q)), 3) if S else None
    print(f"{len(rows)} frames, {sum(1 for r in rows if r['sets'])} with a family of copies, {sum(1 for r in rows if any(s['grow10'] > 1.05 for s in r['sets']))} with a perspective row (grows 5 %+ per 10 % of height)")
    print(f"perspective row sets: {len(S)}; copies per set p50 {P('n', 50)}; vertical span p50 {P('span', 50)} (p25 {P('span', 25)}, p75 {P('span', 75)})")
    print(f"size growth per 10 % of height downward: p25 {P('grow10', 25)} p50 {P('grow10', 50)} p75 {P('grow10', 75)}; nearest/farthest copy p50 {P('near_far', 50)} p75 {P('near_far', 75)}")
    print(f"lightness change per 10 % downward: p25 {P('dL10', 25)} p50 {P('dL10', 50)} p75 {P('dL10', 75)}; chroma: p50 {P('dC10', 50)} p75 {P('dC10', 75)}")
    print(f"rows start (farthest copy) at height p25 {P('y0', 25)} p50 {P('y0', 50)}; nearest copy cut by the frame: {round(sum(s['cut_near'] for s in S) / max(1, len(S)), 3)}")


if __name__ == "__main__":
    main()
