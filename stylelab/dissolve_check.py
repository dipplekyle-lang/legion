"""For every measured transition: is it a cross-dissolve (middle frames = a mix of the frames before and after) or a
camera move (middle frames are a different, moving picture)?"""
import json, pathlib, subprocess
import numpy as np

import lab
HERE = lab.ROOT
FPS = 30
summary = {}
for p in sorted((HERE / "refs").glob("*.mp4")):
    vid = p.stem
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", "scale=90:160", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 160, 90).astype(np.float32)
    tr = json.loads((HERE / "measure" / f"{vid}.json").read_text(encoding="utf-8"))["camera_transitions"]
    kinds = []
    for a, b, _ in tr:
        i0, i1 = max(0, int(a * FPS) - 2), min(len(fr) - 1, int(b * FPS) + 2)
        if i1 - i0 < 4:
            continue
        A, B = fr[i0], fr[i1]
        d = B - A
        if np.abs(d).mean() < 6:                  # same picture before and after: a move inside one shot
            kinds.append(("move", a, b, None)); continue
        res = []
        for i in range(i0 + 1, i1):
            m = fr[i] - A
            al = float((m * d).sum() / ((d * d).sum() + 1e-6))
            al = min(1.0, max(0.0, al))
            res.append(np.abs(m - al * d).mean() / (np.abs(d).mean() + 1e-6))
        r = float(np.median(res))
        kinds.append(("dissolve" if r < 0.35 else "move", a, b, round(r, 2)))
    n_d = sum(1 for k in kinds if k[0] == "dissolve")
    summary[vid] = {"transitions": len(kinds), "dissolves": n_d,
                    "dissolve_times": [(k[1], k[2]) for k in kinds if k[0] == "dissolve"]}
    print(vid, f"{n_d}/{len(kinds)} dissolves", [f"{k[1]}-{k[2]}" for k in kinds if k[0] == "dissolve"])
(HERE / "deep2" / "dissolves.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
