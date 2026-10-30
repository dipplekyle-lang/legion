"""Frame-by-frame sheets of his effect moments (every frame or every 2nd), numbered, for reading how each effect is built.
usage: python fx_sheets.py"""
import pathlib, subprocess
import numpy as np
import cv2

import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.sub("deep3")
REFS = HERE.parent / "refs"
OUT = HERE / "fx"; OUT.mkdir(exist_ok=True)
# (name, video, start s, end s, step frames)
MOMENTS = [
    ("sweat_rings", "ref-A", 2.20, 3.10, 1), ("happy_whip", "ref-A", 15.85, 16.75, 1),
    ("eject", "ref-B", 0.90, 1.80, 1), ("sweat_boss", "ref-B", 1.50, 2.70, 2),
    ("laugh_tears", "ref-D", 5.00, 7.00, 2), ("zz_night", "ref-D", 33.0, 36.6, 4),
    ("smoke_city", "ref-D", 46.0, 48.0, 4), ("gold_crack", "ref-D", 59.4, 62.0, 3),
    ("muzzle", "ref-E", 4.40, 6.10, 2), ("splinters", "ref-E", 6.40, 9.00, 2),
    ("coals", "ref-E", 22.4, 24.0, 3), ("powder_sweat", "ref-E", 28.4, 30.0, 3),
    ("explosion", "ref-E", 61.8, 63.5, 2), ("devils_lava", "ref-F", 33.9, 35.6, 3),
]
TW, TH = 216, 384


def grab(vid, t0, t1, step):
    s = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t0:.3f}", "-i", str(REFS / f"{vid}.mp4"), "-t", f"{t1 - t0:.3f}",
                        "-vf", f"select='not(mod(n\\,{step}))',scale={TW}:{TH}", "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                       capture_output=True).stdout
    return np.frombuffer(s, np.uint8).reshape(-1, TH, TW, 3)


for name, vid, t0, t1, step in MOMENTS:
    F = grab(vid, t0, t1, step); cols = 10; rows = int(np.ceil(len(F) / cols))
    sheet = np.full((rows * (TH + 18), cols * TW, 3), 30, np.uint8)
    for i, f in enumerate(F):
        r, c = divmod(i, cols); y = r * (TH + 18)
        sheet[y + 18:y + 18 + TH, c * TW:(c + 1) * TW] = f
        cv2.putText(sheet, f"{t0 + i * step / 30:.2f}s", (c * TW + 4, y + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    cv2.imwrite(str(OUT / f"{name}.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(name, len(F))
