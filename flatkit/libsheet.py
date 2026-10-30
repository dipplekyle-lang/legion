"""The flat piece library: draw every piece ALONE (engine.js + the piece, nothing else) and save its preview.

Proves a piece has no hidden ties to the page it came from (it must draw with only the engine), and gives the builder
a picture of what it's getting. Each piece = <kind>/<name>.js + .json (desc, tags, usage, demo) + .png (made here).

usage: py -3.12 flatkit/libsheet.py [library dir ...]      (default: flatkit/library and output/flat_library)
       --sheet out.jpg   also writes one contact sheet of every piece
"""
import argparse
import http.server
import json
import pathlib
import shutil
import tempfile
import threading

import cv2
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
TILE = 1080


def pieces(dirs):
    for d in dirs:
        for j in sorted(pathlib.Path(d).glob("*/*.json")):
            yield j


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dirs", nargs="*")
    ap.add_argument("--sheet", default="")
    a = ap.parse_args()
    dirs = [pathlib.Path(x) for x in a.dirs] or [p for p in (HERE / "library", ROOT / "output" / "flat_library") if p.exists()]
    todo = list(pieces(dirs))
    if not todo:
        print("no pieces"); return
    from playwright.sync_api import sync_playwright
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="flatlib_"))
    shutil.copy(HERE / "engine.js", tmp / "engine.js")
    if (HERE / "fonts").exists():
        shutil.copytree(HERE / "fonts", tmp / "fonts")
    (tmp / "index.html").write_text('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}'
                                    'canvas{display:block}</style></head><body><canvas id="c" width="1080" height="1920"></canvas>'
                                    '<script src="engine.js"></script></body></html>', encoding="utf-8")
    h = lambda *x, **k: http.server.SimpleHTTPRequestHandler(*x, directory=str(tmp), **k)
    http.server.SimpleHTTPRequestHandler.log_message = lambda *x: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    tiles, bad = [], []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for j in todo:
            meta = json.loads(j.read_text(encoding="utf-8"))
            code = j.with_suffix(".js").read_text(encoding="utf-8")
            pg = b.new_page(viewport={"width": 1080, "height": 1920})
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/index.html")
            # the piece is loaded as its own script: anything it needs beyond the engine fails here
            pg.add_script_tag(content=code + f"\nwindow.__piece = () => {{ const g = G; g.setTransform(1,0,0,1,0,0); g.fillStyle = '#EDE6FF';"
                                               f" g.fillRect(0, 0, W, H); {meta.get('demo', '')}; }};")
            try:
                pg.evaluate("window.__piece()")
            except Exception as e:
                errs.append(str(e).splitlines()[0])
            png = cv2.imdecode(np.frombuffer(pg.locator("canvas").screenshot(type="png"), np.uint8), cv2.IMREAD_COLOR)[:TILE]
            pg.close()
            name = f"{j.parent.name}/{j.stem}"
            if errs:
                bad.append((name, errs[0])); print(f"  BROKEN {name}: {errs[0][:160]}"); continue
            drawn = float((np.abs(png.astype(int) - [255, 230, 237]).sum(2) > 30).mean())
            if drawn < 0.01:
                bad.append((name, "draws nothing")); print(f"  BROKEN {name}: draws nothing with its demo"); continue
            cv2.imwrite(str(j.with_suffix(".png")), cv2.resize(png, (360, 360), interpolation=cv2.INTER_AREA))
            tiles.append((name, png)); print(f"  ok {name} ({drawn:.0%} of the tile)")
        b.close()
    srv.shutdown()
    shutil.rmtree(tmp, ignore_errors=True)
    if a.sheet and tiles:
        cols = 5; rows = -(-len(tiles) // cols); s = 300
        sheet = np.full((rows * (s + 40), cols * s, 3), 255, np.uint8)
        for i, (name, img) in enumerate(tiles):
            r, c = divmod(i, cols)
            sheet[r * (s + 40):r * (s + 40) + s, c * s:(c + 1) * s] = cv2.resize(img, (s, s), interpolation=cv2.INTER_AREA)
            cv2.putText(sheet, name, (c * s + 8, r * (s + 40) + s + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (40, 40, 40), 1, cv2.LINE_AA)
        cv2.imwrite(a.sheet, sheet)
    print(f"{len(tiles)} pieces ok, {len(bad)} broken")
    raise SystemExit(1 if bad else 0)


if __name__ == "__main__":
    main()
