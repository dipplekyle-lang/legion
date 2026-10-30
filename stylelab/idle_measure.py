"""The LIFE inside held shots (what moves while the camera holds), measured with optical flow frame by frame: how much of
the frame moves, how fast, whether the camera itself drifts, the rhythm of the loops (bob / sway / pulse period and size),
and the small drifting things (particles: count, size, speed). Entrances are left out (the first 0.5 s of a shot belongs to
pop_measure.py). Then a vision pass names every moving element in strips of the longest holds.
-> deep4/idle.json, deep4/idle_strips_<n>.jpg, deep4/idle_vision.json"""
import json, subprocess, sys
import cv2
import numpy as np

import lab
HERE = lab.sub("deep4")
W, H, FPS = 216, 384, 30
K = 1080 / W                                         # px here -> px in a 1080-wide frame
CAP = (int(0.74 * H), int(0.83 * H))                 # caption band: changes every word, never "life"
MOVE = 0.25                                          # flow magnitude (px here) that counts as moving


def frames(vid, a, b, w=W, h=H, gray=True):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", str(lab.REFS / f"{vid}.mp4"),
                          "-vf", f"fps={FPS},scale={w}:{h}" + (",format=gray" if gray else ""), "-f", "rawvideo", "-pix_fmt",
                          "gray" if gray else "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w) if gray else np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def hold(vid, a, b):
    f = frames(vid, a + 0.5, b - 0.15)
    if len(f) < 20:
        return None
    share, speed, cam, vy, vx, div, parts = [], [], [], [], [], [], []
    yy, xx = np.mgrid[0:H, 0:W]
    for i in range(1, len(f)):
        fl = cv2.calcOpticalFlowFarneback(f[i - 1], f[i], None, 0.5, 3, 13, 3, 5, 1.1, 0)
        fl[CAP[0]:CAP[1]] = 0
        mag = np.hypot(fl[..., 0], fl[..., 1]); mv = mag > MOVE
        share.append(mv.mean())
        cam.append(float(np.median(mag)) * K)                       # the camera moving = most of the frame moving together
        if mv.sum() > 30:
            speed.append(float(np.median(mag[mv])) * K)
            vy.append(float(fl[..., 1][mv].mean()) * K); vx.append(float(fl[..., 0][mv].mean()) * K)
            cx, cy = xx[mv].mean(), yy[mv].mean()                   # divergence about the moving area: + = growing (pulse)
            div.append(float(((xx[mv] - cx) * fl[..., 0][mv] + (yy[mv] - cy) * fl[..., 1][mv]).mean() / max(1.0, np.hypot(xx[mv] - cx, yy[mv] - cy).mean())) * K)
        else:
            vy.append(0.0); vx.append(0.0); div.append(0.0)
        n, lab_, st, _ = cv2.connectedComponentsWithStats(mv.astype(np.uint8), 8)
        small = [s for s in st[1:] if 2 <= s[cv2.CC_STAT_AREA] <= 0.0015 * W * H]
        parts.append(len(small))
    def loop(series):                                               # dominant period (s) and size (px at 1080) of a back-and-forth
        s = np.cumsum(np.array(series) - np.mean(series))
        if len(s) < 24 or np.ptp(s) < 1.0:
            return None
        sp = np.abs(np.fft.rfft(s * np.hanning(len(s)))); fr = np.fft.rfftfreq(len(s), 1 / FPS)
        k = 1 + int(np.argmax(sp[1:])); return {"period_s": round(1 / fr[k], 2) if fr[k] > 0 else None, "size_px": round(float(np.ptp(s)), 1)}
    return {"vid": vid, "a": a, "b": b, "dur": round(b - a, 2),
            "moving_share_p50": round(float(np.median(share)), 4), "frames_with_motion": round(float(np.mean(np.array(share) > 0.002)), 2),
            "speed_px_per_frame_p50": round(float(np.median(speed)), 2) if speed else 0.0,
            "camera_drift_px_per_frame_p50": round(float(np.median(cam)), 3),
            "bob": loop(vy), "sway": loop(vx), "pulse": loop(div), "particles_per_frame_p50": float(np.median(parts))}


def strips(holds, n=8):
    """Strips of the longest holds for the eye: 8 frames 4 apart (about a second), the motion heat on the last panel."""
    out = []
    for k, h in enumerate(holds[:n]):
        a = h["a"] + 0.5
        f = frames(h["vid"], a, a + 1.25, 270, 480, gray=False)
        if len(f) < 33:
            continue
        pick = [f[i] for i in range(0, 33, 4)][:8]
        heat = np.zeros_like(pick[0], dtype=np.float32)
        for i in range(1, len(f[:33])):
            heat += np.abs(f[i].astype(np.float32) - f[i - 1].astype(np.float32)).mean(2, keepdims=True)
        heat = cv2.applyColorMap(np.clip(heat / max(1, heat.max()) * 255 * 3, 0, 255).astype(np.uint8)[..., 0], cv2.COLORMAP_INFERNO)
        im = np.hstack(pick + [heat]); p = HERE / f"idle_strips_{k}.jpg"
        cv2.imwrite(str(p), im, [cv2.IMWRITE_JPEG_QUALITY, 85]); out.append((p, h))
    return out


VISION = """These are frames from a held shot of a 2D vector explainer Short (one strip: 8 frames, 4 frames apart at 30 fps,
so about 1.1 seconds left to right; the last panel is a heat map of where pixels changed, bright = more motion).
The camera holds still here: list EVERY element that moves and HOW, as a motion designer would rebuild it in code.
For each: the element, the motion (bob, sway, breathe/scale pulse, rotate, drift, blink, eye dart, talk/mouth, gesture,
hair or cloth follow-through, glow pulse, flicker, loop cycle, morph, travel along a path, counter ticking, other),
its size (share of the frame height or degrees), its period or speed (seconds per cycle or frames), the easing (sine,
linear, snappy ease-out, stepped), and whether it loops. Also: is ANYTHING completely still? what moves the most?
Return ONLY JSON: {"moves": [{"element": "", "motion": "", "size": "", "period": "", "easing": "", "loops": true}],
"still_elements": [""], "biggest_motion": "", "notes": ""}"""


def main():
    shots = json.loads((lab.ROOT / "scenes" / "shots.json").read_text(encoding="utf-8"))
    holds = []
    for s in shots:
        if s["dur"] >= 1.6:
            got = hold(s["vid"], s["a"], s["b"])
            if got:
                holds.append(got); print(f"{s['vid']} {s['a']:6.2f}-{s['b']:6.2f} moving {got['moving_share_p50']:.3f} speed {got['speed_px_per_frame_p50']} cam {got['camera_drift_px_per_frame_p50']}", flush=True)
    def p(key, q=(25, 50, 75)):
        v = [h[key] for h in holds if h.get(key) is not None]
        return [round(float(np.percentile(v, x)), 3) for x in q] if v else None
    def loops(key):
        v = [h[key] for h in holds if h.get(key)]
        per = [x["period_s"] for x in v if x.get("period_s")]; size = [x["size_px"] for x in v]
        return {"share_of_holds": round(len(v) / max(1, len(holds)), 2), "period_s_p25_50_75": [round(float(np.percentile(per, q)), 2) for q in (25, 50, 75)] if per else None,
                "size_px_p25_50_75": [round(float(np.percentile(size, q)), 1) for q in (25, 50, 75)] if size else None}
    summary = {"holds": len(holds), "moving_share_p25_50_75": p("moving_share_p50"), "frames_with_motion_p25_50_75": p("frames_with_motion"),
               "speed_px_per_frame_p25_50_75": p("speed_px_per_frame_p50"), "camera_drift_px_per_frame_p25_50_75": p("camera_drift_px_per_frame_p50"),
               "bob": loops("bob"), "sway": loops("sway"), "pulse": loops("pulse"), "particles_per_frame_p25_50_75": p("particles_per_frame_p50"),
               "note": "px are in a 1080x1920 frame; moving_share = share of the frame moving in a typical frame of the hold"}
    (HERE / "idle.json").write_text(json.dumps({"summary": summary, "holds": holds}, indent=1), encoding="utf-8")
    print(json.dumps(summary, indent=1))
    if "--no-vision" in sys.argv:
        return
    import app
    holds.sort(key=lambda h: -h["dur"])
    seen, pick = set(), []
    for h in holds:                                                 # the longest holds, at most two per reference
        if sum(1 for x in pick if x["vid"] == h["vid"]) < 2:
            pick.append(h)
    res = []
    for path, h in strips(pick, 10):
        try:
            got = app.claude_json(VISION, [str(path)], dict)
        except Exception as e:                                      # noqa: BLE001
            got = {"error": str(e)[:200]}
        got.update({"vid": h["vid"], "a": h["a"], "b": h["b"], "strip": path.name}); res.append(got)
        print(path.name, "->", len(got.get("moves") or []), "moves", flush=True)
    (HERE / "idle_vision.json").write_text(json.dumps(res, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
