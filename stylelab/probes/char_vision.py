"""A sheet of 12 of his characters (close and medium), studied by Legion's brain for exact construction rules."""
import json, os, pathlib, subprocess, sys
import cv2
import numpy as np

import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.ROOT
C = [("ref-A", 5.0, (100, 200, 1000, 1800), "cashier close"), ("ref-A", 2.7, (0, 0, 1080, 1500), "cashier shocked"),
     ("ref-A", 7.0, (300, 200, 1080, 1500), "customer"), ("ref-A", 33.0, (0, 500, 600, 1700), "cashier sitting"),
     ("ref-A", 29.0, (100, 300, 1080, 1700), "prize clerk"), ("ref-B", 3.5, (0, 400, 1080, 1700), "boss"),
     ("ref-B", 12.5, (300, 500, 1080, 1700), "worker"), ("ref-C", 19.0, (80, 300, 1080, 1900), "officer"),
     ("ref-C", 50.5, (100, 400, 1000, 1900), "buyer"), ("ref-C", 37.0, (100, 300, 1080, 1700), "dad night"),
     ("ref-F", 30.5, (200, 300, 1080, 1700), "knight"), ("ref-D", 6.5, (100, 300, 1000, 1900), "emperor")]
tiles = []
for v, t, (x0, y0, x1, y1), lab in C:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(HERE / "refs" / f"{v}.mp4"), "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3)
    c = cv2.resize(f[y0:y1, x0:x1], (300, 420))
    cv2.rectangle(c, (0, 0), (300, 20), (0, 0, 0), -1); cv2.putText(c, f"{len(tiles) + 1}. {lab}", (4, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    tiles.append(c)
sheet = np.vstack([np.hstack(tiles[i:i + 6]) for i in (0, 6)])
cv2.imwrite(str(HERE / "deep2" / "char_sheet.jpg"), sheet)
LEGION = lab.LEGION
sys.path.insert(0, str(LEGION)); os.chdir(LEGION)
import app                                                           # noqa: E402
prompt = """The image shows 12 characters from one animated YouTube channel (numbered tiles). They share one character design system.
Describe that system precisely enough that a 3D artist could rebuild it EXACTLY. Use proportions relative to the head width (HW)
and head height (HH). Be specific and measurable; say when something varies between characters.
Return ONLY JSON with these keys:
"head": shape, width:height ratio, where it is widest, how it sits on the body (overlap amount in HH),
"skin_shading": how the white head is shaded,
"outline": thickness relative to HW on head/body/limbs/props, colour, consistency,
"hair": how hair is constructed (cap/volume relative to skull, fringe line shape and height, parting, strand lines, highlight
  streaks, outline), the different hair types seen,
"face_layout": eye position/size/spacing, brow position/shape/thickness, mouth position/size, how features change per expression,
"torso": shape, width at shoulders/middle/bottom relative to HW, height relative to HH,
"arms": attach point, thickness relative to HW, hands (size, shape),
"legs_feet": length relative to HH, thickness, spacing, feet/shoes,
"clothing": how clothes, collars, ties, badges, tags, hats and armour are added; how the shading on clothes works,
"accessories": hats, glasses, moustaches, beards: how they're attached and drawn,
"what_makes_it_look_premium": the 5 details that separate this from flat cheap cartoons,
"common_mistakes_to_avoid": 5 things a copy would likely get wrong."""
got = app.claude_json(prompt, images=[HERE / "deep2" / "char_sheet.jpg"], want=dict)
(HERE / "deep2" / "char_system.json").write_text(json.dumps(got, indent=1), encoding="utf-8")
print(json.dumps(got, indent=1))
