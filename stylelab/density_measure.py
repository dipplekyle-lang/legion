"""How busy is a frame? Measures visual density of flat-art frames so a style's "fullness" is a number, not a feeling.

Per frame (caption band masked):
  shapes      flat shapes larger than 0.02 % of the frame (colour-edge segmentation, soft gradients ignored)
  small       of those, details under 0.2 % (specks, stars, buttons, leaves, eyes...)
  edge        share of pixels on a colour edge
  empty       share of grid cells (6 x 10) with almost no edges: big bald areas
  bg          share of the frame taken by the single largest flat region
  colours     distinct colours covering 0.5 %+ of the frame
  thirds      shapes in the top / middle / bottom third
  obj         share of the frame that is NOT the background region (how much is drawn)
  obj_edge    edge share inside what is drawn (inner detail: shading, folds, windows, texture)
  obj_dens    shapes per unit of drawn area (how finely the drawn things are broken up)
  corners     how many of the 4 corners (22 % x 13 % boxes) hold drawn content
  border      share of the frame edge covered by drawn things (shapes cut by the frame)
  rows        edge share in bands: top quarter, upper middle, lower middle (to 0.70), bottom (below the captions)

Usage:
  py -3.12 stylelab/density_measure.py OUT.json frame1.png frame2.jpg ...   (or a folder, or a glob)
Feeds SPEC: density (how full frames are, where the detail sits, when frames go sparse).
"""
import glob
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

W, H = 540, 960
CAP = (0.70, 0.84)          # caption band, masked (references carry burned-in captions)
EDGE_T = 14.0               # Lab gradient magnitude that counts as a drawn edge
MIN_A = 0.0002              # smallest shape counted, share of frame
SMALL_A = 0.002             # "small detail" upper bound


def measure(path):
    im = cv2.imread(path)
    if im is None:
        return None
    im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[..., 0] *= 100 / 255
    lab[..., 1:] -= 128
    mag = np.zeros((H, W), np.float32)
    for c in range(3):
        gx = cv2.Scharr(lab[..., c], cv2.CV_32F, 1, 0) / 16
        gy = cv2.Scharr(lab[..., c], cv2.CV_32F, 0, 1) / 16
        mag = np.maximum(mag, np.hypot(gx, gy))
    edge = mag > EDGE_T
    keep = np.ones((H, W), bool)
    keep[int(CAP[0] * H):int(CAP[1] * H)] = False
    area = keep.sum()

    inner = ~cv2.dilate(edge.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & keep
    n, lbl, st, cen = cv2.connectedComponentsWithStats(inner.astype(np.uint8), connectivity=4)
    a = st[1:, cv2.CC_STAT_AREA] / area
    cy = cen[1:, 1] / H
    big = a >= MIN_A
    shapes = int(big.sum())
    small = int(((a >= MIN_A) & (a < SMALL_A)).sum())
    thirds = [int((big & (cy < 1 / 3)).sum()), int((big & (cy >= 1 / 3) & (cy < 2 / 3)).sum()), int((big & (cy >= 2 / 3)).sum())]
    bg = float(a.max()) if len(a) else 1.0
    if len(a):
        bgm = cv2.dilate((lbl == 1 + int(a.argmax())).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        obj = keep & ~bgm
        obj_share = float(obj.sum() / area)
        obj_edge = float(edge[obj].mean()) if obj.any() else 0.0
        obj_shapes = int((big & (a < 0.25 * a.max())).sum()) / max(obj_share, 0.05)
    else:
        bgm = np.zeros((H, W), bool)
        obj_share, obj_edge, obj_shapes = 0.0, 0.0, 0.0
    bw, bh = int(W * 0.22), int(H * 0.13)
    corners = sum(int(edge[y0:y0 + bh, x0:x0 + bw].mean() > 0.01) for y0 in (0, H - bh) for x0 in (0, W - bw))
    rim = np.concatenate([(~bgm)[0], (~bgm)[-1], (~bgm)[:, 0][keep[:, 0]], (~bgm)[:, -1][keep[:, -1]]])
    border = float(rim.mean())
    rows = [round(float(edge[int(a0 * H):int(a1 * H)].mean()), 4) for a0, a1 in ((0, .25), (.25, .5), (.5, .7), (.84, 1))]

    gx, gy = 6, 10
    cw, ch = W // gx, H // gy
    cells, emp = 0, 0
    for j in range(gy):
        if not keep[j * ch:(j + 1) * ch].all():
            continue
        for i in range(gx):
            cells += 1
            if edge[j * ch:(j + 1) * ch, i * cw:(i + 1) * cw].mean() < 0.004:
                emp += 1

    q = (np.clip(lab[..., 0] // 8, 0, 12) * 400 + np.clip((lab[..., 1] + 100) // 10, 0, 19) * 20
         + np.clip((lab[..., 2] + 100) // 10, 0, 19)).astype(np.int32)[keep & ~edge]
    cnt = np.bincount(q.ravel())
    colours = int((cnt / max(1, cnt.sum()) >= 0.005).sum())

    return {"f": os.path.basename(path), "shapes": shapes, "small": small, "edge": round(float(edge[keep].mean()), 4),
            "empty": round(emp / max(1, cells), 3), "bg": round(bg, 3), "colours": colours, "thirds": thirds,
            "obj": round(obj_share, 3), "obj_edge": round(obj_edge, 4), "obj_dens": round(obj_shapes, 1),
            "corners": corners, "border": round(border, 3), "rows": rows}


def files_of(args):
    out = []
    for a in args:
        if os.path.isdir(a):
            out += sorted(glob.glob(os.path.join(a, "*.jpg")) + glob.glob(os.path.join(a, "*.png")))
        else:
            out += sorted(glob.glob(a)) or [a]
    return out


if __name__ == "__main__":
    dst, fs = sys.argv[1], files_of(sys.argv[2:])
    with ProcessPoolExecutor(int(os.environ.get("DENSITY_WORKERS", "4"))) as ex:
        res = [r for r in ex.map(measure, fs, chunksize=16) if r]
    json.dump(res, open(dst, "w", encoding="utf-8"))
    for k in ("shapes", "small", "edge", "empty", "bg", "colours", "obj", "obj_edge", "obj_dens", "corners", "border"):
        v = np.array([r[k] for r in res], float)
        print(f"{k:8s} p10 {np.percentile(v, 10):8.3f}  p25 {np.percentile(v, 25):8.3f}  med {np.median(v):8.3f}  "
              f"p75 {np.percentile(v, 75):8.3f}  p90 {np.percentile(v, 90):8.3f}")
    print(len(res), "frames")
