"""The SOUND of a style, measured on clean stems: Demucs splits each reference into the voice and everything else (music +
effects); this measures the music bed (level under the voice, brightness, tempo, key, how plucky or padded, how it moves)
and every sound effect on its own (when, how loud over the bed, how long, how bright, noisy or tonal, its pitch glide, which
kind: pop / blip / click / whoosh / chime / thump / riser / swell) and how effects line up with picture cuts and words.
Then spectrogram cards of the clearest effects of each kind for a vision pass that names them as a sound designer would.
needs: deep5/sep/htdemucs/<id>/{vocals,no_vocals}.wav (python -m demucs --two-stems=vocals -n htdemucs -o deep5/sep ...)
-> deep5/sound.json, deep5/sfx_cards_<kind>.jpg, deep5/sound_vision.json"""
import json, subprocess, sys, wave
import cv2
import numpy as np

import lab
HERE = lab.sub("deep5")
SEP = HERE / "sep" / "htdemucs"
SR, N, HOP = 22050, 1024, 256
DT = HOP / SR


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def stft(x):
    win = np.hanning(N).astype(np.float32)
    fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N // 2)), N)[::HOP] * win
    return np.abs(np.fft.rfft(fr, axis=1)).T                                 # (bins, frames)


def med(a, k, axis):
    pad = [(0, 0), (0, 0)]; pad[axis] = (k // 2, k // 2)
    return np.median(np.lib.stride_tricks.sliding_window_view(np.pad(a, pad, mode="edge"), k, axis=axis), axis=-1)


def db(v):
    return 20 * np.log10(np.maximum(v, 1e-9))


def src_of(vid):
    return next((p for p in (lab.REFS / f"{vid}.mp4", lab.ROOT / "refs2" / f"{vid}.mp4") if p.exists()), None)


def motion_of(vid):
    """Times where the picture changes suddenly (an element pops, moves fast, a cut): frame-difference spikes at 30 fps.
    A real sound effect has a picture partner within ~0.1 s; a note of the music does not."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src_of(vid)), "-vf", "fps=30,scale=108:192,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, 192, 108).astype(np.float32)
    f[:, int(0.74 * 192):int(0.83 * 192)] = 0                              # the caption line changes every word
    d = np.r_[0, np.abs(np.diff(f, axis=0)).mean((1, 2))]
    base = med(d[None], 31, 1)[0]; mad = np.median(np.abs(d - np.median(d))) + 1e-6
    return [i / 30 for i in range(1, len(d) - 1) if d[i] > base[i] + 4 * mad and d[i] >= d[i - 1] and d[i] >= d[i + 1]]


def cuts_of(vid):
    src = src_of(vid)
    out = subprocess.run(["ffmpeg", "-v", "info", "-i", str(src), "-vf", "scale=270:480,select='gt(scene,0.3)',showinfo", "-f", "null", "-"],
                         capture_output=True, text=True, errors="ignore").stderr
    return [float(s.split("pts_time:")[1].split()[0]) for s in out.splitlines() if "pts_time:" in s]


FREQ = np.fft.rfftfreq(N, 1 / SR)
NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def key_of(H):
    """Krumhansl key estimate from the harmonic part's chroma."""
    ok = (FREQ > 60) & (FREQ < 2000)
    pc = np.round(12 * np.log2(FREQ[ok] / 261.63)).astype(int) % 12
    chroma = np.bincount(pc, weights=H[ok].sum(1), minlength=12)
    best = max(((np.corrcoef(np.roll(prof, k), chroma)[0, 1], NOTE[k] + (" major" if prof is MAJ else " minor")) for prof in (MAJ, MIN) for k in range(12)))
    return best[1], round(float(best[0]), 2)


def tempo_of(flux):
    f = flux - flux.mean(); ac = np.correlate(f, f, "full")[len(f) - 1:]
    lo, hi = int(60 / 180 / DT), int(60 / 50 / DT)
    k = lo + int(np.argmax(ac[lo:hi])); return round(60 / (k * DT), 1), round(float(ac[k] / max(ac[0], 1e-9)), 2)


def classify(e):
    d, c, fl, gl, lo = e["dur_s"], e["centroid_hz"], e["flatness"], e["glide_oct"], e["low_share"]
    if d >= 0.9 and gl > 0.25: return "riser"
    if d >= 0.9: return "swell"
    if lo > 0.55 and c < 400: return "thump"
    if fl > 0.28 and d >= 0.15: return "whoosh"
    if d < 0.06 and c > 2500: return "click"
    if fl < 0.12 and c > 3000 and d >= 0.25: return "chime"
    if fl < 0.2 and d < 0.25: return "blip" if abs(gl) > 0.15 else "pop"
    return "pop" if d < 0.2 else "whoosh" if fl > 0.2 else "chime"


def one(vid):
    v, m = load(SEP / vid / "vocals.wav"), load(SEP / vid / "no_vocals.wav")
    n = min(len(v), len(m)); v, m = v[:n], m[:n]
    Sv, Sm = stft(v), stft(m)
    ev, em = np.sqrt((Sv ** 2).sum(0)), np.sqrt((Sm ** 2).sum(0))
    speak = ev > np.percentile(ev, 60) * 0.25
    Hm, Pm = med(Sm, 17, 1), med(Sm, 17, 0)                                  # harmonic (sustained) vs percussive (transient)
    bed = np.sqrt((Hm ** 2).sum(0)); hit = np.sqrt((Pm ** 2).sum(0))
    # effects: transients in the non-voice stem that stand clearly over the bed around them
    flux = np.maximum(0, np.diff(db(Sm + 1e-6), axis=1)).mean(0); flux = np.r_[0, flux]
    thr = med(flux[None], 43, 1)[0] + 2.2 * np.std(flux)
    peaks = [i for i in range(2, len(flux) - 2) if flux[i] > thr[i] and flux[i] == flux[i - 2:i + 3].max()]
    local = med(em[None], int(2.0 / DT) | 1, 1)[0]
    cuts = cuts_of(vid); moves = motion_of(vid); words = np.flatnonzero(np.diff(speak.astype(int)) == 1) * DT
    evs = []
    for i in peaks:
        j = i + int(np.argmax(em[i:i + 6])); over = db(em[j]) - db(local[j])
        if over < 4.0:
            continue
        k = j
        while k < len(em) - 1 and db(em[k]) - db(local[k]) > 3.0 and (k - j) * DT < 3.0:
            k += 1
        a0 = i
        while a0 > 0 and db(em[a0]) - db(local[a0]) > 3.0 and (i - a0) * DT < 1.5:
            a0 -= 1
        seg = Sm[:, a0:k + 1] + 1e-9
        spec = seg.mean(1); cen = float((FREQ * spec).sum() / spec.sum())
        flat = float(np.exp(np.log(spec).mean()) / spec.mean())
        cs = (FREQ[:, None] * seg).sum(0) / seg.sum(0)
        glide = float(np.log2(cs[-1] / cs[0])) if len(cs) > 2 else 0.0
        t = a0 * DT
        evs.append({"t": round(t, 2), "attack_s": round((j - a0) * DT, 3), "dur_s": round((k - a0) * DT, 3), "over_bed_db": round(over, 1),
                    "under_voice_db": round(float(np.median(db(ev[speak]))) - float(db(em[j])), 1), "centroid_hz": int(cen), "flatness": round(flat, 3),
                    "glide_oct": round(glide, 2), "low_share": round(float(spec[FREQ < 250].sum() / spec.sum()), 2),
                    "to_cut_s": round(min((abs(t - c) for c in cuts), default=9), 2), "in_word": bool(speak[j]),
                    "to_word_s": round(min((abs(t - w) for w in words), default=9), 2),
                    "to_motion_s": round(min((abs(t - w) for w in moves), default=9), 2)})
    for e in evs:
        e["kind"] = classify(e)
        e["fx"] = bool(e["to_motion_s"] <= 0.12 or e["to_cut_s"] <= 0.12)          # has a picture partner = a sound effect, else music
    allev = evs; evs = [e for e in allev if e["fx"]]
    dur = n / SR
    key, conf = key_of(Hm[:, ~speak] if (~speak).sum() > 50 else Hm)
    bpm, beat = tempo_of(np.r_[0, np.maximum(0, np.diff(db(Hm + Pm + 1e-6), axis=1)).mean(0)])
    hspec = Hm.mean(1)
    return {"vid": vid, "dur": round(dur, 1),
            "voice_minus_stem_db": round(float(np.median(db(ev[speak])) - np.median(db(em[speak]))), 1),
            "voice_minus_bed_db": round(float(np.median(db(ev[speak])) - np.median(db(bed[speak]))), 1),
            "bed_in_pauses_minus_voice_db": round(float(np.median(db(em[~speak])) - np.median(db(ev[speak]))), 1) if (~speak).sum() > 20 else None,
            "bed_centroid_hz": int((FREQ * hspec).sum() / hspec.sum()), "bed_low_share": round(float(hspec[FREQ < 250].sum() / hspec.sum()), 2),
            "bed_high_share": round(float(hspec[FREQ > 4000].sum() / hspec.sum()), 2),
            "bed_transient_ratio": round(float(np.median(hit) / max(np.median(bed), 1e-9)), 2),
            "bed_level_swing_db": round(float(np.percentile(db(bed), 90) - np.percentile(db(bed), 10)), 1),
            "tempo_bpm": bpm, "beat_strength": beat, "key": key, "key_conf": conf,
            "cuts": len(cuts), "music_notes_per_s": round(sum(not e["fx"] for e in allev) / (n / SR), 2), "effects": evs, "effects_per_s": round(len(evs) / dur, 2)}


def cards(res):
    """Spectrogram cards: the 8 clearest effects of each kind, 0.9 s each, log frequency 60 Hz-11 kHz."""
    out = {}
    for kind in ("pop", "blip", "click", "whoosh", "chime", "thump", "riser", "swell"):
        pick = sorted(((e, r["vid"]) for r in res for e in r["effects"] if e["kind"] == kind), key=lambda x: -x[0]["over_bed_db"])[:8]
        if not pick:
            continue
        tiles = []
        for e, vid in pick:
            m = load(SEP / vid / "no_vocals.wav"); a = max(0, int((e["t"] - 0.15) * SR)); seg = m[a:a + int(0.9 * SR)]
            S = db(stft(seg) + 1e-6); ok = (FREQ > 60) & (FREQ < 11000)
            rows = np.interp(np.geomspace(60, 11000, 200), FREQ[ok], np.arange(ok.sum())).astype(int)
            img = S[ok][rows][::-1]; img = np.clip((img - img.max() + 70) / 70 * 255, 0, 255).astype(np.uint8)
            img = cv2.applyColorMap(cv2.resize(img, (240, 200)), cv2.COLORMAP_MAGMA)
            cv2.putText(img, f"{vid[:4]} {e['t']}s {e['dur_s']}s", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
            tiles.append(img)
        while len(tiles) % 4:
            tiles.append(np.zeros_like(tiles[0]))
        sheet = np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)])
        p = HERE / f"sfx_cards_{kind}.jpg"; cv2.imwrite(str(p), sheet); out[kind] = (p, len(pick))
    return out


VISION = """These are spectrograms of sound effects from a 2D vector science-explainer Short, each tile 0.9 s (left to right),
frequency 60 Hz (bottom) to 11 kHz (top), log scale, brighter = louder; the effect starts ~0.15 s into each tile. All tiles
on this sheet were classified as "{kind}". Describe them the way a sound designer would rebuild them from scratch:
the source (synth blip, bubble, glass, wood, airy noise whoosh, sub boom, bell, pluck, mallet...), the envelope (attack,
decay, how long it rings), the pitch (steady, rising, falling, how far), the tone (soft/round or hard/bright), the
frequency range, whether it is musical (pitched in a key) and how it sits in the mix. Also say what it would NOT sound like.
Return ONLY JSON: {"kind": "{kind}", "source": "", "envelope": "", "pitch": "", "tone": "", "range_hz": "", "musical": true,
"recipe": "how to synthesise one in code (oscillators, noise, filters, envelopes, numbers)", "not_like": ""}"""


def main():
    ids = sorted(p.name for p in SEP.iterdir() if (p / "no_vocals.wav").exists())
    res = []
    for vid in ids:
        r = one(vid); res.append(r)
        kinds = {}
        for e in r["effects"]:
            kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
        print(vid, "voice-stem", r["voice_minus_stem_db"], "dB | bed", r["bed_centroid_hz"], "Hz", r["tempo_bpm"], "bpm", r["key"],
              "| fx/s", r["effects_per_s"], kinds, flush=True)
    allfx = [e for r in res for e in r["effects"]]
    def pct(key, sub=None):
        v = [e[key] for e in (sub if sub is not None else allfx)]
        return [round(float(np.percentile(v, q)), 3) for q in (25, 50, 75)] if v else None
    kinds = {}
    for k in sorted({e["kind"] for e in allfx}):
        sub = [e for e in allfx if e["kind"] == k]
        kinds[k] = {"share": round(len(sub) / len(allfx), 2), "dur_s": pct("dur_s", sub), "attack_s": pct("attack_s", sub), "centroid_hz": pct("centroid_hz", sub),
                    "over_bed_db": pct("over_bed_db", sub), "under_voice_db": pct("under_voice_db", sub), "glide_oct": pct("glide_oct", sub),
                    "on_cut_share": round(sum(e["to_cut_s"] < 0.12 for e in sub) / len(sub), 2), "in_word_share": round(sum(e["in_word"] for e in sub) / len(sub), 2)}
    rv = lambda key: [round(float(np.percentile([r[key] for r in res if r[key] is not None], q)), 2) for q in (25, 50, 75)]
    summary = {"refs": len(res), "effects": len(allfx), "effects_per_s": rv("effects_per_s"), "voice_minus_stem_db": rv("voice_minus_stem_db"),
               "voice_minus_bed_db": rv("voice_minus_bed_db"), "bed_centroid_hz": rv("bed_centroid_hz"), "bed_low_share": rv("bed_low_share"),
               "bed_high_share": rv("bed_high_share"), "bed_transient_ratio": rv("bed_transient_ratio"), "bed_level_swing_db": rv("bed_level_swing_db"),
               "tempo_bpm": rv("tempo_bpm"), "keys": [r["key"] for r in res], "on_cut_share": round(sum(e["to_cut_s"] < 0.12 for e in allfx) / max(1, len(allfx)), 2),
               "kinds": kinds}
    (HERE / "sound.json").write_text(json.dumps({"summary": summary, "refs": res}, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o)), encoding="utf-8")
    print(json.dumps(summary, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o)))
    if "--no-vision" in sys.argv:
        return
    import app
    vis = []
    for kind, (p, n) in cards(res).items():
        try:
            got = app.claude_json(VISION.replace("{kind}", kind), [str(p)], dict)
        except Exception as e:                                               # noqa: BLE001
            got = {"kind": kind, "error": str(e)[:200]}
        got["n_on_sheet"] = n; vis.append(got); print(kind, "->", (got.get("source") or got.get("error") or "")[:90], flush=True)
    (HERE / "sound_vision.json").write_text(json.dumps(vis, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
