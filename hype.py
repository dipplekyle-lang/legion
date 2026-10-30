"""hype.py — make a Kinetic hype edit from the Claude chat (motion is a chat feature in Legion, not a UI button).

Claude writes the shot list (edit.json) with the creator, then runs:

    python hype.py --song "C:\\path\\song.mp3" --edit edit.json --out my_hype.mp4
        [--name "Channel name"] [--tagline "one line under the logo"] [--picture thumb.png] [--title "its video title"]
        [--seconds 20]

edit.json is a list of shots, the same kinds the planner uses (kinetic.HYPE_RULE): slam, tunnel, city, proof, pictos,
wave, marbles, lensball, typespace, glyphbeat, storyboard, splitflash, wheel, gears, robotarms, porthole, logo.
Every cut is locked to the song (quarter beats on its hit bursts, half beats elsewhere), every cut gets a clean hit,
the song's bass pumps the motion. A picture only appears if --picture is given (the creator's choice);
otherwise "proof" shots are left out.
Free: rendered on this computer, no image or video credits.
"""

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import kinetic
import sfx

HERE = Path(__file__).resolve().parent


def make(song: str, edit: list, out_file: str, name: str = "Legion", tagline: str = "", picture: str = "",
         title: str = "", seconds: float = None) -> Path:
    work = Path(tempfile.mkdtemp())
    try:
        h = kinetic.hype_edit(edit, song, picture=picture, title=title, name=name, tagline=tagline,
                              out_dir=work, max_seconds=seconds)
        (work / "l.txt").write_text("".join(f"file '{Path(c).name}'\n" for c in h["clips"]), encoding="utf-8")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "l.txt", "-c", "copy", "v.mp4"],
                       cwd=work, check=True)
        sfx.render(h["cues"], h["seconds"], work / "fx.wav", db=-2.0, seed=7, cuts=h.get("cuts"))
        end = h["seconds"]
        out = Path(out_file).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "v.mp4", "-i", str(song), "-i", "fx.wav", "-filter_complex",
                        f"[1:a]aresample=48000,atrim=0:{end},volume=-6dB[s];[2:a]aresample=48000[f];"
                        f"[s][f]amix=inputs=2:normalize=0:duration=first,afade=t=out:st={max(0, end - 0.5):.2f}:d=0.5,"
                        f"loudnorm=I=-13:TP=-1.0:LRA=11[a]", "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow",
                        "-crf", "16", "-c:a", "aac", "-b:a", "192k", "-t", f"{end:.2f}", str(out)], cwd=work, check=True)
        try:                                                     # the motion lab's loop: numbers about the finished edit
            import motion_qa
            print(motion_qa.text(str(out)), flush=True)
        except Exception:                                        # noqa: BLE001 - a check never blocks the video
            pass
        return out
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    a = argparse.ArgumentParser(description="Make a Kinetic hype edit cut to a song.")
    a.add_argument("--song", required=True)
    a.add_argument("--edit", required=True, help="a JSON file with the list of shots")
    a.add_argument("--out", default=str(HERE / "output" / "shorts" / "hype.mp4"))
    a.add_argument("--name", default="Legion")
    a.add_argument("--tagline", default="")
    a.add_argument("--picture", default="")
    a.add_argument("--title", default="")
    a.add_argument("--seconds", type=float, default=None)
    x = a.parse_args()
    shots = json.loads(Path(x.edit).read_text(encoding="utf-8"))
    shots = shots.get("edit", shots) if isinstance(shots, dict) else shots
    print(make(x.song, shots, x.out, x.name, x.tagline, x.picture, x.title, x.seconds))
