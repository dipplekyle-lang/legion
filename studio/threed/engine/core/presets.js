// presets.js — video-level LOOK PRESETS (autostyle v2, 2026-10-03). A preset is DATA that rides on top of the
// director's per-scene look (time, sky, grade keep telling the story clock): Legion stamps `look.preset` on every
// scene of a video (threed.py _video), the engine merges the preset's grade over the scene's grade (look.js grade()),
// tints the atmosphere (look.js resolve()), sets the zero-default post passes (post.js: soft upscale, tilt-shift band,
// cel bands, depth-edge ink, scanlines, levels + dither, depth void), adjusts the PBR materials (main.js, never the
// ShaderMaterials: water, sky, grass and FX keep their own shading — the post passes unify them), may step the world
// clock (stop-motion on twos) and relaxes the engine's exposure / darkness checks where the look is meant to be dark or
// hot. `documentary` (or no preset) is today's engine exactly: every pass is skipped, every threshold is today's.
// Mannequins stay FACELESS in every preset: a preset never touches geometry, only colour and shading.
//
// grade: {mul: {...}, add: {...}, set: {...}} — deltas on the scene's resolved grade (post.js GRADE keys), applied in
// that order; `night` replaces `grade` when the scene's sky is night (env.night > 0.5).
// post:  soft (the frame's height in lines: 448 = the PS2's 640x448, upscaled bilinear), tilt {y, band, feather, px},
//        ca (px), bands (cel luma steps) + bandSoft + bandFlat, edge {amt, px, t, col, add} (depth outline, needs the depth
//        target), void {from, to} metres (depth fade to voidCol), scan (+ scanPx), sweep, levels (+ dither), bloomR.
// atmos: {tint [r,g,b] linear, tintAmt, density x, falloff x, horizon, fogAbs [density, falloff], fogSun x, sky [r,g,b]}
//        — the fog / sky cast of every exterior (sky: a painted sky, no clouds, stars or sun disc).
// material: {rough: [lo, hi] clamp, metal: x, env: x, skin: 0xRRGGBB, toon: bands, toonSoft, look: {...}} — PBR materials
//        (+ the mannequin plaster; toon = cel light: the key's direct diffuse in soft-edged steps; look = main.js LOOK_GLSL:
//        flat (texture mip bias: flat colour fields), nrm (normal-map strength: no fabric / brick micro-detail), pal/sat/gamma/
//        tint (albedo palette push), bump/scale (clay lumps and
//        thumb smudges in the shading), wrap/wrapCol (the light wrapping into the clay past the terminator)).
// ink:   {amt, px (silhouettes), pxC (creases), col, add (hologram: additive light + the void), hdr, rim, dim (the void),
//        fill (inkable surfaces under add), far [m, m], depthK, crease} — outlines from a G-buffer of the inkable objects
//        (main.js drawInk + post.js), accumulated over the sub-frames; amt 0 = only the inkable coverage, for
//        post.bgFlat (+ flatR px): the ground and the plants pressed into flat painterly colour (cel, clay).
// atmos.d50: the distance (m) where the fog has taken half the light (San Andreas' short draw distance).
// shadow: {map: px, soft: x}; render: {shutter}; clock: {step: fps} (the world on twos, the camera smooth);
// world: {tufts: false} (the grass / reed / fern tufts of the biome hidden: a clean field for cel and clay);
// qa: thresholds for the engine's meters and Legion's checks (render.py, threed.py repair) — see QUALITY.md.
import { V3_PRESETS } from './presets_v3.js';   // v3 (WP3): fern, nocturne — merged below (the stub is empty)

export const PRESETS = {
  documentary: null,

  // PlayStation 2 era Los Santos (2004). NOT a PS1 shader: no vertex jitter, no affine warp, no 15-bit dither. The PS2
  // frame is 640x448 upscaled soft (bilinear), lit per vertex (no glossy PBR), under timecyc's colour filter: SkyGfx's
  // PS2 formula gain = 2*postfx1 + 2*postfx2*min(1, 2*alpha2) with EXTRASUNNY_SMOG_LA midday (postfx1 66/66/48, postfx2
  // 128/111/83, alpha 255) = R 1.52, G 1.39, B 1.03; exposure pulled down -> gain 1.25 / 1.07 / 0.70 (fix round: the
  // first pass read as a pale yellow haze); the "radiosity" glow (bright walls and skies bloom wide, threshold low),
  // and the smog: fog colour = the sky's bottom, a SHORT draw distance (half the light gone by ~210 m), the city
  // dissolving into a brown-orange haze. Labels may take a darker plate (the smog sky is bright behind them).
  san_andreas: {
    desc: 'PS2-era San Andreas: a soft 448-line frame upscaled bilinear, the orange timecyc colour filter, radiosity glow, a short brown-orange smog, matte vertex-lit materials',
    stylised: true, tragedy_ok: false,
    grade: { mul: { gain: [1.25, 1.07, 0.7], exposure: 0.95 }, add: { lift: [0.03, 0.02, 0.004], shadowTint: [0.012, 0.004, -0.008] },
      set: { grain: 0, vignette: 0.16, bloom: 0.32, bloomT: 1.2, bloomR: 0.62, contrast: 1.1, shoulder: 0.76, sat: 1.04 } },
    night: { mul: { gain: [0.95, 0.98, 1.06], sat: 0.95 }, add: { lift: [0.01, 0.01, 0.016] },
      set: { grain: 0, vignette: 0.16, bloom: 0.36, bloomT: 1.5, bloomR: 0.6, contrast: 1.04, shoulder: 0.82 } },
    post: { soft: 448 },
    atmos: { tint: [0.66, 0.5, 0.3], tintAmt: 0.82, d50: 210, falloff: 0.5, horizon: 0.72 },
    material: { rough: [0.84, 1], metal: 0.3, env: 0.3 },
    shadow: { map: 1024, soft: 2.2 },
    render: { shutter: 0.22 },
    qa: { hot_start: 0.3, hot_target: 0.18, hot_area: 0.3, face_white: 0.2, face_mean: 220, scrim_max: 0.84, label_cr: 2.0 },
  },

  // Film noir: black and white, crushed blacks and hot practicals, a hard key (crisp shadows), smoky air, heavy grain.
  noir: {
    desc: 'black-and-white film noir: crushed blacks, hot highlights, a hard key light with crisp shadows, smoky air, heavy grain',
    stylised: false, tragedy_ok: true,
    grade: { mul: { exposure: 1.12 }, set: { mono: 1, ink: [0.008, 0.008, 0.01], paper: [0.94, 0.935, 0.91], contrast: 1.22, vignette: 0.48,
      grain: 0.034, bloom: 0.3, lift: [0.008, 0.008, 0.008], sat: 1 } },
    atmos: { tint: [0.5, 0.5, 0.5], tintAmt: 0.3, density: 1.7, falloff: 0.8, horizon: 0.2 },
    shadow: { soft: 0.35 },
    qa: { dark_p90: 40, floor_p90: 46, repair_p90: 30, repair_lit: 0.025, hot_start: 0.14, hot_target: 0.08 },
  },

  // Tilt-shift miniature: a narrow sharp band across the hero, the rest melting into a strong lens blur (34 px at 1080p),
  // toy colours (saturation x1.6, contrast up, a bright sun), glossy-plastic materials, the world moving on twos like a
  // model railway (the camera stays smooth). Staged from high angles in bright daylight (the director is told).
  diorama: {
    desc: 'tilt-shift miniature world: a narrow sharp band across the hero, strong lens blur above and below, toy-bright saturated colours, glossy plastic, the world on twos',
    stylised: true, tragedy_ok: false,
    grade: { mul: { sat: 1.6, exposure: 1.12, gain: [1.03, 1.0, 0.97] }, add: { lift: [0.006, 0.006, 0.008] },
      set: { contrast: 1.2, vignette: 0.16, grain: 0.004, bloom: 0.22, bloomT: 1.6, shoulder: 0.84 } },
    post: { tilt: { y: 0.52, band: 0.07, feather: 0.2, px: 34 } },
    material: { rough: [0.32, 0.62], env: 1.15, look: { pal: 1, sat: 1.25, gamma: 0.92, tint: [1.02, 1.0, 0.98] } },
    clock: { step: 15 },
    render: { shutter: 0 },
    shadow: { soft: 0.7 },
    qa: { hot_start: 0.16, hot_target: 0.09, hot_area: 0.12 },
  },

  // Cel / graphic novel: the key light in two hard steps (lit / shadow) inside the materials, flat colour fields (the
  // textures read from a blurred mip), black ink lines from a G-buffer of the CAST, VEHICLES, BUILDINGS and PROPS only
  // (never terrain, grass or foliage: no speckle), accumulated over the sub-frames (antialiased), no shine, no grain.
  cel: {
    desc: 'cel-shaded graphic novel: the light in two hard steps, flat colour fields, black ink outlines on figures, vehicles and buildings, matte, crisp (no motion blur, no grain)',
    stylised: true, tragedy_ok: false,
    grade: { mul: { sat: 1.3 }, set: { grain: 0, vignette: 0.06, contrast: 1.08, bloom: 0.06, shoulder: 0.9 } },
    post: { bgFlat: 1, flatR: 6 },                     // (fix round: luma bands on the ground read as camo / polka dots — off)
    world: { tufts: false },                           // no grass tufts: a clean painted field (they band into camo)
    ink: { amt: 0.95, px: 3.2, pxC: 1.6, col: [0.028, 0.024, 0.032], far: [160, 480], depthK: 0.035, crease: 0.74 },
    material: { rough: [0.92, 1], metal: 0.2, env: 0.3, toon: 2, toonSoft: 0.05, look: { flat: 8, nrm: 0.2, pal: 1, sat: 1.18, gamma: 0.94, tint: [1, 1, 1] } },
    render: { shutter: 0 },
    shadow: { soft: 0.45 },
    qa: { hot_area: 0.12 },
  },

  // Clay: a stop-motion set — plasticine on every surface (a soft terminator glow where the light wraps into the clay,
  // thumb-pressed lumps and smudges in the shading, textures pressed flat, a saturated putty palette), the faceless
  // puppet in warm putty, soft warm studio light, a shallow miniature focus, the world on twos (15 fps steps at 30
  // fps), no motion blur, a little grain and a soft vignette.
  clay_lite: {
    desc: 'stop-motion clay set: plasticine on every surface (thumb-pressed lumps, soft wrap light, flat pressed colours), putty faceless puppets, warm studio light, shallow focus, the world on twos',
    stylised: true, tragedy_ok: false,
    grade: { mul: { sat: 1.12, exposure: 0.97, gain: [1.05, 1.0, 0.92] }, add: { lift: [0.022, 0.016, 0.01] },
      set: { contrast: 1.08, vignette: 0.32, grain: 0.012, bloom: 0.14, shoulder: 0.82 } },
    post: { tilt: { y: 0.5, band: 0.1, feather: 0.28, px: 16 }, bgFlat: 0.8, flatR: 8 },
    ink: { amt: 0 },                                   // no lines: only the G-buffer's coverage (the ground is pressed flat, the props are not)
    world: { tufts: false },                           // no grass tufts: a smooth modelled ground
    material: { rough: [0.45, 0.72], metal: 0.08, env: 0.45, skin: 0xE2B48C,
      look: { flat: 8, nrm: 0, pal: 1, sat: 1.4, gamma: 0.8, tint: [1.04, 0.99, 0.92], bump: 1.8, scale: 0.65, wrap: 0.6, wrapCol: [1.0, 0.46, 0.32] } },
    clock: { step: 15 },
    render: { shutter: 0 },
    shadow: { soft: 2.2 },
    qa: { face_white: 0.2 },
  },

  // QUEST — the 3D video game (learned 2026-10-04 from the founder's "every level of the Roman army" reference): a bright toy
  // world in daylight, chibi figures WITH faces (lib/game claims every person of the scene: `figure: 'chibi'`), soft sun
  // shadows, a clean lifted grade with a little more colour, a soft bloom on the chrome and gold, no grain. The realistic
  // cloud slab is capped (lib/game's world draws puffy cartoon clouds). Faces are the look here, so the face QA is relaxed.
  game: {
    desc: 'QUEST 3D video game: a bright low-poly toy world, chibi figures with faces (big heads, dot eyes, blush), soft sun shadows, clean saturated colour, gentle bloom on gold and chrome, no grain',
    stylised: true, tragedy_ok: false, figure: 'chibi',
    grade: { mul: { sat: 1.1, exposure: 1.06 }, add: { lift: [0.01, 0.012, 0.016] },
      set: { contrast: 1.03, vignette: 0.07, grain: 0, bloom: 0.12, bloomT: 1.5, shoulder: 0.9 } },
    night: { mul: { sat: 1.0, exposure: 1.15 }, add: { lift: [0.012, 0.014, 0.03] }, set: { contrast: 1.0, vignette: 0.12, grain: 0, bloom: 0.2, shoulder: 0.88 } },
    atmos: { cloud: 0 },
    shadow: { soft: 1.6 },
    qa: { hot_start: 0.2, hot_target: 0.12, hot_area: 0.14, face_white: 0.4, face_mean: 242 },
  },

  // Hologram: an evidence-room projection — the cast, vehicles and buildings as cyan light (glowing edges from the ink
  // G-buffer + a fresnel rim, both blooming), everything else (terrain, grass, trees) sunk into the dark void, a black
  // sky, distance fog into black, scanlines, a slow scan sweep and a little chromatic split.
  hologram: {
    desc: 'holographic projection: the subject as cyan light with glowing edges and rim on a dark void (ground and plants sunk into the dark), scanlines and a slow scan sweep',
    stylised: true, tragedy_ok: false,
    grade: { mul: { exposure: 1.1 }, set: { mono: 1, ink: [0.004, 0.012, 0.026], paper: [0.5, 0.95, 1.0], contrast: 1.1,
      vignette: 0.42, grain: 0.012, bloom: 0.55, bloomT: 1.4, bloomR: 0.55, sat: 1 } },
    night: { mul: { exposure: 0.55 }, set: { mono: 1, ink: [0.004, 0.012, 0.026], paper: [0.5, 0.95, 1.0], contrast: 1.12,
      vignette: 0.42, grain: 0.012, bloom: 0.4, bloomT: 2.2, bloomR: 0.5, sat: 1 } },
    post: { scan: 0.1, scanPx: 3, sweep: 0.05, ca: 0.8 },
    ink: { amt: 1, px: 1.5, col: [0.62, 0.96, 1.0], add: 1, hdr: 1.9, rim: 0.55, dim: 0.12, fill: 0.28, far: [320, 900], depthK: 0.03, crease: 0.8 },
    atmos: { tint: [0.0, 0.0, 0.0], tintAmt: 1, fogAbs: [0.003, 0.0004], fogSun: 0, sky: [0.0, 0.0, 0.0] },
    shadow: { soft: 1.2 },
    qa: { dark_p90: 14, floor_p90: 16, repair_p90: 14, repair_lit: 0.012, repair_std: 2.5 },
  },
};
Object.assign(PRESETS, V3_PRESETS);

// the preset of a look block: null for documentary / none / an unknown name (unknown names warn)
export function presetOf(name, warn) {
  if (name == null || name === '' || name === 'documentary') return null;
  const P = PRESETS[name];
  if (!P) { if (warn) warn(`look.preset '${name}' unknown, using documentary`); return null; }
  return Object.assign({ id: name }, P);
}

// does this preset's post need the depth target (the old depth edges, void)? (no preset uses them since the fix round)
export function needsInk(P) { return !!(P && P.ink); }             // the G-buffer pass (lines when ink.amt > 0, else coverage only)
export function needsDepth(P) { return !!(P && P.post && ((P.post.edge && P.post.edge.amt > 0) || P.post.void)); }

// the preset over a resolved scene grade (in place): mul, add, set (night rows when the scene is night), then the post
// pass settings. L: the resolved look (env.night)
export function presetGrade(g, P, L) {
  if (!P) return g;
  const G = (P.night && L && L.env && L.env.night > 0.5) ? P.night : P.grade;
  if (G) {
    for (const [k, v] of Object.entries(G.mul || {})) g[k] = Array.isArray(v) ? g[k].map((x, i) => x * v[i]) : g[k] * v;
    for (const [k, v] of Object.entries(G.add || {})) g[k] = Array.isArray(v) ? g[k].map((x, i) => x + v[i]) : g[k] + v;
    for (const [k, v] of Object.entries(G.set || {})) g[k] = Array.isArray(v) ? v.slice() : v;
  }
  if (P.post) {
    Object.assign(g, JSON.parse(JSON.stringify(P.post)));
    g.labelMask = !!(P.post.soft || P.post.tilt || P.post.ca || P.post.bands || P.post.bandFlat || P.post.edge);   // main.js renders the labels' mask
  }
  if (P.ink) { g.outline = JSON.parse(JSON.stringify(P.ink)); g.labelMask = true; }   // grade.outline (grade.ink is the mono ink colour); never across a label
  return g;
}

// the catalog's description (render.py --catalog -> catalog.json "presets"; Legion reads the qa thresholds there)
export function presetDoc() {
  const out = { documentary: { desc: "today's look: stylized realism, faceless white mannequins, film light (no preset)", stylised: false, tragedy_ok: true, qa: {} } };
  for (const [k, P] of Object.entries(PRESETS)) if (P) out[k] = { desc: P.desc, stylised: !!P.stylised, tragedy_ok: P.tragedy_ok !== false, qa: P.qa || {} };
  return out;
}
