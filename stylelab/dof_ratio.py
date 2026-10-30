"""Depth of field as a number (SPEC 112): sharpness of the sharpest cell / the median cell (Laplacian variance on a 6 x 10
grid, caption band left out). The reference videos at 1 frame/s vs our stills (folder given, else <study>/ours). usage: python dof_ratio.py [stills dir]"""
import glob, pathlib, subprocess, sys
import numpy as np
import cv2

import lab
HERE = lab.sub("deep3")
REFS = HERE.parent / "refs"
OURS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else lab.ROOT / "ours"
IDS = lab.IDS
w, h = 540, 960


def ratio(bgr):
    g = cv2.cvtColor(cv2.resize(bgr, (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
    lap = cv2.Laplacian(g, cv2.CV_32F)
    v = []
    for r in range(10):
        for c in range(6):
            y0, y1, x0, x1 = r * h // 10, (r + 1) * h // 10, c * w // 6, (c + 1) * w // 6
            if 0.64 * h <= y0 < 0.77 * h and 1 <= c <= 4:
                continue                                    # the caption
            v.append(float(lap[y0:y1, x0:x1].var()))
    v = np.array(v); return float(v.max() / max(1e-3, np.median(v))), float(np.median(v))


def frames_of(vid):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(REFS / f"{vid}.mp4"), "-vf", f"fps=1,scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


his = [ratio(f) for v in IDS for f in frames_of(v)]
print("his  ratio p25/50/75", [round(float(np.percentile([a for a, _ in his], p)), 1) for p in (25, 50, 75)],
      "median-cell sharpness p50", round(float(np.median([b for _, b in his])), 1))
for f in sorted(glob.glob(str(OURS / "s_*.png"))):
    a, b = ratio(cv2.imread(f)); print(pathlib.Path(f).name, "ratio", round(a, 1), "median cell", round(b, 1))
