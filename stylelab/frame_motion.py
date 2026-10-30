"""Frame-by-frame motion of a style at 60 fps (feeds SPEC: motion). For every move found by the velocity study
(deep5/ease60.json): the flow inside the moving element per frame, read as travel along the main direction, growth
(divergence), squash/stretch (x vs y growth), turn (curl); then wind-up before the move (anticipation), overshoot and
settle wobble after it, and how a group staggers. Also tiles every 2nd frame of the clearest moves, cropped to the
element, so the eye can confirm (deep6/moves_*.jpg).
usage: set STYLELAB=<style folder>; python stylelab/frame_motion.py"""
import json, os, pathlib, subprocess
import cv2
import numpy as np

S = pathlib.Path(os.environ.get("STYLELAB", "."))
W, H = 270, 480
SC = 1080 / W


def clip(vid, t0, n):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, t0 - 10 / 60):.3f}", "-i", str(S / "refs2" / f"{vid}.mp4"),
                          "-frames:v", str(n + 22), "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def analyse(x):
    g = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in x]
    fl = [cv2.calcOpticalFlowFarneback(g[i - 1], g[i], None, 0.5, 3, 15, 3, 5, 1.2, 0) for i in range(1, len(g))]
    mag = np.array([np.hypot(f[..., 0], f[..., 1]) for f in fl])
    mask = mag.max(0) > 1.0                                   # where the element travelled during the clip
    if mask.mean() < 0.002:
        return None
    rows = []
    for f in fl:
        m = mask & (np.hypot(f[..., 0], f[..., 1]) > 0.15)
        if m.sum() < 30:
            rows.append((0, 0, 0, 0, 0)); continue
        vx, vy = f[..., 0], f[..., 1]
        dvx = np.gradient(vx, axis=1); dvy = np.gradient(vy, axis=0)
        rows.append((float(vx[m].mean()), float(vy[m].mean()), float((dvx + dvy)[m].mean()), float((dvx - dvy)[m].mean()),
                     float((np.gradient(vy, axis=1) - np.gradient(vx, axis=0))[m].mean())))
    r = np.array(rows)
    sp = np.hypot(r[:, 0], r[:, 1]) * SC
    k = int(np.argmax(sp))
    main = r[max(0, k - 2):k + 3, :2].mean(0); main /= np.linalg.norm(main) + 1e-9
    along = (r[:, :2] @ main) * SC
    on = np.flatnonzero(sp > 0.25 * sp[k]); a, b = on[0], on[-1]
    pre = along[max(0, a - 8):a]                               # wind-up: travel against the move before it starts
    post = along[b + 1:b + 14]                                 # overshoot / settle: travel back after it ends
    grow = r[a:b + 1, 2]
    ys, xs = np.nonzero(mask)
    return {"frames": int(b - a + 1), "peak_px": round(float(sp[k]), 1), "peak_at": round((k - a) / max(1, b - a), 2),
            "windup_px": round(float(-pre[pre < 0].sum()), 1) if len(pre) else 0.0,
            "overshoot_px": round(float(-post[post < 0].sum()), 1) if len(post) else 0.0,
            "travel_px": round(float(along[a:b + 1].sum()), 1),
            "settle_wobble": int(np.sum(np.diff(np.sign(post[np.abs(post) > 0.3])) != 0)) if len(post) > 2 else 0,
            "grow": round(float(grow.mean()) * 100, 2), "squash": round(float(np.abs(r[a:b + 1, 3]).max()) * 100, 2),
            "turn": round(float(np.abs(r[a:b + 1, 4]).max()) * 100, 2),
            "kind": "scale" if abs(grow.mean()) * 100 > 1.2 and sp[k] < 25 else "travel",
            "box": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], "a": int(a), "b": int(b)}


def strip(x, m, path):
    x0, y0, x1, y1 = m["box"]; pad = 12
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    fr = [x[i] for i in range(max(0, m["a"] - 2), min(len(x), m["b"] + 8), 2)][:16]
    tiles = [cv2.resize(f[y0:y1, x0:x1], (160, int(160 * (y1 - y0) / max(1, x1 - x0)))) for f in fr]
    h = max(t.shape[0] for t in tiles)
    tiles = [cv2.copyMakeBorder(t, 0, h - t.shape[0], 0, 2, cv2.BORDER_CONSTANT, value=(255, 255, 255)) for t in tiles]
    return np.hstack(tiles)


def main():
    ev = json.loads((S / "deep5" / "ease60.json").read_text(encoding="utf-8"))
    out = []
    for e in ev:
        x = clip(e["vid"], e["t"], e["frames"])
        if len(x) < 8:
            continue
        m = analyse(x)
        if m:
            m.update(vid=e["vid"], t=e["t"]); out.append(m)
    (S / "deep6").mkdir(exist_ok=True)
    (S / "deep6" / "frame_motion.json").write_text(json.dumps(out, indent=0), encoding="utf-8")
    a = lambda k, sub=None: np.array([o[k] for o in (sub or out)], float)
    pc = lambda v: [round(float(np.percentile(v, q)), 2) for q in (25, 50, 75)] if len(v) else []
    tr = [o for o in out if o["kind"] == "travel"]; scl = [o for o in out if o["kind"] == "scale"]
    print("moves", len(out), "travel", len(tr), "scale", len(scl))
    for name, sub in (("travel", tr), ("scale", scl)):
        if not sub:
            continue
        w, ov, tv = a("windup_px", sub), a("overshoot_px", sub), np.abs(a("travel_px", sub)) + 1e-6
        print(f"{name}: frames {pc(a('frames', sub))} peak_at {pc(a('peak_at', sub))} | wind-up share {np.mean(w / tv > 0.03):.2f} "
              f"(size {pc((w / tv)[w / tv > 0.03] * 100)} % of travel) | overshoot share {np.mean(ov / tv > 0.03):.2f} "
              f"(size {pc((ov / tv)[ov / tv > 0.03] * 100)} %) | settle wobbles {pc(a('settle_wobble', sub))} | squash {pc(a('squash', sub))} turn {pc(a('turn', sub))}")
    pick = sorted(out, key=lambda o: -o["peak_px"] * min(1, o["frames"] / 14))
    seen, sheets = set(), []
    for o in pick:
        if o["vid"] in seen and len(seen) < 10:
            continue
        seen.add(o["vid"])
        x = clip(o["vid"], o["t"], o["frames"])
        sheets.append(strip(x, o, None))
        if len(sheets) == 12:
            break
    for i in range(0, len(sheets), 4):
        grp = sheets[i:i + 4]; wd = max(s.shape[1] for s in grp)
        cv2.imwrite(str(S / "deep6" / f"moves_{i // 4}.jpg"),
                    np.vstack([cv2.copyMakeBorder(s, 0, 6, 0, wd - s.shape[1], cv2.BORDER_CONSTANT, value=(255, 255, 255)) for s in grp]))


if __name__ == "__main__":
    main()
