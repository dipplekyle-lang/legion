# Legion — local Shorts maker

    pip install -r requirements.txt
    python app.py        # opens http://127.0.0.1:7870

- `.env` needs `ALGROW_API_KEY` (images) — `IMAGE_MODEL` picks the model.
- Concepts/headlines are written by the local `claude` CLI (your Claude Code login).
- The model paints artwork only; headlines are an editable layer in the browser (free edits).
- Everything is saved in `output/`.

## Setup (no Claude Code needed)

Windows: double-click **Setup.bat**. Mac/Linux: `python3 setup.py`.
It installs everything, checks your Algrow key, lets you pick a text brain, and makes a desktop shortcut.

Text brain options (`BRAIN` in .env): `claudecode` · `anthropic` (API key, Haiku) ·
`openai` (any OpenAI-compatible API — OpenRouter, or Ollama locally for free) · `none` (templates).
