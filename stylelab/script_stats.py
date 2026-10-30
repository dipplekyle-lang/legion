"""Script structure across the reference Shorts: sentence lengths, hook length, where the turn lands, connectives."""
import json, pathlib, re, statistics as st

import lab
HERE = lab.ROOT
for f in sorted((HERE / "measure").glob("*.words.json")):
    vid = f.name.replace(".words.json", "")
    w = json.loads(f.read_text(encoding="utf-8"))
    dur = w[-1]["e"]
    text = " ".join(x["w"] for x in w)
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    lens = [len(s.split()) for s in sents]
    norm = [re.sub(r"[^a-z']", "", x["w"].lower()) for x in w]

    def at(phrase):
        p = phrase.split()
        for i in range(len(norm) - len(p) + 1):
            if norm[i:i + len(p)] == p:
                return round(w[i]["s"] / dur, 2)
        return None
    low = text.lower()
    print(f"{vid} | {len(sents)} sentences | words/sentence median {st.median(lens)} max {max(lens)} | "
          f"hook {len(sents[0].split())} words | 'you see' at {at('you see')} | 'so' {len(re.findall(r'\bso\b', low))} | "
          f"'but' {len(re.findall(r'\bbut\b', low))} | speech verbs {len(re.findall(r'\b(says?|said|tells?|told|asks?|goes)\b', low))} | "
          f"numbers {len(re.findall(r'\b(\d[\d,]*|one|two|three|five|ten|hundred|thousand|million|billion)\b', low))} | "
          f"'you'/'your' {len(re.findall(r'\byou(r)?\b', low))}")
    print("   hook:", sents[0])
    print("   end :", sents[-1])
