"""motion_qa.py: the motion lab's render-look-fix loop, as code. It looks at a finished video the way a motion designer
would, with numbers: how much of it is still, where it flashes, how long its shots run, whether fast moves stop dead.
Free: it only reads the video on this computer.

    python motion_qa.py video.mp4 [--sheet contact.png]

report(path) returns {"ok": bool, "warnings": [...], "numbers": {...}}. A warning always names a time, so the fix is a
note with a frame number, never a feeling.
"""
import argparse
import subprocess
from pathlib import Path

import numpy as np

SAMPLE_FPS = 15                     # looking at 15 frames a second is enough to see motion, cuts and flashes
STILL = 0.45                        # mean pixel change per sample below this = nothing moves
CUT = 14.0                          # a jump above this between samples = a cut
FLASH = 28.0                        # a brightness jump above this = a flash


def _frames(path: str, w: int = 160, h: int = 90) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"fps={SAMPLE_FPS},scale={w}:{h},format=gray",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def analyze(path: str) -> dict:
    f = _frames(path)
    if len(f) < 4:
        return {"seconds": 0.0}
    d = np.abs(np.diff(f, axis=0)).mean((1, 2))                        # change from each sample to the next
    lum = f.mean((1, 2))
    dl = np.abs(np.diff(lum))
    secs = len(f) / SAMPLE_FPS
    still = d < STILL
    stretches, i = [], 0
    while i < len(still):                                              # runs of stillness
        if still[i]:
            j = i
            while j < len(still) and still[j]:
                j += 1
            if (j - i) / SAMPLE_FPS >= 1.0:
                stretches.append((round(i / SAMPLE_FPS, 1), round(j / SAMPLE_FPS, 1)))
            i = j
        else:
            i += 1
    cuts = [round(k / SAMPLE_FPS, 2) for k in range(len(d)) if d[k] > CUT and (k == 0 or d[k - 1] <= CUT)]
    shots = np.diff([0.0] + cuts + [secs]) if cuts else np.array([secs])
    flashes = [k for k in range(len(dl)) if dl[k] > FLASH]
    worst_flash = max((sum(1 for k in flashes if t <= k < t + SAMPLE_FPS) for t in range(0, max(1, len(dl) - SAMPLE_FPS))), default=0)
    dead = [round(k / SAMPLE_FPS, 1) for k in range(1, len(d) - 2) if d[k - 1] > 6 and d[k] < 0.3 and d[k + 1] < 0.3]
    return {"seconds": round(secs, 1), "still_pct": round(float(still.mean()) * 100, 1), "still_stretches": stretches,
            "cuts": len(cuts), "avg_shot_s": round(float(shots.mean()), 2), "longest_shot_s": round(float(shots.max()), 1),
            "max_flashes_per_s": int(worst_flash), "dead_stops_at_s": dead, "avg_motion": round(float(d.mean()), 2)}


def report(path: str) -> dict:
    n = analyze(path)
    w = []
    if not n.get("seconds"):
        return {"ok": False, "warnings": ["could not read the video"], "numbers": n}
    if n["still_pct"] > 25:
        w.append(f"{n['still_pct']}% of the video is still; a motion piece keeps nearly everything moving (aim under 15%)")
    for a, b in n["still_stretches"][:4]:
        w.append(f"nothing moves from {a}s to {b}s ({round(b - a, 1)} s): add a slow 2% push or cut it")
    if n["max_flashes_per_s"] > 3:
        w.append(f"up to {n['max_flashes_per_s']} flashes in one second; keep it to 3 or fewer")
    if n["avg_shot_s"] > 2.5 and n["seconds"] > 8:
        w.append(f"shots average {n['avg_shot_s']} s and the longest is {n['longest_shot_s']} s; it will feel slow")
    if len(n["dead_stops_at_s"]) >= 3:
        w.append(f"fast moves stop dead at {', '.join(str(x) + 's' for x in n['dead_stops_at_s'][:5])}: land them on a soft ease or spring")
    return {"ok": not w, "warnings": w, "numbers": n}


def contact_sheet(path: str, out: str, n: int = 12) -> str:
    secs = analyze(path).get("seconds") or 1.0
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vf", f"fps={n / secs:.4f},scale=400:-1,tile=4x{max(1, (n + 3) // 4)}",
                    "-frames:v", "1", str(out)], check=True)
    return str(out)


def text(path: str) -> str:
    r = report(path)
    n = r["numbers"]
    head = f"motion check: {n.get('seconds')} s, {n.get('cuts')} cuts, shots average {n.get('avg_shot_s')} s, {n.get('still_pct')}% still"
    return head + ("\n  OK, nothing to fix" if r["ok"] else "".join(f"\n  - {x}" for x in r["warnings"]))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Check a video's motion with numbers.")
    ap.add_argument("video")
    ap.add_argument("--sheet", default="")
    a = ap.parse_args()
    print(text(a.video))
    if a.sheet:
        print("contact sheet:", contact_sheet(a.video, a.sheet))
