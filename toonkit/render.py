"""Toon engine: render the three.js scene (index.html) frame by frame with the lens finish. Picture only: Legion adds
the captions, voice, music and sound afterwards.
usage: python render.py --stills 0.5,1.2,... [prefix]   stills <prefix><t>.png (default s_), the check before any render
       python render.py --range 12.3 14.0      re-render only that stretch (one fixed shot) and splice it into toon.mp4
       TOON_PAGE=other.html python render.py ...  render another assembled page (the librarian's check)
       python render.py --render               the whole Short, up to 8 parts at once -> toon.mp4 (progress in render_progress.txt)"""
import functools, http.server, json, os, pathlib, re, subprocess, sys, threading, time
import cv2
import numpy as np

HERE = pathlib.Path(__file__).parent
W, H = 1080, 1920
def _free_gb():
    """Free memory in GB (a browser plus its encoder takes about 1.3 GB at 1080x1920)."""
    try:
        if os.name == "nt":
            import ctypes

            class _M(ctypes.Structure):
                _fields_ = [("n", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [(k, ctypes.c_ulonglong) for k in ("tot", "avail", "tp", "ap", "tv", "av", "ext")]
            m = _M(); m.n = ctypes.sizeof(_M); ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
            return min(m.avail, m.ap) / 2 ** 30            # free RAM, or free commit (RAM + page file) when that runs out first
        if sys.platform == "darwin":
            import subprocess
            return int(subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True).stdout) * 0.6 / 2 ** 30
        return os.sysconf("SC_AVPHYS_PAGES") * os.sysconf("SC_PAGE_SIZE") / 2 ** 30
    except Exception:                                    # noqa: BLE001
        return 16.0


# one browser per two cores, up to 8 at once, and never more than free memory carries (8 at once ran out on a 16 GB laptop)
PARTS = max(1, min(8, (os.cpu_count() or 8) // 2, int(_free_gb() // 2.5)))   # a part (browser + renderer + encoder) commits ~2.5 GB
JOB = json.loads((HERE / "job.json").read_text(encoding="utf-8"))
DUR = float(JOB["seconds"])
FPS = int(JOB.get("fps", 30))                     # flat styles render 60 (the references are true 60 fps); the 3D look 30
LENS = JOB.get("lens", True)                            # the 3D lens finish; flat vector styles stay crisp (lens: false)


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass


def serve():
    s = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_Quiet, directory=str(HERE)))
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


_Y, _X = np.mgrid[0:H, 0:W]
_SOFT = (np.clip(((_Y / H - 0.50) / 0.50) ** 2 + ((_X / W - 0.5) / 1.3) ** 2, 0, 1) ** 3.0)[..., None]
_VIG = ((1 - 0.16 * np.clip(np.sqrt(((_X / W - 0.5) / 0.7) ** 2 + ((_Y / H - 0.5) / 0.7) ** 2), 0, 1) ** 2)
        * (1.0 - 0.08 * np.clip((_Y / H - 0.55) / 0.45, 0, 1)))[..., None]


def finish(img):
    """Lens: sharp middle band, soft top/bottom, vignette. No saturation scale and no gamma lift."""
    if not LENS:
        return img
    f = img.astype(np.float32)
    f = f * (1 - _SOFT) + cv2.GaussianBlur(f, (0, 0), 1.5) * _SOFT
    return np.clip(f * _VIG, 0, 255).astype(np.uint8)


def page(p):
    b = p.chromium.launch(args=["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": W, "height": H})
    logs = []
    pg.on("console", lambda m: logs.append(m.text)); pg.on("pageerror", lambda e: logs.append("ERR " + str(e)))
    return b, pg, logs


def frame(pg, t):
    pg.evaluate(f"window.render({t})")
    return finish(cv2.imdecode(np.frombuffer(pg.locator("canvas").screenshot(type="jpeg", quality=95), np.uint8), cv2.IMREAD_COLOR))


def opened(p, srv):
    b, pg, logs = page(p)
    pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/{os.environ.get('TOON_PAGE', 'index.html')}")
    pg.wait_for_function("window.ready === true || window.failed", timeout=120000)
    return b, pg, logs


def stills(times, prefix="s_"):
    from playwright.sync_api import sync_playwright
    srv = serve()
    with sync_playwright() as p:
        b, pg, logs = opened(p, srv)
        for t in times:
            cv2.imwrite(str(HERE / f"{prefix}{t:05.2f}.png"), frame(pg, t))
            mk = pg.evaluate("window.marks ? window.marks() : null")   # flat engine: where the hero, cast and devices sit (check.py)
            if mk is not None:
                (HERE / f"{prefix}{t:05.2f}.marks.json").write_text(json.dumps(mk))
        plan = pg.evaluate("window.shotPlan ? window.shotPlan() : null")   # toon motion kit: every shot's size, angle, place (check.py)
        if plan:
            (HERE / "shots.json").write_text(json.dumps(plan))
        audit = pg.evaluate("window.camAudit ? window.camAudit() : null")   # the camera's own rules: smears, speakers, who is in each shot
        if audit:
            (HERE / "camera.json").write_text(json.dumps(audit))
        b.close()
    srv.shutdown()
    print("stills:", len(times), "| page errors:" if logs else "| no page errors", logs[:8] if logs else "")


def part(k, n, f0=None, f1=None, out=None):
    from playwright.sync_api import sync_playwright
    srv = serve()
    out = out or HERE / f"part_{k}.mp4"
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-", "-c:v", "libx264",
                           "-crf", "16", "-pix_fmt", "yuv420p", str(out)], stdin=subprocess.PIPE)
    with sync_playwright() as p:
        b, pg, logs = opened(p, srv)
        total = int(round(DUR * FPS))
        for i in (range(f0, f1) if f0 is not None else range(k * total // n, (k + 1) * total // n)):
            ok, buf = cv2.imencode(".jpg", frame(pg, i / FPS), [cv2.IMWRITE_JPEG_QUALITY, 95])
            ff.stdin.write(buf.tobytes())
            if i % 15 == 0:
                print(f"frame {i}", flush=True)
        b.close()
        if logs:
            print("page:", logs[:8], flush=True)
    ff.stdin.close(); ff.wait(); srv.shutdown()
    print("part done", flush=True)


def render_all(n=PARTS):
    """All parts at once (one browser each), then joined. A part that fails stops the render with its log."""
    procs = [subprocess.Popen([sys.executable, str(HERE / "render.py"), "--part", str(k), str(n)], cwd=HERE,
                              stdout=open(HERE / f"part_{k}.log", "w"), stderr=subprocess.STDOUT) for k in range(n)]
    total = int(round(DUR * FPS))
    while any(p.poll() is None for p in procs):
        time.sleep(5)
        done = 0
        for k in range(n):
            got = re.findall(r"frame (\d+)", (HERE / f"part_{k}.log").read_text(errors="ignore"))
            done += (int(got[-1]) - k * total // n) if got else 0
        (HERE / "render_progress.txt").write_text(f"Rendering the Short: {min(99, 100 * done // max(1, total))}%", encoding="utf-8")
    bad = [k for k, p in enumerate(procs) if p.returncode != 0]
    if bad:
        sys.exit("render failed:\n" + (HERE / f"part_{bad[0]}.log").read_text(errors="ignore")[-1500:])
    (HERE / "parts.txt").write_text("".join(f"file 'part_{k}.mp4'\n" for k in range(n)))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "parts.txt", "-c", "copy", "toon.mp4"], cwd=HERE, check=True)
    for k in range(n):
        (HERE / f"part_{k}.mp4").unlink(missing_ok=True)
    (HERE / "render_progress.txt").write_text("Rendering the Short: 100%", encoding="utf-8")
    print("done toon.mp4", DUR, "s")


def rerange(a, b):
    """Re-render only a..b seconds (the shot that was fixed) and splice it into toon.mp4; every other frame stays."""
    total = int(round(DUR * FPS))
    f0, f1 = max(0, int(round(a * FPS))), min(total, int(round(b * FPS)))
    part(0, 1, f0, f1, HERE / "fix_mid.mp4")
    enc = ["-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p"]
    segs = []
    if f0 > 0:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "toon.mp4", "-vf", f"trim=end_frame={f0},setpts=PTS-STARTPTS", *enc, "fix_pre.mp4"], cwd=HERE, check=True)
        segs.append("fix_pre.mp4")
    segs.append("fix_mid.mp4")
    if f1 < total:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "toon.mp4", "-vf", f"trim=start_frame={f1},setpts=PTS-STARTPTS", *enc, "fix_post.mp4"], cwd=HERE, check=True)
        segs.append("fix_post.mp4")
    (HERE / "fix_parts.txt").write_text("".join(f"file '{x}'\n" for x in segs))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "fix_parts.txt", "-c", "copy", "toon_fixed.mp4"], cwd=HERE, check=True)
    (HERE / "toon_fixed.mp4").replace(HERE / "toon.mp4")
    for x in segs + ["fix_parts.txt"]:
        (HERE / x).unlink(missing_ok=True)
    print(f"re-rendered {a:.2f}-{b:.2f}s ({f1 - f0} frames) into toon.mp4")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--stills":
        stills([float(x) for x in sys.argv[2].split(",")], sys.argv[3] if len(sys.argv) > 3 else "s_")
    elif len(sys.argv) > 3 and sys.argv[1] == "--range":
        rerange(float(sys.argv[2]), float(sys.argv[3]))
    elif len(sys.argv) > 3 and sys.argv[1] == "--part":
        part(int(sys.argv[2]), int(sys.argv[3]))
    elif len(sys.argv) > 1 and sys.argv[1] == "--render":
        render_all()
    else:
        print(__doc__)
