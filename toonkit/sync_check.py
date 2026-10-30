"""sync_check.py: do the sound cues land on the frame of the thing they sound for? Reads the rendered picture (toon.mp4) and
cues.json, measures where the picture actually moves (frame-to-frame change at 135 x 240, the caption band masked), finds the
visual hits (sudden rises: a pop, an impact, a cut, the fastest frame of a move) and reports each cue's distance to the nearest
hit. Cues are mixed in by Legion AFTER the render, so fixing them costs nothing:

    python sync_check.py            report
    python sync_check.py --fix      move every cue that is 1-5 frames off onto its hit (cues.json rewritten, the old one kept
                                    as cues_before_sync.json); cues with no hit near them are listed, not moved

Rule (creator, 2026-10-27): sound design hits on the exact frame of the visual event, not just near the voice."""
import json, pathlib, sys
import cv2
import numpy as np

HERE = pathlib.Path(__file__).parent
vid = HERE / "toon.mp4"
cf = HERE / "cues.json"
if not vid.exists() or not cf.exists():
    sys.exit("needs toon.mp4 and cues.json in this folder")
cap = cv2.VideoCapture(str(vid))
fps = cap.get(cv2.CAP_PROP_FPS) or 30
# per cell of a 9 x 16 grid (the caption band left out): a small pop in one corner counts as much as a cut over the whole frame
rows_ok = [r for r in range(16) if not (0.70 <= (r + 0.5) / 16 <= 0.84)]
prev, E = None, []
while True:
    ok, fr = cap.read()
    if not ok:
        break
    g = cv2.cvtColor(cv2.resize(fr, (135, 240), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
    d = np.zeros((16, 9), np.float32) if prev is None else np.abs(g - prev).reshape(16, 15, 9, 15).mean(axis=(1, 3))
    E.append(d[rows_ok].ravel())
    prev = g
cap.release()
E = np.array(E)                                   # frames x cells
n = len(E)
win = max(3, int(fps))
score = np.zeros(n)
for i in range(1, n):
    base = np.median(E[max(0, i - win):i], axis=0)
    score[i] = float(np.max((E[i] - base) / (base + 2.0)))     # how far the most changed cell jumps over its own last second
hits = []
for i in range(2, n - 1):
    if score[i] > 1.5 and score[i] >= score[i - 1] and score[i] >= score[i + 1]:
        j = i
        while j > 1 and score[j - 1] > 0.5 * score[i]:         # back to where the jump starts: the frame the thing appears
            j -= 1
        hits.append(j)
hits = np.array(sorted(set(hits)))
cues = json.loads(cf.read_text(encoding="utf-8"))
rows, moved, lonely = [], 0, []
for c in cues:
    f = round(c[0] * fps)
    if not len(hits):
        lonely.append(c); continue
    k = int(hits[np.argmin(np.abs(hits - f))]); d = k - f
    rows.append((c[0], c[1], d))
    if 1 <= abs(d) <= 5 and "--fix" in sys.argv:
        c[0] = round(k / fps, 3); moved += 1
    elif abs(d) > 5:
        lonely.append(c)
on = sum(1 for _, _, d in rows if abs(d) <= 1)
print(f"{len(cues)} cues, {len(hits)} visual hits found; {on} cues within 1 frame of a hit, {len(lonely)} with no hit within 5 frames")
for t, name, d in rows:
    if abs(d) > 1:
        print(f"  {t:6.2f} s  {name.split('/')[-1]:32}  {'+' if d > 0 else ''}{d} frames from its hit" + ("" if abs(d) <= 5 else "  (no hit near: is there a visual event for this sound?)"))
if "--fix" in sys.argv and moved:
    (HERE / "cues_before_sync.json").write_text(cf.read_text(encoding="utf-8"), encoding="utf-8")
    cf.write_text(json.dumps(sorted(cues, key=lambda c: c[0])), encoding="utf-8")
    print(f"moved {moved} cues onto their hits (old cues kept in cues_before_sync.json)")
