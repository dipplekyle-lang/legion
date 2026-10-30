# Updating from an older Legion

Already using Legion 5 or older? Keep your old folder where it is.

1. Unzip Legion 5.1 (anywhere, just not over your old folder).
2. Open Claude Code the way you always do for Legion (in your old Legion folder).
3. Drag the new, unzipped Legion 5.1 folder into the Claude Code window, paste the prompt below and send it.

Claude moves everything that is yours into the new version: your keys, your own channels, your music, avatars and
other assets, and any changes you made. Your old folder is not touched, so it stays as your backup.

```
I just dragged in the new Legion 5.1 folder I downloaded. My old Legion (the one I've been using) is the folder this session is open in. If this session is not open in my old Legion folder, ask me where it is.

Update me to 5.1 without losing anything of mine:

1. The NEW folder becomes my Legion. Keep all its new 5.1 code, styles and features.
2. Bring over everything that is mine from the old folder into the new one:
   - my .env with all my keys (and my output folder setting, if I set one)
   - my own channels in styles/ (every style that is not one of Legion's built-in ones)
   - any built-in style I edited: show me what I changed and apply my changes on top of the new 5.1 version of that style
   - my music (assets/music/), sound effects (assets/sfx/), avatars, characters, fonts, logos and any other files I added to assets/
   - my finished videos: do not copy them. If they are inside the old folder (output/), set LEGION_OUTPUT in the new .env to that old output folder, so my video library still shows them
   - anything else I added or changed. Compare the two folders file by file. For code files that differ, work out whether the difference is my own customization or just the older Legion. Keep only what is mine, and ask me when you are not sure.
3. Do not delete or change anything in my old folder. It is my backup.
4. When you are done, list what you brought over and what you left out, start the app from the new folder (python app.py) and check that it runs and that my channels and settings are there.
5. Tell me to open Claude Code in the new folder from now on.
```
