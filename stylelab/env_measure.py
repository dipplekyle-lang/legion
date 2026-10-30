"""Environment measurements over all six videos (1 frame per second):
- clutter: edge density in a ring around the main face vs the rest of the frame
- verticals: how many long near-vertical lines lean (perspective / camera tilt)
- palette: how many hue families cover 80 % of the frame; the hue gap between the main character's clothes and the set
- light: brightness top vs bottom of the frame (where the light sits)"""
import json, math, pathlib, subprocess, sys
import cv2
import numpy as np
W, H = 360, 640                                          # analysis size (as in deep_measure.py)


def heads(frame):
    """Round white heads: near-white, big, circular blobs with a dark ring around them."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    white = ((hsv[..., 1] < 40) & (hsv[..., 2] > 200)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(white, 8)
    found = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area < 900 or w < 30 or h < 30 or abs(w - h) > 0.35 * max(w, h):
            continue
        fill = area / (math.pi * (max(w, h) / 2) ** 2)
        if fill < 0.55:
            continue
        cx, cy, r = x + w / 2, y + h / 2, max(w, h) / 2
        # dark outline ring right outside the blob
        ring = []
        for a in np.linspace(0, 2 * math.pi, 48, endpoint=False):
            for k in range(1, 12):
                px, py = int(cx + (r + k) * math.cos(a)), int(cy + (r + k) * math.sin(a))
                if 0 <= px < W and 0 <= py < H and frame[py, px].max() < 70:
                    run = 0
                    while 0 <= px < W and 0 <= py < H and frame[py, px].max() < 70 and run < 15:
                        run += 1; px, py = int(cx + (r + k + run) * math.cos(a)), int(cy + (r + k + run) * math.sin(a))
                    ring.append(run); break
        if len(ring) < 20:
            continue
        found.append({"cx": round(cx / W, 3), "cy": round(cy / H, 3), "d": round(2 * r / W, 3),
                      "outline_px_1080": round(float(np.median(ring)) * 3, 1), "ring_cover": round(len(ring) / 48, 2)})
    return sorted(found, key=lambda h: -h["d"])



import lab
HERE = lab.ROOT
res = {}
for p in sorted((HERE / "refs").glob("*.mp4")):
    vid = p.stem
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", f"fps=1,scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    ring_d, up_d, rest_d, lean, upright, fam, gaps, topbot = [], [], [], 0, 0, [], [], []
    for f in fr:
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        e = cv2.Canny(g, 60, 140) > 0
        hs = heads(f)
        if hs and 0.12 < hs[0]["d"] < 0.6:
            h = hs[0]; cx, cy, r = h["cx"] * W, h["cy"] * H, h["d"] * W / 2
            yy, xx = np.mgrid[0:H, 0:W]
            dist = np.hypot(xx - cx, yy - cy)
            ring = (dist > r * 1.15) & (dist < r * 2.2)
            rest = dist > r * 3.0
            up = ring & (yy < cy - r * 0.2)                  # only above/beside the head: no body in it
            if ring.sum() > 500 and rest.sum() > 5000 and up.sum() > 300:
                ring_d.append(e[ring].mean()); rest_d.append(e[rest].mean()); up_d.append(e[up].mean())
            # the outfit: pixels just below the head
            torso = f[int(min(H - 1, cy + r * 1.2)):int(min(H, cy + r * 2.0)), int(max(0, cx - r * .6)):int(min(W, cx + r * .6))]
            if torso.size:
                th = cv2.cvtColor(torso, cv2.COLOR_BGR2HSV)
                sat = th[..., 1] > 80
                if sat.sum() > 50:
                    ch = float(np.median(th[..., 0][sat])) * 2
                    fh = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
                    bg = fh[..., 1] > 60
                    bg[int(max(0, cy - r * 1.5)):int(min(H, cy + r * 3)), int(max(0, cx - r * 1.5)):int(min(W, cx + r * 1.5))] = False
                    if bg.sum() > 2000:
                        hist = np.bincount((fh[..., 0][bg] // 15).ravel(), minlength=12)
                        sh = float(hist.argmax() * 30 + 15)
                        gaps.append(min(abs(ch - sh), 360 - abs(ch - sh)))
        lines = cv2.HoughLinesP(cv2.Canny(g, 80, 160), 1, np.pi / 360, 60, minLineLength=H // 8, maxLineGap=4)
        if lines is not None:
            for x1, y1, x2, y2 in lines.reshape(-1, 4):
                a = math.degrees(math.atan2(abs(x2 - x1), abs(y2 - y1)))       # 0 = perfectly vertical
                if a < 1.2:
                    upright += 1
                elif a < 12:
                    lean += 1
        hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
        s = hsv[..., 1] > 50
        if s.sum() > 1000:
            hist = np.sort(np.bincount((hsv[..., 0][s] // 15).ravel(), minlength=12))[::-1] / s.sum()
            fam.append(int(np.searchsorted(np.cumsum(hist), 0.8) + 1))
        v = hsv[..., 2].astype(float)
        topbot.append((v[:H // 4].mean(), v[H // 4:H // 2].mean(), v[H // 2:3 * H // 4].mean(), v[3 * H // 4:].mean()))
    tb = np.mean(topbot, axis=0)
    res[vid] = {"clutter_ring_vs_rest": round(float(np.median(np.array(ring_d) / (np.array(rest_d) + 1e-6))), 2) if ring_d else None,
                "clutter_above_head_vs_rest": round(float(np.median(np.array(up_d) / (np.array(rest_d) + 1e-6))), 2) if up_d else None,
                "clutter_samples": len(ring_d),
                "near_vertical_lines_upright_share": round(upright / max(1, upright + lean), 2), "vertical_lines_counted": upright + lean,
                "hue_families_for_80pct_median": int(np.median(fam)) if fam else None,
                "outfit_vs_set_hue_gap_deg_median": round(float(np.median(gaps)), 0) if gaps else None, "hue_gap_samples": len(gaps),
                "brightness_by_quarter_top_to_bottom": [round(x / 255, 2) for x in tb]}
    print(vid, res[vid], flush=True)
(HERE / "env" / "env_measure.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
