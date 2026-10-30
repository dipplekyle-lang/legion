"""The flat style's own sound, made in code from the sound study (SPEC section 15): ours, free, no samples.

    python sound.py   ->  bed_cosmic.wav  (the music bed: F major, 70 bpm, warm pads + mallets + soft low end, no drums)
                          sfx_cosmic/     (the effects: soft tuned blips, pops, mallet chimes, thump-whooshes, knocks)

Measured on 16 reference Shorts (Demucs stems): the bed sits ~23 dB under the voice, centroid ~1060 Hz, 40 % of its energy
under 250 Hz, 8 % over 4 kHz, no drums, swells of ~11 dB between sections, 52-85 bpm, mostly F or C major. Effects are rare
(0.06-0.15 a second) and tuned: blips ~0.09 s falling ~1 octave, pops ~0.07 s round with a soft thump under a tiny click,
chimes ~0.28 s like a soft marimba or bell pluck, "whooshes" that are really short falling thumps (~0.24 s), not air.
Nothing glassy, nothing above ~8 kHz, nothing cartoon."""
import pathlib, wave
import numpy as np

HERE = pathlib.Path(__file__).parent
SR = 44100
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)
F_MAJOR = [65, 67, 69, 70, 72, 74, 76]                     # F G A Bb C D E (the key the references sit in most)


def _t(dur):
    return np.arange(int(SR * dur)) / SR


def _bp_noise(n, lo, hi, rng):
    """White noise band-passed in the frequency domain (lo..hi Hz)."""
    x = rng.standard_normal(n)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, n)


def _lp(x, hz):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / hz) ** 4)
    return np.fft.irfft(X, len(x))


def _hp(x, hz):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (hz / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X, len(x))


def _sweep(f_of_t, t):
    return np.sin(2 * np.pi * np.cumsum(f_of_t) / SR)


def _finish(y, fade=0.006):
    n = int(fade * SR)
    y = y.copy(); y[-n:] *= np.linspace(1, 0, n)
    return y / max(1e-9, np.abs(y).max()) * 0.5


# ---------- effects (recipes from the study's spectrogram reading, numbers from its measurements) ----------
def blip(f0, rng):
    """~0.09 s soft synth tick falling about an octave and a half; a faint 3 kHz click on top."""
    t = _t(0.15); fe = f0 / 2.2
    body = _sweep(fe + (f0 - fe) * np.exp(-t / 0.03), t) * np.minimum(1, t / 0.002) * np.exp(-t / 0.035)
    over = 0.25 * _sweep(2 * (fe + (f0 - fe) * np.exp(-t / 0.03)), t) * np.exp(-t / 0.015)
    click = 0.3 * _bp_noise(len(t), 2200, 4200, rng) * np.exp(-t / 0.003)
    return _finish(_hp(_lp(body + over + click, 6000), 60))


def pop(f0, rng):
    """~0.07 s round pop: a pitched body dropping 2 semitones, its 2nd partial, a soft 160->70 Hz thump, a tiny click."""
    t = _t(0.16)
    fb = f0 * (1 + (2 ** (2 / 12) - 1) * np.exp(-t / 0.012))
    body = 0.7 * _sweep(fb, t) * np.minimum(1, t / 0.001) * np.exp(-t / 0.032)
    body += 0.25 * _sweep(2 * fb, t) * np.exp(-t / 0.02)
    thump = 0.3 * _sweep(70 + 90 * np.exp(-t / 0.02), t) * np.exp(-t / 0.035)
    click = 0.35 * _bp_noise(len(t), 1800, 4000, rng) * np.exp(-t / 0.005)
    y = body + thump + click
    room = np.zeros_like(y); d = int(0.045 * SR)
    room[d:] = 0.12 * y[:-d]                               # a hint of room, no long tail
    return _finish(_hp(_lp(y + room, 6500), 50))


def chime(f0, rng):
    """~0.3 s soft mallet/bell pluck: partials 1:2:3:4.2 decaying fast, a sub an octave down, a soft mallet click."""
    t = _t(0.38)
    att = np.minimum(1, t / 0.004)
    y = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / d) for r, a, d in
            ((1, 1.0, 0.11), (2, 0.5, 0.06), (3, 0.3, 0.04), (4.2, 0.15, 0.025))) * att
    y += 0.5 * np.sin(2 * np.pi * f0 / 2 * t) * np.exp(-t / 0.1) * att
    y += 0.03 * _bp_noise(len(t), 1000, 3000, rng) * np.exp(-t / 0.01)
    n = int(0.03 * SR); y[-n:] *= np.linspace(1, 0, n)
    return _finish(_lp(y, 6000), fade=0.03)


def thump(f0, rng):
    """The references' "whoosh": a short dry falling thump-zip (~0.24 s), 400 -> 70 Hz, a crisp click, a faint noise bed."""
    t = _t(0.26)
    body = _sweep(160 + (f0 - 160) * np.exp(-t / 0.06), t) * np.minimum(1, t / 0.002) * np.exp(-t / 0.07)
    click = 0.25 * _hp(rng.standard_normal(len(t)), 2000) * np.exp(-t / 0.006)
    air = 0.12 * _bp_noise(len(t), 400, 3500, rng) * np.exp(-t / 0.11)
    return _finish(body + click + air)


def knock(f0, rng):
    """~0.07 s dull hollow tap (wood/plastic), for a tick per step: a low body, a band-passed knock, two resonances."""
    t = _t(0.08)
    body = 0.6 * _sweep(90 + (f0 - 90) * np.exp(-t / 0.012), t) * np.exp(-t / 0.03)
    k = 0.5 * _bp_noise(len(t), 600, 900, rng) * np.exp(-t / 0.012)
    res = sum(0.15 * np.sin(2 * np.pi * fr * t) * np.exp(-t / 0.02) for fr in (350, 1100))
    tick = 0.25 * _lp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.0015)
    return _finish(body + k + res + tick)


def write(p, y, sr=SR):
    p.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())


def make_sfx(dest):
    """Named so Legion's sound sorter reads their purpose: Blips/Pops = something appears, Chimes = a reveal,
    Whooshes = a move or cut, Knocks = a tick per step. Each pitch is a note of F major, so they sit in the bed's key."""
    rng = np.random.default_rng(7)
    sets = [("Blips/Soft Blip", blip, [77, 79, 81, 82, 84, 86]),       # F5..D6 start, falling about an octave
            ("Pops/Soft Pop", pop, [72, 74, 76, 77, 79, 81]),          # C5..A5
            ("Chimes/Mallet Chime", chime, [65, 67, 69, 72, 74, 76]),  # F4..E5
            ("Whooshes/Soft Whoosh", thump, [67, 69, 70, 72]),         # 390-520 Hz falling to 160
            ("Knocks/Soft Knock", knock, [50, 53, 55])]                # 147-196 Hz bodies
    n = 0
    for name, fn, notes in sets:
        for k, m in enumerate(notes):
            write(dest / f"{name} {k + 1:02d}.wav", fn(NOTE(m), rng)); n += 1
    return n


# ---------- the bed ----------
BPM, BARS = 70, 56                                       # 56 bars at 70 bpm = 192 s: covers a 3-minute Short without a loop
BEAT = 60 / BPM
# I - iii - IV - V in F (Fmaj7, Am7, Bbmaj7, Csus->C), two bars each: warm, wondering, never resolving hard
CHORDS = [(41, [57, 60, 64, 65]), (45, [57, 60, 64, 67]), (46, [58, 62, 65, 69]), (48, [60, 65, 67, 72])]


def pad(freqs, dur, rng):
    """A soft pad: each note three slightly detuned voices of a few harmonics, slow in, slow out, rolled off high."""
    t = _t(dur)
    env = np.minimum(1, t / 1.6) * np.minimum(1, (dur - t) / 1.4).clip(0)
    y = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.0045):
            ph = rng.random() * 6.28
            y += sum((0.68 ** (h - 1)) * np.sin(2 * np.pi * f * (1 + det) * h * t + ph * h) for h in range(1, 9))
    lfo = 1 + 0.08 * np.sin(2 * np.pi * 0.11 * t + rng.random() * 6.28)
    return y * env * lfo / len(freqs)


def air(dur, rng):
    """A soft high breath that follows the pad (bowed-string and room air): band-passed noise, slow in, slow out."""
    t = _t(dur)
    env = np.minimum(1, t / 2.0) * np.minimum(1, (dur - t) / 1.6).clip(0)
    return _bp_noise(len(t), 2500, 9000, rng) * env * (1 + 0.3 * np.sin(2 * np.pi * 0.2 * t))


def mallet(f, rng, dur=1.4):
    """A soft marimba/celesta note: partials 1 : 4 : 9.2, quick bright edge then a warm ring."""
    t = _t(dur)
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55) + 0.4 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.12)
         + 0.12 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t / 0.05))
    return y * np.minimum(1, t / 0.003)


def bass(f, dur):
    t = _t(dur)
    env = np.minimum(1, t / 0.05) * np.exp(-t / 2.5) * np.minimum(1, (dur - t) / 0.3).clip(0)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)) * env


def reverb(x, secs=2.4, mix=0.32, seed=3):
    rng = np.random.default_rng(seed)
    t = _t(secs)
    ir = _lp(rng.standard_normal(len(t)), 6000) * np.exp(-t / (secs / 6.9))
    ir /= np.sqrt((ir ** 2).sum())
    n = len(x) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)
    wet[:len(ir)] += wet[len(x):len(x) + len(ir)]        # the tail wraps to the start, so the loop point is seamless
    return (1 - mix) * x + mix * wet[:len(x)] * 0.6


def make_bed(dest):
    rng = np.random.default_rng(11)
    dur = BARS * 4 * BEAT
    out = np.zeros(int(SR * dur) + SR * 3)
    def put(sig, t, g):
        i = int(t * SR); seg = sig[:len(out) - i]; out[i:i + len(seg)] += g * seg
    # sections of 8 bars: quiet (pad only) -> builds (mallets, low end) -> full -> thins: the measured ~11 dB swells
    level = [0.3, 0.65, 1.0, 0.6, 0.35, 0.8, 1.0]
    for bar in range(0, BARS, 2):
        root, chord = CHORDS[(bar // 2) % 4]
        t0 = bar * 4 * BEAT; sec = level[(bar // 8) % len(level)]
        put(pad([NOTE(n) for n in chord], 8 * BEAT + 1.4, rng), t0, 0.16 * (0.6 + 0.4 * sec))
        put(air(8 * BEAT + 1.4, rng), t0, 0.016 * (0.5 + 0.5 * sec))
        if sec >= 0.6:
            put(bass(NOTE(root), 8 * BEAT), t0, 1.1 * sec)
        if sec >= 0.45:                                    # mallets walk the chord on eighths, with rests
            for k in range(16):
                if (k % 4 == 3 and rng.random() < 0.7) or rng.random() < 0.25 * (1 - sec):
                    continue
                n = chord[(k * 2 + bar) % 4] + 12 + (12 if (k % 8 == 6 and sec > 0.9) else 0)
                put(mallet(NOTE(n), rng), t0 + k * BEAT / 2 + 0.006 * rng.random(), (0.09 + 0.04 * rng.random()) * sec)
    out = out[:int(SR * dur)]
    out = reverb(out)
    out = out / np.abs(out).max() * 0.8
    write(dest, out)
    return dur


if __name__ == "__main__":
    print("effects:", make_sfx(HERE / "sfx_cosmic"))
    print("bed: %.0f s" % make_bed(HERE / "bed_cosmic.wav"))
