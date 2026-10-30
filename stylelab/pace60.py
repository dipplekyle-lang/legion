"""Animation pace against the voice, at 60 fps (feeds SPEC: pacing). Per reference: cuts, motion onsets inside shots, words.
How long shots last, where cuts sit against words and sentence ends, how soon the first thing moves after a cut, how many
separate motions a shot has, whether a motion leads or trails the word that names it, and how long a shot holds still
before its cut. usage: set STYLELAB=<style folder>; python stylelab/pace60.py"""
import json, os, pathlib, subprocess
import numpy as np

S = pathlib.Path(os.environ.get("STYLELAB", "."))
W, H = 135, 240


def energy(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True).stdout
    x = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
    d = np.abs(np.diff(x, axis=0))
    return d.mean((1, 2)), (d > 12).mean((1, 2))


def main():
    rows, allv = [], {k: [] for k in ("shot", "cut_to_word", "cut_after_sentence", "first_move", "moves_per_s", "lead",
                                      "still_before_cut", "words_per_shot", "gap_between_moves")}
    for p in sorted((S / "refs2").glob("*.mp4")):
        wf = S / "deep6" / f"{p.stem}.words.json"
        if not wf.exists():
            continue
        words = json.loads(wf.read_text(encoding="utf-8"))
        ws = np.array([w[0] for w in words]); ends = [w[1] for w, n in zip(words, words[1:] + [[1e9, 0, ""]]) if w[2][-1:] in ".?!"]
        m, area = energy(p)
        n = len(m); fps = 60
        cut = np.flatnonzero(m > 25) + 1
        cuts = [0] + [int(c) for k, c in enumerate(cut) if k == 0 or c - cut[k - 1] > 6] + [n]
        cuts = sorted(set(cuts))
        moving = area > 0.004
        for a, b in zip(cuts, cuts[1:]):
            if b - a < 12:
                continue
            seg = moving[a + 2:b - 1]
            on = [a + 2 + i for i in range(1, len(seg)) if seg[i] and not seg[max(0, i - 8):i].any()]
            if seg[:1].any():
                on = [a + 2] + on
            t0, t1 = a / fps, b / fps
            allv["shot"].append(t1 - t0)
            if a > 0:
                allv["cut_to_word"].append(float(ws[np.argmin(np.abs(ws - t0))] - t0))
                allv["cut_after_sentence"].append(min((t0 - e for e in ends if e <= t0 + 0.05), default=9))
            if on:
                allv["first_move"].append((on[0] - a) / fps)
                allv["moves_per_s"].append(len(on) / max(0.3, t1 - t0))
                allv["gap_between_moves"] += list(np.diff(on) / fps)
                for o in on[1:]:
                    to = o / fps
                    allv["lead"].append(float(to - ws[np.argmin(np.abs(ws - to))]))
            last = np.flatnonzero(seg)
            allv["still_before_cut"].append((len(seg) - 1 - last[-1]) / fps if len(last) else (b - a) / fps)
            allv["words_per_shot"].append(int(((ws >= t0) & (ws < t1)).sum()))
        rows.append({"vid": p.stem, "dur": round(n / fps, 1), "shots": len(cuts) - 1, "words": len(words)})
    pc = lambda v: [round(float(np.percentile(v, q)), 2) for q in (10, 25, 50, 75, 90)] if len(v) else []
    summ = {k: pc(np.array(v, float)) for k, v in allv.items()}
    summ["cut_on_sentence_share"] = round(float(np.mean(np.array(allv["cut_after_sentence"]) < 0.8)), 2)
    summ["lead_share_before_word"] = round(float(np.mean(np.array(allv["lead"]) < 0)), 2)
    out = {"refs": rows, "summary": summ}
    (S / "deep6" / "pace60.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    for k, v in summ.items():
        print(f"{k:22s} {v}")


if __name__ == "__main__":
    main()
