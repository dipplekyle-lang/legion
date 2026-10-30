# Legion 3D — quality standard (v1, 26 Sep 2026)

The checks every Legion 3D scene must pass. The review rounds (threed.py) ask Claude to score the preview stills
against the criteria below; the engine checks run in render.py for every scene.

## Score per scene (0–10)
Five criteria, 0–2 points each (2 = broadcast-good, 1 = acceptable, 0 = wrong or cheap):

1. **Story.** The shot shows what the words under it say, at that moment.
   - The place is recognisable: a beach has sand, a surf line and palms; a highway has lanes and traffic; an office
     looks like an office.
   - Scale is right: a ten-year-old is child-sized; the rooms fit the people.
2. **Subject.** The hero reads at 1080p in under a second. The hero is YOU, the disaster, or the thing named.
   - It needs size, contrast and focus.
   - It must not be hidden, cut by the frame edge, or lost in blur.
3. **Motion.** Everything moves the way it would in the real world.
   - People walk forwards, facing the way they travel, and their feet don't slide.
   - Vehicles drive on the road, along it, with their wheels turning.
   - Animals move head first.
   - The camera eases, with no bumps, jumps or flips.
4. **Craft.** Nothing looks cheap or broken.
   - Nothing floats or sinks. Figures don't pass through each other, furniture or walls.
   - No broken poses.
   - No wireframe-looking or cut-out vegetation, and no hard, jagged edges where scattered plants end.
   - No visible tiling, no z-fighting, no typos.
5. **Life.** The shot feels lived in.
   - Depth: a foreground, a middle and a background.
   - Light and weather fit the moment: a hurricane evacuation happens under a darkening sky.
   - Secondary motion: wind, dust, water, crowds that move with a purpose.
   - Variety compared with the neighbouring shots.

## Hard fails (the scene is capped at 4/10 until it is fixed)
- **H1 Locomotion.** Anyone walks or runs backwards or sideways (facing vs direction of travel > 35°), or feet slide
  (the gait's ground speed vs the real speed outside 0.8–1.25). Creatures and horses too.
- **H2 Vehicles.** A vehicle is off the road or track it is meant to use, or not aligned with it (> 10°), or its wheels
  don't turn while it moves.
- **H3 Contact.** An object or figure floats or is sunk (> 5 cm at the contact point). Figures overlap each other or
  sit inside furniture, walls or terrain.
- **H4 Narration mismatch.** The narration names something that isn't on screen. Examples: "under your skis" over an
  empty slope; "under the desk" while YOU kneels beside it.
- **H5 Unreadable.**
  - A hero figure is under 5 % of the frame height, and there's no reason for it.
  - An FX doesn't read as what it is: ash that reads as rain; a rockfall that isn't there.
- **H6 Camera.**
  - A bump, jump or flip, or the safety pass visibly lifting the camera.
  - A head-turn faster than 180°/s.
  - Depth of field focused on something other than the subject: ghosted or blurred heroes.
- **H7 Anatomy.** A pose breaks the body: an arm through the torso, a dislocated-looking shoulder or elbow, a hand
  inside the head. Mannequins stay faceless.
- **H8 Repetition.** The same set or room stands in for two different places, or footage is repeated.

## Engine checks (automatic, in render.py's report for every scene)
- **Locomotion:** for every moving figure, group instance, creature and horse, the maximum angle between facing and
  velocity, and the gait-vs-ground speed ratio. The scene is flagged if the angle is over 35° or the ratio is outside
  0.8–1.25.
- **Vehicles:** the distance from the nearest road centreline to each driving vehicle, heading vs road tangent, and
  wheel spin vs speed. Flagged if the vehicle is off the road surface or misaligned by more than 10°.
- **Contact:** the ground gap and sink at the feet, wheels and bases of placed items.
- **DOF:** the focus distance matches the subject's real position (figures, vehicles, boats).

## In Legion (threed.py)
1. Preview stills at 640x360 of every scene (two per scene, at 30 % and 80 % of its length) -> a contact sheet.
2. Claude (Opus) reviews the sheet with the narration and the engine checks and returns fixed specs; up to
   `look.threed.review_rounds` rounds (3), a section the reviewer passes unchanged is done.
3. The final render gates every scene on the camera QA again and re-renders flagged frames; a scene that still fails is
   rendered as designed (--force) rather than lost.

<!-- LOOK PRESETS (autostyle v2, 2026-10-03): storyboard._quality() sends this section ONLY when the video has a look
preset (threed look.threed.preset); a video without one gets the rubric above, byte for byte. -->
## Look presets — the look is intentional
A video may carry ONE look preset (engine core/presets.js, set by the channel or by autostyle, never per shot):
san_andreas (PS2-era game look), noir (black and white), diorama (tilt-shift miniature), cel (graphic novel), clay_lite
(stop-motion clay), hologram (cyan projection on a black void). The preset's look is INTENTIONAL: judge craft inside it.
Its softness, colour filter, blur band, flat light steps, outlines, grain, darkness or stepped (on twos) motion is never
a Craft or Subject fault and never a reason to rewrite a shot toward realism. Everything else in this rubric still
holds — the story, the subject reading at a glance, H1-H8 — and mannequins stay FACELESS in every preset.

Checks relaxed per preset (engine meters / render.py / threed.py repair; any key not listed = the default above):
| preset | exposure ceiling start / target | blown_area | too_dark p90 | dusk floor p90 | repair p90 / lit / std | face_blown white / mean |
|---|---|---|---|---|---|---|
| documentary (none) | 0.12 / 0.06 | 0.08 | 70 | 70 | 45 / 0.04 / 5.0 | 0.12 / 205 |
| san_andreas | 0.30 / 0.18 | 0.30 | 70 | 70 | 45 / 0.04 / 5.0 | 0.20 / 220 |
| noir | 0.14 / 0.08 | 0.08 | 40 | 46 | 30 / 0.025 / 5.0 | 0.12 / 205 |
| diorama | 0.16 / 0.09 | 0.12 | 70 | 70 | 45 / 0.04 / 5.0 | 0.12 / 205 |
| cel | 0.12 / 0.06 | 0.12 | 70 | 70 | 45 / 0.04 / 5.0 | 0.12 / 205 |
| clay_lite | 0.12 / 0.06 | 0.08 | 70 | 70 | 45 / 0.04 / 5.0 | 0.20 / 205 |
| hologram | 0.12 / 0.06 | 0.08 | 14 | 16 | 14 / 0.012 / 2.5 | 0.12 / 205 |
Labels: san_andreas allows a darker plate (up to 0.84) and floors label_low_contrast at 2.0:1 (the smog sky glows
behind every title — a readable cream title on a plated smog sky is the look, not a fault). Ink (cel, hologram) comes
only from figures, vehicles, buildings and props — grass, trees and the ground never take outlines; under cel and
clay the ground and plants are painted flat and the grass tufts are gone by design.
