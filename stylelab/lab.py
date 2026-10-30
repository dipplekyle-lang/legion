r"""Where a style study lives. Every stylelab tool reads its reference Shorts from <study>/refs/*.mp4 and writes its
measurements next to them. The study folder is the STYLELAB environment variable, else the current folder.
    set STYLELAB=output\short_styles\my-style   then   py -3.12 stylelab\measure_all.py"""
import json, os, sys
from pathlib import Path

ROOT = Path(os.environ.get("STYLELAB") or ".").resolve()
REFS = ROOT / "refs"
IDS = sorted(p.stem for p in REFS.glob("*.mp4"))
LEGION = Path(__file__).resolve().parents[1]
if str(LEGION) not in sys.path:
    sys.path.insert(0, str(LEGION))                  # so a tool can `import app` for Legion's brain
if not IDS and __name__ != "__main__":
    print(f"stylelab: no reference videos in {REFS} (put the Shorts there as <id>.mp4)", file=sys.stderr)
for _d in ("deep", "deep2", "deep3", "env", "hooks", "measure", "nature", "scenes", "why") if IDS else ():
    (ROOT / _d).mkdir(exist_ok=True)                 # some tools write into these without making them


def titles() -> dict:
    """What each reference video is about, from <study>/titles.json ({"id": "one line"}), else its id."""
    f = ROOT / "titles.json"
    got = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    return {i: got.get(i, i) for i in IDS}


def sub(name: str) -> Path:
    """A subfolder of the study for one tool's output (made if missing)."""
    p = ROOT / name
    p.mkdir(parents=True, exist_ok=True)
    return p
