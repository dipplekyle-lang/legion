"""How things ENTER inside a held shot (motion-design styles): every pop, slide, grow or appear while the camera holds, measured
frame by frame. Per event: how many frames the move takes, overshoot, frames to the peak, slide distance, the element's size and
place, and which sound lands with it (and how many frames from the motion). Also the stagger between moves in one shot.
-> deep4/pops.json, deep4/pops_sheet.jpg (strips of the biggest entrances, for the eye)."""
import json
import cv2
import numpy as np
import subprocess

import lab
HERE = lab.sub("deep4")
W, H, FPS = 216, 384, 30
DIFF = 20                                   # grey levels: a pixel that changed (flat vector art changes hard)
ACT, QUIET = 0.002, 0.0007                  # share of changed pixels: something moves / nothing moves
CAP = (int(0.755 * H), int(0.815 * H))      # caption line (changes on every word): never an event


def frames(vid):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(lab.REFS / f"{vid}.mp4"), "-vf", f"scale={W}:{H},format=gray",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
    return f


def changed(a, b):
    m = np.abs(a - b) > DIFF
    m[CAP[0]:CAP[1]] = False
    return m


def blocked(t, m):
    """Near a cut or camera move: entrances there belong to the transition, not to the shot."""
    if any(-0.2 <= t - c <= 0.35 for c in m.get("hard_cuts", [])):
        return True
    tr = m.get("camera_transitions", [])
    tr = json.loads(tr) if isinstance(tr, str) else tr
    return any(a - 0.15 <= t <= b + 0.35 for a, b, *_ in tr)


def measure(vid):
    m = json.loads((lab.ROOT / "measure" / f"{vid}.json").read_text(encoding="utf-8"))
    try:
        sfx = json.loads((lab.ROOT / "deep3" / f"sfx_{vid}.json").read_text(encoding="utf-8"))["events"]
    except (OSError, ValueError, KeyError):
        sfx = []
    f = frames(vid); n = len(f)
    c = np.array([0.0] + [changed(f[i], f[i - 1]).mean() for i in range(1, n)])
    events, i = [], 4
    # in these styles something always moves a little (idle bobs, blinks, particles), so a move starts where the change JUMPS
    # (at least double the frame before, which was not rising) and ends when it has decayed to 15 % of its peak
    start = lambda k: c[k] >= ACT and c[k] >= 2.0 * max(c[k - 1], 1e-4) and c[k - 1] <= 1.2 * c[k - 2]
    while i < n - 4:
        if start(i) and not blocked(i / FPS, m):
            j = i + 1; peak = c[i]
            while j < n - 2 and j - i < 75 and not (j > i + 1 and start(j)):
                peak = max(peak, c[j])
                if c[j] < max(QUIET, 0.15 * peak) and c[j] < c[j - 1]:
                    break
                j += 1
            if j - i >= 75 or blocked(j / FPS, m):          # a continuous animation or runs into a cut
                i = j; continue
            seg = c[i:j + 1]; pk_c = i + int(np.argmax(seg))
            decay = [c[k + 1] / c[k] for k in range(pk_c, j) if c[k] > 2 * QUIET and c[k + 1] > 0]
            B, F = f[i - 2], f[min(n - 1, j + 2)]
            M = cv2.morphologyEx(changed(F, B).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            k, lab_, st, _ = cv2.connectedComponentsWithStats(M)
            if k < 2:
                i = j; continue
            big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
            area = st[big, cv2.CC_STAT_AREA] / (W * H)
            if area < 0.002:
                i = j; continue
            region = cv2.dilate((lab_ == big).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
            x0, y0, bw, bh = st[big, :4]
            sz_f = np.sqrt(bw * bh); cx_f, cy_f = x0 + bw / 2, y0 + bh / 2
            curve, travel = [], []
            for q in range(i - 1, j + 3):
                d = changed(f[min(n - 1, q)], B) & region
                ys, xs = np.nonzero(d)
                if len(xs) < 6:
                    curve.append(0.0); travel.append(None); continue
                curve.append(float(np.sqrt((xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1)) / sz_f))
                travel.append(float(np.hypot(xs.mean() - cx_f, ys.mean() - cy_f) / W))
            cv_ = np.array(curve)
            pk = int(np.argmax(cv_))
            tr0 = next((t for t in travel if t is not None), 0.0)
            over = float(cv_[pk] - cv_[-1]) if cv_[-1] > 0 else 0.0
            settle = next((q for q in range(pk, len(cv_)) if abs(cv_[q] - cv_[-1]) <= 0.02 * max(cv_[-1], 1e-6)
                           and all(abs(cv_[r] - cv_[-1]) <= 0.02 * max(cv_[-1], 1e-6) for r in range(q, len(cv_)))), len(cv_) - 1)
            first = float(cv_[1]) if len(cv_) > 1 else 0.0
            kind = ("slide" if tr0 >= 0.05 and first > 0.6 else "pop" if first < 0.5 and tr0 < 0.05
                    else "grow" if first < 0.5 else "appear" if first >= 0.85 else "other")
            t0 = i / FPS
            near = min(sfx, key=lambda e: abs(e["t"] - t0), default=None)
            snd = near if near and abs(near["t"] - t0) <= 0.15 else None
            events.append({"t": round(t0, 2), "frames": j - i, "kind": kind, "size_share": round(float(area), 4),
                           "motion_frames_to_peak": pk_c - i, "decay_per_frame": round(float(np.median(decay)), 3) if decay else None,
                           "centre": [round(cx_f / W, 2), round(cy_f / H, 2)], "overshoot": round(max(0.0, over), 3),
                           "frames_to_peak": pk - 1, "frames_to_settle": settle - 1, "start_scale": round(first, 2),
                           "slide_share_w": round(tr0, 3), "curve": [round(v, 2) for v in cv_.tolist()],
                           "sound": ({"kind": snd["kind"], "frames_after_motion": round((snd["t"] - t0) * FPS, 1)} if snd else None)})
            i = j
        i += 1
    shots = json.loads((lab.ROOT / "scenes" / "shots.json").read_text(encoding="utf-8"))
    gaps = []
    for s in (s for s in shots if s["vid"] == vid):
        on = [e["t"] for e in events if s["a"] <= e["t"] < s["b"]]
        gaps += [round((b - a) * FPS) for a, b in zip(on, on[1:]) if b - a < 1.5]
    return events, gaps, f


def q(xs, ps=(25, 50, 75)):
    return [round(float(np.percentile(xs, p)), 2) for p in ps] if len(xs) else None


out, allev, allgaps, strips = {}, [], [], []
for vid in lab.IDS:
    ev, gaps, f = measure(vid)
    out[vid] = {"events": ev, "stagger_frames": gaps}
    allev += ev; allgaps += gaps
    for e in sorted(ev, key=lambda e: -e["size_share"])[:3]:            # the biggest entrances, for the eye
        i0 = int(e["t"] * FPS); n = e["frames"] + 4
        idx = [min(len(f) - 1, i0 - 2 + round(k * n / 7)) for k in range(8)]
        strips.append(np.hstack([cv2.putText(f[x].astype(np.uint8).copy(), f"{vid[:4]} {e['t']}s +{x - i0}f", (2, 12),
                                             cv2.FONT_HERSHEY_SIMPLEX, 0.32, 255, 1) for x in idx]))
summary = {"events": len(allev), "per_minute": round(len(allev) / max(1e-6, sum(json.loads((lab.ROOT / "measure" / f"{v}.json")
                                                                                       .read_text(encoding="utf-8"))["seconds"] for v in lab.IDS) / 60), 1),
           "kinds": {k: sum(e["kind"] == k for e in allev) for k in ("pop", "grow", "slide", "appear", "other")},
           "frames_p25_50_75": q([e["frames"] for e in allev]),
           "by_kind": {k: {"n": len(L), "frames_p25_50_75": q([e["frames"] for e in L]), "frames_to_peak_p50": q([e["frames_to_peak"] for e in L], (50,)),
                           "overshoot_share": round(sum(e["overshoot"] > 0.03 for e in L) / len(L), 2),
                           "overshoot_p50_when_any": q([e["overshoot"] for e in L if e["overshoot"] > 0.03], (50,)),
                           "slide_share_w_p50": q([e["slide_share_w"] for e in L], (50,))}
                       for k in ("pop", "grow", "slide", "appear") for L in [[e for e in allev if e["kind"] == k]] if L},
           "size_share_p25_50_75": q([e["size_share"] for e in allev]),
           "motion_frames_to_peak_p25_50_75": q([e["motion_frames_to_peak"] for e in allev]),
           "decay_per_frame_p25_50_75": q([e["decay_per_frame"] for e in allev if e["decay_per_frame"]]),
           "decay_note": "speed this frame / speed last frame after the peak; 1 - decay = share of the remaining way covered per frame",
           "with_sound_share": round(sum(e["sound"] is not None for e in allev) / max(1, len(allev)), 2),
           "sound_frames_after_motion_p25_50_75": q([e["sound"]["frames_after_motion"] for e in allev if e["sound"]]),
           "sound_kind_by_move": {k: {s: sum(1 for e in allev if e["kind"] == k and e["sound"] and e["sound"]["kind"] == s)
                                      for s in ("click", "thump", "boom", "impact", "mixed")} for k in ("pop", "grow", "slide", "appear")},
           "stagger_frames_p25_50_75": q(allgaps),
           "note": "camera-held shots only; caption line excluded; size = changed area / frame; curve = element size / final size per frame"}
out["summary"] = summary
(HERE / "pops.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
if strips:
    cv2.imwrite(str(HERE / "pops_sheet.jpg"), np.vstack(strips))
print(json.dumps(summary, indent=1))
