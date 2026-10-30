"""Deep measurements of the reference Shorts, per video -> deep/<id>.json (and a crops folder for the eye pass).

camera:    per-frame global motion (tx, ty in % of frame width, zoom %, rotation deg) from ORB feature matching
           -> drift speed during holds, transition peak speeds, easing (time to peak / duration), shake
characters:white round heads found by shape -> head size (shot scale), face position (composition), outline thickness
mouth:     frame-to-frame change inside the mouth area of a steady head -> mouth shape changes per second
captions:  the white outlined word at ~70 % height -> box size, position, when it changes vs the word timings
look:      saturation / brightness, vignette (corners vs centre), grain (high-pass noise in flat areas), sharpness of
           the frame centre vs the edges (depth of field)
audio:     voice vs music level (in word gaps vs during words), narrator pitch, sound hits on camera transitions
"""
import json, math, pathlib, subprocess, sys
import cv2
import numpy as np

import lab
HERE = lab.ROOT
REFS, MEAS, OUT = HERE / "refs", HERE / "measure", HERE / "deep"
OUT.mkdir(exist_ok=True)
FPS = 30
W, H = 360, 640                                  # analysis size (1/3 of 1080x1920)


def read_frames(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", f"scale={W}:{H}", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def camera(frames):
    orb = cv2.ORB_create(800)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    out = []
    prev = None
    for f in frames:
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        kp, des = orb.detectAndCompute(g, None)
        if prev is not None and des is not None and prev[1] is not None and len(kp) > 20 and len(prev[0]) > 20:
            m = sorted(bf.match(prev[1], des), key=lambda x: x.distance)[:300]
            if len(m) >= 12:
                a = np.float32([prev[0][x.queryIdx].pt for x in m]); b = np.float32([kp[x.trainIdx].pt for x in m])
                M, inl = cv2.estimateAffinePartial2D(a, b, ransacReprojThreshold=2.0)
                if M is not None and inl is not None and inl.sum() >= 10:
                    s = math.hypot(M[0, 0], M[1, 0])
                    out.append([M[0, 2] / W * 100, M[1, 2] / W * 100, (s - 1) * 100, math.degrees(math.atan2(M[1, 0], M[0, 0])),
                                int(inl.sum())])
                    prev = (kp, des); continue
            out.append([None] * 5)
        else:
            out.append([None] * 5)
        prev = (kp, des)
    return out


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


def caption_box(frame):
    """The caption: white glyph pixels with dark pixels next to them, in the band 62-78 % down."""
    y0, y1 = int(H * .62), int(H * .78)
    band = frame[y0:y1]
    wht = (band.min(2) > 225).astype(np.uint8)
    dark = (band.max(2) < 60).astype(np.uint8)
    edge = cv2.dilate(dark, np.ones((3, 3), np.uint8))
    txt = wht & edge
    ys, xs = np.nonzero(txt)
    if len(xs) < 25:
        return None
    rows = np.bincount(ys, minlength=band.shape[0])
    core = np.nonzero(rows > max(3, rows.max() * 0.15))[0]
    if not len(core):
        return None
    cy0, cy1 = core.min(), core.max()
    sel = (ys >= cy0) & (ys <= cy1)
    xs2 = xs[sel]
    return {"x0": int(xs2.min()), "x1": int(xs2.max()), "y0": int(cy0 + y0), "y1": int(cy1 + y0),
            "sig": hash(txt[cy0:cy1 + 1].tobytes()) % 10 ** 9}


def look(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype(np.float32)
    v = hsv[..., 2]
    c = v[H // 3:2 * H // 3, W // 3:2 * W // 3].mean()
    corners = np.mean([v[:H // 8, :W // 8].mean(), v[:H // 8, -W // 8:].mean(), v[-H // 8:, :W // 8].mean(), v[-H // 8:, -W // 8:].mean()])
    g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32)
    hp = g - cv2.GaussianBlur(g, (0, 0), 1.2)
    lap = cv2.Laplacian(g, cv2.CV_32F)
    flat = np.abs(cv2.Sobel(cv2.GaussianBlur(g, (0, 0), 3), cv2.CV_32F, 1, 1)) < 1.0
    grain = float(hp[flat].std()) if flat.sum() > 2000 else None
    centre_sharp = float(lap[H // 4:3 * H // 4, W // 4:3 * W // 4].var())
    edge_sharp = float(np.concatenate([lap[:H // 6].ravel(), lap[-H // 6:].ravel()]).var())
    return {"sat": float(hsv[..., 1].mean() / 255), "val": float(v.mean() / 255), "vignette": float(corners / max(c, 1)),
            "grain": grain, "sharp_centre": centre_sharp, "sharp_edges": edge_sharp}


def audio_stats(p, words):
    sr = 16000
    a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                                     capture_output=True).stdout, np.float32)
    hop = 160
    rms = np.sqrt(np.convolve(a * a, np.ones(hop * 4) / (hop * 4), "same")[::hop] + 1e-12)
    t = np.arange(len(rms)) * hop / sr
    inw = np.zeros(len(rms), bool)
    for w in words:
        inw[(t >= w["s"]) & (t <= w["e"])] = True
    voice = float(np.median(rms[inw])) if inw.any() else 0
    gaps = rms[~inw & (t > 0.3) & (t < t[-1] - 0.5)]
    music = float(np.percentile(gaps, 30)) if len(gaps) > 20 else None
    # narrator pitch: autocorrelation on voiced 40 ms windows inside words
    f0 = []
    for w in words[::3]:
        s = int((w["s"] + w["e"]) / 2 * sr); seg = a[s:s + 640]
        if len(seg) < 640 or np.sqrt((seg ** 2).mean()) < 0.02:
            continue
        seg = seg - seg.mean(); ac = np.correlate(seg, seg, "full")[640:]
        lo, hi = sr // 300, sr // 70
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.3 * ac[0]:
            f0.append(sr / k)
    on = np.maximum(np.diff(rms, prepend=rms[0]), 0)
    thr = np.percentile(on, 99)
    hits = [float(t[i]) for i in range(1, len(on) - 1) if on[i] > thr and on[i] == on[max(0, i - 5):i + 6].max()]
    return {"voice_rms_db": round(20 * math.log10(voice + 1e-9), 1),
            "music_bed_db": round(20 * math.log10(music + 1e-9), 1) if music else None,
            "music_below_voice_db": round(20 * math.log10((voice + 1e-9) / (music + 1e-9)), 1) if music else None,
            "narrator_f0_hz": round(float(np.median(f0)), 0) if f0 else None, "hits": [round(h, 2) for h in hits]}


def main(ids):
    for vid in ids:
        p = REFS / f"{vid}.mp4"
        words = json.loads((MEAS / f"{vid}.words.json").read_text(encoding="utf-8"))
        tr = json.loads((MEAS / f"{vid}.json").read_text(encoding="utf-8"))["camera_transitions"]
        fr = read_frames(p)
        n = len(fr)
        cam = camera(fr)
        # every 3rd frame for the heavier passes
        hd, cap, lk = [], [], []
        for i in range(0, n, 3):
            hd.append([i / FPS, heads(fr[i])])
            cap.append([i / FPS, caption_box(fr[i])])
            if i % 15 == 0:
                lk.append(look(fr[i]))
        # camera summary
        ok = [c for c in cam if c[0] is not None]
        sp = [math.hypot(c[0], c[1]) for c in ok]
        zoom = [c[2] for c in ok]
        in_tr = lambda t: any(a - .05 <= t <= b + .05 for a, b, _ in tr)
        hold = [(math.hypot(c[0], c[1]), c[2]) for i, c in enumerate(cam) if c[0] is not None and not in_tr(i / FPS)]
        hold_sp = [h[0] for h in hold]; hold_zoom = [h[1] for h in hold]
        tr_info = []
        for a, b, _ in tr:
            seg = [(i, math.hypot(cam[i][0], cam[i][1]) if cam[i][0] is not None else None) for i in range(int(a * FPS), min(n - 1, int(b * FPS) + 1))]
            vals = [v for _, v in seg if v is not None]
            if len(vals) >= 3:
                pk = int(np.argmax(vals))
                tr_info.append({"t": a, "dur": round(b - a, 2), "peak_speed_pct_w_per_frame": round(max(vals), 2),
                                "time_to_peak_share": round(pk / max(1, len(vals) - 1), 2)})
            else:
                tr_info.append({"t": a, "dur": round(b - a, 2), "untracked": True})
        rot = [abs(c[3]) for c in ok]
        # shake: high-frequency jitter of translation in holds
        txs = np.array([c[0] if c[0] is not None else 0 for c in cam])
        jitter = float(np.std(txs - np.convolve(txs, np.ones(7) / 7, "same")))
        # heads
        main_heads = [(t, h[0]) for t, h in hd if h]
        dists = [h["d"] for _, h in main_heads]
        scale = {"extreme_close(>0.55w)": 0, "close(0.32-0.55)": 0, "medium(0.17-0.32)": 0, "wide(<0.17)": 0, "no_head": 0}
        for t, h in hd:
            if not h:
                scale["no_head"] += 1
            else:
                d = h[0]["d"]
                scale["extreme_close(>0.55w)" if d > .55 else "close(0.32-0.55)" if d > .32 else "medium(0.17-0.32)" if d > .17 else "wide(<0.17)"] += 1
        tot = sum(scale.values())
        scale = {k: round(v / tot, 3) for k, v in scale.items()}
        cxs = [h["cx"] for _, h in main_heads]; cys = [h["cy"] for _, h in main_heads]
        outl = [h["outline_px_1080"] for _, h in main_heads if h["ring_cover"] > .6 and h["d"] > .12]
        nheads = [len(h) for _, h in hd]
        # captions: change times vs word starts
        boxes = [(t, c) for t, c in cap if c]
        chg = [boxes[i][0] for i in range(1, len(boxes)) if boxes[i][1]["sig"] != boxes[i - 1][1]["sig"]]
        starts = [w["s"] for w in words]
        lags = []
        for c in chg:
            d = min(starts, key=lambda s: abs(s - c)) if starts else None
            if d is not None and abs(c - d) < .25:
                lags.append(c - d)
        hts = [ (c["y1"] - c["y0"]) * 3 for _, c in boxes]
        ycs = [ (c["y0"] + c["y1"]) / 2 / H for _, c in boxes]
        xcs = [ (c["x0"] + c["x1"]) / 2 / W for _, c in boxes]
        wds = [ (c["x1"] - c["x0"]) / W for _, c in boxes]
        cover = len(boxes) / max(1, len(cap))
        # mouth activity: during words, for a steady big head, change in the mouth area per frame
        mouth_rate = []
        for i in range(1, n - 1):
            t = i / FPS
            if not any(w["s"] <= t <= w["e"] for w in words):
                continue
            h = None
            for tt, hh in hd:
                if abs(tt - t) < 0.06 and hh:
                    h = hh[0]
            if not h or h["d"] < .3 or in_tr(t):
                continue
            cx, cy, r = h["cx"] * W, h["cy"] * H, h["d"] * W / 2
            x0, x1, y0, y1 = int(cx - r * .5), int(cx + r * .5), int(cy + r * .1), int(cy + r * .6)
            if x0 < 0 or y1 >= H:
                continue
            d = np.abs(fr[i, y0:y1, x0:x1].astype(int) - fr[i - 1, y0:y1, x0:x1].astype(int)).mean()
            mouth_rate.append(d)
        mr = np.array(mouth_rate)
        mouth_changes_per_s = float(((mr[1:] > 6) & (mr[:-1] <= 6)).sum() / (len(mr) / FPS)) if len(mr) > 30 else None
        lk_arr = {k: [x[k] for x in lk if x[k] is not None] for k in lk[0]}
        res = {
            "id": vid, "frames": n,
            "camera": {
                "tracked_share": round(len(ok) / n, 2),
                "hold_drift_pct_w_per_frame_median": round(float(np.median(hold_sp)), 3) if hold_sp else None,
                "hold_zoom_pct_per_frame_median": round(float(np.median(hold_zoom)), 3) if hold_zoom else None,
                "hold_zoom_in_share": round(float(np.mean(np.array(hold_zoom) > 0.02)), 2) if hold_zoom else None,
                "hold_zoom_out_share": round(float(np.mean(np.array(hold_zoom) < -0.02)), 2) if hold_zoom else None,
                "speed_p50_p90_p99": [round(float(np.percentile(sp, q)), 2) for q in (50, 90, 99)] if sp else None,
                "zoom_p5_p95": [round(float(np.percentile(zoom, q)), 2) for q in (5, 95)] if zoom else None,
                "rotation_p95_deg_per_frame": round(float(np.percentile(rot, 95)), 3) if rot else None,
                "jitter_pct_w": round(jitter, 3), "transitions": tr_info},
            "characters": {
                "frames_with_a_head": round(len(main_heads) / len(hd), 2),
                "heads_per_frame_mean": round(float(np.mean(nheads)), 2),
                "shot_scale_share": scale,
                "main_head_diameter_share_of_width_p25_p50_p75": [round(float(np.percentile(dists, q)), 3) for q in (25, 50, 75)] if dists else None,
                "face_centre_x_p25_p50_p75": [round(float(np.percentile(cxs, q)), 2) for q in (25, 50, 75)] if cxs else None,
                "face_centre_y_p25_p50_p75": [round(float(np.percentile(cys, q)), 2) for q in (25, 50, 75)] if cys else None,
                "head_outline_px_at_1080_median": round(float(np.median(outl)), 1) if outl else None,
                "mouth_changes_per_s_while_talking_closeups": round(mouth_changes_per_s, 2) if mouth_changes_per_s else None},
            "captions": {
                "on_screen_share": round(cover, 2),
                "glyph_band_height_px_1080": round(float(np.median(hts)), 0) if hts else None,
                "centre_y_share": round(float(np.median(ycs)), 3) if ycs else None,
                "centre_x_share": round(float(np.median(xcs)), 3) if xcs else None,
                "width_share_p50_p90": [round(float(np.percentile(wds, q)), 2) for q in (50, 90)] if wds else None,
                "changes_per_s": round(len(chg) / (n / FPS), 2),
                "change_minus_word_start_s_median": round(float(np.median(lags)), 3) if lags else None},
            "look": {k: round(float(np.median(v)), 3) for k, v in lk_arr.items() if v},
            "audio": audio_stats(p, words),
        }
        hits = res["audio"]["hits"]
        res["audio"]["transitions_with_a_hit_share"] = round(float(np.mean([any(abs(h - a) < .15 for h in hits) for a, b, _ in tr])), 2) if tr else None
        (OUT / f"{vid}.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
        print(vid, "done", flush=True)


main(sys.argv[1:] or [p.stem for p in REFS.glob("*.mp4")])
