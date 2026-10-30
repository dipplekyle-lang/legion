"""How LAYERED the motion is, and how PUNCHY its timing: one video at 60 fps, dense optical flow every frame (caption band masked).

Per frame:  movers   separate moving things (connected moving regions with their own motion: speed / direction differ)
            speeds   their speeds, so a frame where a hero glides, dust drifts and a tag snaps reads as 3 layers at 3 speeds
            still    nothing moves at all (a dead frame)
Moves:      every onset (a region of the frame starts moving after resting), its peak speed, frames from start to peak, how long it
            lasts, and where it starts against the nearest spoken word (word start -> move start, seconds).
Stagger:    onsets that start within 0.5 s of each other in different places: how far apart (frames).
Punch:      cells per hit (how big), contrast (peak vs what moved just before), share of spoken words that get a hit.

usage: py -3.12 stylelab/motion_layers.py OUT.json video.mp4 words.json [video2 words2 ...]
       words.json = [{"w", "t", "e"}, ...] (stylelab words) or [[start, end, word], ...] (a Legion build)
Feeds the SPEC's motion and timing sections; compare a build with the reference by running both.
"""
import json
import subprocess
import sys

import cv2
import numpy as np

W, H = 180, 320
CAP = (0.70, 0.84)
MOVE = 0.35          # px/frame at 180 wide (~2.1 px at 1080) counts as moving
DRIFT = 0.12         # ~0.7 px a frame at 1080: slow drift (dust, idle bob, a slow push) still counts as a layer
GX, GY = 6, 10       # onset grid


def frames(path, fps=60):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={fps},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H)
        if len(b) < W * H:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W)


def words_of(path):
    w = json.load(open(path, encoding="utf-8"))
    if w and isinstance(w[0], dict):
        return [float(x.get("t", x.get("s"))) for x in w]          # stylelab words carry "t" (older) or "s" (measure_all)
    return [float(x[0]) for x in w]


def study(video, words_path):
    ws = np.array(words_of(words_path)) if words_path else np.array([])
    keep = np.ones((H, W), bool); keep[int(CAP[0] * H):int(CAP[1] * H)] = False
    prev, per, cell_e = None, [], []
    for g in frames(video):
        if prev is None:
            prev = g; continue
        fl = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 13, 3, 5, 1.1, 0)
        prev = g
        mag = np.hypot(fl[..., 0], fl[..., 1])
        mov = (mag > MOVE) & keep
        # cuts and flashes: almost everything changes at once -> not a move
        cut = mov.mean() > 0.85 and mag[keep].mean() > 6
        n, lbl, st, _ = cv2.connectedComponentsWithStats(cv2.morphologyEx(mov.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), 8)
        layers = []
        for k in range(1, n):
            if st[k, cv2.CC_STAT_AREA] < 0.003 * W * H:
                continue
            m = lbl == k
            vx, vy = float(fl[..., 0][m].mean()), float(fl[..., 1][m].mean())
            layers.append((float(mag[m].mean()), np.arctan2(vy, vx), int(st[k, cv2.CC_STAT_AREA])))
        # merge regions moving the same way at the same speed (one object split by an edge, or a pan)
        merged = []
        for sp, ang, a in sorted(layers, key=lambda x: -x[2]):
            for mm in merged:
                if abs(np.log((sp + 0.1) / (mm[0] + 0.1))) < 0.35 and abs((ang - mm[1] + np.pi) % (2 * np.pi) - np.pi) < 0.6:
                    mm[2] += a; break
            else:
                merged.append([sp, ang, a])
        dm = cv2.morphologyEx(((mag > DRIFT) & keep).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        nd, _, sd, _ = cv2.connectedComponentsWithStats(dm, 8)
        per.append({"cut": bool(cut), "movers": 0 if cut else len(merged), "speeds": [round(m[0] * 6, 2) for m in merged][:8],
                    "share": round(float(mov.mean()), 3), "drift": 0 if cut else int((sd[1:, cv2.CC_STAT_AREA] >= 0.003 * W * H).sum()),
                    "drift_share": round(float(dm.mean()), 3)})
        e = np.zeros((GY, GX), np.float32)
        for j in range(GY):
            for i in range(GX):
                c = mag[j * H // GY:(j + 1) * H // GY, i * W // GX:(i + 1) * W // GX]
                kc = keep[j * H // GY:(j + 1) * H // GY, i * W // GX:(i + 1) * W // GX]
                e[j, i] = float(c[kc].mean()) if kc.any() else 0.0
        cell_e.append(np.zeros_like(e) if cut else e)
    E = np.array(cell_e)                                   # frames x GY x GX, px/frame at 180 wide
    fps = 60.0
    moves = []
    for j in range(GY):
        for i in range(GX):
            s = cv2.GaussianBlur(E[:, j, i].reshape(-1, 1).astype(np.float32), (1, 3), 0).ravel() if len(E) > 3 else E[:, j, i]
            rest = 0
            f = 0
            while f < len(s):
                if s[f] < MOVE * 0.5:
                    rest += 1; f += 1; continue
                if s[f] >= MOVE and rest >= 6:              # a start after at least 0.1 s of rest
                    st0 = f
                    while f < len(s) and s[f] >= MOVE * 0.5:
                        f += 1
                    seg = s[st0:f]
                    if len(seg) >= 4:
                        pk = int(np.argmax(seg))
                        moves.append({"t": st0 / fps, "cell": [i, j], "len": len(seg) / fps, "to_peak": pk, "peak": float(seg[pk] * 6),
                                      "peak_at": pk / len(seg)})
                    rest = 0
                else:
                    f += 1; rest = 0
    # one physical move lights up several cells: keep the earliest per 0.2 s neighbourhood
    moves.sort(key=lambda m: m["t"])
    onsets = []
    for m in moves:
        if onsets and m["t"] - onsets[-1]["t"] < 0.2 and abs(m["cell"][0] - onsets[-1]["cell"][0]) <= 1 and abs(m["cell"][1] - onsets[-1]["cell"][1]) <= 1:
            continue
        onsets.append(m)
    for m in onsets:
        if len(ws):
            before = ws[ws <= m["t"] + 0.25]
            m["word_lag"] = float(m["t"] - before.max()) if len(before) else None
            tp = m["t"] + m["to_peak"] / fps                   # the moment the move is fastest: where a hit reads
            near = ws[np.argmin(np.abs(ws - tp))]
            m["peak_lag"] = float(tp - near)
    # punch: how BIG each hit is (cells that start moving within 3 frames of it), how much it stands out from what moved just
    # before it (peak / mean motion over the 0.2 s before), and how many spoken words get a hit (a peak within 0.12 s)
    ts = np.array([m["t"] for m in moves]) if moves else np.array([])
    for m in onsets:
        m["cells"] = int(((ts >= m["t"] - 3 / fps) & (ts <= m["t"] + 3 / fps)).sum()) if len(ts) else 1
        f0 = int(round(m["t"] * fps)); pre = E[max(0, f0 - 12):f0]
        m["contrast"] = float(m["peak"] / 6 / (float(pre.mean()) + 0.05)) if len(pre) else None
    peaks = np.array([m["t"] + m["to_peak"] / fps for m in onsets]) if onsets else np.array([])
    words_hit = float(np.mean([bool(len(peaks)) and bool((np.abs(peaks - w) <= 0.12).any()) for w in ws])) if len(ws) else None
    stag = []
    for a, b in zip(onsets, onsets[1:]):
        d = b["t"] - a["t"]
        if d < 0.5 and (abs(a["cell"][0] - b["cell"][0]) > 1 or abs(a["cell"][1] - b["cell"][1]) > 1):
            stag.append(round(d * fps))
    mv = [p["movers"] for p in per if not p["cut"]]
    dur = len(per) / fps
    lag = [m["word_lag"] for m in onsets if m.get("word_lag") is not None]
    P = lambda a, q: round(float(np.percentile(a, q)), 3) if len(a) else None
    return {"video": video, "seconds": round(dur, 1),
            "movers_p25_50_75_90": [P(mv, q) for q in (25, 50, 75, 90)],
            "share_frames_by_movers": {str(k): round(sum(1 for x in mv if (x >= 4 if k == 4 else x == k)) / max(1, len(mv)), 3) for k in range(5)},
            "speed_spread_med": P([max(p["speeds"]) / max(0.05, min(p["speeds"])) for p in per if len(p["speeds"]) >= 2], 50),
            "onsets_per_s": round(len(onsets) / max(1, dur), 2),
            "move_len_p25_50_75": [P([m["len"] for m in onsets], q) for q in (25, 50, 75)],
            "frames_to_peak_p25_50_75": [P([m["to_peak"] for m in onsets], q) for q in (25, 50, 75)],
            "peak_at_med": P([m["peak_at"] for m in onsets], 50),
            "peak_speed_p50_90": [P([m["peak"] for m in onsets], q) for q in (50, 90)],
            "word_lag_p25_50_75": [P(lag, q) for q in (25, 50, 75)],
            "on_word_share": round(sum(1 for x in lag if -0.05 <= x <= 0.15) / max(1, len(lag)), 3),
            "peak_lag_p25_50_75": [P([m["peak_lag"] for m in onsets if "peak_lag" in m], q) for q in (25, 50, 75)],
            "drift_layers_p25_50_75": [P([p["drift"] for p in per if not p["cut"]], q) for q in (25, 50, 75)],
            "still_share": round(sum(1 for p in per if not p["cut"] and p["drift"] == 0) / max(1, len(per)), 3),
            "moving_area_med": P([p["drift_share"] for p in per if not p["cut"]], 50),
            "stagger_frames_p25_50_75": [P(stag, q) for q in (25, 50, 75)], "stagger_n": len(stag),
            "hit_cells_p50_75_90": [P([m["cells"] for m in onsets], q) for q in (50, 75, 90)],
            "contrast_p50_75": [P([m["contrast"] for m in onsets if m.get("contrast") is not None], q) for q in (50, 75)],
            "words_hit_share": round(words_hit, 3) if words_hit is not None else None}


def main():
    out, rest = sys.argv[1], sys.argv[2:]
    res = []
    for k in range(0, len(rest), 2):
        r = study(rest[k], rest[k + 1] if k + 1 < len(rest) else "")
        print(json.dumps(r), flush=True)
        res.append(r)
    json.dump(res, open(out, "w"), indent=1)


if __name__ == "__main__":
    main()
