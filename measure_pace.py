#!/usr/bin/env python3
"""measure_pace.py - how fast does a reference Short cut? (free: ffmpeg on your computer, nothing is sent anywhere)

    python measure_pace.py "reference.mp4"                         # prints the pace and what it means for a style
    python measure_pace.py "reference.mp4" --write studio/styles/<style>.json    # also writes it into that style's pacing

Fast references (a shot held about a second) get pacing.jump_cut_s, so Legion re-crops the picture by hard cuts that often.
Slow, animated ones (a shot held many seconds, motion inside the shot) get none and keep their slow move, so a
slow style is never cut like a fast one. cut_s is always written: it is how long a shot stays up.
"""
import argparse
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path


def cuts(video: str, threshold: float = 0.25) -> tuple:
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
                               capture_output=True, text=True).stdout.strip() or 0)
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", video, "-vf", f"select='gt(scene,{threshold})',showinfo",
                          "-an", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    return dur, [float(x) for x in re.findall(r"pts_time:([0-9.]+)", err)]


def pace(video: str) -> dict:
    dur, cs = cuts(video)
    pts = [0.0] + [c for c in cs] + [dur]
    holds = [b - a for a, b in zip(pts, pts[1:]) if b - a > 0.15]      # a flash of two frames is not a shot
    if not holds:
        return {}
    med = statistics.median(holds)
    out = {"seconds": round(dur, 1), "shots": len(holds), "median_hold_s": round(med, 2),
           "average_hold_s": round(statistics.mean(holds), 2), "cut_s": round(med, 1)}
    if med <= 1.5:
        out["jump_cut_s"] = round(max(0.8, med * 1.15), 2)
        out["kind"] = "fast: the picture changes about every second"
    elif med <= 3.0:
        out["jump_cut_s"] = 0
        out["kind"] = "quick: normal cuts, no jump cuts"
    else:
        out["jump_cut_s"] = 0
        out["kind"] = "slow: long shots, the motion happens inside them - never jump-cut this style"
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--write", help="a style file (studio/styles/<name>.json) to put the pacing into")
    a = ap.parse_args()
    r = pace(a.video)
    if not r:
        print("could not read any cuts from that video")
        return 1
    print(json.dumps(r, indent=1))
    if a.write:
        f = Path(a.write)
        d = json.loads(f.read_text(encoding="utf-8"))
        p = d.setdefault("pacing", {})
        p["cut_s"], p["jump_cut_s"] = r["cut_s"], r["jump_cut_s"]
        f.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"written to {f}: cut_s={r['cut_s']}, jump_cut_s={r['jump_cut_s']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
