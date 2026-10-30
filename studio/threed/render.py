#!/usr/bin/env python3
"""render.py - Legion 3D: scene specs -> mp4 segments on the GPU, one page load per job, one GPU job at a time.

    /usr/bin/python3 render.py video.json OUTDIR [--scenes s01,s03] [--quality draft|final]
    /usr/bin/python3 render.py video.json OUTDIR --preview 1.5,6 [--w 960 --h 540]
    /usr/bin/python3 render.py --catalog OUT.json
    ... [--assets DIR]       v3: the job's photos / image sequences, served at /assets/ (also video.json "assets")

video.json is {"cast": [CastDef...], "scenes": [Spec...]} (a bare scene spec also works). Each scene renders to
OUTDIR/<id>.mp4 (1080p30, libx264 crf 16, yuv420p); OUTDIR/report.json gets the camera plan, the QA, the frame checks
and the timings. Before a scene is rendered its camera path is checked by the page's QA (terrain clearance, speed vs
altitude, angular speed, roll, figures, solids); a flagged path is re-planned higher/slower (twice), and a scene that
still fails is not rendered (--force renders it anyway). Rendered frames are checked for black, blown-out and
sudden-jump frames (warp/whiteout transition frames excepted); a flagged frame is rendered again once.
Chromium runs WITH the GPU (Metal ANGLE on macOS, default D3D11 ANGLE on Windows) and is closed after the job.
"""
import argparse, base64, contextlib, functools, http.server, json, os, platform, shutil, statistics, subprocess, sys, tempfile, threading, time
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENGINE = HERE / "engine"
FPS = 30


# ── GPU lock: the pharos3d lock when present (kernel panics from parallel GPU renders), else Legion's machine-wide
#    render lock (~/.legion-studio/render.lock, the one FOLIO takes too): one Chromium render at a time on this computer ─────
def _local_lock(name):
    lock_path = Path(os.environ.get("FOLIO_LOCK") or (Path.home() / ".legion-studio" / "render.lock"))
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    f = open(lock_path, "a+", encoding="utf-8")
    said = False
    while True:
        try:
            if os.name == "nt":
                import msvcrt
                f.seek(0); msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except OSError:
            if not said: print(f"[gpulock] {name}: waiting for another render", file=sys.stderr, flush=True); said = True
            time.sleep(2)
    return f


@contextlib.contextmanager
def gpu_lock(name):
    shared = Path.home() / "pharos3d" / "gpulock.py"
    if shared.exists():
        sys.path.insert(0, str(shared.parent))
        try:
            from gpulock import gpu_lock as _gl
        except Exception:
            _gl = None
        if _gl:
            with _gl(name):
                yield
            return
    f = _local_lock(name)
    try:
        yield
    finally:
        try:
            if os.name == "nt":
                import msvcrt
                f.seek(0); msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(f, fcntl.LOCK_UN)
        finally:
            f.close()


# ── static server for engine/ (explicit MIME types: Windows registries sometimes map .js to text/plain) ──────────────
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map, **{
        ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".html": "text/html",
        ".ttf": "font/ttf", ".otf": "font/otf", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".wasm": "application/wasm", ".bin": "application/octet-stream",
        ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"})
    assets = None        # v3: the job's assets directory (--assets / video.json "assets"), served at /assets/

    def log_message(self, *a): pass

    def translate_path(self, path):
        """/assets/<rel> -> the assets directory (no '..', no absolute or drive parts: never outside it); else engine/"""
        raw = urllib.parse.unquote(urllib.parse.urlsplit(path).path)
        if raw == "/assets" or raw.startswith("/assets/"):
            parts = [x for x in raw[len("/assets"):].replace("\\", "/").split("/") if x not in ("", ".")]
            if not self.assets or any(x == ".." or ":" in x for x in parts):
                return str(ENGINE / "__no_such_asset__")
            return os.path.join(self.assets, *parts)
        return super().translate_path(path)

    def do_GET(self):
        # v3: GET /assets/<dir>/?list -> {"files": [...]} (an image sequence's frames, sorted) for lib/shared/media.js
        u = urllib.parse.urlsplit(self.path)
        if u.path.startswith("/assets/") and "list" in urllib.parse.parse_qs(u.query, keep_blank_values=True):
            d = self.translate_path(u.path)
            if not os.path.isdir(d):
                self.send_error(404); return
            body = json.dumps({"files": sorted(n for n in os.listdir(d) if not n.startswith(".") and os.path.isfile(os.path.join(d, n)))}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def serve():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ENGINE)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def chromium_args():
    args = ["--enable-gpu", "--ignore-gpu-blocklist", "--force-color-profile=srgb", "--hide-scrollbars", "--mute-audio",
            "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"]
    if sys.platform == "darwin":
        args.append("--use-angle=metal")
    return args          # Windows: Chromium's default ANGLE backend (D3D11); Linux: its default GL


class Page:
    """one Chromium + one render page for the whole job"""

    def __init__(self, pw, port, w, h, sub=None, quality="final"):
        self.pw, self.port, self.w, self.h, self.sub, self.quality = pw, port, w, h, sub, quality
        self.browser = self.page = None
        self.msgs = []

    def open(self):
        exe = os.environ.get("F3D_CHROMIUM") or None
        self.browser = self.pw.chromium.launch(args=chromium_args(), executable_path=exe)
        self.page = self.browser.new_page(viewport={"width": self.w, "height": self.h}, device_scale_factor=1)
        self.page.set_default_timeout(900000)
        self.page.on("console", lambda m: self.msgs.append(f"{m.type}: {m.text}"))
        self.page.on("pageerror", lambda e: self.msgs.append(f"PAGEERROR: {e}"))
        q = f"w={self.w}&h={self.h}&quality={self.quality}" + (f"&sub={self.sub}" if self.sub else "")
        t0 = time.time()
        self.page.goto(f"http://127.0.0.1:{self.port}/index.html?{q}")
        self.page.wait_for_function("window.__ready === true || !!window.__error", timeout=300000)
        err = self.page.evaluate("window.__error || null")
        if err:
            raise RuntimeError("page failed to boot: " + str(err)[:2000] + "\n" + "\n".join(self.msgs[-20:]))
        print(f"page ready in {time.time() - t0:.1f}s  " + " | ".join(m for m in self.msgs if "libraries" in m)[-300:], flush=True)

    def close(self):
        with contextlib.suppress(Exception):
            if self.browser: self.browser.close()
        self.browser = self.page = None

    def ev(self, expr, arg=None):
        return self.page.evaluate(expr, arg)


WARP_S = 0.15


def transition_at(spec, t, dur):
    tr = spec.get("transition") or {}
    sm = lambda x: (lambda y: y * y * (3 - 2 * y))(min(1.0, max(0.0, x)))
    warp = white = 0.0
    if tr.get("in") == "warp": warp = max(warp, 1 - sm(t / WARP_S))            # E1 v2: a 0.15 s whip either side (qa.js WARP_S)
    if tr.get("out") == "warp": warp = max(warp, 1 - sm((dur - t) / WARP_S))
    if tr.get("in") == "whiteout": white = max(white, 1 - sm(t / 0.4))
    if tr.get("out") == "whiteout": white = max(white, 1 - sm((dur - t) / 0.4))
    return max(warp, white, transition_v3_at(tr, t, dur))


# v3 engine transitions (core/qa.js TR_V3: [default, min, max] s; occlude: frames 3..10, out only). A side is a kind or
# {kind, dur, by, frames}. For the frame checks the whole window counts (1.0, + one frame): negative / flash / burn /
# leak / iris frames and the frames where the lens enters the occluding object are designed, never a jump or black frame.
TR_V3 = {"negative": (0.15, 0.12, 0.2), "flash": (0.2, 0.08, 0.4), "burn": (0.4, 0.2, 0.8), "leak": (0.4, 0.2, 0.8), "iris": (0.5, 0.25, 1.0)}


def transition_v3_at(tr, t, dur):
    v = 0.0
    for side, u in (("in", t), ("out", dur - t)):
        x = tr.get(side); k = x.get("kind") if isinstance(x, dict) else x
        if k in TR_V3:
            d, lo, hi = TR_V3[k]
            with contextlib.suppress(TypeError, ValueError, AttributeError):
                d = float(x.get("dur", d)) if isinstance(x, dict) else d
            d = min(hi, max(lo, d))
        elif k == "occlude" and side == "out":
            f = 6
            with contextlib.suppress(TypeError, ValueError, AttributeError):
                f = int(round(float(x.get("frames", 6)))) if isinstance(x, dict) else 6
            d = min(10, max(3, f)) / FPS
        else:
            continue
        if u <= d + 1.0 / FPS: v = 1.0
    return v


def designed_shake_at(spec, t):
    """inside a designed camera shake (engine camera.shake, clamped there to <= 2.5 s): its frames move by design"""
    for s in (spec.get("camera") or {}).get("shake") or []:
        try:
            t0, d = float(s.get("t")), min(2.5, max(0.2, float(s.get("dur", 0.8))))
        except (TypeError, ValueError, AttributeError):
            continue
        if t0 - 0.05 <= t <= t0 + d + 0.05: return True
    return False


def _designed_window(lst, t, lo, hi, default):
    """t inside a designed layer's window: [t0 - dur, t0 + dur] (+-0.05 s) — t0 may be its start or its centre"""
    for s in lst or []:
        try:
            t0, d = float(s.get("t")), min(hi, max(lo, float(s.get("dur", default))))
        except (TypeError, ValueError, AttributeError):
            continue
        if t0 - d - 0.05 <= t <= t0 + d + 0.05: return True
    return False


def designed_whip_at(spec, t):
    """inside a designed whip pan (v3 camera.whip [{t, yaw, dur 0.15-0.35}], core/fpvcam.js): a smear pan by design"""
    return _designed_window((spec.get("camera") or {}).get("whip"), t, 0.1, 0.5, 0.25)


def designed_zoom_at(spec, t):
    """inside a designed crash / snap zoom (v3 camera.zoom [{t, fov, dur}], core/fpvcam.js): the lens jumps by design"""
    return _designed_window((spec.get("camera") or {}).get("zoom"), t, 0.1, 1.0, 0.3)


def issue_text(i):
    """qa.issues holds the camera/locomotion ranges (dicts) and, since E1 v2, coded strings 'code: text'"""
    if isinstance(i, str): return i
    return f"{i.get('what')} @ {i.get('from', 0):.2f}-{i.get('to', 0):.2f}s"


FACE_WHITE, FACE_MEAN = 0.12, 205    # a head's core: share of near-white pixels (luma > 242) / mean luma of a blown face


def face_issues(stats, times, th=None, spec=None, dur=None):
    """face_blown: the luminance of a figure's head region near white, from grabFrame's per-frame face stats.
    th: the scene's look-preset thresholds (loadScene's `qa`, core/presets.js); absent = today's constants.
    spec + dur (v3 merge): frames inside a v3 transition window (negative / flash / burn / leak / iris) are designed, skipped"""
    th = th or {}
    fw, fm = th.get("face_white", FACE_WHITE), th.get("face_mean", FACE_MEAN)
    tr3 = (spec or {}).get("transition") or {}
    per = {}
    for st, t in zip(stats, times):
        if dur is not None and tr3 and transition_v3_at(tr3, t, dur) >= 0.05: continue
        for f in (st or {}).get("faces") or []:
            d = per.setdefault(f["who"], {"n": 0, "bad": [], "max": 0.0, "mean": 0.0})
            d["n"] += 1
            d["max"] = max(d["max"], f.get("white", 0)); d["mean"] = max(d["mean"], f.get("mean", 0))
            if f.get("white", 0) > fw or f.get("mean", 0) > fm: d["bad"].append(t)
    out = []
    for who, d in per.items():
        if not d["bad"] or len(d["bad"]) < max(1, 0.1 * d["n"]): continue
        out.append(f"face_blown: {who} head {d['max'] * 100:.0f} % near-white (mean luma up to {d['mean']:.0f}), blown in {len(d['bad'])} of {d['n']} frames "
                   f"({min(d['bad']):.1f}-{max(d['bad']):.1f} s): a light is burning the face")
    return out


HOT_AREA = 0.08         # blown_area: share of the frame clipped (grabFrame stats.hot: a channel >= 245 and luma >= 150)


def blown_issues(stats, times, spec, dur, th=None):
    """blown_area: more than ~8 % of the frame near-white in >= 10 % of the frames (transition frames excepted)"""
    ha = (th or {}).get("hot_area", HOT_AREA)
    have = [(st.get("hot", 0), t) for st, t in zip(stats, times) if st and "hot" in st and transition_at(spec, t, dur) < 0.05]
    bad = [t for h, t in have if h > ha]
    if not have or len(bad) < max(1, 0.1 * len(have)): return []
    worst = max(h for h, _ in have)
    return [f"blown_area: up to {worst * 100:.0f} % of the frame blown out (clipped) in {len(bad)} of {len(have)} frames "
            f"({min(bad):.1f}-{max(bad):.1f} s): an emissive surface or a light is blowing out"]


DARK_SEP = 0.35         # too_dark: the share of a figure's outline that stands off the room behind it (>= 14 luma)
DARK_P90 = 70           # too_dark (exteriors): the frame's 90th percentile luma under which the hero must still read


def dark_issues(stats, times, spec, dur, th=None):
    """too_dark: a figure whose silhouette does not separate from the room (qa.js silhouetteSep: the share of its outline
    that differs >= 14 luma levels from what is behind it) under 0.35 in >= 30 % of the frames (transitions excepted).
    A dark coat may stay dark: it reads when a rim or the lamp outlines it. th: a dark look preset's (noir, hologram)
    own p90 / separation floor (loadScene's `qa`); absent = today's constants"""
    th = th or {}
    DARK_SEP, DARK_P90 = th.get("dark_sep", globals()["DARK_SEP"]), th.get("dark_p90", globals()["DARK_P90"])
    # v3 (WP3) stage.void: a black stage by design (fern T07); judge the LIT subject (frame p99 from the thumb) instead of
    # the frame p90, and a lower outline share (a slit / rim-lit figure in a void has a mostly dark outline)
    void = any(str(x.get("kind", "")) == "stage.void" for x in (spec.get("objects") or []))
    if void:
        DARK_SEP, DARK_P90 = th.get("void_sep", 0.05), th.get("void_p90", 3)
        V_P99 = th.get("void_p99", 60)
    per = {}
    for st, t in zip(stats, times):
        if not st or transition_at(spec, t, dur) >= 0.05: continue
        for f in st.get("faces") or []:
            if f.get("sep") is None: continue
            d = per.setdefault(f["who"], {"n": 0, "bad": [], "min": 1.0, "body": []})
            d["n"] += 1; d["min"] = min(d["min"], f["sep"])
            if f.get("body") is not None: d["body"].append(f["body"])
            if f["sep"] < DARK_SEP: d["bad"].append(t)
    out = []
    # exteriors (E1 v2 round 5): a dark frame (p90 < 70) whose camera target does not read (its outline separates on
    # < 35 %, or it is tiny / off screen). A dark hero that reads as a silhouette against a bright horizon passes.
    room = any(str(x.get("kind", "")).startswith("interior.") for x in (spec.get("structures") or []) + (spec.get("objects") or []))
    if not room:
        n_e, bad_e, w_p90, w_tg = 0, [], 999, None
        for st, t in zip(stats, times):
            if not st or st.get("p90") is None or transition_at(spec, t, dur) >= 0.05: continue
            n_e += 1
            tg = st.get("target") or None
            reads = bool(tg) and tg.get("sep") is not None and tg["sep"] >= DARK_SEP and tg.get("area", 0) >= 40
            if void and not reads and st.get("thumb"):
                lum = sorted(thumb(st)); reads = lum[int(len(lum) * 0.99)] >= V_P99
            if st["p90"] < DARK_P90 and not reads:
                bad_e.append(t)
                if st["p90"] < w_p90: w_p90, w_tg = st["p90"], tg
        if n_e and bad_e and len(bad_e) >= max(1, 0.3 * n_e):
            what = (f"the target {w_tg.get('who')} does not read (outline separation {(w_tg.get('sep') or 0) * 100:.0f} %, {w_tg.get('area', 0)} px of 192x108)"
                    if w_tg else "no camera target is on screen")
            out.append(f"too_dark: the frame's 90th percentile is {w_p90:.0f} and {what} in {len(bad_e)} of {n_e} frames "
                       f"({min(bad_e):.1f}-{max(bad_e):.1f} s): a dark frame with no readable hero")
    for who, d in per.items():
        if not d["bad"] or len(d["bad"]) < max(1, 0.3 * d["n"]): continue
        body = f", torso {sum(d['body']) / len(d['body']):.0f} luma" if d["body"] else ""
        out.append(f"too_dark: {who} silhouette separation {d['min'] * 100:.0f} % (outline vs the room behind{body}) in "
                   f"{len(d['bad'])} of {d['n']} frames ({min(d['bad']):.1f}-{max(d['bad']):.1f} s): the character is lost in the dark")
    return out


def thumb(stats):
    return base64.b64decode(stats["thumb"])


def frame_diff(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / (len(a) * 255.0)


def check_frames(stats, spec, dur):
    """black / blown-out frames and sudden single-frame jumps (the neighbourhood's median change x4)"""
    n = len(stats)
    thumbs = [thumb(s) for s in stats]
    diffs = [0.0] + [frame_diff(thumbs[k], thumbs[k - 1]) for k in range(1, n)]
    bad = {"black": [], "blown": [], "spikes": []}
    for k, s in enumerate(stats):
        t = k / FPS
        trans = transition_at(spec, t, dur)
        # E4 v2: a lit subject on black space (a far planet, a probe against the stars) is not a black frame
        if s["mean"] < 0.02 and s["black"] > 0.97 and trans < 0.5 and max(thumbs[k] or b"\0") < 40: bad["black"].append(k)
        if s["blown"] > 0.6 and trans < 0.2: bad["blown"].append(k)
        if k == 0: continue
        if trans > 0.01 or transition_at(spec, (k - 1) / FPS, dur) > 0.01: continue
        if designed_shake_at(spec, t) or designed_shake_at(spec, (k - 1) / FPS): continue   # a designed shake is not a jump (Q6)
        if designed_whip_at(spec, t) or designed_whip_at(spec, (k - 1) / FPS) or designed_zoom_at(spec, t) or designed_zoom_at(spec, (k - 1) / FPS): continue   # v3 whip / crash zoom
        if max(s.get("flash") or 0, stats[k - 1].get("flash") or 0) > 0.02: continue      # E4 v2: a designed flash (lightning) is not a jump
        win = [diffs[j] for j in range(max(1, k - 6), min(n, k + 7)) if j != k]
        med = statistics.median(win) if win else 0.0
        if diffs[k] > max(0.06, 4.0 * med): bad["spikes"].append(k)
    return bad, diffs


def encode(frames_dir, out, n, quality, crf):
    ff = os.environ.get("FFMPEG") or "ffmpeg"
    tmp = out.with_suffix(".part.mp4")
    # the page's JPEGs are full-range BT.601; the segments are limited-range BT.709 yuv420p, tagged, so Legion can
    # concatenate them with any other footage without a range/matrix shift (or a colour-matrix re-init hang)
    cmd = [ff, "-y", "-v", "error", "-framerate", str(FPS), "-i", str(frames_dir / "%05d.jpg"), "-frames:v", str(n),
           "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow" if quality == "final" else "veryfast", "-crf", str(crf),
           "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-r", str(FPS), "-movflags", "+faststart", str(tmp)]
    subprocess.run(cmd, check=True)
    probe = subprocess.run([os.environ.get("FFPROBE") or "ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
                            "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", str(tmp)], capture_output=True, text=True, encoding="utf-8")
    got = int((probe.stdout.strip() or "0").split(",")[0] or 0)
    if got != n:
        raise RuntimeError(f"encoded {got} frames, expected {n} ({out.name})")
    os.replace(tmp, out)
    return got


def load_scene(P, spec, quality, log):
    info = P.ev("async ([s, o]) => await window.loadScene(s, o)", [spec, {"quality": quality}])
    cam = info["camera"]
    log(f"  built in {info['build_ms'] / 1000:.1f}s (world {info['world']}, {info['items']} items), camera {cam['move']}"
        f"{' (asked ' + cam['requested'] + ')' if cam['requested'] != cam['move'] else ''} level {cam['level']}, sub {info['sub']}")
    for c in cam["changes"]: log(f"    safety: {c}")
    for w in info["warnings"]: log(f"    warning: {w}")
    qa = P.ev("(f) => window.qaScene(f)", FPS)
    replans = []
    for level in (2, 4):
        if qa["ok"]: break
        log(f"  QA flagged {qa['flagged']} frames: " + "; ".join(issue_text(i) for i in qa["issues"][:4]))
        rp = P.ev("(l) => window.replan(l)", level)
        replans.append(rp)
        log(f"  re-planned (relax {level}): {rp['move']} " + "; ".join(rp["changes"][-3:]))
        qa = P.ev("(f) => window.qaScene(f)", FPS)
    w = qa["worst"]
    log(f"  QA {'ok' if qa['ok'] else 'FAILED'}: min clearance {w['clearance_m']:.2f} m, max speed {w['cam_speed']:.1f} m/s "
        f"({w['speed_ratio']:.2f} x alt/s), max turn {w['ang_speed']:.0f} deg/s, roll {w['roll_deg']:.1f} deg"
        + (f", nearest figure {w['fig_dist']:.2f} m" if w.get("fig_dist") is not None else ""))
    for i in qa.get("issues") or []:
        if isinstance(i, str): log(f"  QA {i}")               # E1 v2 coded issues (code: text), never a render gate
    lo = qa.get("locomotion") or {}
    if lo.get("walkers") or lo.get("error"):
        # QUALITY.md H1 (engine/core/loco.js): facing vs travel and gait vs ground of everything that walks; flagged, not blocking
        rr = lambda v: "-" if v is None else f"{v:.2f}"
        log(f"  locomotion {'ok' if lo.get('ok') else 'FLAGGED'}: {lo.get('checked', 0)} moving of {lo.get('walkers', 0)}, max facing/travel "
            f"{lo.get('max_angle_deg', 0):.0f} deg, backwards {lo.get('backwards', 0)}, sideways {lo.get('sideways', 0)}, gait/ground "
            f"{rr(lo.get('slide_ratio_min'))}-{rr(lo.get('slide_ratio_max'))}" + (f", flipbook step {lo['flip_step_max_m']:.3f} m" if lo.get("flip_step_max_m") else "")
            + (f"  error: {lo['error']}" if lo.get("error") else ""))
        for f in (lo.get("flagged") or [])[:6]:
            log(f"    {f['who']} @ {f['t']:.1f}s: {f['what']}")
    return info, qa, replans


def render_scene(P, spec, outdir, args, log):
    sid = str(spec.get("id") or "scene")
    rec = {"id": sid, "status": "error"}
    t0 = time.time()
    info, qa, replans = load_scene(P, spec, args.quality, log)
    dur = info["dur"]
    rec.update({"dur": dur, "load": info, "qa": qa, "replans": replans})
    if not qa["ok"] and not args.force:
        rec["status"] = "failed_qa"
        log(f"  {sid}: camera QA failed; not rendered (use --force to render anyway)")
        return rec
    n = int(round(dur * FPS))
    frames_dir = Path(tempfile.mkdtemp(prefix=f"f3d_{sid}_", dir=str(outdir)))
    q = 0.95 if args.quality == "final" else 0.9
    stats = []
    t1 = time.time()
    try:
        def grab(k):
            P.ev("(t) => window.renderFrame(t)", k / FPS)
            g = P.ev("(q) => window.grabFrame(q)", q)
            (frames_dir / f"{k:05d}.jpg").write_bytes(base64.b64decode(g["jpg"].split(",", 1)[1]))
            return g["stats"]
        for k in range(n):
            stats.append(grab(k))
            if (k + 1) % 30 == 0 or k + 1 == n:
                el = time.time() - t1
                log(f"  {sid}: {k + 1}/{n} frames, {el / (k + 1):.2f} s/frame, eta {el / (k + 1) * (n - k - 1):.0f}s")
        bad, diffs = check_frames(stats, spec, dur)
        flagged = sorted(set(bad["black"] + bad["blown"] + bad["spikes"]))
        rerendered = 0
        if flagged:
            log(f"  frame check: black {bad['black'][:8]}, blown {bad['blown'][:8]}, jumps {bad['spikes'][:8]} -> rendering them again")
            for k in flagged[:60]:
                stats[k] = grab(k); rerendered += 1
            bad, diffs = check_frames(stats, spec, dur)
        render_s = time.time() - t1
        th = info.get("qa") or {}                       # autostyle v2: the look preset's thresholds (none = today's)
        fi = face_issues(stats, [k / FPS for k in range(n)], th, spec, dur) + blown_issues(stats, [k / FPS for k in range(n)], spec, dur, th) + dark_issues(stats, [k / FPS for k in range(n)], spec, dur, th)
        if fi:
            qa.setdefault("issues", []).extend(fi)
            for i in fi: log(f"  QA {i}")
        out = outdir / f"{sid}.mp4"
        encode(frames_dir, out, n, args.quality, args.crf)
        ok_frames = not (bad["black"] or bad["blown"] or bad["spikes"])
        rec.update({
            "status": "ok" if (qa["ok"] and ok_frames) else ("rendered_with_issues"),
            "mp4": str(out), "frames": n, "render_s": round(render_s, 1), "s_per_frame": round(render_s / max(1, n + rerendered), 3),
            "frame_checks": {"black": bad["black"], "blown": bad["blown"], "jumps": bad["spikes"], "rerendered": rerendered,
                             "max_diff": round(max(diffs), 4) if diffs else 0, "median_diff": round(statistics.median(diffs), 4) if diffs else 0},
            "total_s": round(time.time() - t0, 1),
        })
        log(f"  {sid}: -> {out.name}  {n} frames in {render_s:.0f}s ({rec['s_per_frame']:.2f} s/frame){'' if ok_frames else '  FRAME ISSUES: ' + json.dumps(rec['frame_checks'])}")
    finally:
        shutil.rmtree(frames_dir, ignore_errors=True)
    return rec


def preview_scene(P, spec, outdir, times, args, log):
    sid = str(spec.get("id") or "scene")
    info, qa, replans = load_scene(P, spec, args.quality, log)
    rec = {"id": sid, "status": "preview", "dur": info["dur"], "load": info, "qa": qa, "replans": replans, "stills": []}
    if args.eval:
        # debugging hook: evaluate an expression in the page after the scene is built (window.__f3d has the scene)
        try:
            r = P.ev(f"() => {{ const f3d = window.__f3d; return ({args.eval}); }}")
            log("  eval: " + json.dumps(r, ensure_ascii=False)[:4000])
        except Exception as e:
            log("  eval failed: " + str(e)[:800])
    if getattr(args, "preview_frac", None):              # Legion: stills at fractions of each scene's own length
        times = [float(f) * info["dur"] for f in args.preview_frac.split(",") if f.strip()]
    for t in times:
        t = min(max(0.0, t), info["dur"] - 1.0 / FPS)
        t1 = time.time()
        P.ev("(t) => window.renderFrame(t)", t)
        g = P.ev("(q) => window.grabFrame(q)", 0.92)
        f = outdir / f"{sid}_{t:05.2f}.jpg"
        f.write_bytes(base64.b64decode(g["jpg"].split(",", 1)[1]))
        qf = P.ev("(t) => window.qaFrame(t)", t)
        rec["stills"].append({"t": t, "file": str(f), "qa": qf, "s": round(time.time() - t1, 2), "faces": g["stats"].get("faces") or [], "hot": g["stats"].get("hot", 0), "p90": g["stats"].get("p90"), "target": g["stats"].get("target")})
        log(f"  {f.name}  {time.time() - t1:.2f}s  clearance {qf['clearance_m']:.1f} m, speed {qf['cam_speed']:.1f} m/s, turn {qf['ang_speed']:.0f} deg/s"
            + (f"  ! {'; '.join(qf['warnings'])}" if qf["warnings"] else ""))
    th = info.get("qa") or {}                           # autostyle v2: the look preset's thresholds (none = today's)
    fi = face_issues([{"faces": s.get("faces")} for s in rec["stills"]], [s["t"] for s in rec["stills"]], th, spec, info["dur"])
    fi += blown_issues([{"hot": s.get("hot", 0)} for s in rec["stills"]], [s["t"] for s in rec["stills"]], spec, info["dur"], th)
    fi += dark_issues([{"faces": s.get("faces"), "p90": s.get("p90"), "target": s.get("target")} for s in rec["stills"]], [s["t"] for s in rec["stills"]], spec, info["dur"], th)
    if fi:
        qa.setdefault("issues", []).extend(fi)
        for i in fi: log(f"  QA {i}")
    return rec


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", nargs="?"); ap.add_argument("outdir", nargs="?")
    ap.add_argument("--scenes", default=None, help="comma-separated scene ids")
    ap.add_argument("--preview", default=None, help="comma-separated times: stills instead of mp4s")
    ap.add_argument("--preview-frac", default=None, help="comma-separated fractions of each scene's length: stills")
    ap.add_argument("--w", type=int, default=None); ap.add_argument("--h", type=int, default=None)
    ap.add_argument("--quality", choices=["draft", "final"], default="final")
    ap.add_argument("--sub", type=int, default=None, help="override sub-frames per frame")
    ap.add_argument("--crf", type=int, default=16)
    ap.add_argument("--force", action="store_true", help="render scenes whose camera QA still fails")
    ap.add_argument("--catalog", default=None, help="write the merged catalog JSON to this path and exit")
    ap.add_argument("--eval", default=None, help="(preview) debug: JS expression evaluated after each scene loads; `f3d` = window.__f3d")
    ap.add_argument("--assets", default=None, help="v3: the job's assets directory (photos, image sequences), served at /assets/ (default: video.json \"assets\", relative to it)")
    args = ap.parse_args()
    from playwright.sync_api import sync_playwright

    if args.catalog:
        srv = serve()
        with gpu_lock("f3d catalog"), sync_playwright() as pw:
            P = Page(pw, srv.server_address[1], 640, 360, quality="draft")
            try:
                P.open()
                cat = P.ev("() => window.getCatalog()")
            finally:
                P.close()
        Path(args.catalog).write_text(json.dumps(cat, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"catalog: {len(cat['kinds'])} kinds (+{len(cat['fallbacks'])} core fallbacks) -> {args.catalog}  libraries {cat['libraries']}")
        srv.shutdown()
        return 0

    if not args.video or not args.outdir:
        ap.error("video.json and OUTDIR are required (or --catalog OUT.json)")
    video = json.loads(Path(args.video).read_text(encoding="utf-8"))
    assets = Path(args.assets).expanduser() if args.assets else ((Path(args.video).resolve().parent / str(video["assets"])) if isinstance(video, dict) and video.get("assets") else None)
    if assets is not None:                               # v3: /assets/ -> the job's media (lib/shared/media.js)
        if assets.is_dir(): Handler.assets = str(assets.resolve()); print(f"assets: /assets/ -> {Handler.assets}", flush=True)
        else: print(f"assets: {assets} is not a directory; /assets/ requests will 404 (missing media render as neutral cards)", file=sys.stderr, flush=True)
    if "scenes" not in video: video = {"cast": video.pop("castDefs", []), "scenes": [video]}
    scenes = video["scenes"]
    if args.scenes:
        want = [s.strip() for s in args.scenes.split(",") if s.strip()]
        scenes = [s for s in scenes if str(s.get("id")) in want]
        missing = set(want) - {str(s.get("id")) for s in scenes}
        if missing: print("unknown scene ids:", ", ".join(sorted(missing)), file=sys.stderr)
    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)
    preview = [float(x) for x in args.preview.split(",")] if args.preview else ([0.0] if args.preview_frac else None)
    # Shorts: the film is 9:16 (VIDEO_W/VIDEO_H), previews at half size
    fw, fh = int(os.environ.get("VIDEO_W", "1080")), int(os.environ.get("VIDEO_H", "1920"))
    w = args.w or (fw // 2 if preview else fw); h = args.h or (fh // 2 if preview else fh)
    report = {"video": str(Path(args.video).resolve()), "outdir": str(outdir.resolve()), "quality": args.quality, "w": w, "h": h, "fps": FPS,
              "started": time.strftime("%Y-%m-%d %H:%M:%S"), "platform": platform.platform(), "scenes": []}
    logf = open(outdir / "render.log", "a", encoding="utf-8")

    def log(s):
        print(s, flush=True); logf.write(s + "\n"); logf.flush()

    srv = serve()
    t0 = time.time()
    with gpu_lock(f"f3d render {Path(args.video).name}"), sync_playwright() as pw:
        P = Page(pw, srv.server_address[1], w, h, sub=args.sub, quality=args.quality)
        try:
            P.open()
            P.ev("(c) => window.setCast(c)", video.get("cast") or [])
            for spec in scenes:
                sid = str(spec.get("id") or "scene")
                log(f"== {sid} ({spec.get('camera', {}).get('move', 'fpv_flythrough')}, {spec.get('dur', 10)} s)")
                rec = None
                for attempt in (1, 2):
                    try:
                        rec = preview_scene(P, spec, outdir, preview, args, log) if preview else render_scene(P, spec, outdir, args, log)
                        break
                    except Exception as e:
                        errs = [m for m in P.msgs if "PAGEERROR" in m or m.startswith("error")][-6:]
                        log(f"  {sid}: attempt {attempt} failed: {str(e)[:600]}" + ("\n    " + "\n    ".join(errs) if errs else ""))
                        rec = {"id": sid, "status": "error", "error": str(e)[:2000], "page_errors": errs}
                        if attempt == 1:
                            P.close(); P.msgs.clear(); P.open()                 # a crashed GPU process: start clean once
                            P.ev("(c) => window.setCast(c)", video.get("cast") or [])
                report["scenes"].append(rec)
                (outdir / "report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
        finally:
            P.close()
    srv.shutdown()
    report["total_s"] = round(time.time() - t0, 1)
    rendered = [s for s in report["scenes"] if s.get("s_per_frame")]
    if rendered: report["s_per_frame"] = round(sum(s["render_s"] for s in rendered) / sum(s["frames"] for s in rendered), 3)
    (outdir / "report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    bad = [s["id"] for s in report["scenes"] if s["status"] not in ("ok", "preview")]
    log(f"done in {report['total_s']:.0f}s: {len(report['scenes']) - len(bad)} ok" + (f", problems: {', '.join(bad)}" if bad else "") + f"  -> {outdir / 'report.json'}")
    logf.close()
    return 2 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
