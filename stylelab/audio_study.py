"""Deep sound study of the reference Shorts: word timings, voice pace/pauses/emphasis, music bed (level, tempo, changes, ending),
sound-effect transients (count, band, loudness, timing vs words and cuts). Writes audio_<id>.json + spectrogram strips.
usage: python audio_study.py"""
import json, pathlib, subprocess, sys
import numpy as np
import cv2

import lab
HERE = lab.sub("deep3")
REFS = HERE.parent / "refs"
SR = 22050
IDS = lab.IDS


def pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def stereo_width(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2)
    m, s = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2
    return float(20 * np.log10((np.sqrt(np.mean(s ** 2)) + 1e-9) / (np.sqrt(np.mean(m ** 2)) + 1e-9)))


def loudness(path):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = r[r.rfind("Summary:"):]
    get = lambda key: float(tail.split(key)[1].split()[0]) if key in tail else None
    return {"integrated_LUFS": get("I:"), "LRA_LU": get("LRA:"), "true_peak_dBFS": get("Peak:")}


def stft(x, n=2048, hop=256):
    w = np.hanning(n).astype(np.float32)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n // 2, n // 2)), n)[::hop] * w
    return np.abs(np.fft.rfft(frames, axis=1)), hop / SR, np.fft.rfftfreq(n, 1 / SR)


def words_of(path):
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    segs, _ = m.transcribe(np.frombuffer(raw, np.float32).copy(), word_timestamps=True, language="en")   # array in: this PyAV can't open files for whisper
    return [(round(w.start, 3), round(w.end, 3), w.word.strip()) for s in segs for w in s.words]


def cuts_of(vid):
    """camera cuts / big changes from frame differences (whole-frame mean abs diff on 64x114 greys)"""
    cap = cv2.VideoCapture(str(REFS / f"{vid}.mp4")); prev = None; d = []
    while True:
        ok, f = cap.read()
        if not ok: break
        g = cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (64, 114)).astype(np.float32)
        d.append(0 if prev is None else float(np.mean(np.abs(g - prev)))); prev = g
    d = np.array(d); thr = np.median(d) + 6 * np.median(np.abs(d - np.median(d)))
    return [round(i / 30, 3) for i in range(1, len(d) - 1) if d[i] > max(thr, 12) and d[i] >= d[i - 1] and d[i] >= d[i + 1]], d


def main():
    out_all = {}
    for vid in IDS:
        path = REFS / f"{vid}.mp4"; x = pcm(path); dur = len(x) / SR
        W = words_of(path)
        S, dt, fr = stft(x); P = S ** 2
        band = lambda lo, hi: P[:, (fr >= lo) & (fr < hi)].sum(1)
        db = lambda e: 10 * np.log10(e + 1e-12)
        t = np.arange(len(P)) * dt
        inword = np.zeros(len(P), bool)
        for a, b, _ in W: inword[(t >= a) & (t < b)] = True
        gap = ~inword
        full = db(P.sum(1)); low = db(band(30, 150)); mid = db(band(300, 3400)); hi = db(band(6000, 11000))
        # ---- voice: pace per tenth, pauses, emphasis ----
        starts = np.array([w[0] for w in W]); ends = np.array([w[1] for w in W])
        gaps = starts[1:] - ends[:-1]
        tenths = [int(((starts >= dur * k / 10) & (starts < dur * (k + 1) / 10)).sum()) / (dur / 10) for k in range(10)]
        long_pauses = [(round(float(ends[i]), 2), round(float(gaps[i]), 2), W[i][2], W[i + 1][2]) for i in range(len(gaps)) if gaps[i] > 0.28]
        wl = [float(np.median(mid[(t >= a) & (t < b)])) if ((t >= a) & (t < b)).any() else np.nan for a, b, _ in W]
        wl = np.array(wl); z = (wl - np.nanmedian(wl)) / (np.nanstd(wl) + 1e-9)
        loud_words = [W[i][2] for i in np.argsort(-np.nan_to_num(z, nan=-9))[:12]]
        # ---- music bed: level in gaps vs voice, low band over time, tempo, ending ----
        voice_db = float(np.median(full[inword])); bed_db = float(np.median(full[gap])) if gap.any() else None
        low_per_sec = [float(np.median(low[(t >= s) & (t < s + 1)])) for s in range(int(dur))]
        env = np.maximum(0, np.diff(db(band(40, 200)), prepend=0)); env = env - env.mean()
        ac = np.correlate(env, env, "full")[len(env) - 1:]; lags = np.arange(len(ac)) * dt
        sel = (lags > 0.3) & (lags < 1.2); bl = lags[sel][np.argmax(ac[sel])]; bpm = 60 / bl
        conf = float(ac[sel].max() / (ac[0] + 1e-9))
        last_word = float(ends[-1]) if len(ends) else dur
        quiet = np.where(full > (np.max(full) - 60))[0]; audio_end = float(t[quiet[-1]]) if len(quiet) else dur
        # ---- sound-effect transients: low-band thumps and high-band hits that are not voice consonant noise ----
        flux = np.maximum(0, np.diff(S, axis=0)).sum(1); flux = np.r_[0, flux]
        k = 9; med = np.convolve(flux, np.ones(k) / k, "same")
        cand = [i for i in range(2, len(flux) - 2) if flux[i] > 3.5 * med[i] and flux[i] == flux[i - 2:i + 3].max() and flux[i] > np.percentile(flux, 97)]
        hits = []
        for i in cand:
            ti = t[i]; seg = slice(i, min(len(P), i + int(0.12 / dt)))
            spec = P[seg].sum(0); cen = float((spec * fr).sum() / (spec.sum() + 1e-9))
            near_word = float(np.min(np.abs(starts - ti))) if len(starts) else 9
            lowj = float(low[i] - np.median(low[max(0, i - 40):i + 1])); hij = float(hi[i] - np.median(hi[max(0, i - 40):i + 1]))
            kind = "thump" if lowj > 8 and cen < 1500 else "bright" if hij > 10 and cen > 3500 else "mid"
            hits.append({"t": round(float(ti), 3), "centroid_Hz": round(cen), "kind": kind, "low_jump_dB": round(lowj, 1), "high_jump_dB": round(hij, 1),
                         "dist_to_word_start": round(near_word, 3), "level_vs_voice_dB": round(float(full[i] - voice_db), 1)})
        sfx = [h for h in hits if h["kind"] != "mid" or h["dist_to_word_start"] > 0.08]
        cuts, _ = cuts_of(vid)
        def nearest(ts, arr): return [round(float(min(arr, key=lambda c: abs(c - a)) - a), 3) for a in ts] if len(arr) else []
        sfx_to_cut = nearest([h["t"] for h in sfx], cuts)
        res = {
            "duration": round(dur, 2), "words": len(W), "words_per_s": round(len(W) / last_word, 2),
            "loudness": loudness(path), "stereo_side_vs_mid_dB": round(stereo_width(path), 1),
            "voice": {"pace_per_tenth_wps": [round(v, 2) for v in tenths], "gap_median_s": round(float(np.median(gaps)), 3),
                      "gap_p90_s": round(float(np.percentile(gaps, 90)), 3), "share_gaps_under_60ms": round(float((gaps < 0.06).mean()), 2),
                      "long_pauses": long_pauses, "loudest_words": loud_words,
                      "first_word_at": round(float(starts[0]), 3), "last_word_end": round(last_word, 3)},
            "music": {"voice_minus_gap_dB": round(voice_db - bed_db, 1) if bed_db is not None else None,
                      "tempo_bpm_est": round(float(bpm), 1), "tempo_confidence": round(conf, 2),
                      "low_band_per_second_dB": [round(v, 1) for v in low_per_sec], "audio_tail_after_last_word_s": round(audio_end - last_word, 2)},
            "sfx": {"count": len(sfx), "per_s": round(len(sfx) / dur, 2), "by_kind": {k2: sum(1 for h in sfx if h["kind"] == k2) for k2 in ("thump", "bright", "mid")},
                    "level_vs_voice_dB_median": round(float(np.median([h["level_vs_voice_dB"] for h in sfx])), 1) if sfx else None,
                    "share_within_80ms_of_a_cut": round(float(np.mean([abs(d) <= 0.08 for d in sfx_to_cut])), 2) if sfx_to_cut else None,
                    "offset_to_nearest_cut_median_s": round(float(np.median(sfx_to_cut)), 3) if sfx_to_cut else None, "hits": sfx},
            "cuts": cuts, "word_timings": W,
        }
        out_all[vid] = res
        (HERE / f"audio_{vid}.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
        # spectrogram strips (15 s each) with word starts (white ticks) and cuts (red lines), for reading sounds by eye
        img = np.clip((db(P.T[::-1][: int(len(fr) * 0.5)]) + 100) / 80, 0, 1)
        img = (img * 255).astype(np.uint8); img = cv2.applyColorMap(img, cv2.COLORMAP_MAGMA)
        pxs = 1 / dt
        for si in range(int(np.ceil(dur / 15))):
            a, b = int(si * 15 * pxs), int(min(dur, (si + 1) * 15) * pxs); strip = cv2.resize(img[:, a:b].copy(), ((b - a) * 2, 360))
            for c in cuts:
                if si * 15 <= c < (si + 1) * 15: X = int((c - si * 15) * pxs * 2); cv2.line(strip, (X, 0), (X, 359), (0, 0, 255), 2)
            for w in W:
                if si * 15 <= w[0] < (si + 1) * 15:
                    X = int((w[0] - si * 15) * pxs * 2); cv2.line(strip, (X, 340), (X, 359), (255, 255, 255), 2); cv2.putText(strip, w[2][:10], (X + 2, 335), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
            for s2 in range(16): X = int(s2 * pxs * 2); cv2.putText(strip, f"{si * 15 + s2}", (X + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 255, 200), 1)
            cv2.imwrite(str(HERE / f"spec_{vid}_{si}.png"), strip)
        print(vid, "words", len(W), "sfx", len(sfx), "bpm", round(float(bpm)), flush=True)
    (HERE / "audio_all.json").write_text(json.dumps({k: {kk: vv for kk, vv in v.items() if kk not in ("word_timings",)} for k, v in out_all.items()}, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
