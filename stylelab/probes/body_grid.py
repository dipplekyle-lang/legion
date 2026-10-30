import pathlib, subprocess, sys, cv2, numpy as np
import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.ROOT
def grab(v, t):
    raw = subprocess.run(["ffmpeg","-v","error","-ss",str(t),"-i",str(HERE/"refs"/f"{v}.mp4"),"-frames:v","1","-f","rawvideo","-pix_fmt","bgr24","-"],capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920,1080,3).copy()
def tile(img, box, label, size=(360, 640)):
    x0,y0,x1,y1 = box; c = img[y0:y1, x0:x1]; c = cv2.resize(c, size, interpolation=cv2.INTER_AREA)
    h, w = c.shape[:2]
    for i in range(1, 20):
        col = (0,255,255) if i % 2 == 0 else (0,140,255)
        cv2.line(c, (0, int(h*i/20)), (w, int(h*i/20)), col, 1)
        if i % 2 == 0: cv2.putText(c, str(i*5), (2, int(h*i/20)-2), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0,0,255), 1)
    for i in range(1, 10): cv2.line(c, (int(w*i/10), 0), (int(w*i/10), h), (0,200,255), 1)
    cv2.rectangle(c, (0,0), (w,18), (0,0,0), -1); cv2.putText(c, label, (3,13), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255,255,255), 1)
    return c
J = [a.split("|") for a in sys.argv[2:]]
tiles = [tile(grab(v, float(t)), tuple(int(x) for x in b.split(",")), lab) for v, t, b, lab in J]
cv2.imwrite(str(HERE/"body"/f"{sys.argv[1]}.png"), np.hstack(tiles))
