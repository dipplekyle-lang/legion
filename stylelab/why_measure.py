"""Measure the "why": per-sentence light/colour/motion, subject-in-light, dissolves vs time words, cuts vs sentence starts,
darkest/brightest moments. Writes why/data.json; the emotion labels come from a separate step (why_label.py)."""
import json, math, pathlib, re, subprocess
import cv2
import numpy as np

import lab
HERE = lab.ROOT
OUT = HERE / "why"; OUT.mkdir(exist_ok=True)
VIDS = lab.IDS
FPS_S = 4
W, H = 360, 640
src = (pathlib.Path(__file__).parent / "deep_measure.py").read_text(encoding="utf-8")   # the toolkit copy, not the study folder
exec(src[src.index("def heads(frame):"):src.index("def caption_box(frame):")])
dis = json.loads((HERE / "deep2" / "dissolves.json").read_text(encoding="utf-8"))
TIME_WORDS = re.compile(r"\b(later|night|morning|midnight|weeks?|days?|months?|years?|minutes?|hours?|friday|monday|eventually|then|next|until|by the end|every)\b", re.I)


def sentences(words):
    out, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[.!?]$", w["w"]):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return [{"text": " ".join(x["w"] for x in s), "s": s[0]["s"], "e": s[-1]["e"]} for s in out]


data = {}
for vid in VIDS:
    meas = json.loads((HERE / "measure" / f"{vid}.json").read_text(encoding="utf-8"))
    words = json.loads((HERE / "measure" / f"{vid}.words.json").read_text(encoding="utf-8"))
    motion = np.load(HERE / "measure" / f"{vid}.motion.npy")
    dur = meas["seconds"]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "refs" / f"{vid}.mp4"), "-vf", f"fps={FPS_S},scale={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    col = []
    subj = []
    for i, f in enumerate(fr):
        b, g, r = [float(x) for x in f.reshape(-1, 3).mean(0)]
        hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
        col.append({"t": i / FPS_S, "warm": (r - b) / (r + b + 1e-6), "bright": float(hsv[..., 2].mean()) / 255, "sat": float(hsv[..., 1].mean()) / 255})
        if i % FPS_S == 0:                                   # 1 fps: is the subject standing in the light?
            hs = heads(f)
            if hs and 0.1 < hs[0]["d"] < 0.6:
                h = hs[0]; cx, cy, rr = h["cx"] * W, h["cy"] * H, h["d"] * W / 2
                yy, xx = np.mgrid[0:H, 0:W]
                d = np.hypot(xx - cx, yy - cy)
                v = hsv[..., 2].astype(float)
                notline = v > 70
                ring = (d > rr * 1.3) & (d < rr * 2.6) & notline
                rest = (d > rr * 3.2) & notline
                if ring.sum() > 400 and rest.sum() > 4000:
                    subj.append(v[ring].mean() / v[rest].mean())
    sents = sentences(words)
    tr = meas["camera_transitions"]
    for s in sents:
        c = [x for x in col if s["s"] <= x["t"] <= s["e"] + 0.25]
        s.update({k: round(float(np.mean([x[k] for x in c])), 3) for k in ("warm", "bright", "sat")} if c else {})
        s["motion"] = round(float(motion[int(s["s"] * 30):int(s["e"] * 30) + 1].mean()), 2)
        s["moves"] = sum(1 for a, b, _ in tr if s["s"] <= a <= s["e"])
        s["pos"] = round(s["s"] / dur, 2)
    # transitions vs sentence starts (and chance level)
    starts = np.array([s["s"] for s in sents])
    near = [float(np.min(np.abs(starts - a))) for a, b, _ in tr]
    tgrid = np.arange(0, dur, 0.05)
    chance = float(np.mean([np.min(np.abs(starts - t)) <= 0.25 for t in tgrid]))
    # dissolves vs time words (within 1.2 s), moves vs time words, and chance
    tw = [w["s"] for w in words if TIME_WORDS.search(w["w"])]
    dd = [tuple(x) for x in dis[vid]["dissolve_times"]]
    def has_tw(a, b): return any(a - 1.2 <= t <= b + 1.2 for t in tw)
    d_tw = [has_tw(a, b) for a, b in dd]
    m_tw = [has_tw(a, b) for a, b, _ in tr if (a, b) not in dd]
    chance_tw = float(np.mean([any(abs(t - x) <= 1.2 + 0.1 for t in tw) for x in tgrid]))
    # darkest / brightest seconds: the words spoken there
    sec = [(int(x["t"]), x["bright"]) for x in col]
    per = {}
    for t, bv in sec:
        per.setdefault(t, []).append(bv)
    per = sorted((np.mean(v), t) for t, v in per.items())
    k = max(2, len(per) // 10)
    def wordsat(ts): return [" ".join(w["w"] for w in words if t <= w["s"] < t + 1) for _, t in ts]
    data[vid] = {"duration": dur, "sentences": sents,
                 "subject_ring_vs_rest_brightness_median": round(float(np.median(subj)), 3) if subj else None, "subject_samples": len(subj),
                 "transitions_within_0.25s_of_sentence_start": round(float(np.mean([n <= 0.25 for n in near])), 2), "chance_level": round(chance, 2),
                 "dissolves_with_time_word": f"{sum(d_tw)}/{len(d_tw)}", "moves_with_time_word": f"{sum(m_tw)}/{len(m_tw)}",
                 "time_word_chance": round(chance_tw, 2),
                 "darkest_seconds_words": wordsat(per[:k]), "brightest_seconds_words": wordsat(per[-k:])}
    print(vid, {k2: v for k2, v in data[vid].items() if k2 not in ("sentences", "darkest_seconds_words", "brightest_seconds_words")}, flush=True)
(OUT / "data.json").write_text(json.dumps(data, indent=1), encoding="utf-8")
