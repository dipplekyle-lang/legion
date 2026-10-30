"""WHERE things sit: a placement inventory of a style's frames (feeds the SPEC's composition / depth / assets sections).

Each sampled frame gets a faint labelled 10 % grid, and Legion's brain lists every element with a box in % of the frame, its
role (hero, cast, device, text, prop, dressing, edge-shape, sky-thing, backdrop), its plane (far / mid / near), the edges
that cut it, what it partly covers and, for devices and text, what it explains and how it is tied to it. Frame-level: the
horizon, the floor line, the camera, the focus, the balance. Resume-safe, 4 calls at a time, 6 frames per call.
Then `--agg` turns it into numbers (placement.json + a printed summary).

usage: set STYLELAB=output\\short_styles\\<style>   (needs all/t/<vid>_<n>.jpg and, for labels, all/vision/<vid>.json)
       py -3.12 stylelab/placement_vision.py [--every 7] [--max 600]      the vision pass -> all/placement/<vid>_<n>.json
       py -3.12 stylelab/placement_vision.py --agg                        the numbers -> all/placement.json
       py -3.12 stylelab/placement_vision.py --show <vid>_<n>             draws the boxes on that frame (check the pass by eye)
"""
import glob
import json
import os
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

ROOT = pathlib.Path(os.environ.get("STYLELAB", "."))
ALL = ROOT / "all"
OUT = ALL / "placement"
LEGION = pathlib.Path(__file__).resolve().parent.parent

PROMPT = """These {n} images are frames of short vertical 2D vector explainer animations (flat shapes, no outlines). Each frame has
a faint grid every 10 % with labels (0-100 across, 0-100 down) so you can read positions. Frame labels: {labels}.
Context for each frame (the setting and the shot's job, from an earlier pass): {ctx}

For EVERY frame list the elements that are drawn, biggest and most important first, at most 14. Group repeated things (a row of
umbrellas, a crowd, a starfield) into ONE element with a "count". For each element:
- "what": a short noun phrase ("the Moon", "palm tree", "gauge", "title text", "row of corals", "audience heads")
- "role": one of hero (THE main subject the sentence is about; at most one, or none), cast (other characters with faces),
  device (an explainer graphic: gauge, number plate, counter, zoom bubble, chart, arrow, map pin, checklist, speech bubble),
  text (title lockup, label tag, sign, number), prop (an object that matters to the sentence), dressing (things that fill the
  place: trees, rows, rocks, furniture, crowds), edge-shape (a big near shape cut by the frame edge, there for depth),
  sky-thing (clouds, stars, sun, distant planets, birds in the sky), backdrop (far hills, skyline, far landscape, a wall)
- "plane": far, mid or near (near = in front of the hero's plane, toward the viewer)
- "box": [x0, y0, x1, y1] in % of the frame width and height (read the grid; may go below 0 or above 100 when cut)
- "cut": the frame edges that cut it: any of ["top", "bottom", "left", "right"], or []
- "covers": the numbers (0-based, in this frame's list) of elements it partly covers, or []
- "about": for device / text: the number of the element it explains or labels, or null
- "tie": for device / text: how it is tied to that element: one of leader-line, arrow, touching, beside, inside, none
- "count": how many when grouped, else 1
Per frame also: "horizon": the % height of a horizon or ground line if there is one, else null; "camera": one of eye-level,
low-angle, high-angle, top-down, cross-section, flat-front, space; "focus": the number of the element the eye goes to first;
"balance": one of centre, left, right, diagonal, split.
Ignore the grid itself and any burnt-in subtitle words. Return ONLY JSON:
{{"frames": [{{"label": "...", "elements": [{{"what": "...", "role": "...", "plane": "...", "box": [0, 0, 0, 0], "cut": [],
"covers": [], "about": null, "tie": "none", "count": 1}}], "horizon": null, "camera": "...", "focus": 0, "balance": "..."}}]}}"""


def gridded(src, dst):
    im = cv2.resize(cv2.imread(str(src)), (540, 960), interpolation=cv2.INTER_AREA)
    ov = im.copy()
    for k in range(1, 10):
        x, y = k * 54, k * 96
        cv2.line(ov, (x, 0), (x, 959), (255, 255, 255), 1); cv2.line(ov, (0, y), (539, y), (255, 255, 255), 1)
    im = cv2.addWeighted(ov, 0.35, im, 0.65, 0)
    for k in range(1, 10):
        for (px, py) in ((k * 54 + 2, 12), (2, k * 96 - 3)):
            cv2.putText(im, str(k * 10), (px, py), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 3, cv2.LINE_AA)
            cv2.putText(im, str(k * 10), (px, py), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(str(dst), im, [cv2.IMWRITE_JPEG_QUALITY, 88])


def sample(every, most):
    picks = []
    for vid in sorted({pathlib.Path(f).stem.rsplit("_", 1)[0] for f in glob.glob(str(ALL / "t" / "*_*.jpg"))}):
        n = len(glob.glob(str(ALL / "t" / f"{vid}_*.jpg")))
        k = max(2, round(n / every))
        idx = sorted({1} | {1 + round(i * (n - 1) / max(1, k - 1)) for i in range(k)})   # the hook frame always
        picks += [(vid, i) for i in idx]
    return picks[:most]


def ctx_of(vid, i):
    try:
        s = json.loads((ALL / "vision" / f"{vid}.json").read_text(encoding="utf-8"))["shots"][i - 1]
        return f"{s.get('setting', '?')}, job {s.get('job', '?')}"
    except (OSError, ValueError, IndexError, KeyError):
        return "?"


def run(every, most):
    sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
    import app  # noqa: E402  Legion's brain (Claude Code), free
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "grid").mkdir(exist_ok=True)
    todo = [(v, i) for v, i in sample(every, most) if not (OUT / f"{v}_{i:03d}.json").exists()]
    batches = [todo[k:k + 6] for k in range(0, len(todo), 6)]
    print(f"{len(todo)} frames to read in {len(batches)} calls", flush=True)

    def one(batch):
        imgs, labels, ctx = [], [], []
        for v, i in batch:
            g = OUT / "grid" / f"{v}_{i:03d}.jpg"
            gridded(ALL / "t" / f"{v}_{i:03d}.jpg", g)
            imgs.append(str(g)); labels.append(f"{v}_{i:03d}"); ctx.append(f"{v}_{i:03d}: {ctx_of(v, i)}")
        for attempt in range(2):
            try:
                got = app.claude_json(PROMPT.format(n=len(batch), labels=", ".join(f"image {k + 1} = {l}" for k, l in enumerate(labels)),
                                                    ctx="; ".join(ctx)), images=imgs, want=dict)
                frames = got.get("frames") or []
                for k, fr in enumerate(frames[:len(batch)]):
                    lab = fr.get("label") if fr.get("label") in labels else labels[k]
                    (OUT / f"{lab}.json").write_text(json.dumps(fr, indent=1), encoding="utf-8")
                return f"{labels[0]}.. {len(frames)} frames"
            except Exception as e:  # noqa: BLE001
                err = str(e)[:160]
        return f"{labels[0]}.. FAILED {err}"
    with ThreadPoolExecutor(4) as ex:
        for k, r in enumerate(ex.map(one, batches)):
            print(f"[{k + 1}/{len(batches)}] {r}", flush=True)
    print("PLACEMENT DONE", flush=True)


def show(label):
    fr = json.loads((OUT / f"{label}.json").read_text(encoding="utf-8"))
    im = cv2.resize(cv2.imread(str(ALL / "t" / f"{label}.jpg")), (540, 960))
    col = {"hero": (0, 0, 255), "cast": (255, 0, 255), "device": (0, 200, 255), "text": (0, 255, 0), "edge-shape": (255, 128, 0)}
    for k, e in enumerate(fr.get("elements") or []):
        x0, y0, x1, y1 = [int(v * (540 if j % 2 == 0 else 960) / 100) for j, v in enumerate(e["box"])]
        c = col.get(e.get("role"), (200, 200, 200))
        cv2.rectangle(im, (x0, y0), (x1, y1), c, 2)
        cv2.putText(im, f"{k}:{e['what'][:18]} ({e.get('plane', '')[0:1]})", (max(2, x0 + 3), max(12, y0 + 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, c, 1, cv2.LINE_AA)
    if fr.get("horizon") is not None:
        y = int(float(fr["horizon"]) * 9.6); cv2.line(im, (0, y), (539, y), (255, 255, 0), 1)
    dst = OUT / f"show_{label}.jpg"
    cv2.imwrite(str(dst), im)
    print(dst)


def agg():
    rows = []
    for f in sorted(OUT.glob("*_*.json")):
        try:
            fr = json.loads(f.read_text(encoding="utf-8"))
        except ValueError:
            continue
        vid, i = f.stem.rsplit("_", 1)
        try:
            s = json.loads((ALL / "vision" / f"{vid}.json").read_text(encoding="utf-8"))["shots"][int(i) - 1]
        except (OSError, ValueError, IndexError, KeyError):
            s = {}
        fr.update(vid=vid, i=int(i), setting=s.get("setting", "?"), job=s.get("job", "?"), light=s.get("light", "?"))
        rows.append(fr)
    print(f"{len(rows)} frames")
    P = lambda a, q: float(np.percentile(a, q)) if len(a) else None
    out = {"frames": len(rows)}

    def box(e):
        b = e.get("box") or [0, 0, 0, 0]
        x0, y0, x1, y1 = [float(v) for v in b[:4]]
        return min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)

    def vis_area(b):          # the share of the frame it fills (only the part inside the frame)
        x0, y0, x1, y1 = b
        return max(0, min(100, x1) - max(0, x0)) * max(0, min(100, y1) - max(0, y0)) / 100.0

    # heroes
    H = []
    for r in rows:
        for e in r.get("elements") or []:
            if e.get("role") == "hero":
                b = box(e); H.append({"area": vis_area(b), "cx": (b[0] + b[2]) / 2, "cy": (b[1] + b[3]) / 2, "w": b[2] - b[0],
                                      "cut": e.get("cut") or [], "plane": e.get("plane"), "job": r["job"], "setting": r["setting"]})
                break
    out["hero_share"] = len(H) / max(1, len(rows))
    out["hero"] = {"area_p25_50_75": [P([h["area"] for h in H], q) for q in (25, 50, 75)],
                   "width_p25_50_75": [P([h["w"] for h in H], q) for q in (25, 50, 75)],
                   "cx_p25_50_75": [P([h["cx"] for h in H], q) for q in (25, 50, 75)],
                   "cy_p25_50_75": [P([h["cy"] for h in H], q) for q in (25, 50, 75)],
                   "cut_share": sum(1 for h in H if h["cut"]) / max(1, len(H)),
                   "cut_by": {k: sum(1 for h in H if k in h["cut"]) / max(1, len(H)) for k in ("top", "bottom", "left", "right")}}
    byjob = {}
    for h in H:
        byjob.setdefault(h["job"], []).append(h)
    out["hero_by_job"] = {j: {"n": len(v), "area_med": P([h["area"] for h in v], 50), "cy_med": P([h["cy"] for h in v], 50),
                              "cut": sum(1 for h in v if h["cut"]) / len(v)} for j, v in byjob.items() if len(v) >= 8}
    byset = {}
    for h in H:
        byset.setdefault(h["setting"], []).append(h)
    out["hero_by_setting"] = {s_: {"n": len(v), "area_med": P([h["area"] for h in v], 50), "cy_med": P([h["cy"] for h in v], 50),
                                   "cut": sum(1 for h in v if h["cut"]) / len(v)} for s_, v in byset.items() if len(v) >= 8}
    # devices and text: where they sit relative to what they explain
    D = []
    for r in rows:
        els = r.get("elements") or []
        for e in els:
            if e.get("role") in ("device", "text"):
                b = box(e); d = {"role": e["role"], "what": e.get("what", ""), "cx": (b[0] + b[2]) / 2, "cy": (b[1] + b[3]) / 2,
                                 "area": vis_area(b), "tie": e.get("tie") or "none", "cut": e.get("cut") or []}
                a = e.get("about")
                if isinstance(a, int) and 0 <= a < len(els):
                    t = box(els[a]); tw, th = t[2] - t[0], t[3] - t[1]
                    dx, dy = d["cx"] - (t[0] + t[2]) / 2, d["cy"] - (t[1] + t[3]) / 2
                    inside = t[0] <= d["cx"] <= t[2] and t[1] <= d["cy"] <= t[3]
                    d.update(rel=("inside" if inside else ("above" if dy < -abs(dx) else "below" if dy > abs(dx) else "side")),
                             ratio=d["area"] / max(0.1, vis_area(t)), gap=max(0, max(t[0] - b[2], b[0] - t[2], t[1] - b[3], b[1] - t[3])))
                D.append(d)
    for role in ("device", "text"):
        v = [d for d in D if d["role"] == role]
        rel = [d for d in v if "rel" in d]
        out[role] = {"per_frame": len(v) / max(1, len(rows)), "cy_p25_50_75": [P([d["cy"] for d in v], q) for q in (25, 50, 75)],
                     "area_med": P([d["area"] for d in v], 50),
                     "in_caption_band": sum(1 for d in v if 70 <= d["cy"] <= 84) / max(1, len(v)),
                     "tie": {k: sum(1 for d in v if d["tie"] == k) / max(1, len(v)) for k in ("leader-line", "arrow", "touching", "beside", "inside", "none")},
                     "rel_to_target": {k: sum(1 for d in rel if d["rel"] == k) / max(1, len(rel)) for k in ("above", "below", "side", "inside")},
                     "size_vs_target_med": P([d["ratio"] for d in rel], 50), "gap_med": P([d["gap"] for d in rel if d["rel"] != "inside"], 50)}
    # planes, overlaps, edge shapes, horizon, camera, balance
    planes = [len({e.get("plane") for e in r.get("elements") or []}) for r in rows]
    out["planes_per_frame"] = {k: planes.count(k) / max(1, len(planes)) for k in (1, 2, 3)}
    out["elements_per_frame_p25_50_75"] = [P([len(r.get("elements") or []) for r in rows], q) for q in (25, 50, 75)]
    out["overlaps_per_frame_med"] = P([sum(len(e.get("covers") or []) for e in r.get("elements") or []) for r in rows], 50)
    covered_hero = 0
    covered_by = {}
    for r in rows:
        els = r.get("elements") or []
        hi = next((k for k, e in enumerate(els) if e.get("role") == "hero"), None)
        if hi is None:
            continue
        for e in els:
            if hi in (e.get("covers") or []):
                covered_hero += 1; covered_by[e.get("role")] = covered_by.get(e.get("role"), 0) + 1
    out["hero_covered_share"] = covered_hero / max(1, len(H))
    out["hero_covered_by"] = {k: v / max(1, len(H)) for k, v in sorted(covered_by.items(), key=lambda kv: -kv[1])}
    E = [(r, e) for r in rows for e in r.get("elements") or [] if e.get("role") == "edge-shape"]
    out["edge_shape_share"] = len({(r["vid"], r["i"]) for r, _ in E}) / max(1, len(rows))
    out["edge_shape"] = {"cut_by": {k: sum(1 for _, e in E if k in (e.get("cut") or [])) / max(1, len(E)) for k in ("top", "bottom", "left", "right")},
                         "area_med": P([vis_area(box(e)) for _, e in E], 50)}
    hz = [float(r["horizon"]) for r in rows if isinstance(r.get("horizon"), (int, float))]
    out["horizon_share"] = len(hz) / max(1, len(rows)); out["horizon_p25_50_75"] = [P(hz, q) for q in (25, 50, 75)]
    for k in ("camera", "balance"):
        vals = [r.get(k) for r in rows]
        out[k] = {v: vals.count(v) / len(vals) for v in sorted(set(vals), key=lambda v: -vals.count(v)) if v}
    # roles by plane and where each plane sits
    R = {}
    for r in rows:
        for e in r.get("elements") or []:
            b = box(e)
            R.setdefault((e.get("role"), e.get("plane")), []).append(((b[1] + b[3]) / 2, vis_area(b), bool(e.get("cut"))))
    out["role_plane"] = {f"{k[0]}|{k[1]}": {"n": len(v), "cy_med": P([a for a, _, _ in v], 50), "area_med": P([b for _, b, _ in v], 50),
                                            "cut": sum(1 for *_, c in v if c) / len(v)} for k, v in sorted(R.items(), key=lambda kv: -len(kv[1])) if len(v) >= 15}
    # cast next to the hero
    C = []
    for r in rows:
        els = r.get("elements") or []
        hero = next((e for e in els if e.get("role") == "hero"), None)
        for e in els:
            if e.get("role") == "cast" and hero is not None:
                b, t = box(e), box(hero)
                C.append({"h": b[3] - b[1], "side": "left" if (b[0] + b[2]) / 2 < (t[0] + t[2]) / 2 else "right",
                          "overlap": max(0, min(b[2], t[2]) - max(b[0], t[0])) * max(0, min(b[3], t[3]) - max(b[1], t[1])) / max(1, (t[2] - t[0]) * (t[3] - t[1]))})
    out["cast_with_hero"] = {"n": len(C), "height_med": P([c["h"] for c in C], 50), "overlap_med": P([c["overlap"] for c in C], 50),
                             "overlap_over_10pct": sum(1 for c in C if c["overlap"] > 0.10) / max(1, len(C))}
    # what sits where, per setting (the asset atlas): the most common things and their usual plane, size and height
    A = {}
    for r in rows:
        for e in r.get("elements") or []:
            if e.get("role") in ("dressing", "edge-shape", "sky-thing", "backdrop", "prop"):
                b = box(e)
                A.setdefault(r["setting"], {}).setdefault(e.get("role"), []).append({"what": e.get("what", ""), "plane": e.get("plane"),
                                                                                     "cy": (b[1] + b[3]) / 2, "area": vis_area(b),
                                                                                     "cut": bool(e.get("cut")), "count": e.get("count") or 1})
    out["atlas"] = {}
    for s_, roles in A.items():
        n_frames = sum(1 for r in rows if r["setting"] == s_)
        if n_frames < 6:
            continue
        out["atlas"][s_] = {"frames": n_frames}
        for role, v in roles.items():
            out["atlas"][s_][role] = {"per_frame": round(len(v) / n_frames, 2), "cy_med": P([x["cy"] for x in v], 50),
                                      "area_med": P([x["area"] for x in v], 50), "cut": round(sum(1 for x in v if x["cut"]) / len(v), 2),
                                      "plane": max(("far", "mid", "near"), key=lambda p: sum(1 for x in v if x["plane"] == p)),
                                      "examples": list(dict.fromkeys(x["what"] for x in v))[:8]}
    (ALL / "placement.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in out.items() if k != "atlas"}, indent=1))
    print("atlas settings:", list(out["atlas"]))


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--agg" in a:
        agg()
    elif "--show" in a:
        show(a[a.index("--show") + 1])
    else:
        run(int(a[a.index("--every") + 1]) if "--every" in a else 7, int(a[a.index("--max") + 1]) if "--max" in a else 600)
