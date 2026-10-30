"""SPEC numbers on our stills (caption band removed): colour (135.6), edge density (busy), depth of field ratio (112).
usage: python check.py [stills dir]"""
import glob, pathlib, sys
import numpy as np
import cv2

D = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent
w, h = 540, 960
keep = np.ones((h, w), bool); keep[int(0.64 * h):int(0.77 * h), int(0.2 * w):int(0.8 * w)] = False


def colour(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32) / 255
    S, V = hsv[..., 1][keep], hsv[..., 2][keep]
    b, g, r = [bgr[..., i][keep].astype(np.float32) for i in range(3)]
    rg, yb = r - g, 0.5 * (r + g) - b
    cf = np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)
    return np.percentile(S, 90), (S > 0.7).mean(), (S < 0.15).mean(), cf, V.mean()


def edge(bgr):
    e = cv2.Canny(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY), 60, 150) > 0
    mid = keep.copy(); mid[:int(0.25 * h)] = False; mid[int(0.75 * h):] = False
    return e[keep].mean(), e[mid].mean()


def dof(bgr):
    lap = cv2.Laplacian(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32), cv2.CV_32F); v = []
    for r in range(10):
        for c in range(6):
            y0, y1, x0, x1 = r * h // 10, (r + 1) * h // 10, c * w // 6, (c + 1) * w // 6
            if 0.64 * h <= y0 < 0.77 * h and 1 <= c <= 4: continue
            v.append(float(lap[y0:y1, x0:x1].var()))
    v = np.array(v); return v.max() / max(1e-3, np.median(v))


rows = []
print(f"{'still':8} {'p90S':>5} {'S>.7':>5} {'S<.15':>5} {'colf':>5} {'meanV':>5} | {'edge':>6} {'mid':>6} | {'dof':>5}")
for f in sorted(glob.glob(str(D / "s_*.png"))):
    im = cv2.resize(cv2.imread(f), (w, h), interpolation=cv2.INTER_AREA)
    c, e, d = colour(im), edge(im), dof(im); rows.append((*c, *e, d))
    print(f"{pathlib.Path(f).stem[2:]:8} {c[0]:5.2f} {c[1]:5.2f} {c[2]:5.2f} {c[3]:5.0f} {c[4]:5.2f} | {e[0]:6.3f} {e[1]:6.3f} | {d:5.1f}")
a = np.array(rows) if rows else np.zeros((1, 8)); m = np.median(a, 0)
print(f"{'MEDIAN':8} {m[0]:5.2f} {m[1]:5.2f} {m[2]:5.2f} {m[3]:5.0f} {m[4]:5.2f} | {m[5]:6.3f} {m[6]:6.3f} | {m[7]:5.1f}")
print("targets   >=.80 >=.20 >=.15  >=78 .63-.68 | close>=.035/.045 wide>=.055/.08 | <=26")

# variety (creator, 2026-10-27: "more scenes and more angles"): read from shots.json (render.py --stills writes it from the shot list)
import json
sp = D / "shots.json"
if sp.exists():
    S = json.loads(sp.read_text(encoding="utf-8")) or []
    def size(d):
        return "insert" if d < 0.45 else "close" if d < 0.75 else "medium" if d < 1.05 else "full" if d < 1.6 else "wide"
    def angle(s):
        return "top" if s["top"] else "low" if s["el"] > 0.18 else "high" if s["el"] < -0.38 else (s["kind"] if s["kind"] in ("ots", "pov", "profile") else "eye")
    rows = [(size(s["dist"]), angle(s), round(s["az"] / 0.785) % 8, s["look"] + ":" + str(round(s["x"] / 1.5))) for s in S]
    setups = len(set(rows)); sizes = [r[0] for r in rows]; places = len(set(r[3] for r in rows))
    run, worst = 1, 1
    for a, b in zip(sizes, sizes[1:]):
        run = run + 1 if a == b else 1; worst = max(worst, run)
    dur = (S[-1]["next"] or S[-1]["t"] + 2) if S else 0
    holds = [((s["next"] or dur) - s["t"]) for s in S]
    odd = sum(1 for r in rows if r[1] != "eye")
    print(); print(f"variety: {len(S)} shots in {dur:.0f} s (one per {np.mean(holds):.1f} s), {setups} different setups, {places} places")
    print("  sizes  " + ", ".join(f"{k} {sizes.count(k)}" for k in ("wide", "full", "medium", "close", "insert") if sizes.count(k)))
    print("  angles " + ", ".join(f"{k} {[r[1] for r in rows].count(k)}" for k in ("eye", "low", "high", "top", "ots", "pov", "profile") if [r[1] for r in rows].count(k)))
    flags = []
    if setups < 0.6 * len(S): flags.append(f"only {setups} setups for {len(S)} shots: the camera keeps returning to the same spot; use frame() kinds and both sides of the action")
    if len(set(sizes)) < 4: flags.append(f"{len(set(sizes))} shot sizes: use at least 4 of wide / full / medium / close / insert")
    if worst >= 3: flags.append(f"{worst} {max(set(sizes), key=sizes.count)}-size shots in a row somewhere: change the size every cut (wide -> close, medium -> insert)")
    if odd < max(2, dur / 12): flags.append(f"{odd} shots off eye level: give it at least one low or high, one top or insert, one over-the-shoulder per ~12 s")
    if places < (3 if dur > 35 else 2): flags.append(f"{places} place(s): a story this long moves through at least {3 if dur > 35 else 2} sets (or one big set seen from clearly different sides)")
    if holds and (np.mean(holds) < 1.3 or np.mean(holds) > 2.8): flags.append(f"a shot every {np.mean(holds):.1f} s: aim for 1.4-2.5 s (calmer than 1 s, never dragging)")
    print("\n".join("  FLAG " + f for f in flags) if flags else "  ok")

# the camera (creator 2026-10-30: "precise camera", a buyer's speakers faced away): read from camera.json (render.py --stills)
cp = D / "camera.json"
if cp.exists():
    C = json.loads(cp.read_text(encoding="utf-8")) or {}
    mv = C.get("moves") or []; flags, notes = [], []
    cuts = [m for m in mv if m.get("did") == "cut"]; slow = [m for m in mv if m.get("did") == "slowed"]
    print(); print(f"camera: {len(slow)} move(s) slowed to stay smooth, {len(cuts)} move(s) too big or too fast turned into cuts")
    for m in cuts:
        flags.append(f"{m['t']:.2f} s: your move became a cut ({m['why']}): write it as a cut, or a smaller move (<= 30 degrees, same shot size, >= 0.5 s)")
    for m in C.get("smear") or []:
        flags.append(f"{m['from']:.2f}-{m['to']:.2f} s: the picture slides {m['peak'] * 100:.0f} % of the frame in one frame (a smear): slow it or cut")
    if C.get("speakers") is None:
        flags.append("no window.SPEAK: declare who says each quoted line ([[t0, t1, char], ...]) so Legion can check they are seen")
    for sp in C.get("speakers") or []:
        bad = []
        if sp["off"] > 0.3: bad.append(f"off screen or hidden {sp['off'] * 100:.0f} % of it")
        if sp["away"] > 0.3: bad.append(f"facing away {sp['away'] * 100:.0f} % of it")
        if sp["tiny"] > 0.5: bad.append("too small to read their face")
        if bad:
            flags.append(f"{sp['from']:.2f}-{sp['to']:.2f} s, {sp['who']}'s line: " + ", ".join(bad) + " (turn them to the lens or frame them with camAt)")
    for m in C.get("missing") or []:
        flags.append(f"shot at {m['t']:.2f} s is about {m['who']} but they are {m['why']}")
    for m in C.get("faceless") or []:
        notes.append(f"shot at {m['t']:.2f} s shows no character (fine for a prop or diagram insert: give it kind: 'insert'; else put someone in)")
    print("\n".join(["  FLAG " + f for f in flags] + ["  note " + n for n in notes]) if flags or notes else "  ok")

