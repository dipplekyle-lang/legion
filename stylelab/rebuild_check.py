"""Rebuild check: the proof that a style can make ANY frame, not just its templates.

Rebuild a few real reference frames as a study page with the engine's own pieces (the rig's parameters plus its draw hooks,
never a traced picture), then run this: it renders the page's stills and puts each one next to the real frame, with a
colour score, a shape score and a heat map of WHERE the two still differ, worst cells listed first. Fix the worst cell,
run it again. Anything the engine could not make becomes a new parameter or hook in the engine, so every later Short gets it.

usage: python rebuild_check.py <build dir> <page.html> <t>=<ref.png> [<t>=<ref.png> ...] [--out DIR]
       (the build dir holds render.py, job.json and the engine; the page is rendered there with TOON_PAGE)
feeds: the SPEC's rebuild section (scores, what was added to the engine) and BUILD.md
"""
import json, os, pathlib, subprocess, sys

import cv2
import numpy as np

W, H, CELL = 1080, 1920, 120          # the heat grid: 9 x 16 cells of 120 px


def load(p):
    im = cv2.imread(str(p), cv2.IMREAD_COLOR)
    if im is None:
        sys.exit(f"can't read {p}")
    return cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA) if im.shape[:2] != (H, W) else im


def lab(im, size):
    return cv2.cvtColor(cv2.resize(im, size, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2LAB).astype(np.float32) * [100 / 255, 1, 1]


def edges(im):
    g = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(im, (W // 2, H // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY), (3, 3), 0)
    return cv2.Canny(g, 40, 110) > 0


def shape_f1(a, b, tol=3):
    """how many edges of each land within tol px of an edge of the other (the silhouettes, limbs, hair lines)"""
    k = np.ones((2 * tol + 1, 2 * tol + 1), np.uint8)
    da, db = cv2.dilate(a.astype(np.uint8), k) > 0, cv2.dilate(b.astype(np.uint8), k) > 0
    p = (b & da).sum() / max(1, b.sum()); r = (a & db).sum() / max(1, a.sum())
    return 0.0 if p + r == 0 else 2 * p * r / (p + r)


def compare(ref, ours):
    de = np.sqrt(((lab(ref, (W // 4, H // 4)) - lab(ours, (W // 4, H // 4))) ** 2).sum(-1))       # CIE76 delta E per 4x4 px
    cells = []
    for cy in range(H // CELL):
        for cx in range(W // CELL):
            v = float(de[cy * CELL // 4:(cy + 1) * CELL // 4, cx * CELL // 4:(cx + 1) * CELL // 4].mean())
            cells.append((v, cx * CELL, cy * CELL))
    cells.sort(reverse=True)
    heat = np.clip(cv2.resize(de, (W, H), interpolation=cv2.INTER_LINEAR) / 40, 0, 1)
    over = ours.astype(np.float32) * 0.45
    over[..., 2] += heat * 255 * 0.55; over[..., 1] += (1 - heat) * 60
    over = np.clip(over, 0, 255).astype(np.uint8)
    for v, x, y in cells[:5]:
        cv2.rectangle(over, (x, y), (x + CELL, y + CELL), (255, 255, 255), 3)
    return {"colour_dE": round(float(de.mean()), 1), "shapes": round(100 * shape_f1(edges(ref), edges(ours))),
            "worst": [{"box": [x, y, x + CELL, y + CELL], "dE": round(v, 1)} for v, x, y in cells[:5]]}, over


def main():
    args, out, it = [], None, iter(sys.argv[1:])
    for a in it:
        if a == "--out":
            out = pathlib.Path(next(it))
        else:
            args.append(a)
    if len(args) < 3:
        sys.exit(__doc__)
    bdir, page, pairs = pathlib.Path(args[0]), args[1], [a.split("=", 1) for a in args[2:]]
    out = out or bdir / "rebuild"
    out.mkdir(parents=True, exist_ok=True)
    times = [float(t) for t, _ in pairs]
    job = bdir / "job.json"; keep = job.read_text(encoding="utf-8")
    try:                                                   # render only the stills, then put the build's job back exactly
        j = json.loads(keep); j["seconds"] = max(j.get("seconds", 0), max(times) + 1)
        job.write_text(json.dumps(j), encoding="utf-8")
        r = subprocess.run([sys.executable, "render.py", "--stills", ",".join(f"{t:.2f}" for t in times), "rb_"], cwd=bdir,
                           env={**os.environ, "TOON_PAGE": page}, capture_output=True, text=True, timeout=600)
        print((r.stdout + r.stderr).strip().splitlines()[-1] if (r.stdout + r.stderr).strip() else "rendered")
    finally:
        job.write_text(keep, encoding="utf-8")
    report = []
    for (t, refp), tt in zip(pairs, times):
        ref, ours = load(refp), load(bdir / f"rb_{tt:05.2f}.png")
        sc, over = compare(ref, ours)
        h = H // 2
        sheet = np.hstack([cv2.resize(x, (W // 2, h), interpolation=cv2.INTER_AREA) for x in (ref, ours, over)])
        name = f"rebuild_{tt:05.2f}.jpg"; cv2.imwrite(str(out / name), sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
        report.append({"t": tt, "ref": str(refp), "sheet": name, **sc})
        print(f"t={tt:.2f}  vs {pathlib.Path(refp).name}: colour dE {sc['colour_dE']}, shapes {sc['shapes']}%  | fix first: "
              + ", ".join(f"{w['box'][:2]} dE {w['dE']}" for w in sc["worst"][:3]))
    (out / "rebuild.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(f"sheets (real | ours | where they differ) in {out}")


if __name__ == "__main__":
    main()
