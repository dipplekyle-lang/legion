"""Legion's text brain labels each sentence's story role and emotion, WITHOUT seeing any colour data; then the light,
colour and motion measured on those sentences are averaged per label (why/labels.json, why/by_label.json)."""
import json, os, pathlib, sys
import numpy as np

import lab
HERE = lab.ROOT
LEGION = lab.LEGION
sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
import app                                                            # noqa: E402  (Legion's claude_json)

data = json.loads((HERE / "why" / "data.json").read_text(encoding="utf-8"))
LABELS = ["hook", "temptation", "scheme/secret", "hope/excitement", "fantasy", "waiting/tension", "consequence/shock",
          "explanation", "punchline", "comedy beat"]
rows, ids = [], []
for vid, d in data.items():
    for i, s in enumerate(d["sentences"]):
        ids.append((vid, i)); rows.append(f"{len(rows)}. [{vid}] {s['text']}")
HEAD = ("These are the sentences of a few short videos, in order (each line: number, [video id], sentence).\n"
          "Label each sentence's story role / emotion with exactly one of: " + ", ".join(LABELS) + ".\n"
          "hook = the opening strange act or claim; temptation = wanting / greed; scheme/secret = plotting, hiding, doing something "
          "sneaky; hope/excitement = expecting a good outcome; fantasy = imagining, dreaming; waiting/tension = time passing, "
          "suspense; consequence/shock = it goes wrong, the trap closes, disaster; explanation = the real-world mechanism or "
          "fact; punchline = the final reveal line; comedy beat = a joke or ironic aside.\n"
          "Also rate the emotional valence for the character from -2 (very bad) to +2 (very good).\n\n")
TAIL = '\n\nReturn ONLY JSON: [{"n": number, "label": "...", "valence": -2..2}, ...] covering every number.'
# a few hundred sentences per call: a whole channel's worth in one call runs past the brain's time limit
got, B = [], 250
for a in range(0, len(rows), B):
    got += app.claude_json(HEAD + "\n".join(rows[a:a + B]) + TAIL, want=list)
lab = {int(x["n"]): x for x in got if isinstance(x, dict) and "n" in x}
(HERE / "why" / "labels.json").write_text(json.dumps(got, indent=1), encoding="utf-8")
by = {}
val_pairs = []
for n, (vid, i) in enumerate(ids):
    s = data[vid]["sentences"][i]
    if n not in lab or "bright" not in s:
        continue
    L = lab[n]["label"]
    by.setdefault(L, []).append(s)
    val_pairs.append((float(lab[n].get("valence", 0)), s["bright"], s["warm"], s["sat"], s["motion"]))
summary = {}
for L, ss in sorted(by.items(), key=lambda kv: -len(kv[1])):
    summary[L] = {"n": len(ss), **{k: round(float(np.mean([s[k] for s in ss])), 3) for k in ("bright", "warm", "sat", "motion", "pos")},
                  "moves_per_sentence": round(float(np.mean([s["moves"] for s in ss])), 2)}
v = np.array(val_pairs)
corr = {k: round(float(np.corrcoef(v[:, 0], v[:, j])[0, 1]), 2) for j, k in [(1, "bright"), (2, "warm"), (3, "sat"), (4, "motion")]}
(HERE / "why" / "by_label.json").write_text(json.dumps({"by_label": summary, "valence_correlation": corr, "n": len(v)}, indent=1), encoding="utf-8")
print(json.dumps({"by_label": summary, "valence_correlation": corr, "n": len(v)}, indent=1))
