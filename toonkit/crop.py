"""A preview crop for a library piece. usage: python crop.py s_10.60.png x y w h out.png  (box in still pixels)"""
import pathlib, sys

import cv2

src, x, y, w, h, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
img = cv2.imread(src)
H, W = img.shape[:2]
x, y = max(0, min(x, W - 1)), max(0, min(y, H - 1))
crop = img[y:min(H, y + h), x:min(W, x + w)]
s = 320 / max(crop.shape[:2])
pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
cv2.imwrite(out, cv2.resize(crop, (max(1, int(crop.shape[1] * s)), max(1, int(crop.shape[0] * s)))), [cv2.IMWRITE_PNG_COMPRESSION, 6])
print("preview", out)
