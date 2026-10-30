// presets_v3.js — Legion 3D v3 video-level look presets (WP3; V3_SPEC 2.3). Rows are DATA in the presets.js format
// (presets.js merges this table into PRESETS). Film keys in `post` (grainPx, weave, flicker, halation, dirt, vigPow,
// matte) are rendered by core/film.js; a scene's look.film overrides them per shot.
//   fern      the fern film texture for the whole video + darkness-tolerant QA. NO grade: the colour script stays per beat
//             (look.grade nocturne / dossier / void_red / void_blue / interior_warm / archive_bw), so a fern video can be
//             blue in the sky, sepia on the desk, red in the void.
//   nocturne  the all-blue variant: every shot in fern's blue-night duotone (a channel that wants one colour for the whole
//             film); keep_hue lights (the red slit) still keep their colour; mannequins read as dark blue-grey forms.
export const V3_PRESETS = {
  fern: {
    desc: 'fern-grade documentary film: low-key 3D lit by one motivated light, fine clumped film grain, slow gate weave, a breath of flicker, red halation round the practicals, specks of dust, a heavy oval vignette; the colour script (blue night, sepia desk, red void) stays per shot',
    stylised: false, tragedy_ok: true,
    post: { grainPx: 1.6, weave: 0.45, flicker: 0.25, halation: 0.35, dirt: 0.14, vigPow: 1.5 },
    // darkness-tolerant: most fern frames are 60-80 % near black and the subject reads by a slit or a rim
    // void_*: a stage.void shot is black by design (fern T07: p90 12-20 after the reveal, ~4 before it); render.py judges
    // the LIT SUBJECT there (frame p99 >= void_p99) instead of the frame p90 / outline share (patch in wp3/LOG.md, lead)
    qa: { dark_p90: 16, floor_p90: 20, repair_p90: 14, repair_lit: 0.01, repair_std: 2.5, dark_sep: 0.18, hot_start: 0.14, hot_target: 0.08,
      void_p90: 3, void_sep: 0.05, void_p99: 60 },
  },
  nocturne: {
    desc: 'fern blue night for the whole film: a deep blue duotone (navy blacks, moon-blue highlights), silhouettes with cool rim light, soft bloom, heavy oval vignette, fine film grain and slow gate weave; red keep_hue lights stay red',
    stylised: false, tragedy_ok: true,
    // the same three-colour blue as look.grade 'nocturne' (navy ink -> saturated moon-blue mid -> pale blue paper)
    grade: { mul: { exposure: 0.95 }, set: { mono: 0.9, ink: [0.03, 0.06, 0.13], mid: [0.19, 0.29, 0.56], midAt: 0.42, paper: [0.56, 0.7, 1.0], contrast: 1.1, lift: [0.0, 0.002, 0.008],
      sat: 1, vignette: 0.58, grain: 0.03, bloom: 0.34, bloomT: 1.6, bloomR: 0.55, shoulder: 0.8 } },
    night: { mul: { exposure: 1.0 }, set: { mono: 0.9, ink: [0.025, 0.05, 0.115], mid: [0.18, 0.28, 0.55], midAt: 0.42, paper: [0.55, 0.69, 1.0], contrast: 1.12, lift: [0.0, 0.002, 0.008],
      sat: 1, vignette: 0.6, grain: 0.03, bloom: 0.36, bloomT: 1.5, bloomR: 0.55, shoulder: 0.8 } },
    post: { grainPx: 1.7, weave: 0.5, flicker: 0.25, halation: 0.25, dirt: 0.12, vigPow: 1.6 },
    atmos: { tint: [0.06, 0.11, 0.24], tintAmt: 0.6, density: 1.35, horizon: 0.55 },
    material: { skin: 0x56607A, rough: [0.45, 1], env: 0.8 },
    shadow: { soft: 0.8 },
    qa: { dark_p90: 26, floor_p90: 32, repair_p90: 22, repair_lit: 0.015, dark_sep: 0.22, hot_start: 0.14, hot_target: 0.08, face_white: 0.12,
      void_p90: 3, void_sep: 0.05, void_p99: 60 },
  },
};
