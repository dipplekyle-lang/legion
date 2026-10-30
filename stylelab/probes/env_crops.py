import pathlib, subprocess, sys
import cv2, numpy as np
import sys as _s, pathlib as _p; _s.path.insert(0, str(_p.Path(__file__).resolve().parents[1]))
import lab
HERE = lab.ROOT
_c = {}
def frame(v, t):
    if (v, t) not in _c:
        raw = subprocess.run(["ffmpeg","-v","error","-ss",str(t),"-i",str(HERE/"refs"/f"{v}.mp4"),"-frames:v","1","-f","rawvideo","-pix_fmt","bgr24","-"],capture_output=True).stdout
        _c[(v, t)] = np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3)
    return _c[(v, t)]
def sheet(name, pts, size=200, zoom=1.5, cols=6):
    tiles = []
    for v, t, label, x, y in pts:
        f = frame(v, t); x0, y0 = max(0, min(1080 - size, x - size // 2)), max(0, min(1920 - size, y - size // 2))
        c = cv2.resize(f[y0:y0 + size, x0:x0 + size], (int(size * zoom), int(size * zoom)), interpolation=cv2.INTER_NEAREST)
        cv2.rectangle(c, (0, 0), (c.shape[1], 20), (0, 0, 0), -1); cv2.putText(c, label[:40], (4, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        tiles.append(c)
    while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
    rows = [np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
    cv2.imwrite(str(HERE / "env" / f"{name}.png"), np.vstack(rows))
MAT = [("ref-A",33.0,"yellow plaster wall",750,780),("ref-A",33.0,"terrazzo floor",300,1750),("ref-A",33.0,"ceiling tiles",600,90),
       ("ref-A",0.3,"laminate counter",700,1420),("ref-A",0.3,"wood wainscot",120,1090),("ref-A",0.3,"pegboard + items",1000,860),
       ("ref-C",10.0,"checkered kitchen floor",300,1720),("ref-C",17.0,"shaggy carpet",540,1700),("ref-C",6.0,"wallpaper",200,420),
       ("ref-B",11.0,"cinder block wall",700,420),("ref-B",5.5,"office carpet",400,1700),("ref-E",3.0,"ship deck planks",500,1700),
       ("ref-E",20.5,"brick furnace",500,800),("ref-D",27.5,"castle stone wall",300,600),("ref-D",41.5,"stone walkway",540,1600),
       ("ref-F",28.0,"forest floor",300,1700),("ref-E",5.0,"sea water",540,1500),("ref-A",33.0,"aquarium glass",900,1000),
       ("ref-C",49.5,"house siding",950,600),("ref-D",14.0,"sky + cloud",756,250),("ref-F",0.5,"thatch / roof tiles",150,560),
       ("ref-F",0.5,"awning fabric",540,520),("ref-B",3.5,"wood panel wall",160,700),("ref-D",6.5,"throne velvet + gold",540,700)]
if "mat" in sys.argv: sheet("materials", MAT)
SH = [("ref-C",10.0,"dad's feet (contact)",340,1290),("ref-C",10.0,"fridge base",820,1410),("ref-B",43.5,"walker's feet",680,1300),
      ("ref-A",33.0,"bench legs on terrazzo",330,1620),("ref-C",4.6,"chair leg on carpet",420,1530),("ref-B",21.0,"sun patch (top-down)",300,1000),
      ("ref-B",11.0,"sun patch on wall",420,640),("ref-C",10.0,"window light on floor",900,1780),("ref-A",46.5,"blind stripes",540,1000),
      ("ref-D",29.6,"sunset rays",540,700),("ref-F",28.0,"god rays in forest",540,500),("ref-C",36.0,"night: lamp pool",300,1500)]
sheet("shadows", SH)
FEET = [("ref-F",1.6,"knight's feet",330,1530),("ref-F",1.6,"priest's feet",860,1520),("ref-E",3.0,"pirate on deck",560,1560),
        ("ref-D",28.0,"townsfolk on dirt",250,1450),("ref-C",49.0,"dad on lawn",420,1560),("ref-B",47.8,"coworkers on carpet",250,1620)]
if "feet" in sys.argv: sheet("feet", FEET)
