"""Flat engine: a strict critic that didn't build this: our stills under a row of the style's own frames, scored out of 10.
It runs as its own Claude Code call (fresh eyes, not the builder). Reads images only.
The bar is a BOARD of the style's own frames (ref_stills/board_*.png: real frames of many kinds of shot) plus the stills of
Shorts this creator gave a thumbs up (the other ref_stills). The score is CALIBRATED with hidden controls: two real frames of
the style (ref_stills/control_*.png, never on the board) are shuffled in among ours, the critic scores every frame, and our score
is 9 x (ours / the real frames), capped by a blind test: the critic must name which frames are the genuine ones, and every
real frame it picks out caps the score (both found = a fan spots ours: at most 6.5; one = 8; none = it can't tell). (Checked: the old pair-by-pair critic gave the style's own frames
5/10 and a plain calibrated prompt still 6/10, so without the control nothing could ever pass.)
TASTE.md (when present) holds the creator's own rules from their ratings.
usage: python critic.py out.json s_a.png s_b.png s_c.png s_d.png   (four of ours: a medium shot, an insert, a group, a gag)"""
import json, os, pathlib, random, re, shutil, subprocess, sys
import cv2
import numpy as np

HERE = pathlib.Path(__file__).parent


def board():
    rs = HERE / "ref_stills"
    refs = sorted(rs.glob("board_*.png"))
    liked = sorted(p for p in rs.glob("*.png") if not p.name.startswith(("board_", "control_")))
    return (refs + liked[-2:])[:10] if refs else liked[-4:]


PROMPT = """You are a strict director at the studio whose style this is. You did NOT build any of this.
The image {img} has two rows. TOP ROW: real frames from the style's own Shorts (the bar). BOTTOM ROW: {n} frames, numbered 1 to
{n} from left to right, from new Shorts meant to be in the same style, each with its own subject, characters and words (judge the
CRAFT, never the content). Captions are burned in later, so a missing caption band is never a mismatch. Score EACH bottom frame on how close it comes to passing as a frame from those Shorts:
10 = indistinguishable from the top row; 8-9 = a fan would accept it as theirs; 6-7 = clearly inspired, but a fan spots it;
4-5 = a different craft; below 4 = off-style.
Then list the mismatches, most important first, each tied to its frame number: the element, what the top row does, what that frame
does, why it matters to the viewer, and the exact fix a motion designer can make in code. Cover: shapes and silhouettes, shading,
depth and glow, characters (head shape, eyes and lids, brows, nose, hair, hands, proportions), framing and scale, the single focal
point, text pieces (labels are small nouns or data in title case; the title is one designed lockup), colour and contrast,
composition, and anything broken (cut-off text or faces, overlaps, an empty area, the caption band blocked).
Count as SERIOUS anything that gives away a generic AI-made explainer instead of that studio: a cute mascot with gloves and
sneakers carrying the whole Short, sticker or meme text ("WHAT HAPPENS NEXT?", "X WINS", one-word caps boxes, signs), gag props
added for jokes, characters crammed against the bottom edge, two heroes fighting for the frame, stiff symmetric poses, a person
or a hand standing over the hero or over a device (the top row keeps them readable), a BALD frame (one hero on an empty
gradient where the top row would show a full place with rows, plants, texture and far planes), "generic AI flat" people (tall
5-head bodies, box torsos, stiff arms-down standing, a nose and an open smile on every face, white eyes on small full-body figures:
{people}).
Also SERIOUS: anything FLOATING (furniture, a bed, a person or an animal hanging above the floor line instead of standing on
it with a shadow), a sleeper drawn as a standing figure on top of a bed, an arm that splits or breaks at the shoulder or
elbow, an animal standing still where the scene says it runs or works (a rat on a turning wheel){extra}.
And judge the WHY: in the top row every move has a reason in the words (it acts the word, stresses the key word or number,
shows the mechanism, changes the idea, or just keeps a held picture alive), one thing moves while text is read, and a new idea
gets a new set or colour; flag movement with no reason, the whole frame moving at once, and one set or colour reused for two ideas.
The style's OWN devices are never tells: {devices}{taste}
Exactly {k} of the bottom frames ARE genuine frames from those Shorts, hidden among the new ones. Name the {k} you believe are
genuine ("genuine_guess"), judging the craft alone.
Return ONLY JSON: {{"genuine_guess": [n, ...], "frame_scores": [n, ...], "mismatches": [{{"frame": n, "element": "", "reference": "", "ours": "", "why": "", "fix": ""}}],
"top5_fixes": [{{"frame": n, "fix": ""}}], "ai_tells": [{{"frame": n, "tell": ""}}]}}"""


# what is particular to the style (its people, its own devices). The first style on this engine has its notes here; any other
# studied style brings its own in output/short_styles/<slug>/critic_style.md (the style writer makes it), with lines
# "people: ...", "devices: ...", "giveaways: ...". Without one, the top row alone sets the bar.
FIRST = {"people": "the top row's people are ~4 heads tall, round-headed, dot-eyed, mostly without nose or mouth, side two-toned, and ACT",
         "devices": "the yellow heavy-caps name label on a zoom bubble's rim, the indigo hexagon caveat plate with a sentence on it, spark "
                    "dashes round a hero that just landed, a lone glossy object on a bare gradient sky, two dancers sharing a club scene, a "
                    "bust close-up filling the width, eyes squeezed shut as purple capsules, white eyes with a big iris and no pupil.",
         "giveaways": "a rodent with a round bear face (the style's mice and rats have a long snout, a pink nose ball and big round pink ears)"}
GENERIC = {"people": "judge the people against the top row's: their proportions in heads, head shape, eyes, nose and mouth, shading, and how they act",
           "devices": "anything the top row itself does (its labels, plates, bubbles, faces and effects) is never a tell.", "giveaways": ""}


def style_notes():
    try:
        slug = json.loads((HERE / "job.json").read_text(encoding="utf-8")).get("style", "")[2:]
    except (OSError, ValueError):
        slug = ""
    if slug in ("", "cosmic-explainer"):
        return FIRST
    for up in HERE.parents:
        f = up / "output" / "short_styles" / slug / "critic_style.md"
        if f.exists():
            got = dict(GENERIC)
            for ln in f.read_text(encoding="utf-8").splitlines():
                k, _, v = ln.partition(":")
                if k.strip().lower() in got and v.strip():
                    got[k.strip().lower()] = v.strip()[:900]
            return got
    return GENERIC


def sheet(frames, dest):
    refs = [cv2.imread(str(p)) for p in board()]
    tw = 2160 // max(1, len(refs))
    top = np.hstack([cv2.resize(r, (tw, int(tw * 16 / 9))) for r in refs])
    bw = 2160 // len(frames)
    bot = np.hstack([cv2.resize(cv2.imread(str(f)), (bw, int(bw * 16 / 9))) for f in frames])
    wd = max(top.shape[1], bot.shape[1])
    pad = lambda a: cv2.copyMakeBorder(a, 0, 0, 0, wd - a.shape[1], cv2.BORDER_CONSTANT, value=(255, 255, 255))
    cv2.imwrite(str(dest), np.vstack([pad(top), np.full((16, wd, 3), 255, np.uint8), pad(bot)]), [cv2.IMWRITE_JPEG_QUALITY, 92])


def main():
    out, ours = pathlib.Path(sys.argv[1]), [pathlib.Path(x) for x in sys.argv[2:6]]
    controls = sorted((HERE / "ref_stills").glob("control_*.png"))
    rnd = random.Random(out.stem + "".join(p.name for p in ours))
    ctrl = rnd.sample(controls, min(2, len(controls)))
    frames = ours + ctrl
    order = list(range(len(frames))); rnd.shuffle(order)
    shown = [frames[i] for i in order]
    img = (HERE / f"pairs_{out.stem}.jpg").resolve()
    sheet(shown, img)
    t = HERE / "TASTE.md"
    taste = ("\nThe creator's own taste, learned from Shorts they rated (count every breach as a serious mismatch):\n"
             + t.read_text(encoding="utf-8")[:3000]) if t.exists() else ""
    notes = style_notes()
    cmd = [shutil.which("claude") or "claude", "-p", "--output-format", "text", "--allowedTools", "Read"]
    env = {**os.environ, "MAX_THINKING_TOKENS": "0"}
    r = subprocess.run(cmd, input=PROMPT.format(img=img, taste=taste, n=len(shown), k=len(ctrl), people=notes["people"], devices=notes["devices"],
                                         extra=(", " + notes["giveaways"]) if notes["giveaways"] else "") + f"\n\nUse the Read tool on {img}.",
                       capture_output=True, text=True, encoding="utf-8", timeout=600, cwd=HERE, env=env)
    txt = r.stdout or ""
    m = re.search(r"\{.*\}", txt, re.S)
    try:
        got = json.loads(m.group(0)) if m else {"error": txt[:300] or r.stderr[:300]}
    except ValueError:
        got = {"error": txt[:300]}
    sc = [float(x) for x in got.get("frame_scores") or [] if isinstance(x, (int, float))]
    cpos = [order.index(i) + 1 for i in range(len(ours), len(frames))]   # the controls' numbers in the row (1-based)
    if len(sc) == len(shown):
        mine = [s for k, s in enumerate(sc, 1) if k not in cpos]
        raw, real = sum(mine) / len(mine), (sum(sc[k - 1] for k in cpos) / len(cpos) if cpos else 0)
        got["raw_ours"], got["control_real_frame"] = round(raw, 1), (round(real, 1) if cpos else None)
        score = min(10.0, max(0.0, 9 * raw / real)) if real else raw
        guess = {int(x) for x in got.get("genuine_guess") or [] if isinstance(x, (int, float))}
        got["real_frames_spotted"] = f"{len(guess & set(cpos))} of {len(cpos)}"
        if len(cpos) == 2:                                          # the blind test: can it tell ours from the real ones?
            score = min(score, (9.5, 8.0, 6.5)[len(guess & set(cpos))])
        got["score_out_of_10"] = round(score, 1)
    keep = lambda lst: [x for x in (lst or []) if not (isinstance(x, dict) and x.get("frame") in cpos)]
    for k in ("mismatches", "top5_fixes", "ai_tells"):              # notes about the hidden real frame are not ours to fix
        got[k] = keep(got.get(k))
    got["stills"] = [str(p) for p in ours]    # which of our stills were judged (a thumbs up keeps them as the new look)
    out.write_text(json.dumps(got, indent=1, ensure_ascii=False), encoding="utf-8")
    fixes = " / ".join((x.get("fix") if isinstance(x, dict) else str(x)) for x in got.get("top5_fixes") or [])
    line = (f"score {got.get('score_out_of_10')} (ours {got.get('raw_ours')} vs the real frames {got.get('control_real_frame')}, "
            f"real frames spotted {got.get('real_frames_spotted')}) | {fixes[:900]}")
    sys.stdout.buffer.write((line + "\n").encode("utf-8", "replace"))


if __name__ == "__main__":
    main()
