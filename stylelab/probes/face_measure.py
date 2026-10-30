"""Character construction from close-up frames: head size, the face parts (eyes, brows, mouth) as sizes and positions
relative to the head, outline thickness, shading direction, and the exact colours of every part."""
import json, math, pathlib, subprocess, sys
import cv2
import numpy as np

import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.ROOT
SHOTS = [("ref-A", 5.0, "cashier, neutral"), ("ref-A", 2.7, "cashier, surprised"),
         ("ref-A", 16.2, "cashier, happy"), ("ref-A", 7.0, "customer, moustache + hat"),
         ("ref-B", 3.0, "boss, smug"), ("ref-C", 21.5, "police officer, laughing")]


def grab(vid, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(HERE / "refs" / f"{vid}.mp4"), "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3).copy()


def hexc(bgr):
    b, g, r = [int(v) for v in bgr]
    return "#%02X%02X%02X" % (r, g, b)


def kmeans(px, k):
    px = np.float32(px)
    if len(px) < k * 5:
        return []
    _, lab, cen = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 4, cv2.KMEANS_PP_CENTERS)
    share = np.bincount(lab.ravel(), minlength=k) / len(lab)
    return [{"hex": hexc(cen[i]), "share": round(float(share[i]), 3)} for i in np.argsort(-share)]


def measure(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    pale = ((hsv[..., 1] < 60) & (hsv[..., 2] > 150)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(pale, 8)
    best = None
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if w < 150 or h < 100 or a < 15000:
            continue
        fill = a / (math.pi * (w / 2) ** 2)
        if 0.35 < fill < 1.1 and (best is None or a > st[best][4]):
            best = i
    if best is None:
        return {"error": "no head found"}
    x, y, w, h, a = st[best]
    r = w / 2
    cx, cy = x + r, y + h - r                       # hair covers the top: centre from the width and the chin
    mask = np.zeros(img.shape[:2], np.uint8)
    cv2.circle(mask, (int(cx), int(cy)), int(r * 0.97), 1, -1)
    skin = (lab == best) & (mask > 0)
    # shading: brightness of the skin in each part of the head
    yy, xx = np.nonzero(skin)
    v = hsv[..., 2][skin].astype(float)
    def part(sel): return round(float(v[sel].mean()), 1) if sel.any() else None
    shade = {"left": part(xx < cx - r * .3), "right": part(xx > cx + r * .3), "top": part(yy < cy - r * .3),
             "bottom": part(yy > cy + r * .3), "centre": part((abs(xx - cx) < r * .3) & (abs(yy - cy) < r * .3))}
    # outline: dark run outward from the skin edge, in 32 directions
    runs = []
    for ang in np.linspace(0, 2 * math.pi, 32, endpoint=False):
        dx, dy = math.cos(ang), math.sin(ang)
        k = int(r * 0.85)
        while k < r * 1.3:
            px, py = int(cx + k * dx), int(cy + k * dy)
            if not (0 <= px < 1080 and 0 <= py < 1920):
                break
            if not skin[py, px] and hsv[py, px, 2] < 70:
                run = 0
                while 0 <= px < 1080 and 0 <= py < 1920 and hsv[py, px, 2] < 70 and run < 40:
                    run += 1; k += 1; px, py = int(cx + k * dx), int(cy + k * dy)
                runs.append(run); break
            k += 1
    # face parts: grey/dark blobs inside the head circle
    inner = (mask > 0) & ~skin
    feat = (inner & (hsv[..., 2] < 200)).astype(np.uint8)
    feat = cv2.morphologyEx(feat, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m, flab, fst, fcen = cv2.connectedComponentsWithStats(feat, 8)
    parts = []
    for i in range(1, m):
        fx, fy, fw, fh, fa = fst[i]
        if fa < 250 or fw > 1.6 * r:
            continue
        col = img[flab == i]
        parts.append({"x": round((fx + fw / 2 - cx) / r, 2), "y": round((fy + fh / 2 - cy) / r, 2),
                      "w": round(fw / (2 * r), 3), "h": round(fh / (2 * r), 3), "area": int(fa),
                      "colour": hexc(np.median(col, axis=0))})
    parts.sort(key=lambda p: (p["y"], p["x"]))
    skin_cols = kmeans(img[skin], 3)
    return {"head_diameter_share_of_frame_width": round(w / 1080, 3), "centre": [round(cx / 1080, 3), round(cy / 1920, 3)],
            "outline_px_median": float(np.median(runs)) if runs else None, "outline_samples": len(runs),
            "skin_colours": skin_cols, "shading_brightness": shade,
            "face_parts (x,y from head centre in radii; w,h in head diameters)": parts}


def region_colours(img, box, k=4):
    x0, y0, x1, y1 = [int(v) for v in box]
    return kmeans(img[y0:y1, x0:x1].reshape(-1, 3), k)


out = {}
for vid, t, label in SHOTS:
    img = grab(vid, t)
    res = measure(img)
    out[f"{vid}@{t} {label}"] = res
    cv2.imwrite(str(HERE / "deep2" / f"face_{vid}_{t}.jpg"), cv2.resize(img, (540, 960)))
# hair, shirt, background colours on the neutral cashier frame
img = grab("ref-A", 5.0)
out["cashier hair (region)"] = region_colours(img, (300, 380, 900, 640), 5)
out["cashier polo (region)"] = region_colours(img, (380, 1180, 820, 1520), 5)
out["shop wall (region)"] = region_colours(img, (0, 150, 1080, 700), 5)
out["counter (region)"] = region_colours(img, (0, 1560, 1080, 1920), 4)
(HERE / "deep2" / "faces.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(json.dumps(out, indent=1))
