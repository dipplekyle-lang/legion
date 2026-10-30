"""Every camera transition, frame by frame: a strip of 10 frames across each one (one row per transition, one sheet per video),
its measured direction and speed profile, then Legion's brain names each one (whip, zoom, zoom into a bubble, iris, morph, push,
dissolve, flash, carry-over...) and what links the two shots. -> deep4/transitions.json, deep4/trans_<vid>.jpg"""
import json, os, subprocess, sys
import cv2
import numpy as np

import lab
HERE = lab.sub("deep4")
LEGION = lab.LEGION
TW, TH, FPS = 108, 192, 30

PROMPT = """The image shows every camera transition of one animated YouTube Short (flat or 3D, judge from the pictures). One ROW per
transition, labelled #k with its start time; each row is 10 frames left to right, from just before the move to just after it.
Measured per row (dx/dy = average picture travel per frame in % of width, + = content moves right/down; zoom = size change):
{rows}
For EVERY row say, from the pictures and the numbers:
- "type": "whip" (fast pan with blur) | "push" (the next shot slides in and pushes the old one out) | "zoom-in" | "zoom-out" |
  "zoom-into" (dives into an element, e.g. a ring or a screen, and comes out in the next shot) | "iris" (circle/oval wipe) |
  "morph" (one object becomes the next) | "dissolve" | "flash" | "carry" (one element stays put while everything around it changes) |
  "element-move" (not a shot change: something big moves inside the same shot) | "other"
- "direction": "left" | "right" | "up" | "down" | "in" | "out" | "none"
- "blur": true if motion blur or smear is visible mid-move
- "link": what connects the two shots (same object, same shape, same colour, a match on position, nothing)
- "ease": how the speed goes over the 10 frames ("snap then settle", "even", "slow-fast-slow", ...)
- "why": one short sentence: why this transition here (what the narration or the story beat needs)
Return ONLY JSON: [{{"k": 0, "type": "...", "direction": "...", "blur": true, "link": "...", "ease": "...", "why": "..."}}, ...]"""


def grab(vid, times):
    out = []
    for t in times:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, t):.3f}", "-i", str(lab.REFS / f"{vid}.mp4"), "-frames:v", "1",
                              "-vf", f"scale={TW}:{TH}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
        out.append(np.frombuffer(raw, np.uint8).reshape(TH, TW, 3).copy() if len(raw) == TW * TH * 3 else np.zeros((TH, TW, 3), np.uint8))
    return out


def flow(fr):
    """Average travel per frame (phase correlation, % of width) and size change between first and last frame."""
    g = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) for f in fr]
    d = [cv2.phaseCorrelate(a, b)[0] for a, b in zip(g, g[1:])]
    dx = float(np.mean([x for x, _ in d])) / TW * 100; dy = float(np.mean([y for _, y in d])) / TW * 100
    sp = [round(float(np.hypot(x, y)) / TW * 100, 1) for x, y in d]
    return round(dx, 1), round(dy, 1), sp


def main():
    sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
    import app                                                       # noqa: E402
    got = {}
    for vid in lab.IDS:
        m = json.loads((lab.ROOT / "measure" / f"{vid}.json").read_text(encoding="utf-8"))
        tr = m.get("camera_transitions") or []
        tr = json.loads(tr) if isinstance(tr, str) else tr
        if not tr:
            got[vid] = []; continue
        rows, lines, nums = [], [], []
        for k, (a, b, *_) in enumerate(tr[:24]):
            ts = [a - 0.1 + (b - a + 0.2) * i / 9 for i in range(10)]
            fr = grab(vid, ts)
            dx, dy, sp = flow(fr)
            nums.append({"k": k, "t": a, "dur": round(b - a, 2), "dx": dx, "dy": dy, "speed_per_frame": sp})
            row = np.hstack(fr)
            cv2.putText(row, f"#{k} {a:.2f}s", (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
            rows.append(row); lines.append(f"#{k} t={a:.2f}s dur={b - a:.2f}s dx={dx} dy={dy} speed/frame={sp}")
        sheet = HERE / f"trans_{vid}.jpg"
        cv2.imwrite(str(sheet), np.vstack(rows))
        try:
            v = app.claude_json(PROMPT.format(rows="\n".join(lines)), images=[sheet], want=list)
        except Exception as e:                                       # one video's answer failing must not lose the rest
            v = [{"error": str(e)[:200]}]
        by = {int(x.get("k", -1)): x for x in v if isinstance(x, dict)}
        got[vid] = [{**n, **{kk: vv for kk, vv in by.get(n["k"], {}).items() if kk != "k"}} for n in nums]
        print(vid, len(nums), "transitions", flush=True)
    allt = [x for L in got.values() for x in L if "type" in x]
    types = {}
    for x in allt:
        types.setdefault(x["type"], []).append(x["dur"])
    got["summary"] = {"n": len(allt), "by_type": {k: {"n": len(v), "share": round(len(v) / max(1, len(allt)), 2),
                                                      "dur_p50": round(float(np.median(v)), 2)} for k, v in sorted(types.items(), key=lambda kv: -len(kv[1]))},
                      "blur_share": round(sum(bool(x.get("blur")) for x in allt) / max(1, len(allt)), 2),
                      "directions": {d: sum(x.get("direction") == d for x in allt) for d in ("left", "right", "up", "down", "in", "out", "none")}}
    (HERE / "transitions.json").write_text(json.dumps(got, indent=1), encoding="utf-8")
    print(json.dumps(got["summary"], indent=1))


if __name__ == "__main__":
    main()
