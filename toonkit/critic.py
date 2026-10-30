"""A harsh critic that didn't build this: our stills next to this style's approved look, in pairs, scored out of 10.
It runs as its own Claude Code call (fresh eyes, not the builder). Reads images only.
The approved look per kind of shot (medium, insert, group, gag) is the newest of: the style's own reference stills and the
stills of Shorts this creator gave a thumbs up. TASTE.md (when present) holds the creator's own rules from their ratings.
Every panel is labelled (REFERENCE = the look only, OURS = what is judged) so the critic never mistakes one for the other,
and each of ours carries the words spoken at that moment, so it can check the picture shows what the voice says.
usage: python critic.py out.json s_a.png s_b.png s_c.png s_d.png   (four of ours: a medium shot, an insert, a group, a gag)"""
import json, os, pathlib, re, shutil, subprocess, sys
import cv2
import numpy as np

HERE = pathlib.Path(__file__).parent
SLOTS = ("medium", "insert", "group", "gag")
PW, PH = 405, 720


def ref_for(i):
    pool = sorted((HERE / "ref_stills").glob(f"{SLOTS[i % 4]}_*.png")) or sorted((HERE / "ref_stills").glob("*.png"))
    return pool[-1]                               # names sort by date: the creator's newest approved still wins


def said_at(still: pathlib.Path) -> str:
    """The words spoken around a still (its time is in the name: s_12.34.png), from this Short's words.json."""
    m = re.search(r"(\d+(?:\.\d+)?)\.png$", still.name)
    try:
        words = json.loads((HERE / "words.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ""
    if not m:
        return ""
    t = float(m.group(1))
    return " ".join(str(w[2]) for w in words if t - 1.6 <= float(w[0]) <= t + 0.8).strip()


PROMPT = """You are a harsh animation director. You did NOT build any of this. Default: reject.
The image {img} has four PAIRS of vertical panels, left to right. Every panel has a label bar on top:
- "REFERENCE n": an approved Short of this style. It shows the LOOK only: how characters, faces, outlines, light,
  shadows, depth, colour and framing are done. Its place, props, signs, text and story belong to ANOTHER Short.
- "OURS n": the new Short being judged. It has its own story, world, characters, props and signs, and is meant to.
Rules you never break:
- Describe and judge only what is inside the OURS panels. Never report something from a REFERENCE panel as ours.
- Never ask ours to copy the reference's location, set, props, signs, menus, stamps, text or story. A meadow stays a
  meadow, a classroom stays a classroom. Judge how well OUR world is made, in the reference's craft.
Part 1, craft (OURS n against REFERENCE n): characters and faces (large enough, facing us, expressions readable),
outline weight, hands and props, camera and framing, foreground, light and shadows, set dressing and depth for OUR
place, colour, depth of field, and anything broken (camera inside an object, mirrored or clipped text, something
blocking the subject, a face turned away, an empty or unfinished area).
Part 2, story: under each OURS panel are the words spoken at that moment. Does the picture show what the voice says
(the thing named is on screen and readable, the action is happening)? A line about a rabbit with no visible rabbit is
a serious mismatch.
The words spoken at each of ours:
{said}{taste}
List every mismatch, most important first. For each: the element, what the reference's craft does, what ours does,
why it matters to the viewer, and the exact fix a 3D artist can apply inside OUR world.
Return ONLY JSON: {{"score_out_of_10": n, "mismatches": [{{"element": "", "reference": "", "ours": "", "why": "", "fix": ""}}],
"story": [{{"ours": n, "said": "", "shows_it": true, "fix": ""}}], "top5_fixes": ["..."], "what_ours_gets_right": ["..."]}}"""


def label(img, text, colour):
    img = cv2.resize(img, (PW, PH))
    cv2.rectangle(img, (0, 0), (PW, 46), colour, -1)
    cv2.putText(img, text, (12, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.95, (255, 255, 255), 2, cv2.LINE_AA)
    return img


def pairs(ours, dest):
    P, gap = [], np.full((PH, 28, 3), 255, np.uint8)
    for i, f in enumerate(ours[:4]):
        P += [label(cv2.imread(str(ref_for(i))), f"REFERENCE {i + 1}", (110, 110, 110)),
              label(cv2.imread(str(f)), f"OURS {i + 1}", (40, 150, 40)), gap]
    cv2.imwrite(str(dest), np.hstack(P[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 92])


def main():
    out, ours = pathlib.Path(sys.argv[1]), [pathlib.Path(x) for x in sys.argv[2:]]
    img = (HERE / f"pairs_{out.stem}.jpg").resolve()
    pairs(ours, img)
    said = "\n".join(f'OURS {i + 1}: "{said_at(p) or "(no words here)"}"' for i, p in enumerate(ours[:4]))
    t = HERE / "TASTE.md"
    taste = ("\nThe creator's own taste, learned from Shorts they rated (count every breach as a serious mismatch):\n"
             + t.read_text(encoding="utf-8")[:3000]) if t.exists() else ""
    cmd = [shutil.which("claude") or "claude", "-p", "--output-format", "text", "--allowedTools", "Read"]
    env = {**os.environ, "MAX_THINKING_TOKENS": "0"}
    r = subprocess.run(cmd, input=PROMPT.format(img=img, said=said, taste=taste) + f"\n\nUse the Read tool on {img}.",
                       capture_output=True, text=True, encoding="utf-8", timeout=600, cwd=HERE, env=env)
    txt = r.stdout or ""
    m = re.search(r"\{.*\}", txt, re.S)
    try:
        got = json.loads(m.group(0)) if m else {"error": txt[:300] or r.stderr[:300]}
    except ValueError:
        got = {"error": txt[:300]}
    got["stills"] = [str(p) for p in ours[:4]]    # which of our stills were judged (a thumbs up keeps them as the new look)
    out.write_text(json.dumps(got, indent=1), encoding="utf-8")
    print("score", got.get("score_out_of_10"), "|", " / ".join(got.get("top5_fixes") or [])[:900])


if __name__ == "__main__":
    main()
