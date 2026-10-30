"""The hooks: measure the first seconds of every video, build strip images (first 4 s at 4 fps, one row per video, 8 rows
per strip so a 100-video channel study still gives readable pictures), and ask Legion's brain to analyse each hook, then
the rules they share. -> hooks/hooks.json, hooks/hooks_strip_NN.jpg, hooks/analysis.json"""
import json, os, pathlib, subprocess, sys
import cv2
import numpy as np

import lab
HERE = lab.ROOT
OUT = HERE / "hooks"; OUT.mkdir(exist_ok=True)
VIDS = lab.IDS
shots = json.loads((HERE / "scenes" / "shots.json").read_text(encoding="utf-8"))
why = json.loads((HERE / "why" / "data.json").read_text(encoding="utf-8"))
rows, meas_all, used = [], {}, []
for vid in VIDS:
    if vid not in why or not why[vid].get("sentences") or not any(s["vid"] == vid for s in shots) or not (HERE / "measure" / f"{vid}.json").exists():
        continue                                                     # a reference an earlier tool could not read: left out, not fatal
    meas = json.loads((HERE / "measure" / f"{vid}.json").read_text(encoding="utf-8"))
    words = json.loads((HERE / "measure" / f"{vid}.words.json").read_text(encoding="utf-8"))
    motion = np.load(HERE / "measure" / f"{vid}.motion.npy")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-t", "4", "-i", str(HERE / "refs" / f"{vid}.mp4"), "-vf", "fps=4,scale=135:240",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 240, 135, 3)[:16]
    tiles = []
    for i, f in enumerate(fr):
        t = f.copy(); cv2.putText(t, f"{i / 4:.2f}", (3, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1); tiles.append(t)
    while len(tiles) < 16:
        tiles.append(np.zeros((240, 135, 3), np.uint8))              # a video shorter than 4 s: the row is padded
    rows.append(np.hstack(tiles)); used.append(vid)
    s1 = why[vid]["sentences"][0]
    sv = [s for s in shots if s["vid"] == vid]
    meas_all[vid] = {
        "first_sentence_words": len(s1["text"].split()), "first_sentence_seconds": round(s1["e"] - s1["s"], 2),
        "words_first_3s": sum(1 for w in words if w["s"] < 3), "camera_moves_first_3s": sum(1 for a, b, _ in meas["camera_transitions"] if a < 3),
        "motion_first_3s_vs_video": round(float(motion[:90].mean() / motion.mean()), 2),
        "first_shot_density_vs_video": round(sv[0]["density"] / max(1e-6, np.mean([s["density"] for s in sv])), 2),
        "first_shot_seconds": sv[0]["dur"], "text": s1["text"]}
BATCH = 8
strips = []
for k in range(0, len(rows), BATCH):
    f = OUT / f"hooks_strip_{k // BATCH + 1:02d}.jpg"; cv2.imwrite(str(f), np.vstack(rows[k:k + BATCH])); strips.append((f, used[k:k + BATCH]))
if strips:
    cv2.imwrite(str(OUT / "hooks_strip.jpg"), cv2.imread(str(strips[0][0])))    # the first strip under the old name, for older notes
(OUT / "hooks.json").write_text(json.dumps(meas_all, indent=1), encoding="utf-8")
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "text"} for k, v in meas_all.items()}, indent=1))

LEGION = lab.LEGION
sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
import app                                                           # noqa: E402
def ask(strip, vids):
    lines = "\n".join(f"Row {i + 1} ({vid}): first sentence: \"{meas_all[vid]['text']}\"" for i, vid in enumerate(vids))
    prompt = f"""The image shows the first 4 seconds (4 frames per second, left to right, timestamps on each tile) of {len(vids)}
YouTube Shorts in one style, one row per video. Their narration starts at 0.0 s with these first sentences:
{lines}

For EACH row analyse the hook as a Shorts director would:
- "first_frame": what is literally on screen at 0.0 s and why that frame was chosen
- "strange_element": the one strange, tempting or wrong thing that creates curiosity
- "understood_by_s": by which second a viewer understands the premise (from the frames + words)
- "picture_vs_words": how the picture and the first words work together (does the camera show each noun as it's said?)
- "open_question": the question the viewer now needs answered (why they stay)
- "camera_in_hook": how the camera behaves in these 4 s and why
- "type": one of "strange act in progress", "impossible claim", "forbidden deal", "counter-intuitive claim", "mystery object", "other: <name>"
- "template": the hook as a reusable sentence pattern with blanks (never the video's own words, e.g. "A [person] did [strange act] to/for [thing]")
- "why_it_works": 1-2 sentences
Return ONLY JSON: {{"hooks": [{{"row": 1, ...}}, ...]}}"""
    got = app.claude_json(prompt, images=[strip], want=dict) or {}
    out = []
    for h in got.get("hooks") or []:
        r = h.get("row")
        if isinstance(r, int) and 1 <= r <= len(vids):
            out.append({**h, "vid": vids[r - 1]})
    return out


hooks = []
for strip, vids in strips:
    try:
        hooks += ask(strip, vids)
    except Exception as e:                                           # one strip the brain could not read: the others still count
        print("strip failed:", strip.name, str(e)[:200], file=sys.stderr)
types = {}
for h in hooks:
    types[h.get("type", "?")] = types.get(h.get("type", "?"), 0) + 1
brief = [{k: h.get(k) for k in ("type", "template", "strange_element", "picture_vs_words", "camera_in_hook", "understood_by_s")} for h in hooks]
rules = app.claude_json(f"These are hook analyses of {len(hooks)} Shorts in one style (JSON):\n{json.dumps(brief)[:60000]}\n\n"
                        "Write 5-8 rules that nearly ALL of these hooks follow, each with the share of hooks that follows it. "
                        'Return ONLY JSON: {"common_rules": ["..."]}', want=dict) if hooks else {}
got = {"hooks": hooks, "types": types, "common_rules": (rules or {}).get("common_rules", []), "videos": len(used)}
(OUT / "analysis.json").write_text(json.dumps(got, indent=1), encoding="utf-8")
print(json.dumps(got, indent=1)[:6000])
if not hooks:
    sys.exit("no hook could be analysed")
