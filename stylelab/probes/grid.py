"""Frames with a measuring grid (every 5 %, labelled every 10 %) so positions can be read off precisely."""
import pathlib, subprocess, sys
import cv2
import numpy as np

import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.ROOT


def grab(vid, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(HERE / "refs" / f"{vid}.mp4"), "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3).copy()


def gridded(img, scale=0.5, crop=None):
    if crop:
        x0, y0, x1, y1 = crop
        img = img[y0:y1, x0:x1]
    h, w = img.shape[:2]
    out = cv2.resize(img, (int(w * scale), int(h * scale)))
    H, W = out.shape[:2]
    for i in range(1, 20):
        c = (0, 255, 255) if i % 2 == 0 else (0, 160, 255)
        th = 1
        x = int(W * i / 20); y = int(H * i / 20)
        cv2.line(out, (x, 0), (x, H), c, th); cv2.line(out, (0, y), (W, y), c, th)
        if i % 2 == 0:
            cv2.putText(out, str(i * 5), (x + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)
            cv2.putText(out, str(i * 5), (2, y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)
    return out


jobs = [a.split(":") for a in sys.argv[1:]]          # vid:t:name[:x0,y0,x1,y1]
tiles = []
for j in jobs:
    vid, t, name = j[0], float(j[1]), j[2]
    crop = tuple(int(v) for v in j[3].split(",")) if len(j) > 3 else None
    g = gridded(grab(vid, t), 0.5 if not crop else 540 / (crop[2] - crop[0]), crop)
    cv2.imwrite(str(HERE / "deep2" / f"grid_{name}.png"), g)
    tiles.append(g)
hmax = max(t.shape[0] for t in tiles)
row = np.hstack([np.pad(t, ((0, hmax - t.shape[0]), (0, 0), (0, 0))) for t in tiles])
cv2.imwrite(str(HERE / "deep2" / "grid_sheet.png"), row)
print(row.shape)
