"""Numbers on our stills next to the same numbers on this style's reference stills (caption band removed): colour
(saturation, grey share, colourfulness, brightness), edge detail (busy), depth (sharpest tile vs the median tile), and DENSITY
(flat shapes, small details, inner detail, bald cells: SPEC section 21) with the Short-wide counts the reference hits, and
COMPOSITION from the engine's marks (render.py --stills writes s_<t>.marks.json): a cast member or hand drawn over the hero or a
device, and a hero, device or title sitting in the caption band. PLACEMENT (section 22). LIFE (section 23): with l_<t>.png stills 0.1 s
after each s_<t>.png, how much of the frame keeps moving. TIMING and TRANSITIONS from index.html: hand-guessed leads, the share of
hard cuts among the idea changes.
usage: python check.py [stills dir]"""
import glob, json, pathlib, sys
import numpy as np
import cv2

HERE = pathlib.Path(__file__).parent
D = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE
w, h = 540, 960
keep = np.ones((h, w), bool); keep[int(0.74 * h):int(0.83 * h), int(0.15 * w):int(0.85 * w)] = False


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
            if 0.74 * h <= y0 < 0.83 * h and 1 <= c <= 4: continue
            v.append(float(lap[y0:y1, x0:x1].var()))
    v = np.array(v); return v.max() / max(1e-3, np.median(v))


def row(f):
    im = cv2.resize(cv2.imread(str(f)), (w, h), interpolation=cv2.INTER_AREA)
    return (*colour(im), *edge(im), dof(im))


def show(name, r):
    print(f"{name:10} {r[0]:5.2f} {r[1]:5.2f} {r[2]:5.2f} {r[3]:5.0f} {r[4]:5.2f} | {r[5]:6.3f} {r[6]:6.3f} | {r[7]:5.1f}")


EDGE_T, MIN_A, SMALL_A = 14.0, 0.0002, 0.002


def density(bgr):
    """section 21's numbers (same method as stylelab/density_measure.py): shapes, small details, inner detail, bald cells"""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32); lab[..., 0] *= 100 / 255; lab[..., 1:] -= 128
    mag = np.zeros((h, w), np.float32)
    for c in range(3):
        mag = np.maximum(mag, np.hypot(cv2.Scharr(lab[..., c], cv2.CV_32F, 1, 0) / 16, cv2.Scharr(lab[..., c], cv2.CV_32F, 0, 1) / 16))
    e = mag > EDGE_T
    kp = np.ones((h, w), bool); kp[int(0.70 * h):int(0.84 * h)] = False; area = kp.sum()
    inner = ~cv2.dilate(e.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & kp
    n, lbl, st, _ = cv2.connectedComponentsWithStats(inner.astype(np.uint8), connectivity=4)
    a = st[1:, cv2.CC_STAT_AREA] / area
    shapes, small = int((a >= MIN_A).sum()), int(((a >= MIN_A) & (a < SMALL_A)).sum())
    bgm = cv2.dilate((lbl == 1 + int(a.argmax())).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) if len(a) else np.zeros((h, w), bool)
    obj = kp & ~bgm; inn = float(e[obj].mean()) if obj.any() else 0.0
    cw, ch = w // 6, h // 10; cells = [e[j * ch:(j + 1) * ch, i * cw:(i + 1) * cw].mean() < 0.004 for j in range(10) for i in range(6) if kp[j * ch:(j + 1) * ch].all()]
    return shapes, small, inn, float(np.mean(cells))


print(f"{'still':10} {'p90S':>5} {'S>.7':>5} {'S<.15':>5} {'colf':>5} {'meanV':>5} | {'edge':>6} {'mid':>6} | {'depth':>5}")
ours = [row(f) for f in sorted(glob.glob(str(D / "s_*.png")))]
for f, r in zip(sorted(glob.glob(str(D / "s_*.png"))), ours):
    show(pathlib.Path(f).stem[2:], r)
if ours:
    show("OURS", np.median(np.array(ours), 0))
refs = [row(f) for f in sorted((HERE / "ref_stills").glob("*.png"))]
if refs:
    a = np.array(refs)
    show("REFERENCE", np.median(a, 0))
    print("aim: p90S, S>.7 and colf at least the reference's; S<.15 not above it; meanV within 0.06; edge within 30 %")

# density (SPEC section 21, measured on all 3,868 reference frames)
fs = sorted(glob.glob(str(D / "s_*.png")))
if fs:
    print();print(f"{'still':10} {'shapes':>6} {'small':>5} {'inner':>6} {'bald':>5}   reference: median 25 / 12 / 0.081 / 0.33, busy frames 30-60+")
    dn = [density(cv2.resize(cv2.imread(f), (w, h), interpolation=cv2.INTER_AREA)) for f in fs]
    for f, d in zip(fs, dn):
        flag = " <- bald (one hero on a gradient?)" if d[0] < 12 else (" <- busy" if d[0] >= 30 else "")
        print(f"{pathlib.Path(f).stem[2:]:10} {d[0]:6d} {d[1]:5d} {d[2]:6.3f} {d[3]:5.2f}{flag}")
    sh = np.array([d[0] for d in dn]); first = dn[0][0]
    checks = [("stills at 30+ shapes", np.mean(sh >= 30), ">= 0.40"), ("stills at 60+ (a peak)", float((sh >= 60).any()), "at least one"),
              ("stills under 12", np.mean(sh < 12), "<= 0.20"), ("first still (the hook)", first, ">= 40"), ("inner detail median", float(np.median([d[2] for d in dn])), ">= 0.08")]
    ok = [np.mean(sh >= 30) >= 0.4, (sh >= 60).any(), np.mean(sh < 12) <= 0.2, first >= 40, np.median([d[2] for d in dn]) >= 0.08]
    for (name, v, aim), good in zip(checks, ok):
        print(f"  {name:24} {v:7.2f}   aim {aim:12} {'ok' if good else 'MISS: fill it (BUILD.md, Density)'}")


# composition (BUILD.md "Nothing covers the hero"): from the marks the engine records for every still
def covered(top, under):
    """share of `under` (box or ellipse) hidden by the `top` box"""
    ux0, uy0, ux1, uy1 = under["box"]; tx0, ty0, tx1, ty1 = top["box"]
    if tx1 <= ux0 or tx0 >= ux1 or ty1 <= uy0 or ty0 >= uy1:
        return 0.0
    xs, ys = np.meshgrid(np.linspace(ux0, ux1, 40), np.linspace(uy0, uy1, 40))
    inside = np.ones_like(xs, bool)
    if under.get("shape") == "ell":
        cx, cy, rx, ry = (ux0 + ux1) / 2, (uy0 + uy1) / 2, max(1, (ux1 - ux0) / 2), max(1, (uy1 - uy0) / 2)
        inside = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2 <= 1
    hit = inside & (xs >= tx0) & (xs <= tx1) & (ys >= ty0) & (ys <= ty1)
    return float(hit.sum() / max(1, inside.sum()))


H0 = 1920
probs = []
for f in fs:
    mf = pathlib.Path(f[:-4] + ".marks.json")
    if not mf.exists():
        continue
    M = json.loads(mf.read_text())
    key = [m for m in M if m["kind"] in ("hero", "device", "title")]
    for k in key:
        for c in M:
            if c["order"] > k["order"] and c["kind"] in ("cast", "hand"):
                share = covered(c, k)
                kb, cb = k["box"], c["box"]
                held = share > 0.9 and (kb[2] - kb[0]) * (kb[3] - kb[1]) < 0.35 * (cb[2] - cb[0]) * (cb[3] - cb[1])
                if not held and share > (0.25 if c["kind"] == "hand" else 0.12):   # the reference's real cover-ups start ~0.12
                    probs.append(f"{pathlib.Path(f).stem[2:]}: a {c['name']} covers {share:.0%} of the {k['kind']} ({k['name']}): move one of them")
        y0, y1 = k["box"][1], k["box"][3]
        band = max(0, min(y1, 0.84 * H0) - max(y0, 0.70 * H0)) / max(1, y1 - y0)
        if k["kind"] != "title" and band > 0.35 and (y1 - y0) < 0.5 * H0:
            probs.append(f"{pathlib.Path(f).stem[2:]}: the {k['kind']} ({k['name']}) sits in the caption band (0.70-0.84 H): move it up or down")
if any(pathlib.Path(f[:-4] + ".marks.json").exists() for f in fs):
    print(); print("composition (nothing covers the hero or a device):")
    print(chr(10).join("  " + p for p in dict.fromkeys(probs)) if probs else "  ok")

# calm (map style, creator's rule 2026-10-27): at most 2 overlays on the map at once, and words never doubled with the captions
try: _style = json.loads((HERE / "job.json").read_text(encoding="utf-8")).get("style") or ""
except (OSError, ValueError): _style = ""
if "map" in _style:
    busy = []
    for f in fs:
        mf = pathlib.Path(f[:-4] + ".marks.json")
        if not mf.exists():
            continue
        M = json.loads(mf.read_text())
        over = [m for m in M if m["kind"] in ("device", "text") and not str(m.get("name", "")).startswith(("label", "tag"))]
        heads = [m for m in M if m.get("name") == "headline"]
        if len(over) > 3:
            busy.append(f"{pathlib.Path(f).stem[2:]}: {len(over)} overlays at once ({', '.join(m['name'] for m in over)}): at most 2 on the map plus its highlight; let one leave first")
        if heads and float(pathlib.Path(f).stem[2:] or 0) > 4.5:
            busy.append(f"{pathlib.Path(f).stem[2:]}: a typed headline after the hook: Legion's captions already show the words; use a number plate or nothing")
    print(); print("calm (map: 2 overlays at most, one line of words):")
    print(chr(10).join("  FLAG " + x for x in dict.fromkeys(busy)) if busy else "  ok")

# grounding (SPEC section 24): in a room, everything that stands STANDS ON THE FLOOR. room() marks its floor line, furn() / isoBed()
# mark furniture, person() / critter() mark their feet; a bottom edge clearly above the floor line floats on the wall
fl = []
for f in fs:
    mf = pathlib.Path(f[:-4] + ".marks.json")
    if not mf.exists():
        continue
    M = json.loads(mf.read_text())
    floors = [m["box"][1] for m in M if m["kind"] == "floor"]
    if not floors:
        continue
    fy = max(floors)
    for m in M:
        if m["kind"] == "furn" or (m["kind"] == "cast" and m["name"] in ("person", "cat", "dog", "rat", "mouse", "rabbit", "bear", "fox", "pig")):
            b = m["box"]
            if b[3] < fy - 0.02 * H0 and b[3] > 0:
                fl.append(f"{pathlib.Path(f).stem[2:]}: the {m['name']} stands {(fy - b[3]) / H0:.0%} of the frame ABOVE the floor line: it floats on the wall; "
                          "put its bottom on or below the floor (or lower the room's seam), give it a floor shadow")
if any(m["kind"] == "floor" for f in fs if pathlib.Path(f[:-4] + ".marks.json").exists() for m in json.loads(pathlib.Path(f[:-4] + ".marks.json").read_text())):
    print(); print("grounding (everything that stands, stands on the floor):")
    print(chr(10).join("  FLAG " + x for x in dict.fromkeys(fl)) if fl else "  ok")

# placement (SPEC section 22): the hero's size, height and edge cuts, and how close a device sits to what it explains
W0, heroes, far = 1080, [], []
for f in fs:
    mf = pathlib.Path(f[:-4] + ".marks.json")
    if not mf.exists():
        continue
    M = json.loads(mf.read_text())
    hs = [m for m in M if m["kind"] == "hero"]
    if hs:
        h = max(hs, key=lambda m: (m["box"][2] - m["box"][0]) * (m["box"][3] - m["box"][1]))
        x0, y0, x1, y1 = h["box"]
        vis = max(0, min(x1, W0) - max(x0, 0)) * max(0, min(y1, H0) - max(y0, 0)) * (0.785 if h.get("shape") == "ell" else 1)
        heroes.append({"t": pathlib.Path(f).stem[2:], "w": (x1 - x0) / W0, "cx": (x0 + x1) / 2 / W0, "cy": (y0 + y1) / 2 / H0,
                       "area": vis / (W0 * H0), "cut": x0 < -8 or y0 < -8 or x1 > W0 + 8 or y1 > H0 + 8})
    targets = [m for m in M if m["kind"] in ("hero", "cast")]
    for d in (m for m in M if m["kind"] == "device"):
        if not targets:
            continue
        b = d["box"]
        gap = min(max(0, max(t["box"][0] - b[2], b[0] - t["box"][2], t["box"][1] - b[3], b[1] - t["box"][3])) for t in targets) / H0
        if gap > 0.06:
            far.append(f"{pathlib.Path(f).stem[2:]}: the {d['name']} floats {gap:.0%} of the frame away from the hero / cast it explains "
                       "(reference: ON it or against it, gap ~2 %): move it with against()")
if heroes:
    med = lambda k: float(np.median([h[k] for h in heroes]))
    print(); print("placement (reference: hero on the middle line at 43-56 % height, ~56 % of the width, 19 % of the frame, cut in ~1 shot in 3):")
    for h in heroes:
        print(f"  {h['t']}: hero width {h['w']:.0%}, area {h['area']:.0%}, centre x {h['cx']:.0%} y {h['cy']:.0%}{', cut by the frame' if h['cut'] else ''}")
    flags = []
    if med("w") < 0.40:
        flags.append(f"heroes are small (median width {med('w'):.0%}; the reference's middle half is 40-74 %): size them with slot(job)")
    if not 0.40 <= med("cy") <= 0.58:
        flags.append(f"heroes sit at {med('cy'):.0%} of the height (reference 43-56 %): bring them to mid-height")
    if abs(med("cx") - 0.5) > 0.06:
        flags.append(f"heroes sit off the middle line (x {med('cx'):.0%}; reference 47-52 %)")
    if len(heroes) >= 4 and sum(h["cut"] for h in heroes) / len(heroes) < 0.15:
        flags.append("no hero is ever cut by the frame (reference: ~1 shot in 3, by a side or the bottom): let one big hero leave the frame")
    print(chr(10).join("  FLAG " + x for x in flags + list(dict.fromkeys(far))) if flags or far else "  ok")

# LIFE (SPEC section 23): is something big moving in every hold? For each still s_<t>.png with a partner l_<t + 0.1>.png
# (python render.py --stills <each t + 0.1> l_), dense optical flow between the two at 180 x 320, the caption band masked: the
# share of the frame moving faster than ~43 px/s at 1080 wide. The same probe on 91 reference frame pairs: median 10 % of the frame
# (p25 3 %, p75 32 %), under 5 % in 35 % of pairs. (At 60 fps on whole videos: 12 % vs the Moon build's 4 %.)
def _partner(f):
    try: return pathlib.Path(f).parent / f"l_{float(pathlib.Path(f).stem[2:]) + 0.1:05.2f}.png"
    except ValueError: return pathlib.Path(f).parent / "none"
lf = [(f, _partner(f)) for f in fs]
lf = [(a, b) for a, b in lf if b.exists()]
if lf:
    fw, fh = 180, 320
    km = np.ones((fh, fw), bool); km[int(0.70 * fh):int(0.84 * fh)] = False
    shares = []
    for a, b in lf:
        A = cv2.cvtColor(cv2.resize(cv2.imread(str(a)), (fw, fh), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        B = cv2.cvtColor(cv2.resize(cv2.imread(str(b)), (fw, fh), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        fl = cv2.calcOpticalFlowFarneback(A, B, None, 0.5, 3, 13, 3, 5, 1.1, 0)
        mag = np.hypot(fl[..., 0], fl[..., 1])
        shares.append((pathlib.Path(a).stem[2:], float(((mag > 0.72) & km).mean())))
    print(); print("life (reference probe: median 10 % of the frame moving, under 5 % in about 1 hold in 3; whole shapes: bodies, the hero, big props):")
    print("  " + "  ".join(f"{t} {v:.0%}" for t, v in shares))
    dead = [t for t, v in shares if v < 0.05]
    med_l = float(np.median([v for _, v in shares]))
    fl_ = []
    if med_l < 0.10:                       # creator's rule: 10-15 % of the frame gently moving almost all the time
        fl_.append(f"the picture is too still (median {med_l:.0%} of the frame moving): give the hero, the cast and big props a life loop (alive(), person idle) and add a drifting layer")
    if len(shares) >= 4 and len(dead) / len(shares) > 0.17:
        fl_.append(f"{len(dead)} of {len(shares)} holds nearly dead (under 5 % moving: " + ", ".join(dead) + "; at most 1 in 6): no frozen moments, every hero, cast member and big prop keeps an idle (alive(), person idle) and the background drifts")
    print(chr(10).join("  FLAG " + x for x in fl_) if fl_ else "  ok")

# TIMING and TRANSITIONS from the page source (SPEC section 23): no hand-guessed leads, idea changes linked
src = HERE / "index.html"
if src.exists():
    import re
    code = src.read_text(encoding="utf-8", errors="ignore")
    leads = re.findall(r"(?:wordAt|\bw|\bat|\bwd)\(\s*['\"]([^'\"]+)['\"][^)]*\)\s*-\s*(0?\.\d+)", code)
    leads = [(wd, float(x)) for wd, x in leads if float(x) >= 0.05]
    kinds = re.findall(r"trans\s*:\s*\{\s*type\s*:\s*['\"](\w+)['\"]", code)
    try: mo = json.loads((HERE / "job.json").read_text(encoding="utf-8")).get("motion") or {}
    except (OSError, ValueError): mo = {}
    if mo.get("trans") and mo.get("trans") != "cut":               # a shot with no trans of its own gets the style's linked change
        kinds += ["carry"] * max(0, len(re.findall(r"\bshot\(", code)) - 1 - len(kinds))
    inshot = len(re.findall(r"\brebuild\(", code)) + len(re.findall(r"\bmorph\(", code))
    shots = len(re.findall(r"\bshot\(", code))
    print(); print("timing and transitions (reference: a move's fastest frame ON its word; 2 in 3 idea changes inside a shot, plain cuts ~1 in 4):")
    tl = []
    if leads:
        tl.append(f"{len(leads)} hand-guessed leads (e.g. '{leads[0][0]}' - {leads[0][1]}): start moves with s.hit(word, kind) so the peak lands on the word")
    linked = sum(1 for k in kinds if k in ("carry", "pan", "bars", "reveal", "into", "push", "whip", "zoom", "diag", "iris"))
    changes = max(1, shots - 1) + inshot
    cuts = changes - linked - inshot
    print(f"  {shots} shots; shot changes: " + (", ".join(f"{k} {kinds.count(k)}" for k in dict.fromkeys(kinds)) or "all cuts") + f"; in-shot rebuilds / morphs: {inshot}")
    if changes >= 4 and cuts / changes > 0.15:
        tl.append(f"hard cuts are {cuts / changes:.0%} of the idea changes (near zero: something on screen leads the eye into the next shot): link them (carry, pan, bars, reveal, into, zoom, rebuild(), morph())")
    if changes >= 8 and not any(k in kinds for k in ("reveal", "into")):
        tl.append("no zoom-out reveal or zoom-through: the reference uses one about every 5 changes")
    slides = sum(1 for k in kinds if k in ("pan", "whip", "push"))
    if len(kinds) >= 5 and slides / len(kinds) > 0.3:
        tl.append(f"{slides} of {len(kinds)} changes are slides (pan / whip / push): they read as 'next slide'. Lead the eye instead: into or zoom through the old shot's hero, carry the thing that stays, reveal, bars, rebuild()")
    print(chr(10).join("  FLAG " + x for x in tl) if tl else "  ok")
    # ACTING (creator 2026-10-27: "moves on/off, characters frozen while text moves"): poses switched on a second jump on one frame
    print(); print("acting (key poses blended with act(), never a pose switched with t > x ? a : b):")
    calls = re.findall(r"\b(?:person|bust)\(\s*\w+\s*,\s*\{(.{0,900}?)\}\s*\)", code)
    POSE = r"(?:arm|elbow|wrist|leg|knee|hand)[LR]|tilt|lean|headTilt|headX|turn|hipX|mood"
    switched = [m.group(1) for c in calls for m in re.finditer(r"\b(" + POSE + r")\s*:\s*\(?\s*(?:s\.)?t\s*[<>]=?", c)]
    acted = len(re.findall(r"\bact\(", code))
    al = []
    if switched:
        al.append(f"{len(switched)} pose switches on a second ({', '.join(dict.fromkeys(switched))}): write the character's key poses once and pass ...act(t, KEYS): the body leads, the limbs follow, they overshoot and settle")
    if calls and not acted:
        al.append(f"{len(calls)} character calls and no act(): every character that does something needs a key-pose list (BUILD.md, acting)")
    print(chr(10).join("  FLAG " + x for x in al) if al else "  ok")

# VARIETY (creator 2026-10-27, after the sleep Short: one woman in one bedroom for most shots read as a template): the scene IDEA
# changes almost every shot (a lone hero object, an insert, a cutaway, a crowd, a chart from the world, a person...)
vs = [f for f in fs if pathlib.Path(f[:-4] + ".marks.json").exists()]
if len(vs) >= 6:
    import cv2
    def person_share(f):
        M = json.loads(pathlib.Path(f[:-4] + ".marks.json").read_text())
        return max([((m["box"][2] - m["box"][0]) * (m["box"][3] - m["box"][1])) / (1080 * 1920) for m in M if m["kind"] == "cast"] or [0])
    def hist(f):
        im = cv2.resize(cv2.imread(f), (54, 96)); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
        h = cv2.calcHist([hsv], [0, 1], None, [12, 4], [0, 180, 0, 256]); return cv2.normalize(h, h).flatten()
    ps = [person_share(f) for f in vs]; hs = [hist(f) for f in vs]
    sim = [float(cv2.compareHist(hs[i], hs[i + 1], cv2.HISTCMP_CORREL)) for i in range(len(hs) - 1)]
    run, best = 1, 1
    for s_ in sim:
        run = run + 1 if s_ > 0.9 else 1; best = max(best, run)
    big = sum(1 for p in ps if p > 0.12) / len(ps)
    print(); print("variety (the scene idea changes almost every shot; a person is one idea among many):")
    print(f"  {len(vs)} stills: a person fills the frame in {big:.0%}; longest run of look-alike stills: {best}")
    vf = []
    if big > 0.5:
        vf.append(f"a person is the picture in {big:.0%} of the stills: give the other ideas their own shots (a hero object on a clean sky, a magnified insert, a cutaway, a crowd or city, a chart built from the world, a prop with a face)")
    if best >= 3:
        vf.append(f"{best} stills in a row look alike (same set and colours): change the place or the scene idea, or flip the gradient")
    print(chr(10).join("  FLAG " + x for x in vf) if vf else "  ok")
