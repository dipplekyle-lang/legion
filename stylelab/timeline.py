"""Half-second timeline of every reference video, from the frame measurements: speech, camera, colour, sharpness.
Writes timeline.md (one table per video). No script text: speech is counted, not transcribed."""
import json, pathlib, subprocess
import cv2
import numpy as np

import lab
HERE = lab.ROOT
FPS = 30
TITLES = lab.titles()
dis = json.loads((HERE / "deep2" / "dissolves.json").read_text(encoding="utf-8"))
out = ["# Half-second timelines (measured)", "",
       "Columns: `t` start of the half second; `words` spoken words starting in it (`p` = a pause over 0.3 s after a "
       "word); `motion` mean frame-to-frame change (0-255, x10); `cam` = `M` a camera move is happening, `D` a dissolve, "
       "`.` hold/drift; `warm` (R-B)/(R+B) x100; `bright` mean value x100; `sat` mean saturation x100; `c/e` sharpness of the "
       "centre band vs the top+bottom bands.", ""]
for vid, title in TITLES.items():
    meas = json.loads((HERE / "measure" / f"{vid}.json").read_text(encoding="utf-8"))
    words = json.loads((HERE / "measure" / f"{vid}.words.json").read_text(encoding="utf-8"))
    motion = np.load(HERE / "measure" / f"{vid}.motion.npy")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "refs" / f"{vid}.mp4"), "-vf", "fps=2,scale=108:192",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 192, 108, 3)
    tr = meas["camera_transitions"]
    dd = [tuple(x) for x in dis[vid]["dissolve_times"]]
    out += [f"## {title} ({vid}, {meas['seconds']} s)", "",
            "| t | words | motion | cam | warm | bright | sat | c/e |", "|---|---|---|---|---|---|---|---|"]
    for k in range(len(fr)):
        t0, t1 = k * 0.5, k * 0.5 + 0.5
        ws = [w for w in words if t0 <= w["s"] < t1]
        pause = any(t0 <= w["e"] < t1 and (i + 1 < len(words) and words[i + 1]["s"] - w["e"] > 0.3)
                    for i, w in enumerate(words))
        m = motion[int(t0 * FPS):int(t1 * FPS)]
        cam = "D" if any(a < t1 and b > t0 for a, b in dd) else "M" if any(a < t1 and b > t0 for a, b, _ in tr) else "."
        f = fr[k].astype(np.float32)
        r, b = f[..., 0].mean(), f[..., 2].mean()
        hsv = cv2.cvtColor(fr[k], cv2.COLOR_RGB2HSV)
        g = cv2.cvtColor(fr[k], cv2.COLOR_RGB2GRAY).astype(np.float32)
        lap = cv2.Laplacian(g, cv2.CV_32F) ** 2
        ce = lap[64:128].mean() / (np.concatenate([lap[:32].ravel(), lap[-32:].ravel()]).mean() + 1e-6)
        out.append(f"| {t0:4.1f} | {len(ws)}{'p' if pause else ''} | {m.mean() * 10:5.0f} | {cam} | {100 * (r - b) / (r + b + 1e-6):+4.0f} | "
                   f"{100 * hsv[..., 2].mean() / 255:3.0f} | {100 * hsv[..., 1].mean() / 255:3.0f} | {ce:4.1f} |".replace(" | |", " \\| |"))
    out.append("")
(HERE / "timeline.md").write_text("\n".join(out), encoding="utf-8")
print(len(out), "lines")
