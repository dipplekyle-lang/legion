"""Find flicker in a rendered video: pixels that jump for a frame or two and come back (A -> B -> A), or flip between two
states, instead of moving smoothly. Real motion changes a pixel and keeps it changed; flicker toggles.

Per frame t: toggle = |f(t) - f(t-1)| large AND |f(t+1) - f(t-1)| small (the pixel came back). Toggles are counted per
grid cell over the clip; cells that toggle again and again are reported with their times, plus a heat map.

usage: py -3.12 stylelab/flicker_check.py video.mp4 [--from 0 --to 30] [--out flicker.png]
Feeds BUILD.md: anything drawn with randomness must be seeded per OBJECT, never by position or time.
"""
import argparse
import subprocess

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--from", dest="t0", type=float, default=0)
ap.add_argument("--to", dest="t1", type=float, default=1e9)
ap.add_argument("--out", default="")
ap.add_argument("--jump", type=float, default=28.0, help="luma jump that counts (0-255)")
a = ap.parse_args()

W, H = 270, 480
cap = cv2.VideoCapture(a.video)
fps = cap.get(cv2.CAP_PROP_FPS) or 60
cap.set(cv2.CAP_PROP_POS_MSEC, a.t0 * 1000)
prev2 = prev = None
gx, gy = 9, 16
hits = np.zeros((gy, gx), np.int32)
times = {}
heat = np.zeros((H, W), np.float32)
i = int(a.t0 * fps)
while True:
    ok, fr = cap.read()
    if not ok or i / fps > a.t1:
        break
    g = cv2.cvtColor(cv2.resize(fr, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
    if prev2 is not None:
        jump = np.abs(prev - prev2) > a.jump
        back = np.abs(g - prev2) < a.jump * 0.35
        tog = jump & back
        tog = cv2.morphologyEx(tog.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)).astype(bool)
        if tog.any():
            heat += tog
            for j in range(gy):
                for k in range(gx):
                    n = int(tog[j * H // gy:(j + 1) * H // gy, k * W // gx:(k + 1) * W // gx].sum())
                    if n >= 4:
                        hits[j, k] += 1
                        times.setdefault((j, k), []).append(round((i - 1) / fps, 2))
    prev2, prev = prev, g
    i += 1

dur = max(1e-6, i / fps - a.t0)
print(f"{a.video}: {dur:.1f} s checked, {int(heat.sum())} toggling pixels in total")
worst = sorted(times.items(), key=lambda kv: -len(kv[1]))[:12]
for (j, k), ts in worst:
    if len(ts) < 3:
        continue
    print(f"  cell x {k / gx:.2f}-{(k + 1) / gx:.2f}  y {j / gy:.2f}-{(j + 1) / gy:.2f}: {len(ts)} toggles, at {ts[:8]}{' ...' if len(ts) > 8 else ''}")
if a.out:
    hm = (255 * np.clip(heat / max(1, np.percentile(heat[heat > 0], 99) if heat.any() else 1), 0, 1)).astype(np.uint8)
    cv2.imwrite(a.out, cv2.applyColorMap(hm, cv2.COLORMAP_INFERNO))
