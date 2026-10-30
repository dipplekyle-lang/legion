"""How the light hits the characters: per head, brightness in 8 directions (-> light direction and contrast), skin tint vs
scene light, torso top/bottom/left/right, shadow colours; plus frame-level brightness/saturation/warmth vs our test."""
import json, math, pathlib, subprocess
import cv2
import numpy as np

import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.ROOT
W, H = 1080, 1920
src = (HERE / "deep_measure.py").read_text(encoding="utf-8")
ns = {"np": np, "cv2": cv2, "math": math}
exec("W, H = 1080, 1920\n" + src[src.index("def heads(frame):"):src.index("def caption_box(frame):")], ns)
heads = ns["heads"]
FR = [("ref-A", t) for t in (0.3, 2.7, 5.0, 7.0, 16.2, 33.0, 37.0, 42.8)] + \
     [("ref-B", t) for t in (3.5, 13.0, 31.0, 40.5, 52.5)] + [("ref-C", t) for t in (6.5, 10.0, 18.5, 37.0, 51.0)] + \
     [("ref-D", t) for t in (0.5, 6.5, 35.5)] + [("ref-F", t) for t in (1.6, 30.5)] + [("ref-E", t) for t in (3.0, 40.5)]


def grab(v, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(HERE / "refs" / f"{v}.mp4"), "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).copy()


def hexc(b):
    return "#%02X%02X%02X" % (int(b[2]), int(b[1]), int(b[0]))


def analyse(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    v = hsv[..., 2].astype(float)
    b, g, r = [float(x) for x in img.reshape(-1, 3).mean(0)]
    out = {"frame_bright": round(v.mean() / 255, 3), "frame_sat": round(hsv[..., 1].mean() / 255, 3), "frame_warm": round((r - b) / (r + b), 3)}
    hs = heads(img)
    if not hs or hs[0]["d"] < 0.12:
        return out
    h = hs[0]; cx, cy, R = h["cx"] * W, h["cy"] * H, h["d"] * W / 2
    pale = (hsv[..., 1] < 70) & (hsv[..., 2] > 120)
    sect = []
    for k in range(8):
        a = k * math.pi / 4
        xs, ys = [], []
        for rr in np.linspace(0.45, 0.85, 6):
            for da in np.linspace(-0.3, 0.3, 5):
                x, y = int(cx + rr * R * math.cos(a + da)), int(cy - rr * R * math.sin(a + da))
                if 0 <= x < W and 0 <= y < H and pale[y, x]:
                    xs.append(x); ys.append(y)
        sect.append(float(np.median(v[ys, xs])) if len(xs) >= 6 else None)
    ok = [(k, s) for k, s in enumerate(sect) if s is not None]
    if len(ok) >= 5:
        vx = sum(s * math.cos(k * math.pi / 4) for k, s in ok); vy = sum(s * math.sin(k * math.pi / 4) for k, s in ok)
        ang = (math.degrees(math.atan2(vy, vx)) + 360) % 360
        vals = [s for _, s in ok]
        out.update({"head_d": round(h["d"], 2), "light_from_deg": round(ang),           # 90 = from above, 180 = from the left
                    "head_bright_max_min": [round(max(vals)), round(min(vals))], "head_contrast": round((max(vals) - min(vals)) / max(vals), 2)})
    m = np.zeros((H, W), np.uint8); cv2.circle(m, (int(cx), int(cy)), int(R * 0.8), 1, -1)
    skin = img[(m > 0) & pale]
    if len(skin) > 200:
        sb, sg, sr = skin.mean(0)
        out["skin_mean"] = hexc(skin.mean(0)); out["skin_warm"] = round((sr - sb) / (sr + sb), 3)
    y0, y1 = int(cy + R * 1.05), int(min(H, cy + R * 2.3)); x0, x1 = int(max(0, cx - R * .75)), int(min(W, cx + R * .75))
    if y1 - y0 > 20:
        reg = img[y0:y1, x0:x1]; rh = cv2.cvtColor(reg, cv2.COLOR_BGR2HSV)
        cloth = (rh[..., 1] > 60) & (rh[..., 2] > 50)
        if cloth.sum() > 300:
            vv = rh[..., 2].astype(float); hh = reg.shape[0]; ww = reg.shape[1]
            def mv(sl): s2 = cloth[sl]; return round(float(vv[sl][s2].mean()), 1) if s2.sum() > 30 else None
            out.update({"cloth_top": mv(np.s_[:hh // 3, :]), "cloth_bottom": mv(np.s_[2 * hh // 3:, :]), "cloth_left": mv(np.s_[:, :ww // 3]), "cloth_right": mv(np.s_[:, 2 * ww // 3:]),
                        "cloth_lit": hexc(np.percentile(reg[cloth], 85, axis=0)), "cloth_shadow": hexc(np.percentile(reg[cloth], 15, axis=0))})
    return out


res = []
for v, t in FR:
    a = analyse(grab(v, t)); a.update({"video": v, "t": t}); res.append(a)
ours = {}
for n in "ad":
    img = cv2.imread(str(HERE / "test2s" / f"still_{n}.png")); a = analyse(img); ours[n] = a
(HERE / "deep2" / "light.json").write_text(json.dumps({"his": res, "ours": ours}, indent=1), encoding="utf-8")
for a in res:
    print(a["video"][:4], a["t"], {k: a[k] for k in a if k not in ("video", "t")})
print("OURS", json.dumps(ours))
hv = [a for a in res if "light_from_deg" in a]
print("light direction degrees:", sorted(a["light_from_deg"] for a in hv), "| head contrast median", np.median([a["head_contrast"] for a in hv]))
print("frame bright median", np.median([a["frame_bright"] for a in res]), "sat", np.median([a["frame_sat"] for a in res]))
