#!/usr/bin/env python3
"""timeline.py — the timeline editor behind the "Edit" button on every finished video.

A Shorts video is a list of slots cut on the narration (plan.json: [kind, file, light-leak, seconds]) with text
labels (overlays.json) and captions (subs.srt) burnt on top. The editor shows those as tracks. A change — made by
hand or asked of Claude in the chat beside the timeline — becomes a task in a queue: a shot is cut from the footage
the watcher already logged for this video (or found with a new search), a picture is drawn, a graphic is drawn again
with new words, a slot is retimed. Each changed slot is rendered on its own at once, so the timeline plays it
before anything is assembled. Render then puts the whole video together the way the pipeline does — every segment
nobody touched comes from the cache, so nothing is paid for twice.

Every change keeps the narration's clock: a slot only ever gives its time to a neighbour, so the total length and
every untouched slot's start stay exactly where they were. That is what lets the preview play the finished video
for the untouched slots and the freshly rendered piece for the changed ones.

What it writes, all in <job>/_timeline/:
    state.json      the chat, the task queue
    base.json       the plan the cached segments were rendered for (the last render)
    history/        the plan, labels and captions before each change — Undo
    preview/        changed slots rendered on their own, named by what they show
    thumbs/         one frame per slot for the timeline
    peaks.json      the narration's waveform
    graphics/       the specs of graphics drawn again in the editor

Heavy work (segment previews, graphics) runs in a child process (`python timeline.py previews|graphic ...`): the
engine keeps per-video settings in module globals, and the app may be rendering another video at the same moment.
"""

import contextlib
import difflib
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path


def _claude_kind(engine, kind: str, job=None):
    """Token diet: `with _claude_kind(engine, "<kind>"):` names the kind of the Claude calls inside (the engine's
    claude_step, which meters them per kind); nothing on an engine without it."""
    cs = getattr(engine, "claude_step", None)
    if isinstance(cs, type):
        try:
            return cs(kind, job=job) if job is not None else cs(kind)
        except Exception:                                    # noqa: BLE001 - naming a call never stops it
            pass
    import contextlib
    return contextlib.nullcontext()


def _no_limit_wait(engine):
    """Token diet (integrator, 2026-10-12; tokens-ui-to-timeline-owner.md): a Claude call a person is waiting on must not
    wait hours for a plan limit to reset — make_video._limit_waits(False) makes it fail at once with the CLI's own words
    (make_video._ClaudeLimitError), and nothing goes to the paid API unless CLAUDE_FALLBACK=pay_on_limit. A no-op for
    an engine without the token diet."""
    lw = getattr(engine, "_limit_waits", None)
    if isinstance(lw, type):
        try:
            return lw(False)
        except Exception:                                    # noqa: BLE001
            pass
    import contextlib
    return contextlib.nullcontext()


HERE = Path(__file__).resolve().parent
TL = "_timeline"
MIN_SLOT = 0.8            # no slot is left shorter than this after a change
HISTORY_KEEP = 40
# how long a task usually takes, in seconds — what the chat's "ready in" is worked out from
# measured on real edits (2026-10-03): Claude's pick + the cut ≈ 60 s, a new YouTube search (two videos watched) ≈ 2–2.5 min,
# an AI picture ≈ 40 s, a graphic drawn again ≈ 75 s + a 10 s probe, a hand-picked shot ≈ 30 s, a preview ≈ 5 s a shot
EST = {"preview": 6, "fill_catalog": 60, "fill_search": 150, "fill_image": 40, "graphic": 85, "fill_file": 30, "chat": 20}
_ON_IDLE = {"fn": None}     # app callback: render this job now (the "render when the queue is done" switch)

_JOB_LOCKS: dict = {}
_GLOBAL = threading.Lock()
_QUEUE: list = []          # [(job path str, task id)] waiting for the worker, oldest first
_QCOND = threading.Condition()
_WORKER = {"thread": None, "busy": None, "current": None}
_THUMB_SEM = threading.Semaphore(3)


# ── files ──────────────────────────────────────────────────────────────────────

def _lock(job: Path) -> threading.RLock:
    with _GLOBAL:
        return _JOB_LOCKS.setdefault(str(Path(job).resolve()), threading.RLock())


def tdir(job: Path) -> Path:
    d = Path(job) / TL
    d.mkdir(exist_ok=True)
    return d


def _read(p: Path, default):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _write(p: Path, obj) -> None:
    p = Path(p)
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, p)


def _probe(path: Path) -> float:
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                           capture_output=True, text=True, timeout=60)
        return float((r.stdout or "0").strip().splitlines()[0])
    except (subprocess.TimeoutExpired, OSError, ValueError, IndexError):
        return 0.0


def _clock(s: float) -> str:
    s = max(0.0, float(s))
    m, sec = divmod(s, 60)
    return f"{int(m)}:{sec:04.1f}"


# ── keeping the computer usable ────────────────────────────────────────────────
# A render, a redrawn graphic (Chromium) and the app's own video render all at once — plus the person's browser and
# other apps — ran a 24 GB Mac out of memory until it froze. So: everything heavy runs in a child process at low
# priority, waits for free memory before it starts, and Chromium runs one at a time on the whole computer.

def free_percent() -> int:
    """How much memory is free, in percent; -1 when this system cannot say."""
    try:
        if sys.platform == "darwin":
            out = subprocess.run(["memory_pressure"], capture_output=True, text=True, timeout=20).stdout
            for line in out.splitlines():
                if "free percentage" in line:
                    return int(line.rsplit(":", 1)[1].strip().rstrip("%"))
        elif Path("/proc/meminfo").exists():
            info = dict(l.split(":", 1) for l in Path("/proc/meminfo").read_text().splitlines() if ":" in l)
            kb = lambda k: float(info[k].strip().split()[0])
            return int(100 * kb("MemAvailable") / kb("MemTotal"))
        else:
            import psutil                                       # Windows, when it is installed
            return int(100 - psutil.virtual_memory().percent)
    except Exception:                                          # noqa: BLE001
        pass
    return -1


def _min_mem() -> int:
    """SHORTS_MIN_FREE_MEM (per cent of memory that must be free before heavy work starts), default 25."""
    try:
        return int(os.environ.get("SHORTS_MIN_FREE_MEM") or 25)
    except ValueError:
        return 25


def _min_disk() -> float:
    """SHORTS_MIN_FREE_DISK_GB (GB a render needs free on the system disk and the video's disk), default 8.
    The system disk counts too: when memory runs short, macOS swaps there, and a full disk then freezes everything."""
    try:
        return float(os.environ.get("SHORTS_MIN_FREE_DISK_GB") or 8)
    except ValueError:
        return 8.0


def disk_short(job: Path) -> str:
    """'' — or which disk has too little room for a render, in words."""
    need = _min_disk()
    for where in ([Path(job)] + ([Path("/")] if os.name != "nt" else [])):
        try:
            free = shutil.disk_usage(where).free / 1024 ** 3     # GiB — what df and Finder's "available" show
        except OSError:
            continue
        if free < need:
            return (f"only {free:.1f} GB free on {'the system disk' if str(where) == '/' else 'the video’s disk'} — "
                    f"a render needs at least {need:.0f} GB (set SHORTS_MIN_FREE_DISK_GB to change this)")
    return ""


def wait_for_memory(say=None, need: int = 0, max_wait: int = 900) -> None:
    """Hold heavy work until enough memory is free (SHORTS_MIN_FREE_MEM %, 15 minutes at most, then it goes on)."""
    need = need or _min_mem()
    t0, said = time.time(), False
    while time.time() - t0 < max_wait:
        fp = free_percent()
        if fp < 0 or fp >= need:
            return
        if say and not said:
            say(f"  waiting for memory to free up ({fp}% free) — other renders or apps are using it")
            said = True
        time.sleep(5)


def _low_priority() -> dict:
    """subprocess arguments that start a child below normal priority, so the computer stays responsive."""
    if os.name == "nt":
        return {"creationflags": getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0x4000)}
    return {"preexec_fn": lambda: os.nice(10)}


@contextlib.contextmanager
def render_lock(name: str = "shorts timeline"):
    """One heavy render (a video, a Chromium graphic) at a time on this computer. A flock on one file, released by
    the OS if its holder dies; SHORTS_RENDER_LOCK points it at a lock other render tools on the machine share."""
    try:
        import fcntl
    except ImportError:                                        # Windows: memory only
        wait_for_memory(print)
        yield
        return
    path = Path(os.environ.get("SHORTS_RENDER_LOCK") or (Path.home() / ".legion" / "render.lock"))
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a+") as f:
        said = False
        while True:
            try:
                fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if not said:
                    print(f"  waiting for another render to finish before {name}", flush=True)
                    said = True
                time.sleep(2)
        try:
            wait_for_memory(print)
            f.seek(0)
            f.truncate()
            f.write(f"{name} pid {os.getpid()} since {time.strftime('%H:%M:%S')}\n")
            f.flush()
            # Shorts engine (guard review): a guard.heavy_lock() taken inside this hold, in this same thread, goes on
            # inside it when SHORTS_RENDER_LOCK names one file for both
            try:
                import guard as _guard
                mark = _guard.holding_render_lock
            except (ImportError, AttributeError):
                mark = contextlib.nullcontext
            with mark():
                yield
        finally:
            f.seek(0)
            f.truncate()
            f.flush()
            fcntl.flock(f, fcntl.LOCK_UN)


# ── the plan ───────────────────────────────────────────────────────────────────

def load_plan(job: Path) -> list:
    rows = _read(Path(job) / "plan.json", None)
    if not isinstance(rows, list):
        return []
    return [[str(e[0]), str(e[1]), bool(e[2]), float(e[3])] for e in rows
            if isinstance(e, (list, tuple)) and len(e) == 4]


def sig(e) -> str:
    """What a segment shows: the same signature means the cached segment is still right for the slot."""
    return f"{e[0]}|{Path(str(e[1])).name}|{round(float(e[3]), 2)}|{1 if e[2] else 0}"


def _key(e) -> str:
    return hashlib.sha1((sig(e) + "|" + str(e[1])).encode("utf-8")).hexdigest()[:16]


def rebase(job: Path, p) -> Path:
    """A file the plan names, wherever the job folder is now (a job moved to another disk keeps old paths)."""
    path = Path(str(p))
    if path.exists():
        return path
    s = str(p).replace("\\", "/")
    mark = f"/{Path(job).name}/"
    i = s.rfind(mark)
    if i >= 0:
        cand = Path(job) / s[i + len(mark):]
        if cand.exists():
            return cand
    return path


def starts(plan: list) -> list:
    out, t = [], 0.0
    for e in plan:
        out.append(t)
        t += float(e[3])
    return out


def _slot_at(plan: list, t: float) -> int:
    acc = 0.0
    for i, e in enumerate(plan):
        acc += float(e[3])
        if t < acc - 1e-6:
            return i
    return len(plan) - 1


def align(base: list, cur: list) -> dict:
    """{current slot: base slot} for every slot that is still exactly what the last render showed, at the same time."""
    bs, cs = [sig(e) for e in base], [sig(e) for e in cur]
    bt, ct = starts(base), starts(cur)
    out = {}
    for blk in difflib.SequenceMatcher(None, bs, cs, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            j, i = blk.a + k, blk.b + k
            if abs(bt[j] - ct[i]) < 0.06:
                out[i] = j
    return out


def editable(job: Path) -> tuple:
    """(True, "") or (False, why) — the editor works on a video built from slots (the Documentary family)."""
    job = Path(job)
    if not (job / "plan.json").exists():
        return False, "This video has no timeline file (plan.json) — it was made before the editor existed, or by a look that draws the whole video in one piece."
    plan = load_plan(job)
    if not plan:
        return False, "This video's timeline is in an older format the editor cannot read."
    if not (job / "audio.mp3").exists():
        return False, "The narration (audio.mp3) is not in the video's folder any more."
    return True, ""


# ── what each slot is ──────────────────────────────────────────────────────────

GFX_NAMES = [("map_", "map", "Map"), ("doc_", "graphic", "Graphic"), ("chapter_", "chapter", "Chapter card"),
             ("spot_", "photo", "Photo spotlight"), ("objects_", "photo", "Real object"), ("headline_", "press", "Headline"),
             ("press_", "press", "Press clipping"), ("strip_", "press", "Headline strip"), ("tilt_", "press", "Headline"),
             ("vox_", "graphic", "Collage"), ("match_", "graphic", "Match cut"), ("kit_", "graphic", "Graphic"),
             ("threed_", "threed", "3D scene"), ("introcap", "graphic", "Opening"), ("intro", "graphic", "Opening"),
             ("ed_", "graphic", "Graphic (edited)")]


def _catalog(job: Path) -> dict:
    """{video id: shot log} — every source video the footage watcher logged for this job."""
    out = {}
    cat = Path(job) / "youtube" / "catalog"
    if cat.is_dir():
        for f in cat.glob("*.json"):
            if f.name.startswith("._"):
                continue
            d = _read(f, None)
            if isinstance(d, dict):
                out[str(d.get("id") or f.stem)] = d
    return out


def _clip_rows(job: Path) -> dict:
    """{clip file name: clips.json row} — what each cut YouTube clip was found for."""
    rows = _read(Path(job) / "youtube" / "clips.json", [])
    return {Path(str(r.get("path") or "")).name: r for r in rows if isinstance(r, dict) and r.get("path")}


def _sec(v) -> float:
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return sum(float(x) * 60 ** i for i, x in enumerate(reversed(str(v or "0").split(":"))))
    except ValueError:
        return 0.0


def _shot_of(row: dict, cat: dict) -> str:
    """What the shot behind a clip shows, from the watcher's log (the clip's own wish list when there is none)."""
    log = cat.get(str(row.get("video") or ""))
    a, b = float(row.get("start") or 0), float(row.get("end") or 0)
    best, over = "", 0.0
    for s in (log or {}).get("shots") or []:
        if not isinstance(s, dict):
            continue
        o = min(b, _sec(s.get("end"))) - max(a, _sec(s.get("start")))
        if o > over:
            best, over = str(s.get("shows") or ""), o
    return best or str(row.get("need") or "")


def _doc_specs(job: Path) -> dict:
    """{doc graphic file stem: its spec} — docgfx numbers its files in the order it placed the director's items,
    so they are matched to the items in order, by type."""
    d = _read(Path(job) / "motion" / "doc_scenes.json", None)
    items = (d.get("items") if isinstance(d, dict) else d) or []
    files = sorted(p.stem for p in (Path(job) / "motion").glob("doc_*_*.mp4"))
    out, k = {}, 0
    # Shorts engine (P1): a graphic named by its content (doc_h<key>_<type>) keeps its plan item beside it; the numbered
    # ones (older renders) are matched in order to the items no keyed graphic took
    claimed = []
    for stem in [s for s in files if s.startswith("doc_h")]:
        sp = _read(Path(job) / "motion" / f"{stem}.spec.json", None)
        if isinstance(sp, dict) and isinstance(sp.get("item"), dict):
            out[stem] = sp["item"]
            claimed.append(sp["item"])
    if claimed:
        items = [it for it in items if it not in claimed]
        files = [s for s in files if not s.startswith("doc_h")]
    for stem in files:
        typ = stem.split("_", 2)[-1]
        while k < len(items) and not (isinstance(items[k], dict) and str(items[k].get("type")) == typ):
            k += 1
        if k < len(items):
            out[stem] = items[k]
            k += 1
    return out


def _spec_text(spec: dict) -> str:
    if not isinstance(spec, dict):
        return ""
    for k in ("title", "line", "quote", "text", "place", "value", "date", "name", "kicker", "headline"):
        v = spec.get(k)
        if isinstance(v, (str, int, float)) and str(v).strip():
            s = str(v).strip()
            if k == "value":
                s = f"{spec.get('prefix') or ''}{s}{spec.get('suffix') or ''} {spec.get('unit') or ''}".strip()
            return s[:140]
    return ""


def graphic_spec(job: Path, entry) -> tuple:
    """(kind, spec) of a graphic the editor can draw again, or ("", None)."""
    path = rebase(job, entry[1])
    stem = path.stem
    gf = tdir(job) / "graphics" / f"{stem}.json"
    if gf.exists():
        d = _read(gf, None)
        if isinstance(d, dict) and d.get("kind") and isinstance(d.get("spec"), dict):
            return d["kind"], d["spec"]
    if stem.startswith("doc_"):
        sp = _doc_specs(job).get(stem)
        return ("doc", dict(sp)) if isinstance(sp, dict) else ("", None)
    if stem.startswith("chapter_"):
        sp = _read(path.with_suffix(".json"), None)
        if isinstance(sp, dict) and not _style_look(job).get("kit"):
            sp = {k: sp.get(k) for k in ("kicker", "title", "episode", "dark") if k in sp}
            return "chapter", sp
    if stem.startswith("map_"):
        sp = _read(path.with_suffix(".json"), None)
        if isinstance(sp, dict) and sp.get("shot") not in ("zoom", "range", "then_now", "night", "satellite"):
            return "map", sp
    return "", None


_STYLE_CACHE: dict = {}


def _style_look(job: Path) -> dict:
    st = (Path(job) / "style.txt").read_text(encoding="utf-8").strip() if (Path(job) / "style.txt").exists() else ""
    if st not in _STYLE_CACHE:
        f = HERE / "styles" / f"{st}.json"
        _STYLE_CACHE[st] = ((_read(f, {}) or {}).get("look") or {}) if st else {}
    return _STYLE_CACHE[st]


def _scene_label(job: Path, stem: str) -> str:
    """What a scene placed on the words shows: its moment (photofx, vox) or its page (headlines). The number in the
    file name is the moment's place in that folder's moments.json."""
    m = re.search(r"_(\d+)$", stem)
    if not m:
        return ""
    n = int(m.group(1))
    if stem.startswith(("headline_", "press_")):
        cap = _read(Path(job) / "headlines" / f"cap_{n:02d}.json", {})
        if isinstance(cap, dict) and cap.get("text"):
            return f"{cap.get('outlet') or cap.get('domain') or ''}: {cap['text']}".strip(": ")
        folder = "headlines"
    else:
        folder = "vox_scenes" if stem.startswith("vox_") else "photofx"
    ms = _read(Path(job) / folder / "moments.json", [])
    if isinstance(ms, list) and 0 <= n < len(ms) and isinstance(ms[n], dict):
        x = ms[n]
        return str(x.get("subject") or ", ".join(str(t) for t in x.get("things") or []) or x.get("words") or "")[:140]
    return ""


def describe(job: Path, entry, cat: dict, rows: dict, docs: dict) -> dict:
    kind, name = entry[0], Path(str(entry[1])).name
    stem = Path(name).stem
    if kind == "video":
        row = rows.get(name)
        if row:
            src = f"{row.get('title') or ''}" + (f" · {row.get('channel')}" if row.get("channel") else "")
            return {"type": "footage", "title": "Footage", "label": _shot_of(row, cat), "source": src.strip(" ·"),
                    "video": row.get("video") or "", "at": [row.get("start"), row.get("end")]}
        typ = "stock" if "pexels" in str(entry[1]) else "footage"
        return {"type": typ, "title": "Stock footage" if typ == "stock" else "Footage", "label": stem, "source": ""}
    if kind == "photo":
        return {"type": "still", "title": "Picture", "label": "AI picture (drawn in the editor)"
                if stem.startswith("ed_img") else stem, "source": ""}
    if kind != "motion":
        return {"type": "graphic", "title": "Text card", "label": stem, "source": ""}
    for pre, typ, title in GFX_NAMES:
        if stem.startswith(pre):
            label = ""
            if pre == "doc_":
                title = "Graphic · " + stem.split("_", 2)[-1]
                label = _spec_text(docs.get(stem) or {})
            elif pre in ("spot_", "objects_", "match_", "vox_", "headline_", "press_"):
                label = _scene_label(job, stem)
            elif pre in ("map_", "chapter_", "ed_"):
                if pre == "ed_":
                    sp = _read(tdir(job) / "graphics" / f"{stem}.json", {})
                    label = _spec_text((sp or {}).get("spec") or {})
                else:
                    label = _spec_text(_read(rebase(job, entry[1]).with_suffix(".json"), {}))
            return {"type": typ, "title": title, "label": label or stem, "source": ""}
    return {"type": "graphic", "title": "Graphic", "label": stem, "source": ""}


# ── labels and captions ────────────────────────────────────────────────────────

def load_labels(job: Path) -> list:
    d = _read(Path(job) / "overlays.json", [])
    return [x for x in d if isinstance(x, dict)] if isinstance(d, list) else []


_SRT_T = re.compile(r"(\d+):(\d\d):(\d\d)[,.](\d+)\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d+)")


def load_captions(job: Path) -> list:
    """[{t, end, text, head}] — head is the cue's number and time line exactly as written, so a save changes only words."""
    f = Path(job) / "subs.srt"
    if not f.exists():
        return []
    out = []
    for blk in re.split(r"\n\s*\n", f.read_text(encoding="utf-8").replace("\r\n", "\n").strip()):
        lines = blk.split("\n")
        k = next((n for n, l in enumerate(lines) if _SRT_T.search(l)), None)
        if k is None:
            continue
        g = [int(x) for x in _SRT_T.search(lines[k]).groups()]
        t0 = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000.0
        t1 = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000.0
        out.append({"t": round(t0, 3), "end": round(t1, 3), "text": "\n".join(lines[k + 1:]).strip(),
                    "head": "\n".join(lines[:k + 1])})
    return out


def save_captions(job: Path, caps: list) -> None:
    body = "\n\n".join(f"{c['head']}\n{c['text']}" for c in caps) + "\n"
    (Path(job) / "subs.srt").write_text(body, encoding="utf-8")


def _narration(caps: list, a: float, b: float) -> str:
    return " ".join(c["text"].replace("\n", " ") for c in caps if c["end"] > a + 0.05 and c["t"] < b - 0.05)[:400]


# ── state, history ─────────────────────────────────────────────────────────────

def _state(job: Path) -> dict:
    st = _read(tdir(job) / "state.json", {})
    st.setdefault("chat", [])
    st.setdefault("tasks", [])
    return st


def _save_state(job: Path, st: dict) -> None:
    st["tasks"] = st["tasks"][-200:]
    st["chat"] = st["chat"][-200:]
    _write(tdir(job) / "state.json", st)


def _base(job: Path) -> list:
    b = _read(tdir(job) / "base.json", None)
    if isinstance(b, dict) and isinstance(b.get("plan"), list):
        return [[str(e[0]), str(e[1]), bool(e[2]), float(e[3])] for e in b["plan"]]
    plan = load_plan(job)
    _write(tdir(job) / "base.json", {"plan": plan, "made": time.time()})
    return plan


def _snapshot(job: Path, note: str) -> None:
    h = tdir(job) / "history"
    h.mkdir(exist_ok=True)
    srt = Path(job) / "subs.srt"
    snap = {"note": note, "t": time.time(), "plan": load_plan(job), "labels": load_labels(job),
            "srt": srt.read_text(encoding="utf-8") if srt.exists() else None}
    n = max([int(p.stem) for p in h.glob("[0-9]*.json")] + [0]) + 1
    _write(h / f"{n:05d}.json", snap)
    for old in sorted(h.glob("[0-9]*.json"))[:-HISTORY_KEEP]:
        old.unlink(missing_ok=True)


def _save_plan(job: Path, plan: list) -> None:
    _write(Path(job) / "plan.json", [[e[0], str(e[1]), bool(e[2]), round(float(e[3]), 4)] for e in plan])


def undo(job: Path) -> dict:
    with _lock(job):
        h = tdir(job) / "history"
        snaps = sorted(h.glob("[0-9]*.json")) if h.is_dir() else []
        if not snaps:
            return {"error": "Nothing to undo."}
        snap = _read(snaps[-1], {})
        _save_plan(job, snap.get("plan") or load_plan(job))
        _write(Path(job) / "overlays.json", snap.get("labels") or [])
        if snap.get("srt") is not None:
            (Path(job) / "subs.srt").write_text(snap["srt"], encoding="utf-8")
        snaps[-1].unlink(missing_ok=True)
        _note(job, "sys", f"Undone: {snap.get('note') or 'the last change'}")
        _queue_previews(job)
        return {"ok": True, "undone": snap.get("note") or ""}


def revert(job: Path) -> dict:
    """Every change since the last render, gone: the plan the cached segments were made for comes back."""
    with _lock(job):
        h = tdir(job) / "history"
        snaps = sorted(h.glob("[0-9]*.json")) if h.is_dir() else []
        if not snaps:
            return {"error": "No changes since the last render."}
        first = _read(snaps[0], {})
        _save_plan(job, first.get("plan") or _base(job))
        _write(Path(job) / "overlays.json", first.get("labels") or [])
        if first.get("srt") is not None:
            (Path(job) / "subs.srt").write_text(first["srt"], encoding="utf-8")
        for s in snaps:
            s.unlink(missing_ok=True)
        _note(job, "sys", "All changes since the last render were discarded.")
        return {"ok": True}


def _note(job: Path, role: str, text: str, **kw) -> dict:
    with _lock(job):
        st = _state(job)
        msg = {"id": uuid.uuid4().hex[:10], "role": role, "text": text, "t": time.time(), **kw}
        st["chat"].append(msg)
        _save_state(job, st)
        return msg


# ── the timeline the editor draws ──────────────────────────────────────────────

def heal(job: Path) -> bool:
    """The library video back where it belongs after a render that died without cleaning up (kill -9, a power cut):
    no finished video, but the copy the render set aside is there. Only when this video is not rendering now."""
    import make_video as mv
    bk, mark = tdir(job) / "before_last_render.mp4", tdir(job) / "rendering"
    if not mark.exists():
        return False                     # no render of the editor's set this video aside: someone else's business
    if not (bk.exists() or bk.is_symlink()) or mv.final_video(job).exists() or (Path(job) / "video.mp4").exists():
        mark.unlink(missing_ok=True)
        return False
    os.replace(bk, Path(job) / "video.mp4")
    mark.unlink(missing_ok=True)
    try:
        title = (Path(job) / "title.txt").read_text(encoding="utf-8").splitlines()[0].strip()
        mv.publish_named_copy(job, title)
    except Exception:                                          # noqa: BLE001 - video.mp4 is found either way
        pass
    _note(job, "sys", "The last render was interrupted — the video from before it is back in your library.")
    return True


def timeline(job: Path, slug: str) -> dict:
    job = Path(job)
    ok, why = editable(job)
    title = ""
    if (job / "title.txt").exists():
        title = (job / "title.txt").read_text(encoding="utf-8").splitlines()[0].strip()
    style = (job / "style.txt").read_text(encoding="utf-8").strip() if (job / "style.txt").exists() else ""
    if not ok:
        return {"slug": slug, "title": title, "style": style, "editable": False, "why": why}
    with _lock(job):
        plan = load_plan(job)
        base = _base(job)
        st = _state(job)
        # tasks left waiting by an app that was closed go back in the queue
        for tk in st["tasks"]:
            if tk.get("state") in ("queued", "working") and not _queued(job, tk["id"]):
                tk["state"] = "queued"
                _enqueue(job, tk["id"])
    m = align(base, plan)
    cat, rows, docs = _catalog(job), _clip_rows(job), _doc_specs(job)
    caps = load_captions(job)
    total = sum(float(e[3]) for e in plan)
    items, t = [], 0.0
    for i, e in enumerate(plan):
        d = float(e[3])
        info = describe(job, e, cat, rows, docs)
        changed = i not in m
        prev = tdir(job) / "preview" / f"{_key(e)}.mp4"
        gk, _gs = graphic_spec(job, e) if e[0] == "motion" else ("", None)
        items.append({"i": i, "t": round(t, 3), "dur": round(d, 3), "kind": e[0], "file": Path(str(e[1])).name,
                      **info, "changed": changed, "editable_gfx": bool(gk),
                      "preview": (f"/api/tl/{slug}/media/preview/{_key(e)}.mp4" if changed and prev.exists() else ""),
                      "thumb": f"/api/tl/{slug}/thumb/{i}?k={_key(e)}{'c' if changed else ''}",
                      "line": _narration(caps, t, t + d)})
        t += d
    labels = [{"i": k, "t": float(x.get("t") or 0), "dur": float(x.get("dur") or 2.5), "style": x.get("style") or "",
               "text": x.get("text") or "", "sub": x.get("sub") or ""} for k, x in enumerate(load_labels(job))]
    chapters = []
    for c in _read(job / "chapters.json", []) or []:
        if isinstance(c, dict) and c.get("t") is not None:
            chapters.append({"t": float(c["t"]), "title": str(c.get("title") or "")})
    hist = tdir(job) / "history"
    import make_video as mv
    return {"slug": slug, "title": title, "style": style, "editable": True, "duration": round(total, 3),
            "video": f"/f/video/{slug}", "has_video": mv.final_video(job).exists(),
            "items": items, "labels": labels,
            "captions": [{"i": k, "t": c["t"], "end": c["end"], "text": c["text"]} for k, c in enumerate(caps)],
            "chapters": chapters, "changes": len(list(hist.glob("[0-9]*.json"))) if hist.is_dir() else 0,
            "tasks": _tasks_view(job, st), "chat": st["chat"][-80:],
            "deferred": [{"id": x.get("id"), "type": x.get("type"),
                          "label": x.get("label") or (x.get("op") or {}).get("op") or ""} for x in st.get("deferred") or []],
            "auto_render": bool(st.get("auto_render")), "render_eta": render_eta(job),
            "thinking": sum(1 for m in st["chat"] if m.get("pending")),
            "catalog": sum(len((v or {}).get("shots") or []) for v in cat.values())}


def _tasks_view(job: Path, st: dict) -> list:
    now = time.time()
    out = []
    ahead = _eta_ahead(job)
    for tk in st["tasks"][-40:]:
        row = {k: tk.get(k) for k in ("id", "label", "state", "msg", "created", "finished", "type")}
        ar = tk.get("args") or {}
        if ar.get("start") is not None and ar.get("end") is not None:
            row["range"] = [float(ar["start"]), float(ar["end"])]
        if tk.get("state") in ("queued", "working"):
            left = ahead.get(tk["id"])
            if tk.get("state") == "working" and tk.get("started"):
                left = max(5, EST.get(tk.get("type"), 30) - (now - tk["started"]))
            row["eta"] = int(left or EST.get(tk.get("type"), 30))
        out.append(row)
    return out


# ── thumbnails, waveform ───────────────────────────────────────────────────────

def thumb(job: Path, i: int) -> Path:
    plan = load_plan(job)
    if not (0 <= i < len(plan)):
        return None
    e = plan[i]
    t0 = starts(plan)[i]
    changed = i not in align(_base(job), plan)
    out = tdir(job) / "thumbs" / f"{_key(e)}{'c' if changed else ''}_{int(t0 * 10)}.jpg"
    if out.exists():
        return out
    out.parent.mkdir(exist_ok=True)
    import make_video as mv
    src, at = None, 0.0
    if not changed and mv.final_video(job).exists():
        src, at = mv.final_video(job), t0 + min(float(e[3]) * 0.5, 1.2)
    else:
        prev = tdir(job) / "preview" / f"{_key(e)}.mp4"
        src = prev if prev.exists() else rebase(job, e[1])
        at = min(float(e[3]) * 0.5, 1.2)
        if src.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            at = 0.0
    if not src or not Path(src).exists():
        return None
    # a still is read without a seek: ffmpeg 8 given -ss on a JPEG writes nothing and still exits 0
    seek = [] if Path(src).suffix.lower() in (".jpg", ".jpeg", ".png", ".webp") else ["-ss", f"{at:.2f}"]
    with _THUMB_SEM:
        subprocess.run(["ffmpeg", "-v", "error", "-y", *seek, "-i", str(src), "-frames:v", "1",
                        "-vf", "scale=256:-2", "-q:v", "6", str(out)], capture_output=True, timeout=60,
                       **_low_priority())
    return out if out.exists() else None


def clip_thumb(job: Path, name: str) -> Path:
    """One frame from the middle of a downloaded clip of this video (the Replace browser shows the shot itself)."""
    row = next((r for r in _clip_rows(job).values() if Path(str(r.get("path") or "")).name == name), None)
    src = rebase(job, row["path"]) if row else None
    if not src or not src.exists():
        return None
    out = tdir(job) / "thumbs" / f"clip_{Path(name).stem}.jpg"
    if out.exists():
        return out
    out.parent.mkdir(exist_ok=True)
    with _THUMB_SEM:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0.0, _probe(src) * 0.45):.2f}", "-i", str(src),
                        "-frames:v", "1", "-vf", "scale=320:-2", "-q:v", "5", str(out)], capture_output=True,
                       timeout=60, **_low_priority())
    return out if out.exists() else None


def peaks(job: Path) -> dict:
    f = tdir(job) / "peaks.json"
    mp3 = Path(job) / "audio.mp3"
    if f.exists() and mp3.exists() and f.stat().st_mtime >= mp3.stat().st_mtime:
        d = _read(f, None)
        if d:
            return d
    rate, per = 2000, 100           # 20 values a second
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", str(rate), "-f", "s16le", "-"],
                       capture_output=True, timeout=600)
    try:
        import numpy as np
        a = np.abs(np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32))
        n = len(a) // per
        v = a[:n * per].reshape(n, per).max(axis=1) if n else np.zeros(0)
        top = float(np.percentile(v, 99)) if n else 1.0
        vals = [int(min(100, x / max(1.0, top) * 100)) for x in v]
    except Exception:                                      # noqa: BLE001 - no waveform, the editor still works
        vals = []
    d = {"per_s": rate // per, "v": vals}
    _write(f, d)
    return d


# ── changing the plan ──────────────────────────────────────────────────────────

def _place(plan: list, a: float, b: float, entry: list) -> list:
    """`entry` over [a, b]: the slots under it are trimmed, split or dropped. Edges within MIN_SLOT of a cut snap to it,
    so no sliver of the old shot is left beside the new one."""
    st = starts(plan)
    total = st[-1] + float(plan[-1][3]) if plan else 0.0
    a, b = max(0.0, a), min(total, b)
    for x in st + [total]:
        if abs(x - a) < MIN_SLOT:
            a = x
        if abs(x - b) < MIN_SLOT:
            b = x
    if b - a < MIN_SLOT:
        raise ValueError("That range is too short for a shot of its own.")
    out, placed = [], False
    for e, s in zip(plan, st):
        en = s + float(e[3])
        if en <= a + 1e-6 or s >= b - 1e-6:
            if s >= b - 1e-6 and not placed:
                out.append([entry[0], str(entry[1]), False, b - a])
                placed = True
            out.append(list(e))
            continue
        if s < a:
            out.append([e[0], e[1], e[2], a - s])
        if not placed:
            out.append([entry[0], str(entry[1]), False, b - a])
            placed = True
        if en > b:
            out.append([e[0], e[1], False, en - b])
    if not placed:
        out.append([entry[0], str(entry[1]), False, b - a])
    return _tidy(out)


def _tidy(plan: list) -> list:
    """A slot that ended up shorter than MIN_SLOT gives its time to its longer neighbour."""
    plan = [list(e) for e in plan if float(e[3]) > 1e-6]
    changed = True
    while changed and len(plan) > 1:
        changed = False
        for i, e in enumerate(plan):
            if float(e[3]) < MIN_SLOT:
                j = i - 1 if i > 0 and (i == len(plan) - 1 or float(plan[i - 1][3]) >= float(plan[i + 1][3])) else i + 1
                plan[j][3] = float(plan[j][3]) + float(e[3])
                del plan[i]
                changed = True
                break
    return plan


def _neighbour(plan: list, i: int) -> int:
    """Which neighbour takes a deleted slot's time: footage before graphics, the one before before the one after."""
    cands = [j for j in (i - 1, i + 1) if 0 <= j < len(plan)]
    if not cands:
        return -1
    foot = [j for j in cands if plan[j][0] in ("video", "photo")]
    return (foot or cands)[0]


def apply_op(job: Path, op: dict, note: str = "") -> dict:
    """A change that needs no new picture, applied now. Returns {"ok", "msg"} or {"error"}."""
    kind = op.get("op")
    with _lock(job):
        plan = load_plan(job)
        n = len(plan)
        st = starts(plan)

        def slot(k):
            i = int(op.get(k))
            if not 0 <= i < n:
                raise ValueError(f"There is no slot {i}.")
            return i
        try:
            if kind == "delete":
                idx = sorted({int(x) for x in (op.get("slots") or [op.get("slot")]) if x is not None}, reverse=True)
                if not idx:
                    raise ValueError("Which slot?")
                _snapshot(job, note or f"delete {len(idx)} shot(s)")
                for i in idx:
                    if not 0 <= i < len(plan):
                        continue
                    j = _neighbour(plan, i)
                    if j < 0:
                        raise ValueError("The only slot cannot be deleted.")
                    plan[j][3] = float(plan[j][3]) + float(plan[i][3])
                    del plan[i]
                _save_plan(job, _tidy(plan))
                msg = f"Deleted {len(idx)} shot(s); the neighbouring shot fills the time."
            elif kind == "retime":
                i = slot("slot")
                a, b = float(op.get("start", st[i])), float(op.get("end", st[i] + plan[i][3]))
                lo = st[i - 1] + MIN_SLOT if i > 0 else 0.0
                hi = (st[i + 1] + float(plan[i + 1][3]) - MIN_SLOT) if i + 1 < n else st[i] + float(plan[i][3])
                a = 0.0 if i == 0 else min(max(a, lo), st[i] + float(plan[i][3]) - MIN_SLOT)
                b = (st[i] + float(plan[i][3])) if i == n - 1 else max(min(b, hi), a + MIN_SLOT)
                _snapshot(job, note or f"retime slot {i}")
                end_old = st[i] + float(plan[i][3])
                if i > 0:
                    plan[i - 1][3] = a - st[i - 1]
                if i + 1 < n:
                    plan[i + 1][3] = (st[i + 1] + float(plan[i + 1][3])) - b
                plan[i][3] = b - a
                _save_plan(job, _tidy(plan))
                msg = f"Slot {i} now runs {_clock(a)}–{_clock(b)} (was {_clock(st[i])}–{_clock(end_old)})."
            elif kind == "swap":
                i, j = slot("a"), slot("b")
                _snapshot(job, note or f"swap {i} and {j}")
                plan[i][0], plan[j][0] = plan[j][0], plan[i][0]
                plan[i][1], plan[j][1] = plan[j][1], plan[i][1]
                plan[i][2] = plan[j][2] = False
                _save_plan(job, plan)
                msg = f"Swapped the shots at {_clock(st[i])} and {_clock(st[j])}."
            elif kind == "use_file":
                i = slot("slot")
                f = Path(str(op.get("file") or ""))
                if not f.is_absolute():
                    f = Path(job) / f
                f = f.resolve()
                if not f.exists() or Path(job).resolve() not in f.parents:
                    raise ValueError("That file is not in this video's folder.")
                k = "photo" if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp") else \
                    ("motion" if f.parent.name in ("motion", "maps", "headlines", "photofx", "vox_scenes") else "video")
                _snapshot(job, note or f"slot {i} uses {f.name}")
                plan = _place(plan, st[i], st[i] + float(plan[i][3]), [k, str(f), False, 0])
                _save_plan(job, plan)
                msg = f"The shot at {_clock(st[i])} now shows {f.name}."
            elif kind == "plain":
                i = slot("slot")
                e = plan[i]
                src = rebase(job, e[1])
                if e[0] != "photo" or not src.exists():
                    raise ValueError("Only a still picture has the depth pop to take off.")
                # PHOTO FX remembers per picture whether it lifts the subject (photofx/depth/<digest>.json, keyed
                # by the picture's bytes): "no" for this picture, and a copy under a new name, so the slot counts
                # as changed and its segment — the one with the pop — is made again with the plain zoom
                import hashlib as _h
                key = _h.sha256(src.read_bytes()).hexdigest()[:20]
                vd = Path(job) / "photofx" / "depth"
                vd.mkdir(parents=True, exist_ok=True)
                _write(vd / f"{key}.json", {"ok": False, "why": "turned off in the timeline editor"})
                copy = src.with_name(f"ed_plain_{src.name}") if not src.name.startswith("ed_plain_") else src
                if copy != src and not copy.exists():
                    shutil.copy2(src, copy)
                _snapshot(job, note or f"plain zoom at slot {i}")
                plan[i] = [e[0], str(copy), e[2], e[3]]
                _save_plan(job, plan)
                msg = f"The picture at {_clock(st[i])} now has the plain zoom, no depth pop."
            elif kind in ("label_edit", "label_add", "label_delete"):
                labels = load_labels(job)
                if kind == "label_add":
                    x = {"t": round(float(op.get("start") or 0), 2), "dur": round(float(op.get("dur") or 2.6), 2),
                         "style": str(op.get("style") or "phrase"), "text": str(op.get("text") or "").strip(),
                         "sub": str(op.get("sub") or "").strip(), "from": "editor"}
                    if not x["text"]:
                        raise ValueError("A label needs some text.")
                    _snapshot(job, note or f"add label {x['text'][:30]}")
                    labels.append(x)
                    labels.sort(key=lambda r: float(r.get("t") or 0))
                    msg = f"Added the label “{x['text']}” at {_clock(x['t'])}."
                else:
                    k = int(op.get("label"))
                    if not 0 <= k < len(labels):
                        raise ValueError(f"There is no label {k}.")
                    if kind == "label_delete":
                        _snapshot(job, note or f"delete label {labels[k].get('text', '')[:30]}")
                        gone = labels.pop(k)
                        msg = f"Removed the label “{gone.get('text', '')}”."
                    else:
                        _snapshot(job, note or f"edit label {labels[k].get('text', '')[:30]}")
                        lab = labels[k]
                        for f_, src in (("text", "text"), ("sub", "sub"), ("style", "style")):
                            if op.get(src) is not None:
                                lab[f_] = str(op[src]).strip()
                        if op.get("start") is not None:
                            lab["t"] = round(max(0.0, float(op["start"])), 2)
                        if op.get("dur") is not None:
                            lab["dur"] = round(max(0.8, float(op["dur"])), 2)
                        labels.sort(key=lambda r: float(r.get("t") or 0))
                        msg = (f"Label at {_clock(float(lab.get('t') or 0))} now reads “{lab.get('text', '')}”"
                               + (f" / “{lab.get('sub')}”" if lab.get("sub") else "") + ".")
                _write(Path(job) / "overlays.json", labels)
            elif kind == "caption_edit":
                caps = load_captions(job)
                k = int(op.get("caption"))
                if not 0 <= k < len(caps):
                    raise ValueError(f"There is no caption {k}.")
                text = str(op.get("text") or "").strip()
                if not text:
                    raise ValueError("A caption cannot be empty.")
                _snapshot(job, note or f"caption {k}")
                caps[k]["text"] = text
                save_captions(job, caps)
                msg = f"Caption at {_clock(caps[k]['t'])} now reads “{text[:60]}”."
            else:
                return {"error": f"Unknown change '{kind}'."}
        except (ValueError, TypeError) as e:
            return {"error": str(e)}
    # (Shorts engine speed, Q6: self-review's label, retime and drop changes render no preview — it assembles the whole
    # film itself; SHORTS_FAST_SR_NOPREVIEW=0: as before)
    if not (str(note or "").startswith("selfreview") and _fast_on("SR_NOPREVIEW")):
        _queue_previews(job)
    return {"ok": True, "msg": msg}


# ── the queue ──────────────────────────────────────────────────────────────────

def _queued(job: Path, tid: str) -> bool:
    with _QCOND:
        return any(j == str(job) and t == tid for j, t in _QUEUE) or _WORKER.get("current") == (str(job), tid)


def _enqueue(job: Path, tid: str) -> None:
    with _QCOND:
        if not any(j == str(job) and t == tid for j, t in _QUEUE):
            _QUEUE.append((str(job), tid))
        _QCOND.notify_all()
    _ensure_worker()


def _eta_ahead(job: Path) -> dict:
    """{task id: seconds until it is done} for this job's waiting tasks, counting everything ahead of them."""
    with _QCOND:
        order = list(_QUEUE)
        cur = _WORKER.get("current")
    acc = 0.0
    if cur:
        cst = _state(Path(cur[0]))
        ctk = next((x for x in cst["tasks"] if x["id"] == cur[1]), None)
        if ctk:
            acc = max(5.0, EST.get(ctk.get("type"), 30) - (time.time() - (ctk.get("started") or time.time())))
    out, cache = {}, {}
    for j, tid in order:
        if j not in cache:
            cache[j] = {x["id"]: x for x in _state(Path(j))["tasks"]}
        tk = cache[j].get(tid) or {}
        acc += EST.get(tk.get("type"), 30)
        if j == str(job):
            out[tid] = acc
    return out


def add_task(job: Path, typ: str, label: str, args: dict, source: str = "manual", enqueue: bool = True) -> dict:
    """A task in the job's state. `enqueue` False (self-review's parallel repairs, run_tasks): not handed to the
    editor's one worker — the caller runs it."""
    with _lock(job):
        st = _state(job)
        tk = {"id": uuid.uuid4().hex[:10], "type": typ, "label": label, "args": args, "state": "queued",
              "created": time.time(), "source": source, "msg": ""}
        st["tasks"].append(tk)
        _save_state(job, st)
    if enqueue:
        _enqueue(job, tk["id"])
    return tk


def _fast_on(name: str) -> bool:
    """A Shorts engine speed switch, SHORTS_FAST_<name> (on unless 0 / false / no / off)."""
    return (os.environ.get("SHORTS_FAST_" + name) or "1").strip().lower() not in ("0", "false", "no", "off")


# ── self-review's repairs side by side (Shorts engine speed, 10-16, Q7) ─────────────────────────────────────────────
# A self-review round queued its 20–60 fills and graphics into the editor's ONE worker thread and waited for them one
# by one — a fill is mostly a wait (Claude's pick, a YouTube cut through the proxy), so the round took as long as all of
# them together. run_tasks() runs a round's tasks SHORTS_SR_REPAIR_WORKERS (4) at a time. Two fills must never put
# the same moment of a source on screen (footage is never repeated): a shot a running fill is about to use is CLAIMED,
# and every other fill reads claimed moments as taken (_used_spans) and skips a pick another fill holds. The plan is
# written under the job's lock as before (_place: by time, so the order the fills finish in changes nothing), and the
# files every fill appends to (clips.json, footage_seconds.json) too. SHORTS_FAST_SR_PARALLEL=0: the queue, as before.
_CLAIMS: dict = {}               # str(job) -> {task id: [(video, start, end)]}
_CLAIMS_LOCK = threading.Lock()
_PARALLEL: set = set()           # (str(job), task id) of the tasks run_tasks runs side by side: only they claim
_WATCH_LOCKS: dict = {}          # (str(job), video id) -> a lock: two fills never watch one video at the same time


def _claimed(job: Path, but: str = "") -> dict:
    """{video: [(start, end)]} that running fills (all but task `but`) are about to use."""
    out = {}
    with _CLAIMS_LOCK:
        for tid, spans in (_CLAIMS.get(str(Path(job).resolve())) or {}).items():
            if tid == but:
                continue
            for v, a, b in spans:
                out.setdefault(str(v), []).append((float(a), float(b)))
    return out


def _claim(job: Path, tid: str, video, start, end) -> bool:
    """Task `tid` takes the moment [start, end] of `video` for itself: False when the plan already shows it or another
    running fill holds it (more than 0.6 s of overlap, as _used_spans counts it)."""
    v, a, b = str(video or ""), float(start or 0), float(end or 0)
    key = str(Path(job).resolve())
    if not v or (key, tid) not in _PARALLEL:
        return True                        # the editor's own one-at-a-time tasks: nothing to claim, as before
    with _CLAIMS_LOCK:
        others = [s for t, ss in (_CLAIMS.get(key) or {}).items() if t != tid for s in ss if s[0] == v]
        if any(min(b, y) - max(a, x) > 0.6 for _v, x, y in others):
            return False
        used = _used_spans(job, load_plan(job), claims=False).get(v, [])
        if any(min(b, y) - max(a, x) > 0.6 for x, y in used):
            return False
        _CLAIMS.setdefault(key, {}).setdefault(tid, []).append((v, a, b))
    return True


def _unclaim(job: Path, tid: str) -> None:
    key = str(Path(job).resolve())
    with _CLAIMS_LOCK:
        (_CLAIMS.get(key) or {}).pop(tid, None)
        if key in _CLAIMS and not _CLAIMS[key]:
            _CLAIMS.pop(key, None)
        _PARALLEL.discard((key, tid))


def _watch_lock(job: Path, vid: str) -> threading.Lock:
    with _CLAIMS_LOCK:
        return _WATCH_LOCKS.setdefault((str(Path(job).resolve()), str(vid)), threading.Lock())


def run_tasks(job: Path, tids: list, workers: int = 0, log=None) -> None:
    """Q7: these tasks (made with add_task(..., enqueue=False)) run now, SHORTS_SR_REPAIR_WORKERS (4) at a time — a
    graphic one SHORTS_SR_GRAPHIC_WORKERS (1) at a time (each is a Chromium render; the render lock lets one run on the
    computer anyway). Returns when every one has finished or failed; a task that raises is marked failed, as the
    worker marks it. No preview render follows them (self-review assembles the whole film itself)."""
    job = Path(job)
    tids = [t for t in tids or [] if t]
    if not tids:
        return
    try:
        n = int(workers or os.environ.get("SHORTS_SR_REPAIR_WORKERS") or 4)
    except ValueError:
        n = 4
    try:
        g = int(os.environ.get("SHORTS_SR_GRAPHIC_WORKERS") or 1)
    except ValueError:
        g = 1
    gsem = threading.Semaphore(max(1, g))
    types = {t["id"]: t.get("type") for t in _state(job)["tasks"]}
    if n > 1 and len(tids) > 1:
        with _CLAIMS_LOCK:                 # these fills claim what they are about to use (_claim)
            _PARALLEL.update((str(job.resolve()), t) for t in tids)

    def one(tid):
        try:
            with (gsem if types.get(tid) == "graphic" else contextlib.nullcontext()):
                _run_task(job, tid)
        except Exception as e:                              # noqa: BLE001 - one failed task never stops the others
            _finish(job, tid, "failed", f"{type(e).__name__}: {str(e)[:300]}")
        finally:
            _unclaim(job, tid)
    if n <= 1 or len(tids) == 1:
        for tid in tids:
            one(tid)
    else:
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=min(n, len(tids)), thread_name_prefix="sr-repair") as ex:
            list(ex.map(one, tids))
    if log is not None and len(tids) > 1:
        log(f"  selfreview: {len(tids)} repair task(s) ran {min(max(1, n), len(tids))} at a time")
    _after_task(job)


def _queue_previews(job: Path) -> None:
    """One waiting preview task per job renders every changed slot that has no preview yet."""
    with _lock(job):
        st = _state(job)
        if any(t.get("type") == "preview" and t.get("state") == "queued" for t in st["tasks"]):
            return
        plan = load_plan(job)
        m = align(_base(job), plan)
        need = [i for i in range(len(plan)) if i not in m
                and not (tdir(job) / "preview" / f"{_key(plan[i])}.mp4").exists()]
    if need:
        add_task(job, "preview", f"Rendering {len(need)} changed shot(s) for the preview", {}, "auto")


def cancel(job: Path, tid: str) -> dict:
    with _lock(job):
        st = _state(job)
        tk = next((x for x in st["tasks"] if x["id"] == tid), None)
        if not tk or tk.get("state") != "queued":
            return {"error": "Only a task that has not started can be cancelled."}
        tk["state"], tk["msg"] = "cancelled", "Cancelled."
        _save_state(job, st)
    with _QCOND:
        _QUEUE[:] = [(j, t) for j, t in _QUEUE if not (j == str(job) and t == tid)]
    return {"ok": True}


def pending(job: Path) -> int:
    st = _state(job)
    return sum(1 for t in st["tasks"] if t.get("state") in ("queued", "working"))


def start_worker(busy=None, on_idle=None) -> None:
    """`busy(job_path) -> bool`: the app's own queue is rendering that video — its edits wait.
    `on_idle(job_path)`: puts the job's render in the app's queue (the "render when the queue is done" switch)."""
    _WORKER["busy"] = busy
    _ON_IDLE["fn"] = on_idle
    _ensure_worker()


def render_eta(job: Path) -> int:
    """Seconds a render of this video takes, roughly: the changed shots, then the final mix at ≈1.3× the video's length
    (measured: a 3.5-minute video 3–6 minutes)."""
    plan = load_plan(job)
    changed = len(plan) - len(align(_seg_plan(job), plan))
    return int(60 + 4 * changed + 1.3 * sum(float(e[3]) for e in plan))


def set_auto_render(job: Path, on: bool) -> dict:
    """The switch: render as soon as the queue is empty. One shot — it turns itself off when the render starts."""
    with _lock(job):
        st = _state(job)
        st["auto_render"] = bool(on)
        _save_state(job, st)
    if on:
        _maybe_auto_render(job)
    return {"ok": True, "auto_render": bool(on)}


def _maybe_auto_render(job: Path) -> None:
    with _lock(job):
        st = _state(job)
        if not st.get("auto_render") or pending(job) or st.get("deferred") \
                or any(m.get("pending") for m in st["chat"]):
            return
        hist = tdir(job) / "history"
        if not (hist.is_dir() and any(hist.glob("[0-9]*.json"))):
            return                                           # nothing changed — nothing to render
        st["auto_render"] = False
        _save_state(job, st)
    fn = _ON_IDLE.get("fn")
    if fn:
        try:
            fn(Path(job))
        except Exception as e:                               # noqa: BLE001
            _note(job, "sys", f"✗ Could not start the render by itself — {str(e)[:160]}. Press Render video.")


# ── edits asked for while the video renders: kept, and run when the render is done ──

def defer(job: Path, item: dict) -> dict:
    """A chat message or an edit sent while this video renders: queued, then run as soon as the render is done."""
    with _lock(job):
        st = _state(job)
        item = dict(item, id=uuid.uuid4().hex[:10], created=time.time())
        st.setdefault("deferred", []).append(item)
        _save_state(job, st)
    return item


def release_deferred(job: Path, slug: str) -> int:
    """After a render: what was asked for meanwhile, in the order it was asked."""
    with _lock(job):
        st = _state(job)
        items = st.pop("deferred", []) or []
        _save_state(job, st)
    for it in items:
        if it.get("type") == "chat":
            wait = _note(job, "ai", "", pending=True)
            threading.Thread(target=_chat_reply, args=(Path(job), slug, it.get("message") or "", it.get("sel") or {},
                                                        wait["id"]), daemon=True).start()
        elif it.get("type") == "op":
            res = run_ops(job, [it.get("op") or {}], source="manual")
            for r in res:
                if r.get("error"):
                    _note(job, "sys", f"✗ {r['error']}")
                elif r.get("done"):
                    _note(job, "sys", f"✓ {r['done']}")
    return len(items)


def _ensure_worker() -> None:
    with _QCOND:
        th = _WORKER.get("thread")
        if th is None or not th.is_alive():
            th = threading.Thread(target=_loop, daemon=True, name="timeline-worker")
            _WORKER["thread"] = th
            th.start()


def _loop() -> None:
    while True:
        with _QCOND:
            pick = None
            busy = _WORKER.get("busy")
            for k, (j, tid) in enumerate(_QUEUE):
                if busy is None or not busy(Path(j)):
                    pick = _QUEUE.pop(k)
                    break
            if pick is None:
                _QCOND.wait(timeout=2.0)
                continue
            _WORKER["current"] = pick
        try:
            _run_task(Path(pick[0]), pick[1])
        except Exception as e:                              # noqa: BLE001 - one failed task never stops the queue
            _finish(Path(pick[0]), pick[1], "failed", f"{type(e).__name__}: {str(e)[:300]}")
        finally:
            with _QCOND:
                _WORKER["current"] = None
            _after_task(Path(pick[0]))


def _set(job: Path, tid: str, **kw) -> dict:
    with _lock(job):
        st = _state(job)
        tk = next((x for x in st["tasks"] if x["id"] == tid), None)
        if tk is None:
            return {}
        tk.update(kw)
        _save_state(job, st)
        return dict(tk)


def _finish(job: Path, tid: str, state: str, msg: str) -> None:
    tk = _set(job, tid, state=state, msg=msg, finished=time.time())
    if tk and tk.get("type") != "preview" and tk.get("source") != "ai":
        _note(job, "sys", ("✓ " if state == "done" else "✗ ") + (tk.get("label") or "") + (f" — {msg}" if msg else ""),
              task=tid, ok=state == "done")


def _run_task(job: Path, tid: str) -> None:
    st = _state(job)
    tk = next((x for x in st["tasks"] if x["id"] == tid), None)
    if not tk or tk.get("state") not in ("queued", "working"):
        return
    tk = _set(job, tid, state="working", started=time.time(), msg="")
    typ, args = tk["type"], tk.get("args") or {}
    if typ == "preview":
        r = _child(["previews", str(job)], timeout=1800)
        _finish(job, tid, "done" if r == 0 else "failed", "" if r == 0 else "a preview would not render")
        return
    if typ.startswith("fill"):
        msg = _do_fill(job, tid, args)
    elif typ == "graphic":
        msg = _do_graphic(job, args)
    else:
        raise ValueError(f"unknown task {typ}")
    _finish(job, tid, "done", msg)
    # Shorts engine speed (10-16, Q6): a self-review repair renders no preview for the editor's screen — self-review
    # assembles the whole film itself, and the preview task ran in the one worker before the round's next repair
    # (SHORTS_FAST_SR_NOPREVIEW=0: as before)
    if not (tk.get("source") == "selfreview" and _fast_on("SR_NOPREVIEW")):
        _queue_previews(job)


def _after_task(job: Path) -> None:
    """The queue of this job is empty now: the auto-render switch may start the render."""
    try:
        if not pending(job):
            _maybe_auto_render(job)
    except Exception:                                          # noqa: BLE001
        pass


def _child(argv: list, timeout: int = 900) -> int:
    """Run `python timeline.py <argv>` — the engine's per-video globals stay out of the app's own process."""
    wait_for_memory()
    p = subprocess.run([sys.executable, str(HERE / "timeline.py")] + argv, cwd=str(HERE), capture_output=True,
                       text=True, encoding="utf-8", errors="replace", timeout=timeout, **_low_priority())
    if p.returncode != 0:
        sys.stderr.write((p.stderr or p.stdout or "")[-2000:])
    return p.returncode


# ── finding a new picture ──────────────────────────────────────────────────────

_STOP = set("the a an and or of in on at to for with from by is are was were be this that these those it its as into "
            "over under near shot shots footage video clip scene view showing shows show close wide some".split())


def _words(text: str) -> list:
    return [w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(w) > 2 and w not in _STOP]


def _used_spans(job: Path, plan: list, claims: bool = True) -> dict:
    rows = _clip_rows(job)
    out = {}
    for e in plan:
        r = rows.get(Path(str(e[1])).name)
        if r and r.get("video"):
            out.setdefault(str(r["video"]), []).append((float(r.get("start") or 0), float(r.get("end") or 0)))
    if claims:
        # (Q7: a moment a running self-review fill is about to use counts as taken — never the same shot twice)
        for v, spans in _claimed(job).items():
            out.setdefault(v, []).extend(spans)
    return out


def local_clips(job: Path, query: str = "", plan: list = None) -> list:
    """Clips already downloaded and cut for this video that it does not show — usable at once, with no download
    (and while YouTube refuses this computer). A clip of a shot the video already shows (another cut of the same
    stretch) is left out: footage is never repeated."""
    plan = plan if plan is not None else load_plan(job)
    names = {Path(str(e[1])).name for e in plan}
    used = _used_spans(job, plan)
    cat = _catalog(job)
    secs = _read(Path(job) / "footage_seconds.json", {}) or {}
    q = _words(query)
    out = []
    for r in _clip_rows(job).values():
        f = rebase(job, r.get("path"))
        if f.name in names or not f.exists():
            continue
        a, b = float(r.get("start") or 0), float(r.get("end") or 0)
        if any(min(b, y) - max(a, x) > 0.6 for x, y in used.get(str(r.get("video") or ""), [])):
            continue
        shows = _shot_of(r, cat)
        words = set(_words(f"{shows} {r.get('need') or ''} {r.get('title') or ''}"))
        out.append({"local": True, "path": str(f), "file": f.name, "shows": shows, "kind": "downloaded",
                    "title": str(r.get("title") or ""), "channel": str(r.get("channel") or ""),
                    "video": str(r.get("video") or ""), "start": a, "end": b,
                    "dur": float(secs.get(f.name) or r.get("dur") or 0),
                    "score": sum(1 for w in q if w in words)})
    # one clip per shot: the pipeline often cut the same stretch twice
    seen, uniq = set(), []
    for c in sorted(out, key=lambda c: (-c["score"], -c["dur"])):
        k = (c["video"], round(c["start"]))
        if k in seen:
            continue
        seen.add(k)
        uniq.append(c)
    return uniq


def catalog_shots(job: Path, query: str = "", limit: int = 60, plan: list = None) -> list:
    """Shots this video's watcher logged and the video does not show yet, best match for `query` first."""
    import youtube
    plan = plan if plan is not None else load_plan(job)
    used = _used_spans(job, plan)
    titles = {}
    for r in _clip_rows(job).values():
        if r.get("video"):
            titles[str(r["video"])] = (str(r.get("title") or ""), str(r.get("channel") or ""))
    q = _words(query)
    df: dict = {}
    pool = []
    for vid, log in _catalog(job).items():
        ttl, ch = titles.get(vid, ("", ""))
        try:
            shots = youtube.usable(log, ttl, ch, vid)
        except Exception:                                     # noqa: BLE001
            shots = []
        for s in shots:
            if any(min(b, s["end"]) - max(a, s["start"]) > 0.6 for a, b in used.get(vid, [])):
                continue
            words = set(_words(f"{s['shows']} {log.get('video') or ''} {ttl}"))
            for w in words:
                df[w] = df.get(w, 0) + 1
            pool.append(dict(s, video=vid, about=str(log.get("video") or "")[:120], title=ttl, channel=ch,
                             _w=words))
    n = max(1, len(pool))
    for s in pool:
        s["score"] = round(sum(math.log(1 + n / df.get(w, n)) for w in q if w in s["_w"]), 3)
    pool.sort(key=lambda s: (-s["score"], -(s["end"] - s["start"])))
    for s in pool:
        s.pop("_w", None)
    return pool[:limit]


def _ask_pick(want: str, line: str, cands: list) -> list:
    """Claude chooses among shots by their descriptions. [candidate index, ...] best first, [] when none fits."""
    import make_video as mv
    rows = "\n".join(f"{k} | {c.get('title') or c.get('about') or ''}"[:120] + f" | {c['shows']} | {c['kind']} | "
                     f"{(c.get('dur') or (c['end'] - c['start'])):.1f}s" for k, c in enumerate(cands))
    prompt = (
        "Pick footage for one moment of a documentary.\n\n"
        f"WHAT THE NARRATOR SAYS HERE: \"{line}\"\n"
        f"WHAT THE EDITOR WANTS ON SCREEN: {want}\n\n"
        "CANDIDATE SHOTS (number | source video | what the shot shows | kind | length):\n"
        f"{rows}\n\n"
        "Choose the shots that really show what is wanted and fit the narration. A shot that only shares a word with "
        "the request is not a match. This is a documentary: the footage must be of the real subject — the same event, "
        "person, place and era the narration is about (judge by the source video's title too). A similar-looking shot "
        "of another event (another mission, another war, another person) is NOT a match, unless the editor asked for "
        "something generic. Every pick must actually SHOW what is wanted — a building, a logo or a document near the "
        "topic is not a picture of the thing asked for. An empty answer is better than a weak pick: the editor then "
        "searches further. Return ONLY JSON: {\"picks\": [best number, second, third], \"why\": \"one short "
        "sentence\"} — or {\"picks\": [], \"why\": \"...\"} when none of them shows it.")
    try:
        with _claude_kind(mv, "timeline.pick"), _no_limit_wait(mv):
            txt = mv.claude(prompt, mv.UTILITY_MODEL, max_tokens=1500)
    except Exception as e:                                    # noqa: BLE001
        raise RuntimeError(f"Claude could not choose a shot ({str(e)[:120]})")
    d = mv._json_obj(txt)
    picks = []
    for p in d.get("picks") or []:
        try:
            p = int(p)
        except (TypeError, ValueError):
            continue
        if 0 <= p < len(cands) and p not in picks:
            picks.append(p)
    return picks


def _logo_corner(path: Path) -> str:
    """"tl"/"tr"/"bl"/"br" when a channel's logo sits still in that corner of a moving shot, else "".

    The watcher's shot log flags most logos, not all (a Smithsonian bug and a channel's corner badge both got
    through). A logo is the part of the picture that does not move while the shot does, and has edges: ten frames
    across the clip, per-pixel change over time, in each corner box. Measured on real clips: a logo corner scores
    ~0.018, a clean corner under 0.001. A shot that hardly moves cannot tell a logo from the scene and is left alone."""
    try:
        import numpy as np
        w, h = 320, 180
        d = _probe(path)
        if d <= 0:
            return ""
        fr = []
        for k in range(10):
            r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{d * (0.05 + 0.09 * k):.2f}", "-i", str(path),
                                "-frames:v", "1", "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
                               capture_output=True, timeout=60)
            if len(r.stdout) == w * h:
                fr.append(np.frombuffer(r.stdout, np.uint8).reshape(h, w).astype(np.float32))
        if len(fr) < 6:
            return ""
        f = np.stack(fr)
        std = f.std(axis=0)
        gy, gx = np.gradient(f.mean(axis=0))
        grad = np.hypot(gx, gy)
        cw, ch = int(w * 0.24), int(h * 0.2)
        moving = float(np.median(std[ch:h - ch, cw:w - cw]))
        if moving <= 6:
            return ""
        boxes = {"tl": (0, ch, 0, cw), "tr": (0, ch, w - cw, w), "bl": (h - ch, h, 0, cw), "br": (h - ch, h, w - cw, w)}
        score = {c: float(((std[y0:y1, x0:x1] < max(4.0, moving * 0.25)) & (grad[y0:y1, x0:x1] > 18)).mean())
                 for c, (y0, y1, x0, x1) in boxes.items()}
        best = max(score, key=score.get)
        second = sorted(score.values())[-2]
        return best if score[best] > 0.008 and score[best] > 4 * second + 0.002 else ""
    except Exception:                                          # noqa: BLE001 - no check, the clip as cut
        return ""


class YouTubeRefused(RuntimeError):
    pass


def _refused() -> str:
    """The reason when YouTube refuses this computer outright (bot check, sign-in), else ''."""
    try:
        import youtube
        e = youtube.last_error() or ""
    except Exception:                                          # noqa: BLE001
        return ""
    low = e.lower()
    if any(k in low for k in ("not a bot", "sign in to confirm", "cookies", "http error 429", "too many requests")):
        return e
    return ""


def _cut(job: Path, shot: dict) -> Path:
    """The shot as a clip in this job's footage folder, registered so it renders as real footage. A channel logo
    the shot log did not flag is found on the cut clip, and the shot is cut again with that corner out of frame."""
    import youtube
    work = Path(job) / "youtube"
    dest = work / f"ed_{uuid.uuid4().hex[:8]}.mp4"
    got = youtube.cut_clip(str(shot["video"]), float(shot["start"]), float(shot["end"]), dest, work,
                           logo=bool(shot.get("logo")), corner=str(shot.get("logo") or ""))
    if not got or not dest.exists():
        dest.unlink(missing_ok=True)
        if _refused():
            raise YouTubeRefused("YouTube is refusing downloads from this computer right now (“Sign in to confirm you’re "
                                 "not a bot”), so no new shot can be cut. Clips already downloaded for this video still "
                                 "work — open Replace… or ask again — or set YTDLP_COOKIES_FROM_BROWSER in .env")
        return None
    corner = "" if shot.get("logo") else _logo_corner(dest)
    if corner:
        again = work / f"ed_{uuid.uuid4().hex[:8]}.mp4"
        got2 = youtube.cut_clip(str(shot["video"]), float(shot["start"]), float(shot["end"]), again, work,
                                logo=True, corner=corner)
        if got2 and again.exists():
            dest.unlink(missing_ok=True)
            dest, got = again, got2
        else:
            again.unlink(missing_ok=True)
    with _lock(job):                       # (several self-review fills may append at once: Q7)
        fs = _read(Path(job) / "footage_seconds.json", {})
        fs[dest.name] = round(float(got), 2)
        _write(Path(job) / "footage_seconds.json", fs)
        rows = _read(work / "clips.json", [])
        rows.append({"path": str(dest), "w": -1, "t": 0.0, "order": 0, "dur": round(float(got), 2),
                     "video": shot["video"], "start": float(shot["start"]), "end": float(shot["end"]),
                     "need": shot.get("want") or shot.get("shows") or "", "line": "",
                     "title": shot.get("title") or "", "channel": shot.get("channel") or "", "from": "editor"})
        _write(work / "clips.json", rows)
    return dest


def _do_fill(job: Path, tid: str, args: dict) -> str:
    a, b = float(args["start"]), float(args["end"])
    want = str(args.get("find") or "").strip()
    how = str(args.get("from") or "auto")
    caps = load_captions(job)
    line = _narration(caps, a, b)
    entry = None
    note = ""
    if args.get("shot") and args["shot"].get("local") and Path(str(args["shot"].get("path") or "")).exists():
        entry = ["video", str(args["shot"]["path"]), False, 0]          # downloaded already: no cut, no wait
        note = f"now shows: {str(args['shot'].get('shows') or '')[:90]}"
        _register_local(job, Path(args["shot"]["path"]))
    elif args.get("shot"):                                  # picked by hand in the shot browser
        _set(job, tid, msg="cutting the shot...")
        clip = _cut(job, dict(args["shot"], want=want))
        if not clip:
            raise RuntimeError("that shot could not be used — it has no clean stretch of 2+ seconds (it cuts or flashes "
                               "too often, or is too dark), or YouTube refused the download. Pick another one")
        entry, note = ["video", str(clip), False, 0], f"cut from {args['shot'].get('title') or args['shot']['video']}"
    if entry is None and how in ("auto", "catalog"):
        _set(job, tid, msg="looking through this video's footage...")
        # the clips downloaded for this video first (instant), then the shots its watcher logged (cut from YouTube)
        local = local_clips(job, want + " " + line)[:30]
        cands = local + catalog_shots(job, want + " " + line, limit=max(15, 45 - len(local)))
        if cands:
            picks = _ask_pick(want, line, cands)
            for p in picks[:3]:
                c = cands[p]
                if not _claim(job, tid, c.get("video"), c.get("start"), c.get("end")):
                    continue                       # (Q7: another self-review fill is using this moment)
                if c.get("local"):
                    entry = ["video", c["path"], False, 0]
                    _register_local(job, Path(c["path"]))
                    note = f"now shows: {c['shows'][:90]} (already downloaded)"
                    break
                _set(job, tid, msg=f"cutting: {c['shows'][:60]}")
                clip = _cut(job, dict(c, want=want))
                if clip:
                    entry = ["video", str(clip), False, 0]
                    note = f"now shows: {c['shows'][:90]}"
                    break
    if entry is None and how == "search":
        # asked for new footage: a clip already downloaded for this video that it never showed is new to the viewer,
        # costs nothing and needs no YouTube — looked at first
        local = local_clips(job, want + " " + line)[:30]
        if local:
            _set(job, tid, msg="looking through the clips already downloaded for this video...")
            picks = _ask_pick(want, line, local)
            # (Q7: a pick another self-review fill holds goes to the next one; the editor's own tasks take the first)
            picks = next(([p] for p in picks if _claim(job, tid, local[p].get("video"), local[p].get("start"),
                                                       local[p].get("end"))), [])
            if picks:
                c = local[picks[0]]
                entry = ["video", c["path"], False, 0]
                _register_local(job, Path(c["path"]))
                note = f"now shows: {c['shows'][:90]} (already downloaded)"
    if entry is None and how in ("auto", "search"):
        entry, note = _search_new(job, tid, want, line, str(args.get("query") or ""))
    if entry is None and how == "image":
        _set(job, tid, msg="drawing the picture...")
        import make_video as mv
        dest = Path(job) / "images" / f"ed_img_{uuid.uuid4().hex[:8]}.png"
        dest.parent.mkdir(exist_ok=True)
        mv.image_gen(f"{want}. Photorealistic documentary still, natural light, 16:9, no text, no captions, "
                     f"no watermark.", dest, label="editor")
        if not dest.exists():
            raise RuntimeError("the picture service returned nothing")
        entry, note = ["photo", str(dest), False, 0], "AI picture drawn"
    if entry is None:
        raise RuntimeError({"catalog": "nothing in this video's footage shows that — ask for a new YouTube search, "
                                       "or describe the shot differently",
                            "search": "the new search found no usable shot of that — describe it differently",
                            }.get(how, "neither this video's footage nor a new search had a usable shot of that — "
                                       "describe it differently"))
    with _lock(job):
        _snapshot(job, f"new shot at {_clock(a)}")
        plan = _place(load_plan(job), a, b, entry)
        _save_plan(job, plan)
    return note


def _short_query(text: str) -> str:
    """A long description as a YouTube search: its first six words that carry meaning (YouTube answers a whole
    sentence with nothing)."""
    words = [w for w in re.findall(r"[A-Za-z0-9'\-]+", text or "") if w.lower() not in _STOP]
    return " ".join(words[:6])


def _youtube_lets_us(vid: str) -> None:
    """A free check that YouTube will hand this computer a video at all; YouTubeRefused when it will not."""
    import youtube
    try:
        r = subprocess.run(youtube.ytdlp() + ["--skip-download", "--no-warnings", "-q", "--print", "id",
                                              youtube._watch_url(vid)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=90)
    except (subprocess.TimeoutExpired, OSError):
        return
    low = (r.stderr or "").lower()
    if r.returncode != 0 and any(k in low for k in ("not a bot", "sign in to confirm", "cookies", "429")):
        raise YouTubeRefused("YouTube is refusing downloads from this computer right now (“Sign in to confirm you’re "
                             "not a bot”), so no new footage can be searched for. Clips already downloaded for this "
                             "video still work — open Replace… — or set YTDLP_COOKIES_FROM_BROWSER in .env")


def _register_local(job: Path, clip: Path) -> None:
    """A downloaded clip plays as real footage (at its own length, never looped): its length must be on record."""
    with _lock(job):                       # (several self-review fills may write it at once: Q7)
        fs = _read(Path(job) / "footage_seconds.json", {}) or {}
        if clip.name not in fs:
            d = _probe(clip)
            if d > 0:
                fs[clip.name] = round(d, 2)
                _write(Path(job) / "footage_seconds.json", fs)


def _search_new(job: Path, tid: str, want: str, line: str, query: str = "") -> tuple:
    """A new YouTube search. Results this video's watcher logged already are used as they are (free); up to two new
    videos per search are watched (logged by the footage watcher, a few cents each). Claude picks a shot from all of
    them. A search that brings nothing usable is followed by one more, worded differently."""
    import youtube
    if not youtube.installed():
        raise RuntimeError("yt-dlp is not installed, so no new footage can be searched for")
    work = Path(job) / "youtube"
    tried, rounds = [], 0
    short = _short_query(want)
    for q in [query, short, " ".join(short.split()[:4])]:
        q = (q or "").strip()
        if not q or q in tried or rounds >= 2:
            continue
        tried.append(q)
        _set(job, tid, msg=f"searching YouTube for: {q[:60]}")
        results = youtube.search(q, n=10)
        if not results:
            continue
        rounds += 1
        cat = _catalog(job)
        used = _used_spans(job, load_plan(job))
        cands = []

        def add(v, log):
            for sh in youtube.usable(log, v["title"], v["channel"], v["id"]):
                if any(min(b, sh["end"]) - max(a, sh["start"]) > 0.6 for a, b in used.get(v["id"], [])):
                    continue
                cands.append(dict(sh, video=v["id"], title=v["title"], channel=v["channel"],
                                  about=str(log.get("video") or "")[:120]))
        for v in [v for v in results if v["id"] in cat][:4]:
            add(v, cat[v["id"]])
        new = [v for v in results if v["id"] not in cat][:2]
        if new:
            _youtube_lets_us(new[0]["id"])             # before paying the watcher for videos it could not cut
        for v in new:
            _set(job, tid, msg=f"watching: {v['title'][:60]}")
            try:
                with _watch_lock(job, v["id"]):        # (Q7: a second fill reads the first one's log, never pays twice)
                    add(v, youtube.shots(v["id"], work))
            except Exception as e:                            # noqa: BLE001 - the next video may do
                _set(job, tid, msg=f"skipped a video ({str(e)[:60]})")
        if not cands:
            continue
        picks = _ask_pick(want, line, cands[:60])
        for p in picks[:3]:
            if not _claim(job, tid, cands[p].get("video"), cands[p].get("start"), cands[p].get("end")):
                continue                               # (Q7: another self-review fill is using this moment)
            _set(job, tid, msg=f"cutting: {cands[p]['shows'][:60]}")
            clip = _cut(job, dict(cands[p], want=want))
            if clip:
                return ["video", str(clip), False, 0], f"new footage: {cands[p]['shows'][:90]}"
    if not tried:
        raise RuntimeError("there was nothing to search for")
    return None, ""


def _do_graphic(job: Path, args: dict) -> str:
    a, b = float(args["start"]), float(args["end"])
    kind, spec, src_name = args["kind"], args["spec"], args.get("from_file") or ""
    stem = f"ed_{uuid.uuid4().hex[:8]}_{kind}"
    out = Path(job) / "motion" / f"{stem}.mp4"
    gdir = tdir(job) / "graphics"
    gdir.mkdir(exist_ok=True)
    sp = gdir / f"{stem}.json"
    _write(sp, {"kind": kind, "spec": spec, "from": src_name, "dur": float(args.get("dur") or 0)})
    r = _child(["graphic", str(job), str(sp), str(out)], timeout=1200)
    if r != 0 or not out.exists():
        raise RuntimeError("the graphic would not render")
    with _lock(job):
        _snapshot(job, f"graphic at {_clock(a)} drawn again")
        plan = _place(load_plan(job), a, b, ["motion", str(out), False, 0])
        _save_plan(job, plan)
    return "drawn again with the new words"


# ── the chat ───────────────────────────────────────────────────────────────────

CHAT_PROMPT = """You are the editor inside the Shorts timeline editor. A finished YouTube video is open as a timeline and
the person using it asks you to change something. Turn the request into edit operations the engine can run, and answer
in one or two short, friendly sentences IN ENGLISH, saying what you are changing and where
(by time, e.g. "the shot at 1:42"). The person is the editor: do what they ask, WHERE they ask it — never move a
change somewhere else or swap it for something you like better. If you think it will not fit, do it anyway and say so
in half a sentence. Never promise what the operations cannot do; when a request cannot be done, say so and offer the
nearest thing that can. When the request is unclear, ask one short question and return no ops.

VIDEO: "[TITLE]" — style [STYLE], [DUR] long. The narration is in the video's own language; footage descriptions are
in English.

[SELECTION]

TIMELINE (slot | start–end | type | what it shows):
[TIMELINE]

TEXT LABELS burnt into the picture (label | start +seconds | style | text | small line):
[LABELS]

CAPTIONS around the selection (caption | start–end | text):
[CAPTIONS]
[GRAPHIC]
OPERATIONS — put any number of these in "ops"; times are seconds from the start of the video:
  {"op":"replace","slots":[i,...],"find":"<English: the shot wanted, concrete and visual>","query":"<3-6 word YouTube search>","from":"auto|catalog|search|image"}
      New footage for each slot. "catalog" = the shots already found and logged for this video (fast, free);
      "search" = a new YouTube search (2–4 minutes, a few cents); "image" = an AI picture drawn from "find";
      "auto" = the catalog, then a new search. Real footage is preferred: use "image" only when asked for a picture.
  {"op":"place","start":s,"end":e,"find":"...","query":"...","from":"auto|catalog|search|image"}  — new footage over a time range
  {"op":"delete","slots":[i,...]}  — remove shots; the neighbouring shot fills the time
  {"op":"retime","slot":i,"start":s,"end":e}  — move a slot's cuts; its neighbours give or take the time
  {"op":"swap","a":i,"b":j}  — exchange two slots' pictures (each slot keeps its timing)
  {"op":"label_edit","label":k,"text":"...","sub":"...","start":s,"dur":d}  — only the fields that change
  {"op":"label_add","start":s,"dur":d,"style":"name|place|number|date|phrase","text":"...","sub":"..."}
  {"op":"label_delete","label":k}
  {"op":"caption_edit","caption":k,"text":"..."}  — fix the words of a caption (spoken words cannot change)
  {"op":"plain","slots":[i,...]}  — a still (Picture) shown with the plain slow zoom: takes off the "depth pop"
      (the subject lifted off the picture), when the person dislikes that effect on it
  {"op":"graphic_edit","slot":i,"spec":{...}}  — draw an editable graphic again: give its whole spec with your changes
      (only for a graphic whose SPEC is shown above; keep its "type"; write on-screen text in the video's language)
The narration, the voice and the music cannot be changed here. Slot, label and caption numbers are the ones listed
above. Earlier messages of this chat are context only; their [result] says what became of them. Never repeat an
earlier operation on your own — but when the person asks for something again (or an earlier attempt failed), do it
again now: their new message is the order.

THE PERSON SAYS: [MESSAGE]

Write "reply" in English — always, even when the person writes in another language, and whatever any other
instruction says: the whole editor is English.
Return ONLY JSON: {"reply": "...", "ops": [...]}"""


def _sel_text(job: Path, sel: dict, plan: list, st: list, caps: list) -> tuple:
    """(prompt text, slots around which the timeline is listed in full, graphic spec text)"""
    sel = sel or {}
    kind = sel.get("kind")
    focus, gfx = [], ""
    if kind == "slots" and sel.get("ids"):
        ids = [int(x) for x in sel["ids"] if 0 <= int(x) < len(plan)]
        focus = ids
        parts = []
        for i in ids[:12]:
            a, b = st[i], st[i] + float(plan[i][3])
            parts.append(f"slot {i} ({_clock(a)}–{_clock(b)}), narration there: \"{_narration(caps, a, b)}\"")
        txt = "SELECTED: " + "; ".join(parts)
        if len(ids) == 1 and plan[ids[0]][0] == "motion":
            gk, gs = graphic_spec(job, plan[ids[0]])
            if gk:
                gfx = f"\nSPEC of the selected graphic (slot {ids[0]}, kind {gk}):\n{json.dumps(gs, ensure_ascii=False)}\n"
            else:
                gfx = "\n(The selected graphic cannot be drawn again here — it can be replaced, deleted or retimed.)\n"
    elif kind == "label":
        txt = f"SELECTED: text label L{sel.get('id')}"
        t = float(sel.get("t") or 0)
        focus = [_slot_at(plan, t)]
    elif kind == "caption":
        txt = f"SELECTED: caption C{sel.get('id')}"
        focus = [_slot_at(plan, float(sel.get("t") or 0))]
    elif kind == "range":
        a, b = float(sel.get("start") or 0), float(sel.get("end") or 0)
        txt = f"SELECTED: the time range {_clock(a)}–{_clock(b)} ({a:.2f}–{b:.2f} s); narration: \"{_narration(caps, a, b)}\""
        focus = [_slot_at(plan, a), _slot_at(plan, b)]
    else:
        t = float(sel.get("playhead") or 0)
        i = _slot_at(plan, t)
        txt = (f"SELECTED: nothing. The playhead is at {_clock(t)}, over slot {i}; narration there: "
               f"\"{_narration(caps, st[i], st[i] + float(plan[i][3]))}\"")
        focus = [i]
    return txt, focus, gfx


def chat(job: Path, slug: str, message: str, sel: dict, after_render: bool = False) -> dict:
    message = (message or "").strip()
    if not message:
        return {"error": "Write what should change."}
    if after_render:
        user = _note(job, "user", message, sel=sel or {})
        defer(job, {"type": "chat", "message": message, "sel": sel or {}, "label": message[:80]})
        _note(job, "sys", "⏱ Queued — this starts as soon as the render is done.")
        return {"ok": True, "id": user["id"], "queued": True}
    user = _note(job, "user", message, sel=sel or {})
    wait = _note(job, "ai", "", pending=True)
    threading.Thread(target=_chat_reply, args=(Path(job), slug, message, sel or {}, wait["id"]), daemon=True).start()
    return {"ok": True, "id": user["id"]}


def _chat_reply(job: Path, slug: str, message: str, sel: dict, mid: str) -> None:
    import make_video as mv
    try:
        plan = load_plan(job)
        st = starts(plan)
        caps = load_captions(job)
        cat, rows, docs = _catalog(job), _clip_rows(job), _doc_specs(job)
        seltxt, focus, gfx = _sel_text(job, sel, plan, st, caps)
        lo = max(0, min(focus or [0]) - 25)
        hi = min(len(plan), max(focus or [0]) + 26)
        full = len(plan) <= 220
        lines = []
        for i, e in enumerate(plan):
            if not full and not (lo <= i < hi) and e[0] != "motion":
                continue
            info = describe(job, e, cat, rows, docs)
            lines.append(f"{i} | {_clock(st[i])}–{_clock(st[i] + float(e[3]))} | {info['title']} | "
                         f"{(info.get('label') or '')[:110]}")
        if not full:
            lines.insert(0, f"(showing slots {lo}–{hi - 1} in full and every graphic; {len(plan)} slots in all)")
        labels = load_labels(job)
        ltxt = "\n".join(f"L{k} | {_clock(float(x.get('t') or 0))} +{float(x.get('dur') or 0):.1f}s | "
                         f"{x.get('style') or ''} | {x.get('text') or ''} | {x.get('sub') or ''}"
                         for k, x in enumerate(labels)) or "(none)"
        t_mid = st[focus[0]] if focus else 0.0
        near = [k for k, c in enumerate(caps) if abs(c["t"] - t_mid) < 40] or list(range(min(12, len(caps))))
        ctxt = "\n".join(f"C{k} | {_clock(caps[k]['t'])}–{_clock(caps[k]['end'])} | "
                         f"{caps[k]['text'].replace(chr(10), ' ')}" for k in near[:40]) or "(none)"
        title = (job / "title.txt").read_text(encoding="utf-8").splitlines()[0] if (job / "title.txt").exists() else ""
        style = (job / "style.txt").read_text(encoding="utf-8").strip() if (job / "style.txt").exists() else ""
        st_now = _state(job)
        tasks = {t["id"]: t for t in st_now["tasks"]}
        hist = [m for m in st_now["chat"] if m.get("role") in ("user", "ai") and not m.get("pending")][-7:-1]

        def outcome(m):
            """What became of the changes a reply promised — a failed one must not read as done."""
            bits = []
            for r in m.get("results") or []:
                t = tasks.get(r.get("task") or "")
                if t:
                    bits.append(f"{t.get('label', '')[:60]}: {t.get('state')}" + (f" ({t.get('msg', '')[:90]})"
                                                                                 if t.get("state") == "failed" else ""))
                elif r.get("error"):
                    bits.append(f"failed: {r['error'][:90]}")
            return f" [result: {'; '.join(bits)}]" if bits else ""
        convo = "\n".join(f"{'PERSON' if m['role'] == 'user' else 'YOU'}: {m['text'][:300]}"
                          + (outcome(m) if m["role"] == "ai" else "") for m in hist)
        prompt = (CHAT_PROMPT.replace("[TITLE]", title).replace("[STYLE]", style)
                  .replace("[DUR]", _clock(sum(float(e[3]) for e in plan)))
                  .replace("[SELECTION]", seltxt).replace("[TIMELINE]", "\n".join(lines))
                  .replace("[LABELS]", ltxt).replace("[CAPTIONS]", ctxt).replace("[GRAPHIC]", gfx)
                  .replace("[MESSAGE]", (f"(earlier in this chat:\n{convo})\n" if convo else "") + message))
        with _claude_kind(mv, "timeline.chat", job=job), _no_limit_wait(mv):
            txt = mv.claude(prompt, mv.UTILITY_MODEL, max_tokens=4000)
        d = mv._json_obj(txt)
        if not d:
            m = re.search(r"\{.*\}", txt or "", re.S)
            d = json.loads(m.group(0)) if m else {"reply": (txt or "").strip()[:600], "ops": []}
        reply = str(d.get("reply") or "").strip() or "Done."
        results = run_ops(job, d.get("ops") or [], source="ai")
        _replace_msg(job, mid, reply, results)
        _after_task(job)
    except Exception as e:                                     # noqa: BLE001
        _replace_msg(job, mid, f"Sorry — I could not do that ({type(e).__name__}: {str(e)[:200]}).", [], error=True)


def _replace_msg(job: Path, mid: str, text: str, results: list, error: bool = False) -> None:
    with _lock(job):
        st = _state(job)
        for m in st["chat"]:
            if m["id"] == mid:
                m.update(text=text, pending=False, results=results, error=error, t=time.time())
        _save_state(job, st)


def run_ops(job: Path, ops: list, source: str = "manual", enqueue: bool = True) -> list:
    """Every op from the chat (or the editor's buttons): quick ones applied now, the rest queued. One line each.

    Each slot and label number refers to the timeline as it was when the ops were written — an op earlier in the
    list (a delete, a label re-sorted by time) must not make a later one land on its neighbour. So every number is
    turned into what it pointed at first: a slot into its moment, a label into its words. `enqueue` False: the
    queued tasks are not handed to the worker — the caller runs them (run_tasks, self-review's repairs)."""
    out = []
    plan0 = load_plan(job)
    st0 = starts(plan0)
    labels0 = load_labels(job)

    def slot_now(i):
        i = int(i)
        if not 0 <= i < len(plan0):
            raise ValueError(f"there is no slot {i}")
        return _slot_at(load_plan(job), st0[i] + float(plan0[i][3]) / 2)

    def label_now(k):
        k = int(k)
        if not 0 <= k < len(labels0):
            raise ValueError(f"there is no label {k}")
        x = labels0[k]
        for j, y in enumerate(load_labels(job)):
            if y.get("t") == x.get("t") and y.get("text") == x.get("text") and y.get("style") == x.get("style"):
                return j
        raise ValueError(f"label {k} changed in the meantime")

    def kind_of(how):
        return "fill_" + {"catalog": "catalog", "search": "search", "image": "image"}.get(how, "catalog")

    for op in ops if isinstance(ops, list) else []:
        if not isinstance(op, dict):
            continue
        kind = op.get("op")
        try:
            if kind == "replace":
                how = str(op.get("from") or "auto")
                for i in [int(x) for x in op.get("slots") or []][:12]:
                    if not 0 <= i < len(plan0):
                        continue
                    a, b = st0[i], st0[i] + float(plan0[i][3])
                    tk = add_task(job, kind_of(how),
                                  f"New {'picture' if how == 'image' else 'shot'} at {_clock(a)}: {str(op.get('find') or '')[:70]}",
                                  {"start": a, "end": b, "find": op.get("find") or "", "from": how,
                                   "query": op.get("query") or ""}, source, enqueue)
                    out.append({"task": tk["id"], "label": tk["label"]})
            elif kind == "place":
                a, b = float(op["start"]), float(op["end"])
                how = str(op.get("from") or "auto")
                tk = add_task(job, kind_of(how),
                              f"New {'picture' if how == 'image' else 'shot'} {_clock(a)}–{_clock(b)}: {str(op.get('find') or '')[:60]}",
                              {"start": a, "end": b, "find": op.get("find") or "", "from": how,
                               "query": op.get("query") or ""}, source, enqueue)
                out.append({"task": tk["id"], "label": tk["label"]})
            elif kind == "graphic_edit":
                i0 = int(op["slot"])
                i = slot_now(i0)
                plan = load_plan(job)
                st = starts(plan)
                gk, old = graphic_spec(job, plan[i])
                if not gk or not isinstance(op.get("spec"), dict):
                    out.append({"error": f"The graphic at slot {i0} cannot be drawn again here."})
                    continue
                spec = dict(op["spec"])
                if gk == "doc" and old.get("type"):
                    spec["type"] = old["type"]
                src = rebase(job, plan[i][1])
                tk = add_task(job, "graphic", f"Graphic at {_clock(st[i])} drawn again",
                              {"start": st[i], "end": st[i] + float(plan[i][3]), "kind": gk, "spec": spec,
                               "from_file": src.name, "dur": _probe(src) or float(plan[i][3])}, source, enqueue)
                out.append({"task": tk["id"], "label": tk["label"]})
            elif kind in ("delete", "retime", "swap", "use_file"):
                o = dict(op)
                if kind == "delete":
                    o["slots"] = [slot_now(x) for x in (op.get("slots") or [op.get("slot")]) if x is not None]
                elif kind == "swap":
                    o["a"], o["b"] = slot_now(op["a"]), slot_now(op["b"])
                else:
                    o["slot"] = slot_now(op["slot"])
                r = apply_op(job, o)
                out.append({"done": r.get("msg")} if r.get("ok") else {"error": r.get("error")})
            elif kind in ("label_edit", "label_delete"):
                o = dict(op, label=label_now(op["label"]))
                r = apply_op(job, o)
                out.append({"done": r.get("msg")} if r.get("ok") else {"error": r.get("error")})
            elif kind == "pick_shot":                       # a shot chosen by hand in the browser
                if op.get("start") is not None and op.get("end") is not None:
                    a, b = float(op["start"]), float(op["end"])
                else:
                    i = int(op.get("slot", -1))
                    if not 0 <= i < len(plan0):
                        raise ValueError(f"there is no slot {i}")
                    a, b = st0[i], st0[i] + float(plan0[i][3])
                shot = op.get("shot") or {}
                tk = add_task(job, "fill_file", f"Shot at {_clock(a)}: {str(shot.get('shows') or '')[:60]}",
                              {"start": a, "end": b, "shot": shot, "find": str(shot.get("shows") or "")}, source,
                              enqueue)
                out.append({"task": tk["id"], "label": tk["label"]})
            elif kind == "plain":
                for i0 in [int(x) for x in op.get("slots") or [op.get("slot")] if x is not None][:20]:
                    r = apply_op(job, {"op": "plain", "slot": slot_now(i0)})
                    out.append({"done": r.get("msg")} if r.get("ok") else {"error": r.get("error")})
            elif kind in ("label_add", "caption_edit"):
                r = apply_op(job, op)
                out.append({"done": r.get("msg")} if r.get("ok") else {"error": r.get("error")})
            else:
                out.append({"error": f"unknown operation {kind!r}"})
        except (KeyError, ValueError, TypeError, IndexError) as e:
            out.append({"error": f"{kind}: {e}"})
    return out


# ── render ─────────────────────────────────────────────────────────────────────

def _seg_plan(job: Path) -> list:
    """The plan the files in segments/ were rendered for: segs.json once a render has moved them, else the plan the
    finished video was made from. Kept apart from base.json, because a render that fails after moving the segments
    leaves them matching the new plan while the video in the library is still the old one."""
    d = _read(tdir(job) / "segs.json", None)
    if isinstance(d, dict) and isinstance(d.get("plan"), list):
        return [[str(e[0]), str(e[1]), bool(e[2]), float(e[3])] for e in d["plan"]]
    return _base(job)


def _missing_pieces(job: Path, plan: list) -> list:
    """Slots that have neither a cached segment nor the picture to render one from (a video rendered in the cloud
    and pulled back holds only the finished file)."""
    seg_dir = Path(job) / "segments"
    m = align(_seg_plan(job), plan)
    return [i for i, e in enumerate(plan)
            if not (i in m and (seg_dir / f"seg_{m[i]:03d}.mp4").exists()) and not rebase(job, e[1]).exists()]


def _reconcile_segments(mv, job: Path, plan: list) -> int:
    """Every cached segment moved to the slot it now belongs to; the rest removed (rendered again). Returns how many
    slots need a new segment."""
    seg_dir = Path(job) / "segments"
    seg_dir.mkdir(exist_ok=True)
    m = align(_seg_plan(job), plan)
    # Shorts engine (Q8): a footage slot's cinema treatment (seg_NNN_cin.mp4 + its .key) moves with its segment, and
    # cinema reuses it while the key still matches. SHORTS_FAST_CINEMA_CACHE=0: all of them are drawn again
    keep_cin = os.environ.get("SHORTS_FAST_CINEMA_CACHE", "1") != "0"
    if not keep_cin:
        for f in seg_dir.glob("seg_*_cin.mp4"):              # cinema treats every footage slot again anyway
            f.unlink(missing_ok=True)
    tmp, cins = [], []
    for i, j in m.items():
        src = seg_dir / f"seg_{j:03d}.mp4"
        if src.exists():
            t = seg_dir / f"mv_{i:04d}.tmp.mp4"
            os.replace(src, t)
            tmp.append((t, seg_dir / f"seg_{i:03d}.mp4", float(plan[i][3])))
            cin, key = seg_dir / f"seg_{j:03d}_cin.mp4", seg_dir / f"seg_{j:03d}_cin.key"
            if keep_cin and cin.exists() and key.exists():
                tc, tk = seg_dir / f"mv_{i:04d}.cin.tmp.mp4", seg_dir / f"mv_{i:04d}.cin.tmp.key"
                os.replace(cin, tc)
                os.replace(key, tk)
                cins.append((tc, tk, i))
    for f in seg_dir.glob("seg_*.mp4"):
        f.unlink(missing_ok=True)
    for f in seg_dir.glob("seg_*_cin.key"):                  # the keys of treatments that were not moved
        f.unlink(missing_ok=True)
    for t, dst, _d in tmp:
        os.replace(t, dst)
    for tc, tk, i in cins:
        os.replace(tc, seg_dir / f"seg_{i:03d}_cin.mp4")
        os.replace(tk, seg_dir / f"seg_{i:03d}_cin.key")
    if cins:
        (getattr(mv, "log", None) or print)(f"timeline: {len(cins)} cinema treatment(s) kept with their segments "
                                            f"(drawn again only where the shot or its look changed)")
    # a cached segment of the wrong length was made for another plan: it is made again rather than trusted
    for _t, dst, d in tmp:
        got = _probe(dst)
        if got <= 0 or abs(got - d) > 0.2:
            dst.unlink(missing_ok=True)
            dst.with_name(dst.stem + "_cin.mp4").unlink(missing_ok=True)
            dst.with_name(dst.stem + "_cin.key").unlink(missing_ok=True)
    _write(tdir(job) / "segs.json", {"plan": plan, "made": time.time()})
    return sum(1 for i in range(len(plan)) if not (seg_dir / f"seg_{i:03d}.mp4").exists())


def render(mv, job: Path, sink=None) -> Path:
    """Put the edited video together again — in a child process at low priority (`python timeline.py render <job>`),
    its log lines passed on to `sink`. The assembly is the engine's own, every untouched segment from the cache."""
    job = Path(job)
    say = sink or print
    if pending(job):
        raise RuntimeError("some edits are still being made — render once the queue is empty")
    short = disk_short(job)
    if short:
        raise RuntimeError(short)
    wait_for_memory(say)
    p = subprocess.Popen([sys.executable, "-u", str(HERE / "timeline.py"), "render", str(job)], cwd=str(HERE),
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8",
                         errors="replace", **_low_priority())
    tail = []
    for line in p.stdout:
        line = line.rstrip("\n")
        if not line.strip() or "NotOpenSSLWarning" in line or line.strip() == "warnings.warn(":
            continue
        say(line)
        tail = (tail + [line])[-40:]
    rc = p.wait()
    if rc in (-15, -9, -1, 129, 130, 137, 143) and not any("ERROR:" in l and "SystemExit" not in l
                                                             and not re.search(r"ERROR:\s*\d+\s*$", l) for l in tail):
        raise RuntimeError("the render was stopped before it finished — the video in your library is as it was")
    if rc != 0:
        why = next((l.split("ERROR:", 1)[1].strip() for l in reversed(tail) if "ERROR:" in l), "")
        why = why or next((l.strip() for l in reversed(tail) if re.match(r"\s*\w+(Error|Exception)\b", l)), "")
        raise RuntimeError(why or "the render stopped — see the log")
    return mv.final_video(job)


def _ahead(mv, job: Path, mp3: Path, plan: list, style: str, srt: Path, mute: list):
    """Shorts engine speed (10-16, Q6): the sound design (and the name / place label check) beside the segment pool, as
    the pipeline's own assembly does it (make_video._Ahead, P2) — the editor's assembly, which self-review uses for every
    repair round, mixed the sound only after the join (1.3 min on an idle Mac, each round). None — after the join, as
    before — with SHORTS_FAST_EDIT_AHEAD=0, the engine's SHORTS_FAST_AHEAD=0, or an engine without _Ahead."""
    if not _fast_on("EDIT_AHEAD"):
        return None
    cls, on = getattr(mv, "_Ahead", None), getattr(mv, "_speed_on", None)
    if cls is None or not callable(on):
        return None
    try:
        if not on("AHEAD"):
            return None
        return cls(job, mp3, plan, style, srt=srt, mute=mute)
    except Exception:                                          # noqa: BLE001 - mixed after the join, as before
        return None


def _render_impl(mv, job: Path, sink=None) -> Path:
    """Put the edited video together again: the engine's own assembly, every untouched segment from the cache."""
    job = Path(job)
    if pending(job):
        raise RuntimeError("some edits are still being made — render once the queue is empty")
    plan0 = load_plan(job)
    gone = _missing_pieces(job, plan0)
    if gone:
        st0 = starts(plan0)
        at = ", ".join(_clock(st0[i]) for i in gone[:6]) + (" …" if len(gone) > 6 else "")
        raise RuntimeError(f"{len(gone)} shot(s) of this video are not on this computer — neither their rendered piece "
                           f"nor their footage (at {at}). A video rendered in the cloud comes back as the finished file "
                           f"only. Replace or delete those shots, or render it where it was made. Nothing was changed")
    title = (job / "title.txt").read_text(encoding="utf-8").splitlines()[0].strip()
    style = (job / "style.txt").read_text(encoding="utf-8").strip() if (job / "style.txt").exists() else ""
    spec = _read(job / "run_spec.json", {}) or {}
    mv._SINK = sink
    try:
        mv.step(f"Timeline edit: {title}")
        # the engine's per-video settings, as the pipeline sets them for this channel
        mv.set_extra(spec.get("extra") or "")
        mv._STYLE_NOW = style
        mv.set_graphic_durs(style)
        mix, *_rest = mv._apply_features(style, spec.get("features"), tuple(spec.get("mix") or ()), True,
                                         True, True, True, True, True)
        mv.set_mix(*(mix or mv.STYLE_MIX.get(style) or mv.MIX_DEFAULT))
        mv._lock_mix(style)
        if mv._FEATURES and not (job / "_voice_sound.wav").exists() and spec.get("features") is None:
            mv._FEATURES["sound"] = False                    # the video was made without sound design: kept so
        mv._GRADE = os.environ.get("FOOTAGE_GRADE") or mv.FOOTAGE_GRADE.get(style, "")
        burn = bool(spec.get("burn_subs", True))
        with _lock(job):
            plan = load_plan(job)
            plan = [[e[0], str(rebase(job, e[1])), e[2], e[3]] for e in plan]
            _save_plan(job, plan)
            mv._unpublish(job, title)
            final = job / "video.mp4"
            if final.exists():
                # the mark says a render holds the library video aside; it goes when the video is back (heal())
                (tdir(job) / "rendering").write_text(str(os.getpid()), encoding="utf-8")
                os.replace(final, tdir(job) / "before_last_render.mp4")
            had_segs = any((job / "segments").glob("seg_*.mp4")) if (job / "segments").is_dir() else False
            todo = _reconcile_segments(mv, job, plan)
        mv.log(f"timeline: {len(plan)} slots, {todo} to render, the rest from the cache")
        if todo and not had_segs:
            mv.log("timeline: the working files were cleaned after the last render, so every slot is rendered again "
                   "(SHORTS_KEEP_SEGMENTS=1 keeps them for faster edits)")
        mp3, srt = job / "audio.mp3", job / "subs.srt"
        sub_center = style in mv.CENTER_SUB_STYLES
        plan_t = [tuple(e) for e in plan]
        no_dust, tt = [], 0.0
        for e in plan_t:
            if mv._mutes_captions(e, sub_center):
                no_dust.append((tt, tt + float(e[3])))
            tt += float(e[3])
        try:
            mv._word_clock(job, srt)
        except Exception:                                      # noqa: BLE001 - the letters estimate then
            pass
        ahead = _ahead(mv, job, mp3, plan_t, style, srt, no_dust)      # Q6: sound design beside the segments
        try:
            mv.step("Edited timeline: segments")
            segs = mv._render_astro_segments(plan_t, job, False, white_fade=mv.STYLE_WHITE_FADE.get(style, 0.0),
                                             style=style, **({"ahead": ahead} if ahead is not None else {}))
            if (HERE / "cinema.py").exists():
                import cinema
                segs = cinema.post_segments(mv, plan_t, segs, job, style)
            mv.step("Edited timeline: joining and the final mix")
            mv._concat_segments(segs, job / "_visual.mp4")
            mv._final_mux(job, ahead.sound() if ahead is not None else mv._with_sound_design(job, mp3, plan_t, style),
                          srt, burn, add_qr=False, vignette=mv.ASTRO_VIGNETTE, no_dust_ranges=no_dust,
                          sub_center=sub_center, no_sub_ranges=no_dust)
        finally:
            if ahead is not None:
                ahead.close()
        (job / "_visual.mp4").unlink(missing_ok=True)
        if not final.exists():
            raise RuntimeError("the final mix did not produce a video")
        # the presenter goes back in when the video had one: the lip-synced clips are cached, nothing is paid again
        av = _read(job / "avatar_applied.json", None)
        if isinstance(av, dict) and (av.get("windows") or spec.get("avatar_s")):
            w0 = (av.get("windows") or [[0, 0, 0.0, 0.0]])[0]
            secs = float(spec.get("avatar_s") or (float(w0[3]) - float(w0[2])) or 0)
            if secs > 0:
                if mv._FEATURES:
                    mv._FEATURES["avatar"] = True
                final = mv._maybe_avatar(final, job, mp3, srt, spec.get("avatar_id") or av.get("avatar") or "", secs,
                                         False, int(spec.get("avatar_count") or av.get("count") or 1))
        with _lock(job):
            _write(tdir(job) / "base.json", {"plan": plan, "made": time.time()})
            _write(tdir(job) / "segs.json", {"plan": plan, "made": time.time()})
            shutil.rmtree(tdir(job) / "history", ignore_errors=True)
            shutil.rmtree(tdir(job) / "preview", ignore_errors=True)
            shutil.rmtree(tdir(job) / "thumbs", ignore_errors=True)
        out = mv.publish_named_copy(job, title)
        (tdir(job) / "rendering").unlink(missing_ok=True)
        _note(job, "sys", "✓ Rendered — the video in your library is the edited one now.")
        mv.step(f"DONE -> {out}")
        return out
    except BaseException:
        # the old video back where the library finds it, if the new one never got made
        bk = tdir(job) / "before_last_render.mp4"
        if (bk.exists() or bk.is_symlink()) and not (job / "video.mp4").exists():
            os.replace(bk, job / "video.mp4")
            try:
                mv.publish_named_copy(job, title)
            except Exception:                                  # noqa: BLE001
                pass
        (tdir(job) / "rendering").unlink(missing_ok=True)
        raise
    finally:
        mv._SINK = None


# ── child processes: previews and graphics ─────────────────────────────────────

def _engine():
    import make_video as mv
    import motion
    import styles
    styles.apply_to_engine(mv, motion)
    return mv


def _render_one(mv, job: Path, e: list, style: str, out: Path) -> None:
    kind, dur = e[0], float(e[3])
    src = rebase(job, e[1])
    tmp = out.with_name(out.stem + ".part.mp4")
    real = mv._footage_seconds(job)
    try:
        if not src.exists():
            mv._render_black_segment(dur, tmp)
        elif kind == "video" and src.name in real:
            mv._render_footage_segment(src, dur, tmp, real[src.name], style, 0)
        elif kind == "motion":
            sd = mv._video_dur(src)
            if sd > 0 and dur > sd + 0.08:
                mv._render_held_scene(src, dur, tmp, sd, 0.0)
            else:
                mv._render_video_segment(src, dur, tmp, drift=False,
                                         grade=not src.name.startswith(("kit_", "threed_")))
        elif kind == "photo":
            mv._render_photo_segment(src, dur, tmp, zoom_mode=mv.STYLE_ZOOM.get(style, "in"), style=style)
        else:
            mv._render_video_segment(src, dur, tmp)
        os.replace(tmp, out)
    finally:
        tmp.unlink(missing_ok=True)


def _cli_previews(job: Path) -> int:
    mv = _engine()
    style = (job / "style.txt").read_text(encoding="utf-8").strip() if (job / "style.txt").exists() else ""
    mv._GRADE = os.environ.get("FOOTAGE_GRADE") or mv.FOOTAGE_GRADE.get(style, "")
    plan = load_plan(job)
    m = align(_base(job), plan)
    pdir = tdir(job) / "preview"
    pdir.mkdir(exist_ok=True)
    bad = 0
    for i, e in enumerate(plan):
        if i in m:
            continue
        out = pdir / f"{_key(e)}.mp4"
        if out.exists():
            continue
        try:
            _render_one(mv, job, e, style, out)
        except Exception as ex:                                # noqa: BLE001
            bad += 1
            sys.stderr.write(f"slot {i}: {ex}\n")
    return 1 if bad else 0


def _ground(job: Path, near: float, blur: float, bright: float, tmp: Path, sat: float = 0.85) -> str:
    """A quiet background for a graphic: the footage nearest its moment, blurred and darkened, as docgfx does."""
    import docgfx
    plan = load_plan(job)
    best, bd = None, 1e9
    for e, s in zip(plan, starts(plan)):
        if e[0] not in ("video", "photo"):
            continue
        p = rebase(job, e[1])
        if p.exists() and abs(s - near) < bd:
            best, bd = p, abs(s - near)
    return docgfx.ground_uri(best, blur, bright, tmp, sat=sat) if best else ""


def _luma(path: Path) -> float:
    try:
        from PIL import Image, ImageStat
        return float(ImageStat.Stat(Image.open(path).convert("L")).mean[0])
    except Exception:                                          # noqa: BLE001
        return 0.0


def _ground_of(job: Path, name: str, tmp: Path, sc: dict = None, look: dict = None) -> str:
    """The background the graphic being redrawn already had: docgfx brings its words in over a still ground, so the
    old graphic's first frame IS that ground — blurred and darkened already. Redrawn on it, only the words change.
    The page darkens its ground once more, so one frame is drawn first to measure by how much, and the ground is
    lifted by that (a third darker, otherwise). "" when the first frame is black (a scene that fades in) or the
    file is gone."""
    import docgfx
    src = None
    for d in ("motion", "maps", "headlines", "photofx"):
        if name and (Path(job) / d / name).exists():
            src = Path(job) / d / name
            break
    if src is None:
        return ""
    g0 = tmp / "ground0.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-frames:v", "1", "-q:v", "2", str(g0)],
                   capture_output=True, timeout=60)
    base = _luma(g0) if g0.exists() else 0.0
    if base < 14:
        return ""
    lift = 1.0
    if sc is not None:
        try:
            probe = dict(sc, duration=1.0 / 30, ground=docgfx.ground_uri(g0, 0, 1.0, tmp, sat=1.0))
            pm = tmp / "probe.mp4"
            docgfx.render([(probe, pm)], workers=1, look=look)
            f0 = tmp / "probe.jpg"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(pm), "-frames:v", "1", str(f0)],
                           capture_output=True, timeout=60)
            got = _luma(f0)
            if got > 1:
                lift = max(1.0, min(2.2, base / got))
        except Exception:                                      # noqa: BLE001 - the unmeasured ground then
            lift = 1.0
    return docgfx.ground_uri(g0, 0, lift, tmp, sat=1.0)


def _cli_graphic(job: Path, spec_file: Path, out: Path) -> int:
    with render_lock(f"shorts timeline graphic {out.stem}"):
        return _cli_graphic_locked(job, spec_file, out)


def _cli_graphic_locked(job: Path, spec_file: Path, out: Path) -> int:
    import tempfile
    mv = _engine()
    import docgfx
    d = _read(spec_file, {})
    kind, spec, dur = d.get("kind"), dict(d.get("spec") or {}), float(d.get("dur") or 0)
    style = (job / "style.txt").read_text(encoding="utf-8").strip() if (job / "style.txt").exists() else ""
    look = ((mv.STYLE_INFO.get(style) or {}).get("look") or {})
    try:
        lang = mv._job_language(job, style)
    except Exception:                                          # noqa: BLE001
        lang = ""
    title = (job / "title.txt").read_text(encoding="utf-8").splitlines()[0] if (job / "title.txt").exists() else ""
    # where the graphic sits: the slot that showed the old one
    plan = load_plan(job)
    at = 0.0
    for e, s in zip(plan, starts(plan)):
        if Path(str(e[1])).name == d.get("from"):
            at = s
            break
    tmp = Path(tempfile.mkdtemp(prefix="tl_gfx_"))
    try:
        if kind == "doc":
            sc = docgfx.normalise(spec, lang)
            if sc is None:
                sys.stderr.write("docgfx: the spec is not a graphic docgfx can draw\n")
                return 2
            sc = docgfx.of_its_time(sc, title)
            sc["duration"] = dur or float(docgfx.LENGTH.get(sc["type"], 5.0))
            sc["sep"] = docgfx.seps(lang)
            if sc["type"] not in ("chart", "timeline"):
                blur, bright = {"dateline": (3.5, 0.9), "number": (6, 0.62), "quote": (6, 0.58), "pivot": (5, 0.66),
                                "question": (7, 0.66), "card": (0, 0.84), "step": (0, 1.0), "social": (9, 0.55),
                                "place": (0, 0.9), "pull": (1.5, 0.62), "table": (4, 0.6)}.get(sc["type"], (8, 0.5))
                sc["ground"] = (_ground_of(job, str(d.get("from") or ""), tmp, sc, look)
                                or _ground(job, at, blur, bright, tmp))
                if sc["type"] == "place":
                    sc["ground_soft"] = _ground(job, at, 11, 0.86, tmp)
            docgfx.render([(sc, out)], workers=1, look=look)
            out.with_suffix(".sfx.json").write_text(json.dumps(docgfx.sound_marks(sc)), encoding="utf-8")
        elif kind == "chapter":
            sc = {"type": "chapter", "duration": dur or 4.0, "n": "", "kicker": str(spec.get("kicker") or ""),
                  "title": str(spec.get("title") or ""), "episode": str(spec.get("episode") or ""),
                  "dark": bool(spec.get("dark")), "ground": _ground(job, at + 6.0, 10, 0.55, tmp)}
            docgfx.render([(sc, out)], workers=1, look=look)
            try:
                import cinema
                cinema._leak_in(out)
            except Exception:                                  # noqa: BLE001
                pass
            out.with_suffix(".sfx.json").write_text("[]", encoding="utf-8")
        elif kind == "map":
            import maps
            sc = dict(spec)
            sc["duration"] = dur or float(sc.get("duration") or 7.0)
            maps.render([(sc, out)], workers=1)
        else:
            sys.stderr.write(f"unknown graphic kind {kind}\n")
            return 2
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return 0 if out.exists() else 1


def _cli_render(job: Path) -> int:
    import signal

    def stop(signum, _frame):
        # SIGTERM/SIGHUP end a process without unwinding: raised here, the render's own clean-up puts the video
        # that was in the library back before the process goes
        raise SystemExit(128 + signum)
    for sig in ("SIGTERM", "SIGHUP"):
        if hasattr(signal, sig):
            signal.signal(getattr(signal, sig), stop)
    mv = _engine()
    try:
        short = disk_short(job)
        if short:
            raise RuntimeError(short)
        with render_lock(f"shorts timeline render {job.name}"):
            # Shorts engine: the edit render gets what a pipeline render has — the memory / swap / disk watchdog, a
            # place in guard's render registry, the idle-sleep hold (make_video._speed_start; absent: as before)
            run = None
            try:
                start = getattr(mv, "_speed_start", None)
                run = start(job, f"timeline {job.name}", minutes=0) if callable(start) else None
            except Exception:                                  # noqa: BLE001 - a render without them, as before
                run = None
            try:
                _render_impl(mv, job)
            finally:
                if run is not None:
                    try:
                        run.stop()
                    except Exception:                          # noqa: BLE001
                        pass
        return 0
    except SystemExit:                                         # stopped from outside: the video was put back
        print("ERROR: the render was stopped before it finished — the video in your library is as it was", flush=True)
        return 1
    except BaseException as e:                                 # noqa: BLE001 - the parent shows this line
        print(f"ERROR: {str(e) or type(e).__name__}", flush=True)
        return 1


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "render":
        sys.exit(_cli_render(Path(sys.argv[2])))
    if len(sys.argv) >= 3 and sys.argv[1] == "previews":
        sys.exit(_cli_previews(Path(sys.argv[2])))
    if len(sys.argv) >= 5 and sys.argv[1] == "graphic":
        sys.exit(_cli_graphic(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])))
    sys.exit("usage: python timeline.py render <job> | previews <job> | graphic <job> <spec.json> <out.mp4>")
