# Archive Timestamp Cut — a learned edit style (1.1-reflearn)

Reference: "Uncensored Footage of the Atomic Bomb's Devastation in Hiroshima" (youtu.be/mSUQ-0iRctM, 13,376,652 views, 326.26x its channel's median of 41,000). Technique only — no channel name, logo, sting or wording is reused. Learned 2026-10-16 08:35 for "The Man Who Survived Both Atomic Bombs".

## The grammar
The film is built almost entirely from real archive: black-and-white newsreel, military film and a few colour reels. The cuts are fast, about 1 s early on, and the pace slows to long uncut holds of 10 to 22 s when a colour reel or a process shot can carry the scene. The only graphics are small, plain white sans-serif facts (a date, a clock time, a place name) centred on the footage. They cut or fade in on one word at a time, such as '06 AUGUST 1945', then '08:13AM', then 'HIROSHIMA'. On the long holds a real map or targeting-scope plate sits under a quiet overlay. Some shots get a flat single-colour duotone, a salmon or rose tint, to mark the most harrowing human moments. Black frames of about 1.5 s act as silence beats before the impact. The result is cold and sober, with desaturated greys, almost no ornament and no logos. Talking-head or official figures are cut in tight and short. Sound drops out in sharp silences between hits.

## Rules
1. Real archive only. Every shot is real footage or a real photo, and each clip plays once.
2. Text is only a fact: a date, a clock time, a place or a number. It is small, white and centred, and it never retypes the narration.
3. Open on a stacked timestamp sequence: date, then time, then place, each replacing the last on the same footage.
4. Cut fast, about 1 s, through the build-up. Hold 10 to 20 s on a single reel when the moment needs weight.
5. Tint the most harrowing human shots in one flat rose duotone. Use it sparingly, as a warning beat.
6. Use black frames of 1 to 2 s as silence before and after the blasts.
7. Keep the grade desaturated and cold grey. Colour film is allowed to stay colour only as a rare reveal.
8. Keep captions in the bottom 13 %. No logos or bugs, and no burned-in source text.

## Palette
ground `#101012`, ink `#F2F0EE`, accent `#E8788A`, accent2 `#6FA3C0`, muted `#827F7F`

## Type
- hero: Inter 700 upper 64 px — Plain white bold grotesque, slightly tracked, centred on the footage with a soft dark shadow. No box, no bounce.
- label: Inter 600 upper 34 px — Small white tracked sans label, used for a time or a place, fading in and out cleanly.
- mono: Space Mono    px — Used only for clock times and coordinates on plate and map devices, in muted grey.

## Signature edits (1920x1080, seconds from the scene start)
**datestack — Date Time Place Stack** (4.5 s; serves: Opening on the morning of 6 August 1945, then 9 August 1945, with clock time and city; ground: footage sharp). Layout: Centred at x=960, y=470 on footage. Line 1 at 64px bold white, over the footage's quiet area. Motion: 0.0s date cuts in; at 1.4s it is replaced in the same spot by the clock time (08:15AM); at 2.8s by the city name (HIROSHIMA). Each fades in over 0.2s with a smoothstep and holds for 1.2s. The footage keeps running underneath and the shot is not cut. Colour: #F2F0EE with a shadow of #101012 at 60% Type: Inter Bold 64px upper
**rosetint — Rose Duotone Warning** (2.5 s; serves: The victims' faces and the burned city, the most harrowing real shots; ground: footage sharp). Layout: Full frame. The footage is turned into a monochrome duotone of #101012 and #E8788A, with a slight push-in. Motion: The tint snaps on at the cut and holds for the whole shot of 1 to 2 s. It goes back to grey on the next cut with no transition. Colour: #E8788A on #101012 Type: none, or a single label of 34px at the lower left above the caption safe area
**blackbeat — Black Silence Beat** (2.5 s; serves: The seconds before each bomb falls, and the moment after; ground: void). Layout: Full black frame with no graphics. Optionally a 34px white clock time centred at y=540. Motion: Footage cuts to black for 1.5 to 2 s with the sound dropped. The next shot starts abruptly, on the blast or on a quiet image. Colour: #000000, text #F2F0EE Type: Inter SemiBold 34px upper
**scopeplate — Target Scope Plate** (12.0 s; serves: Hiroshima and Nagasaki as targets, with the aiming point and the distance to it; ground: map). Layout: A real period map of the city fills the frame in grey. A thin white scope ring (about 640px across) is centred at 960,500. A small label such as the city name sits at 960,230 and a Space Mono distance reading sits below the ring. Motion: Over 20 s the map drifts slowly, about 4% (smoothstep). The ring fades in at 1.0s and the label at 2.0s. The ring contracts slowly by 10% toward the end. Colour: ring #F2F0EE at 80%, map grey #5B6369, readout #AEA5A6 Type: Inter 34px upper, Space Mono 26px
**longhold — Long Reel Hold** (12.0 s; serves: The flight, the mushroom cloud over the city, the preparations on the airfield; ground: footage sharp). Layout: One real reel fills the frame, uncut for 10 to 20 s. There is a single fact label at 960,540 on the first beat, or none. Motion: A very slow push-in of 3 to 5%. The label appears at 0.5s and fades by 3.5s. Nothing else moves. Colour: #F2F0EE label Type: Inter 34px upper
**personcut — Named Portrait Flash** (3.0 s; serves: Tsutomu Yamaguchi, officials, and the witnesses introduced by name; ground: photo). Layout: A real photo of the person fills the frame, grey. A name sits at lower left (x=140, y=800) in 40px, with the year and place below it in 28px muted grey. Both stay above the bottom 13 %. Motion: The photo arrives on the cut and holds for 2 to 3 s with a slight push. The name fades in at 0.4s, holds, and is gone on the next cut. Colour: #F2F0EE, #827F7F Type: Inter Bold 40px upper, Inter SemiBold 28px
**countline — Hour Counter Over Footage** (3.0 s; serves: The minutes between the bomb's release and the blast, and the three days between the two bombs; ground: footage sharp). Layout: A single figure (such as '43 SECONDS' or '3 DAYS') at 960,500 in 96px white. A small label sits under it at 960,580. Motion: The figure appears in one cut. It does not roll, and it fades after 2s. The footage stays sharp and dimmed by 25%. Colour: #F2F0EE on footage darkened 25% Type: Inter Bold 96px, Inter SemiBold 34px
**placeflash — Place Name Flash** (2.5 s; serves: A change of location, such as Hiroshima to Nagasaki; ground: footage sharp). Layout: The place name centred at 960,470 in 64px, with the date in 34px at 960,540. Motion: Cut in on the first frame of the new shot and held for 2s. It fades out over 0.3s. Colour: #F2F0EE Type: Inter Bold 64px, Inter SemiBold 34px

## Pacing
- median_shot_s: 1.6
- hook_s: 40
- graphics_share: 0.15
- cold_open: Open straight on real footage with the date, time and place in three beats. There is no logo, no title card and no music swell, only room tone and a drone.
- body: Cut at about 1 s through the build-up, then hold one reel for 10 to 20 s at the key moments. Put a black beat before each impact.
- chapters: There are no chapter cards. A change of time or place is marked by a date or place flash, and sometimes by a black beat.

## Footage
- treatment: Desaturated cold grey, with high contrast and grain. Keep the real film's dust and scratches. Colour reels may stay in colour as a reveal. Use a flat rose duotone for the harrowing shots.
- literalness: Very literal. What the narration says is what we see: the plane, the city, the officials, the people. Where there is no footage, use black.
- credits: No on-screen credits. Keep sources in the description.

## Captions
- reference: No visible burned-in captions. Only the small centred fact text.
- ours: bottom (locked by the engine), small, never over the graphics

## Sound
- vibe: Sparse cold drone with room tone and mechanical details. Silence is used as punctuation.
- hits: A low hit on each date or time flash and on each cut into a rose-tint shot. Sound drops out to silence on every black beat and before each blast. A slow riser builds under the long holds.

## Assets
overlay_dust @ archive_shots

## Genome wants
frame full, grade mono_silver, push slow_in, glow none, motion smooth_drift, text_hero condensed_label, text_label dateline, map_look ops_map, music_vibe disaster_dread, sfx_flavor cinematic_subtle, headline_skin default, world broadcast_archive, opening soundup_cold_open
