"""channel_study.py: study a WHOLE channel's Shorts for a style, overnight, without anyone watching.

    py -3.12 stylelab/channel_study.py <style-slug> <channel link> [--deep 120] [--map]

Into output/short_styles/<slug>/all/ (each stage is skipped when its output exists, so a stopped run resumes):
  1 index      every Short of the channel: id, views, length, title                        all/index.json
  2 words      the spoken words of EVERY Short from its captions (no video download)         all/words/<id>.json
  3 scripts    script numbers over the whole channel, winners vs the rest                   all/scripts.json
  4 refs       the top --deep Shorts by views, downloaded (H.264, 30 fps for the tools)       all/refs/<id>.mp4
  5 measure    every stylelab tool on those refs (stylelab/auto.py's list, longer limits)   all/<tool outputs>
  6 map        (--map) what every 3 s of a map Short is made of, named by the brain          all/mapvision/<id>.json, all/mapvision.json
  7 writer     a Claude Code session turns it all into the style's deep sections of SPEC.md  (waits for SPEC.md from auto.py first)
Free: yt-dlp, ffmpeg, OpenCV and the creator's own Claude Code plan. Progress lines go to stdout and all/progress.txt."""
import json, re, statistics, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path(__file__).parent
LEGION = LAB.parent
sys.path.insert(0, str(LAB))
sys.path.insert(0, str(LEGION))
import auto  # noqa: E402

YTDLP = [sys.executable, "-m", "yt_dlp", "-q", "--no-warnings"]


def say(all_: Path, m: str) -> None:
    line = time.strftime("%H:%M:%S ") + m
    print(line, flush=True)
    with (all_ / "progress.txt").open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def index(all_: Path, channel: str) -> list:
    f = all_ / "index.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    url = channel.rstrip("/") + ("" if channel.rstrip("/").endswith("/shorts") else "/shorts")
    r = subprocess.run([*YTDLP, "--flat-playlist", "--print", "%(id)s\t%(view_count)s\t%(duration)s\t%(title)s", url],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=1800)
    rows = []
    for ln in r.stdout.splitlines():
        p = ln.split("\t")
        if len(p) >= 4 and re.fullmatch(r"[\w-]{11}", p[0]):
            rows.append({"id": p[0], "views": int(p[1]) if p[1].isdigit() else 0,
                         "dur": float(p[2]) if re.fullmatch(r"[\d.]+", p[2]) else None, "title": p[3]})
    f.write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")
    return rows


def words_of(all_: Path, vid: str) -> list | None:
    """[start, end, word] from the Short's captions (manual first, else automatic), json3 format."""
    out = all_ / "words" / f"{vid}.json"
    if out.exists():
        return json.loads(out.read_text(encoding="utf-8"))
    tmp = all_ / "subs"
    tmp.mkdir(exist_ok=True)
    # the spoken track only ("en-orig"; asking for every translated track gets YouTube to refuse with 429), else manual English
    for langs, kind in (("en-orig", "--write-auto-subs"), ("en", "--write-subs")):
        subprocess.run([*YTDLP, "--skip-download", kind, "--sub-langs", langs, "--sub-format", "json3", "--sleep-subtitles", "1",
                        "-o", str(tmp / "%(id)s.%(ext)s"), f"https://www.youtube.com/shorts/{vid}"], capture_output=True, timeout=180)
        if list(tmp.glob(f"{vid}*.json3")):
            break
    got = sorted(tmp.glob(f"{vid}*.json3"), key=lambda p: ("orig" not in p.name, p.name))
    ws = []
    if got:
        try:
            ev = json.loads(got[0].read_text(encoding="utf-8")).get("events") or []
            for e in ev:
                t0 = e.get("tStartMs", 0) / 1000
                for s in e.get("segs") or []:
                    w = (s.get("utf8") or "").strip()
                    if w and w != "\n":
                        st = t0 + s.get("tOffsetMs", 0) / 1000
                        ws.append([round(st, 2), None, w])
            for i in range(len(ws)):
                ws[i][1] = round(ws[i + 1][0], 2) if i + 1 < len(ws) else round(ws[i][0] + 0.4, 2)
        except (ValueError, KeyError):
            ws = []
    (all_ / "words").mkdir(exist_ok=True)
    out.write_text(json.dumps(ws), encoding="utf-8")
    return ws


def scripts(all_: Path, rows: list) -> None:
    f = all_ / "scripts.json"
    per = []
    for r in rows:
        w = json.loads((all_ / "words" / f"{r['id']}.json").read_text(encoding="utf-8")) if (all_ / "words" / f"{r['id']}.json").exists() else []
        if len(w) < 8:
            continue
        text = " ".join(x[2] for x in w)
        dur = r.get("dur") or (w[-1][1] or w[-1][0])
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        first3 = " ".join(x[2] for x in w if x[0] < 3.0)
        per.append({"id": r["id"], "views": r["views"], "dur": dur, "words": len(w), "wps": round(len(w) / max(1, dur), 2),
                    "sentences": len(sents), "first_sentence": sents[0][:200] if sents else "", "first_3s": first3[:200],
                    "last_sentence": sents[-1][:200] if sents else "", "title": r["title"],
                    "question_title": r["title"].strip().endswith("?"), "what_if": bool(re.match(r"(?i)what if", r["title"])),
                    "why": bool(re.match(r"(?i)why", r["title"])), "how": bool(re.match(r"(?i)how", r["title"]))})
    per.sort(key=lambda x: -x["views"])
    q = max(1, len(per) // 5)
    top, rest = per[:q], per[q:]
    med = lambda xs, k: round(statistics.median([x[k] for x in xs]), 2) if xs else None
    share = lambda xs, k: round(sum(1 for x in xs if x[k]) / max(1, len(xs)), 2)
    summary = {"videos_with_words": len(per), "views_median": med(per, "views"),
               **{f"{name}_{k}": f(xs, k) for name, xs in (("top20", top), ("rest", rest))
                  for k, f in (("dur", med), ("wps", med), ("words", med), ("sentences", med), ("question_title", share),
                               ("what_if", share), ("why", share), ("how", share))}}
    f.write_text(json.dumps({"summary": summary, "videos": per}, indent=1, ensure_ascii=False), encoding="utf-8")


def download(all_: Path, rows: list, n: int) -> list:
    refs = all_ / "refs"
    refs.mkdir(exist_ok=True)
    top = sorted(rows, key=lambda r: -r["views"])[:n]
    ok = []
    for i, r in enumerate(top, 1):
        out = refs / f"{r['id']}.mp4"
        if not (out.exists() and out.stat().st_size > 50000):
            if i % 10 == 1:
                say(all_, f"Downloading the top Shorts ({i}/{len(top)})")
            subprocess.run([*YTDLP, "--sleep-requests", "1", "-f", "bv*[vcodec^=avc1][height<=1920]+ba[ext=m4a]/bv*[height<=1920]+ba/b",
                            "--merge-output-format", "mp4", "-o", str(out), f"https://www.youtube.com/shorts/{r['id']}"],
                           capture_output=True, timeout=900)
            if out.exists():
                auto.to_fps(out)
        if out.exists() and out.stat().st_size > 50000:
            ok.append(r["id"])
    (all_ / "titles.json").write_text(json.dumps({r["id"]: r["title"] for r in top}, indent=1, ensure_ascii=False), encoding="utf-8")
    return ok


MAP_PROMPT = """These are {n} frames from vertical map-explainer Shorts (each labelled with its video and second). For EACH frame,
describe how the picture is BUILT, so a code engine can draw the same thing. Ignore the burned-in captions at the bottom.
Return ONLY a JSON list, one object per frame in order:
{{"frame": "<label>", "mode": "satellite | dark-vector | flat-colour-map | globe | non-map",
"zoom": "world | continent | country | region | city | street | none",
"camera": "hold | slow-push | zoom-in | zoom-out | pan | fly-between-places | rotate | tilt-3d | none (judge from the frame and its neighbours)",
"highlight": [{{"what": "the region or thing lit up", "colour": "#hex", "style": "solid-fill | glow-edge | outline | extruded-3d | pattern | dim-the-rest"}}],
"overlays": ["route-line", "moving-dot", "pin-photo", "pin-icon", "place-label", "region-label", "number-badge", "icon-sticker", "flag", "arrow",
 "news-clipping", "chart", "character", "title-text", "callout-bubble", "timeline", "compass", "grid", "other: ..."],
"route": {{"colour": "#hex", "width_px": 0, "glow": true, "dashed": false}} or null,
"text": [{{"words": "exact on-screen words (not captions)", "style": "e.g. white heavy sans with drop shadow / black box white caps", "where": "top | middle | on the place"}}],
"focal": "what the eye goes to first", "why": "why this frame looks like this, tied to what the narrator is saying (short)"}}"""


def mapvision(all_: Path, ids: list) -> None:
    """Every 3 s of each ref, six frames to a call, three calls at once."""
    import app  # noqa: E402
    import cv2
    out = all_ / "mapvision"
    out.mkdir(exist_ok=True)
    fr = all_ / "mapframes"
    fr.mkdir(exist_ok=True)

    def one(vid):
        dest = out / f"{vid}.json"
        if dest.exists():
            return
        cap = cv2.VideoCapture(str(all_ / "refs" / f"{vid}.mp4"))
        fps, n = cap.get(cv2.CAP_PROP_FPS) or 30, int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        shots = []
        for t in [x * 3.0 + 0.5 for x in range(int(n / fps / 3.0))]:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ok, im = cap.read()
            if ok:
                p = fr / f"{vid}_{t:05.1f}.jpg"
                cv2.imwrite(str(p), cv2.resize(im, (360, 640)), [cv2.IMWRITE_JPEG_QUALITY, 85])
                shots.append(p)
        cap.release()
        got = []
        for k in range(0, len(shots), 6):
            b = shots[k:k + 6]
            labels = ", ".join(p.stem for p in b)
            try:
                got += app.claude_json(MAP_PROMPT.format(n=len(b)) + f"\nThe frames, in order: {labels}.", images=[str(p) for p in b], want=list)
            except Exception as e:                                        # noqa: BLE001 - a failed batch is skipped, the rest go on
                got.append({"frame": labels, "error": str(e)[:200]})
        dest.write_text(json.dumps(got, indent=1, ensure_ascii=False), encoding="utf-8")

    for i in range(0, len(ids), 3):
        say(all_, f"Reading the maps frame by frame ({i + 1}/{len(ids)})")
        with ThreadPoolExecutor(3) as ex:
            list(ex.map(one, ids[i:i + 3]))
    # the numbers over every frame
    from collections import Counter
    C = {k: Counter() for k in ("mode", "zoom", "camera", "overlays", "hl_style", "hl_colour", "route_colour", "text_style")}
    total = 0
    for f in out.glob("*.json"):
        for x in json.loads(f.read_text(encoding="utf-8")):
            if not isinstance(x, dict) or "error" in x:
                continue
            total += 1
            for k in ("mode", "zoom", "camera"):
                C[k][str(x.get(k))] += 1
            for o in x.get("overlays") or []:
                C["overlays"][str(o).split(":")[0]] += 1
            for h in x.get("highlight") or []:
                if isinstance(h, dict):
                    C["hl_style"][str(h.get("style"))] += 1
                    C["hl_colour"][str(h.get("colour", "")).upper()[:7]] += 1
            if isinstance(x.get("route"), dict):
                C["route_colour"][str(x["route"].get("colour", "")).upper()[:7]] += 1
            for t in x.get("text") or []:
                if isinstance(t, dict):
                    C["text_style"][str(t.get("style"))[:60]] += 1
    agg = {"frames": total, **{k: {a: round(b / max(1, total), 3) for a, b in v.most_common(25)} for k, v in C.items()}}
    (all_ / "mapvision.json").write_text(json.dumps(agg, indent=1, ensure_ascii=False), encoding="utf-8")


DEEP_WRITER = """You are writing the DEEP study of a style for Legion, from a whole channel. Work only in this folder ({study}).
SPEC.md already holds the first study (from 6 references). Now everything below all/ is the WHOLE channel:
all/index.json (every Short: views, length, title), all/scripts.json (the spoken script of every Short with words: numbers for the
top 20 % by views vs the rest, first sentences, endings), all/refs/ (the top Shorts as video), every stylelab measurement next to
them in all/ (measure/, deep*/, scenes/, why/, env/, hooks/, audio_*.json, motion_*.json, camera_curves.json, timeline.md, busy.json),
all/mapvision.json + all/mapvision/<id>.json (what every 3 s of each map Short is built from) and all/mapframes/ (those frames).
1. Read SPEC.md in full. Then read every summary file under all/, and LOOK at frames (all/mapframes/, and ffmpeg stills from
   all/refs/ at the moments the numbers point to). Numbers are the truth; your eye explains them.
2. APPEND new numbered sections to SPEC.md (continue its numbering), titled "Whole channel" and written so a code engine
   can rebuild ANY frame: the script formula from all the scripts (hook first sentence patterns of the winners, words per second,
   length, how it ends, title formulas that win), the camera (zoom levels and their shares, how it flies between places, speeds,
   holds, push-ins, never a dead frame), map modes and when each is used, how a region is highlighted (colours as hex, fill,
   edge glow, extrusion, dimming the rest), routes (colour, width, glow, how they draw on, the moving dot), pins and photos,
   labels and their typography, number badges, icon stickers (what kinds, where they sit, how they pop), news clippings,
   charts, the reacting character, transitions between places, sound, pacing, density, and WHY each choice is made (tied to the words).
   Then a section "Better than the reference": what the channel does weakly (measured: low-res zooms, cluttered frames, repeated
   assets, dead holds, unreadable text...) and exactly how our version beats it while staying in the style.
   Then a section "Map engine needs": every map element above as a precise list a programmer can build (with numbers).
   Never write the channel's name, a real person's name or a video title: call videos ref-1, ref-2, ...
3. Update critic_style.md (people / devices / giveaways lines) if the whole channel changes them.
4. Write `Deep study written (N lines)` to all/progress.txt and reply with one line: done."""


def writer(study: Path, all_: Path) -> None:
    for _ in range(72):                                         # the first study's SPEC.md comes from auto.py; wait up to 6 h
        if (study / "SPEC.md").exists() and (study / "SPEC.md").stat().st_size > 2000:
            break
        say(all_, "Waiting for the first study's SPEC.md…")
        time.sleep(300)
    import shutil
    cmd = [shutil.which("claude") or "claude", "-p", "--output-format", "text", "--permission-mode", "acceptEdits",
           "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash(python:*),Bash(py:*),Bash(ffmpeg:*),Bash(ffprobe:*)"]
    say(all_, "Writing the deep study into SPEC.md…")
    r = subprocess.run(cmd, input=DEEP_WRITER.format(study=study.resolve()), capture_output=True, text=True, encoding="utf-8",
                       timeout=4 * 3600, cwd=study)
    (all_ / "deep_writer_log.txt").write_text((r.stdout or "") + "\n---\n" + (r.stderr or ""), encoding="utf-8")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    slug, channel = sys.argv[1], sys.argv[2]
    deep = int(sys.argv[sys.argv.index("--deep") + 1]) if "--deep" in sys.argv else 120
    study = auto.STYLES / slug
    all_ = study / "all"
    all_.mkdir(parents=True, exist_ok=True)
    rows = index(all_, channel)
    say(all_, f"{len(rows)} Shorts on the channel")
    todo = [r for r in rows if not (all_ / "words" / f"{r['id']}.json").exists()]
    for i, r in enumerate(todo, 1):
        if i % 25 == 1:
            say(all_, f"Reading every script ({len(rows) - len(todo) + i}/{len(rows)})")
        try:
            words_of(all_, r["id"])
        except subprocess.TimeoutExpired:
            pass
    scripts(all_, rows)
    say(all_, "Script numbers written")
    ids = download(all_, rows, deep)
    say(all_, f"{len(ids)} top Shorts downloaded")
    done = auto.measure(all_, log=lambda m: say(all_, m))
    say(all_, "Measured: " + ", ".join(k for k, v in done.items() if v == "ok" and k != "_refs"))
    if "--map" in sys.argv:
        mapvision(all_, ids)
        say(all_, "Map frames read")
    writer(study, all_)
    say(all_, "Done")


if __name__ == "__main__":
    main()
