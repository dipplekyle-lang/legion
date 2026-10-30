#!/usr/bin/env python3
"""photofx.py — the PHOTO FX DLC: three ways a still picture comes alive.

SPOTLIGHT  When the voice names a real person, place or moment, a real photograph of it: the camera
           pushes in on the subject while the rest of the picture darkens, loses its colour and blurs.
           The subject is cut out, so it stays sharp and grows a little against the fading ground.
OBJECTS    When the voice names a real thing — a Pepsi can, a Rolex, a gold bar — the thing is cut out
           of a real photo and animated over a blurred ground in its own colours, with a soft shadow:
           it rises in turning and settles, a crown drops onto it and wobbles, two things slide in to
           be compared, a row of them pops in.
DEPTH      On AI pictures of people and vehicles: the person (or the car) is lifted off the picture with a
           thin light keyline and slowly grows while the background pulls back.

    python photofx.py depth picture.jpg                            # one AI still, 5 seconds
    python photofx.py spotlight photo.jpg --subject "the man in the red shirt"
    python photofx.py object "Dr Pepper can" --accent "silver crown"
    python photofx.py object "Pepsi can" --also "Coca-Cola can"    # two things, compared
    python photofx.py find "Dr Pepper can"                         # what the image search finds
    python photofx.py check                                        # offline: layers, ffmpeg, Chromium

How it works
------------
* Cutouts come from WaveSpeed's background remover ($0.004 a picture, WAVESPEED_API_KEY in .env). Each is
  kept under the picture's hash, so a picture is never paid for twice.
* Real photos are found with Algrow's image search (free, ALGROW_API_KEY), and Wikimedia Commons when that
  finds too little. Stock-photo sites are skipped (watermarks). Claude looks at the candidates, picks the
  photo that really shows the thing and says where in it the subject is.
* SPOTLIGHT and OBJECTS are scenes on the words, like MAPS and HEADLINES (`add_to_timeline`), drawn frame by
  frame in Chromium (assets/photofx/page.js). The captions stay on them: they are pictures, not graphics.
* DEPTH replaces the slow zoom on every third AI still whose main subject is a person or a vehicle — Claude
  looks at the stills first, ten at a time (`depth_subjects`), so a steering wheel, a phone or a plate of food
  is never lifted — and is rendered by ffmpeg beside the other segments (`depth_slots`, `depth_segment`).
  A still without one clear subject keeps its plain zoom.
"""

import base64
import hashlib
import io
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
from PIL import Image, ImageFilter, ImageOps

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "assets" / "photofx"
# the film's own frame (Legion: a 1080x1920 Short): every scene and the depth pop are drawn at this size
FILM_W, FILM_H = int(os.environ.get("VIDEO_W", "1080")), int(os.environ.get("VIDEO_H", "1920"))
W, H, FPS = FILM_W, FILM_H, 30
TALL = H > W

REMOVER = os.environ.get("PHOTOFX_REMOVER", "wavespeed-ai/image-background-remover")
REMOVER_USD = 0.004
DEPTH_EVERY = int(os.environ.get("PHOTOFX_DEPTH_EVERY", "3"))   # every Nth AI still gets the depth pop
DEPTH_MIN_S = 2.4                    # a slot shorter than this has no time to show it
DEPTH_Z0, DEPTH_GROW = 1.06, 0.09    # the background starts 6 % in and pulls back to 1; the subject grows 9 % on top
DEPTH_FULL_S = 4.0                   # ...over a still this long; a shorter one moves less, so the pop is never quicker
EVERY_S = float(os.environ.get("PHOTOFX_EVERY_S", "45"))        # at most one photo scene per this many seconds
GAP_S = float(os.environ.get("PHOTOFX_GAP_S", "14"))
SPOT_DUR, SPOT_LEAD = 5.0, 0.9       # the darkening starts on the words
HOLD_S = 2.5                         # frames drawn past the end: the timeline may stretch a scene over a short gap
OBJ_DUR = {"solo": 4.6, "crown": 5.6, "pair": 5.2, "row": 5.4}
OBJ_LEAD = 0.5                       # the thing has landed when its name is said
PROTECTED = ("introcap", "map_", "headline_", "spot_", "objects_", "strip_", "tilt_", "press_",   # scenes placed on a word:
             "match_", "textcut_", "vox_")                                                        # nobody removes them
STRIP_DUR, STRIP_LEAD = 6.6, 0.9         # a Kodak contact strip of 2-3 photos; the first photo lands on the words
MATCH_DUR, MATCH_LEAD = 4.6, 0.5         # a match cut: 6-10 photos of one person, every face on the same spot, a flash and a shutter per cut
# the landmark match cut (look.photofx.matchcut_mode "landmark", STRATA): 10-12 photos of one kind of landmark, 3 frames
# (0.125 s) each, every apex on (988, 305) px, no flash, a tick per cut, a bass down on the held landing (measured)
LANDMARK_DUR, LANDMARK_LEAD, LANDMARK_STEP = 3.4, 0.4, 0.125
LANDMARK_AT = (0.515, 0.282)
# the scenic montage (matchcut mode "scenic", STRATA): 10-12 photos of one kind of scenery over words that list places,
# eras or spans of time, frames per photo as measured (23.976 fps): steady (the closing run), accelerating into a reveal,
# decelerating into a rest. Only a run that closes the video ticks on every cut (bookends); the others ride the music.
SCENIC_PACE = {"steady": [5, 5, 5, 4, 5, 6, 5, 4, 5, 5, 5], "accelerate": [11, 9, 10, 9, 6, 6, 4, 4, 6, 3, 3, 3],
               "decelerate": [4, 3, 3, 3, 4, 10, 13, 25, 22]}
SCENIC_HOLD = {"steady": 1.6, "accelerate": 0.35, "decelerate": 0.9}
TEXT_DUR, TEXT_LEAD = 5.0, 0.3           # a text match cut: 3-5 punches of text, one per cut, each on its own real photo, the words on one spot
TILT_DUR = 5.2                           # a tall portrait, the camera travelling down it
CAPTIONED = ("spot_", "objects_")    # pictures, not graphics: the engine keeps the captions on these
# autostyle v2 — the per-title looks look.photofx may ask for (lookreg/objects.py describes them for the brain). Every
# one is opt-in: a style without these keys builds exactly the scenes above, drawn by page.js as before.
SPOT_GROUNDS = ("fade", "colour_pop", "duotone", "blur_deep", "halftone", "paper")   # what the photo round the subject turns into
SPOT_CAMS = ("push", "pull", "pan", "snap")                                         # the spotlight's camera
ENTRANCES = ("rise", "drop", "pop", "left", "right", "turntable", "float", "plinth_rise")   # slam_shake retired 10-03
# seconds from an object scene's start until its thing has LANDED — the scene starts this long before the name is said
# (drop: its hop and wobble have died down by 0.8 s, not by 0.5)
ENTRANCE_LEAD = {"rise": 0.5, "drop": 0.8, "pop": 0.3, "left": 0.5, "right": 0.5, "turntable": 1.4, "float": 1.15,
                 "plinth_rise": 1.2}
OBJECT_LABELS = ("none", "exhibit_card", "leader_callout", "stencil_tag")
TEXTCUTS = ("default", "serif_quiet", "glow_line", "stamp_word")
OBJECT_GLOWS = ("none", "soft", "bloom", "neon", "halo", "rim", "halation")         # = lookreg.common.GLOW_FAMILIES

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/128.0.0.0 Safari/537.36")
_IMG_HEADERS = {"User-Agent": UA, "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.8"}
# Stock libraries watermark everything they serve, print-on-demand shops sell drawings of the thing.
STOCK_HOSTS = ("gettyimages.", "istockphoto.", "shutterstock.", "dreamstime.", "alamy.", "stock.adobe.", "ftcdn.net",
               "123rf.", "depositphotos.", "vecteezy.", "freepik.", "canstockphoto.", "bigstockphoto.", "pond5.",
               "stocksy.", "agefotostock.", "colourbox.", "pixtastock.", "etsy.", "etsystatic.", "redbubble.",
               "teepublic.", "zazzle.", "cafepress.", "wallpapers.com", "magnific.com", "pngtree.", "cleanpng.",
               "pngwing.", "kindpng.", "pngitem.", "seekpng.", "clipart", "wallpaperaccess.", "wallpapercave.")


def _log(engine, msg: str) -> None:
    (engine.log if engine is not None and hasattr(engine, "log") else print)(msg)


def settings(style: str, engine) -> dict:
    """The channel's `look.photofx` and this job's switches in Options, as one dict."""
    look = ((getattr(engine, "STYLE_INFO", {}) or {}).get(style) or {}).get("look") or {}
    raw = look.get("photofx")
    cfg = raw if isinstance(raw, dict) else {}
    off = set(getattr(engine, "_DLC_OFF", set()) or set())
    on = raw is not False

    def flag(name):
        return on and cfg.get(name, True) is not False and name not in off
    return {"spotlight": flag("spotlight"), "objects": flag("objects"), "depth": flag("depth"),
            # "strip": Kodak contact strips of 2-3 real photos; "spot_move": "tilt" travels down a tall portrait
            "strip": bool(cfg.get("strip")) and flag("spotlight"),
            # "matchcut": a fast run of real photos of one person, the face held on one spot of the screen
            "matchcut": bool(cfg.get("matchcut")) and flag("spotlight"),
            # "matchcut_mode": "landmark" — the run is of landmarks (summits, spires), the apex held on one spot
            "matchcut_mode": str(cfg.get("matchcut_mode") or "face").lower(),
            "matchcut_step": float(cfg.get("matchcut_step") or LANDMARK_STEP),
            # "textcut": the words that hit, one per cut, held on one spot of the screen over real photos
            "textcut": bool(cfg.get("textcut")) and flag("spotlight"),
            "spot_move": str(cfg.get("spot_move") or "push").lower(),
            "depth_every": int(cfg.get("depth_every", DEPTH_EVERY) or 0),
            # "people": only stills whose main subject is a person or a vehicle; "any": any clear subject
            "depth_subjects": str(cfg.get("depth_subjects") or "people").lower(),
            "keyline": str(cfg.get("keyline", "#F6F1E8") or ""),
            # "ground": a picture under assets/ laid under real objects instead of the blurred colour ground
            "ground": str(cfg.get("ground") or ""),
            # "draw_objects": false — an object no photo cuts out cleanly is dropped, never drawn by the image model
            "draw_objects": cfg.get("draw_objects", True) is not False,
            "every_s": float(cfg.get("every_s") or EVERY_S), "gap_s": float(cfg.get("gap_s") or GAP_S),
            # autostyle v2: spot_ground, spot_cam, entrance, label, glow, textcut_style, palette, fonts ({} = none)
            "v2": _v2_settings(cfg)}


# ════════════════════════════════════════════════════════════════════════════
# PICTURES — loading, blurs, masks, compositing (numpy + Pillow, nothing else)
# ════════════════════════════════════════════════════════════════════════════
def load_rgb(path) -> Image.Image:
    im = Image.open(path)
    try:
        im = ImageOps.exif_transpose(im)
    except Exception:                                        # noqa: BLE001 - a broken EXIF block is not worth a photo
        pass
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        base = Image.new("RGBA", im.size, (255, 255, 255, 255))
        base.alpha_composite(im)
        im = base
    return im.convert("RGB")


def cover(im: Image.Image, w: int = W, h: int = H) -> Image.Image:
    """Fill w×h and crop the middle — the same framing the engine gives every still."""
    s = max(w / im.width, h / im.height)
    nw, nh = max(w, round(im.width * s)), max(h, round(im.height * s))
    im = im.resize((nw, nh), Image.LANCZOS)
    x, y = (nw - w) // 2, (nh - h) // 2
    return im.crop((x, y, x + w, y + h))


def _box1(a, r: int):
    """Box blur of radius r over both axes, edges held."""
    k = 2 * r + 1
    c = np.cumsum(np.pad(a, [(r + 1, r)] + [(0, 0)] * (a.ndim - 1), mode="edge"), axis=0, dtype=np.float64)
    a = (c[k:] - c[:-k]) / k
    c = np.cumsum(np.pad(a, [(0, 0), (r + 1, r)] + [(0, 0)] * (a.ndim - 2), mode="edge"), axis=1, dtype=np.float64)
    return ((c[:, k:] - c[:, :-k]) / k).astype(np.float32)


def blur(a, sigma: float):
    """Three box passes: a Gaussian of this sigma. Wide ones are done smaller — the eye cannot tell."""
    a = np.asarray(a, dtype=np.float32)
    if sigma <= 0.3:
        return a
    f = int(sigma // 6)
    if f >= 2:
        h, w = a.shape[:2]
        small = resize(a, (max(8, w // f), max(8, h // f)))
        return resize(blur(small, sigma / f), (w, h))
    r = max(1, int(round((math.sqrt(4 * sigma * sigma + 1) - 1) / 2)))
    for _ in range(3):
        a = _box1(a, r)
    return a


def resize(a, size):
    if a.ndim == 2:
        return np.asarray(Image.fromarray(np.asarray(a, np.float32)).resize(size, Image.BILINEAR), dtype=np.float32)
    return np.dstack([resize(a[..., c], size) for c in range(a.shape[2])])


def dilate(alpha, px: int):
    im = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8))
    while px > 0:
        step = min(px, 4)
        im = im.filter(ImageFilter.MaxFilter(2 * step + 1))
        px -= step
    return np.asarray(im, dtype=np.float32) / 255


def gray(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def desat(rgb, amount: float):
    return rgb * (1 - amount) + gray(rgb)[..., None] * amount


def over(dst, src):
    """Straight-alpha 'over' on float RGBA (colour 0..255, alpha 0..1)."""
    sa, da = src[..., 3:4], dst[..., 3:4]
    oa = sa + da * (1 - sa)
    rgb = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa], axis=2)


def flat(color, alpha):
    c = np.asarray(color, np.float32).reshape(1, 1, 3)
    return np.concatenate([np.broadcast_to(c, alpha.shape + (3,)), alpha[..., None]], axis=2)


def hex_rgb(h: str, default=(246, 241, 232)):
    m = re.fullmatch(r"#?([0-9a-fA-F]{6})", str(h or "").strip())
    return tuple(int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4)) if m else default


def save_rgba(arr, path) -> Path:
    out = np.concatenate([np.clip(arr[..., :3], 0, 255), np.clip(arr[..., 3:4] * 255, 0, 255)], axis=2)
    Image.fromarray(out.astype(np.uint8)).save(path, "PNG", compress_level=3)
    return Path(path)


def save_rgb(arr, path, quality: int = 94) -> Path:
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path, "JPEG", quality=quality)
    return Path(path)


def fill_holes(rgb, hole):
    """Paint over `hole` (0..1) with the colours around it — normalised blurs at a quarter of the size,
    the narrow ones overriding the wide ones wherever they reach. Only ever seen in slivers."""
    h, w = hole.shape
    sw, sh = max(16, w // 4), max(9, h // 4)
    rs = resize(np.asarray(rgb, np.float32), (sw, sh))
    known = (resize(hole, (sw, sh)) < 0.02).astype(np.float32)
    if known.sum() < 10:
        return np.asarray(rgb, np.float32)
    res = np.broadcast_to(rs[known > 0].mean(axis=0), rs.shape).astype(np.float32).copy()
    for sigma in (48, 20, 8, 3):
        num = blur(rs * known[..., None], sigma)
        den = blur(known, sigma)
        est = num / np.maximum(den, 1e-5)[..., None]
        wgt = np.clip(den * 5, 0, 1)[..., None]
        res = res * (1 - wgt) + est * wgt
    return resize(res, (w, h))


def components(m) -> list:
    """Connected regions of a small boolean mask, biggest first: {area, box (px), pix}."""
    h, w = m.shape
    seen = np.zeros_like(m, dtype=bool)
    out = []
    ys, xs = np.nonzero(m)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        stack, pix = [(y, x)], []
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop()
            pix.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        pa = np.array(pix)
        out.append({"area": len(pix), "pix": pa,
                    "box": (int(pa[:, 1].min()), int(pa[:, 0].min()), int(pa[:, 1].max()) + 1, int(pa[:, 0].max()) + 1)})
    return sorted(out, key=lambda c: -c["area"])


def _gate(comps, small_shape, full_shape):
    """A soft full-size mask covering these components (so specks elsewhere drop out)."""
    keep = np.zeros(small_shape, np.float32)
    for c in comps:
        keep[c["pix"][:, 0], c["pix"][:, 1]] = 1.0
    return np.clip(resize(blur(keep, 1.2), (full_shape[1], full_shape[0])) * 4, 0, 1)


# ════════════════════════════════════════════════════════════════════════════
# CUTOUTS — WaveSpeed's background remover, paid once per picture
# ════════════════════════════════════════════════════════════════════════════
_LOCKS: dict = {}
_LOCKS_GUARD = threading.Lock()


def _lock(key) -> threading.Lock:
    with _LOCKS_GUARD:
        return _LOCKS.setdefault(str(key), threading.Lock())


def digest(path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:20]


def cutout(src, cache_dir, log=print) -> Path:
    """The picture with its background removed, as an RGBA PNG (at most 2048 px on its long side)."""
    cache_dir = Path(cache_dir)
    key = digest(src)
    dest = cache_dir / f"cut_{key}.png"
    with _lock(dest):
        if dest.exists() and dest.stat().st_size > 500:
            return dest
        import removebg
        cache_dir.mkdir(parents=True, exist_ok=True)
        im = load_rgb(src)
        im.thumbnail((2048, 2048), Image.LANCZOS)
        up = cache_dir / f"up_{key}.jpg"
        im.save(up, "JPEG", quality=94)
        part = cache_dir / f"cut_{key}.part"
        try:
            # WaveSpeed while its balance allows, kie.ai's remover otherwise (removebg.py)
            removebg.remove(up, part, log=log, label=f"cutout of {Path(src).name}")
            Image.open(part).convert("RGBA").save(dest, "PNG")
        finally:
            part.unlink(missing_ok=True)
            up.unlink(missing_ok=True)
        return dest


def _alpha_for(cut: Path, size) -> np.ndarray:
    """The cutout's alpha at `size` (the picture it was made from may have been larger)."""
    im = Image.open(cut).convert("RGBA")
    if im.size != tuple(size):
        im = im.resize(tuple(size), Image.LANCZOS)
    return np.asarray(im.getchannel("A"), dtype=np.float32) / 255


# ════════════════════════════════════════════════════════════════════════════
# DEPTH — the main subject of an AI still lifts off and grows, the background pulls back
# ════════════════════════════════════════════════════════════════════════════
def depth_parts(alpha) -> tuple:
    """The things a cutout holds, as ([{box, mask}], "") — or ([], why) when it is not a clear subject:
    a speck, a whole room, a crowd, something hanging off the top of the picture."""
    sw, sh = 192, 108
    m = resize(alpha, (sw, sh)) > 0.5
    cov = float(m.mean())
    if cov < 0.025:
        return [], f"the subject is too small ({cov:.0%} of the picture)"
    if cov > 0.6:
        return [], f"the cutout fills {cov:.0%} of the picture"
    comps = components(m)
    big = [c for c in comps if c["area"] >= max(10, 0.08 * comps[0]["area"])]
    if len(big) > 4:
        return [], f"{len(big)} separate things, not one subject"
    if sum(c["area"] for c in big) < 0.85 * m.sum():
        return [], "the cutout is scattered"
    if m[0].mean() > 0.25:
        return [], "the subject hangs off the top of the picture"
    if sum(e > 0.3 for e in (m[-1].mean(), m[:, 0].mean(), m[:, -1].mean())) >= 2:
        return [], "the cutout runs off two sides of the picture"
    parts = []
    for c in big[:3]:
        x0, y0, x1, y1 = c["box"]
        parts.append({"box": [x0 / sw, y0 / sh, x1 / sw, y1 / sh], "comps": [c]})
    for c in big[3:]:                           # a fourth thing rides with the nearest of the three
        cx, cy = (c["box"][0] + c["box"][2]) / 2 / sw, (c["box"][1] + c["box"][3]) / 2 / sh
        near = min(parts, key=lambda p: abs((p["box"][0] + p["box"][2]) / 2 - cx) + abs((p["box"][1] + p["box"][3]) / 2 - cy))
        near["comps"].append(c)
        b = c["box"]
        near["box"] = [min(near["box"][0], b[0] / sw), min(near["box"][1], b[1] / sh),
                       max(near["box"][2], b[2] / sw), max(near["box"][3], b[3] / sh)]
    if max(p["box"][3] - p["box"][1] for p in parts) < 0.22:
        return [], "the subject is too short"
    for p in parts:
        p["mask"] = alpha * _gate(p.pop("comps"), (sh, sw), alpha.shape)
    return parts, ""


def part_motion(box, z0: float = DEPTH_Z0, grow: float = DEPTH_GROW) -> tuple:
    """(anchor x, anchor y, grow) for one part. It grows about a point inside itself — as low as it can,
    so it stays standing where it stands — and never so far that its head leaves the frame. Feet may
    leave at the bottom, a little; a side only where the part already touches it."""
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    top = min(0.02, max(0.0, y0 - 0.005))       # a head already near the top may reach it, never pass it
    for k in range(13):
        g = grow * (1 - k / 13)
        z = z0 * (1 + g)                        # the background ends at 1, so the part ends at z
        if z <= 1.0005:
            break
        ylo, yhi = y0 + 0.12 * bh, min(1.0, y1)
        if y0 > 0.005:
            yhi = min(yhi, (y0 * z - top) / (z - 1))
        ylo = max(ylo, (y1 * z - 1.10) / (z - 1))
        xlo, xhi = x0 + 0.25 * bw, x1 - 0.25 * bw
        if x0 > 0.01:
            xhi = min(xhi, (x0 * z + 0.03) / (z - 1))
        if x1 < 0.99:
            xlo = max(xlo, (x1 * z - 1.03) / (z - 1))
        if ylo <= yhi and xlo <= xhi:
            return min(max((x0 + x1) / 2, xlo), xhi), yhi, g
    return (x0 + x1) / 2, (y0 + y1) / 2, 0.0


def build_depth(image: Path, cut: Path, folder: Path, keyline: str = "#F6F1E8") -> dict:
    """The layers of one depth shot: plate.jpg (the picture with the subject painted out), soft.jpg (the
    same, darker and softer) and one RGBA layer per part — shadow, keyline, the subject itself."""
    folder.mkdir(parents=True, exist_ok=True)
    src = load_rgb(image)
    rgb = np.asarray(cover(src, FILM_W, FILM_H), dtype=np.float32)
    cim = Image.open(cut).convert("RGBA")
    if cim.size != src.size:
        cim = cim.resize(src.size, Image.LANCZOS)
    alpha = np.asarray(cover(cim.getchannel("A").convert("L"), FILM_W, FILM_H), dtype=np.float32) / 255
    parts, why = depth_parts(alpha)
    if not parts:
        return {"ok": False, "why": why}
    for p in parts:
        # something as wide as a truck swelling by the full amount reads as a sticker coming loose
        wide = p["box"][2] - p["box"][0]
        p["motion"] = part_motion(p["box"], grow=DEPTH_GROW * min(1.0, max(0.5, 1.25 - wide)))
    if max(p["motion"][2] for p in parts) < 0.035:
        return {"ok": False, "why": "the subject fills the frame top to bottom — no room to grow"}
    union = np.clip(sum(p["mask"] for p in parts), 0, 1)
    hole = np.clip(blur(dilate(union, 10), 3) * 1.5, 0, 1)
    plate = rgb * (1 - hole[..., None]) + fill_holes(rgb, hole) * hole[..., None]
    save_rgb(plate, folder / "plate.jpg", 95)
    save_rgb(desat(blur(plate, 2.2), 0.18) * 0.84, folder / "soft.jpg", 92)
    line = hex_rgb(keyline) if keyline else None
    out = []
    # drawn back to front: the part whose feet are lowest in the picture is nearest
    for k, p in enumerate(sorted(parts, key=lambda q: q["box"][3])):
        a = p["mask"]
        layer = flat((0, 0, 0), np.roll(blur(a, 16), 14, axis=0) * 0.42)
        if line:
            layer = over(layer, flat(line, np.clip(blur(dilate(a, 3), 0.7), 0, 1) * 0.92))
        layer = over(layer, np.concatenate([rgb, a[..., None]], axis=2))
        save_rgba(layer, folder / f"part{k}.png")
        ax, ay, g = p["motion"]
        out.append({"file": f"part{k}.png", "box": [round(v, 4) for v in p["box"]],
                    "anchor": [round(ax, 4), round(ay, 4)], "grow": round(g, 4)})
    return {"ok": True, "parts": out}


def _follow_zoom(z: str, ax: float, ay: float, sx: str, sy: str) -> str:
    """perspective= that scales a layer by z about its point (ax, ay) and puts that point at (sx, sy) on
    screen — all as fractions, z/sx/sy as per-frame expressions. Moves in fractions of a pixel."""
    def src(a, s, q):
        return f"({a:.5f}+({q}-{s})/{z})"
    return (f"perspective=x0='W*{src(ax, sx, 0)}':y0='H*{src(ay, sy, 0)}':x1='W*{src(ax, sx, 1)}':y1='H*{src(ay, sy, 0)}':"
            f"x2='W*{src(ax, sx, 0)}':y2='H*{src(ay, sy, 1)}':x3='W*{src(ax, sx, 1)}':y3='H*{src(ay, sy, 1)}':"
            f"interpolation=cubic:sense=source:eval=frame")


def render_depth(folder: Path, info: dict, dur: float, out: Path, engine=None, style: str = "",
                 white_fade: float = 0.0) -> None:
    n = max(2, int(round(dur * FPS)))
    # eased in and out, so the subject drifts off the picture instead of jumping at the cut; a short still
    # travels less of the way, so the move is never quicker than over DEPTH_FULL_S
    k = min(1.0, dur / DEPTH_FULL_S)
    z0 = 1 + (DEPTH_Z0 - 1) * k
    e = f"(0.5-0.5*cos(PI*min(on/{n - 1}\\,1)))"
    zb = f"({z0:.4f}-{z0 - 1:.4f}*{e})"
    ins = ["-framerate", str(FPS), "-i", str(folder / "plate.jpg"), "-framerate", str(FPS), "-i", str(folder / "soft.jpg")]
    fc = [f"[0:v]loop=loop=-1:size=1,format=yuv444p[p]",
          f"[1:v]loop=loop=-1:size=1,format=yuva444p,fade=t=in:st={0.1 * dur:.3f}:d={0.6 * dur:.3f}:alpha=1[s]",
          f"[p][s]overlay=format=yuv444,{_follow_zoom(zb, 0.5, 0.5, '0.5', '0.5')}[l0]"]
    for k, part in enumerate(info["parts"]):
        ax, ay = part["anchor"]
        zf = f"({z0:.4f}*(1+{float(part['grow']) * k:.4f}*{e}))"
        # the part's anchor rides on the background, so its feet stay where they stand
        sx, sy = f"(0.5+({ax:.5f}-0.5)*{zb})", f"(0.5+({ay:.5f}-0.5)*{zb})"
        ins += ["-framerate", str(FPS), "-i", str(folder / part["file"])]
        fc.append(f"[{k + 2}:v]loop=loop=-1:size=1,format=yuva444p,{_follow_zoom(zf, ax, ay, sx, sy)}[f{k}]")
        fc.append(f"[l{k}][f{k}]overlay=format=yuv444[l{k + 1}]")
    grade = engine._grade_vf() if engine is not None and hasattr(engine, "_grade_vf") else ""
    fade = engine._white_fade_vf(dur, white_fade) if engine is not None and white_fade and hasattr(engine, "_white_fade_vf") else ""
    # tagged exactly like the engine's plain photo segments: a colour tag that changes between joined
    # segments makes the final pass rebuild its filters mid-video
    fc.append(f"[l{len(info['parts'])}]setsar=1{grade},format=yuv420p{fade},"
              f"setparams=range=unknown:colorspace=unknown:color_trc=unknown:color_primaries=unknown[v]")
    x264 = engine._x264_segment(style) if engine is not None and hasattr(engine, "_x264_segment") else ["-preset", "veryfast", "-crf", "18"]
    threads = str(getattr(engine, "FFMPEG_THREADS", "2"))
    tmp = out.with_name(out.stem + ".part.mp4")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error", *ins, "-filter_complex", ";".join(fc), "-map", "[v]",
                    "-t", f"{dur:.3f}", "-c:v", "libx264", *x264, "-pix_fmt", "yuv420p", "-color_range", "tv",
                    "-r", str(FPS), "-threads", threads, str(tmp)], check=True, capture_output=True)
    tmp.replace(out)


DEPTH_SUBJECTS_PROMPT = """These are [INSERT N HERE] stills from a video, numbered 1 to [INSERT N HERE] in the order the
files were listed. On some of them the main subject will be cut out and slowly lifted off the picture while the
background pulls back. That only looks right on PEOPLE and VEHICLES.

Say yes for a picture whose main subject is a person or a few people (seen whole, or from the waist up), or a car,
truck, van, motorbike, bus, boat or plane, standing clear in front of the background.

Say no for everything else: a close-up of hands, a phone, a screen or a document; a steering wheel, a dashboard or
the inside of a car; food, a desk, an object on a table; a room, a street or a landscape with no clear person or
vehicle in front of it; a person seen only as a shoulder, an arm or the back of a head at the edge of the frame; a
crowd that fills the picture.

Also say no for every OLD photograph, whatever it shows: black-and-white or sepia pictures, faded or yellowed colour
prints, scans of historic or archival photos, mugshots and press photos from before the digital era. Lifting
a cut-out off an old photo looks fake.

Answer ONLY with JSON: {"lift": [the numbers of the pictures that get a yes]}"""


def looks_old(path) -> bool:
    """A still that reads as an old photograph — black-and-white, sepia, or a faded print: the depth pop never
    touches it (the founder 2026-10-04: "don't do the depth pop on the old photos"). Hasler-Süsstrunk colourfulness on a
    small copy: under ~14 the picture is monochrome or toned; a warm cast with little chroma is sepia."""
    try:
        import numpy as np
        im = load_rgb(path)
        im.thumbnail((256, 256))
        a = np.asarray(im, dtype=np.float32)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        rg, yb = r - g, 0.5 * (r + g) - b
        colourful = float(np.hypot(rg.std(), yb.std()) + 0.3 * np.hypot(rg.mean(), yb.mean()))
        return colourful < 14.0 or (colourful < 24.0 and rg.mean() > 4 and yb.mean() > 6 and rg.std() < 9)
    except Exception:                                                  # noqa: BLE001 - unsure: no pop
        return True


def depth_subjects(engine, stills: list, job=None) -> set:
    """Which of these stills (paths, as str) show a person or a vehicle as their main subject — the only
    things the depth pop lifts. Claude looks at them ten at a time; every answer is kept under the picture's
    hash in photofx/depth/subjects.json, so a re-render never asks twice. A still Claude could not judge
    keeps its plain zoom."""
    stills = [Path(s) for s in dict.fromkeys(str(s) for s in stills) if Path(s).is_file()]
    if not stills:
        return set()
    cache = Path(job) / "photofx" / "depth" / "subjects.json" if job else None
    known = {}
    if cache is not None and cache.exists():
        try:
            known = json.loads(cache.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            known = {}
    keys = {s: digest(s) for s in stills}
    todo = [s for s in stills if keys[s] not in known]
    if todo and engine is not None and hasattr(engine, "claude_vision"):
        views = Path(tempfile.mkdtemp(prefix="legion_depth_"))

        def ask(batch):
            files = []
            for k, s in enumerate(batch):
                v = views / f"{k + 1:02d}_{keys[s]}.jpg"
                im = load_rgb(s)
                im.thumbnail((640, 640), Image.LANCZOS)
                im.save(v, "JPEG", quality=85)
                files.append(v)
            try:
                raw = engine.claude_vision(DEPTH_SUBJECTS_PROMPT.replace("[INSERT N HERE]", str(len(batch))),
                                           files, max_tokens=300)
            except Exception as e:                                   # noqa: BLE001
                _log(engine, f"  depth: Claude could not look at {len(batch)} still(s), they keep the plain zoom "
                             f"— {type(e).__name__}: {str(e)[:120]}")
                return {}
            d = _json_obj(raw)
            if not isinstance(d.get("lift"), list):
                _log(engine, f"  depth: no answer about {len(batch)} still(s), they keep the plain zoom")
                return {}
            lift = set()
            for n in d["lift"]:
                try:
                    lift.add(int(n))
                except (TypeError, ValueError):
                    pass
            return {keys[s]: (k + 1) in lift for k, s in enumerate(batch)}

        try:
            with ThreadPoolExecutor(max_workers=3) as ex:
                for got in ex.map(ask, [todo[i:i + 10] for i in range(0, len(todo), 10)]):
                    known.update(got)
        finally:
            shutil.rmtree(views, ignore_errors=True)
        if cache is not None:
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(known, indent=1), encoding="utf-8")
    return {str(s) for s in stills if known.get(keys[s])}


def depth_slots(plan: list, style: str, engine=None, candidates=None, job=None) -> set:
    """The photo slots of a plan that get the depth pop: every Nth still long enough to show it, among
    `candidates` (the slots the engine leaves as plain full-frame stills; None = all) — and only stills
    whose main subject is a person or a vehicle, unless the channel sets `"depth_subjects": "any"`."""
    cfg = settings(style, engine)
    every = cfg["depth_every"]
    if not cfg["depth"] or every <= 0 or not os.environ.get("WAVESPEED_API_KEY"):
        return set()
    allowed = None if candidates is None else set(candidates)
    slots = [i for i, e in enumerate(plan)
             if e[0] == "photo" and e[1] and float(e[3]) >= DEPTH_MIN_S and (allowed is None or i in allowed)]
    old = [i for i in slots if looks_old(plan[i][1])]
    if old:                                     # old photographs never get the pop, on any channel
        _log(engine, f"depth: {len(old)} old photo(s) (black-and-white, sepia or faded) keep the plain move")
        slots = [i for i in slots if i not in set(old)]
    if slots and cfg["depth_subjects"] != "any":
        ok = depth_subjects(engine, [plan[i][1] for i in slots], job)
        kept = [i for i in slots if str(Path(plan[i][1])) in ok]
        _log(engine, f"depth: {len(kept)} of {len(slots)} still(s) show a person or a vehicle")
        slots = kept
    return {i for n, i in enumerate(slots) if n % every == 0}     # the first has it, so a short video shows it too


def depth_segment(engine, image: Path, dur: float, out: Path, job: Path, idx: int = 0, style: str = "",
                  white_fade: float = 0.0) -> bool:
    """One AI still -> a `dur`-second clip with the depth pop. False, with nothing written, when the
    still has no clear subject — the engine then gives it the plain zoom."""
    image = Path(image)
    if not image.is_file():
        return False
    root = job / "photofx" / "depth"
    key = digest(image)
    folder, verdict = root / key, root / f"{key}.json"
    with _lock(verdict):
        info = None
        if verdict.exists():
            try:
                info = json.loads(verdict.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                info = None
        if info is None or (info.get("ok") and not all((folder / f).exists() for f in
                                                         ["plate.jpg", "soft.jpg"] + [p["file"] for p in info["parts"]])):
            cut = cutout(image, job / "photofx" / "cutouts", log=lambda m: _log(engine, m))
            info = build_depth(image, cut, folder, settings(style, engine)["keyline"])
            verdict.write_text(json.dumps(info, indent=1), encoding="utf-8")
            _log(engine, f"  depth: {image.name} — " + (f"{len(info['parts'])} part(s) lifted" if info["ok"]
                                                         else f"keeps its plain zoom ({info['why']})"))
    if not info.get("ok"):
        return False
    render_depth(folder, info, dur, out, engine, style, white_fade)
    return True


# ════════════════════════════════════════════════════════════════════════════
# SCENES — spotlight and objects, drawn in Chromium
# ════════════════════════════════════════════════════════════════════════════
_PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#000;overflow:hidden}
#stage{position:relative;width:__W__px;height:__H__px;overflow:hidden;background:#0b0b0c}
.cam{position:absolute;left:0;top:0;transform-origin:0 0}
.layer{position:absolute;left:0;top:0;max-width:none}
.vig{position:absolute;left:0;top:0;width:__W__px;height:__H__px;opacity:0;
     background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(0,0,0,0) 40%,rgba(0,0,0,.62) 100%)}
.ground{position:absolute;left:0;top:0;width:__W__px;height:__H__px;overflow:hidden}
.bg{position:absolute;left:0;top:0;transform-origin:50% 50%}
.world{position:absolute;left:0;top:0;width:__W__px;height:__H__px;transform-origin:50% 56%}
.thing{position:absolute;left:0;top:0;max-width:none;visibility:hidden}
</style></head><body><div id="stage"></div>
<script>window.SCENE=__SCENE__;window.PFX_W=__W__;window.PFX_H=__H__;</script><script>__JS__</script></body></html>"""


def data_uri(path_or_im, fmt: str = "") -> str:
    if isinstance(path_or_im, Image.Image):
        buf = io.BytesIO()
        fmt = fmt or ("PNG" if path_or_im.mode == "RGBA" else "JPEG")
        path_or_im.save(buf, fmt, **({"quality": 92} if fmt == "JPEG" else {"compress_level": 3}))
        raw, mime = buf.getvalue(), "image/png" if fmt == "PNG" else "image/jpeg"
    else:
        p = Path(path_or_im)
        raw, mime = p.read_bytes(), "image/png" if p.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(raw).decode()}"


def build_html(scene: dict) -> str:
    if scene.get("v") == 2 and V2_JS.exists():
        return _build_html_v2(scene)                        # autostyle v2 scene: v2.js, faces embedded
    return (_PAGE.replace("__W__", str(W)).replace("__H__", str(H)).replace("__SCENE__", json.dumps(scene, separators=(",", ":")))
            .replace("__JS__", (ASSETS / "page.js").read_text(encoding="utf-8")))


def render(jobs: list, workers: int = 2, fps: int = FPS, scale: float = 1.0) -> list:
    """jobs = [(scene, out_mp4)] — the frame-by-frame Chromium loop every Legion scene uses. `scale` < 1 renders
    smaller frames (tests: 0.5 = 960x540)."""
    import motion
    from playwright.sync_api import sync_playwright
    tmp = Path(tempfile.mkdtemp(prefix="photofx_"))
    prepared = [(sc, Path(out), tmp / f"f{i:03d}") for i, (sc, out) in enumerate(jobs)]
    workers = max(1, min(workers, len(prepared)))

    def one(chunk):
        last = None
        for attempt in range(3):
            pw = None
            try:
                with motion._PW_START:
                    pw = sync_playwright().start()
                browser = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-gpu",
                                                   "--font-render-hinting=none"])
                for sc, out, fdir in chunk:
                    if out.exists() and out.stat().st_size > 10_000:
                        continue
                    fdir.mkdir(parents=True, exist_ok=True)
                    page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=scale)
                    errors = []
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.set_content(_page_html(sc), wait_until="load")
                    page.wait_for_function("window.__ready===true", timeout=90000)
                    # a scene is drawn a little past its end — the engine stretches a graphic over a gap
                    # shorter than 2.5 s, and a clip that ran out would start again from its first frame
                    for k in range(max(1, int(round((float(sc["duration"]) + float(sc.get("hold", 0))) * fps)))):
                        page.evaluate("(t)=>window.renderFrame(t)", k / fps)
                        page.screenshot(path=str(fdir / f"f_{k:05d}.jpg"), type="jpeg", quality=93,
                                        clip={"x": 0, "y": 0, "width": W, "height": H})
                    if errors:
                        raise RuntimeError(f"page error: {errors[0][:200]}")
                    part = out.with_name(out.stem + ".part.mp4")
                    motion._frames_to_mp4(fdir, part, fps)
                    part.replace(out)
                    shutil.rmtree(fdir, ignore_errors=True)
                    page.close()
                browser.close()
                return
            except Exception as e:                                  # noqa: BLE001 - driver flakiness
                last = e
                time.sleep(3.0 * (attempt + 1))
            finally:
                if pw is not None:
                    try:
                        pw.stop()
                    except Exception:                               # noqa: BLE001
                        pass
        raise RuntimeError(f"photofx: rendering failed: {last}")

    try:
        with ThreadPoolExecutor(max_workers=workers) as ex:
            list(ex.map(one, [prepared[i::workers] for i in range(workers)]))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return [Path(o) for _, o in jobs]


# ── spotlight ────────────────────────────────────────────────────────────────
def spot_window(size, box) -> tuple:
    """The widest window of a photo at the film's shape (9:16 for a Short), slid toward the subject: (x, y, w, h)."""
    sw, sh = size
    a = W / H
    ww, wh = (sh * a, sh) if sw / sh > a else (sw, sw / a)
    cx, cy = (box[0] + box[2]) / 2 * sw, (box[1] + box[3]) / 2 * sh
    if (box[3] - box[1]) * sh > wh * 0.95:
        # a subject taller than the window (a standing person in a portrait photo): keep its top — the
        # face — in the frame, instead of centring on the chest
        cy = box[1] * sh + wh * 0.46
    x = min(max(0.0, cx - ww / 2), sw - ww)
    y = min(max(0.0, cy - wh / 2), sh - wh)
    return round(x), round(y), round(ww), round(wh)


def spot_crop(size, box) -> tuple:
    """The part of the photo sent to the background remover: the subject with room around it, so it is
    the obvious foreground — (x0, y0, x1, y1) in pixels."""
    sw, sh = size
    bw, bh = (box[2] - box[0]) * sw, (box[3] - box[1]) * sh
    padx, pady = max(bw * 0.45, sw * 0.12), max(bh * 0.25, sh * 0.1)
    return (max(0, round(box[0] * sw - padx)), max(0, round(box[1] * sh - pady)),
            min(sw, round(box[2] * sw + padx)), min(sh, round(box[3] * sh + pady)))


def subject_mask(alpha, box) -> tuple:
    """(mask, share) — the cutout's regions that belong to the subject in `box` (fractions), and how much
    of the box they fill. Regions that only brush the box are someone else."""
    h, w = alpha.shape
    sw, sh = max(32, w // 12), max(18, h // 12)
    m = resize(alpha, (sw, sh)) > 0.5
    bx0, by0, bx1, by1 = box[0] * sw, box[1] * sh, box[2] * sw, box[3] * sh
    ix0, iy0 = bx0 + 0.15 * (bx1 - bx0), by0 + 0.15 * (by1 - by0)
    ix1, iy1 = bx1 - 0.15 * (bx1 - bx0), by1 - 0.15 * (by1 - by0)
    keep = []
    for c in components(m):
        ys, xs = c["pix"][:, 0] + 0.5, c["pix"][:, 1] + 0.5
        inside = ((xs >= ix0) & (xs <= ix1) & (ys >= iy0) & (ys <= iy1)).mean()
        if inside >= 0.2 and c["area"] >= 4:
            keep.append(c)
    if not keep:
        return None, 0.0
    mask = alpha * _gate(keep, (sh, sw), alpha.shape)
    y0, y1 = int(box[1] * h), max(int(box[1] * h) + 1, int(box[3] * h))
    x0, x1 = int(box[0] * w), max(int(box[0] * w) + 1, int(box[2] * w))
    return mask, float((mask[y0:y1, x0:x1] > 0.5).mean())


def spotlight_layers(photo: Path, box, cut: Path, crop, folder: Path, ground: str = "fade", rim: dict = None,
                     pal: dict = None, soft_crop: bool = False) -> dict:
    """plate / dim / soft / subject for one spotlight, and where the camera goes. `cut` is the remover's
    result for `crop` of the photo (None: no cutout — the subject then sits in a soft oval of light).
    autostyle v2: `ground` (SPOT_GROUNDS) is what the photo round the subject turns into, `rim` a glow dict
    {family, strength, color} lighting the cut-out subject, `pal` the look's palette."""
    folder.mkdir(parents=True, exist_ok=True)
    src = load_rgb(photo)
    x, y, ww, wh = spot_window(src.size, box)
    cw = min(2880 if not TALL else 1620, ww)
    ch = round(cw * H / W)
    s = cw / ww
    rgb = np.asarray(src.crop((x, y, x + ww, y + wh)).resize((cw, ch), Image.LANCZOS), dtype=np.float32)
    # the subject box in canvas pixels
    bx0, by0 = (box[0] * src.width - x) * s, (box[1] * src.height - y) * s
    bx1, by1 = (box[2] * src.width - x) * s, (box[3] * src.height - y) * s
    bx0, by0, bx1, by1 = max(0, bx0), max(0, by0), min(cw, bx1), min(ch, by1)
    mask, share = None, 0.0
    if cut is not None:
        full = np.zeros((src.height, src.width), np.float32)
        cx0, cy0, cx1, cy1 = crop
        full[cy0:cy1, cx0:cx1] = _alpha_for(cut, (cx1 - cx0, cy1 - cy0))
        if soft_crop:
            _soften_crop_edges(full, crop)
        a = np.asarray(Image.fromarray(full[y:y + wh, x:x + ww]).resize((cw, ch), Image.BILINEAR), np.float32)
        mask, share = subject_mask(np.clip(a, 0, 1), (bx0 / cw, by0 / ch, bx1 / cw, by1 / ch))
        if mask is not None and share < 0.12:
            mask = None
        if soft_crop and mask is not None:         # autostyle v2: only the named subject is cut out
            mask = _subject_only(mask, (bx0, by0, bx1, by1), rgb,
                                 ((crop[0] - x) * s, (crop[1] - y) * s, (crop[2] - x) * s, (crop[3] - y) * s))
    half = (cw // 2, ch // 2)
    k = cw / W
    if mask is not None:
        hole = np.clip(blur(dilate(mask, max(2, round(6 * k))), 2 * k) * 1.5, 0, 1)
        plate = rgb * (1 - hole[..., None]) + fill_holes(rgb, hole) * hole[..., None]
        subj = np.concatenate([np.clip(desat(rgb, -0.2 if ground == "colour_pop" else -0.08) * 1.03, 0, 255),
                               mask[..., None]], axis=2)
        save_rgba(subj, folder / "subj.png")
        save_rgb(plate, folder / "plate.jpg", 94)
        small = resize(plate, half)
        dim_a = soft_a = None
    else:
        save_rgb(rgb, folder / "plate.jpg", 94)
        small = resize(rgb, half)
        # no cutout: an oval of light around the subject box instead
        yy, xx = np.mgrid[0:half[1], 0:half[0]].astype(np.float32)
        cx, cy = (bx0 + bx1) / 4, (by0 + by1) / 4
        rx, ry = max(8.0, (bx1 - bx0) / 4 * 1.15), max(8.0, (by1 - by0) / 4 * 1.1)   # the whole subject, head included
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        dim_a = soft_a = np.clip((d - 0.85) / 0.6, 0, 1)
    dim = desat(blur(small, 1.2 * k / 2 + 0.6), 0.45) * 0.66
    soft = desat(blur(small, 7.5 * k / 2), 0.6) * 0.52
    if ground and ground != "fade" and ground in SPOT_GROUNDS:
        dim, soft = _ground_layers(ground, plate if mask is not None else rgb, small, k, pal or {}, digest(photo))
        if dim_a is not None and dim_a.shape != dim.shape[:2]:
            dim_a = soft_a = resize(dim_a, (dim.shape[1], dim.shape[0]))
    if dim_a is None:
        save_rgb(dim, folder / "dim.jpg", 90)
        save_rgb(soft, folder / "soft.jpg", 88)
    else:
        save_rgba(np.concatenate([dim, dim_a[..., None]], axis=2), folder / "dim.png")
        save_rgba(np.concatenate([soft, soft_a[..., None]], axis=2), folder / "soft.png")
    bh, bw = (by1 - by0) / ch, (bx1 - bx0) / cw
    zmax = max(1.3, min(2.3, 1.5 * cw / W))
    zoom = min(max(0.8 / max(bh, 0.05), 1.3), 0.9 / max(bw, 0.05), zmax)
    # an archival photo under 1100 px is already enlarged to fill the frame: a gentler push keeps it sharp enough
    zoom = max(1.3, zoom) if cw >= 1100 else 1.14
    geo = {"cw": cw, "ch": ch, "cut": mask is not None, "share": round(share, 3),
           "focus": [round((bx0 + bx1) / 2, 1), round(by0 + 0.42 * (by1 - by0), 1)],
           "anchor": [round((bx0 + bx1) / 2, 1), round((by0 + by1) / 2, 1)], "zoom": round(zoom, 3)}
    win = _clean_window(mask, crop, x, y, s, cw, ch) if soft_crop and mask is not None else None
    return _spot_geo_v2(geo, ground if ground in SPOT_GROUNDS else "fade", rim, mask, rgb, k, folder, win=win)


def spotlight_scene(folder: Path, geo: dict, duration: float = SPOT_DUR, hit: float = SPOT_LEAD,
                    look: dict = None) -> dict:
    ext = "jpg" if (folder / "dim.jpg").exists() and geo["cut"] else "png"
    sc = {"type": "spotlight", "duration": float(duration), "hit": float(hit), "cw": geo["cw"], "ch": geo["ch"],
          "plate": data_uri(folder / "plate.jpg"), "dim": data_uri(folder / f"dim.{ext}"),
          "soft": data_uri(folder / f"soft.{ext}"), "subj": data_uri(folder / "subj.png") if geo["cut"] else None,
          "focus": geo["focus"], "anchor": geo["anchor"], "zoom": geo["zoom"], "creep": 0.04,
          "pop": 1.06 if geo["cut"] else 1.0, "vignette": 0.85, "opaque": bool(geo["cut"]), "hold": HOLD_S}
    if look or geo.get("ground") or geo.get("rim"):
        return _spot_v2(sc, folder, geo, look or {})        # autostyle v2: camera, ground, rim (today's when none)
    return sc


# ── the Kodak contact strip ────────────────────────────────────────────────────
def film_frame(photo: Path, box, out: Path, fw: int = 1500, fh: int = 1000) -> Path:
    """One photo as a black-and-white 35 mm frame: cropped 3:2 around the subject (its face kept high in
    the frame), a cool silver tone, a little more contrast, fine grain."""
    from PIL import ImageEnhance, ImageOps
    src = load_rgb(photo)
    sw, sh = src.size
    ww, wh = (sh * 3 / 2, sh) if sw / sh > 3 / 2 else (sw, sw * 2 / 3)
    bx = ((box[0] + box[2]) / 2 * sw) if box else sw / 2
    by = ((box[1] + box[3]) / 2 * sh) if box else sh / 2
    if box and (box[3] - box[1]) * sh > wh * 0.9:
        by = box[1] * sh + wh * 0.42
    x = min(max(0.0, bx - ww / 2), sw - ww)
    y = min(max(0.0, by - wh / 2), sh - wh)
    im = src.crop((round(x), round(y), round(x + ww), round(y + wh))).resize((fw, fh), Image.LANCZOS)
    g = ImageOps.grayscale(im)
    g = ImageEnhance.Contrast(g).enhance(1.18)
    g = ImageOps.autocontrast(g, cutoff=1)
    t = ImageOps.colorize(g, black=(10, 12, 16), white=(226, 230, 234), mid=(118, 124, 132))
    a = np.asarray(t, dtype=np.float32)
    rng = np.random.default_rng(int(digest(photo)[:8], 16) & 0xFFFF)
    a += rng.normal(0, 5.5, a.shape).astype(np.float32)
    out.parent.mkdir(parents=True, exist_ok=True)
    save_rgb(a, out, 92)
    return out


def strip_scene(frames: list, duration: float = STRIP_DUR, hit: float = STRIP_LEAD, seed: int = 3) -> dict:
    """The scene for `frames` (paths of film frames, first shown first). The first photo lands on `hit`; the
    rest follow, evenly, each with the strip sliding one frame and the camera punching in."""
    n = max(1, len(frames))
    D = float(duration)
    room = max(0.8, D - hit - 1.4)                    # the photos share the time; the last holds a little longer
    at = [round(hit + room * k / n, 2) for k in range(n)]
    # the low frame rate the whole scene moves at, and the code the edge print carries
    return {"type": "strip", "duration": D, "hit": float(hit), "frames": [data_uri(Path(f)) for f in frames],
            "at": at, "fps": 15, "code": "KODAK 5063 TX", "start": 14 + (seed % 11), "hold": HOLD_S}


FACE_PROMPT = """One picture. Where is the main person's FACE? Give the box from the top of the hair to just under the chin,
ear to ear, as fractions of the picture's width and height, left/top/right/bottom. If the picture has no clear face at
least 6% of its height (a crowd, a back, a tiny figure, a drawing), answer null.
Is the picture a DESIGNED graphic rather than a plain photograph — a tribute card, a poster, a collage, a trading card,
a thumbnail with a name or dates printed on it, a screenshot with big text? Then "graphic": true.
Answer ONLY with JSON: {"box": [0.41, 0.12, 0.58, 0.39], "graphic": false} or {"box": null, "graphic": false}"""


def face_box(mv, photo: Path):
    """[x0, y0, x1, y1] (fractions) of the main face in a photo, by a look — one picture per look, so the numbers
    cannot slip between pictures — or None."""
    try:
        raw = mv.claude_vision(FACE_PROMPT, [Path(photo)], max_tokens=100)
        d = _json_obj(raw)
        if d.get("graphic"):
            return None                                          # a tribute card or a poster is not a photograph
        got = d.get("box")
        box = [min(1.0, max(0.0, float(v))) for v in (got or [])][:4]
        if len(box) == 4 and box[2] - box[0] >= 0.04 and box[3] - box[1] >= 0.06:
            return box
    except Exception:                                            # noqa: BLE001 - a face not found is a photo not used
        pass
    return None


def matchcut_scene(mv, picks: list, folder: Path, duration: float = MATCH_DUR, hit: float = MATCH_LEAD, seed: int = 3) -> dict:
    """The match-cut scene from real photos of one person: every face landed on the same spot of the screen at the
    same size, cut fast with a white flash and a shutter on every change, the last one held with a slow push.
    None when fewer than four faces are found."""
    from concurrent.futures import ThreadPoolExecutor
    folder.mkdir(parents=True, exist_ok=True)
    cache_f = folder / "faces.json"
    try:
        cache = json.loads(cache_f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cache = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        boxes = list(ex.map(lambda p: cache.get(str(p["photo"])) or face_box(mv, Path(p["photo"])), picks))
    cache_f.write_text(json.dumps({str(p["photo"]): b for p, b in zip(picks, boxes)}), encoding="utf-8")
    photos = []
    for k, (p, box) in enumerate(zip(picks, boxes)):
        if not box:
            continue
        im = load_rgb(p["photo"])
        w, h = im.size
        if (box[3] - box[1]) * h < 110 or (box[3] - box[1]) > 0.6:   # a face too small to fill a third of the screen, or a face that IS the photo
            continue
        if w > 1800:                                             # what the page needs, not more
            im = im.resize((1800, round(h * 1800 / w)), Image.LANCZOS)
            w, h = im.size
        f = folder / f"match_{k:02d}.jpg"
        im.save(f, quality=90)
        photos.append({"src": data_uri(f), "w": w, "h": h, "box": box})
    if len(photos) < 4:
        return None
    photos = photos[:10]
    # the run lands on the strongest face: one whose photo still fills the screen at the face's size, the biggest
    # and most central of those (a tight portrait would sit small on its blurred backdrop)
    def hero(p):
        b = p["box"]
        sc = (0.36 * H) / max(1e-6, (b[3] - b[1]) * p["h"])
        fills = p["w"] * sc >= W and p["h"] * sc >= H
        return (1 if fills else 0, (b[3] - b[1]) - 0.6 * abs((b[0] + b[2]) / 2 - 0.5))
    last = max(photos, key=hero)
    photos = [p for p in photos if p is not last] + [last]
    n = len(photos)
    D = float(duration)
    step = 0.32 if n >= 8 else 0.36                              # the pace of the cuts; the last photo holds the rest
    at = [round(hit + step * k, 3) for k in range(n)]
    return {"type": "matchcut", "duration": D, "hit": float(hit), "photos": photos, "at": at, "fps": 30,
            "face": {"cx": 0.5, "cy": 0.44, "h": 0.36}}


def textcut_scene(picks: list, lines: list, folder: Path, duration: float = TEXT_DUR, hit: float = TEXT_LEAD,
                  look: dict = None) -> dict:
    """The text match cut: each line of text snaps onto the same spot of the screen on a hard cut to another real
    photo, a hit under every cut, the last line held. None without at least two lines and one photo."""
    lines = [re.sub(r"\s+", " ", str(x)).strip() for x in lines if str(x).strip()][:5]
    if len(lines) < 2 or not picks:
        return None
    folder.mkdir(parents=True, exist_ok=True)
    photos = []
    for k, p in enumerate(picks[:6]):
        try:
            im = load_rgb(p["photo"])
        except Exception:                                        # noqa: BLE001
            continue
        w, h = im.size
        if w > 1800:
            im = im.resize((1800, round(h * 1800 / w)), Image.LANCZOS)
            w, h = im.size
        f = folder / f"text_{k:02d}.jpg"
        im.save(f, quality=90)
        photos.append({"src": data_uri(f), "w": w, "h": h})
    if not photos:
        return None
    D = float(duration)
    n = len(lines)
    step = max(0.55, min(0.8, (D - hit - 1.2) / max(1, n - 1)))
    at = [round(hit + step * k, 3) for k in range(n)]
    sc = {"type": "textcut", "duration": D, "hit": float(hit), "lines": lines, "photos": photos, "at": at, "fps": 30}
    return _textcut_v2(sc, look) if look else sc            # autostyle v2: the look's type (today's when none)


def textcut_marks(sc: dict) -> list:
    """sfx.py: a hit on every cut, the riser into the last one."""
    at = list(sc.get("at") or [0.0])
    return ([[a, "hit_file", -4.0] for a in at] + [[at[-1], "riser_file", -8.0]] + [[float(sc["duration"]), "whoosh_out", -12.0]])


def matchcut_marks(sc: dict) -> list:
    """sfx.py: a shutter on every cut, the riser landing on the last one, a hit under it."""
    if sc.get("mode") == "landmark":
        return landmark_marks(sc)
    if sc.get("mode") == "scenic":
        return scenic_marks(sc)
    at = list(sc.get("at") or [0.0])
    return ([[a, "shutter", -3.0] for a in at] + [[at[-1], "riser_file", -6.0], [at[-1], "hit_file", -3.0]]
            + [[float(sc["duration"]), "whoosh_out", -12.0]])


APEX_PROMPT = """One picture. If it shows a landscape feature with one clear highest point against the sky or the
background (a mountain summit, a peak, a spire, a volcano rim, a lone tower), give the position of that highest point.
JSON only: {"landmark": true, "apex": [x, y]} with x and y as fractions of the picture's width and height (0,0 = top
left). If there is no such point (a close-up, an interior, people, a graphic, text, a flat horizon): {"landmark": false}."""


def _apex_measured(photo: Path):
    """The apex measured in the picture: the sky is the median colour of the top 8 % of rows; land is what differs from
    it AND has texture (smooth cloud does not count); the ridge line is, column by column, the first row from which the
    column stays mostly land; the apex is its highest point in the middle 70 %. None when it touches the top or sits
    low (no sky)."""
    try:
        im = load_rgb(photo)
    except Exception:                                            # noqa: BLE001
        return None
    w0, h0 = im.size
    a = np.asarray(im.resize((480, max(8, round(h0 * 480 / w0))), Image.BILINEAR), dtype=np.float32)
    hh, ww = a.shape[:2]

    def boxf(x, k):
        c = np.cumsum(np.cumsum(np.pad(x, ((k // 2 + 1, k // 2), (k // 2 + 1, k // 2)), mode="edge"), 0), 1)
        return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)
    g = a.mean(axis=2)
    sd = np.sqrt(np.maximum(boxf(g * g, 7) - boxf(g, 7) ** 2, 0))
    band = max(3, int(hh * 0.08))
    sky = np.median(a[:band].reshape(-1, 3), axis=0)
    d = np.sqrt(((a - sky) ** 2).sum(axis=2))
    land = ((sd > max(6.0, 2.5 * float(np.median(sd[:band])))) & (d > 25)) | (d > 110)
    land = boxf(land.astype(np.float32), 5) > 0.5
    run = max(2, int(hh * 0.08))
    rows = np.full(ww, float(hh), np.float32)
    for x in range(ww):
        cs = np.concatenate([[0], np.cumsum(land[:, x])])
        ok = np.where((cs[run:] - cs[:-run])[: hh - run] > 0.7 * run)[0]
        if ok.size:
            rows[x] = ok[0]
    rows = np.convolve(np.pad(rows, (4, 4), mode="edge"), np.ones(9) / 9, mode="valid")
    x0, x1 = int(ww * 0.15), int(ww * 0.85)
    xi = int(np.argmin(rows[x0:x1]) + x0)
    yi = float(rows[xi])
    if yi < hh * 0.04 or yi > hh * 0.75:
        return None
    return (xi + 0.5) / ww, yi / hh


def apex_point(mv, photo: Path):
    """(x, y) fractions of a landmark photo's highest point — by a look (one picture per look), else measured in the
    picture — or None when it has none."""
    try:
        d = _json_obj(mv.claude_vision(APEX_PROMPT, [Path(photo)], max_tokens=80))
        if d.get("landmark") is False:
            return None
        xy = [float(v) for v in (d.get("apex") or [])][:2]
        if len(xy) == 2 and 0.02 <= xy[0] <= 0.98 and 0.02 <= xy[1] <= 0.9:
            return xy[0], xy[1]
    except Exception:                                            # noqa: BLE001 - no look: measure it
        pass
    return _apex_measured(Path(photo))


def landmark_scene(mv, picks: list, folder: Path, duration: float = LANDMARK_DUR, hit: float = LANDMARK_LEAD,
                   step: float = LANDMARK_STEP, n: int = 11) -> dict:
    """The landmark match cut (STRATA's cold open, measured frame by frame): real photos of one kind of landmark, every
    apex on the same point of the screen (LANDMARK_AT), each photo scaled just enough to cover the frame, cut every
    `step` s with no flash, the last (the sharpest) held as the landing. None when fewer than five photos have an apex."""
    from concurrent.futures import ThreadPoolExecutor
    folder.mkdir(parents=True, exist_ok=True)
    cache_f = folder / "apex.json"
    try:
        cache = json.loads(cache_f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cache = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        apexes = list(ex.map(lambda p: cache.get(str(p["photo"])) or apex_point(mv, Path(p["photo"])), picks))
    cache_f.write_text(json.dumps({str(p["photo"]): (list(a) if a else None) for p, a in zip(picks, apexes)}),
                       encoding="utf-8")
    FW, FH = W, H
    tx, ty = LANDMARK_AT[0] * FW, LANDMARK_AT[1] * FH
    photos = []
    for k, (p, ap) in enumerate(zip(picks, apexes)):
        if not ap:
            continue
        try:
            im = load_rgb(p["photo"])
        except Exception:                                        # noqa: BLE001
            continue
        if _padded(im):                                          # a thumbnail on a white canvas flashed as a white frame
            continue
        w, h = im.size
        if w > 2400:
            im = im.resize((2400, round(h * 2400 / w)), Image.LANCZOS)
            w, h = im.size
        ax, ay = float(ap[0]) * w, float(ap[1]) * h
        s = 1.01 * max(tx / max(1.0, ax), (FW - tx) / max(1.0, w - ax), ty / max(1.0, ay), (FH - ty) / max(1.0, h - ay),
                       FW / w, FH / h)
        if s > 2.6:                          # the apex sits too near an edge: blowing the photo up would show pixels
            continue
        f = folder / f"land_{k:02d}.jpg"
        im.save(f, quality=90)
        hf = 0.3 * FH / (s * h)             # page.js scales by the box height: 0.3 * FH / (box height px) = s
        photos.append({"src": data_uri(f), "w": w, "h": h, "s": round(s, 3),
                       "box": [float(ap[0]) - 0.001, float(ap[1]) - hf / 2, float(ap[0]) + 0.001, float(ap[1]) + hf / 2]})
    if len(photos) < 5:
        return None
    hero = min(photos, key=lambda q: q["s"])                    # the landing: the photo that needs the least blow-up
    photos = [q for q in photos if q is not hero][: max(4, n - 1)] + [hero]
    at = [round(hit + step * k, 3) for k in range(len(photos))]
    D = max(float(duration), at[-1] + 1.6)
    return {"type": "matchcut", "mode": "landmark", "duration": D, "hit": float(hit), "photos": photos, "at": at,
            "fps": 30, "face": {"cx": LANDMARK_AT[0], "cy": LANDMARK_AT[1], "h": 0.3},
            "flash": False, "vignette": 0.0, "fade_out": 0.0}


def _padded(im) -> bool:
    """A picture set on a flat canvas (a web thumbnail on white, a letterboxed frame): two or more of its edges are one
    flat colour. A snowfield is bright but textured, so it passes; padding is dead flat."""
    a = np.asarray(im.convert("L").resize((320, max(8, round(320 * im.size[1] / im.size[0])))), dtype=np.float32)
    h, w = a.shape
    k = max(3, int(0.06 * min(h, w)))
    flat = sum(1 for band in (a[:k], a[-k:], a[:, :k], a[:, -k:]) if band.std() < 3.0)
    return flat >= 2


def scenic_scene(mv, picks: list, folder: Path, hit: float = LANDMARK_LEAD, pace: str = "steady",
                 ticks: bool = False, n: int = 11) -> dict:
    """The scenic montage: real photos of one kind of scenery (eroded ranges, reefs, deep-sea life), each covering the
    frame from its centre, cut to the measured pace, the last one held (the steady closing run lands for 1.6 s). None
    with fewer than five usable photos."""
    folder.mkdir(parents=True, exist_ok=True)
    FW, FH = W, H
    photos = []
    for k, p in enumerate(picks):
        try:
            im = load_rgb(p["photo"])
        except Exception:                                        # noqa: BLE001
            continue
        w, h = im.size
        if w < 900 or h < 500 or _padded(im):
            continue
        if w > 2400:
            im = im.resize((2400, round(h * 2400 / w)), Image.LANCZOS)
            w, h = im.size
        s = 1.02 * max(FW / w, FH / h)
        f = folder / f"scenic_{k:02d}.jpg"
        im.save(f, quality=90)
        hf = 0.3 * FH / (s * h)
        photos.append({"src": data_uri(f), "w": w, "h": h, "s": round(s, 3), "box": [0.499, 0.5 - hf / 2, 0.501, 0.5 + hf / 2]})
    if len(photos) < 5:
        return None
    pace = pace if pace in SCENIC_PACE else "steady"
    frames = SCENIC_PACE[pace]
    photos = photos[:max(5, min(n, 12))]
    if len(photos) != len(frames):                               # the measured curve, stretched to the photos found
        m = len(photos)
        frames = [frames[min(len(frames) - 1, round(i * (len(frames) - 1) / max(1, m - 1)))] for i in range(m)]
    at, t = [], float(hit)
    for f_ in frames:
        at.append(round(t, 3))
        t += f_ / 23.976
    D = at[-1] + frames[-1] / 23.976 + SCENIC_HOLD[pace]
    return {"type": "matchcut", "mode": "scenic", "pace": pace, "ticks": bool(ticks), "duration": round(D, 3),
            "hit": float(hit), "photos": photos, "at": at, "fps": 30, "face": {"cx": 0.5, "cy": 0.5, "h": 0.3},
            "flash": False, "vignette": 0.0, "fade_out": 0.0}


def scenic_marks(sc: dict) -> list:
    """A scenic run rides the music (measured: no effect on its cuts), except the run that closes the video: a light
    tick on every cut and a sub hit as the last photo lands (S3b, P5b)."""
    if not sc.get("ticks"):
        return []
    at = list(sc.get("at") or [0.0])
    kit = HERE / "assets" / "sfx" / "es" / "strata"

    def cue(role: str, synth: str) -> str:
        return f"file:sfx/es/strata/{role}_1.wav" if (kit / f"{role}_1.wav").is_file() else synth
    return [[a + 0.01, cue("montage_tick", "tap"), -6.0] for a in at[:-1]] + [[at[-1] + 0.05, cue("section_boom", "hit"), -2.0]]


def landmark_marks(sc: dict) -> list:
    """The landmark run's sound (measured): a reverse swell landing on the first cut, a snap on the first two cuts, a
    light wood tick on every other cut, a bass down (95 -> 44 Hz) 80 ms into the landing. The kit's own recordings
    when installed (assets/sfx/es/strata, the founder's Epidemic licence, never shipped), else the synthesised cues."""
    at = list(sc.get("at") or [0.0])
    kit = HERE / "assets" / "sfx" / "es" / "strata"

    def cue(role: str, synth: str) -> str:
        return f"file:sfx/es/strata/{role}_1.wav" if (kit / f"{role}_1.wav").is_file() else synth
    marks = [[at[0], cue("riser_in", "riser"), -8.0]]
    marks += [[a, cue("montage_snap", "whoosh"), -4.0] for a in at[:2]]
    marks += [[a + 0.01, cue("montage_tick", "tap"), -6.0] for a in at[2:-1]]
    marks += [[at[-1] + 0.08, cue("bass_down", "hit"), 3.0]]
    return marks


def strip_marks(sc: dict) -> list:
    """Where sfx.py puts the shutter and the clicks: on the first photo, then on every change."""
    at = list(sc.get("at") or [0.0])
    return [[at[0], "shutter", -3.0]] + [[a, "click", -5.0] for a in at[1:]] + [[float(sc["duration"]), "whoosh_out", -12.0]]


def tilt_scene(photo: Path, box, folder: Path, duration: float = TILT_DUR, hit: float = SPOT_LEAD) -> dict:
    """A tall real photo filling the width of the frame, the camera travelling down it — from the top of the
    picture to the subject — with a slow push. None when the photo is not tall enough to travel."""
    src = load_rgb(photo)
    sw, sh = src.size
    k = W / sw
    if sh * k < H * 1.22:
        return None
    folder.mkdir(parents=True, exist_ok=True)
    cw = min(2400, sw)
    ch = round(sh * cw / sw)
    src.resize((cw, ch), Image.LANCZOS).save(folder / "plate.jpg", "JPEG", quality=93)
    fy = ((box[1] + box[3]) / 2) if box else 0.5
    return {"type": "tilt", "duration": float(duration), "hit": float(hit), "plate": data_uri(folder / "plate.jpg"),
            "cw": cw, "ch": ch, "focus_y": round(min(0.9, max(0.35, fy)), 3), "hold": HOLD_S}


# ── objects ──────────────────────────────────────────────────────────────────
def _near_box(alpha, box, grow: float) -> tuple:
    """(alpha kept only near the box, whether the object carries on past that crop)."""
    h, w = alpha.shape
    bw, bh = box[2] - box[0], box[3] - box[1]
    x0, x1 = int(max(0.0, box[0] - grow * bw) * w), int(math.ceil(min(1.0, box[2] + grow * bw) * w))
    y0, y1 = int(max(0.0, box[1] - grow * bh) * h), int(math.ceil(min(1.0, box[3] + grow * bh) * h))
    out = np.zeros_like(alpha)
    out[y0:y1, x0:x1] = alpha[y0:y1, x0:x1]
    band = [alpha[y0:y1, x0].mean() if x0 > 0 else 0.0, alpha[y0:y1, x1 - 1].mean() if x1 < w else 0.0,
            alpha[y0, x0:x1].mean() if y0 > 0 else 0.0, alpha[y1 - 1, x0:x1].mean() if y1 < h else 0.0]
    return out, max(band) > 0.12


def thing_from_cut(cut: Path, box=None, max_side: int = 1100, min_side: int = 360) -> Image.Image:
    """The object alone, trimmed to itself: the cutout's regions inside `box` (fractions), or its biggest.
    Raises when it is not one whole, big-enough object — the caller then tries the next photo."""
    im = Image.open(cut).convert("RGBA")
    alpha = np.asarray(im.getchannel("A"), dtype=np.float32) / 255
    if box:
        # a neighbour touching the object is left outside a crop a little wider than the box — unless
        # the box was drawn too tight and the crop would slice the object itself
        near, sliced = _near_box(alpha, box, 0.08)
        if sliced:
            near, sliced = _near_box(alpha, box, 0.25)
        mask, share = subject_mask(alpha if sliced else near, box)
        if mask is None or share < 0.2:
            raise ValueError(f"the cutout does not hold the object ({share:.0%} of its box)")
    else:
        sw, sh = max(32, im.width // 12), max(18, im.height // 12)
        comps = components(resize(alpha, (sw, sh)) > 0.5)
        if not comps:
            raise ValueError("the cutout is empty")
        keep = [c for c in comps if c["area"] >= 0.15 * comps[0]["area"]]
        mask = alpha * _gate(keep, (sh, sw), alpha.shape)
    solid = mask > 0.5
    run_off = max(solid[0].mean(), solid[-1].mean(), solid[:, 0].mean(), solid[:, -1].mean())
    if run_off > 0.03:
        raise ValueError("the object runs off the edge of its photo")
    arr = np.asarray(im, dtype=np.uint8).copy()
    arr[..., 3] = (np.clip(mask, 0, 1) * 255).astype(np.uint8)
    out = upright(Image.fromarray(arr))
    bb = out.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bb:
        raise ValueError("the cutout is empty")
    pad = max(2, round(0.01 * max(bb[2] - bb[0], bb[3] - bb[1])))
    out = out.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(out.width, bb[2] + pad), min(out.height, bb[3] + pad)))
    if min(out.size) < 60 or max(out.size) < min_side:
        raise ValueError(f"the object is only {out.width}×{out.height} px")
    out.thumbnail((max_side, max_side), Image.LANCZOS)
    return out


def upright(im: Image.Image) -> Image.Image:
    """Stand a long thing up straight: a can shot at a slight angle would settle tilted. The long axis
    of the silhouette is turned to the nearest vertical or horizontal when it is off by 1.5 to 20 degrees."""
    a = np.asarray(im.getchannel("A"), dtype=np.float32)
    ys, xs = np.nonzero(a > 128)
    if len(xs) < 400:
        return im
    x, y = xs - xs.mean(), ys - ys.mean()
    cxx, cyy, cxy = float((x * x).mean()), float((y * y).mean()), float((x * y).mean())
    spread = math.sqrt(((cxx - cyy) / 2) ** 2 + cxy ** 2)
    major, minor = (cxx + cyy) / 2 + spread, (cxx + cyy) / 2 - spread
    if minor <= 0 or major / minor < 1.8:          # round things have no axis to straighten
        return im
    theta = 0.5 * math.degrees(math.atan2(2 * cxy, cxx - cyy))
    dev = (theta + 45) % 90 - 45
    if 1.5 <= abs(dev) <= 20:
        im = im.rotate(dev, resample=Image.BICUBIC, expand=True)
    return im


def shadow_of(thing: Image.Image) -> tuple:
    """(shadow picture, scale) — the silhouette blurred, black; drawn under the object, bigger by `scale`."""
    a = thing.getchannel("A")
    k = 260 / max(a.size)
    small = a.resize((max(4, round(a.width * k)), max(4, round(a.height * k))), Image.BILINEAR)
    pad = 36
    canvas = Image.new("L", (small.width + 2 * pad, small.height + 2 * pad), 0)
    canvas.paste(small, (pad, pad))
    sh = np.asarray(canvas, np.float32) / 255
    sh = blur(sh, 9) * 0.9
    out = np.zeros(sh.shape + (4,), np.uint8)
    out[..., 3] = (np.clip(sh, 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(out), (canvas.width / small.width, canvas.height / small.height)


def brand_ground(things: list) -> Image.Image:
    """A ground in the objects' own colours: each object enormous and blurred to soft shapes — one fills
    the frame, two share it left and right — darkened toward the edges."""
    arrs = [np.asarray(t, dtype=np.float32) for t in things[:2]]
    wsum = sum(float((a[..., 3] / 255).sum()) for a in arrs) or 1.0
    mean = sum((a[..., :3] * (a[..., 3:4] / 255)).reshape(-1, 3).sum(axis=0) for a in arrs) / wsum
    base = Image.new("RGB", (W, H), tuple(int(v * 0.32) for v in mean))
    spots = [(0.52, 0.46)] if len(arrs) == 1 else [(0.27, 0.5), (0.75, 0.46)]
    for t, (cx, cy) in zip(things[:2], spots):
        span = 1.35 if len(arrs) == 1 else 0.8
        scale = max(span * W / t.width, 1.6 * H / t.height)
        big = t.resize((max(1, round(t.width * scale)), max(1, round(t.height * scale))), Image.BILINEAR)
        big = big.rotate(-9, resample=Image.BILINEAR, expand=True)
        base.paste(big, (round(W * cx - big.width / 2), round(H * cy - big.height / 2)), big)
    g = blur(np.asarray(base, np.float32), 70)
    g = desat(g, -0.12) * 0.62
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.46) / (H * 0.62)) ** 2)
    g *= np.clip(1.08 - 0.55 * v ** 2, 0.35, 1.0)[..., None]
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))


_OBJ_GROUND = {"path": None}        # set per job from the style (look.photofx.ground) by add_to_timeline


def objects_scene(things: list, layout: str = "solo", accent: Image.Image = None, accent_at: float = 1.5,
                  duration: float = 0.0, look: dict = None) -> dict:
    """Place the things (trimmed RGBA pictures) for a layout and build the scene. `look` (autostyle v2): the
    entrance, glow and label of look.photofx, plus label_text / label_detail / label_n for this moment."""
    def fit(im, max_h, max_w):
        r = im.width / im.height
        h = max_h
        w = h * r
        if w > max_w:
            w, h = max_w, max_w / r
        return round(w), round(h)

    layout = layout if layout in OBJ_DUR else "solo"
    placed = []                                            # (picture, spec)
    if layout == "pair" and len(things) >= 2 and TALL:      # a Short: one above the other
        for i, im in enumerate(things[:2]):
            w, h = fit(im, 0.27 * H, 0.66 * W)
            placed.append((im, {"x": W * 0.5, "y": H * (0.33 if i == 0 else 0.63), "w": w, "h": h,
                                "enter": "left" if i == 0 else "right", "at": 0.12 + 0.32 * i, "rot": -12 if i == 0 else 12}))
    elif layout == "row" and len(things) >= 3 and TALL:     # a Short: a column down the middle
        n = min(4, len(things))
        cell = H * 0.62 / n
        for i, im in enumerate(things[:n]):
            w, h = fit(im, cell * 0.86, 0.6 * W)
            placed.append((im, {"x": W * (0.42 if i % 2 else 0.58), "y": H * 0.2 + cell * (i + 0.5), "w": w, "h": h,
                                "enter": "pop", "at": 0.15 + 0.24 * i, "rot": 10 if i % 2 else -10}))
    elif layout == "pair" and len(things) >= 2:
        for i, im in enumerate(things[:2]):
            w, h = fit(im, 0.54 * H, 0.38 * W)
            placed.append((im, {"x": W * (0.31 if i == 0 else 0.69), "y": H * 0.53, "w": w, "h": h,
                                "enter": "left" if i == 0 else "right", "at": 0.12 + 0.32 * i, "rot": -16 if i == 0 else 16}))
    elif layout == "row" and len(things) >= 3:
        n = min(4, len(things))
        cell = W * 0.84 / n
        for i, im in enumerate(things[:n]):
            w, h = fit(im, (0.44 if n == 3 else 0.38) * H, cell * 0.84)
            placed.append((im, {"x": W * 0.08 + cell * (i + 0.5), "y": H * 0.54, "w": w, "h": h,
                                "enter": "pop", "at": 0.15 + 0.24 * i, "rot": 10 if i % 2 else -10}))
    else:
        hero = things[0]
        if accent is not None:
            layout = "crown"
            w, h = fit(hero, (0.36 if TALL else 0.5) * H, (0.7 if TALL else 0.42) * W)
            y = H * (0.6 if TALL else 0.62)
            placed.append((hero, {"x": W * 0.5, "y": y, "w": w, "h": h, "enter": "rise", "at": 0.12, "rot": -28}))
            aw, ah = fit(accent, 0.25 * H, w * 1.15)
            placed.append((accent, {"x": W * 0.5 + w * 0.02, "y": y - h / 2 - ah / 2 + ah * 0.16, "w": aw, "h": ah,
                                    "enter": "drop", "at": float(accent_at), "rot": -13}))
        else:
            layout = "solo"
            w, h = fit(hero, (0.42 if TALL else 0.6) * H, (0.8 if TALL else 0.52) * W)
            placed.append((hero, {"x": W * 0.5, "y": H * 0.52, "w": w, "h": h, "enter": "rise", "at": 0.12, "rot": -26}))
    items = []
    for im, spec in placed:
        shadow, (kx, ky) = shadow_of(im)
        spec = dict(spec, x=round(spec["x"], 1), y=round(spec["y"], 1), src=data_uri(im, "PNG"), shadow=data_uri(shadow, "PNG"),
                    sw=round(spec["w"] * kx), sh=round(spec["h"] * ky), dx=round(spec["w"] * 0.045, 1),
                    dy=round(spec["h"] * 0.06, 1))
        items.append(spec)
    last = max(it["at"] for it in items)
    dur = float(duration or max(OBJ_DUR[layout], last + 2.6))
    ground_img = None
    if _OBJ_GROUND.get("path"):
        try:
            ground_img = cover(load_rgb(_OBJ_GROUND["path"]))
        except Exception:                                    # noqa: BLE001 - the colour ground then
            ground_img = None
    sc = {"type": "objects", "duration": dur, "bg": data_uri(ground_img if ground_img is not None else brand_ground(things[:2] if layout == "pair" else things[:1]), "JPEG"),
          "items": items, "shadow": 0.72, "layout": layout, "hold": HOLD_S}
    return _objects_v2(sc, [im for im, _ in placed], look) if look else sc


# ════════════════════════════════════════════════════════════════════════════
# SOURCING — find real photos, download them, let Claude choose
# ════════════════════════════════════════════════════════════════════════════
def _host(url: str) -> str:
    return (urlparse(url).netloc or "").lower().removeprefix("www.")


def commons_search(query: str, n: int = 8) -> list:
    import requests
    try:
        r = requests.get("https://commons.wikimedia.org/w/api.php", params={
            "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{query} filetype:bitmap",
            "gsrnamespace": 6, "gsrlimit": n, "prop": "imageinfo", "iiprop": "url|size|mime", "iiurlwidth": 2400},
            headers={"User-Agent": "Legion/3 (video tool; photofx)"}, timeout=30)
        pages = (r.json().get("query") or {}).get("pages") or {}
    except Exception:                                        # noqa: BLE001 - one search source down is not fatal
        return []
    out = []
    for p in sorted(pages.values(), key=lambda p: p.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        if not str(ii.get("mime", "")).startswith("image/") or ii.get("mime") == "image/svg+xml":
            continue
        out.append({"url": ii.get("thumburl") or ii.get("url"), "thumb": ii.get("thumburl") or ii.get("url"),
                    "title": re.sub(r"^File:|\.\w+$", "", p.get("title", "")), "source": "commons.wikimedia.org"})
    return out


# shops and listings: their pictures of a famous car or person are die-cast models, posters and mugs
SHOP_HOSTS = ("ebay.", "ebayimg.", "amazon.", "media-amazon.", "aliexpress.", "alibaba.", "walmart.", "temu.",
              "mercari.", "poshmark.", "worthpoint.", "hobbydb.", "diecast", "replicarz", "etsy.", "allposters.",
              "posterazzi.", "fineartamerica.", "pixels.com", "displate.")
TOY_WORDS = re.compile(r"\b(die-?cast|1[:/]\d{2}|scale model|model kit|replica|toy|lego|hot wheels|funko|poster|"
                       r"canvas print|art print|t-?shirt|mug|sticker|decal|for sale|read me|lot of|slot car|figurine)\b", re.I)


def people_photos(cands: list) -> list:
    """Candidates that can be a real photo of a person or an event: no shop listings, no models or posters."""
    return [c for c in cands if not any(h in (c.get("source", "") + " " + c.get("url", "")).lower() for h in SHOP_HOSTS)
            and not TOY_WORDS.search(c.get("title") or "")]


_SEARCH_GATE = threading.Semaphore(3)      # searches in flight at once, across every module


_IA_PHOTO_COLLECTIONS = {"flickrcommons", "nasa", "library_of_congress", "smithsonian", "usnationalarchives", "nasaarchives",
                         "metropolitanmuseumofart-gallery", "bhl_flickr", "britishlibrary", "geo_flickr", "americana"}
_IA_FREE_LICENCE = ("publicdomain", "/zero/", "licenses/by/", "licenses/by-sa/")


def _archive_images(query: str, log=print, n: int = 8) -> list:
    """[{url, thumb, title, source}] from the Internet Archive's images (free, no key): only items with a free licence or from a
    public-photo collection (NASA, Library of Congress, Flickr Commons, ...). The archive's search finds the items; each one's
    file list gives its largest JPEG/PNG. [] on any failure."""
    import requests
    from concurrent.futures import ThreadPoolExecutor
    q = " ".join(re.sub(r"[^\w\s-]", " ", query or "").split()[:8])
    if not q:
        return []
    try:
        r = requests.get("https://archive.org/advancedsearch.php",
                         params={"q": f"({q}) AND mediatype:image", "fl[]": ["identifier", "title", "licenseurl", "collection"],
                                 "rows": 24, "sort[]": "downloads desc", "output": "json"}, timeout=20)
        docs = r.json()["response"]["docs"] if r.ok else []
    except (requests.RequestException, ValueError, KeyError):
        return []

    def usable(d):
        lic = str(d.get("licenseurl") or "").lower()
        cols = d.get("collection") or []
        cols = [cols] if isinstance(cols, str) else cols
        return any(k in lic for k in _IA_FREE_LICENCE) or any(c in _IA_PHOTO_COLLECTIONS for c in cols)

    def one(d):
        try:
            m = requests.get(f"https://archive.org/metadata/{d['identifier']}", timeout=20).json()
            files = [f for f in (m.get("files") or []) if str(f.get("name", "")).lower().endswith((".jpg", ".jpeg", ".png"))
                     and f.get("source") in ("original", None, "derivative") and "thumb" not in str(f.get("name", "")).lower()
                     and not str(f.get("name", "")).startswith("__ia_thumb")]
            if not files:
                return None
            f = max(files, key=lambda x: int(x.get("size") or 0))
            if int(f.get("size") or 0) < 40000:
                return None
            from urllib.parse import quote
            url = f"https://archive.org/download/{d['identifier']}/{quote(f['name'])}"
            return {"url": url, "thumb": f"https://archive.org/services/img/{d['identifier']}", "title": str(d.get("title") or ""),
                    "source": "archive.org", "page": f"https://archive.org/details/{d['identifier']}"}
        except Exception:                                                 # noqa: BLE001 - one item is never worth the rest
            return None
    pool = [d for d in docs if d.get("identifier") and usable(d)][:12]
    with ThreadPoolExecutor(max_workers=4) as ex:
        got = [c for c in ex.map(one, pool) if c]
    if got:
        log(f"    photofx: {len(got[:n])} photo candidate(s) from the Internet Archive (free, no key)")
    return got[:n]


def _bing_candidates(query: str, log=print, n: int = 16) -> list:
    """[{url, thumb, title, source}] from Bing Images read through Chromium (headlines.bing_images): the keyless last source of
    image_search. Shops and toy/model listings are left out like everywhere else. [] on any failure."""
    try:
        import headlines
        import motion
        from playwright.sync_api import sync_playwright
    except ImportError:
        return []
    import asyncio
    import threading
    try:
        asyncio.get_running_loop()
        on_loop = True                      # inside another sync Playwright: a second one can only start in a thread of its own
    except RuntimeError:
        on_loop = False
    if on_loop:
        box = []
        th = threading.Thread(target=lambda: box.append(_bing_candidates(query, log, n)), daemon=True)
        th.start()
        th.join(120)
        return box[0] if box else []
    try:
        with _SEARCH_GATE:
            with motion._PW_START:
                pw = sync_playwright().start()
            browser = pw.chromium.launch(args=["--disable-gpu", "--force-color-profile=srgb"])
            try:
                got = headlines.bing_images(browser, query[:120], 30)
            finally:
                browser.close()
                pw.stop()
        got = [c for c in got if not any(h in (c.get("source", "") + " " + c["url"]).lower() for h in SHOP_HOSTS)
               and not TOY_WORDS.search(c.get("title") or "")]
        if got:
            log(f"    photofx: {len(got[:n])} photo candidate(s) from Bing Images (no key needed)")
        return got[:n]
    except Exception as e:                                        # noqa: BLE001 - the other sources stand
        log(f"    photofx: Bing Images failed - {str(e)[:100]}")
        return []


def image_search(query: str, n: int = 16, log=print) -> list:
    """[{url, thumb, title, source}] for a query: Brave Image Search (with BRAVE_API_KEY), Algrow's image search,
    then Wikimedia Commons."""
    import requests
    found = []
    bkey = (os.environ.get("BRAVE_API_KEY") or "").strip()
    if bkey:
        # Brave Image Search: the original file with its size, the page it is on and that page's title — the
        # caption that says who is in the photo. safesearch "off": the default "strict" hides news photos of war
        # and disaster. $5 per 1,000 searches, with $5 of credit every month.
        try:
            r = requests.get("https://api.search.brave.com/res/v1/images/search",
                             headers={"X-Subscription-Token": bkey, "Accept": "application/json"},
                             params={"q": query[:200], "count": 30, "safesearch": "off", "spellcheck": "false"},
                             timeout=30)
            if r.status_code == 200:
                for x in r.json().get("results") or []:
                    pr = x.get("properties") or {}
                    full = pr.get("url") or ""
                    if not full.startswith("http"):
                        continue
                    found.append({"url": full, "thumb": (x.get("thumbnail") or {}).get("src") or full,
                                  "title": x.get("title") or "", "source": x.get("source") or _host(x.get("url") or full),
                                  "page": x.get("url") or "", "w": int(pr.get("width") or 0), "h": int(pr.get("height") or 0)})
            else:
                log(f"    photofx: Brave image search HTTP {r.status_code} — {r.text[:100]}")
        except requests.exceptions.RequestException as e:
            log(f"    photofx: Brave image search failed — {str(e)[:100]}")
    key = (os.environ.get("ALGROW_API_KEY") or "").strip()
    if key and len(found) < 8:
        # Algrow allows 30 searches a minute; a strip, a newspaper and a pull line searching side by side reach it,
        # so a 429 waits the seconds it names and asks again instead of coming back empty
        for attempt in range(3):
            try:
                with _SEARCH_GATE:
                    r = requests.post("https://api.algrow.online/api/thumbnails/search-faces",
                                      headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                                      json={"query": query[:120]}, timeout=60)
                if r.status_code == 200:
                    for x in r.json().get("results") or []:
                        if x.get("full"):
                            found.append({"url": x["full"], "thumb": x.get("thumb") or x["full"],
                                          "title": x.get("title") or "", "source": x.get("source") or _host(x["full"])})
                    break
                if r.status_code == 429 and attempt < 2:
                    m = re.search(r"(\d+)\s*s", r.text or "")
                    wait = min(30.0, float(m.group(1)) + 1.0) if m else 12.0
                    log(f"    photofx: image search rate-limited — waiting {wait:.0f} s")
                    time.sleep(wait)
                    continue
                log(f"    photofx: image search HTTP {r.status_code} — {r.text[:100]}")
                break
            except requests.exceptions.RequestException as e:
                log(f"    photofx: image search failed — {str(e)[:100]}")
                break
    if len(found) < 5:
        found += commons_search(query)
    if len(found) < 5 and os.environ.get("PHOTOFX_ARCHIVE", "1").strip() != "0":
        found += _archive_images(query, log)        # the Internet Archive: free, no key, real photographs of people and places
    if len(found) < 5 and os.environ.get("PHOTOFX_BING", "1").strip() != "0":
        found += _bing_candidates(query, log)       # no key, no account: so a paused or missing service never leaves a Short without photos
    seen, out = set(), []
    for c in found:
        where = (c["source"] + " " + c["url"]).lower()
        if c["url"] in seen or any(h in where for h in STOCK_HOSTS):
            continue
        seen.add(c["url"])
        out.append(c)
    return out[:n]


def fetch_image(cand: dict, dest: Path, min_side: int = 300) -> Path:
    """Download one candidate as a JPEG; hosts that refuse us are asked for through Algrow's importer."""
    import requests
    urls = [cand["url"]] + ([cand["thumb"]] if cand.get("thumb") and cand["thumb"] != cand["url"] else [])

    def grab(url):
        g = requests.get(url, headers=_IMG_HEADERS, timeout=30)
        if g.status_code != 200 or len(g.content) < 2000:
            return None
        im = load_rgb(io.BytesIO(g.content))
        return im if min(im.size) >= min_side else None

    for url in urls:
        try:
            im = grab(url)
        except Exception:                                    # noqa: BLE001 - not an image, blocked, timed out
            im = None
        if im is None and url == cand["url"] and (os.environ.get("ALGROW_API_KEY") or "").strip():
            try:
                r = requests.post("https://api.algrow.online/api/thumbnails/import-face",
                                  headers={"Authorization": f"Bearer {os.environ['ALGROW_API_KEY'].strip()}"},
                                  json={"image_url": url, "fallback_url": cand.get("thumb") or url}, timeout=60)
                hosted = (r.json() or {}).get("url") if r.status_code == 200 else None
                im = grab(hosted) if hosted else None
            except Exception:                                # noqa: BLE001
                im = None
        if im is not None:
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.save(dest, "JPEG", quality=93)
            return dest
    return None


def fetch_candidates(query: str, folder: Path, min_side: int, keep: int = 10, log=print, cands=None) -> list:
    """Search, download the first few that are real pictures big enough: [(candidate, path)]."""
    cands = image_search(query, log=log) if cands is None else cands
    folder.mkdir(parents=True, exist_ok=True)

    def one(k_c):
        k, c = k_c
        try:
            p = fetch_image(c, folder / f"cand_{k:02d}.jpg", min_side)
            if p is not None:
                with Image.open(p) as im:
                    c = dict(c, size=list(im.size))
            return c, p
        except Exception:                                    # noqa: BLE001
            return c, None
    with ThreadPoolExecutor(max_workers=6) as ex:
        got = [(c, p) for c, p in ex.map(one, list(enumerate(cands[:max(12, keep + 4)]))) if p is not None]
    return got[:keep]


def captions(cands: list) -> str:
    """What the web says each candidate is, numbered like the images Claude reads."""
    return "\n".join(f"{k}. {c.get('size', ['?', '?'])[0]}×{c.get('size', ['?', '?'])[1]} px — {c.get('source', '')} — "
                     f"{(c.get('title') or '(no caption)')[:140]}" for k, c in enumerate(cands, 1))


PICK_SPOT_PROMPT = """These are [INSERT N HERE] photos an image search found for a documentary video, searched as:
"[INSERT QUERY HERE]". The narration at this moment says: "[INSERT LINE HERE]". The edit shows ONE real photograph
and pushes in on its subject ([INSERT SUBJECT HERE]) while everything else in the photo darkens.

What the web says each photo is:
[INSERT CAPTIONS HERE]

Do not try to recognise anyone from their face. Who is in a photo comes from its caption and the search; you judge
what the photo shows and whether it works on screen. Choose the photos that work, best first:
- a real photograph — not a drawing, render, meme, collage, poster, screenshot or a photo of a screen. Only for a
  person or event from before photography, the well-known painting or engraving of them is the real picture;
- no watermark, no logo stamped on it, no large text laid over it;
- its caption fits the subject, or nothing in it contradicts the search (wrong event, wrong era, wrong thing);
- the subject as the words need them: a childhood, baby or school photo only when the words are about that childhood;
  a photo from another decade than the one being told only when nothing closer exists;
- ONE clear main subject — the person, group or thing the photo is about — big enough, not cut in half;
- room around the subject: a scene, not a tight head-and-shoulders portrait;
- sharp and big: prefer photos at least 1000 px wide; landscape when there is a choice.

Return JSON only:
{"picks": [{"n": 2, "box": [0.41, 0.18, 0.66, 0.97]}, {"n": 5, "box": [0.1, 0.2, 0.4, 0.9]}]}
- "n": the photo's number (1 = the first image you read).
- "box": the main subject in THAT photo — [left, top, right, bottom] as fractions of its width and height
  (0.0 to 1.0), tight around the whole subject. With several people, the one the photo is clearly about:
  in focus, most prominent, or marked by the caption, a name on a shirt, a sign.
- At most 3 picks. {"picks": []} when none of them works."""

PICK_OBJECT_PROMPT = """These are [INSERT N HERE] photos an image search found of: [INSERT THING HERE]. The video cuts the
object out of ONE photo and animates it large on screen, so choose the photos where:
- it is exactly [INSERT THING HERE] — the right brand, model and era, and the iconic version everyone would
  recognise unless the name asks for a particular one — and real: a photograph or an official product shot,
  not a drawing, cartoon, toy, fan art, meme or a picture printed on something;
- ONE of it, whole: not cut off by the edge of the photo, not covered by a hand, not a pack, a group or a row
  (a photo of several still works if one stands clearly apart from the others — box only that one);
- ideally it stands alone on a plain background; no watermark, no text laid over the picture;
- big and sharp — prefer the photos with more pixels.

The photos, in the order you read them:
[INSERT CAPTIONS HERE]

Return JSON only:
{"picks": [{"n": 3, "box": [0.3, 0.1, 0.7, 0.95]}]}
- "n": the photo's number (1 = the first image you read).
- "box": [left, top, right, bottom] tight around the object in THAT photo, as fractions (0.0 to 1.0).
- At most 3 picks, best first. {"picks": []} when none of them shows it properly."""


VERIFY_THING_PROMPT = """These are [INSERT N HERE] cut-out pictures meant to show ONE [INSERT THING HERE], cut out of
photos to be animated on screen. The flat grey around them is not part of them. Choose the best one that is:
- exactly one [INSERT THING HERE] — the right thing, the iconic recognisable version unless the name asks for
  another — not a pack, a group or a row of several;
- whole and cleanly cut: nothing missing, no bits of other objects, hands, shelves or background left on it.

Return JSON only: {"best": 2} (1 = the first image you read), or {"best": 0} when none of them is right."""


def spot_prompt(query: str, line: str, subject: str, cands: list) -> str:
    return (PICK_SPOT_PROMPT.replace("[INSERT QUERY HERE]", query).replace("[INSERT LINE HERE]", line)
            .replace("[INSERT SUBJECT HERE]", subject).replace("[INSERT CAPTIONS HERE]", captions(cands)))


def _json_obj(raw: str) -> dict:
    m = re.search(r"\{.*\}", raw or "", re.DOTALL)
    try:
        return json.loads(m.group(0)) if m else {}
    except ValueError:
        return {}


def ask_picks(mv, prompt: str, files: list) -> list:
    """Claude looks at the candidates: [(index, box)] best first, boxes sane."""
    views = []
    for k, p in enumerate(files):
        v = p.with_name(p.stem + "_view.jpg")
        im = load_rgb(p)
        im.thumbnail((1024, 1024), Image.LANCZOS)
        im.save(v, "JPEG", quality=88)
        views.append(v)
    raw = mv.claude_vision(prompt.replace("[INSERT N HERE]", str(len(files))), views, max_tokens=800)
    out = []
    for pk in (_json_obj(raw).get("picks") or [])[:3]:
        try:
            n = int(pk.get("n"))
            b = [min(1.0, max(0.0, float(v))) for v in pk.get("box")][:4]
        except (TypeError, ValueError):
            continue
        if 1 <= n <= len(files) and len(b) == 4 and b[2] - b[0] > 0.02 and b[3] - b[1] > 0.02:
            out.append((n - 1, b))
    return out


def source_spotlight(mv, m: dict, folder: Path) -> dict:
    """A real photo of the moment's subject, where the subject is, and its cutout — cached in pick.json."""
    subject = str(m.get("subject") or m.get("words") or "the subject")
    query = str(m.get("query") or subject)
    meta = folder / "pick.json"
    if meta.exists():
        try:
            got = json.loads(meta.read_text(encoding="utf-8"))
            # moments are numbered afresh when Claude picks again: only the same search is reused
            if got.get("query") == query and got.get("photo") and Path(got["photo"]).exists():
                return got
        except (OSError, ValueError):
            pass
    # a famous name searched with its moment finds shop listings first (die-cast models of the car it won in):
    # the moment and the plain name are searched side by side, the shops and models dropped, Commons added
    queries = list(dict.fromkeys(q for q in (query, subject, f"{subject} photo") if q.strip()))
    with ThreadPoolExecutor(max_workers=3) as ex:
        found = [c for part in ex.map(lambda q: image_search(q, log=mv.log), queries) for c in part]
    found += commons_search(subject)
    seen, cands = set(), []
    for c in people_photos(found):
        if c["url"] not in seen:
            seen.add(c["url"])
            cands.append(c)
    got = fetch_candidates(query, folder, min_side=640, keep=10, log=mv.log, cands=cands[:18])
    if not got:
        raise ValueError(f"no usable photo found for {query!r}")
    prompt = spot_prompt(query, str(m.get("line") or m.get("words") or ""), subject, [c for c, _ in got])
    picks = ask_picks(mv, prompt, [p for _, p in got])
    if not picks:
        raise ValueError(f"Claude found no photo that shows {subject!r}")
    for i, box in picks:
        cand, photo = got[i]
        src = load_rgb(photo)
        x, y, ww, wh = spot_window(src.size, box)
        if ww < 760:
            mv.log(f"    photofx: {cand['source']} photo is only {ww} px wide — next")
            continue
        crop = spot_crop(src.size, box)
        cp = folder / f"crop_{i:02d}.jpg"
        src.crop(crop).save(cp, "JPEG", quality=94)
        try:
            cut = cutout(cp, folder.parent / "cutouts", log=mv.log)
        except Exception as e:                                # noqa: BLE001 - the oval of light still works
            mv.log(f"    photofx: no cutout ({str(e)[:80]}) — the subject gets an oval of light")
            cut = None
        out = {"photo": str(photo), "box": box, "crop": list(crop), "cut": str(cut) if cut else "",
               "query": query, "source": cand["source"], "url": cand["url"], "title": cand.get("title", "")}
        meta.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
        return out
    raise ValueError(f"every photo of {subject!r} was too small")


PICK_PHOTOS_PROMPT = """These are [INSERT N HERE] photos an image search found for a documentary video, searched as:
"[INSERT QUERY HERE]". The video shows real photographs of [INSERT SUBJECT HERE] — on a strip of 35 mm film, one
after another — so choose up to [INSERT K HERE] DIFFERENT photographs of them, best first.

What the web says each photo is:
[INSERT CAPTIONS HERE]

Do not try to recognise anyone from their face. Who is in a photo comes from its caption and the search; you judge
what the photo shows and whether it works on screen. A photo works when it is:
- a real photograph — not a drawing, render, meme, collage, poster, trading card, screenshot or a photo of a screen;
- no watermark, no logo stamped on it, no large text laid over it;
- its caption or its source page NAMES the subject (a caption about another player, another team's uniform, or no
  caption at all is a no — a wrong person on a film strip is the worst mistake this video can make);
- the subject as the words need them: a childhood, baby or school photo only when the words are about that childhood;
- the subject clearly the main person in it — a portrait, an action shot, a moment — big enough, not cut in half;
- from the right time: when the search names a year or an era, the person must look the age they were then (a
  1968 newspaper cannot carry a photograph of the same man at eighty — an era-true photo first, a later one only when
  nothing else names him);
- sharp and big: prefer photos at least 900 px wide.
Prefer photos that show DIFFERENT moments (a portrait, a game, a ceremony), not three crops of one picture.

Return JSON only:
{"picks": [{"n": 2, "box": [0.41, 0.18, 0.66, 0.97]}, {"n": 5, "box": [0.1, 0.2, 0.4, 0.9]}]}
- "n": the photo's number (1 = the first image you read).
- "box": the subject in THAT photo — [left, top, right, bottom] as fractions (0.0 to 1.0), tight around the person.
- At most [INSERT K HERE] picks. {"picks": []} when none of them works."""


def _phash(path) -> int:
    """A 64-bit average hash of the picture: two copies of one photograph land within a few bits of each other."""
    im = load_rgb(path).convert("L").resize((8, 8), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32)
    bits = (a > a.mean()).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def _same_photo(h1: int, h2: int) -> bool:
    return bin(h1 ^ h2).count("1") <= 3          # two different portraits of one man can sit 5-6 bits apart


def bing_photos(queries: list, folder: Path, n: int = 16, log=print) -> list:
    """[(candidate, path)] — real photos from Bing Images read through Chromium (headlines.bing_images), downloaded
    through the browser session. The second source for a person's pictures, when Algrow's search comes back thin."""
    try:
        import headlines
        import motion
        from playwright.sync_api import sync_playwright
    except ImportError:
        return []
    import asyncio
    import threading
    try:
        asyncio.get_running_loop()
        on_loop = True                                           # inside another sync Playwright (headlines' press
    except RuntimeError:                                         # page asks for the photo): a second one can only
        on_loop = False                                          # start in a thread of its own
    if on_loop:
        box = []
        th = threading.Thread(target=lambda: box.append(bing_photos(queries, folder, n, log)), daemon=True)
        th.start()
        th.join(600)
        return box[0] if box else []
    got = []
    try:
        with motion._PW_START:
            pw = sync_playwright().start()
        browser = pw.chromium.launch(args=["--disable-gpu", "--force-color-profile=srgb"])
        try:
            found, seen = [], set()
            for q in queries:
                for c in headlines.bing_images(browser, q, 20):
                    if c["url"] not in seen and not any(h in (c.get("source", "") + c["url"]).lower() for h in SHOP_HOSTS):
                        seen.add(c["url"])
                        found.append(c)
            found = people_photos(found)
            got = headlines._fetch_via_browser(browser, found[:2 * n], folder, min_side=520, keep=n)
        finally:
            browser.close()
            pw.stop()
    except Exception as e:                                       # noqa: BLE001 - the other source still stands
        log(f"    photofx: Bing photos failed — {str(e)[:100]}")
        return []
    return got


def source_photos(mv, subject: str, query: str, folder: Path, n: int = 3, min_w: int = 640) -> list:
    """Up to `n` real, different photos of `subject`: [{photo, box, source, url, title}] — cached in photos.json.
    No cutout: for the Kodak strip, the tilt and the article line the picture itself is the scene."""
    subject = str(subject or query or "the subject").strip()
    query = str(query or subject).strip()
    meta = folder / "photos.json"
    if meta.exists():
        try:
            got = json.loads(meta.read_text(encoding="utf-8"))
            if got.get("query") == query and all(Path(x["photo"]).exists() for x in got.get("picks") or []):
                return got["picks"][:n]
        except (OSError, ValueError, KeyError, TypeError):
            pass
    queries = list(dict.fromkeys(q for q in (query, subject, f"{subject} photo") if q.strip()))
    with ThreadPoolExecutor(max_workers=3) as ex:
        found = [c for part in ex.map(lambda q: image_search(q, log=mv.log), queries) for c in part]
    found += commons_search(subject)
    seen, cands = set(), []
    for c in people_photos(found):
        if c["url"] not in seen:
            seen.add(c["url"])
            cands.append(c)
    got = fetch_candidates(query, folder, min_side=480, keep=16, log=mv.log, cands=cands[:24])
    big = [g for g in got if load_rgb(g[1]).width >= min_w]
    if len(big) < 6 or n > 4:
        # Algrow's search hands back 500 px copies: Bing's originals (a wire photo, a newspaper's scan) are the size a
        # film frame needs — and a match cut wants many, from many pages
        more = bing_photos([query if query != subject else f"{subject} photo", f"{subject} portrait", f"{subject} 1970s photo"]
                           + ([f"{subject} career photos", f"{subject} young"] if n > 4 else []),
                           folder / "bing", n=max(14, 2 * n), log=mv.log)
        have = {c["url"] for c, _ in got}
        got += [(c, p) for c, p in more if c["url"] not in have]
        if more:
            mv.log(f"    photofx: {len(more)} photo(s) of {subject!r} from Bing")
    got = [g for g in got if load_rgb(g[1]).width >= min(min_w, 560)] or got
    if not got:
        raise ValueError(f"no usable photo found for {query!r}")
    prompt = (PICK_PHOTOS_PROMPT.replace("[INSERT QUERY HERE]", query).replace("[INSERT SUBJECT HERE]", subject)
              .replace("[INSERT K HERE]", str(n)).replace("[INSERT CAPTIONS HERE]", captions([c for c, _ in got])))
    if len(got) <= 10:
        picks = ask_picks(mv, prompt, [p for _, p in got])
        if not picks and len(got) > 8:
            # Claude saw nothing it liked in one batch: the other half of the candidates on their own
            picks = [(i + 8, b) for i, b in ask_picks(mv, prompt.replace("[INSERT N HERE]", str(len(got) - 8)), [p for _, p in got[8:]])]
    else:
        # many candidates (a match cut): looked at eight at a time, so nothing slips between the pictures
        picks = []
        chunks = [list(range(i, min(i + 8, len(got)))) for i in range(0, len(got), 8)]
        with ThreadPoolExecutor(max_workers=2) as ex:
            for base, part in zip([c[0] for c in chunks],
                                  ex.map(lambda c: ask_picks(mv, prompt.replace("[INSERT N HERE]", str(len(c))), [got[i][1] for i in c]), chunks)):
                picks += [(base + i, b) for i, b in part]
    out, hashes = [], []
    for i, box in picks:
        cand, photo = got[i]
        if load_rgb(photo).width < min_w:
            continue
        h = _phash(photo)
        if any(_same_photo(h, x) for x in hashes):
            continue                                          # the same photograph from another site
        hashes.append(h)
        out.append({"photo": str(photo), "box": box, "source": cand["source"], "url": cand["url"],
                    "title": cand.get("title", "")})
    if not out:
        raise ValueError(f"Claude found no photo that shows {subject!r}")
    meta.write_text(json.dumps({"query": query, "picks": out}, indent=1, ensure_ascii=False), encoding="utf-8")
    return out[:n]


def source_photo(mv, subject: str, query: str, folder: Path):
    """One real photo of `subject` (a path), or None."""
    if not (subject or query):
        return None
    try:
        got = source_photos(mv, subject, query, folder, n=1)
    except Exception as e:                                        # noqa: BLE001
        mv.log(f"    photofx: no photo of {subject or query!r} — {str(e)[:100]}")
        return None
    return got[0]["photo"] if got else None


def source_thing(mv, thing: str, folder: Path, cut_dir: Path, min_side: int = 360) -> dict:
    """One object, cut out and trimmed: {png, thing, source, url} — cached in thing.json. A real photo
    first; when no photo of it cuts out cleanly (news photos of a product rarely do), a studio photo of
    the same object is drawn by the image service and cut out instead."""
    try:
        return _source_thing(mv, thing, folder, cut_dir, min_side)
    except ValueError as real_err:
        if not hasattr(mv, "image_gen") or not settings(getattr(mv, "_STYLE_NOW", "") or "", mv)["draw_objects"]:
            raise
        # A Short with AI images switched off in Options draws nothing at all: no real photo of the thing means no object
        # scene (the footage carries that moment), not a paid picture of a guess.
        if getattr(mv, "SHORTS", False) and callable(getattr(mv, "feature", None)) and not mv.feature("ai_images"):
            mv.log(f"    photofx: no real photo of {thing!r}, and AI images are off - no object scene")
            raise
        folder.mkdir(parents=True, exist_ok=True)
        meta = folder / "thing.json"
        drawn = folder / "drawn.jpg"
        try:
            mv.log(f"    photofx: drawing a studio photo of {thing!r} instead ({str(real_err)[:60]})")
            if not drawn.exists():
                # the best real photo found rides along as the reference, so the drawn one keeps the real
                # object's shape, colours and markings (a 1965 race car in its real livery, not a guess)
                refs, ref_note = [], ""
                real = sorted(folder.glob("cand_*.jpg")) + sorted((folder / "more").glob("cand_*.jpg"))
                real = [r for r in real if not r.stem.endswith("_view")]
                if real and ((os.environ.get("WAVESPEED_API_KEY") or "").strip() or (os.environ.get("KIE_API_KEY") or "").strip()):
                    try:
                        import removebg
                        refs = [removebg.host(real[0], folder / "uploads.json")]
                        ref_note = ("Image 1 is a real photo of it: keep its exact shape, proportions, colours, "
                                    "livery, markings and details — only the background and light change. ")
                    except Exception:                         # noqa: BLE001 - drawn from words alone then
                        refs = []
                mv.image_gen(f"{ref_note}A studio product photograph of {thing}: the whole object in frame and "
                             f"centred, filling about half of the picture, true to the real object's design, era "
                             f"and labels, on a plain seamless light grey background, soft even light, sharp "
                             f"focus. No hands, no props, no other objects, no text except what is printed on "
                             f"the object itself.", drawn, label=f"object {thing[:30]}", ref_urls=refs or None)
            im = thing_from_cut(cutout(drawn, cut_dir, log=mv.log), None, min_side=min_side)
        except Exception as e:                                    # noqa: BLE001 - the real error is the one to report
            raise ValueError(f"{real_err} — and no drawn one either ({str(e)[:80]})")
        png = folder / "thing.png"
        im.save(png, "PNG")
        out = {"png": str(png), "thing": thing, "source": "studio photo (drawn)", "url": ""}
        meta.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
        return out


def _source_thing(mv, thing: str, folder: Path, cut_dir: Path, min_side: int = 360) -> dict:
    """A real photo of the object, cut out and trimmed. `min_side`: how many pixels its long side needs
    (a hero fills half the frame, an accent much less)."""
    meta = folder / "thing.json"
    if meta.exists():
        try:
            got = json.loads(meta.read_text(encoding="utf-8"))
            # moments are numbered afresh when Claude picks again: only the same thing is reused
            if got.get("thing") == thing and Path(got.get("png", "")).exists():
                return got
        except (OSError, ValueError):
            pass
    got = fetch_candidates(thing, folder, min_side=min(260, min_side), log=mv.log)
    if len(got) < 5:
        got = (got + fetch_candidates(f"{thing} product photo", folder / "more", min_side=min(260, min_side),
                                     log=mv.log))[:10]
    if not got:
        raise ValueError(f"no usable photo found for {thing!r}")
    prompt = (PICK_OBJECT_PROMPT.replace("[INSERT THING HERE]", thing)
              .replace("[INSERT CAPTIONS HERE]", captions([c for c, _ in got])))
    picks = ask_picks(mv, prompt, [p for _, p in got])
    if not picks:
        raise ValueError(f"Claude found no clean photo of {thing!r}")
    def cut_one(pick):
        i, box = pick
        cand, photo = got[i]
        try:
            return cand, thing_from_cut(cutout(photo, cut_dir, log=mv.log), box, min_side=min_side)
        except Exception as e:                                # noqa: BLE001 - the next pick may do
            mv.log(f"    photofx: {thing!r} from {cand['source']} did not cut out cleanly — {str(e)[:120]}")
            return None
    with ThreadPoolExecutor(max_workers=3) as ex:
        cuts = [c for c in ex.map(cut_one, picks) if c]
    if not cuts:
        raise ValueError(f"no clean cutout of {thing!r}")
    # Claude sees the cutouts themselves: a pack of three cans or a shelf edge left on the object is
    # obvious there, and invisible in any number the code could measure
    views = []
    for k, (cand, im) in enumerate(cuts):
        v = Image.new("RGB", im.size, (128, 128, 128))
        v.paste(im, (0, 0), im)
        v.thumbnail((800, 800), Image.LANCZOS)
        views.append(folder / f"cutout_{k}.jpg")
        v.save(views[-1], "JPEG", quality=90)
    raw = mv.claude_vision(VERIFY_THING_PROMPT.replace("[INSERT N HERE]", str(len(cuts)))
                           .replace("[INSERT THING HERE]", thing), views, max_tokens=300)
    try:
        best = int(_json_obj(raw).get("best") or 0)
    except (TypeError, ValueError):
        best = 0
    if not 1 <= best <= len(cuts):
        raise ValueError(f"none of the cutouts is one clean {thing!r}")
    cand, im = cuts[best - 1]
    png = folder / "thing.png"
    im.save(png, "PNG")
    out = {"png": str(png), "thing": thing, "source": cand["source"], "url": cand["url"]}
    meta.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    return out


# ════════════════════════════════════════════════════════════════════════════
# TIMELINE — which moments, which pictures, the scenes on the words
# ════════════════════════════════════════════════════════════════════════════
MOMENTS_PROMPT = """You are the photo editor of a documentary-style YouTube video. Two kinds of REAL pictures can go on
screen exactly when the narration says something:

SPOTLIGHT — a real photograph of a specific real person, group, place or documented moment ("Steve Jobs on stage
in 2007", "the crowd at the Berlin Wall in 1989") — or, from before photography, its well-known painting. The
camera pushes in on the subject while the rest darkens.
Only public figures, famous places and documented public events — never a private individual, never a fictional,
imagined or hypothetical scene, never "you" or "a man" in a story.

OBJECT — a specific physical thing the narration names: a branded product ("a can of Dr Pepper", "the first
iPhone"), a famous object ("the Hope Diamond"), or a plain object that carries the point ("a gold bar"). It is cut
out of a real photo and flies onto the screen. Layouts:
  "solo"  — one thing.
  "crown" — one thing plus ONE accent object that lands on it and makes the point: a crown for the new king or
            number one, a medal for a rank, a price tag for a price, a trophy for a win.
  "pair"  — two things compared side by side ("Pepsi versus Coke").
  "row"   — three or four things in a row (a line-up of products).

Below is the full voiceover as timed subtitles, one cue per line: #number [minute:second] text.

Pick the moments where one of these makes the point land. Never for abstract ideas, feelings, advice or the
narrator's own reasoning, never twice for the same thing, never for something only hinted at.
At most [INSERT MAX HERE] moments in total, at least [INSERT GAP HERE] seconds apart. Fewer is fine — an empty
array is right for a narration that names nothing concrete.
[INSERT KINDS HERE]

Return a JSON array, one object per moment, like:
{"cue": 12, "words": "Dr Pepper", "kind": "object", "layout": "crown", "things": ["Dr Pepper can"],
 "accent": "silver crown", "accent_words": "new king"}
{"cue": 30, "words": "Steve Jobs walked on stage", "kind": "spotlight", "subject": "Steve Jobs",
 "query": "Steve Jobs Macworld 2007 keynote stage"}

- "cue": the number of the cue in which it is SPOKEN.
- "words": 1 to 5 words exactly as written in that cue, copied letter for letter.
- "kind": "spotlight" or "object".
- spotlight "subject": who or what to push in on, as the photo would show it ("Steve Jobs", "the protester
  in front of the tanks"); "query": what to type into an image search — names, place, year, occasion.
- object "things": 1 to 4 short image-search phrases, each naming exactly ONE physical thing, specific enough to
  find the right one ("Pepsi can", "Rolex Submariner watch", "1 kg gold bar"). "layout" as above.
  "accent" and "accent_words" only for "crown": the accent object as a search phrase, and 1 to 4 words, from the
  same cue or the next, where it should land.

TRANSCRIPT:
[INSERT TRANSCRIPT HERE]
"""


def _fold(s) -> str:
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _stamp_s(sec: float) -> str:
    sec = max(0, int(sec))
    return f"{sec // 60}:{sec % 60:02d}"


def _find_cue(entries: list, n: int, words: str) -> int:
    key = _fold(words)
    if not key:
        return n if 0 <= n < len(entries) else -1
    order = sorted(range(max(0, n - 6), min(len(entries), n + 7)), key=lambda i: abs(i - n))
    for i in order:
        if key in _fold(entries[i][2]):
            return i
    for i in order:
        if i + 1 < len(entries) and key in _fold(entries[i][2] + " " + entries[i + 1][2]):
            return i
    return -1


def _word_time(words: str, cue: tuple, mv) -> float:
    st, en, txt = cue
    timed = mv._cue_words(txt, st, en)
    want = [_fold(w) for w in str(words or "").split() if _fold(w)]
    if not timed or not want:
        return st
    folded = [_fold(w["w"]) for w in timed]
    for i in range(len(folded)):
        if folded[i:i + len(want)] == want:
            return float(timed[i]["t"])
    for i, f in enumerate(folded):
        if f and f == want[0]:
            return float(timed[i]["t"])
    return st


def _overlaps(a0, a1, windows, margin=2.0) -> bool:
    return any(a0 < w1 + margin and w0 - margin < a1 for w0, w1 in windows)


def plan_moments(srt: Path, job: Path, cfg: dict, force: bool, total: float, mv) -> list:
    cache = job / "photofx" / "moments.json"
    if cache.exists() and not force:
        try:
            return json.loads(cache.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    entries = mv._parse_srt_full(srt.read_text(encoding="utf-8"))
    most = max(1, int(total / cfg["every_s"]))
    kinds = ("" if cfg["spotlight"] and cfg["objects"] else
             "Only OBJECT moments this time — no spotlights." if cfg["objects"] else
             "Only SPOTLIGHT moments this time — no objects.")
    if (cfg.get("v2") or {}).get("label") not in (None, "none") and cfg["objects"]:
        kinds += LABEL_NOTE                        # autostyle v2: a small label prints the object's name and one fact
    prompt = (MOMENTS_PROMPT.replace("[INSERT MAX HERE]", str(most))
              .replace("[INSERT GAP HERE]", str(int(cfg["gap_s"]))).replace("[INSERT KINDS HERE]", kinds)
              .replace("[INSERT TRANSCRIPT HERE]",
                       "\n".join(f"#{i + 1} [{_stamp_s(st)}] {txt}" for i, (st, en, txt) in enumerate(entries))))
    mv.log(f"photofx: Claude is looking for real people, places and things worth a photo (up to {most})...")
    moments = [m for m in mv._json_items(prompt, max_tokens=max(2500, most * 300)) if isinstance(m, dict)]
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(moments, indent=2, ensure_ascii=False), encoding="utf-8")
    return moments


def build_scene(mv, m: dict, k: int, out_dir: Path, start: float) -> tuple:
    """(file stem, scene) for one moment: sources its pictures (cached) and lays the scene out."""
    folder = out_dir / f"m{k:02d}"
    look = m.get("_look") or None                  # autostyle v2 (look.photofx keys); None = today's scenes
    if m["kind"] == "textcut":
        subject = str(m.get("subject") or m.get("words") or "")
        lines = m.get("lines") or []
        try:
            picks = source_photos(mv, subject, str(m.get("query") or subject), folder, n=5, min_w=560)
        except Exception as e:                                   # noqa: BLE001
            mv.log(f"  photofx: skipped text cut {_stamp_s(m['_at'])} — {str(e)[:80]}")
            return None, None
        sc = textcut_scene(picks, lines, folder / "text", float(m.get("_dur") or TEXT_DUR), max(0.3, float(m["_at"]) - start),
                           look=look)
        if sc:
            mv.log(f"  photofx: text cut {_stamp_s(m['_at'])} — {' / '.join(sc['lines'])} over {len(sc['photos'])} photo(s) of {subject!r}")
            return f"textcut_{k:02d}", sc
        mv.log(f"  photofx: skipped text cut {_stamp_s(m['_at'])} — no lines or no photo")
        return None, None
    if m["kind"] == "matchcut":
        subject = str(m.get("subject") or m.get("words") or "")
        cfg_ = settings(str(getattr(mv, "_STYLE_NOW", "") or ""), mv)
        if str(m.get("mode") or "").lower() == "scenic" and str(cfg_.get("matchcut_mode") or "").lower() == "landmark":
            picks = source_photos(mv, subject, str(m.get("query") or subject), folder, n=int(m.get("n") or 11) + 3,
                                  min_w=900)
            hit = 0.0                              # mid-video: the first photo is on screen from the clip's first frame
            sc = scenic_scene(mv, picks, folder / "scenic", hit, pace=str(m.get("pace") or "steady").lower(),
                              ticks=bool(m.get("ticks")), n=int(m.get("n") or 11)) if picks else None
            if sc:
                mv.log(f"  photofx: scenic montage {_stamp_s(m['_at'])} — {len(sc['photos'])} photos of {subject!r}, "
                       f"{sc['pace']}{', ticking' if sc['ticks'] else ''}")
                return f"match_{k:02d}", sc
            mv.log(f"  photofx: scenic montage {_stamp_s(m['_at'])} — under five usable photos of {subject!r}")
            return None, None
        if str(m.get("mode") or cfg_.get("matchcut_mode") or "face").lower() == "landmark":
            picks = source_photos(mv, subject, str(m.get("query") or subject), folder, n=int(m.get("n") or 11) + 3,
                                  min_w=900)
            hit = max(0.3, float(m["_at"]) - start)
            sc = landmark_scene(mv, picks, folder / "landmark",
                                min(float(m.get("_dur") or LANDMARK_DUR), LANDMARK_DUR + 1.0), hit,
                                step=float(cfg_.get("matchcut_step") or LANDMARK_STEP), n=int(m.get("n") or 11)) if picks else None
            if sc:
                mv.log(f"  photofx: landmark match cut {_stamp_s(m['_at'])} — {len(sc['photos'])} photos of {subject!r}, "
                       f"every apex on one spot")
                return f"match_{k:02d}", sc
            # too few summits with a clear apex: the same photos as a steady scenic run — never the face run or the
            # Kodak strip, which are other channels' looks (the strip opened a STRATA test video)
            sc = scenic_scene(mv, picks, folder / "scenic", hit, pace="accelerate", n=int(m.get("n") or 11)) if picks else None
            if sc:
                mv.log(f"  photofx: landmark match cut {_stamp_s(m['_at'])} — under five clear apexes: a scenic run of "
                       f"{len(sc['photos'])} photos instead")
                return f"match_{k:02d}", sc
            mv.log(f"  photofx: landmark match cut {_stamp_s(m['_at'])} — under five usable photos, left out")
            return None, None
        picks = source_photos(mv, subject, str(m.get("query") or subject), folder, n=int(m.get("n") or 10), min_w=560)
        hit = max(0.4, float(m["_at"]) - start)
        sc = matchcut_scene(mv, picks, folder / "match", float(m.get("_dur") or MATCH_DUR), hit, seed=k) if picks else None
        if sc:
            mv.log(f"  photofx: match cut {_stamp_s(m['_at'])} — {len(sc['photos'])} faces of {subject!r} on one spot "
                   f"({', '.join(sorted({p['source'] for p in picks}))})")
            return f"match_{k:02d}", sc
        if getattr(mv, "SHORTS", False) and os.environ.get("PHOTOFX_SHORTS_STRIP", "0").strip() != "1":
            # the Kodak strip is a 16:9 film band: in a vertical frame it is a small strip with black above and below. A Short
            # shows the person full frame instead: the spotlight (the camera pushes in on the subject, the rest falls to dark)
            try:
                m2 = dict(m, kind="spotlight", subject=subject, _dur=min(float(m.get("_dur") or SPOT_DUR), SPOT_DUR))
                got = source_spotlight(mv, m2, folder)
                geo = spotlight_layers(Path(got["photo"]), got["box"], Path(got["cut"]) if got.get("cut") else None,
                                       got["crop"], folder / "layers", **_spot_kw(look))
                mv.log(f"  photofx: under four clear faces of {subject!r} at {_stamp_s(m['_at'])} - a full-frame push-in on "
                       f"one photo from {got['source']} instead of the 16:9 Kodak strip")
                return f"spot_{k:02d}", spotlight_scene(folder / "layers", geo, float(m2.get("_dur") or SPOT_DUR), hit, look=look)
            except Exception as e:                                # noqa: BLE001 - nothing for this moment: the footage carries it
                mv.log(f"  photofx: no full-frame photo of {subject!r} ({str(e)[:80]}) - left out")
                return None, None
        if len(picks) >= 2:                                      # too few faces: the strip, which needs no face
            mv.log(f"  photofx: match cut {_stamp_s(m['_at'])} — under four clear faces of {subject!r}; a Kodak strip instead")
            frames = [film_frame(Path(p["photo"]), p.get("box"), folder / "film" / f"frame_{i}.jpg") for i, p in enumerate(picks[:3])]
            return f"strip_{k:02d}", strip_scene(frames, float(m.get("_dur") or STRIP_DUR), max(0.5, hit), seed=k)
        mv.log(f"  photofx: skipped match cut {_stamp_s(m['_at'])} — no usable photos of {subject!r}")
        return None, None
    if m["kind"] == "strip":
        subject = str(m.get("subject") or m.get("words") or "")
        picks = source_photos(mv, subject, str(m.get("query") or subject), folder, n=int(m.get("n") or 3))
        if len(picks) < 2:
            # one photo is not a strip — and one photo of a lesser-known name is too often a namesake's (an obituary
            # site once supplied the only "photo" of a witness): the scene is dropped, the footage carries the moment
            mv.log(f"  photofx: skipped strip {_stamp_s(m['_at'])} — only {len(picks)} photo of {subject!r} found")
            return None, None
        frames = [film_frame(Path(p["photo"]), p.get("box"), folder / "film" / f"frame_{i}.jpg") for i, p in enumerate(picks)]
        hit = max(0.5, float(m["_at"]) - start)
        mv.log(f"  photofx: Kodak strip {_stamp_s(m['_at'])} — {len(frames)} photo(s) of {subject!r} "
               f"({', '.join(sorted({p['source'] for p in picks}))})")
        return f"strip_{k:02d}", strip_scene(frames, float(m.get("_dur") or STRIP_DUR), hit, seed=k)
    if m["kind"] == "spotlight" and m.get("_tilt"):
        # a tall portrait: the camera travels down it instead of pushing in (look.photofx.spot_move: "tilt")
        try:
            picks = source_photos(mv, str(m.get("subject") or m.get("words") or ""), str(m.get("query") or ""), folder, n=3)
            tall = next((p for p in picks if (lambda im: im.height / im.width)(load_rgb(p["photo"])) >= 0.69), None)
            sc = tilt_scene(Path(tall["photo"]), tall.get("box"), folder / "tilt", float(m.get("_dur") or TILT_DUR),
                            max(0.5, float(m["_at"]) - start)) if tall else None
            if sc:
                mv.log(f"  photofx: portrait tilt {_stamp_s(m['_at'])} — {m.get('subject')!r} from {tall['source']}")
                return f"tilt_{k:02d}", sc
        except Exception as e:                                    # noqa: BLE001 - the spotlight still works
            mv.log(f"    photofx: no tall photo for a tilt ({str(e)[:80]}) — spotlight instead")
    if m["kind"] == "spotlight":
        got = source_spotlight(mv, m, folder)
        geo = spotlight_layers(Path(got["photo"]), got["box"], Path(got["cut"]) if got.get("cut") else None,
                               got["crop"], folder / "layers", **_spot_kw(look))
        hit = max(0.5, float(m["_at"]) - start)
        mv.log(f"  photofx: spotlight {_stamp_s(m['_at'])} — {m.get('subject')!r} from {got['source']}"
               + ("" if geo["cut"] else " (no clean cutout: oval of light)"))
        return f"spot_{k:02d}", spotlight_scene(folder / "layers", geo, float(m.get("_dur") or SPOT_DUR), hit, look=look)
    things = [str(t) for t in (m.get("things") or []) if str(t).strip()][:4] or [str(m.get("words"))]
    layout = str(m.get("layout") or "solo")
    wanted = things[:1] if layout in ("solo", "crown") else things
    with ThreadPoolExecutor(max_workers=3) as ex:
        # a row shares the frame four ways, so its things need fewer pixels than a hero
        need = 360 if len(wanted) <= 2 else 280
        futs = [ex.submit(source_thing, mv, t, folder / f"t{i}", out_dir / "cutouts", need) for i, t in enumerate(wanted)]
        acc_f = (ex.submit(source_thing, mv, str(m["accent"]), folder / "accent", out_dir / "cutouts", 220)
                 if layout == "crown" and m.get("accent") else None)
        got = []
        for f in futs:
            try:
                got.append(f.result())
            except Exception as e:                                  # noqa: BLE001
                mv.log(f"    photofx: {str(e)[:140]}")
        accent = None
        if acc_f is not None:
            try:
                accent = acc_f.result()
            except Exception as e:                                  # noqa: BLE001 - the thing alone still lands
                mv.log(f"    photofx: no accent — {str(e)[:120]}")
    if not got:
        raise ValueError("none of the things could be found and cut out")
    pics = [Image.open(g["png"]).convert("RGBA") for g in got]
    if layout == "pair" and len(pics) < 2 or layout == "row" and len(pics) < 3:
        layout = "solo"
    acc_at = float(m.get("_accent_at", start + 1.5)) - start
    sc = objects_scene(pics, layout, Image.open(accent["png"]).convert("RGBA") if accent else None, acc_at,
                       duration=float(m.get("_dur") or 0.0), look=_obj_look(look, m, got, k))
    mv.log(f"  photofx: {sc['layout']} {_stamp_s(m['_at'])} — " + ", ".join(g["thing"] for g in got)
           + (f" + {accent['thing']}" if accent else "") + f" ({', '.join(sorted({g['source'] for g in got}))})")
    return f"objects_{k:02d}", sc


def add_to_timeline(segs: list, srt: Path, job: Path, style: str, force: bool, total: float = 0.0,
                    workers: int = 2, engine=None) -> list:
    """PHOTO FX's entry point from the engine: real photos and real objects at the words that name them.

    A regular graphic in the way gives way; the opening caption and any scene another DLC placed on a word
    do not — a photo scene that would land on one is dropped."""
    _g = settings(style, engine).get("ground") if engine is not None else ""
    _OBJ_GROUND["path"] = str(HERE / "assets" / _g) if _g and (HERE / "assets" / _g).exists() else None
    if engine is None:
        import make_video as engine
    mv = engine
    cfg = settings(style, mv)
    if not (cfg["spotlight"] or cfg["objects"]) or not srt.exists() or not (ASSETS / "page.js").exists():
        return segs
    # spotlights and objects need the background remover; strips, match cuts and text cuts (a directed video's
    # moments) need no cut-out, so they run without the key
    cuts = bool((os.environ.get("WAVESPEED_API_KEY") or "").strip())
    if not cuts:
        mv.log("photofx: WAVESPEED_API_KEY is not in .env — photo spotlights and objects need its background remover"
               + ("; strips, match cuts and text cuts still run" if (job / "director.json").exists() and
                  (cfg["strip"] or cfg["matchcut"] or cfg["textcut"]) else ""))
        if not ((job / "director.json").exists() and (cfg["strip"] or cfg["matchcut"] or cfg["textcut"])):
            return segs
    look = cfg.get("v2") or {}                       # autostyle v2 keys ({} = today's scenes)
    total = float(total or mv._audio_dur(job / "audio.mp3"))
    out_dir = job / "photofx"
    out_dir.mkdir(parents=True, exist_ok=True)
    blocked = [(float(s), float(s) + float(d)) for s, p, d in segs if Path(p).name.startswith(PROTECTED)]
    # a directed video (director.py) spaced its scenes itself: only a real collision counts
    pad = 0.0 if (job / "director.json").exists() else 1.0
    moments = plan_moments(srt, job, cfg, force, total, mv)
    if not moments:
        mv.log("photofx: nothing in this narration needs a real photo")
        return segs
    entries = mv._parse_srt_full(srt.read_text(encoding="utf-8"))

    timed = []
    tilt_n = [0]
    for k, m in enumerate(moments):
        kind = str(m.get("kind")) if str(m.get("kind")) in ("spotlight", "strip", "matchcut", "textcut") else "object"
        if kind == "textcut" and not cfg["textcut"]:
            kind = "spotlight"
        if kind == "matchcut" and not cfg["matchcut"]:
            kind = "strip"
        if kind == "strip" and not cfg["strip"]:
            kind = "spotlight"
        if not cfg["spotlight" if kind in ("spotlight", "strip", "matchcut", "textcut") else "objects"]:
            continue
        if not cuts and kind in ("spotlight", "object"):
            continue
        try:
            n = int(m.get("cue") or 0) - 1
        except (TypeError, ValueError):
            n = -1
        i = _find_cue(entries, n, m.get("words") or "")
        # the director already timed this moment word by word (director.py): trust it over a text match
        if m.get("at_s") is not None:
            try:
                _t = float(m["at_s"])
                i = next((c for c, e in enumerate(entries) if e[0] - 0.05 <= _t < e[1] + 0.05), len(entries) - 1)
            except (TypeError, ValueError):
                _t = None
        else:
            _t = None
        if i < 0:
            mv.log(f"  photofx: skipped {m.get('words')!r} — not found in the subtitles near cue {n + 1}")
            continue
        at = _t if _t is not None else _word_time(m.get("words") or "", entries[i], mv)
        m = dict(m, kind=kind, _at=at, line=entries[i][2])
        if look:
            m["_look"] = look
        dur = (SPOT_DUR if kind == "spotlight" else STRIP_DUR if kind == "strip" else MATCH_DUR if kind == "matchcut"
               else TEXT_DUR if kind == "textcut" else OBJ_DUR.get(str(m.get("layout")), OBJ_DUR["solo"]))
        obj_lead = OBJ_LEAD
        if kind == "object" and look:
            # a slow entrance (a turntable, a plinth rising) starts earlier, so the thing has landed when it is named
            obj_lead = _obj_lead(look, str(m.get("layout") or "solo"))
            if obj_lead > OBJ_LEAD:
                m["_lead_extra"] = round(obj_lead - OBJ_LEAD, 3)
                dur += obj_lead - OBJ_LEAD
        landmark = kind == "matchcut" and str(cfg.get("matchcut_mode") or "").lower() == "landmark"
        if landmark:
            # STRATA's runs are not the face match cut: the landmark run is 3.4 s, a scenic montage about 4.5 s — with
            # the face run's 4.6 s the cold open's run collided with the map 4 s in and was left out
            dur = 4.6 if str(m.get("mode") or "").lower() == "scenic" else LANDMARK_DUR
        if kind in ("spotlight", "strip", "matchcut", "textcut") and m.get("dur") and not landmark:
            # a photo squeezed between two scenes (the director's plan says how long it has) runs shorter
            dur = min(dur + 1.0, max(3.2, float(m["dur"])))
        if kind == "spotlight" and cfg["spot_move"] == "tilt":
            # every other spotlight travels down a tall portrait when one is found
            tilt_n[0] += 1
            if tilt_n[0] % 2 == 1:
                m["_tilt"] = True
        start = max(0.3, at - (SPOT_LEAD if kind == "spotlight" else STRIP_LEAD if kind == "strip"
                                else LANDMARK_LEAD if landmark else MATCH_LEAD if kind == "matchcut"
                                else TEXT_LEAD if kind == "textcut" else obj_lead))
        if kind == "object" and str(m.get("layout")) == "crown" and m.get("accent"):
            # the accent lands on its own words — the scene runs long enough for that, within reason
            acc = start + 1.5
            key = _fold(m.get("accent_words"))
            for j in (i, i + 1):
                if key and 0 <= j < len(entries) and key in _fold(entries[j][2]):
                    acc = _word_time(m.get("accent_words"), entries[j], mv) - 0.35
                    break
            m["_accent_at"] = min(max(start + 1.1, acc), start + 5.2)
            dur = max(dur, m["_accent_at"] - start + 2.4)
        timed.append((start, dur, k, i, m))
    timed.sort(key=lambda x: x[0])

    chosen, last_end = [], -1e9
    for start, dur, k, i, m in timed:
        ex = float(m.get("_lead_extra") or 0.0)
        if ex and (_overlaps(start, start + dur, blocked, pad) or
                   start < last_end + (0.3 if m.get("at_s") is not None else cfg["gap_s"])):
            # no room for the slow entrance before the name: the thing rises in quickly instead
            start, dur, m = start + ex, dur - ex, dict(m, _enter_quick=True)
        if "_accent_at" in m and (_overlaps(start, start + dur, blocked, pad) or start + dur > total - 0.3):
            # waiting for the accent's words made the scene long; the crown landing early still fits
            short = OBJ_DUR["crown"]
            if not _overlaps(start, start + short, blocked, pad):
                m, dur = dict(m, _accent_at=start + 1.5), short
        if start + dur > total - 0.3:
            continue
        if _overlaps(start, start + dur, blocked, pad):
            mv.log(f"  photofx: skipped {_stamp_s(m['_at'])} — another scene is on screen there")
            continue
        # the director spaced its scenes itself (a hook cuts from one to the next): only a real overlap counts
        if start < last_end + (0.3 if m.get("at_s") is not None else cfg["gap_s"]):
            mv.log(f"  photofx: skipped {_stamp_s(m['_at'])} — too close to the photo before it")
            continue
        chosen.append((start, dur, k, i, dict(m, _dur=dur)))
        last_end = start + dur

    def make(row):
        start, dur, k, i, m = row
        try:
            name, sc = build_scene(mv, m, k, out_dir, start)
            return start, k, name, sc
        except Exception as e:                                      # noqa: BLE001 - one photo is never worth the rest
            mv.log(f"  photofx: skipped {_stamp_s(m['_at'])} {m.get('subject') or m.get('things')} — {str(e)[:160]}")
            return None
    with ThreadPoolExecutor(max_workers=3) as ex:
        # a scene that came back empty (an object whose cutout held nothing) is left out on its own — it used to
        # take every other photo scene of the video down with it
        scenes = [s for s in ex.map(make, chosen) if s and s[3]]
    if not scenes:
        mv.log("photofx: no photo scene could be made this time")
        return segs

    jobs, placed = [], []
    for start, k, name, sc in scenes:
        mp4, stamp_f = out_dir / f"{name}.mp4", out_dir / f"{name}.stamp"
        if sc.get("type") == "strip":
            mp4.with_suffix(".sfx.json").write_text(json.dumps(strip_marks(sc)), encoding="utf-8")
        if sc.get("type") == "matchcut":
            mp4.with_suffix(".sfx.json").write_text(json.dumps(matchcut_marks(sc)), encoding="utf-8")
        if sc.get("type") == "textcut":
            mp4.with_suffix(".sfx.json").write_text(json.dumps(textcut_marks(sc)), encoding="utf-8")
        stamp = hashlib.sha256(json.dumps(sc, sort_keys=True).encode()).hexdigest()
        if sc.get("v") == 2 and V2_JS.exists():
            # a v2 scene is also re-drawn when its renderer changes (today's scenes keep today's stamp)
            stamp += ":" + hashlib.sha256(V2_JS.read_bytes()).hexdigest()[:12]
        if force or not mp4.exists() or not stamp_f.exists() or stamp_f.read_text(encoding="utf-8") != stamp:
            mp4.unlink(missing_ok=True)
            stamp_f.write_text(stamp, encoding="utf-8")
            jobs.append((sc, mp4))
        placed.append((start, mp4, float(sc["duration"])))
    if jobs:
        mv.log(f"photofx: rendering {len(jobs)} photo scene(s) in Chromium...")
        render(jobs, workers=workers)
    placed = [p for p in placed if p[1].exists()]
    kept = [(s, p, d) for s, p, d in segs
            if Path(p).name.startswith(PROTECTED) or not _overlaps(float(s), float(s) + float(d),
                                                                  [(a, a + b) for a, _, b in placed], margin=0.0)]
    mv.log(f"photofx: {len(placed)} photo scene(s) on screen — " + ", ".join(
        f"{_stamp_s(s)} {n.split('_')[0]}" for s, _, n, _ in scenes[:8]))
    return sorted(kept + [(s, str(p), d) for s, p, d in placed], key=lambda x: float(x[0]))


# ════════════════════════════════════════════════════════════════════════════
# AUTOSTYLE V2 — a look per title (look.photofx keys written by lookreg/objects.adapt)
# ════════════════════════════════════════════════════════════════════════════
# What the photo round a spotlit subject turns into (SPOT_GROUNDS), how the camera moves (SPOT_CAMS), a light on the
# subject's edge and round every object in the title's ONE glow family, how objects enter (ENTRANCES, each with its
# own lead so the thing has landed when its name is said), a label on the object (OBJECT_LABELS) and the text cut's
# type (TEXTCUTS). A scene that uses any of them is marked "v": 2 and drawn by assets/photofx/v2.js — a superset of
# page.js, which is left exactly as it is, so a style without these keys renders as before, byte for byte. A v2 page
# embeds every face it names: the farm's pods have no system fonts.
V2_JS = ASSETS / "v2.js"
SPOT_VIGNETTE = {"colour_pop": 0.75, "duotone": 0.6, "blur_deep": 0.8, "halftone": 0.5, "paper": 0.38}
# the title's glow family as the light on a spotlit PERSON: only under-light (behind them, in the picture) — an edge
# light, a coloured outline or a film fringe drawn round a cut-out person reads as a sticker (reviewer 10-03)
SPOT_LIGHT = {"none": "none", "soft": "soft", "bloom": "bloom", "halo": "halo", "rim": "halo", "neon": "halo",
              "halation": "none"}
STAGE_ENTRANCES = ("turntable", "float", "plinth_rise", "drop", "pop")   # pairs and rows take these too
TEXTCUT_DEFAULTS = {     # "default" = today's text cut; the look swaps its font, accent, place and effect
    "default": {"font": "Inter Display Black", "weight": 900, "accent": "#F26D21", "ink": "#FFFFFF", "place": "left",
                "fx": "chroma", "flash": 0.85, "bright": 0.62, "sat": 0.85, "rule": True, "track": -0.015},
    "serif_quiet": {"font": "EB Garamond", "weight": 500, "accent": "#C9A46A", "ink": "#F4EFE6", "place": "lower",
                    "fx": "none", "flash": 0.0, "bright": 0.5, "sat": 0.7, "rule": True, "track": 0.03},
    "glow_line": {"font": "Roboto Condensed", "weight": 300, "accent": "#8FD8FF", "ink": "#FFFFFF", "place": "center",
                  "fx": "glow", "flash": 0.0, "bright": 0.4, "sat": 0.55, "rule": False, "track": 0.1},
    # stamp: matte archive prints (v2.js greys them) with oxblood ink multiplied onto them — not red on a dark photo
    "stamp_word": {"font": "Saira Stencil One", "weight": 400, "accent": "#9B2C24", "ink": "#9B2C24", "place": "center",
                   "fx": "stamp", "flash": 0.0, "bright": 1.08, "sat": 0.0, "rule": False, "track": 0.08},
}
TEXTCUT_PLACES = ("left", "center", "lower", "right")
TEXTCUT_FX = ("chroma", "glow", "none", "stamp")
LABEL_FONTS = {"serif": "EB Garamond", "cond": "Oswald", "mono": "Courier Prime", "stamp": "Saira Stencil One",
               "body": "Inter SemiBold"}
LABEL_NOTE = """
An OBJECT moment may also carry "label": the thing's proper name as a museum label would print it (2 to 5 words,
e.g. "Remington 700", "New Coke") and "label_detail": ONE plain fact about it that the narration states or that is
certain — a year, a maker, a figure (e.g. "1963 · .30-06 Springfield", "April 23, 1985"). Never the narration's own
sentence, never a guess; leave "label_detail" empty when unsure."""
_LEGACY_FACES = {"textcut": (("Inter Display", 900, "InterDisplay-Black.ttf"),),
                 "strip": (("Inter", 600, "Inter-SemiBold.ttf"), ("Inter", 700, "Inter-Bold.ttf"))}
_FONT_ROWS: dict = {}
_SYS_FONTS: dict = {}


def _hexok(v) -> str:
    v = str(v or "").strip()
    return v if re.fullmatch(r"#[0-9a-fA-F]{6}", v) else ""


def _glow_spec(gl) -> dict:
    """{"family", "strength", "color"} of one glow dict, checked; None when it is not one."""
    if not isinstance(gl, dict):
        return None
    fam = str(gl.get("family") or "none").lower()
    if fam not in OBJECT_GLOWS:
        return None
    try:
        st = max(0.0, min(1.0, float(gl.get("strength", 0.6))))
    except (TypeError, ValueError):
        st = 0.6
    return {"family": fam, "strength": round(st, 3), "color": _hexok(gl.get("color")) or "#FFE7C2"}


def textcut_style(tc: dict) -> dict:
    """A whole text-cut style from a partial one: the id's own defaults under the look's font, weight, accent, ink,
    place and effect."""
    tc = tc if isinstance(tc, dict) else {}
    tid = str(tc.get("id") or "default")
    tid = tid if tid in TEXTCUTS else "default"
    st = dict(TEXTCUT_DEFAULTS[tid], id=tid)
    if isinstance(tc.get("font"), str) and tc["font"].strip():
        st["font"] = tc["font"].strip()
    try:
        if tc.get("weight"):
            st["weight"] = max(100, min(900, int(tc["weight"])))
    except (TypeError, ValueError):
        pass
    for key in ("accent", "ink"):
        if _hexok(tc.get(key)):
            st[key] = _hexok(tc[key])
    if tc.get("place") in TEXTCUT_PLACES:
        st["place"] = tc["place"]
    if tc.get("fx") in TEXTCUT_FX:
        st["fx"] = tc["fx"]
    g = _glow_spec(tc.get("glow"))
    if g:
        st["glow"] = g
    return st


def _v2_settings(cfg: dict) -> dict:
    """The autostyle v2 keys of a style's look.photofx, checked — {} when it has none (today's scenes everywhere)."""
    out = {}
    for key, allowed in (("spot_ground", SPOT_GROUNDS), ("spot_cam", SPOT_CAMS), ("entrance", ENTRANCES),
                         ("label", OBJECT_LABELS)):
        v = str(cfg.get(key) or "").strip().lower()
        if v in allowed:
            out[key] = v
    if cfg.get("label_kicker"):
        out["label_kicker"] = re.sub(r"\s+", " ", str(cfg["label_kicker"])).strip()[:24]
    g = _glow_spec(cfg.get("glow"))
    if g:
        out["glow"] = g
    if isinstance(cfg.get("textcut_style"), dict):
        out["textcut_style"] = textcut_style(cfg["textcut_style"])
    for key in ("palette", "fonts"):
        if isinstance(cfg.get(key), dict):
            out[key] = {str(a): str(b) for a, b in cfg[key].items() if isinstance(b, (str, int, float))}
    return out


# ── fonts: embedded, so a pod draws what this Mac draws ───────────────────────
def _font_rows() -> dict:
    """{family: [rows]} of the bundled faces, from lookreg/fonts.json (file, weight, variable, italic)."""
    if not _FONT_ROWS:
        try:
            rows = json.loads((HERE / "lookreg" / "fonts.json").read_text(encoding="utf-8")).get("fonts") or []
        except (OSError, ValueError, AttributeError):
            rows = []
        for r in rows:
            if isinstance(r, dict) and r.get("family") and r.get("file"):
                _FONT_ROWS.setdefault(r["family"], []).append(r)
    return _FONT_ROWS


def font_css(families) -> str:
    """@font-face rules that embed the bundled files of these families (base64), upright faces only; a family with a
    static file of its own never also embeds a variable one. Unknown families are skipped — the page's own fallback
    stack takes over."""
    rows, css, seen = _font_rows(), [], set()
    for fam in dict.fromkeys(str(f) for f in families if f):
        cands = [r for r in rows.get(fam) or [] if not r.get("italic") and (HERE / r["file"]).is_file()]
        if any(not r.get("variable") for r in cands):
            cands = [r for r in cands if not r.get("variable")]
        for r in cands:
            if r["file"] in seen:
                continue
            seen.add(r["file"])
            wt = "1 1000" if r.get("variable") else str(int(r.get("weight") or 400))
            b64 = base64.b64encode((HERE / r["file"]).read_bytes()).decode()
            css.append(f"@font-face{{font-family:'{fam}';src:url(data:font/ttf;base64,{b64});font-weight:{wt};"
                       f"font-style:normal;font-display:block}}")
    return "".join(css)


def _scene_families(scene: dict) -> list:
    fams = [v for v in (scene.get("fonts") or {}).values() if isinstance(v, str)]
    st = scene.get("style") if isinstance(scene.get("style"), dict) else {}
    if st.get("font"):
        fams.append(st["font"])
    return fams


def _build_html_v2(scene: dict) -> str:
    """The page of a v2 scene: today's page frame, the faces it names embedded, drawn by v2.js."""
    data = json.dumps(scene, separators=(",", ":")).replace("</", "<\\/")
    return (_PAGE.replace("__W__", str(W)).replace("__H__", str(H)).replace("<style>", "<style>" + font_css(_scene_families(scene)), 1)
            .replace("__SCENE__", data).replace("__JS__", V2_JS.read_text(encoding="utf-8")))


def _installed(name: str) -> bool:
    """Whether this machine has a font file of this name installed (the user's or the system's font folders)."""
    if name not in _SYS_FONTS:
        home = Path.home()
        dirs = [home / "Library" / "Fonts", Path("/Library/Fonts"), home / ".fonts", home / ".local" / "share" / "fonts",
                Path(os.environ.get("WINDIR") or "C:/Windows") / "Fonts"]
        if os.environ.get("LOCALAPPDATA"):
            dirs.append(Path(os.environ["LOCALAPPDATA"]) / "Microsoft" / "Windows" / "Fonts")
        _SYS_FONTS[name] = any((d / name).is_file() for d in dirs)
    return _SYS_FONTS[name]


def _page_html(sc: dict) -> str:
    """What render() loads: build_html — and for today's text cut and Kodak strip, on a machine WITHOUT the Inter
    faces their type names installed (a render pod, which drew them in Liberation Sans), the bundled files embedded.
    Where they are installed (the founder's Mac) the page stays as it is: a system face and the same file embedded are
    rasterised a little differently by Chromium (measured: the text cut's line ~3 % wider), so today's frames stay."""
    html = build_html(sc)
    faces = _LEGACY_FACES.get(str(sc.get("type"))) if sc.get("v") != 2 else None
    css = ""
    for fam, wt, name in faces or ():
        f = HERE / "assets" / "fonts" / name
        if f.is_file() and not _installed(name):
            css += (f"@font-face{{font-family:'{fam}';src:url(data:font/ttf;base64,"
                    f"{base64.b64encode(f.read_bytes()).decode()});font-weight:{wt};font-style:normal;font-display:block}}")
    return html.replace("<style>", "<style>" + css, 1) if css else html


# ── spotlight: grounds, rim light, camera ─────────────────────────────────────
def erode(alpha, px: int):
    return 1.0 - dilate(1.0 - np.clip(alpha, 0, 1), px)


def _cap(a, max_w: int = 2400):
    h, w = a.shape[:2]
    return a if w <= max_w else resize(a, (max_w, max(2, round(h * max_w / w))))


def _norm_gray(rgb):
    g = gray(rgb) / 255
    lo, hi = np.percentile(g, (1.5, 98.5))
    return np.clip((g - lo) / max(1e-3, float(hi - lo)), 0, 1)


def _duotone(rgb, dark, light):
    """A printed duotone: the picture's tones mapped from the dark ink to the light one."""
    g = _norm_gray(rgb) ** 1.05
    d, l_ = np.asarray(dark, np.float32), np.asarray(light, np.float32)
    return d + (l_ - d) * g[..., None]


def _halftone(rgb, ink, paper, period: float, angle: float = 45.0):
    """The picture printed as a newspaper halftone: round dots on a 45-degree screen, their size from the tone."""
    g = _norm_gray(blur(rgb, period * 0.3))
    cov = np.clip((1.0 - g) ** 1.1 * 0.97, 0, 1)
    h, w = g.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    c, s = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    u = (xx * c + yy * s) / period
    v = (yy * c - xx * s) / period
    del xx, yy
    fu, fv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
    d = np.sqrt(fu * fu + fv * fv) * period
    a = np.clip(period * np.sqrt(cov / math.pi) - d + 0.5, 0, 1)
    return np.asarray(paper, np.float32) * (1 - a[..., None]) + np.asarray(ink, np.float32) * a[..., None]


def _paper_tex(h: int, w: int, seed: str, base) -> np.ndarray:
    """A sheet of paper: soft mottling, fine tooth, a few long fibres, a little darker toward the edges."""
    rng = np.random.default_rng(int(str(seed)[:8] or "7", 16) & 0xFFFFFFFF)
    low = resize(blur(rng.normal(0, 1, (max(9, h // 16), max(16, w // 16))).astype(np.float32), 2.5), (w, h))
    low = low / max(1e-6, float(np.abs(low).max()))
    fine = blur(rng.normal(0, 1, (h, w)).astype(np.float32), 0.7)
    fine = fine / max(1e-6, float(fine.std()) * 3)
    fib = resize(blur(rng.normal(0, 1, (max(9, h // 2), max(8, w // 28))).astype(np.float32), 0.6), (w, h))
    fib = fib / max(1e-6, float(fib.std()) * 3)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    vig = 1.0 - 0.07 * (((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / 2
    lum = (1.0 + 0.035 * low + 0.018 * fine + 0.012 * fib) * vig
    return np.clip(np.asarray(base, np.float32)[None, None, :] * lum[..., None], 0, 255)


def _ground_layers(ground: str, base, small, k: float, pal: dict, seed: str) -> tuple:
    """(dim, soft) for a spot ground other than today's "fade": what the photo round the subject turns into as the
    word lands (dim), and what it settles to (soft). base = the whole canvas (subject painted out when it is cut),
    small = it at half size, k = canvas width / 1920."""
    if ground == "colour_pop":                  # the world goes silver, the subject keeps its colour
        g = np.clip((gray(blur(small, 0.5 * k + 0.5)) - 128) * 1.06 + 128, 0, 255)
        return np.repeat(g[..., None], 3, axis=2) * 0.82, np.repeat(gray(blur(small, 3.5 * k))[..., None], 3, axis=2) * 0.6
    if ground == "duotone":
        dark, light = hex_rgb(pal.get("duo_dark"), (13, 22, 34)), hex_rgb(pal.get("duo_light"), (232, 220, 196))
        return (_duotone(blur(small, 0.5 * k + 0.5), dark, light) * 0.97,
                _duotone(blur(small, 4.0 * k), dark, light) * 0.8)
    if ground == "blur_deep":                   # a long lens: the world simply falls out of focus
        return desat(blur(small, 5.0 * k), 0.08) * 0.88, desat(blur(small, 14.0 * k), 0.15) * 0.72
    if ground == "halftone":
        a = _cap(np.asarray(base, np.float32))
        ht = _halftone(a, hex_rgb(pal.get("ink_print"), (24, 21, 17)), hex_rgb(pal.get("paper"), (226, 218, 200)),
                       max(5.0, a.shape[1] / 250.0))
        return ht * 0.93, ht * 0.7
    if ground == "paper":                       # the photo becomes a print on paper and pales; the subject stays whole
        a = _cap(np.asarray(base, np.float32))
        tex = _paper_tex(a.shape[0], a.shape[1], seed, hex_rgb(pal.get("paper"), (231, 223, 206)))
        tone = (1.0 - _norm_gray(blur(a, 0.6)))[..., None]
        ink = np.asarray(hex_rgb(pal.get("ink_print"), (38, 32, 25)), np.float32)
        return (tex * (1 - tone * 0.62) + ink * tone * 0.62) * 0.97, (tex * (1 - tone * 0.24) + ink * tone * 0.24) * 0.96
    return desat(blur(small, 1.2 * k / 2 + 0.6), 0.45) * 0.66, desat(blur(small, 7.5 * k / 2), 0.6) * 0.52


def _saturate(col, amount: float = 1.35):
    c = np.asarray(col, np.float32)
    return np.clip(c.mean() + (c - c.mean()) * amount, 0, 255)


def _rim_layers(rgb, mask, rim: dict, k: float, folder: Path) -> dict:
    """The title's glow family as light on a spotlit subject (a real person): rim_under.png, a light or a shade BEHIND
    them, drawn in the picture under the cut-out. Never a line or band on or round their edge (that reads as a
    sticker): edge families arrive here as the halo (SPOT_LIGHT), and nothing is drawn over the subject. {} for none."""
    g = _glow_spec(rim)
    if not g or g["strength"] <= 0.01:
        return {}
    fam, s = SPOT_LIGHT.get(g["family"], "none"), min(1.6, g["strength"] / 0.6)
    if fam == "none":
        return {}
    col = np.asarray(hex_rgb(g["color"], (255, 231, 194)), np.float32)
    lite = col + (255 - col) * 0.25
    m = np.clip(mask, 0, 1).astype(np.float32)
    h, w = m.shape
    half = (max(16, w // 2), max(9, h // 2))
    mh = resize(m, half)

    def wide(sig, grow=0.0):
        a = dilate(mh, max(1, round(grow * k / 2))) if grow else mh
        return np.clip(blur(a, sig * k / 2), 0, 1)
    under = top = None
    if fam == "halo":                           # a soft round light behind the subject, like a museum spot
        under = flat(lite, wide(60, 24) * 0.34 * s)
    elif fam == "soft":                         # a dark halo that lifts the subject off the picture
        under = flat((0, 0, 0), wide(30, 4) * 0.42 * s)
    elif fam == "bloom":                        # light spilling from behind the subject into the picture, wide and warm
        under = over(flat(lite, wide(70, 20) * 0.22 * s), flat(lite, wide(30, 6) * 0.2 * s))
    out = {"family": fam}
    if under is not None:
        save_rgba(under, folder / "rim_under.png")
        out["under"] = "rim_under.png"
    if top is not None:
        save_rgba(top, folder / "rim_over.png")
        out["over"] = "rim_over.png"
    return out if len(out) > 1 else {}


def _seam(cost) -> np.ndarray:
    """The column of the cheapest top-to-bottom path through `cost` (h, w), one step of at most 1 px per row."""
    h, w = cost.shape
    acc = cost.astype(np.float64).copy()
    back = np.zeros((h, w), np.int8)
    cols = np.arange(w)
    for yy in range(1, h):
        prev = acc[yy - 1]
        cand = np.stack([np.r_[np.inf, prev[:-1]], prev, np.r_[prev[1:], np.inf]])
        kk = np.argmin(cand, axis=0)
        acc[yy] += cand[kk, cols]
        back[yy] = kk - 1
    xs = np.zeros(h, np.int64)
    xs[-1] = int(np.argmin(acc[-1]))
    for yy in range(h - 1, 0, -1):
        xs[yy - 1] = xs[yy] + back[yy, xs[yy]]
    return xs


def _subject_only(mask, box, rgb=None, crop=None) -> np.ndarray:
    """v2 spotlights: only the named subject stays cut out. The remover keeps whatever stood in its crop — half of the
    next person, a hand, a bottle — joined to the subject in one region. On each side where the cut-out runs on past
    the subject box, it is cut along the cheapest path near the box edge — through the gap between two people, a thin
    arm, or along the photo's own edge between two overlapping bodies — never a straight line; what lies beyond stays
    in the photo, under the ground, instead of floating over a painted-out hole (the plate is painted out under this
    mask only). Above the box it fades out; below it nothing is cut (a body runs on out of the frame).
    box = (x0, y0, x1, y1) canvas px; rgb = the canvas photo (its edges guide the path); crop = the remover's crop in
    canvas px (its faded border is no gap)."""
    h, w = mask.shape
    x0, y0, x1, y1 = box
    bw, bh = max(1.0, x1 - x0), max(1.0, y1 - y0)
    f = max(1, int(round(w / 320)))                     # the seam is found on a small copy
    sw_, sh_ = max(8, w // f), max(8, h // f)
    sm = np.clip(blur(resize(np.clip(mask, 0, 1).astype(np.float32), (sw_, sh_)), 1.0), 0, 1)
    edges = np.zeros_like(sm)
    if rgb is not None:
        g = blur(resize(gray(np.asarray(rgb, np.float32)), (sw_, sh_)), 0.8)
        gx, gy_ = np.zeros_like(g), np.zeros_like(g)
        gx[:, 1:-1], gy_[1:-1, :] = g[:, 2:] - g[:, :-2], g[2:, :] - g[:-2, :]
        mag = np.abs(gx) + 0.35 * np.abs(gy_)          # a seam runs top to bottom: vertical edges matter most
        edges = np.clip(mag / max(1e-3, float(np.percentile(mag, 97))), 0, 1)
    xs = np.arange(sw_, dtype=np.float32)
    nogap = np.zeros(sw_, bool)
    if crop is not None:                                # the remover's faded border is not a gap between people
        cw0, cw1 = crop[0] * sw_ / w, crop[2] * sw_ / w
        band = 0.1 * max(1.0, cw1 - cw0)
        nogap = ((xs >= cw0 - 1) & (xs <= cw0 + band) & (cw0 > 1)) | ((xs <= cw1 + 1) & (xs >= cw1 - band) & (cw1 < sw_ - 1))
    keep = np.ones((sh_, sw_), np.float32)
    sx0, sx1, sbw = x0 * sw_ / w, x1 * sw_ / w, bw * sw_ / w
    for side in (1, -1):
        edge = sx1 if side > 0 else sx0
        lo, hi = (edge - 0.1 * sbw, edge + 0.35 * sbw) if side > 0 else (edge - 0.35 * sbw, edge + 0.1 * sbw)
        lo, hi = int(max(0, math.floor(lo))), int(min(sw_, math.ceil(hi)))
        beyond = (xs > edge + 0.05 * sbw) if side > 0 else (xs < edge - 0.05 * sbw)
        if hi - lo < 3 or not (sm[:, beyond] > 0.5).any():
            continue                                    # nothing of the cut-out runs on past this side
        body = np.where(nogap[None, lo:hi], 1.0, sm[:, lo:hi])
        cost = body * (1.0 - 0.75 * edges[:, lo:hi]) + 0.35 * np.abs(xs[lo:hi] - edge)[None, :] / max(1.0, sbw)
        cut = _seam(cost) + lo
        keep *= (xs[None, :] <= cut[:, None]) if side > 0 else (xs[None, :] >= cut[:, None])
    keep = np.clip(blur(keep, 0.8), 0, 1)
    my, ry = max(0.08 * bh, 0.02 * h), max(0.05 * bh, 0.02 * h)
    gy = np.clip((np.arange(h, dtype=np.float32) - (y0 - my - ry)) / ry, 0, 1)
    gy = gy * gy * (3 - 2 * gy)
    return (mask * resize(keep, (w, h)) * gy[:, None]).astype(np.float32)


def _clean_window(mask, crop, x: int, y: int, s: float, cw: int, ch: int) -> list:
    """Where a wide v2 camera (pull, pan) may look: the canvas, minus the far side of every edge of the remover's crop
    that the (gated) cut-out still reaches — there the subject was cut by the crop's straight edge, and a camera that
    showed it would show the seam. An edge the cut-out stays clear of (the neighbour gate dropped what touched it)
    constrains nothing: past it lies only the untouched photo under the ground. [x0, y0, x1, y1] canvas px."""
    c0, c1 = (crop[0] - x) * s, (crop[2] - x) * s
    r0, r1 = (crop[1] - y) * s, (crop[3] - y) * s
    bx, by = max(2, round(0.09 * (c1 - c0))), max(2, round(0.09 * (r1 - r0)))
    win = [0.0, 0.0, float(cw), float(ch)]

    def reaches(sl) -> bool:
        part = mask[sl]
        return part.size > 0 and float(part.max()) > 0.1
    if c0 > 1 and reaches(np.s_[:, max(0, int(c0)):int(c0) + bx]):
        win[0] = c0
    if c1 < cw - 1 and reaches(np.s_[:, max(0, int(c1) - bx):int(c1)]):
        win[2] = c1
    if r0 > 1 and reaches(np.s_[max(0, int(r0)):int(r0) + by, :]):
        win[1] = r0
    if r1 < ch - 1 and reaches(np.s_[max(0, int(r1) - by):int(r1), :]):
        win[3] = r1
    return [round(v, 1) for v in win]


def _spot_geo_v2(geo: dict, ground: str, rim, mask, rgb, k: float, folder: Path, win=None) -> dict:
    """spotlight_layers' answer, plus what a v2 look added (unchanged for today's look). win = the remover's crop in
    canvas px (v2 cut-outs only)."""
    if win:
        geo["win"] = win
    if ground and ground != "fade":
        geo["ground"] = ground
        if ground == "paper" and mask is not None:
            # standing on paper, the subject throws a soft shadow onto it
            half = (max(16, mask.shape[1] // 2), max(9, mask.shape[0] // 2))
            sh = np.roll(np.roll(blur(resize(mask, half), 5 * k), round(7 * k), axis=0), round(4 * k), axis=1)
            save_rgba(flat((0, 0, 0), np.clip(sh * 0.42, 0, 1)), folder / "shadow.png")
            geo["shadow"] = True
    if rim and mask is not None:
        got = _rim_layers(rgb, mask, rim, k, folder)
        if got:
            geo["rim"] = got
    return geo


def _cam_room(cam: str, geo: dict) -> str:
    """A wide camera (pull, pan) travels only inside the remover's crop (geo["win"], canvas px) — beyond it nobody
    was cut out cleanly. When the crop leaves it too little room to read as a move, the spotlight pushes in instead.
    Mirrors camAt() in assets/photofx/v2.js."""
    win = geo.get("win")
    if cam not in ("pull", "pan") or not win:
        return cam
    cw, ch, zoom = float(geo["cw"]), float(geo["ch"]), float(geo["zoom"])
    ww, wh = max(1.0, win[2] - win[0]), max(1.0, win[3] - win[1])
    zwin = max(1.0, cw / ww, ch / wh)
    if cam == "pull":
        return cam if zoom / max(zwin, 1.04) >= 1.22 else "push"

    def centre(z, x):
        hw = cw / (2 * z)
        return min(max(x, win[0] + hw), win[2] - hw)
    z0, z1 = max(min(1.15, zoom), zwin), max(min(zoom, 1.45), 1.15, zwin)
    fx = float(geo["focus"][0])
    travel = abs(centre(z0, fx + (1 if fx < cw / 2 else -1) * cw * 0.42) - centre(z1, fx))
    return cam if travel >= 0.1 * cw else "push"


def _spot_v2(sc: dict, folder: Path, geo: dict, look: dict) -> dict:
    """A spotlight scene with the look's camera, ground and rim — today's scene when the look asks for none of them."""
    cam = str((look or {}).get("spot_cam") or "push")
    cam = _cam_room(cam if cam in SPOT_CAMS else "push", geo)
    ground, rim = geo.get("ground") or "fade", geo.get("rim") or {}
    if cam == "push" and ground == "fade" and not rim:
        return sc
    sc = dict(sc, v=2, cam=cam, ground=ground)
    if cam in ("pull", "pan") and geo.get("win"):
        sc["win"] = geo["win"]
    if ground != "fade":
        sc["vignette"] = SPOT_VIGNETTE.get(ground, sc["vignette"])
    if rim.get("under"):
        sc["rimUnder"] = data_uri(folder / rim["under"])
    if rim.get("over"):
        sc["rimOver"] = data_uri(folder / rim["over"])
    if rim:
        sc["rimFamily"] = rim.get("family")
    if geo.get("shadow") and (folder / "shadow.png").exists():
        sc["subjShadow"] = data_uri(folder / "shadow.png")
    return sc


def _soften_crop_edges(full, crop) -> None:
    """The remover only saw the crop: a person standing across its edge is cut there by a hard straight line, which a
    pull-back or a pan shows. Inside the photo, the cut-out fades out over the last 6 % of the crop instead (in place)."""
    h, w = full.shape
    cx0, cy0, cx1, cy1 = crop
    band_x, band_y = max(2, round(0.06 * (cx1 - cx0))), max(2, round(0.06 * (cy1 - cy0)))
    rx, ry = np.linspace(0.0, 1.0, band_x, dtype=np.float32), np.linspace(0.0, 1.0, band_y, dtype=np.float32)
    if cx0 > 0:
        full[cy0:cy1, cx0:cx0 + band_x] *= rx[None, :]
    if cx1 < w:
        full[cy0:cy1, cx1 - band_x:cx1] *= rx[::-1][None, :]
    if cy0 > 0:
        full[cy0:cy0 + band_y, cx0:cx1] *= ry[:, None]
    if cy1 < h:
        full[cy1 - band_y:cy1, cx0:cx1] *= ry[::-1][:, None]


def _spot_kw(look: dict) -> dict:
    """spotlight_layers' keyword arguments for a look ({} = today's)."""
    look = look or {}
    kw = {}
    if look.get("spot_ground") in SPOT_GROUNDS and look["spot_ground"] != "fade":
        kw["ground"] = look["spot_ground"]
    g = _glow_spec(look.get("glow"))
    if g and SPOT_LIGHT.get(g["family"], "none") != "none":
        # on a real person only a light BEHIND them: an edge family (rim, neon) becomes the soft halo, halation none
        kw["rim"] = dict(g, family=SPOT_LIGHT[g["family"]])
    if kw:
        kw["pal"] = look.get("palette") or {}
    if kw or look.get("spot_cam") in ("pull", "pan", "snap"):
        kw["soft_crop"] = True                     # a v2 spotlight: no hard seam where the remover's crop ended
    return kw


# ── objects: entrances, glow, labels ──────────────────────────────────────────
def glow_of(thing: Image.Image, family: str, strength: float = 0.6, color: str = "#FFE7C2"):
    """(picture, (scale x, scale y), blend) — the title's glow family as light round a real thing, drawn under it at
    the thing's own size times the scales; None for "none". Strength 0.6 is the reference."""
    g = _glow_spec({"family": family, "strength": strength, "color": color})
    if not g or g["family"] == "none" or g["strength"] <= 0.01:
        return None
    fam, s = g["family"], min(1.6, g["strength"] / 0.6)
    a = thing.getchannel("A")
    kk = 560 / max(a.size)
    small = a.resize((max(4, round(a.width * kk)), max(4, round(a.height * kk))), Image.BILINEAR)
    pad = 120
    canvas = Image.new("L", (small.width + 2 * pad, small.height + 2 * pad), 0)
    canvas.paste(small, (pad, pad))
    m = np.asarray(canvas, np.float32) / 255
    col = np.asarray(hex_rgb(g["color"], (255, 231, 194)), np.float32)
    lite, core, sat = col + (255 - col) * 0.25, col + (255 - col) * 0.72, _saturate(col)
    blend = "screen"
    # (fix round 10-03: at the reference strength every family must read on a mid ground — they were too faint — and
    # none may draw a line round the thing: halation is a warm bleed now, not an orange fringe)
    if fam == "rim":                    # a soft light just round the edge (the edge itself is lit by rim_over_of)
        lay = flat(lite, np.clip(blur(dilate(m, 3), 10), 0, 1) * 0.6 * s)
    elif fam == "halo":                 # a round museum light behind the thing
        lay = over(flat(lite, np.clip(blur(dilate(m, 30), 46), 0, 1) * 0.62 * s), flat(core, np.clip(blur(dilate(m, 8), 18), 0, 1) * 0.3 * s))
    elif fam == "soft":                 # a deep soft shade that lifts the thing off the picture
        lay, blend = flat((0, 0, 0), np.clip(blur(dilate(m, 10), 26), 0, 1) * 0.66 * s), "normal"
    elif fam == "neon":                 # a coloured backlight, like a light strip behind the thing — no drawn outline
        lay = over(flat(sat, np.clip(blur(dilate(m, 4), 28), 0, 1) * 0.42 * s), flat(sat, np.clip(blur(dilate(m, 2), 9), 0, 1) * 0.5 * s))
    elif fam == "bloom":                # the light spills round it, warm near the edge
        lay = over(flat(lite, np.clip(blur(dilate(m, 14), 40), 0, 1) * 0.5 * s), flat(core, np.clip(blur(dilate(m, 4), 12), 0, 1) * 0.38 * s))
    else:                               # halation: a warm red-orange bleed into the ground, wide and soft
        lay = over(flat((255, 104, 48), np.clip(blur(dilate(m, 10), 36), 0, 1) * 0.5 * s),
                   flat((255, 160, 110), np.clip(blur(dilate(m, 8), 22), 0, 1) * 0.16 * s))
    rgba = np.concatenate([np.clip(lay[..., :3], 0, 255), np.clip(lay[..., 3:4] * 255, 0, 255)], axis=2)
    return (Image.fromarray(rgba.astype(np.uint8), "RGBA"), (canvas.width / small.width, canvas.height / small.height),
            blend)


def rim_over_of(thing: Image.Image, strength: float = 0.6, color: str = "#FFE7C2") -> Image.Image:
    """The "rim" family's light ON the thing: a thin band inside its edge, brighter toward the top (lit from above
    and behind), screen-blended over the thing at its own size."""
    s = max(0.0, min(1.6, float(strength) / 0.6))
    m = np.asarray(thing.getchannel("A"), np.float32) / 255
    k = max(1, round(max(m.shape) / 380))
    band = blur(np.clip(m - erode(m, 2 * k), 0, 1), 0.6 * k)
    ys = np.nonzero(m.max(axis=1) > 0.5)[0]
    y0, y1 = (int(ys.min()), int(ys.max())) if ys.size else (0, m.shape[0])
    wrow = np.clip(1.0 - 0.65 * (np.arange(m.shape[0], dtype=np.float32) - y0) / max(1, y1 - y0), 0.35, 1.0)
    col = np.asarray(hex_rgb(color, (255, 231, 194)), np.float32)
    lay = flat(col + (255 - col) * 0.35, np.clip(band * wrow[:, None] * m * 1.0 * s, 0, 1))
    rgba = np.concatenate([np.clip(lay[..., :3], 0, 255), np.clip(lay[..., 3:4] * 255, 0, 255)], axis=2)
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


def _label_parts(thing: str) -> tuple:
    """("New Coke can", "1985") from an image-search phrase like "New Coke can 1985" — the year goes to the detail."""
    t = re.sub(r"\s+", " ", str(thing or "")).strip()
    m = re.search(r"\s((?:1[5-9]|20)\d\d(?:s|\s?[-–]\s?(?:1[5-9]|20)?\d\d)?)$", t)
    name, detail = (t[:m.start()].strip(), m.group(1)) if m else (t, "")
    return (name[:1].upper() + name[1:])[:48], detail[:64]


def _on_plinth(it: dict, solo: bool, max_w: float = W) -> None:
    """A thing set on a museum plinth: a little smaller and higher, so the plinth below it shows."""
    k = 0.86 if solo else 0.92
    for key in ("w", "h", "sw", "sh"):
        it[key] = round(it[key] * k)
    it["dx"] = round(it["dx"] * k, 1)
    it["dy"] = round(it["h"] * 0.02, 1)
    it["y"] = round(it["y"] - H * (0.05 if solo else 0.03), 1)
    # the plinth is wider than the thing, and the thing stands in the middle of its top face
    it["plinth"] = {"w": round(max(it["w"] * 1.5, 300) if solo else min(it["w"] * 1.25, max_w)),
                    "top": round(it["y"] + it["h"] / 2 - 0.01 * it["h"] - 9, 1)}


LABEL_PIN = {"leader_callout": (0.7, 0.3), "stencil_tag": (0.86, 0.14)}   # where on the thing's box the label is tied


def _pin(im: Image.Image, it: dict, fx: float, fy: float) -> list:
    """Frame px of the point ON the thing nearest to (fx, fy) of its box — a little inside its edge, so a callout dot or
    a tag's string is tied to the thing itself, never to the empty air of an irregular or diagonal thing's box. The
    thing's resting tilt (float keeps its own) is applied round the box centre."""
    a = np.asarray(im.getchannel("A"), np.float32) / 255
    kk = 200 / max(a.shape)
    sw_, sh_ = max(4, round(a.shape[1] * kk)), max(4, round(a.shape[0] * kk))
    small = resize(a, (sw_, sh_))
    core = erode(small, 3) > 0.5
    if not core.any():
        core = small > 0.5
    if not core.any():
        return None
    ys, xs = np.nonzero(core)
    i = int(np.argmin((xs + 0.5 - fx * sw_) ** 2 + (ys + 0.5 - fy * sh_) ** 2))
    px, py = (float(xs[i]) + 0.5) / sw_ - 0.5, (float(ys[i]) + 0.5) / sh_ - 0.5
    px, py = px * float(it["w"]), py * float(it["h"])
    rot = math.radians(float(it.get("rot") or 0) if it.get("enter") == "float" else 0.0)
    rx, ry = px * math.cos(rot) - py * math.sin(rot), px * math.sin(rot) + py * math.cos(rot)
    return [round(it["x"] + rx, 1), round(it["y"] + ry, 1)]


def _label_spec(it: dict, look: dict, im: Image.Image = None) -> dict:
    style = str(look.get("label") or "none")
    name = re.sub(r"\s+", " ", str(look.get("label_text") or "")).strip()[:48]
    if style not in OBJECT_LABELS or style == "none" or not name:
        return None
    fonts = dict(LABEL_FONTS, **{k: v for k, v in (look.get("fonts") or {}).items() if k in LABEL_FONTS and v})
    pal = look.get("palette") or {}
    land = ENTRANCE_LEAD.get(str(it.get("enter") or "rise"), OBJ_LEAD) - 0.12
    room_right = W - (it["x"] + it["w"] / 2)
    side = "right" if room_right >= 560 or room_right >= it["x"] - it["w"] / 2 else "left"
    out = {"style": style, "text": name, "detail": re.sub(r"\s+", " ", str(look.get("label_detail") or "")).strip()[:64],
           "kicker": str(look.get("label_kicker") or ("EXHIBIT" if style == "exhibit_card" else "REF."))[:24],
           "n": int(look.get("label_n") or 1), "at": round(float(it["at"]) + land + 0.35, 3),
           "box": [round(it["x"] - it["w"] / 2, 1), round(it["y"] - it["h"] / 2, 1), round(it["w"]), round(it["h"])],
           "side": side, "accent": _hexok(pal.get("accent")) or "#B8862F", "fonts": fonts}
    if style in LABEL_PIN and im is not None:
        fx, fy = LABEL_PIN[style]
        pin = _pin(im, it, fx if side == "right" else 1 - fx, fy)
        if pin:
            out["pin"] = pin
    return out


def _objects_v2(sc: dict, ims: list, look: dict) -> dict:
    """An objects scene with the look's entrance, glow and label — today's scene when the look asks for none."""
    look = look or {}
    ent = str(look.get("entrance") or "")
    layout = sc.get("layout")
    items = [dict(it) for it in sc["items"]]
    changed = False
    if ent in ENTRANCES and not (ent == "rise" and layout in ("solo", "crown")):
        targets = [0] if layout in ("solo", "crown") else (list(range(len(items))) if ent in STAGE_ENTRANCES else [])
        for i in targets:
            it = items[i]
            it["enter"] = ent
            it["rot"] = {"turntable": 0, "plinth_rise": 0, "float": 7 if i % 2 == 0 else -7}.get(ent, it["rot"])
            if ent == "plinth_rise":
                y0, h0 = it["y"], it["h"]
                # neighbours' plinths never touch: a pair stands 0.38 W apart, a row shares 84 % of the width
                _on_plinth(it, len(targets) == 1, 0.34 * W if layout == "pair" else 0.8 * W / max(1, len(items)))
                if layout == "crown" and len(items) > 1:      # the accent still lands on the thing's top
                    items[1]["y"] = round(items[1]["y"] + (it["y"] - it["h"] / 2) - (y0 - h0 / 2), 1)
            changed = True
    gl = _glow_spec(look.get("glow")) or {"family": "none", "strength": 0.0, "color": ""}
    if gl["family"] != "none" and gl["strength"] > 0.01:
        for it, im in zip(items, ims):
            got = glow_of(im, gl["family"], gl["strength"], gl["color"])
            if got:
                it.update(glow=data_uri(got[0], "PNG"), gw=round(it["w"] * got[1][0]), gh=round(it["h"] * got[1][1]),
                          gblend=got[2])
                if gl["family"] == "rim":
                    it["glowOver"] = data_uri(rim_over_of(im, gl["strength"], gl["color"]), "PNG")
                changed = True
    label = _label_spec(items[0], look, ims[0] if ims else None) if layout in ("solo", "crown") else None
    if not (changed or label):
        return sc
    out = dict(sc, v=2, items=items, glowFamily=gl["family"], glowStrength=gl["strength"])
    if ent in ENTRANCES:
        out["entrance"] = ent
    if label:
        out["label"] = label
        used = {"exhibit_card": ("mono", "serif", "body"), "leader_callout": ("cond", "mono"),
                "stencil_tag": ("mono", "stamp")}.get(label["style"], ())
        out["fonts"] = {k: v for k, v in label["fonts"].items() if k in used}    # only the faces the label draws
    return out


def _obj_look(look: dict, m: dict, got: list, k: int) -> dict:
    """The look an objects scene is built with: look.photofx's v2 keys, this moment's label (its own "label" /
    "label_detail" when the planner gave them, else the thing's search phrase) and number, and a quick entrance when
    the slow one had no room before the name. None without a v2 look (today's scene)."""
    if not look:
        return None
    out = dict(look)
    if m.get("_enter_quick"):
        out["entrance"] = "rise"
    if out.get("label") not in (None, "none"):
        name, detail = _label_parts((got[0].get("thing") if got else "") or m.get("words"))
        own = re.sub(r"\s+", " ", str(m.get("label") or "")).strip()
        out["label_text"] = own or name
        out["label_detail"] = re.sub(r"\s+", " ", str(m.get("label_detail") or "")).strip() or ("" if own else detail)
        out["label_n"] = k + 1
    return out


def _obj_lead(look: dict, layout: str) -> float:
    """How long before its name an object scene starts: the entrance's own lead (today's 0.5 s without a look)."""
    ent = str((look or {}).get("entrance") or "")
    if ent not in ENTRANCES or (layout in ("pair", "row") and ent not in STAGE_ENTRANCES):
        return OBJ_LEAD
    return ENTRANCE_LEAD.get(ent, OBJ_LEAD)


# ── text cut ──────────────────────────────────────────────────────────────────
def _textcut_v2(sc: dict, look: dict) -> dict:
    """A text cut in the look's type — today's scene when the look keeps today's style."""
    st = (look or {}).get("textcut_style")
    if not isinstance(st, dict) or not st:
        return sc
    st = textcut_style(st)
    if st == textcut_style({"id": "default"}):
        return sc
    out = dict(sc, v=2, style=st, fonts={"textcut": st["font"]})
    if st["id"] == "serif_quiet":               # quiet lines are read, not punched: slower cuts
        n, D, hit = len(sc["lines"]), float(sc["duration"]), float(sc["hit"])
        step = max(0.85, min(1.3, (D - hit - 1.3) / max(1, n - 1)))
        if hit + step * (n - 1) > D - 1.0:
            step = max(0.6, (D - 1.0 - hit) / max(1, n - 1))
        out["at"] = [round(hit + step * i, 3) for i in range(n)]
    return out


# ── contact sheets of every v2 look (python photofx.py demo) ──────────────────
def snap(items: list, scale: float = 0.5) -> list:
    """[(scene, [t, ...])] -> [[frame, ...], ...]: chosen frames of scenes drawn in Chromium, no clip encoded (contact
    sheets and checks). scale 0.5 = 960x540 frames."""
    from playwright.sync_api import sync_playwright
    out = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-gpu", "--font-render-hinting=none"])
        try:
            for sc, times in items:
                page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=scale)
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.set_content(_page_html(sc), wait_until="load")
                page.wait_for_function("window.__ready===true", timeout=90000)
                frames = []
                for t in times:
                    page.evaluate("(t)=>window.renderFrame(t)", float(t))
                    raw = page.screenshot(type="jpeg", quality=92, clip={"x": 0, "y": 0, "width": W, "height": H})
                    frames.append(Image.open(io.BytesIO(raw)).convert("RGB"))
                page.close()
                if errors:
                    raise RuntimeError(f"page error in a {sc.get('type')} scene: {errors[0][:200]}")
                out.append(frames)
        finally:
            browser.close()
    return out


def contact_sheet(rows: list, out: Path, title: str = "", tile_w: int = 640) -> Path:
    """rows = [(label, [frames])] -> one JPEG: a row of frames per label, the label above it."""
    from PIL import ImageDraw, ImageFont
    try:
        font = ImageFont.truetype(str(HERE / "assets" / "fonts" / "Inter-SemiBold.ttf"), 22)
        big = ImageFont.truetype(str(HERE / "assets" / "fonts" / "Inter-SemiBold.ttf"), 30)
    except OSError:
        font = big = ImageFont.load_default()
    tile_h = round(tile_w * 9 / 16)
    cols = max(len(f) for _, f in rows)
    head, lab, gap = (64 if title else 12), 36, 8
    sheet = Image.new("RGB", (cols * tile_w + (cols + 1) * gap, head + len(rows) * (lab + tile_h + gap) + gap), (14, 14, 16))
    d = ImageDraw.Draw(sheet)
    if title:
        d.text((gap + 4, 16), title, font=big, fill=(236, 232, 224))
    y = head
    for label, frames in rows:
        d.text((gap + 4, y + 6), str(label), font=font, fill=(206, 200, 188))
        for i, fr in enumerate(frames):
            sheet.paste(fr.resize((tile_w, tile_h), Image.LANCZOS), (gap + i * (tile_w + gap), y + lab))
        y += lab + tile_h + gap
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "JPEG", quality=88)
    return out


DEMO_PAL = {"accent": "#C9A15B", "duo_dark": "#0F1E2C", "duo_light": "#E9DDC4", "paper": "#E6DECB",
            "ink_print": "#1A1712"}


def _demo_inputs(fixtures, work: Path) -> tuple:
    """(spots [{photo, cut, box, crop, name}], things [{png, name, label, detail}]) — real cached photos and cut-outs
    from a fixtures folder (index.json), or pictures drawn right here."""
    if fixtures and (Path(fixtures) / "index.json").exists():
        fx = Path(fixtures)
        idx = json.loads((fx / "index.json").read_text(encoding="utf-8"))
        spots = [dict(s, photo=fx / s["photo"], cut=fx / s["cut"]) for s in idx.get("spots") or []]
        things = [dict(t, png=fx / t["png"]) for t in idx.get("things") or []]
        return spots, things
    work.mkdir(parents=True, exist_ok=True)
    yy, xx = np.mgrid[0:1080, 0:1920].astype(np.float32)
    rgb = np.dstack([90 + 80 * yy / 1080, 120 + 40 * np.sin(xx / 150), 160 - 60 * yy / 1080])
    fig = (((xx - 1100) / 150) ** 2 + ((yy - 520) / 90) ** 2 < 1) | ((abs(xx - 1100) < 110) & (yy > 560) & (yy < 1040))
    rgb[fig] = (200, 60, 50)
    save_rgb(rgb, work / "photo.jpg")
    save_rgba(np.concatenate([rgb, fig.astype(np.float32)[..., None]], axis=2), work / "cut.png")
    thing = Image.fromarray(np.concatenate([rgb, fig.astype(np.float32)[..., None] * 255], axis=2).astype(np.uint8))
    thing.crop(thing.getchannel("A").getbbox()).save(work / "thing.png")
    spot = {"name": "drawn", "photo": work / "photo.jpg", "cut": work / "cut.png", "box": [0.49, 0.38, 0.66, 0.97],
            "crop": [0, 0, 1920, 1080]}
    return [spot, spot], [{"name": "drawn", "png": work / "thing.png", "thing": "Red figure 1985"}] * 2


def demo(out: Path, fixtures=None, only: str = "", work: Path = None) -> list:
    """Contact sheets of every autostyle v2 look this module draws, into `out`: sheet_spot_grounds (every ground x 2
    photos), sheet_spot_cams, sheet_spot_rims (every glow family on a spotlit subject), sheet_entrances (every
    entrance as a 4-frame strip, the 3rd frame = the moment its name is said), sheet_object_glows, sheet_labels,
    sheet_textcuts. `only` = a comma list of those names without "sheet_"."""
    out = Path(out)
    work = Path(work) if work else out / "work"            # the layer files (only the sheets need to land in `out`)
    spots, things = _demo_inputs(fixtures, work / "drawn")
    want = {x.strip() for x in str(only or "").split(",") if x.strip()}
    made = []

    def on(name):
        return not want or name in want

    def spot_scene(sp, tag, look):
        folder = work / f"spot_{sp['name']}_{tag}"
        geo = spotlight_layers(Path(sp["photo"]), sp["box"], Path(sp["cut"]), sp["crop"], folder, **_spot_kw(look))
        return spotlight_scene(folder, geo, SPOT_DUR, SPOT_LEAD, look=look)
    named = [s for s in spots if s["name"] in ("goizueta", "lotus_m01")]
    sp2 = ((named if len(named) >= 2 else spots) * 2)[:2]
    if on("spot_grounds"):
        rows = []
        for g in SPOT_GROUNDS:
            scs = [spot_scene(sp, g, {"spot_ground": g, "palette": DEMO_PAL}) for sp in sp2]
            rows.append((f"spot ground: {g}" + ("  (today)" if g == "fade" else ""),
                         [fr[0] for fr in snap([(sc, [3.4]) for sc in scs])]))
        made.append(contact_sheet(rows, out / "sheet_spot_grounds.jpg", "PHOTO FX v2 - spotlight grounds (t = 3.4 s, settled)"))
    if on("spot_cams"):
        rows = []
        for c in SPOT_CAMS:
            for sp in sp2:                                  # every camera on both photos (Goizueta, Lotus)
                sc = spot_scene(sp, f"cam_{c}", {"spot_cam": c})
                got = sc.get("cam", "push")
                rows.append((f"spot camera: {c}" + ("  (today)" if c == "push" else "") +
                             (f" -> {got} (no room)" if got != c else "") + f"  [{sp['name']}]   t = 0.2 / 0.9 (word) / 2.4 / 4.8",
                             snap([(sc, [0.2, 0.9, 2.4, 4.8])])[0]))
        made.append(contact_sheet(rows, out / "sheet_spot_cams.jpg", "PHOTO FX v2 - spotlight camera moves", tile_w=480))
    if on("spot_rims"):
        rows = []
        for fam in OBJECT_GLOWS:
            col = "#5FD4FF" if fam == "neon" else "#FFD9A6"
            look = {"glow": {"family": fam, "strength": 0.6, "color": col}}
            scs = [spot_scene(sp, f"rim_{fam}", look) for sp in sp2]
            rows.append((f"rim light on the subject: {fam}" + ("  (today)" if fam == "none" else "") + "  strength 0.6",
                         [fr[0] for fr in snap([(sc, [3.4]) for sc in scs])]))
        made.append(contact_sheet(rows, out / "sheet_spot_rims.jpg", "PHOTO FX v2 - the title's glow family as rim light"))
    def pick_things(order):
        """Things by fixture name in this order (the first two found), else the first two."""
        got = [t for n in order for t in things if t.get("name") == n][:2]
        got = got if len(got) == 2 else (things * 2)[:2]
        return [Image.open(t["png"]).convert("RGBA") for t in got], [_label_parts(t.get("thing") or t.get("name")) for t in got]
    th, names = pick_things(("newcoke", "shampoo"))           # a crushed archive can + a clean product cut-out
    th_lab, names_lab = pick_things(("apollo_t2", "shampoo"))  # an irregular thing (where a label is tied) + a plain one
    if on("entrances"):
        rows = []
        for ent in ENTRANCES:
            lead = ENTRANCE_LEAD[ent]
            for im in th:
                sc = objects_scene([im], "solo", look={"entrance": ent})
                rows.append((f"entrance: {ent}" + ("  (today)" if ent == "rise" else "") +
                             f"   t = 0.18 / {lead * 0.6:.2f} / {lead:.2f} (name said) / 3.0",
                             snap([(sc, [0.18, round(lead * 0.6, 2), lead, 3.0])])[0]))
        made.append(contact_sheet(rows, out / "sheet_entrances.jpg", "PHOTO FX v2 - object entrances (4-frame strips)",
                                  tile_w=480))
    if on("object_glows"):
        rows = []
        for fam in OBJECT_GLOWS:
            col = "#5FD4FF" if fam == "neon" else "#FFD9A6"
            scs = [objects_scene([im], "solo", look={"glow": {"family": fam, "strength": 0.6, "color": col}}) for im in th]
            rows.append((f"object glow: {fam}" + ("  (today)" if fam == "none" else "") + "  strength 0.6",
                         [fr[0] for fr in snap([(sc, [2.6]) for sc in scs])]))
        made.append(contact_sheet(rows, out / "sheet_object_glows.jpg", "PHOTO FX v2 - glow families on real objects"))
    if on("labels"):
        rows = []
        for lab in OBJECT_LABELS:
            scs = []
            for i, im in enumerate(th_lab):
                ent = "plinth_rise" if lab == "exhibit_card" else "rise"
                scs.append(objects_scene([im], "solo", look={
                    "label": lab, "label_text": names_lab[i][0], "label_detail": names_lab[i][1] or "1970", "label_n": 4 + i,
                    "entrance": ent, "palette": DEMO_PAL}))
            rows.append((f"object label: {lab}" + ("  (today)" if lab == "none" else ""),
                         [fr[0] for fr in snap([(sc, [3.8]) for sc in scs])]))
        made.append(contact_sheet(rows, out / "sheet_labels.jpg", "PHOTO FX v2 - object labels"))
    if on("textcuts"):
        rows = []
        lines = ["APRIL 13, 1970", "200,000 MILES", "THREE MEN"]
        picks = [{"photo": Path(sp["photo"])} for sp in spots[:3]]
        styles = [("default (today)", None), ("default, restyled by the look: Oswald, brass", {"id": "default", "font": "Oswald", "weight": 700, "accent": "#C9A15B"}),
                  ("serif_quiet", {"id": "serif_quiet"}),
                  ("glow_line (neon family)", {"id": "glow_line", "glow": {"family": "neon", "strength": 0.6, "color": "#5FD4FF"}}),
                  ("stamp_word", {"id": "stamp_word"})]
        for name, st in styles:
            sc = textcut_scene(picks, lines, work / f"text_{name.split()[0]}", look={"textcut_style": st} if st else None)
            ts = [round(sc["at"][0] + 0.06, 2), round(sc["at"][0] + 0.5, 2), round(sc["at"][-1] + 0.7, 2)]
            rows.append((f"text cut: {name}   t = {ts[0]} / {ts[1]} / {ts[2]}", snap([(sc, ts)])[0]))
        made.append(contact_sheet(rows, out / "sheet_textcuts.jpg", "PHOTO FX v2 - text cut styles", tile_w=560))
    return made


# ════════════════════════════════════════════════════════════════════════════
# CLI
# ════════════════════════════════════════════════════════════════════════════
def _preview_frames(mp4: Path, times: list, out_png: Path) -> Path:
    """A strip of frames from a clip, for a quick look."""
    tiles = []
    for t in times:
        f = out_png.with_name(f"{out_png.stem}_{t:.2f}.png")
        subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(mp4),
                        "-frames:v", "1", str(f)], check=True)
        tiles.append(Image.open(f).convert("RGB").resize((640, 360), Image.LANCZOS))
        f.unlink(missing_ok=True)
    strip = Image.new("RGB", (640 * len(tiles), 360))
    for i, t in enumerate(tiles):
        strip.paste(t, (640 * i, 0))
    strip.save(out_png)
    return out_png


def check(out: Path = None) -> int:
    """Everything that runs on this machine — layers, the ffmpeg depth render, both Chromium scenes — on
    pictures drawn right here, no keys needed. Writes preview/_photofx_check.png."""
    out = Path(out or HERE / "preview")
    out.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="photofx_check_"))
    bad = 0
    # a "photo": a sky-to-ground gradient with a figure standing on it
    yy, xx = np.mgrid[0:1080, 0:1920].astype(np.float32)
    rgb = np.dstack([90 + 80 * yy / 1080, 120 + 40 * np.sin(xx / 150), 160 - 60 * yy / 1080])
    fig = (((xx - 1100) / 150) ** 2 + ((yy - 520) / 90) ** 2 < 1) | ((abs(xx - 1100) < 110) & (yy > 560) & (yy < 1040))
    rgb[fig] = (200, 60, 50)
    photo = work / "photo.jpg"
    save_rgb(rgb, photo)
    cut = work / "cut.png"
    save_rgba(np.concatenate([rgb, fig.astype(np.float32)[..., None]], axis=2), cut)
    strips = []
    try:
        info = build_depth(photo, cut, work / "depth")
        print(f"  {'ok  ' if info['ok'] else 'FAIL'} depth layers: " + (f"{len(info['parts'])} part(s)" if info["ok"] else info["why"]))
        if info["ok"]:
            render_depth(work / "depth", info, 2.0, work / "depth.mp4")
            strips.append(_preview_frames(work / "depth.mp4", [0.0, 1.0, 1.95], work / "s_depth.png"))
            print("  ok   depth render")
        else:
            bad += 1
    except Exception as e:                                          # noqa: BLE001
        print(f"  FAIL depth: {type(e).__name__}: {str(e)[:200]}")
        bad += 1
    try:
        geo = spotlight_layers(photo, (0.49, 0.38, 0.66, 0.97), cut, (0, 0, 1920, 1080), work / "spot")
        sc_spot = spotlight_scene(work / "spot", geo, 3.0, 0.8)
        thing = Image.fromarray(np.concatenate([rgb, fig.astype(np.float32)[..., None] * 255], axis=2).astype(np.uint8))
        thing = thing.crop(thing.getchannel("A").getbbox())
        sc_obj = objects_scene([thing], "crown", thing.resize((thing.width // 2, thing.height // 3)), 1.0, 3.0)
        render([(sc_spot, work / "spot.mp4"), (sc_obj, work / "objects.mp4")], workers=2)
        strips.append(_preview_frames(work / "spot.mp4", [0.0, 1.6, 2.95], work / "s_spot.png"))
        strips.append(_preview_frames(work / "objects.mp4", [0.3, 1.2, 2.95], work / "s_obj.png"))
        print("  ok   spotlight + objects scenes render")
    except Exception as e:                                          # noqa: BLE001
        print(f"  FAIL scenes: {type(e).__name__}: {str(e)[:300]}")
        bad += 1
    if strips:
        ims = [Image.open(s) for s in strips]
        sheet = Image.new("RGB", (ims[0].width, sum(i.height for i in ims)))
        y = 0
        for i in ims:
            sheet.paste(i, (0, y))
            y += i.height
        sheet.save(out / "_photofx_check.png")
        print(f"  wrote {out / '_photofx_check.png'}")
    shutil.rmtree(work, ignore_errors=True)
    return bad


def _cli() -> None:
    import argparse
    ap = argparse.ArgumentParser(description="PHOTO FX DLC")
    ap.add_argument("cmd", choices=["depth", "spotlight", "object", "find", "check", "demo"])
    ap.add_argument("what", nargs="?", default="", help="depth/spotlight: a picture · object/find: a search · "
                                                        "demo: a fixtures folder (index.json) or nothing")
    ap.add_argument("--only", default="", help="demo: spot_grounds,spot_cams,spot_rims,entrances,object_glows,labels,textcuts")
    ap.add_argument("--subject", default="", help="spotlight: who or what to push in on")
    ap.add_argument("--box", default="", help="spotlight: left,top,right,bottom as fractions (skips Claude)")
    ap.add_argument("--accent", default="", help="object: a second thing that lands on it (a crown)")
    ap.add_argument("--also", action="append", default=[], help="object: more things side by side")
    ap.add_argument("--seconds", type=float, default=0.0)
    ap.add_argument("--out", default=str(HERE / "preview"))
    ap.add_argument("--work", default="", help="demo: where the layer files go (default: OUT/work)")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    if a.cmd == "check":
        sys.exit(1 if check(out) else 0)
    if a.cmd == "demo":
        for p in demo(out, a.what or None, a.only, a.work or None):
            print(f"  {p}")
        return
    if a.cmd == "find":
        for c in image_search(a.what):
            print(f"  {c['source'][:28]:28s} {c['title'][:70]}\n  {'':28s} {c['url'][:110]}")
        return
    import make_video as mv
    work = out / "photofx"
    t0 = time.time()
    if a.cmd == "depth":
        src = Path(a.what)
        dest = out / f"depth_{src.stem}.mp4"
        dur = a.seconds or 5.0
        if not depth_segment(mv, src, dur, dest, work):
            sys.exit("  no clear subject in that picture — it would keep the plain zoom")
        print(f"  {dest}  ({time.time() - t0:.0f}s) — frames: {_preview_frames(dest, [0, dur / 2, dur - 0.05], dest.with_suffix('.png'))}")
        return
    if a.cmd == "spotlight":
        folder = work / f"spot_{Path(a.what).stem}"
        folder.mkdir(parents=True, exist_ok=True)
        photo = folder / "photo.jpg"
        load_rgb(a.what).save(photo, "JPEG", quality=95)
        if a.box:
            box = [float(v) for v in a.box.split(",")]
        else:
            subject = a.subject or "the main subject"
            picks = ask_picks(mv, spot_prompt(subject, subject, subject, [{"title": subject, "source": "your file"}]), [photo])
            if not picks:
                sys.exit("  Claude could not find the subject in that photo")
            box = picks[0][1]
        src = load_rgb(photo)
        crop = spot_crop(src.size, box)
        cp = folder / "crop.jpg"
        src.crop(crop).save(cp, "JPEG", quality=94)
        cut = cutout(cp, work / "cutouts", log=mv.log)
        geo = spotlight_layers(photo, box, cut, crop, folder / "layers")
        dest = out / f"spot_{Path(a.what).stem}.mp4"
        dest.unlink(missing_ok=True)
        dur = a.seconds or SPOT_DUR
        render([(spotlight_scene(folder / "layers", geo, dur, 0.9), dest)])
        print(f"  {dest}  ({time.time() - t0:.0f}s, box {box}, cutout {'yes' if geo['cut'] else 'no'}, zoom {geo['zoom']})"
              f" — frames: {_preview_frames(dest, [0, 1.6, dur - 0.05], dest.with_suffix('.png'))}")
        return
    things = [a.what] + list(a.also)
    folder = work / ("obj_" + re.sub(r"[^a-z0-9]+", "_", _fold(" ".join(things)))[:48])
    got = [source_thing(mv, t, folder / f"t{i}", work / "cutouts", 360 if len(things) <= 2 else 280)
           for i, t in enumerate(things)]
    accent = source_thing(mv, a.accent, folder / "accent", work / "cutouts", 220) if a.accent else None
    layout = "crown" if accent else ("solo" if len(got) == 1 else "pair" if len(got) == 2 else "row")
    sc = objects_scene([Image.open(g["png"]).convert("RGBA") for g in got], layout,
                       Image.open(accent["png"]).convert("RGBA") if accent else None, 1.5, a.seconds)
    dest = out / f"{folder.name}.mp4"
    dest.unlink(missing_ok=True)
    render([(sc, dest)])
    print(f"  {dest}  ({time.time() - t0:.0f}s, {layout}: " + ", ".join(f"{g['thing']} from {g['source']}" for g in got)
          + (f" + {accent['thing']} from {accent['source']}" if accent else "") + ")"
          f" — frames: {_preview_frames(dest, [0.35, 1.0, 2.2, sc['duration'] - 0.05], dest.with_suffix('.png'))}")


if __name__ == "__main__":
    _cli()
