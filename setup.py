#!/usr/bin/env python3
"""Legion setup — run once:   python setup.py   (or double-click Setup.bat on Windows)

Installs what Legion needs, asks for your Algrow key, lets you pick a text
"brain" (no subscription required), writes .env and puts a shortcut on your
desktop. Safe to run again any time to change a setting.
"""

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

import syscheck

HERE = Path(__file__).resolve().parent
ENV = HERE / ".env"
WIN = platform.system() == "Windows"
MAC = platform.system() == "Darwin"


def say(msg=""):
    print(msg, flush=True)


def ask(q, default=""):
    hint = f" [{default}]" if default else ""
    try:
        a = input(f"{q}{hint}: ").strip()
    except EOFError:
        a = ""
    return a or default


def yes(q, default=True):
    a = ask(q + (" (Y/n)" if default else " (y/N)")).lower()
    return default if not a else a.startswith("y")


def read_env() -> dict:
    env = {}
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def write_env(env: dict) -> None:
    ENV.write_text("".join(f"{k}={v}\n" for k, v in env.items() if v != ""), encoding="utf-8")


def mask(key: str) -> str:
    return key[:4] + "…" + key[-4:] if len(key) > 10 else ("set" if key else "")


# ── steps ──────────────────────────────────────────────────────────────────

def check_python():
    if sys.version_info < (3, 9):
        sys.exit(f"Legion needs Python 3.9 or newer — you have {platform.python_version()}. "
                 "Get it from https://www.python.org/downloads/")
    say(f"✓ Python {platform.python_version()}")


SYS = {}


def system_check():
    SYS.update(syscheck.check(HERE))
    say("✓ This computer: " + syscheck.summary(SYS))
    say("  Legion is light — images and text run on your API keys, not on this machine.")
    if not SYS["recommend"]["thumbs"]["ok"]:
        say("  ⚠ " + SYS["recommend"]["thumbs"]["why"])


def install_deps():
    say("Installing what Legion needs (one-time, ~1 minute)…")
    r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", str(HERE / "requirements.txt")])
    if r.returncode != 0:
        sys.exit("Install failed. Check your internet connection and run setup again.")
    # the heavy parts aren't in the ZIP: the video tools (ffmpeg + ffprobe) and the browser motion renders with
    say("Getting the video tools and the motion renderer (one-time, a few minutes)…")
    subprocess.run([sys.executable, "-c", "import static_ffmpeg; static_ffmpeg.add_paths()"])
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"])
    say("✓ Installed")


IMAGE_PROVIDERS = [
    # (engine, label, env key, signup url, free check url, header builder)
    ("openai", "OpenAI · GPT Image — best all-rounder (≈$0.006 draft, ≈$0.20 final)", "OPENAI_API_KEY",
     "https://platform.openai.com/api-keys", "https://api.openai.com/v1/models",
     lambda k: {"Authorization": f"Bearer {k}"}),
    ("google", "Google · Nano Banana — cheap, great with faces (≈$0.04)", "GEMINI_API_KEY",
     "https://aistudio.google.com/apikey", "https://generativelanguage.googleapis.com/v1beta/models",
     lambda k: {"x-goog-api-key": k}),
    ("fal", "fal · FLUX — cheapest drafts (≈$0.004)", "FAL_KEY",
     "https://fal.ai/dashboard/keys", "https://api.fal.ai/v1/models",
     lambda k: {"Authorization": f"Key {k}"}),
    ("algrow", "Algrow — if you already have Algrow credits", "ALGROW_API_KEY",
     "https://go.algrow.online/tool", "https://api.algrow.online/api/voices",
     lambda k: {"Authorization": f"Bearer {k}"}),
]


def image_keys(env: dict):
    import requests
    say("\n── Images: bring your own key ───────────────────────────────")
    say("You pay the provider directly — no subscription, no markup. Add more later in Settings.")
    for i, (_, label, key, *_r) in enumerate(IMAGE_PROVIDERS, 1):
        say(f"  {i}. {label}" + ("  [key saved]" if env.get(key) else ""))
    cur = env.get("IMAGE_ENGINE", "")
    default = next((str(i) for i, p in enumerate(IMAGE_PROVIDERS, 1) if p[0] == cur), "1")
    try:
        eng, label, key, signup, check, hdr = IMAGE_PROVIDERS[int(ask("Pick one", default)) - 1]
    except (ValueError, IndexError):
        eng, label, key, signup, check, hdr = IMAGE_PROVIDERS[0]
    say(f"Get a key at {signup}")
    k = ask("Paste the key" + (f" (Enter keeps {mask(env[key])})" if env.get(key) else ""), env.get(key, ""))
    if not k:
        say("  Skipped — add it later in Settings.")
        return
    try:   # listing models/voices is free: it proves the key without generating anything
        ok = requests.get(check, headers=hdr(k), timeout=20, params={"limit": 1}).ok
        say("✓ Key works" if ok else "  ✗ The provider refused that key — saved anyway; fix it in Settings.")
    except requests.RequestException:
        say("  Couldn't reach the provider to check the key — saved anyway.")
    env[key] = k
    env["IMAGE_ENGINE"] = eng


def detect_ollama():
    import requests
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=3)
        return [m["name"] for m in r.json().get("models", [])] if r.ok else None
    except (requests.RequestException, ValueError):
        return None


def pick_brain(env: dict):
    import requests
    say("\n── Text brain (writes ideas, headlines, scores, titles) ─────")
    has_cc = shutil.which("claude") is not None
    ollama = detect_ollama()
    opts = []
    if has_cc:
        opts.append(("claudecode", "Claude Code — already installed on this computer, no extra cost"))
    opts.append(("anthropic", "Anthropic API key — pay per use, roughly a fraction of a cent per thumbnail"))
    ol = (SYS.get("recommend") or {}).get("ollama", {"ok": True})
    opts.append(("ollama", "Ollama — runs on this computer, completely free"
                 + (" (detected)" if ollama is not None else " (install from ollama.com)")
                 + ("" if ol["ok"] else "  ⚠ not recommended on this computer")))
    opts.append(("openai", "OpenRouter / other OpenAI-compatible API"))
    opts.append(("none", "None — images still work; score/titles/style learning are off"))
    for i, (_, label) in enumerate(opts, 1):
        say(f"  {i}. {label}")
    cur = env.get("BRAIN", "")
    default = next((str(i) for i, (k, _) in enumerate(opts, 1)
                    if k == cur or (cur == "openai" and k == "ollama" and "11434" in env.get("LLM_BASE_URL", ""))), "1")
    choice = ask("Pick one", default)
    try:
        kind = opts[int(choice) - 1][0]
    except (ValueError, IndexError):
        kind = opts[0][0]

    for k in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"):
        if kind not in ("ollama", "openai"):
            env.pop(k, None)

    if kind == "claudecode":
        env["BRAIN"] = "claudecode"
        say("✓ Using Claude Code (make sure you're logged in: run `claude` once in a terminal)")
    elif kind == "anthropic":
        say("Get a key at https://console.anthropic.com/settings/keys")
        key = ask("Paste your Anthropic API key", env.get("ANTHROPIC_API_KEY", ""))
        try:   # listing models is free
            ok = requests.get("https://api.anthropic.com/v1/models", timeout=20,
                              headers={"x-api-key": key, "anthropic-version": "2023-06-01"}).ok
        except requests.RequestException:
            ok = True
        if not ok:
            say("  ✗ Anthropic refused that key — saved anyway; fix it by running setup again.")
        env.update(BRAIN="anthropic", ANTHROPIC_API_KEY=key)
        say("✓ Using Anthropic (model: " + env.get("ANTHROPIC_MODEL", "claude-haiku-5-5") + ")")
    elif kind == "ollama":
        if ollama is None:
            say("  Ollama isn't running. Install it from https://ollama.com, then run:  ollama pull llama3.2-vision")
            say("  Saving the settings now so it works once Ollama is up.")
            ollama = []
        vision = [m for m in ollama if "vision" in m or "llava" in m or "gemma3" in m or "qwen" in m]
        model = ask("Model to use", (vision or ollama or ["llama3.2-vision"])[0])
        env.update(BRAIN="openai", LLM_BASE_URL="http://localhost:11434/v1", LLM_MODEL=model)
        env.pop("LLM_API_KEY", None)
        say(f"✓ Using Ollama ({model}) — free and local")
    elif kind == "openai":
        base = ask("API base URL", env.get("LLM_BASE_URL") or "https://openrouter.ai/api/v1")
        key = ask("API key", env.get("LLM_API_KEY", ""))
        model = ask("Model", env.get("LLM_MODEL") or "google/gemini-2.5-flash")
        env.update(BRAIN="openai", LLM_BASE_URL=base, LLM_API_KEY=key, LLM_MODEL=model)
        say(f"✓ Using {model}")
    else:
        env["BRAIN"] = "none"
        say("✓ No text brain — you can add one later by running setup again")


def make_shortcuts():
    say("\n── Shortcut ─────────────────────────────────────────────────")
    py = sys.executable
    if WIN:
        pyw = Path(py).with_name("pythonw.exe")
        start = HERE / "Legion.bat"
        start.write_text(f'@echo off\ncd /d "{HERE}"\nstart "" "{pyw if pyw.exists() else py}" app.py\n',
                         encoding="utf-8")
        desktop = Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Desktop"
        lnk = desktop / "Legion.lnk"
        ps = (f"$s=(New-Object -ComObject WScript.Shell).CreateShortcut('{lnk}');"
              f"$s.TargetPath='{start}';$s.WorkingDirectory='{HERE}';"
              f"$s.WindowStyle=7;$s.Description='Legion — local Shorts maker';$s.Save()")
        r = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True)
        say("✓ Desktop shortcut: Legion" if r.returncode == 0 else f"✓ Start Legion with {start.name}")
    else:
        start = HERE / ("Legion.command" if MAC else "thumbs.sh")
        start.write_text(f'#!/bin/sh\ncd "{HERE}"\n"{py}" app.py\n', encoding="utf-8")
        start.chmod(0o755)
        if MAC:
            desk = Path.home() / "Desktop" / "Legion.command"
            desk.write_text(start.read_text(encoding="utf-8"), encoding="utf-8")
            desk.chmod(0o755)
            say("✓ Desktop shortcut: Legion (double-click it; leave its Terminal window open while you use Legion)")
        else:
            say(f"✓ Start Legion by double-clicking {start.name}")


AUTO = "--auto" in sys.argv          # no questions (e.g. run by Claude Code): keys and licence are added in Legion's Settings


def main():
    os.chdir(HERE)
    if AUTO:
        say("Legion setup (automatic)\n")
        check_python()
        system_check()
        install_deps()
        env = read_env()
        env.setdefault("BRAIN", "claudecode")        # the tester's own Claude Code login writes ideas and plans
        write_env(env)
        make_shortcuts()
        say("\nAll set. Start Legion, then add your licence key and API keys in the browser.")
        return
    say("Legion setup\n")
    check_python()
    system_check()
    install_deps()
    env = read_env()
    image_keys(env)
    pick_brain(env)
    write_env(env)
    say("✓ Settings saved")
    make_shortcuts()
    say("\nAll set.")
    if yes("Open Legion now?"):
        subprocess.Popen([sys.executable, str(HERE / "app.py")], cwd=HERE)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        say("\nSetup cancelled — nothing else was changed.")
    if WIN and not AUTO:
        input("\nPress Enter to close…")
