"""mapprep.py: build the map engine's data once, from public-domain sources in <legion>/mapdata/ (NASA Blue Marble,
Natural Earth). Writes flatkit/maps/tiles/<z>/<x>_<y>.jpg (Web Mercator, 512 px tiles, zoom 0-5) and flatkit/maps/world.json
(countries, states and provinces, cities, lakes, rivers: names, ISO codes, centres, boxes and rounded outlines).

    py -3.12 flatkit/mapprep.py            (a few minutes; only needed again if the sources change)
    py -3.12 flatkit/mapprep.py --hi       the sharp set: zoom 6-7 from NASA's 500 m tiles (mapdata/hi/bm500_A1..D2.jpg) into
                                           mapdata/tiles (each Short links to it; open sea at zoom 7 is left out)"""
import json, math, pathlib
import cv2, numpy as np

HERE = pathlib.Path(__file__).parent
SRC = HERE.parent / "mapdata"
OUT = HERE / "maps"
TILE, ZMAX, MAXLAT = 512, 5, 85.05112878


def tiles():
    img = cv2.imread(str(SRC / "bluemarble_21600.jpg"), cv2.IMREAD_COLOR)
    sh, sw = img.shape[:2]
    for z in range(ZMAX + 1):
        n = 2 ** z
        (OUT / "tiles" / str(z)).mkdir(parents=True, exist_ok=True)
        # the source is resampled from a pre-shrunk copy at low zooms (less aliasing)
        scale = min(1.0, (TILE * n * 1.5) / sw)
        src = img if scale >= 1 else cv2.resize(img, (int(sw * scale), int(sh * scale)), interpolation=cv2.INTER_AREA)
        h, w = src.shape[:2]
        for ty in range(n):
            py = (ty * TILE + np.arange(TILE) + 0.5) / (TILE * n)              # 0..1 down the mercator world
            lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * py))))
            sy = ((90 - lat) / 180 * h).astype(np.float32)
            for tx in range(n):
                px = (tx * TILE + np.arange(TILE) + 0.5) / (TILE * n)
                sx = (px * w).astype(np.float32)
                mx, my = np.meshgrid(sx, sy)
                t = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
                cv2.imwrite(str(OUT / "tiles" / str(z) / f"{tx}_{ty}.jpg"), t, [cv2.IMWRITE_JPEG_QUALITY, 84])
        print("zoom", z, n * n, "tiles", flush=True)


def rings(geom, nd=3):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]] if geom["type"] == "Polygon" else []
    out = []
    for poly in polys:
        for k, ring in enumerate(poly):
            r = [[round(x, nd), round(y, nd)] for x, y in ring]
            out.append(r if k == 0 else {"hole": r})
    return out


def lines(geom, nd=3):
    ls = geom["coordinates"] if geom["type"] == "MultiLineString" else [geom["coordinates"]] if geom["type"] == "LineString" else []
    return [[[round(x, nd), round(y, nd)] for x, y in l] for l in ls]


def box(rs):
    pts = [p for r in rs for p in (r if isinstance(r, list) else r["hole"])]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return [min(xs), min(ys), max(xs), max(ys)] if pts else [0, 0, 0, 0]


def centre(rs):
    """The centre of the biggest outer ring (so France sits in France, not between it and French Guiana)."""
    best, area = None, -1
    for r in rs:
        if not isinstance(r, list):
            continue
        a = abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]))) / 2
        if a > area:
            best, area = r, a
    if not best:
        return [0, 0]
    xs, ys = [p[0] for p in best], [p[1] for p in best]
    return [round((min(xs) + max(xs)) / 2, 2), round((min(ys) + max(ys)) / 2, 2)]


def data():
    load = lambda f: json.loads((SRC / f).read_text(encoding="utf-8"))["features"]
    world = {"countries": [], "states": [], "cities": [], "lakes": [], "rivers": []}
    for f in load("ne_50m_admin_0_countries.geojson"):
        p, rs = f["properties"], rings(f["geometry"])
        world["countries"].append({"name": p.get("NAME"), "long": p.get("NAME_LONG"), "iso": p.get("ISO_A3") if p.get("ISO_A3") != "-99" else p.get("ADM0_A3"),
                                   "cont": p.get("CONTINENT"), "region": p.get("SUBREGION"), "pop": p.get("POP_EST"), "lx": p.get("LABEL_X"), "ly": p.get("LABEL_Y"),
                                   "c": centre(rs), "box": box(rs), "rings": rs})
    for f in load("ne_50m_admin_1_states_provinces_lakes.geojson"):
        p, rs = f["properties"], rings(f["geometry"])
        world["states"].append({"name": p.get("name"), "of": p.get("adm0_a3"), "code": p.get("postal"), "c": centre(rs), "box": box(rs), "rings": rs})
    for f in load("ne_50m_populated_places_simple.geojson"):
        p = f["properties"]
        world["cities"].append({"name": p.get("name"), "of": p.get("adm0_a3"), "cap": int(p.get("featurecla", "").startswith("Admin-0 capital")),
                                "pop": p.get("pop_max"), "c": [round(p.get("longitude"), 3), round(p.get("latitude"), 3)]})
    for f in load("ne_50m_lakes.geojson"):
        world["lakes"].append({"name": f["properties"].get("name"), "rings": rings(f["geometry"])})
    for f in load("ne_50m_rivers_lake_centerlines.geojson"):
        world["rivers"].append({"name": f["properties"].get("name"), "lines": lines(f["geometry"])})
    (OUT / "world.json").write_text(json.dumps(world, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print("world.json", {k: len(v) for k, v in world.items()}, round((OUT / "world.json").stat().st_size / 1e6, 1), "MB")


def hi(zooms=(6, 7)):
    """NASA's 500 m set is 8 squares of 21600 px, each 90 x 90 degrees (A-D west to east, 1 north / 2 south). Web Mercator tiles
    from zoom 2 up never cross those lines, so every tile is cut from one square at a time (one square in memory)."""
    out = HERE.parent / "mapdata" / "tiles"
    for col, row in [(c, r) for r in "12" for c in "ABCD"]:
        f = SRC / "hi" / f"bm500_{col}{row}.jpg"
        if not f.exists():
            print("missing", f.name, flush=True); continue
        if (out / f"done_{col}{row}").exists():                                   # built on an earlier run
            continue
        img = cv2.imread(str(f), cv2.IMREAD_COLOR)
        lon0, lat0 = -180 + 90 * "ABCD".index(col), 90 if row == "1" else 0
        for z in zooms:
            n = 2 ** z; (out / str(z)).mkdir(parents=True, exist_ok=True)
            per = TILE * n // 4                                                      # output px per 90 degrees
            src = cv2.resize(img, (min(21600, int(per * 1.25)),) * 2, interpolation=cv2.INTER_AREA) if per * 1.25 < 21600 else img
            sw = src.shape[1]; made = skipped = 0
            tx0, tx1 = int((lon0 + 180) / 360 * n), int((lon0 + 270) / 360 * n)
            for ty in range(n):
                py = (ty * TILE + np.arange(TILE) + 0.5) / (TILE * n)
                lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * py))))
                if lat.min() >= lat0 or lat.max() <= lat0 - 90:
                    continue
                sy = ((lat0 - lat) / 90 * sw).astype(np.float32)
                for tx in range(tx0, tx1):
                    px = (tx * TILE + np.arange(TILE) + 0.5) / (TILE * n)
                    sx = ((px * 360 - 180 - lon0) / 90 * sw).astype(np.float32)
                    mx, my = np.meshgrid(sx, sy)
                    t = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
                    if z >= 7:                                                       # open sea: the zoom-6 tile looks the same
                        b, g, r = t[..., 0].astype(int), t[..., 1].astype(int), t[..., 2].astype(int)
                        if ((b > r + 15) & (r + g + b < 330)).mean() > 0.985:
                            skipped += 1; continue
                    cv2.imwrite(str(out / str(z) / f"{tx}_{ty}.jpg"), t, [cv2.IMWRITE_JPEG_QUALITY, 82]); made += 1
            print(f"{col}{row} zoom {z}: {made} tiles, {skipped} open sea left out", flush=True)
            del src
        del img
        (out / f"done_{col}{row}").write_text("ok")
    # the list of sharp tiles that exist, so the page never asks for a left-out sea tile
    keys = [f"{z.name}/{f.stem.replace('_', '/')}" for z in sorted(out.iterdir()) if z.is_dir() for f in z.glob("*.jpg")]
    (out / "index.json").write_text(json.dumps(keys, separators=(",", ":")), encoding="utf-8"); print(len(keys), "sharp tiles", flush=True)


if __name__ == "__main__":
    import sys
    if "--hi" in sys.argv:
        hi(); raise SystemExit
    OUT.mkdir(exist_ok=True)
    data()
    tiles()
