# Legion Shorts: start here

Legion's Shorts engine turns a title into a finished vertical video (1080x1920, 5 to 180 seconds) on your own computer.

## Three steps

1. Open Legion and go to the **Shorts** tab.
2. **Pick a style card first.** (After you restart Legion the tab goes back to its default card, so check it every time.)
3. Type a title, choose a length, press Make. Leave the AI images switch off unless you want pictures drawn and paid for.

Read [ENGINE.md](ENGINE.md) once. It explains how a Short is made, what costs money, which services take over when one fails, and what each error message really means.

## The styles

| Card | Style file | What it is | Tested |
|---|---|---|---|
| **Verity** | [documentary.md](documentary.md) | Real footage, told like a documentary | Yes, on real runs |
| Prism | [3d.md](3d.md) | True stories rebuilt in 3D | No |
| Inkwell | [folio.md](folio.md) | A picture book drawn in code | No |
| Storyline | [stories.md](stories.md) | One decision, years later, in flat 2D | No |
| Evidence | [dossier.md](dossier.md) | True crime as a case file | No |
| Cashflow | [hustle.md](hustle.md) | Money and side hustles | No |
| Chalkline | [kinetic.md](kinetic.md) | The words are the picture | No |
| Timewarp | [atlas.md](atlas.md) | History as a bold cartoon | No |
| Sonar | [deep.md](deep.md) | Military and tech mysteries | No |
| Datapoint | [horizon.md](horizon.md) | Real numbers, drawn big | No |
| Breach | [hacker.md](hacker.md) | Cyber-war stories in neon | No |
| Collector | [almanac.md](almanac.md) | The history of people and things | No |

"Tested" means checked on full runs during the beta work. Every style shares the engine's rules, but only Verity has been run end to end. Treat the others as early access.

## If it goes wrong

1. Open `output/studio.log` and read the lines just above the failure. The message on screen can be misleading (see ENGINE.md, section 8).
2. Pressing Make on the same title reuses cached work. To rebuild only one part, delete that part's file in the Short's folder (ENGINE.md, section 7), or tick "Redo everything".
3. A restart of Legion is safe and often the quickest fix.

## Credits

The engine is derived from Frontier by Primal Robin, used with permission for Shorts only. Please do not redistribute the engine's code outside Legion's licence.
