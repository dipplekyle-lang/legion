"""Colour numbers of our stills against a style's measured targets (saturation, share of vivid pixels, colourfulness,
brightness, contrast), so the grade is matched with numbers instead of by eye.
usage: python grade_check.py s_*.png --sat 0.38 --vivid 0.20 --colourful 54 --bright 0.57 --contrast 49
Prints our median for each, the target and OFF when it is more than 10 % away (contrast and colourfulness 15 %)."""
import argparse, glob
import cv2
import numpy as np


def measure(path):
    im = cv2.imread(path)
    if im is None:
        return None
    im = cv2.resize(im, (270, 480))
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(float)
    b, g, r = (im[..., i].astype(float) for i in range(3))
    rg, yb = r - g, 0.5 * (r + g) - b
    return {"sat": hsv[..., 1].mean() / 255,
            "vivid": (hsv[..., 1] > 0.6 * 255).mean(),
            "colourful": np.hypot(rg.std(), yb.std()) + 0.3 * np.hypot(rg.mean(), yb.mean()),
            "bright": hsv[..., 2].mean() / 255,
            "contrast": cv2.cvtColor(im, cv2.COLOR_BGR2LAB)[..., 0].astype(float).std()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stills", nargs="+")
    for k in ("sat", "vivid", "colourful", "bright", "contrast"):
        ap.add_argument("--" + k, type=float)
    a = ap.parse_args()
    files = [f for p in a.stills for f in (glob.glob(p) or [p])]
    got = [m for m in map(measure, files) if m]
    if not got:
        raise SystemExit("no stills read")
    for k in ("sat", "vivid", "colourful", "bright", "contrast"):
        ours, want = float(np.median([m[k] for m in got])), getattr(a, k)
        tol = 0.15 if k in ("colourful", "contrast") else 0.10
        flag = "" if want is None else ("ok" if abs(ours - want) <= tol * want else "OFF")
        print(f"{k:10s} ours {ours:7.2f}   target {'-' if want is None else f'{want:.2f}':>6s}   {flag}")
    print(f"({len(got)} stills)")


if __name__ == "__main__":
    main()
