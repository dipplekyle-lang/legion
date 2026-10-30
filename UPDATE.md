# Updating Legion

Open Claude Code in your Legion folder and say:

> update Legion from (where you saved this zip)

Claude does the rest. Your projects, keys and everything Legion learned stay.

---

**For Claude Code:**

1. Close Legion if it's running (Windows locks its files while it runs).
2. Unzip the update into a temporary folder.
3. Copy everything from it over this Legion folder, **except** `.env`, `output/`, `personas/` and `uploads/`
   (their keys, projects, channel and everything Legion learned). Never delete those.
4. Run `py -3.12 -m pip install -r requirements.txt`.
5. Delete the temporary folder, start Legion (`py -3.12 app.py`) and tell them the new version number
   (Settings, at the bottom).

The folder stays where it is, so their desktop shortcut keeps working.
