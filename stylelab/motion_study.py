"""Deep camera + motion study of the reference Shorts, frame by frame.
Per frame: the camera's move between frames (zoom, roll, pan of the frame centre) from tracked points (captions masked),
what moves on top of the camera (residual after undoing the camera), exact repeat frames, and the caption's box.
Then per shot: move curves (time to peak, overshoot, settle), idle drift, shake, punch-in zooms, holds.
Writes motion_<id>.json.  usage: python motion_study.py [id ...]"""
import json, pathlib, subprocess, sys
import numpy as np
import cv2

import lab
HERE = lab.sub("deep3")
REFS = HERE.parent / "refs"
IDS = lab.IDS
w, h = 270, 480                       # quarter size for camera tracking
CAP0, CAP1 = 0.62, 0.79               # caption band (masked for tracking, measured on its own at full width)


def frames(path, vf, size, ch):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-vf", vf, "-f", "rawvideo", "-pix_fmt", "gray" if ch == 1 else "bgr24", "-"],
                         stdout=subprocess.PIPE)
    n = size[0] * size[1] * ch
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(size[1], size[0], *(() if ch == 1 else (ch,)))


MASK = np.full((h, w), 255, np.uint8); MASK[int(CAP0 * h):int(CAP1 * h)] = 0


def cam(prev, cur):
    """similarity transform prev->cur from tracked corners; returns (zoom, roll_deg, dx%, dy%, residual, n_points)"""
    pts = cv2.goodFeaturesToTrack(prev, 300, 0.01, 6, mask=MASK)
    if pts is None or len(pts) < 12: return None
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev, cur, pts, None, winSize=(21, 21), maxLevel=3)
    good = st.ravel() == 1
    if good.sum() < 12: return None
    M, inl = cv2.estimateAffinePartial2D(pts[good], nxt[good], method=cv2.RANSAC, ransacReprojThreshold=1.5)
    if M is None: return None
    s = float(np.hypot(M[0, 0], M[1, 0])); ang = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    c = np.array([w / 2, h / 2, 1.0]); mc = M @ c
    warped = cv2.warpAffine(prev, M, (w, h), borderMode=cv2.BORDER_REPLICATE)
    res = float(np.mean(cv2.absdiff(warped, cur)[MASK > 0]))
    return s, ang, float((mc[0] - w / 2) / w * 100), float((mc[1] - h / 2) / w * 100), res, int(inl.sum()) if inl is not None else 0


def caption_box(band):
    """white caption letters with a dark outline: bright, low-saturation pixels next to dark pixels"""
    g = cv2.cvtColor(band, cv2.COLOR_BGR2GRAY); hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV)
    white = (g > 225) & (hsv[..., 1] < 40)
    dark = cv2.dilate(((g < 70)).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    m = (white & dark).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 25), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    if n < 2: return None
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, bw, bh, a = stats[i]
    if a < 400 or bh < 25: return None
    return int(x), int(y), int(bw), int(bh)


def analyse(vid):
    path = REFS / f"{vid}.mp4"
    G = list(frames(path, f"scale={w}:{h}", (w, h), 1))
    rows = [None]
    for a, b in zip(G[:-1], G[1:]): rows.append(cam(a, b))
    dif = [0.0] + [float(np.mean(cv2.absdiff(a, b))) for a, b in zip(G[:-1], G[1:])]
    caps = [caption_box(f) for f in frames(path, f"crop=1080:{int((CAP1 - CAP0) * 1920)}:0:{int(CAP0 * 1920)}", (1080, int((CAP1 - CAP0) * 1920)), 3)]
    n = len(G); fps = 30
    d = np.array(dif); thr = max(12, np.median(d) + 6 * np.median(np.abs(d - np.median(d))))
    cut = [i for i in range(1, n) if (d[i] > thr and rows[i] is None) or d[i] > 2.2 * thr or (rows[i] is not None and rows[i][5] < 20 and d[i] > thr * 0.6)]
    # merge cuts closer than 3 frames (dissolves give runs)
    merged = []
    for i in cut:
        if merged and i - merged[-1][-1] <= 2: merged[-1].append(i)
        else: merged.append([i])
    bounds = [0] + [m[0] for m in merged] + [n]
    per = []
    for i in range(n):
        r = rows[i]
        per.append(None if r is None else {"z": round((r[0] - 1) * 100, 3), "roll": round(r[1], 3), "dx": round(r[2], 3), "dy": round(r[3], 3), "res": round(r[4], 2), "pts": r[5]})
    shots = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        if b - a < 6: continue
        idx = [i for i in range(a + 1, b) if per[i] is not None and per[i]["pts"] >= 25]
        if len(idx) < 4: shots.append({"t0": round(a / fps, 2), "t1": round(b / fps, 2), "frames": b - a, "trackable": False}); continue
        dx = np.array([per[i]["dx"] for i in idx]); dy = np.array([per[i]["dy"] for i in idx]); z = np.array([per[i]["z"] for i in idx])
        ro = np.array([per[i]["roll"] for i in idx]); res = np.array([per[i]["res"] for i in idx])
        sp = np.hypot(dx, dy)
        # zoom-equivalent speed: a 1 % zoom moves the frame edge by 0.5 % of width
        tot = sp + np.abs(z) * 0.5
        # move segments: speed above 0.35 %/frame for >= 3 frames
        moves = []; on = tot > 0.35; k = 0
        while k < len(on):
            if on[k]:
                j = k
                while j < len(on) and on[j]: j += 1
                if j - k >= 3:
                    seg = tot[k:j]; pk = int(np.argmax(seg))
                    sgn = np.sign(dx[k:j].sum()) if abs(dx[k:j].sum()) >= abs(dy[k:j].sum()) else np.sign(dy[k:j].sum())
                    axis = dx if abs(dx[k:j].sum()) >= abs(dy[k:j].sum()) else dy
                    after = axis[j:j + 8] * sgn
                    moves.append({"t": round(idx[k] / fps, 2), "frames": j - k, "peak_pct_per_frame": round(float(seg.max()), 2),
                                  "time_to_peak": round(pk / max(1, j - k - 1), 2),
                                  "dist_pct": round(float(np.hypot(dx[k:j].sum(), dy[k:j].sum())), 1), "zoom_pct": round(float(z[k:j].sum()), 1),
                                  "roll_deg": round(float(ro[k:j].sum()), 2),
                                  "overshoot_back_pct": round(float(-after[after < 0].sum()), 2) if len(after) else 0.0,
                                  "settle_frames": int(np.argmax(np.r_[tot[j:j + 20], [0]] < 0.08)) if j < len(tot) else 0})
                k = j
            else: k += 1
        still = tot < 0.35
        # shake: frame-to-frame jitter around a 7-frame moving average of the camera path
        def hf(v):
            if len(v) < 9: return 0.0
            sm = np.convolve(v, np.ones(7) / 7, "same"); return float(np.sqrt(np.mean((v - sm)[3:-3] ** 2)))
        rep = [i for i in range(a + 1, b) if dif[i] < 0.25]
        shots.append({"t0": round(a / fps, 2), "t1": round(b / fps, 2), "frames": b - a, "trackable": True,
                      "zoom_total_pct": round(float(z.sum()), 1), "pan_total_pct": [round(float(dx.sum()), 1), round(float(dy.sum()), 1)],
                      "roll_total_deg": round(float(ro.sum()), 2),
                      "idle_drift_pct_per_frame": round(float(np.median(tot[still])), 3) if still.any() else None,
                      "share_still_frames": round(float(still.mean()), 2), "jitter_pct": round(hf(dx) + hf(dy), 3),
                      "residual_median": round(float(np.median(res)), 2), "residual_p90": round(float(np.percentile(res, 90)), 2),
                      "repeat_frames": len(rep), "moves": moves})
    # caption behaviour at each change of word: box size over the first frames
    cap_events = []
    for i in range(1, n):
        if caps[i] and (not caps[i - 1] or abs(caps[i][2] - caps[i - 1][2]) > 12):
            seq = [caps[j] for j in range(i, min(n, i + 6)) if caps[j]]
            if len(seq) >= 4:
                w0 = seq[0][2]; cap_events.append({"f": i, "w": [c[2] for c in seq], "h": [c[3] for c in seq], "y": [c[1] for c in seq],
                                                   "cx": [c[0] + c[2] // 2 for c in seq], "grow_pct": round((max(c[2] for c in seq) / w0 - 1) * 100, 1)})
    out = {"frames": n, "cuts_frames": [m[0] for m in merged], "cut_runs": [len(m) for m in merged], "shots": shots, "per_frame": per,
           "diff": [round(x, 2) for x in dif], "captions": caps, "caption_events": cap_events}
    (HERE / f"motion_{vid}.json").write_text(json.dumps(out), encoding="utf-8")
    mv = [m for s in shots if s.get("trackable") for m in s["moves"]]
    print(vid, "shots", len(shots), "moves", len(mv), "caption events", len(cap_events), flush=True)


if __name__ == "__main__":
    for v in (sys.argv[1:] or IDS): analyse(v)
