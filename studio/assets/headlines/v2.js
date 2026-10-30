/* v2.js — HEADLINES with a skin per title (autostyle v2). A superset of page.js, which stays exactly as it is:
   with today's palette (no v2 keys) this draws what page.js draws. A skin (headlines.SKINS) may set, in PAL:
     page / bgFilter     CSS filters on the photographed page and on the blurred copy behind it
     desk                the surface a printed page lies on ("paper" variant)
     light               a light stage (clean web) instead of dark space
     mark                "highlight" (today: a red pen line on printed paper) | "highlighter" (a highlighter on every
                         variant) | "underline" (a solid accent line) | "pen" (circled in red pen) | "box" (a lit frame)
     markBlend, pen      how the marker mixes with the ink; the pen's ink
     ghost, sheen        today's RGB split and sheen on the window's landing (off for most skins)
     grain, dimA         grain opacity; how far the rest of the page sinks back
     lamp                a warm pool of desk-lamp light over the page (soft-light)
     lampShade           the warm dark beyond the lamp's pool, on screen (multiply) — the close-up stays lamp-lit
     reader              a microfilm reader's round falloff inside the page
     pageVig             a page's own falloff toward its edges (instead of the reader's)
     paperTex            opacity of a paper fibre texture multiplied over the page (newsprint)
     scan                the colour of the scan line ("scan" variant)
     press               {page, desk, pen, grain} for old newspapers under this skin
     creditFont, creditShadow
   Same contract as every Legion scene: window.renderFrame(t) draws frame t from t alone. Globals: SCENE, PAL, W, H. */
"use strict";

const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const seg = (t, s, d) => cl((t - s) / Math.max(1e-4, d), 0, 1);
const lerp = (a, b, p) => a + (b - a) * p;
const eOut = p => 1 - Math.pow(1 - p, 3);
const eInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const eSine = p => -(Math.cos(Math.PI * p) - 1) / 2;
const ss = p => p * p * (3 - 2 * p);
const $ = id => document.getElementById(id);
const D = SCENE.duration || 6.5;
const V = ["window", "paper", "scan", "press"].includes(SCENE.variant) ? SCENE.variant : "window";
const HIT = cl(SCENE.hit == null ? 1.3 : SCENE.hit, 0.6, Math.max(0.6, D - 2.6));
const MARK = PAL.mark || "highlight";
const PR = (V === "press" && PAL.press) || null;

/* ── geometry: image pixels -> the window's own CSS pixels ─────────────── */
const BASE_W = 1480;
const K = BASE_W / SCENE.img_w, WIN_H = SCENE.img_h * K;
const LINES = (SCENE.lines || []).map(l => ({ x: l.x * K, y: l.y * K, w: l.w * K, h: l.h * K }));
const BOX = LINES.length
  ? LINES.reduce((b, l) => ({ x0: Math.min(b.x0, l.x), y0: Math.min(b.y0, l.y), x1: Math.max(b.x1, l.x + l.w), y1: Math.max(b.y1, l.y + l.h) }),
                 { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 })
  : { x0: BASE_W * 0.2, y0: WIN_H * 0.3, x1: BASE_W * 0.8, y1: WIN_H * 0.4 };
const OX = (BOX.x0 + BOX.x1) / 2, OY = (BOX.y0 + BOX.y1) / 2;      /* the camera looks at the headline */
const BW = BOX.x1 - BOX.x0, BH = BOX.y1 - BOX.y0;

const win = $("win"), shot = $("shot"), dof = $("dof"), dim = $("dim"), sheen = $("sheen"), bg = $("bg");
const ghostR = $("ghostR"), ghostC = $("ghostC");
win.style.width = BASE_W + "px"; win.style.height = WIN_H + "px";
win.style.transformOrigin = `${OX}px ${OY}px`;
if (PAL.light) {
  /* a clean light stage: the page floats on pale grey with a soft drop shadow */
  win.style.boxShadow = "0 40px 110px rgba(20,25,35,.26), 0 0 0 1px rgba(0,0,0,.06)";
  $("credit").style.textShadow = "none";
}
if (PAL.bgFilter) bg.style.filter = PAL.bgFilter;
if (PAL.page) { shot.style.filter = PAL.page; dof.style.filter = PAL.page + " blur(7px)"; }
if (PAL.creditFont) $("credit").style.font = PAL.creditFont;
if (PAL.creditShadow) $("credit").style.textShadow = PAL.creditShadow;
if (V === "paper") {
  win.style.borderRadius = "3px";
  win.style.boxShadow = "0 40px 90px rgba(0,0,0,.6), 0 4px 10px rgba(0,0,0,.35)";
  $("stage").style.background = PAL.desk || "radial-gradient(ellipse at 45% 40%, #3a2e24 0%, #1f1813 60%, #0e0b09 100%)";
  bg.style.display = "none";
  const pf = PAL.page || "sepia(.28) saturate(.85) contrast(1.04) brightness(.97)";   /* ink on paper, not a screen */
  shot.style.filter = dof.style.filter = pf;
  dof.style.filter += " blur(7px)";
}
if (V === "scan") {
  win.style.borderRadius = "6px";
}
if (V === "press") {
  /* an old newspaper: the scan lies flat on black, warm and grainy, no browser bar, no marker — the paper
     itself is the graphic; the camera lands on the whole page and pushes in on the headline */
  win.style.borderRadius = "2px";
  win.style.boxShadow = "0 50px 120px rgba(0,0,0,.7), 0 2px 6px rgba(0,0,0,.4)";
  $("stage").style.background = (PR && PR.desk) || "#050505";
  bg.style.display = "none";
  shot.style.filter = (PR && PR.page) || "sepia(.22) saturate(.8) contrast(1.06) brightness(.96)";
  dof.style.display = "none";
  $("grain").style.opacity = String((PR && PR.grain != null) ? PR.grain : ".09");
} else if (PAL.grain != null) {
  $("grain").style.opacity = String(PAL.grain);
}
for (const im of [shot, dof, bg, ghostR, ghostC]) im.src = SCENE.image;
/* Depth of field: a blurred copy of the page with a hole where the headline is. The blur
   and the mask never change, so Chromium rasterises them once; only its opacity moves. */
const mx = (OX / BASE_W * 100).toFixed(2), my = (OY / WIN_H * 100).toFixed(2);
const holeW = Math.max(BW * 0.75, 420), holeH = Math.max(BH * 1.6, 260);
dof.style.maskImage = dof.style.webkitMaskImage =
  `radial-gradient(${holeW}px ${holeH}px at ${mx}% ${my}%, transparent 55%, #000 100%)`;

/* the marker: one bar per line of the headline, under the ink (multiply) */
const bars = LINES.map((l, i) => {
  const b = document.createElement("div");
  b.className = "bar";
  const padX = Math.max(8, l.h * 0.14), top = l.y + l.h * 0.10, h = l.h * 0.84;
  Object.assign(b.style, { left: (l.x - padX) + "px", top: top + "px", width: (l.w + padX * 2) + "px", height: h + "px",
                           background: PAL.marker, transform: "scaleX(0)", borderRadius: (h * 0.18) + "px" });
  if (PAL.markBlend) b.style.mixBlendMode = PAL.markBlend;
  if (V === "paper" && MARK === "highlight") {
    /* a red pen line under the words instead of a highlighter */
    Object.assign(b.style, { top: (l.y + l.h * 0.86) + "px", height: Math.max(5, l.h * 0.1) + "px", background: PAL.pen || "#C8321F",
                             mixBlendMode: "multiply", borderRadius: "6px", opacity: "0.92" });
  }
  if (MARK === "underline") {
    /* a solid line in the accent under each line of the headline */
    Object.assign(b.style, { top: (l.y + l.h * 0.94) + "px", height: Math.max(4, l.h * 0.075) + "px", mixBlendMode: "normal",
                             borderRadius: "2px", opacity: "1" });
  }
  if (MARK === "pen" || MARK === "box") b.style.display = "none";
  if (SCENE.dark && (MARK === "highlight" || MARK === "highlighter")) {
    /* light type on a dark page: the bar lights the dark behind the letters instead of
       multiplying into them, and a solid stroke underlines the line */
    b.style.mixBlendMode = "screen";
    b.style.opacity = "0.62";
    const u = document.createElement("div");
    u.className = "bar";
    Object.assign(u.style, { left: (l.x - padX) + "px", top: (l.y + l.h * 0.9) + "px", width: (l.w + padX * 2) + "px",
                             height: Math.max(4, l.h * 0.09) + "px", background: PAL.marker, mixBlendMode: "normal",
                             transform: "scaleX(0)", borderRadius: "3px" });
    b.under = u;
    win.appendChild(u);
  }
  win.appendChild(b);
  return b;
});

/* red pen: the headline circled by hand — an uneven loop drawn in one stroke, overlapping where it closes */
const SVGNS = "http://www.w3.org/2000/svg";
let pen = null, penLen = 0;
const wantPen = MARK === "pen" && V !== "press" || (V === "press" && PR && PR.pen);
if (wantPen && LINES.length) {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("width", BASE_W); svg.setAttribute("height", WIN_H);
  Object.assign(svg.style, { position: "absolute", left: "0", top: "0", overflow: "visible", pointerEvents: "none",
                             mixBlendMode: SCENE.dark ? "normal" : "multiply" });
  /* a squarish loop (superellipse, n = 3.2) with room round the words, so it never cuts through a letter */
  const rx = BW / 2 + Math.max(40, BW * 0.1), ry = BH / 2 + Math.max(30, BH * 0.35), N = 3.2;
  const sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), 2 / N);
  const seed = (SCENE.seed || 7) * 0.37, pts = [];
  const a0 = -2.5 + seed % 0.6, turn = 2 * Math.PI + 0.55;
  const strokes = [pts];
  if (V === "press") {
    /* an old paper is framed tight on its headline: two hand-drawn strokes under it instead of a loop round it */
    const yb = BOX.y1 + Math.max(8, BH * 0.06), x0 = BOX.x0 - BW * 0.02, x1 = BOX.x1 + BW * 0.02;
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      pts.push([lerp(x0, x1, p), yb + 3 * Math.sin(p * 5.1 + seed) - 6 * p]);
    }
    const second = [];
    for (let i = 0; i <= 30; i++) {
      const p = i / 30;
      second.push([lerp(x0 + BW * 0.12, x1 - BW * 0.1, p), yb + Math.max(12, BH * 0.09) + 2.5 * Math.sin(p * 4.3 + 2 * seed) - 4 * p]);
    }
    strokes.push(second);
  } else {
    for (let i = 0; i <= 120; i++) {
      const a = a0 + turn * i / 120;
      const wob = 1 + 0.025 * Math.sin(3 * a + seed) + 0.015 * Math.sin(7 * a + 2 * seed);
      const grow = 1 + 0.05 * i / 120;                        /* a hand's loop does not close on itself */
      const x = OX + rx * sp(Math.cos(a)) * wob * grow, y = OY + ry * sp(Math.sin(a)) * wob * grow;
      const rot = -0.035;                                    /* a slight tilt, like a pen held at an angle */
      pts.push([OX + (x - OX) * Math.cos(rot) - (y - OY) * Math.sin(rot), OY + (x - OX) * Math.sin(rot) + (y - OY) * Math.cos(rot)]);
    }
  }
  /* one path per stroke, each drawn in turn (a dash pattern is not trusted to run on across sub-paths) */
  pen = strokes.map(s => {
    const el = document.createElementNS(SVGNS, "path");
    el.setAttribute("d", "M" + s.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" L"));
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", PAL.pen || "#C8321F");
    el.setAttribute("stroke-width", Math.max(5, Math.min(11, BH * 0.07)).toFixed(1));
    el.setAttribute("stroke-linecap", "round"); el.setAttribute("stroke-linejoin", "round");
    el.style.opacity = "0.9";
    let len = 0;
    for (let i = 1; i < s.length; i++) len += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    el.setAttribute("stroke-dasharray", `${len} ${len}`);
    el.setAttribute("stroke-dashoffset", String(len));
    svg.appendChild(el);
    penLen += len;
    return { el, len };
  });
  win.appendChild(svg);
}
/* the pen's strokes drawn one after the other between `at` and `at + dur`, each for its share of the length */
function drawPen(t, at, dur) {
  if (!pen) return;
  let start = at;
  for (const p of pen) {
    const d = dur * p.len / Math.max(1, penLen);
    const q = ss(seg(t, start, d));
    p.el.setAttribute("stroke-dashoffset", (p.len * (1 - q)).toFixed(2));
    p.el.style.opacity = q > 0 ? "0.9" : "0";            /* an undrawn stroke's round cap would show as a dot */
    start += d + 0.08;
  }
}
/* box: a reader's highlight — a lit frame round the headline */
let boxM = null;
if (MARK === "box" && LINES.length) {
  boxM = document.createElement("div");
  const pad = Math.max(14, BH * 0.18);
  Object.assign(boxM.style, { position: "absolute", left: (BOX.x0 - pad) + "px", top: (BOX.y0 - pad * 0.8) + "px",
    width: (BW + pad * 2) + "px", height: (BH + pad * 1.6) + "px", border: `3px solid ${PAL.marker}`,
    background: PAL.boxFill || "rgba(200,255,235,.10)", mixBlendMode: "screen", pointerEvents: "none", opacity: "0" });
  win.appendChild(boxM);
}
win.appendChild(dof); win.appendChild(dim); win.appendChild(sheen);   /* above the marker, inside the window */
let reader = null;
if ((PAL.reader || PAL.pageVig) && V !== "window") {
  /* a microfilm reader: the light falls off toward the edges of its screen; newsprint: the sheet darkens toward
     its edges like a page under one light */
  reader = document.createElement("div");
  Object.assign(reader.style, { position: "absolute", inset: "0", pointerEvents: "none",
    background: PAL.pageVig || "radial-gradient(ellipse 72% 80% at 50% 48%, rgba(0,0,0,0) 46%, rgba(0,0,0,.62) 100%)" });
  win.appendChild(reader);
}
if (PAL.paperTex && V !== "window") {
  /* the page's own paper: fibre and mottling multiplied over the print (an SVG noise, rasterised once), under the
     marker — newsprint is grey and soft, never a clean white screen */
  const svgTex = "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'><filter id='n'>" +
    "<feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' seed='4'/>" +
    "<feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0 0.32  0 0 0 0.6 0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
  const tex = document.createElement("div");
  Object.assign(tex.style, { position: "absolute", inset: "0", pointerEvents: "none", mixBlendMode: "multiply",
    opacity: String(PAL.paperTex), background: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgTex)}")` });
  win.insertBefore(tex, shot.nextSibling);
}
const pad = 26;
Object.assign(dim.style, { left: (BOX.x0 - pad) + "px", top: (BOX.y0 - pad * 0.8) + "px",
                           width: (BW + pad * 2) + "px", height: (BH + pad * 1.6) + "px" });
let lamp = null;
if (PAL.lamp) {
  /* a desk lamp's warm pool over the page and the desk */
  lamp = document.createElement("div");
  Object.assign(lamp.style, { position: "absolute", inset: "0", pointerEvents: "none", background: PAL.lamp, mixBlendMode: "soft-light" });
  $("stage").insertBefore(lamp, $("vig"));
}
if (PAL.lampShade) {
  /* ... and the warm dark beyond it: the lamp lights the headline, the rest of the page falls away into the room —
     in the close-up too, where the desk is out of the shot */
  const shade = document.createElement("div");
  Object.assign(shade.style, { position: "absolute", inset: "0", pointerEvents: "none", background: PAL.lampShade, mixBlendMode: "multiply" });
  $("stage").insertBefore(shade, $("vig"));
}

/* ── camera ────────────────────────────────────────────────────────────── */
/* the close-up: the headline about two thirds of the frame, the window's edge still in the
   shot so it reads as a page lying in space, not a screen recording */
const s1 = cl(Math.min(W * 0.64 / BW, H * 0.40 / BH), 0.9, 2.6);
const s0 = Math.min(W * 0.74 / BASE_W, H * 0.9 / Math.min(WIN_H, 1150));          /* the whole window */
/* where the headline sits on screen: first where it falls in a centred window, then centre stage */
const P0 = [W / 2 + (OX - BASE_W / 2) * s0, H * 0.52 + (OY - Math.min(WIN_H, 1150) * 0.46) * s0];
const P1 = [W / 2, H * 0.47];
const nLines = Math.max(1, LINES.length);
const SWEEP = 0.42, STAGGER = 0.3;
const MARK_END = HIT + (nLines - 1) * STAGGER + SWEEP;

/* ── film grain, drawn once and shaken per frame ───────────────────────── */
let _s = (SCENE.seed || 7) >>> 0;
const rnd = () => { _s = (_s * 1664525 + 1013904223) % 4294967296; return _s / 4294967296; };
(() => {
  const c = $("grain"), g = c.getContext("2d");
  c.width = 512; c.height = 512;
  const im = g.createImageData(512, 512);
  for (let i = 0; i < im.data.length; i += 4) { const v = rnd() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0);
})();

const scanBar = document.createElement("div");
const SC = PAL.scan || "rgba(255,246,200,.55)";
Object.assign(scanBar.style, { position: "absolute", left: "0", width: "100%", height: "140px", pointerEvents: "none",
  background: `linear-gradient(180deg, transparent, rgba(255,255,255,.0) 30%, ${SC} 50%, rgba(255,255,255,.0) 70%, transparent)`,
  mixBlendMode: "screen", display: "none" });
win.appendChild(scanBar);

const DIM_A = PAL.dimA != null ? +PAL.dimA : null;
function markers(t, markAt, sweep) {
  bars.forEach((b, i) => {
    const btf = `scaleX(${eOut(seg(t, markAt + i * STAGGER, sweep)).toFixed(4)})`;
    b.style.transform = btf;
    if (b.under) b.under.style.transform = btf;
  });
  drawPen(t, markAt, 0.85);
  if (boxM) {
    const p = ss(seg(t, markAt, 0.45));
    boxM.style.opacity = p.toFixed(3);
    boxM.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`;
  }
}

function frameAlt(tt) {
  /* the newspaper moves at a projector's frame rate; everything else at the video's */
  const t = (V === "press" && !SCENE.smooth) ? Math.floor(tt * 15 + 1e-6) / 15 : tt;
  const fin = cl(t / 0.3, 0, 1), fout = cl((D - t) / 0.4, 0, 1);
  $("stage").style.opacity = Math.min(fin, fout).toFixed(3);
  let tf;
  if (V === "press") {
    /* the reference look: already close on the paper — the headline across most of the frame and the first lines
       readable — landing with a quick settle, then a slow drift down and across the column for the whole scene, the
       paper a hair askew, so the eye reads the print as it moves */
    const u = eOut(seg(t, 0.0, 0.8));
    const sHead = cl(Math.min(W * 0.86 / BW, H * 0.30 / BH), 1.2, 3.4);
    /* the page must cover the frame at every moment: never smaller than the frame, and the drift stops where the
       paper ends (a clipping whose headline sits low once drifted off its bottom edge onto the empty ground) */
    const sMin = Math.max(W / BASE_W, H / WIN_H) * 1.06;
    const s = Math.max(sHead * (1.14 - 0.14 * u), sMin);
    const drift = eInOut(seg(t, 0.6, Math.max(0.8, D - 1.0)));
    const travel = Math.min(WIN_H * s * 0.30, 460);
    let px = W / 2 + (1 - drift) * 40 - drift * Math.min(BW * s * 0.12, 120);
    let py = H * 0.42 - drift * travel;
    const mX = W * 0.05, mY = H * 0.07;                     /* room for the tilt and the askew angle */
    const pxLo = W + mX - (BASE_W - OX) * s, pxHi = OX * s - mX;
    const pyLo = H + mY - (WIN_H - OY) * s, pyHi = OY * s - mY;
    px = cl(px, Math.min(pxLo, pxHi), Math.max(pxLo, pxHi));
    py = cl(py, Math.min(pyLo, pyHi), Math.max(pyLo, pyHi));
    const rz = -1.2 + 0.5 * drift;
    tf = `translate(${(px - OX).toFixed(2)}px, ${(py - OY).toFixed(2)}px) perspective(3000px) rotateX(${lerp(7, 3, u).toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    win.style.opacity = "1";
    win.style.filter = "none";
    win.style.transform = tf;
    for (const el of [ghostR, ghostC]) el.style.display = "none";
    bars.forEach(b => { b.style.transform = "scaleX(0)"; if (b.under) b.under.style.transform = "scaleX(0)"; });
    drawPen(tt, HIT + 0.5, 0.9);
    dim.style.boxShadow = "none";
    sheen.style.opacity = "0";
    const f = Math.floor(t * 15);
    $("grain").style.transform = `translate(${-((f * 173) % 256)}px, ${-((f * 97) % 256)}px)`;
    $("credit").style.opacity = eOut(seg(t, HIT + 0.9, 0.6)).toFixed(3);
    return;
  }
  if (V === "paper") {
    /* slides in from the lower right, turning flat; the camera glides along the headline */
    const slide = eOut(seg(t, 0.0, 0.9));
    const u = eInOut(seg(t, 0.5, Math.max(0.6, HIT - 0.2)));
    const s = s0 * Math.pow(s1 * 0.92 / s0, u) * (1 + 0.03 * eSine(seg(t, HIT, D - HIT)));
    const glide = lerp(BW * 0.18, -BW * 0.18, eInOut(seg(t, HIT - 0.3, D - HIT)));
    const px = lerp(P0[0] + 420, P1[0], u) + (1 - slide) * 520 + glide * s * 0.35;
    const py = lerp(P0[1] + 160, P1[1], u) + (1 - slide) * 360;
    const rz = lerp(-7, -3.2, u) + (1 - slide) * -6;
    tf = `translate(${(px - OX).toFixed(2)}px, ${(py - OY).toFixed(2)}px) perspective(2600px) rotateX(${lerp(24, 15, u).toFixed(3)}deg) ` +
         `rotateZ(${rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    win.style.opacity = slide.toFixed(3);
    win.style.filter = "none";
    dof.style.opacity = (0.8 * eInOut(seg(t, HIT - 0.4, 0.9))).toFixed(3);
  } else {
    /* scan: flat and square to the camera; a scan line finds the headline, then a straight push in */
    const appear = eOut(seg(t, 0.0, 0.5));
    const u = eInOut(seg(t, HIT - 0.15, 1.0));
    const s = s0 * 0.96 * Math.pow(s1 / (s0 * 0.96), u) * (1 + 0.015 * eSine(seg(t, HIT + 0.9, D - HIT)));
    const px = lerp(W / 2 + (OX - BASE_W / 2) * s0 * 0.96, P1[0], u), py = lerp(H * 0.5 + (OY - Math.min(WIN_H, 1150) * 0.5) * s0 * 0.96, P1[1], u);
    tf = `translate(${(px - OX).toFixed(2)}px, ${(py - OY).toFixed(2)}px) scale(${s.toFixed(4)})`;
    win.style.opacity = appear.toFixed(3);
    win.style.filter = "none";
    const sc = seg(t, 0.25, Math.max(0.5, HIT - 0.4));
    scanBar.style.display = sc > 0 && sc < 1 ? "block" : "none";
    scanBar.style.top = (lerp(-140, OY - 70, eInOut(sc))).toFixed(1) + "px";
    dof.style.opacity = (0.95 * eInOut(seg(t, HIT + 0.2, 0.8))).toFixed(3);
  }
  win.style.transform = tf;
  for (const el of [ghostR, ghostC]) el.style.display = "none";
  const markAt = V === "scan" ? HIT + 0.9 : HIT;
  markers(t, markAt, V === "paper" ? SWEEP * 1.4 : SWEEP);
  const end = markAt + (nLines - 1) * STAGGER + SWEEP;
  const dA = DIM_A != null ? DIM_A : (V === "paper" ? 0.25 : 0.42);
  dim.style.boxShadow = `0 0 0 6000px rgba(${PAL.dim}, ${(dA * eOut(seg(t, end + 0.1, 0.7))).toFixed(3)})`;
  sheen.style.opacity = "0";
  bg.style.transform = `scale(${(1.18 + 0.06 * t / D).toFixed(4)})`;
  const f = Math.floor(t * 30);
  $("grain").style.transform = `translate(${-((f * 173) % 256)}px, ${-((f * 97) % 256)}px)`;
  $("credit").style.opacity = eOut(seg(t, end + 0.2, 0.6)).toFixed(3);
}

window.renderFrame = t => {
  if (V !== "window") { frameAlt(t); return; }
  const fin = cl(t / 0.3, 0, 1), fout = cl((D - t) / 0.4, 0, 1);
  $("stage").style.opacity = Math.min(fin, fout).toFixed(3);

  /* the window rises in, then the camera pushes in on the headline */
  const rise = eOut(seg(t, 0.0, 0.75));
  const u = eInOut(seg(t, 0.35, Math.max(0.6, HIT + 0.15 - 0.35)));
  let s = s0 * Math.pow(s1 / s0, u);
  s *= 1 + 0.022 * eSine(seg(t, HIT, D - HIT));                              /* never quite still */
  s *= 1 + 0.018 * Math.sin(Math.PI * seg(t, MARK_END - 0.05, 0.4));        /* a small punch as the marker lands */
  const px = lerp(P0[0], P1[0], u), py = lerp(P0[1], P1[1], u) + (1 - rise) * 190;
  const rx = lerp(12, 4.5, u) + (1 - rise) * 6, ry = lerp(-18, -7.5, u) + 2.2 * eSine(seg(t, HIT, D - HIT));
  const tf = `translate(${(px - OX).toFixed(2)}px, ${(py - OY).toFixed(2)}px) perspective(2200px) ` +
             `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  win.style.transform = tf;
  win.style.opacity = rise.toFixed(3);
  win.style.filter = rise < 1 ? `blur(${((1 - rise) * 10).toFixed(2)}px)` : "none";
  dof.style.opacity = (0.95 * eInOut(seg(t, HIT - 0.5, 0.9))).toFixed(3);

  /* the landing: for a few frames the picture splits into red and cyan and snaps back */
  const g = seg(t, 0.62, 0.22);
  // a smooth style keeps the settle but not the split: the RGB snap is a film artefact
  const glitch = (SCENE.smooth || PAL.ghost === false || !(g > 0 && g < 1)) ? 0 : Math.sin(Math.PI * g);
  for (const [el, dir] of [[ghostR, 1], [ghostC, -1]]) {
    el.style.display = glitch ? "block" : "none";
    if (glitch) {
      el.style.transformOrigin = win.style.transformOrigin;
      el.style.width = win.style.width; el.style.height = win.style.height;
      el.style.transform = `translate(${dir * 14 * glitch}px, ${-dir * 3 * glitch}px) ` + tf;
      el.style.opacity = (0.55 * glitch).toFixed(3);
    }
  }

  markers(t, HIT, SWEEP);
  const dA = DIM_A != null ? DIM_A : 0.42;
  dim.style.boxShadow = `0 0 0 6000px rgba(${PAL.dim}, ${(dA * eOut(seg(t, MARK_END + 0.1, 0.7))).toFixed(3)})`;
  const sw = seg(t, 0.45, 1.15);
  sheen.style.opacity = PAL.sheen !== false && sw > 0 && sw < 1 ? "1" : "0";
  sheen.style.transform = `translateX(${lerp(-60, 160, eInOut(sw)).toFixed(2)}%)`;

  bg.style.transform = `scale(${(1.18 + 0.06 * t / D).toFixed(4)})`;
  const f = Math.floor(t * 30);
  $("grain").style.transform = `translate(${-((f * 173) % 256)}px, ${-((f * 97) % 256)}px)`;
  $("credit").style.opacity = eOut(seg(t, MARK_END + 0.2, 0.6)).toFixed(3);
};

async function boot() {
  try { await document.fonts.ready; } catch (e) { /* fallback face */ }
  await Promise.all([shot, bg].map(im => im.decode ? im.decode().catch(() => null) : null));
  if (SCENE.credit) $("credit").textContent = SCENE.credit;
  window.renderFrame(0);
  window.__ready = true;
}
boot();
