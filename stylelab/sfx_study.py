"""Second pass on his sound: readable log-frequency spectrograms (words + cuts marked) and onset detection by band,
plus the music bed measured only inside real pauses. Needs audio_<id>.json (word timings, cuts) from audio_study.py.
usage: python sfx_study.py"""
import json, pathlib, subprocess
import numpy as np
import cv2

import lab
HERE = lab.sub("deep3")
REFS = HERE.parent / "refs"
SR, N, HOP = 22050, 1024, 128
IDS = lab.IDS


def pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def run_median(v, k):
    pad = np.pad(v, (k // 2, k // 2), mode="edge")
    return np.median(np.lib.stride_tricks.sliding_window_view(pad, k)[: len(v)], axis=1)


def main():
    summary = {}
    for vid in IDS:
        A = json.loads((HERE / f"audio_{vid}.json").read_text(encoding="utf-8"))
        W = A["word_timings"]; cuts = A["cuts"]
        x = pcm(REFS / f"{vid}.mp4"); dt = HOP / SR
        win = np.hanning(N).astype(np.float32)
        fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N // 2)), N)[::HOP] * win
        P = np.abs(np.fft.rfft(fr, axis=1)) ** 2; f = np.fft.rfftfreq(N, 1 / SR); t = np.arange(len(P)) * dt
        db = lambda e: 10 * np.log10(e + 1e-10)
        bands = {"sub": (25, 90), "low": (90, 250), "mid": (300, 3000), "pres": (3000, 6000), "air": (6000, 10500)}
        E = {k: db(P[:, (f >= a) & (f < b)].sum(1)) for k, (a, b) in bands.items()}
        full = db(P.sum(1))
        # ---- onsets per band: sharp rise over 4 hops and well above the 0.6 s running median ----
        ons = []
        for k in ("sub", "low", "air", "pres"):
            e = E[k]; base = run_median(e, int(0.6 / dt)); rise = e - np.r_[np.full(4, e[0]), e[:-4]]
            pk = [i for i in range(5, len(e) - 5) if e[i] - base[i] > (9 if k in ("sub", "low") else 11) and rise[i] > 7 and e[i] == e[i - 5:i + 6].max()]
            for i in pk: ons.append((t[i], k, round(float(e[i] - base[i]), 1)))
        ons.sort()
        ev = []
        for tt, k, h in ons:   # merge band onsets within 40 ms into one event
            if ev and tt - ev[-1]["t"] < 0.04: ev[-1]["bands"].add(k); ev[-1]["height"] = max(ev[-1]["height"], h)
            else: ev.append({"t": round(float(tt), 3), "bands": {k}, "height": h})
        starts = np.array([w[0] for w in W]); ends = np.array([w[1] for w in W])
        for e in ev:
            e["bands"] = sorted(e["bands"]); d = starts - e["t"]
            e["to_word_start"] = round(float(d[np.argmin(np.abs(d))]), 3)
            e["inside_word"] = bool(((starts <= e["t"]) & (ends >= e["t"])).any())
            e["to_cut"] = round(float(min(cuts, key=lambda c: abs(c - e["t"])) - e["t"]), 3) if cuts else None
            low_only = set(e["bands"]) <= {"sub", "low"}
            e["kind"] = "boom" if "sub" in e["bands"] and len(e["bands"]) <= 2 else "impact" if len(e["bands"]) >= 3 else "click" if set(e["bands"]) <= {"air", "pres"} else "thump" if low_only else "mixed"
        # consonant-like high onsets right at a word start are voice, not effects
        sfx = [e for e in ev if not (e["kind"] == "click" and abs(e["to_word_start"]) < 0.06)]
        # ---- music bed inside real pauses (>= 0.25 s, 50 ms trimmed each side) ----
        bed, bed_spec = [], []
        for i in range(len(W) - 1):
            a, b = W[i][1] + 0.05, W[i + 1][0] - 0.05
            if b - a >= 0.15:
                sel = (t >= a) & (t < b); bed.append(float(np.median(full[sel]))); bed_spec.append(P[sel].mean(0))
        inw = np.zeros(len(t), bool)
        for a, b, _ in W: inw[(t >= a + 0.03) & (t < b - 0.03)] = True
        voice = float(np.median(full[inw]))
        cen = None
        if bed_spec:
            s = np.mean(bed_spec, 0); cen = float((s * f).sum() / s.sum())
            low_share = float(s[f < 250].sum() / s.sum())
        else: low_share = None
        # opening and ending: level of the first 0.3 s and the last 0.5 s
        res = {"events": sfx, "count": len(sfx), "per_s": round(len(sfx) / A["duration"], 2),
               "kinds": {k: sum(1 for e in sfx if e["kind"] == k) for k in ("boom", "impact", "thump", "click", "mixed")},
               "share_on_cut_80ms": round(float(np.mean([abs(e["to_cut"]) <= 0.08 for e in sfx if e["to_cut"] is not None])), 2) if sfx else None,
               "share_inside_words": round(float(np.mean([e["inside_word"] for e in sfx])), 2) if sfx else None,
               "bed_minus_voice_dB": round(float(np.median(bed) - voice), 1) if bed else None, "bed_pauses_measured": len(bed),
               "bed_centroid_Hz": round(cen) if cen else None, "bed_share_below_250Hz": round(low_share, 2) if low_share is not None else None}
        summary[vid] = {k: v for k, v in res.items() if k != "events"}
        (HERE / f"sfx_{vid}.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
        # ---- readable spectrogram: log frequency 50 Hz-10.5 kHz, per-video normalised ----
        edges = np.geomspace(50, 10500, 241); img = np.zeros((240, len(P)), np.float32)
        for j in range(240):
            m = (f >= edges[j]) & (f < edges[j + 1])
            img[239 - j] = db(P[:, m].mean(1)) if m.any() else img[240 - j] if j else 0
        hi = np.percentile(img, 99.5); img = np.clip((img - (hi - 65)) / 65, 0, 1)
        col = cv2.applyColorMap((img * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
        pxs = 1 / dt / 2   # 2 hops per pixel -> 86 px per second
        col = cv2.resize(col, (int(len(P) / 2), 240))
        for si in range(int(np.ceil(A["duration"] / 12))):
            a, b = int(si * 12 * pxs), int(min(A["duration"], (si + 1) * 12) * pxs)
            strip = np.full((300, b - a, 3), 20, np.uint8); strip[30:270] = col[:, a:b]
            for c in cuts:
                if si * 12 <= c < (si + 1) * 12: X = int((c - si * 12) * pxs); cv2.line(strip, (X, 30), (X, 270), (60, 60, 255), 1)
            for e in sfx:
                if si * 12 <= e["t"] < (si + 1) * 12: X = int((e["t"] - si * 12) * pxs); cv2.drawMarker(strip, (X, 24), (80, 255, 80), cv2.MARKER_TRIANGLE_DOWN, 10, 2)
            for w in W:
                if si * 12 <= w[0] < (si + 1) * 12:
                    X = int((w[0] - si * 12) * pxs); cv2.line(strip, (X, 270), (X, 278), (255, 255, 255), 1); cv2.putText(strip, w[2][:9], (X + 1, 292), cv2.FONT_HERSHEY_SIMPLEX, 0.33, (255, 255, 255), 1)
            for s2 in range(13): X = int(s2 * pxs); cv2.putText(strip, f"{si * 12 + s2}s", (X + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 255, 200), 1)
            for hz, lab in ((100, "100"), (1000, "1k"), (5000, "5k")):
                Y = 30 + int(239 - np.searchsorted(edges, hz)); cv2.putText(strip, lab, (2, Y), cv2.FONT_HERSHEY_SIMPLEX, 0.33, (160, 160, 255), 1)
            cv2.imwrite(str(HERE / f"spec2_{vid}_{si}.png"), strip)
        print(vid, summary[vid], flush=True)
    (HERE / "sfx_all.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
