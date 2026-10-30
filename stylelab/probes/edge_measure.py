"""Outline thickness, edge hardness and line colour at chosen points: native 96x96 crops zoomed 4x with a pixel grid,
plus an automatic stroke width (distance transform on the dark line pixels) and an edge-transition width."""
import json, pathlib, subprocess
import cv2
import numpy as np

import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.ROOT
OUT = HERE / "edge"
POINTS = [  # (video, t, label, x, y) at 1080x1920
    ("ref-A", 33.0, "W head outline (medium)", 184, 902), ("ref-A", 33.0, "W leg (limb)", 292, 1536),
    ("ref-A", 33.0, "W bench edge", 508, 1152), ("ref-A", 33.0, "W poster frame", 173, 538),
    ("ref-A", 33.0, "W door frame", 497, 672), ("ref-A", 33.0, "W aquarium top", 864, 806),
    ("ref-A", 33.0, "W ceiling lamp", 130, 250), ("ref-A", 33.0, "W eye", 335, 922),
    ("ref-A", 0.3, "S head outline", 680, 864), ("ref-A", 0.3, "S register box", 281, 1114),
    ("ref-A", 0.3, "S lamp shade rim", 540, 500), ("ref-A", 0.3, "S lottery board frame", 238, 710),
    ("ref-A", 0.3, "S pegboard far items", 972, 864), ("ref-A", 0.3, "S mouth", 562, 998),
    ("ref-D", 14.0, "C emperor head outline", 572, 1114), ("ref-D", 14.0, "C far castle tower", 302, 826),
    ("ref-D", 14.0, "C balustrade (mid)", 497, 1478), ("ref-D", 14.0, "C distant houses", 324, 691),
    ("ref-D", 14.0, "C cloud", 756, 250), ("ref-A", 5.0, "X close-up head outline", 222, 860),
    ("ref-A", 5.0, "X close-up brow", 484, 690), ("ref-A", 5.0, "X close-up mouth", 532, 936),
    ("ref-A", 5.0, "X close-up hair line", 560, 470), ("ref-A", 5.0, "X close-up ticket border", 425, 1100),
]
_cache = {}


def frame(v, t):
    k = (v, t)
    if k not in _cache:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(HERE / "refs" / f"{v}.mp4"), "-frames:v", "1",
                              "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
        _cache[k] = np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3).copy()
    return _cache[k]


def stroke_widths(crop):
    """Widths of the darkest strokes in the crop (pixels), from the distance transform's ridge."""
    v = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)[..., 2].astype(np.float32)
    thr = min(90.0, np.percentile(v, 12) + 25)
    dark = (v < thr).astype(np.uint8)
    if dark.sum() < 30:
        return None, None
    dist = cv2.distanceTransform(dark, cv2.DIST_L2, 3)
    ridge = (dist >= cv2.dilate(dist, np.ones((3, 3), np.uint8))) & (dist > 0.6)
    w = 2 * dist[ridge] - 1
    col = crop[dark > 0]
    b, g, r = [int(x) for x in np.median(col, axis=0)]
    return (round(float(np.median(w)), 1), round(float(np.percentile(w, 90)), 1)), "#%02X%02X%02X" % (r, g, b)


def edge_hardness(crop):
    """Median 10-90 % transition width (px) across the strongest edges: ~1-1.5 = crisp, 3+ = soft."""
    g = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gx, gy = cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)
    mag = np.hypot(gx, gy)
    ys, xs = np.nonzero(mag > np.percentile(mag, 97))
    widths = []
    for y, x in list(zip(ys, xs))[::7][:60]:
        dx, dy = gx[y, x], gy[y, x]
        n = np.hypot(dx, dy) + 1e-6
        dx, dy = dx / n, dy / n
        prof = []
        for s in np.arange(-8, 8.5, 0.5):
            px, py = x + s * dx, y + s * dy
            if 0 <= px < g.shape[1] - 1 and 0 <= py < g.shape[0] - 1:
                prof.append(cv2.getRectSubPix(g, (1, 1), (float(px), float(py)))[0, 0])
        if len(prof) < 20:
            continue
        p = np.array(prof); lo, hi = p.min(), p.max()
        if hi - lo < 40:
            continue
        q = (p - lo) / (hi - lo)
        if q[0] > q[-1]:
            q = q[::-1]
        i10 = np.argmax(q > 0.1); i90 = np.argmax(q > 0.9)
        if i90 > i10:
            widths.append((i90 - i10) * 0.5)
    return round(float(np.median(widths)), 2) if widths else None


def tile(crop, label):
    z = cv2.resize(crop, (384, 384), interpolation=cv2.INTER_NEAREST)
    for i in range(0, 384, 32):                                   # a grid line every 8 native pixels
        cv2.line(z, (i, 0), (i, 383), (0, 255, 255), 1); cv2.line(z, (0, i), (383, i), (0, 255, 255), 1)
    cv2.rectangle(z, (0, 0), (383, 22), (0, 0, 0), -1)
    cv2.putText(z, label[:44], (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    return z


res, tiles = [], []
for v, t, label, x, y in POINTS:
    f = frame(v, t)
    crop = f[max(0, y - 48):y + 48, max(0, x - 48):x + 48]
    sw, col = stroke_widths(crop)
    hd = edge_hardness(crop)
    res.append({"point": label, "video": v, "t": t, "stroke_px_median_p90": sw, "line_colour": col, "edge_10_90_px": hd})
    tiles.append(tile(crop, label))
for i in range(0, len(tiles), 6):
    row = tiles[i:i + 6]
    while len(row) < 6:
        row.append(np.zeros_like(tiles[0]))
    cv2.imwrite(str(OUT / f"zoom_{i // 6}.png"), np.hstack(row))
(OUT / "edges.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
for r in res:
    print(f"{r['point']:28s} stroke {r['stroke_px_median_p90']}  colour {r['line_colour']}  edge10-90 {r['edge_10_90_px']}px")
