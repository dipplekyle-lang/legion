"""The deep WHY: for each shot, WHY things move, WHY the place, the colour and the camera are what they are, tied to the words spoken.
Per shot: frames at the start, at its two biggest motion peaks and at the end, plus a heat map of everything that moved, next to the
words of that shot (with the word under each motion peak). Legion's brain names the reason for each move, the place, the colour, the
camera and every element in a fixed vocabulary, and writes the causal rule the shot follows; --agg counts the reasons.

usage: STYLELAB=<style folder>/all py -3.12 stylelab/why_deep.py --panels [N_REFS] [SHOTS_PER_REF]   panels into why2/panels
       STYLELAB=... py -3.12 stylelab/why_deep.py --name                                             why2/named/<shot>.json (4 at a time)
       STYLELAB=... py -3.12 stylelab/why_deep.py --agg                                              why2/why.json + printed shares
Needs refs60h/<id>.mp4 (or refs60/), shots.json ({id: {shots: [{a, b, words}]}}) and words/<id>.json ([{w, t, e}]).
"""
import json
import os
import pathlib
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

LEGION = pathlib.Path(__file__).resolve().parent.parent
ROOT = pathlib.Path(os.environ.get("STYLELAB") or ".").resolve()
OUT = ROOT / "why2"
PW, PH = 216, 384

WHY_MOVE = ["acts-the-word", "shows-the-mechanism", "stresses-a-key-word-or-number", "points-to-what-comes-next", "keeps-it-alive",
            "joke-beat", "changes-the-idea", "shows-scale-or-context", "shows-a-feeling"]
WHY_PLACE = ["where-it-happens", "metaphor-for-the-idea", "home-base-of-the-character", "inside-the-body-or-object",
             "abstract-field-for-a-number-or-idea", "contrast-with-the-last-shot"]
WHY_COLOUR = ["mood-of-the-line", "time-of-day", "danger-or-warning", "the-subject's-real-colour", "contrast-with-the-last-shot",
              "the-channel's-palette"]
WHY_CAMERA = ["hold-for-reading", "build-tension", "reveal-context", "follow-the-action", "emphasis", "link-to-next"]
JOBS = ["inform", "place", "joke", "dressing", "depth", "guide-the-eye", "character"]

PROMPT = """Each image is ONE SHOT of a 2D flat vector explainer Short (a famous science channel's style), {n} shots. Each image has 5 panels
left to right: the shot's FIRST frame, the frame at motion peak 1, the frame at motion peak 2, the LAST frame, and a HEAT MAP (magenta =
everything that moved during the shot, over a dimmed middle frame; ignore the white caption words, they are added later). Under each shot below: the words spoken DURING the shot (seconds from
the shot's start), the word under each motion peak, and the words of the shot before (context).

{shots}

For EVERY shot, explain WHY the animators made each choice. Tie every answer to the words where you can. Vocabulary (use exactly):
- moves (every thing that visibly moves or changes, biggest first, at most 6): "why" one of [{wm}]
- place: "why" one of [{wp}]
- colour (the dominant colour / light of the shot): "why" one of [{wc}]
- camera: "what" one of [still, push-in, pull-out, pan, tilt, shake, zoom-through, cut-in], "why" one of [{wk}]
- elements (every separate thing in the frame, at most 10): "job" one of [{jb}]
Return ONLY JSON: {{"shots": [{{"label": "...", "moves": [{{"what": "", "how": "a verb or two", "word": "the word it lands on, or null",
"why": "", "because": "a few words"}}], "place": {{"what": "", "why": "", "because": ""}}, "colour": {{"what": "", "why": "",
"because": ""}}, "camera": {{"what": "", "why": "", "because": ""}}, "elements": [{{"what": "", "job": ""}}], "still_share": 0.0,
"rule": "ONE sentence: the cause-and-effect rule this shot follows, general enough to reuse (e.g. 'when the line names a number,
the number arrives on that word while the scene behind holds still so it can be read')"}}]}}
still_share = your estimate of how much of the frame stays still through the shot (0-1)."""


def frames(vid, a, b, step=6):
    cap = cv2.VideoCapture(str(ROOT / "refs60h" / f"{vid}.mp4"))
    if not cap.isOpened():
        cap = cv2.VideoCapture(str(ROOT / "refs60" / f"{vid}.mp4"))
    cap.set(cv2.CAP_PROP_POS_MSEC, a * 1000)
    fps = cap.get(cv2.CAP_PROP_FPS) or 60
    out, k, t = [], 0, a
    while t < b:
        ok, f = cap.read()
        if not ok:
            break
        if k % step == 0:
            out.append((t, cv2.resize(f, (PW, PH), interpolation=cv2.INTER_AREA)))
        k += 1; t = a + k / fps
    cap.release()
    return out


def word_at(words, t):
    inside = [w for w in words if w["t"] - 0.05 <= t <= w["e"] + 0.05]
    if inside:
        return inside[0]["w"]
    near = min(words, key=lambda w: min(abs(w["t"] - t), abs(w["e"] - t)), default=None)
    return near["w"] if near and min(abs(near["t"] - t), abs(near["e"] - t)) < 0.4 else None


def panels(n_refs=36, per=6):
    (OUT / "panels").mkdir(parents=True, exist_ok=True)
    shots = json.loads((ROOT / "shots.json").read_text(encoding="utf-8"))
    ids = sorted(p.stem for p in (ROOT / "refs60h").glob("*.mp4"))
    ids = ids[::max(1, len(ids) // n_refs)][:n_refs]
    made = 0
    for vid in ids:
        S = [s for s in shots.get(vid, {}).get("shots", []) if s["b"] - s["a"] >= 1.6]
        wf = ROOT / "words" / f"{vid}.json"
        if not S or not wf.exists():
            continue
        W = json.loads(wf.read_text(encoding="utf-8"))
        pick = [S[round(i * (len(S) - 1) / max(1, per - 1))] for i in range(min(per, len(S)))]
        allS = shots[vid]["shots"]
        for s in dict((id(x), x) for x in pick).values():
            name = f"{vid}_{s['k']:02d}"
            if (OUT / "panels" / f"{name}.json").exists():
                continue
            fr = frames(vid, s["a"] + 0.05, s["b"] - 0.05)
            if len(fr) < 6:
                continue
            band = np.ones((PH, PW), bool); band[int(0.70 * PH):int(0.84 * PH)] = False
            G = [cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (5, 5), 0).astype(np.float32) for _, f in fr]
            E = [0.0] + [float((np.abs(G[i] - G[i - 1]) > 14)[band].mean()) for i in range(1, len(G))]
            heat = np.zeros((PH, PW), np.float32)
            for i in range(1, len(G)):
                heat += (np.abs(G[i] - G[i - 1]) > 14)
            order = sorted(range(2, len(E) - 1), key=lambda i: -E[i])
            peaks = []
            for i in order:
                if all(abs(fr[i][0] - fr[j][0]) > 0.4 for j in peaks):
                    peaks.append(i)
                if len(peaks) == 2:
                    break
            while len(peaks) < 2:
                peaks.append(len(fr) // 2)
            peaks.sort()
            mid = fr[len(fr) // 2][1].astype(np.float32) * 0.45
            hm = np.clip(heat / max(1, np.percentile(heat, 99)), 0, 1)[..., None]
            ov = (mid * (1 - hm) + np.array([255, 0, 255], np.float32) * hm).astype(np.uint8)
            row = [fr[0][1], fr[peaks[0]][1], fr[peaks[1]][1], fr[-1][1], ov]
            img = np.hstack([np.pad(p, ((0, 0), (2, 2), (0, 0)), constant_values=255) for p in row])
            cv2.imwrite(str(OUT / "panels" / f"{name}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 88])
            sw = [w for w in W if s["a"] - 0.05 <= w["t"] < s["b"]]
            prev = [x for x in allS if x["k"] == s["k"] - 1]
            meta = {"vid": vid, "k": s["k"], "a": s["a"], "b": s["b"], "n_shots": len(allS),
                    "words": " ".join(f"{w['w']}({w['t'] - s['a']:.1f})" for w in sw),
                    "peaks": [{"t": round(fr[i][0] - s["a"], 2), "word": word_at(W, fr[i][0]), "moving": round(E[i], 3)} for i in peaks],
                    "moving_mean": round(float(np.mean(E[1:])), 3), "prev": (prev[0].get("words") or "")[-160:] if prev else ""}
            (OUT / "panels" / f"{name}.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
            made += 1
        print(vid, "ok", flush=True)
    print("panels made:", made)


def name():
    sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
    import app  # noqa: E402
    (OUT / "named").mkdir(exist_ok=True)
    todo = [p for p in sorted((OUT / "panels").glob("*.jpg")) if not (OUT / "named" / f"{p.stem}.json").exists()]
    batches = [todo[k:k + 4] for k in range(0, len(todo), 4)]
    print(f"{len(todo)} shots in {len(batches)} calls", flush=True)

    def one(b):
        labels = [p.stem for p in b]
        txt = []
        for i, p in enumerate(b):
            m = json.loads(p.with_suffix(".json").read_text(encoding="utf-8"))
            pk = "; ".join(f"peak {j + 1} at {x['t']} s on '{x['word']}'" for j, x in enumerate(m["peaks"]))
            txt.append(f"Shot {i + 1} (label {p.stem}, shot {m['k'] + 1} of {m['n_shots']}, {m['b'] - m['a']:.1f} s): words: {m['words']}\n"
                       f"  motion: {pk}; before this shot: \"{m['prev']}\"")
        prompt = PROMPT.format(n=len(b), shots="\n".join(txt), wm=", ".join(WHY_MOVE), wp=", ".join(WHY_PLACE), wc=", ".join(WHY_COLOUR),
                               wk=", ".join(WHY_CAMERA), jb=", ".join(JOBS))
        err = ""
        for _ in range(2):
            try:
                got = app.claude_json(prompt, images=[str(p) for p in b], want=dict)
                for i, s in enumerate((got.get("shots") or [])[:len(b)]):
                    lab = s.get("label") if s.get("label") in labels else labels[i]
                    (OUT / "named" / f"{lab}.json").write_text(json.dumps(s, indent=1, ensure_ascii=False), encoding="utf-8")
                return f"{labels[0]}.. ok"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:120]
        return f"{labels[0]}.. FAILED {err}"
    with ThreadPoolExecutor(4) as ex:
        for k, r in enumerate(ex.map(one, batches)):
            print(f"[{k + 1}/{len(batches)}] {r}", flush=True)


def agg():
    rows = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in sorted((OUT / "named").glob("*.json"))}
    metas = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in (OUT / "panels").glob("*.json")}
    share = lambda c: {k: round(v / max(1, sum(c.values())), 3) for k, v in c.most_common()}
    mv, pl, co, ca, cw, jb = Counter(), Counter(), Counter(), Counter(), Counter(), Counter()
    on_word, moves_n, still = 0, 0, []
    by_move = {}
    for k, r in rows.items():
        for m in r.get("moves") or []:
            w = m.get("why") if m.get("why") in WHY_MOVE else "other"; mv[w] += 1; moves_n += 1
            on_word += bool(m.get("word")); by_move.setdefault(w, []).append(f"{m.get('what')} {m.get('how')} ({m.get('because')})")
        pl[(r.get("place") or {}).get("why", "other")] += 1; co[(r.get("colour") or {}).get("why", "other")] += 1
        ca[(r.get("camera") or {}).get("why", "other")] += 1; cw[(r.get("camera") or {}).get("what", "other")] += 1
        for e in r.get("elements") or []:
            jb[e.get("job", "other")] += 1
        if isinstance(r.get("still_share"), (int, float)):
            still.append(float(r["still_share"]))
    out = {"shots": len(rows), "moves": moves_n, "moves_per_shot": round(moves_n / max(1, len(rows)), 2), "moves_on_a_word": round(on_word / max(1, moves_n), 3),
           "why_move": share(mv), "why_place": share(pl), "why_colour": share(co), "camera": share(cw), "why_camera": share(ca), "element_jobs": share(jb),
           "still_share_median": round(float(np.median(still)), 2) if still else None,
           "examples": {k: v[:12] for k, v in by_move.items()}, "rules": [r.get("rule") for r in rows.values() if r.get("rule")]}
    (OUT / "why.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    for k in ("shots", "moves", "moves_per_shot", "moves_on_a_word", "still_share_median"):
        print(k, out[k])
    for k in ("why_move", "why_place", "why_colour", "camera", "why_camera", "element_jobs"):
        print(k, json.dumps(out[k]))


if __name__ == "__main__":
    if sys.argv[1:2] == ["--panels"]:
        panels(*(int(x) for x in sys.argv[2:4]))
    elif sys.argv[1:2] == ["--name"]:
        name()
    elif sys.argv[1:2] == ["--agg"]:
        agg()
    else:
        print(__doc__)
