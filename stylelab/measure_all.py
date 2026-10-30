"""Measure every reference Short: words + timings, motion per frame, cuts vs camera moves, palette, audio hits."""
import json, pathlib, subprocess, sys
import numpy as np

import lab
HERE = lab.ROOT
REFS = HERE / "refs"
OUT = HERE / "measure"
OUT.mkdir(exist_ok=True)
FPS = 30


def frames(p, w=135, h=240):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.float32)


def audio(p, sr=16000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)


def palette(f, k=10):
    px = f[::6, ::4, ::4].reshape(-1, 3)
    rng = np.random.default_rng(0)
    c = px[rng.choice(len(px), k, replace=False)]
    for _ in range(12):
        lab = ((px[:, None] - c[None]) ** 2).sum(-1).argmin(1)
        c = np.array([px[lab == i].mean(0) if (lab == i).any() else c[i] for i in range(k)])
    share = np.bincount(lab, minlength=k) / len(lab)
    o = np.argsort(-share)
    return [{"hex": "#%02X%02X%02X" % tuple(int(v) for v in c[i]), "share": round(float(share[i]), 3)} for i in o]


def main():
    from faster_whisper import WhisperModel
    wm = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=12)
    summary = []
    for p in sorted(REFS.glob("*.mp4")):
        vid = p.stem
        f = frames(p)
        d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2, 3))            # motion per frame (0-255)
        n = len(f)
        dur = n / FPS
        med = float(np.median(d))
        cuts = [round((i + 1) / FPS, 2) for i in range(len(d)) if d[i] > max(28, 6 * med) and (i == 0 or d[i] > 2.5 * d[i - 1])]
        # sustained high motion = a camera transition (fly/whip/pan)
        hi = d > max(6.0, 2.2 * med)
        trans, s = [], None
        for i, v in enumerate(hi):
            if v and s is None:
                s = i
            if not v and s is not None:
                if i - s >= 4:
                    trans.append([round(s / FPS, 2), round(i / FPS, 2), round(float(d[s:i].mean()), 1)])
                s = None
        still = float((d < 1.0).mean())
        # brightness ramps to/from black or white = fades
        lum = f.mean(axis=(1, 2, 3))
        fades = [round(i / FPS, 2) for i in range(1, n) if (lum[i] < 12 or lum[i] > 243) and not (lum[i - 1] < 12 or lum[i - 1] > 243)]
        a = audio(p)
        segs, info = wm.transcribe(a, language="en", word_timestamps=True)
        words = [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for sg in segs for w in sg.words]
        text = " ".join(x["w"] for x in words)
        # audio: loudness per 0.1 s and sharp onsets (sound hits)
        hop = 1600
        rms = np.sqrt(np.convolve(a * a, np.ones(hop) / hop, "same")[::hop])
        on = np.maximum(np.diff(rms, prepend=rms[0]), 0)
        hits = [round(i * 0.1, 1) for i in range(1, len(on) - 1) if on[i] > 3 * (np.median(on) + 1e-6) and on[i] == on[i - 1:i + 2].max() and on[i] > 0.02]
        gaps = [round(words[i + 1]["s"] - words[i]["e"], 2) for i in range(len(words) - 1)]
        res = {"id": vid, "seconds": round(dur, 2), "words": len(words), "words_per_s": round(len(words) / dur, 2),
               "first_word_at": words[0]["s"] if words else None, "last_word_end": words[-1]["e"] if words else None,
               "long_pauses": [(words[i]["e"], g) for i, g in enumerate(gaps) if g > 0.45],
               "motion_median": round(med, 2), "near_still_share": round(still, 3), "hard_cuts": cuts,
               "camera_transitions": trans, "fades": fades[:20], "palette": palette(f),
               "audio_hits": hits[:80], "loudness_db_median": round(float(20 * np.log10(np.median(rms) + 1e-9)), 1),
               "text": text}
        (OUT / f"{vid}.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
        (OUT / f"{vid}.words.json").write_text(json.dumps(words), encoding="utf-8")
        np.save(OUT / f"{vid}.motion.npy", d)
        summary.append({k: res[k] for k in ("id", "seconds", "words", "words_per_s", "first_word_at", "motion_median",
                                              "near_still_share")} | {"cuts": len(cuts), "transitions": len(trans)})
        print(json.dumps(summary[-1]), flush=True)
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")


main()
