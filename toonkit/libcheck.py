"""The librarian's proof: this Short rebuilt from its extracted library pieces (src/index_lib.tpl) must look the same as
the original (src/index.tpl), with no page errors.
usage: python libcheck.py 3.5,10.6,20.2      renders both pages at those times, compares, prints PASS or FAIL"""
import os, pathlib, subprocess, sys

import cv2
import numpy as np

HERE = pathlib.Path(__file__).parent


def main():
    times = sys.argv[1]
    subprocess.run([sys.executable, "assemble.py"], cwd=HERE, check=True)
    subprocess.run([sys.executable, "assemble.py", "src/index_lib.tpl", "index_lib.html"], cwd=HERE, check=True)
    subprocess.run([sys.executable, "render.py", "--stills", times, "o_"], cwd=HERE, check=True)
    r = subprocess.run([sys.executable, "render.py", "--stills", times, "l_"], cwd=HERE, capture_output=True, text=True,
                       env={**os.environ, "TOON_PAGE": "index_lib.html"})
    print(r.stdout.strip()[-600:])
    worst = 0.0
    for t in times.split(","):
        a, b = (cv2.imread(str(HERE / f"{p}{float(t):05.2f}.png")) for p in ("o_", "l_"))
        d = 255.0 if a is None or b is None or a.shape != b.shape else float(np.abs(a.astype(np.int16) - b.astype(np.int16)).mean())
        print(f"{t}s: difference {d:.2f}")
        worst = max(worst, d)
    ok = worst < 1.5 and "no page errors" in r.stdout
    print("PASS" if ok else "FAIL", f"(worst {worst:.2f}; under 1.5 and no page errors passes)")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
