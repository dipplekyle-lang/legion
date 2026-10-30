"""syscheck.py — what this computer can comfortably run.

Legion itself is light (the heavy work runs on your API keys). This only decides
which OPTIONAL local extras to recommend: the free cutout tool and Ollama.
Standard library only, so setup can run it before anything is installed.
"""

import ctypes
import platform
import shutil
import subprocess
from pathlib import Path


def ram_gb() -> float:
    try:
        if platform.system() == "Windows":
            class M(ctypes.Structure):
                _fields_ = [("len", ctypes.c_ulong), ("load", ctypes.c_ulong), ("total", ctypes.c_ulonglong),
                            ("avail", ctypes.c_ulonglong), ("tp", ctypes.c_ulonglong), ("ap", ctypes.c_ulonglong),
                            ("tv", ctypes.c_ulonglong), ("av", ctypes.c_ulonglong), ("ae", ctypes.c_ulonglong)]
            m = M()
            m.len = ctypes.sizeof(M)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
            return m.total / 1024 ** 3
        if platform.system() == "Darwin":
            return int(subprocess.check_output(["sysctl", "-n", "hw.memsize"])) / 1024 ** 3
        for line in Path("/proc/meminfo").read_text().splitlines():
            if line.startswith("MemTotal"):
                return int(line.split()[1]) / 1024 ** 2
    except Exception:                                            # noqa: BLE001
        pass
    return 0.0


def gpu() -> dict:
    """{'name', 'vram_gb'} for an NVIDIA card, Apple Silicon flagged, else empty."""
    if shutil.which("nvidia-smi"):
        try:
            out = subprocess.check_output(["nvidia-smi", "--query-gpu=name,memory.total",
                                           "--format=csv,noheader,nounits"], text=True, timeout=10)
            name, mem = out.splitlines()[0].rsplit(",", 1)
            return {"name": name.strip(), "vram_gb": round(int(mem) / 1024, 1)}
        except Exception:                                        # noqa: BLE001
            pass
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        return {"name": "Apple Silicon", "vram_gb": 0, "unified": True}
    return {}


def check(path: Path = Path(".")) -> dict:
    ram = round(ram_gb(), 1)
    g = gpu()
    free = round(shutil.disk_usage(path).free / 1024 ** 3, 1)
    strong_gpu = g.get("vram_gb", 0) >= 8 or (g.get("unified") and ram >= 16)
    rec = {
        "thumbs": {"ok": free >= 1, "why": "Legion needs ~1 GB free for your thumbnails." if free < 1 else ""},
        "cutout": {"ok": ram >= 4 and free >= 1,
                   "why": "" if ram >= 4 and free >= 1 else "Needs 4 GB+ RAM and 1 GB free disk."},
        "ollama": {"ok": (ram >= 16 or strong_gpu) and free >= 8,
                   "why": "" if (ram >= 16 or strong_gpu) and free >= 8 else
                   "Not recommended here — needs 16 GB+ RAM (or a GPU with 8 GB+) and 8 GB free disk. "
                   "Use Claude Code, Anthropic or OpenRouter instead."},
    }
    return {"ram_gb": ram, "gpu": g, "disk_free_gb": free, "os": platform.system(), "recommend": rec}


def summary(c: dict) -> str:
    g = c["gpu"]
    gpu_txt = f"{g['name']} ({g['vram_gb']} GB)" if g.get("vram_gb") else g.get("name", "no dedicated GPU")
    return f"{c['ram_gb']} GB RAM · {gpu_txt} · {c['disk_free_gb']} GB free disk"


if __name__ == "__main__":
    c = check()
    print(summary(c))
    for k, v in c["recommend"].items():
        print(f"  {k}: {'ok' if v['ok'] else 'not recommended'} {v['why']}")
