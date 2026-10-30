"""auto.py — learn a style from reference Shorts by itself: the whole stylelab study, then a writer that turns the numbers
into the style's SPEC.md (read in full every time the style is used), the critic's reference stills, and the engine.

    python stylelab/auto.py <style-slug> <youtube id or link or .mp4> ...      (Legion runs this after "Train a style")

The study lives in output/short_styles/<slug>/ (refs/, measurements, SPEC.md, ref_stills/); the style card is
output/short_styles/<slug>.json, which gets "engine", "spec" and "deep" when the study is done. Free: yt-dlp, ffmpeg,
and the creator's own Claude Code plan."""
import json, os, re, shutil, subprocess, sys, time
from pathlib import Path

LAB = Path(__file__).parent
LEGION = LAB.parent
STYLES = LEGION / "output" / "short_styles"
# the study tools in the order their inputs need, each with a time limit (seconds) for a 6-reference study; the limits grow
# with the number of references. measure/ -> deep2/dissolves.json -> timeline, why/data.json -> why/labels.json ->
# scenes/shots.json + sheets -> hooks, vision
TOOLS = [("measure_all.py", 1800), ("deep_measure.py", 2400), ("dissolve_check.py", 900), ("timeline.py", 600),
         ("script_stats.py", 300), ("audio_study.py", 1200), ("sfx_study.py", 900), ("motion_study.py", 2400),
         ("camera_curves.py", 600), ("env_measure.py", 1200), ("why_measure.py", 900), ("why_label.py", 900),
         ("scene_measure.py", 1200), ("busy.py", 600), ("dof_ratio.py", 600), ("hook_study.py", 900),
         ("scene_vision.py", 1800), ("kit_vision.py", 1200), ("camera_light_vision.py", 1800),
         ("pop_measure.py", 1200), ("idle_measure.py", 1800), ("transition_vision.py", 1800), ("construction_vision.py", 2400)]
# the files a tool reads that another tool writes: when one is missing the tool is skipped with the reason (instead of running
# into a slow failure), and it runs in the second pass once its input exists
NEEDS = {"dissolve_check.py": ["deep2"], "timeline.py": ["deep2/dissolves.json"], "why_measure.py": ["deep2/dissolves.json", "measure/summary.json"],
         "why_label.py": ["why/data.json"], "scene_measure.py": ["why/data.json"],
         "hook_study.py": ["scenes/shots.json", "why/data.json", "measure/summary.json"], "scene_vision.py": ["scenes/shots.json"],
         "camera_light_vision.py": ["scenes/shots.json"], "pop_measure.py": ["scenes/shots.json"], "idle_measure.py": ["scenes/shots.json"],
         "construction_vision.py": ["scenes/shots.json"], "kit_vision.py": ["scenes/shots.json"]}
# tools that only make sense for drawn or built worlds (sets, construction, flat shapes): skipped when the references are filmed
DRAWN_ONLY = {"kit_vision.py", "construction_vision.py", "density_measure.py", "rows_measure.py"}
FPS = 30   # every study tool counts frames at 30 a second; references at any other rate are converted first


def to_fps(p: Path, log=print) -> None:
    """Re-time a reference to 30 fps in place (60 fps channels would otherwise measure twice as long and half as fast)."""
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate",
                            "-of", "csv=p=0", str(p)], capture_output=True, text=True, timeout=60).stdout.strip()
        a, _, b = r.partition("/")
        fps = float(a) / float(b or 1)
    except (ValueError, ZeroDivisionError, subprocess.SubprocessError):
        return
    if abs(fps - FPS) < 0.5:
        return
    log(f"Re-timing {p.stem} from {fps:.0f} to {FPS} fps…")
    tmp = p.with_suffix(".30.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(p), "-vf", f"fps={FPS}", "-c:v", "libx264", "-crf", "14", "-preset", "fast",
                    "-c:a", "copy", str(tmp)], capture_output=True, timeout=900)
    if tmp.exists() and tmp.stat().st_size > 50000:
        tmp.replace(p)


def fetch(refs: list, dest: Path, log=print) -> list:
    """Reference Shorts into dest/refs/<id>.mp4 (links via yt-dlp, files copied). Returns the ids."""
    (dest / "refs").mkdir(parents=True, exist_ok=True)
    ids, titles, chans = [], {}, {}
    for r in refs:
        p = Path(r)
        if p.suffix.lower() in (".mp4", ".mov", ".webm", ".mkv") and p.exists():
            vid = re.sub(r"[^\w-]", "_", p.stem)[:20]
            shutil.copy(p, dest / "refs" / f"{vid}.mp4"); to_fps(dest / "refs" / f"{vid}.mp4", log); ids.append(vid); continue
        m = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", r) or re.fullmatch(r"([\w-]{11})", r.strip())
        if not m:
            continue
        vid = m.group(1)
        out = dest / "refs" / f"{vid}.mp4"
        if not out.exists():
            log(f"Downloading reference {len(ids) + 1}…")
            subprocess.run([sys.executable, "-m", "yt_dlp", "-q", "--no-warnings", "-f", "bv*[ext=mp4][height<=1920]+ba[ext=m4a]/b[ext=mp4]/b",
                            "--merge-output-format", "mp4", "-o", str(out), f"https://www.youtube.com/shorts/{vid}"],
                           capture_output=True, timeout=600)
        if out.exists() and out.stat().st_size > 50000:
            to_fps(out, log)
            ids.append(vid)
            try:
                t = subprocess.run([sys.executable, "-m", "yt_dlp", "--skip-download", "--print", "%(title)s\t%(channel)s", f"https://www.youtube.com/shorts/{vid}"],
                                   capture_output=True, text=True, timeout=60).stdout.strip()
                title, _, chan = t.partition("\t")
                if title:
                    titles[vid] = title
                if chan and chan != "NA":
                    chans[vid] = chan        # only for the writer check: no channel name may end up in the style
            except subprocess.TimeoutExpired:
                pass
    if titles:
        (dest / "titles.json").write_text(json.dumps(titles, indent=1), encoding="utf-8")
    if chans:
        (dest / "channels.json").write_text(json.dumps(chans, indent=1), encoding="utf-8")
    return ids


def family(study: Path) -> str:
    """'filmed' when the style card describes footage or photo-real pictures, else 'drawn' (flat, cartoon, built in code or by
    hand). Read from the card's own words: pixel tests cannot tell dark archive footage from flat art. Unknown = 'drawn', which
    runs every tool (the safe side: skipping only saves time)."""
    slug = study.parent.name if study.name == "all" else study.name
    try:
        card = json.loads((STYLES / f"{slug}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return "drawn"
    words = " ".join(str(card.get(k, "")) for k in ("look", "scenes", "character", "kind", "engine")).lower()
    if card.get("engine") in ("toon", "flat", "kinetic"):
        return "drawn"
    filmed = ("footage", "live-action", "live action", "photoreal", "photo-real", "photograph", "real people", "filmed", "documentary footage", "archival")
    return "filmed" if any(w in words for w in filmed) else "drawn"


def _sample_frames(study: Path, every: float = 2.0, most: int = 30) -> Path:
    """Stills every `every` seconds of each reference (at most `most` each) for the per-frame tools: study/frames_s/."""
    out = study / "frames_s"
    if out.exists() and any(out.iterdir()):
        return out
    out.mkdir(exist_ok=True)
    for p in sorted((study / "refs").glob("*.mp4")):
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", f"fps=1/{every},scale=540:960", "-frames:v", str(most),
                        str(out / f"{p.stem}_%03d.jpg")], capture_output=True, timeout=600)
    return out


def _extra(study: Path, fam: str) -> list:
    """The tools that take arguments: (name, limit, argv function); the argv is built when the tool runs."""
    ex = []
    if fam == "drawn":
        ex += [("density_measure.py", 1200, lambda: ["deep4/density.json", str(_sample_frames(study))]),
               ("rows_measure.py", 1200, lambda: ["deep4/rows.json", str(_sample_frames(study))])]

    def layers():
        pairs = [(str(p), str(study / "measure" / f"{p.stem}.words.json")) for p in sorted((study / "refs").glob("*.mp4"))
                 if (study / "measure" / f"{p.stem}.words.json").exists()][:4]
        return ["deep4/motion_layers.json", *[x for pr in pairs for x in pr]] if pairs else None
    ex.append(("motion_layers.py", 2400, layers))
    return ex


def measure(study: Path, log=print) -> dict:
    """Run every study tool on the study folder. Returns {tool: "ok" | "failed: ..." | "skipped: ..."}. A tool that already
    passed in an earlier run of this study (study_run.json) is not run again, so a study that stopped halfway resumes.
    Smarter than one pass in a fixed order: limits grow with the number of references; a tool whose input is missing waits
    (skipped with the reason) instead of failing slowly; filmed references skip the drawn-world tools; every tool that failed
    gets one more try with more time at the end (a brain that was busy, a slow disk); STUDY_REPORT.md tells the writer what
    was measured and what was not, so nothing is guessed."""
    env = {**os.environ, "STYLELAB": str(study.resolve()), "PYTHONIOENCODING": "utf-8"}
    try:
        done = json.loads((study / "study_run.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        done = {}
    refs = sorted(p.stem for p in (study / "refs").glob("*.mp4"))
    if done.get("_refs") != refs:                    # other references than last time: measure everything again
        done = {"_refs": refs}
    scale = min(25.0, max(1.0, len(refs) / 6))
    fam = done.get("_family") or family(study)
    done["_family"] = fam
    (study / "deep4").mkdir(exist_ok=True)
    plan = [(t, lim, None) for t, lim in TOOLS] + _extra(study, fam)

    def save():
        (study / "study_run.json").write_text(json.dumps(done, indent=1), encoding="utf-8")

    def run(tool, limit, argv, k, n, more=1.0):
        if fam == "filmed" and tool in DRAWN_ONLY:
            done[tool] = "skipped: the references are filmed, this tool reads drawn worlds"
            return
        miss = [f for f in NEEDS.get(tool, []) if not (study / f).exists()]
        if miss:
            done[tool] = "skipped: needs " + ", ".join(miss)
            return
        args = argv() if argv else []
        if args is None:
            done[tool] = "skipped: needs measure/<id>.words.json (from measure all)"
            return
        log(f"Studying the references ({k}/{n}): {tool[:-3].replace('_', ' ')}")
        try:
            r = subprocess.run([sys.executable, str(LAB / tool), *args], cwd=study, env=env, capture_output=True,
                               text=True, encoding="utf-8", errors="replace", timeout=int(limit * scale * more))
            done[tool] = "ok" if r.returncode == 0 else "failed: " + (r.stderr or r.stdout)[-300:]
        except subprocess.TimeoutExpired:
            done[tool] = "failed: took too long"
        if done[tool] != "ok":
            log(f"  {tool[:-3].replace('_', ' ')} failed: {done[tool][-160:]}")

    for k, (tool, limit, argv) in enumerate(plan, 1):
        if done.get(tool) == "ok":
            continue
        run(tool, limit, argv, k, len(plan))
        save()
    # second pass, in the same order: every failure gets one more try with half again the time, and a tool that waited for an
    # input runs now if that input appeared
    again = [(t, lim, a) for t, lim, a in plan if done.get(t, "").startswith("failed")
             or (done.get(t, "").startswith("skipped: needs") and all((study / f).exists() for f in NEEDS.get(t, ["measure/summary.json"])))]
    for k, (tool, limit, argv) in enumerate(again, 1):
        log(f"Second try ({k}/{len(again)}): {tool[:-3].replace('_', ' ')}")
        run(tool, limit, argv, k, len(again), more=1.5)
        save()
    report(study, done)
    return done


WHAT = {"measure_all.py": "words, word timings, motion per frame, cuts, palette, audio hits (script formula, pacing, look)",
        "deep_measure.py": "camera moves, faces, caption boxes, light per frame (camera, composition, captions)",
        "dissolve_check.py": "dissolves vs cuts (pacing, transitions)", "timeline.py": "a half-second timeline per video",
        "script_stats.py": "sentence lengths and structure (script formula)", "audio_study.py": "music bed and voice levels (sound)",
        "sfx_study.py": "sound effects per second and what they sit on (sound)", "motion_study.py": "speed curves, easing, overshoot (motion)",
        "camera_curves.py": "camera speed profiles (camera)", "env_measure.py": "places, light and environment (sets, look)",
        "why_measure.py": "light, colour and motion per sentence (WHY)", "why_label.py": "story role and emotion per sentence (WHY)",
        "scene_measure.py": "shots, shot sizes, density, contact sheets (composition, pacing)", "busy.py": "how busy a frame is (look)",
        "dof_ratio.py": "depth of field (composition)", "hook_study.py": "the first 4 seconds of every video (hook)",
        "scene_vision.py": "what every shot is made of (sets, props, assets)", "kit_vision.py": "built sets vs kits, how nature is painted (sets)",
        "camera_light_vision.py": "lens, layering, lighting, character construction (camera, look, characters)",
        "pop_measure.py": "how things enter a held shot (motion)", "idle_measure.py": "what keeps moving in a hold (motion, life)",
        "transition_vision.py": "every transition named frame by frame (transitions)", "construction_vision.py": "how each recurring element is built (characters, props)",
        "density_measure.py": "shapes, small details, empty areas per frame (illustration density)",
        "rows_measure.py": "how repeated things shrink and fade with depth (depth, placement)",
        "motion_layers.py": "how many things move at once and at what speeds, hits on words (motion layering, timing)"}


def report(study: Path, done: dict) -> None:
    """STUDY_REPORT.md for the writer: what was measured, what was not and what that means for SPEC.md."""
    ok = [t for t in WHAT if done.get(t) == "ok"]
    bad = [t for t in WHAT if t in done and done.get(t) != "ok"]
    filmed = done.get("_family") == "filmed"
    lines = ["# Study report", f"References: {len(done.get('_refs', []))}. They look {done.get('_family', 'drawn')} "
             f"({'footage or photo-real: the drawn-world tools were skipped' if filmed else 'drawn or built: every tool applies'}).", "",
             "## Measured (use these numbers)"] + [f"- {t[:-3]}: {WHAT[t]}" for t in ok]
    lines += ["", "## NOT measured (do not invent these numbers)"]
    lines += [f"- {t[:-3]}: {WHAT[t]}. Reason: {done[t][:160]}" for t in bad] or ["- nothing: every tool ran"]
    lines += ["", "For every section that depends on a tool above that did not run, measure it yourself from real frames "
              "(ffmpeg stills, frame differences) or write 'not measured' with what to look for. Never fill it with a guess."]
    (study / "STUDY_REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def _writer_cmd(model: str):
    example = LEGION / "toonkit" / "styles" / "toon" / "SPEC.md"
    tools = "Read,Write,Edit,Glob,Grep,Bash(python:*),Bash(py:*),Bash(ffmpeg:*),Bash(ffprobe:*)"
    cmd = [shutil.which("claude") or "claude", "-p", "--output-format", "text", "--permission-mode", "acceptEdits",
           "--allowedTools", tools, "--add-dir", str(example.parent.resolve())]
    return (cmd + ["--model", model] if model else cmd), example


def write(study: Path, slug: str, log=print, model: str = "", timeout: int = 5400) -> dict:
    """The writer: a Claude Code session that turns the study into SPEC.md, ref_stills/ and style_update.json; then Legion's own
    check of that work (verify) and, when it finds problems, one more writer round that fixes exactly those."""
    shutil.copy(LAB / "STYLE_WRITER.md", study / "STYLE_WRITER.md")
    cmd, example = _writer_cmd(model)
    prompt = (f"Follow STYLE_WRITER.md in this folder exactly. The style is called '{slug}'. The format example is {example.resolve()} "
              "(read its first 400 lines and its section headings only, for the format; never copy its content). Read STUDY_REPORT.md "
              "first: it says what was measured and what was not. Work only in this "
              "folder. When SPEC.md, ref_stills/ and style_update.json exist, reply with one line: done.")
    log("Writing the style's full study (SPEC.md)…")
    try:
        r = subprocess.run(cmd, input=prompt, capture_output=True, text=True, encoding="utf-8", timeout=timeout, cwd=study)
        (study / "writer_log.txt").write_text((r.stdout or "") + "\n---\n" + (r.stderr or ""), encoding="utf-8")
    except subprocess.TimeoutExpired:
        (study / "writer_log.txt").write_text("timed out", encoding="utf-8")
    problems = verify(study)
    if problems:
        log(f"Checking the study: {len(problems)} thing(s) to fix, one more writing round…")
        (study / "WRITER_FIX.md").write_text("# Fix these (found by Legion's check of your work)\n" + "\n".join(f"- {p}" for p in problems) + "\n",
                                             encoding="utf-8")
        fix = ("Read WRITER_FIX.md in this folder: Legion checked your SPEC.md, ref_stills/, critic_style.md and style_update.json "
               "against STYLE_WRITER.md and found the problems listed there. Fix every one of them (re-read STYLE_WRITER.md and "
               "STUDY_REPORT.md where a problem points to them), change nothing else, and reply with one line: done.")
        try:
            r = subprocess.run(cmd, input=fix, capture_output=True, text=True, encoding="utf-8", timeout=timeout // 2, cwd=study)
            with (study / "writer_log.txt").open("a", encoding="utf-8") as f:
                f.write("\n=== fix round ===\n" + (r.stdout or "") + "\n---\n" + (r.stderr or ""))
        except subprocess.TimeoutExpired:
            pass
        left = verify(study)
        (study / "WRITER_FIX.md").write_text(("# Still open after the fix round\n" + "\n".join(f"- {p}" for p in left) + "\n") if left else "# All fixed\n",
                                             encoding="utf-8")
        if left:
            log(f"  {len(left)} thing(s) still open (listed in WRITER_FIX.md); the style works meanwhile")
    try:
        return json.loads((study / "style_update.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def verify(study: Path) -> list:
    """Legion's own check of the writer's work, in plain words: the parts STYLE_WRITER.md asks for, measured numbers in every
    section, no real names or video titles, the critic's stills at the right size, a style card Legion can use."""
    import cv2
    P = []
    spec = study / "SPEC.md"
    text = spec.read_text(encoding="utf-8") if spec.exists() else ""
    lines = text.splitlines()
    if len(lines) < 250:
        P.append(f"SPEC.md has {len(lines)} lines; a full study is several hundred: every one of the 15 sections with measured numbers")
    heads = [ln for ln in lines if ln.startswith("#")]
    nums = {int(m.group(1)) for ln in heads for m in [re.match(r"#+\s*(?:section\s*)?(\d+)\b", ln, re.I)] if m}
    missing = [n for n in range(1, 16) if n not in nums]
    if text and missing:
        P.append("SPEC.md is missing numbered sections " + ", ".join(map(str, missing)) + " (STYLE_WRITER.md section 2 lists all 15)")
    if text and "rebuild first" not in text.lower():
        P.append('SPEC.md does not end with the "Rebuild first" list (STYLE_WRITER.md section 3)')
    sec, body, thin = None, "", []
    for ln in lines + ["# end"]:                     # every top section carries measured numbers
        if re.match(r"#{1,2}\s", ln):
            name = sec.strip("# ").strip() if sec else ""
            words_only = any(w in name.lower() for w in ("keep", "don't", "dont", "what the style is", "rebuild", "never"))
            if sec and not words_only and len(body) > 200 and sum(c.isdigit() for c in body) < 6:
                thin.append(name[:50])     # a long rule section without a single measured number
            sec, body = ln, ""
        elif sec:
            body += ln
    if thin:
        P.append("sections with almost no measured numbers: " + "; ".join(thin[:8]) + " (give each rule its number, or 'not measured' with the reason)")
    names = set()                                    # no real names: the video titles and the channels the references came from
    for f in ("titles.json", "channels.json"):
        try:
            for v in json.loads((study / f).read_text(encoding="utf-8")).values():
                if isinstance(v, str) and len(v.strip()) > 3:
                    names.add(v.strip())
        except (OSError, ValueError, AttributeError):
            pass
    bodies = [("SPEC.md", text)] + [(x, (study / x).read_text(encoding="utf-8")) for x in ("critic_style.md", "style_update.json") if (study / x).exists()]
    for nm in sorted(names):
        for where, body in bodies:
            if nm.lower() in body.lower():
                P.append(f"{where} contains a real name or video title ('{nm[:40]}'): call references ref-A, ref-B, ...")
    rs = study / "ref_stills"
    for w in ["medium_00", "insert_00", "group_00", "gag_00"] + [f"board_{i:02d}" for i in range(1, 9)] + ["control_01", "control_02"]:
        f = rs / f"{w}.png"
        if not f.exists():
            P.append(f"ref_stills/{w}.png is missing (STYLE_WRITER.md section 3)")
            continue
        im = cv2.imread(str(f))
        if im is None or im.shape[:2] != (1920, 1080):
            P.append(f"ref_stills/{w}.png is {'unreadable' if im is None else f'{im.shape[1]}x{im.shape[0]}'}; it must be 1080x1920")
    cs = study / "critic_style.md"
    got = cs.read_text(encoding="utf-8").lower() if cs.exists() else ""
    for k in ("people:", "devices:", "giveaways:"):
        if k not in got:
            P.append(f"critic_style.md has no '{k}' line (STYLE_WRITER.md section 3)")
    try:
        upd = json.loads((study / "style_update.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        upd = None
        P.append("style_update.json is missing or not valid JSON")
    if isinstance(upd, dict):
        if upd.get("engine") not in ("toon", "flat", "kinetic", "scenes"):
            P.append(f"style_update.json engine is '{upd.get('engine')}': it must be toon, flat, kinetic or scenes")
        for k in ("look", "scenes", "text", "hook", "hook_examples", "script_rules", "pacing", "voice", "dont", "transition", "kind"):
            if not upd.get(k):
                P.append(f"style_update.json has no '{k}'")
        if upd.get("engine") in ("flat", "toon") and not isinstance(upd.get("motion"), dict):
            P.append("style_update.json has no 'motion' ({cam, trans}) for its code engine (STYLE_WRITER.md section 4)")
        try:
            firsts = {s["text"].strip().lower() for v in json.loads((study / "why" / "data.json").read_text(encoding="utf-8")).values()
                      for s in v.get("sentences", [])[:1]}
        except (OSError, ValueError, KeyError, AttributeError, TypeError):
            firsts = set()
        for h in upd.get("hook_examples") or []:
            if isinstance(h, str) and h.strip().lower() in firsts:
                P.append(f"hook_examples holds a reference's real first line ('{h[:40]}'): write it as a pattern with blanks")
    return list(dict.fromkeys(P))


def learn(slug: str, refs: list, log=print, model: str = "") -> dict:
    """The whole thing. Returns the updated style card (or raises with a plain reason)."""
    study = STYLES / slug
    ids = fetch(refs, study, log)
    if len(ids) < 2:
        raise RuntimeError("Legion needs at least 2 reference Shorts it can download to study a style.")
    measure(study, log)
    upd = write(study, slug, log, model)
    if not (study / "SPEC.md").exists() or (study / "SPEC.md").stat().st_size < 2000:
        raise RuntimeError(f"The style writer didn't finish; its notes are in {study / 'writer_log.txt'}.")
    card_f = STYLES / f"{slug}.json"
    try:
        card = json.loads(card_f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        card = {"name": slug, "created": time.time()}
    keep = {k: v for k, v in upd.items() if k in ("engine", "look", "character", "scenes", "text", "hook", "hook_examples",
                                                   "script_rules", "pacing", "voice", "dont", "transition", "kind", "motion")}
    if keep.get("engine") not in ("toon", "flat", "kinetic", "scenes"):
        keep["engine"] = "scenes"
    card.update(keep)
    card.update(spec="SPEC.md", deep=True, deep_done=time.strftime("%Y-%m-%d"), studied=ids)
    card_f.write_text(json.dumps(card, indent=1), encoding="utf-8")
    lines = sum(1 for _ in (study / "SPEC.md").open(encoding="utf-8"))
    log(f"Learned: {lines} lines of study, engine {card['engine']}")
    return card


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    print(json.dumps(learn(sys.argv[1], sys.argv[2:]), indent=1)[:2000])
