"""How one picture becomes the next: every hard cut AND every big change inside a shot (a zoom into something, a morph, a pan to a
new place, a scene rebuilt piece by piece), found in the 60 fps frames, timed to the frame, and named by Legion's brain from a
strip of frames across it (what carries A into B). Feeds the SPEC's transition section and the engine's transitions.

usage: set STYLELAB=<style folder>          (videos in all/refs60h/, or pass video paths)
  py -3.12 stylelab/change_study.py --find OUT_DIR video.mp4 [...]     events + strips -> OUT_DIR/<vid>.json, OUT_DIR/strips/*.jpg
  py -3.12 stylelab/change_study.py --name OUT_DIR                     the brain names each event (resume-safe, 4 at a time)
  py -3.12 stylelab/change_study.py --agg OUT_DIR                      the numbers
"""
import glob
import json
import os
import pathlib
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

W, H = 180, 320
CAP = (0.70, 0.84)
LEGION = pathlib.Path(__file__).resolve().parent.parent

KINDS = ("plain-cut, match-cut, zoom-through, zoom-out-reveal, morph, carry, object-wipe, pan-to-new-place, rebuild-in-place, whip, "
         "push, iris, flash, dissolve, split, pixel-assemble, camera-orbit, other")
PROMPT = """Each image is a STRIP of frames from a vertical 2D vector explainer animation, left to right in time ({n} strips). The strip
spans a moment where the picture changes from one idea to the next. Tile labels show the time in frames at 60 fps relative to the
change (f-18 ... f+30). Strip labels: {labels}.

For EACH strip say how picture A becomes picture B:
- "kind": one of [{kinds}]
  plain-cut = a hard cut with nothing linking A and B; match-cut = a hard cut where a shape, colour or position carries across;
  zoom-through = the camera dives INTO something in A (a window, an eye, a bubble, a cell, a screen) and B is inside it;
  zoom-out-reveal = the camera pulls back and A turns out to be inside something (a screen, a bubble, a planet, a head);
  morph = the hero itself turns into the next thing; carry = one element stays or travels while the scene changes around it;
  object-wipe = a foreground object sweeps across and B is behind it; pan-to-new-place = the camera slides to a new part of
  the same world; rebuild-in-place = no cut: elements leave and new ones arrive in the same frame, staggered;
  camera-orbit = the view turns around the subject.
- "link": what carries across from A to B, a few words ("the planet's circle becomes the cell", "nothing")
- "a" and "b": what A shows and what B shows, a few words each
- "moves": how many separate things move during the change (a number)
- "blur": true if there is motion blur or smearing during the change
- "ease": one of [snap, fast-in-soft-out, slow-in-fast-out, even, none]
- "frames": how many frames (60 fps) the change itself takes, from the first frame that changes to the first settled frame (0 for a hard cut)
Return ONLY JSON: {{"strips": [{{"label": "...", "kind": "...", "link": "...", "a": "...", "b": "...", "moves": 1, "blur": false,
"ease": "...", "frames": 0}}]}}"""


def frames(path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps=60,scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         stdout=subprocess.PIPE)
    out = []
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        out.append(np.frombuffer(b, np.uint8).reshape(H, W, 3))
    return out


def find(out_dir, videos):
    out = pathlib.Path(out_dir); (out / "strips").mkdir(parents=True, exist_ok=True)
    keep = np.ones((H, W), bool); keep[int(CAP[0] * H):int(CAP[1] * H)] = False
    for v in videos:
        vid = pathlib.Path(v).stem
        if (out / f"{vid}.json").exists():
            continue
        F = frames(v)
        if len(F) < 90:
            continue
        G = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) for f in F]
        d1 = np.array([0.0] + [float(np.abs(G[t] - G[t - 1])[keep].mean()) for t in range(1, len(G))])
        cuts = [t for t in range(2, len(G) - 2) if d1[t] > 14 and d1[t] > 4 * max(np.median(d1[max(0, t - 4):t]), np.median(d1[t + 1:t + 5]), 0.8)]
        cuts = [t for k, t in enumerate(cuts) if k == 0 or t - cuts[k - 1] > 6]
        # big changes without a cut: what is on screen at t differs a lot from 0.5 s before, with no cut in between
        d30 = np.zeros(len(G))
        for t in range(30, len(G)):
            if not any(t - 30 < c <= t for c in cuts):
                d30[t] = float(np.abs(G[t] - G[t - 30])[keep].mean())
        ch = []
        for t in range(30, len(G) - 30):
            if d30[t] > 22 and d30[t] == d30[max(0, t - 45):t + 45].max() and all(abs(t - c) > 45 for c in cuts):
                ch.append(t - 15)                          # the middle of the change
        ev = [{"t": round(t / 60, 3), "f": t, "type": "cut", "jump": round(float(d1[t]), 1)} for t in cuts] + \
             [{"t": round(t / 60, 3), "f": t, "type": "change", "jump": round(float(d30[t + 15]), 1)} for t in ch]
        ev.sort(key=lambda e: e["f"])
        offs = (-18, -9, -3, 0, 3, 9, 18, 30)
        for k, e in enumerate(ev):
            tiles = []
            for o in offs:
                f = F[min(len(F) - 1, max(0, e["f"] + o))].copy()
                big = cv2.resize(f, (135, 240))
                cv2.putText(big, f"f{o:+d}", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 0), 3, cv2.LINE_AA)
                cv2.putText(big, f"f{o:+d}", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)
                tiles.append(big)
            e["strip"] = f"{vid}_{k:03d}"
            cv2.imwrite(str(out / "strips" / f"{vid}_{k:03d}.jpg"), np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 88])
        (out / f"{vid}.json").write_text(json.dumps({"video": v, "seconds": round(len(F) / 60, 2), "events": ev}, indent=1), encoding="utf-8")
        print(vid, f"{len(cuts)} cuts, {len(ch)} changes in {len(F) / 60:.0f} s", flush=True)


def name(out_dir):
    sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
    import app  # noqa: E402
    out = pathlib.Path(out_dir).resolve()
    (out / "named").mkdir(exist_ok=True)
    todo = [p for p in sorted((out / "strips").glob("*.jpg")) if not (out / "named" / f"{p.stem}.json").exists()]
    batches = [todo[k:k + 6] for k in range(0, len(todo), 6)]
    print(f"{len(todo)} strips in {len(batches)} calls", flush=True)

    def one(b):
        labels = [p.stem for p in b]
        for _ in range(2):
            try:
                got = app.claude_json(PROMPT.format(n=len(b), labels=", ".join(f"image {i + 1} = {l}" for i, l in enumerate(labels)), kinds=KINDS),
                                      images=[str(p) for p in b], want=dict)
                for i, s in enumerate((got.get("strips") or [])[:len(b)]):
                    lab = s.get("label") if s.get("label") in labels else labels[i]
                    (out / "named" / f"{lab}.json").write_text(json.dumps(s, indent=1), encoding="utf-8")
                return f"{labels[0]}.. ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:120]
        return f"{labels[0]}.. FAILED {err}"
    with ThreadPoolExecutor(4) as ex:
        for k, r in enumerate(ex.map(one, batches)):
            print(f"[{k + 1}/{len(batches)}] {r}", flush=True)


def agg(out_dir):
    out = pathlib.Path(out_dir)
    ev, secs = [], 0.0
    for f in sorted(out.glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8")); secs += d["seconds"]
        for e in d["events"]:
            n = out / "named" / f"{e['strip']}.json"
            if n.exists():
                e.update(json.loads(n.read_text(encoding="utf-8")))
            ev.append(e)
    named = [e for e in ev if e.get("kind")]
    P = lambda a, q: round(float(np.percentile(a, q)), 2) if len(a) else None
    cuts = [e for e in ev if e["type"] == "cut"]; ch = [e for e in ev if e["type"] == "change"]
    res = {"videos": len(list(out.glob("*.json"))), "seconds": round(secs), "cuts_per_min": round(60 * len(cuts) / max(1, secs), 2),
           "changes_per_min": round(60 * len(ch) / max(1, secs), 2), "named": len(named),
           "kinds": {k: round(sum(1 for e in named if e["kind"] == k) / max(1, len(named)), 3)
                     for k in sorted({e["kind"] for e in named}, key=lambda k: -sum(1 for e in named if e["kind"] == k))},
           "by_kind": {}}
    for k in res["kinds"]:
        v = [e for e in named if e["kind"] == k]
        res["by_kind"][k] = {"n": len(v), "frames_p25_50_75": [P([float(e.get("frames") or 0) for e in v], q) for q in (25, 50, 75)],
                             "blur": round(sum(1 for e in v if e.get("blur")) / len(v), 2),
                             "ease": {x: sum(1 for e in v if e.get("ease") == x) for x in ("snap", "fast-in-soft-out", "slow-in-fast-out", "even", "none")},
                             "moves_med": P([float(e.get("moves") or 0) for e in v], 50),
                             "links": [e.get("link") for e in v if e.get("link") and e.get("link") != "nothing"][:12]}
    (out / "summary.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "--find":
        find(a[1], a[2:])
    elif a[0] == "--name":
        name(a[1])
    else:
        agg(a[1])
