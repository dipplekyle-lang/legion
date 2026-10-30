#!/bin/sh
# Legion setup for Mac: right-click this file > Open (the first time macOS asks), once.
cd "$(dirname "$0")"
clear
echo
echo "   ========================================"
echo "       LEGION - setting up"
echo "   ========================================"
echo
echo "   This gets Legion ready. It takes a few minutes"
echo "   and you only do it once. Sit back."
echo

# Legion runs on its own Python 3.12, kept inside this folder (.venv): nothing else on the Mac changes, no password
UV="$HOME/.local/bin/uv"
if [ ! -x "$UV" ]; then
  echo "   [1/3] Getting Python 3.12 (one time)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh || { echo "   No internet? Connect and open Setup again."; exit 1; }
fi
if [ ! -x .venv/bin/python ]; then
  "$UV" venv --python 3.12 .venv && "$UV" pip install --python .venv/bin/python pip || { echo "   Python didn't install. Open Setup again."; exit 1; }
fi

# the files came from a download: tell macOS they are yours to run (else it blocks Legion's engine)
echo "   [2/3] Unlocking Legion's files..."
xattr -dr com.apple.quarantine . 2>/dev/null

echo "   [3/3] Getting Legion ready..."
echo
.venv/bin/python setup.py --auto
echo
echo "   Done. Start Legion with the Legion shortcut on your Desktop. You can close this window."
